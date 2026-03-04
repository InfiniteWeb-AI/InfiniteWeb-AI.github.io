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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables (arrays)
    ensure('venues', []);
    ensure('events', []);
    ensure('event_ticket_types', []);
    ensure('programs', []);
    ensure('program_registrations', []);
    ensure('accommodation_options', []);
    ensure('products', []);
    ensure('cart', []); // array of Cart objects
    ensure('cart_items', []);
    ensure('schedule_plans', []);
    ensure('schedule_items', []);
    ensure('favorites', []);
    ensure('comparison_sets', []);
    ensure('donations', []);
    ensure('newsletter_subscriptions', []);

    // Content / CMS-like tables
    ensure('homepage_highlights', {
      hero_message: '',
      intro_text: '',
      featured_event_ids: [],
      featured_program_ids: [],
      featured_pass_ids: [],
      featured_merchandise_ids: []
    });

    ensure('about_content', {
      festival_overview: '',
      history: '',
      artistic_mission: '',
      artistic_directors: [],
      faculty_highlights: [],
      partners_sponsors: []
    });

    ensure('contact_information', {
      email_addresses: [],
      phone_numbers: [],
      mailing_address: '',
      topics: []
    });

    ensure('faq_entries', []);

    ensure('summer_school_overview_content', {
      overview: '',
      adult_courses_section: '',
      youth_programs_section: ''
    });

    ensure('tickets_overview_content', {
      ticketing_policies: '',
      concessions_info: '',
      passes_explainer: ''
    });

    // Contact form submissions (internal helper storage)
    ensure('contact_messages', []);

    // Global ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  // ----------------------
  // Private helpers (specified in interfaces)
  // ----------------------

  // Get or create the current cart for the session
  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(c => c.id === currentCartId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem IDs
        created_at: this._nowIso(),
        updated_at: null,
        currency: 'usd',
        subtotal: 0,
        notes: ''
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  // Recalculate totals for a given cart object and persist the update
  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('cart', []);
    const cartItems = this._getFromStorage('cart_items', []);

    let subtotal = 0;
    let currency = cart.currency || 'usd';

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    itemsForCart.forEach(item => {
      const lineTotal = (item.unit_price || 0) * (item.quantity || 0);
      item.line_total = lineTotal;
      subtotal += lineTotal;
      if (!currency && item.currency) {
        currency = item.currency;
      }
    });

    cart.subtotal = subtotal;
    cart.currency = currency || 'usd';
    cart.updated_at = this._nowIso();

    // Persist cartItems and carts
    this._saveToStorage('cart_items', cartItems);

    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  // Get or create a single active schedule plan for this session
  _getOrCreateSchedulePlan() {
    const schedulePlans = this._getFromStorage('schedule_plans', []);
    let currentId = localStorage.getItem('current_schedule_plan_id');
    let plan = null;

    if (currentId) {
      plan = schedulePlans.find(p => p.id === currentId) || null;
    }

    if (!plan) {
      plan = {
        id: this._generateId('schedule_plan'),
        name: 'My Schedule',
        is_saved: false,
        created_at: this._nowIso(),
        updated_at: null
      };
      schedulePlans.push(plan);
      this._saveToStorage('schedule_plans', schedulePlans);
      localStorage.setItem('current_schedule_plan_id', plan.id);
    }

    return plan;
  }

  // Get or create the active comparison set
  _getOrCreateComparisonSet() {
    const comparisonSets = this._getFromStorage('comparison_sets', []);
    let currentId = localStorage.getItem('current_comparison_set_id');
    let set = null;

    if (currentId) {
      set = comparisonSets.find(s => s.id === currentId) || null;
    }

    if (!set) {
      set = {
        id: this._generateId('comparison_set'),
        name: 'masterclass_comparison',
        event_ids: [],
        created_at: this._nowIso()
      };
      comparisonSets.push(set);
      this._saveToStorage('comparison_sets', comparisonSets);
      localStorage.setItem('current_comparison_set_id', set.id);
    }

    return set;
  }

  // Get the current draft program registration for this session
  _getCurrentProgramRegistration() {
    const registrations = this._getFromStorage('program_registrations', []);
    const currentId = localStorage.getItem('current_program_registration_id');
    if (!currentId) return null;
    const reg = registrations.find(r => r.id === currentId) || null;
    return reg;
  }

  // Calculate donation processing fee for given amount, currency, and frequency
  _calculateDonationProcessingFee(amount, currency, frequency) {
    // Simple simulated fee model (not real payment logic)
    const amt = Number(amount) || 0;
    if (amt <= 0) return 0;

    // Percent and fixed fees by frequency
    let percent = 0.025;
    if (frequency === 'monthly') {
      percent = 0.02;
    }

    let fixed = 0.3;
    if (currency === 'eur') {
      fixed = 0.35;
    }

    const fee = amt * percent + fixed;
    return Math.round(fee * 100) / 100; // round to 2 decimals
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getHomepageHighlights
  getHomepageHighlights() {
    const raw = this._getFromStorage('homepage_highlights', {
      hero_message: '',
      intro_text: '',
      featured_event_ids: [],
      featured_program_ids: [],
      featured_pass_ids: [],
      featured_merchandise_ids: []
    });

    const events = this._getFromStorage('events', []);
    const programs = this._getFromStorage('programs', []);
    const products = this._getFromStorage('products', []);

    const mapIdsTo = (ids, collection) => {
      if (!Array.isArray(ids)) return [];
      return ids
        .map(id => collection.find(item => item.id === id) || null)
        .filter(x => x !== null);
    };

    const featured_events = mapIdsTo(raw.featured_event_ids, events);
    const featured_programs = mapIdsTo(raw.featured_program_ids, programs);
    const featured_passes = mapIdsTo(raw.featured_pass_ids, products);
    const featured_merchandise = mapIdsTo(raw.featured_merchandise_ids, products);

    return {
      hero_message: raw.hero_message || '',
      intro_text: raw.intro_text || '',
      featured_events,
      featured_programs,
      featured_passes,
      featured_merchandise
    };
  }

  // 2. getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    // Date options from event start dates
    const dateSet = new Set();
    events.forEach(e => {
      if (e.start_datetime) {
        const d = new Date(e.start_datetime);
        if (!isNaN(d.getTime())) {
          const isoDate = d.toISOString().slice(0, 10);
          dateSet.add(isoDate);
        }
      }
    });
    const date_options = Array.from(dateSet)
      .sort()
      .map(date => ({ date, label: date }));

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    const event_type_options = [
      { value: 'concert', label: 'Concert' },
      { value: 'masterclass', label: 'Masterclass' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'lecture', label: 'Lecture' },
      { value: 'other_event', label: 'Other' }
    ];

    const instrument_options = [
      { value: 'piano', label: 'Piano' },
      { value: 'strings', label: 'Strings' },
      { value: 'voice', label: 'Voice' },
      { value: 'multiple_instruments', label: 'Multiple instruments' },
      { value: 'other_instrument', label: 'Other instrument' }
    ];

    const level_options = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'mixed', label: 'Mixed levels' }
    ];

    // Price suggestions based on min_ticket_price
    const prices = events
      .map(e => typeof e.min_ticket_price === 'number' ? e.min_ticket_price : null)
      .filter(p => p !== null && !isNaN(p));

    let price_range_suggestions = [];
    if (prices.length > 0) {
      const minP = Math.min.apply(null, prices);
      const maxP = Math.max.apply(null, prices);
      const mid = minP + (maxP - minP) / 2;
      price_range_suggestions = [
        { min_price: 0, max_price: 0, label: 'Free only' },
        { min_price: minP, max_price: mid, label: 'Lower price range' },
        { min_price: mid, max_price: maxP, label: 'Higher price range' }
      ];
    }

    const sort_options = [
      { value: 'start_datetime_asc', label: 'Start time: earliest first' },
      { value: 'start_datetime_desc', label: 'Start time: latest first' },
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'price_high_to_low', label: 'Price: high to low' },
      { value: 'duration_longest_first', label: 'Duration: longest first' }
    ];

    return {
      date_options,
      time_of_day_options,
      event_type_options,
      instrument_options,
      level_options,
      venue_options: venues,
      price_range_suggestions,
      sort_options
    };
  }

  // 3. searchEvents
  searchEvents(
    query,
    date,
    time_of_day,
    min_price,
    max_price,
    is_free_only,
    event_types,
    instrument,
    level,
    venueId,
    age_min,
    age_max,
    sort_by,
    sort_direction
  ) {
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    let results = events.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      results = results.filter(e => {
        const t = (e.title || '').toLowerCase();
        const d = (e.description || '').toLowerCase();
        return t.includes(q) || d.includes(q);
      });
    }

    if (date) {
      results = results.filter(e => {
        if (!e.start_datetime || typeof e.start_datetime !== 'string') return false;
        const eventDate = e.start_datetime.split('T')[0];
        return eventDate === date;
      });
    }

    if (time_of_day) {
      results = results.filter(e => e.time_of_day === time_of_day);
    }

    if (is_free_only) {
      results = results.filter(e => e.is_free === true);
    }

    if (typeof min_price === 'number') {
      results = results.filter(e => {
        const p = typeof e.min_ticket_price === 'number' ? e.min_ticket_price : 0;
        return p >= min_price;
      });
    }

    if (typeof max_price === 'number') {
      results = results.filter(e => {
        const p = typeof e.min_ticket_price === 'number' ? e.min_ticket_price : 0;
        return p <= max_price;
      });
    }

    if (Array.isArray(event_types) && event_types.length > 0) {
      results = results.filter(e => event_types.indexOf(e.event_type) !== -1);
    }

    if (instrument) {
      results = results.filter(e => e.instrument === instrument);
    }

    if (level) {
      results = results.filter(e => e.level === level);
    }

    if (venueId) {
      results = results.filter(e => e.venue_id === venueId);
    }

    if (typeof age_min === 'number' || typeof age_max === 'number') {
      const paramMin = typeof age_min === 'number' ? age_min : null;
      const paramMax = typeof age_max === 'number' ? age_max : null;
      results = results.filter(e => {
        const evMin = typeof e.age_min === 'number' ? e.age_min : null;
        const evMax = typeof e.age_max === 'number' ? e.age_max : null;
        // If event has no age range, consider it matches any
        if (evMin === null && evMax === null) return true;

        const minA = paramMin !== null ? paramMin : evMin;
        const maxA = paramMax !== null ? paramMax : evMax;

        if (minA === null || maxA === null) return true;
        // Overlap between [evMin, evMax] and [paramMin, paramMax]
        const evMinEff = evMin !== null ? evMin : minA;
        const evMaxEff = evMax !== null ? evMax : maxA;
        return evMinEff <= maxA && evMaxEff >= minA;
      });
    }

    // Sorting
    const dir = sort_direction === 'desc' ? -1 : 1;
    if (sort_by === 'start_datetime') {
      results.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return (da - db) * dir;
      });
    } else if (sort_by === 'price') {
      results.sort((a, b) => {
        const pa = typeof a.min_ticket_price === 'number' ? a.min_ticket_price : 0;
        const pb = typeof b.min_ticket_price === 'number' ? b.min_ticket_price : 0;
        return (pa - pb) * dir;
      });
    } else if (sort_by === 'duration') {
      results.sort((a, b) => {
        const da = typeof a.duration_minutes === 'number' ? a.duration_minutes : 0;
        const db = typeof b.duration_minutes === 'number' ? b.duration_minutes : 0;
        return (da - db) * dir;
      });
    } else if (sort_by === 'title') {
      results.sort((a, b) => {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1 * dir;
        if (ta > tb) return 1 * dir;
        return 0;
      });
    }

    const output = results.map(event => {
      const venue = venues.find(v => v.id === event.venue_id) || null;
      return { event, venue };
    });

    return output;
  }

  // 4. getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const ticketTypes = this._getFromStorage('event_ticket_types', []);
    const favorites = this._getFromStorage('favorites', []);

    const event = events.find(e => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        venue: null,
        ticket_types: [],
        is_in_schedule: false,
        is_favorited: false,
        min_ticket_price: 0
      };
    }

    const venue = venues.find(v => v.id === event.venue_id) || null;
    const ticket_types = ticketTypes.filter(tt => tt.event_id === eventId && tt.is_available !== false);

    // Check schedule membership
    const schedule_plan = this._getOrCreateSchedulePlan();
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const is_in_schedule = scheduleItems.some(si => si.schedule_plan_id === schedule_plan.id && si.event_id === eventId);

    // Check favorite
    const is_favorited = favorites.some(f => f.event_id === eventId);

    let minTicketPrice = typeof event.min_ticket_price === 'number' ? event.min_ticket_price : null;
    if (minTicketPrice === null) {
      const prices = ticket_types.map(tt => tt.price).filter(p => typeof p === 'number');
      if (prices.length > 0) {
        minTicketPrice = Math.min.apply(null, prices);
      } else {
        minTicketPrice = 0;
      }
    }

    return {
      event,
      venue,
      ticket_types,
      is_in_schedule,
      is_favorited,
      min_ticket_price: minTicketPrice
    };
  }

  // 5. getRelatedEventsForEvent
  getRelatedEventsForEvent(eventId) {
    const events = this._getFromStorage('events', []);
    const base = events.find(e => e.id === eventId) || null;
    if (!base) return [];

    const related = events.filter(e => {
      if (e.id === base.id) return false;
      let score = 0;
      if (e.event_type === base.event_type) score += 2;
      if (base.instrument && e.instrument === base.instrument) score += 2;
      if (base.level && e.level === base.level) score += 1;
      if (Array.isArray(base.tags) && Array.isArray(e.tags)) {
        const overlap = e.tags.some(t => base.tags.indexOf(t) !== -1);
        if (overlap) score += 1;
      }
      return score > 0;
    });

    // Could sort by score; for simplicity, keep current order
    return related;
  }

  // 6. addEventTicketToCart
  addEventTicketToCart(eventTicketTypeId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const ticketTypes = this._getFromStorage('event_ticket_types', []);
    const events = this._getFromStorage('events', []);

    const ticketType = ticketTypes.find(tt => tt.id === eventTicketTypeId) || null;
    if (!ticketType || ticketType.is_available === false) {
      return {
        success: false,
        message: 'Ticket type not available',
        cart: null,
        added_item: null
      };
    }

    const event = events.find(e => e.id === ticketType.event_id) || null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const itemType = event && event.event_type === 'workshop' ? 'workshop_ticket' : 'event_ticket';

    const newItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: itemType,
      event_id: ticketType.event_id,
      event_ticket_type_id: ticketType.id,
      product_id: null,
      quantity: qty,
      unit_price: ticketType.price,
      currency: ticketType.currency,
      line_total: ticketType.price * qty,
      selected_size: null,
      selected_options: [],
      description: (event ? event.title + ' - ' : '') + ticketType.category_name + ' (' + ticketType.attendee_type + ')'
    };

    cartItems.push(newItem);

    // Maintain list of item IDs inside cart
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    cart.items.push(newItem.id);

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Ticket added to cart',
      cart,
      added_item: newItem
    };
  }

  // 7. getSchedulePlan
  getSchedulePlan() {
    const schedule_plan = this._getOrCreateSchedulePlan();
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    const itemsForPlan = scheduleItems.filter(si => si.schedule_plan_id === schedule_plan.id);

    const items = itemsForPlan.map(schedule_item => {
      const event = events.find(e => e.id === schedule_item.event_id) || null;
      const venue = event ? (venues.find(v => v.id === event.venue_id) || null) : null;
      return { schedule_item, event, venue };
    });

    return { schedule_plan, items };
  }

  // 8. addEventToSchedule
  addEventToSchedule(eventId) {
    const schedule_plan = this._getOrCreateSchedulePlan();
    const scheduleItems = this._getFromStorage('schedule_items', []);

    const exists = scheduleItems.some(si => si.schedule_plan_id === schedule_plan.id && si.event_id === eventId);
    if (exists) {
      return {
        success: true,
        message: 'Event already in schedule',
        schedule_plan,
        added_item: null
      };
    }

    const newItem = {
      id: this._generateId('schedule_item'),
      schedule_plan_id: schedule_plan.id,
      event_id: eventId,
      added_at: this._nowIso()
    };

    scheduleItems.push(newItem);
    this._saveToStorage('schedule_items', scheduleItems);

    return {
      success: true,
      message: 'Event added to schedule',
      schedule_plan,
      added_item: newItem
    };
  }

  // 9. removeEventFromSchedule
  removeEventFromSchedule(scheduleItemId) {
    const schedule_plan = this._getOrCreateSchedulePlan();
    const scheduleItems = this._getFromStorage('schedule_items', []);

    const idx = scheduleItems.findIndex(si => si.id === scheduleItemId && si.schedule_plan_id === schedule_plan.id);
    if (idx === -1) {
      return {
        success: false,
        message: 'Schedule item not found',
        schedule_plan,
        removed_item_id: null
      };
    }

    const removed = scheduleItems.splice(idx, 1)[0];
    this._saveToStorage('schedule_items', scheduleItems);

    return {
      success: true,
      message: 'Event removed from schedule',
      schedule_plan,
      removed_item_id: removed.id
    };
  }

  // 10. saveSchedulePlan
  saveSchedulePlan(name) {
    const schedulePlans = this._getFromStorage('schedule_plans', []);
    const schedule_plan = this._getOrCreateSchedulePlan();

    if (name && typeof name === 'string') {
      schedule_plan.name = name;
    }
    schedule_plan.is_saved = true;
    schedule_plan.updated_at = this._nowIso();

    const idx = schedulePlans.findIndex(p => p.id === schedule_plan.id);
    if (idx !== -1) {
      schedulePlans[idx] = schedule_plan;
      this._saveToStorage('schedule_plans', schedulePlans);
    }

    return { success: true, schedule_plan };
  }

  // 11. getFavoriteEvents
  getFavoriteEvents() {
    const favorites = this._getFromStorage('favorites', []);
    const events = this._getFromStorage('events', []);

    return favorites.map(favorite => {
      const event = events.find(e => e.id === favorite.event_id) || null;
      return { favorite, event };
    });
  }

  // 12. addEventToFavorites
  addEventToFavorites(eventId) {
    const favorites = this._getFromStorage('favorites', []);

    const existing = favorites.find(f => f.event_id === eventId);
    if (existing) {
      return { success: true, favorite: existing };
    }

    const favorite = {
      id: this._generateId('favorite'),
      target_type: 'event',
      event_id: eventId,
      added_at: this._nowIso()
    };

    favorites.push(favorite);
    this._saveToStorage('favorites', favorites);

    return { success: true, favorite };
  }

  // 13. removeEventFromFavorites
  removeEventFromFavorites(eventId) {
    const favorites = this._getFromStorage('favorites', []);
    const idx = favorites.findIndex(f => f.event_id === eventId);
    if (idx === -1) {
      return { success: false };
    }
    favorites.splice(idx, 1);
    this._saveToStorage('favorites', favorites);
    return { success: true };
  }

  // 14. addEventToComparisonSet
  addEventToComparisonSet(eventId) {
    const comparison_set = this._getOrCreateComparisonSet();
    const events = this._getFromStorage('events', []);

    if (!Array.isArray(comparison_set.event_ids)) {
      comparison_set.event_ids = [];
    }

    if (comparison_set.event_ids.indexOf(eventId) === -1) {
      comparison_set.event_ids.push(eventId);
    }

    // persist comparison set
    const sets = this._getFromStorage('comparison_sets', []);
    const idx = sets.findIndex(s => s.id === comparison_set.id);
    if (idx !== -1) {
      sets[idx] = comparison_set;
      this._saveToStorage('comparison_sets', sets);
    }

    const eventsInSet = comparison_set.event_ids
      .map(id => events.find(e => e.id === id) || null)
      .filter(e => e !== null);

    return {
      success: true,
      comparison_set,
      events: eventsInSet
    };
  }

  // 15. removeEventFromComparisonSet
  removeEventFromComparisonSet(eventId) {
    const comparison_set = this._getOrCreateComparisonSet();
    const events = this._getFromStorage('events', []);

    if (!Array.isArray(comparison_set.event_ids)) {
      comparison_set.event_ids = [];
    }

    const idxId = comparison_set.event_ids.indexOf(eventId);
    if (idxId !== -1) {
      comparison_set.event_ids.splice(idxId, 1);
    }

    const sets = this._getFromStorage('comparison_sets', []);
    const idx = sets.findIndex(s => s.id === comparison_set.id);
    if (idx !== -1) {
      sets[idx] = comparison_set;
      this._saveToStorage('comparison_sets', sets);
    }

    const eventsInSet = comparison_set.event_ids
      .map(id => events.find(e => e.id === id) || null)
      .filter(e => e !== null);

    return {
      success: true,
      comparison_set,
      events: eventsInSet
    };
  }

  // 16. getComparisonSetDetails
  getComparisonSetDetails() {
    const comparison_set = this._getOrCreateComparisonSet();
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    const detailed = (comparison_set.event_ids || []).map(id => {
      const event = events.find(e => e.id === id) || null;
      const venue = event ? (venues.find(v => v.id === event.venue_id) || null) : null;
      return { event, venue };
    }).filter(x => x.event !== null);

    return {
      comparison_set,
      events: detailed
    };
  }

  // 17. clearComparisonSet
  clearComparisonSet() {
    const comparison_set = this._getOrCreateComparisonSet();
    comparison_set.event_ids = [];
    const sets = this._getFromStorage('comparison_sets', []);
    const idx = sets.findIndex(s => s.id === comparison_set.id);
    if (idx !== -1) {
      sets[idx] = comparison_set;
      this._saveToStorage('comparison_sets', sets);
    }
    return { success: true };
  }

  // 18. getProgramFilterOptions
  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs', []);

    const participant_type_options = [
      { value: 'adult', label: 'Adult (18+)' },
      { value: 'youth', label: 'Youth' }
    ];

    const instrument_options = [
      { value: 'piano', label: 'Piano' },
      { value: 'strings', label: 'Strings' },
      { value: 'voice', label: 'Voice' },
      { value: 'multiple_instruments', label: 'Multiple instruments' },
      { value: 'other_instrument', label: 'Other instrument' }
    ];

    const level_options = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'mixed', label: 'Mixed levels' }
    ];

    // Week options derived from programs
    const weekMap = {};
    programs.forEach(p => {
      if (p.week) {
        if (!weekMap[p.week]) {
          weekMap[p.week] = {
            value: p.week,
            label: p.week.replace('_', ' ').replace('week', 'Week').trim(),
            date_range: p.week_date_range || ''
          };
        } else if (!weekMap[p.week].date_range && p.week_date_range) {
          weekMap[p.week].date_range = p.week_date_range;
        }
      }
    });
    const week_options = Object.keys(weekMap).sort().map(key => weekMap[key]);

    const age_group_options = [
      { min_age: 5, max_age: 9, label: '5–9 years' },
      { min_age: 10, max_age: 13, label: '10–13 years' },
      { min_age: 14, max_age: 17, label: '14–17 years' },
      { min_age: 18, max_age: 99, label: '18+ (Adult)' }
    ];

    const session_time_options = [
      { value: 'morning_only', label: 'Morning only' },
      { value: 'afternoon_only', label: 'Afternoon only' },
      { value: 'full_day', label: 'Full day' },
      { value: 'evening_only', label: 'Evening only' }
    ];

    const sort_options = [
      { value: 'start_date_asc', label: 'Start date: earliest first' },
      { value: 'start_date_desc', label: 'Start date: latest first' },
      { value: 'level_asc', label: 'Level (beginner to advanced)' },
      { value: 'title_asc', label: 'Title A–Z' }
    ];

    return {
      participant_type_options,
      instrument_options,
      level_options,
      week_options,
      age_group_options,
      session_time_options,
      sort_options
    };
  }

  // 19. searchPrograms
  searchPrograms(
    participant_type,
    program_type,
    instrument,
    level,
    age_min,
    age_max,
    week,
    session_time,
    sort_by,
    sort_direction
  ) {
    const programs = this._getFromStorage('programs', []);
    let results = programs.slice();

    if (participant_type) {
      results = results.filter(p => p.participant_type === participant_type);
    }

    if (program_type) {
      results = results.filter(p => p.program_type === program_type);
    }

    if (instrument) {
      results = results.filter(p => p.instrument === instrument);
    }

    if (level) {
      results = results.filter(p => p.level === level);
    }

    if (week) {
      results = results.filter(p => p.week === week);
    }

    if (session_time) {
      results = results.filter(p => p.session_time === session_time);
    }

    if (typeof age_min === 'number' || typeof age_max === 'number') {
      const paramMin = typeof age_min === 'number' ? age_min : null;
      const paramMax = typeof age_max === 'number' ? age_max : null;
      results = results.filter(p => {
        const prMin = typeof p.age_min === 'number' ? p.age_min : null;
        const prMax = typeof p.age_max === 'number' ? p.age_max : null;
        if (prMin === null && prMax === null) return true;
        const minA = paramMin !== null ? paramMin : prMin;
        const maxA = paramMax !== null ? paramMax : prMax;
        if (minA === null || maxA === null) return true;
        const prMinEff = prMin !== null ? prMin : minA;
        const prMaxEff = prMax !== null ? prMax : maxA;
        return prMinEff <= maxA && prMaxEff >= minA;
      });
    }

    const dir = sort_direction === 'desc' ? -1 : 1;
    if (sort_by === 'start_date') {
      results.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return (da - db) * dir;
      });
    } else if (sort_by === 'level') {
      const order = ['beginner', 'intermediate', 'advanced', 'mixed'];
      results.sort((a, b) => {
        const ia = order.indexOf(a.level);
        const ib = order.indexOf(b.level);
        return (ia - ib) * dir;
      });
    } else if (sort_by === 'title') {
      results.sort((a, b) => {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1 * dir;
        if (ta > tb) return 1 * dir;
        return 0;
      });
    }

    return results;
  }

  // 20. getProgramDetails
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find(p => p.id === programId) || null;
    return program;
  }

  // 21. startProgramRegistration
  startProgramRegistration(programId) {
    const programs = this._getFromStorage('programs', []);
    const program_registrations = this._getFromStorage('program_registrations', []);

    const program = programs.find(p => p.id === programId) || null;

    // Try to reuse existing draft/ in_review registration for this program
    let reg = program_registrations.find(r => r.program_id === programId && (r.status === 'draft' || r.status === 'in_review')) || null;

    if (!reg) {
      reg = {
        id: this._generateId('program_registration'),
        program_id: programId,
        program_type: program ? program.program_type : 'adult_course',
        status: 'draft',
        created_at: this._nowIso(),
        updated_at: null,
        participant_first_name: '',
        participant_last_name: '',
        participant_age: null,
        participant_email: '',
        is_minor: null,
        guardian_name: '',
        guardian_email: '',
        requires_accommodation: false,
        selected_accommodation_id: null,
        accommodation_max_price_per_week: null,
        summary_notes: ''
      };
      program_registrations.push(reg);
      this._saveToStorage('program_registrations', program_registrations);
    }

    localStorage.setItem('current_program_registration_id', reg.id);

    return { program_registration: reg, program };
  }

  // 22. updateProgramRegistrationParticipantDetails
  updateProgramRegistrationParticipantDetails(
    participant_first_name,
    participant_last_name,
    participant_email,
    participant_age
  ) {
    const registrations = this._getFromStorage('program_registrations', []);
    const reg = this._getCurrentProgramRegistration();
    if (!reg) return null;

    reg.participant_first_name = participant_first_name;
    reg.participant_last_name = participant_last_name;
    if (typeof participant_email === 'string') reg.participant_email = participant_email;
    if (typeof participant_age === 'number') reg.participant_age = participant_age;

    if (typeof reg.participant_age === 'number') {
      reg.is_minor = reg.participant_age < 18;
    }

    reg.updated_at = this._nowIso();

    const idx = registrations.findIndex(r => r.id === reg.id);
    if (idx !== -1) {
      registrations[idx] = reg;
      this._saveToStorage('program_registrations', registrations);
    }

    return reg;
  }

  // 23. updateProgramRegistrationGuardianDetails
  updateProgramRegistrationGuardianDetails(guardian_name, guardian_email) {
    const registrations = this._getFromStorage('program_registrations', []);
    const reg = this._getCurrentProgramRegistration();
    if (!reg) return null;

    reg.guardian_name = guardian_name;
    reg.guardian_email = guardian_email;
    reg.is_minor = true;
    reg.updated_at = this._nowIso();

    const idx = registrations.findIndex(r => r.id === reg.id);
    if (idx !== -1) {
      registrations[idx] = reg;
      this._saveToStorage('program_registrations', registrations);
    }

    return reg;
  }

  // 24. searchAccommodationOptions
  searchAccommodationOptions(week, max_price_per_week, currency, sort_by, sort_direction) {
    const options = this._getFromStorage('accommodation_options', []);

    let results = options.filter(o => o.is_available !== false && o.currency === currency);

    if (week) {
      results = results.filter(o => {
        if (!Array.isArray(o.week_availability) || o.week_availability.length === 0) return true;
        return o.week_availability.indexOf(week) !== -1;
      });
    }

    if (typeof max_price_per_week === 'number') {
      results = results.filter(o => o.weekly_price <= max_price_per_week);
    }

    const dir = sort_direction === 'desc' ? -1 : 1;
    if (sort_by === 'name') {
      results.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1 * dir;
        if (na > nb) return 1 * dir;
        return 0;
      });
    } else { // default price
      results.sort((a, b) => (a.weekly_price - b.weekly_price) * dir);
    }

    return results;
  }

  // 25. selectAccommodationForCurrentRegistration
  selectAccommodationForCurrentRegistration(accommodationOptionId, max_price_per_week) {
    const registrations = this._getFromStorage('program_registrations', []);
    const options = this._getFromStorage('accommodation_options', []);
    const reg = this._getCurrentProgramRegistration();
    if (!reg) return { program_registration: null, selected_accommodation: null };

    const option = options.find(o => o.id === accommodationOptionId) || null;

    reg.selected_accommodation_id = accommodationOptionId;
    reg.requires_accommodation = true;
    if (typeof max_price_per_week === 'number') {
      reg.accommodation_max_price_per_week = max_price_per_week;
    }
    reg.updated_at = this._nowIso();

    const idx = registrations.findIndex(r => r.id === reg.id);
    if (idx !== -1) {
      registrations[idx] = reg;
      this._saveToStorage('program_registrations', registrations);
    }

    return {
      program_registration: reg,
      selected_accommodation: option
    };
  }

  // 26. getProgramRegistrationSummary
  getProgramRegistrationSummary() {
    const reg = this._getCurrentProgramRegistration();
    if (!reg) return { program_registration: null, program: null, selected_accommodation: null };

    const programs = this._getFromStorage('programs', []);
    const options = this._getFromStorage('accommodation_options', []);

    const program = programs.find(p => p.id === reg.program_id) || null;
    const selected_accommodation = reg.selected_accommodation_id
      ? options.find(o => o.id === reg.selected_accommodation_id) || null
      : null;

    return { program_registration: reg, program, selected_accommodation };
  }

  // 27. getPassFilterOptions
  getPassFilterOptions() {
    const pass_type_options = [
      { value: 'festival_pass', label: 'Festival pass' },
      { value: 'day_pass', label: 'Day pass' },
      { value: 'workshop_pass', label: 'Workshop pass' },
      { value: 'other_pass', label: 'Other pass' }
    ];

    const eligibility_options = [
      { value: 'student', label: 'Student' },
      { value: 'adult', label: 'Adult' },
      { value: 'senior', label: 'Senior' },
      { value: 'all_ages', label: 'All ages' }
    ];

    return { pass_type_options, eligibility_options };
  }

  // 28. searchProducts
  searchProducts(
    product_type,
    pass_type,
    eligibility,
    category,
    subcategory,
    min_price,
    max_price,
    min_rating,
    available_size,
    sort_by,
    sort_direction
  ) {
    const products = this._getFromStorage('products', []);
    let results = products.filter(p => p.is_active !== false);

    if (product_type) {
      results = results.filter(p => p.product_type === product_type);
    }

    if (pass_type) {
      results = results.filter(p => p.pass_type === pass_type);
    }

    if (eligibility) {
      results = results.filter(p => p.eligibility === eligibility);
    }

    if (category) {
      results = results.filter(p => p.category === category);
    }

    if (subcategory) {
      results = results.filter(p => p.subcategory === subcategory);
    }

    if (typeof min_price === 'number') {
      results = results.filter(p => p.price >= min_price);
    }

    if (typeof max_price === 'number') {
      results = results.filter(p => p.price <= max_price);
    }

    if (typeof min_rating === 'number') {
      results = results.filter(p => typeof p.rating === 'number' && p.rating >= min_rating);
    }

    if (available_size) {
      results = results.filter(p => Array.isArray(p.available_sizes) && p.available_sizes.indexOf(available_size) !== -1);
    }

    const dir = sort_direction === 'desc' ? -1 : 1;
    if (sort_by === 'price') {
      results.sort((a, b) => (a.price - b.price) * dir);
    } else if (sort_by === 'rating') {
      results.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return (ra - rb) * dir;
      });
    } else if (sort_by === 'name') {
      results.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1 * dir;
        if (na > nb) return 1 * dir;
        return 0;
      });
    }

    return results;
  }

  // 29. getProductFilterOptions
  getProductFilterOptions(product_type) {
    const allProducts = this._getFromStorage('products', []);
    const products = product_type
      ? allProducts.filter(p => p.product_type === product_type)
      : allProducts;

    const categorySet = new Set();
    const subcategoryMap = {};
    const sizeSet = new Set();
    const prices = [];

    products.forEach(p => {
      if (p.category) categorySet.add(p.category);
      if (p.category && p.subcategory) {
        if (!subcategoryMap[p.category]) subcategoryMap[p.category] = new Set();
        subcategoryMap[p.category].add(p.subcategory);
      }
      if (Array.isArray(p.available_sizes)) {
        p.available_sizes.forEach(s => sizeSet.add(s));
      }
      if (typeof p.price === 'number') prices.push(p.price);
    });

    const category_options = Array.from(categorySet).map(c => ({ value: c, label: c }));

    const subcategory_options = [];
    Object.keys(subcategoryMap).forEach(cat => {
      Array.from(subcategoryMap[cat]).forEach(sub => {
        subcategory_options.push({ category: cat, value: sub, label: sub });
      });
    });

    const size_options = Array.from(sizeSet);

    const rating_options = [
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.0, label: '4 stars & up' },
      { min_rating: 3.0, label: '3 stars & up' }
    ];

    let price_suggestions = [];
    if (prices.length > 0) {
      const maxP = Math.max.apply(null, prices);
      price_suggestions = [
        { max_price: 25, label: 'Up to 25' },
        { max_price: 50, label: 'Up to 50' },
        { max_price: maxP, label: 'Up to max price' }
      ];
    }

    return {
      category_options,
      subcategory_options,
      size_options,
      rating_options,
      price_suggestions
    };
  }

  // 30. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    return products.find(p => p.id === productId) || null;
  }

  // 31. addProductToCart
  addProductToCart(productId, quantity, selected_size, selected_options) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    if (!product || product.is_active === false) {
      return {
        success: false,
        message: 'Product not available',
        cart: null,
        added_item: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const itemType = product.product_type === 'merchandise' ? 'merchandise' : 'pass';

    const newItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: itemType,
      event_id: null,
      event_ticket_type_id: null,
      product_id: product.id,
      quantity: qty,
      unit_price: product.price,
      currency: product.currency,
      line_total: product.price * qty,
      selected_size: selected_size || null,
      selected_options: Array.isArray(selected_options) ? selected_options : [],
      description: product.name
    };

    cartItems.push(newItem);

    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    cart.items.push(newItem.id);

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Product added to cart',
      cart,
      added_item: newItem
    };
  }

  // 32. getWorkshopRecommendationsForPass
  getWorkshopRecommendationsForPass(productId) {
    const events = this._getFromStorage('events', []);
    // Simple heuristic: all workshops
    const workshops = events.filter(e => e.event_type === 'workshop');
    return workshops;
  }

  // 33. getRelatedProducts
  getRelatedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const base = products.find(p => p.id === productId) || null;
    if (!base) return [];

    const related = products.filter(p => {
      if (p.id === base.id) return false;
      if (base.product_type === 'merchandise') {
        return p.product_type === 'merchandise' && p.category === base.category;
      }
      if (base.product_type === 'festival_pass' || base.product_type === 'day_pass') {
        return p.product_type === base.product_type && p.pass_type === base.pass_type;
      }
      return p.product_type === base.product_type;
    });

    return related;
  }

  // 34. getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const events = this._getFromStorage('events', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    // Ensure totals are up to date
    this._recalculateCartTotals(cart);

    const items = itemsForCart.map(cart_item => {
      const event = cart_item.event_id
        ? (events.find(e => e.id === cart_item.event_id) || null)
        : null;
      const product = cart_item.product_id
        ? (products.find(p => p.id === cart_item.product_id) || null)
        : null;
      return { cart_item, event, product };
    });

    const totals = {
      subtotal: cart.subtotal || 0,
      currency: cart.currency || 'usd',
      item_count: itemsForCart.reduce((sum, i) => sum + (i.quantity || 0), 0)
    };

    return { cart, items, totals };
  }

  // 35. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    if (!item) {
      return { success: false, cart: null, updated_item: null };
    }

    const cart = this._getOrCreateCart();

    if (quantity <= 0) {
      // Remove item
      const idx = cartItems.findIndex(ci => ci.id === cartItemId);
      if (idx !== -1) {
        cartItems.splice(idx, 1);
      }
      if (Array.isArray(cart.items)) {
        const idIdx = cart.items.indexOf(cartItemId);
        if (idIdx !== -1) cart.items.splice(idIdx, 1);
      }

      this._saveToStorage('cart_items', cartItems);
      const carts = this._getFromStorage('cart', []);
      const cIdx = carts.findIndex(c => c.id === cart.id);
      if (cIdx !== -1) {
        carts[cIdx] = cart;
        this._saveToStorage('cart', carts);
      }

      this._recalculateCartTotals(cart);

      return { success: true, cart, updated_item: null };
    }

    item.quantity = quantity;
    item.line_total = item.unit_price * quantity;

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const idxCart = carts.findIndex(c => c.id === cart.id);
    if (idxCart !== -1) {
      carts[idxCart] = cart;
      this._saveToStorage('cart', carts);
    }

    this._recalculateCartTotals(cart);

    return { success: true, cart, updated_item: item };
  }

  // 36. removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemIdx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIdx === -1) {
      return { success: false, cart: null };
    }

    const item = cartItems[itemIdx];
    cartItems.splice(itemIdx, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    if (Array.isArray(cart.items)) {
      const idIdx = cart.items.indexOf(cartItemId);
      if (idIdx !== -1) cart.items.splice(idIdx, 1);
    }

    const carts = this._getFromStorage('cart', []);
    const idxCart = carts.findIndex(c => c.id === cart.id);
    if (idxCart !== -1) {
      carts[idxCart] = cart;
      this._saveToStorage('cart', carts);
    }

    this._recalculateCartTotals(cart);

    return { success: true, cart };
  }

  // 37. clearCart
  clearCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const remaining = cartItems.filter(ci => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remaining);

    cart.items = [];
    cart.subtotal = 0;
    cart.updated_at = this._nowIso();

    const carts = this._getFromStorage('cart', []);
    const idxCart = carts.findIndex(c => c.id === cart.id);
    if (idxCart !== -1) {
      carts[idxCart] = cart;
      this._saveToStorage('cart', carts);
    }

    return { success: true };
  }

  // 38. previewDonationOptions
  previewDonationOptions(amount, currency) {
    const amt = Number(amount) || 0;
    const cur = currency || 'usd';

    const frequencies = ['one_time', 'monthly'];

    const options = frequencies.map(freq => {
      const fee = this._calculateDonationProcessingFee(amt, cur, freq);
      return {
        frequency: freq,
        processing_fee: fee,
        total_with_fee: Math.round((amt + fee) * 100) / 100,
        label: freq === 'one_time' ? 'One-time' : 'Monthly'
      };
    });

    return { amount: amt, currency: cur, options };
  }

  // 39. createOrUpdateDonationIntent
  createOrUpdateDonationIntent(
    amount,
    currency,
    frequency,
    processing_fee,
    donor_full_name,
    donor_email,
    recognition_name,
    support_area
  ) {
    const donations = this._getFromStorage('donations', []);
    const amt = Number(amount) || 0;
    const cur = currency || 'usd';
    const freq = frequency || 'one_time';

    let don = null;
    const currentId = localStorage.getItem('current_donation_id');
    if (currentId) {
      don = donations.find(d => d.id === currentId) || null;
    }

    const fee = typeof processing_fee === 'number'
      ? processing_fee
      : this._calculateDonationProcessingFee(amt, cur, freq);

    if (!don) {
      don = {
        id: this._generateId('donation'),
        amount: amt,
        currency: cur,
        frequency: freq,
        processing_fee: fee,
        donor_full_name,
        donor_email,
        recognition_name: recognition_name || '',
        support_area: support_area || null,
        created_at: this._nowIso(),
        status: 'review'
      };
      donations.push(don);
    } else {
      don.amount = amt;
      don.currency = cur;
      don.frequency = freq;
      don.processing_fee = fee;
      don.donor_full_name = donor_full_name;
      don.donor_email = donor_email;
      don.recognition_name = recognition_name || '';
      don.support_area = support_area || null;
      don.status = 'review';
    }

    this._saveToStorage('donations', donations);
    localStorage.setItem('current_donation_id', don.id);

    return don;
  }

  // 40. subscribeToNewsletter
  subscribeToNewsletter(
    full_name,
    email,
    audience_segment,
    email_frequency,
    interests,
    primary_instrument,
    location
  ) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      full_name,
      email,
      audience_segment,
      email_frequency,
      interests: Array.isArray(interests) ? interests : [],
      primary_instrument: primary_instrument || null,
      location: location || '',
      created_at: this._nowIso()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return subscription;
  }

  // 41. getAboutContent
  getAboutContent() {
    const content = this._getFromStorage('about_content', {
      festival_overview: '',
      history: '',
      artistic_mission: '',
      artistic_directors: [],
      faculty_highlights: [],
      partners_sponsors: []
    });
    return content;
  }

  // 42. getContactInformation
  getContactInformation() {
    const info = this._getFromStorage('contact_information', {
      email_addresses: [],
      phone_numbers: [],
      mailing_address: '',
      topics: []
    });
    return info;
  }

  // 43. submitContactForm
  submitContactForm(name, email, topic, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact_message'),
      name,
      email,
      topic,
      message,
      created_at: this._nowIso()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);
    return { success: true, message_id: msg.id };
  }

  // 44. getFaqEntries
  getFaqEntries(category) {
    const faqs = this._getFromStorage('faq_entries', []);
    if (!category) return faqs;
    return faqs.filter(f => f.category === category);
  }

  // 45. getSummerSchoolOverviewContent
  getSummerSchoolOverviewContent() {
    const content = this._getFromStorage('summer_school_overview_content', {
      overview: '',
      adult_courses_section: '',
      youth_programs_section: ''
    });
    return content;
  }

  // 46. getTicketsOverviewContent
  getTicketsOverviewContent() {
    const content = this._getFromStorage('tickets_overview_content', {
      ticketing_policies: '',
      concessions_info: '',
      passes_explainer: ''
    });
    return content;
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
