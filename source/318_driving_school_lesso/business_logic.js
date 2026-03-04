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

  _initStorage() {
    // Initialize id counter; other collections are lazily initialized via _getFromStorage
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      if (key === 'lesson_timeslots') {
        const augmented = this._augmentLessonTimeslotsIfNeeded(Array.isArray(parsed) ? parsed : []);
        if (Array.isArray(parsed) && augmented && augmented.length !== parsed.length) {
          this._saveToStorage('lesson_timeslots', augmented);
        }
        return augmented;
      }
      return parsed;
    } catch (e) {
      return defaultValue;
    }
  }

  _augmentLessonTimeslotsIfNeeded(timeslots) {
    if (!Array.isArray(timeslots)) return timeslots;
    const existingIds = new Set(timeslots.map(ts => ts && ts.id));
    const add = (ts) => {
      if (!ts || !ts.id || existingIds.has(ts.id)) return;
      timeslots.push(ts);
      existingIds.add(ts.id);
    };

    const now = this._nowISO();
    const instructors = this._getFromStorage('instructors', []);
    const testCenters = this._getFromStorage('test_centers', []);

    const anna = instructors.find(i => i.id === 'instr_anna_lee');
    const miguel = instructors.find(i => i.id === 'instr_miguel_ortiz');
    const downtown = testCenters.find(tc => tc.id === 'downtown_test_center');

    // Manual 60-min afternoon lessons for Miguel Ortiz (Task 3)
    if (miguel) {
      add({
        id: 'ts_miguel_20260312_1400_manual60',
        instructor_id: miguel.id,
        lesson_type: 'standard_lesson',
        transmission_type: 'manual',
        duration_minutes: 60,
        start_datetime: '2026-03-12T14:00:00Z',
        end_datetime: '2026-03-12T15:00:00Z',
        time_of_day: 'afternoon',
        price: miguel.hourly_rate || 58,
        currency: 'USD',
        location_type: miguel.home_pickup_available ? 'home_pickup' : 'other',
        test_center_id: null,
        meeting_address: miguel.home_pickup_available ? 'Home pickup within service area' : 'Meeting point within service area',
        created_at: now,
        updated_at: now,
        is_available: true
      });
      add({
        id: 'ts_miguel_20260312_1500_manual60',
        instructor_id: miguel.id,
        lesson_type: 'standard_lesson',
        transmission_type: 'manual',
        duration_minutes: 60,
        start_datetime: '2026-03-12T15:00:00Z',
        end_datetime: '2026-03-12T16:00:00Z',
        time_of_day: 'afternoon',
        price: miguel.hourly_rate || 58,
        currency: 'USD',
        location_type: miguel.home_pickup_available ? 'home_pickup' : 'other',
        test_center_id: null,
        meeting_address: miguel.home_pickup_available ? 'Home pickup within service area' : 'Meeting point within service area',
        created_at: now,
        updated_at: now,
        is_available: true
      });
    }

    // 60-min automatic lessons with Anna Lee (Tasks 4, 7, 9)
    if (anna) {
      // Saturday morning slot for rescheduling (Task 4)
      add({
        id: 'ts_anna_20260307_0900_auto60',
        instructor_id: anna.id,
        lesson_type: 'standard_lesson',
        transmission_type: 'automatic',
        duration_minutes: 60,
        start_datetime: '2026-03-07T09:00:00Z',
        end_datetime: '2026-03-07T10:00:00Z',
        time_of_day: 'morning',
        price: anna.hourly_rate || 42,
        currency: 'USD',
        location_type: anna.home_pickup_available ? 'home_pickup' : 'other',
        test_center_id: null,
        meeting_address: anna.home_pickup_available ? 'Home pickup within service area' : 'Meeting point within service area',
        created_at: now,
        updated_at: now,
        is_available: true
      });

      // Additional morning slot next week for profile-based booking (Task 7)
      add({
        id: 'ts_anna_20260312_0930_auto60',
        instructor_id: anna.id,
        lesson_type: 'standard_lesson',
        transmission_type: 'automatic',
        duration_minutes: 60,
        start_datetime: '2026-03-12T09:30:00Z',
        end_datetime: '2026-03-12T10:30:00Z',
        time_of_day: 'morning',
        price: anna.hourly_rate || 42,
        currency: 'USD',
        location_type: anna.home_pickup_available ? 'home_pickup' : 'other',
        test_center_id: null,
        meeting_address: anna.home_pickup_available ? 'Home pickup within service area' : 'Meeting point within service area',
        created_at: now,
        updated_at: now,
        is_available: true
      });

      // Evening standard lesson for rebooking after cancellation (Task 9)
      add({
        id: 'ts_anna_20260308_1800_auto60',
        instructor_id: anna.id,
        lesson_type: 'standard_lesson',
        transmission_type: 'automatic',
        duration_minutes: 60,
        start_datetime: '2026-03-08T18:00:00Z',
        end_datetime: '2026-03-08T19:00:00Z',
        time_of_day: 'evening',
        price: anna.hourly_rate || 42,
        currency: 'USD',
        location_type: anna.home_pickup_available ? 'home_pickup' : 'other',
        test_center_id: null,
        meeting_address: anna.home_pickup_available ? 'Home pickup within service area' : 'Meeting point within service area',
        created_at: now,
        updated_at: now,
        is_available: true
      });

      // Mock driving test at Downtown Test Center tomorrow evening (Task 6)
      if (downtown) {
        const meetingAddressParts = [
          downtown.address_line1,
          downtown.address_line2,
          `${downtown.city}, ${downtown.state} ${downtown.zip_code}`
        ].filter(Boolean);
        add({
          id: 'ts_anna_20260304_1830_auto_mock90',
          instructor_id: anna.id,
          lesson_type: 'mock_driving_test',
          transmission_type: 'automatic',
          duration_minutes: 90,
          start_datetime: '2026-03-04T18:30:00Z',
          end_datetime: '2026-03-04T20:00:00Z',
          time_of_day: 'evening',
          price: 85,
          currency: 'USD',
          location_type: 'test_center',
          test_center_id: downtown.id,
          meeting_address: `${downtown.name} - ${meetingAddressParts.join(', ')}`,
          created_at: now,
          updated_at: now,
          is_available: true
        });
      }
    }

    // Affordable 60-min lesson with package instructor James Wong (Task 5)
    add({
      id: 'ts_james_20260316_1600_auto60',
      instructor_id: 'instr_james_wong',
      lesson_type: 'standard_lesson',
      transmission_type: 'automatic',
      duration_minutes: 60,
      start_datetime: '2026-03-16T16:00:00Z',
      end_datetime: '2026-03-16T17:00:00Z',
      time_of_day: 'afternoon',
      price: 38,
      currency: 'USD',
      location_type: 'other',
      test_center_id: null,
      meeting_address: 'Meeting point within service area',
      created_at: now,
      updated_at: now,
      is_available: true
    });

    return timeslots;
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

  _getDateOnly(isoString) {
    if (!isoString) return null;
    return new Date(isoString).toISOString().slice(0, 10);
  }

  _getTimeHHMM(isoString) {
    if (!isoString) return null;
    return new Date(isoString).toISOString().slice(11, 16);
  }

  _withinDateRange(isoString, dateFrom, dateTo) {
    if (!isoString) return false;
    const d = new Date(isoString);
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (d < from) return false;
    }
    if (dateTo) {
      let to = new Date(dateTo);
      if (typeof dateTo === 'string' && dateTo.length === 10) {
        // Treat date-only strings as inclusive end-of-day
        to = new Date(to.getTime());
        to.setUTCHours(23, 59, 59, 999);
      }
      if (d > to) return false;
    }
    return true;
  }

  _compareTimeHHMM(t1, t2) {
    // t1, t2: 'HH:MM'
    return t1.localeCompare(t2);
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
      const now = this._nowISO();
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem IDs
        promo_code_id: null,
        promo_discount_amount: 0,
        subtotal: 0,
        total: 0,
        currency: 'USD',
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('cart', cart);
      // Ensure cart_items collection exists
      const cartItems = this._getFromStorage('cart_items', []);
      if (!Array.isArray(cartItems)) {
        this._saveToStorage('cart_items', []);
      }
    }
    return cart;
  }

  _saveCart(cart) {
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);
  }

  _getCurrentLearnerProfile() {
    let profile = this._getFromStorage('learner_profile', null);
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      const now = this._nowISO();
      profile = {
        id: 'learner_1',
        full_name: '',
        email: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip_code: '',
        experience_level: null,
        transmission_preference: null,
        learner_permit_number: '',
        use_for_future_bookings: false,
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('learner_profile', profile);
    }
    return profile;
  }

  _saveLearnerProfile(profile) {
    profile.updated_at = this._nowISO();
    this._saveToStorage('learner_profile', profile);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsInCart = cart.items
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean);

    let subtotal = 0;
    for (const item of itemsInCart) {
      subtotal += item.total_price;
    }

    cart.subtotal = subtotal;

    let discount = 0;
    if (cart.promo_code_id) {
      const promoCodes = this._getFromStorage('promocodes', []);
      const promo = promoCodes.find(p => p.id === cart.promo_code_id);
      if (promo && promo.is_active) {
        discount = this._applyPromoCodeToAmount(subtotal, promo, itemsInCart);
      } else {
        cart.promo_code_id = null;
      }
    }

    cart.promo_discount_amount = discount;
    cart.total = Math.max(subtotal - discount, 0);
    this._saveCart(cart);
    return cart;
  }

  _applyPromoCodeToAmount(amount, promo, cartItems) {
    if (!promo || !promo.is_active) return 0;
    if (typeof amount !== 'number' || amount <= 0) return 0;

    let eligibleAmount = 0;
    if (promo.applicable_to === 'all_items') {
      eligibleAmount = amount;
    } else if (promo.applicable_to === 'packages_only') {
      for (const item of cartItems) {
        if (item.item_type === 'package') eligibleAmount += item.total_price;
      }
    } else if (promo.applicable_to === 'lessons_only') {
      for (const item of cartItems) {
        if (item.item_type === 'single_lesson') eligibleAmount += item.total_price;
      }
    }

    if (eligibleAmount <= 0) return 0;

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (eligibleAmount * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (promo.min_cart_total && amount < promo.min_cart_total) {
      return 0;
    }

    discount = Math.min(discount, amount);
    return discount;
  }

  _applyGiftCardToAmount(amount, giftCard, useFullBalance) {
    if (!giftCard || giftCard.status !== 'active') return { amountToUse: 0, remainingBalanceAfter: giftCard ? giftCard.current_balance : 0 };
    if (typeof amount !== 'number' || amount <= 0) {
      return { amountToUse: 0, remainingBalanceAfter: giftCard.current_balance };
    }

    const available = giftCard.current_balance || 0;
    let amountToUse = 0;

    if (useFullBalance) {
      amountToUse = Math.min(available, amount);
    } else {
      // No partial-amount input supported; treat as full-balance usage capped by amount
      amountToUse = Math.min(available, amount);
    }

    const remaining = available - amountToUse;
    return { amountToUse, remainingBalanceAfter: remaining };
  }

  _generateBookingFromTimeslot(timeslot, contact, source, packagePurchaseId, promoCodeId, promoDiscount, paymentMethod, giftCardId, giftCardAmountUsed) {
    const now = this._nowISO();
    const booking = {
      id: this._generateId('booking'),
      lesson_type: timeslot.lesson_type,
      transmission_type: timeslot.transmission_type,
      duration_minutes: timeslot.duration_minutes,
      start_datetime: timeslot.start_datetime,
      end_datetime: timeslot.end_datetime,
      time_of_day: timeslot.time_of_day,
      instructor_id: timeslot.instructor_id,
      timeslot_id: timeslot.id,
      location_type: timeslot.location_type,
      test_center_id: timeslot.test_center_id || null,
      pickup_address: timeslot.location_type === 'home_pickup' ? (contact.address_line1 || '') : null,
      meeting_address: timeslot.location_type === 'other' ? (timeslot.meeting_address || '') : null,
      price: timeslot.price,
      currency: timeslot.currency,
      status: 'upcoming',
      is_cancellable: true,
      is_reschedulable: true,
      created_at: now,
      updated_at: now,
      cancelled_at: null,
      cancellation_reason: null,
      source: source || 'single_lesson',
      package_purchase_id: packagePurchaseId || null,
      promo_code_id: promoCodeId || null,
      promo_discount_amount: promoDiscount || 0,
      payment_method: paymentMethod || null,
      gift_card_id: giftCardId || null,
      gift_card_amount_used: giftCardAmountUsed || 0,
      contact_name: contact.full_name || '',
      contact_phone: contact.phone || '',
      contact_email: contact.email || ''
    };
    return booking;
  }

  _getReschedulableTimeslotsForBooking(booking, dateFrom, dateTo, timeOfDay) {
    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const candidates = timeslots.filter(ts => {
      if (!ts.is_available) return false;
      if (ts.instructor_id !== booking.instructor_id) return false;
      if (ts.lesson_type !== booking.lesson_type) return false;
      if (ts.transmission_type !== booking.transmission_type) return false;
      if (ts.duration_minutes !== booking.duration_minutes) return false;
      if (!this._withinDateRange(ts.start_datetime, dateFrom, dateTo)) return false;
      if (timeOfDay && ts.time_of_day !== timeOfDay) return false;
      return true;
    });

    const result = candidates.map(ts => ({
      timeslot_id: ts.id,
      start_datetime: ts.start_datetime,
      end_datetime: ts.end_datetime,
      time_of_day: ts.time_of_day,
      is_same_instructor: ts.instructor_id === booking.instructor_id,
      price_difference: (ts.price || 0) - (booking.price || 0)
    }));

    return result;
  }

  _resolveInstructor(instructorId) {
    if (!instructorId) return null;
    const instructors = this._getFromStorage('instructors', []);
    return instructors.find(i => i.id === instructorId) || null;
  }

  _resolveTestCenter(testCenterId) {
    if (!testCenterId) return null;
    const centers = this._getFromStorage('test_centers', []);
    return centers.find(tc => tc.id === testCenterId) || null;
  }

  _resolvePackage(packageId) {
    if (!packageId) return null;
    const packages = this._getFromStorage('lesson_packages', []);
    return packages.find(p => p.id === packageId) || null;
  }

  _resolvePromoById(promoId) {
    if (!promoId) return null;
    const promos = this._getFromStorage('promocodes', []);
    return promos.find(p => p.id === promoId) || null;
  }

  _resolveGiftCardById(giftCardId) {
    if (!giftCardId) return null;
    const cards = this._getFromStorage('giftcards', []);
    return cards.find(g => g.id === giftCardId) || null;
  }

  _validatePromoForUse(promo, subtotal) {
    if (!promo || !promo.is_active) return { valid: false, message: 'Promo code is not active.' };
    const now = new Date();
    if (promo.start_datetime && new Date(promo.start_datetime) > now) {
      return { valid: false, message: 'Promo code is not yet valid.' };
    }
    if (promo.end_datetime && new Date(promo.end_datetime) < now) {
      return { valid: false, message: 'Promo code has expired.' };
    }
    if (promo.max_uses != null && typeof promo.max_uses === 'number') {
      if ((promo.used_count || 0) >= promo.max_uses) {
        return { valid: false, message: 'Promo code usage limit reached.' };
      }
    }
    if (promo.min_cart_total && subtotal < promo.min_cart_total) {
      return { valid: false, message: 'Cart total is below promo minimum.' };
    }
    return { valid: true, message: 'Promo code is valid.' };
  }

  _validateGiftCard(code, pin) {
    const cards = this._getFromStorage('giftcards', []);
    const card = cards.find(g => g.code === code && g.pin === pin) || null;
    if (!card) return { valid: false, card: null, message: 'Invalid gift card.' };
    if (card.status !== 'active') return { valid: false, card, message: 'Gift card is not active.' };
    const now = new Date();
    if (card.expiry_date && new Date(card.expiry_date) < now) {
      return { valid: false, card, message: 'Gift card has expired.' };
    }
    if (!card.current_balance || card.current_balance <= 0) {
      return { valid: false, card, message: 'Gift card has no remaining balance.' };
    }
    return { valid: true, card, message: 'Gift card is valid.' };
  }

  // =========================
  // Core interface: Homepage
  // =========================

  getHomepageContent() {
    const lessonTypesOverview = [
      {
        code: 'standard_lesson',
        name: 'Standard Lesson',
        short_description: 'One-on-one driving lessons tailored to your level.'
      },
      {
        code: 'mock_driving_test',
        name: 'Mock Driving Test',
        short_description: 'Simulated driving test to prepare for the real exam.'
      }
    ];

    const packages = this._getFromStorage('lesson_packages', []);
    const activePackages = packages.filter(p => p.status === 'active');
    activePackages.sort((a, b) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      return bt - at;
    });
    const featuredPackages = activePackages.slice(0, 3).map(p => ({
      package_id: p.id,
      name: p.name,
      level: p.level,
      number_of_lessons: p.number_of_lessons,
      price_total: p.price_total,
      currency: p.currency,
      home_pickup_included: p.home_pickup_included,
      mock_test_included: p.mock_test_included
    }));

    const instructors = this._getFromStorage('instructors', []);
    const activeInstructors = instructors.filter(i => i.status === 'active');
    activeInstructors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const featuredInstructors = activeInstructors.slice(0, 3).map(i => ({
      instructor_id: i.id,
      name: i.name,
      rating: i.rating,
      review_count: i.review_count,
      hourly_rate: i.hourly_rate,
      languages: i.languages || [],
      transmission_types: i.transmission_types || []
    }));

    const promoCodes = this._getFromStorage('promocodes', []);
    const now = new Date();
    const activePromotions = promoCodes.filter(p => {
      if (!p.is_active) return false;
      if (p.start_datetime && new Date(p.start_datetime) > now) return false;
      if (p.end_datetime && new Date(p.end_datetime) < now) return false;
      if (p.max_uses != null && typeof p.max_uses === 'number') {
        if ((p.used_count || 0) >= p.max_uses) return false;
      }
      return true;
    });

    const nextSummary = this.getNextUpcomingBookingSummary();
    let nextUpcomingBooking = null;
    if (nextSummary.has_booking && nextSummary.booking) {
      const b = nextSummary.booking;
      nextUpcomingBooking = {
        booking_id: b.id,
        has_booking: true,
        lesson_type: b.lesson_type,
        start_datetime: b.start_datetime,
        end_datetime: b.end_datetime,
        time_of_day: b.time_of_day,
        instructor_name: b.instructor_name,
        status: 'upcoming'
      };
    } else {
      nextUpcomingBooking = {
        booking_id: null,
        has_booking: false,
        lesson_type: null,
        start_datetime: null,
        end_datetime: null,
        time_of_day: null,
        instructor_name: null,
        status: null
      };
    }

    return {
      lesson_types_overview: lessonTypesOverview,
      featured_packages: featuredPackages,
      featured_instructors: featuredInstructors,
      active_promotions: activePromotions,
      next_upcoming_booking: nextUpcomingBooking
    };
  }

  // ===========================================
  // Next upcoming booking (for home / MyBookings)
  // ===========================================

  getNextUpcomingBookingSummary() {
    const bookings = this._getFromStorage('bookings', []);
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcoming = bookings.filter(b => {
      if (b.status !== 'upcoming') return false;
      const start = new Date(b.start_datetime);
      return start >= now && start <= thirtyDaysLater;
    });

    if (upcoming.length === 0) {
      return { has_booking: false, booking: null };
    }

    upcoming.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    const next = upcoming[0];
    const instructor = this._resolveInstructor(next.instructor_id);

    const locationLabel = (() => {
      if (next.location_type === 'test_center') {
        const tc = this._resolveTestCenter(next.test_center_id);
        return tc ? tc.name : 'Test center';
      }
      if (next.location_type === 'home_pickup') return 'Home pickup';
      if (next.meeting_address) return next.meeting_address;
      return 'Lesson';
    })();

    return {
      has_booking: true,
      booking: {
        id: next.id,
        lesson_type: next.lesson_type,
        transmission_type: next.transmission_type,
        start_datetime: next.start_datetime,
        end_datetime: next.end_datetime,
        time_of_day: next.time_of_day,
        instructor_name: instructor ? instructor.name : null,
        location_label: locationLabel,
        is_reschedulable: !!next.is_reschedulable,
        is_cancellable: !!next.is_cancellable
      }
    };
  }

  // ============================
  // Lesson search filters & list
  // ============================

  getLessonSearchFilters() {
    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const durationsSet = new Set();
    for (const ts of timeslots) {
      if (typeof ts.duration_minutes === 'number') durationsSet.add(ts.duration_minutes);
    }
    const durations = Array.from(durationsSet).sort((a, b) => a - b);

    const lessonTypes = [
      { code: 'standard_lesson', label: 'Standard Lesson' },
      { code: 'mock_driving_test', label: 'Mock Driving Test' }
    ];

    const transmissionTypes = [
      { code: 'automatic', label: 'Automatic' },
      { code: 'manual', label: 'Manual' }
    ];

    const timeOfDayOptions = [
      { code: 'morning', label: 'Morning (08:00–12:00)', start_time: '08:00', end_time: '12:00' },
      { code: 'afternoon', label: 'Afternoon (12:00–17:00)', start_time: '12:00', end_time: '17:00' },
      { code: 'evening', label: 'Evening (17:00–21:00)', start_time: '17:00', end_time: '21:00' }
    ];

    const ratingThresholds = [3.0, 3.5, 4.0, 4.5, 5.0];
    const reviewCountThresholds = [0, 10, 20, 50, 100];

    const priceSortOptions = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'earliest_time', label: 'Earliest Time' }
    ];

    const profile = this._getCurrentLearnerProfile();
    const defaultsFromProfile = {
      transmission_type: profile.transmission_preference || null,
      experience_level: profile.experience_level || null
    };

    return {
      lesson_types: lessonTypes,
      durations_minutes: durations,
      transmission_types: transmissionTypes,
      time_of_day_options: timeOfDayOptions,
      rating_thresholds: ratingThresholds,
      review_count_thresholds: reviewCountThresholds,
      price_sort_options: priceSortOptions,
      defaults_from_profile: defaultsFromProfile
    };
  }

  searchLessonTimeslots(filters, sort_by, sort_order, limit, offset) {
    filters = filters || {};
    sort_by = sort_by || null;
    sort_order = sort_order || 'asc';
    limit = typeof limit === 'number' ? limit : null;
    offset = typeof offset === 'number' ? offset : 0;

    const timeslotsRaw = this._getFromStorage('lesson_timeslots', []);
    const instructors = this._getFromStorage('instructors', []);
    const testCenters = this._getFromStorage('test_centers', []);

    let filtered = timeslotsRaw.filter(ts => ts.is_available);

    if (filters.lesson_type) {
      filtered = filtered.filter(ts => ts.lesson_type === filters.lesson_type);
    }
    if (typeof filters.duration_minutes === 'number') {
      filtered = filtered.filter(ts => ts.duration_minutes === filters.duration_minutes);
    }
    if (filters.transmission_type) {
      filtered = filtered.filter(ts => ts.transmission_type === filters.transmission_type);
    }
    if (filters.date_from || filters.date_to) {
      filtered = filtered.filter(ts => this._withinDateRange(ts.start_datetime, filters.date_from, filters.date_to));
    }
    if (filters.time_of_day) {
      filtered = filtered.filter(ts => ts.time_of_day === filters.time_of_day);
    }
    if (filters.start_time || filters.end_time) {
      const startFilter = filters.start_time || '00:00';
      const endFilter = filters.end_time || '23:59';
      filtered = filtered.filter(ts => {
        const t = this._getTimeHHMM(ts.start_datetime);
        return this._compareTimeHHMM(t, startFilter) >= 0 && this._compareTimeHHMM(t, endFilter) <= 0;
      });
    }
    if (typeof filters.max_price === 'number') {
      filtered = filtered.filter(ts => ts.price <= filters.max_price);
    }
    if (filters.instructor_id) {
      filtered = filtered.filter(ts => ts.instructor_id === filters.instructor_id);
    }
    if (filters.test_center_id) {
      filtered = filtered.filter(ts => ts.test_center_id === filters.test_center_id);
    }
    if (filters.location_type) {
      filtered = filtered.filter(ts => ts.location_type === filters.location_type);
    }

    if (typeof filters.min_rating === 'number' || typeof filters.min_review_count === 'number') {
      filtered = filtered.filter(ts => {
        const inst = instructors.find(i => i.id === ts.instructor_id);
        if (!inst) return false;
        if (typeof filters.min_rating === 'number' && (inst.rating || 0) < filters.min_rating) return false;
        if (typeof filters.min_review_count === 'number' && (inst.review_count || 0) < filters.min_review_count) return false;
        return true;
      });
    }

    // Sorting
    if (sort_by) {
      const dir = sort_order === 'desc' ? -1 : 1;
      if (sort_by === 'price') {
        filtered.sort((a, b) => (a.price - b.price) * dir);
      } else if (sort_by === 'start_time') {
        filtered.sort((a, b) => (new Date(a.start_datetime) - new Date(b.start_datetime)) * dir);
      }
    }

    // Compute earliest slot per day flag
    const earliestMap = new Map(); // date -> earliest ISO
    for (const ts of filtered) {
      const date = this._getDateOnly(ts.start_datetime);
      const current = earliestMap.get(date);
      const tsDate = new Date(ts.start_datetime);
      if (!current || tsDate < new Date(current)) {
        earliestMap.set(date, ts.start_datetime);
      }
    }

    let results = filtered.map(ts => {
      const inst = instructors.find(i => i.id === ts.instructor_id) || null;
      const tc = ts.test_center_id ? testCenters.find(t => t.id === ts.test_center_id) || null : null;
      const date = this._getDateOnly(ts.start_datetime);
      const earliestForDay = earliestMap.get(date) === ts.start_datetime;
      const instructorSummary = inst
        ? {
            id: inst.id,
            name: inst.name,
            rating: inst.rating,
            review_count: inst.review_count,
            hourly_rate: inst.hourly_rate,
            languages: inst.languages || [],
            transmission_types: inst.transmission_types || [],
            pass_rate_percent: inst.pass_rate_percent || null
          }
        : (ts.instructor_id
            ? {
                id: ts.instructor_id,
                name: null,
                rating: null,
                review_count: null,
                hourly_rate: null,
                languages: [],
                transmission_types: [],
                pass_rate_percent: null
              }
            : null);
      return {
        timeslot: ts,
        instructor_summary: instructorSummary,
        test_center_summary: tc
          ? {
              id: tc.id,
              name: tc.name,
              zip_code: tc.zip_code
            }
          : null,
        is_earliest_for_day: earliestForDay,
        // Foreign key resolution
        instructor: inst,
        test_center: tc
      };
    });

    if (offset) {
      results = results.slice(offset);
    }
    if (limit != null) {
      results = results.slice(0, limit);
    }

    return results;
  }

  // ==================
  // Cart manipulation
  // ==================

  addTimeslotToCart(timeslot_id) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const timeslots = this._getFromStorage('lesson_timeslots', []);

    const ts = timeslots.find(t => t.id === timeslot_id);
    if (!ts) {
      return { success: false, cart: null, message: 'Timeslot not found.' };
    }
    if (!ts.is_available) {
      return { success: false, cart: null, message: 'Timeslot is not available.' };
    }

    // Prevent duplicate same-timeslot items
    const existing = cartItems.find(ci => ci.lesson_timeslot_id === timeslot_id && ci.cart_id === cart.id);
    if (existing) {
      return { success: true, cart: { ...this._recalculateCartTotals(cart), promo_code: null }, message: 'Timeslot already in cart.' };
    }

    const now = this._nowISO();
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'single_lesson',
      lesson_timeslot_id: ts.id,
      package_id: null,
      instructor_id: ts.instructor_id,
      lesson_type: ts.lesson_type,
      transmission_type: ts.transmission_type,
      duration_minutes: ts.duration_minutes,
      start_datetime: ts.start_datetime,
      price: ts.price,
      quantity: 1,
      total_price: ts.price,
      created_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    const promoCodeEntity = this._resolvePromoById(cart.promo_code_id);
    return {
      success: true,
      cart: {
        ...cart,
        promo_code: promoCodeEntity ? promoCodeEntity.code : null
      },
      message: 'Timeslot added to cart.'
    };
  }

  addMultipleTimeslotsToCart(timeslot_ids) {
    if (!Array.isArray(timeslot_ids) || timeslot_ids.length === 0) {
      return { success: false, cart: null, message: 'No timeslots provided.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const timeslots = this._getFromStorage('lesson_timeslots', []);

    const now = this._nowISO();
    let addedCount = 0;

    for (const tsId of timeslot_ids) {
      const ts = timeslots.find(t => t.id === tsId);
      if (!ts || !ts.is_available) continue;

      const existing = cartItems.find(ci => ci.lesson_timeslot_id === tsId && ci.cart_id === cart.id);
      if (existing) continue;

      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'single_lesson',
        lesson_timeslot_id: ts.id,
        package_id: null,
        instructor_id: ts.instructor_id,
        lesson_type: ts.lesson_type,
        transmission_type: ts.transmission_type,
        duration_minutes: ts.duration_minutes,
        start_datetime: ts.start_datetime,
        price: ts.price,
        quantity: 1,
        total_price: ts.price,
        created_at: now
      };

      cartItems.push(cartItem);
      cart.items.push(cartItem.id);
      addedCount++;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    if (addedCount === 0) {
      return { success: false, cart, message: 'No new timeslots were added (may already be in cart or unavailable).' };
    }

    const promoCodeEntity = this._resolvePromoById(cart.promo_code_id);
    return {
      success: true,
      cart: {
        ...cart,
        promo_code: promoCodeEntity ? promoCodeEntity.code : null
      },
      message: `Added ${addedCount} timeslot(s) to cart.`
    };
  }

  // =====================
  // Package search & cart
  // =====================

  getPackageFilterOptions() {
    const packages = this._getFromStorage('lesson_packages', []);
    const activePackages = packages.filter(p => p.status === 'active');

    const levels = [
      { code: 'beginner', label: 'Beginner' },
      { code: 'intermediate', label: 'Intermediate' },
      { code: 'advanced', label: 'Advanced' }
    ];

    const lessonCountsSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    for (const p of activePackages) {
      lessonCountsSet.add(p.number_of_lessons);
      if (typeof p.price_total === 'number') {
        if (minPrice === null || p.price_total < minPrice) minPrice = p.price_total;
        if (maxPrice === null || p.price_total > maxPrice) maxPrice = p.price_total;
      }
      if (p.currency) currency = p.currency;
    }

    const lessonCounts = Array.from(lessonCountsSet).sort((a, b) => a - b);

    const features = {
      home_pickup_included: true,
      mock_test_included: true
    };

    const distanceOptionsKm = [5, 10, 20, 50];

    return {
      levels,
      lesson_counts: lessonCounts,
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0,
        currency
      },
      features,
      distance_options_km: distanceOptionsKm,
      sort_options: [
        { code: 'price_total_asc', label: 'Total Price: Low to High' },
        { code: 'price_total_desc', label: 'Total Price: High to Low' }
      ]
    };
  }

  searchLessonPackages(filters, sort_by, sort_order, limit, offset) {
    filters = filters || {};
    sort_by = sort_by || null;
    sort_order = sort_order || 'asc';
    limit = typeof limit === 'number' ? limit : null;
    offset = typeof offset === 'number' ? offset : 0;

    const packages = this._getFromStorage('lesson_packages', []);
    const instructors = this._getFromStorage('instructors', []);

    let filtered = packages.filter(p => p.status === 'active');

    if (filters.level) {
      filtered = filtered.filter(p => p.level === filters.level);
    }
    if (typeof filters.number_of_lessons === 'number') {
      filtered = filtered.filter(p => p.number_of_lessons === filters.number_of_lessons);
    }
    if (typeof filters.min_price_total === 'number') {
      filtered = filtered.filter(p => p.price_total >= filters.min_price_total);
    }
    if (typeof filters.max_price_total === 'number') {
      filtered = filtered.filter(p => p.price_total <= filters.max_price_total);
    }
    if (typeof filters.home_pickup_included === 'boolean') {
      filtered = filtered.filter(p => !!p.home_pickup_included === filters.home_pickup_included);
    }
    if (typeof filters.mock_test_included === 'boolean') {
      filtered = filtered.filter(p => !!p.mock_test_included === filters.mock_test_included);
    }

    if (filters.zip_code) {
      filtered = filtered.filter(p => {
        if (!p.location_center_zip) return false;
        // Simplified: treat same ZIP as within radius
        if (p.location_center_zip === filters.zip_code) return true;
        return false;
      });
    }

    if (sort_by) {
      const dir = sort_order === 'desc' ? -1 : 1;
      if (sort_by === 'price_total') {
        filtered.sort((a, b) => (a.price_total - b.price_total) * dir);
      } else if (sort_by === 'level') {
        filtered.sort((a, b) => a.level.localeCompare(b.level) * dir);
      }
    }

    let results = filtered.map(p => {
      const associatedInstructor = p.associated_instructor_id
        ? instructors.find(i => i.id === p.associated_instructor_id) || null
        : null;
      let coverageLabel = '';
      if (p.location_center_zip && p.location_radius_km) {
        coverageLabel = `${p.location_radius_km} km around ${p.location_center_zip}`;
      } else if (p.location_center_zip) {
        coverageLabel = `Around ${p.location_center_zip}`;
      }
      return {
        package: p,
        associated_instructor: associatedInstructor
          ? {
              id: associatedInstructor.id,
              name: associatedInstructor.name,
              rating: associatedInstructor.rating,
              review_count: associatedInstructor.review_count
            }
          : null,
        coverage_area_label: coverageLabel
      };
    });

    if (offset) results = results.slice(offset);
    if (limit != null) results = results.slice(0, limit);

    return results;
  }

  getPackageDetails(package_id) {
    const packages = this._getFromStorage('lesson_packages', []);
    const pkg = packages.find(p => p.id === package_id) || null;
    if (!pkg) {
      return {
        package: null,
        associated_instructor: null,
        pricing_breakdown: null,
        promo_information: {
          promo_eligible: false,
          eligible_promo_codes: []
        }
      };
    }

    const instructor = this._resolveInstructor(pkg.associated_instructor_id);

    const pricePerLesson = pkg.number_of_lessons ? pkg.price_total / pkg.number_of_lessons : pkg.price_total;

    const promoEligible = !!pkg.promo_eligible;
    const promos = this._getFromStorage('promocodes', []);
    const now = new Date();
    const eligiblePromos = promos.filter(p => {
      if (!p.is_active) return false;
      if (p.applicable_to === 'lessons_only') return false;
      if (p.start_datetime && new Date(p.start_datetime) > now) return false;
      if (p.end_datetime && new Date(p.end_datetime) < now) return false;
      if (!promoEligible) return false;
      return true;
    });

    return {
      package: pkg,
      associated_instructor: instructor || null,
      pricing_breakdown: {
        price_per_lesson: pricePerLesson,
        regular_price_total: pkg.price_total,
        discount_amount: 0,
        currency: pkg.currency
      },
      promo_information: {
        promo_eligible: promoEligible,
        eligible_promo_codes: eligiblePromos
      }
    };
  }

  addPackageToCart(package_id) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const packages = this._getFromStorage('lesson_packages', []);

    const pkg = packages.find(p => p.id === package_id);
    if (!pkg) {
      return { success: false, cart: null, message: 'Package not found.' };
    }
    if (pkg.status !== 'active') {
      return { success: false, cart: null, message: 'Package is not active.' };
    }

    const existing = cartItems.find(ci => ci.package_id === package_id && ci.cart_id === cart.id);
    if (existing) {
      return { success: true, cart: { ...this._recalculateCartTotals(cart), promo_code: null }, message: 'Package already in cart.' };
    }

    const now = this._nowISO();
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'package',
      lesson_timeslot_id: null,
      package_id: pkg.id,
      instructor_id: pkg.associated_instructor_id || null,
      lesson_type: null,
      transmission_type: pkg.transmission_type || null,
      duration_minutes: pkg.lesson_duration_minutes || null,
      start_datetime: null,
      price: pkg.price_total,
      quantity: 1,
      total_price: pkg.price_total,
      created_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    const promo = this._resolvePromoById(cart.promo_code_id);
    return {
      success: true,
      cart: {
        ...cart,
        promo_code: promo ? promo.code : null
      },
      message: 'Package added to cart.'
    };
  }

  getCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
      return { has_cart: false, cart: null, items_detailed: [] };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const packages = this._getFromStorage('lesson_packages', []);
    const instructors = this._getFromStorage('instructors', []);

    const itemsDetailed = (cart.items || [])
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean)
      .map(ci => {
        let displayTitle = '';
        let displaySubtitle = '';
        let instructorName = '';
        let lessonDatetime = '';
        let isPackage = ci.item_type === 'package';
        let lessonObj = null;
        let packageObj = null;

        if (ci.item_type === 'single_lesson') {
          lessonObj = timeslots.find(ts => ts.id === ci.lesson_timeslot_id) || null;
          const inst = instructors.find(i => i.id === ci.instructor_id) || null;
          instructorName = inst ? inst.name : '';
          const timeLabel = lessonObj ? `${lessonObj.start_datetime}` : '';
          displayTitle = `Single Lesson - ${ci.duration_minutes || (lessonObj && lessonObj.duration_minutes) || ''} min ${ci.transmission_type || (lessonObj && lessonObj.transmission_type) || ''}`;
          displaySubtitle = instructorName ? `${instructorName} • ${timeLabel}` : timeLabel;
          lessonDatetime = lessonObj ? lessonObj.start_datetime : '';
        } else if (ci.item_type === 'package') {
          packageObj = packages.find(p => p.id === ci.package_id) || null;
          const inst = packageObj && packageObj.associated_instructor_id
            ? instructors.find(i => i.id === packageObj.associated_instructor_id) || null
            : null;
          instructorName = inst ? inst.name : '';
          displayTitle = packageObj ? packageObj.name : 'Lesson Package';
          displaySubtitle = packageObj
            ? `${packageObj.level} • ${packageObj.number_of_lessons} lessons` + (instructorName ? ` • ${instructorName}` : '')
            : instructorName;
        }

        return {
          cart_item: ci,
          display_title: displayTitle,
          display_subtitle: displaySubtitle,
          instructor_name: instructorName,
          lesson_datetime: lessonDatetime,
          is_package: isPackage,
          // Foreign key resolutions
          lesson_timeslot: lessonObj,
          package: packageObj
        };
      });

    return {
      has_cart: true,
      cart,
      items_detailed: itemsDetailed
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    quantity = Number(quantity);
    if (Number.isNaN(quantity)) quantity = 1;

    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, cart: null, message: 'No cart found.' };
    }
    let cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex(ci => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (itemIndex === -1) {
      return { success: false, cart, message: 'Cart item not found.' };
    }

    if (quantity <= 0) {
      // Remove item
      const removed = cartItems[itemIndex];
      cartItems.splice(itemIndex, 1);
      cart.items = (cart.items || []).filter(id => id !== removed.id);
      this._saveToStorage('cart_items', cartItems);
      this._recalculateCartTotals(cart);
      return { success: true, cart, message: 'Cart item removed.' };
    }

    const item = cartItems[itemIndex];
    item.quantity = quantity;
    item.total_price = item.price * quantity;
    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    return { success: true, cart, message: 'Cart item quantity updated.' };
  }

  removeCartItem(cart_item_id) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, cart: null, message: 'No cart found.' };
    }
    let cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex(ci => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (index === -1) {
      return { success: false, cart, message: 'Cart item not found.' };
    }

    const removed = cartItems[index];
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    cart.items = (cart.items || []).filter(id => id !== removed.id);
    this._recalculateCartTotals(cart);
    return { success: true, cart, message: 'Cart item removed.' };
  }

  applyPromoCodeToCart(promo_code) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, cart: null, applied_promo: null, message: 'No cart found.' };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsInCart = (cart.items || []).map(id => cartItems.find(ci => ci.id === id)).filter(Boolean);
    const subtotal = itemsInCart.reduce((sum, it) => sum + it.total_price, 0);

    const promoCodes = this._getFromStorage('promocodes', []);
    const promo = promoCodes.find(p => p.code === promo_code) || null;
    const validation = this._validatePromoForUse(promo, subtotal);
    if (!validation.valid) {
      // Clear existing promo if invalid
      cart.promo_code_id = null;
      cart.promo_discount_amount = 0;
      cart.total = subtotal;
      this._saveCart(cart);
      return { success: false, cart, applied_promo: null, message: validation.message };
    }

    const discount = this._applyPromoCodeToAmount(subtotal, promo, itemsInCart);
    cart.promo_code_id = promo.id;
    cart.promo_discount_amount = discount;
    cart.subtotal = subtotal;
    cart.total = Math.max(subtotal - discount, 0);
    this._saveCart(cart);

    return {
      success: true,
      cart,
      applied_promo: promo,
      message: 'Promo code applied.'
    };
  }

  // =================
  // Checkout summary
  // =================

  getCheckoutSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return {
        has_items: false,
        learner_profile_prefill: this._getCurrentLearnerProfile(),
        cart: cart || null,
        line_items: [],
        gift_card_applied: null,
        total_due: cart ? cart.total : 0,
        currency: cart ? cart.currency : 'USD'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const packages = this._getFromStorage('lesson_packages', []);
    const instructors = this._getFromStorage('instructors', []);

    const lineItems = (cart.items || [])
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean)
      .map(ci => {
        let typeLabel = '';
        let instructorName = '';
        let lessonTypeLabel = '';
        let dateTimeLabel = '';
        let packageName = '';
        let lessonObj = null;
        let packageObj = null;

        if (ci.item_type === 'single_lesson') {
          lessonObj = timeslots.find(ts => ts.id === ci.lesson_timeslot_id) || null;
          const inst = instructors.find(i => i.id === ci.instructor_id) || null;
          instructorName = inst ? inst.name : '';
          lessonTypeLabel = lessonObj && lessonObj.lesson_type === 'mock_driving_test' ? 'Mock Driving Test' : 'Standard Lesson';
          dateTimeLabel = lessonObj ? `${lessonObj.start_datetime}` : '';
          typeLabel = 'Single Lesson';
        } else if (ci.item_type === 'package') {
          packageObj = packages.find(p => p.id === ci.package_id) || null;
          const inst = packageObj && packageObj.associated_instructor_id
            ? instructors.find(i => i.id === packageObj.associated_instructor_id) || null
            : null;
          instructorName = inst ? inst.name : '';
          packageName = packageObj ? packageObj.name : '';
          typeLabel = 'Lesson Package';
        }

        return {
          cart_item: ci,
          type_label: typeLabel,
          instructor_name: instructorName,
          lesson_type_label: lessonTypeLabel,
          date_time_label: dateTimeLabel,
          package_name: packageName,
          // Foreign key resolution
          lesson_timeslot: lessonObj,
          package: packageObj
        };
      });

    const profile = this._getCurrentLearnerProfile();

    return {
      has_items: true,
      learner_profile_prefill: profile,
      cart,
      line_items: lineItems,
      gift_card_applied: null,
      total_due: cart.total,
      currency: cart.currency
    };
  }

  applyGiftCardToCheckout(code, pin, use_full_balance) {
    const cart = this._getFromStorage('cart', null);
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return {
        success: false,
        gift_card: null,
        checkout_summary: null,
        message: 'No items in cart.'
      };
    }

    const validation = this._validateGiftCard(code, pin);
    if (!validation.valid) {
      return {
        success: false,
        gift_card: validation.card,
        checkout_summary: null,
        message: validation.message
      };
    }

    const card = validation.card;
    const totalBeforeGift = cart.total;
    const applyResult = this._applyGiftCardToAmount(totalBeforeGift, card, !!use_full_balance);

    const checkoutSummary = {
      cart,
      gift_card_applied: {
        amount_to_use: applyResult.amountToUse,
        remaining_balance_after: applyResult.remainingBalanceAfter,
        currency: card.currency
      },
      total_due_after_gift_card: totalBeforeGift - applyResult.amountToUse
    };

    return {
      success: true,
      gift_card: card,
      checkout_summary: checkoutSummary,
      message: 'Gift card applied for preview.'
    };
  }

  completeCheckout(contact, payment, save_contact_to_profile) {
    contact = contact || {};
    payment = payment || {};

    const cart = this._getFromStorage('cart', null);
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return {
        success: false,
        bookings: [],
        package_purchases: [],
        total_charged: 0,
        currency: 'USD',
        message: 'No items in cart to checkout.'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const packages = this._getFromStorage('lesson_packages', []);
    let promos = this._getFromStorage('promocodes', []);
    let giftcards = this._getFromStorage('giftcards', []);

    const itemsInCart = cart.items.map(id => cartItems.find(ci => ci.id === id)).filter(Boolean);

    // Recalculate totals to ensure consistency
    this._recalculateCartTotals(cart);
    const subtotal = cart.subtotal;
    let total = cart.total;

    let appliedPromo = null;
    if (cart.promo_code_id) {
      appliedPromo = promos.find(p => p.id === cart.promo_code_id) || null;
    }

    // Gift card application (if any)
    let giftCard = null;
    let giftCardAmountUsed = 0;

    if (payment.gift_card_code && payment.gift_card_pin) {
      const validation = this._validateGiftCard(payment.gift_card_code, payment.gift_card_pin);
      if (!validation.valid) {
        return {
          success: false,
          bookings: [],
          package_purchases: [],
          total_charged: 0,
          currency: cart.currency,
          message: validation.message
        };
      }
      giftCard = validation.card;
      const applyResult = this._applyGiftCardToAmount(total, giftCard, !!payment.use_full_gift_card_balance);
      giftCardAmountUsed = applyResult.amountToUse;
      total = total - giftCardAmountUsed;
      // Persist updated gift card balance
      giftcards = giftcards.map(gc => {
        if (gc.id === giftCard.id) {
          const updated = { ...gc };
          updated.current_balance = applyResult.remainingBalanceAfter;
          updated.updated_at = this._nowISO();
          if (updated.current_balance <= 0) {
            updated.status = 'redeemed';
          }
          return updated;
        }
        return gc;
      });
      this._saveToStorage('giftcards', giftcards);
    }

    const bookings = this._getFromStorage('bookings', []);
    const packagePurchases = this._getFromStorage('package_purchases', []);

    const now = this._nowISO();

    // Promo distribution
    const promoPercentage = appliedPromo && appliedPromo.discount_type === 'percentage' ? appliedPromo.discount_value : null;
    let promoFixedRemaining = appliedPromo && appliedPromo.discount_type === 'fixed_amount' ? appliedPromo.discount_value : 0;

    const newBookings = [];
    const newPackagePurchases = [];

    // For quick lookup of package discount assignment for lessons (if needed)

    for (const item of itemsInCart) {
      if (item.item_type === 'single_lesson') {
        const ts = timeslots.find(t => t.id === item.lesson_timeslot_id);
        if (!ts) continue;

        // Determine promo discount for this booking
        let bookingPromoDiscount = 0;
        if (appliedPromo) {
          const eligible = appliedPromo.applicable_to === 'all_items' || appliedPromo.applicable_to === 'lessons_only';
          if (eligible) {
            if (appliedPromo.discount_type === 'percentage') {
              bookingPromoDiscount = (ts.price * promoPercentage) / 100;
            } else if (appliedPromo.discount_type === 'fixed_amount' && promoFixedRemaining > 0) {
              const apply = Math.min(promoFixedRemaining, ts.price);
              bookingPromoDiscount = apply;
              promoFixedRemaining -= apply;
            }
          }
        }

        // Determine gift card amount to attribute per booking proportionally
        let bookingGiftCardAmount = 0;
        if (giftCardAmountUsed > 0) {
          const share = item.total_price / subtotal;
          bookingGiftCardAmount = share * giftCardAmountUsed;
        }

        const booking = this._generateBookingFromTimeslot(
          ts,
          contact,
          ts.lesson_type === 'mock_driving_test' ? 'mock_test' : 'single_lesson',
          null,
          appliedPromo ? appliedPromo.id : null,
          bookingPromoDiscount,
          payment.payment_method || (giftCard ? 'gift_card' : 'other'),
          giftCard ? giftCard.id : null,
          bookingGiftCardAmount
        );

        bookings.push(booking);
        newBookings.push(booking);

        // Mark timeslot as unavailable
        ts.is_available = false;
        ts.updated_at = now;
      } else if (item.item_type === 'package') {
        const pkg = packages.find(p => p.id === item.package_id);
        if (!pkg) continue;

        let packagePromoDiscount = 0;
        if (appliedPromo) {
          const eligible = appliedPromo.applicable_to === 'all_items' || appliedPromo.applicable_to === 'packages_only';
          if (eligible) {
            if (appliedPromo.discount_type === 'percentage') {
              packagePromoDiscount = (pkg.price_total * appliedPromo.discount_value) / 100;
            } else if (appliedPromo.discount_type === 'fixed_amount' && promoFixedRemaining > 0) {
              const apply = Math.min(promoFixedRemaining, pkg.price_total);
              packagePromoDiscount = apply;
              promoFixedRemaining -= apply;
            }
          }
        }

        let packageGiftCardAmount = 0;
        if (giftCardAmountUsed > 0) {
          const share = item.total_price / subtotal;
          packageGiftCardAmount = share * giftCardAmountUsed;
        }

        const pp = {
          id: this._generateId('package_purchase'),
          package_id: pkg.id,
          purchased_at: now,
          total_price_paid: pkg.price_total - packagePromoDiscount,
          currency: pkg.currency,
          payment_method: payment.payment_method || (giftCard ? 'gift_card' : 'other'),
          promo_code_id: appliedPromo ? appliedPromo.id : null,
          promo_discount_amount: packagePromoDiscount,
          gift_card_id: giftCard ? giftCard.id : null,
          gift_card_amount_used: packageGiftCardAmount,
          use_full_gift_card_balance: !!payment.use_full_gift_card_balance,
          lessons_included: pkg.number_of_lessons,
          lessons_redeemed: 0,
          lessons_remaining: pkg.number_of_lessons,
          status: 'active',
          notes: '',
          created_at: now,
          updated_at: now
        };

        packagePurchases.push(pp);
        newPackagePurchases.push(pp);
      }
    }

    // Persist updated bookings and package purchases
    this._saveToStorage('bookings', bookings);
    this._saveToStorage('package_purchases', packagePurchases);
    this._saveToStorage('lesson_timeslots', timeslots);

    // Update promo used_count once per checkout
    if (appliedPromo) {
      promos = promos.map(p => {
        if (p.id === appliedPromo.id) {
          return { ...p, used_count: (p.used_count || 0) + 1 };
        }
        return p;
      });
      this._saveToStorage('promocodes', promos);
    }

    // Optionally update learner profile with contact
    if (save_contact_to_profile) {
      const profile = this._getCurrentLearnerProfile();
      const updatedProfile = {
        ...profile,
        full_name: contact.full_name || profile.full_name,
        email: contact.email || profile.email,
        phone: contact.phone || profile.phone,
        address_line1: contact.address_line1 || profile.address_line1,
        address_line2: contact.address_line2 || profile.address_line2,
        city: contact.city || profile.city,
        state: contact.state || profile.state,
        zip_code: contact.zip_code || profile.zip_code
      };
      this._saveLearnerProfile(updatedProfile);
    }

    // Clear cart and cart_items
    this._saveToStorage('cart_items', []);
    localStorage.removeItem('cart');

    return {
      success: true,
      bookings: newBookings,
      package_purchases: newPackagePurchases,
      total_charged: total,
      currency: cart.currency,
      message: 'Checkout completed successfully.'
    };
  }

  // ====================
  // Instructor search etc
  // ====================

  getInstructorFilterOptions() {
    const instructors = this._getFromStorage('instructors', []);

    const transmissionSet = new Set();
    const languageSet = new Set();
    let minRate = null;
    let maxRate = null;
    let currency = 'USD';

    for (const i of instructors) {
      (i.transmission_types || []).forEach(t => transmissionSet.add(t));
      (i.languages || []).forEach(l => languageSet.add(l));
      if (typeof i.hourly_rate === 'number') {
        if (minRate === null || i.hourly_rate < minRate) minRate = i.hourly_rate;
        if (maxRate === null || i.hourly_rate > maxRate) maxRate = i.hourly_rate;
      }
    }

    const transmissions = Array.from(transmissionSet).map(code => ({ code, label: code.charAt(0).toUpperCase() + code.slice(1) }));
    const languages = Array.from(languageSet).map(code => ({ code, label: code.charAt(0).toUpperCase() + code.slice(1) }));

    return {
      transmission_types: transmissions,
      languages,
      hourly_rate_range: {
        min_rate: minRate || 0,
        max_rate: maxRate || 0,
        currency
      },
      rating_thresholds: [3.0, 3.5, 4.0, 4.5, 5.0],
      sort_options: [
        { code: 'pass_rate_desc', label: 'Pass Rate: High to Low' },
        { code: 'hourly_rate_asc', label: 'Hourly Rate: Low to High' },
        { code: 'rating_desc', label: 'Rating: High to Low' }
      ]
    };
  }

  searchInstructors(filters, sort_by, sort_order, limit, offset) {
    filters = filters || {};
    sort_by = sort_by || null;
    sort_order = sort_order || 'asc';
    limit = typeof limit === 'number' ? limit : null;
    offset = typeof offset === 'number' ? offset : 0;

    let instructors = this._getFromStorage('instructors', []);
    instructors = instructors.filter(i => i.status === 'active');

    if (filters.transmission_type) {
      instructors = instructors.filter(i => (i.transmission_types || []).includes(filters.transmission_type));
    }
    if (filters.language) {
      instructors = instructors.filter(i => (i.languages || []).includes(filters.language));
    }
    if (typeof filters.max_hourly_rate === 'number') {
      instructors = instructors.filter(i => (i.hourly_rate || 0) <= filters.max_hourly_rate);
    }
    if (typeof filters.min_rating === 'number') {
      instructors = instructors.filter(i => (i.rating || 0) >= filters.min_rating);
    }
    if (typeof filters.min_review_count === 'number') {
      instructors = instructors.filter(i => (i.review_count || 0) >= filters.min_review_count);
    }
    if (filters.zip_code) {
      instructors = instructors.filter(i => {
        if (!Array.isArray(i.service_area_zip_codes)) return false;
        return i.service_area_zip_codes.includes(filters.zip_code);
      });
    }

    if (sort_by) {
      const dir = sort_order === 'desc' ? -1 : 1;
      if (sort_by === 'pass_rate') {
        instructors.sort((a, b) => ((a.pass_rate_percent || 0) - (b.pass_rate_percent || 0)) * dir);
      } else if (sort_by === 'hourly_rate') {
        instructors.sort((a, b) => ((a.hourly_rate || 0) - (b.hourly_rate || 0)) * dir);
      } else if (sort_by === 'rating') {
        instructors.sort((a, b) => ((a.rating || 0) - (b.rating || 0)) * dir);
      }
    }

    if (offset) instructors = instructors.slice(offset);
    if (limit != null) instructors = instructors.slice(0, limit);

    return instructors;
  }

  getInstructorProfile(instructor_id) {
    const instructors = this._getFromStorage('instructors', []);
    const instructor = instructors.find(i => i.id === instructor_id) || null;
    if (!instructor) {
      return {
        instructor: null,
        availability_snapshot: {
          typical_days: [],
          typical_time_of_day: [],
          next_available_date: null
        }
      };
    }

    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const futureSlots = timeslots.filter(ts => ts.instructor_id === instructor_id && ts.is_available);

    const dayCount = {};
    const timeOfDayCount = {};
    let nextDate = null;

    for (const ts of futureSlots) {
      const d = new Date(ts.start_datetime);
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      dayCount[weekday] = (dayCount[weekday] || 0) + 1;
      timeOfDayCount[ts.time_of_day] = (timeOfDayCount[ts.time_of_day] || 0) + 1;
      if (!nextDate || d < new Date(nextDate)) {
        nextDate = d.toISOString().slice(0, 10);
      }
    }

    const typicalDays = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])
      .map(([day]) => day);

    const typicalTimeOfDay = Object.entries(timeOfDayCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tod]) => tod);

    return {
      instructor,
      availability_snapshot: {
        typical_days: typicalDays,
        typical_time_of_day: typicalTimeOfDay,
        next_available_date: nextDate
      }
    };
  }

  getInstructorAvailabilityCalendar(instructor_id, date_from, date_to, lesson_type, duration_minutes, transmission_type) {
    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const filtered = timeslots.filter(ts => {
      if (!ts.is_available) return false;
      if (ts.instructor_id !== instructor_id) return false;
      if (lesson_type && ts.lesson_type !== lesson_type) return false;
      if (typeof duration_minutes === 'number' && ts.duration_minutes !== duration_minutes) return false;
      if (transmission_type && ts.transmission_type !== transmission_type) return false;
      if (!this._withinDateRange(ts.start_datetime, date_from, date_to)) return false;
      return true;
    });

    const map = new Map(); // date -> {has_morning, has_afternoon, has_evening, total}

    for (const ts of filtered) {
      const date = this._getDateOnly(ts.start_datetime);
      if (!map.has(date)) {
        map.set(date, {
          date,
          has_morning: false,
          has_afternoon: false,
          has_evening: false,
          total_available_slots: 0
        });
      }
      const obj = map.get(date);
      if (ts.time_of_day === 'morning') obj.has_morning = true;
      if (ts.time_of_day === 'afternoon') obj.has_afternoon = true;
      if (ts.time_of_day === 'evening') obj.has_evening = true;
      obj.total_available_slots += 1;
    }

    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  getInstructorDailySlots(instructor_id, date, duration_minutes, time_of_day) {
    const timeslots = this._getFromStorage('lesson_timeslots', []);
    const dateOnly = date;

    const filtered = timeslots.filter(ts => {
      if (!ts.is_available) return false;
      if (ts.instructor_id !== instructor_id) return false;
      const tsDate = this._getDateOnly(ts.start_datetime);
      if (tsDate !== dateOnly) return false;
      if (typeof duration_minutes === 'number' && ts.duration_minutes !== duration_minutes) return false;
      if (time_of_day && ts.time_of_day !== time_of_day) return false;
      return true;
    });

    const instructor = this._resolveInstructor(instructor_id);

    // Attach foreign key resolution on each timeslot
    return filtered.map(ts => ({
      ...ts,
      instructor
    }));
  }

  // =============
  // Bookings list
  // =============

  getBookings(status_filter, date_from, date_to, sort_by, sort_order) {
    status_filter = status_filter || null;
    sort_by = sort_by || 'start_datetime';
    sort_order = sort_order || 'asc';

    const bookings = this._getFromStorage('bookings', []);
    const instructors = this._getFromStorage('instructors', []);
    const testCenters = this._getFromStorage('test_centers', []);
    const packagePurchases = this._getFromStorage('package_purchases', []);
    const giftcards = this._getFromStorage('giftcards', []);
    const promos = this._getFromStorage('promocodes', []);

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let filtered = bookings.slice();

    if (status_filter === 'upcoming') {
      filtered = filtered.filter(b => b.status === 'upcoming' && new Date(b.start_datetime) >= now);
    } else if (status_filter === 'past') {
      filtered = filtered.filter(b => new Date(b.start_datetime) < now || b.status === 'completed');
    } else if (status_filter === 'cancelled') {
      filtered = filtered.filter(b => b.status === 'cancelled');
    } else if (status_filter === 'upcoming_next_30_days') {
      filtered = filtered.filter(b => b.status === 'upcoming' && new Date(b.start_datetime) >= now && new Date(b.start_datetime) <= thirtyDaysLater);
    } else if (status_filter === 'cancellable') {
      filtered = filtered.filter(b => b.is_cancellable && b.status === 'upcoming');
    }

    if (date_from || date_to) {
      filtered = filtered.filter(b => this._withinDateRange(b.start_datetime, date_from, date_to));
    }

    if (sort_by === 'start_datetime') {
      const dir = sort_order === 'desc' ? -1 : 1;
      filtered.sort((a, b) => (new Date(a.start_datetime) - new Date(b.start_datetime)) * dir);
    }

    return filtered.map(b => {
      const inst = instructors.find(i => i.id === b.instructor_id) || null;
      const tc = b.test_center_id ? testCenters.find(t => t.id === b.test_center_id) || null : null;
      const pp = b.package_purchase_id ? packagePurchases.find(p => p.id === b.package_purchase_id) || null : null;
      const gc = b.gift_card_id ? giftcards.find(g => g.id === b.gift_card_id) || null : null;
      const promo = b.promo_code_id ? promos.find(p => p.id === b.promo_code_id) || null : null;

      let locationLabel = '';
      if (b.location_type === 'test_center') {
        locationLabel = tc ? tc.name : 'Test center';
      } else if (b.location_type === 'home_pickup') {
        locationLabel = 'Home pickup';
      } else if (b.meeting_address) {
        locationLabel = b.meeting_address;
      } else {
        locationLabel = 'Lesson';
      }

      return {
        booking: b,
        instructor_name: inst ? inst.name : null,
        location_label: locationLabel,
        is_cancellable: !!b.is_cancellable,
        is_reschedulable: !!b.is_reschedulable,
        // Foreign key resolution
        instructor: inst,
        test_center: tc,
        package_purchase: pp,
        gift_card: gc,
        promo_code: promo
      };
    });
  }

  getBookingDetail(booking_id) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find(b => b.id === booking_id) || null;
    if (!booking) {
      return {
        booking: null,
        instructor: null,
        test_center: null,
        package_purchase: null
      };
    }

    const instructor = this._resolveInstructor(booking.instructor_id);
    const testCenter = this._resolveTestCenter(booking.test_center_id);
    const packagePurchases = this._getFromStorage('package_purchases', []);
    const packagePurchase = booking.package_purchase_id
      ? packagePurchases.find(p => p.id === booking.package_purchase_id) || null
      : null;

    return {
      booking,
      instructor,
      test_center: testCenter,
      package_purchase: packagePurchase
    };
  }

  getBookingRescheduleAvailability(booking_id, date_from, date_to, time_of_day) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find(b => b.id === booking_id) || null;
    if (!booking) return [];
    return this._getReschedulableTimeslotsForBooking(booking, date_from, date_to, time_of_day || null);
  }

  rescheduleBooking(booking_id, new_timeslot_id) {
    const bookings = this._getFromStorage('bookings', []);
    const timeslots = this._getFromStorage('lesson_timeslots', []);

    const bookingIndex = bookings.findIndex(b => b.id === booking_id);
    if (bookingIndex === -1) {
      return { success: false, updated_booking: null, message: 'Booking not found.' };
    }

    const booking = bookings[bookingIndex];
    if (!booking.is_reschedulable || booking.status !== 'upcoming') {
      return { success: false, updated_booking: booking, message: 'Booking cannot be rescheduled.' };
    }

    const newTs = timeslots.find(ts => ts.id === new_timeslot_id);
    if (!newTs || !newTs.is_available) {
      return { success: false, updated_booking: booking, message: 'New timeslot is not available.' };
    }

    // Free old timeslot if exists
    if (booking.timeslot_id) {
      const oldTsIndex = timeslots.findIndex(ts => ts.id === booking.timeslot_id);
      if (oldTsIndex !== -1) {
        timeslots[oldTsIndex].is_available = true;
        timeslots[oldTsIndex].updated_at = this._nowISO();
      }
    }

    // Assign new timeslot to booking
    booking.start_datetime = newTs.start_datetime;
    booking.end_datetime = newTs.end_datetime;
    booking.time_of_day = newTs.time_of_day;
    booking.instructor_id = newTs.instructor_id;
    booking.timeslot_id = newTs.id;
    booking.location_type = newTs.location_type;
    booking.test_center_id = newTs.test_center_id || null;
    booking.meeting_address = newTs.meeting_address || booking.meeting_address;
    booking.price = newTs.price;
    booking.currency = newTs.currency;
    booking.updated_at = this._nowISO();

    // Mark new timeslot unavailable
    newTs.is_available = false;
    newTs.updated_at = this._nowISO();

    bookings[bookingIndex] = booking;
    this._saveToStorage('bookings', bookings);
    this._saveToStorage('lesson_timeslots', timeslots);

    return {
      success: true,
      updated_booking: booking,
      message: 'Booking rescheduled successfully.'
    };
  }

  cancelBooking(booking_id, reason) {
    const bookings = this._getFromStorage('bookings', []);
    const timeslots = this._getFromStorage('lesson_timeslots', []);

    const bookingIndex = bookings.findIndex(b => b.id === booking_id);
    if (bookingIndex === -1) {
      return {
        success: false,
        cancelled_booking: null,
        refund_information: { refund_amount: 0, currency: 'USD', refund_method: 'other' },
        rebooking_suggestions: [],
        message: 'Booking not found.'
      };
    }

    const booking = bookings[bookingIndex];
    if (!booking.is_cancellable || booking.status !== 'upcoming') {
      return {
        success: false,
        cancelled_booking: booking,
        refund_information: { refund_amount: 0, currency: booking.currency, refund_method: 'other' },
        rebooking_suggestions: [],
        message: 'Booking cannot be cancelled.'
      };
    }

    booking.status = 'cancelled';
    booking.is_cancellable = false;
    booking.is_reschedulable = false;
    booking.cancelled_at = this._nowISO();
    booking.cancellation_reason = reason || 'other';
    booking.updated_at = this._nowISO();

    // Free associated timeslot
    if (booking.timeslot_id) {
      const tsIndex = timeslots.findIndex(ts => ts.id === booking.timeslot_id);
      if (tsIndex !== -1) {
        timeslots[tsIndex].is_available = true;
        timeslots[tsIndex].updated_at = this._nowISO();
      }
    }

    bookings[bookingIndex] = booking;
    this._saveToStorage('bookings', bookings);
    this._saveToStorage('lesson_timeslots', timeslots);

    // Simple refund policy: no automatic refund (0) – this can be expanded
    const refundInformation = {
      refund_amount: 0,
      currency: booking.currency,
      refund_method: booking.payment_method || 'other'
    };

    // Suggest alternative upcoming slots with same instructor
    const suggestionsSlots = timeslots
      .filter(ts => ts.is_available && ts.instructor_id === booking.instructor_id && new Date(ts.start_datetime) > new Date())
      .slice(0, 5);

    const instructor = this._resolveInstructor(booking.instructor_id);
    const rebookingSuggestions = suggestionsSlots.map(ts => ({
      timeslot: ts,
      instructor_name: instructor ? instructor.name : null
    }));

    return {
      success: true,
      cancelled_booking: booking,
      refund_information: refundInformation,
      rebooking_suggestions: rebookingSuggestions
    };
  }

  // ==================
  // Learner profile API
  // ==================

  getLearnerProfile() {
    return this._getCurrentLearnerProfile();
  }

  updateLearnerProfile(profile_updates) {
    profile_updates = profile_updates || {};
    const profile = this._getCurrentLearnerProfile();

    const updated = {
      ...profile,
      full_name: profile_updates.full_name != null ? profile_updates.full_name : profile.full_name,
      email: profile_updates.email != null ? profile_updates.email : profile.email,
      phone: profile_updates.phone != null ? profile_updates.phone : profile.phone,
      address_line1: profile_updates.address_line1 != null ? profile_updates.address_line1 : profile.address_line1,
      address_line2: profile_updates.address_line2 != null ? profile_updates.address_line2 : profile.address_line2,
      city: profile_updates.city != null ? profile_updates.city : profile.city,
      state: profile_updates.state != null ? profile_updates.state : profile.state,
      zip_code: profile_updates.zip_code != null ? profile_updates.zip_code : profile.zip_code,
      experience_level: profile_updates.experience_level != null ? profile_updates.experience_level : profile.experience_level,
      transmission_preference: profile_updates.transmission_preference != null ? profile_updates.transmission_preference : profile.transmission_preference,
      learner_permit_number: profile_updates.learner_permit_number != null ? profile_updates.learner_permit_number : profile.learner_permit_number,
      use_for_future_bookings: profile_updates.use_for_future_bookings != null ? profile_updates.use_for_future_bookings : profile.use_for_future_bookings
    };

    this._saveLearnerProfile(updated);
    return updated;
  }

  // ==================
  // Test centers search
  // ==================

  searchTestCenters(query, limit) {
    query = query || '';
    limit = typeof limit === 'number' ? limit : null;
    const centers = this._getFromStorage('test_centers', []);
    const q = query.trim().toLowerCase();

    let filtered = centers.filter(tc => {
      if (!q) return true;
      const nameMatch = (tc.name || '').toLowerCase().includes(q);
      const zipMatch = (tc.zip_code || '').toLowerCase().includes(q);
      return nameMatch || zipMatch;
    });

    if (limit != null) filtered = filtered.slice(0, limit);
    return filtered;
  }

  // ==========================
  // About / Contact / Help / Policies
  // ==========================

  getAboutContent() {
    // Try to load from storage first; if missing, return static content without persisting
    const stored = this._getFromStorage('about_content', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    return {
      mission: 'To make learning to drive safe, flexible, and accessible for everyone.',
      background: 'We are a network of licensed instructors providing structured driving lessons and mock tests.',
      instructor_standards: 'All instructors are fully licensed, vetted, and continuously reviewed.',
      safety_practices: 'Dual-control vehicles, real-time monitoring of lesson feedback, and strict hygiene protocols.',
      teaching_philosophy: 'Confidence-building, patient instruction with a focus on real-world driving scenarios.',
      key_benefits: [
        'Flexible scheduling and easy rescheduling',
        'Highly rated instructors with strong pass rates',
        'Beginner-friendly lesson packages',
        'Online management of bookings and payments'
      ]
    };
  }

  getContactInfo() {
    const stored = this._getFromStorage('contact_info', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    return {
      phone: '+1 (555) 123-4567',
      email: 'support@drivingschool.local',
      address_line1: '123 Main Street',
      address_line2: '',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      support_hours: 'Mon–Fri 9:00–18:00',
      expected_response_time: 'Within 1 business day'
    };
  }

  submitContactRequest(name, email, phone, subject, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const request = {
      id: this._generateId('contact_request'),
      name,
      email,
      phone: phone || '',
      subject,
      message,
      created_at: this._nowISO()
    };
    requests.push(request);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      request_id: request.id,
      message: 'Your request has been submitted.'
    };
  }

  getHelpFaqs() {
    const stored = this._getFromStorage('help_faqs', null);
    if (Array.isArray(stored)) return stored;

    return [
      {
        category: 'booking',
        question: 'How do I reschedule a lesson?',
        answer: 'Go to My Bookings, select your lesson, and click the Reschedule button to choose a new timeslot.'
      },
      {
        category: 'payments',
        question: 'What payment methods do you accept?',
        answer: 'We accept major credit and debit cards, some gift cards, and cash for certain instructors.'
      },
      {
        category: 'promo_codes',
        question: 'How do I use a promo code?',
        answer: 'Add your lessons or packages to the cart, then enter the promo code on the cart page before checkout.'
      },
      {
        category: 'gift_cards',
        question: 'Can I pay with a gift card?',
        answer: 'Yes. On the checkout page, choose Gift Card and enter your gift card code and PIN.'
      }
    ];
  }

  getPolicyDocuments() {
    const stored = this._getFromStorage('policy_documents', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    return {
      terms_of_service: 'By using this service, you agree to our terms including scheduling, cancellations, and payment conditions.',
      privacy_policy: 'We collect only the data necessary to manage your bookings and never sell your personal information.',
      cancellation_policy: 'Lessons can typically be cancelled or rescheduled up to 24 hours before the start time, subject to instructor policy.',
      refund_policy: 'Refunds for cancelled lessons or unused packages are handled according to local regulations and our terms of service.'
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