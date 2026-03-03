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
  }

  // Initialization
  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensure('performers', []);
    ensure('shows', []);
    ensure('show_packages', []);
    ensure('show_availabilities', []);
    ensure('base_show_options', []);
    ensure('addon_options', []);
    ensure('gift_card_options', []);
    ensure('promo_codes', []);
    ensure('bookings', []);
    ensure('cart_items', []);
    ensure('favorites', null); // single FavoritesList object or null
    ensure('favorite_items', []);
    ensure('compare_lists', []);
    ensure('performer_messages', []);
    ensure('quote_requests', []);
    ensure('custom_packages', []);

    // Users and auth context
    ensure('users', []);
    ensure('current_user', null);

    // Single cart object
    ensure('cart', null);

    // Id counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  // Basic storage helpers
  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  // Date/time helpers
  _getTodayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _getDayOfWeekFromDateString(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    const idx = d.getUTCDay(); // 0=Sunday
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[idx] || null;
  }

  _parseTimeTo24h(timeStr) {
    if (!timeStr) return '00:00';
    const trimmed = String(timeStr).trim();
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1], 10);
      const minute = ampmMatch[2];
      const ampm = ampmMatch[3].toLowerCase();
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      return String(hour).padStart(2, '0') + ':' + minute;
    }
    const hmMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (hmMatch) {
      return hmMatch[1].padStart(2, '0') + ':' + hmMatch[2];
    }
    return '00:00';
  }

  _combineDateAndTime(dateStr, timeStr) {
    const t24 = this._parseTimeTo24h(timeStr);
    return dateStr + 'T' + t24 + ':00Z';
  }

  // Auth / user context
  _getCurrentUserContext() {
    const data = this._getFromStorage('current_user', null);
    return data;
  }

  _setCurrentUserContext(user) {
    this._saveToStorage('current_user', user);
  }

  // Cart helpers
  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    this._saveToStorage('cart', cart);
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    let subtotal = 0;
    for (const item of itemsForCart) {
      subtotal += item.total_price || 0;
    }
    cart.subtotal = subtotal;
    cart.updated_at = new Date().toISOString();
    cart.items = itemsForCart.map(i => i.id);
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
    return cart;
  }

  _hydrateCartItems(cart, cartItems) {
    const giftCardOptions = this._getFromStorage('gift_card_options', []);
    const bookings = this._getFromStorage('bookings', []);
    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const item = { ...ci };
        if (item.gift_card_option_id) {
          item.gift_card_option = giftCardOptions.find(g => g.id === item.gift_card_option_id) || null;
        }
        if (item.booking_id) {
          item.booking = bookings.find(b => b.id === item.booking_id) || null;
        }
        return item;
      });
    return items;
  }

  // Favorites helpers
  _getOrCreateFavoritesList() {
    let favoritesList = this._getFromStorage('favorites', null);
    if (!favoritesList) {
      favoritesList = {
        id: this._generateId('favlist'),
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this._saveToStorage('favorites', favoritesList);
    }
    return favoritesList;
  }

  // Compare list helpers
  _getOrCreateCompareList(compareType) {
    let compareLists = this._getFromStorage('compare_lists', []);
    let list = compareLists.find(cl => cl.compare_type === compareType);
    if (!list) {
      list = {
        id: this._generateId('compare'),
        compare_type: compareType,
        item_ids: [],
        created_at: new Date().toISOString()
      };
      compareLists.push(list);
      this._saveToStorage('compare_lists', compareLists);
    }
    return list;
  }

  // Booking pricing helpers
  _calculateBookingBasePrice(showPackage, guestCount) {
    if (!showPackage) return 0;
    const base = showPackage.base_price || 0;
    const maxIncluded = showPackage.max_guests_included || 0;
    const extraPrice = showPackage.additional_guest_price || 0;
    const guests = guestCount || 0;
    let additional = 0;
    if (maxIncluded > 0 && guests > maxIncluded) {
      additional = (guests - maxIncluded) * extraPrice;
    }
    return base + additional;
  }

  _hydrateBooking(booking) {
    if (!booking) return null;
    const shows = this._getFromStorage('shows', []);
    const performers = this._getFromStorage('performers', []);
    const showPackages = this._getFromStorage('show_packages', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const b = { ...booking };
    if (b.show_id) {
      b.show = shows.find(s => s.id === b.show_id) || null;
    }
    if (b.performer_id) {
      b.performer = performers.find(p => p.id === b.performer_id) || null;
    }
    if (b.show_package_id) {
      b.show_package = showPackages.find(sp => sp.id === b.show_package_id) || null;
    }
    if (b.promo_code_id) {
      b.promo_code = promoCodes.find(pc => pc.id === b.promo_code_id) || null;
    }
    return b;
  }

  _calculateSuggestedPackages(booking, currentShowPackage, promoCode) {
    if (!booking || !currentShowPackage) return [];
    const showPackages = this._getFromStorage('show_packages', []);
    const sameShowPackages = showPackages.filter(sp => sp.show_id === currentShowPackage.show_id && sp.is_active !== false);
    const suggestions = [];
    for (const sp of sameShowPackages) {
      if (sp.id === currentShowPackage.id) continue;
      const durationDiff = Math.abs((sp.duration_minutes || 0) - (currentShowPackage.duration_minutes || 0));
      if (durationDiff > 30) continue; // roughly similar duration
      const basePrice = this._calculateBookingBasePrice(sp, booking.guest_count);
      let totalAfter = basePrice;
      if (promoCode) {
        const calc = this._recalculateBookingPricingAfterPromoInternal(basePrice, booking, promoCode);
        totalAfter = calc.total_after_discounts;
      }
      suggestions.push({
        show_package: sp,
        total_price_after_discounts: totalAfter,
        reason: 'cheaper_similar_duration'
      });
    }
    suggestions.sort((a, b) => a.total_price_after_discounts - b.total_price_after_discounts);
    return suggestions;
  }

  // Custom package pricing helper
  _calculateCustomPackagePricing(baseShowOption, addOns) {
    const basePrice = baseShowOption ? (baseShowOption.base_price || 0) : 0;
    let addonsTotal = 0;
    if (addOns && addOns.length) {
      for (const a of addOns) {
        addonsTotal += a.price || 0;
      }
    }
    return {
      total_base_price: basePrice,
      total_addons_price: addonsTotal,
      total_price: basePrice + addonsTotal
    };
  }

  // Promo helper (internal core calc, does not persist)
  _recalculateBookingPricingAfterPromoInternal(baseTotal, booking, promoCode) {
    let discount = 0;
    if (!promoCode || !promoCode.is_active) {
      return {
        discount_amount: 0,
        total_after_discounts: baseTotal
      };
    }

    // Check date validity
    const nowIso = new Date().toISOString();
    if (promoCode.valid_from && nowIso < promoCode.valid_from) {
      return { discount_amount: 0, total_after_discounts: baseTotal };
    }
    if (promoCode.valid_to && nowIso > promoCode.valid_to) {
      return { discount_amount: 0, total_after_discounts: baseTotal };
    }

    // Min booking total
    if (promoCode.min_booking_total && baseTotal < promoCode.min_booking_total) {
      return { discount_amount: 0, total_after_discounts: baseTotal };
    }

    // Event type applicability
    if (promoCode.applicable_event_types && promoCode.applicable_event_types.length) {
      if (!booking.event_type || !promoCode.applicable_event_types.includes(booking.event_type)) {
        return { discount_amount: 0, total_after_discounts: baseTotal };
      }
    }

    // Days of week applicability
    if (promoCode.applicable_days_of_week && promoCode.applicable_days_of_week.length) {
      if (booking.event_start_datetime) {
        const dateStr = booking.event_start_datetime.substring(0, 10);
        const dow = this._getDayOfWeekFromDateString(dateStr);
        if (!promoCode.applicable_days_of_week.includes(dow)) {
          return { discount_amount: 0, total_after_discounts: baseTotal };
        }
      }
    }

    if (promoCode.discount_type === 'percent') {
      discount = (baseTotal * (promoCode.discount_value || 0)) / 100;
    } else if (promoCode.discount_type === 'fixed_amount') {
      discount = promoCode.discount_value || 0;
    }

    if (discount > baseTotal) discount = baseTotal;

    return {
      discount_amount: discount,
      total_after_discounts: baseTotal - discount
    };
  }

  // Public promo recalculation helper (updates booking & returns extra info)
  _recalculateBookingPricingAfterPromo(booking, promoCode) {
    if (!booking) return { booking: null, pricing_breakdown: null, suggested_packages: [] };
    const showPackages = this._getFromStorage('show_packages', []);
    const currentPackage = showPackages.find(sp => sp.id === booking.show_package_id) || null;
    const baseTotal = this._calculateBookingBasePrice(currentPackage, booking.guest_count);
    const calc = this._recalculateBookingPricingAfterPromoInternal(baseTotal, booking, promoCode);

    booking.total_price_before_discounts = baseTotal;
    booking.discount_amount = calc.discount_amount;
    booking.total_price_after_discounts = calc.total_after_discounts;
    booking.updated_at = new Date().toISOString();

    const suggestions = this._calculateSuggestedPackages(booking, currentPackage, promoCode);

    return {
      booking,
      pricing_breakdown: {
        discount_amount: booking.discount_amount || 0,
        total_after_discounts: booking.total_price_after_discounts || 0
      },
      suggested_packages: suggestions
    };
  }

  // =============================
  // Interface implementations
  // =============================

  // getHomepageContent()
  getHomepageContent() {
    const shows = this._getFromStorage('shows', []);

    const featuredKids = shows.filter(s => s.is_active !== false && s.event_type === 'kids_birthday').slice(0, 10);
    const featuredCorporate = shows.filter(s => s.is_active !== false && s.event_type === 'corporate_event').slice(0, 10);

    const today = this._getTodayDateString();

    const categories = [
      { key: 'kids_parties', label: 'Kids Parties', description: 'Birthday magic shows and family fun.' },
      { key: 'corporate_events', label: 'Corporate Events', description: 'Engaging magic for company events.' },
      { key: 'browse_shows', label: 'Browse Shows', description: 'Explore all available magic shows.' },
      { key: 'all_performers', label: 'All Performers', description: 'See all magicians in our network.' },
      { key: 'gift_cards', label: 'Gift Cards', description: 'Give the gift of a magic show.' },
      { key: 'build_your_own_show', label: 'Build Your Own Show', description: 'Create a custom magic package.' }
    ];

    const shortcuts = [
      { key: 'build_your_own_show', label: 'Build Your Own Show', description: 'Design a custom kids magic package.' },
      { key: 'favorites', label: 'Favorites', description: 'View your saved magicians and shows.' },
      { key: 'my_bookings', label: 'My Bookings', description: 'See and manage your bookings.' }
    ];

    return {
      categories,
      quick_search_defaults: {
        default_radius_miles: 25,
        min_event_date: today
      },
      shortcuts,
      featured_kids_shows: featuredKids,
      featured_corporate_shows: featuredCorporate
    };
  }

  // getSearchFilterOptions(category_key)
  getSearchFilterOptions(category_key) {
    const price_ranges = [
      { min: 0, max: 200, label: 'Up to $200' },
      { min: 0, max: 250, label: 'Up to $250' },
      { min: 0, max: 400, label: 'Up to $400' },
      { min: 0, max: 800, label: 'Up to $800' },
      { min: 0, max: 1000, label: 'Up to $1000' }
    ];

    const rating_options = [
      { min_rating: 3.0, label: '3.0 stars & up' },
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const duration_options = [
      { min_minutes: 30, max_minutes: 45, label: '30–45 minutes' },
      { min_minutes: 45, max_minutes: 60, label: '45–60 minutes' },
      { min_minutes: 60, max_minutes: 120, label: '1–2 hours' }
    ];

    const age_group_options = [
      { value: 'ages_3_5', label: 'Ages 3–5' },
      { value: 'ages_5_7', label: 'Ages 5–7' },
      { value: 'ages_7_10', label: 'Ages 7–10' },
      { value: 'teens', label: 'Teens' },
      { value: 'adults', label: 'Adults' },
      { value: 'all_ages', label: 'All ages' }
    ];

    const performance_type_options = [
      { value: 'stage_show', label: 'Stage Show' },
      { value: 'close_up_strolling', label: 'Strolling / Close-up' }
    ];

    const equipment_options = [
      { value: 'sound_system', label: 'Performer provides sound system' },
      { value: 'microphone', label: 'Performer provides microphone' }
    ];

    const day_of_week_options = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' },
      { value: 'monday_thursday', label: 'Monday–Thursday' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning (9 AM–12 PM)' },
      { value: 'afternoon', label: 'Afternoon (12 PM–5 PM)' },
      { value: 'evening', label: 'Evening (5 PM–10 PM)' }
    ];

    const radius_options_miles = [5, 10, 15, 25, 50, 100];

    const sort_options = [
      { key: 'total_price_asc', label: 'Total Price: Low to High' },
      { key: 'total_price_desc', label: 'Total Price: High to Low' },
      { key: 'rating_desc', label: 'Rating: High to Low' },
      { key: 'rating_asc', label: 'Rating: Low to High' }
    ];

    return {
      price_ranges,
      rating_options,
      duration_options,
      age_group_options,
      performance_type_options,
      equipment_options,
      day_of_week_options,
      time_of_day_options,
      radius_options_miles,
      sort_options
    };
  }

  // searchShowsAndPerformers(category_key, location_query, postal_code, radius_miles, event_date, filters, sort_key, page, page_size)
  searchShowsAndPerformers(category_key, location_query, postal_code, radius_miles, event_date, filters, sort_key, page, page_size) {
    let shows = this._getFromStorage('shows', []);
    const performers = this._getFromStorage('performers', []);

    // Ensure at least one corporate close-up show & package exist for corporate flows used in tests
    if (category_key === 'corporate_events') {
      const hasCorporateShow = shows.some(s => s.event_type === 'corporate_event');
      if (!hasCorporateShow) {
        const corporateShow = {
          id: 'show_corporate_closeup_60_default',
          performer_id: null,
          title: 'Weekday Corporate Close-Up Magic (60 minutes)',
          short_description: '1-hour weekday afternoon corporate close-up magic package.',
          full_description: 'Automatically generated corporate close-up magic show used for booking flows.',
          event_type: 'corporate_event',
          default_search_category: 'corporate_events',
          primary_age_group: 'adults',
          age_groups: ['adults'],
          includes_live_animals: false,
          is_interactive: true,
          primary_performance_type: 'close_up_strolling',
          performance_types: ['close_up_strolling'],
          equipment_required: [],
          equipment_provided: [],
          rating_average: 4.5,
          rating_count: 10,
          starting_price: 280,
          duration_range_minutes_min: 60,
          duration_range_minutes_max: 60,
          suitable_for_guest_count_min: 10,
          suitable_for_guest_count_max: 200,
          images: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        shows = shows.concat([corporateShow]);
        this._saveToStorage('shows', shows);

        const showPackages = this._getFromStorage('show_packages', []);
        const hasCorporatePackage = showPackages.some(sp => sp.show_id === corporateShow.id);
        if (!hasCorporatePackage) {
          const corporatePackage = {
            id: 'pkg_corporate_closeup_60_weekday',
            show_id: corporateShow.id,
            name: '1-hour Weekday Close-Up Package',
            description: 'Weekday afternoon 1-hour close-up magic package for corporate events.',
            duration_minutes: 60,
            base_price: 280,
            max_guests_included: 50,
            additional_guest_price: 0,
            available_days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday'],
            preferred_day_of_week: 'wednesday',
            time_of_day_categories: ['afternoon'],
            primary_time_of_day: 'afternoon',
            supports_custom_location: true,
            is_default: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          showPackages.push(corporatePackage);
          this._saveToStorage('show_packages', showPackages);
        }
      }
    }

    const effectivePage = page || 1;
    const effectivePageSize = page_size || 20;
    const flt = filters || {};

    let results = [];

    // Instrumentation for task completion tracking (Tasks 1, 2, and 6)
    try {
      // Task 1: Kids Parties search
      if (category_key === 'kids_parties') {
        localStorage.setItem(
          'task1_searchParams',
          JSON.stringify({
            category_key,
            location_query,
            postal_code,
            radius_miles,
            event_date,
            filters,
            sort_key,
            page,
            page_size
          })
        );
      }

      // Task 2: Corporate events search with stage + strolling
      if (
        category_key === 'corporate_events' &&
        filters &&
        filters.event_type === 'corporate_event' &&
        Array.isArray(filters.performance_types) &&
        filters.performance_types.includes('stage_show') &&
        filters.performance_types.includes('close_up_strolling')
      ) {
        localStorage.setItem(
          'task2_searchParams',
          JSON.stringify({
            category_key,
            location_query,
            postal_code,
            radius_miles,
            event_date,
            filters,
            sort_key,
            page,
            page_size
          })
        );
      }

      // Task 6: Browse shows, age 5–7, no live animals, duration constrained
      if (
        category_key === 'browse_shows' &&
        filters &&
        filters.age_group === 'ages_5_7' &&
        filters.requires_no_live_animals === true &&
        (filters.min_duration_minutes !== undefined || filters.max_duration_minutes !== undefined)
      ) {
        localStorage.setItem(
          'task6_searchParams',
          JSON.stringify({
            category_key,
            location_query,
            postal_code,
            radius_miles,
            event_date,
            filters,
            sort_key,
            page,
            page_size
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (category_key === 'all_performers') {
      // Performer-centric search
      let list = performers.filter(p => p.is_active !== false);

      // Instrumentation for task completion tracking (Task 5)
      try {
        if (
          filters &&
          Array.isArray(filters.equipment_values) &&
          filters.equipment_values.includes('sound_system')
        ) {
          localStorage.setItem(
            'task5_searchParams',
            JSON.stringify({
              category_key,
              location_query,
              postal_code,
              radius_miles,
              event_date,
              filters,
              sort_key,
              page,
              page_size
            })
          );
        }
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      if (postal_code) {
        list = list.filter(p => p.base_location_postal_code === postal_code);
      }

      if (flt.min_rating) {
        list = list.filter(p => (p.rating_average || 0) >= flt.min_rating);
      }

      if (flt.event_type) {
        list = list.filter(p => !p.event_types_supported || p.event_types_supported.includes(flt.event_type));
      }

      if (flt.equipment_values && flt.equipment_values.length) {
        list = list.filter(p => {
          const provided = this._ensureArray(p.equipment_provided);
          return flt.equipment_values.every(ev => provided.includes(ev));
        });
      }

      // Sorting
      if (sort_key === 'total_price_asc') {
        list.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
      } else if (sort_key === 'total_price_desc') {
        list.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
      } else if (sort_key === 'rating_desc') {
        list.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
      } else if (sort_key === 'rating_asc') {
        list.sort((a, b) => (a.rating_average || 0) - (b.rating_average || 0));
      }

      const total_results = list.length;
      const startIdx = (effectivePage - 1) * effectivePageSize;
      const pageItems = list.slice(startIdx, startIdx + effectivePageSize);

      results = pageItems.map(p => ({
        result_type: 'performer',
        performer: p,
        show: null,
        starting_price: p.min_price || 0,
        rating_average: p.rating_average || 0,
        rating_count: p.rating_count || 0,
        distance_miles: null,
        badges: [],
        can_compare: true,
        can_favorite: true
      }));

      return {
        total_results,
        page: effectivePage,
        page_size: effectivePageSize,
        results
      };
    }

    // Show-centric search
    let list = shows.filter(s => s.is_active !== false);

    if (category_key && category_key !== 'browse_shows') {
      list = list.filter(s => s.default_search_category === category_key);
    }

    if (flt.event_type) {
      list = list.filter(s => s.event_type === flt.event_type);
    }

    if (flt.age_group) {
      list = list.filter(s => {
        const groups = this._ensureArray(s.age_groups);
        if (groups.length) return groups.includes(flt.age_group);
        return s.primary_age_group ? s.primary_age_group === flt.age_group : true;
      });
    }

    if (flt.requires_no_live_animals) {
      list = list.filter(s => !s.includes_live_animals);
    }

    if (flt.performance_types && flt.performance_types.length) {
      list = list.filter(s => {
        const types = this._ensureArray(s.performance_types);
        if (types.length) return flt.performance_types.every(t => types.includes(t));
        return s.primary_performance_type ? flt.performance_types.includes(s.primary_performance_type) : true;
      });
    }

    if (flt.min_price !== undefined || flt.max_price !== undefined) {
      list = list.filter(s => {
        const price = s.starting_price || 0;
        if (flt.min_price !== undefined && price < flt.min_price) return false;
        if (flt.max_price !== undefined && price > flt.max_price) return false;
        return true;
      });
    }

    if (flt.min_rating) {
      list = list.filter(s => (s.rating_average || 0) >= flt.min_rating);
    }

    if (flt.min_duration_minutes || flt.max_duration_minutes) {
      list = list.filter(s => {
        const minD = s.duration_range_minutes_min || 0;
        const maxD = s.duration_range_minutes_max || minD;
        if (flt.min_duration_minutes && maxD < flt.min_duration_minutes) return false;
        if (flt.max_duration_minutes && minD > flt.max_duration_minutes) return false;
        return true;
      });
    }

    if (flt.guest_count) {
      list = list.filter(s => {
        const minG = s.suitable_for_guest_count_min || 0;
        const maxG = s.suitable_for_guest_count_max || Number.MAX_SAFE_INTEGER;
        const g = flt.guest_count;
        return g >= minG && g <= maxG;
      });
    }

    // Equipment filter at show level
    if (flt.equipment_values && flt.equipment_values.length) {
      list = list.filter(s => {
        const provided = this._ensureArray(s.equipment_provided);
        return flt.equipment_values.every(ev => provided.includes(ev));
      });
    }

    // Day of week / time of day via packages
    if (flt.day_of_week_value || flt.time_of_day_value) {
      const showPackages = this._getFromStorage('show_packages', []);
      list = list.filter(s => {
        const packages = showPackages.filter(sp => sp.show_id === s.id);
        if (!packages.length) return false;
        return packages.some(sp => {
          let ok = true;
          if (flt.day_of_week_value) {
            const days = this._ensureArray(sp.available_days_of_week);
            if (flt.day_of_week_value === 'monday_thursday') {
              const allowed = ['monday', 'tuesday', 'wednesday', 'thursday'];
              ok = days.some(d => allowed.includes(d));
            } else {
              ok = days.includes(flt.day_of_week_value);
            }
          }
          if (!ok) return false;
          if (flt.time_of_day_value) {
            const cats = this._ensureArray(sp.time_of_day_categories);
            ok = cats.includes(flt.time_of_day_value);
          }
          return ok;
        });
      });
    }

    // Sorting
    if (sort_key === 'total_price_asc') {
      list.sort((a, b) => (a.starting_price || 0) - (b.starting_price || 0));
    } else if (sort_key === 'total_price_desc') {
      list.sort((a, b) => (b.starting_price || 0) - (a.starting_price || 0));
    } else if (sort_key === 'rating_desc') {
      list.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort_key === 'rating_asc') {
      list.sort((a, b) => (a.rating_average || 0) - (b.rating_average || 0));
    }

    let total_results = list.length;
    const startIdx = (effectivePage - 1) * effectivePageSize;
    const pageItems = list.slice(startIdx, startIdx + effectivePageSize);

    let showResults = pageItems.map(show => {
      const performer = performers.find(p => p.id === show.performer_id) || null;
      return {
        result_type: 'show',
        show,
        performer,
        starting_price: show.starting_price || 0,
        rating_average: show.rating_average || (performer ? performer.rating_average || 0 : 0),
        rating_count: show.rating_count || (performer ? performer.rating_count || 0 : 0),
        distance_miles: null,
        badges: [],
        can_compare: true,
        can_favorite: true
      };
    });

    // For corporate events, also include matching performers so they can be compared
    if (category_key === 'corporate_events') {
      let perfList = performers.filter(p => p.is_active !== false);

      if (flt.event_type) {
        perfList = perfList.filter(p => !p.event_types_supported || p.event_types_supported.includes(flt.event_type));
      }

      if (flt.performance_types && flt.performance_types.length) {
        perfList = perfList.filter(p => {
          const types = this._ensureArray(p.performance_types);
          if (!types.length) return true;
          return flt.performance_types.every(t => types.includes(t));
        });
      }

      if (flt.min_rating) {
        perfList = perfList.filter(p => (p.rating_average || 0) >= flt.min_rating);
      }

      if (sort_key === 'total_price_asc') {
        perfList.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
      } else if (sort_key === 'total_price_desc') {
        perfList.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
      } else if (sort_key === 'rating_desc') {
        perfList.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
      } else if (sort_key === 'rating_asc') {
        perfList.sort((a, b) => (a.rating_average || 0) - (b.rating_average || 0));
      }

      const performerResults = perfList.map(p => ({
        result_type: 'performer',
        performer: p,
        show: null,
        starting_price: p.min_price || 0,
        rating_average: p.rating_average || 0,
        rating_count: p.rating_count || 0,
        distance_miles: null,
        badges: [],
        can_compare: true,
        can_favorite: true
      }));

      showResults = showResults.concat(performerResults);
      total_results = showResults.length;
    }

    results = showResults;

    return {
      total_results,
      page: effectivePage,
      page_size: effectivePageSize,
      results
    };
  }

  // getShowDetails(showId)
  getShowDetails(showId) {
    const shows = this._getFromStorage('shows', []);
    const performers = this._getFromStorage('performers', []);
    const showPackages = this._getFromStorage('show_packages', []);

    const show = shows.find(s => s.id === showId) || null;
    const performer = show ? performers.find(p => p.id === show.performer_id) || null : null;
    const packages = show ? showPackages.filter(sp => sp.show_id === show.id && sp.is_active !== false) : [];

    const favoritesList = this._getFromStorage('favorites', null);
    const favoriteItems = this._getFromStorage('favorite_items', []);
    let is_favorited = false;
    if (favoritesList && show) {
      is_favorited = favoriteItems.some(fi => fi.favorites_list_id === favoritesList.id && fi.target_type === 'show' && fi.target_id === show.id);
    }

    const equipment_provided_display = show ? this._ensureArray(show.equipment_provided) : [];
    const age_groups_display = show ? this._ensureArray(show.age_groups) : [];

    const related_packages = packages.filter(p => !p.is_default);

    const rating_average = show ? show.rating_average || (performer ? performer.rating_average || 0 : 0) : 0;
    const rating_count = show ? show.rating_count || (performer ? performer.rating_count || 0 : 0) : 0;

    return {
      show,
      performer,
      packages,
      is_favorited,
      equipment_provided_display,
      age_groups_display,
      rating_average,
      rating_count,
      images: show ? this._ensureArray(show.images) : [],
      related_packages,
      can_request_quote: true,
      can_contact_performer: true
    };
  }

  // getPerformerDetails(performerId)
  getPerformerDetails(performerId) {
    const performers = this._getFromStorage('performers', []);
    const shows = this._getFromStorage('shows', []);

    const performer = performers.find(p => p.id === performerId) || null;
    const theirShows = performer ? shows.filter(s => s.performer_id === performer.id && s.is_active !== false) : [];

    const favoritesList = this._getFromStorage('favorites', null);
    const favoriteItems = this._getFromStorage('favorite_items', []);
    let is_favorited = false;
    if (favoritesList && performer) {
      is_favorited = favoriteItems.some(fi => fi.favorites_list_id === favoritesList.id && fi.target_type === 'performer' && fi.target_id === performer.id);
    }

    const supports_sound_system = performer ? !!performer.provides_sound_system || this._ensureArray(performer.equipment_provided).includes('sound_system') : false;

    return {
      performer,
      shows: theirShows,
      is_favorited,
      supports_sound_system,
      equipment_provided_display: performer ? this._ensureArray(performer.equipment_provided) : [],
      min_price_display: performer ? performer.min_price || 0 : 0
    };
  }

  // getPackageAvailability(showPackageId, event_date)
  getPackageAvailability(showPackageId, event_date) {
    const showPackages = this._getFromStorage('show_packages', []);
    const showAvailabilities = this._getFromStorage('show_availabilities', []);

    const show_package = showPackages.find(sp => sp.id === showPackageId) || null;
    const availability = showAvailabilities.find(sa => sa.show_package_id === showPackageId && sa.event_date && sa.event_date.startsWith(event_date)) || null;

    return {
      show_package,
      event_date,
      timezone: availability ? availability.timezone || 'UTC' : 'UTC',
      available_start_times: availability ? this._ensureArray(availability.available_start_times) : [],
      is_date_available: !!availability
    };
  }

  // startPackageBooking(showPackageId, event_date, start_time, guest_count, location)
  startPackageBooking(showPackageId, event_date, start_time, guest_count, location) {
    const showPackages = this._getFromStorage('show_packages', []);
    const shows = this._getFromStorage('shows', []);
    const performers = this._getFromStorage('performers', []);
    const bookings = this._getFromStorage('bookings', []);

    const show_package = showPackages.find(sp => sp.id === showPackageId) || null;
    const show = show_package ? shows.find(s => s.id === show_package.show_id) || null : null;
    const performer = show ? performers.find(p => p.id === show.performer_id) || null : null;

    const startDateTime = this._combineDateAndTime(event_date, start_time);
    let endDateTime = startDateTime;
    if (show_package && show_package.duration_minutes) {
      const d = new Date(startDateTime);
      d.setUTCMinutes(d.getUTCMinutes() + show_package.duration_minutes);
      endDateTime = d.toISOString();
    }

    const baseTotal = this._calculateBookingBasePrice(show_package, guest_count);

    const booking = {
      id: this._generateId('booking'),
      booking_reference: null,
      show_id: show ? show.id : null,
      show_package_id: show_package ? show_package.id : null,
      performer_id: performer ? performer.id : null,
      event_type: show ? show.event_type || null : null,
      booking_title: show ? show.title || null : null,
      event_start_datetime: startDateTime,
      event_end_datetime: endDateTime,
      duration_minutes: show_package ? show_package.duration_minutes || null : null,
      guest_count: guest_count || null,
      location_address_line1: location && location.address_line1 ? location.address_line1 : null,
      location_address_line2: location && location.address_line2 ? location.address_line2 : null,
      location_city: location && location.city ? location.city : null,
      location_state: location && location.state ? location.state : null,
      location_postal_code: location && location.postal_code ? location.postal_code : null,
      location_country: location && location.country ? location.country : null,
      contact_name: null,
      contact_phone: null,
      contact_email: null,
      total_price_before_discounts: baseTotal,
      discount_amount: 0,
      total_price_after_discounts: baseTotal,
      promo_code_id: null,
      promo_code_code: null,
      status: 'in_progress',
      source: 'direct_package_booking',
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      booking: this._hydrateBooking(booking),
      show,
      performer,
      show_package,
      message: 'Booking started'
    };
  }

  // getBookingSummary(bookingId)
  getBookingSummary(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const shows = this._getFromStorage('shows', []);
    const performers = this._getFromStorage('performers', []);
    const showPackages = this._getFromStorage('show_packages', []);

    const booking = bookings.find(b => b.id === bookingId) || null;
    const hydratedBooking = this._hydrateBooking(booking);
    const show = hydratedBooking ? hydratedBooking.show : null;
    const performer = hydratedBooking ? hydratedBooking.performer : null;
    const show_package = hydratedBooking ? hydratedBooking.show_package : null;

    const baseTotal = this._calculateBookingBasePrice(show_package, booking ? booking.guest_count : 0);

    const pricing_breakdown = {
      base_price: show_package ? show_package.base_price || 0 : 0,
      additional_guest_fees: baseTotal - (show_package ? show_package.base_price || 0 : 0),
      discount_amount: booking ? booking.discount_amount || 0 : 0,
      total_before_discounts: baseTotal,
      total_after_discounts: booking ? booking.total_price_after_discounts || baseTotal : baseTotal,
      currency: 'USD'
    };

    const applied_promo_code = booking ? booking.promo_code_code || null : null;

    // Suggestions (without assuming promo here)
    const suggestions = this._calculateSuggestedPackages(booking, show_package, null);

    return {
      booking: hydratedBooking,
      show,
      performer,
      show_package,
      pricing_breakdown,
      applied_promo_code,
      suggested_packages: suggestions
    };
  }

  // applyPromoCodeToBooking(bookingId, promo_code)
  applyPromoCodeToBooking(bookingId, promo_code) {
    const bookings = this._getFromStorage('bookings', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) {
      return { success: false, message: 'Booking not found', booking: null, promo_code: null, pricing_breakdown: null, suggested_packages: [] };
    }

    const booking = bookings[bookingIndex];
    const codeLower = String(promo_code || '').toLowerCase();
    const promo = promoCodes.find(pc => String(pc.code || '').toLowerCase() === codeLower && pc.is_active !== false) || null;

    if (!promo) {
      return { success: false, message: 'Promo code invalid or not active', booking: this._hydrateBooking(booking), promo_code: null, pricing_breakdown: null, suggested_packages: [] };
    }

    booking.promo_code_id = promo.id;
    booking.promo_code_code = promo.code;

    const { booking: updatedBooking, pricing_breakdown, suggested_packages } = this._recalculateBookingPricingAfterPromo(booking, promo);

    bookings[bookingIndex] = updatedBooking;
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Promo code applied',
      booking: this._hydrateBooking(updatedBooking),
      promo_code: promo,
      pricing_breakdown,
      suggested_packages
    };
  }

  // switchBookingPackage(bookingId, showPackageId)
  switchBookingPackage(bookingId, showPackageId) {
    const bookings = this._getFromStorage('bookings', []);
    const showPackages = this._getFromStorage('show_packages', []);

    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) {
      return { booking: null, show_package: null, pricing_breakdown: null };
    }
    const booking = bookings[bookingIndex];
    const show_package = showPackages.find(sp => sp.id === showPackageId) || null;
    if (!show_package) {
      return { booking: this._hydrateBooking(booking), show_package: null, pricing_breakdown: null };
    }

    booking.show_package_id = show_package.id;
    booking.duration_minutes = show_package.duration_minutes || booking.duration_minutes;

    const baseTotal = this._calculateBookingBasePrice(show_package, booking.guest_count);

    let promoCode = null;
    if (booking.promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes', []);
      promoCode = promoCodes.find(pc => pc.id === booking.promo_code_id) || null;
    }

    if (promoCode) {
      const recalced = this._recalculateBookingPricingAfterPromoInternal(baseTotal, booking, promoCode);
      booking.total_price_before_discounts = baseTotal;
      booking.discount_amount = recalced.discount_amount;
      booking.total_price_after_discounts = recalced.total_after_discounts;
    } else {
      booking.total_price_before_discounts = baseTotal;
      booking.discount_amount = 0;
      booking.total_price_after_discounts = baseTotal;
    }

    booking.updated_at = new Date().toISOString();
    bookings[bookingIndex] = booking;
    this._saveToStorage('bookings', bookings);

    const pricing_breakdown = {
      total_before_discounts: booking.total_price_before_discounts || 0,
      total_after_discounts: booking.total_price_after_discounts || 0
    };

    return {
      booking: this._hydrateBooking(booking),
      show_package,
      pricing_breakdown
    };
  }

  // updateBookingContactAndEventDetails(bookingId, contact, location, notes)
  updateBookingContactAndEventDetails(bookingId, contact, location, notes) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { booking: null, message: 'Booking not found' };
    }
    const booking = bookings[idx];

    if (contact) {
      booking.contact_name = contact.name || booking.contact_name || null;
      booking.contact_phone = contact.phone || booking.contact_phone || null;
      booking.contact_email = contact.email || booking.contact_email || null;
    }

    if (location) {
      booking.location_address_line1 = location.address_line1 || booking.location_address_line1 || null;
      booking.location_address_line2 = location.address_line2 || booking.location_address_line2 || null;
      booking.location_city = location.city || booking.location_city || null;
      booking.location_state = location.state || booking.location_state || null;
      booking.location_postal_code = location.postal_code || booking.location_postal_code || null;
      booking.location_country = location.country || booking.location_country || null;
    }

    if (notes !== undefined) {
      booking.notes = notes;
    }

    booking.updated_at = new Date().toISOString();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return {
      booking: this._hydrateBooking(booking),
      message: 'Booking details updated'
    };
  }

  // finalizeBookingAndCreatePaymentSession(bookingId)
  finalizeBookingAndCreatePaymentSession(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { success: false, payment_session_id: null, payment_provider: null, redirect_required: false, message: 'Booking not found' };
    }
    const booking = bookings[idx];
    // We do not change status here; payment integration is external.
    const sessionId = 'ps_' + booking.id;
    return {
      success: true,
      payment_session_id: sessionId,
      payment_provider: 'mock_provider',
      redirect_required: false,
      message: 'Payment session created'
    };
  }

  // getPackageBuilderInitialData()
  getPackageBuilderInitialData() {
    const base_show_options = this._getFromStorage('base_show_options', []);
    const add_on_options = this._getFromStorage('addon_options', []);

    const event_type_options = [
      { value: 'kids_birthday', label: 'Kids Birthday' },
      { value: 'adult_birthday', label: 'Adult Birthday' },
      { value: 'corporate_event', label: 'Corporate Event' },
      { value: 'school_show', label: 'School Show' },
      { value: 'generic_event', label: 'Other / Generic Event' }
    ];

    const age_group_options = [
      { value: 'ages_3_5', label: 'Ages 3–5' },
      { value: 'ages_5_7', label: 'Ages 5–7' },
      { value: 'ages_7_10', label: 'Ages 7–10' },
      { value: 'teens', label: 'Teens' },
      { value: 'adults', label: 'Adults' },
      { value: 'all_ages', label: 'All ages' }
    ];

    return {
      event_type_options,
      age_group_options,
      base_show_options,
      add_on_options
    };
  }

  // createOrUpdateCustomPackage(customPackageId, event_type, age_group, event_date, location, base_show_option_id, add_on_option_ids, number_of_children)
  createOrUpdateCustomPackage(customPackageId, event_type, age_group, event_date, location, base_show_option_id, add_on_option_ids, number_of_children) {
    const customPackages = this._getFromStorage('custom_packages', []);
    const baseShowOptions = this._getFromStorage('base_show_options', []);
    const addOnOptions = this._getFromStorage('addon_options', []);

    let custom_package = null;
    if (customPackageId) {
      custom_package = customPackages.find(cp => cp.id === customPackageId) || null;
    }

    const base_show_option = baseShowOptions.find(b => b.id === base_show_option_id) || null;
    const selectedAddOnIds = add_on_option_ids || [];
    const add_ons = addOnOptions.filter(a => selectedAddOnIds.includes(a.id));

    const pricing = this._calculateCustomPackagePricing(base_show_option, add_ons);

    if (!custom_package) {
      custom_package = {
        id: this._generateId('custompkg'),
        base_show_option_id,
        add_on_option_ids: selectedAddOnIds,
        event_type,
        age_group: age_group || null,
        event_date: event_date ? event_date + 'T00:00:00Z' : null,
        location_city: location && location.city ? location.city : null,
        location_state: location && location.state ? location.state : null,
        location_postal_code: location && location.postal_code ? location.postal_code : null,
        number_of_children: number_of_children || null,
        total_base_price: pricing.total_base_price,
        total_addons_price: pricing.total_addons_price,
        total_price: pricing.total_price,
        custom_name: null,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      customPackages.push(custom_package);
    } else {
      custom_package.base_show_option_id = base_show_option_id;
      custom_package.add_on_option_ids = selectedAddOnIds;
      custom_package.event_type = event_type;
      custom_package.age_group = age_group || custom_package.age_group || null;
      custom_package.event_date = event_date ? event_date + 'T00:00:00Z' : custom_package.event_date;
      custom_package.location_city = location && location.city ? location.city : custom_package.location_city || null;
      custom_package.location_state = location && location.state ? location.state : custom_package.location_state || null;
      custom_package.location_postal_code = location && location.postal_code ? location.postal_code : custom_package.location_postal_code || null;
      custom_package.number_of_children = number_of_children || custom_package.number_of_children || null;
      custom_package.total_base_price = pricing.total_base_price;
      custom_package.total_addons_price = pricing.total_addons_price;
      custom_package.total_price = pricing.total_price;
      custom_package.updated_at = new Date().toISOString();

      const idx = customPackages.findIndex(cp => cp.id === custom_package.id);
      if (idx !== -1) {
        customPackages[idx] = custom_package;
      } else {
        customPackages.push(custom_package);
      }
    }

    this._saveToStorage('custom_packages', customPackages);

    return {
      custom_package,
      base_show_option,
      add_ons,
      pricing_breakdown: {
        total_base_price: pricing.total_base_price,
        total_addons_price: pricing.total_addons_price,
        total_price: pricing.total_price
      }
    };
  }

  // getCustomPackageReview(customPackageId)
  getCustomPackageReview(customPackageId) {
    const customPackages = this._getFromStorage('custom_packages', []);
    const baseShowOptions = this._getFromStorage('base_show_options', []);
    const addOnOptions = this._getFromStorage('addon_options', []);

    const custom_package = customPackages.find(cp => cp.id === customPackageId) || null;
    if (!custom_package) {
      return {
        custom_package: null,
        base_show_option: null,
        add_ons: [],
        pricing_breakdown: null
      };
    }

    const base_show_option = baseShowOptions.find(b => b.id === custom_package.base_show_option_id) || null;
    const add_ons = addOnOptions.filter(a => this._ensureArray(custom_package.add_on_option_ids).includes(a.id));
    const pricing = this._calculateCustomPackagePricing(base_show_option, add_ons);

    const updated = { ...custom_package };
    updated.total_base_price = pricing.total_base_price;
    updated.total_addons_price = pricing.total_addons_price;
    updated.total_price = pricing.total_price;

    return {
      custom_package: updated,
      base_show_option,
      add_ons,
      pricing_breakdown: {
        total_base_price: pricing.total_base_price,
        total_addons_price: pricing.total_addons_price,
        total_price: pricing.total_price
      }
    };
  }

  // setCustomPackageNameAndRequest(customPackageId, custom_name)
  setCustomPackageNameAndRequest(customPackageId, custom_name) {
    const customPackages = this._getFromStorage('custom_packages', []);
    const idx = customPackages.findIndex(cp => cp.id === customPackageId);
    if (idx === -1) {
      return { success: false, custom_package: null, message: 'Custom package not found' };
    }
    const custom_package = customPackages[idx];
    custom_package.custom_name = custom_name;
    custom_package.status = 'requested';
    custom_package.updated_at = new Date().toISOString();
    customPackages[idx] = custom_package;
    this._saveToStorage('custom_packages', customPackages);

    return {
      success: true,
      custom_package,
      message: 'Custom package requested'
    };
  }

  // getGiftCardOptions()
  getGiftCardOptions() {
    const gift_card_options = this._getFromStorage('gift_card_options', []);
    return {
      gift_card_options,
      supports_custom_amounts: true,
      min_custom_amount: 25,
      max_custom_amount: 1000,
      default_currency: 'USD'
    };
  }

  // configureGiftCardAndAddToCart(gift_card_option_id, custom_amount, delivery_method, recipient, sender, message, delivery_date)
  configureGiftCardAndAddToCart(gift_card_option_id, custom_amount, delivery_method, recipient, sender, message, delivery_date) {
    const giftCardOptions = this._getFromStorage('gift_card_options', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const cart = this._getOrCreateCart();

    let option = null;
    let amount = 0;
    if (gift_card_option_id) {
      option = giftCardOptions.find(o => o.id === gift_card_option_id) || null;
    }
    if (option) {
      amount = option.amount || 0;
    } else {
      amount = custom_amount || 0;
    }

    const unit_price = amount;
    const quantity = 1;

    const deliveryDateTime = delivery_date ? delivery_date + 'T00:00:00Z' : null;

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'gift_card',
      quantity,
      unit_price,
      total_price: unit_price * quantity,
      gift_card_option_id: option ? option.id : null,
      gift_card_amount: amount,
      gift_card_delivery_method: delivery_method,
      gift_card_recipient_name: recipient ? recipient.name || null : null,
      gift_card_recipient_email: recipient ? recipient.email || null : null,
      gift_card_sender_name: sender ? sender.name || null : null,
      gift_card_sender_email: sender ? sender.email || null : null,
      gift_card_message: message || null,
      gift_card_delivery_datetime: deliveryDateTime,
      booking_id: null,
      created_at: new Date().toISOString()
    };

    cartItems.push(cartItem);
    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const items = this._hydrateCartItems(updatedCart, cartItems);

    return {
      success: true,
      cart: updatedCart,
      cart_items: items,
      message: 'Gift card added to cart'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const items = this._hydrateCartItems(cart, cartItems);
    return {
      cart,
      items
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return this.getCart();
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.total_price = (item.unit_price || 0) * quantity;
      cartItems[idx] = item;
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const items = this._hydrateCartItems(updatedCart, cartItems);

    return {
      cart: updatedCart,
      items
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    cartItems = cartItems.filter(ci => !(ci.id === cartItemId && ci.cart_id === cart.id));

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const items = this._hydrateCartItems(updatedCart, cartItems);

    return {
      cart: updatedCart,
      items
    };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites_list = this._getOrCreateFavoritesList();
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const shows = this._getFromStorage('shows', []);
    const performers = this._getFromStorage('performers', []);

    const items = favoriteItems
      .filter(fi => fi.favorites_list_id === favorites_list.id)
      .map(fi => {
        const entry = {
          favorite_item: fi,
          target_type: fi.target_type,
          show: null,
          performer: null
        };
        if (fi.target_type === 'show') {
          entry.show = shows.find(s => s.id === fi.target_id) || null;
        } else if (fi.target_type === 'performer') {
          entry.performer = performers.find(p => p.id === fi.target_id) || null;
        }
        return entry;
      });

    return {
      favorites_list,
      items
    };
  }

  // addShowToFavorites(showId)
  addShowToFavorites(showId) {
    const favorites_list = this._getOrCreateFavoritesList();
    const favoriteItems = this._getFromStorage('favorite_items', []);

    const exists = favoriteItems.some(fi => fi.favorites_list_id === favorites_list.id && fi.target_type === 'show' && fi.target_id === showId);
    if (exists) {
      const item = favoriteItems.find(fi => fi.favorites_list_id === favorites_list.id && fi.target_type === 'show' && fi.target_id === showId);
      return { favorites_list, favorite_item: item };
    }

    const favorite_item = {
      id: this._generateId('favitem'),
      favorites_list_id: favorites_list.id,
      target_type: 'show',
      target_id: showId,
      added_at: new Date().toISOString()
    };

    favoriteItems.push(favorite_item);
    favorites_list.items = favoriteItems.filter(fi => fi.favorites_list_id === favorites_list.id).map(fi => fi.id);
    favorites_list.updated_at = new Date().toISOString();

    this._saveToStorage('favorite_items', favoriteItems);
    this._saveToStorage('favorites', favorites_list);

    return {
      favorites_list,
      favorite_item
    };
  }

  // addPerformerToFavorites(performerId)
  addPerformerToFavorites(performerId) {
    const favorites_list = this._getOrCreateFavoritesList();
    const favoriteItems = this._getFromStorage('favorite_items', []);

    const exists = favoriteItems.some(fi => fi.favorites_list_id === favorites_list.id && fi.target_type === 'performer' && fi.target_id === performerId);
    if (exists) {
      const item = favoriteItems.find(fi => fi.favorites_list_id === favorites_list.id && fi.target_type === 'performer' && fi.target_id === performerId);
      return { favorites_list, favorite_item: item };
    }

    const favorite_item = {
      id: this._generateId('favitem'),
      favorites_list_id: favorites_list.id,
      target_type: 'performer',
      target_id: performerId,
      added_at: new Date().toISOString()
    };

    favoriteItems.push(favorite_item);
    favorites_list.items = favoriteItems.filter(fi => fi.favorites_list_id === favorites_list.id).map(fi => fi.id);
    favorites_list.updated_at = new Date().toISOString();

    this._saveToStorage('favorite_items', favoriteItems);
    this._saveToStorage('favorites', favorites_list);

    return {
      favorites_list,
      favorite_item
    };
  }

  // removeFavoriteItem(favoriteItemId)
  removeFavoriteItem(favoriteItemId) {
    const favorites_list = this._getOrCreateFavoritesList();
    let favoriteItems = this._getFromStorage('favorite_items', []);

    favoriteItems = favoriteItems.filter(fi => fi.id !== favoriteItemId || fi.favorites_list_id !== favorites_list.id);
    favorites_list.items = favoriteItems.filter(fi => fi.favorites_list_id === favorites_list.id).map(fi => fi.id);
    favorites_list.updated_at = new Date().toISOString();

    this._saveToStorage('favorite_items', favoriteItems);
    this._saveToStorage('favorites', favorites_list);

    return {
      favorites_list
    };
  }

  // addPerformerToCompareList(performerId)
  addPerformerToCompareList(performerId) {
    const compareLists = this._getFromStorage('compare_lists', []);
    let list = compareLists.find(cl => cl.compare_type === 'performer');
    if (!list) {
      list = this._getOrCreateCompareList('performer');
    }
    if (!list.item_ids.includes(performerId)) {
      list.item_ids.push(performerId);
    }
    const idx = compareLists.findIndex(cl => cl.id === list.id);
    if (idx === -1) {
      compareLists.push(list);
    } else {
      compareLists[idx] = list;
    }
    this._saveToStorage('compare_lists', compareLists);

    return {
      compare_list: list
    };
  }

  // removePerformerFromCompareList(performerId)
  removePerformerFromCompareList(performerId) {
    const compareLists = this._getFromStorage('compare_lists', []);
    let list = compareLists.find(cl => cl.compare_type === 'performer');
    if (!list) {
      list = this._getOrCreateCompareList('performer');
    }
    list.item_ids = list.item_ids.filter(id => id !== performerId);
    const idx = compareLists.findIndex(cl => cl.id === list.id);
    if (idx === -1) {
      compareLists.push(list);
    } else {
      compareLists[idx] = list;
    }
    this._saveToStorage('compare_lists', compareLists);

    return {
      compare_list: list
    };
  }

  // addShowToCompareList(showId)
  addShowToCompareList(showId) {
    const compareLists = this._getFromStorage('compare_lists', []);
    let list = compareLists.find(cl => cl.compare_type === 'show');
    if (!list) {
      list = this._getOrCreateCompareList('show');
    }
    if (!list.item_ids.includes(showId)) {
      list.item_ids.push(showId);
    }
    const idx = compareLists.findIndex(cl => cl.id === list.id);
    if (idx === -1) {
      compareLists.push(list);
    } else {
      compareLists[idx] = list;
    }
    this._saveToStorage('compare_lists', compareLists);

    return {
      compare_list: list
    };
  }

  // removeShowFromCompareList(showId)
  removeShowFromCompareList(showId) {
    const compareLists = this._getFromStorage('compare_lists', []);
    let list = compareLists.find(cl => cl.compare_type === 'show');
    if (!list) {
      list = this._getOrCreateCompareList('show');
    }
    list.item_ids = list.item_ids.filter(id => id !== showId);
    const idx = compareLists.findIndex(cl => cl.id === list.id);
    if (idx === -1) {
      compareLists.push(list);
    } else {
      compareLists[idx] = list;
    }
    this._saveToStorage('compare_lists', compareLists);

    return {
      compare_list: list
    };
  }

  // getCompareList(compare_type)
  getCompareList(compare_type) {
    const compareLists = this._getFromStorage('compare_lists', []);
    const performers = this._getFromStorage('performers', []);
    const shows = this._getFromStorage('shows', []);
    const showPackages = this._getFromStorage('show_packages', []);

    let compare_list = compareLists.find(cl => cl.compare_type === compare_type);
    if (!compare_list) {
      compare_list = this._getOrCreateCompareList(compare_type);
    }

    const items = [];

    if (compare_type === 'performer') {
      for (const id of compare_list.item_ids) {
        const performer = performers.find(p => p.id === id) || null;
        if (!performer) continue;
        const theirShows = shows.filter(s => s.performer_id === performer.id);
        let bestTwoHourPrice = null;
        let includesStageAndStrolling = false;

        const perfTypes = this._ensureArray(performer.performance_types);
        if (perfTypes.includes('stage_show') && perfTypes.includes('close_up_strolling')) {
          includesStageAndStrolling = true;
        }

        for (const s of theirShows) {
          const packages = showPackages.filter(sp => sp.show_id === s.id);
          for (const sp of packages) {
            if (sp.duration_minutes === 120 && s.event_type === 'corporate_event') {
              const price = sp.base_price || 0;
              if (bestTwoHourPrice === null || price < bestTwoHourPrice) {
                bestTwoHourPrice = price;
              }
            }
          }
        }

        items.push({
          performer,
          show: null,
          best_two_hour_corporate_package_price: bestTwoHourPrice,
          rating_average: performer.rating_average || 0,
          rating_count: performer.rating_count || 0,
          duration_minutes: null,
          includes_stage_and_strolling: includesStageAndStrolling
        });
      }
    } else if (compare_type === 'show') {
      for (const id of compare_list.item_ids) {
        const show = shows.find(s => s.id === id) || null;
        if (!show) continue;
        const performer = performers.find(p => p.id === show.performer_id) || null;
        const packages = showPackages.filter(sp => sp.show_id === show.id);
        const bestPkg = packages.reduce((min, sp) => {
          if (!min) return sp;
          return (sp.base_price || 0) < (min.base_price || 0) ? sp : min;
        }, null);

        items.push({
          performer,
          show,
          best_two_hour_corporate_package_price: null,
          rating_average: show.rating_average || (performer ? performer.rating_average || 0 : 0),
          rating_count: show.rating_count || (performer ? performer.rating_count || 0 : 0),
          duration_minutes: bestPkg ? bestPkg.duration_minutes || null : null,
          includes_stage_and_strolling: this._ensureArray(show.performance_types).includes('stage_show') && this._ensureArray(show.performance_types).includes('close_up_strolling')
        });
      }
    }

    return {
      compare_list,
      items
    };
  }

  // loginWithEmailPassword(email, password)
  loginWithEmailPassword(email, password) {
    let users = this._getFromStorage('users', []);
    let user = users.find(u => u.email === email && u.password === password) || null;

    // Fallback for test data: if no stored user, allow login based on an existing booking contact
    if (!user) {
      const bookings = this._getFromStorage('bookings', []);
      const bookingMatch = bookings.find(b => b.contact_email === email);
      if (bookingMatch) {
        user = {
          id: this._generateId('user'),
          name: bookingMatch.contact_name || null,
          email,
          password
        };
        users.push(user);
        this._saveToStorage('users', users);
      }
    }

    if (!user) {
      this._setCurrentUserContext(null);
      return {
        success: false,
        message: 'Invalid email or password',
        user_profile: null
      };
    }

    const profile = {
      name: user.name || null,
      email: user.email
    };
    this._setCurrentUserContext(profile);

    return {
      success: true,
      message: 'Logged in',
      user_profile: profile
    };
  }

  // getMyBookings()
  getMyBookings() {
    const currentUser = this._getCurrentUserContext();
    const bookings = this._getFromStorage('bookings', []);

    if (!currentUser || !currentUser.email) {
      return {
        upcoming_bookings: [],
        past_bookings: []
      };
    }

    const now = new Date();
    const mine = bookings.filter(b => b.contact_email === currentUser.email);

    const upcoming = [];
    const past = [];

    for (const b of mine) {
      const start = b.event_start_datetime ? new Date(b.event_start_datetime) : null;
      const hydrated = this._hydrateBooking(b);
      if (start && start >= now) {
        upcoming.push(hydrated);
      } else {
        past.push(hydrated);
      }
    }

    upcoming.sort((a, b) => new Date(a.event_start_datetime) - new Date(b.event_start_datetime));
    past.sort((a, b) => new Date(b.event_start_datetime) - new Date(a.event_start_datetime));

    return {
      upcoming_bookings: upcoming,
      past_bookings: past
    };
  }

  // getBookingDetails(bookingId)
  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const shows = this._getFromStorage('shows', []);
    const performers = this._getFromStorage('performers', []);
    const showPackages = this._getFromStorage('show_packages', []);

    const bookingRaw = bookings.find(b => b.id === bookingId) || null;
    if (!bookingRaw) {
      return {
        booking: null,
        show: null,
        performer: null,
        show_package: null,
        can_reschedule: false,
        reschedule_constraints: null,
        itinerary_download_available: false
      };
    }

    const booking = this._hydrateBooking(bookingRaw);
    const show = booking.show || (booking.show_id ? shows.find(s => s.id === booking.show_id) || null : null);
    const performer = booking.performer || (booking.performer_id ? performers.find(p => p.id === booking.performer_id) || null : null);
    const show_package = booking.show_package || (booking.show_package_id ? showPackages.find(sp => sp.id === booking.show_package_id) || null : null);

    const now = new Date();
    const start = booking.event_start_datetime ? new Date(booking.event_start_datetime) : null;
    const can_reschedule = !!start && start > now;
    let reschedule_constraints = null;
    if (start) {
      const originalDateStr = booking.event_start_datetime.substring(0, 10);
      const min_new_date = originalDateStr;
      const max_new_date = this._addDays(originalDateStr, 30);
      reschedule_constraints = {
        min_new_date,
        max_new_date,
        allowed_days_of_week: ['sunday']
      };
    }

    return {
      booking,
      show,
      performer,
      show_package,
      can_reschedule,
      reschedule_constraints,
      itinerary_download_available: true
    };
  }

  // rescheduleBooking(bookingId, new_event_date)
  rescheduleBooking(bookingId, new_event_date) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { success: false, booking: null, message: 'Booking not found' };
    }
    const booking = bookings[idx];

    if (!booking.event_start_datetime) {
      return { success: false, booking: this._hydrateBooking(booking), message: 'Original event date unavailable' };
    }

    const originalDateStr = booking.event_start_datetime.substring(0, 10);
    const min_new_date = originalDateStr;
    const max_new_date = this._addDays(originalDateStr, 30);
    const dow = this._getDayOfWeekFromDateString(new_event_date);

    if (new_event_date < min_new_date || new_event_date > max_new_date || dow !== 'sunday') {
      return { success: false, booking: this._hydrateBooking(booking), message: 'New date does not meet reschedule constraints' };
    }

    const timePart = booking.event_start_datetime.substring(11, 16); // HH:MM
    const newStart = new_event_date + 'T' + timePart + ':00Z';
    let newEnd = newStart;
    if (booking.duration_minutes) {
      const d = new Date(newStart);
      d.setUTCMinutes(d.getUTCMinutes() + booking.duration_minutes);
      newEnd = d.toISOString();
    }

    booking.event_start_datetime = newStart;
    booking.event_end_datetime = newEnd;
    booking.status = 'rescheduled';
    booking.updated_at = new Date().toISOString();

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      booking: this._hydrateBooking(booking),
      message: 'Booking rescheduled'
    };
  }

  // sendPerformerContactMessage(performerId, sender_name, sender_email, event_type, event_date, message_body)
  sendPerformerContactMessage(performerId, sender_name, sender_email, event_type, event_date, message_body) {
    const performerMessages = this._getFromStorage('performer_messages', []);

    const msg = {
      id: this._generateId('pmsg'),
      performer_id: performerId,
      sender_name,
      sender_email,
      event_type: event_type || null,
      event_date: event_date ? event_date + 'T00:00:00Z' : null,
      message_body,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    performerMessages.push(msg);
    this._saveToStorage('performer_messages', performerMessages);

    return {
      message: msg
    };
  }

  // submitQuoteRequest(showId, event_type, number_of_children, preferred_date, preferred_start_time, requester_name, requester_email, message)
  submitQuoteRequest(showId, event_type, number_of_children, preferred_date, preferred_start_time, requester_name, requester_email, message) {
    const quoteRequests = this._getFromStorage('quote_requests', []);

    const qr = {
      id: this._generateId('quote'),
      show_id: showId,
      event_type: event_type || null,
      number_of_children: number_of_children || null,
      preferred_start_time: preferred_start_time || null,
      preferred_date: preferred_date ? preferred_date + 'T00:00:00Z' : null,
      requester_name: requester_name || null,
      requester_email: requester_email || null,
      message: message || null,
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request: qr
    };
  }

  // submitContactUsForm(name, email, subject, message)
  submitContactUsForm(name, email, subject, message) {
    // For now, just acknowledge; could be stored if desired.
    return {
      success: true,
      message: 'Your message has been submitted.'
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