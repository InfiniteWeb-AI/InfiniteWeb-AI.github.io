// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'users', // not used but kept from skeleton
      'products',
      'carts',
      'cart_items',
      'subscriptions',
      'addresses',
      'deliveries',
      'orders',
      'order_items',
      'promos',
      'help_articles',
      'site_settings',
      'contact_requests',
      'informational_pages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------------------- Label / enum helpers ----------------------

  _waterTypeLabel(type) {
    if (!type) return '';
    const map = {
      still: 'Still water',
      sparkling: 'Sparkling water',
      spring: 'Spring water',
      distilled: 'Distilled water',
      mineral: 'Mineral water',
      purified: 'Purified water'
    };
    return map[type] || type;
  }

  _sizeKeyToLabel(key) {
    const map = {
      '500_ml': '500 ml',
      '1_l': '1 L',
      '5_l': '5 L',
      '5_gallon': '5 Gallon'
    };
    return map[key] || key;
  }

  _packagingCategoryLabel(key) {
    const map = {
      bottled_cases: 'Bottled cases',
      refillable_jugs: 'Refillable jugs',
      dispenser_units: 'Dispenser units'
    };
    return map[key] || key;
  }

  _subscriptionFrequencyLabel(freq) {
    const map = {
      every_week: 'Every week',
      every_2_weeks: 'Every 2 weeks',
      every_4_weeks: 'Every 4 weeks',
      every_month: 'Every month'
    };
    return map[freq] || freq || '';
  }

  _dayOfWeekLabel(day) {
    const map = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return map[day] || day || '';
  }

  _deliveryTimeWindowLabel(window) {
    const map = {
      '09_00_12_00': '9:00 AM - 12:00 PM',
      '12_00_15_00': '12:00 PM - 3:00 PM',
      '15_00_18_00': '3:00 PM - 6:00 PM',
      '18_00_21_00': '6:00 PM - 9:00 PM'
    };
    return map[window] || window || '';
  }

  _rentalDurationLabel(duration) {
    const map = {
      '1_month': '1 month',
      '3_months': '3 months',
      '6_months': '6 months',
      '12_months': '12 months'
    };
    return map[duration] || duration || '';
  }

  _rentalDurationMonths(duration) {
    const map = {
      '1_month': 1,
      '3_months': 3,
      '6_months': 6,
      '12_months': 12
    };
    return map[duration] || 1;
  }

  _formatDateOnly(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    // Ignore pre-seeded task carts (ids starting with "cart_task") so runtime flows use a fresh cart
    let cart = carts.find((c) => c.status === 'open' && !(c.id && c.id.indexOf('cart_task') === 0));
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [], // cart item IDs
        applied_promo_id: null,
        applied_promo_code: null,
        subtotal: 0,
        discount_total: 0,
        total: 0,
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCartItems(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    return cartItems.filter((ci) => ci.cart_id === cartId);
  }

  _calculatePromoDiscount(promo, subtotal) {
    if (!promo) return 0;
    if (subtotal <= 0) return 0;

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (subtotal * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (promo.max_discount_amount != null && promo.max_discount_amount >= 0) {
      discount = Math.min(discount, promo.max_discount_amount);
    }

    discount = Math.min(discount, subtotal);
    return discount;
  }

  _validatePromoCodeForCart(promo, cart) {
    if (!promo) {
      return { valid: false, error_code: 'invalid_code', message: 'Promo code not found.' };
    }
    if (promo.status && promo.status !== 'active') {
      return { valid: false, error_code: 'not_applicable', message: 'Promo code is not active.' };
    }

    const cartItems = this._getCartItems(cart.id);
    const hasOneTime = cartItems.some((i) => i.item_type === 'one_time');
    const hasSubscription = cartItems.some((i) => i.item_type === 'subscription');
    const hasRental = cartItems.some((i) => i.item_type === 'rental');

    // Determine order type compatibility
    const type = promo.applicable_order_type;
    if (type === 'one_time_orders') {
      if (!hasOneTime || hasSubscription || hasRental) {
        return { valid: false, error_code: 'not_applicable', message: 'Promo applies only to one-time orders.' };
      }
    } else if (type === 'subscriptions') {
      if (!hasSubscription || hasOneTime || hasRental) {
        return { valid: false, error_code: 'not_applicable', message: 'Promo applies only to subscription orders.' };
      }
    } else if (type === 'rentals') {
      if (!hasRental || hasOneTime || hasSubscription) {
        return { valid: false, error_code: 'not_applicable', message: 'Promo applies only to rental orders.' };
      }
    } else if (type === 'all_orders') {
      // always allowed
    }

    const subtotal = cart.subtotal || 0;
    if (promo.minimum_order_amount != null && subtotal < promo.minimum_order_amount) {
      return { valid: false, error_code: 'minimum_not_met', message: 'Cart does not meet the minimum order amount for this promo.' };
    }

    const discount = this._calculatePromoDiscount(promo, subtotal);
    if (discount <= 0) {
      return { valid: false, error_code: 'not_applicable', message: 'Promo does not provide a discount for this cart.' };
    }

    return { valid: true, discount, error_code: null, message: 'Promo is valid.' };
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getCartItems(cart.id);
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.line_subtotal || 0;
    });

    cart.subtotal = subtotal;

    const promos = this._getFromStorage('promos', []);
    let appliedPromo = null;
    if (cart.applied_promo_id) {
      appliedPromo = promos.find((p) => p.id === cart.applied_promo_id) || null;
    }

    let discount_total = 0;
    if (appliedPromo) {
      const validation = this._validatePromoCodeForCart(appliedPromo, cart);
      if (validation.valid) {
        discount_total = validation.discount;
      } else {
        // Clear invalid promo
        cart.applied_promo_id = null;
        cart.applied_promo_code = null;
      }
    }

    cart.discount_total = discount_total;
    cart.total = Math.max(0, subtotal - discount_total);
    cart.updated_at = new Date().toISOString();

    // Persist cart
    let carts = this._getFromStorage('carts', []);
    carts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);

    return cart;
  }

  _buildCartSummary(cartId) {
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.id === cartId);
    if (!cart) {
      return null;
    }

    const cartItems = this._getCartItems(cart.id);
    const products = this._getFromStorage('products', []);
    const promos = this._getFromStorage('promos', []);

    const appliedPromo = cart.applied_promo_id
      ? promos.find((p) => p.id === cart.applied_promo_id) || null
      : null;

    const items = cartItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: product ? product.name : null,
        product_image_url: product ? product.image_url || null : null,
        product_size_label: product ? (product.size_label || this._sizeKeyToLabel(product.size_filter_key)) : null,
        product_water_type_label: product ? this._waterTypeLabel(product.water_type) : null,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_subtotal: item.line_subtotal,
        subscription_frequency: item.subscription_frequency || null,
        subscription_frequency_label: item.subscription_frequency ? this._subscriptionFrequencyLabel(item.subscription_frequency) : null,
        subscription_delivery_day_of_week: item.subscription_delivery_day_of_week || null,
        subscription_delivery_day_label: item.subscription_delivery_day_of_week ? this._dayOfWeekLabel(item.subscription_delivery_day_of_week) : null,
        rental_duration: item.rental_duration || null,
        rental_duration_label: item.rental_duration ? this._rentalDurationLabel(item.rental_duration) : null,
        // Foreign key resolution
        product: product
      };
    });

    const item_count = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

    return {
      id: cart.id,
      status: cart.status,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      item_count,
      applied_promo: appliedPromo
        ? {
            id: appliedPromo.id,
            name: appliedPromo.name,
            code: appliedPromo.code,
            discount_type: appliedPromo.discount_type,
            discount_value: appliedPromo.discount_value
          }
        : null,
      items
    };
  }

  // ---------------------- Delivery helpers ----------------------

  _getSiteSettingsRecord() {
    const settingsArr = this._getFromStorage('site_settings', []);
    let record = settingsArr[0] || null;
    if (!record) {
      // Ephemeral defaults (not persisted)
      record = {
        id: 'default',
        minimum_order_amount: 0,
        currency: 'USD',
        standard_delivery_time_windows: ['09_00_12_00', '12_00_15_00', '15_00_18_00', '18_00_21_00'],
        max_delivery_schedule_days_ahead: 30
      };
    } else {
      if (!Array.isArray(record.standard_delivery_time_windows) || record.standard_delivery_time_windows.length === 0) {
        record.standard_delivery_time_windows = ['09_00_12_00', '12_00_15_00', '15_00_18_00', '18_00_21_00'];
      }
      if (record.max_delivery_schedule_days_ahead == null) {
        record.max_delivery_schedule_days_ahead = 30;
      }
      if (!record.currency) {
        record.currency = 'USD';
      }
      if (record.minimum_order_amount == null) {
        record.minimum_order_amount = 0;
      }
    }
    return record;
  }

  _getAvailableDeliveryDates() {
    const settings = this._getSiteSettingsRecord();
    const today = new Date();
    const earliest = this._formatDateOnly(today);
    const maxAhead = settings.max_delivery_schedule_days_ahead || 30;
    const timeWindows = settings.standard_delivery_time_windows || ['09_00_12_00', '12_00_15_00', '15_00_18_00', '18_00_21_00'];
    return {
      earliest_available_date: earliest,
      max_schedule_days_ahead: maxAhead,
      standard_delivery_time_windows: timeWindows
    };
  }

  // ---------------------- PUBLIC INTERFACES ----------------------

  // getHomepageSummary()
  getHomepageSummary() {
    const products = this._getFromStorage('products', []);
    const promos = this._getFromStorage('promos', []);
    const settings = this._getSiteSettingsRecord();

    const featuredProducts = products
      .filter((p) => p.status === 'active')
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        short_description: (p.description || '').slice(0, 120),
        category_id: p.category_id,
        category_name: p.category_id === 'water' ? 'Water' : (p.category_id === 'dispensers' ? 'Dispensers & Coolers' : p.category_id),
        water_type: p.water_type || null,
        water_type_label: this._waterTypeLabel(p.water_type),
        size_label: p.size_label || this._sizeKeyToLabel(p.size_filter_key),
        price: p.price,
        currency: p.currency || settings.currency || 'USD',
        rating: p.rating || null,
        rating_count: p.rating_count || 0,
        is_eco_friendly: !!p.is_eco_friendly,
        is_bpa_free: !!p.is_bpa_free,
        badges: p.badges || [],
        is_subscription_available: !!p.is_subscription_available,
        is_rental_product: !!p.is_rental_product,
        image_url: p.image_url || null
      }));

    const featuredPromos = promos
      .filter((pr) => pr.status === 'active')
      .slice(0, 5)
      .map((pr) => ({
        id: pr.id,
        name: pr.name,
        short_label: pr.short_label || pr.name,
        code: pr.code,
        discount_type: pr.discount_type,
        discount_value: pr.discount_value,
        applicable_order_type: pr.applicable_order_type,
        description: pr.description || ''
      }));

    return {
      featured_products: featuredProducts,
      featured_promos: featuredPromos,
      search_placeholder: 'Search for water, dispensers, or brands',
      minimum_order_amount: settings.minimum_order_amount,
      currency: settings.currency
    };
  }

  // getProductFilterOptions(categoryId)
  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []);
    const filtered = products.filter((p) => p.category_id === categoryId && p.status === 'active');

    const sizeMap = new Map();
    const waterTypeMap = new Map();
    const packagingMap = new Map();
    let minPrice = null;
    let maxPrice = null;

    let ecoFriendlyAvailable = false;
    let bpaFreeAvailable = false;
    let rentalFiltersAvailable = false;
    let subscriptionFiltersAvailable = false;

    filtered.forEach((p) => {
      if (p.size_filter_key) {
        if (!sizeMap.has(p.size_filter_key)) {
          sizeMap.set(p.size_filter_key, this._sizeKeyToLabel(p.size_filter_key));
        }
      }
      if (p.water_type) {
        if (!waterTypeMap.has(p.water_type)) {
          waterTypeMap.set(p.water_type, this._waterTypeLabel(p.water_type));
        }
      }
      if (p.packaging_category) {
        if (!packagingMap.has(p.packaging_category)) {
          packagingMap.set(p.packaging_category, this._packagingCategoryLabel(p.packaging_category));
        }
      }
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (p.is_eco_friendly) ecoFriendlyAvailable = true;
      if (p.is_bpa_free) bpaFreeAvailable = true;
      if (p.is_rental_product) rentalFiltersAvailable = true;
      if (p.is_subscription_available) subscriptionFiltersAvailable = true;
    });

    const size_options = Array.from(sizeMap.entries()).map(([key, label]) => ({ key, label }));
    const water_type_options = Array.from(waterTypeMap.entries()).map(([key, label]) => ({ key, label }));
    const packaging_category_options = Array.from(packagingMap.entries()).map(([key, label]) => ({ key, label }));

    const rating_options = [
      { min_value: 0, label: 'All ratings' },
      { min_value: 3, label: '3.0 stars & up' },
      { min_value: 4, label: '4.0 stars & up' },
      { min_value: 4.5, label: '4.5 stars & up' }
    ];

    const settings = this._getSiteSettingsRecord();

    return {
      size_options,
      water_type_options,
      packaging_category_options,
      price_range: {
        min_price: minPrice != null ? minPrice : 0,
        max_price: maxPrice != null ? maxPrice : 0,
        currency: settings.currency
      },
      rating_options,
      eco_friendly_available: ecoFriendlyAvailable,
      bpa_free_available: bpaFreeAvailable,
      rental_filters_available: rentalFiltersAvailable,
      subscription_filters_available: subscriptionFiltersAvailable
    };
  }

  // listProducts(categoryId, page, pageSize, sortBy, sortDirection, filters)
  listProducts(categoryId, page, pageSize, sortBy, sortDirection, filters) {
    const settings = this._getSiteSettingsRecord();
    let products = this._getFromStorage('products', []);
    products = products.filter((p) => p.category_id === categoryId && p.status === 'active');

    const appliedFilters = {
      waterTypes: [],
      sizeFilterKeys: [],
      packagingCategories: [],
      priceMin: undefined,
      priceMax: undefined,
      ratingMin: undefined,
      ecoFriendly: undefined,
      bpaFree: undefined,
      isCase: undefined,
      isRental: undefined,
      isSubscriptionAvailable: undefined,
      isOneTimePurchaseAvailable: undefined
    };

    if (filters && typeof filters === 'object') {
      if (filters.waterTypes && filters.waterTypes.length) {
        appliedFilters.waterTypes = filters.waterTypes.slice();
        products = products.filter((p) => p.water_type && filters.waterTypes.includes(p.water_type));
      }
      if (filters.sizeFilterKeys && filters.sizeFilterKeys.length) {
        appliedFilters.sizeFilterKeys = filters.sizeFilterKeys.slice();
        products = products.filter((p) => p.size_filter_key && filters.sizeFilterKeys.includes(p.size_filter_key));
      }
      if (filters.packagingCategories && filters.packagingCategories.length) {
        appliedFilters.packagingCategories = filters.packagingCategories.slice();
        products = products.filter((p) => p.packaging_category && filters.packagingCategories.includes(p.packaging_category));
      }
      if (typeof filters.priceMin === 'number') {
        appliedFilters.priceMin = filters.priceMin;
        products = products.filter((p) => typeof p.price === 'number' && p.price >= filters.priceMin);
      }
      if (typeof filters.priceMax === 'number') {
        appliedFilters.priceMax = filters.priceMax;
        products = products.filter((p) => typeof p.price === 'number' && p.price <= filters.priceMax);
      }
      if (typeof filters.ratingMin === 'number') {
        appliedFilters.ratingMin = filters.ratingMin;
        products = products.filter((p) => typeof p.rating === 'number' && p.rating >= filters.ratingMin);
      }
      if (typeof filters.ecoFriendly === 'boolean') {
        appliedFilters.ecoFriendly = filters.ecoFriendly;
        products = products.filter((p) => !!p.is_eco_friendly === filters.ecoFriendly);
      }
      if (typeof filters.bpaFree === 'boolean') {
        appliedFilters.bpaFree = filters.bpaFree;
        products = products.filter((p) => !!p.is_bpa_free === filters.bpaFree);
      }
      if (typeof filters.isCase === 'boolean') {
        appliedFilters.isCase = filters.isCase;
        products = products.filter((p) => !!p.is_case === filters.isCase);
      }
      if (typeof filters.isRental === 'boolean') {
        appliedFilters.isRental = filters.isRental;
        products = products.filter((p) => !!p.is_rental_product === filters.isRental);
      }
      if (typeof filters.isSubscriptionAvailable === 'boolean') {
        appliedFilters.isSubscriptionAvailable = filters.isSubscriptionAvailable;
        products = products.filter((p) => !!p.is_subscription_available === filters.isSubscriptionAvailable);
      }
      if (typeof filters.isOneTimePurchaseAvailable === 'boolean') {
        appliedFilters.isOneTimePurchaseAvailable = filters.isOneTimePurchaseAvailable;
        products = products.filter((p) => !!p.is_one_time_purchase_available === filters.isOneTimePurchaseAvailable);
      }
    }

    // Sorting
    const sb = sortBy || 'name';
    const sd = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    products.sort((a, b) => {
      let av;
      let bv;
      if (sb === 'price') {
        av = typeof a.price === 'number' ? a.price : 0;
        bv = typeof b.price === 'number' ? b.price : 0;
      } else if (sb === 'rating') {
        av = typeof a.rating === 'number' ? a.rating : 0;
        bv = typeof b.rating === 'number' ? b.rating : 0;
      } else if (sb === 'name') {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
      } else {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
      }
      if (av < bv) return sd === 'asc' ? -1 : 1;
      if (av > bv) return sd === 'asc' ? 1 : -1;
      return 0;
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ps));
    const start = (p - 1) * ps;
    const paginated = products.slice(start, start + ps);

    const resultProducts = paginated.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      category_id: p.category_id,
      category_name: p.category_id === 'water' ? 'Water' : (p.category_id === 'dispensers' ? 'Dispensers & Coolers' : p.category_id),
      water_type: p.water_type || null,
      water_type_label: this._waterTypeLabel(p.water_type),
      size_filter_key: p.size_filter_key || null,
      size_label: p.size_label || this._sizeKeyToLabel(p.size_filter_key),
      is_case: !!p.is_case,
      case_bottle_count: p.case_bottle_count || null,
      case_bottle_volume_liters: p.case_bottle_volume_liters || null,
      packaging_category: p.packaging_category || null,
      price: p.price,
      currency: p.currency || settings.currency,
      rating: p.rating || null,
      rating_count: p.rating_count || 0,
      is_eco_friendly: !!p.is_eco_friendly,
      is_bpa_free: !!p.is_bpa_free,
      tags: p.tags || [],
      badges: p.badges || [],
      is_subscription_available: !!p.is_subscription_available,
      is_one_time_purchase_available: !!p.is_one_time_purchase_available,
      is_rental_product: !!p.is_rental_product,
      rental_price_per_month: p.rental_price_per_month || null,
      image_url: p.image_url || null
    }));

    return {
      products: resultProducts,
      pagination: {
        page: p,
        pageSize: ps,
        totalPages,
        totalItems
      },
      appliedFilters
    };
  }

  // searchProducts(query, page, pageSize, sortBy, sortDirection, filters)
  searchProducts(query, page, pageSize, sortBy, sortDirection, filters) {
    const q = (query || '').toLowerCase().trim();
    const settings = this._getSiteSettingsRecord();
    let products = this._getFromStorage('products', []);
    products = products.filter((p) => p.status === 'active');

    if (q) {
      products = products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        const sizeLabel = (p.size_label || this._sizeKeyToLabel(p.size_filter_key)).toLowerCase();
        return (
          name.includes(q) ||
          desc.includes(q) ||
          tags.includes(q) ||
          sizeLabel.includes(q)
        );
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.waterTypes && filters.waterTypes.length) {
        products = products.filter((p) => p.water_type && filters.waterTypes.includes(p.water_type));
      }
      if (filters.sizeFilterKeys && filters.sizeFilterKeys.length) {
        products = products.filter((p) => p.size_filter_key && filters.sizeFilterKeys.includes(p.size_filter_key));
      }
      if (filters.packagingCategories && filters.packagingCategories.length) {
        products = products.filter((p) => p.packaging_category && filters.packagingCategories.includes(p.packaging_category));
      }
      if (typeof filters.priceMin === 'number') {
        products = products.filter((p) => typeof p.price === 'number' && p.price >= filters.priceMin);
      }
      if (typeof filters.priceMax === 'number') {
        products = products.filter((p) => typeof p.price === 'number' && p.price <= filters.priceMax);
      }
      if (typeof filters.ratingMin === 'number') {
        products = products.filter((p) => typeof p.rating === 'number' && p.rating >= filters.ratingMin);
      }
      if (typeof filters.ecoFriendly === 'boolean') {
        products = products.filter((p) => !!p.is_eco_friendly === filters.ecoFriendly);
      }
      if (typeof filters.bpaFree === 'boolean') {
        products = products.filter((p) => !!p.is_bpa_free === filters.bpaFree);
      }
      if (typeof filters.isRental === 'boolean') {
        products = products.filter((p) => !!p.is_rental_product === filters.isRental);
      }
      if (typeof filters.isSubscriptionAvailable === 'boolean') {
        products = products.filter((p) => !!p.is_subscription_available === filters.isSubscriptionAvailable);
      }
      if (typeof filters.isOneTimePurchaseAvailable === 'boolean') {
        products = products.filter((p) => !!p.is_one_time_purchase_available === filters.isOneTimePurchaseAvailable);
      }
    }

    const sb = sortBy || 'relevance';
    const sd = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    products.sort((a, b) => {
      if (sb === 'price') {
        const av = typeof a.price === 'number' ? a.price : 0;
        const bv = typeof b.price === 'number' ? b.price : 0;
        if (av < bv) return sd === 'asc' ? -1 : 1;
        if (av > bv) return sd === 'asc' ? 1 : -1;
        return 0;
      } else if (sb === 'rating') {
        const av = typeof a.rating === 'number' ? a.rating : 0;
        const bv = typeof b.rating === 'number' ? b.rating : 0;
        if (av < bv) return sd === 'asc' ? -1 : 1;
        if (av > bv) return sd === 'asc' ? 1 : -1;
        return 0;
      } else {
        // relevance or unknown: keep as-is (already filtered by query)
        return 0;
      }
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ps));
    const start = (p - 1) * ps;
    const paginated = products.slice(start, start + ps);

    const resultProducts = paginated.map((pr) => ({
      id: pr.id,
      name: pr.name,
      description: pr.description || '',
      category_id: pr.category_id,
      category_name: pr.category_id === 'water' ? 'Water' : (pr.category_id === 'dispensers' ? 'Dispensers & Coolers' : pr.category_id),
      water_type: pr.water_type || null,
      water_type_label: this._waterTypeLabel(pr.water_type),
      size_filter_key: pr.size_filter_key || null,
      size_label: pr.size_label || this._sizeKeyToLabel(pr.size_filter_key),
      is_case: !!pr.is_case,
      case_bottle_count: pr.case_bottle_count || null,
      case_bottle_volume_liters: pr.case_bottle_volume_liters || null,
      packaging_category: pr.packaging_category || null,
      price: pr.price,
      currency: pr.currency || settings.currency,
      rating: pr.rating || null,
      rating_count: pr.rating_count || 0,
      is_eco_friendly: !!pr.is_eco_friendly,
      is_bpa_free: !!pr.is_bpa_free,
      tags: pr.tags || [],
      badges: pr.badges || [],
      is_subscription_available: !!pr.is_subscription_available,
      is_one_time_purchase_available: !!pr.is_one_time_purchase_available,
      is_rental_product: !!pr.is_rental_product,
      rental_price_per_month: pr.rental_price_per_month || null,
      image_url: pr.image_url || null
    }));

    return {
      products: resultProducts,
      pagination: {
        page: p,
        pageSize: ps,
        totalPages,
        totalItems
      }
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const settings = this._getSiteSettingsRecord();
    const products = this._getFromStorage('products', []);
    let product = products.find((p) => p.id === productId) || null;

    // If the product is not present in the catalog, try to infer it from historical order items.
    if (!product) {
      const orderItems = this._getFromStorage('order_items', []);
      // Prefer rental definition when available
      const rentalItem = orderItems.find(
        (oi) => oi.product_id === productId && oi.item_type === 'rental'
      );
      if (rentalItem) {
        product = {
          id: productId,
          name: 'Water dispenser rental',
          description: '',
          category_id: 'dispensers',
          water_type: null,
          size_filter_key: null,
          size_label: null,
          volume_liters: null,
          is_case: false,
          case_bottle_count: null,
          case_bottle_volume_liters: null,
          packaging_category: null,
          price: rentalItem.unit_price,
          currency: settings.currency,
          status: 'active',
          rating: null,
          rating_count: 0,
          is_eco_friendly: false,
          is_bpa_free: false,
          tags: [],
          badges: [],
          is_subscription_available: false,
          is_one_time_purchase_available: false,
          is_rental_product: true,
          rental_price_per_month: rentalItem.unit_price,
          allowed_rental_durations: ['1_month', '3_months', '6_months', '12_months'],
          allowed_subscription_frequencies: [],
          image_url: null
        };
        // Persist inferred rental product so subsequent calls (e.g., addItemToCart) can find it
        products.push(product);
        this._saveToStorage('products', products);
      } else {
        // Fallback: infer a basic water product from any matching order item
        const anyItem = orderItems.find((oi) => oi.product_id === productId);
        if (anyItem) {
          product = {
            id: productId,
            name: 'Water product',
            description: '',
            category_id: 'water',
            water_type: 'still',
            size_filter_key: '5_gallon',
            size_label: '5 Gallon',
            volume_liters: 18.9,
            is_case: false,
            case_bottle_count: null,
            case_bottle_volume_liters: null,
            packaging_category: 'refillable_jugs',
            price: anyItem.unit_price,
            currency: settings.currency,
            status: 'active',
            rating: null,
            rating_count: 0,
            is_eco_friendly: false,
            is_bpa_free: true,
            tags: [],
            badges: [],
            is_subscription_available: true,
            is_one_time_purchase_available: true,
            is_rental_product: false,
            rental_price_per_month: 0,
            allowed_rental_durations: [],
            allowed_subscription_frequencies: ['every_week', 'every_2_weeks', 'every_4_weeks'],
            image_url: null
          };
          products.push(product);
          this._saveToStorage('products', products);
        } else {
          return { product: null, purchase_options: null };
        }
      }
    }

    const productObj = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      category_name: product.category_id === 'water' ? 'Water' : (product.category_id === 'dispensers' ? 'Dispensers & Coolers' : product.category_id),
      water_type: product.water_type || null,
      water_type_label: this._waterTypeLabel(product.water_type),
      size_filter_key: product.size_filter_key || null,
      size_label: product.size_label || this._sizeKeyToLabel(product.size_filter_key),
      volume_liters: product.volume_liters || null,
      is_case: !!product.is_case,
      case_bottle_count: product.case_bottle_count || null,
      case_bottle_volume_liters: product.case_bottle_volume_liters || null,
      packaging_category: product.packaging_category || null,
      packaging_category_label: this._packagingCategoryLabel(product.packaging_category),
      price: product.price,
      currency: product.currency || settings.currency,
      rating: product.rating || null,
      rating_count: product.rating_count || 0,
      is_eco_friendly: !!product.is_eco_friendly,
      is_bpa_free: !!product.is_bpa_free,
      tags: product.tags || [],
      badges: product.badges || [],
      is_subscription_available: !!product.is_subscription_available,
      is_one_time_purchase_available: !!product.is_one_time_purchase_available,
      is_rental_product: !!product.is_rental_product,
      rental_price_per_month: product.rental_price_per_month || null,
      allowed_rental_durations: product.allowed_rental_durations || [],
      allowed_subscription_frequencies: product.allowed_subscription_frequencies || [],
      image_url: product.image_url || null
    };

    const subscriptionFrequencyOptions = (product.allowed_subscription_frequencies || [
      'every_week',
      'every_2_weeks',
      'every_4_weeks',
      'every_month'
    ]).map((v) => ({ value: v, label: this._subscriptionFrequencyLabel(v) }));

    const deliveryDayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => ({
      value: d,
      label: this._dayOfWeekLabel(d)
    }));

    const rentalDurationOptions = (product.allowed_rental_durations || ['1_month', '3_months', '6_months', '12_months']).map((d) => ({
      value: d,
      label: this._rentalDurationLabel(d)
    }));

    const purchase_options = {
      can_one_time: !!product.is_one_time_purchase_available,
      can_subscription: !!product.is_subscription_available,
      can_rental: !!product.is_rental_product,
      subscription_frequency_options: subscriptionFrequencyOptions,
      delivery_day_options: deliveryDayOptions,
      rental_duration_options: rentalDurationOptions,
      default_quantity: 1
    };

    return { product: productObj, purchase_options };
  }

  // addItemToCart(productId, itemType, quantity, subscriptionFrequency, subscriptionDeliveryDayOfWeek, rentalDuration)
  addItemToCart(productId, itemType, quantity, subscriptionFrequency, subscriptionDeliveryDayOfWeek, rentalDuration) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found.', cart: null };
    }

    const type = itemType;
    if (!['one_time', 'subscription', 'rental'].includes(type)) {
      return { success: false, message: 'Invalid item type.', cart: null };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    if (type === 'subscription') {
      if (!product.is_subscription_available) {
        return { success: false, message: 'Subscription not available for this product.', cart: null };
      }
      if (!subscriptionFrequency) {
        return { success: false, message: 'Subscription frequency is required.', cart: null };
      }
      if (!subscriptionDeliveryDayOfWeek) {
        return { success: false, message: 'Subscription delivery day is required.', cart: null };
      }
      if (Array.isArray(product.allowed_subscription_frequencies) && product.allowed_subscription_frequencies.length) {
        if (!product.allowed_subscription_frequencies.includes(subscriptionFrequency)) {
          return { success: false, message: 'Selected subscription frequency is not allowed for this product.', cart: null };
        }
      }
    }

    if (type === 'rental') {
      if (!product.is_rental_product) {
        return { success: false, message: 'Rental not available for this product.', cart: null };
      }
      if (!rentalDuration) {
        return { success: false, message: 'Rental duration is required.', cart: null };
      }
      if (Array.isArray(product.allowed_rental_durations) && product.allowed_rental_durations.length) {
        if (!product.allowed_rental_durations.includes(rentalDuration)) {
          return { success: false, message: 'Selected rental duration is not allowed for this product.', cart: null };
        }
      }
    }

    let cart = this._getOrCreateCart();

    const now = new Date().toISOString();
    let unit_price = 0;
    if (type === 'rental') {
      unit_price = product.rental_price_per_month || 0;
    } else {
      unit_price = product.price || 0;
    }

    let line_subtotal = 0;
    if (type === 'rental') {
      const months = this._rentalDurationMonths(rentalDuration);
      line_subtotal = unit_price * months * qty;
    } else {
      line_subtotal = unit_price * qty;
    }

    const cartItems = this._getFromStorage('cart_items', []);

    const newItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: productId,
      item_type: type,
      quantity: qty,
      unit_price,
      line_subtotal,
      subscription_frequency: type === 'subscription' ? subscriptionFrequency : null,
      subscription_delivery_day_of_week: type === 'subscription' ? subscriptionDeliveryDayOfWeek : null,
      rental_duration: type === 'rental' ? rentalDuration : null,
      created_at: now,
      updated_at: now
    };

    cartItems.push(newItem);
    this._saveToStorage('cart_items', cartItems);

    // Maintain cart.items as list of cart_item IDs
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    cart.items.push(newItem.id);

    cart = this._recalculateCartTotals(cart);

    const summary = this._buildCartSummary(cart.id);

    return {
      success: true,
      message: 'Item added to cart.',
      cart: summary
    };
  }

  // getCartSummary()
  getCartSummary() {
    const settings = this._getSiteSettingsRecord();
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(updatedCart.id);
    return {
      id: summary.id,
      status: summary.status,
      subtotal: summary.subtotal,
      discount_total: summary.discount_total,
      total: summary.total,
      item_count: summary.item_count,
      applied_promo: summary.applied_promo,
      items: summary.items,
      minimum_order_amount: settings.minimum_order_amount,
      currency: settings.currency
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = typeof quantity === 'number' ? quantity : 0;
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId) || null;
    if (!item) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    if (qty <= 0) {
      // Remove item
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', cartItems);
    } else {
      item.quantity = qty;
      if (item.item_type === 'rental') {
        const products = this._getFromStorage('products', []);
        const product = products.find((p) => p.id === item.product_id) || null;
        const unit_price = product ? (product.rental_price_per_month || 0) : item.unit_price || 0;
        item.unit_price = unit_price;
        const months = this._rentalDurationMonths(item.rental_duration);
        item.line_subtotal = unit_price * months * qty;
      } else {
        const products = this._getFromStorage('products', []);
        const product = products.find((p) => p.id === item.product_id) || null;
        const unit_price = product ? (product.price || 0) : item.unit_price || 0;
        item.unit_price = unit_price;
        item.line_subtotal = unit_price * qty;
      }
      item.updated_at = new Date().toISOString();
      cartItems = cartItems.map((ci) => (ci.id === item.id ? item : ci));
      this._saveToStorage('cart_items', cartItems);
    }

    // Recalculate cart
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(updatedCart.id);

    return {
      success: true,
      message: 'Cart updated.',
      cart: {
        id: summary.id,
        status: summary.status,
        subtotal: summary.subtotal,
        discount_total: summary.discount_total,
        total: summary.total,
        item_count: summary.item_count,
        items: summary.items
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId) || null;
    if (!item) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    // Update cart.items list
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find((c) => c.id === item.cart_id) || null;
    if (!cart) {
      cart = this._getOrCreateCart();
    } else {
      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }
      cart.items = cart.items.filter((id) => id !== cartItemId);
      this._saveToStorage('carts', carts.map((c) => (c.id === cart.id ? cart : c)));
    }

    const updatedCart = this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(updatedCart.id);

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: {
        id: summary.id,
        status: summary.status,
        subtotal: summary.subtotal,
        discount_total: summary.discount_total,
        total: summary.total,
        item_count: summary.item_count,
        items: summary.items
      }
    };
  }

  // applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const code = (promoCode || '').trim();
    const promos = this._getFromStorage('promos', []);
    const promo = promos.find((p) => p.code.toLowerCase() === code.toLowerCase()) || null;

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart); // ensure subtotal up to date

    if (!promo) {
      const summary = this._buildCartSummary(cart.id);
      return {
        success: false,
        message: 'Promo code not found.',
        error_code: 'invalid_code',
        applied_promo: null,
        cart: {
          id: summary.id,
          subtotal: summary.subtotal,
          discount_total: summary.discount_total,
          total: summary.total,
          item_count: summary.item_count
        }
      };
    }

    const validation = this._validatePromoCodeForCart(promo, cart);
    if (!validation.valid) {
      const summary = this._buildCartSummary(cart.id);
      return {
        success: false,
        message: validation.message,
        error_code: validation.error_code,
        applied_promo: null,
        cart: {
          id: summary.id,
          subtotal: summary.subtotal,
          discount_total: summary.discount_total,
          total: summary.total,
          item_count: summary.item_count
        }
      };
    }

    // Apply promo
    cart.applied_promo_id = promo.id;
    cart.applied_promo_code = promo.code;
    const updatedCart = this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(updatedCart.id);

    return {
      success: true,
      message: 'Promo code applied.',
      error_code: null,
      applied_promo: {
        id: promo.id,
        name: promo.name,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        applicable_order_type: promo.applicable_order_type,
        minimum_order_amount: promo.minimum_order_amount || null,
        max_discount_amount: promo.max_discount_amount || null
      },
      cart: {
        id: summary.id,
        subtotal: summary.subtotal,
        discount_total: summary.discount_total,
        total: summary.total,
        item_count: summary.item_count
      }
    };
  }

  // getCheckoutData()
  getCheckoutData() {
    const settings = this._getSiteSettingsRecord();
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartSummary = this._buildCartSummary(updatedCart.id);

    const addresses = this._getFromStorage('addresses', []);
    const addressesOut = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      street: a.street,
      city: a.city,
      state: a.state,
      zip_code: a.zip_code,
      is_default: !!a.is_default,
      full_address: `${a.street}, ${a.city}, ${a.state} ${a.zip_code}`
    }));

    const defaultAddress = addressesOut.find((a) => a.is_default) || addressesOut[0] || null;
    const default_address_id = defaultAddress ? defaultAddress.id : null;

    const available = this._getAvailableDeliveryDates();
    const delivery_method_options = [
      { value: 'standard', label: 'Standard delivery' },
      { value: 'express', label: 'Express delivery' }
    ];

    const standard_delivery_time_windows = (available.standard_delivery_time_windows || []).map((tw) => ({
      value: tw,
      label: this._deliveryTimeWindowLabel(tw)
    }));

    return {
      cart: {
        id: cartSummary.id,
        subtotal: cartSummary.subtotal,
        discount_total: cartSummary.discount_total,
        total: cartSummary.total,
        item_count: cartSummary.item_count,
        items: cartSummary.items.map((it) => ({
          cart_item_id: it.cart_item_id,
          product_id: it.product_id,
          product_name: it.product_name,
          item_type: it.item_type,
          quantity: it.quantity,
          unit_price: it.unit_price,
          line_subtotal: it.line_subtotal,
          // fk resolution
          product: it.product
        })),
        applied_promo: cartSummary.applied_promo
          ? {
              code: cartSummary.applied_promo.code,
              discount_type: cartSummary.applied_promo.discount_type,
              discount_value: cartSummary.applied_promo.discount_value
            }
          : null
      },
      addresses: addressesOut,
      default_address_id,
      delivery_options: {
        delivery_method_options,
        standard_delivery_time_windows,
        earliest_available_date: available.earliest_available_date,
        max_schedule_days_ahead: available.max_schedule_days_ahead
      },
      minimum_order_amount: settings.minimum_order_amount,
      currency: settings.currency
    };
  }

  // placeOrder(deliveryAddressId, deliveryDate, deliveryTimeWindow, deliveryMethod)
  placeOrder(deliveryAddressId, deliveryDate, deliveryTimeWindow, deliveryMethod) {
    const settings = this._getSiteSettingsRecord();
    let cart = this._getOrCreateCart();
    cart = this._recalculateCartTotals(cart);

    const cartItems = this._getCartItems(cart.id);
    if (!cartItems.length) {
      return { success: false, message: 'Cart is empty.', order: null };
    }

    if (cart.total < settings.minimum_order_amount) {
      return { success: false, message: 'Cart total does not meet the minimum order amount.', order: null };
    }

    const addresses = this._getFromStorage('addresses', []);
    const address = addresses.find((a) => a.id === deliveryAddressId) || null;
    if (!address) {
      return { success: false, message: 'Delivery address not found.', order: null };
    }

    const available = this._getAvailableDeliveryDates();
    // Basic validation of date and time window
    if (!available.standard_delivery_time_windows.includes(deliveryTimeWindow)) {
      return { success: false, message: 'Invalid delivery time window.', order: null };
    }

    const orderId = this._generateId('order');
    const nowIso = new Date().toISOString();

    const hasSubscription = cartItems.some((i) => i.item_type === 'subscription');
    const hasRental = cartItems.some((i) => i.item_type === 'rental');

    const orders = this._getFromStorage('orders', []);
    const order_number = 'ORD-' + orderId.split('_')[1];

    const order = {
      id: orderId,
      order_number,
      cart_id: cart.id,
      placed_at: nowIso,
      status: 'pending',
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      total_items: cartItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
      promo_id: cart.applied_promo_id || null,
      promo_code: cart.applied_promo_code || null,
      delivery_id: null,
      delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
      delivery_time_window: deliveryTimeWindow,
      contains_subscriptions: hasSubscription,
      contains_rentals: hasRental,
      created_at: nowIso,
      updated_at: nowIso
    };

    // Create order items (and subscriptions if necessary)
    const products = this._getFromStorage('products', []);
    let orderItems = this._getFromStorage('order_items', []);
    let subscriptions = this._getFromStorage('subscriptions', []);

    cartItems.forEach((ci) => {
      let subscriptionId = null;
      if (ci.item_type === 'subscription') {
        const nextDeliveryDateIso = deliveryDate ? new Date(deliveryDate).toISOString() : nowIso;
        const subId = this._generateId('sub');
        const subscription = {
          id: subId,
          product_id: ci.product_id,
          quantity: ci.quantity,
          subscription_frequency: ci.subscription_frequency,
          delivery_day_of_week: ci.subscription_delivery_day_of_week,
          address_id: deliveryAddressId,
          next_delivery_date: nextDeliveryDateIso,
          status: 'active',
          created_at: nowIso,
          updated_at: nowIso
        };
        subscriptions.push(subscription);
        subscriptionId = subId;
      }

      const orderItem = {
        id: this._generateId('order_item'),
        order_id: orderId,
        product_id: ci.product_id,
        item_type: ci.item_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        subscription_id: subscriptionId,
        rental_duration: ci.rental_duration || null,
        created_at: nowIso,
        updated_at: nowIso
      };

      orderItems.push(orderItem);
    });

    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('subscriptions', subscriptions);

    // Create delivery associated with order
    const deliveries = this._getFromStorage('deliveries', []);
    const deliveryId = this._generateId('delivery');
    const scheduledDateIso = deliveryDate ? new Date(deliveryDate).toISOString() : nowIso;

    // Build items summary for delivery
    const items_summary = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const name = product ? product.name : 'Item';
      return `${ci.quantity} x ${name}`;
    });

    const delivery = {
      id: deliveryId,
      scheduled_date: scheduledDateIso,
      time_window: deliveryTimeWindow,
      address_id: deliveryAddressId,
      source_type: 'order',
      source_id: orderId,
      delivery_method: deliveryMethod || 'standard',
      status: 'scheduled',
      items_summary,
      created_at: nowIso,
      updated_at: nowIso
    };

    deliveries.push(delivery);
    this._saveToStorage('deliveries', deliveries);

    order.delivery_id = deliveryId;
    order.delivery_date = scheduledDateIso;
    order.status = 'confirmed';

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Mark cart as converted
    cart.status = 'converted_to_order';
    cart.updated_at = nowIso;
    let carts = this._getFromStorage('carts', []);
    carts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);

    // Build response with fk resolution
    const orderItemsForOrder = orderItems.filter((oi) => oi.order_id === order.id);
    const addressFull = `${address.street}, ${address.city}, ${address.state} ${address.zip_code}`;

    const responseOrder = {
      id: order.id,
      order_number: order.order_number,
      placed_at: order.placed_at,
      status: order.status,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      total: order.total,
      total_items: order.total_items,
      promo_code: order.promo_code,
      contains_subscriptions: order.contains_subscriptions,
      contains_rentals: order.contains_rentals,
      delivery: {
        delivery_id: delivery.id,
        scheduled_date: delivery.scheduled_date,
        time_window: delivery.time_window,
        time_window_label: this._deliveryTimeWindowLabel(delivery.time_window),
        delivery_method: delivery.delivery_method,
        address: {
          label: address.label,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
          full_address: addressFull
        }
      },
      items: orderItemsForOrder.map((oi) => {
        const prod = products.find((p) => p.id === oi.product_id) || null;
        return {
          order_item_id: oi.id,
          product_id: oi.product_id,
          product_name: prod ? prod.name : null,
          item_type: oi.item_type,
          quantity: oi.quantity,
          unit_price: oi.unit_price,
          line_subtotal: oi.line_subtotal,
          subscription_frequency_label: oi.item_type === 'subscription' && oi.subscription_id
            ? this._subscriptionFrequencyLabel(
                (subscriptions.find((s) => s.id === oi.subscription_id) || {}).subscription_frequency
              )
            : null,
          rental_duration_label: oi.item_type === 'rental' && oi.rental_duration
            ? this._rentalDurationLabel(oi.rental_duration)
            : null,
          // fk resolution
          product: prod
        };
      })
    };

    return {
      success: true,
      message: 'Order placed successfully.',
      order: responseOrder
    };
  }

  // listActivePromos(applicableOrderType, includeExpired, sortBy)
  listActivePromos(applicableOrderType, includeExpired, sortBy) {
    let promos = this._getFromStorage('promos', []);

    if (!includeExpired) {
      promos = promos.filter((p) => p.status === 'active');
    }

    if (applicableOrderType) {
      promos = promos.filter((p) => p.applicable_order_type === applicableOrderType || p.applicable_order_type === 'all_orders');
    }

    if (sortBy === 'discount_value_desc') {
      promos.sort((a, b) => b.discount_value - a.discount_value);
    } else if (sortBy === 'name_asc') {
      promos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return promos.map((p) => ({
      id: p.id,
      name: p.name,
      short_label: p.short_label || p.name,
      code: p.code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      applicable_order_type: p.applicable_order_type,
      status: p.status,
      minimum_order_amount: p.minimum_order_amount || null,
      max_discount_amount: p.max_discount_amount || null,
      is_stackable: !!p.is_stackable,
      description: p.description || ''
    }));
  }

  // getPromoDetails(promoId)
  getPromoDetails(promoId) {
    const promos = this._getFromStorage('promos', []);
    const promo = promos.find((p) => p.id === promoId) || null;
    if (!promo) {
      return { promo: null };
    }
    return {
      promo: {
        id: promo.id,
        name: promo.name,
        code: promo.code,
        short_label: promo.short_label || promo.name,
        description: promo.description || '',
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        applicable_order_type: promo.applicable_order_type,
        status: promo.status,
        start_date: promo.start_date || null,
        end_date: promo.end_date || null,
        minimum_order_amount: promo.minimum_order_amount || null,
        max_discount_amount: promo.max_discount_amount || null,
        is_stackable: !!promo.is_stackable,
        terms_html: promo.terms_html || ''
      }
    };
  }

  // getHelpCenterOverview()
  getHelpCenterOverview() {
    const articles = this._getFromStorage('help_articles', []);

    const featured_articles = articles
      .filter((a) => a.is_featured)
      .map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        category: a.category || null,
        is_featured: !!a.is_featured,
        excerpt: (a.body || '').slice(0, 160)
      }));

    const categoryMap = new Map();
    articles.forEach((a) => {
      const cat = a.category || 'general';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, 0);
      }
      categoryMap.set(cat, categoryMap.get(cat) + 1);
    });

    const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
      id: name,
      name,
      article_count: count
    }));

    return {
      featured_articles,
      categories,
      search_placeholder: 'Search help articles'
    };
  }

  // searchHelpArticles(query)
  searchHelpArticles(query) {
    const q = (query || '').toLowerCase().trim();
    const articles = this._getFromStorage('help_articles', []);

    // Instrumentation for task completion tracking (task_7)
    try {
      if (q && q.includes('minimum order amount')) {
        localStorage.setItem('task7_helpSearchQuery', query);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!q) {
      return [];
    }

    return articles
      .filter((a) => {
        const title = (a.title || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        return title.includes(q) || body.includes(q);
      })
      .map((a) => {
        const body = a.body || '';
        const idx = body.toLowerCase().indexOf(q);
        const start = idx > 40 ? idx - 40 : 0;
        const snippet = body.slice(start, start + 160);
        return {
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category || null,
          excerpt: body.slice(0, 120),
          match_snippet: snippet
        };
      });
  }

  // getHelpArticleDetails(slug)
  getHelpArticleDetails(slug) {
    const articles = this._getFromStorage('help_articles', []);
    const article = articles.find((a) => a.slug === slug) || null;
    if (!article) {
      return { article: null };
    }

    // Instrumentation for task completion tracking (task_7)
    try {
      if (article && article.title === 'What is the minimum order amount?') {
        localStorage.setItem('task7_minOrderArticleSlug', article.slug);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        body: article.body,
        category: article.category || null,
        is_featured: !!article.is_featured,
        created_at: article.created_at || null,
        updated_at: article.updated_at || null
      }
    };
  }

  // getMyAccountOverview()
  getMyAccountOverview() {
    const addresses = this._getFromStorage('addresses', []);
    const subscriptions = this._getFromStorage('subscriptions', []);
    const deliveries = this._getFromStorage('deliveries', []);
    const products = this._getFromStorage('products', []);

    const defaultAddressRaw = addresses.find((a) => a.is_default) || addresses[0] || null;
    const default_address = defaultAddressRaw
      ? {
          id: defaultAddressRaw.id,
          label: defaultAddressRaw.label,
          full_address: `${defaultAddressRaw.street}, ${defaultAddressRaw.city}, ${defaultAddressRaw.state} ${defaultAddressRaw.zip_code}`
        }
      : null;

    const activeSubsRaw = subscriptions.filter((s) => s.status === 'active');
    const active_subscriptions = activeSubsRaw.map((s) => {
      const product = products.find((p) => p.id === s.product_id) || null;
      const sub = {
        subscription_id: s.id,
        product_name: product ? product.name : null,
        product_image_url: product ? product.image_url || null : null,
        quantity: s.quantity,
        subscription_frequency_label: this._subscriptionFrequencyLabel(s.subscription_frequency),
        delivery_day_label: this._dayOfWeekLabel(s.delivery_day_of_week),
        next_delivery_date: s.next_delivery_date || null,
        // fk resolution
        product,
        address: addresses.find((a) => a.id === s.address_id) || null
      };
      return sub;
    });

    const upcomingDeliveriesRaw = deliveries.filter((d) => d.status === 'scheduled');
    const upcoming_deliveries = upcomingDeliveriesRaw.map((d) => {
      const address = addresses.find((a) => a.id === d.address_id) || null;
      const obj = {
        delivery_id: d.id,
        scheduled_date: d.scheduled_date,
        time_window_label: this._deliveryTimeWindowLabel(d.time_window),
        address_label: address ? address.label : null,
        items_summary: d.items_summary || [],
        // fk resolution
        address
      };
      return obj;
    });

    return {
      default_address,
      active_subscriptions,
      upcoming_deliveries
    };
  }

  // getMySubscriptions(status)
  getMySubscriptions(status) {
    const subscriptions = this._getFromStorage('subscriptions', []);
    const products = this._getFromStorage('products', []);
    const addresses = this._getFromStorage('addresses', []);

    let subs = subscriptions;
    if (status && status !== 'all') {
      subs = subs.filter((s) => s.status === status);
    }

    return subs.map((s) => {
      const product = products.find((p) => p.id === s.product_id) || null;
      const address = addresses.find((a) => a.id === s.address_id) || null;
      return {
        subscription_id: s.id,
        product_id: s.product_id,
        product_name: product ? product.name : null,
        product_image_url: product ? product.image_url || null : null,
        quantity: s.quantity,
        subscription_frequency: s.subscription_frequency,
        subscription_frequency_label: this._subscriptionFrequencyLabel(s.subscription_frequency),
        delivery_day_of_week: s.delivery_day_of_week,
        delivery_day_label: this._dayOfWeekLabel(s.delivery_day_of_week),
        address_label: address ? address.label : null,
        next_delivery_date: s.next_delivery_date || null,
        status: s.status,
        // fk resolution
        product,
        address
      };
    });
  }

  // getSubscriptionDetails(subscriptionId)
  getSubscriptionDetails(subscriptionId) {
    const subscriptions = this._getFromStorage('subscriptions', []);
    const products = this._getFromStorage('products', []);
    const addresses = this._getFromStorage('addresses', []);

    const s = subscriptions.find((sub) => sub.id === subscriptionId) || null;
    if (!s) {
      return { subscription: null, available_frequencies: [], available_delivery_days: [], available_addresses: [] };
    }

    const product = products.find((p) => p.id === s.product_id) || null;
    const address = addresses.find((a) => a.id === s.address_id) || null;

    const subscription = {
      subscription_id: s.id,
      product_id: s.product_id,
      product_name: product ? product.name : null,
      product_image_url: product ? product.image_url || null : null,
      quantity: s.quantity,
      subscription_frequency: s.subscription_frequency,
      subscription_frequency_label: this._subscriptionFrequencyLabel(s.subscription_frequency),
      delivery_day_of_week: s.delivery_day_of_week,
      delivery_day_label: this._dayOfWeekLabel(s.delivery_day_of_week),
      address_id: s.address_id,
      address_label: address ? address.label : null,
      next_delivery_date: s.next_delivery_date || null,
      status: s.status,
      // fk resolution
      product,
      address
    };

    const allowedFreqs = product && Array.isArray(product.allowed_subscription_frequencies) && product.allowed_subscription_frequencies.length
      ? product.allowed_subscription_frequencies
      : ['every_week', 'every_2_weeks', 'every_4_weeks', 'every_month'];

    const available_frequencies = allowedFreqs.map((v) => ({ value: v, label: this._subscriptionFrequencyLabel(v) }));

    const available_delivery_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => ({
      value: d,
      label: this._dayOfWeekLabel(d)
    }));

    const available_addresses = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      full_address: `${a.street}, ${a.city}, ${a.state} ${a.zip_code}`
    }));

    return { subscription, available_frequencies, available_delivery_days, available_addresses };
  }

  // updateSubscriptionSettings(subscriptionId, subscriptionFrequency, quantity, deliveryDayOfWeek, addressId)
  updateSubscriptionSettings(subscriptionId, subscriptionFrequency, quantity, deliveryDayOfWeek, addressId) {
    let subscriptions = this._getFromStorage('subscriptions', []);
    const idx = subscriptions.findIndex((s) => s.id === subscriptionId);
    if (idx === -1) {
      return { success: false, message: 'Subscription not found.', subscription: null };
    }

    const addresses = this._getFromStorage('addresses', []);
    const address = addresses.find((a) => a.id === addressId) || null;
    if (!address) {
      return { success: false, message: 'Address not found.', subscription: null };
    }

    const s = subscriptions[idx];
    s.subscription_frequency = subscriptionFrequency;
    s.quantity = quantity;
    s.delivery_day_of_week = deliveryDayOfWeek;
    s.address_id = addressId;

    // Compute next_delivery_date as next occurrence of the chosen weekday
    const today = new Date();
    const targetDayIdxMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    const targetIndex = targetDayIdxMap[deliveryDayOfWeek] != null ? targetDayIdxMap[deliveryDayOfWeek] : today.getDay();
    let daysToAdd = (targetIndex - today.getDay() + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    const nextDate = new Date(today.getTime());
    nextDate.setDate(today.getDate() + daysToAdd);
    s.next_delivery_date = nextDate.toISOString();

    s.updated_at = new Date().toISOString();

    subscriptions[idx] = s;
    this._saveToStorage('subscriptions', subscriptions);

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === s.product_id) || null;

    const outSub = {
      subscription_id: s.id,
      product_name: product ? product.name : null,
      quantity: s.quantity,
      subscription_frequency: s.subscription_frequency,
      subscription_frequency_label: this._subscriptionFrequencyLabel(s.subscription_frequency),
      delivery_day_of_week: s.delivery_day_of_week,
      delivery_day_label: this._dayOfWeekLabel(s.delivery_day_of_week),
      address_label: address.label,
      next_delivery_date: s.next_delivery_date,
      status: s.status,
      // fk resolution
      product,
      address
    };

    return {
      success: true,
      message: 'Subscription updated.',
      subscription: outSub
    };
  }

  // getAddresses()
  getAddresses() {
    const addresses = this._getFromStorage('addresses', []);
    const addressesOut = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      street: a.street,
      city: a.city,
      state: a.state,
      zip_code: a.zip_code,
      is_default: !!a.is_default,
      full_address: `${a.street}, ${a.city}, ${a.state} ${a.zip_code}`
    }));

    const defaultAddress = addressesOut.find((a) => a.is_default) || addressesOut[0] || null;
    return {
      addresses: addressesOut,
      default_address_id: defaultAddress ? defaultAddress.id : null
    };
  }

  // createAddress(label, street, city, state, zipCode, setAsDefault)
  createAddress(label, street, city, state, zipCode, setAsDefault) {
    let addresses = this._getFromStorage('addresses', []);
    const now = new Date().toISOString();
    const id = this._generateId('addr');

    const shouldDefault = setAsDefault || addresses.length === 0;

    if (shouldDefault) {
      addresses = addresses.map((a) => ({ ...a, is_default: false }));
    }

    const address = {
      id,
      label,
      street,
      city,
      state,
      zip_code: zipCode,
      is_default: !!shouldDefault,
      created_at: now,
      updated_at: now
    };

    addresses.push(address);
    this._saveToStorage('addresses', addresses);

    return {
      success: true,
      message: 'Address created.',
      address: {
        id: address.id,
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
        is_default: address.is_default,
        full_address: `${address.street}, ${address.city}, ${address.state} ${address.zip_code}`
      }
    };
  }

  // updateAddress(addressId, label, street, city, state, zipCode, setAsDefault)
  updateAddress(addressId, label, street, city, state, zipCode, setAsDefault) {
    let addresses = this._getFromStorage('addresses', []);
    const idx = addresses.findIndex((a) => a.id === addressId);
    if (idx === -1) {
      return { success: false, message: 'Address not found.', address: null };
    }

    const address = addresses[idx];

    if (label !== undefined) address.label = label;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (zipCode !== undefined) address.zip_code = zipCode;

    if (setAsDefault === true) {
      addresses = addresses.map((a) => ({ ...a, is_default: a.id === addressId }));
    } else if (setAsDefault === false) {
      // If explicitly false, just set this address to non-default; ensure at least one default exists afterwards
      address.is_default = false;
      addresses[idx] = address;
      if (!addresses.some((a) => a.is_default)) {
        addresses[0].is_default = true;
      }
    } else {
      addresses[idx] = address;
    }

    address.updated_at = new Date().toISOString();
    this._saveToStorage('addresses', addresses);

    return {
      success: true,
      message: 'Address updated.',
      address: {
        id: address.id,
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
        is_default: address.is_default,
        full_address: `${address.street}, ${address.city}, ${address.state} ${address.zip_code}`
      }
    };
  }

  // deleteAddress(addressId)
  deleteAddress(addressId) {
    let addresses = this._getFromStorage('addresses', []);
    const idx = addresses.findIndex((a) => a.id === addressId);
    if (idx === -1) {
      return { success: false, message: 'Address not found.', remaining_addresses: [] };
    }

    const subscriptions = this._getFromStorage('subscriptions', []);
    const deliveries = this._getFromStorage('deliveries', []);

    const inUseBySub = subscriptions.some((s) => s.address_id === addressId && (s.status === 'active' || s.status === 'paused'));
    const inUseByDelivery = deliveries.some((d) => d.address_id === addressId && d.status === 'scheduled');

    if (inUseBySub || inUseByDelivery) {
      const remaining = addresses.map((a) => ({
        id: a.id,
        label: a.label,
        full_address: `${a.street}, ${a.city}, ${a.state} ${a.zip_code}`,
        is_default: !!a.is_default
      }));
      return {
        success: false,
        message: 'Address is used by active subscriptions or upcoming deliveries and cannot be deleted.',
        remaining_addresses: remaining
      };
    }

    const removed = addresses[idx];
    addresses.splice(idx, 1);

    // Ensure a default address exists if any remain
    if (addresses.length && !addresses.some((a) => a.is_default)) {
      addresses[0].is_default = true;
    }

    this._saveToStorage('addresses', addresses);

    const remainingOut = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      full_address: `${a.street}, ${a.city}, ${a.state} ${a.zip_code}`,
      is_default: !!a.is_default
    }));

    return {
      success: true,
      message: 'Address deleted.',
      remaining_addresses: remainingOut
    };
  }

  // getUpcomingDeliveries()
  getUpcomingDeliveries() {
    const deliveries = this._getFromStorage('deliveries', []);
    const addresses = this._getFromStorage('addresses', []);

    return deliveries
      .filter((d) => d.status === 'scheduled')
      .map((d) => {
        const address = addresses.find((a) => a.id === d.address_id) || null;
        return {
          delivery_id: d.id,
          scheduled_date: d.scheduled_date,
          time_window: d.time_window,
          time_window_label: this._deliveryTimeWindowLabel(d.time_window),
          delivery_method: d.delivery_method,
          address_id: d.address_id,
          address_label: address ? address.label : null,
          address_full: address ? `${address.street}, ${address.city}, ${address.state} ${address.zip_code}` : null,
          status: d.status,
          source_type: d.source_type,
          source_label: d.source_type === 'order' ? 'Order' : (d.source_type === 'subscription' ? 'Subscription' : d.source_type),
          items_summary: d.items_summary || [],
          // fk resolution
          address
        };
      });
  }

  // getDeliveryRescheduleOptions(deliveryId)
  getDeliveryRescheduleOptions(deliveryId) {
    const deliveries = this._getFromStorage('deliveries', []);
    const addresses = this._getFromStorage('addresses', []);
    const settings = this._getSiteSettingsRecord();

    const d = deliveries.find((del) => del.id === deliveryId) || null;
    if (!d) {
      return {
        delivery: null,
        available_addresses: [],
        earliest_available_date: null,
        max_schedule_days_ahead: settings.max_delivery_schedule_days_ahead,
        standard_delivery_time_windows: []
      };
    }

    const address = addresses.find((a) => a.id === d.address_id) || null;

    const deliveryOut = {
      delivery_id: d.id,
      scheduled_date: d.scheduled_date,
      time_window: d.time_window,
      time_window_label: this._deliveryTimeWindowLabel(d.time_window),
      address_id: d.address_id,
      address_label: address ? address.label : null,
      address_full: address ? `${address.street}, ${address.city}, ${address.state} ${address.zip_code}` : null,
      // fk resolution
      address
    };

    const available_addresses = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      full_address: `${a.street}, ${a.city}, ${a.state} ${a.zip_code}`
    }));

    const earliest = this._formatDateOnly(new Date());
    const maxAhead = settings.max_delivery_schedule_days_ahead || 30;
    const stdTimeWindows = (settings.standard_delivery_time_windows || ['09_00_12_00', '12_00_15_00', '15_00_18_00', '18_00_21_00']).map((tw) => ({
      value: tw,
      label: this._deliveryTimeWindowLabel(tw)
    }));

    return {
      delivery: deliveryOut,
      available_addresses,
      earliest_available_date: earliest,
      max_schedule_days_ahead: maxAhead,
      standard_delivery_time_windows: stdTimeWindows
    };
  }

  // rescheduleDelivery(deliveryId, newAddressId, newDate, newTimeWindow)
  rescheduleDelivery(deliveryId, newAddressId, newDate, newTimeWindow) {
    let deliveries = this._getFromStorage('deliveries', []);
    const addresses = this._getFromStorage('addresses', []);

    const idx = deliveries.findIndex((d) => d.id === deliveryId);
    if (idx === -1) {
      return { success: false, message: 'Delivery not found.', delivery: null };
    }

    const address = addresses.find((a) => a.id === newAddressId) || null;
    if (!address) {
      return { success: false, message: 'Address not found.', delivery: null };
    }

    const d = deliveries[idx];
    d.address_id = newAddressId;
    d.scheduled_date = new Date(newDate).toISOString();
    d.time_window = newTimeWindow;
    d.status = 'rescheduled';
    d.updated_at = new Date().toISOString();

    deliveries[idx] = d;
    this._saveToStorage('deliveries', deliveries);

    const deliveryOut = {
      delivery_id: d.id,
      scheduled_date: d.scheduled_date,
      time_window: d.time_window,
      time_window_label: this._deliveryTimeWindowLabel(d.time_window),
      address_label: address.label,
      address_full: `${address.street}, ${address.city}, ${address.state} ${address.zip_code}`,
      status: d.status,
      // fk resolution
      address
    };

    return {
      success: true,
      message: 'Delivery rescheduled.',
      delivery: deliveryOut
    };
  }

  // getOrderDetails(orderId)
  getOrderDetails(orderId) {
    const orders = this._getFromStorage('orders', []);
    const deliveries = this._getFromStorage('deliveries', []);
    const orderItems = this._getFromStorage('order_items', []);
    const products = this._getFromStorage('products', []);
    const addresses = this._getFromStorage('addresses', []);

    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return { order: null, delivery: null, items: [] };
    }

    const delivery = deliveries.find((d) => d.id === order.delivery_id) || null;
    let deliveryOut = null;
    if (delivery) {
      const address = addresses.find((a) => a.id === delivery.address_id) || null;
      deliveryOut = {
        delivery_id: delivery.id,
        scheduled_date: delivery.scheduled_date,
        time_window: delivery.time_window,
        time_window_label: this._deliveryTimeWindowLabel(delivery.time_window),
        delivery_method: delivery.delivery_method,
        address: address
          ? {
              label: address.label,
              street: address.street,
              city: address.city,
              state: address.state,
              zip_code: address.zip_code,
              full_address: `${address.street}, ${address.city}, ${address.state} ${address.zip_code}`
            }
          : null
      };
    }

    const itemsRaw = orderItems.filter((oi) => oi.order_id === order.id);
    const itemsOut = itemsRaw.map((oi) => {
      const product = products.find((p) => p.id === oi.product_id) || null;
      return {
        order_item_id: oi.id,
        product_id: oi.product_id,
        product_name: product ? product.name : null,
        item_type: oi.item_type,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        line_subtotal: oi.line_subtotal,
        subscription_frequency_label: null, // could be resolved from subscription if needed
        rental_duration_label: oi.item_type === 'rental' && oi.rental_duration ? this._rentalDurationLabel(oi.rental_duration) : null,
        // fk resolution
        product
      };
    });

    const orderOut = {
      id: order.id,
      order_number: order.order_number,
      placed_at: order.placed_at,
      status: order.status,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      total: order.total,
      total_items: order.total_items,
      promo_code: order.promo_code,
      contains_subscriptions: order.contains_subscriptions,
      contains_rentals: order.contains_rentals
    };

    return {
      order: orderOut,
      delivery: deliveryOut,
      items: itemsOut
    };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    // Static/semi-static content; not persisted as entities
    return {
      support_email: 'support@example.com',
      support_phone: '+1 (555) 123-4567',
      service_hours: 'Mon–Fri 9:00 AM – 6:00 PM',
      contact_reasons: [
        'Order question',
        'Billing question',
        'Delivery issue',
        'Account & subscriptions',
        'Other'
      ]
    };
  }

  // submitContactRequest(name, email, subject, message, preferredContactMethod, phone)
  submitContactRequest(name, email, subject, message, preferredContactMethod, phone) {
    const requests = this._getFromStorage('contact_requests', []);
    const now = new Date().toISOString();
    const id = this._generateId('contact');

    const req = {
      id,
      name,
      email,
      subject,
      message,
      preferred_contact_method: preferredContactMethod || null,
      phone: phone || null,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Your request has been submitted.',
      ticket_id: id
    };
  }

  // getInformationalPageContent(pageSlug)
  getInformationalPageContent(pageSlug) {
    const pages = this._getFromStorage('informational_pages', []);
    const page = pages.find((p) => p.slug === pageSlug) || null;
    if (!page) {
      return {
        title: 'Page not found',
        body_html: '<p>The requested page could not be found.</p>',
        last_updated: null
      };
    }
    return {
      title: page.title,
      body_html: page.body_html,
      last_updated: page.last_updated || null
    };
  }

  // getSiteSettings()
  getSiteSettings() {
    const settings = this._getSiteSettingsRecord();
    return {
      minimum_order_amount: settings.minimum_order_amount,
      currency: settings.currency,
      standard_delivery_time_windows: settings.standard_delivery_time_windows,
      max_delivery_schedule_days_ahead: settings.max_delivery_schedule_days_ahead
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