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
    // Legacy/example keys from skeleton
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Data model storage keys (ensure arrays exist, but do not seed domain data)
    var keys = [
      'ticket_types',
      'ticket_categories',
      'admission_timeslots',
      'admission_bookings',
      'cart',
      'cart_items',
      'exhibits',
      'self_guided_routes',
      'route_stops',
      'programs',
      'program_sessions',
      'program_bookings',
      'articles',
      'reading_lists',
      'reading_list_items',
      'timeline_events',
      'pinned_timeline_events',
      'shipping_options',
      'newsletter_subscriptions',
      'newsletter_interest_options',
      'subscription_interests',
      // extra helper table for contact submissions
      'contact_submissions'
    ];
    for (var i = 0; i < keys.length; i++) {
      if (!localStorage.getItem(keys[i])) {
        localStorage.setItem(keys[i], JSON.stringify([]));
      }
    }
  }

  _getFromStorage(key) {
    var data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    var current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _addMinutesToTime(timeStr, minutes) {
    if (!timeStr) return null;
    var parts = String(timeStr).split(':');
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    var total = h * 60 + m + (minutes || 0);
    if (total < 0) total = 0;
    var newH = Math.floor(total / 60) % 24;
    var newM = total % 60;
    var hStr = (newH < 10 ? '0' : '') + newH;
    var mStr = (newM < 10 ? '0' : '') + newM;
    return hStr + ':' + mStr;
  }

  // ---------------------- CART HELPERS ----------------------

  _getOrCreateCart() {
    var carts = this._getFromStorage('cart');
    var currentId = localStorage.getItem('current_cart_id');
    var cart = null;

    if (currentId) {
      for (var i = 0; i < carts.length; i++) {
        if (carts[i].id === currentId) {
          cart = carts[i];
          break;
        }
      }
    }

    if (!cart && carts.length > 0) {
      cart = carts[0];
      localStorage.setItem('current_cart_id', cart.id);
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        selected_shipping_option_id: null,
        subtotal: 0,
        shipping_total: 0,
        total: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _saveCart(cart) {
    var carts = this._getFromStorage('cart');
    var found = false;
    for (var i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        found = true;
        break;
      }
    }
    if (!found) {
      carts.push(cart);
    }
    cart.updated_at = this._now();
    this._saveToStorage('cart', carts);
  }

  _recalculateCartTotals() {
    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');
    var relevant = [];
    var i;

    for (i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        relevant.push(cartItems[i]);
      }
    }

    var subtotal = 0;
    for (i = 0; i < relevant.length; i++) {
      subtotal += Number(relevant[i].total_price || 0);
    }

    var shipping_total = 0;
    if (cart.selected_shipping_option_id) {
      var shippingOptions = this._getFromStorage('shipping_options');
      var selected = null;
      for (i = 0; i < shippingOptions.length; i++) {
        if (shippingOptions[i].id === cart.selected_shipping_option_id) {
          selected = shippingOptions[i];
          break;
        }
      }
      if (selected && selected.is_active) {
        shipping_total = Number(selected.cost || 0);
      }
    }

    cart.subtotal = subtotal;
    cart.shipping_total = shipping_total;
    cart.total = subtotal + shipping_total;

    this._saveCart(cart);
    return cart;
  }

  // ---------------------- ROUTE HELPERS ----------------------

  _getOrCreateRoute() {
    var routes = this._getFromStorage('self_guided_routes');
    var currentId = localStorage.getItem('current_route_id');
    var route = null;
    var i;

    if (currentId) {
      for (i = 0; i < routes.length; i++) {
        if (routes[i].id === currentId) {
          route = routes[i];
          break;
        }
      }
    }

    if (!route && routes.length > 0) {
      route = routes[0];
      localStorage.setItem('current_route_id', route.id);
    }

    if (!route) {
      route = {
        id: this._generateId('route'),
        name: 'My Route',
        description: null,
        start_time: null,
        optimize_for_duration: false,
        max_total_duration_minutes: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      routes.push(route);
      this._saveToStorage('self_guided_routes', routes);
      localStorage.setItem('current_route_id', route.id);
    }

    var allStops = this._getFromStorage('route_stops');
    var stops = [];
    for (i = 0; i < allStops.length; i++) {
      if (allStops[i].route_id === route.id) {
        stops.push(allStops[i]);
      }
    }
    stops.sort(function (a, b) {
      return (a.order_index || 0) - (b.order_index || 0);
    });

    return { route: route, stops: stops };
  }

  _saveRoute(route) {
    var routes = this._getFromStorage('self_guided_routes');
    var found = false;
    for (var i = 0; i < routes.length; i++) {
      if (routes[i].id === route.id) {
        routes[i] = route;
        found = true;
        break;
      }
    }
    if (!found) {
      routes.push(route);
    }
    route.updated_at = this._now();
    this._saveToStorage('self_guided_routes', routes);
  }

  _recalculateRouteSchedule() {
    var data = this._getOrCreateRoute();
    var route = data.route;
    var stops = data.stops.slice(); // clone
    stops.sort(function (a, b) {
      return (a.order_index || 0) - (b.order_index || 0);
    });

    var schedule = [];
    var totalVisit = 0;
    var totalWalk = 0;
    var currentTime = route.start_time || null;

    for (var i = 0; i < stops.length; i++) {
      var stop = stops[i];
      var visitMinutes = Number(stop.estimated_visit_time_minutes || 0);
      var walkMinutes = Number(stop.walking_time_to_next_minutes || 0);

      var scheduled_start_time = null;
      var scheduled_end_time = null;

      if (currentTime) {
        scheduled_start_time = currentTime;
        scheduled_end_time = this._addMinutesToTime(currentTime, visitMinutes);
        currentTime = this._addMinutesToTime(scheduled_end_time, walkMinutes);
      }

      totalVisit += visitMinutes;
      totalWalk += walkMinutes;

      schedule.push({
        route_stop: stop,
        scheduled_start_time: scheduled_start_time,
        scheduled_end_time: scheduled_end_time
      });
    }

    return {
      route: route,
      schedule: schedule,
      total_estimated_visit_time_minutes: totalVisit,
      total_estimated_walking_time_minutes: totalWalk,
      total_estimated_duration_minutes: totalVisit + totalWalk
    };
  }

  // ---------------------- READING LIST HELPER ----------------------

  _getOrCreateReadingList() {
    var lists = this._getFromStorage('reading_lists');
    var currentId = localStorage.getItem('current_reading_list_id');
    var list = null;
    var i;

    if (currentId) {
      for (i = 0; i < lists.length; i++) {
        if (lists[i].id === currentId) {
          list = lists[i];
          break;
        }
      }
    }

    if (!list && lists.length > 0) {
      list = lists[0];
      localStorage.setItem('current_reading_list_id', list.id);
    }

    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: 'My Reading List',
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
      localStorage.setItem('current_reading_list_id', list.id);
    }

    return list;
  }

  _saveReadingList(list) {
    var lists = this._getFromStorage('reading_lists');
    var found = false;
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].id === list.id) {
        lists[i] = list;
        found = true;
        break;
      }
    }
    if (!found) {
      lists.push(list);
    }
    list.updated_at = this._now();
    this._saveToStorage('reading_lists', lists);
  }

  // ---------------------- NEWSLETTER HELPER ----------------------

  _getOrCreateNewsletterSubscription(email) {
    var subs = this._getFromStorage('newsletter_subscriptions');
    var currentId = localStorage.getItem('current_subscription_id');
    var subscription = null;
    var i;

    if (currentId) {
      for (i = 0; i < subs.length; i++) {
        if (subs[i].id === currentId) {
          subscription = subs[i];
          break;
        }
      }
    }

    if (!subscription && email) {
      subscription = {
        id: this._generateId('subscription'),
        email: email,
        preferred_language: null,
        frequency: 'monthly_digest',
        status: 'pending_confirmation',
        created_at: this._now(),
        updated_at: this._now()
      };
      subs.push(subscription);
      this._saveToStorage('newsletter_subscriptions', subs);
      localStorage.setItem('current_subscription_id', subscription.id);
    }

    return subscription;
  }

  // ---------------------- TIMELINE HELPER ----------------------

  _getPinnedTimelineCollection() {
    var pinned = this._getFromStorage('pinned_timeline_events');
    var events = this._getFromStorage('timeline_events');

    pinned.sort(function (a, b) {
      if (typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
        return a.sort_order - b.sort_order;
      }
      if (typeof a.sort_order === 'number') return -1;
      if (typeof b.sort_order === 'number') return 1;

      var ea = null;
      var eb = null;
      var i;
      for (i = 0; i < events.length; i++) {
        if (events[i].id === a.event_id) ea = events[i];
        if (events[i].id === b.event_id) eb = events[i];
      }
      var ya = ea ? (ea.year != null ? ea.year : ea.start_year || 0) : 0;
      var yb = eb ? (eb.year != null ? eb.year : eb.start_year || 0) : 0;
      return ya - yb;
    });

    return pinned;
  }

  // =============================================================
  // CORE INTERFACE IMPLEMENTATIONS
  // =============================================================

  // ---------------------- HOMEPAGE ----------------------

  getHomepageContent() {
    var exhibits = this._getFromStorage('exhibits');
    var programs = this._getFromStorage('programs');
    var articles = this._getFromStorage('articles');
    var products = this._getFromStorage('products');

    var featured_exhibits = exhibits.slice(0, 4);
    var featured_programs = programs.filter(function (p) { return p.is_active; }).slice(0, 4);
    var featured_articles = articles.filter(function (a) { return a.is_published; }).slice(0, 4);
    var featured_products = products.filter(function (p) { return p.is_available; }).slice(0, 4);

    return {
      hero: {
        title: 'Cheese Through the Ages',
        subtitle: 'Explore the rich history of cheese from ancient curds to modern science.',
        background_image: ''
      },
      primary_sections: [
        { id: 'visit', label: 'Visit', description: 'Plan your visit and book tickets.', target_page: 'visit' },
        { id: 'exhibitions', label: 'Exhibitions', description: 'Discover our galleries.', target_page: 'exhibitions' },
        { id: 'timeline', label: 'Timeline', description: 'Cheese through time.', target_page: 'timeline' },
        { id: 'learn', label: 'Learn', description: 'Articles and resources.', target_page: 'learn' },
        { id: 'tours_workshops', label: 'Tours & Workshops', description: 'Guided experiences.', target_page: 'tours_workshops' },
        { id: 'shop', label: 'Shop', description: 'Books and gifts.', target_page: 'shop' }
      ],
      featured_exhibits: featured_exhibits,
      featured_programs: featured_programs,
      featured_articles: featured_articles,
      featured_products: featured_products
    };
  }

  // ---------------------- VISITOR INFO / TICKETS ----------------------

  getVisitorInfo() {
    return {
      opening_hours: [
        { day_label: 'monday', open_time: '10:00', close_time: '18:00', notes: '' },
        { day_label: 'tuesday', open_time: '10:00', close_time: '18:00', notes: '' },
        { day_label: 'wednesday', open_time: '10:00', close_time: '18:00', notes: '' },
        { day_label: 'thursday', open_time: '10:00', close_time: '18:00', notes: '' },
        { day_label: 'friday', open_time: '10:00', close_time: '20:00', notes: '' },
        { day_label: 'saturday', open_time: '10:00', close_time: '20:00', notes: 'Weekend hours' },
        { day_label: 'sunday', open_time: '10:00', close_time: '18:00', notes: '' }
      ],
      location: {
        address_lines: ['123 Fromage Lane'],
        city: 'Cheeseton',
        postal_code: '00000',
        country: 'Cheeseland',
        map_embed_url: '',
        public_transport_tips: 'Take tram C to Cheese Museum stop.'
      },
      access_info: 'The museum is wheelchair accessible with elevators to all floors.',
      visitor_tips: [
        'Peak hours are 11:0013:00 and 15:0017:00.',
        'Food and drinks are not allowed inside exhibition halls.',
        'Photography without flash is permitted unless otherwise indicated.'
      ]
    };
  }

  getAdmissionAvailability(visit_date) {
    var ticketTypes = this._getFromStorage('ticket_types');
    var timeslotsAll = this._getFromStorage('admission_timeslots');

    var activeTicketTypes = ticketTypes.filter(function (t) { return t.is_active; });

    var ticket_types = activeTicketTypes.map(function (t) {
      return {
        ticket_type: t,
        display_name: t.name,
        description: t.description || '',
        currency: t.currency,
        base_price_adult: t.base_price_adult || 0,
        base_price_child_6_12: t.base_price_child_6_12 || 0,
        base_price_child: t.base_price_child || 0,
        base_price_senior: t.base_price_senior || 0
      };
    });

    var timeslots = [];
    for (var i = 0; i < timeslotsAll.length; i++) {
      var ts = timeslotsAll[i];
      var tsDate = String(ts.date || '').substring(0, 10);
      if (tsDate === visit_date) {
        var tt = null;
        for (var j = 0; j < ticketTypes.length; j++) {
          if (ticketTypes[j].id === ts.ticket_type_id) {
            tt = ticketTypes[j];
            break;
          }
        }
        var available_capacity = (ts.capacity_total || 0) - (ts.capacity_booked || 0);
        timeslots.push({
          timeslot: ts,
          ticket_type_id: ts.ticket_type_id,
          ticket_type_name: tt ? tt.name : '',
          start_time: ts.start_time,
          end_time: ts.end_time,
          available_capacity: available_capacity,
          is_available: ts.is_available && available_capacity > 0,
          note: ts.note || ''
        });
      }
    }

    return {
      visit_date: visit_date,
      ticket_types: ticket_types,
      timeslots: timeslots
    };
  }

  createAdmissionBooking(timeslot_id, adult_count, child_6_12_count, child_count, senior_count, add_to_cart) {
    var timeslots = this._getFromStorage('admission_timeslots');
    var ticketTypes = this._getFromStorage('ticket_types');

    var ts = null;
    for (var i = 0; i < timeslots.length; i++) {
      if (timeslots[i].id === timeslot_id) {
        ts = timeslots[i];
        break;
      }
    }
    if (!ts) {
      return { success: false, message: 'Timeslot not found', booking: null, cart_item: null };
    }

    var tt = null;
    for (i = 0; i < ticketTypes.length; i++) {
      if (ticketTypes[i].id === ts.ticket_type_id) {
        tt = ticketTypes[i];
        break;
      }
    }
    if (!tt) {
      return { success: false, message: 'Ticket type not found for timeslot', booking: null, cart_item: null };
    }

    adult_count = Number(adult_count || 0);
    child_6_12_count = Number(child_6_12_count || 0);
    child_count = Number(child_count || 0);
    senior_count = Number(senior_count || 0);

    var totalTickets = adult_count + child_6_12_count + child_count + senior_count;
    if (ts.capacity_total != null) {
      var remaining = (ts.capacity_total || 0) - (ts.capacity_booked || 0);
      if (totalTickets > remaining) {
        return { success: false, message: 'Not enough capacity for this timeslot', booking: null, cart_item: null };
      }
    }

    var total_price = 0;
    total_price += adult_count * (tt.base_price_adult || 0);
    total_price += child_6_12_count * (tt.base_price_child_6_12 || 0);
    total_price += child_count * (tt.base_price_child || 0);
    total_price += senior_count * (tt.base_price_senior || 0);

    var booking = {
      id: this._generateId('admission_booking'),
      ticket_type_id: tt.id,
      timeslot_id: ts.id,
      visit_date: ts.date,
      start_time: ts.start_time,
      end_time: ts.end_time,
      adult_count: adult_count,
      child_6_12_count: child_6_12_count,
      child_count: child_count,
      senior_count: senior_count,
      total_price: total_price,
      currency: tt.currency,
      status: 'pending',
      created_at: this._now()
    };

    var bookings = this._getFromStorage('admission_bookings');
    bookings.push(booking);
    this._saveToStorage('admission_bookings', bookings);

    // update timeslot capacity
    ts.capacity_booked = (ts.capacity_booked || 0) + totalTickets;
    if (ts.capacity_total != null && ts.capacity_booked >= ts.capacity_total) {
      ts.is_available = false;
    }
    this._saveToStorage('admission_timeslots', timeslots);

    var cart_item = null;
    if (add_to_cart !== false) {
      var cart = this._getOrCreateCart();
      var cartItems = this._getFromStorage('cart_items');
      cart_item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'general_admission',
        admission_booking_id: booking.id,
        program_booking_id: null,
        product_id: null,
        quantity: 1,
        unit_price: total_price,
        total_price: total_price,
        label: (tt.name || 'Admission') + ' - ' + String(booking.visit_date).substring(0, 10) + ' ' + booking.start_time,
        created_at: this._now()
      };
      cartItems.push(cart_item);
      this._saveToStorage('cart_items', cartItems);

      if (!cart.items) cart.items = [];
      if (cart.items.indexOf(cart_item.id) === -1) {
        cart.items.push(cart_item.id);
      }
      this._saveCart(cart);
      this._recalculateCartTotals();
    }

    return { success: true, message: 'Booking created', booking: booking, cart_item: cart_item };
  }

  getCartSummary() {
    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');
    var admissionBookings = this._getFromStorage('admission_bookings');
    var programBookings = this._getFromStorage('program_bookings');
    var products = this._getFromStorage('products');
    var shippingOptions = this._getFromStorage('shipping_options');

    var itemsRaw = [];
    var i;
    for (i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        itemsRaw.push(cartItems[i]);
      }
    }

    var items = [];
    var currency = null;
    for (i = 0; i < itemsRaw.length; i++) {
      var ci = itemsRaw[i];
      var admission = null;
      var programBooking = null;
      var product = null;

      if (ci.admission_booking_id) {
        for (var j = 0; j < admissionBookings.length; j++) {
          if (admissionBookings[j].id === ci.admission_booking_id) {
            admission = admissionBookings[j];
            break;
          }
        }
        if (admission && !currency) currency = admission.currency;
      }
      if (ci.program_booking_id) {
        for (j = 0; j < programBookings.length; j++) {
          if (programBookings[j].id === ci.program_booking_id) {
            programBooking = programBookings[j];
            break;
          }
        }
        if (programBooking && !currency) currency = programBooking.currency;
      }
      if (ci.product_id) {
        for (j = 0; j < products.length; j++) {
          if (products[j].id === ci.product_id) {
            product = products[j];
            break;
          }
        }
        if (product && !currency) currency = product.currency;
      }

      items.push({
        cart_item: ci,
        admission_booking: admission,
        program_booking: programBooking,
        product: product
      });
    }

    // Instrumentation for task completion tracking (tasks 1 and 7)
    try {
      // task7_cartViewed: mark whenever cart summary is viewed
      localStorage.setItem('task7_cartViewed', 'true');

      // task1_visitSummaryViewed, task1_bookingId, task1_timeslotId
      var qualifyingBooking = null;
      if (items && items.length > 0) {
        var ticketTypes = this._getFromStorage('ticket_types');
        for (var idx = 0; idx < items.length; idx++) {
          var item = items[idx];
          var booking = item.admission_booking;
          if (!booking) continue;

          // Check visit date
          if (String(booking.visit_date || '').substring(0, 10) !== '2026-05-16') continue;

          // Check time
          if (!booking.start_time || booking.start_time < '15:00') continue;

          // Check counts
          if (!(booking.adult_count === 2 &&
                booking.child_6_12_count === 1 &&
                booking.child_count === 0 &&
                booking.senior_count === 0)) {
            continue;
          }

          // Check ticket type name
          var tt = null;
          for (var tti = 0; tti < ticketTypes.length; tti++) {
            if (ticketTypes[tti].id === booking.ticket_type_id) {
              tt = ticketTypes[tti];
              break;
            }
          }
          if (!tt || tt.name !== 'General Museum Entry') continue;

          qualifyingBooking = booking;
          break;
        }
      }

      if (qualifyingBooking) {
        localStorage.setItem('task1_visitSummaryViewed', 'true');
        localStorage.setItem('task1_bookingId', String(qualifyingBooking.id));
        localStorage.setItem('task1_timeslotId', String(qualifyingBooking.timeslot_id));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var selectedShipping = null;
    for (i = 0; i < shippingOptions.length; i++) {
      if (shippingOptions[i].id === cart.selected_shipping_option_id) {
        selectedShipping = shippingOptions[i];
        break;
      }
    }

    var cartWithResolved = {};
    for (var k in cart) {
      if (Object.prototype.hasOwnProperty.call(cart, k)) {
        cartWithResolved[k] = cart[k];
      }
    }
    cartWithResolved.selected_shipping_option = selectedShipping || null;

    var orderCurrency = currency || (shippingOptions[0] ? shippingOptions[0].currency : 'eur');

    return {
      cart: cartWithResolved,
      items: items,
      shipping_options: shippingOptions,
      selected_shipping_option_id: cart.selected_shipping_option_id || null,
      order_summary: {
        subtotal: cart.subtotal || 0,
        shipping_total: cart.shipping_total || 0,
        total: cart.total || 0,
        currency: orderCurrency
      }
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    var cartItems = this._getFromStorage('cart_items');
    var idx = -1;
    for (var i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cart_item_id) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      return { success: false, cart: this._getOrCreateCart() };
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      var item = cartItems[idx];
      item.quantity = quantity;
      item.total_price = (item.unit_price || 0) * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);
    var cart = this._recalculateCartTotals();
    return { success: true, cart: cart };
  }

  removeCartItem(cart_item_id) {
    var cartItems = this._getFromStorage('cart_items');
    var idx = -1;
    for (var i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cart_item_id) {
        idx = i;
        break;
      }
    }

    if (idx !== -1) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
    }

    var cart = this._recalculateCartTotals();
    return { success: true, cart: cart };
  }

  selectShippingOption(shipping_option_id) {
    var shippingOptions = this._getFromStorage('shipping_options');
    var option = null;
    for (var i = 0; i < shippingOptions.length; i++) {
      if (shippingOptions[i].id === shipping_option_id) {
        option = shippingOptions[i];
        break;
      }
    }
    if (!option || !option.is_active) {
      return { success: false, cart: this._getOrCreateCart(), selected_shipping_option: null };
    }

    var cart = this._getOrCreateCart();
    cart.selected_shipping_option_id = option.id;
    this._saveCart(cart);
    cart = this._recalculateCartTotals();

    return { success: true, cart: cart, selected_shipping_option: option };
  }

  // ---------------------- EXHIBITS / SELF-GUIDED ROUTE ----------------------

  getExhibitFilterOptions() {
    return {
      regions: [
        { value: 'europe', label: 'Europe' },
        { value: 'asia', label: 'Asia' },
        { value: 'africa', label: 'Africa' },
        { value: 'americas', label: 'Americas' },
        { value: 'middle_east', label: 'Middle East' },
        { value: 'oceania', label: 'Oceania' },
        { value: 'global', label: 'Global' }
      ],
      era_options: [
        { value: 'before_1500', label: 'Before 1500', start_year: -3000, end_year: 1499 },
        { value: '1500_1800', label: '15001800', start_year: 1500, end_year: 1800 },
        { value: '1800_1950', label: '18001950', start_year: 1800, end_year: 1950 },
        { value: 'modern', label: 'After 1950', start_year: 1951, end_year: 3000 }
      ],
      sort_options: [
        { value: 'visit_time_asc', label: 'Estimated Visit Time  Low to High' },
        { value: 'visit_time_desc', label: 'Estimated Visit Time  High to Low' },
        { value: 'title_asc', label: 'Title AZ' }
      ]
    };
  }

  listExhibits(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 20;

    // Instrumentation for task 2 exhibit filter usage
    try {
      if (filters &&
          filters.region === 'europe' &&
          filters.era_value === 'before_1500' &&
          filters.max_estimated_visit_time_minutes != null &&
          filters.max_estimated_visit_time_minutes <= 25 &&
          sort_by === 'visit_time_asc') {
        localStorage.setItem(
          'task2_exhibitFilterParams',
          JSON.stringify({
            region: filters.region,
            era_value: filters.era_value,
            max_estimated_visit_time_minutes: filters.max_estimated_visit_time_minutes,
            sort_by: sort_by
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var exhibits = this._getFromStorage('exhibits');
    var result = [];

    for (var i = 0; i < exhibits.length; i++) {
      var ex = exhibits[i];
      if (filters.is_active_only && !ex.is_active) continue;
      if (filters.region && ex.region !== filters.region) continue;
      if (filters.country && ex.country && String(ex.country).toLowerCase() !== String(filters.country).toLowerCase()) continue;
      if (filters.max_estimated_visit_time_minutes && ex.estimated_visit_time_minutes != null && ex.estimated_visit_time_minutes > filters.max_estimated_visit_time_minutes) continue;

      if (filters.era_value) {
        var eraVal = filters.era_value;
        var startYear = ex.era_start_year;
        var endYear = ex.era_end_year;
        var label = ex.era_label || '';
        var matchEra = true;
        if (eraVal === 'before_1500') {
          matchEra = (label === 'Before 1500') || ((endYear != null ? endYear : startYear) <= 1499);
        } else if (eraVal === '1800_1950') {
          var s = startYear != null ? startYear : 1800;
          var e = endYear != null ? endYear : 1950;
          matchEra = !(e < 1800 || s > 1950);
        }
        if (!matchEra) continue;
      }

      result.push(ex);
    }

    if (sort_by === 'visit_time_asc') {
      result.sort(function (a, b) { return (a.estimated_visit_time_minutes || 0) - (b.estimated_visit_time_minutes || 0); });
    } else if (sort_by === 'visit_time_desc') {
      result.sort(function (a, b) { return (b.estimated_visit_time_minutes || 0) - (a.estimated_visit_time_minutes || 0); });
    } else if (sort_by === 'title_asc') {
      result.sort(function (a, b) {
        var ta = (a.title || '').toLowerCase();
        var tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    }

    var total = result.length;
    var start = (page - 1) * page_size;
    var end = start + page_size;
    var pageItems = result.slice(start, end);

    return {
      total_count: total,
      page: page,
      page_size: page_size,
      exhibits: pageItems
    };
  }

  getExhibitDetail(exhibit_id) {
    var exhibits = this._getFromStorage('exhibits');
    var ex = null;
    for (var i = 0; i < exhibits.length; i++) {
      if (exhibits[i].id === exhibit_id) {
        ex = exhibits[i];
        break;
      }
    }

    if (!ex) {
      return {
        exhibit: null,
        region_label: '',
        era_display: '',
        gallery_location_display: '',
        estimated_visit_time_minutes: 0,
        related_exhibits: []
      };
    }

    var regionMap = {
      europe: 'Europe',
      asia: 'Asia',
      africa: 'Africa',
      americas: 'Americas',
      middle_east: 'Middle East',
      oceania: 'Oceania',
      global: 'Global'
    };
    var region_label = regionMap[ex.region] || ex.region || '';

    var era_display = ex.era_label || '';
    if (!era_display && (ex.era_start_year != null || ex.era_end_year != null)) {
      var s = ex.era_start_year;
      var e = ex.era_end_year;
      var suf = ' CE';
      function formatYear(y) {
        if (y == null) return '';
        if (y < 0) return Math.abs(y) + ' BCE';
        return y + ' CE';
      }
      if (s != null && e != null) era_display = formatYear(s) + '' + formatYear(e);
      else if (s != null) era_display = formatYear(s) + suf;
      else era_display = formatYear(e) + suf;
    }

    var gallery_location_display = ex.gallery_location || '';

    var related = [];
    for (var j = 0; j < exhibits.length && related.length < 4; j++) {
      if (exhibits[j].id !== ex.id && exhibits[j].region === ex.region) {
        related.push(exhibits[j]);
      }
    }

    return {
      exhibit: ex,
      region_label: region_label,
      era_display: era_display,
      gallery_location_display: gallery_location_display,
      estimated_visit_time_minutes: ex.estimated_visit_time_minutes || 0,
      related_exhibits: related
    };
  }

  addExhibitToRoute(exhibit_id) {
    var exhibits = this._getFromStorage('exhibits');
    var exhibit = null;
    for (var i = 0; i < exhibits.length; i++) {
      if (exhibits[i].id === exhibit_id) {
        exhibit = exhibits[i];
        break;
      }
    }
    if (!exhibit) {
      return { success: false, route: null, stops: [], total_estimated_visit_time_minutes: 0, total_estimated_walking_time_minutes: 0, total_estimated_duration_minutes: 0 };
    }

    var data = this._getOrCreateRoute();
    var route = data.route;
    var stops = data.stops;

    var maxOrder = -1;
    for (i = 0; i < stops.length; i++) {
      if (typeof stops[i].order_index === 'number' && stops[i].order_index > maxOrder) {
        maxOrder = stops[i].order_index;
      }
    }
    var newOrder = maxOrder + 1;

    var stop = {
      id: this._generateId('route_stop'),
      route_id: route.id,
      exhibit_id: exhibit.id,
      order_index: newOrder,
      estimated_visit_time_minutes: exhibit.estimated_visit_time_minutes || 20,
      walking_time_to_next_minutes: 5,
      notes: null
    };

    var allStops = this._getFromStorage('route_stops');
    allStops.push(stop);
    this._saveToStorage('route_stops', allStops);

    var sched = this._recalculateRouteSchedule();

    return {
      success: true,
      route: sched.route,
      stops: this._getOrCreateRoute().stops,
      total_estimated_visit_time_minutes: sched.total_estimated_visit_time_minutes,
      total_estimated_walking_time_minutes: sched.total_estimated_walking_time_minutes,
      total_estimated_duration_minutes: sched.total_estimated_duration_minutes
    };
  }

  getRouteOverview() {
    var sched = this._recalculateRouteSchedule();
    var route = sched.route;
    var schedule = sched.schedule;
    var exhibits = this._getFromStorage('exhibits');

    // Instrumentation for task 2 route overview viewed
    try {
      localStorage.setItem('task2_routeOverviewViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var stops = [];
    for (var i = 0; i < schedule.length; i++) {
      var rs = schedule[i].route_stop;
      var ex = null;
      for (var j = 0; j < exhibits.length; j++) {
        if (exhibits[j].id === rs.exhibit_id) {
          ex = exhibits[j];
          break;
        }
      }
      stops.push({
        route_stop: rs,
        exhibit: ex,
        scheduled_start_time: schedule[i].scheduled_start_time,
        scheduled_end_time: schedule[i].scheduled_end_time
      });
    }

    return {
      route: route,
      stops: stops,
      total_estimated_visit_time_minutes: sched.total_estimated_visit_time_minutes,
      total_estimated_walking_time_minutes: sched.total_estimated_walking_time_minutes,
      total_estimated_duration_minutes: sched.total_estimated_duration_minutes
    };
  }

  updateRouteSettingsAndSchedule(start_time, optimize_for_duration, max_total_duration_minutes) {
    var data = this._getOrCreateRoute();
    var route = data.route;
    var stops = data.stops;

    if (typeof start_time === 'string') {
      route.start_time = start_time;
    }
    if (typeof optimize_for_duration === 'boolean') {
      route.optimize_for_duration = optimize_for_duration;
    }
    if (typeof max_total_duration_minutes === 'number') {
      route.max_total_duration_minutes = max_total_duration_minutes;
    }

    // simple optimization: sort by visit time if requested
    if (route.optimize_for_duration) {
      stops.sort(function (a, b) {
        return (a.estimated_visit_time_minutes || 0) - (b.estimated_visit_time_minutes || 0);
      });
      for (var i = 0; i < stops.length; i++) {
        stops[i].order_index = i;
      }
      this._saveToStorage('route_stops', stops.concat([]));
    }

    this._saveRoute(route);

    var sched = this._recalculateRouteSchedule();
    var exhibits = this._getFromStorage('exhibits');

    var stopsOut = [];
    for (var j = 0; j < sched.schedule.length; j++) {
      var rs = sched.schedule[j].route_stop;
      var ex = null;
      for (var k = 0; k < exhibits.length; k++) {
        if (exhibits[k].id === rs.exhibit_id) {
          ex = exhibits[k];
          break;
        }
      }
      stopsOut.push({
        route_stop: rs,
        exhibit: ex,
        scheduled_start_time: sched.schedule[j].scheduled_start_time,
        scheduled_end_time: sched.schedule[j].scheduled_end_time
      });
    }

    return {
      route: sched.route,
      stops: stopsOut,
      total_estimated_visit_time_minutes: sched.total_estimated_visit_time_minutes,
      total_estimated_walking_time_minutes: sched.total_estimated_walking_time_minutes,
      total_estimated_duration_minutes: sched.total_estimated_duration_minutes
    };
  }

  reorderRouteStops(ordered_route_stop_ids) {
    var data = this._getOrCreateRoute();
    var route = data.route;
    var allStops = this._getFromStorage('route_stops');

    // update order_index based on given ids
    for (var i = 0; i < ordered_route_stop_ids.length; i++) {
      var id = ordered_route_stop_ids[i];
      for (var j = 0; j < allStops.length; j++) {
        if (allStops[j].id === id && allStops[j].route_id === route.id) {
          allStops[j].order_index = i;
          break;
        }
      }
    }

    this._saveToStorage('route_stops', allStops);

    var newStops = [];
    for (i = 0; i < allStops.length; i++) {
      if (allStops[i].route_id === route.id) {
        newStops.push(allStops[i]);
      }
    }
    newStops.sort(function (a, b) { return (a.order_index || 0) - (b.order_index || 0); });

    return { route: route, stops: newStops };
  }

  removeRouteStop(route_stop_id) {
    var data = this._getOrCreateRoute();
    var route = data.route;
    var allStops = this._getFromStorage('route_stops');

    var newAll = [];
    for (var i = 0; i < allStops.length; i++) {
      if (allStops[i].id !== route_stop_id) {
        newAll.push(allStops[i]);
      }
    }

    this._saveToStorage('route_stops', newAll);

    // reindex remaining stops for this route
    var routeStops = [];
    for (i = 0; i < newAll.length; i++) {
      if (newAll[i].route_id === route.id) {
        routeStops.push(newAll[i]);
      }
    }
    routeStops.sort(function (a, b) { return (a.order_index || 0) - (b.order_index || 0); });
    for (i = 0; i < routeStops.length; i++) {
      routeStops[i].order_index = i;
    }
    this._saveToStorage('route_stops', newAll);

    return { route: route, stops: routeStops };
  }

  // ---------------------- TOURS & WORKSHOPS ----------------------

  getProgramFilterOptions() {
    var programs = this._getFromStorage('programs');
    var sessions = this._getFromStorage('program_sessions');

    var langSet = {};
    var audienceSet = {};
    var monthsSet = {};

    for (var i = 0; i < programs.length; i++) {
      langSet[programs[i].language] = true;
      if (programs[i].audience_type) audienceSet[programs[i].audience_type] = true;
    }

    for (i = 0; i < sessions.length; i++) {
      var dt = String(sessions[i].start_datetime || '');
      if (dt.length >= 7) {
        monthsSet[dt.substring(0, 7)] = true;
      }
    }

    function mapKeysToArray(set, labelMap) {
      var arr = [];
      var key;
      for (key in set) {
        if (Object.prototype.hasOwnProperty.call(set, key)) {
          arr.push({ value: key, label: labelMap[key] || key });
        }
      }
      return arr;
    }

    var languageLabels = {
      english: 'English',
      french: 'French',
      german: 'German',
      spanish: 'Spanish',
      italian: 'Italian',
      other: 'Other'
    };

    var audienceLabels = {
      general_public: 'General Public',
      family_kids: 'Family & Kids',
      ages_8_12: 'Ages 812',
      teens: 'Teens',
      adults_only: 'Adults Only'
    };

    var languages = mapKeysToArray(langSet, languageLabels);
    var audience_types = mapKeysToArray(audienceSet, audienceLabels);

    var months = [];
    for (var m in monthsSet) {
      if (Object.prototype.hasOwnProperty.call(monthsSet, m)) {
        months.push({ value: m, label: m });
      }
    }
    months.sort(function (a, b) { return a.value < b.value ? -1 : (a.value > b.value ? 1 : 0); });

    var price_ranges = [
      { id: 'under_25', label: 'Up to 25', min_price: 0, max_price: 25 },
      { id: '25_50', label: '2550', min_price: 25, max_price: 50 },
      { id: '50_plus', label: '50 and above', min_price: 50, max_price: 1000 }
    ];

    var sort_options_tours = [
      { value: 'duration_desc', label: 'Duration  Long to Short' },
      { value: 'duration_asc', label: 'Duration  Short to Long' },
      { value: 'price_asc', label: 'Price  Low to High' }
    ];

    return {
      languages: languages,
      audience_types: audience_types,
      months: months,
      price_ranges: price_ranges,
      sort_options_tours: sort_options_tours
    };
  }

  listGuidedTours(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 20;

    // Instrumentation for task 3 tour filter usage
    try {
      if (filters &&
          filters.date === '2026-08-10' &&
          filters.language === 'english' &&
          filters.max_price != null &&
          filters.max_price <= 25 &&
          sort_by === 'duration_desc') {
        localStorage.setItem(
          'task3_tourFilterParams',
          JSON.stringify({
            date: filters.date,
            language: filters.language,
            max_price: filters.max_price,
            sort_by: sort_by
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var programs = this._getFromStorage('programs');
    var sessions = this._getFromStorage('program_sessions');

    var tours = [];

    for (var i = 0; i < programs.length; i++) {
      var p = programs[i];
      if (p.program_type !== 'guided_tour') continue;
      if (!p.is_active) continue;
      if (filters.language && p.language !== filters.language) continue;

      var matchingSessions = [];
      for (var j = 0; j < sessions.length; j++) {
        var s = sessions[j];
        if (s.program_id !== p.id) continue;
        var dateMatch = true;
        if (filters.date) {
          var d = String(s.start_datetime || '').substring(0, 10);
          if (d !== filters.date) dateMatch = false;
        }
        if (!dateMatch) continue;
        if (filters.min_price != null && s.price_adult != null && s.price_adult < filters.min_price) continue;
        if (filters.max_price != null && s.price_adult != null && s.price_adult > filters.max_price) continue;
        matchingSessions.push(s);
      }

      if (matchingSessions.length === 0) continue;

      matchingSessions.sort(function (a, b) {
        var da = String(a.start_datetime || '');
        var db = String(b.start_datetime || '');
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      });

      tours.push({
        program: p,
        matching_session_count: matchingSessions.length,
        earliest_matching_session: matchingSessions[0]
      });
    }

    if (sort_by === 'duration_desc') {
      tours.sort(function (a, b) { return (b.program.duration_minutes || 0) - (a.program.duration_minutes || 0); });
    } else if (sort_by === 'duration_asc') {
      tours.sort(function (a, b) { return (a.program.duration_minutes || 0) - (b.program.duration_minutes || 0); });
    } else if (sort_by === 'price_asc') {
      tours.sort(function (a, b) {
        var pa = a.earliest_matching_session ? a.earliest_matching_session.price_adult || 0 : 0;
        var pb = b.earliest_matching_session ? b.earliest_matching_session.price_adult || 0 : 0;
        return pa - pb;
      });
    }

    var total = tours.length;
    var start = (page - 1) * page_size;
    var end = start + page_size;
    var pageItems = tours.slice(start, end);

    return {
      total_count: total,
      page: page,
      page_size: page_size,
      tours: pageItems
    };
  }

  listWorkshops(filters, page, page_size) {
    filters = filters || {};
    page = page || 1;
    page_size = page_size || 20;

    // Instrumentation for task 5 workshop filter usage
    try {
      if (filters &&
          filters.month === '2026-06' &&
          filters.weekends_only === true &&
          filters.max_price != null &&
          filters.max_price <= 40 &&
          (filters.audience_type === 'ages_8_12' || filters.audience_type === 'family_kids')) {
        localStorage.setItem(
          'task5_workshopFilterParams',
          JSON.stringify({
            month: filters.month,
            weekends_only: filters.weekends_only,
            audience_type: filters.audience_type,
            max_price: filters.max_price
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var programs = this._getFromStorage('programs');
    var sessions = this._getFromStorage('program_sessions');

    var workshops = [];

    for (var i = 0; i < programs.length; i++) {
      var p = programs[i];
      if (p.program_type !== 'workshop') continue;
      if (!p.is_active) continue;

      if (filters.audience_type) {
        if (p.audience_type !== filters.audience_type) {
          if (!(filters.audience_type === 'family_kids' && p.is_family_friendly)) {
            continue;
          }
        }
      }

      var matchingSessions = [];
      for (var j = 0; j < sessions.length; j++) {
        var s = sessions[j];
        if (s.program_id !== p.id) continue;

        if (filters.month) {
          var monthStr = String(s.start_datetime || '').substring(0, 7);
          if (monthStr !== filters.month) continue;
        }

        if (filters.weekends_only && !s.is_weekend) continue;

        if (filters.max_price != null) {
          if (s.price_adult != null && s.price_adult > filters.max_price) continue;
          if (s.price_child != null && s.price_child > filters.max_price) continue;
        }

        matchingSessions.push(s);
      }

      if (matchingSessions.length === 0) continue;

      var sample = null;
      for (j = 0; j < matchingSessions.length; j++) {
        if (matchingSessions[j].is_weekend && matchingSessions[j].is_morning) {
          sample = matchingSessions[j];
          break;
        }
      }
      if (!sample) sample = matchingSessions[0];

      workshops.push({
        program: p,
        sample_weekend_morning_session: sample
      });
    }

    var total = workshops.length;
    var start = (page - 1) * page_size;
    var end = start + page_size;
    var pageItems = workshops.slice(start, end);

    return {
      total_count: total,
      page: page,
      page_size: page_size,
      workshops: pageItems
    };
  }

  getProgramDetail(program_id) {
    var programs = this._getFromStorage('programs');
    var sessions = this._getFromStorage('program_sessions');

    var program = null;
    for (var i = 0; i < programs.length; i++) {
      if (programs[i].id === program_id) {
        program = programs[i];
        break;
      }
    }

    var progSessions = [];
    if (program) {
      for (i = 0; i < sessions.length; i++) {
        if (sessions[i].program_id === program.id) {
          progSessions.push(sessions[i]);
        }
      }
    }

    return {
      program: program,
      sessions: progSessions
    };
  }

  createProgramBooking(program_id, session_id, adult_count, child_count, senior_count, group_name, add_to_cart) {
    var programs = this._getFromStorage('programs');
    var sessions = this._getFromStorage('program_sessions');

    var program = null;
    for (var i = 0; i < programs.length; i++) {
      if (programs[i].id === program_id) {
        program = programs[i];
        break;
      }
    }
    if (!program) {
      return { success: false, booking: null };
    }

    var session = null;
    for (i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session_id) {
        session = sessions[i];
        break;
      }
    }
    if (!session) {
      return { success: false, booking: null };
    }

    adult_count = Number(adult_count || 0);
    child_count = Number(child_count || 0);
    senior_count = Number(senior_count || 0);

    var total_price = 0;
    total_price += adult_count * (session.price_adult || 0);
    total_price += child_count * (session.price_child || 0);
    total_price += senior_count * (session.price_senior || 0);

    var booking = {
      id: this._generateId('program_booking'),
      program_id: program.id,
      session_id: session.id,
      program_type: program.program_type,
      booking_date_created: this._now(),
      start_datetime: session.start_datetime,
      duration_minutes: program.duration_minutes,
      adult_count: adult_count,
      child_count: child_count,
      senior_count: senior_count,
      group_name: group_name || null,
      total_price: total_price,
      currency: session.currency || program.currency,
      status: 'pending'
    };

    var bookings = this._getFromStorage('program_bookings');
    bookings.push(booking);
    this._saveToStorage('program_bookings', bookings);

    if (add_to_cart) {
      // finalize immediately and add to cart
      var result = this.finalizeProgramBooking(booking.id, true);
      return { success: result.success, booking: result.booking };
    }

    return { success: true, booking: booking };
  }

  getProgramBookingReview(booking_id) {
    var bookings = this._getFromStorage('program_bookings');
    var programs = this._getFromStorage('programs');
    var sessions = this._getFromStorage('program_sessions');

    var booking = null;
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i].id === booking_id) {
        booking = bookings[i];
        break;
      }
    }

    var program = null;
    var session = null;

    if (booking) {
      for (i = 0; i < programs.length; i++) {
        if (programs[i].id === booking.program_id) {
          program = programs[i];
          break;
        }
      }
      for (i = 0; i < sessions.length; i++) {
        if (sessions[i].id === booking.session_id) {
          session = sessions[i];
          break;
        }
      }
    }

    // Instrumentation for task 3 and task 5 booking review views
    try {
      if (booking && program) {
        // Task 3: guided tour with exactly 1 adult ticket
        if (program.program_type === 'guided_tour' &&
            booking.adult_count === 1 &&
            booking.child_count === 0 &&
            booking.senior_count === 0) {
          localStorage.setItem('task3_bookingReviewViewed', 'true');
          localStorage.setItem('task3_bookingId', String(booking.id));
        }

        // Task 5: workshop with 1 adult and 2 children
        if (program.program_type === 'workshop' &&
            booking.adult_count === 1 &&
            booking.child_count === 2) {
          localStorage.setItem('task5_bookingReviewViewed', 'true');
          localStorage.setItem('task5_bookingId', String(booking.id));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      booking: booking,
      program: program,
      session: session
    };
  }

  finalizeProgramBooking(booking_id, add_to_cart) {
    var bookings = this._getFromStorage('program_bookings');
    var programs = this._getFromStorage('programs');
    var sessions = this._getFromStorage('program_sessions');

    var booking = null;
    var i;
    for (i = 0; i < bookings.length; i++) {
      if (bookings[i].id === booking_id) {
        booking = bookings[i];
        break;
      }
    }

    if (!booking) {
      return { success: false, booking: null, cart_item: null };
    }

    booking.status = 'confirmed';
    bookings[i] = booking;
    this._saveToStorage('program_bookings', bookings);

    var cart_item = null;
    if (add_to_cart !== false) {
      var program = null;
      var session = null;
      for (i = 0; i < programs.length; i++) {
        if (programs[i].id === booking.program_id) {
          program = programs[i];
          break;
        }
      }
      for (i = 0; i < sessions.length; i++) {
        if (sessions[i].id === booking.session_id) {
          session = sessions[i];
          break;
        }
      }

      var cart = this._getOrCreateCart();
      var cartItems = this._getFromStorage('cart_items');
      var label = 'Program Booking';
      if (program && session) {
        label = (program.title || 'Program') + ' - ' + String(session.start_datetime || '').substring(0, 16);
      }

      cart_item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'program_booking',
        admission_booking_id: null,
        program_booking_id: booking.id,
        product_id: null,
        quantity: 1,
        unit_price: booking.total_price,
        total_price: booking.total_price,
        label: label,
        created_at: this._now()
      };
      cartItems.push(cart_item);
      this._saveToStorage('cart_items', cartItems);

      if (!cart.items) cart.items = [];
      if (cart.items.indexOf(cart_item.id) === -1) cart.items.push(cart_item.id);
      this._saveCart(cart);
      this._recalculateCartTotals();
    }

    return { success: true, booking: booking, cart_item: cart_item };
  }

  // ---------------------- LEARN / ARTICLES ----------------------

  getLearnPageContent() {
    var articles = this._getFromStorage('articles');
    var highlighted = [];
    for (var i = 0; i < articles.length && highlighted.length < 5; i++) {
      if (articles[i].is_published) highlighted.push(articles[i]);
    }

    return {
      intro_text: 'Dive into the history, science, and culture of cheese with curated articles from our collection.',
      featured_topics: [
        { topic_code: 'aging_maturation', label: 'Aging & Maturation', description: 'How cheeses ripen over time.' },
        { topic_code: 'production_techniques', label: 'Production Techniques', description: 'Traditional and modern methods.' },
        { topic_code: 'cultural_history', label: 'Cultural History', description: 'Cheese in societies around the world.' },
        { topic_code: 'science_technology', label: 'Science & Technology', description: 'Microbiology, chemistry, and more.' }
      ],
      highlighted_articles: highlighted
    };
  }

  getArticleFilterOptions() {
    return {
      topics: [
        { value: 'aging_maturation', label: 'Aging & Maturation' },
        { value: 'production_techniques', label: 'Production Techniques' },
        { value: 'cultural_history', label: 'Cultural History' },
        { value: 'regional_styles', label: 'Regional Styles' },
        { value: 'science_technology', label: 'Science & Technology' },
        { value: 'museum_news', label: 'Museum News' }
      ],
      time_period_presets: [
        { id: 'ancient', label: 'Before 1500', start_year: -3000, end_year: 1499 },
        { id: '1800_1950', label: '18001950', start_year: 1800, end_year: 1950 },
        { id: 'modern', label: 'After 1950', start_year: 1951, end_year: 3000 }
      ],
      reading_time_options: [
        { value: 'max_10', label: '10 minutes or less', max_minutes: 10 },
        { value: 'max_20', label: '20 minutes or less', max_minutes: 20 },
        { value: 'max_30', label: '30 minutes or less', max_minutes: 30 }
      ]
    };
  }

  listArticles(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 20;

    // Instrumentation for task 4 article filter usage
    try {
      if (filters &&
          filters.topic === 'aging_maturation' &&
          filters.time_period_start_year === 1800 &&
          filters.time_period_end_year === 1950 &&
          filters.max_reading_time_minutes != null &&
          filters.max_reading_time_minutes <= 10) {
        localStorage.setItem(
          'task4_articleFilterParams',
          JSON.stringify({
            topic: filters.topic,
            time_period_start_year: filters.time_period_start_year,
            time_period_end_year: filters.time_period_end_year,
            max_reading_time_minutes: filters.max_reading_time_minutes
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var articles = this._getFromStorage('articles');
    var result = [];

    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (filters.is_published_only && !a.is_published) continue;
      if (filters.topic && a.topic !== filters.topic) continue;

      var startYear = a.time_period_start_year;
      var endYear = a.time_period_end_year;
      if (filters.time_period_start_year != null || filters.time_period_end_year != null) {
        var fs = filters.time_period_start_year != null ? filters.time_period_start_year : startYear;
        var fe = filters.time_period_end_year != null ? filters.time_period_end_year : endYear;
        if (startYear != null && endYear != null && fs != null && fe != null) {
          if (endYear < fs || startYear > fe) continue;
        }
      }

      if (filters.max_reading_time_minutes != null && a.estimated_reading_time_minutes != null && a.estimated_reading_time_minutes > filters.max_reading_time_minutes) continue;

      result.push(a);
    }

    if (sort_by === 'publish_date_desc') {
      result.sort(function (a, b) {
        var da = a.publication_date || '';
        var db = b.publication_date || '';
        if (da < db) return 1;
        if (da > db) return -1;
        return 0;
      });
    } else if (sort_by === 'reading_time_asc') {
      result.sort(function (a, b) {
        return (a.estimated_reading_time_minutes || 0) - (b.estimated_reading_time_minutes || 0);
      });
    }

    var total = result.length;
    var start = (page - 1) * page_size;
    var end = start + page_size;
    var pageItems = result.slice(start, end);

    return {
      total_count: total,
      page: page,
      page_size: page_size,
      articles: pageItems
    };
  }

  getArticleDetail(article_id) {
    var articles = this._getFromStorage('articles');
    var article = null;
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].id === article_id) {
        article = articles[i];
        break;
      }
    }

    var topicLabels = {
      aging_maturation: 'Aging & Maturation',
      production_techniques: 'Production Techniques',
      cultural_history: 'Cultural History',
      regional_styles: 'Regional Styles',
      science_technology: 'Science & Technology',
      museum_news: 'Museum News'
    };

    var topic_label = article ? (topicLabels[article.topic] || article.topic || '') : '';

    var time_period_display = '';
    if (article && (article.time_period_start_year != null || article.time_period_end_year != null)) {
      var s = article.time_period_start_year;
      var e = article.time_period_end_year;
      function fy(y) { return y != null ? String(y) : ''; }
      if (s != null && e != null) time_period_display = fy(s) + '' + fy(e);
      else if (s != null) time_period_display = fy(s);
      else time_period_display = fy(e);
    }

    var readingList = this._getOrCreateReadingList();
    var items = this._getFromStorage('reading_list_items');
    var is_in_reading_list = false;
    for (i = 0; i < items.length; i++) {
      if (items[i].reading_list_id === readingList.id && items[i].article_id === article_id) {
        is_in_reading_list = true;
        break;
      }
    }

    return {
      article: article,
      topic_label: topic_label,
      time_period_display: time_period_display,
      is_in_reading_list: is_in_reading_list
    };
  }

  addArticleToReadingList(article_id) {
    var readingList = this._getOrCreateReadingList();
    var items = this._getFromStorage('reading_list_items');

    for (var i = 0; i < items.length; i++) {
      if (items[i].reading_list_id === readingList.id && items[i].article_id === article_id) {
        return { success: true, reading_list: readingList, item: items[i] };
      }
    }

    var item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingList.id,
      article_id: article_id,
      added_at: this._now(),
      notes: null
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    this._saveReadingList(readingList);

    return { success: true, reading_list: readingList, item: item };
  }

  removeArticleFromReadingList(article_id) {
    var readingList = this._getOrCreateReadingList();
    var items = this._getFromStorage('reading_list_items');
    var newItems = [];
    for (var i = 0; i < items.length; i++) {
      if (!(items[i].reading_list_id === readingList.id && items[i].article_id === article_id)) {
        newItems.push(items[i]);
      }
    }
    this._saveToStorage('reading_list_items', newItems);
    this._saveReadingList(readingList);

    return { success: true, reading_list: readingList };
  }

  getReadingList() {
    var readingList = this._getOrCreateReadingList();
    var items = this._getFromStorage('reading_list_items');
    var articles = this._getFromStorage('articles');

    var outItems = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].reading_list_id === readingList.id) {
        var art = null;
        for (var j = 0; j < articles.length; j++) {
          if (articles[j].id === items[i].article_id) {
            art = articles[j];
            break;
          }
        }
        outItems.push({
          reading_list_item: items[i],
          article: art
        });
      }
    }

    // Instrumentation for task 4 reading list viewed
    try {
      localStorage.setItem('task4_readingListViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      reading_list: readingList,
      items: outItems
    };
  }

  // ---------------------- TIMELINE ----------------------

  getTimelineConfig() {
    var events = this._getFromStorage('timeline_events');
    var min_year = null;
    var max_year = null;

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var y1 = ev.year != null ? ev.year : ev.start_year;
      var y2 = ev.year != null ? ev.year : ev.end_year;
      if (y1 != null) {
        if (min_year == null || y1 < min_year) min_year = y1;
        if (max_year == null || y1 > max_year) max_year = y1;
      }
      if (y2 != null) {
        if (min_year == null || y2 < min_year) min_year = y2;
        if (max_year == null || y2 > max_year) max_year = y2;
      }
    }

    if (min_year == null) min_year = -3000;
    if (max_year == null) max_year = 2100;

    return {
      min_year: min_year,
      max_year: max_year,
      era_presets: [
        { id: 'ancient_2500_1', label: '2500 BCE  1 CE', start_year: -2500, end_year: 1 },
        { id: 'modern_1900_1950', label: '1900  1950', start_year: 1900, end_year: 1950 }
      ]
    };
  }

  listTimelineEvents(start_year, end_year, region, category) {
    // Instrumentation for task 6 ancient/modern range usage
    try {
      if (start_year <= -2500 && end_year >= 1) {
        localStorage.setItem('task6_ancientRangeUsed', 'true');
      }
      if (start_year <= 1900 && end_year >= 1950) {
        localStorage.setItem('task6_modernRangeUsed', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var events = this._getFromStorage('timeline_events');
    var result = [];

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var y = ev.year;
      var s = ev.start_year;
      var e = ev.end_year;
      var inRange = false;
      if (y != null) {
        inRange = (y >= start_year && y <= end_year);
      } else if (s != null || e != null) {
        var rs = s != null ? s : start_year;
        var re = e != null ? e : end_year;
        inRange = !(re < start_year || rs > end_year);
      }
      if (!inRange) continue;
      if (region && ev.region && ev.region !== region) continue;
      if (category && ev.category && ev.category !== category) continue;
      result.push(ev);
    }

    return {
      start_year: start_year,
      end_year: end_year,
      events: result
    };
  }

  pinTimelineEvent(event_id) {
    var events = this._getFromStorage('timeline_events');
    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === event_id) {
        ev = events[i];
        break;
      }
    }
    if (!ev) {
      return { success: false, pinned_event: null };
    }

    var pinned = this._getFromStorage('pinned_timeline_events');

    for (i = 0; i < pinned.length; i++) {
      if (pinned[i].event_id === event_id) {
        return { success: true, pinned_event: pinned[i] };
      }
    }

    var maxSort = -1;
    for (i = 0; i < pinned.length; i++) {
      if (typeof pinned[i].sort_order === 'number' && pinned[i].sort_order > maxSort) {
        maxSort = pinned[i].sort_order;
      }
    }

    var pinnedEvent = {
      id: this._generateId('pinned_event'),
      event_id: event_id,
      pinned_at: this._now(),
      note: null,
      sort_order: maxSort + 1
    };

    pinned.push(pinnedEvent);
    this._saveToStorage('pinned_timeline_events', pinned);

    return { success: true, pinned_event: pinnedEvent };
  }

  getPinnedTimelineEvents() {
    var pinned = this._getPinnedTimelineCollection();
    var events = this._getFromStorage('timeline_events');

    var out = [];
    for (var i = 0; i < pinned.length; i++) {
      var ev = null;
      for (var j = 0; j < events.length; j++) {
        if (events[j].id === pinned[i].event_id) {
          ev = events[j];
          break;
        }
      }
      out.push({
        pinned_event: pinned[i],
        event: ev
      });
    }

    // Instrumentation for task 6 "My Timeline" viewed
    try {
      localStorage.setItem('task6_myTimelineViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { events: out };
  }

  // ---------------------- SHOP / BOOKS ----------------------

  getShopCategories() {
    return [
      { code: 'books', label: 'Books', description: 'Books on cheese history, science, and culture.' },
      { code: 'apparel', label: 'Apparel', description: 'Cheese-themed clothing.' },
      { code: 'souvenirs', label: 'Souvenirs', description: 'Keepsakes and collectibles.' },
      { code: 'memberships', label: 'Memberships', description: 'Become a museum member.' },
      { code: 'gifts', label: 'Gifts', description: 'Gift items for cheese lovers.' }
    ];
  }

  getBookFilterOptions() {
    return {
      formats: [
        { value: 'paperback', label: 'Paperback' },
        { value: 'hardcover', label: 'Hardcover' },
        { value: 'ebook', label: 'eBook' },
        { value: 'other', label: 'Other' }
      ],
      topics: [
        { value: 'european_cheese_history', label: 'European Cheese History' },
        { value: 'cheese_science', label: 'Cheese Science' },
        { value: 'modern_cheese_production', label: 'Modern Cheese Production' },
        { value: 'general_cheese_history', label: 'General Cheese History' },
        { value: 'children_education', label: 'Childrens Education' },
        { value: 'museum_guide', label: 'Museum Guides' },
        { value: 'other', label: 'Other' }
      ],
      rating_thresholds: [
        { value: 3, label: '3+ stars' },
        { value: 4, label: '4+ stars' },
        { value: 4.5, label: '4.5+ stars' }
      ],
      price_ranges: [
        { id: 'under_20', label: 'Under 20', min_price: 0, max_price: 20 },
        { id: '20_30', label: '2030', min_price: 20, max_price: 30 },
        { id: '30_50', label: '3050', min_price: 30, max_price: 50 }
      ]
    };
  }

  listBooks(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 20;

    // Instrumentation for task 7 book filter usage
    try {
      if (filters &&
          filters.format === 'paperback' &&
          filters.topic === 'european_cheese_history' &&
          filters.min_rating != null &&
          filters.min_rating >= 4 &&
          filters.max_price != null &&
          filters.max_price <= 30) {
        localStorage.setItem(
          'task7_historyBookFilterParams',
          JSON.stringify({
            format: filters.format,
            topic: filters.topic,
            min_rating: filters.min_rating,
            max_price: filters.max_price
          })
        );
      }

      if (filters &&
          filters.format === 'paperback' &&
          (filters.topic === 'cheese_science' || filters.topic === 'modern_cheese_production') &&
          filters.min_rating != null &&
          filters.min_rating >= 4 &&
          filters.max_price != null &&
          filters.max_price <= 25) {
        localStorage.setItem(
          'task7_scienceBookFilterParams',
          JSON.stringify({
            format: filters.format,
            topic: filters.topic,
            min_rating: filters.min_rating,
            max_price: filters.max_price
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    var products = this._getFromStorage('products');
    var result = [];

    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (p.product_type !== 'book') continue;
      if (filters.category && p.category !== filters.category) continue;
      if (!filters.category && p.category && p.category !== 'books') continue;
      if (!p.is_available) continue;
      if (filters.format && p.format !== filters.format) continue;
      if (filters.topic && p.topic !== filters.topic) continue;
      if (filters.min_rating != null && p.rating != null && p.rating < filters.min_rating) continue;
      if (filters.max_price != null && p.price != null && p.price > filters.max_price) continue;

      result.push(p);
    }

    if (sort_by === 'price_asc') {
      result.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sort_by === 'rating_desc') {
      result.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    }

    var total = result.length;
    var start = (page - 1) * page_size;
    var end = start + page_size;
    var pageItems = result.slice(start, end);

    return {
      total_count: total,
      page: page,
      page_size: page_size,
      products: pageItems
    };
  }

  addProductToCart(product_id, quantity) {
    quantity = quantity == null ? 1 : quantity;
    var products = this._getFromStorage('products');
    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === product_id) {
        product = products[i];
        break;
      }
    }
    if (!product || !product.is_available) {
      return { success: false, message: 'Product not available', cart_item: null, cart: this._getOrCreateCart() };
    }

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');

    var existing = null;
    for (i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id && cartItems[i].item_type === 'shop_product' && cartItems[i].product_id === product.id) {
        existing = cartItems[i];
        break;
      }
    }

    var cart_item;
    if (existing) {
      existing.quantity += quantity;
      existing.total_price = (existing.unit_price || 0) * existing.quantity;
      cart_item = existing;
    } else {
      var total_price = (product.price || 0) * quantity;
      cart_item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'shop_product',
        admission_booking_id: null,
        program_booking_id: null,
        product_id: product.id,
        quantity: quantity,
        unit_price: product.price || 0,
        total_price: total_price,
        label: product.name || 'Product',
        created_at: this._now()
      };
      cartItems.push(cart_item);
    }

    this._saveToStorage('cart_items', cartItems);

    if (!cart.items) cart.items = [];
    if (cart.items.indexOf(cart_item.id) === -1) cart.items.push(cart_item.id);
    this._saveCart(cart);
    cart = this._recalculateCartTotals();

    return { success: true, message: 'Added to cart', cart_item: cart_item, cart: cart };
  }

  // ---------------------- NEWSLETTER ----------------------

  getNewsletterOptions() {
    var interests = this._getFromStorage('newsletter_interest_options');

    var frequency_options = [
      { value: 'daily', label: 'Daily', description: 'Receive updates every day.' },
      { value: 'weekly', label: 'Weekly', description: 'A weekly summary of new content.' },
      { value: 'monthly_digest', label: 'Monthly Digest', description: 'Once a month overview.' },
      { value: 'quarterly', label: 'Quarterly', description: 'Seasonal highlights.' }
    ];

    var language_options = [
      { value: 'english', label: 'English' },
      { value: 'french', label: 'French' },
      { value: 'german', label: 'German' },
      { value: 'spanish', label: 'Spanish' },
      { value: 'italian', label: 'Italian' },
      { value: 'other', label: 'Other' }
    ];

    return {
      interests: interests,
      frequency_options: frequency_options,
      language_options: language_options
    };
  }

  subscribeToNewsletter(email, preferred_language, frequency, interest_codes) {
    var subs = this._getFromStorage('newsletter_subscriptions');
    var subscription = null;
    var i;

    for (i = 0; i < subs.length; i++) {
      if (subs[i].email === email) {
        subscription = subs[i];
        break;
      }
    }

    if (!subscription) {
      subscription = {
        id: this._generateId('subscription'),
        email: email,
        preferred_language: preferred_language || null,
        frequency: frequency,
        status: 'pending_confirmation',
        created_at: this._now(),
        updated_at: this._now()
      };
      subs.push(subscription);
    } else {
      subscription.preferred_language = preferred_language || subscription.preferred_language;
      subscription.frequency = frequency || subscription.frequency;
      subscription.updated_at = this._now();
    }

    this._saveToStorage('newsletter_subscriptions', subs);
    localStorage.setItem('current_subscription_id', subscription.id);

    var allInterests = this._getFromStorage('subscription_interests');
    var newInterests = [];
    for (i = 0; i < allInterests.length; i++) {
      if (allInterests[i].subscription_id !== subscription.id) {
        newInterests.push(allInterests[i]);
      }
    }
    interest_codes = interest_codes || [];
    for (i = 0; i < interest_codes.length; i++) {
      newInterests.push({
        id: this._generateId('sub_interest'),
        subscription_id: subscription.id,
        interest_code: interest_codes[i],
        created_at: this._now()
      });
    }
    this._saveToStorage('subscription_interests', newInterests);

    return {
      success: true,
      subscription: subscription,
      message: 'Subscription saved'
    };
  }

  updateNewsletterPreferences(frequency, interest_codes) {
    var subscription = this._getOrCreateNewsletterSubscription(null);
    if (!subscription) {
      return { success: false, subscription: null };
    }

    var subs = this._getFromStorage('newsletter_subscriptions');
    for (var i = 0; i < subs.length; i++) {
      if (subs[i].id === subscription.id) {
        if (frequency) subs[i].frequency = frequency;
        subs[i].status = 'active';
        subs[i].updated_at = this._now();
        subscription = subs[i];
        break;
      }
    }
    this._saveToStorage('newsletter_subscriptions', subs);

    if (interest_codes && interest_codes.length) {
      var allInterests = this._getFromStorage('subscription_interests');
      var newInterests = [];
      for (i = 0; i < allInterests.length; i++) {
        if (allInterests[i].subscription_id !== subscription.id) {
          newInterests.push(allInterests[i]);
        }
      }
      for (i = 0; i < interest_codes.length; i++) {
        newInterests.push({
          id: this._generateId('sub_interest'),
          subscription_id: subscription.id,
          interest_code: interest_codes[i],
          created_at: this._now()
        });
      }
      this._saveToStorage('subscription_interests', newInterests);
    }

    return { success: true, subscription: subscription };
  }

  // ---------------------- ABOUT / CONTACT / POLICIES ----------------------

  getAboutPageContent() {
    return {
      mission: 'The Cheese History Museum is dedicated to preserving and sharing the global story of cheese, from ancient origins to modern innovations.',
      history: 'Founded in 2024, the museum brings together artifacts, documents, and interactive experiences that highlight cheeses role in agriculture, trade, and daily life.',
      key_collections: [
        {
          title: 'Ancient Curds and Cultures',
          description: 'Artifacts and stories from the earliest evidence of cheesemaking.',
          related_section: 'exhibitions'
        },
        {
          title: 'Cheese Through Time Timeline',
          description: 'An interactive chronological journey of cheese milestones.',
          related_section: 'timeline'
        },
        {
          title: 'Aging Cellars Archive',
          description: 'Research materials on historical aging and maturation techniques.',
          related_section: 'learn'
        }
      ]
    };
  }

  getContactInfo() {
    return {
      address_lines: ['123 Fromage Lane'],
      city: 'Cheeseton',
      postal_code: '00000',
      country: 'Cheeseland',
      phone_number: '+00 000 000 0000',
      email_address: 'info@cheesehistorymuseum.example',
      map_embed_url: '',
      visit_info_summary: 'Located in the heart of Cheeseton, a short walk from the central station.'
    };
  }

  submitContactForm(name, email, subject, message) {
    var submissions = this._getFromStorage('contact_submissions');
    submissions.push({
      id: this._generateId('contact'),
      name: name,
      email: email,
      subject: subject || '',
      message: message,
      created_at: this._now()
    });
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  getPoliciesContent() {
    return {
      sections: [
        {
          id: 'privacy',
          title: 'Privacy Policy',
          category: 'privacy',
          content: 'We collect only the data necessary to operate the museum website and do not sell your personal information.'
        },
        {
          id: 'terms',
          title: 'Terms of Use',
          category: 'terms',
          content: 'Use of this website constitutes acceptance of these terms. Content is provided for educational purposes only.'
        },
        {
          id: 'ticketing',
          title: 'Ticketing Policy',
          category: 'ticketing',
          content: 'All ticket sales are subject to availability. Changes and cancellations may be restricted based on ticket type.'
        },
        {
          id: 'shop',
          title: 'Shop & Returns Policy',
          category: 'shop',
          content: 'Physical products can be returned within 30 days in original condition. Shipping charges are non-refundable unless required by law.'
        }
      ]
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