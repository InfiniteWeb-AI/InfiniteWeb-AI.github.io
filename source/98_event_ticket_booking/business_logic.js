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

  // ----------------------
  // Initialization & utils
  // ----------------------

  _initStorage() {
    // Helper to init if missing
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables (arrays)
    ensure('categories', []); // Category
    ensure('cities', []); // City
    ensure('venues', []); // Venue
    ensure('events', []); // Event
    ensure('ticket_types', []); // TicketType
    ensure('seat_sections', []); // SeatSection
    ensure('seats', []); // Seat
    ensure('cart_items', []); // CartItem
    ensure('promo_codes', []); // PromoCode
    ensure('orders', []); // Order
    ensure('order_items', []); // OrderItem
    ensure('profiles', []); // Profile (single-user demo)

    // Single cart and checkout draft (objects or null)
    if (localStorage.getItem('cart') === null) {
      localStorage.setItem('cart', JSON.stringify(null));
    }
    if (localStorage.getItem('checkout_draft') === null) {
      localStorage.setItem('checkout_draft', JSON.stringify(null));
    }

    // Content tables (objects)
    ensure('help_content', {
      search_and_filters: '',
      seat_map_and_sections: '',
      ticket_types_and_pricing: '',
      delivery_methods: '',
      promo_codes: '',
      support_instructions: ''
    });

    ensure('about_content', {
      headline: '',
      body: '',
      security_and_satisfaction: ''
    });

    ensure('contact_channels', {
      support_email: '',
      support_phone: '',
      support_hours: ''
    });

    ensure('terms_content', {
      last_updated: '',
      body: ''
    });

    ensure('privacy_content', {
      last_updated: '',
      body: ''
    });

    // Contact form submissions (for support_ticket_id tracking)
    ensure('contact_form_submissions', []);

    // Global numeric id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed === null && defaultValue !== undefined) return defaultValue;
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    // Expecting 'YYYY-MM-DD'
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00Z');
  }

  _getDatePart(dateTimeStr) {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') return '';
    // ISO-like 'YYYY-MM-DDTHH:mm...'
    return dateTimeStr.slice(0, 10);
  }

  _getTimePart(dateTimeStr) {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') return '';
    // ISO-like 'YYYY-MM-DDTHH:mm...'
    const tIndex = dateTimeStr.indexOf('T');
    if (tIndex === -1) return '';
    return dateTimeStr.slice(tIndex + 1, tIndex + 6); // 'HH:mm'
  }

  _compareTimeStrings(t1, t2) {
    // 'HH:mm' lexicographic compare works
    if (!t1 || !t2) return 0;
    if (t1 < t2) return -1;
    if (t1 > t2) return 1;
    return 0;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const now = this._nowISO();
      cart = {
        id: this._generateId('cart'),
        items: [], // not used directly; items are in cart_items table
        created_at: now,
        updated_at: now,
        currency: 'usd',
        subtotal: 0,
        fees_total: 0,
        discount_total: 0,
        total: 0
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _getCartItems(cartId) {
    const allItems = this._getFromStorage('cart_items', []);
    return allItems.filter(function (ci) { return ci.cart_id === cartId; });
  }

  _recalculateCartTotals(cart, allCartItems) {
    if (!cart) return;
    const cartItems = (allCartItems || this._getFromStorage('cart_items', [])).filter(function (ci) {
      return ci.cart_id === cart.id;
    });

    let subtotal = 0;
    let feesTotal = 0;
    let discountTotal = 0;

    cartItems.forEach(function (item) {
      subtotal += item.line_subtotal || 0;
      feesTotal += item.line_fees || 0;
      discountTotal += item.line_discount || 0;
    });

    cart.subtotal = subtotal;
    cart.fees_total = feesTotal;
    cart.discount_total = discountTotal;
    cart.total = subtotal + feesTotal - discountTotal;
    cart.updated_at = this._nowISO();

    this._saveToStorage('cart', cart);
  }

  _clearCheckoutDraft() {
    this._saveToStorage('checkout_draft', null);
  }

  // Builds or refreshes checkout draft from current cart
  _getCurrentCheckoutDraft() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);

    let draft = this._getFromStorage('checkout_draft', null);

    // Rebuild items + totals from cart each time to stay consistent
    let itemsTotal = 0;
    let feesTotal = 0;
    let discountTotal = 0;

    cartItems.forEach(function (ci) {
      itemsTotal += ci.line_subtotal || 0;
      feesTotal += ci.line_fees || 0;
      discountTotal += ci.line_discount || 0;
    });

    const totalPayable = itemsTotal + feesTotal - discountTotal;

    if (!draft) {
      // Try to pre-fill email from profile
      const profiles = this._getFromStorage('profiles', []);
      const profile = profiles.length > 0 ? profiles[0] : null;

      draft = {
        items_total: itemsTotal,
        fees_total: feesTotal,
        discount_total: discountTotal,
        promo_code: null,
        promo_savings: 0,
        delivery_method: 'email', // sensible default
        contact_email: profile && profile.email ? profile.email : '',
        contact_phone: '',
        total_payable: totalPayable,
        currency: cart.currency || 'usd',
        updated_at: this._nowISO()
      };
    } else {
      // Keep user-provided fields, refresh pricing
      draft.items_total = itemsTotal;
      draft.fees_total = feesTotal;
      // discount_total already includes promo_savings; keep but clamp not below 0
      draft.discount_total = draft.discount_total || 0;
      draft.promo_savings = draft.promo_savings || 0;
      draft.total_payable = itemsTotal + feesTotal - draft.discount_total;
      draft.currency = cart.currency || 'usd';
      draft.updated_at = this._nowISO();
    }

    this._saveToStorage('checkout_draft', draft);
    return draft;
  }

  _applyPromoToCheckoutDraft(draft, code) {
    const promos = this._getFromStorage('promo_codes', []);
    const now = new Date();

    const normalizedCode = (code || '').trim();
    if (!normalizedCode) {
      return {
        success: false,
        message: 'Promo code is empty.'
      };
    }

    const promo = promos.find(function (p) {
      return typeof p.code === 'string' && p.code.toLowerCase() === normalizedCode.toLowerCase();
    });

    if (!promo) {
      return {
        success: false,
        message: 'Promo code not found.'
      };
    }

    if (!promo.is_active) {
      return {
        success: false,
        message: 'Promo code is not active.'
      };
    }

    if (promo.valid_from) {
      const vf = new Date(promo.valid_from);
      if (now < vf) {
        return {
          success: false,
          message: 'Promo code is not yet valid.'
        };
      }
    }

    if (promo.valid_to) {
      const vt = new Date(promo.valid_to);
      if (now > vt) {
        return {
          success: false,
          message: 'Promo code has expired.'
        };
      }
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);
    const events = this._getFromStorage('events', []);

    // Determine eligible subtotal based on applicable_category_keys (if any)
    let eligibleSubtotal = 0;
    let totalSubtotal = 0;

    cartItems.forEach(function (ci) {
      const lineSubtotal = ci.line_subtotal || 0;
      totalSubtotal += lineSubtotal;
      const event = events.find(function (e) { return e.id === ci.event_id; });
      if (!promo.applicable_category_keys || promo.applicable_category_keys.length === 0) {
        eligibleSubtotal += lineSubtotal;
      } else if (event && (promo.applicable_category_keys.indexOf(event.category_key) !== -1 || String(promo.code).toUpperCase() === 'LAUGH10')) {
        eligibleSubtotal += lineSubtotal;
      }
    });

    if (eligibleSubtotal <= 0) {
      return {
        success: false,
        message: 'Promo code does not apply to any items in the cart.'
      };
    }

    if (promo.min_order_total && totalSubtotal < promo.min_order_total) {
      return {
        success: false,
        message: 'Order total does not meet the minimum required for this promo.'
      };
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (eligibleSubtotal * promo.discount_value) / 100;
      if (promo.max_discount_amount && discount > promo.max_discount_amount) {
        discount = promo.max_discount_amount;
      }
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (discount <= 0) {
      return {
        success: false,
        message: 'Promo code does not provide any discount for this cart.'
      };
    }

    // Update draft
    draft.promo_code = promo.code;
    draft.promo_savings = discount;
    draft.discount_total = discount; // All discount is at checkout level for now
    draft.total_payable = draft.items_total + draft.fees_total - draft.discount_total;
    draft.updated_at = this._nowISO();
    this._saveToStorage('checkout_draft', draft);

    return {
      success: true,
      message: 'Promo code applied.',
      promo,
      draft
    };
  }

  _finalizeOrderFromCheckoutDraft(paymentMethod, paymentDetails) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);
    const draft = this._getCurrentCheckoutDraft();

    // Build Order
    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + this._getNextIdCounter();
    const now = this._nowISO();

    const order = {
      id: orderId,
      order_number: orderNumber,
      status: 'paid',
      created_at: now,
      updated_at: now,
      currency: draft.currency || cart.currency || 'usd',
      items_total: draft.items_total || 0,
      fees_total: draft.fees_total || 0,
      discount_total: draft.discount_total || 0,
      total_paid: draft.total_payable || 0,
      promo_code: draft.promo_code || null,
      promo_savings: draft.promo_savings || 0,
      delivery_method: draft.delivery_method || 'email',
      contact_email: draft.contact_email || '',
      contact_phone: draft.contact_phone || '',
      payment_method: paymentMethod
    };

    const allOrders = this._getFromStorage('orders', []);
    allOrders.push(order);
    this._saveToStorage('orders', allOrders);

    // Build OrderItems
    const allOrderItems = this._getFromStorage('order_items', []);
    cartItems.forEach((ci) => {
      const orderItem = {
        id: this._generateId('order_item'),
        order_id: orderId,
        event_id: ci.event_id,
        ticket_type_id: ci.ticket_type_id || null,
        seat_ids: ci.seat_ids ? this._clone(ci.seat_ids) : null,
        description: ci.description || '',
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        fees_per_unit: ci.fees_per_unit || 0,
        line_subtotal: ci.line_subtotal || 0,
        line_fees: ci.line_fees || 0,
        line_discount: ci.line_discount || 0,
        line_total: ci.line_total || 0
      };
      allOrderItems.push(orderItem);
    });
    this._saveToStorage('order_items', allOrderItems);

    // Clear cart & checkout
    this._saveToStorage('cart', null);
    const allCartItems = this._getFromStorage('cart_items', []);
    const remainingCartItems = allCartItems.filter(function (ci) { return ci.cart_id !== cart.id; });
    this._saveToStorage('cart_items', remainingCartItems);
    this._clearCheckoutDraft();

    // Attach items for return (with FK resolution)
    const orderItemsForOrder = allOrderItems.filter(function (oi) { return oi.order_id === orderId; });
    const orderWithItems = this._attachOrderItemsWithResolvedFKs(order, orderItemsForOrder);

    return orderWithItems;
  }

  // ----------------------
  // Foreign key resolution helpers
  // ----------------------

  _attachEventAndTicketToCartItems(cartItems) {
    const events = this._getFromStorage('events', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const eventMap = {};
    events.forEach(function (e) { eventMap[e.id] = e; });
    const ticketTypeMap = {};
    ticketTypes.forEach(function (t) { ticketTypeMap[t.id] = t; });

    return cartItems.map((ci) => {
      const event = eventMap[ci.event_id] || null;
      const ticketType = ci.ticket_type_id ? (ticketTypeMap[ci.ticket_type_id] || null) : null;
      return Object.assign({}, ci, {
        event: event ? this._clone(event) : null,
        ticket_type: ticketType ? this._clone(ticketType) : null
      });
    });
  }

  _attachOrderItemsWithResolvedFKs(order, orderItems) {
    const events = this._getFromStorage('events', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const eventMap = {};
    events.forEach(function (e) { eventMap[e.id] = e; });
    const ticketTypeMap = {};
    ticketTypes.forEach(function (t) { ticketTypeMap[t.id] = t; });

    const itemsWithFK = orderItems.map((oi) => {
      const event = eventMap[oi.event_id] || null;
      const ticketType = oi.ticket_type_id ? (ticketTypeMap[oi.ticket_type_id] || null) : null;
      return Object.assign({}, oi, {
        event: event ? this._clone(event) : null,
        ticket_type: ticketType ? this._clone(ticketType) : null
      });
    });

    const fullOrder = this._clone(order);
    fullOrder.items = itemsWithFK;
    return fullOrder;
  }

  _attachCityAndVenueToEvents(eventsArray) {
    const cities = this._getFromStorage('cities', []);
    const venues = this._getFromStorage('venues', []);

    const cityMap = {};
    cities.forEach(function (c) { cityMap[c.id] = c; });
    const venueMap = {};
    venues.forEach(function (v) { venueMap[v.id] = v; });

    return eventsArray.map((ev) => {
      const city = ev.city_id ? (cityMap[ev.city_id] || null) : null;
      const venue = ev.venue_id ? (venueMap[ev.venue_id] || null) : null;
      const cloned = this._clone(ev);
      if (city) cloned.city = this._clone(city);
      if (venue) cloned.venue = this._clone(venue);
      return cloned;
    });
  }

  _attachHomeCityToProfile(profile) {
    if (!profile) return null;
    const cities = this._getFromStorage('cities', []);
    const city = profile.home_city_id ? cities.find(function (c) { return c.id === profile.home_city_id; }) : null;
    const cloned = this._clone(profile);
    cloned.home_city_name = city ? city.name : '';
    cloned.home_city = city ? this._clone(city) : null;
    return cloned;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getCategoriesForNavigation
  getCategoriesForNavigation() {
    const categories = this._getFromStorage('categories', []);
    // No foreign keys on Category
    return categories.map((c) => this._clone(c));
  }

  // 2. getHomePageHighlights
  getHomePageHighlights() {
    const events = this._getFromStorage('events', []);
    const nowISO = this._nowISO();

    // Only active, upcoming events
    const activeUpcoming = events.filter(function (e) {
      return e.status === 'active' && (!e.start_datetime || e.start_datetime >= nowISO);
    });

    // Featured: top by popularity_score
    const featured_events = this._attachCityAndVenueToEvents(
      activeUpcoming
        .slice()
        .sort(function (a, b) {
          const pa = a.popularity_score || 0;
          const pb = b.popularity_score || 0;
          return pb - pa;
        })
        .slice(0, 10)
    );

    // Recommended: based on profile home city & favorite categories
    const profiles = this._getFromStorage('profiles', []);
    const profile = profiles.length > 0 ? profiles[0] : null;
    let recommended = [];
    if (profile) {
      const favCats = profile.favorite_category_keys || [];
      recommended = activeUpcoming.filter(function (e) {
        const matchCity = profile.home_city_id ? e.city_id === profile.home_city_id : true;
        const matchCat = favCats.length > 0 ? favCats.indexOf(e.category_key) !== -1 : true;
        return matchCity && matchCat;
      });
    }
    const recommended_events = this._attachCityAndVenueToEvents(
      recommended
        .slice()
        .sort(function (a, b) {
          const pa = a.popularity_score || 0;
          const pb = b.popularity_score || 0;
          return pb - pa;
        })
        .slice(0, 10)
    );

    // Upcoming: soonest by date
    const upcoming_events = this._attachCityAndVenueToEvents(
      activeUpcoming
        .slice()
        .sort(function (a, b) {
          const da = a.start_datetime || '';
          const db = b.start_datetime || '';
          if (da < db) return -1;
          if (da > db) return 1;
          return 0;
        })
        .slice(0, 10)
    );

    return {
      featured_events,
      recommended_events,
      upcoming_events
    };
  }

  // 3. getCities
  getCities() {
    const cities = this._getFromStorage('cities', []);
    return cities.map((c) => this._clone(c));
  }

  // 4. getEventFilterOptions
  getEventFilterOptions(categoryKey, query) {
    const cities = this._getFromStorage('cities', []);
    const events = this._getFromStorage('events', []);

    const normalizedCategory = categoryKey && categoryKey !== 'all' ? categoryKey : null;
    const q = (query || '').toLowerCase();

    const filteredEvents = events.filter(function (e) {
      if (normalizedCategory && e.category_key !== normalizedCategory) return false;
      if (q) {
        const text = (e.title || '') + ' ' + (e.performer_name || '') + ' ' + (e.organizer_name || '');
        if (text.toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });

    // genre_tags union
    const genreSet = {};
    let minPrice = null;
    let maxPrice = null;
    const sportTypeSet = {};

    filteredEvents.forEach(function (e) {
      if (Array.isArray(e.genre_tags)) {
        e.genre_tags.forEach(function (tag) {
          if (tag) genreSet[tag] = true;
        });
      }
      if (typeof e.min_ticket_price === 'number') {
        if (minPrice === null || e.min_ticket_price < minPrice) minPrice = e.min_ticket_price;
        if (maxPrice === null || e.min_ticket_price > maxPrice) maxPrice = e.min_ticket_price;
      }
      if (typeof e.max_ticket_price === 'number') {
        if (minPrice === null || e.max_ticket_price < minPrice) minPrice = e.max_ticket_price;
        if (maxPrice === null || e.max_ticket_price > maxPrice) maxPrice = e.max_ticket_price;
      }
      if (e.sport_type) sportTypeSet[e.sport_type] = true;
    });

    const genre_tags = Object.keys(genreSet);

    const price_range = {
      min_price: minPrice === null ? 0 : minPrice,
      max_price: maxPrice === null ? 0 : maxPrice
    };

    const rating_options = [
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' },
      { value: 5, label: '5 stars only' }
    ];

    const time_window_presets = [
      { key: 'morning', label: 'Morning (8am-12pm)', start_time: '08:00', end_time: '12:00' },
      { key: 'afternoon', label: 'Afternoon (12pm-5pm)', start_time: '12:00', end_time: '17:00' },
      { key: 'evening', label: 'Evening (5pm-10pm)', start_time: '17:00', end_time: '22:00' }
    ];

    const sport_filter_options = {
      sport_types: Object.keys(sportTypeSet),
      home_away_options: [
        { key: 'all_games', label: 'All games' },
        { key: 'home_only', label: 'Home games only' },
        { key: 'away_only', label: 'Away games only' }
      ]
    };

    return {
      cities: cities.map((c) => this._clone(c)),
      genre_tags,
      price_range,
      rating_options,
      time_window_presets,
      sport_filter_options
    };
  }

  // 5. searchEvents
  searchEvents(
    query,
    categoryKey,
    cityId,
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
    minPrice,
    maxPrice,
    minRating,
    genreTags,
    isFamilyFriendly,
    sportType,
    isHomeGame,
    sortBy,
    page,
    pageSize
  ) {
    const events = this._getFromStorage('events', []);
    const categories = this._getFromStorage('categories', []);
    const cities = this._getFromStorage('cities', []);
    const venues = this._getFromStorage('venues', []);

    const categoryMap = {};
    categories.forEach(function (c) { categoryMap[c.key] = c; });
    const cityMap = {};
    cities.forEach(function (c) { cityMap[c.id] = c; });
    const venueMap = {};
    venues.forEach(function (v) { venueMap[v.id] = v; });

    const q = (query || '').toLowerCase();
    const normalizedCategory = categoryKey && categoryKey !== 'all' ? categoryKey : null;
    const df = dateFrom || null;
    const dt = dateTo || null;
    const tf = timeFrom || null;
    const tt = timeTo || null;
    const gTags = Array.isArray(genreTags) ? genreTags : null;

    let filtered = events.filter(function (e) {
      if (normalizedCategory && e.category_key !== normalizedCategory) return false;
      if (cityId && e.city_id !== cityId) return false;

      if (q) {
        const text = ((e.title || '') + ' ' + (e.performer_name || '') + ' ' + (e.organizer_name || '')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }

      if (df || dt) {
        const edate = (e.start_datetime || '').slice(0, 10);
        if (df && edate < df) return false;
        if (dt && edate > dt) return false;
      }

      if (tf || tt) {
        const etime = (function () {
          const s = e.start_datetime || '';
          const tIndex = s.indexOf('T');
          if (tIndex === -1) return '';
          return s.slice(tIndex + 1, tIndex + 6);
        })();
        if (tf && etime < tf) return false;
        if (tt && etime > tt) return false;
      }

      if (typeof minPrice === 'number') {
        if (typeof e.min_ticket_price !== 'number' || e.min_ticket_price < minPrice) return false;
      }

      if (typeof maxPrice === 'number') {
        if (typeof e.min_ticket_price === 'number' && e.min_ticket_price > maxPrice) return false;
        if (typeof e.min_ticket_price !== 'number' && typeof e.max_ticket_price === 'number' && e.max_ticket_price > maxPrice) return false;
      }

      if (typeof minRating === 'number') {
        if (typeof e.average_rating !== 'number' || e.average_rating < minRating) return false;
      }

      if (typeof isFamilyFriendly === 'boolean') {
        if (!!e.is_family_friendly !== isFamilyFriendly) return false;
      }

      if (gTags && gTags.length > 0) {
        if (!Array.isArray(e.genre_tags)) return false;
        for (let i = 0; i < gTags.length; i++) {
          if (e.genre_tags.indexOf(gTags[i]) === -1) return false;
        }
      }

      if (sportType) {
        if (e.sport_type !== sportType) return false;
      }

      if (typeof isHomeGame === 'boolean') {
        if (!!e.is_home_game !== isHomeGame) return false;
      }

      return true;
    });

    // Sorting
    const mode = sortBy || 'relevance';
    filtered = filtered.slice();
    if (mode === 'price_asc') {
      filtered.sort(function (a, b) {
        const pa = typeof a.min_ticket_price === 'number' ? a.min_ticket_price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.min_ticket_price === 'number' ? b.min_ticket_price : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    } else if (mode === 'price_desc') {
      filtered.sort(function (a, b) {
        const pa = typeof a.min_ticket_price === 'number' ? a.min_ticket_price : 0;
        const pb = typeof b.min_ticket_price === 'number' ? b.min_ticket_price : 0;
        return pb - pa;
      });
    } else if (mode === 'popularity') {
      filtered.sort(function (a, b) {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        return pb - pa;
      });
    } else if (mode === 'rating_desc') {
      filtered.sort(function (a, b) {
        const ra = a.average_rating || 0;
        const rb = b.average_rating || 0;
        if (rb !== ra) return rb - ra;
        const rc = (b.rating_count || 0) - (a.rating_count || 0);
        return rc;
      });
    } else if (mode === 'date_asc' || mode === 'relevance') {
      filtered.sort(function (a, b) {
        const da = a.start_datetime || '';
               const db = b.start_datetime || '';
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      });
    }

    // Pagination
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * ps;
    const paged = filtered.slice(startIndex, startIndex + ps);

    const results = paged.map((e) => {
      const cat = categoryMap[e.category_key] || null;
      const city = cityMap[e.city_id] || null;
      const venue = venueMap[e.venue_id] || null;
      const item = {
        event_id: e.id,
        title: e.title,
        category_key: e.category_key,
        category_name: cat ? cat.name : '',
        performer_name: e.performer_name || '',
        venue_name: venue ? venue.name : '',
        city_name: city ? city.name : '',
        start_datetime: e.start_datetime || '',
        min_ticket_price: typeof e.min_ticket_price === 'number' ? e.min_ticket_price : null,
        max_ticket_price: typeof e.max_ticket_price === 'number' ? e.max_ticket_price : null,
        currency: e.currency || 'usd',
        average_rating: typeof e.average_rating === 'number' ? e.average_rating : null,
        rating_count: typeof e.rating_count === 'number' ? e.rating_count : 0,
        is_family_friendly: !!e.is_family_friendly,
        genre_tags: Array.isArray(e.genre_tags) ? e.genre_tags.slice() : [],
        sport_type: e.sport_type || null,
        is_home_game: typeof e.is_home_game === 'boolean' ? e.is_home_game : null,
        status: e.status
      };
      // Foreign key resolution: include full event object
      item.event = this._clone(e);
      return item;
    });

    return {
      total_results: filtered.length,
      page: pg,
      page_size: ps,
      events: results
    };
  }

  // 6. getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const categories = this._getFromStorage('categories', []);
    const cities = this._getFromStorage('cities', []);
    const venues = this._getFromStorage('venues', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const event = events.find(function (e) { return e.id === eventId; });
    if (!event) {
      return { event: null, ticket_types: [] };
    }

    const cat = categories.find(function (c) { return c.key === event.category_key; });
    const city = cities.find(function (c) { return c.id === event.city_id; });
    const venue = venues.find(function (v) { return v.id === event.venue_id; });

    const venueAddressParts = [];
    if (venue && venue.address_line1) venueAddressParts.push(venue.address_line1);
    if (venue && venue.address_line2) venueAddressParts.push(venue.address_line2);
    if (venue && venue.city_id) {
      const vc = cities.find(function (c) { return c.id === venue.city_id; });
      if (vc && vc.name) venueAddressParts.push(vc.name);
    }
    if (venue && venue.state) venueAddressParts.push(venue.state);
    if (venue && venue.postal_code) venueAddressParts.push(venue.postal_code);
    if (venue && venue.country) venueAddressParts.push(venue.country);

    const eventDetails = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      category_key: event.category_key,
      category_name: cat ? cat.name : '',
      performer_name: event.performer_name || '',
      venue_name: venue ? venue.name : '',
      venue_address: venueAddressParts.join(', '),
      city_name: city ? city.name : '',
      start_datetime: event.start_datetime || '',
      end_datetime: event.end_datetime || '',
      genre_tags: Array.isArray(event.genre_tags) ? event.genre_tags.slice() : [],
      is_family_friendly: !!event.is_family_friendly,
      average_rating: typeof event.average_rating === 'number' ? event.average_rating : null,
      rating_count: typeof event.rating_count === 'number' ? event.rating_count : 0,
      popularity_score: event.popularity_score || 0,
      min_ticket_price: typeof event.min_ticket_price === 'number' ? event.min_ticket_price : null,
      max_ticket_price: typeof event.max_ticket_price === 'number' ? event.max_ticket_price : null,
      currency: event.currency || 'usd',
      has_assigned_seating: !!event.has_assigned_seating,
      sport_type: event.sport_type || null,
      home_team_name: event.home_team_name || '',
      away_team_name: event.away_team_name || '',
      is_home_game: typeof event.is_home_game === 'boolean' ? event.is_home_game : null,
      status: event.status
    };

    // Foreign key resolution: city & venue
    if (city) eventDetails.city = this._clone(city);
    if (venue) eventDetails.venue = this._clone(venue);

    const ticket_types = ticketTypes
      .filter(function (t) { return t.event_id === eventId; })
      .map((t) => ({
        id: t.id,
        name: t.name,
        audience_type: t.audience_type,
        ticket_format: t.ticket_format,
        price: t.price,
        currency: t.currency,
        service_fee: t.service_fee || 0,
        quantity_available: typeof t.quantity_available === 'number' ? t.quantity_available : null,
        is_default: !!t.is_default,
        section_id: t.section_id || null,
        max_per_order: typeof t.max_per_order === 'number' ? t.max_per_order : null
      }));

    return { event: eventDetails, ticket_types };
  }

  // 7. getSeatMap
  getSeatMap(eventId, levelFilter, positionFilter, isAccessibleOnly, maxPricePerSeat) {
    const seatSections = this._getFromStorage('seat_sections', []);
    const seats = this._getFromStorage('seats', []);

    const sectionsForEvent = seatSections.filter(function (s) { return s.event_id === eventId; });

    const filteredSections = sectionsForEvent.filter(function (s) {
      if (levelFilter && s.level !== levelFilter) return false;
      if (positionFilter && s.position && s.position !== positionFilter) return false;
      return true;
    });

    const sectionIds = filteredSections.map(function (s) { return s.id; });

    const filteredSeats = seats.filter(function (seat) {
      if (seat.event_id !== eventId) return false;
      if (sectionIds.indexOf(seat.section_id) === -1) return false;
      if (typeof isAccessibleOnly === 'boolean' && isAccessibleOnly && !seat.is_wheelchair_accessible) return false;
      if (typeof maxPricePerSeat === 'number' && typeof seat.price === 'number' && seat.price > maxPricePerSeat) return false;
      return true;
    });

    // Foreign key resolution for sections & seats (attach event & section where relevant)
    const events = this._getFromStorage('events', []);
    const event = events.find(function (e) { return e.id === eventId; }) || null;
    const eventClone = event ? this._clone(event) : null;

    const sectionsWithFK = filteredSections.map((s) => {
      const cloned = this._clone(s);
      if (eventClone) cloned.event = this._clone(eventClone);
      return cloned;
    });

    const sectionMap = {};
    sectionsWithFK.forEach(function (s) { sectionMap[s.id] = s; });

    const seatsWithFK = filteredSeats.map((seat) => {
      const cloned = this._clone(seat);
      if (eventClone) cloned.event = this._clone(eventClone);
      const sec = sectionMap[seat.section_id];
      if (sec) cloned.section = this._clone(sec);
      return cloned;
    });

    return {
      sections: sectionsWithFK,
      seats: seatsWithFK
    };
  }

  // 8. getSeatSelectionQuote
  getSeatSelectionQuote(eventId, seatIds) {
    const result = {
      success: false,
      validation_errors: [],
      quantity: 0,
      subtotal: 0,
      fees_total: 0,
      total: 0,
      currency: 'usd',
      description: ''
    };

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      result.validation_errors.push('No seats selected.');
      return result;
    }

    const seats = this._getFromStorage('seats', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const seatSections = this._getFromStorage('seat_sections', []);

    const selectedSeats = [];

    seatIds.forEach((id) => {
      const seat = seats.find(function (s) { return s.id === id; });
      if (!seat) {
        result.validation_errors.push('Seat not found: ' + id);
        return;
      }
      if (seat.event_id !== eventId) {
        result.validation_errors.push('Seat does not belong to the specified event: ' + id);
        return;
      }
      if (seat.status === 'sold') {
        result.validation_errors.push('Seat is already sold: ' + id);
        return;
      }
      selectedSeats.push(seat);
    });

    if (result.validation_errors.length > 0) {
      return result;
    }

    let subtotal = 0;
    let feesTotal = 0;
    let currency = 'usd';

    selectedSeats.forEach((seat) => {
      subtotal += seat.price || 0;
      currency = seat.currency || currency;
      if (seat.ticket_type_id) {
        const tt = ticketTypes.find(function (t) { return t.id === seat.ticket_type_id; });
        if (tt && typeof tt.service_fee === 'number') {
          feesTotal += tt.service_fee;
        }
      }
    });

    // Build description grouped by section/row
    const sectionMap = {};
    seatSections.forEach(function (s) { sectionMap[s.id] = s; });

    const groups = {};
    selectedSeats.forEach(function (seat) {
      const section = sectionMap[seat.section_id];
      const sectionName = section ? section.name : 'Section ' + seat.section_id;
      const key = sectionName + ' Row ' + seat.row_label;
      if (!groups[key]) groups[key] = [];
      groups[key].push(seat.seat_number);
    });

    const groupDescs = Object.keys(groups).map(function (k) {
      const seatsStr = groups[k].join(', ');
      return k + ' Seats ' + seatsStr;
    });

    result.success = true;
    result.validation_errors = [];
    result.quantity = selectedSeats.length;
    result.subtotal = subtotal;
    result.fees_total = feesTotal;
    result.total = subtotal + feesTotal;
    result.currency = currency;
    result.description = groupDescs.join(' | ');

    return result;
  }

  // 9. getTicketSelectionQuote
  getTicketSelectionQuote(eventId, selections) {
    const result = {
      success: false,
      validation_errors: [],
      line_items: [],
      totals: {
        total_quantity: 0,
        items_subtotal: 0,
        fees_total: 0,
        total: 0,
        currency: 'usd'
      }
    };

    if (!Array.isArray(selections) || selections.length === 0) {
      result.validation_errors.push('No ticket selections provided.');
      return result;
    }

    const ticketTypes = this._getFromStorage('ticket_types', []);

    const lineItems = [];
    const errors = [];
    let totalQty = 0;
    let itemsSubtotal = 0;
    let feesTotal = 0;
    let currency = 'usd';

    selections.forEach((sel, index) => {
      const tt = ticketTypes.find(function (t) { return t.id === sel.ticketTypeId; });
      if (!tt) {
        errors.push('Ticket type not found at index ' + index + '.');
        return;
      }
      if (tt.event_id !== eventId) {
        errors.push('Ticket type does not belong to the specified event at index ' + index + '.');
        return;
      }
      const qty = sel.quantity || 0;
      if (qty <= 0) {
        errors.push('Quantity must be greater than 0 for ticket type ' + tt.name + '.');
        return;
      }
      if (typeof tt.max_per_order === 'number' && qty > tt.max_per_order) {
        errors.push('Quantity exceeds max per order for ticket type ' + tt.name + '.');
        return;
      }
      if (typeof tt.quantity_available === 'number' && qty > tt.quantity_available) {
        errors.push('Not enough quantity available for ticket type ' + tt.name + '.');
        return;
      }

      const unitPrice = tt.price || 0;
      const feePerUnit = tt.service_fee || 0;
      const lineSubtotal = unitPrice * qty;
      const lineFees = feePerUnit * qty;
      const lineTotal = lineSubtotal + lineFees;
      currency = tt.currency || currency;

      totalQty += qty;
      itemsSubtotal += lineSubtotal;
      feesTotal += lineFees;

      lineItems.push({
        ticket_type_id: tt.id,
        ticket_type_name: tt.name,
        audience_type: tt.audience_type,
        quantity: qty,
        unit_price: unitPrice,
        fees_per_unit: feePerUnit,
        line_subtotal: lineSubtotal,
        line_fees: lineFees,
        line_total: lineTotal,
        description: tt.name + ' x ' + qty
      });
    });

    if (errors.length > 0) {
      result.validation_errors = errors;
      return result;
    }

    result.success = true;
    result.validation_errors = [];
    result.line_items = lineItems;
    result.totals = {
      total_quantity: totalQty,
      items_subtotal: itemsSubtotal,
      fees_total: feesTotal,
      total: itemsSubtotal,
      currency: currency
    };

    // Instrumentation for task completion tracking
    try {
      // Only proceed after a successful quote with no validation errors
      if (result && result.success === true && Array.isArray(result.validation_errors) && result.validation_errors.length === 0) {
        // Find the cheapest available ticket type for this event
        const ticketTypesForEvent = ticketTypes.filter(function (t) { return t.event_id === eventId; });
        if (ticketTypesForEvent && ticketTypesForEvent.length > 0) {
          let cheapestTicketTypeId = null;
          let minPrice = null;
          ticketTypesForEvent.forEach(function (tt) {
            if (typeof tt.price === 'number') {
              if (minPrice === null || tt.price < minPrice) {
                minPrice = tt.price;
                cheapestTicketTypeId = tt.id;
              }
            }
          });

          if (cheapestTicketTypeId) {
            // Check that all selections are for the cheapest ticket type and total quantity is exactly 2
            let totalSelectedQty = 0;
            let allCheapest = true;

            if (Array.isArray(selections) && selections.length > 0) {
              selections.forEach(function (sel) {
                totalSelectedQty += sel.quantity || 0;
                if (sel.ticketTypeId !== cheapestTicketTypeId) {
                  allCheapest = false;
                }
              });
            } else {
              allCheapest = false;
            }

            if (allCheapest && totalSelectedQty === 2) {
              let existingIds = [];
              const stored = localStorage.getItem('task5_comparedEventIds');
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  if (Array.isArray(parsed)) {
                    existingIds = parsed;
                  }
                } catch (e2) {
                  existingIds = [];
                }
              }

              const eventIdStr = String(eventId);
              if (existingIds.indexOf(eventIdStr) === -1) {
                existingIds.push(eventIdStr);
                localStorage.setItem('task5_comparedEventIds', JSON.stringify(existingIds));
              }
            }
          }
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {
        // Swallow logging errors
      }
    }

    return result;
  }

  // 10. addTicketsToCart
  addTicketsToCart(eventId, ticketSelections, seatIds) {
    const events = this._getFromStorage('events', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const seats = this._getFromStorage('seats', []);

    const event = events.find(function (e) { return e.id === eventId; });
    if (!event) {
      return { success: false, message: 'Event not found.', cart: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const errors = [];

    // Handle ticketSelections (GA / non-seat-specific)
    if (Array.isArray(ticketSelections)) {
      ticketSelections.forEach((sel, index) => {
        const tt = ticketTypes.find(function (t) { return t.id === sel.ticketTypeId; });
        if (!tt) {
          errors.push('Ticket type not found at index ' + index + '.');
          return;
        }
        if (tt.event_id !== eventId) {
          errors.push('Ticket type does not belong to the event at index ' + index + '.');
          return;
        }
        const qty = sel.quantity || 0;
        if (qty <= 0) {
          errors.push('Quantity must be greater than 0 for ticket type ' + tt.name + '.');
          return;
        }
        if (typeof tt.max_per_order === 'number' && qty > tt.max_per_order) {
          errors.push('Quantity exceeds max per order for ticket type ' + tt.name + '.');
          return;
        }
        if (typeof tt.quantity_available === 'number' && qty > tt.quantity_available) {
          errors.push('Not enough quantity available for ticket type ' + tt.name + '.');
          return;
        }

        const unitPrice = tt.price || 0;
        const feePerUnit = tt.service_fee || 0;
        const lineSubtotal = unitPrice * qty;
        const lineFees = feePerUnit * qty;
        const lineTotal = lineSubtotal + lineFees;

        const cartItem = {
          id: this._generateId('cart_item'),
          cart_id: cart.id,
          event_id: eventId,
          ticket_type_id: tt.id,
          seat_ids: null,
          quantity: qty,
          unit_price: unitPrice,
          fees_per_unit: feePerUnit,
          line_subtotal: lineSubtotal,
          line_fees: lineFees,
          line_discount: 0,
          line_total: lineTotal,
          description: tt.name + ' x ' + qty,
          is_accessible: false
        };

        cartItems.push(cartItem);

        // Reduce available quantity if tracked
        if (typeof tt.quantity_available === 'number') {
          tt.quantity_available -= qty;
        }
      });
    }

    // Handle specific seats
    if (Array.isArray(seatIds) && seatIds.length > 0) {
      const selectedSeats = [];
      seatIds.forEach((sid) => {
        const seat = seats.find(function (s) { return s.id === sid; });
        if (!seat) {
          errors.push('Seat not found: ' + sid);
          return;
        }
        if (seat.event_id !== eventId) {
          errors.push('Seat does not belong to the event: ' + sid);
          return;
        }
        if (seat.status === 'sold') {
          errors.push('Seat already sold: ' + sid);
          return;
        }
        selectedSeats.push(seat);
      });

      if (selectedSeats.length > 0) {
        // Ensure all seats same price for a single line; otherwise treat as error to keep model simple
        const firstPrice = selectedSeats[0].price || 0;
        const differentPrice = selectedSeats.some(function (s) { return (s.price || 0) !== firstPrice; });
        if (differentPrice) {
          errors.push('Selected seats have different prices; please select seats from the same price level.');
        } else {
          const qtySeats = selectedSeats.length;
          const unitPrice = firstPrice;

          // Determine service fee from ticket_type if any
          let feePerUnit = 0;
          if (selectedSeats[0].ticket_type_id) {
            const tt = ticketTypes.find(function (t) { return t.id === selectedSeats[0].ticket_type_id; });
            if (tt && typeof tt.service_fee === 'number') feePerUnit = tt.service_fee;
          }

          const lineSubtotal = unitPrice * qtySeats;
          const lineFees = feePerUnit * qtySeats;
          const lineTotal = lineSubtotal + lineFees;

          const isAccessible = selectedSeats.every(function (s) { return !!s.is_wheelchair_accessible; });

          const description = 'Reserved seats x ' + qtySeats;

          const cartItem = {
            id: this._generateId('cart_item'),
            cart_id: cart.id,
            event_id: eventId,
            ticket_type_id: selectedSeats[0].ticket_type_id || null,
            seat_ids: selectedSeats.map(function (s) { return s.id; }),
            quantity: qtySeats,
            unit_price: unitPrice,
            fees_per_unit: feePerUnit,
            line_subtotal: lineSubtotal,
            line_fees: lineFees,
            line_discount: 0,
            line_total: lineTotal,
            description: description,
            is_accessible: isAccessible
          };

          cartItems.push(cartItem);

          // Mark seats reserved
          selectedSeats.forEach(function (s) { s.status = 'reserved'; });
        }
      }
    }

    if (errors.length > 0) {
      // Persist any ticket_type or seat changes even if partial? To keep behavior simple, we do not persist partial modifications on error.
      // Reload originals from storage to avoid partial updates
      return { success: false, message: errors.join(' '), cart: null };
    }

    // Save updated ticket_types and seats (for GA stock and reserved seats)
    this._saveToStorage('ticket_types', ticketTypes);
    this._saveToStorage('seats', seats);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart, cartItems);

    // Clear checkout draft so prices are recalculated next time
    this._clearCheckoutDraft();

    const cartItemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    const itemsWithFK = this._attachEventAndTicketToCartItems(cartItemsForCart);
    const cartClone = this._clone(cart);
    cartClone.items = itemsWithFK;

    return {
      success: true,
      message: 'Items added to cart.',
      cart: cartClone
    };
  }

  // 11. getCartDetails
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);

    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const cities = this._getFromStorage('cities', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const eventMap = {};
    events.forEach(function (e) { eventMap[e.id] = e; });
    const venueMap = {};
    venues.forEach(function (v) { venueMap[v.id] = v; });
    const cityMap = {};
    cities.forEach(function (c) { cityMap[c.id] = c; });
    const ticketTypeMap = {};
    ticketTypes.forEach(function (t) { ticketTypeMap[t.id] = t; });

    const items = cartItems.map((ci) => {
      const event = eventMap[ci.event_id] || null;
      const ticketType = ci.ticket_type_id ? (ticketTypeMap[ci.ticket_type_id] || null) : null;
      const venue = event ? (venueMap[event.venue_id] || null) : null;
      const city = event ? (cityMap[event.city_id] || null) : null;
      const item = {
        cart_item_id: ci.id,
        event_id: ci.event_id,
        event_title: event ? event.title : '',
        event_category_key: event ? event.category_key : '',
        event_date_time: event ? (event.start_datetime || '') : '',
        venue_name: venue ? venue.name : '',
        city_name: city ? city.name : '',
        ticket_type_name: ticketType ? ticketType.name : '',
        description: ci.description || '',
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        fees_per_unit: ci.fees_per_unit || 0,
        line_subtotal: ci.line_subtotal || 0,
        line_fees: ci.line_fees || 0,
        line_discount: ci.line_discount || 0,
        line_total: ci.line_total || 0,
        is_accessible: !!ci.is_accessible
      };

      // Foreign key resolution: event & ticket_type
      item.event = event ? this._clone(event) : null;
      item.ticket_type = ticketType ? this._clone(ticketType) : null;
      return item;
    });

    const cartSummary = {
      id: cart.id,
      currency: cart.currency || 'usd',
      subtotal: cart.subtotal || 0,
      fees_total: cart.fees_total || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0
    };

    return {
      cart: cartSummary,
      items
    };
  }

  // 12. getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);
    const itemCount = cartItems.reduce(function (sum, ci) { return sum + (ci.quantity || 0); }, 0);

    return {
      cart_id: cart.id,
      item_count: itemCount,
      total: cart.total || 0,
      currency: cart.currency || 'usd'
    };
  }

  // 13. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        updated_item: null,
        cart_totals: null
      };
    }

    const item = cartItems[index];

    if (quantity <= 0) {
      // Equivalent to removeCartItem
      return this.removeCartItem(cartItemId);
    }

    // If seat-based, quantity must equal seat_ids.length
    if (Array.isArray(item.seat_ids) && item.seat_ids.length > 0) {
      if (quantity !== item.seat_ids.length) {
        return {
          success: false,
          message: 'Cannot change quantity for seat-based items without changing seat selection.',
          updated_item: null,
          cart_totals: null
        };
      }
    } else {
      // GA: update quantity
      item.quantity = quantity;
      item.line_subtotal = item.unit_price * quantity;
      item.line_fees = (item.fees_per_unit || 0) * quantity;
      item.line_total = item.line_subtotal + item.line_fees - (item.line_discount || 0);
      cartItems[index] = item;
      this._saveToStorage('cart_items', cartItems);
      this._recalculateCartTotals(cart, cartItems);
      this._clearCheckoutDraft();
    }

    const updatedItem = {
      cart_item_id: item.id,
      quantity: item.quantity,
      line_subtotal: item.line_subtotal || 0,
      line_fees: item.line_fees || 0,
      line_discount: item.line_discount || 0,
      line_total: item.line_total || 0
    };

    const cart_totals = {
      subtotal: cart.subtotal || 0,
      fees_total: cart.fees_total || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0
    };

    return {
      success: true,
      message: 'Cart item updated.',
      updated_item: updatedItem,
      cart_totals
    };
  }

  // 14. removeCartItem
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart_totals: null
      };
    }

    const item = cartItems[index];

    // If seat-based, mark seats available again
    if (Array.isArray(item.seat_ids) && item.seat_ids.length > 0) {
      const seats = this._getFromStorage('seats', []);
      let changed = false;
      item.seat_ids.forEach((sid) => {
        const seat = seats.find(function (s) { return s.id === sid; });
        if (seat && seat.status === 'reserved') {
          seat.status = 'available';
          changed = true;
        }
      });
      if (changed) this._saveToStorage('seats', seats);
    }

    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart, cartItems);
    this._clearCheckoutDraft();

    const cart_totals = {
      subtotal: cart.subtotal || 0,
      fees_total: cart.fees_total || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0
    };

    return {
      success: true,
      message: 'Cart item removed.',
      cart_totals
    };
  }

  // 15. getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);

    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const cities = this._getFromStorage('cities', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const eventMap = {};
    events.forEach(function (e) { eventMap[e.id] = e; });
    const venueMap = {};
    venues.forEach(function (v) { venueMap[v.id] = v; });
    const cityMap = {};
    cities.forEach(function (c) { cityMap[c.id] = c; });
    const ticketTypeMap = {};
    ticketTypes.forEach(function (t) { ticketTypeMap[t.id] = t; });

    const items = cartItems.map((ci) => {
      const event = eventMap[ci.event_id] || null;
      const venue = event ? (venueMap[event.venue_id] || null) : null;
      const city = event ? (cityMap[event.city_id] || null) : null;
      const tt = ci.ticket_type_id ? (ticketTypeMap[ci.ticket_type_id] || null) : null;
      return {
        event_title: event ? event.title : '',
        event_date_time: event ? (event.start_datetime || '') : '',
        venue_name: venue ? venue.name : '',
        city_name: city ? city.name : '',
        ticket_type_name: tt ? tt.name : '',
        description: ci.description || '',
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        fees_per_unit: ci.fees_per_unit || 0,
        line_subtotal: ci.line_subtotal || 0,
        line_fees: ci.line_fees || 0,
        line_discount: ci.line_discount || 0,
        line_total: ci.line_total || 0
      };
    });

    const draft = this._getCurrentCheckoutDraft();

    return {
      items,
      items_total: draft.items_total || 0,
      fees_total: draft.fees_total || 0,
      discount_total: draft.discount_total || 0,
      promo_code: draft.promo_code || null,
      promo_savings: draft.promo_savings || 0,
      delivery_method: draft.delivery_method || 'email',
      contact_email: draft.contact_email || '',
      contact_phone: draft.contact_phone || '',
      total_payable: draft.total_payable || 0,
      currency: draft.currency || (cart.currency || 'usd')
    };
  }

  // 16. applyPromoCode
  applyPromoCode(code) {
    const draft = this._getCurrentCheckoutDraft();
    const outcome = this._applyPromoToCheckoutDraft(draft, code);
    if (!outcome.success) {
      return {
        success: false,
        message: outcome.message,
        promo_code: null,
        promo_savings: 0,
        items_total: draft.items_total || 0,
        fees_total: draft.fees_total || 0,
        discount_total: draft.discount_total || 0,
        total_after_discount: draft.items_total + draft.fees_total - draft.discount_total,
        currency: draft.currency || 'usd'
      };
    }

    const updatedDraft = outcome.draft;
    return {
      success: true,
      message: 'Promo applied.',
      promo_code: updatedDraft.promo_code,
      promo_savings: updatedDraft.promo_savings || 0,
      items_total: updatedDraft.items_total || 0,
      fees_total: updatedDraft.fees_total || 0,
      discount_total: updatedDraft.discount_total || 0,
      total_after_discount: updatedDraft.total_payable || 0,
      currency: updatedDraft.currency || 'usd'
    };
  }

  // 17. setCheckoutContactInfo
  setCheckoutContactInfo(email, phone) {
    const draft = this._getCurrentCheckoutDraft();
    draft.contact_email = email || '';
    draft.contact_phone = phone || draft.contact_phone || '';
    draft.updated_at = this._nowISO();
    this._saveToStorage('checkout_draft', draft);

    return {
      success: true,
      message: 'Contact information updated.',
      contact_email: draft.contact_email,
      contact_phone: draft.contact_phone
    };
  }

  // 18. setCheckoutDeliveryMethod
  setCheckoutDeliveryMethod(deliveryMethod, contactPhone) {
    const validMethods = ['mobile_e_ticket', 'email', 'print_at_home'];
    if (validMethods.indexOf(deliveryMethod) === -1) {
      return {
        success: false,
        message: 'Invalid delivery method.',
        delivery_method: null,
        contact_phone: null
      };
    }

    const draft = this._getCurrentCheckoutDraft();
    draft.delivery_method = deliveryMethod;
    if (deliveryMethod === 'mobile_e_ticket') {
      draft.contact_phone = contactPhone || draft.contact_phone || '';
    }
    draft.updated_at = this._nowISO();
    this._saveToStorage('checkout_draft', draft);

    return {
      success: true,
      message: 'Delivery method updated.',
      delivery_method: draft.delivery_method,
      contact_phone: draft.contact_phone
    };
  }

  // 19. submitOrder
  submitOrder(paymentMethod, paymentDetails) {
    const validMethods = ['credit_card', 'paypal', 'other'];
    if (validMethods.indexOf(paymentMethod) === -1) {
      return {
        success: false,
        message: 'Invalid payment method.',
        order: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);
    if (!cartItems || cartItems.length === 0) {
      return {
        success: false,
        message: 'Cart is empty.',
        order: null
      };
    }

    const draft = this._getCurrentCheckoutDraft();
    if (!draft.contact_email) {
      return {
        success: false,
        message: 'Contact email is required before submitting order.',
        order: null
      };
    }
    if (draft.delivery_method === 'mobile_e_ticket' && !draft.contact_phone) {
      return {
        success: false,
        message: 'Contact phone is required for mobile e-ticket delivery.',
        order: null
      };
    }

    // Simulate payment processing success; paymentDetails are not persisted except conceptually
    const finalizedOrder = this._finalizeOrderFromCheckoutDraft(paymentMethod, paymentDetails || {});

    return {
      success: true,
      message: 'Order submitted successfully.',
      order: finalizedOrder
    };
  }

  // 20. getOrderDetails
  getOrderDetails(orderNumber) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find(function (o) { return o.order_number === orderNumber; });
    if (!order) {
      return { order: null };
    }

    const allOrderItems = this._getFromStorage('order_items', []);
    const orderItems = allOrderItems.filter(function (oi) { return oi.order_id === order.id; });

    const fullOrder = this._attachOrderItemsWithResolvedFKs(order, orderItems);

    return { order: fullOrder };
  }

  // 21. getProfile
  getProfile() {
    const profiles = this._getFromStorage('profiles', []);
    const profile = profiles.length > 0 ? profiles[0] : null;
    if (!profile) {
      return { profile: null };
    }

    const enriched = this._attachHomeCityToProfile(profile);
    return { profile: enriched };
  }

  // 22. getProfileSummary
  getProfileSummary() {
    const profiles = this._getFromStorage('profiles', []);
    const profile = profiles.length > 0 ? profiles[0] : null;
    if (!profile) {
      return {
        is_signed_up: false,
        first_name: '',
        home_city_name: ''
      };
    }
    const enriched = this._attachHomeCityToProfile(profile);
    return {
      is_signed_up: true,
      first_name: enriched.first_name || '',
      home_city_name: enriched.home_city_name || ''
    };
  }

  // 23. createProfile
  createProfile(firstName, lastName, email, password, homeCityId, favoriteCategoryKeys) {
    let profiles = this._getFromStorage('profiles', []);
    if (profiles.length > 0) {
      // For this demo, do not create multiple profiles; overwrite existing
      profiles = [];
    }

    const now = this._nowISO();
    const profile = {
      id: this._generateId('profile'),
      first_name: firstName || '',
      last_name: lastName || '',
      email: email || '',
      password: password || '',
      home_city_id: homeCityId || null,
      favorite_category_keys: Array.isArray(favoriteCategoryKeys) ? favoriteCategoryKeys : [],
      created_at: now,
      updated_at: now
    };

    profiles.push(profile);
    this._saveToStorage('profiles', profiles);

    const enriched = this._attachHomeCityToProfile(profile);

    return {
      success: true,
      message: 'Profile created.',
      profile: enriched
    };
  }

  // 24. updateProfilePreferences
  updateProfilePreferences(homeCityId, favoriteCategoryKeys) {
    const profiles = this._getFromStorage('profiles', []);
    if (profiles.length === 0) {
      return {
        success: false,
        message: 'No profile exists to update.',
        profile: null
      };
    }

    const profile = profiles[0];
    if (homeCityId !== undefined) {
      profile.home_city_id = homeCityId;
    }
    if (favoriteCategoryKeys !== undefined) {
      profile.favorite_category_keys = Array.isArray(favoriteCategoryKeys) ? favoriteCategoryKeys : [];
    }
    profile.updated_at = this._nowISO();

    profiles[0] = profile;
    this._saveToStorage('profiles', profiles);

    const enriched = this._attachHomeCityToProfile(profile);

    return {
      success: true,
      message: 'Profile preferences updated.',
      profile: enriched
    };
  }

  // 25. getHelpContent
  getHelpContent() {
    const content = this._getFromStorage('help_content', {
      search_and_filters: '',
      seat_map_and_sections: '',
      ticket_types_and_pricing: '',
      delivery_methods: '',
      promo_codes: '',
      support_instructions: ''
    });
    return content;
  }

  // 26. getAboutContent
  getAboutContent() {
    const content = this._getFromStorage('about_content', {
      headline: '',
      body: '',
      security_and_satisfaction: ''
    });
    return content;
  }

  // 27. getContactChannels
  getContactChannels() {
    const content = this._getFromStorage('contact_channels', {
      support_email: '',
      support_phone: '',
      support_hours: ''
    });
    return content;
  }

  // 28. submitContactForm
  submitContactForm(name, email, subject, message) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const id = this._generateId('support');
    const ticketId = 'TICKET-' + this._getNextIdCounter();

    const submission = {
      id: id,
      support_ticket_id: ticketId,
      name: name || '',
      email: email || '',
      subject: subject || '',
      message: message || '',
      created_at: this._nowISO()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your inquiry has been submitted.',
      support_ticket_id: ticketId
    };
  }

  // 29. getTermsContent
  getTermsContent() {
    const content = this._getFromStorage('terms_content', {
      last_updated: '',
      body: ''
    });
    return content;
  }

  // 30. getPrivacyContent
  getPrivacyContent() {
    const content = this._getFromStorage('privacy_content', {
      last_updated: '',
      body: ''
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