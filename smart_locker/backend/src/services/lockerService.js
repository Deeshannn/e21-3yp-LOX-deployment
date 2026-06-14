const Locker = require('../models/Locker');
const Station = require('../models/Station');
const { subscribeLockerState, publishLockerCommand, logEvent, mqttClient } = require('./mqttService');
const { LockerStates } = require('../constants/enums');

function canAccessStation(user, stationId) {
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }
  return (user.stationIds || []).map((id) => String(id)).includes(String(stationId));
}

async function listLockers(user, stationId) {
  const filter = {};

  if (stationId) {
    if (user.role !== 'USER' && !canAccessStation(user, stationId)) {
      const error = new Error('Station access denied');
      error.statusCode = 403;
      throw error;
    }
    filter.stationId = stationId;
  }

  if (user.role === 'USER' && !stationId) {
    filter.currentUserId = user._id;
  } else if (user.role !== 'SUPER_ADMIN' && !stationId) {
    filter.stationId = { $in: user.stationIds || [] };
  }

  const lockers = await Locker.find(filter).sort({ createdAt: 1 });
  return { lockers, mqttConnected: mqttClient.connected };
}

async function createLocker(user, payload) {
  if (!canAccessStation(user, payload.stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  const station = await Station.findById(payload.stationId);
  if (!station) {
    const error = new Error('Station not found');
    error.statusCode = 404;
    throw error;
  }

  const code = payload.code.toUpperCase();

  const locker = await Locker.create({
    stationId: payload.stationId,
    code,
    controlTopic: payload.controlTopic || `locker/${code}/control`,
    stateTopic: payload.stateTopic || `locker/${code}/state`,
    doorTopic: payload.doorTopic || `locker/${code}/door`,
    securityTopic: payload.securityTopic || `locker/${code}/security`
  });

  const { assignWaitingQueue } = require('./requestService');
  await subscribeLockerState(locker);
  await assignWaitingQueue(locker.stationId);
  return locker;
}

async function commandLocker(user, lockerId, command) {
  const locker = await Locker.findById(lockerId);
  if (!locker) {
    const error = new Error('Locker not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'USER' && String(locker.currentUserId || '') !== String(user._id)) {
    const error = new Error('Locker access denied');
    error.statusCode = 403;
    throw error;
  }

  if (user.role !== 'USER' && !canAccessStation(user, locker.stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  await publishLockerCommand(locker, command);
  locker.lockState = command === 'LOCK' ? LockerStates.LOCKED : LockerStates.UNLOCKED;
  await locker.save();
  await logEvent(locker, command, `${command} command sent`, { byUserId: user._id });

  return locker;
}

module.exports = {
  listLockers,
  createLocker,
  commandLocker
};
