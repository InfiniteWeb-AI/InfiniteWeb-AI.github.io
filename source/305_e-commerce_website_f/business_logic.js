// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
  }

  // Initialize all data tables in localStorage if not exist
  _initStorage() {
    const arrayKeys = [
      'products',
      'categories',
      'product_pricing_options',
      'cart',
      'cart_items',
      'promo_codes',
      'orders',
      'trial_signups',
      'comparison_sessions',
      'pages',
      'navigation_links',
      'help_topics',
      'contact_requests'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // Legacy keys from skeleton (kept as empty arrays to avoid confusion)
    const legacyArrayKeys = ['users', 'carts', 'cartItems'];
    legacyArrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Contact info container (object, not array)
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          support_email: '',
          sales_email: '',
          support_phone: '',
          business_hours: '',
          additional_notes: ''
        })
      );
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  // ---------- Internal helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        currency: 'USD'
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _updateCartInStorage(updatedCart) {
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === updatedCart.id);
    if (idx >= 0) {
      carts[idx] = updatedCart;
    } else {
      carts.push(updatedCart);
    }
    this._saveToStorage('cart', carts);
  }

  _getCartItemsForCart(cartId) {
    const allItems = this._getFromStorage('cart_items');
    return allItems.filter((ci) => ci.cart_id === cartId);
  }

  _saveCartItemsForCart(cartId, itemsForCart) {
    const allItems = this._getFromStorage('cart_items');
    const remaining = allItems.filter((ci) => ci.cart_id !== cartId);
    const merged = remaining.concat(itemsForCart);
    this._saveToStorage('cart_items', merged);
  }

  _recalculateCartTotals(cart) {
    const items = this._getCartItemsForCart(cart.id);
    let subtotal = 0;
    let discountTotal = 0;

    items.forEach((item) => {
      const unit = typeof item.unit_price === 'number' ? item.unit_price : 0;
      const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      item.quantity = qty;
      item.line_subtotal = unit * qty;
      const lineDiscount = typeof item.line_discount === 'number' ? item.line_discount : 0;
      item.line_discount = lineDiscount;
      item.line_total = item.line_subtotal - lineDiscount;
      subtotal += item.line_subtotal;
      discountTotal += lineDiscount;
    });

    this._saveCartItemsForCart(cart.id, items);

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    if (typeof cart.tax_total !== 'number') {
      cart.tax_total = 0;
    }
    cart.total = subtotal - discountTotal + cart.tax_total;
    cart.updated_at = this._nowISO();
    this._updateCartInStorage(cart);
    return cart;
  }

  _getDefaultPricingOption(productId) {
    const allOptions = this._getFromStorage('product_pricing_options');
    const options = allOptions.filter((o) => o.product_id === productId);
    if (!options.length) return null;
    const defaultOption = options.find((o) => o.is_default);
    if (defaultOption) return defaultOption;
    // fallback: cheapest by current_price
    let cheapest = options[0];
    options.forEach((o) => {
      if (typeof o.current_price === 'number' && typeof cheapest.current_price === 'number') {
        if (o.current_price < cheapest.current_price) {
          cheapest = o;
        }
      }
    });
    return cheapest;
  }

  _findPricingOptionForConfiguration(productId, license_duration, device_count, billing_term) {
    const allOptions = this._getFromStorage('product_pricing_options');
    return (
      allOptions.find(
        (o) =>
          o.product_id === productId &&
          o.license_duration === license_duration &&
          o.device_count === device_count &&
          o.billing_term === billing_term
      ) || null
    );
  }

  _getOrCreateOrder() {
    const cart = this._getOrCreateCart();
    let orders = this._getFromStorage('orders');
    let order = orders.find(
      (o) => o.cart_id === cart.id && (o.status === 'draft' || o.status === 'pending_payment')
    );
    if (!order) {
      order = {
        id: this._generateId('order'),
        cart_id: cart.id,
        status: 'draft',
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        placed_at: null,
        contact_first_name: '',
        contact_last_name: '',
        contact_email: '',
        checkout_mode: 'guest',
        promo_code: '',
        promo_discount: 0,
        payment_method: 'none',
        payment_status: 'not_started',
        currency: cart.currency || 'USD',
        total: cart.total
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    }
    localStorage.setItem('current_order_id', order.id);
    if (!localStorage.getItem('checkout_current_step')) {
      localStorage.setItem('checkout_current_step', 'summary');
    }
    return order;
  }

  _getCurrentOrder() {
    const orderId = localStorage.getItem('current_order_id');
    if (!orderId) return null;
    const orders = this._getFromStorage('orders');
    return orders.find((o) => o.id === orderId) || null;
  }

  _saveOrder(order) {
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.push(order);
    }
    this._saveToStorage('orders', orders);
  }

  _getOrCreateComparisonSession() {
    let sessions = this._getFromStorage('comparison_sessions');
    let session = sessions[0];
    if (!session) {
      session = {
        id: this._generateId('comparison_session'),
        product_ids: [],
        created_at: this._nowISO()
      };
      sessions.push(session);
      this._saveToStorage('comparison_sessions', sessions);
    }
    return session;
  }

  _saveComparisonSession(session) {
    let sessions = this._getFromStorage('comparison_sessions');
    if (!sessions.length) {
      sessions = [session];
    } else {
      sessions[0] = session;
    }
    this._saveToStorage('comparison_sessions', sessions);
  }

  _buildCartResponse(cart) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const pricingOptions = this._getFromStorage('product_pricing_options');
    const items = this._getCartItemsForCart(cart.id);

    const responseItems = items.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      const category = categories.find((c) => c.id === item.category_id) || null;
      const pricing = pricingOptions.find((p) => p.id === item.pricing_option_id) || null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        category_id: item.category_id,
        category_name: category ? category.name : null,
        license_duration: item.license_duration,
        device_count: item.device_count,
        billing_term: item.billing_term,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_subtotal: item.line_subtotal,
        line_discount: typeof item.line_discount === 'number' ? item.line_discount : 0,
        line_total: item.line_total,
        auto_renewal_enabled: !!item.auto_renewal_enabled,
        supports_auto_renewal: pricing ? !!pricing.supports_auto_renewal : false,
        is_trial: !!item.is_trial,
        image_url: product ? product.image_url || null : null,
        // foreign key resolutions (snake-case _id handling)
        product: product,
        category: category,
        pricing_option: pricing
      };
    });

    return {
      cart_id: cart.id,
      status: cart.status,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      tax_total: cart.tax_total,
      total: cart.total,
      currency: cart.currency,
      items: responseItems
    };
  }

  _buildOrderSummary(cart, promoDiscount) {
    const items = this._getCartItemsForCart(cart.id);
    const summaryItems = items.map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      license_duration: item.license_duration,
      device_count: item.device_count,
      billing_term: item.billing_term,
      line_total: item.line_total
    }));

    const subtotal = cart.subtotal;
    const cartDiscount = cart.discount_total || 0;
    const promo = promoDiscount || 0;
    const discount_total = cartDiscount + promo;
    const tax = cart.tax_total || 0;
    const total = subtotal - discount_total + tax;

    return {
      items: summaryItems,
      subtotal: subtotal,
      discount_total: discount_total,
      tax_total: tax,
      total: total,
      currency: cart.currency || 'USD'
    };
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  // ---------- Core interface implementations ----------

  // getCategories()
  getCategories() {
    const categories = this._getFromStorage('categories');
    return categories
      .slice()
      .sort((a, b) => {
        const ao = typeof a.display_order === 'number' ? a.display_order : 0;
        const bo = typeof b.display_order === 'number' ? b.display_order : 0;
        return ao - bo;
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        display_order: c.display_order || 0
      }));
  }

  // getHomeHighlights()
  getHomeHighlights() {
    const products = this._getFromStorage('products').filter((p) => p.status === 'active');
    const categories = this._getFromStorage('categories');
    const productPricing = this._getFromStorage('product_pricing_options');

    const withDefaultPricing = products
      .map((p) => {
        const pricing = this._getDefaultPricingOption(p.id);
        return { product: p, pricing: pricing };
      })
      .filter((x) => !!x.pricing);

    const discountValueNormalized = (pricing) => {
      if (!pricing || pricing.discount_type === 'none') return 0;
      if (pricing.discount_type === 'percent') return pricing.discount_value || 0;
      if (pricing.discount_type === 'amount') {
        const base = pricing.base_price || 0;
        if (!base) return 0;
        return (pricing.discount_value || 0) / base * 100;
      }
      return 0;
    };

    const featured_deals = withDefaultPricing
      .filter((x) => x.pricing.discount_type && x.pricing.discount_type !== 'none')
      .sort((a, b) => discountValueNormalized(b.pricing) - discountValueNormalized(a.pricing))
      .slice(0, 10)
      .map((x) => ({
        product_id: x.product.id,
        name: x.product.name,
        description_short: x.product.description_short || '',
        image_url: x.product.image_url || null,
        current_price: x.pricing.current_price,
        base_price: x.pricing.base_price,
        discount_label: x.pricing.discount_label || '',
        rating: x.product.rating || 0,
        rating_count: x.product.rating_count || 0,
        key_features: x.product.features || []
      }));

    const top_rated_products = products
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
      .map((p) => ({
        product_id: p.id,
        name: p.name,
        rating: p.rating || 0,
        rating_count: p.rating_count || 0,
        segment: p.segment,
        product_type: p.product_type
      }));

    const promotional_bundles = withDefaultPricing
      .filter((x) => x.product.product_type === 'bundle')
      .sort((a, b) => discountValueNormalized(b.pricing) - discountValueNormalized(a.pricing))
      .slice(0, 10)
      .map((x) => ({
        product_id: x.product.id,
        name: x.product.name,
        description_short: x.product.description_short || '',
        image_url: x.product.image_url || null,
        current_price: x.pricing.current_price,
        base_price: x.pricing.base_price,
        discount_label: x.pricing.discount_label || ''
      }));

    const quick_task_links = categories.map((cat) => {
      let taskType = 'view_category';
      if (cat.id === 'free_trials') {
        taskType = 'start_free_trial';
      } else if (cat.id === 'business_solutions') {
        taskType = 'view_small_business_plans';
      } else if (cat.id === 'antivirus_home') {
        taskType = 'view_home_antivirus';
      }
      return {
        label: cat.name,
        target_category_id: cat.id,
        task_type: taskType
      };
    });

    return {
      featured_deals: featured_deals,
      top_rated_products: top_rated_products,
      promotional_bundles: promotional_bundles,
      quick_task_links: quick_task_links
    };
  }

  // getProductFilterOptions(categoryId, query)
  getProductFilterOptions(categoryId, query) {
    const productsAll = this._getFromStorage('products').filter((p) => p.status === 'active');
    const pricingAll = this._getFromStorage('product_pricing_options');

    const q = this._normalizeString(query);
    let products = productsAll;
    if (categoryId) {
      products = products.filter((p) => p.category_id === categoryId);
    }
    if (q) {
      products = products.filter((p) => {
        const name = this._normalizeString(p.name);
        const desc = this._normalizeString(p.description_short) + ' ' + this._normalizeString(p.description_long);
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    const productIds = products.map((p) => p.id);
    const pricing = pricingAll.filter((po) => productIds.indexOf(po.product_id) !== -1);

    const operatingSystemsSet = new Set();
    const licenseDurationsSet = new Set();
    const deviceCountsSet = new Set();
    const ratingThresholdsSet = new Set();
    const featureOptionsSet = new Set();
    const billingTermsSet = new Set();
    const businessSizesSet = new Set();
    const deviceCoverageSet = new Set();
    const supportFeaturesSet = new Set();
    const trialDurationsSet = new Set();

    let minPrice = null;
    let maxPrice = null;

    products.forEach((p) => {
      (p.supported_operating_systems || []).forEach((os) => operatingSystemsSet.add(os));
      if (typeof p.rating === 'number') {
        const floored = Math.floor(p.rating);
        if (floored >= 1 && floored <= 5) ratingThresholdsSet.add(floored);
        if (p.rating >= 4 && !ratingThresholdsSet.has(4)) ratingThresholdsSet.add(4);
      }
      (p.features || []).forEach((f) => {
        featureOptionsSet.add(f);
        if (f.indexOf('support') !== -1) supportFeaturesSet.add(f);
      });
      if (p.business_size) businessSizesSet.add(p.business_size);
      if (p.device_coverage_range) deviceCoverageSet.add(p.device_coverage_range);
      if (p.trial_duration) trialDurationsSet.add(p.trial_duration);
    });

    pricing.forEach((po) => {
      if (po.license_duration) licenseDurationsSet.add(po.license_duration);
      if (typeof po.device_count === 'number') deviceCountsSet.add(po.device_count);
      if (po.billing_term) billingTermsSet.add(po.billing_term);
      if (typeof po.current_price === 'number') {
        if (minPrice === null || po.current_price < minPrice) minPrice = po.current_price;
        if (maxPrice === null || po.current_price > maxPrice) maxPrice = po.current_price;
      }
    });

    const ratingThresholds = Array.from(ratingThresholdsSet).sort((a, b) => a - b);

    const available_filters = {
      operating_systems: Array.from(operatingSystemsSet),
      license_durations: Array.from(licenseDurationsSet),
      device_counts: Array.from(deviceCountsSet).sort((a, b) => a - b),
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0
      },
      rating_thresholds: ratingThresholds,
      feature_options: Array.from(featureOptionsSet),
      billing_terms: Array.from(billingTermsSet),
      business_sizes: Array.from(businessSizesSet),
      device_coverage_ranges: Array.from(deviceCoverageSet),
      support_feature_options: Array.from(supportFeaturesSet),
      trial_durations: Array.from(trialDurationsSet),
      sort_options: ['price_asc', 'price_desc', 'rating_desc', 'discount_desc', 'featured']
    };

    return { available_filters: available_filters };
  }

  // getProductsForListing(categoryId, query, filters, sort_by, sort_direction, page, page_size)
  getProductsForListing(categoryId, query, filters, sort_by, sort_direction, page, page_size) {
    const allProducts = this._getFromStorage('products').filter((p) => p.status === 'active');
    const categories = this._getFromStorage('categories');
    const pricingAll = this._getFromStorage('product_pricing_options');

    const q = this._normalizeString(query);
    let products = allProducts;

    if (categoryId) {
      products = products.filter((p) => p.category_id === categoryId);
    }

    if (q) {
      const tokens = q.split(/\s+/).filter((t) => t);
      products = products.filter((p) => {
        const textParts = [
          p.name,
          p.description_short,
          p.description_long,
          (p.features || []).join(' '),
          p.product_type,
          p.segment
        ];
        const combined = this._normalizeString(textParts.join(' '));
        if (!tokens.length) return true;
        return tokens.some((t) => combined.indexOf(t) !== -1);
      });
    }

    const f = filters || {};

    if (f.operating_systems && f.operating_systems.length) {
      const osSet = new Set(f.operating_systems);
      products = products.filter((p) =>
        (p.supported_operating_systems || []).some((os) => osSet.has(os))
      );
    }

    if (typeof f.min_rating === 'number') {
      products = products.filter((p) => (p.rating || 0) >= f.min_rating);
    }

    if (f.features && f.features.length) {
      const featureSet = new Set(f.features);
      products = products.filter((p) => {
        const pf = p.features || [];
        for (const feat of featureSet) {
          if (pf.indexOf(feat) === -1) return false;
        }
        return true;
      });
    }

    if (f.business_size) {
      products = products.filter((p) => p.business_size === f.business_size);
    }

    if (f.device_coverage_range) {
      products = products.filter((p) => p.device_coverage_range === f.device_coverage_range);
    }

    if (f.support_features && f.support_features.length) {
      const supportSet = new Set(f.support_features);
      products = products.filter((p) =>
        (p.features || []).some((feat) => supportSet.has(feat))
      );
    }

    if (f.trial_duration) {
      products = products.filter((p) => p.trial_duration === f.trial_duration);
    }

    // Pricing-related filters
    const productIds = products.map((p) => p.id);
    const pricingByProduct = new Map();
    pricingAll.forEach((po) => {
      if (productIds.indexOf(po.product_id) === -1) return;
      if (!pricingByProduct.has(po.product_id)) pricingByProduct.set(po.product_id, []);
      pricingByProduct.get(po.product_id).push(po);
    });

    products = products.filter((p) => {
      const options = pricingByProduct.get(p.id) || [];
      if (!options.length) return false;

      let match = options;

      if (f.license_duration) {
        match = match.filter((o) => o.license_duration === f.license_duration);
      }
      if (typeof f.device_count === 'number') {
        match = match.filter((o) => o.device_count === f.device_count);
      }
      if (f.billing_term) {
        match = match.filter((o) => o.billing_term === f.billing_term);
      }
      if (typeof f.min_price === 'number') {
        match = match.filter((o) => typeof o.current_price === 'number' && o.current_price >= f.min_price);
      }
      if (typeof f.max_price === 'number') {
        match = match.filter((o) => typeof o.current_price === 'number' && o.current_price <= f.max_price);
      }

      return match.length > 0;
    });

    const toListingItem = (p) => {
      const options = pricingByProduct.get(p.id) || [];
      const defaultPricing = this._getDefaultPricingOption(p.id);

      let minPrice = null;
      let maxPrice = null;
      options.forEach((o) => {
        if (typeof o.current_price === 'number') {
          if (minPrice === null || o.current_price < minPrice) minPrice = o.current_price;
          if (maxPrice === null || o.current_price > maxPrice) maxPrice = o.current_price;
        }
      });

      const category = categories.find((c) => c.id === p.category_id) || null;

      return {
        product_id: p.id,
        name: p.name,
        description_short: p.description_short || '',
        image_url: p.image_url || null,
        segment: p.segment,
        product_type: p.product_type,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        supported_operating_systems: p.supported_operating_systems || [],
        rating: p.rating || 0,
        rating_count: p.rating_count || 0,
        default_pricing: defaultPricing
          ? {
              pricing_option_id: defaultPricing.id,
              license_duration: defaultPricing.license_duration,
              device_count: defaultPricing.device_count,
              billing_term: defaultPricing.billing_term,
              base_price: defaultPricing.base_price,
              current_price: defaultPricing.current_price,
              currency: defaultPricing.currency || 'USD',
              discount_type: defaultPricing.discount_type,
              discount_value: defaultPricing.discount_value || 0,
              discount_label: defaultPricing.discount_label || '',
              supports_auto_renewal: !!defaultPricing.supports_auto_renewal,
              auto_renewal_default: defaultPricing.auto_renewal_default || 'off'
            }
          : null,
        min_price: minPrice,
        max_price: maxPrice,
        key_features: p.features || [],
        is_premium: !!p.is_premium,
        business_size: p.business_size || null,
        device_coverage_range: p.device_coverage_range || null,
        trial_available: !!p.trial_available,
        trial_duration: p.trial_duration || null,
        compare_allowed: true
      };
    };

    let listing = products.map(toListingItem);

    const sortBy = sort_by || 'featured';
    const dir = (sort_direction || 'asc').toLowerCase();
    const dirMul = dir === 'desc' ? -1 : 1;

    if (sortBy === 'price') {
      listing.sort((a, b) => {
        const ap = a.default_pricing ? a.default_pricing.current_price || 0 : Number.MAX_VALUE;
        const bp = b.default_pricing ? b.default_pricing.current_price || 0 : Number.MAX_VALUE;
        if (ap === bp) return 0;
        return ap < bp ? -1 * dirMul : 1 * dirMul;
      });
    } else if (sortBy === 'rating') {
      listing.sort((a, b) => {
        const ar = a.rating || 0;
        const br = b.rating || 0;
        if (ar === br) return 0;
        return ar < br ? 1 * dirMul * -1 : -1 * dirMul * -1;
      });
    } else if (sortBy === 'discount') {
      const discountNorm = (item) => {
        const p = item.default_pricing;
        if (!p || !p.discount_type || p.discount_type === 'none') return 0;
        if (p.discount_type === 'percent') return p.discount_value || 0;
        if (p.discount_type === 'amount') {
          const base = p.base_price || 0;
          if (!base) return 0;
          return (p.discount_value || 0) / base * 100;
        }
        return 0;
      };
      listing.sort((a, b) => {
        const ad = discountNorm(a);
        const bd = discountNorm(b);
        if (ad === bd) return 0;
        return ad < bd ? -1 * dirMul : 1 * dirMul;
      });
    } else if (sortBy === 'featured') {
      listing.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const totalItems = listing.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const start = (currentPage - 1) * size;
    const end = start + size;
    const paged = listing.slice(start, end);

    const applied_filters = {
      operating_systems: f.operating_systems || [],
      license_duration: f.license_duration || null,
      device_count: typeof f.device_count === 'number' ? f.device_count : null,
      max_price: typeof f.max_price === 'number' ? f.max_price : null,
      min_price: typeof f.min_price === 'number' ? f.min_price : null,
      min_rating: typeof f.min_rating === 'number' ? f.min_rating : null,
      features: f.features || [],
      billing_term: f.billing_term || null,
      business_size: f.business_size || null,
      device_coverage_range: f.device_coverage_range || null,
      support_features: f.support_features || [],
      trial_duration: f.trial_duration || null
    };

    const sort_applied = {
      sort_by: sortBy,
      sort_direction: dir
    };

    const pagination = {
      page: currentPage,
      page_size: size,
      total_items: totalItems,
      total_pages: totalPages
    };

    // Instrumentation for task completion tracking
    try {
      const qContainsInternetSecurity =
        typeof q === 'string' && q.indexOf('internet security') !== -1;
      const hasCorrectFilters =
        filters &&
        filters.license_duration === '2_year' &&
        typeof filters.device_count === 'number' &&
        filters.device_count === 5;

      if (qContainsInternetSecurity && hasCorrectFilters && listing && listing.length >= 2) {
        const value = {
          timestamp: this._nowISO(),
          query: query,
          filters_snapshot: applied_filters,
          sort_applied: sort_applied,
          first_two_product_ids: listing.slice(0, 2).map((p) => p.product_id)
        };
        localStorage.setItem('task2_firstTwoResults', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      products: paged,
      pagination: pagination,
      applied_filters: applied_filters,
      sort_applied: sort_applied
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const pricingAll = this._getFromStorage('product_pricing_options');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { product: null, pricing_options: [], configuration_options: {}, trial_info: {} };
    }

    const category = categories.find((c) => c.id === product.category_id) || null;
    const pricingOptions = pricingAll.filter((po) => po.product_id === productId);

    const pricing_options = pricingOptions.map((po) => ({
      pricing_option_id: po.id,
      license_duration: po.license_duration,
      device_count: po.device_count,
      billing_term: po.billing_term,
      base_price: po.base_price,
      current_price: po.current_price,
      currency: po.currency || 'USD',
      discount_type: po.discount_type,
      discount_value: po.discount_value || 0,
      discount_label: po.discount_label || '',
      is_default: !!po.is_default,
      supports_auto_renewal: !!po.supports_auto_renewal,
      auto_renewal_default: po.auto_renewal_default || 'off'
    }));

    const licenseDurationsSet = new Set();
    const deviceCountsSet = new Set();
    const billingTermsSet = new Set();
    pricingOptions.forEach((po) => {
      if (po.license_duration) licenseDurationsSet.add(po.license_duration);
      if (typeof po.device_count === 'number') deviceCountsSet.add(po.device_count);
      if (po.billing_term) billingTermsSet.add(po.billing_term);
    });

    const defaultPricing = this._getDefaultPricingOption(productId);

    const configuration_options = {
      available_license_durations: Array.from(licenseDurationsSet),
      available_device_counts: Array.from(deviceCountsSet).sort((a, b) => a - b),
      available_billing_terms: Array.from(billingTermsSet),
      default_license_duration: defaultPricing ? defaultPricing.license_duration : null,
      default_device_count: defaultPricing ? defaultPricing.device_count : null,
      default_billing_term: defaultPricing ? defaultPricing.billing_term : null
    };

    const trial_info = {
      trial_available: !!product.trial_available,
      trial_duration: product.trial_duration || null,
      marketing_opt_in_default: true
    };

    const productOut = {
      id: product.id,
      name: product.name,
      slug: product.slug || null,
      category_id: product.category_id,
      category_name: category ? category.name : null,
      segment: product.segment,
      product_type: product.product_type,
      description_short: product.description_short || '',
      description_long: product.description_long || '',
      image_url: product.image_url || null,
      supported_operating_systems: product.supported_operating_systems || [],
      rating: product.rating || 0,
      rating_count: product.rating_count || 0,
      features: product.features || [],
      business_size: product.business_size || null,
      device_coverage_range: product.device_coverage_range || null,
      min_devices: product.min_devices || null,
      max_devices: product.max_devices || null,
      supports_auto_renewal: !!product.supports_auto_renewal,
      is_premium: !!product.is_premium,
      trial_available: !!product.trial_available,
      trial_duration: product.trial_duration || null,
      system_requirements: product.system_requirements || '',
      support_summary: product.support_summary || ''
    };

    return {
      product: productOut,
      pricing_options: pricing_options,
      configuration_options: configuration_options,
      trial_info: trial_info
    };
  }

  // getProductConfigurationPrice(productId, license_duration, device_count, billing_term)
  getProductConfigurationPrice(productId, license_duration, device_count, billing_term) {
    const po = this._findPricingOptionForConfiguration(
      productId,
      license_duration,
      device_count,
      billing_term
    );
    if (!po) return null;
    return {
      pricing_option_id: po.id,
      license_duration: po.license_duration,
      device_count: po.device_count,
      billing_term: po.billing_term,
      base_price: po.base_price,
      current_price: po.current_price,
      currency: po.currency || 'USD',
      discount_type: po.discount_type,
      discount_value: po.discount_value || 0,
      discount_label: po.discount_label || '',
      supports_auto_renewal: !!po.supports_auto_renewal,
      auto_renewal_default: po.auto_renewal_default || 'off'
    };
  }

  // addToCart(productId, pricingOptionId, quantity, auto_renewal_enabled)
  addToCart(productId, pricingOptionId, quantity, auto_renewal_enabled) {
    const products = this._getFromStorage('products');
    const pricingAll = this._getFromStorage('product_pricing_options');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found', cart: null, added_item: null };
    }

    let pricing = null;
    if (pricingOptionId) {
      pricing = pricingAll.find((po) => po.id === pricingOptionId && po.product_id === productId) || null;
    }
    if (!pricing) {
      pricing = this._getDefaultPricingOption(productId);
    }
    if (!pricing) {
      return { success: false, message: 'Pricing option not found', cart: null, added_item: null };
    }

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const unitPrice = pricing.current_price || 0;
    const autoRenewal = typeof auto_renewal_enabled === 'boolean'
      ? auto_renewal_enabled
      : pricing.auto_renewal_default === 'on';

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      pricing_option_id: pricing.id,
      product_name: product.name,
      category_id: product.category_id,
      license_duration: pricing.license_duration,
      device_count: pricing.device_count,
      billing_term: pricing.billing_term,
      unit_price: unitPrice,
      quantity: qty,
      line_subtotal: unitPrice * qty,
      line_discount: 0,
      line_total: unitPrice * qty,
      auto_renewal_enabled: pricing.supports_auto_renewal ? !!autoRenewal : false,
      is_trial: pricing.license_duration === 'trial_30_day' || pricing.billing_term === 'trial'
    };

    allItems.push(cartItem);
    this._saveToStorage('cart_items', allItems);

    const updatedCart = this._recalculateCartTotals(cart);
    const cartResponse = this._buildCartResponse(updatedCart);

    const added_item = {
      cart_item_id: cartItem.id,
      product_id: cartItem.product_id,
      product_name: cartItem.product_name,
      quantity: cartItem.quantity,
      line_total: cartItem.line_total
    };

    return {
      success: true,
      message: 'Item added to cart',
      cart: cartResponse,
      added_item: added_item
    };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    const updatedCart = this._recalculateCartTotals(cart);
    return this._buildCartResponse(updatedCart);
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const allItems = this._getFromStorage('cart_items');
    const idx = allItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        removed_item_id: cartItemId,
        cart: null
      };
    }

    const removed = allItems[idx];
    allItems.splice(idx, 1);
    this._saveToStorage('cart_items', allItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === removed.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartResponse = this._buildCartResponse(updatedCart);

    return {
      success: true,
      message: 'Cart item removed',
      removed_item_id: cartItemId,
      cart: {
        cart_id: cartResponse.cart_id,
        subtotal: cartResponse.subtotal,
        discount_total: cartResponse.discount_total,
        tax_total: cartResponse.tax_total,
        total: cartResponse.total,
        currency: cartResponse.currency,
        items: cartResponse.items.map((i) => ({
          cart_item_id: i.cart_item_id,
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          line_total: i.line_total
        }))
      }
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const newQty = typeof quantity === 'number' ? quantity : 1;
    const allItems = this._getFromStorage('cart_items');
    const idx = allItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        updated_item: null,
        cart: null
      };
    }

    if (newQty <= 0) {
      // treat as removal
      return this.removeCartItem(cartItemId);
    }

    const item = allItems[idx];
    item.quantity = newQty;
    allItems[idx] = item;
    this._saveToStorage('cart_items', allItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const updatedItem = this._getCartItemsForCart(cart.id).find((ci) => ci.id === cartItemId) || item;

    const cartSummary = {
      cart_id: updatedCart.id,
      subtotal: updatedCart.subtotal,
      discount_total: updatedCart.discount_total,
      tax_total: updatedCart.tax_total,
      total: updatedCart.total,
      currency: updatedCart.currency
    };

    return {
      success: true,
      message: 'Cart item quantity updated',
      updated_item: {
        cart_item_id: updatedItem.id,
        product_id: updatedItem.product_id,
        product_name: updatedItem.product_name,
        quantity: updatedItem.quantity,
        unit_price: updatedItem.unit_price,
        line_subtotal: updatedItem.line_subtotal,
        line_discount: updatedItem.line_discount || 0,
        line_total: updatedItem.line_total
      },
      cart: cartSummary
    };
  }

  // setCartItemAutoRenewal(cartItemId, auto_renewal_enabled)
  setCartItemAutoRenewal(cartItemId, auto_renewal_enabled) {
    const allItems = this._getFromStorage('cart_items');
    const idx = allItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        updated_item: null,
        cart_id: null
      };
    }

    const item = allItems[idx];
    const pricingAll = this._getFromStorage('product_pricing_options');
    const pricing = pricingAll.find((po) => po.id === item.pricing_option_id) || null;

    if (!pricing || !pricing.supports_auto_renewal) {
      return {
        success: false,
        message: 'Auto-renewal not supported for this item',
        updated_item: {
          cart_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          auto_renewal_enabled: !!item.auto_renewal_enabled
        },
        cart_id: item.cart_id
      };
    }

    item.auto_renewal_enabled = !!auto_renewal_enabled;
    allItems[idx] = item;
    this._saveToStorage('cart_items', allItems);

    return {
      success: true,
      message: 'Auto-renewal updated',
      updated_item: {
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        auto_renewal_enabled: !!item.auto_renewal_enabled
      },
      cart_id: item.cart_id
    };
  }

  // startCheckout()
  startCheckout() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const order = this._getOrCreateOrder();
    order.total = cart.total;
    order.currency = cart.currency;
    order.updated_at = this._nowISO();
    this._saveOrder(order);

    localStorage.setItem('checkout_current_step', 'summary');

    const order_summary = this._buildOrderSummary(cart, order.promo_discount || 0);

    return {
      order_id: order.id,
      checkout_mode: order.checkout_mode,
      current_step: 'summary',
      order_summary: {
        cart_id: cart.id,
        items: order_summary.items,
        subtotal: order_summary.subtotal,
        discount_total: order_summary.discount_total,
        tax_total: order_summary.tax_total,
        total: order_summary.total,
        currency: order_summary.currency
      }
    };
  }

  // setCheckoutMode(checkout_mode)
  setCheckoutMode(checkout_mode) {
    const mode = checkout_mode === 'registered' ? 'registered' : 'guest';
    const order = this._getOrCreateOrder();
    order.checkout_mode = mode;
    order.updated_at = this._nowISO();
    this._saveOrder(order);

    const nextStep = mode === 'guest' ? 'contact' : 'summary';
    localStorage.setItem('checkout_current_step', nextStep);

    return {
      order_id: order.id,
      checkout_mode: mode,
      current_step: nextStep
    };
  }

  // getCheckoutState()
  getCheckoutState() {
    const order = this._getCurrentOrder();
    const carts = this._getFromStorage('cart');
    let cart = null;
    if (order) {
      cart = carts.find((c) => c.id === order.cart_id) || null;
    }
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    this._recalculateCartTotals(cart);

    const current_step = localStorage.getItem('checkout_current_step') || 'summary';

    const order_summary_raw = this._buildOrderSummary(cart, order ? order.promo_discount || 0 : 0);

    const order_summary = {
      items: order_summary_raw.items,
      subtotal: order_summary_raw.subtotal,
      discount_total: order_summary_raw.discount_total,
      tax_total: order_summary_raw.tax_total,
      total: order_summary_raw.total,
      currency: order_summary_raw.currency
    };

    const contact_info = {
      first_name: order ? order.contact_first_name || '' : '',
      last_name: order ? order.contact_last_name || '' : '',
      email: order ? order.contact_email || '' : ''
    };

    const orderOut = order
      ? {
          order_id: order.id,
          cart_id: order.cart_id,
          status: order.status,
          checkout_mode: order.checkout_mode,
          promo_code: order.promo_code || '',
          promo_discount: order.promo_discount || 0,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          currency: order.currency || cart.currency || 'USD',
          total: order_summary.total
        }
      : {
          order_id: null,
          cart_id: cart.id,
          status: 'draft',
          checkout_mode: 'guest',
          promo_code: '',
          promo_discount: 0,
          payment_method: 'none',
          payment_status: 'not_started',
          currency: cart.currency || 'USD',
          total: order_summary.total
        };

    const available_payment_methods = [
      { method_id: 'credit_card', label: 'Credit Card', is_default: true },
      { method_id: 'paypal', label: 'PayPal', is_default: false },
      { method_id: 'bank_transfer', label: 'Bank Transfer', is_default: false }
    ];

    return {
      order: orderOut,
      current_step: current_step,
      contact_info: contact_info,
      order_summary: order_summary,
      available_payment_methods: available_payment_methods
    };
  }

  // updateCheckoutContact(first_name, last_name, email)
  updateCheckoutContact(first_name, last_name, email) {
    const order = this._getOrCreateOrder();
    order.contact_first_name = first_name || '';
    order.contact_last_name = last_name || '';
    order.contact_email = email || '';
    order.updated_at = this._nowISO();
    this._saveOrder(order);

    localStorage.setItem('checkout_current_step', 'payment');

    return {
      order_id: order.id,
      contact_info: {
        first_name: order.contact_first_name,
        last_name: order.contact_last_name,
        email: order.contact_email
      },
      current_step: 'payment'
    };
  }

  // applyPromoCode(promo_code)
  applyPromoCode(promo_code) {
    const promoInput = (promo_code || '').toString().trim();
    if (!promoInput) {
      return {
        success: false,
        message: 'Promo code is required',
        order_id: null,
        promo_code: '',
        promo_discount: 0,
        order_summary: null
      };
    }

    const promos = this._getFromStorage('promo_codes');
    const now = new Date();
    const promo = promos.find((p) => {
      if (!p.is_active) return false;
      if (this._normalizeString(p.code) !== this._normalizeString(promoInput)) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    });

    if (!promo) {
      return {
        success: false,
        message: 'Invalid or expired promo code',
        order_id: null,
        promo_code: promoInput,
        promo_discount: 0,
        order_summary: null
      };
    }

    const order = this._getOrCreateOrder();
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === order.cart_id) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const cartItems = this._getCartItemsForCart(cart.id);

    let baseAmount = 0;
    if (promo.applies_to_scope === 'entire_cart') {
      baseAmount = cart.subtotal;
    } else if (promo.applies_to_scope === 'product') {
      const allowed = new Set(promo.applies_to_product_ids || []);
      cartItems.forEach((item) => {
        if (allowed.has(item.product_id)) baseAmount += item.line_subtotal;
      });
    } else if (promo.applies_to_scope === 'category') {
      const allowedCats = new Set(promo.applies_to_category_ids || []);
      cartItems.forEach((item) => {
        if (allowedCats.has(item.category_id)) baseAmount += item.line_subtotal;
      });
    }

    if (typeof promo.min_cart_total === 'number' && cart.subtotal < promo.min_cart_total) {
      return {
        success: false,
        message: 'Cart total does not meet the minimum required for this promo',
        order_id: order.id,
        promo_code: promo.code,
        promo_discount: 0,
        order_summary: this._buildOrderSummary(cart, 0)
      };
    }

    if (baseAmount <= 0) {
      return {
        success: false,
        message: 'Promo code does not apply to items in the cart',
        order_id: order.id,
        promo_code: promo.code,
        promo_discount: 0,
        order_summary: this._buildOrderSummary(cart, 0)
      };
    }

    let discountAmount = 0;
    if (promo.discount_type === 'percent') {
      discountAmount = (baseAmount * (promo.discount_value || 0)) / 100;
    } else if (promo.discount_type === 'amount') {
      discountAmount = promo.discount_value || 0;
    }

    if (discountAmount > baseAmount) discountAmount = baseAmount;

    order.promo_code = promo.code;
    order.promo_discount = discountAmount;
    order.updated_at = this._nowISO();
    this._saveOrder(order);

    const summary = this._buildOrderSummary(cart, discountAmount);

    return {
      success: true,
      message: 'Promo code applied',
      order_id: order.id,
      promo_code: promo.code,
      promo_discount: discountAmount,
      order_summary: {
        subtotal: summary.subtotal,
        discount_total: summary.discount_total,
        tax_total: summary.tax_total,
        total: summary.total,
        currency: summary.currency
      }
    };
  }

  // advanceCheckoutToPayment()
  advanceCheckoutToPayment() {
    const order = this._getOrCreateOrder();
    order.status = 'pending_payment';
    order.updated_at = this._nowISO();
    this._saveOrder(order);
    localStorage.setItem('checkout_current_step', 'payment');
    return {
      order_id: order.id,
      current_step: 'payment'
    };
  }

  // selectPaymentMethod(payment_method)
  selectPaymentMethod(payment_method) {
    const order = this._getOrCreateOrder();
    const pm = payment_method || 'credit_card';
    order.payment_method = pm;
    order.payment_status = 'in_progress';
    order.updated_at = this._nowISO();
    this._saveOrder(order);
    return {
      order_id: order.id,
      payment_method: pm,
      payment_status: order.payment_status
    };
  }

  // addProductToComparison(productId)
  addProductToComparison(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        comparison_session_id: null,
        product_ids: []
      };
    }

    const session = this._getOrCreateComparisonSession();
    const ids = session.product_ids.slice();

    if (ids.indexOf(productId) === -1) {
      if (ids.length >= 2) {
        ids.shift(); // keep at most 2 items, drop oldest
      }
      ids.push(productId);
    }

    session.product_ids = ids;
    this._saveComparisonSession(session);

    return {
      comparison_session_id: session.id,
      product_ids: session.product_ids
    };
  }

  // removeProductFromComparison(productId)
  removeProductFromComparison(productId) {
    const session = this._getOrCreateComparisonSession();
    session.product_ids = session.product_ids.filter((id) => id !== productId);
    this._saveComparisonSession(session);
    return {
      comparison_session_id: session.id,
      product_ids: session.product_ids
    };
  }

  // getCurrentComparison()
  getCurrentComparison() {
    const session = this._getOrCreateComparisonSession();
    const productsAll = this._getFromStorage('products');
    const pricingAll = this._getFromStorage('product_pricing_options');

    const products = session.product_ids
      .map((id) => productsAll.find((p) => p.id === id) || null)
      .filter((p) => !!p);

    const resultProducts = products.map((p) => {
      const options = pricingAll.filter((po) => po.product_id === p.id);
      let best = options.find((o) => o.is_default) || null;
      if (!best && options.length) {
        best = options[0];
        options.forEach((o) => {
          if (typeof o.current_price === 'number' && typeof best.current_price === 'number') {
            if (o.current_price < best.current_price) best = o;
          }
        });
      }

      const bestPricing = best
        ? {
            pricing_option_id: best.id,
            license_duration: best.license_duration,
            device_count: best.device_count,
            billing_term: best.billing_term,
            current_price: best.current_price,
            base_price: best.base_price,
            currency: best.currency || 'USD',
            discount_type: best.discount_type,
            discount_value: best.discount_value || 0,
            discount_label: best.discount_label || ''
          }
        : null;

      return {
        product_id: p.id,
        name: p.name,
        image_url: p.image_url || null,
        segment: p.segment,
        product_type: p.product_type,
        supported_operating_systems: p.supported_operating_systems || [],
        rating: p.rating || 0,
        rating_count: p.rating_count || 0,
        features: p.features || [],
        support_summary: p.support_summary || '',
        best_matching_pricing: bestPricing
      };
    });

    return {
      comparison_session_id: session.id,
      products: resultProducts
    };
  }

  // submitTrialSignup(productId, first_name, last_name, email, marketing_opt_in)
  submitTrialSignup(productId, first_name, last_name, email, marketing_opt_in) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        trial_signup_id: null,
        product_id: productId,
        product_name: '',
        trial_duration: null,
        success: false,
        message: 'Product not found'
      };
    }

    const trial_duration = product.trial_duration || '30_day';

    const trialSignup = {
      id: this._generateId('trial_signup'),
      product_id: productId,
      first_name: first_name || '',
      last_name: last_name || '',
      email: email || '',
      marketing_opt_in: !!marketing_opt_in,
      created_at: this._nowISO(),
      trial_duration: trial_duration
    };

    const signups = this._getFromStorage('trial_signups');
    signups.push(trialSignup);
    this._saveToStorage('trial_signups', signups);

    return {
      trial_signup_id: trialSignup.id,
      product_id: productId,
      product_name: product.name,
      trial_duration: trialSignup.trial_duration,
      success: true,
      message: 'Trial signup completed'
    };
  }

  // getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (!raw) {
      return {
        support_email: '',
        sales_email: '',
        support_phone: '',
        business_hours: '',
        additional_notes: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        support_email: obj.support_email || '',
        sales_email: obj.sales_email || '',
        support_phone: obj.support_phone || '',
        business_hours: obj.business_hours || '',
        additional_notes: obj.additional_notes || ''
      };
    } catch (e) {
      return {
        support_email: '',
        sales_email: '',
        support_phone: '',
        business_hours: '',
        additional_notes: ''
      };
    }
  }

  // submitContactRequest(subject, message, email)
  submitContactRequest(subject, message, email) {
    const req = {
      id: this._generateId('contact_request'),
      subject: subject || '',
      message: message || '',
      email: email || '',
      created_at: this._nowISO()
    };
    const requests = this._getFromStorage('contact_requests');
    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted',
      ticket_id: req.id
    };
  }

  // getHelpTopics()
  getHelpTopics() {
    const topics = this._getFromStorage('help_topics');
    return {
      topics: topics.map((t) => ({
        topic_id: t.topic_id || t.id || this._generateId('topic'),
        title: t.title || '',
        category: t.category || '',
        summary: t.summary || '',
        content_html: t.content_html || ''
      }))
    };
  }

  // getPageContent(pageId)
  getPageContent(pageId) {
    const pages = this._getFromStorage('pages');
    const page = pages.find((p) => p.id === pageId) || null;
    if (!page) {
      return {
        page_id: pageId,
        title: '',
        body_html: '',
        last_updated: ''
      };
    }

    return {
      page_id: page.id,
      title: page.name || '',
      body_html: page.body_html || '',
      last_updated: page.last_updated || ''
    };
  }

  // ----- END of BusinessLogic class -----
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}