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

// Constants
const TAX_RATE = 0.1; // 10% tax for illustration

const SHIPPING_METHODS = {
  standard_shipping_3_5_business_days: {
    code: 'standard_shipping_3_5_business_days',
    label: 'Standard shipping (3–5 business days)',
    description: 'Delivery within 3–5 business days.',
    price: 15
  },
  express_shipping_1_2_business_days: {
    code: 'express_shipping_1_2_business_days',
    label: 'Express shipping (1–2 business days)',
    description: 'Delivery within 1–2 business days.',
    price: 25
  },
  overnight_shipping_1_business_day: {
    code: 'overnight_shipping_1_business_day',
    label: 'Overnight shipping (1 business day)',
    description: 'Next business day delivery.',
    price: 40
  },
  digital_delivery: {
    code: 'digital_delivery',
    label: 'Digital delivery',
    description: 'Instant digital delivery.',
    price: 0
  }
};

const PAYMENT_METHODS = {
  business_invoice: {
    code: 'business_invoice',
    label: 'Business customer - pay by invoice',
    description: 'Available to approved business customers.'
  },
  credit_card: {
    code: 'credit_card',
    label: 'Credit card',
    description: 'Pay securely with major credit cards.'
  },
  bank_transfer: {
    code: 'bank_transfer',
    label: 'Bank transfer',
    description: 'Pay via manual bank transfer.'
  }
};

const AVAILABLE_SORTS = [
  'relevance',
  'price_low_to_high',
  'price_high_to_low',
  'rating_high_to_low',
  'rating_low_to_high'
];

const DEMO_TIME_SLOTS = [
  '09_00_am',
  '10_00_am',
  '11_00_am',
  '01_00_pm',
  '02_00_pm',
  '03_00_pm'
];

