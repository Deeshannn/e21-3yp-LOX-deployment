const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const stationRoutes = require('./stationRoutes');
const lockerRoutes = require('./lockerRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const requestRoutes = require('./requestRoutes');
const eventRoutes = require('./eventRoutes');
const { healthHandler } = require('../controllers/healthController');
const { requireAuth } = require('../middleware/authMiddleware');
const { listQueueHandler } = require('../controllers/requestController');

const router = express.Router();

router.get('/health', healthHandler);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stations', stationRoutes);
router.use('/lockers', lockerRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/requests', requestRoutes);
router.use('/events', eventRoutes);
router.get('/queue', requireAuth, listQueueHandler);

module.exports = router;
