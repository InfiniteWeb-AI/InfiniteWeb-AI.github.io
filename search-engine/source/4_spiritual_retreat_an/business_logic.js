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
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'retreats',
      'retreat_sessions',
      'retreat_bookings',
      'workshops',
      'custom_retreat_packages',
      'courses',
      'course_tiers',
      'course_enrollments',
      'mentors',
      'mentor_services',
      'mentor_availability_slots',
      'mentoring_appointments',
      'products',
      'carts',
      'cart_items',
      'events',
      'event_registrations',
      'library_items',
      'playlists',
      'playlist_items',
      'faq_items',
      'contact_messages'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
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

  _toDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _normalizeDateRangeFilters(startStr, endStr) {
    let start = this._toDate(startStr);
    let end = this._toDate(endStr);
    if (start && end && start.getTime() > end.getTime()) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    return {
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null
    };
  }

  _getCurrencyFallback() {
    // Fallback currency if entities do not specify one
    return 'USD';
  }

  // ---------------------- CART HELPERS ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        subtotal: 0,
        currency: this._getCurrencyFallback(),
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return null;

    const items = cartItems.filter(ci => ci.cart_id === cartId);
    let subtotal = 0;
    let currency = cart.currency || this._getCurrencyFallback();
    for (let i = 0; i < items.length; i++) {
      subtotal += Number(items[i].total_price || 0);
      if (!currency && items[i].currency) {
        currency = items[i].currency;
      }
    }
    cart.subtotal = subtotal;
    cart.currency = currency;
    cart.updated_at = this._nowISO();
    this._saveToStorage('carts', carts);
    return cart;
  }

  // ---------------------- RETREAT HELPERS ----------------------

  _checkRetreatAvailabilityAndPrice(retreatSessionId, start_date, length_days, room_type, meal_plan) {
    const retreatSessions = this._getFromStorage('retreat_sessions', []);
    const retreats = this._getFromStorage('retreats', []);
    const session = retreatSessions.find(rs => rs.id === retreatSessionId && rs.is_active !== false);
    const errors = [];
    if (!session) {
      errors.push('retreat_session_not_found');
      return {
        success: false,
        is_available: false,
        total_price: 0,
        currency: this._getCurrencyFallback(),
        validation_errors: errors
      };
    }

    const start = this._toDate(start_date);
    if (!start) {
      errors.push('invalid_start_date');
    }
    const sessionStart = this._toDate(session.start_date);
    const sessionEnd = this._toDate(session.end_date);

    const length = Number(length_days);
    if (!length || length <= 0) {
      errors.push('invalid_length_days');
    }

    let end = null;
    if (start && length) {
      end = new Date(start.getTime());
      end.setDate(end.getDate() + length - 1);
    }

    if (start && sessionStart && start.getTime() < sessionStart.getTime()) {
      errors.push('start_date_before_session');
    }
    if (end && sessionEnd && end.getTime() > sessionEnd.getTime()) {
      errors.push('end_date_after_session');
    }

    if (session.spots_remaining != null && Number(session.spots_remaining) <= 0) {
      errors.push('no_spots_remaining');
    }

    if (session.available_room_types && session.available_room_types.length > 0) {
      if (room_type && session.available_room_types.indexOf(room_type) === -1) {
        errors.push('room_type_not_available');
      }
    }

    if (session.available_meal_plans && session.available_meal_plans.length > 0) {
      if (meal_plan && session.available_meal_plans.indexOf(meal_plan) === -1) {
        errors.push('meal_plan_not_available');
      }
    }

    const currency = session.currency || this._getCurrencyFallback();

    if (errors.length > 0) {
      return {
        success: false,
        is_available: false,
        total_price: 0,
        currency,
        validation_errors: errors
      };
    }

    // Price calculation: proportion of base_price by length vs session duration
    let basePrice = Number(session.base_price || 0);
    const duration = Number(session.duration_days || length);
    let total_price = basePrice;
    if (duration > 0) {
      total_price = basePrice * (length / duration);
    }

    // Apply room and meal modifiers from booking options if present
    const bookingOptions = this.getRetreatBookingOptions(retreatSessionId);
    if (bookingOptions && bookingOptions.room_types) {
      const rt = bookingOptions.room_types.find(r => r.value === room_type);
      if (rt && typeof rt.price_modifier === 'number') {
        total_price += rt.price_modifier;
      }
    }
    if (bookingOptions && bookingOptions.meal_plans) {
      const mp = bookingOptions.meal_plans.find(m => m.value === meal_plan);
      if (mp && typeof mp.price_modifier === 'number') {
        total_price += mp.price_modifier;
      }
    }

    return {
      success: true,
      is_available: true,
      total_price,
      currency,
      validation_errors: []
    };
  }

  // ---------------------- EVENT HELPERS ----------------------

  _checkEventAvailability(eventId, attendees_count) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId && e.is_active !== false);
    const errors = [];
    if (!event) {
      errors.push('event_not_found');
      return { success: false, is_available: false, validation_errors: errors };
    }
    const count = Number(attendees_count || 0);
    if (!count || count <= 0) {
      errors.push('invalid_attendees_count');
    }
    if (event.spots_remaining != null && Number(event.spots_remaining) < count) {
      errors.push('not_enough_spots_remaining');
    }
    if (errors.length > 0) {
      return { success: false, is_available: false, validation_errors: errors };
    }
    return { success: true, is_available: true, validation_errors: [] };
  }

  // ---------------------- MENTOR HELPERS ----------------------

  _checkMentorSlotAvailability(mentorId, mentorServiceId, availabilitySlotId) {
    const slots = this._getFromStorage('mentor_availability_slots', []);
    const slot = slots.find(s => s.id === availabilitySlotId);
    const errors = [];
    if (!slot) {
      errors.push('slot_not_found');
      return { success: false, is_available: false, validation_errors: errors };
    }
    if (slot.mentor_id && mentorId && slot.mentor_id !== mentorId) {
      errors.push('slot_mentor_mismatch');
    }
    if (slot.mentor_service_id && mentorServiceId && slot.mentor_service_id !== mentorServiceId) {
      errors.push('slot_service_mismatch');
    }
    if (slot.status !== 'available') {
      errors.push('slot_not_available');
    }
    if (errors.length > 0) {
      return { success: false, is_available: false, validation_errors: errors };
    }
    return { success: true, is_available: true, validation_errors: [] };
  }

  // ---------------------- PLAYLIST HELPERS ----------------------

  _createOrGetPlaylistByName(name) {
    const normalizedName = (name || '').trim();
    if (!normalizedName) return null;
    let playlists = this._getFromStorage('playlists', []);
    let playlist = playlists.find(p => (p.name || '').toLowerCase() === normalizedName.toLowerCase());
    if (!playlist) {
      playlist = {
        id: this._generateId('playlist'),
        name: normalizedName,
        description: '',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }
    return playlist;
  }

  // ---------------------- HOMEPAGE ----------------------

  getHomepageHighlights() {
    const now = this._nowISO();

    // Retreat highlights
    const retreatSessions = this._getFromStorage('retreat_sessions', []);
    const retreats = this._getFromStorage('retreats', []);
    const upcomingSessions = retreatSessions
      .filter(rs => rs.is_active !== false && (!rs.start_date || rs.start_date >= now))
      .sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      })
      .slice(0, 5)
      .map(rs => {
        const retreat = retreats.find(r => r.id === rs.retreat_id) || {};
        return {
          retreat_session_id: rs.id,
          retreat_name: retreat.name || '',
          title: rs.title || '',
          type: retreat.type || null,
          start_date: rs.start_date || null,
          end_date: rs.end_date || null,
          duration_days: rs.duration_days || null,
          from_price: rs.base_price || 0,
          currency: rs.currency || this._getCurrencyFallback(),
          rating: typeof rs.rating === 'number' ? rs.rating : (typeof retreat.rating === 'number' ? retreat.rating : null)
        };
      });

    // Course highlights
    const courses = this._getFromStorage('courses', []);
    const featured_courses = courses
      .filter(c => c.is_active !== false && (!c.start_date || c.start_date >= now))
      .sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      })
      .slice(0, 5)
      .map(c => ({
        course_id: c.id,
        title: c.title || '',
        level: c.level || null,
        start_date: c.start_date || null,
        base_price: c.base_price || 0,
        currency: c.currency || this._getCurrencyFallback(),
        rating: typeof c.rating === 'number' ? c.rating : null,
        has_live_qa: !!c.has_live_qa
      }));

    // Event highlights
    const events = this._getFromStorage('events', []);
    const featured_events = events
      .filter(e => e.is_active !== false && (!e.start_datetime || e.start_datetime >= now))
      .sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      })
      .slice(0, 5)
      .map(e => ({
        event_id: e.id,
        title: e.title || '',
        event_type: e.event_type || null,
        start_datetime: e.start_datetime || null,
        price_type: e.price_type || null,
        price: e.price || 0,
        currency: e.currency || this._getCurrencyFallback(),
        spots_remaining: e.spots_remaining != null ? e.spots_remaining : null
      }));

    return {
      featured_retreats: upcomingSessions,
      featured_courses,
      featured_events
    };
  }

  // ---------------------- GLOBAL SEARCH ----------------------

  searchSite(query, limitPerSection) {
    const q = (query || '').toLowerCase();
    const limit = typeof limitPerSection === 'number' && limitPerSection > 0 ? limitPerSection : 5;

    const retreats = this._getFromStorage('retreats', []);
    const retreatSessions = this._getFromStorage('retreat_sessions', []);
    const courses = this._getFromStorage('courses', []);
    const mentors = this._getFromStorage('mentors', []);
    const events = this._getFromStorage('events', []);

    const retResults = [];
    for (let i = 0; i < retreatSessions.length && retResults.length < limit; i++) {
      const rs = retreatSessions[i];
      const retreat = retreats.find(r => r.id === rs.retreat_id) || {};
      const hay = ((rs.title || '') + ' ' + (retreat.name || '') + ' ' + (retreat.description || '')).toLowerCase();
      if (!q || hay.indexOf(q) !== -1) {
        retResults.push({
          retreat_session_id: rs.id,
          retreat_name: retreat.name || '',
          type: retreat.type || null,
          start_date: rs.start_date || null
        });
      }
    }

    const courseResults = [];
    for (let i = 0; i < courses.length && courseResults.length < limit; i++) {
      const c = courses[i];
      const hay = ((c.title || '') + ' ' + (c.description || '')).toLowerCase();
      if (!q || hay.indexOf(q) !== -1) {
        courseResults.push({
          course_id: c.id,
          title: c.title || '',
          level: c.level || null,
          start_date: c.start_date || null
        });
      }
    }

    const mentorResults = [];
    for (let i = 0; i < mentors.length && mentorResults.length < limit; i++) {
      const m = mentors[i];
      const hay = ((m.name || '') + ' ' + (m.bio || '') + ' ' + (Array.isArray(m.specialties) ? m.specialties.join(' ') : '')).toLowerCase();
      if (!q || hay.indexOf(q) !== -1) {
        mentorResults.push({
          mentor_id: m.id,
          name: m.name || '',
          years_experience: m.years_experience != null ? m.years_experience : null
        });
      }
    }

    const eventResults = [];
    for (let i = 0; i < events.length && eventResults.length < limit; i++) {
      const e = events[i];
      const hay = ((e.title || '') + ' ' + (e.description || '') + ' ' + (e.location || '')).toLowerCase();
      if (!q || hay.indexOf(q) !== -1) {
        eventResults.push({
          event_id: e.id,
          title: e.title || '',
          start_datetime: e.start_datetime || null
        });
      }
    }

    return {
      retreats: retResults,
      courses: courseResults,
      mentors: mentorResults,
      events: eventResults
    };
  }

  // ---------------------- RETREATS ----------------------

  getRetreatFilterOptions() {
    const retreats = this._getFromStorage('retreats', []);
    const retreatSessions = this._getFromStorage('retreat_sessions', []);

    const typeSet = {};
    for (let i = 0; i < retreats.length; i++) {
      const t = retreats[i].type;
      if (t && !typeSet[t]) typeSet[t] = true;
    }
    const retreat_types = Object.keys(typeSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const durationSet = {};
    for (let i = 0; i < retreatSessions.length; i++) {
      const d = retreatSessions[i].duration_days;
      if (typeof d === 'number' && d > 0) durationSet[d] = true;
    }
    const durations_days = Object.keys(durationSet)
      .map(v => Number(v))
      .sort((a, b) => a - b)
      .map(v => ({ value: v, label: v + ' days' }));

    const roomSet = {};
    const mealSet = {};
    let minPrice = null;
    let maxPrice = null;
    let currency = this._getCurrencyFallback();
    for (let i = 0; i < retreatSessions.length; i++) {
      const rs = retreatSessions[i];
      if (Array.isArray(rs.available_room_types)) {
        rs.available_room_types.forEach(rt => {
          if (rt && !roomSet[rt]) roomSet[rt] = true;
        });
      }
      if (Array.isArray(rs.available_meal_plans)) {
        rs.available_meal_plans.forEach(mp => {
          if (mp && !mealSet[mp]) mealSet[mp] = true;
        });
      }
      if (typeof rs.base_price === 'number') {
        if (minPrice === null || rs.base_price < minPrice) minPrice = rs.base_price;
        if (maxPrice === null || rs.base_price > maxPrice) maxPrice = rs.base_price;
        if (!currency && rs.currency) currency = rs.currency;
      }
    }

    const room_types = Object.keys(roomSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const meal_plans = Object.keys(mealSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const price_range_suggestion = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      step: 10,
      currency
    };

    return { retreat_types, durations_days, room_types, meal_plans, price_range_suggestion };
  }

  searchRetreatSessions(filters, sort_by, sort_direction, page, page_size) {
    const retreatSessions = this._getFromStorage('retreat_sessions', []);
    const retreats = this._getFromStorage('retreats', []);
    const f = filters || {};

    const normDates = this._normalizeDateRangeFilters(f.start_date_from, f.start_date_to);
    const startFrom = normDates.start;
    const startTo = normDates.end;

    let results = retreatSessions.filter(rs => rs.is_active !== false);

    if (Array.isArray(f.retreat_types) && f.retreat_types.length > 0) {
      results = results.filter(rs => {
        const retreat = retreats.find(r => r.id === rs.retreat_id);
        return !!retreat && f.retreat_types.indexOf(retreat.type) !== -1;
      });
    }

    if (startFrom) {
      results = results.filter(rs => !rs.start_date || rs.start_date >= startFrom);
    }
    if (startTo) {
      results = results.filter(rs => !rs.start_date || rs.start_date <= startTo);
    }

    if (typeof f.min_duration_days === 'number') {
      results = results.filter(rs => typeof rs.duration_days === 'number' && rs.duration_days >= f.min_duration_days);
    }
    if (typeof f.max_duration_days === 'number') {
      results = results.filter(rs => typeof rs.duration_days === 'number' && rs.duration_days <= f.max_duration_days);
    }

    if (f.room_type) {
      results = results.filter(rs => !Array.isArray(rs.available_room_types) || rs.available_room_types.indexOf(f.room_type) !== -1);
    }

    if (f.meal_plan) {
      results = results.filter(rs => !Array.isArray(rs.available_meal_plans) || rs.available_meal_plans.indexOf(f.meal_plan) !== -1);
    }

    if (typeof f.max_price === 'number') {
      results = results.filter(rs => typeof rs.base_price === 'number' && rs.base_price <= f.max_price);
    }

    const sortField = (sort_by || 'start_date');
    const dir = (sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortField === 'price') {
        va = a.base_price || 0;
        vb = b.base_price || 0;
      } else if (sortField === 'rating') {
        va = a.rating || 0;
        vb = b.rating || 0;
      } else {
        va = a.start_date || '';
        vb = b.start_date || '';
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total_results = results.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const pageResults = results.slice(startIndex, startIndex + size).map(rs => {
      const retreat = retreats.find(r => r.id === rs.retreat_id) || {};
      return {
        retreat_session_id: rs.id,
        retreat_name: retreat.name || '',
        title: rs.title || '',
        type: retreat.type || null,
        start_date: rs.start_date || null,
        end_date: rs.end_date || null,
        duration_days: rs.duration_days || null,
        base_price: rs.base_price || 0,
        currency: rs.currency || this._getCurrencyFallback(),
        rating: rs.rating != null ? rs.rating : (retreat.rating != null ? retreat.rating : null),
        available_room_types: Array.isArray(rs.available_room_types) ? rs.available_room_types : [],
        available_meal_plans: Array.isArray(rs.available_meal_plans) ? rs.available_meal_plans : [],
        spots_remaining: rs.spots_remaining != null ? rs.spots_remaining : null
      };
    });

    return {
      results: pageResults,
      total_results,
      page: pg,
      page_size: size
    };
  }

  getRetreatSessionDetails(retreatSessionId) {
    const retreatSessions = this._getFromStorage('retreat_sessions', []);
    const retreats = this._getFromStorage('retreats', []);
    const rs = retreatSessions.find(r => r.id === retreatSessionId);
    if (!rs) {
      return { retreat_session: null, retreat: null, booking_config: null };
    }
    const retreat = retreats.find(r => r.id === rs.retreat_id) || null;

    const retreat_session = {
      id: rs.id,
      retreat_id: rs.retreat_id,
      title: rs.title || '',
      description: rs.description || '',
      type: retreat ? retreat.type : null,
      location: (retreat && retreat.location) || rs.location || '',
      start_date: rs.start_date || null,
      end_date: rs.end_date || null,
      duration_days: rs.duration_days || null,
      base_price: rs.base_price || 0,
      currency: rs.currency || this._getCurrencyFallback(),
      rating: rs.rating != null ? rs.rating : (retreat && retreat.rating != null ? retreat.rating : null),
      includes_meals: !!rs.includes_meals,
      available_room_types: Array.isArray(rs.available_room_types) ? rs.available_room_types : [],
      available_meal_plans: Array.isArray(rs.available_meal_plans) ? rs.available_meal_plans : [],
      max_guests: rs.max_guests != null ? rs.max_guests : null,
      spots_remaining: rs.spots_remaining != null ? rs.spots_remaining : null
    };

    const booking_config = {
      allow_custom_dates: false,
      min_length_days: rs.duration_days || null,
      max_length_days: rs.duration_days || null
    };

    const retreatObj = retreat
      ? {
          id: retreat.id,
          name: retreat.name || '',
          type: retreat.type || null,
          description: retreat.description || '',
          location: retreat.location || '',
          rating: retreat.rating != null ? retreat.rating : null
        }
      : null;

    return {
      retreat_session,
      retreat: retreatObj,
      booking_config
    };
  }

  getRetreatBookingOptions(retreatSessionId) {
    const retreatSessions = this._getFromStorage('retreat_sessions', []);
    const rs = retreatSessions.find(r => r.id === retreatSessionId);
    if (!rs) {
      return {
        allowed_date_range: { start_date: null, end_date: null },
        allowed_durations_days: [],
        room_types: [],
        meal_plans: []
      };
    }

    const allowed_date_range = {
      start_date: rs.start_date || null,
      end_date: rs.end_date || null
    };

    const allowed_durations_days = rs.duration_days ? [rs.duration_days] : [];

    const room_types = (Array.isArray(rs.available_room_types) ? rs.available_room_types : []).map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      price_modifier: 0
    }));

    const meal_plans = (Array.isArray(rs.available_meal_plans) ? rs.available_meal_plans : []).map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      price_modifier: 0
    }));

    return { allowed_date_range, allowed_durations_days, room_types, meal_plans };
  }

  quoteRetreatBooking(retreatSessionId, start_date, length_days, room_type, meal_plan) {
    return this._checkRetreatAvailabilityAndPrice(retreatSessionId, start_date, length_days, room_type, meal_plan);
  }

  createRetreatBooking(retreatSessionId, start_date, length_days, room_type, meal_plan, guest_name, guest_email, guest_phone) {
    const check = this._checkRetreatAvailabilityAndPrice(retreatSessionId, start_date, length_days, room_type, meal_plan);
    if (!check.success || !check.is_available) {
      return {
        success: false,
        booking: null,
        message: (check.validation_errors && check.validation_errors[0]) || 'validation_failed'
      };
    }

    const retreatSessions = this._getFromStorage('retreat_sessions', []);
    const bookings = this._getFromStorage('retreat_bookings', []);
    const rs = retreatSessions.find(r => r.id === retreatSessionId);
    if (!rs) {
      return { success: false, booking: null, message: 'retreat_session_not_found' };
    }

    const start = this._toDate(start_date) || this._toDate(rs.start_date) || new Date();
    const length = Number(length_days) || rs.duration_days || 1;
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + length - 1);

    const booking = {
      id: this._generateId('retreat_booking'),
      retreat_session_id: retreatSessionId,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      length_days: length,
      room_type: room_type || (Array.isArray(rs.available_room_types) ? rs.available_room_types[0] : 'shared_room'),
      meal_plan: meal_plan || (Array.isArray(rs.available_meal_plans) ? rs.available_meal_plans[0] : 'standard'),
      total_price: check.total_price || 0,
      currency: check.currency || rs.currency || this._getCurrencyFallback(),
      guest_name: guest_name || '',
      guest_email: guest_email || '',
      guest_phone: guest_phone || '',
      status: 'pending',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('retreat_bookings', bookings);

    // Decrement spots_remaining if present
    if (rs.spots_remaining != null) {
      rs.spots_remaining = Math.max(0, Number(rs.spots_remaining) - 1);
      this._saveToStorage('retreat_sessions', retreatSessions);
    }

    return {
      success: true,
      booking,
      message: 'booking_created'
    };
  }

  // ---------------------- CUSTOM RETREAT BUILDER ----------------------

  getCustomRetreatDefaults() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getFullYear(), start.getMonth() + 6, start.getDate());

    const room_types = [
      { value: 'shared_room', label: 'Shared Room', price_per_night: 50, currency: this._getCurrencyFallback() },
      { value: 'standard_private_room', label: 'Standard Private Room', price_per_night: 90, currency: this._getCurrencyFallback() },
      { value: 'deluxe_private_suite', label: 'Deluxe Private Suite', price_per_night: 150, currency: this._getCurrencyFallback() }
    ];

    return {
      default_length_days: 3,
      allowed_lengths_days: [3, 5, 7, 10],
      allowed_start_date_range: {
        start_date: start.toISOString(),
        end_date: end.toISOString()
      },
      room_types
    };
  }

  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops', []);
    const categorySet = {};
    let minPrice = null;
    let maxPrice = null;
    let currency = this._getCurrencyFallback();
    for (let i = 0; i < workshops.length; i++) {
      const w = workshops[i];
      if (w.category && !categorySet[w.category]) categorySet[w.category] = true;
      if (typeof w.price === 'number') {
        if (minPrice === null || w.price < minPrice) minPrice = w.price;
        if (maxPrice === null || w.price > maxPrice) maxPrice = w.price;
        if (!currency && w.currency) currency = w.currency;
      }
    }
    const categories = Object.keys(categorySet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const price_range_suggestion = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      step: 5,
      currency
    };
    return { categories, price_range_suggestion };
  }

  searchWorkshops(filters, sort_by, sort_direction) {
    const workshops = this._getFromStorage('workshops', []);
    const f = filters || {};
    let results = workshops.filter(w => w.is_active !== false);

    if (f.category) {
      results = results.filter(w => w.category === f.category);
    }
    if (typeof f.max_price === 'number') {
      results = results.filter(w => typeof w.price === 'number' && w.price <= f.max_price);
    }
    if (f.is_sound_healing_only) {
      results = results.filter(w => !!w.is_sound_healing);
    }

    const sortField = sort_by || 'price';
    const dir = (sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortField === 'title') {
        va = a.title || '';
        vb = b.title || '';
      } else {
        va = a.price || 0;
        vb = b.price || 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const mapped = results.map(w => ({
      workshop_id: w.id,
      title: w.title || '',
      description: w.description || '',
      price: w.price || 0,
      currency: w.currency || this._getCurrencyFallback(),
      category: w.category || '',
      duration_minutes: w.duration_minutes != null ? w.duration_minutes : null,
      is_sound_healing: !!w.is_sound_healing
    }));

    return { results: mapped, total_results: mapped.length };
  }

  saveCustomRetreatPackage(start_date, end_date, length_days, room_type, workshopIds, contact_name, contact_email, package_name) {
    const workshops = this._getFromStorage('workshops', []);
    const packages = this._getFromStorage('custom_retreat_packages', []);

    const start = this._toDate(start_date) || new Date();
    const length = Number(length_days) || 1;
    let end = this._toDate(end_date);
    if (!end) {
      end = new Date(start.getTime());
      end.setDate(end.getDate() + length - 1);
    }

    const workshopIdsArr = Array.isArray(workshopIds) ? workshopIds : [];
    const selectedWorkshops = workshops.filter(w => workshopIdsArr.indexOf(w.id) !== -1);
    let totalWorkshopsPrice = 0;
    let currency = this._getCurrencyFallback();
    for (let i = 0; i < selectedWorkshops.length; i++) {
      const w = selectedWorkshops[i];
      totalWorkshopsPrice += Number(w.price || 0);
      if (!currency && w.currency) currency = w.currency;
    }

    const pkg = {
      id: this._generateId('custom_retreat_pkg'),
      name: package_name || '',
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      length_days: length,
      room_type: room_type || 'standard_private_room',
      workshop_ids: workshopIdsArr,
      total_workshop_count: workshopIdsArr.length,
      total_price: totalWorkshopsPrice,
      currency,
      contact_name: contact_name || '',
      contact_email: contact_email || '',
      created_at: this._nowISO()
    };

    packages.push(pkg);
    this._saveToStorage('custom_retreat_packages', packages);

    return {
      success: true,
      custom_retreat_package: pkg,
      message: 'custom_retreat_package_saved'
    };
  }

  // ---------------------- COURSES ----------------------

  getCourseFilterOptions() {
    const courses = this._getFromStorage('courses', []);
    const levelSet = {};
    let minPrice = null;
    let maxPrice = null;
    let startMin = null;
    let startMax = null;
    let currency = this._getCurrencyFallback();

    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      if (c.level && !levelSet[c.level]) levelSet[c.level] = true;
      if (typeof c.base_price === 'number') {
        if (minPrice === null || c.base_price < minPrice) minPrice = c.base_price;
        if (maxPrice === null || c.base_price > maxPrice) maxPrice = c.base_price;
        if (!currency && c.currency) currency = c.currency;
      }
      if (c.start_date) {
        const d = this._toDate(c.start_date);
        if (d) {
          if (!startMin || d < startMin) startMin = d;
          if (!startMax || d > startMax) startMax = d;
        }
      }
    }

    const levels = Object.keys(levelSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const price_range_suggestion = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      step: 10,
      currency
    };

    const start_date_range_suggestion = {
      start_date: startMin ? startMin.toISOString() : null,
      end_date: startMax ? startMax.toISOString() : null
    };

    const feature_flags = [
      {
        key: 'includes_live_qa',
        label: 'Includes live Q&A sessions',
        description: 'Filter for courses that include live Q&A sessions'
      }
    ];

    return { levels, price_range_suggestion, start_date_range_suggestion, feature_flags };
  }

  searchCourses(filters, sort_by, sort_direction, page, page_size) {
    const courses = this._getFromStorage('courses', []);
    const f = filters || {};

    const normDates = this._normalizeDateRangeFilters(f.start_date_from, f.start_date_to);
    const startFrom = normDates.start;
    const startTo = normDates.end;

    let results = courses.filter(c => c.is_active !== false);

    if (Array.isArray(f.levels) && f.levels.length > 0) {
      results = results.filter(c => f.levels.indexOf(c.level) !== -1);
    }
    if (startFrom) {
      results = results.filter(c => !c.start_date || c.start_date >= startFrom);
    }
    if (startTo) {
      results = results.filter(c => !c.start_date || c.start_date <= startTo);
    }
    if (typeof f.max_price === 'number') {
      results = results.filter(c => typeof c.base_price === 'number' && c.base_price <= f.max_price);
    }
    if (f.include_live_qa) {
      results = results.filter(c => !!c.has_live_qa || (Array.isArray(c.features) && c.features.indexOf('includes live Q&A sessions') !== -1));
    }

    const sortField = sort_by || 'start_date';
       const dir = (sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortField === 'rating') {
        va = a.rating || 0;
        vb = b.rating || 0;
      } else if (sortField === 'price') {
        va = a.base_price || 0;
        vb = b.base_price || 0;
      } else {
        va = a.start_date || '';
        vb = b.start_date || '';
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total_results = results.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;

    const pageResults = results.slice(startIndex, startIndex + size).map(c => ({
      course_id: c.id,
      title: c.title || '',
      description_short: (c.description || '').slice(0, 200),
      level: c.level || null,
      start_date: c.start_date || null,
      end_date: c.end_date || null,
      base_price: c.base_price || 0,
      currency: c.currency || this._getCurrencyFallback(),
      rating: c.rating != null ? c.rating : null,
      has_live_qa: !!c.has_live_qa,
      delivery_format: c.delivery_format || null
    }));

    return {
      results: pageResults,
      total_results,
      page: pg,
      page_size: size
    };
  }

  getCourseDetails(courseId) {
    const courses = this._getFromStorage('courses', []);
    const tiers = this._getFromStorage('course_tiers', []);

    const c = courses.find(x => x.id === courseId);
    if (!c) {
      return { course: null, tiers: [] };
    }
    const course = {
      id: c.id,
      title: c.title || '',
      description: c.description || '',
      level: c.level || null,
      start_date: c.start_date || null,
      end_date: c.end_date || null,
      base_price: c.base_price || 0,
      currency: c.currency || this._getCurrencyFallback(),
      rating: c.rating != null ? c.rating : null,
      has_live_qa: !!c.has_live_qa,
      delivery_format: c.delivery_format || null,
      features: Array.isArray(c.features) ? c.features : [],
      syllabus: c.syllabus || ''
    };

    const courseTiers = tiers
      .filter(t => t.course_id === courseId)
      .map(t => ({
        id: t.id,
        name: t.name || '',
        description: t.description || '',
        tier_type: t.tier_type || null,
        price: t.price || 0,
        currency: t.currency || course.currency || this._getCurrencyFallback(),
        is_default: !!t.is_default,
        is_active: t.is_active !== false
      }));

    return { course, tiers: courseTiers };
  }

  enrollInCourse(courseId, courseTierId, student_name, student_email) {
    const courses = this._getFromStorage('courses', []);
    const tiers = this._getFromStorage('course_tiers', []);
    const enrollments = this._getFromStorage('course_enrollments', []);

    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return { success: false, enrollment: null, message: 'course_not_found' };
    }
    const tier = tiers.find(t => t.id === courseTierId && t.course_id === courseId);
    if (!tier) {
      return { success: false, enrollment: null, message: 'course_tier_not_found' };
    }

    const enrollment = {
      id: this._generateId('course_enrollment'),
      course_id: courseId,
      course_tier_id: courseTierId,
      student_name: student_name || '',
      student_email: student_email || '',
      status: 'pending',
      created_at: this._nowISO(),
      course,
      course_tier: tier
    };

    enrollments.push({
      id: enrollment.id,
      course_id: courseId,
      course_tier_id: courseTierId,
      student_name: enrollment.student_name,
      student_email: enrollment.student_email,
      status: enrollment.status,
      created_at: enrollment.created_at
    });
    this._saveToStorage('course_enrollments', enrollments);

    return { success: true, enrollment, message: 'enrollment_created' };
  }

  // ---------------------- MENTORS ----------------------

  getMentorFilterOptions() {
    const mentorServices = this._getFromStorage('mentor_services', []);
    const mentors = this._getFromStorage('mentors', []);

    const lengthSet = {};
    let minPrice = null;
    let maxPrice = null;
    let currency = this._getCurrencyFallback();

    for (let i = 0; i < mentorServices.length; i++) {
      const s = mentorServices[i];
      if (typeof s.duration_minutes === 'number') lengthSet[s.duration_minutes] = true;
      if (typeof s.price === 'number') {
        if (minPrice === null || s.price < minPrice) minPrice = s.price;
        if (maxPrice === null || s.price > maxPrice) maxPrice = s.price;
        if (!currency && s.currency) currency = s.currency;
      }
    }

    const session_lengths_minutes = Object.keys(lengthSet)
      .map(v => Number(v))
      .sort((a, b) => a - b);

    const specialtySet = {};
    for (let i = 0; i < mentors.length; i++) {
      const m = mentors[i];
      if (Array.isArray(m.specialties)) {
        m.specialties.forEach(sp => {
          if (sp && !specialtySet[sp]) specialtySet[sp] = true;
        });
      }
    }
    const specialties = Object.keys(specialtySet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const price_range_suggestion = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      step: 10,
      currency
    };

    return { session_lengths_minutes, price_range_suggestion, specialties };
  }

  searchMentors(filters, sort_by, sort_direction) {
    const mentors = this._getFromStorage('mentors', []);
    const mentorServices = this._getFromStorage('mentor_services', []);
    const f = filters || {};

    let results = mentors.filter(m => m.is_active !== false);

    if (typeof f.min_years_experience === 'number') {
      results = results.filter(m => typeof m.years_experience === 'number' && m.years_experience >= f.min_years_experience);
    }

    if (Array.isArray(f.specialties) && f.specialties.length > 0) {
      results = results.filter(m => {
        if (!Array.isArray(m.specialties)) return false;
        return f.specialties.some(sp => m.specialties.indexOf(sp) !== -1);
      });
    }

    const filteredMentors = [];

    for (let i = 0; i < results.length; i++) {
      const m = results[i];
      let services = mentorServices.filter(s => s.mentor_id === m.id && s.is_active !== false && s.service_type === 'one_on_one_session');

      if (typeof f.session_length_minutes === 'number') {
        services = services.filter(s => s.duration_minutes === f.session_length_minutes);
      }
      if (typeof f.max_price === 'number') {
        services = services.filter(s => typeof s.price === 'number' && s.price <= f.max_price);
      }

      if (services.length === 0) continue;

      services.sort((a, b) => (a.price || 0) - (b.price || 0));
      const matching_service = services[0];
      filteredMentors.push({ mentor: m, matching_service });
    }

    const sortField = sort_by || 'experience';
    const dir = (sort_direction || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    filteredMentors.sort((a, b) => {
      let va;
      let vb;
      if (sortField === 'rating') {
        va = a.mentor.rating || 0;
        vb = b.mentor.rating || 0;
      } else if (sortField === 'price') {
        va = a.matching_service.price || 0;
        vb = b.matching_service.price || 0;
      } else {
        va = a.mentor.years_experience || 0;
        vb = b.mentor.years_experience || 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const mapped = filteredMentors.map(x => ({
      mentor_id: x.mentor.id,
      name: x.mentor.name || '',
      photo_url: x.mentor.photo_url || '',
      specialties: Array.isArray(x.mentor.specialties) ? x.mentor.specialties : [],
      headline_rate: x.mentor.headline_rate != null ? x.mentor.headline_rate : x.matching_service.price || 0,
      currency: x.mentor.currency || x.matching_service.currency || this._getCurrencyFallback(),
      years_experience: x.mentor.years_experience != null ? x.mentor.years_experience : null,
      rating: x.mentor.rating != null ? x.mentor.rating : null,
      matching_service: {
        mentor_service_id: x.matching_service.id,
        name: x.matching_service.name || '',
        duration_minutes: x.matching_service.duration_minutes || 0,
        price: x.matching_service.price || 0,
        currency: x.matching_service.currency || this._getCurrencyFallback()
      }
    }));

    return { results: mapped, total_results: mapped.length };
  }

  getMentorDetails(mentorId) {
    const mentors = this._getFromStorage('mentors', []);
    const mentorServices = this._getFromStorage('mentor_services', []);
    const m = mentors.find(x => x.id === mentorId);
    if (!m) {
      return { mentor: null, services: [] };
    }
    const mentor = {
      id: m.id,
      name: m.name || '',
      bio: m.bio || '',
      specialties: Array.isArray(m.specialties) ? m.specialties : [],
      headline_rate: m.headline_rate != null ? m.headline_rate : null,
      currency: m.currency || this._getCurrencyFallback(),
      years_experience: m.years_experience != null ? m.years_experience : null,
      rating: m.rating != null ? m.rating : null,
      photo_url: m.photo_url || ''
    };

    const services = mentorServices
      .filter(s => s.mentor_id === mentorId)
      .map(s => ({
        id: s.id,
        name: s.name || '',
        description: s.description || '',
        service_type: s.service_type || null,
        duration_minutes: s.duration_minutes || 0,
        price: s.price || 0,
        currency: s.currency || mentor.currency || this._getCurrencyFallback(),
        is_active: s.is_active !== false
      }));

    return { mentor, services };
  }

  getMentorAvailability(mentorId, mentorServiceId, date_from, date_to) {
    const slots = this._getFromStorage('mentor_availability_slots', []);
    const norm = this._normalizeDateRangeFilters(date_from, date_to);
    const from = norm.start;
    const to = norm.end;

    let filtered = slots.filter(s => s.mentor_id === mentorId && s.mentor_service_id === mentorServiceId);

    if (from) {
      filtered = filtered.filter(s => !s.start_datetime || s.start_datetime >= from);
    }
    if (to) {
      filtered = filtered.filter(s => !s.start_datetime || s.start_datetime <= to);
    }

    const mapped = filtered.map(s => ({
      availability_slot_id: s.id,
      start_datetime: s.start_datetime || null,
      end_datetime: s.end_datetime || null,
      status: s.status || 'available'
    }));

    return { slots: mapped };
  }

  bookMentoringAppointment(mentorId, mentorServiceId, availabilitySlotId, client_name, client_email) {
    const mentors = this._getFromStorage('mentors', []);
    const mentorServices = this._getFromStorage('mentor_services', []);
    const slots = this._getFromStorage('mentor_availability_slots', []);
    const appointments = this._getFromStorage('mentoring_appointments', []);

    const mentor = mentors.find(m => m.id === mentorId);
    if (!mentor) {
      return { success: false, appointment: null, message: 'mentor_not_found' };
    }
    const service = mentorServices.find(s => s.id === mentorServiceId && s.mentor_id === mentorId);
    if (!service) {
      return { success: false, appointment: null, message: 'mentor_service_not_found' };
    }

    const check = this._checkMentorSlotAvailability(mentorId, mentorServiceId, availabilitySlotId);
    if (!check.success || !check.is_available) {
      return {
        success: false,
        appointment: null,
        message: (check.validation_errors && check.validation_errors[0]) || 'slot_not_available'
      };
    }

    const slot = slots.find(s => s.id === availabilitySlotId);
    const appointment = {
      id: this._generateId('mentoring_appt'),
      mentor_id: mentorId,
      mentor_service_id: mentorServiceId,
      availability_slot_id: availabilitySlotId,
      start_datetime: slot.start_datetime || null,
      end_datetime: slot.end_datetime || null,
      client_name: client_name || '',
      client_email: client_email || '',
      price: service.price || 0,
      currency: service.currency || mentor.currency || this._getCurrencyFallback(),
      status: 'booked',
      created_at: this._nowISO(),
      mentor,
      mentor_service: service,
      availability_slot: slot
    };

    appointments.push({
      id: appointment.id,
      mentor_id: appointment.mentor_id,
      mentor_service_id: appointment.mentor_service_id,
      availability_slot_id: appointment.availability_slot_id,
      start_datetime: appointment.start_datetime,
      end_datetime: appointment.end_datetime,
      client_name: appointment.client_name,
      client_email: appointment.client_email,
      price: appointment.price,
      currency: appointment.currency,
      status: appointment.status,
      created_at: appointment.created_at
    });
    this._saveToStorage('mentoring_appointments', appointments);

    // Mark slot as booked
    slot.status = 'booked';
    this._saveToStorage('mentor_availability_slots', slots);

    return { success: true, appointment, message: 'appointment_booked' };
  }

  // ---------------------- SHOP / PRODUCTS ----------------------

  getShopCategories() {
    const products = this._getFromStorage('products', []);
    const catSet = {};
    for (let i = 0; i < products.length; i++) {
      const c = products[i].category;
      if (c && !catSet[c]) catSet[c] = true;
    }
    const categories = Object.keys(catSet).map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: ''
    }));
    return { categories };
  }

  getProductFilterOptions(category) {
    const products = this._getFromStorage('products', []);
    const filtered = products.filter(p => !category || p.category === category);

    let minPrice = null;
    let maxPrice = null;
    let currency = this._getCurrencyFallback();
    const ratingSet = {};

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
        if (!currency && p.currency) currency = p.currency;
      }
      if (typeof p.rating === 'number') {
        const r = Math.round(p.rating);
        ratingSet[r] = true;
      }
    }

    const price_range_suggestion = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      step: 1,
      currency
    };

    const rating_options = Object.keys(ratingSet)
      .map(v => Number(v))
      .sort((a, b) => a - b);

    return { price_range_suggestion, rating_options };
  }

  searchProducts(category, filters, sort_by, sort_direction, page, page_size) {
    const products = this._getFromStorage('products', []);
    const f = filters || {};

    let results = products.filter(p => p.is_active !== false);
    if (category) {
      results = results.filter(p => p.category === category);
    }
    if (typeof f.max_price === 'number') {
      results = results.filter(p => typeof p.price === 'number' && p.price <= f.max_price);
    }
    if (typeof f.min_rating === 'number') {
      results = results.filter(p => typeof p.rating === 'number' && p.rating >= f.min_rating);
    }

    const sortField = sort_by || 'name';
    const dir = (sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortField === 'price') {
        va = a.price || 0;
        vb = b.price || 0;
      } else if (sortField === 'rating') {
        va = a.rating || 0;
        vb = b.rating || 0;
      } else {
        va = a.name || '';
        vb = b.name || '';
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total_results = results.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;

    const pageResults = results.slice(startIndex, startIndex + size).map(p => ({
      product_id: p.id,
      name: p.name || '',
      category: p.category || null,
      price: p.price || 0,
      currency: p.currency || this._getCurrencyFallback(),
      rating: p.rating != null ? p.rating : null,
      image_url: p.image_url || '',
      has_color_options: Array.isArray(p.color_options) && p.color_options.length > 0,
      has_size_options: Array.isArray(p.size_options) && p.size_options.length > 0,
      has_design_options: Array.isArray(p.design_options) && p.design_options.length > 0
    }));

    return { results: pageResults, total_results, page: pg, page_size: size };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const p = products.find(x => x.id === productId);
    if (!p) {
      return { product: null };
    }
    const product = {
      id: p.id,
      name: p.name || '',
      description: p.description || '',
      category: p.category || null,
      price: p.price || 0,
      currency: p.currency || this._getCurrencyFallback(),
      rating: p.rating != null ? p.rating : null,
      image_url: p.image_url || '',
      color_options: Array.isArray(p.color_options) ? p.color_options : [],
      size_options: Array.isArray(p.size_options) ? p.size_options : [],
      design_options: Array.isArray(p.design_options) ? p.design_options : [],
      is_active: p.is_active !== false
    };
    return { product };
  }

  addProductToCart(productId, quantity, selected_options) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId && p.is_active !== false);
    if (!product) {
      return { success: false, cart_id: null, cart_item: null, message: 'product_not_found' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const optionsStr = selected_options ? JSON.stringify(selected_options) : null;

    let cartItem = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId && ci.selected_options === (optionsStr || null));
    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.total_price = cartItem.unit_price * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price || 0,
        total_price: (product.price || 0) * qty,
        currency: product.currency || cart.currency || this._getCurrencyFallback(),
        selected_options: optionsStr,
        product_name_snapshot: product.name || '',
        product_category_snapshot: product.category || null
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    // Attach product for foreign key resolution convenience
    const enrichedCartItem = Object.assign({}, cartItem, { product });

    return {
      success: true,
      cart_id: cart.id,
      cart_item: enrichedCartItem,
      message: 'product_added_to_cart'
    };
  }

  getActiveCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsRaw = cartItems.filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    const items = itemsRaw.map(ci => {
      subtotal += ci.total_price || 0;
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name_snapshot: ci.product_name_snapshot,
        product_category_snapshot: ci.product_category_snapshot,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        currency: ci.currency || product && product.currency || this._getCurrencyFallback(),
        selected_options: ci.selected_options,
        product
      };
    });

    const tax_estimate = 0;
    const shipping_estimate = 0;
    const grand_total = subtotal + tax_estimate + shipping_estimate;

    const cartObj = {
      id: cart.id,
      status: cart.status,
      subtotal: subtotal,
      currency: cart.currency || this._getCurrencyFallback(),
      created_at: cart.created_at,
      updated_at: cart.updated_at
    };

    const totals = {
      items_count: items.length,
      subtotal,
      tax_estimate,
      shipping_estimate,
      grand_total,
      currency: cartObj.currency
    };

    return { cart: cartObj, items, totals };
  }

  updateCartItem(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const ci = cartItems.find(x => x.id === cartItemId);
    if (!ci) {
      return { success: false, cart: null, items: [], message: 'cart_item_not_found' };
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      cartItems = cartItems.filter(x => x.id !== cartItemId);
      this._saveToStorage('cart_items', cartItems);
    } else {
      ci.quantity = qty;
      ci.total_price = ci.unit_price * qty;
      this._saveToStorage('cart_items', cartItems);
    }

    const cart = this._recalculateCartTotals(ci.cart_id);
    const products = this._getFromStorage('products', []);
    const itemsRaw = this._getFromStorage('cart_items', []).filter(x => x.cart_id === ci.cart_id);
    const items = itemsRaw.map(item => ({
      cart_item_id: item.id,
      product_name_snapshot: item.product_name_snapshot,
      quantity: item.quantity,
      total_price: item.total_price,
      product: products.find(p => p.id === item.product_id) || null
    }));

    return { success: true, cart, items, message: 'cart_item_updated' };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const ci = cartItems.find(x => x.id === cartItemId);
    if (!ci) {
      return { success: false, cart: null, items: [], message: 'cart_item_not_found' };
    }

    cartItems = cartItems.filter(x => x.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotals(ci.cart_id);
    const products = this._getFromStorage('products', []);
    const itemsRaw = this._getFromStorage('cart_items', []).filter(x => x.cart_id === ci.cart_id);
    const items = itemsRaw.map(item => ({
      cart_item_id: item.id,
      product_name_snapshot: item.product_name_snapshot,
      quantity: item.quantity,
      total_price: item.total_price,
      product: products.find(p => p.id === item.product_id) || null
    }));

    return { success: true, cart, items, message: 'cart_item_removed' };
  }

  // ---------------------- EVENTS ----------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const typeSet = {};
    const priceTypeSet = {};

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.event_type && !typeSet[e.event_type]) typeSet[e.event_type] = true;
      if (e.price_type && !priceTypeSet[e.price_type]) priceTypeSet[e.price_type] = true;
    }

    const event_types = Object.keys(typeSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const price_types = Object.keys(priceTypeSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const month_range_suggestion = {
      current_month_start: start.toISOString(),
      current_month_end: end.toISOString()
    };

    return { event_types, price_types, month_range_suggestion };
  }

  searchEvents(filters, sort_by, sort_direction) {
    const events = this._getFromStorage('events', []);
    const f = filters || {};

    let results = events.filter(e => e.is_active !== false);

    if (f.month) {
      const monthStr = f.month;
      const from = this._toDate(monthStr + '-01T00:00:00.000Z');
      if (from) {
        // Use UTC when computing month range to avoid timezone-related off-by-one issues
        const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        results = results.filter(e => {
          const d = this._toDate(e.start_datetime);
          return d && d >= from && d <= to;
        });
      } else {
        // Fallback: filter by simple YYYY-MM prefix match on the start_datetime string
        results = results.filter(e => (e.start_datetime || '').slice(0, 7) === monthStr);
      }
    }

    const norm = this._normalizeDateRangeFilters(f.start_date_from, f.start_date_to);
    const fromDate = norm.start;
    const toDate = norm.end;
    if (fromDate) {
      results = results.filter(e => !e.start_datetime || e.start_datetime >= fromDate);
    }
    if (toDate) {
      results = results.filter(e => !e.start_datetime || e.start_datetime <= toDate);
    }

    if (Array.isArray(f.event_types) && f.event_types.length > 0) {
      results = results.filter(e => f.event_types.indexOf(e.event_type) !== -1);
    }
    if (Array.isArray(f.price_types) && f.price_types.length > 0) {
      results = results.filter(e => f.price_types.indexOf(e.price_type) !== -1);
    }

    const sortField = sort_by || 'start_datetime';
    const dir = (sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortField === 'spots_remaining') {
        va = a.spots_remaining || 0;
        vb = b.spots_remaining || 0;
      } else {
        va = a.start_datetime || '';
        vb = b.start_datetime || '';
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const mapped = results.map(e => ({
      event_id: e.id,
      title: e.title || '',
      event_type: e.event_type || null,
      start_datetime: e.start_datetime || null,
      end_datetime: e.end_datetime || null,
      location: e.location || '',
      location_type: e.location_type || null,
      price_type: e.price_type || null,
      price: e.price || 0,
      currency: e.currency || this._getCurrencyFallback(),
      spots_total: e.spots_total != null ? e.spots_total : null,
      spots_remaining: e.spots_remaining != null ? e.spots_remaining : null,
      is_active: e.is_active !== false
    }));

    return { results: mapped, total_results: mapped.length };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const e = events.find(x => x.id === eventId);
    if (!e) {
      return { event: null };
    }
    const d = this._toDate(e.start_datetime);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = d ? weekdays[d.getUTCDay()] : null;

    const event = {
      id: e.id,
      title: e.title || '',
      description: e.description || '',
      event_type: e.event_type || null,
      start_datetime: e.start_datetime || null,
      end_datetime: e.end_datetime || null,
      weekday,
      location: e.location || '',
      location_type: e.location_type || null,
      price_type: e.price_type || null,
      price: e.price || 0,
      currency: e.currency || this._getCurrencyFallback(),
      spots_total: e.spots_total != null ? e.spots_total : null,
      spots_remaining: e.spots_remaining != null ? e.spots_remaining : null,
      is_active: e.is_active !== false
    };

    return { event };
  }

  registerForEvent(eventId, attendee_name, attendee_email, attendees_count, communication_preference) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, registration: null, message: 'event_not_found' };
    }

    const check = this._checkEventAvailability(eventId, attendees_count);
    if (!check.success || !check.is_available) {
      return {
        success: false,
        registration: null,
        message: (check.validation_errors && check.validation_errors[0]) || 'event_not_available'
      };
    }

    const registration = {
      id: this._generateId('event_reg'),
      event_id: eventId,
      attendee_name: attendee_name || '',
      attendee_email: attendee_email || '',
      attendees_count: Number(attendees_count) || 1,
      communication_preference: communication_preference || 'email',
      created_at: this._nowISO(),
      event
    };

    registrations.push({
      id: registration.id,
      event_id: registration.event_id,
      attendee_name: registration.attendee_name,
      attendee_email: registration.attendee_email,
      attendees_count: registration.attendees_count,
      communication_preference: registration.communication_preference,
      created_at: registration.created_at
    });
    this._saveToStorage('event_registrations', registrations);

    if (event.spots_remaining != null) {
      event.spots_remaining = Math.max(0, Number(event.spots_remaining) - registration.attendees_count);
      this._saveToStorage('events', events);
    }

    return { success: true, registration, message: 'event_registered' };
  }

  // ---------------------- LIBRARY / PLAYLISTS ----------------------

  getLibraryFilterOptions() {
    const items = this._getFromStorage('library_items', []);

    const contentTypeSet = {};
    const categorySet = {};
    const tagSet = {};
    let minDuration = null;
    let maxDuration = null;
    const ratingSet = {};

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.content_type && !contentTypeSet[it.content_type]) contentTypeSet[it.content_type] = true;
      if (it.primary_category && !categorySet[it.primary_category]) categorySet[it.primary_category] = true;
      if (Array.isArray(it.tags)) {
        it.tags.forEach(t => {
          if (t && !tagSet[t]) tagSet[t] = true;
        });
      }
      if (typeof it.duration_minutes === 'number') {
        if (minDuration === null || it.duration_minutes < minDuration) minDuration = it.duration_minutes;
        if (maxDuration === null || it.duration_minutes > maxDuration) maxDuration = it.duration_minutes;
      }
      if (typeof it.rating === 'number') {
        const r = Math.round(it.rating);
        ratingSet[r] = true;
      }
    }

    const content_types = Object.keys(contentTypeSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const primary_categories = Object.keys(categorySet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const tags = Object.keys(tagSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const duration_range_suggestion = {
      min: minDuration != null ? minDuration : 0,
      max: maxDuration != null ? maxDuration : 0,
      step: 1
    };

    const rating_options = Object.keys(ratingSet)
      .map(v => Number(v))
      .sort((a, b) => a - b);

    return { content_types, primary_categories, tags, duration_range_suggestion, rating_options };
  }

  searchLibraryItems(filters, sort_by, sort_direction, page, page_size) {
    const items = this._getFromStorage('library_items', []);
    const f = filters || {};

    let results = items.filter(it => it.is_active !== false);

    if (f.content_type) {
      results = results.filter(it => it.content_type === f.content_type);
    }
    if (f.primary_category) {
      results = results.filter(it => it.primary_category === f.primary_category);
    }
    if (Array.isArray(f.tags) && f.tags.length > 0) {
      results = results.filter(it => {
        if (!Array.isArray(it.tags)) return false;
        return f.tags.some(t => it.tags.indexOf(t) !== -1);
      });
    }
    if (typeof f.min_duration_minutes === 'number') {
      results = results.filter(it => typeof it.duration_minutes === 'number' && it.duration_minutes >= f.min_duration_minutes);
    }
    if (typeof f.max_duration_minutes === 'number') {
      results = results.filter(it => typeof it.duration_minutes === 'number' && it.duration_minutes <= f.max_duration_minutes);
    }
    if (typeof f.min_rating === 'number') {
      results = results.filter(it => typeof it.rating === 'number' && it.rating >= f.min_rating);
    }
    if (f.is_guided_only) {
      results = results.filter(it => !!it.is_guided);
    }

    const sortField = sort_by || 'title';
    const dir = (sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortField === 'rating') {
        va = a.rating || 0;
        vb = b.rating || 0;
      } else if (sortField === 'duration') {
        va = a.duration_minutes || 0;
        vb = b.duration_minutes || 0;
      } else {
        va = a.title || '';
        vb = b.title || '';
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total_results = results.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;

    const pageResults = results.slice(startIndex, startIndex + size).map(it => ({
      library_item_id: it.id,
      title: it.title || '',
      description: it.description || '',
      content_type: it.content_type || null,
      primary_category: it.primary_category || null,
      tags: Array.isArray(it.tags) ? it.tags : [],
      duration_minutes: it.duration_minutes != null ? it.duration_minutes : null,
      rating: it.rating != null ? it.rating : null,
      is_guided: !!it.is_guided
    }));

    return { results: pageResults, total_results, page: pg, page_size: size };
  }

  getLibraryItemDetails(libraryItemId) {
    const items = this._getFromStorage('library_items', []);
    const it = items.find(x => x.id === libraryItemId);
    if (!it) {
      return { library_item: null };
    }
    const library_item = {
      id: it.id,
      title: it.title || '',
      description: it.description || '',
      content_type: it.content_type || null,
      primary_category: it.primary_category || null,
      tags: Array.isArray(it.tags) ? it.tags : [],
      duration_minutes: it.duration_minutes != null ? it.duration_minutes : null,
      rating: it.rating != null ? it.rating : null,
      url: it.url || '',
      is_guided: !!it.is_guided
    };
    return { library_item };
  }

  addLibraryItemToPlaylist(libraryItemId, playlistId, create_if_not_exists_name) {
    const items = this._getFromStorage('library_items', []);
    const libraryItem = items.find(it => it.id === libraryItemId);
    if (!libraryItem) {
      return { success: false, playlist: null, playlist_item: null, message: 'library_item_not_found' };
    }

    let playlist = null;
    let playlists = this._getFromStorage('playlists', []);

    if (playlistId) {
      playlist = playlists.find(p => p.id === playlistId) || null;
    }
    if (!playlist && create_if_not_exists_name) {
      playlist = this._createOrGetPlaylistByName(create_if_not_exists_name);
      playlists = this._getFromStorage('playlists', []); // refresh
    }
    if (!playlist) {
      return { success: false, playlist: null, playlist_item: null, message: 'playlist_not_found' };
    }

    const playlistItems = this._getFromStorage('playlist_items', []);
    const current = playlistItems.filter(pi => pi.playlist_id === playlist.id);
    let maxIndex = -1;
    for (let i = 0; i < current.length; i++) {
      if (typeof current[i].order_index === 'number' && current[i].order_index > maxIndex) {
        maxIndex = current[i].order_index;
      }
    }

    const playlist_item = {
      id: this._generateId('playlist_item'),
      playlist_id: playlist.id,
      library_item_id: libraryItemId,
      order_index: maxIndex + 1,
      added_at: this._nowISO()
    };

    playlistItems.push(playlist_item);
    this._saveToStorage('playlist_items', playlistItems);

    return { success: true, playlist, playlist_item, message: 'library_item_added_to_playlist' };
  }

  getPlaylists() {
    const playlists = this._getFromStorage('playlists', []);
    return {
      playlists: playlists.map(p => ({
        id: p.id,
        name: p.name || '',
        description: p.description || '',
        created_at: p.created_at || null,
        updated_at: p.updated_at || null
      }))
    };
  }

  getPlaylistDetails(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const libraryItems = this._getFromStorage('library_items', []);

    const p = playlists.find(x => x.id === playlistId);
    if (!p) {
      return { playlist: null, items: [] };
    }

    const playlist = {
      id: p.id,
      name: p.name || '',
      description: p.description || '',
      created_at: p.created_at || null,
      updated_at: p.updated_at || null
    };

    const itemsRaw = playlistItems.filter(pi => pi.playlist_id === playlistId);
    itemsRaw.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const items = itemsRaw.map(pi => {
      const li = libraryItems.find(it => it.id === pi.library_item_id) || {};
      return {
        playlist_item_id: pi.id,
        library_item_id: pi.library_item_id,
        title: li.title || '',
        duration_minutes: li.duration_minutes != null ? li.duration_minutes : null,
        rating: li.rating != null ? li.rating : null,
        order_index: pi.order_index,
        library_item: li
      };
    });

    return { playlist, items };
  }

  // ---------------------- FAQ & CONTACT ----------------------

  getFAQCategories() {
    const faqs = this._getFromStorage('faq_items', []);
    const catSet = {};
    for (let i = 0; i < faqs.length; i++) {
      const c = faqs[i].category;
      if (c && !catSet[c]) catSet[c] = true;
    }
    const categories = Object.keys(catSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    return { categories };
  }

  searchFAQ(query, category, limit) {
    const faqs = this._getFromStorage('faq_items', []);
    const q = (query || '').toLowerCase();
    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;

    // Instrumentation for task completion tracking (task_8)
    try {
      if (q && q.indexOf('wheelchair') !== -1) {
        localStorage.setItem('task8_faqWheelchairSearch', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const results = [];
    for (let i = 0; i < faqs.length && results.length < lim; i++) {
      const f = faqs[i];
      if (category && f.category !== category) continue;
      if (q) {
        const hay = ((f.question || '') + ' ' + (f.answer || '') + ' ' + (Array.isArray(f.keywords) ? f.keywords.join(' ') : '')).toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      results.push({
        faq_item_id: f.id,
        question: f.question || '',
        answer: f.answer || '',
        category: f.category || ''
      });
    }

    return { results };
  }

  submitContactMessage(topic, name, email, phone, message, preferred_contact_method) {
    const messages = this._getFromStorage('contact_messages', []);

    const msg = {
      id: this._generateId('contact_msg'),
      topic: topic || 'other',
      name: name || '',
      email: email || '',
      phone: phone || '',
      message: message || '',
      preferred_contact_method: preferred_contact_method || 'email',
      status: 'open',
      created_at: this._nowISO()
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return { success: true, contact_message: msg, message: 'contact_message_submitted' };
  }

  // ---------------------- ABOUT PAGE ----------------------

  getAboutPageContent() {
    // Try to load from localStorage key 'about_page_content' if present
    let stored = null;
    try {
      const raw = localStorage.getItem('about_page_content');
      if (raw) stored = JSON.parse(raw);
    } catch (e) {
      stored = null;
    }

    const mission = (stored && stored.mission) || '';
    const values = (stored && Array.isArray(stored.values)) ? stored.values : [];
    const history = (stored && stored.history) || '';
    const location_summary = (stored && stored.location_summary) || '';
    const accessibility_summary = (stored && stored.accessibility_summary) || '';
    const key_teachers = (stored && Array.isArray(stored.key_teachers)) ? stored.key_teachers : [];
    const retreat_types_overview = (stored && Array.isArray(stored.retreat_types_overview)) ? stored.retreat_types_overview : [];
    const courses_overview = (stored && stored.courses_overview) || '';
    const mentoring_overview = (stored && stored.mentoring_overview) || '';

    return {
      mission,
      values,
      history,
      location_summary,
      accessibility_summary,
      key_teachers,
      retreat_types_overview,
      courses_overview,
      mentoring_overview
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