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

  // -------------------------
  // Storage & ID helpers
  // -------------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'events',
      'seats',
      'carts',
      'cart_items',
      'programs',
      'program_scholarships',
      'saved_programs',
      'registrations',
      'membership_tiers',
      'membership_signups',
      'donation_funds',
      'donations',
      'learning_resources',
      'reading_list_items',
      'schedules',
      'schedule_items',
      'venues',
      'festivals',
      'contact_form_submissions'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('about_page_content')) {
      const about = {
        mission: '',
        history: '',
        artistic_and_educational_goals: '',
        leadership: [],
        faculty_and_artists: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('contact_info')) {
      const contact = {
        primary_venue_id: null,
        box_office_hours: '',
        phone_numbers: [],
        emails: [],
        parking_info: '',
        accessibility_info: ''
      };
      localStorage.setItem('contact_info', JSON.stringify(contact));
    }

    if (!localStorage.getItem('policies_content')) {
      const policies = {
        privacy_policy_html: '',
        terms_of_use_html: '',
        ticketing_policy_html: '',
        cookie_policy_html: ''
      };
      localStorage.setItem('policies_content', JSON.stringify(policies));
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

  _nowISOString() {
    return new Date().toISOString();
  }

  // -------------------------
  // Formatting helpers
  // -------------------------

  _formatCurrency(amount, currency) {
    const cur = currency || 'USD';
    const num = typeof amount === 'number' ? amount : 0;
    try {
      if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: cur
        }).format(num);
      }
    } catch (e) {}
    return '$' + num.toFixed(2);
  }

  _formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  _formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return h + ':' + m;
    }
  }

  _formatDateRange(startIso, endIso) {
    const start = this._formatDate(startIso);
    const end = this._formatDate(endIso);
    if (start && end && start !== end) {
      return start + '  ' + end;
    }
    return start || end || '';
  }

  _getDayOfWeekLabelFromIso(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const idx = d.getDay(); // 0=Sunday
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[idx] || null;
  }

  _classifyTimeOfDayFromIso(iso) {
    if (!iso) return 'other';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'other';
    const h = d.getUTCHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getMinutesSinceMidnightFromIso(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  _eventsOverlap(startIso1, endIso1, startIso2, endIso2) {
    if (!startIso1 || !endIso1 || !startIso2 || !endIso2) return false;
    const s1 = new Date(startIso1).getTime();
    const e1 = new Date(endIso1).getTime();
    const s2 = new Date(startIso2).getTime();
    const e2 = new Date(endIso2).getTime();
    if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) return false;
    return s1 < e2 && s2 < e1;
  }

  _getCategoryLabel(category) {
    const map = {
      performances: 'Performances',
      tours: 'Visits & Tours',
      festival: 'Festival'
    };
    return map[category] || '';
  }

  _getEventSubtypeLabel(subtype) {
    const map = {
      opera_performance: 'Opera Performance',
      backstage_tour: 'Backstage Tour',
      masterclass: 'Masterclass',
      talks_lectures: 'Talk / Lecture',
      performances: 'Performance',
      other: 'Event'
    };
    return map[subtype] || '';
  }

  _getProgramTypeLabel(type) {
    const map = {
      adult_classes: 'Adult Classes',
      youth_programs: 'Youth Programs',
      summer_camps: 'Summer Camps'
    };
    return map[type] || '';
  }

  _getProgramLevelLabel(level) {
    const map = {
      beginner: 'Beginner',
      introductory: 'Introductory',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_levels: 'All Levels'
    };
    return map[level] || '';
  }

  _getScheduleFormatLabel(format) {
    const map = {
      weekday_evening: 'Weekday Evening',
      weekday_day_camp: 'Weekday Day Camp',
      weekend: 'Weekend',
      intensive: 'Intensive',
      online: 'Online',
      other: 'Other'
    };
    return map[format] || '';
  }

  _getGiftTypeLabel(giftType) {
    const map = {
      one_time: 'One-time',
      recurring: 'Recurring'
    };
    return map[giftType] || '';
  }

  _getTitleLabel(title) {
    const map = {
      mr: 'Mr.',
      ms: 'Ms.',
      mrs: 'Mrs.',
      mx: 'Mx.',
      dr: 'Dr.',
      none: ''
    };
    return map[title] || '';
  }

  // -------------------------
  // Internal entity helpers
  // -------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowISOString(),
        updated_at: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCartItemsForCart(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    return cartItems.filter((ci) => ci.cart_id === cartId);
  }

  _getOrCreateMySchedule() {
    let schedules = this._getFromStorage('schedules', []);
    let schedule = schedules.find((s) => s.name === 'My Schedule');
    if (!schedule) {
      schedule = {
        id: this._generateId('schedule'),
        name: 'My Schedule',
        created_at: this._nowISOString()
      };
      schedules.push(schedule);
      this._saveToStorage('schedules', schedules);
    }
    return schedule;
  }

  _getOrCreateReadingList() {
    // Ensures the reading_list_items collection exists
    if (!localStorage.getItem('reading_list_items')) {
      this._saveToStorage('reading_list_items', []);
    }
    return this._getFromStorage('reading_list_items', []);
  }

  _getOrCreateSavedProgramsCollection() {
    if (!localStorage.getItem('saved_programs')) {
      this._saveToStorage('saved_programs', []);
    }
    return this._getFromStorage('saved_programs', []);
  }

  _getActiveFestival() {
    const festivals = this._getFromStorage('festivals', []);
    const active = festivals.filter((f) => f.is_active);
    if (active.length === 0) return null;
    active.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    return active[0];
  }

  // -------------------------
  // Interface: getHomePageHighlights
  // -------------------------

  getHomePageHighlights() {
    const events = this._getFromStorage('events', []).filter((e) => e.is_active);
    const programs = this._getFromStorage('programs', []).filter((p) => p.is_active);

    const now = new Date().getTime();
    const upcomingEventsRaw = events
      .filter((e) => new Date(e.start_datetime).getTime() >= now)
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

    const upcoming_events = upcomingEventsRaw.slice(0, 10).map((ev) => ({
      event: ev,
      category_label: this._getCategoryLabel(ev.category),
      event_subtype_label: this._getEventSubtypeLabel(ev.event_subtype),
      date_display: this._formatDate(ev.start_datetime),
      time_display: this._formatTime(ev.start_datetime),
      min_price_display: this._formatCurrency(ev.min_price, ev.currency || 'USD')
    }));

    const featuredProgramsRaw = programs
      .filter((p) => p.program_type === 'adult_classes' || p.program_type === 'youth_programs')
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const featured_programs = featuredProgramsRaw.slice(0, 10).map((p) => ({
      program: p,
      program_type_label: this._getProgramTypeLabel(p.program_type),
      age_group_label: p.age_group_label || '',
      price_display: this._formatCurrency(p.price, p.currency || 'USD'),
      start_date_display: this._formatDate(p.start_date)
    }));

    const active_festival = this._getActiveFestival();

    const summerCampsRaw = programs
      .filter((p) => p.program_type === 'summer_camps')
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const summer_camp_highlights = summerCampsRaw.slice(0, 10).map((p) => ({
      program: p,
      age_group_label: p.age_group_label || '',
      price_display: this._formatCurrency(p.price, p.currency || 'USD'),
      start_date_display: this._formatDate(p.start_date)
    }));

    return {
      upcoming_events,
      featured_programs,
      active_festival,
      summer_camp_highlights
    };
  }

  // -------------------------
  // Interface: getEventFilterOptions
  // -------------------------

  getEventFilterOptions() {
    const categories = [
      { value: 'performances', label: 'Performances' },
      { value: 'tours', label: 'Visits & Tours' },
      { value: 'festival', label: 'Festival' }
    ];

    const event_subtypes = [
      { value: 'opera_performance', label: 'Opera Performances' },
      { value: 'backstage_tour', label: 'Backstage Tours' },
      { value: 'masterclass', label: 'Masterclasses' },
      { value: 'talks_lectures', label: 'Talks & Lectures' },
      { value: 'performances', label: 'Performances' },
      { value: 'other', label: 'Other Events' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full Day' },
      { value: 'other', label: 'Other' }
    ];

    const day_of_week_options = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const sort_options = [
      { value: 'start_date_soonest', label: 'Date: Soonest first' },
      { value: 'start_time_earliest', label: 'Start time: Earliest first' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    const suggested_price_filters = [25, 50, 75, 100, 150];

    return {
      categories,
      event_subtypes,
      time_of_day_options,
      day_of_week_options,
      sort_options,
      suggested_price_filters
    };
  }

  // -------------------------
  // Interface: searchEvents
  // -------------------------

  searchEvents(
    category,
    event_subtype,
    is_festival,
    date_from,
    date_to,
    days_of_week,
    time_of_day,
    time_window_start,
    time_window_end,
    min_price,
    max_price,
    sort_by,
    limit
  ) {
    let events = this._getFromStorage('events', []).filter((e) => e.is_active);

    if (category) {
      events = events.filter((e) => e.category === category);
    }
    if (event_subtype) {
      events = events.filter((e) => e.event_subtype === event_subtype);
    }
    if (typeof is_festival === 'boolean') {
      events = events.filter((e) => !!e.is_festival === is_festival);
    }

    if (date_from) {
      const fromTime = new Date(date_from + 'T00:00:00').getTime();
      events = events.filter((e) => new Date(e.start_datetime).getTime() >= fromTime);
    }
    if (date_to) {
      const toTime = new Date(date_to + 'T23:59:59').getTime();
      events = events.filter((e) => new Date(e.start_datetime).getTime() <= toTime);
    }

    if (Array.isArray(days_of_week) && days_of_week.length > 0) {
      const allowed = days_of_week.map((d) => String(d).toLowerCase());
      events = events.filter((e) => {
        const label = this._getDayOfWeekLabelFromIso(e.start_datetime);
        return label && allowed.includes(label);
      });
    }

    if (time_of_day) {
      events = events.filter((e) => {
        const clas = this._classifyTimeOfDayFromIso(e.start_datetime);
        if (time_of_day === 'full_day') {
          return clas === 'morning' || clas === 'afternoon' || clas === 'evening';
        }
        return clas === time_of_day;
      });
    }

    const windowStartMinutes = this._parseTimeToMinutes(time_window_start);
    const windowEndMinutes = this._parseTimeToMinutes(time_window_end);
    if (windowStartMinutes !== null && windowEndMinutes !== null) {
      events = events.filter((e) => {
        const mins = this._getMinutesSinceMidnightFromIso(e.start_datetime);
        return mins !== null && mins >= windowStartMinutes && mins <= windowEndMinutes;
      });
    }

    if (typeof min_price === 'number') {
      events = events.filter((e) => typeof e.min_price === 'number' && e.min_price >= min_price);
    }
    if (typeof max_price === 'number') {
      events = events.filter((e) => typeof e.min_price === 'number' && e.min_price <= max_price);
    }

    if (sort_by === 'price_low_to_high') {
      events.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
    } else if (sort_by === 'start_time_earliest') {
      events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
    } else if (sort_by === 'start_date_soonest') {
      events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
    }

    if (typeof limit === 'number' && limit > 0) {
      events = events.slice(0, limit);
    }

    const results = events.map((ev) => ({
      event: ev,
      category_label: this._getCategoryLabel(ev.category),
      event_subtype_label: this._getEventSubtypeLabel(ev.event_subtype),
      date_display: this._formatDate(ev.start_datetime),
      time_display: this._formatTime(ev.start_datetime),
      price_display: this._formatCurrency(ev.min_price, ev.currency || 'USD'),
      is_addable_to_schedule: !!ev.is_festival
    }));

    return results;
  }

  // -------------------------
  // Interface: getEventDetail
  // -------------------------

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        venue: null,
        festival: null,
        category_label: '',
        event_subtype_label: '',
        date_display: '',
        time_display: '',
        price_range_display: '',
        is_addable_to_schedule: false
      };
    }

    const venues = this._getFromStorage('venues', []);
    const venue = venues.find((v) => v.id === event.venue_id) || null;

    let festival = null;
    if (event.is_festival && event.festival_id) {
      const festivals = this._getFromStorage('festivals', []);
      festival = festivals.find((f) => f.id === event.festival_id) || null;
    }

    let price_range_display = '';
    if (typeof event.min_price === 'number' && typeof event.max_price === 'number' && event.max_price > event.min_price) {
      price_range_display =
        this._formatCurrency(event.min_price, event.currency || 'USD') +
        '  ' +
        this._formatCurrency(event.max_price, event.currency || 'USD');
    } else if (typeof event.min_price === 'number') {
      price_range_display = 'From ' + this._formatCurrency(event.min_price, event.currency || 'USD');
    }

    return {
      event,
      venue,
      festival,
      category_label: this._getCategoryLabel(event.category),
      event_subtype_label: this._getEventSubtypeLabel(event.event_subtype),
      date_display: this._formatDate(event.start_datetime),
      time_display: this._formatTime(event.start_datetime),
      price_range_display,
      is_addable_to_schedule: !!event.is_festival
    };
  }

  // -------------------------
  // Interface: getEventSeatMap
  // -------------------------

  getEventSeatMap(eventId, max_price) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    const seatsAll = this._getFromStorage('seats', []).filter((s) => s.event_id === eventId);

    let seats = seatsAll.filter((s) => s.is_available);
    let price_filter_applied = false;

    if (typeof max_price === 'number') {
      seats = seats.filter((s) => typeof s.price === 'number' && s.price <= max_price);
      price_filter_applied = true;
    }

    const sectionsMap = {};
    seats.forEach((s) => {
      if (!sectionsMap[s.section_name]) {
        sectionsMap[s.section_name] = {
          section_name: s.section_name,
          min_price: s.price,
          max_price: s.price,
          available_count: 0
        };
      }
      const sec = sectionsMap[s.section_name];
      if (s.price < sec.min_price) sec.min_price = s.price;
      if (s.price > sec.max_price) sec.max_price = s.price;
      sec.available_count += s.is_available ? 1 : 0;
    });

    const sections = Object.keys(sectionsMap).map((k) => sectionsMap[k]);

    const currency = event ? event.currency || 'USD' : 'USD';

    return {
      event,
      sections,
      seats,
      currency,
      price_filter_applied
    };
  }

  // -------------------------
  // Interface: addEventTicketsToCart
  // -------------------------

  addEventTicketsToCart(eventId, quantity, seatIds) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
        cart: null,
        items: []
      };
    }

    // If the event is marked as seat-selectable but there are no seat records,
    // treat it as general admission so tickets can still be purchased.
    if (event.is_seat_selectable) {
      const seatsForEvent = this._getFromStorage('seats', []).filter((s) => s.event_id === eventId);
      if (seatsForEvent.length === 0) {
        event.is_seat_selectable = false;
      }
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let seatIdsToUse = Array.isArray(seatIds) ? seatIds.slice() : [];
    let unit_price = 0;
    let total_price = 0;
    let currency = event.currency || 'USD';

    if (event.is_seat_selectable) {
      const seats = this._getFromStorage('seats', []).filter((s) => s.event_id === eventId);
      const availableSeats = seats.filter((s) => s.is_available);

      let selectedSeats = [];

      if (!seatIdsToUse || seatIdsToUse.length === 0) {
        // Auto-select cheapest available seats when no specific seats are requested
        if (availableSeats.length < qty) {
          return {
            success: false,
            message: 'Not enough seats available for this event',
            cart,
            items: []
          };
        }
        availableSeats.sort((a, b) => (a.price || 0) - (b.price || 0));
        selectedSeats = availableSeats.slice(0, qty);
        seatIdsToUse = selectedSeats.map((s) => s.id);
      } else {
        if (seatIdsToUse.length !== qty) {
          return {
            success: false,
            message: 'Seat selection required for this event',
            cart,
            items: []
          };
        }
        selectedSeats = seatIdsToUse
          .map((id) => seats.find((s) => s.id === id && s.is_available))
          .filter((s) => !!s);

        if (selectedSeats.length !== qty) {
          return {
            success: false,
            message: 'One or more selected seats are unavailable',
            cart,
            items: []
          };
        }
      }

      total_price = selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
      unit_price = total_price / qty;
      if (!currency && selectedSeats[0]) {
        currency = selectedSeats[0].currency || 'USD';
      }
    } else {
      unit_price = typeof event.default_ticket_price === 'number'
        ? event.default_ticket_price
        : (typeof event.min_price === 'number' ? event.min_price : 0);
      total_price = unit_price * qty;
      seatIdsToUse = undefined;
    }

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      event_id: eventId,
      quantity: qty,
      seat_ids: seatIdsToUse,
      unit_price,
      total_price,
      currency,
      added_at: this._nowISOString(),
      item_type: 'event_ticket'
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Return summary with resolved foreign keys
    const venues = this._getFromStorage('venues', []);
    const allItems = this._getCartItemsForCart(cart.id);

    const items = allItems.map((ci) => {
      const ev = events.find((e) => e.id === ci.event_id) || null;
      const venue = ev ? (venues.find((v) => v.id === ev.venue_id) || null) : null;
      return {
        cart_item: ci,
        event: ev,
        event_date_display: ev ? this._formatDate(ev.start_datetime) : '',
        event_time_display: ev ? this._formatTime(ev.start_datetime) : '',
        venue_name: venue ? venue.name : ''
      };
    });

    const message = 'Added to cart';

    return {
      success: true,
      message,
      cart,
      items
    };
  }

  // -------------------------
  // Interface: getCartSummary
  // -------------------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    let total_price = 0;
    let currency = 'USD';

    const items = cartItems.map((ci) => {
      const ev = events.find((e) => e.id === ci.event_id) || null;
      const venue = ev ? (venues.find((v) => v.id === ev.venue_id) || null) : null;
      total_price += ci.total_price || 0;
      if (ci.currency) {
        currency = ci.currency;
      } else if (ev && ev.currency) {
        currency = ev.currency;
      }
      return {
        cart_item: ci,
        event: ev,
        event_date_display: ev ? this._formatDate(ev.start_datetime) : '',
        event_time_display: ev ? this._formatTime(ev.start_datetime) : '',
        venue_name: venue ? venue.name : '',
        category_label: ev ? this._getCategoryLabel(ev.category) : '',
        event_subtype_label: ev ? this._getEventSubtypeLabel(ev.event_subtype) : '',
        is_festival: ev ? !!ev.is_festival : false
      };
    });

    const total_price_display = this._formatCurrency(total_price, currency);

    return {
      cart,
      items,
      currency,
      total_price,
      total_price_display
    };
  }

  // -------------------------
  // Interface: updateCartItemQuantity
  // -------------------------

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return this.getCartSummary();
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.total_price = (item.unit_price || 0) * quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    // return updated summary (simpler format defined by interface)
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let total_price = 0;
    let currency = 'USD';

    const items = itemsForCart.map((ci) => {
      const ev = events.find((e) => e.id === ci.event_id) || null;
      const venue = ev ? (venues.find((v) => v.id === ev.venue_id) || null) : null;
      total_price += ci.total_price || 0;
      if (ci.currency) {
        currency = ci.currency;
      } else if (ev && ev.currency) {
        currency = ev.currency;
      }
      return {
        cart_item: ci,
        event: ev,
        event_date_display: ev ? this._formatDate(ev.start_datetime) : '',
        event_time_display: ev ? this._formatTime(ev.start_datetime) : '',
        venue_name: venue ? venue.name : ''
      };
    });

    const total_price_display = this._formatCurrency(total_price, currency);

    return {
      cart,
      items,
      currency,
      total_price,
      total_price_display
    };
  }

  // -------------------------
  // Interface: removeCartItem
  // -------------------------

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter((ci) => !(ci.id === cartItemId && ci.cart_id === cart.id));
    this._saveToStorage('cart_items', cartItems);

    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let total_price = 0;
    let currency = 'USD';

    const items = itemsForCart.map((ci) => {
      const ev = events.find((e) => e.id === ci.event_id) || null;
      const venue = ev ? (venues.find((v) => v.id === ev.venue_id) || null) : null;
      total_price += ci.total_price || 0;
      if (ci.currency) {
        currency = ci.currency;
      } else if (ev && ev.currency) {
        currency = ev.currency;
      }
      return {
        cart_item: ci,
        event: ev,
        event_date_display: ev ? this._formatDate(ev.start_datetime) : '',
        event_time_display: ev ? this._formatTime(ev.start_datetime) : '',
        venue_name: venue ? venue.name : ''
      };
    });

    const total_price_display = this._formatCurrency(total_price, currency);

    return {
      cart,
      items,
      currency,
      total_price,
      total_price_display
    };
  }

  // -------------------------
  // Interface: clearCart
  // -------------------------

  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', cartItems);

    return {
      cart,
      items: [],
      total_price: 0
    };
  }

  // -------------------------
  // Interface: getProgramFilterOptions
  // -------------------------

  getProgramFilterOptions() {
    const program_types = [
      { value: 'adult_classes', label: 'Adult Classes' },
      { value: 'youth_programs', label: 'Youth Programs' },
      { value: 'summer_camps', label: 'Summer Camps' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'introductory', label: 'Introductory' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const age_groups = [
      { value: 'adults_18_plus', label: 'Adults (18+)' },
      { value: 'teens_13_17', label: 'Ages 13 17' },
      { value: 'ages_9_11', label: 'Ages 9 11' },
      { value: 'ages_10_12', label: 'Ages 10 12' },
      { value: 'all_ages', label: 'All Ages' }
    ];

    const disciplines = [
      { value: 'vocal_training', label: 'Vocal Training' },
      { value: 'opera_studio', label: 'Opera Studio' },
      { value: 'acting', label: 'Acting' },
      { value: 'movement', label: 'Movement' },
      { value: 'other', label: 'Other' }
    ];

    const schedule_formats = [
      { value: 'weekday_evening', label: 'Weekday Evening' },
      { value: 'weekday_day_camp', label: 'Weekday Day Camp' },
      { value: 'weekend', label: 'Weekend' },
      { value: 'intensive', label: 'Intensive' },
      { value: 'online', label: 'Online' },
      { value: 'other', label: 'Other' }
    ];

    const sort_options = [
      { value: 'start_date_soonest', label: 'Start date: Soonest first' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    const programs = this._getFromStorage('programs', []).filter((p) => p.is_active);
    const monthsSet = {};
    programs.forEach((p) => {
      if (p.start_date) {
        const iso = String(p.start_date);
        const ym = iso.slice(0, 7);
        if (ym) monthsSet[ym] = true;
      }
    });
    const available_months = Object.keys(monthsSet).sort();

    return {
      program_types,
      levels,
      age_groups,
      disciplines,
      schedule_formats,
      sort_options,
      available_months
    };
  }

  // -------------------------
  // Interface: getPrograms
  // -------------------------

  getPrograms(
    program_type,
    level,
    age_group_key,
    discipline,
    schedule_format,
    min_price,
    max_price,
    start_date_from,
    start_date_to,
    month,
    scholarships_only,
    sort_by,
    limit
  ) {
    let programs = this._getFromStorage('programs', []).filter((p) => p.is_active);

    if (program_type) {
      programs = programs.filter((p) => p.program_type === program_type);
    }
    if (level) {
      programs = programs.filter((p) => p.level === level);
    }
    if (age_group_key) {
      programs = programs.filter((p) => p.age_group_key === age_group_key);
    }
    if (discipline) {
      programs = programs.filter((p) => p.discipline === discipline);
    }
    if (schedule_format) {
      programs = programs.filter((p) => p.schedule_format === schedule_format);
    }

    if (typeof min_price === 'number') {
      programs = programs.filter((p) => typeof p.price === 'number' && p.price >= min_price);
    }
    if (typeof max_price === 'number') {
      programs = programs.filter((p) => typeof p.price === 'number' && p.price <= max_price);
    }

    if (start_date_from) {
      const fromTime = new Date(start_date_from + 'T00:00:00').getTime();
      programs = programs.filter((p) => new Date(p.start_date).getTime() >= fromTime);
    }
    if (start_date_to) {
      const toTime = new Date(start_date_to + 'T23:59:59').getTime();
      programs = programs.filter((p) => new Date(p.start_date).getTime() <= toTime);
    }

    if (month) {
      const monthStr = String(month).slice(0, 7);
      programs = programs.filter((p) => String(p.start_date).slice(0, 7) === monthStr);
    }

    if (scholarships_only) {
      programs = programs.filter((p) => !!p.scholarships_available);
    }

    if (sort_by === 'price_low_to_high') {
      programs.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'start_date_soonest') {
      programs.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }

    if (typeof limit === 'number' && limit > 0) {
      programs = programs.slice(0, limit);
    }

    return programs.map((p) => ({
      program: p,
      program_type_label: this._getProgramTypeLabel(p.program_type),
      level_label: this._getProgramLevelLabel(p.level),
      age_group_label: p.age_group_label || '',
      schedule_label: this._getScheduleFormatLabel(p.schedule_format),
      price_display: this._formatCurrency(p.price, p.currency || 'USD'),
      start_date_display: this._formatDate(p.start_date),
      featured_scholarship_badge:
        typeof p.featured_scholarship_percentage === 'number' && p.featured_scholarship_percentage > 0
          ? p.featured_scholarship_percentage + '% tuition scholarship'
          : ''
    }));
  }

  // -------------------------
  // Interface: getProgramDetail
  // -------------------------

  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        program: null,
        program_type_label: '',
        level_label: '',
        age_group_label: '',
        schedule_label: '',
        price_display: '',
        date_range_display: '',
        location_display: '',
        scholarship_summary: {
          scholarships_available: false,
          featured_scholarship_percentage: 0,
          featured_badge_label: ''
        },
        scholarships: []
      };
    }

    const program_scholarships = this._getFromStorage('program_scholarships', []).filter(
      (s) => s.program_id === programId
    );

    const scholarship_summary = {
      scholarships_available: !!program.scholarships_available,
      featured_scholarship_percentage: program.featured_scholarship_percentage || 0,
      featured_badge_label:
        typeof program.featured_scholarship_percentage === 'number' &&
        program.featured_scholarship_percentage > 0
          ? program.featured_scholarship_percentage + '% tuition scholarship'
          : ''
    };

    return {
      program,
      program_type_label: this._getProgramTypeLabel(program.program_type),
      level_label: this._getProgramLevelLabel(program.level),
      age_group_label: program.age_group_label || '',
      schedule_label: this._getScheduleFormatLabel(program.schedule_format),
      price_display: this._formatCurrency(program.price, program.currency || 'USD'),
      date_range_display: this._formatDateRange(program.start_date, program.end_date),
      location_display: program.location_name || '',
      scholarship_summary,
      scholarships: program_scholarships
    };
  }

  // -------------------------
  // Interface: saveProgram
  // -------------------------

  saveProgram(programId, note) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        saved_program: null,
        program: null,
        message: 'Program not found'
      };
    }

    let savedPrograms = this._getOrCreateSavedProgramsCollection();
    let saved = savedPrograms.find((sp) => sp.program_id === programId);

    if (!saved) {
      saved = {
        id: this._generateId('saved_program'),
        program_id: programId,
        note: note || '',
        created_at: this._nowISOString(),
        updated_at: null
      };
      savedPrograms.push(saved);
    } else {
      if (typeof note === 'string') {
        saved.note = note;
      }
      saved.updated_at = this._nowISOString();
    }

    this._saveToStorage('saved_programs', savedPrograms);

    return {
      saved_program: saved,
      program,
      message: 'Program saved'
    };
  }

  // -------------------------
  // Interface: updateSavedProgramNote
  // -------------------------

  updateSavedProgramNote(savedProgramId, note) {
    let savedPrograms = this._getOrCreateSavedProgramsCollection();
    const idx = savedPrograms.findIndex((sp) => sp.id === savedProgramId);
    if (idx === -1) {
      return {
        saved_program: null,
        program: null
      };
    }

    const saved = savedPrograms[idx];
    saved.note = note;
    saved.updated_at = this._nowISOString();
    savedPrograms[idx] = saved;
    this._saveToStorage('saved_programs', savedPrograms);

    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === saved.program_id) || null;

    return {
      saved_program: saved,
      program
    };
  }

  // -------------------------
  // Interface: getSavedPrograms
  // -------------------------

  getSavedPrograms() {
    const savedPrograms = this._getOrCreateSavedProgramsCollection();
    const programs = this._getFromStorage('programs', []);

    return savedPrograms.map((sp) => ({
      saved_program: sp,
      program: programs.find((p) => p.id === sp.program_id) || null
    }));
  }

  // -------------------------
  // Interface: startProgramRegistration
  // -------------------------

  startProgramRegistration(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;

    const registration = {
      id: this._generateId('registration'),
      program_id: programId,
      participant_name: '',
      participant_age: null,
      contact_email: '',
      created_at: this._nowISOString(),
      updated_at: null,
      status: 'in_progress'
    };

    const registrations = this._getFromStorage('registrations', []);
    registrations.push(registration);
    this._saveToStorage('registrations', registrations);

    const program_summary = program
      ? {
          name: program.name,
          date_range_display: this._formatDateRange(program.start_date, program.end_date),
          price_display: this._formatCurrency(program.price, program.currency || 'USD'),
          location_display: program.location_name || ''
        }
      : {
          name: '',
          date_range_display: '',
          price_display: '',
          location_display: ''
        };

    return {
      registration,
      program,
      program_summary
    };
  }

  // -------------------------
  // Interface: updateRegistrationParticipant
  // -------------------------

  updateRegistrationParticipant(registrationId, participant_name, participant_age, contact_email) {
    let registrations = this._getFromStorage('registrations', []);
    const idx = registrations.findIndex((r) => r.id === registrationId);
    if (idx === -1) {
      return {
        registration: null,
        program: null,
        next_step: ''
      };
    }

    const reg = registrations[idx];
    reg.participant_name = participant_name;
    if (typeof participant_age === 'number') {
      reg.participant_age = participant_age;
    }
    if (typeof contact_email === 'string') {
      reg.contact_email = contact_email;
    }
    reg.updated_at = this._nowISOString();
    registrations[idx] = reg;
    this._saveToStorage('registrations', registrations);

    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === reg.program_id) || null;

    return {
      registration: reg,
      program,
      next_step: 'review'
    };
  }

  // -------------------------
  // Interface: getRegistrationSummary
  // -------------------------

  getRegistrationSummary(registrationId) {
    const registrations = this._getFromStorage('registrations', []);
    const registration = registrations.find((r) => r.id === registrationId) || null;
    const programs = this._getFromStorage('programs', []);
    const program = registration
      ? programs.find((p) => p.id === registration.program_id) || null
      : null;

    const program_summary = program
      ? {
          name: program.name,
          date_range_display: this._formatDateRange(program.start_date, program.end_date),
          price_display: this._formatCurrency(program.price, program.currency || 'USD')
        }
      : {
          name: '',
          date_range_display: '',
          price_display: ''
        };

    return {
      registration,
      program,
      participant_name: registration ? registration.participant_name : '',
      participant_age: registration && typeof registration.participant_age === 'number'
        ? registration.participant_age
        : null,
      program_summary
    };
  }

  // -------------------------
  // Interface: getMembershipTiers
  // -------------------------

  getMembershipTiers() {
    const tiers = this._getFromStorage('membership_tiers', []).filter((t) => t.is_active);
    return tiers.map((tier) => {
      const benefits_summary = [];
      if (tier.includes_ticket_discount && typeof tier.ticket_discount_percentage === 'number') {
        benefits_summary.push(tier.ticket_discount_percentage + '% off tickets');
      } else if (tier.includes_ticket_discount) {
        benefits_summary.push('Ticket discounts');
      }
      if (tier.includes_behind_the_scenes_access) {
        benefits_summary.push('Behind-the-scenes events access');
      }
      return {
        tier,
        annual_price_display: this._formatCurrency(tier.annual_price, tier.currency || 'USD'),
        benefits_summary
      };
    });
  }

  // -------------------------
  // Interface: createMembershipSignup
  // -------------------------

  createMembershipSignup(
    membershipTierId,
    term,
    first_name,
    last_name,
    email,
    city,
    country,
    agreed_to_terms
  ) {
    const tiers = this._getFromStorage('membership_tiers', []);
    const tier = tiers.find((t) => t.id === membershipTierId) || null;

    if (!tier) {
      return {
        success: false,
        membership_signup: null,
        tier: null,
        next_step: ''
      };
    }

    if (!agreed_to_terms) {
      return {
        success: false,
        membership_signup: null,
        tier,
        next_step: ''
      };
    }

    const signup = {
      id: this._generateId('membership_signup'),
      membership_tier_id: membershipTierId,
      term,
      first_name,
      last_name,
      email,
      city: city || '',
      country: country || '',
      agreed_to_terms: !!agreed_to_terms,
      created_at: this._nowISOString(),
      status: 'in_progress'
    };

    const signups = this._getFromStorage('membership_signups', []);
    signups.push(signup);
    this._saveToStorage('membership_signups', signups);

    return {
      success: true,
      membership_signup: signup,
      tier,
      next_step: 'payment'
    };
  }

  // -------------------------
  // Interface: getDonationFunds
  // -------------------------

  getDonationFunds() {
    const funds = this._getFromStorage('donation_funds', []).filter((f) => f.is_active);
    return funds;
  }

  // -------------------------
  // Interface: createDonation
  // -------------------------

  createDonation(
    fundId,
    gift_type,
    amount,
    currency,
    title,
    first_name,
    last_name,
    email,
    wants_postal_mail,
    wants_anonymous
  ) {
    const funds = this._getFromStorage('donation_funds', []);
    const fund = funds.find((f) => f.id === fundId) || null;

    if (!fund) {
      return {
        success: false,
        donation: null,
        fund: null,
        review_summary: null
      };
    }

    const donation = {
      id: this._generateId('donation'),
      fund_id: fundId,
      gift_type,
      amount,
      currency: currency || 'USD',
      title,
      first_name,
      last_name,
      email,
      wants_postal_mail: !!wants_postal_mail,
      wants_anonymous: !!wants_anonymous,
      created_at: this._nowISOString(),
      status: 'in_progress'
    };

    const donations = this._getFromStorage('donations', []);
    donations.push(donation);
    this._saveToStorage('donations', donations);

    const donorTitle = this._getTitleLabel(title);
    const donor_display_name = donation.wants_anonymous
      ? 'Anonymous'
      : (donorTitle ? donorTitle + ' ' : '') + first_name + ' ' + last_name;

    const review_summary = {
      fund_name: fund.name,
      amount_display: this._formatCurrency(amount, donation.currency),
      gift_type_label: this._getGiftTypeLabel(gift_type),
      donor_display_name,
      is_anonymous: !!wants_anonymous
    };

    return {
      success: true,
      donation,
      fund,
      review_summary
    };
  }

  // -------------------------
  // Interface: getLearningResourceFilterOptions
  // -------------------------

  getLearningResourceFilterOptions() {
    const content_type_options = [
      { value: 'articles', label: 'Articles' },
      { value: 'videos', label: 'Videos' },
      { value: 'podcast', label: 'Podcasts' },
      { value: 'guide', label: 'Guides' },
      { value: 'other', label: 'Other' }
    ];

    const duration_options_minutes = [5, 10, 15, 30, 60];

    const sort_options = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      content_type_options,
      duration_options_minutes,
      sort_options
    };
  }

  // -------------------------
  // Interface: searchLearningResources
  // -------------------------

  searchLearningResources(query, content_types, max_duration_minutes, sort_by, limit) {
    let resources = this._getFromStorage('learning_resources', []).filter((r) => r.is_active);

    const q = query ? String(query).toLowerCase() : '';
    if (q) {
      resources = resources.filter((r) => {
        const inTitle = (r.title || '').toLowerCase().indexOf(q) !== -1;
        const inDesc = (r.description || '').toLowerCase().indexOf(q) !== -1;
        const tags = Array.isArray(r.tags) ? r.tags.join(' ').toLowerCase() : '';
        const inTags = tags.indexOf(q) !== -1;
        return inTitle || inDesc || inTags;
      });
    }

    if (Array.isArray(content_types) && content_types.length > 0) {
      const allowed = content_types.map((c) => String(c));
      resources = resources.filter((r) => allowed.includes(r.content_type));
    }

    if (typeof max_duration_minutes === 'number') {
      resources = resources.filter(
        (r) => typeof r.duration_minutes === 'number' && r.duration_minutes <= max_duration_minutes
      );
    }

    if (sort_by === 'most_popular') {
      resources.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort_by === 'highest_rated') {
      resources.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort_by === 'newest') {
      resources.sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      });
    }

    if (typeof limit === 'number' && limit > 0) {
      resources = resources.slice(0, limit);
    }

    return resources.map((r) => ({
      resource: r,
      content_type_label:
        r.content_type === 'articles'
          ? 'Article'
          : r.content_type === 'videos'
          ? 'Video'
          : r.content_type === 'podcast'
          ? 'Podcast'
          : r.content_type === 'guide'
          ? 'Guide'
          : 'Resource',
      duration_display: (r.duration_minutes || 0) + ' min',
      popularity_score: r.popularity_score || 0,
      average_rating: r.average_rating || 0
    }));
  }

  // -------------------------
  // Interface: getLearningResourceDetail
  // -------------------------

  getLearningResourceDetail(resourceId) {
    const resources = this._getFromStorage('learning_resources', []);
    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return {
        resource: null,
        content_type_label: '',
        duration_display: ''
      };
    }

    const content_type_label =
      resource.content_type === 'articles'
        ? 'Article'
        : resource.content_type === 'videos'
        ? 'Video'
        : resource.content_type === 'podcast'
        ? 'Podcast'
        : resource.content_type === 'guide'
        ? 'Guide'
        : 'Resource';

    const duration_display = (resource.duration_minutes || 0) + ' min';

    return {
      resource,
      content_type_label,
      duration_display
    };
  }

  // -------------------------
  // Interface: addResourceToReadingList
  // -------------------------

  addResourceToReadingList(resourceId) {
    const resources = this._getFromStorage('learning_resources', []);
    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return {
        reading_list_item: null,
        resource: null
      };
    }

    let readingList = this._getOrCreateReadingList();
    let item = readingList.find((i) => i.resource_id === resourceId);

    if (!item) {
      item = {
        id: this._generateId('reading_list_item'),
        resource_id: resourceId,
        added_at: this._nowISOString()
      };
      readingList.push(item);
      this._saveToStorage('reading_list_items', readingList);
    }

    return {
      reading_list_item: item,
      resource
    };
  }

  // -------------------------
  // Interface: getReadingList
  // -------------------------

  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const resources = this._getFromStorage('learning_resources', []);

    return readingList.map((item) => ({
      reading_list_item: item,
      resource: resources.find((r) => r.id === item.resource_id) || null
    }));
  }

  // -------------------------
  // Interface: getFestivalOverview
  // -------------------------

  getFestivalOverview() {
    const festival = this._getActiveFestival();
    if (!festival) {
      return {
        festival: null,
        date_range_display: '',
        highlighted_events: []
      };
    }

    const events = this._getFromStorage('events', []).filter(
      (e) => e.is_festival && e.festival_id === festival.id && e.is_active
    );

    events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

    const highlighted_events = events.slice(0, 20).map((ev) => ({
      event: ev,
      event_subtype_label: this._getEventSubtypeLabel(ev.event_subtype),
      date_display: this._formatDate(ev.start_datetime),
      time_display: this._formatTime(ev.start_datetime)
    }));

    return {
      festival,
      date_range_display: this._formatDateRange(festival.start_date, festival.end_date),
      highlighted_events
    };
  }

  // -------------------------
  // Interface: addEventToMySchedule
  // -------------------------

  addEventToMySchedule(eventId, allow_overlap) {
    const schedule = this._getOrCreateMySchedule();
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        success: false,
        schedule,
        schedule_items: [],
        conflict_event: null,
        message: 'Event not found'
      };
    }

    let scheduleItems = this._getFromStorage('schedule_items', []);
    const existingForSchedule = scheduleItems.filter((si) => si.schedule_id === schedule.id);

    let conflict_event = null;
    if (!allow_overlap) {
      for (let i = 0; i < existingForSchedule.length; i++) {
        const si = existingForSchedule[i];
        const ev2 = events.find((e) => e.id === si.event_id);
        if (ev2 && this._eventsOverlap(event.start_datetime, event.end_datetime, ev2.start_datetime, ev2.end_datetime)) {
          conflict_event = ev2;
          break;
        }
      }
    }

    if (conflict_event) {
      const itemsWithEvents = existingForSchedule.map((si) => {
        const ev = events.find((e) => e.id === si.event_id) || null;
        return {
          schedule_item: si,
          event: ev,
          date_display: ev ? this._formatDate(ev.start_datetime) : '',
          time_range_display: ev
            ? this._formatTime(ev.start_datetime) + '  ' + this._formatTime(ev.end_datetime)
            : '',
          event_subtype_label: ev ? this._getEventSubtypeLabel(ev.event_subtype) : ''
        };
      });

      return {
        success: false,
        schedule,
        schedule_items: itemsWithEvents,
        conflict_event,
        message: 'Event overlaps with an existing item in your schedule'
      };
    }

    const newItem = {
      id: this._generateId('schedule_item'),
      schedule_id: schedule.id,
      event_id: eventId,
      added_at: this._nowISOString()
    };

    scheduleItems.push(newItem);
    this._saveToStorage('schedule_items', scheduleItems);

    const updatedForSchedule = scheduleItems.filter((si) => si.schedule_id === schedule.id);
    const schedule_items = updatedForSchedule.map((si) => {
      const ev = events.find((e) => e.id === si.event_id) || null;
      return {
        schedule_item: si,
        event: ev,
        date_display: ev ? this._formatDate(ev.start_datetime) : '',
        time_range_display: ev
          ? this._formatTime(ev.start_datetime) + '  ' + this._formatTime(ev.end_datetime)
          : '',
        event_subtype_label: ev ? this._getEventSubtypeLabel(ev.event_subtype) : ''
      };
    });

    return {
      success: true,
      schedule,
      schedule_items,
      conflict_event: null,
      message: 'Event added to schedule'
    };
  }

  // -------------------------
  // Interface: getMySchedule
  // -------------------------

  getMySchedule() {
    const schedule = this._getOrCreateMySchedule();
    const scheduleItems = this._getFromStorage('schedule_items', []).filter(
      (si) => si.schedule_id === schedule.id
    );
    const events = this._getFromStorage('events', []);

    const items = scheduleItems.map((si) => {
      const ev = events.find((e) => e.id === si.event_id) || null;
      return {
        schedule_item: si,
        event: ev,
        date_display: ev ? this._formatDate(ev.start_datetime) : '',
        time_range_display: ev
          ? this._formatTime(ev.start_datetime) + '  ' + this._formatTime(ev.end_datetime)
          : '',
        event_subtype_label: ev ? this._getEventSubtypeLabel(ev.event_subtype) : ''
      };
    });

    return {
      schedule,
      items
    };
  }

  // -------------------------
  // Interface: getAboutPageContent
  // -------------------------

  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', {
      mission: '',
      history: '',
      artistic_and_educational_goals: '',
      leadership: [],
      faculty_and_artists: []
    });
    return about;
  }

  // -------------------------
  // Interface: getContactInfo
  // -------------------------

  getContactInfo() {
    const contact = this._getFromStorage('contact_info', {
      primary_venue_id: null,
      box_office_hours: '',
      phone_numbers: [],
      emails: [],
      parking_info: '',
      accessibility_info: ''
    });

    const venues = this._getFromStorage('venues', []);
    const primary_venue = contact.primary_venue_id
      ? venues.find((v) => v.id === contact.primary_venue_id) || null
      : null;

    return {
      primary_venue,
      box_office_hours: contact.box_office_hours || '',
      phone_numbers: Array.isArray(contact.phone_numbers) ? contact.phone_numbers : [],
      emails: Array.isArray(contact.emails) ? contact.emails : [],
      parking_info: contact.parking_info || '',
      accessibility_info: contact.accessibility_info || ''
    };
  }

  // -------------------------
  // Interface: submitContactForm
  // -------------------------

  submitContactForm(name, email, subject, message, preferred_contact_method) {
    const submission = {
      id: this._generateId('contact_ticket'),
      name,
      email,
      subject,
      message,
      preferred_contact_method: preferred_contact_method || null,
      created_at: this._nowISOString()
    };

    const submissions = this._getFromStorage('contact_form_submissions', []);
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      ticket_id: submission.id,
      message: 'Your inquiry has been submitted.'
    };
  }

  // -------------------------
  // Interface: getPoliciesContent
  // -------------------------

  getPoliciesContent() {
    const policies = this._getFromStorage('policies_content', {
      privacy_policy_html: '',
      terms_of_use_html: '',
      ticketing_policy_html: '',
      cookie_policy_html: ''
    });
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
