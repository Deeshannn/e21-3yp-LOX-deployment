const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const User = require('../models/User');

/**
 * Sends a push notification to a specific user using their registered FCM token.
 * @param {string} userId - The ID of the user to notify.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @param {object} [data] - Optional metadata payload.
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    if (!admin.getApps || admin.getApps().length === 0) {
      console.warn(`[Notification] Firebase Admin SDK is not initialized. Cannot send notification to user ${userId}: "${title}" - "${body}"`);
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      console.log(`[Notification] Skip sending. No FCM token found for user ${userId}`);
      return;
    }

    const message = {
      notification: {
        title,
        body
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'high_importance_channel'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default'
          }
        }
      },
      data: Object.fromEntries(
        Object.entries(data).map(([key, val]) => [key, String(val)])
      ),
      token: user.fcmToken
    };

    const response = await getMessaging().send(message);
    console.log(`[Notification] Sent notification to user ${userId} (${user.email}). Response:`, response);
    return response;
  } catch (error) {
    console.error(`[Notification] Error sending push notification to user ${userId}:`, error.message);
  }
}

module.exports = {
  sendPushNotification
};
