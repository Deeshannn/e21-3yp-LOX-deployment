const express = require('express');
const {
  listRequestsHandler,
  createRequestHandler,
  cancelRequestHandler,
  approveRequestHandler,
  rejectRequestHandler,
  listQueueHandler
} = require('../controllers/requestController');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');

const router = express.Router();

router.use(requireAuth);
router.get('/', listRequestsHandler);
router.post('/access', allowRoles([Roles.USER]), createRequestHandler);
router.post('/:requestId/cancel', allowRoles([Roles.USER]), cancelRequestHandler);
router.post('/:requestId/approve', allowRoles([Roles.SUPER_ADMIN, Roles.SUB_ADMIN]), approveRequestHandler);
router.post('/:requestId/reject', allowRoles([Roles.SUPER_ADMIN, Roles.SUB_ADMIN]), rejectRequestHandler);
router.get('/queue/list', listQueueHandler);

module.exports = router;
