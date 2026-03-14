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
    // Core entity tables based on data model
    const tableKeys = [
      'product_categories',
      'products',
      'services',
      'maintenance_plans',
      'special_offers',
      'service_areas',
      'bookings',
      'installation_quote_requests',
      'financing_plans',
      'financing_applications',
      'blog_articles',
      'cart',
      'cart_items',
      'orders',
      'contact_messages'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Optionally keep legacy/example keys from stub (not used in logic)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.isArray(defaultValue) ? [] : defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      // If parsing fails, reset to default
      return Array.isArray(defaultValue) ? [] : defaultValue;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _formatTime(date) {
    // Format as e.g., '9:00 AM'
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  _formatTimeRange(start, end) {
    return this._formatTime(start) + ' – ' + this._formatTime(end);
  }

  _getServiceById(serviceId) {
    const services = this._getFromStorage('services');
    return services.find((s) => s.id === serviceId) || null;
  }

  _getProductById(productId) {
    const products = this._getFromStorage('products');
    return products.find((p) => p.id === productId) || null;
  }

  _getOfferById(offerId) {
    const offers = this._getFromStorage('special_offers');
    return offers.find((o) => o.id === offerId) || null;
  }

  _ensureSupplementalServices() {
    const services = this._getFromStorage('services');
    let changed = false;

    const ensureService = (template) => {
      if (!services.some((s) => s.id === template.id)) {
        services.push(template);
        changed = true;
      }
    };

    ensureService({
      id: 'thermostat_installation',
      name: 'Smart Thermostat Installation',
      category: 'installation',
      shortDescription: 'Professional installation and setup of your new smart thermostat.',
      longDescription:
        'Our technicians install and configure your smart thermostat, connect it to Wi-Fi, and help you set up schedules.',
      basePrice: 179,
      durationMinutes: 90,
      isEmergencyAvailable: false,
      hasStandardBooking: true,
      hasConsultationOption: false,
      isActive: true,
      image: ''
    });

    ensureService({
      id: 'air_purifier_installation',
      name: 'Whole-Home Air Purifier Installation',
      category: 'indoor_air_quality',
      shortDescription: 'Install a whole-home air purification system to reduce allergens and particles.',
      longDescription:
        'Includes professional installation of a whole-home air purifier in your ductwork and setup of proper airflow.',
      basePrice: 1200,
      durationMinutes: 180,
      isEmergencyAvailable: false,
      hasStandardBooking: true,
      hasConsultationOption: true,
      isActive: true,
      image: ''
    });

    ensureService({
      id: 'uv_air_cleaner',
      name: 'UV Air Cleaner Installation',
      category: 'indoor_air_quality',
      shortDescription: 'Install UV lamps in your ductwork to target airborne bacteria and viruses.',
      longDescription:
        'We install UV lamps in your HVAC system to help reduce certain bacteria, viruses, and mold spores in the airstream.',
      basePrice: 900,
      durationMinutes: 150,
      isEmergencyAvailable: false,
      hasStandardBooking: true,
      hasConsultationOption: true,
      isActive: true,
      image: ''
    });

    ensureService({
      id: 'air_filtration_upgrade',
      name: 'Air Filtration Upgrade',
      category: 'indoor_air_quality',
      shortDescription: 'Upgrade to high-MERV or HEPA filtration for cleaner indoor air.',
      longDescription:
        'Upgrade your existing HVAC system with enhanced filtration options such as media filters or HEPA bypass filters.',
      basePrice: 600,
      durationMinutes: 120,
      isEmergencyAvailable: false,
      hasStandardBooking: true,
      hasConsultationOption: true,
      isActive: true,
      image: ''
    });

    if (changed) {
      this._saveToStorage('services', services);
    }
  }

  _ensureSampleThermostats() {
    const products = this._getFromStorage('products');
    const hasThermostat = products.some((p) => p.categoryKey === 'thermostats');
    if (hasThermostat) return;

    const sampleProduct = {
      id: 'smart_thermostat_basic',
      name: 'Smart Thermostat with Wi-Fi',
      sku: 'THERM-SMART-001',
      categoryKey: 'thermostats',
      shortDescription: 'Smart thermostat with Wi-Fi control and mobile app integration.',
      longDescription:
        'A Wi-Fi enabled smart thermostat that lets you control your home comfort from anywhere using a mobile app.',
      price: 199,
      efficiencyType: 'none',
      efficiencyValue: null,
      isHighEfficiency: false,
      featureTags: ['wifi_enabled', 'smart_connected'],
      ratingAverage: 4.6,
      ratingCount: 50,
      imageUrl: '',
      isActive: true,
      createdAt: this._nowIso()
    };

    products.push(sampleProduct);
    this._saveToStorage('products', products);
  }

  _getCartItemsWithResolved(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const plans = this._getFromStorage('maintenance_plans');
    const products = this._getFromStorage('products');
    const services = this._getFromStorage('services');
    const carts = this._getFromStorage('cart');

    return cartItems
      .filter((item) => item.cartId === cartId)
      .map((item) => ({
        ...item,
        cart: carts.find((c) => c.id === item.cartId) || null,
        maintenancePlan: item.maintenancePlanId
          ? plans.find((p) => p.id === item.maintenancePlanId) || null
          : null,
        product: item.productId
          ? products.find((p) => p.id === item.productId) || null
          : null,
        service: item.serviceId
          ? services.find((s) => s.id === item.serviceId) || null
          : null
      }));
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'active');

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        items: [],
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter((item) => item.cartId === cartId);

    let subtotal = 0;
    itemsForCart.forEach((item) => {
      subtotal += (item.priceSnapshot || 0) * (item.quantity || 0);
    });

    const taxRate = 0.07; // 7% example tax
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    return {
      items: itemsForCart,
      subtotal,
      tax,
      total
    };
  }

  _updateCartSummary(cartId) {
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cartId);
    if (cartIndex === -1) return;

    const totals = this._calculateCartTotals(cartId);
    const itemsSummary = totals.items.map((item) => ({
      cartItemId: item.id,
      itemType: item.itemType,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPrice: item.priceSnapshot,
      lineTotal: item.priceSnapshot * item.quantity
    }));

    carts[cartIndex] = {
      ...carts[cartIndex],
      items: itemsSummary,
      updatedAt: this._nowIso()
    };

    this._saveToStorage('cart', carts);
  }

  // -------------------- Booking Helpers --------------------

  _getOfferDiscountLabel(offer) {
    if (!offer) return '';
    if (offer.discountType === 'percentage' && typeof offer.discountPercent === 'number') {
      return offer.discountPercent + '% off';
    }
    if (offer.discountType === 'fixed_price' && typeof offer.promotionalPrice === 'number') {
      return '$' + offer.promotionalPrice + ' special';
    }
    if (offer.discountType === 'amount_off' && typeof offer.promotionalPrice === 'number') {
      return '$' + offer.promotionalPrice + ' off';
    }
    return '';
  }

  _validateBookingRequest(params) {
    const {
      serviceId,
      bookingType,
      serviceLevel,
      appointmentStart,
      appointmentEnd,
      zip,
      productId,
      offerId
    } = params;

    const service = this._getServiceById(serviceId);
    if (!service || !service.isActive) {
      return { valid: false, message: 'Selected service is not available.' };
    }

    // Validate booking type vs service capabilities
    if (bookingType === 'service' && !service.hasStandardBooking) {
      return { valid: false, message: 'Standard booking is not available for this service.' };
    }
    if ((bookingType === 'emergency' || serviceLevel === 'emergency' || serviceLevel === 'after_hours') && !service.isEmergencyAvailable) {
      return { valid: false, message: 'Emergency booking is not available for this service.' };
    }
    if (bookingType === 'consultation' && !service.hasConsultationOption) {
      return { valid: false, message: 'Consultation is not available for this service.' };
    }

    // Validate service area
    const areaCheck = this.validateServiceAreaByZip(zip);
    if (!areaCheck.isServiceable) {
      return { valid: false, message: areaCheck.message || 'ZIP code not in service area.' };
    }

    // Validate time values
    const start = new Date(appointmentStart);
    const end = new Date(appointmentEnd);
    if (!(start instanceof Date) || isNaN(start.getTime()) || !(end instanceof Date) || isNaN(end.getTime())) {
      return { valid: false, message: 'Invalid appointment time.' };
    }
    if (end <= start) {
      return { valid: false, message: 'Appointment end time must be after start time.' };
    }

    // Validate against available slots
    const startDateObj = new Date(appointmentStart);
    const dateStr =
      !isNaN(startDateObj.getTime())
        ? `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}-${String(startDateObj.getDate()).padStart(2, '0')}`
        : String(appointmentStart).substring(0, 10);
    const durationMinutes = service.durationMinutes || undefined;
    const available = this.getAvailableTimeSlots(
      serviceId,
      dateStr,
      bookingType,
      serviceLevel,
      zip,
      durationMinutes,
      productId || undefined,
      offerId || undefined
    );

    const slotMatches = available.timeSlots.some((slot) => {
      if (!slot.isAvailable) return false;
      const s = new Date(slot.start);
      const e = new Date(slot.end);
      return s <= start && e >= end;
    });

    if (!slotMatches) {
      return { valid: false, message: 'Selected time is no longer available.' };
    }

    return { valid: true, message: 'OK' };
  }

  _reserveTimeSlot(booking) {
    // In this simple implementation, reservation is equivalent to persisting the booking.
    // Actual collision avoidance is handled when computing available time slots and validating.
    const bookings = this._getFromStorage('bookings');
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);
  }

  _generateOrderNumber() {
    // Human-friendly order number
    const counter = this._getNextIdCounter();
    return 'ORD-' + counter;
  }

  // -------------------- Interface Implementations --------------------

  // 1. getHomepageSummary
  getHomepageSummary() {
    const services = this._getFromStorage('services');
    const products = this._getFromStorage('products');
    const offers = this._getFromStorage('special_offers');
    const categories = this._getFromStorage('product_categories');

    const activeServices = services.filter((s) => s.isActive);
    const activeProducts = products.filter((p) => p.isActive);
    const now = new Date();
    const activeOffersRaw = offers.filter((o) => {
      if (!o.isActive) return false;
      if (o.startDate && new Date(o.startDate) > now) return false;
      if (o.endDate && new Date(o.endDate) < now) return false;
      return true;
    });

    const featuredServices = activeServices.slice(0, 5).map((s) => ({
      serviceId: s.id,
      serviceName: s.name,
      category: s.category,
      shortDescription: s.shortDescription || '',
      isEmergencyAvailable: !!s.isEmergencyAvailable,
      hasStandardBooking: !!s.hasStandardBooking,
      hasConsultationOption: !!s.hasConsultationOption,
      // foreign key resolution for serviceId
      service: s
    }));

    const featuredProducts = activeProducts.slice(0, 5).map((p) => {
      const category = categories.find((c) => c.id === p.categoryKey || c.urlParamValue === p.categoryKey);
      return {
        productId: p.id,
        name: p.name,
        categoryKey: p.categoryKey,
        categoryName: category ? category.name : '',
        shortDescription: p.shortDescription || '',
        price: p.price,
        efficiencyType: p.efficiencyType || 'none',
        efficiencyValue: typeof p.efficiencyValue === 'number' ? p.efficiencyValue : null,
        isHighEfficiency: !!p.isHighEfficiency,
        ratingAverage: typeof p.ratingAverage === 'number' ? p.ratingAverage : 0,
        ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 0,
        featureTags: Array.isArray(p.featureTags) ? p.featureTags : [],
        imageUrl: p.imageUrl || ''
      };
    });

    const featuredOffers = activeOffersRaw.slice(0, 5).map((o) => ({
      offerId: o.id,
      title: o.title,
      category: o.category,
      shortDescription: o.shortDescription || '',
      discountType: o.discountType,
      discountPercent: typeof o.discountPercent === 'number' ? o.discountPercent : null,
      promotionalPrice: typeof o.promotionalPrice === 'number' ? o.promotionalPrice : null,
      promoCode: o.promoCode || '',
      expiresAt: o.endDate || null,
      highlightLabel: this._getOfferDiscountLabel(o)
    }));

    return {
      heroMessage: 'Your local HVAC heating & cooling experts. Schedule fast, reliable service today.',
      featuredServices,
      featuredProducts,
      featuredOffers
    };
  }

  // 2. getActiveProductCategories
  getActiveProductCategories() {
    const categories = this._getFromStorage('product_categories');
    return categories.filter((c) => c.isActive);
  }

  // 3. getProductFilterOptions(categoryKey)
  getProductFilterOptions(categoryKey) {
    const products = this._getFromStorage('products');

    let filtered = products;
    if (categoryKey) {
      filtered = filtered.filter((p) => p.categoryKey === categoryKey);
    }

    const prices = filtered.map((p) => p.price).filter((v) => typeof v === 'number');
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const efficiencySet = new Set();
    filtered.forEach((p) => {
      if (p.efficiencyType && p.efficiencyType !== 'none') {
        efficiencySet.add(p.efficiencyType);
      }
    });

    const efficiencyTypes = Array.from(efficiencySet).map((value) => {
      let label;
      if (value === 'afue') label = 'AFUE (furnace efficiency)';
      else if (value === 'seer') label = 'SEER (cooling efficiency)';
      else if (value === 'eer') label = 'EER (energy efficiency ratio)';
      else if (value === 'hspf') label = 'HSPF (heat pump efficiency)';
      else label = value.toUpperCase();
      return { value, label };
    });

    const efficiencyRanges = [];
    if (efficiencySet.has('afue')) {
      efficiencyRanges.push({
        id: 'afue_95_plus',
        efficiencyType: 'afue',
        minValue: 95,
        maxValue: 100,
        label: '95%+ AFUE'
      });
    }
    if (efficiencySet.has('seer')) {
      efficiencyRanges.push({
        id: 'seer_16_plus',
        efficiencyType: 'seer',
        minValue: 16,
        maxValue: 99,
        label: '16+ SEER'
      });
    }

    const featureSet = new Set();
    filtered.forEach((p) => {
      if (Array.isArray(p.featureTags)) {
        p.featureTags.forEach((t) => featureSet.add(t));
      }
    });

    const featureTags = Array.from(featureSet).map((code) => ({
      code,
      label: code
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }));

    const ratingOptions = [
      { minRating: 4, label: '4 stars & up' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 2, label: '2 stars & up' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' },
      { value: 'customer_rating_high_to_low', label: 'Customer Rating – High to Low' }
    ];

    return {
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 25
      },
      efficiencyTypes,
      efficiencyRanges,
      featureTags,
      ratingOptions,
      sortOptions
    };
  }

  // 4. searchProducts
  searchProducts(query, categoryKey, filters, sortBy, page, pageSize) {
    this._ensureSampleThermostats();
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const q = query ? String(query).toLowerCase() : '';
    const effectiveFilters = filters || {};

    let results = products.slice();

    const onlyActive =
      typeof effectiveFilters.onlyActive === 'boolean' ? effectiveFilters.onlyActive : true;
    if (onlyActive) {
      results = results.filter((p) => p.isActive);
    }

    if (categoryKey) {
      results = results.filter((p) => p.categoryKey === categoryKey);
    }

    if (q) {
      results = results.filter((p) => {
        const haystack = [p.name, p.shortDescription, p.longDescription]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (typeof effectiveFilters.minPrice === 'number') {
      results = results.filter((p) => p.price >= effectiveFilters.minPrice);
    }
    if (typeof effectiveFilters.maxPrice === 'number') {
      results = results.filter((p) => p.price <= effectiveFilters.maxPrice);
    }
    if (effectiveFilters.efficiencyType) {
      results = results.filter((p) => p.efficiencyType === effectiveFilters.efficiencyType);
    }
    if (typeof effectiveFilters.minEfficiencyValue === 'number') {
      results = results.filter(
        (p) => typeof p.efficiencyValue === 'number' && p.efficiencyValue >= effectiveFilters.minEfficiencyValue
      );
    }
    if (typeof effectiveFilters.isHighEfficiency === 'boolean') {
      results = results.filter((p) => !!p.isHighEfficiency === effectiveFilters.isHighEfficiency);
    }
    if (Array.isArray(effectiveFilters.featureTags) && effectiveFilters.featureTags.length) {
      results = results.filter((p) => {
        const tags = Array.isArray(p.featureTags) ? p.featureTags : [];
        return effectiveFilters.featureTags.every((t) => tags.includes(t));
      });
    }
    if (typeof effectiveFilters.minRating === 'number') {
      results = results.filter(
        (p) => typeof p.ratingAverage === 'number' && p.ratingAverage >= effectiveFilters.minRating
      );
    }
    if (typeof effectiveFilters.maxRating === 'number') {
      results = results.filter(
        (p) => typeof p.ratingAverage === 'number' && p.ratingAverage <= effectiveFilters.maxRating
      );
    }

    // Sorting
    if (sortBy === 'customer_rating_high_to_low') {
      results.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
    } else if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const total = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * ps;
    const pageItems = results.slice(startIndex, startIndex + ps);

    const mapped = pageItems.map((p) => {
      const category = categories.find(
        (c) => c.id === p.categoryKey || c.urlParamValue === p.categoryKey
      );
      const badges = [];
      if (p.isHighEfficiency) badges.push('High efficiency');
      if ((p.ratingAverage || 0) >= 4.5 && (p.ratingCount || 0) >= 10) {
        badges.push('Best seller');
      }
      return {
        id: p.id,
        name: p.name,
        shortDescription: p.shortDescription || '',
        price: p.price,
        efficiencyType: p.efficiencyType || 'none',
        efficiencyValue: typeof p.efficiencyValue === 'number' ? p.efficiencyValue : null,
        isHighEfficiency: !!p.isHighEfficiency,
        ratingAverage: typeof p.ratingAverage === 'number' ? p.ratingAverage : 0,
        ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 0,
        featureTags: Array.isArray(p.featureTags) ? p.featureTags : [],
        imageUrl: p.imageUrl || '',
        categoryKey: p.categoryKey,
        categoryName: category ? category.name : '',
        badges
      };
    });

    return {
      products: mapped,
      total,
      page: pg,
      pageSize: ps
    };
  }

  // 5. getProductDetails
  getProductDetails(productId) {
    this._ensureSupplementalServices();
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const offers = this._getFromStorage('special_offers');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        efficiencyLabel: '',
        ratingLabel: '',
        applicableOffers: [],
        installationServiceId: null,
        installationServiceName: null
      };
    }

    const category = categories.find(
      (c) => c.id === product.categoryKey || c.urlParamValue === product.categoryKey
    );

    const productWithCategory = {
      ...product,
      categoryName: category ? category.name : ''
    };

    let efficiencyLabel = '';
    if (product.efficiencyType && typeof product.efficiencyValue === 'number') {
      if (product.efficiencyType === 'afue') {
        efficiencyLabel = `${product.efficiencyValue}% AFUE${product.isHighEfficiency ? ' high-efficiency' : ''} furnace`;
      } else if (product.efficiencyType === 'seer') {
        efficiencyLabel = `${product.efficiencyValue} SEER cooling system`;
      } else {
        efficiencyLabel = `${product.efficiencyValue} ${product.efficiencyType.toUpperCase()}`;
      }
    }

    let ratingLabel = 'No reviews yet';
    if (typeof product.ratingAverage === 'number' && typeof product.ratingCount === 'number') {
      ratingLabel = `${product.ratingAverage.toFixed(1)} (${product.ratingCount} reviews)`;
    }

    const applicableOffersRaw = offers.filter((o) => {
      if (!o.isActive) return false;
      if (Array.isArray(o.productCategoryKeys) && product.categoryKey) {
        return o.productCategoryKeys.includes(product.categoryKey);
      }
      return false;
    });

    const applicableOffers = applicableOffersRaw.map((o) => ({
      offerId: o.id,
      title: o.title,
      shortDescription: o.shortDescription || '',
      discountLabel: this._getOfferDiscountLabel(o),
      promotionalPrice: typeof o.promotionalPrice === 'number' ? o.promotionalPrice : null,
      discountPercent: typeof o.discountPercent === 'number' ? o.discountPercent : null,
      // foreign key resolution for offerId
      offer: o
    }));

    // Map category to installation service where applicable
    let installationServiceId = null;
    let installationServiceName = null;
    if (product.categoryKey === 'thermostats') {
      installationServiceId = 'thermostat_installation';
      const service = this._getServiceById('thermostat_installation');
      installationServiceName = service ? service.name : 'Thermostat Installation';
    }

    return {
      product: productWithCategory,
      efficiencyLabel,
      ratingLabel,
      applicableOffers,
      installationServiceId,
      installationServiceName
    };
  }

  // 6. createInstallationQuoteRequest
  createInstallationQuoteRequest(
    productId,
    contactName,
    streetAddress,
    city,
    state,
    zip,
    phone,
    email,
    notes
  ) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return {
        success: false,
        quoteRequestId: null,
        status: 'error',
        message: 'Product not found.',
        estimatedResponseTimeHours: null
      };
    }

    const quoteRequests = this._getFromStorage('installation_quote_requests');
    const id = this._generateId('installquote');

    const record = {
      id,
      productId,
      productNameSnapshot: product.name,
      productCategoryKeySnapshot: product.categoryKey || null,
      contactName,
      streetAddress,
      city,
      state: state || null,
      zip,
      phone,
      email,
      notes: notes || '',
      status: 'submitted',
      createdAt: this._nowIso()
    };

    quoteRequests.push(record);
    this._saveToStorage('installation_quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequestId: id,
      status: 'submitted',
      message: 'Installation quote request submitted.',
      estimatedResponseTimeHours: 24
    };
  }

  // 7. getBookableServicesAndOptions
  getBookableServicesAndOptions() {
    const services = this._getFromStorage('services');
    const active = services.filter(
      (s) => s.isActive && (s.hasStandardBooking || s.isEmergencyAvailable || s.hasConsultationOption)
    );

    const serviceEntries = active.map((s) => {
      const allowedBookingTypes = [];
      if (s.hasStandardBooking) allowedBookingTypes.push('service');
      if (s.isEmergencyAvailable) allowedBookingTypes.push('emergency');
      if (s.category === 'installation' || (s.id && s.id.endsWith('_installation'))) {
        allowedBookingTypes.push('installation');
      }
      if (s.hasConsultationOption) allowedBookingTypes.push('consultation');

      return {
        serviceId: s.id,
        serviceName: s.name,
        category: s.category,
        shortDescription: s.shortDescription || '',
        basePrice: typeof s.basePrice === 'number' ? s.basePrice : null,
        durationMinutes: typeof s.durationMinutes === 'number' ? s.durationMinutes : null,
        isEmergencyAvailable: !!s.isEmergencyAvailable,
        hasStandardBooking: !!s.hasStandardBooking,
        hasConsultationOption: !!s.hasConsultationOption,
        allowedBookingTypes,
        // foreign key resolution for serviceId
        service: s
      };
    });

    let defaultServiceId = null;
    const acRepair = serviceEntries.find((s) => s.serviceId === 'air_conditioning_repair');
    if (acRepair) defaultServiceId = acRepair.serviceId;
    else if (serviceEntries.length) defaultServiceId = serviceEntries[0].serviceId;

    return {
      services: serviceEntries,
      defaultServiceId
    };
  }

  // 8. validateServiceAreaByZip
  validateServiceAreaByZip(zip) {
    const areas = this._getFromStorage('service_areas');
    const trimmedZip = String(zip || '').trim();

    const area = areas.find(
      (a) =>
        a.isActive &&
        Array.isArray(a.zipCodes) &&
        a.zipCodes.map(String).includes(trimmedZip)
    );

    if (!area) {
      return {
        isServiceable: false,
        serviceAreaName: '',
        city: '',
        state: '',
        message: 'We do not currently service that ZIP code.'
      };
    }

    return {
      isServiceable: true,
      serviceAreaName: area.name || '',
      city: area.city || '',
      state: area.state || '',
      message: ''
    };
  }

  // 9. getAvailableTimeSlots
  getAvailableTimeSlots(
    serviceId,
    date,
    bookingType,
    serviceLevel,
    zip,
    durationMinutes,
    productId,
    offerId
  ) {
    const service = this._getServiceById(serviceId);
    if (!service || !service.isActive) {
      return {
        timeSlots: [],
        timezone: 'America/New_York',
        notes: 'Service not available.'
      };
    }

    const areaCheck = this.validateServiceAreaByZip(zip);
    if (!areaCheck.isServiceable) {
      return {
        timeSlots: [],
        timezone: 'America/New_York',
        notes: areaCheck.message
      };
    }

    const day = String(date || '').substring(0, 10); // YYYY-MM-DD

    let windows;
    if (bookingType === 'consultation') {
      windows = [
        ['09:00', '12:00'],
        ['12:00', '15:00'],
        ['15:00', '18:00']
      ];
    } else if (serviceLevel === 'emergency' || serviceLevel === 'after_hours' || bookingType === 'emergency') {
      windows = [
        ['18:00', '20:00'],
        ['20:00', '22:00'],
        ['22:00', '23:59']
      ];
    } else {
      // standard
      if (bookingType === 'installation') {
        // Installation-specific windows centered around mid-morning and afternoon
        windows = [
          ['10:00', '12:00'],
          ['12:00', '14:00'],
          ['14:00', '16:00'],
          ['16:00', '18:00']
        ];
      } else {
        windows = [
          ['09:00', '11:00'],
          ['11:00', '13:00'],
          ['13:00', '15:00'],
          ['15:00', '17:00']
        ];
      }
    }

    const bookings = this._getFromStorage('bookings');
    const existing = bookings.filter((b) => {
      if (b.serviceId !== serviceId) return false;
      if (b.zip !== zip) return false;
      return b.appointmentStart && String(b.appointmentStart).substring(0, 10) === day;
    });

    const timeSlots = windows.map(([startTime, endTime], index) => {
      const start = new Date(day + 'T' + startTime + ':00');
      const end = new Date(day + 'T' + endTime + ':00');

      const hasOverlap = existing.some((b) => {
        const bStart = new Date(b.appointmentStart);
        const bEnd = new Date(b.appointmentEnd);
        return bStart < end && bEnd > start;
      });

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: this._formatTimeRange(start, end),
        isAvailable: !hasOverlap,
        isPreferred: index === 0 || index === 1
      };
    });

    return {
      timeSlots,
      timezone: 'America/New_York',
      notes: 'Time windows indicate estimated arrival times; actual arrival may vary.'
    };
  }

  // 10. createBooking
  createBooking(
    bookingType,
    serviceLevel,
    serviceId,
    productId,
    offerId,
    appointmentStart,
    appointmentEnd,
    timeWindowLabel,
    preferredTimeOfDay,
    zip,
    city,
    state,
    streetAddress,
    contactName,
    contactPhone,
    contactEmail,
    problemDescription,
    message
  ) {
    const validation = this._validateBookingRequest({
      serviceId,
      bookingType,
      serviceLevel,
      appointmentStart,
      appointmentEnd,
      zip,
      productId,
      offerId
    });

    if (!validation.valid) {
      return {
        success: false,
        bookingId: null,
        status: 'error',
        confirmationNumber: null,
        message: validation.message,
        promotionApplied: false,
        summary: null
      };
    }

    const service = this._getServiceById(serviceId);
    const offer = offerId ? this._getOfferById(offerId) : null;

    const id = this._generateId('booking');
    const startIso = new Date(appointmentStart).toISOString();
    const endIso = new Date(appointmentEnd).toISOString();
    const label =
      timeWindowLabel || this._formatTimeRange(new Date(appointmentStart), new Date(appointmentEnd));

    const booking = {
      id,
      bookingType,
      serviceLevel,
      serviceId,
      productId: productId || null,
      offerId: offerId || null,
      appointmentStart: startIso,
      appointmentEnd: endIso,
      timeWindowLabel: label,
      preferredTimeOfDay: preferredTimeOfDay || null,
      zip,
      city: city || null,
      state: state || null,
      streetAddress: streetAddress || null,
      contactName,
      contactPhone,
      contactEmail,
      problemDescription: problemDescription || '',
      message: message || '',
      promotionApplied: !!offerId,
      status: 'pending',
      createdAt: this._nowIso()
    };

    this._reserveTimeSlot(booking);

    const confirmationNumber = 'BKG-' + id;

    return {
      success: true,
      bookingId: id,
      status: booking.status,
      confirmationNumber,
      message: 'Booking request submitted.',
      promotionApplied: booking.promotionApplied,
      summary: {
        serviceName: service ? service.name : '',
        bookingType,
        serviceLevel,
        appointmentStart: startIso,
        appointmentEnd: endIso,
        timeWindowLabel: label,
        offerTitle: offer ? offer.title : '',
        discountLabel: offer ? this._getOfferDiscountLabel(offer) : ''
      }
    };
  }

  // 11. getBookingDetails
  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const services = this._getFromStorage('services');
    const products = this._getFromStorage('products');
    const offers = this._getFromStorage('special_offers');

    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return {
        booking: null,
        serviceName: '',
        productName: '',
        offerTitle: ''
      };
    }

    const service = services.find((s) => s.id === booking.serviceId) || null;
    const product = booking.productId
      ? products.find((p) => p.id === booking.productId) || null
      : null;
    const offer = booking.offerId
      ? offers.find((o) => o.id === booking.offerId) || null
      : null;

    const bookingWithRefs = {
      ...booking,
      service,
      product,
      offer
    };

    return {
      booking: bookingWithRefs,
      serviceName: service ? service.name : '',
      productName: product ? product.name : '',
      offerTitle: offer ? offer.title : ''
    };
  }

  // 12. getMaintenancePlanFilterOptions
  getMaintenancePlanFilterOptions() {
    const plans = this._getFromStorage('maintenance_plans');

    const coverageTypesSet = new Set(plans.map((p) => p.coverageType));
    const coverageTypes = Array.from(coverageTypesSet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }));

    const billingTermsSet = new Set(plans.map((p) => p.billingTerm));
    const billingTerms = Array.from(billingTermsSet).map((value) => ({
      value,
      label:
        value === 'annual'
          ? 'Annual'
          : value === 'monthly'
          ? 'Monthly'
          : value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const prices = plans.map((p) => p.pricePerYear).filter((v) => typeof v === 'number');
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const mid = minPrice + (maxPrice - minPrice) / 2 || 0;

    const priceRanges = prices.length
      ? [
          {
            id: 'low',
            minPricePerYear: 0,
            maxPricePerYear: mid,
            label: 'Up to $' + Math.round(mid)
          },
          {
            id: 'high',
            minPricePerYear: mid,
            maxPricePerYear: maxPrice,
            label: '$' + Math.round(mid) + '+ per year'
          }
        ]
      : [];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' }
    ];

    return {
      coverageTypes,
      billingTerms,
      priceRanges,
      sortOptions
    };
  }

  // 13. getMaintenancePlans
  getMaintenancePlans(filters, sortBy) {
    const plans = this._getFromStorage('maintenance_plans');
    const f = filters || {};

    let results = plans.slice();

    if (Array.isArray(f.coverageTypes) && f.coverageTypes.length) {
      results = results.filter((p) => f.coverageTypes.includes(p.coverageType));
    }
    if (f.billingTerm) {
      results = results.filter((p) => p.billingTerm === f.billingTerm);
    }
    if (typeof f.maxPricePerYear === 'number') {
      results = results.filter((p) => p.pricePerYear <= f.maxPricePerYear);
    }
    if (typeof f.includesHeating === 'boolean') {
      results = results.filter((p) => !!p.includesHeating === f.includesHeating);
    }
    if (typeof f.includesCooling === 'boolean') {
      results = results.filter((p) => !!p.includesCooling === f.includesCooling);
    }

    const onlyActive = typeof f.onlyActive === 'boolean' ? f.onlyActive : true;
    if (onlyActive) {
      results = results.filter((p) => p.isActive);
    }

    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => (a.pricePerYear || 0) - (b.pricePerYear || 0));
    } else if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => (b.pricePerYear || 0) - (a.pricePerYear || 0));
    }

    return {
      plans: results,
      total: results.length
    };
  }

  // 14. getMaintenancePlanDetails
  getMaintenancePlanDetails(planId) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        plan: null,
        isEligibleForOnlinePurchase: false,
        coverageLabel: '',
        billingTermLabel: '',
        includedChecks: [],
        disclaimers: '',
        relatedPlans: []
      };
    }

    const coverageLabel = plan.coverageType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const billingTermLabel =
      plan.billingTerm === 'annual'
        ? 'Annual'
        : plan.billingTerm === 'monthly'
        ? 'Monthly'
        : plan.billingTerm;

    const includedChecks = [];
    if (plan.includesHeating) includedChecks.push('Heating system safety & performance check');
    if (plan.includesCooling) includedChecks.push('Cooling system safety & performance check');

    const disclaimers =
      plan.terms ||
      'Maintenance plans cover routine tune-ups only. Repairs and parts are billed separately unless otherwise noted.';

    const relatedPlans = plans.filter(
      (p) => p.id !== plan.id && p.coverageType === plan.coverageType && p.isActive
    );

    return {
      plan,
      isEligibleForOnlinePurchase: !!plan.isActive,
      coverageLabel,
      billingTermLabel,
      includedChecks,
      disclaimers,
      relatedPlans
    };
  }

  // 15. addMaintenancePlanToCart
  addMaintenancePlanToCart(planId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === planId);

    if (!plan || !plan.isActive) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Maintenance plan not available.',
        cartSummary: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      (ci) =>
        ci.cartId === cart.id &&
        ci.itemType === 'maintenance_plan' &&
        ci.maintenancePlanId === planId
    );

    if (cartItem) {
      cartItem.quantity += qty;
    } else {
      const id = this._generateId('cartitem');
      cartItem = {
        id,
        cartId: cart.id,
        itemType: 'maintenance_plan',
        maintenancePlanId: planId,
        productId: null,
        serviceId: null,
        nameSnapshot: plan.name,
        priceSnapshot: plan.pricePerYear,
        quantity: qty
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._updateCartSummary(cart.id);

    const totals = this._calculateCartTotals(cart.id);
    const resolvedItems = this._getCartItemsWithResolved(cart.id);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Maintenance plan added to cart.',
      cartSummary: {
        items: resolvedItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total
      }
    };
  }

  // 16. getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart.id);
    const cartItems = totals.items;

    const items = cartItems.map((item) => ({
      cartItemId: item.id,
      itemType: item.itemType,
      name: item.nameSnapshot,
      description: '',
      quantity: item.quantity,
      unitPrice: item.priceSnapshot,
      lineTotal: item.priceSnapshot * item.quantity
    }));

    return {
      cartId: cart.id,
      status: cart.status,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: 'USD'
    };
  }

  // 17. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cartSummary: null
      };
    }

    const cartId = cartItems[index].cartId;

    if (!quantity || quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index] = {
        ...cartItems[index],
        quantity
      };
    }

    this._saveToStorage('cart_items', cartItems);
    this._updateCartSummary(cartId);

    const totals = this._calculateCartTotals(cartId);
    const resolvedItems = this._getCartItemsWithResolved(cartId);

    return {
      success: true,
      message: 'Cart updated.',
      cartSummary: {
        items: resolvedItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total
      }
    };
  }

  // 18. removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cartSummary: null
      };
    }

    const cartId = cartItems[index].cartId;
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);
    this._updateCartSummary(cartId);

    const totals = this._calculateCartTotals(cartId);
    const resolvedItems = this._getCartItemsWithResolved(cartId);

    return {
      success: true,
      message: 'Item removed from cart.',
      cartSummary: {
        items: resolvedItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total
      }
    };
  }

  // 19. getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart.id);
    const itemsRaw = totals.items;

    const items = itemsRaw.map((item) => ({
      cartItemId: item.id,
      name: item.nameSnapshot,
      itemType: item.itemType,
      quantity: item.quantity,
      unitPrice: item.priceSnapshot,
      lineTotal: item.priceSnapshot * item.quantity
    }));

    const cartSummary = {
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: 'USD'
    };

    const billingFields = [
      { name: 'firstName', label: 'First Name', required: true },
      { name: 'lastName', label: 'Last Name', required: true },
      { name: 'email', label: 'Email', required: true },
      { name: 'phone', label: 'Phone', required: true },
      { name: 'streetAddress', label: 'Street Address', required: true },
      { name: 'city', label: 'City', required: true },
      { name: 'state', label: 'State', required: false },
      { name: 'zip', label: 'ZIP', required: true }
    ];

    return {
      cartSummary,
      billingFields
    };
  }

  // 20. placeOrder
  placeOrder(
    firstName,
    lastName,
    email,
    phone,
    streetAddress,
    city,
    state,
    zip,
    paymentMethod,
    cardNumber,
    cardExpiration,
    cardCvv,
    agreeToTerms
  ) {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart.id);

    if (!totals.items.length) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        status: 'failed',
        total: 0,
        currency: 'USD',
        message: 'Cart is empty.'
      };
    }

    if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && !cardNumber) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        status: 'failed',
        total: 0,
        currency: 'USD',
        message: 'Payment details are required for card payments.'
      };
    }

    const orders = this._getFromStorage('orders');
    const orderId = this._generateId('order');
    const orderNumber = this._generateOrderNumber();

    const status = paymentMethod === 'cash' || paymentMethod === 'financing' ? 'pending' : 'paid';

    const order = {
      id: orderId,
      orderNumber,
      cartId: cart.id,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: 'USD',
      firstName,
      lastName,
      email,
      phone,
      streetAddress,
      city,
      state: state || null,
      zip,
      paymentMethod,
      cardLast4: cardNumber ? String(cardNumber).slice(-4) : null,
      status,
      createdAt: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Mark cart as checked out
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = {
        ...carts[cartIndex],
        status: 'checked_out',
        updatedAt: this._nowIso()
      };
      this._saveToStorage('cart', carts);
    }

    return {
      success: true,
      orderId,
      orderNumber,
      status,
      total: totals.total,
      currency: 'USD',
      message: 'Order placed successfully.'
    };
  }

  // 21. getSpecialOfferFilterOptions
  getSpecialOfferFilterOptions() {
    const categories = [
      { value: 'indoor_air_quality', label: 'Indoor Air Quality' },
      { value: 'duct_services', label: 'Duct Services' },
      { value: 'heating', label: 'Heating' },
      { value: 'cooling', label: 'Cooling' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'other', label: 'Other' }
    ];

    const discountTypes = [
      { value: 'percentage', label: 'Percentage off' },
      { value: 'fixed_price', label: 'Fixed promotional price' },
      { value: 'amount_off', label: 'Amount off' },
      { value: 'none', label: 'No discount' }
    ];

    return {
      categories,
      discountTypes
    };
  }

  // 22. getSpecialOffers
  getSpecialOffers(filters, sortBy) {
    const offers = this._getFromStorage('special_offers');
    const services = this._getFromStorage('services');
    const productCategories = this._getFromStorage('product_categories');
    const f = filters || {};
    const now = new Date();

    let results = offers.slice();

    if (f.category) {
      results = results.filter((o) => o.category === f.category);
    }
    if (typeof f.minDiscountPercent === 'number') {
      results = results.filter(
        (o) =>
          o.discountType === 'percentage' &&
          typeof o.discountPercent === 'number' &&
          o.discountPercent >= f.minDiscountPercent
      );
    }
    if (typeof f.maxPromotionalPrice === 'number') {
      results = results.filter(
        (o) =>
          typeof o.promotionalPrice === 'number' &&
          o.promotionalPrice <= f.maxPromotionalPrice
      );
    }
    if (f.serviceId) {
      results = results.filter(
        (o) => Array.isArray(o.serviceIds) && o.serviceIds.includes(f.serviceId)
      );
    }

    const onlyActive = typeof f.onlyActive === 'boolean' ? f.onlyActive : true;
    if (onlyActive) {
      results = results.filter((o) => {
        if (!o.isActive) return false;
        if (o.startDate && new Date(o.startDate) > now) return false;
        if (o.endDate && new Date(o.endDate) < now) return false;
        return true;
      });
    }

    if (sortBy === 'ending_soon') {
      results.sort((a, b) => {
        const aDate = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const bDate = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return aDate - bDate;
      });
    } else if (sortBy === 'discount_high_to_low') {
      results.sort((a, b) => {
        const aDisc = typeof a.discountPercent === 'number' ? a.discountPercent : 0;
        const bDisc = typeof b.discountPercent === 'number' ? b.discountPercent : 0;
        return bDisc - aDisc;
      });
    } else if (sortBy === 'newest') {
      results.sort((a, b) => {
        const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bStart - aStart;
      });
    }

    const mapped = results.map((o) => ({
      ...o,
      // resolve related services & product categories for convenience
      services: Array.isArray(o.serviceIds)
        ? o.serviceIds.map((sid) => services.find((s) => s.id === sid) || null)
        : [],
      productCategories: Array.isArray(o.productCategoryKeys)
        ? o.productCategoryKeys.map(
            (ck) =>
              productCategories.find(
                (c) => c.id === ck || c.urlParamValue === ck
              ) || null
          )
        : []
    }));

    return {
      offers: mapped,
      total: mapped.length
    };
  }

  // 23. getSpecialOfferDetails
  getSpecialOfferDetails(offerId) {
    const offers = this._getFromStorage('special_offers');
    const services = this._getFromStorage('services');

    const offer = offers.find((o) => o.id === offerId) || null;
    if (!offer) {
      return {
        offer: null,
        discountLabel: '',
        isCurrentlyActive: false,
        applicableServices: [],
        termsSummary: ''
      };
    }

    const now = new Date();
    const isCurrentlyActive = !!(
      offer.isActive &&
      (!offer.startDate || new Date(offer.startDate) <= now) &&
      (!offer.endDate || new Date(offer.endDate) >= now)
    );

    const applicableServices = Array.isArray(offer.serviceIds)
      ? offer.serviceIds.map((sid) => {
          const service = services.find((s) => s.id === sid) || null;
          return {
            serviceId: sid,
            serviceName: service ? service.name : '',
            category: service ? service.category : '',
            // foreign key resolution for serviceId
            service
          };
        })
      : [];

    const termsSummary = offer.longDescription || offer.shortDescription || '';

    const discountLabel = this._getOfferDiscountLabel(offer);

    const offerWithRelations = {
      ...offer,
      services: applicableServices.map((s) => s.service)
    };

    return {
      offer: offerWithRelations,
      discountLabel,
      isCurrentlyActive,
      applicableServices,
      termsSummary
    };
  }

  // 24. getServiceDetails
  getServiceDetails(serviceId) {
    this._ensureSupplementalServices();
    const services = this._getFromStorage('services');
    const offers = this._getFromStorage('special_offers');
    const articles = this._getFromStorage('blog_articles');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        service: null,
        emergencyOptions: {
          isEmergencyAvailable: false
        },
        consultationOptions: {
          hasConsultationOption: false,
          maxDaysAhead: 0,
          weekdaysOnly: false,
          timeOfDayOptions: []
        },
        relatedOffers: [],
        relatedArticles: []
      };
    }

    const emergencyOptions = {
      isEmergencyAvailable: !!service.isEmergencyAvailable,
      eveningStartTime: '20:00',
      availableTimeWindowLabels: service.isEmergencyAvailable
        ? ['6:00 PM – 8:00 PM', '8:00 PM – 10:00 PM']
        : [],
      disclaimer: service.isEmergencyAvailable
        ? 'Emergency and after-hours calls may incur additional fees.'
        : ''
    };

    const consultationOptions = {
      hasConsultationOption: !!service.hasConsultationOption,
      maxDaysAhead: service.hasConsultationOption ? 7 : 0,
      weekdaysOnly: !!service.hasConsultationOption,
      timeOfDayOptions: service.hasConsultationOption
        ? [
            { value: 'morning', label: 'Morning (9–12)' },
            { value: 'afternoon', label: 'Afternoon (12–4 PM)' },
            { value: 'evening', label: 'Evening (4–7 PM)' }
          ]
        : []
    };

    const relatedOffers = offers.filter(
      (o) => Array.isArray(o.serviceIds) && o.serviceIds.includes(service.id)
    );

    const relatedArticles = articles.filter(
      (a) => Array.isArray(a.recommendedServiceIds) && a.recommendedServiceIds.includes(service.id)
    );

    return {
      service,
      emergencyOptions,
      consultationOptions,
      relatedOffers,
      relatedArticles
    };
  }

  // 25. getFinancingPlans
  getFinancingPlans(filters, sortBy) {
    const plans = this._getFromStorage('financing_plans');
    const f = filters || {};

    let results = plans.filter((p) => p.isActive);

    if (typeof f.isZeroApr === 'boolean') {
      results = results.filter((p) => !!p.isZeroApr === f.isZeroApr);
    }
    if (typeof f.minTermMonths === 'number') {
      results = results.filter((p) => p.termMonths >= f.minTermMonths);
    }
    if (typeof f.maxTermMonths === 'number') {
      results = results.filter((p) => p.termMonths <= f.maxTermMonths);
    }
    if (f.purpose) {
      results = results.filter(
        (p) =>
          Array.isArray(p.eligiblePurchaseTypes) &&
          p.eligiblePurchaseTypes.includes(f.purpose)
      );
    }

    if (sortBy === 'apr_low_to_high') {
      results.sort((a, b) => (a.aprPercent || 0) - (b.aprPercent || 0));
    } else if (sortBy === 'term_short_to_long') {
      results.sort((a, b) => (a.termMonths || 0) - (b.termMonths || 0));
    } else if (sortBy === 'featured_first') {
      results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    return {
      plans: results,
      total: results.length
    };
  }

  // 26. getFinancingPlanDetails
  getFinancingPlanDetails(financingPlanId) {
    const plans = this._getFromStorage('financing_plans');
    const plan = plans.find((p) => p.id === financingPlanId) || null;

    if (!plan) {
      return {
        plan: null,
        termsText: '',
        examplePayments: [],
        eligibilitySummary: ''
      };
    }

    const exampleAmounts = [1000, 3000, 5000];
    const examplePayments = exampleAmounts
      .filter((amount) => typeof plan.termMonths === 'number' && plan.termMonths > 0)
      .map((amount) => {
        let monthlyPayment;
        if (plan.isZeroApr) {
          monthlyPayment = amount / plan.termMonths;
        } else {
          // Simple interest approximation (not precise APR math)
          const rate = plan.aprPercent / 100;
          const totalPaid = amount * (1 + rate * (plan.termMonths / 12));
          monthlyPayment = totalPaid / plan.termMonths;
        }
        const totalPaid = monthlyPayment * plan.termMonths;
        return {
          purchaseAmount: amount,
          monthlyPayment: Number(monthlyPayment.toFixed(2)),
          termMonths: plan.termMonths,
          totalPaid: Number(totalPaid.toFixed(2))
        };
      });

    const termsText =
      plan.description ||
      'Subject to credit approval. Terms and conditions apply. See financing details for full information.';

    let eligibilitySummary = 'Available financing plan.';
    if (typeof plan.minPurchaseAmount === 'number' || typeof plan.maxPurchaseAmount === 'number') {
      const min = typeof plan.minPurchaseAmount === 'number' ? plan.minPurchaseAmount : null;
      const max = typeof plan.maxPurchaseAmount === 'number' ? plan.maxPurchaseAmount : null;
      eligibilitySummary = 'Available for purchases';
      if (min != null) eligibilitySummary += ' from $' + min;
      if (max != null) eligibilitySummary += (min != null ? ' to ' : ' up to ') + '$' + max;
      eligibilitySummary += '.';
    }

    return {
      plan,
      termsText,
      examplePayments,
      eligibilitySummary
    };
  }

  // 27. createFinancingApplication
  createFinancingApplication(
    financingPlanId,
    purchaseAmount,
    purchasePurpose,
    applicantName,
    streetAddress,
    city,
    state,
    zip,
    phone,
    email,
    ssnLast4,
    preferredContactMethod
  ) {
    const plans = this._getFromStorage('financing_plans');
    const plan = plans.find((p) => p.id === financingPlanId);

    if (!plan || !plan.isActive) {
      return {
        success: false,
        financingApplicationId: null,
        status: 'error',
        message: 'Financing plan not available.',
        nextSteps: ''
      };
    }

    if (typeof plan.minPurchaseAmount === 'number' && purchaseAmount < plan.minPurchaseAmount) {
      return {
        success: false,
        financingApplicationId: null,
        status: 'error',
        message: 'Purchase amount is below the minimum for this plan.',
        nextSteps: ''
      };
    }
    if (typeof plan.maxPurchaseAmount === 'number' && purchaseAmount > plan.maxPurchaseAmount) {
      return {
        success: false,
        financingApplicationId: null,
        status: 'error',
        message: 'Purchase amount exceeds the maximum for this plan.',
        nextSteps: ''
      };
    }

    const applications = this._getFromStorage('financing_applications');
    const id = this._generateId('finapp');

    const record = {
      id,
      financingPlanId,
      financingPlanNameSnapshot: plan.name,
      purchaseAmount,
      purchasePurpose,
      applicantName,
      streetAddress,
      city,
      state: state || null,
      zip,
      phone,
      email,
      ssnLast4: ssnLast4 || null,
      preferredContactMethod,
      status: 'submitted',
      createdAt: this._nowIso()
    };

    applications.push(record);
    this._saveToStorage('financing_applications', applications);

    return {
      success: true,
      financingApplicationId: id,
      status: 'submitted',
      message: 'Financing application submitted.',
      nextSteps:
        'We will review your application and contact you via ' +
        preferredContactMethod +
        ' within 1–2 business days.'
    };
  }

  // 28. getBlogArticles
  getBlogArticles(query, tag, sortBy, page, pageSize) {
    const articles = this._getFromStorage('blog_articles');
    const q = query ? String(query).toLowerCase() : '';

    let results = articles.slice();

    if (q) {
      results = results.filter((a) => {
        const haystack = [a.title, a.excerpt, a.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (tag) {
      results = results.filter(
        (a) => Array.isArray(a.tags) && a.tags.includes(tag)
      );
    }

    if (sortBy === 'newest') {
      results.sort((a, b) => {
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      });
    } else if (sortBy === 'featured') {
      results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    const total = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 10;
    const startIndex = (pg - 1) * ps;
    const pageItems = results.slice(startIndex, startIndex + ps);

    return {
      articles: pageItems,
      total
    };
  }

  // 29. getArticleDetails
  getArticleDetails(articleId) {
    this._ensureSupplementalServices();
    const articles = this._getFromStorage('blog_articles');
    const services = this._getFromStorage('services');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        recommendedServices: [],
        relatedArticles: []
      };
    }

    const recommendedServices = Array.isArray(article.recommendedServiceIds)
      ? article.recommendedServiceIds
          .map((sid) => services.find((s) => s.id === sid) || null)
          .filter(Boolean)
      : [];

    const relatedArticles = articles.filter((a) => {
      if (a.id === article.id) return false;
      if (!Array.isArray(a.tags) || !Array.isArray(article.tags)) return false;
      return a.tags.some((t) => article.tags.includes(t));
    });

    return {
      article,
      recommendedServices,
      relatedArticles
    };
  }

  // 30. submitContactMessage
  submitContactMessage(name, email, phone, subject, message, preferredContactMethod) {
    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('contact');

    const record = {
      id,
      name,
      email,
      phone: phone || null,
      subject: subject || '',
      message,
      preferredContactMethod: preferredContactMethod || null,
      createdAt: this._nowIso()
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      messageId: id,
      message: 'Your message has been received.',
      estimatedResponseTimeHours: 24
    };
  }

  // 31. getServiceAreasSummary
  getServiceAreasSummary() {
    const areas = this._getFromStorage('service_areas');

    const activeAreas = areas.filter((a) => a.isActive);
    const totalZipCodes = activeAreas.reduce(
      (sum, area) => sum + (Array.isArray(area.zipCodes) ? area.zipCodes.length : 0),
      0
    );

    return {
      areas: activeAreas,
      totalZipCodes
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
