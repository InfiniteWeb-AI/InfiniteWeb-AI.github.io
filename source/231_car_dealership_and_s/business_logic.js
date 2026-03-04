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
  // Storage helpers
  // ==========================

  _initStorage() {
    // Core entity tables
    this._ensureStorageKey('vehicles', []);
    this._ensureStorageKey('vehicle_inquiries', []);
    this._ensureStorageKey('service_types', []);
    this._ensureStorageKey('service_coupons', []);
    this._ensureStorageKey('service_appointments', []);
    this._ensureStorageKey('payment_estimates', []);
    this._ensureStorageKey('financing_requests', []);
    this._ensureStorageKey('saved_vehicles', []);
    this._ensureStorageKey('vehicle_compare_lists', []);
    this._ensureStorageKey('accessory_products', []);
    // Single-cart model
    this._ensureStorageKey('cart', null); // single Cart object or null
    this._ensureStorageKey('cart_items', []);
    this._ensureStorageKey('trade_in_requests', []);
    this._ensureStorageKey('test_drive_appointments', []);
    this._ensureStorageKey('shop_by_payment_searches', []);
    this._ensureStorageKey('vehicle_orders', []);

    // Content / misc tables (kept minimal; can be edited externally)
    if (!localStorage.getItem('home_highlights')) {
      const defaultHighlights = {
        featuredVehicles: [],
        featuredServiceCoupons: [],
        featuredOffers: []
      };
      localStorage.setItem('home_highlights', JSON.stringify(defaultHighlights));
    }

    if (!localStorage.getItem('service_overview')) {
      const defaultOverview = {
        serviceTypes: [], // will be overridden dynamically from service_types
        hours: [],
        contactPhone: '',
        contactEmail: '',
        address: '',
        directionsText: ''
      };
      localStorage.setItem('service_overview', JSON.stringify(defaultOverview));
    }

    if (!localStorage.getItem('about_us_content')) {
      const defaultAbout = {
        historyText: '',
        missionText: '',
        values: [],
        locations: [],
        certifications: [],
        awards: []
      };
      localStorage.setItem('about_us_content', JSON.stringify(defaultAbout));
    }

    if (!localStorage.getItem('contact_info')) {
      const defaultContact = {
        salesPhone: '',
        servicePhone: '',
        partsPhone: '',
        mainEmail: '',
        address: '',
        mapCoordinates: { latitude: 0, longitude: 0 },
        directionsText: ''
      };
      localStorage.setItem('contact_info', JSON.stringify(defaultContact));
    }

    if (!localStorage.getItem('privacy_policy')) {
      const defaultPrivacy = {
        lastUpdated: '',
        sections: []
      };
      localStorage.setItem('privacy_policy', JSON.stringify(defaultPrivacy));
    }

    if (!localStorage.getItem('terms_and_conditions')) {
      const defaultTerms = {
        lastUpdated: '',
        sections: []
      };
      localStorage.setItem('terms_and_conditions', JSON.stringify(defaultTerms));
    }

    this._ensureStorageKey('contact_us_tickets', []);

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _ensureStorageKey(key, defaultValue) {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
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

  _titleCase(str) {
    if (!str) return '';
    return String(str)
      .split('_')
      .join(' ')
      .split(' ')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _getDatePartFromIso(isoString) {
    if (!isoString || typeof isoString !== 'string') return '';
    // Expecting 'YYYY-MM-DDTHH:MM:SS' -> take date part to avoid timezone issues
    return isoString.slice(0, 10);
  }

  // ==========================
  // Internal domain helpers
  // ==========================

  // --- Cart helpers ---

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    const now = new Date().toISOString();
    if (!cart || cart.status !== 'open') {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        createdAt: now,
        updatedAt: now,
        totalItems: 0,
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }
    this._saveToStorage('cart', cart);
    return cart;
  }

  _recalculateCartTotals(cart, allItems) {
    if (!cart) return cart;
    const itemsForCart = (allItems || []).filter(i => i.cartId === cart.id);
    let subtotal = 0;
    let totalItems = 0;
    itemsForCart.forEach(item => {
      const line = item.priceSnapshot * item.quantity;
      item.lineSubtotal = line;
      subtotal += line;
      totalItems += item.quantity;
    });
    const taxRate = 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    cart.subtotal = Math.round(subtotal * 100) / 100;
    cart.tax = tax;
    cart.total = total;
    cart.totalItems = totalItems;
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  // --- Compare list helper ---

  _getActiveCompareList() {
    const lists = this._getFromStorage('vehicle_compare_lists', []);
    const now = new Date().toISOString();
    let list;
    if (lists.length > 0) {
      list = lists[0];
    } else {
      list = {
        id: this._generateId('compare'),
        vehicleIds: [],
        createdAt: now,
        lastViewedAt: null
      };
      lists.push(list);
      this._saveToStorage('vehicle_compare_lists', lists);
    }
    list.lastViewedAt = now;
    this._saveToStorage('vehicle_compare_lists', lists);
    return list;
  }

  // --- Payment helper ---

  _calculateMonthlyPayment(price, downPayment, termMonths, apr) {
    const sanitizedPrice = Number(price) || 0;
    const sanitizedDown = Number(downPayment) || 0;
    const term = Number(termMonths) || 0;
    const aprValue = apr !== undefined && apr !== null ? Number(apr) : null;

    const taxesAndFees = Math.round(sanitizedPrice * 0.08 * 100) / 100; // simple 8% assumption
    const financedAmount = sanitizedPrice - sanitizedDown + taxesAndFees;

    if (term <= 0 || financedAmount <= 0) {
      return {
        monthlyPayment: 0,
        taxesAndFees
      };
    }

    let monthlyPayment;
    if (!aprValue || aprValue <= 0) {
      monthlyPayment = financedAmount / term;
    } else {
      const monthlyRate = aprValue / 100 / 12;
      const numerator = financedAmount * monthlyRate * Math.pow(1 + monthlyRate, term);
      const denominator = Math.pow(1 + monthlyRate, term) - 1;
      monthlyPayment = denominator === 0 ? financedAmount / term : numerator / denominator;
    }

    monthlyPayment = Math.round(monthlyPayment * 100) / 100;
    return { monthlyPayment, taxesAndFees };
  }

  // --- Vehicle order helper ---

  _getOrCreateVehicleOrder(orderId, vehicleId) {
    const orders = this._getFromStorage('vehicle_orders', []);
    const vehicles = this._getFromStorage('vehicles', []);
    const now = new Date().toISOString();

    if (orderId) {
      const existing = orders.find(o => o.id === orderId);
      if (existing) {
        return existing;
      }
    }

    if (!vehicleId) {
      return null;
    }

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return null;
    }

    const price = Number(vehicle.price) || 0;
    const defaultTerm = vehicle.defaultPaymentTermMonths || 60;
    const defaultApr = vehicle.defaultPaymentApr || 4.0;
    const paymentCalc = this._calculateMonthlyPayment(price, 0, defaultTerm, defaultApr);

    const order = {
      id: this._generateId('order'),
      vehicleId: vehicleId,
      checkoutMode: 'guest',
      hasTradeIn: false,
      financingType: 'standard_financing',
      protectionPlanSelected: false,
      estimatedMonthlyPayment: paymentCalc.monthlyPayment,
      orderSubtotal: price,
      taxesAndFees: paymentCalc.taxesAndFees,
      orderTotal: Math.round((price + paymentCalc.taxesAndFees) * 100) / 100,
      status: 'in_progress',
      currentStep: 'vehicle_confirmation',
      createdAt: now,
      updatedAt: now
    };

    orders.push(order);
    this._saveToStorage('vehicle_orders', orders);
    return order;
  }

  // --- Service schedule helper ---

  _getServiceScheduleCapacity(primaryServiceTypeId, date) {
    const appointments = this._getFromStorage('service_appointments', []);
    const targetDate = String(date);

    // Simple schedule: 08:00 - 17:00 every 60 minutes
    const startHour = 8;
    const endHour = 17;
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      const hourStr = h.toString().padStart(2, '0');
      const time = hourStr + ':00';
      slots.push({ time, isAvailable: true });
    }

    appointments.forEach(appt => {
      if (appt.primaryServiceTypeId === primaryServiceTypeId) {
        const apptDate = this._getDatePartFromIso(appt.appointmentDateTime);
        if (apptDate === targetDate) {
          const apptTime = appt.appointmentDateTime.slice(11, 16); // HH:MM
          const slot = slots.find(s => s.time === apptTime);
          if (slot) {
            slot.isAvailable = false;
          }
        }
      }
    });

    return slots;
  }

  // --- Test drive schedule helper ---

  _getTestDriveScheduleCapacity(vehicleId, date) {
    const appointments = this._getFromStorage('test_drive_appointments', []);
    const targetDate = String(date);

    // Simple schedule: 09:00 - 17:00 every 60 minutes
    const startHour = 9;
    const endHour = 17;
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      const hourStr = h.toString().padStart(2, '0');
      const time = hourStr + ':00';
      slots.push({ time, isAvailable: true });
    }

    appointments.forEach(appt => {
      if (appt.vehicleId === vehicleId) {
        const apptDate = this._getDatePartFromIso(appt.appointmentDateTime);
        if (apptDate === targetDate) {
          const apptTime = appt.appointmentDateTime.slice(11, 16); // HH:MM
          const slot = slots.find(s => s.time === apptTime);
          if (slot) {
            slot.isAvailable = false;
          }
        }
      }
    });

    return slots;
  }

  // --- Shop-by-payment helper ---

  _storeShopByPaymentSearch(maxMonthlyPayment, bodyStyle, drivetrain, inventoryType, resultVehicleIds) {
    const searches = this._getFromStorage('shop_by_payment_searches', []);
    const search = {
      id: this._generateId('sbp'),
      maxMonthlyPayment: Number(maxMonthlyPayment) || 0,
      bodyStyle: bodyStyle || null,
      drivetrain: drivetrain || null,
      resultVehicleIds: resultVehicleIds || [],
      createdAt: new Date().toISOString()
    };

    if (inventoryType) {
      // inventoryType is not part of the entity definition but allowed in interface; store as extra field
      search.inventoryType = inventoryType;
    }

    searches.push(search);
    this._saveToStorage('shop_by_payment_searches', searches);
    return search;
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // --- Homepage / global search ---

  getHomeHighlights() {
    const data = this._getFromStorage('home_highlights', {
      featuredVehicles: [],
      featuredServiceCoupons: [],
      featuredOffers: []
    });

    // Ensure arrays
    const vehicles = this._getFromStorage('vehicles', []);
    const coupons = this._getFromStorage('service_coupons', []);

    // If stored objects are IDs, resolve; if they are full objects, just pass through.
    const resolveVehicle = v => {
      if (!v) return null;
      if (typeof v === 'string') {
        return vehicles.find(x => x.id === v) || null;
      }
      if (v.id) {
        const full = vehicles.find(x => x.id === v.id);
        return full || v;
      }
      return v;
    };

    const resolveCoupon = c => {
      if (!c) return null;
      if (typeof c === 'string') {
        return coupons.find(x => x.id === c) || null;
      }
      if (c.id) {
        const full = coupons.find(x => x.id === c.id);
        return full || c;
      }
      return c;
    };

    return {
      featuredVehicles: (data.featuredVehicles || []).map(resolveVehicle).filter(Boolean),
      featuredServiceCoupons: (data.featuredServiceCoupons || []).map(resolveCoupon).filter(Boolean),
      featuredOffers: data.featuredOffers || []
    };
  }

  searchInventoryGlobal(query, maxResults) {
    const vehicles = this._getFromStorage('vehicles', []);
    const q = (query || '').trim().toLowerCase();
    const limit = maxResults !== undefined && maxResults !== null ? Number(maxResults) : 20;

    if (!q) {
      return vehicles.slice(0, limit);
    }

    const matches = vehicles.filter(v => {
      const fields = [
        v.title,
        v.vin,
        v.stockNumber,
        v.make,
        v.model,
        String(v.year)
      ].filter(Boolean);
      return fields.some(f => String(f).toLowerCase().includes(q));
    });

    return matches.slice(0, limit);
  }

  // --- Inventory filters & search ---

  getInventoryFilterOptions(inventoryType) {
    let vehicles = this._getFromStorage('vehicles', []);
    if (inventoryType) {
      vehicles = vehicles.filter(v => v.inventoryType === inventoryType);
    }

    const bodyStylesSet = new Set();
    const fuelTypesSet = new Set();
    const drivetrainsSet = new Set();
    const prices = [];
    const mileages = [];

    vehicles.forEach(v => {
      if (v.bodyStyle) bodyStylesSet.add(v.bodyStyle);
      if (v.fuelType) fuelTypesSet.add(v.fuelType);
      if (v.drivetrain) drivetrainsSet.add(v.drivetrain);
      if (typeof v.price === 'number') prices.push(v.price);
      if (typeof v.mileage === 'number') mileages.push(v.mileage);
    });

    const bodyStyles = Array.from(bodyStylesSet).map(value => ({ value, label: this._titleCase(value) }));
    const fuelTypes = Array.from(fuelTypesSet).map(value => ({ value, label: this._titleCase(value) }));
    const drivetrains = Array.from(drivetrainsSet).map(value => ({ value, label: value.toUpperCase() }));

    const priceRange = {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      step: 1000
    };

    const mileageRange = {
      min: mileages.length ? Math.min(...mileages) : 0,
      max: mileages.length ? Math.max(...mileages) : 0,
      step: 5000
    };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'year_new_to_old', label: 'Year: New to Old' },
      { value: 'mileage_low_to_high', label: 'Mileage: Low to High' }
    ];

    return {
      bodyStyles,
      fuelTypes,
      drivetrains,
      priceRange,
      mileageRange,
      sortOptions
    };
  }

  searchInventory(filters, page, pageSize) {
    const allVehicles = this._getFromStorage('vehicles', []);
    const f = filters || {};
    const p = page || 1;
    const ps = pageSize || 20;

    let results = allVehicles.slice();

    if (f.inventoryType) {
      results = results.filter(v => v.inventoryType === f.inventoryType);
    }
    if (f.bodyStyle) {
      results = results.filter(v => v.bodyStyle === f.bodyStyle);
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter(v => typeof v.price === 'number' && v.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(v => typeof v.price === 'number' && v.price <= f.maxPrice);
    }
    if (typeof f.minMileage === 'number') {
      results = results.filter(v => typeof v.mileage === 'number' && v.mileage >= f.minMileage);
    }
    if (typeof f.maxMileage === 'number') {
      results = results.filter(v => typeof v.mileage === 'number' && v.mileage <= f.maxMileage);
    }
    if (f.fuelType) {
      results = results.filter(v => v.fuelType === f.fuelType);
    }
    if (f.drivetrain) {
      results = results.filter(v => v.drivetrain === f.drivetrain);
    }
    if (typeof f.isCertifiedPreOwned === 'boolean') {
      results = results.filter(v => !!v.isCertifiedPreOwned === f.isCertifiedPreOwned);
    }
    if (f.searchQuery) {
      const q = String(f.searchQuery).trim().toLowerCase();
      if (q) {
        results = results.filter(v => {
          const fields = [
            v.title,
            v.make,
            v.model,
            v.trim,
            v.vin,
            v.stockNumber
          ].filter(Boolean);
          return fields.some(field => String(field).toLowerCase().includes(q));
        });
      }
    }

    if (f.sort) {
      const sorter = String(f.sort);
      results.sort((a, b) => {
        switch (sorter) {
          case 'price_low_to_high':
            return (a.price || 0) - (b.price || 0);
          case 'price_high_to_low':
            return (b.price || 0) - (a.price || 0);
          case 'year_new_to_old':
            return (b.year || 0) - (a.year || 0);
          case 'mileage_low_to_high':
            return (a.mileage || Infinity) - (b.mileage || Infinity);
          default:
            return 0;
        }
      });
    }

    const totalResults = results.length;
    const startIndex = (p - 1) * ps;
    const paged = results.slice(startIndex, startIndex + ps);

    return {
      vehicles: paged,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  getVehicleDetail(vehicleId) {
    const vehicles = this._getFromStorage('vehicles', []);
    const savedVehicles = this._getFromStorage('saved_vehicles', []);
    const vehicle = vehicles.find(v => v.id === vehicleId) || null;

    const compareList = this._getActiveCompareList();

    const isSaved = !!savedVehicles.find(sv => sv.vehicleId === vehicleId);
    const isInCompareList = !!(compareList && compareList.vehicleIds.includes(vehicleId));

    let similarVehicles = [];
    if (vehicle) {
      similarVehicles = vehicles
        .filter(v => v.id !== vehicle.id && v.inventoryType === vehicle.inventoryType && v.bodyStyle === vehicle.bodyStyle)
        .slice(0, 10);
    }

    return {
      vehicle,
      isSaved,
      isInCompareList,
      similarVehicles
    };
  }

  submitVehicleInquiry(vehicleId, name, phone, email, message) {
    const vehicles = this._getFromStorage('vehicles', []);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return {
        success: false,
        inquiry: null,
        message: 'Vehicle not found.'
      };
    }

    const inquiries = this._getFromStorage('vehicle_inquiries', []);
    const inquiry = {
      id: this._generateId('vinquiry'),
      vehicleId,
      name,
      phone,
      email,
      message: message || '',
      createdAt: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._saveToStorage('vehicle_inquiries', inquiries);

    return {
      success: true,
      inquiry,
      message: 'Inquiry submitted.'
    };
  }

  calculatePaymentEstimate(vehicleId, price, downPayment, termMonths, apr) {
    const vehicles = this._getFromStorage('vehicles', []);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return {
        success: false,
        estimate: null
      };
    }

    const { monthlyPayment, taxesAndFees } = this._calculateMonthlyPayment(price, downPayment, termMonths, apr);

    const estimates = this._getFromStorage('payment_estimates', []);
    const estimate = {
      id: this._generateId('pmt'),
      vehicleId,
      price: Number(price) || 0,
      downPayment: Number(downPayment) || 0,
      termMonths: Number(termMonths) || 0,
      apr: apr !== undefined && apr !== null ? Number(apr) : null,
      estimatedMonthlyPayment: monthlyPayment,
      taxesAndFees,
      createdAt: new Date().toISOString()
    };

    estimates.push(estimate);
    this._saveToStorage('payment_estimates', estimates);

    return {
      success: true,
      estimate
    };
  }

  submitFinancingRequest(vehicleId, paymentEstimateId, name, phone, email, message) {
    const vehicles = this._getFromStorage('vehicles', []);
    const estimates = this._getFromStorage('payment_estimates', []);
    const requests = this._getFromStorage('financing_requests', []);

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return {
        success: false,
        request: null,
        message: 'Vehicle not found.'
      };
    }

    let estimate = null;
    if (paymentEstimateId) {
      estimate = estimates.find(e => e.id === paymentEstimateId) || null;
    }

    const request = {
      id: this._generateId('fin'),
      vehicleId,
      paymentEstimateId: estimate ? estimate.id : null,
      name,
      phone,
      email,
      message: message || '',
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    requests.push(request);
    this._saveToStorage('financing_requests', requests);

    return {
      success: true,
      request,
      message: 'Financing request submitted.'
    };
  }

  // --- Test drive ---

  getTestDriveAvailability(vehicleId, date) {
    const vehicles = this._getFromStorage('vehicles', []);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return {
        vehicleId,
        date,
        timeSlots: []
      };
    }

    const timeSlots = this._getTestDriveScheduleCapacity(vehicleId, date);
    return {
      vehicleId,
      date,
      timeSlots
    };
  }

  scheduleTestDrive(vehicleId, appointmentDateTime, name, phone, email) {
    const vehicles = this._getFromStorage('vehicles', []);
    const appointments = this._getFromStorage('test_drive_appointments', []);

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return {
        success: false,
        appointment: null,
        message: 'Vehicle not found.'
      };
    }

    const datePart = this._getDatePartFromIso(appointmentDateTime);
    const timePart = String(appointmentDateTime).slice(11, 16);
    const slots = this._getTestDriveScheduleCapacity(vehicleId, datePart);
    const slot = slots.find(s => s.time === timePart);

    if (!slot || !slot.isAvailable) {
      return {
        success: false,
        appointment: null,
        message: 'Selected time is not available.'
      };
    }

    const appointment = {
      id: this._generateId('tdrive'),
      vehicleId,
      appointmentDateTime,
      name,
      phone,
      email,
      status: 'requested',
      createdAt: new Date().toISOString()
    };

    appointments.push(appointment);
    this._saveToStorage('test_drive_appointments', appointments);

    return {
      success: true,
      appointment,
      message: 'Test drive requested.'
    };
  }

  // --- Compare & Saved vehicles ---

  addVehicleToCompare(vehicleId) {
    const vehicles = this._getFromStorage('vehicles', []);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return {
        success: false,
        compareList: null,
        vehicles: [],
        message: 'Vehicle not found.'
      };
    }

    const lists = this._getFromStorage('vehicle_compare_lists', []);
    let list = this._getActiveCompareList();

    if (!list.vehicleIds.includes(vehicleId)) {
      list.vehicleIds.push(vehicleId);
    }

    const updatedLists = lists.map(l => (l.id === list.id ? list : l));
    this._saveToStorage('vehicle_compare_lists', updatedLists);

    const compareVehicles = list.vehicleIds
      .map(id => vehicles.find(v => v.id === id))
      .filter(Boolean);

    return {
      success: true,
      compareList: list,
      vehicles: compareVehicles
    };
  }

  removeVehicleFromCompare(vehicleId) {
    const lists = this._getFromStorage('vehicle_compare_lists', []);
    if (!lists.length) {
      return {
        success: false,
        compareList: null,
        vehicles: []
      };
    }

    let list = lists[0];
    list.vehicleIds = list.vehicleIds.filter(id => id !== vehicleId);
    list.lastViewedAt = new Date().toISOString();

    const updatedLists = lists.map(l => (l.id === list.id ? list : l));
    this._saveToStorage('vehicle_compare_lists', updatedLists);

    const vehicles = this._getFromStorage('vehicles', []);
    const compareVehicles = list.vehicleIds
      .map(id => vehicles.find(v => v.id === id))
      .filter(Boolean);

    return {
      success: true,
      compareList: list,
      vehicles: compareVehicles
    };
  }

  getCompareList() {
    const list = this._getActiveCompareList();
    const vehicles = this._getFromStorage('vehicles', []);
    const compareVehicles = list.vehicleIds
      .map(id => vehicles.find(v => v.id === id))
      .filter(Boolean);

    return {
      compareList: list,
      vehicles: compareVehicles
    };
  }

  addVehicleToSaved(vehicleId) {
    const vehicles = this._getFromStorage('vehicles', []);
    const savedVehicles = this._getFromStorage('saved_vehicles', []);

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return {
        success: false,
        savedVehicle: null,
        totalSaved: savedVehicles.length,
        message: 'Vehicle not found.'
      };
    }

    let saved = savedVehicles.find(sv => sv.vehicleId === vehicleId);
    if (!saved) {
      saved = {
        id: this._generateId('saved'),
        vehicleId,
        savedAt: new Date().toISOString(),
        note: ''
      };
      savedVehicles.push(saved);
      this._saveToStorage('saved_vehicles', savedVehicles);
    }

    return {
      success: true,
      savedVehicle: saved,
      totalSaved: savedVehicles.length
    };
  }

  removeVehicleFromSaved(vehicleId) {
    const savedVehicles = this._getFromStorage('saved_vehicles', []);
    const remaining = savedVehicles.filter(sv => sv.vehicleId !== vehicleId);
    this._saveToStorage('saved_vehicles', remaining);

    return {
      success: true,
      totalSaved: remaining.length
    };
  }

  getSavedVehicles() {
    const savedVehicles = this._getFromStorage('saved_vehicles', []);
    const vehicles = this._getFromStorage('vehicles', []);

    // Foreign key resolution: saved.vehicleId -> vehicle
    return savedVehicles.map(saved => ({
      saved,
      vehicle: vehicles.find(v => v.id === saved.vehicleId) || null
    }));
  }

  // --- Service types & overview ---

  listServiceTypes(activeOnly) {
    const types = this._getFromStorage('service_types', []);
    const onlyActive = activeOnly === undefined || activeOnly === null ? true : !!activeOnly;
    if (!onlyActive) return types;
    return types.filter(t => t.isActive);
  }

  getServiceOverview() {
    const overview = this._getFromStorage('service_overview', {
      serviceTypes: [],
      hours: [],
      contactPhone: '',
      contactEmail: '',
      address: '',
      directionsText: ''
    });
    // Always reflect current active service types
    const activeTypes = this.listServiceTypes(true);
    overview.serviceTypes = activeTypes;
    return overview;
  }

  getServiceAvailability(primaryServiceTypeId, date) {
    const serviceTypes = this._getFromStorage('service_types', []);
    const st = serviceTypes.find(s => s.id === primaryServiceTypeId);
    if (!st) {
      return {
        primaryServiceTypeId,
        date,
        timeSlots: []
      };
    }

    const timeSlots = this._getServiceScheduleCapacity(primaryServiceTypeId, date);
    return {
      primaryServiceTypeId,
      date,
      timeSlots
    };
  }

  scheduleServiceAppointment(
    vehicleYear,
    vehicleMake,
    vehicleModel,
    vehicleTrim,
    vehicleMileage,
    vehicleVin,
    primaryServiceTypeId,
    additionalServiceTypeIds,
    appointmentDateTime,
    visitType,
    couponId,
    name,
    phone,
    email
  ) {
    const serviceTypes = this._getFromStorage('service_types', []);
    const coupons = this._getFromStorage('service_coupons', []);
    const appointments = this._getFromStorage('service_appointments', []);

    const primaryService = serviceTypes.find(s => s.id === primaryServiceTypeId);
    if (!primaryService || !primaryService.isActive) {
      return {
        success: false,
        appointment: null,
        message: 'Service type not available.'
      };
    }

    const datePart = this._getDatePartFromIso(appointmentDateTime);
    const timePart = String(appointmentDateTime).slice(11, 16);
    const slots = this._getServiceScheduleCapacity(primaryServiceTypeId, datePart);
    const slot = slots.find(s => s.time === timePart);

    if (!slot || !slot.isAvailable) {
      return {
        success: false,
        appointment: null,
        message: 'Selected time is not available.'
      };
    }

    let appliedCouponId = null;
    if (couponId) {
      const coupon = coupons.find(c => c.id === couponId && c.isActive);
      if (coupon) {
        // Respect validity window if set
        const nowDate = new Date();
        let valid = true;
        if (coupon.startDate) {
          valid = valid && nowDate >= new Date(coupon.startDate);
        }
        if (coupon.endDate) {
          valid = valid && nowDate <= new Date(coupon.endDate);
        }
        // Check hierarchy: coupon should be applicable to the service type if defined
        if (valid && Array.isArray(coupon.applicableServiceTypeIds) && coupon.applicableServiceTypeIds.length) {
          valid = coupon.applicableServiceTypeIds.includes(primaryServiceTypeId);
        }
        if (valid) {
          appliedCouponId = coupon.id;
        }
      }
    }

    const appointment = {
      id: this._generateId('svc'),
      vehicleYear: vehicleYear || null,
      vehicleMake: vehicleMake || '',
      vehicleModel: vehicleModel || '',
      vehicleTrim: vehicleTrim || '',
      vehicleMileage: vehicleMileage !== undefined && vehicleMileage !== null ? Number(vehicleMileage) : null,
      vehicleVin: vehicleVin || '',
      primaryServiceTypeId,
      additionalServiceTypeIds: additionalServiceTypeIds || [],
      appointmentDateTime,
      visitType: visitType || null,
      couponId: appliedCouponId,
      name,
      phone,
      email,
      status: 'requested',
      createdAt: new Date().toISOString()
    };

    appointments.push(appointment);
    this._saveToStorage('service_appointments', appointments);

    return {
      success: true,
      appointment,
      message: 'Service appointment requested.'
    };
  }

  listServiceCoupons(category, activeOnly) {
    const coupons = this._getFromStorage('service_coupons', []);
    const onlyActive = activeOnly === undefined || activeOnly === null ? true : !!activeOnly;
    const now = new Date();

    let result = coupons.slice();

    if (category) {
      result = result.filter(c => c.category === category);
    }

    if (onlyActive) {
      result = result.filter(c => c.isActive);
    }

    // Respect start/end dates if they exist
    result = result.filter(c => {
      let valid = true;
      if (c.startDate) {
        valid = valid && now >= new Date(c.startDate);
      }
      if (c.endDate) {
        valid = valid && now <= new Date(c.endDate);
      }
      return valid;
    });

    return result;
  }

  getServiceCouponDetail(couponId) {
    const coupons = this._getFromStorage('service_coupons', []);
    return coupons.find(c => c.id === couponId) || null;
  }

  // --- Accessories & cart ---

  getAccessoryFilterOptions() {
    const products = this._getFromStorage('accessory_products', []);

    const categoriesSet = new Set();
    const prices = [];

    products.forEach(p => {
      if (p.category) categoriesSet.add(p.category);
      if (typeof p.price === 'number') prices.push(p.price);
    });

    const categories = Array.from(categoriesSet).map(value => ({
      value,
      label: this._titleCase(value)
    }));

    const priceRange = {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      step: 5
    };

    const ratingOptions = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' },
      { value: 1, label: '1 star & up' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      categories,
      priceRange,
      ratingOptions,
      sortOptions
    };
  }

  searchAccessories(query, filters, page, pageSize) {
    const allProducts = this._getFromStorage('accessory_products', []);
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const p = page || 1;
    const ps = pageSize || 20;

    let results = allProducts.filter(pdt => pdt.isActive);

    if (q) {
      results = results.filter(pdt => {
        const fields = [pdt.name, pdt.description].filter(Boolean);
        return fields.some(field => String(field).toLowerCase().includes(q));
      });
    }

    if (f.category) {
      results = results.filter(pdt => pdt.category === f.category);
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter(pdt => typeof pdt.price === 'number' && pdt.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(pdt => typeof pdt.price === 'number' && pdt.price <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      results = results.filter(pdt => typeof pdt.rating === 'number' && pdt.rating >= f.minRating);
    }

    if (f.sort) {
      const sorter = String(f.sort);
      results.sort((a, b) => {
        switch (sorter) {
          case 'price_low_to_high':
            return (a.price || 0) - (b.price || 0);
          case 'price_high_to_low':
            return (b.price || 0) - (a.price || 0);
          case 'rating_high_to_low':
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
    }

    const totalResults = results.length;
    const startIndex = (p - 1) * ps;
    const paged = results.slice(startIndex, startIndex + ps);

    return {
      products: paged,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  getAccessoryDetail(accessoryId) {
    const products = this._getFromStorage('accessory_products', []);
    return products.find(p => p.id === accessoryId) || null;
  }

  addAccessoryToCart(accessoryId, quantity) {
    const products = this._getFromStorage('accessory_products', []);
    const items = this._getFromStorage('cart_items', []);
    let cart = this._getOrCreateCart();

    const product = products.find(p => p.id === accessoryId && p.isActive);
    if (!product) {
      return {
        success: false,
        cart,
        items: [],
        message: 'Accessory not found.'
      };
    }

    const qty = quantity !== undefined && quantity !== null ? Number(quantity) : 1;
    const finalQty = qty > 0 ? qty : 1;

    let item = items.find(i => i.cartId === cart.id && i.accessoryId === accessoryId);
    if (item) {
      item.quantity += finalQty;
    } else {
      item = {
        id: this._generateId('citem'),
        cartId: cart.id,
        accessoryId,
        nameSnapshot: product.name,
        priceSnapshot: Number(product.price) || 0,
        quantity: finalQty,
        lineSubtotal: 0
      };
      items.push(item);
    }

    cart = this._recalculateCartTotals(cart, items);
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', items);

    const itemsForCart = items.filter(i => i.cartId === cart.id);

    return {
      success: true,
      cart,
      items: itemsForCart,
      message: 'Accessory added to cart.'
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const items = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('accessory_products', []);

    const itemsForCart = items.filter(i => i.cartId === cart.id);

    // Foreign key resolution: CartItem.accessoryId -> accessory
    const detailedItems = itemsForCart.map(item => ({
      item,
      accessory: products.find(p => p.id === item.accessoryId) || null
    }));

    return {
      cart,
      items: detailedItems
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const items = this._getFromStorage('cart_items', []);
    let cart = this._getOrCreateCart();

    const itemIndex = items.findIndex(i => i.id === cartItemId && i.cartId === cart.id);
    if (itemIndex === -1) {
      const products = this._getFromStorage('accessory_products', []);
      const itemsForCart = items.filter(i => i.cartId === cart.id).map(i => ({
        item: i,
        accessory: products.find(p => p.id === i.accessoryId) || null
      }));
      return {
        success: false,
        cart,
        items: itemsForCart
      };
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex].quantity = qty;
    }

    cart = this._recalculateCartTotals(cart, items);
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', items);

    const products = this._getFromStorage('accessory_products', []);
    const itemsForCart = items.filter(i => i.cartId === cart.id).map(i => ({
      item: i,
      accessory: products.find(p => p.id === i.accessoryId) || null
    }));

    return {
      success: true,
      cart,
      items: itemsForCart
    };
  }

  removeCartItem(cartItemId) {
    const items = this._getFromStorage('cart_items', []);
    let cart = this._getOrCreateCart();

    const newItems = items.filter(i => !(i.id === cartItemId && i.cartId === cart.id));

    cart = this._recalculateCartTotals(cart, newItems);
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', newItems);

    const products = this._getFromStorage('accessory_products', []);
    const itemsForCart = newItems.filter(i => i.cartId === cart.id).map(i => ({
      item: i,
      accessory: products.find(p => p.id === i.accessoryId) || null
    }));

    return {
      success: true,
      cart,
      items: itemsForCart
    };
  }

  // --- Trade-in ---

  getTradeInFormOptions() {
    const conditionOptions = [
      { value: 'excellent', label: 'Excellent' },
      { value: 'very_good', label: 'Very Good' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' },
      { value: 'poor', label: 'Poor' }
    ];

    const accidentHistoryOptions = [
      { value: 'no_accidents', label: 'No Accidents' },
      { value: 'minor_accidents', label: 'Minor Accidents' },
      { value: 'multiple_accidents', label: 'Multiple Accidents' },
      { value: 'unknown', label: 'Unknown' }
    ];

    // Derive year range from existing trade-in requests if present; otherwise default to 1990-current year
    const requests = this._getFromStorage('trade_in_requests', []);
    let minYear = null;
    let maxYear = null;
    requests.forEach(r => {
      if (typeof r.vehicleYear === 'number') {
        if (minYear === null || r.vehicleYear < minYear) minYear = r.vehicleYear;
        if (maxYear === null || r.vehicleYear > maxYear) maxYear = r.vehicleYear;
      }
    });
    const currentYear = new Date().getFullYear();
    if (minYear === null) minYear = 1990;
    if (maxYear === null) maxYear = currentYear;

    const yearRange = { minYear, maxYear };

    return {
      conditionOptions,
      accidentHistoryOptions,
      yearRange
    };
  }

  submitTradeInRequest(
    vehicleYear,
    vehicleMake,
    vehicleModel,
    vehicleTrim,
    vehicleMileage,
    vehicleVin,
    condition,
    accidentHistory,
    comments,
    name,
    phone,
    email
  ) {
    const requests = this._getFromStorage('trade_in_requests', []);

    const request = {
      id: this._generateId('trade'),
      vehicleYear: Number(vehicleYear) || null,
      vehicleMake,
      vehicleModel,
      vehicleTrim: vehicleTrim || '',
      vehicleMileage: Number(vehicleMileage) || 0,
      vehicleVin: vehicleVin || '',
      condition,
      accidentHistory,
      comments: comments || '',
      estimatedValue: null,
      name,
      phone,
      email,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    requests.push(request);
    this._saveToStorage('trade_in_requests', requests);

    return {
      success: true,
      request,
      message: 'Trade-in request submitted.'
    };
  }

  // --- Shop by Payment ---

  getShopByPaymentFilterOptions() {
    const vehicles = this._getFromStorage('vehicles', []);
    const bodyStylesSet = new Set();
    const drivetrainsSet = new Set();
    const payments = [];

    vehicles.forEach(v => {
      if (v.bodyStyle) bodyStylesSet.add(v.bodyStyle);
      if (v.drivetrain) drivetrainsSet.add(v.drivetrain);

      let monthly = null;
      if (typeof v.defaultMonthlyPayment === 'number') {
        monthly = v.defaultMonthlyPayment;
      } else {
        const term = v.defaultPaymentTermMonths || 60;
        const apr = v.defaultPaymentApr || 4.0;
        const calc = this._calculateMonthlyPayment(v.price || 0, 0, term, apr);
        monthly = calc.monthlyPayment;
      }
      if (monthly !== null && !isNaN(monthly)) {
        payments.push(monthly);
      }
    });

    const bodyStyles = Array.from(bodyStylesSet).map(value => ({
      value,
      label: this._titleCase(value)
    }));
    const drivetrains = Array.from(drivetrainsSet).map(value => ({
      value,
      label: value.toUpperCase()
    }));

    const paymentRange = {
      min: payments.length ? Math.floor(Math.min(...payments)) : 0,
      max: payments.length ? Math.ceil(Math.max(...payments)) : 0,
      step: 25
    };

    return {
      bodyStyles,
      drivetrains,
      paymentRange
    };
  }

  searchShopByPayment(maxMonthlyPayment, bodyStyle, drivetrain, inventoryType) {
    const vehicles = this._getFromStorage('vehicles', []);
    const maxPay = Number(maxMonthlyPayment) || 0;

    const matched = [];

    vehicles.forEach(v => {
      if (inventoryType && v.inventoryType !== inventoryType) return;
      if (bodyStyle && v.bodyStyle !== bodyStyle) return;
      if (drivetrain && v.drivetrain !== drivetrain) return;

      let monthly = null;
      if (typeof v.defaultMonthlyPayment === 'number') {
        monthly = v.defaultMonthlyPayment;
      } else {
        const term = v.defaultPaymentTermMonths || 60;
        const apr = v.defaultPaymentApr || 4.0;
        const calc = this._calculateMonthlyPayment(v.price || 0, 0, term, apr);
        monthly = calc.monthlyPayment;
      }

      if (monthly !== null && !isNaN(monthly) && monthly <= maxPay) {
        matched.push(v);
      }
    });

    const resultVehicleIds = matched.map(v => v.id);
    const search = this._storeShopByPaymentSearch(maxMonthlyPayment, bodyStyle, drivetrain, inventoryType, resultVehicleIds);

    return {
      search,
      vehicles: matched
    };
  }

  startGuestVehicleOrder(vehicleId) {
    const order = this._getOrCreateVehicleOrder(null, vehicleId);
    if (!order) {
      return {
        success: false,
        order: null,
        message: 'Vehicle not found.'
      };
    }
    return {
      success: true,
      order,
      message: 'Order started.'
    };
  }

  getVehicleOrder(orderId) {
    const orders = this._getFromStorage('vehicle_orders', []);
    const vehicles = this._getFromStorage('vehicles', []);

    const order = orders.find(o => o.id === orderId) || null;
    const vehicle = order ? vehicles.find(v => v.id === order.vehicleId) || null : null;

    return {
      order,
      vehicle
    };
  }

  updateVehicleOrderOptions(orderId, hasTradeIn, financingType, protectionPlanSelected) {
    const orders = this._getFromStorage('vehicle_orders', []);
    const vehicles = this._getFromStorage('vehicles', []);

    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) {
      return {
        success: false,
        order: null,
        message: 'Order not found.'
      };
    }

    const order = orders[index];

    if (typeof hasTradeIn === 'boolean') {
      order.hasTradeIn = hasTradeIn;
    }
    if (financingType) {
      order.financingType = financingType;
    }
    if (typeof protectionPlanSelected === 'boolean') {
      order.protectionPlanSelected = protectionPlanSelected;
    }

    const vehicle = vehicles.find(v => v.id === order.vehicleId);
    if (vehicle) {
      const price = Number(vehicle.price) || 0;
      const term = vehicle.defaultPaymentTermMonths || 60;
      const apr = vehicle.defaultPaymentApr || 4.0;
      const { monthlyPayment, taxesAndFees } = this._calculateMonthlyPayment(price, 0, term, apr);

      order.estimatedMonthlyPayment = monthlyPayment;
      order.orderSubtotal = price;
      order.taxesAndFees = taxesAndFees;
      order.orderTotal = Math.round((price + taxesAndFees) * 100) / 100;
    }

    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    this._saveToStorage('vehicle_orders', orders);

    return {
      success: true,
      order,
      message: 'Order updated.'
    };
  }

  advanceVehicleOrderStep(orderId) {
    const orders = this._getFromStorage('vehicle_orders', []);
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) {
      return {
        success: false,
        order: null,
        message: 'Order not found.'
      };
    }

    const order = orders[index];

    if (order.currentStep === 'vehicle_confirmation') {
      order.currentStep = 'payment_options';
    } else if (order.currentStep === 'payment_options') {
      order.currentStep = 'review';
      order.status = 'review';
    }

    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    this._saveToStorage('vehicle_orders', orders);

    return {
      success: true,
      order,
      message: 'Order advanced.'
    };
  }

  // --- Static content: About, Contact, Privacy, Terms ---

  getAboutUsContent() {
    return this._getFromStorage('about_us_content', {
      historyText: '',
      missionText: '',
      values: [],
      locations: [],
      certifications: [],
      awards: []
    });
  }

  getContactInfo() {
    return this._getFromStorage('contact_info', {
      salesPhone: '',
      servicePhone: '',
      partsPhone: '',
      mainEmail: '',
      address: '',
      mapCoordinates: { latitude: 0, longitude: 0 },
      directionsText: ''
    });
  }

  submitContactUsForm(name, email, phone, topic, message) {
    const tickets = this._getFromStorage('contact_us_tickets', []);

    const ticket = {
      id: this._generateId('cticket'),
      name,
      email,
      phone: phone || '',
      topic: topic || '',
      message,
      createdAt: new Date().toISOString()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_us_tickets', tickets);

    return {
      success: true,
      ticketId: ticket.id,
      message: 'Contact request submitted.'
    };
  }

  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy', {
      lastUpdated: '',
      sections: []
    });
  }

  getTermsAndConditionsContent() {
    return this._getFromStorage('terms_and_conditions', {
      lastUpdated: '',
      sections: []
    });
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