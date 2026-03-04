// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // -----------------------------
  // Storage helpers
  // -----------------------------
  _initStorage() {
    const keys = [
      'events',
      'event_ticket_options',
      'show_categories',
      'event_registrations',
      'product_categories',
      'products',
      'shipping_options',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'membership_plans',
      'membership_enrollments',
      'schedule_sessions',
      'personal_schedules',
      'personal_schedule_items',
      'volunteer_shifts',
      'volunteer_signups',
      'volunteer_signup_shifts',
      'hotels',
      'trip_plans',
      'trip_plan_items',
      'newsletter_subscriptions',
      'gallery_photos',
      'favorite_photos'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -----------------------------
  // Generic helpers
  // -----------------------------
  _formatPrice(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return '$' + amount.toFixed(2);
  }

  _formatDateRange(startStr, endStr) {
    if (!startStr) return '';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;
    if (isNaN(start.getTime())) return '';

    const optionsDate = { year: 'numeric', month: 'short', day: 'numeric' };
    const optionsTime = { hour: 'numeric', minute: '2-digit' };

    if (!end || isNaN(end.getTime())) {
      return start.toLocaleString('en-US', { ...optionsDate, ...optionsTime });
    }

    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();

    if (sameDay) {
      const datePart = start.toLocaleDateString('en-US', optionsDate);
      const startTime = start.toLocaleTimeString('en-US', optionsTime);
      const endTime = end.toLocaleTimeString('en-US', optionsTime);
      return datePart + ' ' + startTime + ' - ' + endTime;
    }

    return (
      start.toLocaleString('en-US', { ...optionsDate, ...optionsTime }) +
      ' - ' +
      end.toLocaleString('en-US', { ...optionsDate, ...optionsTime })
    );
  }

  _formatTimeRange(startStr, endStr) {
    if (!startStr) return '';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;
    if (isNaN(start.getTime())) return '';
    const optionsTime = { hour: 'numeric', minute: '2-digit' };
    const startTime = start.toLocaleTimeString('en-US', optionsTime);
    if (!end || isNaN(end.getTime())) return startTime;
    const endTime = end.toLocaleTimeString('en-US', optionsTime);
    return startTime + ' - ' + endTime;
  }

  _monthLabelFromValue(value) {
    // value: 'YYYY-MM'
    if (!value || value.length < 7) return value || '';
    const [yearStr, monthStr] = value.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    if (isNaN(year) || isNaN(month)) return value;
    const d = new Date(year, month, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  _eventTypeLabel(eventType) {
    switch (eventType) {
      case 'cruises_drives':
        return 'Cruise & Drive';
      case 'main_show_shine':
        return 'Main Show & Shine';
      case 'parade':
        return 'Parade';
      case 'workshop':
        return 'Workshop';
      case 'other_event':
      default:
        return 'Other Event';
    }
  }

  _scheduleCategoryLabel(category) {
    switch (category) {
      case 'workshops':
        return 'Workshops';
      case 'parades':
        return 'Parades';
      case 'talks_panels':
        return 'Talks & Panels';
      case 'other':
      default:
        return 'Other';
    }
  }

  _humanizeKey(key) {
    if (!key) return '';
    return key
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(\w)/, (m, c) => c.toUpperCase());
  }

  _dateOnlyISO(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  // -----------------------------
  // Cart & related helpers
  // -----------------------------
  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    const now = new Date().toISOString();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now,
        shipping_option_id: null,
        subtotal: 0,
        shipping_cost: 0,
        total: 0
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );
    const products = this._getFromStorage('products');

    let subtotal = 0;
    cartItems.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      const unitPrice = product ? product.price : item.unit_price || 0;
      item.unit_price = unitPrice;
      item.line_subtotal = unitPrice * item.quantity;
      subtotal += item.line_subtotal;
    });

    const shippingOptions = this._getFromStorage('shipping_options');
    let shippingCost = 0;
    if (cart.shipping_option_id) {
      const opt = shippingOptions.find((o) => o.id === cart.shipping_option_id);
      if (opt) shippingCost = opt.price || 0;
    }

    cart.subtotal = subtotal;
    cart.shipping_cost = shippingCost;
    cart.total = subtotal + shippingCost;
    cart.updated_at = new Date().toISOString();

    // Persist updated cart & items
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }
    this._saveToStorage('cart_items', cartItems);

    return { cart, cartItems };
  }

  _buildCartReturn(cart, cartItems) {
    const products = this._getFromStorage('products');
    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cartItem: ci,
        image_url: product ? product.image_url || '' : '',
        product
      };
    });
    const itemCount = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return { cartCore: cart, items, itemCount };
  }

  // -----------------------------
  // Personal Schedule helper
  // -----------------------------
  _getOrCreatePersonalSchedule() {
    const schedules = this._getFromStorage('personal_schedules');
    let schedule = schedules[0] || null;
    const now = new Date().toISOString();
    if (!schedule) {
      schedule = {
        id: this._generateId('psched'),
        name: 'My Schedule',
        created_at: now,
        updated_at: now
      };
      schedules.push(schedule);
      this._saveToStorage('personal_schedules', schedules);
    }
    return schedule;
  }

  // -----------------------------
  // Trip Plan helper
  // -----------------------------
  _getOrCreateTripPlan() {
    const plans = this._getFromStorage('trip_plans');
    let plan = plans[0] || null;
    const now = new Date().toISOString();
    if (!plan) {
      plan = {
        id: this._generateId('trip'),
        name: 'My Trip Plan',
        created_at: now,
        updated_at: now
      };
      plans.push(plan);
      this._saveToStorage('trip_plans', plans);
    }
    return plan;
  }

  // -----------------------------
  // Favorites helper
  // -----------------------------
  _getOrCreateFavorites() {
    // For this simple implementation, favorite_photos is just an array; nothing
    // extra is needed beyond initializing the key in _initStorage.
    return this._getFromStorage('favorite_photos');
  }

  // =============================================================
  // Interface implementations
  // =============================================================

  // -------------------------------------------------------------
  // Home Page
  // -------------------------------------------------------------
  getHomePageContent() {
    const events = this._getFromStorage('events');
    const products = this._getFromStorage('products');
    const productCategories = this._getFromStorage('product_categories');
    const hotels = this._getFromStorage('hotels');

    const featuredEvents = events
      .filter((e) => e.is_featured)
      .map((event) => ({
        event,
        date_label: this._formatDateRange(event.start_datetime, event.end_datetime),
        event_type_label: this._eventTypeLabel(event.event_type)
      }));

    const highlightedCruises = events.filter(
      (e) => e.event_type === 'cruises_drives'
    );

    const showHighlights = events.filter(
      (e) => e.event_type === 'main_show_shine'
    );

    // Shop spotlight: pick up to 3 active products with highest rating
    const activeProducts = products.filter((p) => p.is_active);
    const spotlightProducts = [...activeProducts]
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 3)
      .map((product) => {
        const category = productCategories.find((c) => c.id === product.category_id);
        return {
          product,
          category_name: category ? category.name : ''
        };
      });

    // Travel highlight: choose cheapest hotel
    let travelHighlightHotel = null;
    if (hotels.length > 0) {
      const sortedHotels = [...hotels].sort(
        (a, b) => (a.nightly_rate || 0) - (b.nightly_rate || 0)
      );
      const hotel = sortedHotels[0];
      travelHighlightHotel = {
        hotel,
        highlight_reason: 'Affordable partner lodging near the event.'
      };
    }

    const newsletterPromo = {
      headline: 'Stay in the loop with classic car news',
      subtitle: 'Monthly recaps, restoration tips, and swap meet alerts straight to your inbox.'
    };

    return {
      featuredEvents,
      highlightedCruises,
      showHighlights,
      shopSpotlightProducts: spotlightProducts,
      travelHighlightHotel,
      newsletterPromo
    };
  }

  // -------------------------------------------------------------
  // Events
  // -------------------------------------------------------------
  getEventsFilterOptions() {
    const events = this._getFromStorage('events');

    const monthSet = new Set();
    events.forEach((e) => {
      if (!e.start_datetime) return;
      const d = new Date(e.start_datetime);
      if (isNaN(d.getTime())) return;
      const value = d.toISOString().slice(0, 7); // YYYY-MM
      monthSet.add(value);
    });

    const monthOptions = Array.from(monthSet)
      .sort()
      .map((value) => ({
        value,
        label: this._monthLabelFromValue(value)
      }));

    const typeSet = new Set();
    events.forEach((e) => {
      if (e.event_type) typeSet.add(e.event_type);
    });

    const eventTypeOptions = Array.from(typeSet).map((value) => ({
      value,
      label: this._eventTypeLabel(value)
    }));

    return { monthOptions, eventTypeOptions };
  }

  listEvents(
    month,
    eventType,
    search,
    onlyWithRegistrationOpen = false,
    page = 1,
    pageSize = 20
  ) {
    const events = this._getFromStorage('events');
    let filtered = [...events];

    if (month) {
      filtered = filtered.filter((e) => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        if (isNaN(d.getTime())) return false;
        return d.toISOString().slice(0, 7) === month;
      });
    }

    if (eventType) {
      filtered = filtered.filter((e) => e.event_type === eventType);
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((e) => {
        const name = (e.name || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return name.includes(s) || desc.includes(s);
      });
    }

    if (onlyWithRegistrationOpen) {
      filtered = filtered.filter((e) => e.registration_open);
    }

    const totalCount = filtered.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paged = filtered.slice(startIdx, endIdx);

    const results = paged.map((event) => {
      const date_label = this._formatDateRange(
        event.start_datetime,
        event.end_datetime
      );
      let location_label = '';
      if (event.location_name) {
        location_label = event.location_name;
      } else if (event.city || event.state) {
        location_label = [event.city, event.state].filter(Boolean).join(', ');
      }
      return {
        event,
        date_label,
        location_label,
        event_type_label: this._eventTypeLabel(event.event_type)
      };
    });

    return { events: results, totalCount };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        long_description: '',
        route_or_venue_info_html: '',
        requirements_html: '',
        whats_included_html: '',
        scheduleHighlights: []
      };
    }

    const sessions = this._getFromStorage('schedule_sessions').filter(
      (s) => s.event_id === event.id
    );

    const scheduleHighlights = [...sessions].sort((a, b) => {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    });

    return {
      event,
      long_description: event.description || '',
      route_or_venue_info_html:
        '<p>See route and venue details on the event map provided after registration.</p>',
      requirements_html:
        '<ul><li>Valid driver license and insurance for all vehicles.</li><li>Please arrive during your assigned check-in window.</li></ul>',
      whats_included_html:
        '<p>Includes access to the event, parking in designated areas, and participation in scheduled activities as noted.</p>',
      scheduleHighlights
    };
  }

  getEventTicketOptions(eventId) {
    const options = this._getFromStorage('event_ticket_options').filter(
      (o) => o.event_id === eventId && o.is_active
    );

    return options.map((ticketOption) => {
      const includes_vehicle_label =
        typeof ticketOption.includes_vehicle_count === 'number'
          ? 'Includes ' + ticketOption.includes_vehicle_count + ' vehicle' +
            (ticketOption.includes_vehicle_count === 1 ? '' : 's')
          : 'No vehicle included';

      const includes_banquet_label = ticketOption.includes_banquet_access
        ? 'Includes banquet access'
        : 'No banquet access';

      const is_sold_out =
        typeof ticketOption.remaining_quantity === 'number' &&
        ticketOption.remaining_quantity <= 0;

      return {
        ticketOption,
        price_label: this._formatPrice(ticketOption.price),
        includes_vehicle_label,
        includes_banquet_label,
        is_sold_out
      };
    });
  }

  createEventRegistration(
    registrationType,
    eventId,
    ticketOptionId,
    showCategoryId,
    registrantFullName,
    registrantEmail,
    registrantPhone,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    vehicleLicensePlate,
    checkinTimeLabel,
    eligibleForJudgedCompetition
  ) {
    const registrations = this._getFromStorage('event_registrations');
    const now = new Date().toISOString();

    const registration = {
      id: this._generateId('ereg'),
      registration_type: registrationType,
      event_id: eventId,
      ticket_option_id: ticketOptionId || null,
      show_category_id: showCategoryId || null,
      created_at: now,
      registrant_full_name: registrantFullName || null,
      registrant_email: registrantEmail || null,
      registrant_phone: registrantPhone || null,
      vehicle_make: vehicleMake || null,
      vehicle_model: vehicleModel || null,
      vehicle_year: typeof vehicleYear === 'number' ? vehicleYear : null,
      vehicle_color: vehicleColor || null,
      vehicle_license_plate: vehicleLicensePlate || null,
      checkin_time_label: checkinTimeLabel || null,
      eligible_for_judged_competition: !!eligibleForJudgedCompetition
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      registration,
      message: 'Event registration created.'
    };
  }

  // -------------------------------------------------------------
  // Shop & Cart
  // -------------------------------------------------------------
  getShopFilterOptions() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products').filter((p) => p.is_active);

    let min = 0;
    let max = 0;
    if (products.length > 0) {
      min = products.reduce(
        (acc, p) => (typeof p.price === 'number' && p.price < acc ? p.price : acc),
        products[0].price || 0
      );
      max = products.reduce(
        (acc, p) => (typeof p.price === 'number' && p.price > acc ? p.price : acc),
        products[0].price || 0
      );
    }

    const styleSet = new Set();
    products.forEach((p) => {
      if (p.style_era) styleSet.add(p.style_era);
    });

    const styleEraOptions = Array.from(styleSet).map((value) => ({
      value,
      label: value
    }));

    const sortOptions = [
      { value: 'rating_desc', label: 'Customer Rating - High to Low' },
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      categories,
      priceRange: {
        min: min || 0,
        max: max || 0,
        step: 1
      },
      styleEraOptions,
      sortOptions
    };
  }

  listProducts(
    categoryId,
    minPrice,
    maxPrice,
    styleEra,
    sortBy,
    page = 1,
    pageSize = 24
  ) {
    const products = this._getFromStorage('products').filter((p) => p.is_active);
    const categories = this._getFromStorage('product_categories');

    let filtered = [...products];

    if (categoryId) {
      filtered = filtered.filter((p) => p.category_id === categoryId);
    }

    if (typeof minPrice === 'number') {
      filtered = filtered.filter((p) => (p.price || 0) >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      filtered = filtered.filter((p) => (p.price || 0) <= maxPrice);
    }

    if (styleEra) {
      filtered = filtered.filter((p) => p.style_era === styleEra);
    }

    if (sortBy === 'rating_desc') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => {
        // Use idCounter-based order as proxy for newest if IDs are generated here
        return (b._created_counter || 0) - (a._created_counter || 0);
      });
    }

    const totalCount = filtered.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paged = filtered.slice(startIdx, endIdx);

    const result = paged.map((product) => {
      const category = categories.find((c) => c.id === product.category_id) || null;
      let rating_label = 'No ratings yet';
      if (typeof product.average_rating === 'number') {
        rating_label =
          product.average_rating.toFixed(1) +
          ' stars' +
          (product.rating_count ? ' (' + product.rating_count + ' reviews)' : '');
      }
      return {
        product,
        category_name: category ? category.name : '',
        price_label: this._formatPrice(product.price),
        rating_label,
        category
      };
    });

    return { products: result, totalCount };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    const categories = this._getFromStorage('product_categories');
    const category = product
      ? categories.find((c) => c.id === product.category_id) || null
      : null;

    if (!product) {
      return {
        product: null,
        category_name: '',
        price_label: '',
        rating_label: '',
        additional_images: []
      };
    }

    let rating_label = 'No ratings yet';
    if (typeof product.average_rating === 'number') {
      rating_label =
        product.average_rating.toFixed(1) +
        ' stars' +
        (product.rating_count ? ' (' + product.rating_count + ' reviews)' : '');
    }

    return {
      product,
      category_name: category ? category.name : '',
      price_label: this._formatPrice(product.price),
      rating_label,
      additional_images: [],
      category
    };
  }

  addToCart(productId, quantity = 1) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product || !product.is_active) {
      return { success: false, cart: null, message: 'Product not found or inactive.' };
    }

    let item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    if (item) {
      item.quantity += quantity;
    } else {
      item = {
        id: this._generateId('citem'),
        cart_id: cart.id,
        product_id: productId,
        product_name: product.name,
        unit_price: product.price,
        quantity: quantity,
        line_subtotal: product.price * quantity
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const { cart: updatedCart, cartItems: updatedItems } = this._recalculateCartTotals(cart);
    const cartReturn = this._buildCartReturn(updatedCart, updatedItems);

    return {
      success: true,
      cart: cartReturn,
      message: 'Item added to cart.'
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const cartItems = cartItemsAll.filter((ci) => ci.cart_id === cart.id);
    const { cart: updatedCart, cartItems: updatedItems } = this._recalculateCartTotals(cart);
    const products = this._getFromStorage('products');

    const items = updatedItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cartItem: ci,
        image_url: product ? product.image_url || '' : '',
        product
      };
    });

    const availableShippingOptions = this._getFromStorage('shipping_options');
    const itemCount = updatedItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      cart: updatedCart,
      items,
      availableShippingOptions,
      selectedShippingOptionId: updatedCart.shipping_option_id || null,
      itemCount
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        cartSummary: {
          cart: this._getOrCreateCart(),
          items: []
        }
      };
    }

    const cartItem = cartItems[idx];
    const cartId = cartItem.cart_id;

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItem.quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();

    const { cart: updatedCart, cartItems: updatedItems } = this._recalculateCartTotals(cart);
    const products = this._getFromStorage('products');

    const items = updatedItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cartItem: ci,
        image_url: product ? product.image_url || '' : '',
        product
      };
    });

    return {
      cartSummary: {
        cart: updatedCart,
        items
      }
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    let cartId = null;
    if (idx !== -1) {
      cartId = cartItems[idx].cart_id;
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
    }

    const carts = this._getFromStorage('cart');
    const cart = cartId
      ? carts.find((c) => c.id === cartId) || this._getOrCreateCart()
      : this._getOrCreateCart();

    const { cart: updatedCart, cartItems: updatedItems } = this._recalculateCartTotals(cart);
    const products = this._getFromStorage('products');

    const items = updatedItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cartItem: ci,
        image_url: product ? product.image_url || '' : '',
        product
      };
    });

    return {
      cartSummary: {
        cart: updatedCart,
        items
      }
    };
  }

  setCartShippingOption(shippingOptionId) {
    const cart = this._getOrCreateCart();
    cart.shipping_option_id = shippingOptionId;
    const { cart: updatedCart } = this._recalculateCartTotals(cart);
    const shippingOptions = this._getFromStorage('shipping_options');
    const selectedShippingOption = shippingOptions.find(
      (o) => o.id === shippingOptionId
    ) || null;
    return {
      cart: updatedCart,
      selectedShippingOption
    };
  }

  getCheckoutDetails() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const products = this._getFromStorage('products');

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cartItem: ci,
        image_url: product ? product.image_url || '' : '',
        product
      };
    });

    const availableShippingOptions = this._getFromStorage('shipping_options');

    let selectedShippingOption = null;
    if (updatedCart.shipping_option_id) {
      selectedShippingOption = availableShippingOptions.find(
        (o) => o.id === updatedCart.shipping_option_id
      ) || null;
    }

    if (!selectedShippingOption && availableShippingOptions.length > 0) {
      // Use default if marked, else first
      selectedShippingOption =
        availableShippingOptions.find((o) => o.is_default) || availableShippingOptions[0];
    }

    const shippingAddressTemplate = {
      name: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: ''
    };

    const availablePaymentMethods = ['credit_debit_card', 'paypal', 'apple_pay', 'other'];

    return {
      cart: updatedCart,
      items,
      selectedShippingOption,
      availableShippingOptions,
      shippingAddressTemplate,
      availablePaymentMethods
    };
  }

  submitOrder(
    shippingName,
    shippingEmail,
    shippingPhone,
    shippingAddressLine1,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    paymentMethod,
    cardholderName,
    cardNumber,
    cardExpiration,
    cardCvc
  ) {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);

    if (!cartItems || cartItems.length === 0) {
      return { success: false, order: null, message: 'Cart is empty.' };
    }

    if (!updatedCart.shipping_option_id) {
      return {
        success: false,
        order: null,
        message: 'Shipping option is not selected.'
      };
    }

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const now = new Date().toISOString();
    const confirmation_number = 'ORD-' + this._getNextIdCounter();

    let payment_last4 = null;
    if (paymentMethod === 'credit_debit_card' && cardNumber) {
      payment_last4 = cardNumber.replace(/\s+/g, '').slice(-4);
    }

    const order = {
      id: this._generateId('order'),
      created_at: now,
      status: 'paid',
      cart_id: updatedCart.id,
      subtotal: updatedCart.subtotal || 0,
      shipping_cost: updatedCart.shipping_cost || 0,
      total: updatedCart.total || 0,
      shipping_option_id: updatedCart.shipping_option_id,
      shipping_name: shippingName,
      shipping_email: shippingEmail,
      shipping_phone: shippingPhone,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2 || '',
      shipping_city: shippingCity,
      shipping_state: shippingState,
      shipping_postal_code: shippingPostalCode,
      payment_method: paymentMethod,
      payment_last4,
      confirmation_number
    };

    orders.push(order);

    cartItems.forEach((ci) => {
      const oi = {
        id: this._generateId('oitm'),
        order_id: order.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal
      };
      orderItems.push(oi);
    });

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart items
    const allCartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id !== updatedCart.id
    );
    this._saveToStorage('cart_items', allCartItems);

    // Reset cart totals
    updatedCart.subtotal = 0;
    updatedCart.shipping_cost = 0;
    updatedCart.total = 0;
    updatedCart.updated_at = new Date().toISOString();
    const carts = this._getFromStorage('cart');
    const cartIdx = carts.findIndex((c) => c.id === updatedCart.id);
    if (cartIdx >= 0) {
      carts[cartIdx] = updatedCart;
      this._saveToStorage('cart', carts);
    }

    return {
      success: true,
      order,
      message: 'Order submitted successfully.'
    };
  }

  // -------------------------------------------------------------
  // Membership
  // -------------------------------------------------------------
  getMembershipPlans(billingPeriod) {
    const plansAll = this._getFromStorage('membership_plans').filter(
      (p) => p.is_active
    );
    const plans = billingPeriod
      ? plansAll.filter((p) => p.billing_period === billingPeriod)
      : plansAll;

    const billingSet = new Set();
    plansAll.forEach((p) => billingSet.add(p.billing_period));
    const billingPeriods = Array.from(billingSet);

    return { billingPeriods, plans };
  }

  enrollMembership(
    membershipPlanId,
    firstName,
    lastName,
    email,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    receivePrintNewsletter,
    includeFamilyAccessPass,
    paymentMethod,
    cardholderName,
    cardNumber,
    cardExpiration,
    cardCvc
  ) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return {
        success: false,
        enrollment: null,
        message: 'Membership plan not found.'
      };
    }

    const enrollments = this._getFromStorage('membership_enrollments');
    const now = new Date().toISOString();

    let card_last4 = null;
    let payment_status = 'pending';
    if (paymentMethod === 'credit_debit_card') {
      if (cardNumber) {
        card_last4 = cardNumber.replace(/\s+/g, '').slice(-4);
        payment_status = 'successful';
      } else {
        payment_status = 'failed';
      }
    } else {
      // cash/check typically processed offline
      payment_status = 'pending';
    }

    const enrollment = {
      id: this._generateId('memb'),
      membership_plan_id: membershipPlanId,
      created_at: now,
      first_name: firstName,
      last_name: lastName,
      email,
      address_line1: addressLine1,
      address_line2: addressLine2 || '',
      city,
      state,
      postal_code: postalCode,
      receive_print_newsletter: !!receivePrintNewsletter,
      include_family_access_pass: !!includeFamilyAccessPass,
      payment_method: paymentMethod,
      cardholder_name: cardholderName || null,
      card_last4,
      card_expiration: cardExpiration || null,
      payment_status
    };

    enrollments.push(enrollment);
    this._saveToStorage('membership_enrollments', enrollments);

    return {
      success: payment_status !== 'failed',
      enrollment,
      message:
        payment_status === 'failed'
          ? 'Payment failed for membership enrollment.'
          : 'Membership enrollment submitted.'
    };
  }

  // -------------------------------------------------------------
  // Schedule / Personal Schedule
  // -------------------------------------------------------------
  getScheduleFilterOptions() {
    const sessions = this._getFromStorage('schedule_sessions');

    const dayMap = new Map();
    sessions.forEach((s) => {
      const key = s.day_label + '|' + this._dateOnlyISO(s.date);
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          day_label: s.day_label,
          date: this._dateOnlyISO(s.date)
        });
      }
    });

    const days = Array.from(dayMap.values());

    const catSet = new Set();
    sessions.forEach((s) => {
      if (s.category) catSet.add(s.category);
    });

    const categories = Array.from(catSet).map((value) => ({
      value,
      label: this._scheduleCategoryLabel(value)
    }));

    return { days, categories };
  }

  listScheduleSessions(dayLabel, date, category, sortBy) {
    let sessions = this._getFromStorage('schedule_sessions');

    if (dayLabel) {
      sessions = sessions.filter((s) => s.day_label === dayLabel);
    }

    if (date) {
      const dateOnly = date.slice(0, 10);
      sessions = sessions.filter(
        (s) => this._dateOnlyISO(s.date) === dateOnly
      );
    }

    if (category) {
      sessions = sessions.filter((s) => s.category === category);
    }

    if (sortBy === 'start_time_asc') {
      sessions.sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
      );
    }

    const schedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items').filter(
      (i) => i.personal_schedule_id === schedule.id
    );
    const inScheduleSet = new Set(items.map((i) => i.session_id));

    const result = sessions.map((session) => ({
      session,
      time_label: this._formatTimeRange(session.start_datetime, session.end_datetime),
      duration_label: (session.duration_minutes || 0) + ' min',
      isInMySchedule: inScheduleSet.has(session.id)
    }));

    return { sessions: result };
  }

  addSessionToMySchedule(sessionId) {
    const schedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items');

    const existing = items.find(
      (i) => i.personal_schedule_id === schedule.id && i.session_id === sessionId
    );
    if (!existing) {
      const item = {
        id: this._generateId('psitem'),
        personal_schedule_id: schedule.id,
        session_id: sessionId,
        added_at: new Date().toISOString()
      };
      items.push(item);
      schedule.updated_at = new Date().toISOString();
      this._saveToStorage('personal_schedule_items', items);
      const schedules = this._getFromStorage('personal_schedules');
      const idx = schedules.findIndex((s) => s.id === schedule.id);
      if (idx >= 0) {
        schedules[idx] = schedule;
        this._saveToStorage('personal_schedules', schedules);
      }
    }

    const allItems = items.filter((i) => i.personal_schedule_id === schedule.id);
    const sessions = this._getFromStorage('schedule_sessions');
    const itemsWithSession = allItems.map((i) => ({
      ...i,
      session: sessions.find((s) => s.id === i.session_id) || null
    }));

    return {
      success: true,
      personalSchedule: schedule,
      items: itemsWithSession,
      message: 'Session added to personal schedule.'
    };
  }

  getMySchedule() {
    const schedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items').filter(
      (i) => i.personal_schedule_id === schedule.id
    );
    const sessions = this._getFromStorage('schedule_sessions');

    const dayMap = new Map();

    items.forEach((item) => {
      const session = sessions.find((s) => s.id === item.session_id);
      if (!session) return;
      const dateStr = this._dateOnlyISO(session.date);
      const key = session.day_label + '|' + dateStr;
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          day_label: session.day_label,
          date: dateStr,
          sessions: []
        });
      }
      dayMap.get(key).sessions.push({
        session,
        personalScheduleItemId: item.id
      });
    });

    const days = Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    days.forEach((d) => {
      d.sessions.sort(
        (a, b) =>
          new Date(a.session.start_datetime).getTime() -
          new Date(b.session.start_datetime).getTime()
      );
    });

    return {
      schedule,
      days
    };
  }

  removeSessionFromMySchedule(personalScheduleItemId) {
    const schedule = this._getOrCreatePersonalSchedule();
    let items = this._getFromStorage('personal_schedule_items');
    const idx = items.findIndex((i) => i.id === personalScheduleItemId);
    if (idx !== -1) {
      items.splice(idx, 1);
      this._saveToStorage('personal_schedule_items', items);
      schedule.updated_at = new Date().toISOString();
      const schedules = this._getFromStorage('personal_schedules');
      const sIdx = schedules.findIndex((s) => s.id === schedule.id);
      if (sIdx >= 0) {
        schedules[sIdx] = schedule;
        this._saveToStorage('personal_schedules', schedules);
      }
    }

    // Rebuild grouped schedule
    items = items.filter((i) => i.personal_schedule_id === schedule.id);
    const sessions = this._getFromStorage('schedule_sessions');
    const dayMap = new Map();

    items.forEach((item) => {
      const session = sessions.find((s) => s.id === item.session_id);
      if (!session) return;
      const dateStr = this._dateOnlyISO(session.date);
      const key = session.day_label + '|' + dateStr;
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          day_label: session.day_label,
          date: dateStr,
          sessions: []
        });
      }
      dayMap.get(key).sessions.push({
        session,
        personalScheduleItemId: item.id
      });
    });

    const days = Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    days.forEach((d) => {
      d.sessions.sort(
        (a, b) =>
          new Date(a.session.start_datetime).getTime() -
          new Date(b.session.start_datetime).getTime()
      );
    });

    return {
      schedule,
      days
    };
  }

  getMySchedulePrintView() {
    const mySchedule = this.getMySchedule();
    const title = 'My Event Schedule';

    const days = mySchedule.days.map((d) => ({
      day_label: d.day_label,
      date: d.date,
      sessions: d.sessions.map((s) => ({
        time_label: this._formatTimeRange(
          s.session.start_datetime,
          s.session.end_datetime
        ),
        title: s.session.title,
        location: s.session.location || ''
      }))
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_printViewOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      title,
      days
    };
  }

  // -------------------------------------------------------------
  // Vehicle Registration (Show & Shine)
  // -------------------------------------------------------------
  getVehicleRegistrationOptions(eventId) {
    const events = this._getFromStorage('events');
    const showCategoriesAll = this._getFromStorage('show_categories');

    const eventsWithVehicleRegistration = events.filter(
      (e) => e.has_vehicle_registration
    );

    const showCategories = eventId
      ? showCategoriesAll.filter((c) => c.event_id === eventId)
      : showCategoriesAll;

    return {
      eventsWithVehicleRegistration,
      showCategories
    };
  }

  submitVehicleRegistration(
    eventId,
    showCategoryId,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    vehicleLicensePlate,
    eligibleForJudgedCompetition,
    checkinTimeLabel
  ) {
    const registrations = this._getFromStorage('event_registrations');
    const now = new Date().toISOString();

    const registration = {
      id: this._generateId('ereg'),
      registration_type: 'show',
      event_id: eventId,
      ticket_option_id: null,
      show_category_id: showCategoryId,
      created_at: now,
      registrant_full_name: null,
      registrant_email: null,
      registrant_phone: null,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_year: vehicleYear,
      vehicle_color: vehicleColor || null,
      vehicle_license_plate: vehicleLicensePlate || null,
      checkin_time_label: checkinTimeLabel,
      eligible_for_judged_competition: !!eligibleForJudgedCompetition
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      registration,
      message: 'Vehicle registration submitted.'
    };
  }

  // -------------------------------------------------------------
  // Volunteer
  // -------------------------------------------------------------
  getVolunteerFilterOptions() {
    const shifts = this._getFromStorage('volunteer_shifts');

    const dateMap = new Map();
    shifts.forEach((s) => {
      const dateOnly = this._dateOnlyISO(s.date);
      if (!dateOnly) return;
      if (!dateMap.has(dateOnly)) {
        const d = new Date(s.date);
        const label = d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        dateMap.set(dateOnly, { date: dateOnly, label });
      }
    });

    const availableDates = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const roleTypeSet = new Set();
    shifts.forEach((s) => roleTypeSet.add(s.role_type));

    const roleTypes = Array.from(roleTypeSet).map((value) => ({
      value,
      label: this._humanizeKey(value)
    }));

    return { availableDates, roleTypes };
  }

  listVolunteerShifts(date, roleTypes) {
    let shifts = this._getFromStorage('volunteer_shifts');
    const dateOnly = date ? date.slice(0, 10) : null;

    shifts = shifts.filter((s) => {
      if (dateOnly && this._dateOnlyISO(s.date) !== dateOnly) return false;
      if (roleTypes && roleTypes.length > 0) {
        return roleTypes.includes(s.role_type);
      }
      return true;
    });

    return { shifts };
  }

  submitVolunteerSignup(
    shiftIds,
    name,
    email,
    mobilePhone,
    tshirtSize,
    comments
  ) {
    if (!shiftIds || shiftIds.length === 0) {
      return {
        success: false,
        signup: null,
        assignedShifts: [],
        message: 'No shifts selected.'
      };
    }

    const shifts = this._getFromStorage('volunteer_shifts');
    const selectedShifts = shifts.filter((s) => shiftIds.includes(s.id));

    const signups = this._getFromStorage('volunteer_signups');
    const signupShifts = this._getFromStorage('volunteer_signup_shifts');

    const now = new Date().toISOString();

    const signup = {
      id: this._generateId('vsign'),
      created_at: now,
      name,
      email,
      mobile_phone: mobilePhone,
      tshirt_size: tshirtSize,
      comments: comments || ''
    };

    signups.push(signup);

    selectedShifts.forEach((shift) => {
      const link = {
        id: this._generateId('vsshift'),
        volunteer_signup_id: signup.id,
        shift_id: shift.id
      };
      signupShifts.push(link);

      if (typeof shift.remaining_slots === 'number' && shift.remaining_slots > 0) {
        shift.remaining_slots -= 1;
      }
    });

    // Save all
    this._saveToStorage('volunteer_signups', signups);
    this._saveToStorage('volunteer_signup_shifts', signupShifts);
    this._saveToStorage('volunteer_shifts', shifts);

    return {
      success: true,
      signup,
      assignedShifts: selectedShifts,
      message: 'Volunteer signup submitted.'
    };
  }

  // -------------------------------------------------------------
  // Travel & Lodging / Hotels / Trip Plan
  // -------------------------------------------------------------
  getTravelAndLodgingContent() {
    return {
      drivingDirectionsHtml:
        '<p>Use your preferred GPS app to navigate to the main show grounds. Detailed turn-by-turn directions are provided in your registration email.</p>',
      parkingInfoHtml:
        '<p>On-site parking is available for registered vehicles. Spectator parking is located in the overflow lots with shuttle service to the main gate.</p>',
      partnerHotelsIntroHtml:
        '<p>We partner with local hotels that offer car-friendly amenities such as covered and trailer parking.</p>'
    };
  }

  getPartnerHotelFilterOptions() {
    const hotels = this._getFromStorage('hotels');
    let maxNightlyRateDefault = 0;
    if (hotels.length > 0) {
      maxNightlyRateDefault = hotels.reduce(
        (acc, h) => (h.nightly_rate > acc ? h.nightly_rate : acc),
        hotels[0].nightly_rate || 0
      );
    }

    const distanceOptions = [
      { value: 'within_5_miles', label: 'Within 5 miles of event', maxMiles: 5 },
      { value: 'within_10_miles', label: 'Within 10 miles of event', maxMiles: 10 },
      { value: 'any_distance', label: 'Any distance', maxMiles: null }
    ];

    const amenitySet = new Set();
    hotels.forEach((h) => {
      (h.amenities || []).forEach((a) => amenitySet.add(a));
    });

    const amenityOptions = Array.from(amenitySet).map((value) => ({
      value,
      label: this._humanizeKey(value)
    }));

    const sortOptions = [
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'distance_asc', label: 'Distance - Closest First' },
      { value: 'rating_desc', label: 'Rating - High to Low' }
    ];

    return {
      maxNightlyRateDefault,
      distanceOptions,
      amenityOptions,
      sortOptions
    };
  }

  listPartnerHotels(
    maxNightlyRate,
    distanceFilter,
    amenities,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    let hotels = this._getFromStorage('hotels');

    if (typeof maxNightlyRate === 'number') {
      hotels = hotels.filter((h) => (h.nightly_rate || 0) <= maxNightlyRate);
    }

    if (distanceFilter && distanceFilter !== 'any_distance') {
      let maxMiles = null;
      if (distanceFilter === 'within_5_miles') maxMiles = 5;
      else if (distanceFilter === 'within_10_miles') maxMiles = 10;
      if (maxMiles != null) {
        hotels = hotels.filter(
          (h) => (h.distance_from_event_miles || Infinity) <= maxMiles
        );
      }
    }

    if (amenities && amenities.length > 0) {
      hotels = hotels.filter((h) => {
        const hotelAmenities = h.amenities || [];
        return amenities.every((a) => hotelAmenities.includes(a));
      });
    }

    if (sortBy === 'price_asc') {
      hotels.sort(
        (a, b) => (a.nightly_rate || 0) - (b.nightly_rate || 0)
      );
    } else if (sortBy === 'distance_asc') {
      hotels.sort(
        (a, b) =>
          (a.distance_from_event_miles || Infinity) -
          (b.distance_from_event_miles || Infinity)
      );
    } else if (sortBy === 'rating_desc') {
      hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const totalCount = hotels.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paged = hotels.slice(startIdx, endIdx);

    return { hotels: paged, totalCount };
  }

  getHotelDetail(hotelId) {
    const hotels = this._getFromStorage('hotels');
    const hotel = hotels.find((h) => h.id === hotelId) || null;

    if (!hotel) {
      return {
        hotel: null,
        amenities_descriptions: [],
        parking_highlight: ''
      };
    }

    const amenities_descriptions = (hotel.amenities || []).map((a) => {
      if (a === 'covered_parking') return 'Covered parking for your vehicle.';
      if (a === 'trailer_parking_allowed')
        return 'Trailer parking is allowed on-site.';
      return this._humanizeKey(a);
    });

    let parking_highlight = '';
    if ((hotel.amenities || []).includes('covered_parking')) {
      parking_highlight = 'Includes covered parking to protect your classic car.';
    } else if ((hotel.amenities || []).includes('trailer_parking_allowed')) {
      parking_highlight = 'Trailer parking available for haulers and support vehicles.';
    }

    return {
      hotel,
      amenities_descriptions,
      parking_highlight
    };
  }

  addHotelToTripPlan(hotelId, checkinDate, checkoutDate, notes) {
    const tripPlan = this._getOrCreateTripPlan();
    const items = this._getFromStorage('trip_plan_items');
    const now = new Date().toISOString();

    const item = {
      id: this._generateId('titem'),
      trip_plan_id: tripPlan.id,
      item_type: 'hotel',
      hotel_id: hotelId,
      notes: notes || '',
      checkin_date: checkinDate || null,
      checkout_date: checkoutDate || null,
      added_at: now
    };

    items.push(item);
    tripPlan.updated_at = now;

    this._saveToStorage('trip_plan_items', items);
    const plans = this._getFromStorage('trip_plans');
    const idx = plans.findIndex((p) => p.id === tripPlan.id);
    if (idx >= 0) {
      plans[idx] = tripPlan;
      this._saveToStorage('trip_plans', plans);
    }

    const hotels = this._getFromStorage('hotels');
    const planItems = items
      .filter((i) => i.trip_plan_id === tripPlan.id)
      .map((i) => ({
        ...i,
        hotel: hotels.find((h) => h.id === i.hotel_id) || null
      }));

    return {
      success: true,
      tripPlan,
      items: planItems,
      message: 'Hotel added to trip plan.'
    };
  }

  getTripPlan() {
    const tripPlan = this._getOrCreateTripPlan();
    const items = this._getFromStorage('trip_plan_items').filter(
      (i) => i.trip_plan_id === tripPlan.id
    );
    const hotels = this._getFromStorage('hotels');

    const detailedItems = items.map((item) => ({
      tripPlanItem: item,
      hotel: item.hotel_id
        ? hotels.find((h) => h.id === item.hotel_id) || null
        : null
    }));

    return {
      tripPlan,
      items: detailedItems
    };
  }

  // -------------------------------------------------------------
  // Newsletter
  // -------------------------------------------------------------
  getNewsletterOptions() {
    const frequencies = [
      { value: 'monthly_recap', label: 'Monthly recap' },
      { value: 'weekly_digest', label: 'Weekly digest' },
      { value: 'event_alerts', label: 'Event alerts' }
    ];

    const interests = [
      { value: 'restoration_tips', label: 'Restoration tips' },
      { value: 'swap_meet_alerts', label: 'Swap meet alerts' },
      { value: 'modern_car_news', label: 'Modern car news' }
    ];

    const deliveryFormats = [
      { value: 'email_only', label: 'Email only (no SMS)' },
      { value: 'email_and_sms', label: 'Email + SMS' }
    ];

    return { frequencies, interests, deliveryFormats };
  }

  subscribeToNewsletter(email, frequency, interests, deliveryFormat) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();

    let subscription = subs.find((s) => s.email === email) || null;
    if (subscription) {
      subscription.frequency = frequency;
      subscription.interests = interests || [];
      subscription.delivery_format = deliveryFormat;
      subscription.is_active = true;
    } else {
      subscription = {
        id: this._generateId('nsub'),
        email,
        frequency,
        interests: interests || [],
        delivery_format: deliveryFormat,
        created_at: now,
        is_active: true
      };
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription,
      message: 'Newsletter subscription saved.'
    };
  }

  // -------------------------------------------------------------
  // Gallery & Favorites
  // -------------------------------------------------------------
  getGalleryFilterOptions() {
    const photos = this._getFromStorage('gallery_photos');

    const yearSet = new Set();
    const eventSet = new Set();
    const categorySet = new Set();
    const subcategoryMap = new Map();

    photos.forEach((p) => {
      if (typeof p.year === 'number') yearSet.add(p.year);
      if (p.event_name) eventSet.add(p.event_name);
      if (p.category) categorySet.add(p.category);
      if (p.category && p.subcategory) {
        const key = p.category;
        if (!subcategoryMap.has(key)) subcategoryMap.set(key, new Set());
        subcategoryMap.get(key).add(p.subcategory);
      }
    });

    const years = Array.from(yearSet)
      .sort((a, b) => b - a)
      .map((value) => ({
        value,
        label: String(value)
      }));

    const events = Array.from(eventSet).map((value) => ({
      value,
      label: value
    }));

    const categories = Array.from(categorySet).map((value) => {
      const subs = subcategoryMap.get(value) || new Set();
      const subcategories = Array.from(subs).map((sub) => ({
        value: sub,
        label: this._humanizeKey(sub)
      }));
      return {
        value,
        label: this._humanizeKey(value),
        subcategories
      };
    });

    return { years, events, categories };
  }

  listGalleryPhotos(
    year,
    eventName,
    category,
    subcategory,
    page = 1,
    pageSize = 40
  ) {
    let photos = this._getFromStorage('gallery_photos');

    if (typeof year === 'number') {
      photos = photos.filter((p) => p.year === year);
    }

    if (eventName) {
      photos = photos.filter((p) => p.event_name === eventName);
    }

    if (category) {
      photos = photos.filter((p) => p.category === category);
    }

    if (subcategory) {
      photos = photos.filter((p) => p.subcategory === subcategory);
    }

    const totalCount = photos.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paged = photos.slice(startIdx, endIdx);

    return { photos: paged, totalCount };
  }

  favoriteGalleryPhoto(photoId) {
    const photos = this._getFromStorage('gallery_photos');
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) {
      return {
        favorite: null,
        message: 'Photo not found.'
      };
    }

    const favorites = this._getOrCreateFavorites();
    let favorite = favorites.find((f) => f.photo_id === photoId) || null;
    if (!favorite) {
      favorite = {
        id: this._generateId('fav'),
        photo_id: photoId,
        favorited_at: new Date().toISOString()
      };
      favorites.push(favorite);
      this._saveToStorage('favorite_photos', favorites);
    }

    return {
      favorite,
      message: 'Photo added to favorites.'
    };
  }

  getFavoritePhotos() {
    const favorites = this._getFromStorage('favorite_photos');
    const photos = this._getFromStorage('gallery_photos');

    const detailed = favorites.map((favorite) => ({
      favorite,
      photo: photos.find((p) => p.id === favorite.photo_id) || null
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task9_favoritesViewOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      favorites: detailed,
      totalCount: favorites.length
    };
  }

  removeFavoritePhoto(favoriteId) {
    const favorites = this._getFromStorage('favorite_photos');
    const idx = favorites.findIndex((f) => f.id === favoriteId);
    if (idx !== -1) {
      favorites.splice(idx, 1);
      this._saveToStorage('favorite_photos', favorites);
      return {
        success: true,
        remainingFavoritesCount: favorites.length,
        message: 'Favorite removed.'
      };
    }

    return {
      success: false,
      remainingFavoritesCount: favorites.length,
      message: 'Favorite not found.'
    };
  }

  // -------------------------------------------------------------
  // About Page
  // -------------------------------------------------------------
  getAboutPageContent() {
    const historyHtml =
      '<p>Founded by enthusiasts, our classic car club celebrates the design and engineering of vintage automobiles.</p>';

    const missionHtml =
      '<p>Our mission is to bring together owners and fans of classic cars through events, cruises, and educational programs.</p>';

    const eventOverviewHtml =
      '<p>The annual Main Show &amp; Shine, Sunset Coastal Cruise, and related events showcase vehicles across eras, with awards, parades, and workshops.</p>';

    const contactEmail = 'info@classiccarclub.example.com';
    const contactPhone = '555-0000';
    const eventLocationSummary = 'Main show grounds located near downtown with ample parking.';

    const keyLinks = [
      { label: 'Vehicle Registration', targetPage: 'vehicle_registration' },
      { label: 'Membership', targetPage: 'membership' },
      { label: 'Volunteer', targetPage: 'volunteer' }
    ];

    return {
      historyHtml,
      missionHtml,
      eventOverviewHtml,
      contactEmail,
      contactPhone,
      eventLocationSummary,
      keyLinks
    };
  }
}

// Global and module exports
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}