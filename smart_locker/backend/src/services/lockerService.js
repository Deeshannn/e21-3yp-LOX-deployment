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
    if (!canAccessStation(user, stationId)) {
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

  const locker = await Locker.create({
    stationId: payload.stationId,
    code: payload.code.toUpperCase(),
    controlTopic: payload.controlTopic || `locker/${payload.code}/control`,
    stateTopic: payload.stateTopic || `locker/${payload.code}/state`
  });

  await subscribeLockerState(locker);
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

async function claimLockerAndUnlock(user, lockerId) {
  const locker = await Locker.findById(lockerId);
  if (!locker) {
    const error = new Error('Locker not found');
    error.statusCode = 404;
    throw error;
  }

  if (!canAccessStation(user, locker.stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  const lockerUserId = String(locker.currentUserId || '');
  const isOwnedByUser = lockerUserId === String(user._id);

  if (locker.isBooked && !isOwnedByUser) {
    const error = new Error('Locker is already booked');
    error.statusCode = 400;
    throw error;
  }

  const userExistingLocker = await Locker.findOne({
    currentUserId: user._id,
    isBooked: true,
    _id: { $ne: locker._id }
  });

  if (userExistingLocker) {
    const error = new Error('Release your current locker before claiming another one');
    error.statusCode = 400;
    throw error;
  }

  let assignedLocker = locker;
  let claimedNow = false;
  if (!locker.isBooked) {
    assignedLocker = await Locker.findOneAndUpdate(
      { _id: locker._id, isBooked: false },
      {
        $set: {
          isBooked: true,
          currentUserId: user._id,
          activeRequestId: null
        }
      },
      { new: true }
    );

    if (!assignedLocker) {
      const error = new Error('Locker was just booked by another user. Please choose another locker.');
      error.statusCode = 409;
      throw error;
    }

    claimedNow = true;
  }

  try {
    await publishLockerCommand(assignedLocker, 'UNLOCK');
    assignedLocker.lockState = LockerStates.UNLOCKED;
    await assignedLocker.save();

    await logEvent(assignedLocker, 'DIRECT_CLAIM', 'Locker claimed and unlocked directly by user', {
      byUserId: user._id
    });
  } catch (error) {
    if (claimedNow) {
      await Locker.findByIdAndUpdate(assignedLocker._id, {
        $set: {
          isBooked: false,
          currentUserId: null,
          activeRequestId: null
        }
      });
    }
    throw error;
  }

  return assignedLocker;
}

module.exports = {
  listLockers,
  createLocker,
  commandLocker,
  claimLockerAndUnlock
};
