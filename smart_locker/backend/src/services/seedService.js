const bcrypt = require('bcryptjs');
const Station = require('../models/Station');
const Locker = require('../models/Locker');
const User = require('../models/User');
const { Roles } = require('../constants/enums');
const { env } = require('../config/env');
const { subscribeLockerState } = require('./mqttService');

async function upsertUser({ name, email, password, role, stationIds }) {
  if (!name || !email || !password) {
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    stationIds
  });
}

 async function seedSampleData() {
  let station = await Station.findOne({ code: 'ST001' });
  if (!station) {
    station = await Station.create({
      name: 'Default Station',
      code: 'ST001',
      timezone: 'Asia/Colombo',
      schedule: { enabled: true, openTime: '08:00', closeTime: '20:00' }
    });
  }

  let locker = await Locker.findOne({ code: 'L1' });
  if (!locker) {
    locker = await Locker.create({
      stationId: station._id,
      code: 'L1',
      controlTopic: env.defaultControlTopic,
      stateTopic: env.defaultStateTopic,
      doorTopic: env.defaultDoorTopic
    });
  } else if (!locker.doorTopic) {
    locker.doorTopic = env.defaultDoorTopic;
    await locker.save();
  }

  await subscribeLockerState(locker);

  if (!env.seedSampleData) {
    return;
  }

  await upsertUser({
    name: env.sampleUsers.superAdmin.name,
    email: env.sampleUsers.superAdmin.email,
    password: env.sampleUsers.superAdmin.password,
    role: Roles.SUPER_ADMIN,
    stationIds: []
  });

  await upsertUser({
    name: env.sampleUsers.subAdmin.name,
    email: env.sampleUsers.subAdmin.email,
    password: env.sampleUsers.subAdmin.password,
    role: Roles.SUB_ADMIN,
    stationIds: [station._id]
  });

  await upsertUser({
    name: env.sampleUsers.user.name,
    email: env.sampleUsers.user.email,
    password: env.sampleUsers.user.password,
    role: Roles.USER,
    stationIds: [station._id]
  });

  console.log('Sample data seeded into database');
}

module.exports = {
  seedSampleData
};
