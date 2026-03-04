// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  let store = {};
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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Legacy keys from scaffold (kept but not used by core logic)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Core data tables from data models
    const keys = [
      'categories', // DeviceCategory
      'brands', // Brand
      'products', // Product (already ensured above, but harmless)
      'condition_questions',
      'quotes',
      'quote_payout_options',
      'payout_methods',
      'cart', // TradeInCart (single active cart for agent context)
      'cart_items',
      'checkout_sessions',
      'trade_in_orders',
      'order_items',
      'promo_codes',
      'shipping_methods',
      'shipping_labels',
      'partner_locations',
      'appointment_slots',
      'account_profiles',
      'payout_preferences',
      'contact_tickets'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Current logged-in account id (single-user agent context)
    if (!localStorage.getItem('current_account_profile_id')) {
      localStorage.setItem('current_account_profile_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  // ----------------------
  // Private helpers (business logic level)
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      const now = this._now();
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        order_level_payout_method_type: 'not_set',
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _getActiveCart() {
    const carts = this._getFromStorage('cart');
    return carts.find((c) => c.status === 'active') || null;
  }

  _updateCart(cart) {
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }
  }

  _getOrCreateCheckoutSession() {
    let cart = this._getActiveCart();
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    const sessions = this._getFromStorage('checkout_sessions');
    let checkoutSession = sessions.find((s) => s.cart_id === cart.id);
    if (!checkoutSession) {
      const now = this._now();
      checkoutSession = {
        id: this._generateId('chk'),
        cart_id: cart.id,
        created_at: now,
        updated_at: now,
        promo_code_entered: null,
        promo_code_id: null,
        payout_schedule_type: 'unspecified',
        shipping_option_type: 'none',
        partner_location_id: null,
        appointment_slot_id: null,
        shipping_method_id: null,
        shipping_label_id: null
      };
      sessions.push(checkoutSession);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return checkoutSession;
  }

  _getCheckoutSessionForCart(cartId) {
    const sessions = this._getFromStorage('checkout_sessions');
    return sessions.find((s) => s.cart_id === cartId) || null;
  }

  _saveCheckoutSession(session) {
    const sessions = this._getFromStorage('checkout_sessions');
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('checkout_sessions', sessions);
  }

  _calculateCartTotals(cart, checkoutSession = null) {
    if (!cart) {
      return {
        total_base_payout: 0,
        total_payout_after_promos: 0,
        promo_savings_amount: 0
      };
    }
    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((i) => i.cart_id === cart.id);
    const total_base_payout = items.reduce((sum, item) => {
      const amt = typeof item.quote_amount === 'number' ? item.quote_amount : 0;
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      return sum + amt * qty;
    }, 0);

    let promo_savings_amount = 0;
    let total_payout_after_promos = total_base_payout;

    if (!checkoutSession) {
      checkoutSession = this._getCheckoutSessionForCart(cart.id);
    }

    if (checkoutSession && checkoutSession.promo_code_id) {
      const promos = this._getFromStorage('promo_codes');
      const promo = promos.find((p) => p.id === checkoutSession.promo_code_id && p.is_active);
      if (promo) {
        // Check date validity
        const nowMs = Date.now();
        if (
          (!promo.start_date || new Date(promo.start_date).getTime() <= nowMs) &&
          (!promo.end_date || new Date(promo.end_date).getTime() >= nowMs)
        ) {
          // Optional min_order_total
          if (!promo.min_order_total || total_base_payout >= promo.min_order_total) {
            // Optional applicable_category_ids: ensure at least one item matches
            let applicable = true;
            if (promo.applicable_category_ids && promo.applicable_category_ids.length > 0) {
              const products = this._getFromStorage('products');
              const productById = {};
              products.forEach((p) => {
                productById[p.id] = p;
              });
              applicable = items.some((item) => {
                const prod = productById[item.product_id];
                return prod && promo.applicable_category_ids.includes(prod.category_id);
              });
            }
            if (applicable) {
              if (promo.discount_type === 'percentage') {
                promo_savings_amount = (total_base_payout * promo.discount_value) / 100;
              } else if (promo.discount_type === 'fixed_amount') {
                promo_savings_amount = promo.discount_value;
              }
            }
          }
        }
      }
    }

    if (promo_savings_amount < 0) promo_savings_amount = 0;
    total_payout_after_promos = total_base_payout + promo_savings_amount;

    return {
      total_base_payout,
      total_payout_after_promos,
      promo_savings_amount
    };
  }

  _getCurrentAccountProfile() {
    const id = localStorage.getItem('current_account_profile_id') || '';
    if (!id) return null;
    const profiles = this._getFromStorage('account_profiles');
    return profiles.find((p) => p.id === id) || null;
  }

  _lockQuote(quote, lockDurationDays) {
    const now = new Date();
    const expires = new Date(now.getTime() + lockDurationDays * 24 * 60 * 60 * 1000);
    quote.is_locked = true;
    quote.lock_duration_days = lockDurationDays;
    quote.lock_expires_at = expires.toISOString();
    quote.quote_status = 'locked';
    const quotes = this._getFromStorage('quotes');
    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx !== -1) {
      quotes[idx] = quote;
      this._saveToStorage('quotes', quotes);
    }
    return quote;
  }

  _parseStorageLabelToGb(label) {
    if (!label || typeof label !== 'string') return null;
    const upper = label.trim().toUpperCase();
    if (upper.endsWith('TB')) {
      const num = parseFloat(upper.replace('TB', ''));
      return isNaN(num) ? null : num * 1000;
    }
    if (upper.endsWith('GB')) {
      const num = parseFloat(upper.replace('GB', ''));
      return isNaN(num) ? null : num;
    }
    const num = parseFloat(upper);
    return isNaN(num) ? null : num;
  }

  _getDefaultPayoutMethodType() {
    const account = this._getCurrentAccountProfile();
    if (account) {
      const prefs = this._getFromStorage('payout_preferences');
      const pref = prefs.find((p) => p.account_profile_id === account.id);
      if (pref && pref.default_payout_method_type) {
        return pref.default_payout_method_type;
      }
    }
    const methods = this._getFromStorage('payout_methods').filter((m) => m.is_active);
    if (methods.length === 0) return 'bank_transfer';
    methods.sort((a, b) => {
      const pa = typeof a.default_priority === 'number' ? a.default_priority : 9999;
      const pb = typeof b.default_priority === 'number' ? b.default_priority : 9999;
      return pa - pb;
    });
    return methods[0].method_type;
  }

  _generatePayoutOptionsForQuote(quote) {
    const payoutMethods = this._getFromStorage('payout_methods').filter((m) => m.is_active);
    const quote_payout_options = this._getFromStorage('quote_payout_options');

    const options = [];
    let maxAmount = 0;

    payoutMethods.forEach((method) => {
      let amount = quote.base_amount;
      // Simple differentiation: store credit bonus, check/paypal slightly less
      if (method.method_type === 'store_credit') {
        amount = quote.base_amount * 1.05;
      } else if (method.method_type === 'paypal') {
        amount = quote.base_amount * 0.98;
      } else if (method.method_type === 'check') {
        amount = quote.base_amount * 0.97;
      } else {
        // bank_transfer or others: base
        amount = quote.base_amount;
      }
      amount = Math.round(amount * 100) / 100;
      if (amount > maxAmount) maxAmount = amount;
      const opt = {
        id: this._generateId('qpo'),
        quote_id: quote.id,
        payout_method_type: method.method_type,
        amount,
        is_highest: false
      };
      options.push(opt);
    });

    options.forEach((opt) => {
      if (opt.amount === maxAmount) {
        opt.is_highest = true;
      }
      quote_payout_options.push(opt);
    });

    this._saveToStorage('quote_payout_options', quote_payout_options);
    return options;
  }

  // ----------------------
  // Foreign key resolution helpers
  // ----------------------

  _resolveProduct(product) {
    if (!product) return null;
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const brand = brands.find((b) => b.id === product.brand_id) || null;
    const category = categories.find((c) => c.category_id === product.category_id) || null;
    return {
      ...product,
      brand,
      category
    };
  }

  _resolveQuote(quote) {
    if (!quote) return null;
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const product = products.find((p) => p.id === quote.product_id) || null;
    const category = categories.find((c) => c.category_id === quote.category_id) || null;
    return {
      ...quote,
      product: product ? this._resolveProduct(product) : null,
      category
    };
  }

  _resolveCartItem(item) {
    if (!item) return null;
    const products = this._getFromStorage('products');
    const quotes = this._getFromStorage('quotes');
    const product = products.find((p) => p.id === item.product_id) || null;
    const quote = quotes.find((q) => q.id === item.quote_id) || null;
    return {
      ...item,
      product: product ? this._resolveProduct(product) : null,
      quote: quote ? this._resolveQuote(quote) : null
    };
  }

  _resolveCheckoutSession(session) {
    if (!session) return null;
    const carts = this._getFromStorage('cart');
    const promos = this._getFromStorage('promo_codes');
    const partnerLocations = this._getFromStorage('partner_locations');
    const slots = this._getFromStorage('appointment_slots');
    const shippingMethods = this._getFromStorage('shipping_methods');
    const labels = this._getFromStorage('shipping_labels');

    const cart = carts.find((c) => c.id === session.cart_id) || null;
    const promo_code = promos.find((p) => p.id === session.promo_code_id) || null;
    const partner_location = partnerLocations.find((p) => p.id === session.partner_location_id) || null;
    const appointment_slot = slots.find((s) => s.id === session.appointment_slot_id) || null;
    const shipping_method = shippingMethods.find((m) => m.id === session.shipping_method_id) || null;
    let shipping_label = labels.find((l) => l.id === session.shipping_label_id) || null;
    if (shipping_label) {
      const method = shippingMethods.find((m) => m.id === shipping_label.shipping_method_id) || null;
      shipping_label = {
        ...shipping_label,
        shipping_method: method
      };
    }

    return {
      ...session,
      cart,
      promo_code,
      partner_location,
      appointment_slot,
      shipping_method,
      shipping_label
    };
  }

  _resolveOrder(order) {
    if (!order) return null;
    const carts = this._getFromStorage('cart');
    const sessions = this._getFromStorage('checkout_sessions');
    const partnerLocations = this._getFromStorage('partner_locations');
    const slots = this._getFromStorage('appointment_slots');
    const shippingMethods = this._getFromStorage('shipping_methods');
    const labels = this._getFromStorage('shipping_labels');

    const cart = carts.find((c) => c.id === order.cart_id) || null;
    const checkout_session = sessions.find((s) => s.id === order.checkout_session_id) || null;
    const partner_location = partnerLocations.find((p) => p.id === order.partner_location_id) || null;
    const appointment_slot = slots.find((s) => s.id === order.appointment_slot_id) || null;
    const shipping_method = shippingMethods.find((m) => m.id === order.shipping_method_id) || null;
    let shipping_label = labels.find((l) => l.id === order.shipping_label_id) || null;
    if (shipping_label) {
      const method = shippingMethods.find((m) => m.id === shipping_label.shipping_method_id) || null;
      shipping_label = {
        ...shipping_label,
        shipping_method: method
      };
    }

    return {
      ...order,
      cart,
      checkout_session: checkout_session ? this._resolveCheckoutSession(checkout_session) : null,
      partner_location,
      appointment_slot,
      shipping_method,
      shipping_label
    };
  }

  _resolveOrderItem(orderItem) {
    if (!orderItem) return null;
    const products = this._getFromStorage('products');
    const quotes = this._getFromStorage('quotes');
    const product = products.find((p) => p.id === orderItem.product_id) || null;
    const quote = quotes.find((q) => q.id === orderItem.quote_id) || null;
    return {
      ...orderItem,
      product: product ? this._resolveProduct(product) : null,
      quote: quote ? this._resolveQuote(quote) : null
    };
  }

  _resolveConditionQuestion(q) {
    if (!q) return null;
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products');
    const category = categories.find((c) => c.category_id === q.category_id) || null;
    const product = q.product_id ? products.find((p) => p.id === q.product_id) : null;
    return {
      ...q,
      category,
      product: product ? this._resolveProduct(product) : null
    };
  }

  // ----------------------
  // Legacy example method (delegates to quickAddProductToCartUsingDefaults)
  // ----------------------
  addToCart(userId, productId, quantity = 1) {
    const result = this.quickAddProductToCartUsingDefaults(productId, quantity);
    return {
      success: result.success,
      cartId: result.cart ? result.cart.id : null
    };
  }

  _findOrCreateCart(userId) {
    // userId is ignored in single-agent context
    return this._getOrCreateCart();
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageData
  getHomePageData() {
    const categories = this._getFromStorage('categories').filter((c) => c.is_active);
    const products = this._getFromStorage('products').filter((p) => p.is_active);

    // Featured products: top by listing_estimated_payout
    const featured = [...products]
      .sort((a, b) => (b.listing_estimated_payout || 0) - (a.listing_estimated_payout || 0))
      .slice(0, 5)
      .map((p) => this._resolveProduct(p));

    const promoCodes = this._getFromStorage('promo_codes').filter((p) => p.is_active);
    let hero_promo = null;
    if (promoCodes.length > 0) {
      const p = promoCodes[0];
      hero_promo = {
        title: p.description || `Promo ${p.code}`,
        subtitle: 'Boost your trade-in payout with this offer.',
        promo_code: p.code,
        description: p.description || '',
        is_active: p.is_active
      };
    }

    const key_benefits = [
      {
        title: 'Fast quotes',
        description: 'Get instant trade-in offers for your devices.',
        icon_key: 'bolt'
      },
      {
        title: 'Multiple payout options',
        description: 'Choose bank transfer, PayPal, check, or store credit.',
        icon_key: 'wallet'
      },
      {
        title: 'Safe & secure',
        description: 'We wipe your data and recycle responsibly.',
        icon_key: 'shield'
      }
    ];

    const cart = this._getActiveCart();
    let cart_summary = {
      has_active_cart: false,
      total_items: 0,
      total_estimated_payout: 0
    };
    if (cart) {
      const allItems = this._getFromStorage('cart_items');
      const items = allItems.filter((i) => i.cart_id === cart.id);
      const totals = this._calculateCartTotals(cart);
      const total_items = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
      cart_summary = {
        has_active_cart: items.length > 0,
        total_items,
        total_estimated_payout: totals.total_base_payout
      };
    }

    return {
      categories,
      featured_products: featured,
      hero_promo,
      key_benefits,
      cart_summary
    };
  }

  // globalSearchProducts
  globalSearchProducts(query, maxResults = 20) {
    const products = this._getFromStorage('products').filter((p) => p.is_active);
    if (!query || !query.trim()) {
      return products.slice(0, maxResults).map((p) => this._resolveProduct(p));
    }
    const q = query.toLowerCase();
    const filtered = products.filter((p) => {
      const fields = [p.name, p.model_name, p.model_number, p.sku];
      if (p.search_keywords && Array.isArray(p.search_keywords)) {
        fields.push(...p.search_keywords);
      }
      return fields.some((f) => f && String(f).toLowerCase().includes(q));
    });
    return filtered.slice(0, maxResults).map((p) => this._resolveProduct(p));
  }

  // getDeviceCategories
  getDeviceCategories() {
    return this._getFromStorage('categories').filter((c) => c.is_active);
  }

  // getAvailablePayoutMethods
  getAvailablePayoutMethods() {
    return this._getFromStorage('payout_methods').filter((m) => m.is_active);
  }

  // getCategoryFilterOptions
  getCategoryFilterOptions(categoryId) {
    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.category_id === categoryId) || null;

    const brands = this._getFromStorage('brands').filter((b) =>
      b.is_active && (!b.supported_categories || b.supported_categories.includes(categoryId))
    );

    const products = this._getFromStorage('products').filter((p) => p.is_active && p.category_id === categoryId);

    const ramSet = new Set();
    const screenSet = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.ram_options_gb)) {
        p.ram_options_gb.forEach((r) => ramSet.add(r));
      }
      if (Array.isArray(p.screen_size_options_in)) {
        p.screen_size_options_in.forEach((s) => screenSet.add(s));
      }
    });

    const ram_options_gb = Array.from(ramSet).sort((a, b) => a - b);
    const screen_size_options_in = Array.from(screenSet).sort((a, b) => a - b);

    const sort_options = [
      { value: 'payout_high_to_low', label: 'Payout: High to Low' },
      { value: 'payout_low_to_high', label: 'Payout: Low to High' },
      { value: 'name_a_to_z', label: 'Name: A to Z' }
    ];

    return {
      category: category
        ? {
            category_id: category.category_id,
            display_name: category.display_name,
            search_placeholder: category.search_placeholder || ''
          }
        : null,
      brand_filters: brands,
      ram_options_gb,
      screen_size_options_in,
      sort_options
    };
  }

  _sortProductsForListing(products, sortBy) {
    const arr = [...products];
    if (sortBy === 'payout_low_to_high') {
      arr.sort((a, b) => (a.listing_estimated_payout || 0) - (b.listing_estimated_payout || 0));
    } else if (sortBy === 'name_a_to_z') {
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // default payout_high_to_low
      arr.sort((a, b) => (b.listing_estimated_payout || 0) - (a.listing_estimated_payout || 0));
    }
    return arr;
  }

  // getCategoryListingData
  getCategoryListingData(categoryId, sortBy = 'payout_high_to_low', page = 1, pageSize = 20) {
    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.category_id === categoryId) || null;
    let products = this._getFromStorage('products').filter((p) => p.is_active && p.category_id === categoryId);
    const totalResults = products.length;
    products = this._sortProductsForListing(products, sortBy);
    const start = (page - 1) * pageSize;
    const pageProducts = products.slice(start, start + pageSize).map((p) => this._resolveProduct(p));
    return {
      category,
      products: pageProducts,
      page,
      pageSize,
      totalResults
    };
  }

  // searchCategoryProducts
  searchCategoryProducts(categoryId, query, filters = {}, sortBy = 'payout_high_to_low', page = 1, pageSize = 20) {
    let products = this._getFromStorage('products').filter((p) => p.is_active && p.category_id === categoryId);

    if (query && query.trim()) {
      const q = query.toLowerCase();
      products = products.filter((p) => {
        const fields = [p.name, p.model_name, p.model_number, p.sku];
        if (p.search_keywords && Array.isArray(p.search_keywords)) {
          fields.push(...p.search_keywords);
        }
        return fields.some((f) => f && String(f).toLowerCase().includes(q));
      });
    }

    if (filters.brandIds && Array.isArray(filters.brandIds) && filters.brandIds.length > 0) {
      products = products.filter((p) => filters.brandIds.includes(p.brand_id));
    }

    if (typeof filters.minRamGb === 'number' || typeof filters.maxRamGb === 'number') {
      products = products.filter((p) => {
        let rams = [];
        if (Array.isArray(p.ram_options_gb) && p.ram_options_gb.length > 0) {
          rams = p.ram_options_gb;
        } else if (typeof p.default_ram_gb === 'number') {
          rams = [p.default_ram_gb];
        }
        if (rams.length === 0) return false;
        const min = typeof filters.minRamGb === 'number' ? filters.minRamGb : -Infinity;
        const max = typeof filters.maxRamGb === 'number' ? filters.maxRamGb : Infinity;
        return rams.some((r) => r >= min && r <= max);
      });
    }

    if (typeof filters.minScreenSizeIn === 'number' || typeof filters.maxScreenSizeIn === 'number') {
      products = products.filter((p) => {
        let sizes = [];
        if (Array.isArray(p.screen_size_options_in) && p.screen_size_options_in.length > 0) {
          sizes = p.screen_size_options_in;
        } else if (typeof p.default_screen_size_in === 'number') {
          sizes = [p.default_screen_size_in];
        }
        if (sizes.length === 0) return false;
        const min = typeof filters.minScreenSizeIn === 'number' ? filters.minScreenSizeIn : -Infinity;
        const max = typeof filters.maxScreenSizeIn === 'number' ? filters.maxScreenSizeIn : Infinity;
        return sizes.some((s) => s >= min && s <= max);
      });
    }

    const totalResults = products.length;
    products = this._sortProductsForListing(products, sortBy);
    const start = (page - 1) * pageSize;
    const pageProducts = products.slice(start, start + pageSize).map((p) => this._resolveProduct(p));

    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.category_id === categoryId) || null;

    return {
      category,
      products: pageProducts,
      page,
      pageSize,
      totalResults
    };
  }

  // quickAddProductToCartUsingDefaults
  quickAddProductToCartUsingDefaults(productId, quantity = 1) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.is_active);
    if (!product) {
      return { success: false, cart: null, cartItem: null, message: 'Product not found or inactive.' };
    }

    // Determine default configuration
    let storage_capacity_label = null;
    if (Array.isArray(product.storage_options) && product.storage_options.length > 0) {
      storage_capacity_label = product.storage_options[0];
    }
    let storage_capacity_gb = null;
    if (product.default_storage_capacity_gb) {
      storage_capacity_gb = product.default_storage_capacity_gb;
    } else if (storage_capacity_label) {
      storage_capacity_gb = this._parseStorageLabelToGb(storage_capacity_label);
    }

    const configuration = {
      storage_capacity_label,
      storage_capacity_gb,
      carrier_option: product.supports_carrier_selection ? 'unlocked' : undefined,
      condition_grade: 'good',
      condition_detail_codes: []
    };

    const { quote } = this.calculateQuoteForConfiguration(productId, configuration);
    if (!quote) {
      return { success: false, cart: null, cartItem: null, message: 'Could not calculate quote.' };
    }

    const payoutMethodType = this._getDefaultPayoutMethodType();
    const result = this.addQuoteToCart(quote.id, payoutMethodType, quantity);
    return result;
  }

  // getProductDetailsForDisplay
  getProductDetailsForDisplay(productId) {
    const products = this._getFromStorage('products');
    const productRaw = products.find((p) => p.id === productId && p.is_active);
    if (!productRaw) {
      return {
        product: null,
        available_storage_options: [],
        available_carrier_options: [],
        default_configuration: null,
        supports_condition_questionnaire: false
      };
    }

    const product = this._resolveProduct(productRaw);

    const available_storage_options = Array.isArray(product.storage_options)
      ? product.storage_options
      : [];

    const available_carrier_options = product.supports_carrier_selection
      ? ['unlocked', 'att', 'verizon', 't_mobile', 'other']
      : [];

    let default_storage_label = null;
    if (available_storage_options.length > 0) {
      default_storage_label = available_storage_options[0];
    }

    const default_configuration = {
      storage_capacity_label: default_storage_label,
      carrier_option: product.supports_carrier_selection ? 'unlocked' : undefined,
      condition_grade: 'good'
    };

    return {
      product,
      available_storage_options,
      available_carrier_options,
      default_configuration,
      supports_condition_questionnaire: !!product.supports_condition_questionnaire
    };
  }

  // getProductConditionQuestions
  getProductConditionQuestions(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) return [];

    const allQuestions = this._getFromStorage('condition_questions');
    const questions = allQuestions.filter(
      (q) =>
        q.category_id === product.category_id &&
        (!q.product_id || q.product_id === productId)
    );

    questions.sort((a, b) => {
      const ia = typeof a.order_index === 'number' ? a.order_index : 0;
      const ib = typeof b.order_index === 'number' ? b.order_index : 0;
      return ia - ib;
    });

    return questions.map((q) => this._resolveConditionQuestion(q));
  }

  // calculateQuoteForConfiguration
  calculateQuoteForConfiguration(productId, configuration) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.is_active);
    if (!product) {
      return { quote: null, message: 'Product not found or inactive.' };
    }

    const storage_capacity_label = configuration.storage_capacity_label || null;
    let storage_capacity_gb = configuration.storage_capacity_gb || null;
    if (!storage_capacity_gb && storage_capacity_label) {
      storage_capacity_gb = this._parseStorageLabelToGb(storage_capacity_label);
    }

    const carrier_option = configuration.carrier_option || null;
    const condition_grade = configuration.condition_grade || 'good';
    const condition_detail_codes = configuration.condition_detail_codes || [];

    // Base amount from product listing_estimated_payout
    let base = typeof product.listing_estimated_payout === 'number' ? product.listing_estimated_payout : 0;

    // Adjust for storage capacity
    if (product.default_storage_capacity_gb && storage_capacity_gb) {
      const ratio = storage_capacity_gb / product.default_storage_capacity_gb;
      if (ratio > 0) {
        base = base * ratio;
      }
    }

    // Adjust for condition grade
    const gradeFactors = {
      like_new: 1.0,
      good: 0.8,
      fair: 0.6,
      poor: 0.4,
      broken: 0.2
    };
    const factor = gradeFactors[condition_grade] || 0.6;
    base = base * factor;

    // Adjust for detailed condition codes (penalize for damage)
    if (Array.isArray(condition_detail_codes)) {
      let damagePenaltyFactor = 1.0;
      condition_detail_codes.forEach((code) => {
        const lower = String(code).toLowerCase();
        if (lower.includes('damaged') || lower.includes('broken') || lower.includes('crack')) {
          damagePenaltyFactor -= 0.1;
        }
      });
      if (damagePenaltyFactor < 0.2) damagePenaltyFactor = 0.2;
      base = base * damagePenaltyFactor;
    }

    if (base < 0) base = 0;
    base = Math.round(base * 100) / 100;

    const now = this._now();
    const quote = {
      id: this._generateId('quote'),
      product_id: product.id,
      category_id: product.category_id,
      product_name: product.name,
      brand_name: product.brand_name,
      storage_capacity_label,
      storage_capacity_gb: storage_capacity_gb || null,
      carrier_option: carrier_option || null,
      condition_grade,
      condition_detail_codes,
      base_amount: base,
      quote_status: 'draft',
      is_locked: false,
      lock_duration_days: null,
      lock_expires_at: null,
      created_at: now
    };

    const quotes = this._getFromStorage('quotes');
    quotes.push(quote);
    this._saveToStorage('quotes', quotes);

    return { quote: this._resolveQuote(quote), message: 'Quote calculated successfully.' };
  }

  // getPayoutOptionsForQuote
  getPayoutOptionsForQuote(quoteId) {
    const quotes = this._getFromStorage('quotes');
    const quoteRaw = quotes.find((q) => q.id === quoteId);
    if (!quoteRaw) return [];

    let options = this._getFromStorage('quote_payout_options').filter((o) => o.quote_id === quoteId);
    if (options.length === 0) {
      options = this._generatePayoutOptionsForQuote(quoteRaw);
    }

    // Resolve quote for each option
    const quote = this._resolveQuote(quoteRaw);
    return options.map((o) => ({
      ...o,
      quote
    }));
  }

  // addQuoteToCart
  addQuoteToCart(quoteId, payoutMethodType, quantity = 1) {
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return { success: false, cart: null, cartItem: null, message: 'Quote not found.' };
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === quote.product_id);
    if (!product) {
      return { success: false, cart: null, cartItem: null, message: 'Product associated with quote not found.' };
    }

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('ci'),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      brand_name: product.brand_name,
      category_id: product.category_id,
      selected_storage_capacity_label: quote.storage_capacity_label || null,
      selected_storage_capacity_gb: quote.storage_capacity_gb || null,
      selected_carrier_option: quote.carrier_option || null,
      condition_grade: quote.condition_grade,
      condition_detail_codes: quote.condition_detail_codes || [],
      quote_id: quote.id,
      quote_amount: quote.base_amount,
      payout_method_type: payoutMethodType,
      locked_quote: quote.is_locked || false,
      locked_until: quote.lock_expires_at || null,
      quantity: quantity || 1
    };

    allItems.push(cartItem);
    this._saveToStorage('cart_items', allItems);

    cart.updated_at = this._now();
    this._updateCart(cart);

    return {
      success: true,
      cart,
      cartItem: this._resolveCartItem(cartItem),
      message: 'Item added to cart.'
    };
  }

  // lockQuoteForPeriod
  lockQuoteForPeriod(quoteId, lockDurationDays) {
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return { quote: null, message: 'Quote not found.' };
    }
    const locked = this._lockQuote(quote, lockDurationDays);
    return { quote: this._resolveQuote(locked), message: `Quote locked for ${lockDurationDays} days.` };
  }

  // startCheckoutWithQuote
  startCheckoutWithQuote(quoteId) {
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return { cart: null, checkoutSession: null };
    }

    // Ensure quote is locked; if not, lock for 30 days by default
    if (!quote.is_locked) {
      this._lockQuote(quote, 30);
    }

    // Abandon existing active cart (if any) and create a fresh one
    let carts = this._getFromStorage('cart');
    carts = carts.map((c) => (c.status === 'active' ? { ...c, status: 'abandoned' } : c));
    this._saveToStorage('cart', carts);

    const now = this._now();
    const cart = {
      id: this._generateId('cart'),
      status: 'active',
      order_level_payout_method_type: 'not_set',
      created_at: now,
      updated_at: now
    };
    carts = this._getFromStorage('cart');
    carts.push(cart);
    this._saveToStorage('cart', carts);

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === quote.product_id);

    const cartItems = this._getFromStorage('cart_items');
    const cartItem = {
      id: this._generateId('ci'),
      cart_id: cart.id,
      product_id: product ? product.id : quote.product_id,
      product_name: product ? product.name : quote.product_name,
      brand_name: product ? product.brand_name : quote.brand_name,
      category_id: quote.category_id,
      selected_storage_capacity_label: quote.storage_capacity_label || null,
      selected_storage_capacity_gb: quote.storage_capacity_gb || null,
      selected_carrier_option: quote.carrier_option || null,
      condition_grade: quote.condition_grade,
      condition_detail_codes: quote.condition_detail_codes || [],
      quote_id: quote.id,
      quote_amount: quote.base_amount,
      payout_method_type: null,
      locked_quote: quote.is_locked || false,
      locked_until: quote.lock_expires_at || null,
      quantity: 1
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const checkoutSession = {
      id: this._generateId('chk'),
      cart_id: cart.id,
      created_at: now,
      updated_at: now,
      promo_code_entered: null,
      promo_code_id: null,
      payout_schedule_type: 'unspecified',
      shipping_option_type: 'none',
      partner_location_id: null,
      appointment_slot_id: null,
      shipping_method_id: null,
      shipping_label_id: null
    };
    const sessions = this._getFromStorage('checkout_sessions');
    sessions.push(checkoutSession);
    this._saveToStorage('checkout_sessions', sessions);

    return {
      cart,
      checkoutSession: this._resolveCheckoutSession(checkoutSession)
    };
  }

  // getCartSummary
  getCartSummary() {
    const cart = this._getActiveCart();
    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: {
          total_base_payout: 0,
          total_payout_after_promos: 0,
          promo_savings_amount: 0
        }
      };
    }
    const allItems = this._getFromStorage('cart_items');
    const itemsRaw = allItems.filter((i) => i.cart_id === cart.id);
    const items = itemsRaw.map((i) => this._resolveCartItem(i));
    const totals = this._calculateCartTotals(cart);
    return {
      cart,
      items,
      totals
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const allItems = this._getFromStorage('cart_items');
    const item = allItems.find((i) => i.id === cartItemId);
    const remaining = allItems.filter((i) => i.id !== cartItemId);
    this._saveToStorage('cart_items', remaining);

    let cart = null;
    if (item) {
      const carts = this._getFromStorage('cart');
      cart = carts.find((c) => c.id === item.cart_id) || null;
      if (cart) {
        cart.updated_at = this._now();
        this._updateCart(cart);
      }
    }

    const updatedItems = cart
      ? remaining.filter((i) => i.cart_id === cart.id).map((i) => this._resolveCartItem(i))
      : [];

    return {
      cart,
      items: updatedItems,
      message: 'Item removed from cart.'
    };
  }

  // setCartOrderLevelPayoutMethod
  setCartOrderLevelPayoutMethod(payoutMethodType) {
    const valid = ['bank_transfer', 'paypal', 'store_credit', 'check', 'not_set'];
    const cart = this._getOrCreateCart();
    if (!valid.includes(payoutMethodType)) {
      return {
        cart,
        message: 'Invalid payout method type.'
      };
    }
    cart.order_level_payout_method_type = payoutMethodType;
    cart.updated_at = this._now();
    this._updateCart(cart);
    return {
      cart,
      message: 'Order-level payout method updated.'
    };
  }

  // startCheckoutSession
  startCheckoutSession() {
    const cart = this._getOrCreateCart();
    const checkoutSession = this._getOrCreateCheckoutSession();
    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      cart
    };
  }

  // getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getActiveCart();
    if (!cart) {
      return {
        checkoutSession: null,
        cart: null,
        items: [],
        totals: {
          total_base_payout: 0,
          total_payout_after_promos: 0,
          promo_savings_amount: 0
        },
        appliedPromo: null
      };
    }
    const checkoutSessionRaw = this._getCheckoutSessionForCart(cart.id) || this._getOrCreateCheckoutSession();
    const checkoutSession = this._resolveCheckoutSession(checkoutSessionRaw);

    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((i) => i.cart_id === cart.id).map((i) => this._resolveCartItem(i));
    const totals = this._calculateCartTotals(cart, checkoutSessionRaw);

    let appliedPromo = null;
    if (checkoutSessionRaw.promo_code_id) {
      const promos = this._getFromStorage('promo_codes');
      const promo = promos.find((p) => p.id === checkoutSessionRaw.promo_code_id) || null;
      if (promo) {
        appliedPromo = {
          promo_code: promo.code,
          description: promo.description || ''
        };
      }
    }

    return {
      checkoutSession,
      cart,
      items,
      totals,
      appliedPromo
    };
  }

  // applyPromoCode
  applyPromoCode(promoCode) {
    const cart = this._getOrCreateCart();
    let checkoutSession = this._getOrCreateCheckoutSession();
    const promos = this._getFromStorage('promo_codes');

    const codeLower = String(promoCode || '').trim().toLowerCase();
    const promo = promos.find((p) => p.code && p.code.toLowerCase() === codeLower && p.is_active);

    if (!promo) {
      checkoutSession.promo_code_entered = promoCode;
      checkoutSession.promo_code_id = null;
      checkoutSession.updated_at = this._now();
      this._saveCheckoutSession(checkoutSession);
      const totals = this._calculateCartTotals(cart, checkoutSession);
      return {
        checkoutSession: this._resolveCheckoutSession(checkoutSession),
        cart,
        totals,
        promo: null,
        message: 'Promo code not found or inactive.'
      };
    }

    // Check date constraints
    const nowMs = Date.now();
    if (
      (promo.start_date && new Date(promo.start_date).getTime() > nowMs) ||
      (promo.end_date && new Date(promo.end_date).getTime() < nowMs)
    ) {
      checkoutSession.promo_code_entered = promoCode;
      checkoutSession.promo_code_id = null;
      checkoutSession.updated_at = this._now();
      this._saveCheckoutSession(checkoutSession);
      const totals = this._calculateCartTotals(cart, checkoutSession);
      return {
        checkoutSession: this._resolveCheckoutSession(checkoutSession),
        cart,
        totals,
        promo: null,
        message: 'Promo code is not currently valid.'
      };
    }

    checkoutSession.promo_code_entered = promoCode;
    checkoutSession.promo_code_id = promo.id;
    checkoutSession.updated_at = this._now();
    this._saveCheckoutSession(checkoutSession);

    const totals = this._calculateCartTotals(cart, checkoutSession);

    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      cart,
      totals,
      promo,
      message: 'Promo code applied.'
    };
  }

  // updatePayoutSchedule
  updatePayoutSchedule(payoutScheduleType) {
    const valid = ['lump_sum', 'installment', 'split', 'unspecified'];
    if (!valid.includes(payoutScheduleType)) {
      return {
        checkoutSession: null,
        message: 'Invalid payout schedule type.'
      };
    }
    let checkoutSession = this._getOrCreateCheckoutSession();
    checkoutSession.payout_schedule_type = payoutScheduleType;
    checkoutSession.updated_at = this._now();
    this._saveCheckoutSession(checkoutSession);
    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      message: 'Payout schedule updated.'
    };
  }

  // setShippingOptionDropOff
  setShippingOptionDropOff() {
    let checkoutSession = this._getOrCreateCheckoutSession();
    checkoutSession.shipping_option_type = 'drop_off_at_partner_location';
    // Clear ship-my-devices specific fields
    checkoutSession.shipping_method_id = null;
    checkoutSession.shipping_label_id = null;
    checkoutSession.updated_at = this._now();
    this._saveCheckoutSession(checkoutSession);
    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      message: 'Shipping option set to drop off at partner location.'
    };
  }

  // setShippingOptionShipMyDevices
  setShippingOptionShipMyDevices() {
    let checkoutSession = this._getOrCreateCheckoutSession();
    checkoutSession.shipping_option_type = 'ship_my_devices';
    // Clear drop-off specific fields
    checkoutSession.partner_location_id = null;
    checkoutSession.appointment_slot_id = null;
    checkoutSession.updated_at = this._now();
    this._saveCheckoutSession(checkoutSession);
    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      message: 'Shipping option set to ship my devices.'
    };
  }

  // searchPartnerLocations
  searchPartnerLocations(postalCode, maxDistanceMiles) {
    const locations = this._getFromStorage('partner_locations').filter((l) => l.is_active);
    const filtered = locations.filter((l) => {
      if (typeof maxDistanceMiles === 'number' && l.distance_miles != null) {
        return l.distance_miles <= maxDistanceMiles;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Infinity;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Infinity;
      return da - db;
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_locationSearchParams',
        JSON.stringify({ postalCode, maxDistanceMiles })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered;
  }

  // selectDropOffLocation
  selectDropOffLocation(partnerLocationId) {
    let checkoutSession = this._getOrCreateCheckoutSession();
    const locations = this._getFromStorage('partner_locations');
    const partnerLocation = locations.find((l) => l.id === partnerLocationId) || null;

    checkoutSession.partner_location_id = partnerLocation ? partnerLocation.id : null;
    checkoutSession.shipping_option_type = 'drop_off_at_partner_location';
    checkoutSession.updated_at = this._now();
    this._saveCheckoutSession(checkoutSession);

    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      partnerLocation,
      message: partnerLocation ? 'Partner location selected.' : 'Partner location not found.'
    };
  }

  // getPartnerLocationDetailsAndSlots
  getPartnerLocationDetailsAndSlots(partnerLocationId) {
    const locations = this._getFromStorage('partner_locations');
    const partnerLocation = locations.find((l) => l.id === partnerLocationId) || null;
    const allSlots = this._getFromStorage('appointment_slots');
    let appointmentSlots = allSlots.filter((s) => s.partner_location_id === partnerLocationId && s.is_available);
    appointmentSlots.sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());

    // Attach partner_location to slots as foreign key resolution
    appointmentSlots = appointmentSlots.map((s) => ({
      ...s,
      partner_location: partnerLocation
    }));

    return {
      partnerLocation,
      appointmentSlots
    };
  }

  // selectDropOffAppointmentSlot
  selectDropOffAppointmentSlot(appointmentSlotId) {
    let checkoutSession = this._getOrCreateCheckoutSession();
    const slots = this._getFromStorage('appointment_slots');
    const idx = slots.findIndex((s) => s.id === appointmentSlotId);
    let slot = idx !== -1 ? slots[idx] : null;

    if (slot) {
      // Optionally mark slot as no longer available
      slot.is_available = false;
      slots[idx] = slot;
      this._saveToStorage('appointment_slots', slots);
    }

    checkoutSession.appointment_slot_id = slot ? slot.id : null;
    checkoutSession.updated_at = this._now();
    this._saveCheckoutSession(checkoutSession);

    // Attach partner_location
    const locations = this._getFromStorage('partner_locations');
    const partnerLocation = slot
      ? locations.find((l) => l.id === slot.partner_location_id) || null
      : null;
    const resolvedSlot = slot
      ? {
          ...slot,
          partner_location: partnerLocation
        }
      : null;

    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      appointmentSlot: resolvedSlot,
      message: slot ? 'Appointment slot selected.' : 'Appointment slot not found.'
    };
  }

  // listShippingMethods
  listShippingMethods(optionType = 'ship_my_devices') {
    const methods = this._getFromStorage('shipping_methods').filter(
      (m) => m.is_active && m.option_type === optionType
    );
    // sort by price ascending
    methods.sort((a, b) => (a.price || 0) - (b.price || 0));
    return methods;
  }

  // selectShippingMethod
  selectShippingMethod(shippingMethodId) {
    let checkoutSession = this._getOrCreateCheckoutSession();
    const methods = this._getFromStorage('shipping_methods');
    const method = methods.find((m) => m.id === shippingMethodId) || null;

    checkoutSession.shipping_method_id = method ? method.id : null;
    checkoutSession.shipping_option_type = 'ship_my_devices';
    checkoutSession.updated_at = this._now();
    this._saveCheckoutSession(checkoutSession);

    return {
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      shippingMethod: method,
      message: method ? 'Shipping method selected.' : 'Shipping method not found.'
    };
  }

  // generatePrepaidShippingLabel
  generatePrepaidShippingLabel() {
    let checkoutSession = this._getOrCreateCheckoutSession();
    if (!checkoutSession.shipping_method_id) {
      return {
        shippingLabel: null,
        checkoutSession: this._resolveCheckoutSession(checkoutSession),
        message: 'No shipping method selected.'
      };
    }

    const labels = this._getFromStorage('shipping_labels');
    const now = this._now();

    const shippingLabel = {
      id: this._generateId('label'),
      shipping_method_id: checkoutSession.shipping_method_id,
      label_url: `https://example.com/labels/${Date.now()}-${Math.floor(Math.random() * 10000)}.pdf`,
      tracking_number: 'TRK' + Math.floor(Math.random() * 1e10).toString().padStart(10, '0'),
      generated_at: now,
      is_downloaded: false,
      downloaded_at: null
    };

    labels.push(shippingLabel);
    this._saveToStorage('shipping_labels', labels);

    checkoutSession.shipping_label_id = shippingLabel.id;
    checkoutSession.updated_at = now;
    this._saveCheckoutSession(checkoutSession);

    return {
      shippingLabel: {
        ...shippingLabel,
        shipping_method: this._getFromStorage('shipping_methods').find(
          (m) => m.id === shippingLabel.shipping_method_id
        ) || null
      },
      checkoutSession: this._resolveCheckoutSession(checkoutSession),
      message: 'Prepaid shipping label generated.'
    };
  }

  // downloadShippingLabel
  downloadShippingLabel() {
    const checkoutSession = this._getOrCreateCheckoutSession();
    if (!checkoutSession.shipping_label_id) {
      return {
        shippingLabel: null,
        downloadUrl: null,
        message: 'No shipping label to download.'
      };
    }

    const labels = this._getFromStorage('shipping_labels');
    const idx = labels.findIndex((l) => l.id === checkoutSession.shipping_label_id);
    if (idx === -1) {
      return {
        shippingLabel: null,
        downloadUrl: null,
        message: 'Shipping label not found.'
      };
    }

    let label = labels[idx];
    label.is_downloaded = true;
    label.downloaded_at = this._now();
    labels[idx] = label;
    this._saveToStorage('shipping_labels', labels);

    label = {
      ...label,
      shipping_method: this._getFromStorage('shipping_methods').find(
        (m) => m.id === label.shipping_method_id
      ) || null
    };

    return {
      shippingLabel: label,
      downloadUrl: label.label_url,
      message: 'Shipping label download recorded.'
    };
  }

  // proceedToOrderReview
  proceedToOrderReview() {
    const cart = this._getActiveCart();
    if (!cart) {
      return {
        checkoutSession: null,
        cart: null,
        items: [],
        totals: {
          total_base_payout: 0,
          total_payout_after_promos: 0,
          promo_savings_amount: 0
        },
        readyForConfirmation: false
      };
    }

    const checkoutSessionRaw = this._getOrCreateCheckoutSession();
    const checkoutSession = this._resolveCheckoutSession(checkoutSessionRaw);

    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((i) => i.cart_id === cart.id).map((i) => this._resolveCartItem(i));
    const totals = this._calculateCartTotals(cart, checkoutSessionRaw);

    let hasItems = items.length > 0;
    let hasPayoutSchedule =
      checkoutSessionRaw && checkoutSessionRaw.payout_schedule_type !== 'unspecified';
    let hasShippingReady = false;
    if (checkoutSessionRaw) {
      if (checkoutSessionRaw.shipping_option_type === 'drop_off_at_partner_location') {
        if (checkoutSessionRaw.partner_location_id && checkoutSessionRaw.appointment_slot_id) {
          hasShippingReady = true;
        }
      } else if (checkoutSessionRaw.shipping_option_type === 'ship_my_devices') {
        if (checkoutSessionRaw.shipping_method_id && checkoutSessionRaw.shipping_label_id) {
          hasShippingReady = true;
        }
      }
    }
    const readyForConfirmation = hasItems && (hasPayoutSchedule || hasShippingReady);

    return {
      checkoutSession,
      cart,
      items,
      totals,
      readyForConfirmation
    };
  }

  // confirmTradeInOrder
  confirmTradeInOrder() {
    const cart = this._getActiveCart();
    if (!cart) {
      return { success: false, order: null, orderItems: [], message: 'No active cart.' };
    }
    const checkoutSession = this._getOrCreateCheckoutSession();

    const allItems = this._getFromStorage('cart_items');
    const cartItems = allItems.filter((i) => i.cart_id === cart.id);
    if (cartItems.length === 0) {
      return { success: false, order: null, orderItems: [], message: 'Cart is empty.' };
    }

    const totals = this._calculateCartTotals(cart, checkoutSession);
    const now = this._now();

    const order = {
      id: this._generateId('order'),
      order_number: 'TR' + Date.now(),
      cart_id: cart.id,
      checkout_session_id: checkoutSession.id,
      created_at: now,
      status: 'created',
      total_base_payout: totals.total_base_payout,
      total_payout_after_promos: totals.total_payout_after_promos,
      promo_code: checkoutSession.promo_code_entered || null,
      promo_savings_amount: totals.promo_savings_amount,
      order_level_payout_method_type: cart.order_level_payout_method_type || 'not_set',
      payout_schedule_type: checkoutSession.payout_schedule_type || 'unspecified',
      shipping_option_type: checkoutSession.shipping_option_type || 'none',
      partner_location_id: checkoutSession.partner_location_id || null,
      appointment_slot_id: checkoutSession.appointment_slot_id || null,
      shipping_method_id: checkoutSession.shipping_method_id || null,
      shipping_label_id: checkoutSession.shipping_label_id || null,
      confirmation_page_url: null
    };

    const orderItems = [];
    const products = this._getFromStorage('products');

    cartItems.forEach((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const oi = {
        id: this._generateId('oi'),
        order_id: order.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        brand_name: ci.brand_name,
        category_id: ci.category_id,
        storage_capacity_label: ci.selected_storage_capacity_label || null,
        carrier_option: ci.selected_carrier_option || null,
        condition_grade: ci.condition_grade,
        condition_detail_codes: ci.condition_detail_codes || [],
        quote_id: ci.quote_id || null,
        final_quote_amount: ci.quote_amount || 0,
        payout_method_type: ci.payout_method_type || this._getDefaultPayoutMethodType()
      };
      orderItems.push(oi);
    });

    const orders = this._getFromStorage('trade_in_orders');
    orders.push(order);
    this._saveToStorage('trade_in_orders', orders);

    const existingOrderItems = this._getFromStorage('order_items');
    existingOrderItems.push(...orderItems);
    this._saveToStorage('order_items', existingOrderItems);

    // Update cart status
    cart.status = 'converted_to_order';
    cart.updated_at = now;
    this._updateCart(cart);

    // Mark quotes as used
    const quotes = this._getFromStorage('quotes');
    const quoteIds = new Set(cartItems.map((ci) => ci.quote_id).filter(Boolean));
    let changed = false;
    quotes.forEach((q) => {
      if (quoteIds.has(q.id)) {
        q.quote_status = 'used';
        changed = true;
      }
    });
    if (changed) {
      this._saveToStorage('quotes', quotes);
    }

    return {
      success: true,
      order: this._resolveOrder(order),
      orderItems: orderItems.map((oi) => this._resolveOrderItem(oi)),
      message: 'Trade-in order created.'
    };
  }

  // getOrderConfirmationDetails
  getOrderConfirmationDetails(orderId) {
    const orders = this._getFromStorage('trade_in_orders');
    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return { order: null, orderItems: [] };
    }
    const allItems = this._getFromStorage('order_items');
    const orderItems = allItems
      .filter((oi) => oi.order_id === order.id)
      .map((oi) => this._resolveOrderItem(oi));
    return {
      order: this._resolveOrder(order),
      orderItems
    };
  }

  // registerAccount
  registerAccount(email, fullName, password, passwordConfirmation) {
    email = String(email || '').trim();
    fullName = String(fullName || '').trim();
    password = String(password || '');
    passwordConfirmation = String(passwordConfirmation || '');

    if (!email || !fullName || !password || !passwordConfirmation) {
      return {
        success: false,
        accountProfile: null,
        message: 'All fields are required.'
      };
    }
    if (password !== passwordConfirmation) {
      return {
        success: false,
        accountProfile: null,
        message: 'Passwords do not match.'
      };
    }

    const profiles = this._getFromStorage('account_profiles');
    if (profiles.some((p) => p.email.toLowerCase() === email.toLowerCase())) {
      return {
        success: false,
        accountProfile: null,
        message: 'An account with this email already exists.'
      };
    }

    const now = this._now();
    const accountProfile = {
      id: this._generateId('acct'),
      email,
      full_name: fullName,
      password,
      created_at: now
    };

    profiles.push(accountProfile);
    this._saveToStorage('account_profiles', profiles);

    // Set as current account in single-user context
    localStorage.setItem('current_account_profile_id', accountProfile.id);

    return {
      success: true,
      accountProfile,
      message: 'Account created.'
    };
  }

  // getAccountDashboardData
  getAccountDashboardData() {
    const accountProfile = this._getCurrentAccountProfile();
    const prefs = this._getFromStorage('payout_preferences');
    const payoutPreference = accountProfile
      ? prefs.find((p) => p.account_profile_id === accountProfile.id) || null
      : null;

    // Single-agent context: all orders belong to this account
    let recentOrders = this._getFromStorage('trade_in_orders');
    recentOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    recentOrders = recentOrders.slice(0, 10).map((o) => this._resolveOrder(o));

    return {
      accountProfile,
      payoutPreference,
      recentOrders
    };
  }

  // getPayoutPreferences
  getPayoutPreferences() {
    const accountProfile = this._getCurrentAccountProfile();
    const availableMethods = this._getFromStorage('payout_methods').filter((m) => m.is_active);
    if (!accountProfile) {
      return {
        payoutPreference: null,
        availableMethods
      };
    }
    const prefs = this._getFromStorage('payout_preferences');
    const payoutPreference = prefs.find((p) => p.account_profile_id === accountProfile.id) || null;
    return {
      payoutPreference,
      availableMethods
    };
  }

  // updatePayoutPreferences
  updatePayoutPreferences(
    defaultPayoutMethodType,
    bankName,
    bankAccountNumber,
    paypalEmail,
    storeCreditNote
  ) {
    const accountProfile = this._getCurrentAccountProfile();
    if (!accountProfile) {
      return {
        payoutPreference: null,
        message: 'No logged-in account.'
      };
    }

    const valid = ['bank_transfer', 'paypal', 'store_credit', 'check'];
    if (!valid.includes(defaultPayoutMethodType)) {
      return {
        payoutPreference: null,
        message: 'Invalid payout method type.'
      };
    }

    let prefs = this._getFromStorage('payout_preferences');
    let pref = prefs.find((p) => p.account_profile_id === accountProfile.id);
    const now = this._now();

    if (!pref) {
      pref = {
        id: this._generateId('ppref'),
        account_profile_id: accountProfile.id,
        default_payout_method_type: defaultPayoutMethodType,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        paypal_email: paypalEmail || null,
        store_credit_note: storeCreditNote || null,
        updated_at: now
      };
      prefs.push(pref);
    } else {
      pref.default_payout_method_type = defaultPayoutMethodType;
      pref.bank_name = bankName || null;
      pref.bank_account_number = bankAccountNumber || null;
      pref.paypal_email = paypalEmail || null;
      pref.store_credit_note = storeCreditNote || null;
      pref.updated_at = now;
    }

    this._saveToStorage('payout_preferences', prefs);

    return {
      payoutPreference: pref,
      message: 'Payout preferences updated.'
    };
  }

  // Content interfaces (static content, not backed by entities)

  getAboutPageContent() {
    return {
      title: 'About Our Trade-in Program',
      bodyHtml:
        '<p>We help you trade in your electronics quickly and safely. Our mission is to extend the life of devices and reduce e-waste.</p>' +
        '<p>We partner with certified refurbishers and recyclers to ensure responsible handling of every device.</p>'
    };
  }

  getHowItWorksContent() {
    return {
      title: 'How It Works',
      steps: [
        {
          stepNumber: 1,
          headline: 'Tell us about your device',
          description: 'Search for your device, choose its configuration, and answer a few condition questions.'
        },
        {
          stepNumber: 2,
          headline: 'Lock in your quote',
          description: 'Review your trade-in estimate and lock it in for a set period if available.'
        },
        {
          stepNumber: 3,
          headline: 'Ship or drop off your device',
          description: 'Choose mail-in shipping or a nearby partner location and follow the instructions.'
        },
        {
          stepNumber: 4,
          headline: 'Get paid',
          description: 'Once your device is received and inspected, we issue your payout according to your preferences.'
        }
      ]
    };
  }

  getHelpFaqContent() {
    return [
      {
        question: 'How are trade-in quotes calculated?',
        answerHtml:
          '<p>Quotes are based on your device model, configuration, and condition. Cosmetic and functional issues can reduce the payout, while higher storage or RAM may increase it.</p>',
        category: 'quotes'
      },
      {
        question: 'What condition grades do you support?',
        answerHtml:
          '<p>We support the following grades: like new, good, fair, poor, and broken. Each grade has clear guidelines for cosmetic wear and functional issues.</p>',
        category: 'condition'
      },
      {
        question: 'Which payout methods are available?',
        answerHtml:
          '<p>We typically support bank transfer, PayPal, check, and store credit. Availability may vary and some methods can offer higher payouts.</p>',
        category: 'payouts'
      },
      {
        question: 'Can I use promo codes like BONUS10?',
        answerHtml:
          '<p>Yes, you can enter valid promo codes during checkout to boost your payout. Each code has its own terms, such as validity dates and eligible devices.</p>',
        category: 'promos'
      }
    ];
  }

  getContactPageConfig() {
    return {
      supportEmail: 'support@example.com',
      supportPhone: '+1-800-555-1234',
      chatAvailable: false,
      subjectOptions: [
        'General question',
        'Quote or pricing issue',
        'Shipping or drop-off',
        'Payout or account',
        'Other'
      ]
    };
  }

  submitContactForm(name, email, subject, message) {
    const tickets = this._getFromStorage('contact_tickets');
    const ticketId = this._generateId('ticket');
    tickets.push({
      id: ticketId,
      name,
      email,
      subject,
      message,
      created_at: this._now()
    });
    this._saveToStorage('contact_tickets', tickets);
    return {
      success: true,
      ticketId,
      message: 'Your message has been received.'
    };
  }

  getTermsAndConditionsContent() {
    return {
      title: 'Terms & Conditions',
      bodyHtml:
        '<p>By using this trade-in service, you agree that all information you provide about your devices is accurate to the best of your knowledge.</p>' +
        '<p>Quotes may be adjusted if the received device condition or configuration differs from what was described. Locked quotes remain valid until their expiration date, provided no misrepresentation occurs.</p>'
    };
  }

  getPrivacyPolicyContent() {
    return {
      title: 'Privacy Policy',
      bodyHtml:
        '<p>We collect and store your information to provide trade-in quotes, process orders, and issue payouts. We do not sell your personal data.</p>' +
        '<p>Your data is stored securely and only used for the purposes described in this policy.</p>'
    };
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}