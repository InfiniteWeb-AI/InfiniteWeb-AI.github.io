// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // -------------------------
  // Storage helpers
  // -------------------------
  _initStorage() {
    // Core entity tables (arrays)
    const tables = [
      'users',
      'products',
      'cart',
      'cart_items',
      'home_security_packages',
      'home_security_package_items',
      'energy_bundles',
      'energy_bundle_items',
      'maintenance_plans',
      'maintenance_plan_configurations',
      'documentation_articles',
      'saved_resources',
      'product_comparisons',
      'quote_requests',
      'demo_bookings',
      'visitor_plans',
      'visitor_trial_signups',
      'checkout_sessions'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      // If parsing fails, reset to empty array to avoid breaking logic
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _ensureSampleCatalogData() {
    // Ensure that key device types used in higher-level flows exist in the catalog.
    let products = this._getFromStorage('products') || [];
    let changed = false;

    function hasProductWithRole(role) {
      return products.some(function (p) { return p.deviceRole === role; });
    }

    function hasSampleNvr() {
      return products.some(function (p) {
        return p.catalogCategory === 'nvrs' && p.channels === 16 && p.maxOutputResolution === '4k' && p.supports4k === true && (p.price || 0) < 900;
      });
    }

    const now = this._now();

    if (!hasProductWithRole('door_window_sensor')) {
      products.push({
        id: 'sample_door_sensor',
        name: 'Sample Door/Window Sensor',
        sku: 'SENSOR-DOOR-001',
        catalogCategory: 'sensors',
        usageLocation: 'indoor',
        deviceRole: 'door_window_sensor',
        price: 29.99,
        currency: 'usd',
        rating: 4.2,
        ratingCount: 10,
        channels: null,
        maxOutputResolution: null,
        resolutionLabel: null,
        supports4k: false,
        hasProgrammableSchedule: false,
        isSmartDevice: true,
        isOptionalExtra: false,
        description: 'Battery-powered door/window contact sensor.',
        features: [],
        imageUrl: '',
        isAvailable: true,
        createdAt: now,
        updatedAt: now
      });
      changed = true;
    }

    if (!hasProductWithRole('smart_lock')) {
      products.push({
        id: 'sample_smart_lock',
        name: 'Sample Smart Lock',
        sku: 'LOCK-SMART-001',
        catalogCategory: 'smart_locks',
        usageLocation: 'indoor',
        deviceRole: 'smart_lock',
        price: 199.99,
        currency: 'usd',
        rating: 4.4,
        ratingCount: 20,
        channels: null,
        maxOutputResolution: null,
        resolutionLabel: null,
        supports4k: false,
        hasProgrammableSchedule: false,
        isSmartDevice: true,
        isOptionalExtra: false,
        description: 'Connected deadbolt smart lock.',
        features: [],
        imageUrl: '',
        isAvailable: true,
        createdAt: now,
        updatedAt: now
      });
      changed = true;
    }

    if (!hasProductWithRole('thermostat')) {
      products.push({
        id: 'sample_thermostat',
        name: 'Sample Smart Thermostat',
        sku: 'THERMO-SMART-001',
        catalogCategory: 'thermostats',
        usageLocation: 'indoor',
        deviceRole: 'thermostat',
        price: 149.99,
        currency: 'usd',
        rating: 4.5,
        ratingCount: 50,
        channels: null,
        maxOutputResolution: null,
        resolutionLabel: null,
        supports4k: false,
        hasProgrammableSchedule: true,
        isSmartDevice: true,
        isOptionalExtra: false,
        description: 'Programmable Wi‑Fi thermostat.',
        features: [],
        imageUrl: '',
        isAvailable: true,
        createdAt: now,
        updatedAt: now
      });
      changed = true;
    }

    if (!hasProductWithRole('smart_light')) {
      products.push({
        id: 'sample_smart_light',
        name: 'Sample Smart Light',
        sku: 'LIGHT-SMART-001',
        catalogCategory: 'smart_lighting',
        usageLocation: 'indoor',
        deviceRole: 'smart_light',
        price: 39.99,
        currency: 'usd',
        rating: 4.1,
        ratingCount: 40,
        channels: null,
        maxOutputResolution: null,
        resolutionLabel: null,
        supports4k: false,
        hasProgrammableSchedule: false,
        isSmartDevice: true,
        isOptionalExtra: false,
        description: 'Dimmable smart light bulb.',
        features: [],
        imageUrl: '',
        isAvailable: true,
        createdAt: now,
        updatedAt: now
      });
      changed = true;
    }

    if (!hasSampleNvr()) {
      products.push({
        id: 'sample_nvr_16ch_4k',
        name: 'Sample 16 Channel 4K NVR',
        sku: 'NVR-16CH-4K-001',
        catalogCategory: 'nvrs',
        usageLocation: 'indoor',
        deviceRole: 'nvr',
        price: 799.99,
        currency: 'usd',
        rating: 4.0,
        ratingCount: 5,
        channels: 16,
        maxOutputResolution: '4k',
        resolutionLabel: '4K',
        supports4k: true,
        hasProgrammableSchedule: false,
        isSmartDevice: true,
        isOptionalExtra: false,
        description: '16 channel NVR with 4K output support.',
        features: ['16 channel NVR', '4K HDMI output'],
        imageUrl: '',
        isAvailable: true,
        createdAt: now,
        updatedAt: now
      });
      changed = true;
    }

    if (changed) {
      this._saveToStorage('products', products);
    }
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

  // -------------------------
  // Cart helpers
  // -------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = null;
    if (carts.length > 0) {
      // Use the most recently created cart
      carts.sort(function (a, b) {
        const da = a.createdAt || '';
        const db = b.createdAt || '';
        return da < db ? -1 : da > db ? 1 : 0;
      });
      cart = carts[carts.length - 1];
    } else {
      cart = {
        id: this._generateId('cart'),
        items: [],
        currency: 'usd',
        subtotal: 0,
        total: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('cart');
    const index = carts.findIndex(function (c) { return c.id === cart.id; });
    if (index >= 0) {
      carts[index] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage('cart_items');
    const itemsForCart = allItems.filter(function (ci) { return ci.cartId === cart.id; });
    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      subtotal += itemsForCart[i].lineTotal || 0;
    }
    cart.subtotal = subtotal;
    cart.total = subtotal;
    cart.items = itemsForCart.map(function (ci) { return ci.id; });
    cart.updatedAt = this._now();
    this._saveCart(cart);
    return cart;
  }

  _buildCartSummary(cart) {
    const products = this._getFromStorage('products');
    const homePackages = this._getFromStorage('home_security_packages');
    const energyBundles = this._getFromStorage('energy_bundles');
    const maintConfigs = this._getFromStorage('maintenance_plan_configurations');
    const visitorTrials = this._getFromStorage('visitor_trial_signups');
    const allItems = this._getFromStorage('cart_items');

    const itemsForCart = allItems.filter(function (ci) { return ci.cartId === cart.id; });

    const itemTypeLabels = {
      product: 'Product',
      home_security_package: 'Home Security Package',
      energy_bundle: 'Energy Bundle',
      maintenance_plan_configuration: 'Maintenance Plan',
      visitor_trial_signup: 'Visitor Management Trial'
    };

    const items = itemsForCart.map(function (ci) {
      const summaryItem = {
        cartItemId: ci.id,
        itemType: ci.itemType,
        name: ci.name,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineTotal: ci.lineTotal,
        itemTypeLabel: itemTypeLabels[ci.itemType] || ci.itemType
      };

      if (ci.productId) {
        summaryItem.product = products.find(function (p) { return p.id === ci.productId; }) || null;
      }
      if (ci.homeSecurityPackageId) {
        summaryItem.homeSecurityPackage = homePackages.find(function (p) { return p.id === ci.homeSecurityPackageId; }) || null;
      }
      if (ci.energyBundleId) {
        summaryItem.energyBundle = energyBundles.find(function (b) { return b.id === ci.energyBundleId; }) || null;
      }
      if (ci.maintenancePlanConfigId) {
        summaryItem.maintenancePlanConfiguration = maintConfigs.find(function (m) { return m.id === ci.maintenancePlanConfigId; }) || null;
      }
      if (ci.visitorTrialSignupId) {
        summaryItem.visitorTrialSignup = visitorTrials.find(function (v) { return v.id === ci.visitorTrialSignupId; }) || null;
      }

      return summaryItem;
    });

    return {
      cartId: cart.id,
      currency: cart.currency,
      items: items,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0
    };
  }

  // -------------------------
  // Configurator draft helpers
  // -------------------------

  _getOrCreateHomeSecurityConfiguratorDraft() {
    let raw = localStorage.getItem('home_security_configurator_draft');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to create new
      }
    }
    const draft = {
      id: this._generateId('hs_cfg'),
      propertyType: 'apartment',
      selectedItems: [],
      createdAt: this._now(),
      updatedAt: this._now()
    };
    localStorage.setItem('home_security_configurator_draft', JSON.stringify(draft));
    return draft;
  }

  _saveHomeSecurityConfiguratorDraft(draft) {
    draft.updatedAt = this._now();
    localStorage.setItem('home_security_configurator_draft', JSON.stringify(draft));
  }

  _getOrCreateEnergyBundleDraft() {
    let raw = localStorage.getItem('energy_bundle_draft');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // ignore and create new below
      }
    }
    const draft = {
      id: this._generateId('energy_cfg'),
      selectedItems: [],
      createdAt: this._now(),
      updatedAt: this._now()
    };
    localStorage.setItem('energy_bundle_draft', JSON.stringify(draft));
    return draft;
  }

  _saveEnergyBundleDraft(draft) {
    draft.updatedAt = this._now();
    localStorage.setItem('energy_bundle_draft', JSON.stringify(draft));
  }

  // -------------------------
  // Product comparison helpers
  // -------------------------

  _getCurrentProductComparisonSession() {
    let sessions = this._getFromStorage('product_comparisons');
    let session = null;
    if (sessions.length > 0) {
      session = sessions[0];
    } else {
      session = {
        id: this._generateId('pcmp'),
        productIds: [],
        createdAt: this._now()
      };
      sessions.push(session);
      this._saveToStorage('product_comparisons', sessions);
    }
    return session;
  }

  _saveProductComparisonSession(session) {
    let sessions = this._getFromStorage('product_comparisons');
    if (sessions.length === 0) {
      sessions.push(session);
    } else {
      sessions[0] = session;
    }
    this._saveToStorage('product_comparisons', sessions);
  }

  // -------------------------
  // Checkout helpers
  // -------------------------

  _createCheckoutSessionFromCart(cart) {
    const session = {
      id: this._generateId('chk'),
      cartId: cart.id,
      billingName: '',
      billingAddressLine1: '',
      billingAddressLine2: '',
      billingCity: '',
      billingState: '',
      billingPostalCode: '',
      billingCountry: '',
      contactEmail: '',
      contactPhone: '',
      createdAt: this._now()
    };
    const sessions = this._getFromStorage('checkout_sessions');
    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  _buildCheckoutSummary(session, cart) {
    const cartSummary = this._buildCartSummary(cart);
    return {
      cartId: cartSummary.cartId,
      items: cartSummary.items.map(function (item) {
        return {
          cartItemId: item.cartItemId,
          name: item.name,
          itemType: item.itemType,
          quantity: item.quantity,
          lineTotal: item.lineTotal
        };
      }),
      subtotal: cartSummary.subtotal,
      total: cartSummary.total,
      billingName: session.billingName,
      billingAddressLine1: session.billingAddressLine1,
      billingAddressLine2: session.billingAddressLine2,
      billingCity: session.billingCity,
      billingState: session.billingState,
      billingPostalCode: session.billingPostalCode,
      billingCountry: session.billingCountry,
      contactEmail: session.contactEmail,
      contactPhone: session.contactPhone
    };
  }

  _attachMaintenancePlanConfigToCart(configurationId) {
    const configs = this._getFromStorage('maintenance_plan_configurations');
    const plans = this._getFromStorage('maintenance_plans');
    const config = configs.find(function (c) { return c.id === configurationId; });
    if (!config) {
      return null;
    }
    const plan = plans.find(function (p) { return p.id === config.planId; }) || null;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    let existing = cartItems.find(function (ci) {
      return ci.cartId === cart.id && ci.itemType === 'maintenance_plan_configuration' && ci.maintenancePlanConfigId === configurationId;
    });
    const now = this._now();
    const name = plan ? plan.name : 'Maintenance Plan';
    const pricePerUnit = config.estimatedAnnualPrice || 0;

    if (existing) {
      existing.quantity = 1;
      existing.unitPrice = pricePerUnit;
      existing.lineTotal = pricePerUnit;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'maintenance_plan_configuration',
        productId: null,
        homeSecurityPackageId: null,
        energyBundleId: null,
        maintenancePlanConfigId: configurationId,
        visitorTrialSignupId: null,
        name: name,
        quantity: 1,
        unitPrice: pricePerUnit,
        lineTotal: pricePerUnit,
        addedAt: now
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    return { cart: cart, cartItem: existing };
  }

  _attachVisitorTrialToCart(visitorTrialSignupId) {
    const trials = this._getFromStorage('visitor_trial_signups');
    const trial = trials.find(function (t) { return t.id === visitorTrialSignupId; });
    if (!trial) {
      return null;
    }
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    let existing = cartItems.find(function (ci) {
      return ci.cartId === cart.id && ci.itemType === 'visitor_trial_signup' && ci.visitorTrialSignupId === visitorTrialSignupId;
    });
    const now = this._now();

    if (existing) {
      existing.quantity = 1;
      existing.unitPrice = 0;
      existing.lineTotal = 0;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'visitor_trial_signup',
        productId: null,
        homeSecurityPackageId: null,
        energyBundleId: null,
        maintenancePlanConfigId: null,
        visitorTrialSignupId: visitorTrialSignupId,
        name: 'Visitor Management Trial',
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        addedAt: now
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    return { cart: cart, cartItem: existing };
  }

  // -------------------------
  // 1) getHomepageContent
  // -------------------------

  getHomepageContent() {
    return {
      heroTitle: 'Secure, Automate, and Optimize Your Buildings',
      heroSubtitle: 'Integrated security, access control, video, and automation for homes and commercial properties.',
      solutionTiles: [
        {
          key: 'home_security',
          title: 'Home Security',
          description: 'Smart alarms, sensors, locks, and cameras for apartments, condos, and houses.'
        },
        {
          key: 'commercial_security',
          title: 'Commercial Security',
          description: 'Cameras, access control, and monitoring for offices and multi-site portfolios.'
        },
        {
          key: 'building_automation',
          title: 'Building Automation',
          description: 'Central dashboards for HVAC, lighting, and energy optimization.'
        }
      ],
      featuredSections: [
        {
          sectionKey: 'residential_security',
          title: 'Residential Security',
          summary: 'Protect doors, windows, and shared spaces with app-connected systems.'
        },
        {
          sectionKey: 'commercial_solutions',
          title: 'Commercial Solutions',
          summary: 'Scale from a single office to enterprise campuses with modular building blocks.'
        },
        {
          sectionKey: 'automation_energy',
          title: 'Automation & Energy',
          summary: 'Cut energy costs with intelligent thermostats, lighting, and occupancy-based automation.'
        }
      ]
    };
  }

  // -------------------------
  // 2) getProductFilterOptions
  // -------------------------

  getProductFilterOptions(context) {
    this._ensureSampleCatalogData();
    context = context || {};
    const catalogCategory = context.catalogCategory;
    const query = (context.query || '').toLowerCase();

    let products = this._getFromStorage('products');

    if (catalogCategory) {
      products = products.filter(function (p) { return p.catalogCategory === catalogCategory; });
    }
    if (query) {
      products = products.filter(function (p) {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
      });
    }

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < products.length; i++) {
      const price = products[i].price || 0;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    }

    const foundChannels = {};
    const channelOptions = [];
    for (let i = 0; i < products.length; i++) {
      const ch = products[i].channels;
      if (typeof ch === 'number' && !foundChannels[ch]) {
        foundChannels[ch] = true;
        channelOptions.push({ value: ch, label: ch + ' channels' });
      }
    }

    const seenRes = {};
    const resolutionOptions = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      let res = p.maxOutputResolution || null;
      if (res) {
        if (!seenRes[res]) {
          seenRes[res] = true;
          resolutionOptions.push({ value: res, label: res.toUpperCase() });
        }
      }
      const label = (p.resolutionLabel || '').toLowerCase();
      if (label) {
        const normalized = label.indexOf('1080') !== -1 ? '1080p'
          : label.indexOf('720') !== -1 ? '720p'
          : label.indexOf('4k') !== -1 ? '4k'
          : null;
        if (normalized && !seenRes[normalized]) {
          seenRes[normalized] = true;
          resolutionOptions.push({ value: normalized, label: normalized.toUpperCase() });
        }
      }
    }

    const seenUsage = {};
    const usageLocationOptions = [];
    for (let i = 0; i < products.length; i++) {
      const u = products[i].usageLocation;
      if (u && !seenUsage[u]) {
        seenUsage[u] = true;
        const label = u.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' / ');
        usageLocationOptions.push({ value: u, label: label });
      }
    }

    return {
      price: {
        min: minPrice || 0,
        max: maxPrice || 0,
        currency: 'usd'
      },
      ratingOptions: [
        { value: 4, label: '4 stars & up' },
        { value: 4.5, label: '4.5 stars & up' }
      ],
      channelOptions: channelOptions,
      resolutionOptions: resolutionOptions,
      usageLocationOptions: usageLocationOptions
    };
  }

  // -------------------------
  // 3) searchProducts
  // -------------------------

  searchProducts(query, filters, sort, page, pageSize) {
    this._ensureSampleCatalogData();
    query = (query || '').toLowerCase();
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let products = this._getFromStorage('products');

    if (query) {
      products = products.filter(function (p) {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
      });
    }

    if (filters.catalogCategory) {
      products = products.filter(function (p) { return p.catalogCategory === filters.catalogCategory; });
    }

    if (filters.usageLocation) {
      const target = filters.usageLocation;
      products = products.filter(function (p) {
        const loc = p.usageLocation;
        if (!loc) return false;
        if (target === 'indoor') {
          return loc === 'indoor' || loc === 'indoor_outdoor';
        }
        if (target === 'outdoor') {
          return loc === 'outdoor' || loc === 'indoor_outdoor';
        }
        return loc === target;
      });
    }

    if (typeof filters.channels === 'number') {
      products = products.filter(function (p) { return p.channels === filters.channels; });
    }

    if (filters.maxOutputResolution) {
      products = products.filter(function (p) { return p.maxOutputResolution === filters.maxOutputResolution; });
    }

    if (filters.resolutionLabel) {
      const resQuery = filters.resolutionLabel.toLowerCase();
      products = products.filter(function (p) {
        const label = (p.resolutionLabel || '').toLowerCase();
        return label.indexOf(resQuery) !== -1;
      });
    }

    if (typeof filters.minPrice === 'number') {
      products = products.filter(function (p) { return (p.price || 0) >= filters.minPrice; });
    }
    if (typeof filters.maxPrice === 'number') {
      products = products.filter(function (p) { return (p.price || 0) <= filters.maxPrice; });
    }

    if (typeof filters.minRating === 'number') {
      products = products.filter(function (p) {
        const r = typeof p.rating === 'number' ? p.rating : 0;
        return r >= filters.minRating;
      });
    }

    if (typeof filters.supports4k === 'boolean') {
      products = products.filter(function (p) {
        if (filters.supports4k) {
          return p.supports4k === true || p.maxOutputResolution === '4k';
        }
        return p.supports4k === false && p.maxOutputResolution !== '4k';
      });
    }

    if (sort === 'price_low_to_high') {
      products.sort(function (a, b) {
        return (a.price || 0) - (b.price || 0);
      });
    } else if (sort === 'price_high_to_low') {
      products.sort(function (a, b) {
        return (b.price || 0) - (a.price || 0);
      });
    } else if (sort === 'rating_high_to_low') {
      products.sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    }

    const totalCount = products.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = products.slice(start, end);

    // Instrumentation for task completion tracking
    try {
      // Task 2: 16‑channel 4K NVR search under $900 sorted by lowest price
      if (
        typeof query === 'string' &&
        query.indexOf('16 channel nvr') !== -1 &&
        typeof filters.channels === 'number' &&
        filters.channels === 16 &&
        (
          filters.maxOutputResolution === '4k' ||
          filters.supports4k === true
        ) &&
        typeof filters.maxPrice === 'number' &&
        filters.maxPrice <= 900 &&
        sort === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task2_nvrSearchParams',
          JSON.stringify({
            query,
            filters: { ...filters },
            sort,
            timestamp: this._now()
          })
        );
      }

      // Task 5: Indoor cameras under $120, rating >= 4, with 1080p resolution constraint
      const has1080ResolutionConstraint =
        (typeof filters.maxOutputResolution === 'string' &&
          filters.maxOutputResolution.toLowerCase().indexOf('1080') !== -1) ||
        (typeof filters.resolutionLabel === 'string' &&
          filters.resolutionLabel.toLowerCase().indexOf('1080') !== -1);

      if (
        filters.catalogCategory === 'cameras' &&
        filters.usageLocation === 'indoor' &&
        typeof filters.maxPrice === 'number' &&
        filters.maxPrice <= 120 &&
        typeof filters.minRating === 'number' &&
        filters.minRating >= 4 &&
        has1080ResolutionConstraint
      ) {
        localStorage.setItem(
          'task5_cameraFilterParams',
          JSON.stringify({
            query,
            filters: { ...filters },
            sort,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {
        // Swallow logging errors
      }
    }

    return {
      products: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      appliedFilters: {
        catalogCategory: filters.catalogCategory || null,
        usageLocation: filters.usageLocation || null,
        channels: typeof filters.channels === 'number' ? filters.channels : null,
        maxOutputResolution: filters.maxOutputResolution || null,
        resolutionLabel: filters.resolutionLabel || null,
        minPrice: typeof filters.minPrice === 'number' ? filters.minPrice : null,
        maxPrice: typeof filters.maxPrice === 'number' ? filters.maxPrice : null,
        minRating: typeof filters.minRating === 'number' ? filters.minRating : null,
        supports4k: typeof filters.supports4k === 'boolean' ? filters.supports4k : null
      },
      availableSortOptions: [
        { value: 'featured', label: 'Featured' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' }
      ]
    };
  }

  // -------------------------
  // 4) toggleProductComparison
  // -------------------------

  toggleProductComparison(productId) {
    const session = this._getCurrentProductComparisonSession();
    const idx = session.productIds.indexOf(productId);
    if (idx === -1) {
      session.productIds.push(productId);
    } else {
      session.productIds.splice(idx, 1);
    }
    this._saveProductComparisonSession(session);

    const allProducts = this._getFromStorage('products');
    const comparedProducts = allProducts.filter(function (p) {
      return session.productIds.indexOf(p.id) !== -1;
    });

    return {
      comparisonSession: session,
      comparedProducts: comparedProducts
    };
  }

  // -------------------------
  // 5) getCurrentProductComparison
  // -------------------------

  getCurrentProductComparison() {
    const session = this._getCurrentProductComparisonSession();
    const allProducts = this._getFromStorage('products');
    const products = allProducts.filter(function (p) {
      return session.productIds.indexOf(p.id) !== -1;
    });
    return {
      comparisonSession: session,
      products: products
    };
  }

  // -------------------------
  // 6) clearProductComparison
  // -------------------------

  clearProductComparison() {
    const session = this._getCurrentProductComparisonSession();
    session.productIds = [];
    this._saveProductComparisonSession(session);
    return { success: true };
  }

  // -------------------------
  // 7) getProductDetails
  // -------------------------

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;

    const categoryMap = {
      cameras: 'Cameras',
      nvrs: 'Network Video Recorders',
      sensors: 'Sensors',
      smart_locks: 'Smart Locks',
      thermostats: 'Thermostats',
      smart_lighting: 'Smart Lighting',
      packages: 'Packages',
      services: 'Services',
      other: 'Other'
    };

    const usageMap = {
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      indoor_outdoor: 'Indoor/Outdoor',
      not_applicable: 'Not applicable'
    };

    const roleMap = {
      camera: 'Camera',
      nvr: 'Network Video Recorder',
      door_window_sensor: 'Door/Window Sensor',
      smart_lock: 'Smart Lock',
      sirene: 'Sirene',
      thermostat: 'Thermostat',
      smart_light: 'Smart Light',
      optional_extra: 'Optional Extra',
      service_plan: 'Service Plan',
      other: 'Other'
    };

    const categoryLabel = product ? (categoryMap[product.catalogCategory] || 'Product') : '';
    const usageLocationLabel = product ? (usageMap[product.usageLocation] || '') : '';
    const deviceRoleLabel = product ? (roleMap[product.deviceRole] || '') : '';
    const featureList = product && Array.isArray(product.features) ? product.features.slice() : [];

    return {
      product: product,
      categoryLabel: categoryLabel,
      usageLocationLabel: usageLocationLabel,
      deviceRoleLabel: deviceRoleLabel,
      featureList: featureList
    };
  }

  // -------------------------
  // 8) getRelatedProducts
  // -------------------------

  getRelatedProducts(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) return [];

    const related = products.filter(function (p) {
      if (p.id === product.id) return false;
      return p.catalogCategory === product.catalogCategory;
    });

    related.sort(function (a, b) {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      return rb - ra;
    });

    return related.slice(0, 10);
  }

  // -------------------------
  // 9) addProductToCart
  // -------------------------

  addProductToCart(productId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }

    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product || product.isAvailable === false) {
      return { success: false, cartSummary: null, message: 'Product not available' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let existing = cartItems.find(function (ci) {
      return ci.cartId === cart.id && ci.itemType === 'product' && ci.productId === productId;
    });

    const now = this._now();
    if (existing) {
      existing.quantity += quantity;
      existing.unitPrice = product.price || 0;
      existing.lineTotal = existing.unitPrice * existing.quantity;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'product',
        productId: productId,
        homeSecurityPackageId: null,
        energyBundleId: null,
        maintenancePlanConfigId: null,
        visitorTrialSignupId: null,
        name: product.name,
        quantity: quantity,
        unitPrice: product.price || 0,
        lineTotal: (product.price || 0) * quantity,
        addedAt: now
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(cart);

    return {
      success: true,
      cartSummary: summary,
      message: 'Product added to cart'
    };
  }

  // -------------------------
  // 10) getCartSummary
  // -------------------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    return this._buildCartSummary(cart);
  }

  // -------------------------
  // 11) updateCartItemQuantity
  // -------------------------

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      this._recalculateCartTotals(cart);
      return { cartSummary: this._buildCartSummary(cart) };
    }

    const item = cartItems[idx];
    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.lineTotal = item.unitPrice * quantity;
    }
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    return { cartSummary: this._buildCartSummary(cart) };
  }

  // -------------------------
  // 12) removeCartItem
  // -------------------------

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx !== -1) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
    }
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    return { cartSummary: this._buildCartSummary(cart) };
  }

  // -------------------------
  // 13) startCheckoutFromCart
  // -------------------------

  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const session = this._createCheckoutSessionFromCart(cart);
    const summary = this._buildCheckoutSummary(session, cart);
    return {
      checkoutSessionId: session.id,
      summary: summary
    };
  }

  // -------------------------
  // 14) getCheckoutSummary
  // -------------------------

  getCheckoutSummary(checkoutSessionId) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find(function (s) { return s.id === checkoutSessionId; }) || null;
    if (!session) {
      return {
        checkoutSession: null,
        cartSummary: null
      };
    }
    const carts = this._getFromStorage('cart');
    const cart = carts.find(function (c) { return c.id === session.cartId; }) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartSummary = this._buildCartSummary(cart);
    const checkoutSessionWithCart = Object.assign({}, session, { cart: cart });
    return {
      checkoutSession: checkoutSessionWithCart,
      cartSummary: cartSummary
    };
  }

  // -------------------------
  // 15) updateCheckoutBillingDetails
  // -------------------------

  updateCheckoutBillingDetails(
    checkoutSessionId,
    billingName,
    billingAddressLine1,
    billingAddressLine2,
    billingCity,
    billingState,
    billingPostalCode,
    billingCountry,
    contactEmail,
    contactPhone
  ) {
    const sessions = this._getFromStorage('checkout_sessions');
    const idx = sessions.findIndex(function (s) { return s.id === checkoutSessionId; });
    if (idx === -1) {
      return { checkoutSession: null };
    }
    const session = sessions[idx];
    session.billingName = billingName;
    session.billingAddressLine1 = billingAddressLine1;
    session.billingAddressLine2 = billingAddressLine2 || '';
    session.billingCity = billingCity || '';
    session.billingState = billingState || '';
    session.billingPostalCode = billingPostalCode || '';
    session.billingCountry = billingCountry || '';
    session.contactEmail = contactEmail || '';
    session.contactPhone = contactPhone || '';

    sessions[idx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return { checkoutSession: session };
  }

  // -------------------------
  // 16) finalizeCheckout
  // -------------------------

  finalizeCheckout(checkoutSessionId) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find(function (s) { return s.id === checkoutSessionId; }) || null;
    if (!session) {
      return {
        success: false,
        orderReference: null,
        message: 'Checkout session not found'
      };
    }
    const orderReference = 'ORD-' + checkoutSessionId;
    return {
      success: true,
      orderReference: orderReference,
      message: 'Checkout finalized (simulation only)'
    };
  }

  // -------------------------
  // 17) getHomeSecurityOverview
  // -------------------------

  getHomeSecurityOverview() {
    return {
      introTitle: 'Smart Home Security for Any Property',
      introBody: 'Combine sensors, locks, and cameras into one app-connected system designed for apartments, condos, and houses.',
      keyBenefits: [
        'Protect doors, windows, and common areas with smart sensors',
        'Remotely lock and unlock doors for guests and deliveries',
        'Expand easily with cameras, sirens, and optional extras'
      ],
      exampleBundles: [
        {
          name: 'Apartment Starter',
          propertyType: 'apartment',
          startingPrice: 199,
          currency: 'usd',
          highlightDevices: ['Door/Window Sensors', 'Smart Lock']
        },
        {
          name: 'Family Home',
          propertyType: 'house',
          startingPrice: 399,
          currency: 'usd',
          highlightDevices: ['Control Panel', 'Sensors', 'Indoor/Outdoor Cameras']
        }
      ]
    };
  }

  // -------------------------
  // 18) getHomeSecurityConfiguratorState
  // -------------------------

  getHomeSecurityConfiguratorState() {
    this._ensureSampleCatalogData();
    const draft = this._getOrCreateHomeSecurityConfiguratorDraft();
    const products = this._getFromStorage('products');

    const doorWindowSensors = products.filter(function (p) {
      return p.deviceRole === 'door_window_sensor' && p.isAvailable !== false;
    });
    const smartLocks = products.filter(function (p) {
      return p.deviceRole === 'smart_lock' && p.isAvailable !== false;
    });
    const cameras = products.filter(function (p) {
      return p.deviceRole === 'camera' && p.isAvailable !== false;
    });
    const sirens = products.filter(function (p) {
      return p.deviceRole === 'sirene' && p.isAvailable !== false;
    });
    const optionalExtras = products.filter(function (p) {
      return (p.deviceRole === 'optional_extra' || p.isOptionalExtra === true) && p.isAvailable !== false;
    });

    const selectedItems = [];
    let totalDoorWindowSensors = 0;
    let totalSmartLocks = 0;
    let totalCameras = 0;
    let totalSirens = 0;
    let totalOptionalExtras = 0;
    let totalPrice = 0;

    for (let i = 0; i < draft.selectedItems.length; i++) {
      const sel = draft.selectedItems[i];
      const product = products.find(function (p) { return p.id === sel.productId; }) || null;
      const quantity = sel.quantity || 0;
      const unitPrice = product && product.price ? product.price : 0;
      const lineTotal = unitPrice * quantity;
      totalPrice += lineTotal;

      if (sel.role === 'door_window_sensor') totalDoorWindowSensors += quantity;
      else if (sel.role === 'smart_lock') totalSmartLocks += quantity;
      else if (sel.role === 'camera') totalCameras += quantity;
      else if (sel.role === 'sirene') totalSirens += quantity;
      else if (sel.role === 'optional_extra') totalOptionalExtras += quantity;

      selectedItems.push({
        product: product,
        role: sel.role,
        quantity: quantity,
        lineTotal: lineTotal
      });
    }

    return {
      propertyType: draft.propertyType,
      availableDevices: {
        doorWindowSensors: doorWindowSensors,
        smartLocks: smartLocks,
        cameras: cameras,
        sirens: sirens,
        optionalExtras: optionalExtras
      },
      selectedItems: selectedItems,
      summary: {
        totalDoorWindowSensors: totalDoorWindowSensors,
        totalSmartLocks: totalSmartLocks,
        totalCameras: totalCameras,
        totalSirens: totalSirens,
        totalOptionalExtras: totalOptionalExtras,
        totalPrice: totalPrice,
        currency: 'usd'
      }
    };
  }

  // -------------------------
  // 19) setHomeSecurityPropertyType
  // -------------------------

  setHomeSecurityPropertyType(propertyType) {
    const draft = this._getOrCreateHomeSecurityConfiguratorDraft();
    draft.propertyType = propertyType;
    this._saveHomeSecurityConfiguratorDraft(draft);
    const state = this.getHomeSecurityConfiguratorState();
    return {
      configuratorState: {
        propertyType: state.propertyType,
        summary: state.summary
      }
    };
  }

  // -------------------------
  // 20) updateHomeSecurityDeviceQuantity
  // -------------------------

  updateHomeSecurityDeviceQuantity(deviceRole, productId, quantity) {
    const draft = this._getOrCreateHomeSecurityConfiguratorDraft();
    let items = draft.selectedItems || [];
    const idx = items.findIndex(function (sel) {
      return sel.productId === productId && sel.role === deviceRole;
    });

    if (quantity <= 0) {
      if (idx !== -1) {
        items.splice(idx, 1);
      }
    } else {
      if (idx !== -1) {
        items[idx].quantity = quantity;
      } else {
        items.push({ productId: productId, role: deviceRole, quantity: quantity });
      }
    }
    draft.selectedItems = items;
    this._saveHomeSecurityConfiguratorDraft(draft);

    const state = this.getHomeSecurityConfiguratorState();
    return {
      configuratorState: {
        selectedItems: state.selectedItems,
        summary: state.summary
      }
    };
  }

  // -------------------------
  // 21) finalizeHomeSecurityPackageAndAddToCart
  // -------------------------

  finalizeHomeSecurityPackageAndAddToCart(packageName) {
    const state = this.getHomeSecurityConfiguratorState();
    const draft = this._getOrCreateHomeSecurityConfiguratorDraft();
    const products = this._getFromStorage('products');

    const pkg = {
      id: this._generateId('hspkg'),
      name: packageName || 'Custom Home Security Package',
      propertyType: draft.propertyType || 'apartment',
      totalPrice: state.summary.totalPrice || 0,
      currency: 'usd',
      totalDoorWindowSensors: state.summary.totalDoorWindowSensors || 0,
      totalSmartLocks: state.summary.totalSmartLocks || 0,
      totalCameras: state.summary.totalCameras || 0,
      totalSirens: state.summary.totalSirens || 0,
      totalOptionalExtras: state.summary.totalOptionalExtras || 0,
      createdAt: this._now()
    };

    const packages = this._getFromStorage('home_security_packages');
    packages.push(pkg);
    this._saveToStorage('home_security_packages', packages);

    let pkgItems = this._getFromStorage('home_security_package_items');
    for (let i = 0; i < draft.selectedItems.length; i++) {
      const sel = draft.selectedItems[i];
      const product = products.find(function (p) { return p.id === sel.productId; }) || null;
      const unitPrice = product && product.price ? product.price : 0;
      const lineTotal = unitPrice * (sel.quantity || 0);
      const item = {
        id: this._generateId('hspkg_item'),
        packageId: pkg.id,
        productId: sel.productId,
        role: sel.role,
        quantity: sel.quantity || 0,
        unitPrice: unitPrice,
        lineTotal: lineTotal
      };
      pkgItems.push(item);
    }
    this._saveToStorage('home_security_package_items', pkgItems);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const now = this._now();
    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'home_security_package',
      productId: null,
      homeSecurityPackageId: pkg.id,
      energyBundleId: null,
      maintenancePlanConfigId: null,
      visitorTrialSignupId: null,
      name: pkg.name,
      quantity: 1,
      unitPrice: pkg.totalPrice,
      lineTotal: pkg.totalPrice,
      addedAt: now
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartSummary = this._buildCartSummary(cart);
    return {
      homeSecurityPackage: pkg,
      cartSummary: cartSummary
    };
  }

  // -------------------------
  // 22) getCommercialSecurityOverview
  // -------------------------

  getCommercialSecurityOverview() {
    return {
      introTitle: 'Commercial & Office Security',
      introBody: 'Design camera, access control, and alarm systems for single offices or multi-floor buildings.',
      keyCapabilities: [
        'Multi-floor camera coverage with centralized recording',
        'Card and mobile credential access control for key doors',
        'Remote monitoring, alerts, and health diagnostics'
      ],
      callToActionLabel: 'Request a Quote'
    };
  }

  // -------------------------
  // 23) getQuoteFormDefaults
  // -------------------------

  getQuoteFormDefaults(solutionType) {
    return {
      preferredContactMethods: [
        { value: 'phone', label: 'Phone' },
        { value: 'email', label: 'Email' }
      ],
      defaults: {
        numFloors: 1,
        numCameras: 8,
        numDoors: 2
      }
    };
  }

  // -------------------------
  // 24) submitQuoteRequest
  // -------------------------

  submitQuoteRequest(
    solutionType,
    numFloors,
    numCameras,
    numDoors,
    contactName,
    contactEmail,
    contactPhone,
    preferredContactMethod,
    projectDetails
  ) {
    const quote = {
      id: this._generateId('quote'),
      solutionType: solutionType,
      numFloors: numFloors,
      numCameras: numCameras,
      numDoors: numDoors,
      contactName: contactName,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      preferredContactMethod: preferredContactMethod,
      projectDetails: projectDetails || '',
      submittedAt: this._now(),
      status: 'submitted'
    };

    const quotes = this._getFromStorage('quote_requests');
    quotes.push(quote);
    this._saveToStorage('quote_requests', quotes);

    return {
      quoteRequest: quote,
      message: 'Quote request submitted'
    };
  }

  // -------------------------
  // 25) getBuildingAutomationOverview
  // -------------------------

  getBuildingAutomationOverview() {
    return {
      introTitle: 'Building Automation & Control',
      introBody: 'Unify HVAC, lighting, and security data into one automation dashboard for your building.',
      keyCapabilities: [
        'Real-time monitoring of critical systems',
        'Rule-based automation for comfort and savings',
        'Integration via BACnet, Modbus, and REST APIs'
      ],
      demoCallToActionLabel: 'Book a Live Demo'
    };
  }

  // -------------------------
  // 26) getDemoBookingFormDefaults
  // -------------------------

  getDemoBookingFormDefaults() {
    return {
      buildingTypeOptions: [
        { value: 'office_building', label: 'Office Building' },
        { value: 'industrial_facility', label: 'Industrial Facility' },
        { value: 'residential_complex', label: 'Residential Complex' },
        { value: 'other', label: 'Other' }
      ],
      demoFormatOptions: [
        { value: 'video_call', label: 'Video Call' },
        { value: 'in_person', label: 'In-Person Meeting' },
        { value: 'phone_call', label: 'Phone Call' }
      ]
    };
  }

  // -------------------------
  // 27) submitDemoBooking
  // -------------------------

  submitDemoBooking(
    buildingType,
    demoDate,
    demoTimeSlot,
    contactName,
    contactEmail,
    demoFormat
  ) {
    const demoDateIso = new Date(demoDate).toISOString();
    const booking = {
      id: this._generateId('demo'),
      solutionType: 'building_automation',
      buildingType: buildingType,
      demoDate: demoDateIso,
      demoTimeSlot: demoTimeSlot,
      contactName: contactName,
      contactEmail: contactEmail,
      demoFormat: demoFormat,
      submittedAt: this._now(),
      status: 'requested'
    };

    const bookings = this._getFromStorage('demo_bookings');
    bookings.push(booking);
    this._saveToStorage('demo_bookings', bookings);

    return {
      demoBooking: booking,
      message: 'Demo booking requested'
    };
  }

  // -------------------------
  // 28) getEnergyManagementOverview
  // -------------------------

  getEnergyManagementOverview() {
    return {
      introTitle: 'Energy Management & Automation',
      introBody: 'Reduce energy use with connected thermostats, smart lighting, and automation rules.',
      keyBenefits: [
        'Programmable and adaptive thermostat schedules',
        'Lighting automation based on occupancy and schedules',
        'Analytics to track savings across locations'
      ]
    };
  }

  // -------------------------
  // 29) getEnergyBundleTemplates
  // -------------------------

  getEnergyBundleTemplates() {
    return [
      {
        name: 'Small Office Saver',
        description: 'Ideal for a small office with basic HVAC and lighting control.',
        approxTotalPrice: 550,
        currency: 'usd',
        thermostatCount: 2,
        smartLightCount: 4
      },
      {
        name: 'Retail Front Energy Pack',
        description: 'Optimize a storefront or retail unit with lighting schedules and comfort control.',
        approxTotalPrice: 750,
        currency: 'usd',
        thermostatCount: 2,
        smartLightCount: 6
      }
    ];
  }

  // -------------------------
  // 30) getEnergyBundleBuilderState
  // -------------------------

  getEnergyBundleBuilderState() {
    this._ensureSampleCatalogData();
    const draft = this._getOrCreateEnergyBundleDraft();
    const products = this._getFromStorage('products');

    const availableThermostats = products.filter(function (p) {
      return p.deviceRole === 'thermostat' && p.isAvailable !== false;
    });
    const availableSmartLights = products.filter(function (p) {
      return p.deviceRole === 'smart_light' && p.isAvailable !== false;
    });
    const otherAvailableDevices = products.filter(function (p) {
      return p.deviceRole !== 'thermostat' && p.deviceRole !== 'smart_light' && p.isAvailable !== false;
    });

    let totalThermostats = 0;
    let totalSmartLights = 0;
    let totalPrice = 0;
    const selectedItems = [];

    for (let i = 0; i < draft.selectedItems.length; i++) {
      const sel = draft.selectedItems[i];
      const product = products.find(function (p) { return p.id === sel.productId; }) || null;
      const quantity = sel.quantity || 0;
      const unitPrice = product && product.price ? product.price : 0;
      const lineTotal = unitPrice * quantity;
      totalPrice += lineTotal;
      if (sel.role === 'thermostat') totalThermostats += quantity;
      if (sel.role === 'smart_light') totalSmartLights += quantity;
      selectedItems.push({
        product: product,
        role: sel.role,
        quantity: quantity,
        lineTotal: lineTotal
      });
    }

    return {
      availableThermostats: availableThermostats,
      availableSmartLights: availableSmartLights,
      otherAvailableDevices: otherAvailableDevices,
      selectedItems: selectedItems,
      summary: {
        totalThermostats: totalThermostats,
        totalSmartLights: totalSmartLights,
        totalPrice: totalPrice,
        currency: 'usd'
      }
    };
  }

  // -------------------------
  // 31) setEnergyBundleThermostatSelection
  // -------------------------

  setEnergyBundleThermostatSelection(productId, quantity) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product || product.deviceRole !== 'thermostat' || product.hasProgrammableSchedule !== true) {
      // Invalid thermostat selection; return current state unchanged
      return { builderState: this.getEnergyBundleBuilderState() };
    }

    const draft = this._getOrCreateEnergyBundleDraft();
    let items = draft.selectedItems || [];
    const idx = items.findIndex(function (sel) {
      return sel.productId === productId && sel.role === 'thermostat';
    });

    if (quantity <= 0) {
      if (idx !== -1) items.splice(idx, 1);
    } else {
      if (idx !== -1) {
        items[idx].quantity = quantity;
      } else {
        items.push({ productId: productId, role: 'thermostat', quantity: quantity });
      }
    }
    draft.selectedItems = items;
    this._saveEnergyBundleDraft(draft);

    const state = this.getEnergyBundleBuilderState();
    return { builderState: { summary: state.summary } };
  }

  // -------------------------
  // 32) setEnergyBundleSmartLightSelection
  // -------------------------

  setEnergyBundleSmartLightSelection(productId, quantity) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product || product.deviceRole !== 'smart_light') {
      return { builderState: this.getEnergyBundleBuilderState() };
    }

    const draft = this._getOrCreateEnergyBundleDraft();
    let items = draft.selectedItems || [];
    const idx = items.findIndex(function (sel) {
      return sel.productId === productId && sel.role === 'smart_light';
    });

    if (quantity <= 0) {
      if (idx !== -1) items.splice(idx, 1);
    } else {
      if (idx !== -1) {
        items[idx].quantity = quantity;
      } else {
        items.push({ productId: productId, role: 'smart_light', quantity: quantity });
      }
    }
    draft.selectedItems = items;
    this._saveEnergyBundleDraft(draft);

    const state = this.getEnergyBundleBuilderState();
    return { builderState: { summary: state.summary } };
  }

  // -------------------------
  // 33) clearEnergyBundleOtherDevices
  // -------------------------

  clearEnergyBundleOtherDevices() {
    const draft = this._getOrCreateEnergyBundleDraft();
    draft.selectedItems = (draft.selectedItems || []).filter(function (sel) {
      return sel.role === 'thermostat' || sel.role === 'smart_light';
    });
    this._saveEnergyBundleDraft(draft);
    const state = this.getEnergyBundleBuilderState();
    return {
      builderState: {
        selectedItems: state.selectedItems,
        summary: state.summary
      }
    };
  }

  // -------------------------
  // 34) finalizeEnergyBundleAndAddToCart
  // -------------------------

  finalizeEnergyBundleAndAddToCart(bundleName) {
    const state = this.getEnergyBundleBuilderState();
    const draft = this._getOrCreateEnergyBundleDraft();
    const products = this._getFromStorage('products');

    const bundle = {
      id: this._generateId('enbundle'),
      name: bundleName || 'Custom Energy Bundle',
      totalPrice: state.summary.totalPrice || 0,
      currency: 'usd',
      totalThermostats: state.summary.totalThermostats || 0,
      totalSmartLights: state.summary.totalSmartLights || 0,
      createdAt: this._now()
    };

    const bundles = this._getFromStorage('energy_bundles');
    bundles.push(bundle);
    this._saveToStorage('energy_bundles', bundles);

    let bundleItems = this._getFromStorage('energy_bundle_items');
    for (let i = 0; i < draft.selectedItems.length; i++) {
      const sel = draft.selectedItems[i];
      const product = products.find(function (p) { return p.id === sel.productId; }) || null;
      const unitPrice = product && product.price ? product.price : 0;
      const lineTotal = unitPrice * (sel.quantity || 0);
      const role = sel.role === 'thermostat' ? 'thermostat'
        : sel.role === 'smart_light' ? 'smart_light'
        : 'other_device';
      const item = {
        id: this._generateId('enbundle_item'),
        bundleId: bundle.id,
        productId: sel.productId,
        role: role,
        quantity: sel.quantity || 0,
        unitPrice: unitPrice,
        lineTotal: lineTotal
      };
      bundleItems.push(item);
    }
    this._saveToStorage('energy_bundle_items', bundleItems);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const now = this._now();
    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'energy_bundle',
      productId: null,
      homeSecurityPackageId: null,
      energyBundleId: bundle.id,
      maintenancePlanConfigId: null,
      visitorTrialSignupId: null,
      name: bundle.name,
      quantity: 1,
      unitPrice: bundle.totalPrice,
      lineTotal: bundle.totalPrice,
      addedAt: now
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const cartSummary = this._buildCartSummary(cart);

    return {
      energyBundle: bundle,
      cartSummary: cartSummary
    };
  }

  // -------------------------
  // 35) getMaintenancePlanFilterOptions
  // -------------------------

  getMaintenancePlanFilterOptions() {
    return {
      buildingTypeOptions: [
        { value: 'commercial', label: 'Commercial' },
        { value: 'residential', label: 'Residential' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'mixed_use', label: 'Mixed Use' }
      ]
    };
  }

  // -------------------------
  // 36) getMaintenancePlans
  // -------------------------

  getMaintenancePlans(buildingType) {
    let plans = this._getFromStorage('maintenance_plans');
    plans = plans.filter(function (p) { return p.isActive !== false; });
    if (buildingType) {
      plans = plans.filter(function (p) { return p.buildingType === buildingType; });
    }
    return plans;
  }

  // -------------------------
  // 37) startMaintenancePlanConfiguration
  // -------------------------

  startMaintenancePlanConfiguration(planId) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find(function (p) { return p.id === planId; }) || null;
    if (!plan) {
      return { configuration: null };
    }
    const annualBase = typeof plan.annualPrice === 'number'
      ? plan.annualPrice
      : (typeof plan.monthlyPrice === 'number' ? plan.monthlyPrice * 12 : 0);

    const configuration = {
      id: this._generateId('mpcfg'),
      planId: planId,
      billingFrequency: 'annual',
      buildingType: plan.buildingType,
      buildingSizeRange: '10000_20000_sq_ft',
      locationsCount: 1,
      estimatedAnnualPrice: annualBase,
      currency: plan.currency || 'usd',
      createdAt: this._now()
    };

    const configs = this._getFromStorage('maintenance_plan_configurations');
    configs.push(configuration);
    this._saveToStorage('maintenance_plan_configurations', configs);

    const configWithPlan = Object.assign({}, configuration, { plan: plan });
    return { configuration: configWithPlan };
  }

  // -------------------------
  // 38) getMaintenancePlanConfiguration
  // -------------------------

  getMaintenancePlanConfiguration(configurationId) {
    const configs = this._getFromStorage('maintenance_plan_configurations');
    const configuration = configs.find(function (c) { return c.id === configurationId; }) || null;
    if (!configuration) {
      return { configuration: null, plan: null };
    }
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find(function (p) { return p.id === configuration.planId; }) || null;
    const configWithPlan = Object.assign({}, configuration, { plan: plan });
    return {
      configuration: configWithPlan,
      plan: plan
    };
  }

  // -------------------------
  // 39) updateMaintenancePlanConfiguration
  // -------------------------

  updateMaintenancePlanConfiguration(configurationId, billingFrequency, buildingSizeRange, locationsCount) {
    const configs = this._getFromStorage('maintenance_plan_configurations');
    const idx = configs.findIndex(function (c) { return c.id === configurationId; });
    if (idx === -1) {
      return { configuration: null };
    }
    const configuration = configs[idx];
    configuration.billingFrequency = billingFrequency;
    configuration.buildingSizeRange = buildingSizeRange;
    configuration.locationsCount = locationsCount;

    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find(function (p) { return p.id === configuration.planId; }) || null;
    const annualBase = plan
      ? (typeof plan.annualPrice === 'number'
        ? plan.annualPrice
        : (typeof plan.monthlyPrice === 'number' ? plan.monthlyPrice * 12 : 0))
      : 0;

    const factor = billingFrequency === 'annual' ? 1 : 1; // estimatedAnnualPrice always yearly
    configuration.estimatedAnnualPrice = annualBase * locationsCount * factor;

    configs[idx] = configuration;
    this._saveToStorage('maintenance_plan_configurations', configs);

    return { configuration: configuration };
  }

  // -------------------------
  // 40) startCheckoutFromMaintenancePlanConfiguration
  // -------------------------

  startCheckoutFromMaintenancePlanConfiguration(configurationId) {
    const attachResult = this._attachMaintenancePlanConfigToCart(configurationId);
    if (!attachResult) {
      return {
        checkoutSessionId: null,
        summary: null
      };
    }
    const cart = attachResult.cart;
    this._recalculateCartTotals(cart);
    const session = this._createCheckoutSessionFromCart(cart);
    const summary = this._buildCheckoutSummary(session, cart);
    return {
      checkoutSessionId: session.id,
      summary: summary
    };
  }

  // -------------------------
  // 41) searchDocumentationArticles
  // -------------------------

  searchDocumentationArticles(query) {
    query = (query || '').toLowerCase();
    let articles = this._getFromStorage('documentation_articles');
    articles = articles.filter(function (a) { return a.isPublished !== false; });
    if (query) {
      articles = articles.filter(function (a) {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return title.indexOf(query) !== -1 || summary.indexOf(query) !== -1 || content.indexOf(query) !== -1 || tags.indexOf(query) !== -1;
      });
    }
    return {
      articles: articles,
      totalCount: articles.length
    };
  }

  // -------------------------
  // 42) getDocumentationArticle
  // -------------------------

  getDocumentationArticle(articleId) {
    const articles = this._getFromStorage('documentation_articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    return article;
  }

  // -------------------------
  // 43) saveDocumentationArticle
  // -------------------------

  saveDocumentationArticle(articleId) {
    const articles = this._getFromStorage('documentation_articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      return {
        savedResource: null,
        totalSavedCount: this._getFromStorage('saved_resources').length
      };
    }

    let savedResources = this._getFromStorage('saved_resources');
    const exists = savedResources.some(function (sr) { return sr.articleId === articleId; });
    if (!exists) {
      const saved = {
        id: this._generateId('saved'),
        articleId: articleId,
        savedAt: this._now()
      };
      savedResources.push(saved);
      this._saveToStorage('saved_resources', savedResources);
      return {
        savedResource: saved,
        totalSavedCount: savedResources.length
      };
    } else {
      // Already saved; return existing one for convenience
      const saved = savedResources.find(function (sr) { return sr.articleId === articleId; });
      return {
        savedResource: saved,
        totalSavedCount: savedResources.length
      };
    }
  }

  // -------------------------
  // 44) getSavedResources
  // -------------------------

  getSavedResources() {
    const savedResources = this._getFromStorage('saved_resources');
    const articles = this._getFromStorage('documentation_articles');
    return savedResources.map(function (sr) {
      const article = articles.find(function (a) { return a.id === sr.articleId; }) || null;
      return {
        savedResource: sr,
        article: article
      };
    });
  }

  // -------------------------
  // 45) getVisitorManagementOverview
  // -------------------------

  getVisitorManagementOverview() {
    return {
      introTitle: 'Visitor Management & Lobby Kiosks',
      introBody: 'Digitize check-in, badge printing, and visitor logs with secure lobby kiosks and dashboards.',
      keyCapabilities: [
        'Touchless or staffed visitor check-in',
        'ID scanning and watchlist checks',
        'Real-time visitor logs and analytics'
      ]
    };
  }

  // -------------------------
  // 46) getVisitorPlans
  // -------------------------

  getVisitorPlans() {
    let plans = this._getFromStorage('visitor_plans');
    plans = plans.filter(function (p) { return p.isActive !== false; });
    return plans;
  }

  // -------------------------
  // 47) getVisitorPlanDetails
  // -------------------------

  getVisitorPlanDetails(planId) {
    const plans = this._getFromStorage('visitor_plans');
    const plan = plans.find(function (p) { return p.id === planId; }) || null;
    return plan;
  }

  // -------------------------
  // 48) submitVisitorTrialSignup
  // -------------------------

  submitVisitorTrialSignup(
    planId,
    organizationName,
    orgSizeRange,
    contactEmail,
    contactPhone,
    expectedDailyVisitors
  ) {
    const plans = this._getFromStorage('visitor_plans');
    const plan = plans.find(function (p) { return p.id === planId; }) || null;
    if (!plan) {
      return {
        visitorTrialSignup: null,
        message: 'Visitor plan not found'
      };
    }

    const trial = {
      id: this._generateId('vtrial'),
      planId: planId,
      organizationName: organizationName,
      orgSizeRange: orgSizeRange,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      expectedDailyVisitors: expectedDailyVisitors,
      createdAt: this._now()
    };

    const trials = this._getFromStorage('visitor_trial_signups');
    trials.push(trial);
    this._saveToStorage('visitor_trial_signups', trials);

    // Optionally track in cart (no cost)
    this._attachVisitorTrialToCart(trial.id);

    return {
      visitorTrialSignup: trial,
      message: 'Visitor management trial started'
    };
  }

  // -------------------------
  // Legacy example method from skeleton (not used by interfaces)
  // -------------------------

  addToCart(userId, productId, quantity) {
    // Redirect to addProductToCart for compatibility
    return this.addProductToCart(productId, quantity || 1);
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