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
  }

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    // Core entity tables as arrays
    const arrayKeys = [
      'products',
      'carts',
      'cart_items',
      'analytics_plans',
      'analytics_features',
      'roi_scenarios',
      'case_studies',
      'case_study_product_links',
      'quote_requests',
      'custom_system_configurations',
      'analytics_trial_accounts',
      'faqs'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Optional legacy / unused keys from scaffold
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      // legacy key, keep empty
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = null) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(raw);
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

  _snakeToTitle(str) {
    if (!str) return '';
    return str
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        currency: 'usd',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems.filter((item) => item.cartId === cartId);
    const total_items = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const subtotal = items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
    const estimated_tax = +(subtotal * 0.07).toFixed(2); // simple 7% estimate
    const shipping_fee = subtotal > 0 ? 0 : 0; // free shipping placeholder
    const total = +(subtotal + estimated_tax + shipping_fee).toFixed(2);
    return { total_items, subtotal, estimated_tax, shipping_fee, total };
  }

  // -------------------- Analytics Helpers --------------------

  _computeAnalyticsPlanPrice(plan, farm_size_acres) {
    if (!plan) return 0;
    const base = Number(plan.base_monthly_price) || 0;
    const perAcre = Number(plan.price_per_acre_monthly) || 0;
    const acres = Number(farm_size_acres) || 0;
    const price = base + perAcre * acres;
    return +price.toFixed(2);
  }

  // -------------------- ROI Helpers --------------------

  _computeRoiMetrics(current_annual_crop_revenue, expected_yield_improvement_pct, initial_investment) {
    const revenue = Number(current_annual_crop_revenue) || 0;
    const pct = Number(expected_yield_improvement_pct) || 0;
    const investment = Number(initial_investment) || 0;
    const incremental_revenue = +(revenue * (pct / 100)).toFixed(2);

    let roi_percentage = null;
    if (investment > 0) {
      roi_percentage = +(((incremental_revenue - investment) / investment) * 100).toFixed(2);
    }

    let payback_period_months = null;
    if (incremental_revenue > 0) {
      const years = investment / incremental_revenue;
      payback_period_months = +(years * 12).toFixed(1);
    }

    return {
      incremental_revenue,
      roi_percentage,
      payback_period_months
    };
  }

  // -------------------- Custom System Helpers --------------------

  _estimateHardwarePricing(quantity_soil_moisture_probes, quantity_weather_stations, connectivity_type) {
    const products = this._getFromStorage('products', []);

    const soilSensors = products.filter(
      (p) =>
        p.category === 'soil_moisture_sensors' &&
        p.type === 'sensor' &&
        (!connectivity_type || !p.connectivity_type || p.connectivity_type === connectivity_type)
    );
    const weatherStations = products.filter(
      (p) => p.category === 'weather_stations' && p.type === 'weather_station'
    );

    const minSoilPrice = soilSensors.length
      ? Math.min(...soilSensors.map((p) => Number(p.price) || 0))
      : 0;
    const minWeatherPrice = weatherStations.length
      ? Math.min(...weatherStations.map((p) => Number(p.price) || 0))
      : 0;

    const soilSubtotal = (Number(quantity_soil_moisture_probes) || 0) * minSoilPrice;
    const weatherSubtotal = (Number(quantity_weather_stations) || 0) * minWeatherPrice;

    const hardware_subtotal = +(soilSubtotal + weatherSubtotal).toFixed(2);
    return hardware_subtotal;
  }

  _createCustomSystemConfigurationRecord({
    name,
    quantity_soil_moisture_probes,
    quantity_weather_stations,
    connectivity_type,
    analytics_included,
    analytics_billing_duration
  }) {
    const configs = this._getFromStorage('custom_system_configurations', []);

    const hardware_subtotal = this._estimateHardwarePricing(
      quantity_soil_moisture_probes,
      quantity_weather_stations,
      connectivity_type
    );

    // Estimate analytics recurring pricing using cheapest active analytics plan if available
    const analyticsPlans = this._getFromStorage('analytics_plans', []);
    const activePlans = analyticsPlans.filter((p) => p.status === 'active');
    let analytics_recurring_price_annual = 0;

    if (analytics_included && activePlans.length) {
      const cheapest = activePlans.reduce((min, p) => {
        const price = Number(p.base_monthly_price) || 0;
        return !min || price < (Number(min.base_monthly_price) || 0) ? p : min;
      }, null);

      const monthly = Number(cheapest.base_monthly_price) || 0;
      analytics_recurring_price_annual = +(monthly * 12).toFixed(2);
    }

    const total_upfront_cost = +hardware_subtotal.toFixed(2);
    const total_recurring_cost_monthly = analytics_included
      ? +(analytics_recurring_price_annual / 12).toFixed(2)
      : 0;

    const configuration = {
      id: this._generateId('config'),
      name: name || 'Custom sensor network configuration',
      quantity_soil_moisture_probes: Number(quantity_soil_moisture_probes) || 0,
      quantity_weather_stations: Number(quantity_weather_stations) || 0,
      connectivity_type,
      analytics_included: !!analytics_included,
      analytics_billing_duration: analytics_included ? analytics_billing_duration : null,
      hardware_subtotal,
      analytics_recurring_price_annual,
      total_upfront_cost,
      total_recurring_cost_monthly,
      created_at: this._now(),
      updated_at: this._now()
    };

    configs.push(configuration);
    this._saveToStorage('custom_system_configurations', configs);

    return configuration;
  }

  // -------------------- Trial Helpers --------------------

  _calculateTrialEndDate(startIso) {
    const start = new Date(startIso);
    const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    return end.toISOString();
  }

  // -------------------- Interface Implementations --------------------

  // getHomepageContent
  getHomepageContent() {
    const categoriesData = this.getProductCategories();
    const product_category_highlights = (categoriesData && categoriesData.categories) || [];

    const products = this._getFromStorage('products', []);
    const featured_products = products
      .slice()
      .sort((a, b) => {
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        if (rb !== ra) return rb - ra;
        const rc = (b.rating_count || 0) - (a.rating_count || 0);
        if (rc !== 0) return rc;
        return (a.price || 0) - (b.price || 0);
      })
      .slice(0, 8)
      .map((p) => ({
        product_id: p.id,
        name: p.name,
        category_code: p.category,
        category_name: this._snakeToTitle(p.category),
        type_label: this._snakeToTitle(p.type),
        price: p.price,
        currency: p.currency || 'usd',
        rating_average: p.rating_average || 0,
        rating_count: p.rating_count || 0,
        is_starter_kit: !!p.is_starter_kit
      }));

    const caseStudies = this._getFromStorage('case_studies', []);
    const featured_case_studies = caseStudies
      .filter((cs) => !!cs.featured)
      .sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0))
      .slice(0, 6)
      .map((cs) => ({
        case_study_id: cs.id,
        title: cs.title,
        crop_type: cs.crop_type,
        publication_year: cs.publication_year,
        yield_improvement_pct: cs.yield_improvement_pct || null,
        summary: cs.summary
      }));

    const key_calls_to_action = [
      {
        cta_id: 'cta_shop_soil_sensors',
        label: 'Shop Soil Moisture Sensors',
        target_section_code: 'products_soil_moisture_sensors',
        description: 'Browse soil moisture probes and starter kits.'
      },
      {
        cta_id: 'cta_view_weather_stations',
        label: 'View Weather Stations',
        target_section_code: 'products_weather_stations',
        description: 'Compare on-farm weather station kits.'
      },
      {
        cta_id: 'cta_pricing_analytics',
        label: 'Explore Analytics Pricing',
        target_section_code: 'pricing_analytics_for_farms',
        description: 'Configure analytics plans by acres and crop.'
      },
      {
        cta_id: 'cta_analytics_trial',
        label: 'Start Analytics Trial',
        target_section_code: 'analytics_trial',
        description: 'Try the analytics dashboard free for 14 days.'
      }
    ];

    const trust_signals = [];

    return {
      product_category_highlights,
      featured_products,
      featured_case_studies,
      key_calls_to_action,
      trust_signals
    };
  }

  // getProductCategories
  getProductCategories() {
    const products = this._getFromStorage('products', []);
    const categorySet = new Set(products.map((p) => p.category).filter(Boolean));

    const categories = Array.from(categorySet).map((code) => ({
      category_code: code,
      display_name: this._snakeToTitle(code),
      description: '',
      default_sort_option: 'price_asc'
    }));

    return { categories };
  }

  // getProductFilterOptions
  getProductFilterOptions(category_code) {
    const products = this._getFromStorage('products', []).filter(
      (p) => p.category === category_code
    );

    let min_price = null;
    let max_price = null;
    let currency = 'usd';

    products.forEach((p) => {
      const price = Number(p.price) || 0;
      if (min_price === null || price < min_price) min_price = price;
      if (max_price === null || price > max_price) max_price = price;
      if (p.currency) currency = p.currency;
    });

    const connectivitySet = new Set(
      products.map((p) => p.connectivity_type).filter((v) => v && v !== 'none')
    );
    const connectivity_types = Array.from(connectivitySet).map((value) => ({
      value,
      label: this._snakeToTitle(value)
    }));

    const rating_options = [
      { min_rating: 4, label: '4.0 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    let supports_coverage = false;
    let min_coverage = null;
    let max_coverage = null;
    products.forEach((p) => {
      if (p.coverage_acres != null) {
        supports_coverage = true;
        const cov = Number(p.coverage_acres) || 0;
        if (min_coverage === null || cov < min_coverage) min_coverage = cov;
        if (max_coverage === null || cov > max_coverage) max_coverage = cov;
      }
    });

    let supports_update_interval = false;
    const intervalSet = new Set();
    products.forEach((p) => {
      if (p.update_interval_minutes != null) {
        supports_update_interval = true;
        intervalSet.add(Number(p.update_interval_minutes));
      }
    });
    const intervalOptions = Array.from(intervalSet)
      .sort((a, b) => a - b)
      .map((max_minutes) => ({
        max_minutes,
        label: `${max_minutes} minutes or less`
      }));

    const sort_options = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Customer Rating' },
      { code: 'update_interval_asc', label: 'Fastest Update Interval' }
    ];

    return {
      price: {
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price,
        currency
      },
      connectivity_types,
      rating_options,
      coverage_filter: {
        supports_coverage,
        min_coverage: min_coverage === null ? 0 : min_coverage,
        max_coverage: max_coverage === null ? 0 : max_coverage
      },
      update_interval_filter: {
        supports_update_interval,
        options: intervalOptions
      },
      sort_options
    };
  }

  // getProducts
  getProducts(category_code, filters = {}, sort_by = 'price_asc', page = 1, page_size = 20) {
    const allProducts = this._getFromStorage('products', []);
    let products = allProducts.filter((p) => p.category === category_code);

    if (filters) {
      if (filters.min_price != null) {
        products = products.filter((p) => Number(p.price) >= Number(filters.min_price));
      }
      if (filters.max_price != null) {
        products = products.filter((p) => Number(p.price) <= Number(filters.max_price));
      }
      if (filters.currency) {
        products = products.filter((p) => (p.currency || 'usd') === filters.currency);
      }
      if (filters.connectivity_types && filters.connectivity_types.length) {
        const set = new Set(filters.connectivity_types);
        products = products.filter((p) => p.connectivity_type && set.has(p.connectivity_type));
      }
      if (filters.min_rating != null) {
        products = products.filter(
          (p) => (Number(p.rating_average) || 0) >= Number(filters.min_rating)
        );
      }
      if (filters.min_coverage_acres != null) {
        products = products.filter(
          (p) => (Number(p.coverage_acres) || 0) >= Number(filters.min_coverage_acres)
        );
      }
      if (filters.max_update_interval_minutes != null) {
        products = products.filter(
          (p) =>
            p.update_interval_minutes != null &&
            Number(p.update_interval_minutes) <= Number(filters.max_update_interval_minutes)
        );
      }
      if (filters.is_starter_kit_only) {
        products = products.filter((p) => !!p.is_starter_kit);
      }
    }

    switch (sort_by) {
      case 'price_desc':
        products.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'rating_desc':
        products.sort((a, b) => {
          const ra = Number(a.rating_average) || 0;
          const rb = Number(b.rating_average) || 0;
          if (rb !== ra) return rb - ra;
          return (Number(b.rating_count) || 0) - (Number(a.rating_count) || 0);
        });
        break;
      case 'update_interval_asc':
        products.sort((a, b) => {
          const ua = a.update_interval_minutes != null ? Number(a.update_interval_minutes) : Infinity;
          const ub = b.update_interval_minutes != null ? Number(b.update_interval_minutes) : Infinity;
          return ua - ub;
        });
        break;
      case 'price_asc':
      default:
        products.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
    }

    const total_count = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageProducts = products.slice(start, end).map((p) => ({
      product_id: p.id,
      name: p.name,
      sku: p.sku || null,
      category_code: p.category,
      category_name: this._snakeToTitle(p.category),
      type_label: this._snakeToTitle(p.type),
      price: p.price,
      currency: p.currency || 'usd',
      connectivity_type: p.connectivity_type || null,
      is_starter_kit: !!p.is_starter_kit,
      coverage_acres: p.coverage_acres != null ? p.coverage_acres : null,
      update_interval_minutes: p.update_interval_minutes != null ? p.update_interval_minutes : null,
      rating_average: p.rating_average || 0,
      rating_count: p.rating_count || 0,
      available: p.available,
      short_description: p.description || ''
    }));

    return {
      total_count,
      page,
      page_size,
      products: pageProducts
    };
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const p = products.find((prod) => prod.id === productId);
    if (!p) {
      return null;
    }

    const configurationCodes = Array.isArray(p.configuration_options)
      ? p.configuration_options
      : [];
    const configuration_options = configurationCodes.map((code) => ({
      code,
      label: this._snakeToTitle(code),
      is_default: p.default_configuration_option === code
    }));

    const technical_specifications = [];

    return {
      product_id: p.id,
      name: p.name,
      sku: p.sku || null,
      category_code: p.category,
      category_name: this._snakeToTitle(p.category),
      type_label: this._snakeToTitle(p.type),
      description: p.description || '',
      price: p.price,
      currency: p.currency || 'usd',
      connectivity_type: p.connectivity_type || null,
      is_starter_kit: !!p.is_starter_kit,
      coverage_acres: p.coverage_acres != null ? p.coverage_acres : null,
      update_interval_minutes: p.update_interval_minutes != null ? p.update_interval_minutes : null,
      rating_average: p.rating_average || 0,
      rating_count: p.rating_count || 0,
      available: p.available,
      technical_specifications,
      configuration_options,
      default_configuration_option: p.default_configuration_option || null,
      compatibility_notes: ''
    };
  }

  // getRelatedProducts
  getRelatedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const base = products.find((p) => p.id === productId);
    if (!base) return [];

    const related = products
      .filter((p) => p.id !== productId && p.category === base.category)
      .slice(0, 8)
      .map((p) => ({
        product_id: p.id,
        name: p.name,
        category_name: this._snakeToTitle(p.category),
        type_label: this._snakeToTitle(p.type),
        price: p.price,
        currency: p.currency || 'usd',
        connectivity_type: p.connectivity_type || null,
        is_starter_kit: !!p.is_starter_kit,
        short_description: p.description || ''
      }));

    return related;
  }

  // addProductToCart
  addProductToCart(productId, quantity = 1, configuration_option_code = null) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product || product.available === false) {
      return {
        success: false,
        cart_item_id: null,
        cart_id: null,
        message: 'Product not available',
        cart_summary: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const qty = Number(quantity) || 1;
    let existing = cartItems.find(
      (ci) =>
        ci.cartId === cart.id &&
        ci.item_type === 'product' &&
        ci.productId === productId &&
        (ci.configuration_option_code || null) === (configuration_option_code || null)
    );

    const unit_price = Number(product.price) || 0;
    let cart_item_id;

    if (existing) {
      existing.quantity = Number(existing.quantity) + qty;
      existing.subtotal = +(existing.quantity * unit_price).toFixed(2);
      existing.added_at = existing.added_at || this._now();
      cart_item_id = existing.id;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        item_type: 'product',
        productId: productId,
        configurationId: null,
        subscriptionPlanId: null,
        name: product.name,
        unit_price,
        quantity: qty,
        subtotal: +(unit_price * qty).toFixed(2),
        added_at: this._now(),
        configuration_option_code: configuration_option_code || null
      };
      cartItems.push(newItem);
      cart_item_id = newItem.id;
    }

    this._saveToStorage('cart_items', cartItems);

    // update cart updated_at
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx].updated_at = this._now();
      this._saveToStorage('carts', carts);
    }

    const cart_summary = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      cart_item_id,
      cart_id: cart.id,
      message: 'Product added to cart',
      cart_summary: {
        total_items: cart_summary.total_items,
        subtotal: cart_summary.subtotal,
        currency: cart.currency
      }
    };
  }

  // getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const configs = this._getFromStorage('custom_system_configurations', []);
    const plans = this._getFromStorage('analytics_plans', []);

    const items = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => {
        let reference_id = null;
        let product = null;
        let configuration = null;
        let subscriptionPlan = null;

        if (ci.item_type === 'product') {
          reference_id = ci.productId;
          product = products.find((p) => p.id === ci.productId) || null;
        } else if (ci.item_type === 'custom_configuration') {
          reference_id = ci.configurationId;
          configuration = configs.find((c) => c.id === ci.configurationId) || null;
        } else if (ci.item_type === 'subscription_plan') {
          reference_id = ci.subscriptionPlanId;
          subscriptionPlan = plans.find((p) => p.id === ci.subscriptionPlanId) || null;
        }

        return {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          reference_id,
          name: ci.name,
          unit_price: ci.unit_price,
          quantity: ci.quantity,
          subtotal: ci.subtotal,
          added_at: ci.added_at,
          product,
          configuration,
          subscriptionPlan
        };
      });

    const totals = this._recalculateCartTotals(cart.id);

    return {
      cart_id: cart.id,
      status: cart.status,
      currency: cart.currency,
      items,
      subtotal: totals.subtotal,
      estimated_tax: totals.estimated_tax,
      shipping_fee: totals.shipping_fee,
      total: totals.total,
      updated_at: this._now()
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        updated_item: null,
        cart_summary: null
      };
    }

    const item = cartItems[itemIndex];
    const cartId = item.cartId;

    if (Number(quantity) <= 0) {
      cartItems.splice(itemIndex, 1);
      this._saveToStorage('cart_items', cartItems);
      const summary = this._recalculateCartTotals(cartId);
      return {
        success: true,
        updated_item: null,
        cart_summary: summary
      };
    }

    item.quantity = Number(quantity);
    item.subtotal = +(item.unit_price * item.quantity).toFixed(2);
    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const summary = this._recalculateCartTotals(cartId);

    return {
      success: true,
      updated_item: {
        cart_item_id: item.id,
        quantity: item.quantity,
        subtotal: item.subtotal
      },
      cart_summary: summary
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        cart_summary: null,
        message: 'Item not found'
      };
    }

    const cartId = cartItems[itemIndex].cartId;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const summary = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart_summary: summary,
      message: 'Item removed'
    };
  }

  // getPricingConfigurationOptions
  getPricingConfigurationOptions() {
    const plans = this._getFromStorage('analytics_plans', []);

    let min_acres = null;
    let max_acres = null;
    const cropSet = new Set();
    const billingSet = new Set();

    plans.forEach((p) => {
      if (p.min_supported_acres != null) {
        const v = Number(p.min_supported_acres) || 0;
        if (min_acres === null || v < min_acres) min_acres = v;
      }
      if (p.max_supported_acres != null) {
        const v = Number(p.max_supported_acres) || 0;
        if (max_acres === null || v > max_acres) max_acres = v;
      }
      if (Array.isArray(p.supported_crops)) {
        p.supported_crops.forEach((c) => cropSet.add(c));
      }
      if (p.billing_frequency) billingSet.add(p.billing_frequency);
    });

    if (min_acres === null) min_acres = 1;
    if (max_acres === null) max_acres = 10000;

    const supported_crops = Array.from(cropSet).map((code) => ({
      code,
      label: this._snakeToTitle(code)
    }));

    const billing_frequencies = Array.from(billingSet).map((code) => ({
      code,
      label: this._snakeToTitle(code)
    }));

    // Price slider range based on example monthly prices for 200 acres corn or base price
    let min_monthly_price = null;
    let max_monthly_price = null;
    plans.forEach((p) => {
      let price = null;
      if (p.example_monthly_price_200_acres_corn != null) {
        price = Number(p.example_monthly_price_200_acres_corn) || 0;
      } else {
        price = this._computeAnalyticsPlanPrice(p, 200);
      }
      if (min_monthly_price === null || price < min_monthly_price) min_monthly_price = price;
      if (max_monthly_price === null || price > max_monthly_price) max_monthly_price = price;
    });

    if (min_monthly_price === null) min_monthly_price = 0;
    if (max_monthly_price === null) max_monthly_price = 0;

    const featuresEntities = this._getFromStorage('analytics_features', []);
    const features = featuresEntities.map((f) => ({
      code: f.code,
      name: f.name,
      description: f.description || ''
    }));

    return {
      farm_size_range: {
        min_acres,
        max_acres
      },
      supported_crops,
      billing_frequencies,
      price_slider: {
        min_monthly_price,
        max_monthly_price,
        currency: 'usd'
      },
      features
    };
  }

  // getAnalyticsPlansForFarm
  getAnalyticsPlansForFarm(
    plan_type,
    farm_size_acres,
    crop_type,
    billing_frequency,
    max_monthly_price = null
  ) {
    const plans = this._getFromStorage('analytics_plans', []);
    const features = this._getFromStorage('analytics_features', []);

    const filtered = plans.filter((p) => {
      if (p.plan_type !== plan_type) return false;
      if (p.status !== 'active') return false;
      if (p.billing_frequency !== billing_frequency) return false;
      const acres = Number(farm_size_acres) || 0;
      if (p.min_supported_acres != null && acres < Number(p.min_supported_acres)) return false;
      if (p.max_supported_acres != null && acres > Number(p.max_supported_acres)) return false;
      if (Array.isArray(p.supported_crops) && p.supported_crops.length) {
        if (!p.supported_crops.includes(crop_type)) return false;
      }
      return true;
    });

    const plansOut = filtered.map((p) => {
      const computed = this._computeAnalyticsPlanPrice(p, farm_size_acres);
      const meets_budget = max_monthly_price != null
        ? computed <= Number(max_monthly_price)
        : true;
      const feature_codes = Array.isArray(p.featureCodes) ? p.featureCodes : [];
      const feature_names = feature_codes
        .map((code) => features.find((f) => f.code === code))
        .filter(Boolean)
        .map((f) => f.name);

      return {
        plan_id: p.id,
        name: p.name,
        plan_code: p.plan_code,
        description: p.description || '',
        billing_frequency: p.billing_frequency,
        base_monthly_price: p.base_monthly_price,
        price_per_acre_monthly: p.price_per_acre_monthly || 0,
        computed_monthly_price_for_farm: computed,
        currency: 'usd',
        supported_crops: p.supported_crops || [],
        feature_codes,
        feature_names,
        meets_budget
      };
    });

    return { plans: plansOut };
  }

  // selectAnalyticsPlan
  selectAnalyticsPlan(subscriptionPlanId, farm_size_acres, crop_type, billing_frequency) {
    const plans = this._getFromStorage('analytics_plans', []);
    const plan = plans.find((p) => p.id === subscriptionPlanId);

    if (!plan || plan.plan_type !== 'analytics_for_farms' || plan.status !== 'active') {
      return {
        success: false,
        cart_item_id: null,
        cart_id: null,
        computed_monthly_price_for_farm: null,
        currency: 'usd',
        message: 'Plan not available'
      };
    }

    if (plan.billing_frequency !== billing_frequency) {
      return {
        success: false,
        cart_item_id: null,
        cart_id: null,
        computed_monthly_price_for_farm: null,
        currency: 'usd',
        message: 'Billing frequency not supported for this plan'
      };
    }

    const price = this._computeAnalyticsPlanPrice(plan, farm_size_acres);
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'subscription_plan',
      productId: null,
      configurationId: null,
      subscriptionPlanId: plan.id,
      name: `${plan.name} - ${farm_size_acres} acres ${this._snakeToTitle(crop_type)}`,
      unit_price: price,
      quantity: 1,
      subtotal: price,
      added_at: this._now()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      cart_item_id: item.id,
      cart_id: cart.id,
      computed_monthly_price_for_farm: price,
      currency: 'usd',
      message: 'Analytics plan selected and added to cart'
    };
  }

  // getResourceHubContent
  getResourceHubContent() {
    const caseStudies = this._getFromStorage('case_studies', []);

    const tools = [
      {
        tool_code: 'roi_calculator',
        name: 'ROI Calculator',
        description: 'Estimate the payback period and ROI for your sensor network investment.'
      }
    ];

    const sortedCaseStudies = caseStudies
      .slice()
      .sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));

    const featured_items = sortedCaseStudies.slice(0, 6).map((cs) => ({
      id: cs.id,
      title: cs.title,
      summary: cs.summary
    }));

    const content_collections = [
      {
        collection_code: 'case_studies',
        name: 'Case Studies',
        description: 'Real-world results from farms using our sensing and analytics systems.',
        featured_items
      }
    ];

    return { tools, content_collections };
  }

  // getRoiCalculatorDefaults
  getRoiCalculatorDefaults() {
    const scenarios = this._getFromStorage('roi_scenarios', []);
    const last = scenarios.length ? scenarios[scenarios.length - 1] : null;

    const defaults = {
      acres_monitored: last ? last.acres_monitored : 100,
      current_annual_crop_revenue: last ? last.current_annual_crop_revenue : 100000,
      expected_yield_improvement_pct: last ? last.expected_yield_improvement_pct : 10,
      initial_investment: last ? last.initial_investment : 20000
    };

    const ranges = {
      acres_monitored: { min: 1, max: 50000 },
      expected_yield_improvement_pct: { min: 1, max: 50 }
    };

    const guidance_messages = [
      'Use conservative yield improvement assumptions (5–15%) for most farms.',
      'Initial investment should include hardware, installation, and setup costs.'
    ];

    return { defaults, ranges, guidance_messages };
  }

  // calculateRoiScenario
  calculateRoiScenario(
    acres_monitored,
    current_annual_crop_revenue,
    expected_yield_improvement_pct,
    initial_investment
  ) {
    const metrics = this._computeRoiMetrics(
      current_annual_crop_revenue,
      expected_yield_improvement_pct,
      initial_investment
    );

    const scenarios = this._getFromStorage('roi_scenarios', []);

    const scenario = {
      id: this._generateId('roi'),
      acres_monitored: Number(acres_monitored) || 0,
      current_annual_crop_revenue: Number(current_annual_crop_revenue) || 0,
      expected_yield_improvement_pct: Number(expected_yield_improvement_pct) || 0,
      initial_investment: Number(initial_investment) || 0,
      incremental_revenue: metrics.incremental_revenue,
      roi_percentage: metrics.roi_percentage,
      payback_period_months: metrics.payback_period_months,
      created_at: this._now()
    };

    scenarios.push(scenario);
    this._saveToStorage('roi_scenarios', scenarios);

    return {
      scenario_id: scenario.id,
      acres_monitored: scenario.acres_monitored,
      current_annual_crop_revenue: scenario.current_annual_crop_revenue,
      expected_yield_improvement_pct: scenario.expected_yield_improvement_pct,
      initial_investment: scenario.initial_investment,
      incremental_revenue: scenario.incremental_revenue,
      roi_percentage: scenario.roi_percentage,
      payback_period_months: scenario.payback_period_months,
      created_at: scenario.created_at
    };
  }

  // getCaseStudyFilterOptions
  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies', []);

    const cropSet = new Set();
    const regionSet = new Set();
    let min_year = null;
    let max_year = null;

    caseStudies.forEach((cs) => {
      if (cs.crop_type) cropSet.add(cs.crop_type);
      if (cs.region) regionSet.add(cs.region);
      if (cs.publication_year != null) {
        const y = Number(cs.publication_year) || 0;
        if (min_year === null || y < min_year) min_year = y;
        if (max_year === null || y > max_year) max_year = y;
      }
    });

    const crop_types = Array.from(cropSet).map((code) => ({
      code,
      label: this._snakeToTitle(code)
    }));

    const regions = Array.from(regionSet).map((code) => ({
      code,
      label: this._snakeToTitle(code)
    }));

    if (min_year === null) min_year = new Date().getFullYear() - 5;
    if (max_year === null) max_year = new Date().getFullYear();

    const performance_metrics = [
      { metric_code: 'yield_improvement', label: 'Yield improvement' },
      { metric_code: 'cost_savings', label: 'Cost savings' },
      { metric_code: 'water_savings', label: 'Water savings' },
      { metric_code: 'other', label: 'Other' }
    ];

    const sort_options = [
      { code: 'year_desc', label: 'Newest first' },
      { code: 'yield_improvement_desc', label: 'Highest yield improvement' }
    ];

    return {
      crop_types,
      regions,
      publication_years: { min_year, max_year },
      performance_metrics,
      sort_options
    };
  }

  // getCaseStudies
  getCaseStudies(filters = {}, sort_by = 'year_desc', page = 1, page_size = 20) {
    let caseStudies = this._getFromStorage('case_studies', []);

    if (filters.crop_type) {
      caseStudies = caseStudies.filter((cs) => cs.crop_type === filters.crop_type);
    }
    if (filters.region) {
      caseStudies = caseStudies.filter((cs) => cs.region === filters.region);
    }
    if (filters.min_publication_year != null) {
      caseStudies = caseStudies.filter(
        (cs) => (cs.publication_year || 0) >= Number(filters.min_publication_year)
      );
    }
    if (filters.max_publication_year != null) {
      caseStudies = caseStudies.filter(
        (cs) => (cs.publication_year || 0) <= Number(filters.max_publication_year)
      );
    }
    if (filters.primary_outcome_metric) {
      caseStudies = caseStudies.filter(
        (cs) => cs.primary_outcome_metric === filters.primary_outcome_metric
      );
    }
    if (filters.min_yield_improvement_pct != null) {
      caseStudies = caseStudies.filter(
        (cs) => (Number(cs.yield_improvement_pct) || 0) >= Number(filters.min_yield_improvement_pct)
      );
    }
    if (filters.search_query) {
      const q = String(filters.search_query).toLowerCase();
      caseStudies = caseStudies.filter((cs) => {
        return (
          (cs.title && cs.title.toLowerCase().includes(q)) ||
          (cs.summary && cs.summary.toLowerCase().includes(q))
        );
      });
    }

    if (sort_by === 'yield_improvement_desc') {
      caseStudies.sort(
        (a, b) => (Number(b.yield_improvement_pct) || 0) - (Number(a.yield_improvement_pct) || 0)
      );
    } else {
      // year_desc default
      caseStudies.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
    }

    const total_count = caseStudies.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = caseStudies.slice(start, end).map((cs) => ({
      case_study_id: cs.id,
      title: cs.title,
      crop_type: cs.crop_type,
      region: cs.region || null,
      country: cs.country || null,
      publication_year: cs.publication_year,
      yield_improvement_pct: cs.yield_improvement_pct || null,
      primary_outcome_metric: cs.primary_outcome_metric || null,
      summary: cs.summary
    }));

    return {
      total_count,
      page,
      page_size,
      case_studies: pageItems
    };
  }

  // getCaseStudyDetails
  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const links = this._getFromStorage('case_study_product_links', []);
    const products = this._getFromStorage('products', []);

    const cs = caseStudies.find((c) => c.id === caseStudyId);
    if (!cs) return null;

    const relatedLinks = links.filter((l) => l.caseStudyId === caseStudyId);
    const related_products = relatedLinks
      .map((l) => products.find((p) => p.id === l.productId))
      .filter(Boolean)
      .map((p) => ({
        product_id: p.id,
        name: p.name,
        category_name: this._snakeToTitle(p.category),
        type_label: this._snakeToTitle(p.type),
        short_description: p.description || ''
      }));

    const results_section = {
      headline: 'Results',
      key_points: cs.other_metrics || []
    };

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task6_openedCaseStudyId', caseStudyId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      case_study_id: cs.id,
      title: cs.title,
      crop_type: cs.crop_type,
      region: cs.region || null,
      country: cs.country || null,
      publication_date: cs.publication_date || null,
      publication_year: cs.publication_year,
      yield_improvement_pct: cs.yield_improvement_pct || null,
      other_metrics: cs.other_metrics || [],
      primary_outcome_metric: cs.primary_outcome_metric || null,
      summary: cs.summary,
      content: cs.content || '',
      results_section,
      related_products
    };
  }

  // getContactFormOptions
  getContactFormOptions() {
    const inquiry_types = [
      { code: 'sales_inquiry', label: 'Sales Inquiry' },
      { code: 'request_pricing', label: 'Request Pricing' },
      { code: 'support', label: 'Support' },
      { code: 'general', label: 'General Question' }
    ];

    const countries = [
      {
        code: 'united_states',
        label: 'United States',
        states_regions: ['Iowa', 'Illinois', 'Nebraska', 'Kansas', 'Other']
      },
      {
        code: 'canada',
        label: 'Canada',
        states_regions: ['Alberta', 'Saskatchewan', 'Ontario', 'Quebec', 'Other']
      },
      {
        code: 'brazil',
        label: 'Brazil',
        states_regions: ['Mato Grosso', 'Paraná', 'Rio Grande do Sul', 'Other']
      },
      {
        code: 'other',
        label: 'Other',
        states_regions: []
      }
    ];

    const default_country_code = 'united_states';

    return { inquiry_types, countries, default_country_code };
  }

  // submitQuoteRequest
  submitQuoteRequest(
    inquiry_type,
    message,
    farm_size_acres,
    budget_amount,
    name,
    email,
    country,
    state_region
  ) {
    const validTypes = new Set(['sales_inquiry', 'request_pricing', 'support', 'general']);
    const typeToUse = validTypes.has(inquiry_type) ? inquiry_type : 'general';

    const requests = this._getFromStorage('quote_requests', []);

    const req = {
      id: this._generateId('quote'),
      inquiry_type: typeToUse,
      message: message || '',
      farm_size_acres: farm_size_acres != null ? Number(farm_size_acres) : null,
      budget_amount: budget_amount != null ? Number(budget_amount) : null,
      name: name || '',
      email: email || '',
      country: country || 'other',
      state_region: state_region || '',
      created_at: this._now(),
      status: 'received'
    };

    requests.push(req);
    this._saveToStorage('quote_requests', requests);

    return {
      success: true,
      quote_request_id: req.id,
      status: req.status,
      confirmation_message: 'Your request has been received. Our team will follow up shortly.'
    };
  }

  // getBuildYourSystemDefaults
  getBuildYourSystemDefaults() {
    const default_quantities = {
      soil_moisture_probes: 2,
      weather_stations: 1
    };

    const quantity_ranges = {
      soil_moisture_probes: { min: 0, max: 100 },
      weather_stations: { min: 0, max: 50 }
    };

    const connectivity_options = [
      { code: 'lorawan', label: 'LoRaWAN' },
      { code: 'cellular', label: 'Cellular' },
      { code: 'wifi', label: 'Wi-Fi' },
      { code: 'ethernet', label: 'Ethernet' },
      { code: 'satellite', label: 'Satellite' }
    ];

    const analytics_options = {
      can_add_analytics: true,
      billing_durations: [
        { code: 'monthly', label: 'Monthly' },
        { code: 'annual', label: 'Annual' }
      ]
    };

    return {
      default_quantities,
      quantity_ranges,
      connectivity_options,
      analytics_options
    };
  }

  // priceCustomSystemConfiguration
  priceCustomSystemConfiguration(
    quantity_soil_moisture_probes,
    quantity_weather_stations,
    connectivity_type,
    analytics_included,
    analytics_billing_duration
  ) {
    const hardware_subtotal = this._estimateHardwarePricing(
      quantity_soil_moisture_probes,
      quantity_weather_stations,
      connectivity_type
    );

    const analyticsPlans = this._getFromStorage('analytics_plans', []);
    const activePlans = analyticsPlans.filter((p) => p.status === 'active');

    let analytics_recurring_price_annual = 0;
    if (analytics_included && activePlans.length) {
      const cheapest = activePlans.reduce((min, p) => {
        const price = Number(p.base_monthly_price) || 0;
        return !min || price < (Number(min.base_monthly_price) || 0) ? p : min;
      }, null);
      const monthly = Number(cheapest.base_monthly_price) || 0;
      analytics_recurring_price_annual = +(monthly * 12).toFixed(2);
    }

    const total_upfront_cost = +hardware_subtotal.toFixed(2);
    const total_recurring_cost_monthly = analytics_included
      ? +(analytics_recurring_price_annual / 12).toFixed(2)
      : 0;

    return {
      hardware_subtotal,
      analytics_recurring_price_annual,
      total_upfront_cost,
      total_recurring_cost_monthly,
      currency: 'usd'
    };
  }

  // addCustomConfigurationToCart
  addCustomConfigurationToCart(
    configuration_name = 'Custom sensor network configuration',
    quantity_soil_moisture_probes,
    quantity_weather_stations,
    connectivity_type,
    analytics_included,
    analytics_billing_duration
  ) {
    if (analytics_included && !analytics_billing_duration) {
      analytics_billing_duration = 'annual';
    }

    const configuration = this._createCustomSystemConfigurationRecord({
      name: configuration_name,
      quantity_soil_moisture_probes,
      quantity_weather_stations,
      connectivity_type,
      analytics_included,
      analytics_billing_duration
    });

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'custom_configuration',
      productId: null,
      configurationId: configuration.id,
      subscriptionPlanId: null,
      name: configuration.name,
      unit_price: configuration.total_upfront_cost || 0,
      quantity: 1,
      subtotal: configuration.total_upfront_cost || 0,
      added_at: this._now()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const pricing = {
      hardware_subtotal: configuration.hardware_subtotal,
      analytics_recurring_price_annual: configuration.analytics_recurring_price_annual,
      total_upfront_cost: configuration.total_upfront_cost,
      total_recurring_cost_monthly: configuration.total_recurring_cost_monthly,
      currency: 'usd'
    };

    return {
      success: true,
      configuration_id: configuration.id,
      cart_item_id: item.id,
      cart_id: cart.id,
      pricing,
      message: 'Custom configuration added to cart'
    };
  }

  // getAnalyticsDashboardOverview
  getAnalyticsDashboardOverview() {
    const features = this._getFromStorage('analytics_features', []);

    const feature_sections = features.map((f) => ({
      section_code: f.code,
      title: f.name,
      description: f.description || '',
      feature_codes: [f.code]
    }));

    const supported_features = features.map((f) => ({
      code: f.code,
      name: f.name,
      description: f.description || ''
    }));

    return {
      headline: 'Analytics Dashboard',
      description:
        'Visualize your soil moisture, weather, and crop performance data in one place.',
      feature_sections,
      supported_features
    };
  }

  // getAnalyticsTrialFormOptions
  getAnalyticsTrialFormOptions() {
    const primary_crops = [
      { code: 'corn', label: 'Corn' },
      { code: 'soybean', label: 'Soybean' },
      { code: 'wheat', label: 'Wheat' },
      { code: 'cotton', label: 'Cotton' },
      { code: 'multi_crop', label: 'Multi-crop' },
      { code: 'other', label: 'Other' }
    ];

    const regions = [
      { code: 'north_america', label: 'North America' },
      { code: 'south_america', label: 'South America' },
      { code: 'europe', label: 'Europe' },
      { code: 'asia_pacific', label: 'Asia Pacific' },
      { code: 'africa', label: 'Africa' },
      { code: 'middle_east', label: 'Middle East' },
      { code: 'other', label: 'Other' }
    ];

    const data_refresh_frequencies = [
      { code: 'daily', label: 'Daily', description: 'Data updates once per day.' },
      { code: 'hourly', label: 'Hourly', description: 'Data updates every hour.' },
      { code: 'weekly', label: 'Weekly', description: 'Data updates once per week.' }
    ];

    const password_requirements =
      'Password should be at least 8 characters and include a mix of letters, numbers, and symbols.';

    return { primary_crops, regions, data_refresh_frequencies, password_requirements };
  }

  // createAnalyticsTrialAccount
  createAnalyticsTrialAccount(
    full_name,
    email,
    username,
    password,
    primary_crop,
    region,
    data_refresh_frequency
  ) {
    const accounts = this._getFromStorage('analytics_trial_accounts', []);
    const trial_start = this._now();
    const trial_end = this._calculateTrialEndDate(trial_start);

    const account = {
      id: this._generateId('trial'),
      full_name: full_name || '',
      email: email || '',
      username: username || '',
      password: password || '',
      primary_crop: primary_crop || null,
      region: region || null,
      data_refresh_frequency: data_refresh_frequency || 'daily',
      trial_start,
      trial_end,
      status: 'active'
    };

    accounts.push(account);
    this._saveToStorage('analytics_trial_accounts', accounts);

    return {
      success: true,
      trial_account_id: account.id,
      status: account.status,
      trial_start: account.trial_start,
      trial_end: account.trial_end,
      message: 'Trial account created successfully.'
    };
  }

  // getCompanyInfo
  getCompanyInfo() {
    const stored = this._getFromStorage('company_info', null);
    if (stored) return stored;

    return {
      mission: '',
      vision: '',
      history: '',
      expertise: '',
      geographic_focus: '',
      leadership: [],
      partners: [],
      certifications_awards: []
    };
  }

  // getFaqContent
  getFaqContent() {
    const faqs = this._getFromStorage('faqs', []);

    const categorySet = new Set(faqs.map((f) => f.category_code).filter(Boolean));
    let categories = Array.from(categorySet).map((code) => ({
      code,
      label: this._snakeToTitle(code)
    }));

    if (!categories.length) {
      categories = [
        { code: 'sensors', label: 'Sensors' },
        { code: 'connectivity', label: 'Connectivity' },
        { code: 'analytics', label: 'Analytics' },
        { code: 'roi', label: 'ROI & Economics' },
        { code: 'pricing', label: 'Pricing & Billing' }
      ];
    }

    return {
      categories,
      faqs: faqs.map((f) => ({
        faq_id: f.faq_id || f.id || this._generateId('faq'),
        category_code: f.category_code || 'general',
        question: f.question || '',
        answer: f.answer || ''
      }))
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy', null);
    if (stored) return stored;

    return {
      last_updated: this._now(),
      sections: []
    };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_and_conditions', null);
    if (stored) return stored;

    return {
      last_updated: this._now(),
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