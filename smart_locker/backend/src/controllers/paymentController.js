const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { env } = require('../config/env');
const { createCheckoutSession, handleStripeWebhookEvent } = require('../services/paymentService');

const createCheckoutSessionHandler = asyncHandler(async (req, res) => {
  const result = await createCheckoutSession(req.user, req.body || {}, req);
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

module.exports = {
  createCheckoutSessionHandler,
  stripeWebhookHandler
};