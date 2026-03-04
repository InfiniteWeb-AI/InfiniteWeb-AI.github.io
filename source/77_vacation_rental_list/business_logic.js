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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const defaultArrays = [
      'listings',
      'hosts',
      'locations',
      'amenities',
      'reviews',
      'promotion_codes',
      'bookings',
      'checkout_sessions',
      'price_quotes',
      'favorites',
      'trips',
      'trip_items',
      'saved_searches',
      'message_threads',
      'messages',
      'profiles',
      'recent_searches'
    ];

    defaultArrays.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('single_user_state')) {
      localStorage.setItem('single_user_state', JSON.stringify({}));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // Corrupted data, reset to default
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _diffNights(checkInDate, checkOutDate) {
    const inDate = this._parseDate(checkInDate);
    const outDate = this._parseDate(checkOutDate);
    if (!inDate || !outDate) return 1;
    const diffMs = outDate.getTime() - inDate.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  }

  // Single-user state (profile id, active checkout session id, guest info, etc.)
  _persistSingleUserState(newState) {
    let state = this._getFromStorage('single_user_state', {});
    if (newState && typeof newState === 'object') {
      state = Object.assign({}, state, newState);
      this._saveToStorage('single_user_state', state);
    }
    return state;
  }

  // ---------------------- Price calculation helpers ----------------------

  _recalculatePriceForStay(listing, checkInDate, checkOutDate) {
    const nights = this._diffNights(checkInDate, checkOutDate);
    const pricePerNight = listing.price_per_night || 0;
    const nightlySubtotal = pricePerNight * nights;
    const cleaningFee = listing.cleaning_fee || 0;
    const serviceFee = listing.service_fee || 0;
    const taxRate = listing.tax_rate_percent || 0;
    const taxable = nightlySubtotal + cleaningFee + serviceFee;
    const taxes = taxRate > 0 ? +(taxable * (taxRate / 100)).toFixed(2) : 0;
    const total = +(taxable + taxes).toFixed(2);

    return {
      nights,
      price_per_night: pricePerNight,
      nightly_subtotal: nightlySubtotal,
      cleaning_fee: cleaningFee,
      service_fee: serviceFee,
      taxes,
      subtotal: taxable,
      total,
      currency: listing.currency || 'USD'
    };
  }

  // ---------------------- Checkout helpers ----------------------

  _getOrCreateCheckoutSession(listingId, checkInDate, checkOutDate, adults, children, infants, pets) {
    const sessions = this._getFromStorage('checkout_sessions', []);
    const listings = this._getFromStorage('listings', []);
    const listing = listings.find((l) => l.id === listingId && l.is_active);
    if (!listing) {
      return null;
    }

    const state = this._persistSingleUserState();
    let session = null;

    if (state.active_checkout_session_id) {
      session = sessions.find((s) => s.id === state.active_checkout_session_id);
    }

    const nightsInfo = this._recalculatePriceForStay(listing, checkInDate, checkOutDate);

    const baseFields = {
      listing_id: listing.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights: nightsInfo.nights,
      adults: adults || 0,
      children: children || 0,
      infants: infants || 0,
      pets: pets || 0,
      price_per_night: nightsInfo.price_per_night,
      nightly_subtotal: nightsInfo.nightly_subtotal,
      cleaning_fee: nightsInfo.cleaning_fee,
      service_fee: nightsInfo.service_fee,
      taxes: nightsInfo.taxes,
      subtotal: nightsInfo.subtotal,
      total: nightsInfo.total,
      currency: nightsInfo.currency
    };

    if (session && session.listing_id === listingId) {
      // Update existing session
      session = Object.assign({}, session, baseFields, {
        updated_at: this._nowIso()
      });

      const updatedSessions = sessions.map((s) => (s.id === session.id ? session : s));
      this._saveToStorage('checkout_sessions', updatedSessions);
    } else {
      // Create new session
      session = Object.assign({}, baseFields, {
        id: this._generateId('chk'),
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        booking_id: null,
        promotion_code_id: null,
        promo_code_input: null,
        promo_discount_amount: 0,
        card_number: null,
        card_expiration: null,
        card_cvv: null,
        billing_zip: null
      });
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }

    this._persistSingleUserState({ active_checkout_session_id: session.id });
    return session;
  }

  _applyPromotionCodeInternal(checkoutSession, promoCode) {
    const promotions = this._getFromStorage('promotion_codes', []);
    if (!checkoutSession) {
      return { success: false, message: 'No active checkout session', checkout_session: null, promotion: null, discount_amount: 0 };
    }

    if (!promoCode || typeof promoCode !== 'string') {
      return { success: false, message: 'Invalid promo code', checkout_session: checkoutSession, promotion: null, discount_amount: 0 };
    }

    const codeUpper = promoCode.trim().toUpperCase();
    const promotion = promotions.find((p) => (p.code || '').toUpperCase() === codeUpper && p.is_active);

    if (!promotion) {
      return { success: false, message: 'Promo code not found or inactive', checkout_session: checkoutSession, promotion: null, discount_amount: 0 };
    }

    const now = new Date();
    if (promotion.valid_from) {
      const from = this._parseDate(promotion.valid_from);
      if (from && now < from) {
        return { success: false, message: 'Promo code not yet valid', checkout_session: checkoutSession, promotion: promotion, discount_amount: 0 };
      }
    }
    if (promotion.valid_to) {
      const to = this._parseDate(promotion.valid_to);
      if (to && now > to) {
        return { success: false, message: 'Promo code has expired', checkout_session: checkoutSession, promotion: promotion, discount_amount: 0 };
      }
    }

    if (promotion.max_uses != null && promotion.usage_count != null && promotion.usage_count >= promotion.max_uses) {
      return { success: false, message: 'Promo code usage limit reached', checkout_session: checkoutSession, promotion: promotion, discount_amount: 0 };
    }

    const subtotal = checkoutSession.subtotal || 0;
    if (promotion.min_subtotal != null && subtotal < promotion.min_subtotal) {
      return { success: false, message: 'Subtotal does not meet minimum for this promo code', checkout_session: checkoutSession, promotion: promotion, discount_amount: 0 };
    }

    let discount = 0;
    if (promotion.discount_type === 'percentage') {
      discount = +(subtotal * (promotion.discount_value / 100)).toFixed(2);
    } else if (promotion.discount_type === 'fixed_amount') {
      discount = +promotion.discount_value;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    const newTotal = +(checkoutSession.subtotal + (checkoutSession.taxes || 0) - discount).toFixed(2);

    const updatedSession = Object.assign({}, checkoutSession, {
      promotion_code_id: promotion.id,
      promo_code_input: promoCode,
      promo_discount_amount: discount,
      total: newTotal,
      updated_at: this._nowIso()
    });

    // Persist updated session
    const sessions = this._getFromStorage('checkout_sessions', []);
    const newSessions = sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s));
    this._saveToStorage('checkout_sessions', newSessions);

    // Update promotion usage count
    if (promotion.max_uses != null) {
      const updatedPromotion = Object.assign({}, promotion, {
        usage_count: (promotion.usage_count || 0) + 1
      });
      const updatedPromotions = promotions.map((p) => (p.id === promotion.id ? updatedPromotion : p));
      this._saveToStorage('promotion_codes', updatedPromotions);
    }

    return {
      success: true,
      message: 'Promo code applied',
      checkout_session: updatedSession,
      promotion: promotion,
      discount_amount: discount
    };
  }

  // ---------------------- Search helpers ----------------------

  _matchListingToLocation(listing, location, allLocations) {
    if (!listing || !location) return false;

    // Direct match on location_id
    if (listing.location_id && listing.location_id === location.id) {
      return true;
    }

    // Match by city name
    if (listing.city && location.name && listing.city.toLowerCase() === location.name.toLowerCase()) {
      return true;
    }

    // Match if listing's location is a descendant of the searched location
    if (listing.location_id) {
      const locMap = {};
      allLocations.forEach((loc) => {
        locMap[loc.id] = loc;
      });
      let current = locMap[listing.location_id];
      while (current && current.parent_id) {
        if (current.parent_id === location.id) {
          return true;
        }
        current = locMap[current.parent_id];
      }
    }

    return false;
  }

  _getLocationsByName(name) {
    const locations = this._getFromStorage('locations', []);
    if (!name) return [];
    const lower = name.toLowerCase();
    return locations.filter((loc) => (loc.name || '').toLowerCase() === lower);
  }

  _searchListingsInternal(criteria) {
    const listings = this._getFromStorage('listings', []);
    const locations = this._getFromStorage('locations', []);
    const favorites = this._getFromStorage('favorites', []);

    const {
      locationName,
      locationId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      infants,
      pets,
      minPricePerNight,
      maxPricePerNight,
      propertyTypes,
      spaceType,
      bedroomsMin,
      amenities,
      instantBookOnly,
      cancellationPolicy,
      ratingMin,
      reviewsMin,
      neighborhood,
      isDowntown,
      sortBy,
      limit,
      offset
    } = criteria || {};

    let filtered = listings.filter((l) => l.is_active);

    // Location filtering with hierarchical relationships
    if (locationId || locationName) {
      let targetLocations = [];
      if (locationId) {
        const loc = locations.find((l) => l.id === locationId);
        if (loc) targetLocations.push(loc);
      }
      if (!targetLocations.length && locationName) {
        targetLocations = this._getLocationsByName(locationName);
      }

      if (targetLocations.length) {
        filtered = filtered.filter((listing) => {
          return targetLocations.some((loc) => this._matchListingToLocation(listing, loc, locations));
        });
      } else if (locationName) {
        // Fallback: match by city only
        const lowerCity = locationName.toLowerCase();
        filtered = filtered.filter((l) => (l.city || '').toLowerCase() === lowerCity);
      }
    }

    // Guests capacity filter
    const adultsNum = adults || 0;
    const childrenNum = children || 0;
    const infantsNum = infants || 0;
    const totalGuests = adultsNum + childrenNum + infantsNum;
    if (totalGuests > 0) {
      filtered = filtered.filter((l) => (l.max_guests || 0) >= totalGuests);
    }

    // Price filters
    if (typeof minPricePerNight === 'number') {
      filtered = filtered.filter((l) => (l.price_per_night || 0) >= minPricePerNight);
    }
    if (typeof maxPricePerNight === 'number') {
      filtered = filtered.filter((l) => (l.price_per_night || 0) <= maxPricePerNight);
    }

    // Property type filter
    if (propertyTypes && propertyTypes.length) {
      const set = new Set(propertyTypes);
      filtered = filtered.filter((l) => set.has(l.property_type));
    }

    // Space type filter
    if (spaceType) {
      filtered = filtered.filter((l) => l.space_type === spaceType);
    }

    // Bedrooms minimum
    if (typeof bedroomsMin === 'number') {
      filtered = filtered.filter((l) => (l.bedrooms || 0) >= bedroomsMin);
    }

    // Amenities filter (amenity keys)
    if (amenities && amenities.length) {
      const requested = new Set(amenities);
      filtered = filtered.filter((l) => {
        const amenityKeys = Array.isArray(l.amenities) ? new Set(l.amenities) : new Set();
        const flags = new Set();
        if (l.is_beachfront) flags.add('beachfront');
        if (l.has_pool) flags.add('pool');
        if (l.has_kitchen) flags.add('kitchen');
        if (l.has_hot_tub) flags.add('hot_tub');
        if (l.has_wifi) flags.add('wifi');
        if (l.has_free_parking) flags.add('free_parking');
        if (l.is_pet_friendly) flags.add('pet_friendly');

        return Array.from(requested).every((key) => amenityKeys.has(key) || flags.has(key));
      });
    }

    // Instant book
    if (instantBookOnly) {
      filtered = filtered.filter((l) => !!l.instant_book_available);
    }

    // Cancellation policy
    if (cancellationPolicy) {
      filtered = filtered.filter((l) => l.cancellation_policy === cancellationPolicy);
    }

    // Rating / reviews
    if (typeof ratingMin === 'number') {
      filtered = filtered.filter((l) => (l.rating_average || 0) >= ratingMin);
    }
    if (typeof reviewsMin === 'number') {
      filtered = filtered.filter((l) => (l.rating_count || 0) >= reviewsMin);
    }

    // Neighborhood
    if (neighborhood) {
      const lowerN = neighborhood.toLowerCase();
      filtered = filtered.filter((l) => (l.neighborhood || '').toLowerCase() === lowerN);
    }

    // Downtown flag
    if (typeof isDowntown === 'boolean') {
      filtered = filtered.filter((l) => !!l.is_downtown === isDowntown);
    }

    // Prepare results with price for stay and favorites
    const nights = this._diffNights(checkInDate, checkOutDate);
    const favoriteIds = new Set(favorites.map((f) => f.listing_id));

    let results = filtered.map((l) => {
      const priceInfo = this._recalculatePriceForStay(l, checkInDate, checkOutDate);
      return {
        listing: l,
        price_per_night: l.price_per_night || 0,
        currency: l.currency || 'USD',
        total_price_for_stay: priceInfo.total,
        nights: priceInfo.nights,
        rating_average: l.rating_average || 0,
        rating_count: l.rating_count || 0,
        city: l.city || null,
        neighborhood: l.neighborhood || null,
        distance_to_city_center_km: l.distance_to_city_center_km || null,
        thumbnail_url: Array.isArray(l.photo_urls) && l.photo_urls.length ? l.photo_urls[0] : null,
        is_favorited: favoriteIds.has(l.id)
      };
    });

    // Sorting
    if (sortBy) {
      const sb = sortBy;
      results.sort((a, b) => {
        if (sb === 'price_low_to_high') {
          return a.price_per_night - b.price_per_night;
        }
        if (sb === 'price_high_to_low') {
          return b.price_per_night - a.price_per_night;
        }
        if (sb === 'rating_high_to_low') {
          if ((b.rating_average || 0) !== (a.rating_average || 0)) {
            return (b.rating_average || 0) - (a.rating_average || 0);
          }
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        if (sb === 'rating_low_to_high') {
          if ((a.rating_average || 0) !== (b.rating_average || 0)) {
            return (a.rating_average || 0) - (b.rating_average || 0);
          }
          return (a.rating_count || 0) - (b.rating_count || 0);
        }
        if (sb === 'distance_to_city_center') {
          const da = a.distance_to_city_center_km == null ? Number.POSITIVE_INFINITY : a.distance_to_city_center_km;
          const db = b.distance_to_city_center_km == null ? Number.POSITIVE_INFINITY : b.distance_to_city_center_km;
          return da - db;
        }
        return 0;
      });
    }

    const totalCount = results.length;
    let start = typeof offset === 'number' ? offset : 0;
    if (start < 0) start = 0;
    let end = typeof limit === 'number' && limit > 0 ? start + limit : results.length;
    if (end > results.length) end = results.length;

    const pagedResults = results.slice(start, end);

    const appliedFilters = {
      location_name: locationName || null,
      check_in_date: checkInDate || null,
      check_out_date: checkOutDate || null,
      adults: adults || 0,
      children: children || 0,
      infants: infants || 0,
      pets: pets || 0,
      min_price_per_night: typeof minPricePerNight === 'number' ? minPricePerNight : null,
      max_price_per_night: typeof maxPricePerNight === 'number' ? maxPricePerNight : null,
      property_types: propertyTypes || [],
      space_type: spaceType || null,
      bedrooms_min: bedroomsMin || null,
      amenities: amenities || [],
      instant_book_only: !!instantBookOnly,
      cancellation_policy: cancellationPolicy || null,
      rating_min: ratingMin || null,
      reviews_min: reviewsMin || null,
      neighborhood: neighborhood || null,
      is_downtown: typeof isDowntown === 'boolean' ? isDowntown : null,
      sort_by: sortBy || null
    };

    return { results: pagedResults, total_count: totalCount, applied_filters: appliedFilters };
  }

  _recordRecentSearch(params) {
    const recent = this._getFromStorage('recent_searches', []);
    const id = this._generateId('search');
    const entry = {
      id,
      location_name: params.locationName || null,
      check_in_date: params.checkInDate || null,
      check_out_date: params.checkOutDate || null,
      guests_summary: params.guests_summary || '',
      max_price_per_night: typeof params.maxPricePerNight === 'number' ? params.maxPricePerNight : null,
      created_at: this._nowIso()
    };
    recent.unshift(entry);
    // Keep only the latest 10
    const trimmed = recent.slice(0, 10);
    this._saveToStorage('recent_searches', trimmed);
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const locations = this._getFromStorage('locations', []);
    const listings = this._getFromStorage('listings', []);
    const savedSearches = this._getFromStorage('saved_searches', []);
    const recent = this._getFromStorage('recent_searches', []);

    // Popular locations based on listing counts
    const countsByLocationId = {};
    listings.forEach((l) => {
      if (!l.is_active) return;
      const locId = l.location_id || null;
      if (!locId) return;
      countsByLocationId[locId] = (countsByLocationId[locId] || 0) + 1;
    });

    const popularLocations = Object.keys(countsByLocationId)
      .map((locId) => {
        const loc = locations.find((l) => l.id === locId);
        if (!loc) return null;
        return {
          location: loc,
          display_label: loc.name,
          thumbnail_url: null
        };
      })
      .filter(Boolean)
      .slice(0, 10);

    // Popular categories from listing categories
    const categoryCounts = {};
    listings.forEach((l) => {
      if (!l.is_active) return;
      if (Array.isArray(l.categories)) {
        l.categories.forEach((c) => {
          categoryCounts[c] = (categoryCounts[c] || 0) + 1;
        });
      }
    });
    const popularCategories = Object.keys(categoryCounts).map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
      image_url: null,
      description: ''
    }));

    // Recent searches already persisted
    const recentSearches = recent.map((r) => ({
      id: r.id,
      location_name: r.location_name,
      check_in_date: r.check_in_date,
      check_out_date: r.check_out_date,
      guests_summary: r.guests_summary,
      max_price_per_night: r.max_price_per_night,
      created_at: r.created_at
    }));

    // Saved searches summary
    const savedSearchesSummary = savedSearches.map((s) => {
      let locationName = s.location_name || null;
      if (!locationName && s.location_id) {
        const loc = locations.find((l) => l.id === s.location_id);
        if (loc) locationName = loc.name;
      }

      let dateRangeLabel = '';
      if (s.check_in_date && s.check_out_date) {
        dateRangeLabel = s.check_in_date + ' - ' + s.check_out_date;
      } else if (s.flexible_dates) {
        dateRangeLabel = 'Flexible dates';
      }

      let priceCapLabel = '';
      if (typeof s.max_price_per_night === 'number') {
        priceCapLabel = 'Up to $' + s.max_price_per_night + '/night';
      }

      return {
        saved_search: s,
        location_name: locationName,
        date_range_label: dateRangeLabel,
        price_cap_label: priceCapLabel,
        notifications_enabled: !!s.notifications_enabled
      };
    });

    return {
      popular_locations: popularLocations,
      popular_categories: popularCategories,
      recent_searches: recentSearches,
      saved_searches_summary: savedSearchesSummary
    };
  }

  // getLocationSuggestions(query)
  getLocationSuggestions(query) {
    const locations = this._getFromStorage('locations', []);
    if (!query || typeof query !== 'string') {
      return [];
    }
    const lower = query.toLowerCase();
    return locations
      .filter((loc) => (loc.name || '').toLowerCase().includes(lower))
      .slice(0, 10)
      .map((loc) => ({
        location: loc,
        full_label:
          loc.name +
          (loc.country_code ? ', ' + loc.country_code : '')
      }));
  }

  // searchListings(...)
  searchListings(
    locationName,
    locationId,
    checkInDate,
    checkOutDate,
    adults,
    children,
    infants,
    pets,
    minPricePerNight,
    maxPricePerNight,
    propertyTypes,
    spaceType,
    bedroomsMin,
    amenities,
    instantBookOnly,
    cancellationPolicy,
    ratingMin,
    reviewsMin,
    neighborhood,
    isDowntown,
    sortBy,
    limit,
    offset
  ) {
    const criteria = {
      locationName,
      locationId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      infants,
      pets,
      minPricePerNight,
      maxPricePerNight,
      propertyTypes,
      spaceType,
      bedroomsMin,
      amenities,
      instantBookOnly,
      cancellationPolicy,
      ratingMin,
      reviewsMin,
      neighborhood,
      isDowntown,
      sortBy,
      limit,
      offset
    };

    const guestsSummaryParts = [];
    if (adults) guestsSummaryParts.push(adults + ' adults');
    if (children) guestsSummaryParts.push(children + ' children');
    if (infants) guestsSummaryParts.push(infants + ' infants');
    if (pets) guestsSummaryParts.push(pets + ' pets');
    const guestsSummary = guestsSummaryParts.join(', ');

    this._recordRecentSearch({
      locationName,
      checkInDate,
      checkOutDate,
      guests_summary: guestsSummary,
      maxPricePerNight
    });

    return this._searchListingsInternal(criteria);
  }

  // getSearchFilterOptions(locationName, locationId, baseCriteria)
  getSearchFilterOptions(locationName, locationId, baseCriteria) {
    const bc = baseCriteria || {};
    const criteria = {
      locationName,
      locationId,
      checkInDate: bc.checkInDate,
      checkOutDate: bc.checkOutDate,
      adults: bc.adults,
      children: bc.children,
      infants: bc.infants,
      pets: bc.pets,
      propertyTypes: bc.propertyTypes,
      spaceType: bc.spaceType,
      bedroomsMin: bc.bedroomsMin,
      amenities: bc.amenities
    };

    const searchResult = this._searchListingsInternal(criteria);
    const listings = searchResult.results.map((r) => r.listing);
    const amenitiesCatalog = this._getFromStorage('amenities', []);

    // Price range
    let minAvailable = null;
    let maxAvailable = null;
    listings.forEach((l) => {
      const price = l.price_per_night || 0;
      if (minAvailable == null || price < minAvailable) minAvailable = price;
      if (maxAvailable == null || price > maxAvailable) maxAvailable = price;
    });

    const suggestedRanges = [];
    if (minAvailable != null && maxAvailable != null && minAvailable < maxAvailable) {
      const span = maxAvailable - minAvailable;
      const step = span / 3;
      suggestedRanges.push({
        label: 'Budget',
        min: Math.floor(minAvailable),
        max: Math.floor(minAvailable + step)
      });
      suggestedRanges.push({
        label: 'Mid-range',
        min: Math.floor(minAvailable + step),
        max: Math.floor(minAvailable + 2 * step)
      });
      suggestedRanges.push({
        label: 'Premium',
        min: Math.floor(minAvailable + 2 * step),
        max: Math.ceil(maxAvailable)
      });
    }

    // Property types & space types
    const propertyTypeCounts = {};
    const spaceTypeCounts = {};
    const neighborhoodsMap = {};
    let ratingMin = null;
    let ratingMax = null;

    listings.forEach((l) => {
      if (l.property_type) {
        propertyTypeCounts[l.property_type] = (propertyTypeCounts[l.property_type] || 0) + 1;
      }
      if (l.space_type) {
        spaceTypeCounts[l.space_type] = (spaceTypeCounts[l.space_type] || 0) + 1;
      }
      if (l.neighborhood) {
        const key = l.neighborhood;
        if (!neighborhoodsMap[key]) {
          neighborhoodsMap[key] = {
            name: l.neighborhood,
            is_downtown: !!l.is_downtown,
            listing_count: 0
          };
        }
        neighborhoodsMap[key].listing_count += 1;
      }
      if (typeof l.rating_average === 'number') {
        if (ratingMin == null || l.rating_average < ratingMin) ratingMin = l.rating_average;
        if (ratingMax == null || l.rating_average > ratingMax) ratingMax = l.rating_average;
      }
    });

    const propertyTypesArr = Object.keys(propertyTypeCounts).map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count: propertyTypeCounts[key]
    }));

    const spaceTypesArr = Object.keys(spaceTypeCounts).map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
      count: spaceTypeCounts[key]
    }));

    const bedroomOptions = [
      { label: 'Studio', value: 0 },
      { label: '1+', value: 1 },
      { label: '2+', value: 2 },
      { label: '3+', value: 3 },
      { label: '4+', value: 4 }
    ];

    const bookingOptions = {
      instant_book_available: listings.some((l) => !!l.instant_book_available)
    };

    const cancellationCounts = {};
    listings.forEach((l) => {
      if (!l.cancellation_policy) return;
      cancellationCounts[l.cancellation_policy] = (cancellationCounts[l.cancellation_policy] || 0) + 1;
    });

    const cancellationPolicies = Object.keys(cancellationCounts).map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
      count: cancellationCounts[key]
    }));

    const reviewCountOptions = [
      { label: 'Any', min_reviews: 0 },
      { label: '10+ reviews', min_reviews: 10 },
      { label: '20+ reviews', min_reviews: 20 },
      { label: '50+ reviews', min_reviews: 50 }
    ];

    const neighborhoods = Object.keys(neighborhoodsMap).map((name) => neighborhoodsMap[name]);

    return {
      price: {
        min_available: minAvailable,
        max_available: maxAvailable,
        suggested_ranges: suggestedRanges
      },
      property_types: propertyTypesArr,
      space_types: spaceTypesArr,
      bedroom_options: bedroomOptions,
      amenities: amenitiesCatalog,
      booking_options: bookingOptions,
      cancellation_policies: cancellationPolicies,
      rating_options: {
        min_rating: ratingMin,
        max_rating: ratingMax
      },
      review_count_options: reviewCountOptions,
      neighborhoods: neighborhoods
    };
  }

  // getListingDetails(listingId, checkInDate, checkOutDate, adults, children, infants, pets)
  getListingDetails(listingId, checkInDate, checkOutDate, adults, children, infants, pets) {
    const listings = this._getFromStorage('listings', []);
    const hosts = this._getFromStorage('hosts', []);
    const amenitiesCatalog = this._getFromStorage('amenities', []);
    const reviewsAll = this._getFromStorage('reviews', []);
    const favorites = this._getFromStorage('favorites', []);
    const locations = this._getFromStorage('locations', []);

    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      return {
        listing: null,
        host: null,
        photos: [],
        amenities: [],
        rating_summary: { rating_average: null, rating_count: 0 },
        reviews: [],
        location_map: null,
        cancellation_policy: null,
        is_favorited: false,
        trip_collections_summary: [],
        price_quote: null
      };
    }

    const host = hosts.find((h) => h.id === listing.host_id) || null;
    const photos = Array.isArray(listing.photo_urls) ? listing.photo_urls : [];

    const amenityObjects = Array.isArray(listing.amenities)
      ? listing.amenities
          .map((key) => amenitiesCatalog.find((a) => a.key === key))
          .filter(Boolean)
      : [];

    const ratingSummary = {
      rating_average: typeof listing.rating_average === 'number' ? listing.rating_average : null,
      rating_count: typeof listing.rating_count === 'number' ? listing.rating_count : 0
    };

    const listingReviews = reviewsAll.filter((r) => r.listing_id === listing.id);

    let locationMap = null;
    if (listing) {
      let locationEntity = null;
      if (listing.location_id) {
        locationEntity = locations.find((loc) => loc.id === listing.location_id) || null;
      }
      locationMap = {
        latitude: listing.latitude || (locationEntity ? locationEntity.latitude : null),
        longitude: listing.longitude || (locationEntity ? locationEntity.longitude : null),
        distance_to_city_center_km: listing.distance_to_city_center_km || null,
        address_line: listing.address_line || null,
        city: listing.city || (locationEntity ? locationEntity.name : null),
        neighborhood: listing.neighborhood || null
      };
    }

    const isFavorited = favorites.some((f) => f.listing_id === listing.id);

    const trips = this._getFromStorage('trips', []);
    const tripItems = this._getFromStorage('trip_items', []);
    const tripCollectionsSummary = trips.map((t) => ({
      trip_id: t.id,
      trip_name: t.name,
      contains_listing: tripItems.some((ti) => ti.trip_id === t.id && ti.listing_id === listing.id)
    }));

    let priceQuote = null;
    if (checkInDate && checkOutDate && adults != null) {
      priceQuote = this.getPriceQuoteForListing(
        listing.id,
        checkInDate,
        checkOutDate,
        adults,
        children,
        infants,
        pets
      );
    }

    return {
      listing,
      host,
      photos,
      amenities: amenityObjects,
      rating_summary: ratingSummary,
      reviews: listingReviews,
      location_map: locationMap,
      cancellation_policy: listing.cancellation_policy || null,
      is_favorited: isFavorited,
      trip_collections_summary: tripCollectionsSummary,
      price_quote: priceQuote
    };
  }

  // getPriceQuoteForListing(listingId, checkInDate, checkOutDate, adults, children, infants, pets)
  getPriceQuoteForListing(listingId, checkInDate, checkOutDate, adults, children, infants, pets) {
    const listings = this._getFromStorage('listings', []);
    const listing = listings.find((l) => l.id === listingId && l.is_active);
    if (!listing) {
      return null;
    }

    const priceInfo = this._recalculatePriceForStay(listing, checkInDate, checkOutDate);

    const priceQuotes = this._getFromStorage('price_quotes', []);
    const priceQuote = {
      id: this._generateId('pqt'),
      listing_id: listing.id,
      created_at: this._nowIso(),
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights: priceInfo.nights,
      adults: adults || 0,
      children: children || 0,
      infants: infants || 0,
      pets: pets || 0,
      price_per_night: priceInfo.price_per_night,
      nightly_subtotal: priceInfo.nightly_subtotal,
      cleaning_fee: priceInfo.cleaning_fee,
      service_fee: priceInfo.service_fee,
      taxes: priceInfo.taxes,
      subtotal: priceInfo.subtotal,
      total: priceInfo.total,
      currency: priceInfo.currency
    };

    priceQuotes.push(priceQuote);
    this._saveToStorage('price_quotes', priceQuotes);

    return priceQuote;
  }

  // startCheckoutForListing(listingId, checkInDate, checkOutDate, adults, children, infants, pets)
  startCheckoutForListing(listingId, checkInDate, checkOutDate, adults, children, infants, pets) {
    const listings = this._getFromStorage('listings', []);
    const listing = listings.find((l) => l.id === listingId && l.is_active);
    if (!listing) {
      return { success: false, message: 'Listing not found or inactive', checkout_session: null, redirect_to: null };
    }

    const session = this._getOrCreateCheckoutSession(
      listingId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      infants,
      pets
    );

    if (!session) {
      return { success: false, message: 'Unable to start checkout session', checkout_session: null, redirect_to: null };
    }

    return {
      success: true,
      message: 'Checkout session started',
      checkout_session: session,
      redirect_to: '/checkout'
    };
  }

  // getActiveCheckoutSession()
  getActiveCheckoutSession() {
    const state = this._persistSingleUserState();
    const sessions = this._getFromStorage('checkout_sessions', []);
    const listings = this._getFromStorage('listings', []);

    if (!state.active_checkout_session_id) {
      return {
        has_active_session: false,
        checkout_session: null,
        listing: null,
        price_breakdown: null,
        guest_info: {
          guest_full_name: null,
          guest_email: null,
          guest_phone: null
        }
      };
    }

    const session = sessions.find((s) => s.id === state.active_checkout_session_id);
    if (!session) {
      return {
        has_active_session: false,
        checkout_session: null,
        listing: null,
        price_breakdown: null,
        guest_info: {
          guest_full_name: null,
          guest_email: null,
          guest_phone: null
        }
      };
    }

    const listing = listings.find((l) => l.id === session.listing_id) || null;

    const priceBreakdown = {
      nightly_subtotal: session.nightly_subtotal || 0,
      cleaning_fee: session.cleaning_fee || 0,
      service_fee: session.service_fee || 0,
      taxes: session.taxes || 0,
      subtotal: session.subtotal || 0,
      promo_discount_amount: session.promo_discount_amount || 0,
      total: session.total || 0,
      currency: session.currency || (listing ? listing.currency : 'USD')
    };

    const guestInfo = (state.guest_info && typeof state.guest_info === 'object')
      ? state.guest_info
      : { guest_full_name: null, guest_email: null, guest_phone: null };

    return {
      has_active_session: true,
      checkout_session: session,
      listing,
      price_breakdown: priceBreakdown,
      guest_info: guestInfo
    };
  }

  // updateCheckoutGuestInfo(fullName, email, phone)
  updateCheckoutGuestInfo(fullName, email, phone) {
    if (!fullName || !email) {
      return { success: false, message: 'Full name and email are required', checkout_session: null };
    }

    const state = this._persistSingleUserState();
    const sessions = this._getFromStorage('checkout_sessions', []);
    const session = state.active_checkout_session_id
      ? sessions.find((s) => s.id === state.active_checkout_session_id)
      : null;

    this._persistSingleUserState({
      guest_info: {
        guest_full_name: fullName,
        guest_email: email,
        guest_phone: phone || null
      }
    });

    return {
      success: true,
      message: 'Guest info updated',
      checkout_session: session || null
    };
  }

  // updateCheckoutPaymentDetails(cardNumber, cardExpiration, cardCvv, billingZip)
  updateCheckoutPaymentDetails(cardNumber, cardExpiration, cardCvv, billingZip) {
    const state = this._persistSingleUserState();
    const sessions = this._getFromStorage('checkout_sessions', []);
    if (!state.active_checkout_session_id) {
      return { success: false, message: 'No active checkout session', checkout_session: null };
    }

    let session = sessions.find((s) => s.id === state.active_checkout_session_id);
    if (!session) {
      return { success: false, message: 'Checkout session not found', checkout_session: null };
    }

    if (!cardNumber || !cardExpiration || !cardCvv || !billingZip) {
      return { success: false, message: 'All payment fields are required', checkout_session: session };
    }

    session = Object.assign({}, session, {
      card_number: cardNumber,
      card_expiration: cardExpiration,
      card_cvv: cardCvv,
      billing_zip: billingZip,
      updated_at: this._nowIso()
    });

    const updatedSessions = sessions.map((s) => (s.id === session.id ? session : s));
    this._saveToStorage('checkout_sessions', updatedSessions);

    return {
      success: true,
      message: 'Payment details updated',
      checkout_session: session
    };
  }

  // applyPromoCodeToCheckout(promoCode)
  applyPromoCodeToCheckout(promoCode) {
    const state = this._persistSingleUserState();
    const sessions = this._getFromStorage('checkout_sessions', []);
    if (!state.active_checkout_session_id) {
      return { success: false, message: 'No active checkout session', checkout_session: null, promotion: null, discount_amount: 0 };
    }

    const session = sessions.find((s) => s.id === state.active_checkout_session_id);
    return this._applyPromotionCodeInternal(session, promoCode);
  }

  // getBookingReviewSummary()
  getBookingReviewSummary() {
    const state = this._persistSingleUserState();
    const sessions = this._getFromStorage('checkout_sessions', []);
    const listings = this._getFromStorage('listings', []);
    const bookings = this._getFromStorage('bookings', []);

    if (!state.active_checkout_session_id) {
      return {
        booking_preview: null,
        listing: null,
        price_breakdown: null,
        cancellation_policy: null
      };
    }

    const session = sessions.find((s) => s.id === state.active_checkout_session_id);
    if (!session) {
      return {
        booking_preview: null,
        listing: null,
        price_breakdown: null,
        cancellation_policy: null
      };
    }

    const listing = listings.find((l) => l.id === session.listing_id) || null;

    let booking = null;
    if (session.booking_id) {
      booking = bookings.find((b) => b.id === session.booking_id) || null;
    }

    const guestInfo = state.guest_info || {};

    if (!booking) {
      booking = {
        id: this._generateId('bkg'),
        listing_id: session.listing_id,
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        check_in_date: session.check_in_date,
        check_out_date: session.check_out_date,
        nights: session.nights,
        adults: session.adults,
        children: session.children,
        infants: session.infants,
        pets: session.pets,
        status: 'pending_review',
        price_per_night: session.price_per_night,
        nightly_subtotal: session.nightly_subtotal,
        cleaning_fee: session.cleaning_fee,
        service_fee: session.service_fee,
        taxes: session.taxes,
        subtotal: session.subtotal,
        promotion_code_id: session.promotion_code_id || null,
        promo_code: session.promo_code_input || null,
        promo_discount_amount: session.promo_discount_amount || 0,
        total: session.total,
        currency: session.currency || (listing ? listing.currency : 'USD'),
        cancellation_policy_snapshot: listing ? listing.cancellation_policy : null,
        guest_full_name: guestInfo.guest_full_name || null,
        guest_email: guestInfo.guest_email || null,
        guest_phone: guestInfo.guest_phone || null,
        notes: null
      };
      bookings.push(booking);
      this._saveToStorage('bookings', bookings);

      // Link booking to session
      const updatedSession = Object.assign({}, session, {
        booking_id: booking.id,
        updated_at: this._nowIso()
      });
      const updatedSessions = sessions.map((s) => (s.id === session.id ? updatedSession : s));
      this._saveToStorage('checkout_sessions', updatedSessions);
    } else {
      // Refresh booking from session
      booking = Object.assign({}, booking, {
        updated_at: this._nowIso(),
        check_in_date: session.check_in_date,
        check_out_date: session.check_out_date,
        nights: session.nights,
        adults: session.adults,
        children: session.children,
        infants: session.infants,
        pets: session.pets,
        status: booking.status === 'confirmed' ? 'confirmed' : 'pending_review',
        price_per_night: session.price_per_night,
        nightly_subtotal: session.nightly_subtotal,
        cleaning_fee: session.cleaning_fee,
        service_fee: session.service_fee,
        taxes: session.taxes,
        subtotal: session.subtotal,
        promotion_code_id: session.promotion_code_id || null,
        promo_code: session.promo_code_input || null,
        promo_discount_amount: session.promo_discount_amount || 0,
        total: session.total,
        currency: session.currency || (listing ? listing.currency : 'USD'),
        cancellation_policy_snapshot: listing ? listing.cancellation_policy : booking.cancellation_policy_snapshot,
        guest_full_name: guestInfo.guest_full_name || booking.guest_full_name || null,
        guest_email: guestInfo.guest_email || booking.guest_email || null,
        guest_phone: guestInfo.guest_phone || booking.guest_phone || null
      });
      const updatedBookings = bookings.map((b) => (b.id === booking.id ? booking : b));
      this._saveToStorage('bookings', updatedBookings);
    }

    const priceBreakdown = {
      nightly_subtotal: booking.nightly_subtotal || 0,
      cleaning_fee: booking.cleaning_fee || 0,
      service_fee: booking.service_fee || 0,
      taxes: booking.taxes || 0,
      subtotal: booking.subtotal || 0,
      promo_code: booking.promo_code || null,
      promo_discount_amount: booking.promo_discount_amount || 0,
      total: booking.total || 0,
      currency: booking.currency || (listing ? listing.currency : 'USD')
    };

    return {
      booking_preview: booking,
      listing,
      price_breakdown: priceBreakdown,
      cancellation_policy: listing ? listing.cancellation_policy : null
    };
  }

  // confirmBooking()
  confirmBooking() {
    const state = this._persistSingleUserState();
    const sessions = this._getFromStorage('checkout_sessions', []);
    const bookings = this._getFromStorage('bookings', []);

    if (!state.active_checkout_session_id) {
      return { success: false, message: 'No active checkout session', booking: null, confirmation_number: null };
    }

    const session = sessions.find((s) => s.id === state.active_checkout_session_id);
    if (!session || !session.booking_id) {
      return { success: false, message: 'No booking preview available', booking: null, confirmation_number: null };
    }

    let booking = bookings.find((b) => b.id === session.booking_id);
    if (!booking) {
      return { success: false, message: 'Booking not found', booking: null, confirmation_number: null };
    }

    booking = Object.assign({}, booking, {
      status: 'confirmed',
      updated_at: this._nowIso()
    });

    const updatedBookings = bookings.map((b) => (b.id === booking.id ? booking : b));
    this._saveToStorage('bookings', updatedBookings);

    const confirmationNumber = booking.id;

    return {
      success: true,
      message: 'Booking confirmed',
      booking,
      confirmation_number: confirmationNumber
    };
  }

  // signUpAccount(fullName, email, password)
  signUpAccount(fullName, email, password) {
    if (!fullName || !email || !password) {
      return { success: false, message: 'All fields are required', profile: null };
    }

    const profiles = this._getFromStorage('profiles', []);

    const profile = {
      id: this._generateId('usr'),
      full_name: fullName,
      email: email,
      password: password,
      display_name: null,
      home_city: null,
      default_currency: 'USD',
      wants_email_notifications: true,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    profiles.push(profile);
    this._saveToStorage('profiles', profiles);

    this._persistSingleUserState({ active_profile_id: profile.id });

    return {
      success: true,
      message: 'Account created',
      profile
    };
  }

  // getAccountProfile()
  getAccountProfile() {
    const state = this._persistSingleUserState();
    const profiles = this._getFromStorage('profiles', []);

    if (!state.active_profile_id) {
      return null;
    }

    const profile = profiles.find((p) => p.id === state.active_profile_id) || null;
    return profile;
  }

  // updateAccountProfile(displayName, homeCity, defaultCurrency, wantsEmailNotifications, fullName)
  updateAccountProfile(displayName, homeCity, defaultCurrency, wantsEmailNotifications, fullName) {
    const state = this._persistSingleUserState();
    const profiles = this._getFromStorage('profiles', []);

    if (!state.active_profile_id) {
      return { success: false, message: 'No active profile', profile: null };
    }

    let profile = profiles.find((p) => p.id === state.active_profile_id);
    if (!profile) {
      return { success: false, message: 'Profile not found', profile: null };
    }

    profile = Object.assign({}, profile, {
      display_name: displayName !== undefined ? displayName : profile.display_name,
      home_city: homeCity !== undefined ? homeCity : profile.home_city,
      default_currency: defaultCurrency !== undefined ? defaultCurrency : profile.default_currency,
      wants_email_notifications:
        wantsEmailNotifications !== undefined ? wantsEmailNotifications : profile.wants_email_notifications,
      full_name: fullName !== undefined ? fullName : profile.full_name,
      updated_at: this._nowIso()
    });

    const updatedProfiles = profiles.map((p) => (p.id === profile.id ? profile : p));
    this._saveToStorage('profiles', updatedProfiles);

    return {
      success: true,
      message: 'Profile updated',
      profile
    };
  }

  // getAccountOverview()
  getAccountOverview() {
    const profile = this.getAccountProfile();
    const favorites = this._getFromStorage('favorites', []);
    const trips = this._getFromStorage('trips', []);
    const savedSearches = this._getFromStorage('saved_searches', []);
    const bookings = this._getFromStorage('bookings', []);
    const messages = this._getFromStorage('messages', []);

    const today = new Date();

    const upcomingBookingsCount = bookings.filter((b) => {
      if (b.status !== 'confirmed') return false;
      const checkIn = this._parseDate(b.check_in_date);
      if (!checkIn) return false;
      return checkIn >= today;
    }).length;

    const unreadMessagesCount = messages.filter((m) => !m.is_read && m.sender_type === 'host').length;

    const profileSummary = profile
      ? {
          display_name: profile.display_name || profile.full_name || null,
          email: profile.email || null,
          home_city: profile.home_city || null
        }
      : {
          display_name: null,
          email: null,
          home_city: null
        };

    const quickLinks = [
      { key: 'favorites', label: 'Favorites' },
      { key: 'trips', label: 'Trips' },
      { key: 'saved_searches', label: 'Saved searches' },
      { key: 'bookings', label: 'Bookings' },
      { key: 'messages', label: 'Messages' }
    ];

    return {
      profile_summary: profileSummary,
      counts: {
        favorites_count: favorites.length,
        trips_count: trips.length,
        saved_searches_count: savedSearches.length,
        upcoming_bookings_count: upcomingBookingsCount,
        unread_messages_count: unreadMessagesCount
      },
      quick_links: quickLinks
    };
  }

  // getFavorites(sortBy, locationName)
  getFavorites(sortBy, locationName) {
    const favorites = this._getFromStorage('favorites', []);
    const listings = this._getFromStorage('listings', []);
    const locations = this._getFromStorage('locations', []);

    let combined = favorites.map((fav) => {
      const listing = listings.find((l) => l.id === fav.listing_id) || null;
      return { favorite: fav, listing };
    });

    if (locationName) {
      const lower = locationName.toLowerCase();
      combined = combined.filter(({ listing }) => {
        if (!listing) return false;
        if ((listing.city || '').toLowerCase() === lower) return true;
        if ((listing.neighborhood || '').toLowerCase() === lower) return true;
        if (listing.location_id) {
          const loc = locations.find((l) => l.id === listing.location_id);
          if (loc && (loc.name || '').toLowerCase() === lower) return true;
        }
        return false;
      });
    }

    if (sortBy === 'date_added_desc') {
      combined.sort((a, b) => {
        const ta = this._parseDate(a.favorite.created_at);
        const tb = this._parseDate(b.favorite.created_at);
        return (tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0);
      });
    } else if (sortBy === 'price_low_to_high') {
      combined.sort((a, b) => {
        const pa = a.listing ? a.listing.price_per_night || 0 : 0;
        const pb = b.listing ? b.listing.price_per_night || 0 : 0;
        return pa - pb;
      });
    } else if (sortBy === 'price_high_to_low') {
      combined.sort((a, b) => {
        const pa = a.listing ? a.listing.price_per_night || 0 : 0;
        const pb = b.listing ? b.listing.price_per_night || 0 : 0;
        return pb - pa;
      });
    }

    return {
      favorites: combined
    };
  }

  // addListingToFavorites(listingId, note)
  addListingToFavorites(listingId, note) {
    if (!listingId) {
      return { success: false, message: 'Listing id is required', is_favorited: false, favorite: null };
    }

    const favorites = this._getFromStorage('favorites', []);

    let favorite = favorites.find((f) => f.listing_id === listingId);
    if (favorite) {
      favorite = Object.assign({}, favorite, {
        note: note !== undefined ? note : favorite.note
      });
      const updatedFavorites = favorites.map((f) => (f.id === favorite.id ? favorite : f));
      this._saveToStorage('favorites', updatedFavorites);
    } else {
      favorite = {
        id: this._generateId('fav'),
        listing_id: listingId,
        created_at: this._nowIso(),
        note: note || null
      };
      favorites.push(favorite);
      this._saveToStorage('favorites', favorites);
    }

    return {
      success: true,
      message: 'Listing added to favorites',
      is_favorited: true,
      favorite
    };
  }

  // removeListingFromFavorites(listingId)
  removeListingFromFavorites(listingId) {
    if (!listingId) {
      return { success: false, message: 'Listing id is required' };
    }

    const favorites = this._getFromStorage('favorites', []);
    const filtered = favorites.filter((f) => f.listing_id !== listingId);
    this._saveToStorage('favorites', filtered);

    return {
      success: true,
      message: 'Listing removed from favorites'
    };
  }

  // getTripCollections()
  getTripCollections() {
    const trips = this._getFromStorage('trips', []);
    const tripItems = this._getFromStorage('trip_items', []);

    return trips.map((trip) => ({
      trip,
      listing_count: tripItems.filter((ti) => ti.trip_id === trip.id).length
    }));
  }

  // getTripCollectionDetails(tripId)
  getTripCollectionDetails(tripId) {
    const trips = this._getFromStorage('trips', []);
    const tripItems = this._getFromStorage('trip_items', []);
    const listings = this._getFromStorage('listings', []);

    const trip = trips.find((t) => t.id === tripId) || null;
    const items = tripItems
      .filter((ti) => ti.trip_id === tripId)
      .map((ti) => ({
        trip_item: ti,
        listing: listings.find((l) => l.id === ti.listing_id) || null
      }));

    return { trip, items };
  }

  // createTripCollection(name, description)
  createTripCollection(name, description) {
    if (!name) {
      return { success: false, message: 'Name is required', trip: null };
    }

    const trips = this._getFromStorage('trips', []);

    const trip = {
      id: this._generateId('trip'),
      name,
      description: description || null,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    trips.push(trip);
    this._saveToStorage('trips', trips);

    return {
      success: true,
      message: 'Trip collection created',
      trip
    };
  }

  // renameTripCollection(tripId, name)
  renameTripCollection(tripId, name) {
    if (!tripId || !name) {
      return { success: false, message: 'Trip id and name are required', trip: null };
    }

    const trips = this._getFromStorage('trips', []);
    let trip = trips.find((t) => t.id === tripId);
    if (!trip) {
      return { success: false, message: 'Trip not found', trip: null };
    }

    trip = Object.assign({}, trip, {
      name,
      updated_at: this._nowIso()
    });

    const updatedTrips = trips.map((t) => (t.id === trip.id ? trip : t));
    this._saveToStorage('trips', updatedTrips);

    return {
      success: true,
      message: 'Trip renamed',
      trip
    };
  }

  // deleteTripCollection(tripId)
  deleteTripCollection(tripId) {
    if (!tripId) {
      return { success: false, message: 'Trip id is required' };
    }

    const trips = this._getFromStorage('trips', []);
    const tripItems = this._getFromStorage('trip_items', []);

    const filteredTrips = trips.filter((t) => t.id !== tripId);
    const filteredItems = tripItems.filter((ti) => ti.trip_id !== tripId);

    this._saveToStorage('trips', filteredTrips);
    this._saveToStorage('trip_items', filteredItems);

    return {
      success: true,
      message: 'Trip deleted'
    };
  }

  // addListingToTrip(tripId, listingId)
  addListingToTrip(tripId, listingId) {
    if (!tripId || !listingId) {
      return { success: false, message: 'Trip id and listing id are required', trip_item: null };
    }

    const trips = this._getFromStorage('trips', []);
    const listings = this._getFromStorage('listings', []);
    const tripItems = this._getFromStorage('trip_items', []);

    const trip = trips.find((t) => t.id === tripId);
    if (!trip) {
      return { success: false, message: 'Trip not found', trip_item: null };
    }

    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      return { success: false, message: 'Listing not found', trip_item: null };
    }

    const existing = tripItems.find((ti) => ti.trip_id === tripId && ti.listing_id === listingId);
    if (existing) {
      return {
        success: true,
        message: 'Listing already in trip',
        trip_item: existing
      };
    }

    const tripItem = {
      id: this._generateId('titem'),
      trip_id: tripId,
      listing_id: listingId,
      added_at: this._nowIso()
    };

    tripItems.push(tripItem);
    this._saveToStorage('trip_items', tripItems);

    return {
      success: true,
      message: 'Listing added to trip',
      trip_item: tripItem
    };
  }

  // removeListingFromTrip(tripItemId)
  removeListingFromTrip(tripItemId) {
    if (!tripItemId) {
      return { success: false, message: 'Trip item id is required' };
    }

    const tripItems = this._getFromStorage('trip_items', []);
    const filtered = tripItems.filter((ti) => ti.id !== tripItemId);
    this._saveToStorage('trip_items', filtered);

    return {
      success: true,
      message: 'Listing removed from trip'
    };
  }

  // getSavedSearches()
  getSavedSearches() {
    const savedSearches = this._getFromStorage('saved_searches', []);
    const locations = this._getFromStorage('locations', []);

    return savedSearches.map((s) => {
      let locationName = s.location_name || null;
      if (!locationName && s.location_id) {
        const loc = locations.find((l) => l.id === s.location_id);
        if (loc) locationName = loc.name;
      }

      let dateRangeLabel = '';
      if (s.check_in_date && s.check_out_date) {
        dateRangeLabel = s.check_in_date + ' - ' + s.check_out_date;
      } else if (s.flexible_dates) {
        dateRangeLabel = 'Flexible dates';
      }

      let priceCapLabel = '';
      if (typeof s.max_price_per_night === 'number') {
        priceCapLabel = 'Up to $' + s.max_price_per_night + '/night';
      }

      return {
        saved_search: s,
        location_name: locationName,
        date_range_label: dateRangeLabel,
        price_cap_label: priceCapLabel,
        notifications_enabled: !!s.notifications_enabled
      };
    });
  }

  // createSavedSearch(...)
  createSavedSearch(
    name,
    locationName,
    checkInDate,
    checkOutDate,
    flexibleDates,
    minPricePerNight,
    maxPricePerNight,
    adults,
    children,
    infants,
    pets,
    propertyTypes,
    spaceType,
    bedroomsMin,
    amenities,
    ratingMin,
    reviewsMin,
    instantBookOnly,
    cancellationPolicy,
    neighborhood,
    sortBy
  ) {
    if (!name) {
      return { success: false, message: 'Name is required', saved_search: null };
    }

    const savedSearches = this._getFromStorage('saved_searches', []);
    const locations = this._getFromStorage('locations', []);

    let locationId = null;
    if (locationName) {
      const loc = locations.find((l) => (l.name || '').toLowerCase() === locationName.toLowerCase());
      if (loc) {
        locationId = loc.id;
      }
    }

    const savedSearch = {
      id: this._generateId('ss'),
      name,
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      location_name: locationName || null,
      location_id: locationId,
      check_in_date: checkInDate || null,
      check_out_date: checkOutDate || null,
      flexible_dates: !!flexibleDates,
      min_price_per_night: typeof minPricePerNight === 'number' ? minPricePerNight : null,
      max_price_per_night: typeof maxPricePerNight === 'number' ? maxPricePerNight : null,
      adults: adults || 0,
      children: children || 0,
      infants: infants || 0,
      pets: pets || 0,
      property_types: propertyTypes || [],
      space_type: spaceType || null,
      bedrooms_min: bedroomsMin || null,
      amenities: amenities || [],
      rating_min: ratingMin || null,
      reviews_min: reviewsMin || null,
      instant_book_only: !!instantBookOnly,
      cancellation_policy: cancellationPolicy || null,
      neighborhood: neighborhood || null,
      sort_by: sortBy || null,
      notifications_enabled: false
    };

    savedSearches.push(savedSearch);
    this._saveToStorage('saved_searches', savedSearches);

    return {
      success: true,
      message: 'Saved search created',
      saved_search: savedSearch
    };
  }

  // renameSavedSearch(savedSearchId, name)
  renameSavedSearch(savedSearchId, name) {
    if (!savedSearchId || !name) {
      return { success: false, message: 'Saved search id and name are required', saved_search: null };
    }

    const savedSearches = this._getFromStorage('saved_searches', []);
    let savedSearch = savedSearches.find((s) => s.id === savedSearchId);
    if (!savedSearch) {
      return { success: false, message: 'Saved search not found', saved_search: null };
    }

    savedSearch = Object.assign({}, savedSearch, {
      name,
      updated_at: this._nowIso()
    });

    const updated = savedSearches.map((s) => (s.id === savedSearch.id ? savedSearch : s));
    this._saveToStorage('saved_searches', updated);

    return {
      success: true,
      message: 'Saved search renamed',
      saved_search: savedSearch
    };
  }

  // deleteSavedSearch(savedSearchId)
  deleteSavedSearch(savedSearchId) {
    if (!savedSearchId) {
      return { success: false, message: 'Saved search id is required' };
    }

    const savedSearches = this._getFromStorage('saved_searches', []);
    const filtered = savedSearches.filter((s) => s.id !== savedSearchId);
    this._saveToStorage('saved_searches', filtered);

    return {
      success: true,
      message: 'Saved search deleted'
    };
  }

  // runSavedSearch(savedSearchId)
  runSavedSearch(savedSearchId) {
    const savedSearches = this._getFromStorage('saved_searches', []);
    const savedSearch = savedSearches.find((s) => s.id === savedSearchId) || null;
    if (!savedSearch) {
      return { criteria: null, results: [], total_count: 0 };
    }

    const criteria = {
      locationName: savedSearch.location_name,
      locationId: savedSearch.location_id,
      checkInDate: savedSearch.check_in_date,
      checkOutDate: savedSearch.check_out_date,
      adults: savedSearch.adults,
      children: savedSearch.children,
      infants: savedSearch.infants,
      pets: savedSearch.pets,
      minPricePerNight: savedSearch.min_price_per_night,
      maxPricePerNight: savedSearch.max_price_per_night,
      propertyTypes: savedSearch.property_types,
      spaceType: savedSearch.space_type,
      bedroomsMin: savedSearch.bedrooms_min,
      amenities: savedSearch.amenities,
      instantBookOnly: savedSearch.instant_book_only,
      cancellationPolicy: savedSearch.cancellation_policy,
      ratingMin: savedSearch.rating_min,
      reviewsMin: savedSearch.reviews_min,
      neighborhood: savedSearch.neighborhood,
      isDowntown: null,
      sortBy: savedSearch.sort_by,
      limit: null,
      offset: null
    };

    const searchResult = this._searchListingsInternal(criteria);

    return {
      criteria: savedSearch,
      results: searchResult.results,
      total_count: searchResult.total_count
    };
  }

  // updateSavedSearchNotifications(savedSearchId, notificationsEnabled)
  updateSavedSearchNotifications(savedSearchId, notificationsEnabled) {
    if (!savedSearchId) {
      return { success: false, message: 'Saved search id is required', saved_search_id: null, notifications_enabled: false };
    }

    const savedSearches = this._getFromStorage('saved_searches', []);
    let savedSearch = savedSearches.find((s) => s.id === savedSearchId);
    if (!savedSearch) {
      return { success: false, message: 'Saved search not found', saved_search_id: null, notifications_enabled: false };
    }

    savedSearch = Object.assign({}, savedSearch, {
      notifications_enabled: !!notificationsEnabled,
      updated_at: this._nowIso()
    });

    const updated = savedSearches.map((s) => (s.id === savedSearch.id ? savedSearch : s));
    this._saveToStorage('saved_searches', updated);

    return {
      success: true,
      message: 'Notifications updated',
      saved_search_id: savedSearchId,
      notifications_enabled: !!notificationsEnabled
    };
  }

  // getMessageThreads()
  getMessageThreads() {
    const threads = this._getFromStorage('message_threads', []);
    const listings = this._getFromStorage('listings', []);
    const hosts = this._getFromStorage('hosts', []);

    return threads.map((thread) => ({
      thread,
      listing: listings.find((l) => l.id === thread.listing_id) || null,
      host: hosts.find((h) => h.id === thread.host_id) || null
    }));
  }

  // getMessageThreadMessages(threadId)
  getMessageThreadMessages(threadId) {
    const threads = this._getFromStorage('message_threads', []);
    const messages = this._getFromStorage('messages', []);

    const thread = threads.find((t) => t.id === threadId) || null;
    const threadMessages = messages
      .filter((m) => m.thread_id === threadId)
      .sort((a, b) => {
        const ta = this._parseDate(a.sent_at);
        const tb = this._parseDate(b.sent_at);
        return (ta ? ta.getTime() : 0) - (tb ? tb.getTime() : 0);
      });

    return {
      thread,
      messages: threadMessages
    };
  }

  // sendMessageInThread(threadId, body)
  sendMessageInThread(threadId, body) {
    if (!threadId || !body) {
      return { success: false, message: 'Thread id and body are required', thread: null, sent_message: null };
    }

    const threads = this._getFromStorage('message_threads', []);
    const messages = this._getFromStorage('messages', []);

    let thread = threads.find((t) => t.id === threadId);
    if (!thread) {
      return { success: false, message: 'Thread not found', thread: null, sent_message: null };
    }

    const sentAt = this._nowIso();
    const message = {
      id: this._generateId('msg'),
      thread_id: threadId,
      sender_type: 'guest',
      body,
      sent_at: sentAt,
      is_read: false
    };

    messages.push(message);

    thread = Object.assign({}, thread, {
      last_message_at: sentAt,
      last_message_preview: body.slice(0, 200),
      unread_count: thread.unread_count || 0
    });

    const updatedThreads = threads.map((t) => (t.id === thread.id ? thread : t));

    this._saveToStorage('messages', messages);
    this._saveToStorage('message_threads', updatedThreads);

    return {
      success: true,
      message: 'Message sent',
      thread,
      sent_message: message
    };
  }

  // startMessageThreadWithHost(listingId, initialMessageBody)
  startMessageThreadWithHost(listingId, initialMessageBody) {
    if (!listingId || !initialMessageBody) {
      return { success: false, message: 'Listing id and message body are required', thread: null, first_message: null };
    }

    const listings = this._getFromStorage('listings', []);
    const hosts = this._getFromStorage('hosts', []);
    const threads = this._getFromStorage('message_threads', []);
    const messages = this._getFromStorage('messages', []);

    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      return { success: false, message: 'Listing not found', thread: null, first_message: null };
    }

    const host = hosts.find((h) => h.id === listing.host_id);
    if (!host) {
      return { success: false, message: 'Host not found for listing', thread: null, first_message: null };
    }

    const createdAt = this._nowIso();
    const thread = {
      id: this._generateId('th'),
      listing_id: listing.id,
      host_id: host.id,
      subject: 'Inquiry about ' + (listing.title || 'listing'),
      created_at: createdAt,
      last_message_at: createdAt,
      last_message_preview: initialMessageBody.slice(0, 200),
      unread_count: 0
    };

    const firstMessage = {
      id: this._generateId('msg'),
      thread_id: thread.id,
      sender_type: 'guest',
      body: initialMessageBody,
      sent_at: createdAt,
      is_read: false
    };

    threads.push(thread);
    messages.push(firstMessage);

    this._saveToStorage('message_threads', threads);
    this._saveToStorage('messages', messages);

    return {
      success: true,
      message: 'Thread started',
      thread,
      first_message: firstMessage
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return {
      topics: [
        {
          key: 'searching',
          title: 'Searching for stays',
          content: 'Use filters like price, property type, amenities, and rating to find the perfect stay.',
          related_links: []
        },
        {
          key: 'booking',
          title: 'How booking works',
          content: 'Select your dates and guests, review the price breakdown, and confirm your booking at checkout.',
          related_links: []
        },
        {
          key: 'payments',
          title: 'Payments and promo codes',
          content: 'Enter your card details securely at checkout and apply valid promo codes before confirming.',
          related_links: []
        },
        {
          key: 'favorites',
          title: 'Using favorites and trips',
          content: 'Save listings to favorites or group them into trips to compare options and plan with others.',
          related_links: []
        }
      ]
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      headline: 'StayFinder: Vacation rentals made simple',
      mission: 'We help you discover and book unique vacation rentals around the world with transparent pricing and flexible tools.',
      property_types_supported: ['apartment', 'house', 'cabin', 'studio', 'loft', 'villa', 'townhouse'],
      example_locations: ['Miami', 'Orlando', 'Denver', 'New York', 'Asheville', 'Paris', 'Los Angeles', 'Chicago', 'Barcelona'],
      features: [
        {
          key: 'powerful_search',
          title: 'Powerful search',
          description: 'Filter by price, rating, amenities, and more to quickly find stays that match your needs.'
        },
        {
          key: 'simple_checkout',
          title: 'Simple checkout',
          description: 'Clear price breakdowns, promo codes, and secure payments make booking straightforward.'
        },
        {
          key: 'planning_tools',
          title: 'Planning tools',
          description: 'Save favorites, build trip collections, and set up saved searches with alerts.'
        }
      ]
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    return {
      support_email: 'support@example.com',
      support_phone: '+1 (555) 123-4567',
      support_hours: '24/7 email support; phone support 9am–6pm local time',
      mailing_address: 'StayFinder Support, 123 Main Street, Anytown, USA'
    };
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return { success: false, message: 'All fields are required' };
    }
    // As per requirements, no external operations; treat as simulated success
    return { success: true, message: 'Your message has been received' };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return {
      last_updated: '2024-01-01',
      sections: [
        {
          id: 'use_of_platform',
          title: 'Use of the platform',
          body: 'By using this platform, you agree to comply with all applicable laws and our community standards.'
        },
        {
          id: 'payments',
          title: 'Payments',
          body: 'Payments are processed securely. You are responsible for any additional bank or card fees.'
        },
        {
          id: 'cancellations',
          title: 'Cancellations',
          body: 'Each listing has its own cancellation policy (flexible, moderate, strict, super_strict, or non_refundable). Review it before booking.'
        },
        {
          id: 'disputes',
          title: 'Disputes',
          body: 'If an issue arises, contact support. We may mediate but are not responsible for host or guest actions.'
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
          id: 'data_collection',
          title: 'Data collection',
          body: 'We collect information you provide, such as account details and booking information, to operate the service.'
        },
        {
          id: 'data_use',
          title: 'How we use data',
          body: 'Your data is used to provide and improve the service, personalize content, and communicate with you.'
        },
        {
          id: 'data_sharing',
          title: 'Data sharing',
          body: 'We share data with hosts for bookings and with service providers as needed to operate the platform.'
        },
        {
          id: 'your_rights',
          title: 'Your rights',
          body: 'You may request access, correction, or deletion of your personal data, subject to legal requirements.'
        }
      ]
    };
  }

  // getNotFoundPageSuggestions(requestedPath)
  getNotFoundPageSuggestions(requestedPath) {
    const popularDestinations = ['Miami', 'Orlando', 'Denver', 'New York', 'Asheville', 'Paris', 'Los Angeles', 'Chicago', 'Barcelona'];

    return {
      message: 'The page ' + requestedPath + ' could not be found.',
      suggested_links: [
        { key: 'home', label: 'Go to homepage', path: '/' },
        { key: 'search', label: 'Search stays', path: '/search' },
        { key: 'help', label: 'Help center', path: '/help' }
      ],
      popular_destinations: popularDestinations
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
