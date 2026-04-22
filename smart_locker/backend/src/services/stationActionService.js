const Station = require('../models/Station');
const Locker = require('../models/Locker');
const { publishLockerCommand, logEvent } = require('./mqttService');
const { LockerStates } = require('../constants/enums');

function canAccessStation(user, stationId) {
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }
  return (user.stationIds || []).map((id) => String(id)).includes(String(stationId));
}

async function updateSchedule(user, stationId, payload) {
  if (!canAccessStation(user, stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  const station = await Station.findById(stationId);
  if (!station) {
    const error = new Error('Station not found');
    error.statusCode = 404;
    throw error;
  }

  if (typeof payload.enabled === 'boolean') {
    station.schedule.enabled = payload.enabled;
  }
  if (payload.openTime) {
    station.schedule.openTime = payload.openTime;
  }
  if (payload.closeTime) {
    station.schedule.closeTime = payload.closeTime;
  }

  await station.save();
  return station;
}

async function commandAll(user, stationId, command) {
  if (!canAccessStation(user, stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  const station = await Station.findById(stationId);
  if (!station) {
    const error = new Error('Station not found');
    error.statusCode = 404;
    throw error;
  }

  const lockers = await Locker.find({ stationId });
  for (const locker of lockers) {
    await publishLockerCommand(locker, command);
    locker.lockState = command === 'LOCK' ? LockerStates.LOCKED : LockerStates.UNLOCKED;
    await locker.save();
    await logEvent(locker, command === 'LOCK' ? 'LOCK_ALL' : 'EMERGENCY_UNLOCK', `Station ${command} all`, {
      byUserId: user._id
    });
  }

  station.emergencyMode = command !== 'LOCK';
  await station.save();

  return lockers.length;
}

module.exports = {
  updateSchedule,
  commandAll,
  canAccessStation
};
