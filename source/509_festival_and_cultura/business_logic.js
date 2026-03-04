/* localStorage polyfill for Node.js and environments without localStorage */
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
    // Initialize array-based tables
    const arrayKeys = [
      'event_categories',
      'tags',
      'events',
      'event_tags',
      'venues',
      'event_sessions',
      'ticket_types',
      'festival_passes',
      'seating_sections',
      'seats',
      'cart_items',
      'promo_codes',
      'orders',
      'order_items',
      'favorite_items',
      'contact_requests',
      'seat_reservations'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single cart object (one cart per session)
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    // Promo state attached to current cart
    if (!localStorage.getItem('cart_promo')) {
      localStorage.setItem('cart_promo', 'null');
    }

    // Static page content defaults (minimal, can be overwritten externally)
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem(
        'about_page_content',
        JSON.stringify({ title: 'About', sections: [] })
      );
    }

    if (!localStorage.getItem('help_faq_content')) {
      localStorage.setItem(
        'help_faq_content',
        JSON.stringify({ intro_html: '', faqs: [] })
      );
    }

    if (!localStorage.getItem('terms_content')) {
      localStorage.setItem(
        'terms_content',
        JSON.stringify({ title: 'Terms & Conditions', sections: [] })
      );
    }

    if (!localStorage.getItem('privacy_content')) {
      localStorage.setItem(
        'privacy_content',
        JSON.stringify({ title: 'Privacy Policy', sections: [] })
      );
    }

    // Global id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data || data === 'null') {
      if (typeof defaultValue !== 'undefined') {
        // Return a deep copy of defaultValue to avoid accidental mutation
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
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

  _getCartFromStorage() {
    const raw = localStorage.getItem('cart');
    if (!raw || raw === 'null') return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _saveCartToStorage(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  _getOrCreateCart() {
    let cart = this._getCartFromStorage();
    if (!cart) {
      const nowIso = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        currency: 'USD',
        created_at: nowIso,
        updated_at: nowIso
      };
      this._saveCartToStorage(cart);
    }
    return cart;
  }

  _inferCurrencyForCartItem(item) {
    const events = this._getFromStorage('events', []);
    const passes = this._getFromStorage('festival_passes', []);
    if (item.item_type === 'event_ticket' || item.item_type === 'seat_reservation') {
      const ev = events.find(e => e.id === item.eventId);
      return (ev && ev.currency) || null;
    }
    if (item.item_type === 'festival_pass') {
      const pass = passes.find(p => p.id === item.festivalPassId);
      return (pass && pass.currency) || null;
    }
    return null;
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    const cartItems = allItems.filter(i => i.cartId === cart.id);
    let subtotal = 0;
    let currency = cart.currency || null;

    for (const item of cartItems) {
      subtotal += typeof item.line_subtotal === 'number' ? item.line_subtotal : 0;
      if (!currency) {
        currency = this._inferCurrencyForCartItem(item) || currency;
      }
    }

    cart.items = cartItems.map(i => i.id);
    cart.subtotal = subtotal;
    cart.currency = currency || cart.currency || 'USD';
    cart.updated_at = new Date().toISOString();

    this._saveCartToStorage(cart);
    this._saveToStorage('cart_items', allItems);

    return cart;
  }

  _findPromoByCode(code) {
    const promos = this._getFromStorage('promo_codes', []);
    if (!code) return null;
    const upper = String(code).toUpperCase();
    return promos.find(p => String(p.code || '').toUpperCase() === upper) || null;
  }

  _getCartPromoState() {
    const raw = localStorage.getItem('cart_promo');
    if (!raw || raw === 'null') return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _setCartPromoState(state) {
    if (!state) {
      localStorage.setItem('cart_promo', 'null');
    } else {
      localStorage.setItem('cart_promo', JSON.stringify(state));
    }
  }

  _applyPromoToCart(code) {
    const cart = this._getOrCreateCart();
    const subtotal = cart.subtotal || 0;
    const currency = cart.currency || 'USD';

    const response = {
      success: false,
      message: '',
      promo_code: null,
      discount_type: null,
      discount_value: 0,
      discount_amount_applied: 0,
      subtotal: subtotal,
      discount_total: 0,
      total: subtotal,
      currency: currency,
      errors: []
    };

    const promo = this._findPromoByCode(code);
    if (!promo) {
      response.message = 'Promo code not found';
      response.errors.push('invalid_code');
      this._setCartPromoState(null);
      return response;
    }

    if (!promo.is_active) {
      response.message = 'Promo code is not active';
      response.errors.push('inactive_promo');
      this._setCartPromoState(null);
      return response;
    }

    const now = new Date();
    if (promo.valid_from) {
      const vf = new Date(promo.valid_from);
      if (now < vf) {
        response.message = 'Promo code is not yet valid';
        response.errors.push('not_yet_valid');
        this._setCartPromoState(null);
        return response;
      }
    }
    if (promo.valid_to) {
      const vt = new Date(promo.valid_to);
      if (now > vt) {
        response.message = 'Promo code has expired';
        response.errors.push('expired');
        this._setCartPromoState(null);
        return response;
      }
    }

    if (typeof promo.min_subtotal === 'number' && subtotal < promo.min_subtotal) {
      response.message = 'Cart subtotal is below the minimum required for this promo code';
      response.errors.push('below_min_subtotal');
      this._setCartPromoState(null);
      return response;
    }

    let discountAmount = 0;
    if (promo.discount_type === 'percent_off') {
      discountAmount = (subtotal * promo.discount_value) / 100;
    } else if (promo.discount_type === 'amount_off') {
      discountAmount = promo.discount_value;
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    const total = subtotal - discountAmount;

    response.success = true;
    response.message = 'Promo code applied';
    response.promo_code = promo.code;
    response.discount_type = promo.discount_type;
    response.discount_value = promo.discount_value;
    response.discount_amount_applied = discountAmount;
    response.discount_total = discountAmount;
    response.total = total;

    this._setCartPromoState({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      applied_at: now.toISOString()
    });

    return response;
  }

  _reserveSeatsForSession(eventSessionId, seatIds) {
    if (!eventSessionId || !Array.isArray(seatIds) || seatIds.length === 0) return;
    const seats = this._getFromStorage('seats', []);
    const reservations = this._getFromStorage('seat_reservations', []);
    const nowIso = new Date().toISOString();

    for (const seatId of seatIds) {
      const seat = seats.find(s => s.id === seatId);
      if (seat) {
        seat.is_available = false;
        reservations.push({
          id: this._generateId('seat_reservation'),
          eventSessionId: eventSessionId,
          seatId: seatId,
          reserved_at: nowIso
        });
      }
    }

    this._saveToStorage('seats', seats);
    this._saveToStorage('seat_reservations', reservations);
  }

  _generateOrderNumber() {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = this._getNextIdCounter();
    return 'ORD-' + ymd + '-' + seq;
  }

  _isEventFavorite(eventId) {
    const favorites = this._getFromStorage('favorite_items', []);
    return favorites.some(f => f.eventId === eventId);
  }

  _dateOnlyFromISO(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _enrichCartItems(rawItems) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const passes = this._getFromStorage('festival_passes', []);
    const seats = this._getFromStorage('seats', []);

    return rawItems.map(item => {
      const enriched = { ...item };
      if (item.eventId) {
        enriched.event = events.find(e => e.id === item.eventId) || null;
      }
      if (item.eventSessionId) {
        enriched.eventSession = sessions.find(s => s.id === item.eventSessionId) || null;
      }
      if (item.ticketTypeId) {
        enriched.ticketType = ticketTypes.find(t => t.id === item.ticketTypeId) || null;
      }
      if (item.festivalPassId) {
        enriched.festivalPass = passes.find(p => p.id === item.festivalPassId) || null;
      }
      if (Array.isArray(item.seatIds) && item.seatIds.length > 0) {
        enriched.seats = seats.filter(s => item.seatIds.includes(s.id));
      }
      return enriched;
    });
  }

  _enrichOrderItems(rawItems) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const passes = this._getFromStorage('festival_passes', []);
    const seats = this._getFromStorage('seats', []);

    return rawItems.map(item => {
      const enriched = { ...item };
      if (item.eventId) {
        enriched.event = events.find(e => e.id === item.eventId) || null;
      }
      if (item.eventSessionId) {
        enriched.eventSession = sessions.find(s => s.id === item.eventSessionId) || null;
      }
      if (item.ticketTypeId) {
        enriched.ticketType = ticketTypes.find(t => t.id === item.ticketTypeId) || null;
      }
      if (item.festivalPassId) {
        enriched.festivalPass = passes.find(p => p.id === item.festivalPassId) || null;
      }
      if (Array.isArray(item.seatIds) && item.seatIds.length > 0) {
        enriched.seats = seats.filter(s => item.seatIds.includes(s.id));
      }
      return enriched;
    });
  }

  // -------------------- Core interface implementations --------------------

  // getEventCategories(): array of EventCategory
  getEventCategories() {
    return this._getFromStorage('event_categories', []);
  }

  // getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const venues = this._getFromStorage('venues', []);
    const categories = this._getFromStorage('event_categories', []);
    const passes = this._getFromStorage('festival_passes', []);

    const categoryById = {};
    for (const c of categories) categoryById[c.id] = c;
    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    // Featured events: active, sorted by rating desc
    const activeEvents = events.filter(e => e.status === 'active');
    activeEvents.sort((a, b) => {
      const ra = typeof a.rating_value === 'number' ? a.rating_value : 0;
      const rb = typeof b.rating_value === 'number' ? b.rating_value : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
      const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
      return cb - ca;
    });

    const featuredEvents = activeEvents.slice(0, 10).map(ev => {
      const evSessions = sessions.filter(s => s.eventId === ev.id && !s.is_sold_out);
      evSessions.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const nextSession = evSessions[0] || null;
      const venue = venueById[ev.venueId] || null;
      const category = categoryById[ev.categoryId] || null;

      return {
        event_id: ev.id,
        title: ev.title,
        subtitle: ev.subtitle || '',
        category_key: category ? category.key : null,
        category_label: ev.category_label || (category ? category.name : null),
        start_date: ev.start_date || null,
        end_date: ev.end_date || null,
        next_session_start_datetime: nextSession ? nextSession.start_datetime : null,
        venue_name: venue ? venue.name : null,
        city: venue ? venue.city : null,
        indoor_outdoor_label: ev.indoor_outdoor_label || (venue ? (venue.venue_type === 'indoor' ? 'Indoor' : venue.venue_type === 'outdoor' ? 'Outdoor' : 'Mixed') : null),
        min_price: ev.min_price,
        currency: ev.currency || 'USD',
        rating_value: ev.rating_value || 0,
        rating_count: ev.rating_count || 0,
        image_url: ev.image_url || null,
        is_favorite: this._isEventFavorite(ev.id)
      };
    });

    // Featured festival passes: active, sorted by rating desc
    const activePasses = passes.filter(p => p.status === 'active');
    activePasses.sort((a, b) => {
      const ra = typeof a.rating_value === 'number' ? a.rating_value : 0;
      const rb = typeof b.rating_value === 'number' ? b.rating_value : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
      const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
      return cb - ca;
    });

    const eventsById = {};
    for (const ev of events) eventsById[ev.id] = ev;

    const featuredFestivalPasses = activePasses.slice(0, 10).map(pass => {
      const festivalEvent = eventsById[pass.festivalEventId] || null;
      const includedDates = Array.isArray(pass.included_dates) ? pass.included_dates : [];
      let included_start = null;
      let included_end = null;
      if (includedDates.length > 0) {
        const sorted = includedDates.slice().sort((a, b) => new Date(a) - new Date(b));
        included_start = sorted[0];
        included_end = sorted[sorted.length - 1];
      }

      return {
        festival_pass_id: pass.id,
        name: pass.name,
        festival_title: festivalEvent ? festivalEvent.title : null,
        duration_days: pass.duration_days,
        price: pass.price,
        currency: pass.currency || 'USD',
        rating_value: pass.rating_value || 0,
        rating_count: pass.rating_count || 0,
        stages_included_count: pass.stages_included_count || 0,
        image_url: pass.image_url || (festivalEvent ? festivalEvent.image_url : null)
      };
    });

    return {
      featured_events: featuredEvents,
      featured_festival_passes: featuredFestivalPasses
    };
  }

  // getEventFilterOptions(context_category_key)
  getEventFilterOptions(context_category_key) {
    const categories = this._getFromStorage('event_categories', []);
    const tags = this._getFromStorage('tags', []);

    const price_ranges = [
      { id: 'under_20', label: 'Under $20', min_price: 0, max_price: 20 },
      { id: '20_50', label: '$20 - $50', min_price: 20, max_price: 50 },
      { id: '50_100', label: '$50 - $100', min_price: 50, max_price: 100 },
      { id: '100_plus', label: '$100+', min_price: 100, max_price: null }
    ];

    const rating_thresholds = [
      { value: 4.0, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const venue_types = [
      { key: 'indoor', label: 'Indoor' },
      { key: 'outdoor', label: 'Outdoor' },
      { key: 'mixed', label: 'Indoor & Outdoor' }
    ];

    const time_of_day_options = [
      { key: 'morning', label: 'Morning' },
      { key: 'afternoon', label: 'Afternoon' },
      { key: 'evening', label: 'Evening' },
      { key: 'night', label: 'Night' }
    ];

    const date_presets = [
      { key: 'today', label: 'Today' },
      { key: 'upcoming_weekend', label: 'Upcoming Weekend' },
      { key: 'next_month', label: 'Next Month' }
    ];

    const day_of_week_options = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' }
    ];

    const sort_options = [
      { key: 'rating_desc', label: 'Rating - High to Low' },
      { key: 'price_asc', label: 'Price - Low to High' },
      { key: 'price_desc', label: 'Price - High to Low' },
      { key: 'date_asc', label: 'Date - Soonest First' }
    ];

    // context_category_key could be used to tailor options; for now we return full set
    return {
      categories,
      tags,
      price_ranges,
      rating_thresholds,
      venue_types,
      time_of_day_options,
      date_presets,
      day_of_week_options,
      sort_options
    };
  }

  // listEvents(...) with many filters
  listEvents(
    query,
    categoryIds,
    tagIds,
    date_preset,
    specific_date,
    month,
    year,
    date_from,
    date_to,
    days_of_week,
    is_weekend_only,
    time_of_day,
    start_time_after,
    price_min,
    price_max,
    min_rating,
    venue_types,
    is_family_friendly,
    include_sold_out,
    sort_by,
    page,
    page_size
  ) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const categories = this._getFromStorage('event_categories', []);
    const venues = this._getFromStorage('venues', []);
    const eventTags = this._getFromStorage('event_tags', []);

    const categoryById = {};
    for (const c of categories) categoryById[c.id] = c;
    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    const tagIdsSet = new Set(Array.isArray(tagIds) ? tagIds : []);
    const eventToTagIds = {};
    for (const et of eventTags) {
      if (!eventToTagIds[et.eventId]) eventToTagIds[et.eventId] = new Set();
      eventToTagIds[et.eventId].add(et.tagId);
    }

    const includeSoldOutSessions = include_sold_out === true;

    const timeFilterUsed = !!(
      date_preset ||
      specific_date ||
      month ||
      year ||
      date_from ||
      date_to ||
      (Array.isArray(days_of_week) && days_of_week.length > 0) ||
      is_weekend_only ||
      (Array.isArray(time_of_day) && time_of_day.length > 0) ||
      start_time_after
    );

    const startTimeAfterMinutes = start_time_after
      ? (() => {
          const parts = String(start_time_after).split(':');
          const h = parseInt(parts[0], 10) || 0;
          const m = parseInt(parts[1] || '0', 10) || 0;
          return h * 60 + m;
        })()
      : null;

    const daysOfWeekSet = new Set(Array.isArray(days_of_week) ? days_of_week : []);
    const timeOfDaySet = new Set(Array.isArray(time_of_day) ? time_of_day : []);
    const venueTypesSet = new Set(Array.isArray(venue_types) ? venue_types : []);

    const today = new Date();
    const todayStr = this._dateOnlyFromISO(today.toISOString());

    let upcomingWeekendStart = null;
    let upcomingWeekendEnd = null;
    if (date_preset === 'upcoming_weekend') {
      const day = today.getDay(); // 0=Sun,6=Sat
      const daysUntilSaturday = (6 - day + 7) % 7;
      const saturday = new Date(today.getTime());
      saturday.setDate(today.getDate() + daysUntilSaturday);
      const sunday = new Date(saturday.getTime());
      sunday.setDate(saturday.getDate() + 1);
      upcomingWeekendStart = this._dateOnlyFromISO(saturday.toISOString());
      upcomingWeekendEnd = this._dateOnlyFromISO(sunday.toISOString());
    }

    let nextMonthStart = null;
    let nextMonthEnd = null;
    if (date_preset === 'next_month') {
      const y = today.getFullYear();
      const m = today.getMonth();
      const firstOfNext = new Date(y, m + 1, 1);
      const firstOfFollowing = new Date(y, m + 2, 1);
      firstOfFollowing.setDate(firstOfFollowing.getDate() - 1);
      nextMonthStart = this._dateOnlyFromISO(firstOfNext.toISOString());
      nextMonthEnd = this._dateOnlyFromISO(firstOfFollowing.toISOString());
    }

    const specificDateStr = specific_date || null;

    let monthFilter = month || null;
    let yearFilter = year || null;
    if (monthFilter && !yearFilter) {
      yearFilter = today.getFullYear();
    }

    const dateFromIso = date_from || null;
    const dateToIso = date_to || null;
    const dateFrom = dateFromIso ? new Date(dateFromIso) : null;
    const dateTo = dateToIso ? new Date(dateToIso) : null;

    const queryLower = query ? String(query).toLowerCase() : null;

    const dateOnlyFromISO = this._dateOnlyFromISO.bind(this);
    const timeOfDayApproxMinutes = {
      morning: 9 * 60,
      afternoon: 14 * 60,
      evening: 19 * 60,
      night: 22 * 60
    };

    function sessionMatchesFilters(session) {
      if (!includeSoldOutSessions && session.is_sold_out) return false;

      const sessionDateStr = session.start_datetime
        ? dateOnlyFromISO(session.start_datetime)
        : null;
      const sessionDate = session.start_datetime ? new Date(session.start_datetime) : null;

      if (date_preset === 'today') {
        if (sessionDateStr !== todayStr) return false;
      }

      if (date_preset === 'upcoming_weekend' && upcomingWeekendStart && upcomingWeekendEnd) {
        if (!sessionDateStr || sessionDateStr < upcomingWeekendStart || sessionDateStr > upcomingWeekendEnd) {
          return false;
        }
      }

      if (date_preset === 'next_month' && nextMonthStart && nextMonthEnd) {
        if (!sessionDateStr || sessionDateStr < nextMonthStart || sessionDateStr > nextMonthEnd) {
          return false;
        }
      }

      if (specificDateStr) {
        if (sessionDateStr !== specificDateStr) return false;
      }

      if (monthFilter) {
        if (!sessionDate) return false;
        const sm = sessionDate.getMonth() + 1;
        const sy = sessionDate.getFullYear();
        if (sm !== monthFilter || (yearFilter && sy !== yearFilter)) return false;
      }

      if (dateFrom && sessionDate && sessionDate < dateFrom) return false;
      if (dateTo && sessionDate && sessionDate > dateTo) return false;

      if (daysOfWeekSet.size > 0) {
        if (!session.day_of_week || !daysOfWeekSet.has(session.day_of_week)) return false;
      }

      if (is_weekend_only) {
        if (!session.is_weekend) return false;
      }

      if (timeOfDaySet.size > 0) {
        if (!session.time_of_day || !timeOfDaySet.has(session.time_of_day)) return false;
      }

      if (startTimeAfterMinutes != null) {
        let mins = null;
        if (session.time_of_day && timeOfDayApproxMinutes[session.time_of_day] != null) {
          mins = timeOfDayApproxMinutes[session.time_of_day];
        } else if (sessionDate) {
          mins = sessionDate.getHours() * 60 + sessionDate.getMinutes();
        }
        if (mins != null && mins < startTimeAfterMinutes) return false;
      }

      return true;
    }

    const filteredEvents = [];

    for (const ev of events) {
      if (ev.status !== 'active') continue;
      if (!includeSoldOutSessions && ev.status === 'sold_out') continue;

      if (Array.isArray(categoryIds) && categoryIds.length > 0) {
        if (!categoryIds.includes(ev.categoryId)) continue;
      }

      if (typeof is_family_friendly === 'boolean') {
        if (!!ev.is_family_friendly !== is_family_friendly) continue;
      }

      if (typeof min_rating === 'number') {
        const rv = typeof ev.rating_value === 'number' ? ev.rating_value : 0;
        if (rv < min_rating) continue;
      }

      const minPriceVal = typeof price_min === 'number' ? price_min : null;
      const maxPriceVal = typeof price_max === 'number' ? price_max : null;
      if (minPriceVal != null) {
        const evMax = typeof ev.max_price === 'number' ? ev.max_price : null;
        if (evMax != null && evMax < minPriceVal) continue;
      }
      if (maxPriceVal != null) {
        const evMin = typeof ev.min_price === 'number' ? ev.min_price : null;
        if (evMin != null && evMin > maxPriceVal) continue;
      }

      if (queryLower) {
        const text = (
          (ev.title || '') + ' ' + (ev.subtitle || '') + ' ' + (ev.description || '')
        ).toLowerCase();
        if (!text.includes(queryLower)) continue;
      }

      if (tagIdsSet.size > 0) {
        const evTagSet = eventToTagIds[ev.id] || new Set();
        let hasAny = false;
        for (const tid of tagIdsSet) {
          if (evTagSet.has(tid)) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) continue;
      }

      if (venueTypesSet.size > 0) {
        const venue = venueById[ev.venueId];
        const vtype = venue ? venue.venue_type : null;
        if (!vtype || !venueTypesSet.has(vtype)) continue;
      }

      const evSessions = sessions.filter(s => s.eventId === ev.id);
      const availableSessions = evSessions.filter(s => includeSoldOutSessions || !s.is_sold_out);

      let matchingSessions;
      if (timeFilterUsed) {
        matchingSessions = availableSessions.filter(sessionMatchesFilters);
        if (matchingSessions.length === 0) continue;
      } else {
        matchingSessions = availableSessions;
      }

      filteredEvents.push({ event: ev, sessions: matchingSessions, allSessions: availableSessions });
    }

    const cards = filteredEvents.map(({ event: ev, sessions: evSessionsFiltered, allSessions }) => {
      const category = categoryById[ev.categoryId] || null;
      const venue = venueById[ev.venueId] || null;

      const sessionsForNext = evSessionsFiltered.length > 0 ? evSessionsFiltered : allSessions;
      let nextSession = null;
      if (sessionsForNext.length > 0) {
        nextSession = sessionsForNext
          .slice()
          .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))[0];
      }

      return {
        event_id: ev.id,
        title: ev.title,
        subtitle: ev.subtitle || '',
        category_key: category ? category.key : null,
        category_label: ev.category_label || (category ? category.name : null),
        is_festival: !!ev.is_festival,
        image_url: ev.image_url || null,
        status: ev.status,
        venue_name: venue ? venue.name : null,
        city: venue ? venue.city : null,
        indoor_outdoor_label: ev.indoor_outdoor_label || (venue ? (venue.venue_type === 'indoor' ? 'Indoor' : venue.venue_type === 'outdoor' ? 'Outdoor' : 'Mixed') : null),
        next_session_start_datetime: nextSession ? nextSession.start_datetime : null,
        next_session_time_of_day: nextSession ? nextSession.time_of_day : null,
        min_price: ev.min_price,
        max_price: ev.max_price,
        currency: ev.currency || 'USD',
        rating_value: ev.rating_value || 0,
        rating_count: ev.rating_count || 0,
        tags: Array.isArray(ev.tags) ? ev.tags : [],
        is_favorite: this._isEventFavorite(ev.id)
      };
    });

    const sortKey = sort_by || 'date_asc';
    cards.sort((a, b) => {
      if (sortKey === 'rating_desc') {
        const ra = typeof a.rating_value === 'number' ? a.rating_value : 0;
        const rb = typeof b.rating_value === 'number' ? b.rating_value : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      }
      if (sortKey === 'price_asc') {
        const pa = typeof a.min_price === 'number' ? a.min_price : Number.POSITIVE_INFINITY;
        const pb = typeof b.min_price === 'number' ? b.min_price : Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        return 0;
      }
      if (sortKey === 'price_desc') {
        const pa = typeof a.min_price === 'number' ? a.min_price : 0;
        const pb = typeof b.min_price === 'number' ? b.min_price : 0;
        if (pb !== pa) return pb - pa;
        return 0;
      }
      // default date_asc by next_session_start_datetime
      const da = a.next_session_start_datetime ? new Date(a.next_session_start_datetime).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.next_session_start_datetime ? new Date(b.next_session_start_datetime).getTime() : Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      return 0;
    });

    const total = cards.length;
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageEvents = cards.slice(start, end);

    return {
      total,
      page: pg,
      page_size: ps,
      events: pageEvents
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const categories = this._getFromStorage('event_categories', []);
    const venues = this._getFromStorage('venues', []);
    const tags = this._getFromStorage('tags', []);
    const eventTags = this._getFromStorage('event_tags', []);
    let sessions = this._getFromStorage('event_sessions', []);
    let ticketTypes = this._getFromStorage('ticket_types', []);

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        category_label: null,
        venue: null,
        indoor_outdoor_label: null,
        tags: [],
        is_favorite: false,
        sessions: [],
        ticket_types: [],
        price_summary: {
          min_price: null,
          max_price: null,
          currency: 'USD'
        }
      };
    }

    const category = categories.find(c => c.id === event.categoryId) || null;
    const venue = venues.find(v => v.id === event.venueId) || null;
    const etags = eventTags.filter(et => et.eventId === event.id);
    const tagList = etags
      .map(et => tags.find(t => t.id === et.tagId))
      .filter(t => !!t);

    let eventSessionsRaw = sessions.filter(s => s.eventId === event.id);
    if (eventSessionsRaw.length === 0) {
      const nowIso = event.start_date || new Date().toISOString();
      const autoSession = {
        id: this._generateId('event_session'),
        eventId: event.id,
        venueId: event.venueId,
        start_datetime: nowIso,
        end_datetime: event.end_date || nowIso,
        day_of_week: 'saturday',
        is_weekend: true,
        time_of_day: 'afternoon',
        is_daytime: true,
        base_price_from: typeof event.min_price === 'number' ? event.min_price : 0,
        base_price_to:
          typeof event.max_price === 'number'
            ? event.max_price
            : typeof event.min_price === 'number'
            ? event.min_price
            : 0,
        is_sold_out: false
      };
      sessions = sessions.concat(autoSession);
      this._saveToStorage('event_sessions', sessions);
      eventSessionsRaw = [autoSession];
    }
    const eventSessions = eventSessionsRaw.map(s => {
      const ven = venues.find(v => v.id === (s.venueId || event.venueId)) || null;
      return {
        ...s,
        event: event,
        venue: ven
      };
    });

    let eventTicketTypes = ticketTypes
      .filter(t => t.eventId === event.id)
      .map(t => ({ ...t, event }));

    if (eventTicketTypes.length === 0) {
      const basePrice = typeof event.min_price === 'number' ? event.min_price : 0;
      const autoTicket = {
        id: this._generateId('ticket_type'),
        eventId: event.id,
        name: 'General Admission',
        ticket_kind: 'general_admission',
        description: 'Auto-generated general admission ticket',
        base_price: basePrice,
        currency: event.currency || 'USD',
        is_default: true,
        min_quantity: 1,
        max_quantity: 10
      };
      ticketTypes = ticketTypes.concat(autoTicket);
      this._saveToStorage('ticket_types', ticketTypes);
      eventTicketTypes = [{ ...autoTicket, event }];
    }

    const priceSummary = {
      min_price: typeof event.min_price === 'number' ? event.min_price : null,
      max_price: typeof event.max_price === 'number' ? event.max_price : null,
      currency: event.currency || 'USD'
    };

    const eventWithRefs = {
      ...event,
      category: category,
      venue: venue
    };

    const indoorLabel =
      event.indoor_outdoor_label ||
      (venue
        ? venue.venue_type === 'indoor'
          ? 'Indoor'
          : venue.venue_type === 'outdoor'
          ? 'Outdoor'
          : 'Mixed'
        : null);

    return {
      event: eventWithRefs,
      category_label: event.category_label || (category ? category.name : null),
      venue: venue,
      indoor_outdoor_label: indoorLabel,
      tags: tagList,
      is_favorite: this._isEventFavorite(event.id),
      sessions: eventSessions,
      ticket_types: eventTicketTypes,
      price_summary: priceSummary
    };
  }

  // addEventTicketsToCart(eventId, eventSessionId, ticketSelections)
  addEventTicketsToCart(eventId, eventSessionId, ticketSelections) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const session = sessions.find(s => s.id === eventSessionId && s.eventId === eventId);
    if (!session) {
      return {
        success: false,
        message: 'Invalid event session',
        cart: null
      };
    }

    const nowIso = new Date().toISOString();

    if (!Array.isArray(ticketSelections) || ticketSelections.length === 0) {
      return {
        success: false,
        message: 'No ticket selections provided',
        cart: null
      };
    }

    for (const sel of ticketSelections) {
      if (!sel || !sel.ticketTypeId || !sel.quantity) continue;
      const tt = ticketTypes.find(t => t.id === sel.ticketTypeId && t.eventId === eventId);
      if (!tt) continue;
      const quantity = sel.quantity;
      const unitPrice = tt.base_price;
      const lineSubtotal = unitPrice * quantity;
      const description = `${quantity}x ${tt.name} - ${session.start_datetime}`;

      const cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        item_type: 'event_ticket',
        eventId: eventId,
        eventSessionId: eventSessionId,
        ticketTypeId: tt.id,
        festivalPassId: null,
        seatIds: [],
        quantity: quantity,
        unit_price: unitPrice,
        line_subtotal: lineSubtotal,
        description: description,
        added_at: nowIso
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const updatedItems = this._getFromStorage('cart_items', []).filter(i => i.cartId === updatedCart.id);
    const enrichedItems = this._enrichCartItems(updatedItems);

    return {
      success: true,
      message: 'Tickets added to cart',
      cart: {
        subtotal: updatedCart.subtotal,
        currency: updatedCart.currency,
        items_count: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // getSeatingMap(eventId, eventSessionId)
  getSeatingMap(eventId, eventSessionId) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const venues = this._getFromStorage('venues', []);
    const sections = this._getFromStorage('seating_sections', []);
    const seats = this._getFromStorage('seats', []);

    const event = events.find(e => e.id === eventId) || null;
    const session = sessions.find(s => s.id === eventSessionId && s.eventId === eventId) || null;

    if (!event || !session) {
      return {
        event: null,
        session: null,
        venue: null,
        price_legend: [],
        sections: []
      };
    }

    const venueId = session.venueId || event.venueId;
    const venue = venues.find(v => v.id === venueId) || null;

    const venueSections = sections.filter(sec => sec.venueId === venueId);
    const seatsBySectionId = {};
    for (const seat of seats) {
      if (!seatsBySectionId[seat.seatingSectionId]) seatsBySectionId[seat.seatingSectionId] = [];
      seatsBySectionId[seat.seatingSectionId].push(seat);
    }

    const priceLegendMap = {};
    for (const seat of seats) {
      if (!venueSections.some(sec => sec.id === seat.seatingSectionId)) continue;
      const tier = seat.price_tier || 'other';
      if (!priceLegendMap[tier]) {
        priceLegendMap[tier] = {
          price_tier: tier,
          label:
            tier === 'cheapest'
              ? 'Cheapest'
              : tier === 'standard'
              ? 'Standard'
              : tier === 'vip'
              ? 'VIP'
              : tier,
          min_price: seat.price,
          max_price: seat.price,
          currency: seat.currency || 'USD'
        };
      } else {
        const legend = priceLegendMap[tier];
        if (seat.price < legend.min_price) legend.min_price = seat.price;
        if (seat.price > legend.max_price) legend.max_price = seat.price;
      }
    }

    const price_legend = Object.values(priceLegendMap);

    const sectionStructures = venueSections.map(sec => {
      const secSeats = seatsBySectionId[sec.id] || [];
      const rowsMap = {};
      for (const seat of secSeats) {
        if (!rowsMap[seat.row_label]) rowsMap[seat.row_label] = [];
        rowsMap[seat.row_label].push({
          ...seat,
          seatingSection: sec
        });
      }
      const rows = Object.keys(rowsMap)
        .sort()
        .map(rowLabel => {
          const rowSeats = rowsMap[rowLabel].sort((a, b) => {
            const na = parseInt(a.seat_number, 10);
            const nb = parseInt(b.seat_number, 10);
            if (Number.isNaN(na) || Number.isNaN(nb)) return String(a.seat_number).localeCompare(String(b.seat_number));
            return na - nb;
          });
          const isFrontRow = !!rowSeats.some(s => s.is_front_row) || (sec.front_row_label && sec.front_row_label === rowLabel);
          return {
            row_label: rowLabel,
            is_front_row: isFrontRow,
            seats: rowSeats
          };
        });

      return {
        section: {
          ...sec,
          venue: venue
        },
        rows: rows
      };
    });

    return {
      event: {
        id: event.id,
        title: event.title
      },
      session: {
        id: session.id,
        start_datetime: session.start_datetime,
        end_datetime: session.end_datetime
      },
      venue: venue,
      price_legend: price_legend,
      sections: sectionStructures
    };
  }

  // addSeatsToCart(eventId, eventSessionId, seatIds, ticketTypeId)
  addSeatsToCart(eventId, eventSessionId, seatIds, ticketTypeId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const seats = this._getFromStorage('seats', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const session = sessions.find(s => s.id === eventSessionId && s.eventId === eventId);
    if (!session) {
      return {
        success: false,
        message: 'Invalid event session',
        cart: null
      };
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return {
        success: false,
        message: 'No seats selected',
        cart: null
      };
    }

    const selectedSeats = seats.filter(s => seatIds.includes(s.id));
    if (selectedSeats.length === 0) {
      return {
        success: false,
        message: 'Selected seats not found',
        cart: null
      };
    }

    const unavailable = selectedSeats.some(s => s.is_available === false);
    if (unavailable) {
      return {
        success: false,
        message: 'One or more selected seats are not available',
        cart: null
      };
    }

    let ticketType = null;
    if (ticketTypeId) {
      ticketType = ticketTypes.find(t => t.id === ticketTypeId && t.eventId === eventId) || null;
    }

    const quantity = selectedSeats.length;
    const firstPrice = selectedSeats[0].price;
    const unitPrice = firstPrice;
    const lineSubtotal = unitPrice * quantity;
    const seatLabels = selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ');
    const description = `${quantity}x Reserved Seats (${seatLabels}) - ${session.start_datetime}`;

    const nowIso = new Date().toISOString();

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'seat_reservation',
      eventId: eventId,
      eventSessionId: eventSessionId,
      ticketTypeId: ticketType ? ticketType.id : null,
      festivalPassId: null,
      seatIds: seatIds.slice(),
      quantity: quantity,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      description: description,
      added_at: nowIso
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    this._reserveSeatsForSession(eventSessionId, seatIds);

    const updatedCart = this._recalculateCartTotals(cart);
    const updatedItems = this._getFromStorage('cart_items', []).filter(i => i.cartId === updatedCart.id);
    const enrichedItems = this._enrichCartItems(updatedItems);

    return {
      success: true,
      message: 'Seats added to cart',
      cart: {
        subtotal: updatedCart.subtotal,
        currency: updatedCart.currency,
        items_count: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // getFestivalPassFilterOptions()
  getFestivalPassFilterOptions() {
    const duration_options = [
      { min_days: 1, label: '1+ days' },
      { min_days: 3, label: '3+ days' },
      { min_days: 5, label: '5+ days' }
    ];

    const price_ranges = [
      { min_price: 0, max_price: 100, label: 'Under $100' },
      { min_price: 100, max_price: 200, label: '$100 - $200' },
      { min_price: 200, max_price: null, label: '$200+' }
    ];

    const sort_options = [
      { key: 'price_asc', label: 'Price - Low to High' },
      { key: 'price_desc', label: 'Price - High to Low' },
      { key: 'rating_desc', label: 'Rating - High to Low' }
    ];

    return {
      duration_options,
      price_ranges,
      sort_options
    };
  }

  // listFestivalPasses(festivalEventId, min_duration_days, price_min, price_max, sort_by, page, page_size)
  listFestivalPasses(festivalEventId, min_duration_days, price_min, price_max, sort_by, page, page_size) {
    const passes = this._getFromStorage('festival_passes', []);
    const events = this._getFromStorage('events', []);

    const eventsById = {};
    for (const ev of events) eventsById[ev.id] = ev;

    const filtered = passes.filter(p => {
      if (p.status !== 'active') return false;
      if (festivalEventId && p.festivalEventId !== festivalEventId) return false;
      if (typeof min_duration_days === 'number' && p.duration_days < min_duration_days) return false;
      if (typeof price_min === 'number' && p.price < price_min) return false;
      if (typeof price_max === 'number' && p.price > price_max) return false;
      return true;
    });

    const sortKey = sort_by || 'price_asc';
    filtered.sort((a, b) => {
      if (sortKey === 'price_asc') return a.price - b.price;
      if (sortKey === 'price_desc') return b.price - a.price;
      if (sortKey === 'rating_desc') {
        const ra = typeof a.rating_value === 'number' ? a.rating_value : 0;
        const rb = typeof b.rating_value === 'number' ? b.rating_value : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      }
      return 0;
    });

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pagePasses = filtered.slice(start, end);

    const passesOut = pagePasses.map(pass => {
      const festivalEvent = eventsById[pass.festivalEventId] || null;
      const includedDates = Array.isArray(pass.included_dates) ? pass.included_dates : [];
      let included_start = null;
      let included_end = null;
      if (includedDates.length > 0) {
        const sorted = includedDates.slice().sort((a, b) => new Date(a) - new Date(b));
        included_start = sorted[0];
        included_end = sorted[sorted.length - 1];
      }

      return {
        festival_pass_id: pass.id,
        name: pass.name,
        duration_days: pass.duration_days,
        price: pass.price,
        currency: pass.currency || 'USD',
        rating_value: pass.rating_value || 0,
        rating_count: pass.rating_count || 0,
        stages_included_count: pass.stages_included_count || 0,
        included_stage_names: Array.isArray(pass.included_stage_names) ? pass.included_stage_names : [],
        included_date_range_start: included_start,
        included_date_range_end: included_end,
        festival_event_title: festivalEvent ? festivalEvent.title : null,
        festival_image_url: festivalEvent ? festivalEvent.image_url : null,
        status: pass.status
      };
    });

    return {
      total,
      page: pg,
      page_size: ps,
      passes: passesOut
    };
  }

  // getFestivalPassDetails(festivalPassId)
  getFestivalPassDetails(festivalPassId) {
    const passes = this._getFromStorage('festival_passes', []);
    const events = this._getFromStorage('events', []);

    const pass = passes.find(p => p.id === festivalPassId) || null;
    if (!pass) {
      return {
        festival_pass: null,
        festival_event: null
      };
    }

    const event = events.find(e => e.id === pass.festivalEventId) || null;

    const festival_pass = {
      ...pass,
      festivalEvent: event
    };

    const festival_event = event
      ? {
          event_id: event.id,
          title: event.title,
          venue_name: null,
          city: null,
          image_url: event.image_url || null
        }
      : null;

    return {
      festival_pass,
      festival_event
    };
  }

  // addFestivalPassToCart(festivalPassId, quantity)
  addFestivalPassToCart(festivalPassId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const passes = this._getFromStorage('festival_passes', []);

    const pass = passes.find(p => p.id === festivalPassId);
    if (!pass) {
      return {
        success: false,
        message: 'Festival pass not found',
        cart: null
      };
    }

    const nowIso = new Date().toISOString();
    const unitPrice = pass.price;
    const lineSubtotal = unitPrice * qty;
    const description = `${qty}x ${pass.name}`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'festival_pass',
      eventId: null,
      eventSessionId: null,
      ticketTypeId: null,
      festivalPassId: festivalPassId,
      seatIds: [],
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      description: description,
      added_at: nowIso
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const updatedItems = this._getFromStorage('cart_items', []).filter(i => i.cartId === updatedCart.id);
    const enrichedItems = this._enrichCartItems(updatedItems);

    return {
      success: true,
      message: 'Festival pass added to cart',
      cart: {
        subtotal: updatedCart.subtotal,
        currency: updatedCart.currency,
        items_count: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allItems.filter(i => i.cartId === cart.id);
    const enrichedItems = this._enrichCartItems(itemsForCart);

    return {
      cart,
      items: enrichedItems
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const idx = allItems.findIndex(i => i.id === cartItemId && i.cartId === cart.id);

    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    const qty = typeof quantity === 'number' ? quantity : 0;
    if (qty <= 0) {
      allItems.splice(idx, 1);
    } else {
      const item = allItems[idx];
      item.quantity = qty;
      item.line_subtotal = item.unit_price * qty;
      allItems[idx] = item;
    }

    this._saveToStorage('cart_items', allItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const updatedItems = this._getFromStorage('cart_items', []).filter(i => i.cartId === updatedCart.id);
    const enrichedItems = this._enrichCartItems(updatedItems);

    return {
      success: true,
      message: 'Cart updated',
      cart: {
        subtotal: updatedCart.subtotal,
        currency: updatedCart.currency,
        items_count: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const idx = allItems.findIndex(i => i.id === cartItemId && i.cartId === cart.id);

    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    allItems.splice(idx, 1);
    this._saveToStorage('cart_items', allItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const updatedItems = this._getFromStorage('cart_items', []).filter(i => i.cartId === updatedCart.id);
    const enrichedItems = this._enrichCartItems(updatedItems);

    return {
      success: true,
      message: 'Cart item removed',
      cart: {
        subtotal: updatedCart.subtotal,
        currency: updatedCart.currency,
        items_count: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allItems.filter(i => i.cartId === cart.id);
    const enrichedItems = this._enrichCartItems(itemsForCart);

    let subtotal = cart.subtotal || 0;
    let discount_total = 0;
    let total = subtotal;
    let applied_promo_code = null;
    let promo_discount_description = '';
    const validation_warnings = [];

    const promoState = this._getCartPromoState();

    if (promoState && promoState.code) {
      const promoResult = this._applyPromoToCart(promoState.code);
      if (promoResult.success) {
        discount_total = promoResult.discount_amount_applied;
        total = promoResult.total;
        applied_promo_code = promoResult.promo_code;
        if (promoResult.discount_type === 'percent_off') {
          promo_discount_description = `${promoResult.discount_value}% off`;
        } else if (promoResult.discount_type === 'amount_off') {
          promo_discount_description = `$${promoResult.discount_value} off`;
        }
      } else {
        if (promoResult.message) validation_warnings.push(promoResult.message);
      }
    }

    return {
      items: enrichedItems,
      subtotal,
      discount_total,
      total,
      currency: cart.currency || 'USD',
      applied_promo_code,
      promo_discount_description,
      validation_warnings
    };
  }

  // applyPromoCode(code)
  applyPromoCode(code) {
    return this._applyPromoToCart(code);
  }

  // placeOrder(contact_name, contact_email, contact_phone)
  placeOrder(contact_name, contact_email, contact_phone) {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allCartItems.filter(i => i.cartId === cart.id);

    if (itemsForCart.length === 0) {
      return {
        success: false,
        order: null,
        order_items: []
      };
    }

    const promoState = this._getCartPromoState();
    let subtotal = cart.subtotal || 0;
    let discount_total = 0;
    let total = subtotal;
    let appliedPromoCode = null;

    if (promoState && promoState.code) {
      const promoResult = this._applyPromoToCart(promoState.code);
      if (promoResult.success) {
        discount_total = promoResult.discount_amount_applied;
        total = promoResult.total;
        appliedPromoCode = promoResult.promo_code;
      }
    }

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const orderNumber = this._generateOrderNumber();
    const nowIso = new Date().toISOString();

    const orderId = this._generateId('order');
    const order = {
      id: orderId,
      order_number: orderNumber,
      created_at: nowIso,
      status: 'confirmed',
      contact_name,
      contact_email,
      contact_phone,
      items: [],
      subtotal,
      discount_total,
      total,
      currency: cart.currency || 'USD',
      promo_code: appliedPromoCode,
      confirmation_number: orderNumber
    };

    for (const ci of itemsForCart) {
      const oi = {
        id: this._generateId('order_item'),
        orderId: orderId,
        item_type: ci.item_type,
        eventId: ci.eventId || null,
        eventSessionId: ci.eventSessionId || null,
        ticketTypeId: ci.ticketTypeId || null,
        festivalPassId: ci.festivalPassId || null,
        seatIds: Array.isArray(ci.seatIds) ? ci.seatIds.slice() : [],
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        description: ci.description || ''
      };
      order.items.push(oi.id);
      orderItems.push(oi);
    }

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    const remainingCartItems = allCartItems.filter(i => i.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    const clearedCart = {
      ...cart,
      items: [],
      subtotal: 0,
      updated_at: nowIso
    };
    this._saveCartToStorage(clearedCart);
    this._setCartPromoState(null);

    const enrichedOrderItems = this._enrichOrderItems(orderItems.filter(oi => oi.orderId === orderId));

    const promoCodes = this._getFromStorage('promo_codes', []);
    const promoObj = promoCodes.find(p => p.code === order.promo_code) || null;
    const orderWithPromo = {
      ...order,
      promoCode: promoObj
    };

    return {
      success: true,
      order: orderWithPromo,
      order_items: enrichedOrderItems
    };
  }

  // getFavoriteEvents()
  getFavoriteEvents() {
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const categories = this._getFromStorage('event_categories', []);

    const favorites = favoriteItems.map(fi => {
      const ev = events.find(e => e.id === fi.eventId) || null;
      let nextSession = null;
      if (ev) {
        const evSessions = sessions
          .filter(s => s.eventId === ev.id && !s.is_sold_out)
          .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        nextSession = evSessions[0] || null;
      }

      const category = ev ? categories.find(c => c.id === ev.categoryId) || null : null;

      const favorite_item = {
        ...fi,
        event: ev
      };

      const eventProj = ev
        ? {
            event_id: ev.id,
            title: ev.title,
            subtitle: ev.subtitle || '',
            category_key: category ? category.key : null,
            category_label: ev.category_label || (category ? category.name : null),
            next_session_start_datetime: nextSession ? nextSession.start_datetime : null,
            min_price: ev.min_price,
            currency: ev.currency || 'USD',
            rating_value: ev.rating_value || 0,
            rating_count: ev.rating_count || 0,
            image_url: ev.image_url || null
          }
        : null;

      return {
        favorite_item,
        event: eventProj
      };
    });

    return { favorites };
  }

  // addFavoriteEvent(eventId)
  addFavoriteEvent(eventId) {
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const events = this._getFromStorage('events', []);

    if (!favoriteItems.some(f => f.eventId === eventId)) {
      const fi = {
        id: this._generateId('favorite'),
        eventId: eventId,
        created_at: new Date().toISOString()
      };
      favoriteItems.push(fi);
      this._saveToStorage('favorite_items', favoriteItems);
    }

    const updatedFavorites = this._getFromStorage('favorite_items', []);
    const total_favorites = updatedFavorites.length;
    const addedFavorite = updatedFavorites.find(f => f.eventId === eventId) || null;
    const event = events.find(e => e.id === eventId) || null;

    const favorite_item = addedFavorite
      ? {
          ...addedFavorite,
          event: event
        }
      : null;

    return {
      success: !!favorite_item,
      favorite_item,
      total_favorites
    };
  }

  // removeFavoriteEvent(eventId)
  removeFavoriteEvent(eventId) {
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const remaining = favoriteItems.filter(f => f.eventId !== eventId);
    this._saveToStorage('favorite_items', remaining);
    return {
      success: true,
      total_favorites: remaining.length
    };
  }

  // getOrderConfirmation(orderId)
  getOrderConfirmation(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return {
        order: null,
        items: []
      };
    }

    const promoObj = promoCodes.find(p => p.code === order.promo_code) || null;
    const orderWithPromo = {
      ...order,
      promoCode: promoObj
    };

    const itemsForOrder = orderItems.filter(oi => oi.orderId === orderId);
    const enrichedItems = this._enrichOrderItems(itemsForOrder);

    return {
      order: orderWithPromo,
      items: enrichedItems
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return this._getFromStorage('about_page_content', { title: 'About', sections: [] });
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return this._getFromStorage('help_faq_content', { intro_html: '', faqs: [] });
  }

  // submitContactRequest(name, email, subject, message)
  submitContactRequest(name, email, subject, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const contact_request = {
      id: this._generateId('contact'),
      name,
      email,
      subject: subject || '',
      message,
      created_at: new Date().toISOString()
    };
    requests.push(contact_request);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      contact_request,
      message: 'Your message has been received.'
    };
  }

  // getTermsContent()
  getTermsContent() {
    return this._getFromStorage('terms_content', { title: 'Terms & Conditions', sections: [] });
  }

  // getPrivacyContent()
  getPrivacyContent() {
    return this._getFromStorage('privacy_content', { title: 'Privacy Policy', sections: [] });
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