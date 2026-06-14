import React from 'react';
import { apiRequest, authHeaders } from '../../services/apiClient';
import AlertMessage from '../common/AlertMessage';

const DEFAULT_COLORS = [
  { name: 'Grey', value: '#b8c0cc' },
  { name: 'Black', value: '#1f2937' },
  { name: 'White', value: '#f8fafc' },
  { name: 'Walnut', value: '#8d5f3f' }
];

const DEFAULT_DELIVERY_METHODS = [
  { label: 'Fast delivery', days: 3 },
  { label: 'Standard delivery', days: 5 },
  { label: 'Express delivery', days: 2 }
];

const STORE_SETTINGS_STORAGE_KEY = 'smart_locker_store_settings';

const INITIAL_PRODUCTS = [
  {
    id: 'rfid-hidden-lock',
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
    id: 'book-safe',
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
    id: 'key-safe-box',
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
    id: 'drawer-lock',
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
    id: 'wall-locker',
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
    id: 'coin-locker',
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

function formatPrice(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK')}`;
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function buildProductId(name) {
  return `${slugify(name)}-${Date.now().toString(36)}`;
}

function parseFeatureList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseColorList(value) {
  const parsed = String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const [namePart, colorPart] = item.split(':').map((part) => part.trim());
      const fallbackColor = DEFAULT_COLORS[index % DEFAULT_COLORS.length].value;
      return {
        name: namePart || `Color ${index + 1}`,
        value: colorPart || fallbackColor
      };
    });

  return parsed.length ? parsed : DEFAULT_COLORS.slice(0, 2);
}

function buildDefaultStoreSettings() {
  const categorySet = new Set(INITIAL_PRODUCTS.map((product) => product.category).filter(Boolean));

  return {
    categories: Array.from(categorySet),
    deliveryMethods: DEFAULT_DELIVERY_METHODS.slice(),
    colors: DEFAULT_COLORS.slice()
  };
}

function loadStoreSettings() {
  try {
    const raw = window.localStorage.getItem(STORE_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return buildDefaultStoreSettings();
    }

    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : buildDefaultStoreSettings().categories,
      deliveryMethods:
        Array.isArray(parsed.deliveryMethods) && parsed.deliveryMethods.length
          ? parsed.deliveryMethods
          : buildDefaultStoreSettings().deliveryMethods,
      colors: Array.isArray(parsed.colors) && parsed.colors.length ? parsed.colors : buildDefaultStoreSettings().colors
    };
  } catch {
    return buildDefaultStoreSettings();
  }
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

function createEmptyForm() {
  return {
    name: '',
    category: '',
    price: '',
    compareAtPrice: '',
    deliveryDays: '',
    deliveryFee: '0',
    deliveryLabel: 'Fast delivery',
    badge: '',
    rating: '4.7',
    reviews: '0',
    sold: '0',
    stock: '1',
    description: '',
    imageUrl: '',
    selectedColors: DEFAULT_COLORS.slice(0, 2),
    featuresText: '',
    artStyle: 'rfid',
    featured: false
  };
}

function formFromProduct(product) {
  if (!product) {
    return createEmptyForm();
  }

  return {
    name: product.name || '',
    category: product.category || '',
    price: String(product.price ?? ''),
    compareAtPrice: String(product.compareAtPrice ?? ''),
    deliveryDays: String(product.deliveryDays ?? ''),
    deliveryFee: String(product.deliveryFee ?? 0),
    deliveryLabel: product.deliveryLabel || 'Fast delivery',
    badge: product.badge || '',
    rating: String(product.rating ?? '4.7'),
    reviews: String(product.reviews ?? '0'),
    sold: String(product.sold ?? '0'),
    stock: String(product.stock ?? '1'),
    description: product.description || '',
    imageUrl: product.imageUrl || '',
    selectedColors: (product.colors || []).length ? product.colors : DEFAULT_COLORS.slice(0, 2),
    featuresText: (product.features || []).join(', '),
    artStyle: product.artStyle || 'rfid',
    featured: Boolean(product.featured)
  };
}

function createArtwork(product, variant = 'hero') {
  const palette = (product.colors && product.colors.length ? product.colors : DEFAULT_COLORS).map((color) => color.value);
  const accent = palette[0] || '#0f6c8d';
  const accent2 = palette[1] || '#f97316';
  const accent3 = palette[2] || '#eef2f7';
  const title = String(product.name || 'Locker Product').replace(/&/g, '&amp;');
  const subtitle = String(product.category || 'Locker').replace(/&/g, '&amp;');

  const artByStyle = {
    rfid: `<rect x="68" y="58" width="204" height="150" rx="24" fill="url(#cardGradient)" stroke="${accent}" stroke-width="4"/><rect x="108" y="94" width="120" height="18" rx="9" fill="${accent2}" opacity="0.9"/><rect x="94" y="120" width="148" height="74" rx="18" fill="#ffffff" opacity="0.94"/><circle cx="138" cy="157" r="16" fill="${accent}" opacity="0.88"/><circle cx="178" cy="157" r="16" fill="${accent2}" opacity="0.88"/>`,
    book: `<rect x="72" y="46" width="188" height="170" rx="10" fill="url(#cardGradient)" stroke="${accent}" stroke-width="5"/><rect x="88" y="62" width="156" height="136" rx="5" fill="#ffffff" opacity="0.96"/><rect x="104" y="82" width="124" height="24" rx="4" fill="${accent}" opacity="0.92"/><rect x="116" y="112" width="98" height="44" rx="8" fill="${accent2}" opacity="0.92"/>`,
    safe: `<rect x="68" y="58" width="204" height="150" rx="26" fill="url(#cardGradient)" stroke="${accent}" stroke-width="5"/><rect x="94" y="86" width="152" height="94" rx="18" fill="#ffffff" opacity="0.93"/><circle cx="170" cy="133" r="22" fill="${accent2}" opacity="0.92"/><circle cx="170" cy="133" r="7" fill="#ffffff"/><rect x="120" y="118" width="30" height="30" rx="6" fill="${accent}" opacity="0.9"/>`,
    drawer: `<rect x="54" y="92" width="236" height="112" rx="22" fill="url(#cardGradient)" stroke="${accent}" stroke-width="5"/><rect x="82" y="112" width="180" height="20" rx="10" fill="#ffffff" opacity="0.92"/><rect x="82" y="140" width="180" height="16" rx="8" fill="${accent2}" opacity="0.85"/><circle cx="120" cy="142" r="7" fill="#ffffff"/><circle cx="202" cy="142" r="7" fill="#ffffff"/>`,
    wall: `<rect x="74" y="40" width="196" height="182" rx="24" fill="url(#cardGradient)" stroke="${accent}" stroke-width="5"/><rect x="94" y="62" width="156" height="132" rx="18" fill="#ffffff" opacity="0.96"/><rect x="110" y="82" width="124" height="18" rx="9" fill="${accent2}" opacity="0.94"/><rect x="110" y="112" width="124" height="44" rx="10" fill="${accent}" opacity="0.8"/>`,
    coin: `<rect x="72" y="56" width="200" height="154" rx="26" fill="url(#cardGradient)" stroke="${accent}" stroke-width="5"/><circle cx="172" cy="133" r="58" fill="#ffffff" opacity="0.95"/><circle cx="172" cy="133" r="34" fill="${accent}" opacity="0.86"/><rect x="104" y="104" width="40" height="58" rx="10" fill="${accent2}" opacity="0.9"/>`
  };

  const shape = artByStyle[product.artStyle] || artByStyle.rfid;
  const extraContent =
    variant === 'thumb'
      ? `<circle cx="276" cy="50" r="20" fill="${accent2}" opacity="0.25"/><circle cx="46" cy="180" r="28" fill="${accent}" opacity="0.18"/>`
      : `<circle cx="280" cy="48" r="32" fill="${accent2}" opacity="0.18"/><circle cx="34" cy="194" r="48" fill="${accent}" opacity="0.14"/>`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 320 220" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent3}" />
          <stop offset="55%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="28" fill="#f8fafc" />
      <rect x="16" y="16" width="288" height="188" rx="24" fill="url(#cardGradient)" />
      ${extraContent}
      ${shape}
      <text x="24" y="186" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="#1d2130">${title}</text>
      <text x="24" y="206" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="#667085">${subtitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function ProductFormPanel({
  title,
  copy,
  submitLabel,
  cancelLabel,
  showCancel,
  form,
  categoryOptions,
  deliveryMethodOptions,
  colorPalette,
  uploadingImage,
  onFormChange,
  onImageUpload,
  onRemoveImage,
  onAddColor,
  onRemoveColor,
  onSubmit,
  onCancel
}) {
  const categoryList = categoryOptions.includes(form.category) ? categoryOptions : [form.category, ...categoryOptions].filter(Boolean);
  const categoryValue = form.category || categoryList[0] || 'Uncategorized';
  const deliveryValue =
    deliveryMethodOptions.some((method) => method.label === form.deliveryLabel) ? form.deliveryLabel : deliveryMethodOptions[0]?.label || 'Fast delivery';

  return (
    <form className="product-editor panel-soft" onSubmit={onSubmit}>
      <div className="section-heading">
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>

      <div className="product-form-grid">
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(event) => onFormChange('name', event.target.value)} placeholder="Locker product name" required />
        </label>
        <label>
          <span>Category</span>
          <select value={categoryValue} onChange={(event) => onFormChange('category', event.target.value)} required>
            {categoryList.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Price</span>
          <input type="number" min="0" value={form.price} onChange={(event) => onFormChange('price', event.target.value)} required />
        </label>
        <label>
          <span>Compare at price</span>
          <input type="number" min="0" value={form.compareAtPrice} onChange={(event) => onFormChange('compareAtPrice', event.target.value)} />
        </label>
        <label>
          <span>Delivery days</span>
          <input type="number" min="1" value={form.deliveryDays} onChange={(event) => onFormChange('deliveryDays', event.target.value)} required />
        </label>
        <label>
          <span>Delivery fee</span>
          <input type="number" min="0" value={form.deliveryFee} onChange={(event) => onFormChange('deliveryFee', event.target.value)} />
        </label>
        <label>
          <span>Delivery label</span>
          <select value={deliveryValue} onChange={(event) => onFormChange('deliveryLabel', event.target.value)}>
            {deliveryMethodOptions.map((method) => (
              <option key={method.label} value={method.label}>
                {method.label} {method.days ? `(${method.days} days)` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Badge</span>
          <input value={form.badge} onChange={(event) => onFormChange('badge', event.target.value)} placeholder="Bestseller" />
        </label>
        <label>
          <span>Rating</span>
          <input value={form.rating} onChange={(event) => onFormChange('rating', event.target.value)} />
        </label>
        <label>
          <span>Reviews</span>
          <input type="number" min="0" value={form.reviews} onChange={(event) => onFormChange('reviews', event.target.value)} />
        </label>
        <label>
          <span>Sold</span>
          <input type="number" min="0" value={form.sold} onChange={(event) => onFormChange('sold', event.target.value)} />
        </label>
        <label>
          <span>Stock</span>
          <input type="number" min="0" value={form.stock} onChange={(event) => onFormChange('stock', event.target.value)} />
        </label>
        <label>
          <span>Artwork style</span>
          <select value={form.artStyle} onChange={(event) => onFormChange('artStyle', event.target.value)}>
            <option value="rfid">RFID hidden lock</option>
            <option value="book">Book safe</option>
            <option value="safe">Portable safe</option>
            <option value="drawer">Drawer lock</option>
            <option value="wall">Wall locker</option>
            <option value="coin">Coin locker</option>
          </select>
        </label>
        <label className="span-2">
          <span>Product photo</span>
          <div className="background-preview product-image-preview" style={form.imageUrl ? { backgroundImage: `url("${form.imageUrl}")` } : undefined}>
            {!form.imageUrl ? <span>No uploaded photo</span> : null}
          </div>
          <div className="store-action-row">
            <label className="upload-button" aria-label="Upload product photo">
              <span>{uploadingImage ? 'Loading image...' : 'Upload from device'}</span>
              <input type="file" accept="image/*" onChange={onImageUpload} disabled={uploadingImage} />
            </label>
            <button type="button" className="secondary" onClick={onRemoveImage} disabled={!form.imageUrl}>
              Remove photo
            </button>
          </div>
        </label>
        <label className="span-2">
          <span>Color palette</span>
          <div className="store-color-palette">
            {colorPalette.map((color) => (
              <button type="button" key={color.name} className="color-chip palette-chip" onClick={() => onAddColor(color)}>
                <span style={{ backgroundColor: color.value }} />
                {color.name}
              </button>
            ))}
          </div>
          <div className="store-selected-colors">
            {form.selectedColors.map((color) => (
              <button type="button" key={color.name} className="color-chip active" onClick={() => onRemoveColor(color.name)}>
                <span style={{ backgroundColor: color.value }} />
                {color.name}
              </button>
            ))}
          </div>
        </label>
        <label className="span-2">
          <span>Description</span>
          <textarea rows="4" value={form.description} onChange={(event) => onFormChange('description', event.target.value)} />
        </label>
        <label className="span-2">
          <span>Features</span>
          <textarea rows="3" value={form.featuresText} onChange={(event) => onFormChange('featuresText', event.target.value)} placeholder="RFID access, hidden installation, low battery alert" />
        </label>
        <label className="span-2 checkbox-row">
          <input type="checkbox" checked={form.featured} onChange={(event) => onFormChange('featured', event.target.checked)} />
          <span>Featured on the home shelf</span>
        </label>
      </div>

      <div className="store-action-row">
        <button type="submit">{submitLabel}</button>
        {showCancel ? (
          <button type="button" className="secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function StorePanel({ user, token }) {
  const headers = React.useMemo(() => authHeaders(token), [token]);
  const [products, setProducts] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [minPrice, setMinPrice] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');
  const [sortMode, setSortMode] = React.useState('best-match');
  const [deliveryMode, setDeliveryMode] = React.useState('all');
  const [colorFilter, setColorFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [selectedProductId, setSelectedProductId] = React.useState(null);
  const [selectedColor, setSelectedColor] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [adminSection, setAdminSection] = React.useState('products');
  const [editingId, setEditingId] = React.useState('');
  const [productForm, setProductForm] = React.useState(createEmptyForm());
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [storeSettings, setStoreSettings] = React.useState(loadStoreSettings);
  const [categoryInput, setCategoryInput] = React.useState('');
  const [deliveryLabelInput, setDeliveryLabelInput] = React.useState('');
  const [deliveryDaysInput, setDeliveryDaysInput] = React.useState('3');
  const [colorNameInput, setColorNameInput] = React.useState('');
  const [colorValueInput, setColorValueInput] = React.useState('#b8c0cc');
  const [orderStatusDrafts, setOrderStatusDrafts] = React.useState({});

  const canManage = user?.role === 'SUPER_ADMIN';
  const canPurchase = user?.role === 'USER' || user?.role === 'SUB_ADMIN';

  React.useEffect(() => {
    let isMounted = true;

    apiRequest('/orders', { headers })
      .then((data) => {
        if (isMounted) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOrders([]);
        }
      });

    const paymentState = new URLSearchParams(window.location.search).get('payment');
    if (paymentState === 'success') {
      setNotice('Stripe test payment completed. Orders are being synced from the server.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentState === 'cancel') {
      setNotice('Stripe checkout was cancelled before payment was completed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      isMounted = false;
    };
  }, [headers]);

  React.useEffect(() => {
    let isMounted = true;

    apiRequest('/products', { headers })
      .then((data) => {
        if (isMounted) {
          setProducts(Array.isArray(data.products) ? data.products : []);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setProducts(INITIAL_PRODUCTS);
          setNotice(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [headers]);

  const categories = React.useMemo(() => {
    const counts = new Map();
    products.forEach((product) => {
      const key = product.category || 'Uncategorized';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  const colorOptions = React.useMemo(() => {
    const seen = new Map();
    products.forEach((product) => {
      (product.colors || []).forEach((color) => {
        if (!seen.has(color.name)) {
          seen.set(color.name, color.value);
        }
      });
    });

    return Array.from(seen.entries()).map(([name, value]) => ({ name, value }));
  }, [products]);

  const selectedProduct = React.useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  React.useEffect(() => {
    if (!selectedProduct) {
      setSelectedColor('');
      return;
    }

    const nextColor = selectedProduct.colors?.[0]?.name || '';
    setSelectedColor(nextColor);
  }, [selectedProduct]);

  React.useEffect(() => {
    if (!editingId) {
      setProductForm(createEmptyForm());
      return;
    }

    const currentProduct = products.find((product) => product.id === editingId);
    setProductForm(formFromProduct(currentProduct));
  }, [editingId, products]);

  React.useEffect(() => {
    if (selectedProductId && !selectedProduct) {
      setSelectedProductId(null);
    }
  }, [selectedProduct, selectedProductId]);

  React.useEffect(() => {
    window.localStorage.setItem(STORE_SETTINGS_STORAGE_KEY, JSON.stringify(storeSettings));
  }, [storeSettings]);

  const categoryOptions = React.useMemo(() => {
    const nextCategories = new Set(storeSettings.categories.filter(Boolean));
    if (productForm.category) {
      nextCategories.add(productForm.category);
    }
    return Array.from(nextCategories);
  }, [productForm.category, storeSettings.categories]);

  const deliveryMethodOptions = React.useMemo(() => {
    const nextMethods = storeSettings.deliveryMethods.filter(Boolean);
    if (productForm.deliveryLabel && !nextMethods.some((item) => item.label === productForm.deliveryLabel)) {
      return [...nextMethods, { label: productForm.deliveryLabel, days: toInteger(productForm.deliveryDays, 3) }];
    }
    return nextMethods;
  }, [productForm.deliveryDays, productForm.deliveryLabel, storeSettings.deliveryMethods]);

  const colorPalette = React.useMemo(() => storeSettings.colors.filter(Boolean), [storeSettings.colors]);

  const handleAddCategory = () => {
    const nextCategory = categoryInput.trim();
    if (!nextCategory) {
      setNotice('Category name is required.');
      return;
    }

    setStoreSettings((prev) =>
      prev.categories.includes(nextCategory)
        ? prev
        : { ...prev, categories: [...prev.categories, nextCategory] }
    );
    setCategoryInput('');
    setNotice(`Category "${nextCategory}" added.`);
  };

  const handleRemoveCategory = (name) => {
    setStoreSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((category) => category !== name)
    }));
    setNotice(`Category "${name}" removed.`);
  };

  const handleAddDeliveryMethod = () => {
    const label = deliveryLabelInput.trim();
    const days = Math.max(1, toInteger(deliveryDaysInput, 3));
    if (!label) {
      setNotice('Delivery label is required.');
      return;
    }

    setStoreSettings((prev) =>
      prev.deliveryMethods.some((method) => method.label === label)
        ? prev
        : { ...prev, deliveryMethods: [...prev.deliveryMethods, { label, days }] }
    );
    setDeliveryLabelInput('');
    setDeliveryDaysInput('3');
    setNotice(`Delivery method "${label}" added.`);
  };

  const handleRemoveDeliveryMethod = (label) => {
    setStoreSettings((prev) => ({
      ...prev,
      deliveryMethods: prev.deliveryMethods.filter((method) => method.label !== label)
    }));
    setNotice(`Delivery method "${label}" removed.`);
  };

  const handleAddPaletteColor = () => {
    const name = colorNameInput.trim();
    const value = colorValueInput.trim();
    if (!name || !value) {
      setNotice('Color name and value are required.');
      return;
    }

    setStoreSettings((prev) =>
      prev.colors.some((color) => color.name === name)
        ? prev
        : { ...prev, colors: [...prev.colors, { name, value }] }
    );
    setColorNameInput('');
    setColorValueInput('#b8c0cc');
    setNotice(`Color "${name}" added.`);
  };

  const handleRemovePaletteColor = (name) => {
    setStoreSettings((prev) => ({
      ...prev,
      colors: prev.colors.filter((color) => color.name !== name)
    }));
    setNotice(`Color "${name}" removed.`);
  };

  const handleSelectFormColor = (color) => {
    setProductForm((prev) => {
      if (prev.selectedColors.some((item) => item.name === color.name)) {
        return prev;
      }

      return { ...prev, selectedColors: [...prev.selectedColors, color] };
    });
  };

  const handleRemoveFormColor = (name) => {
    setProductForm((prev) => ({
      ...prev,
      selectedColors: prev.selectedColors.filter((color) => color.name !== name)
    }));
  };

  const visibleProducts = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const minValue = minPrice === '' ? null : Number(minPrice);
    const maxValue = maxPrice === '' ? null : Number(maxPrice);

    const filtered = products.filter((product) => {
      if (normalizedSearch) {
        const haystack = [product.name, product.category, product.description, ...(product.features || [])]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (categoryFilter !== 'all' && product.category !== categoryFilter) {
        return false;
      }

      if (colorFilter !== 'all') {
        const hasColor = (product.colors || []).some((color) => color.name === colorFilter);
        if (!hasColor) {
          return false;
        }
      }

      if (deliveryMode !== 'all') {
        if (deliveryMode === 'express' && product.deliveryDays > 3) {
          return false;
        }

        if (deliveryMode === 'standard' && product.deliveryDays <= 3) {
          return false;
        }
      }

      if (minValue !== null && Number(product.price) < minValue) {
        return false;
      }

      if (maxValue !== null && Number(product.price) > maxValue) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === 'price-low') {
        return left.price - right.price;
      }

      if (sortMode === 'price-high') {
        return right.price - left.price;
      }

      if (sortMode === 'delivery-fast') {
        const deliveryScore = left.deliveryDays - right.deliveryDays;
        return deliveryScore !== 0 ? deliveryScore : left.price - right.price;
      }

      if (sortMode === 'delivery-fee') {
        const feeScore = left.deliveryFee - right.deliveryFee;
        return feeScore !== 0 ? feeScore : left.price - right.price;
      }

      if (sortMode === 'rating') {
        return right.rating - left.rating;
      }

      const featureScore = Number(Boolean(right.featured)) - Number(Boolean(left.featured));
      if (featureScore !== 0) {
        return featureScore;
      }

      const deliveryScore = left.deliveryDays - right.deliveryDays;
      if (deliveryScore !== 0) {
        return deliveryScore;
      }

      return right.sold - left.sold;
    });
  }, [categoryFilter, colorFilter, deliveryMode, maxPrice, minPrice, products, searchTerm, sortMode]);

  const detailGallery = selectedProduct
    ? [
      selectedProduct.imageUrl || createArtwork(selectedProduct),
      createArtwork({ ...selectedProduct, artStyle: selectedProduct.artStyle }, 'thumb'),
      createArtwork({ ...selectedProduct, artStyle: 'safe' }, 'thumb')
    ]
    : [];

  const resetForm = () => {
    setEditingId('');
    setProductForm(createEmptyForm());
  };

  const handleFormChange = (key, value) => {
    setProductForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadToCloudinary = async (file) => {
    const cloudName = 'dsh0yj9rh';
    const apiKey = '797913589128223';
    const apiSecret = 'hVGEaqFO9-uvcdvxr1taSfyPlLY';

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'marketplace';

    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

    const msgBuffer = new TextEncoder().encode(stringToSign);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('timestamp', timestamp);
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Cloudinary upload failed');
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleProductImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setNotice('Please choose an image file.');
      return;
    }

    try {
      setUploadingImage(true);
      const secureUrl = await uploadToCloudinary(file);
      handleFormChange('imageUrl', secureUrl);
      setNotice('Product photo uploaded to Cloudinary successfully. Save changes to apply it.');
    } catch (error) {
      setNotice(error.message || 'Could not upload the selected image file to Cloudinary.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProductImage = () => {
    handleFormChange('imageUrl', '');
    setNotice('Product photo removed. Save changes to apply it.');
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();

    const nextProduct = {
      id: editingId || buildProductId(productForm.name),
      name: productForm.name.trim(),
      category: productForm.category.trim() || 'Uncategorized',
      price: toInteger(productForm.price, 0),
      compareAtPrice: toInteger(productForm.compareAtPrice, 0),
      deliveryDays: Math.max(1, toInteger(productForm.deliveryDays, 3)),
      deliveryFee: Math.max(0, toInteger(productForm.deliveryFee, 0)),
      deliveryLabel: productForm.deliveryLabel.trim() || 'Fast delivery',
      badge: productForm.badge.trim(),
      rating: Number.parseFloat(productForm.rating) || 4.7,
      reviews: Math.max(0, toInteger(productForm.reviews, 0)),
      sold: Math.max(0, toInteger(productForm.sold, 0)),
      stock: Math.max(0, toInteger(productForm.stock, 1)),
      description: productForm.description.trim(),
      imageUrl: productForm.imageUrl.trim(),
      features: parseFeatureList(productForm.featuresText),
      colors: productForm.selectedColors.length ? productForm.selectedColors : colorPalette.slice(0, 2),
      artStyle: productForm.artStyle,
      featured: Boolean(productForm.featured)
    };

    if (!nextProduct.name) {
      setNotice('Product name is required.');
      return;
    }

    try {
      const response = editingId
        ? await apiRequest(`/products/${editingId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(nextProduct)
        })
        : await apiRequest('/products', {
          method: 'POST',
          headers,
          body: JSON.stringify(nextProduct)
        });

      const savedProduct = response.product;
      setProducts((currentProducts) => {
        const exists = currentProducts.some((product) => product.id === savedProduct.id);

        if (exists) {
          return currentProducts.map((product) => (product.id === savedProduct.id ? savedProduct : product));
        }

        return [savedProduct, ...currentProducts];
      });

      setSelectedProductId(savedProduct.id);
      setEditingId(savedProduct.id);
      setAdminSection('products');
      setNotice(editingId ? 'Product updated.' : 'Product created.');
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product card?')) {
      return;
    }

    try {
      await apiRequest(`/products/${productId}`, {
        method: 'DELETE',
        headers
      });

      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
      setOrders((currentOrders) => currentOrders.filter((order) => order.productId !== productId));

      if (selectedProductId === productId) {
        setSelectedProductId(null);
      }

      if (editingId === productId) {
        resetForm();
      }

      setNotice('Product removed.');
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleEditProduct = (productId) => {
    setEditingId(productId);
    setSelectedProductId(productId);
    setAdminSection('edit-product');
    setNotice('Editing product details.');
  };

  const handleUpdateOrderStatus = async (orderId) => {
    const nextStatus = orderStatusDrafts[orderId] || 'PENDING';

    try {
      const response = await apiRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: nextStatus })
      });

      const updatedOrder = response.order;
      setOrders((currentOrders) => currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setNotice(`Order status updated to ${updatedOrder.status}.`);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleBuyProduct = (product) => {
    if (!canPurchase) {
      setNotice('This account can browse products but cannot place orders.');
      return;
    }

    const chosenColor = selectedColor || product.colors?.[0]?.name || 'Default';

    apiRequest('/payments/checkout-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productId: product.id,
        selectedColor: chosenColor,
        quantity: 1
      })
    })
      .then((response) => {
        if (response.order) {
          setOrders((currentOrders) => [response.order, ...currentOrders]);
        }

        if (!response.checkoutUrl) {
          throw new Error('Stripe checkout session was created without a redirect URL.');
        }

        setNotice(`Redirecting to Stripe test checkout for ${product.name}...`);
        window.location.assign(response.checkoutUrl);
      })
      .catch((error) => {
        setNotice(error.message);
      });
  };

  const productOptions = selectedProduct?.colors || [];

  const pendingOrders = orders.filter((order) => order.status === 'PENDING');

  if (canManage) {
    return (
      <section className="panel store-shell store-admin-shell">
        <div className="store-hero">
          <div>
            <p className="store-kicker">Super admin store</p>
            <h2>Manage the catalog, product cards, and pending orders</h2>
            <p className="store-description">
              Use the navigation bar to edit store settings, current products, add a new card, edit a selected card, or review pending orders.
            </p>
          </div>

          <div className="store-stats">
            <span>{products.length} products</span>
            <span>{pendingOrders.length} pending orders</span>
            <span>{storeSettings.categories.length} categories</span>
          </div>
        </div>

        {notice ? <AlertMessage type="success" text={notice} onClose={() => setNotice('')} /> : null}

        <div className="store-admin-nav">
          {[
            { id: 'settings', label: 'Store settings' },
            { id: 'products', label: 'Current products' },
            { id: 'add-product', label: 'Add product' },
            { id: 'edit-product', label: 'Edit product' },
            { id: 'orders', label: 'Pending orders' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={adminSection === item.id ? 'filter-pill active' : 'filter-pill'}
              onClick={() => {
                if (item.id === 'edit-product' && !editingId) {
                  setNotice('Choose a product to edit first.');
                  setAdminSection('products');
                  return;
                }

                if (item.id === 'add-product') {
                  resetForm();
                }

                if (item.id === 'products' && editingId) {
                  setEditingId('');
                }

                setAdminSection(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {adminSection === 'settings' ? (
          <div className="store-admin-grid">
            <section className="mini-card admin-card">
              <div className="section-heading">
                <h3>Categories</h3>
                <p>Add or remove category options for the product editor.</p>
              </div>
              <div className="admin-inline-form">
                <input value={categoryInput} onChange={(event) => setCategoryInput(event.target.value)} placeholder="New category" />
                <button type="button" onClick={handleAddCategory}>
                  Add
                </button>
              </div>
              <div className="admin-chip-grid">
                {storeSettings.categories.map((category) => (
                  <button type="button" key={category} className="filter-pill" onClick={() => handleRemoveCategory(category)}>
                    <span>{category}</span>
                    <strong>Remove</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className="mini-card admin-card">
              <div className="section-heading">
                <h3>Delivery methods</h3>
                <p>Manage the labels that appear in the product form.</p>
              </div>
              <div className="admin-inline-form admin-inline-form-delivery">
                <input value={deliveryLabelInput} onChange={(event) => setDeliveryLabelInput(event.target.value)} placeholder="Delivery label" />
                <input type="number" min="1" value={deliveryDaysInput} onChange={(event) => setDeliveryDaysInput(event.target.value)} placeholder="Days" />
                <button type="button" onClick={handleAddDeliveryMethod}>
                  Add
                </button>
              </div>
              <div className="admin-chip-grid">
                {storeSettings.deliveryMethods.map((method) => (
                  <button type="button" key={method.label} className="filter-pill" onClick={() => handleRemoveDeliveryMethod(method.label)}>
                    <span>{method.label}</span>
                    <strong>{method.days}d</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className="mini-card admin-card">
              <div className="section-heading">
                <h3>Color palette</h3>
                <p>Add palette colors and remove them with one tap.</p>
              </div>
              <div className="admin-inline-form admin-inline-form-colors">
                <input value={colorNameInput} onChange={(event) => setColorNameInput(event.target.value)} placeholder="Color name" />
                <input type="color" value={colorValueInput} onChange={(event) => setColorValueInput(event.target.value)} />
                <button type="button" onClick={handleAddPaletteColor}>
                  Add
                </button>
              </div>
              <div className="admin-chip-grid">
                {storeSettings.colors.map((color) => (
                  <button type="button" key={color.name} className="filter-pill" onClick={() => handleRemovePaletteColor(color.name)}>
                    <span className="color-dot" style={{ backgroundColor: color.value }} />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {adminSection === 'products' ? (
          <div className="store-admin-products">
            <div className="store-toolbar">
              <div className="search-box">
                <label htmlFor="store-search">Search</label>
                <input
                  id="store-search"
                  placeholder="Search lockers, colors, features..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="toolbar-grid">
                <label>
                  <span>Min price</span>
                  <input type="number" min="0" placeholder="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
                </label>
                <label>
                  <span>Max price</span>
                  <input type="number" min="0" placeholder="99999" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
                </label>
                <label>
                  <span>Sort by</span>
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                    <option value="best-match">Best match</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="delivery-fast">Fastest delivery</option>
                    <option value="delivery-fee">Lowest delivery fee</option>
                    <option value="rating">Top rated</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="store-results-bar">
              <strong>{visibleProducts.length} products found</strong>
              <span>Search, price filters, delivery filters, and best match sorting work here only.</span>
            </div>

            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-art">
                    <img src={product.imageUrl || createArtwork(product)} alt={product.name} />
                    {product.badge ? <span className="product-badge">{product.badge}</span> : null}
                  </div>
                  <div className="product-card-copy">
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-meta-line">
                      <strong>{formatPrice(product.price)}</strong>
                      <span>{product.deliveryDays} days</span>
                    </div>
                    <div className="product-color-row">
                      {(product.colors || []).slice(0, 4).map((color) => (
                        <span key={color.name} title={color.name} className="product-color-dot" style={{ backgroundColor: color.value }} />
                      ))}
                    </div>
                    <div className="product-footer-line">
                      <span>{product.category}</span>
                      <span>{product.rating.toFixed(1)} rating</span>
                    </div>
                  </div>
                  <div className="product-card-actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="secondary" onClick={() => handleEditProduct(product.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDeleteProduct(product.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {adminSection === 'add-product' ? (
          <ProductFormPanel
            title="Add product card"
            copy="Create a new store card with the current settings, colors, and photo upload."
            submitLabel="Add product card"
            cancelLabel="Back to products"
            showCancel
            form={productForm}
            categoryOptions={categoryOptions}
            deliveryMethodOptions={deliveryMethodOptions}
            colorPalette={colorPalette}
            uploadingImage={uploadingImage}
            onFormChange={handleFormChange}
            onImageUpload={handleProductImageUpload}
            onRemoveImage={handleRemoveProductImage}
            onAddColor={handleSelectFormColor}
            onRemoveColor={handleRemoveFormColor}
            onSubmit={handleSaveProduct}
            onCancel={() => {
              resetForm();
              setAdminSection('products');
            }}
          />
        ) : null}

        {adminSection === 'edit-product' ? (
          editingId ? (
            <ProductFormPanel
              title="Edit product card"
              copy="Update the selected product and return to the current product cards after saving."
              submitLabel="Save changes"
              cancelLabel="Back to products"
              showCancel
              form={productForm}
              categoryOptions={categoryOptions}
              deliveryMethodOptions={deliveryMethodOptions}
              colorPalette={colorPalette}
              uploadingImage={uploadingImage}
              onFormChange={handleFormChange}
              onImageUpload={handleProductImageUpload}
              onRemoveImage={handleRemoveProductImage}
              onAddColor={handleSelectFormColor}
              onRemoveColor={handleRemoveFormColor}
              onSubmit={handleSaveProduct}
              onCancel={() => {
                resetForm();
                setAdminSection('products');
              }}
            />
          ) : (
            <div className="mini-card admin-card">
              <p className="muted-text">Select a product to open the editing panel.</p>
            </div>
          )
        ) : null}

        {adminSection === 'orders' ? (
          <section className="mini-card admin-card">
            <div className="section-heading">
              <h3>Pending orders</h3>
              <p>Review pending orders and change their status from this section.</p>
            </div>

            <div className="order-history-list">
              {pendingOrders.length ? (
                pendingOrders.map((order) => (
                  <article key={order.id} className="order-history-item">
                    <div>
                      <strong>{order.productName}</strong>
                      <p>
                        {order.selectedColor ? `${order.selectedColor} · ` : ''}
                        {order.quantity} item{order.quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="order-history-meta">
                      <select
                        value={orderStatusDrafts[order.id] || order.status}
                        onChange={(event) => setOrderStatusDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))}
                      >
                        {['PENDING', 'PAID', 'FAILED', 'CANCELLED'].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleUpdateOrderStatus(order.id)}>
                        Update status
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted-text">There are no pending orders right now.</p>
              )}
            </div>
          </section>
        ) : null}
      </section>
    );
  }

  if (selectedProduct) {
    return (
      <section className="panel store-shell store-detail-shell">
        <div className="store-detail-topbar">
          <button type="button" className="secondary store-back-button" onClick={() => setSelectedProductId(null)}>
            Back to products
          </button>
          <div className="store-detail-status">
            <span className="tag-chip">{selectedProduct.deliveryLabel}</span>
            <span className="tag-chip">{selectedProduct.category}</span>
            {selectedProduct.badge ? <span className="tag-chip highlight">{selectedProduct.badge}</span> : null}
          </div>
        </div>

        <div className="store-detail-grid">
          <div className="store-gallery panel-soft">
            <div className="store-gallery-main">
              <img src={detailGallery[0]} alt={selectedProduct.name} />
            </div>
            <div className="store-gallery-strip">
              {detailGallery.map((asset, index) => (
                <button type="button" key={asset} className="store-gallery-thumb" onClick={() => setNotice(`Preview image ${index + 1} opened.`)}>
                  <img src={asset} alt={`${selectedProduct.name} preview ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="store-product-copy">
            <p className="store-kicker">Locker product details</p>
            <h2>{selectedProduct.name}</h2>
            <p className="store-description">{selectedProduct.description}</p>

            <div className="store-rating-line">
              <strong>{selectedProduct.rating.toFixed(1)}</strong>
              <span>{selectedProduct.reviews} ratings</span>
              <span>{selectedProduct.sold} sold</span>
            </div>

            <div className="price-stack">
              <strong>{formatPrice(selectedProduct.price)}</strong>
              <span>
                {selectedProduct.compareAtPrice ? `${formatPrice(selectedProduct.compareAtPrice)} ` : ''}
                {selectedProduct.compareAtPrice
                  ? `-${Math.round(((selectedProduct.compareAtPrice - selectedProduct.price) / selectedProduct.compareAtPrice) * 100)}%`
                  : ''}
              </span>
            </div>

            <div className="store-info-grid">
              <div>
                <span className="field-label">Delivery</span>
                <strong>{selectedProduct.deliveryDays} days</strong>
              </div>
              <div>
                <span className="field-label">Fee</span>
                <strong>{selectedProduct.deliveryFee ? formatPrice(selectedProduct.deliveryFee) : 'Free'}</strong>
              </div>
              <div>
                <span className="field-label">Stock</span>
                <strong>{selectedProduct.stock} left</strong>
              </div>
            </div>

            <div className="color-selection">
              <span className="field-label">Color</span>
              <div className="color-chip-row">
                {productOptions.map((color) => (
                  <button
                    type="button"
                    key={color.name}
                    className={selectedColor === color.name ? 'color-chip active' : 'color-chip'}
                    onClick={() => setSelectedColor(color.name)}
                  >
                    <span style={{ backgroundColor: color.value }} />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>

            <ul className="feature-list">
              {selectedProduct.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <div className="store-action-row">
              {canPurchase ? (
                <>
                  <button type="button" onClick={() => handleBuyProduct(selectedProduct)}>
                    Buy Now
                  </button>
                  <button type="button" className="secondary" onClick={() => handleBuyProduct(selectedProduct)}>
                    Add to Cart
                  </button>
                </>
              ) : (
                <p className="muted-text">Management account. Product browsing is visible, but checkout is disabled.</p>
              )}
            </div>

            {canManage ? (
              <div className="store-management-actions">
                <button type="button" className="secondary" onClick={() => handleEditProduct(selectedProduct.id)}>
                  Edit product
                </button>
                <button type="button" className="danger" onClick={() => handleDeleteProduct(selectedProduct.id)}>
                  Delete product
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel store-shell">
      <div className="store-hero">
        <div>
          <p className="store-kicker">Locker marketplace</p>
          <h2>Search, compare, and order different locker products</h2>
          <p className="store-description">
            Browse product cards in a store layout, filter by price, delivery speed and color, then open each product for a details view.
          </p>
        </div>

        <div className="store-stats">
          <span>{products.length} products</span>
          <span>{orders.length} orders</span>
          <span>{canManage ? 'Admin editing enabled' : 'Buyer mode enabled'}</span>
        </div>
      </div>

      {notice ? <AlertMessage type="success" text={notice} onClose={() => setNotice('')} /> : null}

      <div className="store-layout">
        <aside className="store-sidebar panel-soft">
          <div className="section-heading">
            <h3>Categories</h3>
            <p>Use category and color filters like a marketplace.</p>
          </div>

          <button type="button" className={categoryFilter === 'all' ? 'filter-pill active' : 'filter-pill'} onClick={() => setCategoryFilter('all')}>
            All categories
          </button>
          {categories.map((category) => (
            <button
              type="button"
              className={categoryFilter === category.name ? 'filter-pill active' : 'filter-pill'}
              key={category.name}
              onClick={() => setCategoryFilter(category.name)}
            >
              <span>{category.name}</span>
              <strong>{category.count}</strong>
            </button>
          ))}

          <div className="sidebar-section">
            <h4>Delivery</h4>
            <div className="filter-stack">
              {[
                { value: 'all', label: 'Any speed' },
                { value: 'express', label: 'Express only' },
                { value: 'standard', label: 'Standard only' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={deliveryMode === item.value ? 'filter-chip active' : 'filter-chip'}
                  onClick={() => setDeliveryMode(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Color</h4>
            <div className="filter-stack">
              <button type="button" className={colorFilter === 'all' ? 'filter-chip active' : 'filter-chip'} onClick={() => setColorFilter('all')}>
                Any color
              </button>
              {colorOptions.map((color) => (
                <button
                  type="button"
                  key={color.name}
                  className={colorFilter === color.name ? 'filter-chip active' : 'filter-chip'}
                  onClick={() => setColorFilter(color.name)}
                >
                  <span className="color-dot" style={{ backgroundColor: color.value }} />
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="store-main">
          <div className="store-toolbar">
            <div className="search-box">
              <label htmlFor="store-search">Search</label>
              <input
                id="store-search"
                placeholder="Search lockers, colors, features..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="toolbar-grid">
              <label>
                <span>Min price</span>
                <input type="number" min="0" placeholder="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
              </label>
              <label>
                <span>Max price</span>
                <input type="number" min="0" placeholder="99999" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
              </label>
              <label>
                <span>Sort by</span>
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                  <option value="best-match">Best match</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="delivery-fast">Fastest delivery</option>
                  <option value="delivery-fee">Lowest delivery fee</option>
                  <option value="rating">Top rated</option>
                </select>
              </label>
            </div>
          </div>

          {canManage ? (
            <form className="product-editor panel-soft" onSubmit={handleSaveProduct}>
              <div className="section-heading">
                <h3>{editingId ? 'Edit product card' : 'Create new product card'}</h3>
                <p>Super admin can add, update, and remove all store cards.</p>
              </div>

              <div className="product-form-grid">
                <label>
                  <span>Name</span>
                  <input value={productForm.name} onChange={(event) => handleFormChange('name', event.target.value)} placeholder="Locker product name" required />
                </label>
                <label>
                  <span>Category</span>
                  <input value={productForm.category} onChange={(event) => handleFormChange('category', event.target.value)} placeholder="Hidden Locks" required />
                </label>
                <label>
                  <span>Price</span>
                  <input type="number" min="0" value={productForm.price} onChange={(event) => handleFormChange('price', event.target.value)} required />
                </label>
                <label>
                  <span>Compare at price</span>
                  <input type="number" min="0" value={productForm.compareAtPrice} onChange={(event) => handleFormChange('compareAtPrice', event.target.value)} />
                </label>
                <label>
                  <span>Delivery days</span>
                  <input type="number" min="1" value={productForm.deliveryDays} onChange={(event) => handleFormChange('deliveryDays', event.target.value)} required />
                </label>
                <label>
                  <span>Delivery fee</span>
                  <input type="number" min="0" value={productForm.deliveryFee} onChange={(event) => handleFormChange('deliveryFee', event.target.value)} />
                </label>
                <label>
                  <span>Delivery label</span>
                  <input value={productForm.deliveryLabel} onChange={(event) => handleFormChange('deliveryLabel', event.target.value)} placeholder="Fast delivery" />
                </label>
                <label>
                  <span>Badge</span>
                  <input value={productForm.badge} onChange={(event) => handleFormChange('badge', event.target.value)} placeholder="Bestseller" />
                </label>
                <label>
                  <span>Rating</span>
                  <input value={productForm.rating} onChange={(event) => handleFormChange('rating', event.target.value)} />
                </label>
                <label>
                  <span>Reviews</span>
                  <input type="number" min="0" value={productForm.reviews} onChange={(event) => handleFormChange('reviews', event.target.value)} />
                </label>
                <label>
                  <span>Sold</span>
                  <input type="number" min="0" value={productForm.sold} onChange={(event) => handleFormChange('sold', event.target.value)} />
                </label>
                <label>
                  <span>Stock</span>
                  <input type="number" min="0" value={productForm.stock} onChange={(event) => handleFormChange('stock', event.target.value)} />
                </label>
                <label>
                  <span>Artwork style</span>
                  <select value={productForm.artStyle} onChange={(event) => handleFormChange('artStyle', event.target.value)}>
                    <option value="rfid">RFID hidden lock</option>
                    <option value="book">Book safe</option>
                    <option value="safe">Portable safe</option>
                    <option value="drawer">Drawer lock</option>
                    <option value="wall">Wall locker</option>
                    <option value="coin">Coin locker</option>
                  </select>
                </label>
                <label className="span-2">
                  <span>Product photo</span>
                  <div className="background-preview product-image-preview" style={productForm.imageUrl ? { backgroundImage: `url("${productForm.imageUrl}")` } : undefined}>
                    {!productForm.imageUrl ? <span>No uploaded photo</span> : null}
                  </div>
                  <div className="store-action-row">
                    <label className="upload-button" aria-label="Upload product photo">
                      <span>{uploadingImage ? 'Loading image...' : 'Upload from device'}</span>
                      <input type="file" accept="image/*" onChange={handleProductImageUpload} disabled={uploadingImage} />
                    </label>
                    <button type="button" className="secondary" onClick={handleRemoveProductImage} disabled={!productForm.imageUrl}>
                      Remove photo
                    </button>
                  </div>
                </label>
                <label className="span-2">
                  <span>Description</span>
                  <textarea rows="4" value={productForm.description} onChange={(event) => handleFormChange('description', event.target.value)} />
                </label>
                <label className="span-2">
                  <span>Features</span>
                  <textarea rows="3" value={productForm.featuresText} onChange={(event) => handleFormChange('featuresText', event.target.value)} placeholder="RFID access, hidden installation, low battery alert" />
                </label>
                <label className="span-2">
                  <span>Colors</span>
                  <textarea rows="3" value={productForm.colorsText} onChange={(event) => handleFormChange('colorsText', event.target.value)} placeholder="Grey:#b8c0cc | Black:#1f2937" />
                </label>
                <label className="span-2 checkbox-row">
                  <input type="checkbox" checked={productForm.featured} onChange={(event) => handleFormChange('featured', event.target.checked)} />
                  <span>Featured on the home shelf</span>
                </label>
              </div>

              <div className="store-action-row">
                <button type="submit">{editingId ? 'Save changes' : 'Add product card'}</button>
                {editingId ? (
                  <button type="button" className="secondary" onClick={resetForm}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          <div className="store-results-bar">
            <strong>{visibleProducts.length} products found</strong>
            <span>Search, price filters, delivery filters and color selection all work together.</span>
          </div>

          <section className="order-history panel-soft">
            <div className="section-heading">
              <h3>Recent orders</h3>
              <p>Stripe-backed checkout sessions and payment status updates appear here.</p>
            </div>

            <div className="order-history-list">
              {orders.length ? (
                orders.slice(0, 4).map((order) => (
                  <article key={order.id} className="order-history-item">
                    <div>
                      <strong>{order.productName}</strong>
                      <p>
                        {order.selectedColor ? `${order.selectedColor} · ` : ''}
                        {order.quantity} item{order.quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="order-history-meta">
                      <span className={order.status === 'PAID' ? 'tag-chip highlight' : 'tag-chip'}>{order.status}</span>
                      <strong>{formatPrice(order.amount)}</strong>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted-text">No orders yet. Buy a product to create your first Stripe test checkout session.</p>
              )}
            </div>
          </section>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article
                key={product.id}
                className="product-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProductId(product.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedProductId(product.id);
                  }
                }}
              >
                <div className="product-art">
                  <img src={product.imageUrl || createArtwork(product)} alt={product.name} />
                  {product.badge ? <span className="product-badge">{product.badge}</span> : null}
                </div>
                <div className="product-card-copy">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-meta-line">
                    <strong>{formatPrice(product.price)}</strong>
                    <span>{product.deliveryDays} days</span>
                  </div>
                  <div className="product-color-row">
                    {(product.colors || []).slice(0, 4).map((color) => (
                      <span key={color.name} title={color.name} className="product-color-dot" style={{ backgroundColor: color.value }} />
                    ))}
                  </div>
                  <div className="product-footer-line">
                    <span>{product.category}</span>
                    <span>{product.rating.toFixed(1)} rating</span>
                  </div>
                </div>
                {canManage ? (
                  <div className="product-card-actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="secondary" onClick={() => handleEditProduct(product.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDeleteProduct(product.id)}>
                      Delete
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default StorePanel;