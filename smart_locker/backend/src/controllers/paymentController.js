const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { env } = require('../config/env');
const { createCheckoutSession, createOverdueCheckoutSession, fulfillCheckoutSession, handleStripeWebhookEvent } = require('../services/paymentService');

const createCheckoutSessionHandler = asyncHandler(async (req, res) => {
  const result = await createCheckoutSession(req.user, req.body || {}, req);
  return success(res, result, 201);
});

/**
 * POST /payments/overdue-checkout
 * Creates a Stripe checkout session for an overdue locker fee.
 * Body: { lockerId }
 */
const createOverdueCheckoutSessionHandler = asyncHandler(async (req, res) => {
  const { lockerId } = req.body || {};
  if (!lockerId) {
    return res.status(400).json({ message: 'lockerId is required' });
  }

  const result = await createOverdueCheckoutSession(req.user, lockerId, req);
  return success(res, result, 201);
});

const stripeWebhookHandler = asyncHandler(async (req, res) => {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return success(res, { received: true, skipped: true });
  }

  const stripe = require('stripe')(env.stripeSecretKey);
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }

  const order = await handleStripeWebhookEvent(event);
  return success(res, { received: true, order });
});

const getMobileSuccessPage = asyncHandler(async (req, res) => {
  const { session_id, type, lockerId } = req.query || {};
  console.log('[getMobileSuccessPage] Redirect success query received:', { session_id, type, lockerId });

  // Force-verify/fulfill the Stripe session if possible
  if (session_id && env.stripeSecretKey) {
    try {
      const stripe = require('stripe')(env.stripeSecretKey);
      console.log('[getMobileSuccessPage] Retrieving checkout session from Stripe:', session_id);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      console.log('[getMobileSuccessPage] Retrieved Stripe Session details:', {
        status: session?.status,
        payment_status: session?.payment_status
      });
      if (session && (session.payment_status === 'paid' || session.status === 'complete')) {
        console.log('[getMobileSuccessPage] Calling fulfillCheckoutSession...');
        await fulfillCheckoutSession(session);
        console.log('[getMobileSuccessPage] Fulfill complete.');
      }
    } catch (err) {
      console.error('[getMobileSuccessPage] Error retrieving/fulfilling session:', err.message);
    }
  }

  let deepLink = `loxapp://payment-success?status=success&session_id=${session_id || ''}`;
  if (type) deepLink += `&type=${type}`;
  if (lockerId) deepLink += `&lockerId=${lockerId}`;

  // Align with what the mobile app expects
  if (type === 'overdue') {
    deepLink += `&payment=overdue_success`;
  } else if (type === 'store') {
    deepLink += `&payment=store_success`;
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Payment Successful</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 36px 24px;
      text-align: center;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      max-width: 400px;
      width: 100%;
    }
    .icon {
      font-size: 56px;
      color: #64674B;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 10px 0;
    }
    p {
      font-size: 14px;
      color: #4b5563;
      margin: 0 0 28px 0;
      line-height: 1.5;
    }
    .btn {
      display: block;
      background-color: #64674B;
      color: white !important;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 4px 6px rgba(100, 103, 75, 0.2);
      transition: background-color 0.2s, transform 0.1s;
    }
    .btn:active {
      transform: scale(0.98);
      background-color: #4f513b;
    }
  </style>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.location.href = "${deepLink}";
      }, 300);
    }
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Payment Successful!</h1>
    <p>Your payment was completed successfully. Tap the button below to return to the LoX app.</p>
    <a href="${deepLink}" class="btn">Return to LoX App</a>
  </div>
</body>
</html>
  `);
});

const getMobileCancelPage = (req, res) => {
  const { session_id, type, lockerId } = req.query || {};
  let deepLink = `loxapp://payment-cancel?status=cancelled&session_id=${session_id || ''}`;
  if (type) deepLink += `&type=${type}`;
  if (lockerId) deepLink += `&lockerId=${lockerId}`;

  // Align with what the mobile app expects
  if (type === 'overdue') {
    deepLink += `&payment=overdue_cancel`;
  } else if (type === 'store') {
    deepLink += `&payment=store_cancel`;
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Payment Cancelled</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 36px 24px;
      text-align: center;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      max-width: 400px;
      width: 100%;
    }
    .icon {
      font-size: 56px;
      color: #dc2626;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 10px 0;
    }
    p {
      font-size: 14px;
      color: #4b5563;
      margin: 0 0 28px 0;
      line-height: 1.5;
    }
    .btn {
      display: block;
      background-color: #64674B;
      color: white !important;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 4px 6px rgba(100, 103, 75, 0.2);
      transition: background-color 0.2s, transform 0.1s;
    }
    .btn:active {
      transform: scale(0.98);
      background-color: #4f513b;
    }
  </style>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.location.href = "${deepLink}";
      }, 300);
    }
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Payment Cancelled</h1>
    <p>The checkout process was cancelled. Tap the button below to return to the LoX app.</p>
    <a href="${deepLink}" class="btn">Return to LoX App</a>
  </div>
</body>
</html>
  `);
};

/**
 * GET /payments/web/success
 * Handles successful Stripe redirects for web clients.
 * Verifies/fulfills the checkout session and redirects to the frontend origin.
 */
const getWebSuccessPage = asyncHandler(async (req, res) => {
  const { session_id, type, lockerId, origin } = req.query || {};
  console.log('[getWebSuccessPage] Redirect success query received:', { session_id, type, lockerId, origin });

  // Force-verify/fulfill the Stripe session if possible
  if (session_id && env.stripeSecretKey) {
    try {
      const stripe = require('stripe')(env.stripeSecretKey);
      console.log('[getWebSuccessPage] Retrieving checkout session from Stripe:', session_id);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      console.log('[getWebSuccessPage] Retrieved Stripe Session details:', {
        status: session?.status,
        payment_status: session?.payment_status
      });
      if (session && (session.payment_status === 'paid' || session.status === 'complete')) {
        console.log('[getWebSuccessPage] Calling fulfillCheckoutSession...');
        await fulfillCheckoutSession(session);
        console.log('[getWebSuccessPage] Fulfill complete.');
      }
    } catch (err) {
      console.error('[getWebSuccessPage] Error retrieving/fulfilling session:', err.message);
    }
  }

  const baseOrigin = origin || env.frontendUrl || 'http://localhost:3000';
  let redirectUrl = `${baseOrigin}/?payment=${type === 'overdue' ? 'overdue_success' : 'success'}&session_id=${session_id || ''}`;
  if (lockerId) {
    redirectUrl += `&lockerId=${lockerId}`;
  }

  return res.redirect(redirectUrl);
});

module.exports = {
  createCheckoutSessionHandler,
  createOverdueCheckoutSessionHandler,
  stripeWebhookHandler,
  getMobileSuccessPage,
  getMobileCancelPage,
  getWebSuccessPage
};