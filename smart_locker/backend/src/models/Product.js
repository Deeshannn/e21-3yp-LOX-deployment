const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    value: { type: String, trim: true, required: true }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: 0, min: 0 },
    deliveryDays: { type: Number, default: 3, min: 1 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    deliveryLabel: { type: String, trim: true, default: 'Fast delivery' },
    badge: { type: String, trim: true, default: '' },
    rating: { type: Number, default: 4.7, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 1, min: 0 },
    description: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    features: [{ type: String, trim: true }],
    colors: { type: [colorSchema], default: [] },
    artStyle: { type: String, trim: true, default: 'rfid' },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);