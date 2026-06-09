const Product = require('../models/Product');
const { Roles } = require('../constants/enums');

const SAMPLE_PRODUCTS = [
  {
    name: 'Invisible RFID Cabinet Lock',
    category: 'Hidden Locks',
    price: 3090,
    compareAtPrice: 7270,
    deliveryDays: 3,
    deliveryFee: 0,
    deliveryLabel: 'Fast delivery',
    badge: 'Bestseller',
    rating: 4.8,
    reviews: 34,
    sold: 128,
    stock: 24,
    description: 'A hidden cabinet lock for wardrobes, drawers and wooden panels with RFID access and low-battery warning.',
    features: ['RFID access', 'Hidden installation', 'Low battery alert', 'Emergency key'],
    colors: [
      { name: 'Grey', value: '#c7ccd6' },
      { name: 'Black', value: '#2f3640' }
    ],
    artStyle: 'rfid',
    featured: true
  },
  {
    name: 'Dictionary Book Safe Box',
    category: 'Book Safes',
    price: 4697,
    compareAtPrice: 6899,
    deliveryDays: 4,
    deliveryFee: 120,
    deliveryLabel: 'Standard delivery',
    badge: 'Secure storage',
    rating: 4.7,
    reviews: 21,
    sold: 72,
    stock: 18,
    description: 'A classic book-style safe for cash, jewelry and spare keys with a concealed steel inner box.',
    features: ['Book cover disguise', 'Steel inner vault', 'Portable design', 'Compact storage'],
    colors: [
      { name: 'Red', value: '#8b1e1e' },
      { name: 'Black', value: '#1f2937' }
    ],
    artStyle: 'book',
    featured: true
  },
  {
    name: 'Portable Key Safe Box',
    category: 'Key Safes',
    price: 5818,
    compareAtPrice: 9950,
    deliveryDays: 2,
    deliveryFee: 0,
    deliveryLabel: 'Express delivery',
    badge: 'Top rated',
    rating: 4.9,
    reviews: 45,
    sold: 50,
    stock: 14,
    description: 'A compact key safe for home and shop use with a sturdy handle, removable tray and quick access latch.',
    features: ['Portable tray', 'Privacy lock', 'Shop-safe build', 'Quick key access'],
    colors: [
      { name: 'Pink', value: '#ddb4c0' },
      { name: 'Grey', value: '#cfd5df' }
    ],
    artStyle: 'safe',
    featured: false
  },
  {
    name: 'RFID Drawer Lock Kit',
    category: 'Drawer Locks',
    price: 2890,
    compareAtPrice: 3990,
    deliveryDays: 5,
    deliveryFee: 150,
    deliveryLabel: 'Standard delivery',
    badge: 'Best value',
    rating: 4.5,
    reviews: 12,
    sold: 39,
    stock: 27,
    description: 'A compact drawer lock kit for cabinets and office drawers with sensor unlock and reserve key support.',
    features: ['RFID sensor', 'Drawer fit', 'Silent latch', 'Spare key included'],
    colors: [
      { name: 'White', value: '#f5f7fb' },
      { name: 'Grey', value: '#adb5c3' }
    ],
    artStyle: 'drawer',
    featured: false
  },
  {
    name: 'Wall Mount Secure Locker',
    category: 'Wall Lockers',
    price: 6990,
    compareAtPrice: 8990,
    deliveryDays: 6,
    deliveryFee: 200,
    deliveryLabel: 'Careful delivery',
    badge: 'Heavy duty',
    rating: 4.6,
    reviews: 18,
    sold: 21,
    stock: 10,
    description: 'A rigid wall-mounted locker shell for tools, valuables and shared workspace storage.',
    features: ['Wall mount', 'Steel shell', 'Durable hinges', 'Shared access'],
    colors: [
      { name: 'Black', value: '#111827' },
      { name: 'Walnut', value: '#916447' }
    ],
    artStyle: 'wall',
    featured: true
  },
  {
    name: 'Coin Storage Locker',
    category: 'Coin Boxes',
    price: 5457,
    compareAtPrice: 7990,
    deliveryDays: 3,
    deliveryFee: 80,
    deliveryLabel: 'Fast delivery',
    badge: 'Popular choice',
    rating: 4.4,
    reviews: 8,
    sold: 172,
    stock: 31,
    description: 'A decorative but secure locker for small valuables, cash notes and coins with a themed front panel.',
    features: ['Decorative cover', 'Compact vault', 'Giftable style', 'Easy carry handle'],
    colors: [
      { name: 'Ivory', value: '#f7efe5' },
      { name: 'Rose', value: '#d6b7ba' }
    ],
    artStyle: 'coin',
    featured: false
  }
];

