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
    this._idPrefixCounterKey = 'idCounter';
    if (!localStorage.getItem(this._idPrefixCounterKey)) {
      localStorage.setItem(this._idPrefixCounterKey, '1000');
    }
  }

  // ==========================
  // Storage helpers
  // ==========================
  _initStorage() {
    const tableKeys = [
      'destinations',
      'landmarks',
      'hotels',
      'hotel_room_types',
      'favorite_hotels',
      'hotel_booking_requests',
      'hotel_comparison_lists',
      'attractions',
      'trip_itineraries',
      'itinerary_items',
      'events',
      'event_registrations',
      'packages',
      'package_inquiries',
      'restaurants',
      'restaurant_reservations',
      'membership_plans',
      'membership_applications',
      'profile_notes',
      // support/association/faq/single-user meta
      'support_contact_requests'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Optional single-object configs; do not pre-populate with mock text
    if (!localStorage.getItem('association_info')) {
      localStorage.setItem(
        'association_info',
        JSON.stringify({
          mission: '',
          goals: '',
          history: '',
          governance: '',
          partner_networks: '',
          benefits_for_travelers: '',
          benefits_for_businesses: '',
          benefits_for_members: ''
        })
      );
    }

    if (!localStorage.getItem('support_info')) {
      localStorage.setItem(
        'support_info',
        JSON.stringify({
          support_email: '',
          support_phone: '',
          support_hours: ''
        })
      );
    }

    if (!localStorage.getItem('faq_list')) {
      localStorage.setItem('faq_list', JSON.stringify([]));
    }

    if (!localStorage.getItem('active_itinerary_id')) {
      localStorage.setItem('active_itinerary_id', '');
    }

    if (!localStorage.getItem('active_comparison_list_id')) {
      localStorage.setItem('active_comparison_list_id', '');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem(this._idPrefixCounterKey) || '1000', 10);
    const next = current + 1;
    localStorage.setItem(this._idPrefixCounterKey, String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _monthLabel(value) {
    // value: 'YYYY-MM'
    if (!value || typeof value !== 'string' || value.length < 7) return value || '';
    const [y, m] = value.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    const names = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    const monthName = names[monthIndex] || m;
    return monthName + ' ' + y;
  }

  _persistUserState() {
    // In this implementation, all state changes are written immediately
    // to localStorage in each method. This helper exists to conform to
    // the interface and could be extended for batching.
    return true;
  }

  // ============= Entity lookups/helpers =============

  _getDestinationById(destinationId) {
    const destinations = this._getFromStorage('destinations', []);
    return destinations.find(d => d.id === destinationId) || null;
  }

  _getLandmarkById(landmarkId) {
    const landmarks = this._getFromStorage('landmarks', []);
    return landmarks.find(l => l.id === landmarkId) || null;
  }

  _getHotelById(hotelId) {
    const hotels = this._getFromStorage('hotels', []);
    return hotels.find(h => h.id === hotelId) || null;
  }

  _getAttractionById(attractionId) {
    const attractions = this._getFromStorage('attractions', []);
    return attractions.find(a => a.id === attractionId) || null;
  }

  _getRestaurantById(restaurantId) {
    const restaurants = this._getFromStorage('restaurants', []);
    return restaurants.find(r => r.id === restaurantId) || null;
  }

  _getEventById(eventId) {
    const events = this._getFromStorage('events', []);
    return events.find(e => e.id === eventId) || null;
  }

  _getPackageById(packageId) {
    const packages = this._getFromStorage('packages', []);
    return packages.find(p => p.id === packageId) || null;
  }

  _getMembershipPlanById(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    return plans.find(p => p.id === membershipPlanId) || null;
  }

  _getFavoritesStore() {
    return this._getFromStorage('favorite_hotels', []);
  }

  _getProfileNotesStore() {
    return this._getFromStorage('profile_notes', []);
  }

  _getOrCreateHotelComparisonList() {
    let lists = this._getFromStorage('hotel_comparison_lists', []);
    let activeId = localStorage.getItem('active_comparison_list_id') || '';

    let list = null;
    if (activeId) {
      list = lists.find(l => l.id === activeId) || null;
    }
    if (!list && lists.length > 0) {
      list = lists[0];
      localStorage.setItem('active_comparison_list_id', list.id);
    }
    if (!list) {
      list = {
        id: this._generateId('hcl'),
        hotel_ids: [],
        created_at: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('hotel_comparison_lists', lists);
      localStorage.setItem('active_comparison_list_id', list.id);
    }
    return list;
  }

  _getOrCreateActiveItinerary() {
    let itineraries = this._getFromStorage('trip_itineraries', []);
    let activeId = localStorage.getItem('active_itinerary_id') || '';
    let itinerary = null;

    if (activeId) {
      itinerary = itineraries.find(t => t.id === activeId) || null;
    }
    if (!itinerary && itineraries.length > 0) {
      itinerary = itineraries[0];
      localStorage.setItem('active_itinerary_id', itinerary.id);
    }
    if (!itinerary) {
      itinerary = {
        id: this._generateId('trip'),
        name: 'My Trip',
        description: '',
        start_date: null,
        end_date: null,
        created_at: this._nowISO()
      };
      itineraries.push(itinerary);
      this._saveToStorage('trip_itineraries', itineraries);
      localStorage.setItem('active_itinerary_id', itinerary.id);
    }
    return itinerary;
  }

  _updateItineraryDateRange(itineraryId) {
    const itineraries = this._getFromStorage('trip_itineraries', []);
    const items = this._getFromStorage('itinerary_items', []);
    const itinerary = itineraries.find(t => t.id === itineraryId);
    if (!itinerary) return;

    const ownItems = items.filter(i => i.itinerary_id === itineraryId);
    if (ownItems.length === 0) {
      itinerary.start_date = null;
      itinerary.end_date = null;
    } else {
      const dates = ownItems.map(i => i.date).filter(Boolean).sort();
      itinerary.start_date = dates[0];
      itinerary.end_date = dates[dates.length - 1];
    }
    this._saveToStorage('trip_itineraries', itineraries);
  }

  // ==========================
  // Interfaces implementation
  // ==========================

  // ---- Destinations ----

  searchDestinations(query, limit) {
    const q = (query || '').toLowerCase();
    const max = typeof limit === 'number' ? limit : 10;
    const destinations = this._getFromStorage('destinations', []);

    const filtered = q
      ? destinations.filter(d => (d.name || '').toLowerCase().includes(q))
      : destinations.slice();

    filtered.sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '');
    });

    return filtered.slice(0, max).map(d => ({
      destination_id: d.id,
      name: d.name,
      country: d.country,
      type: d.type
    }));
  }

  getFeaturedDestinations() {
    const destinations = this._getFromStorage('destinations', []);
    const featured = destinations
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .slice(0, 8);

    return featured.map(d => ({
      destination_id: d.id,
      name: d.name,
      country: d.country,
      highlight_reason: '',
      photo_url: ''
    }));
  }

  // ---- Homepage featured events/packages ----

  getFeaturedEvents() {
    const events = this._getFromStorage('events', []);
    const now = new Date();
    const upcoming = events
      .filter(e => {
        const start = this._parseDate(e.start_datetime);
        return start ? start >= now : true;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 10);

    return upcoming.map(e => {
      const dest = this._getDestinationById(e.destination_id);
      return {
        event_id: e.id,
        name: e.name,
        destination_name: dest ? dest.name : '',
        start_datetime: e.start_datetime || '',
        min_ticket_price: e.min_ticket_price || 0,
        currency: e.currency || ''
      };
    });
  }

  getFeaturedPackages() {
    const packages = this._getFromStorage('packages', []);
    const sorted = packages
      .slice()
      .sort((a, b) => {
        const ra = typeof a.guest_rating === 'number' ? a.guest_rating : 0;
        const rb = typeof b.guest_rating === 'number' ? b.guest_rating : 0;
        return rb - ra;
      })
      .slice(0, 10);

    return sorted.map(p => {
      const dest = this._getDestinationById(p.destination_id);
      return {
        package_id: p.id,
        name: p.name,
        destination_name: dest ? dest.name : '',
        price_per_person: p.price_per_person || 0,
        currency: p.currency || '',
        includes_guided_city_tour: !!p.includes_guided_city_tour,
        breakfast_included: !!p.breakfast_included,
        guest_rating: p.guest_rating || 0
      };
    });
  }

  // ---- Hotels ----

  getHotelSearchFilterOptions(destinationId) {
    const hotels = this._getFromStorage('hotels', []).filter(
      h => h.destination_id === destinationId
    );
    const landmarks = this._getFromStorage('landmarks', []).filter(
      l => l.destination_id === destinationId
    );

    const starSet = new Set();
    const hotelTypeSet = new Set();
    const locationTypeSet = new Set();
    const amenitiesSet = new Set();

    let minPrice = null;
    let maxPrice = null;
    let currency = '';

    hotels.forEach(h => {
      if (typeof h.star_rating === 'number') starSet.add(h.star_rating);
      if (h.hotel_type) hotelTypeSet.add(h.hotel_type);
      if (h.location_type) locationTypeSet.add(h.location_type);

      if (typeof h.min_nightly_price === 'number') {
        if (minPrice === null || h.min_nightly_price < minPrice) {
          minPrice = h.min_nightly_price;
        }
        if (maxPrice === null || h.min_nightly_price > maxPrice) {
          maxPrice = h.min_nightly_price;
        }
        if (!currency && h.currency) currency = h.currency;
      }

      if (h.has_pool) amenitiesSet.add('pool');
      if (h.has_free_breakfast) amenitiesSet.add('free_breakfast');
      if (h.has_free_wifi) amenitiesSet.add('free_wifi');
      if (h.has_conference_meeting_rooms) amenitiesSet.add('conference_meeting_rooms');
      if (h.has_airport_shuttle) amenitiesSet.add('airport_shuttle');
      if (h.offers_free_cancellation) amenitiesSet.add('free_cancellation');
    });

    const price_ranges = [];
    if (minPrice !== null && maxPrice !== null) {
      price_ranges.push({
        min: minPrice,
        max: maxPrice,
        currency: currency || '',
        label: minPrice + ' - ' + maxPrice + ' ' + (currency || '')
      });
    }

    return {
      star_ratings: Array.from(starSet).sort((a, b) => a - b),
      price_ranges,
      hotel_types: Array.from(hotelTypeSet),
      location_types: Array.from(locationTypeSet),
      amenities: Array.from(amenitiesSet),
      landmarks: landmarks.map(l => ({
        landmark_id: l.id,
        name: l.name,
        type: l.type
      }))
    };
  }

  searchHotels(
    destinationId,
    checkInDate,
    checkOutDate,
    adults,
    children,
    minStarRating,
    maxStarRating,
    maxNightlyPrice,
    hotelType,
    locationType,
    requiredAmenities,
    primaryLandmarkId,
    maxDistanceToLandmarkKm,
    minGuestRating,
    sortBy,
    page,
    pageSize
  ) {
    const allHotels = this._getFromStorage('hotels', []);
    let hotels = allHotels.filter(h => h.destination_id === destinationId);

    if (typeof minStarRating === 'number') {
      hotels = hotels.filter(h => typeof h.star_rating === 'number' && h.star_rating >= minStarRating);
    }
    if (typeof maxStarRating === 'number') {
      hotels = hotels.filter(h => typeof h.star_rating === 'number' && h.star_rating <= maxStarRating);
    }
    if (typeof maxNightlyPrice === 'number') {
      hotels = hotels.filter(
        h => typeof h.min_nightly_price === 'number' && h.min_nightly_price <= maxNightlyPrice
      );
    }
    if (hotelType) {
      hotels = hotels.filter(h => h.hotel_type === hotelType);
    }
    if (locationType) {
      hotels = hotels.filter(h => h.location_type === locationType);
    }

    if (Array.isArray(requiredAmenities) && requiredAmenities.length > 0) {
      hotels = hotels.filter(h => {
        return requiredAmenities.every(a => {
          if (a === 'pool') return !!h.has_pool;
          if (a === 'free_breakfast') return !!h.has_free_breakfast;
          if (a === 'free_wifi') return !!h.has_free_wifi;
          if (a === 'conference_meeting_rooms') return !!h.has_conference_meeting_rooms;
          if (a === 'airport_shuttle') return !!h.has_airport_shuttle;
          if (a === 'free_cancellation') return !!h.offers_free_cancellation;
          return true;
        });
      });
    }

    if (primaryLandmarkId) {
      hotels = hotels.filter(h => h.primary_landmark_id === primaryLandmarkId);
    }
    if (typeof maxDistanceToLandmarkKm === 'number') {
      hotels = hotels.filter(
        h =>
          typeof h.distance_to_landmark_km === 'number' &&
          h.distance_to_landmark_km <= maxDistanceToLandmarkKm
      );
    }
    if (typeof minGuestRating === 'number') {
      hotels = hotels.filter(
        h => typeof h.guest_rating === 'number' && h.guest_rating >= minGuestRating
      );
    }

    const sortKey = sortBy || 'relevance';
    hotels = hotels.slice();

    if (sortKey === 'guest_rating_desc') {
      hotels.sort((a, b) => {
        const ra = typeof a.guest_rating === 'number' ? a.guest_rating : 0;
        const rb = typeof b.guest_rating === 'number' ? b.guest_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    } else if (sortKey === 'price_asc') {
      hotels.sort((a, b) => {
        const pa = typeof a.min_nightly_price === 'number' ? a.min_nightly_price : Infinity;
        const pb = typeof b.min_nightly_price === 'number' ? b.min_nightly_price : Infinity;
        return pa - pb;
      });
    } else if (sortKey === 'distance_to_landmark_asc') {
      hotels.sort((a, b) => {
        const da = typeof a.distance_to_landmark_km === 'number' ? a.distance_to_landmark_km : Infinity;
        const db = typeof b.distance_to_landmark_km === 'number' ? b.distance_to_landmark_km : Infinity;
        return da - db;
      });
    } else {
      // relevance: keep as-is
    }

    const total = hotels.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = hotels.slice(start, start + ps);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_hotelSearchParams', JSON.stringify({ destinationId, checkInDate, checkOutDate, adults, children, minStarRating, maxStarRating, maxNightlyPrice, hotelType, locationType, requiredAmenities, primaryLandmarkId, maxDistanceToLandmarkKm, minGuestRating, sortBy }));
      localStorage.setItem('task8_hotelSearchParams', JSON.stringify({ destinationId, checkInDate, checkOutDate, adults, children, minStarRating, maxStarRating, maxNightlyPrice, hotelType, locationType, requiredAmenities, primaryLandmarkId, maxDistanceToLandmarkKm, minGuestRating, sortBy }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results: paged.map(h => {
        const dest = this._getDestinationById(h.destination_id);
        const landmark = h.primary_landmark_id
          ? this._getLandmarkById(h.primary_landmark_id)
          : null;
        return {
          hotel_id: h.id,
          name: h.name,
          destination_name: dest ? dest.name : '',
          address: h.address || '',
          star_rating: h.star_rating || 0,
          guest_rating: h.guest_rating || 0,
          review_count: h.review_count || 0,
          min_nightly_price: h.min_nightly_price || 0,
          max_nightly_price: h.max_nightly_price || 0,
          currency: h.currency || '',
          hotel_type: h.hotel_type || '',
          location_type: h.location_type || '',
          primary_landmark_name: landmark ? landmark.name : '',
          distance_to_landmark_km: h.distance_to_landmark_km || null,
          is_family_friendly: !!h.is_family_friendly,
          has_pool: !!h.has_pool,
          has_free_breakfast: !!h.has_free_breakfast,
          has_free_wifi: !!h.has_free_wifi,
          has_conference_meeting_rooms: !!h.has_conference_meeting_rooms,
          has_airport_shuttle: !!h.has_airport_shuttle,
          offers_free_cancellation: !!h.offers_free_cancellation,
          thumbnail_photo_url: Array.isArray(h.photos) && h.photos.length > 0 ? h.photos[0] : ''
        };
      }),
      total_count: total,
      page: pg,
      page_size: ps
    };
  }

  getHotelDetails(hotelId) {
    const h = this._getHotelById(hotelId);
    if (!h) {
      return {};
    }
    const dest = this._getDestinationById(h.destination_id);
    const landmark = h.primary_landmark_id
      ? this._getLandmarkById(h.primary_landmark_id)
      : null;
    return {
      hotel_id: h.id,
      name: h.name,
      destination_name: dest ? dest.name : '',
      description: h.description || '',
      address: h.address || '',
      latitude: h.latitude || null,
      longitude: h.longitude || null,
      star_rating: h.star_rating || 0,
      guest_rating: h.guest_rating || 0,
      review_count: h.review_count || 0,
      min_nightly_price: h.min_nightly_price || 0,
      max_nightly_price: h.max_nightly_price || 0,
      currency: h.currency || '',
      hotel_type: h.hotel_type || '',
      location_type: h.location_type || '',
      primary_landmark_name: landmark ? landmark.name : '',
      distance_to_landmark_km: h.distance_to_landmark_km || null,
      is_family_friendly: !!h.is_family_friendly,
      has_pool: !!h.has_pool,
      has_free_breakfast: !!h.has_free_breakfast,
      has_free_wifi: !!h.has_free_wifi,
      has_conference_meeting_rooms: !!h.has_conference_meeting_rooms,
      has_airport_shuttle: !!h.has_airport_shuttle,
      offers_free_cancellation: !!h.offers_free_cancellation,
      phone_number: h.phone_number || '',
      email: h.email || '',
      website_url: h.website_url || '',
      check_in_time: h.check_in_time || '',
      check_out_time: h.check_out_time || '',
      photos: Array.isArray(h.photos) ? h.photos.slice() : []
    };
  }

  getHotelRoomTypes(hotelId, checkInDate, checkOutDate) {
    const roomTypes = this._getFromStorage('hotel_room_types', []).filter(
      r => r.hotel_id === hotelId
    );
    return roomTypes.map(r => ({
      room_type_id: r.id,
      name: r.name,
      description: r.description || '',
      max_occupancy: r.max_occupancy || null,
      bed_type: r.bed_type || '',
      price_per_night: r.price_per_night || 0,
      currency: r.currency || '',
      is_refundable: !!r.is_refundable,
      breakfast_included: !!r.breakfast_included
    }));
  }

  saveHotelToFavorites(hotelId) {
    const hotel = this._getHotelById(hotelId);
    const favorites = this._getFavoritesStore();
    const existing = favorites.find(f => f.hotel_id === hotelId);

    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        message: 'Hotel already in favorites.'
      };
    }

    const fav = {
      id: this._generateId('fav'),
      hotel_id: hotelId,
      hotel_name_snapshot: hotel ? hotel.name : '',
      added_at: this._nowISO()
    };
    favorites.push(fav);
    this._saveToStorage('favorite_hotels', favorites);
    this._persistUserState();

    return {
      success: true,
      favorite_id: fav.id,
      message: 'Hotel added to favorites.'
    };
  }

  addHotelToComparisonList(hotelId) {
    const list = this._getOrCreateHotelComparisonList();
    const lists = this._getFromStorage('hotel_comparison_lists', []);
    const idx = lists.findIndex(l => l.id === list.id);

    if (!list.hotel_ids.includes(hotelId)) {
      list.hotel_ids.push(hotelId);
      if (idx >= 0) {
        lists[idx] = list;
      } else {
        lists.push(list);
      }
      this._saveToStorage('hotel_comparison_lists', lists);
      this._persistUserState();
    }

    return {
      success: true,
      comparison_list_id: list.id,
      hotel_ids: list.hotel_ids.slice(),
      message: 'Hotel added to comparison list.'
    };
  }

  submitHotelBookingRequest(
    hotelId,
    checkInDate,
    checkOutDate,
    adults,
    children,
    contactName,
    contactEmail,
    message
  ) {
    const hotel = this._getHotelById(hotelId);
    const requests = this._getFromStorage('hotel_booking_requests', []);

    const record = {
      id: this._generateId('hbr'),
      hotel_id: hotelId,
      hotel_name_snapshot: hotel ? hotel.name : '',
      check_in_date: checkInDate || null,
      check_out_date: checkOutDate || null,
      adults: typeof adults === 'number' ? adults : null,
      children: typeof children === 'number' ? children : null,
      contact_name: contactName,
      contact_email: contactEmail,
      message: message || '',
      status: 'pending',
      created_at: this._nowISO()
    };

    requests.push(record);
    this._saveToStorage('hotel_booking_requests', requests);
    this._persistUserState();

    return {
      booking_request_id: record.id,
      status: record.status,
      created_at: record.created_at,
      success: true,
      message: 'Booking request submitted.'
    };
  }

  getHotelComparisonList() {
    const list = this._getOrCreateHotelComparisonList();
    const hotelsTable = this._getFromStorage('hotels', []);

    const hotels = list.hotel_ids
      .map(id => hotelsTable.find(h => h.id === id) || null)
      .filter(h => !!h)
      .map(h => {
        const dest = this._getDestinationById(h.destination_id);
        const landmark = h.primary_landmark_id
          ? this._getLandmarkById(h.primary_landmark_id)
          : null;
        return {
          hotel_id: h.id,
          name: h.name,
          destination_name: dest ? dest.name : '',
          star_rating: h.star_rating || 0,
          guest_rating: h.guest_rating || 0,
          min_nightly_price: h.min_nightly_price || 0,
          max_nightly_price: h.max_nightly_price || 0,
          currency: h.currency || '',
          primary_landmark_name: landmark ? landmark.name : '',
          distance_to_landmark_km: h.distance_to_landmark_km || null,
          is_family_friendly: !!h.is_family_friendly,
          has_pool: !!h.has_pool,
          has_free_breakfast: !!h.has_free_breakfast,
          has_free_wifi: !!h.has_free_wifi,
          has_conference_meeting_rooms: !!h.has_conference_meeting_rooms,
          has_airport_shuttle: !!h.has_airport_shuttle,
          offers_free_cancellation: !!h.offers_free_cancellation
        };
      });

    return {
      comparison_list_id: list.id,
      hotels
    };
  }

  removeHotelFromComparisonList(hotelId) {
    const list = this._getOrCreateHotelComparisonList();
    const lists = this._getFromStorage('hotel_comparison_lists', []);
    const idx = lists.findIndex(l => l.id === list.id);

    const before = list.hotel_ids.length;
    list.hotel_ids = list.hotel_ids.filter(id => id !== hotelId);

    if (idx >= 0) {
      lists[idx] = list;
      this._saveToStorage('hotel_comparison_lists', lists);
      this._persistUserState();
    }

    return {
      comparison_list_id: list.id,
      hotel_ids: list.hotel_ids.slice(),
      success: list.hotel_ids.length !== before,
      message: list.hotel_ids.length !== before ? 'Hotel removed.' : 'Hotel not in list.'
    };
  }

  clearHotelComparisonList() {
    const list = this._getOrCreateHotelComparisonList();
    const lists = this._getFromStorage('hotel_comparison_lists', []);
    const idx = lists.findIndex(l => l.id === list.id);

    list.hotel_ids = [];
    if (idx >= 0) {
      lists[idx] = list;
      this._saveToStorage('hotel_comparison_lists', lists);
      this._persistUserState();
    }

    return {
      comparison_list_id: list.id,
      hotel_ids: [],
      success: true
    };
  }

  // ---- Attractions / Itinerary ----

  getAttractionFilterOptions(destinationId) {
    const attractions = this._getFromStorage('attractions', []).filter(
      a => a.destination_id === destinationId
    );

    const categorySet = new Set();
    const ratings = [];

    attractions.forEach(a => {
      if (a.category) categorySet.add(a.category);
      if (typeof a.guest_rating === 'number') ratings.push(a.guest_rating);
    });

    let rating_thresholds = [];
    if (ratings.length > 0) {
      const maxRating = Math.max.apply(null, ratings);
      const candidates = [3.0, 3.5, 4.0, 4.5];
      rating_thresholds = candidates.filter(t => t <= maxRating);
    }

    const categories = Array.from(categorySet).map(c => ({
      value: c,
      label: c
    }));

    return {
      categories,
      rating_thresholds
    };
  }

  searchAttractions(
    destinationId,
    visitDate,
    categories,
    minGuestRating,
    sortBy,
    page,
    pageSize
  ) {
    const all = this._getFromStorage('attractions', []);
    let list = all.filter(a => a.destination_id === destinationId);

    if (Array.isArray(categories) && categories.length > 0) {
      const set = new Set(categories);
      list = list.filter(a => set.has(a.category));
    }
    if (typeof minGuestRating === 'number') {
      list = list.filter(
        a => typeof a.guest_rating === 'number' && a.guest_rating >= minGuestRating
      );
    }

    const sortKey = sortBy || 'rating_desc';
    list = list.slice();

    if (sortKey === 'rating_desc') {
      list.sort((a, b) => {
        const ra = typeof a.guest_rating === 'number' ? a.guest_rating : 0;
        const rb = typeof b.guest_rating === 'number' ? b.guest_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    } else if (sortKey === 'popularity_desc') {
      list.sort((a, b) => {
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    } else {
      // relevance: no-op
    }

    const total = list.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = list.slice(start, start + ps);

    return {
      results: paged.map(a => {
        const dest = this._getDestinationById(a.destination_id);
        return {
          attraction_id: a.id,
          name: a.name,
          category: a.category,
          destination_name: dest ? dest.name : '',
          guest_rating: a.guest_rating || 0,
          review_count: a.review_count || 0,
          address: a.address || '',
          thumbnail_photo_url:
            Array.isArray(a.photos) && a.photos.length > 0 ? a.photos[0] : '',
          suggested_duration_minutes: a.suggested_duration_minutes || null
        };
      }),
      total_count: total,
      page: pg,
      page_size: ps
    };
  }

  getAttractionDetails(attractionId) {
    const a = this._getAttractionById(attractionId);
    if (!a) return {};
    const dest = this._getDestinationById(a.destination_id);
    return {
      attraction_id: a.id,
      name: a.name,
      destination_name: dest ? dest.name : '',
      category: a.category,
      description: a.description || '',
      address: a.address || '',
      latitude: a.latitude || null,
      longitude: a.longitude || null,
      guest_rating: a.guest_rating || 0,
      review_count: a.review_count || 0,
      opening_hours: a.opening_hours || '',
      suggested_duration_minutes: a.suggested_duration_minutes || null,
      visit_tips: a.visit_tips || '',
      photos: Array.isArray(a.photos) ? a.photos.slice() : []
    };
  }

  addAttractionToItinerary(attractionId, date, timeSlot, notes) {
    const itinerary = this._getOrCreateActiveItinerary();
    const attraction = this._getAttractionById(attractionId);
    const items = this._getFromStorage('itinerary_items', []);

    const item = {
      id: this._generateId('iti'),
      itinerary_id: itinerary.id,
      date: date,
      time_slot: timeSlot,
      item_type: 'attraction',
      attraction_id: attractionId,
      hotel_id: null,
      restaurant_id: null,
      event_id: null,
      title_snapshot: attraction ? attraction.name : '',
      notes: notes || '',
      created_at: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('itinerary_items', items);
    this._updateItineraryDateRange(itinerary.id);
    this._persistUserState();

    return {
      itinerary_id: itinerary.id,
      itinerary_item_id: item.id,
      date: item.date,
      time_slot: item.time_slot,
      title_snapshot: item.title_snapshot,
      success: true,
      message: 'Attraction added to itinerary.'
    };
  }

  getTripPlannerOverview() {
    const itinerary = this._getOrCreateActiveItinerary();
    const items = this._getFromStorage('itinerary_items', []).filter(
      i => i.itinerary_id === itinerary.id
    );

    const attractions = this._getFromStorage('attractions', []);
    const hotels = this._getFromStorage('hotels', []);
    const restaurants = this._getFromStorage('restaurants', []);
    const events = this._getFromStorage('events', []);

    const dayMap = {};
    items.forEach(i => {
      if (!dayMap[i.date]) dayMap[i.date] = [];

      const fullItem = { ...i };

      if (i.attraction_id) {
        fullItem.attraction =
          attractions.find(a => a.id === i.attraction_id) || null;
      }
      if (i.hotel_id) {
        fullItem.hotel = hotels.find(h => h.id === i.hotel_id) || null;
      }
      if (i.restaurant_id) {
        fullItem.restaurant =
          restaurants.find(r => r.id === i.restaurant_id) || null;
      }
      if (i.event_id) {
        fullItem.event = events.find(e => e.id === i.event_id) || null;
      }

      dayMap[i.date].push({
        itinerary_item_id: i.id,
        time_slot: i.time_slot,
        item_type: i.item_type,
        title_snapshot: i.title_snapshot,
        notes: i.notes || '',
        attraction: fullItem.attraction || null,
        hotel: fullItem.hotel || null,
        restaurant: fullItem.restaurant || null,
        event: fullItem.event || null
      });
    });

    const dayKeys = Object.keys(dayMap).sort();
    const days = dayKeys.map(d => ({
      date: d,
      items: dayMap[d]
    }));

    return {
      itinerary_id: itinerary.id,
      name: itinerary.name || '',
      start_date: itinerary.start_date,
      end_date: itinerary.end_date,
      days
    };
  }

  getItineraryForDate(date) {
    const itinerary = this._getOrCreateActiveItinerary();
    const allItems = this._getFromStorage('itinerary_items', []).filter(
      i => i.itinerary_id === itinerary.id && i.date === date
    );

    const attractions = this._getFromStorage('attractions', []);
    const hotels = this._getFromStorage('hotels', []);
    const restaurants = this._getFromStorage('restaurants', []);
    const events = this._getFromStorage('events', []);

    const order = { morning: 1, afternoon: 2, evening: 3, full_day: 0 };

    const items = allItems
      .slice()
      .sort((a, b) => (order[a.time_slot] || 99) - (order[b.time_slot] || 99))
      .map(i => {
        const obj = {
          itinerary_item_id: i.id,
          time_slot: i.time_slot,
          item_type: i.item_type,
          title_snapshot: i.title_snapshot,
          notes: i.notes || '',
          attraction: null,
          hotel: null,
          restaurant: null,
          event: null
        };
        if (i.attraction_id) {
          obj.attraction = attractions.find(a => a.id === i.attraction_id) || null;
        }
        if (i.hotel_id) {
          obj.hotel = hotels.find(h => h.id === i.hotel_id) || null;
        }
        if (i.restaurant_id) {
          obj.restaurant =
            restaurants.find(r => r.id === i.restaurant_id) || null;
        }
        if (i.event_id) {
          obj.event = events.find(e => e.id === i.event_id) || null;
        }
        return obj;
      });

    return {
      date,
      items
    };
  }

  updateItineraryItemTimeSlot(itineraryItemId, newDate, newTimeSlot) {
    const items = this._getFromStorage('itinerary_items', []);
    const idx = items.findIndex(i => i.id === itineraryItemId);
    if (idx === -1) {
      return {
        itinerary_item_id: itineraryItemId,
        date: newDate,
        time_slot: newTimeSlot,
        success: false
      };
    }
    const item = items[idx];
    item.date = newDate;
    item.time_slot = newTimeSlot;
    items[idx] = item;
    this._saveToStorage('itinerary_items', items);
    this._updateItineraryDateRange(item.itinerary_id);
    this._persistUserState();

    return {
      itinerary_item_id: item.id,
      date: item.date,
      time_slot: item.time_slot,
      success: true
    };
  }

  removeItineraryItem(itineraryItemId) {
    const items = this._getFromStorage('itinerary_items', []);
    const idx = items.findIndex(i => i.id === itineraryItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Itinerary item not found.'
      };
    }
    const item = items[idx];
    items.splice(idx, 1);
    this._saveToStorage('itinerary_items', items);
    this._updateItineraryDateRange(item.itinerary_id);
    this._persistUserState();

    return {
      success: true,
      message: 'Itinerary item removed.'
    };
  }

  // ---- Events ----

  getEventFilterOptions(destinationId) {
    let events = this._getFromStorage('events', []);
    if (destinationId) {
      events = events.filter(e => e.destination_id === destinationId);
    }

    const monthSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = '';

    events.forEach(e => {
      if (e.start_datetime) {
        monthSet.add(e.start_datetime.substring(0, 7));
      }
      if (typeof e.min_ticket_price === 'number') {
        if (minPrice === null || e.min_ticket_price < minPrice) minPrice = e.min_ticket_price;
        if (maxPrice === null || e.min_ticket_price > maxPrice) maxPrice = e.min_ticket_price;
        if (!currency && e.currency) currency = e.currency;
      }
    });

    const months = Array.from(monthSet)
      .sort()
      .map(m => ({ value: m, label: this._monthLabel(m) }));

    const price_ranges = [];
    if (minPrice !== null && maxPrice !== null) {
      price_ranges.push({
        min: minPrice,
        max: maxPrice,
        currency: currency || '',
        label: minPrice + ' - ' + maxPrice + ' ' + (currency || '')
      });
    }

    return {
      months,
      price_ranges
    };
  }

  searchEvents(
    destinationId,
    month,
    startDate,
    endDate,
    maxTicketPrice,
    sortBy,
    page,
    pageSize
  ) {
    let events = this._getFromStorage('events', []);

    if (destinationId) {
      events = events.filter(e => e.destination_id === destinationId);
    }
    if (month) {
      events = events.filter(
        e => e.start_datetime && e.start_datetime.substring(0, 7) === month
      );
    }
    if (startDate) {
      const start = this._parseDate(startDate);
      if (start) {
        events = events.filter(e => {
          const sd = this._parseDate(e.start_datetime);
          return sd ? sd >= start : true;
        });
      }
    }
    if (endDate) {
      const end = this._parseDate(endDate);
      if (end) {
        events = events.filter(e => {
          const sd = this._parseDate(e.start_datetime);
          return sd ? sd <= end : true;
        });
      }
    }
    if (typeof maxTicketPrice === 'number') {
      events = events.filter(
        e => typeof e.min_ticket_price === 'number' && e.min_ticket_price <= maxTicketPrice
      );
    }

    const sortKey = sortBy || 'date_asc';
    events = events.slice();

    if (sortKey === 'date_asc') {
      events.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    } else if (sortKey === 'price_asc') {
      events.sort((a, b) => {
        const pa = typeof a.min_ticket_price === 'number' ? a.min_ticket_price : Infinity;
        const pb = typeof b.min_ticket_price === 'number' ? b.min_ticket_price : Infinity;
        return pa - pb;
      });
    } else if (sortKey === 'popularity_desc') {
      events.sort((a, b) => {
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    }

    const total = events.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = events.slice(start, start + ps);

    return {
      results: paged.map(e => {
        const dest = this._getDestinationById(e.destination_id);
        return {
          event_id: e.id,
          name: e.name,
          destination_name: dest ? dest.name : '',
          venue_name: e.venue_name || '',
          start_datetime: e.start_datetime || '',
          end_datetime: e.end_datetime || '',
          min_ticket_price: e.min_ticket_price || 0,
          max_ticket_price: e.max_ticket_price || 0,
          currency: e.currency || '',
          event_type: e.event_type || ''
        };
      }),
      total_count: total,
      page: pg,
      page_size: ps
    };
  }

  getEventDetails(eventId) {
    const e = this._getEventById(eventId);
    if (!e) return {};
    const dest = this._getDestinationById(e.destination_id);

    return {
      event_id: e.id,
      name: e.name,
      destination_name: dest ? dest.name : '',
      description: e.description || '',
      agenda: e.agenda || '',
      speakers: e.speakers || '',
      venue_name: e.venue_name || '',
      address: e.address || '',
      start_datetime: e.start_datetime || '',
      end_datetime: e.end_datetime || '',
      min_ticket_price: e.min_ticket_price || 0,
      max_ticket_price: e.max_ticket_price || 0,
      currency: e.currency || '',
      event_type: e.event_type || '',
      ticket_types: Array.isArray(e.ticket_types) ? e.ticket_types.slice() : []
    };
  }

  submitEventRegistration(
    eventId,
    attendeeFullName,
    attendeeEmail,
    attendeeOrganization,
    ticketType,
    ticketQuantity
  ) {
    const event = this._getEventById(eventId);
    const regs = this._getFromStorage('event_registrations', []);

    const qty = typeof ticketQuantity === 'number' && ticketQuantity > 0 ? ticketQuantity : 1;
    const pricePerTicket = event && typeof event.min_ticket_price === 'number'
      ? event.min_ticket_price
      : 0;

    const record = {
      id: this._generateId('ereg'),
      event_id: eventId,
      event_name_snapshot: event ? event.name : '',
      attendee_full_name: attendeeFullName,
      attendee_email: attendeeEmail,
      attendee_organization: attendeeOrganization || '',
      ticket_type: ticketType,
      ticket_quantity: qty,
      total_price: pricePerTicket * qty,
      currency: event && event.currency ? event.currency : '',
      registration_datetime: this._nowISO(),
      status: 'pending'
    };

    regs.push(record);
    this._saveToStorage('event_registrations', regs);
    this._persistUserState();

    return {
      event_registration_id: record.id,
      status: record.status,
      registration_datetime: record.registration_datetime,
      total_price: record.total_price,
      currency: record.currency,
      success: true,
      message: 'Event registration submitted.'
    };
  }

  // ---- Packages ----

  getPackageFilterOptions(destinationId) {
    let packages = this._getFromStorage('packages', []);
    if (destinationId) {
      packages = packages.filter(p => p.destination_id === destinationId);
    }

    const monthSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = '';

    let includeGuided = false;
    let includeBreakfast = false;

    packages.forEach(p => {
      if (p.start_date) monthSet.add(p.start_date.substring(0, 7));

      if (typeof p.price_per_person === 'number') {
        if (minPrice === null || p.price_per_person < minPrice) minPrice = p.price_per_person;
        if (maxPrice === null || p.price_per_person > maxPrice) maxPrice = p.price_per_person;
        if (!currency && p.currency) currency = p.currency;
      }

      if (p.includes_guided_city_tour) includeGuided = true;
      if (p.breakfast_included) includeBreakfast = true;
    });

    const months = Array.from(monthSet)
      .sort()
      .map(m => ({ value: m, label: this._monthLabel(m) }));

    const inclusions = [];
    if (includeGuided) inclusions.push('guided_city_tour');
    if (includeBreakfast) inclusions.push('breakfast_included');

    const price_ranges = [];
    if (minPrice !== null && maxPrice !== null) {
      price_ranges.push({
        min: minPrice,
        max: maxPrice,
        currency: currency || '',
        label: minPrice + ' - ' + maxPrice + ' ' + (currency || '')
      });
    }

    return {
      months,
      inclusions,
      price_ranges
    };
  }

  searchPackages(
    destinationId,
    month,
    includesGuidedCityTour,
    breakfastIncluded,
    maxPricePerPerson,
    sortBy,
    page,
    pageSize
  ) {
    let packages = this._getFromStorage('packages', []);

    if (destinationId) {
      packages = packages.filter(p => p.destination_id === destinationId);
    }
    if (month) {
      packages = packages.filter(
        p => p.start_date && p.start_date.substring(0, 7) === month
      );
    }
    if (typeof includesGuidedCityTour === 'boolean') {
      packages = packages.filter(p => !!p.includes_guided_city_tour === includesGuidedCityTour);
    }
    if (typeof breakfastIncluded === 'boolean') {
      packages = packages.filter(p => !!p.breakfast_included === breakfastIncluded);
    }
    if (typeof maxPricePerPerson === 'number') {
      packages = packages.filter(
        p => typeof p.price_per_person === 'number' && p.price_per_person <= maxPricePerPerson
      );
    }

    const sortKey = sortBy || 'rating_desc';
    packages = packages.slice();

    if (sortKey === 'rating_desc') {
      packages.sort((a, b) => {
        const ra = typeof a.guest_rating === 'number' ? a.guest_rating : 0;
        const rb = typeof b.guest_rating === 'number' ? b.guest_rating : 0;
        return rb - ra;
      });
    } else if (sortKey === 'price_asc') {
      packages.sort((a, b) => {
        const pa = typeof a.price_per_person === 'number' ? a.price_per_person : Infinity;
        const pb = typeof b.price_per_person === 'number' ? b.price_per_person : Infinity;
        return pa - pb;
      });
    } else if (sortKey === 'popularity_desc') {
      packages.sort((a, b) => {
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    }

    const total = packages.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = packages.slice(start, start + ps);

    return {
      results: paged.map(p => {
        const dest = this._getDestinationById(p.destination_id);
        return {
          package_id: p.id,
          name: p.name,
          destination_name: dest ? dest.name : '',
          price_per_person: p.price_per_person || 0,
          currency: p.currency || '',
          includes_guided_city_tour: !!p.includes_guided_city_tour,
          breakfast_included: !!p.breakfast_included,
          guest_rating: p.guest_rating || 0,
          review_count: p.review_count || 0,
          thumbnail_photo_url:
            Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : ''
        };
      }),
      total_count: total,
      page: pg,
      page_size: ps
    };
  }

  getPackageDetails(packageId) {
    const p = this._getPackageById(packageId);
    if (!p) return {};
    const dest = this._getDestinationById(p.destination_id);

    return {
      package_id: p.id,
      name: p.name,
      destination_name: dest ? dest.name : '',
      description: p.description || '',
      itinerary: p.itinerary || '',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      price_per_person: p.price_per_person || 0,
      currency: p.currency || '',
      includes_guided_city_tour: !!p.includes_guided_city_tour,
      breakfast_included: !!p.breakfast_included,
      other_inclusions: p.other_inclusions || '',
      guest_rating: p.guest_rating || 0,
      review_count: p.review_count || 0,
      photos: Array.isArray(p.photos) ? p.photos.slice() : []
    };
  }

  submitPackageInquiry(packageId, contactName, contactEmail, subject, message) {
    const pkg = this._getPackageById(packageId);
    const inquiries = this._getFromStorage('package_inquiries', []);

    const record = {
      id: this._generateId('pkginq'),
      package_id: packageId,
      package_name_snapshot: pkg ? pkg.name : '',
      contact_name: contactName,
      contact_email: contactEmail,
      subject,
      message,
      created_at: this._nowISO(),
      status: 'pending'
    };

    inquiries.push(record);
    this._saveToStorage('package_inquiries', inquiries);
    this._persistUserState();

    return {
      package_inquiry_id: record.id,
      status: record.status,
      created_at: record.created_at,
      success: true,
      confirmation_message: 'Package inquiry submitted.'
    };
  }

  // ---- Restaurants ----

  getRestaurantFilterOptions(destinationId) {
    const restaurants = this._getFromStorage('restaurants', []).filter(
      r => r.destination_id === destinationId
    );

    const cuisineSet = new Set();
    const priceLevelSet = new Set();
    const ratingValues = [];
    const distanceValues = [];

    restaurants.forEach(r => {
      if (r.cuisine_type) cuisineSet.add(r.cuisine_type);
      if (r.price_level) priceLevelSet.add(r.price_level);
      if (typeof r.guest_rating === 'number') ratingValues.push(r.guest_rating);
      if (typeof r.distance_to_city_center_km === 'number') {
        distanceValues.push(r.distance_to_city_center_km);
      }
    });

    let rating_thresholds = [];
    if (ratingValues.length > 0) {
      const maxRating = Math.max.apply(null, ratingValues);
      const candidates = [3.0, 3.5, 4.0, 4.5];
      rating_thresholds = candidates.filter(t => t <= maxRating);
    }

    let distance_options_km = [];
    if (distanceValues.length > 0) {
      const set = new Set();
      distanceValues.forEach(d => {
        const rounded = Math.round(d * 2) / 2; // 0.5km steps
        set.add(rounded);
      });
      distance_options_km = Array.from(set).sort((a, b) => a - b);
    }

    return {
      cuisine_types: Array.from(cuisineSet),
      price_levels: Array.from(priceLevelSet),
      rating_thresholds,
      distance_options_km
    };
  }

  searchRestaurants(
    destinationId,
    cuisineType,
    maxAveragePricePerPerson,
    priceLevel,
    minGuestRating,
    maxDistanceToCityCenterKm,
    sortBy,
    page,
    pageSize
  ) {
    let restaurants = this._getFromStorage('restaurants', []).filter(
      r => r.destination_id === destinationId
    );

    if (cuisineType) {
      restaurants = restaurants.filter(r => r.cuisine_type === cuisineType);
    }
    if (typeof maxAveragePricePerPerson === 'number') {
      restaurants = restaurants.filter(
        r =>
          typeof r.average_price_per_person === 'number' &&
          r.average_price_per_person <= maxAveragePricePerPerson
      );
    }
    if (priceLevel) {
      restaurants = restaurants.filter(r => r.price_level === priceLevel);
    }
    if (typeof minGuestRating === 'number') {
      restaurants = restaurants.filter(
        r => typeof r.guest_rating === 'number' && r.guest_rating >= minGuestRating
      );
    }
    if (typeof maxDistanceToCityCenterKm === 'number') {
      restaurants = restaurants.filter(
        r =>
          typeof r.distance_to_city_center_km === 'number' &&
          r.distance_to_city_center_km <= maxDistanceToCityCenterKm
      );
    }

    const sortKey = sortBy || 'rating_desc';
    restaurants = restaurants.slice();

    if (sortKey === 'rating_desc') {
      restaurants.sort((a, b) => {
        const ra = typeof a.guest_rating === 'number' ? a.guest_rating : 0;
        const rb = typeof b.guest_rating === 'number' ? b.guest_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    } else if (sortKey === 'price_asc') {
      restaurants.sort((a, b) => {
        const pa = typeof a.average_price_per_person === 'number'
          ? a.average_price_per_person
          : Infinity;
        const pb = typeof b.average_price_per_person === 'number'
          ? b.average_price_per_person
          : Infinity;
        return pa - pb;
      });
    }

    const total = restaurants.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = restaurants.slice(start, start + ps);

    return {
      results: paged.map(r => {
        const dest = this._getDestinationById(r.destination_id);
        return {
          restaurant_id: r.id,
          name: r.name,
          destination_name: dest ? dest.name : '',
          cuisine_type: r.cuisine_type || '',
          average_price_per_person: r.average_price_per_person || 0,
          currency: r.currency || '',
          price_level: r.price_level || '',
          guest_rating: r.guest_rating || 0,
          review_count: r.review_count || 0,
          distance_to_city_center_km: r.distance_to_city_center_km || null,
          address: r.address || '',
          thumbnail_photo_url:
            Array.isArray(r.photos) && r.photos.length > 0 ? r.photos[0] : ''
        };
      }),
      total_count: total,
      page: pg,
      page_size: ps
    };
  }

  getRestaurantDetails(restaurantId) {
    const r = this._getRestaurantById(restaurantId);
    if (!r) return {};
    const dest = this._getDestinationById(r.destination_id);

    return {
      restaurant_id: r.id,
      name: r.name,
      destination_name: dest ? dest.name : '',
      description: r.description || '',
      cuisine_type: r.cuisine_type || '',
      average_price_per_person: r.average_price_per_person || 0,
      currency: r.currency || '',
      price_level: r.price_level || '',
      guest_rating: r.guest_rating || 0,
      review_count: r.review_count || 0,
      address: r.address || '',
      latitude: r.latitude || null,
      longitude: r.longitude || null,
      distance_to_city_center_km: r.distance_to_city_center_km || null,
      phone_number: r.phone_number || '',
      email: r.email || '',
      website_url: r.website_url || '',
      opening_hours: r.opening_hours || '',
      menu_highlights: r.menu_highlights || '',
      photos: Array.isArray(r.photos) ? r.photos.slice() : []
    };
  }

  submitRestaurantReservation(
    restaurantId,
    reservationDatetime,
    guests,
    contactName,
    contactEmail,
    notes
  ) {
    const restaurant = this._getRestaurantById(restaurantId);
    const reservations = this._getFromStorage('restaurant_reservations', []);

    const record = {
      id: this._generateId('rres'),
      restaurant_id: restaurantId,
      restaurant_name_snapshot: restaurant ? restaurant.name : '',
      reservation_datetime: reservationDatetime,
      guests: guests,
      contact_name: contactName,
      contact_email: contactEmail,
      notes: notes || '',
      created_at: this._nowISO(),
      status: 'pending'
    };

    reservations.push(record);
    this._saveToStorage('restaurant_reservations', reservations);
    this._persistUserState();

    return {
      restaurant_reservation_id: record.id,
      status: record.status,
      created_at: record.created_at,
      success: true,
      confirmation_message: 'Restaurant reservation submitted.'
    };
  }

  // ---- Membership ----

  getMembershipPlans(includesTrainingWebinars, audienceType, sortBy) {
    let plans = this._getFromStorage('membership_plans', []);

    if (typeof includesTrainingWebinars === 'boolean') {
      plans = plans.filter(
        p => !!p.includes_training_webinars === includesTrainingWebinars
      );
    }
    if (audienceType) {
      plans = plans.filter(p => p.audience_type === audienceType);
    }

    const sortKey = sortBy || 'annual_price_asc';
    plans = plans.slice();

    if (sortKey === 'annual_price_asc') {
      plans.sort((a, b) => (a.annual_price || 0) - (b.annual_price || 0));
    } else if (sortKey === 'annual_price_desc') {
      plans.sort((a, b) => (b.annual_price || 0) - (a.annual_price || 0));
    }

    return plans.map(p => ({
      membership_plan_id: p.id,
      name: p.name,
      description: p.description || '',
      audience_type: p.audience_type || '',
      annual_price: p.annual_price,
      currency: p.currency,
      includes_training_webinars: !!p.includes_training_webinars,
      other_benefits: p.other_benefits || '',
      available_monthly_billing: !!p.available_monthly_billing,
      available_annual_billing: !!p.available_annual_billing
    }));
  }

  getMembershipPlanDetails(membershipPlanId) {
    const p = this._getMembershipPlanById(membershipPlanId);
    if (!p) return {};
    return {
      membership_plan_id: p.id,
      name: p.name,
      description: p.description || '',
      audience_type: p.audience_type || '',
      annual_price: p.annual_price,
      currency: p.currency,
      includes_training_webinars: !!p.includes_training_webinars,
      other_benefits: p.other_benefits || '',
      available_monthly_billing: !!p.available_monthly_billing,
      available_annual_billing: !!p.available_annual_billing
    };
  }

  submitMembershipApplication(
    membershipPlanId,
    applicantName,
    applicantEmail,
    membershipType,
    billingPeriod
  ) {
    const plan = this._getMembershipPlanById(membershipPlanId);
    const apps = this._getFromStorage('membership_applications', []);

    const record = {
      id: this._generateId('mapp'),
      membership_plan_id: membershipPlanId,
      membership_plan_name_snapshot: plan ? plan.name : '',
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      membership_type: membershipType,
      billing_period: billingPeriod,
      application_datetime: this._nowISO(),
      status: 'pending'
    };

    apps.push(record);
    this._saveToStorage('membership_applications', apps);
    this._persistUserState();

    return {
      membership_application_id: record.id,
      status: record.status,
      application_datetime: record.application_datetime,
      success: true,
      message: 'Membership application submitted.'
    };
  }

  // ---- Profile / Favorites / Notes ----

  getProfileOverview() {
    const favorites = this._getFavoritesStore();
    const notes = this._getProfileNotesStore();
    return {
      favorite_hotels_count: favorites.length,
      notes_count: notes.length
    };
  }

  getFavoriteHotels() {
    const favorites = this._getFavoritesStore();
    const hotels = this._getFromStorage('hotels', []);
    const destinations = this._getFromStorage('destinations', []);

    return favorites.map(f => {
      const hotel = hotels.find(h => h.id === f.hotel_id) || null;
      const dest = hotel
        ? destinations.find(d => d.id === hotel.destination_id) || null
        : null;
      return {
        favorite_id: f.id,
        hotel_id: f.hotel_id,
        hotel_name: hotel ? hotel.name : f.hotel_name_snapshot,
        destination_name: dest ? dest.name : '',
        star_rating: hotel ? hotel.star_rating || 0 : 0,
        guest_rating: hotel ? hotel.guest_rating || 0 : 0,
        min_nightly_price: hotel ? hotel.min_nightly_price || 0 : 0,
        currency: hotel ? hotel.currency || '' : '',
        added_at: f.added_at,
        hotel: hotel
      };
    });
  }

  removeFavoriteHotel(favoriteId) {
    const favorites = this._getFavoritesStore();
    const idx = favorites.findIndex(f => f.id === favoriteId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Favorite not found.'
      };
    }
    favorites.splice(idx, 1);
    this._saveToStorage('favorite_hotels', favorites);
    this._persistUserState();
    return {
      success: true,
      message: 'Favorite removed.'
    };
  }

  getProfileNotes() {
    const notes = this._getProfileNotesStore();
    return notes.map(n => ({
      note_id: n.id,
      title: n.title || '',
      content: n.content,
      created_at: n.created_at,
      updated_at: n.updated_at || ''
    }));
  }

  addProfileNote(title, content) {
    const notes = this._getProfileNotesStore();
    const record = {
      id: this._generateId('note'),
      title: title || '',
      content,
      created_at: this._nowISO(),
      updated_at: null
    };
    notes.push(record);
    this._saveToStorage('profile_notes', notes);
    this._persistUserState();

    return {
      note_id: record.id,
      created_at: record.created_at,
      success: true,
      message: 'Note added.'
    };
  }

  updateProfileNote(noteId, title, content) {
    const notes = this._getProfileNotesStore();
    const idx = notes.findIndex(n => n.id === noteId);
    if (idx === -1) {
      return {
        note_id: noteId,
        updated_at: null,
        success: false
      };
    }
    const n = notes[idx];
    if (typeof title !== 'undefined') n.title = title;
    if (typeof content !== 'undefined') n.content = content;
    n.updated_at = this._nowISO();
    notes[idx] = n;
    this._saveToStorage('profile_notes', notes);
    this._persistUserState();

    return {
      note_id: n.id,
      updated_at: n.updated_at,
      success: true
    };
  }

  deleteProfileNote(noteId) {
    const notes = this._getProfileNotesStore();
    const idx = notes.findIndex(n => n.id === noteId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Note not found.'
      };
    }
    notes.splice(idx, 1);
    this._saveToStorage('profile_notes', notes);
    this._persistUserState();

    return {
      success: true,
      message: 'Note deleted.'
    };
  }

  // ---- Association info / Support ----

  getAssociationInfo() {
    const info = this._getFromStorage('association_info', {
      mission: '',
      goals: '',
      history: '',
      governance: '',
      partner_networks: '',
      benefits_for_travelers: '',
      benefits_for_businesses: '',
      benefits_for_members: ''
    });
    return info;
  }

  getSupportInfo() {
    const info = this._getFromStorage('support_info', {
      support_email: '',
      support_phone: '',
      support_hours: ''
    });
    return info;
  }

  getFaqList() {
    const faqs = this._getFromStorage('faq_list', []);
    return faqs.map(f => ({
      question: f.question || '',
      answer: f.answer || '',
      category: f.category || ''
    }));
  }

  submitSupportContactRequest(name, email, subject, message) {
    const requests = this._getFromStorage('support_contact_requests', []);
    const record = {
      id: this._generateId('sup'),
      name,
      email,
      subject,
      message,
      created_at: this._nowISO()
    };
    requests.push(record);
    this._saveToStorage('support_contact_requests', requests);
    this._persistUserState();

    return {
      request_id: record.id,
      success: true,
      confirmation_message: 'Support request submitted.'
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