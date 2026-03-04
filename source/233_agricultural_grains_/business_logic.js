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
    this._getNextIdCounter(); // ensure counter exists
  }

  // ==========================
  // Storage helpers
  // ==========================

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'users', // unused but kept from skeleton
      'categories',
      'products',
      'product_volume_discount_tiers',
      'carts',
      'cart_items',
      'shipping_methods',
      'shipping_estimates',
      'business_accounts',
      'addresses',
      'quote_requests',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Counters / singleton state
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }
    if (!localStorage.getItem('current_business_account_id')) {
      localStorage.setItem('current_business_account_id', '');
    }
    if (!localStorage.getItem('checkout_shipping_address_id')) {
      localStorage.setItem('checkout_shipping_address_id', '');
    }
    if (!localStorage.getItem('selected_shipping_method_code')) {
      localStorage.setItem('selected_shipping_method_code', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _formatCurrency(amount, currency) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    const code = currency || 'usd';
    let symbol = '$';
    if (code === 'eur') symbol = '€';
    if (code === 'gbp') symbol = '£';
    return symbol + amount.toFixed(2);
  }

  // ==========================
  // Category helpers
  // ==========================

  _getCategoryByUrlKey(categoryUrlKey) {
    const categories = this._getFromStorage('categories', []);
    return categories.find((c) => c.url_key === categoryUrlKey) || null;
  }

  _getCategoryAndDescendantIds(categoryUrlKey) {
    const categories = this._getFromStorage('categories', []);
    const category = categories.find((c) => c.url_key === categoryUrlKey) || null;
    if (!category) return [];
    const ids = [category.id];
    categories.forEach((c) => {
      if (c.parent_category_id === category.id) {
        ids.push(c.id);
      }
    });
    return ids;
  }

  _buildBreadcrumbForCategory(category) {
    if (!category) return [];
    const categories = this._getFromStorage('categories', []);
    const crumb = [];
    if (category.level === 'main') {
      crumb.push({
        id: category.id,
        name: category.name,
        url_key: category.url_key,
        level: category.level
      });
    } else {
      const parent = categories.find((c) => c.id === category.parent_category_id) || null;
      if (parent) {
        crumb.push({
          id: parent.id,
          name: parent.name,
          url_key: parent.url_key,
          level: parent.level
        });
      }
      crumb.push({
        id: category.id,
        name: category.name,
        url_key: category.url_key,
        level: category.level
      });
    }
    return crumb;
  }

  // ==========================
  // Cart helpers
  // ==========================

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId && c.status === 'active') || null;
    }

    if (!cart) {
      cart = carts.find((c) => c.status === 'active') || null;
      if (cart) {
        localStorage.setItem('current_cart_id', cart.id);
      }
    }

    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        items: [],
        subtotal: 0,
        shipping_estimate_total: 0,
        total: 0,
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    const now = new Date().toISOString();
    cart.updated_at = now;
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _applyVolumeDiscountsForProduct(cartItem, product, tiers) {
    const applicableTiers = (tiers || []).filter((t) => {
      if (t.unit_type !== cartItem.unit_type) return false;
      if (cartItem.quantity < t.min_quantity) return false;
      if (typeof t.max_quantity === 'number' && cartItem.quantity > t.max_quantity) return false;
      return true;
    });

    let bestTier = null;
    let bestDiscount = 0;
    applicableTiers.forEach((t) => {
      if (t.discount_percent > bestDiscount) {
        bestDiscount = t.discount_percent;
        bestTier = t;
      }
    });

    const baseUnitPrice = product.price_per_unit;
    let effectiveUnitPrice = baseUnitPrice;

    if (bestTier) {
      if (typeof bestTier.discounted_price_per_unit === 'number') {
        effectiveUnitPrice = bestTier.discounted_price_per_unit;
      } else {
        effectiveUnitPrice = baseUnitPrice * (1 - bestTier.discount_percent / 100);
      }
      cartItem.applied_volume_discount_percent = bestTier.discount_percent;
    } else {
      cartItem.applied_volume_discount_percent = undefined;
    }

    cartItem.unit_price = baseUnitPrice;
    cartItem.line_subtotal = Number((cartItem.quantity * effectiveUnitPrice).toFixed(2));
    return cartItem;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const tiers = this._getFromStorage('product_volume_discount_tiers', []);

    let subtotal = 0;
    const now = new Date().toISOString();

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    itemsForCart.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return;
      const productTiers = tiers.filter((t) => t.product_id === product.id);
      this._applyVolumeDiscountsForProduct(item, product, productTiers);
      subtotal += item.line_subtotal || 0;
    });

    cart.subtotal = Number(subtotal.toFixed(2));
    if (typeof cart.shipping_estimate_total !== 'number') {
      cart.shipping_estimate_total = 0;
    }
    cart.total = Number((cart.subtotal + (cart.shipping_estimate_total || 0)).toFixed(2));
    cart.updated_at = now;
    this._saveCart(cart);

    // Persist updated cart items as well
    this._saveToStorage('cart_items', cartItems);

    return cart;
  }

  // ==========================
  // Shipping helpers
  // ==========================

  _calculateProductShippingEstimate(product, quantity, unit_type, destination_postal_code, shippingMethod) {
    const shipping_estimates = this._getFromStorage('shipping_estimates', []);

    let total_weight_kg = 0;
    if (unit_type === 'kg') {
      total_weight_kg = quantity;
    } else if (unit_type === 'bag') {
      total_weight_kg = quantity * (product.unit_weight_kg || 0);
    } else if (unit_type === 'metric_ton') {
      total_weight_kg = quantity * 1000;
    }

    const baseRate = shippingMethod.base_rate || 0;
    const ratePerKg = shippingMethod.rate_per_kg || 0;
    const estimated_cost = Number((baseRate + ratePerKg * total_weight_kg).toFixed(2));

    let transitDays = null;
    if (typeof shippingMethod.estimated_transit_days_min === 'number' && typeof shippingMethod.estimated_transit_days_max === 'number') {
      transitDays = Math.round((shippingMethod.estimated_transit_days_min + shippingMethod.estimated_transit_days_max) / 2);
    } else if (typeof shippingMethod.estimated_transit_days_min === 'number') {
      transitDays = shippingMethod.estimated_transit_days_min;
    } else if (typeof shippingMethod.estimated_transit_days_max === 'number') {
      transitDays = shippingMethod.estimated_transit_days_max;
    }

    const estimate = {
      id: this._generateId('ship_est'),
      product_id: product.id,
      cart_id: null,
      shipping_method_code: shippingMethod.code,
      destination_postal_code: destination_postal_code,
      destination_country: 'United States',
      quantity: quantity,
      unit_type: unit_type,
      total_weight_kg: total_weight_kg,
      estimated_cost: estimated_cost,
      estimated_transit_days: transitDays,
      created_at: new Date().toISOString()
    };

    shipping_estimates.push(estimate);
    this._saveToStorage('shipping_estimates', shipping_estimates);
    return estimate;
  }

  _calculateCartShippingEstimate(cart, destination_postal_code, shippingMethod) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const shipping_estimates = this._getFromStorage('shipping_estimates', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let total_weight_kg = 0;
    itemsForCart.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return;
      if (item.unit_type === 'kg') {
        total_weight_kg += item.quantity;
      } else if (item.unit_type === 'bag') {
        total_weight_kg += item.quantity * (product.unit_weight_kg || 0);
      } else if (item.unit_type === 'metric_ton') {
        total_weight_kg += item.quantity * 1000;
      }
    });

    const baseRate = shippingMethod.base_rate || 0;
    const ratePerKg = shippingMethod.rate_per_kg || 0;
    const estimated_cost = Number((baseRate + ratePerKg * total_weight_kg).toFixed(2));

    let transitDays = null;
    if (typeof shippingMethod.estimated_transit_days_min === 'number' && typeof shippingMethod.estimated_transit_days_max === 'number') {
      transitDays = Math.round((shippingMethod.estimated_transit_days_min + shippingMethod.estimated_transit_days_max) / 2);
    } else if (typeof shippingMethod.estimated_transit_days_min === 'number') {
      transitDays = shippingMethod.estimated_transit_days_min;
    } else if (typeof shippingMethod.estimated_transit_days_max === 'number') {
      transitDays = shippingMethod.estimated_transit_days_max;
    }

    const estimate = {
      id: this._generateId('ship_est'),
      product_id: null,
      cart_id: cart.id,
      shipping_method_code: shippingMethod.code,
      destination_postal_code: destination_postal_code,
      destination_country: 'United States',
      quantity: itemsForCart.reduce((sum, i) => sum + (i.quantity || 0), 0),
      unit_type: 'kg',
      total_weight_kg: total_weight_kg,
      estimated_cost: estimated_cost,
      estimated_transit_days: transitDays,
      created_at: new Date().toISOString()
    };

    shipping_estimates.push(estimate);
    this._saveToStorage('shipping_estimates', shipping_estimates);

    cart.shipping_estimate_total = estimated_cost;
    cart.total = Number((cart.subtotal + estimated_cost).toFixed(2));
    this._saveCart(cart);

    return estimate;
  }

  // ==========================
  // Business account helpers
  // ==========================

  _getCurrentBusinessAccount() {
    const id = localStorage.getItem('current_business_account_id') || '';
    if (!id) return null;
    const accounts = this._getFromStorage('business_accounts', []);
    return accounts.find((a) => a.id === id) || null;
  }

  _saveBusinessAccount(account) {
    let accounts = this._getFromStorage('business_accounts', []);
    const idx = accounts.findIndex((a) => a.id === account.id);
    account.updated_at = new Date().toISOString();
    if (idx >= 0) {
      accounts[idx] = account;
    } else {
      accounts.push(account);
    }
    this._saveToStorage('business_accounts', accounts);
    if (account.account_type === 'business') {
      localStorage.setItem('current_business_account_id', account.id);
    }
    return account;
  }

  _saveAddress(address, options) {
    const opts = options || {};
    const setAsDefaultShipping = !!opts.setAsDefaultShipping;
    const businessAccountId = opts.businessAccountId || null;

    let addresses = this._getFromStorage('addresses', []);
    const now = new Date().toISOString();

    if (!address.id) {
      address.id = this._generateId('addr');
      address.created_at = now;
    }
    address.updated_at = now;

    const idx = addresses.findIndex((a) => a.id === address.id);
    if (idx >= 0) {
      addresses[idx] = address;
    } else {
      addresses.push(address);
    }

    this._saveToStorage('addresses', addresses);

    if (setAsDefaultShipping && businessAccountId) {
      let account = this._getCurrentBusinessAccount();
      if (account && account.id === businessAccountId) {
        // Clear other defaults
        addresses.forEach((a) => {
          if (a.business_account_id === businessAccountId) {
            a.is_default_shipping = a.id === address.id;
          }
        });
        this._saveToStorage('addresses', addresses);

        account.default_shipping_address_id = address.id;
        this._saveBusinessAccount(account);
      }
    }

    return address;
  }

  _createQuoteRequestRecord(payload) {
    const quote_requests = this._getFromStorage('quote_requests', []);
    const now = new Date().toISOString();
    const record = {
      id: this._generateId('quote'),
      product_type: payload.product_type,
      quantity_metric_tons: payload.quantity_metric_tons,
      preferred_origin: payload.preferred_origin || null,
      delivery_location: payload.delivery_location,
      additional_details: payload.additional_details || null,
      contact_name: payload.contact_name,
      company_name: payload.company_name || null,
      email: payload.email,
      phone: payload.phone || null,
      status: 'new',
      created_at: now
    };
    quote_requests.push(record);
    this._saveToStorage('quote_requests', quote_requests);
    return record;
  }

  _getEffectiveCheckoutShippingAddress() {
    const addresses = this._getFromStorage('addresses', []);
    const checkoutAddrId = localStorage.getItem('checkout_shipping_address_id') || '';
    if (checkoutAddrId) {
      const addr = addresses.find((a) => a.id === checkoutAddrId) || null;
      if (addr) return addr;
    }
    const account = this._getCurrentBusinessAccount();
    if (!account || !account.default_shipping_address_id) return null;
    return addresses.find((a) => a.id === account.default_shipping_address_id) || null;
  }

  // ==========================
  // Interfaces implementation
  // ==========================

  // --- Homepage / navigation ---

  getMainCategories() {
    const categories = this._getFromStorage('categories', []);
    return categories.filter((c) => c.level === 'main');
  }

  getFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const active = products.filter((p) => p.is_active);
    active.sort((a, b) => {
      const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
      const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
      return rb - ra;
    });
    return active.slice(0, 10);
  }

  getHomeBulkBuyScenarios() {
    return [
      {
        id: 'scenario_wheat_1ton',
        title: '1 metric ton of wheat',
        description: 'Quickly source 1 metric ton of high-quality milling wheat.',
        example_category_url_key: 'wheat',
        packaging_type: 'metric_ton',
        unit_weight_kg: 1000,
        pricing_example_text: '1 x 1,000kg bulk under your target price per ton.'
      },
      {
        id: 'scenario_beans_10bags',
        title: '10 bags of beans',
        description: 'Bulk-buy beans in 25kg or 50kg bags for food service.',
        example_category_url_key: 'beans_pulses',
        packaging_type: 'bag',
        unit_weight_kg: 25,
        pricing_example_text: '10 x 25kg bags under your budget per bag.'
      },
      {
        id: 'scenario_corn_50kg',
        title: 'Non-GMO yellow corn in 50kg bags',
        description: 'Select non-GMO yellow corn packaged in 50kg bags.',
        example_category_url_key: 'corn_maize',
        packaging_type: 'bag',
        unit_weight_kg: 50,
        pricing_example_text: '50kg bags with competitive per-kg pricing.'
      }
    ];
  }

  getHomePromotions() {
    return [
      {
        id: 'promo_volume_beans',
        title: 'Volume discounts on beans & pulses',
        body: 'Activate automatic volume discounts on selected bean SKUs when you buy in bulk.',
        promotion_type: 'volume_discount'
      },
      {
        id: 'promo_shipping_standard',
        title: 'Competitive standard shipping',
        body: 'Estimate shipping in real-time using your ZIP code at product or cart level.',
        promotion_type: 'shipping_offer'
      }
    ];
  }

  // --- Category & filtering ---

  getCategoryDetails(categoryUrlKey) {
    const categories = this._getFromStorage('categories', []);
    const category = categories.find((c) => c.url_key === categoryUrlKey) || null;

    let parent_category = null;
    let subcategories = [];
    if (category) {
      if (category.parent_category_id) {
        parent_category = categories.find((c) => c.id === category.parent_category_id) || null;
      }
      subcategories = categories.filter((c) => c.parent_category_id === category.id);
    }

    const breadcrumb = category ? this._buildBreadcrumbForCategory(category) : [];

    return {
      category: category,
      parent_category: parent_category,
      subcategories: subcategories,
      breadcrumb: breadcrumb
    };
  }

  getCategoryFilterOptions(categoryUrlKey) {
    const products = this._getFromStorage('products', []);
    const categoryIds = this._getCategoryAndDescendantIds(categoryUrlKey);
    const relevant = products.filter((p) => categoryIds.includes(p.category_id));

    const currency = (relevant[0] && relevant[0].currency) || 'usd';
    let minPrice = null;
    let maxPrice = null;
    let minProtein = null;
    let maxProtein = null;

    relevant.forEach((p) => {
      if (typeof p.price_per_unit === 'number') {
        if (minPrice === null || p.price_per_unit < minPrice) minPrice = p.price_per_unit;
        if (maxPrice === null || p.price_per_unit > maxPrice) maxPrice = p.price_per_unit;
      }
      if (typeof p.protein_content_percent === 'number') {
        if (minProtein === null || p.protein_content_percent < minProtein) minProtein = p.protein_content_percent;
        if (maxProtein === null || p.protein_content_percent > maxProtein) maxProtein = p.protein_content_percent;
      }
    });

    const distinct = (arr) => Array.from(new Set(arr.filter((v) => v !== null && v !== undefined)));

    const beanTypes = distinct(relevant.map((p) => p.bean_type));
    const grainVarieties = distinct(relevant.map((p) => p.grain_variety));
    const gmoStatuses = distinct(relevant.map((p) => p.gmo_status));
    const bagSizes = distinct(relevant.map((p) => p.bag_size_kg));
    const packagingTypes = distinct(relevant.map((p) => p.packaging_type));
    const shipsWithinOptions = distinct(relevant.map((p) => p.ships_within_days));

    return {
      certification_options: [
        { value: 'organic', label: 'Organic' },
        { value: 'conventional', label: 'Conventional' },
        { value: 'fair_trade', label: 'Fair Trade' },
        { value: 'none', label: 'No Certification' }
      ],
      rating_thresholds: [
        { value: 4, label: '4 stars & up' },
        { value: 3, label: '3 stars & up' },
        { value: 2, label: '2 stars & up' }
      ],
      price_range: {
        min: minPrice !== null ? minPrice : 0,
        max: maxPrice !== null ? maxPrice : 0,
        currency: currency
      },
      protein_content_range: {
        min: minProtein !== null ? minProtein : 0,
        max: maxProtein !== null ? maxProtein : 0
      },
      bean_type_options: beanTypes.map((v) => ({ value: v, label: v || '' })),
      grain_variety_options: grainVarieties.map((v) => ({ value: v, label: v || '' })),
      gmo_status_options: gmoStatuses.map((v) => ({ value: v, label: v || '' })),
      bag_size_options_kg: bagSizes.map((v) => ({ value: v, label: v + 'kg' })),
      packaging_type_options: packagingTypes.map((v) => ({ value: v, label: v || '' })),
      ships_within_days_options: shipsWithinOptions.map((v) => ({ value: v, label: 'Within ' + v + ' days' })),
      volume_discount_available_option: { value: true, label: 'Volume discount available' },
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'best_value', label: 'Best Value' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' }
      ]
    };
  }

  listCategoryProducts(categoryUrlKey, filters, sort_by, page, page_size) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const categoryIds = this._getCategoryAndDescendantIds(categoryUrlKey);
    let results = products.filter((p) => p.is_active && categoryIds.includes(p.category_id));

    const f = filters || {};

    if (f.certification) {
      results = results.filter((p) => p.certification === f.certification);
    }
    if (typeof f.min_rating === 'number') {
      results = results.filter((p) => (p.rating_average || 0) >= f.min_rating);
    }
    if (typeof f.max_price_per_unit === 'number') {
      results = results.filter((p) => typeof p.price_per_unit === 'number' && p.price_per_unit <= f.max_price_per_unit);
    }
    if (typeof f.max_price_per_metric_ton === 'number') {
      results = results.filter((p) => {
        let ppm = null;
        if (typeof p.price_per_metric_ton === 'number') {
          ppm = p.price_per_metric_ton;
        } else if (p.pricing_unit === 'metric_ton') {
          ppm = p.price_per_unit;
        } else if (p.pricing_unit === 'kg') {
          ppm = p.price_per_unit * 1000;
        } else if (p.pricing_unit === 'bag' && p.unit_weight_kg) {
          ppm = p.price_per_unit * (1000 / p.unit_weight_kg);
        }
        return typeof ppm === 'number' && ppm <= f.max_price_per_metric_ton;
      });
    }
    if (typeof f.min_protein_content_percent === 'number') {
      results = results.filter((p) => typeof p.protein_content_percent === 'number' && p.protein_content_percent >= f.min_protein_content_percent);
    }
    if (f.bean_type) {
      results = results.filter((p) => p.bean_type === f.bean_type);
    }
    if (f.grain_variety) {
      results = results.filter((p) => p.grain_variety === f.grain_variety);
    }
    if (f.gmo_status) {
      results = results.filter((p) => p.gmo_status === f.gmo_status);
    }
    if (typeof f.bag_size_kg === 'number') {
      results = results.filter((p) => p.bag_size_kg === f.bag_size_kg);
    }
    if (f.packaging_type) {
      results = results.filter((p) => p.packaging_type === f.packaging_type);
    }
    if (typeof f.ships_within_days_max === 'number') {
      results = results.filter((p) => typeof p.ships_within_days === 'number' && p.ships_within_days <= f.ships_within_days_max);
    }
    if (typeof f.has_volume_discounts === 'boolean') {
      results = results.filter((p) => !!p.has_volume_discounts === f.has_volume_discounts);
    }
    if (f.pricing_unit) {
      results = results.filter((p) => p.pricing_unit === f.pricing_unit);
    }

    const sort = sort_by || 'price_low_to_high';
    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.price_per_unit || 0) - (b.price_per_unit || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.price_per_unit || 0) - (a.price_per_unit || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort === 'best_value') {
      const pricePerKg = (p) => {
        if (p.pricing_unit === 'kg') return p.price_per_unit || 0;
        if (p.pricing_unit === 'metric_ton') return (p.price_per_unit || 0) / 1000;
        if (p.pricing_unit === 'bag' && p.unit_weight_kg) return (p.price_per_unit || 0) / p.unit_weight_kg;
        return p.price_per_unit || 0;
      };
      results.sort((a, b) => pricePerKg(a) - pricePerKg(b));
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_items = results.length;
    const total_pages = Math.max(1, Math.ceil(total_items / size));
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    const productCards = paged.map((p) => {
      const category = categories.find((c) => c.id === p.category_id) || null;
      let ppm = null;
      if (typeof p.price_per_metric_ton === 'number') {
        ppm = p.price_per_metric_ton;
      } else if (p.pricing_unit === 'metric_ton') {
        ppm = p.price_per_unit;
      } else if (p.pricing_unit === 'kg') {
        ppm = p.price_per_unit * 1000;
      } else if (p.pricing_unit === 'bag' && p.unit_weight_kg) {
        ppm = p.price_per_unit * (1000 / p.unit_weight_kg);
      }

      return {
        product: p,
        category_name: category ? category.name : '',
        price_per_unit_display: this._formatCurrency(p.price_per_unit, p.currency) + ' / ' + p.pricing_unit,
        price_per_metric_ton_display: typeof ppm === 'number' ? this._formatCurrency(ppm, p.currency) + ' / metric_ton' : '',
        rating_average: p.rating_average || 0,
        rating_count: p.rating_count || 0,
        bag_size_kg: p.bag_size_kg || p.unit_weight_kg,
        unit_weight_kg: p.unit_weight_kg,
        currency: p.currency,
        volume_discount_badge_label: p.volume_discount_badge_label || ''
      };
    });

    return {
      products: productCards,
      pagination: {
        page: currentPage,
        page_size: size,
        total_items: total_items,
        total_pages: total_pages
      },
      applied_filters: {
        certification: f.certification,
        min_rating: f.min_rating,
        max_price_per_unit: f.max_price_per_unit,
        max_price_per_metric_ton: f.max_price_per_metric_ton,
        min_protein_content_percent: f.min_protein_content_percent,
        bean_type: f.bean_type,
        grain_variety: f.grain_variety,
        gmo_status: f.gmo_status,
        bag_size_kg: f.bag_size_kg,
        packaging_type: f.packaging_type,
        ships_within_days_max: f.ships_within_days_max,
        has_volume_discounts: f.has_volume_discounts,
        pricing_unit: f.pricing_unit
      }
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const tiers = this._getFromStorage('product_volume_discount_tiers', []);
    const shipping_methods = this._getFromStorage('shipping_methods', []);

    let product = products.find((p) => p.id === productId) || null;
    if (!product) {
      // Fallback: some volume-discount tiers may reference a product_id that
      // doesn't yet exist in the products collection. In that case, synthesize
      // a minimal product so tier-based lookups and cart flows still work.
      const tiersForId = tiers.filter((t) => t.product_id === productId);
      if (tiersForId.length > 0) {
        const defaultCategory = categories.find((c) => c.id === 'beans_pulses') || categories[0] || null;
        product = {
          id: productId,
          name: 'Bulk volume product',
          category_id: defaultCategory ? defaultCategory.id : null,
          pricing_unit: tiersForId[0].unit_type || 'bag',
          price_per_unit:
            typeof tiersForId[0].discounted_price_per_unit === 'number'
              ? tiersForId[0].discounted_price_per_unit
              : 0,
          currency: 'usd',
          has_volume_discounts: true,
          is_active: true
        };
        products.push(product);
        this._saveToStorage('products', products);
      } else {
        return {
          product: null,
          category: null,
          breadcrumb: [],
          volume_discount_tiers: [],
          pricing_summary: null,
          rating_summary: null,
          shipping_methods: []
        };
      }
    }

    const category = categories.find((c) => c.id === product.category_id) || null;
    const breadcrumb = this._buildBreadcrumbForCategory(category);
    const productTiers = tiers.filter((t) => t.product_id === product.id);

    let pricePerKg = null;
    if (product.pricing_unit === 'kg') {
      pricePerKg = product.price_per_unit;
    } else if (product.pricing_unit === 'metric_ton') {
      pricePerKg = product.price_per_unit / 1000;
    } else if (product.pricing_unit === 'bag' && product.unit_weight_kg) {
      pricePerKg = product.price_per_unit / product.unit_weight_kg;
    }

    let pricePerTon = null;
    if (typeof product.price_per_metric_ton === 'number') {
      pricePerTon = product.price_per_metric_ton;
    } else if (pricePerKg !== null) {
      pricePerTon = pricePerKg * 1000;
    }

    let highestDiscount = 0;
    let highestMinQty = null;
    let highestUnitType = null;
    productTiers.forEach((t) => {
      if (t.discount_percent > highestDiscount) {
        highestDiscount = t.discount_percent;
        highestMinQty = t.min_quantity;
        highestUnitType = t.unit_type;
      }
    });

    const pricing_summary = {
      price_per_unit: product.price_per_unit,
      pricing_unit: product.pricing_unit,
      price_per_kg: pricePerKg,
      price_per_metric_ton: pricePerTon,
      currency: product.currency,
      has_volume_discounts: !!product.has_volume_discounts,
      highest_discount_percent: highestDiscount || null,
      highest_discount_min_quantity: highestMinQty,
      highest_discount_unit_type: highestUnitType
    };

    const rating_summary = {
      rating_average: product.rating_average || 0,
      rating_count: product.rating_count || 0
    };

    const activeShippingMethods = shipping_methods.filter((m) => m.is_active);

    return {
      product: product,
      category: category,
      breadcrumb: breadcrumb,
      volume_discount_tiers: productTiers,
      pricing_summary: pricing_summary,
      rating_summary: rating_summary,
      shipping_methods: activeShippingMethods
    };
  }

  // --- Cart ---

  addToCart(productId, quantity, unit_type) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const unitType = unit_type || 'bag';

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, cart: null, added_item: null, message: 'Product not found' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const tiers = this._getFromStorage('product_volume_discount_tiers', []);

    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === product.id && ci.unit_type === unitType) || null;
    const now = new Date().toISOString();

    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        quantity: qty,
        unit_type: unitType,
        unit_price: product.price_per_unit,
        applied_volume_discount_percent: undefined,
        line_subtotal: 0,
        created_at: now
      };
      cartItems.push(item);
    }

    const productTiers = tiers.filter((t) => t.product_id === product.id);
    this._applyVolumeDiscountsForProduct(item, product, productTiers);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: cart,
      added_item: item,
      message: 'Item added to cart'
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const product_name = product ? product.name : '';
      const variety_label = product && (product.grain_variety || product.bean_type || '');
      const bag_size_kg = product ? (product.bag_size_kg || product.unit_weight_kg) : null;
      const currency = product ? product.currency : 'usd';

      const unit_price_display = product ? this._formatCurrency(ci.unit_price, currency) + ' / ' + ci.unit_type : '';
      const line_subtotal_display = this._formatCurrency(ci.line_subtotal || 0, currency);

      return {
        cart_item: ci,
        product: product,
        product_name: product_name,
        variety_label: variety_label,
        bag_size_kg: bag_size_kg,
        pricing_unit: product ? product.pricing_unit : null,
        unit_price_display: unit_price_display,
        line_subtotal_display: line_subtotal_display,
        currency: currency
      };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      shipping_estimate_total: cart.shipping_estimate_total || 0,
      total: cart.total || (cart.subtotal || 0) + (cart.shipping_estimate_total || 0)
    };

    return {
      cart: cart,
      items: items,
      totals: totals
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const tiers = this._getFromStorage('product_volume_discount_tiers', []);

    const item = cartItems.find((ci) => ci.id === cartItemId) || null;
    if (!item) {
      return { success: false, cart: null, updated_item: null, items: [], totals: null, message: 'Cart item not found' };
    }

    const cart = this._getOrCreateCart();

    if (quantity <= 0) {
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    } else {
      item.quantity = quantity;
      const product = products.find((p) => p.id === item.product_id) || null;
      if (product) {
        const productTiers = tiers.filter((t) => t.product_id === product.id);
        this._applyVolumeDiscountsForProduct(item, product, productTiers);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const updatedCartItems = cartItems.filter((ci) => ci.cart_id === cart.id);
    const items = updatedCartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const product_name = product ? product.name : '';
      const bag_size_kg = product ? (product.bag_size_kg || product.unit_weight_kg) : null;
      const currency = product ? product.currency : 'usd';
      const unit_price_display = product ? this._formatCurrency(ci.unit_price, currency) + ' / ' + ci.unit_type : '';
      const line_subtotal_display = this._formatCurrency(ci.line_subtotal || 0, currency);
      return {
        cart_item: ci,
        product: product,
        product_name: product_name,
        bag_size_kg: bag_size_kg,
        unit_price_display: unit_price_display,
        line_subtotal_display: line_subtotal_display
      };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      shipping_estimate_total: cart.shipping_estimate_total || 0,
      total: cart.total || (cart.subtotal || 0) + (cart.shipping_estimate_total || 0)
    };

    return {
      success: true,
      cart: cart,
      updated_item: item || null,
      items: items,
      totals: totals,
      message: 'Cart item updated'
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const item = cartItems.find((ci) => ci.id === cartItemId) || null;
    if (!item) {
      return { success: false, cart: null, items: [], totals: null, message: 'Cart item not found' };
    }

    const cart = this._getOrCreateCart();
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const updatedCartItems = cartItems.filter((ci) => ci.cart_id === cart.id);
    const items = updatedCartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const product_name = product ? product.name : '';
      const bag_size_kg = product ? (product.bag_size_kg || product.unit_weight_kg) : null;
      const currency = product ? product.currency : 'usd';
      const unit_price_display = product ? this._formatCurrency(ci.unit_price, currency) + ' / ' + ci.unit_type : '';
      const line_subtotal_display = this._formatCurrency(ci.line_subtotal || 0, currency);
      return {
        cart_item: ci,
        product: product,
        product_name: product_name,
        bag_size_kg: bag_size_kg,
        unit_price_display: unit_price_display,
        line_subtotal_display: line_subtotal_display
      };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      shipping_estimate_total: cart.shipping_estimate_total || 0,
      total: cart.total || (cart.subtotal || 0) + (cart.shipping_estimate_total || 0)
    };

    return {
      success: true,
      cart: cart,
      items: items,
      totals: totals,
      message: 'Cart item removed'
    };
  }

  // --- Shipping estimators ---

  estimateProductShipping(productId, quantity, unit_type, destination_postal_code, shipping_method_code) {
    const products = this._getFromStorage('products', []);
    const shipping_methods = this._getFromStorage('shipping_methods', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { shipping_estimate: null, shipping_method: null, message: 'Product not found' };
    }

    const method = shipping_methods.find((m) => m.code === shipping_method_code) || null;
    if (!method) {
      return { shipping_estimate: null, shipping_method: null, message: 'Shipping method not found' };
    }

    const estimate = this._calculateProductShippingEstimate(product, quantity, unit_type, destination_postal_code, method);

    return {
      shipping_estimate: estimate,
      shipping_method: method,
      message: 'Shipping estimate calculated'
    };
  }

  estimateCartShipping(destination_postal_code, shipping_method_code) {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const shipping_methods = this._getFromStorage('shipping_methods', []);
    const method = shipping_methods.find((m) => m.code === shipping_method_code) || null;
    if (!method) {
      return { shipping_estimate: null, shipping_method: null, cart: cart, totals_after_shipping: null };
    }

    const estimate = this._calculateCartShippingEstimate(cart, destination_postal_code, method);

    const totals_after_shipping = {
      subtotal: cart.subtotal || 0,
      shipping_estimate_total: cart.shipping_estimate_total || 0,
      total: cart.total || (cart.subtotal || 0) + (cart.shipping_estimate_total || 0)
    };

    return {
      shipping_estimate: estimate,
      shipping_method: method,
      cart: cart,
      totals_after_shipping: totals_after_shipping
    };
  }

  // --- Checkout ---

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const shipping_methods = this._getFromStorage('shipping_methods', []);
    const shipping_estimates = this._getFromStorage('shipping_estimates', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const product_name = product ? product.name : '';
      const bag_size_kg = product ? (product.bag_size_kg || product.unit_weight_kg) : null;
      const currency = product ? product.currency : 'usd';
      const unit_price_display = product ? this._formatCurrency(ci.unit_price, currency) + ' / ' + ci.unit_type : '';
      const line_subtotal_display = this._formatCurrency(ci.line_subtotal || 0, currency);
      return {
        cart_item: ci,
        product: product,
        product_name: product_name,
        bag_size_kg: bag_size_kg,
        unit_price_display: unit_price_display,
        line_subtotal_display: line_subtotal_display
      };
    });

    const business_account = this._getCurrentBusinessAccount();
    const shipping_address = this._getEffectiveCheckoutShippingAddress();

    const selectedCode = localStorage.getItem('selected_shipping_method_code') || '';
    const cartEstimates = shipping_estimates.filter((se) => se.cart_id === cart.id);

    const available_shipping_methods = shipping_methods.filter((m) => m.is_active).map((m) => {
      const est = cartEstimates.find((se) => se.shipping_method_code === m.code) || null;
      let estimated_cost = est ? est.estimated_cost : null;
      let estimated_transit_days = est ? est.estimated_transit_days : null;
      if (!estimated_transit_days) {
        if (typeof m.estimated_transit_days_min === 'number' && typeof m.estimated_transit_days_max === 'number') {
          estimated_transit_days = Math.round((m.estimated_transit_days_min + m.estimated_transit_days_max) / 2);
        } else if (typeof m.estimated_transit_days_min === 'number') {
          estimated_transit_days = m.estimated_transit_days_min;
        } else if (typeof m.estimated_transit_days_max === 'number') {
          estimated_transit_days = m.estimated_transit_days_max;
        }
      }
      return {
        method: m,
        estimated_cost: estimated_cost,
        estimated_transit_days: estimated_transit_days || null,
        is_selected: m.code === selectedCode
      };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      shipping_estimate_total: cart.shipping_estimate_total || 0,
      total: cart.total || (cart.subtotal || 0) + (cart.shipping_estimate_total || 0)
    };

    return {
      cart: cart,
      items: items,
      shipping_address: shipping_address,
      available_shipping_methods: available_shipping_methods,
      totals: totals,
      business_account: business_account
    };
  }

  updateCheckoutShippingAddress(address) {
    const acc = this._getCurrentBusinessAccount();

    const addressEntity = {
      id: null,
      business_account_id: acc ? acc.id : null,
      contact_name: address.contact_name || null,
      company_name: address.company_name || (acc ? acc.company_name : null) || null,
      street_line1: address.street_line1,
      street_line2: address.street_line2 || null,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country || 'United States',
      address_type: 'shipping',
      is_default_shipping: false,
      created_at: null,
      updated_at: null
    };

    const setAsDefault = !!address.set_as_default_for_account;
    const saved = this._saveAddress(addressEntity, {
      setAsDefaultShipping: setAsDefault,
      businessAccountId: acc ? acc.id : null
    });

    localStorage.setItem('checkout_shipping_address_id', saved.id);

    const updatedAccount = this._getCurrentBusinessAccount();

    return {
      success: true,
      shipping_address: saved,
      business_account: updatedAccount,
      message: 'Shipping address updated'
    };
  }

  updateCheckoutShippingMethod(shipping_method_code) {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const shipping_methods = this._getFromStorage('shipping_methods', []);
    const method = shipping_methods.find((m) => m.code === shipping_method_code) || null;

    let message = '';
    if (!method) {
      message = 'Shipping method not found';
      return {
        success: false,
        checkout_summary: this.getCheckoutSummary(),
        message: message
      };
    }

    const address = this._getEffectiveCheckoutShippingAddress();
    if (address && address.postal_code) {
      this._calculateCartShippingEstimate(cart, address.postal_code, method);
      message = 'Shipping method and estimate updated';
    } else {
      cart.shipping_estimate_total = 0;
      cart.total = cart.subtotal || 0;
      this._saveCart(cart);
      message = 'Shipping method updated (no address to estimate cost)';
    }

    localStorage.setItem('selected_shipping_method_code', shipping_method_code);

    const summary = this.getCheckoutSummary();

    return {
      success: true,
      checkout_summary: summary,
      message: message
    };
  }

  placeOrder() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    cart.status = 'checked_out';
    this._saveCart(cart);

    // Clear current cart reference so next addToCart creates a new one
    localStorage.setItem('current_cart_id', '');

    const orderNumber = 'ORD-' + cart.id;

    return {
      success: true,
      order_number: orderNumber,
      cart_cleared: true,
      message: 'Order placed successfully'
    };
  }

  // --- Business accounts & addresses ---

  registerBusinessAccount(company_name, email, password, phone, address) {
    const now = new Date().toISOString();
    const account = {
      id: this._generateId('acct'),
      account_type: 'business',
      company_name: company_name,
      email: email,
      password: password,
      phone: phone || null,
      default_shipping_address_id: null,
      created_at: now,
      updated_at: now
    };

    this._saveBusinessAccount(account);

    let defaultAddress = null;
    if (address && address.street_line1) {
      const addrEntity = {
        id: null,
        business_account_id: account.id,
        contact_name: null,
        company_name: company_name,
        street_line1: address.street_line1,
        street_line2: address.street_line2 || null,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country || 'United States',
        address_type: 'shipping',
        is_default_shipping: !!address.use_as_default_shipping,
        created_at: null,
        updated_at: null
      };

      defaultAddress = this._saveAddress(addrEntity, {
        setAsDefaultShipping: !!address.use_as_default_shipping,
        businessAccountId: account.id
      });

      if (address.use_as_default_shipping) {
        account.default_shipping_address_id = defaultAddress.id;
        this._saveBusinessAccount(account);
      }
    }

    return {
      success: true,
      business_account: account,
      default_shipping_address: defaultAddress,
      message: 'Business account registered'
    };
  }

  getAccountDashboard() {
    const account = this._getCurrentBusinessAccount();
    if (!account) {
      return {
        business_account: null,
        default_shipping_address: null,
        stats: {
          total_orders: 0,
          last_order_date: null
        }
      };
    }

    const addresses = this._getFromStorage('addresses', []);
    const carts = this._getFromStorage('carts', []);

    const defaultAddress = account.default_shipping_address_id
      ? addresses.find((a) => a.id === account.default_shipping_address_id) || null
      : null;

    const checkedOutCarts = carts.filter((c) => c.status === 'checked_out');
    const totalOrders = checkedOutCarts.length;
    let lastOrderDate = null;
    checkedOutCarts.forEach((c) => {
      const d = c.updated_at || c.created_at;
      if (d && (!lastOrderDate || d > lastOrderDate)) {
        lastOrderDate = d;
      }
    });

    return {
      business_account: account,
      default_shipping_address: defaultAddress,
      stats: {
        total_orders: totalOrders,
        last_order_date: lastOrderDate
      }
    };
  }

  getAddressesForAccount() {
    const account = this._getCurrentBusinessAccount();
    if (!account) {
      return {
        addresses: [],
        default_shipping_address_id: null
      };
    }

    const addresses = this._getFromStorage('addresses', []);
    const result = addresses.filter((a) => a.business_account_id === account.id);

    return {
      addresses: result,
      default_shipping_address_id: account.default_shipping_address_id || null
    };
  }

  updateAddress(addressId, contact_name, company_name, street_line1, street_line2, city, state, postal_code, country, is_default_shipping) {
    let addresses = this._getFromStorage('addresses', []);
    const account = this._getCurrentBusinessAccount();

    let address = addresses.find((a) => a.id === addressId) || null;
    if (!address) {
      return {
        success: false,
        address: null,
        business_account: account,
        message: 'Address not found'
      };
    }

    if (typeof contact_name !== 'undefined') address.contact_name = contact_name;
    if (typeof company_name !== 'undefined') address.company_name = company_name;
    if (typeof street_line1 !== 'undefined') address.street_line1 = street_line1;
    if (typeof street_line2 !== 'undefined') address.street_line2 = street_line2;
    if (typeof city !== 'undefined') address.city = city;
    if (typeof state !== 'undefined') address.state = state;
    if (typeof postal_code !== 'undefined') address.postal_code = postal_code;
    if (typeof country !== 'undefined') address.country = country;

    const setDefault = typeof is_default_shipping === 'boolean' ? is_default_shipping : address.is_default_shipping;
    address.is_default_shipping = setDefault;

    this._saveAddress(address, {
      setAsDefaultShipping: setDefault,
      businessAccountId: account ? account.id : null
    });

    const updatedAccount = this._getCurrentBusinessAccount();

    return {
      success: true,
      address: address,
      business_account: updatedAccount,
      message: 'Address updated'
    };
  }

  setDefaultShippingAddress(addressId) {
    const account = this._getCurrentBusinessAccount();
    if (!account) {
      return {
        business_account: null,
        default_shipping_address: null,
        success: false,
        message: 'No business account'
      };
    }

    let addresses = this._getFromStorage('addresses', []);
    let address = addresses.find((a) => a.id === addressId && a.business_account_id === account.id) || null;
    if (!address) {
      return {
        business_account: account,
        default_shipping_address: null,
        success: false,
        message: 'Address not found for this account'
      };
    }

    addresses.forEach((a) => {
      if (a.business_account_id === account.id) {
        a.is_default_shipping = a.id === address.id;
      }
    });
    this._saveToStorage('addresses', addresses);

    account.default_shipping_address_id = address.id;
    this._saveBusinessAccount(account);

    return {
      business_account: account,
      default_shipping_address: address,
      success: true,
      message: 'Default shipping address updated'
    };
  }

  // --- Quote requests ---

  submitQuoteRequest(product_type, quantity_metric_tons, preferred_origin, delivery_location, additional_details, contact_name, company_name, email, phone) {
    const record = this._createQuoteRequestRecord({
      product_type: product_type,
      quantity_metric_tons: quantity_metric_tons,
      preferred_origin: preferred_origin,
      delivery_location: delivery_location,
      additional_details: additional_details,
      contact_name: contact_name,
      company_name: company_name,
      email: email,
      phone: phone
    });

    return {
      quote_request: record,
      success: true,
      message: 'Quote request submitted'
    };
  }

  getQuoteFormOptions() {
    return {
      product_type_options: [
        { value: 'soybeans', label: 'Soybeans' },
        { value: 'wheat', label: 'Wheat' },
        { value: 'rice', label: 'Rice' },
        { value: 'corn_maize', label: 'Corn & Maize' },
        { value: 'beans_pulses', label: 'Beans & Pulses' },
        { value: 'chickpeas', label: 'Chickpeas' },
        { value: 'lentils', label: 'Lentils' },
        { value: 'other', label: 'Other' }
      ],
      default_quantity_metric_tons: 1
    };
  }

  // --- Shipping methods list ---

  listShippingMethods() {
    const methods = this._getFromStorage('shipping_methods', []);
    return methods.filter((m) => m.is_active);
  }

  // --- Static / content endpoints ---

  getAboutContent() {
    // Read from storage if present, otherwise return minimal default
    const stored = this._getFromStorage('about_content', null);
    if (stored && typeof stored === 'object') return stored;

    return {
      heading: 'About Our Agricultural Supply Platform',
      body_html: 'We specialize in bulk supply of grains, beans, and pulses to food manufacturers, distributors, and food service buyers.',
      sourcing_regions: [],
      certifications: [],
      customer_segments: [],
      differentiators: []
    };
  }

  getContactInfo() {
    const stored = this._getFromStorage('contact_info', null);
    if (stored && typeof stored === 'object') return stored;

    return {
      primary_phone: '',
      sales_email: '',
      support_email: '',
      office_locations: []
    };
  }

  submitContactForm(name, email, phone, subject, message) {
    const contact_messages = this._getFromStorage('contact_messages', []);
    const record = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      phone: phone || null,
      subject: subject || null,
      message: message,
      created_at: new Date().toISOString()
    };
    contact_messages.push(record);
    this._saveToStorage('contact_messages', contact_messages);

    return {
      success: true,
      message: 'Contact request submitted'
    };
  }

  getHelpFaqContent() {
    const stored = this._getFromStorage('help_faq_content', null);
    if (stored && typeof stored === 'object') return stored;

    return {
      faqs: []
    };
  }

  getShippingDeliveryInfo() {
    const stored = this._getFromStorage('shipping_delivery_info', null);
    if (stored && typeof stored === 'object') return stored;

    const shipping_methods = this._getFromStorage('shipping_methods', []);

    return {
      shipping_methods: shipping_methods,
      lead_time_explanations: [],
      coverage_regions: []
    };
  }

  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_content', null);
    if (stored && typeof stored === 'object') return stored;

    return {
      last_updated: null,
      sections: []
    };
  }

  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_content', null);
    if (stored && typeof stored === 'object') return stored;

    return {
      last_updated: null,
      sections: []
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
