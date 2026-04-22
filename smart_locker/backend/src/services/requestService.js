const AccessRequest = require('../models/AccessRequest');
const QueueEntry = require('../models/QueueEntry');
const Locker = require('../models/Locker');
const { RequestStatuses } = require('../constants/enums');
const { logEvent } = require('./mqttService');

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
  const freeLocker = await Locker.findOne({ stationId, isBooked: false }).sort({ createdAt: 1 });
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
  await freeLocker.save();

  await logEvent(freeLocker, 'QUEUE_ASSIGNED', 'Queue front user assigned to locker', { requestId: request._id });
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

  const freeLocker = await Locker.findOne({ stationId: request.stationId, isBooked: false }).sort({ createdAt: 1 });

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

    return { queued: true, request };
  }

  request.status = RequestStatuses.APPROVED;
  request.lockerId = freeLocker._id;
  await request.save();

  freeLocker.isBooked = true;
  freeLocker.currentUserId = request.userId;
  freeLocker.activeRequestId = request._id;
  await freeLocker.save();

  await logEvent(freeLocker, 'REQUEST_APPROVED', 'User request approved and assigned', { requestId: request._id });

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
