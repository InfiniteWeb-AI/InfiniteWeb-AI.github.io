const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

// Ensure localStorage is available on the global object (for Node.js tests)
if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
  globalThis.localStorage = localStorage;
}

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------
  // Storage helpers
  // ---------------------

  _initStorage() {
    const arrayKeys = [
      'categories',
      'places',
      'service_providers',
      'class_activities',
      'events',
      'deals',
      'saved_lists',
      'saved_list_items',
      'saved_deals',
      'place_reviews',
      'event_rsvps',
      'emergency_service_requests',
      'business_contact_messages',
      'site_info_pages',
      'site_contact_messages'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('user_settings')) {
      const defaultSettings = {
        defaultLocation: {
          postal_code: null,
          source: 'none'
        }
      };
      localStorage.setItem('user_settings', JSON.stringify(defaultSettings));
    }

    if (!localStorage.getItem('site_support_contact')) {
      const defaultSupport = {
        support_email: null,
        support_phone: null
      };
      localStorage.setItem('site_support_contact', JSON.stringify(defaultSupport));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof fallback !== 'undefined' ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof fallback !== 'undefined' ? fallback : [];
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

  // ---------------------
  // Internal helpers
  // ---------------------

  _getOrCreateUserSettings() {
    let settings = this._getFromStorage('user_settings', null);
    if (!settings || typeof settings !== 'object') {
      settings = {
        defaultLocation: {
          postal_code: null,
          source: 'none'
        }
      };
      this._saveToStorage('user_settings', settings);
    } else if (!settings.defaultLocation) {
      settings.defaultLocation = {
        postal_code: null,
        source: 'none'
      };
      this._saveToStorage('user_settings', settings);
    }
    return settings;
  }

  _persistUserSettings(settings) {
    this._saveToStorage('user_settings', settings || {});
  }

  _getOrCreateSavedListsStore() {
    const saved_lists = this._getFromStorage('saved_lists', []);
    const saved_list_items = this._getFromStorage('saved_list_items', []);
    if (!Array.isArray(saved_lists)) {
      this._saveToStorage('saved_lists', []);
    }
    if (!Array.isArray(saved_list_items)) {
      this._saveToStorage('saved_list_items', []);
    }
    return {
      saved_lists: Array.isArray(saved_lists) ? saved_lists : [],
      saved_list_items: Array.isArray(saved_list_items) ? saved_list_items : []
    };
  }

  _getOrCreateSavedDealsStore() {
    const saved_deals = this._getFromStorage('saved_deals', []);
    if (!Array.isArray(saved_deals)) {
      this._saveToStorage('saved_deals', []);
      return [];
    }
    return saved_deals;
  }

  _normalizeAndValidateFilters(options) {
    const normalized = Object.assign({}, options || {});
    if (normalized.page == null || normalized.page < 1) {
      normalized.page = 1;
    }
    if (normalized.page_size == null || normalized.page_size < 1) {
      normalized.page_size = 20;
    }
    return normalized;
  }

  _priceLevelOrder(value) {
    const order = {
      low: 1,
      medium: 2,
      high: 3,
      premium: 4
    };
    return order[value] || 999;
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    // timeStr may be 'HH:MM' or ISO string
    const isoMatch = timeStr.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/);
    let hours;
    let minutes;
    if (isoMatch) {
      hours = parseInt(isoMatch[1], 10);
      minutes = parseInt(isoMatch[2], 10);
    } else {
      const parts = timeStr.split(':');
      if (parts.length < 2) return null;
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10) || 0;
    }
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  _isPlaceOpenAt(place, isoDatetime) {
    if (!place || !place.opening_hours || !isoDatetime) return true;
    let date;
    try {
      date = new Date(isoDatetime);
      if (isNaN(date.getTime())) return true;
    } catch (e) {
      return true;
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    const minutes = date.getHours() * 60 + date.getMinutes();

    const hoursForDay = place.opening_hours.find(function (h) {
      if (!h || !h.day_of_week) return false;
      return String(h.day_of_week).toLowerCase() === String(dayName).toLowerCase();
    });
    if (!hoursForDay || hoursForDay.is_closed) return false;

    const openMinutes = this._parseTimeToMinutes(hoursForDay.open_time);
    const closeMinutes = this._parseTimeToMinutes(hoursForDay.close_time);
    if (openMinutes == null || closeMinutes == null) return true;

    if (closeMinutes > openMinutes) {
      // Same-day close
      return minutes >= openMinutes && minutes <= closeMinutes;
    }
    // Cross-midnight close
    return minutes >= openMinutes || minutes <= closeMinutes;
  }

  _getSavedFlagForPlace(placeId) {
    const saved_list_items = this._getFromStorage('saved_list_items', []);
    return saved_list_items.some(function (item) {
      return item.item_type === 'place' && item.item_ref_id === placeId;
    });
  }

  _getSavedFlagForType(itemType, refId) {
    const saved_list_items = this._getFromStorage('saved_list_items', []);
    return saved_list_items.some(function (item) {
      return item.item_type === itemType && item.item_ref_id === refId;
    });
  }

  _resolveSavedListItemSummary(savedItem) {
    if (!savedItem) return null;
    const type = savedItem.item_type;
    const refId = savedItem.item_ref_id;

    if (type === 'place') {
      const places = this._getFromStorage('places', []);
      const place = places.find(function (p) { return p.id === refId; }) || null;
      if (!place) return null;
      let priceIndicator = '';
      if (place.average_price_per_person != null) {
        priceIndicator = '~$' + place.average_price_per_person + ' per person';
      } else if (place.price_level) {
        const priceMap = { low: '$', medium: '$$', high: '$$$', premium: '$$$$' };
        priceIndicator = priceMap[place.price_level] || '';
      }
      return {
        name: place.name,
        result_type: 'place',
        category_code: place.category_code,
        subcategory: place.subcategory || null,
        average_rating: place.average_rating || null,
        price_indicator: priceIndicator
      };
    }

    if (type === 'class_activity') {
      const classes = this._getFromStorage('class_activities', []);
      const c = classes.find(function (a) { return a.id === refId; }) || null;
      if (!c) return null;
      return {
        name: c.title,
        result_type: 'class_activity',
        category_code: c.category_code,
        subcategory: c.subcategory || null,
        average_rating: c.average_rating || null,
        price_indicator: '$' + c.price + ' class'
      };
    }

    if (type === 'event') {
      const events = this._getFromStorage('events', []);
      const e = events.find(function (ev) { return ev.id === refId; }) || null;
      if (!e) return null;
      const priceIndicator = e.is_free ? 'Free' : (e.price != null ? '$' + e.price : '');
      return {
        name: e.title,
        result_type: 'event',
        category_code: e.category_code,
        subcategory: e.subcategory || null,
        average_rating: null,
        price_indicator: priceIndicator
      };
    }

    if (type === 'deal') {
      const deals = this._getFromStorage('deals', []);
      const d = deals.find(function (de) { return de.id === refId; }) || null;
      if (!d) return null;
      return {
        name: d.title,
        result_type: 'deal',
        category_code: d.category_code,
        subcategory: d.subcategory || null,
        average_rating: d.average_rating || null,
        price_indicator: '$' + d.deal_price + ' deal'
      };
    }

    if (type === 'service_provider') {
      const providers = this._getFromStorage('service_providers', []);
      const s = providers.find(function (sp) { return sp.id === refId; }) || null;
      if (!s) return null;
      return {
        name: s.name,
        result_type: 'service_provider',
        category_code: s.category_code,
        subcategory: s.service_subcategory || null,
        average_rating: s.average_rating || null,
        price_indicator: ''
      };
    }

    return null;
  }

  // ---------------------
  // Interface: getMainCategories
  // ---------------------

  getMainCategories() {
    // Just return categories from storage (no seeding/mocking)
    const categories = this._getFromStorage('categories', []);
    return Array.isArray(categories) ? categories : [];
  }

  // ---------------------
  // Interface: getDefaultLocation / setDefaultLocation
  // ---------------------

  getDefaultLocation() {
    const settings = this._getOrCreateUserSettings();
    const dl = settings.defaultLocation || { postal_code: null, source: 'none' };
    return {
      postal_code: dl.postal_code || null,
      source: dl.source || 'none'
    };
  }

  setDefaultLocation(postal_code) {
    const settings = this._getOrCreateUserSettings();
    settings.defaultLocation = {
      postal_code: postal_code || null,
      source: 'user_set'
    };
    this._persistUserSettings(settings);
    return {
      success: true,
      postal_code: postal_code || null,
      message: 'Default location updated.'
    };
  }

  // ---------------------
  // Interface: getHomeHighlights
  // ---------------------

  getHomeHighlights() {
    const places = this._getFromStorage('places', []);
    const events = this._getFromStorage('events', []);
    const deals = this._getFromStorage('deals', []);

    // Top rated affordable restaurants: rating >= 4.0, avg price <= 30
    const topRestaurants = places
      .filter(function (p) {
        return p.category_code === 'restaurants' &&
          (p.average_rating || 0) >= 4.0 &&
          (p.average_price_per_person != null && p.average_price_per_person <= 30);
      })
      .sort(function (a, b) {
        const ra = a.average_rating || 0;
        const rb = b.average_rating || 0;
        if (rb !== ra) return rb - ra;
        const pa = a.average_price_per_person != null ? a.average_price_per_person : Number.MAX_SAFE_INTEGER;
        const pb = b.average_price_per_person != null ? b.average_price_per_person : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      })
      .slice(0, 10)
      .map(function (p) {
        return {
          place: p,
          highlight_reason: 'top_rated_under_$30'
        };
      });

    const now = new Date();
    const upcomingFamilyEvents = events
      .filter(function (e) {
        if (e.category_code !== 'events') return false;
        if (e.subcategory && e.subcategory !== 'family_and_kids') return false;
        const start = new Date(e.start_datetime);
        return !isNaN(start.getTime()) && start >= now;
      })
      .sort(function (a, b) {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        return pb - pa;
      })
      .slice(0, 10);

    const trendingDeals = deals
      .filter(function (d) {
        return d.category_code === 'deals' && (d.is_active !== false);
      })
      .sort(function (a, b) {
        const da = a.discount_percentage || 0;
        const db = b.discount_percentage || 0;
        return db - da;
      })
      .slice(0, 10);

    return {
      top_rated_affordable_restaurants: topRestaurants,
      upcoming_family_events: upcomingFamilyEvents,
      trending_deals: trendingDeals
    };
  }

  // ---------------------
  // Interface: getPlaceFilterOptions
  // ---------------------

  getPlaceFilterOptions(category_code, subcategory) {
    // Basic static meta-options; no domain data mocking
    const cuisine_types = [];
    if (category_code === 'restaurants') {
      cuisine_types.push(
        { code: 'italian', label: 'Italian' },
        { code: 'vegetarian', label: 'Vegetarian' },
        { code: 'japanese', label: 'Japanese' }
      );
    }

    const amenities = [
      { code: 'free_wifi', label: 'Free Wi-Fi' },
      { code: 'power_outlets', label: 'Power outlets' }
    ];

    const suitability = [
      { code: 'good_for_working', label: 'Good for working' }
    ];

    const attributes = [
      { code: 'handmade_items', label: 'Handmade items' },
      { code: 'artisan', label: 'Artisan' }
    ];

    const service_features = [
      { code: 'emergency_service', label: 'Emergency service' },
      { code: 'open_24_7', label: 'Open 24/7' }
    ];

    const rating_options = [3.0, 4.0, 4.5, 5.0];

    const price_level_options = [
      { value: 'low', label: '$' },
      { value: 'medium', label: '$$' },
      { value: 'high', label: '$$$' },
      { value: 'premium', label: '$$$$' }
    ];

    const radius_options = [
      { value: 2, label: 'Within 2 miles' },
      { value: 3, label: 'Within 3 miles' },
      { value: 5, label: 'Within 5 miles' },
      { value: 8, label: 'Within 8 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 15, label: 'Within 15 miles' }
    ];

    const sort_options = [
      { code: 'rating_high_to_low', label: 'Rating (high to low)' },
      { code: 'average_price_low_to_high', label: 'Average price (low to high)' },
      { code: 'distance_nearest_first', label: 'Distance (nearest first)' },
      { code: 'most_popular', label: 'Most popular' },
      { code: 'price_level_low_to_high', label: 'Price level (low to high)' }
    ];

    return {
      cuisine_types: cuisine_types,
      amenities: amenities,
      suitability: suitability,
      attributes: attributes,
      service_features: service_features,
      rating_options: rating_options,
      price_level_options: price_level_options,
      radius_options: radius_options,
      sort_options: sort_options
    };
  }

  // ---------------------
  // Interface: searchPlaces
  // ---------------------

  searchPlaces(
    category_code,
    subcategory,
    location_postal_code,
    radius_miles,
    min_rating,
    max_average_price_per_person,
    max_price_level,
    cuisine_types,
    has_free_wifi,
    has_power_outlets,
    good_for_working,
    has_handmade_items,
    is_artisan,
    desired_datetime,
    showtimes_after,
    sort_by,
    page,
    page_size
  ) {
    const norm = this._normalizeAndValidateFilters({ page: page, page_size: page_size });
    const places = this._getFromStorage('places', []);
    const saved_list_items = this._getFromStorage('saved_list_items', []);

    const cuisineFilter = Array.isArray(cuisine_types) ? cuisine_types.map(function (c) { return String(c).toLowerCase(); }) : null;

    let filtered = places.filter(function (p) {
      if (category_code && p.category_code !== category_code) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      if (location_postal_code && p.postal_code && p.postal_code !== location_postal_code) return false;
      if (min_rating != null && (p.average_rating || 0) < min_rating) return false;
      if (max_average_price_per_person != null && p.average_price_per_person != null && p.average_price_per_person > max_average_price_per_person) return false;
      if (max_price_level) {
        if (p.price_level && this._priceLevelOrder(p.price_level) > this._priceLevelOrder(max_price_level)) return false;
      }
      if (cuisineFilter && cuisineFilter.length > 0) {
        const placeCuisines = Array.isArray(p.cuisine_types) ? p.cuisine_types.map(function (c) { return String(c).toLowerCase(); }) : [];
        const matchCuisine = cuisineFilter.some(function (c) { return placeCuisines.indexOf(c) !== -1; });
        if (!matchCuisine) return false;
      }
      if (has_free_wifi === true && p.has_free_wifi !== true) return false;
      if (has_power_outlets === true && p.has_power_outlets !== true) return false;
      if (good_for_working === true && p.good_for_working !== true) return false;
      if (has_handmade_items === true && p.has_handmade_items !== true) return false;
      if (is_artisan === true && p.is_artisan !== true) return false;
      return true;
    }.bind(this));

    // desired_datetime opening-hours filter
    if (desired_datetime) {
      filtered = filtered.filter(function (p) {
        return this._isPlaceOpenAt(p, desired_datetime);
      }.bind(this));
    }

    // showtimes_after filter for movie_theaters
    if (showtimes_after) {
      const cutoffMinutes = this._parseTimeToMinutes(showtimes_after);
      if (cutoffMinutes != null) {
        filtered = filtered.filter(function (p) {
          if (!Array.isArray(p.showtimes) || p.showtimes.length === 0) return false;
          for (let i = 0; i < p.showtimes.length; i++) {
            const st = this._parseTimeToMinutes(p.showtimes[i]);
            if (st != null && st >= cutoffMinutes) {
              return true;
            }
          }
          return false;
        }.bind(this));
      }
    }

    // Sorting
    const sortCode = sort_by || 'rating_high_to_low';
    filtered.sort(function (a, b) {
      if (sortCode === 'rating_high_to_low') {
        const ra = a.average_rating || 0;
        const rb = b.average_rating || 0;
        return rb - ra;
      }
      if (sortCode === 'average_price_low_to_high') {
        const pa = a.average_price_per_person != null ? a.average_price_per_person : Number.MAX_SAFE_INTEGER;
        const pb = b.average_price_per_person != null ? b.average_price_per_person : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      }
      if (sortCode === 'most_popular') {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        return pb - pa;
      }
      if (sortCode === 'price_level_low_to_high') {
        return this._priceLevelOrder(a.price_level) - this._priceLevelOrder(b.price_level);
      }
      // distance_nearest_first or unknown: leave as-is
      return 0;
    }.bind(this));

    const startIndex = (norm.page - 1) * norm.page_size;
    const endIndex = startIndex + norm.page_size;
    const pageResults = filtered.slice(startIndex, endIndex);

    const results = pageResults.map(function (p) {
      const isSaved = saved_list_items.some(function (item) {
        return item.item_type === 'place' && item.item_ref_id === p.id;
      });
      return {
        place: p,
        distance_miles: null,
        is_saved_to_list: isSaved
      };
    });

    return {
      results: results,
      total_count: filtered.length,
      page: norm.page,
      page_size: norm.page_size,
      applied_sort_by: sortCode
    };
  }

  // ---------------------
  // Interface: getPlaceDetails
  // ---------------------

  getPlaceDetails(place_id) {
    const places = this._getFromStorage('places', []);
    const place = places.find(function (p) { return p.id === place_id; }) || null;
    if (!place) {
      return {
        place: null,
        category_name: null,
        subtype_label: null,
        today_opening_hours: null,
        weekly_opening_hours: [],
        price_display: null,
        amenities_display: [],
        suitability_display: [],
        review_summary: {
          average_rating: null,
          review_count: null
        },
        is_saved_to_list: false
      };
    }

    const categories = this._getFromStorage('categories', []);
    const category = categories.find(function (c) { return c.code === place.category_code; }) || null;
    const category_name = category ? category.name : null;

    let subtype_label = null;
    if (place.subcategory === 'cafes_and_coffee') subtype_label = 'Cafes & Coffee';
    else if (place.subcategory === 'gift_shops') subtype_label = 'Gift Shop';
    else if (place.subcategory === 'movie_theaters') subtype_label = 'Movie Theater';
    else if (place.subcategory === 'restaurants_general') subtype_label = 'Restaurant';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = days[new Date().getDay()];
    let today_opening_hours = null;
    const weekly_opening_hours = Array.isArray(place.opening_hours) ? place.opening_hours : [];
    if (weekly_opening_hours && weekly_opening_hours.length > 0) {
      today_opening_hours = weekly_opening_hours.find(function (h) { return h.day_of_week === todayDayName; }) || null;
    }

    const priceMap = { low: '$', medium: '$$', high: '$$$', premium: '$$$$' };
    let price_display = '';
    if (place.price_level) {
      price_display += priceMap[place.price_level] || '';
    }
    if (place.average_price_per_person != null) {
      if (price_display) price_display += ' · ';
      price_display += '~$' + place.average_price_per_person + ' per person';
    }

    const amenities_display = [];
    if (place.has_free_wifi) amenities_display.push('Free Wi-Fi');
    if (place.has_power_outlets) amenities_display.push('Power outlets');

    const suitability_display = [];
    if (place.good_for_working) suitability_display.push('Good for working');

    const is_saved_to_list = this._getSavedFlagForPlace(place.id);

    return {
      place: place,
      category_name: category_name,
      subtype_label: subtype_label,
      today_opening_hours: today_opening_hours,
      weekly_opening_hours: weekly_opening_hours,
      price_display: price_display || null,
      amenities_display: amenities_display,
      suitability_display: suitability_display,
      review_summary: {
        average_rating: place.average_rating || null,
        review_count: place.review_count || null
      },
      is_saved_to_list: is_saved_to_list
    };
  }

  // ---------------------
  // Interface: getPlaceReviews
  // ---------------------

  getPlaceReviews(place_id, page, page_size, sort_by) {
    const norm = this._normalizeAndValidateFilters({ page: page, page_size: page_size });
    const reviews = this._getFromStorage('place_reviews', []);
    const filtered = reviews.filter(function (r) { return r.place_id === place_id; });

    const sortCode = sort_by || 'newest_first';
    filtered.sort(function (a, b) {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (sortCode === 'newest_first') return db - da;
      if (sortCode === 'highest_rating') return (b.rating || 0) - (a.rating || 0);
      if (sortCode === 'lowest_rating') return (a.rating || 0) - (b.rating || 0);
      return 0;
    });

    const startIndex = (norm.page - 1) * norm.page_size;
    const endIndex = startIndex + norm.page_size;
    const pageReviews = filtered.slice(startIndex, endIndex);

    return {
      reviews: pageReviews,
      total_count: filtered.length,
      page: norm.page,
      page_size: norm.page_size
    };
  }

  // ---------------------
  // Interface: getPlaceReviewTagOptions
  // ---------------------

  getPlaceReviewTagOptions(place_id, category_code, subcategory) {
    let finalCategory = category_code || null;
    let finalSubcategory = subcategory || null;

    if (place_id) {
      const places = this._getFromStorage('places', []);
      const place = places.find(function (p) { return p.id === place_id; }) || null;
      if (place) {
        finalCategory = place.category_code || finalCategory;
        finalSubcategory = place.subcategory || finalSubcategory;
      }
    }

    // Simple static tags mainly for restaurants / food_and_drink
    const tags = [];
    if (finalCategory === 'restaurants' || finalCategory === 'food_and_drink') {
      tags.push(
        { code: 'vegetarian_options', label: 'Vegetarian options' },
        { code: 'cozy_atmosphere', label: 'Cozy atmosphere' },
        { code: 'good_for_groups', label: 'Good for groups' },
        { code: 'romantic', label: 'Romantic' }
      );
    } else {
      tags.push(
        { code: 'friendly_staff', label: 'Friendly staff' },
        { code: 'great_value', label: 'Great value' }
      );
    }

    return tags;
  }

  // ---------------------
  // Interface: submitPlaceReview
  // ---------------------

  submitPlaceReview(place_id, rating, selected_tags, review_text, reviewer_name, reviewer_email) {
    const now = new Date().toISOString();
    const reviews = this._getFromStorage('place_reviews', []);
    const newReview = {
      id: this._generateId('review'),
      place_id: place_id,
      rating: rating,
      selected_tags: Array.isArray(selected_tags) ? selected_tags : [],
      review_text: review_text,
      reviewer_name: reviewer_name || null,
      reviewer_email: reviewer_email || null,
      created_at: now
    };
    reviews.push(newReview);
    this._saveToStorage('place_reviews', reviews);

    // Update place rating summary
    const places = this._getFromStorage('places', []);
    const placeIndex = places.findIndex(function (p) { return p.id === place_id; });
    let updated_average_rating = null;
    let updated_review_count = null;
    if (placeIndex !== -1) {
      const placeReviews = reviews.filter(function (r) { return r.place_id === place_id; });
      const count = placeReviews.length;
      const sum = placeReviews.reduce(function (acc, r) { return acc + (r.rating || 0); }, 0);
      const avg = count > 0 ? sum / count : null;
      places[placeIndex].average_rating = avg;
      places[placeIndex].review_count = count;
      this._saveToStorage('places', places);
      updated_average_rating = avg;
      updated_review_count = count;
    }

    return {
      success: true,
      review: newReview,
      updated_average_rating: updated_average_rating,
      updated_review_count: updated_review_count,
      message: 'Review submitted.'
    };
  }

  // ---------------------
  // Interface: getNearbyPlacesByPlace
  // ---------------------

  getNearbyPlacesByPlace(base_place_id, category_code, subcategory, radius_miles, min_rating, showtimes_after, sort_by) {
    const places = this._getFromStorage('places', []);
    const base_place = places.find(function (p) { return p.id === base_place_id; }) || null;
    if (!base_place) {
      return {
        base_place: null,
        results: []
      };
    }

    const saved_list_items = this._getFromStorage('saved_list_items', []);
    const cutoffMinutes = showtimes_after ? this._parseTimeToMinutes(showtimes_after) : null;

    let filtered = places.filter(function (p) {
      if (p.id === base_place.id) return false;
      if (category_code && p.category_code !== category_code) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      if (min_rating != null && (p.average_rating || 0) < min_rating) return false;
      // Simple location: same postal code to approximate nearby
      if (p.postal_code && base_place.postal_code && p.postal_code !== base_place.postal_code) return false;
      if (cutoffMinutes != null) {
        if (!Array.isArray(p.showtimes) || p.showtimes.length === 0) return false;
        let hasAfter = false;
        for (let i = 0; i < p.showtimes.length; i++) {
          const st = this._parseTimeToMinutes(p.showtimes[i]);
          if (st != null && st >= cutoffMinutes) {
            hasAfter = true;
            break;
          }
        }
        if (!hasAfter) return false;
      }
      return true;
    }.bind(this));

    const sortCode = sort_by || 'distance_nearest_first';
    filtered.sort(function (a, b) {
      if (sortCode === 'rating_high_to_low') {
        const ra = a.average_rating || 0;
        const rb = b.average_rating || 0;
        return rb - ra;
      }
      if (sortCode === 'most_popular') {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        return pb - pa;
      }
      return 0;
    });

    const results = filtered.map(function (p) {
      let nextShowtime = null;
      if (cutoffMinutes != null && Array.isArray(p.showtimes)) {
        const after = p.showtimes
          .map(function (st) {
            return { original: st, minutes: this._parseTimeToMinutes(st) };
          }.bind(this))
          .filter(function (obj) { return obj.minutes != null && obj.minutes >= cutoffMinutes; })
          .sort(function (a, b) { return a.minutes - b.minutes; });
        if (after.length > 0) {
          nextShowtime = after[0].original;
        }
      }
      const isSaved = saved_list_items.some(function (item) {
        return item.item_type === 'place' && item.item_ref_id === p.id;
      });
      return {
        place: p,
        distance_miles: null,
        next_showtime: nextShowtime,
        is_saved_to_list: isSaved
      };
    }.bind(this));

    return {
      base_place: base_place,
      results: results
    };
  }

  // ---------------------
  // Interface: contactBusinessForPlace
  // ---------------------

  contactBusinessForPlace(place_id, subject, message, sender_name, sender_phone) {
    const now = new Date().toISOString();
    const msgs = this._getFromStorage('business_contact_messages', []);
    const newMsg = {
      id: this._generateId('bizmsg'),
      place_id: place_id,
      subject: subject || null,
      message: message || null,
      sender_name: sender_name,
      sender_phone: sender_phone,
      created_at: now,
      status: 'pending'
    };
    msgs.push(newMsg);
    this._saveToStorage('business_contact_messages', msgs);

    // Foreign key resolution as per requirement
    const places = this._getFromStorage('places', []);
    const place = places.find(function (p) { return p.id === place_id; }) || null;
    const returned = Object.assign({}, newMsg, { place: place });

    return {
      success: true,
      business_message: returned,
      message: 'Message submitted.'
    };
  }

  // ---------------------
  // Interface: getClassActivityFilterOptions
  // ---------------------

  getClassActivityFilterOptions(subcategory) {
    const subcategory_options = [
      { code: 'fitness', label: 'Fitness' },
      { code: 'art', label: 'Art' },
      { code: 'music', label: 'Music' }
    ];

    const price_ranges = [
      { max_price: 20, label: 'Up to $20' },
      { max_price: 50, label: 'Up to $50' },
      { max_price: 100, label: 'Up to $100' }
    ];

    const rating_options = [3.0, 4.0, 4.5, 5.0];

    const sort_options = [
      { code: 'rating_high_to_low', label: 'Rating (high to low)' },
      { code: 'price_low_to_high', label: 'Price (low to high)' },
      { code: 'start_time_ascending', label: 'Start time (earliest first)' },
      { code: 'popularity_high_to_low', label: 'Popularity (high to low)' }
    ];

    return {
      subcategory_options: subcategory_options,
      price_ranges: price_ranges,
      rating_options: rating_options,
      sort_options: sort_options
    };
  }

  // ---------------------
  // Interface: searchClassActivities
  // ---------------------

  searchClassActivities(
    subcategory,
    start_date,
    end_date,
    max_price,
    location_postal_code,
    radius_miles,
    min_rating,
    sort_by,
    page,
    page_size
  ) {
    const norm = this._normalizeAndValidateFilters({ page: page, page_size: page_size });
    const list = this._getFromStorage('class_activities', []);
    const saved_list_items = this._getFromStorage('saved_list_items', []);

    let filtered = list.filter(function (c) {
      if (c.category_code && c.category_code !== 'classes_activities') return false;
      if (subcategory && c.subcategory !== subcategory) return false;
      if (max_price != null && c.price != null && c.price > max_price) return false;
      if (location_postal_code && c.postal_code && c.postal_code !== location_postal_code) return false;
      if (min_rating != null && (c.average_rating || 0) < min_rating) return false;
      return true;
    });

    if (start_date || end_date) {
      let startTime = start_date ? new Date(start_date + 'T00:00:00') : null;
      let endTime = end_date ? new Date(end_date + 'T23:59:59') : null;
      filtered = filtered.filter(function (c) {
        const start = new Date(c.start_datetime);
        if (isNaN(start.getTime())) return false;
        if (startTime && start < startTime) return false;
        if (endTime && start > endTime) return false;
        return true;
      });
    }

    const sortCode = sort_by || 'rating_high_to_low';
    filtered.sort(function (a, b) {
      if (sortCode === 'rating_high_to_low') {
        const ra = a.average_rating || 0;
        const rb = b.average_rating || 0;
        return rb - ra;
      }
      if (sortCode === 'price_low_to_high') {
        const pa = a.price != null ? a.price : Number.MAX_SAFE_INTEGER;
        const pb = b.price != null ? b.price : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      }
      if (sortCode === 'start_time_ascending') {
        const ta = new Date(a.start_datetime).getTime();
        const tb = new Date(b.start_datetime).getTime();
        return ta - tb;
      }
      if (sortCode === 'popularity_high_to_low') {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        return pb - pa;
      }
      return 0;
    });

    const startIndex = (norm.page - 1) * norm.page_size;
    const endIndex = startIndex + norm.page_size;
    const pageResults = filtered.slice(startIndex, endIndex);

    const results = pageResults.map(function (c) {
      const isSaved = saved_list_items.some(function (item) {
        return item.item_type === 'class_activity' && item.item_ref_id === c.id;
      });
      return {
        class_activity: c,
        distance_miles: null,
        is_saved_to_list: isSaved
      };
    });

    return {
      results: results,
      total_count: filtered.length,
      page: norm.page,
      page_size: norm.page_size
    };
  }

  // ---------------------
  // Interface: getEventFilterOptions
  // ---------------------

  getEventFilterOptions(subcategory) {
    const subcategory_options = [
      { code: 'family_and_kids', label: 'Family & Kids' },
      { code: 'music', label: 'Music' },
      { code: 'sports', label: 'Sports' }
    ];

    const price_filters = [
      { code: 'free_only', label: 'Free only' },
      { code: 'all_prices', label: 'All prices' }
    ];

    const time_ranges = [
      { start_time: '08:00', end_time: '12:00', label: 'Morning' },
      { start_time: '12:00', end_time: '17:00', label: 'Afternoon' },
      { start_time: '17:00', end_time: '22:00', label: 'Evening' }
    ];

    const sort_options = [
      { code: 'most_popular', label: 'Most popular' },
      { code: 'start_time_ascending', label: 'Start time (earliest first)' }
    ];

    return {
      subcategory_options: subcategory_options,
      price_filters: price_filters,
      time_ranges: time_ranges,
      sort_options: sort_options
    };
  }

  // ---------------------
  // Interface: searchEvents
  // ---------------------

  searchEvents(
    subcategory,
    event_date,
    time_from,
    time_to,
    is_free_only,
    location_postal_code,
    radius_miles,
    sort_by,
    page,
    page_size
  ) {
    const norm = this._normalizeAndValidateFilters({ page: page, page_size: page_size });
    const events = this._getFromStorage('events', []);

    let filtered = events.filter(function (e) {
      if (e.category_code && e.category_code !== 'events') return false;
      if (subcategory && e.subcategory && e.subcategory !== subcategory) return false;
      if (location_postal_code && e.postal_code && e.postal_code !== location_postal_code) return false;
      if (is_free_only === true) {
        const freeFlag = e.is_free === true || e.price === 0 || e.price == null;
        if (!freeFlag) return false;
      }
      return true;
    });

    if (event_date) {
      const targetDate = new Date(event_date + 'T00:00:00');
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const day = targetDate.getDate();
      filtered = filtered.filter(function (e) {
        const start = new Date(e.start_datetime);
        return start.getFullYear() === year && start.getMonth() === month && start.getDate() === day;
      });
    }

    if (time_from || time_to) {
      const fromMin = time_from ? this._parseTimeToMinutes(time_from) : null;
      const toMin = time_to ? this._parseTimeToMinutes(time_to) : null;
      filtered = filtered.filter(function (e) {
        const start = new Date(e.start_datetime);
        if (isNaN(start.getTime())) return false;
        const mins = start.getHours() * 60 + start.getMinutes();
        if (fromMin != null && mins < fromMin) return false;
        if (toMin != null && mins > toMin) return false;
        return true;
      });
    }

    const sortCode = sort_by || 'most_popular';
    filtered.sort(function (a, b) {
      if (sortCode === 'most_popular') {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        return pb - pa;
      }
      if (sortCode === 'start_time_ascending') {
        const ta = new Date(a.start_datetime).getTime();
        const tb = new Date(b.start_datetime).getTime();
        return ta - tb;
      }
      return 0;
    });

    const startIndex = (norm.page - 1) * norm.page_size;
    const endIndex = startIndex + norm.page_size;
    const pageEvents = filtered.slice(startIndex, endIndex);

    return {
      results: pageEvents,
      total_count: filtered.length,
      page: norm.page,
      page_size: norm.page_size
    };
  }

  // ---------------------
  // Interface: getEventDetails
  // ---------------------

  getEventDetails(event_id) {
    const events = this._getFromStorage('events', []);
    const event = events.find(function (e) { return e.id === event_id; }) || null;
    if (!event) {
      return {
        event: null,
        category_name: null,
        is_free: null,
        price_display: null,
        schedule_display: null,
        popularity_score: null
      };
    }

    const categories = this._getFromStorage('categories', []);
    const category = categories.find(function (c) { return c.code === event.category_code; }) || null;
    const category_name = category ? category.name : null;

    const is_free = event.is_free === true || event.price === 0 || event.price == null;
    const price_display = is_free ? 'Free' : ('$' + event.price);

    let schedule_display = '';
    if (event.start_datetime && event.end_datetime) {
      schedule_display = event.start_datetime + ' - ' + event.end_datetime;
    } else if (event.start_datetime) {
      schedule_display = String(event.start_datetime);
    }

    return {
      event: event,
      category_name: category_name,
      is_free: is_free,
      price_display: price_display,
      schedule_display: schedule_display || null,
      popularity_score: event.popularity_score || null
    };
  }

  // ---------------------
  // Interface: submitEventRsvp
  // ---------------------

  submitEventRsvp(event_id, num_attendees, attendee_name, attendee_phone) {
    const now = new Date().toISOString();
    const rsvps = this._getFromStorage('event_rsvps', []);
    const newRsvp = {
      id: this._generateId('rsvp'),
      event_id: event_id,
      num_attendees: num_attendees,
      attendee_name: attendee_name,
      attendee_phone: attendee_phone,
      created_at: now,
      status: 'confirmed'
    };
    rsvps.push(newRsvp);
    this._saveToStorage('event_rsvps', rsvps);

    // Foreign key resolution not required by interface; this is an action, not a getter.
    return {
      success: true,
      rsvp: newRsvp,
      message: 'RSVP submitted.'
    };
  }

  // ---------------------
  // Interface: getDealFilterOptions
  // ---------------------

  getDealFilterOptions(subcategory) {
    const subcategory_options = [
      { code: 'beauty_and_spa', label: 'Beauty & Spa' },
      { code: 'restaurants', label: 'Restaurants' },
      { code: 'activities', label: 'Activities' }
    ];

    const rating_options = [3.0, 4.0, 4.5, 5.0];

    const price_ranges = [
      { max_price: 25, label: 'Up to $25' },
      { max_price: 50, label: 'Up to $50' },
      { max_price: 100, label: 'Up to $100' }
    ];

    const validity_filters = [
      { code: 'valid_after_date', label: 'Valid after date' },
      { code: 'expiring_soon', label: 'Expiring soon' }
    ];

    const sort_options = [
      { code: 'discount_highest_first', label: 'Discount (highest first)' },
      { code: 'price_low_to_high', label: 'Price (low to high)' },
      { code: 'rating_high_to_low', label: 'Rating (high to low)' }
    ];

    return {
      subcategory_options: subcategory_options,
      rating_options: rating_options,
      price_ranges: price_ranges,
      validity_filters: validity_filters,
      sort_options: sort_options
    };
  }

  // ---------------------
  // Interface: searchDeals
  // ---------------------

  searchDeals(
    subcategory,
    max_deal_price,
    min_rating,
    valid_after_date,
    only_active,
    sort_by,
    page,
    page_size
  ) {
    const norm = this._normalizeAndValidateFilters({ page: page, page_size: page_size });
    const deals = this._getFromStorage('deals', []);

    let filtered = deals.filter(function (d) {
      if (d.category_code && d.category_code !== 'deals') return false;
      if (subcategory && d.subcategory && d.subcategory !== subcategory) return false;
      if (max_deal_price != null && d.deal_price != null && d.deal_price > max_deal_price) return false;
      if (min_rating != null && (d.average_rating || 0) < min_rating) return false;
      if (only_active !== false && d.is_active === false) return false;
      return true;
    });

    if (valid_after_date) {
      const cutoff = new Date(valid_after_date + 'T00:00:00');
      filtered = filtered.filter(function (d) {
        const validUntil = d.valid_until ? new Date(d.valid_until) : null;
        const validFrom = d.valid_from ? new Date(d.valid_from) : null;
        if (validUntil && validUntil < cutoff) return false;
        if (validFrom && validFrom > cutoff) return false;
        return true;
      });
    }

    const sortCode = sort_by || 'discount_highest_first';
    filtered.sort(function (a, b) {
      if (sortCode === 'discount_highest_first') {
        const da = a.discount_percentage || 0;
        const db = b.discount_percentage || 0;
        return db - da;
      }
      if (sortCode === 'price_low_to_high') {
        const pa = a.deal_price != null ? a.deal_price : Number.MAX_SAFE_INTEGER;
        const pb = b.deal_price != null ? b.deal_price : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      }
      if (sortCode === 'rating_high_to_low') {
        const ra = a.average_rating || 0;
        const rb = b.average_rating || 0;
        return rb - ra;
      }
      return 0;
    });

    const startIndex = (norm.page - 1) * norm.page_size;
    const endIndex = startIndex + norm.page_size;
    const pageDeals = filtered.slice(startIndex, endIndex);

    return {
      results: pageDeals,
      total_count: filtered.length,
      page: norm.page,
      page_size: norm.page_size
    };
  }

  // ---------------------
  // Interface: getDealDetails
  // ---------------------

  getDealDetails(deal_id) {
    const deals = this._getFromStorage('deals', []);
    const deal = deals.find(function (d) { return d.id === deal_id; }) || null;
    if (!deal) {
      return {
        deal: null,
        partner_place: null,
        price_display: null,
        validity_display: null,
        rating_summary: {
          average_rating: null,
          review_count: null
        },
        is_saved: false
      };
    }

    let partner_place = null;
    if (deal.partner_place_id) {
      const places = this._getFromStorage('places', []);
      const place = places.find(function (p) { return p.id === deal.partner_place_id; }) || null;
      if (place) {
        partner_place = { place: place };
      }
    }

    let price_display = '$' + deal.deal_price;
    if (deal.original_price != null && deal.discount_percentage != null) {
      price_display += ' (' + deal.discount_percentage + '% off $' + deal.original_price + ')';
    }

    let validity_display = null;
    if (deal.valid_from && deal.valid_until) {
      validity_display = 'Valid from ' + deal.valid_from + ' to ' + deal.valid_until;
    } else if (deal.valid_until) {
      validity_display = 'Valid until ' + deal.valid_until;
    }

    const saved_deals = this._getOrCreateSavedDealsStore();
    const is_saved = saved_deals.some(function (sd) { return sd.deal_id === deal_id; });

    return {
      deal: deal,
      partner_place: partner_place,
      price_display: price_display,
      validity_display: validity_display,
      rating_summary: {
        average_rating: deal.average_rating || null,
        review_count: deal.review_count || null
      },
      is_saved: is_saved
    };
  }

  // ---------------------
  // Interface: saveDeal
  // ---------------------

  saveDeal(deal_id) {
    const deals = this._getFromStorage('deals', []);
    const deal = deals.find(function (d) { return d.id === deal_id; }) || null;
    if (!deal) {
      return {
        success: false,
        saved_deal: null,
        message: 'Deal not found.'
      };
    }

    const saved_deals = this._getOrCreateSavedDealsStore();
    const existing = saved_deals.find(function (sd) { return sd.deal_id === deal_id; });
    if (existing) {
      return {
        success: true,
        saved_deal: existing,
        message: 'Deal already saved.'
      };
    }

    const newSaved = {
      id: this._generateId('savedeal'),
      deal_id: deal_id,
      saved_at: new Date().toISOString()
    };
    saved_deals.push(newSaved);
    this._saveToStorage('saved_deals', saved_deals);

    return {
      success: true,
      saved_deal: newSaved,
      message: 'Deal saved.'
    };
  }

  // ---------------------
  // Interface: getSavedDeals
  // ---------------------

  getSavedDeals() {
    const saved_deals = this._getOrCreateSavedDealsStore();
    const deals = this._getFromStorage('deals', []);
    const combined = saved_deals.map(function (sd) {
      const deal = deals.find(function (d) { return d.id === sd.deal_id; }) || null;
      return {
        saved_deal: sd,
        deal: deal
      };
    });
    return {
      saved_deals: combined
    };
  }

  // ---------------------
  // Interface: removeSavedDeal
  // ---------------------

  removeSavedDeal(saved_deal_id) {
    const saved_deals = this._getOrCreateSavedDealsStore();
    const index = saved_deals.findIndex(function (sd) { return sd.id === saved_deal_id; });
    if (index === -1) {
      return {
        success: false,
        message: 'Saved deal not found.'
      };
    }
    saved_deals.splice(index, 1);
    this._saveToStorage('saved_deals', saved_deals);
    return {
      success: true,
      message: 'Saved deal removed.'
    };
  }

  // ---------------------
  // Interface: searchServiceProviders
  // ---------------------

  searchServiceProviders(
    service_subcategory,
    location_postal_code,
    radius_miles,
    min_rating,
    supports_emergency_service,
    is_open_24_7,
    sort_by,
    page,
    page_size
  ) {
    const norm = this._normalizeAndValidateFilters({ page: page, page_size: page_size });
    const providers = this._getFromStorage('service_providers', []);

    let filtered = providers.filter(function (s) {
      if (service_subcategory && s.service_subcategory && s.service_subcategory !== service_subcategory) return false;
      if (location_postal_code) {
        const areaZip = s.service_area_postal_code || s.postal_code;
        if (areaZip && areaZip !== location_postal_code) return false;
      }
      if (min_rating != null && (s.average_rating || 0) < min_rating) return false;
      if (supports_emergency_service === true && s.supports_emergency_service !== true) return false;
      if (is_open_24_7 === true && s.is_open_24_7 !== true) return false;
      return true;
    });

    const sortCode = sort_by || 'rating_high_to_low';
    filtered.sort(function (a, b) {
      if (sortCode === 'rating_high_to_low') {
        const ra = a.average_rating || 0;
        const rb = b.average_rating || 0;
        return rb - ra;
      }
      // distance_nearest_first not implemented (no coords)
      return 0;
    });

    const startIndex = (norm.page - 1) * norm.page_size;
    const endIndex = startIndex + norm.page_size;
    const pageProviders = filtered.slice(startIndex, endIndex);

    const results = pageProviders.map(function (s) {
      return {
        service_provider: s,
        distance_miles: null
      };
    });

    return {
      results: results,
      total_count: filtered.length,
      page: norm.page,
      page_size: norm.page_size
    };
  }

  // ---------------------
  // Interface: getServiceProviderDetails
  // ---------------------

  getServiceProviderDetails(service_provider_id) {
    const providers = this._getFromStorage('service_providers', []);
    const sp = providers.find(function (s) { return s.id === service_provider_id; }) || null;
    if (!sp) {
      return {
        service_provider: null,
        category_name: null,
        services_offered_display: [],
        review_summary: {
          average_rating: null,
          review_count: null
        }
      };
    }

    const categories = this._getFromStorage('categories', []);
    const category = categories.find(function (c) { return c.code === sp.category_code; }) || null;
    const category_name = category ? category.name : null;

    const services_offered_display = Array.isArray(sp.services_offered) ? sp.services_offered.slice() : [];

    return {
      service_provider: sp,
      category_name: category_name,
      services_offered_display: services_offered_display,
      review_summary: {
        average_rating: sp.average_rating || null,
        review_count: sp.review_count || null
      }
    };
  }

  // ---------------------
  // Interface: submitEmergencyServiceRequest
  // ---------------------

  submitEmergencyServiceRequest(service_provider_id, full_name, phone, preferred_arrival_time, problem_description) {
    const now = new Date().toISOString();
    const requests = this._getFromStorage('emergency_service_requests', []);
    const newReq = {
      id: this._generateId('esreq'),
      service_provider_id: service_provider_id,
      full_name: full_name,
      phone: phone,
      preferred_arrival_time: preferred_arrival_time,
      problem_description: problem_description || null,
      created_at: now,
      status: 'sent'
    };
    requests.push(newReq);
    this._saveToStorage('emergency_service_requests', requests);

    return {
      success: true,
      request: newReq,
      message: 'Emergency service request submitted.'
    };
  }

  // ---------------------
  // Interface: searchDirectory
  // ---------------------

  searchDirectory(
    query,
    category_code,
    location_postal_code,
    radius_miles,
    min_rating,
    page,
    page_size
  ) {
    const norm = this._normalizeAndValidateFilters({ page: page, page_size: page_size });
    const q = (query || '').toLowerCase();

    const places = this._getFromStorage('places', []);
    const providers = this._getFromStorage('service_providers', []);
    const classes = this._getFromStorage('class_activities', []);
    const events = this._getFromStorage('events', []);
    const deals = this._getFromStorage('deals', []);

    const saved_list_items = this._getFromStorage('saved_list_items', []);
    const saved_deals = this._getOrCreateSavedDealsStore();

    const results = [];

    // Places
    places.forEach(function (p) {
      if (q && p.name && p.name.toLowerCase().indexOf(q) === -1 && (!p.description || p.description.toLowerCase().indexOf(q) === -1)) return;
      if (category_code && p.category_code !== category_code) return;
      if (location_postal_code && p.postal_code && p.postal_code !== location_postal_code) return;
      if (min_rating != null && (p.average_rating || 0) < min_rating) return;
      const isSaved = saved_list_items.some(function (item) {
        return item.item_type === 'place' && item.item_ref_id === p.id;
      });
      let priceIndicator = '';
      if (p.average_price_per_person != null) {
        priceIndicator = '~$' + p.average_price_per_person + ' per person';
      } else if (p.price_level) {
        const map = { low: '$', medium: '$$', high: '$$$', premium: '$$$$' };
        priceIndicator = map[p.price_level] || '';
      }
      results.push({
        result_type: 'place',
        id: p.id,
        title: p.name,
        subtitle: p.street_address || '',
        category_code: p.category_code,
        subcategory: p.subcategory || null,
        average_rating: p.average_rating || null,
        review_count: p.review_count || null,
        price_indicator: priceIndicator,
        distance_miles: null,
        is_saved: isSaved
      });
    });

    // Service providers
    providers.forEach(function (s) {
      if (q && s.name && s.name.toLowerCase().indexOf(q) === -1 && (!s.description || s.description.toLowerCase().indexOf(q) === -1)) return;
      if (category_code && s.category_code !== category_code) return;
      if (location_postal_code) {
        const zip = s.service_area_postal_code || s.postal_code;
        if (zip && zip !== location_postal_code) return;
      }
      if (min_rating != null && (s.average_rating || 0) < min_rating) return;
      const isSaved = saved_list_items.some(function (item) {
        return item.item_type === 'service_provider' && item.item_ref_id === s.id;
      });
      results.push({
        result_type: 'service_provider',
        id: s.id,
        title: s.name,
        subtitle: s.description || '',
        category_code: s.category_code,
        subcategory: s.service_subcategory || null,
        average_rating: s.average_rating || null,
        review_count: s.review_count || null,
        price_indicator: '',
        distance_miles: null,
        is_saved: isSaved
      });
    });

    // Classes
    classes.forEach(function (c) {
      if (q && c.title && c.title.toLowerCase().indexOf(q) === -1 && (!c.description || c.description.toLowerCase().indexOf(q) === -1)) return;
      if (category_code && c.category_code !== category_code) return;
      if (location_postal_code && c.postal_code && c.postal_code !== location_postal_code) return;
      if (min_rating != null && (c.average_rating || 0) < min_rating) return;
      const isSaved = saved_list_items.some(function (item) {
        return item.item_type === 'class_activity' && item.item_ref_id === c.id;
      });
      results.push({
        result_type: 'class_activity',
        id: c.id,
        title: c.title,
        subtitle: c.venue_name || '',
        category_code: c.category_code,
        subcategory: c.subcategory || null,
        average_rating: c.average_rating || null,
        review_count: c.review_count || null,
        price_indicator: '$' + c.price + ' class',
        distance_miles: null,
        is_saved: isSaved
      });
    });

    // Events
    events.forEach(function (e) {
      if (q && e.title && e.title.toLowerCase().indexOf(q) === -1 && (!e.description || e.description.toLowerCase().indexOf(q) === -1)) return;
      if (category_code && e.category_code !== category_code) return;
      if (location_postal_code && e.postal_code && e.postal_code !== location_postal_code) return;
      const isSaved = saved_list_items.some(function (item) {
        return item.item_type === 'event' && item.item_ref_id === e.id;
      });
      const priceIndicator = e.is_free ? 'Free' : (e.price != null ? '$' + e.price : '');
      results.push({
        result_type: 'event',
        id: e.id,
        title: e.title,
        subtitle: e.venue_name || '',
        category_code: e.category_code,
        subcategory: e.subcategory || null,
        average_rating: null,
        review_count: null,
        price_indicator: priceIndicator,
        distance_miles: null,
        is_saved: isSaved
      });
    });

    // Deals
    deals.forEach(function (d) {
      if (q && d.title && d.title.toLowerCase().indexOf(q) === -1 && (!d.description || d.description.toLowerCase().indexOf(q) === -1)) return;
      if (category_code && d.category_code !== category_code) return;
      if (min_rating != null && (d.average_rating || 0) < min_rating) return;
      const isSaved = saved_deals.some(function (sd) { return sd.deal_id === d.id; });
      results.push({
        result_type: 'deal',
        id: d.id,
        title: d.title,
        subtitle: '',
        category_code: d.category_code,
        subcategory: d.subcategory || null,
        average_rating: d.average_rating || null,
        review_count: d.review_count || null,
        price_indicator: '$' + d.deal_price + ' deal',
        distance_miles: null,
        is_saved: isSaved
      });
    });

    // Basic relevance sort: rating then title
    results.sort(function (a, b) {
      const ra = a.average_rating || 0;
      const rb = b.average_rating || 0;
      if (rb !== ra) return rb - ra;
      const ta = (a.title || '').toLowerCase();
      const tb = (b.title || '').toLowerCase();
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });

    const startIndex = (norm.page - 1) * norm.page_size;
    const endIndex = startIndex + norm.page_size;
    const pageResults = results.slice(startIndex, endIndex);

    return {
      results: pageResults,
      total_count: results.length,
      page: norm.page,
      page_size: norm.page_size
    };
  }

  // ---------------------
  // Interface: getSearchFilterOptions
  // ---------------------

  getSearchFilterOptions() {
    const categories = this._getFromStorage('categories', []);
    const category_options = categories.map(function (c) {
      return {
        category_code: c.code,
        label: c.name
      };
    });

    const rating_options = [3.0, 4.0, 4.5, 5.0];

    return {
      category_options: category_options,
      rating_options: rating_options
    };
  }

  // ---------------------
  // Interface: getSavedListsOverview
  // ---------------------

  getSavedListsOverview() {
    const store = this._getOrCreateSavedListsStore();
    const saved_lists = store.saved_lists;
    const saved_list_items = store.saved_list_items;

    const lists = saved_lists.map(function (list) {
      const count = saved_list_items.filter(function (item) { return item.list_id === list.id; }).length;
      return {
        list: list,
        item_count: count
      };
    });

    return {
      lists: lists
    };
  }

  // ---------------------
  // Interface: getSavedListItems
  // ---------------------

  getSavedListItems(list_id) {
    const store = this._getOrCreateSavedListsStore();
    const saved_lists = store.saved_lists;
    const saved_list_items = store.saved_list_items;

    const list = saved_lists.find(function (l) { return l.id === list_id; }) || null;
    const itemsForList = saved_list_items.filter(function (item) { return item.list_id === list_id; });

    const items = itemsForList.map(function (saved_item) {
      const summary = this._resolveSavedListItemSummary(saved_item);
      return {
        saved_item: saved_item,
        summary: summary
      };
    }.bind(this));

    return {
      list: list,
      items: items
    };
  }

  // ---------------------
  // Interface: createSavedListAndAddItem
  // ---------------------

  createSavedListAndAddItem(list_name, description, item_type, item_ref_id, notes) {
    const store = this._getOrCreateSavedListsStore();
    const saved_lists = store.saved_lists;
    const saved_list_items = store.saved_list_items;

    const newList = {
      id: this._generateId('list'),
      name: list_name,
      description: description || null,
      created_at: new Date().toISOString()
    };
    saved_lists.push(newList);

    const newItem = {
      id: this._generateId('listitem'),
      list_id: newList.id,
      item_type: item_type,
      item_ref_id: item_ref_id,
      added_at: new Date().toISOString(),
      notes: notes || null
    };
    saved_list_items.push(newItem);

    this._saveToStorage('saved_lists', saved_lists);
    this._saveToStorage('saved_list_items', saved_list_items);

    return {
      success: true,
      list: newList,
      saved_item: newItem,
      message: 'List created and item added.'
    };
  }

  // ---------------------
  // Interface: addItemToSavedList
  // ---------------------

  addItemToSavedList(list_id, item_type, item_ref_id, notes) {
    const store = this._getOrCreateSavedListsStore();
    const saved_lists = store.saved_lists;
    const saved_list_items = store.saved_list_items;

    const list = saved_lists.find(function (l) { return l.id === list_id; }) || null;
    if (!list) {
      return {
        success: false,
        saved_item: null,
        message: 'List not found.'
      };
    }

    const newItem = {
      id: this._generateId('listitem'),
      list_id: list_id,
      item_type: item_type,
      item_ref_id: item_ref_id,
      added_at: new Date().toISOString(),
      notes: notes || null
    };
    saved_list_items.push(newItem);

    this._saveToStorage('saved_list_items', saved_list_items);

    return {
      success: true,
      saved_item: newItem,
      message: 'Item added to list.'
    };
  }

  // ---------------------
  // Interface: renameSavedList
  // ---------------------

  renameSavedList(list_id, new_name) {
    const store = this._getOrCreateSavedListsStore();
    const saved_lists = store.saved_lists;

    const index = saved_lists.findIndex(function (l) { return l.id === list_id; });
    if (index === -1) {
      return {
        success: false,
        list: null,
        message: 'List not found.'
      };
    }

    saved_lists[index].name = new_name;
    this._saveToStorage('saved_lists', saved_lists);

    return {
      success: true,
      list: saved_lists[index],
      message: 'List renamed.'
    };
  }

  // ---------------------
  // Interface: deleteSavedList
  // ---------------------

  deleteSavedList(list_id) {
    const store = this._getOrCreateSavedListsStore();
    let saved_lists = store.saved_lists;
    let saved_list_items = store.saved_list_items;

    const index = saved_lists.findIndex(function (l) { return l.id === list_id; });
    if (index === -1) {
      return {
        success: false,
        message: 'List not found.'
      };
    }

    saved_lists.splice(index, 1);
    saved_list_items = saved_list_items.filter(function (item) { return item.list_id !== list_id; });

    this._saveToStorage('saved_lists', saved_lists);
    this._saveToStorage('saved_list_items', saved_list_items);

    return {
      success: true,
      message: 'List deleted.'
    };
  }

  // ---------------------
  // Interface: removeItemFromSavedList
  // ---------------------

  removeItemFromSavedList(saved_list_item_id) {
    const store = this._getOrCreateSavedListsStore();
    const saved_list_items = store.saved_list_items;

    const index = saved_list_items.findIndex(function (i) { return i.id === saved_list_item_id; });
    if (index === -1) {
      return {
        success: false,
        message: 'Saved list item not found.'
      };
    }

    saved_list_items.splice(index, 1);
    this._saveToStorage('saved_list_items', saved_list_items);

    return {
      success: true,
      message: 'Item removed from list.'
    };
  }

  // ---------------------
  // Interface: submitSiteContactMessage
  // ---------------------

  submitSiteContactMessage(name, email, subject, message) {
    const msgs = this._getFromStorage('site_contact_messages', []);
    const newMsg = {
      id: this._generateId('sitecontact'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      created_at: new Date().toISOString()
    };
    msgs.push(newMsg);
    this._saveToStorage('site_contact_messages', msgs);

    return {
      success: true,
      message_id: newMsg.id,
      message: 'Contact message submitted.'
    };
  }

  // ---------------------
  // Interface: getSiteInfoPage
  // ---------------------

  getSiteInfoPage(page_code) {
    const pages = this._getFromStorage('site_info_pages', []);
    const page = pages.find(function (p) { return p.page_code === page_code; }) || null;
    if (!page) {
      return {
        page_code: page_code,
        title: '',
        sections: []
      };
    }
    return page;
  }

  // ---------------------
  // Interface: getSiteSupportContact
  // ---------------------

  getSiteSupportContact() {
    const support = this._getFromStorage('site_support_contact', { support_email: null, support_phone: null });
    return {
      support_email: support.support_email || null,
      support_phone: support.support_phone || null
    };
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof globalThis !== 'undefined') {
  // Expose BusinessLogic on the global object (Node.js, browsers, etc.)
  globalThis.BusinessLogic = globalThis.BusinessLogic || BusinessLogic;
}
if (typeof module !== 'undefined' && module.exports) {
  // Support both default and named imports in Node.js
  module.exports = {
    BusinessLogic: BusinessLogic,
    default: BusinessLogic
  };
}
