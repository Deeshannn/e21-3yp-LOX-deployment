const { initializeFirebase } = require('../src/config/firebase');
const { connectDatabase } = require('../src/config/database');
const User = require('../src/models/User');
const { sendPushNotification } = require('../src/services/notificationService');

async function testFcm() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node test-fcm.js <user_email>');
    process.exit(1);
  }

  console.log('Initializing Firebase and connecting to Database...');
  initializeFirebase();
  await connectDatabase();

  console.log(`Searching for user with email: ${email}`);
  const user = await User.findOne({ email: email });
  if (!user) {
    console.error(`User not found with email: ${email}`);
    process.exit(1);
  }

  console.log('User found:', {
    _id: user._id,
    name: user.name,
    email: user.email,
    fcmToken: user.fcmToken ? `${user.fcmToken.substring(0, 20)}...` : 'NONE'
  });

  if (!user.fcmToken) {
    console.error('Error: User has no FCM token registered. Please open the app and log in first.');
    process.exit(1);
  }

  console.log('Sending test push notification...');
  try {
    const response = await sendPushNotification(
      user._id.toString(),
      'Lox Test Notification',
      'This is a test background notification sent from CLI!'
    );
    console.log('FCM Send response:', response);
  } catch (error) {
    console.error('Failed to send push notification:', error);
  } finally {
    process.exit(0);
  }
}

testFcm().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
