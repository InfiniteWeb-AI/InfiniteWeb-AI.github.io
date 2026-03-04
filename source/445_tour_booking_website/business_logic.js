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
  }

  // -----------------------------
  // Storage helpers
  // -----------------------------

  _initStorage() {
    const defaults = {
      // Core entities
      destinations: [],
      tours: [],
      tour_timeslots: [],
      tour_addons: [],
      cart: null, // single cart for current user/session
      cart_items: [],
      cart_item_addons: [],
      wishlists: [],
      wishlist_items: [],
      gift_card_products: [],
      gift_card_purchases: [],
      promo_codes: [],
      bookings: [],
      booking_items: [],
      booking_item_addons: [],
      // CMS / content-like structures
      how_it_works_content: {
        sections: [],
        mentionsPromoCodes: false,
        mentionsGiftCards: false,
        mentionsManageBooking: false
      },
      about_content: {
        title: '',
        body: '',
        highlights: []
      },
      contact_page_config: {
        supportEmail: '',
        supportPhone: '',
        responseTimeDescription: '',
        topics: []
      },
      faq_entries: [],
      terms_content: {
        lastUpdated: '',
        body: ''
      },
      privacy_policy_content: {
        lastUpdated: '',
        body: ''
      },
      idCounter: 1000
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaults[key]));
      }
    });
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const raw = localStorage.getItem('idCounter');
    const current = raw ? parseInt(raw, 10) : 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', JSON.stringify(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -----------------------------
  // Domain helpers
  // -----------------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object') {
      cart = {
        id: this._generateId('cart'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [], // array of CartItem ids
        subtotal_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        currency: 'usd',
        promo_code_id: null,
        promo_code_value: null,
        contact_email: null,
        contact_phone: null
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists', []);
    if (wishlists.length > 0) {
      return wishlists[0];
    }
    const wishlist = {
      id: this._generateId('wishlist'),
      created_at: new Date().toISOString()
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  _distanceKmBetweenCoords(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' ||
      typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' ||
      typeof lon2 !== 'number'
    ) {
      return Infinity;
    }
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _findEarliestMatchingTimeslot(tourId, date, timeOfDay) {
    const timeslots = this._getFromStorage('tour_timeslots', []);
    const targetDate = date;
    const filtered = timeslots.filter((ts) => {
      if (ts.tour_id !== tourId) return false;
      if (!ts.departure_datetime) return false;
      const tsDate = ts.departure_datetime.split('T')[0];
      if (tsDate !== targetDate) return false;
      if (timeOfDay && timeOfDay !== 'anytime') {
        return ts.time_of_day === timeOfDay;
      }
      return true;
    });
    if (filtered.length === 0) return null;
    filtered.sort((a, b) => {
      const da = new Date(a.departure_datetime).getTime();
      const db = new Date(b.departure_datetime).getTime();
      return da - db;
    });
    return filtered[0];
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    let subtotal = 0;
    cartItems.forEach((ci) => {
      if (ci.cart_id === cart.id) {
        subtotal += ci.line_total_amount || 0;
      }
    });

    cart.subtotal_amount = subtotal;

    // Re-apply promo code if present
    let discount = 0;
    if (cart.promo_code_value) {
      const validation = this._validatePromoCodeForCart(cart, cart.promo_code_value);
      if (validation.valid) {
        discount = validation.discountAmount;
        cart.promo_code_id = validation.promo.id;
      } else {
        // Invalidate promo if no longer valid
        cart.promo_code_id = null;
        cart.promo_code_value = null;
      }
    }

    cart.discount_amount = discount;
    const total = subtotal - discount;
    cart.total_amount = total >= 0 ? total : 0;
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
  }

  _validatePromoCodeForCart(cart, promoCode) {
    const promoCodes = this._getFromStorage('promo_codes', []);
    const codeUpper = String(promoCode || '').trim().toUpperCase();
    const promo = promoCodes.find((p) => String(p.code || '').toUpperCase() === codeUpper);

    if (!promo || !promo.is_active) {
      return { valid: false, message: 'Invalid promo code.' };
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        return { valid: false, message: 'Promo code not yet valid.' };
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) {
        return { valid: false, message: 'Promo code has expired.' };
      }
    }

    if (
      typeof promo.minimum_cart_subtotal === 'number' &&
      cart.subtotal_amount < promo.minimum_cart_subtotal
    ) {
      return { valid: false, message: 'Cart does not meet minimum subtotal for this promo.' };
    }

    if (promo.currency && promo.currency !== cart.currency) {
      return { valid: false, message: 'Promo currency does not match cart currency.' };
    }

    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = (cart.subtotal_amount * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discountAmount = promo.discount_value;
    }

    if (discountAmount > cart.subtotal_amount) {
      discountAmount = cart.subtotal_amount;
    }

    return { valid: true, promo, discountAmount };
  }

  _updateBookingItemSchedule(bookingItemId, newDate, timeOfDay, timeslotId) {
    const bookings = this._getFromStorage('bookings', []);
    const bookingItems = this._getFromStorage('booking_items', []);
    const tours = this._getFromStorage('tours', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);

    const item = bookingItems.find((bi) => bi.id === bookingItemId);
    if (!item) {
      return { success: false, message: 'Booking item not found.', booking: null, items: [] };
    }

    const booking = bookings.find((b) => b.id === item.booking_id) || null;
    const tour = tours.find((t) => t.id === item.tour_id) || null;

    const effectiveTimeOfDay = timeOfDay || item.time_of_day || 'anytime';
    let selectedTimeslot = null;
    if (timeslotId) {
      selectedTimeslot = timeslots.find((ts) => ts.id === timeslotId) || null;
    } else if (tour) {
      selectedTimeslot = this._findEarliestMatchingTimeslot(
        tour.id,
        newDate,
        effectiveTimeOfDay
      );
    }

    item.date = newDate;
    if (selectedTimeslot) {
      item.timeslot_id = selectedTimeslot.id;
      item.time_of_day = selectedTimeslot.time_of_day;
    } else {
      item.timeslot_id = null;
      item.time_of_day = effectiveTimeOfDay;
    }

    if (booking) {
      booking.updated_at = new Date().toISOString();
    }

    this._saveToStorage('booking_items', bookingItems);
    this._saveToStorage('bookings', bookings);

    // Build enriched items array
    const destinations = this._getFromStorage('destinations', []);
    const bookingItemAddons = this._getFromStorage('booking_item_addons', []);
    const tourAddons = this._getFromStorage('tour_addons', []);

    const itemsForBooking = bookingItems
      .filter((bi) => bi.booking_id === item.booking_id)
      .map((bi) => {
        const tourObj = tours.find((t) => t.id === bi.tour_id) || null;
        const destObj = destinations.find((d) => d.id === bi.destination_id) || null;
        const tsObj = timeslots.find((ts) => ts.id === bi.timeslot_id) || null;
        const addons = bookingItemAddons
          .filter((a) => a.booking_item_id === bi.id)
          .map((a) => {
            const ta = tourAddons.find((t) => t.id === a.tour_addon_id) || null;
            return {
              ...a,
              tourAddon: ta
            };
          });
        return {
          ...bi,
          tour: tourObj,
          destination: destObj,
          timeslot: tsObj,
          addons
        };
      });

    return { success: true, message: 'Booking item rescheduled.', booking, items: itemsForBooking };
  }

  // -----------------------------
  // Interface implementations
  // -----------------------------

  // getFeaturedDestinations()
  getFeaturedDestinations() {
    const destinations = this._getFromStorage('destinations', []);
    const tours = this._getFromStorage('tours', []);

    const featured = destinations.filter((d) => d.is_featured);

    return featured.map((dest) => {
      const destTours = tours.filter((t) => t.destination_id === dest.id);
      const timeOfDaySet = new Set();
      const tourTypeSet = new Set();

      destTours.forEach((t) => {
        if (Array.isArray(t.time_of_day_options)) {
          t.time_of_day_options.forEach((tod) => timeOfDaySet.add(tod));
        }
        if (t.primary_tour_type) {
          tourTypeSet.add(t.primary_tour_type);
        }
      });

      return {
        id: dest.id,
        name: dest.name,
        city: dest.city || '',
        region: dest.region || '',
        country: dest.country || '',
        description: dest.description || '',
        imageUrl: dest.image_url || '',
        isFeatured: !!dest.is_featured,
        defaultCurrency: dest.default_currency || 'usd',
        typicalTimeOfDayOptions: Array.from(timeOfDaySet),
        typicalTourTypes: Array.from(tourTypeSet)
      };
    });
  }

  // getDestinationSuggestions(query, limit)
  getDestinationSuggestions(query, limit) {
    const q = String(query || '').trim().toLowerCase();
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;
    const destinations = this._getFromStorage('destinations', []);

    if (!q) {
      return destinations.slice(0, max);
    }

    const filtered = destinations.filter((d) => {
      const haystack = [d.name, d.city, d.region, d.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(q) !== -1;
    });

    return filtered.slice(0, max);
  }

  // searchTours(...)
  searchTours(
    query,
    destinationId,
    date,
    timeOfDay,
    tourType,
    participantsAdults,
    participantsChildren,
    priceMin,
    priceMax,
    minRating,
    minDurationMinutes,
    includesChampagneBreakfast,
    includesHotelPickup,
    freeCancellation,
    includesInFlightPhotos,
    requiresRomancePackageAvailable,
    centerLatitude,
    centerLongitude,
    radiusKm,
    sortBy,
    page,
    pageSize
  ) {
    const q = String(query || '').trim().toLowerCase();
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const wishlistSet = new Set(wishlistItems.map((w) => w.tour_id));

    const adults = typeof participantsAdults === 'number' && participantsAdults > 0 ? participantsAdults : 0;
    const children = typeof participantsChildren === 'number' && participantsChildren > 0 ? participantsChildren : 0;

    const dateFilter = date || null;
    const timeOfDayFilter = timeOfDay || null;

    let filtered = tours.filter((t) => t.is_active);

    if (destinationId) {
      filtered = filtered.filter((t) => t.destination_id === destinationId);
    }

    if (q) {
      filtered = filtered.filter((t) => {
        const dest = destinations.find((d) => d.id === t.destination_id);
        const haystack = [t.name, t.short_title, t.description, dest && dest.name, dest && dest.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        return tokens.some((token) => haystack.indexOf(token) !== -1);
      });
    }

    if (dateFilter) {
      // In this simplified implementation, we do not filter tours by specific date or timeslot
      // availability here. Date-specific availability is handled when fetching concrete
      // timeslots via getTourAvailability or when adding to cart.
    }

    if (tourType) {
      filtered = filtered.filter((t) => {
        if (tourType === 'both') return true;
        if (t.primary_tour_type === 'both') return true;
        return t.primary_tour_type === tourType;
      });
    }

    if (typeof minRating === 'number') {
      filtered = filtered.filter((t) => (t.rating_average || 0) >= minRating);
    }

    if (typeof minDurationMinutes === 'number') {
      filtered = filtered.filter((t) => (t.duration_minutes || 0) >= minDurationMinutes);
    }

    if (includesChampagneBreakfast) {
      filtered = filtered.filter((t) => t.includes_champagne_breakfast);
    }

    if (includesHotelPickup) {
      filtered = filtered.filter((t) => t.includes_hotel_pickup);
    }

    if (freeCancellation) {
      filtered = filtered.filter((t) => t.free_cancellation);
    }

    if (includesInFlightPhotos) {
      filtered = filtered.filter((t) =>
        t.includes_in_flight_photos ||
        t.has_in_flight_photos_addon ||
        t.has_photo_package_addon
      );
    }

    if (requiresRomancePackageAvailable) {
      filtered = filtered.filter((t) => t.has_romance_package_addon);
    }

    if (
      typeof centerLatitude === 'number' &&
      typeof centerLongitude === 'number' &&
      typeof radiusKm === 'number' &&
      radiusKm > 0
    ) {
      filtered = filtered.filter((t) => {
        const dest = destinations.find((d) => d.id === t.destination_id);
        if (!dest) return false;
        const dist = this._distanceKmBetweenCoords(
          centerLatitude,
          centerLongitude,
          dest.latitude,
          dest.longitude
        );
        return dist <= radiusKm;
      });
    }

    const minPrice = typeof priceMin === 'number' ? priceMin : null;
    const maxPrice = typeof priceMax === 'number' ? priceMax : null;

    function estimatePrice(tour) {
      if (tour.price_type === 'per_person') {
        const pa = tour.base_price_per_adult || 0;
        const pc = tour.base_price_per_child || pa;
        const a = adults || 1; // assume at least 1 adult if none given
        const c = children || 0;
        return pa * a + pc * c;
      }
      // per_group
      if (typeof tour.base_price_per_adult === 'number') {
        return tour.base_price_per_adult;
      }
      if (typeof tour.min_price_display === 'number') {
        return tour.min_price_display;
      }
      return 0;
    }

    if (minPrice !== null || maxPrice !== null) {
      filtered = filtered.filter((t) => {
        const price = estimatePrice(t);
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      });
    }

    const sort = sortBy || 'relevance';
    const withPrice = filtered.map((t) => ({ tour: t, price: estimatePrice(t) }));

    if (sort === 'price_asc') {
      withPrice.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      withPrice.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating_desc') {
      withPrice.sort((a, b) => (b.tour.rating_average || 0) - (a.tour.rating_average || 0));
    } else if (sort === 'duration_asc') {
      withPrice.sort((a, b) => (a.tour.duration_minutes || 0) - (b.tour.duration_minutes || 0));
    } else if (sort === 'duration_desc') {
      withPrice.sort((a, b) => (b.tour.duration_minutes || 0) - (a.tour.duration_minutes || 0));
    }

    const totalResults = withPrice.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const slice = withPrice.slice(start, start + ps);

    const results = slice.map(({ tour, price }) => {
      const dest = destinations.find((d) => d.id === tour.destination_id) || {};
      return {
        tourId: tour.id,
        tourName: tour.name,
        shortTitle: tour.short_title || tour.name,
        destinationName: dest.name || '',
        destinationRegion: dest.region || '',
        destinationCountry: dest.country || '',
        imageUrl: tour.image_url || '',
        primaryTourType: tour.primary_tour_type,
        timeOfDayOptions: Array.isArray(tour.time_of_day_options)
          ? tour.time_of_day_options
          : [],
        minPriceDisplay:
          typeof tour.min_price_display === 'number'
            ? tour.min_price_display
            : price,
        maxPriceDisplay:
          typeof tour.max_price_display === 'number'
            ? tour.max_price_display
            : price,
        priceCurrency: tour.price_currency || 'usd',
        durationMinutes: tour.duration_minutes || 0,
        ratingAverage: tour.rating_average || 0,
        ratingCount: tour.rating_count || 0,
        includesChampagneBreakfast: !!tour.includes_champagne_breakfast,
        includesHotelPickup: !!tour.includes_hotel_pickup,
        freeCancellation: !!tour.free_cancellation,
        includesInFlightPhotos: !!tour.includes_in_flight_photos,
        hasPhotoPackageAddon: !!tour.has_photo_package_addon,
        hasRomancePackageAddon: !!tour.has_romance_package_addon,
        hasInFlightPhotosAddon: !!tour.has_in_flight_photos_addon,
        hasCancellationProtectionAddon: !!tour.has_cancellation_protection_addon,
        isWishlisted: wishlistSet.has(tour.id),
        // Foreign key resolution: include full tour object
        tour
      };
    });

    return {
      totalResults,
      page: pg,
      pageSize: ps,
      tours: results
    };
  }

  // getTourFilterOptions(query, destinationId, date, timeOfDay)
  getTourFilterOptions(query, destinationId, date, timeOfDay) {
    const q = String(query || '').trim().toLowerCase();
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);

    let filtered = tours.filter((t) => t.is_active);

    if (destinationId) {
      filtered = filtered.filter((t) => t.destination_id === destinationId);
    }

    if (q) {
      filtered = filtered.filter((t) => {
        const dest = destinations.find((d) => d.id === t.destination_id);
        const haystack = [t.name, t.short_title, dest && dest.name, dest && dest.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (date) {
      // Do not restrict available filter options by date/timeslot availability so that
      // tours without pre-seeded timeslots are still surfaced in the UI.
    }

    if (!filtered.length) {
      return {
        priceMin: 0,
        priceMax: 0,
        ratingMin: 0,
        ratingMax: 5,
        durationMinMinutes: 0,
        durationMaxMinutes: 0,
        hasChampagneBreakfast: false,
        hasHotelPickup: false,
        hasFreeCancellation: false,
        hasInFlightPhotos: false,
        hasRomancePackageAddon: false,
        supportedTourTypes: [],
        supportedTimeOfDayOptions: []
      };
    }

    const prices = [];
    const ratings = [];
    const durations = [];
    const tourTypes = new Set();
    const timeOfDayOptions = new Set();
    let hasChampagne = false;
    let hasPickup = false;
    let hasFreeCancel = false;
    let hasPhotos = false;
    let hasRomanceAddon = false;

    filtered.forEach((t) => {
      durations.push(t.duration_minutes || 0);
      ratings.push(t.rating_average || 0);

      const price =
        typeof t.min_price_display === 'number'
          ? t.min_price_display
          : t.base_price_per_adult || 0;
      prices.push(price);

      if (t.includes_champagne_breakfast) hasChampagne = true;
      if (t.includes_hotel_pickup) hasPickup = true;
      if (t.free_cancellation) hasFreeCancel = true;
      if (t.includes_in_flight_photos) hasPhotos = true;
      if (t.has_romance_package_addon) hasRomanceAddon = true;

      if (t.primary_tour_type) tourTypes.add(t.primary_tour_type);
      if (Array.isArray(t.time_of_day_options)) {
        t.time_of_day_options.forEach((tod) => timeOfDayOptions.add(tod));
      }
    });

    return {
      priceMin: Math.min.apply(null, prices),
      priceMax: Math.max.apply(null, prices),
      ratingMin: Math.min.apply(null, ratings),
      ratingMax: Math.max.apply(null, ratings),
      durationMinMinutes: Math.min.apply(null, durations),
      durationMaxMinutes: Math.max.apply(null, durations),
      hasChampagneBreakfast: hasChampagne,
      hasHotelPickup: hasPickup,
      hasFreeCancellation: hasFreeCancel,
      hasInFlightPhotos: hasPhotos,
      hasRomancePackageAddon: hasRomanceAddon,
      supportedTourTypes: Array.from(tourTypes),
      supportedTimeOfDayOptions: Array.from(timeOfDayOptions)
    };
  }

  // getTourDetails(tourId, date)
  getTourDetails(tourId, date) {
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);
    const tourAddons = this._getFromStorage('tour_addons', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const tour = tours.find((t) => t.id === tourId) || null;
    if (!tour) {
      return {
        tour: null,
        destination: null,
        highlights: [],
        itinerary: '',
        inclusions: [],
        exclusions: [],
        whatToBring: [],
        ratingAverage: 0,
        ratingCount: 0,
        reviewsPreview: [],
        cancellationPolicySummary: '',
        addons: [],
        isWishlisted: false
      };
    }

    const destination = destinations.find((d) => d.id === tour.destination_id) || null;
    const addons = tourAddons
      .filter((a) => a.tour_id === tour.id)
      .map((a) => ({ ...a, tour })); // resolve tour foreign key

    const isWishlisted = wishlistItems.some((w) => w.tour_id === tour.id);

    const enrichedTour = {
      ...tour,
      destination
    };

    return {
      tour: enrichedTour,
      destination,
      highlights: [],
      itinerary: tour.description || '',
      inclusions: [],
      exclusions: [],
      whatToBring: [],
      ratingAverage: tour.rating_average || 0,
      ratingCount: tour.rating_count || 0,
      reviewsPreview: [],
      cancellationPolicySummary: tour.cancellation_policy_summary || '',
      addons,
      isWishlisted
    };
  }

  // getTourAvailability(tourId, date, timeOfDay)
  getTourAvailability(tourId, date, timeOfDay) {
    const timeslots = this._getFromStorage('tour_timeslots', []);
    const filtered = timeslots.filter((ts) => {
      if (ts.tour_id !== tourId) return false;
      if (!ts.departure_datetime) return false;
      const tsDate = ts.departure_datetime.split('T')[0];
      if (tsDate !== date) return false;
      if (timeOfDay && timeOfDay !== 'anytime') {
        return ts.time_of_day === timeOfDay;
      }
      return true;
    });

    const resultTimeslots = filtered.map((ts) => ({
      timeslotId: ts.id,
      departureDatetime: ts.departure_datetime,
      timeOfDay: ts.time_of_day,
      capacityRemaining: ts.capacity_remaining,
      // Foreign key resolution
      timeslot: ts
    }));

    return {
      tourId,
      date,
      timeOfDay: timeOfDay || 'anytime',
      timeslots: resultTimeslots
    };
  }

  // addTourToCart(tourId, date, timeslotId, timeOfDay, participantsAdults, participantsChildren, tourType, selectedAddonIds, specialRequests)
  addTourToCart(
    tourId,
    date,
    timeslotId,
    timeOfDay,
    participantsAdults,
    participantsChildren,
    tourType,
    selectedAddonIds,
    specialRequests
  ) {
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);
    const tourAddons = this._getFromStorage('tour_addons', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);
    let cartItems = this._getFromStorage('cart_items', []);
    let cartItemAddons = this._getFromStorage('cart_item_addons', []);

    const tour = tours.find((t) => t.id === tourId);
    if (!tour) {
      return { success: false, message: 'Tour not found.', cart: null };
    }

    const dest = destinations.find((d) => d.id === tour.destination_id) || null;

    let cart = this._getOrCreateCart();

    if (cart.currency && cart.items.length > 0 && cart.currency !== tour.price_currency) {
      return {
        success: false,
        message: 'Cart currency mismatch. Please checkout or clear cart before adding tours in another currency.',
        cart: null
      };
    }

    cart.currency = tour.price_currency || cart.currency || 'usd';

    const adults = typeof participantsAdults === 'number' && participantsAdults > 0 ? participantsAdults : 1;
    const children = typeof participantsChildren === 'number' && participantsChildren > 0 ? participantsChildren : 0;

    let selectedTimeslot = null;
    if (timeslotId) {
      selectedTimeslot = timeslots.find((ts) => ts.id === timeslotId) || null;
    } else if (date) {
      selectedTimeslot = this._findEarliestMatchingTimeslot(
        tour.id,
        date,
        timeOfDay && timeOfDay !== 'unspecified' ? timeOfDay : null
      );
    }

    const finalTimeOfDay = selectedTimeslot
      ? selectedTimeslot.time_of_day
      : timeOfDay || 'unspecified';

    let basePriceAmount = 0;
    let pricePerAdult = 0;
    let pricePerChild = 0;

    if (tour.price_type === 'per_person') {
      pricePerAdult = tour.base_price_per_adult || 0;
      pricePerChild = tour.base_price_per_child || pricePerAdult;
      basePriceAmount = pricePerAdult * adults + pricePerChild * children;
    } else {
      basePriceAmount = tour.base_price_per_adult || tour.min_price_display || 0;
      pricePerAdult = basePriceAmount;
      pricePerChild = basePriceAmount;
    }

    const addonIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    const chosenAddons = tourAddons.filter((a) => addonIds.indexOf(a.id) !== -1);

    let addonsTotal = 0;
    const addonNames = [];

    const cartItemId = this._generateId('cart_item');

    chosenAddons.forEach((addon) => {
      const quantity = 1;
      const unitPrice = addon.price_per_unit || 0;
      const totalPrice = unitPrice * quantity;
      addonsTotal += totalPrice;
      addonNames.push(addon.name);

      const cartItemAddon = {
        id: this._generateId('cart_item_addon'),
        cart_item_id: cartItemId,
        tour_addon_id: addon.id,
        name: addon.name,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        currency: addon.price_currency || tour.price_currency || 'usd'
      };
      cartItemAddons.push(cartItemAddon);
    });

    const lineTotal = basePriceAmount + addonsTotal;
    const nowIso = new Date().toISOString();

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'tour',
      tour_id: tour.id,
      gift_card_purchase_id: null,
      selected_date: date,
      timeslot_id: selectedTimeslot ? selectedTimeslot.id : null,
      time_of_day: finalTimeOfDay,
      participants_adults: adults,
      participants_children: children,
      price_per_person_adult: pricePerAdult,
      price_per_person_child: pricePerChild,
      base_price_amount: basePriceAmount,
      addons_total_amount: addonsTotal,
      line_total_amount: lineTotal,
      currency: tour.price_currency || 'usd',
      title: tour.name,
      location_summary: dest ? dest.name || '' : '',
      extras_summary: addonNames.join(', '),
      special_requests: specialRequests || '',
      created_at: nowIso
    };

    cartItems.push(cartItem);
    cart.items.push(cartItem.id);

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart_item_addons', cartItemAddons);
    this._recalculateCartTotals(cart);

    const summaryCartItems = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => {
        const ts = timeslots.find((t) => t.id === ci.timeslot_id) || null;
        return {
          cartItemId: ci.id,
          itemType: ci.item_type,
          title: ci.title,
          locationSummary: ci.location_summary,
          selectedDate: ci.selected_date,
          departureTime: ts ? ts.departure_datetime : '',
          timeOfDay: ci.time_of_day,
          participantsAdults: ci.participants_adults || 0,
          participantsChildren: ci.participants_children || 0,
          extrasSummary: ci.extras_summary || '',
          basePriceAmount: ci.base_price_amount || 0,
          addonsTotalAmount: ci.addons_total_amount || 0,
          lineTotalAmount: ci.line_total_amount || 0,
          currency: ci.currency || cart.currency || 'usd'
        };
      });

    const resultCart = {
      subtotalAmount: cart.subtotal_amount,
      discountAmount: cart.discount_amount,
      totalAmount: cart.total_amount,
      currency: cart.currency,
      itemCount: summaryCartItems.length,
      items: summaryCartItems
    };

    return {
      success: true,
      message: 'Tour added to cart.',
      cart: resultCart
    };
  }

  // getCartDetails()
  getCartDetails() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    const giftCardPurchases = this._getFromStorage('gift_card_purchases', []);
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    if (!cart || !cart.id) {
      return {
        items: [],
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        currency: 'usd',
        promoCode: null,
        promoDescription: null,
        meets400Threshold: false,
        itemCount: 0
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      const tour = ci.tour_id ? tours.find((t) => t.id === ci.tour_id) || null : null;
      const giftCardPurchase = ci.gift_card_purchase_id
        ? giftCardPurchases.find((g) => g.id === ci.gift_card_purchase_id) || null
        : null;
      const dest = tour ? destinations.find((d) => d.id === tour.destination_id) || null : null;
      const ts = timeslots.find((t) => t.id === ci.timeslot_id) || null;

      return {
        cartItemId: ci.id,
        itemType: ci.item_type,
        tourId: ci.tour_id || null,
        giftCardPurchaseId: ci.gift_card_purchase_id || null,
        title: ci.title,
        locationSummary: ci.location_summary || (dest ? dest.name || '' : ''),
        selectedDate: ci.selected_date,
        departureTime: ts ? ts.departure_datetime : '',
        timeOfDay: ci.time_of_day,
        participantsAdults: ci.participants_adults || 0,
        participantsChildren: ci.participants_children || 0,
        extrasSummary: ci.extras_summary || '',
        specialRequests: ci.special_requests || '',
        basePriceAmount: ci.base_price_amount || 0,
        addonsTotalAmount: ci.addons_total_amount || 0,
        lineTotalAmount: ci.line_total_amount || 0,
        currency: ci.currency || cart.currency || 'usd',
        // Foreign key resolution
        tour,
        giftCardPurchase
      };
    });

    let promoCodeText = null;
    let promoDescription = null;
    if (cart.promo_code_id) {
      const promo = promoCodes.find((p) => p.id === cart.promo_code_id) || null;
      if (promo) {
        promoCodeText = promo.code || null;
        promoDescription = promo.description || null;
      }
    }

    const subtotal = cart.subtotal_amount || 0;

    return {
      items,
      subtotalAmount: cart.subtotal_amount || 0,
      discountAmount: cart.discount_amount || 0,
      totalAmount: cart.total_amount || 0,
      currency: cart.currency || 'usd',
      promoCode: promoCodeText,
      promoDescription,
      meets400Threshold: subtotal >= 400,
      itemCount: items.length
    };
  }

  // updateCartItemParticipants(cartItemId, participantsAdults, participantsChildren)
  updateCartItemParticipants(cartItemId, participantsAdults, participantsChildren) {
    const tours = this._getFromStorage('tours', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItem = cartItems.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    const tour = tours.find((t) => t.id === cartItem.tour_id);
    if (!tour) {
      return { success: false, message: 'Associated tour not found.', cart: null };
    }

    const adults = typeof participantsAdults === 'number' && participantsAdults > 0 ? participantsAdults : 1;
    const children =
      typeof participantsChildren === 'number' && participantsChildren > 0
        ? participantsChildren
        : 0;

    let basePriceAmount = 0;
    let pricePerAdult = 0;
    let pricePerChild = 0;

    if (tour.price_type === 'per_person') {
      pricePerAdult = tour.base_price_per_adult || 0;
      pricePerChild = tour.base_price_per_child || pricePerAdult;
      basePriceAmount = pricePerAdult * adults + pricePerChild * children;
    } else {
      basePriceAmount = tour.base_price_per_adult || tour.min_price_display || 0;
      pricePerAdult = basePriceAmount;
      pricePerChild = basePriceAmount;
    }

    cartItem.participants_adults = adults;
    cartItem.participants_children = children;
    cartItem.price_per_person_adult = pricePerAdult;
    cartItem.price_per_person_child = pricePerChild;
    cartItem.base_price_amount = basePriceAmount;
    cartItem.line_total_amount = basePriceAmount + (cartItem.addons_total_amount || 0);

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item participants updated.',
      cart: {
        subtotalAmount: cart.subtotal_amount,
        discountAmount: cart.discount_amount,
        totalAmount: cart.total_amount,
        currency: cart.currency
      }
    };
  }

  // updateCartItemAddons(cartItemId, selectedAddonIds)
  updateCartItemAddons(cartItemId, selectedAddonIds) {
    const cartItems = this._getFromStorage('cart_items', []);
    let cartItemAddons = this._getFromStorage('cart_item_addons', []);
    const tourAddons = this._getFromStorage('tour_addons', []);

    const cartItem = cartItems.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    const addonIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];

    cartItemAddons = cartItemAddons.filter((a) => a.cart_item_id !== cartItemId);

    let addonsTotal = 0;
    const addonNames = [];

    addonIds.forEach((id) => {
      const addon = tourAddons.find((a) => a.id === id);
      if (!addon) return;
      const quantity = 1;
      const unitPrice = addon.price_per_unit || 0;
      const totalPrice = unitPrice * quantity;
      addonsTotal += totalPrice;
      addonNames.push(addon.name);

      const cia = {
        id: this._generateId('cart_item_addon'),
        cart_item_id: cartItemId,
        tour_addon_id: addon.id,
        name: addon.name,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        currency: addon.price_currency || cartItem.currency || 'usd'
      };
      cartItemAddons.push(cia);
    });

    cartItem.addons_total_amount = addonsTotal;
    cartItem.extras_summary = addonNames.join(', ');
    cartItem.line_total_amount = (cartItem.base_price_amount || 0) + addonsTotal;

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart_item_addons', cartItemAddons);

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item addons updated.',
      cart: {
        subtotalAmount: cart.subtotal_amount,
        discountAmount: cart.discount_amount,
        totalAmount: cart.total_amount,
        currency: cart.currency
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    let cartItemAddons = this._getFromStorage('cart_item_addons', []);
    const cart = this._getOrCreateCart();

    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    cartItems.splice(itemIndex, 1);
    cartItemAddons = cartItemAddons.filter((a) => a.cart_item_id !== cartItemId);

    cart.items = cart.items.filter((id) => id !== cartItemId);

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart_item_addons', cartItemAddons);

    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item removed.',
      cart: {
        subtotalAmount: cart.subtotal_amount,
        discountAmount: cart.discount_amount,
        totalAmount: cart.total_amount,
        currency: cart.currency,
        itemCount: cart.items.length
      }
    };
  }

  // applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const cart = this._getOrCreateCart();
    const validation = this._validatePromoCodeForCart(cart, promoCode);

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message || 'Unable to apply promo code.',
        cart: {
          subtotalAmount: cart.subtotal_amount,
          discountAmount: cart.discount_amount,
          totalAmount: cart.total_amount,
          currency: cart.currency,
          promoCode: cart.promo_code_value || null,
          promoDescription: null
        }
      };
    }

    const promo = validation.promo;
    cart.promo_code_id = promo.id;
    cart.promo_code_value = promo.code;
    cart.discount_amount = validation.discountAmount;
    cart.total_amount = Math.max(0, cart.subtotal_amount - cart.discount_amount);
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);

    return {
      success: true,
      message: 'Promo code applied.',
      cart: {
        subtotalAmount: cart.subtotal_amount,
        discountAmount: cart.discount_amount,
        totalAmount: cart.total_amount,
        currency: cart.currency,
        promoCode: cart.promo_code_value,
        promoDescription: promo.description || null
      }
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);

    if (!cart || !cart.id) {
      return {
        cart: {
          items: [],
          subtotalAmount: 0,
          discountAmount: 0,
          totalAmount: 0,
          currency: 'usd',
          promoCode: null
        },
        contactEmail: null,
        contactPhone: null
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      const ts = timeslots.find((t) => t.id === ci.timeslot_id) || null;
      return {
        cartItemId: ci.id,
        itemType: ci.item_type,
        title: ci.title,
        locationSummary: ci.location_summary || '',
        selectedDate: ci.selected_date,
        departureTime: ts ? ts.departure_datetime : '',
        timeOfDay: ci.time_of_day,
        lineTotalAmount: ci.line_total_amount || 0,
        currency: ci.currency || cart.currency || 'usd'
      };
    });

    return {
      cart: {
        items,
        subtotalAmount: cart.subtotal_amount || 0,
        discountAmount: cart.discount_amount || 0,
        totalAmount: cart.total_amount || 0,
        currency: cart.currency || 'usd',
        promoCode: cart.promo_code_value || null
      },
      contactEmail: cart.contact_email || null,
      contactPhone: cart.contact_phone || null
    };
  }

  // updateCheckoutContactDetails(contactEmail, contactPhone)
  updateCheckoutContactDetails(contactEmail, contactPhone) {
    const cart = this._getOrCreateCart();
    cart.contact_email = contactEmail;
    cart.contact_phone = contactPhone;
    cart.updated_at = new Date().toISOString();
    this._saveToStorage('cart', cart);

    return {
      success: true,
      message: 'Contact details updated.',
      cart: {
        contactEmail: cart.contact_email,
        contactPhone: cart.contact_phone
      }
    };
  }

  // getGiftCardProducts()
  getGiftCardProducts() {
    return this._getFromStorage('gift_card_products', []);
  }

  // configureGiftCardAndAddToCart(giftCardProductId, amount, deliveryMethod, recipientName, recipientEmail, senderName, message, scheduledDeliveryDate)
  configureGiftCardAndAddToCart(
    giftCardProductId,
    amount,
    deliveryMethod,
    recipientName,
    recipientEmail,
    senderName,
    message,
    scheduledDeliveryDate
  ) {
    const products = this._getFromStorage('gift_card_products', []);
    let purchases = this._getFromStorage('gift_card_purchases', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const product = products.find((p) => p.id === giftCardProductId);
    if (!product || !product.is_active) {
      return { success: false, message: 'Gift card product not found or inactive.', cart: null };
    }

    const denominations = Array.isArray(product.denominations) ? product.denominations : [];
    if (denominations.length && denominations.indexOf(amount) === -1) {
      return { success: false, message: 'Invalid gift card amount.', cart: null };
    }

    if (deliveryMethod === 'digital' && !product.supports_digital) {
      return { success: false, message: 'Digital delivery not supported for this product.', cart: null };
    }
    if (deliveryMethod === 'physical' && !product.supports_physical) {
      return { success: false, message: 'Physical delivery not supported for this product.', cart: null };
    }

    if (deliveryMethod === 'digital' && !recipientEmail) {
      return { success: false, message: 'Recipient email is required for digital delivery.', cart: null };
    }

    const nowIso = new Date().toISOString();
    const purchaseId = this._generateId('gift_card_purchase');
    const purchase = {
      id: purchaseId,
      gift_card_product_id: product.id,
      amount,
      currency: product.currency || 'usd',
      delivery_method: deliveryMethod,
      recipient_name: recipientName,
      recipient_email: recipientEmail || null,
      sender_name: senderName,
      message: message || '',
      scheduled_delivery_date: scheduledDeliveryDate || null,
      created_at: nowIso
    };

    purchases.push(purchase);
    this._saveToStorage('gift_card_purchases', purchases);

    const cart = this._getOrCreateCart();

    if (cart.currency && cart.items.length > 0 && cart.currency !== purchase.currency) {
      return {
        success: false,
        message: 'Cart currency mismatch. Please checkout or clear cart before mixing currencies.',
        cart: null
      };
    }

    cart.currency = purchase.currency || cart.currency || 'usd';

    const cartItemId = this._generateId('cart_item');

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'gift_card',
      tour_id: null,
      gift_card_purchase_id: purchase.id,
      selected_date: null,
      timeslot_id: null,
      time_of_day: 'unspecified',
      participants_adults: null,
      participants_children: null,
      price_per_person_adult: null,
      price_per_person_child: null,
      base_price_amount: amount,
      addons_total_amount: 0,
      line_total_amount: amount,
      currency: purchase.currency || 'usd',
      title: product.name,
      location_summary: '',
      extras_summary: '',
      special_requests: message || '',
      created_at: nowIso
    };

    cartItems.push(cartItem);
    cart.items.push(cartItem.id);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Gift card added to cart.',
      cart: {
        subtotalAmount: cart.subtotal_amount,
        discountAmount: cart.discount_amount,
        totalAmount: cart.total_amount,
        currency: cart.currency,
        itemCount: cart.items.length
      }
    };
  }

  // getWishlistDetails()
  getWishlistDetails() {
    const wishlists = this._getFromStorage('wishlists', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);

    if (!wishlists.length) {
      return { items: [], count: 0 };
    }

    const wishlist = wishlists[0];
    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);

    const items = itemsForWishlist.map((wi) => {
      const tour = tours.find((t) => t.id === wi.tour_id) || null;
      const dest = tour ? destinations.find((d) => d.id === tour.destination_id) || null : null;
      return {
        wishlistItemId: wi.id,
        tourId: wi.tour_id,
        tourName: tour ? tour.name : '',
        shortTitle: tour ? tour.short_title || tour.name : '',
        destinationName: dest ? dest.name || '' : '',
        destinationRegion: dest ? dest.region || '' : '',
        destinationCountry: dest ? dest.country || '' : '',
        imageUrl: tour ? tour.image_url || '' : '',
        durationMinutes: tour ? tour.duration_minutes || 0 : 0,
        ratingAverage: tour ? tour.rating_average || 0 : 0,
        ratingCount: tour ? tour.rating_count || 0 : 0,
        includesChampagneBreakfast: tour ? !!tour.includes_champagne_breakfast : false,
        includesHotelPickup: tour ? !!tour.includes_hotel_pickup : false,
        freeCancellation: tour ? !!tour.free_cancellation : false,
        minPriceDisplay: tour ? tour.min_price_display || tour.base_price_per_adult || 0 : 0,
        priceCurrency: tour ? tour.price_currency || 'usd' : 'usd',
        // Foreign key resolution
        tour
      };
    });

    return { items, count: items.length };
  }

  // addTourToWishlist(tourId)
  addTourToWishlist(tourId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const exists = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.tour_id === tourId
    );
    if (exists) {
      const count = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;
      return {
        success: true,
        message: 'Tour already in wishlist.',
        wishlistCount: count
      };
    }

    const wi = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      tour_id: tourId,
      added_at: new Date().toISOString()
    };

    wishlistItems.push(wi);
    this._saveToStorage('wishlist_items', wishlistItems);

    const count = wishlistItems.filter((x) => x.wishlist_id === wishlist.id).length;

    return {
      success: true,
      message: 'Tour added to wishlist.',
      wishlistCount: count
    };
  }

  // removeTourFromWishlist(wishlistItemId)
  removeTourFromWishlist(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    const wishlists = this._getFromStorage('wishlists', []);

    const index = wishlistItems.findIndex((wi) => wi.id === wishlistItemId);
    if (index === -1) {
      return { success: false, message: 'Wishlist item not found.', wishlistCount: wishlistItems.length };
    }

    wishlistItems.splice(index, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    let wishlistCount = 0;
    if (wishlists.length) {
      const wishlist = wishlists[0];
      wishlistCount = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;
    }

    return {
      success: true,
      message: 'Wishlist item removed.',
      wishlistCount
    };
  }

  // lookupBookingByReference(bookingReference, lastName)
  lookupBookingByReference(bookingReference, lastName) {
    const bookings = this._getFromStorage('bookings', []);
    const ref = String(bookingReference || '').trim();
    const ln = String(lastName || '').trim().toLowerCase();

    const booking = bookings.find(
      (b) => b.booking_reference === ref && String(b.last_name || '').toLowerCase() === ln
    );

    if (!booking) {
      return {
        success: false,
        message: 'Booking not found.',
        bookingId: null,
        bookingReference: ref,
        lastName: lastName
      };
    }

    return {
      success: true,
      message: 'Booking found.',
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      lastName: booking.last_name
    };
  }

  // getBookingDetail(bookingId)
  getBookingDetail(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const bookingItems = this._getFromStorage('booking_items', []);
    const bookingItemAddons = this._getFromStorage('booking_item_addons', []);
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);
    const tourAddons = this._getFromStorage('tour_addons', []);

    const booking = bookings.find((b) => b.id === bookingId) || null;

    const items = bookingItems
      .filter((bi) => bi.booking_id === bookingId)
      .map((bi) => {
        const tour = tours.find((t) => t.id === bi.tour_id) || null;
        const dest = destinations.find((d) => d.id === bi.destination_id) || null;
        const ts = timeslots.find((t) => t.id === bi.timeslot_id) || null;
        const addons = bookingItemAddons
          .filter((a) => a.booking_item_id === bi.id)
          .map((a) => {
            const ta = tourAddons.find((t) => t.id === a.tour_addon_id) || null;
            return {
              ...a,
              tourAddon: ta
            };
          });

        return {
          bookingItemId: bi.id,
          tourId: bi.tour_id,
          tourName: bi.tour_name,
          destinationName: dest ? dest.name || '' : '',
          destinationRegion: dest ? dest.region || '' : '',
          destinationCountry: dest ? dest.country || '' : '',
          date: bi.date,
          departureTime: ts ? ts.departure_datetime : '',
          timeOfDay: bi.time_of_day,
          participantsAdults: bi.participants_adults,
          participantsChildren: bi.participants_children || 0,
          includesHotelPickup: !!bi.includes_hotel_pickup,
          includesChampagneBreakfast: !!bi.includes_champagne_breakfast,
          freeCancellation: !!bi.free_cancellation,
          addons,
          lineTotalAmount: bi.line_total_amount,
          currency: bi.currency,
          specialRequests: bi.special_requests || '',
          // Foreign key resolution
          tour,
          destination: dest,
          timeslot: ts
        };
      });

    return { booking, items };
  }

  // getRescheduleContext(bookingItemId)
  getRescheduleContext(bookingItemId) {
    const bookingItems = this._getFromStorage('booking_items', []);
    const tours = this._getFromStorage('tours', []);
    const destinations = this._getFromStorage('destinations', []);
    const timeslots = this._getFromStorage('tour_timeslots', []);

    const bi = bookingItems.find((x) => x.id === bookingItemId) || null;
    if (!bi) {
      return {
        bookingItem: null,
        tour: null,
        destination: null,
        currentDate: null,
        currentTimeOfDay: null,
        currentTimeslotId: null
      };
    }

    const tour = tours.find((t) => t.id === bi.tour_id) || null;
    const dest = destinations.find((d) => d.id === bi.destination_id) || null;
    const ts = timeslots.find((t) => t.id === bi.timeslot_id) || null;

    const bookingItem = {
      ...bi,
      tour,
      destination: dest,
      timeslot: ts
    };

    return {
      bookingItem,
      tour,
      destination: dest,
      currentDate: bi.date,
      currentTimeOfDay: bi.time_of_day,
      currentTimeslotId: bi.timeslot_id || null
    };
  }

  // rescheduleBookingItem(bookingItemId, newDate, timeOfDay, timeslotId)
  rescheduleBookingItem(bookingItemId, newDate, timeOfDay, timeslotId) {
    const result = this._updateBookingItemSchedule(
      bookingItemId,
      newDate,
      timeOfDay,
      timeslotId
    );
    return result;
  }

  // getDestinationsList()
  getDestinationsList() {
    const destinations = this._getFromStorage('destinations', []);
    const tours = this._getFromStorage('tours', []);

    return destinations.map((dest) => {
      const destTours = tours.filter((t) => t.destination_id === dest.id);
      const timeOfDaySet = new Set();
      const tourTypeSet = new Set();

      destTours.forEach((t) => {
        if (Array.isArray(t.time_of_day_options)) {
          t.time_of_day_options.forEach((tod) => timeOfDaySet.add(tod));
        }
        if (t.primary_tour_type) {
          tourTypeSet.add(t.primary_tour_type);
        }
      });

      return {
        id: dest.id,
        name: dest.name,
        city: dest.city || '',
        region: dest.region || '',
        country: dest.country || '',
        description: dest.description || '',
        imageUrl: dest.image_url || '',
        defaultCurrency: dest.default_currency || 'usd',
        typicalTimeOfDayOptions: Array.from(timeOfDaySet),
        typicalTourTypes: Array.from(tourTypeSet),
        isFeatured: !!dest.is_featured
      };
    });
  }

  // getHowItWorksContent()
  getHowItWorksContent() {
    return this._getFromStorage('how_it_works_content', {
      sections: [],
      mentionsPromoCodes: false,
      mentionsGiftCards: false,
      mentionsManageBooking: false
    });
  }

  // getAboutContent()
  getAboutContent() {
    return this._getFromStorage('about_content', {
      title: '',
      body: '',
      highlights: []
    });
  }

  // getContactPageConfig()
  getContactPageConfig() {
    return this._getFromStorage('contact_page_config', {
      supportEmail: '',
      supportPhone: '',
      responseTimeDescription: '',
      topics: []
    });
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    // No persistence required; simulate success
    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  // getFaqEntries(topic)
  getFaqEntries(topic) {
    const entries = this._getFromStorage('faq_entries', []);
    const t = String(topic || '').trim().toLowerCase();
    if (!t) return entries;
    return entries.filter((e) => String(e.topic || '').toLowerCase() === t);
  }

  // getTermsContent()
  getTermsContent() {
    return this._getFromStorage('terms_content', { lastUpdated: '', body: '' });
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy_content', { lastUpdated: '', body: '' });
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
