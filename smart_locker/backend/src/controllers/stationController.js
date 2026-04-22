const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { getStationsForUser, createStation } = require('../services/stationService');
const { updateSchedule, commandAll } = require('../services/stationActionService');

const listStations = asyncHandler(async (req, res) => {
  const stations = await getStationsForUser(req.user);
  return success(res, { stations });
});

const createStationHandler = asyncHandler(async (req, res) => {
  const { name, code, timezone, openTime, closeTime } = req.body;
  if (!name || !code) {
    return res.status(400).json({ message: 'name and code are required' });
  }

  const station = await createStation({ name, code, timezone, openTime, closeTime });
  return success(res, { station }, 201);
});

const updateScheduleHandler = asyncHandler(async (req, res) => {
  const station = await updateSchedule(req.user, req.params.stationId, req.body);
  return success(res, { station });
});

const emergencyUnlockHandler = asyncHandler(async (req, res) => {
  const count = await commandAll(req.user, req.params.stationId, 'UNLOCK');
  return success(res, { message: 'Emergency unlock executed', affectedLockers: count });
});

const lockAllHandler = asyncHandler(async (req, res) => {
  const count = await commandAll(req.user, req.params.stationId, 'LOCK');
  return success(res, { message: 'All lockers locked', affectedLockers: count });
});

module.exports = {
  listStations,
  createStationHandler,
  updateScheduleHandler,
  emergencyUnlockHandler,
  lockAllHandler
};
