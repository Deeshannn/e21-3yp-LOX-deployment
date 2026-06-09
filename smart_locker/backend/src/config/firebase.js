const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function initializeFirebase() {
  const serviceAccountPath = path.resolve(__dirname, '../../lox-backup-firebase-firebase-adminsdk-fbsvc-8d4bbe8aab.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error.message);
    }
  } else {
    console.warn('Firebase Service Account file not found at:', serviceAccountPath);
  }
}

module.exports = {
  initializeFirebase
};
