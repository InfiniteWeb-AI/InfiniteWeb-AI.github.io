/* eslint-disable no-undef */

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

  // ----------------------------
  // Storage helpers
  // ----------------------------

  _initStorage() {
    // Legacy/example keys from scaffold (kept for compatibility, not used)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Core data tables for this project (all JSON-serializable)
    const tableDefaults = {
      venues: [],
      properties: [],
      room_types: [],
      meeting_rooms: [],
      event_packages: [],
      customized_packages: [],
      promotions: [],
      cart: null, // single-user cart object or null
      cart_items: [],
      bookings: [],
      booking_extras: [],
      favorite_items: [],
      payments: [],
      locations: [],
      contact_messages: []
    };

    Object.keys(tableDefaults).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(tableDefaults[key]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue !== undefined ? defaultValue : [];
    try {
      return JSON.parse(raw);
    } catch (e) {
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
    return dateStr ? new Date(dateStr) : null;
  }

  _dateDiffInNights(checkin, checkout) {
    const inDate = this._parseDate(checkin);
    const outDate = this._parseDate(checkout);
    if (!inDate || !outDate) return 0;
    const diffMs = outDate.getTime() - inDate.getTime();
    return diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60 * 24)) : 0;
  }

  _timeRangeToDateTimes(dateStr, startTime, endTime) {
    // dateStr '2026-04-14', times '14:00', '17:00'
    const start = dateStr + 'T' + (startTime || '00:00') + ':00';
    const end = dateStr + 'T' + (endTime || '00:00') + ':00';
    return { start, end };
  }

  // ----------------------------
  // Cart helpers
  // ----------------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // will store CartItem IDs
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        currency: 'USD',
        cart_total: 0
      };
      this._saveToStorage('cart', cart);
    }
    // Ensure items array exists
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    return cart;
  }

  _recalculateCartTotals() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let total = 0;
    itemsForCart.forEach((item) => {
      const qty = item.quantity != null ? item.quantity : 1;
      const unit = item.unit_price != null ? item.unit_price : 0;
      const itemTotal = unit * qty;
      item.total_price = itemTotal;
      total += itemTotal;
    });

    cart.cart_total = total;
    cart.updated_at = this._nowIso();

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
    return { cart, itemsForCart };
  }

  _decorateCartItem(item) {
    if (!item) return null;
    const decorated = { ...item };
    const venues = this._getFromStorage('venues', []);
    const properties = this._getFromStorage('properties', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const meetingRooms = this._getFromStorage('meeting_rooms', []);
    const eventPackages = this._getFromStorage('event_packages', []);
    const customizedPackages = this._getFromStorage('customized_packages', []);

    if (item.item_type === 'venue') {
      decorated.venue = venues.find((v) => v.id === item.reference_id) || null;
    } else if (item.item_type === 'room_type') {
      const rt = roomTypes.find((r) => r.id === item.reference_id) || null;
      decorated.room_type = rt;
      if (rt) {
        decorated.property = properties.find((p) => p.id === rt.property_id) || null;
      }
    } else if (item.item_type === 'meeting_room') {
      const mr = meetingRooms.find((m) => m.id === item.reference_id) || null;
      decorated.meeting_room = mr;
      if (mr) {
        decorated.venue = venues.find((v) => v.id === mr.venue_id) || null;
      }
    } else if (item.item_type === 'event_package') {
      const ep = eventPackages.find((e) => e.id === item.reference_id) || null;
      decorated.event_package = ep;
      if (ep) {
        decorated.venue = venues.find((v) => v.id === ep.venue_id) || null;
      }
      if (item.customized_package_id) {
        decorated.customized_package = customizedPackages.find((c) => c.id === item.customized_package_id) || null;
      }
    }

    return decorated;
  }

  // ----------------------------
  // Booking helpers
  // ----------------------------

  _getBookingById(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) return null;

    const venues = this._getFromStorage('venues', []);
    const properties = this._getFromStorage('properties', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const meetingRooms = this._getFromStorage('meeting_rooms', []);
    const eventPackages = this._getFromStorage('event_packages', []);
    const customizedPackages = this._getFromStorage('customized_packages', []);
    const bookingExtras = this._getFromStorage('booking_extras', []);

    const linkedVenue = booking.venue_id ? (venues.find((v) => v.id === booking.venue_id) || null) : null;
    const linkedProperty = booking.property_id ? (properties.find((p) => p.id === booking.property_id) || null) : null;
    const linkedRoomType = booking.room_type_id ? (roomTypes.find((r) => r.id === booking.room_type_id) || null) : null;
    const linkedMeetingRoom = booking.meeting_room_id ? (meetingRooms.find((m) => m.id === booking.meeting_room_id) || null) : null;
    const linkedEventPackage = booking.event_package_id ? (eventPackages.find((e) => e.id === booking.event_package_id) || null) : null;
    const linkedCustomizedPackage = booking.customized_package_id ? (customizedPackages.find((c) => c.id === booking.customized_package_id) || null) : null;
    const extras = bookingExtras.filter((ex) => ex.booking_id === booking.id);

    return {
      booking,
      linkedVenue,
      linkedProperty,
      linkedRoomType,
      linkedMeetingRoom,
      linkedEventPackage,
      linkedCustomizedPackage,
      extras
    };
  }

  _applyPromotionRules(booking, promotion) {
    if (!promotion || !promotion.is_active) {
      return { isEligible: false, discountAmount: 0, message: 'Promotion not active.' };
    }

    const now = new Date();
    if (promotion.valid_from) {
      const from = new Date(promotion.valid_from);
      if (now < from) {
        return { isEligible: false, discountAmount: 0, message: 'Promotion not yet valid.' };
      }
    }
    if (promotion.valid_to) {
      const to = new Date(promotion.valid_to);
      if (now > to) {
        return { isEligible: false, discountAmount: 0, message: 'Promotion expired.' };
      }
    }

    // Map booking_type to applicable_section
    let section = null;
    if (booking.booking_type === 'accommodation') section = 'accommodations';
    else if (booking.booking_type === 'venue') section = 'venues';
    else if (booking.booking_type === 'meeting_room') section = 'meeting_rooms';
    else if (booking.booking_type === 'event_package') section = 'event_packages';

    if (section && promotion.applicable_section && promotion.applicable_section !== section) {
      return { isEligible: false, discountAmount: 0, message: 'Promotion not applicable to this booking.' };
    }

    // Min nights condition for accommodations
    if (promotion.min_nights && booking.booking_type === 'accommodation') {
      const nights = this._dateDiffInNights(booking.checkin_date, booking.checkout_date);
      if (nights < promotion.min_nights) {
        return { isEligible: false, discountAmount: 0, message: 'Minimum nights not met for this promotion.' };
      }
    }

    // Eligible days of week (midweek, etc.)
    if (Array.isArray(promotion.eligible_days_of_week) && promotion.eligible_days_of_week.length > 0) {
      const days = promotion.eligible_days_of_week.map((d) => (d || '').toLowerCase());
      const dateToCheck = booking.checkin_date || booking.event_date || booking.event_start_datetime;
      if (dateToCheck) {
        const d = new Date(dateToCheck);
        const dayIndex = d.getUTCDay(); // 0=Sun ... 6=Sat
        const mapIdxToName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = mapIdxToName[dayIndex];
        if (!days.includes(dayName)) {
          return { isEligible: false, discountAmount: 0, message: 'Promotion not valid for selected day(s).' };
        }
      }
    }

    // Eligible locations
    if (booking.booking_type !== 'accommodation' && Array.isArray(promotion.eligible_locations) && promotion.eligible_locations.length > 0) {
      const locs = promotion.eligible_locations.map((l) => (l || '').toLowerCase());
      const bookingDetails = this._getBookingById(booking.id);
      let locationName = null;
      if (bookingDetails.linkedProperty) {
        locationName = bookingDetails.linkedProperty.location_name || bookingDetails.linkedProperty.city;
      } else if (bookingDetails.linkedVenue) {
        locationName = bookingDetails.linkedVenue.city || bookingDetails.linkedVenue.nearest_city_name;
      }
      if (locationName) {
        if (!locs.includes(locationName.toLowerCase())) {
          return { isEligible: false, discountAmount: 0, message: 'Promotion not valid for this location.' };
        }
      }
    }

    const subtotal = (booking.price_subtotal || 0) + (booking.price_fees || 0);
    if (subtotal <= 0) {
      return { isEligible: false, discountAmount: 0, message: 'No price to discount.' };
    }

    let discountAmount = 0;
    if (promotion.discount_type === 'percent') {
      discountAmount = (subtotal * promotion.discount_value) / 100;
    } else if (promotion.discount_type === 'fixed_amount') {
      discountAmount = promotion.discount_value;
    }

    if (discountAmount <= 0) {
      return { isEligible: false, discountAmount: 0, message: 'Discount amount is zero.' };
    }

    return { isEligible: true, discountAmount, message: 'Promotion applied successfully.' };
  }

  _calculatePackageTotalPrice(eventPackage, guestCount, options) {
    if (!eventPackage) {
      return { totalPrice: 0, currency: 'USD' };
    }
    const base = eventPackage.base_price || 0;
    let total = 0;
    if (eventPackage.pricing_model === 'per_person') {
      total = base * (guestCount || 0);
    } else {
      total = base;
    }

    // Simple modifiers based on options (very light-touch)
    if (options) {
      // small 5% surcharge if menu type differs from default
      if (options.selectedMenuType && eventPackage.default_menu_type && options.selectedMenuType !== eventPackage.default_menu_type) {
        total *= 1.05;
      }
      // vegetarian options - small 2% extra
      if (options.vegetarianOptions) {
        total *= 1.02;
      }
      // seafood menu - 3% extra
      if (options.seafoodMenu) {
        total *= 1.03;
      }
    }

    return {
      totalPrice: total,
      currency: eventPackage.currency || 'USD'
    };
  }

  // ----------------------------
  // Homepage & Locations
  // ----------------------------

  getHomepageContent() {
    const venues = this._getFromStorage('venues', []);
    const properties = this._getFromStorage('properties', []);
    const eventPackages = this._getFromStorage('event_packages', []);
    const promotions = this._getFromStorage('promotions', []);

    const featuredVenues = venues.filter((v) => v.is_featured);
    const featuredProperties = properties.filter((p) => p.is_featured);

    // Resolve foreign key venue_id for event packages
    const featuredEventPackagesRaw = eventPackages.filter((e) => e.is_recommended);
    const featuredEventPackages = featuredEventPackagesRaw.map((pkg) => {
      const venue = pkg.venue_id ? venues.find((v) => v.id === pkg.venue_id) || null : null;
      return { ...pkg, venue };
    });

    const highlightedPromotions = promotions.filter((p) => p.is_active);

    return {
      featuredVenues,
      featuredProperties,
      featuredEventPackages,
      highlightedPromotions
    };
  }

  searchLocations(query, locationType) {
    const locations = this._getFromStorage('locations', []);
    const q = (query || '').toLowerCase();
    return locations.filter((loc) => {
      if (locationType && loc.location_type !== locationType) return false;
      if (!q) return true;
      return (loc.name || '').toLowerCase().includes(q);
    });
  }

  // ----------------------------
  // Venues
  // ----------------------------

  getVenueFilterOptions() {
    return {
      eventTypes: [
        { value: 'wedding', label: 'Wedding' },
        { value: 'corporate_conference', label: 'Corporate / Conference' },
        { value: 'corporate_retreat', label: 'Corporate retreat' },
        { value: 'other', label: 'Other' }
      ],
      amenities: [
        { code: 'indoor_space', label: 'Indoor space' },
        { code: 'outdoor_space', label: 'Outdoor space' },
        { code: 'projector', label: 'Projector' },
        { code: 'high_speed_wifi', label: 'High-speed Wi-Fi' },
        { code: 'coffee_break', label: 'Coffee break' },
        { code: 'catering_full_meals', label: 'Full catering' },
        { code: 'video_conferencing', label: 'Video conferencing' },
        { code: 'whiteboard', label: 'Whiteboard' }
      ],
      priceFullDayMin: 0,
      priceFullDayMax: 10000,
      distanceRadiusOptionsMiles: [10, 25, 50, 100, 150, 200],
      ratingOptions: [3, 4, 5],
      sortOptions: [
        { value: 'distance_to_city_center_asc', label: 'Distance to city center – nearest first' },
        { value: 'guest_rating_desc', label: 'Guest rating – high to low' },
        { value: 'price_full_day_asc', label: 'Price (full day) – low to high' },
        { value: 'total_package_price_asc', label: 'Total package price (venue + catering) – low to high' }
      ]
    };
  }

  searchVenues(eventType, dateStart, dateEnd, guestCount, baseLocationId, distanceRadiusMiles, maxPriceFullDay, amenities, minStarRating, sortBy) {
    const venues = this._getFromStorage('venues', []);
    const locations = this._getFromStorage('locations', []);
    const eventPackages = this._getFromStorage('event_packages', []);

    let baseLocation = null;
    if (baseLocationId) {
      baseLocation = locations.find((l) => l.id === baseLocationId) || null;
    }

    const amenityFilter = Array.isArray(amenities) ? amenities : [];

    let results = venues.filter((venue) => {
      if (eventType && Array.isArray(venue.event_types_supported)) {
        if (!venue.event_types_supported.includes(eventType)) return false;
      }

      if (guestCount != null) {
        if (venue.max_capacity != null && venue.max_capacity < guestCount) return false;
        if (false && venue.min_capacity != null && guestCount < venue.min_capacity) return false;
      }

      if (typeof maxPriceFullDay === 'number') {
        if (venue.base_price_full_day != null && venue.base_price_full_day > maxPriceFullDay) {
          return false;
        }
      }

      if (minStarRating != null && venue.star_rating != null) {
        if (venue.star_rating < minStarRating) return false;
      }

      if (amenityFilter.length > 0) {
        const venueAm = venue.amenities || [];
        for (const code of amenityFilter) {
          if (!venueAm.includes(code)) return false;
        }
      }

      if (baseLocation && typeof distanceRadiusMiles === 'number') {
        const sameCity = (venue.nearest_city_name && venue.nearest_city_name === baseLocation.name) ||
          (venue.city && venue.city === baseLocation.name);
        if (!sameCity) return false;
        if (venue.distance_to_city_center_miles != null && venue.distance_to_city_center_miles > distanceRadiusMiles) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    const sort = sortBy || '';
    if (sort === 'distance_to_city_center_asc') {
      results.sort((a, b) => {
        const da = a.distance_to_city_center_miles != null ? a.distance_to_city_center_miles : Number.POSITIVE_INFINITY;
        const db = b.distance_to_city_center_miles != null ? b.distance_to_city_center_miles : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else if (sort === 'guest_rating_desc') {
      results.sort((a, b) => {
        const ra = a.guest_rating != null ? a.guest_rating : 0;
        const rb = b.guest_rating != null ? b.guest_rating : 0;
        return rb - ra;
      });
    } else if (sort === 'price_full_day_asc') {
      results.sort((a, b) => {
        const pa = a.base_price_full_day != null ? a.base_price_full_day : Number.POSITIVE_INFINITY;
        const pb = b.base_price_full_day != null ? b.base_price_full_day : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sort === 'total_package_price_asc') {
      // Compute effective package price (venue + catering) per venue
      const gCount = guestCount || 0;
      const priceByVenue = {};
      results.forEach((venue) => {
        const packages = eventPackages.filter((ep) => ep.venue_id === venue.id && (!eventType || ep.occasion === eventType));
        let minTotal = Number.POSITIVE_INFINITY;
        packages.forEach((pkg) => {
          const { totalPrice } = this._calculatePackageTotalPrice(pkg, gCount, null);
          if (totalPrice < minTotal) minTotal = totalPrice;
        });
        priceByVenue[venue.id] = minTotal;
      });
      results.sort((a, b) => {
        const pa = priceByVenue[a.id] != null ? priceByVenue[a.id] : Number.POSITIVE_INFINITY;
        const pb = priceByVenue[b.id] != null ? priceByVenue[b.id] : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    }

    return results;
  }

  getVenueDetails(venueId) {
    const venues = this._getFromStorage('venues', []);
    const venue = venues.find((v) => v.id === venueId) || null;
    if (!venue) {
      return {
        venue: null,
        supportedEventTypes: [],
        indoorSpaceAvailable: false,
        outdoorSpaceAvailable: false,
        amenities: [],
        imageUrls: [],
        defaultFullDayPrice: null
      };
    }

    return {
      venue,
      supportedEventTypes: venue.event_types_supported || [],
      indoorSpaceAvailable: !!venue.has_indoor_space,
      outdoorSpaceAvailable: !!venue.has_outdoor_space,
      amenities: venue.amenities || [],
      imageUrls: venue.images || [],
      defaultFullDayPrice: venue.base_price_full_day != null ? venue.base_price_full_day : null
    };
  }

  getVenuePricingQuote(venueId, eventType, dateStart, dateEnd, guestCount, rentalType) {
    const venues = this._getFromStorage('venues', []);
    const venue = venues.find((v) => v.id === venueId) || null;
    const currency = (venue && venue.currency) || 'USD';

    let base = 0;
    if (venue) {
      if (rentalType === 'full_day') base = venue.base_price_full_day || 0;
      else if (rentalType === 'half_day') base = venue.base_price_half_day || 0;
    }

    // Simple fee/tax model: 10% tax, 5% fees
    const priceSubtotal = base;
    const fees = priceSubtotal * 0.05;
    const taxes = priceSubtotal * 0.1;
    const totalPrice = priceSubtotal + fees + taxes;

    return {
      currency,
      priceSubtotal,
      fees,
      taxes,
      totalPrice
    };
  }

  getVenuePackages(venueId, occasion) {
    const eventPackages = this._getFromStorage('event_packages', []);
    const venues = this._getFromStorage('venues', []);

    const list = eventPackages.filter((ep) => {
      if (ep.venue_id !== venueId) return false;
      if (occasion && ep.occasion !== occasion) return false;
      return true;
    });

    // Resolve venue foreign key
    const venue = venues.find((v) => v.id === venueId) || null;
    return list.map((pkg) => ({ ...pkg, venue }));
  }

  createVenueBooking(venueId, eventType, eventDate, guestCount, rentalType) {
    const venues = this._getFromStorage('venues', []);
    const bookings = this._getFromStorage('bookings', []);

    const quote = this.getVenuePricingQuote(venueId, eventType, eventDate, null, guestCount, rentalType);

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'venue',
      status: 'in_progress',
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      venue_id: venueId,
      property_id: null,
      room_type_id: null,
      meeting_room_id: null,
      event_package_id: null,
      customized_package_id: null,
      event_type: eventType || 'other',
      checkin_date: null,
      checkout_date: null,
      event_date: eventDate || null,
      event_start_datetime: null,
      event_end_datetime: null,
      guest_count: guestCount != null ? guestCount : null,
      adults_count: null,
      children_count: null,
      room_quantity: null,
      price_subtotal: quote.priceSubtotal + quote.taxes,
      price_fees: quote.fees,
      price_discounts: 0,
      price_total: quote.totalPrice,
      currency: quote.currency,
      promo_code: null,
      promo_discount_amount: 0,
      extras: [],
      main_guest_name: null,
      main_guest_email: null,
      special_requests: null,
      current_step: 'booking_details'
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return { booking, nextStep: 'booking_details' };
  }

  // ----------------------------
  // Accommodations (Properties & Rooms)
  // ----------------------------

  getAccommodationFilterOptions() {
    return {
      amenities: [
        { code: 'breakfast_included', label: 'Breakfast included' },
        { code: 'free_cancellation', label: 'Free cancellation' },
        { code: 'wifi', label: 'Wi-Fi' },
        { code: 'parking', label: 'Parking' },
        { code: 'pool', label: 'Pool' },
        { code: 'airport_shuttle', label: 'Airport shuttle' }
      ],
      roomCategories: [
        { value: 'standard_twin_room', label: 'Standard twin room' },
        { value: 'standard_queen_room', label: 'Standard queen room' },
        { value: 'deluxe_room', label: 'Deluxe room' },
        { value: 'suite', label: 'Suite' }
      ],
      pricePerNightMin: 0,
      pricePerNightMax: 2000,
      sortOptions: [
        { value: 'guest_rating_desc', label: 'Guest rating – high to low' },
        { value: 'price_per_night_asc', label: 'Price per night – low to high' },
        { value: 'relevance', label: 'Relevance' }
      ]
    };
  }

  searchAccommodations(destinationLocationId, propertyNameQuery, checkinDate, checkoutDate, adultsCount, childrenCount, maxPricePerNight, amenities, roomCategory, promoEligibleOnly, sortBy) {
    const properties = this._getFromStorage('properties', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const locations = this._getFromStorage('locations', []);

    const qName = (propertyNameQuery || '').toLowerCase();
    const amenityFilter = Array.isArray(amenities) ? amenities : [];

    let destLocation = null;
    if (destinationLocationId) {
      destLocation = locations.find((l) => l.id === destinationLocationId) || null;
    }

    const results = properties.filter((prop) => {
      if (qName) {
        const name = (prop.name || '').toLowerCase();
        if (!name.includes(qName)) return false;
      }

      if (destLocation && destLocation.location_type === 'city') {
        const locName = destLocation.name;
        const matchesCity = prop.city && prop.city === locName;
        const matchesLocationName = prop.location_name && prop.location_name === locName;
        if (!matchesCity && !matchesLocationName) return false;
      }

      const propRoomTypes = roomTypes.filter((rt) => rt.property_id === prop.id);
      if (propRoomTypes.length === 0) return false;

      const hasEligibleRoom = propRoomTypes.some((rt) => {
        if (roomCategory && rt.room_category !== roomCategory) return false;
        if (typeof maxPricePerNight === 'number' && rt.price_per_night > maxPricePerNight) return false;
        if (promoEligibleOnly && !rt.promo_eligible) return false;

        // Amenities - consider property-level and room-level where applicable
        for (const code of amenityFilter) {
          if (code === 'breakfast_included') {
            if (!rt.breakfast_included) return false;
          } else if (code === 'free_cancellation') {
            if (!rt.has_free_cancellation && rt.cancellation_policy !== 'free_cancellation') return false;
          } else {
            const propAm = prop.amenities || [];
            if (!propAm.includes(code)) return false;
          }
        }

        return true;
      });

      return hasEligibleRoom;
    });

    // Attach a minPricePerNight for sorting
    const roomTypesAll = roomTypes;
    const computed = results.map((prop) => {
      const propRoomTypes = roomTypesAll.filter((rt) => rt.property_id === prop.id);
      let minPrice = Number.POSITIVE_INFINITY;
      propRoomTypes.forEach((rt) => {
        if (typeof maxPricePerNight === 'number' && rt.price_per_night > maxPricePerNight) return;
        if (rt.price_per_night < minPrice) minPrice = rt.price_per_night;
      });
      return { prop, minPricePerNight: minPrice === Number.POSITIVE_INFINITY ? null : minPrice };
    });

    const sort = sortBy || 'relevance';
    if (sort === 'guest_rating_desc') {
      computed.sort((a, b) => {
        const ra = a.prop.guest_rating != null ? a.prop.guest_rating : 0;
        const rb = b.prop.guest_rating != null ? b.prop.guest_rating : 0;
        return rb - ra;
      });
    } else if (sort === 'price_per_night_asc') {
      computed.sort((a, b) => {
        const pa = a.minPricePerNight != null ? a.minPricePerNight : Number.POSITIVE_INFINITY;
        const pb = b.minPricePerNight != null ? b.minPricePerNight : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    }
    // 'relevance' leaves order as-is

    return computed.map((c) => c.prop);
  }

  getPropertyDetails(propertyId) {
    const properties = this._getFromStorage('properties', []);
    const property = properties.find((p) => p.id === propertyId) || null;
    if (!property) {
      return { property: null, amenities: [], imageUrls: [], guestRating: null };
    }
    return {
      property,
      amenities: property.amenities || [],
      imageUrls: property.images || [],
      guestRating: property.guest_rating != null ? property.guest_rating : null
    };
  }

  getRoomFilterOptions(propertyId) {
    const roomTypes = this._getFromStorage('room_types', []);
    const rooms = roomTypes.filter((rt) => rt.property_id === propertyId);

    const bedTypeSet = new Set();
    const cancellationSet = new Set();
    let hasPromo = false;
    rooms.forEach((rt) => {
      if (rt.bed_type) bedTypeSet.add(rt.bed_type);
      if (rt.cancellation_policy) cancellationSet.add(rt.cancellation_policy);
      if (rt.promo_eligible) hasPromo = true;
    });

    const bedTypes = Array.from(bedTypeSet).map((bt) => ({ value: bt, label: bt.replace(/_/g, ' ') }));
    const cancellationPolicies = Array.from(cancellationSet).map((cp) => ({ value: cp, label: cp.replace(/_/g, ' ') }));
    const breakfastOptions = [
      { value: 'any', label: 'Any' },
      { value: 'with_breakfast', label: 'Breakfast included' }
    ];

    return {
      bedTypes,
      cancellationPolicies,
      breakfastOptions,
      promoEligibilityFilterAvailable: hasPromo
    };
  }

  getPropertyRoomTypes(propertyId, checkinDate, checkoutDate, adultsCount, childrenCount, bedType, requireFreeCancellation, requireBreakfastIncluded, maxPricePerNight, promoEligibleOnly) {
    const roomTypes = this._getFromStorage('room_types', []);
    const properties = this._getFromStorage('properties', []);
    const property = properties.find((p) => p.id === propertyId) || null;

    let results = roomTypes.filter((rt) => rt.property_id === propertyId);

    if (bedType) {
      results = results.filter((rt) => rt.bed_type === bedType);
    }
    if (requireFreeCancellation) {
      results = results.filter((rt) => rt.has_free_cancellation || rt.cancellation_policy === 'free_cancellation');
    }
    if (requireBreakfastIncluded) {
      results = results.filter((rt) => rt.breakfast_included);
    }
    if (typeof maxPricePerNight === 'number') {
      results = results.filter((rt) => rt.price_per_night <= maxPricePerNight);
    }
    if (promoEligibleOnly) {
      results = results.filter((rt) => rt.promo_eligible);
    }
    if (false && typeof adultsCount === 'number') {
      results = results.filter((rt) => rt.max_occupancy_adults >= adultsCount);
    }

    // Resolve foreign key property_id
    return results.map((rt) => ({ ...rt, property }));
  }

  compareRoomTypes(propertyId, roomTypeIds) {
    const roomTypes = this._getFromStorage('room_types', []);
    const selected = roomTypes.filter((rt) => rt.property_id === propertyId && roomTypeIds.includes(rt.id));

    // Instrumentation for task completion tracking (task_4)
    try {
      if (Array.isArray(roomTypeIds) && roomTypeIds.length === 2) {
        const instrumentationValue = {
          propertyId,
          roomTypeIds,
          comparedAt: this._nowIso()
        };
        localStorage.setItem('task4_comparedRoomTypes', JSON.stringify(instrumentationValue));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return selected.map((rt) => ({
      roomType: rt,
      pricePerNight: rt.price_per_night,
      cancellationPolicyLabel: rt.cancellation_policy ? rt.cancellation_policy.replace(/_/g, ' ') : '',
      breakfastIncluded: !!rt.breakfast_included
    }));
  }

  createAccommodationBooking(propertyId, roomTypeId, checkinDate, checkoutDate, adultsCount, childrenCount, roomQuantity) {
    const bookings = this._getFromStorage('bookings', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const properties = this._getFromStorage('properties', []);

    const roomType = roomTypes.find((rt) => rt.id === roomTypeId) || null;
    const property = properties.find((p) => p.id === propertyId) || null;

    const nights = this._dateDiffInNights(checkinDate, checkoutDate);
    const qty = roomQuantity != null ? roomQuantity : 1;
    const currency = (roomType && roomType.currency) || (property && property.currency) || 'USD';
    const basePerNight = roomType ? roomType.price_per_night : 0;
    const priceSubtotal = basePerNight * nights * qty;
    const fees = priceSubtotal * 0.05;
    const taxes = priceSubtotal * 0.1;
    const total = priceSubtotal + fees + taxes;

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'accommodation',
      status: 'in_progress',
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      venue_id: null,
      property_id: propertyId,
      room_type_id: roomTypeId,
      meeting_room_id: null,
      event_package_id: null,
      customized_package_id: null,
      event_type: null,
      checkin_date: checkinDate || null,
      checkout_date: checkoutDate || null,
      event_date: null,
      event_start_datetime: null,
      event_end_datetime: null,
      guest_count: null,
      adults_count: adultsCount != null ? adultsCount : null,
      children_count: childrenCount != null ? childrenCount : null,
      room_quantity: qty,
      price_subtotal: priceSubtotal + taxes,
      price_fees: fees,
      price_discounts: 0,
      price_total: total,
      currency,
      promo_code: null,
      promo_discount_amount: 0,
      extras: [],
      main_guest_name: null,
      main_guest_email: null,
      special_requests: null,
      current_step: 'booking_details'
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return { booking, nextStep: 'booking_details' };
  }

  // ----------------------------
  // Meeting Rooms
  // ----------------------------

  getMeetingRoomFilterOptions() {
    return {
      amenities: [
        { code: 'video_conferencing', label: 'Video conferencing' },
        { code: 'whiteboard', label: 'Whiteboard' },
        { code: 'projector', label: 'Projector' },
        { code: 'high_speed_wifi', label: 'High-speed Wi-Fi' }
      ],
      sortOptions: [
        { value: 'hourly_rate_asc', label: 'Hourly rate – low to high' },
        { value: 'hourly_rate_desc', label: 'Hourly rate – high to low' }
      ]
    };
  }

  searchMeetingRooms(date, startTime, endTime, attendeesCount, locationId, amenities, sortBy) {
    const meetingRooms = this._getFromStorage('meeting_rooms', []);
    const venues = this._getFromStorage('venues', []);
    const locations = this._getFromStorage('locations', []);

    const amenityFilter = Array.isArray(amenities) ? amenities : [];
    let location = null;
    if (locationId) {
      location = locations.find((l) => l.id === locationId) || null;
    }

    let results = meetingRooms.filter((mr) => {
      if (attendeesCount != null && mr.capacity != null && mr.capacity < attendeesCount) return false;

      if (amenityFilter.length > 0) {
        const am = mr.amenities || [];
        for (const code of amenityFilter) {
          if (!am.includes(code)) return false;
        }
      }

      if (location) {
        const venue = mr.venue_id ? venues.find((v) => v.id === mr.venue_id) || null : null;
        const city = mr.city || (venue && venue.city) || null;
        if (city && city !== location.name) return false;
      }

      return true;
    });

    const sort = sortBy || '';
    if (sort === 'hourly_rate_asc') {
      results.sort((a, b) => a.hourly_rate - b.hourly_rate);
    } else if (sort === 'hourly_rate_desc') {
      results.sort((a, b) => b.hourly_rate - a.hourly_rate);
    }

    // Resolve venue foreign key
    return results.map((mr) => {
      const venue = mr.venue_id ? venues.find((v) => v.id === mr.venue_id) || null : null;
      return { ...mr, venue };
    });
  }

  getMeetingRoomDetails(meetingRoomId) {
    const meetingRooms = this._getFromStorage('meeting_rooms', []);
    const venues = this._getFromStorage('venues', []);

    const meetingRoom = meetingRooms.find((m) => m.id === meetingRoomId) || null;
    let venue = null;
    if (meetingRoom && meetingRoom.venue_id) {
      venue = venues.find((v) => v.id === meetingRoom.venue_id) || null;
    }

    return { meetingRoom, venue };
  }

  createMeetingRoomBooking(meetingRoomId, date, startTime, endTime, attendeesCount) {
    const bookings = this._getFromStorage('bookings', []);
    const meetingRooms = this._getFromStorage('meeting_rooms', []);

    const meetingRoom = meetingRooms.find((m) => m.id === meetingRoomId) || null;
    const currency = (meetingRoom && meetingRoom.currency) || 'USD';

    const { start, end } = this._timeRangeToDateTimes(date, startTime, endTime);
    const startDate = new Date(start);
    const endDate = new Date(end);
    const hours = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    const rate = meetingRoom ? meetingRoom.hourly_rate : 0;
    const priceSubtotal = rate * hours;
    const fees = priceSubtotal * 0.05;
    const taxes = priceSubtotal * 0.1;
    const total = priceSubtotal + fees + taxes;

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'meeting_room',
      status: 'in_progress',
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      venue_id: meetingRoom && meetingRoom.venue_id ? meetingRoom.venue_id : null,
      property_id: null,
      room_type_id: null,
      meeting_room_id: meetingRoomId,
      event_package_id: null,
      customized_package_id: null,
      event_type: null,
      checkin_date: null,
      checkout_date: null,
      event_date: date || null,
      event_start_datetime: start,
      event_end_datetime: end,
      guest_count: attendeesCount != null ? attendeesCount : null,
      adults_count: null,
      children_count: null,
      room_quantity: null,
      price_subtotal: priceSubtotal + taxes,
      price_fees: fees,
      price_discounts: 0,
      price_total: total,
      currency,
      promo_code: null,
      promo_discount_amount: 0,
      extras: [],
      main_guest_name: null,
      main_guest_email: null,
      special_requests: null,
      current_step: 'booking_details'
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return { booking, nextStep: 'booking_details' };
  }

  // ----------------------------
  // Event Packages & Customization
  // ----------------------------

  getEventPackageFilterOptions() {
    return {
      occasions: [
        { value: 'wedding', label: 'Wedding' },
        { value: 'corporate_conference', label: 'Corporate conference' },
        { value: 'corporate_retreat', label: 'Corporate retreat' },
        { value: 'other', label: 'Other' }
      ],
      sortOptions: [
        { value: 'recommended', label: 'Recommended' },
        { value: 'price_asc', label: 'Price – low to high' },
        { value: 'price_desc', label: 'Price – high to low' },
        { value: 'popularity_desc', label: 'Popularity' }
      ],
      budgetMin: 0,
      budgetMax: 20000
    };
  }

  searchEventPackages(occasion, guestCount, maxBudget, includesVenueOnly, sortBy) {
    const eventPackages = this._getFromStorage('event_packages', []);
    const venues = this._getFromStorage('venues', []);

    const filtered = eventPackages.filter((ep) => {
      if (occasion && ep.occasion !== occasion) return false;
      if (includesVenueOnly && !ep.includes_venue) return false;

      // Check guest count vs guest_min/guest_max
      if (guestCount != null) {
        if (ep.guest_min != null && guestCount < ep.guest_min) return false;
        if (ep.guest_max != null && guestCount > ep.guest_max) return false;
      }

      if (typeof maxBudget === 'number') {
        const { totalPrice } = this._calculatePackageTotalPrice(ep, guestCount || 0, null);
        if (totalPrice > maxBudget) return false;
      }

      return true;
    });

    const withComputedPrice = filtered.map((ep) => {
      const { totalPrice } = this._calculatePackageTotalPrice(ep, guestCount || 0, null);
      const venue = ep.venue_id ? venues.find((v) => v.id === ep.venue_id) || null : null;
      return { ep, totalPrice, venue };
    });

    const sort = sortBy || 'recommended';
    if (sort === 'price_asc') {
      withComputedPrice.sort((a, b) => a.totalPrice - b.totalPrice);
    } else if (sort === 'price_desc') {
      withComputedPrice.sort((a, b) => b.totalPrice - a.totalPrice);
    } else if (sort === 'recommended') {
      withComputedPrice.sort((a, b) => {
        const ra = a.ep.is_recommended ? 1 : 0;
        const rb = b.ep.is_recommended ? 1 : 0;
        if (rb !== ra) return rb - ra;
        return a.totalPrice - b.totalPrice;
      });
    }
    // popularity_desc falls back to price_asc

    return withComputedPrice.map((item) => ({ ...item.ep, venue: item.venue }));
  }

  getEventPackageDetails(eventPackageId) {
    const eventPackages = this._getFromStorage('event_packages', []);
    const venues = this._getFromStorage('venues', []);

    const pkg = eventPackages.find((ep) => ep.id === eventPackageId) || null;
    if (!pkg) return null;
    const venue = pkg.venue_id ? venues.find((v) => v.id === pkg.venue_id) || null : null;
    return { ...pkg, venue };
  }

  saveCustomizedPackage(eventPackageId, guestCount, selectedMenuType, vegetarianOptions, seafoodMenu, decorStyle, seatingLayout, maxBudget) {
    const eventPackages = this._getFromStorage('event_packages', []);
    const customizedPackages = this._getFromStorage('customized_packages', []);

    const eventPackage = eventPackages.find((ep) => ep.id === eventPackageId) || null;
    if (!eventPackage) {
      return {
        customizedPackage: null,
        withinBudget: false,
        message: 'Base event package not found.'
      };
    }

    const { totalPrice, currency } = this._calculatePackageTotalPrice(eventPackage, guestCount || 0, {
      selectedMenuType,
      vegetarianOptions,
      seafoodMenu
    });

    const customizedPackage = {
      id: this._generateId('custompkg'),
      event_package_id: eventPackageId,
      guest_count: guestCount || 0,
      selected_menu_type: selectedMenuType,
      vegetarian_options: !!vegetarianOptions,
      seafood_menu: !!seafoodMenu,
      decor_style: decorStyle,
      seating_layout: seatingLayout,
      total_price: totalPrice,
      currency: currency || 'USD',
      saved_at: this._nowIso()
    };

    customizedPackages.push(customizedPackage);
    this._saveToStorage('customized_packages', customizedPackages);

    const withinBudget = typeof maxBudget === 'number' ? totalPrice <= maxBudget : true;
    const message = withinBudget ? 'Customized package saved within budget.' : 'Customized package exceeds budget.';

    return { customizedPackage, withinBudget, message };
  }

  addCustomizedPackageToCart(customizedPackageId, eventDate) {
    const customizedPackages = this._getFromStorage('customized_packages', []);
    const eventPackages = this._getFromStorage('event_packages', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const customPkg = customizedPackages.find((c) => c.id === customizedPackageId) || null;
    if (!customPkg) {
      return { cart: this._getOrCreateCart(), addedItem: null };
    }

    const eventPackage = eventPackages.find((ep) => ep.id === customPkg.event_package_id) || null;
    const cart = this._getOrCreateCart();

    const unitPrice = customPkg.total_price || 0;
    const item = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'event_package',
      reference_id: eventPackage ? eventPackage.id : customPkg.event_package_id,
      name: eventPackage ? eventPackage.name : 'Customized package',
      event_type: eventPackage ? eventPackage.occasion : null,
      guest_count: customPkg.guest_count,
      date_start: eventDate || null,
      date_end: null,
      quantity: 1,
      unit_price: unitPrice,
      total_price: unitPrice,
      currency: customPkg.currency || 'USD',
      customized_package_id: customizedPackageId
    };

    cart.items.push(item.id);
    cartItems.push(item);

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);

    const { cart: updatedCart } = this._recalculateCartTotals();
    const addedItem = this._decorateCartItem(item);

    return { cart: updatedCart, addedItem };
  }

  addEventPackageToCart(eventPackageId, eventType, eventDate, guestCount) {
    const eventPackages = this._getFromStorage('event_packages', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const eventPackage = eventPackages.find((ep) => ep.id === eventPackageId) || null;
    if (!eventPackage) {
      return { cart: this._getOrCreateCart(), addedItem: null };
    }

    const cart = this._getOrCreateCart();
    const { totalPrice, currency } = this._calculatePackageTotalPrice(eventPackage, guestCount || 0, null);

    const item = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'event_package',
      reference_id: eventPackageId,
      name: eventPackage.name,
      event_type: eventType || eventPackage.occasion,
      guest_count: guestCount != null ? guestCount : null,
      date_start: eventDate || null,
      date_end: null,
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      currency: currency || 'USD'
    };

    cart.items.push(item.id);
    cartItems.push(item);

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);

    const { cart: updatedCart } = this._recalculateCartTotals();
    const addedItem = this._decorateCartItem(item);

    return { cart: updatedCart, addedItem };
  }

  // ----------------------------
  // Cart operations
  // ----------------------------

  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id).map((ci) => this._decorateCartItem(ci));
    this._recalculateCartTotals();
    const updatedCart = this._getFromStorage('cart', null);
    return { cart: updatedCart, items: itemsForCart };
  }

  updateCartItem(cartItemId, quantity, dateStart, dateEnd) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (itemIndex === -1) {
      return { cart, updatedItem: null };
    }

    const item = cartItems[itemIndex];
    if (typeof quantity === 'number') {
      item.quantity = quantity;
    }
    if (typeof dateStart === 'string') {
      item.date_start = dateStart;
    }
    if (typeof dateEnd === 'string') {
      item.date_end = dateEnd;
    }

    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);
    const { cart: updatedCart } = this._recalculateCartTotals();
    const updatedItem = this._decorateCartItem(item);

    return { cart: updatedCart, updatedItem };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const beforeLength = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);

    const success = cartItems.length < beforeLength;

    // Remove ID from cart.items if present
    if (success) {
      cart.items = (cart.items || []).filter((id) => id !== cartItemId);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);
    const { cart: updatedCart } = this._recalculateCartTotals();

    return { cart: updatedCart, success };
  }

  createBookingFromCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const bookings = this._getFromStorage('bookings', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const eventPackages = this._getFromStorage('event_packages', []);
    const meetingRooms = this._getFromStorage('meeting_rooms', []);

    const cartItem = cartItems.find((ci) => ci.id === cartItemId && ci.cart_id === cart.id) || null;
    if (!cartItem) {
      return { booking: null, nextStep: null };
    }

    let booking = null;
    const now = this._nowIso();

    if (cartItem.item_type === 'event_package') {
      const ep = eventPackages.find((e) => e.id === cartItem.reference_id) || null;
      booking = {
        id: this._generateId('booking'),
        booking_type: 'event_package',
        status: 'in_progress',
        created_at: now,
        updated_at: now,
        venue_id: ep && ep.venue_id ? ep.venue_id : null,
        property_id: null,
        room_type_id: null,
        meeting_room_id: null,
        event_package_id: cartItem.reference_id,
        customized_package_id: cartItem.customized_package_id || null,
        event_type: cartItem.event_type || (ep ? ep.occasion : null),
        checkin_date: null,
        checkout_date: null,
        event_date: cartItem.date_start || null,
        event_start_datetime: null,
        event_end_datetime: null,
        guest_count: cartItem.guest_count != null ? cartItem.guest_count : null,
        adults_count: null,
        children_count: null,
        room_quantity: null,
        price_subtotal: cartItem.total_price,
        price_fees: 0,
        price_discounts: 0,
        price_total: cartItem.total_price,
        currency: cartItem.currency || 'USD',
        promo_code: null,
        promo_discount_amount: 0,
        extras: [],
        main_guest_name: null,
        main_guest_email: null,
        special_requests: null,
        current_step: 'booking_details'
      };
    } else if (cartItem.item_type === 'room_type') {
      const rt = roomTypes.find((r) => r.id === cartItem.reference_id) || null;
      const propertyId = rt ? rt.property_id : null;
      const nights = this._dateDiffInNights(cartItem.date_start, cartItem.date_end);
      const qty = cartItem.quantity != null ? cartItem.quantity : 1;
      const baseSubtotal = (rt ? rt.price_per_night : 0) * nights * qty;
      const fees = baseSubtotal * 0.05;
      const taxes = baseSubtotal * 0.1;
      const total = baseSubtotal + fees + taxes;

      booking = {
        id: this._generateId('booking'),
        booking_type: 'accommodation',
        status: 'in_progress',
        created_at: now,
        updated_at: now,
        venue_id: null,
        property_id: propertyId,
        room_type_id: cartItem.reference_id,
        meeting_room_id: null,
        event_package_id: null,
        customized_package_id: null,
        event_type: null,
        checkin_date: cartItem.date_start || null,
        checkout_date: cartItem.date_end || null,
        event_date: null,
        event_start_datetime: null,
        event_end_datetime: null,
        guest_count: null,
        adults_count: null,
        children_count: null,
        room_quantity: qty,
        price_subtotal: baseSubtotal + taxes,
        price_fees: fees,
        price_discounts: 0,
        price_total: total,
        currency: cartItem.currency || (rt && rt.currency) || 'USD',
        promo_code: null,
        promo_discount_amount: 0,
        extras: [],
        main_guest_name: null,
        main_guest_email: null,
        special_requests: null,
        current_step: 'booking_details'
      };
    } else if (cartItem.item_type === 'meeting_room') {
      const mr = meetingRooms.find((m) => m.id === cartItem.reference_id) || null;
      const start = cartItem.date_start || null;
      const end = cartItem.date_end || null;
      let hours = 0;
      if (start && end) {
        const s = new Date(start);
        const e = new Date(end);
        hours = Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60));
      }
      const rate = mr ? mr.hourly_rate : 0;
      const baseSubtotal = rate * hours;
      const fees = baseSubtotal * 0.05;
      const taxes = baseSubtotal * 0.1;
      const total = baseSubtotal + fees + taxes;

      booking = {
        id: this._generateId('booking'),
        booking_type: 'meeting_room',
        status: 'in_progress',
        created_at: now,
        updated_at: now,
        venue_id: mr && mr.venue_id ? mr.venue_id : null,
        property_id: null,
        room_type_id: null,
        meeting_room_id: cartItem.reference_id,
        event_package_id: null,
        customized_package_id: null,
        event_type: null,
        checkin_date: null,
        checkout_date: null,
        event_date: start ? start.substring(0, 10) : null,
        event_start_datetime: start,
        event_end_datetime: end,
        guest_count: cartItem.guest_count != null ? cartItem.guest_count : null,
        adults_count: null,
        children_count: null,
        room_quantity: null,
        price_subtotal: baseSubtotal + taxes,
        price_fees: fees,
        price_discounts: 0,
        price_total: total,
        currency: cartItem.currency || (mr && mr.currency) || 'USD',
        promo_code: null,
        promo_discount_amount: 0,
        extras: [],
        main_guest_name: null,
        main_guest_email: null,
        special_requests: null,
        current_step: 'booking_details'
      };
    } else if (cartItem.item_type === 'venue') {
      // Generic venue booking from cart (less common)
      booking = {
        id: this._generateId('booking'),
        booking_type: 'venue',
        status: 'in_progress',
        created_at: now,
        updated_at: now,
        venue_id: cartItem.reference_id,
        property_id: null,
        room_type_id: null,
        meeting_room_id: null,
        event_package_id: null,
        customized_package_id: null,
        event_type: cartItem.event_type || 'other',
        checkin_date: null,
        checkout_date: null,
        event_date: cartItem.date_start || null,
        event_start_datetime: null,
        event_end_datetime: null,
        guest_count: cartItem.guest_count != null ? cartItem.guest_count : null,
        adults_count: null,
        children_count: null,
        room_quantity: null,
        price_subtotal: cartItem.total_price,
        price_fees: 0,
        price_discounts: 0,
        price_total: cartItem.total_price,
        currency: cartItem.currency || 'USD',
        promo_code: null,
        promo_discount_amount: 0,
        extras: [],
        main_guest_name: null,
        main_guest_email: null,
        special_requests: null,
        current_step: 'booking_details'
      };
    }

    if (!booking) {
      return { booking: null, nextStep: null };
    }

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return { booking, nextStep: 'booking_details' };
  }

  // ----------------------------
  // Favorites
  // ----------------------------

  addFavoriteItem(itemType, itemId) {
    const favoriteItems = this._getFromStorage('favorite_items', []);

    const exists = favoriteItems.some((f) => f.item_type === itemType && f.item_id === itemId);
    if (exists) {
      return favoriteItems.find((f) => f.item_type === itemType && f.item_id === itemId);
    }

    const favorite = {
      id: this._generateId('fav'),
      item_type: itemType,
      item_id: itemId,
      added_at: this._nowIso()
    };

    favoriteItems.push(favorite);
    this._saveToStorage('favorite_items', favoriteItems);
    return favorite;
  }

  removeFavoriteItem(itemType, itemId) {
    let favoriteItems = this._getFromStorage('favorite_items', []);
    const before = favoriteItems.length;
    favoriteItems = favoriteItems.filter((f) => !(f.item_type === itemType && f.item_id === itemId));
    this._saveToStorage('favorite_items', favoriteItems);
    return { success: favoriteItems.length < before };
  }

  getFavoriteItems() {
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const venues = this._getFromStorage('venues', []);
    const properties = this._getFromStorage('properties', []);
    const eventPackages = this._getFromStorage('event_packages', []);

    return favoriteItems.map((fav) => {
      let entity = null;
      let itemName = '';
      let thumbnailUrl = null;
      let locationName = null;
      let guestRating = null;

      if (fav.item_type === 'venue') {
        entity = venues.find((v) => v.id === fav.item_id) || null;
        if (entity) {
          itemName = entity.name || '';
          thumbnailUrl = entity.images && entity.images[0];
          locationName = entity.city || entity.nearest_city_name || null;
          guestRating = entity.guest_rating != null ? entity.guest_rating : null;
        }
      } else if (fav.item_type === 'property') {
        entity = properties.find((p) => p.id === fav.item_id) || null;
        if (entity) {
          itemName = entity.name || '';
          thumbnailUrl = entity.images && entity.images[0];
          locationName = entity.location_name || entity.city || null;
          guestRating = entity.guest_rating != null ? entity.guest_rating : null;
        }
      } else if (fav.item_type === 'event_package') {
        entity = eventPackages.find((e) => e.id === fav.item_id) || null;
        if (entity) {
          itemName = entity.name || '';
          thumbnailUrl = entity.images && entity.images[0];
          locationName = null;
          guestRating = null;
        }
      }

      return {
        favoriteId: fav.id,
        itemType: fav.item_type,
        itemId: fav.item_id,
        itemName,
        thumbnailUrl,
        locationName,
        guestRating,
        addedAt: fav.added_at,
        // Foreign-key resolution for itemId -> item
        item: entity
      };
    });
  }

  // ----------------------------
  // Promotions
  // ----------------------------

  getActivePromotions() {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    return promotions.filter((p) => {
      if (!p.is_active) return false;
      if (p.valid_from) {
        const from = new Date(p.valid_from);
        if (now < from) return false;
      }
      if (p.valid_to) {
        const to = new Date(p.valid_to);
        if (now > to) return false;
      }
      return true;
    });
  }

  getPromotionDetails(promotionId, code) {
    const promotions = this._getFromStorage('promotions', []);
    let promotion = null;

    if (promotionId) {
      promotion = promotions.find((p) => p.id === promotionId) || null;
    } else if (code) {
      const c = code.toLowerCase();
      promotion = promotions.find((p) => (p.code || '').toLowerCase() === c) || null;
    }

    if (!promotion) {
      return { promotion: null, bookingContext: null };
    }

    const bookingContext = {
      targetSection: promotion.applicable_section || null,
      defaultSearchParams: {
        destinationLocationId: null,
        checkinDate: null,
        checkoutDate: null,
        minNights: promotion.min_nights || null
      }
    };

    return { promotion, bookingContext };
  }

  // ----------------------------
  // Booking summary & updates
  // ----------------------------

  getBookingSummary(bookingId) {
    const details = this._getBookingById(bookingId);
    if (!details) {
      return {
        booking: null,
        linkedVenue: null,
        linkedProperty: null,
        linkedRoomType: null,
        linkedMeetingRoom: null,
        linkedEventPackage: null,
        linkedCustomizedPackage: null,
        extras: []
      };
    }
    return details;
  }

  updateBookingDetailsStep(bookingId, details) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) return null;

    const booking = bookings[idx];
    const d = details || {};

    if (typeof d.eventDate === 'string') booking.event_date = d.eventDate;
    if (typeof d.eventStartDatetime === 'string') booking.event_start_datetime = d.eventStartDatetime;
    if (typeof d.eventEndDatetime === 'string') booking.event_end_datetime = d.eventEndDatetime;
    if (typeof d.checkinDate === 'string') booking.checkin_date = d.checkinDate;
    if (typeof d.checkoutDate === 'string') booking.checkout_date = d.checkoutDate;
    if (typeof d.guestCount === 'number') booking.guest_count = d.guestCount;
    if (typeof d.adultsCount === 'number') booking.adults_count = d.adultsCount;
    if (typeof d.childrenCount === 'number') booking.children_count = d.childrenCount;
    if (typeof d.roomQuantity === 'number') booking.room_quantity = d.roomQuantity;

    // Simple recalculation for known booking types
    if (booking.booking_type === 'accommodation' && booking.room_type_id) {
      const roomTypes = this._getFromStorage('room_types', []);
      const rt = roomTypes.find((r) => r.id === booking.room_type_id) || null;
      if (rt && booking.checkin_date && booking.checkout_date) {
        const nights = this._dateDiffInNights(booking.checkin_date, booking.checkout_date);
        const qty = booking.room_quantity != null ? booking.room_quantity : 1;
        const baseSubtotal = rt.price_per_night * nights * qty;
        const fees = baseSubtotal * 0.05;
        const taxes = baseSubtotal * 0.1;
        booking.price_subtotal = baseSubtotal + taxes;
        booking.price_fees = fees;
        booking.price_total = booking.price_subtotal + booking.price_fees - (booking.price_discounts || 0);
      }
    } else if (booking.booking_type === 'meeting_room' && booking.meeting_room_id && booking.event_start_datetime && booking.event_end_datetime) {
      const meetingRooms = this._getFromStorage('meeting_rooms', []);
      const mr = meetingRooms.find((m) => m.id === booking.meeting_room_id) || null;
      if (mr) {
        const s = new Date(booking.event_start_datetime);
        const e = new Date(booking.event_end_datetime);
        const hours = Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60));
        const baseSubtotal = mr.hourly_rate * hours;
        const fees = baseSubtotal * 0.05;
        const taxes = baseSubtotal * 0.1;
        booking.price_subtotal = baseSubtotal + taxes;
        booking.price_fees = fees;
        booking.price_total = booking.price_subtotal + booking.price_fees - (booking.price_discounts || 0);
      }
    }

    booking.updated_at = this._nowIso();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return booking;
  }

  setBookingExtras(bookingId, extras) {
    const bookings = this._getFromStorage('bookings', []);
    const bookingIdx = bookings.findIndex((b) => b.id === bookingId);
    if (bookingIdx === -1) return [];

    let bookingExtras = this._getFromStorage('booking_extras', []);

    // Remove existing extras for this booking
    bookingExtras = bookingExtras.filter((ex) => ex.booking_id !== bookingId);

    const newExtras = (extras || []).map((ex) => ({
      id: this._generateId('extra'),
      booking_id: bookingId,
      extra_type: ex.extraType,
      name: ex.name,
      details: ex.details || null,
      quantity: ex.quantity != null ? ex.quantity : 1,
      unit_price: 0,
      total_price: 0
    }));

    bookingExtras = bookingExtras.concat(newExtras);
    this._saveToStorage('booking_extras', bookingExtras);

    // Optionally update booking price_fees based on extras (sum of total_price, which is 0 here)
    const booking = bookings[bookingIdx];
    booking.extras = newExtras.map((e) => e.id);
    booking.updated_at = this._nowIso();
    bookings[bookingIdx] = booking;
    this._saveToStorage('bookings', bookings);

    return newExtras;
  }

  setBookingGuestDetails(bookingId, mainGuestName, mainGuestEmail, specialRequests) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) return null;

    const booking = bookings[idx];
    booking.main_guest_name = mainGuestName;
    booking.main_guest_email = mainGuestEmail;
    if (typeof specialRequests === 'string') {
      booking.special_requests = specialRequests;
    }
    booking.updated_at = this._nowIso();

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return booking;
  }

  applyPromoCodeToBooking(bookingId, promoCode) {
    const bookings = this._getFromStorage('bookings', []);
    const promotions = this._getFromStorage('promotions', []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return { booking: null, promotion: null, success: false, message: 'Booking not found.' };
    }

    const booking = bookings[idx];
    const codeLower = (promoCode || '').toLowerCase();
    const promotion = promotions.find((p) => (p.code || '').toLowerCase() === codeLower) || null;
    if (!promotion) {
      return { booking, promotion: null, success: false, message: 'Promotion not found.' };
    }

    const { isEligible, discountAmount, message } = this._applyPromotionRules(booking, promotion);
    if (!isEligible) {
      return { booking, promotion, success: false, message };
    }

    booking.promo_code = promotion.code;
    booking.promo_discount_amount = discountAmount;
    booking.price_discounts = discountAmount;
    booking.price_total = (booking.price_subtotal || 0) + (booking.price_fees || 0) - discountAmount;
    booking.updated_at = this._nowIso();

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return { booking, promotion, success: true, message };
  }

  setBookingCurrentStep(bookingId, targetStep) {
    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) return null;

    const booking = bookings[idx];
    booking.current_step = targetStep;

    if (targetStep === 'payment') {
      booking.status = 'pending_payment';
    }

    booking.updated_at = this._nowIso();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return booking;
  }

  getPaymentSummary(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return {
        booking: null,
        amountDue: 0,
        currency: 'USD',
        promoCode: null,
        promoDiscountAmount: 0
      };
    }

    const amountDue = booking.price_total != null
      ? booking.price_total
      : (booking.price_subtotal || 0) + (booking.price_fees || 0) - (booking.price_discounts || 0);

    return {
      booking,
      amountDue,
      currency: booking.currency || 'USD',
      promoCode: booking.promo_code || null,
      promoDiscountAmount: booking.promo_discount_amount || 0
    };
  }

  submitPayment(bookingId, paymentMethod, paymentDetails) {
    const bookings = this._getFromStorage('bookings', []);
    const payments = this._getFromStorage('payments', []);

    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return { payment: null, booking: null };
    }

    const booking = bookings[idx];
    const now = this._nowIso();

    const amount = booking.price_total != null
      ? booking.price_total
      : (booking.price_subtotal || 0) + (booking.price_fees || 0) - (booking.price_discounts || 0);

    const payment = {
      id: this._generateId('pay'),
      booking_id: bookingId,
      status: 'paid',
      amount,
      currency: booking.currency || 'USD',
      payment_method: paymentMethod,
      created_at: now,
      updated_at: now,
      cardNumberLast4: paymentDetails && paymentDetails.cardNumberLast4 || null,
      cardExpiryMonth: paymentDetails && paymentDetails.cardExpiryMonth || null,
      cardExpiryYear: paymentDetails && paymentDetails.cardExpiryYear || null,
      cardholderName: paymentDetails && paymentDetails.cardholderName || null,
      externalTransactionId: paymentDetails && paymentDetails.externalTransactionId || null
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);

    booking.status = 'confirmed';
    booking.updated_at = now;
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return { payment, booking };
  }

  // ----------------------------
  // Static content & contact/FAQ/terms/privacy
  // ----------------------------

  getAboutContent() {
    return {
      headline: 'About Our Event Venues & Stays Platform',
      bodyHtml: '<p>We connect you with curated venues, accommodations, and event packages for weddings, conferences, retreats, and more.</p>',
      experienceYears: 10,
      certifications: ['Certified Event Planner Network', 'Trusted Hospitality Partner']
    };
  }

  getContactInfo() {
    return {
      phoneNumbers: ['+1-000-000-0000'],
      emailAddresses: ['support@example.com'],
      physicalAddress: '123 Example Street, Example City, EX 00000',
      supportHours: 'Mon–Fri, 9:00 AM – 6:00 PM (local time)'
    };
  }

  submitContactForm(name, email, subject, message) {
    const contactMessages = this._getFromStorage('contact_messages', []);
    const record = {
      id: this._generateId('contact'),
      name,
      email,
      subject: subject || null,
      message,
      created_at: this._nowIso()
    };
    contactMessages.push(record);
    this._saveToStorage('contact_messages', contactMessages);

    return { success: true, message: 'Your inquiry has been submitted.' };
  }

  getFAQEntries() {
    return [
      {
        question: 'How do I book a venue or accommodation?',
        answerHtml: '<p>Use the search tools on our Venues or Accommodations pages, select an option, and follow the booking steps.</p>',
        category: 'venues'
      },
      {
        question: 'Can I apply promo codes like SAVE20 to my stay?',
        answerHtml: '<p>Yes, enter your promo code on the checkout page. Eligibility depends on stay dates and location.</p>',
        category: 'promotions'
      },
      {
        question: 'Do meeting rooms include equipment like projectors or video conferencing?',
        answerHtml: '<p>Amenities vary by meeting room. Use filters such as projector, high-speed Wi-Fi, or video conferencing during search.</p>',
        category: 'meeting_rooms'
      }
    ];
  }

  getTermsContent() {
    return {
      lastUpdated: '2024-01-01',
      bodyHtml: '<p>These are the terms and conditions governing use of this service.</p>'
    };
  }

  getPrivacyContent() {
    return {
      lastUpdated: '2024-01-01',
      bodyHtml: '<p>This Privacy Policy explains how we handle your data and cookies.</p>'
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