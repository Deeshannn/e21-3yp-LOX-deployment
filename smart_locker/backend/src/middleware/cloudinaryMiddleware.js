const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { env } = require('../config/env');

const isConfigured = env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret;

if (!isConfigured) {
  console.warn(
    'WARNING: Cloudinary is not configured. Profile image uploads will fail. ' +
    'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
  );
}

cloudinary.config({
  cloud_name: env.cloudinaryCloudName || 'placeholder_cloud',
  api_key: env.cloudinaryApiKey || 'placeholder_key',
  api_secret: env.cloudinaryApiSecret || 'placeholder_secret',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smart_locker_profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = {
  upload,
  cloudinary,
};
