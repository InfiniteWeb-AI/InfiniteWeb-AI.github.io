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
  }

  // ----------------------
  // Storage initialization
  // ----------------------
  _initStorage() {
    const keys = [
      // Core entity tables
      'venues',
      'concerts',
      'ticket_types',
      'carts',
      'cart_items',
      'adult_chorus_applications',
      'volunteer_events',
      'volunteer_roles',
      'volunteer_shifts',
      'volunteer_signups',
      'repertoire_pieces',
      'practice_lists',
      'practice_list_items',
      'youth_programs',
      'youth_program_rehearsal_slots',
      'youth_program_registrations',
      'youth_participants',
      'newsletter_subscriptions',
      'funds',
      'donations',
      'contact_messages'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }

    if (!localStorage.getItem('current_practice_list_id')) {
      localStorage.setItem('current_practice_list_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _getCurrentDateTime() {
    return new Date().toISOString();
  }

  // ----------------------
  // Helper: formatting
  // ----------------------
  _formatPriceRange(min, max) {
    if (min == null && max == null) return '';
    const fmt = (v) => '$' + Number(v).toFixed(2).replace(/\.00$/, '');
    if (max == null || min === max) return fmt(min);
    return fmt(min) + '\u2013' + fmt(max);
  }

  _formatCategoryLabel(category) {
    if (!category) return '';
    return category
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _formatStyleLabel(style) {
    if (!style) return '';
    return style
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _getMonthName(monthIndex) {
    const names = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return names[monthIndex - 1] || '';
  }

  // ----------------------
  // Cart Helpers
  // ----------------------
  _getOrCreateCart() {
    const now = this._getCurrentDateTime();
    let carts = this._getFromStorage('carts');
    let currentId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentId) {
      cart = carts.find((c) => c.id === currentId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    cart.updated_at = this._getCurrentDateTime();
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _buildCartResponse(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const concerts = this._getFromStorage('concerts');
    const ticketTypes = this._getFromStorage('ticket_types');
    const venues = this._getFromStorage('venues');

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      const concert = concerts.find((c) => c.id === ci.concert_id) || null;
      const ticketType = ticketTypes.find((t) => t.id === ci.ticket_type_id) || null;
      const venue = concert
        ? venues.find((v) => v.id === concert.venue_id) || null
        : null;

      return {
        cart_item_id: ci.id,
        concert_id: ci.concert_id,
        concert_title: concert ? concert.title : null,
        start_datetime: concert ? concert.start_datetime : null,
        venue_name: venue ? venue.name : null,
        ticket_type_name: ticketType ? ticketType.name : null,
        seating_type: ticketType ? ticketType.seating_type : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price != null ? ci.total_price : ci.unit_price * ci.quantity
      };
    });

    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

    return {
      cart_id: cart.id,
      items,
      subtotal,
      currency: 'USD'
    };
  }

  // ----------------------
  // Practice List Helpers
  // ----------------------
  _getOrCreatePracticeList() {
    const now = this._getCurrentDateTime();
    let lists = this._getFromStorage('practice_lists');
    let currentId = localStorage.getItem('current_practice_list_id') || '';
    let list = null;

    if (currentId) {
      list = lists.find((l) => l.id === currentId) || null;
    }

    if (!list) {
      list = {
        id: this._generateId('practice_list'),
        name: 'My Practice List',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('practice_lists', lists);
      localStorage.setItem('current_practice_list_id', list.id);
    }

    return list;
  }

  _savePracticeList(list) {
    let lists = this._getFromStorage('practice_lists');
    const idx = lists.findIndex((l) => l.id === list.id);
    list.updated_at = this._getCurrentDateTime();
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('practice_lists', lists);
  }

  // ----------------------
  // Filtering helpers
  // ----------------------
  _filterAndSortConcerts(concerts, filters, sort_by) {
    const {
      start_date,
      end_date,
      month,
      year,
      min_price,
      max_price,
      venue_id,
      category,
      day_of_week,
      only_upcoming
    } = filters || {};

    const now = new Date();

    let result = concerts.slice();

    if (only_upcoming) {
      result = result.filter((c) => new Date(c.start_datetime) >= now);
    }

    if (start_date) {
      const start = new Date(start_date + 'T00:00:00Z');
      result = result.filter((c) => new Date(c.start_datetime) >= start);
    }

    if (end_date) {
      const end = new Date(end_date + 'T23:59:59Z');
      result = result.filter((c) => new Date(c.start_datetime) <= end);
    }

    if (month) {
      result = result.filter((c) => {
        const d = new Date(c.start_datetime);
        return d.getUTCMonth() + 1 === Number(month);
      });
    }

    if (year) {
      result = result.filter((c) => {
        const d = new Date(c.start_datetime);
        return d.getUTCFullYear() === Number(year);
      });
    }

    if (min_price != null) {
      result = result.filter((c) => Number(c.min_ticket_price) >= Number(min_price));
    }

    if (max_price != null) {
      result = result.filter((c) => Number(c.min_ticket_price) <= Number(max_price));
    }

    if (venue_id) {
      result = result.filter((c) => c.venue_id === venue_id);
    }

    if (category) {
      result = result.filter((c) => c.category === category);
    }

    if (day_of_week) {
      result = result.filter((c) => c.day_of_week === day_of_week);
    }

    const sort = sort_by || 'date_asc';

    result.sort((a, b) => {
      switch (sort) {
        case 'date_desc':
          return new Date(b.start_datetime) - new Date(a.start_datetime);
        case 'min_price_asc':
          return Number(a.min_ticket_price) - Number(b.min_ticket_price);
        case 'min_price_desc':
          return Number(b.min_ticket_price) - Number(a.min_ticket_price);
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        default: // 'date_asc'
          return new Date(a.start_datetime) - new Date(b.start_datetime);
      }
    });

    return result;
  }

  _filterVolunteerEventsByMonth(events, filters) {
    const { month, year, only_upcoming } = filters || {};
    const now = new Date();
    let result = events.slice();

    if (only_upcoming) {
      result = result.filter((e) => new Date(e.start_datetime) >= now);
    }

    if (month) {
      result = result.filter((e) => {
        const d = new Date(e.start_datetime);
        return d.getUTCMonth() + 1 === Number(month);
      });
    }

    if (year) {
      result = result.filter((e) => {
        const d = new Date(e.start_datetime);
        return d.getUTCFullYear() === Number(year);
      });
    }

    // Sort chronologically ascending
    result.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    return result;
  }

  _filterYouthPrograms(programs, filters) {
    const {
      child_age,
      min_age,
      max_age,
      rehearsal_day_type,
      rehearsal_days,
      location
    } = filters || {};

    let result = programs.slice();

    if (child_age != null) {
      const ageNum = Number(child_age);
      result = result.filter((p) => ageNum >= Number(p.min_age) && ageNum <= Number(p.max_age));
    }

    if (min_age != null) {
      result = result.filter((p) => Number(p.max_age) >= Number(min_age));
    }

    if (max_age != null) {
      result = result.filter((p) => Number(p.min_age) <= Number(max_age));
    }

    if (rehearsal_day_type) {
      result = result.filter((p) => p.rehearsal_day_type === rehearsal_day_type);
    }

    if (Array.isArray(rehearsal_days) && rehearsal_days.length > 0) {
      result = result.filter((p) => {
        if (!Array.isArray(p.rehearsal_days)) return false;
        return p.rehearsal_days.some((day) => rehearsal_days.indexOf(day) !== -1);
      });
    }

    if (location) {
      const locLower = String(location).toLowerCase();
      result = result.filter((p) =>
        (p.location || '').toLowerCase().indexOf(locLower) !== -1
      );
    }

    return result;
  }

  _sendEmailNotification(/* type, payload */) {
    // Intentionally a no-op in this business-logic-only implementation.
    // In a real system, this would trigger an email via an external service.
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1) getHomePageHighlights
  getHomePageHighlights() {
    const concerts = this._getFromStorage('concerts');
    const venues = this._getFromStorage('venues');
    const now = new Date();

    const upcoming = concerts
      .filter((c) => new Date(c.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 3)
      .map((c) => {
        const venue = venues.find((v) => v.id === c.venue_id) || null;
        const min = c.min_ticket_price;
        const max = c.max_ticket_price != null ? c.max_ticket_price : c.min_ticket_price;
        return {
          concert_id: c.id,
          title: c.title,
          start_datetime: c.start_datetime,
          day_of_week: c.day_of_week,
          venue_name: venue ? venue.name : null,
          category: c.category,
          min_ticket_price: min,
          max_ticket_price: max,
          price_range_label: this._formatPriceRange(min, max)
        };
      });

    const featured_programs = [
      {
        program_type: 'adult_chorus',
        title: 'Adult Community Chorus',
        summary: 'A non-auditioned chorus for adult singers to rehearse weekly and perform seasonally.',
        cta_label: 'Join the Adult Chorus'
      },
      {
        program_type: 'youth_choir',
        title: 'Youth Choir Programs',
        summary: 'Age-appropriate choirs for young singers to develop skills and perform with peers.',
        cta_label: 'Explore Youth Choirs'
      }
    ];

    const announcements = [];

    return {
      featured_concerts: upcoming,
      featured_programs,
      announcements
    };
  }

  // 2) getConcertFilterOptions
  getConcertFilterOptions() {
    const concerts = this._getFromStorage('concerts');
    const venues = this._getFromStorage('venues');

    // date_range_presets: this month & next month
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const pad = (n) => (n < 10 ? '0' + n : '' + n);

    const startThis = `${year}-${pad(month)}-01`;
    const endThis = (() => {
      const d = new Date(Date.UTC(year, month, 0)); // last day of this month
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    })();

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const startNext = `${nextYear}-${pad(nextMonth)}-01`;
    const endNext = (() => {
      const d = new Date(Date.UTC(nextYear, nextMonth, 0));
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    })();

    const date_range_presets = [
      {
        id: 'this_month',
        label: 'This Month',
        start_date: startThis,
        end_date: endThis
      },
      {
        id: 'next_month',
        label: 'Next Month',
        start_date: startNext,
        end_date: endNext
      }
    ];

    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push({ value: m, label: this._getMonthName(m) });
    }

    const yearSet = new Set();
    concerts.forEach((c) => {
      if (c.start_datetime) {
        const d = new Date(c.start_datetime);
        if (!isNaN(d.getTime())) {
          yearSet.add(d.getUTCFullYear());
        }
      }
    });
    const years = Array.from(yearSet).sort((a, b) => a - b);

    const priceVals = concerts.map((c) => Number(c.min_ticket_price)).filter((v) => !isNaN(v));
    const min_price = priceVals.length ? Math.min.apply(null, priceVals) : 0;
    const max_price = priceVals.length ? Math.max.apply(null, priceVals) : 0;

    const categoryEnums = [
      'standard',
      'family_friendly',
      'youth_concert',
      'gala',
      'benefit',
      'holiday',
      'workshop',
      'other'
    ];

    const categories = categoryEnums.map((val) => ({
      value: val,
      label: this._formatCategoryLabel(val)
    }));

    const sort_options = [
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'date_desc', label: 'Date: Latest First' },
      { value: 'min_price_asc', label: 'Ticket Price: Low to High' },
      { value: 'min_price_desc', label: 'Ticket Price: High to Low' },
      { value: 'title_asc', label: 'Title A–Z' }
    ];

    return {
      date_range_presets,
      months,
      years,
      venues,
      categories,
      price: {
        min_price,
        max_price,
        currency: 'USD'
      },
      sort_options
    };
  }

  // 3) getConcerts(filters, sort_by)
  getConcerts(filters, sort_by) {
    const concerts = this._getFromStorage('concerts');
    const venues = this._getFromStorage('venues');

    const filtered = this._filterAndSortConcerts(concerts, filters || {}, sort_by || 'date_asc');

    return filtered.map((c) => {
      const venue = venues.find((v) => v.id === c.venue_id) || null;
      const min = c.min_ticket_price;
      const max = c.max_ticket_price != null ? c.max_ticket_price : c.min_ticket_price;
      return {
        concert_id: c.id,
        title: c.title,
        description_snippet: c.description ? String(c.description).slice(0, 160) : '',
        start_datetime: c.start_datetime,
        end_datetime: c.end_datetime || null,
        day_of_week: c.day_of_week,
        venue,
        category: c.category,
        category_label: this._formatCategoryLabel(c.category),
        min_ticket_price: min,
        max_ticket_price: max,
        price_range_label: this._formatPriceRange(min, max)
      };
    });
  }

  // 4) getConcertDetail(concertId)
  getConcertDetail(concertId) {
    const concerts = this._getFromStorage('concerts');
    const venues = this._getFromStorage('venues');
    const ticketTypes = this._getFromStorage('ticket_types');

    const concertRaw = concerts.find((c) => c.id === concertId) || null;

    if (!concertRaw) {
      return {
        concert: null,
        ticket_types: []
      };
    }

    const venue = venues.find((v) => v.id === concertRaw.venue_id) || null;

    const concert = {
      id: concertRaw.id,
      title: concertRaw.title,
      description: concertRaw.description || '',
      start_datetime: concertRaw.start_datetime,
      end_datetime: concertRaw.end_datetime || null,
      day_of_week: concertRaw.day_of_week,
      category: concertRaw.category,
      category_label: this._formatCategoryLabel(concertRaw.category),
      venue,
      min_ticket_price: concertRaw.min_ticket_price,
      max_ticket_price:
        concertRaw.max_ticket_price != null
          ? concertRaw.max_ticket_price
          : concertRaw.min_ticket_price
    };

    const ticket_types = ticketTypes
      .filter((t) => t.concert_id === concertId)
      .map((t) => ({
        id: t.id,
        name: t.name,
        seating_type: t.seating_type,
        price: t.price,
        is_active: !!t.is_active
      }));

    return { concert, ticket_types };
  }

  // 5) addTicketsToCart(concertId, ticketTypeId, quantity)
  addTicketsToCart(concertId, ticketTypeId, quantity) {
    const qty = Number(quantity);
    if (!concertId || !ticketTypeId || !qty || qty <= 0) {
      return {
        success: false,
        message: 'Invalid concert, ticket type, or quantity.',
        cart: null,
        added_item: null
      };
    }

    const concerts = this._getFromStorage('concerts');
    const ticketTypes = this._getFromStorage('ticket_types');
    let cartItems = this._getFromStorage('cart_items');

    const concert = concerts.find((c) => c.id === concertId) || null;
    if (!concert) {
      return {
        success: false,
        message: 'Concert not found.',
        cart: null,
        added_item: null
      };
    }

    const ticketType = ticketTypes.find((t) => t.id === ticketTypeId) || null;
    if (!ticketType || ticketType.concert_id !== concertId || !ticketType.is_active) {
      return {
        success: false,
        message: 'Ticket type not available for this concert.',
        cart: null,
        added_item: null
      };
    }

    const cart = this._getOrCreateCart();

    const existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.concert_id === concertId && ci.ticket_type_id === ticketTypeId
    );

    const now = this._getCurrentDateTime();

    let addedItem;
    if (existing) {
      existing.quantity = Number(existing.quantity) + qty;
      existing.unit_price = ticketType.price;
      existing.total_price = existing.quantity * ticketType.price;
      existing.added_at = now;
      addedItem = existing;
    } else {
      addedItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        concert_id: concertId,
        ticket_type_id: ticketTypeId,
        quantity: qty,
        unit_price: ticketType.price,
        total_price: ticketType.price * qty,
        added_at: now
      };
      cartItems.push(addedItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Tickets added to cart.',
      cart: cartResponse,
      added_item: {
        cart_item_id: addedItem.id,
        concert_id: addedItem.concert_id,
        ticket_type_id: addedItem.ticket_type_id,
        quantity: addedItem.quantity,
        unit_price: addedItem.unit_price,
        total_price: addedItem.total_price
      }
    };
  }

  // 6) getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    return this._buildCartResponse(cart);
  }

  // 7) updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = Number(quantity);
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null,
        updated_item: null
      };
    }

    const item = cartItems[itemIndex];
    const cartId = item.cart_id;

    let updatedQuantity = qty;

    if (!qty || qty <= 0) {
      // Remove item
      cartItems.splice(itemIndex, 1);
      updatedQuantity = 0;
    } else {
      item.quantity = qty;
      item.total_price = item.unit_price * qty;
      cartItems[itemIndex] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    this._saveCart(cart);

    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      message: updatedQuantity === 0 ? 'Cart item removed.' : 'Cart item updated.',
      cart: cartResponse,
      updated_item: {
        cart_item_id: cartItemId,
        quantity: updatedQuantity
      }
    };
  }

  // 8) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    const item = cartItems[itemIndex];
    const cartId = item.cart_id;

    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    this._saveCart(cart);

    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Cart item removed.',
      cart: cartResponse
    };
  }

  // 9) getJoinOverviewContent()
  getJoinOverviewContent() {
    return {
      adult_chorus: {
        title: 'Adult Community Chorus',
        summary: 'A welcoming non-auditioned ensemble for adult singers of all backgrounds.',
        rehearsal_overview: 'Weekly evening rehearsals during the concert season with 2–3 main performances.'
      },
      youth_programs: {
        title: 'Youth Choirs',
        summary: 'Age-appropriate choirs where children and teens learn healthy vocal technique and musicianship.'
      },
      benefits: [
        'Sing in a supportive community of music-lovers.',
        'Perform in beautiful venues with live audiences.',
        'Build musicianship, confidence, and friendships.'
      ],
      expectations: [
        'Attend rehearsals regularly and arrive on time.',
        'Practice your music between rehearsals.',
        'Communicate proactively if you must miss a rehearsal.'
      ]
    };
  }

  // 10) getAdultChorusInfo()
  getAdultChorusInfo() {
    const voice_parts = [
      { value: 'soprano', label: 'Soprano' },
      { value: 'alto', label: 'Alto' },
      { value: 'tenor', label: 'Tenor' },
      { value: 'bass', label: 'Bass' },
      { value: 'mezzo_soprano', label: 'Mezzo-soprano' },
      { value: 'baritone', label: 'Baritone' },
      { value: 'other', label: 'Other / Not sure' }
    ];

    const rehearsal_availability_options = [
      { value: 'monday_evening', label: 'Monday evening' },
      { value: 'tuesday_evening', label: 'Tuesday evening' },
      { value: 'wednesday_evening', label: 'Wednesday evening' },
      { value: 'thursday_evening', label: 'Thursday evening' },
      { value: 'friday_evening', label: 'Friday evening' },
      { value: 'saturday_morning', label: 'Saturday morning' },
      { value: 'Sunday_afternoon', label: 'Sunday afternoon' }
    ].map((opt) => {
      // ensure enum casing: sunday_afternoon
      if (opt.value === 'Sunday_afternoon') {
        return { value: 'sunday_afternoon', label: opt.label };
      }
      return opt;
    });

    return {
      name: 'Adult Community Chorus',
      description:
        'The Adult Community Chorus welcomes singers from across the community to rehearse weekly and present concerts throughout the year.',
      rehearsal_schedule: 'Weekly evening rehearsals during the concert season.',
      audition_required: false,
      location: 'Central rehearsal space (details provided after registration).',
      voice_parts,
      rehearsal_availability_options,
      guidelines_summary:
        'Members are expected to attend rehearsals regularly, practice at home, and follow our community guidelines for respect and inclusion.'
    };
  }

  // 11) submitAdultChorusApplication(...)
  submitAdultChorusApplication(
    full_name,
    email,
    voice_part,
    rehearsal_availability,
    years_choral_experience,
    experience_description,
    agreed_to_guidelines
  ) {
    if (!full_name || !email || !voice_part || !Array.isArray(rehearsal_availability)) {
      return {
        success: false,
        application_id: null,
        submitted_at: null,
        message: 'Missing required fields.'
      };
    }

    if (!agreed_to_guidelines) {
      return {
        success: false,
        application_id: null,
        submitted_at: null,
        message: 'You must agree to the chorus guidelines to apply.'
      };
    }

    const allowedVoiceParts = [
      'soprano',
      'alto',
      'tenor',
      'bass',
      'mezzo_soprano',
      'baritone',
      'other'
    ];

    if (allowedVoiceParts.indexOf(voice_part) === -1) {
      return {
        success: false,
        application_id: null,
        submitted_at: null,
        message: 'Invalid voice part.'
      };
    }

    const allowedAvailability = [
      'monday_evening',
      'tuesday_evening',
      'wednesday_evening',
      'thursday_evening',
      'friday_evening',
      'saturday_morning',
      'sunday_afternoon'
    ];

    const invalidAvail = rehearsal_availability.some(
      (slot) => allowedAvailability.indexOf(slot) === -1
    );

    if (invalidAvail) {
      return {
        success: false,
        application_id: null,
        submitted_at: null,
        message: 'Invalid rehearsal availability option.'
      };
    }

    const apps = this._getFromStorage('adult_chorus_applications');

    const submitted_at = this._getCurrentDateTime();
    const app = {
      id: this._generateId('adult_app'),
      full_name,
      email,
      voice_part,
      rehearsal_availability: rehearsal_availability.slice(),
      years_choral_experience: Number(years_choral_experience) || 0,
      experience_description: experience_description || '',
      agreed_to_guidelines: !!agreed_to_guidelines,
      submitted_at
    };

    apps.push(app);
    this._saveToStorage('adult_chorus_applications', apps);

    return {
      success: true,
      application_id: app.id,
      submitted_at,
      message: 'Application submitted successfully.'
    };
  }

  // 12) getProgramsOverviewContent()
  getProgramsOverviewContent() {
    return {
      adult_chorus: {
        title: 'Adult Community Chorus',
        summary: 'A non-auditioned choir for adults who love to sing and perform choral music.'
      },
      youth_choir: {
        title: 'Youth Choir Programs',
        summary: 'Multiple ensembles for children and teens, grouped by age and experience.'
      },
      other_programs: []
    };
  }

  // 13) getYouthProgramFilterOptions()
  getYouthProgramFilterOptions() {
    const programs = this._getFromStorage('youth_programs');

    // Derive age ranges from programs
    const rangeMap = new Map();
    programs.forEach((p) => {
      const key = `${p.min_age}-${p.max_age}`;
      if (!rangeMap.has(key)) {
        rangeMap.set(key, {
          min_age: p.min_age,
          max_age: p.max_age,
          label: p.age_label || `${p.min_age}-${p.max_age}`
        });
      }
    });
    const age_ranges = Array.from(rangeMap.values()).sort((a, b) => a.min_age - b.min_age);

    const rehearsal_day_types = [
      { value: 'weekday', label: 'Weekday' },
      { value: 'weekend', label: 'Weekend' },
      { value: 'mixed', label: 'Mixed' }
    ];

    const daysEnum = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];

    const rehearsal_days = daysEnum.map((d) => ({
      value: d,
      label: d.charAt(0).toUpperCase() + d.slice(1)
    }));

    return {
      age_ranges,
      rehearsal_day_types,
      rehearsal_days
    };
  }

  // 14) getYouthPrograms(filters)
  getYouthPrograms(filters) {
    const programs = this._getFromStorage('youth_programs');
    const filtered = this._filterYouthPrograms(programs, filters || {});

    const child_age = filters && filters.child_age != null ? Number(filters.child_age) : null;

    return filtered.map((p) => {
      const suitable =
        child_age != null &&
        child_age >= Number(p.min_age) &&
        child_age <= Number(p.max_age);

      return {
        program_id: p.id,
        name: p.name,
        description: p.description || '',
        min_age: p.min_age,
        max_age: p.max_age,
        age_label: p.age_label || `${p.min_age}-${p.max_age}`,
        rehearsal_days: Array.isArray(p.rehearsal_days) ? p.rehearsal_days.slice() : [],
        rehearsal_day_type: p.rehearsal_day_type || null,
        location: p.location || '',
        suitable_for_child: !!suitable
      };
    });
  }

  // 15) getYouthProgramDetail(youthProgramId)
  getYouthProgramDetail(youthProgramId) {
    const programs = this._getFromStorage('youth_programs');
    const program = programs.find((p) => p.id === youthProgramId) || null;

    if (!program) {
      return {
        program: null,
        rehearsal_schedule_description: '',
        location_details: '',
        registration_open: false
      };
    }

    const days = Array.isArray(program.rehearsal_days) ? program.rehearsal_days : [];
    const dayLabels = days.map((d) => d.charAt(0).toUpperCase() + d.slice(1));
    const rehearsal_schedule_description = dayLabels.length
      ? `Rehearsals on ${dayLabels.join(', ')}.`
      : 'Rehearsal schedule to be announced.';

    const location_details = program.location || 'Location details provided after registration.';

    return {
      program,
      rehearsal_schedule_description,
      location_details,
      registration_open: true
    };
  }

  // 16) getYouthProgramRehearsalSlots(youthProgramId)
  getYouthProgramRehearsalSlots(youthProgramId) {
    const slots = this._getFromStorage('youth_program_rehearsal_slots');
    const programs = this._getFromStorage('youth_programs');

    return slots
      .filter((s) => s.youth_program_id === youthProgramId)
      .map((s) => {
        const program = programs.find((p) => p.id === s.youth_program_id) || null;
        return Object.assign({}, s, { youth_program: program });
      });
  }

  // 17) createYouthProgramRegistration(...)
  createYouthProgramRegistration(
    youthProgramId,
    rehearsalSlotId,
    participant_count,
    participants
  ) {
    const programs = this._getFromStorage('youth_programs');
    const slots = this._getFromStorage('youth_program_rehearsal_slots');
    let registrations = this._getFromStorage('youth_program_registrations');
    let youthParticipants = this._getFromStorage('youth_participants');

    const program = programs.find((p) => p.id === youthProgramId) || null;
    if (!program) {
      return {
        success: false,
        registration: null,
        message: 'Youth program not found.'
      };
    }

    const slot = slots.find((s) => s.id === rehearsalSlotId) || null;
    if (!slot || slot.youth_program_id !== youthProgramId) {
      return {
        success: false,
        registration: null,
        message: 'Rehearsal slot not found for this program.'
      };
    }

    const count = Number(participant_count) || 0;

    if (!Array.isArray(participants) || participants.length !== count || count <= 0) {
      return {
        success: false,
        registration: null,
        message: 'Participant information is incomplete or invalid.'
      };
    }

    const created_at = this._getCurrentDateTime();
    const registrationId = this._generateId('youth_reg');

    const registrationRecord = {
      id: registrationId,
      youth_program_id: youthProgramId,
      rehearsal_slot_id: rehearsalSlotId,
      participant_count: count,
      created_at
    };

    registrations.push(registrationRecord);
    this._saveToStorage('youth_program_registrations', registrations);

    const participantRecords = participants.map((p) => {
      const rec = {
        id: this._generateId('youth_participant'),
        youth_program_registration_id: registrationId,
        full_name: p.full_name,
        age: p.age != null ? Number(p.age) : null,
        grade: p.grade || null
      };
      youthParticipants.push(rec);
      return rec;
    });

    this._saveToStorage('youth_participants', youthParticipants);

    const slotWithProgram = Object.assign({}, slot, { youth_program: program });

    return {
      success: true,
      registration: {
        registration_id: registrationId,
        youth_program_id: youthProgramId,
        rehearsal_slot: slotWithProgram,
        participant_count: count,
        participants: participantRecords,
        created_at
      },
      message: 'Registration created successfully.'
    };
  }

  // 18) getVolunteerOverviewContent()
  getVolunteerOverviewContent() {
    return {
      overview:
        'Volunteers are essential to our concerts and events. Ushers, greeters, and other helpers make every performance welcoming and smooth.',
      common_roles: [
        'Ushers to welcome guests and help them find seats.',
        'Greeters at the lobby and ticket tables.',
        'Backstage helpers to assist with logistics.'
      ],
      benefits: [
        'Enjoy concerts while supporting the chorus.',
        'Meet other music-lovers in the community.',
        'Earn volunteer service hours where applicable.'
      ]
    };
  }

  // 19) getVolunteerEventFilterOptions()
  getVolunteerEventFilterOptions() {
    const events = this._getFromStorage('volunteer_events');

    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push({ value: m, label: this._getMonthName(m) });
    }

    const yearSet = new Set();
    events.forEach((e) => {
      if (e.start_datetime) {
        const d = new Date(e.start_datetime);
        if (!isNaN(d.getTime())) {
          yearSet.add(d.getUTCFullYear());
        }
      }
    });
    const years = Array.from(yearSet).sort((a, b) => a - b);

    return { months, years };
  }

  // 20) getVolunteerEvents(filters)
  getVolunteerEvents(filters) {
    const events = this._getFromStorage('volunteer_events');
    const roles = this._getFromStorage('volunteer_roles');
    const concerts = this._getFromStorage('concerts');

    const filtered = this._filterVolunteerEventsByMonth(events, filters || {});

    return filtered.map((e) => {
      const concert = e.concert_id
        ? concerts.find((c) => c.id === e.concert_id) || null
        : null;

      const has_usher_roles = roles.some(
        (r) => r.volunteer_event_id === e.id && r.role_type === 'usher'
      );

      return {
        event_id: e.id,
        name: e.name,
        description: e.description || '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime || null,
        day_of_week: e.day_of_week,
        location: e.location || '',
        concert: concert
          ? {
              concert_id: concert.id,
              concert_title: concert.title,
              concert_start_datetime: concert.start_datetime
            }
          : null,
        has_usher_roles
      };
    });
  }

  // 21) getVolunteerEventDetail(volunteerEventId)
  getVolunteerEventDetail(volunteerEventId) {
    const events = this._getFromStorage('volunteer_events');
    const roles = this._getFromStorage('volunteer_roles');
    const shifts = this._getFromStorage('volunteer_shifts');
    const concerts = this._getFromStorage('concerts');

    const eventRaw = events.find((e) => e.id === volunteerEventId) || null;

    if (!eventRaw) {
      return {
        event: null,
        roles: []
      };
    }

    const concert = eventRaw.concert_id
      ? concerts.find((c) => c.id === eventRaw.concert_id) || null
      : null;

    const event = Object.assign({}, eventRaw, { concert });

    const rolesForEvent = roles.filter((r) => r.volunteer_event_id === volunteerEventId);

    const roleDetails = rolesForEvent.map((role) => {
      const shiftsForRole = shifts.filter((s) => s.volunteer_role_id === role.id);
      const shiftDetails = shiftsForRole.map((shift) => {
        const capacity = shift.capacity != null ? Number(shift.capacity) : null;
        const signedUp = shift.signed_up_count != null ? Number(shift.signed_up_count) : 0;
        const spots_remaining = capacity != null ? Math.max(capacity - signedUp, 0) : null;
        const is_full = capacity != null && signedUp >= capacity;

        const start = shift.start_datetime ? new Date(shift.start_datetime) : null;
        const end = shift.end_datetime ? new Date(shift.end_datetime) : null;
        const timeLabel = start
          ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) +
            (end
              ? '–' +
                end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : '')
          : '';

        const label = `${role.role_type.replace('_', ' ')} (${timeLabel})`;

        const roleWithEvent = Object.assign({}, role, { volunteer_event: event });

        return {
          shift: Object.assign({}, shift, { volunteer_role: roleWithEvent }),
          spots_remaining,
          is_full,
          label
        };
      });

      return {
        role: Object.assign({}, role, { volunteer_event: event }),
        shifts: shiftDetails
      };
    });

    return {
      event,
      roles: roleDetails
    };
  }

  // 22) signUpForVolunteerShift(volunteerShiftId, full_name, email, contact_preference)
  signUpForVolunteerShift(volunteerShiftId, full_name, email, contact_preference) {
    if (!volunteerShiftId || !full_name || !email) {
      return {
        success: false,
        signup: null,
        shift: null,
        event: null,
        message: 'Missing required fields.'
      };
    }

    const shifts = this._getFromStorage('volunteer_shifts');
    const roles = this._getFromStorage('volunteer_roles');
    const events = this._getFromStorage('volunteer_events');

    let shift = shifts.find((s) => s.id === volunteerShiftId) || null;
    if (!shift) {
      return {
        success: false,
        signup: null,
        shift: null,
        event: null,
        message: 'Volunteer shift not found.'
      };
    }

    const capacity = shift.capacity != null ? Number(shift.capacity) : null;
    const signedUp = shift.signed_up_count != null ? Number(shift.signed_up_count) : 0;

    if (capacity != null && signedUp >= capacity) {
      return {
        success: false,
        signup: null,
        shift,
        event: null,
        message: 'This shift is already full.'
      };
    }

    let signups = this._getFromStorage('volunteer_signups');

    const created_at = this._getCurrentDateTime();
    const signupRecord = {
      id: this._generateId('vol_signup'),
      volunteer_shift_id: volunteerShiftId,
      full_name,
      email,
      contact_preference: contact_preference || null,
      created_at
    };

    signups.push(signupRecord);
    this._saveToStorage('volunteer_signups', signups);

    // Update shift signed_up_count
    shift.signed_up_count = signedUp + 1;
    const shiftIndex = shifts.findIndex((s) => s.id === volunteerShiftId);
    if (shiftIndex >= 0) {
      shifts[shiftIndex] = shift;
      this._saveToStorage('volunteer_shifts', shifts);
    }

    const role = roles.find((r) => r.id === shift.volunteer_role_id) || null;
    const event = role
      ? events.find((e) => e.id === role.volunteer_event_id) || null
      : null;

    const roleWithEvent = role && event ? Object.assign({}, role, { volunteer_event: event }) : role;
    const shiftWithRole = Object.assign({}, shift, { volunteer_role: roleWithEvent });

    this._sendEmailNotification('volunteer_signup', {
      signup: signupRecord,
      shift: shiftWithRole,
      event
    });

    return {
      success: true,
      signup: signupRecord,
      shift: shiftWithRole,
      event,
      message: 'Volunteer shift sign-up confirmed.'
    };
  }

  // 23) getRepertoireFilterOptions()
  getRepertoireFilterOptions() {
    const pieces = this._getFromStorage('repertoire_pieces');
    const years = pieces
      .map((p) => p.year_composed)
      .filter((y) => typeof y === 'number' && !isNaN(y));

    const min_year = years.length ? Math.min.apply(null, years) : null;
    const max_year = years.length ? Math.max.apply(null, years) : null;

    const styleEnums = [
      'classical',
      'contemporary',
      'jazz',
      'folk',
      'holiday',
      'pop',
      'sacred',
      'other'
    ];

    const styles = styleEnums.map((val) => ({
      value: val,
      label: this._formatStyleLabel(val)
    }));

    return { min_year, max_year, styles };
  }

  // 24) getRepertoirePieces(filters, sort_by)
  getRepertoirePieces(filters, sort_by) {
    const pieces = this._getFromStorage('repertoire_pieces');
    const f = filters || {};

    let result = pieces.slice();

    if (f.min_year != null) {
      result = result.filter((p) => Number(p.year_composed) >= Number(f.min_year));
    }

    if (f.max_year != null) {
      result = result.filter((p) => Number(p.year_composed) <= Number(f.max_year));
    }

    if (f.style) {
      result = result.filter((p) => p.style === f.style);
    }

    if (f.title_query) {
      const q = String(f.title_query).toLowerCase();
      result = result.filter((p) => (p.title || '').toLowerCase().indexOf(q) !== -1);
    }

    const sort = sort_by || 'title_asc';

    result.sort((a, b) => {
      switch (sort) {
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'year_asc':
          return (a.year_composed || 0) - (b.year_composed || 0);
        case 'year_desc':
          return (b.year_composed || 0) - (a.year_composed || 0);
        default: // 'title_asc'
          return (a.title || '').localeCompare(b.title || '');
      }
    });

    return result.map((p) => ({
      piece_id: p.id,
      title: p.title,
      composer: p.composer || '',
      year_composed: p.year_composed || null,
      style: p.style,
      style_label: this._formatStyleLabel(p.style),
      description_snippet: p.description ? String(p.description).slice(0, 200) : ''
    }));
  }

  // 25) getRepertoirePieceDetail(repertoirePieceId)
  getRepertoirePieceDetail(repertoirePieceId) {
    const pieces = this._getFromStorage('repertoire_pieces');
    const piece = pieces.find((p) => p.id === repertoirePieceId) || null;

    return {
      piece,
      notes: ''
    };
  }

  // 26) addPieceToPracticeList(repertoirePieceId)
  addPieceToPracticeList(repertoirePieceId) {
    const pieces = this._getFromStorage('repertoire_pieces');
    let items = this._getFromStorage('practice_list_items');

    const piece = pieces.find((p) => p.id === repertoirePieceId) || null;
    if (!piece) {
      return {
        success: false,
        practice_list: null,
        added_item: null,
        message: 'Repertoire piece not found.'
      };
    }

    const list = this._getOrCreatePracticeList();

    const existing = items.find(
      (it) => it.practice_list_id === list.id && it.repertoire_piece_id === repertoirePieceId
    );

    if (existing) {
      return {
        success: true,
        practice_list: list,
        added_item: existing,
        message: 'Piece is already in the practice list.'
      };
    }

    const item = {
      id: this._generateId('practice_item'),
      practice_list_id: list.id,
      repertoire_piece_id: repertoirePieceId,
      added_at: this._getCurrentDateTime()
    };

    items.push(item);
    this._saveToStorage('practice_list_items', items);
    this._savePracticeList(list);

    return {
      success: true,
      practice_list: list,
      added_item: item,
      message: 'Piece added to practice list.'
    };
  }

  // 27) getPracticeList()
  getPracticeList() {
    const list = this._getOrCreatePracticeList();
    const items = this._getFromStorage('practice_list_items');
    const pieces = this._getFromStorage('repertoire_pieces');

    const itemsForList = items.filter((it) => it.practice_list_id === list.id);

    const resultItems = itemsForList.map((it) => {
      const piece = pieces.find((p) => p.id === it.repertoire_piece_id) || null;
      return {
        practice_list_item: it,
        piece
      };
    });

    return {
      practice_list: list,
      items: resultItems
    };
  }

  // 28) removePracticeListItem(practiceListItemId)
  removePracticeListItem(practiceListItemId) {
    let items = this._getFromStorage('practice_list_items');
    const index = items.findIndex((it) => it.id === practiceListItemId);

    if (index === -1) {
      return {
        success: false,
        practice_list: null,
        message: 'Practice list item not found.'
      };
    }

    const item = items[index];
    const listId = item.practice_list_id;

    items.splice(index, 1);
    this._saveToStorage('practice_list_items', items);

    const lists = this._getFromStorage('practice_lists');
    const list = lists.find((l) => l.id === listId) || this._getOrCreatePracticeList();
    this._savePracticeList(list);

    return {
      success: true,
      practice_list: list,
      message: 'Practice list item removed.'
    };
  }

  // 29) getDonationOptions()
  getDonationOptions() {
    const funds = this._getFromStorage('funds').filter((f) => !!f.is_active);

    const suggested_amounts = [
      { amount: 25, label: '$25 – Support a rehearsal' },
      { amount: 35, label: '$35 – Sponsor a singer' },
      { amount: 50, label: '$50 – Support music purchase' }
    ];

    return { funds, suggested_amounts };
  }

  // 30) submitDonation(...)
  submitDonation(
    donation_type,
    amount,
    fundId,
    donor_first_name,
    donor_last_name,
    recognition_name,
    allow_postal_mail
  ) {
    const allowedTypes = ['one_time', 'recurring'];
    if (allowedTypes.indexOf(donation_type) === -1) {
      return {
        success: false,
        donation: null,
        fund: null,
        message: 'Invalid donation type.'
      };
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return {
        success: false,
        donation: null,
        fund: null,
        message: 'Invalid donation amount.'
      };
    }

    const funds = this._getFromStorage('funds');
    let donations = this._getFromStorage('donations');

    const fund = funds.find((f) => f.id === fundId && !!f.is_active) || null;
    if (!fund) {
      return {
        success: false,
        donation: null,
        fund: null,
        message: 'Selected fund not found or inactive.'
      };
    }

    const created_at = this._getCurrentDateTime();
    const donationRecord = {
      id: this._generateId('donation'),
      amount: amt,
      donation_type,
      fund_id: fundId,
      donor_first_name: donor_first_name || '',
      donor_last_name: donor_last_name || '',
      recognition_name: recognition_name || '',
      allow_postal_mail: allow_postal_mail != null ? !!allow_postal_mail : false,
      created_at
    };

    donations.push(donationRecord);
    this._saveToStorage('donations', donations);

    this._sendEmailNotification('donation_submitted', {
      donation: donationRecord,
      fund
    });

    return {
      success: true,
      donation: donationRecord,
      fund,
      message: 'Donation submitted successfully.'
    };
  }

  // 31) getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const interests = [
      {
        value: 'concert_updates',
        label: 'Concert Updates',
        description: 'Dates, programs, and ticket information for upcoming concerts.'
      },
      {
        value: 'volunteer_opportunities',
        label: 'Volunteer Opportunities',
        description: 'Calls for ushers, greeters, and other volunteer roles.'
      },
      {
        value: 'youth_programs',
        label: 'Youth Programs',
        description: 'News about youth choir offerings and registrations.'
      },
      {
        value: 'fundraising_campaigns',
        label: 'Fundraising Campaigns',
        description: 'Information on special fundraising efforts.'
      },
      {
        value: 'general_news',
        label: 'General News',
        description: 'Season highlights, stories, and announcements.'
      }
    ];

    const email_frequencies = [
      { value: 'immediate', label: 'As soon as there is news' },
      { value: 'daily', label: 'Daily digest' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' }
    ];

    const delivery_methods = [
      { value: 'email_only', label: 'Email only' },
      { value: 'postal_mail', label: 'Postal mail only' },
      { value: 'email_and_postal', label: 'Email and postal mail' }
    ];

    return { interests, email_frequencies, delivery_methods };
  }

  // 32) subscribeToNewsletter(...)
  subscribeToNewsletter(
    full_name,
    email,
    interests,
    email_frequency,
    delivery_method,
    consent_to_emails
  ) {
    if (!full_name || !email || !Array.isArray(interests) || interests.length === 0) {
      return {
        success: false,
        subscription: null,
        message: 'Missing required fields.'
      };
    }

    if (!consent_to_emails) {
      return {
        success: false,
        subscription: null,
        message: 'You must consent to receive emails to subscribe.'
      };
    }

    const allowedFrequencies = ['immediate', 'daily', 'weekly', 'monthly', 'quarterly'];
    if (allowedFrequencies.indexOf(email_frequency) === -1) {
      return {
        success: false,
        subscription: null,
        message: 'Invalid email frequency.'
      };
    }

    const allowedMethods = ['email_only', 'postal_mail', 'email_and_postal'];
    if (allowedMethods.indexOf(delivery_method) === -1) {
      return {
        success: false,
        subscription: null,
        message: 'Invalid delivery method.'
      };
    }

    let subs = this._getFromStorage('newsletter_subscriptions');

    const created_at = this._getCurrentDateTime();
    const subscription = {
      id: this._generateId('newsletter_sub'),
      full_name,
      email,
      interests: interests.slice(),
      email_frequency,
      delivery_method,
      consent_to_emails: !!consent_to_emails,
      created_at
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Subscription saved successfully.'
    };
  }

  // 33) getContactFormOptions()
  getContactFormOptions() {
    const concerts = this._getFromStorage('concerts');
    const venues = this._getFromStorage('venues');
    const now = new Date();

    const subjects = [
      { value: 'accessibility_question', label: 'Accessibility Question' },
      { value: 'general_inquiry', label: 'General Inquiry' },
      { value: 'ticketing', label: 'Ticketing' },
      { value: 'volunteering', label: 'Volunteering' },
      { value: 'youth_programs', label: 'Youth Programs' },
      { value: 'donations', label: 'Donations' },
      { value: 'other', label: 'Other' }
    ];

    const upcomingConcerts = concerts
      .filter((c) => new Date(c.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const events = upcomingConcerts.map((c) => {
      const venue = venues.find((v) => v.id === c.venue_id) || null;
      return {
        concert_id: c.id,
        title: c.title,
        start_datetime: c.start_datetime,
        venue_name: venue ? venue.name : null,
        is_downtown: venue ? !!venue.is_downtown : false
      };
    });

    return { subjects, events };
  }

  // 34) sendContactMessage(...)
  sendContactMessage(subject, message, full_name, email, concertId) {
    if (!subject || !message || !full_name || !email) {
      return {
        success: false,
        contact_message: null,
        message: 'Missing required fields.'
      };
    }

    const allowedSubjects = [
      'accessibility_question',
      'general_inquiry',
      'ticketing',
      'volunteering',
      'youth_programs',
      'donations',
      'other'
    ];

    if (allowedSubjects.indexOf(subject) === -1) {
      return {
        success: false,
        contact_message: null,
        message: 'Invalid subject.'
      };
    }

    const concerts = this._getFromStorage('concerts');
    const concert = concertId
      ? concerts.find((c) => c.id === concertId) || null
      : null;

    let messages = this._getFromStorage('contact_messages');

    const created_at = this._getCurrentDateTime();
    const msgRecord = {
      id: this._generateId('contact'),
      subject,
      message,
      full_name,
      email,
      concert_id: concert ? concert.id : null,
      created_at
    };

    messages.push(msgRecord);
    this._saveToStorage('contact_messages', messages);

    this._sendEmailNotification('contact_message', {
      contact_message: msgRecord,
      concert
    });

    return {
      success: true,
      contact_message: msgRecord,
      message: 'Your message has been sent.'
    };
  }

  // 35) getAboutPageContent()
  getAboutPageContent() {
    const venues = this._getFromStorage('venues');

    const mission_statement =
      'Our community chorus brings singers of all ages and backgrounds together to share the joy of choral music.';

    const history =
      'Founded by local singers and educators, the chorus has grown into a vibrant musical community presenting concerts throughout the year.';

    const leadership = [
      {
        name: 'Artistic Director',
        role: 'Artistic Director',
        bio: 'Leads the musical vision of the chorus and conducts major performances.'
      },
      {
        name: 'Executive Director',
        role: 'Executive Director',
        bio: 'Oversees operations, community partnerships, and organizational leadership.'
      }
    ];

    const accessibility_commitment =
      'We are committed to making our programs and concerts accessible to all. For specific questions about venues or accommodations, please contact us.';

    return {
      mission_statement,
      history,
      leadership,
      venues_overview: venues,
      accessibility_commitment
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
