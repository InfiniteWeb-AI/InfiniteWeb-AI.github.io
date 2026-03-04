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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      'lessons',
      'instructors',
      'lesson_schedule_slots',
      'lesson_bookings',
      'lesson_packages',
      'membership_plans',
      'membership_setups',
      'boarding_plans',
      'boarding_reservations',
      'camp_sessions',
      'camp_add_ons',
      'camp_enrollments',
      'trail_rides',
      'trail_ride_schedule_slots',
      'trail_ride_bookings',
      'gift_card_products',
      'gift_card_designs',
      'gift_card_purchases',
      'trainers',
      'training_session_types',
      'training_schedule_slots',
      'training_evaluation_requests',
      'events',
      'event_time_slots',
      'event_add_ons',
      'event_registrations',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'plans_page_state'
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

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      // If corrupted, reset to empty array
      return [];
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

  _sameDate(dateTimeStr, dateStr) {
    if (!dateTimeStr || !dateStr) return false;
    return String(dateTimeStr).slice(0, 10) === dateStr;
  }

  _getTimeOfDayFromDatetime(dateTimeStr) {
    if (!dateTimeStr) return null;
    // Parse hour directly from the time portion to avoid environment timezone differences
    const str = String(dateTimeStr);
    const timePartMatch = str.match(/T(\d{2}):(\d{2})/);
    if (!timePartMatch) return null;
    const h = parseInt(timePartMatch[1], 10);
    if (isNaN(h)) return null;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  _normalizeDatetimeForDisplay(dateTimeStr) {
    if (!dateTimeStr) return dateTimeStr;
    const str = String(dateTimeStr);
    // If already in YYYY-MM-DDTHH:mm:ss format without timezone, leave as is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(str)) {
      return str;
    }
    // Strip any timezone or milliseconds, keeping local wall-clock time
    const match = str.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (match) return match[1];
    return str;
  }

  _trainerLevelToNumber(level) {
    switch (level) {
      case 'level_1':
        return 1;
      case 'level_2':
        return 2;
      case 'level_3':
        return 3;
      case 'level_4':
        return 4;
      default:
        return 0;
    }
  }

  _shortenDescription(desc, maxLength = 140) {
    if (!desc) return '';
    if (desc.length <= maxLength) return desc;
    return desc.slice(0, maxLength - 3) + '...';
  }

  // -------------------- Cart helpers (single-user cart) --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'active');

    if (!cart) {
      const now = this._nowIso();
      cart = {
        id: this._generateId('cart'),
        createdAt: now,
        updatedAt: now,
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'USD',
        status: 'active'
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _addItemToCart(cart, itemType, referenceId, name, quantity, unitPrice, metadataObj) {
    let cartItems = this._getFromStorage('cart_items');
    const now = this._nowIso();

    // Decide if items can be merged: same cartId, itemType, referenceId, same metadata string
    const metadata = metadataObj ? JSON.stringify(metadataObj) : null;

    let existing = cartItems.find(
      (ci) =>
        ci.cartId === cart.id &&
        ci.itemType === itemType &&
        ci.referenceId === referenceId &&
        (ci.metadata || null) === (metadata || null)
    );

    if (existing) {
      existing.quantity += quantity;
      existing.totalPrice = existing.unitPrice * existing.quantity;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType,
        referenceId,
        name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        metadata
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart.id);
    return { cart: updatedCart, cartItem: existing };
  }

  _recalculateCartTotals(cartId) {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.id === cartId);
    if (!cart) return null;

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cartId);
    const subtotal = cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const tax = 0; // Simplified: no tax calculation
    const total = subtotal + tax;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    cart.updatedAt = this._nowIso();

    this._saveToStorage('cart', carts);
    return cart;
  }

  _createOrderFromCart(cartId) {
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId && c.status === 'active');
    if (!cart) return null;

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cartId);
    const now = this._nowIso();

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const order = {
      id: orderId,
      cartId: cart.id,
      createdAt: now,
      total: cart.total,
      currency: cart.currency,
      status: 'pending_payment',
      paymentMethod: null
    };

    orders.push(order);

    cartItems.forEach((ci) => {
      const oi = {
        id: this._generateId('order_item'),
        orderId,
        itemType: ci.itemType,
        referenceId: ci.referenceId,
        name: ci.name,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice
      };
      orderItems.push(oi);
    });

    // Mark cart as checked_out
    cart.status = 'checked_out';
    cart.updatedAt = now;

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('cart', carts);

    return order;
  }

  _validateGiftCardAmount(product, amount) {
    if (!product) {
      return { valid: false, message: 'Gift card product not found.' };
    }
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { valid: false, message: 'Invalid gift card amount.' };
    }
    if (amount < product.minAmount) {
      return {
        valid: false,
        message: 'Amount is below the minimum of ' + product.minAmount
      };
    }
    if (amount > product.maxAmount) {
      return {
        valid: false,
        message: 'Amount exceeds the maximum of ' + product.maxAmount
      };
    }
    return { valid: true, message: 'OK' };
  }

  // -------------------- 1. Homepage featured content --------------------

  getHomeFeaturedContent() {
    const nowIso = this._nowIso();

    const lessons = this._getFromStorage('lessons').filter((l) => l.isActive);
    const lessonSlots = this._getFromStorage('lesson_schedule_slots');

    const featuredLessons = lessons
      .map((lesson) => {
        const upcomingSlots = lessonSlots
          .filter((s) => s.lessonId === lesson.id && s.startDatetime >= nowIso)
          .sort((a, b) => (a.startDatetime || '').localeCompare(b.startDatetime || ''));
        if (upcomingSlots.length === 0) return null;
        return {
          lessonId: lesson.id,
          title: lesson.title,
          riderLevel: lesson.riderLevel,
          format: lesson.format,
          averageRating: lesson.averageRating || 0,
          ratingCount: lesson.ratingCount || 0,
          basePrice: lesson.basePrice,
          nextSlotStart: upcomingSlots[0].startDatetime,
          // Foreign key resolution for frontend convenience
          lesson: lesson
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

    const trailRides = this._getFromStorage('trail_rides').filter((t) => t.isActive);
    const trailRideSlots = this._getFromStorage('trail_ride_schedule_slots');

    const featuredTrailRides = trailRides
      .map((ride) => {
        const upcomingSlots = trailRideSlots
          .filter((s) => s.trailRideId === ride.id && s.startDatetime >= nowIso)
          .sort((a, b) => (a.startDatetime || '').localeCompare(b.startDatetime || ''));
        if (upcomingSlots.length === 0) return null;
        return {
          trailRideId: ride.id,
          name: ride.name,
          durationMinutes: ride.durationMinutes,
          averageRating: ride.averageRating || 0,
          basePricePerRider: ride.basePricePerRider,
          nextSlotStart: upcomingSlots[0].startDatetime,
          trailRide: ride
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

    const campSessionsAll = this._getFromStorage('camp_sessions').filter((c) => c.isActive);
    const featuredCampSessions = campSessionsAll
      .filter((c) => c.startDate >= nowIso)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .map((c) => ({
        campSessionId: c.id,
        name: c.name,
        campType: c.campType,
        startDate: c.startDate,
        endDate: c.endDate,
        minAge: c.minAge,
        maxAge: c.maxAge,
        groupSizeMax: c.groupSizeMax,
        priceTotal: c.priceTotal,
        campSession: c
      }));

    const events = this._getFromStorage('events').filter((e) => e.isActive);
    const featuredEvents = events
      .filter((e) => e.startDate >= nowIso)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .map((e) => ({
        eventId: e.id,
        title: e.title,
        eventType: e.eventType,
        startDate: e.startDate,
        endDate: e.endDate,
        shortDescription: this._shortenDescription(e.description || ''),
        event: e
      }));

    const giftCardProducts = this._getFromStorage('gift_card_products').filter(
      (g) => g.isActive
    );
    const digital = giftCardProducts.find((g) => g.type === 'digital') || giftCardProducts[0] || null;

    const featuredGiftCardProduct = digital
      ? {
          giftCardProductId: digital.id,
          name: digital.name,
          type: digital.type,
          minAmount: digital.minAmount,
          maxAmount: digital.maxAmount,
          product: digital
        }
      : null;

    return {
      featuredLessons,
      featuredTrailRides,
      featuredCampSessions,
      featuredEvents,
      featuredGiftCardProduct
    };
  }

  // -------------------- 2. Lessons --------------------

  getLessonFilterOptions() {
    const lessons = this._getFromStorage('lessons').filter((l) => l.isActive);
    const prices = lessons.map((l) => l.basePrice).filter((v) => typeof v === 'number');
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    return {
      riderLevels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
      ],
      formats: [
        { value: 'group', label: 'Group lesson' },
        { value: 'private', label: 'Private lesson' }
      ],
      timeOfDayOptions: [
        { value: 'morning', label: 'Morning (before 12:00 pm)' },
        { value: 'afternoon', label: 'Afternoon (12:00–5:00 pm)' },
        { value: 'evening', label: 'Evening (after 5:00 pm)' }
      ],
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 1
      },
      ratingThresholds: [
        { value: 3, label: '3+ stars' },
        { value: 4, label: '4+ stars' },
        { value: 4.5, label: '4.5+ stars' }
      ],
      sortOptions: [
        { value: 'rating_high_to_low', label: 'Rating - High to Low' },
        { value: 'price_low_to_high', label: 'Price - Low to High' },
        { value: 'start_time_earliest_first', label: 'Start time - Earliest first' }
      ]
    };
  }

  searchLessonSlots(filters, sortBy) {
    const f = filters || {};
    const riderLevels = Array.isArray(f.riderLevels) ? f.riderLevels : [];
    const formats = Array.isArray(f.formats) ? f.formats : [];
    const date = f.date || null; // 'YYYY-MM-DD'
    const timeOfDay = f.timeOfDay || null; // 'morning'|'afternoon'|'evening'
    const minPrice = typeof f.minPrice === 'number' ? f.minPrice : null;
    const maxPrice = typeof f.maxPrice === 'number' ? f.maxPrice : null;
    const minRating = typeof f.minRating === 'number' ? f.minRating : null;

    const lessons = this._getFromStorage('lessons').filter((l) => l.isActive);
    const instructors = this._getFromStorage('instructors').filter((i) => i.isActive);
    const slotsRaw = this._getFromStorage('lesson_schedule_slots');

    let results = [];

    for (const slot of slotsRaw) {
      const lesson = lessons.find((l) => l.id === slot.lessonId);
      if (!lesson) continue;

      // Filter by rider level
      if (riderLevels.length && !riderLevels.includes(lesson.riderLevel)) continue;

      // Filter by format
      if (formats.length && !formats.includes(lesson.format)) continue;

      // Filter by date
      if (date && !this._sameDate(slot.startDatetime, date)) continue;

      // Filter by time of day
      if (timeOfDay) {
        const tod = this._getTimeOfDayFromDatetime(slot.startDatetime);
        if (tod !== timeOfDay) continue;
      }

      // Filter by price
      if (minPrice !== null && slot.price < minPrice) continue;
      if (maxPrice !== null && slot.price > maxPrice) continue;

      // Filter by rating
      const lr = lesson.averageRating || 0;
      if (minRating !== null && lr < minRating) continue;

      // Ensure slot has availability (if defined)
      if (typeof slot.spotsRemaining === 'number' && slot.spotsRemaining <= 0) continue;

      const instructor = instructors.find((i) => i.id === lesson.instructorId) || null;

      results.push({
        lessonSlotId: slot.id,
        startDatetime: this._normalizeDatetimeForDisplay(slot.startDatetime),
        endDatetime: this._normalizeDatetimeForDisplay(slot.endDatetime),
        price: slot.price,
        spotsRemaining: slot.spotsRemaining,
        lesson: {
          lessonId: lesson.id,
          title: lesson.title,
          riderLevel: lesson.riderLevel,
          format: lesson.format,
          durationMinutes: lesson.durationMinutes,
          basePrice: lesson.basePrice,
          averageRating: lesson.averageRating || 0,
          ratingCount: lesson.ratingCount || 0
        },
        instructor: instructor
          ? {
              instructorId: instructor.id,
              fullName: instructor.fullName,
              averageRating: instructor.averageRating || 0,
              ratingCount: instructor.ratingCount || 0
            }
          : null
      });
    }

    // Sorting
    switch (sortBy) {
      case 'rating_high_to_low':
        results.sort((a, b) => {
          const ra = (a.lesson.averageRating || 0);
          const rb = (b.lesson.averageRating || 0);
          if (rb !== ra) return rb - ra;
          return a.price - b.price;
        });
        break;
      case 'price_low_to_high':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'start_time_earliest_first':
      default:
        results.sort((a, b) => (a.startDatetime || '').localeCompare(b.startDatetime || ''));
        break;
    }

    return results;
  }

  getLessonDetails(lessonId) {
    const lessons = this._getFromStorage('lessons');
    const instructors = this._getFromStorage('instructors');

    const lesson = lessons.find((l) => l.id === lessonId) || null;
    if (!lesson) {
      return { lesson: null, instructor: null };
    }

    const instructor = instructors.find((i) => i.id === lesson.instructorId) || null;

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || '',
        riderLevel: lesson.riderLevel,
        format: lesson.format,
        durationMinutes: lesson.durationMinutes,
        basePrice: lesson.basePrice,
        maxGroupSize: lesson.maxGroupSize,
        averageRating: lesson.averageRating || 0,
        ratingCount: lesson.ratingCount || 0,
        location: lesson.location || ''
      },
      instructor: instructor
        ? {
            id: instructor.id,
            fullName: instructor.fullName,
            bio: instructor.bio || '',
            averageRating: instructor.averageRating || 0,
            ratingCount: instructor.ratingCount || 0,
            photoUrl: instructor.photoUrl || '',
            specialties: instructor.specialties || []
          }
        : null
    };
  }

  getLessonScheduleForDate(lessonId, date) {
    const slots = this._getFromStorage('lesson_schedule_slots');
    return slots
      .filter((s) => s.lessonId === lessonId && this._sameDate(s.startDatetime, date))
      .map((s) => ({
        lessonSlotId: s.id,
        startDatetime: s.startDatetime,
        endDatetime: s.endDatetime,
        price: s.price,
        capacity: s.capacity,
        spotsRemaining: s.spotsRemaining
      }))
      .sort((a, b) => (a.startDatetime || '').localeCompare(b.startDatetime || ''));
  }

  bookLessonSlot(lessonSlotId, fullName, email, phone) {
    const slots = this._getFromStorage('lesson_schedule_slots');
    const lessons = this._getFromStorage('lessons');
    const bookings = this._getFromStorage('lesson_bookings');

    const slot = slots.find((s) => s.id === lessonSlotId);
    if (!slot) {
      return { success: false, bookingId: null, status: 'pending', message: 'Lesson slot not found.' };
    }

    if (typeof slot.spotsRemaining === 'number' && slot.spotsRemaining <= 0) {
      return {
        success: false,
        bookingId: null,
        status: 'pending',
        message: 'No spots remaining for this lesson slot.'
      };
    }

    const lesson = lessons.find((l) => l.id === slot.lessonId);
    if (!lesson) {
      return { success: false, bookingId: null, status: 'pending', message: 'Lesson not found.' };
    }

    // Decrement spotsRemaining if applicable
    if (typeof slot.spotsRemaining === 'number') {
      slot.spotsRemaining = Math.max(0, slot.spotsRemaining - 1);
      this._saveToStorage('lesson_schedule_slots', slots);
    }

    const bookingId = this._generateId('lesson_booking');
    const booking = {
      id: bookingId,
      lessonId: lesson.id,
      lessonSlotId,
      fullName,
      email,
      phone,
      createdAt: this._nowIso(),
      status: 'confirmed'
    };

    bookings.push(booking);
    this._saveToStorage('lesson_bookings', bookings);

    return {
      success: true,
      bookingId,
      status: booking.status,
      message: 'Lesson booked successfully.'
    };
  }

  // -------------------- 3. Lesson packages & cart --------------------

  getLessonPackageFilterOptions() {
    const packages = this._getFromStorage('lesson_packages').filter((p) => p.isActive);

    const numberOfLessonsSet = new Set();
    const pricePerLessonArr = [];
    packages.forEach((p) => {
      numberOfLessonsSet.add(p.numberOfLessons);
      if (typeof p.pricePerLesson === 'number') pricePerLessonArr.push(p.pricePerLesson);
    });

    const numberOfLessonsOptions = Array.from(numberOfLessonsSet).sort((a, b) => a - b);
    const minP = pricePerLessonArr.length ? Math.min(...pricePerLessonArr) : 0;
    const maxP = pricePerLessonArr.length ? Math.max(...pricePerLessonArr) : 0;

    return {
      riderLevels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
      ],
      eligibleDaysOptions: [
        { value: 'weekdays_only', label: 'Weekdays only' },
        { value: 'weekends_only', label: 'Weekends only' },
        { value: 'any_day', label: 'Any day' }
      ],
      numberOfLessonsOptions,
      pricePerLessonRange: {
        min: minP,
        max: maxP,
        step: 1
      },
      sortOptions: [
        { value: 'price_per_lesson_low_to_high', label: 'Price per lesson (Low to High)' },
        { value: 'total_price_low_to_high', label: 'Total price (Low to High)' }
      ]
    };
  }

  searchLessonPackages(filters, sortBy) {
    const f = filters || {};
    let packages = this._getFromStorage('lesson_packages').filter((p) => p.isActive);

    if (f.riderLevel) {
      packages = packages.filter((p) => p.riderLevel === f.riderLevel);
    }
    if (f.eligibleDays) {
      packages = packages.filter((p) => p.eligibleDays === f.eligibleDays);
    }
    if (typeof f.numberOfLessons === 'number') {
      packages = packages.filter((p) => p.numberOfLessons === f.numberOfLessons);
    }
    if (typeof f.minPricePerLesson === 'number') {
      packages = packages.filter((p) => p.pricePerLesson >= f.minPricePerLesson);
    }
    if (typeof f.maxPricePerLesson === 'number') {
      packages = packages.filter((p) => p.pricePerLesson <= f.maxPricePerLesson);
    }

    switch (sortBy) {
      case 'price_per_lesson_low_to_high':
        packages.sort((a, b) => a.pricePerLesson - b.pricePerLesson);
        break;
      case 'total_price_low_to_high':
        packages.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
      default:
        break;
    }

    return packages.map((p) => ({
      lessonPackageId: p.id,
      name: p.name,
      description: p.description || '',
      riderLevel: p.riderLevel,
      numberOfLessons: p.numberOfLessons,
      eligibleDays: p.eligibleDays,
      totalPrice: p.totalPrice,
      pricePerLesson: p.pricePerLesson,
      isActive: p.isActive
    }));
  }

  getLessonPackageDetails(lessonPackageId) {
    const packages = this._getFromStorage('lesson_packages');
    const p = packages.find((pkg) => pkg.id === lessonPackageId) || null;
    return {
      lessonPackage: p
        ? {
            id: p.id,
            name: p.name,
            description: p.description || '',
            riderLevel: p.riderLevel,
            numberOfLessons: p.numberOfLessons,
            eligibleDays: p.eligibleDays,
            totalPrice: p.totalPrice,
            pricePerLesson: p.pricePerLesson,
            terms: p.terms || ''
          }
        : null
    };
  }

  addLessonPackageToCart(lessonPackageId, quantity = 1) {
    const packages = this._getFromStorage('lesson_packages');
    const pkg = packages.find((p) => p.id === lessonPackageId && p.isActive);
    if (!pkg) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        cartTotal: 0,
        message: 'Lesson package not found or inactive.'
      };
    }

    if (quantity <= 0) quantity = 1;

    const cart = this._getOrCreateCart();
    const unitPrice = pkg.totalPrice;

    const { cart: updatedCart, cartItem } = this._addItemToCart(
      cart,
      'lesson_package',
      pkg.id,
      pkg.name,
      quantity,
      unitPrice,
      { riderLevel: pkg.riderLevel, numberOfLessons: pkg.numberOfLessons }
    );

    return {
      success: true,
      cartId: updatedCart.id,
      cartItemId: cartItem.id,
      cartTotal: updatedCart.total,
      message: 'Lesson package added to cart.'
    };
  }

  // -------------------- 4. Memberships --------------------

  getMembershipPlansForDisplay() {
    const plans = this._getFromStorage('membership_plans').filter((p) => p.isActive);
    return plans.map((p) => ({
      membershipPlanId: p.id,
      code: p.code,
      displayName: p.displayName,
      description: p.description || '',
      monthlyPrice: p.monthlyPrice,
      includesGymAccess: !!p.includesGymAccess,
      practiceArenaHoursPerWeek: p.practiceArenaHoursPerWeek,
      otherBenefits: p.otherBenefits || []
    }));
  }

  createMembershipSetup(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId && p.isActive);
    if (!plan) {
      return {
        membershipSetupId: null,
        membershipPlanId: null,
        billingFrequency: null,
        agreedToTerms: false,
        status: 'in_progress'
      };
    }

    const setups = this._getFromStorage('membership_setups');
    const id = this._generateId('membership_setup');

    const setup = {
      id,
      membershipPlanId: plan.id,
      billingFrequency: 'monthly',
      agreedToTerms: false,
      createdAt: this._nowIso(),
      status: 'in_progress'
    };

    setups.push(setup);
    this._saveToStorage('membership_setups', setups);

    return {
      membershipSetupId: id,
      membershipPlanId: plan.id,
      billingFrequency: setup.billingFrequency,
      agreedToTerms: setup.agreedToTerms,
      status: setup.status
    };
  }

  configureMembershipBillingAndTerms(membershipSetupId, billingFrequency, agreedToTerms) {
    const setups = this._getFromStorage('membership_setups');
    const setup = setups.find((s) => s.id === membershipSetupId);
    if (!setup) {
      return {
        success: false,
        membershipSetupId: null,
        status: 'in_progress',
        message: 'Membership setup not found.'
      };
    }

    setup.billingFrequency = billingFrequency;
    setup.agreedToTerms = !!agreedToTerms;

    this._saveToStorage('membership_setups', setups);

    return {
      success: true,
      membershipSetupId: setup.id,
      status: setup.status,
      message: 'Membership billing and terms updated.'
    };
  }

  continueMembershipToPayment(membershipSetupId) {
    const setups = this._getFromStorage('membership_setups');
    const setup = setups.find((s) => s.id === membershipSetupId);
    if (!setup) {
      return {
        success: false,
        membershipSetupId: null,
        cartId: null,
        nextStep: null,
        message: 'Membership setup not found.'
      };
    }

    if (!setup.agreedToTerms) {
      return {
        success: false,
        membershipSetupId: setup.id,
        cartId: null,
        nextStep: null,
        message: 'Membership terms must be agreed to before continuing.'
      };
    }

    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === setup.membershipPlanId);
    if (!plan) {
      return {
        success: false,
        membershipSetupId: setup.id,
        cartId: null,
        nextStep: null,
        message: 'Membership plan not found.'
      };
    }

    setup.status = 'submitted';
    this._saveToStorage('membership_setups', setups);

    const cart = this._getOrCreateCart();
    const { cart: updatedCart } = this._addItemToCart(
      cart,
      'membership_setup',
      setup.id,
      'Membership: ' + plan.displayName,
      1,
      plan.monthlyPrice,
      { billingFrequency: setup.billingFrequency }
    );

    return {
      success: true,
      membershipSetupId: setup.id,
      cartId: updatedCart.id,
      nextStep: 'checkout',
      message: 'Membership added to cart.'
    };
  }

  // -------------------- 5. Boarding --------------------

  getBoardingFilterOptions() {
    const plans = this._getFromStorage('boarding_plans').filter((p) => p.isActive);
    const prices = plans.map((p) => p.monthlyPrice).filter((v) => typeof v === 'number');
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;

    return {
      boardingTypes: [
        { value: 'full_board', label: 'Full board' },
        { value: 'partial_board', label: 'Partial board' },
        { value: 'self_care', label: 'Self care' }
      ],
      amenities: [
        { code: 'outdoor_turnout', label: 'Outdoor turnout' },
        { code: 'indoor_arena_access', label: 'Indoor arena access' }
      ],
      monthlyPriceRange: {
        min,
        max,
        step: 25
      },
      sortOptions: [
        { value: 'monthly_price_low_to_high', label: 'Monthly price (Low to High)' },
        { value: 'monthly_price_high_to_low', label: 'Monthly price (High to Low)' }
      ]
    };
  }

  searchBoardingPlans(filters, sortBy) {
    const f = filters || {};
    let plans = this._getFromStorage('boarding_plans').filter((p) => p.isActive);

    if (f.boardingType) plans = plans.filter((p) => p.boardingType === f.boardingType);
    if (typeof f.hasOutdoorTurnout === 'boolean') {
      plans = plans.filter((p) => !!p.hasOutdoorTurnout === f.hasOutdoorTurnout);
    }
    if (typeof f.hasIndoorArenaAccess === 'boolean') {
      plans = plans.filter((p) => !!p.hasIndoorArenaAccess === f.hasIndoorArenaAccess);
    }
    if (typeof f.minMonthlyPrice === 'number') {
      plans = plans.filter((p) => p.monthlyPrice >= f.minMonthlyPrice);
    }
    if (typeof f.maxMonthlyPrice === 'number') {
      plans = plans.filter((p) => p.monthlyPrice <= f.maxMonthlyPrice);
    }

    switch (sortBy) {
      case 'monthly_price_low_to_high':
        plans.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
        break;
      case 'monthly_price_high_to_low':
        plans.sort((a, b) => b.monthlyPrice - a.monthlyPrice);
        break;
      default:
        break;
    }

    return plans.map((p) => ({
      boardingPlanId: p.id,
      name: p.name,
      description: p.description || '',
      boardingType: p.boardingType,
      stallType: p.stallType || '',
      hasOutdoorTurnout: !!p.hasOutdoorTurnout,
      hasIndoorArenaAccess: !!p.hasIndoorArenaAccess,
      otherAmenities: p.otherAmenities || [],
      monthlyPrice: p.monthlyPrice
    }));
  }

  getBoardingPlanDetails(boardingPlanId) {
    const plans = this._getFromStorage('boarding_plans');
    const p = plans.find((bp) => bp.id === boardingPlanId) || null;
    return {
      boardingPlan: p
        ? {
            id: p.id,
            name: p.name,
            description: p.description || '',
            boardingType: p.boardingType,
            stallType: p.stallType || '',
            hasOutdoorTurnout: !!p.hasOutdoorTurnout,
            hasIndoorArenaAccess: !!p.hasIndoorArenaAccess,
            otherAmenities: p.otherAmenities || [],
            monthlyPrice: p.monthlyPrice
          }
        : null
    };
  }

  createBoardingReservation(
    boardingPlanId,
    startDate,
    ownerName,
    email,
    horseName,
    horseBreed,
    horseAge
  ) {
    const plans = this._getFromStorage('boarding_plans');
    const plan = plans.find((p) => p.id === boardingPlanId && p.isActive);
    if (!plan) {
      return {
        success: false,
        reservationId: null,
        status: 'pending',
        message: 'Boarding plan not found or inactive.'
      };
    }

    const reservations = this._getFromStorage('boarding_reservations');
    const id = this._generateId('boarding_res');

    let startDateIso;
    if (typeof startDate === 'string') {
      // Normalize to YYYY-MM-DDT00:00:00 (no timezone) so calendar date is stable across time zones
      if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        startDateIso = startDate + 'T00:00:00';
      } else {
        startDateIso = startDate;
      }
    } else if (startDate instanceof Date && !isNaN(startDate.getTime())) {
      const y = startDate.getFullYear();
      const m = String(startDate.getMonth() + 1).padStart(2, '0');
      const d = String(startDate.getDate()).padStart(2, '0');
      startDateIso = `${y}-${m}-${d}T00:00:00`;
    } else {
      startDateIso = null;
    }

    const res = {
      id,
      boardingPlanId: plan.id,
      startDate: startDateIso,
      ownerName,
      email,
      horseName,
      horseBreed: horseBreed || '',
      horseAge: typeof horseAge === 'number' ? horseAge : null,
      createdAt: this._nowIso(),
      status: 'pending'
    };

    reservations.push(res);
    this._saveToStorage('boarding_reservations', reservations);

    return {
      success: true,
      reservationId: id,
      status: res.status,
      message: 'Boarding reservation submitted.'
    };
  }

  // -------------------- 6. Camps & Clinics --------------------

  getCampFilterOptions() {
    const sessions = this._getFromStorage('camp_sessions').filter((c) => c.isActive);

    const prices = sessions.map((c) => c.priceTotal).filter((v) => typeof v === 'number');
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;

    const monthSet = new Set();
    const groupSizeSet = new Set();
    const durationSet = new Set();

    sessions.forEach((s) => {
      if (s.startDate) monthSet.add(String(s.startDate).slice(0, 7));
      if (typeof s.groupSizeMax === 'number') groupSizeSet.add(s.groupSizeMax);
      if (typeof s.durationDays === 'number') durationSet.add(s.durationDays);
    });

    const monthOptions = Array.from(monthSet)
      .sort()
      .map((m) => {
        const [year, month] = m.split('-');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        return { value: m, label };
      });

    const groupSizeOptions = Array.from(groupSizeSet).sort((a, b) => a - b);
    const durationOptions = Array.from(durationSet).sort((a, b) => a - b);

    return {
      campTypes: [
        { value: 'summer_camp', label: 'Summer Camps' },
        { value: 'clinic', label: 'Clinics' },
        { value: 'holiday_camp', label: 'Holiday Camps' }
      ],
      ageGroups: [
        { id: 'ages_4_7', label: 'Ages 4–7', minAge: 4, maxAge: 7 },
        { id: 'ages_8_12', label: 'Ages 8–12', minAge: 8, maxAge: 12 },
        { id: 'ages_13_17', label: 'Ages 13–17', minAge: 13, maxAge: 17 }
      ],
      monthOptions,
      groupSizeOptions,
      durationOptions,
      priceRange: {
        min,
        max,
        step: 10
      },
      sortOptions: [
        { value: 'total_price_low_to_high', label: 'Total price (Low to High)' },
        { value: 'start_date_soonest_first', label: 'Start date (Soonest first)' }
      ]
    };
  }

  searchCampSessions(filters, sortBy) {
    const f = filters || {};
    let sessions = this._getFromStorage('camp_sessions').filter((c) => c.isActive);

    if (f.campType) sessions = sessions.filter((c) => c.campType === f.campType);

    // Age overlap logic
    if (typeof f.minAge === 'number' || typeof f.maxAge === 'number') {
      const minAge = typeof f.minAge === 'number' ? f.minAge : 0;
      const maxAge = typeof f.maxAge === 'number' ? f.maxAge : 100;
      sessions = sessions.filter(
        (c) => c.maxAge >= minAge && c.minAge <= maxAge
      );
    }

    if (f.month) {
      sessions = sessions.filter((c) => String(c.startDate).slice(0, 7) === f.month);
    }

    if (typeof f.maxGroupSize === 'number') {
      sessions = sessions.filter((c) => c.groupSizeMax <= f.maxGroupSize);
    }

    if (typeof f.durationDays === 'number') {
      sessions = sessions.filter((c) => c.durationDays === f.durationDays);
    }

    if (typeof f.minPriceTotal === 'number') {
      sessions = sessions.filter((c) => c.priceTotal >= f.minPriceTotal);
    }
    if (typeof f.maxPriceTotal === 'number') {
      sessions = sessions.filter((c) => c.priceTotal <= f.maxPriceTotal);
    }

    switch (sortBy) {
      case 'total_price_low_to_high':
        sessions.sort((a, b) => a.priceTotal - b.priceTotal);
        break;
      case 'start_date_soonest_first':
        sessions.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
        break;
      default:
        break;
    }

    return sessions.map((c) => ({
      campSessionId: c.id,
      name: c.name,
      campType: c.campType,
      minAge: c.minAge,
      maxAge: c.maxAge,
      startDate: c.startDate,
      endDate: c.endDate,
      durationDays: c.durationDays,
      groupSizeMax: c.groupSizeMax,
      priceTotal: c.priceTotal,
      location: c.location || ''
    }));
  }

  getCampSessionDetails(campSessionId) {
    const sessions = this._getFromStorage('camp_sessions');
    const campSession = sessions.find((c) => c.id === campSessionId) || null;

    if (!campSession) {
      return { campSession: null, otherUpcomingSessions: [] };
    }

    const nowIso = this._nowIso();
    const otherUpcomingSessions = sessions
      .filter(
        (c) =>
          c.id !== campSession.id &&
          c.campType === campSession.campType &&
          c.isActive &&
          c.startDate >= nowIso
      )
      .map((c) => ({ campSessionId: c.id, startDate: c.startDate, endDate: c.endDate }));

    return {
      campSession: {
        id: campSession.id,
        name: campSession.name,
        description: campSession.description || '',
        campType: campSession.campType,
        minAge: campSession.minAge,
        maxAge: campSession.maxAge,
        startDate: campSession.startDate,
        endDate: campSession.endDate,
        durationDays: campSession.durationDays,
        groupSizeMax: campSession.groupSizeMax,
        priceTotal: campSession.priceTotal,
        location: campSession.location || ''
      },
      otherUpcomingSessions
    };
  }

  getCampSessionAddOns(campSessionId) {
    const addOns = this._getFromStorage('camp_add_ons').filter(
      (a) => a.campSessionId === campSessionId && a.isActive
    );

    return addOns.map((a) => ({
      campAddOnId: a.id,
      code: a.code,
      name: a.name,
      description: a.description || '',
      price: a.price
    }));
  }

  enrollInCampSession(
    campSessionId,
    campAddOnIds,
    childName,
    childAge,
    emergencyContactPhone,
    parentEmail,
    paymentOption
  ) {
    const sessions = this._getFromStorage('camp_sessions');
    const session = sessions.find((c) => c.id === campSessionId && c.isActive);
    if (!session) {
      return {
        success: false,
        campEnrollmentId: null,
        status: 'pending',
        message: 'Camp session not found or inactive.'
      };
    }

    const enrollments = this._getFromStorage('camp_enrollments');
    const id = this._generateId('camp_enrollment');

    const enrollment = {
      id,
      campSessionId,
      campAddOnIds: Array.isArray(campAddOnIds) ? campAddOnIds : [],
      childName,
      childAge,
      emergencyContactPhone,
      parentEmail,
      paymentOption,
      createdAt: this._nowIso(),
      status: 'pending'
    };

    enrollments.push(enrollment);
    this._saveToStorage('camp_enrollments', enrollments);

    return {
      success: true,
      campEnrollmentId: id,
      status: enrollment.status,
      message: 'Camp enrollment submitted.'
    };
  }

  // -------------------- 7. Trail rides --------------------

  getTrailRideFilterOptions() {
    const rides = this._getFromStorage('trail_rides').filter((r) => r.isActive);
    const slots = this._getFromStorage('trail_ride_schedule_slots');

    const durations = new Set();
    rides.forEach((r) => {
      if (typeof r.durationMinutes === 'number') durations.add(r.durationMinutes);
    });

    const prices = slots.map((s) => s.pricePerRider).filter((v) => typeof v === 'number');
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;

    return {
      timeOfDayOptions: [
        { value: 'morning', label: 'Morning (before 12:00 pm)' },
        { value: 'afternoon', label: 'Afternoon (12:00–5:00 pm)' },
        { value: 'evening', label: 'Evening (after 5:00 pm)' }
      ],
      durationOptions: Array.from(durations).sort((a, b) => a - b),
      ratingThresholds: [
        { value: 4, label: '4.0+ stars' },
        { value: 4.5, label: '4.5+ stars' },
        { value: 5, label: '5 stars' }
      ],
      pricePerRiderRange: {
        min,
        max,
        step: 5
      },
      sortOptions: [
        { value: 'rating_high_to_low', label: 'Rating - High to Low' },
        { value: 'price_per_rider_low_to_high', label: 'Price per rider (Low to High)' },
        { value: 'scenic_rating_high_to_low', label: 'Scenic rating - High to Low' }
      ]
    };
  }

  searchTrailRideOptions(filters, sortBy) {
    const f = filters || {};
    const date = f.date || null;
    const timeOfDay = f.timeOfDay || null;
    const durationMinutes = typeof f.durationMinutes === 'number' ? f.durationMinutes : null;
    const minScenicRating = typeof f.minScenicRating === 'number' ? f.minScenicRating : null;
    const minAverageRating = typeof f.minAverageRating === 'number' ? f.minAverageRating : null;
    const maxPricePerRider = typeof f.maxPricePerRider === 'number' ? f.maxPricePerRider : null;

    const rides = this._getFromStorage('trail_rides').filter((r) => r.isActive);
    const slots = this._getFromStorage('trail_ride_schedule_slots');

    let results = [];

    for (const slot of slots) {
      const ride = rides.find((r) => r.id === slot.trailRideId);
      if (!ride) continue;

      if (date && !this._sameDate(slot.startDatetime, date)) continue;
      if (timeOfDay) {
        const tod = this._getTimeOfDayFromDatetime(slot.startDatetime);
        if (tod !== timeOfDay) continue;
      }
      if (durationMinutes !== null && ride.durationMinutes !== durationMinutes) continue;
      if (minScenicRating !== null && (ride.scenicRating || 0) < minScenicRating) continue;
      if (minAverageRating !== null && (ride.averageRating || 0) < minAverageRating) continue;
      if (maxPricePerRider !== null && slot.pricePerRider > maxPricePerRider) continue;
      if (typeof slot.spotsRemaining === 'number' && slot.spotsRemaining <= 0) continue;

      results.push({
        trailRideId: ride.id,
        trailRideSlotId: slot.id,
        name: ride.name,
        description: ride.description || '',
        durationMinutes: ride.durationMinutes,
        difficultyLevel: ride.difficultyLevel,
        scenicRating: ride.scenicRating || 0,
        averageRating: ride.averageRating || 0,
        startDatetime: slot.startDatetime,
        endDatetime: slot.endDatetime,
        pricePerRider: slot.pricePerRider,
        spotsRemaining: slot.spotsRemaining,
        location: ride.location || '',
        // Foreign key resolution
        trailRide: ride
      });
    }

    switch (sortBy) {
      case 'rating_high_to_low':
        results.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'price_per_rider_low_to_high':
        results.sort((a, b) => a.pricePerRider - b.pricePerRider);
        break;
      case 'scenic_rating_high_to_low':
        results.sort((a, b) => (b.scenicRating || 0) - (a.scenicRating || 0));
        break;
      default:
        break;
    }

    return results;
  }

  getTrailRideDetails(trailRideId) {
    const rides = this._getFromStorage('trail_rides');
    const ride = rides.find((r) => r.id === trailRideId) || null;
    return {
      trailRide: ride
        ? {
            id: ride.id,
            name: ride.name,
            description: ride.description || '',
            durationMinutes: ride.durationMinutes,
            difficultyLevel: ride.difficultyLevel,
            scenicRating: ride.scenicRating || 0,
            averageRating: ride.averageRating || 0,
            basePricePerRider: ride.basePricePerRider,
            location: ride.location || ''
          }
        : null
    };
  }

  getTrailRideScheduleForDate(trailRideId, date) {
    const slots = this._getFromStorage('trail_ride_schedule_slots');
    return slots
      .filter((s) => s.trailRideId === trailRideId && this._sameDate(s.startDatetime, date))
      .map((s) => ({
        trailRideSlotId: s.id,
        startDatetime: s.startDatetime,
        endDatetime: s.endDatetime,
        pricePerRider: s.pricePerRider,
        capacity: s.capacity,
        spotsRemaining: s.spotsRemaining
      }))
      .sort((a, b) => (a.startDatetime || '').localeCompare(b.startDatetime || ''));
  }

  bookTrailRide(trailRideSlotId, adultRiders, childRiders, includeHelmetRental) {
    const slots = this._getFromStorage('trail_ride_schedule_slots');
    const rides = this._getFromStorage('trail_rides');
    const bookings = this._getFromStorage('trail_ride_bookings');

    const slot = slots.find((s) => s.id === trailRideSlotId);
    if (!slot) {
      return {
        success: false,
        trailRideBookingId: null,
        status: 'pending',
        message: 'Trail ride slot not found.'
      };
    }

    const ride = rides.find((r) => r.id === slot.trailRideId);
    if (!ride) {
      return {
        success: false,
        trailRideBookingId: null,
        status: 'pending',
        message: 'Trail ride not found.'
      };
    }

    const adults = typeof adultRiders === 'number' ? adultRiders : 0;
    const children = typeof childRiders === 'number' ? childRiders : 0;
    const totalRiders = adults + children;

    if (totalRiders <= 0) {
      return {
        success: false,
        trailRideBookingId: null,
        status: 'pending',
        message: 'At least one rider is required.'
      };
    }

    if (typeof slot.spotsRemaining === 'number' && slot.spotsRemaining < totalRiders) {
      return {
        success: false,
        trailRideBookingId: null,
        status: 'pending',
        message: 'Not enough spots remaining for this trail ride.'
      };
    }

    if (typeof slot.spotsRemaining === 'number') {
      slot.spotsRemaining = Math.max(0, slot.spotsRemaining - totalRiders);
      this._saveToStorage('trail_ride_schedule_slots', slots);
    }

    const id = this._generateId('trail_ride_booking');
    const booking = {
      id,
      trailRideId: ride.id,
      trailRideSlotId,
      adultRiders: adults,
      childRiders: children,
      includeHelmetRental: !!includeHelmetRental,
      createdAt: this._nowIso(),
      status: 'confirmed'
    };

    bookings.push(booking);
    this._saveToStorage('trail_ride_bookings', bookings);

    return {
      success: true,
      trailRideBookingId: id,
      status: booking.status,
      message: 'Trail ride booked successfully.'
    };
  }

  // -------------------- 8. Gift cards --------------------

  getGiftCardProducts() {
    const products = this._getFromStorage('gift_card_products').filter((p) => p.isActive);
    return products.map((p) => ({
      giftCardProductId: p.id,
      name: p.name,
      type: p.type,
      description: p.description || '',
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      isActive: p.isActive
    }));
  }

  getGiftCardDesigns(theme) {
    let designs = this._getFromStorage('gift_card_designs').filter((d) => d.isActive);
    if (theme) {
      designs = designs.filter((d) => d.theme === theme);
    }
    return designs.map((d) => ({
      designId: d.id,
      name: d.name,
      theme: d.theme,
      imageUrl: d.imageUrl || ''
    }));
  }

  createGiftCardPurchaseAndAddToCart(
    giftCardProductId,
    amount,
    designId,
    deliveryOption,
    scheduledDeliveryDate,
    recipientEmail,
    message
  ) {
    const products = this._getFromStorage('gift_card_products');
    const designs = this._getFromStorage('gift_card_designs');
    const purchases = this._getFromStorage('gift_card_purchases');

    const product = products.find((p) => p.id === giftCardProductId && p.isActive);
    if (!product) {
      return {
        success: false,
        giftCardPurchaseId: null,
        cartId: null,
        cartItemId: null,
        cartTotal: 0,
        message: 'Gift card product not found or inactive.'
      };
    }

    const design = designs.find((d) => d.id === designId && d.isActive);
    if (!design) {
      return {
        success: false,
        giftCardPurchaseId: null,
        cartId: null,
        cartItemId: null,
        cartTotal: 0,
        message: 'Gift card design not found or inactive.'
      };
    }

    const validation = this._validateGiftCardAmount(product, amount);
    if (!validation.valid) {
      return {
        success: false,
        giftCardPurchaseId: null,
        cartId: null,
        cartItemId: null,
        cartTotal: 0,
        message: validation.message
      };
    }

    const delOpt = deliveryOption === 'schedule_for_later' ? 'schedule_for_later' : 'send_now';
    let scheduledIso = null;
    if (delOpt === 'schedule_for_later' && scheduledDeliveryDate) {
      try {
        scheduledIso = new Date(scheduledDeliveryDate).toISOString();
      } catch (e) {
        scheduledIso = scheduledDeliveryDate;
      }
    }

    const id = this._generateId('gift_card_purchase');

    const purchase = {
      id,
      giftCardProductId: product.id,
      amount,
      designId: design.id,
      deliveryOption: delOpt,
      scheduledDeliveryDate: scheduledIso,
      recipientEmail,
      message: message || '',
      createdAt: this._nowIso(),
      status: 'in_cart'
    };

    purchases.push(purchase);
    this._saveToStorage('gift_card_purchases', purchases);

    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItem } = this._addItemToCart(
      cart,
      'gift_card',
      id,
      product.name,
      1,
      amount,
      {
        giftCardProductId: product.id,
        designId: design.id,
        deliveryOption: delOpt,
        scheduledDeliveryDate: scheduledIso,
        recipientEmail
      }
    );

    return {
      success: true,
      giftCardPurchaseId: id,
      cartId: updatedCart.id,
      cartItemId: cartItem.id,
      cartTotal: updatedCart.total,
      message: 'Gift card added to cart.'
    };
  }

  // -------------------- 9. Training & Coaching --------------------

  getTrainingFilterOptions() {
    return {
      disciplines: [
        { value: 'dressage', label: 'Dressage' },
        { value: 'jumping', label: 'Jumping' },
        { value: 'eventing', label: 'Eventing' },
        { value: 'general', label: 'General' }
      ],
      trainerLevels: [
        { value: 'level_1', label: 'Level 1' },
        { value: 'level_2', label: 'Level 2' },
        { value: 'level_3', label: 'Level 3' },
        { value: 'level_4', label: 'Level 4' }
      ]
    };
  }

  searchTrainingSessionTypes(filters) {
    const f = filters || {};
    const discipline = f.discipline || null;
    const minTrainerLevel = f.minTrainerLevel || null;
    const isEvaluation = typeof f.isEvaluation === 'boolean' ? f.isEvaluation : null;

    const sessionTypes = this._getFromStorage('training_session_types').filter(
      (t) => t.isActive
    );
    const trainers = this._getFromStorage('trainers').filter((tr) => tr.isActive);

    let results = [];

    for (const st of sessionTypes) {
      if (discipline && st.discipline !== discipline) continue;
      if (isEvaluation !== null && st.isEvaluation !== isEvaluation) continue;

      const trainer = trainers.find((tr) => tr.id === st.trainerId);
      if (!trainer) continue;

      if (minTrainerLevel) {
        if (this._trainerLevelToNumber(trainer.level) < this._trainerLevelToNumber(minTrainerLevel)) {
          continue;
        }
      }

      results.push({
        trainingSessionTypeId: st.id,
        name: st.name,
        discipline: st.discipline,
        description: st.description || '',
        durationMinutes: st.durationMinutes,
        price: st.price,
        isEvaluation: st.isEvaluation,
        trainer: {
          trainerId: trainer.id,
          fullName: trainer.fullName,
          level: trainer.level,
          averageRating: trainer.averageRating || 0,
          ratingCount: trainer.ratingCount || 0
        }
      });
    }

    return results;
  }

  getTrainingSessionDetails(trainingSessionTypeId) {
    const sessionTypes = this._getFromStorage('training_session_types');
    const trainers = this._getFromStorage('trainers');

    const st = sessionTypes.find((t) => t.id === trainingSessionTypeId) || null;
    if (!st) {
      return { trainingSessionType: null, trainer: null };
    }

    const trainer = trainers.find((tr) => tr.id === st.trainerId) || null;

    return {
      trainingSessionType: {
        id: st.id,
        name: st.name,
        discipline: st.discipline,
        description: st.description || '',
        durationMinutes: st.durationMinutes,
        price: st.price,
        isEvaluation: st.isEvaluation
      },
      trainer: trainer
        ? {
            id: trainer.id,
            fullName: trainer.fullName,
            level: trainer.level,
            bio: trainer.bio || '',
            averageRating: trainer.averageRating || 0,
            ratingCount: trainer.ratingCount || 0,
            photoUrl: trainer.photoUrl || ''
          }
        : null
    };
  }

  getTrainingSessionSchedule(trainingSessionTypeId, filters) {
    const f = filters || {};
    const weekdaysOnly = !!f.weekdaysOnly;
    const weekendsOnly = !!f.weekendsOnly;
    const timeOfDay = f.timeOfDay || null;

    const slots = this._getFromStorage('training_schedule_slots');
    const sessionTypes = this._getFromStorage('training_session_types');
    const trainers = this._getFromStorage('trainers');

    const result = [];

    for (const s of slots) {
      if (s.trainingSessionTypeId !== trainingSessionTypeId) continue;
      if (weekdaysOnly && !s.isWeekday) continue;
      if (weekendsOnly && !s.isWeekend) continue;
      if (timeOfDay && s.timeOfDay !== timeOfDay) continue;
      if (typeof s.spotsRemaining === 'number' && s.spotsRemaining <= 0) continue;

      const st = sessionTypes.find((t) => t.id === s.trainingSessionTypeId) || null;
      const trainer = trainers.find((tr) => tr.id === s.trainerId) || null;

      const item = {
        trainingSlotId: s.id,
        startDatetime: s.startDatetime,
        endDatetime: s.endDatetime,
        timeOfDay: s.timeOfDay,
        isWeekday: s.isWeekday,
        isWeekend: s.isWeekend,
        spotsRemaining: s.spotsRemaining
      };

      // Foreign key resolution for convenience
      if (st) item.trainingSessionType = st;
      if (trainer) item.trainer = trainer;

      result.push(item);
    }

    result.sort((a, b) => (a.startDatetime || '').localeCompare(b.startDatetime || ''));
    return result;
  }

  submitTrainingEvaluationRequest(
    trainingSlotId,
    horseName,
    horseAge,
    horseBreed,
    horsePrimaryDiscipline,
    riderName,
    riderEmail,
    riderPhone
  ) {
    const slots = this._getFromStorage('training_schedule_slots');
    const sessionTypes = this._getFromStorage('training_session_types');
    const requests = this._getFromStorage('training_evaluation_requests');

    const slot = slots.find((s) => s.id === trainingSlotId);
    if (!slot) {
      return {
        success: false,
        trainingEvaluationRequestId: null,
        status: 'pending',
        message: 'Training slot not found.'
      };
    }

    const st = sessionTypes.find((t) => t.id === slot.trainingSessionTypeId);
    if (!st || !st.isEvaluation) {
      // Still allow but warn
      // The interface does not carry an error flag, we just proceed
    }

    // Decrement spotsRemaining if capacity is tracked
    if (typeof slot.spotsRemaining === 'number') {
      if (slot.spotsRemaining <= 0) {
        return {
          success: false,
          trainingEvaluationRequestId: null,
          status: 'pending',
          message: 'No spots remaining for this training slot.'
        };
      }
      slot.spotsRemaining = Math.max(0, slot.spotsRemaining - 1);
      this._saveToStorage('training_schedule_slots', slots);
    }

    const id = this._generateId('training_eval');
    const req = {
      id,
      trainingSessionTypeId: slot.trainingSessionTypeId,
      trainingSlotId,
      horseName,
      horseAge,
      horseBreed,
      horsePrimaryDiscipline,
      riderName,
      riderEmail,
      riderPhone,
      createdAt: this._nowIso(),
      status: 'pending'
    };

    requests.push(req);
    this._saveToStorage('training_evaluation_requests', requests);

    return {
      success: true,
      trainingEvaluationRequestId: id,
      status: req.status,
      message: 'Training evaluation request submitted.'
    };
  }

  // -------------------- 10. Events --------------------

  getEventFilterOptions() {
    return {
      eventTypes: [
        { value: 'open_house', label: 'Open House' },
        { value: 'barn_tour', label: 'Barn Tour' },
        { value: 'clinic', label: 'Clinic' },
        { value: 'show', label: 'Show' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  searchEvents(filters) {
    const f = filters || {};
    const eventTypes = Array.isArray(f.eventTypes) ? f.eventTypes : [];
    const startDateFrom = f.startDateFrom || null;
    const startDateTo = f.startDateTo || null;

    let events = this._getFromStorage('events').filter((e) => e.isActive);

    if (eventTypes.length) {
      events = events.filter((e) => eventTypes.includes(e.eventType));
    }

    if (startDateFrom) {
      events = events.filter((e) => e.startDate >= startDateFrom);
    }
    if (startDateTo) {
      events = events.filter((e) => e.startDate <= startDateTo);
    }

    events.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    return events.map((e) => ({
      eventId: e.id,
      title: e.title,
      eventType: e.eventType,
      description: e.description || '',
      location: e.location || '',
      startDate: e.startDate,
      endDate: e.endDate
    }));
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const e = events.find((ev) => ev.id === eventId) || null;
    return {
      event: e
        ? {
            id: e.id,
            title: e.title,
            description: e.description || '',
            eventType: e.eventType,
            location: e.location || '',
            startDate: e.startDate,
            endDate: e.endDate
          }
        : null
    };
  }

  getEventSchedule(eventId) {
    const slots = this._getFromStorage('event_time_slots').filter((s) => s.eventId === eventId);
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    return slots
      .map((s) => {
        const item = {
          eventTimeSlotId: s.id,
          name: s.name || '',
          startDatetime: this._normalizeDatetimeForDisplay(s.startDatetime),
          endDatetime: this._normalizeDatetimeForDisplay(s.endDatetime),
          isBarnTour: !!s.isBarnTour,
          capacity: s.capacity,
          spotsRemaining: s.spotsRemaining
        };
        if (event) item.event = event; // foreign key resolution convenience
        return item;
      })
      .sort((a, b) => (a.startDatetime || '').localeCompare(b.startDatetime || ''));
  }

  getEventAddOns(eventId) {
    const addOns = this._getFromStorage('event_add_ons').filter(
      (a) => a.eventId === eventId && a.isActive
    );
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    return addOns.map((a) => {
      const item = {
        eventAddOnId: a.id,
        code: a.code,
        name: a.name,
        description: a.description || '',
        price: a.price
      };
      if (event) item.event = event; // fk resolution
      return item;
    });
  }

  registerForEvent(
    eventTimeSlotId,
    eventAddOnIds,
    participantCount,
    contactName,
    email,
    phone,
    emergencyContact
  ) {
    const slots = this._getFromStorage('event_time_slots');
    const addOns = this._getFromStorage('event_add_ons');
    const registrations = this._getFromStorage('event_registrations');

    const slot = slots.find((s) => s.id === eventTimeSlotId);
    if (!slot) {
      return {
        success: false,
        eventRegistrationId: null,
        status: 'pending',
        message: 'Event time slot not found.'
      };
    }

    const count = typeof participantCount === 'number' ? participantCount : 0;
    if (count <= 0) {
      return {
        success: false,
        eventRegistrationId: null,
        status: 'pending',
        message: 'At least one participant is required.'
      };
    }

    if (typeof slot.spotsRemaining === 'number' && slot.spotsRemaining < count) {
      return {
        success: false,
        eventRegistrationId: null,
        status: 'pending',
        message: 'Not enough spots remaining for this event.'
      };
    }

    // Validate add-ons belong to the same event
    const addOnIdsArr = Array.isArray(eventAddOnIds) ? eventAddOnIds : [];
    const validAddOnIds = addOnIdsArr.filter((id) => {
      const ao = addOns.find((a) => a.id === id && a.isActive);
      return ao && ao.eventId === slot.eventId;
    });

    if (typeof slot.spotsRemaining === 'number') {
      slot.spotsRemaining = Math.max(0, slot.spotsRemaining - count);
      this._saveToStorage('event_time_slots', slots);
    }

    const id = this._generateId('event_reg');

    const reg = {
      id,
      eventId: slot.eventId,
      eventTimeSlotId,
      addOnIds: validAddOnIds,
      participantCount: count,
      contactName,
      email,
      phone,
      emergencyContact: emergencyContact || '',
      createdAt: this._nowIso(),
      status: 'pending'
    };

    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      eventRegistrationId: id,
      status: reg.status,
      message: 'Event registration completed.'
    };
  }

  // -------------------- 11. Cart & Checkout --------------------

  getCartSummary() {
    const carts = this._getFromStorage('cart');
    const activeCart = carts.find((c) => c.status === 'active');

    if (!activeCart) {
      return {
        cartId: null,
        status: 'empty',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'USD'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === activeCart.id
    );

    const lessonPackages = this._getFromStorage('lesson_packages');
    const membershipSetups = this._getFromStorage('membership_setups');
    const giftCardPurchases = this._getFromStorage('gift_card_purchases');

    const items = cartItems.map((ci) => {
      let reference = null;
      if (ci.itemType === 'lesson_package') {
        reference = lessonPackages.find((p) => p.id === ci.referenceId) || null;
      } else if (ci.itemType === 'membership_setup') {
        reference = membershipSetups.find((s) => s.id === ci.referenceId) || null;
      } else if (ci.itemType === 'gift_card') {
        reference = giftCardPurchases.find((g) => g.id === ci.referenceId) || null;
      }

      return {
        cartItemId: ci.id,
        itemType: ci.itemType,
        referenceId: ci.referenceId,
        name: ci.name,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        metadata: ci.metadata || null,
        // Foreign key resolution using field name without 'Id'
        reference
      };
    });

    return {
      cartId: activeCart.id,
      status: activeCart.status,
      items,
      subtotal: activeCart.subtotal,
      tax: activeCart.tax || 0,
      total: activeCart.total,
      currency: activeCart.currency
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        newQuantity: 0,
        cartTotal: 0,
        message: 'Cart item not found.'
      };
    }

    const cartId = item.cartId;

    if (quantity <= 0) {
      // Remove item
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', cartItems);
      const cart = this._recalculateCartTotals(cartId);
      return {
        success: true,
        cartId: cart ? cart.id : null,
        cartItemId,
        newQuantity: 0,
        cartTotal: cart ? cart.total : 0,
        message: 'Cart item removed.'
      };
    }

    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cartId: cart ? cart.id : null,
      cartItemId,
      newQuantity: quantity,
      cartTotal: cart ? cart.total : 0,
      message: 'Cart item quantity updated.'
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cartId: null,
        cartTotal: 0,
        message: 'Cart item not found.'
      };
    }

    const cartId = item.cartId;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cartId: cart ? cart.id : null,
      cartTotal: cart ? cart.total : 0,
      message: 'Cart item removed.'
    };
  }

  proceedToCheckout() {
    const carts = this._getFromStorage('cart');
    const activeCart = carts.find((c) => c.status === 'active');
    if (!activeCart) {
      return {
        success: false,
        orderId: null,
        orderStatus: null,
        total: 0,
        currency: 'USD',
        message: 'No active cart.'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === activeCart.id
    );

    if (cartItems.length === 0) {
      return {
        success: false,
        orderId: null,
        orderStatus: null,
        total: 0,
        currency: activeCart.currency,
        message: 'Cart is empty.'
      };
    }

    const order = this._createOrderFromCart(activeCart.id);
    if (!order) {
      return {
        success: false,
        orderId: null,
        orderStatus: null,
        total: 0,
        currency: activeCart.currency,
        message: 'Failed to create order.'
      };
    }

    return {
      success: true,
      orderId: order.id,
      orderStatus: order.status,
      total: order.total,
      currency: order.currency,
      message: 'Checkout started.'
    };
  }

  getOrderSummary(orderId) {
    const orders = this._getFromStorage('orders');
    const order = orders.find((o) => o.id === orderId) || null;

    if (!order) {
      return {
        orderId: null,
        createdAt: null,
        status: null,
        total: 0,
        currency: 'USD',
        items: []
      };
    }

    const orderItems = this._getFromStorage('order_items').filter(
      (oi) => oi.orderId === order.id
    );

    const lessonPackages = this._getFromStorage('lesson_packages');
    const membershipSetups = this._getFromStorage('membership_setups');
    const giftCardPurchases = this._getFromStorage('gift_card_purchases');

    const items = orderItems.map((oi) => {
      let reference = null;
      if (oi.itemType === 'lesson_package') {
        reference = lessonPackages.find((p) => p.id === oi.referenceId) || null;
      } else if (oi.itemType === 'membership_setup') {
        reference = membershipSetups.find((s) => s.id === oi.referenceId) || null;
      } else if (oi.itemType === 'gift_card') {
        reference = giftCardPurchases.find((g) => g.id === oi.referenceId) || null;
      }

      return {
        orderItemId: oi.id,
        itemType: oi.itemType,
        referenceId: oi.referenceId,
        name: oi.name,
        quantity: oi.quantity,
        unitPrice: oi.unitPrice,
        totalPrice: oi.totalPrice,
        reference
      };
    });

    return {
      orderId: order.id,
      createdAt: order.createdAt,
      status: order.status,
      total: order.total,
      currency: order.currency,
      items
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
