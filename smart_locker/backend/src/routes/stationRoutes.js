const express = require('express');
const {
  listStations,
  createStationHandler,
  updateScheduleHandler,
  emergencyUnlockHandler,
  lockAllHandler
} = require('../controllers/stationController');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');

const router = express.Router();

router.use(requireAuth);
router.get('/', listStations);
router.post('/', allowRoles([Roles.SUPER_ADMIN]), createStationHandler);
router.patch('/:stationId/schedule', allowRoles([Roles.SUPER_ADMIN, Roles.SUB_ADMIN]), updateScheduleHandler);
router.post('/:stationId/emergency-unlock', allowRoles([Roles.SUPER_ADMIN, Roles.SUB_ADMIN]), emergencyUnlockHandler);
router.post('/:stationId/lock-all', allowRoles([Roles.SUPER_ADMIN, Roles.SUB_ADMIN]), lockAllHandler);

module.exports = router;
