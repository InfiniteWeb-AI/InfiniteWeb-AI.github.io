// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  var store = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    key: function (index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    // Helper to ensure a key exists with a default JSON-serializable value
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables (arrays)
    ensureKey('categories', []);          // Category
    ensureKey('products', []);            // Product
    ensureKey('cart', []);                // Cart (array, we use first element)
    ensureKey('cart_items', []);          // CartItem
    ensureKey('wishlists', []);           // Wishlist
    ensureKey('wishlist_items', []);      // WishlistItem
    ensureKey('compare_lists', []);       // CompareList
    ensureKey('compare_items', []);       // CompareItem
    ensureKey('shipping_methods', []);    // ShippingMethod
    ensureKey('shipping_addresses', []);  // ShippingAddress
    ensureKey('payment_methods', []);     // PaymentMethod
    ensureKey('orders', []);              // Order
    ensureKey('order_items', []);         // OrderItem
    ensureKey('subscriptions', []);       // Subscription

    // Misc/support tables
    ensureKey('contact_forms', []);

    // CMS-like content; kept empty by default (no mocked content)
    ensureKey('about_content', {
      headline: '',
      body_html: '',
      certifications: [],
      quality_commitments: []
    });
    ensureKey('contact_info', {
      email: '',
      phone: '',
      business_hours: ''
    });
    ensureKey('help_content', { topics: [] });
    ensureKey('shipping_returns_info', {
      shipping_overview_html: '',
      methods: [],
      returns_policy_html: ''
    });
    ensureKey('privacy_policy', {
      last_updated: '',
      body_html: ''
    });
    ensureKey('terms_conditions', {
      last_updated: '',
      body_html: ''
    });

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  // -------------------- Core Private Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart = carts[0] || null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        shipping_cost: 0,
        total: 0,
        currency: 'USD',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart) return;
    const carts = this._getFromStorage('cart', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.line_total || 0), 0);
    cart.subtotal = subtotal;
    const shippingCost = typeof cart.shipping_cost === 'number' ? cart.shipping_cost : 0;
    cart.shipping_cost = shippingCost;
    cart.total = subtotal + shippingCost;
    cart.updated_at = this._now();

    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
      this._saveToStorage('cart', carts);
    }
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0] || null;

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'My Wishlist',
        items_count: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }

    return wishlist;
  }

  _getOrCreateCompareList() {
    let compareLists = this._getFromStorage('compare_lists', []);
    let compareList = compareLists[0] || null;

    if (!compareList) {
      compareList = {
        id: this._generateId('compare_list'),
        items_count: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      compareLists.push(compareList);
      this._saveToStorage('compare_lists', compareLists);
    }

    return compareList;
  }

  _getOrCreateOrderDraft() {
    let orders = this._getFromStorage('orders', []);
    let order = orders.find(o => o.status === 'in_progress') || null;

    if (!order) {
      order = {
        id: this._generateId('order'),
        order_number: 'ORD-' + this._getNextIdCounter(),
        status: 'in_progress',
        items: [],
        shipping_address_id: null,
        shipping_method_id: null,
        payment_method_id: null,
        subtotal: 0,
        shipping_cost: 0,
        total: 0,
        currency: 'USD',
        contains_subscription: false,
        created_at: this._now(),
        updated_at: this._now()
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    }

    return order;
  }

  _updateOrderTotalsFromCart(order, cart) {
    if (!order) return;
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const itemsForOrder = orderItems.filter(oi => oi.order_id === order.id);
    const subtotal = itemsForOrder.reduce((sum, oi) => sum + (oi.line_total || 0), 0);
    order.subtotal = subtotal;

    // Derive shipping cost from shipping method if set
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let shippingCost = order.shipping_cost || 0;
    if (order.shipping_method_id) {
      const method = shippingMethods.find(m => m.id === order.shipping_method_id);
      if (method) {
        shippingCost = typeof method.base_cost === 'number' ? method.base_cost : 0;
      }
    }
    order.shipping_cost = shippingCost;
    order.total = subtotal + shippingCost;
    order.currency = cart && cart.currency ? cart.currency : (order.currency || 'USD');
    order.contains_subscription = itemsForOrder.some(oi => oi.is_subscription);
    order.updated_at = this._now();

    const orderIndex = orders.findIndex(o => o.id === order.id);
    if (orderIndex >= 0) {
      orders[orderIndex] = order;
      this._saveToStorage('orders', orders);
    }
  }

  _validateSubscriptionInterval(product, interval_days) {
    if (!product || !Array.isArray(product.subscription_allowed_intervals)) {
      return null;
    }
    const allowed = product.subscription_allowed_intervals || [];
    if (allowed.includes(interval_days)) {
      return interval_days;
    }
    return null;
  }

  _selectBestValuePack(products) {
    if (!Array.isArray(products) || products.length === 0) {
      return null;
    }
    let best = null;
    let bestPricePerUnit = Infinity;

    products.forEach(p => {
      const price = typeof p.price === 'number' ? p.price : null;
      const packSize = typeof p.pack_size === 'number' && p.pack_size > 0 ? p.pack_size : null;
      if (price !== null && packSize !== null) {
        const perUnit = price / packSize;
        if (perUnit < bestPricePerUnit) {
          bestPricePerUnit = perUnit;
          best = p;
        }
      }
    });

    return best;
  }

  // -------------------- Navigation & Homepage Interfaces --------------------

  getNavigationCategories() {
    const categories = this._getFromStorage('categories', []);
    const active = categories.filter(c => c && c.is_active);
    active.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 9999;
      const bo = typeof b.display_order === 'number' ? b.display_order : 9999;
      if (ao !== bo) return ao - bo;
      const an = a.name || '';
      const bn = b.name || '';
      return an.localeCompare(bn);
    });
    return active;
  }

  getFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    if (!Array.isArray(products) || products.length === 0) {
      return { featured: [] };
    }

    // Heuristic: pick up to 10 top-rated active products
    const activeProducts = products.filter(p => p && p.status === 'active');
    activeProducts.sort((a, b) => {
      const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
      const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
      if (br !== ar) return br - ar;
      const ac = typeof a.review_count === 'number' ? a.review_count : 0;
      const bc = typeof b.review_count === 'number' ? b.review_count : 0;
      return bc - ac;
    });

    const top = activeProducts.slice(0, 10).map(p => {
      const category = categories.find(c => c.id === p.categoryId) || null;
      const categoryName = category && category.name ? category.name : 'Products';
      const highlightText = (typeof p.average_rating === 'number' && typeof p.review_count === 'number')
        ? 'Top rated in ' + categoryName + ' (' + p.average_rating.toFixed(1) + ' stars, ' + p.review_count + ' reviews)'
        : 'Featured in ' + categoryName;
      return {
        product: p,
        category: category,
        is_featured: true,
        highlight_text: highlightText
      };
    });

    return { featured: top };
  }

  getHomepageTaskShortcuts() {
    // Static configuration for guided flows (no persistence needed)
    return [
      {
        id: 'shortcut_sleep_bundle',
        title: 'Build a Sleep-Improvement Bundle',
        description: 'Combine melatonin, a sleep mask, and a white noise device under your budget.',
        icon_key: 'moon',
        target_page: 'category',
        target_parameters: {
          categoryId: 'sleep_relaxation',
          preset_query: 'sleep bundle'
        }
      },
      {
        id: 'shortcut_vitamin_subscription',
        title: 'Set Up a Monthly Multivitamin',
        description: 'Start a 30-day multivitamin subscription with 100+ tablets under $30.',
        icon_key: 'calendar',
        target_page: 'category',
        target_parameters: {
          categoryId: 'vitamins_supplements',
          preset_query: 'multivitamin'
        }
      },
      {
        id: 'shortcut_first_aid',
        title: 'Create a First-Aid Mini Kit',
        description: 'Bandages, antiseptic wipes, and a pain reliever on a budget.',
        icon_key: 'first_aid',
        target_page: 'category',
        target_parameters: {
          categoryId: 'first_aid',
          preset_query: 'first aid'
        }
      }
    ];
  }

  // -------------------- Product Search & Filters --------------------

  searchProducts(
    query,
    categoryId,
    subcategory,
    min_price,
    max_price,
    min_rating,
    only_free_shipping,
    dosage_strength_min,
    dosage_strength_max,
    dosage_strength_unit,
    min_quantity_per_package,
    dosage_form,
    bp_monitor_type,
    sustainability_labels,
    product_types,
    sort_by,
    page,
    page_size
  ) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);

    const q = (query || '').trim().toLowerCase();
    const pageIndex = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 24;

    let filtered = products.filter(p => p && p.status === 'active');

    if (categoryId) {
      filtered = filtered.filter(p => p.categoryId === categoryId);
    }

    if (subcategory) {
      filtered = filtered.filter(p => p.subcategory === subcategory);
    }

    if (q) {
      filtered = filtered.filter(p => {
        const parts = [p.name, p.description, p.brand];
        if (Array.isArray(p.tags)) {
          parts.push(p.tags.join(' '));
        }
        const combined = parts.filter(Boolean).join(' ').toString().toLowerCase();
        const terms = q.split(/\s+/).filter(Boolean);
        return terms.length === 0 || terms.every(term => combined.includes(term));
      });
    }

    if (typeof min_price === 'number') {
      filtered = filtered.filter(p => typeof p.price === 'number' && p.price >= min_price);
    }

    if (typeof max_price === 'number') {
      filtered = filtered.filter(p => typeof p.price === 'number' && p.price <= max_price);
    }

    if (typeof min_rating === 'number') {
      filtered = filtered.filter(p => typeof p.average_rating === 'number' && p.average_rating >= min_rating);
    }

    if (only_free_shipping) {
      filtered = filtered.filter(p => !!p.is_free_shipping);
    }

    if (typeof dosage_strength_min === 'number') {
      filtered = filtered.filter(p => typeof p.dosage_strength_value === 'number' && p.dosage_strength_value >= dosage_strength_min);
    }

    if (typeof dosage_strength_max === 'number') {
      filtered = filtered.filter(p => typeof p.dosage_strength_value === 'number' && p.dosage_strength_value <= dosage_strength_max);
    }

    if (dosage_strength_unit) {
      filtered = filtered.filter(p => !p.dosage_strength_unit || p.dosage_strength_unit === dosage_strength_unit);
    }

    if (typeof min_quantity_per_package === 'number') {
      filtered = filtered.filter(p => typeof p.quantity_per_package === 'number' && p.quantity_per_package >= min_quantity_per_package);
    }

    if (dosage_form) {
      filtered = filtered.filter(p => p.dosage_form === dosage_form);
    }

    if (bp_monitor_type) {
      filtered = filtered.filter(p => p.bp_monitor_type === bp_monitor_type);
    }

    if (Array.isArray(sustainability_labels) && sustainability_labels.length > 0) {
      filtered = filtered.filter(p => p.sustainability_label && sustainability_labels.includes(p.sustainability_label));
    }

    if (Array.isArray(product_types) && product_types.length > 0) {
      filtered = filtered.filter(p => p.product_type && product_types.includes(p.product_type));
    }

    // Sorting
    const sortKey = sort_by || '';
    if (sortKey === 'price_asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortKey === 'price_desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortKey === 'rating_desc') {
      filtered.sort((a, b) => {
        const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (br !== ar) return br - ar;
        const ac = typeof a.review_count === 'number' ? a.review_count : 0;
        const bc = typeof b.review_count === 'number' ? b.review_count : 0;
        return bc - ac;
      });
    } else if (sortKey === 'bestseller') {
      filtered.sort((a, b) => {
        const ac = typeof a.review_count === 'number' ? a.review_count : 0;
        const bc = typeof b.review_count === 'number' ? b.review_count : 0;
        return bc - ac;
      });
    } else {
      // Default sort by name
      filtered.sort((a, b) => {
        const an = a.name || '';
        const bn = b.name || '';
        return an.localeCompare(bn);
      });
    }

    const totalResults = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / size));
    const start = (pageIndex - 1) * size;
    const pageItems = filtered.slice(start, start + size);

    const wishlistProductIds = wishlistItems
      .filter(wi => wi.wishlist_id === wishlist.id)
      .map(wi => wi.product_id);
    const compareProductIds = compareItems
      .filter(ci => ci.compare_list_id === compareList.id)
      .map(ci => ci.product_id);

    const results = pageItems.map(p => {
      const category = categories.find(c => c.id === p.categoryId) || null;
      const isInWishlist = wishlistProductIds.includes(p.id);
      const isInCompare = compareProductIds.includes(p.id);
      return {
        product: p,
        category: category,
        is_in_wishlist: isInWishlist,
        is_in_compare: isInCompare
      };
    });

    return {
      products: results,
      total_results: totalResults,
      page: pageIndex,
      page_size: size,
      total_pages: totalPages,
      applied_filters: {
        categoryId: categoryId || null,
        subcategory: subcategory || null,
        min_price: typeof min_price === 'number' ? min_price : null,
        max_price: typeof max_price === 'number' ? max_price : null,
        min_rating: typeof min_rating === 'number' ? min_rating : null,
        only_free_shipping: !!only_free_shipping,
        dosage_strength_min: typeof dosage_strength_min === 'number' ? dosage_strength_min : null,
        dosage_strength_max: typeof dosage_strength_max === 'number' ? dosage_strength_max : null,
        dosage_strength_unit: dosage_strength_unit || null,
        min_quantity_per_package: typeof min_quantity_per_package === 'number' ? min_quantity_per_package : null,
        dosage_form: dosage_form || null,
        bp_monitor_type: bp_monitor_type || null,
        sustainability_labels: Array.isArray(sustainability_labels) ? sustainability_labels : [],
        product_types: Array.isArray(product_types) ? product_types : [],
        sort_by: sortKey || null
      }
    };
  }

  getFilterOptions(categoryId, subcategory, query) {
    const products = this._getFromStorage('products', []);

    let subset = products.filter(p => p && p.status === 'active');

    if (categoryId) {
      subset = subset.filter(p => p.categoryId === categoryId);
    }
    if (subcategory) {
      subset = subset.filter(p => p.subcategory === subcategory);
    }
    const q = (query || '').trim().toLowerCase();
    if (q) {
      subset = subset.filter(p => {
        const parts = [p.name, p.description, p.brand];
        if (Array.isArray(p.tags)) {
          parts.push(p.tags.join(' '));
        }
        return parts.some(part => (part || '').toString().toLowerCase().includes(q));
      });
    }

    const prices = subset.map(p => typeof p.price === 'number' ? p.price : null).filter(v => v !== null);
    const minAvailable = prices.length ? Math.min.apply(null, prices) : 0;
    const maxAvailable = prices.length ? Math.max.apply(null, prices) : 0;

    const ratingBuckets = [
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 2, label: '2 stars & up' }
    ];

    const shippingOptions = [
      {
        key: 'free_shipping',
        label: 'Free Shipping',
        is_free_shipping: true
      }
    ];

    const strengthValuesSet = new Set();
    const strengthUnitsSet = new Set();
    const formsSet = new Set();
    const bpTypesSet = new Set();
    const sustainabilitySet = new Set();
    const productTypesSet = new Set();

    subset.forEach(p => {
      if (typeof p.dosage_strength_value === 'number') {
        strengthValuesSet.add(p.dosage_strength_value);
      }
      if (p.dosage_strength_unit) {
        strengthUnitsSet.add(p.dosage_strength_unit);
      }
      if (p.dosage_form) {
        formsSet.add(p.dosage_form);
      }
      if (p.bp_monitor_type) {
        bpTypesSet.add(p.bp_monitor_type);
      }
      if (p.sustainability_label && p.sustainability_label !== 'none') {
        sustainabilitySet.add(p.sustainability_label);
      }
      if (p.product_type) {
        productTypesSet.add(p.product_type);
      }
    });

    const sortOptions = [
      { key: 'price_asc', label: 'Price: Low to High' },
      { key: 'price_desc', label: 'Price: High to Low' },
      { key: 'rating_desc', label: 'Customer Rating' },
      { key: 'bestseller', label: 'Best Sellers' }
    ];

    return {
      price: {
        min_available: minAvailable,
        max_available: maxAvailable,
        suggested_steps: [5, 10, 25, 50, 100]
      },
      rating_buckets: ratingBuckets,
      shipping_options: shippingOptions,
      dosage_strength_values: Array.from(strengthValuesSet).sort((a, b) => a - b),
      dosage_strength_units: Array.from(strengthUnitsSet),
      dosage_forms: Array.from(formsSet),
      bp_monitor_types: Array.from(bpTypesSet),
      sustainability_labels: Array.from(sustainabilitySet),
      product_types: Array.from(productTypesSet),
      sort_options: sortOptions
    };
  }

  getCategoryInfo(categoryId) {
    const categories = this._getFromStorage('categories', []);
    const category = categories.find(c => c.id === categoryId) || null;
    const breadcrumb = [];
    if (category) {
      breadcrumb.push({ label: category.name || '', categoryId: category.id });
    }
    return { category: category, breadcrumb: breadcrumb };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);

    const product = products.find(p => p.id === productId) || null;
    const category = product ? (categories.find(c => c.id === product.categoryId) || null) : null;

    const breadcrumbs = [];
    if (category) {
      breadcrumbs.push({ label: category.name || '', categoryId: category.id });
    }

    const isInWishlist = wishlistItems.some(wi => wi.wishlist_id === wishlist.id && wi.product_id === productId);
    const isInCompare = compareItems.some(ci => ci.compare_list_id === compareList.id && ci.product_id === productId);

    const isSubscriptionAvailable = !!(product && product.is_subscription_available);
    const allowedIntervals = product && Array.isArray(product.subscription_allowed_intervals)
      ? product.subscription_allowed_intervals
      : [];
    const defaultInterval = allowedIntervals.includes(30)
      ? 30
      : (allowedIntervals[0] || null);

    const shippingBadges = [];
    if (product && product.is_free_shipping) {
      shippingBadges.push('free_shipping');
    }

    const compatibilityText = product && Array.isArray(product.compatible_models) && product.compatible_models.length
      ? 'Compatible with: ' + product.compatible_models.join(', ')
      : '';

    const specs = {
      materials: '',
      dimensions: '',
      compatibility_text: compatibilityText,
      compatible_models: product && Array.isArray(product.compatible_models) ? product.compatible_models : []
    };

    return {
      product: product,
      category: category,
      breadcrumbs: breadcrumbs,
      is_in_wishlist: isInWishlist,
      is_in_compare: isInCompare,
      subscription_options: {
        is_available: isSubscriptionAvailable,
        allowed_intervals_days: allowedIntervals,
        default_interval_days: defaultInterval
      },
      shipping_badges: shippingBadges,
      specifications: specs
    };
  }

  // -------------------- Cart Interfaces --------------------

  addToCart(productId, quantity, is_subscription, subscription_interval_days) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const subFlag = !!is_subscription;

    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, cart: null, items: [], message: 'Product not found' };
    }

    let carts = this._getFromStorage('cart', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = this._getOrCreateCart();
      carts = this._getFromStorage('cart', []);
    }

    let cartItems = this._getFromStorage('cart_items', []);

    let subscriptionId = null;
    if (subFlag) {
      const normalizedInterval = this._validateSubscriptionInterval(product, subscription_interval_days);
      if (!normalizedInterval) {
        return { success: false, cart: cart, items: [], message: 'Subscription interval not allowed for this product' };
      }
      // Create a subscription record
      const subscription = {
        id: this._generateId('sub'),
        product_id: product.id,
        product_name_snapshot: product.name,
        quantity: qty,
        frequency: normalizedInterval === 30 ? 'every_30_days' : (normalizedInterval === 60 ? 'every_60_days' : 'every_90_days'),
        interval_days: normalizedInterval,
        status: 'active',
        start_date: this._now(),
        next_delivery_date: new Date(Date.now() + normalizedInterval * 24 * 60 * 60 * 1000).toISOString(),
        created_at: this._now(),
        updated_at: this._now()
      };
      const subs = this._getFromStorage('subscriptions', []);
      subs.push(subscription);
      this._saveToStorage('subscriptions', subs);
      subscriptionId = subscription.id;
    }

    // For one-time purchases, merge with existing line
    let existingItem = null;
    if (!subFlag) {
      existingItem = cartItems.find(
        ci => ci.cart_id === cart.id && ci.product_id === product.id && !ci.is_subscription
      ) || null;
    }

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.line_total = existingItem.unit_price * existingItem.quantity;
      existingItem.added_at = existingItem.added_at || this._now();
    } else {
      const unitPrice = typeof product.price === 'number' ? product.price : 0;
      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        unit_price: unitPrice,
        quantity: qty,
        line_total: unitPrice * qty,
        is_subscription: subFlag,
        subscription_id: subscriptionId,
        added_at: this._now()
      };
      cartItems.push(cartItem);
      cart.items = cart.items || [];
      cart.items.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);

    // Update cart record in storage
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
      this._saveToStorage('cart', carts);
    }

    this._recalculateCartTotals(cart);

    // Build items for return with resolved products
    const updatedCartItems = this._getFromStorage('cart_items', []).filter(ci => ci.cart_id === cart.id);
    const itemsWithProducts = updatedCartItems.map(ci => ({
      cart_item: ci,
      product: products.find(p => p.id === ci.product_id) || null
    }));

    return {
      success: true,
      cart: cart,
      items: itemsWithProducts,
      message: 'Added to cart'
    };
  }

  getCartSummary() {
    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || null;
    if (!cart) {
      return { cartId: null, items_count: 0, subtotal: 0, currency: 'USD' };
    }
    const cartItems = this._getFromStorage('cart_items', []).filter(ci => ci.cart_id === cart.id);
    const itemsCount = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
    this._recalculateCartTotals(cart);
    return {
      cartId: cart.id,
      items_count: itemsCount,
      subtotal: cart.subtotal || 0,
      currency: cart.currency || 'USD'
    };
  }

  getCartDetails() {
    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || null;
    if (!cart) {
      return { cart: null, items_detailed: [] };
    }

    this._recalculateCartTotals(cart);

    const cartItems = this._getFromStorage('cart_items', []).filter(ci => ci.cart_id === cart.id);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const itemsDetailed = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const category = product ? (categories.find(c => c.id === product.categoryId) || null) : null;
      return {
        cart_item: ci,
        product: product,
        category: category,
        is_free_shipping: product ? !!product.is_free_shipping : false,
        is_subscription: !!ci.is_subscription
      };
    });

    return { cart: cart, items_detailed: itemsDetailed };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      // Nothing changed
      const carts = this._getFromStorage('cart', []);
      const cart = carts[0] || null;
      const products = this._getFromStorage('products', []);
      const itemsDetailed = cartItems.map(ci => ({
        cart_item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));
      return { cart: cart, items_detailed: itemsDetailed };
    }

    const cartItem = cartItems[idx];
    const carts = this._getFromStorage('cart', []);
    const cart = carts.find(c => c.id === cartItem.cart_id) || null;

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(idx, 1);
      if (cart && Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
    } else {
      cartItem.quantity = quantity;
      cartItem.line_total = cartItem.unit_price * quantity;
      cartItems[idx] = cartItem;
    }

    this._saveToStorage('cart_items', cartItems);

    if (cart) {
      const cartIndex = carts.findIndex(c => c.id === cart.id);
      if (cartIndex >= 0) {
        carts[cartIndex] = cart;
        this._saveToStorage('cart', carts);
      }
      this._recalculateCartTotals(cart);
    }

    const products = this._getFromStorage('products', []);
    const updatedItemsDetailed = cartItems
      .filter(ci => !cart || ci.cart_id === cart.id)
      .map(ci => ({
        cart_item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    return { cart: cart || null, items_detailed: updatedItemsDetailed };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    const carts = this._getFromStorage('cart', []);
    let cart = null;

    if (idx !== -1) {
      const cartItem = cartItems[idx];
      cart = carts.find(c => c.id === cartItem.cart_id) || null;
      cartItems.splice(idx, 1);
      if (cart && Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
      this._saveToStorage('cart_items', cartItems);
      if (cart) {
        const cartIndex = carts.findIndex(c => c.id === cart.id);
        if (cartIndex >= 0) {
          carts[cartIndex] = cart;
          this._saveToStorage('cart', carts);
        }
        this._recalculateCartTotals(cart);
      }
    } else {
      cart = carts[0] || null;
    }

    const products = this._getFromStorage('products', []);
    const updatedItemsDetailed = cartItems
      .filter(ci => !cart || ci.cart_id === cart.id)
      .map(ci => ({
        cart_item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    return { cart: cart || null, items_detailed: updatedItemsDetailed };
  }

  // -------------------- Checkout & Orders --------------------

  startCheckout() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(ci => ci.cart_id === cart.id);
    const products = this._getFromStorage('products', []);

    const order = this._getOrCreateOrderDraft();
    let orderItems = this._getFromStorage('order_items', []);

    // Remove existing items for this order to reflect current cart
    orderItems = orderItems.filter(oi => oi.order_id !== order.id);

    cartItems.forEach(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const orderItem = {
        id: this._generateId('order_item'),
        order_id: order.id,
        product_id: ci.product_id,
        product_name_snapshot: ci.product_name_snapshot || (product ? product.name : ''),
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        is_subscription: !!ci.is_subscription
      };
      orderItems.push(orderItem);
    });

    this._saveToStorage('order_items', orderItems);

    // Update order items list of IDs
    order.items = orderItems.filter(oi => oi.order_id === order.id).map(oi => oi.id);

    this._updateOrderTotalsFromCart(order, cart);

    const itemsForReturn = orderItems
      .filter(oi => oi.order_id === order.id)
      .map(oi => ({
        ...oi,
        product: products.find(p => p.id === oi.product_id) || null
      }));

    return {
      order: order,
      items: itemsForReturn
    };
  }

  getShippingMethods() {
    const methods = this._getFromStorage('shipping_methods', []);
    return methods;
  }

  updateOrderShippingAddress(address) {
    const order = this._getOrCreateOrderDraft();
    let addresses = this._getFromStorage('shipping_addresses', []);

    const shippingAddress = {
      id: this._generateId('ship_addr'),
      full_name: address.full_name || '',
      address_line1: address.address_line1 || '',
      address_line2: address.address_line2 || '',
      city: address.city || '',
      state_province: address.state_province || '',
      postal_code: address.postal_code || '',
      country: address.country || '',
      phone_number: address.phone_number || ''
    };

    addresses.push(shippingAddress);
    this._saveToStorage('shipping_addresses', addresses);

    let orders = this._getFromStorage('orders', []);
    order.shipping_address_id = shippingAddress.id;
    order.updated_at = this._now();
    const orderIndex = orders.findIndex(o => o.id === order.id);
    if (orderIndex >= 0) {
      orders[orderIndex] = order;
      this._saveToStorage('orders', orders);
    }

    return { order: order, shipping_address: shippingAddress };
  }

  updateOrderShippingMethod(shippingMethodId) {
    const order = this._getOrCreateOrderDraft();
    const methods = this._getFromStorage('shipping_methods', []);
    const method = methods.find(m => m.id === shippingMethodId) || null;

    let orders = this._getFromStorage('orders', []);
    if (method) {
      order.shipping_method_id = method.id;
    }
    order.updated_at = this._now();
    const orderIndex = orders.findIndex(o => o.id === order.id);
    if (orderIndex >= 0) {
      orders[orderIndex] = order;
      this._saveToStorage('orders', orders);
    }

    const cart = this._getOrCreateCart();
    this._updateOrderTotalsFromCart(order, cart);

    const actualMethod = methods.find(m => m.id === order.shipping_method_id) || null;
    return { order: order, shipping_method: actualMethod };
  }

  updateOrderPaymentMethod(payment) {
    const order = this._getOrCreateOrderDraft();
    let payments = this._getFromStorage('payment_methods', []);

    const paymentMethod = {
      id: this._generateId('payment'),
      type: payment.type || 'credit_card',
      cardholder_name: payment.cardholder_name || '',
      card_number: payment.card_number || '',
      card_brand: payment.card_brand || '',
      expiry_month: payment.expiry_month || null,
      expiry_year: payment.expiry_year || null,
      cvv: payment.cvv || '',
      billing_postal_code: payment.billing_postal_code || ''
    };

    payments.push(paymentMethod);
    this._saveToStorage('payment_methods', payments);

    let orders = this._getFromStorage('orders', []);
    order.payment_method_id = paymentMethod.id;
    order.updated_at = this._now();
    const orderIndex = orders.findIndex(o => o.id === order.id);
    if (orderIndex >= 0) {
      orders[orderIndex] = order;
      this._saveToStorage('orders', orders);
    }

    return { order: order, payment_method: paymentMethod };
  }

  getOrderReview() {
    const order = this._getOrCreateOrderDraft();
    const orderItems = this._getFromStorage('order_items', []);
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const products = this._getFromStorage('products', []);

    const items = orderItems
      .filter(oi => oi.order_id === order.id)
      .map(oi => ({
        ...oi,
        product: products.find(p => p.id === oi.product_id) || null
      }));

    const shippingAddress = order.shipping_address_id
      ? (shippingAddresses.find(a => a.id === order.shipping_address_id) || null)
      : null;
    const shippingMethod = order.shipping_method_id
      ? (shippingMethods.find(m => m.id === order.shipping_method_id) || null)
      : null;
    const paymentMethod = order.payment_method_id
      ? (paymentMethods.find(pm => pm.id === order.payment_method_id) || null)
      : null;

    return {
      order: order,
      items: items,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      payment_method: paymentMethod
    };
  }

  placeOrder() {
    const order = this._getOrCreateOrderDraft();
    const orderItems = this._getFromStorage('order_items', []);
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const products = this._getFromStorage('products', []);

    let orders = this._getFromStorage('orders', []);
    order.status = 'placed';
    order.updated_at = this._now();
    const orderIndex = orders.findIndex(o => o.id === order.id);
    if (orderIndex >= 0) {
      orders[orderIndex] = order;
      this._saveToStorage('orders', orders);
    }

    const items = orderItems
      .filter(oi => oi.order_id === order.id)
      .map(oi => ({
        ...oi,
        product: products.find(p => p.id === oi.product_id) || null
      }));

    const shippingAddress = order.shipping_address_id
      ? (shippingAddresses.find(a => a.id === order.shipping_address_id) || null)
      : null;
    const shippingMethod = order.shipping_method_id
      ? (shippingMethods.find(m => m.id === order.shipping_method_id) || null)
      : null;
    const paymentMethod = order.payment_method_id
      ? (paymentMethods.find(pm => pm.id === order.payment_method_id) || null)
      : null;

    // Optionally clear cart after placing order
    let carts = this._getFromStorage('cart', []);
    let cart = carts[0] || null;
    if (cart) {
      const allCartItems = this._getFromStorage('cart_items', []);
      const remainingCartItems = allCartItems.filter(ci => ci.cart_id !== cart.id);
      this._saveToStorage('cart_items', remainingCartItems);
      cart.items = [];
      cart.subtotal = 0;
      cart.shipping_cost = 0;
      cart.total = 0;
      cart.updated_at = this._now();
      carts[0] = cart;
      this._saveToStorage('cart', carts);
    }

    return {
      order: order,
      items: items,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      payment_method: paymentMethod,
      confirmation_message: 'Order placed successfully.'
    };
  }

  // -------------------- Wishlist Interfaces --------------------

  addProductToWishlist(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    if (!product) {
      return { wishlist: wishlist, items: [] };
    }

    const existing = wishlistItems.find(wi => wi.wishlist_id === wishlist.id && wi.product_id === productId);
    if (!existing) {
      const wishlistItem = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        price_snapshot: product.price,
        rating_snapshot: product.average_rating,
        added_at: this._now()
      };
      wishlistItems.push(wishlistItem);
      this._saveToStorage('wishlist_items', wishlistItems);

      // Update wishlist count
      let wishlists = this._getFromStorage('wishlists', []);
      wishlist.items_count = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;
      wishlist.updated_at = this._now();
      const wIndex = wishlists.findIndex(w => w.id === wishlist.id);
      if (wIndex >= 0) {
        wishlists[wIndex] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    const categories = this._getFromStorage('categories', []);
    const itemsForWishlist = wishlistItems
      .filter(wi => wi.wishlist_id === wishlist.id)
      .map(wi => ({
        wishlist_item: wi,
        product: products.find(p => p.id === wi.product_id) || null,
        category: (function () {
          const prod = products.find(p => p.id === wi.product_id) || null;
          return prod ? (categories.find(c => c.id === prod.categoryId) || null) : null;
        })()
      }));

    // Return shape per interface (items without category; category used only in getWishlist)
    const itemsSimple = itemsForWishlist.map(entry => ({
      wishlist_item: entry.wishlist_item,
      product: entry.product
    }));

    return {
      wishlist: wishlist,
      items: itemsSimple
    };
  }

  removeProductFromWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    wishlistItems = wishlistItems.filter(wi => !(wi.wishlist_id === wishlist.id && wi.product_id === productId));
    this._saveToStorage('wishlist_items', wishlistItems);

    let wishlists = this._getFromStorage('wishlists', []);
    wishlist.items_count = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;
    wishlist.updated_at = this._now();
    const wIndex = wishlists.findIndex(w => w.id === wishlist.id);
    if (wIndex >= 0) {
      wishlists[wIndex] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    const products = this._getFromStorage('products', []);
    const itemsSimple = wishlistItems
      .filter(wi => wi.wishlist_id === wishlist.id)
      .map(wi => ({
        wishlist_item: wi,
        product: products.find(p => p.id === wi.product_id) || null
      }));

    return {
      wishlist: wishlist,
      items: itemsSimple
    };
  }

  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const itemsDetailed = wishlistItems
      .filter(wi => wi.wishlist_id === wishlist.id)
      .map(wi => {
        const product = products.find(p => p.id === wi.product_id) || null;
        const category = product ? (categories.find(c => c.id === product.categoryId) || null) : null;
        return {
          wishlist_item: wi,
          product: product,
          category: category
        };
      });

    return {
      wishlist: wishlist,
      items_detailed: itemsDetailed
    };
  }

  moveWishlistProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const targetItem = wishlistItems.find(wi => wi.wishlist_id === wishlist.id && wi.product_id === productId) || null;
    if (targetItem) {
      // Add to cart
      this.addToCart(productId, qty, false, null);

      // Remove from wishlist
      wishlistItems = wishlistItems.filter(wi => !(wi.wishlist_id === wishlist.id && wi.product_id === productId));
      this._saveToStorage('wishlist_items', wishlistItems);

      let wishlists = this._getFromStorage('wishlists', []);
      wishlist.items_count = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;
      wishlist.updated_at = this._now();
      const wIndex = wishlists.findIndex(w => w.id === wishlist.id);
      if (wIndex >= 0) {
        wishlists[wIndex] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || null;
    const cartItems = this._getFromStorage('cart_items', []).filter(ci => cart && ci.cart_id === cart.id);

    const cartItemsDetailed = cartItems.map(ci => ({
      cart_item: ci,
      product: products.find(p => p.id === ci.product_id) || null
    }));

    const wishlistItemsDetailed = wishlistItems
      .filter(wi => wi.wishlist_id === wishlist.id)
      .map(wi => ({
        wishlist_item: wi,
        product: products.find(p => p.id === wi.product_id) || null,
        category: (function () {
          const prod = products.find(p => p.id === wi.product_id) || null;
          return prod ? (categories.find(c => c.id === prod.categoryId) || null) : null;
        })()
      }));

    const wishlistItemsSimple = wishlistItemsDetailed.map(entry => ({
      wishlist_item: entry.wishlist_item,
      product: entry.product
    }));

    return {
      cart: cart,
      cart_items: cartItemsDetailed,
      wishlist: wishlist,
      wishlist_items: wishlistItemsSimple
    };
  }

  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const count = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;
    return {
      wishlistId: wishlist.id,
      items_count: count
    };
  }

  // -------------------- Compare List Interfaces --------------------

  addProductToCompare(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);

    if (!product) {
      return { compare_list: compareList, items: [] };
    }

    const existing = compareItems.find(ci => ci.compare_list_id === compareList.id && ci.product_id === productId);
    if (!existing) {
      const compareItem = {
        id: this._generateId('compare_item'),
        compare_list_id: compareList.id,
        product_id: product.id,
        added_at: this._now()
      };
      compareItems.push(compareItem);
      this._saveToStorage('compare_items', compareItems);

      let compareLists = this._getFromStorage('compare_lists', []);
      compareList.items_count = compareItems.filter(ci => ci.compare_list_id === compareList.id).length;
      compareList.updated_at = this._now();
      const cIndex = compareLists.findIndex(c => c.id === compareList.id);
      if (cIndex >= 0) {
        compareLists[cIndex] = compareList;
        this._saveToStorage('compare_lists', compareLists);
      }
    }

    const itemsForList = compareItems
      .filter(ci => ci.compare_list_id === compareList.id)
      .map(ci => ({
        compare_item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    return {
      compare_list: compareList,
      items: itemsForList
    };
  }

  removeProductFromCompare(productId) {
    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);

    compareItems = compareItems.filter(ci => !(ci.compare_list_id === compareList.id && ci.product_id === productId));
    this._saveToStorage('compare_items', compareItems);

    let compareLists = this._getFromStorage('compare_lists', []);
    compareList.items_count = compareItems.filter(ci => ci.compare_list_id === compareList.id).length;
    compareList.updated_at = this._now();
    const cIndex = compareLists.findIndex(c => c.id === compareList.id);
    if (cIndex >= 0) {
      compareLists[cIndex] = compareList;
      this._saveToStorage('compare_lists', compareLists);
    }

    const products = this._getFromStorage('products', []);
    const itemsForList = compareItems
      .filter(ci => ci.compare_list_id === compareList.id)
      .map(ci => ({
        compare_item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    return {
      compare_list: compareList,
      items: itemsForList
    };
  }

  getCompareList() {
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const itemsDetailed = compareItems
      .filter(ci => ci.compare_list_id === compareList.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        const category = product ? (categories.find(c => c.id === product.categoryId) || null) : null;
        return {
          compare_item: ci,
          product: product,
          category: category
        };
      });

    return {
      compare_list: compareList,
      items_detailed: itemsDetailed
    };
  }

  getCompareSummary() {
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);
    const count = compareItems.filter(ci => ci.compare_list_id === compareList.id).length;
    return {
      compareListId: compareList.id,
      items_count: count
    };
  }

  // -------------------- Subscriptions --------------------

  startProductSubscription(productId, quantity, interval_days) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return { subscription: null, message: 'Product not found' };
    }

    if (!product.is_subscription_available) {
      return { subscription: null, message: 'Subscription not available for this product' };
    }

    const normalizedInterval = this._validateSubscriptionInterval(product, interval_days);
    if (!normalizedInterval) {
      return { subscription: null, message: 'Requested interval is not allowed for this product' };
    }

    const frequency = normalizedInterval === 30
      ? 'every_30_days'
      : (normalizedInterval === 60
        ? 'every_60_days'
        : 'every_90_days');

    const subscription = {
      id: this._generateId('sub'),
      product_id: product.id,
      product_name_snapshot: product.name,
      quantity: qty,
      frequency: frequency,
      interval_days: normalizedInterval,
      status: 'active',
      start_date: this._now(),
      next_delivery_date: new Date(Date.now() + normalizedInterval * 24 * 60 * 60 * 1000).toISOString(),
      created_at: this._now(),
      updated_at: this._now()
    };

    const subs = this._getFromStorage('subscriptions', []);
    subs.push(subscription);
    this._saveToStorage('subscriptions', subs);

    return {
      subscription: subscription,
      message: 'Subscription started successfully'
    };
  }

  // -------------------- Static Content & Contact --------------------

  getAboutContent() {
    return this._getFromStorage('about_content', {
      headline: '',
      body_html: '',
      certifications: [],
      quality_commitments: []
    });
  }

  getContactInfo() {
    return this._getFromStorage('contact_info', {
      email: '',
      phone: '',
      business_hours: ''
    });
  }

  submitContactForm(name, email, topic, message) {
    const forms = this._getFromStorage('contact_forms', []);
    const id = this._generateId('contact');
    const record = {
      id: id,
      name: name || '',
      email: email || '',
      topic: topic || '',
      message: message || '',
      created_at: this._now()
    };
    forms.push(record);
    this._saveToStorage('contact_forms', forms);

    return {
      success: true,
      reference_id: id,
      message: 'Your message has been received.'
    };
  }

  getHelpContent() {
    return this._getFromStorage('help_content', { topics: [] });
  }

  getShippingAndReturnsInfo() {
    const info = this._getFromStorage('shipping_returns_info', {
      shipping_overview_html: '',
      methods: [],
      returns_policy_html: ''
    });

    // Ensure methods are up-to-date with shipping_methods table
    const methods = this._getFromStorage('shipping_methods', []);
    info.methods = methods;
    return info;
  }

  getPrivacyPolicy() {
    return this._getFromStorage('privacy_policy', {
      last_updated: '',
      body_html: ''
    });
  }

  getTermsAndConditions() {
    return this._getFromStorage('terms_conditions', {
      last_updated: '',
      body_html: ''
    });
  }

  // -------------------- End of Class --------------------
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
