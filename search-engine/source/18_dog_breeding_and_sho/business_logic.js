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

  // ---------- Storage helpers ----------

  _initStorage() {
    // Arrays
    const arrayKeys = [
      'puppies',
      'puppy_reservations',
      'litters',
      'waitlist_entries',
      'stud_dogs',
      'stud_inquiries',
      'tour_slots',
      'tour_bookings',
      'events',
      'event_registrations',
      'show_watchlist_items',
      'product_categories',
      'products',
      'cart_items',
      'orders',
      'order_items',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single objects or nullable
    const objectKeys = [
      'cart',
      'puppies_listing_filters',
      'stud_listing_filters',
      'events_listing_filters',
      'shop_listing_filters'
    ];

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, 'null');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  }

  _haversineMiles(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 3958.8; // miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _getZipLatLng(zip) {
    // Minimal built-in mapping for needed ZIPs
    const map = {
      '90001': { lat: 33.973, lon: -118.248 }, // Los Angeles approx
      '60601': { lat: 41.8864, lon: -87.6186 } // Chicago Loop approx
    };
    return map[zip] || null;
  }

  // ---------- Foreign key resolution helpers ----------

  _attachPuppyRelations(puppy) {
    if (!puppy) return null;
    const litters = this._getFromStorage('litters', []);
    const studs = this._getFromStorage('stud_dogs', []);
    const litter = puppy.litter_id
      ? litters.find((l) => l.id === puppy.litter_id) || null
      : null;
    const sire = puppy.sire_id
      ? studs.find((s) => s.id === puppy.sire_id) || null
      : null;
    return Object.assign({}, puppy, { litter, sire });
  }

  _attachCartItemRelations(items) {
    const products = this._getFromStorage('products', []);
    return items.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return Object.assign({}, item, { product });
    });
  }

  _attachWaitlistEntryRelations(entry) {
    if (!entry) return null;
    const litters = this._getFromStorage('litters', []);
    const litter = litters.find((l) => l.id === entry.litter_id) || null;
    return Object.assign({}, entry, { litter });
  }

  _attachPuppyReservationRelations(reservation) {
    if (!reservation) return null;
    const puppies = this._getFromStorage('puppies', []);
    const puppy = puppies.find((p) => p.id === reservation.puppy_id) || null;
    return Object.assign({}, reservation, { puppy: this._attachPuppyRelations(puppy) });
  }

  _attachStudInquiryRelations(inquiry) {
    if (!inquiry) return null;
    const studs = this._getFromStorage('stud_dogs', []);
    const stud_dog = studs.find((s) => s.id === inquiry.stud_dog_id) || null;
    return Object.assign({}, inquiry, { stud_dog });
  }

  _attachTourBookingRelations(booking) {
    if (!booking) return null;
    const slots = this._getFromStorage('tour_slots', []);
    const tour_slot = slots.find((s) => s.id === booking.tour_slot_id) || null;
    return Object.assign({}, booking, { tour_slot });
  }

  _attachEventRegistrationRelations(reg) {
    if (!reg) return null;
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === reg.event_id) || null;
    return Object.assign({}, reg, { event });
  }

  _attachShowWatchlistItemRelations(item) {
    if (!item) return null;
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === item.event_id) || null;
    return Object.assign({}, item, { event });
  }

  _attachOrderItemRelations(orderItem) {
    if (!orderItem) return null;
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === orderItem.product_id) || null;
    return Object.assign({}, orderItem, { product });
  }

  _attachContactMessageRelations(msg) {
    if (!msg) return null;
    const puppies = this._getFromStorage('puppies', []);
    const puppy = msg.related_puppy_id
      ? puppies.find((p) => p.id === msg.related_puppy_id) || null
      : null;
    return Object.assign({}, msg, { puppy });
  }

  _attachProductRelations(product) {
    if (!product) return null;
    const categories = this._getFromStorage('product_categories', []);
    const category = categories.find((c) => c.id === product.category_id) || null;
    return Object.assign({}, product, { category });
  }

  // ---------- Helper functions specified in schema ----------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        subtotal: 0,
        shipping_total: 0,
        total: 0
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    if (!cart) return null;
    const items = allCartItems.filter((i) => i.cart_id === cart.id);
    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    // Simple shipping model: flat 0 for now (could be extended)
    const shipping_total = 0;
    cart.subtotal = subtotal;
    cart.shipping_total = shipping_total;
    cart.total = subtotal + shipping_total;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', allCartItems);
    return cart;
  }

  _getCurrentPuppiesListingFilterState() {
    let state = this._getFromStorage('puppies_listing_filters', null);
    if (!state) {
      state = {
        id: 'puppies_filters',
        view: 'available',
        sex: 'either',
        price_min: null,
        price_max: null,
        availability_start: null,
        availability_end: null,
        placement_type: null,
        sire_title_minimum: 'none',
        sort_by: 'price_low_to_high'
      };
      this._saveToStorage('puppies_listing_filters', state);
    }
    return state;
  }

  _getCurrentStudListingFilterState() {
    let state = this._getFromStorage('stud_listing_filters', null);
    if (!state) {
      state = {
        id: 'stud_filters',
        stud_fee_min: null,
        stud_fee_max: null,
        hip_score: 'any',
        dna_status: 'any',
        sort_by: 'stud_fee_low_to_high'
      };
      this._saveToStorage('stud_listing_filters', state);
    }
    return state;
  }

  _getCurrentEventsListingFilterState() {
    let state = this._getFromStorage('events_listing_filters', null);
    if (!state) {
      state = {
        id: 'events_filters',
        category: null,
        view: 'list',
        date_start: null,
        date_end: null,
        zip: null,
        distance_miles: null,
        event_type: 'any',
        only_kennel_participating: false,
        sort_by: 'date_soonest'
      };
      this._saveToStorage('events_listing_filters', state);
    }
    return state;
  }

  _getCurrentShopListingFilterState() {
    let state = this._getFromStorage('shop_listing_filters', null);
    if (!state) {
      state = {
        id: 'shop_filters',
        category_id: null,
        search_query: '',
        price_min: null,
        price_max: null,
        min_rating: null,
        free_shipping_only: false,
        sort_by: 'price_low_to_high'
      };
      this._saveToStorage('shop_listing_filters', state);
    }
    return state;
  }

  _getOrCreateShowWatchlist() {
    // For this schema, show_watchlist_items is just an array; ensure it exists
    const items = this._getFromStorage('show_watchlist_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('show_watchlist_items', []);
      return [];
    }
    return items;
  }

  // ---------- Interface implementations ----------
  // getHomeHighlights

  getHomeHighlights() {
    const puppies = this._getFromStorage('puppies', []);
    const litters = this._getFromStorage('litters', []);
    const studs = this._getFromStorage('stud_dogs', []);
    const events = this._getFromStorage('events', []);

    const featured_puppies = puppies
      .filter((p) => p.status === 'available')
      .slice(0, 4)
      .map((p) => this._attachPuppyRelations(p));

    const featured_litters = litters
      .filter((l) => l.status === 'planned' || l.status === 'available')
      .slice(0, 3);

    const featured_stud_dogs = studs.slice(0, 3);

    const upcoming_events = events
      .filter((e) => e.status === 'scheduled')
      .sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime))
      .slice(0, 5);

    const kennel_summary = {
      headline: 'Preserving type, temperament, and soundness',
      breeding_focus: 'Selective breeding of quality dogs for conformation, performance, and loving companions.',
      health_testing_summary: 'All breeding stock is fully health tested to current breed club recommendations.',
      show_achievements_summary: 'Multiple champions, group placements, and performance titles from limited breeding.'
    };

    return {
      featured_puppies,
      featured_litters,
      featured_stud_dogs,
      upcoming_events,
      kennel_summary
    };
  }

  // getAboutContent

  getAboutContent() {
    return {
      history: 'Our kennel has been carefully developing a consistent line of dogs focused on structure, temperament, and health for many years.',
      mission: 'To produce healthy, stable dogs that can succeed in the show ring, in performance sports, and as cherished family companions.',
      breeding_philosophy: 'We breed sparingly, planning each litter with specific goals in mind and prioritizing health testing, temperament, and correct breed type.',
      health_testing_standards: 'Parents are fully health tested according to breed club guidelines, including hips, elbows (where relevant), cardiac, eyes, and recommended DNA panels.',
      show_achievements: 'Our dogs have earned champion titles, group placements, and performance titles across multiple venues.',
      call_to_action_links: [
        { label: 'View Available Puppies', target_page: 'available_puppies' },
        { label: 'See Planned Litters', target_page: 'planned_litters' },
        { label: 'Meet Our Stud Dogs', target_page: 'stud_dogs' },
        { label: 'Upcoming Shows', target_page: 'show_schedule' }
      ]
    };
  }

  // getPuppiesAndLittersFilterOptions

  getPuppiesAndLittersFilterOptions() {
    const puppies = this._getFromStorage('puppies', []);
    const litters = this._getFromStorage('litters', []);

    const allPrices = puppies.map((p) => p.price).filter((v) => typeof v === 'number');
    const price_range_suggested = {
      min: allPrices.length ? Math.min.apply(null, allPrices) : 0,
      max: allPrices.length ? Math.max.apply(null, allPrices) : 5000
    };

    const colorSet = new Set();
    litters.forEach((l) => {
      if (Array.isArray(l.expected_colors)) {
        l.expected_colors.forEach((c) => {
          if (c) colorSet.add(String(c));
        });
      }
    });

    return {
      sex_options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'either', label: 'Either' }
      ],
      placement_type_options: [
        { value: 'pet_companion', label: 'Pet / Companion' },
        { value: 'show_prospect', label: 'Show Prospect' },
        { value: 'performance_prospect', label: 'Performance Prospect' },
        { value: 'breeding_prospect', label: 'Breeding Prospect' }
      ],
      sire_title_minimum_options: [
        { value: 'none', label: 'Any sire' },
        { value: 'ch', label: 'Champion (CH) or higher' },
        { value: 'gch', label: 'Grand Champion (GCH) or higher' },
        { value: 'bis', label: 'Best In Show (BIS) only' }
      ],
      price_range_suggested,
      expected_color_options: Array.from(colorSet),
      parents_fully_health_tested_label: 'Both parents fully health tested'
    };
  }

  // listAvailablePuppies

  listAvailablePuppies(
    sex,
    price_min,
    price_max,
    availability_start,
    availability_end,
    placement_type,
    sire_title_minimum,
    sort_by
  ) {
    let puppies = this._getFromStorage('puppies', []);

    // Only currently marketable puppies
    puppies = puppies.filter((p) => p.status === 'available');

    if (sex && sex !== 'either') {
      puppies = puppies.filter((p) => p.sex === sex);
    }

    if (typeof price_min === 'number') {
      puppies = puppies.filter((p) => typeof p.price === 'number' && p.price >= price_min);
    }

    if (typeof price_max === 'number') {
      puppies = puppies.filter((p) => typeof p.price === 'number' && p.price <= price_max);
    }

    if (availability_start || availability_end) {
      const start = this._parseDate(availability_start);
      const end = this._parseDate(availability_end);
      puppies = puppies.filter((p) => {
        const avail = this._parseDate(p.availability_date);
        if (!avail) return false;
        if (start && avail < start) return false;
        if (end && avail > end) return false;
        return true;
      });
    }

    if (placement_type) {
      puppies = puppies.filter((p) => p.placement_type === placement_type);
    }

    if (sire_title_minimum && sire_title_minimum !== 'none') {
      puppies = puppies.filter((p) => {
        const isChampionFlag = !!p.sire_is_champion_or_higher;
        const titles = Array.isArray(p.sire_titles) ? p.sire_titles : [];
        const hasCH = titles.includes('CH') || titles.includes('Ch');
        const hasGCH = titles.includes('GCH');
        const hasBIS = titles.includes('BIS');
        if (sire_title_minimum === 'ch') {
          return isChampionFlag || hasCH || hasGCH || hasBIS;
        }
        if (sire_title_minimum === 'gch') {
          return hasGCH || hasBIS;
        }
        if (sire_title_minimum === 'bis') {
          return hasBIS;
        }
        return true;
      });
    }

    if (sort_by === 'price_low_to_high') {
      puppies.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      puppies.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'availability_date') {
      puppies.sort((a, b) => this._compareDatesAsc(a.availability_date, b.availability_date));
    } else if (sort_by === 'age') {
      // Older (earlier DOB) first
      puppies.sort((a, b) => this._compareDatesAsc(a.date_of_birth, b.date_of_birth));
    }

    return puppies.map((p) => this._attachPuppyRelations(p));
  }

  // listPlannedLitters

  listPlannedLitters(parents_fully_health_tested, expected_color, price_min, price_max, sort_by) {
    let litters = this._getFromStorage('litters', []);

    // Focus on planned / confirmed litters
    litters = litters.filter((l) => l.status === 'planned' || l.status === 'confirmed');

    if (parents_fully_health_tested === true) {
      litters = litters.filter((l) => l.parents_fully_health_tested === true);
    }

    if (expected_color) {
      const needle = expected_color.toLowerCase();
      litters = litters.filter((l) => {
        if (!Array.isArray(l.expected_colors)) return false;
        return l.expected_colors.some((c) => String(c).toLowerCase().indexOf(needle) !== -1);
      });
    }

    if (typeof price_min === 'number') {
      litters = litters.filter((l) => {
        const min = typeof l.price_range_min === 'number' ? l.price_range_min : null;
        const max = typeof l.price_range_max === 'number' ? l.price_range_max : null;
        if (min != null && max != null) {
          return max >= price_min;
        }
        if (min != null) return min >= price_min;
        return true;
      });
    }

    if (typeof price_max === 'number') {
      litters = litters.filter((l) => {
        const min = typeof l.price_range_min === 'number' ? l.price_range_min : null;
        const max = typeof l.price_range_max === 'number' ? l.price_range_max : null;
        if (min != null && max != null) {
          return min <= price_max;
        }
        if (max != null) return max <= price_max;
        return true;
      });
    }

    if (sort_by === 'availability_date') {
      litters.sort((a, b) => {
        const aDate = a.expected_availability_date || a.expected_whelp_date;
        const bDate = b.expected_availability_date || b.expected_whelp_date;
        return this._compareDatesAsc(aDate, bDate);
      });
    } else if (sort_by === 'price_low_to_high') {
      litters.sort((a, b) => {
        const aMin = typeof a.price_range_min === 'number' ? a.price_range_min : 0;
        const bMin = typeof b.price_range_min === 'number' ? b.price_range_min : 0;
        return aMin - bMin;
      });
    }

    return litters;
  }

  // getPuppyDetail

  getPuppyDetail(puppyId) {
    const puppies = this._getFromStorage('puppies', []);
    const litters = this._getFromStorage('litters', []);
    const studs = this._getFromStorage('stud_dogs', []);
    const puppy = puppies.find((p) => p.id === puppyId) || null;
    if (!puppy) {
      return { puppy: null, litter: null, sire: null, related_puppies: [] };
    }
    const litter = puppy.litter_id
      ? litters.find((l) => l.id === puppy.litter_id) || null
      : null;
    const sire = puppy.sire_id
      ? studs.find((s) => s.id === puppy.sire_id) || null
      : null;
    const related_puppies = this.getRelatedPuppies(puppyId);
    return {
      puppy: this._attachPuppyRelations(puppy),
      litter,
      sire,
      related_puppies
    };
  }

  // getLitterDetail

  getLitterDetail(litterId) {
    const litters = this._getFromStorage('litters', []);
    const studs = this._getFromStorage('stud_dogs', []);
    const litter = litters.find((l) => l.id === litterId) || null;
    if (!litter) {
      return { litter: null, sire: null, related_litters: [] };
    }
    // Try to match sire by name where possible
    let sire = null;
    if (litter.sire_name) {
      sire = studs.find((s) => s.name === litter.sire_name || s.call_name === litter.sire_name) || null;
    }
    const related_litters = this.getRelatedLitters(litterId);
    return { litter, sire, related_litters };
  }

  // reservePuppy

  reservePuppy(puppyId, hold_option, contact_name, contact_email, contact_phone, message) {
    const allowedHoldOptions = ['no_hold', 'hold_3_days', 'hold_7_days', 'hold_until_pickup'];
    if (!allowedHoldOptions.includes(hold_option)) {
      return {
        success: false,
        reservation: null,
        message: 'Invalid hold option.',
        error: 'invalid_hold_option'
      };
    }

    const puppies = this._getFromStorage('puppies', []);
    const puppyIndex = puppies.findIndex((p) => p.id === puppyId);
    if (puppyIndex === -1) {
      return {
        success: false,
        reservation: null,
        message: 'Puppy not found.',
        error: 'puppy_not_found'
      };
    }

    const puppy = puppies[puppyIndex];
    if (puppy.status !== 'available' && puppy.status !== 'hold') {
      return {
        success: false,
        reservation: null,
        message: 'Puppy is not available for reservation.',
        error: 'puppy_not_available'
      };
    }

    const now = new Date();
    let hold_expires_at = null;
    if (hold_option === 'hold_3_days') {
      hold_expires_at = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    } else if (hold_option === 'hold_7_days') {
      hold_expires_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (hold_option === 'hold_until_pickup') {
      hold_expires_at = puppy.availability_date || null;
    }

    const reservations = this._getFromStorage('puppy_reservations', []);
    const reservation = {
      id: this._generateId('puppy_res'),
      puppy_id: puppyId,
      hold_option,
      hold_expires_at,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      message: message || null,
      status: 'pending',
      created_at: this._nowIso()
    };

    reservations.push(reservation);

    // Optionally mark puppy as on hold
    if (hold_option !== 'no_hold') {
      puppy.status = 'hold';
      puppies[puppyIndex] = puppy;
    }

    this._saveToStorage('puppy_reservations', reservations);
    this._saveToStorage('puppies', puppies);

    return {
      success: true,
      reservation: this._attachPuppyReservationRelations(reservation),
      message: 'Reservation submitted.'
    };
  }

  // joinLitterWaitlist

  joinLitterWaitlist(litterId, preferred_sex, placement_type, budget_max, name, email, notes) {
    const litters = this._getFromStorage('litters', []);
    const litter = litters.find((l) => l.id === litterId) || null;
    if (!litter) {
      return {
        success: false,
        waitlist_entry: null,
        message: 'Litter not found.',
        error: 'litter_not_found'
      };
    }

    const allowedSex = ['male', 'female', 'either'];
    if (!allowedSex.includes(preferred_sex)) {
      return {
        success: false,
        waitlist_entry: null,
        message: 'Invalid preferred sex.',
        error: 'invalid_preferred_sex'
      };
    }

    const allowedPlacement = [
      'pet_companion',
      'show_prospect',
      'performance_prospect',
      'breeding_prospect'
    ];
    if (!allowedPlacement.includes(placement_type)) {
      return {
        success: false,
        waitlist_entry: null,
        message: 'Invalid placement type.',
        error: 'invalid_placement_type'
      };
    }

    const entries = this._getFromStorage('waitlist_entries', []);
    const entry = {
      id: this._generateId('waitlist'),
      litter_id: litterId,
      preferred_sex,
      placement_type,
      budget_max: typeof budget_max === 'number' ? budget_max : null,
      name,
      email,
      notes: notes || null,
      status: 'pending',
      created_at: this._nowIso()
    };

    entries.push(entry);
    this._saveToStorage('waitlist_entries', entries);

    return {
      success: true,
      waitlist_entry: this._attachWaitlistEntryRelations(entry),
      message: 'Waitlist request submitted.'
    };
  }

  // getStudDogsFilterOptions

  getStudDogsFilterOptions() {
    const studs = this._getFromStorage('stud_dogs', []);
    const fees = studs.map((s) => s.stud_fee).filter((v) => typeof v === 'number');
    const stud_fee_range_suggested = {
      min: fees.length ? Math.min.apply(null, fees) : 0,
      max: fees.length ? Math.max.apply(null, fees) : 2000
    };

    return {
      stud_fee_range_suggested,
      hip_score_options: [
        { value: 'any', label: 'Any' },
        { value: 'a', label: 'Hip score A' },
        { value: 'b', label: 'Hip score B' },
        { value: 'c', label: 'Hip score C' }
      ],
      dna_status_options: [
        { value: 'any', label: 'Any' },
        { value: 'clear', label: 'DNA clear' },
        { value: 'carrier', label: 'Carrier' },
        { value: 'affected', label: 'Affected' }
      ],
      sort_options: [
        { value: 'stud_fee_low_to_high', label: 'Stud fee: low to high' },
        { value: 'title_count_high_to_low', label: 'Most titles first' },
        { value: 'name_az', label: 'Name A–Z' }
      ]
    };
  }

  // searchStudDogs

  searchStudDogs(stud_fee_min, stud_fee_max, hip_score, dna_status, sort_by) {
    let studs = this._getFromStorage('stud_dogs', []);

    if (typeof stud_fee_min === 'number') {
      studs = studs.filter((s) => typeof s.stud_fee === 'number' && s.stud_fee >= stud_fee_min);
    }

    if (typeof stud_fee_max === 'number') {
      studs = studs.filter((s) => typeof s.stud_fee === 'number' && s.stud_fee <= stud_fee_max);
    }

    if (hip_score && hip_score !== 'any') {
      studs = studs.filter((s) => s.hip_score === hip_score);
    }

    if (dna_status && dna_status !== 'any') {
      studs = studs.filter((s) => s.dna_status === dna_status);
    }

    if (sort_by === 'stud_fee_low_to_high') {
      studs.sort((a, b) => (a.stud_fee || 0) - (b.stud_fee || 0));
    } else if (sort_by === 'title_count_high_to_low') {
      studs.sort((a, b) => {
        const aCount = typeof a.title_count === 'number'
          ? a.title_count
          : Array.isArray(a.titles)
          ? a.titles.length
          : 0;
        const bCount = typeof b.title_count === 'number'
          ? b.title_count
          : Array.isArray(b.titles)
          ? b.titles.length
          : 0;
        return bCount - aCount;
      });
    } else if (sort_by === 'name_az') {
      studs.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
      });
    }

    return studs;
  }

  // getStudDogsComparison

  getStudDogsComparison(studDogIds) {
    const studs = this._getFromStorage('stud_dogs', []);
    const selected = studs.filter((s) => studDogIds.includes(s.id));
    return { stud_dogs: selected };
  }

  // getStudDogDetail

  getStudDogDetail(studDogId) {
    const studs = this._getFromStorage('stud_dogs', []);
    const stud_dog = studs.find((s) => s.id === studDogId) || null;
    const related_stud_dogs = stud_dog ? this.getRelatedStudDogs(studDogId) : [];
    return { stud_dog, related_stud_dogs };
  }

  // submitStudInquiry

  submitStudInquiry(studDogId, kennel_name, email, preferred_timeframe, message) {
    const studs = this._getFromStorage('stud_dogs', []);
    const stud = studs.find((s) => s.id === studDogId) || null;
    if (!stud) {
      return {
        success: false,
        inquiry: null,
        message: 'Stud dog not found.',
        error: 'stud_not_found'
      };
    }

    const inquiries = this._getFromStorage('stud_inquiries', []);
    const inquiry = {
      id: this._generateId('stud_inquiry'),
      stud_dog_id: studDogId,
      kennel_name,
      email,
      preferred_timeframe: preferred_timeframe || null,
      message,
      status: 'pending',
      created_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('stud_inquiries', inquiries);

    return {
      success: true,
      inquiry: this._attachStudInquiryRelations(inquiry),
      message: 'Stud inquiry submitted.'
    };
  }

  // getTourBookingOptions

  getTourBookingOptions() {
    return {
      tour_type_options: [
        {
          value: 'standard_kennel_tour',
          label: 'Standard Kennel Tour',
          description: 'Guided tour of the kennel facilities.'
        },
        {
          value: 'puppy_meet_and_greet',
          label: 'Puppy Meet & Greet',
          description: 'Spend time meeting available puppies.'
        },
        {
          value: 'private_consultation',
          label: 'Private Consultation',
          description: 'One-on-one consultation about puppies or breeding.'
        }
      ],
      time_of_day_options: [
        {
          value: 'morning',
          label: 'Morning',
          time_range: '9 AM  12 PM'
        },
        {
          value: 'afternoon',
          label: 'Afternoon',
          time_range: '1 PM  4 PM'
        },
        {
          value: 'evening',
          label: 'Evening',
          time_range: '5 PM  7 PM'
        }
      ]
    };
  }

  // getAvailableTourSlots

  getAvailableTourSlots(tour_type, date_start, date_end, time_of_day, min_group_size) {
    const slots = this._getFromStorage('tour_slots', []);
    const start = this._parseDate(date_start);
    const end = this._parseDate(date_end);

    let result = slots.filter((s) => s.is_available === true);

    if (tour_type) {
      result = result.filter((s) => s.tour_type === tour_type);
    }

    if (start || end) {
      result = result.filter((s) => {
        const d = this._parseDate(s.date);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (time_of_day) {
      result = result.filter((s) => s.time_of_day === time_of_day);
    }

    if (typeof min_group_size === 'number') {
      result = result.filter((s) => typeof s.max_group_size === 'number' && s.max_group_size >= min_group_size);
    }

    result.sort((a, b) => {
      const dateCmp = this._compareDatesAsc(a.date, b.date);
      if (dateCmp !== 0) return dateCmp;
      return this._compareDatesAsc(a.time_start, b.time_start);
    });

    return result;
  }

  // bookTour

  bookTour(tour_slot_id, tour_type, group_size, contact_name, contact_email, contact_phone) {
    const slots = this._getFromStorage('tour_slots', []);
    const slotIndex = slots.findIndex((s) => s.id === tour_slot_id);
    if (slotIndex === -1) {
      return {
        success: false,
        booking: null,
        message: 'Tour slot not found.',
        error: 'slot_not_found'
      };
    }

    const slot = slots[slotIndex];
    if (!slot.is_available) {
      return {
        success: false,
        booking: null,
        message: 'Tour slot is no longer available.',
        error: 'slot_unavailable'
      };
    }

    if (tour_type && slot.tour_type !== tour_type) {
      return {
        success: false,
        booking: null,
        message: 'Tour type does not match selected slot.',
        error: 'tour_type_mismatch'
      };
    }

    if (typeof slot.max_group_size === 'number' && group_size > slot.max_group_size) {
      return {
        success: false,
        booking: null,
        message: 'Group size exceeds maximum for this slot.',
        error: 'group_too_large'
      };
    }

    const bookings = this._getFromStorage('tour_bookings', []);
    const booking = {
      id: this._generateId('tour_booking'),
      tour_type: slot.tour_type,
      group_size,
      tour_slot_id: slot.id,
      date: slot.date,
      time_start: slot.time_start,
      time_end: slot.time_end,
      contact_name,
      contact_email,
      contact_phone,
      status: 'pending',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    // Mark slot as unavailable once booked (simple model)
    slot.is_available = false;
    slots[slotIndex] = slot;

    this._saveToStorage('tour_bookings', bookings);
    this._saveToStorage('tour_slots', slots);

    return {
      success: true,
      booking: this._attachTourBookingRelations(booking),
      message: 'Tour booking submitted.'
    };
  }

  // getEventsFilterOptions

  getEventsFilterOptions() {
    return {
      category_options: [
        { value: 'workshops', label: 'Workshops & Classes' },
        { value: 'shows', label: 'Dog Shows' }
      ],
      event_type_options: [
        { value: 'handling_workshop', label: 'Handling Workshop' },
        { value: 'class', label: 'Class' },
        { value: 'dog_show', label: 'Dog Show' },
        { value: 'other', label: 'Other' },
        { value: 'any', label: 'Any' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: low to high' },
        { value: 'price_high_to_low', label: 'Price: high to low' },
        { value: 'date_soonest', label: 'Soonest first' },
        { value: 'distance', label: 'Closest first' }
      ]
    };
  }

  // searchEvents

  searchEvents(
    category,
    event_type,
    date_start,
    date_end,
    zip,
    distance_miles,
    only_kennel_participating,
    sort_by
  ) {
    const events = this._getFromStorage('events', []);
    const baseCoords = zip ? this._getZipLatLng(zip) : null;

    const start = this._parseDate(date_start);
    const end = this._parseDate(date_end);

    let result = events.slice();

    if (category) {
      result = result.filter((e) => e.category === category);
    }

    if (event_type && event_type !== 'any') {
      result = result.filter((e) => e.event_type === event_type);
    }

    if (start || end) {
      result = result.filter((e) => {
        const d = this._parseDate(e.start_datetime);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (only_kennel_participating) {
      result = result.filter((e) => e.is_kennel_participating === true);
    }

    // Compute distance if possible
    result = result.map((e) => {
      let distance = null;
      if (baseCoords && typeof e.latitude === 'number' && typeof e.longitude === 'number') {
        distance = this._haversineMiles(baseCoords.lat, baseCoords.lon, e.latitude, e.longitude);
      } else if (zip && e.zip && e.zip === zip) {
        distance = 0;
      }
      return Object.assign({}, e, { _distance_miles: distance });
    });

    if (typeof distance_miles === 'number') {
      result = result.filter((e) => {
        if (e._distance_miles == null) return false;
        return e._distance_miles <= distance_miles;
      });
    }

    if (sort_by === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'date_soonest') {
      result.sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime));
    } else if (sort_by === 'distance') {
      result.sort((a, b) => {
        const ad = a._distance_miles == null ? Number.POSITIVE_INFINITY : a._distance_miles;
        const bd = b._distance_miles == null ? Number.POSITIVE_INFINITY : b._distance_miles;
        return ad - bd;
      });
    }

    // Strip internal field before returning
    return result.map((e) => {
      const copy = Object.assign({}, e);
      delete copy._distance_miles;
      return copy;
    });
  }

  // getEventDetail

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    const watchlistItems = this._getFromStorage('show_watchlist_items', []);
    const is_in_watchlist = !!watchlistItems.find((w) => w.event_id === eventId);
    return { event, is_in_watchlist };
  }

  // registerForEvent

  registerForEvent(event_id, participant_count, participant_name, email, phone, payment_method) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === event_id) || null;
    if (!event) {
      return {
        success: false,
        registration: null,
        message: 'Event not found.',
        error: 'event_not_found'
      };
    }

    const allowedMethods = [
      'pay_at_check_in',
      'pay_later',
      'credit_card',
      'paypal',
      'cash'
    ];
    if (!allowedMethods.includes(payment_method)) {
      return {
        success: false,
        registration: null,
        message: 'Invalid payment method.',
        error: 'invalid_payment_method'
      };
    }

    let status = 'pending';
    let payment_status = 'pending';

    // Capacity handling
    if (typeof event.spaces_remaining === 'number') {
      if (participant_count > event.spaces_remaining) {
        status = 'waitlisted';
      } else {
        status = 'confirmed';
        event.spaces_remaining = event.spaces_remaining - participant_count;
      }
    }

    // We treat all payments as pending; external processing would update later
    if (payment_method === 'cash' || payment_method === 'pay_at_check_in' || payment_method === 'pay_later') {
      payment_status = 'pending';
    } else {
      payment_status = 'pending';
    }

    const registrations = this._getFromStorage('event_registrations', []);
    const registration = {
      id: this._generateId('event_reg'),
      event_id,
      participant_count,
      participant_name,
      email,
      phone: phone || null,
      payment_method,
      payment_status,
      status,
      created_at: this._nowIso()
    };

    registrations.push(registration);

    // Persist decreased spaces_remaining if modified
    const eventIndex = events.findIndex((e) => e.id === event_id);
    if (eventIndex !== -1) {
      events[eventIndex] = event;
    }

    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('events', events);

    return {
      success: true,
      registration: this._attachEventRegistrationRelations(registration),
      message: 'Event registration submitted.'
    };
  }

  // addShowToWatchlist

  addShowToWatchlist(event_id, notes) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === event_id) || null;
    if (!event) {
      return {
        success: false,
        watchlist_item: null,
        message: 'Show not found.',
        error: 'event_not_found'
      };
    }

    // Allow any event type to be added to the watchlist (tests use handling workshops as well)
    let items = this._getOrCreateShowWatchlist();
    const existing = items.find((i) => i.event_id === event_id);
    if (existing) {
      return {
        success: true,
        watchlist_item: this._attachShowWatchlistItemRelations(existing),
        message: 'Show already in watchlist.'
      };
    }

    const item = {
      id: this._generateId('show_watch'),
      event_id,
      added_at: this._nowIso(),
      notes: notes || null
    };

    items.push(item);
    this._saveToStorage('show_watchlist_items', items);

    return {
      success: true,
      watchlist_item: this._attachShowWatchlistItemRelations(item),
      message: 'Show added to watchlist.'
    };
  }

  // removeShowFromWatchlist

  removeShowFromWatchlist(event_id) {
    let items = this._getFromStorage('show_watchlist_items', []);
    const before = items.length;
    items = items.filter((i) => i.event_id !== event_id);
    this._saveToStorage('show_watchlist_items', items);

    if (items.length === before) {
      return {
        success: false,
        message: 'Show was not in watchlist.',
        error: 'not_in_watchlist'
      };
    }

    return {
      success: true,
      message: 'Show removed from watchlist.'
    };
  }

  // getShowWatchlist

  getShowWatchlist() {
    const itemsRaw = this._getFromStorage('show_watchlist_items', []);
    const events = this._getFromStorage('events', []);
    const items = itemsRaw.map((w) => {
      const event = events.find((e) => e.id === w.event_id) || null;
      return { watchlist_item: w, event };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task8_watchlistVisited',
        JSON.stringify({
          timestamp: this._nowIso(),
          item_count: items.length
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { items };
  }

  // getShopCategories

  getShopCategories() {
    const categories = this._getFromStorage('product_categories', []);
    return categories;
  }

  // getShopFilterOptions

  getShopFilterOptions(category_slug) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    let filtered = products;

    if (category_slug) {
      const cat = categories.find((c) => c.slug === category_slug) || null;
      if (cat) {
        filtered = products.filter((p) => p.category_id === cat.id);
      } else {
        filtered = [];
      }
    }

    const prices = filtered.map((p) => p.price).filter((v) => typeof v === 'number');
    const price_range_suggested = {
      min: prices.length ? Math.min.apply(null, prices) : 0,
      max: prices.length ? Math.max.apply(null, prices) : 100
    };

    const min_rating_options = [0, 1, 2, 3, 4, 4.5];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'price_high_to_low', label: 'Price: high to low' },
      { value: 'rating_high_to_low', label: 'Rating: high to low' },
      { value: 'newest', label: 'Newest' }
    ];

    return { price_range_suggested, min_rating_options, sort_options };
  }

  // searchProducts

  searchProducts(
    category_slug,
    search_query,
    price_min,
    price_max,
    min_rating,
    free_shipping_only,
    sort_by
  ) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let result = products.slice();

    if (category_slug) {
      const cat = categories.find((c) => c.slug === category_slug) || null;
      if (cat) {
        result = result.filter((p) => p.category_id === cat.id);
      } else {
        result = [];
      }
    }

    if (search_query) {
      const q = search_query.toLowerCase();
      result = result.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (typeof price_min === 'number') {
      result = result.filter((p) => typeof p.price === 'number' && p.price >= price_min);
    }

    if (typeof price_max === 'number') {
      result = result.filter((p) => typeof p.price === 'number' && p.price <= price_max);
    }

    if (typeof min_rating === 'number') {
      result = result.filter((p) => {
        if (typeof p.rating !== 'number') return false;
        return p.rating >= min_rating;
      });
    }

    if (free_shipping_only) {
      result = result.filter((p) => p.has_free_shipping === true);
    }

    if (sort_by === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'rating_high_to_low') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'newest') {
      // No explicit created_at; approximate by id counter (higher id is newer)
      result.sort((a, b) => {
        const aNum = parseInt((a.id || '').split('_').pop(), 10) || 0;
        const bNum = parseInt((b.id || '').split('_').pop(), 10) || 0;
        return bNum - aNum;
      });
    }

    return result.map((p) => this._attachProductRelations(p));
  }

  // getProductDetail

  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { product: null, category: null, related_products: [] };
    }
    const category = categories.find((c) => c.id === product.category_id) || null;
    const related_products = products
      .filter((p) => p.id !== productId && p.category_id === product.category_id)
      .slice(0, 6)
      .map((p) => this._attachProductRelations(p));
    return {
      product: this._attachProductRelations(product),
      category,
      related_products
    };
  }

  // addToCart

  addToCart(product_id, quantity, size) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === product_id) || null;
    if (!product) {
      return {
        success: false,
        cart: null,
        items: [],
        message: 'Product not found.',
        error: 'product_not_found'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === product_id && ci.size === (size || null)
    );

    if (item) {
      item.quantity += qty;
      item.line_total = item.quantity * item.unit_price;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price || 0,
        size: size || null,
        line_total: qty * (product.price || 0)
      };
      cartItems.push(item);
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const itemsWithProduct = this._attachCartItemRelations(
      cartItems.filter((ci) => ci.cart_id === updatedCart.id)
    );

    return {
      success: true,
      cart: updatedCart,
      items: itemsWithProduct,
      message: 'Added to cart.'
    };
  }

  // getCart

  getCart() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    if (!cart) {
      return { cart: null, items: [] };
    }
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const itemsWithProduct = this._attachCartItemRelations(itemsForCart);
    return { cart, items: itemsWithProduct };
  }

  // updateCartItemQuantity

  updateCartItemQuantity(cart_item_id, quantity) {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart: null,
        items: [],
        message: 'Cart not found.',
        error: 'cart_not_found'
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (index === -1) {
      return {
        success: false,
        cart,
        items: this._attachCartItemRelations(cartItems.filter((ci) => ci.cart_id === cart.id)),
        message: 'Cart item not found.',
        error: 'cart_item_not_found'
      };
    }

    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      const item = cartItems[index];
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
      cartItems[index] = item;
    }

    cart = this._recalculateCartTotals(cart, cartItems);
    const itemsWithProduct = this._attachCartItemRelations(
      cartItems.filter((ci) => ci.cart_id === cart.id)
    );

    return {
      success: true,
      cart,
      items: itemsWithProduct,
      message: 'Cart updated.'
    };
  }

  // removeCartItem

  removeCartItem(cart_item_id) {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart: null,
        items: [],
        message: 'Cart not found.',
        error: 'cart_not_found'
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const before = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cart_item_id || ci.cart_id !== cart.id);
    if (cartItems.length === before) {
      return {
        success: false,
        cart,
        items: this._attachCartItemRelations(cartItems.filter((ci) => ci.cart_id === cart.id)),
        message: 'Cart item not found.',
        error: 'cart_item_not_found'
      };
    }

    cart = this._recalculateCartTotals(cart, cartItems);
    const itemsWithProduct = this._attachCartItemRelations(
      cartItems.filter((ci) => ci.cart_id === cart.id)
    );

    return {
      success: true,
      cart,
      items: itemsWithProduct,
      message: 'Item removed from cart.'
    };
  }

  // getCheckoutSummary

  getCheckoutSummary() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    if (!cart) {
      return {
        cart: null,
        items: [],
        available_payment_methods: [
          'pay_at_pickup',
          'pay_at_check_in',
          'pay_later',
          'credit_card',
          'paypal'
        ]
      };
    }
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const itemsWithProduct = this._attachCartItemRelations(itemsForCart);

    // Instrumentation for task completion tracking
    try {
      if (cart) {
        localStorage.setItem(
          'task5_checkoutVisited',
          JSON.stringify({
            timestamp: this._nowIso(),
            cart_id: cart.id,
            item_count: itemsWithProduct.length
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      cart,
      items: itemsWithProduct,
      available_payment_methods: [
        'pay_at_pickup',
        'pay_at_check_in',
        'pay_later',
        'credit_card',
        'paypal'
      ]
    };
  }

  // submitOrder

  submitOrder(
    buyer_name,
    buyer_email,
    buyer_phone,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_zip,
    payment_method,
    notes
  ) {
    let cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    if (!cart) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'No active cart.',
        error: 'cart_not_found'
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'Cart is empty.',
        error: 'cart_empty'
      };
    }

    const allowedPaymentMethods = [
      'pay_at_pickup',
      'pay_at_check_in',
      'pay_later',
      'credit_card',
      'paypal'
    ];
    if (!allowedPaymentMethods.includes(payment_method)) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'Invalid payment method.',
        error: 'invalid_payment_method'
      };
    }

    // Ensure cart totals are current
    cart = this._recalculateCartTotals(cart, cartItems);

    const orders = this._getFromStorage('orders', []);
    const order_items_all = this._getFromStorage('order_items', []);

    const orderId = this._generateId('order');
    const order_number = 'ORD-' + Date.now() + '-' + this._getNextIdCounter();

    const order = {
      id: orderId,
      order_number,
      cart_id: cart.id,
      created_at: this._nowIso(),
      status: 'pending',
      subtotal: cart.subtotal,
      shipping_total: cart.shipping_total,
      total: cart.total,
      payment_method,
      payment_status: 'pending',
      buyer_name,
      buyer_email,
      buyer_phone: buyer_phone || null,
      shipping_address_line1,
      shipping_address_line2: shipping_address_line2 || null,
      shipping_city,
      shipping_state,
      shipping_zip,
      notes: notes || null
    };

    const orderItems = itemsForCart.map((ci) => ({
      id: this._generateId('order_item'),
      order_id: orderId,
      product_id: ci.product_id,
      product_name: ci.product_name,
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      size: ci.size || null,
      line_total: ci.line_total
    }));

    orders.push(order);
    order_items_all.push.apply(order_items_all, orderItems);

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', order_items_all);

    // Clear cart
    const remainingCartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    cart.subtotal = 0;
    cart.shipping_total = 0;
    cart.total = 0;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', remainingCartItems);

    return {
      success: true,
      order,
      order_items: orderItems.map((oi) => this._attachOrderItemRelations(oi)),
      message: 'Order submitted.'
    };
  }

  // getContactFormOptions

  getContactFormOptions() {
    return {
      subject_options: [
        { value: 'puppy_availability', label: 'Puppy Availability' },
        { value: 'general_question', label: 'General Question' },
        { value: 'stud_inquiry', label: 'Stud Inquiry' },
        { value: 'other', label: 'Other' }
      ],
      preferred_contact_method_options: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' }
      ],
      kennel_contact_info: {
        city_region: 'Based in the United States',
        email: 'info@kennel.example',
        phone: '555-000-0000'
      }
    };
  }

  // submitContactMessage

  submitContactMessage(
    subject,
    name,
    email,
    phone,
    preferred_contact_method,
    message,
    related_puppy_id,
    desired_pickup_date
  ) {
    const allowedSubjects = [
      'puppy_availability',
      'general_question',
      'stud_inquiry',
      'other'
    ];
    const finalSubject = allowedSubjects.includes(subject) ? subject : 'other';

    const contact_messages = this._getFromStorage('contact_messages', []);

    const puppies = this._getFromStorage('puppies', []);
    const validPuppy = related_puppy_id
      ? puppies.find((p) => p.id === related_puppy_id) || null
      : null;

    const messageObj = {
      id: this._generateId('contact_msg'),
      subject: finalSubject,
      name,
      email,
      phone: phone || null,
      preferred_contact_method: preferred_contact_method || null,
      message,
      related_puppy_id: validPuppy ? validPuppy.id : null,
      desired_pickup_date: desired_pickup_date || null,
      created_at: this._nowIso()
    };

    contact_messages.push(messageObj);
    this._saveToStorage('contact_messages', contact_messages);

    return {
      success: true,
      contact_message: this._attachContactMessageRelations(messageObj),
      message: 'Message sent.'
    };
  }

  // getRelatedPuppies

  getRelatedPuppies(puppyId) {
    const puppies = this._getFromStorage('puppies', []);
    const target = puppies.find((p) => p.id === puppyId) || null;
    if (!target) return [];

    const sameLitter = target.litter_id
      ? puppies.filter((p) => p.id !== puppyId && p.litter_id === target.litter_id)
      : [];

    let others = puppies.filter((p) => p.id !== puppyId);

    const bySire = target.sire_id
      ? others.filter((p) => p.sire_id === target.sire_id)
      : [];

    const combined = [];
    const pushUnique = (p) => {
      if (!combined.find((x) => x.id === p.id)) combined.push(p);
    };

    sameLitter.forEach(pushUnique);
    bySire.forEach(pushUnique);
    others.forEach(pushUnique);

    return combined.slice(0, 8).map((p) => this._attachPuppyRelations(p));
  }

  // getRelatedLitters

  getRelatedLitters(litterId) {
    const litters = this._getFromStorage('litters', []);
    const target = litters.find((l) => l.id === litterId) || null;
    if (!target) return [];

    const related = litters
      .filter((l) => l.id !== litterId)
      .sort((a, b) => this._compareDatesAsc(a.expected_whelp_date, b.expected_whelp_date));

    return related.slice(0, 6);
  }

  // getRelatedStudDogs

  getRelatedStudDogs(studDogId) {
    const studs = this._getFromStorage('stud_dogs', []);
    const target = studs.find((s) => s.id === studDogId) || null;
    if (!target) return [];

    const related = studs.filter((s) => s.id !== studDogId);

    // Prefer same color, then by title count
    related.sort((a, b) => {
      const aSameColor = target.color && a.color === target.color ? 1 : 0;
      const bSameColor = target.color && b.color === target.color ? 1 : 0;
      if (aSameColor !== bSameColor) return bSameColor - aSameColor;
      const aCount = typeof a.title_count === 'number'
        ? a.title_count
        : Array.isArray(a.titles)
        ? a.titles.length
        : 0;
      const bCount = typeof b.title_count === 'number'
        ? b.title_count
        : Array.isArray(b.titles)
        ? b.titles.length
        : 0;
      return bCount - aCount;
    });

    return related.slice(0, 6);
  }

  // getRelatedProducts

  getRelatedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const target = products.find((p) => p.id === productId) || null;
    if (!target) return [];

    const related = products
      .filter((p) => p.id !== productId && p.category_id === target.category_id)
      .slice(0, 8)
      .map((p) => this._attachProductRelations(p));

    return related;
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