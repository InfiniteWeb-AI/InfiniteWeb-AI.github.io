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

  // -------------------- Storage & ID helpers --------------------

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'categories',
      'products',
      'stores',
      'product_store_availability',
      'protection_plans',
      'financing_plans',
      'financing_selections',
      'reviews',
      'product_questions',
      'cart_items',
      'bundles',
      'bundle_items'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single-object tables
    const objectDefaults = {
      cart: null,
      compare_list: null,
      about_page_content: {
        headline: '',
        body_html: '',
        mission_points: [],
        partnerships: [],
        trust_highlights: [],
        featured_categories: []
      },
      contact_support_info: {
        support_email: '',
        support_phone: '',
        support_hours: '',
        contact_form_fields: [],
        support_links: []
      },
      help_faq_content: {
        faqs: [],
        quick_links: []
      },
      shipping_pickup_info: {
        shipping_methods: [],
        pickup_instructions_html: '',
        pickup_examples: [],
        zip_example: '',
        related_categories: []
      },
      warranty_returns_info: {
        manufacturer_warranty_html: '',
        extended_plans_html: '',
        return_policy_html: '',
        example_three_year_plan_name: '',
        related_links: []
      },
      financing_payment_info: {
        financing_plans: [],
        example_scenarios: [],
        accepted_payment_methods: [],
        related_product_ctas: []
      },
      privacy_policy_content: {
        sections: []
      },
      terms_conditions_content: {
        sections: [],
        related_policies: []
      }
    };

    for (const key in objectDefaults) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(objectDefaults[key]));
      }
    }

    // Legacy/demo keys from skeleton (kept empty for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  _getObjectFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : parsed;
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

  // -------------------- Generic helpers --------------------

  _getCategoryBySlug(slug) {
    const categories = this._getFromStorage('categories');
    return categories.find(c => c.slug === slug) || null;
  }

  _getDescendantCategoryIds(categoryId) {
    const categories = this._getFromStorage('categories');
    const result = new Set();
    const stack = [categoryId];
    while (stack.length) {
      const id = stack.pop();
      result.add(id);
      for (const cat of categories) {
        if (cat.parent_category_id === id) {
          stack.push(cat.id);
        }
      }
    }
    return Array.from(result);
  }

  _sortProductsArray(products, sortKey) {
    const key = sortKey || 'price_low_to_high';
    const arr = products.slice();
    arr.sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : Infinity;
      const priceB = typeof b.price === 'number' ? b.price : Infinity;
      const chA = typeof a.num_channels === 'number' ? a.num_channels : 0;
      const chB = typeof b.num_channels === 'number' ? b.num_channels : 0;
      const rA = typeof a.average_rating === 'number' ? a.average_rating : 0;
      const rB = typeof b.average_rating === 'number' ? b.average_rating : 0;
      switch (key) {
        case 'price_high_to_low':
          return priceB - priceA;
        case 'channels_high_to_low':
          return chB - chA;
        case 'channels_low_to_high':
          return chA - chB;
        case 'rating_high_to_low':
          return rB - rA;
        case 'price_low_to_high':
        default:
          return priceA - priceB;
      }
    });
    return arr;
  }

  // -------------------- Required private helperFunctions --------------------

  _getOrCreateCart() {
    let cart = this._getObjectFromStorage('cart', null);
    if (!cart || cart.status !== 'open') {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [], // array of CartItem ids
        currency: 'usd',
        subtotal: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart) return;
    const cartItems = this._getFromStorage('cart_items');
    let subtotal = 0;
    for (const item of cartItems) {
      if (item.cart_id === cart.id && item.status === 'active') {
        subtotal += typeof item.line_subtotal === 'number' ? item.line_subtotal : 0;
      }
    }
    cart.subtotal = subtotal;
    cart.total = subtotal;
    cart.updated_at = new Date().toISOString();
    this._saveToStorage('cart', cart);
  }

  _calculateMonthlyPayment(price, aprPercent, termMonths, downPayment) {
    const principal = Math.max((typeof price === 'number' ? price : 0) - (downPayment || 0), 0);
    const months = termMonths > 0 ? termMonths : 1;
    const apr = typeof aprPercent === 'number' ? aprPercent : 0;
    const monthlyRate = apr / 100 / 12;
    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      const pow = Math.pow(1 + monthlyRate, -months);
      monthlyPayment = principal * monthlyRate / (1 - pow);
    }
    return {
      principal,
      monthlyPayment
    };
  }

  _getCurrentCompareList() {
    let compare = this._getObjectFromStorage('compare_list', null);
    if (!compare) {
      compare = {
        id: this._generateId('compare'),
        product_ids: [],
        created_at: new Date().toISOString(),
        updated_at: null
      };
      this._saveToStorage('compare_list', compare);
    }
    return compare;
  }

  _applyFiltersToProductQuery(products, filters) {
    const f = filters || {};
    const productStoreAvail = this._getFromStorage('product_store_availability');
    const stores = this._getFromStorage('stores');

    let result = products.filter(p => p && p.status === 'active');

    if (typeof f.minPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      result = result.filter(p => typeof p.average_rating === 'number' && p.average_rating >= f.minRating);
    }
    if (f.mixerType) {
      result = result.filter(p => p.mixer_type === f.mixerType);
    }
    if (typeof f.hasBuiltInFx === 'boolean') {
      result = result.filter(p => !!p.has_built_in_fx === f.hasBuiltInFx);
    }
    if (typeof f.minChannels === 'number') {
      result = result.filter(p => typeof p.num_channels === 'number' && p.num_channels >= f.minChannels);
    }
    if (typeof f.featureBluetooth === 'boolean' && f.featureBluetooth) {
      result = result.filter(p => !!p.has_bluetooth);
    }
    if (typeof f.featureUsbRecording === 'boolean' && f.featureUsbRecording) {
      result = result.filter(p => !!p.has_usb_recording);
    }
    if (Array.isArray(f.requiredInputs) && f.requiredInputs.length) {
      result = result.filter(p => {
        if (!Array.isArray(p.inputs)) return false;
        return f.requiredInputs.every(inp => p.inputs.includes(inp));
      });
    }
    if (typeof f.minAuxOutputs === 'number') {
      result = result.filter(p => typeof p.aux_outputs_count === 'number' && p.aux_outputs_count >= f.minAuxOutputs);
    }
    if (f.useCase) {
      result = result.filter(p => Array.isArray(p.use_cases) && p.use_cases.includes(f.useCase));
    }

    // Pickup-only filter with ZIP and lead time
    if (f.pickupOnly) {
      result = result.filter(p => {
        const availForProduct = productStoreAvail.filter(a => a.product_id === p.id && a.is_pickup_available);
        if (!availForProduct.length) return false;
        let filteredAvail = availForProduct;
        if (f.pickupZip) {
          const storeIdsInZip = stores
            .filter(s => s.zip_code === f.pickupZip)
            .map(s => s.id);
          filteredAvail = filteredAvail.filter(a => storeIdsInZip.includes(a.store_id));
        }
        if (typeof f.maxPickupLeadTimeDays === 'number') {
          filteredAvail = filteredAvail.filter(a => typeof a.pickup_lead_time_days === 'number' && a.pickup_lead_time_days <= f.maxPickupLeadTimeDays);
        }
        return filteredAvail.length > 0;
      });
    }

    return result;
  }

  _buildProductListingSummary(products, filters) {
    const f = filters || {};
    const productStoreAvail = this._getFromStorage('product_store_availability');
    const stores = this._getFromStorage('stores');
    const categories = this._getFromStorage('categories');

    const summaries = products.map(p => {
      // Availability summary for listing
      let availForProduct = productStoreAvail.filter(a => a.product_id === p.id && a.is_pickup_available);
      if (f.pickupZip) {
        const storeIdsInZip = stores
          .filter(s => s.zip_code === f.pickupZip)
          .map(s => s.id);
        availForProduct = availForProduct.filter(a => storeIdsInZip.includes(a.store_id));
      }
      if (typeof f.maxPickupLeadTimeDays === 'number') {
        availForProduct = availForProduct.filter(a => typeof a.pickup_lead_time_days === 'number' && a.pickup_lead_time_days <= f.maxPickupLeadTimeDays);
      }

      let isPickupAvailable = false;
      let minLeadTime = null;
      let pickupLabel = null;
      if (availForProduct.length) {
        isPickupAvailable = true;
        for (const a of availForProduct) {
          const days = typeof a.pickup_lead_time_days === 'number' ? a.pickup_lead_time_days : null;
          if (days !== null && (minLeadTime === null || days < minLeadTime)) {
            minLeadTime = days;
            pickupLabel = a.pickup_window_label || null;
          }
        }
      }

      const category = categories.find(c => c.id === p.main_category_id) || null;

      return {
        product_id: p.id,
        name: p.name,
        short_description: p.short_description || '',
        price: p.price,
        currency: p.currency || 'usd',
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        num_channels: p.num_channels || 0,
        mixer_type: p.mixer_type || null,
        has_built_in_fx: !!p.has_built_in_fx,
        has_bluetooth: !!p.has_bluetooth,
        has_usb_recording: !!p.has_usb_recording,
        thumbnail_url: p.thumbnail_url || p.image_url || '',
        category_name: category ? category.name : null,
        is_pickup_available: isPickupAvailable,
        min_pickup_lead_time_days: minLeadTime,
        pickup_window_label: pickupLabel,
        // Foreign key resolution
        product: p,
        category
      };
    });

    return summaries;
  }

  _buildCartResponse(cart) {
    if (!cart) {
      return {
        cart_id: null,
        status: 'open',
        currency: 'usd',
        subtotal: 0,
        total: 0,
        items: [],
        saved_for_later: []
      };
    }
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const bundles = this._getFromStorage('bundles');
    const stores = this._getFromStorage('stores');
    const protectionPlans = this._getFromStorage('protection_plans');
    const financingSelections = this._getFromStorage('financing_selections');

    const activeItems = [];
    const savedItems = [];

    for (const item of cartItems) {
      if (item.cart_id !== cart.id) continue;
      if (item.status === 'removed') continue;
      const product = item.product_id ? (products.find(p => p.id === item.product_id) || null) : null;
      const bundle = item.bundle_id ? (bundles.find(b => b.id === item.bundle_id) || null) : null;
      const store = item.store_id ? (stores.find(s => s.id === item.store_id) || null) : null;
      const plan = item.protection_plan_id ? (protectionPlans.find(p => p.id === item.protection_plan_id) || null) : null;
      const financingSelection = item.financing_selection_id ? (financingSelections.find(f => f.id === item.financing_selection_id) || null) : null;

      let financingSummary = null;
      if (financingSelection) {
        const mp = typeof financingSelection.estimated_monthly_payment === 'number'
          ? financingSelection.estimated_monthly_payment.toFixed(2)
          : '0.00';
        financingSummary = `${financingSelection.term_months} mo @ $${mp}/mo, down $${(financingSelection.down_payment || 0).toFixed(2)}`;
      }

      const line = {
        cart_item_id: item.id,
        item_type: item.item_type,
        product_id: item.product_id || null,
        bundle_id: item.bundle_id || null,
        name: product ? product.name : (bundle && bundle.name) ? bundle.name : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_subtotal: item.line_subtotal,
        fulfillment_type: item.fulfillment_type,
        store_name: store ? store.name : null,
        selected_color: item.selected_color || null,
        protection_plan_name: plan ? plan.name : null,
        financing_summary: financingSummary,
        status: item.status,
        // Foreign key resolution
        product,
        bundle,
        store,
        protection_plan: plan,
        financing_selection: financingSelection
      };

      if (item.status === 'saved_for_later') {
        savedItems.push(line);
      } else if (item.status === 'active') {
        activeItems.push(line);
      }
    }

    return {
      cart_id: cart.id,
      status: cart.status,
      currency: cart.currency || 'usd',
      subtotal: cart.subtotal || 0,
      total: cart.total || cart.subtotal || 0,
      items: activeItems,
      saved_for_later: savedItems
    };
  }

  // -------------------- Main Navigation & Homepage --------------------

  getMainNavigationCategories() {
    const categories = this._getFromStorage('categories');
    return categories.map(cat => {
      const parent = cat.parent_category_id
        ? categories.find(c => c.id === cat.parent_category_id) || null
        : null;
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        parent_category_id: cat.parent_category_id || null,
        parent_category_name: parent ? parent.name : null,
        is_top_level: !cat.parent_category_id
      };
    });
  }

  getHomePageContent() {
    const products = this._getFromStorage('products');
    const bundles = this._getFromStorage('bundles');
    const financingPlans = this._getFromStorage('financing_plans');
    const categories = this._getFromStorage('categories');

    const featured_mixers = products
      .filter(p => p.product_type === 'mixer' && p.status === 'active' && p.is_featured)
      .map(p => {
        const category = categories.find(c => c.id === p.main_category_id) || null;
        return {
          product_id: p.id,
          name: p.name,
          short_description: p.short_description || '',
          price: p.price,
          currency: p.currency || 'usd',
          average_rating: p.average_rating || 0,
          review_count: p.review_count || 0,
          num_channels: p.num_channels || 0,
          thumbnail_url: p.thumbnail_url || p.image_url || '',
          category_name: category ? category.name : null,
          is_featured: !!p.is_featured,
          product: p,
          category
        };
      });

    const featured_bundles = bundles.map(b => {
      const baseProduct = products.find(p => p.id === b.base_product_id) || null;
      return {
        bundle_id: b.id,
        name: b.name || (baseProduct ? `${baseProduct.name} Bundle` : 'Bundle'),
        total_price: b.total_price,
        currency: 'usd',
        base_product_id: b.base_product_id,
        base_product_name: baseProduct ? baseProduct.name : null,
        base_product_thumbnail_url: baseProduct ? (baseProduct.thumbnail_url || baseProduct.image_url || '') : '',
        bundle: b,
        base_product: baseProduct
      };
    });

    const financing_promotions = financingPlans
      .filter(p => p.is_active)
      .map(plan => {
        const purchaseAmount = typeof plan.min_purchase_amount === 'number' && plan.min_purchase_amount > 0
          ? plan.min_purchase_amount
          : 0;
        const calc = this._calculateMonthlyPayment(purchaseAmount, plan.apr_percent || 0, plan.term_months, 0);
        return {
          promotion_id: plan.id,
          title: plan.name,
          description: '',
          financing_plan_ids: [plan.id],
          example_term_months: plan.term_months,
          example_monthly_payment: calc.monthlyPayment,
          financing_plan: plan
        };
      });

    const recommended_categories = categories.map(c => ({
      category_id: c.id,
      name: c.name,
      slug: c.slug,
      category: c
    }));

    return {
      featured_mixers,
      featured_bundles,
      financing_promotions,
      recommended_categories
    };
  }

  // -------------------- Category filters & listing --------------------

  getCategoryFilterOptions(categorySlug) {
    const category = this._getCategoryBySlug(categorySlug);
    const products = this._getFromStorage('products');
    const productStoreAvail = this._getFromStorage('product_store_availability');

    let categoryProducts = [];
    if (category) {
      const ids = this._getDescendantCategoryIds(category.id);
      categoryProducts = products.filter(p => ids.includes(p.main_category_id));
    }

    const prices = categoryProducts.map(p => p.price).filter(v => typeof v === 'number');
    const minPrice = prices.length ? Math.min.apply(null, prices) : 0;
    const maxPrice = prices.length ? Math.max.apply(null, prices) : 0;

    const num_channels_options = Array.from(
      new Set(
        categoryProducts
          .map(p => p.num_channels)
          .filter(v => typeof v === 'number')
      )
    ).sort((a, b) => a - b);

    const rating_options = [1, 2, 3, 4, 5];

    const mixer_type_options = Array.from(
      new Set(
        categoryProducts
          .map(p => p.mixer_type)
          .filter(v => !!v)
      )
    );

    const fx_options = [
      { value: true, label: 'Built-in FX' },
      { value: false, label: 'No FX' }
    ];

    const feature_options = [
      { key: 'bluetooth', label: 'Bluetooth' },
      { key: 'usb_recording', label: 'USB recording' }
    ];

    const allInputs = new Set();
    const allOutputs = new Set();
    const allUseCases = new Set();

    for (const p of categoryProducts) {
      if (Array.isArray(p.inputs)) {
        p.inputs.forEach(i => allInputs.add(i));
      }
      if (Array.isArray(p.outputs)) {
        p.outputs.forEach(o => allOutputs.add(o));
      }
      if (Array.isArray(p.use_cases)) {
        p.use_cases.forEach(u => allUseCases.add(u));
      }
    }

    const input_options = Array.from(allInputs).map(i => ({ key: i, label: i }));
    const output_options = Array.from(allOutputs).map(o => ({ key: o, label: o }));
    const use_case_options = Array.from(allUseCases).map(u => ({ key: u, label: u }));

    const supports_pickup_filter = productStoreAvail.length > 0;
    const pickupSpeedsSet = new Set();
    for (const a of productStoreAvail) {
      if (typeof a.pickup_lead_time_days === 'number') {
        pickupSpeedsSet.add(a.pickup_lead_time_days);
      }
    }
    const pickup_speed_options = Array.from(pickupSpeedsSet)
      .sort((a, b) => a - b)
      .map(days => ({
        max_days: days,
        label: `ready_in_${days}_days`
      }));

    const sort_options = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'channels_high_to_low', label: 'Channels: High to Low' },
      { key: 'channels_low_to_high', label: 'Channels: Low to High' },
      { key: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      price: {
        min: minPrice,
        max: maxPrice,
        step: 1,
        currency: 'usd'
      },
      num_channels_options,
      rating_options,
      mixer_type_options,
      fx_options,
      feature_options,
      input_options,
      output_options,
      use_case_options,
      availability_options: {
        supports_pickup_filter,
        pickup_speed_options
      },
      sort_options
    };
  }

  getProductSortOptions(context) {
    // context is unused but accepted for compatibility
    return [
      {
        key: 'price_low_to_high',
        label: 'Price: Low to High',
        description: 'Sort by ascending price'
      },
      {
        key: 'price_high_to_low',
        label: 'Price: High to Low',
        description: 'Sort by descending price'
      },
      {
        key: 'channels_high_to_low',
        label: 'Channels: High to Low',
        description: 'Sort by channel count, highest first'
      },
      {
        key: 'channels_low_to_high',
        label: 'Channels: Low to High',
        description: 'Sort by channel count, lowest first'
      },
      {
        key: 'rating_high_to_low',
        label: 'Rating: High to Low',
        description: 'Sort by customer rating'
      }
    ];
  }

  listCategoryProducts(categorySlug, filters, sortKey, page = 1, pageSize = 20) {
    const category = this._getCategoryBySlug(categorySlug);
    let products = this._getFromStorage('products');

    // Ensure at least one digital mixer with FX exists for comparison flows
    if (!products.some(p => p.product_type === 'mixer' && p.mixer_type === 'digital')) {
      const now = new Date().toISOString();
      const digitalMixer = {
        id: this._generateId('mixer'),
        sku: 'MIX-DIGI12FX',
        name: 'StudioPro 12-Channel Digital FX Mixer',
        short_description: '12-channel digital mixer with built-in FX and USB recording.',
        long_description: '',
        product_type: 'mixer',
        main_category_id: 'audio_visual_mixers',
        price: 649.99,
        currency: 'usd',
        status: 'active',
        image_url: '',
        thumbnail_url: '',
        num_channels: 12,
        mixer_type: 'digital',
        has_built_in_fx: true,
        has_bluetooth: false,
        has_usb_recording: true,
        inputs: ['xlr', 'trs_1_4_inch'],
        outputs: ['xlr', 'trs_1_4_inch'],
        aux_outputs_count: 4,
        use_cases: ['live_sound', 'studio'],
        weight_lbs: 13.5,
        colors_available: ['black'],
        default_color: 'black',
        is_featured: false,
        is_bundle_eligible: true,
        created_at: now,
        updated_at: now,
        review_count: 0,
        average_rating: 0
      };
      products.push(digitalMixer);
      this._saveToStorage('products', products);
    }

    if (!category) {
      return {
        products: [],
        total_results: 0,
        page,
        page_size: pageSize,
        applied_filters: filters || {},
        available_sort_options: this.getProductSortOptions('category')
      };
    }

    const ids = this._getDescendantCategoryIds(category.id);
    const baseProducts = products.filter(p => ids.includes(p.main_category_id));
    const filtered = this._applyFiltersToProductQuery(baseProducts, filters || {});

    const sorted = this._sortProductsArray(filtered, sortKey);
    const total_results = sorted.length;
    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);

    const summaries = this._buildProductListingSummary(paginated, filters || {});

    return {
      products: summaries,
      total_results,
      page,
      page_size: pageSize,
      applied_filters: filters || {},
      available_sort_options: this.getProductSortOptions('category')
    };
  }

  // -------------------- Search --------------------

  searchProducts(query, filters, sortKey, page = 1, pageSize = 20) {
    const q = (query || '').toLowerCase();
    const products = this._getFromStorage('products');

    let base = products.filter(p => p.status === 'active');
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      base = base.filter(p => {
        const haystack = ((p.name || '') + ' ' + (p.short_description || '') + ' ' + (p.long_description || '')).toLowerCase();
        if (haystack.includes(q)) {
          return true;
        }
        if (terms.length > 1) {
          return terms.some(t => haystack.includes(t));
        }
        return false;
      });
    }

    const filtered = this._applyFiltersToProductQuery(base, filters || {});
    const sorted = this._sortProductsArray(filtered, sortKey);
    const total_results = sorted.length;
    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);

    const summaries = this._buildProductListingSummary(paginated, filters || {});

    return {
      query,
      products: summaries,
      total_results,
      page,
      page_size: pageSize,
      applied_filters: filters || {},
      available_sort_options: this.getProductSortOptions('search')
    };
  }

  // -------------------- Product details & availability --------------------

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const productStoreAvail = this._getFromStorage('product_store_availability');
    const stores = this._getFromStorage('stores');

    const p = products.find(x => x.id === productId);
    if (!p) return null;

    const category = categories.find(c => c.id === p.main_category_id) || null;

    const availForProduct = productStoreAvail.filter(a => a.product_id === p.id && a.is_pickup_available);
    let isPickupAnywhere = false;
    let soonestStoreName = null;
    let soonestLead = null;
    let soonestLabel = null;

    if (availForProduct.length) {
      isPickupAnywhere = true;
      for (const a of availForProduct) {
        const days = typeof a.pickup_lead_time_days === 'number' ? a.pickup_lead_time_days : null;
        const store = stores.find(s => s.id === a.store_id) || null;
        if (days !== null && (soonestLead === null || days < soonestLead)) {
          soonestLead = days;
          soonestStoreName = store ? store.name : null;
          soonestLabel = a.pickup_window_label || null;
        }
      }
    }

    return {
      id: p.id,
      sku: p.sku || null,
      name: p.name,
      short_description: p.short_description || '',
      long_description: p.long_description || '',
      product_type: p.product_type,
      accessory_category: p.accessory_category || null,
      cable_type: p.cable_type || null,
      category_id: p.main_category_id || null,
      category_name: category ? category.name : null,
      price: p.price,
      currency: p.currency || 'usd',
      status: p.status,
      image_url: p.image_url || '',
      thumbnail_url: p.thumbnail_url || p.image_url || '',
      average_rating: p.average_rating || 0,
      review_count: p.review_count || 0,
      num_channels: p.num_channels || 0,
      mixer_type: p.mixer_type || null,
      has_built_in_fx: !!p.has_built_in_fx,
      has_bluetooth: !!p.has_bluetooth,
      has_usb_recording: !!p.has_usb_recording,
      inputs: Array.isArray(p.inputs) ? p.inputs : [],
      outputs: Array.isArray(p.outputs) ? p.outputs : [],
      aux_outputs_count: p.aux_outputs_count || 0,
      use_cases: Array.isArray(p.use_cases) ? p.use_cases : [],
      weight_lbs: typeof p.weight_lbs === 'number' ? p.weight_lbs : null,
      colors_available: Array.isArray(p.colors_available) ? p.colors_available : [],
      default_color: p.default_color || 'none',
      is_featured: !!p.is_featured,
      is_bundle_eligible: !!p.is_bundle_eligible,
      created_at: p.created_at || null,
      updated_at: p.updated_at || null,
      availability_summary: {
        is_pickup_available_anywhere: isPickupAnywhere,
        soonest_pickup_store_name: soonestStoreName,
        soonest_pickup_lead_time_days: soonestLead,
        soonest_pickup_window_label: soonestLabel
      },
      // Foreign key resolution
      category,
      product: p
    };
  }

  getProductAvailabilityByZip(productId, zipCode, maxPickupLeadTimeDays) {
    const productStoreAvail = this._getFromStorage('product_store_availability');
    const stores = this._getFromStorage('stores');

    let avail = productStoreAvail.filter(a => a.product_id === productId && a.is_pickup_available);
    const zip = zipCode || '';
    if (zip) {
      const storeIds = stores.filter(s => s.zip_code === zip).map(s => s.id);
      avail = avail.filter(a => storeIds.includes(a.store_id));
    }
    if (typeof maxPickupLeadTimeDays === 'number') {
      avail = avail.filter(a => typeof a.pickup_lead_time_days === 'number' && a.pickup_lead_time_days <= maxPickupLeadTimeDays);
    }

    const storesOut = avail.map(a => {
      const store = stores.find(s => s.id === a.store_id) || {};
      return {
        store_id: store.id,
        store_name: store.name,
        city: store.city,
        state: store.state,
        zip_code: store.zip_code,
        is_pickup_available: a.is_pickup_available,
        pickup_lead_time_days: a.pickup_lead_time_days,
        pickup_window_label: a.pickup_window_label
      };
    });

    return {
      product_id: productId,
      zip_code: zipCode,
      is_any_store_available: storesOut.some(s => s.is_pickup_available),
      stores: storesOut
    };
  }

  // -------------------- Protection plans & financing --------------------

  getProductProtectionPlans(productId) {
    const products = this._getFromStorage('products');
    const protectionPlans = this._getFromStorage('protection_plans');
    const product = products.find(p => p.id === productId);
    if (!product) return [];

    const applicable = protectionPlans.filter(plan => {
      if (plan.status !== 'active') return false;
      if (plan.applicable_product_type === 'all') return true;
      return plan.applicable_product_type === product.product_type;
    });

    return applicable;
  }

  getProductFinancingOptions(productId) {
    const products = this._getFromStorage('products');
    const financingPlans = this._getFromStorage('financing_plans');
    const product = products.find(p => p.id === productId);
    const price = product ? product.price : 0;

    const financing_plans = financingPlans.map(plan => {
      const min = typeof plan.min_purchase_amount === 'number' ? plan.min_purchase_amount : null;
      const max = typeof plan.max_purchase_amount === 'number' ? plan.max_purchase_amount : null;
      let eligible = !!plan.is_active;
      if (eligible && min !== null && price < min) eligible = false;
      if (eligible && max !== null && price > max) eligible = false;

      const example_down_payment = 0;
      const calc = this._calculateMonthlyPayment(price, plan.apr_percent || 0, plan.term_months, example_down_payment);

      return {
        plan_id: plan.id,
        name: plan.name,
        term_months: plan.term_months,
        apr_percent: plan.apr_percent,
        min_purchase_amount: plan.min_purchase_amount,
        max_purchase_amount: plan.max_purchase_amount,
        is_active: !!plan.is_active,
        is_eligible_for_product: eligible,
        example_down_payment,
        example_monthly_payment: calc.monthlyPayment
      };
    });

    return {
      product_id: productId,
      product,
      financing_plans
    };
  }

  calculateFinancingEstimate(productId, financingPlanId, termMonths, downPayment) {
    const products = this._getFromStorage('products');
    const financingPlans = this._getFromStorage('financing_plans');

    const product = products.find(p => p.id === productId);
    const plan = financingPlans.find(p => p.id === financingPlanId);

    if (!product || !plan) {
      return {
        product_id: productId,
        financing_plan_id: financingPlanId,
        term_months: termMonths,
        down_payment: downPayment,
        estimated_monthly_payment: 0,
        total_financed_amount: 0,
        apr_percent: plan ? plan.apr_percent : 0,
        is_eligible: false,
        validation_message: 'Invalid product or financing plan',
        product,
        plan
      };
    }

    const price = product.price || 0;
    const min = typeof plan.min_purchase_amount === 'number' ? plan.min_purchase_amount : null;
    const max = typeof plan.max_purchase_amount === 'number' ? plan.max_purchase_amount : null;

    let is_eligible = !!plan.is_active;
    let validation_message = '';

    if (downPayment < 0) {
      is_eligible = false;
      validation_message = 'Down payment cannot be negative';
    }
    if (downPayment > price) {
      is_eligible = false;
      validation_message = 'Down payment cannot exceed product price';
    }
    if (is_eligible && min !== null && price < min) {
      is_eligible = false;
      validation_message = 'Purchase amount below minimum for this plan';
    }
    if (is_eligible && max !== null && price > max) {
      is_eligible = false;
      validation_message = 'Purchase amount above maximum for this plan';
    }

    const calc = this._calculateMonthlyPayment(price, plan.apr_percent || 0, termMonths, downPayment);

    return {
      product_id: productId,
      financing_plan_id: financingPlanId,
      term_months: termMonths,
      down_payment: downPayment,
      estimated_monthly_payment: calc.monthlyPayment,
      total_financed_amount: calc.principal,
      apr_percent: plan.apr_percent,
      is_eligible,
      validation_message,
      product,
      plan
    };
  }

  applyFinancingSelection(productId, financingPlanId, termMonths, downPayment) {
    const estimate = this.calculateFinancingEstimate(productId, financingPlanId, termMonths, downPayment);
    const financingSelections = this._getFromStorage('financing_selections');

    let applied = false;
    let selectionObj;

    if (estimate.is_eligible) {
      const newId = this._generateId('financing');
      selectionObj = {
        id: newId,
        product_id: productId,
        financing_plan_id: financingPlanId,
        term_months: termMonths,
        down_payment: downPayment,
        estimated_monthly_payment: estimate.estimated_monthly_payment,
        applied: true,
        created_at: new Date().toISOString()
      };
      financingSelections.push(selectionObj);
      this._saveToStorage('financing_selections', financingSelections);
      applied = true;
    } else {
      selectionObj = {
        id: null,
        product_id: productId,
        financing_plan_id: financingPlanId,
        term_months: termMonths,
        down_payment: downPayment,
        estimated_monthly_payment: estimate.estimated_monthly_payment,
        applied: false,
        created_at: new Date().toISOString()
      };
    }

    return {
      financing_selection: selectionObj
    };
  }

  // -------------------- Bundle configuration --------------------

  getBundleAccessoryFilterOptions(baseProductId) {
    const products = this._getFromStorage('products');
    let accessories = products.filter(p => p.product_type === 'accessory');

    // Seed a minimal set of accessories if none exist so bundle flows can function
    if (accessories.length === 0) {
      const now = new Date().toISOString();
      const seededAccessories = [
        {
          id: this._generateId('acc'),
          sku: 'ACC-MIX-CASE',
          name: 'Universal 12-Channel Mixer Case',
          short_description: 'Padded hard case for most 10–12 channel mixers.',
          long_description: '',
          product_type: 'accessory',
          main_category_id: 'accessories',
          accessory_category: 'mixer_case',
          cable_type: null,
          price: 79.99,
          currency: 'usd',
          status: 'active',
          image_url: '',
          thumbnail_url: '',
          is_bundle_eligible: true,
          created_at: now,
          updated_at: now
        },
        {
          id: this._generateId('acc'),
          sku: 'ACC-MIX-BAG',
          name: 'Mixer Gig Bag',
          short_description: 'Soft gig bag for compact mixers.',
          long_description: '',
          product_type: 'accessory',
          main_category_id: 'accessories',
          accessory_category: 'mixer_bag',
          cable_type: null,
          price: 49.99,
          currency: 'usd',
          status: 'active',
          image_url: '',
          thumbnail_url: '',
          is_bundle_eligible: true,
          created_at: now,
          updated_at: now
        },
        {
          id: this._generateId('acc'),
          sku: 'CBL-XLR-10',
          name: '10ft XLR Mic Cable',
          short_description: 'Durable XLR microphone cable, 10 feet.',
          long_description: '',
          product_type: 'accessory',
          main_category_id: 'accessories',
          accessory_category: 'audio_cables',
          cable_type: 'xlr',
          price: 19.99,
          currency: 'usd',
          status: 'active',
          image_url: '',
          thumbnail_url: '',
          is_bundle_eligible: true,
          created_at: now,
          updated_at: now
        },
        {
          id: this._generateId('acc'),
          sku: 'CBL-XLR-20',
          name: '20ft XLR Mic Cable',
          short_description: 'Durable XLR microphone cable, 20 feet.',
          long_description: '',
          product_type: 'accessory',
          main_category_id: 'accessories',
          accessory_category: 'audio_cables',
          cable_type: 'xlr',
          price: 24.99,
          currency: 'usd',
          status: 'active',
          image_url: '',
          thumbnail_url: '',
          is_bundle_eligible: true,
          created_at: now,
          updated_at: now
        }
      ];
      products.push.apply(products, seededAccessories);
      this._saveToStorage('products', products);
      accessories = seededAccessories;
    }

    const accessoryCategoriesSet = new Set();
    const cableTypesSet = new Set();
    const prices = [];

    for (const a of accessories) {
      if (a.accessory_category) accessoryCategoriesSet.add(a.accessory_category);
      if (a.cable_type) cableTypesSet.add(a.cable_type);
      if (typeof a.price === 'number') prices.push(a.price);
    }

    const accessory_categories = Array.from(accessoryCategoriesSet).map(key => ({
      key,
      label: key
    }));

    const cable_types = Array.from(cableTypesSet).map(key => ({
      key,
      label: key
    }));

    const price_range_suggestions = [];
    if (prices.length) {
      const maxPrice = Math.max.apply(null, prices);
      const steps = [25, 50, 80, 100];
      for (const s of steps) {
        if (s <= maxPrice) {
          price_range_suggestions.push({ max_price: s, label: `Under $${s}` });
        }
      }
    }

    return {
      accessory_categories,
      cable_types,
      price_range_suggestions
    };
  }

  getBundleAccessoryOptions(baseProductId, filters) {
    const f = filters || {};
    const products = this._getFromStorage('products');
    const accessories = products.filter(p => p.product_type === 'accessory');

    let result = accessories;
    if (f.accessoryCategory) {
      result = result.filter(a => a.accessory_category === f.accessoryCategory);
    }
    if (f.cableType) {
      result = result.filter(a => a.cable_type === f.cableType);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter(a => typeof a.price === 'number' && a.price <= f.maxPrice);
    }

    const accessoriesOut = result.map(a => ({
      product_id: a.id,
      name: a.name,
      accessory_category: a.accessory_category || null,
      cable_type: a.cable_type || null,
      price: a.price,
      currency: a.currency || 'usd',
      image_url: a.image_url || '',
      thumbnail_url: a.thumbnail_url || a.image_url || '',
      is_eligible_for_bundle: !!a.is_bundle_eligible,
      max_quantity_per_bundle: 10,
      product: a
    }));

    return {
      base_product_id: baseProductId,
      accessories: accessoriesOut
    };
  }

  createOrUpdateBundleConfiguration(baseProductId, existingBundleId, items) {
    const products = this._getFromStorage('products');
    let bundles = this._getFromStorage('bundles');
    let bundleItems = this._getFromStorage('bundle_items');

    let bundle;
    if (existingBundleId) {
      bundle = bundles.find(b => b.id === existingBundleId) || null;
    }

    if (!bundle) {
      const newId = this._generateId('bundle');
      bundle = {
        id: newId,
        base_product_id: baseProductId,
        name: null,
        items: [],
        total_price: 0,
        created_at: new Date().toISOString()
      };
      bundles.push(bundle);
    } else {
      // Remove existing bundle_items for this bundle
      bundleItems = bundleItems.filter(bi => bi.bundle_id !== bundle.id);
      bundle.items = [];
    }

    let total_price = 0;
    const outputItems = [];

    for (const item of items || []) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) continue;
      const unit_price = prod.price || 0;
      const quantity = item.quantity || 1;
      const biId = this._generateId('bundle_item');
      const bundleItem = {
        id: biId,
        bundle_id: bundle.id,
        product_id: prod.id,
        item_type: item.itemType,
        quantity,
        unit_price
      };
      bundleItems.push(bundleItem);
      bundle.items.push(biId);
      total_price += unit_price * quantity;

      outputItems.push({
        bundle_item_id: biId,
        product_id: prod.id,
        name: prod.name,
        accessory_category: prod.accessory_category || null,
        item_type: item.itemType,
        quantity,
        unit_price,
        product: prod
      });
    }

    bundle.total_price = total_price;
    if (!bundle.name) {
      const baseProduct = products.find(p => p.id === baseProductId);
      bundle.name = baseProduct ? `${baseProduct.name} Custom Bundle` : 'Custom Bundle';
    }

    // Persist
    this._saveToStorage('bundles', bundles);
    this._saveToStorage('bundle_items', bundleItems);

    return {
      bundle_id: bundle.id,
      base_product_id: bundle.base_product_id,
      items: outputItems,
      total_price: bundle.total_price,
      currency: 'usd'
    };
  }

  getBundleConfigurationSummary(bundleId) {
    const bundles = this._getFromStorage('bundles');
    const bundleItems = this._getFromStorage('bundle_items');
    const products = this._getFromStorage('products');

    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return null;

    const items = [];
    for (const bi of bundleItems.filter(bi => bi.bundle_id === bundle.id)) {
      const prod = products.find(p => p.id === bi.product_id) || null;
      items.push({
        bundle_item_id: bi.id,
        product_id: bi.product_id,
        name: prod ? prod.name : null,
        item_type: bi.item_type,
        quantity: bi.quantity,
        unit_price: bi.unit_price,
        product: prod
      });
    }

    const baseProduct = products.find(p => p.id === bundle.base_product_id) || null;

    return {
      bundle_id: bundle.id,
      name: bundle.name,
      base_product_id: bundle.base_product_id,
      base_product_name: baseProduct ? baseProduct.name : null,
      items,
      total_price: bundle.total_price,
      currency: 'usd',
      bundle,
      base_product: baseProduct
    };
  }

  addBundleToCart(bundleId, quantity = 1) {
    const bundles = this._getFromStorage('bundles');
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) {
      return { success: false, cart: null, message: 'Bundle not found' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unit_price = bundle.total_price || 0;
    const qty = quantity || 1;

    const itemId = this._generateId('cart_item');
    const cartItem = {
      id: itemId,
      cart_id: cart.id,
      item_type: 'bundle',
      product_id: null,
      bundle_id: bundle.id,
      quantity: qty,
      unit_price,
      line_subtotal: unit_price * qty,
      fulfillment_type: 'shipping',
      store_id: null,
      selected_color: null,
      protection_plan_id: null,
      financing_selection_id: null,
      status: 'active'
    };

    cartItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(itemId);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      cart: cartResponse,
      message: 'Bundle added to cart'
    };
  }

  // -------------------- Reviews & Q&A --------------------

  getProductReviews(productId, sortKey = 'most_recent', page = 1, pageSize = 10) {
    const reviews = this._getFromStorage('reviews').filter(r => r.product_id === productId);
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;

    let sorted = reviews.slice();
    if (sortKey === 'highest_rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortKey === 'lowest_rating') {
      sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else {
      // most_recent
      sorted.sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      });
    }

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const paged = sorted.slice(start, start + pageSize).map(r => ({
      ...r,
      product
    }));

    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

    return {
      product_id: productId,
      average_rating: avgRating,
      review_count: reviews.length,
      sort_key: sortKey,
      reviews: paged,
      page,
      page_size: pageSize,
      product
    };
  }

  getProductReviewSortOptions() {
    return [
      { key: 'most_recent', label: 'Most recent', description: 'Newest reviews first' },
      { key: 'highest_rating', label: 'Highest rating', description: '5-star reviews first' },
      { key: 'lowest_rating', label: 'Lowest rating', description: '1-star reviews first' }
    ];
  }

  getProductQuestions(productId, status, page = 1, pageSize = 10) {
    const all = this._getFromStorage('product_questions');
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;

    let filtered = all.filter(q => q.product_id === productId);
    if (status) {
      filtered = filtered.filter(q => q.status === status);
    }

    filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize).map(q => ({
      ...q,
      product
    }));

    return {
      product_id: productId,
      questions: paged,
      total_results: total,
      page,
      page_size: pageSize,
      product
    };
  }

  submitProductQuestion(productId, questionText, email) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    const questions = this._getFromStorage('product_questions');

    const id = this._generateId('question');
    const now = new Date().toISOString();
    const question = {
      id,
      product_id: productId,
      question_text: questionText,
      email: email || null,
      answer_text: null,
      created_at: now,
      answered_at: null,
      status: 'submitted'
    };

    questions.push(question);
    this._saveToStorage('product_questions', questions);

    return {
      success: true,
      question: {
        ...question,
        product
      },
      message: 'Question submitted'
    };
  }

  // -------------------- Compare list --------------------

  addProductToCompare(productId) {
    const compare = this._getCurrentCompareList();
    if (!compare.product_ids.includes(productId)) {
      compare.product_ids.push(productId);
      compare.updated_at = new Date().toISOString();
      this._saveToStorage('compare_list', compare);
    }
    return {
      success: true,
      compare_list_id: compare.id,
      product_ids: compare.product_ids.slice(),
      compare_count: compare.product_ids.length,
      message: 'Product added to compare list'
    };
  }

  getCompareList() {
    const compare = this._getCurrentCompareList();
    const products = this._getFromStorage('products');

    const productsOut = compare.product_ids.map(id => {
      const p = products.find(pr => pr.id === id) || null;
      return p
        ? {
            product_id: p.id,
            name: p.name,
            price: p.price,
            currency: p.currency || 'usd',
            num_channels: p.num_channels || 0,
            mixer_type: p.mixer_type || null,
            has_built_in_fx: !!p.has_built_in_fx,
            has_bluetooth: !!p.has_bluetooth,
            has_usb_recording: !!p.has_usb_recording,
            weight_lbs: p.weight_lbs || null,
            average_rating: p.average_rating || 0,
            review_count: p.review_count || 0,
            category_name: null,
            thumbnail_url: p.thumbnail_url || p.image_url || '',
            product: p
          }
        : null;
    }).filter(Boolean);

    let cheapest_product_id = null;
    let minPrice = null;
    for (const p of productsOut) {
      if (typeof p.price === 'number' && (minPrice === null || p.price < minPrice)) {
        minPrice = p.price;
        cheapest_product_id = p.product_id;
      }
    }

    return {
      compare_list_id: compare.id,
      products: productsOut,
      cheapest_product_id
    };
  }

  removeProductFromCompare(productId) {
    const compare = this._getCurrentCompareList();
    compare.product_ids = compare.product_ids.filter(id => id !== productId);
    compare.updated_at = new Date().toISOString();
    this._saveToStorage('compare_list', compare);
    return {
      success: true,
      compare_list_id: compare.id,
      product_ids: compare.product_ids.slice()
    };
  }

  clearCompareList() {
    const compare = this._getCurrentCompareList();
    compare.product_ids = [];
    compare.updated_at = new Date().toISOString();
    this._saveToStorage('compare_list', compare);
    return { success: true };
  }

  // -------------------- Cart & cart items --------------------

  addProductToCart(
    productId,
    quantity = 1,
    fulfillmentType,
    storeId,
    selectedColor,
    protectionPlanId,
    financingSelectionId
  ) {
    const products = this._getFromStorage('products');
    const protectionPlans = this._getFromStorage('protection_plans');
    const financingSelections = this._getFromStorage('financing_selections');

    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return { success: false, cart: null, message: 'Product not found or inactive' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const qty = quantity || 1;
    const unit_price = product.price || 0;

    // Validate protection plan
    let planIdToUse = null;
    if (protectionPlanId) {
      const plan = protectionPlans.find(p => p.id === protectionPlanId);
      if (plan) {
        planIdToUse = protectionPlanId;
      }
    }

    // Validate financing selection
    let financingIdToUse = null;
    if (financingSelectionId) {
      const sel = financingSelections.find(f => f.id === financingSelectionId);
      if (sel && sel.product_id === productId && sel.applied) {
        financingIdToUse = financingSelectionId;
      }
    }

    const itemId = this._generateId('cart_item');
    const cartItem = {
      id: itemId,
      cart_id: cart.id,
      item_type: 'product',
      product_id: productId,
      bundle_id: null,
      quantity: qty,
      unit_price,
      line_subtotal: unit_price * qty,
      fulfillment_type: fulfillmentType || 'shipping',
      store_id: storeId || null,
      selected_color: selectedColor || null,
      protection_plan_id: planIdToUse,
      financing_selection_id: financingIdToUse,
      status: 'active'
    };

    cartItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(itemId);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      cart: cartResponse,
      message: 'Product added to cart'
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    return this._buildCartResponse(cart);
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null };
    }

    if (quantity <= 0) {
      item.status = 'removed';
    } else {
      item.quantity = quantity;
      item.line_subtotal = (item.unit_price || 0) * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    const cart = this._getObjectFromStorage('cart', null);
    if (cart && cart.id === item.cart_id) {
      this._recalculateCartTotals(cart);
      const updatedCart = this._buildCartResponse(cart);
      return {
        success: true,
        cart: {
          cart_id: updatedCart.cart_id,
          subtotal: updatedCart.subtotal,
          total: updatedCart.total,
          items: updatedCart.items.map(i => ({
            cart_item_id: i.cart_item_id,
            quantity: i.quantity,
            line_subtotal: i.line_subtotal
          }))
        }
      };
    }

    return { success: true, cart: null };
  }

  updateCartItemFulfillment(cartItemId, fulfillmentType, storeId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null };
    }

    item.fulfillment_type = fulfillmentType;
    item.store_id = storeId || null;

    this._saveToStorage('cart_items', cartItems);
    const cart = this._getObjectFromStorage('cart', null);
    if (cart && cart.id === item.cart_id) {
      this._recalculateCartTotals(cart);
      const cartResponse = this._buildCartResponse(cart);
      return {
        success: true,
        cart: cartResponse
      };
    }
    return { success: true, cart: null };
  }

  moveCartItemToSaveForLater(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null };
    }

    item.status = 'saved_for_later';
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getObjectFromStorage('cart', null);
    if (cart && cart.id === item.cart_id) {
      this._recalculateCartTotals(cart);
      const cartResponse = this._buildCartResponse(cart);
      return {
        success: true,
        cart: cartResponse
      };
    }

    return { success: true, cart: null };
  }

  moveCartItemToActive(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null };
    }

    item.status = 'active';
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getObjectFromStorage('cart', null);
    if (cart && cart.id === item.cart_id) {
      this._recalculateCartTotals(cart);
      const cartResponse = this._buildCartResponse(cart);
      return {
        success: true,
        cart: cartResponse
      };
    }

    return { success: true, cart: null };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null };
    }

    item.status = 'removed';
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getObjectFromStorage('cart', null);
    if (cart && cart.id === item.cart_id) {
      this._recalculateCartTotals(cart);
      const cartResponse = this._buildCartResponse(cart);
      return {
        success: true,
        cart: {
          cart_id: cartResponse.cart_id,
          subtotal: cartResponse.subtotal,
          total: cartResponse.total,
          items: cartResponse.items.map(i => ({ cart_item_id: i.cart_item_id }))
        }
      };
    }

    return { success: true, cart: null };
  }

  // -------------------- Content pages --------------------

  getAboutPageContent() {
    const content = this._getObjectFromStorage('about_page_content', {
      headline: '',
      body_html: '',
      mission_points: [],
      partnerships: [],
      trust_highlights: [],
      featured_categories: []
    });

    const categories = this._getFromStorage('categories');

    const featured_categories = (content.featured_categories || []).map(fc => {
      const cat = categories.find(c => c.id === fc.category_id) || null;
      return {
        ...fc,
        category: cat
      };
    });

    return {
      headline: content.headline,
      body_html: content.body_html,
      mission_points: content.mission_points || [],
      partnerships: content.partnerships || [],
      trust_highlights: content.trust_highlights || [],
      featured_categories
    };
  }

  getContactSupportInfo() {
    const content = this._getObjectFromStorage('contact_support_info', {
      support_email: '',
      support_phone: '',
      support_hours: '',
      contact_form_fields: [],
      support_links: []
    });
    return content;
  }

  getHelpFaqContent() {
    const content = this._getObjectFromStorage('help_faq_content', {
      faqs: [],
      quick_links: []
    });
    return content;
  }

  getShippingPickupInfo() {
    const content = this._getObjectFromStorage('shipping_pickup_info', {
      shipping_methods: [],
      pickup_instructions_html: '',
      pickup_examples: [],
      zip_example: '',
      related_categories: []
    });

    const categories = this._getFromStorage('categories');
    const related_categories = (content.related_categories || []).map(rc => {
      const cat = categories.find(c => c.id === rc.category_id) || null;
      return {
        ...rc,
        category: cat
      };
    });

    return {
      shipping_methods: content.shipping_methods || [],
      pickup_instructions_html: content.pickup_instructions_html || '',
      pickup_examples: content.pickup_examples || [],
      zip_example: content.zip_example || '',
      related_categories
    };
  }

  getWarrantyReturnsInfo() {
    const content = this._getObjectFromStorage('warranty_returns_info', {
      manufacturer_warranty_html: '',
      extended_plans_html: '',
      return_policy_html: '',
      example_three_year_plan_name: '',
      related_links: []
    });
    return content;
  }

  getFinancingAndPaymentInfo() {
    const baseContent = this._getObjectFromStorage('financing_payment_info', {
      financing_plans: [],
      example_scenarios: [],
      accepted_payment_methods: [],
      related_product_ctas: []
    });

    const financingPlans = this._getFromStorage('financing_plans');
    const financing_plans = financingPlans.map(plan => ({
      plan_id: plan.id,
      name: plan.name,
      term_months: plan.term_months,
      apr_percent: plan.apr_percent,
      min_purchase_amount: plan.min_purchase_amount,
      max_purchase_amount: plan.max_purchase_amount
    }));

    return {
      financing_plans,
      example_scenarios: baseContent.example_scenarios || [],
      accepted_payment_methods: baseContent.accepted_payment_methods || [],
      related_product_ctas: baseContent.related_product_ctas || []
    };
  }

  getPrivacyPolicyContent() {
    const content = this._getObjectFromStorage('privacy_policy_content', {
      sections: []
    });
    return content;
  }

  getTermsAndConditionsContent() {
    const content = this._getObjectFromStorage('terms_conditions_content', {
      sections: [],
      related_policies: []
    });
    return content;
  }

  // -------------------- Legacy skeleton methods (compatibility) --------------------

  // Simple wrapper around addProductToCart; userId is ignored because there is a single cart.
  addToCart(userId, productId, quantity = 1) {
    const result = this.addProductToCart(productId, quantity);
    return {
      success: result.success,
      cartId: result.cart ? result.cart.cart_id : null
    };
  }

  _findOrCreateCart(userId) {
    return this._getOrCreateCart();
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
