/*
  Hotel Resort Virtual Tour Website Business Logic
  - Uses localStorage for persistence
  - No DOM access
  - Works in browser and Node.js (via polyfilled localStorage)
*/

// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
    // Initialize all entity tables if not present (empty arrays, no mock rows)
    const arrayKeys = [
      'room_types',
      'amenities',
      'accessibility_features',
      'offers',
      'spa_services',
      'restaurants',
      'activities',
      'meeting_rooms',
      'event_service_options',
      'virtual_tour_areas',
      'hotspot_categories',
      'virtual_tour_hotspots',
      'itineraries',
      'itinerary_items',
      'stay_bookings',
      'spa_appointments',
      'dining_reservations',
      'meeting_quote_requests',
      'favorite_items',
      'room_comparison_sets',
      'booking_guest_details'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton / config-like keys are not pre-populated to avoid mock data.
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _safeParse(json, defaultValue) {
    if (!json) return defaultValue;
    try {
      return JSON.parse(json);
    } catch (e) {
      return defaultValue;
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return this._safeParse(data, defaultValue);
  }

  _getObjectFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    return this._safeParse(data, defaultValue);
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

  _parseDateOnly(dateStr) {
    // dateStr format: 'YYYY-MM-DD'
    return new Date(dateStr + 'T00:00:00');
  }

  _calculateNights(checkInDate, checkOutDate) {
    const inDate = (checkInDate instanceof Date) ? checkInDate : this._parseDateOnly(checkInDate);
    const outDate = (checkOutDate instanceof Date) ? checkOutDate : this._parseDateOnly(checkOutDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = (outDate - inDate) / msPerDay;
    return diff > 0 ? diff : 0;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // -------------------- Generic Filter & Sort Helper --------------------

  _filterAndSortEntities(entities, filters, sortBy, entityType) {
    let results = Array.isArray(entities) ? entities.slice() : [];
    filters = filters || {};

    // Basic generic filtering by direct field equality or range
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value == null) return;

      if (key.endsWith('Min') || key.endsWith('Max')) {
        // Range handled below where relevant; skip generic handling
        return;
      }

      results = results.filter((item) => {
        if (Array.isArray(item[key])) {
          // For array fields, require value to be included
          if (Array.isArray(value)) {
            return value.every((v) => item[key].includes(v));
          }
          return item[key].includes(value);
        }
        if (typeof value === 'boolean') {
          return item[key] === value;
        }
        return item[key] === value;
      });
    });

    // Entity-type specific range filters
    if (entityType === 'meeting_room') {
      const { capacityMin, capacityMax } = filters;
      if (capacityMin != null || capacityMax != null) {
        results = results.filter((room) => {
          const min = room.capacity_min != null ? room.capacity_min : 0;
          const max = room.capacity_max != null ? room.capacity_max : 0;
          const withinMin = capacityMin != null ? max >= capacityMin : true;
          const withinMax = capacityMax != null ? min <= capacityMax : true;
          return withinMin && withinMax;
        });
      }
    }

    // Sorting
    if (!sortBy) {
      return results;
    }

    const sort = (arr, comparator) => arr.sort(comparator);

    if (entityType === 'room_type') {
      if (sortBy === 'price_low_to_high') {
        sort(results, (a, b) => (a.base_nightly_rate || 0) - (b.base_nightly_rate || 0));
      } else if (sortBy === 'price_high_to_low') {
        sort(results, (a, b) => (b.base_nightly_rate || 0) - (a.base_nightly_rate || 0));
      } else if (sortBy === 'rating_high_to_low') {
        sort(results, (a, b) => (b.rating || 0) - (a.rating || 0));
      }
    } else if (entityType === 'restaurant') {
      if (sortBy === 'rating_high_to_low') {
        sort(results, (a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === 'name_asc') {
        sort(results, (a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    } else if (entityType === 'activity') {
      if (sortBy === 'rating_high_to_low') {
        sort(results, (a, b) => (b.rating || 0) - (a.rating || 0));
      }
    } else if (entityType === 'offer') {
      if (sortBy === 'discount_high_to_low') {
        sort(results, (a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
      }
    } else if (entityType === 'meeting_room') {
      if (sortBy === 'name_asc') {
        sort(results, (a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    }

    return results;
  }

  // -------------------- Offer Helper --------------------

  _applyOfferToRates(roomType, offer, nights) {
    const baseRate = roomType.base_nightly_rate || 0;
    const discount = offer ? (offer.discount_percentage || 0) : 0;
    const effectiveNightlyRate = discount > 0 ? baseRate * (1 - discount / 100) : baseRate;
    const totalPrice = effectiveNightlyRate * nights;
    return {
      effectiveNightlyRate,
      totalPrice,
      discountPercentage: discount,
      appliedOfferId: offer ? offer.id : null,
      appliedOfferName: offer ? offer.name : null
    };
  }

  // -------------------- Itinerary Helpers --------------------

  _getOrCreateItinerary() {
    const itineraries = this._getFromStorage('itineraries');
    let currentId = localStorage.getItem('current_itinerary_id');
    let itinerary = currentId ? itineraries.find((i) => i.id === currentId) : null;

    if (!itinerary) {
      itinerary = {
        id: this._generateId('itin'),
        name: null,
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        is_saved: false,
        saved_at: null,
        notes: ''
      };
      itineraries.push(itinerary);
      this._saveToStorage('itineraries', itineraries);
      localStorage.setItem('current_itinerary_id', itinerary.id);
    }

    return itinerary;
  }

  _addItemToItinerary(itinerary, params) {
    const items = this._getFromStorage('itinerary_items');
    const item = {
      id: this._generateId('itin_item'),
      itinerary_id: itinerary.id,
      title: params.title,
      source_type: params.source_type,
      source_entity_id: params.source_entity_id,
      start_datetime: params.start_datetime,
      end_datetime: params.end_datetime || null,
      category: params.category || null,
      location: params.location || null,
      notes: params.notes || null
    };
    items.push(item);
    this._saveToStorage('itinerary_items', items);

    // Update itinerary timestamps
    const itineraries = this._getFromStorage('itineraries');
    const idx = itineraries.findIndex((i) => i.id === itinerary.id);
    if (idx !== -1) {
      itineraries[idx].updated_at = this._nowISO();
      this._saveToStorage('itineraries', itineraries);
    }

    return item;
  }

  // -------------------- Comparison Helper --------------------

  _getOrCreateComparisonSet() {
    const sets = this._getFromStorage('room_comparison_sets');
    let set = sets.find((s) => s.is_active);
    if (!set) {
      set = {
        id: this._generateId('room_cmp'),
        room_type_ids: [],
        created_at: this._nowISO(),
        is_active: true
      };
      sets.push(set);
      this._saveToStorage('room_comparison_sets', sets);
    }
    return set;
  }

  // -------------------- Booking Context Helpers --------------------

  _getBookingContextRaw() {
    return this._getObjectFromStorage('booking_context', null);
  }

  _saveBookingContextRaw(ctx) {
    if (!ctx) {
      localStorage.removeItem('booking_context');
      return;
    }
    localStorage.setItem('booking_context', JSON.stringify(ctx));
  }

  _getOrCreateBookingContext(bookingType, bookingId) {
    let ctx = this._getBookingContextRaw();
    // Always update/overwrite the booking context when an explicit booking
    // reference is provided so that new bookings replace older ones.
    if (bookingType && bookingId) {
      ctx = { bookingType, bookingId };
      this._saveBookingContextRaw(ctx);
    }
    return ctx;
  }

  _clearBookingContext() {
    this._saveBookingContextRaw(null);
  }

  // -------------------- Foreign-key Resolution Helpers --------------------

  _resolveMeetingRoomServiceOptions(meetingRoom) {
    if (!meetingRoom) return meetingRoom;
    const serviceOptions = this._getFromStorage('event_service_options');
    const ids = Array.isArray(meetingRoom.available_service_option_ids)
      ? meetingRoom.available_service_option_ids
      : [];
    const resolved = ids.map((id) => serviceOptions.find((s) => s.id === id)).filter(Boolean);
    return Object.assign({}, meetingRoom, { availableServiceOptions: resolved });
  }

  _resolveVirtualTourHotspotRelations(hotspot) {
    if (!hotspot) return hotspot;
    const areas = this._getFromStorage('virtual_tour_areas');
    const categories = this._getFromStorage('hotspot_categories');
    const restaurants = this._getFromStorage('restaurants');
    const meetingRooms = this._getFromStorage('meeting_rooms');
    const spaServices = this._getFromStorage('spa_services');
    const roomTypes = this._getFromStorage('room_types');

    const area = areas.find((a) => a.id === hotspot.area_id) || null;
    const category = categories.find((c) => c.id === hotspot.category_id) || null;
    let linkedEntity = null;
    if (hotspot.linked_entity_type === 'restaurant') {
      linkedEntity = restaurants.find((r) => r.id === hotspot.linked_entity_id) || null;
    } else if (hotspot.linked_entity_type === 'meeting_room') {
      const mr = meetingRooms.find((m) => m.id === hotspot.linked_entity_id) || null;
      linkedEntity = mr ? this._resolveMeetingRoomServiceOptions(mr) : null;
    } else if (hotspot.linked_entity_type === 'spa_service') {
      linkedEntity = spaServices.find((s) => s.id === hotspot.linked_entity_id) || null;
    } else if (hotspot.linked_entity_type === 'room_type') {
      linkedEntity = roomTypes.find((r) => r.id === hotspot.linked_entity_id) || null;
    }

    return Object.assign({}, hotspot, {
      area,
      category,
      linkedEntity
    });
  }

  _resolveStayBookingRelations(booking) {
    if (!booking) return booking;
    const roomTypes = this._getFromStorage('room_types');
    const offers = this._getFromStorage('offers');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || null;
    const appliedOffer = booking.applied_offer_id
      ? offers.find((o) => o.id === booking.applied_offer_id) || null
      : null;
    return Object.assign({}, booking, { roomType, appliedOffer });
  }

  _resolveSpaAppointmentRelations(app) {
    if (!app) return app;
    const spaServices = this._getFromStorage('spa_services');
    const spaService = spaServices.find((s) => s.id === app.spa_service_id) || null;
    return Object.assign({}, app, { spaService });
  }

  _resolveDiningReservationRelations(res) {
    if (!res) return res;
    const restaurants = this._getFromStorage('restaurants');
    const restaurant = restaurants.find((r) => r.id === res.restaurant_id) || null;
    return Object.assign({}, res, { restaurant });
  }

  _resolveMeetingQuoteRelations(q) {
    if (!q) return q;
    const meetingRooms = this._getFromStorage('meeting_rooms');
    const serviceOptions = this._getFromStorage('event_service_options');
    const meetingRoomBase = meetingRooms.find((m) => m.id === q.meeting_room_id) || null;
    const meetingRoom = meetingRoomBase ? this._resolveMeetingRoomServiceOptions(meetingRoomBase) : null;
    const ids = Array.isArray(q.selected_service_option_ids) ? q.selected_service_option_ids : [];
    const selectedServiceOptions = ids.map((id) => serviceOptions.find((s) => s.id === id)).filter(Boolean);
    return Object.assign({}, q, { meetingRoom, selectedServiceOptions });
  }

  // ==================== CORE INTERFACES ====================

  // -------------------- Homepage --------------------

  getHomePageContent() {
    const offers = this._getFromStorage('offers');
    const roomTypes = this._getFromStorage('room_types');
    const activities = this._getFromStorage('activities');
    const restaurants = this._getFromStorage('restaurants');

    const featuredOffers = offers
      .filter((o) => o.is_active !== false)
      .sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0))
      .slice(0, 5);

    const popularRoomTypes = roomTypes
      .filter((r) => r.is_active !== false)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 8);

    const featuredActivities = activities
      .filter((a) => a.is_active !== false)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);

    const featuredRestaurants = restaurants
      .filter((r) => r.is_active !== false)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);

    return {
      featuredOffers,
      popularRoomTypes,
      featuredActivities,
      featuredRestaurants
    };
  }

  // -------------------- Rooms & Suites Search --------------------

  getRoomSearchFilterOptions() {
    const roomTypes = this._getFromStorage('room_types');
    const amenities = this._getFromStorage('amenities');
    const accessibilityFeatures = this._getFromStorage('accessibility_features');

    const viewTypeSet = new Set();
    const roomCategorySet = new Set();
    const floorNumberSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = null;

    roomTypes.forEach((rt) => {
      if (rt.view_type) viewTypeSet.add(rt.view_type);
      if (rt.room_category) roomCategorySet.add(rt.room_category);
      if (typeof rt.floor_number === 'number') floorNumberSet.add(rt.floor_number);
      if (typeof rt.base_nightly_rate === 'number') {
        if (minPrice == null || rt.base_nightly_rate < minPrice) minPrice = rt.base_nightly_rate;
        if (maxPrice == null || rt.base_nightly_rate > maxPrice) maxPrice = rt.base_nightly_rate;
      }
      if (!currency && rt.currency) currency = rt.currency;
    });

    const viewTypes = Array.from(viewTypeSet).map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));
    const roomCategories = Array.from(roomCategorySet).map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));
    const floorNumbers = Array.from(floorNumberSet).sort((a, b) => a - b);

    const priceRange = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      currency: currency || 'USD'
    };

    const sortOptions = [
      { value: 'recommended', label: 'Recommended' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      viewTypes,
      roomCategories,
      amenities,
      accessibilityFeatures,
      floorNumbers,
      priceRange,
      sortOptions
    };
  }

  searchRoomTypes(checkInDate, checkOutDate, adults, children = 0, filters = {}, sortBy = 'recommended', appliedOfferId = null) {
    const roomTypes = this._getFromStorage('room_types');
    const offers = this._getFromStorage('offers');
    const favorites = this._getFromStorage('favorite_items');
    const comparisonSet = this._getOrCreateComparisonSet();

    // Normalize filters to an object to avoid null/undefined issues
    filters = filters || {};

    const nights = this._calculateNights(checkInDate, checkOutDate);
    // Capacity checks are based on adults only; children can share existing bedding
    const totalGuests = adults || 0;

    const viewTypesFilter = filters.viewTypes || [];
    const roomCategoriesFilter = filters.roomCategories || [];
    const minPrice = filters.minPrice != null ? filters.minPrice : null;
    const maxPrice = filters.maxPrice != null ? filters.maxPrice : null;
    const amenityIdsFilter = filters.amenityIds || [];
    const accessibilityFeatureIdsFilter = filters.accessibilityFeatureIds || [];
    const mustHaveFreeWifi = !!filters.mustHaveFreeWifi;
    const mustHaveBalcony = !!filters.mustHaveBalcony;
    const isWheelchairAccessible = !!filters.isWheelchairAccessible;
    const hasRollInShower = !!filters.hasRollInShower;
    const floorNumbersFilter = filters.floorNumbers || [];

    const appliedOffer = appliedOfferId ? offers.find((o) => o.id === appliedOfferId) || null : null;

    let results = roomTypes.filter((rt) => {
      if (rt.is_active === false) return false;
      if (rt.max_guests != null && totalGuests > rt.max_guests) return false;
      if (rt.max_adults != null && adults > rt.max_adults) return false;
      // Only enforce an explicit children limit when greater than zero
      if (rt.max_children != null && rt.max_children > 0 && children > rt.max_children) return false;

      if (viewTypesFilter.length && !viewTypesFilter.includes(rt.view_type)) return false;
      if (roomCategoriesFilter.length && !roomCategoriesFilter.includes(rt.room_category)) return false;
      if (minPrice != null && (rt.base_nightly_rate || 0) < minPrice) return false;
      if (maxPrice != null && (rt.base_nightly_rate || 0) > maxPrice) return false;
      if (mustHaveFreeWifi && !rt.has_free_wifi) return false;
      if (mustHaveBalcony && !rt.has_balcony) return false;
      if (isWheelchairAccessible && !rt.is_wheelchair_accessible) return false;
      if (hasRollInShower && !rt.has_roll_in_shower) return false;
      if (floorNumbersFilter.length && !floorNumbersFilter.includes(rt.floor_number)) return false;

      if (amenityIdsFilter.length) {
        const amenityIds = Array.isArray(rt.amenity_ids) ? rt.amenity_ids : [];
        const hasAll = amenityIdsFilter.every((id) => amenityIds.includes(id));
        if (!hasAll) return false;
      }

      if (accessibilityFeatureIdsFilter.length) {
        const featIds = Array.isArray(rt.accessibility_feature_ids) ? rt.accessibility_feature_ids : [];
        const hasAll = accessibilityFeatureIdsFilter.every((id) => featIds.includes(id));
        if (!hasAll) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => (a.base_nightly_rate || 0) - (b.base_nightly_rate || 0));
    } else if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => (b.base_nightly_rate || 0) - (a.base_nightly_rate || 0));
    } else if (sortBy === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // recommended: rating desc, then price asc
      results.sort((a, b) => {
        const rDiff = (b.rating || 0) - (a.rating || 0);
        if (rDiff !== 0) return rDiff;
        return (a.base_nightly_rate || 0) - (b.base_nightly_rate || 0);
      });
    }

    return results.map((rt) => {
      const baseRate = rt.base_nightly_rate || 0;
      const currency = rt.currency || 'USD';
      let effectiveNightlyRate = baseRate;
      let totalPrice = baseRate * nights;
      let discountPercentage = 0;
      let appliedOfferName = null;
      let appliedOfferResultId = null;

      if (appliedOffer) {
        const offerResult = this._applyOfferToRates(rt, appliedOffer, nights);
        effectiveNightlyRate = offerResult.effectiveNightlyRate;
        totalPrice = offerResult.totalPrice;
        discountPercentage = offerResult.discountPercentage;
        appliedOfferName = offerResult.appliedOfferName;
        appliedOfferResultId = offerResult.appliedOfferId;
      }

      const comparisonSelected = Array.isArray(comparisonSet.room_type_ids)
        ? comparisonSet.room_type_ids.includes(rt.id)
        : false;

      const isFavorited = favorites.some((f) => f.item_type === 'room_type' && f.item_id === rt.id);

      return {
        roomType: rt,
        isAvailable: true, // No per-date inventory model; assume available if passes filters
        effectiveNightlyRate,
        totalPrice,
        currency,
        appliedOfferId: appliedOfferResultId,
        appliedOfferName,
        discountPercentage,
        comparisonSelected,
        isFavorited
      };
    });
  }

  getRoomTypeDetails(roomTypeId) {
    const roomTypes = this._getFromStorage('room_types');
    const amenitiesAll = this._getFromStorage('amenities');
    const featuresAll = this._getFromStorage('accessibility_features');

    const roomType = roomTypes.find((r) => r.id === roomTypeId) || null;
    const amenityIds = roomType && Array.isArray(roomType.amenity_ids) ? roomType.amenity_ids : [];
    const accessibilityFeatureIds = roomType && Array.isArray(roomType.accessibility_feature_ids)
      ? roomType.accessibility_feature_ids
      : [];

    const amenities = amenityIds
      .map((id) => amenitiesAll.find((a) => a.id === id) || null)
      .filter(Boolean);
    const accessibilityFeatures = accessibilityFeatureIds
      .map((id) => featuresAll.find((f) => f.id === id) || null)
      .filter(Boolean);

    return {
      roomType,
      amenities,
      accessibilityFeatures
    };
  }

  selectRoomTypeForBooking(roomTypeId, checkInDate, checkOutDate, adults, children = 0, appliedOfferId = null, source = 'rooms_search') {
    const roomTypes = this._getFromStorage('room_types');
    const offers = this._getFromStorage('offers');
    const bookings = this._getFromStorage('stay_bookings');

    const roomType = roomTypes.find((r) => r.id === roomTypeId);
    if (!roomType) {
      return { success: false, message: 'Room type not found', stayBooking: null };
    }

    // Capacity checks are based on adults only; children can share existing bedding
    const totalGuests = adults || 0;
    if (roomType.max_guests != null && totalGuests > roomType.max_guests) {
      return { success: false, message: 'Guest count exceeds room capacity', stayBooking: null };
    }

    const nights = this._calculateNights(checkInDate, checkOutDate);
    const offer = appliedOfferId ? offers.find((o) => o.id === appliedOfferId) || null : null;
    const baseRate = roomType.base_nightly_rate || 0;
    let discountPercentage = 0;

    if (offer) {
      // Reuse eligibility logic
      const eligibility = this.getOfferBookingEligibility(
        offer.id,
        checkInDate,
        checkOutDate,
        adults,
        children
      );
      if (eligibility.isEligible) {
        discountPercentage = eligibility.discountPercentage || offer.discount_percentage || 0;
      }
    }

    const effectiveRate = discountPercentage > 0 ? baseRate * (1 - discountPercentage / 100) : baseRate;
    const totalPrice = effectiveRate * nights;

    const booking = {
      id: this._generateId('stay'),
      room_type_id: roomType.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights,
      adults,
      children,
      base_nightly_rate: baseRate,
      applied_offer_id: offer ? offer.id : null,
      discount_percentage: discountPercentage,
      total_price: totalPrice,
      currency: roomType.currency || 'USD',
      status: 'pending',
      source: source || 'rooms_search',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('stay_bookings', bookings);

    // Update booking context
    this._getOrCreateBookingContext('stay', booking.id);

    return {
      success: true,
      message: 'Room selected for booking',
      stayBooking: booking
    };
  }

  toggleRoomComparisonSelection(roomTypeId, selected) {
    const roomTypes = this._getFromStorage('room_types');
    const comparisonSet = this._getOrCreateComparisonSet();

    const ids = Array.isArray(comparisonSet.room_type_ids) ? comparisonSet.room_type_ids.slice() : [];
    const existsIndex = ids.indexOf(roomTypeId);

    if (selected) {
      if (existsIndex === -1) ids.push(roomTypeId);
    } else {
      if (existsIndex !== -1) ids.splice(existsIndex, 1);
    }

    comparisonSet.room_type_ids = ids;

    const sets = this._getFromStorage('room_comparison_sets');
    const idx = sets.findIndex((s) => s.id === comparisonSet.id);
    if (idx !== -1) {
      sets[idx] = comparisonSet;
      this._saveToStorage('room_comparison_sets', sets);
    }

    const comparisonRoomTypes = ids
      .map((id) => roomTypes.find((r) => r.id === id) || null)
      .filter(Boolean);

    return {
      comparisonSet,
      roomTypes: comparisonRoomTypes
    };
  }

  getRoomComparisonDetails() {
    const roomTypes = this._getFromStorage('room_types');
    const comparisonSet = this._getOrCreateComparisonSet();
    const ids = Array.isArray(comparisonSet.room_type_ids) ? comparisonSet.room_type_ids : [];

    const comparisonRoomTypes = ids
      .map((id) => roomTypes.find((r) => r.id === id) || null)
      .filter(Boolean);

    return {
      comparisonSet,
      roomTypes: comparisonRoomTypes
    };
  }

  // -------------------- Favorites / Shortlist --------------------

  addFavoriteItem(itemType, itemId, source) {
    const favorites = this._getFromStorage('favorite_items');

    // Avoid duplicates of same itemType/itemId
    const existing = favorites.find((f) => f.item_type === itemType && f.item_id === itemId);
    if (existing) {
      return existing;
    }

    const fav = {
      id: this._generateId('fav'),
      item_type: itemType,
      item_id: itemId,
      created_at: this._nowISO(),
      source: source || 'other'
    };

    favorites.push(fav);
    this._saveToStorage('favorite_items', favorites);

    return fav;
  }

  removeFavoriteItem(favoriteItemId) {
    const favorites = this._getFromStorage('favorite_items');
    const idx = favorites.findIndex((f) => f.id === favoriteItemId);
    if (idx === -1) {
      return { success: false, message: 'Favorite item not found' };
    }
    favorites.splice(idx, 1);
    this._saveToStorage('favorite_items', favorites);
    return { success: true, message: 'Favorite item removed' };
  }

  getFavoritesList() {
    const favorites = this._getFromStorage('favorite_items');
    const roomTypes = this._getFromStorage('room_types');
    const restaurants = this._getFromStorage('restaurants');
    const spaServices = this._getFromStorage('spa_services');
    const activities = this._getFromStorage('activities');
    const meetingRooms = this._getFromStorage('meeting_rooms');

    const favoriteRooms = favorites
      .filter((f) => f.item_type === 'room_type')
      .map((f) => ({
        favorite: f,
        roomType: roomTypes.find((rt) => rt.id === f.item_id) || null
      }));

    const favoriteRestaurants = favorites
      .filter((f) => f.item_type === 'restaurant')
      .map((f) => ({
        favorite: f,
        restaurant: restaurants.find((r) => r.id === f.item_id) || null
      }));

    const favoriteSpaServices = favorites
      .filter((f) => f.item_type === 'spa_service')
      .map((f) => ({
        favorite: f,
        spaService: spaServices.find((s) => s.id === f.item_id) || null
      }));

    const favoriteActivities = favorites
      .filter((f) => f.item_type === 'activity')
      .map((f) => ({
        favorite: f,
        activity: activities.find((a) => a.id === f.item_id) || null
      }));

    const favoriteMeetingRooms = favorites
      .filter((f) => f.item_type === 'meeting_room')
      .map((f) => {
        const base = meetingRooms.find((m) => m.id === f.item_id) || null;
        return {
          favorite: f,
          meetingRoom: base ? this._resolveMeetingRoomServiceOptions(base) : null
        };
      });

    return {
      favoriteRooms,
      favoriteRestaurants,
      favoriteSpaServices,
      favoriteActivities,
      favoriteMeetingRooms
    };
  }

  // -------------------- Virtual Tour --------------------

  getVirtualTourAreas(tourMode) {
    const areas = this._getFromStorage('virtual_tour_areas');
    const filtered = tourMode
      ? areas.filter((a) => a.tour_mode === tourMode)
      : areas.slice();
    return filtered;
  }

  getVirtualTourAreaDetails(areaId) {
    const areas = this._getFromStorage('virtual_tour_areas');
    const categories = this._getFromStorage('hotspot_categories');
    const hotspotsAll = this._getFromStorage('virtual_tour_hotspots');

    const area = areas.find((a) => a.id === areaId) || null;
    const hotspots = hotspotsAll.filter((h) => h.area_id === areaId && h.is_active !== false);

    const hotspotCategories = categories.filter((cat) =>
      hotspots.some((h) => h.category_id === cat.id)
    );

    const resolvedHotspots = hotspots.map((h) => this._resolveVirtualTourHotspotRelations(h));

    return {
      area,
      hotspotCategories,
      hotspots: resolvedHotspots
    };
  }

  getVirtualTourHotspotDetails(hotspotId) {
    const hotspots = this._getFromStorage('virtual_tour_hotspots');
    const hotspot = hotspots.find((h) => h.id === hotspotId) || null;
    if (!hotspot) {
      return {
        hotspot: null,
        linkedEntityType: null,
        linkedEntityName: null,
        linkedEntityDescription: null,
        imageUrl: null
      };
    }

    const resolvedHotspot = this._resolveVirtualTourHotspotRelations(hotspot);

    let linkedEntityName = null;
    let linkedEntityDescription = null;
    let imageUrl = null;

    if (resolvedHotspot.linkedEntity) {
      linkedEntityName = resolvedHotspot.linkedEntity.name || null;
      linkedEntityDescription = resolvedHotspot.linkedEntity.description || null;
      imageUrl = resolvedHotspot.linkedEntity.image_url || resolvedHotspot.linkedEntity.imageUrl || null;
    }

    return {
      hotspot: resolvedHotspot,
      linkedEntityType: hotspot.linked_entity_type,
      linkedEntityName,
      linkedEntityDescription,
      imageUrl
    };
  }

  addHotspotToItinerary(hotspotId, startDatetime, notes = null) {
    const itinerary = this._getOrCreateItinerary();
    const hotspots = this._getFromStorage('virtual_tour_hotspots');
    const areas = this._getFromStorage('virtual_tour_areas');
    const hotspot = hotspots.find((h) => h.id === hotspotId) || null;

    const area = hotspot ? areas.find((a) => a.id === hotspot.area_id) || null : null;
    const title = hotspot ? hotspot.name : 'Hotspot';
    const location = area ? area.name : null;

    const item = this._addItemToItinerary(itinerary, {
      title,
      source_type: 'virtual_tour_hotspot',
      source_entity_id: hotspotId,
      start_datetime: startDatetime,
      end_datetime: null,
      category: null,
      location,
      notes
    });

    return {
      itinerary,
      itineraryItem: item
    };
  }

  // -------------------- Spa & Wellness --------------------

  getSpaOverview() {
    const spaServices = this._getFromStorage('spa_services');
    const active = spaServices.filter((s) => s.is_active !== false);

    const categorySet = new Set();
    active.forEach((s) => {
      if (s.category) categorySet.add(s.category);
    });

    const categories = Array.from(categorySet);

    const featuredServices = active
      .slice() // simple heuristic: highest priced as "featured"
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 6);

    return {
      categories,
      featuredServices
    };
  }

  searchSpaServices(filters = {}) {
    const spaServices = this._getFromStorage('spa_services');
    let results = spaServices.slice();

    if (filters.category) {
      results = results.filter((s) => s.category === filters.category);
    }

    if (filters.minDurationMinutes != null) {
      results = results.filter((s) => (s.duration_minutes || 0) >= filters.minDurationMinutes);
    }

    if (filters.maxDurationMinutes != null) {
      results = results.filter((s) => (s.duration_minutes || 0) <= filters.maxDurationMinutes);
    }

    if (filters.isActiveOnly) {
      results = results.filter((s) => s.is_active !== false);
    }

    return results;
  }

  getSpaServiceDetails(spaServiceId) {
    const spaServices = this._getFromStorage('spa_services');
    return spaServices.find((s) => s.id === spaServiceId) || null;
  }

  getSpaServiceAvailability(spaServiceId, date) {
    // If a dedicated availability structure exists in storage, use it;
    // otherwise simulate generic hourly availability (computed, not stored).
    const availabilityRecords = this._getFromStorage('spa_availability');
    const specific = availabilityRecords.find(
      (r) => r.spa_service_id === spaServiceId && r.date === date
    );

    if (specific && Array.isArray(specific.timeSlots)) {
      return { timeSlots: this._clone(specific.timeSlots) };
    }

    // Simulated: every hour from 09:00 to 18:00 available
    const baseDate = this._parseDateOnly(date);
    const timeSlots = [];
    for (let hour = 9; hour <= 18; hour++) {
      const dt = new Date(baseDate.getTime());
      dt.setHours(hour, 0, 0, 0);
      timeSlots.push({ startDatetime: dt.toISOString(), isAvailable: true });
    }

    return { timeSlots };
  }

  scheduleSpaAppointment(spaServiceId, appointmentDatetime, therapistPreference) {
    const spaServices = this._getFromStorage('spa_services');
    const spaAppointments = this._getFromStorage('spa_appointments');

    const spaService = spaServices.find((s) => s.id === spaServiceId);
    if (!spaService) {
      return { spaAppointment: null };
    }

    const appointment = {
      id: this._generateId('spa_appt'),
      spa_service_id: spaServiceId,
      appointment_datetime: appointmentDatetime,
      duration_minutes: spaService.duration_minutes || 60,
      therapist_preference: therapistPreference || 'no_preference',
      price: spaService.price || 0,
      currency: spaService.currency || 'USD',
      status: 'pending',
      created_at: this._nowISO()
    };

    spaAppointments.push(appointment);
    this._saveToStorage('spa_appointments', spaAppointments);

    this._getOrCreateBookingContext('spa_appointment', appointment.id);

    return { spaAppointment: appointment };
  }

  addSpaServiceToItinerary(spaServiceId, startDatetime, notes = null) {
    const itinerary = this._getOrCreateItinerary();
    const spaServices = this._getFromStorage('spa_services');
    const spaService = spaServices.find((s) => s.id === spaServiceId) || null;

    const title = spaService ? spaService.name : 'Spa Service';

    const item = this._addItemToItinerary(itinerary, {
      title,
      source_type: 'spa_service',
      source_entity_id: spaServiceId,
      start_datetime: startDatetime,
      end_datetime: null,
      category: 'spa',
      location: null,
      notes
    });

    return {
      itinerary,
      itineraryItem: item
    };
  }

  // -------------------- Dining & Restaurants --------------------

  getDiningOverview() {
    const restaurants = this._getFromStorage('restaurants');
    const active = restaurants.filter((r) => r.is_active !== false);
    const featuredRestaurants = active
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
    return { featuredRestaurants };
  }

  getRestaurantFilterOptions() {
    const restaurants = this._getFromStorage('restaurants');
    const cuisineSet = new Set();
    restaurants.forEach((r) => {
      if (r.cuisine_type) cuisineSet.add(r.cuisine_type);
    });

    const cuisineTypes = Array.from(cuisineSet);

    const dietaryFilters = [
      { key: 'vegetarian_options', label: 'Vegetarian options' }
    ];

    const sortOptions = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'name_asc', label: 'Name A-Z' }
    ];

    return {
      cuisineTypes,
      dietaryFilters,
      sortOptions
    };
  }

  searchRestaurants(filters = {}, sortBy = 'rating_high_to_low') {
    const restaurants = this._getFromStorage('restaurants');
    let results = restaurants.slice();

    if (filters.hasVegetarianOptions) {
      results = results.filter((r) => r.has_vegetarian_options);
    }

    if (Array.isArray(filters.cuisineTypes) && filters.cuisineTypes.length) {
      results = results.filter((r) => filters.cuisineTypes.includes(r.cuisine_type));
    }

    if (filters.minRating != null) {
      results = results.filter((r) => (r.rating || 0) >= filters.minRating);
    }

    if (filters.isActiveOnly) {
      results = results.filter((r) => r.is_active !== false);
    }

    results = this._filterAndSortEntities(results, {}, sortBy, 'restaurant');

    return results;
  }

  getRestaurantDetails(restaurantId) {
    const restaurants = this._getFromStorage('restaurants');
    return restaurants.find((r) => r.id === restaurantId) || null;
  }

  createDiningReservation(restaurantId, reservationDatetime, partySize, seatingPreference, specialRequests = null) {
    const restaurants = this._getFromStorage('restaurants');
    const reservations = this._getFromStorage('dining_reservations');

    const restaurant = restaurants.find((r) => r.id === restaurantId);
    if (!restaurant) {
      return { diningReservation: null };
    }

    const reservation = {
      id: this._generateId('dine_res'),
      restaurant_id: restaurantId,
      reservation_datetime: reservationDatetime,
      party_size: partySize,
      seating_preference: seatingPreference || 'no_preference',
      status: 'pending',
      created_at: this._nowISO()
    };

    reservations.push(reservation);
    this._saveToStorage('dining_reservations', reservations);

    this._getOrCreateBookingContext('dining_reservation', reservation.id);

    // Store specialRequests as part of booking_guest_details later if needed
    if (specialRequests) {
      const details = this._getFromStorage('booking_guest_details');
      details.push({
        id: this._generateId('guest_det'),
        booking_type: 'dining_reservation',
        booking_id: reservation.id,
        special_requests: specialRequests
      });
      this._saveToStorage('booking_guest_details', details);
    }

    return { diningReservation: reservation };
  }

  addRestaurantToItinerary(restaurantId, startDatetime, notes = null) {
    const itinerary = this._getOrCreateItinerary();
    const restaurants = this._getFromStorage('restaurants');
    const restaurant = restaurants.find((r) => r.id === restaurantId) || null;

    const title = restaurant ? restaurant.name : 'Restaurant';

    const item = this._addItemToItinerary(itinerary, {
      title,
      source_type: 'restaurant',
      source_entity_id: restaurantId,
      start_datetime: startDatetime,
      end_datetime: null,
      category: 'dining',
      location: null,
      notes
    });

    return {
      itinerary,
      itineraryItem: item
    };
  }

  // -------------------- Activities & Experiences --------------------

  getActivitiesOverview() {
    const activities = this._getFromStorage('activities');
    const active = activities.filter((a) => a.is_active !== false);

    const categorySet = new Set();
    active.forEach((a) => {
      if (a.category) categorySet.add(a.category);
    });

    const categories = Array.from(categorySet);

    const featuredActivities = active
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 8);

    return {
      featuredActivities,
      categories
    };
  }

  getActivityFilterOptions() {
    const activities = this._getFromStorage('activities');

    // Predefined age ranges including the required 6-12 range
    const ageRanges = [
      { key: 'ages_0_5', label: 'Ages 0-5', minAge: 0, maxAge: 5 },
      { key: 'ages_6_12', label: 'Ages 6-12', minAge: 6, maxAge: 12 },
      { key: 'ages_13_17', label: 'Ages 13-17', minAge: 13, maxAge: 17 },
      { key: 'ages_18_plus', label: 'Ages 18+', minAge: 18, maxAge: 120 }
    ];

    let minRating = null;
    let maxRating = null;
    activities.forEach((a) => {
      if (typeof a.rating === 'number') {
        if (minRating == null || a.rating < minRating) minRating = a.rating;
        if (maxRating == null || a.rating > maxRating) maxRating = a.rating;
      }
    });

    const ratingRange = {
      min: minRating != null ? minRating : 0,
      max: maxRating != null ? maxRating : 5
    };

    const sortOptions = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      ageRanges,
      ratingRange,
      sortOptions
    };
  }

  searchActivities(filters = {}, sortBy = 'rating_high_to_low') {
    const activities = this._getFromStorage('activities');
    let results = activities.slice();

    if (filters.category) {
      results = results.filter((a) => a.category === filters.category);
    }

    if (filters.minAge != null || filters.maxAge != null) {
      const filterMin = filters.minAge != null ? filters.minAge : 0;
      const filterMax = filters.maxAge != null ? filters.maxAge : 200;
      results = results.filter((a) => {
        const actMin = a.min_age != null ? a.min_age : 0;
        const actMax = a.max_age != null && a.max_age > 0 ? a.max_age : 200;
        // Age ranges overlap if the activity's allowed range intersects the requested range
        return actMin <= filterMax && actMax >= filterMin;
      });
    }

    if (filters.minRating != null) {
      results = results.filter((a) => (a.rating || 0) >= filters.minRating);
    }

    if (filters.isFamilyFriendly) {
      results = results.filter((a) => a.is_family_friendly);
    }

    results = this._filterAndSortEntities(results, {}, sortBy, 'activity');

    return results;
  }

  getActivityDetails(activityId) {
    const activities = this._getFromStorage('activities');
    return activities.find((a) => a.id === activityId) || null;
  }

  addActivityToItinerary(activityId, startDatetime, notes = null) {
    const itinerary = this._getOrCreateItinerary();
    const activities = this._getFromStorage('activities');
    const activity = activities.find((a) => a.id === activityId) || null;

    const title = activity ? activity.name : 'Activity';
    const location = activity ? activity.location || null : null;

    const item = this._addItemToItinerary(itinerary, {
      title,
      source_type: 'activity',
      source_entity_id: activityId,
      start_datetime: startDatetime,
      end_datetime: null,
      category: 'activity',
      location,
      notes
    });

    return {
      itinerary,
      itineraryItem: item
    };
  }

  // -------------------- Offers & Deals --------------------

  listActiveOffers(filters = {}) {
    const offers = this._getFromStorage('offers');
    let results = offers.slice();

    if (filters.isActiveOnly) {
      results = results.filter((o) => o.is_active !== false);
    }

    if (filters.isLongStayOnly) {
      results = results.filter((o) => o.is_long_stay);
    }

    if (filters.minDiscountPercentage != null) {
      results = results.filter((o) => (o.discount_percentage || 0) >= filters.minDiscountPercentage);
    }

    // Sort by discount desc by default
    results = this._filterAndSortEntities(results, {}, 'discount_high_to_low', 'offer');

    return results;
  }

  getOfferDetails(offerId) {
    const offers = this._getFromStorage('offers');
    return offers.find((o) => o.id === offerId) || null;
  }

  getOfferBookingEligibility(offerId, checkInDate, checkOutDate, adults, children = 0) {
    const offers = this._getFromStorage('offers');
    const offer = offers.find((o) => o.id === offerId) || null;
    if (!offer) {
      return {
        isEligible: false,
        nights: 0,
        requiredMinNights: 0,
        discountPercentage: 0,
        message: 'Offer not found'
      };
    }

    const nights = this._calculateNights(checkInDate, checkOutDate);
    const requiredMinNights = offer.min_nights || 0;

    let isEligible = true;
    let message = 'Offer is applicable.';

    if (requiredMinNights && nights < requiredMinNights) {
      isEligible = false;
      message = `Minimum stay of ${requiredMinNights} nights required.`;
    }

    if (offer.max_nights && nights > offer.max_nights) {
      isEligible = false;
      message = `Maximum stay of ${offer.max_nights} nights exceeded.`;
    }

    if (offer.valid_from || offer.valid_to) {
      const ci = this._parseDateOnly(checkInDate);
      const co = this._parseDateOnly(checkOutDate);
      if (offer.valid_from) {
        const from = new Date(offer.valid_from);
        if (co < from) {
          isEligible = false;
          message = 'Stay dates are before offer validity.';
        }
      }
      if (offer.valid_to) {
        const to = new Date(offer.valid_to);
        if (ci > to) {
          isEligible = false;
          message = 'Stay dates are after offer validity.';
        }
      }
    }

    const discountPercentage = isEligible ? offer.discount_percentage || 0 : 0;

    return {
      isEligible,
      nights,
      requiredMinNights,
      discountPercentage,
      message
    };
  }

  // -------------------- Events & Meetings --------------------

  getEventsOverview() {
    const meetingRooms = this._getFromStorage('meeting_rooms');
    const active = meetingRooms.filter((m) => m.is_active !== false);

    const featuredMeetingRooms = active
      .slice()
      .sort((a, b) => (b.capacity_max || 0) - (a.capacity_max || 0))
      .slice(0, 6)
      .map((m) => this._resolveMeetingRoomServiceOptions(m));

    return { featuredMeetingRooms };
  }

  searchMeetingRooms(filters = {}) {
    const meetingRooms = this._getFromStorage('meeting_rooms');
    let results = meetingRooms.slice();

    const capacityFilters = {
      capacityMin: filters.capacityMin,
      capacityMax: filters.capacityMax
    };

    if (filters.isActiveOnly) {
      results = results.filter((m) => m.is_active !== false);
    }

    // Capacity range
    results = this._filterAndSortEntities(results, capacityFilters, null, 'meeting_room');

    if (Array.isArray(filters.layoutOptions) && filters.layoutOptions.length) {
      results = results.filter((m) => {
        const layouts = Array.isArray(m.layout_options) ? m.layout_options : [];
        return filters.layoutOptions.every((opt) => layouts.includes(opt));
      });
    }

    // Sort by name
    results = this._filterAndSortEntities(results, {}, 'name_asc', 'meeting_room');

    return results.map((m) => this._resolveMeetingRoomServiceOptions(m));
  }

  getMeetingRoomDetails(meetingRoomId) {
    const meetingRooms = this._getFromStorage('meeting_rooms');
    const serviceOptions = this._getFromStorage('event_service_options');

    const meetingRoom = meetingRooms.find((m) => m.id === meetingRoomId) || null;
    const availableServiceOptions = meetingRoom
      ? (Array.isArray(meetingRoom.available_service_option_ids)
          ? meetingRoom.available_service_option_ids
          : []
        ).map((id) => serviceOptions.find((s) => s.id === id) || null)
        .filter(Boolean)
      : [];

    return {
      meetingRoom,
      availableServiceOptions
    };
  }

  submitMeetingQuoteRequest(
    meetingRoomId,
    eventName,
    attendees,
    startDatetime,
    endDatetime,
    selectedServiceOptionIds = [],
    requiresProjector = false,
    requiresCoffeeBreakCatering = false,
    contactEmail,
    contactPhone = null,
    notes = null
  ) {
    const meetingRooms = this._getFromStorage('meeting_rooms');
    const meetingRoom = meetingRooms.find((m) => m.id === meetingRoomId);
    if (!meetingRoom) {
      return null;
    }

    const quoteRequests = this._getFromStorage('meeting_quote_requests');

    const quote = {
      id: this._generateId('mtg_quote'),
      meeting_room_id: meetingRoomId,
      event_name: eventName,
      attendees,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      selected_service_option_ids: Array.isArray(selectedServiceOptionIds)
        ? selectedServiceOptionIds
        : [],
      requires_projector: !!requiresProjector,
      requires_coffee_break_catering: !!requiresCoffeeBreakCatering,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      status: 'submitted',
      notes: notes || null,
      created_at: this._nowISO()
    };

    quoteRequests.push(quote);
    this._saveToStorage('meeting_quote_requests', quoteRequests);

    this._getOrCreateBookingContext('meeting_quote', quote.id);

    return quote;
  }

  // -------------------- Itinerary --------------------

  getItinerary() {
    const itinerary = this._getOrCreateItinerary();
    const itemsAll = this._getFromStorage('itinerary_items');
    const items = itemsAll.filter((i) => i.itinerary_id === itinerary.id);

    // Order by start_datetime
    items.sort((a, b) => {
      const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
      const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
      return da - db;
    });

    const hotspots = this._getFromStorage('virtual_tour_hotspots');
    const activities = this._getFromStorage('activities');
    const spaServices = this._getFromStorage('spa_services');
    const restaurants = this._getFromStorage('restaurants');
    const meetingRooms = this._getFromStorage('meeting_rooms');

    const itemsWithSummary = items.map((item) => {
      let sourceSummary = { sourceType: item.source_type, name: null, location: item.location || null };
      if (item.source_type === 'virtual_tour_hotspot') {
        const h = hotspots.find((x) => x.id === item.source_entity_id) || null;
        sourceSummary.name = h ? h.name : null;
      } else if (item.source_type === 'activity') {
        const a = activities.find((x) => x.id === item.source_entity_id) || null;
        sourceSummary.name = a ? a.name : null;
        sourceSummary.location = a ? a.location || sourceSummary.location : sourceSummary.location;
      } else if (item.source_type === 'spa_service') {
        const s = spaServices.find((x) => x.id === item.source_entity_id) || null;
        sourceSummary.name = s ? s.name : null;
      } else if (item.source_type === 'restaurant') {
        const r = restaurants.find((x) => x.id === item.source_entity_id) || null;
        sourceSummary.name = r ? r.name : null;
      } else if (item.source_type === 'meeting_room') {
        const m = meetingRooms.find((x) => x.id === item.source_entity_id) || null;
        sourceSummary.name = m ? m.name : null;
        sourceSummary.location = m ? m.location || sourceSummary.location : sourceSummary.location;
      }

      return { item, sourceSummary };
    });

    return {
      itinerary,
      items: itemsWithSummary
    };
  }

  updateItineraryItem(itineraryItemId, startDatetime = null, endDatetime = null, notes = null) {
    const items = this._getFromStorage('itinerary_items');
    const idx = items.findIndex((i) => i.id === itineraryItemId);
    if (idx === -1) {
      return null;
    }

    if (startDatetime != null) items[idx].start_datetime = startDatetime;
    if (endDatetime != null) items[idx].end_datetime = endDatetime;
    if (notes != null) items[idx].notes = notes;

    this._saveToStorage('itinerary_items', items);

    // Update itinerary's updated_at
    const itineraries = this._getFromStorage('itineraries');
    const itinIdx = itineraries.findIndex((i) => i.id === items[idx].itinerary_id);
    if (itinIdx !== -1) {
      itineraries[itinIdx].updated_at = this._nowISO();
      this._saveToStorage('itineraries', itineraries);
    }

    return items[idx];
  }

  removeItineraryItem(itineraryItemId) {
    const items = this._getFromStorage('itinerary_items');
    const idx = items.findIndex((i) => i.id === itineraryItemId);
    if (idx === -1) {
      return { success: false };
    }

    const removed = items.splice(idx, 1)[0];
    this._saveToStorage('itinerary_items', items);

    if (removed) {
      const itineraries = this._getFromStorage('itineraries');
      const itinIdx = itineraries.findIndex((i) => i.id === removed.itinerary_id);
      if (itinIdx !== -1) {
        itineraries[itinIdx].updated_at = this._nowISO();
        this._saveToStorage('itineraries', itineraries);
      }
    }

    return { success: true };
  }

  saveItinerary(name = null, notes = null) {
    const itinerary = this._getOrCreateItinerary();
    const itineraries = this._getFromStorage('itineraries');
    const idx = itineraries.findIndex((i) => i.id === itinerary.id);
    if (idx === -1) {
      return itinerary;
    }

    if (name != null) itineraries[idx].name = name;
    if (notes != null) itineraries[idx].notes = notes;
    itineraries[idx].is_saved = true;
    itineraries[idx].saved_at = this._nowISO();
    itineraries[idx].updated_at = this._nowISO();

    this._saveToStorage('itineraries', itineraries);

    return itineraries[idx];
  }

  // -------------------- Booking Context & Guest Details --------------------

  getCurrentBookingContext() {
    const ctx = this._getBookingContextRaw();
    if (!ctx || !ctx.bookingType || !ctx.bookingId) {
      return {
        hasPendingBooking: false,
        bookingType: null,
        stayBooking: null,
        spaAppointment: null,
        diningReservation: null,
        meetingQuoteRequest: null
      };
    }

    let stayBooking = null;
    let spaAppointment = null;
    let diningReservation = null;
    let meetingQuoteRequest = null;

    if (ctx.bookingType === 'stay') {
      const bookings = this._getFromStorage('stay_bookings');
      const raw = bookings.find((b) => b.id === ctx.bookingId) || null;
      stayBooking = this._resolveStayBookingRelations(raw);
    } else if (ctx.bookingType === 'spa_appointment') {
      const appts = this._getFromStorage('spa_appointments');
      const raw = appts.find((a) => a.id === ctx.bookingId) || null;
      spaAppointment = this._resolveSpaAppointmentRelations(raw);
    } else if (ctx.bookingType === 'dining_reservation') {
      const res = this._getFromStorage('dining_reservations');
      const raw = res.find((r) => r.id === ctx.bookingId) || null;
      diningReservation = this._resolveDiningReservationRelations(raw);
    } else if (ctx.bookingType === 'meeting_quote') {
      const quotes = this._getFromStorage('meeting_quote_requests');
      const raw = quotes.find((q) => q.id === ctx.bookingId) || null;
      meetingQuoteRequest = this._resolveMeetingQuoteRelations(raw);
    }

    return {
      hasPendingBooking: !!ctx.bookingType && !!ctx.bookingId,
      bookingType: ctx.bookingType,
      stayBooking,
      spaAppointment,
      diningReservation,
      meetingQuoteRequest
    };
  }

  submitGuestDetails(
    bookingType,
    bookingId,
    guestName,
    guestEmail,
    guestPhone = null,
    specialRequests = null,
    accessibilityNotes = null
  ) {
    if (!bookingType || !bookingId) {
      return { success: false, message: 'Missing booking reference' };
    }

    // Persist guest details separately
    const details = this._getFromStorage('booking_guest_details');
    details.push({
      id: this._generateId('guest_det'),
      booking_type: bookingType,
      booking_id: bookingId,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      special_requests: specialRequests,
      accessibility_notes: accessibilityNotes,
      created_at: this._nowISO()
    });
    this._saveToStorage('booking_guest_details', details);

    // Update booking status where applicable
    if (bookingType === 'stay') {
      const bookings = this._getFromStorage('stay_bookings');
      const idx = bookings.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        bookings[idx].status = 'confirmed';
        this._saveToStorage('stay_bookings', bookings);
      }
    } else if (bookingType === 'spa_appointment') {
      const appts = this._getFromStorage('spa_appointments');
      const idx = appts.findIndex((a) => a.id === bookingId);
      if (idx !== -1) {
        appts[idx].status = 'confirmed';
        this._saveToStorage('spa_appointments', appts);
      }
    } else if (bookingType === 'dining_reservation') {
      const res = this._getFromStorage('dining_reservations');
      const idx = res.findIndex((r) => r.id === bookingId);
      if (idx !== -1) {
        res[idx].status = 'confirmed';
        this._saveToStorage('dining_reservations', res);
      }
    } else if (bookingType === 'meeting_quote') {
      // Keep status as submitted; guest details do not change quote status here.
    }

    // Clear booking context after submission
    this._clearBookingContext();

    return {
      success: true,
      message: 'Guest details submitted successfully'
    };
  }

  // -------------------- Resort Info / Contact / FAQ / Policies / Accessibility --------------------

  getResortOverview() {
    // Use stored overview if provided; otherwise return empty structure
    const overview = this._getObjectFromStorage('resort_overview', null);
    if (overview) return overview;

    return {
      headline: '',
      description: '',
      highlights: [],
      awardsAndRecognition: [],
      sustainabilityNotes: ''
    };
  }

  getContactInfo() {
    const info = this._getObjectFromStorage('contact_info', null);
    if (info) return info;

    return {
      phoneNumber: '',
      emailAddress: '',
      physicalAddress: '',
      coordinates: {
        latitude: 0,
        longitude: 0
      }
    };
  }

  submitContactForm(name, email, subject, message, topic = null) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      topic: topic || null,
      created_at: this._nowISO()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Inquiry submitted successfully'
    };
  }

  getFaqList() {
    const faqs = this._getFromStorage('faq_list');
    return faqs;
  }

  getPolicies() {
    const policies = this._getObjectFromStorage('policies', null);
    if (policies) return policies;

    return {
      bookingPolicies: '',
      cancellationPolicies: '',
      privacyPolicy: '',
      termsAndConditions: ''
    };
  }

  getAccessibilityOverview() {
    const stored = this._getObjectFromStorage('accessibility_overview', null);
    if (stored) return stored;

    const roomTypes = this._getFromStorage('room_types');
    const accessibleRoomTypes = roomTypes.filter((r) => r.is_wheelchair_accessible || r.has_roll_in_shower);

    return {
      overview: '',
      roomAccessibilitySummary: '',
      accessibleRoomTypes,
      accessibleRoutes: [],
      contactInstructions: ''
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
