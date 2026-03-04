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

  // ---------------------- Storage Helpers ----------------------
  _initStorage() {
    const keysWithDefaults = [
      // Core domain tables
      ['courses', []],
      ['tee_times', []],
      ['packages', []],
      ['cancellation_policies', []],
      ['promo_codes', []],
      ['carts', []],
      ['cart_items', []],
      ['bookings', []],
      ['booking_items', []],
      ['favorites', []],
      ['comparison_lists', []],
      ['search_contexts', []],
      // Misc/supporting
      ['contact_messages', []],
      ['about_page_content', null],
      ['contact_options', null],
      ['faq_items', null],
      ['terms_content', null],
      ['privacy_policy_content', null],
      ['cancellation_policy_content', null],
      ['current_cart_id', null],
      ['current_booking_id', null],
      ['idCounter', '1000']
    ];

    for (const [key, defaultValue] of keysWithDefaults) {
      if (localStorage.getItem(key) === null) {
        if (defaultValue === null) {
          localStorage.setItem(key, JSON.stringify(defaultValue));
        } else {
          localStorage.setItem(key, JSON.stringify(defaultValue));
        }
      }
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed === null ? defaultValue : parsed;
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

  // ---------------------- Utility Helpers ----------------------

  _nowISO() {
    return new Date().toISOString();
  }

  _extractDateString(dateTimeString) {
    if (!dateTimeString) return null;
    // assumes ISO or ISO-like
    return String(dateTimeString).substring(0, 10);
  }

  _toNumber(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  _computeDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' ||
      typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' ||
      typeof lon2 !== 'number'
    ) {
      return null;
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
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

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _findCourseById(courseId) {
    const courses = this._getFromStorage('courses', []);
    return courses.find((c) => c.id === courseId) || null;
  }

  _findTeeTimeById(teeTimeId) {
    const teeTimes = this._getFromStorage('tee_times', []);
    return teeTimes.find((t) => t.id === teeTimeId) || null;
  }

  _findPackageById(packageId) {
    const packages = this._getFromStorage('packages', []);
    return packages.find((p) => p.id === packageId) || null;
  }

  _findCancellationPolicyById(policyId) {
    if (!policyId) return null;
    const policies = this._getFromStorage('cancellation_policies', []);
    return policies.find((p) => p.id === policyId) || null;
  }

  _resolveCancellationForTeeTime(teeTime, course) {
    const teePolicy =
      teeTime && teeTime.cancellation_policy_id
        ? this._findCancellationPolicyById(teeTime.cancellation_policy_id)
        : null;
    if (teePolicy) return teePolicy;
    if (course && course.default_cancellation_policy_id) {
      return this._findCancellationPolicyById(course.default_cancellation_policy_id);
    }
    return null;
  }

  _applySearchContextUpdates(ctx, updates) {
    const newCtx = { ...ctx };
    let changed = false;
    Object.keys(updates).forEach((key) => {
      const val = updates[key];
      if (val !== undefined) {
        newCtx[key] = val;
        changed = true;
      }
    });
    if (changed) {
      newCtx.last_updated = this._nowISO();
    }
    return newCtx;
  }

  _getPromoByCode(code) {
    if (!code) return null;
    const codes = this._getFromStorage('promo_codes', []);
    const norm = this._normalizeString(code);
    const now = new Date();
    return (
      codes.find((p) => {
        if (!p || p.status !== 'active') return false;
        if (this._normalizeString(p.code) !== norm) return false;
        if (p.valid_from && new Date(p.valid_from) > now) return false;
        if (p.valid_to && new Date(p.valid_to) < now) return false;
        return true;
      }) || null
    );
  }

  _computeCartTotals(cart, cartItems, promoCodeObj) {
    // cartItems: full list of CartItem objects (all carts). We'll filter by cartId and status.
    const activeItems = cartItems.filter(
      (ci) => ci.cartId === cart.id && (ci.status === undefined || ci.status === 'active')
    );
    let subtotal = 0;
    for (const item of activeItems) {
      subtotal += this._toNumber(item.total_price, 0);
    }

    let discount = 0;
    let appliedCode = null;

    if (promoCodeObj && promoCodeObj.status === 'active') {
      const now = new Date();
      if (
        (!promoCodeObj.valid_from || new Date(promoCodeObj.valid_from) <= now) &&
        (!promoCodeObj.valid_to || new Date(promoCodeObj.valid_to) >= now)
      ) {
        if (
          promoCodeObj.min_cart_total === undefined ||
          subtotal >= this._toNumber(promoCodeObj.min_cart_total, 0)
        ) {
          // determine eligible subtotal based on applicable_to
          let eligibleSubtotal = 0;
          if (promoCodeObj.applicable_to === 'all') {
            eligibleSubtotal = subtotal;
          } else {
            for (const item of activeItems) {
              if (
                (promoCodeObj.applicable_to === 'tee_times' && item.item_type === 'tee_time') ||
                (promoCodeObj.applicable_to === 'packages' && item.item_type === 'package')
              ) {
                eligibleSubtotal += this._toNumber(item.total_price, 0);
              }
            }
          }
          if (eligibleSubtotal > 0) {
            if (promoCodeObj.discount_type === 'percentage') {
              discount = (eligibleSubtotal * this._toNumber(promoCodeObj.discount_value, 0)) / 100;
            } else if (promoCodeObj.discount_type === 'fixed_amount') {
              discount = this._toNumber(promoCodeObj.discount_value, 0);
              if (discount > eligibleSubtotal) discount = eligibleSubtotal;
            }
            appliedCode = promoCodeObj.code;
          }
        }
      }
    }

    cart.subtotal_amount = subtotal;
    cart.promo_discount_amount = discount;
    cart.applied_promo_code = appliedCode;
    cart.tax_amount = 0; // No tax logic defined
    cart.total_amount = Math.max(0, subtotal - discount + cart.tax_amount);
    cart.updated_at = this._nowISO();

    return cart;
  }

  _cartItemsToReturnItems(cart, cartItems) {
    const courses = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);
    const packages = this._getFromStorage('packages', []);

    const activeItems = cartItems.filter(
      (ci) => ci.cartId === cart.id && (ci.status === undefined || ci.status === 'active')
    );

    return activeItems.map((ci) => {
      const course = ci.courseId ? courses.find((c) => c.id === ci.courseId) || null : null;
      const tee_time = ci.teeTimeId
        ? teeTimes.find((t) => t.id === ci.teeTimeId) || null
        : null;
      const pkg = ci.packageId ? packages.find((p) => p.id === ci.packageId) || null : null;

      const lineSubtotal = this._toNumber(ci.total_price, 0);
      const lineTaxes = 0;
      const lineTotal = lineSubtotal + lineTaxes;

      const descriptionParts = [];
      if (ci.start_datetime) {
        const dateStr = this._extractDateString(ci.start_datetime);
        if (dateStr) descriptionParts.push(dateStr);
      }
      if (ci.players_count) descriptionParts.push(ci.players_count + ' players');
      if (ci.holes) descriptionParts.push(ci.holes + ' holes');
      const description = descriptionParts.join(' · ');

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        course_name: ci.course_name || (course ? course.name : null),
        course_id: ci.courseId || (course ? course.id : null),
        tee_time_id: ci.teeTimeId || null,
        package_id: ci.packageId || null,
        item_name:
          ci.item_type === 'package'
            ? pkg && pkg.name
            : ci.course_name || (course ? course.name : null),
        date: ci.date || (ci.start_datetime ? this._extractDateString(ci.start_datetime) : null),
        start_datetime: ci.start_datetime || null,
        holes: ci.holes || null,
        players_count: ci.players_count || null,
        carts_count: ci.carts_count || null,
        quantity: ci.item_type === 'package' ? this._toNumber(ci.quantity || 1, 1) : 1,
        price_per_player: ci.price_per_player || null,
        package_price_each: ci.item_type === 'package' ? ci.price_per_package || null : null,
        description,
        line_subtotal: lineSubtotal,
        line_taxes: lineTaxes,
        line_total: lineTotal,
        // Foreign key resolutions
        course,
        tee_time,
        package: pkg
      };
    });
  }

  // ---------------------- _getOrCreate helpers ----------------------

  _getOrCreateSearchContext() {
    let contexts = this._getFromStorage('search_contexts', []);
    let ctx = contexts.find((c) => c.id === 'current') || null;
    if (!ctx) {
      ctx = {
        id: 'current',
        location_text: null,
        location_latitude: null,
        location_longitude: null,
        play_date: null,
        num_players: null,
        holes: null,
        time_of_day_filter: 'any',
        price_min: null,
        price_max: null,
        rating_min: null,
        distance_max_miles: null,
        discount_min_percent: null,
        deals_only: false,
        cart_included_only: false,
        cancellation_policy_filter: 'any',
        sort_option: 'price_low_to_high',
        view_mode: 'list',
        map_center_latitude: null,
        map_center_longitude: null,
        map_zoom_level: null,
        last_updated: this._nowISO()
      };
      contexts.push(ctx);
      this._saveToStorage('search_contexts', contexts);
    }
    return ctx;
  }

  _saveSearchContext(ctx) {
    let contexts = this._getFromStorage('search_contexts', []);
    const idx = contexts.findIndex((c) => c.id === ctx.id);
    if (idx >= 0) {
      contexts[idx] = ctx;
    } else {
      contexts.push(ctx);
    }
    this._saveToStorage('search_contexts', contexts);
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let currentCartId = this._getFromStorage('current_cart_id', null);
    if (typeof currentCartId === 'object') currentCartId = null; // just in case

    let cart = null;
    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart) {
      const newId = this._generateId('cart');
      const now = this._nowISO();
      cart = {
        id: newId,
        created_at: now,
        updated_at: now,
        itemIds: [],
        applied_promo_code: null,
        promo_discount_amount: 0,
        subtotal_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        currency: 'usd'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      this._saveToStorage('current_cart_id', newId);
    }

    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _getOrCreateFavoritesList() {
    let lists = this._getFromStorage('favorites', []);
    let list = lists.find((f) => f.id === 'default') || null;
    if (!list) {
      const now = this._nowISO();
      list = {
        id: 'default',
        courseIds: [],
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('favorites', lists);
    }
    return list;
  }

  _saveFavoritesList(list) {
    let lists = this._getFromStorage('favorites', []);
    const idx = lists.findIndex((f) => f.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('favorites', lists);
  }

  _getOrCreateComparisonList() {
    let lists = this._getFromStorage('comparison_lists', []);
    let list = lists.find((l) => l.id === 'default') || null;
    if (!list) {
      const now = this._nowISO();
      list = {
        id: 'default',
        courseIds: [],
        max_items: 3,
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
    }
    if (!list.max_items) list.max_items = 3;
    return list;
  }

  _saveComparisonList(list) {
    let lists = this._getFromStorage('comparison_lists', []);
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('comparison_lists', lists);
  }

  _getOrCreateBookingForCurrentCart() {
    const cart = this._getOrCreateCart();
    let bookings = this._getFromStorage('bookings', []);
    let bookingItems = this._getFromStorage('booking_items', []);

    let currentBookingId = this._getFromStorage('current_booking_id', null);
    if (typeof currentBookingId === 'object') currentBookingId = null;

    let booking = null;
    if (currentBookingId) {
      booking = bookings.find((b) => b.id === currentBookingId) || null;
    }
    if (!booking) {
      booking = bookings.find((b) => b.status === 'in_progress' && b.cartId === cart.id) || null;
    }

    if (!booking) {
      const now = this._nowISO();
      booking = {
        id: this._generateId('booking'),
        cartId: cart.id,
        created_at: now,
        status: 'in_progress',
        booking_reference: null,
        bookingItemIds: [],
        contact_email: null,
        contact_phone: null,
        subtotal_amount: cart.subtotal_amount || 0,
        promo_code: cart.applied_promo_code || null,
        promo_discount_amount: cart.promo_discount_amount || 0,
        tax_amount: cart.tax_amount || 0,
        total_amount: cart.total_amount || 0,
        currency: cart.currency || 'usd',
        confirmation_sent: false
      };
      bookings.push(booking);
    }

    // Clear old bookingItems for this booking
    const remainingBookingItems = bookingItems.filter((bi) => bi.bookingId !== booking.id);

    // Create booking items from current cart items
    const cartItems = this._getFromStorage('cart_items', []);
    const activeCartItems = cartItems.filter(
      (ci) => ci.cartId === cart.id && (ci.status === undefined || ci.status === 'active')
    );

    const newBookingItems = [];
    const bookingItemIds = [];
    for (const ci of activeCartItems) {
      const bi = {
        id: this._generateId('booking_item'),
        bookingId: booking.id,
        item_type: ci.item_type,
        teeTimeId: ci.teeTimeId || null,
        packageId: ci.packageId || null,
        courseId: ci.courseId || null,
        course_name: ci.course_name || null,
        players_count: ci.players_count || null,
        carts_count: ci.carts_count || null,
        start_datetime: ci.start_datetime || null,
        date: ci.date || (ci.start_datetime ? this._extractDateString(ci.start_datetime) : null),
        holes: ci.holes || null,
        price_per_player: ci.price_per_player || null,
        total_price: this._toNumber(ci.total_price, 0)
      };
      newBookingItems.push(bi);
      bookingItemIds.push(bi.id);
    }

    booking.bookingItemIds = bookingItemIds;
    booking.subtotal_amount = cart.subtotal_amount || 0;
    booking.promo_code = cart.applied_promo_code || null;
    booking.promo_discount_amount = cart.promo_discount_amount || 0;
    booking.tax_amount = cart.tax_amount || 0;
    booking.total_amount = cart.total_amount || 0;
    booking.currency = cart.currency || 'usd';

    // Save back
    bookings = bookings.filter((b) => b.id !== booking.id).concat([booking]);
    this._saveToStorage('bookings', bookings);
    this._saveToStorage('booking_items', remainingBookingItems.concat(newBookingItems));
    this._saveToStorage('current_booking_id', booking.id);

    return booking;
  }

  _getCurrentBooking() {
    const currentBookingId = this._getFromStorage('current_booking_id', null);
    if (!currentBookingId || typeof currentBookingId === 'object') return null;
    const bookings = this._getFromStorage('bookings', []);
    return bookings.find((b) => b.id === currentBookingId) || null;
  }

  // ---------------------- Interfaces ----------------------
  // 1) getLocationSuggestions(query)

  getLocationSuggestions(query) {
    const q = this._normalizeString(query);
    if (!q) return [];

    const courses = this._getFromStorage('courses', []);
    const groupsMap = new Map();

    for (const c of courses) {
      if (!c.city && !c.state && !c.country) continue;
      const displayNameParts = [];
      if (c.city) displayNameParts.push(c.city);
      if (c.state) displayNameParts.push(c.state);
      const display_name = displayNameParts.join(', ');
      const fullSearch = this._normalizeString(
        [c.city, c.state, c.country, display_name].filter(Boolean).join(', ')
      );
      if (!fullSearch.includes(q)) continue;

      const key = [c.city || '', c.state || '', c.country || ''].join('|');
      let g = groupsMap.get(key);
      if (!g) {
        g = {
          display_name: display_name || c.city || c.state || c.country || '',
          city: c.city || null,
          state: c.state || null,
          country: c.country || null,
          latitudes: [],
          longitudes: []
        };
        groupsMap.set(key, g);
      }
      if (typeof c.latitude === 'number') g.latitudes.push(c.latitude);
      if (typeof c.longitude === 'number') g.longitudes.push(c.longitude);
    }

    const suggestions = [];
    for (const g of groupsMap.values()) {
      let lat = null;
      let lon = null;
      if (g.latitudes.length && g.longitudes.length) {
        lat = g.latitudes.reduce((a, b) => a + b, 0) / g.latitudes.length;
        lon = g.longitudes.reduce((a, b) => a + b, 0) / g.longitudes.length;
      }
      suggestions.push({
        display_name: g.display_name,
        city: g.city,
        state: g.state,
        country: g.country,
        latitude: lat,
        longitude: lon
      });
    }

    return suggestions;
  }

  // 2) getSearchContext()

  getSearchContext() {
    return this._getOrCreateSearchContext();
  }

  // 3) updateSearchContext(...positional args...)
  // (location_text, location_latitude, location_longitude, play_date, num_players,
  //  holes, time_of_day_filter, price_min, price_max, rating_min, distance_max_miles,
  //  discount_min_percent, deals_only, cart_included_only, cancellation_policy_filter,
  //  sort_option, view_mode, map_center_latitude, map_center_longitude, map_zoom_level)

  updateSearchContext(
    location_text,
    location_latitude,
    location_longitude,
    play_date,
    num_players,
    holes,
    time_of_day_filter,
    price_min,
    price_max,
    rating_min,
    distance_max_miles,
    discount_min_percent,
    deals_only,
    cart_included_only,
    cancellation_policy_filter,
    sort_option,
    view_mode,
    map_center_latitude,
    map_center_longitude,
    map_zoom_level
  ) {
    let ctx = this._getOrCreateSearchContext();

    const updates = {
      location_text,
      location_latitude,
      location_longitude,
      play_date,
      num_players,
      holes,
      time_of_day_filter,
      price_min,
      price_max,
      rating_min,
      distance_max_miles,
      discount_min_percent,
      deals_only,
      cart_included_only,
      cancellation_policy_filter,
      sort_option,
      view_mode,
      map_center_latitude,
      map_center_longitude,
      map_zoom_level
    };

    ctx = this._applySearchContextUpdates(ctx, updates);
    this._saveSearchContext(ctx);
    return ctx;
  }

  // 4) getTeeTimeSearchFilterOptions()

  getTeeTimeSearchFilterOptions() {
    // Static UI-oriented options (not domain data)
    return {
      time_of_day_options: ['morning', 'afternoon', 'twilight'],
      rating_min_values: [3, 3.5, 4, 4.5, 5],
      distance_max_options: [5, 10, 15, 25, 50],
      discount_min_options: [10, 20, 30, 40, 50],
      price_ranges: [
        { label: 'Under $50', min: 0, max: 50 },
        { label: '$50–$75', min: 50, max: 75 },
        { label: '$75–$100', min: 75, max: 100 },
        { label: '$100–$150', min: 100, max: 150 },
        { label: '$150+', min: 150, max: null }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'rating_low_to_high', label: 'Rating: Low to High' },
        { value: 'discount_high_to_low', label: 'Discount: High to Low' },
        { value: 'discount_low_to_high', label: 'Discount: Low to High' },
        { value: 'most_reviewed', label: 'Most Reviewed' },
        { value: 'distance_near_to_far', label: 'Distance: Near to Far' },
        { value: 'distance_far_to_near', label: 'Distance: Far to Near' }
      ]
    };
  }

  // 5) searchTeeTimes(...positional args...)

  searchTeeTimes(
    location_text,
    play_date,
    num_players,
    holes,
    time_of_day_filter,
    price_min,
    price_max,
    rating_min,
    distance_max_miles,
    discount_min_percent,
    deals_only,
    cart_included_only,
    cancellation_policy_filter,
    sort_option,
    view_mode,
    map_center_latitude,
    map_center_longitude,
    map_zoom_level
  ) {
    // Update search context first
    let ctx = this._getOrCreateSearchContext();
    ctx = this._applySearchContextUpdates(ctx, {
      location_text,
      play_date,
      num_players,
      holes,
      time_of_day_filter,
      price_min,
      price_max,
      rating_min,
      distance_max_miles,
      discount_min_percent,
      deals_only,
      cart_included_only,
      cancellation_policy_filter,
      sort_option,
      view_mode,
      map_center_latitude,
      map_center_longitude,
      map_zoom_level
    });
    this._saveSearchContext(ctx);

    const courses = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);
    const policies = this._getFromStorage('cancellation_policies', []);
    const favoritesList = this._getOrCreateFavoritesList();
    const comparisonList = this._getOrCreateComparisonList();

    const searchPlayDate = play_date || ctx.play_date || null;
    const searchPlayers = num_players || ctx.num_players || null;
    const searchHoles = holes || ctx.holes || null;
    const todFilter = time_of_day_filter || ctx.time_of_day_filter || 'any';
    const priceMinVal = price_min !== undefined ? price_min : ctx.price_min;
    const priceMaxVal = price_max !== undefined ? price_max : ctx.price_max;
    const ratingMinVal = rating_min !== undefined ? rating_min : ctx.rating_min;
    const distMaxVal =
      distance_max_miles !== undefined ? distance_max_miles : ctx.distance_max_miles;
    const discountMinVal =
      discount_min_percent !== undefined
        ? discount_min_percent
        : ctx.discount_min_percent;
    const dealsOnly = deals_only !== undefined ? deals_only : ctx.deals_only;
    const cartIncludedOnly =
      cart_included_only !== undefined ? cart_included_only : ctx.cart_included_only;
    const cancFilter =
      cancellation_policy_filter || ctx.cancellation_policy_filter || 'any';
    const sortOpt = sort_option || ctx.sort_option || 'price_low_to_high';

    const refLat =
      map_center_latitude !== undefined && map_center_latitude !== null
        ? map_center_latitude
        : ctx.map_center_latitude !== null && ctx.map_center_latitude !== undefined
        ? ctx.map_center_latitude
        : ctx.location_latitude;
    const refLon =
      map_center_longitude !== undefined && map_center_longitude !== null
        ? map_center_longitude
        : ctx.map_center_longitude !== null && ctx.map_center_longitude !== undefined
        ? ctx.map_center_longitude
        : ctx.location_longitude;

    // Filter tee times first
    const filteredTeeTimes = teeTimes.filter((t) => {
      if (!t || t.status !== 'available') return false;

      const course = courses.find((c) => c.id === t.courseId);
      if (!course || course.status !== 'active') return false;

      if (searchPlayDate) {
        const teeDate = this._extractDateString(t.start_datetime);
        if (teeDate !== searchPlayDate) return false;
      }

      if (searchHoles && t.holes !== searchHoles) return false;

      if (todFilter && todFilter !== 'any' && t.time_of_day !== todFilter) return false;

      const currentPrice = this._toNumber(t.current_price_per_player, 0);
      if (priceMinVal !== null && priceMinVal !== undefined && currentPrice < priceMinVal) {
        return false;
      }
      if (priceMaxVal !== null && priceMaxVal !== undefined && currentPrice > priceMaxVal) {
        return false;
      }

      if (
        ratingMinVal !== null &&
        ratingMinVal !== undefined &&
        typeof course.rating === 'number' &&
        course.rating < ratingMinVal
      ) {
        return false;
      }

      if (
        discountMinVal !== null &&
        discountMinVal !== undefined &&
        typeof t.discount_percent === 'number' &&
        t.discount_percent < discountMinVal
      ) {
        return false;
      }

      if (dealsOnly && !t.is_deal) return false;

      if (cartIncludedOnly && !t.cart_included) return false;

      if (searchPlayers && t.available_player_spots < searchPlayers) return false;

      // Cancellation policy filter
      if (cancFilter === 'free_cancellation_only') {
        const policy = this._resolveCancellationForTeeTime(t, course);
        if (!policy || !policy.free_cancellation) return false;
      }

      // Distance filter
      if (distMaxVal && refLat != null && refLon != null && course.latitude != null) {
        const dist = this._computeDistanceMiles(
          refLat,
          refLon,
          course.latitude,
          course.longitude
        );
        if (dist !== null && dist > distMaxVal) return false;
      }

      return true;
    });

    // Group by course
    const courseMap = new Map();
    for (const t of filteredTeeTimes) {
      const course = courses.find((c) => c.id === t.courseId);
      if (!course) continue;
      let entry = courseMap.get(course.id);
      if (!entry) {
        const dist =
          refLat != null && refLon != null && course.latitude != null
            ? this._computeDistanceMiles(refLat, refLon, course.latitude, course.longitude)
            : null;
        entry = {
          course,
          distance_miles: dist,
          tee_times: []
        };
        courseMap.set(course.id, entry);
      }
      entry.tee_times.push(t);
    }

    const results = [];
    for (const [courseId, entry] of courseMap.entries()) {
      const course = entry.course;
      const teeList = entry.tee_times;
      if (!teeList.length) continue;

      let minBase = null;
      let minCurrent = null;
      let bestDiscount = null;
      let hasDeals = false;
      let cartIncludedFrom = false;
      let freeCancellation = false;
      let cancellationSummary = null;

      for (const t of teeList) {
        const base = this._toNumber(t.base_price_per_player, t.current_price_per_player);
        const cur = this._toNumber(t.current_price_per_player, base);
        const disc = typeof t.discount_percent === 'number' ? t.discount_percent : 0;
        if (minBase === null || base < minBase) minBase = base;
        if (minCurrent === null || cur < minCurrent) minCurrent = cur;
        if (bestDiscount === null || disc > bestDiscount) bestDiscount = disc;
        if (t.is_deal) hasDeals = true;
        if (t.cart_included) cartIncludedFrom = true;

        const policy = this._resolveCancellationForTeeTime(t, course);
        if (policy && policy.free_cancellation) {
          freeCancellation = true;
          if (!cancellationSummary) {
            cancellationSummary = policy.name || policy.description || 'Free cancellation';
          }
        }
      }

      const sampleTeeTimes = teeList.slice(0, 5).map((t) => ({
        tee_time_id: t.id,
        start_datetime: t.start_datetime,
        time_of_day: t.time_of_day,
        holes: t.holes,
        current_price_per_player: t.current_price_per_player,
        base_price_per_player: t.base_price_per_player,
        discount_percent: t.discount_percent,
        cart_included: t.cart_included,
        available_player_spots: t.available_player_spots
      }));

      results.push({
        course_id: course.id,
        course_name: course.name,
        city: course.city,
        state: course.state,
        country: course.country,
        distance_miles: entry.distance_miles,
        rating: course.rating,
        review_count: course.review_count,
        latitude: course.latitude,
        longitude: course.longitude,
        min_base_price_per_player: minBase,
        min_current_price_per_player: minCurrent,
        best_discount_percent: bestDiscount,
        has_deals: hasDeals,
        cart_included_from: cartIncludedFrom,
        free_cancellation: freeCancellation,
        cancellation_summary: cancellationSummary,
        is_favorite: favoritesList.courseIds.includes(course.id),
        is_in_comparison: comparisonList.courseIds.includes(course.id),
        next_available_tee_times: sampleTeeTimes
      });
    }

    // Sorting
    const sortByNumber = (getter, asc = true) => (a, b) => {
      const av = getter(a);
      const bv = getter(b);
      const an = av == null ? (asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : av;
      const bn = bv == null ? (asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : bv;
      return asc ? an - bn : bn - an;
    };

    const sortBy = sortOpt;
    if (sortBy === 'price_low_to_high') {
      results.sort(sortByNumber((r) => r.min_current_price_per_player, true));
    } else if (sortBy === 'price_high_to_low') {
      results.sort(sortByNumber((r) => r.min_current_price_per_player, false));
    } else if (sortBy === 'rating_high_to_low') {
      results.sort(sortByNumber((r) => r.rating, false));
    } else if (sortBy === 'rating_low_to_high') {
      results.sort(sortByNumber((r) => r.rating, true));
    } else if (sortBy === 'discount_high_to_low') {
      results.sort(sortByNumber((r) => r.best_discount_percent, false));
    } else if (sortBy === 'discount_low_to_high') {
      results.sort(sortByNumber((r) => r.best_discount_percent, true));
    } else if (sortBy === 'most_reviewed') {
      results.sort(sortByNumber((r) => r.review_count, false));
    } else if (sortBy === 'distance_near_to_far') {
      results.sort(sortByNumber((r) => r.distance_miles, true));
    } else if (sortBy === 'distance_far_to_near') {
      results.sort(sortByNumber((r) => r.distance_miles, false));
    }

    return {
      search_context: ctx,
      total_results: results.length,
      results
    };
  }

  // 6) getCourseDetailWithTeeTimes(courseId,...)

  getCourseDetailWithTeeTimes(
    courseId,
    play_date,
    num_players,
    holes,
    time_of_day_filter,
    price_max
  ) {
    const courses = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);

    const course = courses.find((c) => c.id === courseId) || null;
    const ctx = this._getOrCreateSearchContext();

    const effectivePlayDate = play_date || ctx.play_date || null;
    const players = num_players || ctx.num_players || null;
    const searchHoles = holes || ctx.holes || null;
    const todFilter = time_of_day_filter || ctx.time_of_day_filter || 'any';
    const priceMaxVal = price_max !== undefined ? price_max : ctx.price_max;

    const tee_times_raw = teeTimes.filter((t) => {
      if (!t || t.status !== 'available') return false;
      if (t.courseId !== courseId) return false;
      if (effectivePlayDate) {
        const teeDate = this._extractDateString(t.start_datetime);
        if (teeDate !== effectivePlayDate) return false;
      }
      if (searchHoles && t.holes !== searchHoles) return false;
      if (todFilter && todFilter !== 'any' && t.time_of_day !== todFilter) return false;
      if (priceMaxVal !== null && priceMaxVal !== undefined) {
        const cur = this._toNumber(t.current_price_per_player, 0);
        if (cur > priceMaxVal) return false;
      }
      return true;
    });

    const tee_times = tee_times_raw.map((t) => {
      const selectable = players ? t.available_player_spots >= players : true;
      const cancellation_policy = this._resolveCancellationForTeeTime(t, course);
      const tee_time_with_course = {
        ...t,
        course
      };
      return {
        tee_time: tee_time_with_course,
        is_selectable_for_players: selectable,
        cancellation_policy,
        price_display: {
          current_price_per_player: t.current_price_per_player,
          base_price_per_player: t.base_price_per_player,
          discount_percent: t.discount_percent,
          cart_included: t.cart_included
        }
      };
    });

    const favoritesList = this._getOrCreateFavoritesList();
    const comparisonList = this._getOrCreateComparisonList();

    return {
      course,
      is_favorite: !!(course && favoritesList.courseIds.includes(course.id)),
      is_in_comparison: !!(course && comparisonList.courseIds.includes(course.id)),
      search_context: ctx,
      tee_times
    };
  }

  // 7) addTeeTimeToCart(teeTimeId, players_count, carts_count)

  addTeeTimeToCart(teeTimeId, players_count, carts_count) {
    const teeTimes = this._getFromStorage('tee_times', []);
    const courses = this._getFromStorage('courses', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const teeTime = teeTimes.find((t) => t.id === teeTimeId) || null;
    if (!teeTime || teeTime.status !== 'available') {
      return { success: false, message: 'Tee time not available', cart: null };
    }

    const course = courses.find((c) => c.id === teeTime.courseId) || null;
    const ctx = this._getOrCreateSearchContext();

    const players = players_count || ctx.num_players || 1;
    if (teeTime.min_players_per_booking && players < teeTime.min_players_per_booking) {
      return {
        success: false,
        message: 'Minimum players requirement not met',
        cart: null
      };
    }
    if (teeTime.max_players_per_booking && players > teeTime.max_players_per_booking) {
      return {
        success: false,
        message: 'Maximum players exceeded for this tee time',
        cart: null
      };
    }
    if (teeTime.available_player_spots < players) {
      return {
        success: false,
        message: 'Not enough available spots for requested players',
        cart: null
      };
    }

    let carts = this._getFromStorage('carts', []);
    let cart = this._getOrCreateCart();

    const cartIncluded = !!teeTime.cart_included;
    let cartsCount;
    if (carts_count !== undefined && carts_count !== null) {
      cartsCount = carts_count;
    } else {
      cartsCount = cartIncluded ? 0 : Math.ceil(players / 2);
    }

    const pricePerPlayer = this._toNumber(teeTime.current_price_per_player, 0);
    const cartPricePerCart = this._toNumber(teeTime.cart_price_per_cart, 0);
    const basePlayersTotal = pricePerPlayer * players;
    const cartsTotal = cartIncluded ? 0 : cartPricePerCart * cartsCount;
    const totalPrice = basePlayersTotal + cartsTotal;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'tee_time',
      teeTimeId: teeTime.id,
      packageId: null,
      courseId: teeTime.courseId,
      course_name: course ? course.name : null,
      players_count: players,
      carts_count: cartsCount,
      start_datetime: teeTime.start_datetime,
      date: this._extractDateString(teeTime.start_datetime),
      holes: teeTime.holes,
      price_per_player: pricePerPlayer,
      total_price: totalPrice,
      status: 'active'
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Update cart itemIds
    if (!Array.isArray(cart.itemIds)) cart.itemIds = [];
    cart.itemIds.push(cartItem.id);

    // Decrement available spots in tee time
    teeTime.available_player_spots = this._toNumber(teeTime.available_player_spots, 0) - players;
    if (teeTime.available_player_spots < 0) teeTime.available_player_spots = 0;
    const ttIdx = teeTimes.findIndex((t) => t.id === teeTime.id);
    if (ttIdx >= 0) teeTimes[ttIdx] = teeTime;
    this._saveToStorage('tee_times', teeTimes);

    // Recalculate cart totals (respecting any existing promo)
    const promo = cart.applied_promo_code
      ? this._getPromoByCode(cart.applied_promo_code)
      : null;
    cart = this._computeCartTotals(cart, cartItems, promo);

    this._saveCart(cart);

    const itemsReturn = this._cartItemsToReturnItems(cart, cartItems);

    return {
      success: true,
      message: 'Tee time added to cart',
      cart: {
        cart_id: cart.id,
        currency: cart.currency,
        items: itemsReturn,
        applied_promo_code: cart.applied_promo_code,
        promo_discount_amount: cart.promo_discount_amount,
        subtotal_amount: cart.subtotal_amount,
        tax_amount: cart.tax_amount,
        total_amount: cart.total_amount
      }
    };
  }

  // 8) startBookingForTeeTime(teeTimeId, players_count, carts_count)

  startBookingForTeeTime(teeTimeId, players_count, carts_count) {
    const addResult = this.addTeeTimeToCart(teeTimeId, players_count, carts_count);
    if (!addResult.success) {
      return {
        booking_id: null,
        status: 'in_progress',
        contact_email: null,
        contact_phone: null,
        required_contact_fields: ['contact_email', 'contact_phone'],
        items: [],
        subtotal_amount: 0,
        promo_code: null,
        promo_discount_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        currency: 'usd',
        next_step: 'contact'
      };
    }

    const booking = this._getOrCreateBookingForCurrentCart();
    const bookings = this._getFromStorage('bookings', []);
    const bookingItems = this._getFromStorage('booking_items', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const courses = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);
    const packages = this._getFromStorage('packages', []);

    const items = booking.bookingItemIds
      .map((id) => bookingItems.find((bi) => bi.id === id) || null)
      .filter(Boolean)
      .map((bi) => {
        const course = bi.courseId ? courses.find((c) => c.id === bi.courseId) || null : null;
        const tee_time = bi.teeTimeId
          ? teeTimes.find((t) => t.id === bi.teeTimeId) || null
          : null;
        const pkg = bi.packageId ? packages.find((p) => p.id === bi.packageId) || null : null;
        return {
          course_name: bi.course_name || (course ? course.name : null),
          course_id: bi.courseId || (course ? course.id : null),
          tee_time_id: bi.teeTimeId || null,
          package_id: bi.packageId || null,
          date: bi.date,
          start_datetime: bi.start_datetime,
          holes: bi.holes,
          players_count: bi.players_count,
          carts_count: bi.carts_count,
          price_per_player: bi.price_per_player,
          line_total: bi.total_price,
          // Foreign key resolutions
          course,
          tee_time,
          package: pkg
        };
      });

    return {
      booking_id: booking.id,
      status: booking.status,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      required_contact_fields: ['contact_email', 'contact_phone'],
      items,
      subtotal_amount: booking.subtotal_amount,
      promo_code: booking.promo_code,
      promo_discount_amount: booking.promo_discount_amount,
      tax_amount: booking.tax_amount,
      total_amount: booking.total_amount,
      currency: booking.currency,
      next_step: booking.contact_email && booking.contact_phone ? 'payment' : 'contact'
    };
  }

  // 9) getCartSummary()

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    // Ensure totals are current (without modifying promo code)
    const promo = cart.applied_promo_code
      ? this._getPromoByCode(cart.applied_promo_code)
      : null;
    const updatedCart = this._computeCartTotals(cart, cartItems, promo);
    this._saveCart(updatedCart);

    const items = this._cartItemsToReturnItems(updatedCart, cartItems);

    return {
      cart_id: updatedCart.id,
      currency: updatedCart.currency,
      items,
      applied_promo_code: updatedCart.applied_promo_code,
      promo_discount_amount: updatedCart.promo_discount_amount,
      subtotal_amount: updatedCart.subtotal_amount,
      tax_amount: updatedCart.tax_amount,
      total_amount: updatedCart.total_amount
    };
  }

  // 10) updateCartItemPlayersAndCarts(cartItemId, players_count, carts_count)

  updateCartItemPlayersAndCarts(cartItemId, players_count, carts_count) {
    let cartItems = this._getFromStorage('cart_items', []);
    const teeTimes = this._getFromStorage('tee_times', []);

    const itemIdx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIdx < 0) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const ci = cartItems[itemIdx];
    if (ci.item_type !== 'tee_time') {
      return { success: false, message: 'Only tee time items can be updated', cart: null };
    }

    const teeTime = teeTimes.find((t) => t.id === ci.teeTimeId) || null;
    if (!teeTime) {
      return { success: false, message: 'Associated tee time not found', cart: null };
    }

    const oldPlayers = this._toNumber(ci.players_count || 0, 0);
    const newPlayers = players_count !== undefined ? players_count : oldPlayers;

    if (teeTime.min_players_per_booking && newPlayers < teeTime.min_players_per_booking) {
      return {
        success: false,
        message: 'Minimum players requirement not met',
        cart: null
      };
    }
    if (teeTime.max_players_per_booking && newPlayers > teeTime.max_players_per_booking) {
      return {
        success: false,
        message: 'Maximum players exceeded for this tee time',
        cart: null
      };
    }

    const deltaPlayers = newPlayers - oldPlayers;
    const available = this._toNumber(teeTime.available_player_spots, 0);
    if (deltaPlayers > 0 && available < deltaPlayers) {
      return {
        success: false,
        message: 'Not enough available spots for requested players',
        cart: null
      };
    }

    // Update tee time available spots
    teeTime.available_player_spots = available - deltaPlayers;
    const ttIdx = teeTimes.findIndex((t) => t.id === teeTime.id);
    if (ttIdx >= 0) teeTimes[ttIdx] = teeTime;
    this._saveToStorage('tee_times', teeTimes);

    const cartIncluded = !!teeTime.cart_included;
    let newCartsCount;
    if (carts_count !== undefined && carts_count !== null) {
      newCartsCount = carts_count;
    } else {
      newCartsCount = cartIncluded ? 0 : ci.carts_count || 0;
    }

    const pricePerPlayer = this._toNumber(teeTime.current_price_per_player, 0);
    const cartPricePerCart = this._toNumber(teeTime.cart_price_per_cart, 0);
    const basePlayersTotal = pricePerPlayer * newPlayers;
    const cartsTotal = cartIncluded ? 0 : cartPricePerCart * newCartsCount;
    const totalPrice = basePlayersTotal + cartsTotal;

    ci.players_count = newPlayers;
    ci.carts_count = newCartsCount;
    ci.price_per_player = pricePerPlayer;
    ci.total_price = totalPrice;

    cartItems[itemIdx] = ci;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const promo = cart.applied_promo_code
      ? this._getPromoByCode(cart.applied_promo_code)
      : null;
    const updatedCart = this._computeCartTotals(cart, cartItems, promo);
    this._saveCart(updatedCart);

    const cartItemsSummary = cartItems
      .filter((i) => i.cartId === updatedCart.id && (i.status === undefined || i.status === 'active'))
      .map((i) => ({
        cart_item_id: i.id,
        players_count: i.players_count,
        carts_count: i.carts_count,
        line_total: this._toNumber(i.total_price, 0)
      }));

    return {
      success: true,
      message: 'Cart item updated',
      cart: {
        cart_id: updatedCart.id,
        items: cartItemsSummary,
        subtotal_amount: updatedCart.subtotal_amount,
        tax_amount: updatedCart.tax_amount,
        total_amount: updatedCart.total_amount
      }
    };
  }

  // 11) removeCartItem(cartItemId)

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const teeTimes = this._getFromStorage('tee_times', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx < 0) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const ci = cartItems[idx];

    // Restore tee time available spots if applicable
    if (ci.item_type === 'tee_time' && ci.teeTimeId) {
      const teeTimeIdx = teeTimes.findIndex((t) => t.id === ci.teeTimeId);
      if (teeTimeIdx >= 0) {
        const teeTime = teeTimes[teeTimeIdx];
        const players = this._toNumber(ci.players_count || 0, 0);
        teeTime.available_player_spots =
          this._toNumber(teeTime.available_player_spots, 0) + players;
        teeTimes[teeTimeIdx] = teeTime;
        this._saveToStorage('tee_times', teeTimes);
      }
    }

    // Mark as removed and remove from cart's itemIds
    ci.status = 'removed';
    cartItems[idx] = ci;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    if (Array.isArray(cart.itemIds)) {
      cart.itemIds = cart.itemIds.filter((id) => id !== cartItemId);
    }

    const promo = cart.applied_promo_code
      ? this._getPromoByCode(cart.applied_promo_code)
      : null;
    const updatedCart = this._computeCartTotals(cart, cartItems, promo);
    this._saveCart(updatedCart);

    const remainingItems = cartItems
      .filter((i) => i.cartId === updatedCart.id && (i.status === undefined || i.status === 'active'))
      .map((i) => ({ cart_item_id: i.id }));

    return {
      success: true,
      message: 'Cart item removed',
      cart: {
        cart_id: updatedCart.id,
        items: remainingItems,
        subtotal_amount: updatedCart.subtotal_amount,
        tax_amount: updatedCart.tax_amount,
        total_amount: updatedCart.total_amount
      }
    };
  }

  // 12) applyPromoCodeToCart(promo_code)

  applyPromoCodeToCart(promo_code) {
    const promo = this._getPromoByCode(promo_code);
    if (!promo) {
      return {
        success: false,
        message: 'Promo code is invalid or not active',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const updatedCart = this._computeCartTotals(cart, cartItems, promo);
    this._saveCart(updatedCart);

    return {
      success: true,
      message: 'Promo code applied',
      cart: {
        cart_id: updatedCart.id,
        applied_promo_code: updatedCart.applied_promo_code,
        promo_discount_amount: updatedCart.promo_discount_amount,
        subtotal_amount: updatedCart.subtotal_amount,
        tax_amount: updatedCart.tax_amount,
        total_amount: updatedCart.total_amount
      }
    };
  }

  // 13) removePromoCodeFromCart()

  removePromoCodeFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    cart.applied_promo_code = null;
    cart.promo_discount_amount = 0;
    const updatedCart = this._computeCartTotals(cart, cartItems, null);
    this._saveCart(updatedCart);

    return {
      cart_id: updatedCart.id,
      applied_promo_code: updatedCart.applied_promo_code,
      promo_discount_amount: updatedCart.promo_discount_amount,
      subtotal_amount: updatedCart.subtotal_amount,
      tax_amount: updatedCart.tax_amount,
      total_amount: updatedCart.total_amount
    };
  }

  // 14) getCheckoutSummary()

  getCheckoutSummary() {
    const booking = this._getOrCreateBookingForCurrentCart();
    const bookings = this._getFromStorage('bookings', []);
    const bookingItems = this._getFromStorage('booking_items', []);
    const courses = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);
    const packages = this._getFromStorage('packages', []);

    const items = booking.bookingItemIds
      .map((id) => bookingItems.find((bi) => bi.id === id) || null)
      .filter(Boolean)
      .map((bi) => {
        const course = bi.courseId ? courses.find((c) => c.id === bi.courseId) || null : null;
        const tee_time = bi.teeTimeId
          ? teeTimes.find((t) => t.id === bi.teeTimeId) || null
          : null;
        const pkg = bi.packageId ? packages.find((p) => p.id === bi.packageId) || null : null;
        return {
          item_type: bi.item_type,
          course_name: bi.course_name || (course ? course.name : null),
          course_id: bi.courseId || (course ? course.id : null),
          tee_time_id: bi.teeTimeId || null,
          package_id: bi.packageId || null,
          date: bi.date,
          start_datetime: bi.start_datetime,
          holes: bi.holes,
          players_count: bi.players_count,
          carts_count: bi.carts_count,
          price_per_player: bi.price_per_player,
          line_total: bi.total_price,
          // Foreign key resolutions
          course,
          tee_time,
          package: pkg
        };
      });

    const next_step = booking.contact_email && booking.contact_phone ? 'payment' : 'contact';

    return {
      booking_id: booking.id,
      status: booking.status,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      required_contact_fields: ['contact_email', 'contact_phone'],
      items,
      subtotal_amount: booking.subtotal_amount,
      promo_code: booking.promo_code,
      promo_discount_amount: booking.promo_discount_amount,
      tax_amount: booking.tax_amount,
      total_amount: booking.total_amount,
      currency: booking.currency,
      next_step
    };
  }

  // 15) submitContactDetails(contact_email, contact_phone)

  submitContactDetails(contact_email, contact_phone) {
    let booking = this._getCurrentBooking();
    if (!booking) {
      booking = this._getOrCreateBookingForCurrentCart();
    }

    booking.contact_email = contact_email;
    booking.contact_phone = contact_phone;

    let bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) bookings[idx] = booking;
    else bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    this._saveToStorage('current_booking_id', booking.id);

    return {
      booking_id: booking.id,
      status: booking.status,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      next_step: 'payment'
    };
  }

  // 16) submitPaymentAndConfirmBooking(payment)

  submitPaymentAndConfirmBooking(payment) {
    let booking = this._getCurrentBooking();
    if (!booking) {
      booking = this._getOrCreateBookingForCurrentCart();
    }

    booking.status = 'confirmed';
    if (!booking.booking_reference) {
      booking.booking_reference = 'BR-' + booking.id;
    }

    let bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) bookings[idx] = booking;
    else bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      message: 'Booking confirmed'
    };
  }

  // 17) getLatestBookingConfirmation()

  getLatestBookingConfirmation() {
    const bookings = this._getFromStorage('bookings', []);
    const confirmed = bookings.filter((b) => b.status === 'confirmed');
    if (!confirmed.length) return null;

    confirmed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const booking = confirmed[0];

    const bookingItems = this._getFromStorage('booking_items', []);
    const courses = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);
    const packages = this._getFromStorage('packages', []);
    const policies = this._getFromStorage('cancellation_policies', []);

    const itemsRaw = bookingItems.filter((bi) => bi.bookingId === booking.id);

    const items = itemsRaw.map((bi) => {
      const course = bi.courseId ? courses.find((c) => c.id === bi.courseId) || null : null;
      const tee_time = bi.teeTimeId
        ? teeTimes.find((t) => t.id === bi.teeTimeId) || null
        : null;
      const pkg = bi.packageId ? packages.find((p) => p.id === bi.packageId) || null : null;
      return {
        item_type: bi.item_type,
        course_name: bi.course_name || (course ? course.name : null),
        course_id: bi.courseId || (course ? course.id : null),
        tee_time_id: bi.teeTimeId || null,
        package_id: bi.packageId || null,
        date: bi.date,
        start_datetime: bi.start_datetime,
        holes: bi.holes,
        players_count: bi.players_count,
        carts_count: bi.carts_count,
        price_per_player: bi.price_per_player,
        line_total: bi.total_price,
        // Foreign key resolutions
        course,
        tee_time,
        package: pkg
      };
    });

    // Collect cancellation policies used
    const cancellationPoliciesMap = new Map();
    for (const bi of itemsRaw) {
      const course = bi.courseId ? courses.find((c) => c.id === bi.courseId) || null : null;
      const tee_time = bi.teeTimeId
        ? teeTimes.find((t) => t.id === bi.teeTimeId) || null
        : null;
      const policy = this._resolveCancellationForTeeTime(tee_time, course);
      if (policy && !cancellationPoliciesMap.has(policy.id)) {
        cancellationPoliciesMap.set(policy.id, policy);
      }
    }

    const cancellation_policies = Array.from(cancellationPoliciesMap.values());

    const instructions = [
      'Arrive at least 15 minutes before your tee time to check in.',
      'Bring a valid photo ID and your confirmation reference.',
      'Contact the course directly for any last-minute changes.'
    ];

    return {
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      status: booking.status,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      items,
      subtotal_amount: booking.subtotal_amount,
      promo_code: booking.promo_code,
      promo_discount_amount: booking.promo_discount_amount,
      tax_amount: booking.tax_amount,
      total_amount: booking.total_amount,
      currency: booking.currency,
      cancellation_policies,
      instructions
    };
  }

  // 18) addCourseToFavorites(courseId)

  addCourseToFavorites(courseId) {
    const list = this._getOrCreateFavoritesList();
    if (!list.courseIds.includes(courseId)) {
      list.courseIds.push(courseId);
      list.updated_at = this._nowISO();
      this._saveFavoritesList(list);
    }
    return {
      favorites: list,
      is_favorite: true
    };
  }

  // 19) removeCourseFromFavorites(courseId)

  removeCourseFromFavorites(courseId) {
    const list = this._getOrCreateFavoritesList();
    list.courseIds = list.courseIds.filter((id) => id !== courseId);
    list.updated_at = this._nowISO();
    this._saveFavoritesList(list);
    return list;
  }

  // 20) getFavoritesList()

  getFavoritesList() {
    const list = this._getOrCreateFavoritesList();
    const coursesAll = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);
    const ctx = this._getOrCreateSearchContext();

    const refLat = ctx.location_latitude;
    const refLon = ctx.location_longitude;

    // Instrumentation for task completion tracking
    try {
      if (
        list &&
        list.id === 'default' &&
        Array.isArray(list.courseIds) &&
        list.courseIds.length > 0
      ) {
        localStorage.setItem('task8_favoritesViewed', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const courses = list.courseIds
      .map((id) => coursesAll.find((c) => c.id === id) || null)
      .filter(Boolean)
      .map((course) => {
        const distance_miles =
          refLat != null && refLon != null && course.latitude != null
            ? this._computeDistanceMiles(refLat, refLon, course.latitude, course.longitude)
            : null;

        const courseTeeTimes = teeTimes.filter(
          (t) => t.courseId === course.id && t.status === 'available'
        );
        let minCurrent = null;
        for (const t of courseTeeTimes) {
          const cur = this._toNumber(t.current_price_per_player, 0);
          if (minCurrent === null || cur < minCurrent) minCurrent = cur;
        }

        return {
          course,
          distance_miles,
          min_current_price_per_player: minCurrent,
          rating: course.rating,
          review_count: course.review_count
        };
      });

    return {
      favorites: list,
      courses
    };
  }

  // 21) addCourseToComparison(courseId)

  addCourseToComparison(courseId) {
    const list = this._getOrCreateComparisonList();
    if (!list.courseIds.includes(courseId)) {
      if (list.courseIds.length >= (list.max_items || 3)) {
        // Enforce max by removing the oldest
        list.courseIds.shift();
      }
      list.courseIds.push(courseId);
      list.updated_at = this._nowISO();
      this._saveComparisonList(list);
    }
    return list;
  }

  // 22) removeCourseFromComparison(courseId)

  removeCourseFromComparison(courseId) {
    const list = this._getOrCreateComparisonList();
    list.courseIds = list.courseIds.filter((id) => id !== courseId);
    list.updated_at = this._nowISO();
    this._saveComparisonList(list);
    return list;
  }

  // 23) clearComparisonList()

  clearComparisonList() {
    const list = this._getOrCreateComparisonList();
    list.courseIds = [];
    list.updated_at = this._nowISO();
    this._saveComparisonList(list);
    return list;
  }

  // 24) getComparisonList()

  getComparisonList() {
    const list = this._getOrCreateComparisonList();
    const coursesAll = this._getFromStorage('courses', []);
    const teeTimes = this._getFromStorage('tee_times', []);
    const policies = this._getFromStorage('cancellation_policies', []);
    const ctx = this._getOrCreateSearchContext();

    const refLat = ctx.location_latitude;
    const refLon = ctx.location_longitude;

    // Instrumentation for task completion tracking
    try {
      if (
        list &&
        list.id === 'default' &&
        Array.isArray(list.courseIds) &&
        list.courseIds.length >= 3
      ) {
        localStorage.setItem(
          'task4_comparisonViewed',
          JSON.stringify({
            "courseIds": list.courseIds.slice(),
            "viewed_at": this._nowISO()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const courses = list.courseIds
      .map((id) => coursesAll.find((c) => c.id === id) || null)
      .filter(Boolean)
      .map((course) => {
        const distance_miles =
          refLat != null && refLon != null && course.latitude != null
            ? this._computeDistanceMiles(refLat, refLon, course.latitude, course.longitude)
            : null;

        const courseTeeTimes = teeTimes.filter(
          (t) => t.courseId === course.id && t.status === 'available'
        );

        let minCurrent = null;
        let minBase = null;
        let bestDiscount = null;
        let anyTeePolicy = null;
        for (const t of courseTeeTimes) {
          const cur = this._toNumber(t.current_price_per_player, 0);
          const base = this._toNumber(t.base_price_per_player, cur);
          const disc = typeof t.discount_percent === 'number' ? t.discount_percent : 0;
          if (minCurrent === null || cur < minCurrent) minCurrent = cur;
          if (minBase === null || base < minBase) minBase = base;
          if (bestDiscount === null || disc > bestDiscount) bestDiscount = disc;
          const policy = this._resolveCancellationForTeeTime(t, course);
          if (policy && !anyTeePolicy) anyTeePolicy = policy;
        }

        let cancellation_policy = null;
        if (course.default_cancellation_policy_id) {
          cancellation_policy =
            policies.find((p) => p.id === course.default_cancellation_policy_id) || null;
        }
        if (!cancellation_policy && anyTeePolicy) {
          cancellation_policy = anyTeePolicy;
        }

        return {
          course,
          distance_miles,
          min_current_price_per_player: minCurrent,
          min_base_price_per_player: minBase,
          best_discount_percent: bestDiscount,
          amenities: course.amenities || [],
          cancellation_policy
        };
      });

    return {
      comparison_list: list,
      courses
    };
  }

  // 25) getPackageFilterOptions()

  getPackageFilterOptions() {
    return {
      rounds_ranges: [
        { label: '1–5 rounds', min_rounds: 1, max_rounds: 5 },
        { label: '6–9 rounds', min_rounds: 6, max_rounds: 9 },
        { label: '10+ rounds', min_rounds: 10, max_rounds: null }
      ],
      price_ranges: [
        { label: 'Under $200', min: 0, max: 200 },
        { label: '$200–$400', min: 200, max: 400 },
        { label: '$400–$800', min: 400, max: 800 },
        { label: '$800+', min: 800, max: null }
      ],
      rating_min_values: [3, 3.5, 4, 4.5, 5],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'discount_high_to_low', label: 'Discount: High to Low' }
      ]
    };
  }

  // 26) listPackages(rounds_min, rounds_max, location_region, price_min, price_max,
  //                  rating_min, discount_min_percent, sort_option)

  listPackages(
    rounds_min,
    rounds_max,
    location_region,
    price_min,
    price_max,
    rating_min,
    discount_min_percent,
    sort_option
  ) {
    const packagesAll = this._getFromStorage('packages', []);

    const roundsMin = rounds_min !== undefined ? rounds_min : null;
    const roundsMax = rounds_max !== undefined ? rounds_max : null;
    const locRegionNorm = this._normalizeString(location_region);
    const priceMinVal = price_min !== undefined ? price_min : null;
    const priceMaxVal = price_max !== undefined ? price_max : null;
    const ratingMinVal = rating_min !== undefined ? rating_min : null;
    const discountMinVal =
      discount_min_percent !== undefined ? discount_min_percent : null;
    const sortOpt = sort_option || 'price_low_to_high';

    let filtered = packagesAll.filter((p) => p.status === 'active');

    if (roundsMin !== null) {
      filtered = filtered.filter((p) => this._toNumber(p.rounds_included, 0) >= roundsMin);
    }
    if (roundsMax !== null) {
      filtered = filtered.filter((p) => this._toNumber(p.rounds_included, 0) <= roundsMax);
    }
    if (locRegionNorm) {
      filtered = filtered.filter((p) =>
        this._normalizeString(p.location_region).includes(locRegionNorm)
      );
    }
    if (priceMinVal !== null) {
      filtered = filtered.filter((p) => this._toNumber(p.price_total, 0) >= priceMinVal);
    }
    if (priceMaxVal !== null) {
      filtered = filtered.filter((p) => this._toNumber(p.price_total, 0) <= priceMaxVal);
    }
    if (ratingMinVal !== null) {
      filtered = filtered.filter((p) =>
        typeof p.rating === 'number' ? p.rating >= ratingMinVal : false
      );
    }
    if (discountMinVal !== null) {
      filtered = filtered.filter((p) =>
        typeof p.discount_percent === 'number' ? p.discount_percent >= discountMinVal : false
      );
    }

    const withDerived = filtered.map((p) => {
      let pricePerRound = p.price_per_round;
      if (pricePerRound == null && p.rounds_included) {
        pricePerRound = this._toNumber(p.price_total, 0) / this._toNumber(p.rounds_included, 1);
      }
      return { package: p, price_per_round: pricePerRound };
    });

    if (sortOpt === 'price_low_to_high') {
      withDerived.sort((a, b) => a.price_per_round - b.price_per_round);
    } else if (sortOpt === 'price_high_to_low') {
      withDerived.sort((a, b) => b.price_per_round - a.price_per_round);
    } else if (sortOpt === 'rating_high_to_low') {
      withDerived.sort((a, b) => (b.package.rating || 0) - (a.package.rating || 0));
    } else if (sortOpt === 'discount_high_to_low') {
      withDerived.sort(
        (a, b) => (b.package.discount_percent || 0) - (a.package.discount_percent || 0)
      );
    }

    // Determine best value (lowest price per round among filtered)
    let minPricePerRound = null;
    for (const r of withDerived) {
      const v = r.price_per_round;
      if (v == null) continue;
      if (minPricePerRound === null || v < minPricePerRound) minPricePerRound = v;
    }

    const packages = withDerived.map((r) => ({
      package: r.package,
      price_per_round: r.price_per_round,
      is_best_value:
        minPricePerRound != null && r.price_per_round != null &&
        Math.abs(r.price_per_round - minPricePerRound) < 1e-6
    }));

    return {
      total_results: packages.length,
      packages
    };
  }

  // 27) getPackageDetail(packageId)

  getPackageDetail(packageId) {
    const packagesAll = this._getFromStorage('packages', []);
    const coursesAll = this._getFromStorage('courses', []);

    const pkg = packagesAll.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        valid_courses: [],
        price_per_round: null,
        is_available: false
      };
    }

    const valid_courses = Array.isArray(pkg.validCourseIds)
      ? pkg.validCourseIds
          .map((id) => coursesAll.find((c) => c.id === id) || null)
          .filter(Boolean)
      : [];

    let price_per_round = pkg.price_per_round;
    if (price_per_round == null && pkg.rounds_included) {
      price_per_round = this._toNumber(pkg.price_total, 0) / this._toNumber(pkg.rounds_included, 1);
    }

    const now = new Date();
    let is_available = pkg.status === 'active';
    if (pkg.valid_from && new Date(pkg.valid_from) > now) is_available = false;
    if (pkg.valid_to && new Date(pkg.valid_to) < now) is_available = false;

    return {
      package: pkg,
      valid_courses,
      price_per_round,
      is_available
    };
  }

  // 28) addPackageToCart(packageId, quantity)

  addPackageToCart(packageId, quantity) {
    const packagesAll = this._getFromStorage('packages', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const pkg = packagesAll.find((p) => p.id === packageId) || null;
    if (!pkg || pkg.status !== 'active') {
      return { success: false, message: 'Package not available', cart: null };
    }

    const qty = quantity !== undefined && quantity !== null ? quantity : 1;
    const cart = this._getOrCreateCart();

    const lineTotal = this._toNumber(pkg.price_total, 0) * qty;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'package',
      teeTimeId: null,
      packageId: pkg.id,
      courseId: null,
      course_name: null,
      players_count: null,
      carts_count: null,
      start_datetime: null,
      date: null,
      holes: null,
      price_per_player: null,
      price_per_package: this._toNumber(pkg.price_total, 0),
      quantity: qty,
      total_price: lineTotal,
      status: 'active'
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.itemIds)) cart.itemIds = [];
    cart.itemIds.push(cartItem.id);

    const promo = cart.applied_promo_code
      ? this._getPromoByCode(cart.applied_promo_code)
      : null;
    const updatedCart = this._computeCartTotals(cart, cartItems, promo);
    this._saveCart(updatedCart);

    const itemsReturn = this._cartItemsToReturnItems(updatedCart, cartItems);

    return {
      success: true,
      message: 'Package added to cart',
      cart: {
        cart_id: updatedCart.id,
        items: itemsReturn,
        subtotal_amount: updatedCart.subtotal_amount,
        tax_amount: updatedCart.tax_amount,
        total_amount: updatedCart.total_amount
      }
    };
  }

  // 29) getAboutPageContent()

  getAboutPageContent() {
    let content = this._getFromStorage('about_page_content', null);
    if (!content) {
      content = {
        headline: 'Save on golf tee times and packages',
        intro:
          'Discover and book discounted tee times at top golf courses, all in one easy-to-use place.',
        feature_sections: [
          {
            title: 'Search smart',
            description:
              'Filter by price, rating, time of day, and distance to find the perfect round for you.'
          },
          {
            title: 'Score the best deals',
            description:
              'Unlock exclusive discounts on tee times and multi-round packages with transparent pricing.'
          },
          {
            title: 'Book in seconds',
            description:
              'Secure your tee time online and manage your bookings, favorites, and comparisons anytime.'
          }
        ],
        how_it_works: [
          {
            step_title: 'Search nearby tee times',
            step_description:
              'Enter your city, choose a date, set players and holes, then apply filters to see the best options.'
          },
          {
            step_title: 'Compare and save',
            step_description:
              'Sort by price, rating, or discount and compare courses side by side before you book.'
          },
          {
            step_title: 'Book and play',
            step_description:
              'Add your tee time or package to the cart, check out securely, and enjoy your round.'
          }
        ]
      };
      this._saveToStorage('about_page_content', content);
    }
    return content;
  }

  // 30) getContactOptions()

  getContactOptions() {
    let options = this._getFromStorage('contact_options', null);
    if (!options) {
      options = {
        support_email: 'support@example-golf.com',
        support_hours: '7 days a week, 8:00am – 6:00pm (local time)',
        support_phone: '+1 (800) 000-0000',
        faq_link_label: 'View FAQs',
        help_center_link_label: 'Visit Help Center'
      };
      this._saveToStorage('contact_options', options);
    }
    return options;
  }

  // 31) submitContactForm(name, email, subject, message)

  submitContactForm(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact_msg'),
      name,
      email,
      subject,
      message,
      created_at: this._nowISO()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  // 32) getFaqItems()

  getFaqItems() {
    let items = this._getFromStorage('faq_items', null);
    if (!items) {
      items = [
        {
          category: 'searching_tee_times',
          question: 'How do I find tee times near me?',
          answer:
            'Use the location search box to enter your city, then choose your date, players, and holes. You can refine results using time-of-day, price, rating, and distance filters.'
        },
        {
          category: 'discounts_and_deals',
          question: 'What are Deals or Special Offers?',
          answer:
            'Deals are discounted tee times or packages offered for a limited time. Turn on the Deals filter to see only discounted options and sort by Discount: High to Low to surface the biggest savings.'
        },
        {
          category: 'promo_codes',
          question: 'How do promo codes work?',
          answer:
            'Enter your promo code in the cart or during checkout. If the code is active and your cart meets the requirements, the discount will be applied to eligible items.'
        },
        {
          category: 'cancellation_policy',
          question: 'How can I find tee times with free cancellation?',
          answer:
            "Use the cancellation policy filter and choose Free cancellation only. Tee times that match will clearly display their cancellation terms before you book."
        }
      ];
      this._saveToStorage('faq_items', items);
    }
    return items;
  }

  // 33) getTermsContent()

  getTermsContent() {
    let content = this._getFromStorage('terms_content', null);
    if (!content) {
      content = {
        last_updated: this._nowISO().substring(0, 10),
        sections: [
          {
            title: 'Use of Service',
            body:
              'By accessing or using this website you agree to be bound by these terms. You must be at least 18 years old or have permission from a legal guardian to make bookings.'
          },
          {
            title: 'Bookings and Payments',
            body:
              'All tee time and package bookings are subject to availability and the terms of the relevant course or provider. Prices and availability may change until your booking is confirmed.'
          },
          {
            title: 'Cancellations and Changes',
            body:
              'Cancellation policies vary by course and tee time. Always review the specific cancellation terms shown during checkout and on your confirmation page.'
          }
        ]
      };
      this._saveToStorage('terms_content', content);
    }
    return content;
  }

  // 34) getPrivacyPolicyContent()

  getPrivacyPolicyContent() {
    let content = this._getFromStorage('privacy_policy_content', null);
    if (!content) {
      content = {
        last_updated: this._nowISO().substring(0, 10),
        sections: [
          {
            title: 'Information We Collect',
            body:
              'We collect information you provide directly (such as contact details and booking information) as well as limited technical data used to operate and improve the service.'
          },
          {
            title: 'How We Use Your Information',
            body:
              'Your information is used to process bookings, provide customer support, send confirmations, and improve our products and services.'
          },
          {
            title: 'Your Choices',
            body:
              'You can request access, updates, or deletion of your personal data subject to applicable law by contacting our support team.'
          }
        ]
      };
      this._saveToStorage('privacy_policy_content', content);
    }
    return content;
  }

  // 35) getCancellationPolicyContent()

  getCancellationPolicyContent() {
    let content = this._getFromStorage('cancellation_policy_content', null);
    const policies = this._getFromStorage('cancellation_policies', []);

    if (!content) {
      content = {
        intro:
          'Cancellation terms vary by course and tee time. Always review the policy shown before confirming your booking.',
        policy_sections: [
          {
            title: 'Free cancellation',
            body:
              'Some tee times allow free cancellation up to a certain number of hours before your round. These are clearly marked during search and checkout.'
          },
          {
            title: 'Partial and non-refundable bookings',
            body:
              'Other tee times may be partially refundable or non-refundable. The applicable policy is displayed before you complete your booking.'
          }
        ],
        standard_policies: policies
      };
      this._saveToStorage('cancellation_policy_content', content);
    } else {
      // Ensure we include latest policies
      content.standard_policies = policies;
      this._saveToStorage('cancellation_policy_content', content);
    }

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