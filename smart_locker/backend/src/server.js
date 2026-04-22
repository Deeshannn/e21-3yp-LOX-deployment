const { createApp } = require('./app');
const { env } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { seedSampleData } = require('./services/seedService');
const { startScheduler } = require('./services/scheduleService');

async function startServer() {
  await connectDatabase();
  await seedSampleData();
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
