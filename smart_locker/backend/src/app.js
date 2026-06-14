const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

function createApp() {
  const app = express();
  app.use(requestLogger);
  app.use(cors());
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/payments/webhook') {
      return next();
    }

    return express.json({ limit: '10mb' })(req, res, next);
  });
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp
};
