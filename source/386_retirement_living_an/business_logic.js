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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const tableKeys = [
      'communities',
      'accommodation_units',
      'shortlists',
      'shortlist_items',
      'tour_bookings',
      'respite_enquiries',
      'cost_estimates',
      'events',
      'rsvps',
      'brochure_requests',
      'job_postings',
      'job_applications',
      'articles',
      'reading_lists',
      'reading_list_items',
      'room_reservation_requests',
      'general_contact_submissions'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getUserScopedStorage() {
    // Single-user context; abstraction point if multi-user scoping is added later
    return localStorage;
  }

  _getFromStorage(key, defaultValue = []) {
    const storage = this._getUserScopedStorage();
    const data = storage.getItem(key);
    if (!data) {
      // Clone defaultValue if it is an array to avoid accidental mutation
      if (Array.isArray(defaultValue)) return defaultValue.slice();
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      if (Array.isArray(defaultValue)) return defaultValue.slice();
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    const storage = this._getUserScopedStorage();
    storage.setItem(key, JSON.stringify(data));
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

  // -------------------- Domain Helpers --------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _dateInRange(dateStr, startStr, endStr) {
    const d = this._parseDate(dateStr);
    const s = this._parseDate(startStr);
    const e = this._parseDate(endStr);
    if (!d || !s || !e) return false;
    return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
  }

  _getOrCreateShortlist() {
    let shortlists = this._getFromStorage('shortlists');
    if (shortlists.length > 0) {
      return shortlists[0];
    }
    const now = this._nowIso();
    const shortlist = {
      id: this._generateId('shortlist'),
      name: 'My Shortlist',
      created_at: now,
      updated_at: now
    };
    shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);
    return shortlist;
  }

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowIso();
    const readingList = {
      id: this._generateId('readinglist'),
      name: 'My Reading List',
      created_at: now,
      updated_at: now
    };
    lists.push(readingList);
    this._saveToStorage('reading_lists', lists);
    return readingList;
  }

  _saveCostEstimateForUser(estimate) {
    // Internal helper around cost_estimates table
    const estimates = this._getFromStorage('cost_estimates');
    estimates.push(estimate);
    this._saveToStorage('cost_estimates', estimates);
    return estimate;
  }

  _findCommunityById(communityId) {
    const communities = this._getFromStorage('communities');
    return communities.find(c => c.id === communityId) || null;
  }

  _findAccommodationById(accommodationId) {
    const units = this._getFromStorage('accommodation_units');
    return units.find(u => u.id === accommodationId) || null;
  }

  _findEventById(eventId) {
    const events = this._getFromStorage('events');
    return events.find(e => e.id === eventId) || null;
  }

  _findJobPostingById(jobPostingId) {
    const jobs = this._getFromStorage('job_postings');
    return jobs.find(j => j.id === jobPostingId) || null;
  }

  _findArticleById(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find(a => a.id === articleId) || null;
  }

  _computeCommunityStartingPrice(community, careTypesFilter) {
    const prices = [];
    if (!community) return null;

    const addIfNumber = val => {
      if (typeof val === 'number' && !isNaN(val)) {
        prices.push(val);
      }
    };

    // If careTypesFilter is provided and narrow, favor the relevant starting price
    if (Array.isArray(careTypesFilter) && careTypesFilter.length === 1) {
      const ct = careTypesFilter[0];
      if (ct === 'independent_living') addIfNumber(community.starting_price_independent_living);
      else if (ct === 'assisted_living') addIfNumber(community.starting_price_assisted_living);
      else if (ct === 'residential_care') addIfNumber(community.starting_price_residential_care);
      else if (ct === 'memory_care') addIfNumber(community.starting_price_memory_care);
    }

    // Always consider all starting prices as fallback
    addIfNumber(community.starting_price_independent_living);
    addIfNumber(community.starting_price_assisted_living);
    addIfNumber(community.starting_price_residential_care);
    addIfNumber(community.starting_price_memory_care);

    if (!prices.length) return null;
    return Math.min.apply(null, prices);
  }

  // -------------------- Interface Implementations --------------------

  // 1) getHomepageHighlights
  getHomepageHighlights() {
    const communities = this._getFromStorage('communities');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');

    // Featured communities: pick those with any starting price, sort by rating desc, then price asc
    const communitiesWithPrice = communities
      .map(c => {
        const starting = this._computeCommunityStartingPrice(c, null);
        return { community: c, starting_price_from: starting };
      })
      .filter(cw => cw.starting_price_from !== null);

    communitiesWithPrice.sort((a, b) => {
      const ra = typeof a.community.rating_average === 'number' ? a.community.rating_average : 0;
      const rb = typeof b.community.rating_average === 'number' ? b.community.rating_average : 0;
      if (rb !== ra) return rb - ra;
      return a.starting_price_from - b.starting_price_from;
    });

    const featured_communities = communitiesWithPrice.slice(0, 6).map(cw => {
      const c = cw.community;
      return {
        community_id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        care_type_primary: c.care_type_primary || null,
        rating_average: typeof c.rating_average === 'number' ? c.rating_average : null,
        rating_count: typeof c.rating_count === 'number' ? c.rating_count : 0,
        starting_price_from: cw.starting_price_from,
        starting_price_label: cw.starting_price_from != null ? 'From $' + cw.starting_price_from + '/month' : '',
        hero_image: c.hero_image || null
      };
    });

    // Featured articles: advice_guides, most recent
    const featured_articles = articles
      .filter(a => a.category_id === 'advice_guides')
      .sort((a, b) => {
        const da = this._parseDate(a.published_date) || new Date(0);
        const db = this._parseDate(b.published_date) || new Date(0);
        return db.getTime() - da.getTime();
      })
      .slice(0, 3)
      .map(a => ({
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        category_id: a.category_id,
        planning_timeframe: a.planning_timeframe || null,
        published_date: a.published_date || null,
        hero_image: a.hero_image || null
      }));

    // Upcoming events: public and in the future
    const now = new Date();
    const upcoming_events = events
      .filter(e => e.is_public && this._parseDate(e.start_datetime) && this._parseDate(e.start_datetime) > now)
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da.getTime() - db.getTime();
      })
      .slice(0, 5)
      .map(e => ({
        event_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        time_of_day_category: e.time_of_day_category,
        city: e.city,
        state: e.state,
        is_public: !!e.is_public
      }));

    const care_types_overview = this.getCareTypesOverview();

    return {
      hero_search_placeholder: 'Search by city, ZIP, or community name',
      featured_communities,
      featured_articles,
      upcoming_events,
      care_types_overview
    };
  }

  // 2) getCareTypesOverview
  getCareTypesOverview() {
    // Allow overriding via localStorage key 'care_types_overview'
    const stored = this._getFromStorage('care_types_overview', null);
    if (stored && Array.isArray(stored)) {
      return stored;
    }

    // Static defaults (not persisted)
    return [
      {
        care_type: 'independent_living',
        title: 'Independent Living',
        short_description: 'Maintenance-free apartments or cottages with social activities and optional services.',
        typical_services: 'Housekeeping, social activities, basic maintenance, optional meals.'
      },
      {
        care_type: 'assisted_living',
        title: 'Assisted Living',
        short_description: 'Support with daily tasks while maintaining independence in a community setting.',
        typical_services: 'Help with bathing, dressing, medication, meals, and 24/7 staff on-site.'
      },
      {
        care_type: 'residential_care',
        title: 'Residential Care / Care Homes',
        short_description: 'Smaller, home-like settings with higher staff support.',
        typical_services: 'Personal care, medication support, meals, activities in a small home environment.'
      },
      {
        care_type: 'memory_care',
        title: 'Memory Care',
        short_description: 'Specialized support for residents living with Alzheimer’s or other dementias.',
        typical_services: 'Secured environment, cognitive activities, dementia-trained staff.'
      },
      {
        care_type: 'respite_care',
        title: 'Respite Care',
        short_description: 'Short-term stays for recovery or to give caregivers a break.',
        typical_services: 'Furnished suite, meals, personal care, access to community amenities.'
      }
    ];
  }

  // 3) getCommunitySearchFilters
  getCommunitySearchFilters() {
    const communities = this._getFromStorage('communities');
    const units = this._getFromStorage('accommodation_units');

    const allPrices = [];
    communities.forEach(c => {
      const p = this._computeCommunityStartingPrice(c, null);
      if (p != null) allPrices.push(p);
    });
    units.forEach(u => {
      if (typeof u.monthly_price === 'number' && !isNaN(u.monthly_price)) {
        allPrices.push(u.monthly_price);
      }
    });

    const minPrice = allPrices.length ? Math.min.apply(null, allPrices) : 0;
    const maxPrice = allPrices.length ? Math.max.apply(null, allPrices) : 10000;

    return {
      care_type_options: [
        { value: 'independent_living', label: 'Independent Living' },
        { value: 'assisted_living', label: 'Assisted Living' },
        { value: 'residential_care', label: 'Residential Care / Care Home' },
        { value: 'memory_care', label: 'Memory Care' },
        { value: 'respite_care', label: 'Respite Care' },
        { value: 'skilled_nursing', label: 'Skilled Nursing' },
        { value: 'all_care', label: 'All Care Types' }
      ],
      bedroom_count_options: [0, 1, 2, 3],
      amenity_options: {
        pet_friendly_small_pets_label: 'Pet-friendly (Small Pets Allowed)',
        fitness_center_gym_label: 'Fitness Center / Gym',
        garden_view_label: 'Garden View'
      },
      rating_options: [3, 3.5, 4, 4.5, 5],
      specialized_service_options: {
        dementia_care_label: 'Dementia / Memory Care Available'
      },
      sort_options: [
        { value: 'price_monthly_low_to_high', label: 'Price (Monthly) – Low to High' },
        { value: 'price_monthly_high_to_low', label: 'Price (Monthly) – High to Low' },
        { value: 'rating_high_to_low', label: 'Rating – High to Low' },
        { value: 'distance_nearest', label: 'Distance – Nearest First' }
      ],
      price_slider: {
        min: minPrice,
        max: maxPrice,
        step: 50,
        currency: 'usd'
      }
    };
  }

  // 4) searchCommunitiesAndUnits
  searchCommunitiesAndUnits(query, location_text, filters, sort_by, page = 1, page_size = 20) {
    filters = filters || {};
    const communities = this._getFromStorage('communities');
    const units = this._getFromStorage('accommodation_units');

    const qLower = query ? String(query).toLowerCase() : null;
    const locLower = location_text ? String(location_text).toLowerCase() : null;

    const careTypesFilter = Array.isArray(filters.care_types) && filters.care_types.length
      ? filters.care_types
      : null;

    // First pass: filter communities by text, location, rating, amenities, dementia flag
    const communityBase = communities.filter(c => {
      let matchesLocation = true;
      if (locLower) {
        const city = (c.city || '').toLowerCase();
        const state = (c.state || '').toLowerCase();
        const zip = (c.zip_code || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        const combined = (city + ' ' + state + ' ' + zip + ' ' + name).trim();
        matchesLocation =
          combined.includes(locLower) ||
          locLower.includes(city) ||
          locLower.includes(state) ||
          locLower.includes(zip) ||
          locLower.includes(name);
      }

      let matchesQuery = true;
      if (qLower) {
        const haystack = (
          (c.name || '') + ' ' +
          (c.description || '') + ' ' +
          (c.city || '') + ' ' +
          (c.state || '')
        ).toLowerCase();
        const haystackNorm = haystack.replace(/[,]+/g, ' ');
        const queryNorm = qLower.replace(/[,]+/g, ' ');
        const tokens = queryNorm.split(/\s+/).filter(Boolean);
        if (!tokens.length) {
          matchesQuery = true;
        } else {
          matchesQuery = tokens.some(t => haystackNorm.includes(t));
        }
      }

      let matchesCareType = true;
      if (careTypesFilter) {
        const offered = Array.isArray(c.care_types_offered) ? c.care_types_offered : [];
        matchesCareType = offered.some(ct => careTypesFilter.indexOf(ct) !== -1);
      }

      let matchesDementia = true;
      if (filters.dementia_care_only) {
        matchesDementia = !!c.dementia_care_available;
      }

      let matchesRating = true;
      if (typeof filters.rating_min === 'number') {
        const rating = typeof c.rating_average === 'number' ? c.rating_average : 0;
        matchesRating = rating >= filters.rating_min;
      }

      let matchesAmenities = true;
      if (filters.amenities) {
        const a = filters.amenities;
        if (typeof a.pet_friendly_small_pets === 'boolean' && a.pet_friendly_small_pets) {
          if (!c.is_pet_friendly_small_pets) matchesAmenities = false;
        }
        if (typeof a.fitness_center_gym === 'boolean' && a.fitness_center_gym) {
          if (!c.has_fitness_center_gym) matchesAmenities = false;
        }
        if (typeof a.garden_view === 'boolean' && a.garden_view) {
          if (!c.has_garden_view_accommodation) matchesAmenities = false;
        }
      }

      return matchesLocation && matchesQuery && matchesCareType && matchesDementia && matchesRating && matchesAmenities;
    });

    const communityMap = {};
    communityBase.forEach(c => { communityMap[c.id] = c; });

    // Filter units based on community filter and unit-specific filters
    const moveInDate = filters.move_in_date ? this._parseDate(filters.move_in_date) : null;

    const matching_units = units.filter(u => {
      const community = communityMap[u.community_id];
      if (!community) return false; // obey hierarchical relationship

      if (careTypesFilter && careTypesFilter.indexOf(u.care_type) === -1) return false;

      if (typeof filters.bedroom_count === 'number') {
        if (u.bedroom_count !== filters.bedroom_count) return false;
      }

      if (typeof filters.min_monthly_price === 'number') {
        if (typeof u.monthly_price !== 'number' || u.monthly_price < filters.min_monthly_price) return false;
      }

      if (typeof filters.max_monthly_price === 'number') {
        if (typeof u.monthly_price !== 'number' || u.monthly_price > filters.max_monthly_price) return false;
      }

      if (moveInDate) {
        const availableFrom = this._parseDate(u.available_from);
        const availableTo = this._parseDate(u.available_to);
        if (availableFrom && moveInDate < availableFrom) return false;
        if (availableTo && moveInDate > availableTo) return false;
      }

      return true;
    }).map(u => {
      const community = communityMap[u.community_id];
      return {
        accommodation_id: u.id,
        community_id: u.community_id,
        community_name: community ? community.name : null,
        city: community ? community.city : null,
        state: community ? community.state : null,
        name: u.name,
        unit_type: u.unit_type,
        care_type: u.care_type,
        bedroom_count: u.bedroom_count,
        has_ensuite: !!u.has_ensuite,
        view_type: u.view_type || null,
        monthly_price: u.monthly_price,
        available_from: u.available_from || null,
        available_to: u.available_to || null,
        thumbnail_photo: (u.photos && u.photos[0]) || u.floor_plan_image || null,
        // Foreign key resolution for convenience
        community: community || null
      };
    });

    // Filter communities further based on price and ensure they have at least one matching unit when unit filters apply
    const communityIdHasMatchingUnit = {};
    matching_units.forEach(mu => { communityIdHasMatchingUnit[mu.community_id] = true; });

    const communitiesFiltered = communityBase.filter(c => {
      // Price filter based on starting prices if provided
      if (typeof filters.max_monthly_price === 'number') {
        const starting = this._computeCommunityStartingPrice(c, careTypesFilter);
        if (starting != null && starting > filters.max_monthly_price) {
          // However, if units exist under the max price, keep the community
          if (!communityIdHasMatchingUnit[c.id]) return false;
        }
      }

      // If unit-specific filters were applied (bedroom_count, move_in_date, min/max price), require at least one matching unit
      const unitSpecificFilterApplied = (
        typeof filters.bedroom_count === 'number' ||
        typeof filters.min_monthly_price === 'number' ||
        typeof filters.max_monthly_price === 'number' ||
        !!moveInDate
      );

      if (unitSpecificFilterApplied && !communityIdHasMatchingUnit[c.id]) {
        return false;
      }

      return true;
    });

    // Sorting communities
    const communitiesSorted = communitiesFiltered.slice();
    if (sort_by === 'price_monthly_low_to_high' || sort_by === 'price_monthly_high_to_low') {
      communitiesSorted.sort((a, b) => {
        const pa = this._computeCommunityStartingPrice(a, careTypesFilter) || Number.MAX_SAFE_INTEGER;
        const pb = this._computeCommunityStartingPrice(b, careTypesFilter) || Number.MAX_SAFE_INTEGER;
        return sort_by === 'price_monthly_low_to_high' ? pa - pb : pb - pa;
      });
    } else if (sort_by === 'rating_high_to_low') {
      communitiesSorted.sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        return rb - ra;
      });
    } else if (sort_by === 'distance_nearest') {
      // If distance_miles is not stored, keep existing order
    }

    // Pagination for communities
    const total_results = communitiesSorted.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const communitiesPage = communitiesSorted.slice(startIndex, endIndex).map(c => ({
      community_id: c.id,
      name: c.name,
      description: c.description || '',
      city: c.city,
      state: c.state,
      zip_code: c.zip_code,
      care_types_offered: Array.isArray(c.care_types_offered) ? c.care_types_offered : [],
      dementia_care_available: !!c.dementia_care_available,
      is_pet_friendly_small_pets: !!c.is_pet_friendly_small_pets,
      has_fitness_center_gym: !!c.has_fitness_center_gym,
      has_garden_view_accommodation: !!c.has_garden_view_accommodation,
      rating_average: typeof c.rating_average === 'number' ? c.rating_average : null,
      rating_count: typeof c.rating_count === 'number' ? c.rating_count : 0,
      starting_price_independent_living: c.starting_price_independent_living != null ? c.starting_price_independent_living : null,
      starting_price_assisted_living: c.starting_price_assisted_living != null ? c.starting_price_assisted_living : null,
      starting_price_residential_care: c.starting_price_residential_care != null ? c.starting_price_residential_care : null,
      starting_price_memory_care: c.starting_price_memory_care != null ? c.starting_price_memory_care : null,
      distance_miles: c.distance_miles != null ? c.distance_miles : null,
      hero_image: c.hero_image || null
    }));

    // Sort matching_units by price if requested
    const matchingUnitsSorted = matching_units.slice();
    if (sort_by === 'price_monthly_low_to_high') {
      matchingUnitsSorted.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sort_by === 'price_monthly_high_to_low') {
      matchingUnitsSorted.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
    }

    return {
      total_results,
      page,
      page_size,
      communities: communitiesPage,
      matching_units: matchingUnitsSorted
    };
  }

  // 5) getCommunityDetail
  getCommunityDetail(community_id) {
    const community = this._findCommunityById(community_id);
    if (!community) return null;

    const amenity_badges = [];
    if (community.is_pet_friendly_small_pets) amenity_badges.push('Pet-friendly');
    if (community.has_fitness_center_gym) amenity_badges.push('Fitness Center / Gym');
    if (community.has_garden_view_accommodation) amenity_badges.push('Garden-view rooms');
    if (community.dementia_care_available) amenity_badges.push('Dementia / Memory Care');

    return {
      community_id: community.id,
      name: community.name,
      slug: community.slug || null,
      description: community.description || '',
      address_line1: community.address_line1,
      address_line2: community.address_line2 || null,
      city: community.city,
      state: community.state,
      zip_code: community.zip_code,
      latitude: community.latitude != null ? community.latitude : null,
      longitude: community.longitude != null ? community.longitude : null,
      phone_number: community.phone_number || null,
      email: community.email || null,
      website_url: community.website_url || null,
      care_types_offered: Array.isArray(community.care_types_offered) ? community.care_types_offered : [],
      care_type_primary: community.care_type_primary || null,
      dementia_care_available: !!community.dementia_care_available,
      is_pet_friendly_small_pets: !!community.is_pet_friendly_small_pets,
      has_fitness_center_gym: !!community.has_fitness_center_gym,
      has_garden_view_accommodation: !!community.has_garden_view_accommodation,
      rating_average: typeof community.rating_average === 'number' ? community.rating_average : null,
      rating_count: typeof community.rating_count === 'number' ? community.rating_count : 0,
      starting_price_independent_living: community.starting_price_independent_living != null ? community.starting_price_independent_living : null,
      starting_price_assisted_living: community.starting_price_assisted_living != null ? community.starting_price_assisted_living : null,
      starting_price_residential_care: community.starting_price_residential_care != null ? community.starting_price_residential_care : null,
      starting_price_memory_care: community.starting_price_memory_care != null ? community.starting_price_memory_care : null,
      respite_care_available: !!community.respite_care_available,
      respite_daily_rate_from: community.respite_daily_rate_from != null ? community.respite_daily_rate_from : null,
      hero_image: community.hero_image || null,
      photo_gallery: Array.isArray(community.photo_gallery) ? community.photo_gallery : [],
      amenity_badges,
      map_embed: {
        latitude: community.latitude != null ? community.latitude : null,
        longitude: community.longitude != null ? community.longitude : null
      }
    };
  }

  // 6) listCommunityAccommodationUnits
  listCommunityAccommodationUnits(community_id, filters, sort_by) {
    filters = filters || {};
    const unitsRaw = this._getFromStorage('accommodation_units');

    const moveInDate = filters.move_in_date ? this._parseDate(filters.move_in_date) : null;

    let units = unitsRaw.filter(u => u.community_id === community_id);

    if (Array.isArray(filters.unit_types) && filters.unit_types.length) {
      units = units.filter(u => filters.unit_types.indexOf(u.unit_type) !== -1);
    }

    if (typeof filters.bedroom_count === 'number') {
      units = units.filter(u => u.bedroom_count === filters.bedroom_count);
    }

    if (typeof filters.has_ensuite === 'boolean') {
      units = units.filter(u => !!u.has_ensuite === filters.has_ensuite);
    }

    if (typeof filters.view_type === 'string') {
      units = units.filter(u => u.view_type === filters.view_type);
    }

    if (typeof filters.min_monthly_price === 'number') {
      units = units.filter(u => typeof u.monthly_price === 'number' && u.monthly_price >= filters.min_monthly_price);
    }

    if (typeof filters.max_monthly_price === 'number') {
      units = units.filter(u => typeof u.monthly_price === 'number' && u.monthly_price <= filters.max_monthly_price);
    }

    if (moveInDate) {
      units = units.filter(u => {
        const availableFrom = this._parseDate(u.available_from);
        const availableTo = this._parseDate(u.available_to);
        if (availableFrom && moveInDate < availableFrom) return false;
        if (availableTo && moveInDate > availableTo) return false;
        return true;
      });
    }

    const unitsSorted = units.slice();
    if (sort_by === 'price_low_to_high') {
      unitsSorted.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sort_by === 'price_high_to_low') {
      unitsSorted.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
    }

    return {
      community_id,
      total_results: unitsSorted.length,
      units: unitsSorted.map(u => ({
        accommodation_id: u.id,
        name: u.name,
        unit_type: u.unit_type,
        care_type: u.care_type,
        bedroom_count: u.bedroom_count,
        has_ensuite: !!u.has_ensuite,
        view_type: u.view_type || null,
        monthly_price: u.monthly_price,
        available_from: u.available_from || null,
        available_to: u.available_to || null,
        floor_area_sq_ft: u.floor_area_sq_ft != null ? u.floor_area_sq_ft : null,
        thumbnail_photo: (u.photos && u.photos[0]) || u.floor_plan_image || null,
        is_featured: !!u.is_featured
      }))
    };
  }

  // 7) getAccommodationFilterOptions
  getAccommodationFilterOptions(community_id) {
    const units = this._getFromStorage('accommodation_units').filter(u => u.community_id === community_id);

    const unitTypeMap = {};
    const viewTypeMap = {};
    const bedroomSet = new Set();
    const prices = [];

    units.forEach(u => {
      if (u.unit_type && !unitTypeMap[u.unit_type]) {
        unitTypeMap[u.unit_type] = {
          value: u.unit_type,
          label: u.unit_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        };
      }
      if (u.view_type && !viewTypeMap[u.view_type]) {
        viewTypeMap[u.view_type] = {
          value: u.view_type,
          label: u.view_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        };
      }
      if (typeof u.bedroom_count === 'number') {
        bedroomSet.add(u.bedroom_count);
      }
      if (typeof u.monthly_price === 'number' && !isNaN(u.monthly_price)) {
        prices.push(u.monthly_price);
      }
    });

    const bedroom_count_options = Array.from(bedroomSet).sort((a, b) => a - b);
    const minPrice = prices.length ? Math.min.apply(null, prices) : 0;
    const maxPrice = prices.length ? Math.max.apply(null, prices) : 10000;

    return {
      unit_type_options: Object.values(unitTypeMap),
      view_type_options: Object.values(viewTypeMap),
      bedroom_count_options,
      price_slider: {
        min: minPrice,
        max: maxPrice,
        step: 50,
        currency: 'usd'
      }
    };
  }

  // 8) getAccommodationDetail
  getAccommodationDetail(accommodation_id) {
    const unit = this._findAccommodationById(accommodation_id);
    if (!unit) return null;
    const community = this._findCommunityById(unit.community_id);

    return {
      accommodation_id: unit.id,
      community_id: unit.community_id,
      community_name: community ? community.name : null,
      community_city: community ? community.city : null,
      community_state: community ? community.state : null,
      name: unit.name,
      unit_type: unit.unit_type,
      care_type: unit.care_type,
      bedroom_count: unit.bedroom_count,
      has_ensuite: !!unit.has_ensuite,
      view_type: unit.view_type || null,
      monthly_price: unit.monthly_price,
      available_from: unit.available_from || null,
      available_to: unit.available_to || null,
      floor_area_sq_ft: unit.floor_area_sq_ft != null ? unit.floor_area_sq_ft : null,
      floor_plan_image: unit.floor_plan_image || null,
      photos: Array.isArray(unit.photos) ? unit.photos : [],
      included_services: Array.isArray(unit.included_services) ? unit.included_services : [],
      is_featured: !!unit.is_featured,
      // Foreign key resolution helper
      community: community || null
    };
  }

  // 9) addAccommodationToShortlist
  addAccommodationToShortlist(accommodation_id, notes) {
    const accommodation = this._findAccommodationById(accommodation_id);
    if (!accommodation) {
      return {
        success: false,
        message: 'Accommodation not found',
        shortlist_item_id: null,
        total_shortlisted_units: this._getFromStorage('shortlist_items').length
      };
    }

    const shortlist = this._getOrCreateShortlist();
    let items = this._getFromStorage('shortlist_items');

    const shortlist_item = {
      id: this._generateId('shortlistitem'),
      shortlist_id: shortlist.id,
      accommodation_id,
      added_at: this._nowIso(),
      notes: notes || null
    };

    items.push(shortlist_item);
    this._saveToStorage('shortlist_items', items);

    const total_shortlisted_units = items.filter(i => i.shortlist_id === shortlist.id).length;

    return {
      success: true,
      message: 'Accommodation added to shortlist',
      shortlist_item_id: shortlist_item.id,
      total_shortlisted_units
    };
  }

  // 10) getShortlistItems
  getShortlistItems() {
    const shortlist = this._getOrCreateShortlist();
    const items = this._getFromStorage('shortlist_items').filter(i => i.shortlist_id === shortlist.id);
    const units = this._getFromStorage('accommodation_units');
    const communities = this._getFromStorage('communities');

    const unitMap = {};
    units.forEach(u => { unitMap[u.id] = u; });
    const communityMap = {};
    communities.forEach(c => { communityMap[c.id] = c; });

    return items.map(i => {
      const unit = unitMap[i.accommodation_id] || null;
      const community = unit ? (communityMap[unit.community_id] || null) : null;

      return {
        shortlist_item_id: i.id,
        added_at: i.added_at,
        notes: i.notes || null,
        accommodation_id: i.accommodation_id,
        accommodation_name: unit ? unit.name : null,
        community_id: community ? community.id : null,
        community_name: community ? community.name : null,
        city: community ? community.city : null,
        state: community ? community.state : null,
        monthly_price: unit ? unit.monthly_price : null,
        care_type: unit ? unit.care_type : null,
        // Foreign key resolution objects
        accommodation: unit,
        community: community
      };
    });
  }

  // 11) submitRoomReservationRequest
  submitRoomReservationRequest(accommodation_id, full_name, email, phone, preferred_move_in_date, request_type) {
    const unit = this._findAccommodationById(accommodation_id);
    if (!unit) {
      return {
        success: false,
        message: 'Accommodation not found',
        reservation_request: null
      };
    }

    if (request_type !== 'reservation' && request_type !== 'hold_request') {
      return {
        success: false,
        message: 'Invalid request_type',
        reservation_request: null
      };
    }

    const requests = this._getFromStorage('room_reservation_requests');
    const id = this._generateId('roomres');
    const now = this._nowIso();

    const record = {
      id,
      accommodation_id,
      community_id: unit.community_id,
      full_name,
      email,
      phone: phone || null,
      preferred_move_in_date,
      request_type,
      created_at: now,
      status: 'submitted'
    };

    requests.push(record);
    this._saveToStorage('room_reservation_requests', requests);

    return {
      success: true,
      message: 'Reservation request submitted',
      reservation_request: {
        id: record.id,
        status: record.status,
        created_at: record.created_at
      }
    };
  }

  // 12) submitTourBooking
  submitTourBooking(community_id, full_name, phone, email, tour_date) {
    const community = this._findCommunityById(community_id);
    if (!community) {
      return {
        success: false,
        message: 'Community not found',
        booking: null
      };
    }

    const bookings = this._getFromStorage('tour_bookings');
    const id = this._generateId('tour');
    const now = this._nowIso();

    const record = {
      id,
      community_id,
      full_name,
      email: email || null,
      phone,
      tour_date,
      created_at: now,
      status: 'pending'
    };

    bookings.push(record);
    this._saveToStorage('tour_bookings', bookings);

    return {
      success: true,
      message: 'Tour booking submitted',
      booking: {
        id: record.id,
        status: record.status,
        created_at: record.created_at,
        tour_date: record.tour_date
      }
    };
  }

  // 13) submitRespiteEnquiry
  submitRespiteEnquiry(community_id, full_name, email, phone, start_date, end_date, enquiry_type, message) {
    const community = this._findCommunityById(community_id);
    if (!community) {
      return {
        success: false,
        message: 'Community not found',
        enquiry: null
      };
    }

    if (!enquiry_type) {
      return {
        success: false,
        message: 'enquiry_type is required',
        enquiry: null
      };
    }

    const enquiries = this._getFromStorage('respite_enquiries');
    const id = this._generateId('respite');
    const now = this._nowIso();

    const record = {
      id,
      community_id,
      full_name,
      email,
      phone,
      start_date,
      end_date,
      enquiry_type,
      message: message || null,
      created_at: now,
      status: 'new'
    };

    enquiries.push(record);
    this._saveToStorage('respite_enquiries', enquiries);

    return {
      success: true,
      message: 'Respite enquiry submitted',
      enquiry: {
        id: record.id,
        status: record.status,
        created_at: record.created_at
      }
    };
  }

  // 14) submitBrochureRequest
  submitBrochureRequest(community_id, full_name, email, phone, street_address, city, state, zip_code, delivery_method, preferred_delivery_time) {
    const community = this._findCommunityById(community_id);
    if (!community) {
      return {
        success: false,
        message: 'Community not found',
        brochure_request: null
      };
    }

    if (['printed_brochure_by_mail', 'email_pdf', 'both'].indexOf(delivery_method) === -1) {
      return {
        success: false,
        message: 'Invalid delivery_method',
        brochure_request: null
      };
    }

    const requests = this._getFromStorage('brochure_requests');
    const id = this._generateId('brochure');
    const now = this._nowIso();

    const record = {
      id,
      community_id,
      full_name,
      email,
      phone,
      street_address,
      city,
      state,
      zip_code,
      delivery_method,
      preferred_delivery_time: preferred_delivery_time || null,
      created_at: now,
      status: 'new'
    };

    requests.push(record);
    this._saveToStorage('brochure_requests', requests);

    return {
      success: true,
      message: 'Brochure request submitted',
      brochure_request: {
        id: record.id,
        status: record.status,
        created_at: record.created_at
      }
    };
  }

  // 15) getRespiteCareSearchFilters
  getRespiteCareSearchFilters() {
    const communities = this._getFromStorage('communities');
    const rates = communities
      .filter(c => c.respite_care_available && typeof c.respite_daily_rate_from === 'number')
      .map(c => c.respite_daily_rate_from);

    const min = rates.length ? Math.min.apply(null, rates) : 50;
    const max = rates.length ? Math.max.apply(null, rates) : 500;

    return {
      price_daily_slider: {
        min,
        max,
        step: 5,
        currency: 'usd'
      },
      rating_options: [3, 3.5, 4, 4.5, 5]
    };
  }

  // 16) searchRespiteCareCommunities
  searchRespiteCareCommunities(location_text, date_range, max_daily_rate, rating_min, sort_by) {
    const locLower = location_text ? String(location_text).toLowerCase() : null;
    const communities = this._getFromStorage('communities');

    let results = communities.filter(c => {
      if (!c.respite_care_available) return false;

      let matchesLocation = true;
      if (locLower) {
        const city = (c.city || '').toLowerCase();
        const state = (c.state || '').toLowerCase();
        const zip = (c.zip_code || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        const combined = (city + ' ' + state + ' ' + zip + ' ' + name).trim();
        matchesLocation =
          combined.includes(locLower) ||
          locLower.includes(city) ||
          locLower.includes(state) ||
          locLower.includes(zip) ||
          locLower.includes(name);
      }

      if (!matchesLocation) return false;

      if (typeof max_daily_rate === 'number') {
        if (typeof c.respite_daily_rate_from !== 'number' || c.respite_daily_rate_from > max_daily_rate) {
          return false;
        }
      }

      if (typeof rating_min === 'number') {
        const rating = typeof c.rating_average === 'number' ? c.rating_average : 0;
        if (rating < rating_min) return false;
      }

      return true;
    });

    if (sort_by === 'price_daily_low_to_high') {
      results = results.slice().sort((a, b) => {
        const pa = typeof a.respite_daily_rate_from === 'number' ? a.respite_daily_rate_from : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.respite_daily_rate_from === 'number' ? b.respite_daily_rate_from : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    } else if (sort_by === 'rating_high_to_low') {
      results = results.slice().sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        return rb - ra;
      });
    }

    return {
      total_results: results.length,
      communities: results.map(c => ({
        community_id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        zip_code: c.zip_code,
        respite_care_available: !!c.respite_care_available,
        respite_daily_rate_from: c.respite_daily_rate_from != null ? c.respite_daily_rate_from : null,
        rating_average: typeof c.rating_average === 'number' ? c.rating_average : null,
        rating_count: typeof c.rating_count === 'number' ? c.rating_count : 0,
        distance_miles: c.distance_miles != null ? c.distance_miles : null,
        hero_image: c.hero_image || null
      }))
    };
  }

  // 17) calculateCostEstimate
  calculateCostEstimate(location_city, location_state, location_zip, care_type, number_of_adls_supported, monthly_pension_income, other_monthly_income, savings_amount, add_ons_selected) {
    add_ons_selected = Array.isArray(add_ons_selected) ? add_ons_selected : [];

    let base_care_cost;
    switch (care_type) {
      case 'independent_living':
        base_care_cost = 2500;
        break;
      case 'assisted_living':
        base_care_cost = 2600;
        break;
      case 'residential_care':
        base_care_cost = 3500;
        break;
      case 'memory_care':
        base_care_cost = 3800;
        break;
      case 'respite_care':
        base_care_cost = 2800;
        break;
      case 'skilled_nursing':
        base_care_cost = 4500;
        break;
      case 'all_care':
      default:
        base_care_cost = 3000;
        break;
    }

    const adls = typeof number_of_adls_supported === 'number' ? number_of_adls_supported : 0;
    const adl_support_cost = adls * 150;

    let add_ons_cost = 0;
    add_ons_selected.forEach(a => {
      if (a === 'housekeeping') add_ons_cost += 150;
      else if (a === 'transportation') add_ons_cost += 100;
      else if (a === 'meal_plan') add_ons_cost += 300;
      else add_ons_cost += 100;
    });

    const estimated_monthly_cost = base_care_cost + adl_support_cost + add_ons_cost;
    const total_income = (monthly_pension_income || 0) + (other_monthly_income || 0);
    const estimated_out_of_pocket = Math.max(estimated_monthly_cost - total_income, 0);

    let advice_text;
    if (estimated_out_of_pocket <= 0) {
      advice_text = 'Based on the income entered, the estimated monthly cost may be covered without out-of-pocket expenses.';
    } else if (estimated_out_of_pocket < 500) {
      advice_text = 'You are close to covering monthly costs; consider small adjustments to services or add-ons.';
    } else {
      advice_text = 'There may be a funding gap each month. Consider adjusting services, exploring benefits, or reviewing savings options.';
    }

    return {
      estimated_monthly_cost,
      breakdown: {
        base_care_cost,
        adl_support_cost,
        add_ons_cost,
        total_income,
        estimated_out_of_pocket
      },
      advice_text
    };
  }

  // 18) saveCostEstimate
  saveCostEstimate(estimate_name, location_city, location_state, location_zip, care_type, number_of_adls_supported, monthly_pension_income, other_monthly_income, savings_amount, add_ons_selected, estimated_monthly_cost) {
    const id = this._generateId('estimate');
    const now = this._nowIso();

    const record = {
      id,
      estimate_name,
      location_city,
      location_state,
      location_zip: location_zip || null,
      care_type,
      number_of_adls_supported,
      monthly_pension_income,
      other_monthly_income,
      savings_amount: savings_amount != null ? savings_amount : null,
      add_ons_selected: Array.isArray(add_ons_selected) ? add_ons_selected : [],
      estimated_monthly_cost,
      created_at: now
    };

    this._saveCostEstimateForUser(record);

    return {
      success: true,
      message: 'Cost estimate saved',
      estimate_id: record.id,
      created_at: record.created_at
    };
  }

  // 19) getSavedCostEstimates
  getSavedCostEstimates() {
    const estimates = this._getFromStorage('cost_estimates');
    return estimates.map(e => ({
      estimate_id: e.id,
      estimate_name: e.estimate_name,
      location_city: e.location_city,
      location_state: e.location_state,
      care_type: e.care_type,
      estimated_monthly_cost: e.estimated_monthly_cost,
      created_at: e.created_at
    }));
  }

  // 20) getEventFilterOptions
  getEventFilterOptions() {
    return {
      distance_options_miles: [5, 10, 15, 25, 50],
      time_of_day_options: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' },
        { value: 'full_day', label: 'Full Day' },
        { value: 'multiple', label: 'Multiple Times' }
      ]
    };
  }

  // 21) searchEvents
  searchEvents(zip_code, distance_miles, date_range, time_of_day_categories, only_public = true) {
    const events = this._getFromStorage('events');
    const communities = this._getFromStorage('communities');
    const communityMap = {};
    communities.forEach(c => { communityMap[c.id] = c; });

    const timeFilter = Array.isArray(time_of_day_categories) && time_of_day_categories.length
      ? time_of_day_categories
      : null;

    const startDate = date_range && date_range.start_date ? this._parseDate(date_range.start_date) : null;
    const endDate = date_range && date_range.end_date ? this._parseDate(date_range.end_date) : null;

    const results = events.filter(e => {
      if (only_public && !e.is_public) return false;

      // Distance filter via precomputed distance_from_search_zip_miles if available
      if (typeof e.distance_from_search_zip_miles === 'number') {
        if (e.distance_from_search_zip_miles > distance_miles) return false;
      } else {
        // Fallback: if no distance, require exact zip match
        if (zip_code && e.zip_code && e.zip_code !== zip_code) return false;
      }

      if (startDate && endDate) {
        const eventStart = this._parseDate(e.start_datetime);
        if (!eventStart) return false;
        if (eventStart < startDate || eventStart > endDate) return false;
      }

      if (timeFilter) {
        const cat = e.time_of_day_category;
        if (cat !== 'full_day' && cat !== 'multiple' && timeFilter.indexOf(cat) === -1) {
          return false;
        }
      }

      return true;
    });

    const mapped = results.map(e => {
      const community = e.community_id ? communityMap[e.community_id] : null;
      return {
        event_id: e.id,
        title: e.title,
        description: e.description || '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        time_of_day_category: e.time_of_day_category,
        address_line1: e.address_line1,
        city: e.city,
        state: e.state,
        zip_code: e.zip_code,
        distance_from_search_zip_miles: e.distance_from_search_zip_miles != null ? e.distance_from_search_zip_miles : null,
        is_public: !!e.is_public,
        community_name: community ? community.name : null,
        // Foreign key resolution
        community: community
      };
    });

    return {
      total_results: mapped.length,
      events: mapped
    };
  }

  // 22) getEventDetail
  getEventDetail(event_id) {
    const event = this._findEventById(event_id);
    if (!event) return null;
    const community = event.community_id ? this._findCommunityById(event.community_id) : null;

    return {
      event_id: event.id,
      title: event.title,
      description: event.description || '',
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      time_of_day_category: event.time_of_day_category,
      address_line1: event.address_line1,
      address_line2: event.address_line2 || null,
      city: event.city,
      state: event.state,
      zip_code: event.zip_code,
      community_id: community ? community.id : event.community_id || null,
      community_name: community ? community.name : null,
      is_public: !!event.is_public,
      community: community
    };
  }

  // 23) submitRSVP
  submitRSVP(event_id, full_name, email, number_of_attendees, relationship_type) {
    const event = this._findEventById(event_id);
    if (!event) {
      return {
        success: false,
        message: 'Event not found',
        rsvp: null
      };
    }

    const rsvps = this._getFromStorage('rsvps');
    const id = this._generateId('rsvp');
    const now = this._nowIso();

    const record = {
      id,
      event_id,
      full_name,
      email,
      number_of_attendees,
      relationship_type,
      created_at: now,
      status: 'submitted'
    };

    rsvps.push(record);
    this._saveToStorage('rsvps', rsvps);

    return {
      success: true,
      message: 'RSVP submitted',
      rsvp: {
        id: record.id,
        status: record.status,
        created_at: record.created_at
      }
    };
  }

  // 24) getJobSearchFilters
  getJobSearchFilters() {
    return {
      job_type_options: [
        { value: 'part_time', label: 'Part-time' },
        { value: 'full_time', label: 'Full-time' },
        { value: 'per_diem', label: 'Per diem' },
        { value: 'temporary', label: 'Temporary' },
        { value: 'internship', label: 'Internship' }
      ],
      distance_options_miles: [5, 10, 15, 25, 50],
      min_pay_hourly_default: 18
    };
  }

  // 25) searchJobPostings
  searchJobPostings(keyword, location_text, distance_miles, job_types, min_hourly_rate, only_active = true) {
    const jobs = this._getFromStorage('job_postings');
    const communities = this._getFromStorage('communities');
    const communityMap = {};
    communities.forEach(c => { communityMap[c.id] = c; });

    const kw = keyword ? String(keyword).toLowerCase() : null;
    const loc = location_text ? String(location_text).toLowerCase() : null;
    const jobTypesFilter = Array.isArray(job_types) && job_types.length ? job_types : null;

    const results = jobs.filter(j => {
      if (only_active && !j.is_active) return false;

      if (kw) {
        const haystack = ((j.title || '') + ' ' + (j.description || '')).toLowerCase();
        if (!haystack.includes(kw)) return false;
      }

      if (loc) {
        const city = (j.location_city || '').toLowerCase();
        const state = (j.location_state || '').toLowerCase();
        const zip = (j.location_zip || '').toLowerCase();
        const combined = (city + ' ' + state + ' ' + zip).trim();
        const locationText = loc;
        if (
          !combined.includes(locationText) &&
          !locationText.includes(city) &&
          !locationText.includes(state) &&
          !locationText.includes(zip)
        ) {
          return false;
        }
      }

      if (jobTypesFilter && jobTypesFilter.indexOf(j.job_type) === -1) {
        return false;
      }

      if (typeof min_hourly_rate === 'number') {
        const minPay = typeof j.pay_rate_hourly_min === 'number' ? j.pay_rate_hourly_min : 0;
        const maxPay = typeof j.pay_rate_hourly_max === 'number' ? j.pay_rate_hourly_max : minPay;
        if (minPay < min_hourly_rate && maxPay < min_hourly_rate) return false;
      }

      if (typeof j.distance_from_search_location_miles === 'number') {
        if (j.distance_from_search_location_miles > distance_miles) return false;
      }

      return true;
    });

    const mapped = results.map(j => {
      const community = j.community_id ? communityMap[j.community_id] : null;
      return {
        job_posting_id: j.id,
        title: j.title,
        location_city: j.location_city,
        location_state: j.location_state,
        job_type: j.job_type,
        pay_rate_hourly_min: j.pay_rate_hourly_min != null ? j.pay_rate_hourly_min : null,
        pay_rate_hourly_max: j.pay_rate_hourly_max != null ? j.pay_rate_hourly_max : null,
        pay_currency: j.pay_currency || null,
        community_id: j.community_id || null,
        community_name: community ? community.name : null,
        distance_from_search_location_miles: j.distance_from_search_location_miles != null ? j.distance_from_search_location_miles : null,
        posted_date: j.posted_date || null,
        is_active: !!j.is_active,
        community: community
      };
    });

    return {
      total_results: mapped.length,
      jobs: mapped
    };
  }

  // 26) getJobDetail
  getJobDetail(job_posting_id) {
    const job = this._findJobPostingById(job_posting_id);
    if (!job) return null;
    const community = job.community_id ? this._findCommunityById(job.community_id) : null;

    return {
      job_posting_id: job.id,
      title: job.title,
      description: job.description,
      department: job.department || null,
      community_id: job.community_id || null,
      community_name: community ? community.name : null,
      location_city: job.location_city,
      location_state: job.location_state,
      location_zip: job.location_zip || null,
      job_type: job.job_type,
      pay_rate_hourly_min: job.pay_rate_hourly_min != null ? job.pay_rate_hourly_min : null,
      pay_rate_hourly_max: job.pay_rate_hourly_max != null ? job.pay_rate_hourly_max : null,
      pay_currency: job.pay_currency || null,
      posted_date: job.posted_date || null,
      application_deadline: job.application_deadline || null,
      is_active: !!job.is_active,
      responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
      qualifications: Array.isArray(job.qualifications) ? job.qualifications : [],
      benefits: Array.isArray(job.benefits) ? job.benefits : [],
      community: community
    };
  }

  // 27) submitJobApplication
  submitJobApplication(job_posting_id, full_name, email, phone, motivation_text, resume_url) {
    const job = this._findJobPostingById(job_posting_id);
    if (!job) {
      return {
        success: false,
        message: 'Job posting not found',
        job_application: null
      };
    }

    const applications = this._getFromStorage('job_applications');
    const id = this._generateId('jobapp');
    const now = this._nowIso();

    const record = {
      id,
      job_posting_id,
      full_name,
      email,
      phone,
      motivation_text,
      resume_url: resume_url || null,
      created_at: now,
      status: 'submitted'
    };

    applications.push(record);
    this._saveToStorage('job_applications', applications);

    return {
      success: true,
      message: 'Job application submitted',
      job_application: {
        id: record.id,
        status: record.status,
        created_at: record.created_at
      }
    };
  }

  // 28) getArticleSearchFilters
  getArticleSearchFilters() {
    return {
      topic_options: [
        { value: 'assisted_living', label: 'Assisted Living' },
        { value: 'independent_living', label: 'Independent Living' },
        { value: 'moving', label: 'Moving & Downsizing' },
        { value: 'budgeting', label: 'Budgeting & Costs' },
        { value: 'memory_care', label: 'Memory Care' },
        { value: 'care_planning', label: 'Care Planning' }
      ],
      planning_timeframe_options: [
        { value: 'within_6_months', label: 'Within 6 months' },
        { value: 'planning_ahead_3_6_months', label: 'Planning ahead (3–6 months)' },
        { value: 'planning_ahead_6_12_months', label: 'Planning ahead (6–12 months)' },
        { value: 'immediate_move', label: 'Immediate move' },
        { value: 'long_term_future', label: 'Long-term future' },
        { value: 'unspecified', label: 'Unspecified' }
      ]
    };
  }

  // 29) searchArticles
  searchArticles(keyword, topics, planning_timeframes, page = 1, page_size = 20) {
    const articles = this._getFromStorage('articles');

    const kw = keyword ? String(keyword).toLowerCase() : null;
    const topicFilter = Array.isArray(topics) && topics.length ? topics : null;
    const timeframeFilter = Array.isArray(planning_timeframes) && planning_timeframes.length ? planning_timeframes : null;

    const filtered = articles.filter(a => {
      if (kw) {
        const haystack = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
        if (!haystack.includes(kw)) return false;
      }

      if (topicFilter) {
        const at = Array.isArray(a.topics) ? a.topics : [];
        if (!at.some(t => topicFilter.indexOf(t) !== -1)) return false;
      }

      if (timeframeFilter) {
        if (!a.planning_timeframe || timeframeFilter.indexOf(a.planning_timeframe) === -1) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const da = this._parseDate(a.published_date) || new Date(0);
      const db = this._parseDate(b.published_date) || new Date(0);
      return db.getTime() - da.getTime();
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageItems = filtered.slice(startIndex, endIndex).map(a => ({
      article_id: a.id,
      title: a.title,
      slug: a.slug || null,
      summary: a.summary || '',
      category_id: a.category_id,
      planning_timeframe: a.planning_timeframe || null,
      topics: Array.isArray(a.topics) ? a.topics : [],
      tags: Array.isArray(a.tags) ? a.tags : [],
      published_date: a.published_date || null,
      hero_image: a.hero_image || null
    }));

    return {
      total_results,
      page,
      page_size,
      articles: pageItems
    };
  }

  // 30) getArticleDetail
  getArticleDetail(article_id) {
    const article = this._findArticleById(article_id);
    if (!article) return null;

    const articles = this._getFromStorage('articles');

    const related = articles
      .filter(a => a.id !== article.id)
      .filter(a => {
        if (article.topics && a.topics) {
          const at = Array.isArray(a.topics) ? a.topics : [];
          const bt = Array.isArray(article.topics) ? article.topics : [];
          if (at.some(t => bt.indexOf(t) !== -1)) return true;
        }
        if (article.planning_timeframe && a.planning_timeframe && article.planning_timeframe === a.planning_timeframe) {
          return true;
        }
        return false;
      })
      .slice(0, 3)
      .map(a => ({
        article_id: a.id,
        title: a.title,
        slug: a.slug || null
      }));

    return {
      article_id: article.id,
      title: article.title,
      slug: article.slug || null,
      summary: article.summary || '',
      content: article.content,
      category_id: article.category_id,
      planning_timeframe: article.planning_timeframe || null,
      topics: Array.isArray(article.topics) ? article.topics : [],
      tags: Array.isArray(article.tags) ? article.tags : [],
      published_date: article.published_date || null,
      author_name: article.author_name || null,
      hero_image: article.hero_image || null,
      related_articles: related
    };
  }

  // 31) saveArticleToReadingList
  saveArticleToReadingList(article_id) {
    const article = this._findArticleById(article_id);
    if (!article) {
      return {
        success: false,
        message: 'Article not found',
        reading_list_item_id: null,
        total_saved_articles: this._getFromStorage('reading_list_items').length
      };
    }

    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');

    // Avoid duplicate entries for the same article
    const already = items.find(i => i.reading_list_id === readingList.id && i.article_id === article_id);
    if (already) {
      const total = items.filter(i => i.reading_list_id === readingList.id).length;
      return {
        success: true,
        message: 'Article already in reading list',
        reading_list_item_id: already.id,
        total_saved_articles: total
      };
    }

    const id = this._generateId('readingitem');
    const record = {
      id,
      reading_list_id: readingList.id,
      article_id,
      added_at: this._nowIso()
    };

    items.push(record);
    this._saveToStorage('reading_list_items', items);

    const total_saved_articles = items.filter(i => i.reading_list_id === readingList.id).length;

    return {
      success: true,
      message: 'Article added to reading list',
      reading_list_item_id: record.id,
      total_saved_articles
    };
  }

  // 32) getReadingListItems
  getReadingListItems() {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items').filter(i => i.reading_list_id === readingList.id);
    const articles = this._getFromStorage('articles');

    const articleMap = {};
    articles.forEach(a => { articleMap[a.id] = a; });

    return items.map(i => {
      const article = articleMap[i.article_id] || null;
      return {
        reading_list_item_id: i.id,
        added_at: i.added_at,
        article_id: i.article_id,
        title: article ? article.title : null,
        slug: article ? (article.slug || null) : null,
        summary: article ? (article.summary || '') : '',
        category_id: article ? article.category_id : null,
        planning_timeframe: article ? (article.planning_timeframe || null) : null,
        article
      };
    });
  }

  // 33) getAboutContent
  getAboutContent() {
    const stored = this._getFromStorage('about_content', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    return {
      heading: '',
      subheading: '',
      mission_html: '',
      values_html: '',
      care_philosophy_html: '',
      care_types_overview: this.getCareTypesOverview(),
      quality_and_safety_html: ''
    };
  }

  // 34) getContactInfo
  getContactInfo() {
    const stored = this._getFromStorage('contact_info', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    return {
      phone_numbers: [],
      email_addresses: [],
      mailing_address: {
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip_code: ''
      },
      support_hours: '',
      response_time_info: ''
    };
  }

  // 35) submitGeneralContactForm
  submitGeneralContactForm(full_name, email, phone, topic, message) {
    const submissions = this._getFromStorage('general_contact_submissions');
    const id = this._generateId('contact');
    const now = this._nowIso();

    const record = {
      id,
      full_name,
      email,
      phone: phone || null,
      topic: topic || 'general_enquiry',
      message,
      created_at: now
    };

    submissions.push(record);
    this._saveToStorage('general_contact_submissions', submissions);

    return {
      success: true,
      message: 'Enquiry submitted',
      reference_id: id
    };
  }

  // 36) getHelpAndFaqs
  getHelpAndFaqs() {
    const stored = this._getFromStorage('help_and_faqs', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    return {
      sections: []
    };
  }

  // 37) getLegalPageContent
  getLegalPageContent(page_type) {
    let key;
    if (page_type === 'privacy_policy') {
      key = 'legal_privacy_policy';
    } else if (page_type === 'terms_and_conditions') {
      key = 'legal_terms_and_conditions';
    } else {
      return {
        title: '',
        last_updated: '',
        content_html: ''
      };
    }

    const stored = this._getFromStorage(key, null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    return {
      title: '',
      last_updated: '',
      content_html: ''
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
