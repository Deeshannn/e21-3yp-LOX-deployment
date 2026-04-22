const express = require('express');
const { listEventsHandler } = require('../controllers/eventController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', listEventsHandler);

module.exports = router;