function toProductDTO(product) {
  return {
    id: product._id,
    name: product.name,
    category: product.category,
    price: product.price,
    compareAtPrice: product.compareAtPrice || 0,
    deliveryDays: product.deliveryDays || 3,
    deliveryFee: product.deliveryFee || 0,
    deliveryLabel: product.deliveryLabel || 'Fast delivery',
    badge: product.badge || '',
    rating: product.rating || 0,
    reviews: product.reviews || 0,
    sold: product.sold || 0,
    stock: product.stock || 0,
    description: product.description || '',
    imageUrl: product.imageUrl || '',
    features: product.features || [],
    colors: product.colors || [],
    artStyle: product.artStyle || 'rfid',
    featured: Boolean(product.featured),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function normalizeProductPayload(payload) {
  return {
    name: String(payload.name || '').trim(),
    category: String(payload.category || '').trim(),
    price: Number(payload.price || 0),
    compareAtPrice: Number(payload.compareAtPrice || 0),
    deliveryDays: Math.max(1, Number(payload.deliveryDays || 3)),
    deliveryFee: Math.max(0, Number(payload.deliveryFee || 0)),
    deliveryLabel: String(payload.deliveryLabel || 'Fast delivery').trim(),
    badge: String(payload.badge || '').trim(),
    rating: Number(payload.rating || 4.7),
    reviews: Math.max(0, Number(payload.reviews || 0)),
    sold: Math.max(0, Number(payload.sold || 0)),
    stock: Math.max(0, Number(payload.stock || 0)),
    description: String(payload.description || '').trim(),
    imageUrl: String(payload.imageUrl || '').trim(),
    features: Array.isArray(payload.features) ? payload.features.map((item) => String(item).trim()).filter(Boolean) : [],
    colors: Array.isArray(payload.colors)
      ? payload.colors
          .map((color) => ({ name: String(color.name || '').trim(), value: String(color.value || '').trim() }))
          .filter((color) => color.name && color.value)
      : [],
    artStyle: String(payload.artStyle || 'rfid').trim(),
    featured: Boolean(payload.featured)
  };
}

async function listProducts() {
  const products = await Product.find().sort({ featured: -1, sold: -1, createdAt: -1 });
  return products.map(toProductDTO);
}

async function getProductById(productId) {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return toProductDTO(product);
}

async function createProduct(payload) {
  if (!payload.name || !payload.category) {
    const error = new Error('name and category are required');
    error.statusCode = 400;
    throw error;
  }

  const product = await Product.create(normalizeProductPayload(payload));
  return toProductDTO(product);
}

async function updateProduct(productId, payload) {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  Object.assign(product, normalizeProductPayload({ ...toProductDTO(product), ...payload }));
  await product.save();
  return toProductDTO(product);
}

async function deleteProduct(productId) {
  const product = await Product.findByIdAndDelete(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return toProductDTO(product);
}

async function seedProducts() {
  const count = await Product.countDocuments();
  if (count > 0) {
    return;
  }

  await Product.insertMany(SAMPLE_PRODUCTS);
}

module.exports = {
  toProductDTO,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  seedProducts,
  SAMPLE_PRODUCTS
};