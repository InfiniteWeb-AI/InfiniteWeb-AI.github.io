/* eslint-disable no-var */
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
  }

  // -----------------------
  // Initialization & Storage
  // -----------------------

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'services',
      'sessions',
      'session_services',
      'packages',
      'package_services',
      'technicians',
      'appointments',
      'products',
      'gift_card_templates',
      'gift_card_purchases',
      'promotions',
      'applied_promotions',
      'carts',
      'cart_items',
      'contact_requests',
      'policies'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Singleton / meta records
    if (!localStorage.getItem('checkout_contact_info')) {
      localStorage.setItem('checkout_contact_info', JSON.stringify(null));
    }
    if (!localStorage.getItem('about_info')) {
      localStorage.setItem('about_info', JSON.stringify(null));
    }
    if (!localStorage.getItem('salon_contact_info')) {
      localStorage.setItem('salon_contact_info', JSON.stringify(null));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Current cart/session ids
    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }
    if (!localStorage.getItem('current_session_id')) {
      localStorage.setItem('current_session_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getJSON(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null || typeof parsed === 'undefined' ? defaultValue : parsed;
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -----------------------
  // Date / Time helpers
  // -----------------------

  _toDateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  _addMinutesToISO(isoString, minutes) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
  }

  _resolveSearchDate(date, searchMode) {
    const today = new Date();
    if (searchMode === 'next_week') {
      return this._toDateString(this._addDays(today, 7));
    }
    if (searchMode === 'earliest_available' || searchMode === 'same_day') {
      return this._toDateString(today);
    }
    if (searchMode === 'specific_date' && date) {
      return date;
    }
    // default to provided date or today
    return date || this._toDateString(today);
  }

  _buildDateTime(dateStr, hour, minute) {
    // Build a local datetime string without timezone information
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d, hour, minute, 0, 0);
    return dt.toISOString();
  }

  // Salon generic working hours used for availability generation only
  _getSalonOpeningHoursForDate(/* dateStr */) {
    // 09:00 - 19:00 by default
    return { openHour: 9, closeHour: 19 };
  }

  // -----------------------
  // Cart / Session helpers
  // -----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find(c => c.id === currentCartId) || null;
    }

    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: now,
        updated_at: now,
        subtotal: 0,
        tax: 0,
        total: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _getOrCreateCurrentSession() {
    let sessions = this._getFromStorage('sessions');
    let currentSessionId = localStorage.getItem('current_session_id') || '';
    let session = null;

    if (currentSessionId) {
      session = sessions.find(s => s.id === currentSessionId) || null;
    }

    if (!session || session.status !== 'building') {
      const now = new Date().toISOString();
      session = {
        id: this._generateId('session'),
        name: null,
        status: 'building',
        total_duration_minutes: 0,
        total_price: 0,
        created_at: now,
        notes: ''
      };
      sessions.push(session);
      this._saveToStorage('sessions', sessions);
      localStorage.setItem('current_session_id', session.id);
    }

    return session;
  }

  _recalculateSessionTotals(sessionId) {
    const sessions = this._getFromStorage('sessions');
    const sessionServices = this._getFromStorage('session_services');

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const lines = sessionServices.filter(ss => ss.session_id === sessionId);
    let totalDuration = 0;
    let totalPrice = 0;
    for (const line of lines) {
      totalDuration += Number(line.duration_minutes) || 0;
      totalPrice += Number(line.price) || 0;
    }

    session.total_duration_minutes = totalDuration;
    session.total_price = totalPrice;

    this._saveToStorage('sessions', sessions);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += Number(item.line_total) || 0;
    }

    let tax = 0; // tax handling could be added here if needed

    // Recompute applied promotions
    let appliedPromotions = this._getFromStorage('applied_promotions');
    const promotions = this._getFromStorage('promotions');
    const now = new Date().toISOString();

    let discountTotal = 0;
    for (const ap of appliedPromotions.filter(ap => ap.cart_id === cart.id)) {
      const promo = promotions.find(p => p.id === ap.promotion_id && p.is_active);
      if (!promo) {
        ap.discount_amount = 0;
        continue;
      }
      const discount = this._calculateDiscountForPromotion(cart, promo, subtotal);
      ap.discount_amount = discount;
      ap.applied_at = now;
      discountTotal += discount;
    }

    // Persist updated promotions
    this._saveToStorage('applied_promotions', appliedPromotions);

    const total = Math.max(0, subtotal + tax - discountTotal);

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    cart.updated_at = now;

    // Save cart
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
  }

  _calculateDiscountForPromotion(cart, promotion, currentSubtotal) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const appointments = this._getFromStorage('appointments');

    const promoType = promotion.promo_type; // 'percentage_off' | 'fixed_amount_off'
    const targetType = promotion.target_type; // 'waxing_package', 'service', 'product', 'entire_order'
    const value = Number(promotion.discount_value) || 0;

    let discount = 0;

    // Time window check
    const now = new Date();
    if (promotion.starts_at) {
      const starts = new Date(promotion.starts_at);
      if (now < starts) return 0;
    }
    if (promotion.ends_at) {
      const ends = new Date(promotion.ends_at);
      if (now > ends) return 0;
    }

    if (targetType === 'waxing_package') {
      // Apply only to package appointments
      const packageAppointments = cartItems
        .filter(ci => ci.item_type === 'appointment')
        .map(ci => appointments.find(a => a.id === ci.appointment_id))
        .filter(a => a && a.appointment_type === 'package');

      for (const appt of packageAppointments) {
        const price = Number(appt.price) || 0;
        if (promotion.min_package_price && price < promotion.min_package_price) {
          continue;
        }
        if (promoType === 'percentage_off') {
          discount += (price * value) / 100;
        } else if (promoType === 'fixed_amount_off') {
          discount += value;
        }
      }
    } else if (targetType === 'entire_order') {
      const subtotal = currentSubtotal != null ? currentSubtotal : cart.subtotal;
      if (promotion.min_order_total && subtotal < promotion.min_order_total) {
        return 0;
      }
      if (promoType === 'percentage_off') {
        discount = (subtotal * value) / 100;
      } else if (promoType === 'fixed_amount_off') {
        discount = Math.min(subtotal, value);
      }
    } else if (targetType === 'service') {
      // Apply to all service appointments
      const serviceAppointments = cartItems
        .filter(ci => ci.item_type === 'appointment')
        .map(ci => appointments.find(a => a.id === ci.appointment_id))
        .filter(a => a && a.appointment_type === 'single_service');
      for (const appt of serviceAppointments) {
        const price = Number(appt.price) || 0;
        if (promoType === 'percentage_off') {
          discount += (price * value) / 100;
        } else if (promoType === 'fixed_amount_off') {
          discount += value;
        }
      }
    } else if (targetType === 'product') {
      const productItems = cartItems.filter(ci => ci.item_type === 'product');
      for (const item of productItems) {
        const price = Number(item.line_total) || 0;
        if (promoType === 'percentage_off') {
          discount += (price * value) / 100;
        } else if (promoType === 'fixed_amount_off') {
          discount += value;
        }
      }
    }

    if (promotion.min_order_total && (currentSubtotal || cart.subtotal) < promotion.min_order_total) {
      return 0;
    }

    return discount;
  }

  _applyPromotionToCart(cart, promotion) {
    const discount = this._calculateDiscountForPromotion(cart, promotion, null);
    if (discount <= 0) {
      // Remove any existing applied promotion for this promo & cart
      let appliedPromotions = this._getFromStorage('applied_promotions');
      const beforeLength = appliedPromotions.length;
      appliedPromotions = appliedPromotions.filter(
        ap => !(ap.cart_id === cart.id && ap.promotion_id === promotion.id)
      );
      if (appliedPromotions.length !== beforeLength) {
        this._saveToStorage('applied_promotions', appliedPromotions);
        this._recalculateCartTotals(cart);
      }
      return { success: false, appliedPromotion: null, message: 'Promotion not applicable to current cart.' };
    }

    let appliedPromotions = this._getFromStorage('applied_promotions');
    let applied = appliedPromotions.find(
      ap => ap.cart_id === cart.id && ap.promotion_id === promotion.id
    );

    const now = new Date().toISOString();

    if (!applied) {
      applied = {
        id: this._generateId('applied_promo'),
        cart_id: cart.id,
        promotion_id: promotion.id,
        promo_code: promotion.promo_code,
        discount_amount: discount,
        applied_at: now
      };
      appliedPromotions.push(applied);
    } else {
      applied.discount_amount = discount;
      applied.applied_at = now;
    }

    this._saveToStorage('applied_promotions', appliedPromotions);
    this._recalculateCartTotals(cart);

    return { success: true, appliedPromotion: applied, message: 'Promotion applied successfully.' };
  }

  // -----------------------
  // Availability helpers
  // -----------------------

  _checkAvailability(context) {
    // context: { startDateTime, durationMinutes, technicianId, ignoreAppointmentId }
    const { startDateTime, durationMinutes, technicianId, ignoreAppointmentId } = context;

    if (!startDateTime || !durationMinutes) return true;

    const start = new Date(startDateTime);
    if (isNaN(start.getTime())) return false;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const appointments = this._getFromStorage('appointments');

    for (const appt of appointments) {
      if (ignoreAppointmentId && appt.id === ignoreAppointmentId) continue;

      // If technician is specified, only check conflicts with same technician (if stored)
      if (technicianId) {
        if (appt.technician_id && appt.technician_id !== technicianId) {
          continue;
        }
      }

      const aStart = new Date(appt.start_datetime);
      const aEnd = appt.end_datetime
        ? new Date(appt.end_datetime)
        : new Date(aStart.getTime() + (Number(appt.duration_minutes) || 0) * 60000);

      if (start < aEnd && end > aStart) {
        return false; // overlapping
      }
    }

    return true;
  }

  _generateTimeSlotsForDuration(dateStr, durationMinutes, technicianId) {
    const { openHour, closeHour } = this._getSalonOpeningHoursForDate(dateStr);
    const slots = [];

    // We'll generate 30-minute increment slots within working hours
    for (let hour = openHour; hour <= closeHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startISO = this._buildDateTime(dateStr, hour, minute);
        const endISO = this._addMinutesToISO(startISO, durationMinutes);

        const startDate = new Date(startISO);
        const endDate = new Date(endISO);

        // Ensure appointment finishes before closing
        const closing = this._buildDateTime(dateStr, closeHour, 0);
        if (endDate > new Date(closing)) {
          continue;
        }

        const available = this._checkAvailability({
          startDateTime: startISO,
          durationMinutes,
          technicianId: technicianId || null,
          ignoreAppointmentId: null
        });

        if (available) {
          slots.push({ start_datetime: startISO, end_datetime: endISO });
        }
      }
    }

    return slots;
  }

  // -----------------------
  // Interfaces
  // -----------------------

  // getHomeHighlights
  getHomeHighlights() {
    const services = this._getFromStorage('services').filter(s => s.is_active);
    const packages = this._getFromStorage('packages').filter(p => p.is_active);
    const promotions = this._getFromStorage('promotions').filter(p => p.is_active);

    const featured_services = services
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 4);

    const featured_packages = packages
      .slice()
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .slice(0, 3);

    const featured_promotions = promotions;

    return { featured_services, featured_packages, featured_promotions };
  }

  // getQuickBookOptions
  getQuickBookOptions() {
    const services = this._getFromStorage('services').filter(s => s.is_active);
    const sortedServices = services
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const result = [];
    const maxItems = 5;

    for (const service of sortedServices) {
      if (result.length >= maxItems) break;
      const availability = this.getServiceAvailability(service.id, null, 'earliest_available', null);
      const slot = availability.time_slots && availability.time_slots[0];
      const technicians = this.getTechniciansForService(service.id);
      result.push({
        service,
        next_available_start_datetime: slot ? slot.start_datetime : null,
        technician: technicians[0] || null
      });
    }

    return result;
  }

  // getServiceFilterOptions
  getServiceFilterOptions() {
    const services = this._getFromStorage('services');

    const mainAreaSet = new Set();
    const areaKeySet = new Map();

    for (const s of services) {
      if (s.main_area_group) mainAreaSet.add(s.main_area_group);
      if (s.area_key) {
        areaKeySet.set(s.area_key, s.main_area_group || null);
      }
    }

    const main_area_groups = Array.from(mainAreaSet).map(value => ({
      value,
      label: this._labelForMainAreaGroup(value)
    }));

    const area_keys = Array.from(areaKeySet.entries()).map(([value, main]) => ({
      value,
      label: this._labelForAreaKey(value),
      main_area_group: main
    }));

    const duration_options = [
      { min_minutes: 0, max_minutes: 30, label: 'Up to 30 min' },
      { min_minutes: 31, max_minutes: 45, label: '31–45 min' },
      { min_minutes: 45, max_minutes: 999, label: '45 min and up' }
    ];

    const price_ranges = [
      { min_price: 0, max_price: 50, label: 'Under $50' },
      { min_price: 50, max_price: 100, label: '$50–$100' },
      { min_price: 100, max_price: 9999, label: '$100 and up' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'duration_asc', label: 'Duration: Short to Long' },
      { value: 'duration_desc', label: 'Duration: Long to Short' }
    ];

    return { main_area_groups, area_keys, duration_options, price_ranges, sort_options };
  }

  _labelForMainAreaGroup(value) {
    const map = {
      legs: 'Legs',
      arms: 'Arms',
      face: 'Face',
      brows: 'Brows',
      face_brows: 'Face & Brows',
      bikini_brazilian: 'Bikini & Brazilian',
      body: 'Body',
      men: "Men’s Waxing"
    };
    return map[value] || value;
  }

  _labelForAreaKey(value) {
    const map = {
      full_leg: 'Full Leg',
      half_leg: 'Half Leg',
      brazilian: 'Brazilian',
      underarm: 'Underarm',
      chest: 'Chest',
      back: 'Back',
      full_back: 'Full Back',
      eyebrow: 'Eyebrow',
      upper_lip: 'Upper Lip',
      chin: 'Chin'
    };
    return map[value] || value;
  }

  // listWaxingServices(filters, sort, pagination)
  listWaxingServices(filters, sort, pagination) {
    let services = this._getFromStorage('services');

    filters = filters || {};
    sort = sort || {};
    pagination = pagination || {};

    if (filters.onlyActive) {
      services = services.filter(s => s.is_active);
    }

    if (filters.mainAreaGroup) {
      services = services.filter(s => s.main_area_group === filters.mainAreaGroup);
    }

    if (filters.areaKey) {
      services = services.filter(s => s.area_key === filters.areaKey);
    }

    if (filters.genderSegment) {
      services = services.filter(s => s.gender_segment === filters.genderSegment);
    }

    if (typeof filters.minDurationMinutes === 'number') {
      services = services.filter(s => (s.duration_minutes || 0) >= filters.minDurationMinutes);
    }

    if (typeof filters.maxDurationMinutes === 'number') {
      services = services.filter(s => (s.duration_minutes || 0) <= filters.maxDurationMinutes);
    }

    if (typeof filters.minPrice === 'number') {
      services = services.filter(s => (s.base_price || 0) >= filters.minPrice);
    }

    if (typeof filters.maxPrice === 'number') {
      services = services.filter(s => (s.base_price || 0) <= filters.maxPrice);
    }

    if (filters.isMajorAreaOnly) {
      services = services.filter(s => !!s.is_major_area);
    }

    // Sorting
    const sortBy = sort.sortBy || 'price';
    const dir = (sort.sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    services = services.slice().sort((a, b) => {
      if (sortBy === 'duration') {
        return ((a.duration_minutes || 0) - (b.duration_minutes || 0)) * dir;
      }
      if (sortBy === 'popularity') {
        // no popularity metric, fall back to display_order
        return ((a.display_order || 0) - (b.display_order || 0)) * dir;
      }
      // default: price
      return ((a.base_price || 0) - (b.base_price || 0)) * dir;
    });

    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const total = services.length;
    const startIndex = (page - 1) * pageSize;
    const paged = services.slice(startIndex, startIndex + pageSize);

    return { services: paged, total, page, pageSize };
  }

  // getServiceDetails(serviceId)
  getServiceDetails(serviceId) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId) || null;

    if (!service) {
      return {
        service: null,
        preparation_notes: '',
        aftercare_notes: '',
        suggested_add_ons: []
      };
    }

    // Simple generic notes; could be overridden by stored description, but no mock records created here
    const preparation_notes = 'Please arrive 5–10 minutes early and avoid applying lotions or oils to the area beforehand.';
    const aftercare_notes = 'Avoid hot showers, sun exposure, and exfoliation on the waxed area for 24 hours.';

    const allServices = this._getFromStorage('services');
    const suggested_add_ons = allServices
      .filter(
        s =>
          s.id !== service.id &&
          s.is_active &&
          (s.main_area_group === service.main_area_group || s.main_area_group === 'aftercare')
      )
      .slice(0, 3);

    return { service, preparation_notes, aftercare_notes, suggested_add_ons };
  }

  // getServiceAvailability(serviceId, date, searchMode, technicianId)
  getServiceAvailability(serviceId, date, searchMode, technicianId) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId) || null;

    const resolvedDate = this._resolveSearchDate(date, searchMode);
    const timezone = 'America/Los_Angeles';

    if (!service) {
      return { service: null, date: resolvedDate, timezone, time_slots: [] };
    }

    const duration = Number(service.duration_minutes) || 0;
    const time_slots = this._generateTimeSlotsForDuration(resolvedDate, duration, technicianId || null);

    return { service, date: resolvedDate, timezone, time_slots };
  }

  // bookServiceAppointment(serviceId, startDateTime, technicianId, notes)
  bookServiceAppointment(serviceId, startDateTime, technicianId, notes) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId) || null;

    if (!service) {
      return { success: false, appointment: null, message: 'Service not found.' };
    }

    const duration = Number(service.duration_minutes) || 0;
    const available = this._checkAvailability({
      startDateTime,
      durationMinutes: duration,
      technicianId: technicianId || null,
      ignoreAppointmentId: null
    });

    if (!available) {
      return { success: false, appointment: null, message: 'Selected time is not available.' };
    }

    const startISO = new Date(startDateTime).toISOString();
    const endISO = this._addMinutesToISO(startISO, duration);
    const now = new Date().toISOString();

    const appointment = {
      id: this._generateId('appt'),
      appointment_type: 'single_service',
      service_id: service.id,
      session_id: null,
      package_id: null,
      technician_id: technicianId || null,
      start_datetime: startISO,
      end_datetime: endISO,
      duration_minutes: duration,
      price: Number(service.base_price) || 0,
      status: 'pending',
      created_at: now,
      notes: notes || ''
    };

    const appointments = this._getFromStorage('appointments');
    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'appointment',
      appointment_id: appointment.id,
      product_id: null,
      gift_card_purchase_id: null,
      quantity: 1,
      unit_price: appointment.price,
      line_total: appointment.price,
      description: service.name
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Track item ids in cart.items for quick reference (optional)
    if (!Array.isArray(cart.items)) cart.items = [];
    if (!cart.items.includes(cartItem.id)) cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    return { success: true, appointment, message: 'Appointment added to cart.' };
  }

  // getTechniciansForService(serviceId)
  getTechniciansForService(serviceId) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId) || null;
    if (!service) return [];

    const technicians = this._getFromStorage('technicians').filter(t => t.is_active);

    const result = technicians.filter(t => {
      if (!Array.isArray(t.specialties) || t.specialties.length === 0) return true;
      return (
        t.specialties.includes(service.area_key) ||
        t.specialties.includes(service.main_area_group)
      );
    });

    return result;
  }

  // addServiceToCurrentSession(serviceId)
  addServiceToCurrentSession(serviceId) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId) || null;
    if (!service) {
      const session = this._getOrCreateCurrentSession();
      return { session, session_services: [] };
    }

    const session = this._getOrCreateCurrentSession();
    const sessionServices = this._getFromStorage('session_services');

    const sessionService = {
      id: this._generateId('session_service'),
      session_id: session.id,
      service_id: service.id,
      quantity: 1,
      duration_minutes: Number(service.duration_minutes) || 0,
      price: Number(service.base_price) || 0
    };

    sessionServices.push(sessionService);
    this._saveToStorage('session_services', sessionServices);

    this._recalculateSessionTotals(session.id);

    return this.getCurrentSessionState();
  }

  // removeServiceFromCurrentSession(sessionServiceId)
  removeServiceFromCurrentSession(sessionServiceId) {
    let sessionServices = this._getFromStorage('session_services');
    const ss = sessionServices.find(s => s.id === sessionServiceId) || null;

    if (!ss) {
      return this.getCurrentSessionState();
    }

    const sessionId = ss.session_id;
    sessionServices = sessionServices.filter(s => s.id !== sessionServiceId);
    this._saveToStorage('session_services', sessionServices);

    this._recalculateSessionTotals(sessionId);

    return this.getCurrentSessionState();
  }

  // getCurrentSessionState()
  getCurrentSessionState() {
    const session = this._getOrCreateCurrentSession();
    const sessionServices = this._getFromStorage('session_services').filter(
      ss => ss.session_id === session.id
    );

    const services = this._getFromStorage('services');

    const enriched = sessionServices.map(ss => ({
      session_service: ss,
      service: services.find(s => s.id === ss.service_id) || null
    }));

    return { session, session_services: enriched };
  }

  // getCurrentSessionAvailability(date, searchMode, technicianId)
  getCurrentSessionAvailability(date, searchMode, technicianId) {
    const { session } = this.getCurrentSessionState();
    const resolvedDate = this._resolveSearchDate(date, searchMode);
    const timezone = 'America/Los_Angeles';

    if (!session || !session.total_duration_minutes) {
      return { session, date: resolvedDate, timezone, time_slots: [] };
    }

    const duration = Number(session.total_duration_minutes) || 0;
    const time_slots = this._generateTimeSlotsForDuration(
      resolvedDate,
      duration,
      technicianId || null
    );

    return { session, date: resolvedDate, timezone, time_slots };
  }

  // bookCustomSessionAppointment(startDateTime, technicianId, notes)
  bookCustomSessionAppointment(startDateTime, technicianId, notes) {
    const state = this.getCurrentSessionState();
    const session = state.session;

    if (!session || !session.total_duration_minutes) {
      return { success: false, appointment: null, session, message: 'Session has no services.' };
    }

    const duration = Number(session.total_duration_minutes) || 0;
    const available = this._checkAvailability({
      startDateTime,
      durationMinutes: duration,
      technicianId: technicianId || null,
      ignoreAppointmentId: null
    });

    if (!available) {
      return { success: false, appointment: null, session, message: 'Selected time is not available.' };
    }

    const startISO = new Date(startDateTime).toISOString();
    const endISO = this._addMinutesToISO(startISO, duration);
    const now = new Date().toISOString();

    const appointment = {
      id: this._generateId('appt'),
      appointment_type: 'custom_session',
      service_id: null,
      session_id: session.id,
      package_id: null,
      technician_id: technicianId || null,
      start_datetime: startISO,
      end_datetime: endISO,
      duration_minutes: duration,
      price: Number(session.total_price) || 0,
      status: 'pending',
      created_at: now,
      notes: notes || ''
    };

    const appointments = this._getFromStorage('appointments');
    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    // mark session as scheduled
    const sessions = this._getFromStorage('sessions');
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].status = 'scheduled';
      this._saveToStorage('sessions', sessions);
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'appointment',
      appointment_id: appointment.id,
      product_id: null,
      gift_card_purchase_id: null,
      quantity: 1,
      unit_price: appointment.price,
      line_total: appointment.price,
      description: session.name || 'Custom Waxing Session'
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    if (!cart.items.includes(cartItem.id)) cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    // Clear current_session_id so future builds start fresh
    localStorage.setItem('current_session_id', '');

    return { success: true, appointment, session, message: 'Custom session booked.' };
  }

  // getPackageFilterOptions
  getPackageFilterOptions() {
    const packages = this._getFromStorage('packages');
    const typeSet = new Set(packages.map(p => p.package_type).filter(Boolean));

    const typeLabelMap = {
      body_waxing_package: 'Body Waxing Packages',
      brazilian_package: 'Brazilian Packages',
      mens_package: "Men’s Packages",
      mixed_package: 'Mixed Packages',
      other: 'Other Packages'
    };

    const package_types = Array.from(typeSet).map(value => ({
      value,
      label: typeLabelMap[value] || value
    }));

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'duration_asc', label: 'Duration: Short to Long' },
      { value: 'duration_desc', label: 'Duration: Long to Short' }
    ];

    return { package_types, sort_options };
  }

  // listWaxingPackages(filters, sort, pagination)
  listWaxingPackages(filters, sort, pagination) {
    let packages = this._getFromStorage('packages');

    filters = filters || {};
    sort = sort || {};
    pagination = pagination || {};

    if (filters.onlyActive) {
      packages = packages.filter(p => p.is_active);
    }

    if (filters.packageType) {
      packages = packages.filter(p => p.package_type === filters.packageType);
    }

    if (typeof filters.minPrice === 'number') {
      packages = packages.filter(p => (p.price || 0) >= filters.minPrice);
    }

    if (typeof filters.maxPrice === 'number') {
      packages = packages.filter(p => (p.price || 0) <= filters.maxPrice);
    }

    if (typeof filters.minDurationMinutes === 'number') {
      packages = packages.filter(
        p => (p.total_duration_minutes || 0) >= filters.minDurationMinutes
      );
    }

    const sortBy = sort.sortBy || 'price';
    const dir = (sort.sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    packages = packages.slice().sort((a, b) => {
      if (sortBy === 'total_duration_minutes' || sortBy === 'duration') {
        return ((a.total_duration_minutes || 0) - (b.total_duration_minutes || 0)) * dir;
      }
      return ((a.price || 0) - (b.price || 0)) * dir;
    });

    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const total = packages.length;
    const startIndex = (page - 1) * pageSize;
    const paged = packages.slice(startIndex, startIndex + pageSize);

    return { packages: paged, total, page, pageSize };
  }

  // getPackageDetails(packageId)
  getPackageDetails(packageId) {
    const packages = this._getFromStorage('packages');
    const packageObj = packages.find(p => p.id === packageId) || null;

    const package_services = this._getFromStorage('package_services');
    const included_services = package_services
      .filter(ps => ps.package_id === packageId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Promotion hints based on active promotions
    const promotions = this._getFromStorage('promotions').filter(
      p => p.is_active && p.target_type === 'waxing_package'
    );

    const promotion_hints = [];
    if (packageObj) {
      for (const promo of promotions) {
        if (promo.min_package_price && packageObj.price < promo.min_package_price) {
          continue;
        }
        const label =
          promo.conditions_text ||
          `Eligible for promotion: ${promo.name || promo.promo_code}`;
        promotion_hints.push(label);
      }
    }

    return { package: packageObj, included_services, promotion_hints };
  }

  // getPackageAvailability(packageId, date, searchMode, technicianId)
  getPackageAvailability(packageId, date, searchMode, technicianId) {
    const packages = this._getFromStorage('packages');
    const packageObj = packages.find(p => p.id === packageId) || null;

    const resolvedDate = this._resolveSearchDate(date, searchMode);
    const timezone = 'America/Los_Angeles';

    if (!packageObj) {
      return { package: null, date: resolvedDate, timezone, time_slots: [] };
    }

    const duration = Number(packageObj.total_duration_minutes) || 0;
    const time_slots = this._generateTimeSlotsForDuration(
      resolvedDate,
      duration,
      technicianId || null
    );

    return { package: packageObj, date: resolvedDate, timezone, time_slots };
  }

  // bookPackageAppointment(packageId, startDateTime, technicianId, notes)
  bookPackageAppointment(packageId, startDateTime, technicianId, notes) {
    const packages = this._getFromStorage('packages');
    const packageObj = packages.find(p => p.id === packageId) || null;

    if (!packageObj) {
      return { success: false, appointment: null, message: 'Package not found.' };
    }

    const duration = Number(packageObj.total_duration_minutes) || 0;
    const available = this._checkAvailability({
      startDateTime,
      durationMinutes: duration,
      technicianId: technicianId || null,
      ignoreAppointmentId: null
    });

    if (!available) {
      return { success: false, appointment: null, message: 'Selected time is not available.' };
    }

    const startISO = new Date(startDateTime).toISOString();
    const endISO = this._addMinutesToISO(startISO, duration);
    const now = new Date().toISOString();

    const appointment = {
      id: this._generateId('appt'),
      appointment_type: 'package',
      service_id: null,
      session_id: null,
      package_id: packageObj.id,
      technician_id: technicianId || null,
      start_datetime: startISO,
      end_datetime: endISO,
      duration_minutes: duration,
      price: Number(packageObj.price) || 0,
      status: 'pending',
      created_at: now,
      notes: notes || ''
    };

    const appointments = this._getFromStorage('appointments');
    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'appointment',
      appointment_id: appointment.id,
      product_id: null,
      gift_card_purchase_id: null,
      quantity: 1,
      unit_price: appointment.price,
      line_total: appointment.price,
      description: packageObj.name
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    if (!cart.items.includes(cartItem.id)) cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    return { success: true, appointment, message: 'Package appointment booked.' };
  }

  // getProductFilterOptions
  getProductFilterOptions() {
    const categories = [
      { value: 'aftercare', label: 'Aftercare' },
      { value: 'skincare', label: 'Skincare' },
      { value: 'accessories', label: 'Accessories' }
    ];

    const price_ranges = [
      { min_price: 0, max_price: 25, label: 'Under $25' },
      { min_price: 25, max_price: 50, label: '$25–$50' },
      { min_price: 50, max_price: 100, label: '$50 and up' }
    ];

    const rating_options = [
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const fulfillment_options = [
      { value: 'in_store_pickup', label: 'In-store Pickup' },
      { value: 'shipping', label: 'Shipping' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return { categories, price_ranges, rating_options, fulfillment_options, sort_options };
  }

  // listProducts(filters, sort, pagination)
  listProducts(filters, sort, pagination) {
    let products = this._getFromStorage('products');

    filters = filters || {};
    sort = sort || {};
    pagination = pagination || {};

    if (filters.onlyActive) {
      products = products.filter(p => p.is_active);
    }

    if (filters.categoryKey) {
      products = products.filter(p => p.category_key === filters.categoryKey);
    }

    if (typeof filters.minPrice === 'number') {
      products = products.filter(p => (p.price || 0) >= filters.minPrice);
    }

    if (typeof filters.maxPrice === 'number') {
      products = products.filter(p => (p.price || 0) <= filters.maxPrice);
    }

    if (typeof filters.minRating === 'number') {
      products = products.filter(p => (p.rating || 0) >= filters.minRating);
    }

    if (filters.fulfillmentMode) {
      products = products.filter(
        p => Array.isArray(p.fulfillment_options) && p.fulfillment_options.includes(filters.fulfillmentMode)
      );
    }

    if (filters.onlyFreeInStorePickup) {
      products = products.filter(p => !!p.is_free_in_store_pickup);
    }

    const sortBy = sort.sortBy || 'price';
    const dir = (sort.sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    products = products.slice().sort((a, b) => {
      if (sortBy === 'rating') {
        return ((a.rating || 0) - (b.rating || 0)) * dir;
      }
      return ((a.price || 0) - (b.price || 0)) * dir;
    });

    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const total = products.length;
    const startIndex = (page - 1) * pageSize;
    const paged = products.slice(startIndex, startIndex + pageSize);

    return { products: paged, total, page, pageSize };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    return products.find(p => p.id === productId) || null;
  }

  // addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return { success: false, cart_item_id: null, message: 'Product not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      ci => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === product.id
    );

    const unitPrice = Number(product.price) || 0;

    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.unit_price = unitPrice;
      cartItem.line_total = cartItem.quantity * unitPrice;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        appointment_id: null,
        product_id: product.id,
        gift_card_purchase_id: null,
        quantity,
        unit_price: unitPrice,
        line_total: unitPrice * quantity,
        description: product.name
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    if (!cart.items.includes(cartItem.id)) cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    return { success: true, cart_item_id: cartItem.id, message: 'Product added to cart.' };
  }

  // getGiftCardTemplates(usageType)
  getGiftCardTemplates(usageType) {
    let templates = this._getFromStorage('gift_card_templates').filter(t => t.is_active);
    if (usageType) {
      templates = templates.filter(t => t.usage_type === usageType);
    }
    return templates;
  }

  // getGiftCardTemplateDetails(templateId)
  getGiftCardTemplateDetails(templateId) {
    const templates = this._getFromStorage('gift_card_templates');
    return templates.find(t => t.id === templateId) || null;
  }

  // createGiftCardPurchaseAndAddToCart(...)
  createGiftCardPurchaseAndAddToCart(
    templateId,
    amount,
    deliveryMethod,
    sendTiming,
    scheduledSendDate,
    recipientName,
    recipientEmail,
    message,
    fromName
  ) {
    const template = this.getGiftCardTemplateDetails(templateId);
    if (!template) {
      return {
        success: false,
        gift_card_purchase: null,
        cart_item_id: null,
        message: 'Gift card template not found.'
      };
    }

    amount = Number(amount) || 0;
    if (amount <= 0) {
      return {
        success: false,
        gift_card_purchase: null,
        cart_item_id: null,
        message: 'Invalid gift card amount.'
      };
    }

    if (typeof template.min_amount === 'number' && amount < template.min_amount) {
      return {
        success: false,
        gift_card_purchase: null,
        cart_item_id: null,
        message: 'Amount below minimum for this gift card.'
      };
    }
    if (typeof template.max_amount === 'number' && amount > template.max_amount) {
      return {
        success: false,
        gift_card_purchase: null,
        cart_item_id: null,
        message: 'Amount above maximum for this gift card.'
      };
    }

    if (Array.isArray(template.preset_amounts) && template.preset_amounts.length > 0) {
      // If preset amounts exist, require amount to be one of them
      const allowed = template.preset_amounts.includes(amount);
      if (!allowed) {
        return {
          success: false,
          gift_card_purchase: null,
          cart_item_id: null,
          message: 'Amount not allowed for this gift card.'
        };
      }
    }

    if (sendTiming === 'schedule_for_later' && !scheduledSendDate) {
      return {
        success: false,
        gift_card_purchase: null,
        cart_item_id: null,
        message: 'Scheduled send date is required.'
      };
    }

    let scheduled_send_date = null;
    if (sendTiming === 'schedule_for_later' && scheduledSendDate) {
      // Store as ISO datetime at 09:00 local
      const [y, m, d] = scheduledSendDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d, 9, 0, 0, 0);
      scheduled_send_date = dt.toISOString();
    }

    const now = new Date().toISOString();

    const purchase = {
      id: this._generateId('gift_purchase'),
      template_id: template.id,
      amount,
      delivery_method: deliveryMethod,
      send_timing: sendTiming,
      scheduled_send_date: scheduled_send_date,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      message: message || '',
      from_name: fromName || ''
    };

    const purchases = this._getFromStorage('gift_card_purchases');
    purchases.push(purchase);
    this._saveToStorage('gift_card_purchases', purchases);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      appointment_id: null,
      product_id: null,
      gift_card_purchase_id: purchase.id,
      quantity: 1,
      unit_price: amount,
      line_total: amount,
      description: template.name
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    if (!cart.items.includes(cartItem.id)) cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    return {
      success: true,
      gift_card_purchase: purchase,
      cart_item_id: cartItem.id,
      message: 'Gift card added to cart.'
    };
  }

  // getActivePromotions(targetType)
  getActivePromotions(targetType) {
    const promotions = this._getFromStorage('promotions');
    const now = new Date();
    return promotions.filter(p => {
      if (!p.is_active) return false;
      if (targetType && p.target_type !== targetType) return false;
      if (p.starts_at && now < new Date(p.starts_at)) return false;
      if (p.ends_at && now > new Date(p.ends_at)) return false;
      return true;
    });
  }

  // applyPromoCode(promoCode)
  applyPromoCode(promoCode) {
    if (!promoCode) {
      return { success: false, applied_promotion: null, message: 'Promo code is required.' };
    }

    const codeNormalized = String(promoCode).trim().toLowerCase();
    const promotions = this.getActivePromotions(null);

    const promotion = promotions.find(
      p => String(p.promo_code || '').toLowerCase() === codeNormalized
    );

    if (!promotion) {
      return { success: false, applied_promotion: null, message: 'Promo code not found or inactive.' };
    }

    const cart = this._getOrCreateCart();
    const result = this._applyPromotionToCart(cart, promotion);
    return {
      success: result.success,
      applied_promotion: result.appliedPromotion,
      message: result.message
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const cartItemsAll = this._getFromStorage('cart_items');
    const appointments = this._getFromStorage('appointments');
    const services = this._getFromStorage('services');
    const sessions = this._getFromStorage('sessions');
    const packages = this._getFromStorage('packages');
    const products = this._getFromStorage('products');
    const giftPurchases = this._getFromStorage('gift_card_purchases');
    const giftTemplates = this._getFromStorage('gift_card_templates');

    const cart_items_raw = cartItemsAll.filter(ci => ci.cart_id === cart.id);

    const cart_items = cart_items_raw.map(ci => {
      let appointment = null;
      let service = null;
      let session = null;
      let packageObj = null;
      let product = null;
      let gift_card_purchase = null;
      let gift_card_template = null;

      if (ci.item_type === 'appointment' && ci.appointment_id) {
        appointment = appointments.find(a => a.id === ci.appointment_id) || null;
        if (appointment) {
          if (appointment.appointment_type === 'single_service' && appointment.service_id) {
            service = services.find(s => s.id === appointment.service_id) || null;
          } else if (
            appointment.appointment_type === 'custom_session' &&
            appointment.session_id
          ) {
            session = sessions.find(s => s.id === appointment.session_id) || null;
          } else if (appointment.appointment_type === 'package' && appointment.package_id) {
            packageObj = packages.find(p => p.id === appointment.package_id) || null;
          }
        }
      } else if (ci.item_type === 'product' && ci.product_id) {
        product = products.find(p => p.id === ci.product_id) || null;
      } else if (ci.item_type === 'gift_card' && ci.gift_card_purchase_id) {
        gift_card_purchase =
          giftPurchases.find(g => g.id === ci.gift_card_purchase_id) || null;
        if (gift_card_purchase) {
          gift_card_template =
            giftTemplates.find(t => t.id === gift_card_purchase.template_id) || null;
        }
      }

      return {
        cart_item: ci,
        appointment,
        service,
        session,
        package: packageObj,
        product,
        gift_card_purchase,
        gift_card_template
      };
    });

    const applied_promotions = this._getFromStorage('applied_promotions').filter(
      ap => ap.cart_id === cart.id
    );

    return { cart, cart_items, applied_promotions };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;

    if (!item) {
      return { success: false, message: 'Cart item not found.' };
    }

    const cartId = item.cart_id;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartId) || null;
    if (cart) {
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
      this._recalculateCartTotals(cart);
    }

    return { success: true, message: 'Cart item removed.' };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity) || 0;
    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }

    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;

    if (!item) {
      return { success: false, message: 'Cart item not found.' };
    }

    item.quantity = quantity;
    item.line_total = (Number(item.unit_price) || 0) * quantity;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id) || null;
    if (cart) {
      this._recalculateCartTotals(cart);
    }

    return { success: true, message: 'Cart item quantity updated.' };
  }

  // updateAppointmentSchedule(appointmentId, newStartDateTime, technicianId)
  updateAppointmentSchedule(appointmentId, newStartDateTime, technicianId) {
    const appointments = this._getFromStorage('appointments');
    const appointment = appointments.find(a => a.id === appointmentId) || null;

    if (!appointment) {
      return { success: false, appointment: null, message: 'Appointment not found.' };
    }

    const duration = Number(appointment.duration_minutes) || 0;
    const available = this._checkAvailability({
      startDateTime: newStartDateTime,
      durationMinutes: duration,
      technicianId: technicianId || appointment.technician_id || null,
      ignoreAppointmentId: appointment.id
    });

    if (!available) {
      return { success: false, appointment, message: 'Selected time is not available.' };
    }

    const startISO = new Date(newStartDateTime).toISOString();
    const endISO = this._addMinutesToISO(startISO, duration);

    appointment.start_datetime = startISO;
    appointment.end_datetime = endISO;
    if (technicianId) {
      appointment.technician_id = technicianId;
    }

    this._saveToStorage('appointments', appointments);

    // Recalculate cart totals in case promotions depend on schedule (unlikely but safe)
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.appointment_id === appointment.id) || null;
    if (item) {
      const cart = carts.find(c => c.id === item.cart_id) || null;
      if (cart) {
        this._recalculateCartTotals(cart);
      }
    }

    return { success: true, appointment, message: 'Appointment updated.' };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const summary = this.getCartSummary();
    const storedContact = this._getJSON('checkout_contact_info', null);

    const contact_info = storedContact || {
      full_name: '',
      email: '',
      phone: '',
      notify_by_email: true,
      notify_by_sms: false
    };

    return {
      cart: summary.cart,
      cart_items: summary.cart_items,
      applied_promotions: summary.applied_promotions,
      contact_info
    };
  }

  // saveCheckoutContactInfo(contactInfo)
  saveCheckoutContactInfo(contactInfo) {
    if (!contactInfo || !contactInfo.fullName || !contactInfo.email) {
      return { success: false, message: 'Full name and email are required.' };
    }

    const stored = {
      full_name: contactInfo.fullName,
      email: contactInfo.email,
      phone: contactInfo.phone || '',
      notify_by_email:
        typeof contactInfo.notifyByEmail === 'boolean' ? contactInfo.notifyByEmail : true,
      notify_by_sms:
        typeof contactInfo.notifyBySms === 'boolean' ? contactInfo.notifyBySms : false
    };

    this._saveToStorage('checkout_contact_info', stored);

    return { success: true, message: 'Contact information saved.' };
  }

  // submitContactRequest(name, email, phone, subject, message)
  submitContactRequest(name, email, phone, subject, messageText) {
    if (!name || !email || !messageText) {
      return { success: false, message: 'Name, email, and message are required.' };
    }

    const requests = this._getFromStorage('contact_requests');
    const now = new Date().toISOString();

    const request = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || '',
      subject: subject || '',
      message: messageText,
      created_at: now
    };

    requests.push(request);
    this._saveToStorage('contact_requests', requests);

    return { success: true, message: 'Contact request submitted.' };
  }

  // getSalonAboutInfo()
  getSalonAboutInfo() {
    const about = this._getJSON('about_info', null);
    if (!about) {
      return {
        headline: '',
        story: '',
        hygiene_standards: '',
        specializations: []
      };
    }
    return {
      headline: about.headline || '',
      story: about.story || '',
      hygiene_standards: about.hygiene_standards || '',
      specializations: Array.isArray(about.specializations) ? about.specializations : []
    };
  }

  // getTechnicianProfiles()
  getTechnicianProfiles() {
    const technicians = this._getFromStorage('technicians');
    return technicians.filter(t => t.is_active);
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getJSON('salon_contact_info', null);
    if (!info) {
      return {
        address: '',
        phone: '',
        email: '',
        map_embed_reference: '',
        opening_hours: []
      };
    }
    return {
      address: info.address || '',
      phone: info.phone || '',
      email: info.email || '',
      map_embed_reference: info.map_embed_reference || '',
      opening_hours: Array.isArray(info.opening_hours) ? info.opening_hours : []
    };
  }

  // getPoliciesContent(policyType)
  getPoliciesContent(policyType) {
    const policies = this._getFromStorage('policies');
    if (policyType) {
      return policies.filter(p => p.policy_type === policyType);
    }
    return policies;
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
