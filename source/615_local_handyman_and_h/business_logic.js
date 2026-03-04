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

  _initStorage() {
    // Arrays
    const arrayKeys = [
      'service_categories',
      'standard_services',
      'service_options',
      'providers',
      'provider_availability_slots',
      'handyman_tasks',
      'bookings',
      'booking_task_items',
      'coupons',
      'saved_coupons',
      'applied_coupons',
      'cart_items',
      'favorite_items',
      'quote_requests',
      'quote_preferred_time_slots',
      'support_requests'
    ];
    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singletons / optional objects
    const objectOrNullKeys = [
      'cart',
      'account_profile',
      'notification_settings',
      'auth_account',
      'current_account_profile_id',
      'help_center_content',
      'about_content',
      'terms_and_privacy_content'
    ];
    objectOrNullKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, 'null');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null && typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
      return parsed;
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem('idCounter');
    const current = currentRaw ? parseInt(currentRaw, 10) : 1000;
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

  // ----------------- Helper Functions -----------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        cart_item_ids: [],
        subtotal: 0,
        total: 0,
        currency: 'USD',
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    const cartItems = allCartItems || this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((ci) => {
      subtotal += Number(ci.line_total || 0);
    });
    cart.subtotal = subtotal;
    cart.total = subtotal;
    cart.updated_at = this._now();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
  }

  _getCurrentAccountProfile() {
    return this._getFromStorage('account_profile', null);
  }

  _filterAndSortProviders(providers, filters, sort_by) {
    const f = filters || {};
    let list = providers.slice();

    if (f.service_category_key) {
      list = list.filter((p) => p.service_category_key === f.service_category_key);
    }
    if (f.zip_code) {
      list = list.filter((p) => !p.base_zip || p.base_zip === f.zip_code);
    }
    if (typeof f.distance_miles === 'number') {
      list = list.filter((p) => {
        if (typeof p.distance_from_search_miles === 'number') {
          return p.distance_from_search_miles <= f.distance_miles;
        }
        return true;
      });
    }
    if (typeof f.min_rating === 'number') {
      list = list.filter((p) => (p.average_rating || 0) >= f.min_rating);
    }
    if (typeof f.max_hourly_rate === 'number') {
      list = list.filter((p) => {
        if (typeof p.hourly_rate === 'number') {
          return p.hourly_rate <= f.max_hourly_rate;
        }
        return true;
      });
    }

    const sortKey = sort_by || 'best_match';
    if (sortKey === 'price_low_to_high') {
      list.sort((a, b) => {
        const pa = typeof a.hourly_rate === 'number' ? a.hourly_rate : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.hourly_rate === 'number' ? b.hourly_rate : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    } else if (sortKey === 'rating_high_to_low') {
      list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortKey === 'distance') {
      list.sort((a, b) => {
        const da = typeof a.distance_from_search_miles === 'number' ? a.distance_from_search_miles : Number.MAX_SAFE_INTEGER;
        const db = typeof b.distance_from_search_miles === 'number' ? b.distance_from_search_miles : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else {
      // best_match / relevance: simple heuristic by rating then reviews
      list.sort((a, b) => {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        if (br !== ar) return br - ar;
        const ac = a.rating_count || 0;
        const bc = b.rating_count || 0;
        return bc - ac;
      });
    }

    return list;
  }

  _validateBookingRescheduleWindow(booking, new_start_datetime, new_end_datetime) {
    if (!booking || !booking.scheduled_start) {
      return { success: false, message: 'invalid_booking' };
    }
    const oldStart = new Date(booking.scheduled_start);
    const newStart = new Date(new_start_datetime);
    const newEnd = new Date(new_end_datetime);

    if (isNaN(oldStart.getTime()) || isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return { success: false, message: 'invalid_datetime' };
    }

    // Require at least 3 calendar days later (compare dates only)
    const minNew = new Date(oldStart.getTime());
    minNew.setDate(minNew.getDate() + 3);
    minNew.setHours(0, 0, 0, 0);
    const newStartDateOnly = new Date(newStart.getFullYear(), newStart.getMonth(), newStart.getDate());
    if (newStartDateOnly < minNew) {
      return { success: false, message: 'must_be_at_least_3_days_later' };
    }

    // Require afternoon (after 1 PM, using UTC to avoid timezone issues)
    if (newStart.getUTCHours() < 13) {
      return { success: false, message: 'must_be_afternoon_after_1pm' };
    }

    if (newEnd <= newStart) {
      return { success: false, message: 'end_must_be_after_start' };
    }

    return { success: true, message: 'ok' };
  }

  _assignHandymanProviderForTasks(handymanTaskIds, scheduled_date, location_zip) {
    const providers = this._getFromStorage('providers', []);
    // Prefer dedicated handyman providers, then general_home_repairs
    let candidates = providers.filter((p) => p.is_active !== false && (p.service_category_key === 'handyman' || p.service_category_key === 'general_home_repairs'));

    if (location_zip) {
      const exactZip = candidates.filter((p) => p.base_zip === location_zip);
      if (exactZip.length > 0) {
        candidates = exactZip;
      }
    }

    // Sort by rating descending
    candidates.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

    return candidates.length > 0 ? candidates[0] : null;
  }

  _applyCouponLogic(booking, coupon) {
    if (!booking || !coupon) {
      return { success: false, discountAmount: 0, message: 'invalid_booking_or_coupon' };
    }

    if (coupon.status !== 'active') {
      return { success: false, discountAmount: 0, message: 'coupon_not_active' };
    }

    const now = new Date();
    if (coupon.valid_from) {
      const vf = new Date(coupon.valid_from);
      if (!isNaN(vf.getTime()) && now < vf) {
        return { success: false, discountAmount: 0, message: 'coupon_not_yet_valid' };
      }
    }
    if (coupon.valid_to) {
      const vt = new Date(coupon.valid_to);
      if (!isNaN(vt.getTime()) && now > vt) {
        return { success: false, discountAmount: 0, message: 'coupon_expired' };
      }
    }

    // Category / service applicability
    const categoryKeys = coupon.applicable_service_category_keys || [];
    const serviceIds = coupon.applicable_standard_service_ids || [];

    const categoryOk = !categoryKeys.length || (booking.service_category_key && categoryKeys.indexOf(booking.service_category_key) !== -1);
    const serviceOk = !serviceIds.length || (booking.standard_service_id && serviceIds.indexOf(booking.standard_service_id) !== -1);

    if (!categoryOk && !serviceOk) {
      return { success: false, discountAmount: 0, message: 'coupon_not_applicable_to_booking' };
    }

    // New customer check
    if (coupon.is_new_customer_only) {
      // In this simplified implementation we do not track bookings per account,
      // so we treat every booking as eligible for new-customer coupons.
    }

    const baseAmount = typeof booking.subtotal_price === 'number'
      ? booking.subtotal_price
      : typeof booking.total_price === 'number'
        ? booking.total_price
        : 0;

    if (baseAmount <= 0) {
      return { success: false, discountAmount: 0, message: 'no_amount_to_discount' };
    }

    if (typeof coupon.min_order_total === 'number' && baseAmount < coupon.min_order_total) {
      return { success: false, discountAmount: 0, message: 'booking_below_min_total' };
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = baseAmount * (coupon.discount_value / 100);
    } else if (coupon.discount_type === 'fixed_amount') {
      discount = coupon.discount_value;
    }

    if (typeof coupon.max_discount_amount === 'number' && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }

    if (discount > baseAmount) {
      discount = baseAmount;
    }

    return { success: true, discountAmount: discount, message: 'coupon_applied' };
  }

  _formatTimeDisplay(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const mm = minutes < 10 ? '0' + minutes : String(minutes);
    return hours + ':' + mm + ' ' + ampm;
  }

  _attachBookingRelationsArray(bookings) {
    const providers = this._getFromStorage('providers', []);
    const services = this._getFromStorage('standard_services', []);
    return bookings.map((b) => {
      const provider = b.provider_id ? providers.find((p) => p.id === b.provider_id) || null : null;
      const standardService = b.standard_service_id ? services.find((s) => s.id === b.standard_service_id) || null : null;
      return Object.assign({}, b, {
        provider: provider,
        standard_service: standardService
      });
    });
  }

  // ----------------- Interface Implementations -----------------

  // 1. getServiceCategoriesForNavigation
  getServiceCategoriesForNavigation() {
    const categories = this._getFromStorage('service_categories', []);
    return categories.filter((c) => c.is_active !== false);
  }

  // 2. getHomePageSummary
  getHomePageSummary() {
    const service_categories = this.getServiceCategoriesForNavigation();
    const allServices = this._getFromStorage('standard_services', []);
    const popular_services = allServices
      .filter((s) => s.is_active !== false)
      .sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0))
      .slice(0, 6);

    const allCoupons = this._getFromStorage('coupons', []);
    const featured_coupons = allCoupons
      .filter((c) => c.status === 'active')
      .slice(0, 5);

    const profile = this._getCurrentAccountProfile();
    const has_account_profile = !!profile;

    const allBookings = this._getFromStorage('bookings', []);
    const now = new Date();
    const upcoming_booking_count = allBookings.filter((b) => {
      if (!b.scheduled_start) return false;
      const d = new Date(b.scheduled_start);
      if (isNaN(d.getTime())) return false;
      return d >= now && b.status && b.status !== 'cancelled' && b.status !== 'completed';
    }).length;

    const cart = this._getFromStorage('cart', null);
    const cart_item_count = cart && Array.isArray(cart.cart_item_ids) ? cart.cart_item_ids.length : 0;

    const favorites = this._getFromStorage('favorite_items', []);
    const favorites_count = favorites.length;

    return {
      service_categories: service_categories,
      popular_services: popular_services,
      featured_coupons: featured_coupons,
      has_account_profile: has_account_profile,
      upcoming_booking_count: upcoming_booking_count,
      cart_item_count: cart_item_count,
      favorites_count: favorites_count
    };
  }

  // 3. searchServicesAndProviders
  searchServicesAndProviders(query, filters, sort_by, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const sortKey = sort_by || 'relevance';
    const pg = page || 1;
    const ps = page_size || 20;

    const providers = this._getFromStorage('providers', []).filter((p) => p.is_active !== false);
    const services = this._getFromStorage('standard_services', []).filter((s) => s.is_active !== false);
    const categories = this._getFromStorage('service_categories', []);
    const favorites = this._getFromStorage('favorite_items', []);

    let providerMatches = providers.filter((p) => {
      if (!q) return true;
      const nameMatch = p.name && p.name.toLowerCase().indexOf(q) !== -1;
      const specialtyMatch = Array.isArray(p.specialties)
        ? p.specialties.some((sp) => sp && sp.toLowerCase().indexOf(q) !== -1)
        : false;
      return nameMatch || specialtyMatch;
    });

    providerMatches = this._filterAndSortProviders(providerMatches, {
      service_category_key: f.service_category_key,
      zip_code: f.zip_code,
      distance_miles: f.distance_miles,
      min_rating: f.min_rating,
      max_hourly_rate: typeof f.max_price === 'number' ? f.max_price : undefined
    }, sortKey === 'price_low_to_high' ? 'price_low_to_high' : sortKey === 'distance' ? 'distance' : sortKey === 'rating_high_to_low' ? 'rating_high_to_low' : 'best_match');

    let serviceMatches = services.filter((s) => {
      if (f.service_category_key && s.service_category_key !== f.service_category_key) {
        return false;
      }
      if (!q) return true;
      const nameMatch = s.name && s.name.toLowerCase().indexOf(q) !== -1;
      const descMatch = s.description && s.description.toLowerCase().indexOf(q) !== -1;
      return nameMatch || descMatch;
    });

    if (typeof f.min_price === 'number' || typeof f.max_price === 'number') {
      serviceMatches = serviceMatches.filter((s) => {
        const base = typeof s.base_price === 'number' ? s.base_price : (typeof s.price_from === 'number' ? s.price_from : 0);
        if (typeof f.min_price === 'number' && base < f.min_price) return false;
        if (typeof f.max_price === 'number' && base > f.max_price) return false;
        return true;
      });
    }

    if (sortKey === 'price_low_to_high') {
      serviceMatches.sort((a, b) => {
        const pa = typeof a.base_price === 'number' ? a.base_price : (typeof a.price_from === 'number' ? a.price_from : Number.MAX_SAFE_INTEGER);
        const pb = typeof b.base_price === 'number' ? b.base_price : (typeof b.price_from === 'number' ? b.price_from : Number.MAX_SAFE_INTEGER);
        return pa - pb;
      });
    } else if (sortKey === 'rating_high_to_low') {
      serviceMatches.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    const total_providers = providerMatches.length;
    const total_standard_services = serviceMatches.length;

    const providerSlice = providerMatches.slice((pg - 1) * ps, (pg - 1) * ps + ps);
    const serviceSlice = serviceMatches.slice((pg - 1) * ps, (pg - 1) * ps + ps);

    const providerResults = providerSlice.map((p) => {
      const cat = categories.find((c) => c.key === p.service_category_key);
      const isFav = favorites.some((fItem) => fItem.item_type === 'provider' && fItem.provider_id === p.id);
      return {
        provider: p,
        category_name: cat ? cat.name : null,
        distance_miles: typeof p.distance_from_search_miles === 'number' ? p.distance_from_search_miles : null,
        is_favorited: isFav
      };
    });

    const serviceResults = serviceSlice.map((s) => {
      const cat = categories.find((c) => c.key === s.service_category_key);
      return {
        standard_service: s,
        category_name: cat ? cat.name : null
      };
    });

    return {
      providers: providerResults,
      standard_services: serviceResults,
      total_providers: total_providers,
      total_standard_services: total_standard_services
    };
  }

  // 4. getCategoryFilterOptions
  getCategoryFilterOptions(service_category_key) {
    const providers = this._getFromStorage('providers', []).filter((p) => p.service_category_key === service_category_key);
    const hasHourly = providers.some((p) => typeof p.hourly_rate === 'number');
    let minRate = null;
    let maxRate = null;
    providers.forEach((p) => {
      if (typeof p.hourly_rate === 'number') {
        if (minRate === null || p.hourly_rate < minRate) minRate = p.hourly_rate;
        if (maxRate === null || p.hourly_rate > maxRate) maxRate = p.hourly_rate;
      }
    });

    const rating_options = [
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const distance_options = [
      { miles: 5, label: 'Within 5 miles' },
      { miles: 10, label: 'Within 10 miles' },
      { miles: 25, label: 'Within 25 miles' }
    ];

    const sort_options = [
      { key: 'best_match', label: 'Best match' },
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'rating_high_to_low', label: 'Rating: High to Low' },
      { key: 'distance', label: 'Distance' }
    ];

    return {
      rating_options: rating_options,
      price_filters: {
        supports_hourly_rate: hasHourly,
        min_hourly_rate: minRate,
        max_hourly_rate: maxRate
      },
      distance_options: distance_options,
      sort_options: sort_options
    };
  }

  // 5. getCategoryListing
  getCategoryListing(service_category_key, zip_code, distance_miles, min_rating, max_hourly_rate, sort_by, page, page_size) {
    const sortKey = sort_by || 'best_match';
    const pg = page || 1;
    const ps = page_size || 20;

    const providersAll = this._getFromStorage('providers', []).filter((p) => p.is_active !== false && p.service_category_key === service_category_key);
    const categories = this._getFromStorage('service_categories', []);
    const favorites = this._getFromStorage('favorite_items', []);

    const providersFiltered = this._filterAndSortProviders(providersAll, {
      service_category_key: service_category_key,
      zip_code: zip_code,
      distance_miles: distance_miles,
      min_rating: min_rating,
      max_hourly_rate: max_hourly_rate
    }, sortKey);

    const total_providers = providersFiltered.length;
    const providerSlice = providersFiltered.slice((pg - 1) * ps, (pg - 1) * ps + ps);

    const providerResults = providerSlice.map((p) => {
      const cat = categories.find((c) => c.key === p.service_category_key);
      const isFav = favorites.some((fItem) => fItem.item_type === 'provider' && fItem.provider_id === p.id);
      return {
        provider: p,
        category_name: cat ? cat.name : null,
        distance_miles: typeof p.distance_from_search_miles === 'number' ? p.distance_from_search_miles : null,
        display_hourly_rate: typeof p.hourly_rate === 'number' ? p.hourly_rate : null,
        is_favorited: isFav
      };
    });

    const servicesAll = this._getFromStorage('standard_services', []).filter((s) => s.is_active !== false && s.service_category_key === service_category_key);
    const servicesSorted = servicesAll.slice().sort((a, b) => {
      const pa = typeof a.base_price === 'number' ? a.base_price : (typeof a.price_from === 'number' ? a.price_from : Number.MAX_SAFE_INTEGER);
      const pb = typeof b.base_price === 'number' ? b.base_price : (typeof b.price_from === 'number' ? b.price_from : Number.MAX_SAFE_INTEGER);
      return pa - pb;
    });

    const total_standard_services = servicesSorted.length;
    const serviceSlice = servicesSorted.slice(0, ps); // usually only a few standard services per category

    const serviceResults = serviceSlice.map((s) => {
      const cat = categories.find((c) => c.key === s.service_category_key);
      const starting_price = typeof s.price_from === 'number' ? s.price_from : (typeof s.base_price === 'number' ? s.base_price : null);
      return {
        standard_service: s,
        category_name: cat ? cat.name : null,
        starting_price: starting_price
      };
    });

    return {
      providers: providerResults,
      standard_services: serviceResults,
      total_providers: total_providers,
      total_standard_services: total_standard_services
    };
  }

  // 6. getProviderDetail
  getProviderDetail(providerId) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId) || null;
    if (!provider) {
      return {
        provider: null,
        service_category_name: null,
        specialties_display: [],
        distance_miles: null,
        display_hourly_rate: null,
        display_minimum_charge: null,
        rating_breakdown: {
          average_rating: null,
          rating_count: null,
          five_star_review_count: null
        },
        is_favorited: false
      };
    }

    const categories = this._getFromStorage('service_categories', []);
    const cat = categories.find((c) => c.key === provider.service_category_key);
    const favorites = this._getFromStorage('favorite_items', []);
    const isFav = favorites.some((fItem) => fItem.item_type === 'provider' && fItem.provider_id === provider.id);

    return {
      provider: provider,
      service_category_name: cat ? cat.name : null,
      specialties_display: Array.isArray(provider.specialties) ? provider.specialties : [],
      distance_miles: typeof provider.distance_from_search_miles === 'number' ? provider.distance_from_search_miles : null,
      display_hourly_rate: typeof provider.hourly_rate === 'number' ? provider.hourly_rate : null,
      display_minimum_charge: typeof provider.minimum_charge === 'number' ? provider.minimum_charge : null,
      rating_breakdown: {
        average_rating: provider.average_rating || 0,
        rating_count: provider.rating_count || 0,
        five_star_review_count: provider.five_star_review_count || 0
      },
      is_favorited: isFav
    };
  }

  // 7. getProviderAvailabilitySlots
  getProviderAvailabilitySlots(providerId, start_date, end_date) {
    const slots = this._getFromStorage('provider_availability_slots', []);
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId) || null;

    const result = slots
      .filter((s) => s.provider_id === providerId && s.is_booked === false)
      .filter((s) => {
        if (!s.start_datetime) return false;
        const dStr = s.start_datetime.substring(0, 10);
        return (!start_date || dStr >= start_date) && (!end_date || dStr <= end_date);
      })
      .map((s) => {
        const slotWithRelations = Object.assign({}, s, {
          provider: provider
        });
        return {
          slot: slotWithRelations,
          display_start_time: this._formatTimeDisplay(s.start_datetime),
          display_end_time: this._formatTimeDisplay(s.end_datetime)
        };
      });

    return result;
  }

  // 8. createProviderBooking
  createProviderBooking(providerId, service_category_key, title, location_zip, problem_description, start_datetime, end_datetime) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId) || null;

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'provider_booking',
      service_category_key: service_category_key,
      standard_service_id: null,
      provider_id: providerId,
      title: title || (provider ? provider.name + ' visit' : 'Provider visit'),
      problem_description: problem_description || null,
      location_zip: location_zip || null,
      scheduled_start: start_datetime,
      scheduled_end: end_datetime,
      status: 'pending',
      subtotal_price: null,
      discount_total: 0,
      total_price: null,
      created_at: this._now(),
      updated_at: this._now()
    };

    // Compute simple price from hourly_rate if available
    if (provider && typeof provider.hourly_rate === 'number') {
      const start = new Date(start_datetime);
      const end = new Date(end_datetime);
      const hours = !isNaN(start.getTime()) && !isNaN(end.getTime()) ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 0;
      let price = provider.hourly_rate * (hours > 0 ? hours : 1);
      if (typeof provider.minimum_charge === 'number' && price < provider.minimum_charge) {
        price = provider.minimum_charge;
      }
      booking.subtotal_price = price;
      booking.total_price = price;
    }

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    // Mark matching availability slot as booked if exists
    const slots = this._getFromStorage('provider_availability_slots', []);
    let changed = false;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].provider_id === providerId && slots[i].start_datetime === start_datetime && slots[i].end_datetime === end_datetime) {
        slots[i].is_booked = true;
        changed = true;
        break;
      }
    }
    if (changed) {
      this._saveToStorage('provider_availability_slots', slots);
    }

    return {
      booking: booking,
      provider: provider,
      success: true,
      message: 'booking_created'
    };
  }

  // 9. addFavoriteProvider
  addFavoriteProvider(providerId) {
    const favorites = this._getFromStorage('favorite_items', []);
    const existing = favorites.find((f) => f.item_type === 'provider' && f.provider_id === providerId);
    if (existing) {
      return {
        favorite_item: existing,
        success: true
      };
    }
    const favorite = {
      id: this._generateId('fav'),
      item_type: 'provider',
      provider_id: providerId,
      standard_service_id: null,
      created_at: this._now()
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_items', favorites);
    return {
      favorite_item: favorite,
      success: true
    };
  }

  // 10. removeFavoriteItem
  removeFavoriteItem(favoriteItemId) {
    const favorites = this._getFromStorage('favorite_items', []);
    const newFavorites = favorites.filter((f) => f.id !== favoriteItemId);
    const success = newFavorites.length !== favorites.length;
    this._saveToStorage('favorite_items', newFavorites);
    return { success: success };
  }

  // 11. getFavorites (with foreign key resolution)
  getFavorites() {
    const favorites = this._getFromStorage('favorite_items', []);
    const providers = this._getFromStorage('providers', []);
    const services = this._getFromStorage('standard_services', []);

    const items = favorites.map((fav) => {
      const provider = fav.provider_id ? providers.find((p) => p.id === fav.provider_id) || null : null;
      const standardService = fav.standard_service_id ? services.find((s) => s.id === fav.standard_service_id) || null : null;
      return {
        favorite: fav,
        provider: provider,
        standard_service: standardService
      };
    });

    return { items: items };
  }

  // 12. getStandardServiceDetail
  getStandardServiceDetail(standardServiceId) {
    const services = this._getFromStorage('standard_services', []);
    const service = services.find((s) => s.id === standardServiceId) || null;
    const categories = this._getFromStorage('service_categories', []);
    const optionsAll = this._getFromStorage('service_options', []);

    if (!service) {
      return {
        standard_service: null,
        service_category_name: null,
        pricing_unit_label: null,
        service_options: [],
        is_cart_addable: false,
        supports_coupons: false,
        applicable_coupons: [],
        average_rating: null,
        rating_count: null
      };
    }

    const cat = categories.find((c) => c.key === service.service_category_key);
    const pricing_unit_label = service.pricing_unit === 'per_hour'
      ? 'Per hour'
      : service.pricing_unit === 'per_visit'
        ? 'Per visit'
        : 'Per task';

    const service_options = optionsAll
      .filter((o) => o.standard_service_id === standardServiceId && o.is_active !== false)
      .map((o) => Object.assign({}, o, { standard_service: service }));

    const applicableCoupons = this.getApplicableCouponsForService(standardServiceId).coupons;

    return {
      standard_service: service,
      service_category_name: cat ? cat.name : null,
      pricing_unit_label: pricing_unit_label,
      service_options: service_options,
      is_cart_addable: !!service.is_cart_addable,
      supports_coupons: !!service.supports_coupons,
      applicable_coupons: applicableCoupons,
      average_rating: service.average_rating || 0,
      rating_count: service.rating_count || 0
    };
  }

  // 13. getApplicableCouponsForService
  getApplicableCouponsForService(standardServiceId) {
    const services = this._getFromStorage('standard_services', []);
    const service = services.find((s) => s.id === standardServiceId) || null;
    const coupons = this._getFromStorage('coupons', []);
    const saved = this._getFromStorage('saved_coupons', []);
    const now = new Date();

    if (!service) {
      return { coupons: [] };
    }

    const list = coupons.filter((c) => {
      if (c.status !== 'active') return false;
      if (c.valid_from) {
        const vf = new Date(c.valid_from);
        if (!isNaN(vf.getTime()) && now < vf) return false;
      }
      if (c.valid_to) {
        const vt = new Date(c.valid_to);
        if (!isNaN(vt.getTime()) && now > vt) return false;
      }
      const catKeys = c.applicable_service_category_keys || [];
      const svcIds = c.applicable_standard_service_ids || [];
      const categoryOk = !catKeys.length || catKeys.indexOf(service.service_category_key) !== -1;
      const serviceOk = !svcIds.length || svcIds.indexOf(service.id) !== -1;
      return categoryOk && serviceOk;
    });

    const result = list.map((coupon) => {
      const is_saved = saved.some((sc) => sc.coupon_id === coupon.id);
      return { coupon: coupon, is_saved: is_saved };
    });

    return { coupons: result };
  }

  // 14. addStandardServiceToCart
  addStandardServiceToCart(standardServiceId, serviceOptionId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const services = this._getFromStorage('standard_services', []);
    const options = this._getFromStorage('service_options', []);

    const service = services.find((s) => s.id === standardServiceId) || null;
    if (!service) {
      return { cart: null, added_item: null, success: false };
    }

    let option = null;
    if (serviceOptionId) {
      option = options.find((o) => o.id === serviceOptionId && o.standard_service_id === standardServiceId) || null;
    }
    if (!option) {
      option = options.find((o) => o.standard_service_id === standardServiceId && o.is_default) || options.find((o) => o.standard_service_id === standardServiceId) || null;
    }

    const unit_price = option && typeof option.price === 'number' ? option.price : (typeof service.base_price === 'number' ? service.base_price : 0);
    const line_total = unit_price * qty;
    const cart = this._getOrCreateCart();

    const cartItems = this._getFromStorage('cart_items', []);
    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      standard_service_id: standardServiceId,
      service_option_id: option ? option.id : null,
      service_name: service.name,
      option_name: option ? option.name : null,
      duration_hours: option ? option.duration_hours : null,
      unit_price: unit_price,
      quantity: qty,
      line_total: line_total,
      added_at: this._now()
    };
    cartItems.push(item);
    if (!Array.isArray(cart.cart_item_ids)) {
      cart.cart_item_ids = [];
    }
    cart.cart_item_ids.push(item.id);

    this._recalculateCartTotals(cart, cartItems);

    return { cart: cart, added_item: item, success: true };
  }

  // 15. getCart (with foreign key resolution)
  getCart() {
    const cart = this._getFromStorage('cart', null);
    const allItems = this._getFromStorage('cart_items', []);
    const services = this._getFromStorage('standard_services', []);
    const options = this._getFromStorage('service_options', []);

    if (!cart) {
      return { cart: null, items: [] };
    }

    const items = allItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => {
        const standardService = services.find((s) => s.id === ci.standard_service_id) || null;
        const serviceOption = ci.service_option_id ? options.find((o) => o.id === ci.service_option_id) || null : null;
        const cartObj = cart;
        const itemClone = Object.assign({}, ci, {
          cart: cartObj,
          standard_service: standardService,
          service_option: serviceOption
        });
        return itemClone;
      });

    return { cart: cart, items: items };
  }

  // 16. updateCartItem
  updateCartItem(cartItemId, quantity, serviceOptionId) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    const services = this._getFromStorage('standard_services', []);
    const options = this._getFromStorage('service_options', []);

    const item = cartItems.find((ci) => ci.id === cartItemId) || null;
    if (!cart || !item) {
      return { cart: cart, updated_item: null, success: false };
    }

    if (typeof quantity === 'number' && quantity > 0) {
      item.quantity = quantity;
    }

    if (serviceOptionId) {
      const option = options.find((o) => o.id === serviceOptionId && o.standard_service_id === item.standard_service_id) || null;
      if (option) {
        item.service_option_id = option.id;
        item.option_name = option.name;
        item.duration_hours = option.duration_hours;
        item.unit_price = option.price;
      }
    }

    item.line_total = (item.unit_price || 0) * (item.quantity || 1);

    this._recalculateCartTotals(cart, cartItems);

    return { cart: cart, updated_item: item, success: true };
  }

  // 17. removeCartItem
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    if (!cart) {
      return { cart: null, success: false };
    }
    const newItems = cartItems.filter((ci) => ci.id !== cartItemId);
    const success = newItems.length !== cartItems.length;

    if (Array.isArray(cart.cart_item_ids)) {
      cart.cart_item_ids = cart.cart_item_ids.filter((id) => id !== cartItemId);
    }

    this._saveToStorage('cart_items', newItems);
    this._recalculateCartTotals(cart, newItems);

    return { cart: cart, success: success };
  }

  // 18. checkoutCartToBookings
  checkoutCartToBookings() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    const services = this._getFromStorage('standard_services', []);
    if (!cart) {
      return { created_bookings: [], cart_cleared: false, success: false };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const bookings = this._getFromStorage('bookings', []);
    const created_bookings = [];

    const now = this._now();

    itemsForCart.forEach((ci) => {
      const service = services.find((s) => s.id === ci.standard_service_id) || null;
      const booking = {
        id: this._generateId('booking'),
        booking_type: 'standard_service_booking',
        service_category_key: service ? service.service_category_key : 'general_home_repairs',
        standard_service_id: service ? service.id : null,
        provider_id: null,
        title: ci.service_name,
        problem_description: null,
        location_zip: null,
        scheduled_start: now,
        scheduled_end: now,
        status: 'pending',
        subtotal_price: ci.line_total,
        discount_total: 0,
        total_price: ci.line_total,
        created_at: now,
        updated_at: now
      };
      bookings.push(booking);
      created_bookings.push(booking);
    });

    this._saveToStorage('bookings', bookings);

    // Clear cart
    const remainingItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingItems);
    const newCart = {
      id: cart.id,
      cart_item_ids: [],
      subtotal: 0,
      total: 0,
      currency: cart.currency,
      created_at: cart.created_at,
      updated_at: this._now()
    };
    this._saveToStorage('cart', newCart);

    return { created_bookings: created_bookings, cart_cleared: true, success: true };
  }

  // 19. getHandymanTasks
  getHandymanTasks(only_small_tasks) {
    const onlySmall = typeof only_small_tasks === 'boolean' ? only_small_tasks : true;
    const tasks = this._getFromStorage('handyman_tasks', []);
    return tasks.filter((t) => t.is_active !== false && (!onlySmall || t.is_small_task));
  }

  // 20. calculateHandymanMultiTaskEstimate
  calculateHandymanMultiTaskEstimate(handymanTaskIds) {
    const ids = Array.isArray(handymanTaskIds) ? handymanTaskIds : [];
    const tasks = this._getFromStorage('handyman_tasks', []);

    let totalPrice = 0;
    let totalDuration = 0;
    const task_breakdown = [];

    ids.forEach((id) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        const price = task.estimated_price || 0;
        const dur = task.estimated_duration_hours || 0;
        totalPrice += price;
        totalDuration += dur;
        task_breakdown.push({
          task: task,
          estimated_price: price,
          estimated_duration_hours: dur
        });
      }
    });

    return {
      total_estimated_price: totalPrice,
      total_estimated_duration_hours: totalDuration,
      task_breakdown: task_breakdown
    };
  }

  // 21. createHandymanMultiTaskBooking
  createHandymanMultiTaskBooking(handymanTaskIds, scheduled_date, start_time, end_time, location_zip, notes) {
    const ids = Array.isArray(handymanTaskIds) ? handymanTaskIds : [];
    const tasksEntities = this._getFromStorage('handyman_tasks', []);
    const estimate = this.calculateHandymanMultiTaskEstimate(ids);

    const startIso = scheduled_date + 'T' + start_time + ':00';
    const endIso = scheduled_date + 'T' + end_time + ':00';

    const provider = this._assignHandymanProviderForTasks(ids, scheduled_date, location_zip);

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'handyman_multi_task_booking',
      service_category_key: provider ? provider.service_category_key : 'handyman',
      standard_service_id: null,
      provider_id: provider ? provider.id : null,
      title: 'Handyman - ' + ids.length + ' Tasks',
      problem_description: notes || null,
      location_zip: location_zip || null,
      scheduled_start: startIso,
      scheduled_end: endIso,
      status: 'pending',
      subtotal_price: estimate.total_estimated_price,
      discount_total: 0,
      total_price: estimate.total_estimated_price,
      created_at: this._now(),
      updated_at: this._now()
    };

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const booking_task_items = this._getFromStorage('booking_task_items', []);
    const items = [];
    ids.forEach((id, index) => {
      const task = tasksEntities.find((t) => t.id === id);
      if (task) {
        const item = {
          id: this._generateId('booking_task'),
          booking_id: booking.id,
          handyman_task_id: task.id,
          task_name: task.name,
          estimated_price: task.estimated_price || 0,
          estimated_duration_hours: task.estimated_duration_hours || 0,
          sort_order: index
        };
        booking_task_items.push(item);
        items.push(item);
      }
    });
    this._saveToStorage('booking_task_items', booking_task_items);

    return {
      booking: booking,
      tasks: items,
      success: true
    };
  }

  // 22. createStandardServiceBookingDraft
  createStandardServiceBookingDraft(standardServiceId, serviceOptionId, location_zip, problem_description, requested_start_datetime) {
    const services = this._getFromStorage('standard_services', []);
    const options = this._getFromStorage('service_options', []);
    const service = services.find((s) => s.id === standardServiceId) || null;
    if (!service) {
      return { booking: null, selected_service_option: null };
    }

    let option = null;
    if (serviceOptionId) {
      option = options.find((o) => o.id === serviceOptionId && o.standard_service_id === standardServiceId) || null;
    }
    if (!option) {
      option = options.find((o) => o.standard_service_id === standardServiceId && o.is_default) || options.find((o) => o.standard_service_id === standardServiceId) || null;
    }

    const price = option ? option.price : (typeof service.base_price === 'number' ? service.base_price : 0);
    const start = requested_start_datetime || this._now();
    const end = start;

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'standard_service_booking',
      service_category_key: service.service_category_key,
      standard_service_id: service.id,
      provider_id: null,
      title: service.name,
      problem_description: problem_description || null,
      location_zip: location_zip || null,
      scheduled_start: start,
      scheduled_end: end,
      status: 'pending',
      subtotal_price: price,
      discount_total: 0,
      total_price: price,
      created_at: this._now(),
      updated_at: this._now()
    };

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      booking: booking,
      selected_service_option: option
    };
  }

  // 23. updateStandardServiceBookingOption
  updateStandardServiceBookingOption(bookingId, serviceOptionId) {
    const bookings = this._getFromStorage('bookings', []);
    const options = this._getFromStorage('service_options', []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return { booking: null, selected_service_option: null };
    }

    const option = options.find((o) => o.id === serviceOptionId && o.standard_service_id === booking.standard_service_id) || null;
    if (!option) {
      return { booking: booking, selected_service_option: null };
    }

    booking.subtotal_price = option.price;
    booking.discount_total = 0;
    booking.total_price = option.price;
    booking.updated_at = this._now();

    this._saveToStorage('bookings', bookings);

    return { booking: booking, selected_service_option: option };
  }

  // 24. getSavedCoupons (with foreign key resolution)
  getSavedCoupons() {
    const saved = this._getFromStorage('saved_coupons', []);
    const coupons = this._getFromStorage('coupons', []);

    const result = saved.map((sc) => {
      const coupon = coupons.find((c) => c.id === sc.coupon_id) || null;
      const savedCouponClone = Object.assign({}, sc, {
        coupon: coupon
      });
      return {
        saved_coupon: savedCouponClone,
        coupon: coupon
      };
    });

    return { coupons: result };
  }

  // 25. applyCouponToBooking
  applyCouponToBooking(bookingId, couponId) {
    const bookings = this._getFromStorage('bookings', []);
    const coupons = this._getFromStorage('coupons', []);
    const savedCoupons = this._getFromStorage('saved_coupons', []);
    const appliedCoupons = this._getFromStorage('applied_coupons', []);

    const booking = bookings.find((b) => b.id === bookingId) || null;
    const coupon = coupons.find((c) => c.id === couponId) || null;

    if (!booking || !coupon) {
      return {
        booking: booking,
        applied_coupon: null,
        success: false,
        message: 'booking_or_coupon_not_found'
      };
    }

    const logic = this._applyCouponLogic(booking, coupon);
    if (!logic.success) {
      return {
        booking: booking,
        applied_coupon: null,
        success: false,
        message: logic.message
      };
    }

    booking.discount_total = logic.discountAmount;
    booking.total_price = (booking.subtotal_price || 0) - logic.discountAmount;
    if (booking.total_price < 0) booking.total_price = 0;
    booking.updated_at = this._now();

    const applied = {
      id: this._generateId('applied_coupon'),
      booking_id: booking.id,
      coupon_id: coupon.id,
      description: coupon.name || 'Coupon',
      discount_amount: logic.discountAmount
    };
    appliedCoupons.push(applied);

    // Mark saved coupon as applied if exists
    savedCoupons.forEach((sc) => {
      if (sc.coupon_id === coupon.id) {
        sc.is_applied = true;
      }
    });

    this._saveToStorage('bookings', bookings);
    this._saveToStorage('applied_coupons', appliedCoupons);
    this._saveToStorage('saved_coupons', savedCoupons);

    return {
      booking: booking,
      applied_coupon: applied,
      success: true,
      message: 'coupon_applied'
    };
  }

  // 26. confirmBooking
  confirmBooking(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return { booking: null, success: false, message: 'booking_not_found' };
    }
    booking.status = 'confirmed';
    booking.updated_at = this._now();
    this._saveToStorage('bookings', bookings);
    return { booking: booking, success: true, message: 'booking_confirmed' };
  }

  // 27. signUpAccount
  signUpAccount(first_name, last_name, email, password) {
    const profile = {
      id: this._generateId('acct'),
      first_name: first_name,
      last_name: last_name,
      email: email,
      created_at: this._now()
    };
    this._saveToStorage('account_profile', profile);

    const authAccount = {
      email: email,
      password: password,
      profile_id: profile.id
    };
    this._saveToStorage('auth_account', authAccount);
    this._saveToStorage('current_account_profile_id', profile.id);

    // Initialize notification settings if not present
    let settings = this._getFromStorage('notification_settings', null);
    if (!settings) {
      settings = {
        id: this._generateId('notif'),
        email_notifications_enabled: false,
        sms_notifications_enabled: false,
        preferred_neighborhood: null,
        updated_at: this._now()
      };
      this._saveToStorage('notification_settings', settings);
    }

    return { profile: profile, success: true };
  }

  // 28. loginAccount
  loginAccount(email, password) {
    const authAccount = this._getFromStorage('auth_account', null);
    const profile = this._getFromStorage('account_profile', null);

    if (!authAccount || !profile || authAccount.email !== email || authAccount.password !== password) {
      return {
        profile: null,
        success: false,
        message: 'invalid_credentials'
      };
    }

    this._saveToStorage('current_account_profile_id', profile.id);
    return {
      profile: profile,
      success: true,
      message: 'login_successful'
    };
  }

  // 29. getAccountDashboardSummary (with booking foreign key resolution)
  getAccountDashboardSummary() {
    const profile = this._getCurrentAccountProfile();
    let notification_settings = this._getFromStorage('notification_settings', null);
    if (!notification_settings) {
      notification_settings = {
        id: this._generateId('notif'),
        email_notifications_enabled: false,
        sms_notifications_enabled: false,
        preferred_neighborhood: null,
        updated_at: this._now()
      };
      this._saveToStorage('notification_settings', notification_settings);
    }

    const bookingsAll = this._getFromStorage('bookings', []);
    const now = new Date();
    const upcomingRaw = bookingsAll.filter((b) => {
      if (!b.scheduled_start) return false;
      const d = new Date(b.scheduled_start);
      if (isNaN(d.getTime())) return false;
      return d >= now && b.status && b.status !== 'cancelled' && b.status !== 'completed';
    });
    const pastRaw = bookingsAll.filter((b) => {
      if (!b.scheduled_start) return false;
      const d = new Date(b.scheduled_start);
      if (isNaN(d.getTime())) return false;
      return d < now;
    }).slice(-10);

    const upcoming_bookings = this._attachBookingRelationsArray(upcomingRaw);
    const recent_bookings = this._attachBookingRelationsArray(pastRaw);

    const saved_coupons = this._getFromStorage('saved_coupons', []);
    const favorites = this._getFromStorage('favorite_items', []);
    const cart = this._getFromStorage('cart', null);
    const cart_item_count = cart && Array.isArray(cart.cart_item_ids) ? cart.cart_item_ids.length : 0;

    return {
      profile: profile,
      notification_settings: notification_settings,
      upcoming_bookings: upcoming_bookings,
      recent_bookings: recent_bookings,
      saved_coupons_count: saved_coupons.length,
      favorites_count: favorites.length,
      cart_item_count: cart_item_count
    };
  }

  // 30. getNotificationSettings
  getNotificationSettings() {
    let settings = this._getFromStorage('notification_settings', null);
    if (!settings) {
      settings = {
        id: this._generateId('notif'),
        email_notifications_enabled: false,
        sms_notifications_enabled: false,
        preferred_neighborhood: null,
        updated_at: this._now()
      };
      this._saveToStorage('notification_settings', settings);
    }
    return settings;
  }

  // 31. updateNotificationSettings
  updateNotificationSettings(email_notifications_enabled, sms_notifications_enabled, preferred_neighborhood) {
    let settings = this._getFromStorage('notification_settings', null);
    if (!settings) {
      settings = {
        id: this._generateId('notif'),
        email_notifications_enabled: !!email_notifications_enabled,
        sms_notifications_enabled: !!sms_notifications_enabled,
        preferred_neighborhood: preferred_neighborhood || null,
        updated_at: this._now()
      };
    } else {
      settings.email_notifications_enabled = !!email_notifications_enabled;
      settings.sms_notifications_enabled = !!sms_notifications_enabled;
      settings.preferred_neighborhood = preferred_neighborhood || null;
      settings.updated_at = this._now();
    }
    this._saveToStorage('notification_settings', settings);
    return { settings: settings, success: true };
  }

  // 32. getMyBookings (with foreign key resolution)
  getMyBookings(scope) {
    const all = this._getFromStorage('bookings', []);
    const now = new Date();

    const upcomingRaw = all.filter((b) => {
      if (!b.scheduled_start) return false;
      const d = new Date(b.scheduled_start);
      if (isNaN(d.getTime())) return false;
      return d >= now && b.status && b.status !== 'cancelled' && b.status !== 'completed';
    });

    const pastRaw = all.filter((b) => {
      if (!b.scheduled_start) return false;
      const d = new Date(b.scheduled_start);
      if (isNaN(d.getTime())) return false;
      return d < now;
    });

    const scopeVal = scope || 'all';
    let upcoming = [];
    let past = [];

    if (scopeVal === 'upcoming') {
      upcoming = this._attachBookingRelationsArray(upcomingRaw);
      past = [];
    } else if (scopeVal === 'past') {
      upcoming = [];
      past = this._attachBookingRelationsArray(pastRaw);
    } else {
      upcoming = this._attachBookingRelationsArray(upcomingRaw);
      past = this._attachBookingRelationsArray(pastRaw);
    }

    return {
      upcoming: upcoming,
      past: past
    };
  }

  // 33. getBookingDetail (with foreign key resolution)
  getBookingDetail(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const providers = this._getFromStorage('providers', []);
    const services = this._getFromStorage('standard_services', []);
    const booking_task_items = this._getFromStorage('booking_task_items', []);
    const handyman_tasks = this._getFromStorage('handyman_tasks', []);
    const applied_coupons = this._getFromStorage('applied_coupons', []);
    const coupons = this._getFromStorage('coupons', []);

    const bookingRaw = bookings.find((b) => b.id === bookingId) || null;
    if (!bookingRaw) {
      return {
        booking: null,
        provider: null,
        standard_service: null,
        tasks: [],
        applied_coupons: []
      };
    }

    const provider = bookingRaw.provider_id ? providers.find((p) => p.id === bookingRaw.provider_id) || null : null;
    const standardService = bookingRaw.standard_service_id ? services.find((s) => s.id === bookingRaw.standard_service_id) || null : null;

    const booking = Object.assign({}, bookingRaw, {
      provider: provider,
      standard_service: standardService
    });

    const taskItems = booking_task_items
      .filter((ti) => ti.booking_id === bookingId)
      .map((ti) => {
        const ht = handyman_tasks.find((t) => t.id === ti.handyman_task_id) || null;
        return Object.assign({}, ti, {
          booking: booking,
          handyman_task: ht
        });
      });

    const applied = applied_coupons
      .filter((ac) => ac.booking_id === bookingId)
      .map((ac) => {
        const coupon = coupons.find((c) => c.id === ac.coupon_id) || null;
        return Object.assign({}, ac, {
          booking: booking,
          coupon: coupon
        });
      });

    return {
      booking: booking,
      provider: provider,
      standard_service: standardService,
      tasks: taskItems,
      applied_coupons: applied
    };
  }

  // 34. rescheduleBooking
  rescheduleBooking(bookingId, new_start_datetime, new_end_datetime) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return { booking: null, success: false, message: 'booking_not_found' };
    }

    const validation = this._validateBookingRescheduleWindow(booking, new_start_datetime, new_end_datetime);
    if (!validation.success) {
      return { booking: booking, success: false, message: validation.message };
    }

    booking.scheduled_start = new_start_datetime;
    booking.scheduled_end = new_end_datetime;
    booking.status = 'rescheduled';
    booking.updated_at = this._now();
    this._saveToStorage('bookings', bookings);

    return { booking: booking, success: true, message: 'booking_rescheduled' };
  }

  // 35. getActiveCoupons
  getActiveCoupons(service_category_key, min_discount_percentage, is_new_customer_only) {
    const coupons = this._getFromStorage('coupons', []);
    const saved = this._getFromStorage('saved_coupons', []);
    const categories = this._getFromStorage('service_categories', []);
    const now = new Date();

    const list = coupons.filter((c) => {
      if (c.status !== 'active') return false;
      if (typeof is_new_customer_only === 'boolean' && c.is_new_customer_only !== is_new_customer_only) return false;
      if (c.valid_from) {
        const vf = new Date(c.valid_from);
        if (!isNaN(vf.getTime()) && now < vf) return false;
      }
      if (c.valid_to) {
        const vt = new Date(c.valid_to);
        if (!isNaN(vt.getTime()) && now > vt) return false;
      }
      if (service_category_key) {
        const keys = c.applicable_service_category_keys || [];
        if (keys.length && keys.indexOf(service_category_key) === -1) return false;
      }
      if (typeof min_discount_percentage === 'number') {
        if (c.discount_type === 'percentage') {
          if (c.discount_value < min_discount_percentage) return false;
        } else {
          // For fixed_amount, approximate by requiring discount_value >= min_discount_percentage
          if (c.discount_value < min_discount_percentage) return false;
        }
      }
      return true;
    });

    const result = list.map((c) => {
      const is_saved = saved.some((sc) => sc.coupon_id === c.id);
      const names = (c.applicable_service_category_keys || []).map((k) => {
        const cat = categories.find((cat) => cat.key === k);
        return cat ? cat.name : k;
      });
      return {
        coupon: c,
        is_saved: is_saved,
        service_category_names: names
      };
    });

    return result;
  }

  // 36. getCouponDetail
  getCouponDetail(couponId) {
    const coupons = this._getFromStorage('coupons', []);
    const coupon = coupons.find((c) => c.id === couponId) || null;
    return coupon;
  }

  // 37. saveCouponToAccount
  saveCouponToAccount(couponId) {
    const coupons = this._getFromStorage('coupons', []);
    const coupon = coupons.find((c) => c.id === couponId) || null;
    if (!coupon) {
      return { saved_coupon: null, success: false };
    }
    const saved = this._getFromStorage('saved_coupons', []);
    const existing = saved.find((sc) => sc.coupon_id === couponId);
    if (existing) {
      return { saved_coupon: existing, success: true };
    }
    const savedCoupon = {
      id: this._generateId('saved_coupon'),
      coupon_id: couponId,
      saved_at: this._now(),
      is_applied: false
    };
    saved.push(savedCoupon);
    this._saveToStorage('saved_coupons', saved);
    return { saved_coupon: savedCoupon, success: true };
  }

  // 38. createQuoteRequest
  createQuoteRequest(service_category_key, area_description, square_footage, budget_max, location_zip, preferred_time_slots, contact_name, contact_email) {
    const quote_requests = this._getFromStorage('quote_requests', []);
    const quote_time_slots = this._getFromStorage('quote_preferred_time_slots', []);

    const quote = {
      id: this._generateId('quote'),
      service_category_key: service_category_key,
      area_description: area_description,
      square_footage: square_footage,
      budget_max: budget_max,
      location_zip: location_zip || null,
      preferred_time_slot_ids: [],
      contact_name: contact_name,
      contact_email: contact_email,
      status: 'submitted',
      created_at: this._now()
    };

    const createdSlots = [];
    const pts = Array.isArray(preferred_time_slots) ? preferred_time_slots : [];
    pts.forEach((ts) => {
      if (!ts || !ts.start_datetime || !ts.end_datetime) return;
      const slot = {
        id: this._generateId('quote_slot'),
        quote_request_id: quote.id,
        start_datetime: ts.start_datetime,
        end_datetime: ts.end_datetime
      };
      quote_time_slots.push(slot);
      createdSlots.push(slot);
      quote.preferred_time_slot_ids.push(slot.id);
    });

    quote_requests.push(quote);
    this._saveToStorage('quote_requests', quote_requests);
    this._saveToStorage('quote_preferred_time_slots', quote_time_slots);

    return {
      quote_request: quote,
      preferred_time_slots: createdSlots
    };
  }

  // 39. getHelpCenterContent
  getHelpCenterContent() {
    let content = this._getFromStorage('help_center_content', null);
    if (!content) {
      content = {
        topics: [
          {
            id: 'billing',
            title: 'Billing and payments',
            body: 'Learn how we charge for services, apply coupons, and handle refunds.'
          },
          {
            id: 'booking',
            title: 'Bookings and scheduling',
            body: 'Information on creating, rescheduling, and cancelling appointments.'
          }
        ],
        faq_sections: [
          {
            title: 'Billing',
            faqs: [
              {
                question: 'Why is my charge higher than the estimate?',
                answer: 'Final charges may differ if the actual work took longer or required additional materials. Contact support with your booking for a detailed breakdown.'
              }
            ]
          },
          {
            title: 'Bookings',
            faqs: [
              {
                question: 'How do I reschedule an appointment?',
                answer: 'You can reschedule from the My Bookings page by selecting an upcoming appointment and choosing a new time.'
              }
            ]
          }
        ]
      };
      this._saveToStorage('help_center_content', content);
    }
    return content;
  }

  // 40. createSupportRequest
  createSupportRequest(topic, bookingId, message, contact_name, contact_email, preferred_contact_method) {
    const support_requests = this._getFromStorage('support_requests', []);
    const request = {
      id: this._generateId('support'),
      topic: topic,
      booking_id: bookingId || null,
      message: message,
      contact_name: contact_name,
      contact_email: contact_email,
      preferred_contact_method: preferred_contact_method || 'email',
      status: 'open',
      created_at: this._now()
    };
    support_requests.push(request);
    this._saveToStorage('support_requests', support_requests);
    return { support_request: request, success: true };
  }

  // 41. getAboutContent
  getAboutContent() {
    let about = this._getFromStorage('about_content', null);
    if (!about) {
      about = {
        heading: 'About Our Local Handyman and Home Repair Services',
        body: 'We connect homeowners with trusted local professionals for plumbing, electrical, painting, and general handyman work. Our platform is designed to make booking and managing home repairs simple and transparent.',
        service_areas: ['Downtown', 'Midtown', 'Uptown', 'Suburbs'],
        highlights: [
          'Vetted local providers with ratings and reviews',
          'Transparent pricing and estimates',
          'Easy online booking and rescheduling'
        ]
      };
      this._saveToStorage('about_content', about);
    }
    return about;
  }

  // 42. getTermsAndPrivacyContent
  getTermsAndPrivacyContent() {
    let content = this._getFromStorage('terms_and_privacy_content', null);
    if (!content) {
      content = {
        terms_html: '<h1>Terms & Conditions</h1><p>Use of this service is subject to our standard terms and conditions for scheduling and completing home repair services.</p>',
        privacy_html: '<h1>Privacy Policy</h1><p>We respect your privacy and only use your information to manage bookings, payments, and service-related communication.</p>',
        last_updated: this._now()
      };
      this._saveToStorage('terms_and_privacy_content', content);
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
