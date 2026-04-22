const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const {
  listRequests,
  createRequest,
  cancelRequest,
  approveRequest,
  rejectRequest,
  listQueue
} = require('../services/requestService');

const listRequestsHandler = asyncHandler(async (req, res) => {
  const requests = await listRequests(req.user, req.query.status);
  return success(res, { requests });
});

const createRequestHandler = asyncHandler(async (req, res) => {
  const { stationId, note } = req.body;
  if (!stationId) {
    return res.status(400).json({ message: 'stationId is required' });
  }

  const request = await createRequest(req.user, { stationId, note });
  return success(res, { request }, 201);
});

const cancelRequestHandler = asyncHandler(async (req, res) => {
  const request = await cancelRequest(req.user, req.params.requestId);
  return success(res, { message: 'Request cancelled', request });
});

const approveRequestHandler = asyncHandler(async (req, res) => {
  const data = await approveRequest(req.user, req.params.requestId);
  if (data.queued) {
    return success(res, { message: 'No free locker. User queued.', request: data.request });
  }

  return success(res, { message: 'Request approved', request: data.request, locker: data.locker });
});

const rejectRequestHandler = asyncHandler(async (req, res) => {
  const request = await rejectRequest(req.user, req.params.requestId);
  return success(res, { message: 'Request rejected', request });
});

const listQueueHandler = asyncHandler(async (req, res) => {
  const { stationId } = req.query;
  if (!stationId) {
    return res.status(400).json({ message: 'stationId is required' });
  }

  const queueEntries = await listQueue(req.user, stationId);
  return success(res, { queueEntries });
});

module.exports = {
  listRequestsHandler,
  createRequestHandler,
  cancelRequestHandler,
  approveRequestHandler,
  rejectRequestHandler,
  listQueueHandler
};
