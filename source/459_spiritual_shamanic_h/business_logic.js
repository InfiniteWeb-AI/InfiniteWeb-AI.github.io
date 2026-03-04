/*
  BusinessLogic for spiritual shamanic healing services website
  - Uses localStorage (with Node-safe polyfill) for ALL persistence
  - No DOM/window/document usage except localStorage
  - Implements all specified interfaces
*/

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

  // ====== core storage helpers ======

  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Entity tables (arrays)
    const arrayKeys = [
      'sessions',
      'session_time_slots',
      'healers',
      'healer_reviews',
      'session_bookings',
      'packages',
      'package_sessions',
      'events',
      'event_registrations',
      'articles',
      'reading_list',
      'products',
      'cart_items',
      'orders',
      'order_items',
      'wishlist',
      'healing_plans',
      'newsletter_subscriptions',
      'healer_contact_messages',
      'general_contact_messages'
    ];
    for (const key of arrayKeys) {
      ensureArray(key);
    }

    // Single cart object (or null) stored under 'cart'
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    // Static content containers (can be customized externally by writing to localStorage)
    if (!localStorage.getItem('homepage_overview')) {
      const homepage = {
        hero_title: 'Shamanic Healing & Sacred Support',
        hero_subtitle: 'Remote sessions, group ceremonies, and guided journeys',
        intro_html: '<p>Welcome to this sacred space for shamanic healing, journeying, and integration.</p>',
        values_html: '<ul><li>Integrity</li><li>Trauma-informed care</li><li>Deep listening</li></ul>',
        service_categories: [
          { key: 'sessions', title: '1:1 Sessions', description: 'Book individual shamanic healing sessions.' },
          { key: 'packages', title: 'Packages', description: 'Multi-session healing journeys.' },
          { key: 'events', title: 'Group Ceremonies', description: 'Ceremonies and circles in community.' },
          { key: 'healers', title: 'Healers', description: 'Meet the practitioners.' },
          { key: 'store', title: 'Store', description: 'Meditations, audio journeys, and more.' },
          { key: 'articles', title: 'Resources', description: 'Articles on shamanic practice and integration.' }
        ]
      };
      localStorage.setItem('homepage_overview', JSON.stringify(homepage));
    }

    if (!localStorage.getItem('about_page_content')) {
      const about = {
        practitioner_bio_html: '<p>This space is held by practitioners trained in shamanic healing, energy work, and trauma-informed integration.</p>',
        approach_html: '<p>Our approach centers consent, nervous system regulation, and clear agreements for spiritual work.</p>',
        ethics_and_safety_html: '<p>These services complement but do not replace medical or psychological care. Always seek licensed support when needed.</p>'
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('policies_content')) {
      const policies = {
        privacy_policy_html: '<p>Your information is held in confidence and never shared without consent except as required by law.</p>',
        terms_of_use_html: '<p>Spiritual services are offered for personal growth and are not a substitute for professional care.</p>',
        refund_and_cancellation_policy_html: '<p>Please provide at least 24 hours notice to reschedule or cancel a session.</p>'
      };
      localStorage.setItem('policies_content', JSON.stringify(policies));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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

  // ====== generic helpers ======

  _nowISO() {
    return new Date().toISOString();
  }

  _parseISO(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _yyyyMmDd(date) {
    if (!date) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _timeFromDate(date) {
    if (!date) return null;
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  _formatTimeDisplay(date) {
    if (!date) return '';
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  _compareTimeStrings(t1, t2) {
    // 'HH:MM' string comparison by minutes
    if (!t1 || !t2) return 0;
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    const v1 = h1 * 60 + m1;
    const v2 = h2 * 60 + m2;
    return v1 - v2;
  }

  _unique(array) {
    return Array.from(new Set(array));
  }

  _intersection(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return [];
    const setB = new Set(b);
    return a.filter((x) => setB.has(x));
  }

  _generateOrderNumber() {
    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, '0');
    const d = String(ts.getDate()).padStart(2, '0');
    const h = String(ts.getHours()).padStart(2, '0');
    const min = String(ts.getMinutes()).padStart(2, '0');
    const s = String(ts.getSeconds()).padStart(2, '0');
    const counter = this._getNextIdCounter();
    return `ORD-${y}${m}${d}-${h}${min}${s}-${counter}`;
  }

  _validateGiftCardAmount(product, amount) {
    if (!product) {
      return { valid: false, message: 'Gift card product not found.' };
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return { valid: false, message: 'Invalid gift card amount.' };
    }
    if (typeof product.min_amount === 'number' && amount < product.min_amount) {
      return { valid: false, message: `Minimum gift card amount is $${product.min_amount}.` };
    }
    if (typeof product.max_amount === 'number' && amount > product.max_amount) {
      return { valid: false, message: `Maximum gift card amount is $${product.max_amount}.` };
    }
    if (typeof product.price === 'number' && !product.min_amount && !product.max_amount && amount !== product.price) {
      return { valid: false, message: `Gift card amount must be $${product.price}.` };
    }
    return { valid: true, message: 'OK' };
  }

  // ====== cart helpers ======

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowISO(),
        updatedAt: this._nowISO(),
        items_total: 0,
        tax_total: 0,
        grand_total: 0
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _getCurrentCart() {
    const cart = this._getFromStorage('cart', null);
    return cart && cart.id ? cart : null;
  }

  _recalculateCartTotals() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    let items_total = 0;
    for (const item of itemsForCart) {
      items_total += Number(item.total_price || 0);
    }
    const tax_total = 0;
    const grand_total = items_total + tax_total;
    cart.items_total = items_total;
    cart.tax_total = tax_total;
    cart.grand_total = grand_total;
    cart.updatedAt = this._nowISO();
    this._saveToStorage('cart', cart);
    return { items_total, tax_total, grand_total };
  }

  // ====== wishlist / healing plan helpers ======

  _ensureHealingPlanExists() {
    let plans = this._getFromStorage('healing_plans', []);
    if (!Array.isArray(plans)) plans = [];
    let plan = plans.find((p) => !p.is_finalized) || plans[0];
    if (!plan) {
      plan = {
        id: this._generateId('plan'),
        title: 'My Healing Plan',
        description: '',
        item_ids: [],
        total_price: 0,
        is_finalized: false,
        finalizedAt: null,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      plans.push(plan);
      this._saveToStorage('healing_plans', plans);
    }
    return plan;
  }

  _recalculateHealingPlanTotals(planId) {
    let plans = this._getFromStorage('healing_plans', []);
    let wishlist = this._getFromStorage('wishlist', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return null;
    const itemsForPlan = wishlist.filter((w) => w.planId === plan.id);
    plan.item_ids = itemsForPlan.map((i) => i.id);
    plan.total_price = itemsForPlan.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
    plan.updatedAt = this._nowISO();
    this._saveToStorage('healing_plans', plans);
    return plan;
  }

  // ====== session-specific helpers ======

  _getSessionEffectivePrice(session) {
    if (!session) return 0;
    const slots = this._getFromStorage('session_time_slots', []);
    const relevant = slots.filter((s) => s.sessionId === session.id && s.status === 'available' && s.remaining_spots > 0);
    if (!relevant.length) return Number(session.base_price) || 0;
    let minPrice = null;
    for (const slot of relevant) {
      const price = typeof slot.price_override === 'number' ? slot.price_override : session.base_price;
      if (minPrice === null || price < minPrice) minPrice = price;
    }
    return minPrice === null ? Number(session.base_price) || 0 : minPrice;
  }

  _getSessionNextAvailable(session) {
    if (!session) return null;
    const slots = this._getFromStorage('session_time_slots', []);
    const relevant = slots.filter((s) => s.sessionId === session.id && s.status === 'available' && s.remaining_spots > 0);
    if (!relevant.length) {
      return session.next_available_datetime || null;
    }
    relevant.sort((a, b) => this._parseISO(a.start_datetime) - this._parseISO(b.start_datetime));
    return relevant[0].start_datetime;
  }

  // ====== 1. Homepage overview ======

  getHomepageOverview() {
    const data = this._getFromStorage('homepage_overview', null);
    return data || {
      hero_title: '',
      hero_subtitle: '',
      intro_html: '',
      values_html: '',
      service_categories: []
    };
  }

  // ====== 2. Newsletter preferences & subscription ======

  getNewsletterPreferencesOptions() {
    const interest_options = [
      { code: 'dreamwork', label: 'Dreamwork' },
      { code: 'spirit_animals', label: 'Spirit Animals' }
    ];
    const frequency_options = [
      { code: 'monthly', label: 'Monthly', is_default: true },
      { code: 'weekly', label: 'Weekly', is_default: false }
    ];
    return { interest_options, frequency_options };
  }

  subscribeToNewsletter(email, name, interests, frequency, consent) {
    if (!email || !consent) {
      return { success: false, subscription_id: null, message: 'Email and consent are required.' };
    }
    let subs = this._getFromStorage('newsletter_subscriptions', []);
    if (!Array.isArray(subs)) subs = [];
    const existing = subs.find((s) => s.email === email);
    if (existing) {
      existing.name = name || existing.name || '';
      existing.interests = Array.isArray(interests) ? interests : existing.interests || [];
      existing.frequency = frequency || existing.frequency || 'monthly';
      existing.consent = !!consent;
      existing.updatedAt = this._nowISO();
      this._saveToStorage('newsletter_subscriptions', subs);
      return { success: true, subscription_id: existing.id, message: 'Subscription updated.' };
    }
    const id = this._generateId('nls');
    const sub = {
      id,
      email,
      name: name || '',
      interests: Array.isArray(interests) ? interests : [],
      frequency: frequency || 'monthly',
      consent: !!consent,
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };
    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);
    return { success: true, subscription_id: id, message: 'Subscription created.' };
  }

  // ====== 3. Session listing & detail ======

  getSessionFilterOptions() {
    const sessions = this._getFromStorage('sessions', []);
    const format_options = [
      { code: 'online', label: 'Online' },
      { code: 'remote', label: 'Remote' },
      { code: 'in_person', label: 'In Person' }
    ];
    const duration_options = this._unique(sessions.map((s) => s.duration_minutes)).filter((v) => typeof v === 'number');
    const rating_thresholds = [3, 4, 4.5, 5];
    const price_ranges = [
      { min: 0, max: 100, label: 'Under $100' },
      { min: 100, max: 200, label: '$100–$200' },
      { min: 200, max: 500, label: '$200–$500' }
    ];
    const time_of_day_presets = [
      { code: 'morning', label: 'Morning', start_time: '08:00', end_time: '12:00' },
      { code: 'afternoon', label: 'Afternoon', start_time: '12:00', end_time: '17:00' },
      { code: 'evening', label: 'Evening', start_time: '17:00', end_time: '21:00' }
    ];
    const sort_options = [
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_high_to_low', label: 'Price: High to Low' },
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'next_available_soonest', label: 'Next Available: Soonest' }
    ];
    return { format_options, duration_options, rating_thresholds, price_ranges, time_of_day_presets, sort_options };
  }

  listSessions(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || 'next_available_soonest';
    page = page || 1;
    page_size = page_size || 20;

    const sessions = this._getFromStorage('sessions', []).filter((s) => s.is_active !== false);
    const healers = this._getFromStorage('healers', []);

    let results = sessions.slice();

    if (Array.isArray(filters.formats) && filters.formats.length) {
      results = results.filter((s) => this._intersection(s.formats || [], filters.formats).length > 0);
    }

    if (typeof filters.duration_minutes === 'number') {
      results = results.filter((s) => s.duration_minutes === filters.duration_minutes);
    }
    if (typeof filters.min_duration_minutes === 'number') {
      results = results.filter((s) => s.duration_minutes >= filters.min_duration_minutes);
    }
    if (typeof filters.max_duration_minutes === 'number') {
      results = results.filter((s) => s.duration_minutes <= filters.max_duration_minutes);
    }

    if (typeof filters.min_rating === 'number') {
      results = results.filter((s) => (s.rating || 0) >= filters.min_rating);
    }

    if (typeof filters.min_price === 'number') {
      results = results.filter((s) => (s.base_price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      results = results.filter((s) => (s.base_price || 0) <= filters.max_price);
    }

    if (Array.isArray(filters.tags) && filters.tags.length) {
      results = results.filter((s) => this._intersection(s.tags || [], filters.tags).length > 0);
    }

    if (filters.healerId) {
      results = results.filter((s) => s.healerId === filters.healerId);
    }

    if (filters.date) {
      results = results.filter((s) => {
        const next = this._getSessionNextAvailable(s);
        if (!next) return false;
        return this._yyyyMmDd(this._parseISO(next)) === filters.date;
      });
    }
    if (filters.time_from || filters.time_to) {
      const timeFrom = filters.time_from;
      const timeTo = filters.time_to;
      results = results.filter((s) => {
        const next = this._getSessionNextAvailable(s);
        if (!next) return false;
        const t = this._timeFromDate(this._parseISO(next));
        if (timeFrom && this._compareTimeStrings(t, timeFrom) < 0) return false;
        if (timeTo && this._compareTimeStrings(t, timeTo) > 0) return false;
        return true;
      });
    }

    const withDerived = results.map((s) => {
      const healer = healers.find((h) => h.id === s.healerId) || null;
      const effective_price = this._getSessionEffectivePrice(s);
      const next_available_datetime = this._getSessionNextAvailable(s);
      return {
        id: s.id,
        title: s.title,
        subtitle: s.subtitle || '',
        healer_id: s.healerId || null,
        healerId: s.healerId || null,
        healer_name: healer ? healer.name : null,
        modalities: s.modalities || [],
        formats: s.formats || [],
        duration_minutes: s.duration_minutes,
        rating: typeof s.rating === 'number' ? s.rating : (healer ? healer.rating : null),
        rating_count: typeof s.rating_count === 'number' ? s.rating_count : (healer ? healer.review_count : null),
        base_price: s.base_price,
        effective_price,
        next_available_datetime: next_available_datetime || null,
        tags: s.tags || [],
        is_active: s.is_active !== false,
        healer // foreign key resolution
      };
    });

    if (sort_by === 'price_low_to_high') {
      withDerived.sort((a, b) => (a.effective_price || 0) - (b.effective_price || 0));
    } else if (sort_by === 'price_high_to_low') {
      withDerived.sort((a, b) => (b.effective_price || 0) - (a.effective_price || 0));
    } else if (sort_by === 'rating_high_to_low') {
      withDerived.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'next_available_soonest') {
      withDerived.sort((a, b) => {
        const da = a.next_available_datetime ? this._parseISO(a.next_available_datetime) : null;
        const db = b.next_available_datetime ? this._parseISO(b.next_available_datetime) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });
    }

    const total = withDerived.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const items = withDerived.slice(start, end);

    return { total, page, page_size, items };
  }

  getSessionDetail(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const healers = this._getFromStorage('healers', []);
    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return {
        session: null,
        healer: null,
        modalities_display: [],
        format_options: []
      };
    }
    const healer = healers.find((h) => h.id === session.healerId) || null;

    const modalityLabels = {
      soul_retrieval: 'Soul Retrieval',
      cord_cutting: 'Cord Cutting',
      shamanic_journeying: 'Shamanic Journeying',
      energy_healing: 'Energy Healing',
      trauma_healing: 'Trauma Healing',
      ancestral_healing: 'Ancestral Healing',
      inner_child_work: 'Inner Child Work',
      breathwork: 'Breathwork',
      sound_healing: 'Sound Healing',
      other: 'Other'
    };

    const modalities_display = (session.modalities || []).map((code) => ({
      code,
      label: modalityLabels[code] || code
    }));

    const sessionWithHealer = Object.assign({}, session, { healer });

    return {
      session: sessionWithHealer,
      healer: healer
        ? {
            id: healer.id,
            name: healer.name,
            photo_url: healer.photo_url || null,
            rating: healer.rating || null,
            review_count: healer.review_count || null
          }
        : null,
      modalities_display,
      format_options: session.formats || []
    };
  }

  getSessionAvailableTimeSlots(sessionId, date, time_from, time_to) {
    const sessions = this._getFromStorage('sessions', []);
    const slots = this._getFromStorage('session_time_slots', []);
    const healers = this._getFromStorage('healers', []);
    const session = sessions.find((s) => s.id === sessionId) || null;

    let result = slots.filter((slot) => slot.sessionId === sessionId && slot.status === 'available' && slot.remaining_spots > 0);

    if (date) {
      result = result.filter((slot) => this._yyyyMmDd(this._parseISO(slot.start_datetime)) === date);
    }

    if (time_from || time_to) {
      result = result.filter((slot) => {
        const t = this._timeFromDate(this._parseISO(slot.start_datetime));
        if (time_from && this._compareTimeStrings(t, time_from) < 0) return false;
        if (time_to && this._compareTimeStrings(t, time_to) > 0) return false;
        return true;
      });
    }

    result.sort((a, b) => this._parseISO(a.start_datetime) - this._parseISO(b.start_datetime));

    return result.map((slot) => {
      const healer = healers.find((h) => h.id === slot.healerId) || null;
      const effective_price = typeof slot.price_override === 'number' && slot.price_override > 0
        ? slot.price_override
        : (session ? session.base_price : null);
      return {
        id: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        status: slot.status,
        capacity: slot.capacity,
        remaining_spots: slot.remaining_spots,
        effective_price,
        display_start_time: this._formatTimeDisplay(this._parseISO(slot.start_datetime)),
        session: session || null,
        healer: healer
      };
    });
  }

  createSessionBooking(sessionId, timeSlotId, customer_name, customer_phone, customer_email) {
    if (!sessionId || !timeSlotId || !customer_name || !customer_phone || !customer_email) {
      return {
        booking_id: null,
        status: 'failed',
        sessionId,
        healerId: null,
        time_slot_id: timeSlotId,
        start_datetime: null,
        end_datetime: null,
        price: null,
        message: 'Missing required fields.'
      };
    }

    let sessions = this._getFromStorage('sessions', []);
    let slots = this._getFromStorage('session_time_slots', []);
    let bookings = this._getFromStorage('session_bookings', []);

    const session = sessions.find((s) => s.id === sessionId);
    const slot = slots.find((s) => s.id === timeSlotId && s.sessionId === sessionId);

    if (!session || !slot) {
      return {
        booking_id: null,
        status: 'failed',
        sessionId,
        healerId: null,
        time_slot_id: timeSlotId,
        start_datetime: null,
        end_datetime: null,
        price: null,
        message: 'Session or time slot not found.'
      };
    }

    if (slot.status !== 'available' || slot.remaining_spots <= 0) {
      return {
        booking_id: null,
        status: 'failed',
        sessionId,
        healerId: slot.healerId || session.healerId || null,
        time_slot_id: timeSlotId,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        price: null,
        message: 'Time slot is no longer available.'
      };
    }

    const price = typeof slot.price_override === 'number' && slot.price_override > 0
      ? slot.price_override
      : session.base_price;

    const bookingId = this._generateId('sbk');
    const startDate = this._parseISO(slot.start_datetime);
    const endDate = this._parseISO(slot.end_datetime);

    const booking = {
      id: bookingId,
      sessionId: session.id,
      healerId: slot.healerId || session.healerId,
      time_slot_id: slot.id,
      session_date: slot.start_datetime,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      duration_minutes: session.duration_minutes,
      price,
      customer_name,
      customer_phone,
      customer_email,
      status: 'confirmed',
      createdAt: this._nowISO()
    };

    bookings.push(booking);

    // Update slot availability
    slot.remaining_spots = Math.max(0, (slot.remaining_spots || 0) - 1);
    if (slot.remaining_spots === 0) {
      slot.status = 'booked';
    }

    this._saveToStorage('session_bookings', bookings);
    this._saveToStorage('session_time_slots', slots);

    return {
      booking_id: bookingId,
      status: booking.status,
      sessionId: booking.sessionId,
      healerId: booking.healerId,
      time_slot_id: booking.time_slot_id,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      price: booking.price,
      message: 'Session booked successfully.'
    };
  }

  addSessionToWishlist(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    let wishlist = this._getFromStorage('wishlist', []);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return { success: false, wishlist_item_id: null, total_items: wishlist.length, total_price: 0, message: 'Session not found.' };
    }
    const plan = this._ensureHealingPlanExists();

    const existing = wishlist.find((w) => w.item_type === 'session' && w.reference_id === sessionId && w.planId === plan.id);
    if (existing) {
      const updatedPlan = this._recalculateHealingPlanTotals(plan.id);
      return {
        success: true,
        wishlist_item_id: existing.id,
        total_items: wishlist.length,
        total_price: updatedPlan ? updatedPlan.total_price : 0,
        message: 'Session already in wishlist.'
      };
    }

    const id = this._generateId('wls');
    const item = {
      id,
      planId: plan.id,
      item_type: 'session',
      reference_id: session.id,
      name: session.title,
      format: (session.formats && session.formats[0]) || null,
      price: session.base_price || 0,
      addedAt: this._nowISO()
    };
    wishlist.push(item);
    this._saveToStorage('wishlist', wishlist);
    const updatedPlan = this._recalculateHealingPlanTotals(plan.id);
    return {
      success: true,
      wishlist_item_id: id,
      total_items: wishlist.length,
      total_price: updatedPlan ? updatedPlan.total_price : 0,
      message: 'Session added to wishlist.'
    };
  }

  // ====== 4. Packages listing & detail ======

  getPackageFilterOptions() {
    const packages = this._getFromStorage('packages', []).filter((p) => p.is_active !== false);
    const format_options = ['online', 'remote', 'in_person'];
    const session_count_options = this._unique(packages.map((p) => p.session_count)).filter((v) => typeof v === 'number');
    const focus_area_options = this._unique([].concat(...packages.map((p) => p.focus_areas || [])));
    const rating_thresholds = [3, 4, 4.5, 5];
    const price_ranges = [
      { min: 0, max: 200, label: 'Under $200' },
      { min: 200, max: 400, label: '$200–$400' },
      { min: 400, max: 800, label: 'Over $400' }
    ];
    const sort_options = [
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_high_to_low', label: 'Price: High to Low' }
    ];
    return { format_options, session_count_options, focus_area_options, rating_thresholds, price_ranges, sort_options };
  }

  listPackages(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || 'rating_high_to_low';
    page = page || 1;
    page_size = page_size || 20;

    let packages = this._getFromStorage('packages', []).filter((p) => p.is_active !== false);

    if (Array.isArray(filters.formats) && filters.formats.length) {
      packages = packages.filter((p) => this._intersection(p.formats || [], filters.formats).length > 0);
    }

    if (typeof filters.session_count === 'number') {
      packages = packages.filter((p) => p.session_count === filters.session_count);
    }

    if (Array.isArray(filters.focus_areas) && filters.focus_areas.length) {
      packages = packages.filter((p) => this._intersection(p.focus_areas || [], filters.focus_areas).length > 0);
    }

    if (filters.search_term) {
      const term = String(filters.search_term).toLowerCase();
      packages = packages.filter((p) => {
        const text = [p.name, p.subtitle, p.description, ...(p.focus_areas || []), ...(p.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.indexOf(term) !== -1;
      });
    }

    if (typeof filters.min_price === 'number') {
      packages = packages.filter((p) => (p.price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      packages = packages.filter((p) => (p.price || 0) <= filters.max_price);
    }

    if (typeof filters.min_rating === 'number') {
      packages = packages.filter((p) => (p.rating || 0) >= filters.min_rating);
    }

    if (Array.isArray(filters.tags) && filters.tags.length) {
      packages = packages.filter((p) => this._intersection(p.tags || [], filters.tags).length > 0);
    }

    if (sort_by === 'price_low_to_high') {
      packages.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      packages.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'rating_high_to_low') {
      packages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = packages.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const items = packages.slice(start, end).map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle || '',
      focus_areas: p.focus_areas || [],
      session_count: p.session_count,
      formats: p.formats || [],
      price: p.price,
      rating: p.rating || null,
      rating_count: p.rating_count || null,
      tags: p.tags || [],
      is_active: p.is_active !== false
    }));

    return { total, page, page_size, items };
  }

  getPackageDetail(packageId) {
    const packages = this._getFromStorage('packages', []);
    const sessions = this._getFromStorage('sessions', []);
    const pkgSessions = this._getFromStorage('package_sessions', []);
    const healers = this._getFromStorage('healers', []);

    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        included_sessions: [],
        focus_area_labels: [],
        review_summary: { rating: null, rating_count: 0 },
        recommended_packages: []
      };
    }

    let included_sessions = [];
    if (Array.isArray(pkg.included_session_ids) && pkg.included_session_ids.length) {
      included_sessions = pkg.included_session_ids
        .map((sid) => sessions.find((s) => s.id === sid))
        .filter(Boolean);
    } else {
      const mappings = pkgSessions
        .filter((ps) => ps.packageId === packageId)
        .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
      included_sessions = mappings
        .map((m) => sessions.find((s) => s.id === m.sessionId))
        .filter(Boolean);
    }

    const includedSessionsWithHealer = included_sessions.map((s) => {
      const healer = healers.find((h) => h.id === s.healerId) || null;
      return Object.assign({}, s, { healer });
    });

    const focus_area_labels = (pkg.focus_areas || []).slice();

    const review_summary = {
      rating: pkg.rating || null,
      rating_count: pkg.rating_count || 0
    };

    const recommended_packages = packages
      .filter((p) => p.id !== pkg.id && this._intersection(p.focus_areas || [], pkg.focus_areas || []).length > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3)
      .map((p) => ({ id: p.id, name: p.name, price: p.price }));

    return {
      package: pkg,
      included_sessions: includedSessionsWithHealer,
      focus_area_labels,
      review_summary,
      recommended_packages
    };
  }

  addPackageToCart(packageId, quantity) {
    quantity = quantity || 1;
    const packages = this._getFromStorage('packages', []);
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg || pkg.is_active === false) {
      return { success: false, cart_id: cart.id, cart_item_id: null, items_total: cart.items_total, message: 'Package not found.' };
    }

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.item_type === 'package' && ci.reference_id === packageId);
    if (item) {
      item.quantity += quantity;
      item.total_price = item.unit_price * item.quantity;
    } else {
      const cartItemId = this._generateId('ci');
      item = {
        id: cartItemId,
        cartId: cart.id,
        item_type: 'package',
        reference_id: pkg.id,
        name: pkg.name,
        quantity: quantity,
        unit_price: pkg.price || 0,
        total_price: (pkg.price || 0) * quantity,
        event_date: null,
        gift_card_amount: null,
        gift_card_recipient_name: null,
        gift_card_recipient_email: null,
        gift_card_message: null,
        gift_card_delivery_date: null,
        gift_card_delivery_method: null,
        meta: null
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: item.id,
      items_total: totals.items_total,
      message: 'Package added to cart.'
    };
  }

  addPackageToWishlist(packageId) {
    const packages = this._getFromStorage('packages', []);
    let wishlist = this._getFromStorage('wishlist', []);
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      return { success: false, wishlist_item_id: null, total_items: wishlist.length, total_price: 0, message: 'Package not found.' };
    }
    const plan = this._ensureHealingPlanExists();

    const existing = wishlist.find((w) => w.item_type === 'package' && w.reference_id === packageId && w.planId === plan.id);
    if (existing) {
      const updatedPlan = this._recalculateHealingPlanTotals(plan.id);
      return {
        success: true,
        wishlist_item_id: existing.id,
        total_items: wishlist.length,
        total_price: updatedPlan ? updatedPlan.total_price : 0,
        message: 'Package already in wishlist.'
      };
    }

    const id = this._generateId('wls');
    const item = {
      id,
      planId: plan.id,
      item_type: 'package',
      reference_id: pkg.id,
      name: pkg.name,
      format: (pkg.formats && pkg.formats[0]) || null,
      price: pkg.price || 0,
      addedAt: this._nowISO()
    };
    wishlist.push(item);
    this._saveToStorage('wishlist', wishlist);
    const updatedPlan = this._recalculateHealingPlanTotals(plan.id);
    return {
      success: true,
      wishlist_item_id: id,
      total_items: wishlist.length,
      total_price: updatedPlan ? updatedPlan.total_price : 0,
      message: 'Package added to wishlist.'
    };
  }

  // ====== 5. Events & group ceremonies ======

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []).filter((e) => e.is_active !== false);
    const day_codes = this._unique(events.map((e) => e.day_of_week || '')).filter(Boolean);
    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    const day_of_week_options = (day_codes.length ? day_codes : ['saturday', 'sunday']).map((code) => ({
      code,
      label: dayLabels[code] || code
    }));

    const price_ranges = [
      { min: 0, max: 40, label: 'Under $40' },
      { min: 40, max: 80, label: '$40–$80' },
      { min: 80, max: 150, label: '$80–$150' }
    ];

    const quick_date_ranges = [
      { code: 'next_7_days', label: 'Next 7 days', days_ahead: 7 },
      { code: 'next_30_days', label: 'Next 30 days', days_ahead: 30 }
    ];

    const sort_options = [
      { code: 'soonest_date', label: 'Soonest Date' },
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return { day_of_week_options, price_ranges, quick_date_ranges, sort_options };
  }

  listEvents(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || 'soonest_date';
    page = page || 1;
    page_size = page_size || 20;

    let events = this._getFromStorage('events', []).filter((e) => e.is_active !== false);

    const now = new Date();

    if (typeof filters.within_next_days === 'number') {
      const to = new Date(now.getTime() + filters.within_next_days * 24 * 60 * 60 * 1000);
      events = events.filter((e) => {
        const d = this._parseISO(e.start_datetime);
        return d && d >= now && d <= to;
      });
    }

    if (filters.date_from) {
      const fromDate = this._parseISO(filters.date_from + 'T00:00:00');
      events = events.filter((e) => {
        const d = this._parseISO(e.start_datetime);
        return d && d >= fromDate;
      });
    }

    if (filters.date_to) {
      const toDate = this._parseISO(filters.date_to + 'T23:59:59');
      events = events.filter((e) => {
        const d = this._parseISO(e.start_datetime);
        return d && d <= toDate;
      });
    }

    if (Array.isArray(filters.days_of_week) && filters.days_of_week.length) {
      events = events.filter((e) => filters.days_of_week.indexOf(e.day_of_week) !== -1);
    }

    if (typeof filters.min_price === 'number') {
      events = events.filter((e) => (e.base_ticket_price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      events = events.filter((e) => (e.base_ticket_price || 0) <= filters.max_price);
    }

    if (sort_by === 'price_low_to_high') {
      events.sort((a, b) => (a.base_ticket_price || 0) - (b.base_ticket_price || 0));
    } else if (sort_by === 'price_high_to_low') {
      events.sort((a, b) => (b.base_ticket_price || 0) - (a.base_ticket_price || 0));
    } else if (sort_by === 'soonest_date') {
      events.sort((a, b) => this._parseISO(a.start_datetime) - this._parseISO(b.start_datetime));
    }

    const total = events.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const items = events.slice(start, end).map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle || '',
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      day_of_week: e.day_of_week,
      format: e.format || null,
      location_description: e.location_description || null,
      base_ticket_price: e.base_ticket_price,
      min_price: typeof e.min_price === 'number' ? e.min_price : e.base_ticket_price,
      max_price: typeof e.max_price === 'number' ? e.max_price : e.base_ticket_price,
      capacity: e.capacity,
      remaining_seats: e.remaining_seats,
      is_active: e.is_active !== false
    }));

    return { total, page, page_size, items };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const healers = this._getFromStorage('healers', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { event: null, facilitator: null, price_tiers: [] };
    }

    const facilitator = healers.find((h) => h.id === event.facilitator_healer_id) || null;

    const price_tiers = [];
    if (typeof event.min_price === 'number' && typeof event.max_price === 'number' && event.min_price !== event.max_price) {
      price_tiers.push({ label: 'Sliding scale (low)', price: event.min_price });
      price_tiers.push({ label: 'Sliding scale (high)', price: event.max_price });
    } else {
      price_tiers.push({ label: 'Standard', price: event.base_ticket_price });
    }

    const eventWithFacilitator = Object.assign({}, event, { facilitator });

    return {
      event: eventWithFacilitator,
      facilitator: facilitator
        ? {
            id: facilitator.id,
            name: facilitator.name,
            photo_url: facilitator.photo_url || null,
            rating: facilitator.rating || null
          }
        : null,
      price_tiers
    };
  }

  addEventTicketsToCart(eventId, quantity) {
    quantity = quantity || 1;
    const events = this._getFromStorage('events', []);
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const event = events.find((e) => e.id === eventId);
    if (!event || event.is_active === false) {
      return { success: false, cart_id: cart.id, cart_item_id: null, items_total: cart.items_total, message: 'Event not found.' };
    }

    if (event.remaining_seats < quantity) {
      quantity = event.remaining_seats;
      if (quantity <= 0) {
        return { success: false, cart_id: cart.id, cart_item_id: null, items_total: cart.items_total, message: 'No seats remaining.' };
      }
    }

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.item_type === 'event_ticket' && ci.reference_id === eventId);
    if (item) {
      item.quantity += quantity;
      item.total_price = item.unit_price * item.quantity;
    } else {
      const cartItemId = this._generateId('ci');
      item = {
        id: cartItemId,
        cartId: cart.id,
        item_type: 'event_ticket',
        reference_id: event.id,
        name: event.title,
        quantity: quantity,
        unit_price: event.base_ticket_price || 0,
        total_price: (event.base_ticket_price || 0) * quantity,
        event_date: event.start_datetime,
        gift_card_amount: null,
        gift_card_recipient_name: null,
        gift_card_recipient_email: null,
        gift_card_message: null,
        gift_card_delivery_date: null,
        gift_card_delivery_method: null,
        meta: null
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: item.id,
      items_total: totals.items_total,
      message: 'Event tickets added to cart.'
    };
  }

  // ====== 6. Articles & reading list ======

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []).filter((a) => a.is_published !== false);
    const allDifficulty = this._unique(articles.map((a) => a.difficulty_level)).filter(Boolean);
    const difficulty_levels = allDifficulty.length ? allDifficulty : ['beginner', 'introduction', 'intermediate', 'advanced', 'all_levels'];
    const tag_options = this._unique([].concat(...articles.map((a) => a.tags || [])));
    const date_filter_options = [
      { code: 'last_12_months', label: 'Last 12 months', months_back: 12 },
      { code: 'all_time', label: 'All time', months_back: null }
    ];
    const sort_options = [
      { code: 'newest_first', label: 'Newest first' },
      { code: 'oldest_first', label: 'Oldest first' }
    ];
    return { difficulty_levels, tag_options, date_filter_options, sort_options };
  }

  listArticles(search_term, filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || 'newest_first';
    page = page || 1;
    page_size = page_size || 20;

    let articles = this._getFromStorage('articles', []).filter((a) => a.is_published !== false);
    const readingList = this._getFromStorage('reading_list', []);

    if (search_term) {
      const term = String(search_term).toLowerCase();
      articles = articles.filter((a) => {
        const text = [a.title, a.excerpt, a.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.indexOf(term) !== -1;
      });
    }

    if (Array.isArray(filters.difficulty_levels) && filters.difficulty_levels.length) {
      articles = articles.filter((a) => filters.difficulty_levels.indexOf(a.difficulty_level) !== -1);
    }

    if (Array.isArray(filters.tags) && filters.tags.length) {
      articles = articles.filter((a) => this._intersection(a.tags || [], filters.tags).length > 0);
    }

    if (filters.published_after) {
      const afterDate = this._parseISO(filters.published_after + 'T00:00:00');
      articles = articles.filter((a) => {
        const d = this._parseISO(a.publish_date);
        return d && d >= afterDate;
      });
    }

    if (sort_by === 'oldest_first') {
      articles.sort((a, b) => this._parseISO(a.publish_date) - this._parseISO(b.publish_date));
    } else {
      articles.sort((a, b) => this._parseISO(b.publish_date) - this._parseISO(a.publish_date));
    }

    const total = articles.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const items = articles.slice(start, end).map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt || '',
      publish_date: a.publish_date,
      difficulty_level: a.difficulty_level,
      tags: a.tags || [],
      is_saved: readingList.some((r) => r.articleId === a.id)
    }));

    return { total, page, page_size, items };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const readingList = this._getFromStorage('reading_list', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { article: null, is_saved: false, related_articles: [] };
    }
    const is_saved = readingList.some((r) => r.articleId === articleId);

    const related = articles
      .filter((a) => a.id !== articleId && this._intersection(a.tags || [], article.tags || []).length > 0)
      .sort((a, b) => this._parseISO(b.publish_date) - this._parseISO(a.publish_date))
      .slice(0, 3)
      .map((a) => ({ id: a.id, title: a.title }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_lastViewedArticleId', articleId);
    } catch (e) {
      console.error('Instrumentation error in getArticleDetail:', e);
    }

    return { article, is_saved, related_articles: related };
  }

  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      const list = this._getFromStorage('reading_list', []);
      return { success: false, reading_list_item_id: null, total_saved: list.length, message: 'Article not found.' };
    }
    let list = this._getFromStorage('reading_list', []);
    let existing = list.find((r) => r.articleId === articleId);
    if (existing) {
      return { success: true, reading_list_item_id: existing.id, total_saved: list.length, message: 'Article already saved.' };
    }
    const id = this._generateId('rli');
    const entry = {
      id,
      articleId,
      savedAt: this._nowISO()
    };
    list.push(entry);
    this._saveToStorage('reading_list', list);
    return { success: true, reading_list_item_id: id, total_saved: list.length, message: 'Article saved to reading list.' };
  }

  removeArticleFromReadingList(articleId) {
    let list = this._getFromStorage('reading_list', []);
    const before = list.length;
    list = list.filter((r) => r.articleId !== articleId);
    this._saveToStorage('reading_list', list);
    return { success: true, total_saved: list.length, message: before === list.length ? 'No entry removed.' : 'Article removed from reading list.' };
  }

  getReadingListItems() {
    const list = this._getFromStorage('reading_list', []);
    const articles = this._getFromStorage('articles', []);
    const items = list.map((entry) => {
      const article = articles.find((a) => a.id === entry.articleId) || null;
      return {
        reading_list_item_id: entry.id,
        article,
        savedAt: entry.savedAt
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_readingListOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error in getReadingListItems:', e);
    }

    return items;
  }

  // ====== 7. Healers & contact ======

  getHealerFilterOptions() {
    const healers = this._getFromStorage('healers', []).filter((h) => h.is_active !== false);
    const modalityCodes = this._unique([].concat(...healers.map((h) => h.modalities || [])));
    const modalityLabels = {
      soul_retrieval: 'Soul Retrieval',
      cord_cutting: 'Cord Cutting',
      shamanic_journeying: 'Shamanic Journeying',
      energy_healing: 'Energy Healing',
      trauma_healing: 'Trauma Healing',
      ancestral_healing: 'Ancestral Healing',
      inner_child_work: 'Inner Child Work',
      breathwork: 'Breathwork',
      sound_healing: 'Sound Healing',
      other: 'Other'
    };
    const modality_options = modalityCodes.map((code) => ({ code, label: modalityLabels[code] || code }));
    const format_options = ['online', 'remote', 'in_person'];
    const rating_thresholds = [3, 4, 4.5, 5];
    const review_count_thresholds = [1, 5, 10, 20];
    const sort_options = [
      { code: 'most_reviewed', label: 'Most Reviewed' },
      { code: 'highest_rated', label: 'Highest Rated' },
      { code: 'name_a_to_z', label: 'Name A–Z' }
    ];
    return { modality_options, format_options, rating_thresholds, review_count_thresholds, sort_options };
  }

  listHealers(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || 'most_reviewed';
    page = page || 1;
    page_size = page_size || 20;

    let healers = this._getFromStorage('healers', []).filter((h) => h.is_active !== false);

    if (Array.isArray(filters.modalities) && filters.modalities.length) {
      if (filters.require_all_modalities) {
        healers = healers.filter((h) => filters.modalities.every((m) => (h.modalities || []).indexOf(m) !== -1));
      } else {
        healers = healers.filter((h) => this._intersection(h.modalities || [], filters.modalities).length > 0);
      }
    }

    if (Array.isArray(filters.formats) && filters.formats.length) {
      healers = healers.filter((h) => this._intersection(h.formats || [], filters.formats).length > 0);
    }

    if (typeof filters.min_rating === 'number') {
      healers = healers.filter((h) => (h.rating || 0) >= filters.min_rating);
    }

    if (typeof filters.min_review_count === 'number') {
      healers = healers.filter((h) => (h.review_count || 0) >= filters.min_review_count);
    }

    if (sort_by === 'highest_rated') {
      healers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'name_a_to_z') {
      healers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort_by === 'most_reviewed') {
      healers.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    }

    const total = healers.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const items = healers.slice(start, end).map((h) => ({
      id: h.id,
      name: h.name,
      photo_url: h.photo_url || null,
      modalities: h.modalities || [],
      formats: h.formats || [],
      rating: h.rating || null,
      review_count: h.review_count || 0,
      price_range_min: h.price_range_min || null,
      price_range_max: h.price_range_max || null
    }));

    return { total, page, page_size, items };
  }

  getHealerDetail(healerId) {
    const healers = this._getFromStorage('healers', []);
    const healer = healers.find((h) => h.id === healerId) || null;
    if (!healer) {
      return { healer: null, services_display: [], bio_mentions_trauma: false };
    }

    const modalityLabels = {
      soul_retrieval: 'Soul Retrieval',
      cord_cutting: 'Cord Cutting',
      shamanic_journeying: 'Shamanic Journeying',
      energy_healing: 'Energy Healing',
      trauma_healing: 'Trauma Healing',
      ancestral_healing: 'Ancestral Healing',
      inner_child_work: 'Inner Child Work',
      breathwork: 'Breathwork',
      sound_healing: 'Sound Healing',
      other: 'Other'
    };

    const services_display = (healer.modalities || []).map((code) => ({
      code,
      label: modalityLabels[code] || code
    }));

    const bio_mentions_trauma = healer.bio ? /trauma/i.test(healer.bio) : false;

    return { healer, services_display, bio_mentions_trauma };
  }

  getHealerReviews(healerId, page, page_size) {
    page = page || 1;
    page_size = page_size || 20;
    const reviews = this._getFromStorage('healer_reviews', []).filter((r) => r.healerId === healerId);
    const healers = this._getFromStorage('healers', []);
    const healer = healers.find((h) => h.id === healerId) || null;

    reviews.sort((a, b) => this._parseISO(b.createdAt) - this._parseISO(a.createdAt));

    const total = reviews.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const items = reviews.slice(start, end).map((r) => Object.assign({}, r, { healer }));

    return { total, page, page_size, items };
  }

  sendHealerContactMessage(healerId, name, email, message, preferred_format, requested_session_length_minutes, requested_timeframe) {
    if (!healerId || !name || !email || !message) {
      return { success: false, message_id: null, healerId, confirmation_message: 'Missing required fields.' };
    }
    const healers = this._getFromStorage('healers', []);
    const healer = healers.find((h) => h.id === healerId);
    if (!healer) {
      return { success: false, message_id: null, healerId, confirmation_message: 'Healer not found.' };
    }
    let messages = this._getFromStorage('healer_contact_messages', []);
    const id = this._generateId('hmsg');
    const entry = {
      id,
      healerId,
      name,
      email,
      message,
      preferred_format: preferred_format || null,
      requested_session_length_minutes: requested_session_length_minutes || null,
      requested_timeframe: requested_timeframe || null,
      createdAt: this._nowISO()
    };
    messages.push(entry);
    this._saveToStorage('healer_contact_messages', messages);
    return { success: true, message_id: id, healerId, confirmation_message: 'Your message has been sent to the healer.' };
  }

  // ====== 8. Products & store ======

  getProductFilterOptions() {
    const products = this._getFromStorage('products', []).filter((p) => p.is_active !== false);
    const categoryCodes = this._unique(products.map((p) => p.category)).filter(Boolean);
    const categoryLabels = {
      meditations: 'Meditations',
      audio: 'Audio',
      gift_cards: 'Gift Cards',
      courses: 'Courses',
      bundles: 'Bundles',
      other: 'Other'
    };
    const category_options = (categoryCodes.length ? categoryCodes : ['meditations', 'audio', 'gift_cards']).map((code) => ({
      code,
      label: categoryLabels[code] || code
    }));

    const product_type_options = this._unique(products.map((p) => p.product_type)).filter(Boolean);
    const rating_thresholds = [3, 4, 4.5, 5];
    const duration_thresholds = [10, 20, 30, 45, 60];
    const price_ranges = [
      { min: 0, max: 25, label: 'Under $25' },
      { min: 25, max: 50, label: '$25–$50' },
      { min: 50, max: 100, label: '$50–$100' }
    ];
    const sort_options = [
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_high_to_low', label: 'Price: High to Low' },
      { code: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];
    return { category_options, product_type_options, rating_thresholds, duration_thresholds, price_ranges, sort_options };
  }

  listProducts(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || 'price_low_to_high';
    page = page || 1;
    page_size = page_size || 20;

    let products = this._getFromStorage('products', []).filter((p) => p.is_active !== false);

    if (Array.isArray(filters.categories) && filters.categories.length) {
      products = products.filter((p) => filters.categories.indexOf(p.category) !== -1);
    }

    if (Array.isArray(filters.product_types) && filters.product_types.length) {
      products = products.filter((p) => filters.product_types.indexOf(p.product_type) !== -1);
    }

    if (typeof filters.min_price === 'number') {
      products = products.filter((p) => (p.price || p.min_amount || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      products = products.filter((p) => (p.price || p.min_amount || 0) <= filters.max_price);
    }

    if (typeof filters.min_rating === 'number') {
      products = products.filter((p) => (p.rating || 0) >= filters.min_rating);
    }

    if (typeof filters.min_duration_minutes === 'number') {
      products = products.filter((p) => (p.duration_minutes || 0) >= filters.min_duration_minutes);
    }

    if (Array.isArray(filters.tags) && filters.tags.length) {
      products = products.filter((p) => this._intersection(p.tags || [], filters.tags).length > 0);
    }

    if (filters.search_term) {
      const term = String(filters.search_term).toLowerCase();
      products = products.filter((p) => {
        const text = [p.name, p.subtitle, p.description, ...(p.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.indexOf(term) !== -1;
      });
    }

    if (sort_by === 'price_low_to_high') {
      products.sort((a, b) => ((a.price || a.min_amount || 0) - (b.price || b.min_amount || 0)));
    } else if (sort_by === 'price_high_to_low') {
      products.sort((a, b) => ((b.price || b.min_amount || 0) - (a.price || a.min_amount || 0)));
    } else if (sort_by === 'rating_high_to_low') {
      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const items = products.slice(start, end).map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle || '',
      category: p.category,
      product_type: p.product_type,
      price: p.price || null,
      min_amount: p.min_amount || null,
      max_amount: p.max_amount || null,
      rating: p.rating || null,
      rating_count: p.rating_count || null,
      duration_minutes: p.duration_minutes || null,
      tags: p.tags || [],
      is_active: p.is_active !== false
    }));

    return { total, page, page_size, items };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    return products.find((p) => p.id === productId) || null;
  }

  addProductToCart(productId, quantity) {
    quantity = quantity || 1;
    const products = this._getFromStorage('products', []);
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();
    const product = products.find((p) => p.id === productId);
    if (!product || product.is_active === false) {
      return { success: false, cart_id: cart.id, cart_item_id: null, items_total: cart.items_total, message: 'Product not found.' };
    }

    const item_type = product.product_type === 'gift_card' ? 'gift_card' : 'digital_product';

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.item_type === item_type && ci.reference_id === productId);
    if (item) {
      item.quantity += quantity;
      item.total_price = item.unit_price * item.quantity;
    } else {
      const cartItemId = this._generateId('ci');
      const unit_price = product.price || product.min_amount || 0;
      item = {
        id: cartItemId,
        cartId: cart.id,
        item_type,
        reference_id: product.id,
        name: product.name,
        quantity: quantity,
        unit_price,
        total_price: unit_price * quantity,
        event_date: null,
        gift_card_amount: null,
        gift_card_recipient_name: null,
        gift_card_recipient_email: null,
        gift_card_message: null,
        gift_card_delivery_date: null,
        gift_card_delivery_method: null,
        meta: null
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: item.id,
      items_total: totals.items_total,
      message: 'Product added to cart.'
    };
  }

  addGiftCardToCart(productId, amount, recipient_name, recipient_email, message, delivery_method, delivery_date) {
    const products = this._getFromStorage('products', []);
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const product = products.find((p) => p.id === productId && p.product_type === 'gift_card');
    if (!product || product.is_active === false) {
      return { success: false, cart_id: cart.id, cart_item_id: null, items_total: cart.items_total, message: 'Gift card product not found.' };
    }

    const validation = this._validateGiftCardAmount(product, amount);
    if (!validation.valid) {
      return { success: false, cart_id: cart.id, cart_item_id: null, items_total: cart.items_total, message: validation.message };
    }

    const cartItemId = this._generateId('ci');
    const unit_price = amount;
    const item = {
      id: cartItemId,
      cartId: cart.id,
      item_type: 'gift_card',
      reference_id: product.id,
      name: product.name,
      quantity: 1,
      unit_price,
      total_price: unit_price,
      event_date: null,
      gift_card_amount: amount,
      gift_card_recipient_name: recipient_name || '',
      gift_card_recipient_email: recipient_email || '',
      gift_card_message: message || '',
      gift_card_delivery_date: delivery_date ? this._parseISO(delivery_date + 'T00:00:00').toISOString() : null,
      gift_card_delivery_method: delivery_method || 'email',
      meta: null
    };
    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: item.id,
      items_total: totals.items_total,
      message: 'Gift card added to cart.'
    };
  }

  getCartSummary() {
    const cart = this._getCurrentCart() || this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const packages = this._getFromStorage('packages', []);
    const events = this._getFromStorage('events', []);

    const items = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => {
        let product = null;
        let pkg = null;
        let event = null;
        if (ci.item_type === 'digital_product' || ci.item_type === 'gift_card') {
          product = products.find((p) => p.id === ci.reference_id) || null;
        } else if (ci.item_type === 'package') {
          pkg = packages.find((p) => p.id === ci.reference_id) || null;
        } else if (ci.item_type === 'event_ticket') {
          event = events.find((e) => e.id === ci.reference_id) || null;
        }
        return {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          reference_id: ci.reference_id,
          name: ci.name,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          total_price: ci.total_price,
          event_date: ci.event_date,
          gift_card_amount: ci.gift_card_amount,
          gift_card_recipient_name: ci.gift_card_recipient_name,
          gift_card_recipient_email: ci.gift_card_recipient_email,
          gift_card_message: ci.gift_card_message,
          product,
          package: pkg,
          event
        };
      });

    return {
      cart_id: cart.id,
      items,
      items_total: cart.items_total,
      tax_total: cart.tax_total,
      grand_total: cart.grand_total
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity) || 0;
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();
    const item = cartItems.find((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (!item) {
      return { success: false, items_total: cart.items_total, grand_total: cart.grand_total, message: 'Cart item not found.' };
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    } else {
      item.quantity = quantity;
      item.total_price = item.unit_price * item.quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return { success: true, items_total: totals.items_total, grand_total: totals.grand_total, message: 'Cart updated.' };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();
    const before = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId || ci.cartId !== cart.id);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();
    return {
      success: true,
      items_total: totals.items_total,
      grand_total: totals.grand_total,
      message: before === cartItems.length ? 'No item removed.' : 'Cart item removed.'
    };
  }

  getCheckoutSummary() {
    const cart = this._getCurrentCart() || this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const items = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => ({
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        item_type: ci.item_type,
        reference_id: ci.reference_id
      }));

    // Instrumentation for task completion tracking
    try {
      const firstPackageItem = items.find((ci) => ci.item_type === 'package');
      if (firstPackageItem) {
        localStorage.setItem('task2_checkoutPackageId', firstPackageItem.reference_id);
      }

      const firstEventItem = items.find((ci) => ci.item_type === 'event_ticket');
      if (firstEventItem) {
        localStorage.setItem('task3_checkoutEventId', firstEventItem.reference_id);
      }

      const firstProductItem = items.find((ci) => ci.item_type === 'digital_product');
      if (firstProductItem) {
        localStorage.setItem('task6_checkoutProductId', firstProductItem.reference_id);
      }
    } catch (e) {
      console.error('Instrumentation error in getCheckoutSummary:', e);
    }

    return {
      cart_id: cart.id,
      items,
      items_total: cart.items_total,
      tax_total: cart.tax_total,
      grand_total: cart.grand_total
    };
  }

  completeCheckout(customer_name, customer_email, customer_phone, billing_address, payment_method, payment_details, notes) {
    if (!customer_name || !customer_email || !payment_method) {
      return { success: false, order: null, order_items: [], message: 'Missing required checkout fields.' };
    }
    const cart = this._getCurrentCart() || this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    if (!itemsForCart.length) {
      return { success: false, order: null, order_items: [], message: 'Cart is empty.' };
    }

    const totals = this._recalculateCartTotals();

    let orders = this._getFromStorage('orders', []);
    let orderItems = this._getFromStorage('order_items', []);
    let registrations = this._getFromStorage('event_registrations', []);
    let events = this._getFromStorage('events', []);

    const orderId = this._generateId('ord');
    const order_number = this._generateOrderNumber();

    const order = {
      id: orderId,
      order_number,
      createdAt: this._nowISO(),
      updatedAt: this._nowISO(),
      items_total: totals.items_total,
      tax_total: totals.tax_total,
      grand_total: totals.grand_total,
      status: 'paid',
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      billing_address: billing_address || null,
      payment_method,
      payment_status: 'paid',
      notes: notes || null
    };

    orders.push(order);

    const newOrderItems = itemsForCart.map((ci) => {
      const itemId = this._generateId('oi');
      const metaObj = {
        event_date: ci.event_date || null,
        gift_card_amount: ci.gift_card_amount || null,
        gift_card_recipient_name: ci.gift_card_recipient_name || null,
        gift_card_recipient_email: ci.gift_card_recipient_email || null,
        gift_card_message: ci.gift_card_message || null,
        gift_card_delivery_date: ci.gift_card_delivery_date || null,
        gift_card_delivery_method: ci.gift_card_delivery_method || null,
        payment_details: payment_details || null
      };
      const oi = {
        id: itemId,
        orderId: orderId,
        item_type: ci.item_type,
        reference_id: ci.reference_id,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        meta: JSON.stringify(metaObj)
      };
      return oi;
    });

    orderItems = orderItems.concat(newOrderItems);

    // Create EventRegistration for event tickets & update remaining_seats
    for (const oi of newOrderItems) {
      if (oi.item_type === 'event_ticket') {
        const event = events.find((e) => e.id === oi.reference_id);
        if (event) {
          const regId = this._generateId('ereg');
          const registration = {
            id: regId,
            eventId: event.id,
            orderId: orderId,
            quantity: oi.quantity,
            purchaser_name: customer_name,
            purchaser_email: customer_email,
            purchaser_phone: customer_phone || null,
            status: 'reserved',
            reservedAt: this._nowISO()
          };
          registrations.push(registration);
          event.remaining_seats = Math.max(0, (event.remaining_seats || 0) - oi.quantity);
        }
      }
    }

    // Save back all updated collections
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('events', events);

    // Clear cart items for this cart
    cartItems = cartItems.filter((ci) => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', cartItems);

    // Reset cart totals
    cart.items_total = 0;
    cart.tax_total = 0;
    cart.grand_total = 0;
    cart.updatedAt = this._nowISO();
    this._saveToStorage('cart', cart);

    return {
      success: true,
      order,
      order_items: newOrderItems,
      message: 'Checkout completed and order created.'
    };
  }

  // ====== 9. Wishlist / healing plan ======

  getWishlistItems() {
    const wishlist = this._getFromStorage('wishlist', []);
    const sessions = this._getFromStorage('sessions', []);
    const packages = this._getFromStorage('packages', []);
    const plans = this._getFromStorage('healing_plans', []);

    const plan = plans.find((p) => !p.is_finalized) || plans[0] || null;

    const items = wishlist.map((w) => {
      let session = null;
      let pkg = null;
      if (w.item_type === 'session') {
        session = sessions.find((s) => s.id === w.reference_id) || null;
      } else if (w.item_type === 'package') {
        pkg = packages.find((p) => p.id === w.reference_id) || null;
      }
      return {
        wishlist_item_id: w.id,
        item_type: w.item_type,
        reference_id: w.reference_id,
        name: w.name,
        format: w.format || null,
        price: w.price || 0,
        session,
        package: pkg
      };
    });

    const total_items = items.length;
    const total_price = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

    const healing_plan = plan
      ? {
          id: plan.id,
          title: plan.title,
          is_finalized: !!plan.is_finalized
        }
      : null;

    return { items, total_items, total_price, healing_plan };
  }

  removeWishlistItem(wishlistItemId) {
    let wishlist = this._getFromStorage('wishlist', []);
    let plans = this._getFromStorage('healing_plans', []);
    const item = wishlist.find((w) => w.id === wishlistItemId);
    if (!item) {
      const total_items = wishlist.length;
      const total_price = wishlist.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
      return { success: false, total_items, total_price, message: 'Wishlist item not found.' };
    }
    wishlist = wishlist.filter((w) => w.id !== wishlistItemId);
    this._saveToStorage('wishlist', wishlist);

    if (item.planId) {
      const plan = plans.find((p) => p.id === item.planId);
      if (plan) {
        plan.item_ids = (plan.item_ids || []).filter((id) => id !== item.id);
        plan.total_price = (plan.total_price || 0) - (Number(item.price) || 0);
        plan.updatedAt = this._nowISO();
        this._saveToStorage('healing_plans', plans);
      }
    }

    const total_items = wishlist.length;
    const total_price = wishlist.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
    return { success: true, total_items, total_price, message: 'Wishlist item removed.' };
  }

  finalizeHealingPlan(title, description) {
    const plan = this._ensureHealingPlanExists();
    let plans = this._getFromStorage('healing_plans', []);
    const wishlist = this._getFromStorage('wishlist', []);
    const itemsForPlan = wishlist.filter((w) => w.planId === plan.id);

    plan.title = title || plan.title || 'My Healing Plan';
    plan.description = description || plan.description || '';
    plan.item_ids = itemsForPlan.map((i) => i.id);
    plan.total_price = itemsForPlan.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
    plan.is_finalized = true;
    plan.finalizedAt = this._nowISO();
    plan.updatedAt = this._nowISO();

    plans = plans.map((p) => (p.id === plan.id ? plan : p));
    this._saveToStorage('healing_plans', plans);

    return { healing_plan: plan, message: 'Healing plan finalized.' };
  }

  // ====== 10. About, policies, general contact ======

  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', null);
    return (
      content || {
        practitioner_bio_html: '',
        approach_html: '',
        ethics_and_safety_html: ''
      }
    );
  }

  getPoliciesContent() {
    const content = this._getFromStorage('policies_content', null);
    return (
      content || {
        privacy_policy_html: '',
        terms_of_use_html: '',
        refund_and_cancellation_policy_html: ''
      }
    );
  }

  sendGeneralContactMessage(name, email, topic, message) {
    if (!name || !email || !message) {
      return { success: false, message_id: null, confirmation_message: 'Missing required fields.' };
    }
    let messages = this._getFromStorage('general_contact_messages', []);
    const id = this._generateId('gmsg');
    const entry = {
      id,
      name,
      email,
      topic: topic || null,
      message,
      createdAt: this._nowISO()
    };
    messages.push(entry);
    this._saveToStorage('general_contact_messages', messages);
    return { success: true, message_id: id, confirmation_message: 'Your message has been sent.' };
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