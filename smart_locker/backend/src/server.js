const { createApp } = require('./app');
const { env } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { seedSampleData } = require('./services/seedService');
const { subscribeAllLockers } = require('./services/mqttService');
const { startScheduler } = require('./services/scheduleService');
const { initializeFirebase } = require('./config/firebase');

async function startServer() {
  initializeFirebase();
  await connectDatabase();
  await seedSampleData();
  await subscribeAllLockers();
  startScheduler();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server running on ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Startup error:', error.message);
  process.exit(1);
});