class BusinessLogic {
  constructor() {
    // Initialize localStorage with default data structures (empty where not present)
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Legacy keys from skeleton (kept for compatibility, not core to this model)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    // Migrate legacy cartItems -> cart_items if needed
    if (!localStorage.getItem('cart_items')) {
      const legacy = localStorage.getItem('cartItems');
      localStorage.setItem('cart_items', legacy || JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Ensure idCounter exists
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Core storage tables from data model (create if missing, do NOT seed mock data)
    const arrayKeys = [
      'categories',
      'products',
      'carts',
      'cart_items',
      'saved_items',
      'product_comparisons',
      'quote_requests',
      'demo_requests',
      'checkout_sessions',
      'contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Content / singleton-style documents
    if (!localStorage.getItem('company_overview')) {
      localStorage.setItem(
        'company_overview',
        JSON.stringify({
          company_name: '',
          tagline: '',
          description: '',
          founded_year: null,
          values: []
        })
      );
    }

    if (!localStorage.getItem('contact_information')) {
      localStorage.setItem(
        'contact_information',
        JSON.stringify({
          general_inquiry_email: '',
          sales_email: '',
          support_email: '',
          phone_numbers: [],
          office_locations: []
        })
      );
    }

    if (!localStorage.getItem('support_content')) {
      localStorage.setItem(
        'support_content',
        JSON.stringify({
          faqs: [],
          guides: []
        })
      );
    }

    if (!localStorage.getItem('policy_documents')) {
      localStorage.setItem(
        'policy_documents',
        JSON.stringify({ policies: [] })
      );
    }
  }

  // Generic storage helpers
  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  _findCategoryByCode(categoryCode) {
    const categories = this._getFromStorage('categories');
    return categories.find((c) => c.category_code === categoryCode) || null;
  }

  _findProductById(productId) {
    const products = this._getFromStorage('products');
    return products.find((p) => p.id === productId) || null;
  }

  _findProductBySku(sku) {
    const products = this._getFromStorage('products');
    return products.find((p) => p.sku === sku) || null;
  }

  _searchMatchesQuery(product, query) {
    if (!query) return true;
    const q = String(query).toLowerCase();
    const haystack = [];
    if (product.name) haystack.push(product.name.toLowerCase());
    if (product.sku) haystack.push(product.sku.toLowerCase());
    if (Array.isArray(product.search_keywords)) {
      product.search_keywords.forEach((kw) => {
        if (typeof kw === 'string') haystack.push(kw.toLowerCase());
      });
    }
    return haystack.some((h) => h.includes(q));
  }

  _getCategoryAndDescendantsCodes(rootCategoryCode) {
    const categories = this._getFromStorage('categories');
    const codes = new Set();
    const queue = [];
    if (rootCategoryCode) {
      codes.add(rootCategoryCode);
      queue.push(rootCategoryCode);
    }
    while (queue.length > 0) {
      const current = queue.shift();
      categories.forEach((cat) => {
        if (cat.parent_category_code === current && !codes.has(cat.category_code)) {
          codes.add(cat.category_code);
          queue.push(cat.category_code);
        }
      });
    }
    return Array.from(codes);
  }

  // ==========================
  // Helper functions (private)
  // ==========================

  // Internal helper to retrieve the current cart or create a new one if none exists
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.is_active);
    if (!cart) {
      const now = this._now();
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        subtotal: 0,
        tax: 0,
        shipping_total: 0,
        total: 0,
        currency: 'usd',
        created_at: now,
        updated_at: now,
        is_active: true
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  // Internal helper to recalculate cart totals (subtotal, tax, shipping, total)
  _recalculateCartTotals(cartId) {
    if (!cartId) return null;
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const cart = carts.find((c) => c.id === cartId);
    if (!cart) return null;

    const items = cartItems.filter((ci) => ci.cart_id === cartId);
    let subtotal = 0;
    let shippingTotal = 0;

    items.forEach((item) => {
      const lineSubtotal = (item.unit_price_snapshot || 0) * (item.quantity || 0);
      item.line_subtotal = lineSubtotal;
      subtotal += lineSubtotal;
      if (item.shipping_method_code && SHIPPING_METHODS[item.shipping_method_code]) {
        shippingTotal += SHIPPING_METHODS[item.shipping_method_code].price;
      }
    });

    const tax = subtotal * TAX_RATE;
    cart.subtotal = Number(subtotal.toFixed(2));
    cart.tax = Number(tax.toFixed(2));
    cart.shipping_total = Number(shippingTotal.toFixed(2));
    cart.total = Number((cart.subtotal + cart.tax + cart.shipping_total).toFixed(2));
    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    return cart;
  }

  // Internal helper to create or retrieve active checkout session for current cart
  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find((s) => s.is_active);

    const now = this._now();
    if (!session) {
      session = {
        id: this._generateId('checkout_session'),
        cart_id: cart.id,
        payment_method: 'business_invoice',
        created_at: now,
        updated_at: now,
        is_active: true
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    } else if (session.cart_id !== cart.id) {
      // If the active session is tied to a different cart, update it
      session.cart_id = cart.id;
      session.updated_at = now;
      this._saveToStorage('checkout_sessions', sessions);
    }

    return session;
  }

  // Internal helper to validate quick order entries and map to products
  _validateQuickOrderEntries(entries) {
    const products = this._getFromStorage('products');
    const safeEntries = Array.isArray(entries) ? entries : [];

    return safeEntries.map((entry) => {
      const sku = entry && entry.sku != null ? String(entry.sku).trim() : '';
      const qtyRaw = entry && entry.quantity != null ? entry.quantity : NaN;
      const qty = Number(qtyRaw);
      const validationErrors = [];

      if (!sku) {
        validationErrors.push('SKU is required.');
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        validationErrors.push('Quantity must be a positive number.');
      }

      const product = sku ? products.find((p) => p.sku === sku) : null;
      const productFound = !!product;
      if (sku && !productFound) {
        validationErrors.push('Product with the given SKU was not found.');
      }

      return {
        input: {
          sku: sku,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 0
        },
        product_found: productFound,
        product: product
          ? {
              id: product.id,
              name: product.name,
              sku: product.sku,
              base_price: product.base_price
            }
          : null,
        validation_errors: validationErrors
      };
    });
  }

  // Internal helper to construct and persist a QuoteRequest
  _createQuoteRequestRecord(product, customerName, company, email, quantity, comments) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const now = this._now();
    const qr = {
      id: this._generateId('quote_request'),
      product_id: product.id,
      product_name_snapshot: product.name,
      sku_snapshot: product.sku,
      customer_name: customerName,
      company: company,
      email: email,
      quantity: quantity,
      comments: comments || '',
      status: 'submitted',
      created_at: now,
      submitted_at: now
    };
    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);
    return qr;
  }

  // Internal helper to construct and persist a DemoRequest
  _createDemoRequestRecord(product, fullName, workEmail, preferredDateStr, preferredTimeSlot, numberOfAttendees) {
    const demoRequests = this._getFromStorage('demo_requests');
    const now = this._now();

    // Store preferred_date as ISO (date portion from provided 'YYYY-MM-DD')
    let preferredDateISO = preferredDateStr;
    try {
      const d = new Date(preferredDateStr);
      if (!isNaN(d.getTime())) {
        preferredDateISO = d.toISOString();
      }
    } catch (e) {
      // Fallback to raw string if parsing fails
      preferredDateISO = preferredDateStr;
    }

    const dr = {
      id: this._generateId('demo_request'),
      product_id: product.id,
      product_name_snapshot: product.name,
      full_name: fullName,
      work_email: workEmail,
      preferred_date: preferredDateISO,
      preferred_time_slot: preferredTimeSlot,
      number_of_attendees: numberOfAttendees,
      status: 'submitted',
      created_at: now
    };

    demoRequests.push(dr);
    this._saveToStorage('demo_requests', demoRequests);
    return dr;
  }

  // Internal helper to retrieve or initialize active ProductComparison set
  _getActiveProductComparisonSet() {
    let comparisons = this._getFromStorage('product_comparisons');
    let comparison = comparisons.find((c) => c.is_active);
    if (!comparison) {
      comparison = {
        id: this._generateId('product_comparison'),
        product_ids: [],
        created_at: this._now(),
        is_active: true
      };
      comparisons.push(comparison);
      this._saveToStorage('product_comparisons', comparisons);
    }
    return comparison;
  }

  // Internal helper to build category hierarchy
  _resolveCategoryHierarchy() {
    const categories = this._getFromStorage('categories');
    const map = new Map();

    categories.forEach((cat) => {
      map.set(cat.category_code, Object.assign({}, cat, { children: [] }));
    });

    map.forEach((cat) => {
      if (cat.parent_category_code) {
        const parent = map.get(cat.parent_category_code);
        if (parent) {
          parent.children.push(cat);
        }
      }
    });

    const topLevel = [];
    const subcategories = [];
    map.forEach((cat) => {
      if (!cat.parent_category_code) {
        topLevel.push(cat);
      } else {
        subcategories.push(cat);
      }
    });

    return {
      top_level_categories: topLevel,
      subcategories: subcategories
    };
  }

  // ==============================
  // Core interface implementations
  // ==============================

  // --- Navigation / Homepage ---

  getMainNavigationCategories() {
    const hierarchy = this._resolveCategoryHierarchy();
    return {
      top_level_categories: hierarchy.top_level_categories,
      featured_subcategories: hierarchy.subcategories
    };
  }

  getHomepageFeaturedCategories() {
    // For lack of explicit "featured" flags, reuse hierarchy.
    const hierarchy = this._resolveCategoryHierarchy();
    return {
      featured_categories: hierarchy.top_level_categories,
      featured_subcategories: hierarchy.subcategories
    };
  }

  // --- Category Filters & Products ---

  getCategoryFilterOptions(category_code) {
    const categoryCodes = this._getCategoryAndDescendantsCodes(category_code);
    const products = this._getFromStorage('products').filter((p) =>
      categoryCodes.length ? categoryCodes.includes(p.category_code) : p.category_code === category_code
    );

    let minPrice = null;
    let maxPrice = null;
    let minRating = null;
    let maxRating = null;

    const productTypesSet = new Set();
    const chairTypesSet = new Set();
    const paperSizesSet = new Set();
    const screenSizesSet = new Set();
    const printerTechSet = new Set();
    const featuresSet = new Set();
    const compatibilityModelsSet = new Set();
    const shippingOptionsSet = new Set();

    let hasEco = false;
    let hasFreeShipping = false;

    products.forEach((p) => {
      if (typeof p.base_price === 'number') {
        if (minPrice === null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice === null || p.base_price > maxPrice) maxPrice = p.base_price;
      }

      if (typeof p.rating_average === 'number') {
        if (minRating === null || p.rating_average < minRating) minRating = p.rating_average;
        if (maxRating === null || p.rating_average > maxRating) maxRating = p.rating_average;
      }

      if (p.product_type) productTypesSet.add(p.product_type);
      if (p.chair_type) chairTypesSet.add(p.chair_type);
      if (p.paper_size) paperSizesSet.add(p.paper_size);
      if (typeof p.screen_size_inches === 'number') screenSizesSet.add(p.screen_size_inches);
      if (p.printer_technology) printerTechSet.add(p.printer_technology);

      if (p.has_duplex_printing) featuresSet.add('duplex_printing');
      if (p.has_wifi_connectivity) featuresSet.add('wifi_connectivity');
      if (p.is_color_printing) featuresSet.add('color_printing');

      if (Array.isArray(p.compatible_models)) {
        p.compatible_models.forEach((m) => compatibilityModelsSet.add(m));
      }

      if (Array.isArray(p.shipping_method_codes)) {
        p.shipping_method_codes.forEach((code) => shippingOptionsSet.add(code));
      }

      if (p.is_eco_certified) hasEco = true;
      if (p.has_free_shipping) hasFreeShipping = true;
    });

    const product_types = Array.from(productTypesSet).map((id) => ({ id: id, label: id }));
    const chair_types = Array.from(chairTypesSet).map((id) => ({ id: id, label: id }));
    const paper_sizes = Array.from(paperSizesSet).map((id) => ({ id: id, label: id.toUpperCase() }));
    const screen_sizes_inches = Array.from(screenSizesSet).sort((a, b) => a - b).map((value) => ({
      value: value,
      label: String(value) + '"'
    }));
    const printer_technologies = Array.from(printerTechSet).map((id) => ({ id: id, label: id }));

    const features = Array.from(featuresSet).map((id) => ({ id: id, label: id }));
    const compatibility_models = Array.from(compatibilityModelsSet).map((value) => ({
      value: value,
      label: value
    }));
    const shipping_options = Array.from(shippingOptionsSet).map((code) => ({
      code: code,
      label: (SHIPPING_METHODS[code] && SHIPPING_METHODS[code].label) || code
    }));

    return {
      price: { min: minPrice, max: maxPrice },
      rating: { min: minRating, max: maxRating },
      product_types: product_types,
      chair_types: chair_types,
      paper_sizes: paper_sizes,
      screen_sizes_inches: screen_sizes_inches,
      printer_technologies: printer_technologies,
      features: features,
      compatibility_models: compatibility_models,
      shipping_options: shipping_options,
      has_eco_certified_products: hasEco,
      has_free_shipping_products: hasFreeShipping
    };
  }

  getCategoryProducts(category_code, filters, sort_by, page, page_size) {
    const effectiveFilters = filters || {};
    const sortBy = sort_by || 'relevance';
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    // Instrumentation for task completion tracking (Tasks 1, 3, 5, 6)
    try {
      const payload = { category_code, filters, sort_by };
      localStorage.setItem('task1_chairFilterParams', JSON.stringify(payload));
      localStorage.setItem('task3_paperFilterParams', JSON.stringify(payload));
      localStorage.setItem('task5_monitorFilterParams', JSON.stringify(payload));
      localStorage.setItem('task6_cleaningFilterParams', JSON.stringify(payload));
    } catch (e) {}

    const category = this._findCategoryByCode(category_code);
    const categoryCodes = this._getCategoryAndDescendantsCodes(category_code);

    let products = this._getFromStorage('products').filter((p) =>
      categoryCodes.length ? categoryCodes.includes(p.category_code) : p.category_code === category_code
    );

    products = this._applyCommonProductFilters(products, effectiveFilters);

    products = this._sortProducts(products, sortBy);

    const totalCount = products.length;
    const start = (currentPage - 1) * size;
    const paged = products.slice(start, start + size);

    return {
      category: category || null,
      products: paged,
      total_count: totalCount,
      page: currentPage,
      page_size: size,
      available_sorts: AVAILABLE_SORTS.slice()
    };
  }

  // Common filter logic used by category & search
  _applyCommonProductFilters(products, filters) {
    return products.filter((p) => {
      if (filters.min_price != null && typeof p.base_price === 'number' && p.base_price < filters.min_price) {
        return false;
      }
      if (filters.max_price != null && typeof p.base_price === 'number' && p.base_price > filters.max_price) {
        return false;
      }

      if (filters.min_rating != null) {
        const rating = typeof p.rating_average === 'number' ? p.rating_average : 0;
        if (rating < filters.min_rating) return false;
      }

      if (filters.product_type && p.product_type !== filters.product_type) return false;
      if (filters.chair_type && p.chair_type !== filters.chair_type) return false;
      if (filters.paper_size && p.paper_size !== filters.paper_size) return false;

      if (filters.screen_size_inches != null && typeof p.screen_size_inches === 'number') {
        if (p.screen_size_inches !== filters.screen_size_inches) return false;
      }

      if (filters.printer_technology && p.printer_technology !== filters.printer_technology) return false;

      if (filters.is_color_printing != null) {
        if (!!p.is_color_printing !== !!filters.is_color_printing) return false;
      }
      if (filters.has_duplex_printing != null) {
        if (!!p.has_duplex_printing !== !!filters.has_duplex_printing) return false;
      }
      if (filters.has_wifi_connectivity != null) {
        if (!!p.has_wifi_connectivity !== !!filters.has_wifi_connectivity) return false;
      }
      if (filters.is_eco_certified != null) {
        if (!!p.is_eco_certified !== !!filters.is_eco_certified) return false;
      }
      if (filters.has_free_shipping != null) {
        if (!!p.has_free_shipping !== !!filters.has_free_shipping) return false;
      }

      if (filters.compatible_with_model) {
        const models = Array.isArray(p.compatible_models) ? p.compatible_models : [];
        if (!models.includes(filters.compatible_with_model)) return false;
      }

      return true;
    });
  }

  _sortProducts(products, sortBy) {
    const items = products.slice();
    if (sortBy === 'price_low_to_high') {
      items.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sortBy === 'price_high_to_low') {
      items.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sortBy === 'rating_high_to_low') {
      items.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sortBy === 'rating_low_to_high') {
      items.sort((a, b) => (a.rating_average || 0) - (b.rating_average || 0));
    }
    // 'relevance' is left as-is (backend ranking or insertion order)
    return items;
  }

  // --- Search Filters & Results ---

  getSearchFilterOptions(query) {
    const products = this._getFromStorage('products').filter((p) => this._searchMatchesQuery(p, query));

    let minPrice = null;
    let maxPrice = null;
    let minRating = null;
    let maxRating = null;

    const productTypesSet = new Set();
    const printerTechSet = new Set();
    const featuresSet = new Set();
    const paperSizesSet = new Set();
    const screenSizesSet = new Set();
    const compatibilityModelsSet = new Set();
    const shippingOptionsSet = new Set();

    let hasEco = false;
    let hasFreeShipping = false;

    products.forEach((p) => {
      if (typeof p.base_price === 'number') {
        if (minPrice === null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice === null || p.base_price > maxPrice) maxPrice = p.base_price;
      }

      if (typeof p.rating_average === 'number') {
        if (minRating === null || p.rating_average < minRating) minRating = p.rating_average;
        if (maxRating === null || p.rating_average > maxRating) maxRating = p.rating_average;
      }

      if (p.product_type) productTypesSet.add(p.product_type);
      if (p.printer_technology) printerTechSet.add(p.printer_technology);

      if (p.has_duplex_printing) featuresSet.add('duplex_printing');
      if (p.has_wifi_connectivity) featuresSet.add('wifi_connectivity');
      if (p.is_color_printing) featuresSet.add('color_printing');

      if (p.paper_size) paperSizesSet.add(p.paper_size);
      if (typeof p.screen_size_inches === 'number') screenSizesSet.add(p.screen_size_inches);

      if (Array.isArray(p.compatible_models)) {
        p.compatible_models.forEach((m) => compatibilityModelsSet.add(m));
      }
      if (Array.isArray(p.shipping_method_codes)) {
        p.shipping_method_codes.forEach((code) => shippingOptionsSet.add(code));
      }

      if (p.is_eco_certified) hasEco = true;
      if (p.has_free_shipping) hasFreeShipping = true;
    });

    const product_types = Array.from(productTypesSet).map((id) => ({ id: id, label: id }));
    const printer_technologies = Array.from(printerTechSet).map((id) => ({ id: id, label: id }));
    const features = Array.from(featuresSet).map((id) => ({ id: id, label: id }));
    const paper_sizes = Array.from(paperSizesSet).map((id) => ({ id: id, label: id.toUpperCase() }));
    const screen_sizes_inches = Array.from(screenSizesSet).sort((a, b) => a - b).map((value) => ({
      value: value,
      label: String(value) + '"'
    }));
    const compatibility_models = Array.from(compatibilityModelsSet).map((value) => ({
      value: value,
      label: value
    }));
    const shipping_options = Array.from(shippingOptionsSet).map((code) => ({
      code: code,
      label: (SHIPPING_METHODS[code] && SHIPPING_METHODS[code].label) || code
    }));

    return {
      price: { min: minPrice, max: maxPrice },
      rating: { min: minRating, max: maxRating },
      product_types: product_types,
      printer_technologies: printer_technologies,
      features: features,
      paper_sizes: paper_sizes,
      screen_sizes_inches: screen_sizes_inches,
      compatibility_models: compatibility_models,
      shipping_options: shipping_options,
      has_eco_certified_products: hasEco,
      has_free_shipping_products: hasFreeShipping
    };
  }

  searchProducts(query, filters, sort_by, page, page_size) {
    const effectiveFilters = filters || {};
    const sortBy = sort_by || 'relevance';
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    // Instrumentation for task completion tracking (Tasks 2, 4)
    try {
      const payload = { query, filters, sort_by };
      localStorage.setItem('task2_searchParams', JSON.stringify(payload));
      localStorage.setItem('task4_searchFilterParams', JSON.stringify(payload));
    } catch (e) {}

    let products = this._getFromStorage('products').filter((p) => this._searchMatchesQuery(p, query));
    products = this._applyCommonProductFilters(products, effectiveFilters);
    products = this._sortProducts(products, sortBy);

    const totalCount = products.length;
    const start = (currentPage - 1) * size;
    const paged = products.slice(start, start + size);

    return {
      products: paged,
      total_count: totalCount,
      page: currentPage,
      page_size: size,
      available_sorts: AVAILABLE_SORTS.slice()
    };
  }

  // --- Product Details ---

  getProductDetails(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return {
        product: null,
        category: null,
        available_shipping_methods: [],
        can_request_quote: false,
        can_request_demo: false,
        related_products: []
      };
    }

    const category = this._findCategoryByCode(product.category_code);
    const availableShippingMethods = Array.isArray(product.shipping_method_codes)
      ? product.shipping_method_codes.map((code) => {
          const meta = SHIPPING_METHODS[code];
          return {
            code: code,
            label: meta ? meta.label : code,
            description: meta ? meta.description : '',
            price: meta ? meta.price : 0
          };
        })
      : [];

    const allProducts = this._getFromStorage('products');
    const related_products = allProducts.filter(
      (p) => p.id !== product.id && p.category_code === product.category_code
    );

    return {
      product: product,
      category: category || null,
      available_shipping_methods: availableShippingMethods,
      can_request_quote: !!product.supports_quote_request,
      can_request_demo: !!product.supports_demo_request,
      related_products: related_products
    };
  }

