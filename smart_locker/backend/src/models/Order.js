const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true, trim: true },
    productCategory: { type: String, required: true, trim: true },
    selectedColor: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    deliveryDays: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'usd', trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    stripeSessionId: { type: String, trim: true, index: true, default: '' },
    stripePaymentIntentId: { type: String, trim: true, default: '' },
    stripePaymentStatus: { type: String, trim: true, default: '' },
    customerEmail: { type: String, trim: true, default: '' },
    checkoutUrl: { type: String, trim: true, default: '' },
    paidAt: { type: Date },
    failedAt: { type: Date },
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);