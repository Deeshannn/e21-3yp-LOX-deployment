const express = require('express');
const {
  listLockersHandler,
  createLockerHandler,
  unlockLockerHandler,
  lockLockerHandler,
  claimLockerHandler,
  releaseLockerHandler
} = require('../controllers/lockerController');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');

const router = express.Router();

router.use(requireAuth);
router.get('/', listLockersHandler);
router.post('/', allowRoles([Roles.SUPER_ADMIN, Roles.SUB_ADMIN]), createLockerHandler);
router.post('/:lockerId/unlock', unlockLockerHandler);
router.post('/:lockerId/lock', lockLockerHandler);
router.post('/:lockerId/claim', allowRoles([Roles.USER]), claimLockerHandler);
router.post('/:lockerId/release', releaseLockerHandler);

module.exports = router;
