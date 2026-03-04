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

  // ---------------------- Storage Helpers ----------------------

  _ensureStorageKey(key, defaultValue) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  }

  _initStorage() {
    // Entity tables
    this._ensureStorageKey('venues', []);
    this._ensureStorageKey('teams', []);
    this._ensureStorageKey('events', []);
    this._ensureStorageKey('event_ticket_options', []);
    this._ensureStorageKey('classes', []);
    this._ensureStorageKey('class_enrollments', []);
    this._ensureStorageKey('youth_camps', []);
    this._ensureStorageKey('youth_camp_registrations', []);
    this._ensureStorageKey('passes', []);
    this._ensureStorageKey('gift_card_templates', []);
    this._ensureStorageKey('gift_card_designs', []);
    this._ensureStorageKey('gift_cards', []);
    this._ensureStorageKey('corporate_inquiries', []);
    this._ensureStorageKey('cart_items', []);
    // Single cart object (or null)
    this._ensureStorageKey('cart', null);

    // Content / config tables used by interfaces
    this._ensureStorageKey('homepage_promotions', []);
    this._ensureStorageKey('corporate_workshops_overview', {
      heroTitle: '',
      heroSubtitle: '',
      description: '',
      sampleFormats: [],
      outcomes: [],
      pricingGuidelines: ''
    });
    this._ensureStorageKey('about_page_content', {
      mission: '',
      history: '',
      values: [],
      keyPeople: []
    });
    this._ensureStorageKey('contact_info', {
      boxOfficePhone: '',
      boxOfficeHours: '',
      educationEmail: '',
      corporateEventsEmail: '',
      generalEmail: ''
    });
    this._ensureStorageKey('faq_entries', []);
    this._ensureStorageKey('contact_forms', []);

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) {
        return defaultValue !== undefined ? defaultValue : [];
      }
      return parsed;
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------------------- Cart Helpers ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object') {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem IDs
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        subtotal: 0,
        totalQuantity: 0
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const relevantItems = cartItems.filter(function (ci) {
      return ci.cart_id === cart.id && cart.items.indexOf(ci.id) !== -1;
    });
    let subtotal = 0;
    let totalQuantity = 0;
    for (let i = 0; i < relevantItems.length; i++) {
      subtotal += Number(relevantItems[i].total_price || 0);
      totalQuantity += Number(relevantItems[i].quantity || 0);
    }
    cart.subtotal = subtotal;
    cart.totalQuantity = totalQuantity;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    return { subtotal: subtotal, totalQuantity: totalQuantity };
  }

  _addCartItem(cart, payload) {
    // payload: { item_type, event_id?, ticket_option_id?, class_id?, class_enrollment_id?, youth_camp_id?, youth_camp_registration_id?, pass_id?, gift_card_id?, quantity, unit_price, display_title, display_date }
    let cartItems = this._getFromStorage('cart_items', []);
    const id = this._generateId('cartItem');
    const quantity = Number(payload.quantity || 1);
    const unitPrice = Number(payload.unit_price || 0);
    const totalPrice = unitPrice * quantity;
    const nowIso = this._nowIso();

    const newItem = {
      id: id,
      cart_id: cart.id,
      item_type: payload.item_type,
      event_id: payload.event_id || null,
      ticket_option_id: payload.ticket_option_id || null,
      class_id: payload.class_id || null,
      class_enrollment_id: payload.class_enrollment_id || null,
      youth_camp_id: payload.youth_camp_id || null,
      youth_camp_registration_id: payload.youth_camp_registration_id || null,
      pass_id: payload.pass_id || null,
      gift_card_id: payload.gift_card_id || null,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      display_title: payload.display_title || '',
      display_date: payload.display_date || null,
      display_subtitle: payload.display_subtitle || '',
      added_at: nowIso
    };

    cartItems.push(newItem);
    if (cart.items.indexOf(id) === -1) {
      cart.items.push(id);
    }
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart, cartItems);

    return { cartItem: newItem, cartTotals: totals };
  }

  // ---------------------- Utility Helpers ----------------------

  _getDatePart(isoString) {
    if (!isoString) return null;
    return String(isoString).slice(0, 10); // 'YYYY-MM-DD'
  }

  _getTimePart(isoString) {
    if (!isoString) return null;
    // Expect ISO or 'YYYY-MM-DDTHH:MM:SSZ'
    const match = String(isoString).match(/T(\d{2}:\d{2})/);
    return match ? match[1] : null; // 'HH:MM'
  }

  _compareTime(a, b) {
    // a, b: 'HH:MM'
    if (!a || !b) return 0;
    return a.localeCompare(b);
  }

  _monthFromDate(isoString) {
    if (!isoString) return null;
    return String(isoString).slice(0, 7); // 'YYYY-MM'
  }

  _filterEventsByPrice(events, priceMin, priceMax, ticketOptionsByEventId) {
    if (priceMin == null && priceMax == null) return events;
    const result = [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      let minPrice = typeof ev.base_min_price === 'number' ? ev.base_min_price : null;
      let maxPrice = typeof ev.base_max_price === 'number' ? ev.base_max_price : null;
      if ((minPrice == null || maxPrice == null) && ticketOptionsByEventId) {
        const opts = ticketOptionsByEventId[ev.id] || [];
        for (let j = 0; j < opts.length; j++) {
          const p = Number(opts[j].price || 0);
          if (minPrice == null || p < minPrice) minPrice = p;
          if (maxPrice == null || p > maxPrice) maxPrice = p;
        }
      }
      if (minPrice == null && maxPrice == null) {
        continue; // cannot evaluate price filters
      }
      const minOk = priceMin == null ? true : maxPrice >= priceMin;
      const maxOk = priceMax == null ? true : minPrice <= priceMax;
      if (minOk && maxOk) {
        result.push(ev);
      }
    }
    return result;
  }

  _getTicketOptionsByEventId() {
    const ticketOptions = this._getFromStorage('event_ticket_options', []);
    const map = {};
    for (let i = 0; i < ticketOptions.length; i++) {
      const opt = ticketOptions[i];
      if (!map[opt.event_id]) map[opt.event_id] = [];
      map[opt.event_id].push(opt);
    }
    return map;
  }

  _resolveForeignKey(object, fieldName, collectionName) {
    // Generic resolver for fields using snake_case *_id
    if (!object || !fieldName || !collectionName) return null;
    const id = object[fieldName];
    if (!id) return null;
    const collection = this._getFromStorage(collectionName, []);
    for (let i = 0; i < collection.length; i++) {
      if (collection[i].id === id) return collection[i];
    }
    return null;
  }

  // ---------------------- Homepage Highlights ----------------------

  getHomepageHighlights() {
    const events = this._getFromStorage('events', []);
    const classes = this._getFromStorage('classes', []);
    const youthCamps = this._getFromStorage('youth_camps', []);
    const passes = this._getFromStorage('passes', []);
    const venues = this._getFromStorage('venues', []);
    const promotions = this._getFromStorage('homepage_promotions', []);

    const venueById = {};
    for (let i = 0; i < venues.length; i++) {
      venueById[venues[i].id] = venues[i];
    }

    const featuredEvents = events
      .filter(function (e) { return e.is_active && e.is_featured; })
      .map(function (e) {
        return Object.assign({}, e, {
          venue: venueById[e.venue_id] || null
        });
      });

    const featuredClasses = classes
      .filter(function (c) { return c.is_active; })
      .map(function (c) {
        return Object.assign({}, c, {
          venue: venueById[c.venue_id] || null
        });
      });

    const featuredYouthCamps = youthCamps
      .filter(function (c) { return c.is_active; })
      .map(function (c) {
        return Object.assign({}, c, {
          venue: venueById[c.venue_id] || null
        });
      });

    const featuredPasses = passes.filter(function (p) { return p.is_active; });

    return {
      featuredEvents: featuredEvents,
      featuredClasses: featuredClasses,
      featuredYouthCamps: featuredYouthCamps,
      featuredPasses: featuredPasses,
      promotions: promotions
    };
  }

  // ---------------------- Shows Listing & Details ----------------------

  getShowFilterOptions() {
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    const audienceSet = {};
    const eventTypeSet = {};
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.audience_type) audienceSet[e.audience_type] = true;
      if (e.event_type) eventTypeSet[e.event_type] = true;
    }

    const audienceTypes = Object.keys(audienceSet);
    const eventTypes = Object.keys(eventTypeSet);

    const venueOptions = venues.map(function (v) {
      return { id: v.id, name: v.name };
    });

    // Static presets for simplicity (UI-level, not domain data)
    const pricePresets = [
      { label: 'Under $25', maxPrice: 25 },
      { label: 'Under $50', maxPrice: 50 },
      { label: 'Under $100', maxPrice: 100 }
    ];

    const timeRangePresets = [
      { label: 'Afternoon (12-5pm)', startTimeFrom: '12:00', startTimeTo: '17:00' },
      { label: 'Evening (5-10pm)', startTimeFrom: '17:00', startTimeTo: '22:00' }
    ];

    return {
      audienceTypes: audienceTypes,
      eventTypes: eventTypes,
      venues: venueOptions,
      pricePresets: pricePresets,
      timeRangePresets: timeRangePresets
    };
  }

  listShows(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'start_time_earliest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    const eventsAll = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const ticketOptionsByEventId = this._getTicketOptionsByEventId();

    let events = eventsAll.filter(function (e) {
      return e.is_active && (e.event_type === 'show' || e.event_type === 'special_event');
    });

    if (filters.date) {
      events = events.filter((e) => this._getDatePart(e.start_datetime) === filters.date);
    }
    if (filters.startTimeFrom) {
      events = events.filter((e) => {
        const t = this._getTimePart(e.start_datetime) || '00:00';
        return this._compareTime(t, filters.startTimeFrom) >= 0;
      });
    }
    if (filters.startTimeTo) {
      events = events.filter((e) => {
        const t = this._getTimePart(e.start_datetime) || '23:59';
        return this._compareTime(t, filters.startTimeTo) <= 0;
      });
    }
    if (filters.audienceTypes && filters.audienceTypes.length) {
      const set = {};
      for (let i = 0; i < filters.audienceTypes.length; i++) set[filters.audienceTypes[i]] = true;
      events = events.filter(function (e) { return !!set[e.audience_type]; });
    }
    if (filters.eventTypes && filters.eventTypes.length) {
      const etSet = {};
      for (let i = 0; i < filters.eventTypes.length; i++) etSet[filters.eventTypes[i]] = true;
      events = events.filter(function (e) { return !!etSet[e.event_type]; });
    }
    if (filters.venueId) {
      events = events.filter(function (e) { return e.venue_id === filters.venueId; });
    }
    if (filters.houseTeamId) {
      events = events.filter(function (e) { return e.house_team_id === filters.houseTeamId; });
    }

    events = this._filterEventsByPrice(events, filters.priceMin, filters.priceMax, ticketOptionsByEventId);

    const self = this;
    const items = events.map(function (e) {
      const ticketOpts = ticketOptionsByEventId[e.id] || [];
      let low = typeof e.base_min_price === 'number' ? e.base_min_price : null;
      let high = typeof e.base_max_price === 'number' ? e.base_max_price : null;
      for (let i = 0; i < ticketOpts.length; i++) {
        const p = Number(ticketOpts[i].price || 0);
        if (low == null || p < low) low = p;
        if (high == null || p > high) high = p;
      }
      const venue = venues.find(function (v) { return v.id === e.venue_id; }) || null;
      return {
        event: e,
        venue: venue,
        lowestTicketPrice: low != null ? low : 0,
        highestTicketPrice: high != null ? high : 0
      };
    });

    // Sorting
    if (sort === 'price_low_to_high') {
      items.sort(function (a, b) { return a.lowestTicketPrice - b.lowestTicketPrice; });
    } else if (sort === 'price_high_to_low') {
      items.sort(function (a, b) { return b.highestTicketPrice - a.highestTicketPrice; });
    } else {
      // default start_time_earliest_first
      items.sort(function (a, b) {
        const da = new Date(a.event.start_datetime || 0).getTime();
        const db = new Date(b.event.start_datetime || 0).getTime();
        return da - db;
      });
    }

    const totalResults = items.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return {
      items: pagedItems,
      page: page,
      totalPages: totalPages,
      totalResults: totalResults
    };
  }

  getEventCalendarOverview(month, venueId) {
    const events = this._getFromStorage('events', []);
    const resultByDate = {};

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.is_active) continue;
      if (this._monthFromDate(e.start_datetime) !== month) continue;
      if (venueId && e.venue_id !== venueId) continue;
      const date = this._getDatePart(e.start_datetime);
      if (!date) continue;
      if (!resultByDate[date]) {
        resultByDate[date] = {
          date: date,
          totalEvents: 0,
          showCount: 0,
          workshopCount: 0,
          specialEventCount: 0
        };
      }
      const entry = resultByDate[date];
      entry.totalEvents += 1;
      if (e.event_type === 'show') entry.showCount += 1;
      else if (e.event_type === 'workshop' || e.event_type === 'intro_workshop') entry.workshopCount += 1;
      else if (e.event_type === 'special_event') entry.specialEventCount += 1;
    }

    const days = Object.keys(resultByDate).sort().map(function (d) { return resultByDate[d]; });
    return { month: month, days: days };
  }

  getEventsByDate(date, filters) {
    filters = filters || {};
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const ticketOptionsByEventId = this._getTicketOptionsByEventId();

    const eventTypeFilterSet = {};
    if (filters.eventTypes && filters.eventTypes.length) {
      for (let i = 0; i < filters.eventTypes.length; i++) {
        eventTypeFilterSet[filters.eventTypes[i]] = true;
      }
    }

    const items = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.is_active) continue;
      if (this._getDatePart(e.start_datetime) !== date) continue;
      if (filters.venueId && e.venue_id !== filters.venueId) continue;
      if (filters.eventTypes && filters.eventTypes.length && !eventTypeFilterSet[e.event_type]) continue;

      const ticketOpts = ticketOptionsByEventId[e.id] || [];
      let low = typeof e.base_min_price === 'number' ? e.base_min_price : null;
      let high = typeof e.base_max_price === 'number' ? e.base_max_price : null;
      for (let j = 0; j < ticketOpts.length; j++) {
        const p = Number(ticketOpts[j].price || 0);
        if (low == null || p < low) low = p;
        if (high == null || p > high) high = p;
      }

      const venue = venues.find(function (v) { return v.id === e.venue_id; }) || null;
      items.push({
        event: e,
        venue: venue,
        lowestTicketPrice: low != null ? low : 0,
        highestTicketPrice: high != null ? high : 0
      });
    }

    // Sort by start time
    items.sort(function (a, b) {
      const da = new Date(a.event.start_datetime || 0).getTime();
      const db = new Date(b.event.start_datetime || 0).getTime();
      return da - db;
    });

    return items;
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const teams = this._getFromStorage('teams', []);
    const ticketOptions = this._getFromStorage('event_ticket_options', []);

    const event = events.find(function (e) { return e.id === eventId; }) || null;
    if (!event) {
      return {
        event: null,
        venue: null,
        houseTeam: null,
        ticketOptions: []
      };
    }

    const venue = venues.find(function (v) { return v.id === event.venue_id; }) || null;
    const houseTeam = event.house_team_id ? (teams.find(function (t) { return t.id === event.house_team_id; }) || null) : null;

    let eventTicketOptionsRaw = ticketOptions
      .filter(function (t) { return t.event_id === eventId; });

    // If no explicit ticket options exist for this event, create a default GA option
    if (eventTicketOptionsRaw.length === 0) {
      const defaultPrice = typeof event.base_min_price === 'number' ? event.base_min_price : 0;
      const defaultOption = {
        id: this._generateId('eventTicket'),
        event_id: eventId,
        name: 'General Admission',
        ticket_type: 'general_admission',
        price: defaultPrice,
        capacity: null,
        is_available: true,
        sort_order: 1
      };
      ticketOptions.push(defaultOption);
      this._saveToStorage('event_ticket_options', ticketOptions);
      eventTicketOptionsRaw = [defaultOption];
    }

    const eventTicketOptions = eventTicketOptionsRaw
      .map(function (t) {
        // Foreign key resolution for event_id
        return Object.assign({}, t, { event: event });
      });

    return {
      event: event,
      venue: venue,
      houseTeam: houseTeam,
      ticketOptions: eventTicketOptions
    };
  }

  addEventTicketsToCart(eventId, ticketOptionId, quantity) {
    quantity = quantity == null ? 1 : Number(quantity);
    if (!(quantity > 0)) {
      return { success: false, message: 'Invalid quantity', cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const events = this._getFromStorage('events', []);
    const ticketOptions = this._getFromStorage('event_ticket_options', []);

    const event = events.find(function (e) { return e.id === eventId; }) || null;
    if (!event || !event.is_active) {
      return { success: false, message: 'Event not found or inactive', cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const ticketOption = ticketOptions.find(function (t) { return t.id === ticketOptionId && t.event_id === eventId; }) || null;
    if (!ticketOption || !ticketOption.is_available) {
      return { success: false, message: 'Ticket option not available', cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const cart = this._getOrCreateCart();
    const payload = {
      item_type: 'event_ticket',
      event_id: eventId,
      ticket_option_id: ticketOptionId,
      quantity: quantity,
      unit_price: ticketOption.price,
      display_title: event.title,
      display_date: event.start_datetime,
      display_subtitle: ticketOption.name
    };

    const res = this._addCartItem(cart, payload);
    return {
      success: true,
      message: 'Tickets added to cart',
      cartItem: res.cartItem,
      cartTotals: res.cartTotals
    };
  }

  // ---------------------- Classes Listing & Enrollment ----------------------

  getClassFilterOptions() {
    const classes = this._getFromStorage('classes', []);
    const venues = this._getFromStorage('venues', []);

    const levelSet = {};
    const durationSet = {};
    const daySet = {};

    for (let i = 0; i < classes.length; i++) {
      const c = classes[i];
      if (c.level) levelSet[c.level] = true;
      if (typeof c.duration_weeks === 'number') durationSet[c.duration_weeks] = true;
      if (Array.isArray(c.days_of_week)) {
        for (let j = 0; j < c.days_of_week.length; j++) {
          daySet[c.days_of_week[j]] = true;
        }
      }
    }

    const levels = Object.keys(levelSet);
    const durationsWeeks = Object.keys(durationSet).map(function (d) { return Number(d); }).sort(function (a, b) { return a - b; });
    const daysOfWeek = Object.keys(daySet);
    const venueOptions = venues.map(function (v) { return { id: v.id, name: v.name }; });

    return {
      levels: levels,
      durationsWeeks: durationsWeeks,
      daysOfWeek: daysOfWeek,
      venues: venueOptions
    };
  }

  listClasses(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'start_date_soonest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    const classesAll = this._getFromStorage('classes', []);
    const venues = this._getFromStorage('venues', []);

    let classes = classesAll.filter(function (c) { return c.is_active; });

    if (filters.levels && filters.levels.length) {
      const set = {};
      for (let i = 0; i < filters.levels.length; i++) set[filters.levels[i]] = true;
      classes = classes.filter(function (c) { return !!set[c.level]; });
    }
    if (typeof filters.durationWeeksExact === 'number') {
      classes = classes.filter(function (c) { return c.duration_weeks === filters.durationWeeksExact; });
    }
    if (typeof filters.priceMin === 'number') {
      classes = classes.filter(function (c) { return c.price >= filters.priceMin; });
    }
    if (typeof filters.priceMax === 'number') {
      classes = classes.filter(function (c) { return c.price <= filters.priceMax; });
    }
    if (filters.daysOfWeek && filters.daysOfWeek.length) {
      const daySet = {};
      for (let i = 0; i < filters.daysOfWeek.length; i++) daySet[filters.daysOfWeek[i]] = true;
      classes = classes.filter(function (c) {
        if (!Array.isArray(c.days_of_week)) return false;
        for (let j = 0; j < c.days_of_week.length; j++) {
          if (daySet[c.days_of_week[j]]) return true;
        }
        return false;
      });
    }
    if (filters.meetingStartTimeFrom) {
      classes = classes.filter((c) => this._compareTime(c.meeting_start_time, filters.meetingStartTimeFrom) >= 0);
    }
    if (filters.month) {
      classes = classes.filter((c) => this._monthFromDate(c.start_date) === filters.month);
    }
    if (filters.venueId) {
      classes = classes.filter(function (c) { return c.venue_id === filters.venueId; });
    }

    const items = classes.map(function (c) {
      const venue = venues.find(function (v) { return v.id === c.venue_id; }) || null;
      return { 'class': c, venue: venue };
    });

    if (sort === 'price_low_to_high') {
      items.sort(function (a, b) { return a['class'].price - b['class'].price; });
    } else if (sort === 'price_high_to_low') {
      items.sort(function (a, b) { return b['class'].price - a['class'].price; });
    } else if (sort === 'level') {
      const order = { beginner: 1, all_levels: 2, intermediate: 3, advanced: 4 };
      items.sort(function (a, b) {
        const la = order[a['class'].level] || 99;
        const lb = order[b['class'].level] || 99;
        return la - lb;
      });
    } else {
      // start_date_soonest_first
      items.sort(function (a, b) {
        const da = new Date(a['class'].start_date || 0).getTime();
        const db = new Date(b['class'].start_date || 0).getTime();
        return da - db;
      });
    }

    const totalResults = items.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return {
      items: pagedItems,
      page: page,
      totalPages: totalPages,
      totalResults: totalResults
    };
  }

  getClassDetails(classId) {
    const classes = this._getFromStorage('classes', []);
    const venues = this._getFromStorage('venues', []);
    const c = classes.find(function (cl) { return cl.id === classId; }) || null;
    if (!c) {
      return { 'class': null, venue: null };
    }
    const venue = venues.find(function (v) { return v.id === c.venue_id; }) || null;
    return { 'class': c, venue: venue };
  }

  enrollInClassAndAddToCart(classId, enrollment) {
    enrollment = enrollment || {};
    const classes = this._getFromStorage('classes', []);
    const classObj = classes.find(function (c) { return c.id === classId; }) || null;
    if (!classObj || !classObj.is_active) {
      return { success: false, message: 'Class not found or inactive', enrollment: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }
    if (!enrollment.firstName || !enrollment.lastName || !enrollment.email) {
      return { success: false, message: 'Missing enrollment details', enrollment: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const classEnrollments = this._getFromStorage('class_enrollments', []);
    const newEnrollment = {
      id: this._generateId('classEnroll'),
      class_id: classId,
      first_name: enrollment.firstName,
      last_name: enrollment.lastName,
      email: enrollment.email,
      experience_level: enrollment.experienceLevel || 'not_specified',
      status: 'in_cart',
      created_at: this._nowIso()
    };
    classEnrollments.push(newEnrollment);
    this._saveToStorage('class_enrollments', classEnrollments);

    const cart = this._getOrCreateCart();
    const payload = {
      item_type: 'class_enrollment',
      class_id: classId,
      class_enrollment_id: newEnrollment.id,
      quantity: 1,
      unit_price: classObj.price,
      display_title: classObj.title,
      display_date: classObj.start_date,
      display_subtitle: 'Class Enrollment'
    };

    const res = this._addCartItem(cart, payload);
    return {
      success: true,
      message: 'Class enrollment added to cart',
      enrollment: newEnrollment,
      cartItem: res.cartItem,
      cartTotals: res.cartTotals
    };
  }

  // ---------------------- Youth Camps Listing & Registration ----------------------

  getYouthCampFilterOptions() {
    const camps = this._getFromStorage('youth_camps', []);
    const venues = this._getFromStorage('venues', []);

    const ageSet = {};
    const monthSet = {};
    const durationSet = {};
    const timeSet = {};

    for (let i = 0; i < camps.length; i++) {
      const c = camps[i];
      if (c.age_group) ageSet[c.age_group] = true;
      const month = this._monthFromDate(c.start_date);
      if (month) monthSet[month] = true;
      if (typeof c.duration_weeks === 'number') durationSet[c.duration_weeks] = true;
      if (c.time_of_day_category) timeSet[c.time_of_day_category] = true;
    }

    const ageGroups = Object.keys(ageSet);
    const months = Object.keys(monthSet).sort();
    const durationsWeeks = Object.keys(durationSet).map(function (d) { return Number(d); }).sort(function (a, b) { return a - b; });
    const timeOfDayCategories = Object.keys(timeSet);
    const venueOptions = venues.map(function (v) { return { id: v.id, name: v.name }; });

    return {
      ageGroups: ageGroups,
      months: months,
      durationsWeeks: durationsWeeks,
      timeOfDayCategories: timeOfDayCategories,
      venues: venueOptions
    };
  }

  listYouthCamps(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'start_date_soonest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    const campsAll = this._getFromStorage('youth_camps', []);
    const venues = this._getFromStorage('venues', []);

    let camps = campsAll.filter(function (c) { return c.is_active; });

    if (filters.ageGroups && filters.ageGroups.length) {
      const set = {};
      for (let i = 0; i < filters.ageGroups.length; i++) set[filters.ageGroups[i]] = true;
      camps = camps.filter(function (c) { return !!set[c.age_group]; });
    }
    if (filters.month) {
      camps = camps.filter((c) => this._monthFromDate(c.start_date) === filters.month);
    }
    if (typeof filters.durationWeeksExact === 'number') {
      camps = camps.filter(function (c) { return c.duration_weeks === filters.durationWeeksExact; });
    }
    if (filters.timeOfDayCategory) {
      camps = camps.filter(function (c) { return c.time_of_day_category === filters.timeOfDayCategory; });
    }
    if (typeof filters.isWeekdaysOnly === 'boolean') {
      camps = camps.filter(function (c) { return !!c.is_weekdays_only === filters.isWeekdaysOnly; });
    }
    if (typeof filters.priceMin === 'number') {
      camps = camps.filter(function (c) { return c.price >= filters.priceMin; });
    }
    if (typeof filters.priceMax === 'number') {
      camps = camps.filter(function (c) { return c.price <= filters.priceMax; });
    }
    if (filters.venueId) {
      camps = camps.filter(function (c) { return c.venue_id === filters.venueId; });
    }

    const items = camps.map(function (c) {
      const venue = venues.find(function (v) { return v.id === c.venue_id; }) || null;
      return { camp: c, venue: venue };
    });

    if (sort === 'price_low_to_high') {
      items.sort(function (a, b) { return a.camp.price - b.camp.price; });
    } else if (sort === 'price_high_to_low') {
      items.sort(function (a, b) { return b.camp.price - a.camp.price; });
    } else {
      items.sort(function (a, b) {
        const da = new Date(a.camp.start_date || 0).getTime();
        const db = new Date(b.camp.start_date || 0).getTime();
        return da - db;
      });
    }

    const totalResults = items.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return {
      items: pagedItems,
      page: page,
      totalPages: totalPages,
      totalResults: totalResults
    };
  }

  getYouthCampDetails(youthCampId) {
    const camps = this._getFromStorage('youth_camps', []);
    const venues = this._getFromStorage('venues', []);
    const c = camps.find(function (camp) { return camp.id === youthCampId; }) || null;
    if (!c) {
      return { camp: null, venue: null };
    }
    const venue = venues.find(function (v) { return v.id === c.venue_id; }) || null;
    return { camp: c, venue: venue };
  }

  registerYouthCampAndAddToCart(youthCampId, registration) {
    registration = registration || {};
    const camps = this._getFromStorage('youth_camps', []);
    const camp = camps.find(function (c) { return c.id === youthCampId; }) || null;
    if (!camp || !camp.is_active) {
      return { success: false, message: 'Camp not found or inactive', registration: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    if (!registration.teenFirstName || !registration.teenLastName || typeof registration.teenAge !== 'number' || !registration.guardianEmail || !registration.guardianPhone || !registration.emergencyContactName || !registration.emergencyContactPhone) {
      return { success: false, message: 'Missing registration details', registration: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const regs = this._getFromStorage('youth_camp_registrations', []);
    const newReg = {
      id: this._generateId('youthCampReg'),
      youth_camp_id: youthCampId,
      teen_first_name: registration.teenFirstName,
      teen_last_name: registration.teenLastName,
      teen_age: registration.teenAge,
      guardian_email: registration.guardianEmail,
      guardian_phone: registration.guardianPhone,
      emergency_contact_name: registration.emergencyContactName,
      emergency_contact_phone: registration.emergencyContactPhone,
      status: 'in_cart',
      created_at: this._nowIso()
    };
    regs.push(newReg);
    this._saveToStorage('youth_camp_registrations', regs);

    const cart = this._getOrCreateCart();
    const payload = {
      item_type: 'youth_camp_registration',
      youth_camp_id: youthCampId,
      youth_camp_registration_id: newReg.id,
      quantity: 1,
      unit_price: camp.price,
      display_title: camp.title,
      display_date: camp.start_date,
      display_subtitle: 'Youth Camp Registration'
    };

    const res = this._addCartItem(cart, payload);
    return {
      success: true,
      message: 'Youth camp registration added to cart',
      registration: newReg,
      cartItem: res.cartItem,
      cartTotals: res.cartTotals
    };
  }

  // ---------------------- Passes & Memberships ----------------------

  getPassFilterOptions() {
    const passes = this._getFromStorage('passes', []);
    const passTypeSet = {};
    const dropInSet = {};

    for (let i = 0; i < passes.length; i++) {
      const p = passes[i];
      if (p.pass_type) passTypeSet[p.pass_type] = true;
      if (typeof p.included_drop_in_visits === 'number') dropInSet[p.included_drop_in_visits] = true;
    }

    const passTypes = Object.keys(passTypeSet);
    const includedDropInVisitOptions = Object.keys(dropInSet).map(function (v) { return Number(v); }).sort(function (a, b) { return a - b; });

    return {
      passTypes: passTypes,
      includedDropInVisitOptions: includedDropInVisitOptions
    };
  }

  listPasses(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'price_low_to_high';
    page = page || 1;
    pageSize = pageSize || 20;

    const passesAll = this._getFromStorage('passes', []);
    let passes = passesAll.filter(function (p) { return p.is_active; });

    if (filters.passTypes && filters.passTypes.length) {
      const set = {};
      for (let i = 0; i < filters.passTypes.length; i++) set[filters.passTypes[i]] = true;
      passes = passes.filter(function (p) { return !!set[p.pass_type]; });
    }
    if (typeof filters.minDropInVisits === 'number') {
      passes = passes.filter(function (p) { return typeof p.included_drop_in_visits === 'number' && p.included_drop_in_visits >= filters.minDropInVisits; });
    }
    if (typeof filters.priceMin === 'number') {
      passes = passes.filter(function (p) { return p.price >= filters.priceMin; });
    }
    if (typeof filters.priceMax === 'number') {
      passes = passes.filter(function (p) { return p.price <= filters.priceMax; });
    }

    if (sort === 'price_high_to_low') {
      passes.sort(function (a, b) { return b.price - a.price; });
    } else {
      passes.sort(function (a, b) { return a.price - b.price; });
    }

    const totalResults = passes.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = passes.slice(start, start + pageSize);

    return {
      items: pagedItems,
      page: page,
      totalPages: totalPages,
      totalResults: totalResults
    };
  }

  getPassDetails(passId) {
    const passes = this._getFromStorage('passes', []);
    const pass = passes.find(function (p) { return p.id === passId; }) || null;
    return pass;
  }

  addPassToCart(passId, quantity) {
    quantity = quantity == null ? 1 : Number(quantity);
    if (!(quantity > 0)) {
      return { success: false, message: 'Invalid quantity', cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }
    const passes = this._getFromStorage('passes', []);
    const pass = passes.find(function (p) { return p.id === passId; }) || null;
    if (!pass || !pass.is_active) {
      return { success: false, message: 'Pass not found or inactive', cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const cart = this._getOrCreateCart();
    const payload = {
      item_type: 'pass',
      pass_id: passId,
      quantity: quantity,
      unit_price: pass.price,
      display_title: pass.name,
      display_date: null,
      display_subtitle: 'Pass'
    };

    const res = this._addCartItem(cart, payload);
    return {
      success: true,
      message: 'Pass added to cart',
      cartItem: res.cartItem,
      cartTotals: res.cartTotals
    };
  }

  // ---------------------- House Teams & Performances ----------------------

  listHouseTeams(isHouseTeamOnly) {
    if (typeof isHouseTeamOnly !== 'boolean') isHouseTeamOnly = true;
    const teams = this._getFromStorage('teams', []);
    if (!isHouseTeamOnly) return teams;
    return teams.filter(function (t) { return !!t.is_house_team; });
  }

  getTeamDetailsAndPerformances(teamId, month) {
    const teams = this._getFromStorage('teams', []);
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    const team = teams.find(function (t) { return t.id === teamId; }) || null;
    if (!team) {
      return { team: null, upcomingPerformances: [] };
    }

    const now = new Date();
    const perfs = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.is_active) continue;
      if (e.house_team_id !== teamId) continue;
      if (month && this._monthFromDate(e.start_datetime) !== month) continue;
      const startTime = new Date(e.start_datetime || 0);
      if (startTime < now) continue; // upcoming only
      const venue = venues.find(function (v) { return v.id === e.venue_id; }) || null;
      perfs.push({ event: e, venue: venue });
    }

    perfs.sort(function (a, b) {
      const da = new Date(a.event.start_datetime || 0).getTime();
      const db = new Date(b.event.start_datetime || 0).getTime();
      return da - db;
    });

    return { team: team, upcomingPerformances: perfs };
  }

  // ---------------------- Gift Cards ----------------------

  listGiftCardTemplates() {
    const templates = this._getFromStorage('gift_card_templates', []);
    return templates.filter(function (t) { return t.is_active; });
  }

  getGiftCardTemplateDetails(giftCardTemplateId) {
    const templates = this._getFromStorage('gift_card_templates', []);
    const designs = this._getFromStorage('gift_card_designs', []);

    const template = templates.find(function (t) { return t.id === giftCardTemplateId; }) || null;
    const availableDesigns = designs.filter(function (d) { return d.is_active; });

    return { template: template, availableDesigns: availableDesigns };
  }

  createGiftCardAndAddToCart(giftCardTemplateId, amount, designId, recipientName, recipientEmail, senderName, message, quantity) {
    quantity = quantity == null ? 1 : Number(quantity);
    amount = Number(amount);
    if (!(quantity > 0) || !(amount > 0)) {
      return { success: false, message: 'Invalid amount or quantity', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const templates = this._getFromStorage('gift_card_templates', []);
    const designs = this._getFromStorage('gift_card_designs', []);

    const template = templates.find(function (t) { return t.id === giftCardTemplateId; }) || null;
    if (!template || !template.is_active) {
      return { success: false, message: 'Gift card template not found or inactive', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const design = designs.find(function (d) { return d.id === designId && d.is_active; }) || null;
    if (!design) {
      return { success: false, message: 'Gift card design not found or inactive', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    // Validate amount against template rules
    if (template.allowed_fixed_amounts && template.allowed_fixed_amounts.length) {
      if (template.allowed_fixed_amounts.indexOf(amount) === -1) {
        return { success: false, message: 'Amount not allowed for this gift card', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
      }
    } else {
      if (typeof template.min_amount === 'number' && amount < template.min_amount) {
        return { success: false, message: 'Amount below minimum', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
      }
      if (typeof template.max_amount === 'number' && amount > template.max_amount) {
        return { success: false, message: 'Amount above maximum', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
      }
    }

    if (!recipientName || !senderName) {
      return { success: false, message: 'Missing recipient or sender name', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }
    if (template.gift_card_type === 'digital' && !recipientEmail) {
      return { success: false, message: 'Recipient email required for digital gift cards', giftCard: null, cartItem: null, cartTotals: { subtotal: 0, totalQuantity: 0 } };
    }

    const giftCards = this._getFromStorage('gift_cards', []);
    const giftCard = {
      id: this._generateId('giftCard'),
      gift_card_template_id: giftCardTemplateId,
      gift_card_type: template.gift_card_type,
      amount: amount,
      design_id: designId,
      recipient_name: recipientName,
      recipient_email: recipientEmail || null,
      sender_name: senderName,
      message: message || '',
      quantity: quantity,
      status: 'in_cart',
      created_at: this._nowIso()
    };
    giftCards.push(giftCard);
    this._saveToStorage('gift_cards', giftCards);

    const cart = this._getOrCreateCart();
    const payload = {
      item_type: 'gift_card',
      gift_card_id: giftCard.id,
      quantity: quantity,
      unit_price: amount,
      display_title: 'Gift Card $' + amount,
      display_date: null,
      display_subtitle: design.name
    };

    const res = this._addCartItem(cart, payload);

    return {
      success: true,
      message: 'Gift card added to cart',
      giftCard: giftCard,
      cartItem: res.cartItem,
      cartTotals: res.cartTotals
    };
  }

  // ---------------------- Corporate Workshops ----------------------

  getCorporateWorkshopsOverview() {
    const overview = this._getFromStorage('corporate_workshops_overview', {
      heroTitle: '',
      heroSubtitle: '',
      description: '',
      sampleFormats: [],
      outcomes: [],
      pricingGuidelines: ''
    });
    return overview;
  }

  submitCorporateInquiry(companyName, groupSize, preferredDateRange, budgetAmount, workshopType, contactName, contactEmail, contactPhone, goalsNotes) {
    if (!companyName || !(groupSize > 0) || !preferredDateRange || !contactName || !contactEmail) {
      return { success: false, inquiry: null };
    }

    const inquiries = this._getFromStorage('corporate_inquiries', []);
    const inquiry = {
      id: this._generateId('corpInquiry'),
      company_name: companyName,
      group_size: Number(groupSize),
      preferred_date_range: preferredDateRange,
      budget_amount: budgetAmount != null ? Number(budgetAmount) : null,
      workshop_type: workshopType || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      goals_notes: goalsNotes || '',
      status: 'new',
      created_at: this._nowIso()
    };
    inquiries.push(inquiry);
    this._saveToStorage('corporate_inquiries', inquiries);
    return { success: true, inquiry: inquiry };
  }

  // ---------------------- Cart Summary & Mutations ----------------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const events = this._getFromStorage('events', []);
    const ticketOptions = this._getFromStorage('event_ticket_options', []);
    const classes = this._getFromStorage('classes', []);
    const classEnrollments = this._getFromStorage('class_enrollments', []);
    const youthCamps = this._getFromStorage('youth_camps', []);
    const youthCampRegs = this._getFromStorage('youth_camp_registrations', []);
    const passes = this._getFromStorage('passes', []);
    const giftCards = this._getFromStorage('gift_cards', []);
    const venues = this._getFromStorage('venues', []);

    const eventById = {};
    const ticketOptById = {};
    const classById = {};
    const classEnrollById = {};
    const youthCampById = {};
    const youthCampRegById = {};
    const passById = {};
    const giftCardById = {};
    const venueById = {};

    for (let i = 0; i < events.length; i++) eventById[events[i].id] = events[i];
    for (let i = 0; i < ticketOptions.length; i++) ticketOptById[ticketOptions[i].id] = ticketOptions[i];
    for (let i = 0; i < classes.length; i++) classById[classes[i].id] = classes[i];
    for (let i = 0; i < classEnrollments.length; i++) classEnrollById[classEnrollments[i].id] = classEnrollments[i];
    for (let i = 0; i < youthCamps.length; i++) youthCampById[youthCamps[i].id] = youthCamps[i];
    for (let i = 0; i < youthCampRegs.length; i++) youthCampRegById[youthCampRegs[i].id] = youthCampRegs[i];
    for (let i = 0; i < passes.length; i++) passById[passes[i].id] = passes[i];
    for (let i = 0; i < giftCards.length; i++) giftCardById[giftCards[i].id] = giftCards[i];
    for (let i = 0; i < venues.length; i++) venueById[venues[i].id] = venues[i];

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id || cart.items.indexOf(ci.id) === -1) continue;

      let displayTitle = ci.display_title || '';
      let displaySubtitle = ci.display_subtitle || '';
      let displayDate = ci.display_date || null;
      let venueName = '';

      let event = null;
      let ticketOption = null;
      let classObj = null;
      let classEnrollment = null;
      let youthCamp = null;
      let youthCampRegistration = null;
      let passObj = null;
      let giftCardObj = null;

      if (ci.event_id) {
        event = eventById[ci.event_id] || null;
        if (event && !displayTitle) displayTitle = event.title;
        if (event && !displayDate) displayDate = event.start_datetime;
        if (event && event.venue_id && venueById[event.venue_id]) {
          venueName = venueById[event.venue_id].name;
        }
      }
      if (ci.ticket_option_id) {
        ticketOption = ticketOptById[ci.ticket_option_id] || null;
        if (ticketOption && !displaySubtitle) displaySubtitle = ticketOption.name;
      }
      if (ci.class_id) {
        classObj = classById[ci.class_id] || null;
        if (classObj && !displayTitle) displayTitle = classObj.title;
        if (classObj && !displayDate) displayDate = classObj.start_date;
        if (classObj && classObj.venue_id && venueById[classObj.venue_id]) {
          venueName = venueById[classObj.venue_id].name;
        }
      }
      if (ci.class_enrollment_id) {
        classEnrollment = classEnrollById[ci.class_enrollment_id] || null;
      }
      if (ci.youth_camp_id) {
        youthCamp = youthCampById[ci.youth_camp_id] || null;
        if (youthCamp && !displayTitle) displayTitle = youthCamp.title;
        if (youthCamp && !displayDate) displayDate = youthCamp.start_date;
        if (youthCamp && youthCamp.venue_id && venueById[youthCamp.venue_id]) {
          venueName = venueById[youthCamp.venue_id].name;
        }
      }
      if (ci.youth_camp_registration_id) {
        youthCampRegistration = youthCampRegById[ci.youth_camp_registration_id] || null;
      }
      if (ci.pass_id) {
        passObj = passById[ci.pass_id] || null;
        if (passObj && !displayTitle) displayTitle = passObj.name;
      }
      if (ci.gift_card_id) {
        giftCardObj = giftCardById[ci.gift_card_id] || null;
        if (giftCardObj && !displayTitle) displayTitle = 'Gift Card $' + giftCardObj.amount;
      }

      items.push({
        cartItemId: ci.id,
        itemType: ci.item_type,
        displayTitle: displayTitle,
        displaySubtitle: displaySubtitle,
        displayDate: displayDate,
        venueName: venueName,
        quantity: ci.quantity,
        unitPrice: ci.unit_price,
        totalPrice: ci.total_price,
        // Foreign key resolutions for convenience
        event: event,
        ticketOption: ticketOption,
        'class': classObj,
        classEnrollment: classEnrollment,
        youthCamp: youthCamp,
        youthCampRegistration: youthCampRegistration,
        pass: passObj,
        giftCard: giftCardObj
      });
    }

    const totals = this._recalculateCartTotals(cart, cartItems);

    return {
      items: items,
      subtotal: totals.subtotal,
      totalQuantity: totals.totalQuantity
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity);
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      const totalsMissing = this._recalculateCartTotals(cart, cartItems);
      return { success: false, cartItem: null, cartTotals: totalsMissing };
    }

    if (!(quantity > 0)) {
      // Remove item when quantity <= 0
      return this.removeCartItem(cartItemId);
    }

    const item = cartItems[idx];
    item.quantity = quantity;
    item.total_price = Number(item.unit_price || 0) * quantity;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart, cartItems);

    return { success: true, cartItem: item, cartTotals: totals };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      const totalsMissing = this._recalculateCartTotals(cart, cartItems);
      return { success: false, cartTotals: totalsMissing };
    }

    cartItems.splice(idx, 1);
    cart.items = cart.items.filter(function (id) { return id !== cartItemId; });

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart, cartItems);

    return { success: true, cartTotals: totals };
  }

  clearCart() {
    const cart = this._getOrCreateCart();
    // Remove all cart items belonging to this cart
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter(function (ci) { return ci.cart_id !== cart.id; });
    this._saveToStorage('cart_items', cartItems);

    cart.items = [];
    cart.subtotal = 0;
    cart.totalQuantity = 0;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);

    return { success: true };
  }

  // ---------------------- About / Contact / FAQ ----------------------

  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', {
      mission: '',
      history: '',
      values: [],
      keyPeople: []
    });
    return content;
  }

  getPrimaryVenueDetails() {
    const venues = this._getFromStorage('venues', []);
    let primary = venues.find(function (v) { return !!v.is_primary_location; }) || null;
    if (!primary && venues.length > 0) primary = venues[0];
    return primary || null;
  }

  getContactInfo() {
    const info = this._getFromStorage('contact_info', {
      boxOfficePhone: '',
      boxOfficeHours: '',
      educationEmail: '',
      corporateEventsEmail: '',
      generalEmail: ''
    });
    return info;
  }

  submitContactForm(name, email, topic, message) {
    if (!name || !email || !message) {
      return { success: false };
    }
    const forms = this._getFromStorage('contact_forms', []);
    const form = {
      id: this._generateId('contactForm'),
      name: name,
      email: email,
      topic: topic || null,
      message: message,
      created_at: this._nowIso()
    };
    forms.push(form);
    this._saveToStorage('contact_forms', forms);
    return { success: true };
  }

  getFAQEntries() {
    const faqs = this._getFromStorage('faq_entries', []);
    return faqs;
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