const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { listLockers, createLocker, commandLocker } = require('../services/lockerService');
const Locker = require('../models/Locker');
const Station = require('../models/Station');
const { assignWaitingQueue } = require('../services/requestService');
const { publishLockerBookingStatus, publishLockerSecurityIgnoreCommand, logEvent } = require('../services/mqttService');
const { Roles, ReservationPhase } = require('../constants/enums');
const { sendPushNotification } = require('../services/notificationService');
const { getReservationPhase } = require('../services/overdueService');

function canAccessStation(user, stationId) {
  if (user.role === Roles.SUPER_ADMIN) {
    return true;
  }

  return (user.stationIds || []).map((id) => String(id)).includes(String(stationId));
}

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

/**
 * GET /lockers/:lockerId/status
 * Returns the locker with computed reservation phase metadata.
 */
const getLockerStatusHandler = asyncHandler(async (req, res) => {
  const locker = await Locker.findById(req.params.lockerId);
  if (!locker) {
    return res.status(404).json({ message: 'Locker not found' });
  }

  // Users can only query their own locker status
  if (req.user.role === Roles.USER && String(locker.currentUserId || '') !== String(req.user._id)) {
    return res.status(403).json({ message: 'Locker access denied' });
  }

  const station = await Station.findById(locker.stationId);
  const phaseData = getReservationPhase(locker, station || {});

  return success(res, {
    locker,
    reservationPhase: phaseData.phase,
    timeRemainingMs: phaseData.timeRemainingMs,
    overdueMs: phaseData.overdueMs,
    chargeAmount: phaseData.chargeAmount,
    graceEndsAt: phaseData.graceEndsAt,
    freeEndsAt: phaseData.freeEndsAt,
    freeDurationMinutes: station?.freeDurationMinutes ?? 60,
    gracePeriodMinutes: station?.gracePeriodMinutes ?? 10
  });
});

const unlockLockerHandler = asyncHandler(async (req, res) => {
  const locker = await Locker.findById(req.params.lockerId);
  if (!locker) {
    return res.status(404).json({ message: 'Locker not found' });
  }

  // Regular users cannot unlock when overdue — they must pay first
  if (req.user.role === Roles.USER) {
    const station = await Station.findById(locker.stationId);
    const { phase } = getReservationPhase(locker, station || {});
    if (phase === ReservationPhase.OVERDUE) {
      return res.status(402).json({
        message: 'Your free duration has expired. Please complete the overdue payment before unlocking.',
        reservationPhase: phase
      });
    }
  }

  const updatedLocker = await commandLocker(req.user, req.params.lockerId, 'UNLOCK');
  return success(res, { message: 'Unlock command sent', locker: updatedLocker });
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

  if (req.user.role === Roles.USER && String(locker.currentUserId || '') !== String(req.user._id)) {
    return res.status(403).json({ message: 'Locker access denied' });
  }

  // Regular users cannot release when overdue — they must pay first
  if (req.user.role === Roles.USER) {
    const station = await Station.findById(locker.stationId);
    const { phase } = getReservationPhase(locker, station || {});
    if (phase === ReservationPhase.OVERDUE) {
      return res.status(402).json({
        message: 'Your free duration has expired. Please complete the overdue payment before releasing.',
        reservationPhase: phase
      });
    }
  }

  const userIdToNotify = locker.currentUserId;

  locker.isBooked = false;
  locker.currentUserId = null;
  locker.activeRequestId = null;
  locker.reservedAt = null;
  locker.overdueReleasedAt = null;
  locker.overduePaymentId = null;
  await locker.save();
  await publishLockerBookingStatus(locker);

  await assignWaitingQueue(locker.stationId);

  if (userIdToNotify) {
    sendPushNotification(
      userIdToNotify,
      'Locker Released',
      'You have successfully released a locker.',
      { type: 'LOCKER_RELEASED', lockerId: String(locker._id), lockerCode: locker.code }
    );
  }

  return success(res, { message: 'Locker released' });
});

const ignoreSecurityAlertHandler = asyncHandler(async (req, res) => {
  const locker = await Locker.findById(req.params.lockerId);
  if (!locker) {
    return res.status(404).json({ message: 'Locker not found' });
  }

  if (req.user.role !== Roles.SUB_ADMIN) {
    return res.status(403).json({ message: 'Only station sub-admin can ignore this warning' });
  }

  if (!canAccessStation(req.user, locker.stationId)) {
    return res.status(403).json({ message: 'Station access denied' });
  }

  if (locker.code !== 'L1') {
    return res.status(400).json({ message: 'Security ignore is available for Locker L1 only' });
  }

  await publishLockerSecurityIgnoreCommand(locker);
  await logEvent(locker, 'SECURITY_IGNORED', 'User ignored L1 door security warning', {
    byUserId: req.user._id
  });

  return success(res, { message: 'Security warning ignored for Locker L1' });
});

module.exports = {
  listLockersHandler,
  createLockerHandler,
  getLockerStatusHandler,
  unlockLockerHandler,
  lockLockerHandler,
  releaseLockerHandler,
  ignoreSecurityAlertHandler
};
