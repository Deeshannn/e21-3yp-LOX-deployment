const Station = require('../models/Station');
const Locker = require('../models/Locker');
const { publishLockerCommand, logEvent } = require('./mqttService');
const { LockerStates } = require('../constants/enums');
const { getOverdueLockersForStation } = require('./overdueService');

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

/**
 * Update the free duration settings for a station.
 * Only the sub-admin assigned to that station (or a super-admin) can do this.
 */
async function updateFreeDuration(user, stationId, payload) {
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

  // Build only the fields that were supplied in the payload
  const updates = {};
  if (typeof payload.freeDurationMinutes === 'number' && payload.freeDurationMinutes >= 0) {
    updates.freeDurationMinutes = payload.freeDurationMinutes;
  }
  if (typeof payload.overdueRatePerHour === 'number' && payload.overdueRatePerHour >= 0) {
    updates.overdueRatePerHour = payload.overdueRatePerHour;
  }
  if (typeof payload.gracePeriodMinutes === 'number' && payload.gracePeriodMinutes >= 1) {
    updates.gracePeriodMinutes = payload.gracePeriodMinutes;
  }

  // Use $set so only the changed fields touch MongoDB — avoids triggering
  // the 2dsphere geo index on docs that have an incomplete location field.
  const updated = await Station.findByIdAndUpdate(
    stationId,
    { $set: updates },
    { new: true, runValidators: false }
  );

  return updated;
}

/**
 * Return all overdue lockers for a station (for sub-admin monitoring view).
 */
async function getOverdueLockers(user, stationId) {
  if (!canAccessStation(user, stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }
  return getOverdueLockersForStation(stationId);
}

module.exports = {
  updateSchedule,
  commandAll,
  canAccessStation,
  updateFreeDuration,
  getOverdueLockers
};
