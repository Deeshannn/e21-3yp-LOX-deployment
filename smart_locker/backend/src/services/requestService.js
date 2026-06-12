const AccessRequest = require('../models/AccessRequest');
const QueueEntry = require('../models/QueueEntry');
const Locker = require('../models/Locker');
const Station = require('../models/Station');
const { RequestStatuses } = require('../constants/enums');
const { logEvent, publishLockerBookingStatus } = require('./mqttService');
const { sendPushNotification } = require('./notificationService');

function canAccessStation(user, stationId) {
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }
  return (user.stationIds || []).map((id) => String(id)).includes(String(stationId));
}

async function listRequests(user, status) {
  const filter = {};
  if (user.role === 'USER') {
    filter.userId = user._id;
  } else if (user.role !== 'SUPER_ADMIN') {
    filter.stationId = { $in: user.stationIds || [] };
  }

  if (status) {
    filter.status = status;
  }

  return AccessRequest.find(filter)
    .populate('userId', 'name email')
    .populate('stationId', 'name code')
    .populate('lockerId', 'code lockState doorState')
    .sort({ createdAt: -1 });
}

async function createRequest(user, payload) {
  // Guard 1: block if there's already a PENDING or QUEUED request at this station
  const activePendingOrQueued = await AccessRequest.findOne({
    userId: user._id,
    stationId: payload.stationId,
    status: { $in: [RequestStatuses.PENDING, RequestStatuses.QUEUED] }
  });
  if (activePendingOrQueued) {
    const error = new Error('You already have an active request for this station.');
    error.statusCode = 409;
    throw error;
  }

  // Guard 2: block if there's an APPROVED request where the locker is STILL booked to this user.
  // NOTE: AccessRequest status is never changed back from APPROVED when a locker is released,
  // so we must cross-check the actual Locker document to avoid blocking users with old sessions.
  const approvedRequest = await AccessRequest.findOne({
    userId: user._id,
    stationId: payload.stationId,
    status: RequestStatuses.APPROVED,
    lockerId: { $ne: null }
  });
  if (approvedRequest) {
    const locker = await Locker.findById(approvedRequest.lockerId);
    if (locker && locker.isBooked && String(locker.currentUserId) === String(user._id)) {
      const error = new Error('You already have an active locker at this station.');
      error.statusCode = 409;
      throw error;
    }
  }

  return AccessRequest.create({
    userId: user._id,
    stationId: payload.stationId,
    note: payload.note || '',
    status: RequestStatuses.PENDING
  });
}


