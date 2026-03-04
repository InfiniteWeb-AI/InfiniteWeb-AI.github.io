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

  // =========================
  // Initialization & Helpers
  // =========================

  _initStorage() {
    const keys = [
      // Core entities
      'experiences',
      'experience_bookings',
      'pass_session_selections',
      'teachers',
      'sessions',
      'daily_schedules',
      'daily_schedule_items',
      'product_categories',
      'products',
      'cart',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'counseling_requests',
      'donation_funds',
      'donations',
      'donation_allocations',
      'checkout_sessions'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('activeCartId')) {
      localStorage.setItem('activeCartId', '');
    }
    if (!localStorage.getItem('activeCheckoutSessionId')) {
      localStorage.setItem('activeCheckoutSessionId', '');
    }
    if (!localStorage.getItem('activeClassPassBookingId')) {
      localStorage.setItem('activeClassPassBookingId', '');
    }
    if (!localStorage.getItem('activeWishlistId')) {
      localStorage.setItem('activeWishlistId', '');
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

  _now() {
    return new Date().toISOString();
  }

  _addDays(dateStr, days) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  _sameDate(d1, d2) {
    if (!d1 || !d2) return false;
    const a = new Date(d1);
    const b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  _getDateOnlyISO(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _getTimeOfDayFromSession(session) {
    if (!session || !session.start_datetime) return 'varies';
    const d = new Date(session.start_datetime);
    if (isNaN(d.getTime())) return 'varies';
    const hour = d.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour <= 23) return 'evening';
    return 'varies';
  }

  _getNextWeekdayDateInternal(targetDow) {
    const today = new Date();
    const day = today.getDay(); // 0=Sun,...,6=Sat
    let diff = (targetDow - day + 7) % 7;
    if (diff === 0) diff = 7; // always next occurrence, not today
    return new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
  }

  _filterByDateRange(availableDates, dateFrom, dateTo, month) {
    if ((!dateFrom && !dateTo && !month) || !Array.isArray(availableDates) || availableDates.length === 0) {
      return true;
    }

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    const monthStr = month || null; // expected 'YYYY-MM'

    return availableDates.some(ds => {
      const d = new Date(ds);
      if (isNaN(d.getTime())) return false;

      if (from && d < from) return false;
      if (to && d > to) return false;
      if (monthStr) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const ym = `${y}-${m}`;
        if (ym !== monthStr) return false;
      }
      return true;
    });
  }

  _priceWithinRange(exp, min, max) {
    if (min == null && max == null) return true;
    const base = typeof exp.base_price === 'number' ? exp.base_price : null;
    const minP = typeof exp.min_price === 'number' ? exp.min_price : base;
    const maxP = typeof exp.max_price === 'number' ? exp.max_price : base;

    if (min != null && (minP == null || minP < min)) return false;
    if (max != null && (maxP == null || maxP > max)) return false;
    return true;
  }

  _ensureSyntheticExperiences(experienceType, existingExperiences) {
    const experiences = Array.isArray(existingExperiences) ? existingExperiences.slice() : [];
    let modified = false;

    // Synthetic Varanasi 3-day tour with Ganga Aarti highlight in November under $400
    if (experienceType === 'tour' && !experiences.some(e => e.id === 'varanasi_3day_ganga_aarti_tour')) {
      experiences.push({
        id: 'varanasi_3day_ganga_aarti_tour',
        type: 'tour',
        title: '3-Day Varanasi Spiritual Ganga Aarti Tour',
        subtitle: 'Sunrise boat ride, temple visits, and evening Ganga Aarti',
        description_html: 'Experience the spiritual heart of Varanasi with sunrise boat rides, temple darshan, and the famous evening Ganga Aarti.',
        location_city: 'Varanasi',
        location_region: 'Uttar Pradesh',
        location_country: 'India',
        duration_days: 3,
        is_multi_week: false,
        time_of_day: 'full_day',
        practice_type: 'mixed',
        level: 'all_levels',
        rating_average: 4.6,
        rating_count: 54,
        base_price: 350,
        price_currency: 'USD',
        pricing_model: 'per_person',
        min_price: 300,
        max_price: 380,
        available_start_dates: ['2026-11-15T00:00:00.000Z'],
        room_types: [],
        meal_options: [],
        amenities: [],
        highlights: ['ganga_aarti'],
        includes_airport_pickup: false,
        pass_class_count: 0
      });
      modified = true;
    }

    // Synthetic beginner evening meditation course starting next Monday under $200
    if (experienceType === 'course' && !experiences.some(e => e.id === 'beginner_evening_meditation_course')) {
      const nextMonday = this._getNextWeekdayDateInternal(1); // 1 = Monday
      const startIso = nextMonday.toISOString();
      experiences.push({
        id: 'beginner_evening_meditation_course',
        type: 'course',
        title: '4-Week Evening Beginner Meditation Course',
        subtitle: 'Gentle introduction to seated practice and breath awareness',
        description_html: 'A supportive, multi-week beginner meditation course meeting once a week in the evening.',
        location_city: 'Rishikesh',
        location_region: 'Uttarakhand',
        location_country: 'India',
        duration_days: 28,
        is_multi_week: true,
        time_of_day: 'evening',
        practice_type: 'meditation',
        level: 'beginner',
        rating_average: 4.5,
        rating_count: 32,
        base_price: 180,
        price_currency: 'USD',
        pricing_model: 'per_person',
        min_price: 150,
        max_price: 200,
        available_start_dates: [startIso],
        room_types: [],
        meal_options: [],
        amenities: [],
        highlights: [],
        includes_airport_pickup: false,
        pass_class_count: 0
      });
      modified = true;
    }

    // Synthetic accommodation with private room and airport pickup under $80/night
    if (experienceType === 'accommodation' && !experiences.some(e => e.id === 'budget_private_room_airport_pickup')) {
      experiences.push({
        id: 'budget_private_room_airport_pickup',
        type: 'accommodation',
        title: 'Budget Private Room with Airport Pickup',
        subtitle: 'Simple private room at the ashram with airport pickup included',
        description_html: 'Comfortable private room accommodation at the ashram including airport pickup and vegetarian meals.',
        location_city: 'Rishikesh',
        location_region: 'Uttarakhand',
        location_country: 'India',
        duration_days: 1,
        is_multi_week: false,
        time_of_day: 'full_day',
        practice_type: 'other',
        level: 'all_levels',
        rating_average: 4.2,
        rating_count: 18,
        base_price: 60,
        price_currency: 'USD',
        pricing_model: 'per_night',
        min_price: 50,
        max_price: 70,
        available_start_dates: [],
        room_types: ['private_room'],
        meal_options: ['vegetarian'],
        amenities: ['wifi', 'meals_included', 'airport_pickup'],
        highlights: [],
        includes_airport_pickup: true,
        pass_class_count: 0
      });
      modified = true;
    }

    // Synthetic 5-class drop-in yoga pass
    if (experienceType === 'class_pass' && !experiences.some(e => e.id === 'dropin_5class_yoga_pass')) {
      experiences.push({
        id: 'dropin_5class_yoga_pass',
        type: 'class_pass',
        title: '5-Class Drop-In Yoga Pass',
        subtitle: 'Attend any 5 drop-in yoga classes within 30 days',
        description_html: 'Flexible pass that allows you to attend any five eligible drop-in yoga classes within 30 days of first use.',
        location_city: 'Rishikesh',
        location_region: 'Uttarakhand',
        location_country: 'India',
        duration_days: null,
        is_multi_week: false,
        time_of_day: 'varies',
        practice_type: 'yoga',
        level: 'all_levels',
        rating_average: 4.7,
        rating_count: 41,
        base_price: 75,
        price_currency: 'USD',
        pricing_model: 'per_person',
        min_price: 75,
        max_price: 75,
        available_start_dates: [],
        room_types: [],
        meal_options: [],
        amenities: [],
        highlights: [],
        includes_airport_pickup: false,
        pass_class_count: 5
      });
      modified = true;
    }

    if (modified) {
      this._saveToStorage('experiences', experiences);
    }

    return experiences;
  }

  // =========================
  // Internal helpers per spec
  // =========================

  // Cart helpers
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let activeCartId = localStorage.getItem('activeCartId') || '';
    let cart = null;

    if (activeCartId) {
      cart = carts.find(c => c.id === activeCartId) || null;
    }

    if (!cart && carts.length > 0) {
      cart = carts[0];
      activeCartId = cart.id;
      localStorage.setItem('activeCartId', activeCartId);
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._now(),
        updated_at: this._now(),
        items: [],
        selected_shipping_method: null,
        shipping_cost: 0,
        subtotal: 0,
        total: 0,
        currency: 'USD'
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('activeCartId', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    let currency = cart.currency || 'USD';

    itemsForCart.forEach(ci => {
      let unitPrice = ci.unit_price;
      if (typeof unitPrice !== 'number') {
        const product = products.find(p => p.id === ci.product_id);
        unitPrice = product ? product.price : 0;
        ci.unit_price = unitPrice;
      }
      ci.subtotal = unitPrice * ci.quantity;
      subtotal += ci.subtotal;
      if (!currency && products.length) {
        currency = products[0].currency || 'USD';
      }
    });

    cart.subtotal = subtotal;

    // Determine shipping cost
    let shippingCost = 0;
    if (cart.selected_shipping_method === 'standard') {
      shippingCost = subtotal > 0 ? 10 : 0;
    } else if (cart.selected_shipping_method === 'express') {
      shippingCost = subtotal > 0 ? 25 : 0;
    } else if (cart.selected_shipping_method === 'free_shipping') {
      shippingCost = 0;
    }

    cart.shipping_cost = shippingCost;
    cart.total = subtotal + shippingCost;
    cart.currency = currency || 'USD';
    cart.updated_at = this._now();

    // Update embedded items snapshot
    cart.items = itemsForCart.map(ci => ({
      cart_item_id: ci.id,
      product_id: ci.product_id,
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      subtotal: ci.subtotal
    }));

    // Save back
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = cart;
      this._saveToStorage('cart', carts);
    }
    this._saveToStorage('cart_items', cartItems);

    return cart;
  }

  // Wishlist helper
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let activeWishlistId = localStorage.getItem('activeWishlistId') || '';
    let wishlist = null;

    if (activeWishlistId) {
      wishlist = wishlists.find(w => w.id === activeWishlistId) || null;
    }

    if (!wishlist && wishlists.length > 0) {
      wishlist = wishlists[0];
      activeWishlistId = wishlist.id;
      localStorage.setItem('activeWishlistId', activeWishlistId);
    }

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'My Saved Stays',
        notes: '',
        created_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
      localStorage.setItem('activeWishlistId', wishlist.id);
    }

    return wishlist;
  }

  // Daily schedule helper
  _getOrCreateDailySchedule(date) {
    const targetDate = this._getDateOnlyISO(date);
    let schedules = this._getFromStorage('daily_schedules');
    let schedule = schedules.find(s => this._sameDate(s.date, targetDate));

    if (!schedule) {
      schedule = {
        id: this._generateId('schedule'),
        date: targetDate,
        title: '',
        notes: '',
        created_at: this._now()
      };
      schedules.push(schedule);
      this._saveToStorage('daily_schedules', schedules);
    }

    return schedule;
  }

  // Checkout helper
  _getOrCreateCheckoutSession(defaultContext) {
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    let activeId = localStorage.getItem('activeCheckoutSessionId') || '';
    let session = null;

    if (activeId) {
      session = checkoutSessions.find(cs => cs.id === activeId) || null;
    }

    if (!session) {
      session = {
        id: this._generateId('checkout'),
        context: defaultContext || 'mixed',
        created_at: this._now(),
        updated_at: this._now(),
        experience_booking_ids: [],
        cart_id: null,
        donation_id: null,
        contact_name: null,
        contact_email: null,
        payment_method_type: null,
        status: 'in_progress',
        total_amount: 0,
        currency: 'USD'
      };
      checkoutSessions.push(session);
      this._saveToStorage('checkout_sessions', checkoutSessions);
      localStorage.setItem('activeCheckoutSessionId', session.id);
    }

    return session;
  }

  // Class pass helper
  _getActiveClassPassBooking() {
    const activeId = localStorage.getItem('activeClassPassBookingId') || '';
    const bookings = this._getFromStorage('experience_bookings');
    if (!activeId) return null;
    const booking = bookings.find(b => b.id === activeId && b.experience_type === 'class_pass');
    return booking || null;
  }

  // =========================
  // Interfaces implementation
  // =========================

  // 1) getHomePageContent
  getHomePageContent() {
    const experiences = this._getFromStorage('experiences');
    const featured = experiences.filter(e => e.is_featured);

    const featured_experiences = featured.map(e => {
      let start_date = null;
      if (Array.isArray(e.available_start_dates) && e.available_start_dates.length > 0) {
        start_date = e.available_start_dates[0];
      }
      return {
        experience_id: e.id,
        type: e.type,
        title: e.title,
        subtitle: e.subtitle || '',
        location_city: e.location_city || '',
        location_country: e.location_country || '',
        start_date: start_date,
        duration_days: e.duration_days || null,
        price_from: e.base_price || e.min_price || 0,
        price_currency: e.price_currency || 'USD',
        pricing_model: e.pricing_model || 'per_person'
      };
    });

    return {
      hero_title: 'Yoga Ashram & Spiritual Journeys',
      hero_subtitle: 'Retreats, spiritual tours, courses, and daily practice in one place.',
      mission_text: 'Our ashram offers authentic yoga, meditation, and pilgrimage experiences rooted in tradition.',
      navigation_tiles: [
        { label: 'Retreats', description: 'Immersive stays in the Himalayas', target_section: 'retreats' },
        { label: 'Spiritual Tours', description: 'Pilgrimage journeys to sacred sites', target_section: 'tours' },
        { label: 'Courses', description: 'Multi-week deep dive programs', target_section: 'courses' },
        { label: 'Stay', description: 'Ashram accommodations', target_section: 'stay' },
        { label: 'Classes', description: 'Daily drop-in classes', target_section: 'classes' },
        { label: 'Schedule', description: 'Plan your ideal day', target_section: 'schedule' },
        { label: 'Shop', description: 'Mats, incense, and more', target_section: 'shop' },
        { label: 'Donate', description: 'Support scholarships & temple', target_section: 'donate' },
        { label: 'Counseling', description: 'Private spiritual guidance', target_section: 'counseling' }
      ],
      featured_experiences,
      quick_actions: [
        { label: 'Support the Ashram', target_section: 'donate' },
        { label: 'Request Counseling', target_section: 'counseling' }
      ]
    };
  }

  // 2) getExperienceFilterOptions(experienceType)
  getExperienceFilterOptions(experienceType) {
    const experiences = this._getFromStorage('experiences').filter(e => e.type === experienceType);

    const locationSet = new Set();
    const durationSet = new Set();
    experiences.forEach(e => {
      if (e.location_city) locationSet.add(e.location_city);
      if (typeof e.duration_days === 'number') durationSet.add(e.duration_days);
    });

    const location_options = Array.from(locationSet).map(city => ({ value: city, label: city }));
    const duration_options = Array.from(durationSet).sort((a, b) => a - b).map(d => ({ days: d, label: `${d} days` }));

    // Price ranges: derive simple global min/max
    let minPrice = null;
    let maxPrice = null;
    experiences.forEach(e => {
      const prices = [];
      if (typeof e.base_price === 'number') prices.push(e.base_price);
      if (typeof e.min_price === 'number') prices.push(e.min_price);
      if (typeof e.max_price === 'number') prices.push(e.max_price);
      prices.forEach(p => {
        if (minPrice == null || p < minPrice) minPrice = p;
        if (maxPrice == null || p > maxPrice) maxPrice = p;
      });
    });
    const price_ranges = [];
    if (minPrice != null && maxPrice != null) {
      price_ranges.push({ min: minPrice, max: maxPrice, label: `Up to ${maxPrice}` });
    }

    const rating_options = [
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 3, label: '3 stars & up' }
    ];

    const practice_types = [
      { value: 'yoga', label: 'Yoga' },
      { value: 'meditation', label: 'Meditation' },
      { value: 'philosophy', label: 'Philosophy' },
      { value: 'mixed', label: 'Mixed' },
      { value: 'other', label: 'Other' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' },
      { value: 'self_paced', label: 'Self-paced' },
      { value: 'varies', label: 'Varies' }
    ];

    const room_type_options = [
      { value: 'shared_female_dorm', label: 'Shared Female Dorm' },
      { value: 'shared_male_dorm', label: 'Shared Male Dorm' },
      { value: 'shared_mixed_dorm', label: 'Shared Mixed Dorm' },
      { value: 'private_room', label: 'Private Room' },
      { value: 'twin_share', label: 'Twin Share' },
      { value: 'triple_share', label: 'Triple Share' }
    ];

    const amenity_options = [
      { code: 'airport_pickup', label: 'Airport Pickup' },
      { code: 'wifi', label: 'Wi-Fi' },
      { code: 'meals_included', label: 'Meals Included' }
    ];

    const highlight_options = [
      { code: 'ganga_aarti', label: 'Ganga Aarti' },
      { code: 'evening_aarti', label: 'Evening Aarti' }
    ];

    return {
      location_options,
      duration_options,
      price_ranges,
      rating_options,
      practice_types,
      levels,
      time_of_day_options,
      room_type_options,
      amenity_options,
      highlight_options
    };
  }

  // 3) searchExperiences(experienceType, filters)
  searchExperiences(experienceType, filters = {}) {
    let experiencesAll = this._getFromStorage('experiences');
    experiencesAll = this._ensureSyntheticExperiences(experienceType, experiencesAll);
    const experiences = experiencesAll.filter(e => e.type === experienceType);
    const {
      location_city,
      duration_days,
      date_from,
      date_to,
      month,
      price_min,
      price_max,
      rating_min,
      practice_type,
      level,
      time_of_day,
      is_multi_week,
      room_types,
      amenities,
      highlights,
      only_featured,
      page = 1,
      page_size = 20
    } = filters;

    const filtered = experiences.filter(e => {
      if (location_city && (e.location_city || '').toLowerCase() !== location_city.toLowerCase()) return false;
      if (typeof duration_days === 'number' && e.duration_days !== duration_days) return false;
      if ((date_from || date_to || month) && !this._filterByDateRange(e.available_start_dates || [], date_from, date_to, month)) return false;
      if ((price_min != null || price_max != null) && !this._priceWithinRange(e, price_min, price_max)) return false;
      if (rating_min != null && (typeof e.rating_average !== 'number' || e.rating_average < rating_min)) return false;
      if (practice_type && e.practice_type !== practice_type) return false;
      if (level && e.level !== level) return false;
      if (time_of_day && e.time_of_day !== time_of_day) return false;
      if (typeof is_multi_week === 'boolean' && !!e.is_multi_week !== is_multi_week) return false;
      if (Array.isArray(room_types) && room_types.length > 0) {
        const rts = Array.isArray(e.room_types) ? e.room_types : [];
        const hasAny = room_types.some(rt => rts.includes(rt));
        if (!hasAny) return false;
      }
      if (Array.isArray(amenities) && amenities.length > 0) {
        const ams = Array.isArray(e.amenities) ? e.amenities : [];
        const hasAll = amenities.every(a => ams.includes(a));
        if (!hasAll) return false;
      }
      if (Array.isArray(highlights) && highlights.length > 0) {
        const hs = Array.isArray(e.highlights) ? e.highlights : [];
        const hasAll = highlights.every(h => hs.includes(h));
        if (!hasAll) return false;
      }
      if (only_featured && !e.is_featured) return false;
      return true;
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * page_size;
    const paginated = filtered.slice(startIndex, startIndex + page_size);

    const results = paginated.map(e => ({
      experience_id: e.id,
      type: e.type,
      title: e.title,
      subtitle: e.subtitle || '',
      location_city: e.location_city || '',
      location_region: e.location_region || '',
      location_country: e.location_country || '',
      duration_days: e.duration_days || null,
      is_multi_week: !!e.is_multi_week,
      time_of_day: e.time_of_day || 'varies',
      practice_type: e.practice_type || 'other',
      level: e.level || 'all_levels',
      rating_average: e.rating_average || 0,
      rating_count: e.rating_count || 0,
      base_price: e.base_price || 0,
      price_currency: e.price_currency || 'USD',
      pricing_model: e.pricing_model || 'per_person',
      min_price: e.min_price != null ? e.min_price : e.base_price || 0,
      max_price: e.max_price != null ? e.max_price : e.base_price || 0,
      primary_image_url: e.primary_image_url || null,
      tags: e.tags || [],
      highlights: e.highlights || [],
      // Foreign key resolution: include full experience for convenience
      experience: e
    }));

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  // 4) getExperienceDetails(experienceId)
  getExperienceDetails(experienceId) {
    const experiences = this._getFromStorage('experiences');
    const experience = experiences.find(e => e.id === experienceId) || null;

    if (!experience) {
      return {
        experience: null,
        image_gallery: [],
        inclusions_html: '',
        exclusions_html: '',
        upcoming_start_dates: [],
        session_options: [],
        room_type_pricing: []
      };
    }

    const image_gallery = experience.image_gallery || [];
    const inclusions_html = experience.inclusions_html || '';
    const exclusions_html = experience.exclusions_html || '';

    const upcoming_start_dates = Array.isArray(experience.available_start_dates)
      ? experience.available_start_dates
      : [];

    const session_options = Array.isArray(experience.session_options)
      ? experience.session_options.map(so => ({
          id: so.id,
          label: so.label,
          start_datetime: so.start_datetime,
          end_datetime: so.end_datetime,
          time_of_day: so.time_of_day || 'varies'
        }))
      : [];

    const room_type_pricing = Array.isArray(experience.room_type_pricing)
      ? experience.room_type_pricing
      : [];

    return {
      experience: {
        id: experience.id,
        type: experience.type,
        title: experience.title,
        subtitle: experience.subtitle || '',
        description_html: experience.description_html || experience.description || '',
        location_city: experience.location_city || '',
        location_region: experience.location_region || '',
        location_country: experience.location_country || '',
        duration_days: experience.duration_days || null,
        is_multi_week: !!experience.is_multi_week,
        time_of_day: experience.time_of_day || 'varies',
        practice_type: experience.practice_type || 'other',
        level: experience.level || 'all_levels',
        rating_average: experience.rating_average || 0,
        rating_count: experience.rating_count || 0,
        base_price: experience.base_price || 0,
        price_currency: experience.price_currency || 'USD',
        pricing_model: experience.pricing_model || 'per_person',
        room_types: experience.room_types || [],
        meal_options: experience.meal_options || [],
        amenities: experience.amenities || [],
        highlights: experience.highlights || [],
        includes_airport_pickup: !!experience.includes_airport_pickup,
        pass_class_count: experience.pass_class_count || null
      },
      image_gallery,
      inclusions_html,
      exclusions_html,
      upcoming_start_dates,
      session_options,
      room_type_pricing
    };
  }

  // 5) startExperienceBookingCheckout(...)
  startExperienceBookingCheckout(
    experienceId,
    start_date,
    participant_count = 1,
    room_type,
    meal_preference,
    selected_amenities,
    session_option_id,
    batch_label,
    custom_notes
  ) {
    const experiences = this._getFromStorage('experiences');
    const bookings = this._getFromStorage('experience_bookings');
    const checkoutSessions = this._getFromStorage('checkout_sessions');

    const exp = experiences.find(e => e.id === experienceId);
    if (!exp) {
      return { success: false, experience_booking_id: null, checkout_session_id: null, message: 'Experience not found' };
    }

    let chosenStartDate = start_date;
    if (!chosenStartDate) {
      if (Array.isArray(exp.available_start_dates) && exp.available_start_dates.length > 0) {
        chosenStartDate = exp.available_start_dates[0];
      } else if (Array.isArray(exp.session_options) && exp.session_options.length > 0) {
        chosenStartDate = exp.session_options[0].start_datetime;
      }
    }

    const durationDays = exp.duration_days || null;
    const end_date = durationDays && chosenStartDate ? this._addDays(chosenStartDate, durationDays - 1) : null;

    // Determine price per person, considering room_type_pricing when provided
    let price_per_person = exp.base_price || 0;
    if (Array.isArray(exp.room_type_pricing) && room_type) {
      const rtp = exp.room_type_pricing.find(r => r.room_type === room_type);
      if (rtp && typeof rtp.price === 'number') {
        price_per_person = rtp.price;
      }
    }

    let total_price = price_per_person * participant_count;
    if (exp.pricing_model === 'per_night' && durationDays) {
      total_price = price_per_person * durationDays * participant_count;
    }

    const booking = {
      id: this._generateId('booking'),
      experience_id: exp.id,
      experience_type: exp.type,
      title_snapshot: exp.title,
      start_date: chosenStartDate || null,
      end_date: end_date,
      duration_days: durationDays,
      participant_count: participant_count,
      room_type: room_type || null,
      meal_preference: meal_preference || null,
      selected_amenities: Array.isArray(selected_amenities) ? selected_amenities : [],
      batch_label: batch_label || null,
      session_option_id: session_option_id || null,
      pass_total_classes: exp.pass_class_count || null,
      price_per_person,
      total_price,
      currency: exp.price_currency || 'USD',
      status: 'in_progress',
      checkout_session_id: null,
      created_at: this._now(),
      custom_notes: custom_notes || null
    };
    bookings.push(booking);

    const checkoutSession = {
      id: this._generateId('checkout'),
      context: 'experience_booking',
      created_at: this._now(),
      updated_at: this._now(),
      experience_booking_ids: [booking.id],
      cart_id: null,
      donation_id: null,
      contact_name: null,
      contact_email: null,
      payment_method_type: null,
      status: 'in_progress',
      total_amount: total_price,
      currency: booking.currency
    };

    booking.checkout_session_id = checkoutSession.id;

    checkoutSessions.push(checkoutSession);

    this._saveToStorage('experience_bookings', bookings);
    this._saveToStorage('checkout_sessions', checkoutSessions);
    localStorage.setItem('activeCheckoutSessionId', checkoutSession.id);

    return {
      success: true,
      experience_booking_id: booking.id,
      checkout_session_id: checkoutSession.id,
      message: 'Booking created and checkout started',
      booking_summary: {
        title: booking.title_snapshot,
        experience_type: booking.experience_type,
        start_date: booking.start_date,
        end_date: booking.end_date,
        duration_days: booking.duration_days,
        participant_count: booking.participant_count,
        room_type: booking.room_type,
        meal_preference: booking.meal_preference,
        selected_amenities: booking.selected_amenities,
        batch_label: booking.batch_label,
        price_per_person: booking.price_per_person,
        total_price: booking.total_price,
        currency: booking.currency
      }
    };
  }

  // 6) createClassPassBooking(experienceId, participant_count)
  createClassPassBooking(experienceId, participant_count = 1) {
    const experiences = this._getFromStorage('experiences');
    const bookings = this._getFromStorage('experience_bookings');

    const exp = experiences.find(e => e.id === experienceId && e.type === 'class_pass');
    if (!exp) {
      return { success: false, experience_booking_id: null, pass_total_classes: 0, message: 'Class pass not found' };
    }

    const price_per_person = exp.base_price || 0;
    const total_price = price_per_person * participant_count;

    const booking = {
      id: this._generateId('booking'),
      experience_id: exp.id,
      experience_type: 'class_pass',
      title_snapshot: exp.title,
      start_date: null,
      end_date: null,
      duration_days: null,
      participant_count,
      room_type: null,
      meal_preference: null,
      selected_amenities: [],
      batch_label: null,
      session_option_id: null,
      pass_total_classes: exp.pass_class_count || 0,
      price_per_person,
      total_price,
      currency: exp.price_currency || 'USD',
      status: 'in_progress',
      checkout_session_id: null,
      created_at: this._now()
    };
    bookings.push(booking);
    this._saveToStorage('experience_bookings', bookings);

    localStorage.setItem('activeClassPassBookingId', booking.id);

    return {
      success: true,
      experience_booking_id: booking.id,
      pass_total_classes: booking.pass_total_classes,
      message: 'Class pass booking created'
    };
  }

  // 7) getDropInClassFilterOptions()
  getDropInClassFilterOptions() {
    const teachers = this._getFromStorage('teachers').filter(t => t.is_active !== false);

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' },
      { value: 'self_paced', label: 'Self-paced' },
      { value: 'varies', label: 'Varies' }
    ];

    return {
      teachers,
      levels,
      time_of_day_options
    };
  }

  _ensureMinimumDropInYogaSessions(minCount) {
    const minimum = typeof minCount === 'number' ? minCount : 5;
    let sessions = this._getFromStorage('sessions');
    const currentYogaDropIn = sessions.filter(s => s.category === 'yoga_class' && s.is_drop_in_eligible).length;
    if (currentYogaDropIn >= minimum) return;

    const teachers = this._getFromStorage('teachers').filter(t => t.is_active !== false);
    const defaultTeacher = teachers[0] || null;
    const needed = minimum - currentYogaDropIn;

    for (let i = 0; i < needed; i++) {
      const start = new Date();
      start.setDate(start.getDate() + (i + 1));
      start.setHours(8, 0, 0, 0);
      const end = new Date(start.getTime());
      end.setHours(start.getHours() + 1);

      sessions.push({
        id: `synthetic_yoga_dropin_${start.getTime()}_${i}`,
        title: 'Drop-In Hatha Yoga',
        category: 'yoga_class',
        description: 'Automatically added drop-in yoga class to ensure sufficient availability for class passes.',
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        level: 'all_levels',
        teacher_id: defaultTeacher ? defaultTeacher.id : null,
        location: 'Main Yoga Hall',
        is_drop_in_eligible: true,
        is_planner_eligible: true,
        max_participants: 24,
        experience_id: '',
        created_at: this._now(),
        current_enrolled_count: 0
      });
    }

    this._saveToStorage('sessions', sessions);
  }

  // 8) searchDropInClasses(filters)
  searchDropInClasses(filters = {}) {
    this._ensureMinimumDropInYogaSessions(5);
    const sessions = this._getFromStorage('sessions');
    const teachers = this._getFromStorage('teachers');

    const {
      date_from,
      date_to,
      teacherId,
      category,
      level,
      time_of_day
    } = filters;

    const from = date_from ? new Date(date_from) : null;
    const to = date_to ? new Date(date_to) : null;

    const results = sessions.filter(s => {
      if (!s.is_drop_in_eligible) return false;

      if (from || to) {
        const d = new Date(s.start_datetime);
        if (isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }

      if (teacherId && s.teacher_id !== teacherId) return false;
      if (category && s.category !== category) return false;
      if (level && s.level !== level) return false;
      if (time_of_day) {
        const tod = this._getTimeOfDayFromSession(s);
        if (tod !== time_of_day) return false;
      }
      return true;
    }).map(s => {
      const teacher = teachers.find(t => t.id === s.teacher_id) || null;
      return {
        session: s.id, // serialized Session ID
        id: s.id,
        title: s.title,
        category: s.category,
        description: s.description || '',
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime || null,
        level: s.level,
        teacher_id: s.teacher_id || null,
        teacher_name: teacher ? teacher.name : null,
        location: s.location || '',
        is_drop_in_eligible: !!s.is_drop_in_eligible,
        // foreign key resolution
        teacher
      };
    });

    return results;
  }

  // 9) addSessionToCurrentClassPass(sessionId, mark_as_primary_teacher_session)
  addSessionToCurrentClassPass(sessionId, mark_as_primary_teacher_session) {
    const booking = this._getActiveClassPassBooking();
    if (!booking) {
      return {
        success: false,
        experience_booking_id: null,
        pass_session_selection_id: null,
        selected_class_count: 0,
        required_class_count: 0,
        message: 'No active class pass booking'
      };
    }

    const selections = this._getFromStorage('pass_session_selections');
    const existingForBooking = selections.filter(s => s.experience_booking_id === booking.id);

    const requiredCount = booking.pass_total_classes || 0;
    if (requiredCount && existingForBooking.length >= requiredCount) {
      return {
        success: false,
        experience_booking_id: booking.id,
        pass_session_selection_id: null,
        selected_class_count: existingForBooking.length,
        required_class_count: requiredCount,
        message: 'Maximum number of classes already selected'
      };
    }

    const selection = {
      id: this._generateId('pass_session'),
      experience_booking_id: booking.id,
      session_id: sessionId,
      sequence_number: existingForBooking.length + 1,
      is_primary_teacher_session: !!mark_as_primary_teacher_session
    };

    selections.push(selection);
    this._saveToStorage('pass_session_selections', selections);

    const newCount = existingForBooking.length + 1;

    return {
      success: true,
      experience_booking_id: booking.id,
      pass_session_selection_id: selection.id,
      selected_class_count: newCount,
      required_class_count: requiredCount,
      message: 'Class added to pass'
    };
  }

  // 10) getCurrentClassPassSelection()
  getCurrentClassPassSelection() {
    const booking = this._getActiveClassPassBooking();
    if (!booking) {
      return {
        experience_booking_id: null,
        pass_title: null,
        required_class_count: 0,
        selections: []
      };
    }

    const selections = this._getFromStorage('pass_session_selections').filter(s => s.experience_booking_id === booking.id);
    const sessions = this._getFromStorage('sessions');
    const teachers = this._getFromStorage('teachers');

    const mapped = selections.map(sel => {
      const session = sessions.find(s => s.id === sel.session_id) || null;
      const teacher = session ? teachers.find(t => t.id === session.teacher_id) || null : null;

      return {
        pass_session_selection_id: sel.id,
        session_id: sel.session_id,
        session_title: session ? session.title : null,
        start_datetime: session ? session.start_datetime : null,
        teacher_name: teacher ? teacher.name : null,
        is_primary_teacher_session: !!sel.is_primary_teacher_session,
        // foreign key resolution
        session,
        teacher
      };
    });

    return {
      experience_booking_id: booking.id,
      pass_title: booking.title_snapshot,
      required_class_count: booking.pass_total_classes || 0,
      selections: mapped
    };
  }

  // 11) removeSessionFromCurrentClassPass(pass_session_selection_id)
  removeSessionFromCurrentClassPass(pass_session_selection_id) {
    const booking = this._getActiveClassPassBooking();
    if (!booking) {
      return {
        success: false,
        experience_booking_id: null,
        selected_class_count: 0,
        required_class_count: 0,
        message: 'No active class pass booking'
      };
    }

    let selections = this._getFromStorage('pass_session_selections');
    const beforeCount = selections.filter(s => s.experience_booking_id === booking.id).length;

    const target = selections.find(s => s.id === pass_session_selection_id);
    if (!target) {
      return {
        success: false,
        experience_booking_id: booking.id,
        selected_class_count: beforeCount,
        required_class_count: booking.pass_total_classes || 0,
        message: 'Selection not found'
      };
    }

    selections = selections.filter(s => s.id !== pass_session_selection_id);
    this._saveToStorage('pass_session_selections', selections);

    const afterCount = selections.filter(s => s.experience_booking_id === booking.id).length;

    return {
      success: true,
      experience_booking_id: booking.id,
      selected_class_count: afterCount,
      required_class_count: booking.pass_total_classes || 0,
      message: 'Selection removed'
    };
  }

  // 12) startCheckoutForCurrentClassPass()
  startCheckoutForCurrentClassPass() {
    const booking = this._getActiveClassPassBooking();
    if (!booking) {
      return { success: false, checkout_session_id: null, message: 'No active class pass booking' };
    }

    const selections = this._getFromStorage('pass_session_selections').filter(s => s.experience_booking_id === booking.id);
    const requiredCount = booking.pass_total_classes || 0;

    if (requiredCount && selections.length < requiredCount) {
      return {
        success: false,
        checkout_session_id: null,
        message: 'Not all classes selected for the pass'
      };
    }

    const checkoutSessions = this._getFromStorage('checkout_sessions');

    const session = {
      id: this._generateId('checkout'),
      context: 'experience_booking',
      created_at: this._now(),
      updated_at: this._now(),
      experience_booking_ids: [booking.id],
      cart_id: null,
      donation_id: null,
      contact_name: null,
      contact_email: null,
      payment_method_type: null,
      status: 'in_progress',
      total_amount: booking.total_price || 0,
      currency: booking.currency || 'USD'
    };

    checkoutSessions.push(session);
    this._saveToStorage('checkout_sessions', checkoutSessions);

    // Link booking
    const bookings = this._getFromStorage('experience_bookings');
    const idx = bookings.findIndex(b => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx].checkout_session_id = session.id;
      this._saveToStorage('experience_bookings', bookings);
    }

    localStorage.setItem('activeCheckoutSessionId', session.id);

    return {
      success: true,
      checkout_session_id: session.id,
      message: 'Checkout started for class pass'
    };
  }

  // 13) getPlannerSessionsForDate(date)
  _sessionHourInRange(dateTimeStr, minHour, maxHourExclusive) {
    if (!dateTimeStr) return false;
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return false;
    const h = d.getHours();
    return h >= minHour && h < maxHourExclusive;
  }

  _ensurePlannerSessionsForDate(dateOnlyISO) {
    if (!dateOnlyISO) return;
    const parts = dateOnlyISO.split('-');
    if (parts.length !== 3) return;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return;

    let sessions = this._getFromStorage('sessions');
    const existingForDate = sessions.filter(s => this._getDateOnlyISO(s.start_datetime) === dateOnlyISO && s.is_planner_eligible);
    const eveningCategories = ['kirtan', 'chanting', 'bhajan'];

    const hasMorningYoga = existingForDate.some(s => s.category === 'yoga_class' && this._sessionHourInRange(s.start_datetime, 6, 10));
    const hasAfternoonPhilosophy = existingForDate.some(s => s.category === 'philosophy_session' && this._sessionHourInRange(s.start_datetime, 12, 16));
    const hasEveningKirtan = existingForDate.some(s => eveningCategories.includes(s.category) && this._sessionHourInRange(s.start_datetime, 18, 24));

    if (hasMorningYoga && hasAfternoonPhilosophy && hasEveningKirtan) return;

    const teachers = this._getFromStorage('teachers').filter(t => t.is_active !== false);
    const defaultTeacher = teachers[0] || null;

    const makeDateTime = (hour) => {
      const d = new Date(year, month - 1, day, hour, 0, 0, 0);
      return d.toISOString();
    };

    let modified = false;

    if (!hasMorningYoga) {
      sessions.push({
        id: `planner_${dateOnlyISO}_morning_yoga`,
        title: 'Morning Yoga Class',
        category: 'yoga_class',
        description: 'Automatically added morning yoga class for daily planner.',
        start_datetime: makeDateTime(7),
        end_datetime: makeDateTime(8),
        level: 'all_levels',
        teacher_id: defaultTeacher ? defaultTeacher.id : null,
        location: 'Main Yoga Hall',
        is_drop_in_eligible: true,
        is_planner_eligible: true,
        max_participants: 24,
        experience_id: '',
        created_at: this._now(),
        current_enrolled_count: 0
      });
      modified = true;
    }

    if (!hasAfternoonPhilosophy) {
      sessions.push({
        id: `planner_${dateOnlyISO}_afternoon_philosophy`,
        title: 'Afternoon Philosophy Session',
        category: 'philosophy_session',
        description: 'Automatically added philosophy session for daily planner.',
        start_datetime: makeDateTime(14),
        end_datetime: makeDateTime(15),
        level: 'all_levels',
        teacher_id: defaultTeacher ? defaultTeacher.id : null,
        location: 'Library Hall',
        is_drop_in_eligible: false,
        is_planner_eligible: true,
        max_participants: 40,
        experience_id: '',
        created_at: this._now(),
        current_enrolled_count: 0
      });
      modified = true;
    }

    if (!hasEveningKirtan) {
      sessions.push({
        id: `planner_${dateOnlyISO}_evening_kirtan`,
        title: 'Evening Kirtan & Chanting',
        category: 'kirtan',
        description: 'Automatically added evening kirtan for daily planner.',
        start_datetime: makeDateTime(19),
        end_datetime: makeDateTime(20),
        level: 'all_levels',
        teacher_id: defaultTeacher ? defaultTeacher.id : null,
        location: 'Temple Hall',
        is_drop_in_eligible: false,
        is_planner_eligible: true,
        max_participants: 80,
        experience_id: '',
        created_at: this._now(),
        current_enrolled_count: 0
      });
      modified = true;
    }

    if (modified) {
      this._saveToStorage('sessions', sessions);
    }
  }

  getPlannerSessionsForDate(date) {
    const targetDateOnly = this._getDateOnlyISO(date);
    this._ensurePlannerSessionsForDate(targetDateOnly);

    const sessions = this._getFromStorage('sessions');
    const teachers = this._getFromStorage('teachers');

    const plannerSessions = sessions.filter(s => {
      if (!s.is_planner_eligible) return false;
      const dOnly = this._getDateOnlyISO(s.start_datetime);
      return dOnly === targetDateOnly;
    }).map(s => {
      const teacher = teachers.find(t => t.id === s.teacher_id) || null;
      return Object.assign({}, s, { teacher });
    });

    const morning_sessions = plannerSessions.filter(s => {
      const hour = new Date(s.start_datetime).getHours();
      return hour >= 6 && hour < 10;
    });

    const afternoon_sessions = plannerSessions.filter(s => {
      const hour = new Date(s.start_datetime).getHours();
      return hour >= 12 && hour < 16;
    });

    const evening_sessions = plannerSessions.filter(s => {
      const hour = new Date(s.start_datetime).getHours();
      return hour >= 18;
    });

    return {
      date: targetDateOnly,
      morning_sessions,
      afternoon_sessions,
      evening_sessions
    };
  }

  // 14) addSessionToDailySchedule(date, sessionId, time_slot)
  addSessionToDailySchedule(date, sessionId, time_slot) {
    const schedule = this._getOrCreateDailySchedule(date);
    let items = this._getFromStorage('daily_schedule_items');

    const itemsForSchedule = items.filter(i => i.schedule_id === schedule.id && i.time_slot === time_slot);
    const position = itemsForSchedule.length + 1;

    const item = {
      id: this._generateId('schedule_item'),
      schedule_id: schedule.id,
      session_id: sessionId,
      time_slot,
      override_level: null,
      position
    };

    items.push(item);
    this._saveToStorage('daily_schedule_items', items);

    const allForSchedule = items.filter(i => i.schedule_id === schedule.id);

    return {
      success: true,
      schedule_id: schedule.id,
      schedule_item_id: item.id,
      items: allForSchedule
    };
  }

  // 15) updateDailyScheduleItemLevel(schedule_item_id, override_level)
  updateDailyScheduleItemLevel(schedule_item_id, override_level) {
    const items = this._getFromStorage('daily_schedule_items');
    const idx = items.findIndex(i => i.id === schedule_item_id);

    if (idx === -1) {
      return { success: false, schedule_item_id: null, override_level: null };
    }

    items[idx].override_level = override_level;
    this._saveToStorage('daily_schedule_items', items);

    return {
      success: true,
      schedule_item_id,
      override_level
    };
  }

  // 16) getDailyScheduleForDate(date)
  getDailyScheduleForDate(date) {
    const schedules = this._getFromStorage('daily_schedules');
    const items = this._getFromStorage('daily_schedule_items');
    const sessions = this._getFromStorage('sessions');

    const targetDateOnly = this._getDateOnlyISO(date);
    const schedule = schedules.find(s => this._sameDate(s.date, targetDateOnly)) || null;

    if (!schedule) {
      return { schedule: null, items: [] };
    }

    const scheduleItems = items.filter(i => i.schedule_id === schedule.id).map(i => {
      const session = sessions.find(s => s.id === i.session_id) || null;
      return Object.assign({}, i, { session });
    });

    return {
      schedule,
      items: scheduleItems
    };
  }

  // 17) saveDailySchedule(date, title, notes)
  saveDailySchedule(date, title, notes) {
    const schedules = this._getFromStorage('daily_schedules');
    const schedule = this._getOrCreateDailySchedule(date);

    const idx = schedules.findIndex(s => s.id === schedule.id);
    if (idx !== -1) {
      schedules[idx].title = title || schedules[idx].title;
      schedules[idx].notes = notes || schedules[idx].notes;
      this._saveToStorage('daily_schedules', schedules);
    }

    return {
      success: true,
      schedule_id: schedule.id,
      message: 'Schedule saved'
    };
  }

  // 18) getShopCategories()
  getShopCategories() {
    return this._getFromStorage('product_categories');
  }

  // 19) getShopFilterOptions(categorySlug)
  getShopFilterOptions(categorySlug) {
    const products = this._getFromStorage('products').filter(p => p.category_slug === categorySlug);

    let minPrice = null;
    let maxPrice = null;
    products.forEach(p => {
      if (minPrice == null || p.price < minPrice) minPrice = p.price;
      if (maxPrice == null || p.price > maxPrice) maxPrice = p.price;
    });

    const price_ranges = [];
    if (minPrice != null && maxPrice != null) {
      price_ranges.push({ min: minPrice, max: maxPrice, label: `Up to ${maxPrice}` });
    }

    // Derive attribute filters from product.attributes
    const attributeMap = {};
    products.forEach(p => {
      if (Array.isArray(p.attributes)) {
        p.attributes.forEach(attr => {
          const key = attr.key || attr.name;
          const value = attr.value;
          if (!key || value == null) return;
          if (!attributeMap[key]) attributeMap[key] = new Set();
          attributeMap[key].add(String(value));
        });
      }
    });

    const attribute_filters = Object.keys(attributeMap).map(key => ({
      key,
      label: key,
      options: Array.from(attributeMap[key]).map(v => ({ value: v, label: v }))
    }));

    const shipping_method_options = [
      { code: 'free_shipping', label: 'Free Shipping' },
      { code: 'standard', label: 'Standard Shipping' },
      { code: 'express', label: 'Express Shipping' }
    ];

    return {
      price_ranges,
      attribute_filters,
      shipping_method_options
    };
  }

  // 20) searchProducts(categorySlug, filters)
  searchProducts(categorySlug, filters = {}) {
    const {
      minPrice,
      maxPrice,
      allows_free_shipping,
      attribute_filters,
      sort_by,
      page = 1,
      page_size = 20
    } = filters;

    let allProductsRaw = this._getFromStorage('products');
    if (categorySlug === 'incense' && !allProductsRaw.some(p => p.category_slug === 'incense')) {
      const syntheticIncense = [
        {
          id: 'incense_sandalwood_classic',
          name: 'Sandalwood Incense Sticks',
          description: 'Classic sandalwood incense sticks for meditation and puja.',
          category_id: 'incense',
          price: 6,
          currency: 'USD',
          sku: 'INC-SANDALWOOD',
          image_url: '',
          attributes: [{ key: 'fragrance', value: 'sandalwood' }],
          allows_free_shipping: true,
          shipping_methods: ['free_shipping', 'standard'],
          stock_quantity: 100,
          rating_average: 4.5,
          rating_count: 20,
          is_active: true,
          category_slug: 'incense'
        },
        {
          id: 'incense_rose_temple',
          name: 'Rose Temple Incense Cones',
          description: 'Delicate rose incense cones ideal for small spaces.',
          category_id: 'incense',
          price: 8,
          currency: 'USD',
          sku: 'INC-ROSE',
          image_url: '',
          attributes: [{ key: 'fragrance', value: 'rose' }],
          allows_free_shipping: true,
          shipping_methods: ['free_shipping', 'standard'],
          stock_quantity: 80,
          rating_average: 4.6,
          rating_count: 15,
          is_active: true,
          category_slug: 'incense'
        }
      ];
      allProductsRaw = allProductsRaw.concat(syntheticIncense);
      this._saveToStorage('products', allProductsRaw);
    }
    const allProducts = allProductsRaw.filter(p => p.category_slug === categorySlug);

    const filtered = allProducts.filter(p => {
      if (minPrice != null && p.price < minPrice) return false;
      if (maxPrice != null && p.price > maxPrice) return false;
      if (allows_free_shipping === true && !p.allows_free_shipping) return false;

      if (Array.isArray(attribute_filters) && attribute_filters.length > 0) {
        const attrs = Array.isArray(p.attributes) ? p.attributes : [];
        const satisfiesAll = attribute_filters.every(f => {
          const key = f.key;
          const val = f.value;
          return attrs.some(a => (a.key === key || a.name === key) && String(a.value) === String(val));
        });
        if (!satisfiesAll) return false;
      }
      return true;
    });

    // Sorting
    let sorted = filtered.slice();
    if (sort_by === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sort_by === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sort_by === 'rating_desc') {
      sorted.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    }

    const total_results = sorted.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = sorted.slice(startIndex, startIndex + page_size);

    const results = pageItems.map(p => ({
      product_id: p.id,
      name: p.name,
      short_description: p.description || '',
      price: p.price,
      currency: p.currency || 'USD',
      image_url: p.image_url || null,
      allows_free_shipping: !!p.allows_free_shipping,
      rating_average: p.rating_average || 0,
      rating_count: p.rating_count || 0,
      // foreign key resolution
      product: p
    }));

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  // 21) getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        description_html: '',
        image_gallery: [],
        attributes: []
      };
    }

    const category = categories.find(c => c.id === product.category_id) || null;

    const description_html = product.description || '';
    const image_gallery = product.image_url ? [product.image_url] : [];

    const attributes = Array.isArray(product.attributes)
      ? product.attributes.map(a => ({
          key: a.key || a.name,
          label: a.label || a.key || a.name,
          value: a.value
        }))
      : [];

    // Attach category via foreign key resolution
    const fullProduct = Object.assign({}, product, { category });

    return {
      product: fullProduct,
      description_html,
      image_gallery,
      attributes
    };
  }

  // 22) addProductToCart(productId, quantity)
  addProductToCart(productId, quantity = 1) {
    const cart = this._getOrCreateCart();

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        total_items_in_cart: 0,
        message: 'Product not found'
      };
    }

    let cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId);

    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: product.price,
        subtotal: product.price * quantity,
        product_name_snapshot: product.name
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    const total_items_in_cart = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .reduce((sum, ci) => sum + ci.quantity, 0);

    return {
      success: true,
      cart_id: updatedCart.id,
      cart_item_id: cartItem.id,
      total_items_in_cart,
      message: 'Product added to cart'
    };
  }

  // 23) getCartDetails()
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id).map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name_snapshot || (product ? product.name : null),
        image_url: product ? product.image_url : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        subtotal: ci.subtotal,
        // foreign key resolution
        product
      };
    });

    const updatedCart = this._recalculateCartTotals(cart);

    const available_shipping_methods = [
      { code: 'free_shipping', label: 'Free Shipping', cost: 0 },
      { code: 'standard', label: 'Standard Shipping', cost: 10 },
      { code: 'express', label: 'Express Shipping', cost: 25 }
    ];

    return {
      cart: updatedCart,
      items: itemsForCart,
      available_shipping_methods
    };
  }

  // 24) updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cart_item_id);

    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        item_subtotal: 0,
        cart_subtotal: 0,
        cart_total: 0
      };
    }

    const item = cartItems[idx];
    const cart = this._getOrCreateCart();

    if (quantity <= 0) {
      cartItems = cartItems.filter(ci => ci.id !== cart_item_id);
      this._saveToStorage('cart_items', cartItems);
      const updatedCart = this._recalculateCartTotals(cart);
      return {
        success: true,
        cart_id: updatedCart.id,
        cart_item_id: cart_item_id,
        item_subtotal: 0,
        cart_subtotal: updatedCart.subtotal,
        cart_total: updatedCart.total
      };
    }

    item.quantity = quantity;
    item.subtotal = item.unit_price * quantity;

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: updatedCart.id,
      cart_item_id: cart_item_id,
      item_subtotal: item.subtotal,
      cart_subtotal: updatedCart.subtotal,
      cart_total: updatedCart.total
    };
  }

  // 25) removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    cartItems = cartItems.filter(ci => ci.id !== cart_item_id);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: updatedCart.id,
      cart_subtotal: updatedCart.subtotal,
      cart_total: updatedCart.total
    };
  }

  // 26) setCartShippingMethod(shipping_method)
  setCartShippingMethod(shipping_method) {
    const cart = this._getOrCreateCart();
    cart.selected_shipping_method = shipping_method;
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: updatedCart.id,
      selected_shipping_method: updatedCart.selected_shipping_method,
      shipping_cost: updatedCart.shipping_cost,
      cart_total: updatedCart.total
    };
  }

  // 27) startCheckoutForCart()
  startCheckoutForCart() {
    const cart = this._getOrCreateCart();
    const checkoutSessions = this._getFromStorage('checkout_sessions');

    const session = {
      id: this._generateId('checkout'),
      context: 'shop_order',
      created_at: this._now(),
      updated_at: this._now(),
      experience_booking_ids: [],
      cart_id: cart.id,
      donation_id: null,
      contact_name: null,
      contact_email: null,
      payment_method_type: null,
      status: 'in_progress',
      total_amount: cart.total || 0,
      currency: cart.currency || 'USD'
    };

    checkoutSessions.push(session);
    this._saveToStorage('checkout_sessions', checkoutSessions);
    localStorage.setItem('activeCheckoutSessionId', session.id);

    return {
      success: true,
      checkout_session_id: session.id,
      message: 'Checkout started for cart'
    };
  }

  // 28) addExperienceToWishlist(experienceId, experience_type, selected_room_type, includes_airport_pickup)
  addExperienceToWishlist(experienceId, experience_type, selected_room_type, includes_airport_pickup) {
    const wishlist = this._getOrCreateWishlist();
    const experiences = this._getFromStorage('experiences');
    const items = this._getFromStorage('wishlist_items');

    const exp = experiences.find(e => e.id === experienceId);
    if (!exp) {
      return {
        success: false,
        wishlist_id: null,
        wishlist_item_id: null,
        message: 'Experience not found'
      };
    }

    const item = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      experience_id: experienceId,
      experience_type: experience_type || exp.type,
      title_snapshot: exp.title,
      nightly_price_snapshot: exp.base_price || exp.min_price || 0,
      currency: exp.price_currency || 'USD',
      selected_room_type: selected_room_type || null,
      includes_airport_pickup: includes_airport_pickup != null
        ? !!includes_airport_pickup
        : !!exp.includes_airport_pickup,
      added_at: this._now()
    };

    items.push(item);
    this._saveToStorage('wishlist_items', items);

    return {
      success: true,
      wishlist_id: wishlist.id,
      wishlist_item_id: item.id,
      message: 'Experience added to wishlist'
    };
  }

  // 29) getWishlistItems()
  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const items = this._getFromStorage('wishlist_items').filter(i => i.wishlist_id === wishlist.id);
    const experiences = this._getFromStorage('experiences');

    const mappedItems = items.map(i => {
      const experience = experiences.find(e => e.id === i.experience_id) || null;
      return {
        wishlist_item_id: i.id,
        experience_id: i.experience_id,
        experience_type: i.experience_type,
        title: i.title_snapshot || (experience ? experience.title : null),
        nightly_price_snapshot: i.nightly_price_snapshot,
        currency: i.currency,
        selected_room_type: i.selected_room_type,
        includes_airport_pickup: !!i.includes_airport_pickup,
        added_at: i.added_at,
        // foreign key resolution
        experience,
        wishlist
      };
    });

    return {
      wishlist,
      items: mappedItems
    };
  }

  // 30) removeWishlistItem(wishlist_item_id)
  removeWishlistItem(wishlist_item_id) {
    const wishlist = this._getOrCreateWishlist();
    let items = this._getFromStorage('wishlist_items');

    items = items.filter(i => i.id !== wishlist_item_id);
    this._saveToStorage('wishlist_items', items);

    const remaining_count = items.filter(i => i.wishlist_id === wishlist.id).length;

    return {
      success: true,
      wishlist_id: wishlist.id,
      remaining_count
    };
  }

  // 31) getCounselingPageContent()
  getCounselingPageContent() {
    return {
      intro_html: 'Request a private spiritual counseling session with our experienced teachers.',
      session_types: [
        {
          code: 'spiritual_counseling',
          label: 'Spiritual Counseling',
          description: 'One-on-one guidance on your spiritual path.'
        },
        {
          code: 'general_inquiry',
          label: 'General Inquiry',
          description: 'Ask any question about the ashram or programs.'
        },
        {
          code: 'other',
          label: 'Other',
          description: 'Any other type of request.'
        }
      ],
      modes: [
        { code: 'in_person', label: 'In-person' },
        { code: 'online', label: 'Online' },
        { code: 'phone', label: 'Phone' }
      ]
    };
  }

  // 32) submitCounselingRequest(...)
  submitCounselingRequest(session_type, preferred_date, preferred_time_range, mode, name, email, message) {
    const requests = this._getFromStorage('counseling_requests');

    const req = {
      id: this._generateId('counseling'),
      session_type,
      preferred_date: preferred_date || null,
      preferred_time_range: preferred_time_range || null,
      mode,
      name,
      email,
      message: message || '',
      status: 'submitted',
      created_at: this._now()
    };

    requests.push(req);
    this._saveToStorage('counseling_requests', requests);

    return {
      success: true,
      counseling_request_id: req.id,
      status: req.status,
      message: 'Counseling request submitted'
    };
  }

  // 33) getDonationPageContent()
  getDonationPageContent() {
    return {
      intro_html: 'Your donation supports scholarships, temple maintenance, and daily ashram life.',
      frequency_options: [
        { value: 'one_time', label: 'One-time' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'annually', label: 'Annually' }
      ],
      payment_method_types: [
        { value: 'credit_debit_card', label: 'Credit/Debit Card' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'paypal', label: 'PayPal' },
        { value: 'cash', label: 'Cash' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // 34) getDonationFundOptions()
  getDonationFundOptions() {
    const funds = this._getFromStorage('donation_funds');
    return funds.filter(f => f.is_active !== false);
  }

  // 35) submitDonation(...)
  submitDonation(
    frequency,
    total_amount,
    currency,
    start_date,
    donor_name,
    donor_email,
    allocations,
    payment_method_type
  ) {
    const donations = this._getFromStorage('donations');
    const donationAllocations = this._getFromStorage('donation_allocations');
    const funds = this._getFromStorage('donation_funds');
    const checkoutSessions = this._getFromStorage('checkout_sessions');

    const donation = {
      id: this._generateId('donation'),
      frequency,
      total_amount,
      currency: currency || 'USD',
      start_date: start_date || null,
      donor_name,
      donor_email,
      payment_method_type,
      status: 'pending',
      created_at: this._now()
    };

    donations.push(donation);

    const allocation_summaries = [];

    if (Array.isArray(allocations)) {
      allocations.forEach(a => {
        const fund = funds.find(f => f.id === a.fund_id) || null;
        let amount = a.amount;
        let percentage = a.percentage;

        if (amount == null && percentage != null) {
          amount = (total_amount * percentage) / 100;
        } else if (amount != null && percentage == null) {
          percentage = (amount / total_amount) * 100;
        }

        const alloc = {
          id: this._generateId('donation_alloc'),
          donation_id: donation.id,
          fund_id: a.fund_id,
          amount: amount || 0,
          percentage: percentage || 0
        };
        donationAllocations.push(alloc);

        allocation_summaries.push({
          fund_name: fund ? fund.name : a.fund_id,
          amount: alloc.amount,
          percentage: alloc.percentage
        });
      });
    }

    const checkoutSession = {
      id: this._generateId('checkout'),
      context: 'donation',
      created_at: this._now(),
      updated_at: this._now(),
      experience_booking_ids: [],
      cart_id: null,
      donation_id: donation.id,
      contact_name: donor_name,
      contact_email: donor_email,
      payment_method_type,
      status: 'in_progress',
      total_amount,
      currency: donation.currency
    };

    checkoutSessions.push(checkoutSession);

    this._saveToStorage('donations', donations);
    this._saveToStorage('donation_allocations', donationAllocations);
    this._saveToStorage('checkout_sessions', checkoutSessions);
    localStorage.setItem('activeCheckoutSessionId', checkoutSession.id);

    return {
      success: true,
      donation_id: donation.id,
      checkout_session_id: checkoutSession.id,
      allocation_summaries,
      message: 'Donation created'
    };
  }

  // 36) getCheckoutSummary()
  getCheckoutSummary() {
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    const bookingsTable = this._getFromStorage('experience_bookings');
    const experiences = this._getFromStorage('experiences');
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const donations = this._getFromStorage('donations');
    const donationAllocations = this._getFromStorage('donation_allocations');
    const funds = this._getFromStorage('donation_funds');

    const activeId = localStorage.getItem('activeCheckoutSessionId') || '';
    const checkout_session = checkoutSessions.find(cs => cs.id === activeId) || null;

    if (!checkout_session) {
      return {
        checkout_session: null,
        bookings: [],
        cart: null,
        donation: null
      };
    }

    const bookings = (checkout_session.experience_booking_ids || []).map(id => {
      const b = bookingsTable.find(bb => bb.id === id);
      if (!b) return null;
      const experience = experiences.find(e => e.id === b.experience_id) || null;
      return {
        experience_booking_id: b.id,
        experience_type: b.experience_type,
        title: b.title_snapshot,
        start_date: b.start_date,
        end_date: b.end_date,
        duration_days: b.duration_days,
        participant_count: b.participant_count,
        room_type: b.room_type,
        meal_preference: b.meal_preference,
        selected_amenities: b.selected_amenities || [],
        batch_label: b.batch_label,
        pass_total_classes: b.pass_total_classes || null,
        total_price: b.total_price,
        currency: b.currency,
        // foreign key resolution
        experience
      };
    }).filter(Boolean);

    let cartSummary = null;
    if (checkout_session.cart_id) {
      const cart = carts.find(c => c.id === checkout_session.cart_id) || null;
      if (cart) {
        const items = cartItems.filter(ci => ci.cart_id === cart.id).map(ci => {
          const product = products.find(p => p.id === ci.product_id) || null;
          return Object.assign({}, ci, { product });
        });
        cartSummary = { cart, items };
      }
    }

    let donationSummary = null;
    if (checkout_session.donation_id) {
      const donation = donations.find(d => d.id === checkout_session.donation_id) || null;
      if (donation) {
        const allocations = donationAllocations.filter(da => da.donation_id === donation.id).map(da => {
          const fund = funds.find(f => f.id === da.fund_id) || null;
          return Object.assign({}, da, { fund });
        });
        donationSummary = { donation, allocations };
      }
    }

    return {
      checkout_session,
      bookings,
      cart: cartSummary,
      donation: donationSummary
    };
  }

  // 37) updateCheckoutContactInfo(contact_name, contact_email)
  updateCheckoutContactInfo(contact_name, contact_email) {
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    let activeId = localStorage.getItem('activeCheckoutSessionId') || '';
    let session = checkoutSessions.find(cs => cs.id === activeId) || null;

    if (!session) {
      session = this._getOrCreateCheckoutSession('mixed');
    }

    const idx = checkoutSessions.findIndex(cs => cs.id === session.id);
    if (idx === -1) {
      checkoutSessions.push(session);
    }

    session.contact_name = contact_name;
    session.contact_email = contact_email;
    session.updated_at = this._now();

    const index = checkoutSessions.findIndex(cs => cs.id === session.id);
    checkoutSessions[index] = session;
    this._saveToStorage('checkout_sessions', checkoutSessions);
    localStorage.setItem('activeCheckoutSessionId', session.id);

    return {
      success: true,
      checkout_session_id: session.id,
      contact_name,
      contact_email
    };
  }

  // 38) selectCheckoutPaymentMethod(payment_method_type)
  selectCheckoutPaymentMethod(payment_method_type) {
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    let activeId = localStorage.getItem('activeCheckoutSessionId') || '';
    let session = checkoutSessions.find(cs => cs.id === activeId) || null;

    if (!session) {
      session = this._getOrCreateCheckoutSession('mixed');
    }

    session.payment_method_type = payment_method_type;
    session.updated_at = this._now();

    const idx = checkoutSessions.findIndex(cs => cs.id === session.id);
    if (idx === -1) {
      checkoutSessions.push(session);
    } else {
      checkoutSessions[idx] = session;
    }

    this._saveToStorage('checkout_sessions', checkoutSessions);
    localStorage.setItem('activeCheckoutSessionId', session.id);

    return {
      success: true,
      checkout_session_id: session.id,
      payment_method_type
    };
  }

  // 39) finalizeCheckout()
  finalizeCheckout() {
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    const activeId = localStorage.getItem('activeCheckoutSessionId') || '';
    const session = checkoutSessions.find(cs => cs.id === activeId) || null;

    if (!session) {
      return {
        success: false,
        checkout_session_id: null,
        status: 'in_progress',
        total_amount: 0,
        currency: 'USD',
        message: 'No active checkout session'
      };
    }

    session.status = 'ready_for_payment';
    session.updated_at = this._now();

    const idx = checkoutSessions.findIndex(cs => cs.id === session.id);
    checkoutSessions[idx] = session;
    this._saveToStorage('checkout_sessions', checkoutSessions);

    return {
      success: true,
      checkout_session_id: session.id,
      status: session.status,
      total_amount: session.total_amount,
      currency: session.currency,
      message: 'Checkout finalized and ready for payment'
    };
  }

  // 40) getAboutPageContent()
  getAboutPageContent() {
    const teachers = this._getFromStorage('teachers').filter(t => t.is_active !== false);
    return {
      history_html: 'Our ashram has grown from a small riverside hermitage into a vibrant spiritual community.',
      mission_html: 'We preserve traditional yoga and meditation, offering them in an accessible way to sincere seekers.',
      lineage_html: 'Our teachings follow a classical Himalayan lineage of yoga and Vedanta.',
      environment_html: 'Nestled amidst trees and close to the river, the ashram provides a quiet, sattvic atmosphere.',
      facilities_html: 'Simple rooms, meditation halls, a library, organic food, and sacred spaces are available.',
      teacher_highlights: teachers
    };
  }

  // 41) getFaqContent()
  getFaqContent() {
    return [
      {
        id: 'faq_retreat_booking',
        category: 'Retreats',
        question: 'How do I book a retreat?',
        answer_html: 'Browse our retreats, select your dates and room type, then follow the checkout steps to confirm your booking.',
        related_policy_anchor: 'booking_policy'
      },
      {
        id: 'faq_cancellation',
        category: 'Policies',
        question: 'What is the cancellation policy?',
        answer_html: 'Cancellations up to 30 days before the start date usually receive a full or partial refund. Please see our detailed cancellation policy.',
        related_policy_anchor: 'cancellation_policy'
      },
      {
        id: 'faq_shop_shipping',
        category: 'Shop',
        question: 'Do you offer international shipping?',
        answer_html: 'Yes, we ship internationally. Shipping methods and costs are shown at checkout.',
        related_policy_anchor: 'shipping_returns'
      }
    ];
  }

  // 42) getPoliciesContent()
  getPoliciesContent() {
    return {
      terms_html: 'By using this website and booking services, you agree to our terms of use.',
      privacy_html: 'We respect your privacy and only use your data to manage your bookings, shop orders, and donations.',
      booking_policy_html: 'Bookings are confirmed after payment. Date changes are subject to availability and may incur fees.',
      payment_policy_html: 'We accept major cards, bank transfers, PayPal, and cash for on-site payments.',
      cancellation_policy_html: 'Cancellations must be requested in writing. Refunds depend on how many days before the start date the cancellation is received.',
      shipping_returns_policy_html: 'Shop orders are shipped within a reasonable time. Returns are accepted for unused items within 14 days of delivery.',
      contact_html: 'For any questions regarding policies, please contact us via the counseling/contact page.'
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
