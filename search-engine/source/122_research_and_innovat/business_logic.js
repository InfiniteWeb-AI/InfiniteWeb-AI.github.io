// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Legacy example keys from template (kept for compatibility)
    ensureArrayKey('users');
    ensureArrayKey('products');
    ensureArrayKey('carts');
    ensureArrayKey('cartItems');

    // Domain data keys based on the data model
    ensureArrayKey('conferences');
    ensureArrayKey('ticket_types');
    ensureArrayKey('cart');
    ensureArrayKey('cart_items');
    ensureArrayKey('registration_orders');
    ensureArrayKey('live_sessions');
    ensureArrayKey('on_demand_sessions');
    ensureArrayKey('exhibitors');
    ensureArrayKey('hotels');
    ensureArrayKey('attendees');
    ensureArrayKey('meetings');

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  // ---- Helper utilities ----

  _dayIdToLabel(dayId) {
    const map = {
      'day_1_june_12': 'Day 1  June 12',
      'day_2_june_13': 'Day 2  June 13',
      'day_3_june_14': 'Day 3  June 14'
    };
    return map[dayId] || dayId || '';
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getMinutesFromDateTime(dateTimeStr) {
    if (!dateTimeStr) return null;
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  _getCurrentConference() {
    const conferences = this._getFromStorage('conferences');
    if (!conferences || conferences.length === 0) return null;

    const currentYear = (new Date()).getFullYear();
    let byYear = conferences.filter((c) => typeof c.current_year === 'number' && c.current_year === currentYear);
    if (byYear.length === 0) {
      // pick the one with latest start_date
      byYear = conferences.slice().sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return db - da;
      });
    }
    return byYear[0] || conferences[0];
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let cart = null;

    if (carts.length > 0) {
      cart = carts[carts.length - 1];
    }

    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _getCartItemsForCart(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    return cartItems.filter((ci) => ci.cart_id === cartId);
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getCartItemsForCart(cartId);
    const tickets = this._getFromStorage('ticket_types');

    let totalAmount = 0;
    let taxesAndFees = 0;
    let workshopCreditsTotal = 0;
    let currency = 'usd';

    cartItems.forEach((item) => {
      totalAmount += item.total_price || 0;
      const ticket = tickets.find((t) => t.id === item.ticket_type_id);
      if (ticket) {
        if (typeof ticket.taxes_and_fees === 'number') {
          taxesAndFees += (ticket.taxes_and_fees || 0) * (item.quantity || 0);
        }
        if (ticket.includes_workshop_credits && ticket.workshop_credits) {
          workshopCreditsTotal += (ticket.workshop_credits || 0) * (item.quantity || 0);
        }
        if (ticket.currency) {
          currency = ticket.currency;
        }
      }
    });

    const subtotal = totalAmount - taxesAndFees;

    return {
      subtotal_amount: subtotal,
      taxes_and_fees: taxesAndFees,
      total_amount: totalAmount,
      currency: currency,
      workshop_credits_total: workshopCreditsTotal
    };
  }

  _resolveForeignKeys(items) {
    if (!items) return [];
    const arr = Array.isArray(items) ? items : [items];

    // Preload related collections
    const cache = {
      conference: this._getFromStorage('conferences'),
      cart: this._getFromStorage('cart'),
      ticket_type: this._getFromStorage('ticket_types'),
      attendee: this._getFromStorage('attendees'),
      exhibitor: this._getFromStorage('exhibitors'),
      hotel: this._getFromStorage('hotels'),
      live_session: this._getFromStorage('live_sessions'),
      on_demand_session: this._getFromStorage('on_demand_sessions'),
      meeting: this._getFromStorage('meetings')
    };

    const resolveOne = (obj) => {
      const clone = obj && typeof obj === 'object' ? Object.assign({}, obj) : obj;
      if (!clone || typeof clone !== 'object') return clone;
      Object.keys(clone).forEach((key) => {
        let base = null;
        if (key.endsWith('_id')) {
          base = key.slice(0, -3);
        } else if (key.endsWith('Id')) {
          base = key.slice(0, -2);
        }
        if (base) {
          const collection = cache[base];
          if (collection) {
            const value = clone[key];
            const related = collection.find((e) => e.id === value) || null;
            if (related !== undefined) {
              const propName = base;
              if (!Object.prototype.hasOwnProperty.call(clone, propName)) {
                clone[propName] = related;
              }
            }
          }
        }
      });
      return clone;
    };

    return arr.map(resolveOne);
  }

  _createMeetingRecord(params) {
    const meetings = this._getFromStorage('meetings');
    const conference = this._getCurrentConference();

    const start = new Date(params.start_datetime);
    const end = new Date(start.getTime() + (params.duration_minutes || 0) * 60000);

    const meeting = {
      id: this._generateId('meeting'),
      meeting_type: params.meeting_type,
      day_id: params.day_id,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      duration_minutes: params.duration_minutes,
      status: params.status || 'requested',
      attendee_id: params.attendee_id || null,
      exhibitor_id: params.exhibitor_id || null,
      title: params.title || '',
      description: params.description || '',
      location_type: params.location_type || 'conference_venue',
      location_details: params.location_details || '',
      created_at: new Date().toISOString(),
      conference_id: conference ? conference.id : null
    };

    meetings.push(meeting);
    this._saveToStorage('meetings', meetings);

    return meeting;
  }

  _getUserScheduleState() {
    const sessions = this._getFromStorage('live_sessions');
    return sessions.filter((s) => !!s.added_to_my_schedule).map((s) => s.id);
  }

  _getUserWatchlistState() {
    const onDemand = this._getFromStorage('on_demand_sessions');
    return onDemand.filter((s) => !!s.in_watchlist).map((s) => s.id);
  }

  _getUserBookmarksState() {
    const exhibitors = this._getFromStorage('exhibitors');
    const hotels = this._getFromStorage('hotels');
    return {
      exhibitors: exhibitors.filter((e) => !!e.is_bookmarked).map((e) => e.id),
      hotels: hotels.filter((h) => !!h.is_saved).map((h) => h.id)
    };
  }

  // ---- Core interface implementations ----

  // Homepage
  getHomePageData() {
    const conference = this._getCurrentConference();
    const hero = {
      headline: conference ? conference.name : 'Conference',
      subheadline: conference && conference.theme ? conference.theme : 'Research & innovation conference',
      date_range_display: '',
      location_display: ''
    };

    if (conference) {
      const startStr = conference.start_date ? String(conference.start_date) : '';
      const endStr = conference.end_date ? String(conference.end_date) : '';
      hero.date_range_display = startStr && endStr ? (startStr + '  ' + endStr) : (startStr || endStr || '');
      hero.location_display = conference.venue_name + (conference.venue_address ? ', ' + conference.venue_address : '');
    }

    const primary_ctas = [
      { id: 'cta_tickets', label: 'Tickets & Pricing', target_page: 'tickets_pricing' },
      { id: 'cta_schedule', label: 'Full Program', target_page: 'full_schedule' },
      { id: 'cta_travel', label: 'Travel & Accommodation', target_page: 'travel_accommodation' }
    ];

    // Highlighted ticket: cheapest active three_day with workshop credits
    const ticketsData = this.getTickets({
      duration_type: 'three_day',
      includes_workshop_credits: true,
      only_active: true
    }, 'price_low_to_high', 1, 50);
    const highlighted_ticket = ticketsData.tickets && ticketsData.tickets.length > 0 ? ticketsData.tickets[0] : null;

    // Featured sessions: top by popularity
    const allSessions = this._getFromStorage('live_sessions');
    const featured_sessions_raw = allSessions
      .filter((s) => !!s.popularity_score)
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 5);
    const featured_sessions = this._resolveForeignKeys(featured_sessions_raw);

    // Featured exhibitors: highest rating
    const allExhibitors = this._getFromStorage('exhibitors');
    const featured_exhibitors_raw = allExhibitors
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
    const featured_exhibitors = this._resolveForeignKeys(featured_exhibitors_raw);

    return {
      conference: conference,
      hero: hero,
      primary_ctas: primary_ctas,
      highlighted_ticket: highlighted_ticket,
      featured_sessions: featured_sessions,
      featured_exhibitors: featured_exhibitors
    };
  }

  // Tickets & Pricing
  getTicketFilterOptions() {
    const tickets = this._getFromStorage('ticket_types');
    const prices = tickets.map((t) => t.total_price || 0);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    return {
      duration_types: [
        { value: 'one_day', label: '1-Day' },
        { value: 'two_day', label: '2-Day' },
        { value: 'three_day', label: '3-Day' },
        { value: 'full_conference', label: 'Full Conference' },
        { value: 'workshop_only', label: 'Workshop Only' },
        { value: 'virtual_only', label: 'Virtual Only' }
      ],
      access_levels: [
        { value: 'standard', label: 'Standard' },
        { value: 'vip', label: 'VIP' },
        { value: 'student', label: 'Student' },
        { value: 'exhibitor', label: 'Exhibitor' },
        { value: 'staff', label: 'Staff' }
      ],
      workshop_credit_options: [
        { value: 'includes_workshops', label: 'Includes workshop credits' },
        { value: 'no_workshops', label: 'No workshop credits' }
      ],
      price_range: {
        min_price: min,
        max_price: max,
        currency: 'usd'
      },
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'popularity', label: 'Most Popular' }
      ]
    };
  }

  getTickets(filters, sort, page, page_size) {
    filters = filters || {};
    sort = sort || 'price_low_to_high';
    page = page || 1;
    page_size = page_size || 20;

    const allTickets = this._getFromStorage('ticket_types');
    const conference = this._getCurrentConference();

    let list = allTickets.slice();

    if (conference) {
      list = list.filter((t) => !t.conference_id || t.conference_id === conference.id);
    }

    if (filters.duration_type) {
      list = list.filter((t) => t.duration_type === filters.duration_type);
    }
    if (typeof filters.includes_workshop_credits === 'boolean') {
      list = list.filter((t) => !!t.includes_workshop_credits === filters.includes_workshop_credits);
    }
    if (filters.access_level) {
      list = list.filter((t) => t.access_level === filters.access_level);
    }
    if (typeof filters.min_price === 'number') {
      list = list.filter((t) => (t.total_price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      list = list.filter((t) => (t.total_price || 0) <= filters.max_price);
    }
    if (typeof filters.only_active === 'boolean' && filters.only_active) {
      list = list.filter((t) => t.is_active !== false);
    }

    if (sort === 'price_low_to_high') {
      list.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
    } else if (sort === 'price_high_to_low') {
      list.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    }

    const total_count = list.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = list.slice(start, end);

    const ticketsResolved = this._resolveForeignKeys(paged);

    return {
      tickets: ticketsResolved,
      total_count: total_count,
      currency: 'usd'
    };
  }

  getTicketDetail(ticketTypeId) {
    const tickets = this._getFromStorage('ticket_types');
    const ticketRaw = tickets.find((t) => t.id === ticketTypeId) || null;

    if (!ticketRaw) {
      return {
        ticket: null,
        included_days_display: [],
        benefit_highlights: [],
        related_tickets: []
      };
    }

    const ticket = this._resolveForeignKeys([ticketRaw])[0];

    const included_days_display = Array.isArray(ticketRaw.days_included)
      ? ticketRaw.days_included.map((d) => this._dayIdToLabel(d))
      : [];

    const benefit_highlights = [];
    if (ticketRaw.duration_type === 'three_day') {
      benefit_highlights.push('Access to all three conference days');
    } else if (ticketRaw.duration_type === 'full_conference') {
      benefit_highlights.push('Access to full conference program');
    }
    if (ticketRaw.includes_workshop_credits) {
      const credits = ticketRaw.workshop_credits || 1;
      benefit_highlights.push('Includes ' + credits + ' workshop credit' + (credits > 1 ? 's' : ''));
    }

    const related_tickets_raw = tickets.filter((t) => t.id !== ticketRaw.id && t.duration_type === ticketRaw.duration_type && (!ticketRaw.conference_id || t.conference_id === ticketRaw.conference_id));
    const related_tickets = this._resolveForeignKeys(related_tickets_raw);

    return {
      ticket: ticket,
      included_days_display: included_days_display,
      benefit_highlights: benefit_highlights,
      related_tickets: related_tickets
    };
  }

  addTicketToCart(ticketTypeId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const tickets = this._getFromStorage('ticket_types');
    const ticket = tickets.find((t) => t.id === ticketTypeId);
    if (!ticket) {
      return { success: false, message: 'Ticket not found', cart: null, cart_items: [], total_amount: 0, currency: 'usd' };
    }

    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);

    let cartItems = this._getFromStorage('cart_items');
    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.ticket_type_id === ticketTypeId);

    const maxPerOrder = typeof ticket.max_quantity_per_order === 'number' && ticket.max_quantity_per_order > 0
      ? ticket.max_quantity_per_order
      : null;

    let newQuantity = quantity;
    if (item) {
      newQuantity = item.quantity + quantity;
    }
    if (maxPerOrder && newQuantity > maxPerOrder) {
      newQuantity = maxPerOrder;
    }

    const unitPrice = ticket.total_price || 0;
    const totalPrice = unitPrice * newQuantity;

    const now = new Date().toISOString();

    if (item) {
      item.quantity = newQuantity;
      item.unit_price = unitPrice;
      item.total_price = totalPrice;
      item.added_at = item.added_at || now;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        ticket_type_id: ticket.id,
        quantity: newQuantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        added_at: now,
        ticket_name: ticket.name,
        duration_type: ticket.duration_type,
        includes_workshop_credits: !!ticket.includes_workshop_credits
      };
      cartItems.push(item);
      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }
      if (cart.items.indexOf(item.id) === -1) {
        cart.items.push(item.id);
      }
    }

    cart.updated_at = now;
    if (cartIndex !== -1) {
      carts[cartIndex] = cart;
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    const totals = this._calculateCartTotals(cart.id);
    const cartItemsForCart = this._getCartItemsForCart(cart.id);

    return {
      success: true,
      message: 'Ticket added to cart',
      cart: cart,
      cart_items: cartItemsForCart,
      total_amount: totals.total_amount,
      currency: totals.currency
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);
    const tickets = this._getFromStorage('ticket_types');

    const items = cartItems.map((ci) => {
      const ticket = tickets.find((t) => t.id === ci.ticket_type_id) || null;
      return {
        cart_item: ci,
        ticket: ticket
      };
    });

    const totalsCalc = this._calculateCartTotals(cart.id);

    return {
      cart: cart,
      items: items,
      totals: {
        subtotal_amount: totalsCalc.subtotal_amount,
        taxes_and_fees: totalsCalc.taxes_and_fees,
        total_amount: totalsCalc.total_amount,
        currency: totalsCalc.currency
      },
      workshop_credits_total: totalsCalc.workshop_credits_total
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found', cart: null, cart_items: [], total_amount: 0, currency: 'usd' };
    }

    const item = cartItems[itemIndex];

    if (quantity <= 0) {
      const cartId = item.cart_id;
      cartItems.splice(itemIndex, 1);
      this._saveToStorage('cart_items', cartItems);

      const carts = this._getFromStorage('cart');
      const cartIndex = carts.findIndex((c) => c.id === cartId);
      let cart = cartIndex !== -1 ? carts[cartIndex] : null;
      if (cart && Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== cartItemId);
        cart.updated_at = new Date().toISOString();
        carts[cartIndex] = cart;
        this._saveToStorage('cart', carts);
      }

      const totals = cart ? this._calculateCartTotals(cart.id) : { total_amount: 0, currency: 'usd' };
      const cartItemsForCart = cart ? this._getCartItemsForCart(cart.id) : [];

      return {
        success: true,
        message: 'Cart item removed',
        cart: cart,
        cart_items: cartItemsForCart,
        total_amount: totals.total_amount || 0,
        currency: totals.currency || 'usd'
      };
    }

    const tickets = this._getFromStorage('ticket_types');
    const ticket = tickets.find((t) => t.id === item.ticket_type_id);
    const maxPerOrder = ticket && typeof ticket.max_quantity_per_order === 'number' && ticket.max_quantity_per_order > 0
      ? ticket.max_quantity_per_order
      : null;

    let newQuantity = quantity;
    if (maxPerOrder && newQuantity > maxPerOrder) {
      newQuantity = maxPerOrder;
    }

    const unitPrice = ticket ? (ticket.total_price || 0) : (item.unit_price || 0);
    const totalPrice = unitPrice * newQuantity;

    item.quantity = newQuantity;
    item.unit_price = unitPrice;
    item.total_price = totalPrice;

    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === item.cart_id);
    let cart = cartIndex !== -1 ? carts[cartIndex] : null;
    if (cart) {
      cart.updated_at = new Date().toISOString();
      carts[cartIndex] = cart;
      this._saveToStorage('cart', carts);
    }

    const totals = cart ? this._calculateCartTotals(cart.id) : { total_amount: totalPrice, currency: ticket ? ticket.currency : 'usd' };
    const cartItemsForCart = cart ? this._getCartItemsForCart(cart.id) : [item];

    return {
      success: true,
      message: 'Cart item updated',
      cart: cart,
      cart_items: cartItemsForCart,
      total_amount: totals.total_amount,
      currency: totals.currency
    };
  }

  removeCartItem(cartItemId) {
    return this.updateCartItemQuantity(cartItemId, 0);
  }

  getRegistrationPageData() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);
    const tickets = this._getFromStorage('ticket_types');

    const items = cartItems.map((ci) => {
      const ticket = tickets.find((t) => t.id === ci.ticket_type_id) || null;
      return { cart_item: ci, ticket: ticket };
    });

    const totalsCalc = this._calculateCartTotals(cart.id);

    const availableDayIds = new Set();
    items.forEach((pair) => {
      if (pair.ticket && Array.isArray(pair.ticket.days_included)) {
        pair.ticket.days_included.forEach((d) => availableDayIds.add(d));
      }
    });

    if (availableDayIds.size === 0) {
      availableDayIds.add('day_1_june_12');
      availableDayIds.add('day_2_june_13');
      availableDayIds.add('day_3_june_14');
    }

    const available_days = Array.from(availableDayIds).map((dayId) => ({
      day_id: dayId,
      label: this._dayIdToLabel(dayId)
    }));

    const payment_options = [
      { value: 'pay_on_site', label: 'Pay on-site', is_external: false },
      { value: 'invoice_me_later', label: 'Invoice me later', is_external: false },
      { value: 'credit_card', label: 'Credit card', is_external: true },
      { value: 'bank_transfer', label: 'Bank transfer', is_external: true }
    ];

    return {
      cart_summary: {
        cart: cart,
        items: items,
        totals: {
          subtotal_amount: totalsCalc.subtotal_amount,
          taxes_and_fees: totalsCalc.taxes_and_fees,
          total_amount: totalsCalc.total_amount,
          currency: totalsCalc.currency
        }
      },
      available_days: available_days,
      payment_options: payment_options
    };
  }

  submitRegistrationOrder(purchaser_full_name, purchaser_email, organization, selected_days, payment_option, notes) {
    purchaser_full_name = purchaser_full_name || '';
    purchaser_email = purchaser_email || '';
    payment_option = payment_option || 'pay_on_site';

    const cart = this._getOrCreateCart();
    const totalsCalc = this._calculateCartTotals(cart.id);

    const regOrders = this._getFromStorage('registration_orders');

    let days = Array.isArray(selected_days) ? selected_days.slice() : [];
    if (days.length === 0) {
      const tickets = this._getFromStorage('ticket_types');
      const cartItems = this._getCartItemsForCart(cart.id);
      const daySet = new Set();
      cartItems.forEach((ci) => {
        const ticket = tickets.find((t) => t.id === ci.ticket_type_id);
        if (ticket && Array.isArray(ticket.days_included)) {
          ticket.days_included.forEach((d) => daySet.add(d));
        }
      });
      if (daySet.size === 0) {
        daySet.add('day_1_june_12');
        daySet.add('day_2_june_13');
        daySet.add('day_3_june_14');
      }
      days = Array.from(daySet);
    }

    const now = new Date().toISOString();
    const order = {
      id: this._generateId('reg_order'),
      cart_id: cart.id,
      purchaser_full_name: purchaser_full_name,
      purchaser_email: purchaser_email,
      organization: organization || '',
      selected_days: days,
      total_amount: totalsCalc.total_amount,
      currency: totalsCalc.currency,
      payment_option: payment_option,
      status: 'pending',
      confirmation_number: 'CONF-' + this._getNextIdCounter(),
      created_at: now,
      updated_at: now,
      notes: notes || ''
    };

    regOrders.push(order);
    this._saveToStorage('registration_orders', regOrders);

    return order;
  }

  // Schedule & sessions
  getScheduleFilterOptions() {
    return {
      day_options: [
        { day_id: 'day_1_june_12', label: this._dayIdToLabel('day_1_june_12') },
        { day_id: 'day_2_june_13', label: this._dayIdToLabel('day_2_june_13') },
        { day_id: 'day_3_june_14', label: this._dayIdToLabel('day_3_june_14') }
      ],
      session_type_options: [
        { value: 'keynote', label: 'Keynote' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'networking', label: 'Networking' },
        { value: 'social_event', label: 'Social event' },
        { value: 'breakout_session', label: 'Breakout session' },
        { value: 'panel', label: 'Panel' },
        { value: 'tutorial', label: 'Tutorial' },
        { value: 'exhibitor_demo', label: 'Exhibitor demo' },
        { value: 'other', label: 'Other' }
      ],
      track_options: [
        { value: 'ai_and_machine_learning', label: 'AI & Machine Learning' },
        { value: 'ux_and_design', label: 'UX & Design' },
        { value: 'product_management', label: 'Product Management' },
        { value: 'data_engineering', label: 'Data Engineering' },
        { value: 'devops', label: 'DevOps' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'research_innovation', label: 'Research & Innovation' },
        { value: 'business_strategy', label: 'Business Strategy' },
        { value: 'other', label: 'Other' }
      ],
      time_range_defaults: {
        start_time: '09:00',
        end_time: '18:00'
      }
    };
  }

  getScheduleSessions(filters, search_query, sort) {
    filters = filters || {};
    sort = sort || 'start_time';
    search_query = search_query || '';

    const sessionsAll = this._getFromStorage('live_sessions');
    const conference = this._getCurrentConference();
    let list = sessionsAll.slice();

    if (conference) {
      list = list.filter((s) => !s.conference_id || s.conference_id === conference.id);
    }

    if (filters.day_id) {
      list = list.filter((s) => s.day_id === filters.day_id);
    }
    if (filters.session_type) {
      list = list.filter((s) => s.session_type === filters.session_type);
    }
    if (filters.track) {
      list = list.filter((s) => s.track === filters.track);
    }

    const fromMin = this._parseTimeToMinutes(filters.start_time_from);
    const toMin = this._parseTimeToMinutes(filters.start_time_to);
    if (fromMin !== null || toMin !== null) {
      list = list.filter((s) => {
        const minutes = this._getMinutesFromDateTime(s.start_datetime);
        if (minutes === null) return false;
        if (fromMin !== null && minutes < fromMin) return false;
        if (toMin !== null && minutes > toMin) return false;
        return true;
      });
    }

    if (search_query) {
      const q = search_query.toLowerCase();
      list = list.filter((s) => {
        if ((s.title || '').toLowerCase().indexOf(q) !== -1) return true;
        if ((s.description || '').toLowerCase().indexOf(q) !== -1) return true;
        if (Array.isArray(s.speakers) && s.speakers.join(' ').toLowerCase().indexOf(q) !== -1) return true;
        if (Array.isArray(s.hosts) && s.hosts.join(' ').toLowerCase().indexOf(q) !== -1) return true;
        return false;
      });
    }

    if (sort === 'start_time') {
      list.sort((a, b) => {
        const ta = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const tb = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return ta - tb;
      });
    } else if (sort === 'popularity') {
      list.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    return this._resolveForeignKeys(list);
  }

  getLiveSessionDetail(sessionId) {
    const sessions = this._getFromStorage('live_sessions');
    const sessionRaw = sessions.find((s) => s.id === sessionId) || null;
    if (!sessionRaw) return null;
    return this._resolveForeignKeys([sessionRaw])[0];
  }

  toggleSessionInMySchedule(sessionId, add) {
    const sessions = this._getFromStorage('live_sessions');
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) {
      return { session: null, added_to_schedule: false, conflicts: [] };
    }

    const session = sessions[index];
    session.added_to_my_schedule = !!add;
    sessions[index] = session;

    // compute conflicts
    let conflicts = [];
    if (add) {
      const start = new Date(session.start_datetime).getTime();
      const end = new Date(session.end_datetime).getTime();
      conflicts = sessions
        .filter((s) => s.id !== session.id && s.added_to_my_schedule && s.day_id === session.day_id)
        .filter((s) => {
          const sStart = new Date(s.start_datetime).getTime();
          const sEnd = new Date(s.end_datetime).getTime();
          return start < sEnd && end > sStart;
        });
    }

    this._saveToStorage('live_sessions', sessions);

    return {
      session: this._resolveForeignKeys([session])[0],
      added_to_schedule: !!session.added_to_my_schedule,
      conflicts: this._resolveForeignKeys(conflicts)
    };
  }

  getMySchedule() {
    const sessions = this._getFromStorage('live_sessions');
    const meetings = this._getFromStorage('meetings');
    const conference = this._getCurrentConference();

    const mySessions = sessions.filter((s) => !!s.added_to_my_schedule && (!s.conference_id || !conference || s.conference_id === conference.id));
    const myMeetings = meetings.filter((m) => !conference || !m.conference_id || m.conference_id === conference.id);

    const daysMap = {};

    mySessions.forEach((s) => {
      if (!daysMap[s.day_id]) {
        daysMap[s.day_id] = { day_id: s.day_id, label: this._dayIdToLabel(s.day_id), sessions: [], meetings: [] };
      }
      daysMap[s.day_id].sessions.push(s);
    });

    myMeetings.forEach((m) => {
      if (!daysMap[m.day_id]) {
        daysMap[m.day_id] = { day_id: m.day_id, label: this._dayIdToLabel(m.day_id), sessions: [], meetings: [] };
      }
      daysMap[m.day_id].meetings.push(m);
    });

    const days = Object.keys(daysMap).sort().map((dayId) => {
      const day = daysMap[dayId];
      return {
        day_id: day.day_id,
        label: day.label,
        sessions: this._resolveForeignKeys(day.sessions),
        meetings: this._resolveForeignKeys(day.meetings)
      };
    });

    return { days: days };
  }

  // Social & networking events
  getNetworkingEvents(filters, sort) {
    filters = filters || {};
    sort = sort || 'start_time';

    const sessionsAll = this._getFromStorage('live_sessions');
    const conference = this._getCurrentConference();
    let list = sessionsAll.slice();

    if (conference) {
      list = list.filter((s) => !s.conference_id || s.conference_id === conference.id);
    }

    list = list.filter((s) => s.session_type === 'networking' || s.session_type === 'social_event' || s.is_networking);

    if (filters.day_id) {
      list = list.filter((s) => s.day_id === filters.day_id);
    }

    const fromMin = this._parseTimeToMinutes(filters.start_time_from);
    if (fromMin !== null) {
      list = list.filter((s) => {
        const minutes = this._getMinutesFromDateTime(s.start_datetime);
        return minutes !== null && minutes >= fromMin;
      });
    }

    if (typeof filters.has_free_refreshments === 'boolean') {
      list = list.filter((s) => {
        const has = !!s.has_free_refreshments || (Array.isArray(s.perks) && s.perks.indexOf('free_refreshments') !== -1);
        return filters.has_free_refreshments ? has : !has;
      });
    }

    if (filters.event_type) {
      list = list.filter((s) => s.session_type === filters.event_type);
    }

    if (sort === 'start_time') {
      list.sort((a, b) => {
        const ta = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const tb = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return ta - tb;
      });
    } else if (sort === 'popularity') {
      list.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    return this._resolveForeignKeys(list);
  }

  // Workshops
  getWorkshopsFilterOptions() {
    const workshops = this._getFromStorage('live_sessions').filter((s) => s.session_type === 'workshop' || s.is_workshop);
    const prices = workshops.map((w) => w.price || 0);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    return {
      day_options: [
        { day_id: 'day_1_june_12', label: this._dayIdToLabel('day_1_june_12') },
        { day_id: 'day_2_june_13', label: this._dayIdToLabel('day_2_june_13') },
        { day_id: 'day_3_june_14', label: this._dayIdToLabel('day_3_june_14') }
      ],
      track_options: [
        { value: 'ux_and_design', label: 'UX & Design' },
        { value: 'ai_and_machine_learning', label: 'AI & Machine Learning' },
        { value: 'product_management', label: 'Product Management' },
        { value: 'data_engineering', label: 'Data Engineering' },
        { value: 'devops', label: 'DevOps' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'research_innovation', label: 'Research & Innovation' },
        { value: 'business_strategy', label: 'Business Strategy' },
        { value: 'other', label: 'Other' }
      ],
      difficulty_options: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'expert', label: 'Expert' },
        { value: 'all_levels', label: 'All levels' }
      ],
      duration_ranges: [
        { max_minutes: 90, label: 'Up to 1.5 hours' },
        { max_minutes: 180, label: 'Up to 3 hours' },
        { max_minutes: 240, label: 'Up to 4 hours' }
      ],
      price_range: {
        min_price: min,
        max_price: max,
        currency: 'usd'
      }
    };
  }

  getWorkshopsListing(filters, search_query, sort) {
    filters = filters || {};
    search_query = search_query || '';
    sort = sort || 'start_time';

    const allSessions = this._getFromStorage('live_sessions');
    const conference = this._getCurrentConference();
    let list = allSessions.filter((s) => s.session_type === 'workshop' || s.is_workshop);

    if (conference) {
      list = list.filter((s) => !s.conference_id || s.conference_id === conference.id);
    }

    if (filters.day_id) {
      list = list.filter((s) => s.day_id === filters.day_id);
    }
    if (filters.track) {
      list = list.filter((s) => s.track === filters.track);
    }
    if (filters.difficulty_level) {
      list = list.filter((s) => s.difficulty_level === filters.difficulty_level);
    }
    if (typeof filters.max_duration_minutes === 'number') {
      list = list.filter((s) => (s.duration_minutes || 0) <= filters.max_duration_minutes);
    }
    if (typeof filters.min_price === 'number') {
      list = list.filter((s) => (s.price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      list = list.filter((s) => (s.price || 0) <= filters.max_price);
    }

    if (search_query) {
      const q = search_query.toLowerCase();
      list = list.filter((s) => {
        if ((s.title || '').toLowerCase().indexOf(q) !== -1) return true;
        if ((s.description || '').toLowerCase().indexOf(q) !== -1) return true;
        return false;
      });
    }

    if (sort === 'price_low_to_high') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'difficulty_desc') {
      const order = { expert: 4, advanced: 3, intermediate: 2, beginner: 1, all_levels: 0, not_applicable: 0 };
      list.sort((a, b) => (order[b.difficulty_level] || 0) - (order[a.difficulty_level] || 0));
    } else if (sort === 'start_time') {
      list.sort((a, b) => {
        const ta = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const tb = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return ta - tb;
      });
    }

    return this._resolveForeignKeys(list);
  }

  // Exhibitors & sponsors
  getExhibitorFilterOptions() {
    return {
      sponsor_levels: [
        { value: 'platinum', label: 'Platinum' },
        { value: 'gold', label: 'Gold' },
        { value: 'silver', label: 'Silver' },
        { value: 'bronze', label: 'Bronze' },
        { value: 'partner', label: 'Partner' },
        { value: 'startup', label: 'Startup' }
      ],
      category_options: [
        { value: 'ai_tools_and_platforms', label: 'AI Tools & Platforms' },
        { value: 'analytics', label: 'Analytics' },
        { value: 'design_tools', label: 'Design Tools' }
      ],
      rating_thresholds: [3, 3.5, 4, 4.5],
      sort_options: [
        { value: 'name', label: 'Name' },
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'sponsor_level', label: 'Sponsor level' }
      ]
    };
  }

  getExhibitorsListing(filters, search_query, sort, page, page_size) {
    filters = filters || {};
    search_query = search_query || '';
    sort = sort || 'name';
    page = page || 1;
    page_size = page_size || 20;

    const allExhibitors = this._getFromStorage('exhibitors');
    const conference = this._getCurrentConference();
    let list = allExhibitors.slice();

    if (conference) {
      list = list.filter((e) => !e.conference_id || e.conference_id === conference.id);
    }

    if (filters.sponsor_level) {
      list = list.filter((e) => e.sponsor_level === filters.sponsor_level);
    }
    if (filters.category) {
      list = list.filter((e) => Array.isArray(e.categories) && e.categories.indexOf(filters.category) !== -1);
    }
    if (typeof filters.min_rating === 'number') {
      list = list.filter((e) => (e.rating || 0) >= filters.min_rating);
    }

    if (search_query) {
      const q = search_query.toLowerCase();
      list = list.filter((e) => {
        if ((e.name || '').toLowerCase().indexOf(q) !== -1) return true;
        if ((e.description || '').toLowerCase().indexOf(q) !== -1) return true;
        if (Array.isArray(e.primary_product_keywords) && e.primary_product_keywords.join(' ').toLowerCase().indexOf(q) !== -1) return true;
        return false;
      });
    }

    if (sort === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'rating_desc') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'sponsor_level') {
      const order = { platinum: 5, gold: 4, silver: 3, bronze: 2, partner: 1, startup: 0 };
      list.sort((a, b) => (order[b.sponsor_level] || 0) - (order[a.sponsor_level] || 0));
    }

    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = list.slice(start, end);

    return this._resolveForeignKeys(paged);
  }

  getExhibitorDetail(exhibitorId) {
    const exhibitors = this._getFromStorage('exhibitors');
    const ex = exhibitors.find((e) => e.id === exhibitorId) || null;
    if (!ex) return null;
    return this._resolveForeignKeys([ex])[0];
  }

  toggleExhibitorBookmark(exhibitorId, bookmark) {
    const exhibitors = this._getFromStorage('exhibitors');
    const index = exhibitors.findIndex((e) => e.id === exhibitorId);
    if (index === -1) return null;
    const ex = exhibitors[index];
    ex.is_bookmarked = !!bookmark;
    exhibitors[index] = ex;
    this._saveToStorage('exhibitors', exhibitors);
    return this._resolveForeignKeys([ex])[0];
  }

  bookExhibitorDemo(exhibitorId, day_id, start_datetime, duration_minutes) {
    const exhibitors = this._getFromStorage('exhibitors');
    const ex = exhibitors.find((e) => e.id === exhibitorId) || null;
    const title = ex ? 'Demo with ' + ex.name : 'Exhibitor demo';

    const meeting = this._createMeetingRecord({
      meeting_type: 'exhibitor_demo',
      day_id: day_id,
      start_datetime: start_datetime,
      duration_minutes: duration_minutes,
      status: 'requested',
      exhibitor_id: exhibitorId,
      title: title,
      description: '',
      location_type: 'exhibitor_booth',
      location_details: ex && ex.booth_location ? ex.booth_location : ''
    });

    return this._resolveForeignKeys([meeting])[0];
  }

  // Travel & accommodation
  getHotelsFilterOptions() {
    const hotels = this._getFromStorage('hotels');
    const rates = hotels.map((h) => h.nightly_rate || 0);
    const min = rates.length ? Math.min.apply(null, rates) : 0;
    const max = rates.length ? Math.max.apply(null, rates) : 0;

    return {
      max_distance_km: 10,
      price_range: {
        min_rate: min,
        max_rate: max,
        currency: 'usd'
      },
      amenity_options: [
        { value: 'breakfast_included', label: 'Breakfast included' },
        { value: 'wifi', label: 'Wi-Fi' },
        { value: 'gym', label: 'Gym' },
        { value: 'parking', label: 'Parking' }
      ],
      rating_thresholds: [3, 3.5, 4, 4.5],
      sort_options: [
        { value: 'distance_asc', label: 'Distance: Nearest first' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'rating_desc', label: 'Rating: High to Low' }
      ]
    };
  }

  getHotelsListing(filters, sort) {
    filters = filters || {};
    sort = sort || 'distance_asc';

    const hotelsAll = this._getFromStorage('hotels');
    const conference = this._getCurrentConference();
    let list = hotelsAll.slice();

    if (conference) {
      list = list.filter((h) => !h.conference_id || h.conference_id === conference.id);
    }

    if (typeof filters.max_distance_km === 'number') {
      list = list.filter((h) => (h.distance_km || 0) <= filters.max_distance_km);
    }
    if (typeof filters.max_nightly_rate === 'number') {
      list = list.filter((h) => (h.nightly_rate || 0) <= filters.max_nightly_rate);
    }
    if (typeof filters.min_rating === 'number') {
      list = list.filter((h) => (h.rating || 0) >= filters.min_rating);
    }
    if (Array.isArray(filters.required_amenities) && filters.required_amenities.length > 0) {
      list = list.filter((h) => {
        if (!Array.isArray(h.amenities)) return false;
        return filters.required_amenities.every((a) => h.amenities.indexOf(a) !== -1);
      });
    }

    if (sort === 'distance_asc') {
      list.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    } else if (sort === 'price_asc') {
      list.sort((a, b) => (a.nightly_rate || 0) - (b.nightly_rate || 0));
    } else if (sort === 'rating_desc') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return this._resolveForeignKeys(list);
  }

  getHotelDetail(hotelId) {
    const hotels = this._getFromStorage('hotels');
    const hotel = hotels.find((h) => h.id === hotelId) || null;
    if (!hotel) return null;
    return this._resolveForeignKeys([hotel])[0];
  }

  toggleHotelSaved(hotelId, save) {
    const hotels = this._getFromStorage('hotels');
    const index = hotels.findIndex((h) => h.id === hotelId);
    if (index === -1) return null;
    const hotel = hotels[index];
    hotel.is_saved = !!save;
    hotels[index] = hotel;
    this._saveToStorage('hotels', hotels);
    return this._resolveForeignKeys([hotel])[0];
  }

  // On-demand library
  getOnDemandFilterOptions() {
    const sessions = this._getFromStorage('on_demand_sessions');
    const yearsSet = new Set();
    sessions.forEach((s) => {
      if (typeof s.year === 'number') yearsSet.add(s.year);
    });
    const year_options = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      year_options: year_options,
      track_options: [
        { value: 'ux_and_design', label: 'UX & Design' },
        { value: 'ai_and_machine_learning', label: 'AI & Machine Learning' },
        { value: 'product_management', label: 'Product Management' },
        { value: 'data_engineering', label: 'Data Engineering' },
        { value: 'devops', label: 'DevOps' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'research_innovation', label: 'Research & Innovation' },
        { value: 'business_strategy', label: 'Business Strategy' },
        { value: 'other', label: 'Other' }
      ],
      duration_ranges: [
        { max_minutes: 30, label: 'Up to 30 minutes' },
        { max_minutes: 60, label: 'Up to 60 minutes' },
        { max_minutes: 90, label: 'Up to 90 minutes' }
      ],
      sort_options: [
        { value: 'most_popular', label: 'Most popular' },
        { value: 'newest', label: 'Newest' },
        { value: 'title_asc', label: 'Title AZ' }
      ]
    };
  }

  getOnDemandLibrary(filters, sort) {
    filters = filters || {};
    sort = sort || 'most_popular';

    const sessionsAll = this._getFromStorage('on_demand_sessions');
    const conference = this._getCurrentConference();
    let list = sessionsAll.slice();

    if (conference) {
      list = list.filter((s) => !s.conference_id || s.conference_id === conference.id);
    }

    if (typeof filters.year === 'number') {
      list = list.filter((s) => s.year === filters.year);
    }
    if (filters.track) {
      list = list.filter((s) => s.track === filters.track);
    }
    if (typeof filters.max_duration_minutes === 'number') {
      list = list.filter((s) => (s.duration_minutes || 0) <= filters.max_duration_minutes);
    }

    if (sort === 'most_popular') {
      list.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort === 'newest') {
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'title_asc') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return this._resolveForeignKeys(list);
  }

  getOnDemandSessionDetail(onDemandSessionId) {
    const sessions = this._getFromStorage('on_demand_sessions');
    const s = sessions.find((x) => x.id === onDemandSessionId) || null;
    if (!s) return null;
    return this._resolveForeignKeys([s])[0];
  }

  toggleOnDemandWatchlist(onDemandSessionId, add) {
    const sessions = this._getFromStorage('on_demand_sessions');
    const index = sessions.findIndex((s) => s.id === onDemandSessionId);
    if (index === -1) return null;
    const session = sessions[index];
    session.in_watchlist = !!add;
    sessions[index] = session;
    this._saveToStorage('on_demand_sessions', sessions);
    return this._resolveForeignKeys([session])[0];
  }

  // Attendee directory & meetings
  getAttendeeDirectoryFilterOptions() {
    const attendees = this._getFromStorage('attendees');
    const roleSet = new Set();
    const companySet = new Set();
    const interestSet = new Set();

    attendees.forEach((a) => {
      if (a.role) roleSet.add(a.role);
      if (a.company) companySet.add(a.company);
      if (Array.isArray(a.interests)) {
        a.interests.forEach((i) => interestSet.add(i));
      }
    });

    return {
      role_options: Array.from(roleSet),
      company_examples: Array.from(companySet).slice(0, 10),
      interest_tags: Array.from(interestSet)
    };
  }

  getAttendeeDirectory(filters, search_query, page, page_size) {
    filters = filters || {};
    search_query = search_query || '';
    page = page || 1;
    page_size = page_size || 20;

    const attendeesAll = this._getFromStorage('attendees');
    let list = attendeesAll.slice();

    if (filters.role) {
      list = list.filter((a) => a.role === filters.role);
    }
    if (filters.company) {
      const companyLower = filters.company.toLowerCase();
      list = list.filter((a) => (a.company || '').toLowerCase().indexOf(companyLower) !== -1);
    }
    if (filters.location) {
      const locLower = filters.location.toLowerCase();
      list = list.filter((a) => (a.location || '').toLowerCase().indexOf(locLower) !== -1);
    }
    if (Array.isArray(filters.interests) && filters.interests.length > 0) {
      list = list.filter((a) => {
        if (!Array.isArray(a.interests)) return false;
        return filters.interests.every((i) => a.interests.indexOf(i) !== -1);
      });
    }

    if (search_query) {
      const q = search_query.toLowerCase();
      list = list.filter((a) => {
        if ((a.full_name || '').toLowerCase().indexOf(q) !== -1) return true;
        if ((a.bio || '').toLowerCase().indexOf(q) !== -1) return true;
        if (Array.isArray(a.interests) && a.interests.join(' ').toLowerCase().indexOf(q) !== -1) return true;
        return false;
      });
    }

    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = list.slice(start, end);

    return this._resolveForeignKeys(paged);
  }

  getAttendeeProfile(attendeeId) {
    const attendees = this._getFromStorage('attendees');
    const a = attendees.find((x) => x.id === attendeeId) || null;
    if (!a) return null;
    return this._resolveForeignKeys([a])[0];
  }

  scheduleAttendeeMeeting(attendeeId, day_id, start_datetime, duration_minutes, message) {
    const attendees = this._getFromStorage('attendees');
    const a = attendees.find((x) => x.id === attendeeId) || null;
    const title = a ? 'Meeting with ' + a.full_name : 'Attendee meeting';
    const description = message || '';

    const meeting = this._createMeetingRecord({
      meeting_type: 'attendee_meeting',
      day_id: day_id,
      start_datetime: start_datetime,
      duration_minutes: duration_minutes,
      status: 'requested',
      attendee_id: attendeeId,
      title: title,
      description: description,
      location_type: 'meeting_area',
      location_details: ''
    });

    return this._resolveForeignKeys([meeting])[0];
  }

  getMeetingsOverview() {
    const meetings = this._getFromStorage('meetings');
    const conference = this._getCurrentConference();
    const list = meetings.filter((m) => !conference || !m.conference_id || m.conference_id === conference.id);
    return this._resolveForeignKeys(list);
  }

  cancelMeeting(meetingId, reason) {
    const meetings = this._getFromStorage('meetings');
    const index = meetings.findIndex((m) => m.id === meetingId);
    if (index === -1) return null;
    const meeting = meetings[index];
    meeting.status = 'canceled';
    if (reason) {
      meeting.description = (meeting.description || '') + (meeting.description ? '\n' : '') + 'Canceled: ' + reason;
    }
    meetings[index] = meeting;
    this._saveToStorage('meetings', meetings);
    return this._resolveForeignKeys([meeting])[0];
  }

  rescheduleMeeting(meetingId, new_day_id, new_start_datetime, duration_minutes) {
    const meetings = this._getFromStorage('meetings');
    const index = meetings.findIndex((m) => m.id === meetingId);
    if (index === -1) return null;
    const meeting = meetings[index];

    const start = new Date(new_start_datetime);
    const end = new Date(start.getTime() + (duration_minutes || meeting.duration_minutes || 0) * 60000);

    meeting.day_id = new_day_id;
    meeting.start_datetime = start.toISOString();
    meeting.end_datetime = end.toISOString();
    meeting.duration_minutes = duration_minutes || meeting.duration_minutes;

    meetings[index] = meeting;
    this._saveToStorage('meetings', meetings);

    return this._resolveForeignKeys([meeting])[0];
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
