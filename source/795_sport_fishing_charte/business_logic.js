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

// Expose polyfilled localStorage to the global scope so external code (like tests)
// uses the same storage instance in Node.js environments.
try {
  if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
    globalThis.localStorage = localStorage;
  }
} catch (e) {}

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'locations',
      'captains',
      'boats',
      'charters',
      'charter_reviews',
      'addons',
      'favorite_lists',
      'compare_selections',
      'carts',
      'cart_items',
      'bookings',
      'booking_extras',
      'promo_codes',
      'captain_messages',
      'support_tickets',
      'faq_articles',
      'recent_searches'
    ];

    const objectKeys = [
      'faq_index',
      'about_content',
      'support_contact_info',
      'terms_content',
      'privacy_content',
      'auth_state',
      'booking_draft'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  // ---------------------- Generic helpers ----------------------

  _parseDate(dateStr) {
    // Expecting 'YYYY-MM-DD'
    return new Date(dateStr + 'T00:00:00Z');
  }

  _formatDateToISO(date) {
    return new Date(date).toISOString();
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
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
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

  _clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  // Entity lookup helpers

  _getLocationById(id) {
    const locations = this._getFromStorage('locations', []);
    return locations.find((l) => l.id === id) || null;
  }

  _getCaptainById(id) {
    const captains = this._getFromStorage('captains', []);
    return captains.find((c) => c.id === id) || null;
  }

  _getBoatById(id) {
    const boats = this._getFromStorage('boats', []);
    return boats.find((b) => b.id === id) || null;
  }

  _getCharterById(id) {
    const charters = this._getFromStorage('charters', []);
    return charters.find((c) => c.id === id) || null;
  }

  _getAddOnById(id) {
    const addons = this._getFromStorage('addons', []);
    return addons.find((a) => a.id === id) || null;
  }

  _getPromoById(id) {
    const promos = this._getFromStorage('promo_codes', []);
    return promos.find((p) => p.id === id) || null;
  }

  _getPromoByCode(code) {
    const promos = this._getFromStorage('promo_codes', []);
    const normalized = String(code || '').trim().toUpperCase();
    return (
      promos.find(
        (p) =>
          p.code &&
          String(p.code).trim().toUpperCase() === normalized &&
          p.is_active
      ) || null
    );
  }

  // ---------------------- Auth helpers ----------------------

  _getAuthState() {
    const state = this._getFromStorage('auth_state', {});
    if (!state || typeof state !== 'object') {
      return {
        isLoggedIn: false,
        username: null,
        displayName: null,
        isDemoUser: false
      };
    }
    return state;
  }

  _setAuthState(state) {
    this._saveToStorage('auth_state', state || {});
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        promo_code_id: null,
        subtotal: 0,
        discount_amount: 0,
        total: 0,
        currency: 'usd'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    const items = allCartItems.filter((i) => i.cart_id === cart.id);
    const subtotal = items.reduce((sum, item) => sum + (item.line_subtotal || 0), 0);

    let discount = 0;
    let appliedPromo = null;
    if (cart.promo_code_id) {
      const promo = this._getPromoById(cart.promo_code_id);
      if (promo && promo.is_active) {
        const result = this._applyPromoCodeToAmount(promo, subtotal);
        if (result.applicable) {
          discount = result.discountAmount;
          appliedPromo = promo;
        } else {
          // Promo no longer applicable
          cart.promo_code_id = null;
        }
      } else {
        cart.promo_code_id = null;
      }
    }

    cart.subtotal = subtotal;
    cart.discount_amount = discount;
    cart.total = Math.max(0, subtotal - discount);
    cart.updated_at = new Date().toISOString();

    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return { cart, appliedPromo };
  }

  _applyPromoCodeToAmount(promo, subtotal) {
    if (!promo || !promo.is_active) {
      return { applicable: false, discountAmount: 0, errorCode: 'invalid_code' };
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        return { applicable: false, discountAmount: 0, errorCode: 'not_applicable' };
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) {
        return { applicable: false, discountAmount: 0, errorCode: 'not_applicable' };
      }
    }

    if (promo.min_subtotal && subtotal < promo.min_subtotal) {
      return {
        applicable: false,
        discountAmount: 0,
        errorCode: 'min_subtotal_not_met'
      };
    }

    // If applicable_days_of_week is set, ensure at least one cart item falls on such a day
    if (promo.applicable_days_of_week && promo.applicable_days_of_week.length) {
      const cartItems = this._getFromStorage('cart_items', []);
      const cart = this._getOrCreateCart();
      const items = cartItems.filter((i) => i.cart_id === cart.id);
      const daysSet = new Set(
        promo.applicable_days_of_week.map((d) => String(d).toLowerCase())
      );
      const hasApplicableDay = items.some((item) => {
        const date = new Date(item.trip_date);
        const dayIndex = date.getUTCDay(); // 0-6, Sunday = 0
        const names = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday'
        ];
        return daysSet.has(names[dayIndex]);
      });
      if (!hasApplicableDay) {
        return { applicable: false, discountAmount: 0, errorCode: 'not_applicable' };
      }
    }

    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = (subtotal * (promo.discount_value || 0)) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discountAmount = promo.discount_value || 0;
    }

    if (!isFinite(discountAmount) || discountAmount < 0) {
      discountAmount = 0;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return { applicable: true, discountAmount, errorCode: null };
  }

  // ---------------------- Favorites & Compare helpers ----------------------

  _getOrCreateFavoriteList() {
    const lists = this._getFromStorage('favorite_lists', []);
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('favorite_list'),
        charter_ids: [],
        updated_at: new Date().toISOString()
      };
      lists.push(list);
      this._saveToStorage('favorite_lists', lists);
    }
    return list;
  }

  _getOrCreateCompareSelection() {
    const selections = this._getFromStorage('compare_selections', []);
    let sel = selections[0] || null;
    if (!sel) {
      sel = {
        id: this._generateId('compare_selection'),
        charter_ids: [],
        updated_at: new Date().toISOString()
      };
      selections.push(sel);
      this._saveToStorage('compare_selections', selections);
    }
    return sel;
  }

  // ---------------------- Booking draft helpers ----------------------

  _getOrCreateBookingDraft() {
    const draft = this._getFromStorage('booking_draft', {});
    if (!draft || typeof draft !== 'object' || !draft.mode) {
      const emptyDraft = {
        mode: null,
        originalBookingId: null,
        trips: [],
        extras: [],
        summary: {
          subtotal: 0,
          extrasTotal: 0,
          discountAmount: 0,
          total: 0,
          currency: 'usd'
        }
      };
      this._saveToStorage('booking_draft', emptyDraft);
      return emptyDraft;
    }
    return draft;
  }

  _saveBookingDraft(draft) {
    this._saveToStorage('booking_draft', draft || {});
  }

  // ---------------------- Recent search helper ----------------------

  _saveRecentSearch(locationId, tripDate, timeOfDay, groupSize, filters) {
    const recent = this._getFromStorage('recent_searches', []);
    const location = this._getLocationById(locationId);
    const locationName = location ? location.name : null;

    let labelParts = [];
    if (filters) {
      if (filters.environmentTypes && filters.environmentTypes.length) {
        labelParts.push(filters.environmentTypes.join('/'));
      }
      if (filters.durationCategories && filters.durationCategories.length) {
        labelParts.push(filters.durationCategories.join('/'));
      }
    }
    const summaryFilterLabel = labelParts.join(' · ');

    const entry = {
      locationId,
      locationName,
      tripDate,
      timeOfDay: timeOfDay || null,
      groupSize: groupSize || null,
      summaryFilterLabel
    };

    // Remove duplicates (same location + date + timeOfDay)
    const filtered = recent.filter(
      (r) =>
        !(
          r.locationId === entry.locationId &&
          r.tripDate === entry.tripDate &&
          r.timeOfDay === entry.timeOfDay
        )
    );
    filtered.unshift(entry);

    // Limit to last 10
    const trimmed = filtered.slice(0, 10);
    this._saveToStorage('recent_searches', trimmed);
  }

  // ---------------------- Search & discovery interfaces ----------------------

  // searchLocations(query, limit = 10)
  searchLocations(query, limit) {
    const q = String(query || '').trim().toLowerCase();
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;
    const locations = this._getFromStorage('locations', []);

    if (!q) {
      return locations.slice(0, max).map((l) => this._clone(l));
    }

    const results = locations.filter((loc) => {
      const haystack = [loc.name, loc.city, loc.state, loc.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      // First try a direct substring match
      if (haystack.indexOf(q) !== -1) {
        return true;
      }
      // Fallback: require all query tokens (split on spaces/commas) to appear in the haystack
      const tokens = q.split(/[\s,]+/).filter(Boolean);
      return tokens.every((t) => haystack.indexOf(t) !== -1);
    });

    return results.slice(0, max).map((l) => this._clone(l));
  }

  // getHomeSuggestions()
  getHomeSuggestions() {
    const locations = this._getFromStorage('locations', []);
    const suggestedLocations = locations.slice(0, 6).map((l) => this._clone(l));

    const recentRaw = this._getFromStorage('recent_searches', []);
    const recentSearches = recentRaw.map((r) => {
      const location = this._getLocationById(r.locationId);
      return {
        locationId: r.locationId,
        locationName: r.locationName || (location ? location.name : null),
        tripDate: r.tripDate,
        timeOfDay: r.timeOfDay,
        groupSize: r.groupSize,
        summaryFilterLabel: r.summaryFilterLabel,
        location: location ? this._clone(location) : null
      };
    });

    return { suggestedLocations, recentSearches };
  }

  // getHomeQuickFilters()
  getHomeQuickFilters() {
    return [
      {
        code: 'inshore',
        label: 'Inshore trips',
        description: 'Shallow water trips close to shore',
        presetFilters: {
          environmentTypes: ['inshore'],
          bookingTypes: [],
          isFamilyFriendly: false
        }
      },
      {
        code: 'offshore',
        label: 'Offshore adventures',
        description: 'Head offshore for bigger game fish',
        presetFilters: {
          environmentTypes: ['offshore'],
          bookingTypes: [],
          isFamilyFriendly: false
        }
      },
      {
        code: 'shared_per_seat',
        label: 'Shared / per seat',
        description: 'Join others and pay per seat',
        presetFilters: {
          environmentTypes: [],
          bookingTypes: ['shared_per_seat'],
          isFamilyFriendly: false
        }
      },
      {
        code: 'family_friendly',
        label: 'Family friendly',
        description: 'Trips suitable for kids and families',
        presetFilters: {
          environmentTypes: [],
          bookingTypes: [],
          isFamilyFriendly: true
        }
      }
    ];
  }

  // getTripSearchFilterOptions(locationId)
  getTripSearchFilterOptions(locationId) {
    const charters = this._getFromStorage('charters', []);
    const boats = this._getFromStorage('boats', []);

    const byLocation = locationId
      ? charters.filter((c) => c.location_id === locationId)
      : charters;

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const environmentTypes = uniq(byLocation.map((c) => c.environment_type)).map(
      (code) => ({ code, label: code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) })
    );

    const bookingTypes = uniq(byLocation.map((c) => c.booking_type)).map((code) => ({
      code,
      label:
        code === 'private_boat'
          ? 'Private boat'
          : code === 'shared_per_seat'
          ? 'Shared / per seat'
          : code
    }));

    const durationCategories = uniq(byLocation.map((c) => c.duration_category)).map(
      (code) => {
        let label = '';
        switch (code) {
          case 'three_to_four_hours':
            label = '3–4 hours';
            break;
          case 'four_to_six_hours':
            label = '4–6 hours';
            break;
          case 'six_hours':
            label = '6 hours';
            break;
          case 'eight_hours':
            label = '8 hours';
            break;
          case 'eight_to_ten_hours':
            label = '8–10 hours';
            break;
          case 'full_day':
            label = 'Full day';
            break;
          default:
            label = code;
        }
        return { code, label, minHours: null, maxHours: null };
      }
    );

    const targetSpecies = uniq(
      byLocation.reduce((all, c) => {
        if (Array.isArray(c.target_species)) {
          return all.concat(c.target_species);
        }
        return all;
      }, [])
    ).map((code) => ({
      code,
      label: code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    }));

    const ratingThresholds = [
      { minRating: 4.0, label: '4.0+ stars' },
      { minRating: 4.3, label: '4.3+ stars' },
      { minRating: 4.5, label: '4.5+ stars' },
      { minRating: 4.7, label: '4.7+ stars' },
      { minRating: 4.8, label: '4.8+ stars' }
    ];

    const reviewCountThresholds = [
      { minReviews: 5, label: '5+ reviews' },
      { minReviews: 10, label: '10+ reviews' },
      { minReviews: 25, label: '25+ reviews' }
    ];

    const distanceOptionsMiles = [
      { radiusMiles: 5, label: '5 miles' },
      { radiusMiles: 10, label: '10 miles' },
      { radiusMiles: 25, label: '25 miles' },
      { radiusMiles: 50, label: '50 miles' }
    ];

    const boatIds = uniq(byLocation.map((c) => c.boat_id));
    const boatLengths = uniq(
      boatIds
        .map((id) => boats.find((b) => b.id === id))
        .filter((b) => b && typeof b.length_ft === 'number')
        .map((b) => (b.length_ft >= 28 ? 28 : b.length_ft >= 20 ? 20 : 0))
    ).filter((len) => len > 0);

    const boatLengthOptionsFt = boatLengths.map((minLengthFt) => ({
      minLengthFt,
      label: minLengthFt + ' ft or longer'
    }));

    const sortingOptions = [
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_per_seat_low_to_high', label: 'Price per seat: Low to High' },
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'rating_low_to_high', label: 'Rating: Low to High' },
      { code: 'duration_short_to_long', label: 'Duration: Short to Long' }
    ];

    return {
      environmentTypes,
      bookingTypes,
      durationCategories,
      targetSpecies,
      ratingThresholds,
      reviewCountThresholds,
      distanceOptionsMiles,
      boatLengthOptionsFt,
      sortingOptions
    };
  }

  // Internal search core used by searchCharters and flexible-date grid
  _performCharterSearch(locationId, tripDate, timeOfDay, groupSize, filters, sortOrder, page, pageSize) {
    const charters = this._getFromStorage('charters', []);
    const locations = this._getFromStorage('locations', []);
    const boats = this._getFromStorage('boats', []);
    const captains = this._getFromStorage('captains', []);

    const searchLocation = locations.find((l) => l.id === locationId) || null;

    const favList = this._getOrCreateFavoriteList();
    const compareSel = this._getOrCreateCompareSelection();

    const filtersSafe = filters || {};

    let results = charters.filter((c) => c.is_active);

    if (locationId) {
      results = results.filter((c) => c.location_id === locationId);
    }

    if (timeOfDay) {
      results = results.filter((c) => {
        if (!Array.isArray(c.available_time_of_day) || !c.available_time_of_day.length) {
          return true; // assume available all day if not specified
        }
        return c.available_time_of_day.indexOf(timeOfDay) !== -1;
      });
    }

    if (groupSize && groupSize > 0) {
      results = results.filter((c) => {
        if (c.booking_type === 'private_boat') {
          if (typeof c.max_anglers === 'number') {
            return groupSize <= c.max_anglers;
          }
          return true;
        }
        if (c.booking_type === 'shared_per_seat') {
          if (typeof c.shared_trip_max_seats === 'number') {
            return groupSize <= c.shared_trip_max_seats;
          }
          if (typeof c.max_seats_per_booking === 'number') {
            return groupSize <= c.max_seats_per_booking;
          }
          return true;
        }
        return true;
      });
    }

    // Apply filters
    if (filtersSafe.environmentTypes && filtersSafe.environmentTypes.length) {
      const set = new Set(filtersSafe.environmentTypes);
      results = results.filter((c) => set.has(c.environment_type));
    }

    if (filtersSafe.bookingTypes && filtersSafe.bookingTypes.length) {
      const set = new Set(filtersSafe.bookingTypes);
      results = results.filter((c) => set.has(c.booking_type));
    }

    if (filtersSafe.durationCategories && filtersSafe.durationCategories.length) {
      const set = new Set(filtersSafe.durationCategories);
      results = results.filter((c) => set.has(c.duration_category));
    }

    if (filtersSafe.targetSpecies && filtersSafe.targetSpecies.length) {
      const set = new Set(filtersSafe.targetSpecies);
      results = results.filter((c) => {
        if (!Array.isArray(c.target_species)) return false;
        return c.target_species.some((s) => set.has(s));
      });
    }

    if (typeof filtersSafe.pricePerTripMin === 'number') {
      results = results.filter((c) => {
        if (c.booking_type !== 'private_boat') return true;
        return (
          typeof c.base_price_per_trip === 'number' &&
          c.base_price_per_trip >= filtersSafe.pricePerTripMin
        );
      });
    }

    if (typeof filtersSafe.pricePerTripMax === 'number') {
      results = results.filter((c) => {
        if (c.booking_type !== 'private_boat') return true;
        return (
          typeof c.base_price_per_trip === 'number' &&
          c.base_price_per_trip <= filtersSafe.pricePerTripMax
        );
      });
    }

    if (typeof filtersSafe.pricePerSeatMin === 'number') {
      results = results.filter((c) => {
        if (c.booking_type !== 'shared_per_seat') return true;
        return (
          typeof c.base_price_per_seat === 'number' &&
          c.base_price_per_seat >= filtersSafe.pricePerSeatMin
        );
      });
    }

    if (typeof filtersSafe.pricePerSeatMax === 'number') {
      results = results.filter((c) => {
        if (c.booking_type !== 'shared_per_seat') return true;
        return (
          typeof c.base_price_per_seat === 'number' &&
          c.base_price_per_seat <= filtersSafe.pricePerSeatMax
        );
      });
    }

    if (typeof filtersSafe.ratingMin === 'number') {
      results = results.filter((c) => (c.rating_average || 0) >= filtersSafe.ratingMin);
    }

    if (typeof filtersSafe.reviewCountMin === 'number') {
      results = results.filter((c) => (c.review_count || 0) >= filtersSafe.reviewCountMin);
    }

    if (typeof filtersSafe.distanceRadiusMiles === 'number' && searchLocation) {
      results = results.filter((c) => {
        const loc = locations.find((l) => l.id === c.location_id);
        if (!loc) return false;
        const dist = this._computeDistanceMiles(
          searchLocation.latitude,
          searchLocation.longitude,
          loc.latitude,
          loc.longitude
        );
        if (dist === null) return false;
        return dist <= filtersSafe.distanceRadiusMiles;
      });
    }

    if (typeof filtersSafe.boatLengthMinFt === 'number') {
      results = results.filter((c) => {
        const boat = boats.find((b) => b.id === c.boat_id);
        if (!boat || typeof boat.length_ft !== 'number') return false;
        return boat.length_ft >= filtersSafe.boatLengthMinFt;
      });
    }

    if (typeof filtersSafe.boatLengthMaxFt === 'number') {
      results = results.filter((c) => {
        const boat = boats.find((b) => b.id === c.boat_id);
        if (!boat || typeof boat.length_ft !== 'number') return false;
        return boat.length_ft <= filtersSafe.boatLengthMaxFt;
      });
    }

    if (typeof filtersSafe.isFamilyFriendly === 'boolean') {
      results = results.filter((c) => !!c.is_family_friendly === filtersSafe.isFamilyFriendly);
    }

    if (typeof filtersSafe.includesBaitTackle === 'boolean' && filtersSafe.includesBaitTackle) {
      results = results.filter((c) => !!c.includes_bait_tackle);
    }

    if (typeof filtersSafe.allowKeepCatch === 'boolean' && filtersSafe.allowKeepCatch) {
      results = results.filter((c) => !!c.allow_keep_catch);
    }

    if (
      typeof filtersSafe.allowCatchAndRelease === 'boolean' &&
      filtersSafe.allowCatchAndRelease
    ) {
      results = results.filter((c) => !!c.allow_catch_and_release);
    }

    // Build cards with computed fields
    const cards = results.map((c) => {
      const location = locations.find((l) => l.id === c.location_id) || null;
      const captain = captains.find((cap) => cap.id === c.captain_id) || null;
      const boat = boats.find((b) => b.id === c.boat_id) || null;

      const pricingMode = c.booking_type === 'shared_per_seat' ? 'per_seat' : 'per_trip';
      const basePriceDisplay =
        pricingMode === 'per_trip' ? c.base_price_per_trip || 0 : c.base_price_per_seat || 0;

      let distanceMiles = null;
      if (searchLocation && location) {
        distanceMiles = this._computeDistanceMiles(
          searchLocation.latitude,
          searchLocation.longitude,
          location.latitude,
          location.longitude
        );
      }

      const badges = [];
      if (c.is_family_friendly) badges.push('Family friendly');
      if (c.includes_bait_tackle) badges.push('Bait & tackle included');
      if (c.allow_keep_catch) badges.push('Keep catch allowed');
      if (c.allow_catch_and_release && !c.allow_keep_catch) {
        badges.push('Catch & release only');
      }

      const thumb = Array.isArray(c.photos) && c.photos.length ? c.photos[0] : null;

      const isFavorite = favList.charter_ids.indexOf(c.id) !== -1;
      const isInCompareSelection = compareSel.charter_ids.indexOf(c.id) !== -1;

      return {
        charterId: c.id,
        charterName: c.name,
        locationName: location ? location.name : null,
        captainName: captain ? captain.name : null,
        ratingAverage: c.rating_average || 0,
        reviewCount: c.review_count || 0,
        environmentType: c.environment_type,
        bookingType: c.booking_type,
        durationHours: c.duration_hours,
        durationCategory: c.duration_category,
        pricingMode,
        basePriceDisplay,
        currency: c.currency || 'usd',
        pricePerTrip: c.base_price_per_trip || null,
        pricePerSeat: c.base_price_per_seat || null,
        boatLengthFt: boat && typeof boat.length_ft === 'number' ? boat.length_ft : null,
        sharedTripMaxSeats: c.shared_trip_max_seats || null,
        isFamilyFriendly: !!c.is_family_friendly,
        includesBaitTackle: !!c.includes_bait_tackle,
        allowKeepCatch: !!c.allow_keep_catch,
        allowCatchAndRelease: !!c.allow_catch_and_release,
        distanceFromSearchLocationMiles: distanceMiles,
        badges,
        thumbnailPhotoUrl: thumb,
        isFavorite,
        isInCompareSelection,
        charter: this._clone(c),
        location: location ? this._clone(location) : null,
        captain: captain ? this._clone(captain) : null,
        boat: boat ? this._clone(boat) : null
      };
    });

    // Sorting
    const order = sortOrder || '';
    const sorted = cards.slice();

    sorted.sort((a, b) => {
      if (order === 'price_low_to_high') {
        return (a.basePriceDisplay || 0) - (b.basePriceDisplay || 0);
      }
      if (order === 'price_per_seat_low_to_high') {
        const ap = typeof a.pricePerSeat === 'number' ? a.pricePerSeat : Infinity;
        const bp = typeof b.pricePerSeat === 'number' ? b.pricePerSeat : Infinity;
        return ap - bp;
      }
      if (order === 'rating_high_to_low') {
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      }
      if (order === 'rating_low_to_high') {
        return (a.ratingAverage || 0) - (b.ratingAverage || 0);
      }
      if (order === 'duration_short_to_long') {
        return (a.durationHours || 0) - (b.durationHours || 0);
      }
      return 0;
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = sorted.slice(start, start + ps);

    return {
      totalResults: sorted.length,
      page: p,
      pageSize: ps,
      results: paged
    };
  }

  // searchCharters(locationId, tripDate, timeOfDay, groupSize, filters, sortOrder, page = 1, pageSize = 20)
  searchCharters(locationId, tripDate, timeOfDay, groupSize, filters, sortOrder, page, pageSize) {
    const res = this._performCharterSearch(
      locationId,
      tripDate,
      timeOfDay,
      groupSize,
      filters,
      sortOrder,
      page,
      pageSize
    );

    // Save as recent search
    if (locationId && tripDate) {
      this._saveRecentSearch(locationId, tripDate, timeOfDay, groupSize, filters);
    }

    return res;
  }

  // getFlexibleDatePriceGrid(locationId, baseDate, daysBeforeAfter = 3, timeOfDay, groupSize, filters)
  getFlexibleDatePriceGrid(locationId, baseDate, daysBeforeAfter, timeOfDay, groupSize, filters) {
    const daysRange = typeof daysBeforeAfter === 'number' ? daysBeforeAfter : 3;
    const center = this._parseDate(baseDate);

    const dates = [];
    for (let offset = -daysRange; offset <= daysRange; offset++) {
      const d = new Date(center);
      d.setUTCDate(d.getUTCDate() + offset);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = yyyy + '-' + mm + '-' + dd;

      const res = this._performCharterSearch(
        locationId,
        dateStr,
        timeOfDay,
        groupSize,
        filters,
        'price_low_to_high',
        1,
        50
      );

      if (res.results.length) {
        dates.push({
          date: dateStr,
          lowestPrice: res.results[0].basePriceDisplay || 0,
          currency: res.results[0].currency || 'usd',
          hasAvailability: true
        });
      } else {
        dates.push({
          date: dateStr,
          lowestPrice: 0,
          currency: 'usd',
          hasAvailability: false
        });
      }
    }

    return {
      baseDate,
      daysBeforeAfter: daysRange,
      dates
    };
  }

  // getCharterDetails(charterId, tripDate, timeOfDay, groupSize)
  getCharterDetails(charterId, tripDate, timeOfDay, groupSize) {
    const charter = this._getCharterById(charterId);
    if (!charter) return null;

    const location = this._getLocationById(charter.location_id);
    const captain = this._getCaptainById(charter.captain_id);
    const boat = this._getBoatById(charter.boat_id);

    const reviews = this._getFromStorage('charter_reviews', []).filter(
      (r) => r.charter_id === charter.id
    );

    const featured = reviews.find((r) => r.is_featured) || reviews[0] || null;
    const ratingSummary = {
      averageRating: charter.rating_average || 0,
      reviewCount: charter.review_count || 0,
      featuredReviewSnippet: featured ? featured.title || featured.body || '' : ''
    };

    const availableTimeOfDay = Array.isArray(charter.available_time_of_day)
      ? charter.available_time_of_day.slice()
      : ['morning', 'afternoon', 'evening', 'full_day'];

    const includedAmenities = [];
    if (charter.includes_bait_tackle) includedAmenities.push('Bait & tackle');
    if (charter.includes_fishing_licenses) includedAmenities.push('Fishing licenses');
    if (charter.includes_drinks) includedAmenities.push('Drinks');
    if (charter.includes_snacks) includedAmenities.push('Snacks');
    if (charter.includes_fish_cleaning) includedAmenities.push('Fish cleaning');

    const optionalAmenities = [];
    const charterAddOnIds = Array.isArray(charter.offered_add_on_ids)
      ? charter.offered_add_on_ids
      : [];
    const addons = this._getFromStorage('addons', []);
    charterAddOnIds.forEach((id) => {
      const a = addons.find((x) => x.id === id && x.is_active);
      if (a) optionalAmenities.push(a.display_name || a.code);
    });

    const policies = {
      allowKeepCatch: !!charter.allow_keep_catch,
      allowCatchAndRelease: !!charter.allow_catch_and_release
    };

    const gs = typeof groupSize === 'number' && groupSize > 0 ? groupSize : 1;
    const bookingType = charter.booking_type;
    const pricingMode = bookingType === 'shared_per_seat' ? 'per_seat' : 'per_trip';
    const basePrice =
      pricingMode === 'per_trip'
        ? charter.base_price_per_trip || 0
        : charter.base_price_per_seat || 0;
    const pricePerPersonDisplay =
      pricingMode === 'per_trip' ? (gs > 0 ? basePrice / gs : basePrice) : basePrice;

    let minGroupSize = null;
    let maxGroupSize = null;
    if (bookingType === 'private_boat') {
      minGroupSize = charter.min_anglers || 1;
      maxGroupSize = charter.max_anglers || null;
    } else {
      minGroupSize = charter.min_seats_per_booking || 1;
      maxGroupSize = charter.max_seats_per_booking || charter.shared_trip_max_seats || null;
    }

    const pricing = {
      tripDate: tripDate || null,
      timeOfDay: timeOfDay || null,
      groupSize: gs,
      bookingType,
      pricingMode,
      basePrice,
      currency: charter.currency || 'usd',
      pricePerPersonDisplay,
      minGroupSize,
      maxGroupSize
    };

    const availableAddOns = charterAddOnIds
      .map((id) => this._getAddOnById(id))
      .filter((a) => a && a.is_active)
      .map((a) => this._clone(a));

    const favList = this._getOrCreateFavoriteList();
    const compareSel = this._getOrCreateCompareSelection();

    const primaryPhotoUrl =
      Array.isArray(charter.photos) && charter.photos.length ? charter.photos[0] : null;
    const photoUrls = Array.isArray(charter.photos) ? charter.photos.slice() : [];

    // Instrumentation for task completion tracking
    try {
      if (
        favList &&
        Array.isArray(favList.charter_ids) &&
        favList.charter_ids.length >= 3 &&
        favList.charter_ids.indexOf(charterId) !== -1
      ) {
        localStorage.setItem('task3_favoriteDetailsOpenedCharterId', String(charterId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      charter: this._clone(charter),
      location: location ? this._clone(location) : null,
      captain: captain ? this._clone(captain) : null,
      boat: boat ? this._clone(boat) : null,
      primaryPhotoUrl,
      photoUrls,
      ratingSummary,
      availableTimeOfDay,
      includedAmenities,
      optionalAmenities,
      policies,
      pricing,
      availableAddOns,
      isFavorite: favList.charter_ids.indexOf(charter.id) !== -1,
      isInCompareSelection: compareSel.charter_ids.indexOf(charter.id) !== -1
    };
  }

  // getSimilarCharters(charterId)
  getSimilarCharters(charterId) {
    const charters = this._getFromStorage('charters', []);
    const locations = this._getFromStorage('locations', []);
    const captains = this._getFromStorage('captains', []);

    const base = charters.find((c) => c.id === charterId);
    if (!base) return [];

    const candidates = charters
      .filter((c) => c.is_active && c.id !== base.id)
      .filter((c) => c.location_id === base.location_id)
      .filter((c) => c.environment_type === base.environment_type);

    candidates.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));

    const recs = candidates.slice(0, 6).map((c) => {
      const location = locations.find((l) => l.id === c.location_id) || null;
      const captain = captains.find((cap) => cap.id === c.captain_id) || null;
      const thumb = Array.isArray(c.photos) && c.photos.length ? c.photos[0] : null;

      const pricingMode = c.booking_type === 'shared_per_seat' ? 'per_seat' : 'per_trip';
      const basePriceDisplay =
        pricingMode === 'per_trip' ? c.base_price_per_trip || 0 : c.base_price_per_seat || 0;

      const badges = [];
      if (c.is_family_friendly) badges.push('Family friendly');
      if (c.includes_bait_tackle) badges.push('Bait & tackle included');

      return {
        charterId: c.id,
        charterName: c.name,
        locationName: location ? location.name : null,
        captainName: captain ? captain.name : null,
        ratingAverage: c.rating_average || 0,
        reviewCount: c.review_count || 0,
        basePriceDisplay,
        currency: c.currency || 'usd',
        environmentType: c.environment_type,
        bookingType: c.booking_type,
        durationHours: c.duration_hours,
        thumbnailPhotoUrl: thumb,
        badges
      };
    });

    return recs;
  }

  // ---------------------- Favorites interfaces ----------------------

  // setFavoriteCharter(charterId, isFavorite)
  setFavoriteCharter(charterId, isFavorite) {
    const list = this._getOrCreateFavoriteList();
    const idx = list.charter_ids.indexOf(charterId);
    if (isFavorite) {
      if (idx === -1) list.charter_ids.push(charterId);
    } else if (idx !== -1) {
      list.charter_ids.splice(idx, 1);
    }
    list.updated_at = new Date().toISOString();

    const lists = this._getFromStorage('favorite_lists', []);
    if (lists.length) {
      lists[0] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('favorite_lists', lists);

    return {
      success: true,
      isFavorite,
      favoriteCount: list.charter_ids.length
    };
  }

  // getFavoriteChartersList()
  getFavoriteChartersList() {
    const list = this._getOrCreateFavoriteList();
    const charters = this._getFromStorage('charters', []);
    const locations = this._getFromStorage('locations', []);

    const favorites = list.charter_ids
      .map((id) => charters.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => {
        const location = locations.find((l) => l.id === c.location_id) || null;
        const pricingMode = c.booking_type === 'shared_per_seat' ? 'per_seat' : 'per_trip';
        const basePriceDisplay =
          pricingMode === 'per_trip' ? c.base_price_per_trip || 0 : c.base_price_per_seat || 0;
        const thumb = Array.isArray(c.photos) && c.photos.length ? c.photos[0] : null;
        const badges = [];
        if (c.is_family_friendly) badges.push('Family friendly');
        if (c.includes_bait_tackle) badges.push('Bait & tackle included');

        return {
          charterId: c.id,
          charterName: c.name,
          locationName: location ? location.name : null,
          ratingAverage: c.rating_average || 0,
          reviewCount: c.review_count || 0,
          environmentType: c.environment_type,
          bookingType: c.booking_type,
          basePriceDisplay,
          currency: c.currency || 'usd',
          isFamilyFriendly: !!c.is_family_friendly,
          badges,
          thumbnailPhotoUrl: thumb,
          charter: this._clone(c),
          location: location ? this._clone(location) : null
        };
      });

    // Instrumentation for task completion tracking
    try {
      if (favorites && favorites.length >= 3) {
        localStorage.setItem('task3_favoritesPageOpened', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      favorites,
      totalFavorites: favorites.length
    };
  }

  // ---------------------- Compare interfaces ----------------------

  // setCompareSelectionCharter(charterId, action)
  setCompareSelectionCharter(charterId, action) {
    const maxSelectable = 3;
    const sel = this._getOrCreateCompareSelection();
    const ids = sel.charter_ids;
    const idx = ids.indexOf(charterId);

    if (action === 'add') {
      if (idx === -1 && ids.length < maxSelectable) ids.push(charterId);
    } else if (action === 'remove') {
      if (idx !== -1) ids.splice(idx, 1);
    } else if (action === 'toggle') {
      if (idx === -1 && ids.length < maxSelectable) ids.push(charterId);
      else if (idx !== -1) ids.splice(idx, 1);
    }

    sel.updated_at = new Date().toISOString();
    const sels = this._getFromStorage('compare_selections', []);
    if (sels.length) sels[0] = sel;
    else sels.push(sel);
    this._saveToStorage('compare_selections', sels);

    return sel;
  }

  // getCompareSelection()
  getCompareSelection() {
    return this._getOrCreateCompareSelection();
  }

  // getCompareChartersView()
  getCompareChartersView() {
    const sel = this._getOrCreateCompareSelection();
    const charters = this._getFromStorage('charters', []);
    const locations = this._getFromStorage('locations', []);
    const captains = this._getFromStorage('captains', []);
    const boats = this._getFromStorage('boats', []);
    const addons = this._getFromStorage('addons', []);

    const items = sel.charter_ids
      .map((id) => charters.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => {
        const location = locations.find((l) => l.id === c.location_id) || null;
        const captain = captains.find((cap) => cap.id === c.captain_id) || null;
        const boat = boats.find((b) => b.id === c.boat_id) || null;
        const pricingMode = c.booking_type === 'shared_per_seat' ? 'per_seat' : 'per_trip';
        const basePriceDisplay =
          pricingMode === 'per_trip' ? c.base_price_per_trip || 0 : c.base_price_per_seat || 0;
        const primaryPhotoUrl =
          Array.isArray(c.photos) && c.photos.length ? c.photos[0] : null;

        const includedAmenities = [];
        if (c.includes_bait_tackle) includedAmenities.push('Bait & tackle');
        if (c.includes_fishing_licenses) includedAmenities.push('Fishing licenses');
        if (c.includes_drinks) includedAmenities.push('Drinks');
        if (c.includes_snacks) includedAmenities.push('Snacks');
        if (c.includes_fish_cleaning) includedAmenities.push('Fish cleaning');

        const optionalAmenities = [];
        (c.offered_add_on_ids || []).forEach((id) => {
          const a = addons.find((x) => x.id === id && x.is_active);
          if (a) optionalAmenities.push(a.display_name || a.code);
        });

        return {
          charterId: c.id,
          charterName: c.name,
          locationName: location ? location.name : null,
          captainName: captain ? captain.name : null,
          ratingAverage: c.rating_average || 0,
          reviewCount: c.review_count || 0,
          environmentType: c.environment_type,
          bookingType: c.booking_type,
          durationHours: c.duration_hours,
          durationCategory: c.duration_category,
          boatLengthFt: boat && typeof boat.length_ft === 'number' ? boat.length_ft : null,
          basePriceDisplay,
          currency: c.currency || 'usd',
          pricingMode,
          targetSpecies: Array.isArray(c.target_species) ? c.target_species.slice() : [],
          includedAmenities,
          optionalAmenities,
          primaryPhotoUrl
        };
      });

    return {
      maxSelectable: 3,
      charters: items
    };
  }

  // ---------------------- Captain messaging ----------------------

  // sendMessageToCaptain(charterId, subject, body)
  sendMessageToCaptain(charterId, subject, body) {
    const charter = this._getCharterById(charterId);
    if (!charter) return null;
    const captainId = charter.captain_id;

    const msg = {
      id: this._generateId('msg'),
      charter_id: charter.id,
      captain_id: captainId,
      subject,
      body,
      status: 'sent',
      created_at: new Date().toISOString()
    };

    const msgs = this._getFromStorage('captain_messages', []);
    msgs.push(msg);
    this._saveToStorage('captain_messages', msgs);

    const captain = this._getCaptainById(captainId);

    return {
      id: msg.id,
      charter_id: msg.charter_id,
      captain_id: msg.captain_id,
      subject: msg.subject,
      body: msg.body,
      status: msg.status,
      created_at: msg.created_at,
      charter: this._clone(charter),
      captain: captain ? this._clone(captain) : null
    };
  }

  // ---------------------- Cart interfaces ----------------------

  // addCharterTripToCart(charterId, tripDate, timeOfDay, groupSize)
  addCharterTripToCart(charterId, tripDate, timeOfDay, groupSize) {
    const charter = this._getCharterById(charterId);
    if (!charter) return null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const bookingType = charter.booking_type;
    const pricingMode = bookingType === 'shared_per_seat' ? 'per_seat' : 'per_trip';
    const basePrice =
      pricingMode === 'per_trip' ? charter.base_price_per_trip || 0 : charter.base_price_per_seat || 0;

    const gs = typeof groupSize === 'number' && groupSize > 0 ? groupSize : 1;
    const lineSubtotal = pricingMode === 'per_trip' ? basePrice : basePrice * gs;

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      charter_id: charter.id,
      charter_name: charter.name,
      location_id: charter.location_id,
      trip_date: this._formatDateToISO(this._parseDate(tripDate)),
      time_of_day: timeOfDay,
      booking_type: bookingType,
      pricing_mode: pricingMode,
      group_size: gs,
      base_price: basePrice,
      line_subtotal: lineSubtotal,
      created_at: new Date().toISOString()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    const location = this._getLocationById(item.location_id);
    const captain = this._getCaptainById(charter.captain_id);

    return {
      cart: {
        ...updatedCart,
        promoCode: updatedCart.promo_code_id
          ? this._clone(this._getPromoById(updatedCart.promo_code_id))
          : null
      },
      addedItem: {
        ...item,
        charter: this._clone(charter),
        location: location ? this._clone(location) : null,
        cart: this._clone(updatedCart),
        captain: captain ? this._clone(captain) : null
      }
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const charters = this._getFromStorage('charters', []);
    const locations = this._getFromStorage('locations', []);
    const captains = this._getFromStorage('captains', []);

    const items = cartItems
      .filter((i) => i.cart_id === cart.id)
      .map((i) => {
        const charter = charters.find((c) => c.id === i.charter_id) || null;
        const location = locations.find((l) => l.id === i.location_id) || null;
        const captain = charter
          ? captains.find((cap) => cap.id === charter.captain_id) || null
          : null;
        const thumb =
          charter && Array.isArray(charter.photos) && charter.photos.length
            ? charter.photos[0]
            : null;
        const currency = charter ? charter.currency || 'usd' : cart.currency || 'usd';

        return {
          cartItemId: i.id,
          charterId: i.charter_id,
          charterName: i.charter_name,
          locationName: location ? location.name : null,
          captainName: captain ? captain.name : null,
          tripDate: i.trip_date,
          timeOfDay: i.time_of_day,
          groupSize: i.group_size,
          bookingType: i.booking_type,
          pricingMode: i.pricing_mode,
          basePrice: i.base_price,
          lineSubtotal: i.line_subtotal,
          currency,
          thumbnailPhotoUrl: thumb,
          charter: charter ? this._clone(charter) : null,
          location: location ? this._clone(location) : null,
          cart: this._clone(cart),
          captain: captain ? this._clone(captain) : null
        };
      });

    const promo = cart.promo_code_id ? this._getPromoById(cart.promo_code_id) : null;

    return {
      cart: {
        ...cart,
        promoCode: promo ? this._clone(promo) : null
      },
      items
    };
  }

  // updateCartItemGroupSize(cartItemId, groupSize)
  updateCartItemGroupSize(cartItemId, groupSize) {
    const gs = typeof groupSize === 'number' && groupSize > 0 ? groupSize : 1;
    const cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) return null;

    item.group_size = gs;
    if (item.pricing_mode === 'per_trip') {
      item.line_subtotal = item.base_price;
    } else {
      item.line_subtotal = item.base_price * gs;
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return {
      cart: updatedCart,
      items: cartItems.filter((i) => i.cart_id === updatedCart.id)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((i) => i.id === cartItemId);
    if (idx === -1) {
      return {
        cart: this._getOrCreateCart(),
        items: cartItems
      };
    }

    const item = cartItems[idx];
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return {
      cart: updatedCart,
      items: cartItems.filter((i) => i.cart_id === updatedCart.id)
    };
  }

  // clearCart()
  clearCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const remaining = cartItems.filter((i) => i.cart_id !== cart.id);
    this._saveToStorage('cart_items', remaining);

    cart.subtotal = 0;
    cart.discount_amount = 0;
    cart.total = 0;
    cart.promo_code_id = null;
    cart.updated_at = new Date().toISOString();

    const carts = this._getFromStorage('carts', []);
    if (carts.length) carts[0] = cart;
    else carts.push(cart);
    this._saveToStorage('carts', carts);

    return { cart };
  }

  // applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const promo = this._getPromoByCode(promoCode);
    if (!promo) {
      // still recalc totals without promo
      cart.promo_code_id = null;
      this._recalculateCartTotals(cart, cartItems);
      return {
        success: false,
        cart,
        appliedPromoCode: null,
        errorCode: 'invalid_code'
      };
    }

    const result = this._applyPromoCodeToAmount(promo, cart.subtotal);
    if (!result.applicable) {
      cart.promo_code_id = null;
      this._recalculateCartTotals(cart, cartItems);
      return {
        success: false,
        cart,
        appliedPromoCode: null,
        errorCode: result.errorCode || 'not_applicable'
      };
    }

    cart.promo_code_id = promo.id;
    this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      cart,
      appliedPromoCode: this._clone(promo),
      errorCode: null
    };
  }

  // ---------------------- Booking draft & checkout ----------------------

  // initBookingDraftFromCharter(charterId, tripDate, timeOfDay, groupSize)
  initBookingDraftFromCharter(charterId, tripDate, timeOfDay, groupSize) {
    const charter = this._getCharterById(charterId);
    const location = charter ? this._getLocationById(charter.location_id) : null;
    if (!charter || !location) return null;

    const gs = typeof groupSize === 'number' && groupSize > 0 ? groupSize : 1;
    const bookingType = charter.booking_type;
    const pricingMode = bookingType === 'shared_per_seat' ? 'per_seat' : 'per_trip';
    const basePricePerUnit =
      pricingMode === 'per_trip' ? charter.base_price_per_trip || 0 : charter.base_price_per_seat || 0;
    const lineSubtotal = pricingMode === 'per_trip' ? basePricePerUnit : basePricePerUnit * gs;

    const trip = {
      charterId: charter.id,
      charterName: charter.name,
      locationName: location.name,
      tripDate,
      timeOfDay,
      groupSize: gs,
      bookingType,
      pricingMode,
      basePricePerUnit,
      currency: charter.currency || 'usd',
      lineSubtotal
    };

    const draft = {
      mode: 'new_single_trip',
      originalBookingId: null,
      trips: [trip],
      extras: [],
      summary: {
        subtotal: lineSubtotal,
        extrasTotal: 0,
        discountAmount: 0,
        total: lineSubtotal,
        currency: charter.currency || 'usd'
      }
    };

    this._saveBookingDraft(draft);
    return this._clone(draft);
  }

  // initBookingDraftFromCart()
  initBookingDraftFromCart() {
    const cartSummary = this.getCartSummary();
    const cart = cartSummary.cart;
    const items = cartSummary.items;

    const trips = items.map((item) => ({
      cartItemId: item.cartItemId,
      charterId: item.charterId,
      charterName: item.charterName,
      locationName: item.locationName,
      tripDate: item.tripDate,
      timeOfDay: item.timeOfDay,
      groupSize: item.groupSize,
      bookingType: item.bookingType,
      pricingMode: item.pricingMode,
      basePricePerUnit: item.basePrice,
      currency: item.currency,
      lineSubtotal: item.lineSubtotal
    }));

    const subtotal = cart.subtotal || 0;
    const discount = cart.discount_amount || 0;

    const draft = {
      mode: 'new_cart_checkout',
      originalBookingId: null,
      trips,
      extras: [],
      summary: {
        subtotal,
        extrasTotal: 0,
        discountAmount: discount,
        total: subtotal - discount,
        currency: cart.currency || 'usd'
      }
    };

    this._saveBookingDraft(draft);
    return this._clone(draft);
  }

  // initBookingModificationDraft(bookingId)
  initBookingModificationDraft(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    const charter = this._getCharterById(booking.charter_id);
    const location = this._getLocationById(booking.location_id);

    const trip = {
      charterId: booking.charter_id,
      charterName: booking.charter_name,
      locationName: location ? location.name : null,
      tripDate: booking.trip_date,
      timeOfDay: booking.time_of_day,
      groupSize: booking.group_size,
      bookingType: booking.booking_type,
      pricingMode: booking.pricing_mode,
      basePricePerUnit: booking.base_price,
      currency: charter ? charter.currency || 'usd' : 'usd',
      lineSubtotal:
        booking.pricing_mode === 'per_trip'
          ? booking.base_price
          : booking.base_price * booking.group_size
    };

    const allExtras = this._getFromStorage('booking_extras', []);
    const extrasForBooking = allExtras.filter((e) => e.booking_id === booking.id);

    const extras = extrasForBooking.map((e) => ({
      charterId: trip.charterId,
      addOnId: e.add_on_id,
      name: e.name,
      pricingMode: e.pricing_mode,
      unitPrice: e.unit_price,
      quantity: e.quantity,
      totalPrice: e.total_price
    }));

    const subtotal = trip.lineSubtotal;
    const extrasTotal = booking.extras_total || 0;
    const discountAmount = booking.discount_amount || 0;

    const draft = {
      mode: 'modify_booking',
      originalBookingId: booking.id,
      trips: [trip],
      extras,
      summary: {
        subtotal,
        extrasTotal,
        discountAmount,
        total: subtotal + extrasTotal - discountAmount,
        currency: trip.currency
      }
    };

    this._saveBookingDraft(draft);
    return this._clone(draft);
  }

  // getActiveBookingDraft()
  getActiveBookingDraft() {
    return this._clone(this._getOrCreateBookingDraft());
  }

  // updateBookingDraftTrip(tripDate, timeOfDay, groupSize)
  updateBookingDraftTrip(tripDate, timeOfDay, groupSize) {
    const draft = this._getOrCreateBookingDraft();
    if (!draft.trips || !draft.trips.length) return this._clone(draft);

    const gs = typeof groupSize === 'number' && groupSize > 0 ? groupSize : 1;

    draft.trips = draft.trips.map((t, idx) => {
      if (idx > 0 && draft.mode === 'new_cart_checkout') {
        return t; // only allow single-trip changes for this interface
      }
      const pricingMode = t.pricingMode;
      const lineSubtotal =
        pricingMode === 'per_trip'
          ? t.basePricePerUnit
          : t.basePricePerUnit * gs;
      return {
        ...t,
        tripDate,
        timeOfDay,
        groupSize: gs,
        lineSubtotal
      };
    });

    const subtotal = draft.trips.reduce((sum, t) => sum + (t.lineSubtotal || 0), 0);
    draft.summary.subtotal = subtotal;
    draft.summary.total =
      subtotal + (draft.summary.extrasTotal || 0) - (draft.summary.discountAmount || 0);

    this._saveBookingDraft(draft);
    return this._clone({
      mode: draft.mode,
      trips: draft.trips.map((t) => ({
        charterId: t.charterId,
        tripDate: t.tripDate,
        timeOfDay: t.timeOfDay,
        groupSize: t.groupSize,
        lineSubtotal: t.lineSubtotal
      })),
      summary: draft.summary
    });
  }

  // getBookingDraftExtrasOptions()
  getBookingDraftExtrasOptions() {
    const draft = this._getOrCreateBookingDraft();
    const result = [];
    const addons = this._getFromStorage('addons', []);

    (draft.trips || []).forEach((t) => {
      const charter = this._getCharterById(t.charterId);
      if (!charter) return;
      const availableAddOns = (charter.offered_add_on_ids || [])
        .map((id) => addons.find((a) => a.id === id && a.is_active))
        .filter(Boolean)
        .map((a) => this._clone(a));
      result.push({
        charterId: t.charterId,
        charterName: t.charterName,
        availableAddOns
      });
    });

    return { tripExtras: result };
  }

  // updateBookingDraftExtras(extrasSelection)
  updateBookingDraftExtras(extrasSelection) {
    const draft = this._getOrCreateBookingDraft();
    const items = extrasSelection && Array.isArray(extrasSelection.items)
      ? extrasSelection.items
      : [];

    const addons = this._getFromStorage('addons', []);

    const extras = items
      .map((sel) => {
        const addOn = addons.find((a) => a.id === sel.addOnId && a.is_active);
        if (!addOn) return null;
        const quantity = typeof sel.quantity === 'number' && sel.quantity > 0 ? sel.quantity : 0;
        if (!quantity) return null;
        const pricingMode = addOn.price_per_trip ? 'per_trip' : 'per_person';
        const unitPrice = addOn.price_per_trip || addOn.price_per_person || 0;
        const totalPrice = pricingMode === 'per_trip' ? unitPrice : unitPrice * quantity;
        return {
          charterId: sel.charterId,
          addOnId: sel.addOnId,
          name: addOn.display_name || addOn.code,
          pricingMode,
          unitPrice,
          quantity,
          totalPrice
        };
      })
      .filter(Boolean);

    draft.extras = extras;

    const extrasTotal = extras.reduce((sum, e) => sum + (e.totalPrice || 0), 0);
    draft.summary.extrasTotal = extrasTotal;
    draft.summary.total =
      (draft.summary.subtotal || 0) + extrasTotal - (draft.summary.discountAmount || 0);

    this._saveBookingDraft(draft);
    return {
      extras: this._clone(extras),
      summary: this._clone(draft.summary)
    };
  }

  // getBookingDraftSummary()
  getBookingDraftSummary() {
    const draft = this._getOrCreateBookingDraft();

    const trips = (draft.trips || []).map((t) => ({
      charterId: t.charterId,
      charterName: t.charterName,
      locationName: t.locationName,
      tripDate: t.tripDate,
      timeOfDay: t.timeOfDay,
      groupSize: t.groupSize,
      bookingType: t.bookingType,
      pricingMode: t.pricingMode,
      basePricePerUnit: t.basePricePerUnit,
      lineSubtotal: t.lineSubtotal,
      currency: t.currency
    }));

    const extras = (draft.extras || []).map((e) => {
      const trip = draft.trips.find((t) => t.charterId === e.charterId) || {};
      return {
        charterId: e.charterId,
        charterName: trip.charterName,
        addOnId: e.addOnId,
        name: e.name,
        pricingMode: e.pricingMode,
        unitPrice: e.unitPrice,
        quantity: e.quantity,
        totalPrice: e.totalPrice
      };
    });

    let appliedPromoCode = null;
    if (draft.mode === 'new_cart_checkout') {
      const cart = this._getOrCreateCart();
      if (cart.promo_code_id) {
        appliedPromoCode = this._getPromoById(cart.promo_code_id) || null;
      }
    }

    const paymentOptions = [
      { code: 'default_on_file', label: 'Card on file', isDefault: true },
      { code: 'new_card', label: 'New credit card', isDefault: false },
      { code: 'pay_on_arrival', label: 'Pay on arrival (if available)', isDefault: false }
    ];

    return {
      mode: draft.mode,
      trips,
      extras,
      appliedPromoCode: appliedPromoCode ? this._clone(appliedPromoCode) : null,
      summary: this._clone(draft.summary),
      paymentOptions
    };
  }

  // placeBooking(paymentMethodCode, acceptTerms)
  placeBooking(paymentMethodCode, acceptTerms) {
    const draft = this._getOrCreateBookingDraft();
    if (!acceptTerms) {
      return {
        success: false,
        mode: draft.mode,
        bookingIds: [],
        primaryBookingId: null,
        status: 'pending',
        message: 'Terms of service must be accepted.'
      };
    }

    if (!draft.mode || !draft.trips || !draft.trips.length) {
      return {
        success: false,
        mode: draft.mode,
        bookingIds: [],
        primaryBookingId: null,
        status: 'pending',
        message: 'No trips in booking draft.'
      };
    }

    const bookings = this._getFromStorage('bookings', []);
    const bookingExtras = this._getFromStorage('booking_extras', []);

    const paymentCode = paymentMethodCode || 'default_on_file';
    const paymentStatus = paymentCode === 'pay_on_arrival' ? 'unpaid' : 'paid';

    const bookingIds = [];
    let primaryBookingId = null;
    let status = 'confirmed';

    if (draft.mode === 'new_single_trip' || draft.mode === 'new_cart_checkout') {
      // Determine promo from cart if cart checkout
      let promo = null;
      let discountTotal = 0;
      if (draft.mode === 'new_cart_checkout') {
        const cart = this._getOrCreateCart();
        if (cart.promo_code_id) {
          promo = this._getPromoById(cart.promo_code_id);
          discountTotal = cart.discount_amount || 0;
        }
      }

      const subtotalTotal = draft.trips.reduce((s, t) => s + (t.lineSubtotal || 0), 0);

      draft.trips.forEach((trip) => {
        const charter = this._getCharterById(trip.charterId);
        const location = charter ? this._getLocationById(charter.location_id) : null;
        const captain = charter ? this._getCaptainById(charter.captain_id) : null;

        const perTripSubtotal = trip.lineSubtotal || 0;
        const perTripExtras = draft.extras.filter((e) => e.charterId === trip.charterId);
        const extrasTotal = perTripExtras.reduce((s, e) => s + (e.totalPrice || 0), 0);

        let discountAmount = 0;
        if (discountTotal && subtotalTotal) {
          discountAmount = (perTripSubtotal / subtotalTotal) * discountTotal;
        }

        const totalPrice = perTripSubtotal + extrasTotal - discountAmount;

        const booking = {
          id: this._generateId('booking'),
          charter_id: trip.charterId,
          location_id: charter ? charter.location_id : null,
          charter_name: trip.charterName,
          captain_name: captain ? captain.name : null,
          trip_date: trip.tripDate,
          time_of_day: trip.timeOfDay,
          booking_type: trip.bookingType,
          pricing_mode: trip.pricingMode,
          group_size: trip.groupSize,
          status: 'confirmed',
          base_price: trip.basePricePerUnit,
          extras_total: extrasTotal,
          subtotal: perTripSubtotal,
          promo_code_id: promo ? promo.id : null,
          discount_amount: discountAmount,
          total_price: totalPrice,
          payment_status: paymentStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        bookings.push(booking);
        bookingIds.push(booking.id);
        if (!primaryBookingId) primaryBookingId = booking.id;

        perTripExtras.forEach((e) => {
          const extraEntity = {
            id: this._generateId('booking_extra'),
            booking_id: booking.id,
            add_on_id: e.addOnId,
            name: e.name,
            pricing_mode: e.pricingMode,
            unit_price: e.unitPrice,
            quantity: e.quantity,
            total_price: e.totalPrice
          };
          bookingExtras.push(extraEntity);
        });
      });

      this._saveToStorage('bookings', bookings);
      this._saveToStorage('booking_extras', bookingExtras);

      // Clear cart if this came from cart checkout
      if (draft.mode === 'new_cart_checkout') {
        this.clearCart();
      }

      // Clear draft
      this._saveBookingDraft({
        mode: null,
        originalBookingId: null,
        trips: [],
        extras: [],
        summary: {
          subtotal: 0,
          extrasTotal: 0,
          discountAmount: 0,
          total: 0,
          currency: 'usd'
        }
      });
    } else if (draft.mode === 'modify_booking') {
      const booking = bookings.find((b) => b.id === draft.originalBookingId);
      if (!booking) {
        return {
          success: false,
          mode: draft.mode,
          bookingIds: [],
          primaryBookingId: null,
          status: 'pending',
          message: 'Original booking not found.'
        };
      }
      const trip = draft.trips[0];

      const perTripSubtotal = trip.lineSubtotal || 0;
      const extrasTotal = draft.extras.reduce((s, e) => s + (e.totalPrice || 0), 0);
      const totalPrice =
        perTripSubtotal + extrasTotal - (draft.summary.discountAmount || 0);

      booking.trip_date = trip.tripDate;
      booking.time_of_day = trip.timeOfDay;
      booking.group_size = trip.groupSize;
      booking.booking_type = trip.bookingType;
      booking.pricing_mode = trip.pricingMode;
      booking.base_price = trip.basePricePerUnit;
      booking.subtotal = perTripSubtotal;
      booking.extras_total = extrasTotal;
      booking.discount_amount = draft.summary.discountAmount || 0;
      booking.total_price = totalPrice;
      booking.status = 'modified';
      booking.updated_at = new Date().toISOString();
      booking.payment_status = paymentStatus;

      // Replace booking extras
      for (let i = bookingExtras.length - 1; i >= 0; i--) {
        if (bookingExtras[i].booking_id === booking.id) {
          bookingExtras.splice(i, 1);
        }
      }
      draft.extras.forEach((e) => {
        const extraEntity = {
          id: this._generateId('booking_extra'),
          booking_id: booking.id,
          add_on_id: e.addOnId,
          name: e.name,
          pricing_mode: e.pricingMode,
          unit_price: e.unitPrice,
          quantity: e.quantity,
          total_price: e.totalPrice
        };
        bookingExtras.push(extraEntity);
      });

      this._saveToStorage('bookings', bookings);
      this._saveToStorage('booking_extras', bookingExtras);

      bookingIds.push(booking.id);
      primaryBookingId = booking.id;
      status = booking.status;

      // Clear draft
      this._saveBookingDraft({
        mode: null,
        originalBookingId: null,
        trips: [],
        extras: [],
        summary: {
          subtotal: 0,
          extrasTotal: 0,
          discountAmount: 0,
          total: 0,
          currency: 'usd'
        }
      });
    }

    return {
      success: true,
      mode: draft.mode,
      bookingIds,
      primaryBookingId,
      status,
      message: 'Booking processed successfully.'
    };
  }

  // ---------------------- Bookings list & details ----------------------

  // getBookingsList(includePast = false)
  getBookingsList(includePast) {
    const includePastFlag = !!includePast;
    const bookings = this._getFromStorage('bookings', []);
    const locations = this._getFromStorage('locations', []);
    const charters = this._getFromStorage('charters', []);
    const captains = this._getFromStorage('captains', []);

    const now = new Date();

    const upcoming = [];
    const past = [];

    bookings.forEach((b) => {
      const tripDate = new Date(b.trip_date);
      const charter = charters.find((c) => c.id === b.charter_id) || null;
      const location = locations.find((l) => l.id === b.location_id) || null;
      const captain = charter
        ? captains.find((cap) => cap.id === charter.captain_id) || null
        : null;
      const thumb =
        charter && Array.isArray(charter.photos) && charter.photos.length
          ? charter.photos[0]
          : null;

      const card = {
        bookingId: b.id,
        charterName: b.charter_name,
        locationName: location ? location.name : null,
        captainName: captain ? captain.name : b.captain_name,
        tripDate: b.trip_date,
        timeOfDay: b.time_of_day,
        groupSize: b.group_size,
        status: b.status,
        thumbnailPhotoUrl: thumb,
        booking: this._clone(b)
      };

      if (tripDate >= now && b.status !== 'cancelled') {
        upcoming.push(card);
      } else if (includePastFlag) {
        past.push(card);
      }
    });

    return { upcoming, past };
  }

  // getBookingDetails(bookingId)
  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    const charter = this._getCharterById(booking.charter_id);
    const location = this._getLocationById(booking.location_id);
    const captain = charter ? this._getCaptainById(charter.captain_id) : null;
    const boat = charter ? this._getBoatById(charter.boat_id) : null;

    const allExtras = this._getFromStorage('booking_extras', []);
    const extras = allExtras.filter((e) => e.booking_id === booking.id);

    const includedAmenities = [];
    const optionalAmenities = [];
    const addons = this._getFromStorage('addons', []);

    if (charter) {
      if (charter.includes_bait_tackle) includedAmenities.push('Bait & tackle');
      if (charter.includes_fishing_licenses) includedAmenities.push('Fishing licenses');
      if (charter.includes_drinks) includedAmenities.push('Drinks');
      if (charter.includes_snacks) includedAmenities.push('Snacks');
      if (charter.includes_fish_cleaning) includedAmenities.push('Fish cleaning');

      (charter.offered_add_on_ids || []).forEach((id) => {
        const a = addons.find((x) => x.id === id && x.is_active);
        if (a) optionalAmenities.push(a.display_name || a.code);
      });
    }

    const tripDate = new Date(booking.trip_date);
    const now = new Date();
    const canModify = tripDate > now && booking.status !== 'cancelled';
    const canCancel = tripDate > now && booking.status !== 'cancelled';

    return {
      booking: this._clone(booking),
      location: location ? this._clone(location) : null,
      charter: charter ? this._clone(charter) : null,
      extras: this._clone(extras),
      captain: captain ? this._clone(captain) : null,
      boat: boat ? this._clone(boat) : null,
      includedAmenities,
      optionalAmenities,
      canModify,
      canCancel
    };
  }

  // cancelBooking(bookingId, reason)
  cancelBooking(bookingId, reason) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return {
        success: false,
        booking: null,
        message: 'Booking not found.'
      };
    }

    const tripDate = new Date(booking.trip_date);
    const now = new Date();
    if (tripDate <= now || booking.status === 'cancelled') {
      return {
        success: false,
        booking: this._clone(booking),
        message: 'Booking cannot be cancelled.'
      };
    }

    booking.status = 'cancelled';
    booking.updated_at = new Date().toISOString();

    // Optionally store reason as part of booking (not in model, so ignore or extend)

    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      booking: this._clone(booking),
      message: 'Booking cancelled.'
    };
  }

  // ---------------------- Auth interfaces ----------------------

  // login(username, password)
  login(username, password) {
    const user = String(username || '').trim();
    const pass = String(password || '');

    if (user === 'demo_user' && pass === 'Demo1234!') {
      const state = {
        isLoggedIn: true,
        username: user,
        displayName: 'Demo User',
        isDemoUser: true
      };
      this._setAuthState(state);
      return {
        success: true,
        username: state.username,
        displayName: state.displayName,
        isDemoUser: state.isDemoUser,
        message: 'Logged in as demo user.'
      };
    }

    this._setAuthState({
      isLoggedIn: false,
      username: null,
      displayName: null,
      isDemoUser: false
    });

    return {
      success: false,
      username: null,
      displayName: null,
      isDemoUser: false,
      message: 'Invalid username or password.'
    };
  }

  // getAuthStatus()
  getAuthStatus() {
    return this._clone(this._getAuthState());
  }

  // ---------------------- FAQ, About, Support, Terms, Privacy ----------------------

  // getFaqIndex()
  getFaqIndex() {
    const idx = this._getFromStorage('faq_index', { categories: [] });
    if (!idx.categories) idx.categories = [];
    return this._clone(idx);
  }

  // getFaqArticle(articleId)
  getFaqArticle(articleId) {
    const articles = this._getFromStorage('faq_articles', []);
    const article = articles.find((a) => a.articleId === articleId || a.id === articleId);
    if (!article) {
      return {
        articleId,
        title: '',
        bodyHtml: '',
        lastUpdated: ''
      };
    }
    return this._clone(article);
  }

  // searchFaqs(query)
  searchFaqs(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    const idx = this._getFromStorage('faq_index', { categories: [] });
    const articles = this._getFromStorage('faq_articles', []);

    const results = [];

    articles.forEach((a) => {
      const text = ((a.title || '') + ' ' + (a.bodyHtml || '')).toLowerCase();
      if (text.indexOf(q) !== -1) {
        const category = (idx.categories || []).find((c) =>
          (c.articles || []).some((ca) => ca.articleId === a.articleId || ca.articleId === a.id)
        );
        results.push({
          articleId: a.articleId || a.id,
          title: a.title || '',
          excerpt: (a.bodyHtml || '').slice(0, 200),
          categoryName: category ? category.categoryName : ''
        });
      }
    });

    return results;
  }

  // getAboutContent()
  getAboutContent() {
    const about = this._getFromStorage('about_content', {});
    const def = {
      headline: '',
      bodyHtml: '',
      trustPoints: []
    };
    return this._clone({ ...def, ...about });
  }

  // submitSupportRequest(subject, message, category, bookingId)
  submitSupportRequest(subject, message, category, bookingId) {
    const ticket = {
      id: this._generateId('support_ticket'),
      subject,
      message,
      category: category || null,
      booking_id: bookingId || null,
      created_at: new Date().toISOString(),
      status: 'open'
    };

    const tickets = this._getFromStorage('support_tickets', []);
    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    return {
      success: true,
      ticketId: ticket.id,
      message: 'Support request submitted.'
    };
  }

  // getSupportContactInfo()
  getSupportContactInfo() {
    const info = this._getFromStorage('support_contact_info', {});
    const def = {
      supportEmail: '',
      supportPhone: '',
      supportHours: ''
    };
    return this._clone({ ...def, ...info });
  }

  // getTermsContent()
  getTermsContent() {
    const data = this._getFromStorage('terms_content', {});
    const def = {
      termsHtml: '',
      lastUpdated: ''
    };
    return this._clone({ ...def, ...data });
  }

  // getPrivacyContent()
  getPrivacyContent() {
    const data = this._getFromStorage('privacy_content', {});
    const def = {
      privacyHtml: '',
      lastUpdated: ''
    };
    return this._clone({ ...def, ...data });
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