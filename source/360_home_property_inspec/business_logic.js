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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'inspection_services',
      'inspection_add_ons',
      'inspection_packages',
      'bundles',
      'inspectors',
      'appointment_slots',
      'inspector_options',
      'inspection_bookings',
      'quote_packages',
      'quote_requests',
      'quotes',
      'promotions',
      'gift_certificate_options',
      'gift_certificates',
      'cart',
      'cart_items',
      'orders',
      'articles',
      'favorite_articles',
      'service_area_cities',
      'address_check_results',
      'service_area_contact_requests',
      'faq_entries',
      'general_contact_requests'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('currentCartId')) {
      localStorage.setItem('currentCartId', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed == null ? defaultValue : parsed;
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

  // Internal helper to get or create the current cart
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let currentCartId = localStorage.getItem('currentCartId');
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart) {
      const nowIso = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        tax_total: 0,
        total: 0,
        created_at: nowIso,
        updated_at: nowIso
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('currentCartId', cart.id);
    }

    return cart;
  }

  // Internal helper to recalculate cart totals
  _recalculateCartTotals(cartId) {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.id === cartId);
    if (!cart) return;

    const cartItems = this._getFromStorage('cart_items');
    let subtotal = 0;
    const itemIds = Array.isArray(cart.items) ? cart.items : [];

    itemIds.forEach((itemId) => {
      const ci = cartItems.find((i) => i.id === itemId);
      if (ci) {
        subtotal += ci.total_price || 0;
      }
    });

    cart.subtotal = Math.round(subtotal * 100) / 100;
    cart.tax_total = cart.tax_total || 0;
    cart.total = cart.subtotal + (cart.tax_total || 0);
    cart.updated_at = new Date().toISOString();

    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }
  }

  // Internal helper to remove a cart item and update cart
  _removeCartItemInternal(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) return false;

    const item = cartItems[idx];
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === item.cart_id);
    if (cart) {
      cart.items = (cart.items || []).filter((id) => id !== cartItemId);
      const cIdx = carts.findIndex((c) => c.id === cart.id);
      if (cIdx !== -1) {
        carts[cIdx] = cart;
        this._saveToStorage('cart', carts);
      }
      this._recalculateCartTotals(cart.id);
    }

    return true;
  }

  // Internal helper to calculate booking price
  _calculateBookingPrice(
    contextType,
    serviceTypeId,
    packageId,
    bundleId,
    appointmentSlotId,
    inspectorId,
    selectedAddOnIds,
    promotion
  ) {
    selectedAddOnIds = Array.isArray(selectedAddOnIds) ? selectedAddOnIds : [];

    const services = this._getFromStorage('inspection_services');
    const packages = this._getFromStorage('inspection_packages');
    const bundles = this._getFromStorage('bundles');
    const addOns = this._getFromStorage('inspection_add_ons');
    const appointmentSlots = this._getFromStorage('appointment_slots');
    const inspectorOptions = this._getFromStorage('inspector_options');

    let basePrice = 0;

    if (contextType === 'service') {
      if (inspectorId) {
        const opt = inspectorOptions.find(
          (o) => o.appointment_slot_id === appointmentSlotId && o.inspector_id === inspectorId
        );
        if (opt) {
          basePrice = opt.base_price || 0;
        }
      }
      if (!basePrice && serviceTypeId) {
        const svc = services.find((s) => s.id === serviceTypeId);
        if (svc) {
          basePrice = svc.base_price || 0;
        }
      }
    } else if (contextType === 'package') {
      if (packageId) {
        const pkg = packages.find((p) => p.id === packageId);
        if (pkg) {
          basePrice = pkg.base_price || 0;
        }
      }
    } else if (contextType === 'bundle') {
      if (bundleId) {
        const bun = bundles.find((b) => b.id === bundleId);
        if (bun) {
          if (typeof bun.promotional_price === 'number' && bun.promotional_price > 0) {
            basePrice = bun.promotional_price;
          } else {
            basePrice = bun.regular_price || 0;
          }
        }
      }
    }

    const slot = appointmentSlots.find((s) => s.id === appointmentSlotId);
    const travelFee = slot ? slot.travel_fee || 0 : 0;

    let addOnsSubtotal = 0;
    if (selectedAddOnIds.length) {
      selectedAddOnIds.forEach((id) => {
        const ao = addOns.find((a) => a.id === id);
        if (ao && ao.is_active) {
          addOnsSubtotal += ao.price || 0;
        }
      });
    }

    const preDiscountTotal = basePrice + addOnsSubtotal + travelFee;
    let discountAmount = 0;

    if (promotion) {
      if (promotion.discount_type === 'amount') {
        discountAmount = promotion.discount_value || 0;
      } else if (promotion.discount_type === 'percentage') {
        discountAmount = preDiscountTotal * ((promotion.discount_value || 0) / 100);
      }
      if (discountAmount > preDiscountTotal) {
        discountAmount = preDiscountTotal;
      }
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    let totalPrice = preDiscountTotal - discountAmount;
    totalPrice = Math.round(totalPrice * 100) / 100;

    return {
      basePrice,
      addOnsSubtotal,
      travelFee,
      discountAmount,
      totalPrice
    };
  }

  // Internal helper to validate a promotion code
  _validatePromotionCode(promoCode, contextType, basePrice, options = {}) {
    const normalizedCode = (promoCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      return { valid: false, message: 'Promo code is empty.' };
    }

    const promotions = this._getFromStorage('promotions');
    const now = new Date();

    let promo = promotions.find((p) => {
      if (!p.is_active) return false;
      if (typeof p.code !== 'string') return false;
      const pCode = p.code.trim().toUpperCase();
      if (pCode !== normalizedCode) return false;
      if (!(p.applies_to_context === 'all' || p.applies_to_context === contextType)) return false;
      return true;
    });

    if (!promo) {
      return { valid: false, message: 'Promo code not found or not applicable.' };
    }

    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        return { valid: false, message: 'Promo code is not yet valid.' };
      }
    }

    if (promo.valid_until) {
      const until = new Date(promo.valid_until);
      if (now > until) {
        return { valid: false, message: 'Promo code has expired.' };
      }
    }

    if (typeof promo.min_regular_price === 'number' && basePrice < promo.min_regular_price) {
      return { valid: false, message: 'Promo code does not meet minimum price requirement.' };
    }

    if (contextType === 'bundle' && options && options.bundleId) {
      const bundles = this._getFromStorage('bundles');
      const bundle = bundles.find((b) => b.id === options.bundleId);
      if (bundle && Array.isArray(bundle.eligible_promo_codes) && bundle.eligible_promo_codes.length) {
        const eligible = bundle.eligible_promo_codes.map((c) => (c || '').trim().toUpperCase());
        if (!eligible.includes(normalizedCode)) {
          return { valid: false, message: 'Promo code is not eligible for this bundle.' };
        }
      }
    }

    return { valid: true, promotion: promo };
  }

  // Internal helper to mask card number
  _maskCardNumber(cardNumber) {
    const digits = (cardNumber || '').replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return digits.slice(-4);
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // getHomePageData
  getHomePageData() {
    const services = this._getFromStorage('inspection_services').filter((s) => s.is_active);
    const packages = this._getFromStorage('inspection_packages').filter((p) => p.is_active);
    const bundles = this._getFromStorage('bundles').filter((b) => b.is_active);
    const promotions = this._getFromStorage('promotions').filter((p) => p.is_active);

    let articles = this._getFromStorage('articles').filter((a) => a.is_active);
    articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    let serviceAreas = this._getFromStorage('service_area_cities').filter((c) => c.is_active);
    serviceAreas.sort((a, b) => {
      const ao = a.display_order != null ? a.display_order : 9999;
      const bo = b.display_order != null ? b.display_order : 9999;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });

    return {
      featuredServices: services.slice(0, 5),
      featuredPackages: packages.slice(0, 5),
      featuredBundles: bundles.slice(0, 5),
      featuredPromotions: promotions.slice(0, 5),
      featuredArticles: articles.slice(0, 5),
      serviceAreaHighlights: serviceAreas.slice(0, 5)
    };
  }

  // getInspectionServiceOptions
  getInspectionServiceOptions() {
    const services = this._getFromStorage('inspection_services').filter((s) => s.is_active);
    const allPropertyTypes = [
      'single_family_home',
      'condo_townhome',
      'multi_unit_apartment_building',
      'other_residential'
    ];

    const propertyTypesSet = new Set();
    services.forEach((s) => {
      if (Array.isArray(s.supported_property_types) && s.supported_property_types.length) {
        s.supported_property_types.forEach((pt) => propertyTypesSet.add(pt));
      }
    });

    let propertyTypes = Array.from(propertyTypesSet);
    if (!propertyTypes.length) {
      propertyTypes = allPropertyTypes;
    }

    return {
      services,
      propertyTypes
    };
  }

  // getSchedulerContextDetails
  getSchedulerContextDetails(contextType, serviceTypeId, packageId, bundleId) {
    const services = this._getFromStorage('inspection_services');
    const packages = this._getFromStorage('inspection_packages');
    const bundles = this._getFromStorage('bundles');
    const addOns = this._getFromStorage('inspection_add_ons');

    let service = null;
    let pkg = null;
    let bun = null;
    let includedAddOns = [];

    if (contextType === 'service' && serviceTypeId) {
      const s = services.find((x) => x.id === serviceTypeId) || null;
      if (s) {
        service = {
          id: s.id,
          name: s.name,
          code: s.code,
          description: s.description,
          base_price: s.base_price,
          base_price_unit: s.base_price_unit,
          default_duration_minutes: s.default_duration_minutes,
          allow_add_ons: s.allow_add_ons,
          is_multi_unit: s.is_multi_unit
        };
      }
    } else if (contextType === 'package' && packageId) {
      const p = packages.find((x) => x.id === packageId) || null;
      if (p) {
        pkg = {
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          base_price: p.base_price,
          tier: p.tier,
          includes_radon_testing: p.includes_radon_testing,
          includes_mold_testing: p.includes_mold_testing
        };
        if (Array.isArray(p.included_add_on_ids)) {
          includedAddOns = addOns.filter(
            (a) => p.included_add_on_ids.includes(a.id) && a.is_active
          );
        }
      }
    } else if (contextType === 'bundle' && bundleId) {
      const b = bundles.find((x) => x.id === bundleId) || null;
      if (b) {
        bun = {
          id: b.id,
          name: b.name,
          code: b.code,
          description: b.description,
          regular_price: b.regular_price,
          promotional_price: b.promotional_price,
          is_weekend_only: b.is_weekend_only
        };
        if (Array.isArray(b.included_add_on_ids)) {
          includedAddOns = addOns.filter(
            (a) => b.included_add_on_ids.includes(a.id) && a.is_active
          );
        }
      }
    }

    return {
      contextType,
      service,
      package: pkg,
      bundle: bun,
      includedAddOns
    };
  }

  // getSelectableAddOns
  getSelectableAddOns(contextType, serviceTypeId, packageId, bundleId) {
    const addOns = this._getFromStorage('inspection_add_ons').filter(
      (a) => a.is_active && a.can_be_selected_in_scheduler
    );

    let includedIds = [];
    const packages = this._getFromStorage('inspection_packages');
    const bundles = this._getFromStorage('bundles');

    if (contextType === 'package' && packageId) {
      const p = packages.find((x) => x.id === packageId);
      if (p && Array.isArray(p.included_add_on_ids)) {
        includedIds = p.included_add_on_ids;
      }
    } else if (contextType === 'bundle' && bundleId) {
      const b = bundles.find((x) => x.id === bundleId);
      if (b && Array.isArray(b.included_add_on_ids)) {
        includedIds = b.included_add_on_ids;
      }
    }

    return addOns.map((a) => ({
      id: a.id,
      name: a.name,
      code: a.code,
      description: a.description,
      price: a.price,
      isIncludedByDefault: includedIds.includes(a.id),
      isTestingService: a.is_testing_service,
      isReportDeliveryOption: a.is_report_delivery_option,
      isActive: a.is_active
    }));
  }

  // getAvailableAppointmentSlots
  getAvailableAppointmentSlots(
    contextType,
    serviceTypeId,
    packageId,
    bundleId,
    zipCode,
    date,
    startDate,
    endDate,
    withinNextDays,
    timeOfDay,
    isWeekendOnly,
    requiresSameDayReport,
    sortBy
  ) {
    const slotsAll = this._getFromStorage('appointment_slots');

    let slots = slotsAll.filter((s) => {
      if (!s.is_available) return false;
      if (s.service_context_type !== contextType) return false;
      if (s.zip_code !== zipCode) return false;
      if (contextType === 'service' && serviceTypeId && s.service_type_id !== serviceTypeId) {
        return false;
      }
      if (contextType === 'package' && packageId && s.package_id !== packageId) {
        return false;
      }
      if (contextType === 'bundle' && bundleId && s.bundle_id !== bundleId) {
        return false;
      }
      return true;
    });

    const now = new Date();

    if (date) {
      slots = slots.filter((s) => (s.date_time || '').slice(0, 10) === date);
    } else if (withinNextDays && typeof withinNextDays === 'number') {
      const endDt = new Date(now.getTime());
      endDt.setDate(endDt.getDate() + withinNextDays);
      slots = slots.filter((s) => {
        const dt = new Date(s.date_time);
        return dt >= now && dt <= endDt;
      });
    } else if (startDate && endDate) {
      const startDt = new Date(startDate + 'T00:00:00');
      const endDt = new Date(endDate + 'T23:59:59');
      slots = slots.filter((s) => {
        const dt = new Date(s.date_time);
        return dt >= startDt && dt <= endDt;
      });
    }

    if (timeOfDay && timeOfDay !== 'any') {
      slots = slots.filter((s) => s.time_of_day === timeOfDay);
    }

    if (isWeekendOnly) {
      slots = slots.filter((s) => s.is_weekend);
    }

    if (requiresSameDayReport) {
      slots = slots.filter((s) => s.same_day_report_available);
    }

    if (!sortBy || sortBy === 'soonest' || sortBy === 'date_time_asc') {
      slots.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    }

    // Foreign key resolution
    const services = this._getFromStorage('inspection_services');
    const packages = this._getFromStorage('inspection_packages');
    const bundles = this._getFromStorage('bundles');

    return slots.map((s) => {
      const service = s.service_type_id
        ? services.find((x) => x.id === s.service_type_id) || null
        : null;
      const pkg = s.package_id ? packages.find((x) => x.id === s.package_id) || null : null;
      const bun = s.bundle_id ? bundles.find((x) => x.id === s.bundle_id) || null : null;

      return Object.assign({}, s, {
        service_type: service,
        package: pkg,
        bundle: bun
      });
    });
  }

  // getInspectorOptionsForSlot
  getInspectorOptionsForSlot(appointmentSlotId, selectedAddOnIds, sortBy) {
    const slots = this._getFromStorage('appointment_slots');
    const slot = slots.find((s) => s.id === appointmentSlotId);
    if (!slot) return [];

    const inspectorOptions = this._getFromStorage('inspector_options').filter(
      (o) => o.appointment_slot_id === appointmentSlotId
    );
    const inspectors = this._getFromStorage('inspectors');
    const addOns = this._getFromStorage('inspection_add_ons');

    selectedAddOnIds = Array.isArray(selectedAddOnIds) ? selectedAddOnIds : [];
    let addOnsSubtotal = 0;

    selectedAddOnIds.forEach((id) => {
      const ao = addOns.find((a) => a.id === id);
      if (ao && ao.is_active) {
        addOnsSubtotal += ao.price || 0;
      }
    });

    const travelFee = slot.travel_fee || 0;

    let options = inspectorOptions.map((opt) => {
      const inspector = inspectors.find((i) => i.id === opt.inspector_id) || null;
      const basePrice = opt.base_price || 0;
      const totalPrice = basePrice + travelFee + addOnsSubtotal;

      return {
        inspectorId: opt.inspector_id,
        inspectorName: inspector ? inspector.name : null,
        rating: inspector ? inspector.rating : null,
        reviewCount: inspector ? inspector.review_count : null,
        basePrice,
        travelFee,
        addOnsSubtotal,
        totalPrice,
        inspector: inspector
      };
    });

    if (sortBy === 'rating_desc') {
      options.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'total_price_with_add_ons_asc') {
      options.sort((a, b) => a.totalPrice - b.totalPrice);
    }

    return options;
  }

  // previewInspectionBookingPricing
  previewInspectionBookingPricing(
    contextType,
    serviceTypeId,
    packageId,
    bundleId,
    appointmentSlotId,
    inspectorId,
    selectedAddOnIds
  ) {
    const appointmentSlots = this._getFromStorage('appointment_slots');
    const services = this._getFromStorage('inspection_services');
    const packages = this._getFromStorage('inspection_packages');
    const bundles = this._getFromStorage('bundles');

    const price = this._calculateBookingPrice(
      contextType,
      serviceTypeId,
      packageId,
      bundleId,
      appointmentSlotId,
      inspectorId,
      selectedAddOnIds,
      null
    );

    const slot = appointmentSlots.find((s) => s.id === appointmentSlotId) || null;
    const service = serviceTypeId
      ? services.find((s) => s.id === serviceTypeId) || null
      : null;
    const pkg = packageId ? packages.find((p) => p.id === packageId) || null : null;
    const bun = bundleId ? bundles.find((b) => b.id === bundleId) || null : null;

    const summary = {
      contextType,
      serviceName: service ? service.name : null,
      packageName: pkg ? pkg.name : null,
      bundleName: bun ? bun.name : null,
      appointmentDateTime: slot ? slot.date_time : null,
      timeOfDay: slot ? slot.time_of_day : null,
      zipCode: slot ? slot.zip_code : null
    };

    return {
      priceBreakdown: price,
      summary
    };
  }

  // applyPromotionToBookingPreview
  applyPromotionToBookingPreview(
    contextType,
    serviceTypeId,
    packageId,
    bundleId,
    appointmentSlotId,
    inspectorId,
    selectedAddOnIds,
    promoCode
  ) {
    const tempPrice = this._calculateBookingPrice(
      contextType,
      serviceTypeId,
      packageId,
      bundleId,
      appointmentSlotId,
      inspectorId,
      selectedAddOnIds,
      null
    );

    const basePriceForValidation = tempPrice.basePrice;

    const validation = this._validatePromotionCode(
      promoCode,
      contextType,
      basePriceForValidation,
      { bundleId }
    );

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message || 'Invalid promo code.',
        promotion: null,
        priceBreakdown: tempPrice
      };
    }

    const promotion = validation.promotion;
    const price = this._calculateBookingPrice(
      contextType,
      serviceTypeId,
      packageId,
      bundleId,
      appointmentSlotId,
      inspectorId,
      selectedAddOnIds,
      promotion
    );

    return {
      success: true,
      message: '',
      promotion: {
        id: promotion.id,
        code: promotion.code,
        description: promotion.description,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value
      },
      priceBreakdown: price
    };
  }

  // createInspectionBooking
  createInspectionBooking(
    contextType,
    serviceTypeId,
    packageId,
    bundleId,
    appointmentSlotId,
    inspectorId,
    selectedAddOnIds,
    promoCode,
    propertyType,
    bedrooms,
    bathrooms,
    squareFootage,
    units,
    yearBuilt,
    zipCode,
    streetAddress,
    city,
    contactName,
    contactPhone,
    contactEmail,
    preferredContactMethod,
    additionalNotes
  ) {
    const appointmentSlots = this._getFromStorage('appointment_slots');
    const slotIndex = appointmentSlots.findIndex((s) => s.id === appointmentSlotId);

    if (slotIndex === -1) {
      return {
        success: false,
        message: 'Selected appointment slot not found.',
        bookingId: null,
        status: null,
        summary: null
      };
    }

    const slot = appointmentSlots[slotIndex];
    if (!slot.is_available) {
      return {
        success: false,
        message: 'Selected appointment slot is no longer available.',
        bookingId: null,
        status: null,
        summary: null
      };
    }

    selectedAddOnIds = Array.isArray(selectedAddOnIds) ? selectedAddOnIds : [];

    const services = this._getFromStorage('inspection_services');
    const packages = this._getFromStorage('inspection_packages');
    const bundles = this._getFromStorage('bundles');

    let promotion = null;
    let discountCode = null;

    if (promoCode) {
      const tmpPrice = this._calculateBookingPrice(
        contextType,
        serviceTypeId,
        packageId,
        bundleId,
        appointmentSlotId,
        inspectorId,
        selectedAddOnIds,
        null
      );
      const basePriceForValidation = tmpPrice.basePrice;
      const validation = this._validatePromotionCode(
        promoCode,
        contextType,
        basePriceForValidation,
        { bundleId }
      );
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message || 'Invalid promo code.',
          bookingId: null,
          status: null,
          summary: null
        };
      }
      promotion = validation.promotion;
      discountCode = promotion.code;
    }

    const price = this._calculateBookingPrice(
      contextType,
      serviceTypeId,
      packageId,
      bundleId,
      appointmentSlotId,
      inspectorId,
      selectedAddOnIds,
      promotion
    );

    const addOns = this._getFromStorage('inspection_add_ons');
    let sameDayIncluded = false;

    if (selectedAddOnIds && selectedAddOnIds.length) {
      selectedAddOnIds.forEach((id) => {
        const ao = addOns.find((a) => a.id === id);
        if (ao && ao.is_report_delivery_option) {
          sameDayIncluded = true;
        }
      });
    }

    if (!sameDayIncluded) {
      if (contextType === 'package' && packageId) {
        const pkg = packages.find((p) => p.id === packageId);
        if (pkg && Array.isArray(pkg.included_add_on_ids)) {
          pkg.included_add_on_ids.forEach((id) => {
            const ao = addOns.find((a) => a.id === id);
            if (ao && ao.is_report_delivery_option) {
              sameDayIncluded = true;
            }
          });
        }
      } else if (contextType === 'bundle' && bundleId) {
        const bun = bundles.find((b) => b.id === bundleId);
        if (bun && Array.isArray(bun.included_add_on_ids)) {
          bun.included_add_on_ids.forEach((id) => {
            const ao = addOns.find((a) => a.id === id);
            if (ao && ao.is_report_delivery_option) {
              sameDayIncluded = true;
            }
          });
        }
      }
    }

    const nowIso = new Date().toISOString();
    const bookings = this._getFromStorage('inspection_bookings');
    const bookingId = this._generateId('booking');

    let promotionId = null;
    if (promotion) {
      promotionId = promotion.id;
    }

    const booking = {
      id: bookingId,
      context_type: contextType,
      service_type_id: contextType === 'service' ? serviceTypeId || null : null,
      package_id: contextType === 'package' ? packageId || null : null,
      bundle_id: contextType === 'bundle' ? bundleId || null : null,
      appointment_slot_id: appointmentSlotId,
      inspector_id: inspectorId || null,
      property_type: propertyType,
      bedrooms: bedrooms != null ? bedrooms : null,
      bathrooms: bathrooms != null ? bathrooms : null,
      square_footage: squareFootage != null ? squareFootage : null,
      units: units != null ? units : null,
      year_built: yearBuilt != null ? yearBuilt : null,
      zip_code: zipCode,
      street_address: streetAddress || null,
      city: city || null,
      date_time: slot.date_time,
      time_of_day: slot.time_of_day,
      add_on_ids: selectedAddOnIds,
      base_price: price.basePrice,
      add_ons_subtotal: price.addOnsSubtotal,
      travel_fee: price.travelFee,
      promotion_id: promotionId,
      discount_code: discountCode,
      discount_amount: price.discountAmount,
      total_price: price.totalPrice,
      same_day_report_included: sameDayIncluded,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      preferred_contact_method: preferredContactMethod,
      additional_notes: additionalNotes || null,
      status: 'pending',
      created_at: nowIso
    };

    bookings.push(booking);
    this._saveToStorage('inspection_bookings', bookings);

    // Mark the slot as unavailable
    appointmentSlots[slotIndex] = Object.assign({}, slot, { is_available: false });
    this._saveToStorage('appointment_slots', appointmentSlots);

    const service = booking.service_type_id
      ? services.find((s) => s.id === booking.service_type_id) || null
      : null;
    const pkg = booking.package_id
      ? packages.find((p) => p.id === booking.package_id) || null
      : null;
    const bun = booking.bundle_id
      ? bundles.find((b) => b.id === booking.bundle_id) || null
      : null;

    const summary = {
      contextType: booking.context_type,
      serviceName: service ? service.name : null,
      packageName: pkg ? pkg.name : null,
      bundleName: bun ? bun.name : null,
      appointmentDateTime: booking.date_time,
      timeOfDay: booking.time_of_day,
      propertySummary: {
        propertyType: booking.property_type,
        bedrooms: booking.bedrooms,
        bathrooms: booking.bathrooms,
        squareFootage: booking.square_footage,
        units: booking.units,
        zipCode: booking.zip_code,
        city: booking.city
      },
      priceBreakdown: {
        basePrice: booking.base_price,
        addOnsSubtotal: booking.add_ons_subtotal,
        travelFee: booking.travel_fee,
        discountAmount: booking.discount_amount,
        totalPrice: booking.total_price
      }
    };

    return {
      success: true,
      message: '',
      bookingId: booking.id,
      status: booking.status,
      summary
    };
  }

  // getBookingDetails
  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('inspection_bookings');
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return null;
    }

    const services = this._getFromStorage('inspection_services');
    const packages = this._getFromStorage('inspection_packages');
    const bundles = this._getFromStorage('bundles');
    const appointmentSlots = this._getFromStorage('appointment_slots');

    const slot = appointmentSlots.find((s) => s.id === booking.appointment_slot_id) || null;
    const service = booking.service_type_id
      ? services.find((s) => s.id === booking.service_type_id) || null
      : null;
    const pkg = booking.package_id
      ? packages.find((p) => p.id === booking.package_id) || null
      : null;
    const bun = booking.bundle_id
      ? bundles.find((b) => b.id === booking.bundle_id) || null
      : null;

    return {
      bookingId: booking.id,
      contextType: booking.context_type,
      serviceName: service ? service.name : null,
      packageName: pkg ? pkg.name : null,
      bundleName: bun ? bun.name : null,
      appointmentDateTime: booking.date_time,
      timeOfDay: booking.time_of_day,
      propertySummary: {
        propertyType: booking.property_type,
        bedrooms: booking.bedrooms,
        bathrooms: booking.bathrooms,
        squareFootage: booking.square_footage,
        units: booking.units,
        yearBuilt: booking.year_built,
        zipCode: booking.zip_code,
        streetAddress: booking.street_address,
        city: booking.city
      },
      contact: {
        name: booking.contact_name,
        phone: booking.contact_phone,
        email: booking.contact_email,
        preferredContactMethod: booking.preferred_contact_method
      },
      priceBreakdown: {
        basePrice: booking.base_price,
        addOnsSubtotal: booking.add_ons_subtotal,
        travelFee: booking.travel_fee,
        discountAmount: booking.discount_amount,
        totalPrice: booking.total_price
      },
      status: booking.status
    };
  }

  // createQuoteRequest
  createQuoteRequest(
    propertyType,
    bedrooms,
    bathrooms,
    squareFootage,
    zipCode,
    yearBuilt,
    additionalAddOnIds
  ) {
    const nowIso = new Date().toISOString();
    additionalAddOnIds = Array.isArray(additionalAddOnIds) ? additionalAddOnIds : [];

    const quoteRequests = this._getFromStorage('quote_requests');
    const id = this._generateId('quotereq');

    const qr = {
      id,
      property_type: propertyType,
      bedrooms: bedrooms != null ? bedrooms : null,
      bathrooms: bathrooms != null ? bathrooms : null,
      square_footage: squareFootage != null ? squareFootage : null,
      zip_code: zipCode,
      year_built: yearBuilt != null ? yearBuilt : null,
      additional_add_on_ids: additionalAddOnIds,
      created_at: nowIso
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    const quotePackages = this._getFromStorage('quote_packages').filter((qp) => qp.is_active);
    const addOns = this._getFromStorage('inspection_add_ons');

    const availablePackages = quotePackages.map((qp) => {
      const includedAddOnNames = Array.isArray(qp.included_add_on_ids)
        ? qp.included_add_on_ids
            .map((id) => {
              const ao = addOns.find((a) => a.id === id);
              return ao ? ao.name : null;
            })
            .filter(Boolean)
        : [];

      const pkgSummary = {
        quotePackageId: qp.id,
        name: qp.name,
        code: qp.code,
        tier: qp.tier,
        includesSameDayPdfReport: qp.includes_same_day_pdf_report,
        estimatedPriceMin: qp.base_price_min,
        estimatedPriceMax: qp.base_price_max,
        includedAddOnNames
      };

      // Foreign key resolution for quotePackageId
      return Object.assign({}, pkgSummary, {
        quotePackage: qp
      });
    });

    return {
      quoteRequestId: qr.id,
      propertySummary: {
        propertyType: qr.property_type,
        bedrooms: qr.bedrooms,
        bathrooms: qr.bathrooms,
        squareFootage: qr.square_footage,
        zipCode: qr.zip_code,
        yearBuilt: qr.year_built
      },
      availablePackages
    };
  }

  // getQuotePackagesForRequest
  getQuotePackagesForRequest(quoteRequestId) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const qr = quoteRequests.find((x) => x.id === quoteRequestId);
    if (!qr) {
      return [];
    }

    const quotePackages = this._getFromStorage('quote_packages').filter((qp) => qp.is_active);
    const addOns = this._getFromStorage('inspection_add_ons');

    const results = quotePackages.map((qp) => {
      const includedAddOnNames = Array.isArray(qp.included_add_on_ids)
        ? qp.included_add_on_ids
            .map((id) => {
              const ao = addOns.find((a) => a.id === id);
              return ao ? ao.name : null;
            })
            .filter(Boolean)
        : [];

      const item = {
        quotePackageId: qp.id,
        name: qp.name,
        code: qp.code,
        tier: qp.tier,
        includesSameDayPdfReport: qp.includes_same_day_pdf_report,
        estimatedPriceMin: qp.base_price_min,
        estimatedPriceMax: qp.base_price_max,
        includedAddOnNames
      };

      // Foreign key resolution for quotePackageId
      return Object.assign({}, item, {
        quotePackage: qp
      });
    });

    return results;
  }

  // createQuoteFromPackage
  createQuoteFromPackage(quoteRequestId, quotePackageId) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const qr = quoteRequests.find((q) => q.id === quoteRequestId);
    if (!qr) {
      return {
        success: false,
        message: 'Quote request not found.',
        quoteId: null,
        quoteSummary: null
      };
    }

    const quotePackages = this._getFromStorage('quote_packages');
    const qp = quotePackages.find((q) => q.id === quotePackageId);
    if (!qp || !qp.is_active) {
      return {
        success: false,
        message: 'Quote package not found or inactive.',
        quoteId: null,
        quoteSummary: null
      };
    }

    const addOns = this._getFromStorage('inspection_add_ons');

    let basePrice = qp.base_price_min;
    if (basePrice == null) {
      basePrice = qp.base_price_max || 0;
    }

    let addOnsSubtotal = 0;

    if (Array.isArray(qp.included_add_on_ids)) {
      qp.included_add_on_ids.forEach((id) => {
        const ao = addOns.find((a) => a.id === id);
        if (ao && ao.is_active) {
          addOnsSubtotal += ao.price || 0;
        }
      });
    }

    if (Array.isArray(qr.additional_add_on_ids)) {
      qr.additional_add_on_ids.forEach((id) => {
        const ao = addOns.find((a) => a.id === id);
        if (ao && ao.is_active) {
          addOnsSubtotal += ao.price || 0;
        }
      });
    }

    const travelFee = 0;
    const discountAmount = 0;
    const totalPrice = basePrice + addOnsSubtotal + travelFee;

    const quotes = this._getFromStorage('quotes');
    const id = this._generateId('quote');

    const quote = {
      id,
      quote_request_id: quoteRequestId,
      quote_package_id: quotePackageId,
      base_price: basePrice,
      add_ons_subtotal: addOnsSubtotal,
      travel_fee: travelFee,
      promotion_id: null,
      discount_code: null,
      discount_amount: discountAmount,
      total_price: totalPrice,
      created_at: new Date().toISOString()
    };

    quotes.push(quote);
    this._saveToStorage('quotes', quotes);

    const includedAddOnNames = Array.isArray(qp.included_add_on_ids)
      ? qp.included_add_on_ids
          .map((id2) => {
            const ao = addOns.find((a) => a.id === id2);
            return ao ? ao.name : null;
          })
          .filter(Boolean)
      : [];

    const quoteSummary = {
      packageName: qp.name,
      tier: qp.tier,
      includesSameDayPdfReport: qp.includes_same_day_pdf_report,
      includedAddOnNames,
      priceBreakdown: {
        basePrice: quote.base_price,
        addOnsSubtotal: quote.add_ons_subtotal,
        travelFee: quote.travel_fee,
        discountAmount: quote.discount_amount,
        totalPrice: quote.total_price
      }
    };

    return {
      success: true,
      message: '',
      quoteId: quote.id,
      quoteSummary
    };
  }

  // getQuoteSummary
  getQuoteSummary(quoteId) {
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return null;

    const quoteRequests = this._getFromStorage('quote_requests');
    const qr = quoteRequests.find((r) => r.id === quote.quote_request_id) || null;
    const quotePackages = this._getFromStorage('quote_packages');
    const qp = quotePackages.find((p) => p.id === quote.quote_package_id) || null;
    const addOns = this._getFromStorage('inspection_add_ons');

    const includedAddOnNames = qp && Array.isArray(qp.included_add_on_ids)
      ? qp.included_add_on_ids
          .map((id2) => {
            const ao = addOns.find((a) => a.id === id2);
            return ao ? ao.name : null;
          })
          .filter(Boolean)
      : [];

    return {
      quoteId: quote.id,
      propertySummary: qr
        ? {
            propertyType: qr.property_type,
            bedrooms: qr.bedrooms,
            bathrooms: qr.bathrooms,
            squareFootage: qr.square_footage,
            zipCode: qr.zip_code,
            yearBuilt: qr.year_built
          }
        : null,
      packageSummary: qp
        ? {
            name: qp.name,
            tier: qp.tier,
            includesSameDayPdfReport: qp.includes_same_day_pdf_report,
            includedAddOnNames
          }
        : null,
      priceBreakdown: {
        basePrice: quote.base_price,
        addOnsSubtotal: quote.add_ons_subtotal,
        travelFee: quote.travel_fee,
        discountAmount: quote.discount_amount || 0,
        totalPrice: quote.total_price
      },
      discountCode: quote.discount_code || null
    };
  }

  // applyPromotionToQuote
  applyPromotionToQuote(quoteId, promoCode) {
    const quotes = this._getFromStorage('quotes');
    const idx = quotes.findIndex((q) => q.id === quoteId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Quote not found.',
        promotion: null,
        quoteSummary: null
      };
    }

    const quote = quotes[idx];
    const basePriceForValidation = quote.base_price;

    // Treat quote as package context for promotions
    const validation = this._validatePromotionCode(promoCode, 'package', basePriceForValidation, {});

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message || 'Invalid promo code.',
        promotion: null,
        quoteSummary: {
          priceBreakdown: {
            basePrice: quote.base_price,
            addOnsSubtotal: quote.add_ons_subtotal,
            travelFee: quote.travel_fee,
            discountAmount: quote.discount_amount || 0,
            totalPrice: quote.total_price
          },
          discountCode: quote.discount_code || null
        }
      };
    }

    const promotion = validation.promotion;
    const preDiscountTotal = quote.base_price + quote.add_ons_subtotal + (quote.travel_fee || 0);
    let discountAmount = 0;

    if (promotion.discount_type === 'amount') {
      discountAmount = promotion.discount_value || 0;
    } else if (promotion.discount_type === 'percentage') {
      discountAmount = preDiscountTotal * ((promotion.discount_value || 0) / 100);
    }

    if (discountAmount > preDiscountTotal) {
      discountAmount = preDiscountTotal;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const newTotal = Math.round((preDiscountTotal - discountAmount) * 100) / 100;

    quote.promotion_id = promotion.id;
    quote.discount_code = promotion.code;
    quote.discount_amount = discountAmount;
    quote.total_price = newTotal;

    quotes[idx] = quote;
    this._saveToStorage('quotes', quotes);

    return {
      success: true,
      message: '',
      promotion: {
        id: promotion.id,
        code: promotion.code,
        description: promotion.description,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value
      },
      quoteSummary: {
        priceBreakdown: {
          basePrice: quote.base_price,
          addOnsSubtotal: quote.add_ons_subtotal,
          travelFee: quote.travel_fee,
          discountAmount: quote.discount_amount,
          totalPrice: quote.total_price
        },
        discountCode: quote.discount_code
      }
    };
  }

  // sendQuoteByEmail (simulation only)
  sendQuoteByEmail(quoteId, recipientEmail) {
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return {
        success: false,
        message: 'Quote not found.'
      };
    }

    if (!recipientEmail) {
      return {
        success: false,
        message: 'Recipient email is required.'
      };
    }

    // In real implementation, integrate with email service; here we just simulate success
    return {
      success: true,
      message: 'Quote email has been queued.'
    };
  }

  // getInspectionPackagesForComparison
  getInspectionPackagesForComparison() {
    const packages = this._getFromStorage('inspection_packages').filter((p) => p.is_active);
    const services = this._getFromStorage('inspection_services');
    const addOns = this._getFromStorage('inspection_add_ons');

    return packages.map((p) => {
      const includedServices = Array.isArray(p.includes_service_type_ids)
        ? services.filter((s) => p.includes_service_type_ids.includes(s.id))
        : [];

      const includedAddOns = Array.isArray(p.included_add_on_ids)
        ? addOns.filter((a) => p.included_add_on_ids.includes(a.id))
        : [];

      return {
        package: {
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          base_price: p.base_price,
          tier: p.tier,
          includes_radon_testing: p.includes_radon_testing,
          includes_mold_testing: p.includes_mold_testing,
          is_active: p.is_active
        },
        includedServices,
        includedAddOns
      };
    });
  }

  // getActiveBundlesWithDetails
  getActiveBundlesWithDetails() {
    const bundles = this._getFromStorage('bundles').filter((b) => b.is_active);
    const services = this._getFromStorage('inspection_services');
    const addOns = this._getFromStorage('inspection_add_ons');

    return bundles.map((b) => {
      const includedServices = Array.isArray(b.included_service_type_ids)
        ? services.filter((s) => b.included_service_type_ids.includes(s.id))
        : [];

      const includedAddOns = Array.isArray(b.included_add_on_ids)
        ? addOns.filter((a) => b.included_add_on_ids.includes(a.id))
        : [];

      const eligiblePromoCodes = Array.isArray(b.eligible_promo_codes)
        ? b.eligible_promo_codes
        : [];

      return {
        bundle: {
          id: b.id,
          name: b.name,
          code: b.code,
          description: b.description,
          regular_price: b.regular_price,
          promotional_price: b.promotional_price,
          is_weekend_only: b.is_weekend_only,
          is_active: b.is_active
        },
        includedServices,
        includedAddOns,
        eligiblePromoCodes
      };
    });
  }

  // getApplicablePromotions
  getApplicablePromotions(appliesToContext) {
    const promotions = this._getFromStorage('promotions');
    const now = new Date();

    const list = promotions.filter((p) => {
      if (!p.is_active) return false;
      if (!(p.applies_to_context === 'all' || p.applies_to_context === appliesToContext)) {
        return false;
      }
      if (p.valid_from) {
        const from = new Date(p.valid_from);
        if (now < from) return false;
      }
      if (p.valid_until) {
        const until = new Date(p.valid_until);
        if (now > until) return false;
      }
      return true;
    });

    return list;
  }

  // getGiftCertificateOptions
  getGiftCertificateOptions() {
    return this._getFromStorage('gift_certificate_options').filter((o) => o.is_active);
  }

  // addGiftCertificateToCart
  addGiftCertificateToCart(
    optionId,
    amount,
    deliveryMethod,
    recipientName,
    recipientEmail,
    senderName,
    senderEmail,
    message
  ) {
    if (typeof amount !== 'number' || amount <= 0) {
      return {
        success: false,
        message: 'Amount must be a positive number.',
        cartId: null,
        cartTotal: 0
      };
    }

    const cart = this._getOrCreateCart();
    const giftCertificates = this._getFromStorage('gift_certificates');

    const id = this._generateId('giftcert');
    const nowIso = new Date().toISOString();

    const giftCertificate = {
      id,
      option_id: optionId || null,
      amount,
      delivery_method: deliveryMethod,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      sender_name: senderName,
      sender_email: senderEmail,
      message: message || null,
      code: this._generateId('GC'),
      status: 'pending',
      order_id: null,
      created_at: nowIso,
      sent_at: null
    };

    giftCertificates.push(giftCertificate);
    this._saveToStorage('gift_certificates', giftCertificates);

    const cartItems = this._getFromStorage('cart_items');
    const cartItemId = this._generateId('cartitem');

    const description =
      '$' + amount + ' ' +
      (deliveryMethod === 'email_digital'
        ? 'digital home inspection gift certificate'
        : 'home inspection gift certificate');

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'gift_certificate',
      gift_certificate_id: giftCertificate.id,
      booking_id: null,
      description,
      quantity: 1,
      unit_price: amount,
      total_price: amount,
      created_at: nowIso
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      const updatedCart = Object.assign({}, cart);
      updatedCart.items = Array.isArray(updatedCart.items) ? updatedCart.items.slice() : [];
      updatedCart.items.push(cartItem.id);
      carts[cartIndex] = updatedCart;
      this._saveToStorage('cart', carts);
      this._recalculateCartTotals(updatedCart.id);
      const refreshedCart = this._getFromStorage('cart').find((c) => c.id === updatedCart.id);
      return {
        success: true,
        message: '',
        cartId: updatedCart.id,
        cartTotal: refreshedCart ? refreshedCart.total : updatedCart.total
      };
    }

    return {
      success: false,
      message: 'Cart not found when adding item.',
      cartId: null,
      cartTotal: 0
    };
  }

  // getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const giftCertificates = this._getFromStorage('gift_certificates');
    const bookings = this._getFromStorage('inspection_bookings');

    const itemIds = Array.isArray(cart.items) ? cart.items : [];

    const items = itemIds
      .map((id) => {
        const ci = cartItems.find((c) => c.id === id);
        if (!ci) return null;

        const base = {
          cartItemId: ci.id,
          itemType: ci.item_type,
          description: ci.description,
          quantity: ci.quantity,
          unitPrice: ci.unit_price,
          totalPrice: ci.total_price
        };

        const extra = {};

        if (ci.gift_certificate_id) {
          const gc = giftCertificates.find((g) => g.id === ci.gift_certificate_id) || null;
          extra.gift_certificate = gc;
        }

        if (ci.booking_id) {
          const booking = bookings.find((b) => b.id === ci.booking_id) || null;
          extra.booking = booking;
        }

        return Object.assign({}, base, extra);
      })
      .filter(Boolean);

    return {
      cartId: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      taxTotal: cart.tax_total || 0,
      total: cart.total || 0
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity == null || isNaN(quantity)) {
      return {
        success: false,
        message: 'Quantity is required.'
      };
    }

    quantity = Number(quantity);

    if (quantity <= 0) {
      const removed = this._removeCartItemInternal(cartItemId);
      return {
        success: removed,
        message: removed ? 'Item removed from cart.' : 'Cart item not found.'
      };
    }

    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found.'
      };
    }

    const item = cartItems[idx];
    item.quantity = quantity;
    item.total_price = Math.round(item.unit_price * quantity * 100) / 100;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    this._recalculateCartTotals(item.cart_id);

    return {
      success: true,
      message: 'Cart item updated.'
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const removed = this._removeCartItemInternal(cartItemId);
    return {
      success: removed,
      message: removed ? 'Item removed from cart.' : 'Cart item not found.'
    };
  }

  // submitOrder
  submitOrder(
    billingName,
    billingAddress,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv
  ) {
    const cart = this._getOrCreateCart();
    const items = Array.isArray(cart.items) ? cart.items : [];

    if (!items.length) {
      return {
        success: false,
        message: 'Cart is empty.',
        orderId: null,
        status: null,
        totalAmount: 0,
        cardLast4: null
      };
    }

    if (!billingName || !billingAddress || !cardNumber || !cardExpirationMonth || !cardExpirationYear || !cardCvv) {
      return {
        success: false,
        message: 'Billing and card details are required.',
        orderId: null,
        status: null,
        totalAmount: 0,
        cardLast4: null
      };
    }

    const orders = this._getFromStorage('orders');
    const orderId = this._generateId('order');
    const cardLast4 = this._maskCardNumber(cardNumber);
    const nowIso = new Date().toISOString();

    const order = {
      id: orderId,
      cart_id: cart.id,
      total_amount: cart.total || 0,
      status: 'paid',
      promotion_id: null,
      created_at: nowIso,
      billing_name: billingName,
      billing_address: billingAddress,
      payment_method: 'credit_card',
      card_last4: cardLast4,
      transaction_reference: this._generateId('txn')
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    const cartItems = this._getFromStorage('cart_items');
    const giftCertificates = this._getFromStorage('gift_certificates');

    items.forEach((itemId) => {
      const ci = cartItems.find((ci2) => ci2.id === itemId);
      if (ci && ci.gift_certificate_id) {
        const gcIndex = giftCertificates.findIndex((g) => g.id === ci.gift_certificate_id);
        if (gcIndex !== -1) {
          const gc = giftCertificates[gcIndex];
          gc.status = 'active';
          gc.order_id = orderId;
          if (gc.delivery_method === 'email_digital') {
            gc.sent_at = nowIso;
          }
          giftCertificates[gcIndex] = gc;
        }
      }
    });

    this._saveToStorage('gift_certificates', giftCertificates);

    return {
      success: true,
      message: '',
      orderId: order.id,
      status: order.status,
      totalAmount: order.total_amount,
      cardLast4: order.card_last4
    };
  }

  // searchArticles
  searchArticles(query, sortBy, dateRange, page, pageSize) {
    let articles = this._getFromStorage('articles').filter((a) => a.is_active);

    query = (query || '').trim();
    if (query) {
      const qLower = query.toLowerCase();
      articles = articles.filter((a) => {
        const haystack = [a.title || '', a.excerpt || '', a.body || ''].join(' ').toLowerCase();
        const tagsStr = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return haystack.includes(qLower) || tagsStr.includes(qLower);
      });
    }

    const now = new Date();
    if (dateRange === 'past_12_months') {
      const cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      articles = articles.filter((a) => new Date(a.published_at) >= cutoff);
    } else if (dateRange === 'past_30_days') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      articles = articles.filter((a) => new Date(a.published_at) >= cutoff);
    }

    if (!sortBy) {
      sortBy = query ? 'relevance' : 'most_recent';
    }

    if (sortBy === 'most_recent') {
      articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    } else if (sortBy === 'oldest') {
      articles.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    } else if (sortBy === 'relevance') {
      // Simple relevance: most recent among filtered
      articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    page = page || 1;
    pageSize = pageSize || 10;
    const total = articles.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = articles.slice(start, end);

    return {
      results,
      total
    };
  }

  // getArticleDetailBySlug
  getArticleDetailBySlug(slug) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.slug === slug) || null;
    if (!article) {
      return {
        article: null,
        isFavorite: false
      };
    }

    const favorites = this._getFromStorage('favorite_articles');
    const isFavorite = favorites.some((f) => f.article_id === article.id);

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        url: article.url,
        excerpt: article.excerpt,
        body: article.body,
        published_at: article.published_at,
        tags: article.tags || [],
        is_first_time_homebuyer_checklist: article.is_first_time_homebuyer_checklist
      },
      isFavorite
    };
  }

  // saveArticleToFavorites
  saveArticleToFavorites(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        message: 'Article not found.',
        favoriteId: null,
        savedAt: null
      };
    }

    const favorites = this._getFromStorage('favorite_articles');
    const existing = favorites.find((f) => f.article_id === articleId);
    if (existing) {
      return {
        success: true,
        message: 'Already in favorites.',
        favoriteId: existing.id,
        savedAt: existing.saved_at
      };
    }

    const favoriteId = this._generateId('favart');
    const savedAt = new Date().toISOString();

    const fav = {
      id: favoriteId,
      article_id: articleId,
      saved_at: savedAt
    };

    favorites.push(fav);
    this._saveToStorage('favorite_articles', favorites);

    return {
      success: true,
      message: 'Saved to favorites.',
      favoriteId,
      savedAt
    };
  }

  // getFavoriteArticles
  getFavoriteArticles() {
    const favorites = this._getFromStorage('favorite_articles');
    const articles = this._getFromStorage('articles');

    return favorites.map((fav) => {
      const article = articles.find((a) => a.id === fav.article_id) || null;
      return {
        articleId: fav.article_id,
        title: article ? article.title : null,
        slug: article ? article.slug : null,
        excerpt: article ? article.excerpt : null,
        published_at: article ? article.published_at : null,
        is_first_time_homebuyer_checklist: article
          ? article.is_first_time_homebuyer_checklist
          : false,
        savedAt: fav.saved_at,
        article: article
      };
    });
  }

  // checkServiceAddress
  checkServiceAddress(inputStreet, inputZip) {
    const cities = this._getFromStorage('service_area_cities').filter((c) => c.is_active);
    let matchedCity = null;
    if (cities.length) {
      matchedCity =
        cities.find(
          (city) => Array.isArray(city.zip_codes) && city.zip_codes.includes(inputZip)
        ) || null;
    }

    let coverageStatus = 'not_covered';
    let message = 'This address is outside our standard service area.';

    if (matchedCity) {
      coverageStatus = 'covered';
      message = 'Great news! We service your area.';
    }

    let nearbyCitiesList = [];
    if (cities.length) {
      const sortedCities = cities.slice().sort((a, b) => {
        const ao = a.display_order != null ? a.display_order : 9999;
        const bo = b.display_order != null ? b.display_order : 9999;
        if (ao !== bo) return ao - bo;
        return (a.name || '').localeCompare(b.name || '');
      });

      if (matchedCity) {
        nearbyCitiesList = sortedCities.filter((c) => c.id !== matchedCity.id);
      } else {
        nearbyCitiesList = sortedCities;
      }
    }

    const nearbyCityIds = nearbyCitiesList.map((c) => c.id);

    const addressResults = this._getFromStorage('address_check_results');
    const id = this._generateId('addrchk');
    const nowIso = new Date().toISOString();

    const result = {
      id,
      input_street: inputStreet,
      input_zip: inputZip,
      checked_at: nowIso,
      coverage_status: coverageStatus,
      matched_city_id: matchedCity ? matchedCity.id : null,
      nearby_city_ids: nearbyCityIds,
      message
    };

    addressResults.push(result);
    this._saveToStorage('address_check_results', addressResults);

    const matchedCityOutput = matchedCity
      ? {
          id: matchedCity.id,
          name: matchedCity.name,
          state: matchedCity.state,
          slug: matchedCity.slug,
          coverageDescription: matchedCity.coverage_description
        }
      : null;

    const nearbyCitiesOutput = nearbyCitiesList.map((c) => ({
      id: c.id,
      name: c.name,
      state: c.state,
      slug: c.slug
    }));

    return {
      coverageStatus,
      message,
      matchedCity: matchedCityOutput,
      nearbyCities: nearbyCitiesOutput
    };
  }

  // getServiceAreaCityDetails
  getServiceAreaCityDetails(cityId) {
    const cities = this._getFromStorage('service_area_cities').filter((c) => c.is_active);
    const city = cities.find((c) => c.id === cityId) || null;
    if (!city) {
      return null;
    }

    const nearbyCities = cities
      .filter((c) => c.id !== city.id)
      .sort((a, b) => {
        const ao = a.display_order != null ? a.display_order : 9999;
        const bo = b.display_order != null ? b.display_order : 9999;
        if (ao !== bo) return ao - bo;
        return (a.name || '').localeCompare(b.name || '');
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        state: c.state,
        slug: c.slug
      }));

    return {
      city: {
        id: city.id,
        name: city.name,
        state: city.state,
        slug: city.slug,
        coverageDescription: city.coverage_description,
        zipCodes: city.zip_codes || []
      },
      nearbyCities
    };
  }

  // submitServiceAreaContactRequest
  submitServiceAreaContactRequest(
    cityId,
    name,
    phone,
    email,
    message,
    preferredContactMethod
  ) {
    const cities = this._getFromStorage('service_area_cities');
    const city = cities.find((c) => c.id === cityId);
    if (!city) {
      return {
        success: false,
        message: 'Service area city not found.',
        requestId: null
      };
    }

    const requests = this._getFromStorage('service_area_contact_requests');
    const id = this._generateId('sacontact');
    const nowIso = new Date().toISOString();

    const req = {
      id,
      city_id: cityId,
      name,
      phone,
      email,
      message,
      preferred_contact_method: preferredContactMethod,
      created_at: nowIso,
      status: 'new'
    };

    requests.push(req);
    this._saveToStorage('service_area_contact_requests', requests);

    return {
      success: true,
      message: 'Request submitted.',
      requestId: id
    };
  }

  // submitGeneralContactRequest
  submitGeneralContactRequest(name, phone, email, message, preferredContactMethod) {
    const requests = this._getFromStorage('general_contact_requests');
    const id = this._generateId('gencontact');
    const nowIso = new Date().toISOString();

    const req = {
      id,
      name,
      phone,
      email,
      message,
      preferred_contact_method: preferredContactMethod,
      created_at: nowIso
    };

    requests.push(req);
    this._saveToStorage('general_contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted.'
    };
  }

  // getInspectorProfiles
  getInspectorProfiles() {
    return this._getFromStorage('inspectors');
  }

  // getFaqEntries
  getFaqEntries() {
    return this._getFromStorage('faq_entries');
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
