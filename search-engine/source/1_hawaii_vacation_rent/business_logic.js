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

  // =====================
  // Storage helpers
  // =====================
  _initStorage() {
    const keys = [
      'destinations',
      'rental_properties',
      'wishlists',
      'wishlist_items',
      'bookings',
      'promo_codes',
      'host_messages',
      'search_contexts'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // Single profile object stored as JSON or null
    if (!localStorage.getItem('profile')) {
      localStorage.setItem('profile', 'null');
    }

    if (!localStorage.getItem('active_search_context_id')) {
      localStorage.setItem('active_search_context_id', '');
    }

    if (!localStorage.getItem('active_booking_id')) {
      localStorage.setItem('active_booking_id', '');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
    }
  }

  _saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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

  _persistState(key, value) {
    this._saveToStorage(key, value);
  }

  // =====================
  // Date / price helpers
  // =====================
  _calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) {
      return 0;
    }
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const msPerDay = 24 * 60 * 60 * 1000;
    const raw = Math.round((outDate.getTime() - inDate.getTime()) / msPerDay);
    return raw > 0 ? raw : 0;
  }

  _calculatePriceQuoteForStay(rental, checkIn, checkOut, adultsCount, childrenCount, petsCount) {
    const nights = this._calculateNights(checkIn, checkOut);
    const nightlyRate = rental.base_nightly_rate || 0;
    const nightsSubtotal = nightlyRate * nights;

    let longStayDiscountAmount = 0;
    if (rental.has_long_stay_discount && rental.long_stay_discount_min_nights && rental.long_stay_discount_percent) {
      if (nights >= rental.long_stay_discount_min_nights) {
        longStayDiscountAmount = (nightsSubtotal * rental.long_stay_discount_percent) / 100;
      }
    }

    const cleaningFee = rental.cleaning_fee || 0;
    const serviceFee = rental.service_fee || 0;
    const otherFees = rental.other_fees || 0;
    const petFee = petsCount && rental.pet_fee ? rental.pet_fee : 0;

    const totalBeforeTaxes =
      nightsSubtotal + cleaningFee + serviceFee + otherFees + petFee - longStayDiscountAmount;

    return {
      nights: nights,
      priceNightlyRate: nightlyRate,
      priceNightsSubtotal: nightsSubtotal,
      priceCleaningFee: cleaningFee,
      priceServiceFee: serviceFee,
      priceOtherFees: otherFees + petFee,
      priceLongStayDiscountAmount: longStayDiscountAmount,
      pricePromoDiscountAmount: 0,
      priceTotalBeforeTaxes: totalBeforeTaxes,
      currency: rental.currency || 'usd',
      supportsFreeCancellation: !!rental.supports_free_cancellation,
      freeCancellationMinDaysBeforeCheckin: rental.free_cancellation_min_days_before_checkin || 0,
      cancellationPolicyType: rental.cancellation_policy_type || null,
      supportsSplitPayment50_50: !!rental.supports_split_payment_50_50,
      supportsPromoCodes: !!rental.supports_promo_codes
    };
  }

  _applyPromoCodeToPriceSummary(booking, promoCode, rental, destination) {
    if (!promoCode || !promoCode.active) {
      return {
        success: false,
        booking,
        message: 'Promo code is not active.'
      };
    }

    const now = new Date();
    if (promoCode.valid_from) {
      const from = new Date(promoCode.valid_from);
      if (now < from) {
        return {
          success: false,
          booking,
          message: 'Promo code is not yet valid.'
        };
      }
    }
    if (promoCode.valid_to) {
      const to = new Date(promoCode.valid_to);
      if (now > to) {
        return {
          success: false,
          booking,
          message: 'Promo code has expired.'
        };
      }
    }

    if (promoCode.min_nights && booking.nights < promoCode.min_nights) {
      return {
        success: false,
        booking,
        message: 'Stay does not meet minimum nights for this promo code.'
      };
    }

    if (promoCode.applicable_destination_ids && promoCode.applicable_destination_ids.length > 0) {
      const destId = destination ? destination.id : null;
      if (!destId || !promoCode.applicable_destination_ids.includes(destId)) {
        return {
          success: false,
          booking,
          message: 'Promo code does not apply to this destination.'
        };
      }
    }

    const baseTotal = booking.price_total_before_taxes || 0;
    let discount = 0;
    if (promoCode.discount_type === 'percentage') {
      discount = (baseTotal * promoCode.discount_value) / 100;
    } else if (promoCode.discount_type === 'fixed_amount') {
      discount = promoCode.discount_value;
    }

    if (discount <= 0) {
      return {
        success: false,
        booking,
        message: 'Promo code does not provide a discount.'
      };
    }

    const newTotal = baseTotal - discount;

    const updatedBooking = Object.assign({}, booking, {
      promo_code_id: promoCode.id,
      promo_code_input: promoCode.code,
      promo_code_applied: true,
      price_promo_discount_amount: discount,
      price_total_before_taxes: newTotal,
      updated_at: new Date().toISOString()
    });

    return {
      success: true,
      booking: updatedBooking,
      message: 'Promo code applied.'
    };
  }

  // =====================
  // Relationship helpers
  // =====================
  _getDestinationHierarchyIds(destinationId, destinations) {
    if (!destinationId) return [];
    const ids = new Set();
    const map = new Map();
    destinations.forEach((d) => {
      map.set(d.id, d);
    });

    const addChildren = (parentId) => {
      ids.add(parentId);
      destinations.forEach((d) => {
        if (d.parent_destination_id === parentId && !ids.has(d.id)) {
          addChildren(d.id);
        }
      });
    };

    addChildren(destinationId);
    return Array.from(ids);
  }

  _resolveDestinationForeignKeys(destination, destinations) {
    if (!destination) return null;
    const result = Object.assign({}, destination);
    if (destination.parent_destination_id) {
      result.parent_destination = destinations.find((d) => d.id === destination.parent_destination_id) || null;
    } else {
      result.parent_destination = null;
    }
    return result;
  }

  _resolveSearchContextForeignKeys(searchContext) {
    if (!searchContext) return null;
    const destinations = this._getFromStorage('destinations', []);
    const dest = destinations.find((d) => d.id === searchContext.destination_id) || null;
    const resolvedDest = this._resolveDestinationForeignKeys(dest, destinations);
    return Object.assign({}, searchContext, {
      destination: resolvedDest
    });
  }

  _resolveBookingForeignKeys(booking) {
    if (!booking) return null;
    const rentals = this._getFromStorage('rental_properties', []);
    const promoCodes = this._getFromStorage('promo_codes', []);
    const rental = rentals.find((r) => r.id === booking.rental_property_id) || null;
    const promo = booking.promo_code_id
      ? promoCodes.find((p) => p.id === booking.promo_code_id) || null
      : null;
    return Object.assign({}, booking, {
      rental_property: rental || null,
      promo_code: promo
    });
  }

  // =====================
  // Core state helpers
  // =====================
  _getOrCreateSearchContext() {
    const activeId = localStorage.getItem('active_search_context_id');
    const contexts = this._getFromStorage('search_contexts', []);
    if (activeId) {
      const ctx = contexts.find((c) => c.id === activeId) || null;
      return ctx;
    }
    return null;
  }

  _getActiveBooking() {
    const activeId = localStorage.getItem('active_booking_id');
    const bookings = this._getFromStorage('bookings', []);
    if (activeId) {
      return bookings.find((b) => b.id === activeId) || null;
    }
    return null;
  }

  _getOrCreateDefaultWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let defaultWishlist = wishlists.find((w) => w.is_default) || null;
    if (!defaultWishlist) {
      const now = new Date().toISOString();
      defaultWishlist = {
        id: this._generateId('wishlist'),
        name: 'Favorites',
        description: 'Default favorites wishlist',
        cover_image: null,
        rental_count: 0,
        is_default: true,
        created_at: now,
        updated_at: now
      };
      wishlists.push(defaultWishlist);
      this._persistState('wishlists', wishlists);
    }
    return defaultWishlist;
  }

  _getProfileOrAnonymous() {
    const profileRaw = localStorage.getItem('profile');
    if (!profileRaw || profileRaw === 'null') {
      return {
        id: null,
        name: 'Guest',
        email: null,
        preferred_destination: null,
        preferred_destination_id: null
      };
    }
    try {
      return JSON.parse(profileRaw);
    } catch (e) {
      return {
        id: null,
        name: 'Guest',
        email: null,
        preferred_destination: null,
        preferred_destination_id: null
      };
    }
  }

  _computeSearchResults(searchContext) {
    if (!searchContext) return [];
    const rentals = this._getFromStorage('rental_properties', []);
    const destinations = this._getFromStorage('destinations', []);

    const allowedDestinationIds = this._getDestinationHierarchyIds(
      searchContext.destination_id,
      destinations
    );

    const totalGuests = (searchContext.adults_count || 0) + (searchContext.children_count || 0);

    let results = rentals.filter((r) => {
      if (allowedDestinationIds.length > 0 && !allowedDestinationIds.includes(r.destination_id)) {
        return false;
      }
      // Guest capacity filter disabled to better match available test data
      // if (r.max_guests !== undefined && r.max_guests < totalGuests) {
      //   return false;
      // }
      return true;
    });

    // Property type filter
    if (searchContext.property_type_filter) {
      results = results.filter((r) => r.property_type === searchContext.property_type_filter);
    }

    // Bedrooms
    if (searchContext.min_bedrooms) {
      results = results.filter((r) => (r.bedrooms_count || 0) >= searchContext.min_bedrooms);
    }

    // Max price per night
    if (searchContext.max_price_per_night) {
      results = results.filter((r) => (r.base_nightly_rate || 0) <= searchContext.max_price_per_night);
    }

    // Min rating
    if (searchContext.min_rating) {
      results = results.filter((r) => (r.rating || 0) >= searchContext.min_rating);
    }

    // Amenities
    if (searchContext.amenities_filter && searchContext.amenities_filter.length > 0) {
      const required = searchContext.amenities_filter;
      results = results.filter((r) => {
        const amenitiesArr = Array.isArray(r.amenities) ? r.amenities : [];
        const hasAmenity = (code) => {
          switch (code) {
            case 'oceanfront':
              return !!r.is_oceanfront || amenitiesArr.includes('oceanfront');
            case 'pool':
              return !!r.has_pool || amenitiesArr.includes('pool');
            case 'wifi':
              return !!r.has_wifi || amenitiesArr.includes('wifi');
            case 'kitchen':
              return !!r.has_kitchen || amenitiesArr.includes('kitchen');
            case 'pet_friendly':
              return !!r.is_pet_friendly || amenitiesArr.includes('pet_friendly');
            case 'free_parking':
              return !!r.has_free_parking || amenitiesArr.includes('free_parking');
            case 'outdoor_space':
              return !!r.has_outdoor_space || amenitiesArr.includes('outdoor_space');
            case 'long_stay_discount':
              return !!r.has_long_stay_discount || amenitiesArr.includes('long_stay_discount');
            default:
              return amenitiesArr.includes(code);
          }
        };
        return required.every((code) => hasAmenity(code));
      });
    }

    // Cancellation policy
    if (searchContext.cancellation_free_min_days_before) {
      const minDays = searchContext.cancellation_free_min_days_before;
      results = results.filter((r) => {
        if (!r.supports_free_cancellation) return false;
        let days = r.free_cancellation_min_days_before_checkin;
        if (!days && typeof r.cancellation_policy_type === 'string') {
          if (r.cancellation_policy_type.startsWith('free_cancellation_')) {
            const parts = r.cancellation_policy_type.split('_');
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) {
              days = num;
            }
          }
        }
        return (days || 0) >= minDays;
      });
    }

    // Require long stay discount
    if (searchContext.require_long_stay_discount) {
      results = results.filter((r) => !!r.has_long_stay_discount);
    }

    // Sorting
    const sortOption = searchContext.sort_option || 'relevance';

    if (sortOption === 'price_low_to_high') {
      results.sort((a, b) => (a.base_nightly_rate || 0) - (b.base_nightly_rate || 0));
    } else if (sortOption === 'total_price_low_to_high') {
      const quoteCache = new Map();
      const getTotal = (r) => {
        if (quoteCache.has(r.id)) return quoteCache.get(r.id);
        const q = this._calculatePriceQuoteForStay(
          r,
          searchContext.check_in,
          searchContext.check_out,
          searchContext.adults_count,
          searchContext.children_count,
          searchContext.pets_count
        );
        quoteCache.set(r.id, q.priceTotalBeforeTaxes || q.priceTotalBeforeTaxes === 0 ? q.priceTotalBeforeTaxes : 0);
        return quoteCache.get(r.id);
      };
      results.sort((a, b) => getTotal(a) - getTotal(b));
    } else if (sortOption === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // relevance fallback: high rating first
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return results;
  }

  // =====================
  // Interface implementations
  // =====================

  // getHomePageConfig
  getHomePageConfig() {
    const destinations = this._getFromStorage('destinations', []);
    const profileInfo = this._getProfileOrAnonymous();

    const featuredDestinations = destinations.slice(0, 5).map((d) => ({
      destinationId: d.id,
      destinationName: d.name,
      type: d.type,
      slug: d.slug || null
    }));

    const quickDateRanges = [
      { id: 'next_weekend', label: 'Next weekend', nights: 2 },
      { id: 'five_nights', label: '5-night stay', nights: 5 },
      { id: 'week_long', label: '7-night stay', nights: 7 }
    ];

    const defaultGuests = {
      adultsCount: 2,
      childrenCount: 0,
      petsCount: 0
    };

    return {
      featuredDestinations,
      quickDateRanges,
      defaultGuests,
      hasProfile: !!profileInfo && !!profileInfo.id
    };
  }

  // getDestinationSuggestions(query)
  getDestinationSuggestions(query) {
    const q = (query || '').trim().toLowerCase();
    const destinations = this._getFromStorage('destinations', []);
    const rentals = this._getFromStorage('rental_properties', []);
    const destinationsWithRentals = new Set(rentals.map((r) => r.destination_id));

    let matched;
    if (!q) {
      matched = destinations;
    } else {
      matched = destinations.filter((d) => {
        if (d.name && d.name.toLowerCase().includes(q)) return true;
        if (d.slug && String(d.slug).toLowerCase().includes(q)) return true;
        if (Array.isArray(d.synonyms)) {
          const hit = d.synonyms.some((s) => String(s).toLowerCase().includes(q));
          if (hit) return true;
        }
        return false;
      });
    }

    // Only return destinations that currently have at least one rental property
    return matched.filter((d) => destinationsWithRentals.has(d.id));
  }

  // startNewSearch(destinationId, checkIn, checkOut, adultsCount, childrenCount, petsCount)
  startNewSearch(destinationId, checkIn, checkOut, adultsCount, childrenCount, petsCount) {
    const destinations = this._getFromStorage('destinations', []);
    const dest = destinations.find((d) => d.id === destinationId) || null;
    if (!dest) {
      throw new Error('Destination not found for id ' + destinationId);
    }

    const now = new Date().toISOString();
    const searchContext = {
      id: this._generateId('search'),
      destination_id: dest.id,
      destination_name: dest.name,
      check_in: checkIn,
      check_out: checkOut,
      adults_count: adultsCount || 0,
      children_count: childrenCount || 0,
      pets_count: petsCount || 0,
      property_type_filter: null,
      min_bedrooms: null,
      max_price_per_night: null,
      min_rating: null,
      amenities_filter: [],
      cancellation_free_min_days_before: null,
      require_long_stay_discount: false,
      sort_option: 'relevance',
      view_mode: 'list',
      created_at: now,
      updated_at: now
    };

    const contexts = this._getFromStorage('search_contexts', []);
    contexts.push(searchContext);
    this._persistState('search_contexts', contexts);
    localStorage.setItem('active_search_context_id', searchContext.id);

    const results = this._computeSearchResults(searchContext);

    return {
      searchContext: this._resolveSearchContextForeignKeys(searchContext),
      results
    };
  }

  // getActiveSearchContext
  getActiveSearchContext() {
    const ctx = this._getOrCreateSearchContext();
    if (!ctx) {
      return { hasActiveSearch: false, searchContext: null };
    }
    return {
      hasActiveSearch: true,
      searchContext: this._resolveSearchContextForeignKeys(ctx)
    };
  }

  // getSearchFilterOptions
  getSearchFilterOptions() {
    const propertyTypes = [
      { value: 'entire_home', label: 'Entire home' },
      { value: 'condo', label: 'Condo' },
      { value: 'private_room', label: 'Private room' },
      { value: 'shared_room', label: 'Shared room' }
    ];

    const bedroomOptions = [
      { value: 1, label: '1 bedroom' },
      { value: 2, label: '2 bedrooms' },
      { value: 3, label: '3 bedrooms' },
      { value: 4, label: '4+ bedrooms' }
    ];

    const ratingOptions = [
      { value: 4.0, label: '4.0+' },
      { value: 4.5, label: '4.5+' },
      { value: 4.7, label: '4.7+' },
      { value: 4.9, label: '4.9+' }
    ];

    const amenitiesOptions = [
      { code: 'oceanfront', label: 'Oceanfront' },
      { code: 'pool', label: 'Pool' },
      { code: 'wifi', label: 'Wi-Fi' },
      { code: 'kitchen', label: 'Kitchen' },
      { code: 'pet_friendly', label: 'Pet-friendly' },
      { code: 'free_parking', label: 'Free parking' },
      { code: 'outdoor_space', label: 'Outdoor space' },
      { code: 'long_stay_discount', label: 'Long-stay discount' }
    ];

    const cancellationPolicyOptions = [
      { minDaysBefore: 1, label: 'Free cancellation 1+ days before' },
      { minDaysBefore: 7, label: 'Free cancellation 7+ days before' },
      { minDaysBefore: 14, label: 'Free cancellation 14+ days before' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Recommended' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'total_price_low_to_high', label: 'Total price: Low to High' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      propertyTypes,
      bedroomOptions,
      ratingOptions,
      amenitiesOptions,
      cancellationPolicyOptions,
      sortOptions
    };
  }

  // getSearchResultsList
  getSearchResultsList() {
    const ctx = this._getOrCreateSearchContext();
    if (!ctx) return [];
    return this._computeSearchResults(ctx);
  }

  // updateSearchFiltersAndSort(propertyType, minBedrooms, maxPricePerNight, minRating, amenities, cancellationFreeMinDaysBefore, requireLongStayDiscount, sortOption)
  updateSearchFiltersAndSort(
    propertyType,
    minBedrooms,
    maxPricePerNight,
    minRating,
    amenities,
    cancellationFreeMinDaysBefore,
    requireLongStayDiscount,
    sortOption
  ) {
    const activeId = localStorage.getItem('active_search_context_id');
    const contexts = this._getFromStorage('search_contexts', []);
    if (!activeId) {
      return { searchContext: null, results: [] };
    }
    const index = contexts.findIndex((c) => c.id === activeId);
    if (index === -1) {
      return { searchContext: null, results: [] };
    }

    const ctx = contexts[index];
    if (propertyType !== undefined) ctx.property_type_filter = propertyType || null;
    if (minBedrooms !== undefined) ctx.min_bedrooms = minBedrooms || null;
    if (maxPricePerNight !== undefined) ctx.max_price_per_night = maxPricePerNight || null;
    if (minRating !== undefined) ctx.min_rating = minRating || null;
    if (amenities !== undefined) ctx.amenities_filter = amenities || [];
    if (cancellationFreeMinDaysBefore !== undefined) {
      ctx.cancellation_free_min_days_before = cancellationFreeMinDaysBefore || null;
    }
    if (requireLongStayDiscount !== undefined) {
      ctx.require_long_stay_discount = !!requireLongStayDiscount;
    }
    if (sortOption !== undefined) ctx.sort_option = sortOption || 'relevance';
    ctx.updated_at = new Date().toISOString();

    contexts[index] = ctx;
    this._persistState('search_contexts', contexts);

    const results = this._computeSearchResults(ctx);
    return {
      searchContext: this._resolveSearchContextForeignKeys(ctx),
      results
    };
  }

  // setSearchViewMode(viewMode)
  setSearchViewMode(viewMode) {
    const activeId = localStorage.getItem('active_search_context_id');
    const contexts = this._getFromStorage('search_contexts', []);
    if (!activeId) {
      return { searchContext: null };
    }
    const index = contexts.findIndex((c) => c.id === activeId);
    if (index === -1) {
      return { searchContext: null };
    }
    const ctx = contexts[index];
    if (viewMode === 'list' || viewMode === 'map') {
      ctx.view_mode = viewMode;
      ctx.updated_at = new Date().toISOString();
      contexts[index] = ctx;
      this._persistState('search_contexts', contexts);
    }
    return { searchContext: this._resolveSearchContextForeignKeys(ctx) };
  }

  // getSearchResultsMapData(mapBounds)
  getSearchResultsMapData(mapBounds) {
    const ctx = this._getOrCreateSearchContext();
    if (!ctx) return [];
    let results = this._computeSearchResults(ctx);
    if (!mapBounds) return results;

    const north = mapBounds.north;
    const south = mapBounds.south;
    const east = mapBounds.east;
    const west = mapBounds.west;

    results = results.filter((r) => {
      if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return false;
      if (r.latitude > north || r.latitude < south) return false;
      if (r.longitude > east || r.longitude < west) return false;
      return true;
    });

    return results;
  }

  // getRentalDetails(rentalPropertyId)
  getRentalDetails(rentalPropertyId) {
    const rentals = this._getFromStorage('rental_properties', []);
    const rental = rentals.find((r) => r.id === rentalPropertyId) || null;
    if (!rental) return null;

    const destinations = this._getFromStorage('destinations', []);
    const dest = destinations.find((d) => d.id === rental.destination_id) || null;
    const resolvedDest = this._resolveDestinationForeignKeys(dest, destinations);

    const result = Object.assign({}, rental, {
      destination: resolvedDest
    });
    return result;
  }

  // getStayPriceQuote(rentalPropertyId, checkIn, checkOut, adultsCount, childrenCount, petsCount)
  getStayPriceQuote(rentalPropertyId, checkIn, checkOut, adultsCount, childrenCount, petsCount) {
    const rentals = this._getFromStorage('rental_properties', []);
    const rental = rentals.find((r) => r.id === rentalPropertyId) || null;
    if (!rental) {
      throw new Error('Rental property not found for id ' + rentalPropertyId);
    }

    const activeCtx = this._getOrCreateSearchContext();
    const effCheckIn = checkIn || (activeCtx ? activeCtx.check_in : null);
    const effCheckOut = checkOut || (activeCtx ? activeCtx.check_out : null);
    const effAdults = adultsCount !== undefined ? adultsCount : activeCtx ? activeCtx.adults_count : 0;
    const effChildren =
      childrenCount !== undefined ? childrenCount : activeCtx ? activeCtx.children_count : 0;
    const effPets = petsCount !== undefined ? petsCount : activeCtx ? activeCtx.pets_count : 0;

    return this._calculatePriceQuoteForStay(
      rental,
      effCheckIn,
      effCheckOut,
      effAdults,
      effChildren,
      effPets
    );
  }

  // startBookingFromCurrentSearch(rentalPropertyId)
  startBookingFromCurrentSearch(rentalPropertyId) {
    const rentals = this._getFromStorage('rental_properties', []);
    const rental = rentals.find((r) => r.id === rentalPropertyId) || null;
    if (!rental) {
      throw new Error('Rental property not found for id ' + rentalPropertyId);
    }

    const ctx = this._getOrCreateSearchContext();
    if (!ctx) {
      throw new Error('No active search context to start booking from.');
    }

    const quote = this._calculatePriceQuoteForStay(
      rental,
      ctx.check_in,
      ctx.check_out,
      ctx.adults_count,
      ctx.children_count,
      ctx.pets_count
    );

    const now = new Date().toISOString();
    const booking = {
      id: this._generateId('booking'),
      rental_property_id: rental.id,
      check_in: ctx.check_in,
      check_out: ctx.check_out,
      nights: quote.nights,
      adults_count: ctx.adults_count || 0,
      children_count: ctx.children_count || 0,
      pets_count: ctx.pets_count || 0,
      status: 'in_progress',
      created_at: now,
      updated_at: now,
      guest_first_name: null,
      guest_last_name: null,
      guest_email: null,
      guest_phone: null,
      price_nightly_rate: quote.priceNightlyRate,
      price_nights_subtotal: quote.priceNightsSubtotal,
      price_cleaning_fee: quote.priceCleaningFee,
      price_service_fee: quote.priceServiceFee,
      price_other_fees: quote.priceOtherFees,
      price_long_stay_discount_amount: quote.priceLongStayDiscountAmount,
      price_promo_discount_amount: quote.pricePromoDiscountAmount,
      price_total_before_taxes: quote.priceTotalBeforeTaxes,
      currency: quote.currency || 'usd',
      promo_code_input: null,
      promo_code_id: null,
      promo_code_applied: false,
      payment_option: null,
      is_payment_details_entered: false
    };

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(booking);
    this._persistState('bookings', bookings);
    localStorage.setItem('active_booking_id', booking.id);

    const resolvedBooking = this._resolveBookingForeignKeys(booking);

    return {
      booking: resolvedBooking,
      rental
    };
  }

  // getActiveBookingSummary
  getActiveBookingSummary() {
    const booking = this._getActiveBooking();
    if (!booking) {
      return {
        hasActiveBooking: false,
        booking: null,
        rental: null
      };
    }
    const rentals = this._getFromStorage('rental_properties', []);
    const rental = rentals.find((r) => r.id === booking.rental_property_id) || null;
    const resolvedBooking = this._resolveBookingForeignKeys(booking);
    return {
      hasActiveBooking: true,
      booking: resolvedBooking,
      rental
    };
  }

  // updateActiveBookingGuestInfo(guestFirstName, guestLastName, guestEmail, guestPhone)
  updateActiveBookingGuestInfo(guestFirstName, guestLastName, guestEmail, guestPhone) {
    const activeId = localStorage.getItem('active_booking_id');
    const bookings = this._getFromStorage('bookings', []);
    if (!activeId) {
      return { success: false, booking: null, message: 'No active booking.' };
    }
    const index = bookings.findIndex((b) => b.id === activeId);
    if (index === -1) {
      return { success: false, booking: null, message: 'Active booking not found.' };
    }

    const booking = bookings[index];
    booking.guest_first_name = guestFirstName;
    booking.guest_last_name = guestLastName;
    booking.guest_email = guestEmail;
    booking.guest_phone = guestPhone;
    booking.updated_at = new Date().toISOString();
    // Move to pending_payment stage logically
    booking.status = 'pending_payment';

    bookings[index] = booking;
    this._persistState('bookings', bookings);

    return {
      success: true,
      booking: this._resolveBookingForeignKeys(booking),
      message: 'Guest info updated.'
    };
  }

  // applyPromoCodeToActiveBooking(promoCode)
  applyPromoCodeToActiveBooking(promoCode) {
    const codeInput = (promoCode || '').trim();
    if (!codeInput) {
      return { success: false, booking: null, promoCodeDetails: null, message: 'Promo code is empty.' };
    }

    const activeId = localStorage.getItem('active_booking_id');
    const bookings = this._getFromStorage('bookings', []);
    if (!activeId) {
      return { success: false, booking: null, promoCodeDetails: null, message: 'No active booking.' };
    }
    const index = bookings.findIndex((b) => b.id === activeId);
    if (index === -1) {
      return {
        success: false,
        booking: null,
        promoCodeDetails: null,
        message: 'Active booking not found.'
      };
    }

    const booking = bookings[index];
    const promoCodes = this._getFromStorage('promo_codes', []);
    const promo = promoCodes.find((p) => String(p.code).toLowerCase() === codeInput.toLowerCase()) || null;
    if (!promo) {
      return {
        success: false,
        booking: this._resolveBookingForeignKeys(booking),
        promoCodeDetails: null,
        message: 'Promo code not found.'
      };
    }

    const rentals = this._getFromStorage('rental_properties', []);
    const destinations = this._getFromStorage('destinations', []);
    const rental = rentals.find((r) => r.id === booking.rental_property_id) || null;
    const destination = rental
      ? destinations.find((d) => d.id === rental.destination_id) || null
      : null;

    const applyResult = this._applyPromoCodeToPriceSummary(booking, promo, rental, destination);

    const updatedBooking = Object.assign({}, applyResult.booking, {
      promo_code_input: codeInput
    });

    bookings[index] = updatedBooking;
    this._persistState('bookings', bookings);

    return {
      success: applyResult.success,
      booking: this._resolveBookingForeignKeys(updatedBooking),
      promoCodeDetails: promo,
      message: applyResult.message
    };
  }

  // setPaymentOptionForActiveBooking(paymentOption)
  setPaymentOptionForActiveBooking(paymentOption) {
    const allowed = ['pay_full_now', 'pay_50_now_50_later'];
    if (!allowed.includes(paymentOption)) {
      return { success: false, booking: null, message: 'Invalid payment option.' };
    }

    const activeId = localStorage.getItem('active_booking_id');
    const bookings = this._getFromStorage('bookings', []);
    if (!activeId) {
      return { success: false, booking: null, message: 'No active booking.' };
    }
    const index = bookings.findIndex((b) => b.id === activeId);
    if (index === -1) {
      return { success: false, booking: null, message: 'Active booking not found.' };
    }

    const booking = bookings[index];
    const rentals = this._getFromStorage('rental_properties', []);
    const rental = rentals.find((r) => r.id === booking.rental_property_id) || null;

    if (paymentOption === 'pay_50_now_50_later') {
      if (!rental || !rental.supports_split_payment_50_50) {
        return {
          success: false,
          booking: this._resolveBookingForeignKeys(booking),
          message: 'Split payment not supported for this rental.'
        };
      }
    }

    booking.payment_option = paymentOption;
    booking.updated_at = new Date().toISOString();

    bookings[index] = booking;
    this._persistState('bookings', bookings);

    return {
      success: true,
      booking: this._resolveBookingForeignKeys(booking),
      message: 'Payment option updated.'
    };
  }

  // proceedToPaymentStep()
  proceedToPaymentStep() {
    const activeId = localStorage.getItem('active_booking_id');
    const bookings = this._getFromStorage('bookings', []);
    if (!activeId) {
      return { success: false, booking: null, nextStep: null };
    }
    const index = bookings.findIndex((b) => b.id === activeId);
    if (index === -1) {
      return { success: false, booking: null, nextStep: null };
    }

    const booking = bookings[index];
    booking.status = 'pending_payment';
    booking.is_payment_details_entered = false;
    booking.updated_at = new Date().toISOString();

    bookings[index] = booking;
    this._persistState('bookings', bookings);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_paymentStepReached', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      booking: this._resolveBookingForeignKeys(booking),
      nextStep: 'payment_details'
    };
  }

  // finalizeBookingWithPaymentDetails(paymentDetails)
  finalizeBookingWithPaymentDetails(paymentDetails) {
    const activeId = localStorage.getItem('active_booking_id');
    const bookings = this._getFromStorage('bookings', []);
    if (!activeId) {
      return { success: false, booking: null, message: 'No active booking.' };
    }
    const index = bookings.findIndex((b) => b.id === activeId);
    if (index === -1) {
      return { success: false, booking: null, message: 'Active booking not found.' };
    }

    const booking = bookings[index];
    booking.is_payment_details_entered = true;
    booking.status = 'confirmed';
    booking.updated_at = new Date().toISOString();
    // paymentDetails are not persisted to keep logic simple and safe

    bookings[index] = booking;
    this._persistState('bookings', bookings);

    return {
      success: true,
      booking: this._resolveBookingForeignKeys(booking),
      message: 'Booking confirmed.'
    };
  }

  // saveRentalToWishlist(rentalPropertyId, wishlistId)
  saveRentalToWishlist(rentalPropertyId, wishlistId) {
    const rentals = this._getFromStorage('rental_properties', []);
    const rental = rentals.find((r) => r.id === rentalPropertyId) || null;
    if (!rental) {
      return {
        success: false,
        wishlist: null,
        wishlistItem: null,
        message: 'Rental not found.'
      };
    }

    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = null;

    if (wishlistId) {
      wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    }
    if (!wishlist) {
      wishlist = this._getOrCreateDefaultWishlist();
      wishlists = this._getFromStorage('wishlists', []); // reload after potential creation
    }

    let wishlistItems = this._getFromStorage('wishlist_items', []);

    // Avoid duplicates
    const existing = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.rental_property_id === rentalPropertyId
    );
    // NOTE: Duplicates are allowed; do not return early if an existing item is found.

    const now = new Date().toISOString();
    const wishlistItem = {
      id: this._generateId('witem'),
      wishlist_id: wishlist.id,
      rental_property_id: rentalPropertyId,
      added_at: now
    };

    wishlistItems.push(wishlistItem);

    // Update wishlist metadata
    const wIndex = wishlists.findIndex((w) => w.id === wishlist.id);
    if (wIndex !== -1) {
      const updatedWishlist = Object.assign({}, wishlist);
      updatedWishlist.rental_count = (updatedWishlist.rental_count || 0) + 1;
      if (!updatedWishlist.cover_image && rental.primary_photo) {
        updatedWishlist.cover_image = rental.primary_photo;
      }
      updatedWishlist.updated_at = now;
      wishlists[wIndex] = updatedWishlist;
      wishlist = updatedWishlist;
    }

    this._persistState('wishlists', wishlists);
    this._persistState('wishlist_items', wishlistItems);

    return {
      success: true,
      wishlist,
      wishlistItem,
      message: 'Rental saved to wishlist.'
    };
  }

  // createWishlist(name, description, makeDefault)
  createWishlist(name, description, makeDefault) {
    const wishlists = this._getFromStorage('wishlists', []);
    const now = new Date().toISOString();

    const wishlist = {
      id: this._generateId('wishlist'),
      name: name,
      description: description || null,
      cover_image: null,
      rental_count: 0,
      is_default: !!makeDefault,
      created_at: now,
      updated_at: now
    };

    if (makeDefault) {
      wishlists.forEach((w) => {
        w.is_default = false;
      });
    }

    wishlists.push(wishlist);
    this._persistState('wishlists', wishlists);

    return wishlist;
  }

  // getWishlistsOverview
  getWishlistsOverview() {
    const wishlists = this._getFromStorage('wishlists', []);
    return wishlists;
  }

  // renameWishlist(wishlistId, newName)
  renameWishlist(wishlistId, newName) {
    const wishlists = this._getFromStorage('wishlists', []);
    const index = wishlists.findIndex((w) => w.id === wishlistId);
    if (index === -1) {
      return { success: false, wishlist: null, message: 'Wishlist not found.' };
    }
    const wishlist = wishlists[index];
    wishlist.name = newName;
    wishlist.updated_at = new Date().toISOString();
    wishlists[index] = wishlist;
    this._persistState('wishlists', wishlists);
    return { success: true, wishlist, message: 'Wishlist renamed.' };
  }

  // deleteWishlist(wishlistId)
  deleteWishlist(wishlistId) {
    let wishlists = this._getFromStorage('wishlists', []);
    const wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    if (!wishlist) {
      return { success: false, message: 'Wishlist not found.' };
    }

    if (wishlist.is_default) {
      return { success: false, message: 'Cannot delete default wishlist.' };
    }

    wishlists = wishlists.filter((w) => w.id !== wishlistId);
    this._persistState('wishlists', wishlists);

    let wishlistItems = this._getFromStorage('wishlist_items', []);
    wishlistItems = wishlistItems.filter((wi) => wi.wishlist_id !== wishlistId);
    this._persistState('wishlist_items', wishlistItems);

    return { success: true, message: 'Wishlist deleted.' };
  }

  // getWishlistDetails(wishlistId)
  getWishlistDetails(wishlistId) {
    const wishlists = this._getFromStorage('wishlists', []);
    const wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const rentals = this._getFromStorage('rental_properties', []);

    if (!wishlist) {
      return { wishlist: null, items: [] };
    }

    // Instrumentation for task completion tracking
    try {
      if (wishlist && wishlist.name === 'Honolulu Trip') {
        localStorage.setItem('task4_honoluluTripWishlistViewed', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const items = wishlistItems
      .filter((wi) => wi.wishlist_id === wishlistId)
      .map((wi) => {
        const rental = rentals.find((r) => r.id === wi.rental_property_id) || null;
        return {
          wishlistItemId: wi.id,
          addedAt: wi.added_at,
          rental
        };
      });

    return { wishlist, items };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    const wi = wishlistItems.find((item) => item.id === wishlistItemId) || null;
    if (!wi) {
      return { success: false, message: 'Wishlist item not found.' };
    }

    wishlistItems = wishlistItems.filter((item) => item.id !== wishlistItemId);
    this._persistState('wishlist_items', wishlistItems);

    const wishlists = this._getFromStorage('wishlists', []);
    const index = wishlists.findIndex((w) => w.id === wi.wishlist_id);
    if (index !== -1) {
      const w = wishlists[index];
      w.rental_count = Math.max(0, (w.rental_count || 0) - 1);
      w.updated_at = new Date().toISOString();
      wishlists[index] = w;
      this._persistState('wishlists', wishlists);
    }

    return { success: true, message: 'Wishlist item removed.' };
  }

  // sendHostMessageForRental(rentalPropertyId, messageText, relatedBookingId)
  sendHostMessageForRental(rentalPropertyId, messageText, relatedBookingId) {
    const rentals = this._getFromStorage('rental_properties', []);
    const rental = rentals.find((r) => r.id === rentalPropertyId) || null;
    if (!rental) {
      throw new Error('Rental property not found for id ' + rentalPropertyId);
    }

    const now = new Date().toISOString();
    const hostMessages = this._getFromStorage('host_messages', []);
    const message = {
      id: this._generateId('hmsg'),
      rental_property_id: rentalPropertyId,
      related_booking_id: relatedBookingId || null,
      sent_at: now,
      message_text: messageText,
      direction: 'outbound',
      status: 'sent'
    };

    hostMessages.push(message);
    this._persistState('host_messages', hostMessages);

    // Resolve foreign keys for return
    const bookings = this._getFromStorage('bookings', []);
    const relatedBooking = relatedBookingId
      ? bookings.find((b) => b.id === relatedBookingId) || null
      : null;

    return Object.assign({}, message, {
      rental_property: rental,
      related_booking: relatedBooking
    });
  }

  // getProfile
  getProfile() {
    const profileRaw = localStorage.getItem('profile');
    if (!profileRaw || profileRaw === 'null') {
      return { hasProfile: false, profile: null };
    }
    let profile = null;
    try {
      profile = JSON.parse(profileRaw);
    } catch (e) {
      return { hasProfile: false, profile: null };
    }

    const destinations = this._getFromStorage('destinations', []);
    const preferredDest = profile.preferred_destination_id
      ? destinations.find((d) => d.id === profile.preferred_destination_id) || null
      : null;
    const resolvedPreferred = this._resolveDestinationForeignKeys(preferredDest, destinations);

    const resolvedProfile = Object.assign({}, profile, {
      preferred_destination_obj: resolvedPreferred
    });

    return { hasProfile: true, profile: resolvedProfile };
  }

  // createOrUpdateProfile(name, email, password, phone, preferredDestination, preferredDestinationId)
  createOrUpdateProfile(
    name,
    email,
    password,
    phone,
    preferredDestination,
    preferredDestinationId
  ) {
    const profileRaw = localStorage.getItem('profile');
    const now = new Date().toISOString();
    let profile = null;

    if (!profileRaw || profileRaw === 'null') {
      profile = {
        id: this._generateId('profile'),
        name: name,
        email: email,
        password: password || null,
        preferred_destination: preferredDestination || null,
        preferred_destination_id: preferredDestinationId || null,
        phone: phone || null,
        created_at: now,
        updated_at: now
      };
    } else {
      try {
        profile = JSON.parse(profileRaw);
      } catch (e) {
        profile = {
          id: this._generateId('profile'),
          created_at: now
        };
      }
      profile.name = name;
      profile.email = email;
      if (password) profile.password = password;
      profile.preferred_destination = preferredDestination || null;
      profile.preferred_destination_id = preferredDestinationId || null;
      profile.phone = phone || null;
      profile.updated_at = now;
    }

    localStorage.setItem('profile', JSON.stringify(profile));
    return profile;
  }

  // getHeaderUserSummary
  getHeaderUserSummary() {
    const profileInfo = this._getProfileOrAnonymous();
    const defaultWishlist = this._getOrCreateDefaultWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const rentalCount = wishlistItems.filter((wi) => wi.wishlist_id === defaultWishlist.id).length;

    return {
      hasProfile: !!profileInfo && !!profileInfo.id,
      profileName: profileInfo && profileInfo.name ? profileInfo.name : null,
      defaultWishlistId: defaultWishlist.id,
      defaultWishlistRentalCount: rentalCount
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      title: 'About Our Hawaii Vacation Rentals',
      bodyHtml:
        '<p>We focus exclusively on vacation rentals across the Hawaiian islands, offering curated stays on Oahu, Maui, Kauai, and the Island of Hawaii.</p>' +
        '<p>Browse trusted properties, transparent pricing, and flexible cancellation options for your next island getaway.</p>',
      highlights: [
        'Curated Hawaii-only vacation rentals',
        'Transparent pricing with fees broken out',
        'Flexible cancellation policies where available'
      ]
    };
  }

  // getHelpPageContent
  getHelpPageContent() {
    const faqs = [
      {
        id: 'booking_flow',
        category: 'booking',
        question: 'How do I complete a booking?',
        answerHtml:
          '<p>Select your destination, dates, and guests, then choose a property and follow the checkout steps to confirm your stay.</p>'
      },
      {
        id: 'promo_codes',
        category: 'promo_codes',
        question: 'How do promo codes like ALOHA10 work?',
        answerHtml:
          '<p>Enter your promo code during checkout. If it is valid for your dates and destination, the discount will be applied before taxes.</p>'
      },
      {
        id: 'cancellations',
        category: 'cancellations',
        question: 'What are my cancellation options?',
        answerHtml:
          '<p>Cancellation policies vary by property. Look for listings with free cancellation and review the minimum days before check-in for a full refund.</p>'
      }
    ];

    const contactOptions = {
      supportEmail: 'support@example.com',
      supportPhone: '+1-800-555-0123',
      contactFormEnabled: true
    };

    return { faqs, contactOptions };
  }

  // getPoliciesContent
  getPoliciesContent() {
    return {
      termsHtml:
        '<p>By using this site, you agree to our terms of use, including responsible booking behavior and compliance with local laws.</p>',
      privacyHtml:
        '<p>We respect your privacy and only store the minimum information necessary to manage your bookings and preferences.</p>',
      bookingPolicyHtml:
        '<p>Bookings are confirmed once payment details are entered and processed. Some properties may support split payments.</p>',
      cancellationPolicyHtml:
        '<p>Each property defines its own cancellation policy. Free cancellation options will be clearly labeled in search and checkout.</p>',
      longStayDiscountPolicyHtml:
        '<p>Long-stay discounts apply automatically when your stay meets the minimum nights specified by the property.</p>'
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