async function cancelRequest(user, requestId) {
  const request = await AccessRequest.findById(requestId);
  if (!request) {
    const error = new Error('Request not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(request.userId) !== String(user._id)) {
    const error = new Error('Request access denied');
    error.statusCode = 403;
    throw error;
  }

  if (![RequestStatuses.PENDING, RequestStatuses.QUEUED].includes(request.status)) {
    const error = new Error('Only pending or queued requests can be cancelled');
    error.statusCode = 400;
    throw error;
  }

  request.status = RequestStatuses.CANCELLED;
  await request.save();

  await QueueEntry.updateMany({ requestId: request._id, status: 'WAITING' }, { $set: { status: 'CANCELLED' } });

  return request;
}

async function assignWaitingQueue(stationId) {
  // Sort by code ascending so the lowest-numbered locker (e.g. L1 before L2) is always picked first
  const freeLocker = await Locker.findOne({ stationId, isBooked: false }).sort({ code: 1 });
  if (!freeLocker) {
    return;
  }

  const queueEntry = await QueueEntry.findOne({ stationId, status: 'WAITING' }).sort({ createdAt: 1 });
  if (!queueEntry) {
    return;
  }

  const request = await AccessRequest.findById(queueEntry.requestId);
  if (!request || request.status !== RequestStatuses.QUEUED) {
    return;
  }

  request.status = RequestStatuses.APPROVED;
  request.lockerId = freeLocker._id;
  request.approvedAt = new Date();
  await request.save();

  queueEntry.status = 'ASSIGNED';
  await queueEntry.save();

  freeLocker.isBooked = true;
  freeLocker.currentUserId = request.userId;
  freeLocker.activeRequestId = request._id;
  freeLocker.reservedAt = new Date();
  freeLocker.overdueReleasedAt = null;
  freeLocker.overduePaymentId = null;
  await freeLocker.save();
  await publishLockerBookingStatus(freeLocker);

  await logEvent(freeLocker, 'QUEUE_ASSIGNED', 'Queue front user assigned to locker', { requestId: request._id });

  // Send push notification for queue assignment
  const station = await Station.findById(stationId);
  const stationName = station ? station.name : 'Station';
  await sendPushNotification(
    request.userId,
    'Locker Assigned',
    `Your queuing time is over. You have assigned a locker ${freeLocker.code} at ${stationName}.`,
    {
      type: 'LOCKER_ASSIGNED',
      lockerId: String(freeLocker._id),
      lockerCode: freeLocker.code,
      requestId: String(request._id)
    }
  );
}

async function approveRequest(user, requestId) {
  const request = await AccessRequest.findById(requestId);
  if (!request) {
    const error = new Error('Request not found');
    error.statusCode = 404;
    throw error;
  }

  if (!canAccessStation(user, request.stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  // Idempotency guard: if already approved, return the existing state without touching lockers
  if (request.status === RequestStatuses.APPROVED) {
    const locker = request.lockerId ? await Locker.findById(request.lockerId) : null;
    return { queued: false, request, locker };
  }

  // Status guard: only PENDING requests can be approved
  if (request.status !== RequestStatuses.PENDING) {
    const error = new Error(`Cannot approve a request with status: ${request.status}`);
    error.statusCode = 400;
    throw error;
  }

  // Sort by code ascending so the lowest-numbered locker (e.g. L1 before L2) is always picked first
  const freeLocker = await Locker.findOne({ stationId: request.stationId, isBooked: false }).sort({ code: 1 });
  const station = await Station.findById(request.stationId);
  const stationName = station ? station.name : 'Station';

  request.approvedBy = user._id;
  request.approvedAt = new Date();

  if (!freeLocker) {
    request.status = RequestStatuses.QUEUED;
    await request.save();

    const existing = await QueueEntry.findOne({ requestId: request._id, status: 'WAITING' });
    if (!existing) {
      await QueueEntry.create({
        stationId: request.stationId,
        requestId: request._id,
        userId: request.userId,
        status: 'WAITING'
      });
    }

    // Send push notification for queued request
    await sendPushNotification(
      request.userId,
      'Locker Request Queued',
      `Your request for a locker at ${stationName} has been approved and placed in the queue. You will be notified when a locker becomes available.`,
      { type: 'LOCKER_QUEUED', requestId: String(request._id) }
    );

    return { queued: true, request };
  }

  request.status = RequestStatuses.APPROVED;
  request.lockerId = freeLocker._id;
  await request.save();

  freeLocker.isBooked = true;
  freeLocker.currentUserId = request.userId;
  freeLocker.activeRequestId = request._id;
  freeLocker.reservedAt = new Date();
  freeLocker.overdueReleasedAt = null;
  freeLocker.overduePaymentId = null;
  await freeLocker.save();
  await publishLockerBookingStatus(freeLocker);

  await logEvent(freeLocker, 'REQUEST_APPROVED', 'User request approved and assigned', { requestId: request._id });

  // Send push notification for approved & assigned request
  await sendPushNotification(
    request.userId,
    'Locker Request Approved',
    `Your request for a locker at ${stationName} has been approved. Locker ${freeLocker.code} is assigned to you.`,
    {
      type: 'LOCKER_ASSIGNED',
      lockerId: String(freeLocker._id),
      lockerCode: freeLocker.code,
      requestId: String(request._id)
    }
  );

  return { queued: false, request, locker: freeLocker };
}

async function rejectRequest(user, requestId) {
  const request = await AccessRequest.findById(requestId);
  if (!request) {
    const error = new Error('Request not found');
    error.statusCode = 404;
    throw error;
  }

  if (!canAccessStation(user, request.stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  request.status = RequestStatuses.REJECTED;
  request.rejectedBy = user._id;
  request.rejectedAt = new Date();
  await request.save();

  await QueueEntry.updateMany({ requestId: request._id, status: 'WAITING' }, { $set: { status: 'CANCELLED' } });

  return request;
}

async function listQueue(user, stationId) {
  if (user.role !== 'USER' && !canAccessStation(user, stationId)) {
    const error = new Error('Station access denied');
    error.statusCode = 403;
    throw error;
  }

  const filter = { stationId, status: 'WAITING' };
  if (user.role === 'USER') {
    filter.userId = user._id;
  }

  return QueueEntry.find(filter)
    .populate('userId', 'name email')
    .populate('requestId', 'status createdAt')
    .sort({ createdAt: 1 });
}

module.exports = {
  listRequests,
  createRequest,
  cancelRequest,
  approveRequest,
  rejectRequest,
  listQueue,
  assignWaitingQueue
};
