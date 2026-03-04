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

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    const keysToInitAsArray = [
      'rooms',
      'rate_plans',
      'room_search_criteria',
      'room_bookings',
      'restaurants',
      'restaurant_search_criteria',
      'restaurant_time_slots',
      'menu_experiences',
      'restaurant_reservations',
      'experiences',
      'experience_listing_filters',
      'experience_registrations',
      'products',
      'shop_listing_filters',
      'carts',
      'cart_items',
      'gift_card_configurations',
      'event_inquiries',
      'newsletter_subscriptions',
      // legacy/demo keys from snippet (harmless if unused)
      'users'
    ];

    for (const key of keysToInitAsArray) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  _dateOnlyKey(dateStr) {
    const d = this._parseDate(dateStr);
    if (!d || isNaN(d.getTime())) return null;
    return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1).toString().padStart(2, '0') + '-' + d.getUTCDate().toString().padStart(2, '0');
  }

  _diffNights(check_in, check_out) {
    const ci = this._parseDate(check_in);
    const co = this._parseDate(check_out);
    if (!ci || !co) return 1;
    const diffMs = co.getTime() - ci.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    const now = this._nowIso();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        subtotal: 0,
        currency: 'USD',
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartSubtotal(cartId) {
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return null;
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cartId);
    let subtotal = 0;
    let currency = cart.currency || 'USD';
    for (const item of itemsForCart) {
      subtotal += Number(item.subtotal) || 0;
      if (item.currency) {
        currency = item.currency;
      }
    }
    cart.subtotal = subtotal;
    cart.currency = currency;
    cart.updated_at = this._nowIso();
    this._saveToStorage('carts', carts);
    return cart;
  }

  _attachRoomBookingForeignKeys(roomBooking) {
    if (!roomBooking) return null;
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');
    const room = rooms.find(r => r.id === roomBooking.room_id) || null;
    const ratePlan = roomBooking.rate_plan_id ? (ratePlans.find(rp => rp.id === roomBooking.rate_plan_id) || null) : null;
    return {
      ...roomBooking,
      room,
      rate_plan: ratePlan
    };
  }

  _attachRestaurantReservationForeignKeys(reservation) {
    if (!reservation) return null;
    const restaurants = this._getFromStorage('restaurants');
    const timeSlots = this._getFromStorage('restaurant_time_slots');
    const menuExperiences = this._getFromStorage('menu_experiences');
    const restaurant = restaurants.find(r => r.id === reservation.restaurant_id) || null;
    const time_slot = reservation.time_slot_id ? (timeSlots.find(ts => ts.id === reservation.time_slot_id) || null) : null;
    const menu_experience = reservation.menu_experience_id ? (menuExperiences.find(me => me.id === reservation.menu_experience_id) || null) : null;
    return {
      ...reservation,
      restaurant,
      time_slot,
      menu_experience
    };
  }

  _attachExperienceRegistrationForeignKeys(reg) {
    if (!reg) return null;
    const experiences = this._getFromStorage('experiences');
    const experience = experiences.find(e => e.id === reg.experience_id) || null;
    return {
      ...reg,
      experience
    };
  }

  _attachForeignKeysToCartItems(items) {
    const products = this._getFromStorage('products');
    const giftCards = this._getFromStorage('gift_card_configurations');
    const roomBookings = this._getFromStorage('room_bookings');
    const restaurantReservations = this._getFromStorage('restaurant_reservations');
    const experienceRegistrations = this._getFromStorage('experience_registrations');
    const restaurants = this._getFromStorage('restaurants');
    const timeSlots = this._getFromStorage('restaurant_time_slots');
    const menuExperiences = this._getFromStorage('menu_experiences');
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');
    const experiences = this._getFromStorage('experiences');

    return items.map(item => {
      let extended = { ...item };

      if (item.product_id) {
        extended.product = products.find(p => p.id === item.product_id) || null;
      }

      if (item.gift_card_id) {
        extended.gift_card = giftCards.find(g => g.id === item.gift_card_id) || null;
      }

      if (item.room_booking_id) {
        const booking = roomBookings.find(b => b.id === item.room_booking_id) || null;
        if (booking) {
          const room = rooms.find(r => r.id === booking.room_id) || null;
          const ratePlan = booking.rate_plan_id ? (ratePlans.find(rp => rp.id === booking.rate_plan_id) || null) : null;
          extended.room_booking = { ...booking, room, rate_plan: ratePlan };
        } else {
          extended.room_booking = null;
        }
      }

      if (item.restaurant_reservation_id) {
        const res = restaurantReservations.find(r => r.id === item.restaurant_reservation_id) || null;
        if (res) {
          const restaurant = restaurants.find(r => r.id === res.restaurant_id) || null;
          const time_slot = res.time_slot_id ? (timeSlots.find(ts => ts.id === res.time_slot_id) || null) : null;
          const menu_experience = res.menu_experience_id ? (menuExperiences.find(me => me.id === res.menu_experience_id) || null) : null;
          extended.restaurant_reservation = { ...res, restaurant, time_slot, menu_experience };
        } else {
          extended.restaurant_reservation = null;
        }
      }

      if (item.experience_registration_id) {
        const reg = experienceRegistrations.find(er => er.id === item.experience_registration_id) || null;
        if (reg) {
          const experience = experiences.find(e => e.id === reg.experience_id) || null;
          extended.experience_registration = { ...reg, experience };
        } else {
          extended.experience_registration = null;
        }
      }

      return extended;
    });
  }

  // -------------------- Validation Helpers --------------------

  _validateRoomAvailability(room_id, check_in, check_out, adults, children, rate_plan_id) {
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');
    const room = rooms.find(r => r.id === room_id && r.status === 'active');
    if (!room) {
      throw new Error('Room not available');
    }
    if (room.max_adults < adults || room.max_children < children) {
      throw new Error('Room capacity exceeded');
    }

    let applicableRatePlans = ratePlans.filter(rp => rp.room_id === room_id && rp.status === 'active');
    if (applicableRatePlans.length === 0) {
      // No stored rate plans; we'll fall back to the room's base rate when needed
      applicableRatePlans = [];
    }

    let chosenRatePlan = null;
    if (rate_plan_id) {
      chosenRatePlan = applicableRatePlans.find(rp => rp.id === rate_plan_id) || null;
      if (!chosenRatePlan) {
        // Allow bookings with a synthetic/base rate plan even if it does not exist in storage
        chosenRatePlan = {
          id: rate_plan_id,
          room_id,
          name: 'Base rate',
          description: 'Base rate',
          cancellation_policy: 'free_cancellation',
          is_refundable: true,
          includes_breakfast: !!room.includes_breakfast,
          price_per_night: room.base_price_per_night,
          currency: room.currency,
          is_default: true,
          status: 'active'
        };
      }
    } else if (applicableRatePlans.length > 0) {
      chosenRatePlan = applicableRatePlans.slice().sort((a, b) => a.price_per_night - b.price_per_night)[0];
    }

    return { room, ratePlan: chosenRatePlan };
  }

  _validateRestaurantSlotAvailability(restaurant_id, time_slot_id, reservation_datetime, party_size) {
    const restaurants = this._getFromStorage('restaurants');
    const timeSlots = this._getFromStorage('restaurant_time_slots');

    const restaurant = restaurants.find(r => r.id === restaurant_id);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    if (!time_slot_id) {
      // If no specific slot is referenced, we only validate that party_size is positive
      if (!party_size || party_size <= 0) {
        throw new Error('Invalid party size');
      }
      return { restaurant, timeSlot: null };
    }

    const slot = timeSlots.find(ts => ts.id === time_slot_id && ts.restaurant_id === restaurant_id);
    if (!slot) {
      throw new Error('Time slot not found');
    }
    if (!slot.is_available) {
      throw new Error('Time slot is no longer available');
    }
    if (slot.max_party_size < party_size) {
      throw new Error('Party size exceeds max for this time slot');
    }

    return { restaurant, timeSlot: slot };
  }

  _validateExperienceCapacity(experience_id, start_datetime, participants) {
    const experiences = this._getFromStorage('experiences');
    const experience = experiences.find(e => e.id === experience_id && e.status === 'active');
    if (!experience) {
      throw new Error('Experience not available');
    }
    if (participants <= 0) {
      throw new Error('Participants must be greater than zero');
    }
    if (typeof experience.max_participants === 'number' && participants > experience.max_participants) {
      throw new Error('Experience capacity exceeded');
    }
    if (typeof experience.min_participants === 'number' && participants < experience.min_participants) {
      // Still allow, but this could be a warning in a real system
    }
    return experience;
  }

  // -------------------- Home Page / About / Weddings --------------------

  getHomePageContent() {
    const rooms = this._getFromStorage('rooms').filter(r => r.status === 'active');
    const experiences = this._getFromStorage('experiences').filter(e => e.status === 'active');
    const products = this._getFromStorage('products').filter(p => p.status === 'active');

    const homeConfig = this._getObjectFromStorage('home_page_content', {});

    return {
      hero_title: homeConfig.hero_title || '',
      hero_subtitle: homeConfig.hero_subtitle || '',
      intro_text: homeConfig.intro_text || '',
      featured_rooms: rooms.slice(0, 3),
      featured_experiences: experiences.slice(0, 3),
      featured_products: products.slice(0, 3),
      featured_events: experiences
        .filter(e => e.list_category === 'events_classes')
        .slice(0, 3),
      seasonal_promotions: homeConfig.seasonal_promotions || []
    };
  }

  getAboutPageContent() {
    const about = this._getObjectFromStorage('about_page_content', {});
    return {
      history: about.history || '',
      mission: about.mission || '',
      sustainability_practices: about.sustainability_practices || '',
      guest_experience_overview: about.guest_experience_overview || ''
    };
  }

  getWeddingsAndGroupsOverview() {
    const data = this._getObjectFromStorage('weddings_and_groups_overview', {});
    return {
      intro_text: data.intro_text || '',
      venues: data.venues || [],
      example_packages: data.example_packages || []
    };
  }

  // -------------------- Rooms / Lodging --------------------

  getRoomSearchFormDefaults() {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const default_check_in = today.toISOString();
    const default_check_out = tomorrow.toISOString();
    return {
      default_check_in,
      default_check_out,
      default_adults: 2,
      default_children: 0
    };
  }

  getRoomFilterOptions() {
    return {
      room_types: [
        { value: 'standard_room', label: 'Standard room' },
        { value: 'family_room', label: 'Family room' },
        { value: 'suite', label: 'Suite' },
        { value: 'studio', label: 'Studio' },
        { value: 'cabin', label: 'Cabin' }
      ],
      amenities: [
        { key: 'family_friendly', label: 'Family-friendly' },
        { key: 'private_bathroom', label: 'Private bathroom' },
        { key: 'includes_breakfast', label: 'Breakfast included' },
        { key: 'has_kitchenette', label: 'Kitchenette' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'recommended', label: 'Recommended' }
      ]
    };
  }

  searchAvailableRooms(
    check_in,
    check_out,
    adults,
    children,
    filter_family_friendly,
    filter_private_bathroom,
    filter_breakfast_included,
    filter_has_kitchenette,
    max_price_per_night,
    sort_by
  ) {
    const rooms = this._getFromStorage('rooms').filter(r => r.status === 'active');
    const ratePlans = this._getFromStorage('rate_plans').filter(rp => rp.status === 'active');

    const nights = this._diffNights(check_in, check_out);

    let filtered = rooms.filter(room => {
      if (room.max_adults < adults || room.max_children < children) return false;
      if (filter_family_friendly && !room.is_family_friendly) return false;
      if (filter_private_bathroom && !room.has_private_bathroom) return false;
      if (filter_has_kitchenette && !room.has_kitchenette) return false;

      if (filter_breakfast_included) {
        const hasBreakfastRoom = !!room.includes_breakfast;
        const hasBreakfastRatePlan = ratePlans.some(rp => rp.room_id === room.id && rp.includes_breakfast && rp.status === 'active');
        if (!hasBreakfastRoom && !hasBreakfastRatePlan) return false;
      }
      return true;
    });

    const results = [];
    for (const room of filtered) {
      const roomRatePlans = ratePlans.filter(rp => rp.room_id === room.id);
      let lowestRatePlan = null;
      if (roomRatePlans.length > 0) {
        lowestRatePlan = roomRatePlans.slice().sort((a, b) => a.price_per_night - b.price_per_night)[0];
      }

      const nightly_price_from = lowestRatePlan ? lowestRatePlan.price_per_night : room.base_price_per_night;
      if (typeof max_price_per_night === 'number' && nightly_price_from > max_price_per_night) {
        continue;
      }
      const total_price = nightly_price_from * nights;
      const highlights = [];
      if (room.is_family_friendly) highlights.push('Family-friendly');
      if (room.has_private_bathroom) highlights.push('Private bathroom');
      if (room.has_kitchenette) highlights.push('Kitchenette');
      if (room.includes_breakfast || (lowestRatePlan && lowestRatePlan.includes_breakfast)) highlights.push('Breakfast included');

      const ratePlanWithRoom = lowestRatePlan
        ? { ...lowestRatePlan, room }
        : null;

      results.push({
        room,
        is_available: true,
        lowest_rate_plan: ratePlanWithRoom,
        nightly_price_from,
        total_price,
        highlights
      });
    }

    if (sort_by === 'price_low_to_high' || sort_by === 'recommended' || !sort_by) {
      results.sort((a, b) => a.nightly_price_from - b.nightly_price_from);
    } else if (sort_by === 'price_high_to_low') {
      results.sort((a, b) => b.nightly_price_from - a.nightly_price_from);
    }

    const currency = (results[0] && (results[0].lowest_rate_plan ? results[0].lowest_rate_plan.currency : results[0].room.currency)) || 'USD';

    return {
      check_in,
      check_out,
      adults,
      children,
      currency,
      rooms: results
    };
  }

  getRoomDetails(room_id) {
    const rooms = this._getFromStorage('rooms');
    const room = rooms.find(r => r.id === room_id) || null;
    return room;
  }

  getRoomRatesForStay(room_id, check_in, check_out, adults, children) {
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');

    const room = rooms.find(r => r.id === room_id) || null;
    if (!room) {
      throw new Error('Room not found');
    }

    let applicableRatePlans = ratePlans
      .filter(rp => rp.room_id === room_id && rp.status === 'active')
      .map(rp => ({ ...rp, room }));

    // If there are no stored rate plans for this room, expose a synthetic base rate plan
    if (applicableRatePlans.length === 0) {
      applicableRatePlans = [
        {
          id: `${room.id}_base_rate`,
          room_id: room.id,
          name: 'Base rate',
          description: 'Base rate',
          cancellation_policy: 'free_cancellation',
          is_refundable: true,
          includes_breakfast: !!room.includes_breakfast,
          price_per_night: room.base_price_per_night,
          currency: room.currency,
          is_default: true,
          status: 'active',
          room
        }
      ];
    }

    return {
      room,
      check_in,
      check_out,
      adults,
      children,
      rate_plans: applicableRatePlans
    };
  }

  startRoomBooking(room_id, rate_plan_id, check_in, check_out, adults, children) {
    const { room, ratePlan } = this._validateRoomAvailability(
      room_id,
      check_in,
      check_out,
      adults,
      children,
      rate_plan_id
    );

    const nights = this._diffNights(check_in, check_out);
    const nightly_rate = ratePlan ? ratePlan.price_per_night : room.base_price_per_night;
    const currency = ratePlan ? ratePlan.currency : room.currency;
    const total_price = nightly_rate * nights;

    let roomBookings = this._getFromStorage('room_bookings');

    const booking = {
      id: this._generateId('room_booking'),
      room_id: room.id,
      rate_plan_id: ratePlan ? ratePlan.id : null,
      check_in,
      check_out,
      adults,
      children,
      nightly_rate,
      currency,
      total_price,
      status: 'in_progress',
      primary_guest_first_name: '',
      primary_guest_last_name: '',
      primary_guest_email: '',
      primary_guest_phone: '',
      special_requests: '',
      created_at: this._nowIso()
    };

    roomBookings.push(booking);
    this._saveToStorage('room_bookings', roomBookings);

    // Optionally attach to cart for combined itinerary
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const description = `${room.name} (${nights} night${nights !== 1 ? 's' : ''})`;
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'room_booking',
      product_id: null,
      gift_card_id: null,
      room_booking_id: booking.id,
      restaurant_reservation_id: null,
      experience_registration_id: null,
      quantity: 1,
      unit_price: total_price,
      currency,
      subtotal: total_price,
      description,
      added_at: this._nowIso()
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartSubtotal(cart.id);

    return this._attachRoomBookingForeignKeys(booking);
  }

  getRoomBookingSummary(room_booking_id) {
    const roomBookings = this._getFromStorage('room_bookings');
    const booking = roomBookings.find(b => b.id === room_booking_id) || null;
    return this._attachRoomBookingForeignKeys(booking);
  }

  updateRoomBookingGuestInfo(
    room_booking_id,
    primary_guest_first_name,
    primary_guest_last_name,
    primary_guest_email,
    primary_guest_phone,
    special_requests
  ) {
    let roomBookings = this._getFromStorage('room_bookings');
    const idx = roomBookings.findIndex(b => b.id === room_booking_id);
    if (idx === -1) {
      throw new Error('Room booking not found');
    }
    const booking = roomBookings[idx];
    const updated = {
      ...booking,
      primary_guest_first_name,
      primary_guest_last_name,
      primary_guest_email,
      primary_guest_phone: primary_guest_phone || '',
      special_requests: special_requests || booking.special_requests
    };
    roomBookings[idx] = updated;
    this._saveToStorage('room_bookings', roomBookings);
    return this._attachRoomBookingForeignKeys(updated);
  }

  // -------------------- Restaurant --------------------

  getRestaurantOverview() {
    const restaurants = this._getFromStorage('restaurants');
    // Assume single primary restaurant
    return restaurants[0] || null;
  }

  getRestaurantReservationSearchDefaults() {
    const today = new Date();
    const defaultDate = today.toISOString();
    const defaultTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      18,
      0,
      0
    ).toISOString();
    return {
      default_date: defaultDate,
      default_time: defaultTime,
      default_party_size: 2
    };
  }

  searchRestaurantTimeSlots(
    restaurant_id,
    date,
    party_size,
    time_range_start,
    time_range_end,
    sort_by
  ) {
    const restaurants = this._getFromStorage('restaurants');
    const timeSlots = this._getFromStorage('restaurant_time_slots');
    const restaurant = restaurants.find(r => r.id === restaurant_id) || null;
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const targetDateKey = this._dateOnlyKey(date);
    const trs = time_range_start ? this._parseDate(time_range_start).getTime() : null;
    const tre = time_range_end ? this._parseDate(time_range_end).getTime() : null;

    let slots = timeSlots.filter(ts => {
      if (ts.restaurant_id !== restaurant_id) return false;
      if (!ts.is_available) return false;
      if (ts.max_party_size < party_size) return false;
      const slotDateKey = this._dateOnlyKey(ts.start_datetime);
      if (slotDateKey !== targetDateKey) return false;
      const t = this._parseDate(ts.start_datetime).getTime();
      if (trs !== null && t < trs) return false;
      if (tre !== null && t > tre) return false;
      return true;
    });

    if (sort_by === 'time_late_to_early') {
      slots.sort((a, b) => this._parseDate(b.start_datetime) - this._parseDate(a.start_datetime));
    } else {
      // default early to late
      slots.sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));
    }

    // attach foreign key: restaurant
    const slotsWithRestaurant = slots.map(ts => ({ ...ts, restaurant }));

    return {
      restaurant,
      date,
      party_size,
      time_slots: slotsWithRestaurant
    };
  }

  getRestaurantMenuExperiences(restaurant_id) {
    // MenuExperience currently has no restaurant_id; return all active
    const menuExperiences = this._getFromStorage('menu_experiences');
    return menuExperiences.filter(me => me.status === 'active');
  }

  startRestaurantReservation(
    restaurant_id,
    time_slot_id,
    reservation_datetime,
    party_size,
    seating_preference,
    menu_experience_id
  ) {
    const { restaurant, timeSlot } = this._validateRestaurantSlotAvailability(
      restaurant_id,
      time_slot_id,
      reservation_datetime,
      party_size
    );

    const menuExperiences = this._getFromStorage('menu_experiences');
    const menuExperience = menu_experience_id
      ? menuExperiences.find(me => me.id === menu_experience_id && me.status === 'active') || null
      : null;

    let reservations = this._getFromStorage('restaurant_reservations');

    const reservation = {
      id: this._generateId('restaurant_reservation'),
      restaurant_id: restaurant.id,
      time_slot_id: timeSlot ? timeSlot.id : null,
      reservation_datetime,
      party_size,
      seating_preference: seating_preference || 'no_preference',
      menu_experience_id: menuExperience ? menuExperience.id : null,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'in_progress',
      notes: '',
      created_at: this._nowIso()
    };

    reservations.push(reservation);
    this._saveToStorage('restaurant_reservations', reservations);

    // Add to cart for itinerary
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let unit_price = 0;
    let currency = 'USD';
    if (menuExperience) {
      unit_price = menuExperience.price_per_person * party_size;
      currency = menuExperience.currency;
    }

    const descriptionBase = restaurant.name || 'Restaurant reservation';
    const description = menuExperience
      ? `${descriptionBase} - ${menuExperience.name} for ${party_size}`
      : `${descriptionBase} for ${party_size}`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'restaurant_reservation',
      product_id: null,
      gift_card_id: null,
      room_booking_id: null,
      restaurant_reservation_id: reservation.id,
      experience_registration_id: null,
      quantity: 1,
      unit_price,
      currency,
      subtotal: unit_price,
      description,
      added_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartSubtotal(cart.id);

    return this._attachRestaurantReservationForeignKeys(reservation);
  }

  getRestaurantReservationSummary(restaurant_reservation_id) {
    const reservations = this._getFromStorage('restaurant_reservations');
    const reservation = reservations.find(r => r.id === restaurant_reservation_id) || null;
    return this._attachRestaurantReservationForeignKeys(reservation);
  }

  updateRestaurantReservationContact(
    restaurant_reservation_id,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) {
    let reservations = this._getFromStorage('restaurant_reservations');
    const idx = reservations.findIndex(r => r.id === restaurant_reservation_id);
    if (idx === -1) {
      throw new Error('Restaurant reservation not found');
    }
    const reservation = reservations[idx];
    const updated = {
      ...reservation,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      notes: typeof notes === 'string' ? notes : reservation.notes
    };

    reservations[idx] = updated;
    this._saveToStorage('restaurant_reservations', reservations);

    return this._attachRestaurantReservationForeignKeys(updated);
  }

  // -------------------- Experiences & Events --------------------

  getExperienceListingFilterOptions() {
    return {
      list_categories: [
        { value: 'experiences', label: 'Experiences' },
        { value: 'events_classes', label: 'Events & Classes' }
      ],
      experience_categories: [
        { value: 'farm_tour', label: 'Farm tours' },
        { value: 'workshop', label: 'Workshops' },
        { value: 'cooking_class', label: 'Cooking classes' },
        { value: 'event', label: 'Events' },
        { value: 'other', label: 'Other' }
      ],
      time_of_day_options: [
        { value: 'any', label: 'Any time' },
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' }
      ],
      difficulty_levels: [
        { value: 'any', label: 'Any level' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
      ]
    };
  }

  searchExperiences(
    list_category,
    date,
    date_from,
    date_to,
    experience_categories,
    time_of_day,
    difficulty_level,
    min_price,
    max_price
  ) {
    let experiences = this._getFromStorage('experiences').filter(e => e.status === 'active');

    if (list_category) {
      experiences = experiences.filter(e => e.list_category === list_category);
    }

    if (date) {
      const dateKey = this._dateOnlyKey(date);
      experiences = experiences.filter(e => this._dateOnlyKey(e.start_datetime) === dateKey);
    }

    if (date_from || date_to) {
      const from = date_from ? this._parseDate(date_from).getTime() : null;
      const to = date_to ? this._parseDate(date_to).getTime() : null;
      experiences = experiences.filter(e => {
        const t = this._parseDate(e.start_datetime).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
        return true;
      });
    }

    if (experience_categories && experience_categories.length > 0) {
      const set = new Set(experience_categories);
      experiences = experiences.filter(e => set.has(e.category));
    }

    if (time_of_day && time_of_day !== 'any') {
      experiences = experiences.filter(e => {
        const d = this._parseDate(e.start_datetime);
        if (!d) return false;
        const hour = d.getUTCHours();
        if (time_of_day === 'morning') return hour >= 5 && hour < 12;
        if (time_of_day === 'afternoon') return hour >= 12 && hour < 17;
        if (time_of_day === 'evening') return hour >= 17 && hour < 24;
        return true;
      });
    }

    if (difficulty_level && difficulty_level !== 'any') {
      experiences = experiences.filter(e => e.difficulty_level === difficulty_level || e.difficulty_level === 'beginner_friendly');
    }

    if (typeof min_price === 'number') {
      experiences = experiences.filter(e => e.price_per_person >= min_price);
    }

    if (typeof max_price === 'number') {
      experiences = experiences.filter(e => e.price_per_person <= max_price);
    }

    return experiences;
  }

  getExperienceDetails(experience_id) {
    const experiences = this._getFromStorage('experiences');
    const experience = experiences.find(e => e.id === experience_id) || null;
    return experience;
  }

  startExperienceRegistration(experience_id, start_datetime, participants) {
    const experience = this._validateExperienceCapacity(experience_id, start_datetime, participants);

    let registrations = this._getFromStorage('experience_registrations');

    const total_price = experience.price_per_person * participants;
    const registration = {
      id: this._generateId('experience_registration'),
      experience_id: experience.id,
      start_datetime,
      participants,
      price_per_person: experience.price_per_person,
      currency: experience.currency,
      total_price,
      status: 'in_itinerary',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      notes: '',
      created_at: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('experience_registrations', registrations);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const description = `${experience.name} for ${participants}`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'experience_registration',
      product_id: null,
      gift_card_id: null,
      room_booking_id: null,
      restaurant_reservation_id: null,
      experience_registration_id: registration.id,
      quantity: 1,
      unit_price: total_price,
      currency: experience.currency,
      subtotal: total_price,
      description,
      added_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartSubtotal(cart.id);

    return {
      experience_registration: this._attachExperienceRegistrationForeignKeys(registration),
      cart
    };
  }

  getExperienceRegistrationSummary(experience_registration_id) {
    const registrations = this._getFromStorage('experience_registrations');
    const reg = registrations.find(r => r.id === experience_registration_id) || null;
    return this._attachExperienceRegistrationForeignKeys(reg);
  }

  updateExperienceRegistrationContact(
    experience_registration_id,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) {
    let registrations = this._getFromStorage('experience_registrations');
    const idx = registrations.findIndex(r => r.id === experience_registration_id);
    if (idx === -1) {
      throw new Error('Experience registration not found');
    }
    const reg = registrations[idx];
    const updated = {
      ...reg,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      notes: typeof notes === 'string' ? notes : reg.notes
    };
    registrations[idx] = updated;
    this._saveToStorage('experience_registrations', registrations);
    return this._attachExperienceRegistrationForeignKeys(updated);
  }

  // -------------------- Shop / Products --------------------

  getShopListingFilterOptions() {
    return {
      categories: [
        { value: 'jars_preserves', label: 'Jars & Preserves' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'name_a_to_z', label: 'Name: A to Z' }
      ],
      min_rating_steps: [0, 1, 2, 3, 4]
    };
  }

  searchShopProducts(
    category_id,
    min_rating,
    max_price,
    product_types,
    sort_by,
    search_query
  ) {
    let products = this._getFromStorage('products').filter(p => p.status === 'active' && p.is_in_stock);

    if (category_id) {
      products = products.filter(p => p.list_category === category_id);
    }

    if (typeof min_rating === 'number') {
      products = products.filter(p => p.rating_average >= min_rating);
    }

    if (typeof max_price === 'number') {
      products = products.filter(p => p.price <= max_price);
    }

    if (product_types && product_types.length > 0) {
      const set = new Set(product_types);
      products = products.filter(p => set.has(p.product_type));
    }

    if (search_query && search_query.trim()) {
      const q = search_query.toLowerCase();
      products = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (sort_by === 'price_low_to_high') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort_by === 'price_high_to_low') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort_by === 'rating_high_to_low') {
      products.sort((a, b) => b.rating_average - a.rating_average);
    } else if (sort_by === 'name_a_to_z') {
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return products;
  }

  getProductDetails(product_id) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === product_id) || null;
    return product;
  }

  addProductToCart(product_id, quantity) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === product_id && p.status === 'active' && p.is_in_stock);
    if (!product) {
      throw new Error('Product not available');
    }
    const qty = quantity && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let existing = cartItems.find(
      ci => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === product.id
    );

    const unit_price = product.price;
    if (existing) {
      existing.quantity += qty;
      existing.subtotal = existing.quantity * unit_price;
      existing.currency = product.currency;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        product_id: product.id,
        gift_card_id: null,
        room_booking_id: null,
        restaurant_reservation_id: null,
        experience_registration_id: null,
        quantity: qty,
        unit_price,
        currency: product.currency,
        subtotal: unit_price * qty,
        description: product.name || 'Product',
        added_at: this._nowIso()
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartSubtotal(cart.id);

    const cart_item_with_product = {
      ...existing,
      product
    };

    return {
      cart: this._getOrCreateCart(),
      cart_item: cart_item_with_product
    };
  }

  // -------------------- Gift Cards --------------------

  getGiftCardTypesAndDefaults() {
    return {
      gift_card_types: [
        { value: 'digital', label: 'Digital gift card' },
        { value: 'physical', label: 'Physical gift card' }
      ],
      preset_amounts: [50, 100, 150, 200],
      default_currency: 'USD'
    };
  }

  configureGiftCardAndAddToCart(
    gift_card_type,
    amount,
    currency,
    recipient_name,
    recipient_email,
    message,
    delivery_option,
    scheduled_delivery_datetime
  ) {
    if (!amount || amount <= 0) {
      throw new Error('Gift card amount must be greater than zero');
    }
    if (delivery_option === 'schedule_date' && !scheduled_delivery_datetime) {
      throw new Error('Scheduled delivery requires a date');
    }

    let giftCards = this._getFromStorage('gift_card_configurations');

    const giftCard = {
      id: this._generateId('gift_card'),
      gift_card_type,
      amount,
      currency,
      recipient_name,
      recipient_email,
      message: message || '',
      delivery_option,
      scheduled_delivery_datetime: delivery_option === 'schedule_date' ? scheduled_delivery_datetime : null,
      status: 'in_cart',
      created_at: this._nowIso()
    };

    giftCards.push(giftCard);
    this._saveToStorage('gift_card_configurations', giftCards);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      product_id: null,
      gift_card_id: giftCard.id,
      room_booking_id: null,
      restaurant_reservation_id: null,
      experience_registration_id: null,
      quantity: 1,
      unit_price: amount,
      currency,
      subtotal: amount,
      description: `Gift card for ${recipient_name}`,
      added_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartSubtotal(cart.id);

    return {
      gift_card_configuration: giftCard,
      cart,
      cart_item: { ...cartItem, gift_card: giftCard }
    };
  }

  // -------------------- Cart & Checkout --------------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id);
    const enrichedItems = this._attachForeignKeysToCartItems(itemsForCart);
    return {
      cart,
      items: enrichedItems
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cart_item_id);
    if (idx === -1) {
      throw new Error('Cart item not found');
    }
    const item = cartItems[idx];

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.subtotal = item.unit_price * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    this._recalculateCartSubtotal(cart.id);

    const allItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const enrichedItems = this._attachForeignKeysToCartItems(allItems);

    return {
      cart,
      items: enrichedItems
    };
  }

  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cart_item_id);
    if (idx === -1) {
      throw new Error('Cart item not found');
    }
    const cart_id = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    this._recalculateCartSubtotal(cart.id);

    const allItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const enrichedItems = this._attachForeignKeysToCartItems(allItems);

    return {
      cart,
      items: enrichedItems
    };
  }

  startCheckout() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const enrichedItems = this._attachForeignKeysToCartItems(allItems);
    const currency = cart.currency || (enrichedItems[0] ? enrichedItems[0].currency : 'USD');
    const total = cart.subtotal;

    // Mark the current cart as being in checkout so subsequent flows start with a fresh cart
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = {
        ...carts[idx],
        status: 'in_checkout',
        updated_at: this._nowIso()
      };
      this._saveToStorage('carts', carts);
    }

    return {
      cart,
      items: enrichedItems,
      total,
      currency
    };
  }

  getCheckoutOverview() {
    // Same as startCheckout but without any mutation
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const enrichedItems = this._attachForeignKeysToCartItems(allItems);
    const currency = cart.currency || (enrichedItems[0] ? enrichedItems[0].currency : 'USD');
    const total = cart.subtotal;

    return {
      cart,
      items: enrichedItems,
      total,
      currency
    };
  }

  updateCheckoutContactInfo(contact_name, contact_email, contact_phone) {
    const cart = this._getOrCreateCart();
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = {
        ...carts[idx],
        checkout_contact_name: contact_name,
        checkout_contact_email: contact_email,
        checkout_contact_phone: contact_phone || '',
        updated_at: this._nowIso()
      };
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      message: 'Checkout contact info updated.'
    };
  }

  // -------------------- Event Inquiries (Weddings & Groups) --------------------

  submitEventInquiry(
    event_type,
    guest_count,
    preferred_date,
    budget,
    currency,
    message,
    contact_name,
    contact_email,
    contact_phone
  ) {
    let inquiries = this._getFromStorage('event_inquiries');

    const inquiry = {
      id: this._generateId('event_inquiry'),
      event_type,
      guest_count,
      preferred_date,
      budget: typeof budget === 'number' ? budget : null,
      currency: currency || 'USD',
      message,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      status: 'submitted',
      created_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('event_inquiries', inquiries);

    return inquiry;
  }

  // -------------------- Newsletter --------------------

  getNewsletterSubscriptionOptions() {
    return {
      interests: [
        { value: 'seasonal_recipes', label: 'Seasonal recipes' },
        { value: 'room_offers', label: 'Room offers' },
        { value: 'farm_news', label: 'Farm news' },
        { value: 'events_updates', label: 'Events & workshops' }
      ],
      frequencies: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ]
    };
  }

  subscribeToNewsletter(email, interests, frequency) {
    let subs = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email,
      interests: interests || [],
      frequency,
      status: 'active',
      created_at: this._nowIso()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return subscription;
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