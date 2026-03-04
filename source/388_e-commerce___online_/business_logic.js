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

    // Simple style name map for display
    this.STYLE_NAMES = {
      red_wine: 'Red Wine',
      white_wine: 'White Wine',
      sparkling_wine: 'Sparkling Wine',
      rose_wine: 'Rosé Wine',
      ipa: 'IPA',
      bourbon: 'Bourbon',
      gin: 'Gin',
      tequila: 'Tequila',
      mezcal: 'Mezcal',
      vodka: 'Vodka',
      rum: 'Rum',
      non_alcoholic_beer: 'Non-Alcoholic Beer',
      non_alcoholic_wine: 'Non-Alcoholic Wine',
      non_alcoholic_spirit_alternative: 'Non-Alcoholic Spirit Alternative',
      other: 'Other'
    };
  }

  // =====================
  // Storage helpers
  // =====================

  _initStorage() {
    const keys = [
      'users', // not used but kept for compatibility
      'products',
      'categories',
      'collections',
      'cart',
      'cart_items',
      'wishlist',
      'wishlist_items',
      'promocodes',
      'delivery_zones',
      'location_settings',
      'delivery_methods',
      'shipping_options',
      'checkout_sessions',
      'static_pages',
      'contact_submissions'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  // =====================
  // Core private helpers
  // =====================

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) carts = [];

    let cart = carts[0] || null;
    const now = new Date().toISOString();

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        created_at: now,
        updated_at: now,
        subtotal: 0,
        estimated_tax: 0,
        estimated_shipping: 0,
        discount_total: 0,
        total: 0
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlist');
    if (!Array.isArray(wishlists)) wishlists = [];

    let wishlist = wishlists[0] || null;
    const now = new Date().toISOString();

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        item_ids: [],
        created_at: now,
        updated_at: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlist', wishlists);
    }

    return wishlist;
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    let session = sessions.find(function (s) {
      return s.cart_id === cart.id && s.status === 'in_progress';
    });

    const now = new Date().toISOString();

    if (!session) {
      session = {
        id: this._generateId('checkout_session'),
        cart_id: cart.id,
        created_at: now,
        updated_at: now,
        status: 'in_progress',
        shipping_name: null,
        shipping_street: null,
        shipping_city: null,
        shipping_state: null,
        shipping_zip: null,
        shipping_phone: null,
        delivery_date: null,
        delivery_zone_id: null,
        selected_shipping_option_id: null,
        applied_promo_code_id: null,
        items_snapshot: [],
        subtotal: 0,
        tax: 0,
        shipping_cost: 0,
        discount_total: 0,
        total: 0
      };
      sessions.push(session);
    }

    // update items snapshot and totals from current cart
    const cartItems = this._getFromStorage('cart_items').filter(function (ci) {
      return ci.cart_id === cart.id;
    });
    session.items_snapshot = cartItems.map(function (ci) { return ci.id; });

    this._updateCheckoutSessionTotals(session);

    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  _findCartById(cartId) {
    const carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) return null;
    return carts.find(function (c) { return c.id === cartId; }) || null;
  }

  _findProductById(productId) {
    const products = this._getFromStorage('products');
    if (!Array.isArray(products)) return null;
    return products.find(function (p) { return p.id === productId; }) || null;
  }

  _getCartItemsForCart(cartId) {
    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];
    return cartItems.filter(function (ci) { return ci.cart_id === cartId; });
  }

  _recalculateCartTotals(cart) {
    const allCarts = this._getFromStorage('cart');
    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];

    const items = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
      subtotal += items[i].line_subtotal || 0;
    }

    cart.subtotal = subtotal;
    // Simple tax/shipping estimates; could be extended or replaced by real logic
    cart.estimated_tax = 0;
    cart.estimated_shipping = 0;
    cart.discount_total = cart.discount_total || 0;
    cart.total = subtotal + cart.estimated_tax + cart.estimated_shipping - cart.discount_total;
    cart.updated_at = new Date().toISOString();

    const idx = allCarts.findIndex(function (c) { return c.id === cart.id; });
    if (idx >= 0) {
      allCarts[idx] = cart;
    } else {
      allCarts.push(cart);
    }

    this._saveToStorage('cart', allCarts);
  }

  _getOrCreateDeliveryZone(zipCode) {
    let zones = this._getFromStorage('delivery_zones');
    if (!Array.isArray(zones)) zones = [];

    let zone = zones.find(function (z) { return z.zip_code === zipCode; }) || null;

    if (!zone) {
      const now = new Date().toISOString();
      zone = {
        id: this._generateId('delivery_zone'),
        zip_code: zipCode,
        name: 'Zone ' + zipCode,
        same_day_supported: true,
        scheduled_delivery_supported: true,
        standard_delivery_available: true,
        expedited_delivery_available: true,
        timezone: null,
        notes: null,
        created_at: now
      };
      zones.push(zone);
      this._saveToStorage('delivery_zones', zones);
    }

    return zone;
  }

  _resolveCurrentDeliveryZone(checkoutSession) {
    let zones = this._getFromStorage('delivery_zones');
    if (!Array.isArray(zones)) zones = [];

    // 1. If checkoutSession has explicit delivery_zone_id
    if (checkoutSession && checkoutSession.delivery_zone_id) {
      const existing = zones.find(function (z) { return z.id === checkoutSession.delivery_zone_id; }) || null;
      if (existing) return existing;
    }

    // 2. If checkoutSession has shipping_zip
    if (checkoutSession && checkoutSession.shipping_zip) {
      return this._getOrCreateDeliveryZone(checkoutSession.shipping_zip);
    }

    // 3. Use current LocationSetting
    let settings = this._getFromStorage('location_settings');
    if (!Array.isArray(settings)) settings = [];
    const setting = settings[0] || null;
    if (setting) {
      if (setting.delivery_zone_id) {
        const existingZone = zones.find(function (z) { return z.id === setting.delivery_zone_id; }) || null;
        if (existingZone) return existingZone;
      }
      if (setting.current_zip_code) {
        return this._getOrCreateDeliveryZone(setting.current_zip_code);
      }
    }

    return null;
  }

  _getSupportedMethodTypesForDate(zone, isoDateString) {
    const supported = [];
    const date = new Date(isoDateString + 'T00:00:00Z');
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    const sameDayPossible = !!(zone && zone.same_day_supported && isoDateString === todayIso);
    const standardPossible = !zone || zone.standard_delivery_available !== false;
    const expeditedPossible = !!(zone && zone.expedited_delivery_available);
    const scheduledPossible = !!(zone && zone.scheduled_delivery_supported);

    if (sameDayPossible) supported.push('same_day');
    if (standardPossible) supported.push('standard');
    if (expeditedPossible) supported.push('expedited');
    if (scheduledPossible) supported.push('scheduled');

    return supported;
  }

  _calculateShippingOptionsForSession(checkoutSession, deliveryDate) {
    // deliveryDate is ISO date string YYYY-MM-DD
    const zones = this._getFromStorage('delivery_zones');
    const methods = this._getFromStorage('delivery_methods');
    let options = this._getFromStorage('shipping_options');
    if (!Array.isArray(options)) options = [];

    const zone = this._resolveCurrentDeliveryZone(checkoutSession);
    const supportedTypes = this._getSupportedMethodTypesForDate(zone, deliveryDate);

    const estimatedDateTime = new Date(deliveryDate + 'T12:00:00Z').toISOString();

    // Remove existing options for this session & date
    const filteredExisting = options.filter(function (opt) {
      if (opt.checkout_session_id !== checkoutSession.id) return true;
      const datePart = (opt.estimated_delivery_date || '').slice(0, 10);
      return datePart !== deliveryDate;
    });

    const allPromos = this._getFromStorage('promocodes');
    const appliedPromo = checkoutSession.applied_promo_code_id
      ? allPromos.find(function (p) { return p.id === checkoutSession.applied_promo_code_id; }) || null
      : null;

    const newOptions = [];

    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      if (!method || method.is_active === false) continue;
      if (supportedTypes.indexOf(method.method_type) === -1) continue;

      let price = typeof method.base_price === 'number' ? method.base_price : 0;
      let isFree = false;

      if (
        appliedPromo &&
        appliedPromo.enables_free_shipping &&
        Array.isArray(appliedPromo.free_shipping_method_types) &&
        appliedPromo.free_shipping_method_types.indexOf(method.method_type) !== -1 &&
        method.supports_free_shipping
      ) {
        price = 0;
        isFree = true;
      }

      const labelPrefix = isFree ? 'Free ' : '';
      const option = {
        id: this._generateId('shipping_option'),
        checkout_session_id: checkoutSession.id,
        delivery_method_id: method.id,
        method_type: method.method_type,
        label: labelPrefix + (method.name || ''),
        price: price,
        estimated_delivery_date: estimatedDateTime,
        is_free: isFree,
        is_selected: false
      };

      newOptions.push(option);
    }

    const updated = filteredExisting.concat(newOptions);
    this._saveToStorage('shipping_options', updated);

    // Resolve foreign key delivery_method for return
    return newOptions.map(function (opt) {
      const dm = methods.find(function (m) { return m.id === opt.delivery_method_id; }) || null;
      return Object.assign({}, opt, { deliveryMethod: dm });
    });
  }

  _updateCheckoutSessionTotals(checkoutSession) {
    const cart = this._findCartById(checkoutSession.cart_id);
    if (!cart) {
      checkoutSession.subtotal = 0;
      checkoutSession.tax = 0;
      checkoutSession.shipping_cost = checkoutSession.shipping_cost || 0;
      checkoutSession.discount_total = checkoutSession.discount_total || 0;
      checkoutSession.total = 0;
      return;
    }

    checkoutSession.subtotal = cart.subtotal || 0;
    // Keep tax simple; 0 for now
    checkoutSession.tax = 0;
    checkoutSession.shipping_cost = checkoutSession.shipping_cost || 0;
    checkoutSession.discount_total = checkoutSession.discount_total || 0;

    checkoutSession.total =
      checkoutSession.subtotal + checkoutSession.tax + checkoutSession.shipping_cost - checkoutSession.discount_total;
    checkoutSession.updated_at = new Date().toISOString();
  }

  _applyPromoCodeToCheckoutSession(checkoutSession, promo) {
    if (!promo) return checkoutSession;

    const products = this._getFromStorage('products');
    const cartItems = this._getFromStorage('cart_items');

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === checkoutSession.cart_id; });

    let eligibleSubtotal = 0;

    for (let i = 0; i < itemsForCart.length; i++) {
      const item = itemsForCart[i];
      const product = products.find(function (p) { return p.id === item.product_id; });
      if (!product) continue;

      if (Array.isArray(promo.applies_to_category_keys) && promo.applies_to_category_keys.length > 0) {
        if (promo.applies_to_category_keys.indexOf(product.category_key) === -1) {
          continue;
        }
      }

      eligibleSubtotal += item.line_subtotal || 0;
    }

    // If applies_to_category_keys is empty/null, apply to entire subtotal
    if (!Array.isArray(promo.applies_to_category_keys) || promo.applies_to_category_keys.length === 0) {
      eligibleSubtotal = checkoutSession.subtotal || eligibleSubtotal;
    }

    if (promo.min_subtotal && eligibleSubtotal < promo.min_subtotal) {
      // Does not meet minimum; no changes
      return checkoutSession;
    }

    let discount = 0;

    if (promo.discount_type === 'percentage') {
      const pct = Number(promo.discount_value) || 0;
      discount = eligibleSubtotal * (pct / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = Math.min(Number(promo.discount_value) || 0, eligibleSubtotal);
    } else if (promo.discount_type === 'free_shipping') {
      // Free shipping handled via enables_free_shipping / shipping options
      discount = 0;
    }

    checkoutSession.applied_promo_code_id = promo.id;
    checkoutSession.discount_total = discount;

    this._updateCheckoutSessionTotals(checkoutSession);

    // Persist updated session
    let sessions = this._getFromStorage('checkout_sessions');
    if (!Array.isArray(sessions)) sessions = [];
    const idx = sessions.findIndex(function (s) { return s.id === checkoutSession.id; });
    if (idx >= 0) {
      sessions[idx] = checkoutSession;
    } else {
      sessions.push(checkoutSession);
    }
    this._saveToStorage('checkout_sessions', sessions);

    return checkoutSession;
  }

  // =====================
  // Interface implementations
  // =====================

  // --- Categories & Collections ---

  getCategories() {
    // Returns array<Category>
    const categories = this._getFromStorage('categories');
    return Array.isArray(categories) ? categories : [];
  }

  getFeaturedCollections() {
    // Returns array<Collection>
    const collections = this._getFromStorage('collections');
    if (!Array.isArray(collections)) return [];

    const featuredKeys = ['dinner_party', 'gift_sets', 'non_alcoholic_picks', 'featured'];
    return collections.filter(function (c) {
      return featuredKeys.indexOf(c.key) !== -1;
    });
  }

  getCollectionProducts(collectionId, page, pageSize) {
    const collections = this._getFromStorage('collections');
    const products = this._getFromStorage('products');

    const collection = collections.find(function (c) { return c.id === collectionId; }) || null;

    let collectionProducts = [];
    if (collection && Array.isArray(collection.product_ids)) {
      collectionProducts = collection.product_ids
        .map(function (pid) { return products.find(function (p) { return p.id === pid; }) || null; })
        .filter(function (p) { return !!p; });
    }

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = collectionProducts.length;

    const start = (pg - 1) * size;
    const end = start + size;
    const pagedProducts = collectionProducts.slice(start, end);

    return {
      collection: collection,
      products: pagedProducts,
      totalCount: totalCount
    };
  }

  // --- Location & Delivery Zone ---

  getCurrentLocationSetting() {
    let settings = this._getFromStorage('location_settings');
    if (!Array.isArray(settings)) settings = [];
    const setting = settings[0] || null;

    const zones = this._getFromStorage('delivery_zones');
    let deliveryZone = null;
    if (setting && setting.delivery_zone_id) {
      deliveryZone = zones.find(function (z) { return z.id === setting.delivery_zone_id; }) || null;
    }

    return {
      locationSetting: setting,
      deliveryZone: deliveryZone
    };
  }

  updateLocationZip(zipCode) {
    if (!zipCode) {
      return {
        locationSetting: null,
        deliveryZone: null,
        message: 'ZIP code is required.'
      };
    }

    const zone = this._getOrCreateDeliveryZone(zipCode);

    let settings = this._getFromStorage('location_settings');
    if (!Array.isArray(settings)) settings = [];

    let setting = settings[0] || null;
    const now = new Date().toISOString();

    if (!setting) {
      setting = {
        id: this._generateId('location_setting'),
        current_zip_code: zipCode,
        delivery_zone_id: zone.id,
        selected_at: now
      };
      settings.push(setting);
    } else {
      setting.current_zip_code = zipCode;
      setting.delivery_zone_id = zone.id;
      setting.selected_at = now;
      settings[0] = setting;
    }

    this._saveToStorage('location_settings', settings);

    return {
      locationSetting: setting,
      deliveryZone: zone,
      message: 'Location updated.'
    };
  }

  previewLocationCapabilities(zipCode) {
    if (!zipCode) return null;

    // Do not modify location_settings; just ensure DeliveryZone exists
    const zone = this._getOrCreateDeliveryZone(zipCode);
    return zone;
  }

  // --- Filter Options ---

  getFilterOptions(categoryKey, query) {
    const products = this._getFromStorage('products');
    if (!Array.isArray(products) || products.length === 0) {
      return {
        minPrice: null,
        maxPrice: null,
        minRating: null,
        maxRating: null,
        availableCountries: [],
        availableRegions: [],
        availableStyleKeys: [],
        abvRange: { minAbv: null, maxAbv: null },
        vintageYearRange: { minYear: null, maxYear: null },
        supportsGiftSetFilter: false,
        supportsGlasswareFilter: false,
        supportsSameDayFilter: false,
        supportsNonAlcoholicFilter: false
      };
    }

    const q = query ? String(query).toLowerCase() : null;

    const filtered = products.filter(function (p) {
      if (p.status && p.status !== 'active') return false;

      if (categoryKey && p.category_key !== categoryKey) return false;

      if (q) {
        const haystack = [p.name, p.brand, p.short_description, p.description, p.country, p.region]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      return {
        minPrice: null,
        maxPrice: null,
        minRating: null,
        maxRating: null,
        availableCountries: [],
        availableRegions: [],
        availableStyleKeys: [],
        abvRange: { minAbv: null, maxAbv: null },
        vintageYearRange: { minYear: null, maxYear: null },
        supportsGiftSetFilter: false,
        supportsGlasswareFilter: false,
        supportsSameDayFilter: false,
        supportsNonAlcoholicFilter: false
      };
    }

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minRating = Infinity;
    let maxRating = -Infinity;
    let minAbv = Infinity;
    let maxAbv = -Infinity;
    let minYear = Infinity;
    let maxYear = -Infinity;

    const countriesSet = {};
    const regionsSet = {};
    const styleSet = {};

    let supportsGiftSetFilter = false;
    let supportsGlasswareFilter = false;
    let supportsSameDayFilter = false;
    let supportsNonAlcoholicFilter = false;

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];

      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }

      if (typeof p.rating === 'number') {
        if (p.rating < minRating) minRating = p.rating;
        if (p.rating > maxRating) maxRating = p.rating;
      }

      if (typeof p.abv === 'number') {
        if (p.abv < minAbv) minAbv = p.abv;
        if (p.abv > maxAbv) maxAbv = p.abv;
      }

      if (typeof p.vintage_year === 'number') {
        if (p.vintage_year < minYear) minYear = p.vintage_year;
        if (p.vintage_year > maxYear) maxYear = p.vintage_year;
      }

      if (p.country) countriesSet[p.country] = true;
      if (p.region) regionsSet[p.region] = true;
      if (p.style_key) styleSet[p.style_key] = true;

      if (p.is_gift_set) supportsGiftSetFilter = true;
      if (p.includes_glassware) supportsGlasswareFilter = true;
      if (p.allow_same_day_delivery) supportsSameDayFilter = true;
      if (p.is_non_alcoholic) supportsNonAlcoholicFilter = true;
    }

    if (!isFinite(minPrice)) minPrice = null;
    if (!isFinite(maxPrice)) maxPrice = null;
    if (!isFinite(minRating)) minRating = null;
    if (!isFinite(maxRating)) maxRating = null;
    if (!isFinite(minAbv)) minAbv = null;
    if (!isFinite(maxAbv)) maxAbv = null;
    if (!isFinite(minYear)) minYear = null;
    if (!isFinite(maxYear)) maxYear = null;

    return {
      minPrice: minPrice,
      maxPrice: maxPrice,
      minRating: minRating,
      maxRating: maxRating,
      availableCountries: Object.keys(countriesSet),
      availableRegions: Object.keys(regionsSet),
      availableStyleKeys: Object.keys(styleSet),
      abvRange: { minAbv: minAbv, maxAbv: maxAbv },
      vintageYearRange: { minYear: minYear, maxYear: maxYear },
      supportsGiftSetFilter: supportsGiftSetFilter,
      supportsGlasswareFilter: supportsGlasswareFilter,
      supportsSameDayFilter: supportsSameDayFilter,
      supportsNonAlcoholicFilter: supportsNonAlcoholicFilter
    };
  }

  // --- Search & Listing ---

  searchProducts(query, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('products');
    if (!Array.isArray(products)) {
      return { products: [], totalCount: 0, page: 1, pageSize: pageSize || 20 };
    }

    const q = query ? String(query).toLowerCase() : '';
    const f = filters || {};
    const self = this;

    let results = products.filter(function (p) {
      if (p.status && p.status !== 'active') return false;

      if (q) {
        const styleName = self && self.STYLE_NAMES && p.style_key ? self.STYLE_NAMES[p.style_key] : null;
        const haystack = [p.name, p.brand, p.short_description, p.description, p.country, p.region, p.category_key, p.style_key, styleName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        for (let i = 0; i < tokens.length; i++) {
          if (haystack.indexOf(tokens[i]) === -1) return false;
        }
      }

      if (f.categoryKeyFilter && p.category_key !== f.categoryKeyFilter) return false;

      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;

      if (typeof f.minRating === 'number' && (typeof p.rating !== 'number' || p.rating < f.minRating)) return false;

      if (Array.isArray(f.countries) && f.countries.length > 0) {
        if (!p.country || f.countries.indexOf(p.country) === -1) return false;
      }

      if (Array.isArray(f.regions) && f.regions.length > 0) {
        if (!p.region || f.regions.indexOf(p.region) === -1) return false;
      }

      if (Array.isArray(f.styleKeys) && f.styleKeys.length > 0) {
        if (!p.style_key || f.styleKeys.indexOf(p.style_key) === -1) return false;
      }

      if (typeof f.minAbv === 'number' && (typeof p.abv !== 'number' || p.abv < f.minAbv)) return false;
      if (typeof f.maxAbv === 'number' && (typeof p.abv !== 'number' || p.abv > f.maxAbv)) return false;

      if (typeof f.minVintageYear === 'number' && (typeof p.vintage_year !== 'number' || p.vintage_year < f.minVintageYear)) return false;
      if (typeof f.maxVintageYear === 'number' && (typeof p.vintage_year !== 'number' || p.vintage_year > f.maxVintageYear)) return false;

      if (typeof f.isGiftSet === 'boolean' && !!p.is_gift_set !== f.isGiftSet) return false;
      if (typeof f.includesGlassware === 'boolean' && !!p.includes_glassware !== f.includesGlassware) return false;
      if (typeof f.isNonAlcoholic === 'boolean' && !!p.is_non_alcoholic !== f.isNonAlcoholic) return false;
      if (typeof f.allowSameDayDelivery === 'boolean' && !!p.allow_same_day_delivery !== f.allowSameDayDelivery) return false;

      return true;
    });

    const sortMode = sortBy || 'relevance';

    if (sortMode === 'price_low_to_high') {
      results.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sortMode === 'price_high_to_low') {
      results.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    } else if (sortMode === 'rating_high_to_low') {
      results.sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    }

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const totalCount = results.length;
    const start = (pg - 1) * size;
    const end = start + size;

    return {
      products: results.slice(start, end),
      totalCount: totalCount,
      page: pg,
      pageSize: size
    };
  }

  listCategoryProducts(categoryKey, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('products');
    if (!Array.isArray(products)) {
      return { products: [], totalCount: 0, page: 1, pageSize: pageSize || 20 };
    }

    const f = filters || {};

    let results = products.filter(function (p) {
      if (p.status && p.status !== 'active') return false;
      if (p.category_key !== categoryKey) return false;

      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;

      if (typeof f.minRating === 'number' && (typeof p.rating !== 'number' || p.rating < f.minRating)) return false;

      if (Array.isArray(f.countries) && f.countries.length > 0) {
        if (!p.country || f.countries.indexOf(p.country) === -1) return false;
      }

      if (Array.isArray(f.regions) && f.regions.length > 0) {
        if (!p.region || f.regions.indexOf(p.region) === -1) return false;
      }

      if (Array.isArray(f.styleKeys) && f.styleKeys.length > 0) {
        if (!p.style_key || f.styleKeys.indexOf(p.style_key) === -1) return false;
      }

      if (typeof f.minAbv === 'number' && (typeof p.abv !== 'number' || p.abv < f.minAbv)) return false;
      if (typeof f.maxAbv === 'number' && (typeof p.abv !== 'number' || p.abv > f.maxAbv)) return false;

      if (typeof f.minVintageYear === 'number' && (typeof p.vintage_year !== 'number' || p.vintage_year < f.minVintageYear)) return false;
      if (typeof f.maxVintageYear === 'number' && (typeof p.vintage_year !== 'number' || p.vintage_year > f.maxVintageYear)) return false;

      if (typeof f.isGiftSet === 'boolean' && !!p.is_gift_set !== f.isGiftSet) return false;
      if (typeof f.includesGlassware === 'boolean' && !!p.includes_glassware !== f.includesGlassware) return false;
      if (typeof f.isNonAlcoholic === 'boolean' && !!p.is_non_alcoholic !== f.isNonAlcoholic) return false;
      if (typeof f.allowSameDayDelivery === 'boolean' && !!p.allow_same_day_delivery !== f.allowSameDayDelivery) return false;

      return true;
    });

    const sortMode = sortBy || 'relevance';
    if (sortMode === 'price_low_to_high') {
      results.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sortMode === 'price_high_to_low') {
      results.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    } else if (sortMode === 'rating_high_to_low') {
      results.sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    }

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = results.length;
    const start = (pg - 1) * size;
    const end = start + size;

    return {
      products: results.slice(start, end),
      totalCount: totalCount,
      page: pg,
      pageSize: size
    };
  }

  // --- Product Details & Related ---

  getProductDetails(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return {
        product: null,
        categoryName: null,
        styleName: null,
        isInWishlist: false,
        isInCart: false,
        deliveryEligibility: {
          sameDayAvailable: false,
          earliestDeliveryDate: null,
          allowScheduledDelivery: false
        }
      };
    }

    const categories = this._getFromStorage('categories');
    const wishlistItems = this._getFromStorage('wishlist_items');
    const cartItems = this._getFromStorage('cart_items');

    const category = categories.find(function (c) { return c.key === product.category_key; }) || null;
    const categoryName = category ? category.name : null;

    const styleName = this.STYLE_NAMES[product.style_key] || null;

    const isInWishlist = Array.isArray(wishlistItems)
      ? wishlistItems.some(function (wi) { return wi.product_id === product.id; })
      : false;

    const isInCart = Array.isArray(cartItems)
      ? cartItems.some(function (ci) { return ci.product_id === product.id; })
      : false;

    const session = this._getOrCreateCheckoutSession();
    const zone = this._resolveCurrentDeliveryZone(session);

    const sameDayAvailable = !!(product.allow_same_day_delivery && zone && zone.same_day_supported);
    const allowScheduledDelivery = !!(product.allow_scheduled_delivery && zone && zone.scheduled_delivery_supported);

    // Simple earliest delivery date heuristic
    const now = new Date();
    let earliestDate = now;
    if (!sameDayAvailable) {
      earliestDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      product: product,
      categoryName: categoryName,
      styleName: styleName,
      isInWishlist: isInWishlist,
      isInCart: isInCart,
      deliveryEligibility: {
        sameDayAvailable: sameDayAvailable,
        earliestDeliveryDate: earliestDate.toISOString(),
        allowScheduledDelivery: allowScheduledDelivery
      }
    };
  }

  getProductDeliveryOptions(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return { productId: productId, options: [] };
    }

    const session = this._getOrCreateCheckoutSession();
    const zone = this._resolveCurrentDeliveryZone(session);

    const methods = this._getFromStorage('delivery_methods');
    const options = [];

    const todayIso = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      if (!method || method.is_active === false) continue;

      // Respect product & zone capabilities
      if (method.method_type === 'same_day') {
        if (!(product.allow_same_day_delivery && zone && zone.same_day_supported)) continue;
      }
      if (method.method_type === 'scheduled') {
        if (!(product.allow_scheduled_delivery && zone && zone.scheduled_delivery_supported)) continue;
      }
      if (method.method_type === 'standard') {
        if (zone && zone.standard_delivery_available === false) continue;
      }
      if (method.method_type === 'expedited') {
        if (!(zone && zone.expedited_delivery_available)) continue;
      }

      const baseDays = method.estimated_min_days || 0;
      const baseDate = new Date();
      const earliest = new Date(baseDate.getTime() + baseDays * 24 * 60 * 60 * 1000);

      let label = method.name || '';
      if (method.method_type === 'same_day') {
        label += ' - arrives today';
      } else if (method.method_type === 'standard' || method.method_type === 'expedited' || method.method_type === 'scheduled') {
        const d = earliest.toISOString().slice(0, 10);
        if (d === todayIso) {
          label += ' - arrives today';
        } else {
          label += ' - arrives by ' + d;
        }
      }

      options.push({
        methodType: method.method_type,
        label: label,
        earliestDeliveryDate: earliest.toISOString(),
        price: typeof method.base_price === 'number' ? method.base_price : 0
      });
    }

    return { productId: productId, options: options };
  }

  getRelatedProducts(productId) {
    const product = this._findProductById(productId);
    if (!product) return [];

    const products = this._getFromStorage('products');
    if (!Array.isArray(products)) return [];

    const related = products.filter(function (p) {
      if (p.id === product.id) return false;
      if (p.status && p.status !== 'active') return false;
      return p.category_key === product.category_key && p.style_key === product.style_key;
    });

    return related.slice(0, 10);
  }

  // --- Cart ---

  addToCart(productId, quantity, giftOptions, deliveryPreferences) {
    const product = this._findProductById(productId);
    if (!product) {
      return { success: false, cart: null, addedItem: null, message: 'Product not found.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];

    const now = new Date().toISOString();

    const gift = giftOptions || {};
    const delivery = deliveryPreferences || {};

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      quantity: qty,
      unit_price: product.price,
      line_subtotal: product.price * qty,
      gift_wrap_selected: !!gift.giftWrapSelected,
      gift_message: gift.giftMessage || null,
      preferred_delivery_date: delivery.preferredDeliveryDate || null,
      preferred_delivery_method_type: delivery.preferredDeliveryMethodType || null
    };

    cartItems.push(cartItem);

    // Update cart item_ids
    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);
    cart.updated_at = now;

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const updatedCart = this._findCartById(cart.id);

    return {
      success: true,
      cart: updatedCart,
      addedItem: cartItem,
      message: 'Item added to cart.'
    };
  }

  getCartDetails() {
    const carts = this._getFromStorage('cart');
    const cart = Array.isArray(carts) && carts.length > 0 ? carts[0] : null;

    const products = this._getFromStorage('products');
    const cartItems = this._getFromStorage('cart_items');

    let items = [];
    if (cart) {
      const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
      items = itemsForCart.map(function (ci) {
        const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
        return {
          cartItem: ci,
          product: product
        };
      });
    }

    // Resolve applied promo from any in-progress checkout for this cart
    const sessions = this._getFromStorage('checkout_sessions');
    const promos = this._getFromStorage('promocodes');
    let appliedPromo = null;

    if (cart && Array.isArray(sessions)) {
      const session = sessions.find(function (s) {
        return s.cart_id === cart.id && s.status === 'in_progress' && s.applied_promo_code_id;
      });
      if (session) {
        appliedPromo = promos.find(function (p) { return p.id === session.applied_promo_code_id; }) || null;
      }
    }

    return {
      cart: cart,
      items: items,
      appliedPromoCode: appliedPromo
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      const carts = this._getFromStorage('cart');
      return { cart: carts[0] || null, items: [] };
    }

    const item = cartItems[idx];

    if (quantity <= 0) {
      // Delegate to removeCartItem
      return this.removeCartItem(cartItemId);
    }

    item.quantity = quantity;
    item.line_subtotal = (item.unit_price || 0) * quantity;

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._findCartById(item.cart_id);
    if (cart) this._recalculateCartTotals(cart);

    const updatedCart = cart ? this._findCartById(cart.id) : null;
    const products = this._getFromStorage('products');

    const itemsForCart = cartItems.filter(function (ci) {
      return cart && ci.cart_id === cart.id;
    });

    const items = itemsForCart.map(function (ci) {
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      return {
        cartItem: ci,
        product: product
      };
    });

    return {
      cart: updatedCart,
      items: items
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      const carts = this._getFromStorage('cart');
      return { cart: carts[0] || null, items: [] };
    }

    const item = cartItems[idx];
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._findCartById(item.cart_id);
    if (cart && Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter(function (id) { return id !== cartItemId; });
      this._recalculateCartTotals(cart);
    }

    const updatedCart = cart ? this._findCartById(cart.id) : null;
    const products = this._getFromStorage('products');

    const itemsForCart = cartItems.filter(function (ci) {
      return cart && ci.cart_id === cart.id;
    });

    const items = itemsForCart.map(function (ci) {
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      return {
        cartItem: ci,
        product: product
      };
    });

    return {
      cart: updatedCart,
      items: items
    };
  }

  // --- Checkout & Shipping ---

  initCheckoutForCurrentCart() {
    return this._getOrCreateCheckoutSession();
  }

  updateCheckoutShippingAddress(shipping) {
    const session = this._getOrCreateCheckoutSession();

    const s = shipping || {};

    session.shipping_name = s.name || null;
    session.shipping_street = s.street || null;
    session.shipping_city = s.city || null;
    session.shipping_state = s.state || null;
    session.shipping_zip = s.zip || null;
    session.shipping_phone = s.phone || null;

    // Resolve delivery zone from ZIP
    let zone = null;
    if (session.shipping_zip) {
      zone = this._getOrCreateDeliveryZone(session.shipping_zip);
      session.delivery_zone_id = zone.id;

      // Optionally sync location_settings as well
      let settings = this._getFromStorage('location_settings');
      if (!Array.isArray(settings)) settings = [];
      const now = new Date().toISOString();
      if (settings.length === 0) {
        settings.push({
          id: this._generateId('location_setting'),
          current_zip_code: session.shipping_zip,
          delivery_zone_id: zone.id,
          selected_at: now
        });
      } else {
        settings[0].current_zip_code = session.shipping_zip;
        settings[0].delivery_zone_id = zone.id;
        settings[0].selected_at = now;
      }
      this._saveToStorage('location_settings', settings);
    }

    this._updateCheckoutSessionTotals(session);

    // Persist session
    let sessions = this._getFromStorage('checkout_sessions');
    if (!Array.isArray(sessions)) sessions = [];
    const idx = sessions.findIndex(function (cs) { return cs.id === session.id; });
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('checkout_sessions', sessions);

    return {
      checkoutSession: session,
      deliveryZone: zone
    };
  }

  getAvailableDeliveryDates() {
    const session = this._getOrCreateCheckoutSession();
    const zone = this._resolveCurrentDeliveryZone(session);

    const dates = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const isoDate = d.toISOString().slice(0, 10);
      const isFriday = d.getUTCDay() === 5 || d.getDay() === 5;
      const supportedMethodTypes = this._getSupportedMethodTypesForDate(zone, isoDate);

      dates.push({
        date: isoDate,
        isFriday: isFriday,
        supportedMethodTypes: supportedMethodTypes
      });
    }

    return { dates: dates };
  }

  getShippingOptionsForDate(deliveryDate) {
    const session = this._getOrCreateCheckoutSession();
    // Also set session.delivery_date
    if (deliveryDate) {
      const dt = new Date(deliveryDate + 'T12:00:00Z').toISOString();
      session.delivery_date = dt;
      let sessions = this._getFromStorage('checkout_sessions');
      if (!Array.isArray(sessions)) sessions = [];
      const idx = sessions.findIndex(function (cs) { return cs.id === session.id; });
      if (idx >= 0) {
        sessions[idx] = session;
      } else {
        sessions.push(session);
      }
      this._saveToStorage('checkout_sessions', sessions);
    }

    const newOptions = this._calculateShippingOptionsForSession(session, deliveryDate);

    // newOptions already have deliveryMethod resolved
    return newOptions;
  }

  selectShippingOption(shippingOptionId) {
    let options = this._getFromStorage('shipping_options');
    if (!Array.isArray(options)) options = [];

    const option = options.find(function (o) { return o.id === shippingOptionId; }) || null;
    if (!option) {
      return this._getOrCreateCheckoutSession();
    }

    // Update selection flags
    options = options.map(function (o) {
      if (o.checkout_session_id === option.checkout_session_id) {
        o.is_selected = o.id === option.id;
      }
      return o;
    });
    this._saveToStorage('shipping_options', options);

    // Update checkout session
    let sessions = this._getFromStorage('checkout_sessions');
    if (!Array.isArray(sessions)) sessions = [];
    const idx = sessions.findIndex(function (cs) { return cs.id === option.checkout_session_id; });
    let session = idx >= 0 ? sessions[idx] : null;
    if (!session) {
      session = this._getOrCreateCheckoutSession();
    }

    session.selected_shipping_option_id = option.id;
    session.shipping_cost = option.price || 0;

    this._updateCheckoutSessionTotals(session);

    // persist
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('checkout_sessions', sessions);

    return session;
  }

  applyPromoCode(code) {
    const normalizedCode = String(code || '').trim().toLowerCase();
    const promos = this._getFromStorage('promocodes');
    if (!Array.isArray(promos) || !normalizedCode) {
      return {
        success: false,
        message: 'Promo code not found.',
        checkoutSession: this._getOrCreateCheckoutSession(),
        appliedPromo: null
      };
    }

    const now = new Date();

    const promo = promos.find(function (p) {
      if (!p || !p.code) return false;
      if (String(p.code).toLowerCase() !== normalizedCode) return false;
      if (p.status && p.status !== 'active') return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    }) || null;

    const session = this._getOrCreateCheckoutSession();

    if (!promo) {
      return {
        success: false,
        message: 'Promo code is invalid or expired.',
        checkoutSession: session,
        appliedPromo: null
      };
    }

    this._applyPromoCodeToCheckoutSession(session, promo);

    return {
      success: true,
      message: 'Promo code applied.',
      checkoutSession: session,
      appliedPromo: promo
    };
  }

  getCheckoutSummary() {
    const session = this._getOrCreateCheckoutSession();
    const cart = this._findCartById(session.cart_id);

    const products = this._getFromStorage('products');
    const cartItems = this._getFromStorage('cart_items');

    const items = cartItems
      .filter(function (ci) { return cart && ci.cart_id === cart.id; })
      .map(function (ci) {
        const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
        return {
          cartItem: ci,
          product: product
        };
      });

    const shippingOptionsRaw = this._getFromStorage('shipping_options');
    const deliveryMethods = this._getFromStorage('delivery_methods');

    const shippingOptions = shippingOptionsRaw
      .filter(function (so) { return so.checkout_session_id === session.id; })
      .map(function (so) {
        const dm = deliveryMethods.find(function (m) { return m.id === so.delivery_method_id; }) || null;
        return Object.assign({}, so, { deliveryMethod: dm });
      });

    return {
      checkoutSession: session,
      cart: cart,
      items: items,
      shippingOptions: shippingOptions
    };
  }

  // --- Wishlist ---

  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const products = this._getFromStorage('products');
    const wishlistItems = this._getFromStorage('wishlist_items');

    const itemsForWishlist = wishlistItems.filter(function (wi) {
      return wi.wishlist_id === wishlist.id;
    });

    const items = itemsForWishlist.map(function (wi) {
      const product = products.find(function (p) { return p.id === wi.product_id; }) || null;
      return {
        wishlistItem: wi,
        product: product
      };
    });

    return {
      wishlist: wishlist,
      items: items
    };
  }

  addProductToWishlist(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return {
        wishlist: this._getOrCreateWishlist(),
        wishlistItem: null
      };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    if (!Array.isArray(wishlistItems)) wishlistItems = [];

    let existing = wishlistItems.find(function (wi) {
      return wi.wishlist_id === wishlist.id && wi.product_id === product.id;
    }) || null;

    if (existing) {
      return {
        wishlist: wishlist,
        wishlistItem: existing
      };
    }

    const now = new Date().toISOString();

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      added_at: now,
      notes: null
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (!Array.isArray(wishlist.item_ids)) wishlist.item_ids = [];
    wishlist.item_ids.push(wishlistItem.id);
    wishlist.updated_at = now;

    let wishlists = this._getFromStorage('wishlist');
    if (!Array.isArray(wishlists)) wishlists = [];
    if (wishlists.length === 0) {
      wishlists.push(wishlist);
    } else {
      wishlists[0] = wishlist;
    }
    this._saveToStorage('wishlist', wishlists);

    return {
      wishlist: wishlist,
      wishlistItem: wishlistItem
    };
  }

  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    if (!Array.isArray(wishlistItems)) wishlistItems = [];

    const idx = wishlistItems.findIndex(function (wi) { return wi.id === wishlistItemId; });
    if (idx === -1) {
      return wishlist;
    }

    wishlistItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (Array.isArray(wishlist.item_ids)) {
      wishlist.item_ids = wishlist.item_ids.filter(function (id) { return id !== wishlistItemId; });
    }

    wishlist.updated_at = new Date().toISOString();
    let wishlists = this._getFromStorage('wishlist');
    if (!Array.isArray(wishlists)) wishlists = [];
    if (wishlists.length === 0) {
      wishlists.push(wishlist);
    } else {
      wishlists[0] = wishlist;
    }
    this._saveToStorage('wishlist', wishlists);

    return wishlist;
  }

  moveWishlistItemToCart(wishlistItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    let wishlistItems = this._getFromStorage('wishlist_items');
    if (!Array.isArray(wishlistItems)) wishlistItems = [];

    const wiIdx = wishlistItems.findIndex(function (wi) { return wi.id === wishlistItemId; });
    if (wiIdx === -1) {
      return {
        cart: this._getOrCreateCart(),
        wishlist: this._getOrCreateWishlist()
      };
    }

    const wishlistItem = wishlistItems[wiIdx];
    const productId = wishlistItem.product_id;

    // Add to cart
    this.addToCart(productId, qty);

    // Remove from wishlist
    wishlistItems.splice(wiIdx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlist = this._getOrCreateWishlist();
    if (Array.isArray(wishlist.item_ids)) {
      wishlist.item_ids = wishlist.item_ids.filter(function (id) { return id !== wishlistItemId; });
    }
    wishlist.updated_at = new Date().toISOString();

    let wishlists = this._getFromStorage('wishlist');
    if (!Array.isArray(wishlists)) wishlists = [];
    if (wishlists.length === 0) {
      wishlists.push(wishlist);
    } else {
      wishlists[0] = wishlist;
    }
    this._saveToStorage('wishlist', wishlists);

    const cart = this._getOrCreateCart();
    return {
      cart: cart,
      wishlist: wishlist
    };
  }

  // --- Static Pages & Contact ---

  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages');
    if (Array.isArray(pages)) {
      const page = pages.find(function (p) { return p.pageKey === pageKey; }) || null;
      if (page) return page;
    }

    // Fallback minimal content based on pageKey (no mock rich content)
    return {
      pageKey: pageKey,
      title: pageKey,
      sections: []
    };
  }

  submitContactForm(name, email, phone, subject, message, orderNumber) {
    const submission = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      phone: phone || null,
      subject: subject,
      message: message,
      orderNumber: orderNumber || null,
      submitted_at: new Date().toISOString()
    };

    let submissions = this._getFromStorage('contact_submissions');
    if (!Array.isArray(submissions)) submissions = [];
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  getDeliveryMethodsOverview() {
    const methods = this._getFromStorage('delivery_methods');
    return Array.isArray(methods) ? methods : [];
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
