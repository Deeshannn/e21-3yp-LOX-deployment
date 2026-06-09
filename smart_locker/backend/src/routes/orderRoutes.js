const express = require('express');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');
const { listOrdersHandler, updateOrderStatusHandler } = require('../controllers/orderController');

const router = express.Router();

router.use(requireAuth);
router.get('/', listOrdersHandler);
router.patch('/:orderId/status', allowRoles([Roles.SUPER_ADMIN]), updateOrderStatusHandler);

module.exports = router;