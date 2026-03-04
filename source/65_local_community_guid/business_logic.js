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
    this._getOrCreateSingleUserState();
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keysWithDefaults = [
      ['directory_categories', []],
      ['places', []],
      ['place_operating_hours', []],
      ['events', []],
      ['groups', []],
      ['group_memberships', []],
      ['event_rsvps', []],
      ['saved_lists', []],
      ['saved_list_items', []],
      ['organizer_messages', []],
      ['site_contact_messages', []],
      ['static_pages', {}],
      ['site_contact_info', {}]
    ];

    keysWithDefaults.forEach(([key, def]) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(def));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('single_user_state')) {
      localStorage.setItem(
        'single_user_state',
        JSON.stringify({ created_at: new Date().toISOString() })
      );
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
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

  // ----------------------
  // Core private helpers
  // ----------------------

  _getOrCreateSingleUserState() {
    const raw = localStorage.getItem('single_user_state');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    const state = { created_at: new Date().toISOString() };
    localStorage.setItem('single_user_state', JSON.stringify(state));
    return state;
  }

  _getOrCreateSavedListByName(list_name, description) {
    const name = (list_name || '').trim();
    if (!name) {
      throw new Error('list_name is required');
    }
    const lists = this._getFromStorage('saved_lists', []);
    const existing = lists.find(
      (l) => (l.name || '').toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const newList = {
      id: this._generateId('list'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    lists.push(newList);
    this._saveToStorage('saved_lists', lists);
    return newList;
  }

  _calculateDistanceMilesFromZip(objWithLocation, search_zip) {
    // No real geocoding data is guaranteed in localStorage.
    // To respect radius filters in a simple way, we treat:
    // - same ZIP => distance 0
    // - nearby ZIPs (same first 3 digits) => small distance within typical radii
    // - other ZIPs => large distance (effectively outside typical radii)
    if (!objWithLocation || !objWithLocation.zip_code || !search_zip) {
      return null;
    }
    if (objWithLocation.zip_code === search_zip) {
      return 0;
    }
    const objPrefix = String(objWithLocation.zip_code).slice(0, 3);
    const searchPrefix = String(search_zip).slice(0, 3);
    if (objPrefix === searchPrefix) {
      // Treat ZIPs that share a prefix as being a few miles apart
      return 2;
    }
    return 9999; // effectively "far away"
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 1) return null;
    const h = parseInt(parts[0], 10);
    const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getDayOfWeekFromDateString(dateStr) {
    if (!dateStr) return null;
    // Interpret as local date at midnight
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const dayIndex = d.getUTCDay(); // 0=Sunday
    const map = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ];
    return map[dayIndex] || null;
  }

  _applyPlaceAvailabilityFilter(places, availability) {
    if (!availability) return places;

    const { date, start_time, end_time, days_of_week } = availability;
    const hours = this._getFromStorage('place_operating_hours', []);

    const startMinutes = this._parseTimeToMinutes(start_time);
    const endMinutes = this._parseTimeToMinutes(end_time || start_time);

    if (!date && (!days_of_week || !Array.isArray(days_of_week) || !days_of_week.length)) {
      // No specific day or date to filter by
      return places;
    }

    const filtered = [];

    if (date) {
      const day = this._getDayOfWeekFromDateString(date);
      if (!day) return places;

      for (const place of places) {
        const placeHours = hours.filter(
          (h) => h.placeId === place.id && h.day_of_week === day && !h.is_closed
        );
        if (!placeHours.length) continue;

        if (startMinutes == null || endMinutes == null) {
          filtered.push(place);
          continue;
        }

        const hasCoveringSlot = placeHours.some((h) => {
          const openM = this._parseTimeToMinutes(h.open_time);
          const closeM = this._parseTimeToMinutes(h.close_time);
          if (openM == null || closeM == null) return false;
          return openM <= startMinutes && closeM >= endMinutes;
        });

        if (hasCoveringSlot) {
          filtered.push(place);
        }
      }
    } else if (days_of_week && Array.isArray(days_of_week) && days_of_week.length) {
      const desiredDays = days_of_week.map((d) => String(d).toLowerCase());

      for (const place of places) {
        let allDaysCovered = true;

        for (const day of desiredDays) {
          const placeHours = hours.filter(
            (h) => h.placeId === place.id && h.day_of_week === day && !h.is_closed
          );
          if (!placeHours.length) {
            allDaysCovered = false;
            break;
          }

          if (startMinutes != null && endMinutes != null) {
            const hasRange = placeHours.some((h) => {
              const openM = this._parseTimeToMinutes(h.open_time);
              const closeM = this._parseTimeToMinutes(h.close_time);
              if (openM == null || closeM == null) return false;
              return openM <= startMinutes && closeM >= endMinutes;
            });
            if (!hasRange) {
              allDaysCovered = false;
              break;
            }
          }
        }

        if (allDaysCovered) {
          filtered.push(place);
        }
      }
    } else {
      return places;
    }

    return filtered;
  }

  // ----------------------
  // Home interfaces
  // ----------------------

  getHomeNavigationSections() {
    const categories = this.getDirectoryCategories();
    const sections = categories.map((c) => ({
      id: c.id,
      label: c.name,
      page_key: 'directory_list',
      category_id: c.id
    }));

    sections.push(
      {
        id: 'events',
        label: 'Events',
        page_key: 'events_list'
      },
      {
        id: 'volunteering',
        label: 'Volunteering',
        page_key: 'volunteering_list'
      },
      {
        id: 'groups_clubs',
        label: 'Groups & Clubs',
        page_key: 'groups_list'
      },
      {
        id: 'saved_lists',
        label: 'Saved Lists',
        page_key: 'saved_lists_overview'
      }
    );

    return sections;
  }

  homeQuickSearch(keyword, zip_code, radius_miles = 5, content_types) {
    const allowedTypes = ['places', 'events', 'volunteering', 'groups'];
    let types = Array.isArray(content_types) && content_types.length
      ? content_types.filter((t) => allowedTypes.includes(t))
      : allowedTypes.slice();

    const keywordLower = keyword ? String(keyword).toLowerCase() : null;

    const result = {
      places: [],
      events: [],
      groups: []
    };

    // Places
    if (types.includes('places')) {
      const places = this._getFromStorage('places', []);
      const categories = this._getFromStorage('directory_categories', []);
      for (const p of places) {
        const distance = this._calculateDistanceMilesFromZip(p, zip_code);
        if (distance != null && distance > radius_miles) continue;
        if (keywordLower) {
          const hay = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
          if (!hay.includes(keywordLower)) continue;
        }
        const cat = categories.find((c) => c.id === p.category_id);
        const key_amenities = [];
        if (p.is_family_friendly) key_amenities.push('family_friendly');
        if (p.takes_reservations) key_amenities.push('takes_reservations');
        if (p.has_playground) key_amenities.push('has_playground');
        if (p.is_dog_friendly) key_amenities.push('is_dog_friendly');
        if (p.is_24_7_emergency) key_amenities.push('is_24_7_emergency');
        if (p.supports_weekday_daytime) key_amenities.push('supports_weekday_daytime');

        result.places.push({
          place_id: p.id,
          name: p.name,
          category_id: p.category_id,
          category_name: cat ? cat.name : null,
          subcategory: p.subcategory,
          rating: p.rating || null,
          average_price_per_person: p.average_price_per_person || null,
          hourly_rate: p.hourly_rate || null,
          call_out_fee: p.call_out_fee || null,
          distance_miles: distance,
          key_amenities
        });
      }
    }

    // Events & volunteering
    if (types.includes('events') || types.includes('volunteering')) {
      const events = this._getFromStorage('events', []);
      for (const e of events) {
        const isEvent = e.event_type === 'events';
        const isVol = e.event_type === 'volunteering';
        if (
          (isEvent && !types.includes('events')) ||
          (isVol && !types.includes('volunteering'))
        ) {
          continue;
        }
        const distance = this._calculateDistanceMilesFromZip(e, zip_code);
        if (distance != null && distance > radius_miles) continue;
        if (keywordLower) {
          const hay = ((e.title || '') + ' ' + (e.description || '')).toLowerCase();
          if (!hay.includes(keywordLower)) continue;
        }

        const start = e.start_datetime ? new Date(e.start_datetime) : null;
        const end = e.end_datetime ? new Date(e.end_datetime) : null;
        let date_label = null;
        let time_label = null;
        if (start && !isNaN(start.getTime())) {
          date_label = start.toISOString().slice(0, 10);
          const startTime = start.toISOString().slice(11, 16);
          const endTime = end && !isNaN(end.getTime()) ? end.toISOString().slice(11, 16) : null;
          time_label = endTime ? startTime + ' - ' + endTime : startTime;
        }

        result.events.push({
          event_id: e.id,
          title: e.title,
          event_type: e.event_type,
          start_datetime: e.start_datetime,
          end_datetime: e.end_datetime,
          date_label,
          time_label,
          price: e.price != null ? e.price : null,
          is_free: !!e.is_free,
          cause: e.cause || null,
          distance_miles: distance
        });
      }
    }

    // Groups
    if (types.includes('groups')) {
      const groups = this._getFromStorage('groups', []);
      for (const g of groups) {
        const distance = this._calculateDistanceMilesFromZip(g, zip_code);
        if (distance != null && distance > radius_miles) continue;
        if (keywordLower) {
          const hay = ((g.name || '') + ' ' + (g.description || '') + ' ' + (g.focus || '')).toLowerCase();
          if (!hay.includes(keywordLower)) continue;
        }

        result.groups.push({
          group_id: g.id,
          name: g.name,
          description_snippet: (g.description || '').slice(0, 140),
          focus: g.focus || null,
          experience_level: g.experience_level || null,
          meeting_pattern: g.meeting_pattern || null,
          primary_location_name: g.primary_location_name || null,
          distance_miles: distance
        });
      }
    }

    return result;
  }

  getHomeFeaturedContent() {
    const places = this._getFromStorage('places', []);
    const events = this._getFromStorage('events', []);
    const defaultZip = '12345';

    // Featured restaurants
    const restaurantPlaces = places
      .filter((p) => p.category_id === 'restaurants_food' && (p.subcategory === 'restaurant' || p.subcategory === 'cafe'))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const featured_restaurants = restaurantPlaces.slice(0, 5).map((p) => ({
      place_id: p.id,
      name: p.name,
      rating: p.rating || null,
      average_price_per_person: p.average_price_per_person || null,
      distance_miles: this._calculateDistanceMilesFromZip(p, defaultZip),
      is_family_friendly: !!p.is_family_friendly
    }));

    // Featured events (non-volunteering)
    const now = new Date();
    const eventEvents = events
      .filter((e) => e.event_type === 'events' && e.status === 'scheduled')
      .sort((a, b) => {
        const aTime = a.start_datetime ? new Date(a.start_datetime).getTime() : Infinity;
        const bTime = b.start_datetime ? new Date(b.start_datetime).getTime() : Infinity;
        return aTime - bTime;
      });

    const featured_events = eventEvents.slice(0, 5).map((e) => {
      const start = e.start_datetime ? new Date(e.start_datetime) : null;
      let date_label = null;
      let time_label = null;
      if (start && !isNaN(start.getTime())) {
        date_label = start.toISOString().slice(0, 10);
        time_label = start.toISOString().slice(11, 16);
      }
      return {
        event_id: e.id,
        title: e.title,
        event_type: e.event_type,
        start_datetime: e.start_datetime,
        date_label,
        time_label,
        price: e.price != null ? e.price : null,
        is_free: !!e.is_free
      };
    });

    // Featured services (home_services)
    const servicePlaces = places
      .filter((p) => p.category_id === 'home_services')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const featured_services = servicePlaces.slice(0, 5).map((p) => ({
      place_id: p.id,
      name: p.name,
      subcategory: p.subcategory,
      rating: p.rating || null,
      call_out_fee: p.call_out_fee || null,
      distance_miles: this._calculateDistanceMilesFromZip(p, defaultZip)
    }));

    // Featured parks
    const parkPlaces = places
      .filter((p) => p.category_id === 'parks_outdoors' && p.subcategory === 'park')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const featured_parks = parkPlaces.slice(0, 5).map((p) => ({
      place_id: p.id,
      name: p.name,
      has_playground: !!p.has_playground,
      is_dog_friendly: !!p.is_dog_friendly,
      distance_miles: this._calculateDistanceMilesFromZip(p, defaultZip)
    }));

    return { featured_restaurants, featured_events, featured_services, featured_parks };
  }

  // ----------------------
  // Directory / Places
  // ----------------------

  getDirectoryCategories() {
    return this._getFromStorage('directory_categories', []);
  }

  getDirectoryFilterOptions(category_id) {
    const price_ranges = [];
    const rating_options = [
      { value: 4.0, label: '4.0 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];
    const amenity_filters = [];
    const schedule_filter_capabilities = {
      supports_date_time: false,
      supports_day_of_week: false,
      supports_time_range: false
    };
    const sort_options = [];

    if (category_id === 'restaurants_food') {
      price_ranges.push({
        id: 'under_20_per_person',
        label: 'Under $20 per person',
        min_price: 0,
        max_price: 20,
        applies_to: 'average_price_per_person'
      });
      amenity_filters.push(
        { key: 'is_family_friendly', label: 'Family-friendly', description: 'Good for families with children' },
        { key: 'takes_reservations', label: 'Takes reservations', description: 'Accepts reservations' }
      );
      schedule_filter_capabilities.supports_date_time = true;
      schedule_filter_capabilities.supports_day_of_week = true;
      schedule_filter_capabilities.supports_time_range = true;
      sort_options.push(
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'distance_nearest_first', label: 'Distance: Nearest first' },
        { value: 'price_low_to_high', label: 'Price: Low to High' }
      );
    } else if (category_id === 'home_services') {
      price_ranges.push(
        {
          id: 'call_out_under_100',
          label: 'Call-out under $100',
          min_price: 0,
          max_price: 100,
          applies_to: 'call_out_fee'
        },
        {
          id: 'hourly_under_50',
          label: 'Hourly under $50',
          min_price: 0,
          max_price: 50,
          applies_to: 'hourly_rate'
        }
      );
      amenity_filters.push(
        { key: 'is_24_7_emergency', label: '24/7 emergency', description: 'Available for emergency calls' },
        { key: 'supports_weekday_daytime', label: 'Weekday daytime', description: 'Available Mon–Fri daytime' }
      );
      schedule_filter_capabilities.supports_day_of_week = true;
      schedule_filter_capabilities.supports_time_range = true;
      sort_options.push(
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'distance_nearest_first', label: 'Distance: Nearest first' },
        { value: 'call_out_fee_low_to_high', label: 'Call-out fee: Low to High' }
      );
    } else if (category_id === 'childcare') {
      price_ranges.push({
        id: 'hourly_under_15',
        label: 'Under $15 per hour',
        min_price: 0,
        max_price: 15,
        applies_to: 'hourly_rate'
      });
      amenity_filters.push({
        key: 'supports_weekday_daytime',
        label: 'Weekday 8–5',
        description: 'Available weekdays during daytime'
      });
      schedule_filter_capabilities.supports_day_of_week = true;
      schedule_filter_capabilities.supports_time_range = true;
      sort_options.push(
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'distance_nearest_first', label: 'Distance: Nearest first' },
        { value: 'price_low_to_high', label: 'Price: Low to High' }
      );
    } else if (category_id === 'parks_outdoors') {
      amenity_filters.push(
        { key: 'has_playground', label: 'Playground', description: 'Has playground equipment' },
        { key: 'is_dog_friendly', label: 'Dog-friendly', description: 'Allows dogs or has dog park' }
      );
      sort_options.push(
        { value: 'distance_nearest_first', label: 'Distance: Nearest first' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' }
      );
    }

    return {
      price_ranges,
      rating_options,
      amenity_filters,
      schedule_filter_capabilities,
      sort_options
    };
  }

  searchDirectoryPlaces(
    category_id,
    subcategory,
    keyword,
    zip_code,
    radius_miles,
    price_filter,
    rating_min,
    amenities,
    availability,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    let places = this._getFromStorage('places', []).filter(
      (p) => p.category_id === category_id
    );

    if (subcategory) {
      places = places.filter((p) => p.subcategory === subcategory);
    }

    const keywordLower = keyword ? String(keyword).toLowerCase() : null;
    if (keywordLower) {
      places = places.filter((p) => {
        const hay = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
        return hay.includes(keywordLower);
      });
    }

    // Distance filter
    places = places
      .map((p) => ({
        ...p,
        _distance: this._calculateDistanceMilesFromZip(p, zip_code)
      }))
      .filter((p) => p._distance == null || p._distance <= radius_miles);

    // Price filters
    if (price_filter && typeof price_filter === 'object') {
      const {
        max_average_price_per_person,
        max_hourly_rate,
        max_call_out_fee
      } = price_filter;

      if (max_average_price_per_person != null) {
        places = places.filter(
          (p) =>
            p.average_price_per_person != null &&
            p.average_price_per_person <= max_average_price_per_person
        );
      }
      if (max_hourly_rate != null) {
        places = places.filter(
          (p) => p.hourly_rate != null && p.hourly_rate <= max_hourly_rate
        );
      }
      if (max_call_out_fee != null) {
        places = places.filter(
          (p) => p.call_out_fee != null && p.call_out_fee <= max_call_out_fee
        );
      }
    }

    // Rating filter
    if (rating_min != null) {
      places = places.filter((p) => (p.rating || 0) >= rating_min);
    }

    // Amenities
    if (amenities && typeof amenities === 'object') {
      const keys = [
        'is_family_friendly',
        'takes_reservations',
        'has_playground',
        'is_dog_friendly',
        'is_24_7_emergency',
        'supports_weekday_daytime'
      ];
      keys.forEach((key) => {
        if (amenities[key] === true) {
          places = places.filter((p) => !!p[key]);
        }
      });
    }

    // Availability
    places = this._applyPlaceAvailabilityFilter(places, availability);

    // Sorting
    if (sort_by === 'rating_high_to_low') {
      places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'distance_nearest_first') {
      places.sort((a, b) => (a._distance || 0) - (b._distance || 0));
    } else if (sort_by === 'price_low_to_high') {
      places.sort((a, b) => {
        const aPrice =
          a.average_price_per_person != null
            ? a.average_price_per_person
            : a.hourly_rate != null
            ? a.hourly_rate
            : a.call_out_fee != null
            ? a.call_out_fee
            : Infinity;
        const bPrice =
          b.average_price_per_person != null
            ? b.average_price_per_person
            : b.hourly_rate != null
            ? b.hourly_rate
            : b.call_out_fee != null
            ? b.call_out_fee
            : Infinity;
        return aPrice - bPrice;
      });
    } else if (sort_by === 'call_out_fee_low_to_high') {
      places.sort((a, b) => {
        const aFee = a.call_out_fee != null ? a.call_out_fee : Infinity;
        const bFee = b.call_out_fee != null ? b.call_out_fee : Infinity;
        return aFee - bFee;
      });
    }

    const total_results = places.length;
    const startIndex = (page - 1) * page_size;
    const paged = places.slice(startIndex, startIndex + page_size);
    const categories = this._getFromStorage('directory_categories', []);

    const results = paged.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id);
      const badge_labels = [];
      if (p.is_family_friendly) badge_labels.push('Family-friendly');
      if (p.takes_reservations) badge_labels.push('Takes reservations');
      if (p.has_playground) badge_labels.push('Playground');
      if (p.is_dog_friendly) badge_labels.push('Dog-friendly');
      if (p.is_24_7_emergency) badge_labels.push('24/7 emergency');
      if (p.supports_weekday_daytime) badge_labels.push('Weekday daytime');

      const summary = (p.description || '').slice(0, 160);

      return {
        place_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: cat ? cat.name : null,
        subcategory: p.subcategory,
        rating: p.rating || null,
        review_count: p.review_count || 0,
        average_price_per_person: p.average_price_per_person || null,
        hourly_rate: p.hourly_rate || null,
        call_out_fee: p.call_out_fee || null,
        zip_code: p.zip_code,
        city: p.city,
        state: p.state,
        distance_miles: p._distance,
        is_family_friendly: !!p.is_family_friendly,
        takes_reservations: !!p.takes_reservations,
        has_playground: !!p.has_playground,
        is_dog_friendly: !!p.is_dog_friendly,
        is_24_7_emergency: !!p.is_24_7_emergency,
        supports_weekday_daytime: !!p.supports_weekday_daytime,
        badge_labels,
        summary
      };
    });

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  getPlaceDetails(placeId) {
    const places = this._getFromStorage('places', []);
    const categories = this._getFromStorage('directory_categories', []);
    const hours = this._getFromStorage('place_operating_hours', []);
    const savedLists = this._getFromStorage('saved_lists', []);
    const savedItems = this._getFromStorage('saved_list_items', []);

    const place = places.find((p) => p.id === placeId) || null;
    if (!place) {
      return {
        place: null,
        distance_miles: null,
        operating_hours: [],
        key_amenities: [],
        pricing_details: {},
        is_saved: false,
        saved_in_lists: []
      };
    }

    const category = categories.find((c) => c.id === place.category_id) || null;

    const operating_hours = hours
      .filter((h) => h.placeId === place.id)
      .map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time || null,
        close_time: h.close_time || null,
        is_closed: !!h.is_closed
      }));

    const key_amenities = [];
    if (place.is_family_friendly) key_amenities.push('family_friendly');
    if (place.takes_reservations) key_amenities.push('takes_reservations');
    if (place.has_playground) key_amenities.push('has_playground');
    if (place.is_dog_friendly) key_amenities.push('is_dog_friendly');
    if (place.is_24_7_emergency) key_amenities.push('is_24_7_emergency');
    if (place.supports_weekday_daytime) key_amenities.push('supports_weekday_daytime');

    const pricing_details = {
      average_price_per_person:
        place.average_price_per_person != null ? place.average_price_per_person : null,
      hourly_rate: place.hourly_rate != null ? place.hourly_rate : null,
      call_out_fee: place.call_out_fee != null ? place.call_out_fee : null
    };

    const listItemsForPlace = savedItems.filter(
      (it) => it.item_type === 'place' && it.item_id === place.id
    );
    const saved_in_lists = listItemsForPlace
      .map((it) => savedLists.find((l) => l.id === it.listId))
      .filter((l) => !!l)
      .map((l) => ({ list_id: l.id, list_name: l.name }));

    const distance_miles = this._calculateDistanceMilesFromZip(place, '12345');

    // Foreign key resolution: include category object on place
    const placeWithCategory = {
      id: place.id,
      name: place.name,
      description: place.description,
      category_id: place.category_id,
      category_name: category ? category.name : null,
      subcategory: place.subcategory,
      rating: place.rating || null,
      review_count: place.review_count || 0,
      average_price_per_person: place.average_price_per_person || null,
      hourly_rate: place.hourly_rate || null,
      call_out_fee: place.call_out_fee || null,
      service_coverage_radius_miles: place.service_coverage_radius_miles || null,
      is_family_friendly: !!place.is_family_friendly,
      takes_reservations: !!place.takes_reservations,
      has_playground: !!place.has_playground,
      is_dog_friendly: !!place.is_dog_friendly,
      is_24_7_emergency: !!place.is_24_7_emergency,
      supports_weekday_daytime: !!place.supports_weekday_daytime,
      phone: place.phone || null,
      website_url: place.website_url || null,
      address_line1: place.address_line1,
      address_line2: place.address_line2 || null,
      city: place.city,
      state: place.state,
      zip_code: place.zip_code,
      latitude: place.latitude || null,
      longitude: place.longitude || null,
      category
    };

    // Instrumentation for task completion tracking (task_2)
    try {
      if (
        place.category_id === 'home_services' &&
        place.subcategory === 'plumber' &&
        place.is_24_7_emergency === true &&
        (place.rating || 0) >= 4.0 &&
        place.call_out_fee != null &&
        place.call_out_fee < 100 &&
        distance_miles != null &&
        distance_miles <= 10
      ) {
        let existing = [];
        const raw = localStorage.getItem('task2_comparedPlumberIds');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              existing = parsed;
            }
          } catch (e) {
            // ignore parse errors and fall back to empty array
          }
        }
        if (!existing.includes(place.id)) {
          existing.push(place.id);
          localStorage.setItem('task2_comparedPlumberIds', JSON.stringify(existing));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      place: placeWithCategory,
      distance_miles,
      operating_hours,
      key_amenities,
      pricing_details,
      is_saved: saved_in_lists.length > 0,
      saved_in_lists
    };
  }

  // ----------------------
  // Events & Volunteering
  // ----------------------

  getEventFilterOptions(mode) {
    const price_options = [
      { id: 'free_only', label: 'Free', max_price: 0, is_free_only: true },
      { id: 'under_20', label: 'Under $20', max_price: 20, is_free_only: false }
    ];

    const cause_options = [
      { value: 'environment', label: 'Environment' },
      { value: 'animals', label: 'Animals' },
      { value: 'education', label: 'Education' },
      { value: 'community', label: 'Community' },
      { value: 'health', label: 'Health' },
      { value: 'other', label: 'Other' }
    ];

    const time_of_day_presets = [
      {
        id: 'afternoon_1_6',
        label: 'Afternoon (1 PM – 6 PM)',
        start_time: '13:00',
        end_time: '18:00'
      }
    ];

    const sort_options = [
      { value: 'soonest_first', label: 'Soonest first' },
      { value: 'date_time', label: 'Date & Time' },
      { value: 'distance_nearest_first', label: 'Distance: Nearest first' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    return {
      price_options,
      cause_options,
      time_of_day_presets,
      sort_options
    };
  }

  searchEvents(
    mode,
    keyword,
    zip_code,
    radius_miles,
    date,
    date_range,
    time_range,
    price_max,
    is_free_only,
    cause,
    min_spots_remaining,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    let events = this._getFromStorage('events', []);

    // Mode filter
    if (mode === 'events') {
      events = events.filter((e) => e.event_type === 'events');
    } else if (mode === 'volunteering') {
      events = events.filter((e) => e.event_type === 'volunteering');
    } else if (mode === 'all') {
      // no additional filter
    }

    const keywordLower = keyword ? String(keyword).toLowerCase() : null;
    if (keywordLower) {
      events = events.filter((e) => {
        const hay = ((e.title || '') + ' ' + (e.description || '')).toLowerCase();
        return hay.includes(keywordLower);
      });
    }

    // Distance
    events = events
      .map((e) => ({
        ...e,
        _distance: this._calculateDistanceMilesFromZip(e, zip_code)
      }))
      .filter((e) => e._distance == null || e._distance <= radius_miles);

    // Date filter
    if (date) {
      events = events.filter((e) => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        if (isNaN(d.getTime())) return false;
        const dStr = d.toISOString().slice(0, 10);
        return dStr === date;
      });
    } else if (date_range && date_range.start_date && date_range.end_date) {
      const startDate = date_range.start_date;
      const endDate = date_range.end_date;
      events = events.filter((e) => {
        if (!e.start_datetime) return false;
        const dStr = new Date(e.start_datetime).toISOString().slice(0, 10);
        return dStr >= startDate && dStr <= endDate;
      });
    }

    // Time range
    if (time_range && (time_range.start_time || time_range.end_time)) {
      const startMinutes = this._parseTimeToMinutes(time_range.start_time || '00:00');
      const endMinutes = this._parseTimeToMinutes(time_range.end_time || '23:59');
      events = events.filter((e) => {
        if (!e.start_datetime) return false;
        const start = new Date(e.start_datetime);
        const end = e.end_datetime ? new Date(e.end_datetime) : null;
        if (isNaN(start.getTime())) return false;
        // Interpret times as local clock times to match provided filters
        const sM = start.getHours() * 60 + start.getMinutes();
        const eM = end && !isNaN(end.getTime())
          ? end.getHours() * 60 + end.getMinutes()
          : sM;
        // Simple overlap test
        return eM >= startMinutes && sM <= endMinutes;
      });
    }

    // Price / free
    if (is_free_only) {
      events = events.filter((e) => !!e.is_free || e.price === 0);
    } else if (price_max != null) {
      events = events.filter((e) => e.price != null && e.price <= price_max);
    }

    // Cause
    if (cause) {
      events = events.filter((e) => e.cause === cause);
    }

    // Spots remaining
    if (min_spots_remaining != null) {
      events = events.filter(
        (e) => e.spots_remaining != null && e.spots_remaining >= min_spots_remaining
      );
    }

    // Sorting
    if (sort_by === 'soonest_first' || sort_by === 'date_time') {
      events.sort((a, b) => {
        const aTime = a.start_datetime ? new Date(a.start_datetime).getTime() : Infinity;
        const bTime = b.start_datetime ? new Date(b.start_datetime).getTime() : Infinity;
        return aTime - bTime;
      });
    } else if (sort_by === 'distance_nearest_first') {
      events.sort((a, b) => (a._distance || 0) - (b._distance || 0));
    } else if (sort_by === 'price_low_to_high') {
      events.sort((a, b) => {
        const aPrice = a.price != null ? a.price : Infinity;
        const bPrice = b.price != null ? b.price : Infinity;
        return aPrice - bPrice;
      });
    }

    const total_results = events.length;
    const startIndex = (page - 1) * page_size;
    const paged = events.slice(startIndex, startIndex + page_size);

    const results = paged.map((e) => {
      const start = e.start_datetime ? new Date(e.start_datetime) : null;
      const end = e.end_datetime ? new Date(e.end_datetime) : null;
      let date_label = null;
      let time_label = null;
      if (start && !isNaN(start.getTime())) {
        date_label = start.toISOString().slice(0, 10);
        const startTime = start.toISOString().slice(11, 16);
        const endTime = end && !isNaN(end.getTime()) ? end.toISOString().slice(11, 16) : null;
        time_label = endTime ? startTime + ' - ' + endTime : startTime;
      }

      return {
        event_id: e.id,
        title: e.title,
        description_snippet: (e.description || '').slice(0, 160),
        event_type: e.event_type,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        date_label,
        time_label,
        location_name: e.location_name || null,
        city: e.city,
        state: e.state,
        zip_code: e.zip_code,
        distance_miles: e._distance,
        price: e.price != null ? e.price : null,
        is_free: !!e.is_free,
        cause: e.cause || null,
        spots_total: e.spots_total != null ? e.spots_total : null,
        spots_remaining: e.spots_remaining != null ? e.spots_remaining : null,
        status: e.status
      };
    });

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const groups = this._getFromStorage('groups', []);
    const rsvps = this._getFromStorage('event_rsvps', []);
    const savedLists = this._getFromStorage('saved_lists', []);
    const savedItems = this._getFromStorage('saved_list_items', []);

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        date_label: null,
        time_label: null,
        price_display: null,
        cause_label: null,
        distance_miles: null,
        associated_group: null,
        rsvp_status: 'not_responded',
        is_saved: false,
        saved_in_lists: []
      };
    }

    const start = event.start_datetime ? new Date(event.start_datetime) : null;
    const end = event.end_datetime ? new Date(event.end_datetime) : null;
    let date_label = null;
    let time_label = null;
    if (start && !isNaN(start.getTime())) {
      date_label = start.toISOString().slice(0, 10);
      const startTime = start.toISOString().slice(11, 16);
      const endTime = end && !isNaN(end.getTime()) ? end.toISOString().slice(11, 16) : null;
      time_label = endTime ? startTime + ' - ' + endTime : startTime;
    }

    let price_display = null;
    if (event.is_free || event.price === 0) {
      price_display = 'Free';
    } else if (event.price != null) {
      price_display = '$' + event.price;
    }

    let cause_label = null;
    if (event.cause === 'environment') cause_label = 'Environment';
    else if (event.cause === 'animals') cause_label = 'Animals';
    else if (event.cause === 'education') cause_label = 'Education';
    else if (event.cause === 'community') cause_label = 'Community';
    else if (event.cause === 'health') cause_label = 'Health';
    else if (event.cause === 'other') cause_label = 'Other';

    const distance_miles = this._calculateDistanceMilesFromZip(event, '12345');

    const group = event.associated_group_id
      ? groups.find((g) => g.id === event.associated_group_id) || null
      : null;

    const rsvp = rsvps.find((r) => r.eventId === event.id) || null;
    const rsvp_status = rsvp ? rsvp.status : 'not_responded';

    const listItemsForEvent = savedItems.filter(
      (it) => it.item_type === 'event' && it.item_id === event.id
    );
    const saved_in_lists = listItemsForEvent
      .map((it) => savedLists.find((l) => l.id === it.listId))
      .filter((l) => !!l)
      .map((l) => ({ list_id: l.id, list_name: l.name }));

    const eventWithResolved = {
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      location_name: event.location_name || null,
      address_line1: event.address_line1,
      address_line2: event.address_line2 || null,
      city: event.city,
      state: event.state,
      zip_code: event.zip_code,
      latitude: event.latitude || null,
      longitude: event.longitude || null,
      price: event.price != null ? event.price : null,
      is_free: !!event.is_free,
      cause: event.cause || null,
      spots_total: event.spots_total != null ? event.spots_total : null,
      spots_remaining: event.spots_remaining != null ? event.spots_remaining : null,
      associated_group_id: event.associated_group_id || null,
      status: event.status,
      organizer_name: event.organizer_name || null,
      organizer_contact_email: event.organizer_contact_email || null,
      organizer_contact_phone: event.organizer_contact_phone || null
    };

    return {
      event: eventWithResolved,
      date_label,
      time_label,
      price_display,
      cause_label,
      distance_miles,
      associated_group: group
        ? { group_id: group.id, group_name: group.name }
        : null,
      rsvp_status,
      is_saved: saved_in_lists.length > 0,
      saved_in_lists
    };
  }

  rsvpToEvent(eventId, status) {
    const allowed = ['going', 'interested', 'not_going', 'cancelled'];
    if (!allowed.includes(status)) {
      return { success: false, message: 'Invalid RSVP status', rsvp: null };
    }

    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', rsvp: null };
    }

    const rsvps = this._getFromStorage('event_rsvps', []);
    let rsvp = rsvps.find((r) => r.eventId === eventId) || null;
    const nowIso = new Date().toISOString();

    // Adjust spots_remaining for single user
    const prevStatus = rsvp ? rsvp.status : null;
    const wasGoing = prevStatus === 'going';
    const willBeGoing = status === 'going';

    if (event.spots_remaining != null && event.spots_total != null) {
      if (!wasGoing && willBeGoing) {
        event.spots_remaining = Math.max(0, event.spots_remaining - 1);
      } else if (wasGoing && !willBeGoing) {
        event.spots_remaining = Math.min(
          event.spots_total,
          event.spots_remaining + 1
        );
      }
    }

    if (rsvp) {
      rsvp.status = status;
      rsvp.responded_at = nowIso;
    } else {
      rsvp = {
        id: this._generateId('rsvp'),
        eventId,
        status,
        responded_at: nowIso
      };
      rsvps.push(rsvp);
    }

    this._saveToStorage('event_rsvps', rsvps);
    this._saveToStorage('events', events);

    // Foreign key resolution: include event object
    const rsvpWithEvent = {
      id: rsvp.id,
      eventId: rsvp.eventId,
      status: rsvp.status,
      responded_at: rsvp.responded_at,
      event
    };

    return {
      success: true,
      message: 'RSVP updated',
      rsvp: rsvpWithEvent
    };
  }

  sendOrganizerMessage(eventId, sender_name, message_text) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', organizer_message: null };
    }

    const messages = this._getFromStorage('organizer_messages', []);
    const nowIso = new Date().toISOString();

    const organizer_message = {
      id: this._generateId('orgmsg'),
      eventId,
      sender_name,
      message_text,
      sent_at: nowIso,
      status: 'sent'
    };

    messages.push(organizer_message);
    this._saveToStorage('organizer_messages', messages);

    const organizer_message_with_event = {
      ...organizer_message,
      event
    };

    return {
      success: true,
      message: 'Message sent',
      organizer_message: organizer_message_with_event
    };
  }

  // ----------------------
  // Groups & Clubs
  // ----------------------

  getGroupFilterOptions() {
    const experience_level_options = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const meeting_pattern_options = [
      { value: 'weekday_evenings', label: 'Weekday evenings' },
      { value: 'weekday_mornings', label: 'Weekday mornings' },
      { value: 'weekends', label: 'Weekends' },
      { value: 'variable', label: 'Varies' }
    ];

    const sort_options = [
      { value: 'distance_nearest_first', label: 'Distance: Nearest first' }
    ];

    return { experience_level_options, meeting_pattern_options, sort_options };
  }

  searchGroups(
    keyword,
    zip_code,
    radius_miles,
    experience_level,
    meeting_pattern,
    page = 1,
    page_size = 20
  ) {
    let groups = this._getFromStorage('groups', []);
    const memberships = this._getFromStorage('group_memberships', []);

    const keywordLower = keyword ? String(keyword).toLowerCase() : null;
    if (keywordLower) {
      groups = groups.filter((g) => {
        const hay = ((g.name || '') + ' ' + (g.description || '') + ' ' + (g.focus || '')).toLowerCase();
        return hay.includes(keywordLower);
      });
    }

    groups = groups
      .map((g) => ({
        ...g,
        _distance: this._calculateDistanceMilesFromZip(g, zip_code)
      }))
      .filter((g) => g._distance == null || g._distance <= radius_miles);

    if (experience_level) {
      groups = groups.filter((g) => {
        if (!g.experience_level) return true;
        if (experience_level === 'all_levels') return true;
        if (g.experience_level === 'all_levels') return true;
        return g.experience_level === experience_level;
      });
    }

    if (meeting_pattern) {
      groups = groups.filter((g) => {
        if (!g.meeting_pattern) return true;
        if (g.meeting_pattern === meeting_pattern) return true;
        if (g.meeting_pattern === 'variable') return true;
        return false;
      });
    }

    // Default sort by distance
    groups.sort((a, b) => (a._distance || 0) - (b._distance || 0));

    const events = this._getFromStorage('events', []);
    const now = new Date();

    const total_results = groups.length;
    const startIndex = (page - 1) * page_size;
    const paged = groups.slice(startIndex, startIndex + page_size);

    const results = paged.map((g) => {
      const groupEvents = events.filter(
        (e) => e.associated_group_id === g.id && e.status === 'scheduled'
      );
      const upcoming = groupEvents
        .filter((e) => {
          if (!e.start_datetime) return false;
          const d = new Date(e.start_datetime);
          return !isNaN(d.getTime()) && d >= now;
        })
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

      let next_session_date_label = null;
      let next_session_time_label = null;
      if (upcoming.length) {
        const s = new Date(upcoming[0].start_datetime);
        const e2 = upcoming[0].end_datetime ? new Date(upcoming[0].end_datetime) : null;
        next_session_date_label = s.toISOString().slice(0, 10);
        const st = s.toISOString().slice(11, 16);
        const et = e2 && !isNaN(e2.getTime()) ? e2.toISOString().slice(11, 16) : null;
        next_session_time_label = et ? st + ' - ' + et : st;
      }

      const membership = memberships.find((m) => m.groupId === g.id) || null;
      const membership_status = membership ? membership.status : 'not_member';

      return {
        group_id: g.id,
        name: g.name,
        description_snippet: (g.description || '').slice(0, 160),
        focus: g.focus || null,
        experience_level: g.experience_level || null,
        meeting_pattern: g.meeting_pattern || null,
        primary_location_name: g.primary_location_name || null,
        city: g.city || null,
        state: g.state || null,
        zip_code: g.zip_code || null,
        distance_miles: g._distance,
        next_session_date_label,
        next_session_time_label,
        membership_status
      };
    });

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  getGroupDetails(groupId) {
    const groups = this._getFromStorage('groups', []);
    const events = this._getFromStorage('events', []);
    const memberships = this._getFromStorage('group_memberships', []);
    const rsvps = this._getFromStorage('event_rsvps', []);

    const group = groups.find((g) => g.id === groupId) || null;
    if (!group) {
      return {
        group: null,
        distance_miles: null,
        membership_status: 'not_member',
        upcoming_events: []
      };
    }

    const distance_miles = this._calculateDistanceMilesFromZip(group, '12345');
    const membership = memberships.find((m) => m.groupId === group.id) || null;
    const membership_status = membership ? membership.status : 'not_member';

    const now = new Date();
    const groupEvents = events
      .filter(
        (e) => e.associated_group_id === group.id && e.status === 'scheduled'
      )
      .filter((e) => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const upcoming_events = groupEvents.map((e) => {
      const start = e.start_datetime ? new Date(e.start_datetime) : null;
      const end = e.end_datetime ? new Date(e.end_datetime) : null;
      let date_label = null;
      let time_label = null;
      if (start && !isNaN(start.getTime())) {
        date_label = start.toISOString().slice(0, 10);
        const st = start.toISOString().slice(11, 16);
        const et = end && !isNaN(end.getTime()) ? end.toISOString().slice(11, 16) : null;
        time_label = et ? st + ' - ' + et : st;
      }
      const rsvp = rsvps.find((r) => r.eventId === e.id) || null;
      const rsvp_status = rsvp ? rsvp.status : 'not_responded';
      return {
        event_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        date_label,
        time_label,
        location_name: e.location_name || null,
        rsvp_status
      };
    });

    const groupObj = {
      id: group.id,
      name: group.name,
      description: group.description,
      focus: group.focus || null,
      experience_level: group.experience_level || null,
      meeting_pattern: group.meeting_pattern || null,
      primary_location_name: group.primary_location_name || null,
      address_line1: group.address_line1 || null,
      address_line2: group.address_line2 || null,
      city: group.city || null,
      state: group.state || null,
      zip_code: group.zip_code || null,
      latitude: group.latitude || null,
      longitude: group.longitude || null,
      radius_miles: group.radius_miles || null
    };

    return {
      group: groupObj,
      distance_miles,
      membership_status,
      upcoming_events
    };
  }

  joinGroup(groupId) {
    const groups = this._getFromStorage('groups', []);
    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      return { success: false, message: 'Group not found', membership: null };
    }

    const memberships = this._getFromStorage('group_memberships', []);
    const nowIso = new Date().toISOString();
    let membership = memberships.find((m) => m.groupId === groupId) || null;

    if (membership) {
      membership.status = 'member';
      membership.joined_at = nowIso;
      membership.left_at = null;
    } else {
      membership = {
        id: this._generateId('membership'),
        groupId,
        status: 'member',
        joined_at: nowIso,
        left_at: null
      };
      memberships.push(membership);
    }

    this._saveToStorage('group_memberships', memberships);

    // Foreign key resolution: include group object
    const membershipWithGroup = {
      id: membership.id,
      groupId: membership.groupId,
      status: membership.status,
      joined_at: membership.joined_at,
      left_at: membership.left_at,
      group
    };

    return {
      success: true,
      message: 'Joined group',
      membership: membershipWithGroup
    };
  }

  // ----------------------
  // Saved lists
  // ----------------------

  addItemToSavedList(listId, item_type, item_id) {
    const lists = this._getFromStorage('saved_lists', []);
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return { success: false, message: 'List not found', list_id: null, list_name: null, saved_item: null };
    }

    const savedItems = this._getFromStorage('saved_list_items', []);
    const exists = savedItems.find(
      (it) => it.listId === listId && it.item_type === item_type && it.item_id === item_id
    );
    if (exists) {
      return {
        success: true,
        message: 'Item already in list',
        list_id: list.id,
        list_name: list.name,
        saved_item: {
          list_item_id: exists.id,
          item_type: exists.item_type,
          item_id: exists.item_id,
          added_at: exists.added_at
        }
      };
    }

    const nowIso = new Date().toISOString();
    const position = savedItems.filter((it) => it.listId === listId).length;
    const newItem = {
      id: this._generateId('sli'),
      listId,
      item_type,
      item_id,
      added_at: nowIso,
      position,
      notes: ''
    };

    savedItems.push(newItem);
    this._saveToStorage('saved_list_items', savedItems);

    const saved_item = {
      list_item_id: newItem.id,
      item_type: newItem.item_type,
      item_id: newItem.item_id,
      added_at: newItem.added_at
    };

    return {
      success: true,
      message: 'Item added to list',
      list_id: list.id,
      list_name: list.name,
      saved_item
    };
  }

  createSavedListAndAddItem(list_name, description, item_type, item_id) {
    const nowIso = new Date().toISOString();
    const lists = this._getFromStorage('saved_lists', []);

    const newList = {
      id: this._generateId('list'),
      name: list_name,
      description: description || '',
      created_at: nowIso,
      updated_at: nowIso
    };
    lists.push(newList);
    this._saveToStorage('saved_lists', lists);

    const savedItems = this._getFromStorage('saved_list_items', []);
    const newItem = {
      id: this._generateId('sli'),
      listId: newList.id,
      item_type,
      item_id,
      added_at: nowIso,
      position: 0,
      notes: ''
    };
    savedItems.push(newItem);
    this._saveToStorage('saved_list_items', savedItems);

    const list = {
      id: newList.id,
      name: newList.name,
      description: newList.description,
      created_at: newList.created_at,
      updated_at: newList.updated_at
    };

    const saved_item = {
      list_item_id: newItem.id,
      item_type: newItem.item_type,
      item_id: newItem.item_id,
      added_at: newItem.added_at
    };

    return {
      list,
      saved_item,
      message: 'List created and item added'
    };
  }

  getSavedListsOverview() {
    const lists = this._getFromStorage('saved_lists', []);
    const items = this._getFromStorage('saved_list_items', []);

    const overview = lists.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description || '',
      item_count: items.filter((it) => it.listId === l.id).length,
      created_at: l.created_at,
      updated_at: l.updated_at || null
    }));

    return { lists: overview };
  }

  createSavedList(list_name, description) {
    const nowIso = new Date().toISOString();
    const lists = this._getFromStorage('saved_lists', []);
    const newList = {
      id: this._generateId('list'),
      name: list_name,
      description: description || '',
      created_at: nowIso,
      updated_at: nowIso
    };
    lists.push(newList);
    this._saveToStorage('saved_lists', lists);

    return {
      list: newList
    };
  }

  renameSavedList(listId, new_name) {
    const lists = this._getFromStorage('saved_lists', []);
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return { success: false, message: 'List not found', list: null };
    }
    list.name = new_name;
    list.updated_at = new Date().toISOString();
    this._saveToStorage('saved_lists', lists);

    return {
      success: true,
      message: 'List renamed',
      list: {
        id: list.id,
        name: list.name,
        description: list.description || '',
        updated_at: list.updated_at
      }
    };
  }

  deleteSavedList(listId) {
    const lists = this._getFromStorage('saved_lists', []);
    const items = this._getFromStorage('saved_list_items', []);
    const listIndex = lists.findIndex((l) => l.id === listId);
    if (listIndex === -1) {
      return { success: false, message: 'List not found' };
    }

    lists.splice(listIndex, 1);
    const remainingItems = items.filter((it) => it.listId !== listId);

    this._saveToStorage('saved_lists', lists);
    this._saveToStorage('saved_list_items', remainingItems);

    return { success: true, message: 'List deleted' };
  }

  getSavedListDetail(listId) {
    const lists = this._getFromStorage('saved_lists', []);
    const items = this._getFromStorage('saved_list_items', []);
    const places = this._getFromStorage('places', []);
    const events = this._getFromStorage('events', []);
    const groups = this._getFromStorage('groups', []);
    const categories = this._getFromStorage('directory_categories', []);

    const list = lists.find((l) => l.id === listId) || null;
    if (!list) {
      return {
        list: null,
        items: []
      };
    }

    const listItems = items
      .filter((it) => it.listId === listId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const detailedItems = listItems.map((it) => {
      let itemObj = null;
      let type_label = null;
      let category_name = null;
      let rating = null;
      let price_summary = null;
      const key_tags = [];

      if (it.item_type === 'place') {
        const p = places.find((x) => x.id === it.item_id) || null;
        itemObj = p;
        if (p) {
          const cat = categories.find((c) => c.id === p.category_id);
          category_name = cat ? cat.name : null;
          type_label = p.subcategory ? p.subcategory.charAt(0).toUpperCase() + p.subcategory.slice(1) : 'Place';
          rating = p.rating || null;
          if (p.average_price_per_person != null) {
            price_summary = '$' + p.average_price_per_person + ' per person';
          } else if (p.hourly_rate != null) {
            price_summary = '$' + p.hourly_rate + '/hour';
          } else if (p.call_out_fee != null) {
            price_summary = '$' + p.call_out_fee + ' call-out';
          }
          if (p.is_family_friendly) key_tags.push('family_friendly');
          if (p.is_24_7_emergency) key_tags.push('24_7_emergency');
          if (p.has_playground) key_tags.push('playground');
          if (p.is_dog_friendly) key_tags.push('dog_friendly');
        }
      } else if (it.item_type === 'event') {
        const e = events.find((x) => x.id === it.item_id) || null;
        itemObj = e;
        if (e) {
          type_label = 'Event';
          category_name = e.event_type;
          if (e.is_free || e.price === 0) {
            price_summary = 'Free';
          } else if (e.price != null) {
            price_summary = '$' + e.price;
          }
          if (e.cause) key_tags.push(e.cause);
        }
      } else if (it.item_type === 'group') {
        const g = groups.find((x) => x.id === it.item_id) || null;
        itemObj = g;
        if (g) {
          type_label = 'Group';
          category_name = g.focus || null;
        }
      }

      const display = {
        name: itemObj ? itemObj.name || itemObj.title || '' : '',
        type_label,
        category_name,
        rating,
        price_summary,
        key_tags
      };

      // Optional: attach resolved item for convenience
      return {
        list_item_id: it.id,
        item_type: it.item_type,
        item_id: it.item_id,
        added_at: it.added_at,
        position: it.position,
        notes: it.notes || '',
        display,
        item: itemObj
      };
    });

    const listObj = {
      id: list.id,
      name: list.name,
      description: list.description || '',
      created_at: list.created_at,
      updated_at: list.updated_at || null
    };

    return {
      list: listObj,
      items: detailedItems
    };
  }

  removeItemFromSavedList(list_item_id) {
    const items = this._getFromStorage('saved_list_items', []);
    const index = items.findIndex((it) => it.id === list_item_id);
    if (index === -1) {
      return { success: false, message: 'List item not found' };
    }
    items.splice(index, 1);
    this._saveToStorage('saved_list_items', items);
    return { success: true, message: 'Item removed from list' };
  }

  reorderSavedListItems(listId, ordered_item_ids) {
    const items = this._getFromStorage('saved_list_items', []);
    const idToItem = {};
    items.forEach((it) => {
      if (it.listId === listId) {
        idToItem[it.id] = it;
      }
    });

    ordered_item_ids.forEach((id, idx) => {
      const item = idToItem[id];
      if (item) {
        item.position = idx;
      }
    });

    this._saveToStorage('saved_list_items', items);
    return { success: true, message: 'List items reordered' };
  }

  clearSavedList(listId) {
    const items = this._getFromStorage('saved_list_items', []);
    const remaining = items.filter((it) => it.listId !== listId);
    this._saveToStorage('saved_list_items', remaining);
    return { success: true, message: 'List cleared' };
  }

  // ----------------------
  // Static pages & site contact
  // ----------------------

  getStaticPageContent(page_key) {
    const pages = this._getFromStorage('static_pages', {});
    const page = pages && pages[page_key] ? pages[page_key] : null;
    if (!page) {
      return {
        title: '',
        body_markdown: '',
        last_updated: null
      };
    }
    return {
      title: page.title || '',
      body_markdown: page.body_markdown || '',
      last_updated: page.last_updated || null
    };
  }

  getSiteContactInfo() {
    const info = this._getFromStorage('site_contact_info', {});
    return {
      support_email: info.support_email || '',
      support_phone: info.support_phone || '',
      mailing_address: info.mailing_address || ''
    };
  }

  submitSiteContactMessage(sender_name, sender_email, subject, message_text) {
    if (!message_text) {
      return { success: false, message: 'message_text is required', contact_message: null };
    }

    const messages = this._getFromStorage('site_contact_messages', []);
    const nowIso = new Date().toISOString();
    const msg = {
      id: this._generateId('contact'),
      sender_name: sender_name || '',
      sender_email: sender_email || '',
      subject: subject || '',
      message_text,
      sent_at: nowIso,
      status: 'sent'
    };

    messages.push(msg);
    this._saveToStorage('site_contact_messages', messages);

    return {
      success: true,
      message: 'Contact message submitted',
      contact_message: msg
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