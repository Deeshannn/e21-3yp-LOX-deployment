const stripeLib = require('stripe');
const { env } = require('../config/env');
const Product = require('../models/Product');
const { Roles } = require('../constants/enums');
const { createOrder, findOrderByStripeSessionId, updateOrderById, updateOrderByStripeSessionId } = require('./orderService');

function getStripeClient() {
  if (!env.stripeSecretKey) {
    const error = new Error('Stripe secret key is not configured');
    error.statusCode = 503;
    throw error;
  }

  return stripeLib(env.stripeSecretKey);
}

function buildOrigin(req) {
  return req.headers.origin || env.frontendUrl || 'http://localhost:3000';
}

function toMinorUnit(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function normalizeQuantity(quantity) {
  const value = Number.parseInt(quantity, 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

async function createCheckoutSession(user, payload, req) {
  if (![Roles.USER, Roles.SUB_ADMIN, Roles.SUPER_ADMIN].includes(user.role)) {
    const error = new Error('This account cannot place checkout orders');
    error.statusCode = 403;
    throw error;
  }

  const product = await Product.findById(payload.productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const quantity = normalizeQuantity(payload.quantity);
  const selectedColor = String(payload.selectedColor || product.colors?.[0]?.name || '').trim();
  const currency = String(payload.currency || env.stripeCurrency || 'usd').toLowerCase();
  const deliveryFee = Number(product.deliveryFee || 0);
  const subtotal = Number(product.price || 0) * quantity;
  const totalAmount = subtotal + deliveryFee;

  const order = await createOrder({
    userId: user._id,
    productId: product._id,
    productName: product.name,
    productCategory: product.category,
    selectedColor,
    quantity,
    unitPrice: Number(product.price || 0),
    deliveryFee,
    deliveryDays: Number(product.deliveryDays || 0),
    currency,
    amount: totalAmount,
    status: 'PENDING'
  });

  const stripe = getStripeClient();
  const origin = buildOrigin(req);
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: String(user._id),
    success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?payment=cancel&session_id={CHECKOUT_SESSION_ID}`,
    line_items: [
      {
        quantity,
        price_data: {
          currency,
          unit_amount: toMinorUnit(totalAmount),
          product_data: {
            name: product.name,
            description: `${product.category} - ${product.deliveryLabel || 'Delivery included'}`,
            metadata: {
              productId: String(product._id),
              orderId: String(order.id)
            }
          }
        }
      }
    ],
    metadata: {
      orderId: String(order.id),
      productId: String(product._id),
      userId: String(user._id),
      selectedColor,
      quantity: String(quantity)
    }
  });

  const savedOrder = await updateOrderById(order.id, {
    stripeSessionId: checkoutSession.id,
    checkoutUrl: checkoutSession.url || '',
    notes: 'Checkout session created'
  });

  return {
    order: savedOrder,
    checkoutUrl: checkoutSession.url,
    sessionId: checkoutSession.id
  };
}

async function handleStripeWebhookEvent(event) {
  const session = event.data.object;

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const order = await findOrderByStripeSessionId(session.id);
    if (!order) {
      return null;
    }

    return updateOrderByStripeSessionId(session.id, {
      status: 'PAID',
      stripePaymentStatus: session.payment_status || 'paid',
      stripePaymentIntentId: String(session.payment_intent || ''),
      customerEmail: session.customer_details?.email || session.customer_email || order.customerEmail || '',
      paidAt: new Date(),
      notes: 'Payment confirmed by Stripe webhook'
    });
  }

  if (event.type === 'checkout.session.expired') {
    const sessionId = session.id || '';
    if (!sessionId) {
      return null;
    }

    return updateOrderByStripeSessionId(sessionId, {
      status: 'FAILED',
      stripePaymentStatus: session.payment_status || 'unpaid',
      failedAt: new Date(),
      notes: 'Payment failed or checkout expired'
    });
  }

  return null;
}

module.exports = {
  createCheckoutSession,
  handleStripeWebhookEvent
};