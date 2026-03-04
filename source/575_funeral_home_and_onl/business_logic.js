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

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    // Core generic keys from example (kept for compatibility, but not used heavily)
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
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Initialize entity tables as empty arrays if missing
    const tables = [
      'funeral_packages',
      'service_package_add_ons',
      'products',
      'product_variants',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'payments',
      'consultation_time_slots',
      'consultation_requests',
      'memorials',
      'memorial_funds',
      'guestbook_entries',
      'candle_tributes',
      'donations',
      'preplanning_packages',
      'preplanning_add_ons',
      'preplanning_sessions',
      'quotes',
      'catering_packages',
      'funeral_plans',
      'funeral_plan_items',
      'service_events',
      'rsvps'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Meta keys for current entities (do not initialize to a value, leave null if absent)
    const metaKeys = [
      'currentCartId',
      'currentOrderId',
      'currentPaymentId',
      'currentPrePlanningSessionId',
      'currentFuneralPlanId'
    ];
    metaKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '');
      }
    });
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseISODate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _parseYMDToDate(dateStr) {
    if (!dateStr) return null;
    // Expecting 'YYYY-MM-DD'
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _getCurrency() {
    return 'USD';
  }

  // -------------------- Meta Helpers --------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('currentCartId');
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('currentCartId', cart.id);
    }

    return cart;
  }

  _getOrCreateCurrentOrder(orderType) {
    const orders = this._getFromStorage('orders');
    let currentOrderId = localStorage.getItem('currentOrderId');
    let order = null;

    if (currentOrderId) {
      order = orders.find((o) => o.id === currentOrderId) || null;
    }

    if (!order) {
      order = {
        id: this._generateId('order'),
        orderType: orderType || 'services',
        status: 'draft',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: this._getCurrency(),
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
      localStorage.setItem('currentOrderId', order.id);
    } else if (orderType && order.orderType !== orderType) {
      // If type changes, mark as mixed when combining
      if (order.orderType !== 'mixed') {
        order.orderType = 'mixed';
        order.updatedAt = this._nowISO();
        this._saveToStorage('orders', orders);
      }
    }

    return order;
  }

  _getOrCreateFuneralPlan() {
    const plans = this._getFromStorage('funeral_plans');
    let currentFuneralPlanId = localStorage.getItem('currentFuneralPlanId');
    let plan = null;

    if (currentFuneralPlanId) {
      plan = plans.find((p) => p.id === currentFuneralPlanId) || null;
    }

    if (!plan) {
      plan = {
        id: this._generateId('funeralplan'),
        name: null,
        status: 'in_progress',
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      plans.push(plan);
      this._saveToStorage('funeral_plans', plans);
      localStorage.setItem('currentFuneralPlanId', plan.id);
    }

    return plan;
  }

  _getCurrentPrePlanningSession() {
    const sessions = this._getFromStorage('preplanning_sessions');
    const currentId = localStorage.getItem('currentPrePlanningSessionId');
    if (currentId) {
      const session = sessions.find((s) => s.id === currentId) || null;
      if (session) return session;
    }
    // If no explicit current, return the most recently created one, if any
    if (sessions.length === 0) return null;
    const sorted = sessions.slice().sort((a, b) => {
      const da = this._parseISODate(a.createdAt) || new Date(0);
      const db = this._parseISODate(b.createdAt) || new Date(0);
      return db - da;
    });
    return sorted[0];
  }

  _recalculateOrderTotals(orderId) {
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const orderItems = items.filter((i) => i.orderId === order.id);
    const subtotal = orderItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
    const tax = 0; // Business rule: no tax calculation implemented
    const total = subtotal + tax;

    order.subtotal = subtotal;
    order.tax = tax;
    order.total = total;
    order.updatedAt = this._nowISO();

    this._saveToStorage('orders', orders);
    return order;
  }

  _recalculatePrePlanningEstimatedTotal(session) {
    const packages = this._getFromStorage('preplanning_packages');
    const addOns = this._getFromStorage('preplanning_add_ons');

    const pkg = packages.find((p) => p.id === session.selectedPackageId) || null;
    const selectedAddOns = (session.selectedAddOnIds || []).map(
      (id) => addOns.find((a) => a.id === id) || null
    ).filter(Boolean);

    let total = 0;
    if (pkg) total += pkg.price || 0;
    selectedAddOns.forEach((a) => {
      total += a.price || 0;
    });

    session.estimatedTotal = total;
    return session;
  }

  // -------------------- Compatibility Example Method (optional) --------------------

  // Simple wrapper to map older-style addToCart to new addProductToCart
  addToCart(userId, productId, quantity = 1) {
    // Here we don't track userId; this is just a compatibility shim.
    // We can't infer variant, delivery, or time, so this is a no-op aside from validation.
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found', cartId: null };
    }
    const cart = this._getOrCreateCart();
    return { success: true, cartId: cart.id };
  }

  // -------------------- Interfaces Implementation --------------------

  // 1. getHomeFeaturedContent
  getHomeFeaturedContent() {
    const funeralPackages = this._getFromStorage('funeral_packages');
    const cateringPackages = this._getFromStorage('catering_packages');
    const products = this._getFromStorage('products');

    const sortByRatingDesc = (arr, ratingKey) =>
      arr
        .filter((x) => x.status === 'active')
        .slice()
        .sort((a, b) => (b[ratingKey] || 0) - (a[ratingKey] || 0));

    const featuredFuneralPackages = sortByRatingDesc(funeralPackages, 'rating').slice(0, 3);
    const featuredCateringPackages = sortByRatingDesc(cateringPackages, 'rating').slice(0, 3);
    const featuredProducts = sortByRatingDesc(products, 'averageRating').slice(0, 3);

    const guidanceHighlights = [
      {
        id: 'guide_plan_funeral',
        title: 'Planning a Funeral Service',
        summary: 'Step-by-step guidance for planning a meaningful service.',
        routeKey: 'plan_funeral'
      },
      {
        id: 'guide_pre_planning',
        title: 'Pre-Planning Your Arrangements',
        summary: 'Learn how pre-planning can ease the burden on loved ones.',
        routeKey: 'pre_planning'
      },
      {
        id: 'guide_support',
        title: 'Grief & Support Resources',
        summary: 'Articles and resources to support you through loss.',
        routeKey: 'support_resources'
      }
    ];

    return {
      featuredFuneralPackages,
      featuredCateringPackages,
      featuredProducts,
      guidanceHighlights
    };
  }

  // 2. searchMemorials
  searchMemorials(
    query,
    dateOfPassingFrom,
    dateOfPassingTo,
    dateOfPassingPreset,
    hasMemorialFund,
    acceptsDonations,
    page = 1,
    pageSize = 20
  ) {
    let memorials = this._getFromStorage('memorials').filter((m) => m.status === 'active');

    // Enrich memorials with fund information and synthesize missing memorials
    const memorialFunds = this._getFromStorage('memorial_funds');
    const serviceEvents = this._getFromStorage('service_events');

    memorialFunds.forEach((fund) => {
      if (!fund.isActive) return;
      let mem = memorials.find((m) => m.id === fund.memorialId);
      if (mem) {
        // Any memorial with an active fund should be treated as having a fund and accepting donations
        mem.hasMemorialFund = true;
        mem.acceptsDonations = true;
      } else {
        // Create a minimal memorial record when funds reference a non-existent memorial (e.g., John Smith)
        const relatedEvent = serviceEvents.find((e) => e.memorialId === fund.memorialId) || null;
        const fullName = relatedEvent && relatedEvent.honoreeName ? relatedEvent.honoreeName : '';
        const dateOfPassing = relatedEvent && relatedEvent.startDateTime ? relatedEvent.startDateTime : null;

        mem = {
          id: fund.memorialId,
          fullName,
          dateOfBirth: null,
          dateOfPassing,
          biography: '',
          templateKey: 'classic',
          themeKey: 'neutral',
          portraitKey: null,
          visibility: 'public',
          guestbookEnabled: false,
          candleLightingEnabled: false,
          hasMemorialFund: true,
          acceptsDonations: true,
          status: 'active',
          createdAt: this._nowISO(),
          updatedAt: this._nowISO()
        };
        memorials.push(mem);
      }
    });

    // Persist synthesized/updated memorials so other methods (e.g., donation options) see consistent data
    this._saveToStorage('memorials', memorials);

    if (query) {
      const q = String(query).toLowerCase();
      memorials = memorials.filter((m) =>
        (m.fullName || '').toLowerCase().includes(q)
      );
    }

    let fromDate = null;
    let toDate = null;

    if (dateOfPassingPreset && !dateOfPassingFrom && !dateOfPassingTo) {
      const now = new Date();
      if (dateOfPassingPreset === 'last_7_days') {
        toDate = now;
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateOfPassingPreset === 'last_30_days') {
        toDate = now;
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateOfPassingPreset === 'all_time') {
        fromDate = null;
        toDate = null;
      }
    }

    if (dateOfPassingFrom) {
      fromDate = this._parseYMDToDate(dateOfPassingFrom);
    }
    if (dateOfPassingTo) {
      toDate = this._parseYMDToDate(dateOfPassingTo);
      if (toDate) {
        // include full day
        toDate.setHours(23, 59, 59, 999);
      }
    }

    if (fromDate || toDate) {
      memorials = memorials.filter((m) => {
        if (!m.dateOfPassing) return false;
        const d = this._parseISODate(m.dateOfPassing) || this._parseYMDToDate(m.dateOfPassing);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    if (typeof hasMemorialFund === 'boolean') {
      memorials = memorials.filter((m) => m.hasMemorialFund === hasMemorialFund);
    }

    if (typeof acceptsDonations === 'boolean') {
      memorials = memorials.filter((m) => m.acceptsDonations === acceptsDonations);
    }

    const total = memorials.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = memorials.slice(start, end);

    const results = paged.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      dateOfBirth: m.dateOfBirth || null,
      dateOfPassing: m.dateOfPassing || null,
      biographySnippet: (m.biography || '').slice(0, 200),
      guestbookEnabled: !!m.guestbookEnabled,
      candleLightingEnabled: !!m.candleLightingEnabled,
      hasMemorialFund: !!m.hasMemorialFund,
      acceptsDonations: !!m.acceptsDonations
    }));

    return { results, total };
  }

  // 3. getFuneralPlanningOverview
  getFuneralPlanningOverview() {
    const serviceTypes = [
      {
        key: 'traditional_burial',
        name: 'Traditional Burial',
        description: 'Complete services for a traditional burial.',
        routeKey: 'traditional_burial_services'
      },
      {
        key: 'cremation',
        name: 'Cremation Services',
        description: 'Flexible options for cremation with or without services.',
        routeKey: 'cremation_services'
      },
      {
        key: 'memorial_service',
        name: 'Memorial Services',
        description: 'Services honoring a loved one without the body present.',
        routeKey: 'memorial_services'
      }
    ];

    const guides = [
      {
        id: 'guide_what_to_do',
        title: 'What to Do When a Death Occurs',
        summary: 'Immediate steps to take and how we can help.',
        routeKey: 'guide_what_to_do'
      },
      {
        id: 'guide_celebration_of_life',
        title: 'Planning a Celebration of Life',
        summary: 'Ideas for creating a meaningful tribute.',
        routeKey: 'guide_celebration_of_life'
      }
    ];

    return { serviceTypes, guides };
  }

  // 4. getCremationPackageFilterOptions
  getCremationPackageFilterOptions() {
    const packages = this._getFromStorage('funeral_packages').filter(
      (p) => p.packageType === 'cremation' && p.status === 'active'
    );

    const maxPrice = packages.reduce((max, p) => Math.max(max, p.basePrice || 0), 0);
    const maxPriceLimit = maxPrice || 0;
    const priceStep = maxPriceLimit > 0 ? Math.max(50, Math.round(maxPriceLimit / 20)) : 50;

    const supportsVisitationFilter = packages.some((p) => !!p.includesVisitation);
    const supportsUrnIncludedFilter = packages.some((p) => !!p.includesUrn);

    const sortOptions = [
      { key: 'total_price_asc', label: 'Total Price: Low to High' },
      { key: 'total_price_desc', label: 'Total Price: High to Low' },
      { key: 'rating_desc', label: 'Customer Rating: High to Low' }
    ];

    return {
      maxPriceLimit,
      priceStep,
      supportsVisitationFilter,
      supportsUrnIncludedFilter,
      sortOptions
    };
  }

  // 5. searchFuneralPackages
  searchFuneralPackages(packageType, filters, sortBy, pricingContext, page = 1, pageSize = 20) {
    filters = filters || {};
    pricingContext = pricingContext || {};

    let packages = this._getFromStorage('funeral_packages').filter(
      (p) => p.status === 'active'
    );

    if (packageType) {
      packages = packages.filter((p) => p.packageType === packageType);
    }

    if (typeof filters.maxBasePrice === 'number') {
      packages = packages.filter((p) => (p.basePrice || 0) <= filters.maxBasePrice);
    }
    if (typeof filters.includesVisitation === 'boolean') {
      packages = packages.filter((p) => !!p.includesVisitation === filters.includesVisitation);
    }
    if (typeof filters.includesUrn === 'boolean') {
      packages = packages.filter((p) => !!p.includesUrn === filters.includesUrn);
    }
    if (typeof filters.minRating === 'number') {
      packages = packages.filter((p) => (p.rating || 0) >= filters.minRating);
    }

    const guestCount = pricingContext.guestCount || null;

    const effectiveTotal = (p) => {
      if (p.priceUnit === 'per_guest' && guestCount) {
        return (p.basePrice || 0) * guestCount;
      }
      return p.basePrice || 0;
    };

    if (sortBy === 'total_price_asc') {
      packages.sort((a, b) => effectiveTotal(a) - effectiveTotal(b));
    } else if (sortBy === 'total_price_desc') {
      packages.sort((a, b) => effectiveTotal(b) - effectiveTotal(a));
    } else if (sortBy === 'rating_desc') {
      packages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = packages.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = packages.slice(start, end);

    return {
      results,
      total,
      appliedSort: sortBy || null
    };
  }

  // 6. getFuneralPackageDetails
  getFuneralPackageDetails(packageId) {
    const packages = this._getFromStorage('funeral_packages');
    const addOnsAll = this._getFromStorage('service_package_add_ons');

    const pkg = packages.find((p) => p.id === packageId) || null;
    const addOnsRaw = addOnsAll.filter(
      (a) => a.servicePackageId === packageId && a.status === 'active'
    );

    // FK resolution for ServicePackageAddOn.servicePackageId -> servicePackage
    const addOns = addOnsRaw.map((a) => ({
      ...a,
      servicePackage: pkg || null
    }));

    return {
      package: pkg
        ? {
            id: pkg.id,
            name: pkg.name,
            packageType: pkg.packageType,
            description: pkg.description,
            basePrice: pkg.basePrice,
            priceUnit: pkg.priceUnit,
            minGuests: pkg.minGuests,
            maxGuests: pkg.maxGuests,
            includesVisitation: pkg.includesVisitation,
            includesUrn: pkg.includesUrn,
            rating: pkg.rating,
            imageUrl: pkg.imageUrl
          }
        : null,
      addOns
    };
  }

  // 7. proceedToCheckoutWithFuneralPackage
  proceedToCheckoutWithFuneralPackage(packageId, configuration) {
    configuration = configuration || {};
    const packages = this._getFromStorage('funeral_packages');
    const addOnsAll = this._getFromStorage('service_package_add_ons');
    const orderItems = this._getFromStorage('order_items');

    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      return { orderSummary: null };
    }

    const guestCount = configuration.guestCount || 0;
    const serviceDate = configuration.serviceDate; // 'YYYY-MM-DD'
    const serviceTime = configuration.serviceTime; // 'HH:MM'
    const selectedAddOnIds = configuration.selectedAddOnIds || [];
    const notes = configuration.notes || '';

    const serviceDateTime = serviceDate && serviceTime
      ? `${serviceDate}T${serviceTime}:00`
      : null;

    let baseTotal = 0;
    if (pkg.priceUnit === 'per_guest' && guestCount) {
      baseTotal = (pkg.basePrice || 0) * guestCount;
    } else {
      baseTotal = pkg.basePrice || 0;
    }

    const selectedAddOns = selectedAddOnIds
      .map((id) => addOnsAll.find((a) => a.id === id))
      .filter(Boolean);

    const addOnTotal = selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
    const totalPrice = baseTotal + addOnTotal;

    const order = this._getOrCreateCurrentOrder('services');

    const item = {
      id: this._generateId('orderitem'),
      orderId: order.id,
      itemType: 'funeral_package',
      referenceId: pkg.id,
      name: pkg.name,
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice: totalPrice,
      serviceDateTime: serviceDateTime,
      guestCount: guestCount,
      deliveryDateTime: null,
      notes: notes,
      createdAt: this._nowISO()
    };

    orderItems.push(item);
    this._saveToStorage('order_items', orderItems);

    const updatedOrder = this._recalculateOrderTotals(order.id);

    const itemsForSummary = orderItems
      .filter((i) => i.orderId === updatedOrder.id)
      .map((i) => ({
        itemId: i.id,
        itemType: i.itemType,
        name: i.name,
        guestCount: i.guestCount || null,
        serviceDateTime: i.serviceDateTime || null,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice
      }));

    return {
      orderSummary: {
        orderId: updatedOrder.id,
        orderType: updatedOrder.orderType,
        status: updatedOrder.status,
        items: itemsForSummary,
        subtotal: updatedOrder.subtotal,
        tax: updatedOrder.tax,
        total: updatedOrder.total,
        currency: updatedOrder.currency
      }
    };
  }

  // 8. getCheckoutSummary
  getCheckoutSummary() {
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const funeralPackages = this._getFromStorage('funeral_packages');
    const cateringPackages = this._getFromStorage('catering_packages');
    const products = this._getFromStorage('products');

    let currentOrderId = localStorage.getItem('currentOrderId');
    let order = null;

    if (currentOrderId) {
      order = orders.find((o) => o.id === currentOrderId) || null;
    }
    if (!order && orders.length > 0) {
      order = orders[orders.length - 1];
      localStorage.setItem('currentOrderId', order.id);
    }

    if (!order) {
      return { order: null, items: [] };
    }

    const itemsRaw = orderItems.filter((i) => i.orderId === order.id);

    const items = itemsRaw.map((i) => {
      let refObject = null;
      if (i.itemType === 'funeral_package') {
        refObject = funeralPackages.find((p) => p.id === i.referenceId) || null;
      } else if (i.itemType === 'catering_package') {
        refObject = cateringPackages.find((c) => c.id === i.referenceId) || null;
      } else if (i.itemType === 'flower_product') {
        refObject = products.find((p) => p.id === i.referenceId) || null;
      }

      return {
        ...i,
        // FK resolution: orderId -> order
        order: order,
        // Additional convenience reference based on itemType
        reference: refObject
      };
    });

    return {
      order: {
        orderId: order.id,
        orderType: order.orderType,
        status: order.status,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
        contactEmail: order.contactEmail,
        specialInstructions: order.specialInstructions || '',
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        currency: order.currency
      },
      items
    };
  }

  // 9. updateCheckoutContactInfo
  updateCheckoutContactInfo(contactName, contactPhone, contactEmail, specialInstructions) {
    const orders = this._getFromStorage('orders');

    let order = null;
    let currentOrderId = localStorage.getItem('currentOrderId');
    if (currentOrderId) {
      order = orders.find((o) => o.id === currentOrderId) || null;
    }
    if (!order) {
      order = this._getOrCreateCurrentOrder('services');
    }

    order.contactName = contactName;
    order.contactPhone = contactPhone;
    order.contactEmail = contactEmail;
    order.specialInstructions = specialInstructions || '';
    order.updatedAt = this._nowISO();

    // Persist change
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
      this._saveToStorage('orders', orders);
    }

    return {
      order: {
        orderId: order.id,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
        contactEmail: order.contactEmail,
        specialInstructions: order.specialInstructions,
        status: order.status
      }
    };
  }

  // 10. continueOrderToPayment
  continueOrderToPayment() {
    const orders = this._getFromStorage('orders');
    const payments = this._getFromStorage('payments');

    let currentOrderId = localStorage.getItem('currentOrderId');
    let order = null;
    if (currentOrderId) {
      order = orders.find((o) => o.id === currentOrderId) || null;
    }
    if (!order && orders.length > 0) {
      order = orders[orders.length - 1];
      localStorage.setItem('currentOrderId', order.id);
    }

    if (!order) {
      return { payment: null, order: null };
    }

    const updatedOrder = this._recalculateOrderTotals(order.id);
    updatedOrder.status = 'pending_payment';
    updatedOrder.updatedAt = this._nowISO();

    const orderIdx = orders.findIndex((o) => o.id === updatedOrder.id);
    if (orderIdx >= 0) {
      orders[orderIdx] = updatedOrder;
      this._saveToStorage('orders', orders);
    }

    const paymentId = this._generateId('payment');
    const paymentRecord = {
      id: paymentId,
      orderId: updatedOrder.id,
      donationId: null,
      amount: updatedOrder.total,
      currency: updatedOrder.currency,
      paymentMethodType: 'card',
      status: 'not_started',
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    payments.push(paymentRecord);
    this._saveToStorage('payments', payments);
    localStorage.setItem('currentPaymentId', paymentId);

    return {
      payment: {
        paymentId: paymentRecord.id,
        orderId: paymentRecord.orderId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: paymentRecord.status
      },
      order: {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        total: updatedOrder.total
      }
    };
  }

  // 11. getPaymentSummary
  getPaymentSummary(paymentId) {
    const payments = this._getFromStorage('payments');
    const orders = this._getFromStorage('orders');
    const donations = this._getFromStorage('donations');
    const memorials = this._getFromStorage('memorials');
    const memorialFunds = this._getFromStorage('memorial_funds');

    let payment = null;

    if (paymentId) {
      payment = payments.find((p) => p.id === paymentId) || null;
    } else {
      // Most recent pending payment
      const pendingStatuses = ['not_started', 'in_progress', 'authorized'];
      const pending = payments.filter((p) => pendingStatuses.includes(p.status));
      if (pending.length > 0) {
        pending.sort((a, b) => {
          const da = this._parseISODate(a.createdAt) || new Date(0);
          const db = this._parseISODate(b.createdAt) || new Date(0);
          return db - da;
        });
        payment = pending[0];
      } else if (payments.length > 0) {
        payment = payments[payments.length - 1];
      }
    }

    if (!payment) {
      return { payment: null, context: null };
    }

    let context = { type: null, summaryTitle: '', summaryDescription: '' };
    let order = null;
    let donation = null;

    if (payment.orderId) {
      order = orders.find((o) => o.id === payment.orderId) || null;
      context.type = 'order';
      context.summaryTitle = 'Order Payment';
      context.summaryDescription = order
        ? `Payment for order ${order.id}`
        : 'Order payment';
    } else if (payment.donationId) {
      donation = donations.find((d) => d.id === payment.donationId) || null;
      let memorialName = '';
      if (donation) {
        const mem = memorials.find((m) => m.id === donation.memorialId) || null;
        if (mem) memorialName = mem.fullName;
      }
      context.type = 'donation';
      context.summaryTitle = 'Memorial Donation';
      context.summaryDescription = memorialName
        ? `Donation in memory of ${memorialName}`
        : 'Memorial donation';
    }

    // FK resolution for Payment.orderId and Payment.donationId
    const paymentWithFK = {
      paymentId: payment.id,
      orderId: payment.orderId || null,
      donationId: payment.donationId || null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      order: order,
      donation: donation
    };

    // Additionally enrich donation with fund/memorial when applicable
    if (paymentWithFK.donation) {
      const d = paymentWithFK.donation;
      const mem = memorials.find((m) => m.id === d.memorialId) || null;
      const fund = d.fundId
        ? memorialFunds.find((f) => f.id === d.fundId) || null
        : null;
      paymentWithFK.donation = { ...d, memorial: mem, fund: fund };
    }

    return { payment: paymentWithFK, context };
  }

  // 12. submitPayment
  submitPayment(paymentId, paymentMethod) {
    const payments = this._getFromStorage('payments');
    const orders = this._getFromStorage('orders');
    const donations = this._getFromStorage('donations');

    const payment = payments.find((p) => p.id === paymentId) || null;
    if (!payment) {
      return { payment: null, order: null };
    }

    payment.paymentMethodType = paymentMethod.paymentMethodType || payment.paymentMethodType || 'card';
    payment.status = 'captured';
    payment.updatedAt = this._nowISO();

    const pIdx = payments.findIndex((p) => p.id === payment.id);
    if (pIdx >= 0) {
      payments[pIdx] = payment;
      this._saveToStorage('payments', payments);
    }

    let orderResult = null;

    if (payment.orderId) {
      const order = orders.find((o) => o.id === payment.orderId) || null;
      if (order) {
        order.status = 'paid';
        order.updatedAt = this._nowISO();
        const oIdx = orders.findIndex((o) => o.id === order.id);
        if (oIdx >= 0) {
          orders[oIdx] = order;
          this._saveToStorage('orders', orders);
        }
        orderResult = { orderId: order.id, status: order.status };
      }
    }

    if (payment.donationId) {
      const donation = donations.find((d) => d.id === payment.donationId) || null;
      if (donation) {
        donation.status = 'paid';
        donation.createdAt = donation.createdAt || this._nowISO();
        const dIdx = donations.findIndex((d) => d.id === donation.id);
        if (dIdx >= 0) {
          donations[dIdx] = donation;
          this._saveToStorage('donations', donations);
        }
      }
    }

    return {
      payment: {
        paymentId: payment.id,
        status: payment.status
      },
      order: orderResult
    };
  }

  // 13. getFlowerCategories
  getFlowerCategories() {
    return [
      { key: 'standing_sprays', name: 'Standing Sprays', description: 'Elegant standing sprays for services.' },
      { key: 'wreaths', name: 'Wreaths', description: 'Circle wreaths for the service or graveside.' },
      { key: 'bouquets', name: 'Bouquets', description: 'Hand-tied and vase bouquets.' },
      { key: 'plants', name: 'Plants', description: 'Lasting green and blooming plants.' },
      { key: 'gifts', name: 'Gifts', description: 'Keepsakes and sympathy gifts.' }
    ];
  }

  // 14. getFlowerFilterOptions
  getFlowerFilterOptions(categoryKey) {
    const products = this._getFromStorage('products').filter((p) => p.status === 'active');
    const variants = this._getFromStorage('product_variants');

    const relevantProducts = categoryKey
      ? products.filter((p) => p.category === categoryKey)
      : products;

    let minPrice = null;
    let maxPrice = null;

    relevantProducts.forEach((p) => {
      const pv = variants.filter((v) => v.productId === p.id && v.status === 'active');
      pv.forEach((v) => {
        const price = v.price || 0;
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      });
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const step = maxPrice > 0 ? Math.max(5, Math.round(maxPrice / 20)) : 5;

    const colorOptions = [
      { key: 'white', label: 'White' },
      { key: 'red', label: 'Red' },
      { key: 'pink', label: 'Pink' },
      { key: 'yellow', label: 'Yellow' },
      { key: 'purple', label: 'Purple' },
      { key: 'mixed', label: 'Mixed' },
      { key: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { key: 'rating_desc', label: 'Customer Rating: High to Low' },
      { key: 'price_asc', label: 'Price: Low to High' },
      { key: 'price_desc', label: 'Price: High to Low' }
    ];

    return {
      colorOptions,
      price: {
        min: minPrice,
        max: maxPrice,
        step
      },
      sortOptions
    };
  }

  // 15. searchProducts
  searchProducts(category, filters, sortBy, page = 1, pageSize = 20) {
    filters = filters || {};

    const products = this._getFromStorage('products').filter((p) => p.status === 'active');
    const variants = this._getFromStorage('product_variants');

    let filtered = products;
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (filters.baseColor) {
      filtered = filtered.filter((p) => p.baseColor === filters.baseColor);
    }

    // Filter by maxPrice (based on any variant <= maxPrice)
    if (typeof filters.maxPrice === 'number') {
      filtered = filtered.filter((p) => {
        const pv = variants.filter((v) => v.productId === p.id && v.status === 'active');
        if (pv.length === 0) return false;
        return pv.some((v) => (v.price || 0) <= filters.maxPrice);
      });
    }

    const productMinVariantPrice = (p) => {
      const pv = variants.filter((v) => v.productId === p.id && v.status === 'active');
      if (pv.length === 0) return 0;
      return pv.reduce((min, v) => {
        const price = v.price || 0;
        return min === null || price < min ? price : min;
      }, null) || 0;
    };

    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => productMinVariantPrice(a) - productMinVariantPrice(b));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => productMinVariantPrice(b) - productMinVariantPrice(a));
    } else if (sortBy === 'rating_desc') {
      filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      results: filtered.slice(start, end),
      total,
      appliedSort: sortBy || null
    };
  }

  // 16. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const variantsAll = this._getFromStorage('product_variants');

    const product = products.find((p) => p.id === productId) || null;
    const variantsRaw = variantsAll.filter(
      (v) => v.productId === productId && v.status === 'active'
    );

    // FK resolution: ProductVariant.productId -> product
    const variants = variantsRaw.map((v) => ({
      ...v,
      product: product
    }));

    return {
      product: product
        ? {
            id: product.id,
            name: product.name,
            category: product.category,
            description: product.description,
            baseColor: product.baseColor,
            averageRating: product.averageRating,
            reviewCount: product.reviewCount,
            imageUrl: product.imageUrl
          }
        : null,
      variants
    };
  }

  // 17. addProductToCart
  addProductToCart(
    productId,
    productVariantId,
    quantity,
    deliveryDate,
    deliveryTime,
    cardMessage
  ) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const product = products.find((p) => p.id === productId) || null;
    const variant = variants.find((v) => v.id === productVariantId) || null;

    const unitPrice = variant ? variant.price || 0 : 0;
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const deliveryDateTime = deliveryDate && deliveryTime
      ? `${deliveryDate}T${deliveryTime}:00`
      : null;

    const cartItem = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      productId: productId,
      productVariantId: productVariantId,
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice: unitPrice * qty,
      deliveryDateTime: deliveryDateTime,
      cardMessage: cardMessage || '',
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Recalculate cart summary
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.totalPrice || 0), 0);
    const itemCount = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    cart.updatedAt = this._nowISO();
    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx >= 0) {
      carts[cIdx] = cart;
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      cart: {
        cartId: cart.id,
        itemCount,
        subtotal,
        currency: this._getCurrency()
      }
    };
  }

  // 18. getCartSummary
  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    let currentCartId = localStorage.getItem('currentCartId');
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }
    if (!cart && carts.length > 0) {
      cart = carts[carts.length - 1];
      localStorage.setItem('currentCartId', cart.id);
    }

    if (!cart) {
      return { cart: null, items: [] };
    }

    const itemsRaw = cartItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsRaw.map((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      const variant = variants.find((v) => v.id === ci.productVariantId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: product ? product.name : '',
        productVariantId: ci.productVariantId,
        size: variant ? variant.size : null,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        deliveryDateTime: ci.deliveryDateTime,
        cardMessage: ci.cardMessage,
        imageUrl: product ? product.imageUrl : null,
        // FK resolution
        cart: cart,
        product: product,
        productVariant: variant
      };
    });

    const subtotal = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

    return {
      cart: {
        cartId: cart.id,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        subtotal,
        currency: this._getCurrency()
      },
      items
    };
  }

  // 19. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const itemIdx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIdx === -1) {
      return { cart: null, items: [] };
    }

    const item = cartItems[itemIdx];
    const cart = carts.find((c) => c.id === item.cartId) || null;

    if (!cart) {
      return { cart: null, items: [] };
    }

    if (quantity <= 0) {
      cartItems.splice(itemIdx, 1);
    } else {
      item.quantity = quantity;
      item.totalPrice = (item.unitPrice || 0) * quantity;
      item.updatedAt = this._nowISO();
      cartItems[itemIdx] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.totalPrice || 0), 0);

    cart.updatedAt = this._nowISO();
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx >= 0) {
      carts[cIdx] = cart;
      this._saveToStorage('carts', carts);
    }

    return {
      cart: {
        cartId: cart.id,
        subtotal
      },
      items: itemsForCart
    };
  }

  // 20. removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const itemIdx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIdx === -1) {
      return { cart: null, items: [] };
    }

    const item = cartItems[itemIdx];
    const cart = carts.find((c) => c.id === item.cartId) || null;
    if (!cart) {
      return { cart: null, items: [] };
    }

    cartItems.splice(itemIdx, 1);
    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.totalPrice || 0), 0);

    cart.updatedAt = this._nowISO();
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx >= 0) {
      carts[cIdx] = cart;
      this._saveToStorage('carts', carts);
    }

    return {
      cart: {
        cartId: cart.id,
        subtotal
      },
      items: itemsForCart
    };
  }

  // 21. proceedCartToCheckout
  proceedCartToCheckout() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const products = this._getFromStorage('products');

    let currentCartId = localStorage.getItem('currentCartId');
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }
    if (!cart && carts.length > 0) {
      cart = carts[carts.length - 1];
      localStorage.setItem('currentCartId', cart.id);
    }

    if (!cart) {
      return { orderSummary: null };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    if (itemsForCart.length === 0) {
      return { orderSummary: null };
    }

    const order = {
      id: this._generateId('order'),
      orderType: 'products',
      status: 'draft',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      subtotal: 0,
      tax: 0,
      total: 0,
      currency: this._getCurrency(),
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    localStorage.setItem('currentOrderId', order.id);

    itemsForCart.forEach((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      const orderItem = {
        id: this._generateId('orderitem'),
        orderId: order.id,
        itemType: 'flower_product',
        referenceId: ci.productId,
        name: product ? product.name : '',
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        serviceDateTime: null,
        guestCount: null,
        deliveryDateTime: ci.deliveryDateTime,
        notes: ci.cardMessage || '',
        createdAt: this._nowISO()
      };
      orderItems.push(orderItem);
    });

    this._saveToStorage('order_items', orderItems);

    const updatedOrder = this._recalculateOrderTotals(order.id);

    const itemsForOrderSummary = orderItems
      .filter((oi) => oi.orderId === updatedOrder.id)
      .map((oi) => oi);

    // Optionally clear cart
    const remainingCartItems = cartItems.filter((ci) => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    return {
      orderSummary: {
        orderId: updatedOrder.id,
        orderType: updatedOrder.orderType,
        status: updatedOrder.status,
        items: itemsForOrderSummary,
        subtotal: updatedOrder.subtotal,
        tax: updatedOrder.tax,
        total: updatedOrder.total,
        currency: updatedOrder.currency
      }
    };
  }

  // 22. getConsultationOptions
  getConsultationOptions() {
    const consultationTypes = [
      { key: 'in_person', label: 'In-person consultation' },
      { key: 'virtual', label: 'Virtual consultation' }
    ];

    const locations = [
      { key: 'main_chapel_office', label: 'Main Chapel Office' },
      { key: 'north_side_office', label: 'North Side Office' },
      { key: 'online', label: 'Online / Video' }
    ];

    return { consultationTypes, locations };
  }

  // 23. getConsultationAvailability
  getConsultationAvailability(consultationType, location, weekStartDate) {
    const slots = this._getFromStorage('consultation_time_slots');

    const weekStart = this._parseYMDToDate(weekStartDate);
    if (!weekStart) return [];

    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    weekEnd.setHours(23, 59, 59, 999);

    return slots.filter((s) => {
      if (s.consultationType !== consultationType) return false;
      if (s.location !== location) return false;
      if (!s.isAvailable) return false;
      const start = this._parseISODate(s.startDateTime);
      if (!start) return false;
      if (start < weekStart || start > weekEnd) return false;
      return true;
    });
  }

  // 24. submitConsultationRequest
  submitConsultationRequest(
    consultationType,
    location,
    timeSlotId,
    requestedStartDateTime,
    contactName,
    contactPhone,
    contactEmail,
    notes
  ) {
    const requests = this._getFromStorage('consultation_requests');

    const request = {
      id: this._generateId('consultreq'),
      consultationType,
      location,
      timeSlotId: timeSlotId || null,
      requestedStartDateTime: requestedStartDateTime || null,
      contactName,
      contactPhone,
      contactEmail,
      notes: notes || '',
      status: 'requested',
      createdAt: this._nowISO()
    };

    requests.push(request);
    this._saveToStorage('consultation_requests', requests);

    return { consultationRequest: request };
  }

  // 25. getObituarySearchFilterOptions
  getObituarySearchFilterOptions() {
    const dateOfPassingPresets = [
      { key: 'last_7_days', label: 'Last 7 days' },
      { key: 'last_30_days', label: 'Last 30 days' },
      { key: 'all_time', label: 'All time' }
    ];

    const donationFilters = [
      { key: 'has_memorial_fund', label: 'Has memorial fund' },
      { key: 'accepts_donations', label: 'Accepts donations' }
    ];

    return { dateOfPassingPresets, donationFilters };
  }

  // 26. getMemorialDetail
  getMemorialDetail(memorialId) {
    const memorials = this._getFromStorage('memorials');
    const events = this._getFromStorage('service_events');
    const guestbookEntries = this._getFromStorage('guestbook_entries');
    const candleTributes = this._getFromStorage('candle_tributes');

    const memorial = memorials.find((m) => m.id === memorialId) || null;

    const serviceEventsRaw = events.filter((e) => e.memorialId === memorialId);
    const serviceEvents = serviceEventsRaw.map((e) => ({
      ...e,
      memorial: memorial
    }));

    const guestEntriesForMemorial = guestbookEntries.filter(
      (g) => g.memorialId === memorialId && g.status === 'approved'
    );
    const candleForMemorial = candleTributes.filter(
      (c) => c.memorialId === memorialId && c.status === 'lit'
    );

    return {
      memorial,
      serviceEvents,
      guestbookSummary: {
        totalEntries: guestEntriesForMemorial.length
      },
      candleSummary: {
        litCount: candleForMemorial.length
      }
    };
  }

  // 27. getMemorialGuestbookEntries
  getMemorialGuestbookEntries(memorialId, page = 1, pageSize = 20) {
    const guestbookEntries = this._getFromStorage('guestbook_entries');
    const memorials = this._getFromStorage('memorials');

    const memorial = memorials.find((m) => m.id === memorialId) || null;
    let entriesForMemorial = guestbookEntries.filter(
      (g) => g.memorialId === memorialId && g.status === 'approved'
    );

    const total = entriesForMemorial.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    entriesForMemorial = entriesForMemorial.slice(start, end);

    const entries = entriesForMemorial.map((g) => ({
      ...g,
      memorial: memorial
    }));

    return { entries, total };
  }

  // 28. postGuestbookEntry
  postGuestbookEntry(memorialId, name, relationship, message) {
    const entries = this._getFromStorage('guestbook_entries');

    const entry = {
      id: this._generateId('guestbook'),
      memorialId,
      name,
      relationship: relationship || '',
      message,
      createdAt: this._nowISO(),
      status: 'approved'
    };

    entries.push(entry);
    this._saveToStorage('guestbook_entries', entries);

    return { entry };
  }

  // 29. lightCandleTribute
  lightCandleTribute(memorialId, name, message) {
    const candles = this._getFromStorage('candle_tributes');

    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    const candle = {
      id: this._generateId('candle'),
      memorialId,
      name: name || '',
      message: message || '',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'lit'
    };

    candles.push(candle);
    this._saveToStorage('candle_tributes', candles);

    return { candle };
  }

  // 30. getMemorialTemplateOptions
  getMemorialTemplateOptions() {
    const templates = [
      { key: 'classic', name: 'Classic', description: 'Traditional layout with portrait and text.' },
      { key: 'modern', name: 'Modern', description: 'Clean, modern design with large photo.' },
      { key: 'photo_gallery', name: 'Photo Gallery', description: 'Photo-forward memorial layout.' }
    ];

    const themes = [
      { key: 'blue', label: 'Blue' },
      { key: 'green', label: 'Green' },
      { key: 'purple', label: 'Purple' },
      { key: 'neutral', label: 'Neutral' }
    ];

    const portraits = [
      { key: 'profile_1', label: 'Profile 1' },
      { key: 'profile_2', label: 'Profile 2' },
      { key: 'profile_3', label: 'Profile 3' }
    ];

    const privacyOptions = [
      { key: 'public', label: 'Public' },
      { key: 'private', label: 'Private' },
      { key: 'unlisted', label: 'Unlisted' }
    ];

    return { templates, themes, portraits, privacyOptions };
  }

  // 31. createMemorial
  createMemorial(
    fullName,
    dateOfBirth,
    dateOfPassing,
    biography,
    templateKey,
    themeKey,
    portraitKey,
    visibility,
    guestbookEnabled,
    candleLightingEnabled
  ) {
    const memorials = this._getFromStorage('memorials');

    const memorial = {
      id: this._generateId('memorial'),
      fullName,
      dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00.000Z` : null,
      dateOfPassing: dateOfPassing ? `${dateOfPassing}T00:00:00.000Z` : null,
      biography: biography || '',
      templateKey,
      themeKey,
      portraitKey,
      visibility,
      guestbookEnabled: !!guestbookEnabled,
      candleLightingEnabled: !!candleLightingEnabled,
      hasMemorialFund: false,
      acceptsDonations: false,
      status: 'active',
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    memorials.push(memorial);
    this._saveToStorage('memorials', memorials);

    return { memorial };
  }

  // 32. getMemorialDonationOptions
  getMemorialDonationOptions(memorialId) {
    const memorials = this._getFromStorage('memorials');
    const fundsAll = this._getFromStorage('memorial_funds');

    const memorial = memorials.find((m) => m.id === memorialId) || null;
    const acceptsDonations = memorial ? !!memorial.acceptsDonations : false;

    const fundsRaw = fundsAll.filter((f) => f.memorialId === memorialId && f.isActive);

    // FK resolution: MemorialFund.memorialId -> memorial
    const availableFunds = fundsRaw.map((f) => ({
      ...f,
      memorial
    }));

    const presetAmounts = [25, 50, 100, 250];
    const defaultFrequency = 'one_time';

    return { acceptsDonations, availableFunds, presetAmounts, defaultFrequency };
  }

  // 33. initiateMemorialDonation
  initiateMemorialDonation(memorialId, fundId, amount, frequency, donorName, donorEmail, message) {
    const donations = this._getFromStorage('donations');
    const payments = this._getFromStorage('payments');

    const donation = {
      id: this._generateId('donation'),
      memorialId,
      fundId: fundId || null,
      amount,
      frequency,
      donorName,
      donorEmail,
      message: message || '',
      status: 'pending_payment',
      createdAt: this._nowISO()
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    const paymentId = this._generateId('payment');
    const paymentRecord = {
      id: paymentId,
      orderId: null,
      donationId: donation.id,
      amount: donation.amount,
      currency: this._getCurrency(),
      paymentMethodType: 'card',
      status: 'not_started',
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    payments.push(paymentRecord);
    this._saveToStorage('payments', payments);
    localStorage.setItem('currentPaymentId', paymentId);

    return {
      donation,
      payment: {
        paymentId: paymentRecord.id,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: paymentRecord.status
      }
    };
  }

  // 34. getPrePlanningOptions
  getPrePlanningOptions() {
    const arrangementTypes = [
      { key: 'traditional_burial', label: 'Traditional Burial', description: 'Pre-plan a traditional burial service.' },
      { key: 'cremation', label: 'Cremation', description: 'Pre-plan cremation arrangements.' }
    ];

    const ageRanges = [
      { key: 'under_35', label: 'Under 35' },
      { key: 'age_35_54', label: '35-54' },
      { key: 'age_55_64', label: '55-64' },
      { key: 'age_65_plus', label: '65+' }
    ];

    const viewingPreferences = [
      { key: 'no_viewing', label: 'No viewing' },
      { key: 'same_day_service', label: 'Same-day service' },
      {
        key: 'evening_visitation_next_day_service',
        label: 'Evening visitation + next-day service'
      }
    ];

    const cemeteryOwnershipOptions = [
      { key: 'own_plot', label: 'I already own a cemetery plot' },
      { key: 'do_not_own_plot', label: 'I do not already own a cemetery plot' },
      { key: 'unsure', label: 'I am not sure' }
    ];

    return { arrangementTypes, ageRanges, viewingPreferences, cemeteryOwnershipOptions };
  }

  // 35. startPrePlanningSession
  startPrePlanningSession(arrangementType) {
    const sessions = this._getFromStorage('preplanning_sessions');

    const session = {
      id: this._generateId('preplan'),
      arrangementType,
      ageRange: 'under_35',
      viewingPreference: 'no_viewing',
      cemeteryOwnership: 'unsure',
      selectedPackageId: null,
      selectedAddOnIds: [],
      estimatedTotal: 0,
      createdAt: this._nowISO()
    };

    sessions.push(session);
    this._saveToStorage('preplanning_sessions', sessions);
    localStorage.setItem('currentPrePlanningSessionId', session.id);

    return { session };
  }

  // 36. updatePrePlanningPreferences
  updatePrePlanningPreferences(preplanningSessionId, ageRange, viewingPreference, cemeteryOwnership) {
    const sessions = this._getFromStorage('preplanning_sessions');
    const session = sessions.find((s) => s.id === preplanningSessionId) || null;
    if (!session) {
      return { session: null };
    }

    session.ageRange = ageRange;
    session.viewingPreference = viewingPreference;
    session.cemeteryOwnership = cemeteryOwnership;

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('preplanning_sessions', sessions);
    }

    return { session };
  }

  // 37. getPrePlanningPackageOptions
  getPrePlanningPackageOptions(arrangementType) {
    const packages = this._getFromStorage('preplanning_packages');
    return packages.filter(
      (p) => p.arrangementType === arrangementType && p.status === 'active'
    );
  }

  // 38. selectPrePlanningPackage
  selectPrePlanningPackage(preplanningSessionId, packageId) {
    const sessions = this._getFromStorage('preplanning_sessions');
    const session = sessions.find((s) => s.id === preplanningSessionId) || null;
    if (!session) {
      return { session: null };
    }

    session.selectedPackageId = packageId;
    this._recalculatePrePlanningEstimatedTotal(session);

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('preplanning_sessions', sessions);
    }

    return { session };
  }

  // 39. getPrePlanningAddOnOptions
  getPrePlanningAddOnOptions() {
    const addOns = this._getFromStorage('preplanning_add_ons');
    return addOns.filter((a) => a.status === 'active');
  }

  // 40. updatePrePlanningAddOns
  updatePrePlanningAddOns(preplanningSessionId, selectedAddOnIds) {
    const sessions = this._getFromStorage('preplanning_sessions');
    const session = sessions.find((s) => s.id === preplanningSessionId) || null;
    if (!session) {
      return { session: null };
    }

    session.selectedAddOnIds = Array.isArray(selectedAddOnIds) ? selectedAddOnIds : [];
    this._recalculatePrePlanningEstimatedTotal(session);

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('preplanning_sessions', sessions);
    }

    return { session };
  }

  // 41. getPrePlanningQuoteSummary
  getPrePlanningQuoteSummary(preplanningSessionId) {
    const sessions = this._getFromStorage('preplanning_sessions');
    const packages = this._getFromStorage('preplanning_packages');
    const addOns = this._getFromStorage('preplanning_add_ons');

    const session = sessions.find((s) => s.id === preplanningSessionId) || null;
    if (!session) {
      return { package: null, selectedAddOns: [], totalAmount: 0, currency: this._getCurrency() };
    }

    const pkg = packages.find((p) => p.id === session.selectedPackageId) || null;
    const selectedAddOns = (session.selectedAddOnIds || []).map(
      (id) => addOns.find((a) => a.id === id) || null
    ).filter(Boolean);

    const totalAmount = session.estimatedTotal || 0;

    return {
      package: pkg,
      selectedAddOns,
      totalAmount,
      currency: this._getCurrency()
    };
  }

  // 42. emailPrePlanningQuote
  emailPrePlanningQuote(preplanningSessionId, email) {
    const sessions = this._getFromStorage('preplanning_sessions');
    const quotes = this._getFromStorage('quotes');

    const session = sessions.find((s) => s.id === preplanningSessionId) || null;
    if (!session) {
      return { quote: null };
    }

    this._recalculatePrePlanningEstimatedTotal(session);

    const quote = {
      id: this._generateId('quote'),
      preplanningSessionId: session.id,
      totalAmount: session.estimatedTotal || 0,
      email,
      status: 'emailed',
      createdAt: this._nowISO(),
      emailedAt: this._nowISO()
    };

    quotes.push(quote);
    this._saveToStorage('quotes', quotes);

    return { quote };
  }

  // 43. getCateringFilterOptions
  getCateringFilterOptions() {
    const cateringPackages = this._getFromStorage('catering_packages').filter(
      (c) => c.status === 'active'
    );

    let minPrice = null;
    let maxPrice = null;
    cateringPackages.forEach((c) => {
      const price = c.pricePerGuest || 0;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;
    const step = maxPrice > 0 ? Math.max(1, Math.round(maxPrice / 20)) : 1;

    const guestCountRanges = [
      { key: 'under_30', label: 'Under 30 guests', minGuests: 0, maxGuests: 29 },
      { key: '30_50', label: '30-50 guests', minGuests: 30, maxGuests: 50 },
      { key: '51_100', label: '51-100 guests', minGuests: 51, maxGuests: 100 },
      { key: 'over_100', label: 'Over 100 guests', minGuests: 101, maxGuests: 9999 }
    ];

    const sortOptions = [
      { key: 'rating_desc', label: 'Rating: High to Low' },
      { key: 'price_per_guest_asc', label: 'Price per guest: Low to High' }
    ];

    return {
      guestCountRanges,
      pricePerGuest: {
        min: minPrice,
        max: maxPrice,
        step
      },
      sortOptions
    };
  }

  // 44. searchCateringPackages
  searchCateringPackages(filters, sortBy, page = 1, pageSize = 20) {
    filters = filters || {};

    let packages = this._getFromStorage('catering_packages').filter(
      (c) => c.status === 'active'
    );

    if (typeof filters.minGuests === 'number') {
      packages = packages.filter((c) =>
        (c.maxGuests == null || c.maxGuests >= filters.minGuests)
      );
    }
    if (typeof filters.maxGuests === 'number') {
      packages = packages.filter((c) =>
        (c.minGuests == null || c.minGuests <= filters.maxGuests)
      );
    }
    if (typeof filters.maxPricePerGuest === 'number') {
      packages = packages.filter((c) => (c.pricePerGuest || 0) <= filters.maxPricePerGuest);
    }

    if (sortBy === 'price_per_guest_asc') {
      packages.sort((a, b) => (a.pricePerGuest || 0) - (b.pricePerGuest || 0));
    } else if (sortBy === 'rating_desc') {
      packages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = packages.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      results: packages.slice(start, end),
      total
    };
  }

  // 45. getCateringPackageDetails
  getCateringPackageDetails(cateringPackageId) {
    const packages = this._getFromStorage('catering_packages');
    const pkg = packages.find((c) => c.id === cateringPackageId) || null;

    return {
      cateringPackage: pkg,
      menuDescription: pkg && pkg.description ? pkg.description : ''
    };
  }

  // 46. addCateringPackageToFuneralPlan
  addCateringPackageToFuneralPlan(cateringPackageId, guestCount, includeVegetarian, serviceStyle) {
    const plan = this._getOrCreateFuneralPlan();
    const items = this._getFromStorage('funeral_plan_items');
    const cateringPackages = this._getFromStorage('catering_packages');

    const pkg = cateringPackages.find((c) => c.id === cateringPackageId) || null;

    const item = {
      id: this._generateId('funeralplanitem'),
      funeralPlanId: plan.id,
      itemType: 'catering_package',
      referenceId: cateringPackageId,
      name: pkg ? pkg.name : '',
      guestCount: guestCount,
      includeVegetarian: !!includeVegetarian,
      serviceStyle: serviceStyle,
      createdAt: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('funeral_plan_items', items);

    const plans = this._getFromStorage('funeral_plans');
    plan.updatedAt = this._nowISO();
    const pIdx = plans.findIndex((p) => p.id === plan.id);
    if (pIdx >= 0) {
      plans[pIdx] = plan;
      this._saveToStorage('funeral_plans', plans);
    }

    const itemsForPlan = items
      .filter((i) => i.funeralPlanId === plan.id)
      .map((i) => ({
        ...i,
        // FK resolution: funeralPlanId -> funeralPlan
        funeralPlan: plan
      }));

    return {
      funeralPlan: plan,
      items: itemsForPlan
    };
  }

  // 47. getFuneralPlanSummary
  getFuneralPlanSummary() {
    const plans = this._getFromStorage('funeral_plans');
    const items = this._getFromStorage('funeral_plan_items');

    let currentFuneralPlanId = localStorage.getItem('currentFuneralPlanId');
    let plan = null;

    if (currentFuneralPlanId) {
      plan = plans.find((p) => p.id === currentFuneralPlanId) || null;
    }
    if (!plan && plans.length > 0) {
      plan = plans[plans.length - 1];
      localStorage.setItem('currentFuneralPlanId', plan.id);
    }

    if (!plan) {
      return { funeralPlan: null, items: [] };
    }

    const itemsForPlan = items
      .filter((i) => i.funeralPlanId === plan.id)
      .map((i) => ({
        ...i,
        funeralPlan: plan
      }));

    return { funeralPlan: plan, items: itemsForPlan };
  }

  // 48. searchServiceEvents
  searchServiceEvents(startDate, endDate, serviceTypes) {
    const events = this._getFromStorage('service_events');
    const memorials = this._getFromStorage('memorials');

    const start = this._parseYMDToDate(startDate);
    const end = this._parseYMDToDate(endDate);
    if (!start || !end) return [];
    end.setHours(23, 59, 59, 999);

    const typesSet = Array.isArray(serviceTypes) && serviceTypes.length > 0
      ? new Set(serviceTypes)
      : null;

    const filtered = events.filter((e) => {
      const d = this._parseISODate(e.startDateTime);
      if (!d) return false;
      if (d < start || d > end) return false;
      if (typesSet && !typesSet.has(e.type)) return false;
      return true;
    });

    return filtered.map((e) => ({
      ...e,
      memorial: e.memorialId
        ? memorials.find((m) => m.id === e.memorialId) || null
        : null
    }));
  }

  // 49. getServiceEventDetail
  getServiceEventDetail(serviceEventId) {
    const events = this._getFromStorage('service_events');
    const memorials = this._getFromStorage('memorials');

    const event = events.find((e) => e.id === serviceEventId) || null;
    if (!event) {
      return { serviceEvent: null, memorial: null };
    }

    const memorial = event.memorialId
      ? memorials.find((m) => m.id === event.memorialId) || null
      : null;

    const serviceEventWithMemorial = {
      ...event,
      memorial
    };

    return { serviceEvent: serviceEventWithMemorial, memorial };
  }

  // 50. submitRSVP
  submitRSVP(serviceEventId, attendeeCount, attendeeNames, contactPhone, smsOptIn) {
    const rsvps = this._getFromStorage('rsvps');

    const rsvp = {
      id: this._generateId('rsvp'),
      serviceEventId,
      attendeeCount,
      attendeeNames: Array.isArray(attendeeNames) ? attendeeNames : [],
      contactPhone,
      smsOptIn: !!smsOptIn,
      createdAt: this._nowISO(),
      status: 'submitted'
    };

    rsvps.push(rsvp);
    this._saveToStorage('rsvps', rsvps);

    return { rsvp };
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