  // --- Cart & Saved Items ---

  addProductToCart(productId, quantity, selected_color, shipping_method_code) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const product = this._findProductById(productId);
    if (!product) {
      return { success: false, cart: null, added_item: null, message: 'Product not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const now = this._now();
    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      sku_snapshot: product.sku,
      unit_price_snapshot: product.base_price,
      quantity: qty,
      selected_color: selected_color || product.default_color || null,
      shipping_method_code: shipping_method_code || null,
      line_subtotal: (product.base_price || 0) * qty,
      created_at: now,
      updated_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    // Update cart.item_ids
    const carts = this._getFromStorage('carts');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      const c = carts[cartIndex];
      if (!Array.isArray(c.item_ids)) c.item_ids = [];
      c.item_ids.push(item.id);
      this._saveToStorage('carts', carts);
    }

    const updatedCart = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      cart: updatedCart,
      added_item: item,
      message: 'Product added to cart.'
    };
  }

  addProductToSavedItems(productId, selected_color) {
    const product = this._findProductById(productId);
    if (!product) {
      return { success: false, saved_item: null, message: 'Product not found.' };
    }

    const savedItems = this._getFromStorage('saved_items');
    const now = this._now();
    const item = {
      id: this._generateId('saved_item'),
      product_id: product.id,
      product_name_snapshot: product.name,
      selected_color: selected_color || product.default_color || null,
      created_at: now
    };

    savedItems.push(item);
    this._saveToStorage('saved_items', savedItems);

    return {
      success: true,
      saved_item: item,
      message: 'Product added to saved items.'
    };
  }

  getSavedItems() {
    const savedItems = this._getFromStorage('saved_items');
    const products = this._getFromStorage('products');

    const result = savedItems.map((si) => ({
      saved_item: si,
      product: products.find((p) => p.id === si.product_id) || null
    }));

    return {
      saved_items: result
    };
  }

  removeSavedItem(savedItemId) {
    const savedItems = this._getFromStorage('saved_items');
    const index = savedItems.findIndex((si) => si.id === savedItemId);
    if (index === -1) {
      return { success: false, message: 'Saved item not found.' };
    }

    savedItems.splice(index, 1);
    this._saveToStorage('saved_items', savedItems);
    return { success: true, message: 'Saved item removed.' };
  }

  moveSavedItemToCart(savedItemId, quantity, shipping_method_code) {
    const savedItems = this._getFromStorage('saved_items');
    const savedItem = savedItems.find((si) => si.id === savedItemId);
    if (!savedItem) {
      return { success: false, cart: null, cart_item: null, message: 'Saved item not found.' };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;

    const addResult = this.addProductToCart(
      savedItem.product_id,
      qty,
      savedItem.selected_color,
      shipping_method_code
    );

    if (!addResult.success) {
      return { success: false, cart: null, cart_item: null, message: addResult.message };
    }

    // Remove saved item after moving to cart
    const updatedSavedItems = savedItems.filter((si) => si.id !== savedItemId);
    this._saveToStorage('saved_items', updatedSavedItems);

    return {
      success: true,
      cart: addResult.cart,
      cart_item: addResult.added_item,
      message: 'Saved item moved to cart.'
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');

    const items = cartItems.map((ci) => ({
      cart_item: ci,
      product: products.find((p) => p.id === ci.product_id) || null
    }));

    // Ensure totals are up-to-date
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    return {
      cart: updatedCart,
      items: items
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : null;
    if (!qty) {
      return { success: false, cart: null, updated_item: null, message: 'Quantity must be >= 1.' };
    }

    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, updated_item: null, message: 'Cart item not found.' };
    }

    item.quantity = qty;
    item.updated_at = this._now();
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotals(item.cart_id);

    return {
      success: true,
      cart: cart,
      updated_item: item,
      message: 'Cart item quantity updated.'
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    const item = cartItems[index];
    const cartId = item.cart_id;

    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    // Remove from cart.item_ids
    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId);
    if (cart && Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
      this._saveToStorage('carts', carts);
    }

    const updatedCart = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart: updatedCart,
      message: 'Cart item removed.'
    };
  }

  updateCartItemShippingMethod(cartItemId, shipping_method_code) {
    if (!shipping_method_code || !SHIPPING_METHODS[shipping_method_code]) {
      return {
        success: false,
        cart: null,
        updated_item: null,
        message: 'Invalid shipping method.'
      };
    }

    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, updated_item: null, message: 'Cart item not found.' };
    }

    item.shipping_method_code = shipping_method_code;
    item.updated_at = this._now();
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotals(item.cart_id);

    return {
      success: true,
      cart: cart,
      updated_item: item,
      message: 'Shipping method updated.'
    };
  }

  // --- Checkout & Order Summary ---

  proceedToCheckout() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;
    const checkoutSession = this._getOrCreateCheckoutSession();

    const availablePaymentMethods = Object.keys(PAYMENT_METHODS).map((code) => PAYMENT_METHODS[code]);

    return {
      success: true,
      checkout_session: checkoutSession,
      cart: updatedCart,
      available_payment_methods: availablePaymentMethods,
      message: 'Checkout started.'
    };
  }

  updatePaymentMethod(payment_method) {
    if (!PAYMENT_METHODS[payment_method]) {
      return { success: false, checkout_session: null, message: 'Invalid payment method.' };
    }

    const sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find((s) => s.is_active);
    if (!session) {
      // Create a session if none exists
      session = this._getOrCreateCheckoutSession();
    }

    session.payment_method = payment_method;
    session.updated_at = this._now();
    this._saveToStorage('checkout_sessions', sessions);

    return {
      success: true,
      checkout_session: session,
      message: 'Payment method updated.'
    };
  }

  continueToOrderSummary() {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find((s) => s.is_active);
    if (!session) {
      return { success: false, checkout_session: null, order_summary: null, message: 'No active checkout session.' };
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === session.cart_id);
    if (!cart) {
      return { success: false, checkout_session: session, order_summary: null, message: 'Cart not found.' };
    }

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const items = cartItems.map((ci) => ({
      cart_item: ci,
      product: products.find((p) => p.id === ci.product_id) || null
    }));

    const paymentMeta = PAYMENT_METHODS[session.payment_method];

    const orderSummary = {
      cart: updatedCart,
      items: items,
      payment_method_label: paymentMeta ? paymentMeta.label : session.payment_method,
      shipping_total: updatedCart.shipping_total || 0,
      tax_total: updatedCart.tax || 0,
      grand_total: updatedCart.total || 0,
      currency: updatedCart.currency || 'usd'
    };

    // Instrumentation for task completion tracking (Task 7 - order summary viewed)
    try {
      localStorage.setItem('task7_orderSummaryViewed', 'true');
    } catch (e) {}

    return {
      success: true,
      checkout_session: session,
      order_summary: orderSummary,
      message: 'Order summary ready.'
    };
  }

  getOrderSummary() {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find((s) => s.is_active) || null;
    if (!session) {
      return {
        checkout_session: null,
        order_summary: null
      };
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === session.cart_id) || null;
    if (!cart) {
      return {
        checkout_session: session,
        order_summary: null
      };
    }

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const items = cartItems.map((ci) => ({
      cart_item: ci,
      product: products.find((p) => p.id === ci.product_id) || null
    }));

    const paymentMeta = PAYMENT_METHODS[session.payment_method];
    const orderSummary = {
      cart: updatedCart,
      items: items,
      payment_method_label: paymentMeta ? paymentMeta.label : session.payment_method,
      shipping_total: updatedCart.shipping_total || 0,
      tax_total: updatedCart.tax || 0,
      grand_total: updatedCart.total || 0,
      currency: updatedCart.currency || 'usd'
    };

    return {
      checkout_session: session,
      order_summary: orderSummary
    };
  }

  // --- Quote Requests ---

  getQuoteRequestContext(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return { product: null, can_request_quote: false };
    }
    return {
      product: product,
      can_request_quote: !!product.supports_quote_request
    };
  }

  submitQuoteRequest(productId, customer_name, company, email, quantity, comments) {
    const product = this._findProductById(productId);
    if (!product) {
      return { success: false, quote_request: null, message: 'Product not found.' };
    }

    // Allow quote requests for any product; supports_quote_request flag is treated as informational.

    const qty = quantity && quantity > 0 ? quantity : 1;
    const qr = this._createQuoteRequestRecord(
      product,
      customer_name,
      company,
      email,
      qty,
      comments
    );

    return {
      success: true,
      quote_request: qr,
      message: 'Quote request submitted.'
    };
  }

  // --- Product Comparison ---

  getCurrentProductComparison() {
    const comparison = this._getActiveProductComparisonSet();
    const products = this._getFromStorage('products').filter((p) =>
      comparison.product_ids.includes(p.id)
    );

    const comparisonTable = this._buildComparisonTable(comparison, products);

    return {
      comparison: comparison,
      products: products,
      comparison_table: comparisonTable
    };
  }

  _buildComparisonTable(comparison, products) {
    if (!comparison || !Array.isArray(products) || products.length === 0) return [];

    const rows = [];

    const addRow = (attributeKey, attributeLabel, getValueFn) => {
      const values = products.map((p) => ({
        product_id: p.id,
        display_value: String(getValueFn(p))
      }));
      const distinct = new Set(values.map((v) => v.display_value));
      rows.push({
        attribute_key: attributeKey,
        attribute_label: attributeLabel,
        values: values,
        highlight_differences: distinct.size > 1
      });
    };

    addRow('screen_size_inches', 'Screen size', (p) =>
      p.screen_size_inches != null ? p.screen_size_inches + '"' : '-'
    );

    addRow('resolution', 'Resolution', (p) => {
      if (p.resolution_width && p.resolution_height) {
        return p.resolution_width + ' x ' + p.resolution_height;
      }
      return '-';
    });

    addRow('base_price', 'Base price', (p) =>
      p.base_price != null ? '$' + Number(p.base_price).toFixed(2) : '-'
    );

    addRow('rating_average', 'Average rating', (p) =>
      p.rating_average != null ? p.rating_average.toFixed(1) : '-'
    );

    return rows;
  }

  addProductToComparison(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return { success: false, comparison: null, products: [], message: 'Product not found.' };
    }

    if (product.is_comparable === false) {
      return { success: false, comparison: null, products: [], message: 'Product is not comparable.' };
    }

    const comparisons = this._getFromStorage('product_comparisons');
    let comparison = comparisons.find((c) => c.is_active);
    if (!comparison) {
      // Initialize a new active comparison set if none exists
      comparison = {
        id: this._generateId('product_comparison'),
        product_ids: [],
        created_at: this._now(),
        is_active: true
      };
      comparisons.push(comparison);
    }

    if (!Array.isArray(comparison.product_ids)) {
      comparison.product_ids = [];
    }

    if (!comparison.product_ids.includes(product.id)) {
      comparison.product_ids.push(product.id);
      this._saveToStorage('product_comparisons', comparisons);
    }

    const products = this._getFromStorage('products').filter((p) =>
      comparison.product_ids.includes(p.id)
    );

    return {
      success: true,
      comparison: comparison,
      products: products,
      message: 'Product added to comparison.'
    };
  }

  removeProductFromComparison(productId) {
    const comparisons = this._getFromStorage('product_comparisons');
    const comparison = comparisons.find((c) => c.is_active);
    if (!comparison) {
      return { success: false, comparison: null, products: [], message: 'No active comparison.' };
    }

    comparison.product_ids = (comparison.product_ids || []).filter((id) => id !== productId);
    this._saveToStorage('product_comparisons', comparisons);

    const products = this._getFromStorage('products').filter((p) =>
      comparison.product_ids.includes(p.id)
    );

    return {
      success: true,
      comparison: comparison,
      products: products,
      message: 'Product removed from comparison.'
    };
  }

  clearProductComparison() {
    const comparisons = this._getFromStorage('product_comparisons');
    const comparison = comparisons.find((c) => c.is_active);
    if (!comparison) {
      return { success: true, message: 'No active comparison to clear.' };
    }

    comparison.product_ids = [];
    this._saveToStorage('product_comparisons', comparisons);

    return { success: true, message: 'Comparison cleared.' };
  }

  // --- Quick Order by SKU ---

  previewQuickOrderEntries(entries) {
    const lines = this._validateQuickOrderEntries(entries);
    return { lines: lines };
  }

  addQuickOrderItemsToCart(entries) {
    const lines = this._validateQuickOrderEntries(entries);
    const addedItems = [];
    const validationErrors = [];
    let cart = null;

    lines.forEach((line, index) => {
      if (!line.product_found || line.validation_errors.length > 0) {
        if (line.validation_errors.length > 0) {
          validationErrors.push({ line_index: index, messages: line.validation_errors });
        }
        return;
      }

      const result = this.addProductToCart(line.product.id, line.input.quantity, null, null);
      if (!result.success) {
        validationErrors.push({ line_index: index, messages: [result.message] });
        return;
      }
      cart = result.cart;
      addedItems.push(result.added_item);
    });

    const success = addedItems.length > 0;

    // Instrumentation for task completion tracking (Task 7 - quick order used)
    try {
      if (success) {
        localStorage.setItem('task7_quickOrderUsed', 'true');
      }
    } catch (e) {}

    return {
      success: success,
      cart: cart,
      added_items: addedItems,
      validation_errors: validationErrors,
      message: success
        ? 'Quick order items added to cart.'
        : 'No items were added to the cart due to validation errors.'
    };
  }

  // --- Demo Requests ---

  getDemoRequestContext(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return {
        product: null,
        can_request_demo: false,
        available_time_slots: []
      };
    }

    return {
      product: product,
      can_request_demo: !!product.supports_demo_request,
      available_time_slots: DEMO_TIME_SLOTS.slice()
    };
  }

  submitDemoRequest(productId, full_name, work_email, preferred_date, preferred_time_slot, number_of_attendees) {
    const product = this._findProductById(productId);
    if (!product) {
      return { success: false, demo_request: null, message: 'Product not found.' };
    }

    // Allow demo requests for any product; supports_demo_request flag is treated as informational.

    if (!DEMO_TIME_SLOTS.includes(preferred_time_slot)) {
      return { success: false, demo_request: null, message: 'Invalid time slot.' };
    }

    const numAttendees = number_of_attendees && number_of_attendees > 0 ? number_of_attendees : 1;

    const dr = this._createDemoRequestRecord(
      product,
      full_name,
      work_email,
      preferred_date,
      preferred_time_slot,
      numAttendees
    );

    return {
      success: true,
      demo_request: dr,
      message: 'Demo request submitted.'
    };
  }

  // --- Company / Contact / Support / Policies ---

  getCompanyOverview() {
    const raw = localStorage.getItem('company_overview');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  getContactInformation() {
    const raw = localStorage.getItem('contact_information');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  submitContactInquiry(full_name, email, topic, message) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const now = this._now();
    const record = {
      id: this._generateId('contact_inquiry'),
      full_name: full_name,
      email: email,
      topic: topic,
      message: message,
      created_at: now
    };
    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      reference_id: record.id,
      message: 'Your inquiry has been submitted.'
    };
  }

  getSupportContent() {
    const raw = localStorage.getItem('support_content');
    if (!raw) {
      return { faqs: [], guides: [] };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
        guides: Array.isArray(parsed.guides) ? parsed.guides : []
      };
    } catch (e) {
      return { faqs: [], guides: [] };
    }
  }

  getPolicyDocuments() {
    const raw = localStorage.getItem('policy_documents');
    if (!raw) {
      return { policies: [] };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        policies: Array.isArray(parsed.policies) ? parsed.policies : []
      };
    } catch (e) {
      return { policies: [] };
    }
  }

  // ==============================
  // Legacy-style methods from stub
  // ==============================

  // Simple wrapper around addProductToCart ignoring userId
  addToCart(userId, productId, quantity) {
    const result = this.addProductToCart(productId, quantity || 1, null, null);
    return {
      success: result.success,
      cartId: result.cart ? result.cart.id : null
    };
  }

  _findOrCreateCart(userId) {
    // Backwards compatible alias for _getOrCreateCart (userId ignored in this implementation)
    return this._getOrCreateCart();
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
