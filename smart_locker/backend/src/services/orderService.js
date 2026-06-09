const Order = require('../models/Order');

const ORDER_STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED'];

function toOrderDTO(order) {
  return {
    id: order._id,
    userId: order.userId,
    productId: order.productId,
    productName: order.productName,
    productCategory: order.productCategory,
    selectedColor: order.selectedColor || '',
    quantity: order.quantity || 1,
    unitPrice: order.unitPrice || 0,
    deliveryFee: order.deliveryFee || 0,
    deliveryDays: order.deliveryDays || 0,
    currency: order.currency || 'usd',
    amount: order.amount || 0,
    status: order.status,
    stripeSessionId: order.stripeSessionId || '',
    stripePaymentIntentId: order.stripePaymentIntentId || '',
    stripePaymentStatus: order.stripePaymentStatus || '',
    customerEmail: order.customerEmail || '',
    checkoutUrl: order.checkoutUrl || '',
    paidAt: order.paidAt,
    failedAt: order.failedAt,
    notes: order.notes || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

async function createOrder(payload) {
  const order = await Order.create(payload);
  return toOrderDTO(order);
}

async function findOrderByStripeSessionId(stripeSessionId) {
  const order = await Order.findOne({ stripeSessionId });
  return order;
}

async function listOrdersForUser(user) {
  const query = user.role === 'SUPER_ADMIN' ? {} : { userId: user._id };
  const orders = await Order.find(query).sort({ createdAt: -1 });
  return orders.map(toOrderDTO);
}

async function updateOrderByStripeSessionId(stripeSessionId, updates) {
  const order = await Order.findOneAndUpdate(
    { stripeSessionId },
    { $set: updates },
    { new: true }
  );

  return order ? toOrderDTO(order) : null;
}

async function updateOrderById(orderId, updates) {
  const order = await Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true });
  return order ? toOrderDTO(order) : null;
}

async function updateOrderStatus(orderId, status) {
  if (!ORDER_STATUSES.includes(status)) {
    const error = new Error('Invalid order status');
    error.statusCode = 400;
    throw error;
  }

  const updates = { status };

  if (status === 'PAID') {
    updates.paidAt = new Date();
    updates.failedAt = null;
  } else if (status === 'FAILED') {
    updates.failedAt = new Date();
    updates.paidAt = null;
  } else if (status === 'PENDING') {
    updates.paidAt = null;
    updates.failedAt = null;
  }

  const order = await Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  return toOrderDTO(order);
}

module.exports = {
  toOrderDTO,
  createOrder,
  findOrderByStripeSessionId,
  listOrdersForUser,
  updateOrderByStripeSessionId,
  updateOrderById,
  updateOrderStatus,
  ORDER_STATUSES
};