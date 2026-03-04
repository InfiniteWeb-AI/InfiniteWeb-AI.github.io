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

  // ---------- Storage helpers ----------

  _initStorage() {
    const keys = [
      'customer_profiles',
      'dog_profiles',
      'locations',
      'boarding_rooms',
      'reviews',
      'boarding_reservations',
      'addon_products',
      'selected_addons',
      'daycare_pass_products',
      'daycare_pass_purchases',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'promotions',
      'policy_sections',
      'vaccination_requirements',
      'boarding_search_contexts',
      'contact_inquiries'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultVal = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultVal;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultVal;
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _calculateNights(checkInDate, checkOutDate) {
    const inDate = this._parseDate(checkInDate);
    const outDate = this._parseDate(checkOutDate);
    if (!inDate || !outDate) return 0;
    const msPerNight = 1000 * 60 * 60 * 24;
    const diff = (outDate - inDate) / msPerNight;
    return diff > 0 ? diff : 0;
  }

  // ---------- Core internal helpers from spec ----------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'open');

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        applied_promo_code: null,
        applied_promotion_id: null,
        discount_amount: 0,
        subtotal: 0,
        taxes: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('cart', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const subtotal = itemsForCart.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const discount = cart.discount_amount || 0;
    const taxes = 0; // simple: no tax calculation in this business layer
    const total = Math.max(0, subtotal - discount + taxes);

    const updatedCart = {
      ...cart,
      subtotal,
      discount_amount: discount,
      taxes,
      total,
      updated_at: new Date().toISOString()
    };

    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = updatedCart;
      this._saveToStorage('cart', carts);
    }

    return updatedCart;
  }

  _calculateBoardingReservationTotals(reservation) {
    const nights = this._calculateNights(reservation.check_in_date, reservation.check_out_date);
    const baseRate = reservation.base_nightly_rate || 0;
    const dogCount = reservation.dog_count || 1;
    const roomSubtotal = nights * baseRate * dogCount;

    const selectedAddons = this._getFromStorage('selected_addons', []).filter(
      (sa) => sa.reservation_id === reservation.id
    );
    const addOnsSubtotal = selectedAddons.reduce((sum, a) => sum + (a.total_price || 0), 0);

    const totalPrice = roomSubtotal + addOnsSubtotal;

    return {
      nights,
      room_subtotal: roomSubtotal,
      add_ons_subtotal: addOnsSubtotal,
      total_price: totalPrice
    };
  }

  _getCurrentPendingOrderOrCreate(cart, customerProfile) {
    const orders = this._getFromStorage('orders', []);
    let order = orders.find(
      (o) => o.status === 'pending_payment' || o.status === 'draft'
    );

    if (!order) {
      const now = new Date().toISOString();
      order = {
        id: this._generateId('order'),
        order_number: 'ORD-' + this._getNextIdCounter(),
        status: 'draft',
        customer_first_name: customerProfile ? customerProfile.first_name : null,
        customer_last_name: customerProfile ? customerProfile.last_name : null,
        customer_email: customerProfile ? customerProfile.email : null,
        customer_phone: customerProfile ? customerProfile.phone : null,
        billing_address_line1: null,
        billing_address_line2: null,
        billing_city: null,
        billing_state: null,
        billing_zip: null,
        promo_code: cart ? cart.applied_promo_code : null,
        promo_discount_amount: cart ? cart.discount_amount || 0 : 0,
        applied_promotion_ids: cart && cart.applied_promotion_id ? [cart.applied_promotion_id] : [],
        subtotal: cart ? cart.subtotal || 0 : 0,
        taxes: cart ? cart.taxes || 0 : 0,
        total: cart ? cart.total || 0 : 0,
        created_at: now,
        updated_at: now
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    }

    return order;
  }

  // ---------- Foreign key resolution helpers ----------

  _resolveCustomerOnDogProfiles(dogs) {
    const customerProfiles = this._getFromStorage('customer_profiles', []);
    return dogs.map((dog) => ({
      ...dog,
      customer_profile:
        dog.customer_profile_id
          ? customerProfiles.find((cp) => cp.id === dog.customer_profile_id) || null
          : null
    }));
  }

  _resolveSelectedAddons(selectedAddons) {
    const reservations = this._getFromStorage('boarding_reservations', []);
    const addonProducts = this._getFromStorage('addon_products', []);
    return selectedAddons.map((sa) => ({
      ...sa,
      reservation: reservations.find((r) => r.id === sa.reservation_id) || null,
      addon_product: addonProducts.find((ap) => ap.id === sa.addon_product_id) || null
    }));
  }

  _resolveCartItems(items) {
    const reservations = this._getFromStorage('boarding_reservations', []);
    const daycarePurchases = this._getFromStorage('daycare_pass_purchases', []);
    const passProducts = this._getFromStorage('daycare_pass_products', []);

    return items.map((item) => {
      const boardingReservation = item.boarding_reservation_id
        ? reservations.find((r) => r.id === item.boarding_reservation_id) || null
        : null;
      const daycarePassPurchase = item.daycare_pass_purchase_id
        ? daycarePurchases.find((p) => p.id === item.daycare_pass_purchase_id) || null
        : null;

      return {
        ...item,
        boarding_reservation: boardingReservation,
        daycare_pass_purchase: daycarePassPurchase
          ? {
              ...daycarePassPurchase,
              pass_product:
                passProducts.find((pp) => pp.id === daycarePassPurchase.pass_product_id) || null
            }
          : null
      };
    });
  }

  _resolveOrderItems(items) {
    const reservations = this._getFromStorage('boarding_reservations', []);
    const daycarePurchases = this._getFromStorage('daycare_pass_purchases', []);
    const passProducts = this._getFromStorage('daycare_pass_products', []);

    return items.map((item) => {
      const boardingReservation = item.boarding_reservation_id
        ? reservations.find((r) => r.id === item.boarding_reservation_id) || null
        : null;
      const daycarePassPurchase = item.daycare_pass_purchase_id
        ? daycarePurchases.find((p) => p.id === item.daycare_pass_purchase_id) || null
        : null;

      return {
        ...item,
        boarding_reservation: boardingReservation,
        daycare_pass_purchase: daycarePassPurchase
          ? {
              ...daycarePassPurchase,
              pass_product:
                passProducts.find((pp) => pp.id === daycarePassPurchase.pass_product_id) || null
            }
          : null
      };
    });
  }

  _resolveVaccinationRequirements(reqs) {
    const sections = this._getFromStorage('policy_sections', []);
    return reqs.map((r) => ({
      ...r,
      policy_section: sections.find((s) => s.id === r.policy_section_id) || null
    }));
  }

  // ---------- Interface implementations ----------

  // getHomePageContent
  getHomePageContent() {
    const promotions = this.getActivePromotions(null, false) || [];

    const highlightedPromotions = promotions.map((p) => ({
      promotion_id: p.id,
      name: p.name,
      promo_code: p.promo_code,
      short_description: p.description || p.name,
      applies_to_service: p.applies_to_service,
      promotion: p
    }));

    const content = {
      hero_heading: 'Loving, safe boarding & daycare for your best friend',
      hero_subheading: 'Suites, kennels, and play every day  tailored for every dog size.',
      featured_services: [
        {
          service_type: 'boarding',
          title: 'Overnight Boarding',
          description: 'Cozy kennels and suites with playtime options.'
        },
        {
          service_type: 'suites',
          title: 'Luxury Suites',
          description: 'Spacious suites with webcams and private outdoor runs (where available).'
        },
        {
          service_type: 'daycare',
          title: 'Doggy Daycare',
          description: 'Half-day and full-day daycare passes for social pups.'
        }
      ],
      highlighted_promotions: highlightedPromotions,
      quick_booking_defaults: {
        service_types: ['boarding', 'daycare'],
        dog_sizes: ['small', 'medium', 'large'],
        dog_counts: [1, 2, 3],
        default_service_type: 'boarding',
        default_dog_size: 'medium'
      }
    };

    return content;
  }

  // getBoardingSearchFilterOptions
  getBoardingSearchFilterOptions() {
    return {
      dog_sizes: [
        { key: 'small', label: 'Small', weight_range: 'up to 25 lbs' },
        { key: 'medium', label: 'Medium', weight_range: '26 50 lbs' },
        { key: 'large', label: 'Large', weight_range: '51 90 lbs' }
      ],
      room_types: [
        { value: 'any', label: 'All room types' },
        { value: 'kennel', label: 'Kennels' },
        { value: 'suite', label: 'Suites' }
      ],
      price_ranges: [
        { min: 0, max: 50, label: 'Up to $50/night' },
        { min: 0, max: 75, label: 'Up to $75/night' },
        { min: 0, max: 100, label: 'Up to $100/night' }
      ],
      amenity_filters: [
        {
          id: 'webcam_access',
          label: 'Webcam access',
          description: 'View your dog via webcam during their stay.'
        },
        {
          id: 'private_outdoor_run',
          label: 'Private outdoor run',
          description: 'Room includes an attached outdoor run.'
        },
        {
          id: 'playtime_twice_daily',
          label: '2x daily playtime',
          description: 'At least two play sessions per day included.'
        },
        {
          id: 'outdoor_play_yard',
          label: 'Outdoor play yard',
          description: 'Location has an outdoor play yard.'
        },
        {
          id: 'overnight_staff',
          label: 'Overnight staff on-site',
          description: 'Staff on-site throughout the night.'
        }
      ],
      rating_options: [
        { min_rating: 4.0, label: '4.0 stars & up' },
        { min_rating: 4.5, label: '4.5 stars & up' }
      ],
      review_count_options: [
        { min_reviews: 10, label: '10+ reviews' },
        { min_reviews: 20, label: '20+ reviews' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'distance_near_to_far', label: 'Distance: Near to Far' }
      ]
    };
  }

  // searchBoardingRooms
  searchBoardingRooms(
    checkInDate,
    checkOutDate,
    dogSize,
    dogCount,
    viewMode,
    roomType,
    locationId,
    priceMaxNightly,
    minRating,
    minReviewCount,
    amenitiesFilter,
    sortBy
  ) {
    const rooms = this._getFromStorage('boarding_rooms', []);
    const locations = this._getFromStorage('locations', []);
    const nights = this._calculateNights(checkInDate, checkOutDate);
    const amenities = amenitiesFilter || [];

    const filtered = rooms.filter((room) => {
      if (!room.is_active) return false;

      if (viewMode === 'suites' && room.room_type !== 'suite') return false;
      if (roomType && roomType !== 'any' && room.room_type !== roomType) return false;

      if (dogSize === 'small' && room.allows_small_dogs === false) return false;
      if (dogSize === 'medium' && room.allows_medium_dogs === false) return false;
      if (dogSize === 'large' && room.allows_large_dogs === false) return false;

      if (locationId && room.location_id !== locationId) return false;

      if (typeof priceMaxNightly === 'number' && room.base_nightly_rate > priceMaxNightly) {
        return false;
      }

      if (typeof minRating === 'number' && (room.average_rating || 0) < minRating) {
        return false;
      }

      if (
        typeof minReviewCount === 'number' &&
        (room.review_count || 0) < minReviewCount
      ) {
        return false;
      }

      const loc = locations.find((l) => l.id === room.location_id) || {};

      if (amenities.includes('webcam_access') && !room.has_webcam) return false;
      if (amenities.includes('private_outdoor_run') && !room.has_private_outdoor_run)
        return false;
      if (amenities.includes('overnight_staff') && !room.has_overnight_staff) return false;
      if (amenities.includes('outdoor_play_yard') && !loc.has_outdoor_play_yard)
        return false;
      if (amenities.includes('playtime_twice_daily')) {
        if (
          !room.included_playtime_frequency ||
          (room.included_playtime_frequency !== 'twice_daily' &&
            room.included_playtime_frequency !== 'unlimited')
        ) {
          return false;
        }
      }

      return true;
    });

    const withLocation = filtered.map((room) => {
      const loc = locations.find((l) => l.id === room.location_id) || {};
      const pricePerNight = room.base_nightly_rate || 0;
      const totalPrice = nights > 0 ? pricePerNight * nights * (dogCount || 1) : 0;
      return {
        room_id: room.id,
        name: room.name,
        location_name: loc.name || null,
        room_type: room.room_type,
        tier: room.tier || null,
        labels: room.labels || [],
        allows_small_dogs: room.allows_small_dogs,
        allows_medium_dogs: room.allows_medium_dogs,
        allows_large_dogs: room.allows_large_dogs,
        base_nightly_rate: room.base_nightly_rate,
        has_webcam: room.has_webcam,
        has_private_outdoor_run: room.has_private_outdoor_run,
        included_playtime_frequency: room.included_playtime_frequency || 'none',
        has_overnight_staff: room.has_overnight_staff,
        average_rating: room.average_rating || null,
        review_count: room.review_count || 0,
        distance_miles: loc.distance_miles || null,
        price_per_night_for_selection: pricePerNight,
        total_price_for_stay: totalPrice
      };
    });

    let sorted = withLocation.slice();

    if (sortBy === 'price_low_to_high') {
      sorted.sort((a, b) => (a.price_per_night_for_selection || 0) - (b.price_per_night_for_selection || 0));
    } else if (sortBy === 'price_high_to_low') {
      sorted.sort((a, b) => (b.price_per_night_for_selection || 0) - (a.price_per_night_for_selection || 0));
    } else if (sortBy === 'rating_high_to_low') {
      sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'distance_near_to_far') {
      sorted.sort((a, b) => (a.distance_miles || Infinity) - (b.distance_miles || Infinity));
    }

    const firstLoc = sorted.length
      ? locations.find((l) => l.id === rooms.find((r) => r.id === sorted[0].room_id).location_id) || null
      : null;

    return {
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights,
      dog_size: dogSize,
      dog_count: dogCount,
      location: firstLoc
        ? {
            id: firstLoc.id,
            name: firstLoc.name,
            city: firstLoc.city,
            state: firstLoc.state,
            distance_miles: firstLoc.distance_miles || null
          }
        : null,
      applied_filters: {
        room_type: roomType || 'any',
        price_max_nightly: priceMaxNightly || null,
        min_rating: minRating || null,
        min_review_count: minReviewCount || null,
        amenities,
        sort_by: sortBy || null
      },
      total_results: sorted.length,
      results: sorted
    };
  }

  // getBoardingRoomDetails
  getBoardingRoomDetails(roomId, checkInDate, checkOutDate, dogCount, dogSize) {
    const rooms = this._getFromStorage('boarding_rooms', []);
    const locations = this._getFromStorage('locations', []);
    const reviews = this._getFromStorage('reviews', []);

    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      return {
        room: null,
        location: null,
        selected_dates: null,
        dog_count: dogCount || 1,
        dog_size: dogSize || null,
        pricing: null,
        amenities_summary: [],
        playtime_summary: null,
        rating_summary: null,
        reviews_preview: [],
        can_compare_sharing_vs_separate: false
      };
    }

    const loc = locations.find((l) => l.id === room.location_id) || null;
    const nights = checkInDate && checkOutDate ? this._calculateNights(checkInDate, checkOutDate) : 0;
    const baseRate = room.base_nightly_rate || 0;
    const dc = dogCount || 1;
    const estimatedSubtotal = nights > 0 ? baseRate * nights * dc : baseRate * dc;

    const amenitiesSummary = [];
    if (room.has_webcam) amenitiesSummary.push('Webcam access');
    if (room.has_private_outdoor_run) amenitiesSummary.push('Private outdoor run');
    if (room.has_overnight_staff) amenitiesSummary.push('Overnight staff on-site');

    const playFreq = room.included_playtime_frequency || 'none';
    let sessionsPerDay = 0;
    if (playFreq === 'once_daily') sessionsPerDay = 1;
    if (playFreq === 'twice_daily') sessionsPerDay = 2;
    if (playFreq === 'unlimited') sessionsPerDay = 3;

    const roomReviews = reviews
      .filter((rev) => rev.room_id === room.id && rev.is_published !== false)
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 3);

    const details = {
      room: room,
      location: loc
        ? {
            id: loc.id,
            name: loc.name,
            city: loc.city,
            state: loc.state
          }
        : null,
      selected_dates: checkInDate && checkOutDate
        ? {
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            nights
          }
        : null,
      dog_count: dc,
      dog_size: dogSize || null,
      pricing: {
        base_nightly_rate: baseRate,
        estimated_room_subtotal: estimatedSubtotal
      },
      amenities_summary: amenitiesSummary,
      playtime_summary: {
        included_playtime_frequency: playFreq,
        included_sessions_per_day: sessionsPerDay
      },
      rating_summary: {
        average_rating: room.average_rating || null,
        review_count: room.review_count || 0
      },
      reviews_preview: roomReviews,
      can_compare_sharing_vs_separate:
        room.room_type === 'suite' && (room.max_occupancy_dogs || 1) >= 2
    };

    return details;
  }

  // getSharingVsSeparatePricing
  getSharingVsSeparatePricing(roomId, checkInDate, checkOutDate, dogCount, dogSize) {
    const rooms = this._getFromStorage('boarding_rooms', []);
    const room = rooms.find((r) => r.id === roomId);
    const nights = this._calculateNights(checkInDate, checkOutDate);

    if (!room) {
      return {
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        nights,
        share_option: null,
        separate_option: null,
        cheaper_option_key: null
      };
    }

    const baseRate = room.base_nightly_rate || 0;
    const dc = dogCount || 2;

    // Simple model: second dog shares at 50% rate vs full rate in separate suite
    const shareTotal = baseRate * nights * (1 + 0.5 * (dc - 1));
    const separateTotal = baseRate * nights * dc;

    const result = {
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights,
      share_option: {
        occupancy_configuration: 'two_dogs_sharing_suite',
        total_price: shareTotal,
        nightly_rate_per_dog: nights > 0 ? shareTotal / (nights * dc) : baseRate
      },
      separate_option: {
        occupancy_configuration: 'two_dogs_separate_suites',
        total_price: separateTotal,
        nightly_rate_per_suite: nights > 0 ? separateTotal / (nights * dc) : baseRate
      },
      cheaper_option_key: shareTotal <= separateTotal ? 'share' : 'separate'
    };

    return result;
  }

  // getBoardingRoomComparisonDetails
  getBoardingRoomComparisonDetails(roomIds, checkInDate, checkOutDate, dogCount, dogSize) {
    const rooms = this._getFromStorage('boarding_rooms', []);
    const locations = this._getFromStorage('locations', []);
    const nights = this._calculateNights(checkInDate, checkOutDate);
    const dc = dogCount || 1;

    const selectedRooms = rooms.filter((r) => roomIds.includes(r.id));

    const roomDetails = selectedRooms.map((room) => {
      const loc = locations.find((l) => l.id === room.location_id) || {};
      const baseRate = room.base_nightly_rate || 0;
      const totalPrice = nights > 0 ? baseRate * nights * dc : baseRate * dc;

      const amenities = [];
      if (room.has_webcam) amenities.push('webcam_access');
      if (room.has_private_outdoor_run) amenities.push('private_outdoor_run');
      if (room.has_overnight_staff) amenities.push('overnight_staff');

      return {
        room_id: room.id,
        name: room.name,
        location_name: loc.name || null,
        room_type: room.room_type,
        tier: room.tier || null,
        has_webcam: room.has_webcam,
        has_private_outdoor_run: room.has_private_outdoor_run,
        included_playtime_frequency: room.included_playtime_frequency || 'none',
        base_nightly_rate: baseRate,
        total_price_for_stay: totalPrice,
        average_rating: room.average_rating || null,
        review_count: room.review_count || 0,
        amenities,
        labels: room.labels || []
      };
    });

    return {
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights,
      dog_count: dc,
      dog_size: dogSize || null,
      rooms: roomDetails
    };
  }

  // createBoardingReservationFromRoomSelection
  createBoardingReservationFromRoomSelection(
    roomId,
    checkInDate,
    checkOutDate,
    dogCount,
    dogSize,
    occupancyConfiguration
  ) {
    const rooms = this._getFromStorage('boarding_rooms', []);
    const reservations = this._getFromStorage('boarding_reservations', []);

    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      return {
        reservation: null,
        next_step: null,
        message: 'Room not found'
      };
    }

    const nights = this._calculateNights(checkInDate, checkOutDate);
    const baseRate = room.base_nightly_rate || 0;
    const dc = dogCount || 1;

    const reservation = {
      id: this._generateId('res'),
      room_id: room.id,
      location_id: room.location_id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights,
      dog_count: dc,
      dog_size: dogSize,
      dog_profile_ids: [],
      occupancy_configuration: occupancyConfiguration || (dc === 1 ? 'single_dog' : 'multiple_dogs'),
      base_nightly_rate: baseRate,
      room_subtotal: 0,
      add_ons_subtotal: 0,
      total_price: 0,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: null
    };

    const totals = this._calculateBoardingReservationTotals(reservation);
    reservation.nights = totals.nights;
    reservation.room_subtotal = totals.room_subtotal;
    reservation.add_ons_subtotal = totals.add_ons_subtotal;
    reservation.total_price = totals.total_price;

    reservations.push(reservation);
    this._saveToStorage('boarding_reservations', reservations);

    return {
      reservation,
      next_step: 'addons',
      message: 'Reservation created as draft.'
    };
  }

  // getBoardingAddonsForReservation
  getBoardingAddonsForReservation(reservationId) {
    const reservations = this._getFromStorage('boarding_reservations', []);
    const rooms = this._getFromStorage('boarding_rooms', []);
    const locations = this._getFromStorage('locations', []);
    const addonProducts = this._getFromStorage('addon_products', []);
    const selectedAddonsAll = this._getFromStorage('selected_addons', []);

    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return {
        reservation_summary: null,
        available_addons: { playtime: [], grooming_bath: [], other_service: [] },
        selected_addons: [],
        pricing_summary: {
          room_subtotal: 0,
          add_ons_subtotal: 0,
          estimated_taxes: 0,
          total_price: 0
        }
      };
    }

    const room = rooms.find((r) => r.id === reservation.room_id) || null;
    const location = locations.find((l) => l.id === reservation.location_id) || null;

    const available = addonProducts.filter((ap) => {
      if (!ap.is_active) return false;
      if (ap.applies_to_service !== 'boarding' && ap.applies_to_service !== 'both') return false;
      if (ap.location_id && reservation.location_id && ap.location_id !== reservation.location_id)
        return false;
      if (
        ap.room_type_restriction &&
        ap.room_type_restriction !== 'any' &&
        room &&
        room.room_type &&
        ap.room_type_restriction !== room.room_type
      ) {
        return false;
      }
      // Dog size restrictions are treated as hints only in this implementation
      // to ensure add-ons can still be shown when data is limited.
      if (false) {
        return false;
      }
      return true;
    });

    const playtimeAddons = [];
    const groomingAddons = [];
    const otherAddons = [];

    const locationsMap = locations.reduce((acc, loc) => {
      acc[loc.id] = loc;
      return acc;
    }, {});

    available.forEach((ap) => {
      const withLoc = {
        ...ap,
        location: ap.location_id ? locationsMap[ap.location_id] || null : null
      };

      if (ap.addon_category === 'playtime') playtimeAddons.push(withLoc);
      else if (ap.addon_category === 'grooming_bath') groomingAddons.push(withLoc);
      else otherAddons.push(withLoc);
    });

    const selectedAddons = selectedAddonsAll.filter((sa) => sa.reservation_id === reservation.id);
    const resolvedSelected = this._resolveSelectedAddons(selectedAddons);

    const totals = this._calculateBoardingReservationTotals(reservation);

    return {
      reservation_summary: {
        reservation_id: reservation.id,
        reservation,
        room_name: room ? room.name : null,
        location_name: location ? location.name : null,
        check_in_date: reservation.check_in_date,
        check_out_date: reservation.check_out_date,
        nights: totals.nights,
        dog_count: reservation.dog_count,
        dog_size: reservation.dog_size,
        room_subtotal: totals.room_subtotal,
        add_ons_subtotal: totals.add_ons_subtotal,
        total_price: totals.total_price
      },
      available_addons: {
        playtime: playtimeAddons,
        grooming_bath: groomingAddons,
        other_service: otherAddons
      },
      selected_addons: resolvedSelected,
      pricing_summary: {
        room_subtotal: totals.room_subtotal,
        add_ons_subtotal: totals.add_ons_subtotal,
        estimated_taxes: 0,
        total_price: totals.total_price
      }
    };
  }

  // updateBoardingReservationAddons
  updateBoardingReservationAddons(reservationId, addonSelections) {
    const reservations = this._getFromStorage('boarding_reservations', []);
    const addonProducts = this._getFromStorage('addon_products', []);
    let selectedAddons = this._getFromStorage('selected_addons', []);

    const reservationIndex = reservations.findIndex((r) => r.id === reservationId);
    if (reservationIndex === -1) {
      return {
        success: false,
        reservation: null,
        selected_addons: [],
        pricing_summary: null,
        message: 'Reservation not found.'
      };
    }

    const reservation = reservations[reservationIndex];

    // Remove existing selections for this reservation
    selectedAddons = selectedAddons.filter((sa) => sa.reservation_id !== reservationId);

    const nights = this._calculateNights(reservation.check_in_date, reservation.check_out_date);

    const newSelected = [];

    (addonSelections || []).forEach((sel) => {
      const addon = addonProducts.find((ap) => ap.id === sel.addonProductId);
      if (!addon) return;

      const quantity = sel.quantity && sel.quantity > 0 ? sel.quantity : 1;
      let unitPrice = addon.price || 0;
      let totalPrice = 0;

      if (addon.price_unit === 'per_night') {
        totalPrice = unitPrice * nights * quantity;
      } else if (addon.price_unit === 'per_stay') {
        totalPrice = unitPrice * quantity;
      } else if (addon.price_unit === 'per_dog') {
        totalPrice = unitPrice * (reservation.dog_count || 1) * quantity;
      } else {
        // flat
        totalPrice = unitPrice * quantity;
      }

      const selectedAddon = {
        id: this._generateId('selAddon'),
        reservation_id: reservationId,
        addon_product_id: addon.id,
        scheduled_datetime: sel.scheduledDatetime || null,
        quantity,
        price_at_booking: unitPrice,
        total_price: totalPrice
      };

      newSelected.push(selectedAddon);
    });

    const allSelected = selectedAddons.concat(newSelected);
    this._saveToStorage('selected_addons', allSelected);

    const totals = this._calculateBoardingReservationTotals(reservation);
    const updatedReservation = {
      ...reservation,
      nights: totals.nights,
      room_subtotal: totals.room_subtotal,
      add_ons_subtotal: totals.add_ons_subtotal,
      total_price: totals.total_price,
      updated_at: new Date().toISOString()
    };

    reservations[reservationIndex] = updatedReservation;
    this._saveToStorage('boarding_reservations', reservations);

    const resolvedSelected = this._resolveSelectedAddons(newSelected);

    return {
      success: true,
      reservation: {
        id: updatedReservation.id,
        room_subtotal: updatedReservation.room_subtotal,
        add_ons_subtotal: updatedReservation.add_ons_subtotal,
        total_price: updatedReservation.total_price,
        room: null,
        location: null
      },
      selected_addons: resolvedSelected,
      pricing_summary: {
        room_subtotal: updatedReservation.room_subtotal,
        add_ons_subtotal: updatedReservation.add_ons_subtotal,
        estimated_taxes: 0,
        total_price: updatedReservation.total_price
      },
      message: 'Add-ons updated.'
    };
  }

  // getBookingReviewForReservation
  getBookingReviewForReservation(reservationId) {
    const reservations = this._getFromStorage('boarding_reservations', []);
    const rooms = this._getFromStorage('boarding_rooms', []);
    const locations = this._getFromStorage('locations', []);
    const selectedAddonsAll = this._getFromStorage('selected_addons', []);

    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return {
        reservation: null,
        room: null,
        location: null,
        selected_addons: [],
        cost_breakdown: null,
        editable_sections: []
      };
    }

    const room = rooms.find((r) => r.id === reservation.room_id) || null;
    const location = locations.find((l) => l.id === reservation.location_id) || null;

    const totals = this._calculateBoardingReservationTotals(reservation);
    const baseRate = reservation.base_nightly_rate || (room ? room.base_nightly_rate || 0 : 0);

    const selectedAddons = selectedAddonsAll.filter((sa) => sa.reservation_id === reservation.id);
    const resolvedSelected = this._resolveSelectedAddons(selectedAddons);

    return {
      reservation: {
        id: reservation.id,
        room_id: reservation.room_id,
        location_id: reservation.location_id,
        check_in_date: reservation.check_in_date,
        check_out_date: reservation.check_out_date,
        nights: totals.nights,
        dog_count: reservation.dog_count,
        dog_size: reservation.dog_size,
        occupancy_configuration: reservation.occupancy_configuration,
        room_subtotal: totals.room_subtotal,
        add_ons_subtotal: totals.add_ons_subtotal,
        total_price: totals.total_price,
        room,
        location
      },
      room: room
        ? {
            name: room.name,
            room_type: room.room_type,
            tier: room.tier || null
          }
        : null,
      location: location
        ? {
            name: location.name,
            city: location.city,
            state: location.state
          }
        : null,
      selected_addons: resolvedSelected,
      cost_breakdown: {
        nights: totals.nights,
        base_nightly_rate: baseRate,
        room_subtotal: totals.room_subtotal,
        add_ons_subtotal: totals.add_ons_subtotal,
        estimated_taxes: 0,
        total_before_promos: totals.total_price
      },
      editable_sections: ['room', 'dates', 'dogs', 'add_ons']
    };
  }

  // confirmBoardingReservationAndAddToCart
  confirmBoardingReservationAndAddToCart(reservationId) {
    const reservations = this._getFromStorage('boarding_reservations', []);
    const rooms = this._getFromStorage('boarding_rooms', []);
    const locations = this._getFromStorage('locations', []);
    let reservation = reservations.find((r) => r.id === reservationId);

    if (!reservation) {
      return {
        success: false,
        message: 'Reservation not found.',
        cart_summary: null
      };
    }

    const room = rooms.find((r) => r.id === reservation.room_id) || null;
    const location = locations.find((l) => l.id === reservation.location_id) || null;

    reservation = {
      ...reservation,
      status: 'pending',
      updated_at: new Date().toISOString()
    };

    const resIndex = reservations.findIndex((r) => r.id === reservation.id);
    reservations[resIndex] = reservation;
    this._saveToStorage('boarding_reservations', reservations);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const descriptionParts = [];
    if (room) descriptionParts.push(room.name);
    if (location) descriptionParts.push(location.name);
    descriptionParts.push((reservation.nights || 0) + ' night(s)');
    descriptionParts.push((reservation.dog_count || 1) + ' dog(s)');

    const description = descriptionParts.join('  ');

    const cartItem = {
      id: this._generateId('cartItem'),
      cart_id: cart.id,
      item_type: 'boarding_reservation',
      boarding_reservation_id: reservation.id,
      daycare_pass_purchase_id: null,
      description,
      quantity: 1,
      unit_price: reservation.total_price || 0,
      total_price: reservation.total_price || 0,
      created_at: new Date().toISOString()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);
    const resolvedItems = this._resolveCartItems(
      this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === updatedCart.id)
    );

    return {
      success: true,
      message: 'Reservation added to cart.',
      cart_summary: {
        cart: updatedCart,
        items: resolvedItems.map((item) => ({
          cart_item_id: item.id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          boarding_reservation_id: item.boarding_reservation_id,
          daycare_pass_purchase_id: item.daycare_pass_purchase_id,
          boarding_reservation: item.boarding_reservation,
          daycare_pass_purchase: item.daycare_pass_purchase
        }))
      }
    };
  }

  // getDaycareFilterOptions
  getDaycareFilterOptions() {
    return {
      dog_sizes: [
        { key: 'small', label: 'Small' },
        { key: 'medium', label: 'Medium' },
        { key: 'large', label: 'Large' },
        { key: 'all', label: 'All sizes' }
      ],
      session_types: [
        { value: 'full_day', label: 'Full day' },
        { value: 'half_day', label: 'Half day' }
      ],
      package_types: [
        { value: 'single_day', label: 'Single Day' },
        { value: 'pass', label: 'Pass' },
        { value: 'package', label: 'Package' }
      ],
      durations: [
        { days: 5, label: '5-Day Pass' },
        { days: 10, label: '10-Day Pass' },
        { days: 20, label: '20-Day Pass' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  // searchDaycarePasses
  searchDaycarePasses(dogSize, sessionType, packageType, durationDays, priceMax, sortBy) {
    const passes = this._getFromStorage('daycare_pass_products', []);

    let results = passes.filter((p) => p.is_active);

    if (dogSize) {
      results = results.filter(
        (p) => !p.dog_size || p.dog_size === 'all' || p.dog_size === dogSize
      );
    }
    if (sessionType) {
      results = results.filter((p) => p.session_type === sessionType);
    }
    if (packageType) {
      results = results.filter((p) => p.package_type === packageType);
    }
    if (typeof durationDays === 'number') {
      results = results.filter((p) => p.duration_days === durationDays);
    }
    if (typeof priceMax === 'number') {
      results = results.filter((p) => (p.price || 0) <= priceMax);
    }

    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return {
      filters_applied: {
        dog_size: dogSize || null,
        session_type: sessionType || null,
        package_type: packageType || null,
        duration_days: durationDays || null,
        price_max: priceMax || null,
        sort_by: sortBy || null
      },
      results
    };
  }

  // getDaycarePassDetails
  getDaycarePassDetails(passProductId) {
    const passes = this._getFromStorage('daycare_pass_products', []);
    const pass = passes.find((p) => p.id === passProductId) || null;

    if (!pass) {
      return {
        pass: null,
        usage_notes: '',
        allowed_dog_sizes: []
      };
    }

    const allowedSizes =
      !pass.dog_size || pass.dog_size === 'all'
        ? ['small', 'medium', 'large']
        : [pass.dog_size];

    return {
      pass,
      usage_notes: 'Passes must be used before their expiration date as defined by the facility.',
      allowed_dog_sizes: allowedSizes
    };
  }

  // purchaseDaycarePassAndAddToCart
  purchaseDaycarePassAndAddToCart(passProductId, startDate, quantity) {
    const passes = this._getFromStorage('daycare_pass_products', []);
    let purchases = this._getFromStorage('daycare_pass_purchases', []);

    const pass = passes.find((p) => p.id === passProductId);
    if (!pass) {
      return {
        success: false,
        daycare_pass_purchase: null,
        cart_summary: null,
        message: 'Daycare pass not found.'
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const subtotal = (pass.price || 0) * qty;

    const purchase = {
      id: this._generateId('dpp'),
      pass_product_id: pass.id,
      start_date: startDate,
      quantity: qty,
      subtotal,
      status: 'in_cart',
      created_at: new Date().toISOString()
    };

    purchases.push(purchase);
    this._saveToStorage('daycare_pass_purchases', purchases);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cartItem'),
      cart_id: cart.id,
      item_type: 'daycare_pass_purchase',
      boarding_reservation_id: null,
      daycare_pass_purchase_id: purchase.id,
      description: pass.name,
      quantity: qty,
      unit_price: pass.price || 0,
      total_price: subtotal,
      created_at: new Date().toISOString()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);
    const resolvedItems = this._resolveCartItems(
      this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === updatedCart.id)
    );

    return {
      success: true,
      daycare_pass_purchase: {
        ...purchase,
        pass_product: pass
      },
      cart_summary: {
        cart: updatedCart,
        items: resolvedItems.map((item) => ({
          cart_item_id: item.id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          boarding_reservation_id: item.boarding_reservation_id,
          daycare_pass_purchase_id: item.daycare_pass_purchase_id,
          boarding_reservation: item.boarding_reservation,
          daycare_pass_purchase: item.daycare_pass_purchase
        }))
      },
      message: 'Daycare pass added to cart.'
    };
  }

  // searchLocations
  searchLocations(zipCode, distanceMaxMiles, amenitiesFilter, servicesFilter, sortBy) {
    const locations = this._getFromStorage('locations', []);
    const amenities = amenitiesFilter || [];
    const services = servicesFilter || [];

    let results = locations.slice();

    if (typeof distanceMaxMiles === 'number') {
      results = results.filter((loc) => {
        const dist = typeof loc.distance_miles === 'number' ? loc.distance_miles : Infinity;
        return dist <= distanceMaxMiles;
      });
    }

    if (amenities.includes('outdoor_play_yard')) {
      results = results.filter((loc) => loc.has_outdoor_play_yard);
    }
    if (amenities.includes('onsite_staff_24_7')) {
      results = results.filter((loc) => loc.has_24_7_onsite_staff);
    }

    if (services.length) {
      results = results.filter((loc) => {
        if (services.includes('boarding') && !loc.offers_boarding) return false;
        if (services.includes('suites') && !loc.offers_suites) return false;
        if (services.includes('daycare') && !loc.offers_daycare) return false;
        return true;
      });
    }

    if (sortBy === 'distance_near_to_far') {
      results.sort((a, b) => (a.distance_miles || Infinity) - (b.distance_miles || Infinity));
    } else if (sortBy === 'distance_far_to_near') {
      results.sort((a, b) => (b.distance_miles || 0) - (a.distance_miles || 0));
    }

    // Instrumentation for task completion tracking
    try {
      const hasOutdoorPlayYard =
        Array.isArray(amenitiesFilter) && amenitiesFilter.includes('outdoor_play_yard');
      const hasOnsiteStaff =
        Array.isArray(amenitiesFilter) && amenitiesFilter.includes('onsite_staff_24_7');

      if (
        zipCode === '94110' &&
        typeof distanceMaxMiles === 'number' &&
        distanceMaxMiles <= 15 &&
        hasOutdoorPlayYard &&
        hasOnsiteStaff &&
        sortBy === 'distance_near_to_far'
      ) {
        const instrumentationValue = {
          zipCode,
          distanceMaxMiles,
          amenitiesFilter,
          servicesFilter,
          sortBy,
          resultLocationIds: results.map((loc) => loc.id)
        };
        localStorage.setItem(
          'task8_locationSearchParams',
          JSON.stringify(instrumentationValue)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      search_zip: zipCode,
      distance_max_miles: distanceMaxMiles || null,
      applied_amenities: amenities,
      results
    };
  }

  // getLocationDetails
  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations', []);
    const location = locations.find((l) => l.id === locationId) || null;

    if (!location) {
      return {
        location: null,
        services: [],
        amenities: [],
        can_book_boarding: false,
        can_book_daycare: false
      };
    }

    const services = [];
    if (location.offers_boarding) services.push('boarding');
    if (location.offers_suites) services.push('suites');
    if (location.offers_daycare) services.push('daycare');

    const amenities = [];
    if (location.has_outdoor_play_yard) amenities.push('outdoor_play_yard');
    if (location.has_24_7_onsite_staff) amenities.push('24_7_onsite_staff');

    // Instrumentation for task completion tracking
    try {
      if (
        location.has_outdoor_play_yard &&
        location.has_24_7_onsite_staff &&
        typeof location.distance_miles === 'number' &&
        location.distance_miles <= 15
      ) {
        localStorage.setItem('task8_selectedLocationId', location.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      location,
      services,
      amenities,
      can_book_boarding: !!location.offers_boarding,
      can_book_daycare: !!location.offers_daycare
    };
  }

  // getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsRaw = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === cart.id
    );
    const resolvedItems = this._resolveCartItems(cartItemsRaw);

    return {
      cart,
      items: resolvedItems.map((item) => ({
        cart_item_id: item.id,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        boarding_reservation_id: item.boarding_reservation_id,
        daycare_pass_purchase_id: item.daycare_pass_purchase_id,
        boarding_reservation: item.boarding_reservation,
        daycare_pass_purchase: item.daycare_pass_purchase
      }))
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const cartItemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (cartItemIndex === -1) {
      return {
        success: false,
        cart_summary: null
      };
    }

    const cartItem = cartItems[cartItemIndex];
    const qty = quantity && quantity > 0 ? quantity : 1;

    cartItem.quantity = qty;
    cartItem.total_price = (cartItem.unit_price || 0) * qty;
    cartItems[cartItemIndex] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const cart = carts.find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const resolvedItems = this._resolveCartItems(
      this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === updatedCart.id)
    );

    return {
      success: true,
      cart_summary: {
        cart: updatedCart,
        items: resolvedItems.map((item) => ({
          cart_item_id: item.id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      }
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const cartItem = cartItems.find((ci) => ci.id === cartItemId);

    if (!cartItem) {
      return {
        success: false,
        cart_summary: null
      };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    // Optionally mark associated entities as cancelled
    if (cartItem.boarding_reservation_id) {
      const reservations = this._getFromStorage('boarding_reservations', []);
      const idx = reservations.findIndex((r) => r.id === cartItem.boarding_reservation_id);
      if (idx >= 0) {
        reservations[idx] = {
          ...reservations[idx],
          status: 'cancelled',
          updated_at: new Date().toISOString()
        };
        this._saveToStorage('boarding_reservations', reservations);
      }
    }
    if (cartItem.daycare_pass_purchase_id) {
      const purchases = this._getFromStorage('daycare_pass_purchases', []);
      const idx = purchases.findIndex((p) => p.id === cartItem.daycare_pass_purchase_id);
      if (idx >= 0) {
        purchases[idx] = {
          ...purchases[idx],
          status: 'cancelled'
        };
        this._saveToStorage('daycare_pass_purchases', purchases);
      }
    }

    const carts = this._getFromStorage('cart', []);
    const cart = carts.find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const resolvedItems = this._resolveCartItems(
      this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === updatedCart.id)
    );

    return {
      success: true,
      cart_summary: {
        cart: updatedCart,
        items: resolvedItems.map((item) => ({
          cart_item_id: item.id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      }
    };
  }

  // getCheckoutDetails
  getCheckoutDetails() {
    const cartSummary = this.getCartSummary();
    const customerProfileData = this.getCustomerProfile();
    const customerProfile = customerProfileData.customer_profile || null;
    const dogProfilesRaw = this._getFromStorage('dog_profiles', []);
    const dogProfiles = this._resolveCustomerOnDogProfiles(dogProfilesRaw);

    const reservations = this._getFromStorage('boarding_reservations', []);
    const rooms = this._getFromStorage('boarding_rooms', []);
    const locations = this._getFromStorage('locations', []);

    const boardingReservationItems = cartSummary.items.filter(
      (item) => item.item_type === 'boarding_reservation'
    );

    const boardingReservationsSummary = boardingReservationItems.map((item) => {
      const res = reservations.find((r) => r.id === item.boarding_reservation_id);
      if (!res) {
        return null;
      }
      const room = rooms.find((r) => r.id === res.room_id) || null;
      const loc = locations.find((l) => l.id === res.location_id) || null;
      return {
        reservation_id: res.id,
        reservation: res,
        room_name: room ? room.name : null,
        location_name: loc ? loc.name : null,
        check_in_date: res.check_in_date,
        check_out_date: res.check_out_date,
        dog_count: res.dog_count,
        associated_dog_profile_ids: res.dog_profile_ids || []
      };
    }).filter(Boolean);

    const cart = cartSummary.cart;

    return {
      cart_summary: cartSummary,
      customer_profile: customerProfile
        ? {
            first_name: customerProfile.first_name,
            last_name: customerProfile.last_name,
            email: customerProfile.email,
            phone: customerProfile.phone,
            is_new_customer: customerProfile.is_new_customer || false
          }
        : {
            first_name: null,
            last_name: null,
            email: null,
            phone: null,
            is_new_customer: true
          },
      dog_profiles: dogProfiles,
      boarding_reservations_summary: boardingReservationsSummary,
      promo_applied: cart.applied_promo_code
        ? {
            promo_code: cart.applied_promo_code,
            name: null,
            discount_amount: cart.discount_amount || 0
          }
        : null
    };
  }

  // saveCustomerProfile
  saveCustomerProfile(firstName, lastName, email, phone, password, isNewCustomer) {
    let profiles = this._getFromStorage('customer_profiles', []);
    const now = new Date().toISOString();

    let profile;
    if (profiles.length > 0) {
      profile = {
        ...profiles[0],
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || profiles[0].phone || null,
        password: password || profiles[0].password || null,
        is_new_customer: typeof isNewCustomer === 'boolean' ? isNewCustomer : profiles[0].is_new_customer,
        updated_at: now
      };
      profiles[0] = profile;
    } else {
      profile = {
        id: this._generateId('cust'),
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        password: password || null,
        is_new_customer: !!isNewCustomer,
        created_at: now,
        updated_at: now
      };
      profiles.push(profile);
    }

    this._saveToStorage('customer_profiles', profiles);

    return {
      success: true,
      customer_profile: profile,
      message: 'Customer profile saved.'
    };
  }

  // getCustomerProfile
  getCustomerProfile() {
    const profiles = this._getFromStorage('customer_profiles', []);
    const profile = profiles.length > 0 ? profiles[0] : null;
    return {
      customer_profile: profile
    };
  }

  // getDogProfiles
  getDogProfiles() {
    const dogs = this._getFromStorage('dog_profiles', []);
    return this._resolveCustomerOnDogProfiles(dogs);
  }

  // saveDogProfile
  saveDogProfile(
    id,
    name,
    breed,
    dateOfBirth,
    weightLbs,
    size,
    hasAllergies,
    medicalNotes,
    vetClinicName,
    vetPhone,
    emergencyContactName,
    emergencyContactPhone
  ) {
    let dogs = this._getFromStorage('dog_profiles', []);
    const customerProfiles = this._getFromStorage('customer_profiles', []);
    const customer = customerProfiles[0] || null;
    const now = new Date().toISOString();

    let dog;
    if (id) {
      const idx = dogs.findIndex((d) => d.id === id);
      if (idx === -1) {
        return {
          success: false,
          dog_profile: null,
          message: 'Dog profile not found.'
        };
      }
      dog = {
        ...dogs[idx],
        name,
        breed,
        date_of_birth: dateOfBirth || dogs[idx].date_of_birth || null,
        weight_lbs: typeof weightLbs === 'number' ? weightLbs : dogs[idx].weight_lbs || null,
        size: size || dogs[idx].size || null,
        has_allergies: typeof hasAllergies === 'boolean' ? hasAllergies : dogs[idx].has_allergies,
        medical_notes: medicalNotes || dogs[idx].medical_notes || null,
        vet_clinic_name: vetClinicName || dogs[idx].vet_clinic_name || null,
        vet_phone: vetPhone || dogs[idx].vet_phone || null,
        emergency_contact_name:
          emergencyContactName || dogs[idx].emergency_contact_name || null,
        emergency_contact_phone:
          emergencyContactPhone || dogs[idx].emergency_contact_phone || null,
        updated_at: now
      };
      dogs[idx] = dog;
    } else {
      dog = {
        id: this._generateId('dog'),
        customer_profile_id: customer ? customer.id : null,
        name,
        breed,
        date_of_birth: dateOfBirth || null,
        weight_lbs: typeof weightLbs === 'number' ? weightLbs : null,
        size: size || null,
        has_allergies: !!hasAllergies,
        medical_notes: medicalNotes || null,
        vet_clinic_name: vetClinicName || null,
        vet_phone: vetPhone || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        created_at: now,
        updated_at: now
      };
      dogs.push(dog);
    }

    this._saveToStorage('dog_profiles', dogs);

    return {
      success: true,
      dog_profile: dog,
      message: 'Dog profile saved.'
    };
  }

  // associateDogsToBoardingReservations
  associateDogsToBoardingReservations(associations) {
    let reservations = this._getFromStorage('boarding_reservations', []);

    const updated = [];
    (associations || []).forEach((assoc) => {
      const idx = reservations.findIndex((r) => r.id === assoc.reservationId);
      if (idx >= 0) {
        reservations[idx] = {
          ...reservations[idx],
          dog_profile_ids: assoc.dogProfileIds || [],
          updated_at: new Date().toISOString()
        };
        updated.push({
          reservation_id: reservations[idx].id,
          dog_profile_ids: reservations[idx].dog_profile_ids
        });
      }
    });

    this._saveToStorage('boarding_reservations', reservations);

    return {
      success: true,
      updated_reservations: updated
    };
  }

  // applyPromoCodeToCart
  applyPromoCodeToCart(promoCode) {
    const code = (promoCode || '').trim();
    if (!code) {
      return {
        success: false,
        message: 'Promo code is required.',
        promotion: null,
        cart_summary: null
      };
    }

    const promotions = this._getFromStorage('promotions', []);
    const promo = promotions.find(
      (p) => p.promo_code && p.promo_code.toLowerCase() === code.toLowerCase()
    );

    if (!promo || !promo.is_active) {
      return {
        success: false,
        message: 'Promo code not found or inactive.',
        promotion: null,
        cart_summary: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const reservations = this._getFromStorage('boarding_reservations', []);
    const daycarePurchases = this._getFromStorage('daycare_pass_purchases', []);

    let discountableAmount = 0;

    cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .forEach((item) => {
        if (promo.applies_to_service === 'boarding' || promo.applies_to_service === 'both') {
          if (item.item_type === 'boarding_reservation') {
            const res = reservations.find((r) => r.id === item.boarding_reservation_id);
            if (!res) return;
            const nights = this._calculateNights(res.check_in_date, res.check_out_date);
            if (promo.min_nights && nights < promo.min_nights) return;
            discountableAmount += item.total_price || 0;
          }
        }
        if (promo.applies_to_service === 'daycare' || promo.applies_to_service === 'both') {
          if (item.item_type === 'daycare_pass_purchase') {
            const purchase = daycarePurchases.find(
              (p) => p.id === item.daycare_pass_purchase_id
            );
            if (!purchase) return;
            discountableAmount += item.total_price || 0;
          }
        }
      });

    if (discountableAmount <= 0) {
      return {
        success: false,
        message: 'Cart does not qualify for this promotion.',
        promotion: promo,
        cart_summary: this.getCartSummary()
      };
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (promo.discount_value || 0) * 0.01 * discountableAmount;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = Math.min(promo.discount_value || 0, discountableAmount);
    }

    const carts = this._getFromStorage('cart', []);
    const cartIndex = carts.findIndex((c) => c.id === cart.id);

    const updatedCart = {
      ...cart,
      applied_promo_code: promo.promo_code,
      applied_promotion_id: promo.id,
      discount_amount: discount
    };

    carts[cartIndex] = updatedCart;
    this._saveToStorage('cart', carts);

    const recalcedCart = this._recalculateCartTotals(updatedCart);
    const resolvedItems = this._resolveCartItems(
      this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === recalcedCart.id)
    );

    return {
      success: true,
      message: 'Promo code applied.',
      promotion: promo,
      cart_summary: {
        cart: recalcedCart,
        items: resolvedItems.map((item) => ({
          cart_item_id: item.id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      }
    };
  }

  // continueToPaymentFromCheckout
  continueToPaymentFromCheckout(
    billingAddressLine1,
    billingAddressLine2,
    billingCity,
    billingState,
    billingZip
  ) {
    const cartSummary = this.getCartSummary();
    const cart = cartSummary.cart;
    const customerProfileData = this.getCustomerProfile();
    const customerProfile = customerProfileData.customer_profile || null;

    if (!cartSummary.items || cartSummary.items.length === 0) {
      return {
        success: false,
        order_id: null,
        order_summary: null,
        next_step: null
      };
    }

    let order = this._getCurrentPendingOrderOrCreate(cart, customerProfile);

    order = {
      ...order,
      billing_address_line1: billingAddressLine1 || order.billing_address_line1,
      billing_address_line2: billingAddressLine2 || order.billing_address_line2,
      billing_city: billingCity || order.billing_city,
      billing_state: billingState || order.billing_state,
      billing_zip: billingZip || order.billing_zip,
      promo_code: cart.applied_promo_code,
      promo_discount_amount: cart.discount_amount || 0,
      subtotal: cart.subtotal || 0,
      taxes: cart.taxes || 0,
      total: cart.total || 0,
      status: 'pending_payment',
      updated_at: new Date().toISOString()
    };

    const orders = this._getFromStorage('orders', []);
    const orderIdx = orders.findIndex((o) => o.id === order.id);
    if (orderIdx >= 0) {
      orders[orderIdx] = order;
    } else {
      orders.push(order);
    }
    this._saveToStorage('orders', orders);

    // Sync order_items with cart items
    let orderItems = this._getFromStorage('order_items', []);
    orderItems = orderItems.filter((oi) => oi.order_id !== order.id);

    cartSummary.items.forEach((item) => {
      const orderItem = {
        id: this._generateId('orderItem'),
        order_id: order.id,
        item_type:
          item.item_type === 'boarding_reservation'
            ? 'boarding_reservation'
            : 'daycare_pass_purchase',
        boarding_reservation_id:
          item.item_type === 'boarding_reservation' ? item.boarding_reservation_id : null,
        daycare_pass_purchase_id:
          item.item_type === 'daycare_pass_purchase'
            ? item.daycare_pass_purchase_id
            : null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      };
      orderItems.push(orderItem);
    });

    this._saveToStorage('order_items', orderItems);

    // Mark cart as submitted
    const carts = this._getFromStorage('cart', []);
    const cartIdx = carts.findIndex((c) => c.id === cart.id);
    if (cartIdx >= 0) {
      carts[cartIdx] = {
        ...cart,
        status: 'submitted',
        updated_at: new Date().toISOString()
      };
      this._saveToStorage('cart', carts);
    }

    return {
      success: true,
      order_id: order.id,
      order_summary: {
        order_number: order.order_number,
        status: order.status,
        promo_code: order.promo_code,
        promo_discount_amount: order.promo_discount_amount || 0,
        subtotal: order.subtotal,
        taxes: order.taxes,
        total: order.total
      },
      next_step: 'payment'
    };
  }

  // getPaymentPageDetails
  getPaymentPageDetails(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItemsRaw = this._getFromStorage('order_items', []);

    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return {
        order: null,
        items: [],
        can_edit_checkout: false
      };
    }

    const itemsForOrder = orderItemsRaw.filter((oi) => oi.order_id === order.id);
    const resolvedItems = this._resolveOrderItems(itemsForOrder);

    return {
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        customer_first_name: order.customer_first_name,
        customer_last_name: order.customer_last_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        promo_code: order.promo_code,
        promo_discount_amount: order.promo_discount_amount || 0,
        subtotal: order.subtotal,
        taxes: order.taxes,
        total: order.total
      },
      items: resolvedItems,
      can_edit_checkout: order.status === 'pending_payment'
    };
  }

  // getActivePromotions
  getActivePromotions(appliesToService, includeExpired) {
    const promos = this._getFromStorage('promotions', []);
    const includeExp = !!includeExpired;

    return promos.filter((p) => {
      if (!includeExp && !p.is_active) return false;
      if (!appliesToService) return true;
      return p.applies_to_service === appliesToService || p.applies_to_service === 'both';
    });
  }

  // getPolicySections
  getPolicySections() {
    return this._getFromStorage('policy_sections', []);
  }

  // getVaccinationRequirements
  getVaccinationRequirements(serviceType, minStayNights) {
    const reqs = this._getFromStorage('vaccination_requirements', []);

    let filtered = reqs.filter(
      (r) => r.applies_to_service === serviceType || r.applies_to_service === 'both'
    );

    if (typeof minStayNights === 'number') {
      filtered = filtered.filter((r) => {
        if (typeof r.min_stay_nights !== 'number') return true;
        return r.min_stay_nights <= minStayNights;
      });
    }

    // Instrumentation for task completion tracking
    try {
      if (
        serviceType === 'boarding' &&
        typeof minStayNights === 'number' &&
        minStayNights > 3
      ) {
        const instrumentationValue = {
          serviceType,
          minStayNights,
          requirementIds: filtered.map((r) => r.id)
        };
        localStorage.setItem(
          'task5_vaccinationRequirementsQuery',
          JSON.stringify(instrumentationValue)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return this._resolveVaccinationRequirements(filtered);
  }

  // getAboutPageContent
  getAboutPageContent() {
    const locations = this._getFromStorage('locations', []);
    return {
      mission: 'To provide safe, loving, and enriching stays for dogs of all sizes.',
      experience: 'Our experienced staff care for dogs 365 days a year with individualized attention.',
      safety_practices:
        'We require up-to-date vaccinations, supervised playgroups, and 24/7 monitoring at select locations.',
      staff_highlights: [],
      featured_locations: locations
    };
  }

  // getContactPageContent
  getContactPageContent() {
    const locations = this._getFromStorage('locations', []);
    const primary = locations[0] || null;

    return {
      primary_phone: primary ? primary.phone || '' : '',
      primary_email: primary ? primary.email || '' : '',
      business_hours: 'Hours vary by location; please contact your local facility.',
      locations_overview: locations,
      contact_form_fields: [
        { field_name: 'name', label: 'Name', type: 'text', required: true },
        { field_name: 'email', label: 'Email', type: 'email', required: true },
        { field_name: 'phone', label: 'Phone', type: 'text', required: false },
        { field_name: 'subject', label: 'Subject', type: 'text', required: true },
        { field_name: 'message', label: 'Message', type: 'textarea', required: true }
      ]
    };
  }

  // submitContactInquiry
  submitContactInquiry(name, email, phone, subject, message, preferredLocationId) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        message: 'Name, email, subject, and message are required.',
        ticket_id: null
      };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);
    const ticketId = this._generateId('ticket');

    const inquiry = {
      id: ticketId,
      name,
      email,
      phone: phone || null,
      subject,
      message,
      preferred_location_id: preferredLocationId || null,
      created_at: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Your inquiry has been submitted.',
      ticket_id: ticketId
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