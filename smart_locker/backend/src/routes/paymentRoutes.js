const express = require('express');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');
const { createCheckoutSessionHandler, stripeWebhookHandler } = require('../controllers/paymentController');

const router = express.Router();

router.post('/webhook', stripeWebhookHandler);
router.use(requireAuth);
router.post('/checkout-session', allowRoles([Roles.USER, Roles.SUB_ADMIN, Roles.SUPER_ADMIN]), createCheckoutSessionHandler);

module.exports = router;