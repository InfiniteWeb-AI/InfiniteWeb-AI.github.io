/* localStorage polyfill for Node.js and environments without localStorage */
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

  /* -------------------- Initialization & Storage Helpers -------------------- */

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tableKeys = [
      'boarding_room_types',
      'room_amenities',
      'boarding_add_ons',
      'boarding_bookings',
      'boarding_booking_extras',
      'grooming_services',
      'grooming_appointments',
      'grooming_appointment_services',
      'gift_card_products',
      'gift_cards_configured',
      'cart',
      'cart_items',
      'checkout_orders',
      'contact_messages',
      'tour_requests',
      'newsletter_subscriptions',
      'pet_profiles',
      'policy_sections'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
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

  _parseYmd(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return null;
    // Use UTC to avoid timezone shifts in day-diff math
    return new Date(Date.UTC(y, m - 1, d));
  }

  _formatYmd(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _daysBetweenYmd(startStr, endStr) {
    const start = this._parseYmd(startStr);
    const end = this._parseYmd(endStr);
    if (!start || !end) return 0;
    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  _daysBetweenIso(startIso, endIso) {
    if (!startIso || !endIso) return 0;
    const startStr = String(startIso).slice(0, 10);
    const endStr = String(endIso).slice(0, 10);
    return this._daysBetweenYmd(startStr, endStr);
  }

  _isHolidayPeriod(checkInDate, checkOutDate) {
    // Simple rule: if stay overlaps Dec 20 - Dec 31 of the check-in year
    const start = this._parseYmd(checkInDate);
    const end = this._parseYmd(checkOutDate);
    if (!start || !end) return false;
    const year = start.getUTCFullYear();
    const holidayStart = new Date(Date.UTC(year, 11, 20)); // Dec 20
    const holidayEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59)); // Dec 31
    return start <= holidayEnd && end >= holidayStart;
  }

  /* -------------------------- Required Helper APIs -------------------------- */

  // Internal helper to fetch or create the single active cart for the current agent
  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    const now = this._nowIso();
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: now,
        updated_at: now,
        subtotal: 0,
        total: 0,
        currency: 'USD'
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  // Internal helper to get the current in-flow boarding booking (if tracked)
  _getCurrentBoardingBooking() {
    const currentId = localStorage.getItem('current_boarding_booking_id');
    if (!currentId) return null;
    const bookings = this._getFromStorage('boarding_bookings');
    const booking = bookings.find((b) => b.id === currentId);
    if (!booking) return null;

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || null;

    const extrasAll = this._getFromStorage('boarding_booking_extras');
    const addOns = this._getFromStorage('boarding_add_ons');
    const extras = extrasAll
      .filter((e) => e.booking_id === booking.id)
      .map((e) => ({
        ...e,
        addOn: addOns.find((a) => a.id === e.add_on_id) || null
      }));

    return { booking: { ...booking, roomType }, roomType, extras };
  }

  // Internal helper to calculate nights, room subtotal, extras total, and total_before_tax
  _calculateBoardingPricing(booking, roomType, extrasForBooking) {
    if (!booking || !roomType) return booking;

    const checkInYmd = String(booking.check_in || '').slice(0, 10);
    const checkOutYmd = String(booking.check_out || '').slice(0, 10);
    const nights = this._daysBetweenYmd(checkInYmd, checkOutYmd);
    booking.nights = nights;
    booking.base_nightly_rate = roomType.base_nightly_rate || 0;
    booking.subtotal_room = nights * (roomType.base_nightly_rate || 0);

    let extras = extrasForBooking;
    if (!extras) {
      const allExtras = this._getFromStorage('boarding_booking_extras');
      extras = allExtras.filter((e) => e.booking_id === booking.id);
    }
    let extrasTotal = 0;
    extras.forEach((e) => {
      extrasTotal += e.total_price || 0;
    });
    booking.extras_total = extrasTotal;
    booking.total_before_tax = booking.subtotal_room + extrasTotal;
    return booking;
  }

  // Internal helper to compute grooming appointment totals from selected services
  _calculateGroomingTotal(mainService, extraServices, catCount) {
    const mainPrice = mainService ? mainService.price || 0 : 0;
    let extrasTotal = 0;
    (extraServices || []).forEach((svc) => {
      const price = svc.price || 0;
      const qty = svc._quantity || 1; // _quantity is attached by selectGroomingServices
      extrasTotal += price * qty;
    });
    const total = mainPrice + extrasTotal;
    return { extrasTotal, total };
  }

  // Internal helper to combine separate date and time into ISO datetime
  _combineDateAndTime(dateStr, timeStr) {
    if (!dateStr) return null;
    const safeTime = timeStr && timeStr.length ? timeStr : '00:00';
    // Use local time; stored as ISO string
    const iso = new Date(`${dateStr}T${safeTime}:00`).toISOString();
    return iso;
  }

  _updateCartTotals(cartId) {
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cartId);
    if (cartIndex === -1) return null;
    const cart = carts[cartIndex];
    const items = this._getFromStorage('cart_items').filter((i) => i.cart_id === cartId);
    let subtotal = 0;
    items.forEach((i) => {
      subtotal += i.total_price || 0;
    });
    cart.subtotal = subtotal;
    cart.total = subtotal;
    cart.updated_at = this._nowIso();
    carts[cartIndex] = cart;
    this._saveToStorage('cart', carts);
    return cart;
  }

  _generateBookingReference() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return 'CB' + num;
  }

  _generateGroomingReference() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return 'GA' + num;
  }

  /* ----------------------------- Core Interfaces ---------------------------- */

  /* ========================= Homepage & Newsletter ========================= */

  // Get homepage content
  getHomePageContent() {
    const stored = this._getFromStorage('homepage_content', null);
    const base = {
      heroTitle: '',
      heroSubtitle: '',
      boardingHighlight: '',
      groomingHighlight: '',
      facilityHighlight: '',
      showBookNowButton: true,
      quickSections: []
    };

    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return {
        heroTitle: stored.heroTitle || base.heroTitle,
        heroSubtitle: stored.heroSubtitle || base.heroSubtitle,
        boardingHighlight: stored.boardingHighlight || base.boardingHighlight,
        groomingHighlight: stored.groomingHighlight || base.groomingHighlight,
        facilityHighlight: stored.facilityHighlight || base.facilityHighlight,
        showBookNowButton:
          typeof stored.showBookNowButton === 'boolean' ? stored.showBookNowButton : base.showBookNowButton,
        quickSections: Array.isArray(stored.quickSections) ? stored.quickSections : base.quickSections
      };
    }
    return base;
  }

  // Subscribe an email address to the newsletter
  subscribeToNewsletter(email, source = 'footer_form') {
    const allowedSources = ['footer_form', 'booking_opt_in', 'grooming_opt_in', 'other'];
    const finalSource = allowedSources.includes(source) ? source : 'other';

    const now = this._nowIso();
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const lowerEmail = String(email || '').toLowerCase();
    let subscription = subscriptions.find((s) => String(s.email || '').toLowerCase() === lowerEmail);

    if (subscription) {
      subscription.status = 'subscribed';
      subscription.source = finalSource;
      subscription.updated_at = now;
    } else {
      subscription = {
        id: this._generateId('ns'),
        email,
        status: 'subscribed',
        source: finalSource,
        created_at: now,
        updated_at: now
      };
      subscriptions.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription,
      message: 'Subscription saved'
    };
  }

  /* ========================= Boarding / Rooms APIs ========================= */

  // Get Cat Boarding & Rooms overview
  getBoardingOverview() {
    const content = this._getFromStorage('boarding_overview_content', null);
    const roomTypesRaw = this._getFromStorage('boarding_room_types');
    const amenitiesAll = this._getFromStorage('room_amenities');

    const roomTypes = roomTypesRaw
      .filter((rt) => rt.is_active !== false)
      .map((rt) => {
        const amens = Array.isArray(rt.amenity_codes)
          ? amenitiesAll.filter((a) => rt.amenity_codes.includes(a.code))
          : [];
        const badges = [];
        if (rt.includes_webcam) badges.push('Webcam');
        if (rt.includes_live_camera) badges.push('Live Camera');
        if (rt.max_cats >= 3) badges.push('Family Friendly');
        return {
          roomType: {
            id: rt.id,
            name: rt.name,
            room_class: rt.room_class,
            description: rt.description,
            base_nightly_rate: rt.base_nightly_rate,
            max_cats: rt.max_cats,
            includes_webcam: rt.includes_webcam,
            includes_live_camera: rt.includes_live_camera,
            hero_image_url: rt.hero_image_url
          },
          amenities: amens,
          displayBadges: badges
        };
      });

    return {
      introTitle: (content && content.introTitle) || '',
      introBody: (content && content.introBody) || '',
      whatsIncludedHtml: (content && content.whatsIncludedHtml) || '',
      generalPricingNote: (content && content.generalPricingNote) || '',
      roomTypes
    };
  }

  // Get details for a single boarding room type
  getBoardingRoomDetails(roomTypeId) {
    const roomTypes = this._getFromStorage('boarding_room_types');
    const amenitiesAll = this._getFromStorage('room_amenities');
    const roomType = roomTypes.find((r) => r.id === roomTypeId) || null;

    if (!roomType) {
      return {
        roomType: null,
        amenities: [],
        photoGallery: [],
        canHostThreeCats: false,
        notes: ''
      };
    }

    // Instrumentation for task completion tracking (task_4)
    try {
      const existingRaw = localStorage.getItem('task4_comparedRoomTypeIds');
      let ids = [];
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) {
            ids = parsed;
          }
        } catch (e) {
          // ignore parse error, fall back to empty array
        }
      }
      if (!ids.includes(roomType.id)) {
        ids.push(roomType.id);
      }
      localStorage.setItem('task4_comparedRoomTypeIds', JSON.stringify(ids));
    } catch (e) {
      console.error('Instrumentation error (getBoardingRoomDetails):', e);
    }

    const amenities = Array.isArray(roomType.amenity_codes)
      ? amenitiesAll.filter((a) => roomType.amenity_codes.includes(a.code))
      : [];

    const photoGallery = Array.isArray(roomType.image_urls) ? roomType.image_urls : [];

    return {
      roomType,
      amenities,
      photoGallery,
      canHostThreeCats: roomType.max_cats >= 3,
      notes: roomType.description || ''
    };
  }

  // Get filter and sort options for the boarding room selection step
  getBoardingRoomSearchFilters() {
    const amenitiesAll = this._getFromStorage('room_amenities');

    const roomTypeOptions = [
      { value: 'standard_indoor', label: 'Standard Indoor' },
      { value: 'private_suite', label: 'Private Suite' },
      { value: 'window_view_suite', label: 'Window View Suite' },
      { value: 'family_suite', label: 'Family Suite' },
      { value: 'other', label: 'Other' }
    ];

    const amenityOptions = amenitiesAll
      .filter((a) => a.is_active !== false)
      .map((a) => ({ code: a.code, label: a.name }));

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      roomTypeOptions,
      amenityOptions,
      sortOptions
    };
  }

  // Search available boarding rooms
  searchBoardingAvailability(checkInDate, checkOutDate, catCount, filters, sortBy = 'price_low_to_high') {
    const nights = this._daysBetweenYmd(checkInDate, checkOutDate);
    const isHolidayPeriod = this._isHolidayPeriod(checkInDate, checkOutDate);

    const roomTypes = this._getFromStorage('boarding_room_types');

    const roomClassFilter = filters && filters.roomClassFilter ? filters.roomClassFilter : null;
    const amenityCodesFilter = filters && Array.isArray(filters.amenityCodes) ? filters.amenityCodes : [];

    let availableRooms = roomTypes
      .filter((rt) => rt.is_active !== false)
      .map((rt) => {
        const canAccommodateCats = rt.max_cats >= catCount;
        return {
          roomType: rt,
          isAvailable: canAccommodateCats, // no per-date availability; assume capacity if cat count fits
          canAccommodateCats,
          estimatedNightlyRate: rt.base_nightly_rate,
          estimatedRoomSubtotal: nights * (rt.base_nightly_rate || 0)
        };
      })
      .filter((item) => item.canAccommodateCats);

    if (roomClassFilter) {
      availableRooms = availableRooms.filter((item) => item.roomType.room_class === roomClassFilter);
    }

    if (amenityCodesFilter.length) {
      availableRooms = availableRooms.filter((item) => {
        const codes = item.roomType.amenity_codes || [];
        return amenityCodesFilter.every((code) => codes.includes(code));
      });
    }

    if (sortBy === 'price_low_to_high') {
      availableRooms.sort((a, b) => (a.estimatedNightlyRate || 0) - (b.estimatedNightlyRate || 0));
    } else if (sortBy === 'price_high_to_low') {
      availableRooms.sort((a, b) => (b.estimatedNightlyRate || 0) - (a.estimatedNightlyRate || 0));
    }

    // Instrumentation for task completion tracking (task_1 and task_2)
    try {
      const searchParamsJson = JSON.stringify({ checkInDate, checkOutDate, catCount, filters, sortBy });
      localStorage.setItem('task1_searchParams', searchParamsJson);
      localStorage.setItem('task2_searchParams', searchParamsJson);
    } catch (e) {
      console.error('Instrumentation error (searchBoardingAvailability):', e);
    }

    return {
      nights,
      isHolidayPeriod,
      availableRooms
    };
  }

  // Create a boarding booking draft/quote after selecting dates, cat count, and room
  createBoardingBookingFromSelection(checkInDate, checkOutDate, catCount, roomTypeId, mode = 'new') {
    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === roomTypeId);
    if (!roomType) {
      return { booking: null, message: 'Room type not found' };
    }

    const nights = this._daysBetweenYmd(checkInDate, checkOutDate);
    const isHolidayPeriod = this._isHolidayPeriod(checkInDate, checkOutDate);

    const booking = {
      id: this._generateId('bb'),
      booking_reference: this._generateBookingReference(),
      status: mode === 'modify' ? 'modified' : 'quote',
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      check_in: this._combineDateAndTime(checkInDate, '15:00'),
      check_out: this._combineDateAndTime(checkOutDate, '11:00'),
      nights,
      cat_count: catCount,
      room_type_id: roomType.id,
      room_type_name: roomType.name,
      base_nightly_rate: roomType.base_nightly_rate,
      subtotal_room: nights * (roomType.base_nightly_rate || 0),
      extras_total: 0,
      total_before_tax: nights * (roomType.base_nightly_rate || 0),
      currency: 'USD',
      contact_first_name: null,
      contact_last_name: '',
      contact_email: null,
      contact_phone: null,
      notes: null,
      is_holiday_period: isHolidayPeriod
    };

    const bookings = this._getFromStorage('boarding_bookings');
    bookings.push(booking);
    this._saveToStorage('boarding_bookings', bookings);

    // Track as current booking in-flow
    localStorage.setItem('current_boarding_booking_id', booking.id);

    return {
      booking: { ...booking, roomType },
      message: 'Booking draft created'
    };
  }

  // Get available boarding add-ons for a booking
  getBoardingAddOnsForBooking(bookingId) {
    const bookings = this._getFromStorage('boarding_bookings');
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return {
        booking: null,
        addOnGroups: [],
        currentExtras: [],
        runningTotalBeforeTax: 0
      };
    }

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || null;

    const addOnsAll = this._getFromStorage('boarding_add_ons').filter((a) => a.is_active !== false);
    const extrasAll = this._getFromStorage('boarding_booking_extras');

    const currentExtrasRaw = extrasAll.filter((e) => e.booking_id === booking.id);
    const currentExtras = currentExtrasRaw.map((e) => ({
      ...e,
      addOn: addOnsAll.find((a) => a.id === e.add_on_id) || null
    }));

    const groupsMap = {};
    addOnsAll.forEach((addOn) => {
      const cat = addOn.category || 'other';
      if (!groupsMap[cat]) {
        groupsMap[cat] = {
          category: cat,
          categoryLabel: this._mapAddOnCategoryLabel(cat),
          addOns: []
        };
      }
      groupsMap[cat].addOns.push(addOn);
    });

    const addOnGroups = Object.values(groupsMap);

    // Ensure pricing fields are up-to-date
    this._calculateBoardingPricing(booking, roomType || { base_nightly_rate: booking.base_nightly_rate }, currentExtrasRaw);

    const runningTotalBeforeTax = booking.total_before_tax || booking.subtotal_room + booking.extras_total;

    return {
      booking: { ...booking, roomType },
      addOnGroups,
      currentExtras,
      runningTotalBeforeTax
    };
  }

  // Update selected extras/add-ons for a booking
  updateBoardingBookingExtras(bookingId, extras) {
    const bookings = this._getFromStorage('boarding_bookings');
    const bookingIndex = bookings.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) {
      return { booking: null, extras: [], message: 'Booking not found' };
    }
    const booking = bookings[bookingIndex];

    const addOnsAll = this._getFromStorage('boarding_add_ons');
    let allExtras = this._getFromStorage('boarding_booking_extras');

    // Remove existing extras for this booking
    allExtras = allExtras.filter((e) => e.booking_id !== bookingId);

    const newExtras = [];
    const nights = booking.nights || this._daysBetweenIso(booking.check_in, booking.check_out);

    (extras || []).forEach((ex) => {
      const addOn = addOnsAll.find((a) => a.id === ex.addOnId);
      const quantity = ex.quantity || 0;
      if (!addOn || quantity <= 0) return;

      const unitPrice = addOn.price || 0;
      let totalPrice = unitPrice * quantity;
      if (addOn.price_type === 'per_night') {
        totalPrice = unitPrice * nights * quantity;
      } else if (addOn.price_type === 'per_cat') {
        totalPrice = unitPrice * booking.cat_count * quantity;
      } else if (addOn.price_type === 'per_stay' || addOn.price_type === 'flat') {
        totalPrice = unitPrice * quantity;
      }

      const extraRecord = {
        id: this._generateId('bbx'),
        booking_id: bookingId,
        add_on_id: addOn.id,
        add_on_name: addOn.name,
        category: addOn.category,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      };
      newExtras.push(extraRecord);
    });

    allExtras.push(...newExtras);
    this._saveToStorage('boarding_booking_extras', allExtras);

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || { base_nightly_rate: booking.base_nightly_rate };

    this._calculateBoardingPricing(booking, roomType, newExtras);
    booking.updated_at = this._nowIso();
    bookings[bookingIndex] = booking;
    this._saveToStorage('boarding_bookings', bookings);

    const extrasEnriched = newExtras.map((e) => ({
      ...e,
      addOn: addOnsAll.find((a) => a.id === e.add_on_id) || null
    }));

    return {
      booking: { ...booking, roomType },
      extras: extrasEnriched,
      message: 'Extras updated'
    };
  }

  // Get full summary for a boarding booking
  getBoardingBookingSummary(bookingId) {
    const bookings = this._getFromStorage('boarding_bookings');
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return {
        booking: null,
        extras: [],
        roomType: null,
        extrasBreakdown: []
      };
    }

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || null;

    const allExtras = this._getFromStorage('boarding_booking_extras');
    const addOnsAll = this._getFromStorage('boarding_add_ons');
    const extrasRaw = allExtras.filter((e) => e.booking_id === booking.id);
    const extras = extrasRaw.map((e) => ({
      ...e,
      addOn: addOnsAll.find((a) => a.id === e.add_on_id) || null
    }));

    this._calculateBoardingPricing(booking, roomType || { base_nightly_rate: booking.base_nightly_rate }, extrasRaw);

    const breakdownMap = {};
    extras.forEach((e) => {
      const cat = e.category || 'other';
      if (!breakdownMap[cat]) {
        breakdownMap[cat] = { category: cat, items: [], categoryTotal: 0 };
      }
      breakdownMap[cat].items.push(e);
      breakdownMap[cat].categoryTotal += e.total_price || 0;
    });

    const extrasBreakdown = Object.values(breakdownMap);

    // Instrumentation for task completion tracking (task_1, task_2, task_9)
    try {
      if (booking && booking.id) {
        localStorage.setItem('task1_summaryBookingId', booking.id);
        localStorage.setItem('task2_summaryBookingId', booking.id);
        localStorage.setItem('task9_summaryBookingId', booking.id);
      }
    } catch (e) {
      console.error('Instrumentation error (getBoardingBookingSummary):', e);
    }

    return {
      booking: { ...booking, roomType },
      extras,
      roomType,
      extrasBreakdown
    };
  }

  // Confirm a boarding booking (logical confirmation)
  confirmBoardingBooking(bookingId, contactFirstName, contactLastName, contactEmail, contactPhone, notes) {
    const bookings = this._getFromStorage('boarding_bookings');
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return { booking: null, message: 'Booking not found' };
    }
    const booking = bookings[index];

    if (contactFirstName !== undefined) booking.contact_first_name = contactFirstName;
    if (contactLastName !== undefined) booking.contact_last_name = contactLastName;
    if (contactEmail !== undefined) booking.contact_email = contactEmail;
    if (contactPhone !== undefined) booking.contact_phone = contactPhone;
    if (notes !== undefined) booking.notes = notes;

    booking.status = 'pending';
    booking.updated_at = this._nowIso();

    bookings[index] = booking;
    this._saveToStorage('boarding_bookings', bookings);

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || null;

    return {
      booking: { ...booking, roomType },
      message: 'Booking confirmed (pending)' 
    };
  }

  // Lookup an existing boarding booking by reference and last name
  lookupBoardingBookingByReference(bookingReference, lastName) {
    const bookings = this._getFromStorage('boarding_bookings');
    const ref = String(bookingReference || '').toUpperCase();
    const ln = String(lastName || '').toLowerCase();

    const booking = bookings.find((b) => {
      const refMatches = String(b.booking_reference || '').toUpperCase() === ref;
      const lastMatches = String(b.contact_last_name || '').toLowerCase() === ln;
      return refMatches && lastMatches;
    });

    // Instrumentation for task completion tracking (task_9)
    try {
      const lookupResultJson = JSON.stringify({
        bookingReference: ref,
        lastName: ln,
        found: !!booking,
        bookingId: booking ? booking.id : null
      });
      localStorage.setItem('task9_lookupResult', lookupResultJson);
    } catch (e) {
      console.error('Instrumentation error (lookupBoardingBookingByReference):', e);
    }

    if (!booking) {
      return { found: false, booking: null, message: 'Booking not found' };
    }

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || null;

    const allExtras = this._getFromStorage('boarding_booking_extras');
    const addOnsAll = this._getFromStorage('boarding_add_ons');
    const extrasRaw = allExtras.filter((e) => e.booking_id === booking.id);
    const extras = extrasRaw.map((e) => ({
      ...e,
      addOn: addOnsAll.find((a) => a.id === e.add_on_id) || null
    }));

    return {
      found: true,
      booking: {
        data: booking,
        roomType,
        extras
      },
      message: 'Booking found'
    };
  }

  // Enter modification mode for an existing booking
  startModifyBoardingBooking(bookingId) {
    const bookings = this._getFromStorage('boarding_bookings');
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return { booking: null, roomType: null, extras: [], message: 'Booking not found' };
    }

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || null;

    const allExtras = this._getFromStorage('boarding_booking_extras');
    const addOnsAll = this._getFromStorage('boarding_add_ons');
    const extrasRaw = allExtras.filter((e) => e.booking_id === booking.id);
    const extras = extrasRaw.map((e) => ({
      ...e,
      addOn: addOnsAll.find((a) => a.id === e.add_on_id) || null
    }));

    // Track as current booking in-flow
    localStorage.setItem('current_boarding_booking_id', booking.id);

    return {
      booking: { ...booking, roomType },
      roomType,
      extras,
      message: 'Modification started'
    };
  }

  // Update booking dates and recalculate pricing
  updateBoardingBookingDates(bookingId, newCheckInDate, newCheckOutDate) {
    const bookings = this._getFromStorage('boarding_bookings');
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return { booking: null, roomType: null, message: 'Booking not found' };
    }

    const booking = bookings[index];

    if (newCheckInDate) {
      booking.check_in = this._combineDateAndTime(newCheckInDate, '15:00');
    }
    if (newCheckOutDate) {
      booking.check_out = this._combineDateAndTime(newCheckOutDate, '11:00');
    }

    const roomTypes = this._getFromStorage('boarding_room_types');
    const roomType = roomTypes.find((r) => r.id === booking.room_type_id) || { base_nightly_rate: booking.base_nightly_rate };

    const allExtras = this._getFromStorage('boarding_booking_extras');
    const extrasRaw = allExtras.filter((e) => e.booking_id === booking.id);

    this._calculateBoardingPricing(booking, roomType, extrasRaw);
    booking.updated_at = this._nowIso();

    bookings[index] = booking;
    this._saveToStorage('boarding_bookings', bookings);

    return {
      booking: { ...booking, roomType },
      roomType,
      message: 'Booking dates updated'
    };
  }

  _mapAddOnCategoryLabel(category) {
    switch (category) {
      case 'playtime':
        return 'Playtime & Enrichment';
      case 'grooming':
        return 'Grooming';
      case 'treat':
        return 'Treats & Snacks';
      case 'late_checkout':
        return 'Late Checkout';
      default:
        return 'Other';
    }
  }

  /* =============================== Grooming APIs ============================ */

  // Get grooming & spa overview content
  getGroomingServicesOverview() {
    const content = this._getFromStorage('grooming_services_overview', null);
    const services = this._getFromStorage('grooming_services').filter((s) => s.is_active !== false);

    const packages = services.filter((s) => s.service_type === 'package');
    const extras = services.filter((s) => s.service_type === 'extra');

    const serviceGroups = [];
    if (packages.length) {
      serviceGroups.push({ groupTitle: 'Packages', services: packages });
    }
    if (extras.length) {
      serviceGroups.push({ groupTitle: 'Extras', services: extras });
    }

    return {
      introTitle: (content && content.introTitle) || '',
      introBody: (content && content.introBody) || '',
      serviceGroups
    };
  }

  // Get grooming scheduler options (time slots, etc.)
  getGroomingSchedulerOptions(date) {
    let targetDate = date;
    if (!targetDate) {
      const today = new Date();
      targetDate = this._formatYmd(today);
    }

    // Default, simple static slots; can be overridden via config if stored
    const config = this._getFromStorage('grooming_scheduler_config', null);
    const defaultSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

    const availableTimeSlots = (config && Array.isArray(config.availableTimeSlots))
      ? config.availableTimeSlots
      : defaultSlots;

    const maxCatsPerAppointment = (config && typeof config.maxCatsPerAppointment === 'number')
      ? config.maxCatsPerAppointment
      : 3;

    return {
      date: targetDate,
      availableTimeSlots,
      maxCatsPerAppointment
    };
  }

  // Create a draft grooming appointment
  createGroomingAppointmentDraft(appointmentDate, appointmentTime, catCount) {
    const appointment = {
      id: this._generateId('ga'),
      appointment_reference: this._generateGroomingReference(),
      status: 'pending',
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      appointment_datetime: this._combineDateAndTime(appointmentDate, appointmentTime),
      cat_count: catCount,
      main_service_id: null,
      main_service_name: '',
      main_service_price: 0,
      extras_total: 0,
      total_price: 0,
      currency: 'USD',
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      notes: null
    };

    const appointments = this._getFromStorage('grooming_appointments');
    appointments.push(appointment);
    this._saveToStorage('grooming_appointments', appointments);

    const services = this._getFromStorage('grooming_services').filter((s) => s.is_active !== false);
    const availablePackages = services.filter((s) => s.service_type === 'package');
    const availableExtras = services.filter((s) => s.service_type === 'extra');

    return {
      appointment,
      availablePackages,
      availableExtras
    };
  }

  // Select main package and extras for a grooming appointment
  selectGroomingServices(appointmentId, mainServiceId, extraServices) {
    const appointments = this._getFromStorage('grooming_appointments');
    const index = appointments.findIndex((a) => a.id === appointmentId);
    if (index === -1) {
      return { appointment: null, services: [], message: 'Appointment not found' };
    }
    const appointment = appointments[index];

    const servicesAll = this._getFromStorage('grooming_services').filter((s) => s.is_active !== false);
    const mainService = servicesAll.find((s) => s.id === mainServiceId && s.service_type === 'package');

    if (!mainService) {
      return { appointment: null, services: [], message: 'Main grooming package not found' };
    }

    // Remove existing appointment services
    let appointmentServices = this._getFromStorage('grooming_appointment_services');
    appointmentServices = appointmentServices.filter((s) => s.appointment_id !== appointmentId);

    const newServices = [];

    // Main package
    const mainServiceRecord = {
      id: this._generateId('gas'),
      appointment_id: appointmentId,
      service_id: mainService.id,
      service_name: mainService.name,
      service_type: mainService.service_type,
      unit_price: mainService.price || 0,
      quantity: 1,
      total_price: mainService.price || 0
    };
    newServices.push(mainServiceRecord);

    // Extras
    (extraServices || []).forEach((es) => {
      const svc = servicesAll.find((s) => s.id === es.serviceId && s.service_type === 'extra');
      const quantity = es.quantity || 0;
      if (!svc || quantity <= 0) return;
      const rec = {
        id: this._generateId('gas'),
        appointment_id: appointmentId,
        service_id: svc.id,
        service_name: svc.name,
        service_type: svc.service_type,
        unit_price: svc.price || 0,
        quantity,
        total_price: (svc.price || 0) * quantity
      };
      newServices.push(rec);
    });

    appointmentServices.push(...newServices);
    this._saveToStorage('grooming_appointment_services', appointmentServices);

    // Calculate totals
    const decoratedExtrasForCalc = (extraServices || []).map((es) => {
      const svc = servicesAll.find((s) => s.id === es.serviceId && s.service_type === 'extra');
      if (!svc) return null;
      return { ...svc, _quantity: es.quantity || 0 };
    }).filter(Boolean);

    const totals = this._calculateGroomingTotal(mainService, decoratedExtrasForCalc, appointment.cat_count);

    appointment.main_service_id = mainService.id;
    appointment.main_service_name = mainService.name;
    appointment.main_service_price = mainService.price || 0;
    appointment.extras_total = totals.extrasTotal;
    appointment.total_price = totals.total;
    appointment.updated_at = this._nowIso();

    appointments[index] = appointment;
    this._saveToStorage('grooming_appointments', appointments);

    const servicesEnriched = newServices.map((s) => ({
      ...s,
      service: servicesAll.find((svc) => svc.id === s.service_id) || null
    }));

    return {
      appointment,
      services: servicesEnriched,
      message: 'Grooming services selected'
    };
  }

  // Get summary for a grooming appointment
  getGroomingAppointmentSummary(appointmentId) {
    const appointments = this._getFromStorage('grooming_appointments');
    const appointment = appointments.find((a) => a.id === appointmentId) || null;
    if (!appointment) {
      return { appointment: null, services: [] };
    }

    const appointmentServices = this._getFromStorage('grooming_appointment_services').filter(
      (s) => s.appointment_id === appointmentId
    );
    const servicesAll = this._getFromStorage('grooming_services');

    const services = appointmentServices.map((s) => ({
      ...s,
      service: servicesAll.find((svc) => svc.id === s.service_id) || null
    }));

    return {
      appointment,
      services
    };
  }

  // Confirm a grooming-only appointment
  confirmGroomingAppointment(appointmentId, contactName, contactEmail, contactPhone, notes) {
    const appointments = this._getFromStorage('grooming_appointments');
    const index = appointments.findIndex((a) => a.id === appointmentId);
    if (index === -1) {
      return { appointment: null, message: 'Appointment not found' };
    }
    const appointment = appointments[index];

    if (contactName !== undefined) appointment.contact_name = contactName;
    if (contactEmail !== undefined) appointment.contact_email = contactEmail;
    if (contactPhone !== undefined) appointment.contact_phone = contactPhone;
    if (notes !== undefined) appointment.notes = notes;

    appointment.status = 'confirmed';
    appointment.updated_at = this._nowIso();

    appointments[index] = appointment;
    this._saveToStorage('grooming_appointments', appointments);

    return {
      appointment,
      message: 'Grooming appointment confirmed'
    };
  }

  /* ============================== Gift Card APIs ============================ */

  // Get available gift card products and configuration options
  getGiftCardProductsOverview() {
    const content = this._getFromStorage('gift_card_products_overview', null);
    const products = this._getFromStorage('gift_card_products').filter((p) => p.is_active !== false);

    return {
      introTitle: (content && content.introTitle) || '',
      introBody: (content && content.introBody) || '',
      products
    };
  }

  // Configure a specific gift card
  configureGiftCard(productId, amount, deliveryMethod, recipientName, recipientEmail, message, sendOnDate) {
    const products = this._getFromStorage('gift_card_products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { giftCard: null, message: 'Gift card product not found' };
    }

    const giftCard = {
      id: this._generateId('gc'),
      product_id: product.id,
      category: product.category,
      amount,
      delivery_method: deliveryMethod,
      recipient_name: recipientName,
      recipient_email: recipientEmail || null,
      message: message || null,
      send_on_date: sendOnDate ? this._combineDateAndTime(sendOnDate, '09:00') : null
    };

    const giftCards = this._getFromStorage('gift_cards_configured');
    giftCards.push(giftCard);
    this._saveToStorage('gift_cards_configured', giftCards);

    return {
      giftCard: { ...giftCard, product },
      message: 'Gift card configured'
    };
  }

  // Add a configured gift card to the cart
  addGiftCardToCart(giftCardId, quantity = 1) {
    const giftCards = this._getFromStorage('gift_cards_configured');
    const giftCard = giftCards.find((g) => g.id === giftCardId) || null;
    if (!giftCard) {
      return { cart: null, items: [], message: 'Gift card not found' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unitPrice = giftCard.amount || 0;
    const totalPrice = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('ci'),
      cart_id: cart.id,
      item_type: 'gift_card',
      reference_id: giftCard.id,
      description: `Gift Card - ${giftCard.category || 'general'}`,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._updateCartTotals(cart.id) || cart;

    return {
      cart: updatedCart,
      items: cartItems.filter((i) => i.cart_id === updatedCart.id),
      message: 'Gift card added to cart'
    };
  }

  // Get current cart contents and totals
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cart_id === cart.id);

    const giftCards = this._getFromStorage('gift_cards_configured');
    const giftCardProducts = this._getFromStorage('gift_card_products');
    const bookings = this._getFromStorage('boarding_bookings');
    const roomTypes = this._getFromStorage('boarding_room_types');
    const appointments = this._getFromStorage('grooming_appointments');

    const items = cartItems.map((item) => {
      let giftCard = null;
      let boardingBooking = null;
      let groomingAppointment = null;

      if (item.item_type === 'gift_card') {
        const gc = giftCards.find((g) => g.id === item.reference_id) || null;
        const product = gc ? giftCardProducts.find((p) => p.id === gc.product_id) || null : null;
        giftCard = gc ? { data: gc, product } : null;
      } else if (item.item_type === 'boarding_booking') {
        const booking = bookings.find((b) => b.id === item.reference_id) || null;
        const roomType = booking ? roomTypes.find((r) => r.id === booking.room_type_id) || null : null;
        boardingBooking = booking ? { data: booking, roomType } : null;
      } else if (item.item_type === 'grooming_appointment') {
        const appointment = appointments.find((a) => a.id === item.reference_id) || null;
        groomingAppointment = appointment ? { data: appointment } : null;
      }

      return {
        item,
        giftCard,
        boardingBooking,
        groomingAppointment
      };
    });

    return {
      cart,
      items
    };
  }

  // Update quantity of a cart item
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((i) => i.id === cartItemId);
    if (index === -1) {
      const cart = this._getOrCreateCart();
      return {
        cart,
        items: cartItems.filter((i) => i.cart_id === cart.id),
        message: 'Cart item not found'
      };
    }

    const item = cartItems[index];

    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      item.quantity = quantity;
      item.total_price = (item.unit_price || 0) * quantity;
      cartItems[index] = item;
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._updateCartTotals(item.cart_id);

    return {
      cart: updatedCart,
      items: cartItems.filter((i) => i.cart_id === updatedCart.id),
      message: 'Cart updated'
    };
  }

  // Remove a cart item
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((i) => i.id === cartItemId);
    if (index === -1) {
      const cart = this._getOrCreateCart();
      return {
        cart,
        items: cartItems.filter((i) => i.cart_id === cart.id),
        message: 'Cart item not found'
      };
    }

    const item = cartItems[index];
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._updateCartTotals(item.cart_id);

    return {
      cart: updatedCart,
      items: cartItems.filter((i) => i.cart_id === updatedCart.id),
      message: 'Item removed from cart'
    };
  }

  // Create a checkout order from the current cart
  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cart_id === cart.id);

    let orders = this._getFromStorage('checkout_orders');
    let order = orders.find((o) => o.cart_id === cart.id && o.status === 'draft');
    const now = this._nowIso();

    if (!order) {
      order = {
        id: this._generateId('ord'),
        order_number: null,
        status: 'draft',
        created_at: now,
        updated_at: now,
        cart_id: cart.id,
        items_snapshot: cartItems,
        subtotal: cart.subtotal || 0,
        total: cart.total || 0,
        currency: cart.currency || 'USD',
        purchaser_name: null,
        purchaser_email: null,
        notes: null
      };
      orders.push(order);
    } else {
      // refresh snapshot
      order.items_snapshot = cartItems;
      order.subtotal = cart.subtotal || 0;
      order.total = cart.total || 0;
      order.updated_at = now;
    }

    this._saveToStorage('checkout_orders', orders);

    return {
      order,
      cart,
      items: cartItems
    };
  }

  // Update purchaser contact details on a checkout order
  updateCheckoutContactDetails(orderId, purchaserName, purchaserEmail, notes) {
    const orders = this._getFromStorage('checkout_orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return { order: null, message: 'Order not found' };
    }
    const order = orders[index];

    if (purchaserName !== undefined) order.purchaser_name = purchaserName;
    if (purchaserEmail !== undefined) order.purchaser_email = purchaserEmail;
    if (notes !== undefined) order.notes = notes;

    order.updated_at = this._nowIso();
    orders[index] = order;
    this._saveToStorage('checkout_orders', orders);

    return {
      order,
      message: 'Checkout contact details updated'
    };
  }

  // Confirm a checkout order (logical finalization)
  confirmCheckoutOrder(orderId) {
    const orders = this._getFromStorage('checkout_orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return { order: null, message: 'Order not found' };
    }
    const order = orders[index];

    order.status = 'confirmed';
    order.updated_at = this._nowIso();
    if (!order.order_number) {
      order.order_number = 'ORD' + Math.floor(100000 + Math.random() * 900000);
    }

    orders[index] = order;
    this._saveToStorage('checkout_orders', orders);

    return {
      order,
      message: 'Order confirmed'
    };
  }

  /* =============================== Contact & Tours ========================== */

  // Get Contact & Tours page configuration
  getContactPageConfig() {
    const config = this._getFromStorage('contact_page_config', null);

    const defaultSubjectOptions = [
      { value: 'health_vaccination_requirements', label: 'Health & Vaccination Requirements' },
      { value: 'booking_question', label: 'Boarding & Booking Questions' },
      { value: 'grooming', label: 'Grooming & Spa' },
      { value: 'gift_cards', label: 'Gift Cards & Vouchers' },
      { value: 'general', label: 'General Inquiry' }
    ];

    return {
      introTitle: (config && config.introTitle) || '',
      introBody: (config && config.introBody) || '',
      subjectOptions: (config && Array.isArray(config.subjectOptions)) ? config.subjectOptions : defaultSubjectOptions,
      contactEmail: (config && config.contactEmail) || '',
      contactPhone: (config && config.contactPhone) || '',
      address: (config && config.address) || '',
      mapEmbedHtml: (config && config.mapEmbedHtml) || ''
    };
  }

  // Submit a general contact message
  submitContactMessage(name, email, subjectType, subjectText, message, policySectionId) {
    const allowedTypes = [
      'health_vaccination_requirements',
      'booking_question',
      'grooming',
      'gift_cards',
      'general',
      'other'
    ];
    const finalSubjectType = allowedTypes.includes(subjectType) ? subjectType : 'other';

    const policySections = this._getFromStorage('policy_sections');
    const hasPolicySection = policySectionId && policySections.some((p) => p.id === policySectionId);

    const contactMessage = {
      id: this._generateId('cm'),
      created_at: this._nowIso(),
      name,
      email,
      subject_type: finalSubjectType,
      subject_text: subjectText || null,
      message,
      policy_section_id: hasPolicySection ? policySectionId : null,
      status: 'new'
    };

    const messages = this._getFromStorage('contact_messages');
    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      contactMessage,
      confirmationText: 'Thank you for getting in touch. We will respond as soon as possible.'
    };
  }

  // Submit a facility tour request
  submitTourRequest(preferredDate, preferredTime, name, email, phone, reasonForVisitType, reasonForVisitText, notes) {
    const allowedTypes = ['boarding_for_cats', 'grooming_only', 'general_tour', 'other'];
    const finalType = allowedTypes.includes(reasonForVisitType) ? reasonForVisitType : 'other';

    const tourRequest = {
      id: this._generateId('tr'),
      created_at: this._nowIso(),
      preferred_datetime: this._combineDateAndTime(preferredDate, preferredTime),
      name,
      email,
      phone: phone || null,
      reason_for_visit_type: finalType,
      reason_for_visit_text: reasonForVisitText || null,
      notes: notes || null,
      status: 'pending'
    };

    const tourRequests = this._getFromStorage('tour_requests');
    tourRequests.push(tourRequest);
    this._saveToStorage('tour_requests', tourRequests);

    return {
      tourRequest,
      confirmationText: 'Your tour request has been submitted. We will confirm your visit time by email.'
    };
  }

  /* =============================== Policies / FAQ =========================== */

  // Get policy sections, optionally filtered by section types
  getPolicySections(sectionTypes) {
    const sectionsAll = this._getFromStorage('policy_sections');
    let sections = sectionsAll;

    if (Array.isArray(sectionTypes) && sectionTypes.length) {
      const set = new Set(sectionTypes);
      sections = sectionsAll.filter((s) => set.has(s.section_type));
    }

    // Sort by display_order if present
    sections.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 0;
      const bo = typeof b.display_order === 'number' ? b.display_order : 0;
      return ao - bo;
    });

    return { sections };
  }

  // Get detailed health and vaccination policy content
  getHealthPolicyDetail() {
    const sections = this._getFromStorage('policy_sections');

    let healthRequirementsSection = sections.find((s) => s.section_type === 'health_requirements') || null;
    let vaccinationPolicySection = sections.find((s) => s.section_type === 'vaccination_policy') || null;
    let longStayPolicySection = sections.find((s) => s.section_type === 'long_stay_policy') || null;

    // Fallback: if no dedicated health-related sections exist, try to map
    // an existing policy (e.g., grooming or boarding policies) as health info
    if (!healthRequirementsSection && !vaccinationPolicySection && !longStayPolicySection) {
      const fallback = sections.find((s) => {
        const text = (s.title || '') + ' ' + (s.content_html || '');
        return /health|vaccin|grooming/i.test(text);
      }) || sections[0] || null;

      healthRequirementsSection = fallback;
    }

    return {
      healthRequirementsSection,
      vaccinationPolicySection,
      longStayPolicySection
    };
  }

  /* =============================== About / Facility ========================= */

  // Get About page content
  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', null);

    return {
      headline: (content && content.headline) || '',
      storyHtml: (content && content.storyHtml) || '',
      missionHtml: (content && content.missionHtml) || '',
      staffHighlightsHtml: (content && content.staffHighlightsHtml) || '',
      facilityFeaturesHtml: (content && content.facilityFeaturesHtml) || '',
      allergyInfoHtml: (content && content.allergyInfoHtml) || ''
    };
  }

  /* ================================ Pet Profiles ============================ */

  // Get existing pet profiles (active)
  getPetProfiles() {
    const profilesAll = this._getFromStorage('pet_profiles');
    const profiles = profilesAll.filter((p) => p.is_active !== false);
    return { profiles };
  }

  // Create a new cat profile
  createPetProfile(name, ageYears, ageDescription, lifestyle, dietNotes) {
    const allowedLifestyles = ['indoor_only', 'outdoor_only', 'indoor_and_outdoor'];
    const finalLifestyle = allowedLifestyles.includes(lifestyle) ? lifestyle : 'indoor_only';

    const profile = {
      id: this._generateId('pet'),
      name,
      age_years: typeof ageYears === 'number' ? ageYears : null,
      age_description: ageDescription || null,
      lifestyle: finalLifestyle,
      diet_notes: dietNotes || null,
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      is_active: true
    };

    const profiles = this._getFromStorage('pet_profiles');
    profiles.push(profile);
    this._saveToStorage('pet_profiles', profiles);

    return {
      profile,
      message: 'Pet profile created'
    };
  }

  // Update an existing pet profile
  updatePetProfile(profileId, name, ageYears, ageDescription, lifestyle, dietNotes, isActive) {
    const profiles = this._getFromStorage('pet_profiles');
    const index = profiles.findIndex((p) => p.id === profileId);
    if (index === -1) {
      return { profile: null, message: 'Profile not found' };
    }

    const profile = profiles[index];

    if (name !== undefined) profile.name = name;
    if (ageYears !== undefined) profile.age_years = ageYears;
    if (ageDescription !== undefined) profile.age_description = ageDescription;

    if (lifestyle !== undefined) {
      const allowedLifestyles = ['indoor_only', 'outdoor_only', 'indoor_and_outdoor'];
      if (allowedLifestyles.includes(lifestyle)) {
        profile.lifestyle = lifestyle;
      }
    }

    if (dietNotes !== undefined) profile.diet_notes = dietNotes;
    if (isActive !== undefined) profile.is_active = !!isActive;

    profile.updated_at = this._nowIso();

    profiles[index] = profile;
    this._saveToStorage('pet_profiles', profiles);

    return {
      profile,
      message: 'Pet profile updated'
    };
  }

  // Delete or deactivate a pet profile
  deletePetProfile(profileId) {
    const profiles = this._getFromStorage('pet_profiles');
    const index = profiles.findIndex((p) => p.id === profileId);
    if (index === -1) {
      return { success: false, message: 'Profile not found' };
    }

    // Soft delete: mark inactive
    profiles[index].is_active = false;
    profiles[index].updated_at = this._nowIso();
    this._saveToStorage('pet_profiles', profiles);

    return {
      success: true,
      message: 'Pet profile deactivated'
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