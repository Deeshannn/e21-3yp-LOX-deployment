const mqtt = require('mqtt');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const Locker = require('../models/Locker');
const LockerEvent = require('../models/LockerEvent');
const { LockerStates, DoorStates } = require('../constants/enums');

const mqttEnabled = Boolean(env.mqttServer && env.mqttUsername && env.mqttPassword);

const client = mqttEnabled
  ? mqtt.connect(env.mqttServer, {
      username: env.mqttUsername,
      password: env.mqttPassword,
      reconnectPeriod: 5000
    })
  : null;

let lastMqttError = '';

if (!mqttEnabled) {
  console.warn('MQTT disabled: provide MQTT_USERNAME and MQTT_PASSWORD to enable broker connection');
}

function logEvent(locker, eventType, message, metadata = {}) {
  return LockerEvent.create({
    lockerId: locker._id,
    stationId: locker.stationId,
    eventType,
    message,
    metadata
  });
}

async function subscribeLockerState(locker) {
  if (!client || !client.connected) {
    return;
  }
  client.subscribe(locker.stateTopic, (err) => {
    if (err) {
      console.error('MQTT subscribe failed:', err.message);
    }
  });
}

function publishLockerCommand(locker, command) {
  return new Promise((resolve, reject) => {
    if (!client || !client.connected) {
      reject(new Error('MQTT broker not connected'));
      return;
    }

    client.publish(locker.controlTopic, command, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

if (client) {
  client.on('connect', async () => {
    console.log('MQTT connected');

    // MongoDB may not be ready yet during process startup.
    if (mongoose.connection.readyState !== 1) {
      console.log('MQTT connected before MongoDB; locker subscriptions will start after DB is ready');
      return;
    }

    try {
      const lockers = await Locker.find({});
      for (const locker of lockers) {
        subscribeLockerState(locker);
      }
    } catch (error) {
      console.error('Failed to load lockers for MQTT subscriptions:', error.message);
    }
  });

  client.on('message', async (topic, payload) => {
    if (mongoose.connection.readyState !== 1) {
      return;
    }

    try {
      const value = payload.toString().trim().toUpperCase();
      const locker = await Locker.findOne({ stateTopic: topic });
      if (!locker) {
        return;
      }

      if ([LockerStates.LOCKED, LockerStates.UNLOCKED].includes(value)) {
        locker.lockState = value;
        locker.lastSeenAt = new Date();
        await locker.save();
        await logEvent(locker, 'LOCK_STATE', `Lock state updated to ${value}`);
        return;
      }

      if ([DoorStates.OPEN, DoorStates.CLOSED].includes(value)) {
        locker.doorState = value;
        locker.lastSeenAt = new Date();
        await locker.save();
        await logEvent(locker, 'DOOR_STATE', `Door state updated to ${value}`);
      }
    } catch (error) {
      console.error('Failed to process MQTT message:', error.message);
    }
  });

  client.on('error', (err) => {
    if (err.message !== lastMqttError) {
      console.error('MQTT error:', err.message);
      lastMqttError = err.message;
    }
  });
}

module.exports = {
  mqttClient: client,
  publishLockerCommand,
  subscribeLockerState,
  logEvent
};
