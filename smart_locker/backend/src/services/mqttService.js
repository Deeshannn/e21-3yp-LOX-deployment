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

  const canonicalStateTopic = buildDefaultTopic(locker, 'state');
  const canonicalDoorTopic = buildDefaultTopic(locker, 'door');

  const legacyCode = locker.code && locker.code[0].toUpperCase() === 'L' ? locker.code.slice(1) : locker.code;
  const legacyStateTopic = `locker/${legacyCode}/state`;
  const legacyDoorTopic = `locker/${legacyCode}/door`;

  const topicsToSubscribe = new Set([
    locker.stateTopic,
    locker.doorTopic,
    canonicalStateTopic,
    canonicalDoorTopic,
    legacyStateTopic,
    legacyDoorTopic
  ]);

  for (const topic of topicsToSubscribe) {
    if (!topic) {
      continue;
    }

    client.subscribe(topic, (err) => {
      if (err) {
        console.error('MQTT subscribe failed:', err.message);
      }
    });
  }
}

async function subscribeAllLockers() {
  if (!client || !client.connected || mongoose.connection.readyState !== 1) {
    return;
  }

  const lockers = await Locker.find({});
  for (const locker of lockers) {
    if (!locker.doorTopic) {
      locker.doorTopic = `locker/${locker.code}/door`;
      await locker.save();
    }
    await subscribeLockerState(locker);
    await publishLockerBookingStatus(locker);
  }
}

function buildDefaultTopic(locker, suffix) {
  return `locker/${locker.code}/${suffix}`;
}

function getLegacyCode(code = '') {
  return code && code[0].toUpperCase() === 'L' ? code.slice(1) : code;
}

function publishRetained(topic, value) {
  return new Promise((resolve, reject) => {
    if (!client || !client.connected) {
      reject(new Error('MQTT broker not connected'));
      return;
    }

    client.publish(topic, value, { retain: true }, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function publishLockerBookingStatus(locker) {
  if (!locker || !locker.code) {
    return;
  }

  const value = locker.isBooked ? 'BOOKED' : 'FREE';
  const canonicalTopic = buildDefaultTopic(locker, 'booking');
  const legacyTopic = `locker/${getLegacyCode(locker.code)}/booking`;

  const topics = new Set([canonicalTopic, legacyTopic]);
  for (const topic of topics) {
    try {
      await publishRetained(topic, value);
    } catch (error) {
      console.error(`Failed to publish booking status to ${topic}:`, error.message);
    }
  }
}

async function publishLockerSecurityIgnoreCommand(locker) {
  if (!locker || !locker.code) {
    return;
  }

  const canonicalTopic = buildDefaultTopic(locker, 'security');
  const legacyTopic = `locker/${getLegacyCode(locker.code)}/security`;
  const topics = new Set([canonicalTopic, legacyTopic]);

  for (const topic of topics) {
    await new Promise((resolve, reject) => {
      if (!client || !client.connected) {
        reject(new Error('MQTT broker not connected'));
        return;
      }

      client.publish(topic, 'IGNORE', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
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

    try {
      await subscribeAllLockers();
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
      let locker = await Locker.findOne({
        $or: [{ stateTopic: topic }, { doorTopic: topic }]
      });

      if (!locker && topic.endsWith('/door')) {
        locker = await Locker.findOne({
          doorTopic: topic
        });
      }

      if (!locker) {
        const topicParts = String(topic).split('/');
        const topicCode = topicParts[1];
        if (topicParts.length >= 3 && topicParts[0] === 'locker' && topicCode) {
          locker = await Locker.findOne({ code: topicCode.toUpperCase() });
          if (locker && !locker.doorTopic && topicParts[2] === 'door') {
            locker.doorTopic = buildDefaultTopic(locker, 'door');
            await locker.save();
          }
        }
      }
      if (!locker) {
        return;
      }

      const isDoorTopic = locker.doorTopic === topic || topic.endsWith('/door');

      if (!isDoorTopic && [LockerStates.LOCKED, LockerStates.UNLOCKED].includes(value)) {
        locker.lockState = value;
        locker.lastSeenAt = new Date();
        await locker.save();
        await logEvent(locker, 'LOCK_STATE', `Lock state updated to ${value}`);
        return;
      }

      if (isDoorTopic && [DoorStates.OPEN, DoorStates.CLOSED].includes(value)) {
        locker.doorState = value;
        if (locker.doorTopic !== topic) {
          locker.doorTopic = topic;
        }
        locker.lastSeenAt = new Date();
        await locker.save();
        console.log(`Door state updated: ${locker.code} -> ${value}`);
        await logEvent(locker, 'DOOR_STATE', value === DoorStates.OPEN ? 'Door opened' : 'Door closed');
        return;
      }

      if (!locker.doorTopic && [DoorStates.OPEN, DoorStates.CLOSED].includes(value)) {
        locker.doorState = value;
        locker.lastSeenAt = new Date();
        await locker.save();
        await logEvent(locker, 'DOOR_STATE', value === DoorStates.OPEN ? 'Door opened' : 'Door closed');
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
  publishLockerBookingStatus,
  publishLockerSecurityIgnoreCommand,
  subscribeLockerState,
  subscribeAllLockers,
  logEvent
};
