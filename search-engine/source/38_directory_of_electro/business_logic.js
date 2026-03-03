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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables from data models
    ensureKey('providers', []);
    ensureKey('provider_opening_hours', []);
    ensureKey('service_categories', []);
    ensureKey('brands', []);
    ensureKey('provider_services', []);
    ensureKey('reviews', []);
    ensureKey('favorite_providers', []);
    ensureKey('compare_lists', []);
    ensureKey('appointment_bookings', []);
    ensureKey('quote_requests', []);
    ensureKey('home_visit_requests', []);
    ensureKey('pickup_requests', []);
    ensureKey('provider_messages', []);

    // Single-record or auxiliary tables
    if (localStorage.getItem('profile') === null) {
      localStorage.setItem('profile', 'null');
    }
    if (localStorage.getItem('current_location') === null) {
      localStorage.setItem('current_location', 'null');
    }
    ensureKey('site_contact_messages', []);

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      const parsed = JSON.parse(data);
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------------------- Location Helpers ----------------------

  _parseLocationText(location_text) {
    if (!location_text || typeof location_text !== 'string') {
      return {
        display_name: '',
        postal_code: '',
        city: '',
        state: '',
        latitude: null,
        longitude: null
      };
    }

    const trimmed = location_text.trim();
    const zipMatch = /^\d{5}(-\d{4})?$/.test(trimmed);

    if (zipMatch) {
      return {
        display_name: trimmed,
        postal_code: trimmed,
        city: '',
        state: '',
        latitude: null,
        longitude: null
      };
    }

    const parts = trimmed.split(',');
    let city = trimmed;
    let state = '';
    if (parts.length >= 2) {
      city = parts[0].trim();
      state = parts[1].trim();
    }

    return {
      display_name: trimmed,
      postal_code: '',
      city,
      state,
      latitude: null,
      longitude: null
    };
  }

  _getCurrentLocation() {
    const loc = this._getFromStorage('current_location', null);
    if (loc && typeof loc === 'object') return loc;
    return null;
  }

  _setCurrentLocationObject(loc) {
    this._saveToStorage('current_location', loc);
  }

  _computeDistanceMiles(location, provider) {
    if (!location || !provider) return null;

    const locLat = typeof location.latitude === 'number' ? location.latitude : null;
    const locLon = typeof location.longitude === 'number' ? location.longitude : null;

    if (locLat != null && locLon != null && typeof provider.latitude === 'number' && typeof provider.longitude === 'number') {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 3958.8; // miles
      const dLat = toRad(provider.latitude - locLat);
      const dLon = toRad(provider.longitude - locLon);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(locLat)) *
          Math.cos(toRad(provider.latitude)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // Fallbacks using postal code / city-state matching
    if (location.postal_code && location.postal_code === provider.postal_code) {
      return 0;
    }
    // If we only have ZIP codes and they share the same prefix (e.g., 10001 vs 10018),
    // treat them as being in the same general area so distance filters still work.
    if (
      location.postal_code &&
      provider.postal_code &&
      typeof location.postal_code === 'string' &&
      typeof provider.postal_code === 'string' &&
      location.postal_code.slice(0, 3) === provider.postal_code.slice(0, 3)
    ) {
      return 5;
    }
    if (
      location.city &&
      provider.city &&
      location.state &&
      provider.state &&
      location.city.toLowerCase() === provider.city.toLowerCase() &&
      location.state.toLowerCase() === provider.state.toLowerCase()
    ) {
      return 5; // arbitrary small distance within same city
    }

    return 99999; // effectively very far
  }

  // ---------------------- Foreign Key Resolution Helpers ----------------------

  _resolveServiceCategoryRelations(categories) {
    const all = Array.isArray(categories) ? categories : [];
    const byId = {};
    all.forEach((c) => {
      if (c && c.id) byId[c.id] = c;
    });
    return all.map((c) => ({
      ...c,
      parent_category: c && c.parent_category_id ? byId[c.parent_category_id] || null : null
    }));
  }

  _resolveProviderServicesRelations(services) {
    const all = Array.isArray(services) ? services : [];
    const categories = this._getFromStorage('service_categories', []);
    const brands = this._getFromStorage('brands', []);
    const providers = this._getFromStorage('providers', []);

    return all.map((s) => ({
      ...s,
      service_category: s && s.service_category_id ? categories.find((c) => c.id === s.service_category_id) || null : null,
      brand: s && s.brand_id ? brands.find((b) => b.id === s.brand_id) || null : null,
      provider: s && s.providerId ? providers.find((p) => p.id === s.providerId) || null : null
    }));
  }

  _getDescendantCategoryIds(rootId) {
    if (!rootId) return [];
    const all = this._getFromStorage('service_categories', []);
    const result = new Set([rootId]);
    let added = true;
    while (added) {
      added = false;
      all.forEach((c) => {
        if (c.parent_category_id && result.has(c.parent_category_id) && !result.has(c.id)) {
          result.add(c.id);
          added = true;
        }
      });
    }
    return Array.from(result);
  }

  // ---------------------- Single-user helpers ----------------------

  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists', []);
    if (!Array.isArray(lists)) {
      lists = [];
    }
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('compare'),
        providerIds: [],
        created_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
    }
    return list;
  }

  _saveCompareList(updatedList) {
    let lists = this._getFromStorage('compare_lists', []);
    if (!Array.isArray(lists) || !lists.length) {
      lists = [updatedList];
    } else {
      lists[0] = updatedList;
    }
    this._saveToStorage('compare_lists', lists);
  }

  _getOrCreateFavorites() {
    let favorites = this._getFromStorage('favorite_providers', []);
    if (!Array.isArray(favorites)) favorites = [];
    return favorites;
  }

  _saveFavorites(favorites) {
    this._saveToStorage('favorite_providers', favorites || []);
  }

  _getOrCreateProfile() {
    let profile = this._getFromStorage('profile', null);
    if (!profile || typeof profile !== 'object') {
      profile = {
        id: this._generateId('profile'),
        full_name: '',
        email: '',
        phone: '',
        preferred_contact_method: 'either',
        preferred_zip: '',
        preferred_city: '',
        preferred_state: '',
        preferred_location_type: 'none',
        communication_consent: false,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('profile', profile);
    }
    return profile;
  }

  _saveProfileObject(profile) {
    this._saveToStorage('profile', profile);
  }

  // ---------------------- Core Interface Implementations ----------------------

  // getHomePageData()
  getHomePageData() {
    const current_location = this._getCurrentLocation();

    const quick_search_examples = [
      {
        label: 'iPhone screen repair near me',
        query: 'iPhone screen repair',
        service_code: 'smartphone_screen_repair'
      },
      {
        label: 'Laptop data recovery',
        query: 'laptop data recovery',
        service_code: 'laptop_data_recovery'
      },
      {
        label: 'Washing machine repair',
        query: 'washing machine repair',
        service_code: 'washing_machine_repair'
      },
      {
        label: 'Tablet charging port repair',
        query: 'tablet charging port repair',
        service_code: 'tablet_charging_port_repair'
      }
    ];

    const allCategories = this._getFromStorage('service_categories', []);
    const topLevel = allCategories.filter((c) => !c.parent_category_id);
    const top_categories = this._resolveServiceCategoryRelations(topLevel).sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
      return sa - sb;
    });

    const providers = this._getFromStorage('providers', []);
    const featured_providers = providers
      .slice()
      .sort((a, b) => {
        if (b.rating_average !== a.rating_average) return b.rating_average - a.rating_average;
        return b.rating_count - a.rating_count;
      })
      .slice(0, 10);

    return {
      current_location,
      quick_search_examples,
      top_categories,
      featured_providers
    };
  }

  // setCurrentLocation(location_text)
  setCurrentLocation(location_text) {
    const resolved = this._parseLocationText(location_text);
    this._setCurrentLocationObject(resolved);
    return {
      success: true,
      resolved_location: resolved,
      message: 'Location updated.'
    };
  }

  // getServiceCategories(parentCategoryId)
  getServiceCategories(parentCategoryId) {
    const all = this._getFromStorage('service_categories', []);
    const filtered = parentCategoryId
      ? all.filter((c) => c.parent_category_id === parentCategoryId)
      : all.filter((c) => !c.parent_category_id);
    return this._resolveServiceCategoryRelations(filtered);
  }

  // getSearchFilterOptions(query, service_code, service_category_id)
  getSearchFilterOptions(query, service_code, service_category_id) {
    const distance_options_miles = [3, 5, 10, 20, 25, 50];
    const rating_thresholds = [3, 4, 4.5];

    const sort_options = [
      { value: 'relevance', label: 'Best match' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'distance_asc', label: 'Distance: Nearest first' }
    ];

    const service_type_filters = [
      { service_code: 'smartphone_screen_repair', label: 'Smartphone screen repair' },
      { service_code: 'laptop_battery_replacement', label: 'Laptop battery replacement' },
      { service_code: 'console_hdmi_port_repair', label: 'Game console HDMI port repair' },
      { service_code: 'washing_machine_repair', label: 'Washing machine repair' },
      { service_code: 'laptop_data_recovery', label: 'Laptop data recovery' },
      { service_code: 'tablet_charging_port_repair', label: 'Tablet charging port repair' }
    ];

    const visit_type_filters = {
      in_store: true,
      home_visit: true,
      pickup_delivery: true,
      free_pickup: true
    };

    const availability_filters = {
      supports_24_7: true,
      supports_emergency: true,
      supports_open_on_saturday: true,
      supports_close_after_time: true
    };

    const fee_and_benefit_filters = {
      supports_free_diagnostic: true,
      supports_no_diagnostic_fee: true,
      supports_no_fix_no_fee: true
    };

    const services = this._getFromStorage('provider_services', []);
    const pricesByCode = {};
    services.forEach((s) => {
      if (!s || !s.service_code) return;
      const code = s.service_code;
      const prices = [];
      if (typeof s.base_price === 'number') prices.push(s.base_price);
      if (typeof s.min_price === 'number') prices.push(s.min_price);
      if (typeof s.max_price === 'number') prices.push(s.max_price);
      if (!prices.length) return;
      const max = Math.max(...prices);
      if (!pricesByCode[code] || max > pricesByCode[code]) {
        pricesByCode[code] = max;
      }
    });

    const price_filter_presets = Object.keys(pricesByCode).map((code) => ({
      service_code: code,
      label: code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      suggested_max_price: pricesByCode[code]
    }));

    return {
      distance_options_miles,
      rating_thresholds,
      sort_options,
      service_type_filters,
      visit_type_filters,
      availability_filters,
      fee_and_benefit_filters,
      price_filter_presets
    };
  }

  // searchProviders(...)
  searchProviders(
    query,
    location_text,
    distance_miles_max,
    rating_min,
    service_code,
    service_category_id,
    price_filter,
    visit_type_filters,
    availability_filters,
    fee_filters,
    sort_by,
    view_mode,
    page,
    page_size
  ) {
    const providers = this._getFromStorage('providers', []);
    const services = this._getFromStorage('provider_services', []);
    const favorites = this._getFromStorage('favorite_providers', []);
    const compareList = this._getOrCreateCompareList();

    const locationOverride = location_text ? this._parseLocationText(location_text) : null;
    const location = locationOverride || this._getCurrentLocation();

    const normalizedQuery = query ? String(query).trim().toLowerCase() : '';

    let categoryIdsFilter = null;
    if (service_category_id) {
      categoryIdsFilter = this._getDescendantCategoryIds(service_category_id);
    }

    // Instrumentation for task completion tracking
    try {
      const currentLocForInstrumentation = this._getCurrentLocation
        ? this._getCurrentLocation()
        : null;
      const location_text_used =
        location_text ||
        (currentLocForInstrumentation
          ? currentLocForInstrumentation.display_name || currentLocForInstrumentation.postal_code
          : null);

      const baseParams = {
        query,
        location_text_used,
        distance_miles_max,
        rating_min,
        service_code,
        service_category_id,
        price_filter,
        visit_type_filters,
        availability_filters,
        fee_filters,
        sort_by,
        view_mode,
        timestamp: this._nowIso()
      };

      // Task 1: iPhone 12 screen repair / smartphone_screen_repair with price filter
      if (
        (normalizedQuery &&
          normalizedQuery.includes('iphone 12 screen repair')) ||
        (service_code === 'smartphone_screen_repair' &&
          price_filter &&
          price_filter.service_code === 'smartphone_screen_repair')
      ) {
        localStorage.setItem('task1_searchParams', JSON.stringify(baseParams));
      }

      // Task 2: laptop battery replacement
      if (
        (normalizedQuery &&
          normalizedQuery.includes('laptop battery replacement')) ||
        service_code === 'laptop_battery_replacement'
      ) {
        localStorage.setItem('task2_searchParams', JSON.stringify(baseParams));
      }

      // Task 3: console HDMI / PS5 repairs
      if (
        (normalizedQuery &&
          (normalizedQuery.includes('playstation 5 hdmi port repair') ||
            normalizedQuery.includes('ps5 hdmi'))) ||
        service_code === 'console_hdmi_port_repair'
      ) {
        localStorage.setItem('task3_searchParams', JSON.stringify(baseParams));
      }

      // Task 4: washing machine repair
      if (
        (normalizedQuery &&
          normalizedQuery.includes('washing machine repair')) ||
        service_code === 'washing_machine_repair'
      ) {
        localStorage.setItem('task4_searchParams', JSON.stringify(baseParams));
      }

      // Task 6: smartphone repair near 30301, map view
      const isSmartphoneSearchForTask6 =
        service_code === 'smartphone_repair' ||
        service_code === 'smartphone_screen_repair' ||
        (normalizedQuery &&
          (normalizedQuery.includes('smartphone repair') ||
            normalizedQuery.includes('phone repair')));
      const isMapViewForTask6 = view_mode === 'map' || view_mode === 'map_view';

      if (isSmartphoneSearchForTask6 && isMapViewForTask6) {
        localStorage.setItem('task6_searchParams', JSON.stringify(baseParams));
      }

      // Task 7: tablet charging port repair
      if (
        (normalizedQuery &&
          normalizedQuery.includes('tablet charging port repair')) ||
        service_code === 'tablet_charging_port_repair'
      ) {
        localStorage.setItem('task7_searchParams', JSON.stringify(baseParams));
      }

      // Task 8: laptop data recovery
      if (
        (normalizedQuery &&
          normalizedQuery.includes('laptop data recovery')) ||
        service_code === 'laptop_data_recovery'
      ) {
        localStorage.setItem('task8_searchParams', JSON.stringify(baseParams));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // Group services by provider
    const servicesByProvider = {};
    services.forEach((s) => {
      if (!s || !s.providerId) return;
      if (!servicesByProvider[s.providerId]) servicesByProvider[s.providerId] = [];
      servicesByProvider[s.providerId].push(s);
    });

    // Filter providers
    const filtered = [];

    providers.forEach((provider) => {
      let matched_services = servicesByProvider[provider.id] || [];

      // service_code filter (with simple equivalence mapping for similar codes)
      if (service_code) {
        const serviceCodeVariants =
          service_code === 'smartphone_repair'
            ? ['smartphone_repair', 'smartphone_screen_repair']
            : service_code === 'smartphone_screen_repair'
            ? ['smartphone_screen_repair', 'smartphone_repair']
            : [service_code];
        matched_services = matched_services.filter(
          (s) => s && serviceCodeVariants.includes(s.service_code)
        );
        if (!matched_services.length) return;
      }

      // category filter
      if (categoryIdsFilter && categoryIdsFilter.length) {
        matched_services = matched_services.filter((s) => !s.service_category_id || categoryIdsFilter.includes(s.service_category_id));
        if (!matched_services.length) return;
      }

      // price filter
      if (price_filter && price_filter.service_code && typeof price_filter.max_price === 'number') {
        const relevant = matched_services.filter((s) => s.service_code === price_filter.service_code);
        let withinPrice = true;

        if (relevant.length) {
          withinPrice = relevant.some((s) => {
            const prices = [];
            if (typeof s.base_price === 'number') prices.push(s.base_price);
            if (typeof s.min_price === 'number') prices.push(s.min_price);
            if (typeof s.max_price === 'number') prices.push(s.max_price);
            if (!prices.length) return false;
            return Math.min(...prices) <= price_filter.max_price;
          });
        } else {
          // If provider has no services for the requested price_filter.service_code,
          // fall back to any priced service instead of excluding it outright.
          withinPrice = matched_services.some((s) => {
            if (!s) return false;
            const prices = [];
            if (typeof s.base_price === 'number') prices.push(s.base_price);
            if (typeof s.min_price === 'number') prices.push(s.min_price);
            if (typeof s.max_price === 'number') prices.push(s.max_price);
            if (!prices.length) return false;
            return Math.min(...prices) <= price_filter.max_price;
          });
        }

        if (!withinPrice) return;
      }

      // rating filter
      if (typeof rating_min === 'number' && provider.rating_average < rating_min) return;

      // query filter (soft when structured filters are present)
      if (normalizedQuery) {
        const inName = provider.name && provider.name.toLowerCase().includes(normalizedQuery);
        const inCity = provider.city && provider.city.toLowerCase().includes(normalizedQuery);
        const inServices = matched_services.some((s) => {
          if (!s) return false;
          if (s.name && s.name.toLowerCase().includes(normalizedQuery)) return true;
          if (s.device_brand && s.device_brand.toLowerCase().includes(normalizedQuery)) return true;
          if (s.device_model && s.device_model.toLowerCase().includes(normalizedQuery)) return true;
          return false;
        });

        const hasVisitFilters =
          visit_type_filters &&
          Object.keys(visit_type_filters).some((k) => visit_type_filters[k]);
        const hasAvailabilityFilters =
          availability_filters &&
          (availability_filters.require_24_7 ||
            availability_filters.require_emergency_service ||
            !!availability_filters.open_on_day_of_week ||
            !!availability_filters.close_after_time);
        const hasFeeFilters =
          fee_filters &&
          (fee_filters.require_free_diagnostic ||
            fee_filters.require_no_diagnostic_fee ||
            fee_filters.require_no_fix_no_fee);
        const hasPriceFilter =
          price_filter && typeof price_filter.max_price === 'number';
        const hasStructuredFilters =
          !!service_code ||
          !!service_category_id ||
          hasPriceFilter ||
          hasVisitFilters ||
          hasAvailabilityFilters ||
          hasFeeFilters;

        if (!inName && !inCity && !inServices && !hasStructuredFilters) return;
      }

      // visit type filters
      if (visit_type_filters) {
        if (visit_type_filters.in_store) {
          const ok =
            provider.offers_in_store === true ||
            matched_services.some((s) => s.is_in_store_available === true);
          if (!ok) return;
        }
        if (visit_type_filters.home_visit) {
          const ok =
            provider.offers_home_visit === true ||
            matched_services.some((s) => s.is_home_visit_available === true);
          if (!ok) return;
        }
        if (visit_type_filters.pickup_delivery) {
          const ok =
            provider.offers_pickup_delivery === true ||
            matched_services.some((s) => s.is_pickup_delivery_available === true);
          if (!ok) return;
        }
        if (visit_type_filters.free_pickup) {
          const ok =
            provider.offers_free_pickup === true ||
            matched_services.some((s) => s.is_free_pickup === true);
          if (!ok) return;
        }
      }

      // availability filters
      if (availability_filters) {
        const openingHours = this._getFromStorage('provider_opening_hours', []).filter(
          (oh) => oh.providerId === provider.id
        );

        if (availability_filters.require_24_7) {
          if (!provider.is_24_7) {
            const any24 = openingHours.some((oh) => oh.is_open_24_hours === true && !oh.is_closed);
            if (!any24) return;
          }
        }

        if (availability_filters.require_emergency_service) {
          if (!provider.has_emergency_service) return;
        }

        if (availability_filters.open_on_day_of_week) {
          const day = availability_filters.open_on_day_of_week.toLowerCase();
          let matches = openingHours.filter((oh) => oh.day_of_week === day && !oh.is_closed);
          if (!matches.length) return;

          if (availability_filters.close_after_time) {
            const t = availability_filters.close_after_time;
            matches = matches.filter((oh) => {
              if (oh.is_open_24_hours) return true;
              if (!oh.close_time) return false;
              // times are HH:MM, so string comparison works
              return oh.close_time >= t;
            });
            if (!matches.length) return;
          }
        }
      }

      // fee filters
      if (fee_filters) {
        if (fee_filters.require_free_diagnostic) {
          const ok =
            provider.has_free_diagnostic === true ||
            matched_services.some((s) => s.has_free_diagnostic === true);
          if (!ok) return;
        }
        if (fee_filters.require_no_diagnostic_fee) {
          const ok =
            provider.has_no_diagnostic_fee === true ||
            provider.default_diagnostic_fee === 0 ||
            matched_services.some(
              (s) => s.has_no_diagnostic_fee === true || s.diagnostic_fee_amount === 0
            );
          if (!ok) return;
        }
        if (fee_filters.require_no_fix_no_fee) {
          const ok =
            provider.has_no_fix_no_fee === true ||
            matched_services.some((s) => s.has_no_fix_no_fee === true);
          if (!ok) return;
        }
      }

      const distance_miles = location ? this._computeDistanceMiles(location, provider) : null;

      if (typeof distance_miles_max === 'number') {
        const d = distance_miles == null ? 99999 : distance_miles;
        if (d > distance_miles_max) return;
      }

      // compute price range for filtered service if applicable
      let lowest_price_for_filtered_service = null;
      let highest_price_for_filtered_service = null;
      const priceRelevantCode = (price_filter && price_filter.service_code) || service_code;
      if (priceRelevantCode) {
        const relevant = matched_services.filter((s) => s.service_code === priceRelevantCode);
        const prices = [];
        relevant.forEach((s) => {
          if (typeof s.base_price === 'number') prices.push(s.base_price);
          if (typeof s.min_price === 'number') prices.push(s.min_price);
          if (typeof s.max_price === 'number') prices.push(s.max_price);
        });
        if (prices.length) {
          lowest_price_for_filtered_service = Math.min(...prices);
          highest_price_for_filtered_service = Math.max(...prices);
        }
      }

      const is_favorite = favorites.some((f) => f.providerId === provider.id);

      filtered.push({
        provider,
        matched_services,
        distance_miles,
        lowest_price_for_filtered_service,
        highest_price_for_filtered_service,
        is_favorite
      });
    });

    // Sorting
    const sortKey = sort_by || 'relevance';
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'rating_desc': {
          if (b.provider.rating_average !== a.provider.rating_average) {
            return b.provider.rating_average - a.provider.rating_average;
          }
          return b.provider.rating_count - a.provider.rating_count;
        }
        case 'price_asc': {
          const ap = a.lowest_price_for_filtered_service ?? Number.MAX_SAFE_INTEGER;
          const bp = b.lowest_price_for_filtered_service ?? Number.MAX_SAFE_INTEGER;
          if (ap !== bp) return ap - bp;
          return a.provider.rating_average - b.provider.rating_average;
        }
        case 'price_desc': {
          const ap = a.highest_price_for_filtered_service ?? 0;
          const bp = b.highest_price_for_filtered_service ?? 0;
          if (ap !== bp) return bp - ap;
          return b.provider.rating_average - a.provider.rating_average;
        }
        case 'distance_asc': {
          const ad = a.distance_miles == null ? 99999 : a.distance_miles;
          const bd = b.distance_miles == null ? 99999 : b.distance_miles;
          if (ad !== bd) return ad - bd;
          return b.provider.rating_average - a.provider.rating_average;
        }
        case 'relevance':
        default: {
          // For now, relevance ~ rating_desc
          if (b.provider.rating_average !== a.provider.rating_average) {
            return b.provider.rating_average - a.provider.rating_average;
          }
          return b.provider.rating_count - a.provider.rating_count;
        }
      }
    });

    // Pagination
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_results = filtered.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItemsRaw = filtered.slice(start, end);

    // Resolve foreign keys on matched_services
    const pageItems = pageItemsRaw.map((item) => ({
      ...item,
      matched_services: this._resolveProviderServicesRelations(item.matched_services)
    }));

    const map_pins = filtered.map((item) => ({
      providerId: item.provider.id,
      latitude: item.provider.latitude,
      longitude: item.provider.longitude,
      distance_miles: item.distance_miles,
      name: item.provider.name,
      rating_average: item.provider.rating_average,
      rating_count: item.provider.rating_count,
      is_favorite: item.is_favorite
    }));

    const location_display_name = location
      ? location.display_name || location.postal_code || `${location.city || ''} ${location.state || ''}`.trim()
      : '';

    return {
      providers: pageItems,
      total_results,
      page: currentPage,
      page_size: size,
      applied_filters_summary: {
        location_display_name,
        distance_miles_max: typeof distance_miles_max === 'number' ? distance_miles_max : null,
        rating_min: typeof rating_min === 'number' ? rating_min : null,
        sort_by: sortKey
      },
      map_pins,
      compare_selection_count: Array.isArray(compareList.providerIds)
        ? compareList.providerIds.length
        : 0
    };
  }

  // getProviderDetail(providerId)
  getProviderDetail(providerId) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId) || null;

    if (!provider) {
      return {
        provider: null,
        opening_hours: [],
        services: [],
        max_warranty_months: 0,
        diagnostic_fee_policy: {
          has_free_diagnostic: false,
          has_no_diagnostic_fee: false,
          default_diagnostic_fee: null,
          has_no_fix_no_fee: false
        },
        review_summary: {
          rating_average: 0,
          rating_count: 0,
          rating_breakdown: {
            five_star: 0,
            four_star: 0,
            three_star: 0,
            two_star: 0,
            one_star: 0
          }
        },
        is_favorite: false,
        supports: {
          in_store: false,
          home_visit: false,
          pickup_delivery: false,
          free_pickup: false,
          emergency_service: false,
          is_24_7: false
        }
      };
    }

    // Instrumentation for task 6 selected provider tracking
    try {
      const currentLocForTask6 = this._getCurrentLocation
        ? this._getCurrentLocation()
        : null;
      if (
        currentLocForTask6 &&
        currentLocForTask6.postal_code === '30301' &&
        (provider.is_24_7 === true || provider.has_emergency_service === true)
      ) {
        localStorage.setItem('task6_selectedProviderId', providerId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const opening_hours_raw = this._getFromStorage('provider_opening_hours', []).filter(
      (oh) => oh.providerId === providerId
    );
    const opening_hours = opening_hours_raw.map((oh) => ({
      ...oh,
      provider: provider
    }));

    const servicesRaw = this._getFromStorage('provider_services', []).filter(
      (s) => s.providerId === providerId
    );
    const services = this._resolveProviderServicesRelations(servicesRaw);

    let maxWarranty = 0;
    if (typeof provider.max_warranty_months === 'number') {
      maxWarranty = provider.max_warranty_months;
    }
    services.forEach((s) => {
      if (typeof s.warranty_months === 'number' && s.warranty_months > maxWarranty) {
        maxWarranty = s.warranty_months;
      }
    });

    // Diagnostic fee policy
    let has_free_diagnostic = !!provider.has_free_diagnostic;
    let has_no_diagnostic_fee = !!provider.has_no_diagnostic_fee;
    let default_diagnostic_fee =
      typeof provider.default_diagnostic_fee === 'number'
        ? provider.default_diagnostic_fee
        : null;
    let has_no_fix_no_fee = !!provider.has_no_fix_no_fee;

    services.forEach((s) => {
      if (s.has_free_diagnostic) has_free_diagnostic = true;
      if (s.has_no_diagnostic_fee || s.diagnostic_fee_amount === 0) has_no_diagnostic_fee = true;
      if (typeof s.diagnostic_fee_amount === 'number') {
        if (default_diagnostic_fee == null || s.diagnostic_fee_amount < default_diagnostic_fee) {
          default_diagnostic_fee = s.diagnostic_fee_amount;
        }
      }
      if (s.has_no_fix_no_fee) has_no_fix_no_fee = true;
    });

    const reviews = this._getFromStorage('reviews', []).filter((r) => r.providerId === providerId);
    const rating_count = reviews.length;
    let rating_sum = 0;
    const breakdown = {
      five_star: 0,
      four_star: 0,
      three_star: 0,
      two_star: 0,
      one_star: 0
    };
    reviews.forEach((r) => {
      const rating = r.rating || 0;
      rating_sum += rating;
      if (rating >= 4.5) breakdown.five_star++;
      else if (rating >= 3.5) breakdown.four_star++;
      else if (rating >= 2.5) breakdown.three_star++;
      else if (rating >= 1.5) breakdown.two_star++;
      else breakdown.one_star++;
    });
    const rating_average = rating_count ? rating_sum / rating_count : 0;

    const favorites = this._getFromStorage('favorite_providers', []);
    const is_favorite = favorites.some((f) => f.providerId === providerId);

    const supports = {
      in_store:
        provider.offers_in_store === true || services.some((s) => s.is_in_store_available),
      home_visit:
        provider.offers_home_visit === true || services.some((s) => s.is_home_visit_available),
      pickup_delivery:
        provider.offers_pickup_delivery === true ||
        services.some((s) => s.is_pickup_delivery_available),
      free_pickup:
        provider.offers_free_pickup === true || services.some((s) => s.is_free_pickup),
      emergency_service: provider.has_emergency_service === true,
      is_24_7: provider.is_24_7 === true
    };

    return {
      provider,
      opening_hours,
      services,
      max_warranty_months: maxWarranty,
      diagnostic_fee_policy: {
        has_free_diagnostic,
        has_no_diagnostic_fee,
        default_diagnostic_fee,
        has_no_fix_no_fee
      },
      review_summary: {
        rating_average,
        rating_count,
        rating_breakdown: breakdown
      },
      is_favorite,
      supports
    };
  }

  // getProviderReviews(providerId, page, page_size)
  getProviderReviews(providerId, page, page_size) {
    const allReviews = this._getFromStorage('reviews', []).filter(
      (r) => r.providerId === providerId
    );
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    allReviews.sort((a, b) => {
      const ad = a.created_at || '';
      const bd = b.created_at || '';
      return bd.localeCompare(ad);
    });

    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItemsRaw = allReviews.slice(start, end);

    const providers = this._getFromStorage('providers', []);
    const reviews = pageItemsRaw.map((r) => ({
      ...r,
      provider: providers.find((p) => p.id === r.providerId) || null
    }));

    return {
      reviews,
      total_count: allReviews.length,
      page: currentPage,
      page_size: size
    };
  }

  // submitProviderReview(providerId, rating, comment, visit_type, service_code, visit_date)
  submitProviderReview(providerId, rating, comment, visit_type, service_code, visit_date) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      return {
        success: false,
        review: null,
        updated_rating_average: null,
        updated_rating_count: null,
        message: 'Provider not found.'
      };
    }

    let r = Number(rating);
    if (!Number.isFinite(r)) r = 0;
    if (r < 1) r = 1;
    if (r > 5) r = 5;

    const reviews = this._getFromStorage('reviews', []);
    const newReview = {
      id: this._generateId('review'),
      providerId,
      rating: r,
      comment: comment || '',
      visit_type: visit_type || null,
      service_code: service_code || null,
      created_at: this._nowIso(),
      updated_at: null,
      visit_date: visit_date || null,
      provider_response: null
    };

    reviews.push(newReview);
    this._saveToStorage('reviews', reviews);

    // Recalculate provider rating from all reviews for this provider
    const providerReviews = reviews.filter((rev) => rev.providerId === providerId);
    const rating_count = providerReviews.length;
    const rating_sum = providerReviews.reduce((sum, rev) => sum + (rev.rating || 0), 0);
    const rating_average = rating_count ? rating_sum / rating_count : 0;

    provider.rating_average = rating_average;
    provider.rating_count = rating_count;
    this._saveToStorage('providers', providers);

    return {
      success: true,
      review: newReview,
      updated_rating_average: rating_average,
      updated_rating_count: rating_count,
      message: 'Review submitted.'
    };
  }

  // addProviderToCompare(providerId)
  addProviderToCompare(providerId) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      return {
        success: false,
        compare_list: null,
        providers: [],
        message: 'Provider not found.'
      };
    }

    const list = this._getOrCreateCompareList();
    if (!Array.isArray(list.providerIds)) {
      list.providerIds = [];
    }
    if (!list.providerIds.includes(providerId)) {
      list.providerIds.push(providerId);
      this._saveCompareList(list);
    }

    const compareProviders = providers.filter((p) => list.providerIds.includes(p.id));

    return {
      success: true,
      compare_list: list,
      providers: compareProviders,
      message: 'Provider added to compare list.'
    };
  }

  // removeProviderFromCompare(providerId)
  removeProviderFromCompare(providerId) {
    const providers = this._getFromStorage('providers', []);
    const list = this._getOrCreateCompareList();
    if (!Array.isArray(list.providerIds)) {
      list.providerIds = [];
    }

    list.providerIds = list.providerIds.filter((id) => id !== providerId);
    this._saveCompareList(list);

    const compareProviders = providers.filter((p) => list.providerIds.includes(p.id));

    return {
      success: true,
      compare_list: list,
      providers: compareProviders,
      message: 'Provider removed from compare list.'
    };
  }

  // clearCompareList()
  clearCompareList() {
    const list = this._getOrCreateCompareList();
    list.providerIds = [];
    this._saveCompareList(list);
    return {
      success: true,
      compare_list: list
    };
  }

  // getCompareView()
  getCompareView() {
    const list = this._getOrCreateCompareList();
    const providers = this._getFromStorage('providers', []);
    const services = this._getFromStorage('provider_services', []);

    const providers_comparison = (list.providerIds || []).map((pid) => {
      const provider = providers.find((p) => p.id === pid) || null;
      const providerServicesRaw = services.filter((s) => s.providerId === pid);
      const providerServices = this._resolveProviderServicesRelations(providerServicesRaw);

      let maxWarranty = 0;
      if (provider && typeof provider.max_warranty_months === 'number') {
        maxWarranty = provider.max_warranty_months;
      }
      providerServices.forEach((s) => {
        if (typeof s.warranty_months === 'number' && s.warranty_months > maxWarranty) {
          maxWarranty = s.warranty_months;
        }
      });

      let has_free_diagnostic = provider ? !!provider.has_free_diagnostic : false;
      let has_no_diagnostic_fee = provider ? !!provider.has_no_diagnostic_fee : false;
      let default_diagnostic_fee = provider && typeof provider.default_diagnostic_fee === 'number'
        ? provider.default_diagnostic_fee
        : null;
      let has_no_fix_no_fee = provider ? !!provider.has_no_fix_no_fee : false;

      providerServices.forEach((s) => {
        if (s.has_free_diagnostic) has_free_diagnostic = true;
        if (s.has_no_diagnostic_fee || s.diagnostic_fee_amount === 0) has_no_diagnostic_fee = true;
        if (typeof s.diagnostic_fee_amount === 'number') {
          if (default_diagnostic_fee == null || s.diagnostic_fee_amount < default_diagnostic_fee) {
            default_diagnostic_fee = s.diagnostic_fee_amount;
          }
        }
        if (s.has_no_fix_no_fee) has_no_fix_no_fee = true;
      });

      return {
        provider,
        representative_services: providerServices,
        max_warranty_months: maxWarranty,
        diagnostic_fee_policy: {
          has_free_diagnostic,
          has_no_diagnostic_fee,
          default_diagnostic_fee,
          has_no_fix_no_fee
        }
      };
    });

    return {
      compare_list: list,
      providers_comparison
    };
  }

  // addProviderToFavorites(providerId)
  addProviderToFavorites(providerId) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      return {
        success: false,
        favorite: null,
        favorites_count: 0,
        message: 'Provider not found.'
      };
    }

    const favorites = this._getOrCreateFavorites();
    const existing = favorites.find((f) => f.providerId === providerId);
    if (existing) {
      return {
        success: true,
        favorite: existing,
        favorites_count: favorites.length,
        message: 'Provider already in favorites.'
      };
    }

    const favorite = {
      id: this._generateId('favorite'),
      providerId,
      created_at: this._nowIso()
    };
    favorites.push(favorite);
    this._saveFavorites(favorites);

    return {
      success: true,
      favorite,
      favorites_count: favorites.length,
      message: 'Provider added to favorites.'
    };
  }

  // removeProviderFromFavorites(providerId)
  removeProviderFromFavorites(providerId) {
    let favorites = this._getOrCreateFavorites();
    favorites = favorites.filter((f) => f.providerId !== providerId);
    this._saveFavorites(favorites);
    return {
      success: true,
      favorites_count: favorites.length,
      message: 'Provider removed from favorites.'
    };
  }

  // getFavoriteProviders()
  getFavoriteProviders() {
    const favorites = this._getOrCreateFavorites();
    const providers = this._getFromStorage('providers', []);

    const result = favorites.map((fav) => ({
      favorite: fav,
      provider: providers.find((p) => p.id === fav.providerId) || null
    }));

    return { favorites: result };
  }

  // getProfile()
  getProfile() {
    return this._getOrCreateProfile();
  }

  // saveProfile(profile)
  saveProfile(profile) {
    const existing = this._getOrCreateProfile();
    const updated = {
      ...existing,
      full_name: profile.full_name !== undefined ? profile.full_name : existing.full_name,
      email: profile.email !== undefined ? profile.email : existing.email,
      phone: profile.phone !== undefined ? profile.phone : existing.phone,
      preferred_contact_method:
        profile.preferred_contact_method !== undefined
          ? profile.preferred_contact_method
          : existing.preferred_contact_method,
      preferred_zip:
        profile.preferred_zip !== undefined ? profile.preferred_zip : existing.preferred_zip,
      preferred_city:
        profile.preferred_city !== undefined ? profile.preferred_city : existing.preferred_city,
      preferred_state:
        profile.preferred_state !== undefined ? profile.preferred_state : existing.preferred_state,
      preferred_location_type:
        profile.preferred_location_type !== undefined
          ? profile.preferred_location_type
          : existing.preferred_location_type,
      communication_consent:
        profile.communication_consent !== undefined
          ? profile.communication_consent
          : existing.communication_consent,
      updated_at: this._nowIso()
    };

    // Optionally store password on profile; though not part of formal entity, still serializable
    if (Object.prototype.hasOwnProperty.call(profile, 'password')) {
      updated.password = profile.password;
    }

    this._saveProfileObject(updated);
    return updated;
  }

  // createAppointmentBooking(booking)
  createAppointmentBooking(booking) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === booking.providerId);
    if (!provider) {
      return {
        success: false,
        booking: null,
        message: 'Provider not found.'
      };
    }

    const appointment_bookings = this._getFromStorage('appointment_bookings', []);

    const newBooking = {
      id: this._generateId('appt'),
      providerId: booking.providerId,
      providerServiceId: booking.providerServiceId || null,
      booking_type: booking.booking_type,
      appointment_datetime: booking.appointment_datetime,
      device_type: booking.device_type || null,
      device_brand: booking.device_brand || null,
      device_model: booking.device_model || null,
      issue_description: booking.issue_description || null,
      notes: booking.notes || null,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email || null,
      status: 'pending',
      created_at: this._nowIso()
    };

    appointment_bookings.push(newBooking);
    this._saveToStorage('appointment_bookings', appointment_bookings);

    return {
      success: true,
      booking: newBooking,
      message: 'Appointment booking created.'
    };
  }

  // createQuoteRequest(quote)
  createQuoteRequest(quote) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === quote.providerId);
    if (!provider) {
      return {
        success: false,
        quote_request: null,
        message: 'Provider not found.'
      };
    }

    const quote_requests = this._getFromStorage('quote_requests', []);

    const newQuote = {
      id: this._generateId('quote'),
      providerId: quote.providerId,
      providerServiceId: quote.providerServiceId || null,
      device_type: quote.device_type || null,
      brand_id: quote.brand_id || null,
      brand_name: quote.brand_name || null,
      model_name: quote.model_name || null,
      problem_description: quote.problem_description,
      budget_max: typeof quote.budget_max === 'number' ? quote.budget_max : null,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_email: quote.customer_email || null,
      status: 'sent',
      created_at: this._nowIso()
    };

    quote_requests.push(newQuote);
    this._saveToStorage('quote_requests', quote_requests);

    return {
      success: true,
      quote_request: newQuote,
      message: 'Quote request sent.'
    };
  }

  // createHomeVisitRequest(request)
  createHomeVisitRequest(request) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === request.providerId);
    if (!provider) {
      return {
        success: false,
        home_visit_request: null,
        message: 'Provider not found.'
      };
    }

    const home_visit_requests = this._getFromStorage('home_visit_requests', []);

    const newRequest = {
      id: this._generateId('homevisit'),
      providerId: request.providerId,
      providerServiceId: request.providerServiceId || null,
      appliance_type: request.appliance_type,
      issue_description: request.issue_description,
      preferred_datetime: request.preferred_datetime,
      address_line1: request.address_line1,
      address_line2: request.address_line2 || null,
      city: request.city,
      state: request.state,
      postal_code: request.postal_code,
      customer_name: request.customer_name,
      customer_phone: request.customer_phone,
      customer_email: request.customer_email || null,
      status: 'sent',
      created_at: this._nowIso()
    };

    home_visit_requests.push(newRequest);
    this._saveToStorage('home_visit_requests', home_visit_requests);

    return {
      success: true,
      home_visit_request: newRequest,
      message: 'Home visit request sent.'
    };
  }

  // createPickupRequest(pickup)
  createPickupRequest(pickup) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === pickup.providerId);
    if (!provider) {
      return {
        success: false,
        pickup_request: null,
        message: 'Provider not found.'
      };
    }

    const pickup_requests = this._getFromStorage('pickup_requests', []);

    const newPickup = {
      id: this._generateId('pickup'),
      providerId: pickup.providerId,
      providerServiceId: pickup.providerServiceId || null,
      device_type: pickup.device_type,
      brand_id: pickup.brand_id || null,
      brand_name: pickup.brand_name || null,
      model_name: pickup.model_name || null,
      issue_description: pickup.issue_description,
      pickup_date: pickup.pickup_date,
      time_window_start: pickup.time_window_start,
      time_window_end: pickup.time_window_end,
      address_line1: pickup.address_line1,
      address_line2: pickup.address_line2 || null,
      city: pickup.city,
      state: pickup.state,
      postal_code: pickup.postal_code,
      customer_name: pickup.customer_name,
      customer_phone: pickup.customer_phone,
      customer_email: pickup.customer_email || null,
      status: 'sent',
      created_at: this._nowIso()
    };

    pickup_requests.push(newPickup);
    this._saveToStorage('pickup_requests', pickup_requests);

    return {
      success: true,
      pickup_request: newPickup,
      message: 'Pickup request sent.'
    };
  }

  // sendProviderMessage(messagePayload)
  sendProviderMessage(messagePayload) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === messagePayload.providerId);
    if (!provider) {
      return {
        success: false,
        provider_message: null,
        message: 'Provider not found.'
      };
    }

    const provider_messages = this._getFromStorage('provider_messages', []);

    const newMessage = {
      id: this._generateId('pmsg'),
      providerId: messagePayload.providerId,
      subject: messagePayload.subject,
      message: messagePayload.message,
      customer_name: messagePayload.customer_name,
      customer_email: messagePayload.customer_email,
      customer_phone: messagePayload.customer_phone || null,
      status: 'sent',
      created_at: this._nowIso()
    };

    provider_messages.push(newMessage);
    this._saveToStorage('provider_messages', provider_messages);

    return {
      success: true,
      provider_message: newMessage,
      message: 'Message sent to provider.'
    };
  }

  // getBrands(device_type)
  getBrands(device_type) {
    const brands = this._getFromStorage('brands', []);
    if (!device_type) return brands;
    return brands.filter((b) => b.device_type === device_type);
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      title: 'About Our Repair Service Directory',
      sections: [
        {
          heading: 'Our Mission',
          body_html:
            '<p>We connect people with trusted electronic repair providers for phones, tablets, laptops, game consoles, and home appliances.</p>'
        },
        {
          heading: 'How We Curate Listings',
          body_html:
            '<p>Providers listed in our directory manage their own profiles and pricing. Ratings and reviews are submitted by customers like you.</p>'
        }
      ]
    };
  }

  // getHowItWorksContent()
  getHowItWorksContent() {
    return {
      title: 'How It Works',
      steps: [
        {
          heading: '1. Search for a service',
          body_html:
            '<p>Use the search bar or browse by category to find repair providers near your location.</p>'
        },
        {
          heading: '2. Filter and compare',
          body_html:
            '<p>Apply filters like price, rating, distance, and special policies such as free diagnostics or no-fix-no-fee.</p>'
        },
        {
          heading: '3. Contact or book',
          body_html:
            '<p>Send a quote request, schedule an in-store visit, arrange a home visit, or request pickup & delivery with your chosen provider.</p>'
        }
      ]
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return {
      faqs: [
        {
          category: 'Searching',
          question: 'How do I find repair providers near me?',
          answer_html:
            '<p>Set your location using your ZIP code or city and state, then search by device or problem (e.g., \'iPhone 12 screen repair\').</p>'
        },
        {
          category: 'Filters',
          question: 'What do the 24/7 and emergency filters mean?',
          answer_html:
            '<p>24/7 providers are available at all times, while emergency services prioritize urgent repairs and may offer faster response times.</p>'
        },
        {
          category: 'Bookings',
          question: 'Do I book directly with providers?',
          answer_html:
            '<p>Yes. When you submit a booking, quote, or message, it is sent to the provider, who will follow up to confirm details.</p>'
        }
      ]
    };
  }

  // getContactUsInfo()
  getContactUsInfo() {
    return {
      support_email: 'support@repair-directory.example',
      business_address: {
        address_line1: '123 Directory Way',
        address_line2: 'Suite 100',
        city: 'Example City',
        state: 'CA',
        postal_code: '90000',
        country: 'USA'
      }
    };
  }

  // submitSiteContactMessage(name, email, subject, message)
  submitSiteContactMessage(name, email, subject, message) {
    const siteMessages = this._getFromStorage('site_contact_messages', []);

    const newMessage = {
      id: this._generateId('site_msg'),
      name,
      email,
      subject,
      message,
      created_at: this._nowIso()
    };

    siteMessages.push(newMessage);
    this._saveToStorage('site_contact_messages', siteMessages);

    return {
      success: true,
      message_id: newMessage.id,
      acknowledgement: 'Thank you for contacting us. We will review your message shortly.'
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    return {
      last_updated: '2024-01-01',
      sections: [
        {
          heading: 'Acceptance of Terms',
          body_html:
            '<p>By using this directory, you agree to these terms of use. Providers are independent third parties and we do not guarantee their services.</p>'
        },
        {
          heading: 'User Responsibilities',
          body_html:
            '<p>You are responsible for verifying provider qualifications, prices, and policies before proceeding with any repair.</p>'
        }
      ]
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      last_updated: '2024-01-01',
      sections: [
        {
          heading: 'Information We Collect',
          body_html:
            '<p>We collect the information you submit in forms (such as contact details and repair descriptions) to forward to providers and improve the service.</p>'
        },
        {
          heading: 'Data Storage',
          body_html:
            '<p>Data is stored in accordance with applicable laws. You may request removal of your personal information where required.</p>'
        }
      ]
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