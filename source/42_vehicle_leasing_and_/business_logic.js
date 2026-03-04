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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'vehicles',
      'vehicle_lease_options',
      'quotes',
      'quote_items',
      'fleet_plans',
      'fleet_plan_items',
      'leases',
      'lease_mileage_options',
      'lease_suspensions',
      'service_centers',
      'service_appointments',
      'drivers',
      'driver_vehicle_assignments',
      'invoices',
      'invoice_line_items',
      'payment_methods',
      'payment_transactions',
      'accessory_categories',
      'accessory_products',
      'carts',
      'cart_items',
      'accessory_orders',
      'contact_tickets'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Simple content objects
    if (!localStorage.getItem('homepage_content')) {
      const homepageContent = {
        featuredLeaseDeals: [],
        leaseDealCategories: [],
        fleetManagementSections: [
          { code: 'active_leases', title: 'Active Leases', description: 'Manage and monitor your active fleet leases.' },
          { code: 'maintenance', title: 'Maintenance', description: 'Schedule and track vehicle maintenance.' },
          { code: 'drivers', title: 'Drivers', description: 'Manage driver profiles and assignments.' }
        ],
        billingAndShopSections: [
          { code: 'billing_invoices', title: 'Billing & Invoices', description: 'Review and pay your invoices.' },
          { code: 'accessories_shop', title: 'Accessories Shop', description: 'Buy telematics, GPS, and safety equipment.' }
        ]
      };
      localStorage.setItem('homepage_content', JSON.stringify(homepageContent));
    }

    if (!localStorage.getItem('about_page_content')) {
      const aboutContent = {
        title: 'About Our Fleet & Leasing Services',
        bodyHtml: '<p>We provide flexible vehicle leasing and fleet management solutions for businesses of all sizes.</p>',
        keyStats: [],
        highlights: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(aboutContent));
    }

    if (!localStorage.getItem('contact_page_content')) {
      const contactContent = {
        supportEmail: 'support@example.com',
        supportPhone: '+1-800-000-0000',
        billingEmail: 'billing@example.com',
        billingPhone: '+1-800-000-0001',
        officeAddress: {
          line1: '123 Fleet Street',
          line2: '',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        supportHours: 'Mon-Fri 9:00-17:00'
      };
      localStorage.setItem('contact_page_content', JSON.stringify(contactContent));
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      const privacy = {
        version: '1.0',
        lastUpdatedDate: new Date().toISOString(),
        bodyHtml: '<p>Privacy policy content goes here.</p>'
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(privacy));
    }

    if (!localStorage.getItem('terms_content')) {
      const terms = {
        version: '1.0',
        lastUpdatedDate: new Date().toISOString(),
        bodyHtml: '<p>Terms and conditions content goes here.</p>'
      };
      localStorage.setItem('terms_content', JSON.stringify(terms));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _addMonths(date, months) {
    const d = new Date(date.getTime());
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return d;
  }

  _getBodyStyleLabel(value) {
    const map = {
      compact: 'Compact',
      midsize_suv: 'Midsize SUV',
      fullsize_suv: 'Fullsize SUV',
      cargo_van: 'Cargo Van',
      passenger_van: 'Passenger Van',
      sedan: 'Sedan',
      hatchback: 'Hatchback',
      pickup: 'Pickup Truck',
      minivan: 'Minivan',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getFuelTypeLabel(value) {
    const map = {
      electric: 'Electric',
      hybrid: 'Hybrid',
      gasoline: 'Gasoline',
      diesel: 'Diesel',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getCategoryDisplayName(value) {
    const map = {
      car: 'Cars',
      suv: 'SUVs',
      van: 'Vans',
      truck: 'Trucks',
      other: 'Other Vehicles',
      all_vehicles: 'All Vehicles'
    };
    return map[value] || value || '';
  }

  _getCurrencyDefault() {
    return 'usd';
  }

  // ===== Helper functions required by spec =====

  _getOrCreateQuote(quoteType) {
    const now = this._now();
    let quotes = this._getFromStorage('quotes', []);
    let quote = null;
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i].type === quoteType && quotes[i].status === 'draft') {
        quote = quotes[i];
        break;
      }
    }
    if (!quote) {
      quote = {
        id: this._generateId('quote'),
        type: quoteType,
        status: 'draft',
        referenceNumber: null,
        totalMonthlyPayment: 0,
        totalVehicles: 0,
        createdAt: now,
        updatedAt: now
      };
      quotes.push(quote);
      this._saveToStorage('quotes', quotes);
    }
    return quote;
  }

  _recalculateQuoteTotals(quoteId) {
    let quotes = this._getFromStorage('quotes', []);
    let quoteItems = this._getFromStorage('quote_items', []);
    let quote = null;
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i].id === quoteId) {
        quote = quotes[i];
        break;
      }
    }
    if (!quote) return null;

    let totalMonthlyPayment = 0;
    let totalVehicles = 0;

    for (let i = 0; i < quoteItems.length; i++) {
      const item = quoteItems[i];
      if (item.quoteId === quoteId) {
        totalMonthlyPayment += item.totalMonthlyPayment || 0;
        totalVehicles += item.quantity || 0;
      }
    }

    quote.totalMonthlyPayment = totalMonthlyPayment;
    quote.totalVehicles = totalVehicles;
    quote.updatedAt = this._now();

    this._saveToStorage('quotes', quotes);
    return { totalMonthlyPayment: totalMonthlyPayment, totalVehicles: totalVehicles };
  }

  _getOrCreateFleetPlan() {
    const now = this._now();
    let fleetPlans = this._getFromStorage('fleet_plans', []);
    let plan = null;
    for (let i = 0; i < fleetPlans.length; i++) {
      if (fleetPlans[i].status === 'draft') {
        plan = fleetPlans[i];
        break;
      }
    }
    if (!plan) {
      plan = {
        id: this._generateId('fleetplan'),
        name: 'Draft Fleet Plan',
        status: 'draft',
        description: '',
        createdAt: now,
        updatedAt: now
      };
      fleetPlans.push(plan);
      this._saveToStorage('fleet_plans', fleetPlans);
    }
    return plan;
  }

  _calculateFleetPlanTotals(fleetPlanId) {
    const items = this._getFromStorage('fleet_plan_items', []);
    let totalMonthlyPayment = 0;
    let totalVehicles = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].fleetPlanId === fleetPlanId) {
        totalMonthlyPayment += items[i].totalMonthlyPayment || 0;
        totalVehicles += items[i].quantity || 0;
      }
    }
    return { totalMonthlyPayment: totalMonthlyPayment, totalVehicles: totalVehicles };
  }

  _getOrCreateCart() {
    const now = this._now();
    let carts = this._getFromStorage('carts', []);
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        subtotal: 0,
        subscriptionSubtotal: 0,
        shippingTotal: 0,
        grandTotal: 0,
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) return null;

    let subtotal = 0;
    let subscriptionSubtotal = 0;
    let shippingTotal = 0;

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cartId !== cartId) continue;
      const qty = item.quantity || 0;
      subtotal += (item.lineTotal || 0);
      subscriptionSubtotal += (item.subscriptionPricePerUnit || 0) * qty;
      let shippingRate = 0;
      if (item.shippingMethod === 'standard') shippingRate = 5;
      else if (item.shippingMethod === 'expedited') shippingRate = 15;
      else if (item.shippingMethod === 'overnight') shippingRate = 25;
      shippingTotal += shippingRate * qty;
    }

    cart.subtotal = subtotal;
    cart.subscriptionSubtotal = subscriptionSubtotal;
    cart.shippingTotal = shippingTotal;
    cart.grandTotal = subtotal + shippingTotal;
    cart.updatedAt = this._now();

    this._saveToStorage('carts', carts);
    return {
      subtotal: subtotal,
      subscriptionSubtotal: subscriptionSubtotal,
      shippingTotal: shippingTotal,
      grandTotal: cart.grandTotal
    };
  }

  _calculateLeaseSuspensionPreview(leaseId, startDate, durationMonths, reason) {
    const leases = this._getFromStorage('leases', []);
    let lease = null;
    for (let i = 0; i < leases.length; i++) {
      if (leases[i].id === leaseId) {
        lease = leases[i];
        break;
      }
    }
    if (!lease) {
      return null;
    }
    const start = new Date(startDate);
    const end = this._addMonths(start, durationMonths);
    const currentMonthlyPayment = lease.currentMonthlyPayment || lease.baseMonthlyPayment || 0;
    // Simple assumption: no payments during suspension
    const estimatedMonthlyPaymentDuringSuspension = 0;
    const estimatedSavingsTotal = currentMonthlyPayment * durationMonths;
    return {
      leaseId: leaseId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationMonths: durationMonths,
      reason: reason,
      currentMonthlyPayment: currentMonthlyPayment,
      estimatedMonthlyPaymentDuringSuspension: estimatedMonthlyPaymentDuringSuspension,
      currency: lease.currency || this._getCurrencyDefault(),
      estimatedSavingsTotal: estimatedSavingsTotal,
      notes: 'Estimated savings based on current monthly payment and suspension duration.'
    };
  }

  _validateInvoicePaymentAmount(invoice, amount, amountMode) {
    if (!invoice) {
      return { valid: false, message: 'Invoice not found.' };
    }
    if (amountMode === 'full') {
      if (amount !== invoice.amountDue) {
        return { valid: false, message: 'Full payment amount must equal amount due.' };
      }
    }
    if (amount <= 0) {
      return { valid: false, message: 'Payment amount must be greater than 0.' };
    }
    if (amount > invoice.amountDue) {
      return { valid: false, message: 'Payment amount cannot exceed amount due.' };
    }
    return { valid: true, message: 'OK' };
  }

  // ===== Core interface implementations =====

  // getHomepageContent()
  getHomepageContent() {
    const stored = this._getFromStorage('homepage_content', null);
    const vehicles = this._getFromStorage('vehicles', []);
    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);

    // Build featuredLeaseDeals from active featured vehicles
    const featuredLeaseDeals = [];
    const currency = this._getCurrencyDefault();

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.status !== 'active' || !v.isFeatured) continue;
      let defaultOption = null;
      for (let j = 0; j < leaseOptions.length; j++) {
        if (leaseOptions[j].vehicleId === v.id && leaseOptions[j].isDefault) {
          defaultOption = leaseOptions[j];
          break;
        }
      }
      if (!defaultOption) {
        for (let j = 0; j < leaseOptions.length; j++) {
          if (leaseOptions[j].vehicleId === v.id) {
            defaultOption = leaseOptions[j];
            break;
          }
        }
      }
      if (!defaultOption) continue;
      featuredLeaseDeals.push({
        vehicleId: v.id,
        vehicleLeaseOptionId: defaultOption.id,
        vehicleName: v.name,
        make: v.make,
        model: v.model,
        modelYear: v.modelYear,
        category: v.category,
        bodyStyle: v.bodyStyle,
        bodyStyleLabel: this._getBodyStyleLabel(v.bodyStyle),
        fuelType: v.fuelType,
        fuelTypeLabel: this._getFuelTypeLabel(v.fuelType),
        thumbnailImageUrl: (v.images && v.images.length > 0) ? v.images[0] : '',
        highlightLabel: 'Featured',
        leaseTermMonths: defaultOption.leaseTermMonths,
        annualMileageAllowance: defaultOption.annualMileageAllowance,
        monthlyPayment: defaultOption.monthlyPayment,
        currency: currency,
        isFeatured: !!v.isFeatured,
        vehicle: v,
        vehicleLeaseOption: defaultOption
      });
    }

    // Lease deal categories based on vehicles in storage
    const categoryMap = {};
    for (let i = 0; i < vehicles.length; i++) {
      const c = vehicles[i].category;
      if (!c) continue;
      if (!categoryMap[c]) {
        categoryMap[c] = {
          category: c,
          displayName: this._getCategoryDisplayName(c),
          description: ''
        };
      }
    }
    const leaseDealCategories = [];
    for (const k in categoryMap) {
      if (Object.prototype.hasOwnProperty.call(categoryMap, k)) {
        leaseDealCategories.push(categoryMap[k]);
      }
    }

    return {
      featuredLeaseDeals: featuredLeaseDeals,
      leaseDealCategories: leaseDealCategories,
      fleetManagementSections: stored ? stored.fleetManagementSections : [],
      billingAndShopSections: stored ? stored.billingAndShopSections : []
    };
  }

  // getLeaseDealsFilterOptions(category)
  getLeaseDealsFilterOptions(category) {
    const vehicles = this._getFromStorage('vehicles', []);
    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);

    const vehicleIds = [];
    const vehicleById = {};

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.status !== 'active') continue;
      if (category && category !== 'all_vehicles' && v.category !== category) continue;
      vehicleIds.push(v.id);
      vehicleById[v.id] = v;
    }

    const bodyStyleSet = {};
    const fuelTypeSet = {};
    const exteriorColorSet = {};

    for (let i = 0; i < vehicleIds.length; i++) {
      const v = vehicleById[vehicleIds[i]];
      if (v.bodyStyle) bodyStyleSet[v.bodyStyle] = true;
      if (v.fuelType) fuelTypeSet[v.fuelType] = true;
      if (v.exteriorColors && v.exteriorColors.length) {
        for (let c = 0; c < v.exteriorColors.length; c++) {
          exteriorColorSet[v.exteriorColors[c]] = true;
        }
      }
    }

    const leaseTermSet = {};
    const mileageSet = {};
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < leaseOptions.length; i++) {
      const o = leaseOptions[i];
      if (vehicleById[o.vehicleId]) {
        leaseTermSet[o.leaseTermMonths] = true;
        mileageSet[o.annualMileageAllowance] = true;
        if (typeof o.monthlyPayment === 'number') {
          if (minPrice === null || o.monthlyPayment < minPrice) minPrice = o.monthlyPayment;
          if (maxPrice === null || o.monthlyPayment > maxPrice) maxPrice = o.monthlyPayment;
        }
      }
    }

    const bodyStyles = [];
    for (const b in bodyStyleSet) {
      if (Object.prototype.hasOwnProperty.call(bodyStyleSet, b)) {
        bodyStyles.push({ value: b, label: this._getBodyStyleLabel(b) });
      }
    }

    const fuelTypes = [];
    for (const f in fuelTypeSet) {
      if (Object.prototype.hasOwnProperty.call(fuelTypeSet, f)) {
        fuelTypes.push({ value: f, label: this._getFuelTypeLabel(f) });
      }
    }

    const leaseTermsMonths = [];
    for (const lt in leaseTermSet) {
      if (Object.prototype.hasOwnProperty.call(leaseTermSet, lt)) {
        const num = parseInt(lt, 10);
        leaseTermsMonths.push({ value: num, label: num + ' months' });
      }
    }

    const annualMileageAllowances = [];
    for (const am in mileageSet) {
      if (Object.prototype.hasOwnProperty.call(mileageSet, am)) {
        const num = parseInt(am, 10);
        annualMileageAllowances.push({ value: num, label: num.toLocaleString() + ' miles/year' });
      }
    }

    const exteriorColors = [];
    for (const color in exteriorColorSet) {
      if (Object.prototype.hasOwnProperty.call(exteriorColorSet, color)) {
        exteriorColors.push({ value: color, label: color });
      }
    }

    const priceRange = {
      minAvailable: minPrice !== null ? minPrice : 0,
      maxAvailable: maxPrice !== null ? maxPrice : 0,
      currency: this._getCurrencyDefault()
    };

    const sortOptions = [
      { value: 'recommended', label: 'Recommended' },
      { value: 'monthly_payment_asc', label: 'Monthly payment: Low to High' },
      { value: 'monthly_payment_desc', label: 'Monthly payment: High to Low' }
    ];

    return {
      bodyStyles: bodyStyles,
      fuelTypes: fuelTypes,
      leaseTermsMonths: leaseTermsMonths,
      annualMileageAllowances: annualMileageAllowances,
      exteriorColors: exteriorColors,
      priceRange: priceRange,
      sortOptions: sortOptions
    };
  }

  // searchLeaseDeals(category, filters, sort, page, pageSize)
  searchLeaseDeals(category, filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'recommended';
    page = page || 1;
    pageSize = pageSize || 20;

    const vehicles = this._getFromStorage('vehicles', []);
    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);

    const vehicleById = {};
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.status !== 'active') continue;
      if (category && category !== 'all_vehicles' && v.category !== category) continue;
      vehicleById[v.id] = v;
    }

    const resultsAll = [];
    const currency = this._getCurrencyDefault();

    for (let i = 0; i < leaseOptions.length; i++) {
      const o = leaseOptions[i];
      const v = vehicleById[o.vehicleId];
      if (!v) continue;

      if (filters.bodyStyle && v.bodyStyle !== filters.bodyStyle) continue;
      if (filters.fuelType && v.fuelType !== filters.fuelType) continue;
      if (typeof filters.leaseTermMonths === 'number' && o.leaseTermMonths !== filters.leaseTermMonths) continue;
      if (typeof filters.annualMileageAllowance === 'number' && o.annualMileageAllowance !== filters.annualMileageAllowance) continue;
      if (filters.exteriorColor) {
        if (!v.exteriorColors || v.exteriorColors.indexOf(filters.exteriorColor) === -1) continue;
      }
      if (typeof filters.minMonthlyPayment === 'number' && o.monthlyPayment < filters.minMonthlyPayment) continue;
      if (typeof filters.maxMonthlyPayment === 'number' && o.monthlyPayment > filters.maxMonthlyPayment) continue;

      const item = {
        vehicleId: v.id,
        vehicleLeaseOptionId: o.id,
        vehicleName: v.name,
        make: v.make,
        model: v.model,
        modelYear: v.modelYear,
        category: v.category,
        bodyStyle: v.bodyStyle,
        bodyStyleLabel: this._getBodyStyleLabel(v.bodyStyle),
        fuelType: v.fuelType,
        fuelTypeLabel: this._getFuelTypeLabel(v.fuelType),
        thumbnailImageUrl: (v.images && v.images.length > 0) ? v.images[0] : '',
        badges: [],
        leaseTermMonths: o.leaseTermMonths,
        annualMileageAllowance: o.annualMileageAllowance,
        monthlyPayment: o.monthlyPayment,
        currency: currency,
        estimated36MonthCost: o.estimated36MonthCost,
        isFleetEligible: !!o.isFleetEligible,
        isPersonalEligible: !!o.isPersonalEligible,
        vehicle: v,
        vehicleLeaseOption: o
      };
      resultsAll.push(item);
    }

    if (sort === 'monthly_payment_asc') {
      resultsAll.sort(function (a, b) {
        return a.monthlyPayment - b.monthlyPayment;
      });
    } else if (sort === 'monthly_payment_desc') {
      resultsAll.sort(function (a, b) {
        return b.monthlyPayment - a.monthlyPayment;
      });
    } else {
      // recommended: basic sort by isFeatured then monthlyPayment
      resultsAll.sort((a, b) => {
        const av = a.vehicle;
        const bv = b.vehicle;
        const af = av && av.isFeatured ? 1 : 0;
        const bf = bv && bv.isFeatured ? 1 : 0;
        if (af !== bf) return bf - af;
        return a.monthlyPayment - b.monthlyPayment;
      });
    }

    const totalCount = resultsAll.length;
    const startIndex = (page - 1) * pageSize;
    const paged = resultsAll.slice(startIndex, startIndex + pageSize);

    const appliedFilters = {
      bodyStyle: filters.bodyStyle || null,
      fuelType: filters.fuelType || null,
      leaseTermMonths: typeof filters.leaseTermMonths === 'number' ? filters.leaseTermMonths : null,
      annualMileageAllowance: typeof filters.annualMileageAllowance === 'number' ? filters.annualMileageAllowance : null,
      exteriorColor: filters.exteriorColor || null,
      minMonthlyPayment: typeof filters.minMonthlyPayment === 'number' ? filters.minMonthlyPayment : null,
      maxMonthlyPayment: typeof filters.maxMonthlyPayment === 'number' ? filters.maxMonthlyPayment : null
    };

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      appliedFilters: appliedFilters
    };
  }

  // getLeaseComparisonDetails(vehicleLeaseOptionIds)
  getLeaseComparisonDetails(vehicleLeaseOptionIds) {
    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);
    const vehicles = this._getFromStorage('vehicles', []);
    const vehiclesById = {};
    for (let i = 0; i < vehicles.length; i++) {
      vehiclesById[vehicles[i].id] = vehicles[i];
    }
    const currency = this._getCurrencyDefault();

    const items = [];
    for (let i = 0; i < vehicleLeaseOptionIds.length; i++) {
      const id = vehicleLeaseOptionIds[i];
      let opt = null;
      for (let j = 0; j < leaseOptions.length; j++) {
        if (leaseOptions[j].id === id) {
          opt = leaseOptions[j];
          break;
        }
      }
      if (!opt) continue;
      const v = vehiclesById[opt.vehicleId];
      if (!v) continue;

      items.push({
        vehicleLeaseOptionId: opt.id,
        vehicleId: v.id,
        vehicleName: v.name,
        make: v.make,
        model: v.model,
        modelYear: v.modelYear,
        bodyStyleLabel: this._getBodyStyleLabel(v.bodyStyle),
        fuelTypeLabel: this._getFuelTypeLabel(v.fuelType),
        leaseTermMonths: opt.leaseTermMonths,
        annualMileageAllowance: opt.annualMileageAllowance,
        monthlyPayment: opt.monthlyPayment,
        estimated36MonthCost: opt.estimated36MonthCost,
        keySpecs: [],
        vehicle: v,
        vehicleLeaseOption: opt,
        currency: currency
      });
    }

    // Instrumentation for task completion tracking
    try {
      if (vehicleLeaseOptionIds && vehicleLeaseOptionIds.length >= 2) {
        localStorage.setItem('task3_comparedLeaseOptionIds', JSON.stringify(vehicleLeaseOptionIds.slice(0, 2)));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { items: items };
  }

  // getVehicleDetail(vehicleId, preferredLeaseOptionId)
  getVehicleDetail(vehicleId, preferredLeaseOptionId) {
    const vehicles = this._getFromStorage('vehicles', []);
    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);
    let v = null;
    for (let i = 0; i < vehicles.length; i++) {
      if (vehicles[i].id === vehicleId) {
        v = vehicles[i];
        break;
      }
    }
    if (!v) {
      return {
        vehicle: null,
        images: [],
        leaseOptions: [],
        defaultLeaseOptionId: null,
        specs: []
      };
    }

    const currency = this._getCurrencyDefault();
    const options = [];
    let defaultLeaseOptionId = null;

    for (let i = 0; i < leaseOptions.length; i++) {
      const o = leaseOptions[i];
      if (o.vehicleId !== v.id) continue;
      if (o.isDefault && !defaultLeaseOptionId) {
        defaultLeaseOptionId = o.id;
      }
      options.push({
        vehicleLeaseOptionId: o.id,
        leaseTermMonths: o.leaseTermMonths,
        annualMileageAllowance: o.annualMileageAllowance,
        monthlyPayment: o.monthlyPayment,
        currency: currency,
        estimated36MonthCost: o.estimated36MonthCost,
        isDefault: !!o.isDefault,
        isFleetEligible: !!o.isFleetEligible,
        isPersonalEligible: !!o.isPersonalEligible,
        notes: o.notes || ''
      });
    }

    if (preferredLeaseOptionId) {
      let exists = false;
      for (let i = 0; i < options.length; i++) {
        if (options[i].vehicleLeaseOptionId === preferredLeaseOptionId) {
          exists = true;
          break;
        }
      }
      if (exists) {
        defaultLeaseOptionId = preferredLeaseOptionId;
      }
    }
    if (!defaultLeaseOptionId && options.length > 0) {
      defaultLeaseOptionId = options[0].vehicleLeaseOptionId;
    }

    const images = [];
    if (v.images && v.images.length) {
      for (let i = 0; i < v.images.length; i++) {
        images.push({ url: v.images[i], altText: v.name || '' });
      }
    }

    const vehicleObj = {
      vehicleId: v.id,
      name: v.name,
      make: v.make,
      model: v.model,
      trim: v.trim || '',
      modelYear: v.modelYear,
      category: v.category,
      bodyStyle: v.bodyStyle,
      bodyStyleLabel: this._getBodyStyleLabel(v.bodyStyle),
      fuelType: v.fuelType,
      fuelTypeLabel: this._getFuelTypeLabel(v.fuelType),
      exteriorColors: v.exteriorColors || [],
      defaultExteriorColor: v.defaultExteriorColor || (v.exteriorColors && v.exteriorColors.length ? v.exteriorColors[0] : ''),
      status: v.status
    };

    return {
      vehicle: vehicleObj,
      images: images,
      leaseOptions: options,
      defaultLeaseOptionId: defaultLeaseOptionId,
      specs: []
    };
  }

  // addVehicleToQuote(vehicleLeaseOptionId, quoteType, quantity = 1, exteriorColor)
  addVehicleToQuote(vehicleLeaseOptionId, quoteType, quantity, exteriorColor) {
    quantity = typeof quantity === 'number' ? quantity : 1;
    const validTypes = ['personal', 'fleet'];
    if (validTypes.indexOf(quoteType) === -1) {
      return { success: false, message: 'Invalid quote type.', quoteId: null };
    }

    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);
    const vehicles = this._getFromStorage('vehicles', []);
    let opt = null;
    for (let i = 0; i < leaseOptions.length; i++) {
      if (leaseOptions[i].id === vehicleLeaseOptionId) {
        opt = leaseOptions[i];
        break;
      }
    }
    if (!opt) {
      return { success: false, message: 'Lease option not found.', quoteId: null };
    }

    let veh = null;
    for (let i = 0; i < vehicles.length; i++) {
      if (vehicles[i].id === opt.vehicleId) {
        veh = vehicles[i];
        break;
      }
    }

    const quote = this._getOrCreateQuote(quoteType);
    let quoteItems = this._getFromStorage('quote_items', []);

    const color = exteriorColor || (veh && (veh.defaultExteriorColor || (veh.exteriorColors && veh.exteriorColors[0]))) || '';
    const monthly = opt.monthlyPayment || 0;
    const totalMonthly = monthly * quantity;

    const quoteItem = {
      id: this._generateId('quoteitem'),
      quoteId: quote.id,
      vehicleId: opt.vehicleId,
      vehicleLeaseOptionId: opt.id,
      vehicleName: veh ? veh.name : '',
      termMonths: opt.leaseTermMonths,
      annualMileageAllowance: opt.annualMileageAllowance,
      quantity: quantity,
      exteriorColor: color,
      monthlyPaymentPerVehicle: monthly,
      totalMonthlyPayment: totalMonthly
    };

    quoteItems.push(quoteItem);
    this._saveToStorage('quote_items', quoteItems);
    const totals = this._recalculateQuoteTotals(quote.id);

    return {
      success: true,
      quoteId: quote.id,
      quoteType: quote.type,
      quoteStatus: quote.status,
      totalVehicles: totals ? totals.totalVehicles : quote.totalVehicles,
      totalMonthlyPayment: totals ? totals.totalMonthlyPayment : quote.totalMonthlyPayment,
      addedItem: {
        quoteItemId: quoteItem.id,
        vehicleName: quoteItem.vehicleName,
        termMonths: quoteItem.termMonths,
        annualMileageAllowance: quoteItem.annualMileageAllowance,
        quantity: quoteItem.quantity,
        monthlyPaymentPerVehicle: quoteItem.monthlyPaymentPerVehicle,
        totalMonthlyPayment: quoteItem.totalMonthlyPayment
      },
      message: 'Vehicle added to quote.'
    };
  }

  // addVehicleToFleetPlan(vehicleLeaseOptionId, quantity = 1, exteriorColor)
  addVehicleToFleetPlan(vehicleLeaseOptionId, quantity, exteriorColor) {
    quantity = typeof quantity === 'number' ? quantity : 1;
    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);
    const vehicles = this._getFromStorage('vehicles', []);

    let opt = null;
    for (let i = 0; i < leaseOptions.length; i++) {
      if (leaseOptions[i].id === vehicleLeaseOptionId) {
        opt = leaseOptions[i];
        break;
      }
    }
    if (!opt) {
      return { success: false, message: 'Lease option not found.', fleetPlanId: null };
    }

    let veh = null;
    for (let i = 0; i < vehicles.length; i++) {
      if (vehicles[i].id === opt.vehicleId) {
        veh = vehicles[i];
        break;
      }
    }

    const plan = this._getOrCreateFleetPlan();
    let items = this._getFromStorage('fleet_plan_items', []);

    const color = exteriorColor || (veh && (veh.defaultExteriorColor || (veh.exteriorColors && veh.exteriorColors[0]))) || '';
    const monthly = opt.monthlyPayment || 0;
    const totalMonthly = monthly * quantity;

    const item = {
      id: this._generateId('fleetplanitem'),
      fleetPlanId: plan.id,
      vehicleId: opt.vehicleId,
      vehicleLeaseOptionId: opt.id,
      vehicleName: veh ? veh.name : '',
      termMonths: opt.leaseTermMonths,
      annualMileageAllowance: opt.annualMileageAllowance,
      quantity: quantity,
      exteriorColor: color,
      monthlyPaymentPerVehicle: monthly,
      totalMonthlyPayment: totalMonthly,
      addedAt: this._now()
    };

    items.push(item);
    this._saveToStorage('fleet_plan_items', items);
    const totals = this._calculateFleetPlanTotals(plan.id);

    return {
      success: true,
      fleetPlanId: plan.id,
      fleetPlanName: plan.name,
      fleetPlanStatus: plan.status,
      totalVehicles: totals.totalVehicles,
      totalMonthlyPayment: totals.totalMonthlyPayment,
      addedItem: {
        fleetPlanItemId: item.id,
        vehicleName: item.vehicleName,
        termMonths: item.termMonths,
        annualMileageAllowance: item.annualMileageAllowance,
        quantity: item.quantity,
        monthlyPaymentPerVehicle: item.monthlyPaymentPerVehicle,
        totalMonthlyPayment: item.totalMonthlyPayment
      },
      message: 'Vehicle added to fleet plan.'
    };
  }

  // getQuoteSummary(quoteType)
  getQuoteSummary(quoteType) {
    const quotes = this._getFromStorage('quotes', []);
    const quoteItems = this._getFromStorage('quote_items', []);
    const vehicles = this._getFromStorage('vehicles', []);
    const leaseOptions = this._getFromStorage('vehicle_lease_options', []);

    const vehiclesById = {};
    for (let i = 0; i < vehicles.length; i++) {
      vehiclesById[vehicles[i].id] = vehicles[i];
    }
    const leaseOptionsById = {};
    for (let i = 0; i < leaseOptions.length; i++) {
      leaseOptionsById[leaseOptions[i].id] = leaseOptions[i];
    }

    function buildQuoteSummary(type) {
      let quote = null;
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].type === type) {
          quote = quotes[i];
          break;
        }
      }
      if (!quote) return null;

      let items = [];
      for (let i = 0; i < quoteItems.length; i++) {
        const qi = quoteItems[i];
        if (qi.quoteId !== quote.id) continue;
        const veh = vehiclesById[qi.vehicleId] || null;
        const opt = leaseOptionsById[qi.vehicleLeaseOptionId] || null;
        items.push({
          quoteItemId: qi.id,
          vehicleName: qi.vehicleName,
          termMonths: qi.termMonths,
          annualMileageAllowance: qi.annualMileageAllowance,
          quantity: qi.quantity,
          monthlyPaymentPerVehicle: qi.monthlyPaymentPerVehicle,
          totalMonthlyPayment: qi.totalMonthlyPayment,
          exteriorColor: qi.exteriorColor || '',
          vehicle: veh,
          vehicleLeaseOption: opt
        });
      }

      return {
        quoteId: quote.id,
        status: quote.status,
        referenceNumber: quote.referenceNumber,
        totalMonthlyPayment: quote.totalMonthlyPayment || 0,
        totalVehicles: quote.totalVehicles || 0,
        items: items
      };
    }

    const result = {};
    if (!quoteType || quoteType === 'personal') {
      result.personalQuote = buildQuoteSummary('personal');
    } else {
      result.personalQuote = null;
    }
    if (!quoteType || quoteType === 'fleet') {
      result.fleetQuote = buildQuoteSummary('fleet');
    } else {
      result.fleetQuote = null;
    }

    return result;
  }

  // updateQuoteItemQuantity(quoteItemId, quantity)
  updateQuoteItemQuantity(quoteItemId, quantity) {
    let quoteItems = this._getFromStorage('quote_items', []);
    let quotes = this._getFromStorage('quotes', []);

    let item = null;
    for (let i = 0; i < quoteItems.length; i++) {
      if (quoteItems[i].id === quoteItemId) {
        item = quoteItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, message: 'Quote item not found.', quoteId: null };
    }

    if (quantity <= 0) {
      // remove item
      const res = this.removeQuoteItem(quoteItemId);
      return res;
    }

    item.quantity = quantity;
    item.totalMonthlyPayment = (item.monthlyPaymentPerVehicle || 0) * quantity;
    this._saveToStorage('quote_items', quoteItems);

    const totals = this._recalculateQuoteTotals(item.quoteId);
    let quote = null;
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i].id === item.quoteId) {
        quote = quotes[i];
        break;
      }
    }

    return {
      success: true,
      quoteId: item.quoteId,
      updatedItem: {
        quoteItemId: item.id,
        quantity: item.quantity,
        totalMonthlyPayment: item.totalMonthlyPayment
      },
      totalMonthlyPayment: totals ? totals.totalMonthlyPayment : (quote ? quote.totalMonthlyPayment : 0),
      totalVehicles: totals ? totals.totalVehicles : (quote ? quote.totalVehicles : 0),
      message: 'Quote item updated.'
    };
  }

  // removeQuoteItem(quoteItemId)
  removeQuoteItem(quoteItemId) {
    let quoteItems = this._getFromStorage('quote_items', []);
    let quotes = this._getFromStorage('quotes', []);

    let quoteId = null;
    let newItems = [];
    for (let i = 0; i < quoteItems.length; i++) {
      const qi = quoteItems[i];
      if (qi.id === quoteItemId) {
        quoteId = qi.quoteId;
      } else {
        newItems.push(qi);
      }
    }

    if (!quoteId) {
      return { success: false, message: 'Quote item not found.', quoteId: null };
    }

    this._saveToStorage('quote_items', newItems);
    const totals = this._recalculateQuoteTotals(quoteId);

    const remainingItemsCount = newItems.filter(function (i) { return i.quoteId === quoteId; }).length;

    let quote = null;
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i].id === quoteId) {
        quote = quotes[i];
        break;
      }
    }

    return {
      success: true,
      quoteId: quoteId,
      remainingItemsCount: remainingItemsCount,
      totalVehicles: totals ? totals.totalVehicles : (quote ? quote.totalVehicles : 0),
      totalMonthlyPayment: totals ? totals.totalMonthlyPayment : (quote ? quote.totalMonthlyPayment : 0),
      message: 'Quote item removed.'
    };
  }

  // submitQuoteRequest(quoteId, additionalNotes)
  submitQuoteRequest(quoteId, additionalNotes) {
    let quotes = this._getFromStorage('quotes', []);
    let quote = null;
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i].id === quoteId) {
        quote = quotes[i];
        break;
      }
    }
    if (!quote) {
      return { success: false, quoteId: null, status: null, referenceNumber: null, message: 'Quote not found.' };
    }

    quote.status = 'submitted';
    if (!quote.referenceNumber) {
      quote.referenceNumber = 'Q-' + quote.id;
    }
    quote.updatedAt = this._now();
    this._saveToStorage('quotes', quotes);

    return {
      success: true,
      quoteId: quote.id,
      status: quote.status,
      referenceNumber: quote.referenceNumber,
      message: 'Quote submitted successfully.'
    };
  }

  // generateQuoteDocument(quoteId, format)
  generateQuoteDocument(quoteId, format) {
    if (format !== 'pdf' && format !== 'html') {
      return { success: false, quoteId: quoteId, format: format, documentUrl: '', message: 'Unsupported format.' };
    }
    const quotes = this._getFromStorage('quotes', []);
    let quote = null;
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i].id === quoteId) {
        quote = quotes[i];
        break;
      }
    }
    if (!quote) {
      return { success: false, quoteId: quoteId, format: format, documentUrl: '', message: 'Quote not found.' };
    }

    const documentUrl = '/quotes/' + quoteId + '.' + format;
    return {
      success: true,
      quoteId: quoteId,
      format: format,
      documentUrl: documentUrl
    };
  }

  // getActiveLeasesFilterOptions()
  getActiveLeasesFilterOptions() {
    const leases = this._getFromStorage('leases', []);
    let minPayment = null;
    let maxPayment = null;
    for (let i = 0; i < leases.length; i++) {
      const lease = leases[i];
      const pay = lease.currentMonthlyPayment || lease.baseMonthlyPayment;
      if (typeof pay === 'number') {
        if (minPayment === null || pay < minPayment) minPayment = pay;
        if (maxPayment === null || pay > maxPayment) maxPayment = pay;
      }
    }

    const usageBands = [
      { code: 'over_80_percent', label: 'Over 80% of mileage', minPercent: 80, maxPercent: 100 },
      { code: 'over_100_percent', label: 'Over 100% of mileage', minPercent: 100, maxPercent: null }
    ];

    const sortOptions = [
      { value: 'monthly_payment_asc', label: 'Monthly payment: Low to High' },
      { value: 'monthly_payment_desc', label: 'Monthly payment: High to Low' },
      { value: 'mileage_usage_desc', label: 'Mileage usage: High to Low' }
    ];

    return {
      usageBands: usageBands,
      monthlyPaymentRange: {
        minAvailable: minPayment !== null ? minPayment : 0,
        maxAvailable: maxPayment !== null ? maxPayment : 0,
        currency: this._getCurrencyDefault()
      },
      sortOptions: sortOptions
    };
  }

  // searchActiveLeases(filters, sort, page, pageSize)
  searchActiveLeases(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'monthly_payment_asc';
    page = page || 1;
    pageSize = pageSize || 25;

    const leases = this._getFromStorage('leases', []);
    const drivers = this._getFromStorage('drivers', []);
    const driversById = {};
    for (let i = 0; i < drivers.length; i++) {
      driversById[drivers[i].id] = drivers[i];
    }

    const filtered = [];
    for (let i = 0; i < leases.length; i++) {
      const lease = leases[i];
      if (filters.leaseStatus && lease.leaseStatus !== filters.leaseStatus) continue;
      if (typeof filters.usagePercentMin === 'number' && lease.mileageUsagePercent < filters.usagePercentMin) continue;
      if (typeof filters.usagePercentMax === 'number' && lease.mileageUsagePercent > filters.usagePercentMax) continue;
      const pay = lease.currentMonthlyPayment || lease.baseMonthlyPayment || 0;
      if (typeof filters.monthlyPaymentMin === 'number' && pay < filters.monthlyPaymentMin) continue;
      if (typeof filters.monthlyPaymentMax === 'number' && pay > filters.monthlyPaymentMax) continue;

      let driverName = '';
      if (lease.assignedDriverId && driversById[lease.assignedDriverId]) {
        driverName = driversById[lease.assignedDriverId].fullName || '';
      }

      filtered.push({
        leaseId: lease.id,
        vehicleName: lease.vehicleName || '',
        registrationNumber: lease.registrationNumber || '',
        driverName: driverName,
        mileageUsagePercent: lease.mileageUsagePercent || 0,
        odometerReading: lease.odometerReading || 0,
        currentMonthlyPayment: pay,
        currency: lease.currency || this._getCurrencyDefault(),
        termMonths: lease.termMonths,
        remainingTermMonths: lease.remainingTermMonths,
        leaseStatus: lease.leaseStatus
      });
    }

    if (sort === 'monthly_payment_asc') {
      filtered.sort(function (a, b) { return a.currentMonthlyPayment - b.currentMonthlyPayment; });
    } else if (sort === 'monthly_payment_desc') {
      filtered.sort(function (a, b) { return b.currentMonthlyPayment - a.currentMonthlyPayment; });
    } else if (sort === 'mileage_usage_desc') {
      filtered.sort(function (a, b) { return b.mileageUsagePercent - a.mileageUsagePercent; });
    }

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paged = filtered.slice(startIndex, startIndex + pageSize);

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getLeaseDetail(leaseId)
  getLeaseDetail(leaseId) {
    const leases = this._getFromStorage('leases', []);
    const vehicles = this._getFromStorage('vehicles', []);
    const drivers = this._getFromStorage('drivers', []);

    let lease = null;
    for (let i = 0; i < leases.length; i++) {
      if (leases[i].id === leaseId) {
        lease = leases[i];
        break;
      }
    }
    if (!lease) {
      return { lease: null, vehicle: null, driver: null, actions: { canAdjustMileage: false, canSuspendUsage: false } };
    }

    let vehicle = null;
    for (let i = 0; i < vehicles.length; i++) {
      if (vehicles[i].id === lease.vehicleId) {
        vehicle = vehicles[i];
        break;
      }
    }

    let driver = null;
    if (lease.assignedDriverId) {
      for (let i = 0; i < drivers.length; i++) {
        if (drivers[i].id === lease.assignedDriverId) {
          driver = drivers[i];
          break;
        }
      }
    }

    const leaseObj = {
      leaseId: lease.id,
      vehicleId: lease.vehicleId,
      vehicleName: lease.vehicleName || '',
      registrationNumber: lease.registrationNumber || '',
      leaseStatus: lease.leaseStatus,
      startDate: lease.startDate,
      endDate: lease.endDate,
      termMonths: lease.termMonths,
      remainingTermMonths: lease.remainingTermMonths,
      baseMonthlyPayment: lease.baseMonthlyPayment,
      currentMonthlyPayment: lease.currentMonthlyPayment,
      currency: lease.currency || this._getCurrencyDefault(),
      annualMileageAllowance: lease.annualMileageAllowance,
      mileageUsed: lease.mileageUsed,
      mileageUsagePercent: lease.mileageUsagePercent,
      odometerReading: lease.odometerReading,
      lastServiceDate: lease.lastServiceDate || null
    };

    const vehicleObj = vehicle ? {
      vehicleId: vehicle.id,
      name: vehicle.name,
      make: vehicle.make,
      model: vehicle.model,
      modelYear: vehicle.modelYear,
      bodyStyleLabel: this._getBodyStyleLabel(vehicle.bodyStyle),
      fuelTypeLabel: this._getFuelTypeLabel(vehicle.fuelType),
      exteriorColor: vehicle.defaultExteriorColor || ''
    } : null;

    const driverObj = driver ? {
      driverId: driver.id,
      fullName: driver.fullName,
      mobileNumber: driver.mobileNumber,
      status: driver.status
    } : null;

    const actions = {
      canAdjustMileage: lease.leaseStatus === 'active',
      canSuspendUsage: lease.leaseStatus === 'active'
    };

    return {
      lease: leaseObj,
      vehicle: vehicleObj,
      driver: driverObj,
      actions: actions
    };
  }

  // getLeaseMileageOptions(leaseId)
  getLeaseMileageOptions(leaseId) {
    const mileageOptions = this._getFromStorage('lease_mileage_options', []);
    const options = [];
    for (let i = 0; i < mileageOptions.length; i++) {
      const o = mileageOptions[i];
      if (o.leaseId !== leaseId) continue;
      options.push({
        mileageOptionId: o.id,
        annualMileageAllowance: o.annualMileageAllowance,
        monthlyPayment: o.monthlyPayment,
        additionalMonthlyCost: o.additionalMonthlyCost,
        isCurrent: !!o.isCurrent,
        sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : 0
      });
    }
    options.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    return { leaseId: leaseId, options: options };
  }

  // updateLeaseMileagePlan(leaseId, mileageOptionId)
  updateLeaseMileagePlan(leaseId, mileageOptionId) {
    let leases = this._getFromStorage('leases', []);
    let mileageOptions = this._getFromStorage('lease_mileage_options', []);

    let lease = null;
    for (let i = 0; i < leases.length; i++) {
      if (leases[i].id === leaseId) {
        lease = leases[i];
        break;
      }
    }
    if (!lease) {
      return { success: false, leaseId: leaseId, message: 'Lease not found.' };
    }

    let option = null;
    for (let i = 0; i < mileageOptions.length; i++) {
      if (mileageOptions[i].id === mileageOptionId && mileageOptions[i].leaseId === leaseId) {
        option = mileageOptions[i];
        break;
      }
    }
    if (!option) {
      return { success: false, leaseId: leaseId, message: 'Mileage option not found for lease.' };
    }

    const previousAnnualMileageAllowance = lease.annualMileageAllowance;
    const previousMonthlyPayment = lease.currentMonthlyPayment || lease.baseMonthlyPayment || 0;

    lease.annualMileageAllowance = option.annualMileageAllowance;
    lease.currentMonthlyPayment = option.monthlyPayment;
    lease.updatedAt = this._now();

    for (let i = 0; i < mileageOptions.length; i++) {
      if (mileageOptions[i].leaseId === leaseId) {
        mileageOptions[i].isCurrent = (mileageOptions[i].id === mileageOptionId);
        mileageOptions[i].additionalMonthlyCost = mileageOptions[i].monthlyPayment - lease.baseMonthlyPayment;
      }
    }

    this._saveToStorage('leases', leases);
    this._saveToStorage('lease_mileage_options', mileageOptions);

    const newMonthlyPayment = lease.currentMonthlyPayment;
    const additionalMonthlyCostApplied = newMonthlyPayment - previousMonthlyPayment;

    return {
      success: true,
      leaseId: leaseId,
      previousAnnualMileageAllowance: previousAnnualMileageAllowance,
      newAnnualMileageAllowance: lease.annualMileageAllowance,
      previousMonthlyPayment: previousMonthlyPayment,
      newMonthlyPayment: newMonthlyPayment,
      additionalMonthlyCostApplied: additionalMonthlyCostApplied,
      message: 'Mileage plan updated.'
    };
  }

  // previewLeaseSuspension(leaseId, startDate, durationMonths, reason)
  previewLeaseSuspension(leaseId, startDate, durationMonths, reason) {
    const preview = this._calculateLeaseSuspensionPreview(leaseId, startDate, durationMonths, reason);
    if (!preview) {
      return {
        leaseId: leaseId,
        startDate: startDate,
        endDate: null,
        durationMonths: durationMonths,
        reason: reason,
        currentMonthlyPayment: 0,
        estimatedMonthlyPaymentDuringSuspension: 0,
        currency: this._getCurrencyDefault(),
        estimatedSavingsTotal: 0,
        notes: 'Lease not found.'
      };
    }
    return preview;
  }

  // confirmLeaseSuspension(leaseId, startDate, durationMonths, reason)
  confirmLeaseSuspension(leaseId, startDate, durationMonths, reason) {
    const preview = this._calculateLeaseSuspensionPreview(leaseId, startDate, durationMonths, reason);
    if (!preview) {
      return { success: false, leaseSuspensionId: null, leaseId: leaseId, status: null, startDate: startDate, endDate: null, durationMonths: durationMonths, reason: reason, previewedNewMonthlyPayment: 0, message: 'Lease not found.' };
    }

    let leaseSuspensions = this._getFromStorage('lease_suspensions', []);
    const suspension = {
      id: this._generateId('leasesusp'),
      leaseId: leaseId,
      startDate: preview.startDate,
      endDate: preview.endDate,
      durationMonths: durationMonths,
      reason: reason,
      status: 'pending',
      previewedNewMonthlyPayment: preview.estimatedMonthlyPaymentDuringSuspension,
      createdAt: this._now()
    };

    leaseSuspensions.push(suspension);
    this._saveToStorage('lease_suspensions', leaseSuspensions);

    return {
      success: true,
      leaseSuspensionId: suspension.id,
      leaseId: leaseId,
      status: suspension.status,
      startDate: suspension.startDate,
      endDate: suspension.endDate,
      durationMonths: suspension.durationMonths,
      reason: suspension.reason,
      previewedNewMonthlyPayment: suspension.previewedNewMonthlyPayment,
      message: 'Lease suspension created.'
    };
  }

  // searchMaintenanceVehicles(filters, sort, page, pageSize)
  searchMaintenanceVehicles(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'odometer_desc';
    page = page || 1;
    pageSize = pageSize || 25;

    const leases = this._getFromStorage('leases', []);
    const results = [];

    const lastServiceBeforeDate = filters.lastServiceBefore ? new Date(filters.lastServiceBefore) : null;

    for (let i = 0; i < leases.length; i++) {
      const lease = leases[i];
      if (typeof filters.odometerMin === 'number' && lease.odometerReading < filters.odometerMin) continue;
      if (typeof filters.odometerMax === 'number' && lease.odometerReading > filters.odometerMax) continue;
      if (lastServiceBeforeDate && lease.lastServiceDate) {
        const lastService = new Date(lease.lastServiceDate);
        if (!(lastService < lastServiceBeforeDate)) continue;
      }

      results.push({
        leaseId: lease.id,
        vehicleName: lease.vehicleName || '',
        registrationNumber: lease.registrationNumber || '',
        odometerReading: lease.odometerReading || 0,
        lastServiceDate: lease.lastServiceDate || null,
        mileageUsagePercent: lease.mileageUsagePercent || 0,
        currentMonthlyPayment: lease.currentMonthlyPayment || lease.baseMonthlyPayment || 0,
        currency: lease.currency || this._getCurrencyDefault()
      });
    }

    if (sort === 'odometer_desc') {
      results.sort(function (a, b) { return b.odometerReading - a.odometerReading; });
    } else if (sort === 'last_service_asc') {
      results.sort(function (a, b) {
        const da = a.lastServiceDate ? new Date(a.lastServiceDate).getTime() : 0;
        const db = b.lastServiceDate ? new Date(b.lastServiceDate).getTime() : 0;
        return da - db;
      });
    } else if (sort === 'registration_asc') {
      results.sort(function (a, b) {
        const ra = a.registrationNumber || '';
        const rb = b.registrationNumber || '';
        if (ra < rb) return -1;
        if (ra > rb) return 1;
        return 0;
      });
    }

    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const paged = results.slice(startIndex, startIndex + pageSize);

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getServiceCentersByZip(zipCode, maxResults)
  getServiceCentersByZip(zipCode, maxResults) {
    maxResults = maxResults || 10;
    const centers = this._getFromStorage('service_centers', []);
    const filtered = [];

    for (let i = 0; i < centers.length; i++) {
      const c = centers[i];
      if (!zipCode || c.zipCode === zipCode) {
        filtered.push(c);
      }
    }

    filtered.sort(function (a, b) {
      const da = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.MAX_VALUE;
      const db = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.MAX_VALUE;
      return da - db;
    });

    const resultCenters = [];
    for (let i = 0; i < filtered.length && i < maxResults; i++) {
      const c = filtered[i];
      resultCenters.push({
        serviceCenterId: c.id,
        name: c.name,
        addressLine1: c.addressLine1,
        addressLine2: c.addressLine2 || '',
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        phoneNumber: c.phoneNumber || '',
        distanceMiles: typeof c.distanceMiles === 'number' ? c.distanceMiles : null
      });
    }

    return {
      zipCode: zipCode,
      centers: resultCenters
    };
  }

  // scheduleServiceAppointments(leaseIds, serviceCenterId, preferredDate, serviceType)
  scheduleServiceAppointments(leaseIds, serviceCenterId, preferredDate, serviceType) {
    const leases = this._getFromStorage('leases', []);
    const centers = this._getFromStorage('service_centers', []);
    let appointments = this._getFromStorage('service_appointments', []);

    let center = null;
    for (let i = 0; i < centers.length; i++) {
      if (centers[i].id === serviceCenterId) {
        center = centers[i];
        break;
      }
    }
    if (!center) {
      return { success: false, appointmentIds: [], countScheduled: 0, details: [], message: 'Service center not found.' };
    }

    const validLeaseIds = {};
    for (let i = 0; i < leases.length; i++) {
      validLeaseIds[leases[i].id] = true;
    }

    const appointmentIds = [];
    const details = [];

    for (let i = 0; i < leaseIds.length; i++) {
      const leaseId = leaseIds[i];
      if (!validLeaseIds[leaseId]) continue;
      const appointment = {
        id: this._generateId('serviceappt'),
        leaseId: leaseId,
        serviceCenterId: serviceCenterId,
        serviceType: serviceType,
        preferredDate: preferredDate,
        scheduledDate: null,
        status: 'scheduled',
        createdAt: this._now()
      };
      appointments.push(appointment);
      appointmentIds.push(appointment.id);
      details.push({
        appointmentId: appointment.id,
        leaseId: leaseId,
        status: appointment.status,
        preferredDate: appointment.preferredDate,
        serviceCenterName: center.name
      });
    }

    this._saveToStorage('service_appointments', appointments);

    return {
      success: true,
      appointmentIds: appointmentIds,
      countScheduled: appointmentIds.length,
      details: details,
      message: 'Service appointments scheduled.'
    };
  }

  // getDriversList(filters, sort, page, pageSize)
  getDriversList(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'name_asc';
    page = page || 1;
    pageSize = pageSize || 25;

    const drivers = this._getFromStorage('drivers', []);
    const results = [];
    const searchTerm = filters.searchTerm ? String(filters.searchTerm).toLowerCase() : null;

    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[i];
      if (filters.status && filters.status !== 'all' && d.status !== filters.status) continue;
      if (searchTerm) {
        const combined = (d.fullName + ' ' + d.driverCode).toLowerCase();
        if (combined.indexOf(searchTerm) === -1) continue;
      }
      results.push({
        driverId: d.id,
        fullName: d.fullName,
        driverCode: d.driverCode,
        mobileNumber: d.mobileNumber,
        status: d.status,
        createdAt: d.createdAt
      });
    }

    if (sort === 'name_asc' || sort === 'name_desc') {
      results.sort(function (a, b) {
        const na = a.fullName || '';
        const nb = b.fullName || '';
        if (na < nb) return sort === 'name_asc' ? -1 : 1;
        if (na > nb) return sort === 'name_asc' ? 1 : -1;
        return 0;
      });
    } else if (sort === 'created_at_desc') {
      results.sort(function (a, b) {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const paged = results.slice(startIndex, startIndex + pageSize);

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // createDriverProfile(firstName, lastName, driverCode, mobileNumber)
  createDriverProfile(firstName, lastName, driverCode, mobileNumber) {
    let drivers = this._getFromStorage('drivers', []);
    for (let i = 0; i < drivers.length; i++) {
      if (drivers[i].driverCode === driverCode) {
        return { success: false, driverId: null, fullName: null, status: null, message: 'Driver code already exists.' };
      }
    }

    const now = this._now();
    const driver = {
      id: this._generateId('driver'),
      firstName: firstName,
      lastName: lastName,
      fullName: (firstName + ' ' + lastName).trim(),
      driverCode: driverCode,
      mobileNumber: mobileNumber,
      status: 'active',
      createdAt: now
    };

    drivers.push(driver);
    this._saveToStorage('drivers', drivers);

    return {
      success: true,
      driverId: driver.id,
      fullName: driver.fullName,
      status: driver.status,
      message: 'Driver profile created.'
    };
  }

  // getDriverDetail(driverId)
  getDriverDetail(driverId) {
    const drivers = this._getFromStorage('drivers', []);
    const leases = this._getFromStorage('leases', []);
    const assignments = this._getFromStorage('driver_vehicle_assignments', []);

    let driver = null;
    for (let i = 0; i < drivers.length; i++) {
      if (drivers[i].id === driverId) {
        driver = drivers[i];
        break;
      }
    }
    if (!driver) {
      return { driver: null, assignedLeases: [] };
    }

    const leasesById = {};
    for (let i = 0; i < leases.length; i++) {
      leasesById[leases[i].id] = leases[i];
    }

    const assignedLeases = [];
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      if (a.driverId === driverId && a.isActive) {
        const lease = leasesById[a.leaseId];
        if (!lease) continue;
        assignedLeases.push({
          leaseId: lease.id,
          vehicleName: lease.vehicleName || '',
          registrationNumber: lease.registrationNumber || '',
          currentMonthlyPayment: lease.currentMonthlyPayment || lease.baseMonthlyPayment || 0,
          leaseStatus: lease.leaseStatus,
          lease: lease
        });
      }
    }

    return {
      driver: {
        driverId: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        fullName: driver.fullName,
        driverCode: driver.driverCode,
        mobileNumber: driver.mobileNumber,
        status: driver.status,
        createdAt: driver.createdAt
      },
      assignedLeases: assignedLeases
    };
  }

  // updateDriverProfile(driverId, updates)
  updateDriverProfile(driverId, updates) {
    updates = updates || {};
    let drivers = this._getFromStorage('drivers', []);
    let driver = null;
    for (let i = 0; i < drivers.length; i++) {
      if (drivers[i].id === driverId) {
        driver = drivers[i];
        break;
      }
    }
    if (!driver) {
      return { success: false, driverId: driverId, driver: null, message: 'Driver not found.' };
    }

    if (typeof updates.firstName === 'string') driver.firstName = updates.firstName;
    if (typeof updates.lastName === 'string') driver.lastName = updates.lastName;
    if (typeof updates.mobileNumber === 'string') driver.mobileNumber = updates.mobileNumber;
    if (typeof updates.status === 'string') driver.status = updates.status;
    driver.fullName = (driver.firstName + ' ' + driver.lastName).trim();

    this._saveToStorage('drivers', drivers);

    return {
      success: true,
      driverId: driver.id,
      driver: {
        fullName: driver.fullName,
        driverCode: driver.driverCode,
        mobileNumber: driver.mobileNumber,
        status: driver.status
      },
      message: 'Driver profile updated.'
    };
  }

  // getAssignableLeasesForDriver(driverId, filters)
  getAssignableLeasesForDriver(driverId, filters) {
    filters = filters || {};
    const leases = this._getFromStorage('leases', []);
    const assignments = this._getFromStorage('driver_vehicle_assignments', []);

    const activeAssignmentsByLease = {};
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      if (a.isActive) {
        if (!activeAssignmentsByLease[a.leaseId]) {
          activeAssignmentsByLease[a.leaseId] = [];
        }
        activeAssignmentsByLease[a.leaseId].push(a);
      }
    }

    const results = [];
    for (let i = 0; i < leases.length; i++) {
      const lease = leases[i];
      if (lease.leaseStatus !== 'active') continue;
      const pay = lease.currentMonthlyPayment || lease.baseMonthlyPayment || 0;
      if (typeof filters.maxMonthlyPayment === 'number' && pay > filters.maxMonthlyPayment) continue;

      const assignmentsForLease = activeAssignmentsByLease[lease.id] || [];
      let isAssignedToAnotherDriver = false;
      for (let j = 0; j < assignmentsForLease.length; j++) {
        if (assignmentsForLease[j].driverId !== driverId) {
          isAssignedToAnotherDriver = true;
          break;
        }
      }

      if (filters.onlyUnassigned && assignmentsForLease.length > 0) continue;

      results.push({
        leaseId: lease.id,
        vehicleName: lease.vehicleName || '',
        registrationNumber: lease.registrationNumber || '',
        currentMonthlyPayment: pay,
        leaseStatus: lease.leaseStatus,
        isAssignedToAnotherDriver: isAssignedToAnotherDriver,
        lease: lease
      });
    }

    return {
      driverId: driverId,
      results: results
    };
  }

  // assignLeasesToDriver(driverId, leaseIds)
  assignLeasesToDriver(driverId, leaseIds) {
    let drivers = this._getFromStorage('drivers', []);
    let leases = this._getFromStorage('leases', []);
    let assignments = this._getFromStorage('driver_vehicle_assignments', []);

    let driverExists = false;
    for (let i = 0; i < drivers.length; i++) {
      if (drivers[i].id === driverId) {
        driverExists = true;
        break;
      }
    }
    if (!driverExists) {
      return { success: false, driverId: driverId, assignedCount: 0, assignments: [], message: 'Driver not found.' };
    }

    const leaseById = {};
    for (let i = 0; i < leases.length; i++) {
      leaseById[leases[i].id] = leases[i];
    }

    const now = this._now();
    const createdAssignments = [];

    for (let i = 0; i < leaseIds.length; i++) {
      const leaseId = leaseIds[i];
      const lease = leaseById[leaseId];
      if (!lease) continue;

      // Deactivate existing active assignments for this lease
      for (let j = 0; j < assignments.length; j++) {
        if (assignments[j].leaseId === leaseId && assignments[j].isActive) {
          assignments[j].isActive = false;
          assignments[j].unassignedAt = now;
        }
      }

      const assignment = {
        id: this._generateId('drvassign'),
        driverId: driverId,
        leaseId: leaseId,
        assignedAt: now,
        unassignedAt: null,
        isActive: true
      };
      assignments.push(assignment);
      lease.assignedDriverId = driverId;

      createdAssignments.push({
        leaseId: leaseId,
        driverVehicleAssignmentId: assignment.id,
        assignedAt: assignment.assignedAt
      });
    }

    this._saveToStorage('driver_vehicle_assignments', assignments);
    this._saveToStorage('leases', leases);

    return {
      success: createdAssignments.length > 0,
      driverId: driverId,
      assignedCount: createdAssignments.length,
      assignments: createdAssignments,
      message: createdAssignments.length > 0 ? 'Leases assigned to driver.' : 'No leases were assigned.'
    };
  }

  // getInvoiceList(filters, sort, page, pageSize)
  getInvoiceList(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'amount_desc';
    page = page || 1;
    pageSize = pageSize || 25;

    const invoices = this._getFromStorage('invoices', []);
    const results = [];

    const statusFilter = filters.status && filters.status !== 'all' ? filters.status : null;
    const dueBeforeDate = filters.dueBefore ? new Date(filters.dueBefore) : null;
    const dueAfterDate = filters.dueAfter ? new Date(filters.dueAfter) : null;

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      if (statusFilter && inv.status !== statusFilter) continue;
      if (typeof filters.minAmount === 'number' && inv.amountTotal < filters.minAmount) continue;
      if (typeof filters.maxAmount === 'number' && inv.amountTotal > filters.maxAmount) continue;
      if (dueBeforeDate || dueAfterDate) {
        const due = new Date(inv.dueDate);
        if (dueBeforeDate && !(due < dueBeforeDate)) continue;
        if (dueAfterDate && !(due > dueAfterDate)) continue;
      }
      results.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountTotal: inv.amountTotal,
        amountDue: inv.amountDue,
        currency: inv.currency,
        dueDate: inv.dueDate,
        status: inv.status,
        description: inv.description || ''
      });
    }

    if (sort === 'amount_desc' || sort === 'amount_asc') {
      results.sort(function (a, b) {
        return sort === 'amount_desc' ? (b.amountTotal - a.amountTotal) : (a.amountTotal - b.amountTotal);
      });
    } else if (sort === 'due_date_asc' || sort === 'due_date_desc') {
      results.sort(function (a, b) {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return sort === 'due_date_asc' ? (da - db) : (db - da);
      });
    } else if (sort === 'created_at_desc') {
      results.sort(function (a, b) {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const paged = results.slice(startIndex, startIndex + pageSize);

    // Instrumentation for task completion tracking
    try {
      if (
        filters &&
        typeof filters.status === 'string' &&
        filters.status.toLowerCase() === 'unpaid' &&
        sort === 'amount_desc' &&
        page === 1 &&
        paged &&
        paged.length > 0
      ) {
        localStorage.setItem('task7_highestUnpaidInvoiceId', paged[0].invoiceId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getInvoiceDetail(invoiceId)
  getInvoiceDetail(invoiceId) {
    const invoices = this._getFromStorage('invoices', []);
    const lineItems = this._getFromStorage('invoice_line_items', []);

    let invoice = null;
    for (let i = 0; i < invoices.length; i++) {
      if (invoices[i].id === invoiceId) {
        invoice = invoices[i];
        break;
      }
    }
    if (!invoice) {
      return { invoice: null, lineItems: [] };
    }

    const items = [];
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      if (li.invoiceId !== invoiceId) continue;
      items.push({
        invoiceLineItemId: li.id,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal
      });
    }

    const invObj = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountTotal: invoice.amountTotal,
      amountDue: invoice.amountDue,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
      description: invoice.description || '',
      createdAt: invoice.createdAt
    };

    return {
      invoice: invObj,
      lineItems: items
    };
  }

  // getAvailablePaymentMethods()
  getAvailablePaymentMethods() {
    const methods = this._getFromStorage('payment_methods', []);
    const result = [];
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i];
      result.push({
        paymentMethodId: m.id,
        label: m.label,
        methodType: m.methodType,
        cardBrand: m.cardBrand || null,
        last4: m.last4 || null,
        expiryMonth: m.expiryMonth || null,
        expiryYear: m.expiryYear || null,
        isDefault: !!m.isDefault
      });
    }
    return { methods: result };
  }

  // prepareInvoicePayment(invoiceId, paymentMethodId, amountMode, partialAmount, billingContactEmail)
  prepareInvoicePayment(invoiceId, paymentMethodId, amountMode, partialAmount, billingContactEmail) {
    const invoices = this._getFromStorage('invoices', []);
    const methods = this._getFromStorage('payment_methods', []);
    let invoice = null;
    for (let i = 0; i < invoices.length; i++) {
      if (invoices[i].id === invoiceId) {
        invoice = invoices[i];
        break;
      }
    }
    if (!invoice) {
      return { success: false, paymentTransactionId: null, invoiceId: invoiceId, amount: 0, currency: this._getCurrencyDefault(), paymentMethodLabel: '', billingContactEmail: billingContactEmail, status: 'failed', message: 'Invoice not found.' };
    }

    let method = null;
    for (let i = 0; i < methods.length; i++) {
      if (methods[i].id === paymentMethodId) {
        method = methods[i];
        break;
      }
    }
    if (!method) {
      return { success: false, paymentTransactionId: null, invoiceId: invoiceId, amount: 0, currency: invoice.currency, paymentMethodLabel: '', billingContactEmail: billingContactEmail, status: 'failed', message: 'Payment method not found.' };
    }

    let amount = 0;
    if (amountMode === 'full') {
      amount = invoice.amountDue;
    } else if (amountMode === 'partial') {
      amount = typeof partialAmount === 'number' ? partialAmount : 0;
    } else {
      return { success: false, paymentTransactionId: null, invoiceId: invoiceId, amount: 0, currency: invoice.currency, paymentMethodLabel: method.label, billingContactEmail: billingContactEmail, status: 'failed', message: 'Invalid amount mode.' };
    }

    const validation = this._validateInvoicePaymentAmount(invoice, amount, amountMode);
    if (!validation.valid) {
      return { success: false, paymentTransactionId: null, invoiceId: invoiceId, amount: amount, currency: invoice.currency, paymentMethodLabel: method.label, billingContactEmail: billingContactEmail, status: 'failed', message: validation.message };
    }

    let transactions = this._getFromStorage('payment_transactions', []);
    const transaction = {
      id: this._generateId('paytxn'),
      invoiceId: invoiceId,
      paymentMethodId: paymentMethodId,
      amount: amount,
      currency: invoice.currency,
      billingContactEmail: billingContactEmail,
      status: 'pending',
      createdAt: this._now()
    };
    transactions.push(transaction);
    this._saveToStorage('payment_transactions', transactions);

    return {
      success: true,
      paymentTransactionId: transaction.id,
      invoiceId: invoiceId,
      amount: amount,
      currency: invoice.currency,
      paymentMethodLabel: method.label,
      billingContactEmail: billingContactEmail,
      status: transaction.status,
      message: 'Payment prepared for review.'
    };
  }

  // confirmInvoicePayment(paymentTransactionId)
  confirmInvoicePayment(paymentTransactionId) {
    let transactions = this._getFromStorage('payment_transactions', []);
    let invoices = this._getFromStorage('invoices', []);

    let txn = null;
    for (let i = 0; i < transactions.length; i++) {
      if (transactions[i].id === paymentTransactionId) {
        txn = transactions[i];
        break;
      }
    }
    if (!txn) {
      return { success: false, paymentTransactionId: paymentTransactionId, invoiceId: null, status: 'failed', amount: 0, currency: this._getCurrencyDefault(), message: 'Payment transaction not found.' };
    }

    let invoice = null;
    for (let i = 0; i < invoices.length; i++) {
      if (invoices[i].id === txn.invoiceId) {
        invoice = invoices[i];
        break;
      }
    }
    if (!invoice) {
      txn.status = 'failed';
      this._saveToStorage('payment_transactions', transactions);
      return { success: false, paymentTransactionId: txn.id, invoiceId: null, status: 'failed', amount: txn.amount, currency: txn.currency, message: 'Invoice not found.' };
    }

    txn.status = 'succeeded';
    const newAmountDue = invoice.amountDue - txn.amount;
    invoice.amountDue = newAmountDue > 0 ? newAmountDue : 0;
    if (invoice.amountDue <= 0) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partially_paid';
    }

    this._saveToStorage('payment_transactions', transactions);
    this._saveToStorage('invoices', invoices);

    return {
      success: true,
      paymentTransactionId: txn.id,
      invoiceId: invoice.id,
      status: txn.status,
      amount: txn.amount,
      currency: txn.currency,
      message: 'Payment submitted successfully.'
    };
  }

  // getAccessoryCategories()
  getAccessoryCategories() {
    const categories = this._getFromStorage('accessory_categories', []);
    const result = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      result.push({
        categoryId: c.id,
        name: c.name,
        code: c.code,
        description: c.description || ''
      });
    }
    return { categories: result };
  }

  // searchAccessoryProducts(categoryId, query, filters, sort, page, pageSize)
  searchAccessoryProducts(categoryId, query, filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'most_popular';
    page = page || 1;
    pageSize = pageSize || 20;

    const products = this._getFromStorage('accessory_products', []);
    const categories = this._getFromStorage('accessory_categories', []);
    const categoryById = {};
    for (let i = 0; i < categories.length; i++) {
      categoryById[categories[i].id] = categories[i];
    }

    const q = query ? String(query).toLowerCase() : null;
    const resultsAll = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status !== 'active') continue;
      if (p.categoryId !== categoryId) continue;
      if (typeof filters.minRating === 'number' && p.averageRating < filters.minRating) continue;
      if (typeof filters.maxSubscriptionPrice === 'number' && p.subscriptionPricePerVehiclePerMonth > filters.maxSubscriptionPrice) continue;
      if (q) {
        const text = (p.name + ' ' + (p.description || '')).toLowerCase();
        if (text.indexOf(q) === -1) continue;
      }

      const cat = categoryById[p.categoryId] || null;
      resultsAll.push({
        productId: p.id,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: cat ? cat.name : '',
        descriptionSnippet: p.description ? p.description.substring(0, 140) : '',
        oneTimePrice: p.oneTimePrice,
        subscriptionPricePerVehiclePerMonth: p.subscriptionPricePerVehiclePerMonth,
        averageRating: p.averageRating,
        ratingCount: p.ratingCount,
        imageUrl: p.imageUrl || '',
        status: p.status,
        category: cat,
        product: p
      });
    }

    if (sort === 'most_popular') {
      resultsAll.sort(function (a, b) {
        const pa = typeof a.product.popularityScore === 'number' ? a.product.popularityScore : 0;
        const pb = typeof b.product.popularityScore === 'number' ? b.product.popularityScore : 0;
        if (pa !== pb) return pb - pa;
        return b.ratingCount - a.ratingCount;
      });
    } else if (sort === 'price_asc') {
      resultsAll.sort(function (a, b) { return a.oneTimePrice - b.oneTimePrice; });
    } else if (sort === 'price_desc') {
      resultsAll.sort(function (a, b) { return b.oneTimePrice - a.oneTimePrice; });
    } else if (sort === 'rating_desc') {
      resultsAll.sort(function (a, b) { return b.averageRating - a.averageRating; });
    }

    const totalCount = resultsAll.length;
    const startIndex = (page - 1) * pageSize;
    const paged = resultsAll.slice(startIndex, startIndex + pageSize);

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getAccessoryProductDetail(productId)
  getAccessoryProductDetail(productId) {
    const products = this._getFromStorage('accessory_products', []);
    const categories = this._getFromStorage('accessory_categories', []);
    const categoryById = {};
    for (let i = 0; i < categories.length; i++) {
      categoryById[categories[i].id] = categories[i];
    }

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { product: null, specs: [] };
    }

    const cat = categoryById[product.categoryId] || null;
    const productObj = {
      productId: product.id,
      name: product.name,
      categoryId: product.categoryId,
      categoryName: cat ? cat.name : '',
      description: product.description || '',
      oneTimePrice: product.oneTimePrice,
      subscriptionPricePerVehiclePerMonth: product.subscriptionPricePerVehiclePerMonth,
      averageRating: product.averageRating,
      ratingCount: product.ratingCount,
      imageUrl: product.imageUrl || '',
      status: product.status,
      category: cat
    };

    return {
      product: productObj,
      specs: []
    };
  }

  // addAccessoryProductToCart(productId, quantity, shippingMethod)
  addAccessoryProductToCart(productId, quantity, shippingMethod) {
    quantity = typeof quantity === 'number' ? quantity : 1;
    const products = this._getFromStorage('accessory_products', []);
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, cartId: null, cartStatus: null, item: null, cartTotals: null, message: 'Product not found.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const item = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      unitPrice: product.oneTimePrice,
      subscriptionPricePerUnit: product.subscriptionPricePerVehiclePerMonth,
      shippingMethod: shippingMethod,
      lineTotal: product.oneTimePrice * quantity
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart.id);

    const itemReturn = {
      cartItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subscriptionPricePerUnit: item.subscriptionPricePerUnit,
      shippingMethod: item.shippingMethod,
      lineTotal: item.lineTotal,
      product: product
    };

    return {
      success: true,
      cartId: cart.id,
      cartStatus: cart.status,
      item: itemReturn,
      cartTotals: totals,
      message: 'Product added to cart.'
    };
  }

  // getCartDetails()
  getCartDetails() {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('accessory_products', []);
    const productsById = {};
    for (let i = 0; i < products.length; i++) {
      productsById[products[i].id] = products[i];
    }

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return {
        cartId: null,
        status: 'open',
        items: [],
        totals: { subtotal: 0, subscriptionSubtotal: 0, shippingTotal: 0, grandTotal: 0 }
      };
    }

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cartId !== cart.id) continue;
      const product = productsById[ci.productId] || null;
      items.push({
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        subscriptionPricePerUnit: ci.subscriptionPricePerUnit,
        shippingMethod: ci.shippingMethod,
        lineTotal: ci.lineTotal,
        product: product
      });
    }

    const totals = {
      subtotal: cart.subtotal || 0,
      subscriptionSubtotal: cart.subscriptionSubtotal || 0,
      shippingTotal: cart.shippingTotal || 0,
      grandTotal: cart.grandTotal || 0
    };

    return {
      cartId: cart.id,
      status: cart.status,
      items: items,
      totals: totals
    };
  }

  // updateCartItem(cartItemId, quantity, shippingMethod)
  updateCartItem(cartItemId, quantity, shippingMethod) {
    let cartItems = this._getFromStorage('cart_items', []);
    let carts = this._getFromStorage('carts', []);

    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, cartId: null, updatedItem: null, cartTotals: null, message: 'Cart item not found.' };
    }

    if (typeof quantity === 'number') {
      if (quantity <= 0) {
        // remove item
        const newItems = [];
        for (let i = 0; i < cartItems.length; i++) {
          if (cartItems[i].id !== cartItemId) newItems.push(cartItems[i]);
        }
        cartItems = newItems;
        this._saveToStorage('cart_items', cartItems);
        const totals = this._recalculateCartTotals(item.cartId);
        return {
          success: true,
          cartId: item.cartId,
          updatedItem: null,
          cartTotals: totals,
          message: 'Cart item removed.'
        };
      }
      item.quantity = quantity;
    }
    if (typeof shippingMethod === 'string') {
      item.shippingMethod = shippingMethod;
    }
    item.lineTotal = (item.unitPrice || 0) * (item.quantity || 0);

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(item.cartId);

    const updatedItem = {
      cartItemId: item.id,
      quantity: item.quantity,
      shippingMethod: item.shippingMethod,
      lineTotal: item.lineTotal
    };

    return {
      success: true,
      cartId: item.cartId,
      updatedItem: updatedItem,
      cartTotals: totals,
      message: 'Cart item updated.'
    };
  }

  // startCheckout()
  startCheckout() {
    const cartDetails = this.getCartDetails();
    const availableShippingMethods = [
      { value: 'standard', label: 'Standard Shipping' },
      { value: 'expedited', label: 'Expedited Shipping' },
      { value: 'overnight', label: 'Overnight Shipping' }
    ];

    // Instrumentation for task completion tracking
    try {
      if (cartDetails && Array.isArray(cartDetails.items) && cartDetails.items.length > 0) {
        localStorage.setItem('task9_checkoutStarted', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const items = cartDetails.items || [];
    const recurringSubscriptions = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const totalSub = (item.subscriptionPricePerUnit || 0) * (item.quantity || 0);
      if (totalSub > 0) {
        recurringSubscriptions.push({
          productName: item.productName,
          quantity: item.quantity,
          subscriptionPricePerUnit: item.subscriptionPricePerUnit,
          totalSubscriptionPerMonth: totalSub
        });
      }
    }

    return {
      cartId: cartDetails.cartId,
      items: items,
      availableShippingMethods: availableShippingMethods,
      totals: cartDetails.totals,
      recurringSubscriptions: recurringSubscriptions
    };
  }

  // placeAccessoryOrder(billingContactEmail, shippingAddress, paymentMethodId, specialInstructions)
  placeAccessoryOrder(billingContactEmail, shippingAddress, paymentMethodId, specialInstructions) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const methods = this._getFromStorage('payment_methods', []);

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return { success: false, orderId: null, cartId: null, grandTotal: 0, currency: this._getCurrencyDefault(), message: 'No open cart to checkout.' };
    }

    let hasItems = false;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cartId === cart.id) {
        hasItems = true;
        break;
      }
    }
    if (!hasItems) {
      return { success: false, orderId: null, cartId: cart.id, grandTotal: 0, currency: this._getCurrencyDefault(), message: 'Cart is empty.' };
    }

    let method = null;
    for (let i = 0; i < methods.length; i++) {
      if (methods[i].id === paymentMethodId) {
        method = methods[i];
        break;
      }
    }
    if (!method) {
      return { success: false, orderId: null, cartId: cart.id, grandTotal: cart.grandTotal || 0, currency: this._getCurrencyDefault(), message: 'Payment method not found.' };
    }

    let orders = this._getFromStorage('accessory_orders', []);
    const order = {
      id: this._generateId('accorder'),
      cartId: cart.id,
      billingContactEmail: billingContactEmail,
      shippingAddress: shippingAddress,
      paymentMethodId: paymentMethodId,
      specialInstructions: specialInstructions || '',
      grandTotal: cart.grandTotal || 0,
      currency: this._getCurrencyDefault(),
      createdAt: this._now()
    };
    orders.push(order);
    this._saveToStorage('accessory_orders', orders);

    // mark cart as checked_out
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].status = 'checked_out';
        carts[i].updatedAt = this._now();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    return {
      success: true,
      orderId: order.id,
      cartId: cart.id,
      grandTotal: order.grandTotal,
      currency: order.currency,
      message: 'Accessory order placed successfully.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', null);
    if (!content) {
      return {
        title: '',
        bodyHtml: '',
        keyStats: [],
        highlights: []
      };
    }
    return content;
  }

  // getContactPageContent()
  getContactPageContent() {
    const content = this._getFromStorage('contact_page_content', null);
    if (!content) {
      return {
        supportEmail: '',
        supportPhone: '',
        billingEmail: '',
        billingPhone: '',
        officeAddress: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },
        supportHours: ''
      };
    }
    return content;
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    let tickets = this._getFromStorage('contact_tickets', []);
    const ticket = {
      id: this._generateId('ticket'),
      name: name,
      email: email,
      topic: topic,
      message: message,
      createdAt: this._now()
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticketId: ticket.id,
      message: 'Your inquiry has been submitted.'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const policy = this._getFromStorage('privacy_policy_content', null);
    if (!policy) {
      return {
        version: '',
        lastUpdatedDate: '',
        bodyHtml: ''
      };
    }
    return policy;
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const terms = this._getFromStorage('terms_content', null);
    if (!terms) {
      return {
        version: '',
        lastUpdatedDate: '',
        bodyHtml: ''
      };
    }
    return terms;
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