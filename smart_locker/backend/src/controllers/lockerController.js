const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { listLockers, createLocker, commandLocker } = require('../services/lockerService');
const Locker = require('../models/Locker');
const { assignWaitingQueue } = require('../services/requestService');

const listLockersHandler = asyncHandler(async (req, res) => {
  const data = await listLockers(req.user, req.query.stationId);
  return success(res, data);
});

const createLockerHandler = asyncHandler(async (req, res) => {
  const { stationId, code, controlTopic, stateTopic, doorTopic } = req.body;
  if (!stationId || !code) {
    return res.status(400).json({ message: 'stationId and code are required' });
  }

  const locker = await createLocker(req.user, { stationId, code, controlTopic, stateTopic, doorTopic });
  return success(res, { locker }, 201);
});

const unlockLockerHandler = asyncHandler(async (req, res) => {
  const locker = await commandLocker(req.user, req.params.lockerId, 'UNLOCK');
  return success(res, { message: 'Unlock command sent', locker });
});

const lockLockerHandler = asyncHandler(async (req, res) => {
  const locker = await commandLocker(req.user, req.params.lockerId, 'LOCK');
  return success(res, { message: 'Lock command sent', locker });
});

const releaseLockerHandler = asyncHandler(async (req, res) => {
  const locker = await Locker.findById(req.params.lockerId);
  if (!locker) {
    return res.status(404).json({ message: 'Locker not found' });
  }

  if (req.user.role === 'USER' && String(locker.currentUserId || '') !== String(req.user._id)) {
    return res.status(403).json({ message: 'Locker access denied' });
  }

  locker.isBooked = false;
  locker.currentUserId = null;
  locker.activeRequestId = null;
  await locker.save();

  await assignWaitingQueue(locker.stationId);
  return success(res, { message: 'Locker released' });
});

module.exports = {
  listLockersHandler,
  createLockerHandler,
  unlockLockerHandler,
  lockLockerHandler,
  releaseLockerHandler
};
