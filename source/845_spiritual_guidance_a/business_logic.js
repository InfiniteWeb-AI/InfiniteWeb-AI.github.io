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
    // Initialize array-based entity tables
    const arrayKeys = [
      'meditation_audio_products',
      'carts',
      'cart_items',
      'coaches',
      'coach_intro_options',
      'sessions',
      'bookings',
      'courses',
      'course_access_levels',
      'course_enrollments',
      'self_care_schedules',
      'self_care_events',
      'ritual_suggestions',
      'rituals',
      'ritual_steps',
      'blog_articles',
      'bookmarks',
      'programs',
      'program_goal_options',
      'program_intake_submissions',
      'program_intake_selected_goals',
      'membership_plans',
      'membership_subscriptions',
      'session_search_filters',
      'contact_tickets'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Object-based config tables
    if (!localStorage.getItem('about_page_content')) {
      const aboutDefault = {
        mission: '',
        values: [],
        philosophy: '',
        ethical_guidelines: '',
        featured_coach_ids: [] // will be resolved to Coach objects
      };
      localStorage.setItem('about_page_content', JSON.stringify(aboutDefault));
    }

    if (!localStorage.getItem('contact_info')) {
      const contactDefault = {
        email: '',
        phone: '',
        timezone: '',
        office_hours: '',
        inquiry_types: [
          { value: 'sessions', label: 'Sessions' },
          { value: 'courses', label: 'Courses' },
          { value: 'memberships', label: 'Memberships' },
          { value: 'technical_support', label: 'Technical support' },
          { value: 'other', label: 'Other' }
        ]
      };
      localStorage.setItem('contact_info', JSON.stringify(contactDefault));
    }

    // Generic id counter
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  // =============================
  // Internal helpers
  // =============================

  // Cart helpers
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    if (carts.length > 0) {
      return carts[0];
    }
    const now = this._nowISO();
    const cart = {
      id: this._generateId('cart'),
      created_at: now,
      updated_at: now
    };
    carts.push(cart);
    this._saveToStorage('carts', carts);
    return cart;
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cartId; });

    let subtotal = 0;
    let itemCount = 0;
    let currency = 'usd';

    for (let i = 0; i < itemsForCart.length; i++) {
      subtotal += itemsForCart[i].line_total;
      itemCount += itemsForCart[i].quantity;
      if (itemsForCart[i].currency) {
        currency = itemsForCart[i].currency;
      }
    }

    const tax = 0;
    const total = subtotal + tax;

    return {
      subtotal: subtotal,
      tax: tax,
      total: total,
      cart_item_count: itemCount,
      currency: currency
    };
  }

  // Session search filter state helper
  _persistSessionSearchFilterState(payload) {
    let states = this._getFromStorage('session_search_filters');
    let state = states.find(function (s) { return s.mode === 'find_session'; });
    const now = this._nowISO();

    if (!state) {
      state = {
        id: this._generateId('session_filter'),
        mode: 'find_session',
        selected_session_type: null,
        selected_duration_minutes: null,
        selected_date: null,
        time_of_day: null,
        max_price: null,
        sort_order: null,
        created_at: now
      };
      states.push(state);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'selectedSessionType')) {
      state.selected_session_type = payload.selectedSessionType || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'selectedDurationMinutes')) {
      state.selected_duration_minutes = payload.selectedDurationMinutes || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'selectedDate')) {
      state.selected_date = payload.selectedDate || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'timeOfDay')) {
      state.time_of_day = payload.timeOfDay || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'maxPrice')) {
      state.max_price = typeof payload.maxPrice === 'number' ? payload.maxPrice : null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'sortOrder')) {
      state.sort_order = payload.sortOrder || null;
    }

    this._saveToStorage('session_search_filters', states);
    return state;
  }

  // Course date preset helper
  _resolveStartDatePresetRange(preset) {
    if (!preset) return null;

    const now = new Date();

    if (preset === 'starting_next_month') {
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth(); // 0-based
      const nextMonth = (month + 1) % 12;
      const yearForNextMonth = month === 11 ? year + 1 : year;

      const startMin = new Date(Date.UTC(yearForNextMonth, nextMonth, 1, 0, 0, 0));
      const startMax = new Date(Date.UTC(yearForNextMonth, nextMonth + 1, 0, 23, 59, 59));

      return { startMin: startMin, startMax: startMax };
    }

    return null;
  }

  // Intake labels to enums helper (not strictly needed by interfaces but provided)
  _mapIntakeLabelsToEnums(label, type) {
    if (!label || !type) return null;

    if (type === 'timeframe') {
      const map = {
        'Less than 1 month': 'less_than_one_month',
        '1–3 months': 'one_to_three_months',
        '1-3 months': 'one_to_three_months',
        '3–6 months': 'three_to_six_months',
        '3-6 months': 'three_to_six_months',
        'More than 6 months': 'more_than_six_months'
      };
      return map[label] || null;
    }

    if (type === 'monthly_budget') {
      const map = {
        'Under $200': 'under_200',
        '$200–$400': 'two_hundred_to_four_hundred',
        '$200-$400': 'two_hundred_to_four_hundred',
        'Over $400': 'over_400'
      };
      return map[label] || null;
    }

    return null;
  }

  // Ritual helpers
  _generateNextRitualStepOrderIndex(ritualId) {
    const steps = this._getFromStorage('ritual_steps');
    const forRitual = steps.filter(function (s) { return s.ritual_id === ritualId; });
    if (forRitual.length === 0) return 1;
    let maxIndex = 0;
    for (let i = 0; i < forRitual.length; i++) {
      if (typeof forRitual[i].order_index === 'number' && forRitual[i].order_index > maxIndex) {
        maxIndex = forRitual[i].order_index;
      }
    }
    return maxIndex + 1;
  }

  // Homepage featured entities helper
  _selectFeaturedHomepageEntities() {
    const courses = this._getFromStorage('courses');
    const programs = this._getFromStorage('programs');
    const plans = this._getFromStorage('membership_plans');

    let featuredCourse = null;
    let featuredProgram = null;
    let featuredPlan = null;

    // Course: next upcoming published course
    const publishedCourses = courses.filter(function (c) { return c.status === 'published'; });
    publishedCourses.sort(function (a, b) {
      const aTime = new Date(a.start_date).getTime();
      const bTime = new Date(b.start_date).getTime();
      return aTime - bTime;
    });
    if (publishedCourses.length > 0) {
      featuredCourse = publishedCourses[0];
    }

    // Program: first active
    const activePrograms = programs.filter(function (p) { return p.status === 'active'; });
    if (activePrograms.length > 0) {
      featuredProgram = activePrograms[0];
    }

    // Membership plan: cheapest active
    const activePlans = plans.filter(function (p) { return p.status === 'active'; });
    activePlans.sort(function (a, b) { return a.monthly_price - b.monthly_price; });
    if (activePlans.length > 0) {
      featuredPlan = activePlans[0];
    }

    return {
      featured_course: featuredCourse,
      featured_program: featuredProgram,
      featured_membership_plan: featuredPlan
    };
  }

  // Utility: sort helpers
  _compareNumbersAsc(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a - b;
  }

  _compareNumbersDesc(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return b - a;
  }

  // =============================
  // Interface implementations
  // =============================

  // getHomepageHighlights(recentArticlesLimit?)
  getHomepageHighlights(recentArticlesLimit) {
    const limit = typeof recentArticlesLimit === 'number' ? recentArticlesLimit : 3;

    const articles = this._getFromStorage('blog_articles');
    const recentPublished = articles
      .filter(function (a) { return a.status === 'published'; })
      .sort(function (a, b) {
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      })
      .slice(0, limit);

    const featured = this._selectFeaturedHomepageEntities();

    return {
      featured_course: featured.featured_course,
      featured_program: featured.featured_program,
      featured_membership_plan: featured.featured_membership_plan,
      recent_articles: recentPublished
    };
  }

  // getSessionFilterOptions()
  getSessionFilterOptions() {
    const sessions = this._getFromStorage('sessions');

    // Session types
    const typeMap = {
      one_to_one_energy_coaching: '1:1 Energy Coaching',
      energy_healing: 'Energy Healing',
      spiritual_guidance: 'Spiritual Guidance',
      group_session: 'Group Session'
    };
    const typeSet = {};
    for (let i = 0; i < sessions.length; i++) {
      typeSet[sessions[i].session_type] = true;
    }
    const session_types = Object.keys(typeSet).map(function (value) {
      return { value: value, label: typeMap[value] || value };
    });

    // Duration options from existing sessions
    const durationSet = {};
    for (let j = 0; j < sessions.length; j++) {
      durationSet[sessions[j].duration_minutes] = true;
    }
    const duration_options = Object.keys(durationSet).map(function (mStr) {
      const minutes = parseInt(mStr, 10);
      return { minutes: minutes, label: minutes + ' minutes' };
    }).sort(function (a, b) { return a.minutes - b.minutes; });

    // Time of day options (static labels, dynamic presence)
    const timeOfDayLabelMap = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening (6pm	1pm)',
      night: 'Night'
    };
    const todSet = {};
    for (let k = 0; k < sessions.length; k++) {
      todSet[sessions[k].time_of_day] = true;
    }
    const time_of_day_options = Object.keys(todSet).map(function (value) {
      return { value: value, label: timeOfDayLabelMap[value] || value };
    });

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' }
    ];

    let minPrice = null;
    let maxPrice = null;
    for (let s = 0; s < sessions.length; s++) {
      const p = sessions[s].price;
      if (typeof p === 'number') {
        if (minPrice == null || p < minPrice) minPrice = p;
        if (maxPrice == null || p > maxPrice) maxPrice = p;
      }
    }

    const price_range = {
      min_price: minPrice != null ? minPrice : 0,
      max_price_default: maxPrice != null ? maxPrice : 0,
      max_price_hard_limit: maxPrice != null ? maxPrice : 0,
      currency: 'usd'
    };

    return {
      session_types: session_types,
      duration_options: duration_options,
      time_of_day_options: time_of_day_options,
      sort_options: sort_options,
      price_range: price_range
    };
  }

  // searchSessions(sessionType?, durationMinutes?, date?, timeOfDay?, maxPrice?, minRating?, sortOrder?)
  searchSessions(sessionType, durationMinutes, date, timeOfDay, maxPrice, minRating, sortOrder) {
    const sessions = this._getFromStorage('sessions');
    const coaches = this._getFromStorage('coaches');

    let results = sessions.filter(function (s) { return s.is_bookable === true; });

    if (sessionType) {
      results = results.filter(function (s) { return s.session_type === sessionType; });
    }

    if (typeof durationMinutes === 'number') {
      results = results.filter(function (s) { return s.duration_minutes === durationMinutes; });
    }

    if (date) {
      results = results.filter(function (s) {
        const d = new Date(s.start_datetime);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const day = d.getUTCDate();
        const formatted = year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day);
        return formatted === date;
      });
    }

    if (timeOfDay) {
      results = results.filter(function (s) { return s.time_of_day === timeOfDay; });
    }

    if (typeof maxPrice === 'number') {
      results = results.filter(function (s) { return s.price <= maxPrice; });
    }

    // Enrich with coach before rating filter
    const enriched = [];
    for (let i = 0; i < results.length; i++) {
      const session = results[i];
      const coach = coaches.find(function (c) { return c.id === session.coach_id; }) || null;
      // Only include sessions that have a matching coach record so booking details can resolve both
      if (!coach) {
        continue;
      }
      const effectiveRating = session.rating != null ? session.rating : (coach && coach.rating != null ? coach.rating : null);
      enriched.push({
        session: session,
        coach: coach,
        effectiveRating: effectiveRating
      });
    }

    if (typeof minRating === 'number') {
      for (let r = enriched.length - 1; r >= 0; r--) {
        const item = enriched[r];
        if (item.effectiveRating == null || item.effectiveRating < minRating) {
          enriched.splice(r, 1);
        }
      }
    }

    if (sortOrder === 'price_low_to_high') {
      enriched.sort((a, b) => this._compareNumbersAsc(a.session.price, b.session.price));
    } else if (sortOrder === 'price_high_to_low') {
      enriched.sort((a, b) => this._compareNumbersDesc(a.session.price, b.session.price));
    } else if (sortOrder === 'rating_high_to_low') {
      enriched.sort((a, b) => this._compareNumbersDesc(a.effectiveRating, b.effectiveRating));
    } else if (sortOrder === 'rating_low_to_high') {
      enriched.sort((a, b) => this._compareNumbersAsc(a.effectiveRating, b.effectiveRating));
    }

    const mapped = enriched.map(function (item) {
      const s = item.session;
      const coach = item.coach;
      return {
        session_id: s.id,
        title: s.title,
        description: s.description,
        coach_id: s.coach_id,
        coach_name: coach ? coach.name : null,
        coach_rating: coach && typeof coach.rating === 'number' ? coach.rating : null,
        coach_review_count: coach && typeof coach.review_count === 'number' ? coach.review_count : 0,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        duration_minutes: s.duration_minutes,
        price: s.price,
        currency: s.currency,
        format: s.format,
        time_of_day: s.time_of_day,
        rating: s.rating != null ? s.rating : item.effectiveRating,
        review_count: s.review_count != null ? s.review_count : (coach && coach.review_count != null ? coach.review_count : 0),
        is_bookable: s.is_bookable,
        // Foreign key resolution helper
        coach: coach || null
      };
    });

    return mapped;
  }

  // getSessionSearchFilterState()
  getSessionSearchFilterState() {
    const states = this._getFromStorage('session_search_filters');
    let state = states.find(function (s) { return s.mode === 'find_session'; });
    if (!state) {
      // create a default (but still persisted) state
      state = this._persistSessionSearchFilterState({});
    }
    return state;
  }

  // saveSessionSearchFilterState(selectedSessionType?, selectedDurationMinutes?, selectedDate?, timeOfDay?, maxPrice?, sortOrder?)
  saveSessionSearchFilterState(selectedSessionType, selectedDurationMinutes, selectedDate, timeOfDay, maxPrice, sortOrder) {
    const payload = {
      selectedSessionType: selectedSessionType,
      selectedDurationMinutes: selectedDurationMinutes,
      selectedDate: selectedDate,
      timeOfDay: timeOfDay,
      maxPrice: maxPrice,
      sortOrder: sortOrder
    };
    const state = this._persistSessionSearchFilterState(payload);
    return state;
  }

  // getSessionBookingDetails(sessionId)
  getSessionBookingDetails(sessionId) {
    const sessions = this._getFromStorage('sessions');
    const coaches = this._getFromStorage('coaches');

    const session = sessions.find(function (s) { return s.id === sessionId; }) || null;
    let coach = null;
    if (session) {
      coach = coaches.find(function (c) { return c.id === session.coach_id; }) || null;
    }

    return {
      session: session,
      coach: coach
    };
  }

  // createSessionBooking(sessionId, clientName, clientEmail, contactPreference)
  createSessionBooking(sessionId, clientName, clientEmail, contactPreference) {
    const sessions = this._getFromStorage('sessions');
    const bookings = this._getFromStorage('bookings');

    const session = sessions.find(function (s) { return s.id === sessionId; });
    if (!session) {
      return { success: false, booking: null, message: 'Session not found' };
    }

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'session',
      session_id: session.id,
      coach_id: session.coach_id,
      intro_option_id: null,
      client_name: clientName,
      client_email: clientEmail,
      contact_preference: contactPreference,
      scheduled_start: session.start_datetime,
      scheduled_end: session.end_datetime,
      duration_minutes: session.duration_minutes,
      price: session.price,
      currency: session.currency,
      status: 'confirmed',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return { success: true, booking: booking, message: 'Booking created' };
  }

  // getCoachIntroBookingOptions(coachId)
  getCoachIntroBookingOptions(coachId) {
    const coaches = this._getFromStorage('coaches');
    const options = this._getFromStorage('coach_intro_options');

    const coach = coaches.find(function (c) { return c.id === coachId; }) || null;
    const intro_options = options.filter(function (o) { return o.coach_id === coachId; });

    return {
      coach: coach,
      intro_options: intro_options
    };
  }

  // createCoachIntroBooking(coachId, introOptionId, clientName, clientEmail, contactPreference)
  createCoachIntroBooking(coachId, introOptionId, clientName, clientEmail, contactPreference) {
    const coaches = this._getFromStorage('coaches');
    const options = this._getFromStorage('coach_intro_options');
    const bookings = this._getFromStorage('bookings');

    const coach = coaches.find(function (c) { return c.id === coachId; });
    if (!coach) {
      return { success: false, booking: null, message: 'Coach not found' };
    }

    const option = options.find(function (o) { return o.id === introOptionId && o.coach_id === coachId; });
    if (!option) {
      return { success: false, booking: null, message: 'Intro option not found for this coach' };
    }

    const start = new Date();
    const end = new Date(start.getTime() + option.duration_minutes * 60000);

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'coach_intro',
      session_id: null,
      coach_id: coachId,
      intro_option_id: introOptionId,
      client_name: clientName,
      client_email: clientEmail,
      contact_preference: contactPreference,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      duration_minutes: option.duration_minutes,
      price: option.price,
      currency: option.currency,
      status: 'confirmed',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return { success: true, booking: booking, message: 'Intro session booked' };
  }

  // getMeditationAudioFilterOptions()
  getMeditationAudioFilterOptions() {
    const products = this._getFromStorage('meditation_audio_products');

    let minPrice = null;
    let maxPrice = null;
    let minDuration = null;
    let maxDuration = null;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status !== 'active') continue;
      if (typeof p.price === 'number') {
        if (minPrice == null || p.price < minPrice) minPrice = p.price;
        if (maxPrice == null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.duration_minutes === 'number') {
        if (minDuration == null || p.duration_minutes < minDuration) minDuration = p.duration_minutes;
        if (maxDuration == null || p.duration_minutes > maxDuration) maxDuration = p.duration_minutes;
      }
    }

    const rating_options = [
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 3.0, label: '3.0 stars & up' }
    ];

    const duration_range_options = [
      { min_minutes: 0, max_minutes: 10, label: 'Up to 10 minutes' },
      { min_minutes: 10, max_minutes: 30, label: '10	30 minutes' },
      { min_minutes: 30, max_minutes: 60, label: '30	60 minutes' },
      { min_minutes: 60, max_minutes: null, label: '60+ minutes' }
    ];

    const price_range = {
      min_price: minPrice != null ? minPrice : 0,
      max_price_default: maxPrice != null ? maxPrice : 0,
      max_price_hard_limit: maxPrice != null ? maxPrice : 0,
      currency: 'usd'
    };

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' }
    ];

    return {
      rating_options: rating_options,
      duration_range_options: duration_range_options,
      price_range: price_range,
      sort_options: sort_options
    };
  }

  // searchMeditationAudios(minRating?, minDurationMinutes?, maxDurationMinutes?, maxPrice?, sortOrder?)
  searchMeditationAudios(minRating, minDurationMinutes, maxDurationMinutes, maxPrice, sortOrder) {
    const products = this._getFromStorage('meditation_audio_products');

    let results = products.filter(function (p) { return p.status === 'active'; });

    if (typeof minRating === 'number') {
      results = results.filter(function (p) {
        return typeof p.rating === 'number' && p.rating >= minRating;
      });
    }

    if (typeof minDurationMinutes === 'number') {
      results = results.filter(function (p) { return p.duration_minutes >= minDurationMinutes; });
    }

    if (typeof maxDurationMinutes === 'number') {
      results = results.filter(function (p) { return p.duration_minutes <= maxDurationMinutes; });
    }

    if (typeof maxPrice === 'number') {
      results = results.filter(function (p) { return p.price <= maxPrice; });
    }

    if (sortOrder === 'price_low_to_high') {
      results.sort((a, b) => this._compareNumbersAsc(a.price, b.price));
    } else if (sortOrder === 'price_high_to_low') {
      results.sort((a, b) => this._compareNumbersDesc(a.price, b.price));
    } else if (sortOrder === 'rating_high_to_low') {
      results.sort((a, b) => this._compareNumbersDesc(a.rating, b.rating));
    } else if (sortOrder === 'rating_low_to_high') {
      results.sort((a, b) => this._compareNumbersAsc(a.rating, b.rating));
    }

    // Instrumentation for task completion tracking (task_2)
    try {
      localStorage.setItem(
        'task2_meditationFilterParams',
        JSON.stringify({ minRating, minDurationMinutes, maxDurationMinutes, maxPrice, sortOrder })
      );
    } catch (e) {
      console.error('Instrumentation error (task_2):', e);
    }

    const mapped = results.map(function (p) {
      return {
        product_id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        description: p.description,
        category_name: 'Meditation Audios',
        price: p.price,
        currency: p.currency,
        duration_minutes: p.duration_minutes,
        rating: p.rating,
        review_count: p.review_count,
        image_url: p.image_url,
        status: p.status
      };
    });

    return mapped;
  }

  // addMeditationAudioToCart(productId, quantity = 1)
  addMeditationAudioToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('meditation_audio_products');

    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        cart_item_count: 0,
        cart_subtotal: 0,
        currency: 'usd'
      };
    }

    let existing = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.product_id === productId && ci.product_type === 'meditation_audio';
    });

    if (existing) {
      existing.quantity += qty;
      existing.line_total = existing.quantity * existing.unit_price;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        product_type: 'meditation_audio',
        quantity: qty,
        unit_price: product.price,
        line_total: product.price * qty,
        currency: product.currency
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Added to cart',
      cart_item_count: totals.cart_item_count,
      cart_subtotal: totals.subtotal,
      currency: totals.currency
    };
  }

  // getCartContents()
  getCartContents() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('meditation_audio_products');

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    const items = itemsForCart.map(function (ci) {
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_title: product ? product.title : null,
        product_type: ci.product_type,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        currency: product && product.currency ? product.currency : 'usd',
        product_image_url: product ? product.image_url : null,
        // Foreign key resolution
        product: product
      };
    });

    const totals = this._calculateCartTotals(cart.id);

    return {
      items: items,
      cart_item_count: totals.cart_item_count,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = typeof quantity === 'number' ? quantity : 0;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      const totalsEmpty = this._calculateCartTotals(cart.id);
      return {
        success: false,
        message: 'Cart item not found',
        cart_item_count: totalsEmpty.cart_item_count,
        subtotal: totalsEmpty.subtotal,
        tax: totalsEmpty.tax,
        total: totalsEmpty.total,
        currency: totalsEmpty.currency
      };
    }

    if (qty <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = qty;
      item.line_total = item.unit_price * qty;
    }

    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Cart updated',
      cart_item_count: totals.cart_item_count,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx !== -1) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
    }

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Item removed',
      cart_item_count: totals.cart_item_count,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  // getCourseFilterOptions()
  getCourseFilterOptions() {
    const courses = this._getFromStorage('courses');

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const topic_categories = [
      { value: 'chakra_balancing', label: 'Chakra Balancing' },
      { value: 'meditation_basics', label: 'Meditation Basics' },
      { value: 'energy_healing', label: 'Energy Healing' },
      { value: 'spiritual_growth', label: 'Spiritual Growth' }
    ];

    const start_date_presets = [
      {
        value: 'starting_next_month',
        label: 'Starting next month',
        description: 'Courses that begin in the next calendar month'
      }
    ];

    const duration_options = [
      { max_weeks: 3, label: 'Up to 3 weeks' },
      { max_weeks: 6, label: 'Up to 6 weeks' },
      { max_weeks: 12, label: 'Up to 12 weeks' }
    ];

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      if (c.status !== 'published') continue;
      if (typeof c.price === 'number') {
        if (minPrice == null || c.price < minPrice) minPrice = c.price;
        if (maxPrice == null || c.price > maxPrice) maxPrice = c.price;
      }
    }

    const price_range = {
      min_price: minPrice != null ? minPrice : 0,
      max_price_default: maxPrice != null ? maxPrice : 0,
      max_price_hard_limit: maxPrice != null ? maxPrice : 0,
      currency: 'usd'
    };

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'start_date_soonest', label: 'Start date: Soonest' },
      { value: 'qa_sessions_high_to_low', label: 'Live Q&A sessions: Most to fewest' }
    ];

    return {
      levels: levels,
      topic_categories: topic_categories,
      start_date_presets: start_date_presets,
      duration_options: duration_options,
      price_range: price_range,
      sort_options: sort_options
    };
  }

  // searchCourses(level?, topicCategory?, startDatePreset?, maxDurationWeeks?, maxPrice?, sortOrder?)
  searchCourses(level, topicCategory, startDatePreset, maxDurationWeeks, maxPrice, sortOrder) {
    const courses = this._getFromStorage('courses');

    let results = courses.filter(function (c) { return c.status === 'published'; });

    if (level) {
      results = results.filter(function (c) { return c.level === level; });
    }

    if (topicCategory) {
      results = results.filter(function (c) { return c.topic_category === topicCategory; });
    }

    if (typeof maxDurationWeeks === 'number') {
      results = results.filter(function (c) { return c.duration_weeks <= maxDurationWeeks; });
    }

    if (typeof maxPrice === 'number') {
      results = results.filter(function (c) { return c.price <= maxPrice; });
    }

    const range = this._resolveStartDatePresetRange(startDatePreset);
    if (range) {
      results = results.filter(function (c) {
        const start = new Date(c.start_date).getTime();
        return start >= range.startMin.getTime() && start <= range.startMax.getTime();
      });
    }

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem(
        'task3_courseFilterParams',
        JSON.stringify({ level, topicCategory, startDatePreset, maxDurationWeeks, maxPrice, sortOrder })
      );
    } catch (e) {
      console.error('Instrumentation error (task_3):', e);
    }

    if (sortOrder === 'price_low_to_high') {
      results.sort((a, b) => this._compareNumbersAsc(a.price, b.price));
    } else if (sortOrder === 'start_date_soonest') {
      results.sort(function (a, b) {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
    } else if (sortOrder === 'qa_sessions_high_to_low') {
      results.sort((a, b) => this._compareNumbersDesc(a.live_qa_session_count, b.live_qa_session_count));
    }

    const mapped = results.map(function (c) {
      return {
        course_id: c.id,
        title: c.title,
        slug: c.slug,
        short_description: c.short_description,
        level: c.level,
        topic_category: c.topic_category,
        start_date: c.start_date,
        end_date: c.end_date,
        duration_weeks: c.duration_weeks,
        price: c.price,
        currency: c.currency,
        live_qa_session_count: c.live_qa_session_count,
        image_url: c.image_url,
        status: c.status
      };
    });

    return mapped;
  }

  // getCourseDetail(courseSlug)
  getCourseDetail(courseSlug) {
    const courses = this._getFromStorage('courses');
    const accessLevels = this._getFromStorage('course_access_levels');

    const course = courses.find(function (c) { return c.slug === courseSlug; }) || null;
    let levelsForCourse = [];

    if (course) {
      levelsForCourse = accessLevels.filter(function (al) { return al.course_id === course.id; });
      // foreign key resolution: attach course to each access level
      levelsForCourse = levelsForCourse.map(function (al) {
        return Object.assign({}, al, { course: course });
      });
    }

    return {
      course: course,
      access_levels: levelsForCourse
    };
  }

  // enrollInCourse(courseId, accessLevelCode)
  enrollInCourse(courseId, accessLevelCode) {
    const courses = this._getFromStorage('courses');
    const accessLevels = this._getFromStorage('course_access_levels');
    const enrollments = this._getFromStorage('course_enrollments');

    const course = courses.find(function (c) { return c.id === courseId; });
    if (!course) {
      return { success: false, enrollment: null, message: 'Course not found' };
    }

    const accessLevel = accessLevels.find(function (al) { return al.course_id === courseId && al.code === accessLevelCode; });
    if (!accessLevel) {
      return { success: false, enrollment: null, message: 'Access level not found for this course' };
    }

    const pricePaid = course.price + accessLevel.price_adjustment;

    const enrollment = {
      id: this._generateId('enrollment'),
      course_id: courseId,
      access_level_id: accessLevel.id,
      enrollment_date: this._nowISO(),
      price_paid: pricePaid,
      currency: course.currency,
      status: 'enrolled'
    };

    enrollments.push(enrollment);
    this._saveToStorage('course_enrollments', enrollments);

    return {
      success: true,
      enrollment: enrollment,
      message: 'Enrolled in course'
    };
  }

  // createSelfCareSchedule(name, weekStartDate?)
  createSelfCareSchedule(name, weekStartDate) {
    const schedules = this._getFromStorage('self_care_schedules');
    const now = this._nowISO();

    const schedule = {
      id: this._generateId('schedule'),
      name: name,
      description: '',
      week_start_date: weekStartDate || null,
      created_at: now,
      updated_at: now,
      is_active: false
    };

    schedules.push(schedule);
    this._saveToStorage('self_care_schedules', schedules);

    return { schedule: schedule };
  }

  // getSelfCareScheduleDetail(scheduleId)
  getSelfCareScheduleDetail(scheduleId) {
    const schedules = this._getFromStorage('self_care_schedules');
    const events = this._getFromStorage('self_care_events');

    const schedule = schedules.find(function (s) { return s.id === scheduleId; }) || null;
    let eventsForSchedule = events.filter(function (e) { return e.schedule_id === scheduleId; });

    // Foreign key resolution: attach schedule to each event
    eventsForSchedule = eventsForSchedule.map(function (e) {
      return Object.assign({}, e, { schedule: schedule });
    });

    return {
      schedule: schedule,
      events: eventsForSchedule
    };
  }

  // addSelfCareEvent(scheduleId, title, category, weekday, startTime, durationMinutes)
  addSelfCareEvent(scheduleId, title, category, weekday, startTime, durationMinutes) {
    const schedules = this._getFromStorage('self_care_schedules');
    const schedule = schedules.find(function (s) { return s.id === scheduleId; });
    if (!schedule) {
      return { success: false, event: null, message: 'Schedule not found' };
    }

    const events = this._getFromStorage('self_care_events');

    const event = {
      id: this._generateId('self_care_event'),
      schedule_id: scheduleId,
      title: title,
      category: category,
      weekday: weekday,
      start_time: startTime,
      duration_minutes: durationMinutes
    };

    events.push(event);
    this._saveToStorage('self_care_events', events);

    return {
      success: true,
      event: event,
      message: 'Event added'
    };
  }

  // updateSelfCareEvent(eventId, title?, category?, weekday?, startTime?, durationMinutes?)
  updateSelfCareEvent(eventId, title, category, weekday, startTime, durationMinutes) {
    const events = this._getFromStorage('self_care_events');
    const idx = events.findIndex(function (e) { return e.id === eventId; });

    if (idx === -1) {
      return { success: false, event: null, message: 'Event not found' };
    }

    const event = events[idx];

    if (title !== undefined) event.title = title;
    if (category !== undefined) event.category = category;
    if (weekday !== undefined) event.weekday = weekday;
    if (startTime !== undefined) event.start_time = startTime;
    if (durationMinutes !== undefined) event.duration_minutes = durationMinutes;

    events[idx] = event;
    this._saveToStorage('self_care_events', events);

    return {
      success: true,
      event: event,
      message: 'Event updated'
    };
  }

  // saveSelfCareSchedule(scheduleId, isActive = true)
  saveSelfCareSchedule(scheduleId, isActive) {
    const activeFlag = typeof isActive === 'boolean' ? isActive : true;
    const schedules = this._getFromStorage('self_care_schedules');

    const idx = schedules.findIndex(function (s) { return s.id === scheduleId; });
    if (idx === -1) {
      return { success: false, schedule: null, message: 'Schedule not found' };
    }

    // Optionally, could deactivate others when activating this one; spec does not require
    schedules[idx].is_active = activeFlag;
    schedules[idx].updated_at = this._nowISO();

    this._saveToStorage('self_care_schedules', schedules);

    return {
      success: true,
      schedule: schedules[idx],
      message: 'Schedule saved'
    };
  }

  // createRitual(name, description?)
  createRitual(name, description) {
    const rituals = this._getFromStorage('rituals');
    const now = this._nowISO();

    const ritual = {
      id: this._generateId('ritual'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };

    rituals.push(ritual);
    this._saveToStorage('rituals', rituals);

    return { ritual: ritual };
  }

  // getRitualSuggestions(timeOfDay?)
  getRitualSuggestions(timeOfDay) {
    const suggestions = this._getFromStorage('ritual_suggestions');
    if (!timeOfDay) return suggestions;
    return suggestions.filter(function (s) { return s.time_of_day === timeOfDay; });
  }

  // addRitualStepFromSuggestion(ritualId, suggestionId)
  addRitualStepFromSuggestion(ritualId, suggestionId) {
    const rituals = this._getFromStorage('rituals');
    const ritual = rituals.find(function (r) { return r.id === ritualId; });
    if (!ritual) {
      return { success: false, step: null, message: 'Ritual not found' };
    }

    const suggestions = this._getFromStorage('ritual_suggestions');
    const suggestion = suggestions.find(function (s) { return s.id === suggestionId; });
    if (!suggestion) {
      return { success: false, step: null, message: 'Suggestion not found' };
    }

    const steps = this._getFromStorage('ritual_steps');
    const nextIndex = this._generateNextRitualStepOrderIndex(ritualId);

    const step = {
      id: this._generateId('ritual_step'),
      ritual_id: ritualId,
      suggestion_id: suggestionId,
      title: suggestion.title,
      time_of_day: suggestion.time_of_day,
      order_index: nextIndex,
      is_completed: false
    };

    steps.push(step);
    this._saveToStorage('ritual_steps', steps);

    return {
      success: true,
      step: step,
      message: 'Step added'
    };
  }

  // getRitualDetail(ritualId)
  getRitualDetail(ritualId) {
    const rituals = this._getFromStorage('rituals');
    const steps = this._getFromStorage('ritual_steps');
    const suggestions = this._getFromStorage('ritual_suggestions');

    const ritual = rituals.find(function (r) { return r.id === ritualId; }) || null;
    let stepsForRitual = steps.filter(function (s) { return s.ritual_id === ritualId; });

    stepsForRitual.sort(function (a, b) { return a.order_index - b.order_index; });

    // Foreign key resolution: attach suggestion to each step
    stepsForRitual = stepsForRitual.map(function (st) {
      const suggestion = suggestions.find(function (sg) { return sg.id === st.suggestion_id; }) || null;
      return Object.assign({}, st, { suggestion: suggestion });
    });

    return {
      ritual: ritual,
      steps: stepsForRitual
    };
  }

  // reorderRitualSteps(ritualId, orderedStepIds)
  reorderRitualSteps(ritualId, orderedStepIds) {
    const steps = this._getFromStorage('ritual_steps');
    const suggestions = this._getFromStorage('ritual_suggestions');

    // Update order_index based on orderedStepIds
    for (let i = 0; i < orderedStepIds.length; i++) {
      const stepId = orderedStepIds[i];
      const step = steps.find(function (s) { return s.id === stepId && s.ritual_id === ritualId; });
      if (step) {
        step.order_index = i + 1;
      }
    }

    this._saveToStorage('ritual_steps', steps);

    let stepsForRitual = steps.filter(function (s) { return s.ritual_id === ritualId; });
    stepsForRitual.sort(function (a, b) { return a.order_index - b.order_index; });

    // Foreign key resolution
    stepsForRitual = stepsForRitual.map(function (st) {
      const suggestion = suggestions.find(function (sg) { return sg.id === st.suggestion_id; }) || null;
      return Object.assign({}, st, { suggestion: suggestion });
    });

    return {
      success: true,
      steps: stepsForRitual,
      message: 'Steps reordered'
    };
  }

  // saveRitual(ritualId)
  saveRitual(ritualId) {
    const rituals = this._getFromStorage('rituals');
    const idx = rituals.findIndex(function (r) { return r.id === ritualId; });

    if (idx === -1) {
      return { success: false, ritual: null, message: 'Ritual not found' };
    }

    rituals[idx].updated_at = this._nowISO();
    this._saveToStorage('rituals', rituals);

    return {
      success: true,
      ritual: rituals[idx],
      message: 'Ritual saved'
    };
  }

  // getBlogFilterOptions()
  getBlogFilterOptions() {
    const date_ranges = [
      { value: 'past_7_days', label: 'Past 7 days' },
      { value: 'past_30_days', label: 'Past 30 days' },
      { value: 'past_12_months', label: 'Past 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    const reading_time_options = [
      { max_minutes: 5, label: '5 minutes or less' },
      { max_minutes: 10, label: '10 minutes or less' },
      { max_minutes: 15, label: '15 minutes or less' }
    ];

    return {
      date_ranges: date_ranges,
      reading_time_options: reading_time_options
    };
  }

  // searchBlogArticles(query?, dateRange?, maxReadingTimeMinutes?, sortOrder?)
  searchBlogArticles(query, dateRange, maxReadingTimeMinutes, sortOrder) {
    const articles = this._getFromStorage('blog_articles');
    const q = query ? String(query).toLowerCase() : null;

    // Instrumentation for task completion tracking (task_5)
    try {
      localStorage.setItem(
        'task5_blogSearchParams',
        JSON.stringify({ query, dateRange, maxReadingTimeMinutes, sortOrder })
      );
    } catch (e) {
      console.error('Instrumentation error (task_5):', e);
    }

    let results = articles.filter(function (a) { return a.status === 'published'; });

    if (q) {
      results = results.filter(function (a) {
        const inTitle = a.title && a.title.toLowerCase().indexOf(q) !== -1;
        const inExcerpt = a.excerpt && a.excerpt.toLowerCase().indexOf(q) !== -1;
        const inContent = a.content && a.content.toLowerCase().indexOf(q) !== -1;
        const inTopic = a.primary_topic && a.primary_topic.toLowerCase().indexOf(q) !== -1;
        const inTags = Array.isArray(a.tags) && a.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
        return inTitle || inExcerpt || inContent || inTopic || inTags;
      });
    }

    if (dateRange && dateRange !== 'all_time') {
      const now = new Date();
      let cutoff = null;
      if (dateRange === 'past_7_days') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'past_30_days') {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'past_12_months') {
        cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }
      if (cutoff) {
        results = results.filter(function (a) {
          return new Date(a.published_at).getTime() >= cutoff.getTime();
        });
      }
    }

    if (typeof maxReadingTimeMinutes === 'number') {
      results = results.filter(function (a) { return a.reading_time_minutes <= maxReadingTimeMinutes; });
    }

    if (sortOrder === 'date_oldest') {
      results.sort(function (a, b) {
        return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      });
    } else if (sortOrder === 'reading_time_shortest') {
      results.sort((a, b) => a.reading_time_minutes - b.reading_time_minutes);
    } else {
      // default or 'date_newest'
      results.sort(function (a, b) {
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });
    }

    return results;
  }

  // getArticleDetail(articleSlug)
  getArticleDetail(articleSlug) {
    const articles = this._getFromStorage('blog_articles');
    const bookmarks = this._getFromStorage('bookmarks');

    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    let is_bookmarked = false;

    if (article) {
      is_bookmarked = bookmarks.some(function (b) { return b.article_id === article.id; });
    }

    return {
      article: article,
      is_bookmarked: is_bookmarked
    };
  }

  // bookmarkArticle(articleId)
  bookmarkArticle(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.id === articleId; });
    if (!article) {
      return { success: false, bookmark: null, message: 'Article not found' };
    }

    const bookmarks = this._getFromStorage('bookmarks');
    let existing = bookmarks.find(function (b) { return b.article_id === articleId; });

    if (existing) {
      return { success: true, bookmark: existing, message: 'Already bookmarked' };
    }

    const bookmark = {
      id: this._generateId('bookmark'),
      article_id: articleId,
      created_at: this._nowISO()
    };

    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);

    return {
      success: true,
      bookmark: bookmark,
      message: 'Article bookmarked'
    };
  }

  // getBookmarkedArticles()
  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('bookmarks');
    const articles = this._getFromStorage('blog_articles');

    const combined = bookmarks.map(function (b) {
      const article = articles.find(function (a) { return a.id === b.article_id; }) || null;
      return {
        bookmark: b,
        article: article
      };
    });

    return combined;
  }

  // getProgramDetail(programCode)
  getProgramDetail(programCode) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(function (p) { return p.code === programCode; }) || null;
    return { program: program };
  }

  // getProgramIntakeForm(programCode)
  getProgramIntakeForm(programCode) {
    const programs = this._getFromStorage('programs');
    const options = this._getFromStorage('program_goal_options');

    const program = programs.find(function (p) { return p.code === programCode; }) || null;
    const goal_options = program ? options.filter(function (o) { return o.program_id === program.id && o.is_active; }) : [];

    const timeframe_options = [
      { value: 'less_than_one_month', label: 'Less than 1 month' },
      { value: 'one_to_three_months', label: '1	3 months' },
      { value: 'three_to_six_months', label: '3	6 months' },
      { value: 'more_than_six_months', label: 'More than 6 months' }
    ];

    const monthly_budget_options = [
      { value: 'under_200', label: 'Under $200' },
      { value: 'two_hundred_to_four_hundred', label: '$200	400' },
      { value: 'over_400', label: 'Over $400' }
    ];

    return {
      program: program,
      goal_options: goal_options,
      timeframe_options: timeframe_options,
      monthly_budget_options: monthly_budget_options
    };
  }

  // submitProgramIntake(programId, applicantName, applicantEmail, timeframe, monthlyBudget, goalCodes[], openResponse)
  submitProgramIntake(programId, applicantName, applicantEmail, timeframe, monthlyBudget, goalCodes, openResponse) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(function (p) { return p.id === programId; });
    if (!program) {
      return { success: false, submission: null, selected_goals: [], message: 'Program not found' };
    }

    const submissions = this._getFromStorage('program_intake_submissions');
    const selectedGoalsStore = this._getFromStorage('program_intake_selected_goals');

    const submission = {
      id: this._generateId('intake'),
      program_id: programId,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      timeframe: timeframe,
      monthly_budget: monthlyBudget,
      open_response: openResponse,
      submitted_at: this._nowISO()
    };

    submissions.push(submission);
    this._saveToStorage('program_intake_submissions', submissions);

    const goalCodesArray = Array.isArray(goalCodes) ? goalCodes : [];
    const selected_goals = [];

    for (let i = 0; i < goalCodesArray.length; i++) {
      const code = goalCodesArray[i];
      const row = {
        id: this._generateId('intake_goal'),
        intake_submission_id: submission.id,
        goal_code: code
      };
      selectedGoalsStore.push(row);
      selected_goals.push(row);
    }

    this._saveToStorage('program_intake_selected_goals', selectedGoalsStore);

    // Foreign key resolution: attach program to submission and goal option metadata to selected_goals
    const goalOptionsAll = this._getFromStorage('program_goal_options');
    const enrichedSubmission = Object.assign({}, submission, { program: program });
    const enrichedGoals = selected_goals.map(function (g) {
      const goalOption = goalOptionsAll.find(function (o) {
        return o.program_id === programId && o.code === g.goal_code;
      }) || null;
      return Object.assign({}, g, { goal_option: goalOption });
    });

    return {
      success: true,
      submission: enrichedSubmission,
      selected_goals: enrichedGoals,
      message: 'Intake submitted'
    };
  }

  // getCoachFilterOptions()
  getCoachFilterOptions() {
    const coaches = this._getFromStorage('coaches');

    const specialtiesMap = {
      energy_healing: 'Energy Healing',
      energy_coaching: 'Energy Coaching',
      chakra_balancing: 'Chakra Balancing'
    };

    const specialtySet = {};
    for (let i = 0; i < coaches.length; i++) {
      const coach = coaches[i];
      if (Array.isArray(coach.specialties)) {
        for (let j = 0; j < coach.specialties.length; j++) {
          specialtySet[coach.specialties[j]] = true;
        }
      }
    }

    const specialties = Object.keys(specialtySet).map(function (value) {
      return { value: value, label: specialtiesMap[value] || value };
    });

    const formats = [
      { value: 'online', label: 'Online' },
      { value: 'in_person', label: 'In person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    let minPrice = null;
    let maxPrice = null;
    for (let k = 0; k < coaches.length; k++) {
      const c = coaches[k];
      if (c.status !== 'active') continue;
      if (typeof c.price_per_session === 'number') {
        if (minPrice == null || c.price_per_session < minPrice) minPrice = c.price_per_session;
        if (maxPrice == null || c.price_per_session > maxPrice) maxPrice = c.price_per_session;
      }
    }

    const price_range = {
      min_price: minPrice != null ? minPrice : 0,
      max_price_default: maxPrice != null ? maxPrice : 0,
      max_price_hard_limit: maxPrice != null ? maxPrice : 0,
      currency: 'usd'
    };

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      specialties: specialties,
      formats: formats,
      price_range: price_range,
      sort_options: sort_options
    };
  }

  // searchCoaches(specialty?, format?, maxPrice?, sortOrder?)
  searchCoaches(specialty, format, maxPrice, sortOrder) {
    const coaches = this._getFromStorage('coaches');

    // Instrumentation for task completion tracking (task_7 - filters)
    try {
      localStorage.setItem(
        'task7_coachFilterParams',
        JSON.stringify({ specialty, format, maxPrice, sortOrder })
      );
    } catch (e) {
      console.error('Instrumentation error (task_7 - coach filters):', e);
    }

    let results = coaches.filter(function (c) { return c.status === 'active'; });

    if (specialty) {
      results = results.filter(function (c) {
        return Array.isArray(c.specialties) && c.specialties.indexOf(specialty) !== -1;
      });
    }

    if (format) {
      results = results.filter(function (c) {
        if (c.primary_format === format) return true;
        if (Array.isArray(c.formats_available) && c.formats_available.indexOf(format) !== -1) return true;
        return false;
      });
    }

    if (typeof maxPrice === 'number') {
      results = results.filter(function (c) { return c.price_per_session <= maxPrice; });
    }

    if (sortOrder === 'rating_high_to_low') {
      results.sort((a, b) => this._compareNumbersDesc(a.rating, b.rating));
    } else if (sortOrder === 'rating_low_to_high') {
      results.sort((a, b) => this._compareNumbersAsc(a.rating, b.rating));
    } else if (sortOrder === 'price_low_to_high') {
      results.sort((a, b) => this._compareNumbersAsc(a.price_per_session, b.price_per_session));
    } else if (sortOrder === 'price_high_to_low') {
      results.sort((a, b) => this._compareNumbersDesc(a.price_per_session, b.price_per_session));
    }

    const mapped = results.map(function (c) {
      return {
        coach_id: c.id,
        name: c.name,
        bio: c.bio,
        specialties: c.specialties,
        primary_format: c.primary_format,
        formats_available: c.formats_available,
        price_per_session: c.price_per_session,
        currency: c.currency,
        rating: c.rating,
        review_count: c.review_count,
        profile_image_url: c.profile_image_url,
        location_timezone: c.location_timezone,
        status: c.status
      };
    });

    return mapped;
  }

  // compareCoaches(coachIds[2])
  compareCoaches(coachIds) {
    const ids = Array.isArray(coachIds) ? coachIds : [];

    // Instrumentation for task completion tracking (task_7 - compared coaches)
    try {
      if (Array.isArray(coachIds) && coachIds.length === 2) {
        localStorage.setItem('task7_comparedCoachIds', JSON.stringify(coachIds));
      }
    } catch (e) {
      console.error('Instrumentation error (task_7 - compared coaches):', e);
    }

    const coaches = this._getFromStorage('coaches');
    const selected = coaches.filter(function (c) { return ids.indexOf(c.id) !== -1; });
    return selected;
  }

  // listMembershipPlans()
  listMembershipPlans() {
    const plans = this._getFromStorage('membership_plans');
    return plans.filter(function (p) { return p.status === 'active'; });
  }

  // getMembershipPlanDetail(planId)
  getMembershipPlanDetail(planId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find(function (p) { return p.id === planId; }) || null;
    return { plan: plan };
  }

  // startMembershipSubscription(planId, billingFrequency)
  startMembershipSubscription(planId, billingFrequency) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find(function (p) { return p.id === planId; });
    if (!plan) {
      return { success: false, subscription: null, message: 'Plan not found' };
    }

    const subscriptions = this._getFromStorage('membership_subscriptions');

    const subscription = {
      id: this._generateId('membership_sub'),
      plan_id: planId,
      billing_frequency: billingFrequency,
      status: 'active',
      start_date: this._nowISO(),
      end_date: null
    };

    subscriptions.push(subscription);
    this._saveToStorage('membership_subscriptions', subscriptions);

    return {
      success: true,
      subscription: subscription,
      message: 'Membership started'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', {
      mission: '',
      values: [],
      philosophy: '',
      ethical_guidelines: '',
      featured_coach_ids: []
    });
    const coaches = this._getFromStorage('coaches');

    const featured_coaches = Array.isArray(about.featured_coach_ids)
      ? about.featured_coach_ids
          .map(function (id) { return coaches.find(function (c) { return c.id === id; }) || null; })
          .filter(function (c) { return !!c; })
      : [];

    return {
      mission: about.mission,
      values: about.values || [],
      philosophy: about.philosophy,
      ethical_guidelines: about.ethical_guidelines,
      featured_coaches: featured_coaches
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {
      email: '',
      phone: '',
      timezone: '',
      office_hours: '',
      inquiry_types: []
    });

    return {
      email: info.email || '',
      phone: info.phone || '',
      timezone: info.timezone || '',
      office_hours: info.office_hours || '',
      inquiry_types: info.inquiry_types || []
    };
  }

  // submitContactForm(name, email, inquiryType, message)
  submitContactForm(name, email, inquiryType, message) {
    const tickets = this._getFromStorage('contact_tickets');

    const ticket = {
      id: this._generateId('ticket'),
      name: name,
      email: email,
      inquiry_type: inquiryType,
      message: message,
      created_at: this._nowISO()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Inquiry submitted'
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