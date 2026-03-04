'use strict';

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
    this.idCounter = this._getNextIdCounter();
  }

  // --------------------------
  // Storage helpers
  // --------------------------

  _initStorage() {
    const keys = [
      // Core entities
      'locations',
      'storage_unit_sizes',
      'storage_plans',
      'size_guide_scenarios',
      'storage_calculator_items',
      'promotions',
      'supply_categories',
      'supply_products',
      'cart',
      'cart_items',
      'bookings',
      'booking_events',
      'access_time_windows',
      'access_requests',
      'contact_messages',
      // Session-like helpers
      'current_cart_id',
      'current_booking_id',
      'managed_booking_id',
      'current_access_request_id'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (localStorage.getItem(key) === null) {
        // For ids we store scalar, others arrays
        if (key === 'current_cart_id' || key === 'current_booking_id' || key === 'managed_booking_id' || key === 'current_access_request_id') {
          localStorage.setItem(key, '');
        } else {
          localStorage.setItem(key, '[]');
        }
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed additional demo data needed for higher-level flows if not present
    try {
      // ----- Storage unit sizes (e.g., 10' x 10') -----
      var sizeDataRaw = localStorage.getItem('storage_unit_sizes') || '[]';
      var sizeData;
      try {
        sizeData = JSON.parse(sizeDataRaw);
      } catch (e) {
        sizeData = [];
      }
      var hasTenByTen = sizeData.some(function (s) { return s && s.id === 'size_10x10'; });
      if (!hasTenByTen) {
        sizeData.push({
          id: 'size_10x10',
          name: "10' x 10'",
          width_feet: 10,
          length_feet: 10,
          height_feet: 8,
          area_sqft: 100,
          capacity_cubic_ft: 800,
          short_description: 'Fits contents of a typical 1–2 bedroom apartment.',
          display_order: 4,
          is_active: true
        });
        localStorage.setItem('storage_unit_sizes', JSON.stringify(sizeData));
      }

      // ----- Storage plans (standard / climate / 3-month standard) -----
      var plansRaw = localStorage.getItem('storage_plans') || '[]';
      var plansData;
      try {
        plansData = JSON.parse(plansRaw);
      } catch (e) {
        plansData = [];
      }
      var hasStandard = plansData.some(function (p) { return p && p.plan_type === 'standard_storage'; });
      var hasClimate = plansData.some(function (p) { return p && p.plan_type === 'climate_controlled_storage'; });

      if (!hasStandard || !hasClimate) {
        if (!hasStandard) {
          plansData.push({
            id: 'plan_sf_mission_10x10_std_6m',
            location_id: 'loc_sf_mission_94110',
            unit_size_id: 'size_10x10',
            plan_type: 'standard_storage',
            name: "10' x 10' Standard Storage – 6 Months (Mission District)",
            description: 'Drive-up standard storage unit for a 1–2 bedroom apartment.',
            rental_term_type: 'fixed_months',
            rental_term_months: 6,
            monthly_price: 160,
            total_price: 960,
            fees_description: '',
            inclusions: [],
            restrictions: '',
            is_active: true,
            display_order: 50
          });
        }
        if (!hasClimate) {
          plansData.push({
            id: 'plan_sf_mission_10x10_climate_6m',
            location_id: 'loc_sf_mission_94110',
            unit_size_id: 'size_10x10',
            plan_type: 'climate_controlled_storage',
            name: "10' x 10' Climate-Controlled Storage – 6 Months (Mission District)",
            description: 'Climate-controlled storage unit for temperature-sensitive items.',
            rental_term_type: 'fixed_months',
            rental_term_months: 6,
            monthly_price: 185,
            total_price: 1110,
            fees_description: '',
            inclusions: [],
            restrictions: '',
            is_active: true,
            display_order: 51
          });
        }
        localStorage.setItem('storage_plans', JSON.stringify(plansData));
      }

      // Ensure a 3-month 5' x 10' standard plan for size-guide flows
      var has5x10Std3m = plansData.some(function (p) {
        return p && p.unit_size_id === 'size_5x10' && p.plan_type === 'standard_storage' && p.rental_term_type === 'fixed_months' && p.rental_term_months === 3;
      });
      if (!has5x10Std3m) {
        plansData.push({
          id: 'plan_sf_mission_5x10_std_3m',
          location_id: 'loc_sf_mission_94110',
          unit_size_id: 'size_5x10',
          plan_type: 'standard_storage',
          name: "5' x 10' Standard Storage – 3 Months (Mission District)",
          description: 'Standard storage unit sized for a 1 bedroom apartment.',
          rental_term_type: 'fixed_months',
          rental_term_months: 3,
          monthly_price: 135,
          total_price: 405,
          fees_description: '',
          inclusions: [],
          restrictions: '',
          is_active: true,
          display_order: 52
        });
        localStorage.setItem('storage_plans', JSON.stringify(plansData));
      }

      // Ensure a month-to-month standard plan for quote flows
      var hasStdMtm = plansData.some(function (p) {
        return p && p.plan_type === 'standard_storage' && p.rental_term_type === 'month_to_month';
      });
      if (!hasStdMtm) {
        plansData.push({
          id: 'plan_sf_mission_5x10_std_mtm',
          location_id: 'loc_sf_mission_94110',
          unit_size_id: 'size_5x10',
          plan_type: 'standard_storage',
          name: "5' x 10' Standard Storage – Month-to-month (Mission District)",
          description: 'Flexible month-to-month standard storage.',
          rental_term_type: 'month_to_month',
          rental_term_months: 1,
          monthly_price: 139,
          total_price: null,
          fees_description: '',
          inclusions: [],
          restrictions: '',
          is_active: true,
          display_order: 53
        });
        localStorage.setItem('storage_plans', JSON.stringify(plansData));
      }

      // ----- Storage calculator items (queen bed, medium boxes) -----
      var calcRaw = localStorage.getItem('storage_calculator_items') || '[]';
      var calcItems;
      try {
        calcItems = JSON.parse(calcRaw);
      } catch (e) {
        calcItems = [];
      }
      var hasBedQueen = calcItems.some(function (i) { return i && i.slug === 'bed_queen'; });
      var hasMediumBox = calcItems.some(function (i) { return i && (i.slug === 'medium_box' || i.slug === 'box_medium' || i.slug === 'medium_boxes'); });
      if (!hasBedQueen) {
        calcItems.push({
          id: 'item_bed_queen',
          name: 'Queen Bed',
          slug: 'bed_queen',
          category: 'furniture',
          description: 'Queen mattress and box spring or platform bed.',
          cubic_feet_per_unit: 150,
          default_quantity: 0,
          display_order: 13,
          is_active: true
        });
      }
      if (!hasMediumBox) {
        calcItems.push({
          id: 'item_box_medium_calc',
          name: 'Medium Boxes',
          slug: 'medium_box',
          category: 'boxes',
          description: 'Standard medium moving box.',
          cubic_feet_per_unit: 5,
          default_quantity: 0,
          display_order: 20,
          is_active: true
        });
      }
      if (!hasBedQueen || !hasMediumBox) {
        localStorage.setItem('storage_calculator_items', JSON.stringify(calcItems));
      }

      // ----- Packing supplies (tape) -----
      var prodRaw = localStorage.getItem('supply_products') || '[]';
      var prodItems;
      try {
        prodItems = JSON.parse(prodRaw);
      } catch (e) {
        prodItems = [];
      }
      var hasTape = prodItems.some(function (p) { return p && p.category_id === 'tape_protective_wrap'; });
      if (!hasTape) {
        prodItems.push({
          id: 'prod_packing_tape_single',
          name: 'Packing Tape  Single Roll',
          description: 'Standard clear packing tape roll.',
          category_id: 'tape_protective_wrap',
          sku: 'TP-CLR-1',
          unit_price: 4.99,
          image_url: '',
          size_label: '',
          is_box_pack: false,
          min_quantity: 1,
          max_quantity: 50,
          display_order: 1,
          is_active: true
        });
        localStorage.setItem('supply_products', JSON.stringify(prodItems));
      }
    } catch (e) {
      // Best-effort seeding only; ignore errors
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const raw = localStorage.getItem('idCounter');
    const current = raw ? parseInt(raw, 10) : 1000;
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

  _parseDate(dateStr) {
    // Expect 'YYYY-MM-DD'
    return new Date(dateStr + 'T00:00:00');
  }

  _formatDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = dateObj.getDate().toString().padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  _addMonths(dateObj, months) {
    const d = new Date(dateObj.getTime());
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return d;
  }

  // --------------------------
  // Cart helpers
  // --------------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find(function (c) { return c.id === currentCartId; }) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      subtotal += Number(itemsForCart[i].line_total) || 0;
    }

    // Simple tax rule: 8% (could be adjusted or made dynamic)
    const tax = +(subtotal * 0.08).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    cart.items = itemsForCart.map(function (ci) { return ci.id; });
    cart.subtotal = +subtotal.toFixed(2);
    cart.tax = tax;
    cart.total = total;
    cart.updated_at = this._nowISO();

    // Persist cart and items
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    return cart;
  }

  // --------------------------
  // Booking helpers
  // --------------------------

  _getOrCreateBookingDraft(initialData) {
    const bookings = this._getFromStorage('bookings');
    let currentBookingId = localStorage.getItem('current_booking_id') || '';
    let booking = null;

    if (currentBookingId) {
      booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;
    }

    if (!booking) {
      const id = this._generateId('booking');
      const reservationNumber = 'RB' + this._getNextIdCounter();
      booking = {
        id: id,
        reservation_number: reservationNumber,
        status: 'draft',
        location_id: initialData && initialData.location_id ? initialData.location_id : null,
        storage_plan_id: initialData && initialData.storage_plan_id ? initialData.storage_plan_id : null,
        unit_size_id: initialData && initialData.unit_size_id ? initialData.unit_size_id : null,
        plan_type: initialData && initialData.plan_type ? initialData.plan_type : null,
        rental_term_type: initialData && initialData.rental_term_type ? initialData.rental_term_type : 'fixed_months',
        rental_term_months: initialData && initialData.rental_term_months ? initialData.rental_term_months : 1,
        rental_start_date: initialData && initialData.rental_start_date ? initialData.rental_start_date : null,
        rental_end_date: null,
        storage_location_type: initialData && initialData.storage_location_type ? initialData.storage_location_type : 'at_customer_address',
        monthly_rate: 0,
        estimated_total: 0,
        applied_promo_code: null,
        promo_discount_amount_first_month: 0,
        promo_description: null,
        customer_first_name: '',
        customer_last_name: '',
        customer_email: '',
        customer_phone: '',
        service_address_line1: '',
        service_address_line2: '',
        service_city: '',
        service_state: '',
        service_zip: initialData && initialData.service_zip ? initialData.service_zip : '',
        notes: '',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      bookings.push(booking);
      this._saveToStorage('bookings', bookings);
      localStorage.setItem('current_booking_id', booking.id);
    }

    return booking;
  }

  _updateBookingInStorage(booking) {
    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(function (b) { return b.id === booking.id; });
    if (idx >= 0) {
      bookings[idx] = booking;
    } else {
      bookings.push(booking);
    }
    this._saveToStorage('bookings', bookings);
  }

  _updateBookingPricing(booking) {
    const plans = this._getFromStorage('storage_plans');
    let plan = null;
    if (booking.storage_plan_id) {
      plan = plans.find(function (p) { return p.id === booking.storage_plan_id; }) || null;
    } else {
      // Try to find a plan based on location, unit size, plan type, and term
      plan = plans.find(function (p) {
        if (!p.is_active) return false;
        if (booking.location_id && p.location_id !== booking.location_id) return false;
        if (booking.unit_size_id && p.unit_size_id !== booking.unit_size_id) return false;
        if (booking.plan_type && p.plan_type !== booking.plan_type) return false;
        if (booking.rental_term_type && p.rental_term_type !== booking.rental_term_type) return false;
        if (booking.rental_term_type === 'fixed_months' && booking.rental_term_months && p.rental_term_months !== booking.rental_term_months) return false;
        return true;
      }) || null;
      if (plan) {
        booking.storage_plan_id = plan.id;
      }
    }

    if (plan) {
      booking.monthly_rate = Number(plan.monthly_price) || 0;
      if (plan.total_price != null) {
        booking.estimated_total = Number(plan.total_price) || 0;
      } else {
        const months = booking.rental_term_months || plan.rental_term_months || 1;
        booking.estimated_total = +(booking.monthly_rate * months).toFixed(2);
      }
      booking.plan_type = plan.plan_type;
      booking.rental_term_type = plan.rental_term_type;
      booking.rental_term_months = booking.rental_term_months || plan.rental_term_months;
      booking.location_id = booking.location_id || plan.location_id;
      booking.unit_size_id = booking.unit_size_id || plan.unit_size_id;
    } else {
      booking.monthly_rate = booking.monthly_rate || 0;
      if (!booking.estimated_total) {
        const months = booking.rental_term_months || 1;
        booking.estimated_total = +(booking.monthly_rate * months).toFixed(2);
      }
    }

    booking.updated_at = this._nowISO();
    this._updateBookingInStorage(booking);

    return booking;
  }

  // --------------------------
  // Location / distance helpers
  // --------------------------

  _calculateDistanceMiles(zip, location) {
    if (!zip || !location) return Number.POSITIVE_INFINITY;
    if (location.zip === zip) return 0;

    // For this demo, we do not have real ZIP coordinates available. Instead of
    // trying to approximate using service radii (which can be quite large and
    // cause radius-based searches to return no results), treat any non-matching
    // ZIP as a small but non-zero distance.
    return 5;
  }

  _findNearestLocationForZip(zip) {
    const locations = this._getFromStorage('locations').filter(function (loc) { return loc.is_active !== false; });
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const dist = this._calculateDistanceMiles(zip, loc);
      if (dist < bestDist) {
        bestDist = dist;
        best = loc;
      }
    }

    return best;
  }

  // --------------------------
  // Promotion helpers
  // --------------------------

  _validatePromoCode(promoCode, booking, cart) {
    const promotions = this._getFromStorage('promotions');
    const code = (promoCode || '').trim().toUpperCase();
    if (!code) {
      return {
        success: false,
        message: 'Promo code is required.',
        applied_to_booking: false,
        applied_to_supplies: false,
        booking_discount_amount_first_month: 0,
        supplies_discount_amount: 0
      };
    }

    const promo = promotions.find(function (p) {
      return p.is_active !== false && typeof p.promo_code === 'string' && p.promo_code.toUpperCase() === code;
    }) || null;

    if (!promo) {
      return {
        success: false,
        message: 'Promo code not found or inactive.',
        applied_to_booking: false,
        applied_to_supplies: false,
        booking_discount_amount_first_month: 0,
        supplies_discount_amount: 0
      };
    }

    const now = new Date();
    if (promo.valid_start_date) {
      const start = new Date(promo.valid_start_date);
      if (now < start) {
        return { success: false, message: 'Promotion is not yet valid.', applied_to_booking: false, applied_to_supplies: false, booking_discount_amount_first_month: 0, supplies_discount_amount: 0 };
      }
    }
    if (promo.valid_end_date) {
      const end = new Date(promo.valid_end_date);
      if (now > end) {
        return { success: false, message: 'Promotion has expired.', applied_to_booking: false, applied_to_supplies: false, booking_discount_amount_first_month: 0, supplies_discount_amount: 0 };
      }
    }

    let appliedToBooking = false;
    let appliedToSupplies = false;
    let bookingDiscount = 0;
    let suppliesDiscount = 0;

    // Booking eligibility
    if ((promo.applies_to === 'booking' || promo.applies_to === 'both') && booking) {
      if (promo.min_rental_months && booking.rental_term_months && booking.rental_term_months < promo.min_rental_months) {
        // Not eligible for booking part
      } else {
        // Weekend move-in check if applicable
        if (promo.is_weekend_move_in && booking.rental_start_date) {
          const startDate = this._parseDate(booking.rental_start_date);
          const day = startDate.getDay(); // 0=Sun,6=Sat
          if (!(day === 0 || day === 6)) {
            // move-in not weekend
          } else {
            bookingDiscount = this._computeBookingDiscount(promo, booking.monthly_rate);
            appliedToBooking = bookingDiscount > 0;
          }
        } else {
          bookingDiscount = this._computeBookingDiscount(promo, booking.monthly_rate);
          appliedToBooking = bookingDiscount > 0;
        }
      }
    }

    // Supplies eligibility
    if ((promo.applies_to === 'supplies' || promo.applies_to === 'both') && cart) {
      const subtotal = Number(cart.subtotal) || 0;
      if (subtotal > 0) {
        if (promo.discount_type === 'percentage') {
          suppliesDiscount = +(subtotal * (promo.discount_value / 100)).toFixed(2);
        } else if (promo.discount_type === 'fixed_amount') {
          suppliesDiscount = Math.min(subtotal, Number(promo.discount_value) || 0);
        }
        appliedToSupplies = suppliesDiscount > 0;
      }
    }

    if (!appliedToBooking && !appliedToSupplies) {
      return {
        success: false,
        message: 'Promo code is not applicable to this order.',
        applied_to_booking: false,
        applied_to_supplies: false,
        booking_discount_amount_first_month: 0,
        supplies_discount_amount: 0
      };
    }

    return {
      success: true,
      message: 'Promo code applied.',
      applied_to_booking: appliedToBooking,
      applied_to_supplies: appliedToSupplies,
      booking_discount_amount_first_month: bookingDiscount,
      supplies_discount_amount: suppliesDiscount,
      promotion: promo
    };
  }

  _computeBookingDiscount(promo, monthlyRate) {
    const rate = Number(monthlyRate) || 0;
    if (rate <= 0) return 0;
    if (promo.discount_type === 'percentage') {
      return +(rate * (promo.discount_value / 100)).toFixed(2);
    }
    if (promo.discount_type === 'fixed_amount') {
      return Math.min(rate, Number(promo.discount_value) || 0);
    }
    return 0;
  }

  // --------------------------
  // Access helpers
  // --------------------------

  _getAvailableAccessTimeWindows(accessServiceType, requestedDate, zip) {
    // Currently we only filter by is_active; more complex rules could be added
    const windows = this._getFromStorage('access_time_windows').filter(function (tw) { return tw.is_active !== false; });
    return windows;
  }

  // --------------------------
  // Reschedule helpers
  // --------------------------

  _enforceRescheduleRules(event, newDateStr) {
    // Basic rule: new date must not be in the past
    const today = new Date();
    const newDate = this._parseDate(newDateStr);
    if (newDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      return { success: false, message: 'New date cannot be in the past.' };
    }
    // Additional rules could be implemented here (min days, weekday restrictions, etc.)
    return { success: true, message: 'OK' };
  }

  // --------------------------
  // Interface implementations
  // --------------------------

  // getServiceOverview()
  getServiceOverview() {
    // Static service overview (not persisted entity data)
    const services = [
      {
        slug: 'mobile_pod_storage',
        name: 'Mobile Storage Pods',
        short_description: 'We deliver secure storage pods to your door for loading, then store them for you or leave them on-site.',
        icon_name: 'truck'
      },
      {
        slug: 'standard_storage',
        name: 'Standard Storage Units',
        short_description: 'Drive-up storage units at our local facilities for flexible access.',
        icon_name: 'warehouse'
      },
      {
        slug: 'climate_controlled_storage',
        name: 'Climate-Controlled Storage',
        short_description: 'Temperature-controlled units ideal for sensitive items and long-term storage.',
        icon_name: 'temperature_control'
      },
      {
        slug: 'packing_supplies',
        name: 'Packing Supplies',
        short_description: 'Boxes, tape, and moving supplies delivered with your pod or ready for pickup.',
        icon_name: 'box'
      }
    ];

    const highlights = [
      { title: 'Local and Convenient', body: 'Neighborhood-based facilities and mobile coverage focused on quick, flexible service.' },
      { title: 'Flexible Terms', body: 'Month-to-month or fixed-term plans so you only pay for the time you need.' },
      { title: 'Secure & Monitored', body: 'Secure facilities with restricted access and regular monitoring.' }
    ];

    return { services: services, highlights: highlights };
  }

  // getQuoteFormOptions()
  getQuoteFormOptions() {
    const unitSizes = this._getFromStorage('storage_unit_sizes').filter(function (s) { return s.is_active !== false; });

    const unitSizeOptions = unitSizes.map(function (s) {
      return {
        id: s.id,
        label: s.name,
        short_description: s.short_description || ''
      };
    });

    const rentalDurations = this.getRentalDurationOptions();
    const distanceRadiusOptions = this.getDistanceRadiusOptions();

    const serviceTypes = [
      { value: 'mobile_pod_storage', label: 'Mobile Storage Pod Delivery' },
      { value: 'standard_storage', label: 'Standard Storage Unit' },
      { value: 'climate_controlled_storage', label: 'Climate-Controlled Storage' }
    ];

    return {
      service_types: serviceTypes,
      unit_sizes: unitSizeOptions,
      rental_durations: rentalDurations,
      distance_radius_options: distanceRadiusOptions,
      default_values: {
        default_service_type: 'mobile_pod_storage',
        default_rental_duration_months: 1,
        default_distance_radius_miles: 10
      }
    };
  }

  // searchStorageOptions(zip, serviceType, deliveryDate, rentalDurationMonths, distanceRadiusMiles, unitSizeId, sortBy)
  searchStorageOptions(zip, serviceType, deliveryDate, rentalDurationMonths, distanceRadiusMiles, unitSizeId, sortBy) {
    const plans = this._getFromStorage('storage_plans').filter(function (p) { return p.is_active !== false; });
    const locations = this._getFromStorage('locations');
    const sizes = this._getFromStorage('storage_unit_sizes');

    let filtered = plans.filter(function (p) {
      if (p.plan_type !== serviceType) return false;
      // Rental duration matching: for fixed_months we require equality; month_to_month is always allowed
      if (p.rental_term_type === 'fixed_months' && p.rental_term_months !== rentalDurationMonths) return false;
      if (unitSizeId && p.unit_size_id !== unitSizeId) return false;
      return true;
    });

    const results = [];
    for (let i = 0; i < filtered.length; i++) {
      const plan = filtered[i];
      const loc = locations.find(function (l) { return l.id === plan.location_id; }) || null;
      const size = sizes.find(function (s) { return s.id === plan.unit_size_id; }) || null;
      const distance = loc ? this._calculateDistanceMiles(zip, loc) : Number.POSITIVE_INFINITY;
      if (typeof distanceRadiusMiles === 'number' && isFinite(distanceRadiusMiles)) {
        if (!isFinite(distance) || distance > distanceRadiusMiles) {
          continue;
        }
      }

      results.push({
        plan_id: plan.id,
        plan_name: plan.name,
        plan_type: plan.plan_type,
        monthly_price: Number(plan.monthly_price) || 0,
        rental_term_type: plan.rental_term_type,
        rental_term_months: plan.rental_term_months,
        fees_description: plan.fees_description || '',
        location_id: plan.location_id,
        location_name: loc ? loc.name : '',
        location_city: loc ? loc.city : '',
        location_state: loc ? loc.state : '',
        location_zip: loc ? loc.zip : '',
        distance_miles: isFinite(distance) ? +distance.toFixed(2) : null,
        unit_size_id: plan.unit_size_id,
        unit_size_label: size ? size.name : '',
        unit_size_description: size ? (size.short_description || '') : '',
        availability_status: 'available',
        // Foreign key resolution objects
        plan: plan,
        location: loc,
        unit_size: size
      });
    }

    if (sortBy === 'price_high_to_low') {
      results.sort(function (a, b) { return b.monthly_price - a.monthly_price; });
    } else if (sortBy === 'distance_nearest_first') {
      results.sort(function (a, b) {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else {
      // Default: price_low_to_high
      results.sort(function (a, b) { return a.monthly_price - b.monthly_price; });
    }

    return results;
  }

  // getSizeGuideScenarios()
  getSizeGuideScenarios() {
    const scenarios = this._getFromStorage('size_guide_scenarios').filter(function (s) { return s.is_active !== false; });
    const sizes = this._getFromStorage('storage_unit_sizes');

    return scenarios.map(function (sc) {
      const primarySize = sizes.find(function (s) { return s.id === sc.recommended_primary_size_id; }) || null;
      return {
        scenario_id: sc.id,
        name: sc.name,
        description: sc.description || '',
        typical_contents: sc.typical_contents || '',
        primary_unit_size_id: sc.recommended_primary_size_id || (primarySize ? primarySize.id : null),
        primary_unit_size_label: primarySize ? primarySize.name : '',
        primary_unit_size: primarySize
      };
    });
  }

  // getSizeGuideScenarioDetail(scenarioId, rentalDurationMonths, zip)
  getSizeGuideScenarioDetail(scenarioId, rentalDurationMonths, zip) {
    const scenarios = this._getFromStorage('size_guide_scenarios');
    const sizes = this._getFromStorage('storage_unit_sizes');
    const plans = this._getFromStorage('storage_plans').filter(function (p) { return p.is_active !== false; });

    const sc = scenarios.find(function (s) { return s.id === scenarioId; }) || null;
    if (!sc) {
      return {
        scenario_id: scenarioId,
        name: '',
        description: '',
        recommended_sizes: []
      };
    }

    const recommendedSizeIds = Array.isArray(sc.recommended_size_ids) && sc.recommended_size_ids.length
      ? sc.recommended_size_ids
      : (sc.recommended_primary_size_id ? [sc.recommended_primary_size_id] : []);

    const durMonths = rentalDurationMonths || null;

    const recommendedSizes = recommendedSizeIds.map(function (sizeId) {
      const size = sizes.find(function (s) { return s.id === sizeId; }) || null;

      let relevantPlans = plans.filter(function (p) {
        if (p.unit_size_id !== sizeId) return false;
        if (durMonths && p.rental_term_type === 'fixed_months' && p.rental_term_months !== durMonths) return false;
        return true;
      });

      let priceLow = null;
      let priceHigh = null;
      for (let i = 0; i < relevantPlans.length; i++) {
        const mp = Number(relevantPlans[i].monthly_price) || 0;
        if (priceLow === null || mp < priceLow) priceLow = mp;
        if (priceHigh === null || mp > priceHigh) priceHigh = mp;
      }

      return {
        unit_size_id: sizeId,
        unit_size_label: size ? size.name : '',
        short_description: size ? (size.short_description || '') : '',
        fits_example: sc.typical_contents || '',
        estimated_monthly_price_low: priceLow != null ? priceLow : Number.POSITIVE_INFINITY,
        estimated_monthly_price_high: priceHigh,
        is_primary_recommendation: sc.recommended_primary_size_id === sizeId,
        unit_size: size
      };
    }.bind(this));

    return {
      scenario_id: sc.id,
      name: sc.name,
      description: sc.description || '',
      recommended_sizes: recommendedSizes
    };
  }

  // getStorageCalculatorItems()
  getStorageCalculatorItems() {
    const items = this._getFromStorage('storage_calculator_items').filter(function (i) { return i.is_active !== false; });
    return items.map(function (it) {
      return {
        item_id: it.id,
        name: it.name,
        slug: it.slug,
        category: it.category || '',
        description: it.description || '',
        cubic_feet_per_unit: Number(it.cubic_feet_per_unit) || 0,
        default_quantity: typeof it.default_quantity === 'number' ? it.default_quantity : 0
      };
    });
  }

  // calculateRecommendedStorageSize(items)
  calculateRecommendedStorageSize(items) {
    const allItems = this._getFromStorage('storage_calculator_items');
    const sizes = this._getFromStorage('storage_unit_sizes').filter(function (s) { return s.is_active !== false; });

    let totalCubicFeet = 0;
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const input = items[i];
        const def = allItems.find(function (it) { return it.id === input.itemId; }) || null;
        if (!def) continue;
        const qty = Number(input.quantity) || 0;
        totalCubicFeet += qty * (Number(def.cubic_feet_per_unit) || 0);
      }
    }

    // Sort sizes by capacity_cubic_ft (ascending)
    const sortedSizes = sizes.slice().sort(function (a, b) {
      const ca = Number(a.capacity_cubic_ft) || 0;
      const cb = Number(b.capacity_cubic_ft) || 0;
      return ca - cb;
    });

    let primary = null;
    for (let i = 0; i < sortedSizes.length; i++) {
      const s = sortedSizes[i];
      const cap = Number(s.capacity_cubic_ft) || 0;
      if (cap >= totalCubicFeet) {
        primary = s;
        break;
      }
    }
    if (!primary && sortedSizes.length) {
      primary = sortedSizes[sortedSizes.length - 1];
    }

    const alternatives = [];
    for (let i = 0; i < sortedSizes.length; i++) {
      const s = sortedSizes[i];
      if (primary && s.id === primary.id) continue;
      const note = (Number(s.capacity_cubic_ft) || 0) < totalCubicFeet ? 'May be tight for your items.' : 'Gives extra space.';
      alternatives.push({
        unit_size_id: s.id,
        unit_size_label: s.name,
        note: note,
        unit_size: s
      });
    }

    return {
      total_estimated_cubic_feet: +totalCubicFeet.toFixed(2),
      primary_recommended_unit_size_id: primary ? primary.id : null,
      primary_recommended_unit_size_label: primary ? primary.name : '',
      alternative_unit_sizes: alternatives
    };
  }

  // getStoragePlanFilterOptions()
  getStoragePlanFilterOptions() {
    const sizes = this._getFromStorage('storage_unit_sizes').filter(function (s) { return s.is_active !== false; });

    const unitSizes = sizes.map(function (s) {
      return { id: s.id, label: s.name, unit_size: s };
    });

    const rentalTerms = [
      { term_type: 'fixed_months', months: 1, label: '1 month' },
      { term_type: 'fixed_months', months: 3, label: '3 months' },
      { term_type: 'fixed_months', months: 6, label: '6 months' },
      { term_type: 'fixed_months', months: 12, label: '12 months' },
      { term_type: 'month_to_month', months: 1, label: 'Month-to-month' }
    ];

    const planTypes = [
      { value: 'standard_storage', label: 'Standard Storage' },
      { value: 'climate_controlled_storage', label: 'Climate-Controlled Storage' },
      { value: 'mobile_pod_storage', label: 'Mobile Storage Pods' }
    ];

    return {
      unit_sizes: unitSizes,
      rental_terms: rentalTerms,
      plan_types: planTypes
    };
  }

  // searchStoragePlans(unitSizeId, rentalTermMonths, planType, sortBy)
  searchStoragePlans(unitSizeId, rentalTermMonths, planType, sortBy) {
    const plans = this._getFromStorage('storage_plans').filter(function (p) { return p.is_active !== false; });
    const locations = this._getFromStorage('locations');
    const sizes = this._getFromStorage('storage_unit_sizes');

    let filtered = plans.filter(function (p) {
      if (unitSizeId && p.unit_size_id !== unitSizeId) return false;
      if (planType && p.plan_type !== planType) return false;
      if (rentalTermMonths) {
        if (p.rental_term_type === 'fixed_months' && p.rental_term_months !== rentalTermMonths) return false;
      }
      return true;
    });

    const results = filtered.map(function (p) {
      const loc = locations.find(function (l) { return l.id === p.location_id; }) || null;
      const size = sizes.find(function (s) { return s.id === p.unit_size_id; }) || null;
      return {
        plan_id: p.id,
        plan_name: p.name,
        plan_type: p.plan_type,
        unit_size_id: p.unit_size_id,
        unit_size_label: size ? size.name : '',
        rental_term_type: p.rental_term_type,
        rental_term_months: p.rental_term_months,
        monthly_price: Number(p.monthly_price) || 0,
        location_id: p.location_id,
        location_name: loc ? loc.name : '',
        inclusions: Array.isArray(p.inclusions) ? p.inclusions : [],
        // Foreign key resolution
        plan: p,
        location: loc,
        unit_size: size
      };
    });

    if (sortBy === 'price_high_to_low') {
      results.sort(function (a, b) { return b.monthly_price - a.monthly_price; });
    } else if (sortBy === 'price_low_to_high') {
      results.sort(function (a, b) { return a.monthly_price - b.monthly_price; });
    }

    return results;
  }

  // getStoragePlanDetail(planId, overrideRentalTermMonths)
  getStoragePlanDetail(planId, overrideRentalTermMonths) {
    const plans = this._getFromStorage('storage_plans');
    const locations = this._getFromStorage('locations');
    const sizes = this._getFromStorage('storage_unit_sizes');

    let plan = plans.find(function (p) { return p.id === planId; }) || null;
    if (!plan) {
      return {
        plan_id: planId,
        plan_name: '',
        description: '',
        plan_type: '',
        unit_size_id: null,
        unit_size_label: '',
        rental_term_type: '',
        rental_term_months: null,
        monthly_price: 0,
        total_price: 0,
        fees_description: '',
        inclusions: [],
        restrictions: '',
        location_id: null,
        location_name: '',
        location_city: '',
        location_state: '',
        related_terms: [],
        alternate_plan_type: null
      };
    }

    // Override term if requested and matching alternative exists
    if (overrideRentalTermMonths && plan.rental_term_type === 'fixed_months' && plan.rental_term_months !== overrideRentalTermMonths) {
      const alt = plans.find(function (p) {
        return p.location_id === plan.location_id && p.unit_size_id === plan.unit_size_id && p.plan_type === plan.plan_type && p.rental_term_type === 'fixed_months' && p.rental_term_months === overrideRentalTermMonths;
      }) || null;
      if (alt) {
        plan = alt;
      }
    }

    const loc = locations.find(function (l) { return l.id === plan.location_id; }) || null;
    const size = sizes.find(function (s) { return s.id === plan.unit_size_id; }) || null;

    // Related terms for same plan type/location/size
    const relatedTerms = plans.filter(function (p) {
      return p.location_id === plan.location_id && p.unit_size_id === plan.unit_size_id && p.plan_type === plan.plan_type && p.id !== plan.id;
    }).map(function (p) {
      return { rental_term_months: p.rental_term_months, monthly_price: Number(p.monthly_price) || 0 };
    });

    // Alternate plan type (e.g., standard vs climate-controlled)
    const altPlan = plans.find(function (p) {
      return p.location_id === plan.location_id && p.unit_size_id === plan.unit_size_id && p.plan_type !== plan.plan_type;
    }) || null;

    return {
      plan_id: plan.id,
      plan_name: plan.name,
      description: plan.description || '',
      plan_type: plan.plan_type,
      unit_size_id: plan.unit_size_id,
      unit_size_label: size ? size.name : '',
      rental_term_type: plan.rental_term_type,
      rental_term_months: plan.rental_term_months,
      monthly_price: Number(plan.monthly_price) || 0,
      total_price: plan.total_price != null ? Number(plan.total_price) || 0 : null,
      fees_description: plan.fees_description || '',
      inclusions: Array.isArray(plan.inclusions) ? plan.inclusions : [],
      restrictions: plan.restrictions || '',
      location_id: plan.location_id,
      location_name: loc ? loc.name : '',
      location_city: loc ? loc.city : '',
      location_state: loc ? loc.state : '',
      related_terms: relatedTerms,
      alternate_plan_type: altPlan ? {
        plan_id: altPlan.id,
        plan_type: altPlan.plan_type,
        monthly_price: Number(altPlan.monthly_price) || 0,
        plan: altPlan
      } : null,
      // Foreign key resolution
      location: loc,
      unit_size: size,
      plan: plan
    };
  }

  // getActivePromotions(isWeekendMoveInOnly, limit)
  getActivePromotions(isWeekendMoveInOnly, limit) {
    const promotions = this._getFromStorage('promotions');
    const now = new Date();

    let list = promotions.filter(function (p) {
      if (p.is_active === false) return false;
      if (p.valid_start_date) {
        const s = new Date(p.valid_start_date);
        if (now < s) return false;
      }
      if (p.valid_end_date) {
        const e = new Date(p.valid_end_date);
        if (now > e) return false;
      }
      if (isWeekendMoveInOnly && !p.is_weekend_move_in) return false;
      return true;
    });

    if (typeof limit === 'number' && limit > 0) {
      list = list.slice(0, limit);
    }

    return list.map(function (p) {
      return {
        promotion_id: p.id,
        name: p.name,
        short_description: p.short_description || '',
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        applies_to: p.applies_to,
        is_weekend_move_in: !!p.is_weekend_move_in,
        valid_start_date: p.valid_start_date || null,
        valid_end_date: p.valid_end_date || null
      };
    });
  }

  // getPromotionDetail(promotionId)
  getPromotionDetail(promotionId) {
    const promotions = this._getFromStorage('promotions');
    const locations = this._getFromStorage('locations');
    const promo = promotions.find(function (p) { return p.id === promotionId; }) || null;
    if (!promo) {
      return {
        promotion_id: promotionId,
        name: '',
        short_description: '',
        full_description: '',
        promo_code: '',
        discount_type: '',
        discount_value: 0,
        applies_to: '',
        is_weekend_move_in: false,
        min_rental_months: null,
        valid_start_date: null,
        valid_end_date: null,
        eligible_locations_description: '',
        restrictions_text: ''
      };
    }

    const eligibleLocations = [];
    if (Array.isArray(promo.eligible_locations)) {
      for (let i = 0; i < promo.eligible_locations.length; i++) {
        const idOrZip = promo.eligible_locations[i];
        const loc = locations.find(function (l) { return l.id === idOrZip || l.zip === idOrZip; }) || null;
        if (loc) eligibleLocations.push(loc);
      }
    }

    return {
      promotion_id: promo.id,
      name: promo.name,
      short_description: promo.short_description || '',
      full_description: promo.full_description || '',
      promo_code: promo.promo_code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      applies_to: promo.applies_to,
      is_weekend_move_in: !!promo.is_weekend_move_in,
      min_rental_months: promo.min_rental_months || null,
      valid_start_date: promo.valid_start_date || null,
      valid_end_date: promo.valid_end_date || null,
      eligible_locations_description: promo.eligible_locations_description || '',
      restrictions_text: promo.restrictions_text || '',
      eligible_locations_resolved: eligibleLocations
    };
  }

  // getSupplyCategories()
  getSupplyCategories() {
    return this._getFromStorage('supply_categories').filter(function (c) { return c.is_active !== false; });
  }

  // getSupplyProducts(categoryId, sortBy)
  getSupplyProducts(categoryId, sortBy) {
    const categories = this._getFromStorage('supply_categories');
    const products = this._getFromStorage('supply_products').filter(function (p) { return p.is_active !== false; });

    let filtered = products.filter(function (p) {
      if (!categoryId || categoryId === 'all_supplies') return true;
      return p.category_id === categoryId;
    });

    if (sortBy === 'price_high_to_low') {
      filtered.sort(function (a, b) { return b.unit_price - a.unit_price; });
    } else if (sortBy === 'price_low_to_high') {
      filtered.sort(function (a, b) { return a.unit_price - b.unit_price; });
    }

    return filtered.map(function (p) {
      const cat = categories.find(function (c) { return c.id === p.category_id; }) || null;
      return {
        product_id: p.id,
        name: p.name,
        description: p.description || '',
        category_id: p.category_id,
        category_name: cat ? cat.name : '',
        unit_price: Number(p.unit_price) || 0,
        size_label: p.size_label || '',
        is_box_pack: !!p.is_box_pack,
        image_url: p.image_url || '',
        category: cat
      };
    });
  }

  // addSupplyProductToCart(productId, quantity)
  addSupplyProductToCart(productId, quantity) {
    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      return { success: false, cart_id: null, message: 'Quantity must be positive.' };
    }

    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('supply_products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product) {
      return { success: false, cart_id: cart.id, message: 'Product not found.' };
    }

    const cartItems = this._getFromStorage('cart_items');
    let item = cartItems.find(function (ci) { return ci.cart_id === cart.id && ci.product_id === productId; }) || null;

    if (item) {
      item.quantity += qty;
      item.line_total = +(item.quantity * Number(item.unit_price)).toFixed(2);
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        product_name: product.name,
        unit_price: Number(product.unit_price) || 0,
        quantity: qty,
        line_total: +(qty * (Number(product.unit_price) || 0)).toFixed(2)
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return { success: true, cart_id: cart.id, message: 'Added to cart.' };
  }

  // getCartDetails()
  getCartDetails() {
    const cartRecords = this._getFromStorage('cart');
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    const products = this._getFromStorage('supply_products');
    const cartItems = this._getFromStorage('cart_items');

    const cart = cartRecords.find(function (c) { return c.id === currentCartId; }) || null;
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }

    const items = cartItems.filter(function (ci) { return ci.cart_id === cart.id; }).map(function (ci) {
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        category_name: product && product.category_id ? product.category_id : '',
        unit_price: Number(ci.unit_price) || 0,
        quantity: ci.quantity,
        line_total: Number(ci.line_total) || 0,
        product: product
      };
    });

    return {
      cart_id: cart.id,
      items: items,
      subtotal: Number(cart.subtotal) || 0,
      tax: Number(cart.tax) || 0,
      total: Number(cart.total) || 0
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = Number(quantity) || 0;
    const cartItems = this._getFromStorage('cart_items');
    const cartRecords = this._getFromStorage('cart');
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    const cart = cartRecords.find(function (c) { return c.id === currentCartId; }) || null;

    if (!cart) {
      return { success: false, message: 'Cart not found.', updated_cart: { subtotal: 0, tax: 0, total: 0 } };
    }

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId && ci.cart_id === cart.id; });
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.', updated_cart: { subtotal: Number(cart.subtotal) || 0, tax: Number(cart.tax) || 0, total: Number(cart.total) || 0 } };
    }

    if (qty <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = qty;
      cartItems[idx].line_total = +(qty * (Number(cartItems[idx].unit_price) || 0)).toFixed(2);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart updated.',
      updated_cart: {
        subtotal: Number(updatedCart.subtotal) || 0,
        tax: Number(updatedCart.tax) || 0,
        total: Number(updatedCart.total) || 0
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const cartRecords = this._getFromStorage('cart');
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    const cart = cartRecords.find(function (c) { return c.id === currentCartId; }) || null;

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.' };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    if (cart) {
      this._recalculateCartTotals(cart);
    }

    return { success: true, message: 'Item removed.' };
  }

  // createBookingDraft(sourceContext, planId, unitSizeId, locationId, rentalTermType, rentalTermMonths, rentalStartDate, storageLocationType, serviceZip)
  createBookingDraft(sourceContext, planId, unitSizeId, locationId, rentalTermType, rentalTermMonths, rentalStartDate, storageLocationType, serviceZip) {
    const plans = this._getFromStorage('storage_plans');

    const init = {
      location_id: locationId || null,
      storage_plan_id: planId || null,
      unit_size_id: unitSizeId || null,
      rental_term_type: rentalTermType || 'fixed_months',
      rental_term_months: rentalTermMonths || 1,
      rental_start_date: rentalStartDate || null,
      storage_location_type: storageLocationType || 'at_customer_address',
      service_zip: serviceZip || ''
    };

    let booking = this._getOrCreateBookingDraft(init);

    // Update booking based on plan or explicit params
    if (planId) {
      const plan = plans.find(function (p) { return p.id === planId; }) || null;
      if (plan) {
        booking.storage_plan_id = plan.id;
        booking.location_id = plan.location_id;
        booking.unit_size_id = plan.unit_size_id;
        booking.plan_type = plan.plan_type;
        booking.rental_term_type = rentalTermType || plan.rental_term_type;
        booking.rental_term_months = rentalTermMonths || plan.rental_term_months;
      }
    } else {
      if (locationId) booking.location_id = locationId;
      if (unitSizeId) booking.unit_size_id = unitSizeId;
      if (rentalTermType) booking.rental_term_type = rentalTermType;
      if (rentalTermMonths) booking.rental_term_months = rentalTermMonths;
    }

    if (rentalStartDate) booking.rental_start_date = rentalStartDate;
    if (storageLocationType) booking.storage_location_type = storageLocationType;
    if (serviceZip) booking.service_zip = serviceZip;

    booking.source_context = sourceContext || 'direct';
    booking.updated_at = this._nowISO();

    booking = this._updateBookingPricing(booking);

    // Build summary
    const locations = this._getFromStorage('locations');
    const sizes = this._getFromStorage('storage_unit_sizes');
    const loc = locations.find(function (l) { return l.id === booking.location_id; }) || null;
    const size = sizes.find(function (s) { return s.id === booking.unit_size_id; }) || null;

    return {
      booking_id: booking.id,
      status: booking.status,
      reservation_number: booking.reservation_number,
      summary: {
        location_name: loc ? loc.name : '',
        unit_size_label: size ? size.name : '',
        plan_type: booking.plan_type,
        rental_term_months: booking.rental_term_months,
        rental_start_date: booking.rental_start_date,
        storage_location_type: booking.storage_location_type,
        monthly_rate: booking.monthly_rate,
        estimated_total: booking.estimated_total
      }
    };
  }

  // getBookingDraftDetails()
  getBookingDraftDetails() {
    const bookings = this._getFromStorage('bookings');
    const currentBookingId = localStorage.getItem('current_booking_id') || '';
    const booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;
    if (!booking) {
      return {
        booking_id: null,
        status: null,
        reservation_number: null,
        location: null,
        plan: null,
        schedule: { rental_start_date: null, rental_end_date: null, storage_location_type: null, events: [] },
        customer: { first_name: '', last_name: '', email: '', phone: '' },
        service_address: { address_line1: '', address_line2: '', city: '', state: '', zip: '' },
        applied_promo_code: null,
        promo_discount_amount_first_month: 0
      };
    }

    const locations = this._getFromStorage('locations');
    const plans = this._getFromStorage('storage_plans');
    const sizes = this._getFromStorage('storage_unit_sizes');
    const eventsAll = this._getFromStorage('booking_events');

    const loc = locations.find(function (l) { return l.id === booking.location_id; }) || null;
    const plan = plans.find(function (p) { return p.id === booking.storage_plan_id; }) || null;
    const size = sizes.find(function (s) { return s.id === booking.unit_size_id; }) || null;

    const events = eventsAll.filter(function (e) { return e.booking_id === booking.id; }).map(function (e) {
      return {
        event_id: e.id,
        event_type: e.event_type,
        scheduled_date: e.scheduled_date,
        original_date: e.original_date || null,
        status: e.status
      };
    });

    return {
      booking_id: booking.id,
      status: booking.status,
      reservation_number: booking.reservation_number,
      location: {
        location_id: booking.location_id,
        location_name: loc ? loc.name : '',
        city: loc ? loc.city : '',
        state: loc ? loc.state : '',
        zip: loc ? loc.zip : ''
      },
      plan: {
        plan_id: booking.storage_plan_id,
        plan_name: plan ? plan.name : '',
        plan_type: booking.plan_type,
        unit_size_id: booking.unit_size_id,
        unit_size_label: size ? size.name : '',
        rental_term_type: booking.rental_term_type,
        rental_term_months: booking.rental_term_months,
        monthly_rate: booking.monthly_rate,
        estimated_total: booking.estimated_total
      },
      schedule: {
        rental_start_date: booking.rental_start_date,
        rental_end_date: booking.rental_end_date,
        storage_location_type: booking.storage_location_type,
        events: events
      },
      customer: {
        first_name: booking.customer_first_name || '',
        last_name: booking.customer_last_name || '',
        email: booking.customer_email || '',
        phone: booking.customer_phone || ''
      },
      service_address: {
        address_line1: booking.service_address_line1 || '',
        address_line2: booking.service_address_line2 || '',
        city: booking.service_city || '',
        state: booking.service_state || '',
        zip: booking.service_zip || ''
      },
      applied_promo_code: booking.applied_promo_code || null,
      promo_discount_amount_first_month: booking.promo_discount_amount_first_month || 0
    };
  }

  // updateBookingSelection(unitSizeId, planType, rentalTermMonths)
  updateBookingSelection(unitSizeId, planType, rentalTermMonths) {
    const bookings = this._getFromStorage('bookings');
    const currentBookingId = localStorage.getItem('current_booking_id') || '';
    let booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;
    if (!booking) {
      booking = this._getOrCreateBookingDraft({});
    }

    if (unitSizeId) booking.unit_size_id = unitSizeId;
    if (planType) booking.plan_type = planType;
    if (rentalTermMonths) booking.rental_term_months = rentalTermMonths;

    booking.updated_at = this._nowISO();
    booking = this._updateBookingPricing(booking);

    return {
      booking_id: booking.id,
      plan_type: booking.plan_type,
      unit_size_label: (function () {
        const sizes = this._getFromStorage('storage_unit_sizes');
        const s = sizes.find(function (sz) { return sz.id === booking.unit_size_id; }) || null;
        return s ? s.name : '';
      }.bind(this))(),
      rental_term_months: booking.rental_term_months,
      monthly_rate: booking.monthly_rate,
      estimated_total: booking.estimated_total
    };
  }

  // updateBookingSchedule(rentalStartDate, storageLocationType, includePickupEvent)
  updateBookingSchedule(rentalStartDate, storageLocationType, includePickupEvent) {
    const bookings = this._getFromStorage('bookings');
    const currentBookingId = localStorage.getItem('current_booking_id') || '';
    let booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;
    if (!booking) {
      booking = this._getOrCreateBookingDraft({});
    }

    if (rentalStartDate) booking.rental_start_date = rentalStartDate;
    if (storageLocationType) booking.storage_location_type = storageLocationType;

    // Compute end date based on rental term months
    if (booking.rental_start_date && booking.rental_term_months) {
      const startDate = this._parseDate(booking.rental_start_date);
      const endDate = this._addMonths(startDate, booking.rental_term_months);
      booking.rental_end_date = this._formatDate(endDate);
    }

    booking.updated_at = this._nowISO();
    this._updateBookingInStorage(booking);

    // Manage booking events
    const eventsAll = this._getFromStorage('booking_events');
    let changed = false;

    let events = eventsAll.filter(function (e) { return e.booking_id === booking.id; });

    // Ensure initial_delivery event
    let initialEvent = events.find(function (e) { return e.event_type === 'initial_delivery'; }) || null;
    if (!initialEvent && booking.rental_start_date) {
      initialEvent = {
        id: this._generateId('event'),
        booking_id: booking.id,
        event_type: 'initial_delivery',
        scheduled_date: booking.rental_start_date,
        original_date: null,
        status: 'scheduled',
        notes: '',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      eventsAll.push(initialEvent);
      events.push(initialEvent);
      changed = true;
    } else if (initialEvent && booking.rental_start_date && initialEvent.scheduled_date !== booking.rental_start_date) {
      if (!initialEvent.original_date) initialEvent.original_date = initialEvent.scheduled_date;
      initialEvent.scheduled_date = booking.rental_start_date;
      initialEvent.updated_at = this._nowISO();
      changed = true;
    }

    // Pickup event if requested
    if (includePickupEvent && booking.rental_end_date) {
      let pickupEvent = events.find(function (e) { return e.event_type === 'pickup'; }) || null;
      if (!pickupEvent) {
        pickupEvent = {
          id: this._generateId('event'),
          booking_id: booking.id,
          event_type: 'pickup',
          scheduled_date: booking.rental_end_date,
          original_date: null,
          status: 'scheduled',
          notes: '',
          created_at: this._nowISO(),
          updated_at: this._nowISO()
        };
        eventsAll.push(pickupEvent);
        events.push(pickupEvent);
        changed = true;
      } else if (pickupEvent.scheduled_date !== booking.rental_end_date) {
        if (!pickupEvent.original_date) pickupEvent.original_date = pickupEvent.scheduled_date;
        pickupEvent.scheduled_date = booking.rental_end_date;
        pickupEvent.updated_at = this._nowISO();
        changed = true;
      }
    }

    if (changed) {
      this._saveToStorage('booking_events', eventsAll);
    }

    const resultEvents = events.map(function (e) {
      return {
        event_id: e.id,
        event_type: e.event_type,
        scheduled_date: e.scheduled_date,
        status: e.status
      };
    });

    return {
      booking_id: booking.id,
      rental_start_date: booking.rental_start_date,
      rental_end_date: booking.rental_end_date,
      storage_location_type: booking.storage_location_type,
      events: resultEvents
    };
  }

  // updateBookingCustomerDetails(firstName, lastName, email, phone, addressLine1, addressLine2, city, state, zip)
  updateBookingCustomerDetails(firstName, lastName, email, phone, addressLine1, addressLine2, city, state, zipCode) {
    const bookings = this._getFromStorage('bookings');
    const currentBookingId = localStorage.getItem('current_booking_id') || '';
    let booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;
    if (!booking) {
      booking = this._getOrCreateBookingDraft({});
    }

    booking.customer_first_name = firstName || '';
    booking.customer_last_name = lastName || '';
    booking.customer_email = email || '';
    booking.customer_phone = phone || '';
    booking.service_address_line1 = addressLine1 || '';
    booking.service_address_line2 = addressLine2 || '';
    booking.service_city = city || '';
    booking.service_state = state || '';
    booking.service_zip = zipCode || '';
    booking.updated_at = this._nowISO();

    this._updateBookingInStorage(booking);

    const fullName = (booking.customer_first_name + ' ' + booking.customer_last_name).trim();
    const addrParts = [booking.service_address_line1, booking.service_city, booking.service_state, booking.service_zip].filter(function (p) { return !!p; });

    return {
      booking_id: booking.id,
      customer_full_name: fullName,
      service_address_summary: addrParts.join(', ')
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    // Booking
    const bookings = this._getFromStorage('bookings');
    const currentBookingId = localStorage.getItem('current_booking_id') || '';
    const booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;
    const locations = this._getFromStorage('locations');
    const plans = this._getFromStorage('storage_plans');
    const sizes = this._getFromStorage('storage_unit_sizes');

    let bookingSummary = {
      has_booking: false,
      reservation_number: null,
      location_name: '',
      plan_name: '',
      plan_type: '',
      unit_size_label: '',
      rental_term_months: null,
      rental_start_date: null,
      storage_location_type: null,
      monthly_rate: 0,
      estimated_total: 0,
      applied_promo_code: null,
      promo_discount_amount_first_month: 0
    };

    if (booking) {
      const loc = locations.find(function (l) { return l.id === booking.location_id; }) || null;
      const plan = plans.find(function (p) { return p.id === booking.storage_plan_id; }) || null;
      const size = sizes.find(function (s) { return s.id === booking.unit_size_id; }) || null;

      bookingSummary = {
        has_booking: true,
        reservation_number: booking.reservation_number,
        location_name: loc ? loc.name : '',
        plan_name: plan ? plan.name : '',
        plan_type: booking.plan_type,
        unit_size_label: size ? size.name : '',
        rental_term_months: booking.rental_term_months,
        rental_start_date: booking.rental_start_date,
        storage_location_type: booking.storage_location_type,
        monthly_rate: booking.monthly_rate,
        estimated_total: booking.estimated_total,
        applied_promo_code: booking.applied_promo_code || null,
        promo_discount_amount_first_month: booking.promo_discount_amount_first_month || 0
      };
    }

    // Supplies cart
    const cartRecords = this._getFromStorage('cart');
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    const cart = cartRecords.find(function (c) { return c.id === currentCartId; }) || null;
    const cartItems = this._getFromStorage('cart_items');

    let suppliesSummary = {
      has_cart: false,
      cart_id: null,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0
    };

    if (cart) {
      const items = cartItems.filter(function (ci) { return ci.cart_id === cart.id; }).map(function (ci) {
        return {
          product_name: ci.product_name,
          quantity: ci.quantity,
          line_total: Number(ci.line_total) || 0
        };
      });
      suppliesSummary = {
        has_cart: true,
        cart_id: cart.id,
        items: items,
        subtotal: Number(cart.subtotal) || 0,
        tax: Number(cart.tax) || 0,
        total: Number(cart.total) || 0
      };
    }

    const grandTotal = (bookingSummary.has_booking ? (bookingSummary.estimated_total || 0) : 0) + (suppliesSummary.has_cart ? (suppliesSummary.total || 0) : 0);

    return {
      booking: bookingSummary,
      supplies_cart: suppliesSummary,
      grand_total: +grandTotal.toFixed(2)
    };
  }

  // applyPromoCodeToOrder(promoCode)
  applyPromoCodeToOrder(promoCode) {
    const bookings = this._getFromStorage('bookings');
    const currentBookingId = localStorage.getItem('current_booking_id') || '';
    let booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;

    const cartRecords = this._getFromStorage('cart');
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    const cart = cartRecords.find(function (c) { return c.id === currentCartId; }) || null;

    const validation = this._validatePromoCode(promoCode, booking, cart);

    if (!validation.success) {
      return {
        success: false,
        message: validation.message,
        applied_to_booking: false,
        applied_to_supplies: false,
        booking_discount_amount_first_month: 0,
        supplies_discount_amount: 0,
        updated_checkout_summary: this.getCheckoutSummary()
      };
    }

    if (validation.applied_to_booking && booking) {
      booking.applied_promo_code = (promoCode || '').trim();
      booking.promo_discount_amount_first_month = validation.booking_discount_amount_first_month;
      booking.promo_description = validation.promotion ? validation.promotion.short_description || validation.promotion.name : null;
      booking.updated_at = this._nowISO();
      this._updateBookingInStorage(booking);
    }

    if (validation.applied_to_supplies && cart) {
      // We store discount metadata on cart
      cart.promo_code = (promoCode || '').trim();
      cart.promo_discount_amount = validation.supplies_discount_amount;
      cart.updated_at = this._nowISO();
      // Note: We do not change subtotal/tax/total; discount is separate but reflected via returned values if needed.
      const carts = this._getFromStorage('cart');
      const idx = carts.findIndex(function (c) { return c.id === cart.id; });
      if (idx >= 0) {
        carts[idx] = cart;
        this._saveToStorage('cart', carts);
      }
    }

    const checkout = this.getCheckoutSummary();
    const grandTotal = checkout.grand_total - (validation.supplies_discount_amount || 0);

    return {
      success: true,
      message: validation.message,
      applied_to_booking: validation.applied_to_booking,
      applied_to_supplies: validation.applied_to_supplies,
      booking_discount_amount_first_month: validation.booking_discount_amount_first_month,
      supplies_discount_amount: validation.supplies_discount_amount,
      updated_checkout_summary: {
        grand_total: +grandTotal.toFixed(2)
      }
    };
  }

  // confirmBookingAndOrder(paymentMethodSummary)
  confirmBookingAndOrder(paymentMethodSummary) {
    const bookings = this._getFromStorage('bookings');
    const currentBookingId = localStorage.getItem('current_booking_id') || '';
    let booking = bookings.find(function (b) { return b.id === currentBookingId && b.status === 'draft'; }) || null;

    const cartRecords = this._getFromStorage('cart');
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    const cart = cartRecords.find(function (c) { return c.id === currentCartId; }) || null;

    let bookingNumber = null;
    let orderNumber = null;

    if (booking) {
      booking.status = 'confirmed';
      booking.updated_at = this._nowISO();
      const idx = bookings.findIndex(function (b) { return b.id === booking.id; });
      if (idx >= 0) {
        bookings[idx] = booking;
      }
      this._saveToStorage('bookings', bookings);
      bookingNumber = booking.reservation_number;
      localStorage.setItem('current_booking_id', '');
    }

    if (cart) {
      cart.status = 'checked_out';
      cart.updated_at = this._nowISO();
      const idx = cartRecords.findIndex(function (c) { return c.id === cart.id; });
      if (idx >= 0) {
        cartRecords[idx] = cart;
      }
      this._saveToStorage('cart', cartRecords);
      orderNumber = 'SO' + this._getNextIdCounter();
      localStorage.setItem('current_cart_id', '');
    }

    return {
      success: true,
      booking_reservation_number: bookingNumber,
      order_confirmation_number: orderNumber,
      message: 'Order confirmed.'
    };
  }

  // searchLocations(zipOrCity, distanceRadiusMiles, sortBy)
  searchLocations(zipOrCity, distanceRadiusMiles, sortBy) {
    const query = (zipOrCity || '').trim().toLowerCase();
    const locations = this._getFromStorage('locations').filter(function (l) { return l.is_active !== false; });

    const matches = [];
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const dist = this._calculateDistanceMiles(zipOrCity, loc);

      if (typeof distanceRadiusMiles === 'number' && isFinite(distanceRadiusMiles)) {
        // When a radius is provided, use distance as the primary filter so that
        // ZIP searches like 30309 can still return nearby locations even if the
        // ZIP does not match exactly.
        if (!isFinite(dist) || dist > distanceRadiusMiles) continue;
      } else {
        // Without a radius, fall back to simple text matching on ZIP or city.
        if (query && loc.zip !== zipOrCity && (!loc.city || loc.city.toLowerCase().indexOf(query) === -1)) {
          continue;
        }
      }

      matches.push({
        location_id: loc.id,
        name: loc.name,
        address_line1: loc.address_line1,
        city: loc.city,
        state: loc.state,
        zip: loc.zip,
        distance_miles: isFinite(dist) ? +dist.toFixed(2) : null,
        services_offered: Array.isArray(loc.services_offered) ? loc.services_offered : [],
        location: loc
      });
    }

    if (sortBy === 'name_ascending') {
      matches.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else if (sortBy === 'distance_nearest_first') {
      matches.sort(function (a, b) {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return da - db;
      });
    }

    return matches;
  }

  // getLocationDetail(locationId)
  getLocationDetail(locationId) {
    const locations = this._getFromStorage('locations');
    const loc = locations.find(function (l) { return l.id === locationId; }) || null;
    if (!loc) {
      return {
        location_id: locationId,
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip: '',
        phone_number: '',
        office_hours_text: '',
        access_hours_text: '',
        services_offered: [],
        notes: ''
      };
    }

    return {
      location_id: loc.id,
      name: loc.name,
      address_line1: loc.address_line1,
      address_line2: loc.address_line2 || '',
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      phone_number: loc.phone_number || '',
      office_hours_text: loc.office_hours_text || '',
      access_hours_text: loc.access_hours_text || '',
      services_offered: Array.isArray(loc.services_offered) ? loc.services_offered : [],
      notes: loc.notes || ''
    };
  }

  // lookupBooking(reservationNumber, lastName)
  lookupBooking(reservationNumber, lastName) {
    const bookings = this._getFromStorage('bookings');
    const res = (reservationNumber || '').trim().toUpperCase();
    const ln = (lastName || '').trim().toLowerCase();

    const booking = bookings.find(function (b) {
      return (b.reservation_number || '').toUpperCase() === res && (b.customer_last_name || '').toLowerCase() === ln;
    }) || null;

    if (!booking) {
      return { found: false, message: 'Reservation not found.', booking_id: null, reservation_number: null };
    }

    localStorage.setItem('managed_booking_id', booking.id);
    return { found: true, message: 'Reservation found.', booking_id: booking.id, reservation_number: booking.reservation_number };
  }

  // getManagedBookingDetails()
  getManagedBookingDetails() {
    const bookings = this._getFromStorage('bookings');
    const bookingEvents = this._getFromStorage('booking_events');
    const locations = this._getFromStorage('locations');
    const plans = this._getFromStorage('storage_plans');
    const sizes = this._getFromStorage('storage_unit_sizes');

    const managedBookingId = localStorage.getItem('managed_booking_id') || '';
    const booking = bookings.find(function (b) { return b.id === managedBookingId; }) || null;

    if (!booking) {
      return {
        booking_id: null,
        reservation_number: null,
        status: null,
        location_name: '',
        plan_name: '',
        plan_type: '',
        unit_size_label: '',
        rental_term_months: null,
        customer_name: '',
        service_address_summary: '',
        events: []
      };
    }

    const loc = locations.find(function (l) { return l.id === booking.location_id; }) || null;
    const plan = plans.find(function (p) { return p.id === booking.storage_plan_id; }) || null;
    const size = sizes.find(function (s) { return s.id === booking.unit_size_id; }) || null;

    const events = bookingEvents.filter(function (e) { return e.booking_id === booking.id; }).map(function (e) {
      return {
        event_id: e.id,
        event_type: e.event_type,
        scheduled_date: e.scheduled_date,
        original_date: e.original_date || null,
        status: e.status
      };
    });

    const name = ((booking.customer_first_name || '') + ' ' + (booking.customer_last_name || '')).trim();
    const addrParts = [booking.service_address_line1, booking.service_city, booking.service_state, booking.service_zip].filter(function (p) { return !!p; });

    return {
      booking_id: booking.id,
      reservation_number: booking.reservation_number,
      status: booking.status,
      location_name: loc ? loc.name : '',
      plan_name: plan ? plan.name : '',
      plan_type: booking.plan_type,
      unit_size_label: size ? size.name : '',
      rental_term_months: booking.rental_term_months,
      customer_name: name,
      service_address_summary: addrParts.join(', '),
      events: events
    };
  }

  // rescheduleBookingEvent(eventId, newDate)
  rescheduleBookingEvent(eventId, newDate) {
    const bookingEvents = this._getFromStorage('booking_events');
    const idx = bookingEvents.findIndex(function (e) { return e.id === eventId; });
    if (idx === -1) {
      return { success: false, message: 'Event not found.', updated_event: null };
    }

    const event = bookingEvents[idx];
    const rules = this._enforceRescheduleRules(event, newDate);
    if (!rules.success) {
      return { success: false, message: rules.message, updated_event: null };
    }

    if (!event.original_date) event.original_date = event.scheduled_date;
    event.scheduled_date = newDate;
    event.status = 'scheduled';
    event.updated_at = this._nowISO();
    bookingEvents[idx] = event;
    this._saveToStorage('booking_events', bookingEvents);

    return {
      success: true,
      message: 'Event rescheduled.',
      updated_event: {
        event_id: event.id,
        scheduled_date: event.scheduled_date,
        original_date: event.original_date,
        status: event.status
      }
    };
  }

  // getAccessServiceOptions(zip)
  getAccessServiceOptions(zip) {
    const loc = this._findNearestLocationForZip(zip);
    if (!loc) {
      return {
        location_id: null,
        location_name: '',
        location_city: '',
        location_state: '',
        available_services: []
      };
    }

    const available = [];

    // If location offers mobile pod storage, we expose same-day pickup and redelivery
    const servicesOffered = Array.isArray(loc.services_offered) ? loc.services_offered : [];
    if (servicesOffered.indexOf('mobile_pod_storage') !== -1) {
      available.push({
        service_type: 'same_day_pickup_and_redelivery',
        label: 'Same-day pickup and redelivery of my pod',
        description: 'We bring your stored pod to you and take it back on the same day.'
      });
      available.push({
        service_type: 'scheduled_pickup',
        label: 'Scheduled pickup or redelivery',
        description: 'Plan a specific day for pod pickup or redelivery.'
      });
    }

    return {
      location_id: loc.id,
      location_name: loc.name,
      location_city: loc.city,
      location_state: loc.state,
      available_services: available,
      location: loc
    };
  }

  // getAccessTimeWindows(accessServiceType, requestedDate, zip)
  getAccessTimeWindows(accessServiceType, requestedDate, zip) {
    const windows = this._getAvailableAccessTimeWindows(accessServiceType, requestedDate, zip);
    return windows.map(function (tw) {
      return {
        time_window_id: tw.id,
        label: tw.label,
        shorthand_label: tw.shorthand_label || '',
        time_of_day: tw.time_of_day || null,
        is_morning: !!tw.is_morning,
        is_available: tw.is_active !== false,
        time_window: tw
      };
    });
  }

  // getAccessQuote(accessServiceType, requestedDate, timeWindowId, zipSearch, streetAddress, city, state, zip)
  getAccessQuote(accessServiceType, requestedDate, timeWindowId, zipSearch, streetAddress, cityName, stateCode, zipCode) {
    const loc = this._findNearestLocationForZip(zipSearch);
    if (!loc) {
      return {
        access_request_id: null,
        status: 'draft',
        location_id: null,
        location_name: '',
        requested_date: requestedDate,
        time_window_label: '',
        price_quote_amount: 0
      };
    }

    const windows = this._getFromStorage('access_time_windows');
    const tw = windows.find(function (w) { return w.id === timeWindowId; }) || null;

    let basePrice = 100;
    if (accessServiceType === 'same_day_pickup_and_redelivery') basePrice = 150;
    if (tw && tw.time_of_day === 'morning') basePrice += 0;
    else if (tw && tw.time_of_day === 'afternoon') basePrice += 10;
    else if (tw && tw.time_of_day === 'evening') basePrice += 20;

    const accessRequests = this._getFromStorage('access_requests');
    const id = this._generateId('access');

    const request = {
      id: id,
      status: 'draft',
      location_id: loc.id,
      booking_id: null,
      access_service_type: accessServiceType,
      requested_date: requestedDate,
      selected_time_window_id: timeWindowId,
      zip_search: zipSearch,
      street_address: streetAddress || '',
      city: cityName || '',
      state: stateCode || '',
      zip: zipCode || '',
      price_quote_amount: +basePrice.toFixed(2),
      notes: '',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    accessRequests.push(request);
    this._saveToStorage('access_requests', accessRequests);
    localStorage.setItem('current_access_request_id', id);

    return {
      access_request_id: id,
      status: request.status,
      location_id: loc.id,
      location_name: loc.name,
      requested_date: requestedDate,
      time_window_label: tw ? tw.label : '',
      price_quote_amount: request.price_quote_amount,
      location: loc,
      time_window: tw
    };
  }

  // confirmAccessRequest(accessRequestId)
  confirmAccessRequest(accessRequestId) {
    const accessRequests = this._getFromStorage('access_requests');
    const idx = accessRequests.findIndex(function (r) { return r.id === accessRequestId; });
    if (idx === -1) {
      return { success: false, status: 'draft', message: 'Access request not found.' };
    }

    const req = accessRequests[idx];
    req.status = 'confirmed';
    req.updated_at = this._nowISO();
    accessRequests[idx] = req;
    this._saveToStorage('access_requests', accessRequests);

    return { success: true, status: 'confirmed', message: 'Access request confirmed.' };
  }

  // getAboutUsContent()
  getAboutUsContent() {
    return {
      mission: 'To make local self-storage and mobile storage pods simple, flexible, and stress-free for every move or declutter.',
      history: 'We started as a small neighborhood storage facility and grew into a mobile-first storage company serving multiple metro areas.',
      mobile_storage_benefits: 'Mobile pods save you trips to the facility: we bring the storage to your door, you load at your pace, and we store it securely for you.',
      service_areas: ['San Francisco Bay Area', 'Greater Boston', 'Dallas–Fort Worth', 'Atlanta Metro'],
      trust_indicators: ['Locally owned and operated', 'Thousands of units under management', 'Secure facilities with monitored access']
    };
  }

  // getContactInfo()
  getContactInfo() {
    return {
      main_phone_number: '+1 (800) 000-0000',
      support_email: 'support@example-storage.com',
      office_address: '123 Storage Way, Suite 100, YourCity, ST 00000',
      support_hours_text: 'Support available 7 days a week, 8:00 AM – 6:00 PM local time.',
      response_time_expectation: 'We typically respond to messages within one business day.'
    };
  }

  // submitContactForm(name, email, phone, message)
  submitContactForm(name, email, phone, messageText) {
    const msgs = this._getFromStorage('contact_messages');
    const id = this._generateId('contact');
    msgs.push({
      id: id,
      name: name || '',
      email: email || '',
      phone: phone || '',
      message: messageText || '',
      created_at: this._nowISO()
    });
    this._saveToStorage('contact_messages', msgs);
    return { success: true, message: 'Your message has been received.' };
  }

  // getStorageUnitSizes()
  getStorageUnitSizes() {
    return this._getFromStorage('storage_unit_sizes').filter(function (s) { return s.is_active !== false; });
  }

  // getDistanceRadiusOptions()
  getDistanceRadiusOptions() {
    return [
      { miles: 5, label: 'Within 5 miles' },
      { miles: 10, label: 'Within 10 miles' },
      { miles: 25, label: 'Within 25 miles' },
      { miles: 50, label: 'Within 50 miles' }
    ];
  }

  // getRentalDurationOptions()
  getRentalDurationOptions() {
    return [
      { months: 1, label: '1 month' },
      { months: 3, label: '3 months' },
      { months: 6, label: '6 months' },
      { months: 12, label: '12 months' }
    ];
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
