const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { getStationsForUser, getAllStations, createStation } = require('../services/stationService');
const { updateSchedule, commandAll, updateFreeDuration, getOverdueLockers } = require('../services/stationActionService');
const { validateCreateStationPayload } = require('../validations/stationValidate');

const listStations = asyncHandler(async (req, res) => {
  const stations = await getStationsForUser(req.user);
  return success(res, { stations });
});

// New endpoint to list all stations, regardless of user association
const listAllStations = asyncHandler(async (_req, res) => {
  const stations = await getAllStations();
  return success(res, { stations });
});

// Updated to add location data in the payload
const createStationHandler = asyncHandler(async (req, res) => {
  const { error, data } = validateCreateStationPayload(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const station = await createStation(data);
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

/**
 * PATCH /stations/:stationId/free-duration
 * Update free duration, overdue rate, and grace period settings for a station.
 * Accessible by SUB_ADMIN (own station) and SUPER_ADMIN.
 */
const updateFreeDurationHandler = asyncHandler(async (req, res) => {
  const station = await updateFreeDuration(req.user, req.params.stationId, req.body);
  return success(res, { station });
});

/**
 * GET /stations/:stationId/overdue-lockers
 * Returns all currently overdue lockers for the station with computed charge amounts.
 * Accessible by SUB_ADMIN (own station) and SUPER_ADMIN.
 */
const getOverdueLockersHandler = asyncHandler(async (req, res) => {
  const overdueLockers = await getOverdueLockers(req.user, req.params.stationId);
  return success(res, { overdueLockers });
});

module.exports = {
  listStations,
  listAllStations,
  createStationHandler,
  updateScheduleHandler,
  emergencyUnlockHandler,
  lockAllHandler,
  updateFreeDurationHandler,
  getOverdueLockersHandler
};
