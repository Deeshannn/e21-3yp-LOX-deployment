const express = require('express');
const { registerHandler, loginHandler, meHandler, updateMeHandler, bootstrapHandler } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/bootstrap-super-admin', bootstrapHandler);
router.get('/me', requireAuth, meHandler);
router.patch('/me', requireAuth, updateMeHandler);

module.exports = router;
