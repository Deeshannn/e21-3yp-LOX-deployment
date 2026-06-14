const express = require('express');
const { registerHandler, loginHandler, meHandler, updateMeHandler, bootstrapHandler, mobileLoginHandler, verifyMobileOtpHandler, mobileRegisterHandler } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/bootstrap-super-admin', bootstrapHandler);
router.get('/me', requireAuth, meHandler);
router.patch('/me', requireAuth, updateMeHandler);

// Mobile device-wise authentication routes
router.post('/mobile/login', mobileLoginHandler);
router.post('/mobile/verify-otp', verifyMobileOtpHandler);
router.post('/mobile/register', mobileRegisterHandler);

module.exports = router;
