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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage Helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'workshops',
      'instructors',
      'venues',
      'retreats',
      'newsletter_subscriptions',
      'faq_categories',
      'faq_items',
      'policies',
      'workshop_contact_messages',
      'contact_messages',
      'carts',
      'cart_items',
      'favorites',
      'my_schedule_items'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  _now() {
    return new Date().toISOString();
  }

  // ----------------------
  // Generic Helpers
  // ----------------------

  _dateFromDateTimeString(dateTimeStr) {
    if (!dateTimeStr) return null;
    // Expecting ISO string; compare by date portion
    if (typeof dateTimeStr === 'string') {
      return dateTimeStr.slice(0, 10);
    }
    // If stored as Date object (should not, but guard)
    try {
      return new Date(dateTimeStr).toISOString().slice(0, 10);
    } catch (e) {
      return null;
    }
  }

  _minutesFromDate(dateTimeStr) {
    if (!dateTimeStr) return null;
    const d = new Date(dateTimeStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  _minutesFromTimeString(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  _compareDates(a, b) {
    // a, b are ISO date strings 'YYYY-MM-DD' or full ISO
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  _resolveWorkshopForeignKeys(workshop) {
    if (!workshop) return null;
    const instructors = this._getFromStorage('instructors', []);
    const venues = this._getFromStorage('venues', []);
    const instructor = instructors.find((i) => i.id === workshop.instructor_id) || null;
    const venue = workshop.venue_id
      ? venues.find((v) => v.id === workshop.venue_id) || null
      : null;
    return {
      ...workshop,
      instructor,
      venue
    };
  }

  _resolveRetreatForeignKeys(retreat) {
    if (!retreat) return null;
    const instructors = this._getFromStorage('instructors', []);
    const venues = this._getFromStorage('venues', []);
    const instructor = retreat.instructor_id
      ? instructors.find((i) => i.id === retreat.instructor_id) || null
      : null;
    const venue = retreat.venue_id
      ? venues.find((v) => v.id === retreat.venue_id) || null
      : null;
    return {
      ...retreat,
      instructor,
      venue
    };
  }

  _resolveFAQItemForeignKeys(faqItem) {
    if (!faqItem) return null;
    const categories = this._getFromStorage('faq_categories', []);
    const policies = this._getFromStorage('policies', []);
    const category = categories.find((c) => c.id === faqItem.category_id) || null;
    const related_policy = faqItem.related_policy_id
      ? policies.find((p) => p.id === faqItem.related_policy_id) || null
      : null;
    return {
      ...faqItem,
      category,
      related_policy
    };
  }

  // ----------------------
  // Cart Helpers
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts', []);
    const index = carts.findIndex((c) => c.id === cart.id);
    if (index !== -1) {
      carts[index] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  // ----------------------
  // Schedule Helpers
  // ----------------------

  _detectScheduleConflicts(start_datetime, end_datetime) {
    const scheduleItems = this._getFromStorage('my_schedule_items', []);
    if (!start_datetime || !end_datetime) return [];
    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const conflicts = scheduleItems.filter((item) => {
      const existingStart = new Date(item.start_datetime);
      const existingEnd = new Date(item.end_datetime);
      if (Number.isNaN(existingStart.getTime()) || Number.isNaN(existingEnd.getTime())) {
        return false;
      }
      // Overlap if start < existingEnd && end > existingStart
      return start < existingEnd && end > existingStart;
    });
    return conflicts;
  }

  // ----------------------
  // Interface Implementations
  // ----------------------

  // getHomePageData()
  getHomePageData() {
    const intro_html = '';

    const navigation_tiles = [
      {
        key: 'workshops',
        title: 'Workshops',
        subtitle: 'Weekly & one-off classes',
        description: 'Browse upcoming butoh workshops for all levels.'
      },
      {
        key: 'festival_schedule',
        title: 'Festival Schedule',
        subtitle: 'Summer intensives',
        description: 'Explore the festival week workshops and performances.'
      },
      {
        key: 'retreats',
        title: 'Retreats & Intensives',
        subtitle: 'Multi-day practice',
        description: 'Residential butoh retreats and intensives.'
      },
      {
        key: 'instructors',
        title: 'Instructors',
        subtitle: 'Teaching artists',
        description: 'Meet the butoh teachers leading our offerings.'
      }
    ];

    const workshops = this._getFromStorage('workshops', []);
    const retreats = this._getFromStorage('retreats', []);

    const beginnerWorkshops = workshops.filter((w) => w.level === 'beginner');
    const youthWorkshops = workshops.filter((w) => w.audience === 'youth_teens');

    const featured_workshop_sections = [];

    if (beginnerWorkshops.length > 0) {
      featured_workshop_sections.push({
        section_key: 'featured_beginner',
        title: 'Beginner Workshops',
        description: 'Entry points into butoh for new movers.',
        workshops: beginnerWorkshops.slice(0, 5).map((w) => this._resolveWorkshopForeignKeys(w)),
        retreats: []
      });
    }

    if (youthWorkshops.length > 0) {
      featured_workshop_sections.push({
        section_key: 'featured_youth',
        title: 'Youth & Teen Workshops',
        description: 'Offerings for young dancers and teens.',
        workshops: youthWorkshops.slice(0, 5).map((w) => this._resolveWorkshopForeignKeys(w)),
        retreats: []
      });
    }

    if (retreats.length > 0) {
      featured_workshop_sections.push({
        section_key: 'featured_intensives',
        title: 'Retreats & Intensives',
        description: 'Multi-day immersive butoh practice.',
        workshops: [],
        retreats: retreats.slice(0, 5).map((r) => this._resolveRetreatForeignKeys(r))
      });
    }

    const instructors = this._getFromStorage('instructors', []);
    const featured_instructors = instructors.filter((i) => i.is_featured);

    const policies = this._getFromStorage('policies', []);
    const key_policies = policies.map((p) => ({
      policy_id: p.id,
      policy_type: p.policy_type,
      title: p.title,
      is_default: !!p.is_default_cancellation_policy
    }));

    return {
      intro_html,
      navigation_tiles,
      featured_workshop_sections,
      featured_instructors,
      key_policies
    };
  }

  // getWorkshopFilterOptions()
  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops', []);

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' },
      { value: 'open_level', label: 'Open level' }
    ];

    const audiences = [
      { value: 'adults', label: 'Adults' },
      { value: 'youth_teens', label: 'Youth / Teens' },
      { value: 'all_ages', label: 'All ages' }
    ];

    const formats = [
      { value: 'in_studio', label: 'In-studio' },
      { value: 'online', label: 'Online' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' },
      { value: 'multi_day', label: 'Multi-day' },
      { value: 'other', label: 'Other' }
    ];

    const time_range_presets = [
      {
        key: 'between_10_00_and_14_00',
        label: 'Between 10:00 and 14:00',
        start_time: '10:00',
        end_time: '14:00'
      },
      {
        key: 'after_17_00',
        label: 'After 17:00',
        start_time: '17:00',
        end_time: null
      }
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

    const duration_ranges = [
      { key: 'two_plus_hours', label: '2+ hours', min_hours: 2, max_hours: null },
      { key: 'three_plus_hours', label: '3+ hours', min_hours: 3, max_hours: null }
    ];

    let minPrice = null;
    let maxPrice = null;
    let currency = 'usd';

    workshops.forEach((w) => {
      if (typeof w.price === 'number') {
        if (minPrice === null || w.price < minPrice) minPrice = w.price;
        if (maxPrice === null || w.price > maxPrice) maxPrice = w.price;
      }
      if (w.currency && !currency) currency = w.currency;
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const price_range = { min: minPrice, max: maxPrice, currency };

    let minAge = null;
    let maxAge = null;
    workshops.forEach((w) => {
      if (typeof w.min_age === 'number') {
        if (minAge === null || w.min_age < minAge) minAge = w.min_age;
      }
      if (typeof w.max_age === 'number') {
        if (maxAge === null || w.max_age > maxAge) maxAge = w.max_age;
      }
    });

    if (minAge === null) minAge = 0;
    if (maxAge === null) maxAge = 0;

    const age_range = { min: minAge, max: maxAge };

    const venue_feature_labels = {
      wheelchair_accessible_entrance: 'Wheelchair accessible entrance',
      gender_neutral_changing_room: 'Gender-neutral changing room'
    };

    return {
      levels,
      audiences,
      formats,
      time_of_day_options,
      time_range_presets,
      day_of_week_options,
      duration_ranges,
      price_range,
      age_range,
      venue_feature_labels
    };
  }

  // searchWorkshops(query, filters, sort_by, page, page_size)
  searchWorkshops(query, filters, sort_by, page, page_size) {
    const workshopsRaw = this._getFromStorage('workshops', []);
    const venues = this._getFromStorage('venues', []);
    const instructors = this._getFromStorage('instructors', []);
    let items = workshopsRaw.filter((w) => w.status === 'published');

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    if (q) {
      items = items.filter((w) => {
        const instructor = instructors.find((i) => i.id === w.instructor_id);
        const haystack = [
          w.title || '',
          w.subtitle || '',
          w.description || '',
          instructor ? instructor.name || '' : ''
        ]
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (f.level) {
      items = items.filter((w) => w.level === f.level);
    }

    if (f.audience) {
      items = items.filter((w) => w.audience === f.audience);
    }

    if (typeof f.min_age === 'number' || typeof f.max_age === 'number') {
      const minAge = typeof f.min_age === 'number' ? f.min_age : null;
      const maxAge = typeof f.max_age === 'number' ? f.max_age : null;
      items = items.filter((w) => {
        const wMin = typeof w.min_age === 'number' ? w.min_age : null;
        const wMax = typeof w.max_age === 'number' ? w.max_age : null;
        if (minAge !== null && wMax !== null && wMax < minAge) return false;
        if (maxAge !== null && wMin !== null && wMin > maxAge) return false;
        return true;
      });
    }

    if (f.date_start || f.date_end) {
      const ds = f.date_start || null;
      const de = f.date_end || null;
      items = items.filter((w) => {
        const d = this._dateFromDateTimeString(w.start_datetime);
        if (!d) return false;
        if (ds && d < ds) return false;
        if (de && d > de) return false;
        return true;
      });
    }

    if (Array.isArray(f.time_of_day) && f.time_of_day.length > 0) {
      items = items.filter((w) => f.time_of_day.indexOf(w.time_of_day) !== -1);
    }

    if (f.time_range_preset_key) {
      const presets = this.getWorkshopFilterOptions().time_range_presets;
      const preset = presets.find((p) => p.key === f.time_range_preset_key);
      if (preset) {
        const presetStart = this._minutesFromTimeString(preset.start_time);
        const presetEnd = this._minutesFromTimeString(preset.end_time);
        items = items.filter((w) => {
          const sMin = this._minutesFromDate(w.start_datetime);
          const eMin = this._minutesFromDate(w.end_datetime);
          if (sMin === null || eMin === null) return false;
          if (presetStart !== null && sMin < presetStart) return false;
          if (presetEnd !== null && eMin > presetEnd) return false;
          return true;
        });
      }
    }

    if (Array.isArray(f.days_of_week) && f.days_of_week.length > 0) {
      items = items.filter((w) => f.days_of_week.indexOf(w.day_of_week) !== -1);
    }

    if (Array.isArray(f.format) && f.format.length > 0) {
      items = items.filter((w) => f.format.indexOf(w.format) !== -1);
    }

    if (typeof f.min_duration_hours === 'number') {
      items = items.filter((w) => typeof w.duration_hours === 'number' && w.duration_hours >= f.min_duration_hours);
    }

    if (typeof f.max_duration_hours === 'number') {
      items = items.filter((w) => typeof w.duration_hours === 'number' && w.duration_hours <= f.max_duration_hours);
    }

    if (typeof f.min_price === 'number') {
      items = items.filter((w) => typeof w.price === 'number' && w.price >= f.min_price);
    }

    if (typeof f.max_price === 'number') {
      items = items.filter((w) => typeof w.price === 'number' && w.price <= f.max_price);
    }

    if (f.currency) {
      items = items.filter((w) => w.currency === f.currency);
    }

    if (f.venue_features && (f.venue_features.wheelchair_accessible_entrance || f.venue_features.gender_neutral_changing_room)) {
      items = items.filter((w) => {
        if (!w.venue_id) return false;
        const venue = venues.find((v) => v.id === w.venue_id);
        if (!venue) return false;
        if (f.venue_features.wheelchair_accessible_entrance && !venue.wheelchair_accessible_entrance) {
          return false;
        }
        if (f.venue_features.gender_neutral_changing_room && !venue.gender_neutral_changing_room) {
          return false;
        }
        return true;
      });
    }

    if (typeof f.is_festival_event === 'boolean') {
      items = items.filter((w) => !!w.is_festival_event === f.is_festival_event);
    }

    if (f.instructor_id) {
      items = items.filter((w) => w.instructor_id === f.instructor_id);
    }

    // Sorting
    if (sort_by === 'price_low_to_high') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'soonest_date') {
      items.sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    } else if (sort_by === 'latest_date') {
      items.sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        return da > db ? -1 : da < db ? 1 : 0;
      });
    } else {
      // default: soonest_date
      items.sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    }

    const total_count = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const pagedItems = items.slice(startIndex, startIndex + size).map((w) => this._resolveWorkshopForeignKeys(w));

    return {
      items: pagedItems,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // getWorkshopDetails(workshopId)
  getWorkshopDetails(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find((w) => w.id === workshopId) || null;
    if (!workshop) {
      return {
        workshop: null,
        instructor: null,
        venue: null,
        is_favorited: false,
        allowed_payment_options: [],
        capacity_remaining: null,
        accessibility: {
          wheelchair_accessible_entrance: false,
          gender_neutral_changing_room: false
        },
        cancellation_policy: null,
        can_add_to_schedule: false
      };
    }

    const resolved = this._resolveWorkshopForeignKeys(workshop);
    const favorites = this._getFromStorage('favorites', []);
    const is_favorited = favorites.some((f) => f.workshop_id === workshop.id);

    const allowed_payment_options = Array.isArray(workshop.payment_options)
      ? workshop.payment_options.slice()
      : [];

    let capacity_remaining = null;
    if (typeof workshop.capacity_remaining === 'number') {
      capacity_remaining = workshop.capacity_remaining;
    }

    const venue = resolved.venue;
    const accessibility = {
      wheelchair_accessible_entrance: venue ? !!venue.wheelchair_accessible_entrance : false,
      gender_neutral_changing_room: venue ? !!venue.gender_neutral_changing_room : false
    };

    const cancellationPolicy = this.getDefaultCancellationPolicy();
    const cancellation_policy = cancellationPolicy
      ? {
          policy_id: cancellationPolicy.id,
          title: cancellationPolicy.title,
          summary_html: cancellationPolicy.content_html
        }
      : null;

    const can_add_to_schedule = true;

    return {
      workshop: resolved,
      instructor: resolved.instructor,
      venue: resolved.venue,
      is_favorited,
      allowed_payment_options,
      capacity_remaining,
      accessibility,
      cancellation_policy,
      can_add_to_schedule
    };
  }

  // addWorkshopToCart(workshopId, quantity, payment_option)
  addWorkshopToCart(workshopId, quantity, payment_option) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find((w) => w.id === workshopId && w.status === 'published');
    if (!workshop) {
      return { success: false, message: 'Workshop not found or not bookable', cart: null, items: [] };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;

    if (payment_option && Array.isArray(workshop.payment_options)) {
      if (workshop.payment_options.indexOf(payment_option) === -1) {
        return { success: false, message: 'Payment option not allowed for this workshop', cart: null, items: [] };
      }
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    // Try to merge with existing cart item for same workshop and payment_option
    let existingItem = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'workshop' &&
        ci.item_id === workshop.id &&
        ci.payment_option === (payment_option || ci.payment_option)
    );

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.added_at = this._now();
    } else {
      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'workshop',
        item_id: workshop.id,
        title: workshop.title,
        start_datetime: workshop.start_datetime || null,
        end_datetime: workshop.end_datetime || null,
        quantity: qty,
        unit_price: workshop.price,
        currency: workshop.currency,
        payment_option: payment_option || null,
        room_type: null,
        meal_option: null,
        added_at: this._now()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }
      if (cart.items.indexOf(cartItem.id) === -1) {
        cart.items.push(cartItem.id);
      }
    }

    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    // Return full cart items for this cart
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Workshop added to cart',
      cart,
      items: itemsForCart
    };
  }

  // addRetreatToCart(retreatId, quantity, room_type, meal_option)
  addRetreatToCart(retreatId, quantity, room_type, meal_option) {
    const retreats = this._getFromStorage('retreats', []);
    const retreat = retreats.find((r) => r.id === retreatId && r.status === 'published');
    if (!retreat) {
      return { success: false, message: 'Retreat not found or not bookable', cart: null, items: [] };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;

    if (room_type && Array.isArray(retreat.room_type_options)) {
      if (retreat.room_type_options.indexOf(room_type) === -1) {
        return { success: false, message: 'Room type not available for this retreat', cart: null, items: [] };
      }
    }

    if (meal_option && Array.isArray(retreat.meal_options_available)) {
      if (retreat.meal_options_available.indexOf(meal_option) === -1) {
        return { success: false, message: 'Meal option not available for this retreat', cart: null, items: [] };
      }
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'retreat',
      item_id: retreat.id,
      title: retreat.title,
      start_datetime: retreat.start_date || null,
      end_datetime: retreat.end_date || null,
      quantity: qty,
      unit_price: retreat.base_price,
      currency: retreat.currency,
      payment_option: null,
      room_type: room_type || retreat.default_room_type || null,
      meal_option: meal_option || retreat.default_meal_option || null,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    if (cart.items.indexOf(cartItem.id) === -1) {
      cart.items.push(cartItem.id);
    }

    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Retreat added to cart',
      cart,
      items: itemsForCart
    };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('carts', []);
    const cart = carts[0] || null;
    const cart_items = this._getFromStorage('cart_items', []);
    const workshops = this._getFromStorage('workshops', []);
    const retreats = this._getFromStorage('retreats', []);

    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        currency: null
      };
    }

    const items = [];
    let subtotal = 0;
    let currency = null;

    cart_items
      .filter((ci) => ci.cart_id === cart.id)
      .forEach((ci) => {
        let workshop = null;
        let retreat = null;
        if (ci.item_type === 'workshop') {
          const w = workshops.find((w) => w.id === ci.item_id) || null;
          workshop = w ? this._resolveWorkshopForeignKeys(w) : null;
        } else if (ci.item_type === 'retreat') {
          const r = retreats.find((r) => r.id === ci.item_id) || null;
          retreat = r ? this._resolveRetreatForeignKeys(r) : null;
        }
        items.push({ cart_item: ci, workshop, retreat });
        if (typeof ci.unit_price === 'number' && typeof ci.quantity === 'number') {
          subtotal += ci.unit_price * ci.quantity;
          if (!currency) currency = ci.currency || null;
        }
      });

    return {
      cart,
      items,
      subtotal,
      currency
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);
    const cartItem = cartItems.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, message: 'Cart item not found', cart: null, items: [] };
    }

    const cart = carts.find((c) => c.id === cartItem.cart_id) || null;
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null, items: [] };
    }

    const qty = Math.max(0, Math.floor(quantity));
    if (qty === 0) {
      // Remove item
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== cartItemId);
      }
    } else {
      cartItem.quantity = qty;
    }

    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const updatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Cart item quantity updated',
      cart,
      items: updatedItems
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const cartItem = cartItems.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, cart: null, items: [] };
    }

    const cart = carts.find((c) => c.id === cartItem.cart_id) || null;
    if (!cart) {
      return { success: false, cart: null, items: [] };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== cartItemId);
    }

    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const updatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      cart,
      items: updatedItems
    };
  }

  // addWorkshopToFavorites(workshopId)
  addWorkshopToFavorites(workshopId) {
    const favorites = this._getFromStorage('favorites', []);
    const existing = favorites.find((f) => f.workshop_id === workshopId);
    if (existing) {
      return { success: true, favorite: existing };
    }
    const favorite = {
      id: this._generateId('favorite'),
      workshop_id: workshopId,
      added_at: this._now()
    };
    favorites.push(favorite);
    this._saveToStorage('favorites', favorites);
    return { success: true, favorite };
  }

  // removeWorkshopFromFavorites(workshopId)
  removeWorkshopFromFavorites(workshopId) {
    let favorites = this._getFromStorage('favorites', []);
    const before = favorites.length;
    favorites = favorites.filter((f) => f.workshop_id !== workshopId);
    this._saveToStorage('favorites', favorites);
    return { success: favorites.length < before };
  }

  // getFavoriteWorkshops()
  getFavoriteWorkshops() {
    const favorites = this._getFromStorage('favorites', []);
    const workshops = this._getFromStorage('workshops', []);
    const result = favorites.map((fav) => {
      const w = workshops.find((w) => w.id === fav.workshop_id) || null;
      const workshop = w ? this._resolveWorkshopForeignKeys(w) : null;
      return { favorite: fav, workshop };
    });
    return { favorites: result };
  }

  // addWorkshopToMySchedule(workshopId, source)
  addWorkshopToMySchedule(workshopId, source) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find((w) => w.id === workshopId && w.status === 'published');
    if (!workshop) {
      return { success: false, schedule_item: null, conflicts: [], message: 'Workshop not found' };
    }

    const conflicts = this._detectScheduleConflicts(workshop.start_datetime, workshop.end_datetime);
    if (conflicts.length > 0) {
      return {
        success: false,
        schedule_item: null,
        conflicts,
        message: 'Schedule conflict detected'
      };
    }

    const scheduleItems = this._getFromStorage('my_schedule_items', []);
    const schedule_item = {
      id: this._generateId('schedule_item'),
      workshop_id: workshop.id,
      title: workshop.title,
      start_datetime: workshop.start_datetime,
      end_datetime: workshop.end_datetime,
      source: source || 'other',
      added_at: this._now(),
      notes: ''
    };

    scheduleItems.push(schedule_item);
    this._saveToStorage('my_schedule_items', scheduleItems);

    return {
      success: true,
      schedule_item,
      conflicts: [],
      message: 'Workshop added to schedule'
    };
  }

  // removeMyScheduleItem(scheduleItemId)
  removeMyScheduleItem(scheduleItemId) {
    let items = this._getFromStorage('my_schedule_items', []);
    const before = items.length;
    items = items.filter((i) => i.id !== scheduleItemId);
    this._saveToStorage('my_schedule_items', items);
    return { success: items.length < before };
  }

  // getMyScheduleForRange(date_start, date_end)
  getMyScheduleForRange(date_start, date_end) {
    const scheduleItems = this._getFromStorage('my_schedule_items', []);
    const workshops = this._getFromStorage('workshops', []);

    const items = scheduleItems
      .filter((item) => {
        const d = this._dateFromDateTimeString(item.start_datetime);
        if (!d) return false;
        if (date_start && d < date_start) return false;
        if (date_end && d > date_end) return false;
        return true;
      })
      .map((item) => {
        const w = workshops.find((w) => w.id === item.workshop_id) || null;
        const workshop = w ? this._resolveWorkshopForeignKeys(w) : null;
        return { schedule_item: item, workshop };
      });

    return { items };
  }

  // getFestivalSchedule(view_mode, date_start, date_end, level, time_of_day)
  getFestivalSchedule(view_mode, date_start, date_end, level, time_of_day) {
    const workshopsRaw = this._getFromStorage('workshops', []);

    let ds = date_start;
    let de = date_end;

    if (!de && view_mode === 'week' && ds) {
      const dStart = new Date(ds + 'T00:00:00Z');
      const dEnd = new Date(dStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      de = dEnd.toISOString().slice(0, 10);
    }

    let items = workshopsRaw.filter((w) => w.status === 'published' && !!w.is_festival_event);

    if (ds || de) {
      items = items.filter((w) => {
        const d = this._dateFromDateTimeString(w.start_datetime);
        if (!d) return false;
        if (ds && d < ds) return false;
        if (de && d > de) return false;
        return true;
      });
    }

    if (level) {
      items = items.filter((w) => w.level === level);
    }

    if (Array.isArray(time_of_day) && time_of_day.length > 0) {
      items = items.filter((w) => time_of_day.indexOf(w.time_of_day) !== -1);
    }

    items.sort((a, b) => {
      const da = a.start_datetime || '';
      const db = b.start_datetime || '';
      return da < db ? -1 : da > db ? 1 : 0;
    });

    const workshops = items.map((w) => this._resolveWorkshopForeignKeys(w));

    return {
      view_mode,
      date_start: ds || null,
      date_end: de || null,
      workshops
    };
  }

  // getRetreatFilterOptions()
  getRetreatFilterOptions() {
    const retreats = this._getFromStorage('retreats', []);

    const length_categories = [
      { value: 'one_day', label: '1 day' },
      { value: 'two_days', label: '2 days' },
      { value: 'three_days', label: '3 days' },
      { value: 'four_plus_days', label: '4+ days' }
    ];

    const type_tags = [
      { value: 'residential', label: 'Residential' },
      { value: 'includes_lodging', label: 'Includes lodging' }
    ];

    let minDate = null;
    let maxDate = null;

    retreats.forEach((r) => {
      const sd = this._dateFromDateTimeString(r.start_date);
      const ed = this._dateFromDateTimeString(r.end_date);
      if (sd) {
        if (!minDate || sd < minDate) minDate = sd;
        if (!maxDate || sd > maxDate) maxDate = sd;
      }
      if (ed) {
        if (!minDate || ed < minDate) minDate = ed;
        if (!maxDate || ed > maxDate) maxDate = ed;
      }
    });

    const date_range = {
      min: minDate,
      max: maxDate
    };

    let minPrice = null;
    let maxPrice = null;
    let currency = 'usd';

    retreats.forEach((r) => {
      if (typeof r.base_price === 'number') {
        if (minPrice === null || r.base_price < minPrice) minPrice = r.base_price;
        if (maxPrice === null || r.base_price > maxPrice) maxPrice = r.base_price;
      }
      if (r.currency && !currency) currency = r.currency;
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const price_range = { min: minPrice, max: maxPrice, currency };

    return {
      length_categories,
      type_tags,
      date_range,
      price_range
    };
  }

  // searchRetreats(filters, sort_by, page, page_size)
  searchRetreats(filters, sort_by, page, page_size) {
    const retreatsRaw = this._getFromStorage('retreats', []);
    const f = filters || {};

    let items = retreatsRaw.filter((r) => r.status === 'published');

    if (f.date_start || f.date_end) {
      const ds = f.date_start || null;
      const de = f.date_end || null;
      items = items.filter((r) => {
        const sd = this._dateFromDateTimeString(r.start_date);
        if (!sd) return false;
        if (ds && sd < ds) return false;
        if (de && sd > de) return false;
        return true;
      });
    }

    if (Array.isArray(f.length_categories) && f.length_categories.length > 0) {
      items = items.filter((r) => f.length_categories.indexOf(r.length_category) !== -1);
    }

    if (Array.isArray(f.type_tags) && f.type_tags.length > 0) {
      items = items.filter((r) => {
        if (!Array.isArray(r.type_tags)) return false;
        return f.type_tags.every((tag) => r.type_tags.indexOf(tag) !== -1);
      });
    }

    if (typeof f.includes_lodging === 'boolean') {
      items = items.filter((r) => {
        if (f.includes_lodging) {
          const hasTag = Array.isArray(r.type_tags) && r.type_tags.indexOf('includes_lodging') !== -1;
          return !!r.includes_lodging || hasTag;
        }
        return true;
      });
    }

    if (typeof f.max_price === 'number') {
      items = items.filter((r) => typeof r.base_price === 'number' && r.base_price <= f.max_price);
    }

    if (f.currency) {
      items = items.filter((r) => r.currency === f.currency);
    }

    if (sort_by === 'price_low_to_high') {
      items.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sort_by === 'start_date_asc') {
      items.sort((a, b) => {
        const da = a.start_date || '';
        const db = b.start_date || '';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    } else {
      items.sort((a, b) => {
        const da = a.start_date || '';
        const db = b.start_date || '';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    }

    const total_count = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const pagedItems = items.slice(startIndex, startIndex + size).map((r) => this._resolveRetreatForeignKeys(r));

    return {
      items: pagedItems,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // getRetreatDetails(retreatId)
  getRetreatDetails(retreatId) {
    const retreats = this._getFromStorage('retreats', []);
    const retreat = retreats.find((r) => r.id === retreatId) || null;
    if (!retreat) {
      return {
        retreat: null,
        instructor: null,
        venue: null,
        available_room_types: [],
        available_meal_options: [],
        cancellation_policy: null
      };
    }

    const resolved = this._resolveRetreatForeignKeys(retreat);

    const available_room_types = Array.isArray(retreat.room_type_options)
      ? retreat.room_type_options.slice()
      : [];

    const available_meal_options = Array.isArray(retreat.meal_options_available)
      ? retreat.meal_options_available.slice()
      : [];

    const policy = this.getDefaultCancellationPolicy();
    const cancellation_policy = policy
      ? {
          policy_id: policy.id,
          title: policy.title,
          summary_html: policy.content_html
        }
      : null;

    return {
      retreat: resolved,
      instructor: resolved.instructor,
      venue: resolved.venue,
      available_room_types,
      available_meal_options,
      cancellation_policy
    };
  }

  // getInstructorsOverview()
  getInstructorsOverview() {
    const instructors = this._getFromStorage('instructors', []);
    const featured_instructors = instructors.filter((i) => i.is_featured);
    const all_instructors = instructors;
    return { featured_instructors, all_instructors };
  }

  // searchInstructors(query)
  searchInstructors(query) {
    const q = (query || '').trim().toLowerCase();
    const instructors = this._getFromStorage('instructors', []);
    if (!q) return instructors;
    return instructors.filter((i) => {
      const haystack = [i.name || '', i.tagline || '', i.primary_style || '']
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  // getInstructorProfile(instructorId)
  getInstructorProfile(instructorId) {
    const instructors = this._getFromStorage('instructors', []);
    const instructor = instructors.find((i) => i.id === instructorId) || null;
    if (!instructor) {
      return {
        instructor: null,
        bio_html: '',
        highlight_metrics: {
          years_teaching: 0
        }
      };
    }
    return {
      instructor,
      bio_html: instructor.bio || '',
      highlight_metrics: {
        years_teaching: typeof instructor.years_teaching === 'number' ? instructor.years_teaching : 0
      }
    };
  }

  // getInstructorUpcomingWorkshops(instructorId, filters, sort_by)
  getInstructorUpcomingWorkshops(instructorId, filters, sort_by) {
    const workshopsRaw = this._getFromStorage('workshops', []);
    const f = filters || {};

    let items = workshopsRaw.filter(
      (w) => w.status === 'published' && w.instructor_id === instructorId
    );

    if (f.date_start || f.date_end) {
      const ds = f.date_start || null;
      const de = f.date_end || null;
      items = items.filter((w) => {
        const d = this._dateFromDateTimeString(w.start_datetime);
        if (!d) return false;
        if (ds && d < ds) return false;
        if (de && d > de) return false;
        return true;
      });
    }

    if (typeof f.max_price === 'number') {
      items = items.filter((w) => typeof w.price === 'number' && w.price <= f.max_price);
    }

    if (f.currency) {
      items = items.filter((w) => w.currency === f.currency);
    }

    if (sort_by === 'price_low_to_high') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'soonest_date') {
      items.sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    } else {
      items.sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    }

    return items.map((w) => this._resolveWorkshopForeignKeys(w));
  }

  // getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const frequencies = [
      {
        value: 'monthly_digest',
        label: 'Monthly digest',
        description: 'A monthly summary of upcoming workshops and performances.'
      },
      {
        value: 'weekly_updates',
        label: 'Weekly updates',
        description: 'Weekly schedule updates and new offerings.'
      },
      {
        value: 'event_reminders',
        label: 'Event reminders',
        description: 'Reminders for key workshops and performances.'
      },
      {
        value: 'occasional_announcements',
        label: 'Occasional announcements',
        description: 'Occasional important news and opportunities.'
      }
    ];

    const topics = [
      { value: 'workshop_updates', label: 'Workshop updates' },
      { value: 'performance_announcements', label: 'Performance announcements' },
      { value: 'general_school_news', label: 'General school news' }
    ];

    const preferred_cities = [
      { value: 'tokyo', label: 'Tokyo' },
      { value: 'osaka', label: 'Osaka' },
      { value: 'kyoto', label: 'Kyoto' },
      { value: 'online', label: 'Online' },
      { value: 'other', label: 'Other' }
    ];

    return {
      frequencies,
      topics,
      preferred_cities
    };
  }

  // subscribeToNewsletter(email, frequency, topics, preferred_city)
  subscribeToNewsletter(email, frequency, topics, preferred_city) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    let subscription = subscriptions.find((s) => s.email === email) || null;

    if (!Array.isArray(topics)) {
      topics = [];
    }

    if (subscription) {
      subscription.frequency = frequency;
      subscription.topics = topics;
      subscription.preferred_city = preferred_city || null;
      subscription.unsubscribed = false;
      subscription.unsubscribed_at = null;
    } else {
      subscription = {
        id: this._generateId('newsletter'),
        email,
        frequency,
        topics,
        preferred_city: preferred_city || null,
        created_at: this._now(),
        unsubscribed: false,
        unsubscribed_at: null
      };
      subscriptions.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription,
      message: 'Subscription saved'
    };
  }

  // getFAQCategories()
  getFAQCategories() {
    const categories = this._getFromStorage('faq_categories', []);
    return categories;
  }

  // searchFAQItems(categoryId, query)
  searchFAQItems(categoryId, query) {
    const faqItemsRaw = this._getFromStorage('faq_items', []);
    const q = (query || '').trim().toLowerCase();

    let items = faqItemsRaw.filter((fi) => fi.is_active);

    if (categoryId) {
      items = items.filter((fi) => fi.category_id === categoryId);
    }

    if (q) {
      items = items.filter((fi) => {
        const keywords = Array.isArray(fi.keywords) ? fi.keywords.join(' ') : '';
        const haystack = ((fi.question || '') + ' ' + keywords).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    return items.map((fi) => this._resolveFAQItemForeignKeys(fi));
  }

  // getFAQItemDetails(faqItemId)
  getFAQItemDetails(faqItemId) {
    const faqItems = this._getFromStorage('faq_items', []);
    const policies = this._getFromStorage('policies', []);
    const faq_item = faqItems.find((fi) => fi.id === faqItemId) || null;
    if (!faq_item) {
      return { faq_item: null, related_policy: null };
    }
    const related_policy = faq_item.related_policy_id
      ? policies.find((p) => p.id === faq_item.related_policy_id) || null
      : null;
    return { faq_item, related_policy };
  }

  // getPolicyDocument(policyId)
  getPolicyDocument(policyId) {
    const policies = this._getFromStorage('policies', []);
    const policy = policies.find((p) => p.id === policyId) || null;

    // Instrumentation for task completion tracking
    try {
      if (policy && policy.policy_type === 'cancellation_refund') {
        localStorage.setItem(
          'task7_cancellationPolicyViewed',
          JSON.stringify({ "policy_id": policy.id, "is_default": !!policy.is_default_cancellation_policy, "viewed_at": this._now() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return policy;
  }

  // getDefaultCancellationPolicy()
  getDefaultCancellationPolicy() {
    const policies = this._getFromStorage('policies', []);
    const policy =
      policies.find(
        (p) => p.policy_type === 'cancellation_refund' && p.is_default_cancellation_policy
      ) || null;
    return policy;
  }

  // sendWorkshopQuestion(workshopId, name, email, message, topic)
  sendWorkshopQuestion(workshopId, name, email, message, topic) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find((w) => w.id === workshopId) || null;
    if (!workshop) {
      return {
        workshop_contact_message: null,
        success: false,
        message: 'Workshop not found'
      };
    }

    const messages = this._getFromStorage('workshop_contact_messages', []);
    const contactMessage = {
      id: this._generateId('workshop_msg'),
      workshop_id: workshopId,
      name,
      email,
      message,
      topic: topic || null,
      created_at: this._now(),
      status: 'received'
    };

    messages.push(contactMessage);
    this._saveToStorage('workshop_contact_messages', messages);

    return {
      workshop_contact_message: contactMessage,
      success: true,
      message: 'Message received'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    // Content may be managed externally; default to empty structure
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      mission_html: '',
      history_html: '',
      approach_html: '',
      team_members: []
    };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    const stored = this._getFromStorage('contact_page_info', null);
    const topics = [
      { value: 'general_question', label: 'General question' },
      { value: 'press', label: 'Press' },
      { value: 'accessibility', label: 'Accessibility' },
      { value: 'booking_issue', label: 'Booking issue' },
      { value: 'other', label: 'Other' }
    ];

    if (stored && typeof stored === 'object') {
      return {
        topics,
        address: stored.address || '',
        phone: stored.phone || '',
        email: stored.email || '',
        response_time_info: stored.response_time_info || ''
      };
    }

    return {
      topics,
      address: '',
      phone: '',
      email: '',
      response_time_info: ''
    };
  }

  // sendGeneralContactMessage(name, email, topic, message)
  sendGeneralContactMessage(name, email, topic, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const contactMessage = {
      id: this._generateId('contact_msg'),
      name,
      email,
      topic: topic || null,
      message,
      created_at: this._now(),
      status: 'received'
    };
    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);
    return {
      contact_message: contactMessage,
      success: true,
      message: 'Message received'
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