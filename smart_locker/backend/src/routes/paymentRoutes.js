const express = require('express');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');
const {
  createCheckoutSessionHandler,
  createOverdueCheckoutSessionHandler,
  stripeWebhookHandler,
  getMobileSuccessPage,
  getMobileCancelPage,
  getWebSuccessPage
} = require('../controllers/paymentController');

const router = express.Router();

router.get('/mobile/success', getMobileSuccessPage);
router.get('/mobile/cancel', getMobileCancelPage);
router.get('/web/success', getWebSuccessPage);
router.post('/webhook', stripeWebhookHandler);
router.use(requireAuth);
router.post('/checkout-session', allowRoles([Roles.USER, Roles.SUB_ADMIN, Roles.SUPER_ADMIN]), createCheckoutSessionHandler);
router.post('/overdue-checkout', allowRoles([Roles.USER]), createOverdueCheckoutSessionHandler);

module.exports = router;