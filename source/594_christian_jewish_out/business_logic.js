// localStorage polyfill for Node.js and environments without localStorage
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Initialize all entity tables in localStorage if not exist
    const tables = [
      'events',
      'event_registrations',
      'fund_designations',
      'donations',
      'products',
      'cart',
      'cart_items',
      'newsletter_topics',
      'newsletter_subscriptions',
      'prayer_requests',
      'media_series',
      'media_sessions',
      'watch_later_items',
      'congregations',
      'favorite_congregations',
      'devotional_plans',
      'devotional_days',
      'devotional_plan_schedules',
      'reading_calendar_entries',
      // extra table for contact inquiries (not in data model but useful)
      'contact_inquiries'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _findById(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  _toISODateString(date) {
    if (typeof date === 'string') {
      return date;
    }
    return date.toISOString();
  }

  _labelFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    const parts = value.split('_');
    for (let i = 0; i < parts.length; i++) {
      parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    }
    return parts.join(' ');
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let openCart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        openCart = carts[i];
        break;
      }
    }
    if (!openCart) {
      openCart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: null
      };
      carts.push(openCart);
      this._saveToStorage('cart', carts);
    }
    return openCart;
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    let subtotal = 0;
    let totalItems = 0;
    const items = [];

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cartId) continue;
      const product = this._findById(products, ci.product_id);
      const lineSubtotal = ci.total_price != null ? ci.total_price : (ci.unit_price * ci.quantity);
      subtotal += lineSubtotal;
      totalItems += ci.quantity;
      items.push({
        cart_item: ci,
        product: product || null,
        line_subtotal: lineSubtotal
      });
    }

    return {
      items: items,
      subtotal: subtotal,
      total_items: totalItems
    };
  }

  // ---------------------- Devotional helpers ----------------------

  _getNextMondayDate() {
    const today = new Date();
    const day = today.getDay(); // 0=Sun,1=Mon,...
    let daysToAdd = (8 - day) % 7; // next Monday; if today Mon (1) -> 7 days
    if (daysToAdd === 0) daysToAdd = 7;
    const nextMonday = new Date(today.getTime());
    nextMonday.setDate(today.getDate() + daysToAdd);
    return nextMonday.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  _generateReadingCalendarEntries(planSchedule, plan) {
    const devotionalDays = this._getFromStorage('devotional_days', []);
    let calendarEntries = this._getFromStorage('reading_calendar_entries', []);

    const startDate = new Date(planSchedule.start_date);
    const duration = plan.duration_days || 0;

    const newEntries = [];

    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const date = new Date(startDate.getTime());
      date.setDate(startDate.getDate() + (dayNum - 1));
      let dayDetail = null;
      for (let j = 0; j < devotionalDays.length; j++) {
        const d = devotionalDays[j];
        if (d.plan_id === plan.id && d.day_number === dayNum) {
          dayDetail = d;
          break;
        }
      }
      const entry = {
        id: this._generateId('reading_calendar_entry'),
        plan_schedule_id: planSchedule.id,
        plan_id: plan.id,
        date: date.toISOString(),
        day_number: dayNum,
        title: dayDetail && dayDetail.title ? dayDetail.title : (plan.title + ' - Day ' + dayNum)
      };
      calendarEntries.push(entry);
      newEntries.push(entry);
    }

    this._saveToStorage('reading_calendar_entries', calendarEntries);
    return newEntries;
  }

  // ---------------------- Homepage ----------------------

  // getHomepageOverview()
  getHomepageOverview() {
    // Attempt to load from storage; if missing, return empty-structured object
    const stored = this._getFromStorage('homepage_overview', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      mission_heading: '',
      mission_body: '',
      focus_areas: [],
      featured_events: [],
      featured_devotionals: [],
      featured_campaigns: [],
      primary_ctas: []
    };
  }

  // ---------------------- Events ----------------------

  // getEventFilterOptions()
  getEventFilterOptions() {
    // Options derived from enums, not mocking event data
    const eventTypes = [
      'bible_study',
      'conference',
      'worship_service',
      'outreach_event',
      'prayer_meeting',
      'seminar',
      'other'
    ];
    const formats = ['online', 'in_person', 'hybrid'];
    const times = ['morning', 'afternoon', 'evening', 'all_day'];

    return {
      event_types: eventTypes.map(v => ({ value: v, label: this._labelFromEnum(v) })),
      formats: formats.map(v => ({ value: v, label: this._labelFromEnum(v) })),
      time_of_day_options: times.map(v => ({ value: v, label: this._labelFromEnum(v) })),
      sort_options: [
        { value: 'start_date_asc', label: 'Start Date - Soonest First' },
        { value: 'start_date_desc', label: 'Start Date - Latest First' }
      ]
    };
  }

  // searchEvents(eventType, format, timeOfDay, startDate, endDate, sortBy = 'start_date_asc', page = 1, pageSize = 20)
  searchEvents(eventType, format, timeOfDay, startDate, endDate, sortBy, page, pageSize) {
    const events = this._getFromStorage('events', []);
    let filtered = [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (eventType && ev.event_type !== eventType) continue;
      if (format && ev.format !== format) continue;
      if (timeOfDay && ev.time_of_day !== timeOfDay) continue;

      if (startDate || endDate) {
        if (!ev.start_datetime) continue;
        const evDate = ev.start_datetime.slice(0, 10);
        if (startDate && evDate < startDate) continue;
        if (endDate && evDate > endDate) continue;
      }

      filtered.push(ev);
    }

    // Sorting
    const sortKey = sortBy || 'start_date_asc';
    filtered.sort((a, b) => {
      const aDate = a.start_datetime || '';
      const bDate = b.start_datetime || '';
      if (sortKey === 'start_date_desc') {
        return aDate < bDate ? 1 : (aDate > bDate ? -1 : 0);
      }
      // default asc
      return aDate > bDate ? 1 : (aDate < bDate ? -1 : 0);
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = filtered.slice(startIndex, startIndex + ps);

    return {
      events: paged,
      total_count: filtered.length,
      page: p,
      page_size: ps
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const ev = this._findById(events, eventId);
    if (!ev) {
      return {
        event: null,
        date_display: '',
        time_display: '',
        is_registration_open: false,
        registration_notes: 'Event not found.'
      };
    }

    let dateDisplay = '';
    let timeDisplay = '';
    if (ev.start_datetime) {
      const d = new Date(ev.start_datetime);
      dateDisplay = d.toDateString();
      timeDisplay = d.toLocaleTimeString();
    }

    const isOpen = !!ev.registration_open && ev.status === 'scheduled';

    return {
      event: ev,
      date_display: dateDisplay,
      time_display: timeDisplay,
      is_registration_open: isOpen,
      registration_notes: isOpen ? '' : 'Registration is currently closed for this event.'
    };
  }

  // submitEventRegistration(eventId, participantsCount, notes)
  submitEventRegistration(eventId, participantsCount, notes) {
    const events = this._getFromStorage('events', []);
    const regs = this._getFromStorage('event_registrations', []);

    const ev = this._findById(events, eventId);
    if (!ev) {
      return {
        success: false,
        registration: null,
        event_title: '',
        message: 'Event not found.'
      };
    }

    if (!ev.registration_open || ev.status !== 'scheduled') {
      return {
        success: false,
        registration: null,
        event_title: ev.title,
        message: 'Registration is closed for this event.'
      };
    }

    // Capacity check (if capacity defined)
    if (ev.capacity != null) {
      let currentCount = 0;
      for (let i = 0; i < regs.length; i++) {
        const r = regs[i];
        if (r.event_id === eventId && r.status !== 'cancelled') {
          currentCount += r.participants_count;
        }
      }
      if (currentCount + participantsCount > ev.capacity) {
        return {
          success: false,
          registration: null,
          event_title: ev.title,
          message: 'Event capacity exceeded.'
        };
      }
    }

    const registration = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      participants_count: participantsCount,
      notes: notes || '',
      registration_datetime: new Date().toISOString(),
      status: 'confirmed'
    };

    regs.push(registration);
    this._saveToStorage('event_registrations', regs);

    return {
      success: true,
      registration: registration,
      event_title: ev.title,
      message: 'Registration completed successfully.'
    };
  }

  // ---------------------- Donations ----------------------

  // getDonationPageConfig()
  getDonationPageConfig() {
    const funds = this._getFromStorage('fund_designations', []);

    const frequencies = [
      'one_time',
      'monthly',
      'weekly',
      'quarterly',
      'annually'
    ];

    const paymentMethods = [
      'credit_card',
      'bank_transfer',
      'paypal',
      'other'
    ];

    const supportedCurrencies = ['usd', 'eur', 'ils', 'gbp', 'other'];

    return {
      default_currency: 'usd',
      supported_currencies: supportedCurrencies,
      min_amount: 1,
      suggested_amounts: [25, 50, 100],
      frequencies: frequencies.map(v => ({ value: v, label: this._labelFromEnum(v) })),
      funds: funds,
      payment_methods: paymentMethods.map(v => ({ value: v, label: this._labelFromEnum(v) }))
    };
  }

  // submitDonation(amount, currency, frequency, designationId, paymentMethod, cardNumber, cardExpirationMonth, cardExpirationYear, cardSecurityCode)
  submitDonation(amount, currency, frequency, designationId, paymentMethod, cardNumber, cardExpirationMonth, cardExpirationYear, cardSecurityCode) {
    const funds = this._getFromStorage('fund_designations', []);
    const donations = this._getFromStorage('donations', []);

    if (!amount || amount <= 0) {
      return {
        success: false,
        donation: null,
        designation_name: '',
        message: 'Invalid donation amount.'
      };
    }

    const supportedCurrencies = ['usd', 'eur', 'ils', 'gbp', 'other'];
    if (supportedCurrencies.indexOf(currency) === -1) {
      return {
        success: false,
        donation: null,
        designation_name: '',
        message: 'Unsupported currency.'
      };
    }

    const validFrequencies = ['one_time', 'monthly', 'weekly', 'quarterly', 'annually'];
    if (validFrequencies.indexOf(frequency) === -1) {
      return {
        success: false,
        donation: null,
        designation_name: '',
        message: 'Invalid donation frequency.'
      };
    }

    const validMethods = ['credit_card', 'bank_transfer', 'paypal', 'other'];
    if (validMethods.indexOf(paymentMethod) === -1) {
      return {
        success: false,
        donation: null,
        designation_name: '',
        message: 'Invalid payment method.'
      };
    }

    if (paymentMethod === 'credit_card') {
      if (!cardNumber || !cardExpirationMonth || !cardExpirationYear || !cardSecurityCode) {
        return {
          success: false,
          donation: null,
          designation_name: '',
          message: 'Missing credit card details.'
        };
      }
    }

    const fund = this._findById(funds, designationId);

    const donation = {
      id: this._generateId('donation'),
      amount: amount,
      currency: currency,
      frequency: frequency,
      is_recurring: frequency !== 'one_time',
      designation_id: designationId,
      payment_method: paymentMethod,
      card_number: paymentMethod === 'credit_card' ? cardNumber : null,
      card_expiration_month: paymentMethod === 'credit_card' ? cardExpirationMonth : null,
      card_expiration_year: paymentMethod === 'credit_card' ? cardExpirationYear : null,
      card_security_code: paymentMethod === 'credit_card' ? cardSecurityCode : null,
      created_at: new Date().toISOString(),
      status: 'successful'
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation: donation,
      designation_name: fund ? fund.name : '',
      message: 'Donation processed successfully.'
    };
  }

  // ---------------------- Store / Products / Cart ----------------------

  // getStoreFilterOptions()
  getStoreFilterOptions() {
    const products = this._getFromStorage('products', []);

    // Derive categories from existing products
    const categorySet = {};
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.category) {
        categorySet[p.category] = true;
      }
    }
    const categories = Object.keys(categorySet).map(v => ({ value: v, label: this._labelFromEnum(v) }));

    // Basic price ranges (UI-level, independent of data contents)
    const price_ranges = [
      { min: 0, max: 10, label: 'Under $10' },
      { min: 10, max: 25, label: '$10 to $25' },
      { min: 25, max: 50, label: '$25 to $50' },
      { min: 50, max: 1000000, label: '$50 and above' }
    ];

    const rating_options = [
      { min_rating: 0, label: 'All ratings' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' }
    ];

    return {
      categories: categories,
      price_ranges: price_ranges,
      rating_options: rating_options,
      sort_options: sort_options
    };
  }

  // searchProducts(query, filters, sortBy = 'relevance', page = 1, pageSize = 20)
  searchProducts(query, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('products', []);
    let filtered = [];

    const q = query ? String(query).toLowerCase() : null;
    const f = filters || {};

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.is_active) continue;

      if (q) {
        let match = false;
        if (p.title && p.title.toLowerCase().indexOf(q) !== -1) match = true;
        else if (p.subtitle && p.subtitle.toLowerCase().indexOf(q) !== -1) match = true;
        else if (p.description && p.description.toLowerCase().indexOf(q) !== -1) match = true;
        else if (p.tags && Array.isArray(p.tags)) {
          for (let t = 0; t < p.tags.length; t++) {
            const tag = String(p.tags[t]).toLowerCase();
            if (tag.indexOf(q) !== -1) {
              match = true;
              break;
            }
          }
        }
        if (!match) continue;
      }

      if (f.category && p.category !== f.category) continue;
      if (f.minPrice != null && p.price < f.minPrice) continue;
      if (f.maxPrice != null && p.price > f.maxPrice) continue;
      if (f.minRating != null && p.rating != null && p.rating < f.minRating) continue;
      if (f.minRating != null && p.rating == null && f.minRating > 0) continue;

      if (f.tags && Array.isArray(f.tags) && f.tags.length > 0) {
        if (!p.tags || !Array.isArray(p.tags)) continue;
        let anyTag = false;
        for (let t = 0; t < f.tags.length; t++) {
          const needed = String(f.tags[t]).toLowerCase();
          for (let pt = 0; pt < p.tags.length; pt++) {
            const ptv = String(p.tags[pt]).toLowerCase();
            if (ptv === needed) {
              anyTag = true;
              break;
            }
          }
          if (anyTag) break;
        }
        if (!anyTag) continue;
      }

      filtered.push(p);
    }

    const sortKey = sortBy || 'relevance';
    if (sortKey === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortKey === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    }
    // 'relevance' keeps insertion order

    const pNum = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (pNum - 1) * ps;
    const paged = filtered.slice(startIndex, startIndex + ps);

    return {
      products: paged,
      total_count: filtered.length,
      page: pNum,
      page_size: ps
    };
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const product = this._findById(products, productId);
    if (!product) {
      return {
        product: null,
        price_display: '',
        rating_display: '',
        bundle_summary: ''
      };
    }

    const currency = (product.currency || 'usd').toUpperCase();
    const price_display = currency + ' ' + Number(product.price || 0).toFixed(2);

    let rating_display = 'No ratings yet';
    if (product.rating != null) {
      const rc = product.rating_count != null ? product.rating_count : 0;
      rating_display = product.rating.toFixed(1) + ' stars' + ' (' + rc + ' ratings)';
    }

    let bundle_summary = '';
    if (product.product_type === 'gift_bundle' || product.product_type === 'outreach_packs') {
      const count = product.bundle_printed_booklet_count != null ? product.bundle_printed_booklet_count : 0;
      bundle_summary = 'Includes ' + count + ' printed booklet' + (count === 1 ? '' : 's');
      if (product.included_items && product.included_items.length) {
        bundle_summary += ' and ' + product.included_items.length + ' total items.';
      }
    }

    return {
      product: product,
      price_display: price_display,
      rating_display: rating_display,
      bundle_summary: bundle_summary
    };
  }

  // addToCart(productId, quantity = 1)
  addToCart(productId, quantity) {
    const qty = quantity != null ? quantity : 1;
    const products = this._getFromStorage('products', []);
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart', []);

    const product = this._findById(products, productId);
    if (!product) {
      return { success: false, cartId: null, message: 'Product not found.' };
    }

    if (!product.in_stock) {
      return { success: false, cartId: cart.id, message: 'Product is out of stock.' };
    }

    let existing = null;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id === cart.id && ci.product_id === productId) {
        existing = ci;
        break;
      }
    }

    if (existing) {
      existing.quantity += qty;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        total_price: product.price * qty,
        added_at: new Date().toISOString()
      };
      cartItems.push(item);
    }

    // Update cart updated_at
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = new Date().toISOString();
        break;
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return { success: true, cartId: cart.id, message: 'Item added to cart.' };
  }

  // getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('cart', []);
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }

    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        total_items: 0
      };
    }

    const totals = this._calculateCartTotals(cart.id);
    return {
      cart: cart,
      items: totals.items,
      subtotal: totals.subtotal,
      total_items: totals.total_items
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('cart', []);
    const products = this._getFromStorage('products', []);

    let target = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        target = cartItems[i];
        break;
      }
    }

    if (!target) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === target.cart_id) {
        cart = carts[i];
        break;
      }
    }

    if (!cart) {
      return { success: false, cart: null, message: 'Cart not found.' };
    }

    if (quantity <= 0) {
      // Remove item
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    } else {
      target.quantity = quantity;
      const product = this._findById(products, target.product_id);
      const unitPrice = target.unit_price != null ? target.unit_price : (product ? product.price : 0);
      target.unit_price = unitPrice;
      target.total_price = unitPrice * quantity;
    }

    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart_items', cartItems);

    // Save updated cart back into carts array
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        break;
      }
    }
    this._saveToStorage('cart', carts);

    return { success: true, cart: cart, message: 'Cart updated.' };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('cart', []);

    let target = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        target = cartItems[i];
        break;
      }
    }

    if (!target) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === target.cart_id) {
        cart = carts[i];
        break;
      }
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);

    if (cart) {
      cart.updated_at = new Date().toISOString();
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === cart.id) {
          carts[i] = cart;
          break;
        }
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return { success: true, cart: cart, message: 'Item removed from cart.' };
  }

  // compareGiftBundles(bundleTitles)
  compareGiftBundles(bundleTitles) {
    const products = this._getFromStorage('products', []);
    const titlesSet = {};
    for (let i = 0; i < bundleTitles.length; i++) {
      titlesSet[String(bundleTitles[i]).toLowerCase()] = true;
    }

    const result = [];
    for (let j = 0; j < products.length; j++) {
      const p = products[j];
      if (!p.is_active) continue;
      if (p.product_type !== 'gift_bundle' && p.category !== 'gift_bundles' && p.category !== 'outreach_packs') continue;
      const titleLower = String(p.title || '').toLowerCase();
      if (titlesSet[titleLower]) {
        result.push(p);
      }
    }
    return result;
  }

  // ---------------------- Newsletters ----------------------

  // getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const topics = this._getFromStorage('newsletter_topics', []);

    const preferredFormats = [
      'email_only',
      'postal_mail_only',
      'email_and_postal',
      'sms',
      'none'
    ];

    return {
      topics: topics,
      preferred_formats: preferredFormats.map(v => ({ value: v, label: this._labelFromEnum(v) }))
    };
  }

  // subscribeToNewsletters(email, topics, contentPreferences, preferredFormat)
  subscribeToNewsletters(email, topics, contentPreferences, preferredFormat) {
    const allTopics = this._getFromStorage('newsletter_topics', []);
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    if (!email) {
      return {
        subscription: null,
        topic_names: [],
        message: 'Email is required.'
      };
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return {
        subscription: null,
        topic_names: [],
        message: 'At least one topic must be selected.'
      };
    }

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email,
      topics: topics,
      content_preferences: contentPreferences || '',
      preferred_format: preferredFormat || null,
      status: 'active',
      subscribed_at: new Date().toISOString()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    const topicNames = [];
    for (let i = 0; i < topics.length; i++) {
      const code = topics[i];
      let name = code;
      for (let j = 0; j < allTopics.length; j++) {
        if (allTopics[j].code === code) {
          name = allTopics[j].name || code;
          break;
        }
      }
      topicNames.push(name);
    }

    return {
      subscription: subscription,
      topic_names: topicNames,
      message: 'Subscription saved successfully.'
    };
  }

  // ---------------------- Prayer Requests ----------------------

  // getPrayerRequestConfig()
  getPrayerRequestConfig() {
    const topicsEnum = [
      'peace_of_jerusalem',
      'general_prayer',
      'israel',
      'holocaust_survivors',
      'healing',
      'guidance',
      'other'
    ];

    return {
      max_message_length: 200,
      topics: topicsEnum.map(v => ({ value: v, label: this._labelFromEnum(v) })),
      allow_follow_up: true
    };
  }

  // submitPrayerRequest(name, email, message, topic, wantsFollowUp)
  submitPrayerRequest(name, email, message, topic, wantsFollowUp) {
    const config = this.getPrayerRequestConfig();
    const maxLen = config.max_message_length || 200;
    let msg = message || '';
    if (msg.length > maxLen) {
      msg = msg.slice(0, maxLen);
    }

    const requests = this._getFromStorage('prayer_requests', []);

    const request = {
      id: this._generateId('prayer_request'),
      name: name || null,
      email: email || null,
      message: msg,
      topic: topic || null,
      wants_follow_up: !!wantsFollowUp,
      created_at: new Date().toISOString(),
      status: 'received'
    };

    requests.push(request);
    this._saveToStorage('prayer_requests', requests);

    return {
      prayer_request: request,
      message: 'Your prayer request has been received.'
    };
  }

  // ---------------------- Media Library / Watch Later ----------------------

  // getMediaLibraryFilterOptions()
  getMediaLibraryFilterOptions() {
    const seriesList = this._getFromStorage('media_series', []);

    const languageSet = {};
    const teacherSet = {};
    const sessionCountSet = {};

    for (let i = 0; i < seriesList.length; i++) {
      const s = seriesList[i];
      if (s.language) languageSet[s.language] = true;
      if (s.teacher_name) teacherSet[s.teacher_name] = true;
      if (s.session_count != null) sessionCountSet[s.session_count] = true;
    }

    const languages = Object.keys(languageSet).map(v => ({ value: v, label: this._labelFromEnum(v) }));
    const teacher_names = Object.keys(teacherSet);
    const session_count_options = Object.keys(sessionCountSet).map(v => ({ value: parseInt(v, 10), label: v + ' sessions' }));

    const sort_options = [
      { value: 'recent', label: 'Most Recent' },
      { value: 'title_asc', label: 'Title A-Z' }
    ];

    return {
      languages: languages,
      teacher_names: teacher_names,
      session_count_options: session_count_options,
      sort_options: sort_options
    };
  }

  // searchMediaSeries(query, filters, sortBy = 'recent')
  searchMediaSeries(query, filters, sortBy) {
    const seriesList = this._getFromStorage('media_series', []);
    const q = query ? String(query).toLowerCase() : null;
    const f = filters || {};

    let filtered = [];

    for (let i = 0; i < seriesList.length; i++) {
      const s = seriesList[i];
      if (!s.is_active) continue;

      if (q) {
        let match = false;
        if (s.title && s.title.toLowerCase().indexOf(q) !== -1) match = true;
        else if (s.subtitle && s.subtitle.toLowerCase().indexOf(q) !== -1) match = true;
        else if (s.description && s.description.toLowerCase().indexOf(q) !== -1) match = true;
        else if (s.topic_tags && Array.isArray(s.topic_tags)) {
          for (let t = 0; t < s.topic_tags.length; t++) {
            const tag = String(s.topic_tags[t]).toLowerCase();
            if (tag.indexOf(q) !== -1) {
              match = true;
              break;
            }
          }
        }
        if (!match) continue;
      }

      if (f.language && s.language !== f.language) continue;
      if (f.teacherName && s.teacher_name !== f.teacherName) continue;
      if (f.sessionCount != null && s.session_count !== f.sessionCount) continue;
      if (f.topicTag && (!s.topic_tags || s.topic_tags.indexOf(f.topicTag) === -1)) continue;

      filtered.push(s);
    }

    const sortKey = sortBy || 'recent';
    if (sortKey === 'title_asc') {
      filtered.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at > bt) return 1;
        if (at < bt) return -1;
        return 0;
      });
    }
    // 'recent' keeps insertion order (assuming pre-seeded newest-first)

    return filtered;
  }

  // getSeriesDetail(seriesId)
  getSeriesDetail(seriesId) {
    const seriesList = this._getFromStorage('media_series', []);
    const sessions = this._getFromStorage('media_sessions', []);

    const series = this._findById(seriesList, seriesId);
    const seriesSessions = [];

    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].series_id === seriesId) {
        seriesSessions.push(sessions[i]);
      }
    }

    seriesSessions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    return {
      series: series,
      sessions: seriesSessions
    };
  }

  // addSeriesToWatchLater(seriesId)
  addSeriesToWatchLater(seriesId) {
    const seriesList = this._getFromStorage('media_series', []);
    const watchItems = this._getFromStorage('watch_later_items', []);

    const series = this._findById(seriesList, seriesId);
    if (!series) {
      return {
        success: false,
        watch_later_item: null,
        series_title: '',
        message: 'Series not found.'
      };
    }

    const item = {
      id: this._generateId('watch_later_item'),
      content_type: 'series',
      series_id: seriesId,
      session_id: null,
      added_at: new Date().toISOString()
    };

    watchItems.push(item);
    this._saveToStorage('watch_later_items', watchItems);

    return {
      success: true,
      watch_later_item: item,
      series_title: series.title,
      message: 'Series added to Watch Later.'
    };
  }

  // getWatchLaterList()
  getWatchLaterList() {
    const watchItems = this._getFromStorage('watch_later_items', []);
    const seriesList = this._getFromStorage('media_series', []);
    const sessions = this._getFromStorage('media_sessions', []);

    const result = [];

    for (let i = 0; i < watchItems.length; i++) {
      const item = watchItems[i];
      let seriesObj = null;
      let sessionObj = null;

      if (item.content_type === 'series' && item.series_id) {
        seriesObj = this._findById(seriesList, item.series_id);
      } else if (item.content_type === 'session' && item.session_id) {
        sessionObj = this._findById(sessions, item.session_id);
      }

      result.push({
        watch_later_item: item,
        series: seriesObj ? { data: seriesObj } : null,
        session: sessionObj ? { data: sessionObj } : null
      });
    }

    return result;
  }

  // removeWatchLaterItem(watchLaterItemId)
  removeWatchLaterItem(watchLaterItemId) {
    let watchItems = this._getFromStorage('watch_later_items', []);
    const originalLength = watchItems.length;
    watchItems = watchItems.filter(w => w.id !== watchLaterItemId);
    this._saveToStorage('watch_later_items', watchItems);

    const success = watchItems.length !== originalLength;
    return {
      success: success,
      message: success ? 'Removed from Watch Later.' : 'Item not found.'
    };
  }

  // ---------------------- Congregations / Favorites ----------------------

  // getCongregationSearchOptions()
  getCongregationSearchOptions() {
    const radius_options_miles = [5, 10, 25, 50, 100];

    const service_time_values = [
      'friday_morning',
      'friday_evening',
      'saturday_morning',
      'saturday_evening',
      'sunday_morning',
      'sunday_evening',
      'other'
    ];

    const service_time_options = service_time_values.map(v => ({
      value: v,
      label: this._labelFromEnum(v)
    }));

    const sort_options = [
      { value: 'distance_asc', label: 'Distance - Nearest First' },
      { value: 'name_asc', label: 'Name A-Z' }
    ];

    return {
      radius_options_miles: radius_options_miles,
      service_time_options: service_time_options,
      sort_options: sort_options
    };
  }

  // searchCongregations(postalCode, radiusMiles = 25, serviceTimeSlot, sortBy = 'distance_asc')
  searchCongregations(postalCode, radiusMiles, serviceTimeSlot, sortBy) {
    const congregations = this._getFromStorage('congregations', []);
    const results = [];

    const pcStr = postalCode ? String(postalCode) : null;
    const pcNum = pcStr ? parseInt(pcStr, 10) : null;
    const radius = typeof radiusMiles === 'number' && radiusMiles > 0 ? radiusMiles : 25;
    const sortKey = sortBy || 'distance_asc';

    for (let i = 0; i < congregations.length; i++) {
      const c = congregations[i];
      if (!c.is_active) continue;

      if (serviceTimeSlot) {
        const slots = Array.isArray(c.service_time_slots) ? c.service_time_slots : [];
        if (slots.indexOf(serviceTimeSlot) === -1) continue;
      }

      // Approximate distance using numeric postal code difference when possible
      let distance = 0;
      if (pcStr && c.postal_code) {
        const cZipStr = String(c.postal_code);
        const cZipNum = parseInt(cZipStr, 10);
        if (!isNaN(pcNum) && !isNaN(cZipNum)) {
          distance = Math.abs(cZipNum - pcNum);
        } else if (cZipStr.slice(0, 3) === pcStr.slice(0, 3)) {
          // Treat same 3-digit prefix as "very near"
          distance = 5;
        } else {
          // If we can't compare meaningfully, treat as outside radius
          distance = radius + 1;
        }
      }

      if (distance > radius) continue;

      results.push({ congregation: c, distance_miles: distance });
    }

    if (sortKey === 'name_asc') {
      results.sort((a, b) => {
        const an = (a.congregation.name || '').toLowerCase();
        const bn = (b.congregation.name || '').toLowerCase();
        if (an > bn) return 1;
        if (an < bn) return -1;
        return 0;
      });
    } else if (sortKey === 'distance_asc') {
      results.sort((a, b) => a.distance_miles - b.distance_miles);
    }

    return results;
  }

  // getCongregationDetail(congregationId)
  getCongregationDetail(congregationId) {
    const congregations = this._getFromStorage('congregations', []);
    const congregation = this._findById(congregations, congregationId);

    if (!congregation) {
      return {
        congregation: null,
        service_times_display: [],
        map_coordinates: { latitude: null, longitude: null }
      };
    }

    const slots = Array.isArray(congregation.service_time_slots) ? congregation.service_time_slots : [];
    const service_times_display = [];
    for (let i = 0; i < slots.length; i++) {
      service_times_display.push(this._labelFromEnum(slots[i]));
    }

    const map_coordinates = {
      latitude: congregation.latitude != null ? congregation.latitude : null,
      longitude: congregation.longitude != null ? congregation.longitude : null
    };

    return {
      congregation: congregation,
      service_times_display: service_times_display,
      map_coordinates: map_coordinates
    };
  }

  // addFavoriteCongregation(congregationId)
  addFavoriteCongregation(congregationId) {
    const congregations = this._getFromStorage('congregations', []);
    const favorites = this._getFromStorage('favorite_congregations', []);

    const congregation = this._findById(congregations, congregationId);
    if (!congregation) {
      return {
        favorite: null,
        congregation_name: '',
        message: 'Congregation not found.'
      };
    }

    const favorite = {
      id: this._generateId('favorite_congregation'),
      congregation_id: congregationId,
      added_at: new Date().toISOString()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_congregations', favorites);

    return {
      favorite: favorite,
      congregation_name: congregation.name,
      message: 'Congregation added to favorites.'
    };
  }

  // getFavoriteCongregations()
  getFavoriteCongregations() {
    const favorites = this._getFromStorage('favorite_congregations', []);
    const congregations = this._getFromStorage('congregations', []);

    const result = [];
    for (let i = 0; i < favorites.length; i++) {
      const fav = favorites[i];
      const congregation = this._findById(congregations, fav.congregation_id);
      result.push({
        favorite: fav,
        congregation: congregation || null
      });
    }

    return result;
  }

  // removeFavoriteCongregation(favoriteId)
  removeFavoriteCongregation(favoriteId) {
    let favorites = this._getFromStorage('favorite_congregations', []);
    const originalLength = favorites.length;
    favorites = favorites.filter(f => f.id !== favoriteId);
    this._saveToStorage('favorite_congregations', favorites);

    const success = favorites.length !== originalLength;
    return {
      success: success,
      message: success ? 'Favorite removed.' : 'Favorite not found.'
    };
  }

  // ---------------------- Devotionals / Reading Plans ----------------------

  // getDevotionalFilterOptions()
  getDevotionalFilterOptions() {
    const plans = this._getFromStorage('devotional_plans', []);

    const topicSet = {};
    const durationSet = {};

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (p.topic) topicSet[p.topic] = true;
      if (p.duration_days != null) durationSet[p.duration_days] = true;
    }

    const topics = Object.keys(topicSet).map(v => ({ value: v, label: this._labelFromEnum(v) }));
    const duration_options_days = Object.keys(durationSet).map(v => parseInt(v, 10));
    duration_options_days.sort((a, b) => a - b);

    const sort_options = [
      { value: 'popular', label: 'Most Popular' },
      { value: 'duration_asc', label: 'Shortest Plans First' }
    ];

    return {
      topics: topics,
      duration_options_days: duration_options_days,
      sort_options: sort_options
    };
  }

  // searchDevotionalPlans(topic, durationDays, sortBy = 'popular')
  searchDevotionalPlans(topic, durationDays, sortBy) {
    const plans = this._getFromStorage('devotional_plans', []);
    let filtered = [];

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (!p.is_active) continue;
      if (topic && p.topic !== topic) continue;
      if (durationDays != null && p.duration_days !== durationDays) continue;
      filtered.push(p);
    }

    const sortKey = sortBy || 'popular';
    if (sortKey === 'duration_asc') {
      filtered.sort((a, b) => (a.duration_days || 0) - (b.duration_days || 0));
    } else if (sortKey === 'popular') {
      // no popularity metric; keep insertion order
    }

    return filtered;
  }

  // getDevotionalPlanDetail(planId)
  getDevotionalPlanDetail(planId) {
    const plans = this._getFromStorage('devotional_plans', []);
    const days = this._getFromStorage('devotional_days', []);

    const plan = this._findById(plans, planId);
    const planDays = [];

    for (let i = 0; i < days.length; i++) {
      if (days[i].plan_id === planId) {
        planDays.push(days[i]);
      }
    }

    planDays.sort((a, b) => (a.day_number || 0) - (b.day_number || 0));

    return {
      plan: plan,
      days: planDays
    };
  }

  // scheduleDevotionalPlan(planId, startDate, showInCalendar)
  scheduleDevotionalPlan(planId, startDate, showInCalendar) {
    const plans = this._getFromStorage('devotional_plans', []);
    const schedules = this._getFromStorage('devotional_plan_schedules', []);

    const plan = this._findById(plans, planId);
    if (!plan) {
      return {
        plan_schedule: null,
        calendar_entries: [],
        message: 'Devotional plan not found.'
      };
    }

    const start = startDate || this._getNextMondayDate();
    const startDt = new Date(start);
    const duration = plan.duration_days || 0;
    const endDt = new Date(startDt.getTime());
    if (duration > 0) {
      endDt.setDate(startDt.getDate() + (duration - 1));
    }

    const schedule = {
      id: this._generateId('devotional_plan_schedule'),
      plan_id: planId,
      start_date: startDt.toISOString(),
      end_date: duration > 0 ? endDt.toISOString() : null,
      show_in_calendar: !!showInCalendar,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    schedules.push(schedule);
    this._saveToStorage('devotional_plan_schedules', schedules);

    let calendarEntries = [];
    if (showInCalendar) {
      calendarEntries = this._generateReadingCalendarEntries(schedule, plan);
    }

    return {
      plan_schedule: schedule,
      calendar_entries: calendarEntries,
      message: 'Devotional plan scheduled.'
    };
  }

  // getReadingCalendar(startDate, endDate)
  getReadingCalendar(startDate, endDate) {
    const entries = this._getFromStorage('reading_calendar_entries', []);
    const plans = this._getFromStorage('devotional_plans', []);
    const schedules = this._getFromStorage('devotional_plan_schedules', []);

    const filtered = [];
    const start = startDate;
    const end = endDate;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const d = e.date ? e.date.slice(0, 10) : '';
      if (d && start && d < start) continue;
      if (d && end && d > end) continue;

      // Foreign key resolution: include plan and plan_schedule
      const plan = this._findById(plans, e.plan_id);
      const schedule = this._findById(schedules, e.plan_schedule_id);

      filtered.push({
        id: e.id,
        plan_schedule_id: e.plan_schedule_id,
        plan_id: e.plan_id,
        date: e.date,
        day_number: e.day_number,
        title: e.title,
        plan: plan || null,
        plan_schedule: schedule || null
      });
    }

    return filtered;
  }

  // ---------------------- About & Contact ----------------------

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      mission: '',
      vision: '',
      holocaust_survivor_focus: '',
      statement_of_faith: [],
      contact_info: {
        mailing_address: '',
        email: '',
        phone: ''
      }
    };
  }

  // submitContactInquiry(name, email, subject, message, preferredContactMethod)
  submitContactInquiry(name, email, subject, message, preferredContactMethod) {
    if (!name || !email || !message) {
      return {
        success: false,
        message: 'Name, email, and message are required.'
      };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name: name,
      email: email,
      subject: subject || '',
      message: message,
      preferred_contact_method: preferredContactMethod || null,
      created_at: new Date().toISOString()
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted successfully.'
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
