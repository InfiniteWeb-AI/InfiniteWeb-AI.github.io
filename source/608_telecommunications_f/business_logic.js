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
  }

  // ==========================
  // Initialization & Utilities
  // ==========================

  _initStorage() {
    const keys = [
      // generic/example keys
      'users',
      // domain entities
      'service_areas',
      'internet_plans',
      'tv_packages',
      'phone_plans',
      'bundle_templates',
      'bundle_configurations',
      'business_quote_requests',
      'addresses',
      'installation_time_slots',
      'installation_appointments',
      'wifi_networks',
      'products',
      'carts',
      'cart_items',
      'bills',
      'payments',
      'services',
      'addons',
      'service_addon_subscriptions',
      'orders',
      'outage_statuses',
      'outage_alert_subscriptions',
      'plan_comparisons',
      // help center (not in model but used by interfaces)
      'help_categories',
      'help_topics'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // active cart / current order / comparison set / appointment IDs are stored separately when needed
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

  _formatCurrency(amount, currency = 'USD') {
    if (amount == null || isNaN(amount)) return '';
    const symbol = currency === 'USD' ? '$' : '';
    return symbol + Number(amount).toFixed(2);
  }

  _formatPriceMonthly(amount, currency = 'USD') {
    const cur = this._formatCurrency(amount, currency);
    return cur ? cur + '/mo' : '';
  }

  _buildPlanPriceDisplay(plan) {
    const currency = 'USD';
    if (plan.promo_price_monthly != null && plan.promo_duration_months != null && plan.promo_duration_months > 0) {
      const promo = this._formatCurrency(plan.promo_price_monthly, currency);
      const regular = this._formatCurrency(plan.price_monthly, currency);
      return `${promo}/mo for ${plan.promo_duration_months} mo, then ${regular}/mo`;
    }
    return this._formatPriceMonthly(plan.price_monthly, currency);
  }

  _buildContractLabel(contractTermType, contractLengthMonths) {
    switch (contractTermType) {
      case 'month_to_month':
        return 'No contract';
      case 'twelve_month':
        return '12-month contract';
      case 'twenty_four_month':
        return '24-month contract';
      case 'thirty_six_month':
        return '36-month contract';
      default:
        return contractLengthMonths ? `${contractLengthMonths}-month term` : '';
    }
  }

  _groupSlotsByDate(slots) {
    const daysMap = {};
    for (const slot of slots) {
      const start = new Date(slot.start_time || slot.startTime);
      if (isNaN(start.getTime())) continue;
      const dateKey = start.toISOString().slice(0, 10);
      if (!daysMap[dateKey]) daysMap[dateKey] = [];
      daysMap[dateKey].push(slot);
    }
    return Object.keys(daysMap).sort().map(date => ({
      date,
      slots: daysMap[date]
    }));
  }

  // ==========================
  // Helper Functions (private)
  // ==========================

  // Internal helper to retrieve or create the active cart
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cartId = localStorage.getItem('activeCartId');
    let cart = null;

    if (cartId) {
      cart = carts.find(c => c.id === cartId && c.is_active !== false) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: null,
        monthly_total: 0,
        one_time_total: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('activeCartId', cart.id);
    }

    return cart;
  }

  // Internal helper to retrieve current in-review order
  _getCurrentOrder() {
    const orders = this._getFromStorage('orders');
    const currentOrderId = localStorage.getItem('currentOrderId');
    if (!currentOrderId) return null;
    return orders.find(o => o.id === currentOrderId) || null;
  }

  // Internal helper to recompute cart totals
  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    let monthly = 0;
    let oneTime = 0;
    for (const item of itemsForCart) {
      const q = item.quantity || 1;
      if (item.price_monthly != null) monthly += item.price_monthly * q;
      if (item.price_one_time != null) oneTime += item.price_one_time * q;
    }
    cart.monthly_total = monthly;
    cart.one_time_total = oneTime;
    cart.updated_at = new Date().toISOString();

    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  // Internal helper to filter plans by criteria
  _filterPlansByCriteria(plans, filters = {}) {
    return plans.filter(plan => {
      if (filters.minDownloadSpeedMbps != null && plan.download_speed_mbps < filters.minDownloadSpeedMbps) {
        return false;
      }
      if (filters.maxDownloadSpeedMbps != null && plan.download_speed_mbps > filters.maxDownloadSpeedMbps) {
        return false;
      }
      if (filters.contractTermTypes && filters.contractTermTypes.length) {
        if (!filters.contractTermTypes.includes(plan.contract_term_type)) {
          return false;
        }
      }
      if (filters.maxPriceMonthly != null && plan.price_monthly > filters.maxPriceMonthly) {
        return false;
      }
      if (filters.fiberOnly && plan.connection_type !== 'fiber') {
        return false;
      }
      return true;
    });
  }

  // Internal helper to compute bundle pricing and discount
  _calculateBundlePrice(template, internetPlan, tvPackage, phonePlan) {
    let base = 0;
    if (internetPlan && internetPlan.price_monthly != null) base += internetPlan.price_monthly;
    if (tvPackage && tvPackage.price_monthly != null) base += tvPackage.price_monthly;
    if (phonePlan && phonePlan.price_monthly != null) base += phonePlan.price_monthly;
    const discount = template && template.base_discount_monthly ? template.base_discount_monthly : 0;
    const total = Math.max(0, base - discount);
    return { base, discount, total };
  }

  // Internal helper to simulate demo account state (no mocking, just convenience wrapper)
  _getDemoAccountState() {
    return {
      services: this._getFromStorage('services'),
      bills: this._getFromStorage('bills'),
      wifiNetworks: this._getFromStorage('wifi_networks'),
      orders: this._getFromStorage('orders')
    };
  }

  // Internal helper to validate installation time slot availability
  _validateInstallationTimeSlot(addressId, timeSlotId) {
    const slots = this._getFromStorage('installation_time_slots');
    const slot = slots.find(s => s.id === timeSlotId);
    if (!slot || slot.is_available === false) {
      return { valid: false, slot: null };
    }
    // Could add more complex address-to-slot logic here if needed
    return { valid: true, slot };
  }

  _wifiBandLabel(band) {
    switch (band) {
      case 'dual_band':
        return '2.4 GHz & 5 GHz';
      case 'two_point_four_ghz':
        return '2.4 GHz';
      case 'five_ghz':
        return '5 GHz';
      case 'six_ghz':
        return '6 GHz';
      default:
        return '';
    }
  }

  _wifiStandardLabel(standard) {
    switch (standard) {
      case 'wifi_4':
        return 'Wi-Fi 4';
      case 'wifi_5':
        return 'Wi-Fi 5';
      case 'wifi_6':
        return 'Wi-Fi 6';
      case 'wifi_6e':
        return 'Wi-Fi 6E';
      default:
        return '';
    }
  }

  // ==========================
  // Core Interface Implementations
  // ==========================

  // getHomePageSummary
  getHomePageSummary() {
    const internetPlans = this._getFromStorage('internet_plans');
    const bundleTemplates = this._getFromStorage('bundle_templates');
    const products = this._getFromStorage('products');

    const featuredInternetPlansRaw = internetPlans
      .filter(p => p.status === 'active' && p.is_available_residential !== false)
      .sort((a, b) => {
        // Prefer fiber, then higher download speed
        if (a.connection_type === 'fiber' && b.connection_type !== 'fiber') return -1;
        if (a.connection_type !== 'fiber' && b.connection_type === 'fiber') return 1;
        return (b.download_speed_mbps || 0) - (a.download_speed_mbps || 0);
      })
      .slice(0, 3);

    const featuredInternetPlans = featuredInternetPlansRaw.map(plan => ({
      planId: plan.id,
      name: plan.name,
      downloadSpeedMbps: plan.download_speed_mbps,
      uploadSpeedMbps: plan.upload_speed_mbps,
      priceDisplay: this._buildPlanPriceDisplay(plan),
      contractLabel: this._buildContractLabel(plan.contract_term_type, plan.contract_length_months),
      isFiber: plan.connection_type === 'fiber',
      isResidential: plan.plan_category === 'residential_internet',
      badge: plan.connection_type === 'fiber' ? 'Fiber' : ''
    }));

    const featuredBundlesRaw = bundleTemplates
      .filter(t => t.status === 'active')
      .slice(0, 3);

    const featuredBundles = featuredBundlesRaw.map(t => ({
      bundleTemplateId: t.id,
      name: t.name,
      bundleType: t.bundle_type,
      startingPriceDisplay: '',
      description: t.description || ''
    }));

    const featuredEquipmentRaw = products
      .filter(p => p.status === 'active' && p.category_id === 'equipment_wifi')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    const featuredEquipment = featuredEquipmentRaw.map(p => ({
      productId: p.id,
      name: p.name,
      wifiStandardLabel: this._wifiStandardLabel(p.wifi_standard),
      rentalPriceDisplay: p.rental_price_monthly != null ? this._formatPriceMonthly(p.rental_price_monthly) : '',
      rating: p.rating || 0
    }));

    return {
      heroTitle: 'Fiber-fast internet for home and business',
      heroSubtitle: 'Stream, work, and game on a 100% fiber network.',
      heroPrimaryCtaType: 'check_availability',
      heroSecondaryCtas: [
        { ctaType: 'schedule_installation', label: 'Schedule installation' },
        { ctaType: 'view_business_internet', label: 'Business fiber plans' },
        { ctaType: 'open_demo_account', label: 'Try demo account' }
      ],
      featuredInternetPlans,
      featuredBundles,
      featuredEquipment,
      showDemoAccountShortcut: true,
      showSupportShortcut: true
    };
  }

  // checkServiceAvailability
  checkServiceAvailability(streetLine1, city, state, zipCode, country) {
    const serviceAreas = this._getFromStorage('service_areas');
    const addresses = this._getFromStorage('addresses');

    const sa = serviceAreas.find(s => s.zip_code === zipCode) || null;

    const address = {
      id: this._generateId('addr'),
      street_line1: streetLine1,
      street_line2: '',
      city,
      state: state || '',
      zip_code: zipCode,
      country: country || 'USA',
      latitude: null,
      longitude: null,
      address_type: 'service',
      created_at: new Date().toISOString()
    };
    addresses.push(address);
    this._saveToStorage('addresses', addresses);

    const fiberAvailable = sa ? !!sa.fiber_available : false;
    const residentialServicesAvailable = sa && Array.isArray(sa.residential_services_available)
      ? sa.residential_services_available.slice()
      : [];
    const businessServicesAvailable = sa && Array.isArray(sa.business_services_available)
      ? sa.business_services_available.slice()
      : [];

    const recommendedNextActions = [];
    if (fiberAvailable && residentialServicesAvailable.includes('internet')) {
      recommendedNextActions.push({ actionType: 'view_residential_plans', label: 'View residential internet plans' });
    }
    if (fiberAvailable && residentialServicesAvailable.includes('bundles')) {
      recommendedNextActions.push({ actionType: 'view_bundles', label: 'Build a bundle' });
    }
    if (fiberAvailable) {
      recommendedNextActions.push({ actionType: 'schedule_installation', label: 'Schedule an installation' });
    }
    if (businessServicesAvailable.includes('internet')) {
      recommendedNextActions.push({ actionType: 'contact_sales', label: 'Talk to business sales' });
    }

    return {
      addressId: address.id,
      normalizedAddress: {
        streetLine1,
        city,
        state: state || '',
        zipCode,
        country: country || 'USA'
      },
      fiberAvailable,
      residentialServicesAvailable,
      businessServicesAvailable,
      notes: sa && sa.notes ? sa.notes : '',
      recommendedNextActions
    };
  }

  // getResidentialPlanFilterOptions
  getResidentialPlanFilterOptions() {
    const plans = this._getFromStorage('internet_plans').filter(p => p.plan_category === 'residential_internet' && p.status === 'active');

    const speedsSet = new Set();
    for (const p of plans) {
      if (p.download_speed_mbps != null) speedsSet.add(p.download_speed_mbps);
    }
    const speedOptions = Array.from(speedsSet).sort((a, b) => a - b).map(v => ({
      valueMbps: v,
      label: `${v} Mbps`
    }));

    const contractTermOptions = [
      { value: 'month_to_month', label: 'Month-to-month', maxMonths: 1 },
      { value: 'twelve_month', label: '12-month contract', maxMonths: 12 },
      { value: 'twenty_four_month', label: '24-month contract', maxMonths: 24 },
      { value: 'thirty_six_month', label: '36-month contract', maxMonths: 36 }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'speed_high_to_low', label: 'Speed: High to Low' }
    ];

    return {
      speedOptions,
      contractTermOptions,
      sortOptions
    };
  }

  // getResidentialInternetPlans
  getResidentialInternetPlans(filters, sort) {
    const allPlans = this._getFromStorage('internet_plans').filter(p => p.plan_category === 'residential_internet' && p.status === 'active');
    const filtered = this._filterPlansByCriteria(allPlans, filters || {});

    const sortBy = sort && sort.sortBy ? sort.sortBy : 'price';
    const sortDirection = sort && sort.sortDirection ? sort.sortDirection : 'asc';

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'download_speed') {
        cmp = (a.download_speed_mbps || 0) - (b.download_speed_mbps || 0);
      } else if (sortBy === 'price') {
        cmp = (a.price_monthly || 0) - (b.price_monthly || 0);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    const plans = filtered.map(plan => ({
      planId: plan.id,
      name: plan.name,
      downloadSpeedMbps: plan.download_speed_mbps,
      uploadSpeedMbps: plan.upload_speed_mbps,
      priceMonthly: plan.price_monthly,
      promoPriceMonthly: plan.promo_price_monthly || null,
      promoDurationMonths: plan.promo_duration_months || null,
      contractTermType: plan.contract_term_type,
      contractLengthMonths: plan.contract_length_months,
      contractLabel: this._buildContractLabel(plan.contract_term_type, plan.contract_length_months),
      priceDisplay: this._buildPlanPriceDisplay(plan),
      includesWifiRouter: !!plan.includes_wifi_router,
      isFiber: plan.connection_type === 'fiber',
      isMostPopular: plan.display_order === 1
    }));

    return {
      plans,
      totalCount: plans.length,
      appliedFilters: {
        minDownloadSpeedMbps: filters && filters.minDownloadSpeedMbps != null ? filters.minDownloadSpeedMbps : null,
        contractTermTypes: filters && filters.contractTermTypes ? filters.contractTermTypes.slice() : [],
        maxPriceMonthly: filters && filters.maxPriceMonthly != null ? filters.maxPriceMonthly : null,
        fiberOnly: !!(filters && filters.fiberOnly)
      }
    };
  }

  // selectResidentialInternetPlan
  selectResidentialInternetPlan(planId) {
    const plans = this._getFromStorage('internet_plans');
    const plan = plans.find(p => p.id === planId && p.plan_category === 'residential_internet');
    if (!plan) {
      return {
        success: false,
        selectedPlan: null,
        cartPreview: null,
        nextStep: null,
        message: 'Plan not found.'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    // Remove existing residential internet plan items to avoid duplicates
    cartItems = cartItems.filter(ci => !(ci.cart_id === cart.id && ci.item_type === 'internet_plan'));

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'internet_plan',
      internet_plan_id: plan.id,
      bundle_configuration_id: null,
      product_id: null,
      name_snapshot: plan.name,
      quantity: 1,
      price_monthly: plan.price_monthly,
      price_one_time: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    if (!cart.items.includes(cartItem.id)) cart.items.push(cartItem.id);
    this._recalculateCartTotals(cart);

    const cartPreview = {
      itemCount: cart.items.length,
      monthlySubtotal: cart.monthly_total,
      monthlySubtotalDisplay: this._formatPriceMonthly(cart.monthly_total)
    };

    return {
      success: true,
      selectedPlan: {
        planId: plan.id,
        name: plan.name,
        downloadSpeedMbps: plan.download_speed_mbps,
        uploadSpeedMbps: plan.upload_speed_mbps,
        priceDisplay: this._buildPlanPriceDisplay(plan),
        contractLabel: this._buildContractLabel(plan.contract_term_type, plan.contract_length_months)
      },
      cartPreview,
      nextStep: 'plan_details',
      message: 'Plan added to cart.'
    };
  }

  // getInternetPlanDetails
  getInternetPlanDetails(planId) {
    const plans = this._getFromStorage('internet_plans');
    const addons = this._getFromStorage('addons');
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return {
        planId: null,
        name: '',
        planCategory: '',
        connectionType: '',
        downloadSpeedMbps: 0,
        uploadSpeedMbps: 0,
        priceMonthly: 0,
        priceDisplay: '',
        promoPriceMonthly: null,
        promoDurationMonths: null,
        contractTermType: '',
        contractLengthMonths: 0,
        contractLabel: '',
        includesWifiRouter: false,
        includesStaticIp: false,
        description: '',
        isBusinessPlan: false,
        canRequestQuote: false,
        availableAddons: []
      };
    }

    const serviceType = plan.plan_category === 'business_internet' ? 'fiber_internet' : 'fiber_internet';

    const availableAddons = addons
      .filter(a => a.status === 'active')
      .filter(a => !Array.isArray(a.applicable_service_types) || a.applicable_service_types.length === 0 || a.applicable_service_types.includes(serviceType))
      .map(a => ({
        addonId: a.id,
        name: a.name,
        description: a.description || '',
        priceMonthly: a.price_monthly || 0,
        addonType: a.addon_type
      }));

    return {
      planId: plan.id,
      name: plan.name,
      planCategory: plan.plan_category,
      connectionType: plan.connection_type,
      downloadSpeedMbps: plan.download_speed_mbps,
      uploadSpeedMbps: plan.upload_speed_mbps,
      priceMonthly: plan.price_monthly,
      priceDisplay: this._buildPlanPriceDisplay(plan),
      promoPriceMonthly: plan.promo_price_monthly || null,
      promoDurationMonths: plan.promo_duration_months || null,
      contractTermType: plan.contract_term_type,
      contractLengthMonths: plan.contract_length_months,
      contractLabel: this._buildContractLabel(plan.contract_term_type, plan.contract_length_months),
      includesWifiRouter: !!plan.includes_wifi_router,
      includesStaticIp: !!plan.includes_static_ip,
      description: plan.description || '',
      isBusinessPlan: plan.plan_category === 'business_internet',
      canRequestQuote: plan.plan_category === 'business_internet',
      availableAddons
    };
  }

  // configurePlanAddonsForCheckout
  configurePlanAddonsForCheckout(planId, selectedAddonIds) {
    const plans = this._getFromStorage('internet_plans');
    const addons = this._getFromStorage('addons');
    const plan = plans.find(p => p.id === planId);
    const selectedIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];

    const selectedAddons = addons
      .filter(a => selectedIds.includes(a.id))
      .map(a => ({
        addonId: a.id,
        name: a.name,
        priceMonthly: a.price_monthly || 0
      }));

    const planPrice = plan ? plan.price_monthly || 0 : 0;
    const addonsMonthly = selectedAddons.reduce((sum, a) => sum + (a.priceMonthly || 0), 0);
    const estimatedMonthlyTotal = planPrice + addonsMonthly;
    const estimatedOneTimeFees = 0;

    return {
      planId,
      selectedAddons,
      estimatedMonthlyTotal,
      estimatedMonthlyTotalDisplay: this._formatPriceMonthly(estimatedMonthlyTotal),
      estimatedOneTimeFees
    };
  }

  // startCheckoutWithSelectedPlan
  startCheckoutWithSelectedPlan(planId, selectedAddonIds) {
    const plans = this._getFromStorage('internet_plans');
    const addons = this._getFromStorage('addons');
    const orders = this._getFromStorage('orders');

    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return {
        orderId: null,
        items: [],
        monthlyTotal: 0,
        monthlyTotalDisplay: '',
        oneTimeTotal: 0,
        oneTimeTotalDisplay: '',
        message: 'Plan not found.'
      };
    }

    const selectedIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    const selectedAddons = addons.filter(a => selectedIds.includes(a.id));

    const items = [];
    items.push({
      lineType: 'plan',
      name: plan.name,
      description: plan.description || '',
      priceMonthly: plan.price_monthly || 0,
      priceOneTime: 0
    });

    for (const addon of selectedAddons) {
      items.push({
        lineType: 'addon',
        name: addon.name,
        description: addon.description || '',
        priceMonthly: addon.price_monthly || 0,
        priceOneTime: addon.price_one_time || 0
      });
    }

    const monthlyTotal = items.reduce((sum, i) => sum + (i.priceMonthly || 0), 0);
    const oneTimeTotal = items.reduce((sum, i) => sum + (i.priceOneTime || 0), 0);

    const order = {
      id: this._generateId('order'),
      order_type: 'new_service',
      cart_id: null,
      items,
      monthly_total: monthlyTotal,
      one_time_total: oneTimeTotal,
      status: 'in_review',
      created_at: new Date().toISOString(),
      confirmed_at: null,
      service_address: null,
      customer_contact: null
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    localStorage.setItem('currentOrderId', order.id);

    return {
      orderId: order.id,
      items: order.items,
      monthlyTotal,
      monthlyTotalDisplay: this._formatPriceMonthly(monthlyTotal),
      oneTimeTotal,
      oneTimeTotalDisplay: this._formatCurrency(oneTimeTotal),
      message: 'Order created for review.'
    };
  }

  // getBundleTemplates
  getBundleTemplates() {
    const bundleTemplates = this._getFromStorage('bundle_templates').filter(t => t.status === 'active');
    const bundleTemplatesOut = bundleTemplates.map(t => ({
      bundleTemplateId: t.id,
      name: t.name,
      bundleType: t.bundle_type,
      description: t.description || '',
      isConfigurable: !!t.is_configurable,
      baseDiscountMonthly: t.base_discount_monthly || 0,
      minInternetSpeedMbps: t.min_internet_speed_mbps || null,
      minChannels: t.min_channels || null,
      requiresPhone: !!t.requires_phone
    }));

    return { bundleTemplates: bundleTemplatesOut };
  }

  // getBundleFilterOptionsForTemplate
  getBundleFilterOptionsForTemplate(bundleTemplateId) {
    const templates = this._getFromStorage('bundle_templates');
    const template = templates.find(t => t.id === bundleTemplateId);
    const internetPlans = this._getFromStorage('internet_plans').filter(p => p.plan_category === 'residential_internet' && p.status === 'active');
    const tvPackages = this._getFromStorage('tv_packages').filter(t => t.status === 'active');

    const maxPriceSuggestions = [];
    const priceCandidates = [];
    for (const p of internetPlans) {
      if (p.price_monthly != null) priceCandidates.push(p.price_monthly);
    }
    for (const tv of tvPackages) {
      if (tv.price_monthly != null) priceCandidates.push(tv.price_monthly);
    }
    priceCandidates.sort((a, b) => a - b);
    if (priceCandidates.length) {
      const min = priceCandidates[0];
      const max = priceCandidates[priceCandidates.length - 1];
      const mid = (min + max) / 2;
      maxPriceSuggestions.push({ value: Math.round(min + 20), label: this._formatCurrency(min + 20) + '/mo budget' });
      maxPriceSuggestions.push({ value: Math.round(mid), label: this._formatCurrency(mid) + '/mo budget' });
      maxPriceSuggestions.push({ value: Math.round(max + 20), label: this._formatCurrency(max + 20) + '/mo budget' });
    }

    const speedSet = new Set();
    for (const p of internetPlans) {
      if (p.download_speed_mbps != null) speedSet.add(p.download_speed_mbps);
    }
    const internetSpeedOptions = Array.from(speedSet).sort((a, b) => a - b).map(v => ({
      valueMbps: v,
      label: `${v} Mbps`
    }));

    const channelSet = new Set();
    for (const tv of tvPackages) {
      if (tv.channel_count != null) channelSet.add(tv.channel_count);
    }
    const channelCountsSorted = Array.from(channelSet).sort((a, b) => a - b);
    const channelCountOptions = channelCountsSorted.map(v => ({
      minChannels: v,
      label: `${v}+ channels`
    }));

    return {
      maxPriceSuggestions,
      internetSpeedOptions,
      channelCountOptions
    };
  }

  // getBundleConfigurationOptions
  getBundleConfigurationOptions(bundleTemplateId, filters) {
    const templates = this._getFromStorage('bundle_templates');
    const template = templates.find(t => t.id === bundleTemplateId);
    const internetPlansAll = this._getFromStorage('internet_plans').filter(p => p.plan_category === 'residential_internet' && p.status === 'active');
    const tvPackagesAll = this._getFromStorage('tv_packages').filter(t => t.status === 'active');
    const phonePlansAll = this._getFromStorage('phone_plans').filter(p => p.status === 'active');

    const f = filters || {};

    const minSpeed = Math.max(template && template.min_internet_speed_mbps ? template.min_internet_speed_mbps : 0, f.minInternetSpeedMbps || 0);
    const minChannels = Math.max(template && template.min_channels ? template.min_channels : 0, f.minChannels || 0);

    let availableInternetPlans = internetPlansAll.filter(p => p.download_speed_mbps >= minSpeed);
    if (f.maxPriceMonthly != null) {
      availableInternetPlans = availableInternetPlans.filter(p => p.price_monthly <= f.maxPriceMonthly);
    }

    let availableTVPackages = tvPackagesAll.filter(t => t.channel_count >= minChannels);
    if (f.maxPriceMonthly != null) {
      availableTVPackages = availableTVPackages.filter(t => t.price_monthly <= f.maxPriceMonthly);
    }

    let availablePhonePlans = phonePlansAll;
    if (template && template.requires_phone) {
      availablePhonePlans = availablePhonePlans.filter(p => p.unlimited_nationwide === true);
    }

    const availableInternetPlansOut = availableInternetPlans.map(p => ({
      planId: p.id,
      name: p.name,
      downloadSpeedMbps: p.download_speed_mbps,
      uploadSpeedMbps: p.upload_speed_mbps,
      priceMonthly: p.price_monthly,
      priceDisplay: this._formatPriceMonthly(p.price_monthly)
    }));

    const availableTVPackagesOut = availableTVPackages.map(t => ({
      tvPackageId: t.id,
      name: t.name,
      channelCount: t.channel_count,
      priceMonthly: t.price_monthly,
      priceDisplay: this._formatPriceMonthly(t.price_monthly),
      isPremium: !!t.is_premium
    }));

    const availablePhonePlansOut = availablePhonePlans.map(p => ({
      phonePlanId: p.id,
      name: p.name,
      unlimitedNationwide: !!p.unlimited_nationwide,
      priceMonthly: p.price_monthly,
      priceDisplay: this._formatPriceMonthly(p.price_monthly)
    }));

    return {
      availableInternetPlans: availableInternetPlansOut,
      availableTVPackages: availableTVPackagesOut,
      availablePhonePlans: availablePhonePlansOut
    };
  }

  // previewBundleConfiguration
  previewBundleConfiguration(bundleTemplateId, internetPlanId, tvPackageId, phonePlanId) {
    const templates = this._getFromStorage('bundle_templates');
    const internetPlans = this._getFromStorage('internet_plans');
    const tvPackages = this._getFromStorage('tv_packages');
    const phonePlans = this._getFromStorage('phone_plans');

    const template = templates.find(t => t.id === bundleTemplateId);
    const internetPlan = internetPlans.find(p => p.id === internetPlanId);
    const tvPackage = tvPackageId ? tvPackages.find(t => t.id === tvPackageId) : null;
    const phonePlan = phonePlanId ? phonePlans.find(p => p.id === phonePlanId) : null;

    const { base, discount, total } = this._calculateBundlePrice(template || {}, internetPlan, tvPackage, phonePlan);

    const validationMessages = [];
    let meetsTemplateRules = true;

    if (template) {
      if (template.min_internet_speed_mbps && internetPlan && internetPlan.download_speed_mbps < template.min_internet_speed_mbps) {
        meetsTemplateRules = false;
        validationMessages.push({ level: 'error', message: `Internet speed must be at least ${template.min_internet_speed_mbps} Mbps.` });
      }
      if (template.min_channels && tvPackage && tvPackage.channel_count < template.min_channels) {
        meetsTemplateRules = false;
        validationMessages.push({ level: 'error', message: `TV package must include at least ${template.min_channels} channels.` });
      }
      if (template.requires_phone && !phonePlan) {
        meetsTemplateRules = false;
        validationMessages.push({ level: 'error', message: 'A phone plan is required for this bundle.' });
      }
    }

    const bundleConfigurations = this._getFromStorage('bundle_configurations');
    const bundleConfiguration = {
      id: this._generateId('bundlecfg'),
      template_id: bundleTemplateId,
      internet_plan_id: internetPlanId,
      tv_package_id: tvPackageId || null,
      phone_plan_id: phonePlanId || null,
      total_price_monthly: total,
      created_at: new Date().toISOString(),
      is_added_to_cart: false
    };
    bundleConfigurations.push(bundleConfiguration);
    this._saveToStorage('bundle_configurations', bundleConfigurations);

    return {
      bundleConfigurationId: bundleConfiguration.id,
      components: {
        internetPlanName: internetPlan ? internetPlan.name : '',
        tvPackageName: tvPackage ? tvPackage.name : '',
        phonePlanName: phonePlan ? phonePlan.name : ''
      },
      basePriceMonthly: base,
      discountMonthly: discount,
      totalPriceMonthly: total,
      totalPriceMonthlyDisplay: this._formatPriceMonthly(total),
      meetsTemplateRules,
      validationMessages
    };
  }

  // addBundleToCart
  addBundleToCart(bundleConfigurationId) {
    const bundleConfigurations = this._getFromStorage('bundle_configurations');
    const cfg = bundleConfigurations.find(b => b.id === bundleConfigurationId);
    if (!cfg) {
      return { success: false, cartItemId: null, cart: null, message: 'Bundle configuration not found.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    // Clear existing items in this cart so the bundle represents a complete package
    const existingItemIds = cartItems.filter(ci => ci.cart_id === cart.id).map(ci => ci.id);
    if (existingItemIds.length) {
      cartItems = cartItems.filter(ci => ci.cart_id !== cart.id);
      this._saveToStorage('cart_items', cartItems);
      cart.items = [];
    }

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'bundle_configuration',
      internet_plan_id: null,
      bundle_configuration_id: cfg.id,
      product_id: null,
      name_snapshot: 'Bundle',
      quantity: 1,
      price_monthly: cfg.total_price_monthly || 0,
      price_one_time: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._recalculateCartTotals(cart);

    // mark configuration as added to cart
    const idx = bundleConfigurations.findIndex(b => b.id === cfg.id);
    if (idx !== -1) {
      bundleConfigurations[idx].is_added_to_cart = true;
      this._saveToStorage('bundle_configurations', bundleConfigurations);
    }

    return {
      success: true,
      cartItemId: cartItem.id,
      cart: {
        cartId: cart.id,
        itemCount: cart.items.length,
        monthlySubtotal: cart.monthly_total,
        monthlySubtotalDisplay: this._formatPriceMonthly(cart.monthly_total)
      },
      message: 'Bundle added to cart.'
    };
  }

  // getActiveCart
  getActiveCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const internetPlans = this._getFromStorage('internet_plans');
    const bundleConfigurations = this._getFromStorage('bundle_configurations');
    const products = this._getFromStorage('products');

    const itemsOut = cartItems.map(ci => {
      let description = '';
      let priceMonthly = ci.price_monthly || 0;
      let priceOneTime = ci.price_one_time || 0;

      if (ci.item_type === 'internet_plan' && ci.internet_plan_id) {
        const plan = internetPlans.find(p => p.id === ci.internet_plan_id);
        if (plan) {
          description = this._buildPlanPriceDisplay(plan);
          priceMonthly = plan.price_monthly || ci.price_monthly || 0;
        }
      }
      if (ci.item_type === 'bundle_configuration' && ci.bundle_configuration_id) {
        const cfg = bundleConfigurations.find(b => b.id === ci.bundle_configuration_id);
        if (cfg) {
          description = 'Custom bundle';
          priceMonthly = cfg.total_price_monthly || ci.price_monthly || 0;
        }
      }
      if (ci.item_type === 'equipment' && ci.product_id) {
        const prod = products.find(p => p.id === ci.product_id);
        if (prod) {
          description = prod.description || '';
          priceMonthly = prod.rental_price_monthly || ci.price_monthly || 0;
          priceOneTime = prod.purchase_price || ci.price_one_time || 0;
        }
      }

      const item = {
        cartItemId: ci.id,
        itemType: ci.item_type,
        name: ci.name_snapshot,
        description,
        quantity: ci.quantity || 1,
        priceMonthly,
        priceOneTime,
        priceMonthlyDisplay: this._formatPriceMonthly(priceMonthly),
        priceOneTimeDisplay: this._formatCurrency(priceOneTime)
      };
      return item;
    });

    const monthlyTotal = itemsOut.reduce((s, i) => s + (i.priceMonthly || 0) * (i.quantity || 1), 0);
    const oneTimeTotal = itemsOut.reduce((s, i) => s + (i.priceOneTime || 0) * (i.quantity || 1), 0);

    return {
      cartId: cart.id,
      isActive: cart.is_active !== false,
      items: itemsOut,
      monthlyTotal,
      monthlyTotalDisplay: this._formatPriceMonthly(monthlyTotal),
      oneTimeTotal,
      oneTimeTotalDisplay: this._formatCurrency(oneTimeTotal),
      currency: cart.currency || 'USD'
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    cartItems[idx].quantity = quantity;
    this._saveToStorage('cart_items', cartItems);

    const cartId = cartItems[idx].cart_id;
    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartId);
    if (cart) {
      this._recalculateCartTotals(cart);
    }

    const updatedCart = this.getActiveCart();

    return {
      success: true,
      cart: {
        cartId: updatedCart.cartId,
        items: updatedCart.items.map(i => ({
          cartItemId: i.cartItemId,
          name: i.name,
          quantity: i.quantity,
          priceMonthlyDisplay: i.priceMonthlyDisplay,
          priceOneTimeDisplay: i.priceOneTimeDisplay
        })),
        monthlyTotal: updatedCart.monthlyTotal,
        oneTimeTotal: updatedCart.oneTimeTotal
      },
      message: 'Cart updated.'
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id);
    if (cart && Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
      this._recalculateCartTotals(cart);
    }

    const activeCart = this.getActiveCart();

    return {
      success: true,
      cart: {
        cartId: activeCart.cartId,
        itemCount: activeCart.items.length,
        monthlyTotal: activeCart.monthlyTotal,
        oneTimeTotal: activeCart.oneTimeTotal
      },
      message: 'Item removed from cart.'
    };
  }

  // startCheckoutFromCart
  startCheckoutFromCart() {
    const activeCart = this.getActiveCart();
    if (!activeCart.items || !activeCart.items.length) {
      return {
        orderId: null,
        items: [],
        monthlyTotal: 0,
        monthlyTotalDisplay: '',
        oneTimeTotal: 0,
        oneTimeTotalDisplay: '',
        message: 'Cart is empty.'
      };
    }

    const orders = this._getFromStorage('orders');

    let orderType = 'new_service';
    const hasBundle = activeCart.items.some(i => i.itemType === 'bundle_configuration');
    const hasEquipment = activeCart.items.some(i => i.itemType === 'equipment');
    if (hasBundle) orderType = 'bundle';
    else if (hasEquipment && !hasBundle) orderType = 'equipment';

    const items = activeCart.items.map(i => ({
      lineType: i.itemType === 'bundle_configuration' ? 'bundle' : (i.itemType === 'equipment' ? 'equipment' : 'plan'),
      name: i.name,
      description: i.description,
      quantity: i.quantity,
      priceMonthly: i.priceMonthly,
      priceOneTime: i.priceOneTime
    }));

    const order = {
      id: this._generateId('order'),
      order_type: orderType,
      cart_id: activeCart.cartId,
      items,
      monthly_total: activeCart.monthlyTotal,
      one_time_total: activeCart.oneTimeTotal,
      status: 'in_review',
      created_at: new Date().toISOString(),
      confirmed_at: null,
      service_address: null,
      customer_contact: null
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    localStorage.setItem('currentOrderId', order.id);

    return {
      orderId: order.id,
      items,
      monthlyTotal: order.monthly_total,
      monthlyTotalDisplay: this._formatPriceMonthly(order.monthly_total),
      oneTimeTotal: order.one_time_total,
      oneTimeTotalDisplay: this._formatCurrency(order.one_time_total),
      message: 'Checkout started from cart.'
    };
  }

  // getCheckoutOrderReview
  getCheckoutOrderReview() {
    const order = this._getCurrentOrder();
    if (!order) {
      return {
        orderId: null,
        status: 'in_review',
        items: [],
        monthlyTotal: 0,
        monthlyTotalDisplay: '',
        oneTimeTotal: 0,
        oneTimeTotalDisplay: '',
        billingFrequencyLabel: 'Monthly',
        requiresServiceAddress: true,
        serviceAddress: null,
        customerContact: null
      };
    }

    const items = (order.items || []).map(i => ({
      lineType: i.lineType,
      name: i.name,
      description: i.description,
      quantity: i.quantity || 1,
      priceMonthly: i.priceMonthly || 0,
      priceMonthlyDisplay: this._formatPriceMonthly(i.priceMonthly || 0),
      priceOneTime: i.priceOneTime || 0,
      priceOneTimeDisplay: this._formatCurrency(i.priceOneTime || 0)
    }));

    const monthlyTotal = order.monthly_total || items.reduce((s, i) => s + (i.priceMonthly || 0) * (i.quantity || 1), 0);
    const oneTimeTotal = order.one_time_total || items.reduce((s, i) => s + (i.priceOneTime || 0) * (i.quantity || 1), 0);

    const serviceAddress = order.service_address || null;
    const customerContact = order.customer_contact || null;

    const requiresServiceAddress = order.order_type === 'new_service' || order.order_type === 'bundle';

    return {
      orderId: order.id,
      status: order.status,
      items,
      monthlyTotal,
      monthlyTotalDisplay: this._formatPriceMonthly(monthlyTotal),
      oneTimeTotal,
      oneTimeTotalDisplay: this._formatCurrency(oneTimeTotal),
      billingFrequencyLabel: 'Monthly',
      requiresServiceAddress,
      serviceAddress: serviceAddress
        ? {
            streetLine1: serviceAddress.streetLine1,
            streetLine2: serviceAddress.streetLine2 || '',
            city: serviceAddress.city,
            state: serviceAddress.state || '',
            zipCode: serviceAddress.zipCode,
            country: serviceAddress.country || 'USA'
          }
        : null,
      customerContact: customerContact
        ? {
            fullName: customerContact.fullName,
            email: customerContact.email,
            phone: customerContact.phone
          }
        : null
    };
  }

  // updateCheckoutCustomerInfo
  updateCheckoutCustomerInfo(fullName, email, phone, serviceAddress) {
    let orders = this._getFromStorage('orders');
    let order = this._getCurrentOrder();

    if (!order) {
      // Create a minimal order if none exists
      order = {
        id: this._generateId('order'),
        order_type: 'new_service',
        cart_id: null,
        items: [],
        monthly_total: 0,
        one_time_total: 0,
        status: 'in_review',
        created_at: new Date().toISOString(),
        confirmed_at: null,
        service_address: null,
        customer_contact: null
      };
      orders.push(order);
      localStorage.setItem('currentOrderId', order.id);
    }

    const sa = {
      streetLine1: serviceAddress.streetLine1,
      streetLine2: serviceAddress.streetLine2 || '',
      city: serviceAddress.city,
      state: serviceAddress.state || '',
      zipCode: serviceAddress.zipCode,
      country: serviceAddress.country || 'USA'
    };

    const cc = { fullName, email, phone };

    order.service_address = sa;
    order.customer_contact = cc;

    const idx = orders.findIndex(o => o.id === order.id);
    if (idx === -1) {
      orders.push(order);
    } else {
      orders[idx] = order;
    }
    this._saveToStorage('orders', orders);

    return {
      success: true,
      orderId: order.id,
      customerContact: cc,
      serviceAddress: {
        streetLine1: sa.streetLine1,
        city: sa.city,
        state: sa.state,
        zipCode: sa.zipCode
      },
      message: 'Checkout information updated.'
    };
  }

  // confirmCheckoutOrder
  confirmCheckoutOrder() {
    let orders = this._getFromStorage('orders');
    const order = this._getCurrentOrder();
    if (!order) {
      return { success: false, orderId: null, status: 'cancelled', confirmationNumber: null, message: 'No order in review.' };
    }

    order.status = 'submitted';
    order.confirmed_at = new Date().toISOString();

    const idx = orders.findIndex(o => o.id === order.id);
    if (idx !== -1) {
      orders[idx] = order;
      this._saveToStorage('orders', orders);
    }

    const confirmationNumber = 'CONF-' + order.id;

    return {
      success: true,
      orderId: order.id,
      status: order.status,
      confirmationNumber,
      message: 'Order submitted successfully.'
    };
  }

  // getBusinessInternetPlanFilterOptions
  getBusinessInternetPlanFilterOptions() {
    const connectionTypeOptions = [
      { value: 'fiber', label: 'Fiber' },
      { value: 'cable', label: 'Cable' },
      { value: 'dsl', label: 'DSL' },
      { value: 'fixed_wireless', label: 'Fixed wireless' }
    ];

    const sortOptions = [
      { value: 'upload_speed_high_to_low', label: 'Upload speed: High to Low' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    const allPlansRaw = this._getFromStorage('internet_plans').filter(p => p.status === 'active');
    let plans = allPlansRaw.filter(p => p.plan_category === 'business_internet');
    if (!plans.length) {
      // Fallback: treat active fiber plans as business-capable when no explicit business plans exist
      plans = allPlansRaw.filter(p => p.connection_type === 'fiber');
    }
    const maxPrice = plans.reduce((max, p) => (p.price_monthly != null && p.price_monthly > max ? p.price_monthly : max), 0) || 0;

    return {
      connectionTypeOptions,
      sortOptions,
      defaultMaxPriceMonthly: maxPrice || 200
    };
  }

  // getBusinessInternetPlans
  getBusinessInternetPlans(filters, sort) {
    const allPlansRaw = this._getFromStorage('internet_plans').filter(p => p.status === 'active');
    let allPlans = allPlansRaw.filter(p => p.plan_category === 'business_internet');
    if (!allPlans.length) {
      // Fallback: when no explicit business plans exist, use active fiber plans
      allPlans = allPlansRaw.filter(p => p.connection_type === 'fiber');
    }
    const f = filters || {};

    let plans = allPlans.filter(p => {
      if (f.connectionTypes && f.connectionTypes.length && !f.connectionTypes.includes(p.connection_type)) return false;
      if (f.maxPriceMonthly != null && p.price_monthly > f.maxPriceMonthly) return false;
      if (f.minDownloadSpeedMbps != null && p.download_speed_mbps < f.minDownloadSpeedMbps) return false;
      if (f.minUploadSpeedMbps != null && p.upload_speed_mbps < f.minUploadSpeedMbps) return false;
      return true;
    });

    const sortBy = sort && sort.sortBy ? sort.sortBy : 'upload_speed';
    const sortDirection = sort && sort.sortDirection ? sort.sortDirection : 'desc';

    plans.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'upload_speed') {
        cmp = (a.upload_speed_mbps || 0) - (b.upload_speed_mbps || 0);
      } else if (sortBy === 'price') {
        cmp = (a.price_monthly || 0) - (b.price_monthly || 0);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    const plansOut = plans.map(p => ({
      planId: p.id,
      name: p.name,
      downloadSpeedMbps: p.download_speed_mbps,
      uploadSpeedMbps: p.upload_speed_mbps,
      connectionType: p.connection_type,
      priceMonthly: p.price_monthly,
      priceDisplay: this._formatPriceMonthly(p.price_monthly)
    }));

    return {
      plans: plansOut,
      totalCount: plansOut.length,
      appliedFilters: {
        connectionTypes: f.connectionTypes ? f.connectionTypes.slice() : [],
        maxPriceMonthly: f.maxPriceMonthly != null ? f.maxPriceMonthly : null
      }
    };
  }

  // createPlanComparisonSet
  createPlanComparisonSet(planIds) {
    const ids = Array.isArray(planIds) ? planIds : [];
    const allPlans = this._getFromStorage('internet_plans');
    const selectedPlans = allPlans.filter(p => ids.includes(p.id));

    const comparisonSets = this._getFromStorage('plan_comparisons');
    const comparisonSet = {
      id: this._generateId('cmp'),
      plan_ids: selectedPlans.map(p => p.id),
      created_at: new Date().toISOString()
    };

    comparisonSets.push(comparisonSet);
    this._saveToStorage('plan_comparisons', comparisonSets);
    localStorage.setItem('currentComparisonSetId', comparisonSet.id);

    const plansOut = selectedPlans.map(p => ({
      planId: p.id,
      name: p.name,
      downloadSpeedMbps: p.download_speed_mbps,
      uploadSpeedMbps: p.upload_speed_mbps,
      priceDisplay: this._formatPriceMonthly(p.price_monthly)
    }));

    return {
      comparisonSetId: comparisonSet.id,
      plans: plansOut
    };
  }

  // getPlanComparisonDetails
  getPlanComparisonDetails(comparisonSetId) {
    const comparisonSets = this._getFromStorage('plan_comparisons');
    const allPlans = this._getFromStorage('internet_plans');

    const set = comparisonSets.find(s => s.id === comparisonSetId);
    if (!set) {
      return {
        comparisonSetId: null,
        plans: []
      };
    }

    const plansOut = set.plan_ids.map(id => {
      const p = allPlans.find(pl => pl.id === id);
      if (!p) return null;
      return {
        planId: p.id,
        name: p.name,
        downloadSpeedMbps: p.download_speed_mbps,
        uploadSpeedMbps: p.upload_speed_mbps,
        priceMonthly: p.price_monthly,
        priceDisplay: this._formatPriceMonthly(p.price_monthly),
        contractLabel: this._buildContractLabel(p.contract_term_type, p.contract_length_months)
      };
    }).filter(Boolean);

    return {
      comparisonSetId: set.id,
      plans: plansOut
    };
  }

  // chooseBusinessInternetPlanForQuote
  chooseBusinessInternetPlanForQuote(planId) {
    const plans = this._getFromStorage('internet_plans');

    // Prefer explicit business internet plans
    let plan = plans.find(p => p.id === planId && p.plan_category === 'business_internet');

    if (!plan) {
      // If there are no explicit business plans at all, treat active fiber plans as business-capable
      const hasBusinessPlans = plans.some(p => p.plan_category === 'business_internet');
      if (!hasBusinessPlans) {
        plan = plans.find(p => p.id === planId && p.connection_type === 'fiber' && p.status === 'active');
      }
    }

    if (!plan) {
      return { success: false, selectedPlan: null, message: 'Plan not found.' };
    }

    localStorage.setItem('currentQuotePlanId', plan.id);

    return {
      success: true,
      selectedPlan: {
        planId: plan.id,
        name: plan.name,
        uploadSpeedMbps: plan.upload_speed_mbps,
        priceDisplay: this._formatPriceMonthly(plan.price_monthly)
      },
      message: 'Plan selected for quote.'
    };
  }

  // submitBusinessQuoteRequest
  submitBusinessQuoteRequest(planId, companyName, employeesCount, email, phoneNumber) {
    const plans = this._getFromStorage('internet_plans');
    const quoteRequests = this._getFromStorage('business_quote_requests');

    // Prefer explicit business internet plans
    let plan = plans.find(p => p.id === planId && p.plan_category === 'business_internet');

    if (!plan) {
      // If there are no explicit business plans at all, treat active fiber plans as business-capable
      const hasBusinessPlans = plans.some(p => p.plan_category === 'business_internet');
      if (!hasBusinessPlans) {
        plan = plans.find(p => p.id === planId && p.connection_type === 'fiber' && p.status === 'active');
      }
    }

    if (!plan) {
      return {
        quoteRequestId: null,
        status: 'cancelled',
        submittedAt: null,
        planSummary: null,
        message: 'Plan not found.'
      };
    }

    const submittedAt = new Date().toISOString();
    const quoteRequest = {
      id: this._generateId('bqr'),
      internet_plan_id: plan.id,
      company_name: companyName,
      employees_count: employeesCount,
      email,
      phone_number: phoneNumber,
      submitted_at: submittedAt,
      status: 'new'
    };

    quoteRequests.push(quoteRequest);
    this._saveToStorage('business_quote_requests', quoteRequests);

    return {
      quoteRequestId: quoteRequest.id,
      status: quoteRequest.status,
      submittedAt,
      planSummary: {
        planId: plan.id,
        name: plan.name,
        priceDisplay: this._formatPriceMonthly(plan.price_monthly)
      },
      message: 'Quote request submitted.'
    };
  }

  // verifyServiceAddressForInstallation
  verifyServiceAddressForInstallation(customerType, streetLine1, streetLine2, city, state, zipCode, country) {
    const addresses = this._getFromStorage('addresses');
    const serviceAreas = this._getFromStorage('service_areas');

    const address = {
      id: this._generateId('addr'),
      street_line1: streetLine1,
      street_line2: streetLine2 || '',
      city,
      state: state || '',
      zip_code: zipCode,
      country: country || 'USA',
      latitude: null,
      longitude: null,
      address_type: 'service',
      created_at: new Date().toISOString()
    };

    addresses.push(address);
    this._saveToStorage('addresses', addresses);

    const sa = serviceAreas.find(s => s.zip_code === zipCode);
    const isServiceable = sa ? !!sa.fiber_available : false;

    return {
      addressId: address.id,
      normalizedAddress: {
        streetLine1,
        city,
        state: state || '',
        zipCode,
        country: country || 'USA'
      },
      isServiceable,
      customerType
    };
  }

  // getAvailableInstallationTimeSlots
  getAvailableInstallationTimeSlots(addressId, timeWindow) {
    const slots = this._getFromStorage('installation_time_slots').filter(s => s.time_window === timeWindow && s.is_available !== false);

    const days = this._groupSlotsByDate(slots.map(s => ({
      timeSlotId: s.id,
      startTime: s.start_time,
      endTime: s.end_time,
      label: `${new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(s.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      isAvailable: s.is_available !== false,
      start_time: s.start_time // keep original for grouping
    })));

    return {
      timeWindow,
      days
    };
  }

  // scheduleInstallationAppointment
  scheduleInstallationAppointment(addressId, timeSlotId, contactName, contactPhone, preferredContactMethod, customerType) {
    const addresses = this._getFromStorage('addresses');
    const slots = this._getFromStorage('installation_time_slots');
    const appointments = this._getFromStorage('installation_appointments');

    const address = addresses.find(a => a.id === addressId);
    const { valid, slot } = this._validateInstallationTimeSlot(addressId, timeSlotId);

    if (!address || !valid || !slot) {
      return {
        appointmentId: null,
        status: 'cancelled',
        address: null,
        timeSlot: null,
        contactName,
        contactPhone,
        preferredContactMethod,
        message: 'Invalid address or time slot.'
      };
    }

    const appointment = {
      id: this._generateId('appt'),
      customer_type: customerType,
      address_id: addressId,
      time_slot_id: timeSlotId,
      contact_name: contactName,
      contact_phone: contactPhone,
      preferred_contact_method: preferredContactMethod,
      created_at: new Date().toISOString(),
      status: 'scheduled'
    };

    appointments.push(appointment);
    this._saveToStorage('installation_appointments', appointments);

    // mark slot as no longer available
    const slotIdx = slots.findIndex(s => s.id === timeSlotId);
    if (slotIdx !== -1) {
      slots[slotIdx].is_available = false;
      this._saveToStorage('installation_time_slots', slots);
    }

    localStorage.setItem('currentInstallationAppointmentId', appointment.id);

    return {
      appointmentId: appointment.id,
      status: appointment.status,
      address: {
        streetLine1: address.street_line1,
        city: address.city,
        state: address.state,
        zipCode: address.zip_code
      },
      timeSlot: {
        startTime: slot.start_time,
        endTime: slot.end_time,
        timeWindow: slot.time_window,
        label: `${new Date(slot.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(slot.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      },
      contactName,
      contactPhone,
      preferredContactMethod,
      message: 'Installation appointment scheduled.'
    };
  }

  // getInstallationAppointmentDetails
  getInstallationAppointmentDetails(appointmentId) {
    const appointments = this._getFromStorage('installation_appointments');
    const addresses = this._getFromStorage('addresses');
    const slots = this._getFromStorage('installation_time_slots');

    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) {
      return {
        appointmentId: null,
        status: 'cancelled',
        address: null,
        timeSlot: null,
        contactName: '',
        contactPhone: '',
        preferredContactMethod: ''
      };
    }

    const address = addresses.find(a => a.id === appt.address_id);
    const slot = slots.find(s => s.id === appt.time_slot_id);

    return {
      appointmentId: appt.id,
      status: appt.status,
      address: address
        ? {
            streetLine1: address.street_line1,
            city: address.city,
            state: address.state,
            zipCode: address.zip_code
          }
        : null,
      timeSlot: slot
        ? {
            startTime: slot.start_time,
            endTime: slot.end_time,
            timeWindow: slot.time_window,
            label: `${new Date(slot.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(slot.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          }
        : null,
      contactName: appt.contact_name,
      contactPhone: appt.contact_phone,
      preferredContactMethod: appt.preferred_contact_method
    };
  }

  // getDemoAccountDashboard
  getDemoAccountDashboard() {
    const { services, bills } = this._getDemoAccountState();

    const activeServices = services.filter(s => s.status === 'active').map(s => ({
      serviceId: s.id,
      name: s.name,
      serviceType: s.service_type,
      speedMbps: s.speed_mbps || null,
      monthlyPrice: s.monthly_price,
      status: s.status
    }));

    let currentBill = null;
    for (const b of bills) {
      if (b.status === 'unpaid' || b.status === 'partially_paid' || b.status === 'past_due') {
        if (!currentBill || new Date(b.due_date) > new Date(currentBill.due_date)) {
          currentBill = b;
        }
      }
    }

    const currentBillSummary = currentBill
      ? {
          billId: currentBill.id,
          billingPeriodStart: currentBill.billing_period_start,
          billingPeriodEnd: currentBill.billing_period_end,
          dueDate: currentBill.due_date,
          amountDue: currentBill.amount_due,
          amountDueDisplay: this._formatCurrency(currentBill.amount_due || 0),
          status: currentBill.status
        }
      : null;

    const alerts = [];
    if (currentBill && currentBill.status === 'past_due') {
      alerts.push({ level: 'error', message: 'Your account is past due. Make a payment to avoid interruption.' });
    }
    if (services.some(s => s.status === 'suspended')) {
      alerts.push({ level: 'warning', message: 'One or more services are suspended.' });
    }

    const shortcuts = [
      { target: 'wifi_settings', label: 'Wi-Fi & Network', description: 'View and update Wi-Fi settings.' },
      { target: 'billing', label: 'Billing', description: 'View and pay your bill.' },
      { target: 'my_services', label: 'My Services', description: 'Manage your services.' },
      { target: 'shop_upgrade', label: 'Shop & Upgrade', description: 'Upgrade equipment and services.' },
      { target: 'outages_status', label: 'Outages', description: 'Check for service outages.' }
    ];

    return {
      activeServices,
      currentBillSummary,
      alerts,
      shortcuts
    };
  }

  // getWiFiSettings
  getWiFiSettings() {
    const networksRaw = this._getFromStorage('wifi_networks');
    const networks = networksRaw.map(n => ({
      networkId: n.id,
      name: n.name,
      passwordMasked: n.password ? '********' : '',
      securityMode: n.security_mode,
      isPrimary: !!n.is_primary,
      bandLabel: this._wifiBandLabel(n.band)
    }));

    const primary = networksRaw.find(n => n.is_primary === true);
    return {
      networks,
      primaryNetworkId: primary ? primary.id : (networks[0] ? networks[0].networkId : null)
    };
  }

  // updateWiFiNetworkSettings
  updateWiFiNetworkSettings(networkId, name, password, securityMode) {
    const networks = this._getFromStorage('wifi_networks');
    const idx = networks.findIndex(n => n.id === networkId);
    if (idx === -1) {
      return { success: false, updatedNetwork: null, message: 'Network not found.' };
    }

    networks[idx].name = name;
    networks[idx].password = password;
    networks[idx].security_mode = securityMode;
    networks[idx].last_updated = new Date().toISOString();

    this._saveToStorage('wifi_networks', networks);

    return {
      success: true,
      updatedNetwork: {
        networkId: networks[idx].id,
        name: networks[idx].name,
        securityMode: networks[idx].security_mode,
        lastUpdated: networks[idx].last_updated
      },
      message: 'Wi-Fi network updated.'
    };
  }

  // getBillingOverview
  getBillingOverview() {
    const bills = this._getFromStorage('bills');

    let currentBill = null;
    for (const b of bills) {
      if (b.status === 'unpaid' || b.status === 'partially_paid' || b.status === 'past_due') {
        if (!currentBill || new Date(b.due_date) > new Date(currentBill.due_date)) {
          currentBill = b;
        }
      }
    }

    const currentBillOut = currentBill
      ? {
          billId: currentBill.id,
          billingPeriodStart: currentBill.billing_period_start,
          billingPeriodEnd: currentBill.billing_period_end,
          dueDate: currentBill.due_date,
          totalAmount: currentBill.total_amount,
          amountDue: currentBill.amount_due,
          amountDueDisplay: this._formatCurrency(currentBill.amount_due || 0),
          status: currentBill.status
        }
      : null;

    const pastBills = bills
      .filter(b => !currentBill || b.id !== currentBill.id)
      .map(b => ({
        billId: b.id,
        billingPeriodStart: b.billing_period_start,
        billingPeriodEnd: b.billing_period_end,
        totalAmount: b.total_amount,
        status: b.status
      }));

    return {
      currentBill: currentBillOut,
      pastBills
    };
  }

  // getBillDetails
  getBillDetails(billId) {
    const bills = this._getFromStorage('bills');
    const bill = bills.find(b => b.id === billId);
    if (!bill) {
      return {
        billId: null,
        billingPeriodStart: null,
        billingPeriodEnd: null,
        dueDate: null,
        status: 'paid',
        lineItems: [],
        totalAmount: 0,
        amountDue: 0,
        amountDueDisplay: ''
      };
    }

    const lineItems = bill.line_items || [];

    return {
      billId: bill.id,
      billingPeriodStart: bill.billing_period_start,
      billingPeriodEnd: bill.billing_period_end,
      dueDate: bill.due_date,
      status: bill.status,
      lineItems,
      totalAmount: bill.total_amount,
      amountDue: bill.amount_due,
      amountDueDisplay: this._formatCurrency(bill.amount_due || 0)
    };
  }

  // makeOneTimePayment
  makeOneTimePayment(billId, amount, methodType, cardNumber, cardExpirationMonth, cardExpirationYear, cardSecurityCode, saveCard) {
    const bills = this._getFromStorage('bills');
    const payments = this._getFromStorage('payments');

    const bill = bills.find(b => b.id === billId);
    if (!bill) {
      return {
        paymentId: null,
        status: 'failed',
        amount: 0,
        currency: 'USD',
        billId,
        saveCard: !!saveCard,
        isOneTime: true,
        updatedBillSummary: null,
        message: 'Bill not found.'
      };
    }

    const paymentAmount = amount || 0;

    const payment = {
      id: this._generateId('pay'),
      bill_id: bill.id,
      amount: paymentAmount,
      currency: bill.currency || 'USD',
      method_type: methodType,
      card_last4: cardNumber ? cardNumber.slice(-4) : null,
      card_expiration_month: cardExpirationMonth,
      card_expiration_year: cardExpirationYear,
      save_card: !!saveCard,
      is_one_time: true,
      status: 'succeeded',
      created_at: new Date().toISOString()
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);

    const remaining = Math.max(0, (bill.amount_due || 0) - paymentAmount);
    bill.amount_due = remaining;
    if (remaining === 0) bill.status = 'paid';
    else if (remaining < bill.total_amount) bill.status = 'partially_paid';

    const idx = bills.findIndex(b => b.id === bill.id);
    if (idx !== -1) {
      bills[idx] = bill;
      this._saveToStorage('bills', bills);
    }

    const updatedBillSummary = {
      billId: bill.id,
      amountDue: bill.amount_due,
      amountDueDisplay: this._formatCurrency(bill.amount_due || 0),
      status: bill.status
    };

    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      billId: bill.id,
      saveCard: payment.save_card,
      isOneTime: payment.is_one_time,
      updatedBillSummary,
      message: 'Payment processed.'
    };
  }

  // getMyServices
  getMyServices() {
    const services = this._getFromStorage('services');
    const servicesOut = services.map(s => ({
      serviceId: s.id,
      name: s.name,
      serviceType: s.service_type,
      speedMbps: s.speed_mbps || null,
      monthlyPrice: s.monthly_price,
      status: s.status
    }));
    return { services: servicesOut };
  }

  // getServiceDetailsWithAddons
  getServiceDetailsWithAddons(serviceId) {
    const services = this._getFromStorage('services');
    const addons = this._getFromStorage('addons');
    const subs = this._getFromStorage('service_addon_subscriptions');

    const service = services.find(s => s.id === serviceId);
    if (!service) {
      return {
        service: null,
        currentAddons: [],
        availableAddons: [],
        orderSummaryPreview: {
          baseMonthlyPrice: 0,
          addonsMonthlyPrice: 0,
          totalMonthlyPrice: 0,
          totalMonthlyPriceDisplay: ''
        }
      };
    }

    const currentSubs = subs.filter(sa => sa.service_id === serviceId && sa.status !== 'cancelled');

    const currentAddons = currentSubs.map(sa => {
      const addon = addons.find(a => a.id === sa.addon_id);
      if (!addon) return null;
      return {
        addonId: addon.id,
        name: addon.name,
        priceMonthly: addon.price_monthly || 0,
        status: sa.status
      };
    }).filter(Boolean);

    const applicableAddons = addons.filter(a => {
      if (a.status !== 'active') return false;
      if (!Array.isArray(a.applicable_service_types) || a.applicable_service_types.length === 0) return true;
      return a.applicable_service_types.includes(service.service_type);
    });

    const availableAddons = applicableAddons.map(a => ({
      addonId: a.id,
      name: a.name,
      description: a.description || '',
      priceMonthly: a.price_monthly || 0,
      addonType: a.addon_type,
      isSelected: currentSubs.some(sa => sa.addon_id === a.id && sa.status !== 'cancelled')
    }));

    const baseMonthlyPrice = service.monthly_price || 0;
    const addonsMonthlyPrice = currentAddons.reduce((sum, a) => sum + (a.priceMonthly || 0), 0);
    const totalMonthlyPrice = baseMonthlyPrice + addonsMonthlyPrice;

    return {
      service: {
        serviceId: service.id,
        name: service.name,
        serviceType: service.service_type,
        speedMbps: service.speed_mbps || null,
        monthlyPrice: service.monthly_price,
        status: service.status
      },
      currentAddons,
      availableAddons,
      orderSummaryPreview: {
        baseMonthlyPrice,
        addonsMonthlyPrice,
        totalMonthlyPrice,
        totalMonthlyPriceDisplay: this._formatPriceMonthly(totalMonthlyPrice)
      }
    };
  }

  // addAddonToServiceForOrder
  addAddonToServiceForOrder(serviceId, addonId) {
    const services = this._getFromStorage('services');
    const addons = this._getFromStorage('addons');
    let subs = this._getFromStorage('service_addon_subscriptions');
    let orders = this._getFromStorage('orders');

    const service = services.find(s => s.id === serviceId);
    const addon = addons.find(a => a.id === addonId);

    if (!service || !addon) {
      return {
        orderId: null,
        serviceId,
        addon: null,
        summary: null,
        message: 'Service or addon not found.'
      };
    }

    // Create subscription in pending_activation
    const sub = {
      id: this._generateId('sub'),
      service_id: serviceId,
      addon_id: addonId,
      status: 'pending_activation',
      start_date: null,
      end_date: null,
      created_at: new Date().toISOString()
    };
    subs.push(sub);
    this._saveToStorage('service_addon_subscriptions', subs);

    // Get or create add_on_change order
    let order = this._getCurrentOrder();
    if (!order || order.order_type !== 'add_on_change') {
      order = {
        id: this._generateId('order'),
        order_type: 'add_on_change',
        cart_id: null,
        items: [],
        monthly_total: 0,
        one_time_total: 0,
        status: 'in_review',
        created_at: new Date().toISOString(),
        confirmed_at: null
      };
      orders.push(order);
      localStorage.setItem('currentOrderId', order.id);
    }

    order.items.push({
      lineType: 'addon',
      name: addon.name,
      description: addon.description || '',
      priceMonthly: addon.price_monthly || 0,
      priceOneTime: addon.price_one_time || 0
    });

    // Recalculate totals
    const baseMonthlyPrice = service.monthly_price || 0;
    const addonsMonthlyPrice = order.items.reduce((s, i) => s + (i.priceMonthly || 0), 0);
    const totalMonthlyPrice = baseMonthlyPrice + addonsMonthlyPrice;
    order.monthly_total = totalMonthlyPrice;

    const idx = orders.findIndex(o => o.id === order.id);
    if (idx === -1) orders.push(order);
    else orders[idx] = order;
    this._saveToStorage('orders', orders);

    return {
      orderId: order.id,
      serviceId: service.id,
      addon: {
        addonId: addon.id,
        name: addon.name,
        priceMonthly: addon.price_monthly || 0
      },
      summary: {
        baseMonthlyPrice,
        addonsMonthlyPrice,
        totalMonthlyPrice,
        totalMonthlyPriceDisplay: this._formatPriceMonthly(totalMonthlyPrice)
      },
      message: 'Addon added to service order.'
    };
  }

  // confirmServiceAddonOrder
  confirmServiceAddonOrder(orderId) {
    let orders = this._getFromStorage('orders');
    let subs = this._getFromStorage('service_addon_subscriptions');

    const order = orders.find(o => o.id === orderId && o.order_type === 'add_on_change');
    if (!order) {
      return { success: false, orderId, status: 'cancelled', message: 'Order not found.' };
    }

    order.status = 'submitted';
    order.confirmed_at = new Date().toISOString();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx !== -1) {
      orders[idx] = order;
      this._saveToStorage('orders', orders);
    }

    // For simplicity, activate all pending_activation subscriptions
    subs = subs.map(s => {
      if (s.status === 'pending_activation') {
        s.status = 'active';
        s.start_date = new Date().toISOString();
      }
      return s;
    });
    this._saveToStorage('service_addon_subscriptions', subs);

    return {
      success: true,
      orderId: order.id,
      status: order.status,
      message: 'Addon order confirmed.'
    };
  }

  // getShopCategories
  getShopCategories() {
    const products = this._getFromStorage('products');
    const categoriesMap = {};

    for (const p of products) {
      const cid = p.category_id;
      if (!cid) continue;
      if (!categoriesMap[cid]) {
        let name = cid;
        if (cid === 'equipment_wifi') name = 'Equipment & Wi-Fi';
        categoriesMap[cid] = { categoryId: cid, name, description: '' };
      }
    }

    const categories = Object.values(categoriesMap);
    return { categories };
  }

  // getEquipmentFilterOptions
  getEquipmentFilterOptions() {
    const products = this._getFromStorage('products').filter(p => p.category_id === 'equipment_wifi');

    const wifiStandardSet = new Set();
    const priceSet = new Set();
    const ratingSet = new Set();

    for (const p of products) {
      if (p.wifi_standard) wifiStandardSet.add(p.wifi_standard);
      if (p.rental_price_monthly != null) priceSet.add(p.rental_price_monthly);
      if (p.rating != null) ratingSet.add(Math.floor(p.rating * 10) / 10);
    }

    const wifiStandardOptions = Array.from(wifiStandardSet).map(v => ({
      value: v,
      label: this._wifiStandardLabel(v)
    }));

    const pricesSorted = Array.from(priceSet).sort((a, b) => a - b);
    const maxPriceSuggestions = pricesSorted.map(v => ({ value: v, label: this._formatCurrency(v) + '/mo or less' }));

    const ratingsSorted = Array.from(ratingSet).sort((a, b) => a - b);
    const ratingThresholdOptions = ratingsSorted.map(v => ({ value: v, label: `${v} stars & up` }));

    return {
      wifiStandardOptions,
      maxPriceSuggestions,
      ratingThresholdOptions
    };
  }

  // getEquipmentProducts
  getEquipmentProducts(categoryId, filters) {
    const productsAll = this._getFromStorage('products');
    const f = filters || {};

    let products = productsAll.filter(p => p.status === 'active' && p.category_id === categoryId);

    if (f.wifiStandard) {
      products = products.filter(p => p.wifi_standard === f.wifiStandard);
    }
    if (f.maxRentalPriceMonthly != null) {
      products = products.filter(p => (p.rental_price_monthly || 0) <= f.maxRentalPriceMonthly);
    }
    if (f.minRating != null) {
      products = products.filter(p => (p.rating || 0) >= f.minRating);
    }

    const productsOut = products.map(p => ({
      productId: p.id,
      name: p.name,
      wifiStandard: p.wifi_standard,
      rentalPriceMonthly: p.rental_price_monthly || 0,
      rentalPriceDisplay: p.rental_price_monthly != null ? this._formatPriceMonthly(p.rental_price_monthly) : '',
      purchasePrice: p.purchase_price || 0,
      rating: p.rating || 0,
      ratingCount: p.rating_count || 0,
      description: p.description || '',
      image: p.image || ''
    }));

    return {
      products: productsOut,
      totalCount: productsOut.length
    };
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const p = products.find(pr => pr.id === productId);
    if (!p) {
      return {
        productId: null,
        name: '',
        categoryId: '',
        wifiStandard: '',
        rentalPriceMonthly: 0,
        rentalPriceDisplay: '',
        purchasePrice: 0,
        purchasePriceDisplay: '',
        rating: 0,
        ratingCount: 0,
        description: '',
        features: [],
        image: ''
      };
    }

    return {
      productId: p.id,
      name: p.name,
      categoryId: p.category_id,
      wifiStandard: p.wifi_standard,
      rentalPriceMonthly: p.rental_price_monthly || 0,
      rentalPriceDisplay: p.rental_price_monthly != null ? this._formatPriceMonthly(p.rental_price_monthly) : '',
      purchasePrice: p.purchase_price || 0,
      purchasePriceDisplay: p.purchase_price != null ? this._formatCurrency(p.purchase_price) : '',
      rating: p.rating || 0,
      ratingCount: p.rating_count || 0,
      description: p.description || '',
      features: p.features || [],
      image: p.image || ''
    };
  }

  // addEquipmentToCart
  addEquipmentToCart(productId, quantity) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, cartItemId: null, cart: null, message: 'Product not found.' };
    }

    const q = quantity || 1;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'equipment',
      internet_plan_id: null,
      bundle_configuration_id: null,
      product_id: product.id,
      name_snapshot: product.name,
      quantity: q,
      price_monthly: product.rental_price_monthly || 0,
      price_one_time: product.purchase_price || 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cartItemId: cartItem.id,
      cart: {
        cartId: cart.id,
        itemCount: cart.items.length,
        monthlySubtotal: cart.monthly_total,
        oneTimeSubtotal: cart.one_time_total
      },
      message: 'Equipment added to cart.'
    };
  }

  // getOutageStatusByZip
  getOutageStatusByZip(zipCode) {
    const outages = this._getFromStorage('outage_statuses');
    const status = outages.find(o => o.zip_code === zipCode);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_outageCheckParams', JSON.stringify({ zipCode: zipCode }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!status) {
      return {
        zipCode,
        status: 'no_issues',
        description: 'No reported issues in this area.',
        affectedServices: [],
        estimatedResolution: null,
        lastUpdated: new Date().toISOString()
      };
    }

    return {
      zipCode: status.zip_code,
      status: status.status,
      description: status.description || '',
      affectedServices: status.affected_services || [],
      estimatedResolution: status.estimated_resolution || null,
      lastUpdated: status.last_updated
    };
  }

  // subscribeToOutageAlerts
  subscribeToOutageAlerts(zipCode, phoneNumber, notifyForFutureOutages) {
    const subs = this._getFromStorage('outage_alert_subscriptions');

    const sub = {
      id: this._generateId('outageSub'),
      zip_code: zipCode,
      phone_number: phoneNumber,
      notify_for_future_outages: !!notifyForFutureOutages,
      status: 'active',
      created_at: new Date().toISOString()
    };

    subs.push(sub);
    this._saveToStorage('outage_alert_subscriptions', subs);

    return {
      subscriptionId: sub.id,
      zipCode: sub.zip_code,
      phoneNumber: sub.phone_number,
      status: sub.status,
      message: 'Subscribed to outage alerts.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      headline: 'Building a faster, more reliable fiber network',
      bodyHtml:
        '<p>We are a regional fiber optic network provider delivering ultra-fast internet, TV, and phone services to homes and businesses.</p>' +
        '<p>Our mission is to make world-class connectivity simple, affordable, and dependable.</p>',
      coverageSummary: {
        statesServed: 0,
        citiesServed: 0,
        fiberRouteMiles: 0
      },
      highlights: [
        {
          title: '100% fiber backbone',
          description: 'Our network is built on dedicated fiber for consistent speeds and low latency.'
        },
        {
          title: 'Local customer support',
          description: 'Support teams based in the communities we serve.'
        }
      ]
    };
  }

  // getHelpCenterTopics
  getHelpCenterTopics(category) {
    const categoriesRaw = this._getFromStorage('help_categories');
    const topicsRaw = this._getFromStorage('help_topics');

    const categories = categoriesRaw.map(c => ({
      categoryId: c.id,
      name: c.name
    }));

    let topicsFiltered = topicsRaw;
    if (category) {
      const cat = categoriesRaw.find(c => c.id === category || c.name === category);
      if (cat) {
        topicsFiltered = topicsFiltered.filter(t => t.category_id === cat.id);
      }
    }

    const topics = topicsFiltered.map(t => ({
      topicId: t.id,
      title: t.title,
      categoryId: t.category_id,
      summary: t.summary || ''
    }));

    return {
      categories,
      topics
    };
  }

  // getHelpTopicDetails
  getHelpTopicDetails(topicId) {
    const topicsRaw = this._getFromStorage('help_topics');
    const topic = topicsRaw.find(t => t.id === topicId);
    if (!topic) {
      return {
        topicId: null,
        title: '',
        categoryId: null,
        bodyHtml: '',
        relatedTopics: []
      };
    }

    const relatedTopics = topicsRaw
      .filter(t => t.id !== topic.id && t.category_id === topic.category_id)
      .slice(0, 5)
      .map(t => ({ topicId: t.id, title: t.title }));

    return {
      topicId: topic.id,
      title: topic.title,
      categoryId: topic.category_id,
      bodyHtml: topic.body_html || '',
      relatedTopics
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