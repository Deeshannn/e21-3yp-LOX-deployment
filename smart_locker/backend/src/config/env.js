const dotenv = require('dotenv');

dotenv.config();

function isPlaceholder(value) {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  return (
    normalized.includes('<db_password>') ||
    normalized.includes('<password>') ||
    normalized.includes('your-mqtt-password') ||
    normalized.includes('replace-with-')
  );
}

function getNonPlaceholder(value, fallback = '') {
  return isPlaceholder(value) ? fallback : value;
}

function getRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  port: Number(process.env.PORT || 3001),
  mongoUri: getNonPlaceholder(process.env.MONGODB_URI, 'mongodb://127.0.0.1:27017/smart_locker'),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-env',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripeCurrency: (process.env.STRIPE_CURRENCY || 'usd').toLowerCase(),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'noreply@smartlocker.com',
  adminInviteKey: process.env.ADMIN_INVITE_KEY || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  mqttServer: process.env.MQTT_SERVER || 'mqtts://3e037e542d2944a3ae4266e4d6f6c874.s1.eu.hivemq.cloud:8883',
  mqttUsername: getNonPlaceholder(process.env.MQTT_USERNAME, ''),
  mqttPassword: getNonPlaceholder(process.env.MQTT_PASSWORD, ''),
  defaultControlTopic: process.env.MQTT_LOCKER_CONTROL_TOPIC || 'locker/1/control',
  defaultStateTopic: process.env.MQTT_LOCKER_STATE_TOPIC || 'locker/1/state',
  defaultDoorTopic: process.env.MQTT_LOCKER_DOOR_TOPIC || 'locker/1/door',
  seedSampleData: process.env.SEED_SAMPLE_DATA !== 'false',
  sampleUsers: {
    superAdmin: {
      name: process.env.SAMPLE_SUPER_ADMIN_NAME || 'Sample Super Admin',
      email: process.env.SAMPLE_SUPER_ADMIN_EMAIL || 'superadmin@smartlocker.com',
      password: process.env.SAMPLE_SUPER_ADMIN_PASSWORD || 'SuperAdmin123!'
    },
    subAdmin: {
      name: process.env.SAMPLE_SUB_ADMIN_NAME || 'Sample Sub Admin',
      email: process.env.SAMPLE_SUB_ADMIN_EMAIL || 'subadmin@smartlocker.com',
      password: process.env.SAMPLE_SUB_ADMIN_PASSWORD || 'SubAdmin123!'
    },
    user: {
      name: process.env.SAMPLE_USER_NAME || 'Sample User',
      email: process.env.SAMPLE_USER_EMAIL || 'user@smartlocker.com',
      password: process.env.SAMPLE_USER_PASSWORD || 'User12345!'
    }
  }
};

module.exports = {
  env,
  getRequired
};
