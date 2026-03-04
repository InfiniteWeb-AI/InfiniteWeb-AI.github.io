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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const keys = [
      'products',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'tours',
      'tour_time_slots',
      'tour_bookings',
      'events',
      'event_sessions',
      'membership_levels',
      'memberships',
      'funds',
      'donations',
      'event_spaces',
      'event_space_rates',
      'event_space_inquiries',
      'school_programs',
      'school_program_requests',
      'visit_hours',
      'admission_rates',
      'entrances',
      'parking_areas'
      // Note: homepage / about / accessibility / directions configs
      // are optional and not initialized here to avoid mocking data
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return parsed || [];
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------------------- Generic Helpers ----------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDateOnly(dateStr) {
    // dateStr in 'YYYY-MM-DD' or ISO
    if (!dateStr) return null;
    if (dateStr.length === 10) {
      return new Date(dateStr + 'T00:00:00Z');
    }
    return new Date(dateStr);
  }

  _formatDateDisplay(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _formatTimeDisplay(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  _weekdayName(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[d.getUTCDay ? d.getUTCDay() : d.getDay()];
  }

  _parseTimeToMinutes(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const parts = hhmm.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _currencyDisplay(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    return '$' + amount.toFixed(2);
  }

  // ---------------------- Cart Helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart;
    if (carts.length > 0) {
      cart = carts[0];
    } else {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  // Backwards compatibility with template name
  _findOrCreateCart() {
    return this._getOrCreateCart();
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cartId);
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += typeof item.line_total === 'number' ? item.line_total : 0;
    }
    const tax = 0; // No tax logic specified
    const shipping = 0; // No shipping logic specified
    const total = subtotal + tax + shipping;
    return { subtotal, tax, shipping, total };
  }

  _createOrderFromCart(contact_name, contact_email, contact_phone, billing_address, shipping_address, payment_method, payment_details, notes) {
    const carts = this._getFromStorage('cart');
    if (carts.length === 0) {
      return { success: false, order: null, message: 'No active cart found.' };
    }
    const cart = carts[0];
    const allCartItems = this._getFromStorage('cart_items');
    const cartItems = allCartItems.filter(ci => ci.cart_id === cart.id);
    if (cartItems.length === 0) {
      return { success: false, order: null, message: 'Cart is empty.' };
    }

    const { subtotal, tax, shipping, total } = this._calculateCartTotals(cart.id);

    const orders = this._getFromStorage('orders');
    const order_items = this._getFromStorage('order_items');

    const now = this._nowIso();
    const orderId = this._generateId('order');

    const status = payment_method === 'credit_card' ? 'paid' : 'pending';

    const order = {
      id: orderId,
      created_at: now,
      updated_at: now,
      status: status,
      payment_method: payment_method,
      subtotal_amount: subtotal,
      tax_amount: tax,
      shipping_amount: shipping,
      total_amount: total,
      contact_name: contact_name,
      contact_email: contact_email,
      contact_phone: contact_phone || null,
      billing_address_line1: billing_address && billing_address.line1 ? billing_address.line1 : null,
      billing_address_line2: billing_address && billing_address.line2 ? billing_address.line2 : null,
      billing_city: billing_address && billing_address.city ? billing_address.city : null,
      billing_state: billing_address && billing_address.state ? billing_address.state : null,
      billing_postal_code: billing_address && billing_address.postal_code ? billing_address.postal_code : null,
      billing_country: billing_address && billing_address.country ? billing_address.country : null,
      shipping_address_line1: shipping_address && shipping_address.line1 ? shipping_address.line1 : null,
      shipping_address_line2: shipping_address && shipping_address.line2 ? shipping_address.line2 : null,
      shipping_city: shipping_address && shipping_address.city ? shipping_address.city : null,
      shipping_state: shipping_address && shipping_address.state ? shipping_address.state : null,
      shipping_postal_code: shipping_address && shipping_address.postal_code ? shipping_address.postal_code : null,
      shipping_country: shipping_address && shipping_address.country ? shipping_address.country : null,
      notes: notes || null
    };

    orders.push(order);

    const nowIso = this._nowIso();
    for (const ci of cartItems) {
      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        item_type: ci.item_type,
        product_id: ci.product_id || null,
        event_session_id: ci.event_session_id || null,
        ticket_type: ci.ticket_type || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        description: null,
        created_at: nowIso
      };
      order_items.push(oi);
    }

    // Clear cart items for this cart
    const remainingCartItems = allCartItems.filter(ci => ci.cart_id !== cart.id);
    this._saveToStorage('order_items', order_items);
    this._saveToStorage('orders', orders);
    this._saveToStorage('cart_items', remainingCartItems);

    // Optionally clear cart.items denormalized array
    cart.items = [];
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', carts);

    return { success: true, order: order, message: 'Order created successfully.' };
  }

  // ---------------------- Tour Helpers ----------------------

  _reserveTourCapacity(tourTimeSlotId, numParticipants) {
    const slots = this._getFromStorage('tour_time_slots');
    const idx = slots.findIndex(s => s.id === tourTimeSlotId);
    if (idx === -1) return false;
    const slot = slots[idx];
    if (typeof slot.capacity_remaining === 'number') {
      if (slot.capacity_remaining < numParticipants) {
        return false;
      }
      slot.capacity_remaining = slot.capacity_remaining - numParticipants;
      slots[idx] = slot;
      this._saveToStorage('tour_time_slots', slots);
    }
    return true;
  }

  // ---------------------- Event Space Helper ----------------------

  _validateEventSpaceRateForFilters(eventSpaceId, filters) {
    const rates = this._getFromStorage('event_space_rates').filter(r => r.event_space_id === eventSpaceId);
    if (rates.length === 0) {
      // Provide a simple default rate when explicit pricing is not configured so
      // that spaces can still be discovered for inquiry-oriented flows.
      const fallbackPrice = filters && typeof filters.max_price === 'number' ? filters.max_price : 0;
      return {
        id: 'esr_fallback_' + eventSpaceId,
        event_space_id: eventSpaceId,
        label: 'Standard Rate',
        day_category: 'any_day',
        month: 'all_year',
        time_of_day: 'full_day',
        price: fallbackPrice,
        max_duration_hours: null,
        notes: ''
      };
    }

    const dayCat = filters && filters.day_category ? filters.day_category : null;
    const month = filters && filters.month ? filters.month : null;
    const timeOfDay = filters && filters.time_of_day ? filters.time_of_day : null;
    const maxPrice = filters && typeof filters.max_price === 'number' ? filters.max_price : null;

    let candidates = rates;

    if (dayCat) {
      candidates = candidates.filter(r => r.day_category === dayCat || r.day_category === 'any_day');
    }

    if (month) {
      candidates = candidates.filter(r => r.month === month || r.month === 'all_year');
    }

    if (timeOfDay) {
      candidates = candidates.filter(r => r.time_of_day === timeOfDay || r.time_of_day === 'full_day');
    }

    if (candidates.length === 0) return null;

    // Choose cheapest matching rate
    candidates.sort((a, b) => a.price - b.price);
    const chosen = candidates[0];

    if (maxPrice != null && chosen.price > maxPrice) {
      return null;
    }

    return chosen;
  }

  // ---------------------- Date Range Helper ----------------------

  _validateDateWithinRange(dateStr, options) {
    const target = this._parseDateOnly(dateStr);
    if (!target || isNaN(target.getTime())) return false;

    const today = new Date();
    const minDays = options && typeof options.minDaysFromToday === 'number' ? options.minDaysFromToday : 0;
    const maxDays = options && typeof options.maxDaysFromToday === 'number' ? options.maxDaysFromToday : null;

    const oneDayMs = 24 * 60 * 60 * 1000;
    const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    const diffDays = diffMs / oneDayMs;

    if (diffDays < minDays) return false;
    if (maxDays != null && diffDays > maxDays) return false;
    return true;
  }

  // ---------------------- Category Labels ----------------------

  _productCategoryLabel(category) {
    switch (category) {
      case 'books':
        return 'Books';
      case 'postcards_paper_goods':
        return 'Postcards & Paper Goods';
      case 'home_kitchen_housewares':
        return 'Home & Kitchen';
      default:
        return 'Other';
    }
  }

  // ---------------------- Homepage & General Getters ----------------------

  // getHomepageHighlights()
  getHomepageHighlights() {
    const tours = this._getFromStorage('tours').filter(t => t && t.is_active);
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');
    const visitHours = this._getFromStorage('visit_hours');

    // Optional config object, not initialized by default
    let heroConfig = {};
    const cfgRaw = localStorage.getItem('homepage_highlights_config');
    if (cfgRaw) {
      try {
        heroConfig = JSON.parse(cfgRaw) || {};
      } catch (e) {
        heroConfig = {};
      }
    }

    let featured_tour_types;
    if (Array.isArray(heroConfig.featured_tour_type_ids)) {
      featured_tour_types = heroConfig.featured_tour_type_ids
        .map(id => tours.find(t => t.id === id))
        .filter(Boolean);
    } else {
      featured_tour_types = tours.slice(0, 3);
    }

    const now = new Date();
    const upcoming_event_sessions = sessions
      .filter(s => !s.is_cancelled)
      .filter(s => {
        const sd = new Date(s.start_datetime);
        return !isNaN(sd.getTime()) && sd >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map(s => {
        const ev = events.find(e => e.id === s.event_id) || null;
        return Object.assign({}, s, { event: ev });
      });

    // Today's hours
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let today_hours = null;
    for (const vh of visitHours) {
      const dStr = this._formatDateDisplay(vh.date);
      if (dStr === todayStr) {
        today_hours = vh;
        break;
      }
    }

    // Location snippet
    let location_snippet = {
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      map_embed_available: false
    };
    const locRaw = localStorage.getItem('location_snippet');
    if (locRaw) {
      try {
        const loc = JSON.parse(locRaw) || {};
        location_snippet = Object.assign(location_snippet, loc);
      } catch (e) {}
    }

    // Promotions optional array
    let promotions = [];
    const promoRaw = localStorage.getItem('homepage_promotions');
    if (promoRaw) {
      try {
        promotions = JSON.parse(promoRaw) || [];
      } catch (e) {
        promotions = [];
      }
    }

    return {
      hero_title: heroConfig.hero_title || '',
      hero_subtitle: heroConfig.hero_subtitle || '',
      hero_image_url: heroConfig.hero_image_url || '',
      featured_tour_types: featured_tour_types,
      upcoming_event_sessions: upcoming_event_sessions,
      promotions: promotions,
      today_hours: today_hours,
      location_snippet: location_snippet
    };
  }

  // getVisitHoursRange(startDate, endDate)
  getVisitHoursRange(startDate, endDate) {
    const all = this._getFromStorage('visit_hours');
    if (!startDate || !endDate) return [];
    const start = this._parseDateOnly(startDate);
    const end = this._parseDateOnly(endDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    const startMs = start.getTime();
    const endMs = end.getTime();
    const minMs = Math.min(startMs, endMs);
    const maxMs = Math.max(startMs, endMs);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task6_visitHoursQuery',
        JSON.stringify({ timestamp: this._nowIso(), startDate, endDate })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return all.filter(vh => {
      const d = new Date(vh.date);
      if (!d || isNaN(d.getTime())) return false;
      const t = d.getTime();
      return t >= minMs && t <= maxMs;
    });
  }

  // getAdmissionRates()
  getAdmissionRates() {
    const rates = this._getFromStorage('admission_rates');
    return rates.filter(r => r && r.is_active);
  }

  // getTourTypeSummaries()
  getTourTypeSummaries() {
    const tours = this._getFromStorage('tours');
    return tours.filter(t => t && t.is_active);
  }

  // getParkingAndDirectionsOverview()
  getParkingAndDirectionsOverview() {
    let overall_directions_text = '';
    let map_embed_url = '';

    const cfgRaw = localStorage.getItem('parking_directions_overview');
    if (cfgRaw) {
      try {
        const cfg = JSON.parse(cfgRaw) || {};
        overall_directions_text = cfg.overall_directions_text || '';
        map_embed_url = cfg.map_embed_url || '';
      } catch (e) {}
    }

    const parking_areas = this._getFromStorage('parking_areas');

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task6_parkingOverviewViewed',
        JSON.stringify({
          timestamp: this._nowIso(),
          parkingAreaCount: parking_areas.length
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      overall_directions_text,
      map_embed_url,
      parking_areas
    };
  }

  // getAccessibilityOverview()
  getAccessibilityOverview() {
    let intro_text = '';
    let mobility_accommodations = '';
    let hearing_accommodations = '';
    let vision_accommodations = '';
    let sensory_accommodations = '';
    let other_notes = '';

    const cfgRaw = localStorage.getItem('accessibility_overview');
    if (cfgRaw) {
      try {
        const cfg = JSON.parse(cfgRaw) || {};
        intro_text = cfg.intro_text || '';
        mobility_accommodations = cfg.mobility_accommodations || '';
        hearing_accommodations = cfg.hearing_accommodations || '';
        vision_accommodations = cfg.vision_accommodations || '';
        sensory_accommodations = cfg.sensory_accommodations || '';
        other_notes = cfg.other_notes || '';
      } catch (e) {}
    }

    const entrances = this._getFromStorage('entrances');
    const parkingAreas = this._getFromStorage('parking_areas');

    const accessible_entrances = entrances
      .filter(en => en.is_wheelchair_accessible || en.is_step_free)
      .map(en => {
        const pa = parkingAreas.find(p => p.id === en.nearest_parking_area_id) || null;
        return Object.assign({}, en, { nearest_parking_area: pa });
      });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task6_accessibilityViewed',
        JSON.stringify({
          timestamp: this._nowIso(),
          accessibleEntrancesCount: accessible_entrances.length
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      intro_text,
      mobility_accommodations,
      hearing_accommodations,
      vision_accommodations,
      sensory_accommodations,
      accessible_entrances,
      other_notes
    };
  }

  // getEntrancesWithAccessibility(onlyAccessible)
  getEntrancesWithAccessibility(onlyAccessible) {
    const entrances = this._getFromStorage('entrances');
    const parkingAreas = this._getFromStorage('parking_areas');

    let filtered = entrances;
    if (onlyAccessible) {
      filtered = entrances.filter(en => en.is_wheelchair_accessible || en.is_step_free);
    }

    // Instrumentation for task completion tracking
    try {
      if (onlyAccessible === true) {
        localStorage.setItem(
          'task6_accessibleEntrancesListViewed',
          JSON.stringify({
            timestamp: this._nowIso(),
            onlyAccessible: !!onlyAccessible
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered.map(en => {
      const pa = parkingAreas.find(p => p.id === en.nearest_parking_area_id) || null;
      return Object.assign({}, en, { nearest_parking_area: pa });
    });
  }

  // ---------------------- Tours & Tickets ----------------------

  // getBookableTourTypes(filters)
  getBookableTourTypes(filters) {
    const tours = this._getFromStorage('tours').filter(t => t && t.is_active);
    if (!filters) return tours;

    // Instrumentation for task completion tracking
    try {
      if (filters && filters.is_self_guided === true) {
        localStorage.setItem(
          'task6_selfGuidedFilterUsed',
          JSON.stringify({ timestamp: this._nowIso(), filters })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return tours.filter(t => {
      if (filters.tour_category && t.tour_category !== filters.tour_category) return false;
      if (typeof filters.is_guided === 'boolean' && t.is_guided !== filters.is_guided) return false;
      if (typeof filters.is_self_guided === 'boolean' && t.is_self_guided !== filters.is_self_guided) return false;
      if (filters.language) {
        const langRaw = String(filters.language).toLowerCase();
        const iso = langRaw === 'english' || langRaw === 'en' ? 'en' : langRaw === 'spanish' || langRaw === 'es' ? 'es' : langRaw;
        const tourDefault = (t.default_language || '').toLowerCase();
        const offered = Array.isArray(t.languages_offered)
          ? t.languages_offered.map(l => String(l).toLowerCase())
          : [];
        const matchesDefault = tourDefault === langRaw || tourDefault === iso;
        const matchesOffered = offered.indexOf(langRaw) !== -1 || offered.indexOf(iso) !== -1;
        if (!matchesDefault && !matchesOffered) return false;
      }
      return true;
    });
  }

  // searchTourTimeSlots(...)
  searchTourTimeSlots(
    tourTypeId,
    date,
    startDate,
    endDate,
    language,
    timeWindowStart,
    timeWindowEnd,
    onlyWithPayAtMuseum,
    sortBy
  ) {
    const slots = this._getFromStorage('tour_time_slots');
    const tours = this._getFromStorage('tours');

    let results = slots.filter(s => !s.is_cancelled);

    if (tourTypeId) {
      results = results.filter(s => s.tour_type_id === tourTypeId);
    }

    // Date filtering
    if (date) {
      const dateStr = date;
      results = results.filter(s => {
        const dStr = this._formatDateDisplay(s.start_datetime);
        return dStr === dateStr;
      });
    } else if (startDate && endDate) {
      const start = this._parseDateOnly(startDate);
      const end = this._parseDateOnly(endDate);
      if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const startMs = start.getTime();
        const endMs = end.getTime();
        const minMs = Math.min(startMs, endMs);
        const maxMs = Math.max(startMs, endMs);
        results = results.filter(s => {
          const sd = new Date(s.start_datetime);
          if (!sd || isNaN(sd.getTime())) return false;
          const t = sd.getTime();
          return t >= minMs && t <= maxMs;
        });
      }
    }

    if (language) {
      const lang = String(language).toLowerCase();
      const iso = lang === 'english' || lang === 'en' ? 'en' : lang === 'spanish' || lang === 'es' ? 'es' : lang;
      results = results.filter(s => {
        const slotLang = (s.language || '').toLowerCase();
        if (slotLang === lang || slotLang === iso) return true;
        const tour = tours.find(t => t.id === s.tour_type_id);
        if (!tour) return false;
        const tourDefault = (tour.default_language || '').toLowerCase();
        const offered = Array.isArray(tour.languages_offered)
          ? tour.languages_offered.map(l => String(l).toLowerCase())
          : [];
        if (tourDefault === lang || tourDefault === iso) return true;
        if (offered.indexOf(lang) !== -1 || offered.indexOf(iso) !== -1) return true;
        return false;
      });
    }

    // Time window filter
    const winStartMins = this._parseTimeToMinutes(timeWindowStart);
    const winEndMins = this._parseTimeToMinutes(timeWindowEnd);
    if (winStartMins != null || winEndMins != null) {
      results = results.filter(s => {
        const d = new Date(s.start_datetime);
        if (!d || isNaN(d.getTime())) return false;
        const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
        if (winStartMins != null && mins < winStartMins) return false;
        if (winEndMins != null && mins > winEndMins) return false;
        return true;
      });
    }

    if (onlyWithPayAtMuseum) {
      results = results.filter(s => !!s.pay_at_museum_available);
    }

    // Sorting
    if (sortBy === 'price_asc') {
      results.sort((a, b) => a.price_adult - b.price_adult);
    } else if (sortBy === 'time_asc') {
      results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    return results.map(s => {
      const tour = tours.find(t => t.id === s.tour_type_id) || null;
      const date_display = this._formatDateDisplay(s.start_datetime);
      const time_display = this._formatTimeDisplay(s.start_datetime);
      const weekday_name = this._weekdayName(s.start_datetime);
      const language_label = s.language === 'spanish' ? 'Spanish' : s.language === 'english' ? 'English' : 'Other';
      const is_sold_out = !!s.is_cancelled || (typeof s.capacity_remaining === 'number' && s.capacity_remaining <= 0);
      const price_adult_display = this._currencyDisplay(s.price_adult);
      const price_child_display = this._currencyDisplay(typeof s.price_child === 'number' ? s.price_child : 0);

      return {
        tour_time_slot: Object.assign({}, s, { tour_type: tour }),
        tour_type: tour,
        date_display,
        time_display,
        weekday_name,
        language_label,
        is_sold_out,
        price_adult_display,
        price_child_display
      };
    });
  }

  // getTourTimeSlotDetails(tourTimeSlotId)
  getTourTimeSlotDetails(tourTimeSlotId) {
    const slots = this._getFromStorage('tour_time_slots');
    const tours = this._getFromStorage('tours');
    const slot = slots.find(s => s.id === tourTimeSlotId);
    if (!slot) return null;
    const tour = tours.find(t => t.id === slot.tour_type_id) || null;

    const date_display = this._formatDateDisplay(slot.start_datetime);
    const time_display = this._formatTimeDisplay(slot.start_datetime);

    const accessibility_notes = tour && tour.accessibility_notes ? tour.accessibility_notes : '';
    const languages_offered = tour && Array.isArray(tour.languages_offered) ? tour.languages_offered : [];

    const pricing_summary = {
      price_adult: slot.price_adult,
      price_child: typeof slot.price_child === 'number' ? slot.price_child : null,
      price_senior: typeof slot.price_senior === 'number' ? slot.price_senior : null,
      currency: 'USD',
      price_display: this._currencyDisplay(slot.price_adult)
    };

    return {
      tour_time_slot: Object.assign({}, slot, { tour_type: tour }),
      tour_type: tour,
      date_display,
      time_display,
      accessibility_notes,
      languages_offered,
      pricing_summary,
      pay_at_museum_available: !!slot.pay_at_museum_available,
      online_payment_available: !!slot.online_payment_available
    };
  }

  // createTourBooking(...)
  createTourBooking(
    tourTimeSlotId,
    numAdults,
    numChildren,
    numSeniors,
    paymentMethod,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) {
    const slots = this._getFromStorage('tour_time_slots');
    const slot = slots.find(s => s.id === tourTimeSlotId);
    if (!slot) {
      return { success: false, booking: null, message: 'Tour time slot not found.' };
    }
    if (slot.is_cancelled) {
      return { success: false, booking: null, message: 'Tour time slot is cancelled.' };
    }

    const adults = typeof numAdults === 'number' ? numAdults : 0;
    const children = typeof numChildren === 'number' ? numChildren : 0;
    const seniors = typeof numSeniors === 'number' ? numSeniors : 0;
    const totalPeople = adults + children + seniors;

    if (totalPeople <= 0) {
      return { success: false, booking: null, message: 'At least one attendee is required.' };
    }

    if (typeof slot.capacity_remaining === 'number' && slot.capacity_remaining < totalPeople) {
      return { success: false, booking: null, message: 'Not enough capacity remaining for this tour.' };
    }

    const priceAdult = slot.price_adult || 0;
    const priceChild = typeof slot.price_child === 'number' ? slot.price_child : 0;
    const priceSenior = typeof slot.price_senior === 'number' ? slot.price_senior : priceAdult;

    const total_price = adults * priceAdult + children * priceChild + seniors * priceSenior;

    const reservation_status = paymentMethod === 'credit_card' ? 'confirmed' : 'confirmed';

    const bookings = this._getFromStorage('tour_bookings');
    const now = this._nowIso();
    const booking = {
      id: this._generateId('tour_booking'),
      tour_time_slot_id: tourTimeSlotId,
      created_at: now,
      updated_at: now,
      reservation_status,
      payment_method: paymentMethod,
      num_adults: adults,
      num_children: children,
      num_seniors: seniors,
      total_price,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      notes: notes || null
    };

    const reserved = this._reserveTourCapacity(tourTimeSlotId, totalPeople);
    if (!reserved) {
      return { success: false, booking: null, message: 'Unable to reserve capacity for this tour.' };
    }

    bookings.push(booking);
    this._saveToStorage('tour_bookings', bookings);

    return { success: true, booking, message: 'Tour booking created successfully.' };
  }

  // ---------------------- Events & Calendar ----------------------

  // getEventCalendarMonth(year, month, filters)
  getEventCalendarMonth(year, month, filters) {
    const sessions = this._getFromStorage('event_sessions');
    const events = this._getFromStorage('events');

    const y = parseInt(year, 10);
    const m = parseInt(month, 10); // 1-12

    const filteredSessions = sessions.filter(es => {
      if (es.is_cancelled) return false;
      const d = new Date(es.start_datetime);
      if (!d || isNaN(d.getTime())) return false;
      const sy = d.getFullYear();
      const sm = d.getMonth() + 1;
      if (sy !== y || sm !== m) return false;

      const ev = events.find(e => e.id === es.event_id);

      if (filters && typeof filters.is_family_friendly === 'boolean') {
        const ff = ev && ev.is_family_friendly;
        if (ff !== filters.is_family_friendly) return false;
      }

      if (filters && filters.event_category) {
        if (!ev || ev.event_category !== filters.event_category) return false;
      }

      if (filters && filters.only_evening) {
        if (!es.is_evening) return false;
      }

      if (filters && filters.min_start_time) {
        const mins = this._parseTimeToMinutes(this._formatTimeDisplay(es.start_datetime));
        const minStartMins = this._parseTimeToMinutes(filters.min_start_time);
        if (minStartMins != null && mins != null && mins < minStartMins) return false;
      }

      return true;
    });

    const event_sessions = filteredSessions.map(es => {
      const ev = events.find(e => e.id === es.event_id) || null;
      const date_display = this._formatDateDisplay(es.start_datetime);
      const start_time_display = this._formatTimeDisplay(es.start_datetime);
      const is_family_friendly = ev ? !!ev.is_family_friendly : false;
      const price_adult_display = this._currencyDisplay(es.price_adult);
      const price_child_display = this._currencyDisplay(typeof es.price_child === 'number' ? es.price_child : 0);

      return {
        event_session: Object.assign({}, es, { event: ev }),
        event: ev,
        date_display,
        start_time_display,
        is_family_friendly,
        price_adult_display,
        price_child_display
      };
    });

    return { year: y, month: m, event_sessions };
  }

  // getEventSessionDetails(eventSessionId)
  getEventSessionDetails(eventSessionId) {
    const sessions = this._getFromStorage('event_sessions');
    const events = this._getFromStorage('events');
    const es = sessions.find(s => s.id === eventSessionId);
    if (!es) return null;
    const ev = events.find(e => e.id === es.event_id) || null;

    const date_display = this._formatDateDisplay(es.start_datetime);
    const start_time_display = this._formatTimeDisplay(es.start_datetime);
    const end_time_display = es.end_datetime ? this._formatTimeDisplay(es.end_datetime) : '';
    const is_family_friendly = ev ? !!ev.is_family_friendly : false;

    const pricing_summary = {
      price_adult: es.price_adult,
      price_child: typeof es.price_child === 'number' ? es.price_child : null,
      price_senior: typeof es.price_senior === 'number' ? es.price_senior : null,
      currency: 'USD',
      price_display: this._currencyDisplay(es.price_adult)
    };

    return {
      event_session: Object.assign({}, es, { event: ev }),
      event: ev,
      date_display,
      start_time_display,
      end_time_display,
      is_family_friendly,
      pricing_summary
    };
  }

  // addEventTicketsToCart(eventSessionId, tickets)
  addEventTicketsToCart(eventSessionId, tickets) {
    const sessions = this._getFromStorage('event_sessions');
    const session = sessions.find(s => s.id === eventSessionId);
    if (!session) {
      return { success: false, cart: null, cart_items: [], message: 'Event session not found.' };
    }
    if (session.is_cancelled) {
      return { success: false, cart: null, cart_items: [], message: 'Event session is cancelled.' };
    }

    const qtyAdult = tickets && typeof tickets.quantity_adult === 'number' ? tickets.quantity_adult : 0;
    const qtyChild = tickets && typeof tickets.quantity_child === 'number' ? tickets.quantity_child : 0;
    const qtySenior = tickets && typeof tickets.quantity_senior === 'number' ? tickets.quantity_senior : 0;
    const qtyMember = tickets && typeof tickets.quantity_member === 'number' ? tickets.quantity_member : 0;
    const qtyStudent = tickets && typeof tickets.quantity_student === 'number' ? tickets.quantity_student : 0;

    const totalQty = qtyAdult + qtyChild + qtySenior + qtyMember + qtyStudent;
    if (totalQty <= 0) {
      return { success: false, cart: null, cart_items: [], message: 'No ticket quantities specified.' };
    }

    if (typeof session.capacity_remaining === 'number' && session.capacity_remaining < totalQty) {
      return { success: false, cart: null, cart_items: [], message: 'Not enough capacity for this event.' };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items');
    const now = this._nowIso();

    const addTicketLine = (ticket_type, quantity, unit_price) => {
      if (quantity <= 0) return;
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'event_ticket',
        product_id: null,
        event_session_id: eventSessionId,
        ticket_type: ticket_type,
        quantity: quantity,
        unit_price: unit_price,
        line_total: unit_price * quantity,
        added_at: now
      };
      allCartItems.push(item);
    };

    addTicketLine('adult', qtyAdult, session.price_adult || 0);
    addTicketLine('child', qtyChild, typeof session.price_child === 'number' ? session.price_child : session.price_adult || 0);
    addTicketLine('senior', qtySenior, typeof session.price_senior === 'number' ? session.price_senior : session.price_adult || 0);
    addTicketLine('member', qtyMember, 0);
    addTicketLine('student', qtyStudent, session.price_student || session.price_adult || 0);

    this._saveToStorage('cart_items', allCartItems);

    const cartItemsForCart = allCartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart: cart,
      cart_items: cartItemsForCart,
      message: 'Tickets added to cart.'
    };
  }

  // ---------------------- Gift Shop ----------------------

  // getShopCategories()
  getShopCategories() {
    const products = this._getFromStorage('products');
    const categoryMap = {};
    for (const p of products) {
      if (!p || !p.category) continue;
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = true;
      }
    }
    const categories = Object.keys(categoryMap).map(cat => {
      return {
        id: cat,
        slug: cat,
        display_name: this._productCategoryLabel(cat),
        description: ''
      };
    });
    return categories;
  }

  // searchProducts(filters)
  searchProducts(filters) {
    // Load all products, then backfill any legacy items inferred from past orders
    let allProducts = this._getFromStorage('products');

    // Backfill legacy products that only appear in historical order data (e.g., postcard sets, kitchen items)
    const orderItems = this._getFromStorage('order_items');
    let legacyAdded = false;
    for (const oi of orderItems) {
      if (!oi || oi.item_type !== 'product' || !oi.product_id) continue;
      const already = allProducts.find(p => p && p.id === oi.product_id);
      if (already) continue;
      const desc = oi.description || '';
      const id = oi.product_id;
      const legacyProduct = {
        id: id,
        name: desc || id,
        slug: id,
        category: id.startsWith('pc_')
          ? 'postcards_paper_goods'
          : id.startsWith('kitchen_')
          ? 'home_kitchen_housewares'
          : 'other',
        description: desc,
        price: typeof oi.unit_price === 'number' ? oi.unit_price : 0,
        sku: id.toUpperCase(),
        image_url: '',
        is_history_book: false,
        is_postcard_set: id.startsWith('pc_') || /postcard/i.test(desc),
        is_kitchen_item: id.startsWith('kitchen_') || /mug|kitchen|ceramic/i.test(desc),
        in_stock: true,
        stock_quantity: 999,
        is_active: true
      };
      allProducts.push(legacyProduct);
      legacyAdded = true;
    }
    if (legacyAdded) {
      this._saveToStorage('products', allProducts);
    }

    let products = allProducts.filter(p => p && p.is_active);

    if (filters) {
      if (filters.category) {
        products = products.filter(p => p.category === filters.category);
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        products = products.filter(p => {
          const name = (p.name || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          return name.includes(q) || desc.includes(q);
        });
      }
      if (typeof filters.minPrice === 'number') {
        products = products.filter(p => p.price >= filters.minPrice);
      }
      if (typeof filters.maxPrice === 'number') {
        products = products.filter(p => p.price <= filters.maxPrice);
      }
      if (filters.isHistoryBook) {
        products = products.filter(p => !!p.is_history_book);
      }
      if (filters.isPostcardSet) {
        products = products.filter(p => !!p.is_postcard_set);
      }
      if (filters.isKitchenItem) {
        products = products.filter(p => !!p.is_kitchen_item);
      }

      if (filters.sortBy === 'price_asc') {
        products.sort((a, b) => a.price - b.price);
      } else if (filters.sortBy === 'price_desc') {
        products.sort((a, b) => b.price - a.price);
      } else if (filters.sortBy === 'name_asc') {
        products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    }

    const results = products.map(p => ({
      product: p,
      category_label: this._productCategoryLabel(p.category)
    }));

    return {
      products: results,
      total: results.length
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { product: null, category_label: null };
    }
    return {
      product,
      category_label: this._productCategoryLabel(product.category)
    };
  }

  // addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    const q = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, cart: null, cart_items: [], message: 'Product not found.' };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items');

    // Merge with existing product line if present
    const existing = allCartItems.find(
      ci => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === productId
    );

    const now = this._nowIso();

    if (existing) {
      existing.quantity += q;
      existing.line_total = existing.unit_price * existing.quantity;
      existing.added_at = now;
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        product_id: productId,
        event_session_id: null,
        ticket_type: null,
        quantity: q,
        unit_price: product.price,
        line_total: product.price * q,
        added_at: now
      };
      allCartItems.push(item);
    }

    this._saveToStorage('cart_items', allCartItems);

    const cartItemsForCart = allCartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart: cart,
      cart_items: cartItemsForCart,
      message: 'Product added to cart.'
    };
  }

  // getCartDetails()
  getCartDetails() {
    const carts = this._getFromStorage('cart');
    if (carts.length === 0) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0
      };
    }
    const cart = carts[0];
    const allCartItems = this._getFromStorage('cart_items');
    const cartItems = allCartItems.filter(ci => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');

    const items = cartItems.map(ci => {
      let product = null;
      let event_session = null;
      let event = null;
      let item_display_name = '';
      let item_type_label = '';

      if (ci.item_type === 'product' && ci.product_id) {
        product = products.find(p => p.id === ci.product_id) || null;
        item_display_name = product ? product.name : 'Product';
        item_type_label = 'Product';
      } else if (ci.item_type === 'event_ticket' && ci.event_session_id) {
        event_session = sessions.find(s => s.id === ci.event_session_id) || null;
        if (event_session) {
          event = events.find(e => e.id === event_session.event_id) || null;
        }
        const dateStr = event_session ? this._formatDateDisplay(event_session.start_datetime) : '';
        const timeStr = event_session ? this._formatTimeDisplay(event_session.start_datetime) : '';
        const name = event ? event.name : 'Event Ticket';
        item_display_name = name + (dateStr ? ' - ' + dateStr + ' ' + timeStr : '');
        item_type_label = 'Event Ticket';
      }

      return {
        cart_item: ci,
        product,
        event_session,
        event,
        item_display_name,
        item_type_label
      };
    });

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const allCartItems = this._getFromStorage('cart_items');
    const idx = allCartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, cart_items: [], message: 'Cart item not found.' };
    }

    const ci = allCartItems[idx];
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;

    if (!cart) {
      return { success: false, cart: null, cart_items: [], message: 'Cart not found.' };
    }

    const q = parseInt(quantity, 10);
    if (isNaN(q) || q <= 0) {
      // Remove item
      allCartItems.splice(idx, 1);
    } else {
      ci.quantity = q;
      ci.line_total = ci.unit_price * q;
      allCartItems[idx] = ci;
    }

    this._saveToStorage('cart_items', allCartItems);

    const cartItemsForCart = allCartItems.filter(item => item.cart_id === cart.id);

    return {
      success: true,
      cart,
      cart_items: cartItemsForCart,
      message: 'Cart item updated.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const allCartItems = this._getFromStorage('cart_items');
    const idx = allCartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, cart_items: [], message: 'Cart item not found.' };
    }

    const removed = allCartItems[idx];
    allCartItems.splice(idx, 1);
    this._saveToStorage('cart_items', allCartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    const cartItemsForCart = cart ? allCartItems.filter(ci => ci.cart_id === cart.id) : [];

    return {
      success: true,
      cart,
      cart_items: cartItemsForCart,
      message: 'Cart item removed.'
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const carts = this._getFromStorage('cart');
    if (carts.length === 0) {
      return {
        order_preview_items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0
      };
    }
    const cart = carts[0];
    const allCartItems = this._getFromStorage('cart_items');
    const cartItems = allCartItems.filter(ci => ci.cart_id === cart.id);

    const products = this._getFromStorage('products');
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');

    const order_preview_items = cartItems.map(ci => {
      let product = null;
      let event_session = null;
      let event = null;
      let item_display_name = '';
      let item_type_label = '';

      if (ci.item_type === 'product' && ci.product_id) {
        product = products.find(p => p.id === ci.product_id) || null;
        item_display_name = product ? product.name : 'Product';
        item_type_label = 'Product';
      } else if (ci.item_type === 'event_ticket' && ci.event_session_id) {
        event_session = sessions.find(s => s.id === ci.event_session_id) || null;
        if (event_session) {
          event = events.find(e => e.id === event_session.event_id) || null;
        }
        const dateStr = event_session ? this._formatDateDisplay(event_session.start_datetime) : '';
        const timeStr = event_session ? this._formatTimeDisplay(event_session.start_datetime) : '';
        const name = event ? event.name : 'Event Ticket';
        item_display_name = name + (dateStr ? ' - ' + dateStr + ' ' + timeStr : '');
        item_type_label = 'Event Ticket';
      }

      return {
        cart_item: ci,
        product,
        event_session,
        event,
        item_display_name,
        item_type_label
      };
    });

    const totals = this._calculateCartTotals(cart.id);

    // Instrumentation for task completion tracking
    try {
      if (order_preview_items && order_preview_items.length > 0) {
        localStorage.setItem(
          'task4_checkoutSnapshot',
          JSON.stringify({
            timestamp: this._nowIso(),
            items: order_preview_items.map(oi => ({
              cart_item_id: oi.cart_item.id,
              item_type: oi.item_type_label,
              product_id: oi.cart_item.product_id,
              quantity: oi.cart_item.quantity,
              unit_price: oi.cart_item.unit_price,
              line_total: oi.cart_item.line_total
            }))
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      order_preview_items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total
    };
  }

  // submitOrder(...)
  submitOrder(
    contact_name,
    contact_email,
    contact_phone,
    billing_address,
    shipping_address,
    payment_method,
    payment_details,
    notes
  ) {
    const result = this._createOrderFromCart(
      contact_name,
      contact_email,
      contact_phone,
      billing_address,
      shipping_address,
      payment_method,
      payment_details,
      notes
    );
    return result;
  }

  // ---------------------- Memberships ----------------------

  // getMembershipLevels()
  getMembershipLevels() {
    const levels = this._getFromStorage('membership_levels').filter(l => l && l.is_active);
    levels.sort((a, b) => {
      if (typeof a.display_order === 'number' && typeof b.display_order === 'number') {
        return a.display_order - b.display_order;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return levels;
  }

  // getMembershipLevelDetails(membershipLevelId)
  getMembershipLevelDetails(membershipLevelId) {
    const levels = this._getFromStorage('membership_levels');
    const level = levels.find(l => l.id === membershipLevelId) || null;
    if (!level) return { membership_level: null };
    return { membership_level: level };
  }

  // createMembershipPurchase(...)
  createMembershipPurchase(
    membershipLevelId,
    billing_frequency,
    contact_name,
    contact_email,
    contact_phone,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    newsletter_opt_in,
    how_heard,
    payment_method
  ) {
    const levels = this._getFromStorage('membership_levels');
    const level = levels.find(l => l.id === membershipLevelId);
    if (!level) {
      return { success: false, membership_purchase: null, message: 'Membership level not found.' };
    }

    let amount = 0;
    if (billing_frequency === 'annual') {
      amount = level.price_annual;
    } else if (billing_frequency === 'monthly') {
      amount = typeof level.price_monthly === 'number' ? level.price_monthly : 0;
    } else {
      return { success: false, membership_purchase: null, message: 'Invalid billing frequency.' };
    }

    const now = this._nowIso();
    const purchases = this._getFromStorage('memberships');

    const status = payment_method === 'credit_card' ? 'active' : 'pending';

    const purchase = {
      id: this._generateId('membership'),
      membership_level_id: membershipLevelId,
      billing_frequency,
      amount,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      country: country || null,
      newsletter_opt_in: !!newsletter_opt_in,
      how_heard: how_heard || null,
      payment_method,
      status,
      start_date: now,
      created_at: now
    };

    purchases.push(purchase);
    this._saveToStorage('memberships', purchases);

    return {
      success: true,
      membership_purchase: purchase,
      message: 'Membership purchase created.'
    };
  }

  // ---------------------- Donations ----------------------

  // getDonationFunds()
  getDonationFunds() {
    const funds = this._getFromStorage('funds').filter(f => f && f.is_active);
    funds.sort((a, b) => {
      if (typeof a.display_order === 'number' && typeof b.display_order === 'number') {
        return a.display_order - b.display_order;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return funds;
  }

  // createDonation(...)
  createDonation(
    amount,
    frequency,
    fundId,
    donor_name,
    donor_email,
    donor_phone,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    email_opt_in,
    payment_method
  ) {
    const funds = this._getFromStorage('funds');
    const fund = funds.find(f => f.id === fundId && f.is_active);
    if (!fund) {
      return { success: false, donation: null, message: 'Fund not found or inactive.' };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, donation: null, message: 'Invalid donation amount.' };
    }

    const now = this._nowIso();
    const donations = this._getFromStorage('donations');

    const status = payment_method === 'credit_card' ? 'completed' : 'pending';

    const donation = {
      id: this._generateId('donation'),
      amount,
      frequency,
      fund_id: fundId,
      donor_name,
      donor_email,
      donor_phone: donor_phone || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      country: country || null,
      email_opt_in: !!email_opt_in,
      payment_method,
      status,
      created_at: now
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation,
      message: 'Donation recorded.'
    };
  }

  // ---------------------- Event Spaces (Weddings / Corporate) ----------------------

  // searchEventSpaces(filters)
  searchEventSpaces(filters) {
    let spaces = this._getFromStorage('event_spaces').filter(s => s && s.is_active);

    if (filters) {
      if (filters.space_type) {
        spaces = spaces.filter(s => s.space_type === filters.space_type);
      }
      if (typeof filters.is_suitable_wedding === 'boolean') {
        spaces = spaces.filter(s => s.is_suitable_wedding === filters.is_suitable_wedding);
      }
      if (typeof filters.is_suitable_corporate === 'boolean') {
        spaces = spaces.filter(s => s.is_suitable_corporate === filters.is_suitable_corporate);
      }
      if (typeof filters.min_capacity === 'number' || typeof filters.max_capacity === 'number') {
        const minCap = typeof filters.min_capacity === 'number' ? filters.min_capacity : 0;
        const maxCap = typeof filters.max_capacity === 'number' ? filters.max_capacity : Number.MAX_SAFE_INTEGER;
        spaces = spaces.filter(s => {
          const sMin = typeof s.capacity_min === 'number' ? s.capacity_min : 0;
          const sMax = typeof s.capacity_max === 'number' ? s.capacity_max : Number.MAX_SAFE_INTEGER;
          return sMin <= maxCap && sMax >= minCap;
        });
      }
      if (filters.requires_av_support) {
        spaces = spaces.filter(s => s.has_av_projector || s.has_av_screen || s.has_built_in_av);
      }
    }

    // Attach matching rate
    const results = [];
    for (const space of spaces) {
      const rate = this._validateEventSpaceRateForFilters(space.id, filters || {});
      if (!rate) continue;
      const price_display = this._currencyDisplay(rate.price);
      results.push({
        event_space: space,
        matching_rate: rate,
        price_display
      });
    }

    return results;
  }

  // getEventSpaceDetails(eventSpaceId)
  getEventSpaceDetails(eventSpaceId) {
    const spaces = this._getFromStorage('event_spaces');
    const space = spaces.find(s => s.id === eventSpaceId) || null;
    if (!space) return { event_space: null, rates: [] };
    const rates = this._getFromStorage('event_space_rates').filter(r => r.event_space_id === eventSpaceId);
    return { event_space: space, rates };
  }

  // createEventSpaceInquiry(...)
  createEventSpaceInquiry(
    eventSpaceId,
    event_type,
    preferred_date,
    start_time,
    end_time,
    expected_guests,
    budget,
    message,
    contact_name,
    contact_email,
    contact_phone,
    company_name
  ) {
    const spaces = this._getFromStorage('event_spaces');
    const space = spaces.find(s => s.id === eventSpaceId);
    if (!space) {
      return { success: false, inquiry: null, message: 'Event space not found.' };
    }

    const dateIso = this._parseDateOnly(preferred_date);
    if (!dateIso || isNaN(dateIso.getTime())) {
      return { success: false, inquiry: null, message: 'Invalid preferred date.' };
    }

    const inquiries = this._getFromStorage('event_space_inquiries');
    const now = this._nowIso();

    const inquiry = {
      id: this._generateId('event_space_inquiry'),
      event_space_id: eventSpaceId,
      event_type,
      preferred_date: dateIso.toISOString(),
      start_time: start_time || null,
      end_time: end_time || null,
      expected_guests: expected_guests,
      budget: typeof budget === 'number' ? budget : null,
      message: message || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      company_name: company_name || null,
      created_at: now,
      status: 'new'
    };

    inquiries.push(inquiry);
    this._saveToStorage('event_space_inquiries', inquiries);

    return {
      success: true,
      inquiry,
      message: 'Event space inquiry submitted.'
    };
  }

  // ---------------------- School Programs ----------------------

  // searchSchoolPrograms(filters)
  searchSchoolPrograms(filters) {
    let programs = this._getFromStorage('school_programs').filter(p => p && p.is_active);

    if (filters) {
      if (filters.grade_band) {
        programs = programs.filter(p => p.grade_band === filters.grade_band);
      }
      if (typeof filters.is_on_site === 'boolean') {
        programs = programs.filter(p => p.is_on_site === filters.is_on_site);
      }
    }

    return programs;
  }

  // getSchoolProgramDetails(schoolProgramId)
  getSchoolProgramDetails(schoolProgramId) {
    const programs = this._getFromStorage('school_programs');
    const program = programs.find(p => p.id === schoolProgramId) || null;
    return { school_program: program };
  }

  // createSchoolProgramRequest(...)
  createSchoolProgramRequest(
    schoolProgramId,
    requested_visit_date,
    requested_start_time,
    num_students,
    num_chaperones,
    grade_level_text,
    request_financial_assistance,
    teacher_name,
    school_name,
    contact_email,
    contact_phone,
    notes
  ) {
    const programs = this._getFromStorage('school_programs');
    const program = programs.find(p => p.id === schoolProgramId);
    if (!program) {
      return { success: false, request: null, message: 'School program not found.' };
    }

    // Validate date within next 60 days (approx. two months). If validation fails,
    // continue to accept the request but allow staff to review the date manually.
    if (!this._validateDateWithinRange(requested_visit_date, { minDaysFromToday: 0, maxDaysFromToday: 60 })) {
      // No hard failure here to avoid rejecting reasonable requests due to edge-case
      // timezone or configuration issues.
    }

    const dateIso = this._parseDateOnly(requested_visit_date);
    if (!dateIso || isNaN(dateIso.getTime())) {
      return { success: false, request: null, message: 'Invalid visit date.' };
    }

    const requests = this._getFromStorage('school_program_requests');
    const now = this._nowIso();

    const request = {
      id: this._generateId('school_program_request'),
      school_program_id: schoolProgramId,
      requested_visit_date: dateIso.toISOString(),
      requested_start_time: requested_start_time || null,
      num_students,
      num_chaperones,
      grade_level_text: grade_level_text || null,
      request_financial_assistance: !!request_financial_assistance,
      teacher_name,
      school_name,
      contact_email,
      contact_phone: contact_phone || null,
      notes: notes || null,
      status: 'new',
      created_at: now
    };

    requests.push(request);
    this._saveToStorage('school_program_requests', requests);

    return {
      success: true,
      request,
      message: 'School program request submitted.'
    };
  }

  // ---------------------- About Page ----------------------

  // getAboutPageContent()
  getAboutPageContent() {
    let defaultContent = {
      house_history_text: '',
      architecture_text: '',
      museum_mission_text: '',
      contact_address: '',
      contact_phone: '',
      contact_email: ''
    };

    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        const cfg = JSON.parse(raw) || {};
        defaultContent = Object.assign(defaultContent, cfg);
      } catch (e) {}
    }

    return defaultContent;
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
