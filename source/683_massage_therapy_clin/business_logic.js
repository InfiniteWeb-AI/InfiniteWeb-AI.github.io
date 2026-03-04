/* eslint-disable no-var */
// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    this._getNextIdCounter(); // ensure idCounter is initialized
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Helper to ensure a key exists and is initialized to a JSON-serializable value
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Entity tables (arrays of records)
    ensureKey('services', []);
    ensureKey('service_durations', []);
    ensureKey('therapists', []);
    ensureKey('reviews', []);
    ensureKey('appointment_slots', []);
    ensureKey('appointments', []);
    ensureKey('packages', []);
    ensureKey('membership_plans', []);
    ensureKey('membership_enrollments', []);
    ensureKey('gift_card_purchases', []);
    ensureKey('promotions', []);
    // Single-cart model: we still store an array of carts, usually length 1
    ensureKey('cart', []);
    ensureKey('cart_items', []);
    ensureKey('prenatal_intake_submissions', []);
    ensureKey('corporate_services', []);
    ensureKey('corporate_quote_requests', []);
    ensureKey('form_definitions', []);

    // Optional homepage benefits (can be managed externally; we don't seed to avoid mocked data)
    ensureKey('homepage_key_benefits', []);

    // Global id counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      // If parsing fails, reset to empty array to avoid breaking logic
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

  _nowISO() {
    return new Date().toISOString();
  }

  _findById(collection, id) {
    if (!Array.isArray(collection)) return null;
    return collection.find(function (item) { return item && item.id === id; }) || null;
  }

  // ----------------------
  // Generic FK resolution helpers (used in getters)
  // ----------------------

  _attachServiceToServiceDurations(durations) {
    const services = this._getFromStorage('services');
    return (durations || []).map((d) => {
      const service = services.find((s) => s.id === d.service_id) || null;
      return Object.assign({}, d, { service: service });
    });
  }

  _attachFKsToAppointmentSlots(slots) {
    const services = this._getFromStorage('services');
    const therapists = this._getFromStorage('therapists');
    return (slots || []).map((slot) => {
      const service = slot.service_id ? services.find((s) => s.id === slot.service_id) : null;
      const therapist = slot.therapist_id ? therapists.find((t) => t.id === slot.therapist_id) : null;
      return Object.assign({}, slot, {
        service: service || null,
        therapist: therapist || null
      });
    });
  }

  _attachFKsToReviews(reviews) {
    const therapists = this._getFromStorage('therapists');
    return (reviews || []).map((r) => {
      const therapist = therapists.find((t) => t.id === r.therapist_id) || null;
      return Object.assign({}, r, { therapist: therapist });
    });
  }

  _attachFKsToPackages(packages) {
    const services = this._getFromStorage('services');
    return (packages || []).map((p) => {
      const primaryService = services.find((s) => s.id === p.primary_service_id) || null;
      return Object.assign({}, p, { primary_service: primaryService });
    });
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts[0] || null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _recalculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter(function (ci) { return ci.cart_id === cartId; });
    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const lineTotal = typeof item.total_price === 'number'
        ? item.total_price
        : (item.unit_price || 0) * (item.quantity || 0);
      subtotal += lineTotal;
    }
    const total = subtotal; // No additional fees/taxes in this business logic layer
    return { subtotal: subtotal, total: total };
  }

  // ----------------------
  // Appointment helpers
  // ----------------------

  _createAppointmentFromSlotInternal(serviceId, serviceDurationId, appointmentSlotId, therapistId) {
    const slots = this._getFromStorage('appointment_slots');
    const serviceDurations = this._getFromStorage('service_durations');
    const appointments = this._getFromStorage('appointments');

    const slot = slots.find(function (s) { return s.id === appointmentSlotId; });
    if (!slot || slot.is_booked) {
      return { success: false, appointment: null, message: 'Selected slot is not available.' };
    }

    const serviceDuration = serviceDurations.find(function (d) { return d.id === serviceDurationId; });
    if (!serviceDuration) {
      return { success: false, appointment: null, message: 'Invalid service duration selected.' };
    }

    const appointment = {
      id: this._generateId('appt'),
      service_id: serviceId,
      service_duration_id: serviceDurationId,
      therapist_id: therapistId || slot.therapist_id || null,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      price: serviceDuration.price,
      status: 'draft',
      client_name: null,
      client_phone: null,
      client_email: null,
      promotion_id: null,
      promo_code: null,
      discount_amount: 0,
      created_at: this._nowISO()
    };

    appointments.push(appointment);

    // Note: do not mark slot as permanently booked in this layer so that
    // sample data remains reusable across multiple guided booking flows.
    // Downstream systems (e.g. real booking engine) would enforce exclusivity.
    this._saveToStorage('appointments', appointments);
    // Intentionally do not modify or persist appointment_slots here.

    return { success: true, appointment: appointment, message: 'Draft appointment created.' };
  }

  _isPromotionActiveNow(promotion) {
    if (!promotion || !promotion.is_active) return false;
    const now = new Date();
    if (promotion.start_date) {
      const start = new Date(promotion.start_date);
      if (now < start) return false;
    }
    if (promotion.end_date) {
      const end = new Date(promotion.end_date);
      if (now > end) return false;
    }
    return true;
  }

  _applyPromotionToAppointmentInternal(appointment, promotion) {
    if (!appointment || !promotion) {
      return { success: false, appointment: appointment, promotion: promotion, message: 'Invalid appointment or promotion.' };
    }

    if (!this._isPromotionActiveNow(promotion)) {
      return { success: false, appointment: appointment, promotion: promotion, message: 'Promotion is not currently active.' };
    }

    const services = this._getFromStorage('services');
    const serviceDurations = this._getFromStorage('service_durations');

    const service = services.find((s) => s.id === appointment.service_id) || null;
    const serviceDuration = serviceDurations.find((d) => d.id === appointment.service_duration_id) || null;

    // Validate applicability by service
    if (promotion.applicable_service_ids && promotion.applicable_service_ids.length > 0) {
      if (!promotion.applicable_service_ids.includes(appointment.service_id)) {
        return { success: false, appointment: appointment, promotion: promotion, message: 'Promotion does not apply to this service.' };
      }
    }

    if (promotion.applicable_service_names && promotion.applicable_service_names.length > 0 && service) {
      if (!promotion.applicable_service_names.includes(service.name)) {
        return { success: false, appointment: appointment, promotion: promotion, message: 'Promotion does not apply to this service name.' };
      }
    }

    // Validate applicability by duration
    if (promotion.applicable_duration_minutes && promotion.applicable_duration_minutes.length > 0 && serviceDuration) {
      if (!promotion.applicable_duration_minutes.includes(serviceDuration.duration_minutes)) {
        return { success: false, appointment: appointment, promotion: promotion, message: 'Promotion does not apply to this duration.' };
      }
    }

    // All checks passed: calculate discount
    const basePrice = appointment.price || 0;
    let discountAmount = 0;

    if (promotion.discount_type === 'percent') {
      discountAmount = (basePrice * (promotion.discount_value / 100));
    } else if (promotion.discount_type === 'fixed_amount') {
      discountAmount = promotion.discount_value;
    }

    if (discountAmount < 0) discountAmount = 0;
    if (discountAmount > basePrice) discountAmount = basePrice;

    // Round to 2 decimals
    discountAmount = Math.round(discountAmount * 100) / 100;

    appointment.promotion_id = promotion.id;
    appointment.promo_code = promotion.promo_code;
    appointment.discount_amount = discountAmount;

    // Persist updated appointment
    const appointments = this._getFromStorage('appointments');
    const idx = appointments.findIndex((a) => a.id === appointment.id);
    if (idx !== -1) {
      appointments[idx] = appointment;
      this._saveToStorage('appointments', appointments);
    }

    return {
      success: true,
      appointment: appointment,
      promotion: promotion,
      message: 'Promotion applied successfully.'
    };
  }

  // ----------------------
  // Date/time helpers
  // ----------------------

  _getDayOfWeekKey(date) {
    // 0=Sunday...6=Saturday
    const day = date.getDay();
    switch (day) {
      case 0: return 'sunday';
      case 1: return 'monday';
      case 2: return 'tuesday';
      case 3: return 'wednesday';
      case 4: return 'thursday';
      case 5: return 'friday';
      case 6: return 'saturday';
      default: return '';
    }
  }

  _parseTimeToMinutes(timeStr) {
    // timeStr expected format 'HH:MM' in 24h
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1. getHomePageHighlights
  getHomePageHighlights() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const promotions = this._getFromStorage('promotions').filter((p) => this._isPromotionActiveNow(p));

    let featuredServices = services.filter((s) => s.is_featured);
    if (!featuredServices || featuredServices.length === 0) {
      featuredServices = services.slice(0, 3);
    }

    const firstTimeClientPromotions = promotions.filter((p) => p.is_first_time_client);
    const otherPromotions = promotions.filter((p) => !p.is_first_time_client);

    const keyBenefits = this._getFromStorage('homepage_key_benefits');

    return {
      featuredServices: featuredServices,
      keyBenefits: Array.isArray(keyBenefits) ? keyBenefits : [],
      firstTimeClientPromotions: firstTimeClientPromotions,
      otherPromotions: otherPromotions
    };
  }

  // 2. getServicesList
  getServicesList() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    return services;
  }

  // 3. getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const serviceDurations = this._getFromStorage('service_durations');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        service: null,
        defaultDuration: null,
        availableDurations: [],
        indications: [],
        contraindications: [],
        notes: ''
      };
    }

    const durationsForService = serviceDurations.filter((d) => d.service_id === serviceId && d.is_active);
    const defaultDuration = durationsForService.find((d) => d.is_default) || durationsForService[0] || null;

    const availableDurationsWithService = this._attachServiceToServiceDurations(durationsForService);
    const defaultDurationWithService = defaultDuration ? this._attachServiceToServiceDurations([defaultDuration])[0] : null;

    return {
      service: service,
      defaultDuration: defaultDurationWithService,
      availableDurations: availableDurationsWithService,
      indications: service.indications || [],
      contraindications: service.contraindications || [],
      notes: service.notes || ''
    };
  }

  // 4. getBookingServiceStepData(preselectedServiceId, preselectedTherapistId)
  getBookingServiceStepData(preselectedServiceId, preselectedTherapistId) {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const serviceDurations = this._getFromStorage('service_durations').filter((d) => d.is_active);

    let defaultServiceId = preselectedServiceId || (services[0] ? services[0].id : null);

    // If preselectedServiceId is invalid, fall back to first available service
    if (defaultServiceId && !services.find((s) => s.id === defaultServiceId)) {
      defaultServiceId = services[0] ? services[0].id : null;
    }

    const durationsForDefault = serviceDurations.filter((d) => d.service_id === defaultServiceId);
    const availableDurationsWithService = this._attachServiceToServiceDurations(durationsForDefault);

    let preselectedTherapist = null;
    if (preselectedTherapistId) {
      const therapists = this._getFromStorage('therapists');
      preselectedTherapist = therapists.find((t) => t.id === preselectedTherapistId) || null;
    }

    return {
      availableServices: services,
      defaultServiceId: defaultServiceId,
      availableDurations: availableDurationsWithService,
      preselectedTherapist: preselectedTherapist || undefined
    };
  }

  // 5. getServiceDurationsForBooking(serviceId, therapistId)
  getServiceDurationsForBooking(serviceId, therapistId) {
    // therapistId is currently unused in this implementation but kept for interface compatibility
    const serviceDurations = this._getFromStorage('service_durations');
    const durationsForService = serviceDurations.filter((d) => d.service_id === serviceId && d.is_active);
    return this._attachServiceToServiceDurations(durationsForService);
  }

  // 6. searchAppointmentSlots(serviceId, serviceDurationId, therapistId, startDate, endDate, daysOfWeek, timeWindow, view)
  searchAppointmentSlots(serviceId, serviceDurationId, therapistId, startDate, endDate, daysOfWeek, timeWindow, view) {
    const slots = this._getFromStorage('appointment_slots');
    const serviceDurations = this._getFromStorage('service_durations');

    const duration = serviceDurations.find((d) => d.id === serviceDurationId) || null;
    const requiredMinutes = duration ? duration.duration_minutes : null;

    // Parse date range: startDate and endDate are 'YYYY-MM-DD'
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;

    const daysFilter = Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek.map((d) => String(d).toLowerCase()) : null;

    const startMinutes = timeWindow && timeWindow.startTime ? this._parseTimeToMinutes(timeWindow.startTime) : null;
    const endMinutes = timeWindow && timeWindow.endTime ? this._parseTimeToMinutes(timeWindow.endTime) : null;

    const filtered = slots.filter((slot) => {
      if (slot.is_booked) return false;
      if (slot.service_id && slot.service_id !== serviceId) return false;
      if (therapistId && slot.therapist_id && slot.therapist_id !== therapistId) return false;

      const startDt = new Date(slot.start_datetime);
      const endDt = new Date(slot.end_datetime);

      if (start && startDt < start) return false;
      if (end && startDt > end) return false;

      if (daysFilter) {
        const dayKey = this._getDayOfWeekKey(startDt);
        if (!daysFilter.includes(dayKey)) return false;
      }

      if (startMinutes !== null || endMinutes !== null) {
        const minutesOfDay = startDt.getUTCHours() * 60 + startDt.getUTCMinutes();
        if (startMinutes !== null && minutesOfDay < startMinutes) return false;
        if (endMinutes !== null && minutesOfDay > endMinutes) return false;
      }

      if (requiredMinutes !== null) {
        const diffMinutes = (endDt.getTime() - startDt.getTime()) / 60000;
        if (diffMinutes + 0.0001 < requiredMinutes) return false; // small epsilon
      }

      return true;
    });

    return this._attachFKsToAppointmentSlots(filtered);
  }

  // 7. createDraftAppointmentFromSlot(serviceId, serviceDurationId, appointmentSlotId, therapistId)
  createDraftAppointmentFromSlot(serviceId, serviceDurationId, appointmentSlotId, therapistId) {
    const result = this._createAppointmentFromSlotInternal(serviceId, serviceDurationId, appointmentSlotId, therapistId);
    if (!result.success) {
      return null;
    }
    return result.appointment;
  }

  // 8. getAppointmentSummary(appointmentId)
  getAppointmentSummary(appointmentId) {
    const appointments = this._getFromStorage('appointments');
    const services = this._getFromStorage('services');
    const serviceDurations = this._getFromStorage('service_durations');
    const therapists = this._getFromStorage('therapists');
    const promotions = this._getFromStorage('promotions');

    const appointment = appointments.find((a) => a.id === appointmentId) || null;
    if (!appointment) {
      return {
        appointment: null,
        service: null,
        serviceDuration: null,
        therapist: null,
        promotion: null,
        pricing: {
          basePrice: 0,
          discountAmount: 0,
          finalPrice: 0
        }
      };
    }

    const service = services.find((s) => s.id === appointment.service_id) || null;
    const serviceDuration = serviceDurations.find((d) => d.id === appointment.service_duration_id) || null;
    const therapist = appointment.therapist_id ? (therapists.find((t) => t.id === appointment.therapist_id) || null) : null;
    const promotion = appointment.promotion_id ? (promotions.find((p) => p.id === appointment.promotion_id) || null) : null;

    const basePrice = appointment.price || (serviceDuration ? serviceDuration.price : 0) || 0;
    const discountAmount = appointment.discount_amount || 0;
    const finalPrice = Math.max(0, basePrice - discountAmount);

    return {
      appointment: appointment,
      service: service,
      serviceDuration: serviceDuration,
      therapist: therapist || undefined,
      promotion: promotion || undefined,
      pricing: {
        basePrice: basePrice,
        discountAmount: discountAmount,
        finalPrice: finalPrice
      }
    };
  }

  // 9. updateAppointmentClientInfo(appointmentId, clientName, clientPhone, clientEmail)
  updateAppointmentClientInfo(appointmentId, clientName, clientPhone, clientEmail) {
    const appointments = this._getFromStorage('appointments');
    const idx = appointments.findIndex((a) => a.id === appointmentId);
    if (idx === -1) {
      return { success: false, appointment: null, message: 'Appointment not found.' };
    }

    const appt = appointments[idx];
    appt.client_name = clientName;
    appt.client_phone = clientPhone;
    appt.client_email = clientEmail;

    appointments[idx] = appt;
    this._saveToStorage('appointments', appointments);

    return { success: true, appointment: appt, message: 'Client information updated.' };
  }

  // 10. applyPromotionToAppointment(appointmentId, promoCode)
  applyPromotionToAppointment(appointmentId, promoCode) {
    const appointments = this._getFromStorage('appointments');
    const promotions = this._getFromStorage('promotions');

    const appointment = appointments.find((a) => a.id === appointmentId) || null;
    if (!appointment) {
      return { success: false, appointment: null, promotion: null, message: 'Appointment not found.' };
    }

    const normalizedCode = (promoCode || '').trim().toLowerCase();
    if (!normalizedCode) {
      return { success: false, appointment: appointment, promotion: null, message: 'Promo code is empty.' };
    }

    const promotion = promotions.find((p) => String(p.promo_code || '').toLowerCase() === normalizedCode) || null;
    if (!promotion) {
      return { success: false, appointment: appointment, promotion: null, message: 'Promotion not found for the given code.' };
    }

    return this._applyPromotionToAppointmentInternal(appointment, promotion);
  }

  // 11. confirmAppointment(appointmentId, billingDetails)
  confirmAppointment(appointmentId, billingDetails) {
    const appointments = this._getFromStorage('appointments');
    const idx = appointments.findIndex((a) => a.id === appointmentId);
    if (idx === -1) {
      return { success: false, appointment: null, message: 'Appointment not found.' };
    }

    const appt = appointments[idx];
    appt.status = 'booked';

    // Optionally store minimal billing metadata on the appointment under a non-schema field
    if (billingDetails && typeof billingDetails === 'object') {
      appt.billing_details = {
        billingAddressLine1: billingDetails.billingAddressLine1 || null,
        billingCity: billingDetails.billingCity || null,
        billingZip: billingDetails.billingZip || null,
        paymentMethodLast4: billingDetails.paymentMethodLast4 || null
      };
    }

    appointments[idx] = appt;
    this._saveToStorage('appointments', appointments);

    return { success: true, appointment: appt, message: 'Appointment confirmed.' };
  }

  // 12. getTherapistFilterOptions()
  getTherapistFilterOptions() {
    const therapists = this._getFromStorage('therapists').filter((t) => t.is_active);
    const services = this._getFromStorage('services');

    const specialtyMap = {};

    therapists.forEach((t) => {
      if (!Array.isArray(t.specialties)) return;
      t.specialties.forEach((spec) => {
        if (!spec) return;
        // spec could be a service id or name
        const serviceById = services.find((s) => s.id === spec);
        const serviceByName = services.find((s) => s.name === spec);
        const svc = serviceById || serviceByName;
        if (svc && !specialtyMap[svc.id]) {
          specialtyMap[svc.id] = {
            serviceId: svc.id,
            serviceName: svc.name
          };
        }
      });
    });

    const specialties = Object.keys(specialtyMap).map((k) => specialtyMap[k]);

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating (High to Low)' },
      { value: 'rating_asc', label: 'Rating (Low to High)' },
      { value: 'name_asc', label: 'Name (A–Z)' }
    ];

    return {
      specialties: specialties,
      sortOptions: sortOptions
    };
  }

  // 13. getTherapists(specializationServiceId, minRating, minReviewCount, sortBy)
  getTherapists(specializationServiceId, minRating, minReviewCount, sortBy) {
    let therapists = this._getFromStorage('therapists').filter((t) => t.is_active);

    if (specializationServiceId) {
      therapists = therapists.filter((t) => {
        if (!Array.isArray(t.specialties)) return false;
        return t.specialties.includes(specializationServiceId);
      });
    }

    if (typeof minRating === 'number') {
      therapists = therapists.filter((t) => (t.rating || 0) >= minRating);
    }

    if (typeof minReviewCount === 'number') {
      therapists = therapists.filter((t) => (t.review_count || t.reviewCount || 0) >= minReviewCount);
    }

    const sortKey = sortBy || 'rating_desc';
    therapists.sort((a, b) => {
      if (sortKey === 'rating_asc') {
        return (a.rating || 0) - (b.rating || 0);
      }
      if (sortKey === 'name_asc') {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      }
      // default rating_desc
      return (b.rating || 0) - (a.rating || 0);
    });

    return therapists;
  }

  // 14. getTherapistProfile(therapistId)
  getTherapistProfile(therapistId) {
    const therapists = this._getFromStorage('therapists');
    const services = this._getFromStorage('services');
    const reviews = this._getFromStorage('reviews');

    const therapist = therapists.find((t) => t.id === therapistId) || null;
    if (!therapist) {
      return { therapist: null, services: [], reviews: [] };
    }

    const therapistServicesMap = {};
    if (Array.isArray(therapist.specialties)) {
      therapist.specialties.forEach((spec) => {
        if (!spec) return;
        const serviceById = services.find((s) => s.id === spec);
        const serviceByName = services.find((s) => s.name === spec);
        const svc = serviceById || serviceByName;
        if (svc && !therapistServicesMap[svc.id]) {
          therapistServicesMap[svc.id] = svc;
        }
      });
    }

    const therapistServices = Object.keys(therapistServicesMap).map((k) => therapistServicesMap[k]);

    const therapistReviews = reviews.filter((r) => r.therapist_id === therapistId);
    const therapistReviewsWithFK = this._attachFKsToReviews(therapistReviews);

    return {
      therapist: therapist,
      services: therapistServices,
      reviews: therapistReviewsWithFK
    };
  }

  // 15. getPackageFilterOptions()
  getPackageFilterOptions() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const packagesRaw = this._getFromStorage('packages').filter((p) => p.is_active);

    const serviceIdSet = new Set();
    packagesRaw.forEach((p) => {
      if (p.primary_service_id) serviceIdSet.add(p.primary_service_id);
    });

    const servicesWithPackages = services.filter((s) => serviceIdSet.has(s.id));

    // Derive session count options from existing packages
    const sessionCountsSet = new Set();
    packagesRaw.forEach((p) => {
      if (typeof p.number_of_sessions === 'number') {
        sessionCountsSet.add(p.number_of_sessions);
      }
    });
    const sessionCountOptions = Array.from(sessionCountsSet).sort((a, b) => a - b);

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'sessions_high_to_low', label: 'Sessions: High to Low' }
    ];

    return {
      services: servicesWithPackages,
      sessionCountOptions: sessionCountOptions,
      sortOptions: sortOptions
    };
  }

  // 16. getPackages(primaryServiceId, minSessions, maxTotalPrice, sortBy)
  getPackages(primaryServiceId, minSessions, maxTotalPrice, sortBy) {
    let packagesRaw = this._getFromStorage('packages').filter((p) => p.is_active);

    if (primaryServiceId) {
      packagesRaw = packagesRaw.filter((p) => p.primary_service_id === primaryServiceId);
    }

    if (typeof minSessions === 'number') {
      packagesRaw = packagesRaw.filter((p) => (p.number_of_sessions || 0) >= minSessions);
    }

    if (typeof maxTotalPrice === 'number') {
      packagesRaw = packagesRaw.filter((p) => (p.total_price || 0) <= maxTotalPrice);
    }

    const sortKey = sortBy || 'price_low_to_high';
    packagesRaw.sort((a, b) => {
      if (sortKey === 'price_high_to_low') {
        return (b.total_price || 0) - (a.total_price || 0);
      }
      if (sortKey === 'sessions_high_to_low') {
        return (b.number_of_sessions || 0) - (a.number_of_sessions || 0);
      }
      // default price_low_to_high
      return (a.total_price || 0) - (b.total_price || 0);
    });

    return this._attachFKsToPackages(packagesRaw);
  }

  // 17. getPackageDetail(packageId)
  getPackageDetail(packageId) {
    const packagesRaw = this._getFromStorage('packages');
    const pkg = packagesRaw.find((p) => p.id === packageId) || null;
    if (!pkg) return null;

    return this._attachFKsToPackages([pkg])[0];
  }

  // 18. addPackageToCart(packageId, quantity)
  addPackageToCart(packageId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const packagesRaw = this._getFromStorage('packages');
    const pkg = packagesRaw.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return { success: false, cart: null, cartItems: [], message: 'Package not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    // Try to find existing cart item for this package
    let cartItem = cartItems.find((ci) => ci.cart_id === cart.id && ci.item_type === 'package' && ci.item_ref_id === packageId);

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.total_price = cartItem.unit_price * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'package',
        item_ref_id: packageId,
        name: pkg.name,
        quantity: qty,
        unit_price: pkg.total_price,
        total_price: pkg.total_price * qty,
        added_at: this._nowISO()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
      cart.item_ids.push(cartItem.id);
    }

    // Update cart updated_at
    const carts = this._getFromStorage('cart');
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx !== -1) {
      cart.updated_at = this._nowISO();
      carts[cIdx] = cart;
      this._saveToStorage('cart', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      cart: cart,
      cartItems: cartItems.filter((ci) => ci.cart_id === cart.id),
      message: 'Package added to cart.'
    };
  }

  // 19. getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const priceRangeSuggestions = [
      { label: 'Under $100', maxMonthlyPrice: 100 },
      { label: '$100–$150', minMonthlyPrice: 100, maxMonthlyPrice: 150 },
      { label: 'Above $150', minMonthlyPrice: 150 }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'name_asc', label: 'Name (A–Z)' }
    ];

    return {
      priceRangeSuggestions: priceRangeSuggestions,
      hasNinetyMinuteSessionFilterSupported: true,
      sortOptions: sortOptions
    };
  }

  // 20. getMembershipPlans(includesNinetyMinuteSession, maxMonthlyPrice, sortBy)
  getMembershipPlans(includesNinetyMinuteSession, maxMonthlyPrice, sortBy) {
    let plans = this._getFromStorage('membership_plans').filter((p) => p.is_active);

    if (includesNinetyMinuteSession === true) {
      plans = plans.filter((p) => p.includes_90_min_session === true);
    }

    if (typeof maxMonthlyPrice === 'number') {
      plans = plans.filter((p) => (p.monthly_price || 0) <= maxMonthlyPrice);
    }

    const sortKey = sortBy || 'price_low_to_high';
    plans.sort((a, b) => {
      if (sortKey === 'price_high_to_low') {
        return (b.monthly_price || 0) - (a.monthly_price || 0);
      }
      if (sortKey === 'name_asc') {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      }
      // default price_low_to_high
      return (a.monthly_price || 0) - (b.monthly_price || 0);
    });

    return plans;
  }

  // 21. getMembershipPlanDetail(membershipPlanId)
  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    return plan || null;
  }

  // 22. submitMembershipEnrollment(membershipPlanId, clientName, clientPhone, clientEmail, billingAddressLine1, billingCity, billingZip)
  submitMembershipEnrollment(membershipPlanId, clientName, clientPhone, clientEmail, billingAddressLine1, billingCity, billingZip) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return { success: false, enrollment: null, message: 'Membership plan not found.' };
    }

    const enrollments = this._getFromStorage('membership_enrollments');

    const enrollment = {
      id: this._generateId('memb_enroll'),
      membership_plan_id: membershipPlanId,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      billing_address_line1: billingAddressLine1,
      billing_city: billingCity,
      billing_zip: billingZip,
      status: 'pending',
      created_at: this._nowISO()
    };

    enrollments.push(enrollment);
    this._saveToStorage('membership_enrollments', enrollments);

    return {
      success: true,
      enrollment: enrollment,
      message: 'Membership enrollment submitted.'
    };
  }

  // 23. getGiftCardOptions()
  getGiftCardOptions() {
    const deliveryTypes = ['email', 'physical', 'printable'];
    const presetAmounts = [50, 75, 100, 120, 150, 200];
    const occasions = ['birthday', 'anniversary', 'thank_you', 'holiday', 'just_because', 'other'];

    return {
      deliveryTypes: deliveryTypes,
      presetAmounts: presetAmounts,
      occasions: occasions
    };
  }

  // 24. createGiftCardAndAddToCart(deliveryType, amount, occasion, recipientName, recipientEmail, senderName, senderEmail, message)
  createGiftCardAndAddToCart(deliveryType, amount, occasion, recipientName, recipientEmail, senderName, senderEmail, message) {
    const giftCards = this._getFromStorage('gift_card_purchases');

    const giftCard = {
      id: this._generateId('giftcard'),
      delivery_type: deliveryType,
      amount: amount,
      occasion: occasion || null,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      sender_name: senderName,
      sender_email: senderEmail,
      message: message || '',
      status: 'in_cart',
      created_at: this._nowISO()
    };

    giftCards.push(giftCard);
    this._saveToStorage('gift_card_purchases', giftCards);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const nameParts = [];
    nameParts.push('$' + String(amount) + ' gift card');
    if (occasion) {
      nameParts.push('(' + occasion + ')');
    }

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'gift_card',
      item_ref_id: giftCard.id,
      name: nameParts.join(' '),
      quantity: 1,
      unit_price: amount,
      total_price: amount,
      added_at: this._nowISO()
    };

    cartItems.push(cartItem);
    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);

    const carts = this._getFromStorage('cart');
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx !== -1) {
      cart.updated_at = this._nowISO();
      carts[cIdx] = cart;
      this._saveToStorage('cart', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      giftCard: giftCard,
      cart: cart,
      cartItem: cartItem,
      message: 'Gift card created and added to cart.'
    };
  }

  // 25. getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    const packages = this._getFromStorage('packages');
    const giftCards = this._getFromStorage('gift_card_purchases');
    const membershipPlans = this._getFromStorage('membership_plans');

    const itemsDetailed = cartItems.map((ci) => {
      let pkg = null;
      let giftCard = null;
      let membershipPlan = null;

      if (ci.item_type === 'package') {
        pkg = packages.find((p) => p.id === ci.item_ref_id) || null;
      } else if (ci.item_type === 'gift_card') {
        giftCard = giftCards.find((g) => g.id === ci.item_ref_id) || null;
      } else if (ci.item_type === 'membership') {
        membershipPlan = membershipPlans.find((m) => m.id === ci.item_ref_id) || null;
      }

      return {
        cartItem: ci,
        itemType: ci.item_type,
        package: pkg || undefined,
        giftCard: giftCard || undefined,
        membershipPlan: membershipPlan || undefined
      };
    });

    const totals = this._recalculateCartTotals(cart.id);

    return {
      cart: cart,
      items: itemsDetailed,
      subtotal: totals.subtotal,
      total: totals.total
    };
  }

  // 26. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, updatedItem: null, subtotal: 0, total: 0 };
    }

    const cartItem = cartItems[idx];
    const cartId = cartItem.cart_id;

    if (quantity <= 0) {
      // Remove the item
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);

      // Also remove from cart.item_ids
      const carts = this._getFromStorage('cart');
      const cart = carts.find((c) => c.id === cartId) || null;
      if (cart && Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
        const cIdx = carts.findIndex((c) => c.id === cartId);
        if (cIdx !== -1) {
          cart.updated_at = this._nowISO();
          carts[cIdx] = cart;
          this._saveToStorage('cart', carts);
        }
      }

      const totalsAfterRemoval = this._recalculateCartTotals(cartId);
      return {
        success: true,
        cart: cart || null,
        updatedItem: null,
        subtotal: totalsAfterRemoval.subtotal,
        total: totalsAfterRemoval.total
      };
    }

    cartItem.quantity = quantity;
    cartItem.total_price = cartItem.unit_price * quantity;
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || null;
    if (cart) {
      const cIdx = carts.findIndex((c) => c.id === cartId);
      cart.updated_at = this._nowISO();
      carts[cIdx] = cart;
      this._saveToStorage('cart', carts);
    }

    const totals = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart: cart || null,
      updatedItem: cartItem,
      subtotal: totals.subtotal,
      total: totals.total
    };
  }

  // 27. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, subtotal: 0, total: 0 };
    }

    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || null;
    if (cart && Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
      const cIdx = carts.findIndex((c) => c.id === cartId);
      if (cIdx !== -1) {
        cart.updated_at = this._nowISO();
        carts[cIdx] = cart;
        this._saveToStorage('cart', carts);
      }
    }

    const totals = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart: cart || null,
      subtotal: totals.subtotal,
      total: totals.total
    };
  }

  // 28. getActivePromotions(isFirstTimeClient, serviceId, durationMinutes, minDiscountPercent)
  getActivePromotions(isFirstTimeClient, serviceId, durationMinutes, minDiscountPercent) {
    let promotions = this._getFromStorage('promotions').filter((p) => this._isPromotionActiveNow(p));

    if (isFirstTimeClient === true) {
      promotions = promotions.filter((p) => p.is_first_time_client === true);
    }

    if (serviceId) {
      promotions = promotions.filter((p) => {
        if (Array.isArray(p.applicable_service_ids) && p.applicable_service_ids.length > 0) {
          return p.applicable_service_ids.includes(serviceId);
        }
        return true;
      });
    }

    if (typeof durationMinutes === 'number') {
      promotions = promotions.filter((p) => {
        if (Array.isArray(p.applicable_duration_minutes) && p.applicable_duration_minutes.length > 0) {
          return p.applicable_duration_minutes.includes(durationMinutes);
        }
        return true;
      });
    }

    if (typeof minDiscountPercent === 'number') {
      promotions = promotions.filter((p) => {
        if (p.discount_type === 'percent') {
          return (p.discount_value || 0) >= minDiscountPercent;
        }
        // For fixed_amount promotions, treat them as always eligible for this filter
        return true;
      });
    }

    return promotions;
  }

  // 29. getActiveFormDefinitions()
  getActiveFormDefinitions() {
    const forms = this._getFromStorage('form_definitions').filter((f) => f.is_active);
    return forms;
  }

  // 30. submitPrenatalIntakeForm(...)
  submitPrenatalIntakeForm(clientName, clientPhone, clientEmail, isPregnant, trimester, weeksPregnant, primaryConcern, hasHighRiskPregnancy, hasMajorComplications, hasOccasionalBackPain, otherMedicalHistory, preferredPressureLevel, preferredPositioning) {
    const submissions = this._getFromStorage('prenatal_intake_submissions');
    const formDefs = this._getFromStorage('form_definitions');

    const prenatalForm = formDefs.find((f) => f.form_type === 'prenatal_intake' && f.is_active) || null;

    const submission = {
      id: this._generateId('prenatal'),
      form_id: prenatalForm ? prenatalForm.id : null,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      is_pregnant: !!isPregnant,
      trimester: trimester,
      weeks_pregnant: typeof weeksPregnant === 'number' ? weeksPregnant : null,
      primary_concern: primaryConcern,
      has_high_risk_pregnancy: !!hasHighRiskPregnancy,
      has_major_complications: !!hasMajorComplications,
      has_occasional_back_pain: !!hasOccasionalBackPain,
      other_medical_history: otherMedicalHistory || '',
      preferred_pressure_level: preferredPressureLevel || null,
      preferred_positioning: Array.isArray(preferredPositioning) ? preferredPositioning : [],
      submitted_at: this._nowISO()
    };

    submissions.push(submission);
    this._saveToStorage('prenatal_intake_submissions', submissions);

    return {
      success: true,
      submission: submission,
      message: 'Prenatal intake form submitted.'
    };
  }

  // 31. getCorporateServices()
  getCorporateServices() {
    const services = this._getFromStorage('corporate_services').filter((s) => s.is_active);
    return services;
  }

  // 32. submitCorporateQuoteRequest(...)
  submitCorporateQuoteRequest(companyName, contactName, contactEmail, contactPhone, numberOfEmployees, requestedServiceType, eventDate, timeWindow, budget, additionalDetails) {
    const quoteRequests = this._getFromStorage('corporate_quote_requests');

    let eventDateTime = null;
    if (eventDate) {
      // eventDate is 'YYYY-MM-DD'; store as ISO date at midnight
      const dt = new Date(eventDate + 'T00:00:00');
      eventDateTime = dt.toISOString();
    }

    const numericBudget = typeof budget === 'number' ? budget : null;

    const quoteRequest = {
      id: this._generateId('corp_quote'),
      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      number_of_employees: numberOfEmployees,
      requested_service_type: requestedServiceType,
      event_date: eventDateTime,
      time_window: timeWindow,
      budget: numericBudget,
      additional_details: additionalDetails || '',
      status: 'new',
      submitted_at: this._nowISO()
    };

    quoteRequests.push(quoteRequest);
    this._saveToStorage('corporate_quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequest: quoteRequest,
      message: 'Corporate quote request submitted.'
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
