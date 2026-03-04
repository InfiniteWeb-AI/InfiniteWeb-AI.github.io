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

  // ---------------------- STORAGE HELPERS ----------------------

  _initStorage() {
    const tableKeys = [
      'services',
      'property_sizes',
      'addons',
      'cleaners',
      'cleaner_service_offerings',
      'plan_templates',
      'plan_enrollments',
      'bookings',
      'promocodes',
      'instant_quotes',
      'quote_requests',
      'support_requests',
      'account_profiles',
      'addresses',
      'payment_methods',
      'faq_entries',
      'policy_documents'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    const metaKeys = [
      'idCounter',
      'current_booking_id',
      'current_instant_quote_id',
      'current_plan_enrollment_id',
      'current_account_profile_id',
      'last_confirmed_booking_id',
      'last_quote_request_id',
      'last_support_request_id',
      'last_plan_enrollment_id'
    ];

    metaKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        if (key === 'idCounter') {
          localStorage.setItem(key, '1000');
        } else {
          localStorage.setItem(key, '');
        }
      }
    });
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  _nowISO() {
    return new Date().toISOString();
  }

  _isWeekendDate(dateStr) {
    if (!dateStr) return false;
    let d;
    // If we get a plain date string like 'YYYY-MM-DD', construct it in local time
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      d = new Date(year, month, dayNum);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return false;
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday=0, Saturday=6
  }

  // ---------------------- FOREIGN KEY RESOLUTION HELPERS ----------------------

  _resolveBookingFKs(booking) {
    if (!booking) return null;
    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);
    const cleaners = this._getFromStorage('cleaners', []);
    const promoCodes = this._getFromStorage('promocodes', []);
    const addresses = this._getFromStorage('addresses', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);

    const copy = { ...booking };
    copy.service = services.find((s) => s.id === booking.service_id) || null;
    copy.propertySize = propertySizes.find((p) => p.id === booking.property_size_id) || null;
    copy.cleaner = cleaners.find((c) => c.id === booking.cleaner_id) || null;
    copy.promoCode = promoCodes.find((p) => p.id === booking.promo_code_id) || null;
    copy.serviceAddress = addresses.find((a) => a.id === booking.service_address_id) || null;
    copy.paymentMethod = paymentMethods.find((pm) => pm.id === booking.payment_method_id) || null;
    return copy;
  }

  _resolvePlanEnrollmentFKs(planEnrollment) {
    if (!planEnrollment) return null;
    const planTemplates = this._getFromStorage('plan_templates', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const template = planTemplates.find((p) => p.id === planEnrollment.plan_template_id) || null;

    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);

    let service = null;
    let propertySize = null;
    if (template) {
      service = services.find((s) => s.id === template.service_id) || null;
      propertySize = propertySizes.find((p) => p.id === template.property_size_id) || null;
    }

    return {
      ...planEnrollment,
      planTemplate: template,
      service,
      propertySize,
      paymentMethod: paymentMethods.find((pm) => pm.id === planEnrollment.payment_method_id) || null
    };
  }

  _resolveInstantQuoteFKs(instantQuote) {
    if (!instantQuote) return null;
    const services = this._getFromStorage('services', []);
    const addOns = this._getFromStorage('addons', []);
    const service = services.find((s) => s.id === instantQuote.service_id) || null;
    const selectedAddOns = (instantQuote.selected_addon_ids || []).map(
      (id) => addOns.find((a) => a.id === id) || null
    ).filter(Boolean);

    return {
      ...instantQuote,
      service,
      selectedAddOns
    };
  }

  _resolveRecurringPlanTemplateFKs(template) {
    if (!template) return null;
    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);
    return {
      ...template,
      service: services.find((s) => s.id === template.service_id) || null,
      propertySize: propertySizes.find((p) => p.id === template.property_size_id) || null
    };
  }

  // ---------------------- BOOKING INTERNAL HELPERS ----------------------

  _getOrCreateCurrentBookingDraft() {
    const bookings = this._getFromStorage('bookings', []);
    const currentId = localStorage.getItem('current_booking_id');
    if (currentId) {
      const existing = bookings.find((b) => b.id === currentId);
      if (existing) {
        return existing;
      }
    }
    // Create a minimal new draft booking with default values
    const now = this._nowISO();
    const booking = {
      id: this._generateId('booking'),
      service_id: null,
      service_type: 'standard_cleaning',
      property_size_id: null,
      property_type: null,
      bedrooms: null,
      bathrooms: null,
      square_footage: null,
      service_address_id: null,
      service_street: '',
      service_city: '',
      service_state: '',
      zip_code: '',
      date: now,
      arrival_window: '9_11_am',
      is_weekend: this._isWeekendDate(now),
      cleaner_id: null,
      is_pet_friendly_required: false,
      use_eco_friendly_products: false,
      extras: [],
      notes: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      promo_code_id: null,
      payment_method_id: null,
      price_base: 0,
      price_extras: 0,
      price_discount: 0,
      price_total: 0,
      currency: 'USD',
      status: 'draft',
      origin_page: 'booking_form',
      created_at: now,
      updated_at: now,
      frequency: 'one_time' // custom field used by pricing
    };
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', booking.id);
    return booking;
  }

  _saveBooking(updatedBooking) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === updatedBooking.id);
    if (idx >= 0) {
      bookings[idx] = updatedBooking;
    } else {
      bookings.push(updatedBooking);
    }
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', updatedBooking.id);
  }

  _calculatePriceForCurrentBooking() {
    let booking = this._getOrCreateCurrentBookingDraft();
    const services = this._getFromStorage('services', []);
    const addOns = this._getFromStorage('addons', []);

    const service = services.find((s) => s.id === booking.service_id) || null;
    let base = service && typeof service.base_price === 'number' ? service.base_price : 0;

    // Simple frequency modifiers (example business logic)
    const freq = booking.frequency || 'one_time';
    let multiplier = 1;
    if (freq === 'weekly') multiplier = 0.9;
    else if (freq === 'bi_weekly') multiplier = 1;
    else if (freq === 'monthly') multiplier = 1.1;
    base = base * multiplier;

    // Extras
    const extrasIds = booking.extras || [];
    let extrasTotal = 0;
    extrasIds.forEach((id) => {
      const addon = addOns.find((a) => a.id === id);
      if (addon && typeof addon.price === 'number') {
        extrasTotal += addon.price;
      }
    });

    // Promo / discount
    const promoCodes = this._getFromStorage('promocodes', []);
    let appliedPromo = promoCodes.find((p) => p.id === booking.promo_code_id) || null;
    const { discountAmount, validPromo } = this._validatePromoCodeForCurrentBooking(appliedPromo, booking, base, extrasTotal);
    if (!validPromo) {
      booking.promo_code_id = null;
    } else {
      booking.promo_code_id = validPromo.id;
    }

    const discount = discountAmount;
    let total = base + extrasTotal - discount;
    if (total < 0) total = 0;

    booking = {
      ...booking,
      price_base: base,
      price_extras: extrasTotal,
      price_discount: discount,
      price_total: total,
      currency: 'USD',
      updated_at: this._nowISO()
    };

    this._saveBooking(booking);

    return {
      booking,
      priceSummary: {
        priceBase: base,
        priceExtras: extrasTotal,
        priceDiscount: discount,
        priceTotal: total,
        currency: 'USD'
      }
    };
  }

  _validatePromoCodeForCurrentBooking(promo, booking, baseAmount, extrasAmount) {
    if (!promo || !promo.is_active) {
      return { discountAmount: 0, validPromo: null };
    }
    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return { discountAmount: 0, validPromo: null };
    }
    if (promo.valid_to && new Date(promo.valid_to) < now) {
      return { discountAmount: 0, validPromo: null };
    }

    // Check applicable service types
    if (promo.applicable_service_types && promo.applicable_service_types.length) {
      if (!promo.applicable_service_types.includes(booking.service_type)) {
        return { discountAmount: 0, validPromo: null };
      }
    }

    // Check applicable property sizes
    if (promo.applicable_property_size_ids && promo.applicable_property_size_ids.length) {
      if (!promo.applicable_property_size_ids.includes(booking.property_size_id)) {
        return { discountAmount: 0, validPromo: null };
      }
    }

    const subtotal = (baseAmount || 0) + (extrasAmount || 0);
    if (promo.min_order_total && subtotal < promo.min_order_total) {
      return { discountAmount: 0, validPromo: null };
    }

    let discount = 0;
    if (promo.discount_type === 'percent') {
      discount = (subtotal * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (promo.max_discount_amount && discount > promo.max_discount_amount) {
      discount = promo.max_discount_amount;
    }

    return { discountAmount: discount, validPromo: promo };
  }

  // ---------------------- INSTANT QUOTE HELPERS ----------------------

  _getOrCreateCurrentInstantQuote() {
    const quotes = this._getFromStorage('instant_quotes', []);
    const currentId = localStorage.getItem('current_instant_quote_id');
    if (currentId) {
      const existing = quotes.find((q) => q.id === currentId);
      if (existing) return existing;
    }
    const now = this._nowISO();
    const instantQuote = {
      id: this._generateId('quote'),
      service_id: null,
      service_type: 'move_out_deep_cleaning',
      square_footage: 0,
      property_type: 'home',
      selected_addon_ids: [],
      budget_limit: null,
      price_base: 0,
      price_addons: 0,
      price_total: 0,
      is_under_budget: true,
      status: 'draft',
      created_at: now
    };
    quotes.push(instantQuote);
    this._saveToStorage('instant_quotes', quotes);
    localStorage.setItem('current_instant_quote_id', instantQuote.id);
    return instantQuote;
  }

  _saveInstantQuote(updated) {
    const quotes = this._getFromStorage('instant_quotes', []);
    const idx = quotes.findIndex((q) => q.id === updated.id);
    if (idx >= 0) quotes[idx] = updated;
    else quotes.push(updated);
    this._saveToStorage('instant_quotes', quotes);
    localStorage.setItem('current_instant_quote_id', updated.id);
  }

  _calculateInstantQuotePrice(instantQuote) {
    const services = this._getFromStorage('services', []);
    const addOns = this._getFromStorage('addons', []);
    const service = services.find((s) => s.id === instantQuote.service_id) || null;

    let base = service && typeof service.base_price === 'number' ? service.base_price : 0;
    // Adjust base for square footage with gentle scaling so larger homes stay affordable
    const sf = instantQuote.square_footage || 0;
    if (sf > 1000) {
      const extraSf = sf - 1000;
      const scale = 1 + extraSf / 4000; // e.g. +25% at +1000 sq ft over baseline
      base = base * scale;
    }

    let addonsTotal = 0;
    (instantQuote.selected_addon_ids || []).forEach((id) => {
      const addon = addOns.find((a) => a.id === id);
      if (addon && typeof addon.price === 'number') {
        addonsTotal += addon.price;
      }
    });

    let total = base + addonsTotal;
    const budget = instantQuote.budget_limit;
    const underBudget = typeof budget === 'number' ? total <= budget : true;

    const updated = {
      ...instantQuote,
      price_base: base,
      price_addons: addonsTotal,
      price_total: total,
      is_under_budget: underBudget
    };
    this._saveInstantQuote(updated);
    return updated;
  }

  // ---------------------- PLAN ENROLLMENT HELPERS ----------------------

  _getOrCreateCurrentPlanEnrollmentDraft() {
    const enrollments = this._getFromStorage('plan_enrollments', []);
    const currentId = localStorage.getItem('current_plan_enrollment_id');
    if (currentId) {
      const existing = enrollments.find((p) => p.id === currentId);
      if (existing) return existing;
    }
    return null;
  }

  _savePlanEnrollment(enrollment) {
    const enrollments = this._getFromStorage('plan_enrollments', []);
    const idx = enrollments.findIndex((p) => p.id === enrollment.id);
    if (idx >= 0) enrollments[idx] = enrollment;
    else enrollments.push(enrollment);
    this._saveToStorage('plan_enrollments', enrollments);
    localStorage.setItem('current_plan_enrollment_id', enrollment.id);
  }

  // ---------------------- ACCOUNT & PAYMENT HELPERS ----------------------

  _getOrCreateAccountProfile() {
    const profiles = this._getFromStorage('account_profiles', []);
    const currentId = localStorage.getItem('current_account_profile_id');
    if (currentId) {
      const existing = profiles.find((p) => p.id === currentId);
      if (existing) return existing;
    }
    if (profiles.length > 0) {
      const profile = profiles[0];
      localStorage.setItem('current_account_profile_id', profile.id);
      return profile;
    }
    // No profile yet: create a minimal anonymous profile
    const now = this._nowISO();
    const profile = {
      id: this._generateId('acct'),
      full_name: 'Guest User',
      email: 'guest@example.com',
      password: '',
      phone: '',
      agreed_to_terms: false,
      favorite_service_ids: [],
      created_at: now,
      updated_at: now
    };
    profiles.push(profile);
    this._saveToStorage('account_profiles', profiles);
    localStorage.setItem('current_account_profile_id', profile.id);
    return profile;
  }

  _saveAccountProfile(profile) {
    const profiles = this._getFromStorage('account_profiles', []);
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) profiles[idx] = profile;
    else profiles.push(profile);
    this._saveToStorage('account_profiles', profiles);
    localStorage.setItem('current_account_profile_id', profile.id);
  }

  _detectCardBrand(cardNumber) {
    const num = (cardNumber || '').replace(/\D/g, '');
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(num)) return 'visa';
    if (/^5[1-5][0-9]{14}$/.test(num)) return 'mastercard';
    if (/^3[47][0-9]{13}$/.test(num)) return 'amex';
    if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(num)) return 'discover';
    return 'other';
  }

  _persistPaymentMethodIfRequested(saveCardForFuture, cardInfo) {
    if (!saveCardForFuture) return null;
    const { cardholderName, cardNumber, expiryMonth, expiryYear, billingStreet, billingCity, billingState, billingZip } = cardInfo;
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const now = this._nowISO();
    const method = {
      id: this._generateId('pm'),
      method_type: 'card',
      cardholder_name: cardholderName,
      card_last4: (cardNumber || '').slice(-4),
      card_brand: this._detectCardBrand(cardNumber),
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      billing_street: billingStreet || '',
      billing_city: billingCity || '',
      billing_state: billingState || '',
      billing_zip: billingZip || '',
      created_at: now
    };
    paymentMethods.push(method);
    this._saveToStorage('payment_methods', paymentMethods);
    return method;
  }

  // ---------------------- CORE INTERFACES ----------------------
  // 1) getHomeOverviewContent

  getHomeOverviewContent() {
    const services = this._getFromStorage('services', []);
    const promocodes = this._getFromStorage('promocodes', []);

    const featuredServices = services.filter((s) => s.is_active).slice(0, 3);

    const activePromotions = promocodes
      .filter((p) => p.is_active)
      .map((p) => {
        let discountSummary = '';
        if (p.discount_type === 'percent') {
          discountSummary = p.discount_value + '% off';
        } else if (p.discount_type === 'fixed_amount') {
          discountSummary = '$' + p.discount_value + ' off';
        }
        return {
          promoId: p.id,
          title: p.code,
          description: p.description || '',
          promoCode: p.code,
          discountSummary
        };
      });

    const topBenefits = [
      {
        title: 'Vetted, highly rated cleaners',
        description: 'All cleaners are background-checked and consistently rated highly by customers.',
        iconKey: 'shield_check'
      },
      {
        title: 'Flexible scheduling',
        description: 'Book one-time or recurring cleanings with convenient morning or afternoon windows.',
        iconKey: 'calendar_flex'
      },
      {
        title: 'Eco & pet friendly options',
        description: 'Choose eco-friendly products and pet-friendly teams at checkout.',
        iconKey: 'leaf_paw'
      }
    ];

    return {
      heroTitle: 'Reliable home cleaning, on your schedule',
      heroSubtitle: 'Book trusted cleaners for standard, deep, and move-out cleanings in just a few clicks.',
      featuredServices,
      topBenefits,
      activePromotions
    };
  }

  // 2) getPropertySizeOptions(propertyCategory?)

  getPropertySizeOptions(propertyCategory) {
    const sizes = this._getFromStorage('property_sizes', []);
    if (!propertyCategory) return sizes;
    return sizes.filter((s) => s.property_category === propertyCategory);
  }

  // 3) startNewBookingDraft(originPage, serviceId?, propertySizeId?, cleanerId?)

  startNewBookingDraft(originPage, serviceId, propertySizeId, cleanerId) {
    const bookings = this._getFromStorage('bookings', []);
    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);
    const now = this._nowISO();

    let serviceType = 'standard_cleaning';
    if (serviceId) {
      const service = services.find((s) => s.id === serviceId);
      if (service) serviceType = service.service_type;
    }

    let propertyType = null;
    let bedrooms = null;
    let bathrooms = null;
    if (propertySizeId) {
      const ps = propertySizes.find((p) => p.id === propertySizeId);
      if (ps) {
        propertyType = ps.property_category;
        bedrooms = ps.bedrooms;
        bathrooms = ps.bathrooms;
      }
    }

    const booking = {
      id: this._generateId('booking'),
      service_id: serviceId || null,
      service_type: serviceType,
      property_size_id: propertySizeId || null,
      property_type: propertyType,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      square_footage: null,
      service_address_id: null,
      service_street: '',
      service_city: '',
      service_state: '',
      zip_code: '',
      date: now,
      arrival_window: '9_11_am',
      is_weekend: this._isWeekendDate(now),
      cleaner_id: cleanerId || null,
      is_pet_friendly_required: false,
      use_eco_friendly_products: false,
      extras: [],
      notes: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      promo_code_id: null,
      payment_method_id: null,
      price_base: 0,
      price_extras: 0,
      price_discount: 0,
      price_total: 0,
      currency: 'USD',
      status: 'draft',
      origin_page: originPage || 'booking_form',
      created_at: now,
      updated_at: now,
      frequency: 'one_time'
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', booking.id);

    return { booking: this._resolveBookingFKs(booking) };
  }

  // 4) getBookingFormOptions()

  getBookingFormOptions() {
    const services = this._getFromStorage('services', []);
    const propertySizeOptions = this._getFromStorage('property_sizes', []);
    const addOns = this._getFromStorage('addons', []);
    const serviceTypes = ['standard_cleaning', 'deep_cleaning', 'move_out_deep_cleaning', 'spring_cleaning', 'same_day_urgent_cleaning'];
    const propertyTypes = ['studio_apartment', 'apartment', 'house', 'home', 'single_family_home', 'other'];
    const arrivalWindows = ['8_10_am', '9_11_am', '1_3_pm', '2_4_pm'];

    const currentBooking = { booking: this._resolveBookingFKs(this._getOrCreateCurrentBookingDraft()) };

    return {
      services,
      propertySizeOptions,
      serviceTypes,
      propertyTypes,
      arrivalWindows,
      addOns,
      supportsEcoFriendlyOption: true,
      supportsPetFriendlyOption: true,
      currentBooking
    };
  }

  // 5) updateCurrentBookingServiceDetails(serviceId, propertySizeId, ...)

  updateCurrentBookingServiceDetails(serviceId, propertySizeId, propertyType, bedrooms, bathrooms, squareFootage, zipCode) {
    let booking = this._getOrCreateCurrentBookingDraft();
    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);

    const service = services.find((s) => s.id === serviceId) || null;
    const ps = propertySizes.find((p) => p.id === propertySizeId) || null;

    booking.service_id = serviceId;
    booking.service_type = service ? service.service_type : booking.service_type;
    booking.property_size_id = propertySizeId;
    booking.property_type = propertyType || (ps ? ps.property_category : booking.property_type);
    booking.bedrooms = typeof bedrooms === 'number' ? bedrooms : (ps ? ps.bedrooms : booking.bedrooms);
    booking.bathrooms = typeof bathrooms === 'number' ? bathrooms : (ps ? ps.bathrooms : booking.bathrooms);
    booking.square_footage = typeof squareFootage === 'number' ? squareFootage : booking.square_footage;
    booking.zip_code = zipCode || booking.zip_code;
    booking.updated_at = this._nowISO();

    this._saveBooking(booking);
    const { priceSummary } = this._calculatePriceForCurrentBooking();

    return {
      success: true,
      booking: this._resolveBookingFKs(booking),
      message: 'Service details updated',
      priceSummary
    };
  }

  // 6) updateCurrentBookingSchedule(date, arrivalWindow)

  updateCurrentBookingSchedule(date, arrivalWindow) {
    let booking = this._getOrCreateCurrentBookingDraft();
    booking.date = date;
    booking.arrival_window = arrivalWindow;
    booking.is_weekend = this._isWeekendDate(date);
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    const { priceSummary } = this._calculatePriceForCurrentBooking();
    return {
      success: true,
      booking: this._resolveBookingFKs(booking),
      message: 'Schedule updated',
      priceSummary
    };
  }

  // 7) updateCurrentBookingPreferences(isPetFriendlyRequired?, useEcoFriendlyProducts?)

  updateCurrentBookingPreferences(isPetFriendlyRequired, useEcoFriendlyProducts) {
    let booking = this._getOrCreateCurrentBookingDraft();
    if (typeof isPetFriendlyRequired === 'boolean') {
      booking.is_pet_friendly_required = isPetFriendlyRequired;
    }
    if (typeof useEcoFriendlyProducts === 'boolean') {
      booking.use_eco_friendly_products = useEcoFriendlyProducts;
    }
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    return {
      success: true,
      booking: this._resolveBookingFKs(booking)
    };
  }

  // 8) getAvailableCleanersForCurrentBooking(sortBy, ...)

  getAvailableCleanersForCurrentBooking(sortBy, minRating, minReviewCount, isPetFriendlyRequired, usesEcoFriendlyProducts, zipCode) {
    const booking = this._getOrCreateCurrentBookingDraft();
    const cleaners = this._getFromStorage('cleaners', []);
    const offerings = this._getFromStorage('cleaner_service_offerings', []);

    let filtered = cleaners.filter((c) => c.is_active);

    if (typeof minRating === 'number') {
      filtered = filtered.filter((c) => c.rating >= minRating);
    }
    if (typeof minReviewCount === 'number') {
      filtered = filtered.filter((c) => c.review_count >= minReviewCount);
    }
    if (typeof isPetFriendlyRequired === 'boolean' && isPetFriendlyRequired) {
      filtered = filtered.filter((c) => c.is_pet_friendly);
    }
    if (typeof usesEcoFriendlyProducts === 'boolean' && usesEcoFriendlyProducts) {
      filtered = filtered.filter((c) => c.uses_eco_friendly_products);
    }
    if (zipCode) {
      filtered = filtered.filter((c) => {
        if (!c.service_area_zip_codes || !Array.isArray(c.service_area_zip_codes)) return true;
        return c.service_area_zip_codes.includes(zipCode);
      });
    }

    const currency = 'USD';
    const serviceId = booking.service_id;
    const propertySizeId = booking.property_size_id;

    let result = filtered.map((cleaner) => {
      const relevantOfferings = offerings.filter(
        (o) => o.cleaner_id === cleaner.id && (!serviceId || o.service_id === serviceId) && (!propertySizeId || o.property_size_id === propertySizeId) && o.is_active
      );
      const basePrice = relevantOfferings.length
        ? Math.min.apply(null, relevantOfferings.map((o) => o.base_price))
        : (typeof cleaner.min_price_per_visit === 'number' ? cleaner.min_price_per_visit : 0);
      return {
        cleaner,
        offering: relevantOfferings[0] || null,
        totalPriceEstimate: basePrice,
        currency,
        isPetFriendly: cleaner.is_pet_friendly,
        usesEcoFriendlyProducts: cleaner.uses_eco_friendly_products
      };
    });

    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => a.totalPriceEstimate - b.totalPriceEstimate);
    } else if (sortBy === 'rating_high_to_low') {
      result.sort((a, b) => b.cleaner.rating - a.cleaner.rating);
    } else if (sortBy === 'review_count_high_to_low') {
      result.sort((a, b) => b.cleaner.review_count - a.cleaner.review_count);
    }

    return result;
  }

  // 9) selectCleanerForCurrentBooking(cleanerId)

  selectCleanerForCurrentBooking(cleanerId) {
    let booking = this._getOrCreateCurrentBookingDraft();
    const cleaners = this._getFromStorage('cleaners', []);
    const cleaner = cleaners.find((c) => c.id === cleanerId) || null;
    booking.cleaner_id = cleanerId;
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    const resolved = this._resolveBookingFKs(booking);
    return {
      success: !!cleaner,
      booking: resolved,
      selectedCleaner: cleaner
    };
  }

  // 10) getAvailableAddOnsForCurrentBooking()

  getAvailableAddOnsForCurrentBooking() {
    const booking = this._getOrCreateCurrentBookingDraft();
    const addOns = this._getFromStorage('addons', []);
    const applicable = addOns.filter((a) => {
      if (a.applicable_service_types && a.applicable_service_types.length) {
        if (!a.applicable_service_types.includes(booking.service_type)) return false;
      }
      if (a.applicable_property_size_ids && a.applicable_property_size_ids.length) {
        if (!a.applicable_property_size_ids.includes(booking.property_size_id)) return false;
      }
      return true;
    });
    return applicable;
  }

  // 11) updateCurrentBookingExtras(addonIds)

  updateCurrentBookingExtras(addonIds) {
    let booking = this._getOrCreateCurrentBookingDraft();
    const addOns = this._getFromStorage('addons', []);
    const selectedIds = Array.isArray(addonIds) ? addonIds : [];
    booking.extras = selectedIds;
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);

    const { priceSummary } = this._calculatePriceForCurrentBooking();
    const selectedAddOns = selectedIds
      .map((id) => addOns.find((a) => a.id === id) || null)
      .filter(Boolean);

    return {
      success: true,
      booking: this._resolveBookingFKs(booking),
      selectedAddOns,
      priceSummary
    };
  }

  // 12) updateCurrentBookingNotes(notes)

  updateCurrentBookingNotes(notes) {
    let booking = this._getOrCreateCurrentBookingDraft();
    booking.notes = notes || '';
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    return {
      success: true,
      booking: this._resolveBookingFKs(booking)
    };
  }

  // 13) updateCurrentBookingContactDetails(contactName, contactPhone, contactEmail)

  updateCurrentBookingContactDetails(contactName, contactPhone, contactEmail) {
    let booking = this._getOrCreateCurrentBookingDraft();
    booking.contact_name = contactName;
    booking.contact_phone = contactPhone;
    booking.contact_email = contactEmail;
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    return {
      success: true,
      booking: this._resolveBookingFKs(booking)
    };
  }

  // 14) applyPromoCodeToCurrentBooking(promoCode)

  applyPromoCodeToCurrentBooking(promoCode) {
    let booking = this._getOrCreateCurrentBookingDraft();
    const codes = this._getFromStorage('promocodes', []);
    const codeNorm = (promoCode || '').trim().toLowerCase();
    const promo = codes.find((p) => (p.code || '').toLowerCase() === codeNorm && p.is_active) || null;

    const baseAmount = booking.price_base || 0;
    const extrasAmount = booking.price_extras || 0;
    const { discountAmount, validPromo } = this._validatePromoCodeForCurrentBooking(promo, booking, baseAmount, extrasAmount);

    let message = '';
    if (!validPromo) {
      booking.promo_code_id = null;
      message = 'Promo code is invalid or not applicable.';
    } else {
      booking.promo_code_id = validPromo.id;
      message = 'Promo code applied.';
    }

    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    const { priceSummary } = this._calculatePriceForCurrentBooking();

    return {
      success: !!validPromo,
      appliedPromo: { promo: validPromo },
      priceSummary,
      message
    };
  }

  // 15) updateCurrentBookingPricingOptions(frequency?)

  updateCurrentBookingPricingOptions(frequency) {
    let booking = this._getOrCreateCurrentBookingDraft();
    if (frequency) {
      booking.frequency = frequency;
    }
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    const { priceSummary } = this._calculatePriceForCurrentBooking();
    return {
      success: true,
      booking: this._resolveBookingFKs(booking),
      priceSummary
    };
  }

  // 16) getCurrentBookingPriceSummary()

  getCurrentBookingPriceSummary() {
    const { booking, priceSummary } = this._calculatePriceForCurrentBooking();
    return {
      booking: this._resolveBookingFKs(booking),
      priceSummary
    };
  }

  // 17) proceedToSummaryForCurrentBooking()

  proceedToSummaryForCurrentBooking() {
    const { booking, priceSummary } = this._calculatePriceForCurrentBooking();
    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);
    const addOns = this._getFromStorage('addons', []);
    const cleaners = this._getFromStorage('cleaners', []);

    const service = services.find((s) => s.id === booking.service_id) || null;
    const propertySize = propertySizes.find((p) => p.id === booking.property_size_id) || null;
    const cleaner = cleaners.find((c) => c.id === booking.cleaner_id) || null;

    const addOnObjects = (booking.extras || [])
      .map((id) => addOns.find((a) => a.id === id) || null)
      .filter(Boolean)
      .map((a) => ({ id: a.id, name: a.name, price: typeof a.price === 'number' ? a.price : 0 }));

    // Simple validation
    const missingFields = [];
    if (!booking.service_id) missingFields.push('service');
    if (!booking.property_size_id) missingFields.push('property size');
    if (!booking.date) missingFields.push('date');
    if (!booking.arrival_window) missingFields.push('arrival window');
    // Contact details are collected later in the checkout flow; they are not required to view summary

    const success = missingFields.length === 0;

    const summary = {
      serviceName: service ? service.name : '',
      serviceType: booking.service_type,
      propertySizeLabel: propertySize ? propertySize.label : '',
      bedrooms: booking.bedrooms,
      bathrooms: booking.bathrooms,
      propertyType: booking.property_type,
      squareFootage: booking.square_footage,
      date: booking.date,
      arrivalWindow: booking.arrival_window,
      isWeekend: booking.is_weekend,
      cleanerName: cleaner ? cleaner.name : '',
      cleanerRating: cleaner ? cleaner.rating : null,
      cleanerReviewCount: cleaner ? cleaner.review_count : null,
      isPetFriendlyRequired: booking.is_pet_friendly_required,
      useEcoFriendlyProducts: booking.use_eco_friendly_products,
      addOns: addOnObjects,
      notes: booking.notes,
      contactName: booking.contact_name,
      contactPhone: booking.contact_phone,
      contactEmail: booking.contact_email,
      priceSummary,
      status: booking.status
    };

    return {
      success,
      booking: this._resolveBookingFKs(booking),
      summary,
      message: success ? 'Ready for summary' : 'Missing fields: ' + missingFields.join(', ')
    };
  }

  // 18) proceedToCheckoutForCurrentBooking()

  proceedToCheckoutForCurrentBooking() {
    let { booking, priceSummary } = this._calculatePriceForCurrentBooking();

    // Basic validation: require core booking details; contact info can be completed during checkout
    const requiredFields = ['service_id', 'property_size_id', 'date', 'arrival_window'];
    const missing = requiredFields.filter((f) => !booking[f]);
    if (missing.length > 0) {
      return {
        success: false,
        booking: this._resolveBookingFKs(booking),
        checkoutDetails: null,
        message: 'Missing required fields: ' + missing.join(', ')
      };
    }

    booking.status = 'pending_payment';
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);

    const paymentOptions = ['one_time_card'];
    const savedPaymentMethods = this._getFromStorage('payment_methods', []);

    return {
      success: true,
      booking: this._resolveBookingFKs(booking),
      checkoutDetails: {
        priceSummary,
        paymentOptions,
        savedPaymentMethods
      }
    };
  }

  // 19) getCheckoutDetailsForCurrentBooking()

  getCheckoutDetailsForCurrentBooking() {
    const { booking, priceSummary } = this._calculatePriceForCurrentBooking();
    const paymentOptions = ['one_time_card'];
    const savedPaymentMethods = this._getFromStorage('payment_methods', []);
    return {
      booking: this._resolveBookingFKs(booking),
      priceSummary,
      paymentOptions,
      savedPaymentMethods
    };
  }

  // 20) submitPaymentForCurrentBooking(...)

  submitPaymentForCurrentBooking(
    cardholderName,
    cardNumber,
    expiryMonth,
    expiryYear,
    cvc,
    billingStreet,
    billingCity,
    billingState,
    billingZip,
    saveCardForFuture
  ) {
    let { booking, priceSummary } = this._calculatePriceForCurrentBooking();

    if (!booking || booking.status !== 'pending_payment') {
      return {
        success: false,
        message: 'Booking is not ready for payment.',
        booking: booking ? this._resolveBookingFKs(booking) : null,
        paymentMethod: { method: null }
      };
    }

    // Simulate payment success
    const method = this._persistPaymentMethodIfRequested(saveCardForFuture, {
      cardholderName,
      cardNumber,
      expiryMonth,
      expiryYear,
      billingStreet,
      billingCity,
      billingState,
      billingZip
    });

    booking.status = 'confirmed';
    if (method) booking.payment_method_id = method.id;
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    localStorage.setItem('last_confirmed_booking_id', booking.id);

    return {
      success: true,
      message: 'Payment processed successfully.',
      booking: this._resolveBookingFKs(booking),
      paymentMethod: { method }
    };
  }

  // 21) getCurrentBookingSummary()

  getCurrentBookingSummary() {
    const { booking, priceSummary } = this._calculatePriceForCurrentBooking();
    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);
    const addOns = this._getFromStorage('addons', []);
    const cleaners = this._getFromStorage('cleaners', []);

    const service = services.find((s) => s.id === booking.service_id) || null;
    const propertySize = propertySizes.find((p) => p.id === booking.property_size_id) || null;
    const cleaner = cleaners.find((c) => c.id === booking.cleaner_id) || null;

    const addOnObjects = (booking.extras || [])
      .map((id) => addOns.find((a) => a.id === id) || null)
      .filter(Boolean)
      .map((a) => ({ id: a.id, name: a.name, price: typeof a.price === 'number' ? a.price : 0 }));

    const summary = {
      serviceName: service ? service.name : '',
      serviceType: booking.service_type,
      propertySizeLabel: propertySize ? propertySize.label : '',
      bedrooms: booking.bedrooms,
      bathrooms: booking.bathrooms,
      propertyType: booking.property_type,
      squareFootage: booking.square_footage,
      date: booking.date,
      arrivalWindow: booking.arrival_window,
      isWeekend: booking.is_weekend,
      cleanerName: cleaner ? cleaner.name : '',
      cleanerRating: cleaner ? cleaner.rating : null,
      cleanerReviewCount: cleaner ? cleaner.review_count : null,
      isPetFriendlyRequired: booking.is_pet_friendly_required,
      useEcoFriendlyProducts: booking.use_eco_friendly_products,
      addOns: addOnObjects,
      notes: booking.notes,
      contactName: booking.contact_name,
      contactPhone: booking.contact_phone,
      contactEmail: booking.contact_email,
      priceSummary,
      status: booking.status
    };

    return {
      summary,
      booking: this._resolveBookingFKs(booking)
    };
  }

  // 22) confirmCurrentBooking()

  confirmCurrentBooking() {
    let booking = this._getOrCreateCurrentBookingDraft();
    booking.status = 'confirmed';
    booking.updated_at = this._nowISO();
    this._saveBooking(booking);
    localStorage.setItem('last_confirmed_booking_id', booking.id);
    return {
      success: true,
      booking: this._resolveBookingFKs(booking)
    };
  }

  // 23) getBookingConfirmationDetails()

  getBookingConfirmationDetails() {
    const bookingId = localStorage.getItem('last_confirmed_booking_id');
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId) || this._getOrCreateCurrentBookingDraft();
    const resolved = this._resolveBookingFKs(booking);
    const referenceCode = booking ? 'BK-' + booking.id : '';
    const nextSteps = [
      'You will receive a confirmation email shortly.',
      'Your cleaner may contact you to confirm access and parking details.',
      'You can reschedule or cancel up to 24 hours before the visit.'
    ];
    return {
      booking: resolved,
      referenceCode,
      nextSteps
    };
  }

  // 24) getRecurringPlansForPropertySize(propertySizeId, frequency?)

  getRecurringPlansForPropertySize(propertySizeId, frequency) {
    const templates = this._getFromStorage('plan_templates', []);
    let filtered = templates.filter((t) => t.property_size_id === propertySizeId && t.is_active);
    if (frequency) {
      filtered = filtered.filter((t) => t.frequency === frequency);
    }
    return filtered.map((t) => this._resolveRecurringPlanTemplateFKs(t));
  }

  // 25) startPlanEnrollmentDraft(planTemplateId)

  startPlanEnrollmentDraft(planTemplateId) {
    const now = this._nowISO();
    const planEnrollment = {
      id: this._generateId('plan'),
      plan_template_id: planTemplateId,
      start_date: now,
      first_visit_arrival_window: '9_11_am',
      billing_method: 'card_auto_billing',
      payment_method_id: null,
      status: 'in_review',
      created_at: now,
      updated_at: now
    };
    this._savePlanEnrollment(planEnrollment);
    localStorage.setItem('last_plan_enrollment_id', planEnrollment.id);
    return {
      planEnrollment
    };
  }

  // 26) updateCurrentPlanSchedule(startDate, firstVisitArrivalWindow)

  updateCurrentPlanSchedule(startDate, firstVisitArrivalWindow) {
    let draft = this._getOrCreateCurrentPlanEnrollmentDraft();
    if (!draft) {
      // Cannot create without template; return failure
      return {
        success: false,
        planEnrollment: null
      };
    }
    draft.start_date = startDate;
    draft.first_visit_arrival_window = firstVisitArrivalWindow;
    draft.updated_at = this._nowISO();
    this._savePlanEnrollment(draft);
    return {
      success: true,
      planEnrollment: draft
    };
  }

  // 27) updateCurrentPlanBillingMethod(billingMethod, paymentMethodId?)

  updateCurrentPlanBillingMethod(billingMethod, paymentMethodId) {
    let draft = this._getOrCreateCurrentPlanEnrollmentDraft();
    if (!draft) {
      return {
        success: false,
        planEnrollment: null
      };
    }
    draft.billing_method = billingMethod;
    if (paymentMethodId) {
      draft.payment_method_id = paymentMethodId;
    }
    draft.updated_at = this._nowISO();
    this._savePlanEnrollment(draft);
    return {
      success: true,
      planEnrollment: draft
    };
  }

  // 28) getCurrentPlanReviewDetails()

  getCurrentPlanReviewDetails() {
    const draft = this._getOrCreateCurrentPlanEnrollmentDraft();
    if (!draft) {
      return {
        planEnrollment: null,
        planTemplate: null,
        service: null,
        propertySize: null,
        pricing: {
          perVisitPrice: 0,
          monthlyPrice: 0,
          billingMethod: null
        }
      };
    }
    const planTemplates = this._getFromStorage('plan_templates', []);
    const services = this._getFromStorage('services', []);
    const propertySizes = this._getFromStorage('property_sizes', []);

    const template = planTemplates.find((p) => p.id === draft.plan_template_id) || null;
    const service = template ? services.find((s) => s.id === template.service_id) || null : null;
    const propertySize = template ? propertySizes.find((p) => p.id === template.property_size_id) || null : null;

    const perVisitPrice = template ? template.per_visit_price : 0;
    const monthlyPrice = template && typeof template.monthly_price === 'number'
      ? template.monthly_price
      : (template ? template.per_visit_price * (template.frequency === 'weekly' ? 4 : template.frequency === 'bi_weekly' ? 2 : 1) : 0);

    return {
      planEnrollment: draft,
      planTemplate: template,
      service,
      propertySize,
      pricing: {
        perVisitPrice,
        monthlyPrice,
        billingMethod: draft.billing_method
      }
    };
  }

  // 29) confirmCurrentPlanEnrollment()

  confirmCurrentPlanEnrollment() {
    let draft = this._getOrCreateCurrentPlanEnrollmentDraft();
    if (!draft) {
      return {
        success: false,
        planEnrollment: null
      };
    }
    draft.status = 'active';
    draft.updated_at = this._nowISO();
    this._savePlanEnrollment(draft);
    return {
      success: true,
      planEnrollment: draft
    };
  }

  // 30) getInstantQuoteFormOptions()

  getInstantQuoteFormOptions() {
    const services = this._getFromStorage('services', []).filter((s) => s.supports_instant_quote);
    const propertyTypes = ['studio_apartment', 'apartment', 'house', 'home', 'single_family_home', 'other'];
    const addOns = this._getFromStorage('addons', []);
    return {
      services,
      propertyTypes,
      addOns
    };
  }

  // 31) setCurrentInstantQuoteConfiguration(serviceId, squareFootage, propertyType, selectedAddonIds?, budgetLimit?)

  setCurrentInstantQuoteConfiguration(serviceId, squareFootage, propertyType, selectedAddonIds, budgetLimit) {
    let instantQuote = this._getOrCreateCurrentInstantQuote();
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;

    instantQuote.service_id = serviceId;
    instantQuote.service_type = service ? service.service_type : instantQuote.service_type;
    instantQuote.square_footage = squareFootage;
    instantQuote.property_type = propertyType;
    instantQuote.selected_addon_ids = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    if (typeof budgetLimit === 'number') {
      instantQuote.budget_limit = budgetLimit;
    }
    instantQuote.status = 'draft';

    instantQuote = this._calculateInstantQuotePrice(instantQuote);
    return {
      instantQuote: this._resolveInstantQuoteFKs(instantQuote)
    };
  }

  // 32) updateCurrentInstantQuoteAddOns(selectedAddonIds)

  updateCurrentInstantQuoteAddOns(selectedAddonIds) {
    let instantQuote = this._getOrCreateCurrentInstantQuote();
    instantQuote.selected_addon_ids = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    instantQuote = this._calculateInstantQuotePrice(instantQuote);
    return {
      instantQuote: this._resolveInstantQuoteFKs(instantQuote)
    };
  }

  // 33) setCurrentInstantQuoteBudgetLimit(budgetLimit)

  setCurrentInstantQuoteBudgetLimit(budgetLimit) {
    let instantQuote = this._getOrCreateCurrentInstantQuote();
    instantQuote.budget_limit = budgetLimit;
    instantQuote = this._calculateInstantQuotePrice(instantQuote);
    return {
      instantQuote: this._resolveInstantQuoteFKs(instantQuote)
    };
  }

  // 34) getCurrentInstantQuoteDetails()

  getCurrentInstantQuoteDetails() {
    let instantQuote = this._getOrCreateCurrentInstantQuote();
    instantQuote = this._calculateInstantQuotePrice(instantQuote);
    return {
      instantQuote: this._resolveInstantQuoteFKs(instantQuote)
    };
  }

  // 35) finalizeCurrentInstantQuote()

  finalizeCurrentInstantQuote() {
    let instantQuote = this._getOrCreateCurrentInstantQuote();
    instantQuote = this._calculateInstantQuotePrice(instantQuote);
    instantQuote.status = 'finalized';
    this._saveInstantQuote(instantQuote);
    return {
      success: true,
      instantQuote: this._resolveInstantQuoteFKs(instantQuote)
    };
  }

  // 36) submitQuoteRequestForCurrentInstantQuote(contactName, contactPhone, contactEmail, message?)

  submitQuoteRequestForCurrentInstantQuote(contactName, contactPhone, contactEmail, message) {
    let instantQuote = this._getOrCreateCurrentInstantQuote();
    if (instantQuote.status !== 'finalized') {
      instantQuote.status = 'finalized';
      this._saveInstantQuote(instantQuote);
    }
    const quoteRequests = this._getFromStorage('quote_requests', []);
    const now = this._nowISO();
    const quoteRequest = {
      id: this._generateId('qr'),
      instant_quote_id: instantQuote.id,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      message: message || '',
      submitted_at: now,
      status: 'submitted'
    };
    quoteRequests.push(quoteRequest);
    this._saveToStorage('quote_requests', quoteRequests);
    localStorage.setItem('last_quote_request_id', quoteRequest.id);
    return {
      success: true,
      quoteRequest
    };
  }

  // 37) getQuoteConfirmationDetails(quoteRequestId)

  getQuoteConfirmationDetails(quoteRequestId) {
    const quoteRequests = this._getFromStorage('quote_requests', []);
    const instantQuotes = this._getFromStorage('instant_quotes', []);
    const qr = quoteRequests.find((q) => q.id === quoteRequestId) || null;
    const iq = qr ? instantQuotes.find((i) => i.id === qr.instant_quote_id) || null : null;
    const instantQuote = this._resolveInstantQuoteFKs(iq);
    const preferredContactSummary = qr ? `We will reach out via phone or email to ${qr.contact_name}.` : '';

    return {
      quoteRequest: qr,
      instantQuote,
      expectedResponseTimeHours: 24,
      preferredContactSummary
    };
  }

  // 38) searchCleaners(query, ...)

  searchCleaners(query, minRating, minReviewCount, zipCode, usesEcoFriendlyProducts, isPetFriendly, sortBy, page, pageSize) {
    const cleaners = this._getFromStorage('cleaners', []);
    const offerings = this._getFromStorage('cleaner_service_offerings', []);

    const q = (query || '').toLowerCase();

    let filtered = cleaners.filter((c) => c.is_active);

    if (q) {
      filtered = filtered.filter((c) => {
        const inName = (c.name || '').toLowerCase().includes(q);
        const inDesc = (c.description || '').toLowerCase().includes(q);
        const inSpecs = (Array.isArray(c.specialties) ? c.specialties.join(' ') : '').toLowerCase().includes(q);
        return inName || inDesc || inSpecs;
      });
    }

    if (typeof minRating === 'number') {
      filtered = filtered.filter((c) => c.rating >= minRating);
    }
    if (typeof minReviewCount === 'number') {
      filtered = filtered.filter((c) => c.review_count >= minReviewCount);
    }
    if (typeof usesEcoFriendlyProducts === 'boolean' && usesEcoFriendlyProducts) {
      filtered = filtered.filter((c) => c.uses_eco_friendly_products);
    }
    if (typeof isPetFriendly === 'boolean' && isPetFriendly) {
      filtered = filtered.filter((c) => c.is_pet_friendly);
    }
    if (zipCode) {
      filtered = filtered.filter((c) => {
        if (!c.service_area_zip_codes || !Array.isArray(c.service_area_zip_codes)) return true;
        return c.service_area_zip_codes.includes(zipCode);
      });
    }

    const currency = 'USD';
    const mapped = filtered.map((cleaner) => {
      const cleanerOfferings = offerings.filter((o) => o.cleaner_id === cleaner.id && o.is_active);
      const minPricePerVisit = cleanerOfferings.length
        ? Math.min.apply(null, cleanerOfferings.map((o) => o.base_price))
        : (typeof cleaner.min_price_per_visit === 'number' ? cleaner.min_price_per_visit : 0);
      return {
        cleaner,
        minPricePerVisit,
        currency,
        matchesEcoFriendly: cleaner.uses_eco_friendly_products,
        matchesPetFriendly: cleaner.is_pet_friendly
      };
    });

    if (sortBy === 'rating_desc') {
      mapped.sort((a, b) => b.cleaner.rating - a.cleaner.rating);
    } else if (sortBy === 'price_asc') {
      mapped.sort((a, b) => a.minPricePerVisit - b.minPricePerVisit);
    } else if (sortBy === 'reviews_desc') {
      mapped.sort((a, b) => b.cleaner.review_count - a.cleaner.review_count);
    }

    const totalResults = mapped.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 10;
    const start = (p - 1) * ps;
    const paged = mapped.slice(start, start + ps);

    // Instrumentation for task completion tracking (Task 5)
    try {
      const existing = localStorage.getItem('task5_searchParams');
      const normalizedQuery = (query || '').toLowerCase();
      if (
        !existing &&
        normalizedQuery &&
        (normalizedQuery.includes('eco-friendly cleaning') || normalizedQuery.includes('eco friendly cleaning')) &&
        typeof minRating === 'number' && minRating >= 4.5 &&
        typeof minReviewCount === 'number' && minReviewCount >= 50 &&
        zipCode === '94110'
      ) {
        const params = { query, minRating, minReviewCount, zipCode, usesEcoFriendlyProducts, isPetFriendly, sortBy };
        localStorage.setItem('task5_searchParams', JSON.stringify(params));
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting core functionality
    }

    return {
      totalResults,
      cleaners: paged
    };
  }

  // 39) getCleanerSearchFilterOptions()

  getCleanerSearchFilterOptions() {
    const minRatingOptions = [
      { value: 3.5, label: '3.5+' },
      { value: 4.0, label: '4.0+' },
      { value: 4.5, label: '4.5+' },
      { value: 4.8, label: '4.8+' }
    ];
    const minReviewCountOptions = [
      { value: 10, label: '10+ reviews' },
      { value: 25, label: '25+ reviews' },
      { value: 50, label: '50+ reviews' },
      { value: 100, label: '100+ reviews' }
    ];
    const cleaners = this._getFromStorage('cleaners', []);
    const zipSet = new Set();
    cleaners.forEach((c) => {
      (c.service_area_zip_codes || []).forEach((z) => zipSet.add(z));
    });
    const zipCodeExamples = Array.from(zipSet).slice(0, 5);
    const specialtyTags = ['eco-friendly', 'pet-friendly', 'move-out', 'deep cleaning', 'standard cleaning'];

    return {
      minRatingOptions,
      minReviewCountOptions,
      zipCodeExamples,
      specialtyTags
    };
  }

  // 40) getCleanerProfile(cleanerId)

  getCleanerProfile(cleanerId) {
    const cleaners = this._getFromStorage('cleaners', []);
    const offerings = this._getFromStorage('cleaner_service_offerings', []);
    const services = this._getFromStorage('services', []);

    const cleaner = cleaners.find((c) => c.id === cleanerId) || null;
    if (!cleaner) {
      return {
        cleaner: null,
        specialties: [],
        servicesOffered: [],
        ratingBreakdown: { overallRating: 0, reviewCount: 0 },
        badges: []
      };
    }

    const cleanerOfferings = offerings.filter((o) => o.cleaner_id === cleaner.id && o.is_active);
    const servicesOffered = [];
    const serviceMap = {};

    cleanerOfferings.forEach((off) => {
      const srv = services.find((s) => s.id === off.service_id);
      if (!srv) return;
      if (!serviceMap[srv.id]) {
        serviceMap[srv.id] = {
          service: srv,
          minPricePerVisit: off.base_price
        };
      } else {
        if (off.base_price < serviceMap[srv.id].minPricePerVisit) {
          serviceMap[srv.id].minPricePerVisit = off.base_price;
        }
      }
    });

    Object.keys(serviceMap).forEach((k) => servicesOffered.push(serviceMap[k]));

    const ratingBreakdown = {
      overallRating: cleaner.rating,
      reviewCount: cleaner.review_count
    };

    const badges = [];
    if (cleaner.is_pet_friendly) badges.push('Pet-friendly');
    if (cleaner.uses_eco_friendly_products) badges.push('Eco-friendly products');
    if (cleaner.rating >= 4.8) badges.push('Top-rated');

    return {
      cleaner,
      specialties: cleaner.specialties || [],
      servicesOffered,
      ratingBreakdown,
      badges
    };
  }

  // 41) getServicesAndPackagesOverview()

  getServicesAndPackagesOverview() {
    const services = this._getFromStorage('services', []);
    const profile = this._getOrCreateAccountProfile();
    const favoriteServiceIds = profile.favorite_service_ids || [];

    const featuredPackages = services.filter((s) => s.is_active).map((s) => ({
      service: s,
      descriptionSummary: s.description || '',
      startingPrice: typeof s.base_price === 'number' ? s.base_price : 0,
      includesInsideOvenCleaning: !!s.includes_inside_oven_cleaning,
      includesFridgeCleaning: !!s.includes_fridge_cleaning,
      includesBalconyPatioCleaning: !!s.includes_balcony_patio_cleaning,
      includesCarpetCleaning: !!s.includes_carpet_cleaning,
      includesWindowWashing: !!s.includes_window_washing
    }));

    return {
      services,
      featuredPackages,
      favoriteServiceIds
    };
  }

  // 42) getFavoriteServices()

  getFavoriteServices() {
    const profile = this._getOrCreateAccountProfile();
    const services = this._getFromStorage('services', []);
    const favIds = profile.favorite_service_ids || [];
    return services.filter((s) => favIds.includes(s.id));
  }

  // 43) toggleFavoriteService(serviceId, isFavorite)

  toggleFavoriteService(serviceId, isFavorite) {
    const profile = this._getOrCreateAccountProfile();
    let favIds = profile.favorite_service_ids || [];
    if (isFavorite) {
      if (!favIds.includes(serviceId)) favIds.push(serviceId);
    } else {
      favIds = favIds.filter((id) => id !== serviceId);
    }
    profile.favorite_service_ids = favIds;
    profile.updated_at = this._nowISO();
    this._saveAccountProfile(profile);

    const services = this._getFromStorage('services', []);
    const favoriteServices = services.filter((s) => favIds.includes(s.id));

    return {
      favoriteServiceIds: favIds,
      favoriteServices
    };
  }

  // 44) getPackageComparisonForPropertySize(propertySizeId)

  getPackageComparisonForPropertySize(propertySizeId) {
    const propertySizes = this._getFromStorage('property_sizes', []);
    const services = this._getFromStorage('services', []);
    const planTemplates = this._getFromStorage('plan_templates', []);

    const propertySize = propertySizes.find((p) => p.id === propertySizeId) || null;

    const packages = services.filter((s) => s.is_active).map((s) => {
      const relevantPlans = planTemplates.filter(
        (pt) => pt.service_id === s.id && pt.property_size_id === propertySizeId
      );
      const getPrice = (freq) => {
        const plan = relevantPlans.find((p) => p.frequency === freq);
        return plan ? plan.per_visit_price : (typeof s.base_price === 'number' ? s.base_price : 0);
      };
      return {
        service: s,
        perVisitPriceOneTime: getPrice('one_time'),
        perVisitPriceWeekly: getPrice('weekly'),
        perVisitPriceBiWeekly: getPrice('bi_weekly'),
        perVisitPriceMonthly: getPrice('monthly'),
        includesInsideOvenCleaning: !!s.includes_inside_oven_cleaning,
        includesFridgeCleaning: !!s.includes_fridge_cleaning,
        includesBalconyPatioCleaning: !!s.includes_balcony_patio_cleaning,
        includesCarpetCleaning: !!s.includes_carpet_cleaning,
        includesWindowWashing: !!s.includes_window_washing,
        description: s.description || ''
      };
    });

    return {
      propertySize,
      packages
    };
  }

  // 45) createAccountProfile(fullName, email, password, phone?, agreedToTerms)

  createAccountProfile(fullName, email, password, phone, agreedToTerms) {
    const profiles = this._getFromStorage('account_profiles', []);
    const now = this._nowISO();
    const profile = {
      id: this._generateId('acct'),
      full_name: fullName,
      email,
      password,
      phone: phone || '',
      agreed_to_terms: !!agreedToTerms,
      favorite_service_ids: [],
      created_at: now,
      updated_at: now
    };
    profiles.push(profile);
    this._saveToStorage('account_profiles', profiles);
    localStorage.setItem('current_account_profile_id', profile.id);
    return {
      accountProfile: profile
    };
  }

  // 46) getAccountProfile()

  getAccountProfile() {
    const profile = this._getOrCreateAccountProfile();
    return {
      accountProfile: profile
    };
  }

  // 47) updateAccountProfile(fullName?, email?, password?, phone?, agreedToTerms?)

  updateAccountProfile(fullName, email, password, phone, agreedToTerms) {
    const profile = this._getOrCreateAccountProfile();
    if (typeof fullName === 'string') profile.full_name = fullName;
    if (typeof email === 'string') profile.email = email;
    if (typeof password === 'string') profile.password = password;
    if (typeof phone === 'string') profile.phone = phone;
    if (typeof agreedToTerms === 'boolean') profile.agreed_to_terms = agreedToTerms;
    profile.updated_at = this._nowISO();
    this._saveAccountProfile(profile);
    return {
      accountProfile: profile
    };
  }

  // 48) logOutAccount()

  logOutAccount() {
    localStorage.setItem('current_account_profile_id', '');
    return {
      success: true,
      message: 'Logged out successfully.'
    };
  }

  // 49) getSavedAddresses()

  getSavedAddresses() {
    const addresses = this._getFromStorage('addresses', []);
    return addresses;
  }

  // 50) addSavedAddress(label?, street, city, state, zipCode, additionalInstructions?, setAsDefault?)

  addSavedAddress(label, street, city, state, zipCode, additionalInstructions, setAsDefault) {
    const addresses = this._getFromStorage('addresses', []);
    const now = this._nowISO();
    const address = {
      id: this._generateId('addr'),
      label: label || 'Home',
      street,
      city,
      state,
      zip_code: zipCode,
      additional_instructions: additionalInstructions || '',
      is_default: !!setAsDefault,
      created_at: now,
      updated_at: now
    };

    if (address.is_default) {
      addresses.forEach((a) => {
        a.is_default = false;
      });
    }

    addresses.push(address);
    this._saveToStorage('addresses', addresses);
    return {
      address,
      addresses
    };
  }

  // 51) updateSavedAddress(addressId, ...)

  updateSavedAddress(addressId, label, street, city, state, zipCode, additionalInstructions, setAsDefault) {
    const addresses = this._getFromStorage('addresses', []);
    const idx = addresses.findIndex((a) => a.id === addressId);
    if (idx === -1) {
      return {
        address: null,
        addresses
      };
    }
    const addr = addresses[idx];
    if (typeof label === 'string') addr.label = label;
    if (typeof street === 'string') addr.street = street;
    if (typeof city === 'string') addr.city = city;
    if (typeof state === 'string') addr.state = state;
    if (typeof zipCode === 'string') addr.zip_code = zipCode;
    if (typeof additionalInstructions === 'string') addr.additional_instructions = additionalInstructions;
    if (typeof setAsDefault === 'boolean' && setAsDefault) {
      addresses.forEach((a) => { a.is_default = false; });
      addr.is_default = true;
    }
    addr.updated_at = this._nowISO();
    addresses[idx] = addr;
    this._saveToStorage('addresses', addresses);
    return {
      address: addr,
      addresses
    };
  }

  // 52) deleteSavedAddress(addressId)

  deleteSavedAddress(addressId) {
    let addresses = this._getFromStorage('addresses', []);
    addresses = addresses.filter((a) => a.id !== addressId);
    this._saveToStorage('addresses', addresses);
    return {
      addresses
    };
  }

  // 53) setDefaultSavedAddress(addressId)

  setDefaultSavedAddress(addressId) {
    const addresses = this._getFromStorage('addresses', []);
    addresses.forEach((a) => {
      a.is_default = a.id === addressId;
    });
    this._saveToStorage('addresses', addresses);
    return {
      addresses
    };
  }

  // 54) getSupportInquiryOptions()

  getSupportInquiryOptions() {
    const inquiryTypes = [
      {
        value: 'service_customization',
        label: 'Service customization',
        description: 'Questions about customizing or adding services to your plan.'
      },
      {
        value: 'general_question',
        label: 'General question',
        description: 'Questions about how our service works.'
      },
      {
        value: 'billing',
        label: 'Billing',
        description: 'Questions about charges, invoices, or payments.'
      },
      {
        value: 'technical_issue',
        label: 'Technical issue',
        description: 'Problems using the website or booking tools.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Anything else you need help with.'
      }
    ];

    const preferredContactMethods = ['phone', 'email'];
    const contactTimeWindows = ['9_11_am', '11_1_pm', '1_3_pm', '3_5_pm', '5_7_pm'];

    return {
      inquiryTypes,
      preferredContactMethods,
      contactTimeWindows
    };
  }

  // 55) submitSupportRequest(...)

  submitSupportRequest(
    inquiryType,
    subject,
    message,
    contactName,
    contactEmail,
    contactPhone,
    preferredContactMethod,
    preferredContactTimeWindow,
    wantsUpdates
  ) {
    const requests = this._getFromStorage('support_requests', []);
    const now = this._nowISO();
    const supportRequest = {
      id: this._generateId('sr'),
      inquiry_type: inquiryType,
      subject: subject || '',
      message,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      preferred_contact_method: preferredContactMethod,
      preferred_contact_time_window: preferredContactTimeWindow || null,
      wants_updates: !!wantsUpdates,
      created_at: now,
      status: 'submitted'
    };
    requests.push(supportRequest);
    this._saveToStorage('support_requests', requests);
    localStorage.setItem('last_support_request_id', supportRequest.id);
    return {
      supportRequest
    };
  }

  // 56) getSupportRequestConfirmationDetails(supportRequestId)

  getSupportRequestConfirmationDetails(supportRequestId) {
    const requests = this._getFromStorage('support_requests', []);
    const sr = requests.find((r) => r.id === supportRequestId) || null;
    const contactSummary = {
      preferredMethod: sr ? sr.preferred_contact_method : null,
      preferredTimeWindow: sr ? sr.preferred_contact_time_window : null
    };
    return {
      supportRequest: sr,
      contactSummary,
      expectedResponseTimeHours: 24
    };
  }

  // 57) getAboutPageContent()

  getAboutPageContent() {
    // If an override is stored, use it; otherwise return default copy
    const stored = this._getFromStorage('about_page_content', null);
    if (stored) return stored;

    return {
      companyMission: 'We make it effortless to keep your home sparkling clean with vetted cleaners, transparent pricing, and flexible scheduling.',
      serviceAreas: ['San Francisco', 'Oakland', 'Berkeley', 'Surrounding neighborhoods'],
      ecoFriendlyApproach: 'Many of our cleaners can use eco-friendly, low-scent products on request. Just toggle the eco-friendly option when booking.',
      vettedCleanersInfo: 'All cleaners are identity-verified and pass a detailed background screening before they join the platform.',
      callToActionText: 'Ready for a cleaner home? Book your next visit in under two minutes.'
    };
  }

  // 58) getFAQEntries(category?)

  getFAQEntries(category) {
    const faqs = this._getFromStorage('faq_entries', []);
    if (!category) return faqs;
    return faqs.filter((f) => f.category === category);
  }

  // 59) getPolicyContent(policyType)

  getPolicyContent(policyType) {
    const policies = this._getFromStorage('policy_documents', []);
    const policy = policies.find((p) => p.policyType === policyType) || null;
    if (policy) return policy;
    // Fallback minimal policy structure
    return {
      policyType,
      title: policyType === 'terms_of_service' ? 'Terms of Service' : policyType === 'privacy_policy' ? 'Privacy Policy' : 'Policy',
      content: ''
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