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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const initArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };

    // Entity tables
    initArray('technicians');
    initArray('technician_service_offerings');
    initArray('service_packages');
    initArray('service_bookings');
    initArray('booking_checkout_sessions');
    initArray('callback_requests');
    initArray('product_categories');
    initArray('products');
    initArray('quote_requests');
    initArray('quote_request_items');
    initArray('membership_plans');
    initArray('membership_enrollments');
    initArray('promotions');
    initArray('service_definitions');
    initArray('contact_messages');

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Session-scoped helpers
    if (!localStorage.getItem('session_active_promotion')) {
      localStorage.setItem('session_active_promotion', 'null');
    }
    if (!localStorage.getItem('current_quote_request_id')) {
      localStorage.setItem('current_quote_request_id', 'null');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseIso(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateShort(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? this._parseIso(date) : date;
    if (!d) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    try {
      return d.toLocaleDateString('en-US', options);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  _formatTimeShort(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? this._parseIso(date) : date;
    if (!d) return '';
    const options = { hour: 'numeric', minute: '2-digit' };
    try {
      return d.toLocaleTimeString('en-US', options);
    } catch (e) {
      return d.toISOString().slice(11, 16);
    }
  }

  _urgencyLabelFromValue(value) {
    const map = {
      within_30_minutes: 'Within 30 minutes',
      within_1_hour: 'Within 1 hour',
      within_2_hours: 'Within 2 hours',
      same_day: 'Same day',
      flexible: 'Flexible'
    };
    return map[value] || '';
  }

  _etaLabelFromMinutes(minEta) {
    if (typeof minEta !== 'number' || isNaN(minEta) || minEta <= 0) return '';
    const low = Math.max(5, Math.round(minEta));
    const high = low + 10;
    return low + '-' + high + ' minutes';
  }

  _moneyLabel(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    return '$' + amount.toFixed(2).replace(/\.00$/, '');
  }

  _findById(list, id) {
    return list.find((x) => x.id === id) || null;
  }

  // -------------------------
  // Helper functions from spec
  // -------------------------

  // Quote helpers
  _getOrCreateDraftQuoteRequest() {
    let currentIdRaw = localStorage.getItem('current_quote_request_id');
    let currentId = null;
    try {
      currentId = currentIdRaw && currentIdRaw !== 'null' ? currentIdRaw : null;
    } catch (e) {
      currentId = null;
    }

    const quoteRequests = this._getFromStorage('quote_requests');
    let quoteRequest = currentId ? quoteRequests.find((q) => q.id === currentId) : null;

    if (!quoteRequest || quoteRequest.status !== 'draft') {
      const newId = this._generateId('qr');
      quoteRequest = {
        id: newId,
        createdAt: this._nowIso(),
        updatedAt: null,
        status: 'draft',
        totalItems: 0,
        totalLocks: 0,
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        streetAddress: '',
        city: '',
        zipCode: '',
        notes: ''
      };
      quoteRequests.push(quoteRequest);
      this._saveToStorage('quote_requests', quoteRequests);
      localStorage.setItem('current_quote_request_id', quoteRequest.id);
    }

    return quoteRequest;
  }

  _calculateQuoteTotals(quoteRequestId) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const items = this._getFromStorage('quote_request_items').filter(
      (item) => item.quoteRequestId === quoteRequestId
    );
    const products = this._getFromStorage('products');

    let totalItems = items.length;
    let totalLocks = 0;

    items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product && (product.isSmart || product.isStandardDeadbolt)) {
        totalLocks += item.quantity || 0;
      }
    });

    const qrIndex = quoteRequests.findIndex((q) => q.id === quoteRequestId);
    if (qrIndex !== -1) {
      quoteRequests[qrIndex].totalItems = totalItems;
      quoteRequests[qrIndex].totalLocks = totalLocks;
      quoteRequests[qrIndex].updatedAt = this._nowIso();
      this._saveToStorage('quote_requests', quoteRequests);
    }

    return { totalItems, totalLocks };
  }

  // Booking helpers
  _getOrCreateBooking(defaults) {
    const bookings = this._getFromStorage('service_bookings');
    const booking = {
      id: this._generateId('booking'),
      createdAt: this._nowIso(),
      updatedAt: null,
      bookingCategory: defaults && defaults.bookingCategory ? defaults.bookingCategory : 'emergency',
      serviceType: defaults && defaults.serviceType ? defaults.serviceType : 'other',
      technicianId: defaults && defaults.technicianId ? defaults.technicianId : null,
      sourcePage: defaults && defaults.sourcePage ? defaults.sourcePage : 'other',
      packageId: defaults && defaults.packageId ? defaults.packageId : null,
      urgencyOption: defaults && defaults.urgencyOption ? defaults.urgencyOption : null,
      scheduledStart: defaults && defaults.scheduledStart ? defaults.scheduledStart : null,
      scheduledEnd: defaults && defaults.scheduledEnd ? defaults.scheduledEnd : null,
      streetAddress: defaults && defaults.streetAddress ? defaults.streetAddress : '',
      city: defaults && defaults.city ? defaults.city : '',
      zipCode: defaults && defaults.zipCode ? defaults.zipCode : '',
      addressNotes: defaults && defaults.addressNotes ? defaults.addressNotes : '',
      vehicleMakeModel: defaults && defaults.vehicleMakeModel ? defaults.vehicleMakeModel : null,
      numberOfLocks: defaults && defaults.numberOfLocks ? defaults.numberOfLocks : null,
      notes: defaults && defaults.notes ? defaults.notes : '',
      contactName: defaults && defaults.contactName ? defaults.contactName : '',
      contactPhone: defaults && defaults.contactPhone ? defaults.contactPhone : '',
      contactEmail: defaults && defaults.contactEmail ? defaults.contactEmail : '',
      basePrice: null,
      estimatedTotalPrice: null,
      currencyCode: 'usd',
      promotionCode: null,
      promotionId: null,
      discountAmount: null,
      finalPrice: null,
      status: 'draft',
      isMembershipCovered: false
    };
    bookings.push(booking);
    this._saveToStorage('service_bookings', bookings);
    return booking;
  }

  _getActivePromotionForSession() {
    const raw = localStorage.getItem('session_active_promotion');
    if (!raw || raw === 'null') return null;
    let sessionPromo = null;
    try {
      sessionPromo = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!sessionPromo || !sessionPromo.promotionId) return null;

    const promotions = this._getFromStorage('promotions');
    const promo = promotions.find((p) => p.id === sessionPromo.promotionId);
    if (!promo) return null;

    // Ensure still active and not expired
    if (promo.status !== 'active') return null;
    const now = new Date();
    if (promo.startDate) {
      const start = this._parseIso(promo.startDate);
      if (start && now < start) return null;
    }
    if (promo.endDate) {
      const end = this._parseIso(promo.endDate);
      if (end && now > end) return null;
    }
    return promo;
  }

  _resolveApplicablePromotion(basePrice, bookingCategory, serviceType, explicitCode, applyActivePromotions) {
    const promotions = this._getFromStorage('promotions');
    const now = new Date();
    const candidates = [];

    const matchesCommonConditions = (promo) => {
      if (promo.status !== 'active') return false;
      if (promo.startDate) {
        const sd = this._parseIso(promo.startDate);
        if (sd && now < sd) return false;
      }
      if (promo.endDate) {
        const ed = this._parseIso(promo.endDate);
        if (ed && now > ed) return false;
      }
      if (promo.minOrderAmount && typeof basePrice === 'number') {
        if (basePrice < promo.minOrderAmount) return false;
      }
      if (promo.applicableBookingCategory && promo.applicableBookingCategory !== 'any') {
        if (bookingCategory && promo.applicableBookingCategory !== bookingCategory) return false;
      }
      if (promo.applicableServiceTypes && promo.applicableServiceTypes.length > 0) {
        if (!serviceType || !promo.applicableServiceTypes.includes(serviceType)) return false;
      }
      return true;
    };

    if (explicitCode) {
      const codeLower = String(explicitCode).toLowerCase();
      promotions.forEach((promo) => {
        if (!promo.code) return;
        if (String(promo.code).toLowerCase() === codeLower && matchesCommonConditions(promo)) {
          candidates.push(promo);
        }
      });
    }

    if (applyActivePromotions) {
      const sessionPromo = this._getActivePromotionForSession();
      if (sessionPromo && matchesCommonConditions(sessionPromo)) {
        if (!candidates.find((p) => p.id === sessionPromo.id)) {
          candidates.push(sessionPromo);
        }
      }
    }

    if (!candidates.length || typeof basePrice !== 'number') {
      return null;
    }

    // Choose promo with max discount
    let best = null;
    let bestDiscount = 0;
    candidates.forEach((promo) => {
      let discount = 0;
      if (promo.discountType === 'percent') {
        discount = (basePrice * promo.discountValue) / 100;
      } else if (promo.discountType === 'fixed_amount') {
        discount = promo.discountValue;
      }
      if (discount > bestDiscount) {
        bestDiscount = discount;
        best = promo;
      }
    });

    if (!best) return null;

    if (bestDiscount > basePrice) bestDiscount = basePrice;

    return {
      promotion: best,
      discountAmount: bestDiscount
    };
  }

  _calculateBookingPricing(bookingDraft, options) {
    const opts = options || {};
    const promotionsEnabled = typeof opts.applyActivePromotions === 'boolean' ? opts.applyActivePromotions : true;
    const explicitCode = opts.promotionCode || null;

    const technicians = this._getFromStorage('technicians');
    const offerings = this._getFromStorage('technician_service_offerings');
    const packages = this._getFromStorage('service_packages');
    const serviceDefs = this._getFromStorage('service_definitions');

    let basePrice = null;

    // Priority 1: ServicePackage
    if (bookingDraft.packageId) {
      const pkg = packages.find((p) => p.id === bookingDraft.packageId && p.isActive);
      if (pkg) {
        basePrice = pkg.price;
      }
    }

    // Priority 2: TechnicianServiceOffering
    if (basePrice === null && bookingDraft.technicianId) {
      const techOffering = offerings.find((o) => {
        if (!o.active) return false;
        if (o.technicianId !== bookingDraft.technicianId) return false;
        if (o.serviceType !== bookingDraft.serviceType) return false;
        const isEmerg = bookingDraft.bookingCategory === 'emergency';
        return !!o.isEmergency === isEmerg;
      });
      if (techOffering) {
        basePrice = techOffering.basePrice;
      }
    }

    // Priority 3: Technician base fields
    if (basePrice === null && bookingDraft.technicianId) {
      const tech = technicians.find((t) => t.id === bookingDraft.technicianId);
      if (tech) {
        if (bookingDraft.serviceType === 'emergency_lockout' && typeof tech.emergencyLockoutBasePrice === 'number') {
          basePrice = tech.emergencyLockoutBasePrice;
        } else if (bookingDraft.serviceType === 'car_lockout' && typeof tech.carLockoutBasePrice === 'number') {
          basePrice = tech.carLockoutBasePrice;
        } else if (!bookingDraft.bookingCategory || bookingDraft.bookingCategory === 'non_emergency') {
          if (typeof tech.nonEmergencyVisitBasePrice === 'number') {
            basePrice = tech.nonEmergencyVisitBasePrice;
          }
        }
      }
    }

    // Priority 4: ServiceDefinition startingPrice
    if (basePrice === null && bookingDraft.serviceType) {
      const def = serviceDefs.find(
        (d) => d.serviceType === bookingDraft.serviceType && d.active
      );
      if (def && typeof def.startingPrice === 'number') {
        basePrice = def.startingPrice;
      }
    }

    bookingDraft.basePrice = basePrice;
    bookingDraft.estimatedTotalPrice = basePrice;
    bookingDraft.currencyCode = 'usd';

    // Apply promotions
    let discountAmount = null;
    let finalPrice = basePrice;
    let promotionCode = null;
    let promotionId = null;

    if (typeof basePrice === 'number') {
      const resolved = this._resolveApplicablePromotion(
        basePrice,
        bookingDraft.bookingCategory,
        bookingDraft.serviceType,
        explicitCode,
        promotionsEnabled
      );
      if (resolved && resolved.promotion) {
        discountAmount = resolved.discountAmount;
        finalPrice = basePrice - discountAmount;
        const promo = resolved.promotion;
        promotionCode = promo.code || null;
        promotionId = promo.id || null;
      }
    }

    bookingDraft.discountAmount = typeof discountAmount === 'number' ? discountAmount : null;
    bookingDraft.finalPrice = typeof finalPrice === 'number' ? finalPrice : null;
    bookingDraft.promotionCode = promotionCode;
    bookingDraft.promotionId = promotionId;

    return bookingDraft;
  }

  _persistMembershipEnrollment(planId, billingPeriod, contactName, contactPhone, contactEmail, billingZipCode) {
    const enrollments = this._getFromStorage('membership_enrollments');
    const enrollment = {
      id: this._generateId('memb_enroll'),
      planId: planId,
      createdAt: this._nowIso(),
      updatedAt: null,
      status: 'pending_payment',
      billingPeriod: billingPeriod,
      contactName: contactName,
      contactPhone: contactPhone,
      contactEmail: contactEmail,
      billingZipCode: billingZipCode
    };
    enrollments.push(enrollment);
    this._saveToStorage('membership_enrollments', enrollments);
    return enrollment;
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // 1. getServiceDefinitionsOverview
  getServiceDefinitionsOverview() {
    const defs = this._getFromStorage('service_definitions').filter((d) => d.active);
    return defs.map((d) => ({
      serviceType: d.serviceType,
      name: d.name,
      description: d.description || '',
      startingPrice: typeof d.startingPrice === 'number' ? d.startingPrice : null,
      isEmergency: !!d.isEmergency,
      isResidential: !!d.isResidential,
      isAutomotive: !!d.isAutomotive,
      isCommercial: !!d.isCommercial
    }));
  }

  // 2. getEmergencyServiceFilterOptions
  getEmergencyServiceFilterOptions() {
    const urgencyOptions = [
      { value: 'within_30_minutes', label: 'Within 30 minutes' },
      { value: 'within_1_hour', label: 'Within 1 hour' },
      { value: 'within_2_hours', label: 'Within 2 hours' },
      { value: 'same_day', label: 'Same day' },
      { value: 'flexible', label: 'Flexible' }
    ];
    const sortOptions = [
      { value: 'fastest_arrival', label: 'Fastest arrival' },
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' }
    ];
    return {
      urgencyOptions: urgencyOptions,
      defaultUrgencyValue: 'within_30_minutes',
      maxPricePlaceholder: 150,
      sortOptions: sortOptions,
      defaultSortValue: 'fastest_arrival'
    };
  }

  // 3. searchEmergencyTechnicians
  searchEmergencyTechnicians(zipCode, serviceType, filters, sortBy) {
    const svcType = serviceType || 'emergency_lockout';
    const f = filters || {};
    const sort = sortBy || 'fastest_arrival';

    const technicians = this._getFromStorage('technicians');
    const offerings = this._getFromStorage('technician_service_offerings');

    const urgencyToMaxEta = (urg) => {
      switch (urg) {
        case 'within_30_minutes':
          return 30;
        case 'within_1_hour':
          return 60;
        case 'within_2_hours':
          return 120;
        case 'same_day':
          return 8 * 60; // 8 hours
        case 'flexible':
        default:
          return null;
      }
    };

    const maxEta = f.urgencyOption ? urgencyToMaxEta(f.urgencyOption) : null;

    let results = [];

    offerings.forEach((off) => {
      if (!off.active) return;
      if (!off.isEmergency) return;
      if (off.serviceType !== svcType) return;

      const tech = technicians.find((t) => t.id === off.technicianId);
      if (!tech) return;
      if (tech.profileStatus !== 'active') return;
      if (!Array.isArray(tech.serviceZipCodes) || !tech.serviceZipCodes.includes(zipCode)) return;

      if (f.only247 && !tech.available247) return;
      if (typeof f.maxPrice === 'number' && off.basePrice > f.maxPrice) return;
      if (typeof f.minRating === 'number' && tech.rating < f.minRating) return;

      if (maxEta !== null && typeof off.minEtaMinutes === 'number') {
        if (off.minEtaMinutes > maxEta) return;
      }

      const basePrice = off.basePrice;
      const minEta = typeof off.minEtaMinutes === 'number'
        ? off.minEtaMinutes
        : typeof tech.emergencyEtaMinutes === 'number'
          ? tech.emergencyEtaMinutes
          : null;

      const result = {
        technicianId: tech.id,
        technicianName: tech.name,
        rating: tech.rating,
        reviewCount: tech.reviewCount,
        available247: !!tech.available247,
        languagesSpoken: Array.isArray(tech.languagesSpoken) ? tech.languagesSpoken.slice() : [],
        serviceZipMatch: 'Serves ' + zipCode,
        serviceType: off.serviceType,
        basePrice: basePrice,
        priceLabel: this._moneyLabel(basePrice) + ' call-out',
        minEtaMinutes: minEta,
        etaLabel: this._etaLabelFromMinutes(minEta)
      };

      // Foreign-key resolution
      result.technician = tech;

      results.push(result);
    });

    if (sort === 'fastest_arrival') {
      results.sort((a, b) => {
        const etaA = typeof a.minEtaMinutes === 'number' ? a.minEtaMinutes : Number.MAX_SAFE_INTEGER;
        const etaB = typeof b.minEtaMinutes === 'number' ? b.minEtaMinutes : Number.MAX_SAFE_INTEGER;
        if (etaA !== etaB) return etaA - etaB;
        return (a.basePrice || 0) - (b.basePrice || 0);
      });
    } else if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (a.basePrice || 0) - (b.basePrice || 0);
      });
    }

    return results;
  }

  // 4. getEmergencyBookingFormDefaults
  getEmergencyBookingFormDefaults(promotionCode) {
    const urgencyOptions = [
      { value: 'within_30_minutes', label: 'Within 30 minutes' },
      { value: 'within_1_hour', label: 'Within 1 hour' },
      { value: 'within_2_hours', label: 'Within 2 hours' },
      { value: 'same_day', label: 'Same day' },
      { value: 'flexible', label: 'Flexible' }
    ];

    const promotions = this._getFromStorage('promotions');
    const now = new Date();
    let appliedPromotion = null;

    const matchesCommonConditions = (promo) => {
      if (promo.status !== 'active') return false;
      if (promo.applicableBookingCategory && promo.applicableBookingCategory !== 'any') {
        if (promo.applicableBookingCategory !== 'emergency') return false;
      }
      if (promo.applicableServiceTypes && promo.applicableServiceTypes.length > 0) {
        if (!promo.applicableServiceTypes.includes('emergency_lockout')) return false;
      }
      if (promo.startDate) {
        const sd = this._parseIso(promo.startDate);
        if (sd && now < sd) return false;
      }
      if (promo.endDate) {
        const ed = this._parseIso(promo.endDate);
        if (ed && now > ed) return false;
      }
      return true;
    };

    let promoCandidate = null;

    if (promotionCode) {
      const codeLower = String(promotionCode).toLowerCase();
      promoCandidate = promotions.find((p) => p.code && String(p.code).toLowerCase() === codeLower && matchesCommonConditions(p));
    }

    if (!promoCandidate) {
      const sessionPromo = this._getActivePromotionForSession();
      if (sessionPromo && matchesCommonConditions(sessionPromo)) {
        promoCandidate = sessionPromo;
      }
    }

    if (promoCandidate) {
      appliedPromotion = {
        promotionId: promoCandidate.id,
        code: promoCandidate.code || null,
        description: promoCandidate.description || promoCandidate.name || '',
        discountType: promoCandidate.discountType,
        discountValue: promoCandidate.discountValue
      };
    }

    return {
      urgencyOptions: urgencyOptions,
      defaultUrgencyValue: 'within_1_hour',
      appliedPromotion: appliedPromotion
    };
  }

  // 5. createServiceBooking
  createServiceBooking(
    bookingCategory,
    serviceType,
    sourcePage,
    technicianId,
    packageId,
    urgencyOption,
    scheduledStart,
    scheduledEnd,
    streetAddress,
    city,
    zipCode,
    addressNotes,
    vehicleMakeModel,
    numberOfLocks,
    notes,
    contactName,
    contactPhone,
    contactEmail,
    promotionCode,
    applyActivePromotions
  ) {
    const bookings = this._getFromStorage('service_bookings');

    const booking = {
      id: this._generateId('booking'),
      createdAt: this._nowIso(),
      updatedAt: null,
      bookingCategory: bookingCategory,
      serviceType: serviceType,
      technicianId: technicianId || null,
      sourcePage: sourcePage,
      packageId: packageId || null,
      urgencyOption: urgencyOption || null,
      scheduledStart: scheduledStart || null,
      scheduledEnd: scheduledEnd || null,
      streetAddress: streetAddress || '',
      city: city || '',
      zipCode: zipCode || '',
      addressNotes: addressNotes || '',
      vehicleMakeModel: vehicleMakeModel || null,
      numberOfLocks: typeof numberOfLocks === 'number' ? numberOfLocks : null,
      notes: notes || '',
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || null,
      basePrice: null,
      estimatedTotalPrice: null,
      currencyCode: 'usd',
      promotionCode: promotionCode || null,
      promotionId: null,
      discountAmount: null,
      finalPrice: null,
      status: bookingCategory === 'emergency' ? 'pending' : 'pending',
      isMembershipCovered: false
    };

    this._calculateBookingPricing(booking, {
      promotionCode: promotionCode,
      applyActivePromotions: typeof applyActivePromotions === 'boolean' ? applyActivePromotions : true
    });

    bookings.push(booking);
    this._saveToStorage('service_bookings', bookings);

    // Foreign-key resolution on booking
    const technicians = this._getFromStorage('technicians');
    const packages = this._getFromStorage('service_packages');
    const promotions = this._getFromStorage('promotions');

    const bookingWithRefs = Object.assign({}, booking);
    if (booking.technicianId) {
      bookingWithRefs.technician = technicians.find((t) => t.id === booking.technicianId) || null;
    } else {
      bookingWithRefs.technician = null;
    }
    if (booking.packageId) {
      bookingWithRefs.package = packages.find((p) => p.id === booking.packageId) || null;
    } else {
      bookingWithRefs.package = null;
    }
    if (booking.promotionId) {
      bookingWithRefs.promotion = promotions.find((p) => p.id === booking.promotionId) || null;
    } else {
      bookingWithRefs.promotion = null;
    }

    return {
      booking: bookingWithRefs,
      message: 'Booking created successfully.'
    };
  }

  // 6. createBookingCheckoutSession
  createBookingCheckoutSession(bookingId) {
    const bookings = this._getFromStorage('service_bookings');
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return {
        checkoutSession: null,
        bookingSummary: null
      };
    }

    const checkoutSessions = this._getFromStorage('booking_checkout_sessions');

    const subtotal = typeof booking.finalPrice === 'number'
      ? booking.finalPrice
      : typeof booking.estimatedTotalPrice === 'number'
        ? booking.estimatedTotalPrice
        : typeof booking.basePrice === 'number'
          ? booking.basePrice
          : 0;

    const discountAmount = typeof booking.discountAmount === 'number' ? booking.discountAmount : 0;
    const totalDue = subtotal;

    const session = {
      id: this._generateId('checkout'),
      bookingId: booking.id,
      createdAt: this._nowIso(),
      summaryJson: null,
      subtotal: subtotal,
      discountAmount: discountAmount,
      totalDue: totalDue,
      promotionCode: booking.promotionCode || null,
      status: 'review'
    };

    // Optional summary JSON
    const technicians = this._getFromStorage('technicians');
    const serviceDefs = this._getFromStorage('service_definitions');
    const promotions = this._getFromStorage('promotions');

    const def = serviceDefs.find((d) => d.serviceType === booking.serviceType);
    const tech = booking.technicianId
      ? technicians.find((t) => t.id === booking.technicianId)
      : null;
    const promo = booking.promotionId
      ? promotions.find((p) => p.id === booking.promotionId)
      : null;

    const addressLine = [booking.streetAddress, booking.city, booking.zipCode].filter(Boolean).join(', ');

    let scheduledWindowLabel = '';
    if (booking.bookingCategory === 'non_emergency' && booking.scheduledStart) {
      const startDate = this._parseIso(booking.scheduledStart);
      const endDate = booking.scheduledEnd ? this._parseIso(booking.scheduledEnd) : null;
      if (startDate) {
        const dayPart = this._formatDateShort(startDate);
        const timeStart = this._formatTimeShort(startDate);
        const timeEnd = endDate ? this._formatTimeShort(endDate) : '';
        scheduledWindowLabel = dayPart + ', ' + timeStart + (timeEnd ? '-' + timeEnd : '');
      }
    }

    const bookingSummary = {
      serviceTypeLabel: def ? def.name : booking.serviceType,
      bookingCategory: booking.bookingCategory,
      addressLine: addressLine,
      urgencyLabel: booking.bookingCategory === 'emergency' ? this._urgencyLabelFromValue(booking.urgencyOption) : '',
      scheduledWindowLabel: scheduledWindowLabel,
      technicianName: tech ? tech.name : null,
      contactName: booking.contactName,
      contactPhone: booking.contactPhone,
      promotionDescription: promo ? promo.description || promo.name || '' : ''
    };

    session.summaryJson = JSON.stringify(bookingSummary);

    checkoutSessions.push(session);
    this._saveToStorage('booking_checkout_sessions', checkoutSessions);

    // Foreign key resolution: attach booking
    const sessionWithRefs = Object.assign({}, session, { booking: booking });

    return {
      checkoutSession: sessionWithRefs,
      bookingSummary: bookingSummary
    };
  }

  // 7. getTechnicianDetails
  getTechnicianDetails(technicianId) {
    const technicians = this._getFromStorage('technicians');
    const offerings = this._getFromStorage('technician_service_offerings');

    const technician = technicians.find((t) => t.id === technicianId) || null;

    if (!technician) {
      return {
        technician: null,
        emergencyOfferings: [],
        nonEmergencyOfferings: []
      };
    }

    const emergencyOfferings = [];
    const nonEmergencyOfferings = [];

    offerings.forEach((off) => {
      if (!off.active || off.technicianId !== technician.id) return;
      if (off.isEmergency) {
        const minEta = typeof off.minEtaMinutes === 'number'
          ? off.minEtaMinutes
          : typeof technician.emergencyEtaMinutes === 'number'
            ? technician.emergencyEtaMinutes
            : null;
        emergencyOfferings.push({
          serviceType: off.serviceType,
          basePrice: off.basePrice,
          priceLabel: this._moneyLabel(off.basePrice) + ' call-out',
          minEtaMinutes: minEta,
          etaLabel: this._etaLabelFromMinutes(minEta)
        });
      } else {
        nonEmergencyOfferings.push({
          serviceType: off.serviceType,
          basePrice: off.basePrice,
          priceLabel: this._moneyLabel(off.basePrice) + '+',
          estimatedDurationMinutes: off.estimatedDurationMinutes || null
        });
      }
    });

    return {
      technician: technician,
      emergencyOfferings: emergencyOfferings,
      nonEmergencyOfferings: nonEmergencyOfferings
    };
  }

  // 8. getTechnicianLanguageOptions
  getTechnicianLanguageOptions() {
    const technicians = this._getFromStorage('technicians');
    const set = new Set();
    technicians.forEach((t) => {
      if (Array.isArray(t.languagesSpoken)) {
        t.languagesSpoken.forEach((code) => {
          if (code) set.add(code);
        });
      }
    });
    return Array.from(set).map((code) => ({
      code: code,
      label: code.charAt(0).toUpperCase() + code.slice(1)
    }));
  }

  // 9. getTechniciansDirectory
  getTechniciansDirectory(filters) {
    const f = filters || {};
    const technicians = this._getFromStorage('technicians');

    let list = technicians.filter((t) => t.profileStatus === 'active');

    if (f.languageCodes && Array.isArray(f.languageCodes) && f.languageCodes.length > 0) {
      const langSet = new Set(f.languageCodes);
      list = list.filter((t) => {
        if (!Array.isArray(t.languagesSpoken)) return false;
        return t.languagesSpoken.some((code) => langSet.has(code));
      });
    }

    if (typeof f.minRating === 'number') {
      list = list.filter((t) => t.rating >= f.minRating);
    }

    if (f.servicesIncluded && Array.isArray(f.servicesIncluded) && f.servicesIncluded.length > 0) {
      list = list.filter((t) => {
        if (!Array.isArray(t.servicesOffered)) return false;
        return t.servicesOffered.some((svc) => f.servicesIncluded.includes(svc));
      });
    }

    if (f.available247Only) {
      list = list.filter((t) => t.available247);
    }

    const results = list.map((t) => {
      const primaryAreasLabel = Array.isArray(t.serviceZipCodes) && t.serviceZipCodes.length
        ? 'Serving ' + t.serviceZipCodes.slice(0, 3).join(', ')
        : '';
      return {
        technicianId: t.id,
        name: t.name,
        rating: t.rating,
        reviewCount: t.reviewCount,
        available247: !!t.available247,
        languagesSpoken: Array.isArray(t.languagesSpoken) ? t.languagesSpoken.slice() : [],
        primaryServiceAreasLabel: primaryAreasLabel,
        technician: t // foreign-key resolution
      };
    });

    return results;
  }

  // 10. searchTechniciansByZip
  searchTechniciansByZip(zipCode, available247Only) {
    const only247 = !!available247Only;
    const technicians = this._getFromStorage('technicians');

    const matches = technicians.filter((t) => {
      if (t.profileStatus !== 'active') return false;
      if (!Array.isArray(t.serviceZipCodes) || !t.serviceZipCodes.includes(zipCode)) return false;
      if (only247 && !t.available247) return false;
      return true;
    });

    const techniciansOut = matches.map((t) => {
      const eta = typeof t.emergencyEtaMinutes === 'number' ? t.emergencyEtaMinutes : null;
      const basePrice = typeof t.emergencyLockoutBasePrice === 'number' ? t.emergencyLockoutBasePrice : null;
      return {
        technicianId: t.id,
        name: t.name,
        rating: t.rating,
        reviewCount: t.reviewCount,
        available247: !!t.available247,
        languagesSpoken: Array.isArray(t.languagesSpoken) ? t.languagesSpoken.slice() : [],
        emergencyEtaMinutes: eta,
        emergencyEtaLabel: this._etaLabelFromMinutes(eta),
        emergencyLockoutBasePrice: basePrice,
        emergencyLockoutPriceLabel: basePrice != null ? this._moneyLabel(basePrice) + ' call-out' : '',
        technician: t // foreign-key resolution
      };
    });

    return {
      zipCode: zipCode,
      resultCount: techniciansOut.length,
      technicians: techniciansOut
    };
  }

  // 11. getRekeyServiceDetails
  getRekeyServiceDetails() {
    const serviceDefs = this._getFromStorage('service_definitions');
    const packages = this._getFromStorage('service_packages');

    const def = serviceDefs.find((d) => d.serviceType === 'lock_rekey' && d.active) || null;

    const rekeyPackages = packages
      .filter((p) => p.serviceType === 'lock_rekey' && p.isActive)
      .map((p) => {
        const priceLabel = this._moneyLabel(p.price) + (p.maxLocksIncluded ? ' for up to ' + p.maxLocksIncluded + ' locks' : '');
        let locksCoverageLabel = '';
        if (typeof p.minLocksIncluded === 'number' && typeof p.maxLocksIncluded === 'number') {
          locksCoverageLabel = 'Covers ' + p.minLocksIncluded + '-' + p.maxLocksIncluded + ' locks';
        } else if (typeof p.maxLocksIncluded === 'number') {
          locksCoverageLabel = 'Covers up to ' + p.maxLocksIncluded + ' locks';
        } else if (typeof p.minLocksIncluded === 'number') {
          locksCoverageLabel = 'Covers at least ' + p.minLocksIncluded + ' locks';
        }
        return {
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.price,
          tier: p.tier,
          isMidRange: !!p.isMidRange,
          minLocksIncluded: typeof p.minLocksIncluded === 'number' ? p.minLocksIncluded : null,
          maxLocksIncluded: typeof p.maxLocksIncluded === 'number' ? p.maxLocksIncluded : null,
          estimatedDurationMinutes: typeof p.estimatedDurationMinutes === 'number' ? p.estimatedDurationMinutes : null,
          priceLabel: priceLabel,
          locksCoverageLabel: locksCoverageLabel
        };
      });

    const serviceDefinition = def
      ? {
          serviceType: def.serviceType,
          name: def.name,
          description: def.description || '',
          startingPrice: typeof def.startingPrice === 'number' ? def.startingPrice : null
        }
      : null;

    return {
      serviceDefinition: serviceDefinition,
      packages: rekeyPackages
    };
  }

  // 12. getSearchFilterOptions
  getSearchFilterOptions(query) {
    const ratingOptions = [
      { value: 3, label: '3+ stars' },
      { value: 4, label: '4+ stars' },
      { value: 4.5, label: '4.5+ stars' }
    ];

    const priceRanges = [
      { maxPrice: 50, label: 'Under $50' },
      { maxPrice: 100, label: 'Under $100' },
      { maxPrice: 150, label: 'Under $150' },
      { maxPrice: 200, label: 'Under $200' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' }
    ];

    return {
      ratingOptions: ratingOptions,
      priceRanges: priceRanges,
      sortOptions: sortOptions,
      defaultSortValue: 'relevance'
    };
  }

  // 13. searchServiceProviders
  searchServiceProviders(query, filters, sortBy) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sort = sortBy || 'relevance';

    let inferredServiceType = null;
    if (f.serviceType) {
      inferredServiceType = f.serviceType;
    } else {
      if (q.includes('car') && (q.includes('lockout') || q.includes('lock'))) {
        inferredServiceType = 'car_lockout';
      } else if (q.includes('emergency') && q.includes('lock')) {
        inferredServiceType = 'emergency_lockout';
      } else if (q.includes('rekey')) {
        inferredServiceType = 'lock_rekey';
      } else if (q.includes('repair')) {
        inferredServiceType = 'lock_repair';
      } else if (q.includes('door') && q.includes('lock')) {
        inferredServiceType = 'door_lock_service';
      }
    }

    const technicians = this._getFromStorage('technicians');
    const offerings = this._getFromStorage('technician_service_offerings');

    let results = [];

    offerings.forEach((off) => {
      if (!off.active) return;
      if (inferredServiceType && off.serviceType !== inferredServiceType) return;

      if (f.bookingCategory === 'emergency' && !off.isEmergency) return;
      if (f.bookingCategory === 'non_emergency' && off.isEmergency) return;

      const tech = technicians.find((t) => t.id === off.technicianId);
      if (!tech || tech.profileStatus !== 'active') return;

      if (typeof f.minRating === 'number' && tech.rating < f.minRating) return;
      if (typeof f.maxPrice === 'number' && off.basePrice > f.maxPrice) return;

      const minEta = typeof off.minEtaMinutes === 'number'
        ? off.minEtaMinutes
        : typeof tech.emergencyEtaMinutes === 'number'
          ? tech.emergencyEtaMinutes
          : null;

      const result = {
        technicianId: tech.id,
        technicianName: tech.name,
        serviceType: off.serviceType,
        isEmergency: !!off.isEmergency,
        basePrice: off.basePrice,
        priceLabel: this._moneyLabel(off.basePrice) + (off.isEmergency ? ' call-out' : '+'),
        minEtaMinutes: minEta,
        etaLabel: this._etaLabelFromMinutes(minEta),
        rating: tech.rating,
        reviewCount: tech.reviewCount,
        available247: !!tech.available247,
        technician: tech // foreign-key resolution
      };

      results.push(result);
    });

    // Fallback: if no matching offerings were found, infer from technician base pricing
    if (!results.length && inferredServiceType) {
      technicians.forEach((tech) => {
        if (!tech || tech.profileStatus !== 'active') return;

        let basePrice = null;
        let isEmergency = false;

        if (inferredServiceType === 'car_lockout' && typeof tech.carLockoutBasePrice === 'number') {
          basePrice = tech.carLockoutBasePrice;
          isEmergency = true;
        } else if (inferredServiceType === 'emergency_lockout' && typeof tech.emergencyLockoutBasePrice === 'number') {
          basePrice = tech.emergencyLockoutBasePrice;
          isEmergency = true;
        }

        if (basePrice === null) return;
        if (typeof f.maxPrice === 'number' && basePrice > f.maxPrice) return;
        if (typeof f.minRating === 'number' && tech.rating < f.minRating) return;

        const minEta = typeof tech.emergencyEtaMinutes === 'number'
          ? tech.emergencyEtaMinutes
          : null;

        results.push({
          technicianId: tech.id,
          technicianName: tech.name,
          serviceType: inferredServiceType,
          isEmergency: isEmergency || (f.bookingCategory === 'emergency'),
          basePrice: basePrice,
          priceLabel: this._moneyLabel(basePrice) + (isEmergency ? ' call-out' : '+'),
          minEtaMinutes: minEta,
          etaLabel: this._etaLabelFromMinutes(minEta),
          rating: tech.rating,
          reviewCount: tech.reviewCount,
          available247: !!tech.available247,
          technician: tech
        });
      });
    }

    // Sorting
    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (a.basePrice || 0) - (b.basePrice || 0);
      });
    } else {
      // relevance: simple heuristic - higher rating then lower price
      results.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (a.basePrice || 0) - (b.basePrice || 0);
      });
    }

    return results;
  }

  // 14. getProductCategories
  getProductCategories() {
    const categories = this._getFromStorage('product_categories').filter((c) => c.isActive);
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      categoryId: c.categoryId,
      description: c.description || '',
      displayOrder: typeof c.displayOrder === 'number' ? c.displayOrder : null,
      isActive: !!c.isActive
    }));
  }

  // 15. getProductsForCategory
  getProductsForCategory(categoryId, filters, sortBy) {
    const f = filters || {};
    const sort = sortBy || 'featured';

    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    let list = products.filter((p) => p.status === 'active');

    if (categoryId && categoryId !== 'all') {
      list = list.filter((p) => p.categoryId === categoryId);
    }

    if (typeof f.minRating === 'number') {
      list = list.filter((p) => p.rating >= f.minRating);
    }

    if (typeof f.minReviewCount === 'number') {
      list = list.filter((p) => p.reviewCount >= f.minReviewCount);
    }

    if (f.canBeQuotedOnly) {
      list = list.filter((p) => p.canBeQuotedForInstallation);
    }

    if (typeof f.isSmart === 'boolean') {
      list = list.filter((p) => !!p.isSmart === f.isSmart);
    }

    if (typeof f.isStandardDeadbolt === 'boolean') {
      list = list.filter((p) => !!p.isStandardDeadbolt === f.isStandardDeadbolt);
    }

    // Sorting
    if (sort === 'price_low_to_high') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_high_to_low') {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating_high_to_low') {
      list.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      });
    } else if (sort === 'review_count_high_to_low') {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return list.map((p) => {
      const cat = categories.find((c) => c.categoryId === p.categoryId) || null;
      const shortDesc = p.description && typeof p.description === 'string'
        ? p.description.slice(0, 120)
        : '';
      return {
        id: p.id,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: cat ? cat.name : '',
        price: p.price,
        priceLabel: this._moneyLabel(p.price),
        rating: p.rating,
        reviewCount: p.reviewCount,
        isSmart: !!p.isSmart,
        isStandardDeadbolt: !!p.isStandardDeadbolt,
        imageUrl: p.imageUrl || '',
        shortDescription: shortDesc,
        canBeQuotedForInstallation: !!p.canBeQuotedForInstallation
      };
    });
  }

  // 16. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const p = products.find((x) => x.id === productId) || null;

    if (!p) {
      return { product: null };
    }

    const cat = categories.find((c) => c.categoryId === p.categoryId) || null;

    const productOut = {
      id: p.id,
      name: p.name,
      categoryId: p.categoryId,
      categoryName: cat ? cat.name : '',
      description: p.description || '',
      sku: p.sku || '',
      brand: p.brand || '',
      price: p.price,
      priceLabel: this._moneyLabel(p.price),
      rating: p.rating,
      reviewCount: p.reviewCount,
      isSmart: !!p.isSmart,
      isStandardDeadbolt: !!p.isStandardDeadbolt,
      imageUrl: p.imageUrl || '',
      specs: p.specs || '',
      status: p.status,
      canBeQuotedForInstallation: !!p.canBeQuotedForInstallation,
      category: cat // foreign-key resolution for categoryId
    };

    return { product: productOut };
  }

  // 17. addProductToQuote
  addProductToQuote(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        quoteRequestId: null,
        status: null,
        totalItems: 0,
        totalLocks: 0,
        items: [],
        message: 'Product not found.'
      };
    }

    const quoteRequest = this._getOrCreateDraftQuoteRequest();
    const items = this._getFromStorage('quote_request_items');

    let item = items.find((it) => it.quoteRequestId === quoteRequest.id && it.productId === productId);

    if (item) {
      item.quantity = (item.quantity || 0) + qty;
    } else {
      item = {
        id: this._generateId('qitem'),
        quoteRequestId: quoteRequest.id,
        productId: productId,
        quantity: qty,
        createdAt: this._nowIso(),
        itemNotes: null
      };
      items.push(item);
    }

    this._saveToStorage('quote_request_items', items);

    const totals = this._calculateQuoteTotals(quoteRequest.id);

    const categories = this._getFromStorage('product_categories');
    const refreshedItems = this._getFromStorage('quote_request_items').filter(
      (it) => it.quoteRequestId === quoteRequest.id
    );

    const itemsOut = refreshedItems.map((it) => {
      const prod = products.find((p) => p.id === it.productId) || null;
      const cat = prod ? categories.find((c) => c.categoryId === prod.categoryId) || null : null;
      return {
        itemId: it.id,
        productId: it.productId,
        productName: prod ? prod.name : '',
        quantity: it.quantity,
        categoryId: prod ? prod.categoryId : null,
        categoryName: cat ? cat.name : '',
        isSmart: prod ? !!prod.isSmart : false,
        isStandardDeadbolt: prod ? !!prod.isStandardDeadbolt : false,
        product: prod // foreign-key resolution
      };
    });

    return {
      quoteRequestId: quoteRequest.id,
      status: quoteRequest.status,
      totalItems: totals.totalItems,
      totalLocks: totals.totalLocks,
      items: itemsOut,
      message: 'Product added to quote request.'
    };
  }

  // 18. getCurrentQuoteRequest
  getCurrentQuoteRequest() {
    const quoteRequest = this._getOrCreateDraftQuoteRequest();
    const items = this._getFromStorage('quote_request_items').filter(
      (it) => it.quoteRequestId === quoteRequest.id
    );
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const itemsOut = items.map((it) => {
      const prod = products.find((p) => p.id === it.productId) || null;
      const cat = prod ? categories.find((c) => c.categoryId === prod.categoryId) || null : null;
      return {
        itemId: it.id,
        productId: it.productId,
        productName: prod ? prod.name : '',
        quantity: it.quantity,
        categoryId: prod ? prod.categoryId : null,
        categoryName: cat ? cat.name : '',
        isSmart: prod ? !!prod.isSmart : false,
        isStandardDeadbolt: prod ? !!prod.isStandardDeadbolt : false,
        product: prod // foreign-key resolution
      };
    });

    const contact = {
      contactName: quoteRequest.contactName || '',
      contactPhone: quoteRequest.contactPhone || '',
      contactEmail: quoteRequest.contactEmail || '',
      streetAddress: quoteRequest.streetAddress || '',
      city: quoteRequest.city || '',
      zipCode: quoteRequest.zipCode || '',
      notes: quoteRequest.notes || ''
    };

    return {
      quoteRequestId: quoteRequest.id,
      status: quoteRequest.status,
      totalItems: quoteRequest.totalItems || itemsOut.length,
      totalLocks: quoteRequest.totalLocks || 0,
      items: itemsOut,
      contact: contact
    };
  }

  // 19. updateQuoteRequestItemQuantity
  updateQuoteRequestItemQuantity(itemId, quantity) {
    const qty = typeof quantity === 'number' ? quantity : 0;
    const items = this._getFromStorage('quote_request_items');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const itemIndex = items.findIndex((it) => it.id === itemId);
    if (itemIndex === -1) {
      return {
        quoteRequestId: null,
        totalItems: 0,
        totalLocks: 0,
        items: []
      };
    }

    const quoteRequestId = items[itemIndex].quoteRequestId;

    if (qty <= 0) {
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex].quantity = qty;
    }

    this._saveToStorage('quote_request_items', items);

    const totals = this._calculateQuoteTotals(quoteRequestId);

    const refreshedItems = this._getFromStorage('quote_request_items').filter(
      (it) => it.quoteRequestId === quoteRequestId
    );

    const itemsOut = refreshedItems.map((it) => {
      const prod = products.find((p) => p.id === it.productId) || null;
      const cat = prod ? categories.find((c) => c.categoryId === prod.categoryId) || null : null;
      return {
        itemId: it.id,
        productId: it.productId,
        productName: prod ? prod.name : '',
        quantity: it.quantity,
        categoryId: prod ? prod.categoryId : null,
        categoryName: cat ? cat.name : '',
        isSmart: prod ? !!prod.isSmart : false,
        isStandardDeadbolt: prod ? !!prod.isStandardDeadbolt : false,
        product: prod // foreign-key resolution
      };
    });

    return {
      quoteRequestId: quoteRequestId,
      totalItems: totals.totalItems,
      totalLocks: totals.totalLocks,
      items: itemsOut
    };
  }

  // 20. removeQuoteRequestItem
  removeQuoteRequestItem(itemId) {
    const items = this._getFromStorage('quote_request_items');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const itemIndex = items.findIndex((it) => it.id === itemId);
    if (itemIndex === -1) {
      return {
        quoteRequestId: null,
        totalItems: 0,
        totalLocks: 0,
        items: []
      };
    }

    const quoteRequestId = items[itemIndex].quoteRequestId;
    items.splice(itemIndex, 1);
    this._saveToStorage('quote_request_items', items);

    const totals = this._calculateQuoteTotals(quoteRequestId);
    const refreshedItems = this._getFromStorage('quote_request_items').filter(
      (it) => it.quoteRequestId === quoteRequestId
    );

    const itemsOut = refreshedItems.map((it) => {
      const prod = products.find((p) => p.id === it.productId) || null;
      const cat = prod ? categories.find((c) => c.categoryId === prod.categoryId) || null : null;
      return {
        itemId: it.id,
        productId: it.productId,
        productName: prod ? prod.name : '',
        quantity: it.quantity,
        categoryId: prod ? prod.categoryId : null,
        categoryName: cat ? cat.name : '',
        isSmart: prod ? !!prod.isSmart : false,
        isStandardDeadbolt: prod ? !!prod.isStandardDeadbolt : false,
        product: prod // foreign-key resolution
      };
    });

    return {
      quoteRequestId: quoteRequestId,
      totalItems: totals.totalItems,
      totalLocks: totals.totalLocks,
      items: itemsOut
    };
  }

  // 21. submitQuoteRequest
  submitQuoteRequest(contactName, contactPhone, contactEmail, streetAddress, city, zipCode, notes) {
    const quoteRequests = this._getFromStorage('quote_requests');

    let currentIdRaw = localStorage.getItem('current_quote_request_id');
    let currentId = currentIdRaw && currentIdRaw !== 'null' ? currentIdRaw : null;

    let quoteRequest = currentId
      ? quoteRequests.find((q) => q.id === currentId)
      : null;

    if (!quoteRequest) {
      // No existing draft; create one so we can still accept the request
      quoteRequest = this._getOrCreateDraftQuoteRequest();
    }

    quoteRequest.contactName = contactName || '';
    quoteRequest.contactPhone = contactPhone || '';
    quoteRequest.contactEmail = contactEmail || '';
    quoteRequest.streetAddress = streetAddress || '';
    quoteRequest.city = city || '';
    quoteRequest.zipCode = zipCode || '';
    quoteRequest.notes = notes || '';
    quoteRequest.status = 'submitted';
    quoteRequest.updatedAt = this._nowIso();

    const index = quoteRequests.findIndex((q) => q.id === quoteRequest.id);
    if (index !== -1) {
      quoteRequests[index] = quoteRequest;
      this._saveToStorage('quote_requests', quoteRequests);
    }

    // Clear current draft id so a new quote will start fresh
    localStorage.setItem('current_quote_request_id', 'null');

    return {
      quoteRequestId: quoteRequest.id,
      status: quoteRequest.status,
      message: 'Quote request submitted successfully.'
    };
  }

  // 22. getMembershipPlansOverview
  getMembershipPlansOverview() {
    const plans = this._getFromStorage('membership_plans');
    const activePlans = plans.filter((p) => p.status === 'active');

    activePlans.sort((a, b) => {
      const ao = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
      const bo = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });

    return activePlans.map((p) => ({
      planId: p.id,
      name: p.name,
      monthlyPrice: p.monthlyPrice,
      annualPrice: typeof p.annualPrice === 'number' ? p.annualPrice : null,
      description: p.description || '',
      freeEmergencyCalloutsPerYear: p.freeEmergencyCalloutsPerYear,
      benefits: Array.isArray(p.benefits) ? p.benefits.slice() : [],
      status: p.status,
      displayOrder: typeof p.displayOrder === 'number' ? p.displayOrder : null
    }));
  }

  // 23. getMembershipPlanDetails
  getMembershipPlanDetails(planId) {
    const plans = this._getFromStorage('membership_plans');
    const p = plans.find((pl) => pl.id === planId) || null;
    if (!p) {
      return { plan: null };
    }
    const planOut = {
      planId: p.id,
      name: p.name,
      monthlyPrice: p.monthlyPrice,
      annualPrice: typeof p.annualPrice === 'number' ? p.annualPrice : null,
      description: p.description || '',
      freeEmergencyCalloutsPerYear: p.freeEmergencyCalloutsPerYear,
      benefits: Array.isArray(p.benefits) ? p.benefits.slice() : []
    };
    return { plan: planOut };
  }

  // 24. startMembershipEnrollment
  startMembershipEnrollment(planId, billingPeriod, contactName, contactPhone, contactEmail, billingZipCode) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === planId && p.status === 'active');

    if (!plan) {
      return {
        enrollment: null,
        message: 'Selected membership plan not found or inactive.'
      };
    }

    const enrollment = this._persistMembershipEnrollment(
      planId,
      billingPeriod,
      contactName,
      contactPhone,
      contactEmail,
      billingZipCode
    );

    return {
      enrollment: enrollment,
      message: 'Membership enrollment started. Proceed to payment to activate.'
    };
  }

  // 25. getActivePromotions
  getActivePromotions(serviceType, bookingCategory) {
    const promotions = this._getFromStorage('promotions');
    const now = new Date();

    const list = promotions.filter((p) => {
      if (p.status !== 'active') return false;
      if (serviceType && Array.isArray(p.applicableServiceTypes) && p.applicableServiceTypes.length > 0) {
        if (!p.applicableServiceTypes.includes(serviceType)) return false;
      }
      if (bookingCategory && p.applicableBookingCategory && p.applicableBookingCategory !== 'any') {
        if (p.applicableBookingCategory !== bookingCategory) return false;
      }
      if (p.startDate) {
        const sd = this._parseIso(p.startDate);
        if (sd && now < sd) return false;
      }
      if (p.endDate) {
        const ed = this._parseIso(p.endDate);
        if (ed && now > ed) return false;
      }
      return true;
    });

    return list.map((p) => {
      let validityLabel = '';
      if (p.endDate) {
        validityLabel = 'Valid until ' + this._formatDateShort(p.endDate);
      } else if (p.startDate) {
        validityLabel = 'Starts ' + this._formatDateShort(p.startDate);
      }
      return {
        promotionId: p.id,
        name: p.name,
        description: p.description || '',
        code: p.code || null,
        discountType: p.discountType,
        discountValue: p.discountValue,
        minOrderAmount: typeof p.minOrderAmount === 'number' ? p.minOrderAmount : null,
        applicableServiceTypes: Array.isArray(p.applicableServiceTypes) ? p.applicableServiceTypes.slice() : [],
        applicableBookingCategory: p.applicableBookingCategory || null,
        isAutoApplied: !!p.isAutoApplied,
        status: p.status,
        validityLabel: validityLabel
      };
    });
  }

  // 26. getPromotionDetails
  getPromotionDetails(promotionId) {
    const promotions = this._getFromStorage('promotions');
    const p = promotions.find((pr) => pr.id === promotionId) || null;
    if (!p) {
      return { promotion: null };
    }
    const promotionOut = {
      promotionId: p.id,
      name: p.name,
      description: p.description || '',
      code: p.code || null,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minOrderAmount: typeof p.minOrderAmount === 'number' ? p.minOrderAmount : null,
      applicableServiceTypes: Array.isArray(p.applicableServiceTypes) ? p.applicableServiceTypes.slice() : [],
      applicableBookingCategory: p.applicableBookingCategory || null,
      isAutoApplied: !!p.isAutoApplied,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      status: p.status
    };
    return { promotion: promotionOut };
  }

  // 27. activatePromotionForNextBooking
  activatePromotionForNextBooking(promotionId) {
    const promotions = this._getFromStorage('promotions');
    const promo = promotions.find((p) => p.id === promotionId) || null;
    if (!promo || promo.status !== 'active') {
      return {
        success: false,
        promotionCode: null,
        message: 'Promotion not found or not active.'
      };
    }

    const payload = {
      promotionId: promo.id,
      promotionCode: promo.code || null
    };
    localStorage.setItem('session_active_promotion', JSON.stringify(payload));

    return {
      success: true,
      promotionCode: promo.code || null,
      message: 'Promotion activated for next booking.'
    };
  }

  // 28. createCallbackRequest
  createCallbackRequest(
    technicianId,
    contactName,
    contactPhone,
    preferredCallbackTimeOption,
    preferredCallbackStart,
    preferredCallbackEnd,
    message
  ) {
    const callbacks = this._getFromStorage('callback_requests');

    const request = {
      id: this._generateId('callback'),
      technicianId: technicianId,
      createdAt: this._nowIso(),
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      preferredCallbackTimeOption: preferredCallbackTimeOption,
      preferredCallbackStart: preferredCallbackStart || null,
      preferredCallbackEnd: preferredCallbackEnd || null,
      message: message || '',
      status: 'submitted'
    };

    callbacks.push(request);
    this._saveToStorage('callback_requests', callbacks);

    return {
      callbackRequestId: request.id,
      status: request.status,
      message: 'Callback request submitted.'
    };
  }

  // 29. getContactInfo
  getContactInfo() {
    // Static contact info; can be adjusted as needed
    return {
      phoneNumbers: [
        { label: 'Main', number: '+1 (555) 000-0000' },
        { label: 'Emergency 24/7', number: '+1 (555) 111-1111' }
      ],
      emailAddresses: [
        { label: 'Support', email: 'support@example-locksmith.com' },
        { label: 'Sales', email: 'sales@example-locksmith.com' }
      ],
      mailingAddress: {
        street: '123 Locksmith St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103'
      },
      supportHours: 'Phone support 7 days a week, 8am–8pm. 24/7 emergency dispatch available.',
      emergencyBookingLinkLabel: 'Book 24/7 Emergency Lockout'
    };
  }

  // 30. submitContactMessage
  submitContactMessage(name, email, phone, topic, message) {
    const messages = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('contact_msg'),
      name: name || '',
      email: email || '',
      phone: phone || '',
      topic: topic || 'other',
      message: message || '',
      createdAt: this._nowIso()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      messageId: msg.id,
      message: 'Your message has been received.'
    };
  }

  // 31. getServiceCoverageSummary
  getServiceCoverageSummary() {
    const technicians = this._getFromStorage('technicians');

    const primaryCitiesSet = new Set();
    const zipPatternMap = new Map();
    let has247 = false;

    technicians.forEach((t) => {
      if (t.addressCity) primaryCitiesSet.add(t.addressCity);
      if (t.available247) has247 = true;

      if (Array.isArray(t.serviceZipCodes)) {
        t.serviceZipCodes.forEach((zip) => {
          if (!zip || typeof zip !== 'string' || zip.length < 5) return;
          const pattern = zip.slice(0, 4) + 'x';
          const key = (t.addressCity || '') + '|' + (t.addressState || '') + '|' + pattern;
          if (!zipPatternMap.has(key)) {
            zipPatternMap.set(key, {
              city: t.addressCity || '',
              state: t.addressState || '',
              zipPattern: pattern
            });
          }
        });
      }
    });

    return {
      primaryCities: Array.from(primaryCitiesSet),
      zipCodeRanges: Array.from(zipPatternMap.values()),
      has247EmergencyService: has247
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
