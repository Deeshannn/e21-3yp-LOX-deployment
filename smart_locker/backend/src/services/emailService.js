const nodemailer = require('nodemailer');
const { env } = require('../config/env');

let transporter = null;

if (env.smtpHost && env.smtpUser) {
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });
}

/**
 * Sends a device-authorization OTP code email to a user.
 * @param {object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.code - The OTP verification code
 */
async function sendOtpEmail({ email, code }) {
  const mailOptions = {
    from: env.smtpFrom,
    to: email,
    subject: 'Smart Locker - Device Authorization Code',
    text: `Your security verification code is: ${code}\n\nThis code will expire in 5 minutes.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #64674b;">Device Authorization Required</h2>
        <p>A login attempt from a new device was made on your Smart Locker account.</p>
        <p>Please use the following One-Time Password (OTP) to authorize this device:</p>
        <div style="background-color: #f6f5f1; padding: 20px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #64674b; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #777; font-size: 13px;">This verification code is valid for 5 minutes. If you did not initiate this login request, please change your password immediately.</p>
      </div>
    `
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SERVICE] OTP email sent successfully to ${email}. Message ID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`[EMAIL SERVICE] Error sending OTP email to ${email}:`, error.message);
      _fallbackLog(email, code);
    }
  } else {
    console.warn('[EMAIL SERVICE] SMTP details are not configured in your .env. Running in Mock/Development mode.');
    _fallbackLog(email, code);
  }
}

function _fallbackLog(email, code) {
  console.log(`\n==============================================`);
  console.log(`[DEVELOPMENT / MOCK EMAIL]`);
  console.log(`To: ${email}`);
  console.log(`Subject: Smart Locker - Device Authorization Code`);
  console.log(`Body: Your security verification code is: ${code}`);
  console.log(`==============================================\n`);
}

module.exports = {
  sendOtpEmail
};
