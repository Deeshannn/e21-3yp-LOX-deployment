const Locker = require('../models/Locker');
const LockerEvent = require('../models/LockerEvent');

async function listEvents(user, { stationId, lockerId, limit }) {
  const filter = {};

  if (stationId) {
    filter.stationId = stationId;
  } else if (user.role !== 'SUPER_ADMIN' && user.role !== 'USER') {
    filter.stationId = { $in: user.stationIds || [] };
  }

  if (lockerId) {
    filter.lockerId = lockerId;
  }

  if (user.role === 'USER') {
    const userLockers = await Locker.find({ currentUserId: user._id }).select('_id');
    filter.lockerId = { $in: userLockers.map((l) => l._id) };
  }

  const max = Math.min(Number(limit || 100), 300);
  return LockerEvent.find(filter).sort({ createdAt: -1 }).limit(max);
}

module.exports = {
  listEvents
};
