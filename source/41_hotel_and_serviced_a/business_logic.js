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

  // ---------------------- Storage & ID Helpers ----------------------

  _initStorage() {
    const keys = [
      'destinations',
      'neighborhoods',
      'properties',
      'room_types',
      'rate_plans',
      'search_criteria',
      'wishlists',
      'bookings',
      'booking_rooms',
      'booking_guests',
      'promo_codes',
      'booking_payments',
      'map_view_states',
      // extra for contact requests, recent utility
      'contact_requests',
      'currentSearchCriteriaId',
      'currentWishlistId',
      'currentBookingId',
      'currentMapViewStateId'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // For ID references keys we store null string, for lists we store []
        if (
          key === 'currentSearchCriteriaId' ||
          key === 'currentWishlistId' ||
          key === 'currentBookingId' ||
          key === 'currentMapViewStateId'
        ) {
          localStorage.setItem(key, '');
        } else if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  _calculateNights(checkInStr, checkOutStr) {
    if (!checkInStr || !checkOutStr) return 0;
    const inD = new Date(checkInStr);
    const outD = new Date(checkOutStr);
    const ms = outD.getTime() - inD.getTime();
    if (!isFinite(ms) || ms <= 0) return 0;
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  // ---------------------- Entity Loaders ----------------------

  _getDestinations() {
    return this._getFromStorage('destinations');
  }

  _getNeighborhoods() {
    return this._getFromStorage('neighborhoods');
  }

  _getProperties() {
    return this._getFromStorage('properties');
  }

  _getRoomTypes() {
    return this._getFromStorage('room_types');
  }

  _getRatePlans() {
    return this._getFromStorage('rate_plans');
  }

  _getSearchCriteriaList() {
    return this._getFromStorage('search_criteria');
  }

  _saveSearchCriteriaList(list) {
    this._saveToStorage('search_criteria', list);
  }

  _getWishlists() {
    return this._getFromStorage('wishlists');
  }

  _saveWishlists(list) {
    this._saveToStorage('wishlists', list);
  }

  _getBookings() {
    return this._getFromStorage('bookings');
  }

  _saveBookings(list) {
    this._saveToStorage('bookings', list);
  }

  _getBookingRooms() {
    return this._getFromStorage('booking_rooms');
  }

  _saveBookingRooms(list) {
    this._saveToStorage('booking_rooms', list);
  }

  _getBookingGuests() {
    return this._getFromStorage('booking_guests');
  }

  _saveBookingGuests(list) {
    this._saveToStorage('booking_guests', list);
  }

  _getPromoCodes() {
    return this._getFromStorage('promo_codes');
  }

  _getBookingPayments() {
    return this._getFromStorage('booking_payments');
  }

  _saveBookingPayments(list) {
    this._saveToStorage('booking_payments', list);
  }

  _getMapViewStates() {
    return this._getFromStorage('map_view_states');
  }

  _saveMapViewStates(list) {
    this._saveToStorage('map_view_states', list);
  }

  // ---------------------- Hydration Helpers (FK resolution) ----------------------

  _hydrateDestination(destination) {
    if (!destination) return null;
    // Destination has no foreign keys
    return { ...destination };
  }

  _hydrateNeighborhood(neighborhood, destinations) {
    if (!neighborhood) return null;
    const dest = destinations.find((d) => d.id === neighborhood.destinationId) || null;
    return { ...neighborhood, destination: this._hydrateDestination(dest) };
  }

  _hydrateProperty(property, destinations, neighborhoods) {
    if (!property) return null;
    const dest = destinations.find((d) => d.id === property.destinationId) || null;
    const nbh = property.neighborhoodId
      ? neighborhoods.find((n) => n.id === property.neighborhoodId) || null
      : null;
    const hydratedNeighborhood = nbh
      ? this._hydrateNeighborhood(nbh, destinations)
      : null;
    return {
      ...property,
      destination: this._hydrateDestination(dest),
      neighborhood: hydratedNeighborhood
    };
  }

  _hydrateRoomType(roomType, properties, destinations, neighborhoods) {
    if (!roomType) return null;
    const property = properties.find((p) => p.id === roomType.propertyId) || null;
    const hydratedProperty = this._hydrateProperty(
      property,
      destinations,
      neighborhoods
    );
    return { ...roomType, property: hydratedProperty };
  }

  _hydrateRatePlan(ratePlan, properties, roomTypes, destinations, neighborhoods) {
    if (!ratePlan) return null;
    const property = properties.find((p) => p.id === ratePlan.propertyId) || null;
    const roomType = roomTypes.find((r) => r.id === ratePlan.roomTypeId) || null;
    const hydratedProperty = this._hydrateProperty(
      property,
      destinations,
      neighborhoods
    );
    const hydratedRoomType = roomType
      ? this._hydrateRoomType(roomType, properties, destinations, neighborhoods)
      : null;
    return {
      ...ratePlan,
      property: hydratedProperty,
      roomType: hydratedRoomType
    };
  }

  _hydrateSearchCriteria(criteria, destinations) {
    if (!criteria) return null;
    const dest = criteria.destinationId
      ? destinations.find((d) => d.id === criteria.destinationId) || null
      : null;
    return { ...criteria, destination: this._hydrateDestination(dest) };
  }

  _hydrateBooking(booking, properties, destinations, neighborhoods, promoCodes) {
    if (!booking) return null;
    const property = properties.find((p) => p.id === booking.propertyId) || null;
    const promo = booking.promoCode
      ? promoCodes.find((pc) => pc.code === booking.promoCode) || null
      : null;
    const hydratedProperty = this._hydrateProperty(
      property,
      destinations,
      neighborhoods
    );
    return {
      ...booking,
      property: hydratedProperty,
      promoCodeDetails: promo ? { ...promo } : null
    };
  }

  _hydrateBookingRoom(
    bookingRoom,
    bookings,
    roomTypes,
    ratePlans,
    properties,
    destinations,
    neighborhoods,
    promoCodes
  ) {
    if (!bookingRoom) return null;
    const booking = bookings.find((b) => b.id === bookingRoom.bookingId) || null;
    const roomType = roomTypes.find((r) => r.id === bookingRoom.roomTypeId) || null;
    const ratePlan = ratePlans.find((r) => r.id === bookingRoom.ratePlanId) || null;
    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );
    const hydratedRoomType = this._hydrateRoomType(
      roomType,
      properties,
      destinations,
      neighborhoods
    );
    const hydratedRatePlan = this._hydrateRatePlan(
      ratePlan,
      properties,
      roomTypes,
      destinations,
      neighborhoods
    );
    return {
      ...bookingRoom,
      booking: hydratedBooking,
      roomType: hydratedRoomType,
      ratePlan: hydratedRatePlan
    };
  }

  _hydrateBookingGuest(
    bookingGuest,
    bookings,
    bookingRooms,
    roomTypes,
    ratePlans,
    properties,
    destinations,
    neighborhoods,
    promoCodes
  ) {
    if (!bookingGuest) return null;
    const booking = bookings.find((b) => b.id === bookingGuest.bookingId) || null;
    const bookingRoom = bookingRooms.find((br) => br.id === bookingGuest.bookingRoomId) || null;
    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );
    const hydratedBookingRoom = bookingRoom
      ? this._hydrateBookingRoom(
          bookingRoom,
          bookings,
          roomTypes,
          ratePlans,
          properties,
          destinations,
          neighborhoods,
          promoCodes
        )
      : null;
    return {
      ...bookingGuest,
      booking: hydratedBooking,
      bookingRoom: hydratedBookingRoom
    };
  }

  _hydrateBookingPayment(
    bookingPayment,
    bookings,
    properties,
    destinations,
    neighborhoods,
    promoCodes
  ) {
    if (!bookingPayment) return null;
    const booking = bookings.find((b) => b.id === bookingPayment.bookingId) || null;
    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );
    return { ...bookingPayment, booking: hydratedBooking };
  }

  _hydrateMapViewState(mapViewState, searchCriteriaList, destinations, properties, neighborhoods) {
    if (!mapViewState) return null;
    const sc = mapViewState.lastSearchCriteriaId
      ? searchCriteriaList.find((s) => s.id === mapViewState.lastSearchCriteriaId) || null
      : null;
    const hydratedSearchCriteria = this._hydrateSearchCriteria(sc, destinations);
    const selectedProperty = mapViewState.selectedPropertyId
      ? this._hydrateProperty(
          properties.find((p) => p.id === mapViewState.selectedPropertyId) || null,
          destinations,
          neighborhoods
        )
      : null;
    return {
      ...mapViewState,
      lastSearchCriteria: hydratedSearchCriteria,
      selectedProperty
    };
  }

  // ---------------------- SearchCriteria Helpers ----------------------

  _getOrCreateCurrentSearchCriteria() {
    const destinations = this._getDestinations();
    let list = this._getSearchCriteriaList();
    let currentId = localStorage.getItem('currentSearchCriteriaId') || '';
    let current = currentId ? list.find((s) => s.id === currentId) || null : null;

    if (!current) {
      const id = this._generateId('search');
      const now = this._nowISO();
      current = {
        id,
        destinationId: null,
        destinationQuery: '',
        checkInDate: now,
        checkOutDate: now,
        nights: 0,
        adults: 2,
        children: 0,
        rooms: 1,
        propertyTypes: null,
        starRatingMin: null,
        guestRatingMin: null,
        priceMaxPerNight: null,
        neighborhoodIds: null,
        requireFreeCancellation: false,
        paymentOptionFilter: 'any',
        requireFreeWifi: false,
        requireBreakfastIncluded: false,
        requireKitchen: false,
        requireSwimmingPool: false,
        requireKidsFacilities: false,
        requireInUnitLaundry: false,
        requirePetFriendly: false,
        requireParking: false,
        requireNonSmoking: false,
        requireWorkspaceDesk: false,
        sortOption: 'price_low_to_high',
        viewMode: 'list',
        createdAt: now,
        updatedAt: now
      };
      list.push(current);
      this._saveSearchCriteriaList(list);
      localStorage.setItem('currentSearchCriteriaId', current.id);
    }

    return this._hydrateSearchCriteria(current, destinations);
  }

  _updateSearchResultsForCriteria(searchCriteria) {
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const properties = this._getProperties();
    const ratePlans = this._getRatePlans();
    const wishlists = this._getWishlists();

    const wishlist = wishlists[0] || null;
    const wishlistIds = wishlist ? wishlist.propertyIds || [] : [];

    const nights = searchCriteria.nights || this._calculateNights(
      searchCriteria.checkInDate,
      searchCriteria.checkOutDate
    );

    const filteredProps = properties.filter((prop) => {
      if (searchCriteria.destinationId && prop.destinationId !== searchCriteria.destinationId) {
        return false;
      }

      if (searchCriteria.propertyTypes && searchCriteria.propertyTypes.length) {
        if (!searchCriteria.propertyTypes.includes(prop.propertyType)) return false;
      }

      if (
        typeof searchCriteria.starRatingMin === 'number' &&
        prop.starRating != null &&
        prop.starRating < searchCriteria.starRatingMin
      ) {
        return false;
      }

      if (
        typeof searchCriteria.guestRatingMin === 'number' &&
        prop.guestRating != null &&
        prop.guestRating < searchCriteria.guestRatingMin
      ) {
        return false;
      }

      if (searchCriteria.neighborhoodIds && searchCriteria.neighborhoodIds.length) {
        if (!searchCriteria.neighborhoodIds.includes(prop.neighborhoodId)) return false;
      }

      // Amenity filters on property-level flags
      if (searchCriteria.requireFreeWifi && !prop.hasFreeWifi) return false;
      if (searchCriteria.requireBreakfastIncluded && !prop.hasBreakfastIncluded) return false;
      if (searchCriteria.requireKitchen && !prop.hasKitchen) return false;
      if (
        searchCriteria.requireSwimmingPool &&
        !prop.hasSwimmingPool &&
        !prop.isFamilyFriendly
      )
        return false;
      if (searchCriteria.requireKidsFacilities && !(prop.hasKidsClub || prop.isFamilyFriendly)) {
        return false;
      }
      if (searchCriteria.requireInUnitLaundry && !prop.hasInUnitLaundry) return false;
      if (searchCriteria.requirePetFriendly && !prop.isPetFriendly) return false;
      if (searchCriteria.requireParking && !prop.hasParking) return false;
      if (searchCriteria.requireNonSmoking && !prop.hasNonSmokingRooms) return false;
      if (searchCriteria.requireWorkspaceDesk && !prop.hasWorkspaceDesk) return false;

      // Rate plan based filters & pricing
      const pricing = this._getPropertyPricingForCriteria(searchCriteria, prop, ratePlans, nights);
      if (!pricing) return false; // no applicable rate

      if (
        typeof searchCriteria.priceMaxPerNight === 'number' &&
        pricing.pricePerNight > searchCriteria.priceMaxPerNight
      ) {
        return false;
      }

      return true;
    });

    // Build result entries with pricing
    let results = filteredProps.map((prop) => {
      const pricing = this._getPropertyPricingForCriteria(
        searchCriteria,
        prop,
        ratePlans,
        nights
      );
      const anyFreeCancellation = this._propertyHasFreeCancellation(prop.id, ratePlans);
      const primaryPaymentOption = pricing ? pricing.paymentOptionType : prop.defaultPaymentOptionType;
      const highlights = [];
      if (prop.hasFreeWifi) highlights.push('Free WiFi');
      if (prop.hasBreakfastIncluded) highlights.push('Breakfast included');
      if (anyFreeCancellation) highlights.push('Free cancellation');
      if (primaryPaymentOption === 'pay_at_property') highlights.push('Pay at property');
      if (primaryPaymentOption === 'reserve_now_pay_later') highlights.push('Reserve now, pay later');

      const hydratedProp = this._hydrateProperty(prop, destinations, neighborhoods);

      return {
        property: hydratedProp,
        totalPriceForStay: pricing ? pricing.totalPriceForStay : null,
        pricePerNight: pricing ? pricing.pricePerNight : null,
        currency: pricing ? pricing.currency : prop.currency || (pricing && pricing.currency) || 'USD',
        nights: nights,
        freeCancellation: anyFreeCancellation,
        paymentOptionType: primaryPaymentOption || 'pay_now',
        highlights,
        isInWishlist: wishlistIds.includes(prop.id)
      };
    });

    // Sorting
    const sortOption = searchCriteria.sortOption || 'price_low_to_high';
    results = this._sortSearchResults(results, sortOption);

    // Filter options computation (based on destination properties)
    const filterOptions = this._buildFilterOptionsForDestination(
      searchCriteria.destinationId,
      properties,
      ratePlans,
      destinations,
      neighborhoods
    );

    const availableSortOptions = [
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_high_to_low', label: 'Price: High to Low' },
      { code: 'guest_rating_high_to_low', label: 'Guest rating: High to Low' },
      {
        code: 'distance_from_city_center_closest_first',
        label: 'Distance from city center: Closest first'
      }
    ];

    const hydratedCriteria = this._hydrateSearchCriteria(searchCriteria, destinations);

    return {
      searchCriteria: hydratedCriteria,
      results: {
        properties: results,
        availableSortOptions,
        filterOptions
      }
    };
  }

  _sortSearchResults(results, sortOption) {
    const arr = [...results];
    if (sortOption === 'price_low_to_high') {
      arr.sort((a, b) => {
        if (a.pricePerNight == null) return 1;
        if (b.pricePerNight == null) return -1;
        return a.pricePerNight - b.pricePerNight;
      });
    } else if (sortOption === 'price_high_to_low') {
      arr.sort((a, b) => {
        if (a.pricePerNight == null) return 1;
        if (b.pricePerNight == null) return -1;
        return b.pricePerNight - a.pricePerNight;
      });
    } else if (sortOption === 'guest_rating_high_to_low') {
      arr.sort((a, b) => {
        const ga = a.property.guestRating || 0;
        const gb = b.property.guestRating || 0;
        return gb - ga;
      });
    } else if (sortOption === 'distance_from_city_center_closest_first') {
      arr.sort((a, b) => {
        const da = a.property.distanceFromCityCenterKm;
        const db = b.property.distanceFromCityCenterKm;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }
    return arr;
  }

  _buildFilterOptionsForDestination(
    destinationId,
    properties,
    ratePlans,
    destinations,
    neighborhoods
  ) {
    const destProps = destinationId
      ? properties.filter((p) => p.destinationId === destinationId)
      : properties;

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    let minStar = null;
    let maxStar = null;
    let minGuestRating = null;
    let maxGuestRating = null;

    const nights = 1; // generic for range only

    destProps.forEach((prop) => {
      const planPrice = this._getPropertyPricingForCriteria(
        {
          requireFreeCancellation: false,
          paymentOptionFilter: 'any'
        },
        prop,
        ratePlans,
        nights
      );
      const nightly = planPrice ? planPrice.pricePerNight : prop.lowestPricePerNight;
      if (nightly != null) {
        if (minPrice == null || nightly < minPrice) minPrice = nightly;
        if (maxPrice == null || nightly > maxPrice) maxPrice = nightly;
        currency = planPrice ? planPrice.currency : prop.currency || currency;
      }
      if (prop.starRating != null) {
        if (minStar == null || prop.starRating < minStar) minStar = prop.starRating;
        if (maxStar == null || prop.starRating > maxStar) maxStar = prop.starRating;
      }
      if (prop.guestRating != null) {
        if (minGuestRating == null || prop.guestRating < minGuestRating) {
          minGuestRating = prop.guestRating;
        }
        if (maxGuestRating == null || prop.guestRating > maxGuestRating) {
          maxGuestRating = prop.guestRating;
        }
      }
    });

    const propertyTypeOptions = [
      { code: 'hotel', label: 'Hotel' },
      { code: 'serviced_apartment', label: 'Serviced apartment' }
    ];

    const amenityOptions = [
      { code: 'free_wifi', label: 'Free WiFi' },
      { code: 'breakfast_included', label: 'Breakfast included' },
      { code: 'kitchen', label: 'Kitchen' },
      { code: 'swimming_pool', label: 'Swimming pool' },
      { code: 'kids_facilities', label: 'Family / kids facilities' },
      { code: 'parking', label: 'Parking' },
      { code: 'pet_friendly', label: 'Pet-friendly' },
      { code: 'in_unit_laundry', label: 'In-unit laundry' },
      { code: 'workspace_desk', label: 'Workspace / desk' },
      { code: 'non_smoking', label: 'Non-smoking rooms' }
    ];

    const cancellationOptions = [
      { code: 'free_cancellation', label: 'Free cancellation' }
    ];

    const paymentOptions = [
      { code: 'any', label: 'Any payment option' },
      { code: 'pay_now', label: 'Pay now' },
      { code: 'pay_at_property', label: 'Pay at property' },
      { code: 'reserve_now_pay_later', label: 'Reserve now, pay later' }
    ];

    const nbhList = destinationId
      ? neighborhoods.filter((n) => n.destinationId === destinationId)
      : neighborhoods;
    const hydratedNeighborhoods = nbhList.map((n) => ({
      neighborhood: this._hydrateNeighborhood(n, destinations),
      isCityCenter: !!n.isCityCenter
    }));

    return {
      price: {
        min: minPrice,
        max: maxPrice,
        currency
      },
      starRating: {
        minAvailable: minStar,
        maxAvailable: maxStar
      },
      guestRating: {
        minAvailable: minGuestRating,
        maxAvailable: maxGuestRating
      },
      propertyTypeOptions,
      amenityOptions,
      cancellationOptions,
      paymentOptions,
      neighborhoods: hydratedNeighborhoods
    };
  }

  _getPropertyPricingForCriteria(criteria, property, ratePlans, nights) {
    const plans = ratePlans.filter(
      (rp) => rp.propertyId === property.id && rp.available
    );
    if (!plans.length) {
      const nightly = property.lowestPricePerNight != null ? property.lowestPricePerNight : null;
      const n = nights || 1;
      return {
        pricePerNight: nightly,
        totalPriceForStay: nightly != null ? nightly * n : null,
        currency: property.currency || 'USD',
        paymentOptionType: property.defaultPaymentOptionType || 'pay_now'
      };
    }

    let filtered = plans;

    if (criteria && criteria.requireFreeCancellation) {
      filtered = filtered.filter((rp) => rp.cancellationType === 'free_cancellation');
    }

    if (criteria && criteria.paymentOptionFilter && criteria.paymentOptionFilter !== 'any') {
      filtered = filtered.filter(
        (rp) => rp.paymentOptionType === criteria.paymentOptionFilter
      );
    }

    if (!filtered.length) return null;

    let cheapest = null;
    filtered.forEach((rp) => {
      if (cheapest == null || rp.pricePerNight < cheapest.pricePerNight) {
        cheapest = rp;
      }
    });

    if (!cheapest) return null;

    const n = nights || 1;

    return {
      pricePerNight: cheapest.pricePerNight,
      totalPriceForStay: cheapest.pricePerNight * n,
      currency: cheapest.currency || property.currency || 'USD',
      paymentOptionType: cheapest.paymentOptionType
    };
  }

  _propertyHasFreeCancellation(propertyId, ratePlans) {
    return ratePlans.some(
      (rp) => rp.propertyId === propertyId && rp.available && rp.cancellationType === 'free_cancellation'
    );
  }

  // ---------------------- Wishlist Helpers ----------------------

  _getOrCreateWishlist() {
    let wishlists = this._getWishlists();
    let currentId = localStorage.getItem('currentWishlistId') || '';
    let wishlist = currentId ? wishlists.find((w) => w.id === currentId) || null : null;

    if (!wishlist) {
      const id = this._generateId('wishlist');
      const now = this._nowISO();
      wishlist = {
        id,
        propertyIds: [],
        createdAt: now,
        updatedAt: now
      };
      wishlists.push(wishlist);
      this._saveWishlists(wishlists);
      localStorage.setItem('currentWishlistId', wishlist.id);
    }

    return wishlist;
  }

  // ---------------------- Booking Helpers ----------------------

  _getOrCreateCurrentBooking() {
    const bookings = this._getBookings();
    let currentId = localStorage.getItem('currentBookingId') || '';
    let booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;

    if (!booking) {
      const id = this._generateId('booking');
      const now = this._nowISO();
      booking = {
        id,
        propertyId: null,
        checkInDate: now,
        checkOutDate: now,
        nights: 0,
        adults: 0,
        children: 0,
        rooms: 0,
        status: 'in_progress',
        totalPricePreDiscount: 0,
        totalPricePostDiscount: 0,
        currency: 'USD',
        freeCancellation: false,
        payAtProperty: false,
        paymentOptionType: 'pay_now',
        promoCode: null,
        promoDiscountAmount: 0,
        guestPrimaryFullName: null,
        contactEmail: null,
        contactPhone: null,
        arrivalTimeNote: null,
        specialRequests: null,
        createdAt: now,
        updatedAt: now
      };
      bookings.push(booking);
      this._saveBookings(bookings);
      localStorage.setItem('currentBookingId', booking.id);
    }

    return booking;
  }

  _getCurrentBookingOrNull() {
    const bookings = this._getBookings();
    const currentId = localStorage.getItem('currentBookingId') || '';
    if (!currentId) return null;
    return bookings.find((b) => b.id === currentId) || null;
  }

  _clearCurrentBookingAssociations(bookingId) {
    if (!bookingId) return;
    const bookingRooms = this._getBookingRooms().filter(
      (br) => br.bookingId !== bookingId
    );
    const bookingGuests = this._getBookingGuests().filter(
      (bg) => bg.bookingId !== bookingId
    );
    const bookingPayments = this._getBookingPayments().filter(
      (bp) => bp.bookingId !== bookingId
    );
    this._saveBookingRooms(bookingRooms);
    this._saveBookingGuests(bookingGuests);
    this._saveBookingPayments(bookingPayments);
  }

  _recalculateBookingTotals(bookingId) {
    const bookings = this._getBookings();
    const bookingRooms = this._getBookingRooms();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    const roomsForBooking = bookingRooms.filter((br) => br.bookingId === bookingId);
    const totalPre = roomsForBooking.reduce(
      (sum, br) => sum + (br.roomTotalPrice || 0),
      0
    );
    const discount = booking.promoDiscountAmount || 0;
    booking.totalPricePreDiscount = totalPre;
    booking.totalPricePostDiscount = Math.max(0, totalPre - discount);
    booking.updatedAt = this._nowISO();

    this._saveBookings(bookings);
    return booking;
  }

  _validateRoomCapacityForSearch(searchCriteria, roomsParam) {
    const roomTypes = this._getRoomTypes();
    let totalCapacity = 0;
    const totalGuests = (searchCriteria.adults || 0) + (searchCriteria.children || 0);

    roomsParam.forEach((sel) => {
      const rt = roomTypes.find((r) => r.id === sel.roomTypeId) || null;
      const quantity = sel.quantity || 0;
      if (!rt) {
        return;
      }
      const maxTotal = rt.maxOccupancyTotal || rt.maxOccupancyAdults || totalGuests;
      totalCapacity += maxTotal * quantity;
    });

    const errors = [];
    if (totalCapacity < totalGuests) {
      errors.push({
        code: 'capacity_exceeded',
        message: 'Selected rooms cannot accommodate all guests.'
      });
    }

    return {
      ok: errors.length === 0,
      errors
    };
  }

  _distributeGuestsAcrossRooms(adults, children, roomsCount) {
    const distribution = [];
    let adultsLeft = adults;
    let childrenLeft = children;
    for (let i = 0; i < roomsCount; i++) {
      const roomsRemaining = roomsCount - i;
      const ad = Math.floor(adultsLeft / roomsRemaining);
      const ch = Math.floor(childrenLeft / roomsRemaining);
      distribution.push({ adults: ad, children: ch });
      adultsLeft -= ad;
      childrenLeft -= ch;
    }
    // Assign any remaining guests one by one
    let idx = 0;
    while (adultsLeft > 0) {
      distribution[idx % roomsCount].adults += 1;
      adultsLeft--;
      idx++;
    }
    idx = 0;
    while (childrenLeft > 0) {
      distribution[idx % roomsCount].children += 1;
      childrenLeft--;
      idx++;
    }
    return distribution;
  }

  // ---------------------- Map Helpers ----------------------

  _getOrCreateMapViewState() {
    const mapStates = this._getMapViewStates();
    const criteria = this._getOrCreateCurrentSearchCriteria();
    let currentId = localStorage.getItem('currentMapViewStateId') || '';
    let state = currentId ? mapStates.find((m) => m.id === currentId) || null : null;

    if (!state) {
      const id = this._generateId('map');
      const now = this._nowISO();
      let centerLat = null;
      let centerLng = null;
      if (criteria && criteria.destination && criteria.destination.centerLat != null) {
        centerLat = criteria.destination.centerLat;
        centerLng = criteria.destination.centerLng;
      }
      state = {
        id,
        lastSearchCriteriaId: criteria ? criteria.id : null,
        centerLat,
        centerLng,
        zoomLevel: 12,
        selectedPropertyId: null,
        isMapOpen: false,
        lastUpdated: now
      };
      mapStates.push(state);
      this._saveMapViewStates(mapStates);
      localStorage.setItem('currentMapViewStateId', state.id);
    }

    return state;
  }

  // ---------------------- Public Interface Implementations ----------------------

  // 1. getHomePageContent()
  getHomePageContent() {
    const destinations = this._getDestinations();
    const searchCriteriaList = this._getSearchCriteriaList();
    const wishlists = this._getWishlists();
    const properties = this._getProperties();
    const neighborhoods = this._getNeighborhoods();
    const ratePlans = this._getRatePlans();

    const quickDateShortcuts = [
      { code: 'tonight', label: 'Tonight', checkInOffsetDays: 0, nights: 1 },
      { code: 'this_weekend', label: 'This weekend', checkInOffsetDays: 5, nights: 2 },
      { code: 'next_week', label: 'Next week', checkInOffsetDays: 7, nights: 3 }
    ];

    const popularDestinations = destinations.slice(0, 10).map((d) => this._hydrateDestination(d));

    const recentSearches = searchCriteriaList
      .slice()
      .sort((a, b) => {
        const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return db - da;
      })
      .slice(0, 5)
      .map((s) => {
        const dest = destinations.find((d) => d.id === s.destinationId) || null;
        return {
          destinationName: dest ? dest.name : s.destinationQuery || '',
          destinationFullName: dest ? dest.fullName : s.destinationQuery || '',
          checkInDate: s.checkInDate ? String(s.checkInDate).slice(0, 10) : '',
          checkOutDate: s.checkOutDate ? String(s.checkOutDate).slice(0, 10) : '',
          adults: s.adults,
          children: s.children,
          rooms: s.rooms
        };
      });

    const wishlist = wishlists[0] || null;
    let wishlistSummary;
    if (!wishlist) {
      wishlistSummary = {
        count: 0,
        topProperties: []
      };
    } else {
      const ids = wishlist.propertyIds || [];
      const topProps = ids
        .map((id) => properties.find((p) => p.id === id) || null)
        .filter(Boolean)
        .slice(0, 5)
        .map((prop) => {
          const pricing = this._getPropertyPricingForCriteria(
            { requireFreeCancellation: false, paymentOptionFilter: 'any' },
            prop,
            ratePlans,
            1
          );
          const hydrated = this._hydrateProperty(prop, destinations, neighborhoods);
          return {
            property: hydrated,
            lowestPricePerNight: pricing
              ? pricing.pricePerNight
              : prop.lowestPricePerNight || null,
            currency: pricing ? pricing.currency : prop.currency || 'USD'
          };
        });
      wishlistSummary = {
        count: ids.length,
        topProperties: topProps
      };
    }

    return {
      quickDateShortcuts,
      popularDestinations,
      recentSearches,
      wishlistSummary
    };
  }

  // 2. getDestinationSuggestions(query, limit)
  getDestinationSuggestions(query, limit) {
    const q = (query || '').trim().toLowerCase();
    const lim = typeof limit === 'number' ? limit : 10;
    const destinations = this._getDestinations();
    const filtered = !q
      ? destinations
      : destinations.filter((d) => {
          return (
            (d.name && d.name.toLowerCase().includes(q)) ||
            (d.fullName && d.fullName.toLowerCase().includes(q)) ||
            (d.country && d.country.toLowerCase().includes(q))
          );
        });
    return filtered
      .slice(0, lim)
      .map((d) => this._hydrateDestination(d));
  }

  // 3. startSearchFromHome(destinationId, checkInDate, checkOutDate, adults, children, rooms, propertyTypes)
  startSearchFromHome(
    destinationId,
    checkInDate,
    checkOutDate,
    adults,
    children,
    rooms,
    propertyTypes
  ) {
    const destinations = this._getDestinations();
    const list = this._getSearchCriteriaList();
    const dest = destinations.find((d) => d.id === destinationId) || null;

    const checkInIso = checkInDate;
    const checkOutIso = checkOutDate;
    const nights = this._calculateNights(checkInIso, checkOutIso);
    const now = this._nowISO();

    const criteria = {
      id: this._generateId('search'),
      destinationId: dest ? dest.id : null,
      destinationQuery: dest ? dest.fullName : '',
      checkInDate: checkInIso,
      checkOutDate: checkOutIso,
      nights: nights,
      adults: adults,
      children: children,
      rooms: rooms,
      propertyTypes: propertyTypes && propertyTypes.length ? propertyTypes.slice() : null,
      starRatingMin: null,
      guestRatingMin: null,
      priceMaxPerNight: null,
      neighborhoodIds: null,
      requireFreeCancellation: false,
      paymentOptionFilter: 'any',
      requireFreeWifi: false,
      requireBreakfastIncluded: false,
      requireKitchen: false,
      requireSwimmingPool: false,
      requireKidsFacilities: false,
      requireInUnitLaundry: false,
      requirePetFriendly: false,
      requireParking: false,
      requireNonSmoking: false,
      requireWorkspaceDesk: false,
      sortOption: 'price_low_to_high',
      viewMode: 'list',
      createdAt: now,
      updatedAt: now
    };

    list.push(criteria);
    this._saveSearchCriteriaList(list);
    localStorage.setItem('currentSearchCriteriaId', criteria.id);

    // Instrumentation for task completion tracking
    try {
      if (localStorage.getItem('task8_initialSearchCriteria') === null) {
        const instrumentationValue = {
          destinationId: criteria.destinationId,
          destinationQuery: criteria.destinationQuery,
          checkInDate: criteria.checkInDate,
          checkOutDate: criteria.checkOutDate,
          adults: criteria.adults,
          children: criteria.children,
          rooms: criteria.rooms,
          createdAt: criteria.createdAt
        };
        localStorage.setItem(
          'task8_initialSearchCriteria',
          JSON.stringify(instrumentationValue)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return this._updateSearchResultsForCriteria(criteria);
  }

  // 4. getCurrentSearchResults()
  getCurrentSearchResults() {
    const criteria = this._getOrCreateCurrentSearchCriteria();
    return this._updateSearchResultsForCriteria(criteria);
  }

  // 5. updateCurrentSearchDatesAndGuests(checkInDate, checkOutDate, adults, children, rooms)
  updateCurrentSearchDatesAndGuests(
    checkInDate,
    checkOutDate,
    adults,
    children,
    rooms
  ) {
    const destinations = this._getDestinations();
    const list = this._getSearchCriteriaList();
    const currentId = localStorage.getItem('currentSearchCriteriaId') || '';
    let criteria = currentId ? list.find((s) => s.id === currentId) || null : null;

    const previousSnapshot = criteria
      ? {
          checkInDate: criteria.checkInDate,
          checkOutDate: criteria.checkOutDate,
          adults: criteria.adults,
          children: criteria.children,
          rooms: criteria.rooms
        }
      : null;

    if (!criteria) {
      // Fallback to create new
      criteria = this._getOrCreateCurrentSearchCriteria();
    } else {
      const nights = this._calculateNights(checkInDate, checkOutDate);
      criteria.checkInDate = checkInDate;
      criteria.checkOutDate = checkOutDate;
      criteria.nights = nights;
      criteria.adults = adults;
      criteria.children = children;
      criteria.rooms = rooms;
      criteria.updatedAt = this._nowISO();
      this._saveSearchCriteriaList(list);
    }

    // Instrumentation for task completion tracking
    try {
      const instrumentationValue = {
        from: previousSnapshot
          ? {
              checkInDate: previousSnapshot.checkInDate,
              checkOutDate: previousSnapshot.checkOutDate,
              adults: previousSnapshot.adults,
              children: previousSnapshot.children,
              rooms: previousSnapshot.rooms
            }
          : null,
        to: {
          checkInDate,
          checkOutDate,
          adults,
          children,
          rooms
        },
        updatedAt: this._nowISO()
      };
      localStorage.setItem(
        'task8_searchUpdatedOnResults',
        JSON.stringify(instrumentationValue)
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const hydrated = this._hydrateSearchCriteria(criteria, destinations);
    const updated = this._updateSearchResultsForCriteria(hydrated);

    // Return subset as per interface signature
    return {
      searchCriteria: updated.searchCriteria,
      results: {
        properties: updated.results.properties.map((r) => ({
          property: r.property,
          totalPriceForStay: r.totalPriceForStay,
          pricePerNight: r.pricePerNight,
          currency: r.currency,
          nights: r.nights
        }))
      }
    };
  }

  // 6. updateCurrentSearchFilters(...)
  updateCurrentSearchFilters(
    propertyTypes,
    starRatingMin,
    guestRatingMin,
    priceMaxPerNight,
    neighborhoodIds,
    requireFreeCancellation,
    paymentOptionFilter,
    requireFreeWifi,
    requireBreakfastIncluded,
    requireKitchen,
    requireSwimmingPool,
    requireKidsFacilities,
    requireInUnitLaundry,
    requirePetFriendly,
    requireParking,
    requireNonSmoking,
    requireWorkspaceDesk
  ) {
    const destinations = this._getDestinations();
    const list = this._getSearchCriteriaList();
    const currentId = localStorage.getItem('currentSearchCriteriaId') || '';
    let criteria = currentId ? list.find((s) => s.id === currentId) || null : null;
    if (!criteria) {
      criteria = this._getOrCreateCurrentSearchCriteria();
    }

    const now = this._nowISO();

    if (propertyTypes !== undefined) {
      criteria.propertyTypes = propertyTypes && propertyTypes.length ? propertyTypes.slice() : null;
    }
    if (starRatingMin !== undefined) {
      criteria.starRatingMin = starRatingMin;
    }
    if (guestRatingMin !== undefined) {
      criteria.guestRatingMin = guestRatingMin;
    }
    if (priceMaxPerNight !== undefined) {
      criteria.priceMaxPerNight = priceMaxPerNight;
    }
    if (neighborhoodIds !== undefined) {
      criteria.neighborhoodIds = neighborhoodIds && neighborhoodIds.length ? neighborhoodIds.slice() : [];
    }
    if (requireFreeCancellation !== undefined) {
      criteria.requireFreeCancellation = !!requireFreeCancellation;
    }
    if (paymentOptionFilter !== undefined) {
      criteria.paymentOptionFilter = paymentOptionFilter || 'any';
    }
    if (requireFreeWifi !== undefined) {
      criteria.requireFreeWifi = !!requireFreeWifi;
    }
    if (requireBreakfastIncluded !== undefined) {
      criteria.requireBreakfastIncluded = !!requireBreakfastIncluded;
    }
    if (requireKitchen !== undefined) {
      criteria.requireKitchen = !!requireKitchen;
    }
    if (requireSwimmingPool !== undefined) {
      criteria.requireSwimmingPool = !!requireSwimmingPool;
    }
    if (requireKidsFacilities !== undefined) {
      criteria.requireKidsFacilities = !!requireKidsFacilities;
    }
    if (requireInUnitLaundry !== undefined) {
      criteria.requireInUnitLaundry = !!requireInUnitLaundry;
    }
    if (requirePetFriendly !== undefined) {
      criteria.requirePetFriendly = !!requirePetFriendly;
    }
    if (requireParking !== undefined) {
      criteria.requireParking = !!requireParking;
    }
    if (requireNonSmoking !== undefined) {
      criteria.requireNonSmoking = !!requireNonSmoking;
    }
    if (requireWorkspaceDesk !== undefined) {
      criteria.requireWorkspaceDesk = !!requireWorkspaceDesk;
    }

    criteria.updatedAt = now;
    this._saveSearchCriteriaList(list);

    const hydrated = this._hydrateSearchCriteria(criteria, destinations);
    const updated = this._updateSearchResultsForCriteria(hydrated);

    return {
      searchCriteria: updated.searchCriteria,
      results: {
        properties: updated.results.properties.map((r) => ({
          property: r.property,
          totalPriceForStay: r.totalPriceForStay,
          pricePerNight: r.pricePerNight,
          currency: r.currency,
          nights: r.nights
        }))
      }
    };
  }

  // 7. updateCurrentSearchSortOption(sortOption)
  updateCurrentSearchSortOption(sortOption) {
    const destinations = this._getDestinations();
    const list = this._getSearchCriteriaList();
    const currentId = localStorage.getItem('currentSearchCriteriaId') || '';
    let criteria = currentId ? list.find((s) => s.id === currentId) || null : null;

    if (!criteria) {
      criteria = this._getOrCreateCurrentSearchCriteria();
    }

    criteria.sortOption = sortOption;
    criteria.updatedAt = this._nowISO();
    this._saveSearchCriteriaList(list);

    const hydrated = this._hydrateSearchCriteria(criteria, destinations);
    const updated = this._updateSearchResultsForCriteria(hydrated);

    return {
      searchCriteria: updated.searchCriteria,
      results: {
        properties: updated.results.properties.map((r) => ({
          property: r.property,
          totalPriceForStay: r.totalPriceForStay,
          pricePerNight: r.pricePerNight,
          currency: r.currency
        }))
      }
    };
  }

  // 8. updateCurrentSearchViewMode(viewMode)
  updateCurrentSearchViewMode(viewMode) {
    const destinations = this._getDestinations();
    const list = this._getSearchCriteriaList();
    const currentId = localStorage.getItem('currentSearchCriteriaId') || '';
    let criteria = currentId ? list.find((s) => s.id === currentId) || null : null;

    if (!criteria) {
      criteria = this._getOrCreateCurrentSearchCriteria();
    }

    criteria.viewMode = viewMode;
    criteria.updatedAt = this._nowISO();
    this._saveSearchCriteriaList(list);

    return {
      searchCriteria: this._hydrateSearchCriteria(criteria, destinations)
    };
  }

  // 9. getMapResultsForCurrentSearch()
  getMapResultsForCurrentSearch() {
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const properties = this._getProperties();
    const criteriaList = this._getSearchCriteriaList();

    const rawState = this._getOrCreateMapViewState();
    const criteria = this._getOrCreateCurrentSearchCriteria();
    rawState.lastSearchCriteriaId = criteria.id;
    rawState.isMapOpen = true;
    rawState.lastUpdated = this._nowISO();

    const mapStates = this._getMapViewStates();
    const idx = mapStates.findIndex((m) => m.id === rawState.id);
    if (idx >= 0) {
      mapStates[idx] = rawState;
      this._saveMapViewStates(mapStates);
    }

    const searchUpdate = this._updateSearchResultsForCriteria(criteria);
    const propsForMap = searchUpdate.results.properties.map((r) => ({
      property: r.property,
      pricePerNight: r.pricePerNight,
      currency: r.currency
    }));

    const hydratedState = this._hydrateMapViewState(
      rawState,
      criteriaList,
      destinations,
      properties,
      neighborhoods
    );

    return {
      mapViewState: hydratedState,
      properties: propsForMap
    };
  }

  // 10. updateMapViewState(centerLat, centerLng, zoomLevel, selectedPropertyId)
  updateMapViewState(centerLat, centerLng, zoomLevel, selectedPropertyId) {
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const properties = this._getProperties();
    const criteriaList = this._getSearchCriteriaList();

    const mapStates = this._getMapViewStates();
    let state = this._getOrCreateMapViewState();

    if (centerLat !== undefined) state.centerLat = centerLat;
    if (centerLng !== undefined) state.centerLng = centerLng;
    if (zoomLevel !== undefined) state.zoomLevel = zoomLevel;
    if (selectedPropertyId !== undefined) state.selectedPropertyId = selectedPropertyId || null;
    state.lastUpdated = this._nowISO();

    const idx = mapStates.findIndex((m) => m.id === state.id);
    if (idx >= 0) {
      mapStates[idx] = state;
    } else {
      mapStates.push(state);
    }
    this._saveMapViewStates(mapStates);

    const criteria = this._getOrCreateCurrentSearchCriteria();
    const searchUpdate = this._updateSearchResultsForCriteria(criteria);

    let selectedProperty = null;
    if (state.selectedPropertyId) {
      const entry = searchUpdate.results.properties.find(
        (r) => r.property.id === state.selectedPropertyId
      );
      if (entry) {
        selectedProperty = {
          property: entry.property,
          totalPriceForStay: entry.totalPriceForStay,
          pricePerNight: entry.pricePerNight,
          currency: entry.currency
        };
      }
    }

    const hydratedState = this._hydrateMapViewState(
      state,
      criteriaList,
      destinations,
      properties,
      neighborhoods
    );

    return {
      mapViewState: hydratedState,
      selectedProperty
    };
  }

  // 11. getPropertyDetailsForCurrentSearch(propertyId)
  getPropertyDetailsForCurrentSearch(propertyId) {
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const properties = this._getProperties();
    const roomTypes = this._getRoomTypes();
    const ratePlans = this._getRatePlans();

    const searchCriteria = this._getOrCreateCurrentSearchCriteria();
    const property = properties.find((p) => p.id === propertyId) || null;
    if (!property) {
      return {
        property: null,
        destination: null,
        neighborhood: null,
        searchCriteria,
        pricingSummary: null,
        keyAmenities: [],
        roomTypeSummaries: [],
        isInWishlist: false
      };
    }

    const hydratedProperty = this._hydrateProperty(property, destinations, neighborhoods);
    const destination = hydratedProperty.destination;
    const neighborhood = hydratedProperty.neighborhood;

    const nights = searchCriteria.nights || this._calculateNights(
      searchCriteria.checkInDate,
      searchCriteria.checkOutDate
    ) || 1;

    const propertyPlans = ratePlans.filter(
      (rp) => rp.propertyId === property.id && rp.available
    );
    let cheapest = null;
    propertyPlans.forEach((rp) => {
      if (!cheapest || rp.pricePerNight < cheapest.pricePerNight) {
        cheapest = rp;
      }
    });

    let pricingSummary;
    if (cheapest) {
      pricingSummary = {
        nights,
        totalPriceForStayFrom: cheapest.pricePerNight * nights,
        pricePerNightFrom: cheapest.pricePerNight,
        currency: cheapest.currency || property.currency || 'USD',
        freeCancellation: cheapest.cancellationType === 'free_cancellation',
        paymentOptionType: cheapest.paymentOptionType
      };
    } else if (property.lowestPricePerNight != null) {
      pricingSummary = {
        nights,
        totalPriceForStayFrom: property.lowestPricePerNight * nights,
        pricePerNightFrom: property.lowestPricePerNight,
        currency: property.currency || 'USD',
        freeCancellation: property.defaultCancellationType === 'free_cancellation',
        paymentOptionType: property.defaultPaymentOptionType || 'pay_now'
      };
    } else {
      pricingSummary = null;
    }

    const keyAmenities = [
      { code: 'free_wifi', label: 'Free WiFi', available: !!property.hasFreeWifi },
      {
        code: 'breakfast_included',
        label: 'Breakfast included',
        available: !!property.hasBreakfastIncluded
      },
      { code: 'kitchen', label: 'Kitchen', available: !!property.hasKitchen },
      { code: 'swimming_pool', label: 'Swimming pool', available: !!property.hasSwimmingPool },
      {
        code: 'kids_facilities',
        label: 'Family / kids facilities',
        available: !!(property.hasKidsClub || property.isFamilyFriendly)
      },
      { code: 'parking', label: 'Parking', available: !!property.hasParking },
      { code: 'pet_friendly', label: 'Pet-friendly', available: !!property.isPetFriendly },
      {
        code: 'in_unit_laundry',
        label: 'In-unit laundry',
        available: !!property.hasInUnitLaundry
      },
      {
        code: 'workspace_desk',
        label: 'Workspace / desk',
        available: !!property.hasWorkspaceDesk
      },
      {
        code: 'non_smoking',
        label: 'Non-smoking rooms',
        available: !!property.hasNonSmokingRooms
      }
    ];

    const nightsForRooms = nights || 1;
    const roomTypeSummaries = roomTypes
      .filter((rt) => rt.propertyId === property.id)
      .map((rt) => {
        const plans = ratePlans.filter(
          (rp) => rp.roomTypeId === rt.id && rp.available
        );
        let cheapestPlan = null;
        plans.forEach((rp) => {
          if (!cheapestPlan || rp.pricePerNight < cheapestPlan.pricePerNight) {
            cheapestPlan = rp;
          }
        });
        const fromPricePerNight = cheapestPlan
          ? cheapestPlan.pricePerNight
          : rt.defaultPricePerNight || null;
        const fromTotalPriceForStay =
          fromPricePerNight != null ? fromPricePerNight * nightsForRooms : null;
        const currency = cheapestPlan
          ? cheapestPlan.currency
          : rt.currency || property.currency || 'USD';
        const includesBreakfast =
          !!rt.includesBreakfast || plans.some((rp) => rp.includesBreakfast);
        const includesFreeWifi =
          !!rt.includesFreeWifi || plans.some((rp) => rp.includesFreeWifi);
        const paymentOptionTypes = Array.from(
          new Set(plans.map((rp) => rp.paymentOptionType))
        );
        const cancellationTypes = Array.from(
          new Set(plans.map((rp) => rp.cancellationType))
        );

        const hydratedRt = this._hydrateRoomType(
          rt,
          properties,
          destinations,
          neighborhoods
        );

        return {
          roomType: hydratedRt,
          fromPricePerNight,
          fromTotalPriceForStay,
          currency,
          includesBreakfast,
          includesFreeWifi,
          paymentOptionTypes,
          cancellationTypes
        };
      });

    const wishlist = this._getWishlists()[0] || null;
    const isInWishlist = wishlist ? (wishlist.propertyIds || []).includes(property.id) : false;

    return {
      property: hydratedProperty,
      destination,
      neighborhood,
      searchCriteria,
      pricingSummary,
      keyAmenities,
      roomTypeSummaries,
      isInWishlist
    };
  }

  // 12. getRoomOptionsForCurrentSearchProperty(propertyId)
  getRoomOptionsForCurrentSearchProperty(propertyId) {
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const properties = this._getProperties();
    const roomTypes = this._getRoomTypes();
    const ratePlans = this._getRatePlans();

    const searchCriteria = this._getOrCreateCurrentSearchCriteria();
    const property = properties.find((p) => p.id === propertyId) || null;
    if (!property) {
      return {
        property: null,
        searchCriteria,
        roomOptions: []
      };
    }

    const nights = searchCriteria.nights || this._calculateNights(
      searchCriteria.checkInDate,
      searchCriteria.checkOutDate
    ) || 1;

    const propertyRoomTypes = roomTypes.filter((rt) => rt.propertyId === property.id);
    const roomOptions = propertyRoomTypes.map((rt) => {
      const plans = ratePlans
        .filter((rp) => rp.roomTypeId === rt.id && rp.available)
        .map((rp) => ({
          ratePlan: this._hydrateRatePlan(
            rp,
            properties,
            roomTypes,
            destinations,
            neighborhoods
          ),
          totalPriceForStay: rp.pricePerNight * nights,
          pricePerNight: rp.pricePerNight,
          currency: rp.currency || rt.currency || property.currency || 'USD'
        }));

      const hydratedRt = this._hydrateRoomType(
        rt,
        properties,
        destinations,
        neighborhoods
      );

      return {
        roomType: hydratedRt,
        ratePlans: plans
      };
    });

    const hydratedProperty = this._hydrateProperty(property, destinations, neighborhoods);

    return {
      property: hydratedProperty,
      searchCriteria,
      roomOptions
    };
  }

  // 13. selectRoomsForBooking(propertyId, rooms)
  selectRoomsForBooking(propertyId, rooms) {
    const properties = this._getProperties();
    const roomTypes = this._getRoomTypes();
    const ratePlans = this._getRatePlans();
    const bookings = this._getBookings();
    const searchCriteria = this._getOrCreateCurrentSearchCriteria();

    const property = properties.find((p) => p.id === propertyId) || null;
    if (!property) {
      return {
        success: false,
        booking: null,
        rooms: [],
        validationErrors: [
          { code: 'invalid_property', message: 'Property not found.' }
        ],
        message: 'Property not found.'
      };
    }

    const capacityCheck = this._validateRoomCapacityForSearch(searchCriteria, rooms || []);
    if (!capacityCheck.ok) {
      return {
        success: false,
        booking: null,
        rooms: [],
        validationErrors: capacityCheck.errors,
        message: 'Room capacity not sufficient.'
      };
    }

    const nights = searchCriteria.nights || this._calculateNights(
      searchCriteria.checkInDate,
      searchCriteria.checkOutDate
    ) || 1;

    // Clear previous current booking associations
    const existingCurrentId = localStorage.getItem('currentBookingId') || '';
    if (existingCurrentId) {
      this._clearCurrentBookingAssociations(existingCurrentId);
    }

    // Create new booking
    const now = this._nowISO();
    const bookingId = this._generateId('booking');
    const totalRoomsCount = rooms.reduce((sum, r) => sum + (r.quantity || 0), 0);

    const booking = {
      id: bookingId,
      propertyId: property.id,
      checkInDate: searchCriteria.checkInDate,
      checkOutDate: searchCriteria.checkOutDate,
      nights,
      adults: searchCriteria.adults,
      children: searchCriteria.children,
      rooms: totalRoomsCount,
      status: 'in_progress',
      totalPricePreDiscount: 0,
      totalPricePostDiscount: 0,
      currency: property.currency || 'USD',
      freeCancellation: false,
      payAtProperty: false,
      paymentOptionType: property.defaultPaymentOptionType || 'pay_now',
      promoCode: null,
      promoDiscountAmount: 0,
      guestPrimaryFullName: null,
      contactEmail: null,
      contactPhone: null,
      arrivalTimeNote: null,
      specialRequests: null,
      createdAt: now,
      updatedAt: now
    };

    bookings.push(booking);
    this._saveBookings(bookings);
    localStorage.setItem('currentBookingId', booking.id);

    // Create BookingRoom entries
    const bookingRoomsAll = this._getBookingRooms();
    const roomDistributions = this._distributeGuestsAcrossRooms(
      searchCriteria.adults,
      searchCriteria.children,
      totalRoomsCount
    );

    const selectedBookingRooms = [];
    let roomSeq = 1;
    const allSelectedRatePlans = [];

    rooms.forEach((sel) => {
      const quantity = sel.quantity || 0;
      if (!quantity) return;
      const rt = roomTypes.find((r) => r.id === sel.roomTypeId) || null;
      const rp = ratePlans.find((r) => r.id === sel.ratePlanId) || null;
      if (!rt || !rp || !rp.available) {
        return;
      }
      for (let i = 0; i < quantity; i++) {
        const dist = roomDistributions[roomSeq - 1] || { adults: 0, children: 0 };
        const pricePerNight = rp.pricePerNight;
        const roomTotalPrice = pricePerNight * nights;
        const bookingRoom = {
          id: this._generateId('booking_room'),
          bookingId: booking.id,
          roomTypeId: rt.id,
          ratePlanId: rp.id,
          roomName: rt.name,
          bedConfiguration: rt.bedConfiguration || null,
          includesBreakfast: !!(rp.includesBreakfast || rt.includesBreakfast),
          includesFreeWifi: !!(rp.includesFreeWifi || rt.includesFreeWifi),
          isNonSmoking: !!rt.isNonSmoking,
          numAdults: dist.adults,
          numChildren: dist.children,
          roomSequence: roomSeq,
          pricePerNight,
          nights,
          roomTotalPrice,
          currency: rp.currency || rt.currency || property.currency || 'USD'
        };
        bookingRoomsAll.push(bookingRoom);
        selectedBookingRooms.push(bookingRoom);
        allSelectedRatePlans.push(rp);
        roomSeq++;
      }
    });

    this._saveBookingRooms(bookingRoomsAll);

    // Update booking totals & flags
    const anyFreeCancellation = allSelectedRatePlans.every(
      (rp) => rp.cancellationType === 'free_cancellation'
    );
    const anyPayAtProperty = allSelectedRatePlans.every(
      (rp) =>
        rp.paymentOptionType === 'pay_at_property' ||
        rp.paymentOptionType === 'reserve_now_pay_later'
    );

    const updatedBooking = this._recalculateBookingTotals(booking.id);
    if (updatedBooking) {
      updatedBooking.freeCancellation = anyFreeCancellation;
      updatedBooking.payAtProperty = anyPayAtProperty;
      updatedBooking.paymentOptionType =
        allSelectedRatePlans[0] && allSelectedRatePlans[0].paymentOptionType
          ? allSelectedRatePlans[0].paymentOptionType
          : updatedBooking.paymentOptionType;
      const allBookings = this._getBookings();
      const idx = allBookings.findIndex((b) => b.id === updatedBooking.id);
      if (idx >= 0) {
        allBookings[idx] = updatedBooking;
        this._saveBookings(allBookings);
      }
    }

    const hydratedBookingRooms = (() => {
      const bookingsAll = this._getBookings();
      const promoCodes = this._getPromoCodes();
      const destinationsAll = this._getDestinations();
      const neighborhoodsAll = this._getNeighborhoods();
      return selectedBookingRooms.map((br) =>
        this._hydrateBookingRoom(
          br,
          bookingsAll,
          roomTypes,
          ratePlans,
          properties,
          destinationsAll,
          neighborhoodsAll,
          promoCodes
        )
      );
    })();

    const hydratedBooking = (() => {
      const bookingsAll = this._getBookings();
      const promoCodes = this._getPromoCodes();
      const destinationsAll = this._getDestinations();
      const neighborhoodsAll = this._getNeighborhoods();
      const b = bookingsAll.find((bk) => bk.id === booking.id) || booking;
      return this._hydrateBooking(
        b,
        properties,
        destinationsAll,
        neighborhoodsAll,
        promoCodes
      );
    })();

    return {
      success: true,
      booking: hydratedBooking,
      rooms: hydratedBookingRooms,
      validationErrors: [],
      message: 'Rooms selected for booking.'
    };
  }

  // 14. getBookingDetailsFormData()
  getBookingDetailsFormData() {
    const bookings = this._getBookings();
    const bookingRooms = this._getBookingRooms();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem('currentBookingId') || '';
    const booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;
    const searchCriteria = this._getOrCreateCurrentSearchCriteria();

    if (!booking) {
      return {
        booking: null,
        property: null,
        searchCriteria,
        roomSummaries: [],
        primaryGuest: {
          fullName: '',
          email: '',
          phone: ''
        },
        canEditRooms: false
      };
    }

    const property = properties.find((p) => p.id === booking.propertyId) || null;
    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );
    const hydratedProperty = this._hydrateProperty(property, destinations, neighborhoods);

    const roomsForBooking = bookingRooms.filter((br) => br.bookingId === booking.id);
    const roomSummaries = roomsForBooking.map((br) => ({
      bookingRoom: br,
      assignedAdults: br.numAdults,
      assignedChildren: br.numChildren
    }));

    const primaryGuest = {
      fullName: booking.guestPrimaryFullName || '',
      email: booking.contactEmail || '',
      phone: booking.contactPhone || ''
    };

    return {
      booking: hydratedBooking,
      property: hydratedProperty,
      searchCriteria,
      roomSummaries,
      primaryGuest,
      canEditRooms: booking.status === 'in_progress'
    };
  }

  // 15. updateBookingGuestDetails(primaryFullName, contactEmail, contactPhone, arrivalTimeNote, specialRequests, guestsPerRoom)
  updateBookingGuestDetails(
    primaryFullName,
    contactEmail,
    contactPhone,
    arrivalTimeNote,
    specialRequests,
    guestsPerRoom
  ) {
    const bookings = this._getBookings();
    const bookingRooms = this._getBookingRooms();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem('currentBookingId') || '';
    const booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;

    if (!booking) {
      return {
        success: false,
        booking: null,
        bookingGuests: [],
        message: 'No current booking.'
      };
    }

    booking.guestPrimaryFullName = primaryFullName;
    booking.contactEmail = contactEmail;
    booking.contactPhone = contactPhone || null;
    booking.arrivalTimeNote = arrivalTimeNote || null;
    booking.specialRequests = specialRequests || null;
    booking.updatedAt = this._nowISO();
    this._saveBookings(bookings);

    // Clear existing guests for this booking
    let bookingGuests = this._getBookingGuests();
    bookingGuests = bookingGuests.filter((bg) => bg.bookingId !== booking.id);

    const now = this._nowISO();
    const guestsCreated = [];

    (guestsPerRoom || []).forEach((roomInfo) => {
      const bookingRoomId = roomInfo.bookingRoomId;
      const roomExists = bookingRooms.some(
        (br) => br.id === bookingRoomId && br.bookingId === booking.id
      );
      if (!roomExists) return;
      (roomInfo.guestNames || []).forEach((g) => {
        const guest = {
          id: this._generateId('booking_guest'),
          bookingId: booking.id,
          bookingRoomId,
          fullName: g.fullName,
          guestType: g.guestType || 'additional_guest',
          createdAt: now
        };
        bookingGuests.push(guest);
        guestsCreated.push(guest);
      });
    });

    this._saveBookingGuests(bookingGuests);

    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );

    const hydratedGuests = guestsCreated.map((bg) =>
      this._hydrateBookingGuest(
        bg,
        bookings,
        bookingRooms,
        this._getRatePlans(),
        properties,
        destinations,
        neighborhoods,
        promoCodes
      )
    );

    return {
      success: true,
      booking: hydratedBooking,
      bookingGuests: hydratedGuests,
      message: 'Guest details updated.'
    };
  }

  // 16. getCheckoutSummary()
  getCheckoutSummary() {
    const bookings = this._getBookings();
    const bookingRooms = this._getBookingRooms();
    const bookingGuests = this._getBookingGuests();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem('currentBookingId') || '';
    const booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;

    if (!booking) {
      return {
        booking: null,
        property: null,
        bookingRooms: [],
        bookingGuests: [],
        priceBreakdown: null,
        availablePaymentOptions: [],
        policies: []
      };
    }

    const property = properties.find((p) => p.id === booking.propertyId) || null;
    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );
    const hydratedProperty = this._hydrateProperty(property, destinations, neighborhoods);

    const roomsForBooking = bookingRooms.filter((br) => br.bookingId === booking.id);
    const guestsForBooking = bookingGuests.filter((bg) => bg.bookingId === booking.id);

    const roomSubtotals = roomsForBooking.map((br) => ({
      bookingRoomId: br.id,
      roomName: br.roomName,
      nightlyRate: br.pricePerNight,
      nights: br.nights,
      roomTotal: br.roomTotalPrice
    }));

    const taxesAndFees = 0;
    const totalPreDiscount = booking.totalPricePreDiscount;
    const discountAmount = booking.promoDiscountAmount || 0;
    const totalPostDiscount = booking.totalPricePostDiscount;
    const currency = booking.currency || (property && property.currency) || 'USD';

    const priceBreakdown = {
      nights: booking.nights,
      roomSubtotals,
      taxesAndFees,
      totalPreDiscount,
      promoCode: booking.promoCode,
      discountAmount,
      totalPostDiscount,
      currency
    };

    const availablePaymentOptions = booking.payAtProperty
      ? ['card', 'wallet', 'pay_at_property']
      : ['card', 'wallet'];

    const policies = [
      'Cancellation policy depends on selected rate plan and may include free cancellation until a specific date.',
      'Payment options are determined by the selected rate, including pay now or pay at property when available.'
    ];

    const hydratedRooms = (() => {
      const ratePlans = this._getRatePlans();
      return roomsForBooking.map((br) =>
        this._hydrateBookingRoom(
          br,
          bookings,
          this._getRoomTypes(),
          ratePlans,
          properties,
          destinations,
          neighborhoods,
          promoCodes
        )
      );
    })();

    const hydratedGuests = bookingGuests
      .filter((bg) => bg.bookingId === booking.id)
      .map((bg) =>
        this._hydrateBookingGuest(
          bg,
          bookings,
          bookingRooms,
          this._getRatePlans(),
          properties,
          destinations,
          neighborhoods,
          promoCodes
        )
      );

    return {
      booking: hydratedBooking,
      property: hydratedProperty,
      bookingRooms: hydratedRooms,
      bookingGuests: hydratedGuests,
      priceBreakdown,
      availablePaymentOptions,
      policies
    };
  }

  // 17. applyPromoCodeToCurrentBooking(promoCode)
  applyPromoCodeToCurrentBooking(promoCode) {
    const bookings = this._getBookings();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem('currentBookingId') || '';
    const booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;

    if (!booking) {
      return {
        success: false,
        booking: null,
        priceBreakdown: null,
        message: 'No current booking.'
      };
    }

    const codeUpper = (promoCode || '').toUpperCase();
    const promo = promoCodes.find((p) => p.code.toUpperCase() === codeUpper) || null;

    if (!promo) {
      return {
        success: false,
        booking,
        priceBreakdown: null,
        message: 'Invalid promo code.'
      };
    }

    const now = new Date();
    if (promo.status !== 'active') {
      return {
        success: false,
        booking,
        priceBreakdown: null,
        message: 'Promo code is not active.'
      };
    }
    if (promo.validFrom) {
      const from = new Date(promo.validFrom);
      if (now < from) {
        return {
          success: false,
          booking,
          priceBreakdown: null,
          message: 'Promo code is not yet valid.'
        };
      }
    }
    if (promo.validTo) {
      const to = new Date(promo.validTo);
      if (now > to) {
        return {
          success: false,
          booking,
          priceBreakdown: null,
          message: 'Promo code has expired.'
        };
      }
    }

    const totalPre = booking.totalPricePreDiscount;
    if (promo.minTotalAmount != null && totalPre < promo.minTotalAmount) {
      return {
        success: false,
        booking,
        priceBreakdown: null,
        message: 'Booking total does not meet minimum amount for this code.'
      };
    }
    if (promo.maxTotalAmount != null && totalPre > promo.maxTotalAmount) {
      return {
        success: false,
        booking,
        priceBreakdown: null,
        message: 'Booking total exceeds maximum amount for this code.'
      };
    }

    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (promo.discountValue / 100) * totalPre;
    } else if (promo.discountType === 'fixed_amount') {
      if (!promo.currency || promo.currency === booking.currency) {
        discount = promo.discountValue;
      }
    }

    discount = Math.min(discount, totalPre);

    booking.promoCode = promo.code;
    booking.promoDiscountAmount = discount;
    // Persist promo details before recalculating totals
    this._saveBookings(bookings);
    const updatedBooking = this._recalculateBookingTotals(booking.id) || booking;

    const priceBreakdown = {
      totalPreDiscount: updatedBooking.totalPricePreDiscount,
      promoCode: updatedBooking.promoCode,
      discountAmount: updatedBooking.promoDiscountAmount,
      totalPostDiscount: updatedBooking.totalPricePostDiscount,
      currency: updatedBooking.currency
    };

    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const hydratedBooking = this._hydrateBooking(
      updatedBooking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );

    return {
      success: true,
      booking: hydratedBooking,
      priceBreakdown,
      message: 'Promo code applied.'
    };
  }

  // 18. selectPaymentMethodForCurrentBooking(paymentMethodType)
  selectPaymentMethodForCurrentBooking(paymentMethodType) {
    const bookings = this._getBookings();
    const bookingPayments = this._getBookingPayments();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem('currentBookingId') || '';
    const booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;

    if (!booking) {
      return {
        success: false,
        bookingPayment: null,
        message: 'No current booking.'
      };
    }

    if (!['card', 'wallet', 'pay_at_property'].includes(paymentMethodType)) {
      return {
        success: false,
        bookingPayment: null,
        message: 'Invalid payment method type.'
      };
    }

    const amount = booking.totalPricePostDiscount;
    const currency = booking.currency || 'USD';

    const now = this._nowISO();
    let bp = bookingPayments.find((p) => p.bookingId === booking.id) || null;
    if (!bp) {
      bp = {
        id: this._generateId('booking_payment'),
        bookingId: booking.id,
        paymentMethodType,
        paymentStatus: 'selected',
        amount,
        currency,
        createdAt: now,
        updatedAt: now
      };
      bookingPayments.push(bp);
    } else {
      bp.paymentMethodType = paymentMethodType;
      bp.amount = amount;
      bp.currency = currency;
      bp.paymentStatus = 'selected';
      bp.updatedAt = now;
    }

    this._saveBookingPayments(bookingPayments);

    const hydratedPayment = this._hydrateBookingPayment(
      bp,
      bookings,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );

    return {
      success: true,
      bookingPayment: hydratedPayment,
      message: 'Payment method selected.'
    };
  }

  // 19. getBookingReviewSummary()
  getBookingReviewSummary() {
    const bookings = this._getBookings();
    const bookingRooms = this._getBookingRooms();
    const bookingGuests = this._getBookingGuests();
    const bookingPayments = this._getBookingPayments();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem('currentBookingId') || '';
    const booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;

    if (!booking) {
      return {
        booking: null,
        property: null,
        bookingRooms: [],
        bookingGuests: [],
        bookingPayment: null,
        priceBreakdown: null,
        policies: []
      };
    }

    const property = properties.find((p) => p.id === booking.propertyId) || null;
    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );
    const hydratedProperty = this._hydrateProperty(property, destinations, neighborhoods);

    const roomsForBooking = bookingRooms.filter((br) => br.bookingId === booking.id);
    const guestsForBooking = bookingGuests.filter((bg) => bg.bookingId === booking.id);
    const payment = bookingPayments.find((bp) => bp.bookingId === booking.id) || null;

    const roomSubtotals = roomsForBooking.map((br) => ({
      bookingRoomId: br.id,
      roomName: br.roomName,
      roomTotal: br.roomTotalPrice
    }));
    const taxesAndFees = 0;
    const totalPreDiscount = booking.totalPricePreDiscount;
    const discountAmount = booking.promoDiscountAmount || 0;
    const totalPostDiscount = booking.totalPricePostDiscount;
    const currency = booking.currency || (property && property.currency) || 'USD';

    const priceBreakdown = {
      roomSubtotals,
      taxesAndFees,
      totalPreDiscount,
      promoCode: booking.promoCode,
      discountAmount,
      totalPostDiscount,
      currency
    };

    const policies = [
      'Please review your booking details carefully. Changes may affect price and availability.',
      'By confirming, you agree to the property and platform terms, including cancellation and payment conditions.'
    ];

    const hydratedRooms = (() => {
      const ratePlans = this._getRatePlans();
      return roomsForBooking.map((br) =>
        this._hydrateBookingRoom(
          br,
          bookings,
          this._getRoomTypes(),
          ratePlans,
          properties,
          destinations,
          neighborhoods,
          promoCodes
        )
      );
    })();

    const hydratedGuests = guestsForBooking.map((bg) =>
      this._hydrateBookingGuest(
        bg,
        bookings,
        bookingRooms,
        this._getRatePlans(),
        properties,
        destinations,
        neighborhoods,
        promoCodes
      )
    );

    const hydratedPayment = payment
      ? this._hydrateBookingPayment(
          payment,
          bookings,
          properties,
          destinations,
          neighborhoods,
          promoCodes
        )
      : null;

    return {
      booking: hydratedBooking,
      property: hydratedProperty,
      bookingRooms: hydratedRooms,
      bookingGuests: hydratedGuests,
      bookingPayment: hydratedPayment,
      priceBreakdown,
      policies
    };
  }

  // 20. confirmCurrentBooking()
  confirmCurrentBooking() {
    const bookings = this._getBookings();
    const bookingPayments = this._getBookingPayments();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem('currentBookingId') || '';
    const booking = currentId ? bookings.find((b) => b.id === currentId) || null : null;

    if (!booking) {
      return {
        success: false,
        booking: null,
        bookingPayment: null,
        message: 'No current booking.'
      };
    }

    const payment = bookingPayments.find((bp) => bp.bookingId === booking.id) || null;
    if (!payment) {
      return {
        success: false,
        booking: this._hydrateBooking(
          booking,
          properties,
          destinations,
          neighborhoods,
          promoCodes
        ),
        bookingPayment: null,
        message: 'No payment method selected.'
      };
    }

    booking.status = 'confirmed';
    booking.updatedAt = this._nowISO();

    if (payment.paymentMethodType === 'pay_at_property') {
      payment.paymentStatus = 'selected';
    } else {
      payment.paymentStatus = 'paid';
    }
    payment.updatedAt = this._nowISO();

    this._saveBookings(bookings);
    this._saveBookingPayments(bookingPayments);

    const hydratedBooking = this._hydrateBooking(
      booking,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );
    const hydratedPayment = this._hydrateBookingPayment(
      payment,
      bookings,
      properties,
      destinations,
      neighborhoods,
      promoCodes
    );

    return {
      success: true,
      booking: hydratedBooking,
      bookingPayment: hydratedPayment,
      message: 'Booking confirmed.'
    };
  }

  // 21. togglePropertyWishlistStatus(propertyId)
  togglePropertyWishlistStatus(propertyId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlists = this._getWishlists();

    const ids = wishlist.propertyIds || [];
    const idx = ids.indexOf(propertyId);
    let isInWishlist;
    if (idx >= 0) {
      ids.splice(idx, 1);
      isInWishlist = false;
    } else {
      ids.push(propertyId);
      isInWishlist = true;
    }
    wishlist.propertyIds = ids;
    wishlist.updatedAt = this._nowISO();

    const index = wishlists.findIndex((w) => w.id === wishlist.id);
    if (index >= 0) {
      wishlists[index] = wishlist;
    }
    this._saveWishlists(wishlists);

    return {
      isInWishlist,
      wishlistCount: ids.length,
      message: isInWishlist ? 'Added to favorites.' : 'Removed from favorites.'
    };
  }

  // 22. getWishlistSummary()
  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const ratePlans = this._getRatePlans();

    const props = (wishlist.propertyIds || [])
      .map((id) => properties.find((p) => p.id === id) || null)
      .filter(Boolean)
      .map((prop) => {
        const pricing = this._getPropertyPricingForCriteria(
          { requireFreeCancellation: false, paymentOptionFilter: 'any' },
          prop,
          ratePlans,
          1
        );
        const hydratedProp = this._hydrateProperty(prop, destinations, neighborhoods);
        return {
          property: hydratedProp,
          lowestPricePerNight: pricing
            ? pricing.pricePerNight
            : prop.lowestPricePerNight || null,
          currency: pricing ? pricing.currency : prop.currency || 'USD'
        };
      });

    return {
      count: wishlist.propertyIds.length,
      properties: props
    };
  }

  // 23. getWishlistProperties()
  getWishlistProperties() {
    const wishlist = this._getOrCreateWishlist();
    const properties = this._getProperties();
    const destinations = this._getDestinations();
    const neighborhoods = this._getNeighborhoods();
    const ratePlans = this._getRatePlans();

    const props = (wishlist.propertyIds || [])
      .map((id) => properties.find((p) => p.id === id) || null)
      .filter(Boolean)
      .map((prop) => {
        const pricing = this._getPropertyPricingForCriteria(
          { requireFreeCancellation: false, paymentOptionFilter: 'any' },
          prop,
          ratePlans,
          1
        );
        const hydratedProp = this._hydrateProperty(prop, destinations, neighborhoods);
        return {
          property: hydratedProp,
          pricingExample: {
            lowestPricePerNight: pricing
              ? pricing.pricePerNight
              : prop.lowestPricePerNight || null,
            currency: pricing ? pricing.currency : prop.currency || 'USD'
          }
        };
      });

    return {
      wishlist,
      properties: props
    };
  }

  // 24. removePropertyFromWishlist(propertyId)
  removePropertyFromWishlist(propertyId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlists = this._getWishlists();

    const ids = wishlist.propertyIds || [];
    const idx = ids.indexOf(propertyId);
    if (idx >= 0) {
      ids.splice(idx, 1);
      wishlist.propertyIds = ids;
      wishlist.updatedAt = this._nowISO();
      const index = wishlists.findIndex((w) => w.id === wishlist.id);
      if (index >= 0) {
        wishlists[index] = wishlist;
      }
      this._saveWishlists(wishlists);
      return {
        success: true,
        wishlistCount: ids.length,
        message: 'Removed from wishlist.'
      };
    }

    return {
      success: false,
      wishlistCount: ids.length,
      message: 'Property not in wishlist.'
    };
  }

  // 25. getAboutPageContent()
  getAboutPageContent() {
    return {
      headline: 'StayFinder: Book hotels and serviced apartments worldwide',
      bodySections: [
        {
          title: 'Our story',
          body:
            'StayFinder was built to make finding the right place to stay as simple as possible, whether you need a hotel for tonight or a serviced apartment for a month.'
        },
        {
          title: 'What we offer',
          body:
            'Compare hotels and serviced apartments in major cities worldwide, filter by the amenities you care about, and complete your booking in just a few steps.'
        }
      ],
      keyBenefits: [
        'Clear filters for WiFi, breakfast, kitchens, and more',
        'Family-friendly options with kids facilities and pools',
        'Flexible payment and cancellation options where available'
      ]
    };
  }

  // 26. getHelpFaqContent()
  getHelpFaqContent() {
    return {
      categories: [
        {
          code: 'search_and_filters',
          title: 'Search & Filters',
          faqs: [
            {
              question: 'How do I find properties with specific amenities?',
              answerHtml:
                '<p>Use the filters on the search results page to select amenities like free WiFi, breakfast included, kitchen, swimming pool, and more.</p>'
            }
          ]
        },
        {
          code: 'bookings',
          title: 'Bookings',
          faqs: [
            {
              question: 'What are the steps to complete a booking?',
              answerHtml:
                '<p>Select your destination and dates, choose a property, pick a room and rate, enter guest details, select a payment method, then review and confirm.</p>'
            }
          ]
        },
        {
          code: 'payments',
          title: 'Payments',
          faqs: [
            {
              question: 'What payment methods are available?',
              answerHtml:
                '<p>Available payment methods depend on the property and selected rate, and can include paying now by card or wallet, or paying at the property where offered.</p>'
            }
          ]
        },
        {
          code: 'cancellations',
          title: 'Cancellations',
          faqs: [
            {
              question: 'How do free cancellation rates work?',
              answerHtml:
                '<p>Some rate plans offer free cancellation until a deadline. Always check the cancellation policy on the checkout or review page before confirming.</p>'
            }
          ]
        }
      ]
    };
  }

  // 27. getContactPageContent()
  getContactPageContent() {
    return {
      supportEmail: 'support@stayfinder.example',
      supportPhone: '+1-000-000-0000',
      responseTimeHours: 24,
      helpPageUrlPath: '/help'
    };
  }

  // 28. submitContactRequest(topic, subject, message, email, bookingReference)
  submitContactRequest(topic, subject, message, email, bookingReference) {
    const list = this._getFromStorage('contact_requests');
    const now = this._nowISO();
    const req = {
      id: this._generateId('contact'),
      topic: topic || null,
      subject,
      message,
      email,
      bookingReference: bookingReference || null,
      createdAt: now
    };
    list.push(req);
    this._saveToStorage('contact_requests', list);

    return {
      success: true,
      message: 'Your request has been submitted.'
    };
  }

  // 29. getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Bookings',
          bodyHtml:
            '<p>All bookings are subject to availability and the terms of the property. Please review the booking details before confirming.</p>'
        },
        {
          title: 'Payments',
          bodyHtml:
            '<p>Payment processing is handled securely. For pay-at-property rates, you will pay the property directly according to their accepted methods.</p>'
        },
        {
          title: 'Cancellations',
          bodyHtml:
            '<p>Cancellation policies vary by rate plan. Free cancellation, partial refunds, or non-refundable terms will be shown during checkout.</p>'
        },
        {
          title: 'Promotions',
          bodyHtml:
            '<p>Promo codes may be subject to minimum or maximum booking totals, validity periods, and other conditions.</p>'
        }
      ]
    };
  }

  // 30. getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Data collection',
          bodyHtml:
            '<p>We collect information needed to complete your bookings, including contact details and stay preferences.</p>'
        },
        {
          title: 'Cookies',
          bodyHtml:
            '<p>We use cookies to remember your preferences and improve your browsing experience.</p>'
        },
        {
          title: 'Your rights',
          bodyHtml:
            '<p>You may contact us to request access, correction, or deletion of your personal data where applicable.</p>'
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