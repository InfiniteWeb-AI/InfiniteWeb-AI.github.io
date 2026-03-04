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

  // ==========================
  // Storage helpers
  // ==========================

  _initStorage() {
    const keys = [
      'instructors',
      'lesson_bookings',
      'recurring_lessons',
      'lesson_packages',
      'performance_packages',
      'performance_quote_requests',
      'subscription_plans',
      'subscription_enrollments',
      'group_classes',
      'group_enrollments',
      'gift_card_products',
      'articles',
      'favorite_instructors',
      'reading_list_items',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'contact_tickets',
      'about_content',
      'contact_info',
      'policies_content'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // For simple content blocks, initialise as null, others as []
        if (key === 'about_content' || key === 'contact_info' || key === 'policies_content') {
          localStorage.setItem(key, 'null');
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      // We always work with arrays for entity collections
      if (Array.isArray(parsed)) return parsed;
      // For content blocks
      return parsed;
    } catch (e) {
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

  _parseIsoToDate(isoString) {
    return new Date(isoString);
  }

  _getDayOfWeekEnum(dateObj) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dateObj.getDay()];
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  _paginate(items, page = 1, pageSize = 20) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * size;
    const end = start + size;
    return {
      total: items.length,
      page: p,
      pageSize: size,
      results: items.slice(start, end)
    };
  }

  // ==========================
  // Cart helpers (private)
  // ==========================

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) carts = [];

    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        created_at: this._nowIso(),
        updated_at: null
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) carts = [];
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx === -1) {
      carts.push(cart);
    } else {
      carts[idx] = cart;
    }
    this._saveToStorage('cart', carts);
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const items = cartItems.filter((ci) => ci.cart_id === cartId);
    let subtotal = 0;
    let totalItems = 0;
    items.forEach((item) => {
      subtotal += item.total_price || 0;
      totalItems += item.quantity || 0;
    });
    return { subtotal, totalItems };
  }

  // ==========================
  // Availability & validation helpers (private)
  // ==========================

  _getInstructorPriceForDuration(instructor, durationMinutes) {
    if (!instructor) return null;
    if (durationMinutes === 30) return instructor.price_30_min != null ? instructor.price_30_min : null;
    if (durationMinutes === 45) return instructor.price_45_min != null ? instructor.price_45_min : null;
    if (durationMinutes === 60) return instructor.price_60_min != null ? instructor.price_60_min : null;
    return null;
  }

  _validateInstructorAvailability(instructorId, startDatetimeIso, durationMinutes) {
    const instructors = this._getFromStorage('instructors');
    const instructor = instructors.find((i) => i.id === instructorId);
    if (!instructor) {
      return { available: false, reason: 'instructor_not_found' };
    }

    const start = this._parseIsoToDate(startDatetimeIso);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Check against instructor availability_calendar if present
    let withinCalendar = true;
    if (Array.isArray(instructor.availability_calendar) && instructor.availability_calendar.length > 0) {
      withinCalendar = instructor.availability_calendar.some((slot) => {
        // Ignore slots that are already booked
        if (slot.is_booked === true) return false;

        let startIso;
        let endIso;

        if (slot.startDatetime && slot.endDatetime) {
          // ISO-based calendar format
          startIso = slot.startDatetime;
          endIso = slot.endDatetime;
        } else if (slot.date && slot.start_time && slot.end_time) {
          // Date + time fields format from generated data
          startIso = slot.date + 'T' + slot.start_time + ':00.000Z';
          endIso = slot.date + 'T' + slot.end_time + ':00.000Z';
        } else {
          return false;
        }

        const s = this._parseIsoToDate(startIso);
        const e = this._parseIsoToDate(endIso);
        return start >= s && end <= e;
      });
    }

    if (!withinCalendar) {
      return { available: false, reason: 'outside_instructor_calendar' };
    }

    // Check against existing bookings for overlaps
    const bookings = this._getFromStorage('lesson_bookings');
    const overlapping = bookings.some((b) => {
      if (b.instructor_id !== instructorId) return false;
      if (b.status === 'cancelled') return false;
      const bs = this._parseIsoToDate(b.start_datetime);
      const be = this._parseIsoToDate(b.end_datetime);
      // overlap if start < be && end > bs
      return start < be && end > bs;
    });

    if (overlapping) {
      return { available: false, reason: 'time_conflict' };
    }

    return { available: true, reason: null };
  }

  _validatePerformanceBudgetAndDuration(pkg, budget, eventStartIso, eventEndIso) {
    if (!pkg) {
      return { valid: false, reason: 'package_not_found' };
    }
    const start = this._parseIsoToDate(eventStartIso);
    const end = this._parseIsoToDate(eventEndIso);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;

    if (durationMinutes <= 0) {
      return { valid: false, reason: 'invalid_duration' };
    }

    // Basic duration check: event duration should be at least base_duration_minutes
    if (typeof pkg.base_duration_minutes === 'number' && durationMinutes < pkg.base_duration_minutes) {
      return { valid: false, reason: 'duration_too_short' };
    }

    // Budget checks using min_price / max_price / base_price
    const minPrice = typeof pkg.min_price === 'number' ? pkg.min_price : pkg.base_price;
    if (budget < minPrice) {
      return { valid: false, reason: 'budget_too_low' };
    }

    if (typeof pkg.max_price === 'number' && budget > pkg.max_price) {
      // We still allow, but flag reason
      return { valid: true, reason: 'budget_above_package_max' };
    }

    return { valid: true, reason: null };
  }

  // ==========================
  // 1) getHomeHighlights
  // ==========================

  getHomeHighlights() {
    const instructors = this._getFromStorage('instructors').filter((i) => i.is_active !== false);
    const lessonPackages = this._getFromStorage('lesson_packages').filter((p) => p.is_active !== false);
    const groupClasses = this._getFromStorage('group_classes').filter((g) => g.is_active !== false);
    const performancePackages = this._getFromStorage('performance_packages').filter((p) => p.is_active !== false);
    const subscriptionPlans = this._getFromStorage('subscription_plans').filter((s) => s.is_active !== false);
    const giftCardProducts = this._getFromStorage('gift_card_products').filter((g) => g.is_active !== false);

    // Featured instructors: top rating then most reviews
    const featuredInstructors = instructors
      .slice()
      .sort((a, b) => {
        if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
        return (b.review_count || 0) - (a.review_count || 0);
      })
      .slice(0, 6)
      .map((i) => ({
        instructorId: i.id,
        name: i.name,
        photoUrl: i.photo_url || null,
        primaryInstruments: Array.isArray(i.instruments) ? i.instruments : [],
        rating: i.rating,
        reviewCount: i.review_count,
        badgeText: i.rating >= 4.8 ? 'Top Rated' : i.recurring_lessons_available ? 'Recurring Lessons' : ''
      }));

    const featuredLessonPackages = lessonPackages
      .slice()
      .sort((a, b) => (a.total_price || 0) - (b.total_price || 0))
      .slice(0, 6);

    const featuredGroupClasses = groupClasses
      .slice()
      .sort((a, b) => {
        const aDate = this._parseIsoToDate(a.start_date);
        const bDate = this._parseIsoToDate(b.start_date);
        return aDate - bDate;
      })
      .slice(0, 6);

    const featuredPerformancePackages = performancePackages
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);

    const promotions = [];

    // Derive a promotion from best trial subscription plan, if any
    if (subscriptionPlans.length > 0) {
      const trialPlans = subscriptionPlans
        .filter((p) => (p.free_trial_days || 0) > 0)
        .slice()
        .sort((a, b) => (b.free_trial_days || 0) - (a.free_trial_days || 0));
      if (trialPlans.length > 0) {
        const p = trialPlans[0];
        promotions.push({
          promotionId: 'promo_subscription_' + p.id,
          title: p.name,
          description: p.description || 'Free trial available for resources subscription.',
          context: 'subscription_trial',
          highlightText:
            (p.free_trial_days || 0) + ' days free • ' + p.price_per_billing_cycle + ' per ' + p.billing_cycle
        });
      }
    }

    // Derive a promotion from gift cards, if any
    if (giftCardProducts.length > 0) {
      const g = giftCardProducts[0];
      promotions.push({
        promotionId: 'promo_giftcard_' + g.id,
        title: g.name,
        description: g.description || 'Flexible music lessons gift card.',
        context: 'gift_card_offer',
        highlightText: 'Themes: ' + (Array.isArray(g.available_themes) ? g.available_themes.join(', ') : '')
      });
    }

    return {
      featuredInstructors,
      featuredLessonPackages,
      featuredGroupClasses,
      featuredPerformancePackages,
      promotions
    };
  }

  // ==========================
  // 2) getLessonFilterOptions
  // ==========================

  getLessonFilterOptions() {
    return {
      instruments: [
        { value: 'guitar', label: 'Guitar' },
        { value: 'piano', label: 'Piano' },
        { value: 'voice', label: 'Voice' },
        { value: 'violin', label: 'Violin' },
        { value: 'drums', label: 'Drums' },
        { value: 'ukulele', label: 'Ukulele' },
        { value: 'other', label: 'Other' }
      ],
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All Levels' }
      ],
      genres: ['pop', 'rock', 'jazz', 'classical', 'acoustic', 'blues', 'folk', 'metal', 'other'],
      formats: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      durationsMinutes: [30, 45, 60, 90],
      priceRanges: [
        { min: 0, max: 40, label: 'Up to $40' },
        { min: 0, max: 60, label: 'Up to $60' },
        { min: 0, max: 80, label: 'Up to $80' },
        { min: 0, max: 100, label: 'Up to $100' }
      ],
      ratingThresholds: [
        { minRating: 4.0, label: '4.0 stars & up' },
        { minRating: 4.5, label: '4.5 stars & up' },
        { minRating: 4.7, label: '4.7 stars & up' }
      ],
      availabilityPresets: [
        { value: 'weekdays', label: 'Weekdays' },
        { value: 'weekends', label: 'Weekends' },
        { value: 'evenings', label: 'Evenings' }
      ],
      sortOptions: [
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'name_a_to_z', label: 'Name: A to Z' }
      ]
    };
  }

  // ==========================
  // 3) searchInstructors
  // ==========================

  searchInstructors(filters, sortBy, page = 1, pageSize = 20, viewMode) {
    const favs = this._getFromStorage('favorite_instructors');
    const favoriteIds = new Set(favs.map((f) => f.instructor_id));

    let instructors = this._getFromStorage('instructors').filter((i) => i.is_active !== false);

    const f = filters || {};

    instructors = instructors.filter((i) => {
      if (f.instrument && (!Array.isArray(i.instruments) || !i.instruments.includes(f.instrument))) {
        return false;
      }
      if (f.level) {
        const levels = Array.isArray(i.levels) ? i.levels : [];
        // if instructor teaches all_levels, allow any; else require filter.level be in list
        if (!levels.includes('all_levels') && !levels.includes(f.level)) {
          return false;
        }
      }
      if (f.genre) {
        const genres = Array.isArray(i.genres) ? i.genres : [];
        if (!genres.includes(f.genre)) return false;
      }
      if (f.format) {
        const formats = Array.isArray(i.lesson_formats) ? i.lesson_formats : [];
        if (!formats.includes(f.format)) return false;
      }

      // Price filtering: based on requested duration
      if (typeof f.minPrice === 'number' || typeof f.maxPrice === 'number') {
        const durationMinutes = f.durationMinutes || 30;
        const price = this._getInstructorPriceForDuration(i, durationMinutes);
        if (typeof price !== 'number') return false;
        if (typeof f.minPrice === 'number' && price < f.minPrice) return false;
        if (typeof f.maxPrice === 'number' && price > f.maxPrice) return false;
      }

      if (typeof f.minRating === 'number' && (i.rating || 0) < f.minRating) return false;
      if (typeof f.minReviewCount === 'number' && (i.review_count || 0) < f.minReviewCount) return false;

      // Availability presets
      if (f.availabilityPreset === 'weekends') {
        const days = Array.isArray(i.availability_days_of_week) ? i.availability_days_of_week : [];
        if (!days.includes('saturday') && !days.includes('sunday')) return false;
      }
      if (f.availabilityPreset === 'weekdays') {
        const days = Array.isArray(i.availability_days_of_week) ? i.availability_days_of_week : [];
        const hasWeekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some((d) =>
          days.includes(d)
        );
        if (!hasWeekday) return false;
      }
      if (f.availabilityPreset === 'evenings') {
        // Check if at least one availability_calendar slot starting at or after 17:00
        const cal = Array.isArray(i.availability_calendar) ? i.availability_calendar : [];
        const hasEvening = cal.some((slot) => {
          if (!slot.startDatetime) return false;
          const d = this._parseIsoToDate(slot.startDatetime);
          const minutes = d.getHours() * 60 + d.getMinutes();
          return minutes >= 17 * 60;
        });
        if (!hasEvening) return false;
      }

      // Specific day/time availability using availability_calendar if provided
      if (f.availabilityDayOfWeek || f.availabilityTimeFrom || f.availabilityTimeTo) {
        const cal = Array.isArray(i.availability_calendar) ? i.availability_calendar : [];
        if (cal.length === 0) {
          // If no detailed calendar, we fall back to availability_days_of_week for day-of-week only
          if (f.availabilityDayOfWeek) {
            const days = Array.isArray(i.availability_days_of_week) ? i.availability_days_of_week : [];
            if (!days.includes(f.availabilityDayOfWeek)) return false;
          }
        } else {
          const fromMinutes = this._parseTimeToMinutes(f.availabilityTimeFrom) ?? 0;
          const toMinutes = this._parseTimeToMinutes(f.availabilityTimeTo) ?? (24 * 60);
          const hasSlot = cal.some((slot) => {
            if (!slot.startDatetime) return false;
            const d = this._parseIsoToDate(slot.startDatetime);
            const dayEnum = this._getDayOfWeekEnum(d);
            if (f.availabilityDayOfWeek && dayEnum !== f.availabilityDayOfWeek) return false;
            const mins = d.getHours() * 60 + d.getMinutes();
            return mins >= fromMinutes && mins <= toMinutes;
          });
          if (!hasSlot) return false;
        }
      }

      if (f.recurringLessonsOnly && !i.recurring_lessons_available) return false;

      return true;
    });

    // Sorting
    if (sortBy === 'rating_high_to_low') {
      instructors.sort((a, b) => {
        if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
        return (b.review_count || 0) - (a.review_count || 0);
      });
    } else if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low') {
      const durationMinutes = (filters && filters.durationMinutes) || 30;
      instructors.sort((a, b) => {
        const pa = this._getInstructorPriceForDuration(a, durationMinutes) || Number.MAX_SAFE_INTEGER;
        const pb = this._getInstructorPriceForDuration(b, durationMinutes) || Number.MAX_SAFE_INTEGER;
        return sortBy === 'price_low_to_high' ? pa - pb : pb - pa;
      });
    } else if (sortBy === 'name_a_to_z') {
      instructors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const paginated = this._paginate(instructors, page, pageSize);

    const results = paginated.results.map((i) => ({
      instructorId: i.id,
      name: i.name,
      photoUrl: i.photo_url || null,
      instruments: Array.isArray(i.instruments) ? i.instruments : [],
      levels: Array.isArray(i.levels) ? i.levels : [],
      genres: Array.isArray(i.genres) ? i.genres : [],
      lessonFormats: Array.isArray(i.lesson_formats) ? i.lesson_formats : [],
      price30Min: i.price_30_min != null ? i.price_30_min : null,
      price45Min: i.price_45_min != null ? i.price_45_min : null,
      price60Min: i.price_60_min != null ? i.price_60_min : null,
      rating: i.rating,
      reviewCount: i.review_count,
      recurringLessonsAvailable: !!i.recurring_lessons_available,
      recurringBadgeText: i.recurring_lessons_available ? 'Recurring Lessons Available' : '',
      availabilitySummary: Array.isArray(i.availability_days_of_week)
        ? i.availability_days_of_week.join(', ')
        : '',
      isFavorited: favoriteIds.has(i.id)
    }));

    return {
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
      results
    };
  }

  // ==========================
  // 4) getInstructorDetails
  // ==========================

  getInstructorDetails(instructorId) {
    const instructors = this._getFromStorage('instructors');
    const instructor = instructors.find((i) => i.id === instructorId) || null;
    const favs = this._getFromStorage('favorite_instructors');
    const isFavorited = favs.some((f) => f.instructor_id === instructorId);

    if (!instructor) {
      return {
        instructor: null,
        ratingLabel: '',
        badges: [],
        availabilitySummary: '',
        isFavorited
      };
    }

    let ratingLabel = '';
    if (instructor.rating >= 4.8) ratingLabel = 'Exceptional (' + instructor.rating.toFixed(1) + ')';
    else if (instructor.rating >= 4.5) ratingLabel = 'Highly Rated (' + instructor.rating.toFixed(1) + ')';
    else if (instructor.rating > 0) ratingLabel = 'Rating ' + instructor.rating.toFixed(1);

    const badges = [];
    if (instructor.review_count >= 20 && instructor.rating >= 4.7) badges.push('Student Favorite');
    if (instructor.recurring_lessons_available) badges.push('Recurring Lessons Available');

    const availabilitySummary = Array.isArray(instructor.availability_days_of_week)
      ? instructor.availability_days_of_week.join(', ')
      : '';

    return {
      instructor,
      ratingLabel,
      badges,
      availabilitySummary,
      isFavorited
    };
  }

  // ==========================
  // 5) getInstructorAvailability
  // ==========================

  getInstructorAvailability(instructorId, startDate, endDate, durationMinutes, timeFrom, timeTo) {
    const instructors = this._getFromStorage('instructors');
    const instructor = instructors.find((i) => i.id === instructorId);
    if (!instructor || !Array.isArray(instructor.availability_calendar)) {
      return [];
    }

    const rangeStart = new Date(startDate + 'T00:00:00.000Z');
    const rangeEnd = new Date(endDate + 'T23:59:59.999Z');
    const fromMinutes = this._parseTimeToMinutes(timeFrom) ?? 0;
    const toMinutes = this._parseTimeToMinutes(timeTo) ?? 24 * 60;

    const buildSlotIso = (slot) => {
      if (slot.startDatetime && slot.endDatetime) {
        // ISO-based calendar format
        return { startIso: slot.startDatetime, endIso: slot.endDatetime };
      }
      if (slot.date && slot.start_time && slot.end_time) {
        // Date + time fields format from generated data
        return {
          startIso: slot.date + 'T' + slot.start_time + ':00.000Z',
          endIso: slot.date + 'T' + slot.end_time + ':00.000Z'
        };
      }
      return null;
    };

    return instructor.availability_calendar
      .filter((slot) => {
        // Ignore slots that are already booked
        if (slot.is_booked === true) return false;

        const iso = buildSlotIso(slot);
        if (!iso) return false;
        const s = this._parseIsoToDate(iso.startIso);
        const e = this._parseIsoToDate(iso.endIso);
        if (s < rangeStart || s > rangeEnd) return false;
        const mins = s.getUTCHours() * 60 + s.getUTCMinutes();
        if (mins < fromMinutes || mins > toMinutes) return false;
        const slotDuration = (e.getTime() - s.getTime()) / 60000;
        if (durationMinutes && slotDuration !== durationMinutes) return false;
        return true;
      })
      .map((slot) => {
        const iso = buildSlotIso(slot);
        const startIso = iso ? iso.startIso : null;
        const endIso = iso ? iso.endIso : null;

        let duration;
        if (typeof slot.duration_minutes === 'number') {
          duration = slot.duration_minutes;
        } else if (typeof slot.durationMinutes === 'number') {
          duration = slot.durationMinutes;
        } else if (startIso && endIso) {
          duration = (this._parseIsoToDate(endIso) - this._parseIsoToDate(startIso)) / 60000;
        } else {
          duration = durationMinutes || null;
        }

        return {
          startDatetime: startIso,
          endDatetime: endIso,
          durationMinutes: duration,
          isRecurringEligible: !!instructor.recurring_lessons_available
        };
      });
  }

  // ==========================
  // 6) bookOneOffLesson
  // ==========================

  bookOneOffLesson(
    instructorId,
    instrument,
    level,
    format,
    durationMinutes,
    startDatetime,
    studentName,
    studentEmail,
    studentPhone
  ) {
    const instructors = this._getFromStorage('instructors');
    const instructor = instructors.find((i) => i.id === instructorId);
    if (!instructor || instructor.is_active === false) {
      return { success: false, message: 'Instructor not found or inactive.', booking: null };
    }

    // Basic compatibility checks
    if (instrument && Array.isArray(instructor.instruments) && !instructor.instruments.includes(instrument)) {
      return { success: false, message: 'Instructor does not teach this instrument.', booking: null };
    }
    if (level) {
      const levels = Array.isArray(instructor.levels) ? instructor.levels : [];
      if (!levels.includes('all_levels') && !levels.includes(level)) {
        return { success: false, message: 'Instructor does not teach this level.', booking: null };
      }
    }
    if (format && Array.isArray(instructor.lesson_formats) && !instructor.lesson_formats.includes(format)) {
      return { success: false, message: 'Instructor does not offer this format.', booking: null };
    }

    const availability = this._validateInstructorAvailability(instructorId, startDatetime, durationMinutes);
    if (!availability.available) {
      return { success: false, message: 'Requested time is not available.', booking: null };
    }

    const price = this._getInstructorPriceForDuration(instructor, durationMinutes) || 0;
    const start = this._parseIsoToDate(startDatetime);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const bookings = this._getFromStorage('lesson_bookings');
    const booking = {
      id: this._generateId('lesson_booking'),
      instructor_id: instructorId,
      instrument,
      level: level || null,
      format,
      duration_minutes: durationMinutes,
      price,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      student_name: studentName,
      student_email: studentEmail,
      student_phone: studentPhone,
      status: 'confirmed',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('lesson_bookings', bookings);

    return {
      success: true,
      message: 'Lesson booked successfully.',
      booking
    };
  }

  // ==========================
  // 7) createRecurringLessonSchedule
  // ==========================

  createRecurringLessonSchedule(
    instructorId,
    instrument,
    genre,
    format,
    durationMinutes,
    firstLessonDatetime,
    recurrenceDayOfWeek,
    numberOfWeeks,
    studentName,
    studentEmail
  ) {
    const instructors = this._getFromStorage('instructors');
    const instructor = instructors.find((i) => i.id === instructorId);
    if (!instructor || instructor.is_active === false) {
      return { success: false, message: 'Instructor not found or inactive.', schedule: null };
    }

    if (!instructor.recurring_lessons_available) {
      return { success: false, message: 'Instructor does not offer recurring lessons.', schedule: null };
    }

    if (instrument && Array.isArray(instructor.instruments) && !instructor.instruments.includes(instrument)) {
      return { success: false, message: 'Instructor does not teach this instrument.', schedule: null };
    }

    if (format && Array.isArray(instructor.lesson_formats) && !instructor.lesson_formats.includes(format)) {
      return { success: false, message: 'Instructor does not offer this format.', schedule: null };
    }

    const firstDate = this._parseIsoToDate(firstLessonDatetime);
    const dayEnum = this._getDayOfWeekEnum(firstDate);
    if (recurrenceDayOfWeek && dayEnum !== recurrenceDayOfWeek) {
      return {
        success: false,
        message: 'First lesson date does not match recurrence day of week.',
        schedule: null
      };
    }

    // Validate first occurrence availability
    const avail = this._validateInstructorAvailability(instructorId, firstLessonDatetime, durationMinutes);
    if (!avail.available) {
      return { success: false, message: 'First lesson time is not available.', schedule: null };
    }

    const schedules = this._getFromStorage('recurring_lessons');
    const schedule = {
      id: this._generateId('recurring_lesson'),
      instructor_id: instructorId,
      instrument,
      genre: genre || null,
      format,
      duration_minutes: durationMinutes,
      first_lesson_datetime: firstDate.toISOString(),
      recurrence_day_of_week: recurrenceDayOfWeek || dayEnum,
      number_of_weeks: numberOfWeeks,
      student_name: studentName,
      student_email: studentEmail,
      status: 'active',
      created_at: this._nowIso()
    };

    schedules.push(schedule);
    this._saveToStorage('recurring_lessons', schedules);

    return {
      success: true,
      message: 'Recurring lesson schedule created.',
      schedule
    };
  }

  // ==========================
  // 8) addFavoriteInstructor
  // ==========================

  addFavoriteInstructor(instructorId) {
    const instructors = this._getFromStorage('instructors');
    const instructor = instructors.find((i) => i.id === instructorId);
    if (!instructor) {
      return { success: false, message: 'Instructor not found.', favorite: null };
    }

    let favorites = this._getFromStorage('favorite_instructors');
    if (!Array.isArray(favorites)) favorites = [];

    if (favorites.some((f) => f.instructor_id === instructorId)) {
      return { success: true, message: 'Instructor already in favorites.', favorite: null };
    }

    const favorite = {
      id: this._generateId('favorite_instructor'),
      instructor_id: instructorId,
      saved_at: this._nowIso()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_instructors', favorites);

    return {
      success: true,
      message: 'Instructor added to favorites.',
      favorite
    };
  }

  // ==========================
  // 9) removeFavoriteInstructor
  // ==========================

  removeFavoriteInstructor(instructorId) {
    let favorites = this._getFromStorage('favorite_instructors');
    if (!Array.isArray(favorites)) favorites = [];
    const initial = favorites.length;
    favorites = favorites.filter((f) => f.instructor_id !== instructorId);
    this._saveToStorage('favorite_instructors', favorites);

    return {
      success: true,
      message: initial === favorites.length ? 'Instructor was not in favorites.' : 'Instructor removed from favorites.'
    };
  }

  // ==========================
  // 10) getLessonPackageFilterOptions
  // ==========================

  getLessonPackageFilterOptions() {
    return {
      instruments: [
        { value: 'guitar', label: 'Guitar' },
        { value: 'piano', label: 'Piano' },
        { value: 'voice', label: 'Voice' },
        { value: 'violin', label: 'Violin' },
        { value: 'drums', label: 'Drums' },
        { value: 'ukulele', label: 'Ukulele' },
        { value: 'other', label: 'Other' }
      ],
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All Levels' }
      ],
      formats: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      lessonCountOptions: [
        { minLessons: 4, label: '4+ lessons' },
        { minLessons: 6, label: '6+ lessons' },
        { minLessons: 8, label: '8+ lessons' }
      ],
      durationOptionsMinutes: [30, 45, 60],
      priceRanges: [
        { min: 0, max: 150, label: 'Up to $150' },
        { min: 0, max: 220, label: 'Up to $220' },
        { min: 0, max: 300, label: 'Up to $300' }
      ],
      targetAudiences: [
        { value: 'kids', label: 'Kids' },
        { value: 'teens', label: 'Teens' },
        { value: 'adults', label: 'Adults' },
        { value: 'all_ages', label: 'All Ages' }
      ],
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' }
      ]
    };
  }

  // ==========================
  // 11) searchLessonPackages
  // ==========================

  searchLessonPackages(filters, sortBy, page = 1, pageSize = 20) {
    let packages = this._getFromStorage('lesson_packages').filter((p) => p.is_active !== false);
    const f = filters || {};

    packages = packages.filter((p) => {
      if (f.instrument && p.instrument !== f.instrument) return false;
      if (f.level) {
        if (p.level && p.level !== 'all_levels' && p.level !== f.level) return false;
      }
      if (f.format && p.format !== f.format) return false;
      if (typeof f.minLessonsCount === 'number' && (p.lessons_count || 0) < f.minLessonsCount) return false;
      if (
        typeof f.minLessonDurationMinutes === 'number' &&
        (p.lesson_duration_minutes || 0) < f.minLessonDurationMinutes
      )
        return false;
      if (typeof f.maxTotalPrice === 'number' && (p.total_price || 0) > f.maxTotalPrice) return false;
      if (f.targetAudience) {
        if (p.target_audience && p.target_audience !== 'all_ages' && p.target_audience !== f.targetAudience) {
          return false;
        }
      }
      if (typeof f.minRating === 'number' && (p.rating || 0) < f.minRating) return false;
      return true;
    });

    if (sortBy === 'price_low_to_high') {
      packages.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
    } else if (sortBy === 'price_high_to_low') {
      packages.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    } else if (sortBy === 'rating_high_to_low') {
      packages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const paginated = this._paginate(packages, page, pageSize);
    return {
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
      results: paginated.results
    };
  }

  // ==========================
  // 12) getLessonPackageDetails
  // ==========================

  getLessonPackageDetails(lessonPackageId) {
    const packages = this._getFromStorage('lesson_packages');
    return packages.find((p) => p.id === lessonPackageId) || null;
  }

  // ==========================
  // 13) addLessonPackageToCart
  // ==========================

  addLessonPackageToCart(lessonPackageId, quantity = 1) {
    const packages = this._getFromStorage('lesson_packages');
    const pkg = packages.find((p) => p.id === lessonPackageId && p.is_active !== false);
    if (!pkg) {
      return { success: false, cartId: null, cartItemId: null, message: 'Lesson package not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unitPrice = pkg.total_price || 0;
    const totalPrice = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'lesson_package',
      product_id: lessonPackageId,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      gift_card_theme: null,
      gift_card_amount: null,
      gift_card_delivery_option: null,
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Lesson package added to cart.'
    };
  }

  // ==========================
  // 14) getPerformanceFilterOptions
  // ==========================

  getPerformanceFilterOptions() {
    return {
      eventTypes: [
        { value: 'wedding', label: 'Wedding' },
        { value: 'party', label: 'Party' },
        { value: 'corporate', label: 'Corporate Event' },
        { value: 'concert', label: 'Concert' },
        { value: 'other', label: 'Other' }
      ],
      musicStyles: [
        { value: 'jazz', label: 'Jazz' },
        { value: 'pop', label: 'Pop' },
        { value: 'rock', label: 'Rock' },
        { value: 'classical', label: 'Classical' },
        { value: 'acoustic', label: 'Acoustic' },
        { value: 'mixed', label: 'Mixed Styles' },
        { value: 'other', label: 'Other' }
      ],
      ensembleSizes: [
        { value: 'solo', label: 'Solo' },
        { value: 'duo', label: 'Duo' },
        { value: 'trio', label: 'Trio' },
        { value: 'quartet', label: 'Quartet' },
        { value: 'band', label: 'Band' },
        { value: 'other', label: 'Other' }
      ],
      budgetRanges: [
        { min: 0, max: 500, label: 'Up to $500' },
        { min: 0, max: 800, label: 'Up to $800' },
        { min: 0, max: 1200, label: 'Up to $1,200' }
      ],
      sortOptions: [
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  // ==========================
  // 15) searchPerformancePackages
  // ==========================

  searchPerformancePackages(filters, sortBy, page = 1, pageSize = 20) {
    let packages = this._getFromStorage('performance_packages').filter((p) => p.is_active !== false);
    const f = filters || {};

    packages = packages.filter((p) => {
      if (f.eventType && p.event_type !== f.eventType) return false;
      if (f.musicStyle && p.music_style !== f.musicStyle) return false;
      if (f.ensembleSize && p.ensemble_size !== f.ensembleSize) return false;
      if (typeof f.maxBudget === 'number') {
        const minPrice = typeof p.min_price === 'number' ? p.min_price : p.base_price;
        if (minPrice > f.maxBudget) return false;
      }
      if (typeof f.minRating === 'number' && (p.rating || 0) < f.minRating) return false;
      return true;
    });

    if (sortBy === 'rating_high_to_low') {
      packages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price_low_to_high') {
      packages.sort((a, b) => {
        const pa = typeof a.min_price === 'number' ? a.min_price : a.base_price;
        const pb = typeof b.min_price === 'number' ? b.min_price : b.base_price;
        return pa - pb;
      });
    } else if (sortBy === 'price_high_to_low') {
      packages.sort((a, b) => {
        const pa = typeof a.min_price === 'number' ? a.min_price : a.base_price;
        const pb = typeof b.min_price === 'number' ? b.min_price : b.base_price;
        return pb - pa;
      });
    }

    const paginated = this._paginate(packages, page, pageSize);
    return {
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
      results: paginated.results
    };
  }

  // ==========================
  // 16) getPerformancePackageDetails
  // ==========================

  getPerformancePackageDetails(performancePackageId) {
    const packages = this._getFromStorage('performance_packages');
    return packages.find((p) => p.id === performancePackageId) || null;
  }

  // ==========================
  // 17) requestPerformanceQuote
  // ==========================

  requestPerformanceQuote(
    performancePackageId,
    requesterName,
    requesterPhone,
    eventLocationCity,
    eventStartDatetime,
    eventEndDatetime,
    budget,
    notes
  ) {
    const packages = this._getFromStorage('performance_packages');
    const pkg = packages.find((p) => p.id === performancePackageId && p.is_active !== false);
    if (!pkg) {
      return { success: false, message: 'Performance package not found.', quoteRequest: null };
    }

    const validation = this._validatePerformanceBudgetAndDuration(
      pkg,
      budget,
      eventStartDatetime,
      eventEndDatetime
    );
    if (!validation.valid && validation.reason === 'budget_too_low') {
      return { success: false, message: 'Budget is too low for this package.', quoteRequest: null };
    }

    const requests = this._getFromStorage('performance_quote_requests');
    const quoteRequest = {
      id: this._generateId('performance_quote'),
      performance_package_id: performancePackageId,
      requester_name: requesterName,
      requester_phone: requesterPhone,
      event_location_city: eventLocationCity,
      event_start_datetime: this._parseIsoToDate(eventStartDatetime).toISOString(),
      event_end_datetime: this._parseIsoToDate(eventEndDatetime).toISOString(),
      budget,
      status: 'submitted',
      notes: notes || null,
      created_at: this._nowIso()
    };

    requests.push(quoteRequest);
    this._saveToStorage('performance_quote_requests', requests);

    // Foreign-key resolution per requirement: include performancePackage
    const combined = Object.assign({}, quoteRequest, {
      performancePackage: pkg
    });

    return {
      success: true,
      message:
        validation.reason === 'budget_above_package_max'
          ? 'Quote submitted (budget above typical range).'
          : 'Quote submitted successfully.',
      quoteRequest: combined
    };
  }

  // ==========================
  // 18) getSubscriptionFilterOptions
  // ==========================

  getSubscriptionFilterOptions() {
    return {
      instruments: ['guitar', 'piano', 'voice', 'violin', 'drums', 'ukulele', 'other'],
      billingCycles: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' }
      ],
      priceRanges: [
        { min: 0, max: 25, label: 'Up to $25 / month' },
        { min: 0, max: 50, label: 'Up to $50 / period' },
        { min: 0, max: 100, label: 'Up to $100 / period' }
      ],
      trialLengthOptionsDays: [7, 14, 30],
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  // ==========================
  // 19) searchSubscriptionPlans
  // ==========================

  searchSubscriptionPlans(filters, sortBy, page = 1, pageSize = 20) {
    let plans = this._getFromStorage('subscription_plans').filter((p) => p.is_active !== false);
    const f = filters || {};

    plans = plans.filter((p) => {
      if (Array.isArray(f.supportedInstruments) && f.supportedInstruments.length > 0) {
        const supported = Array.isArray(p.supported_instruments) ? p.supported_instruments : [];
        const allIncluded = f.supportedInstruments.every((inst) => supported.includes(inst));
        if (!allIncluded) return false;
      }
      if (f.billingCycle && p.billing_cycle !== f.billingCycle) return false;
      if (
        typeof f.maxPricePerBillingCycle === 'number' &&
        (p.price_per_billing_cycle || 0) > f.maxPricePerBillingCycle
      )
        return false;
      if (typeof f.minFreeTrialDays === 'number') {
        const days = p.free_trial_days || 0;
        if (days < f.minFreeTrialDays) return false;
      }
      if (typeof f.includesPracticeMaterials === 'boolean') {
        if (!!p.includes_practice_materials !== !!f.includesPracticeMaterials) return false;
      }
      return true;
    });

    if (sortBy === 'price_low_to_high') {
      plans.sort((a, b) => (a.price_per_billing_cycle || 0) - (b.price_per_billing_cycle || 0));
    } else if (sortBy === 'price_high_to_low') {
      plans.sort((a, b) => (b.price_per_billing_cycle || 0) - (a.price_per_billing_cycle || 0));
    }

    const paginated = this._paginate(plans, page, pageSize);
    return {
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
      results: paginated.results
    };
  }

  // ==========================
  // 20) getSubscriptionPlanDetails
  // ==========================

  getSubscriptionPlanDetails(subscriptionPlanId) {
    const plans = this._getFromStorage('subscription_plans');
    return plans.find((p) => p.id === subscriptionPlanId) || null;
  }

  // ==========================
  // 21) startSubscriptionTrial
  // ==========================

  startSubscriptionTrial(subscriptionPlanId, subscriberName, subscriberEmail, password) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === subscriptionPlanId && p.is_active !== false);
    if (!plan) {
      return { success: false, message: 'Subscription plan not found.', enrollment: null };
    }

    const now = new Date();
    const trialDays = plan.free_trial_days || 0;
    const startIso = now.toISOString();
    let endIso = null;
    let status = 'active';
    if (trialDays > 0) {
      const end = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
      endIso = end.toISOString();
      status = 'trial';
    }

    const enrollments = this._getFromStorage('subscription_enrollments');
    const enrollment = {
      id: this._generateId('subscription_enrollment'),
      subscription_plan_id: subscriptionPlanId,
      subscriber_name: subscriberName,
      subscriber_email: subscriberEmail,
      trial_start_datetime: trialDays > 0 ? startIso : null,
      trial_end_datetime: trialDays > 0 ? endIso : null,
      status,
      created_at: startIso
    };

    enrollments.push(enrollment);
    this._saveToStorage('subscription_enrollments', enrollments);

    // Foreign-key resolution: include subscriptionPlan
    const combined = Object.assign({}, enrollment, { subscriptionPlan: plan });

    return {
      success: true,
      message: trialDays > 0 ? 'Free trial started.' : 'Subscription activated.',
      enrollment: combined
    };
  }

  // ==========================
  // 22) getGroupClassFilterOptions
  // ==========================

  getGroupClassFilterOptions() {
    return {
      instruments: ['guitar', 'piano', 'voice', 'violin', 'drums', 'ukulele', 'other'],
      ageGroups: [
        { value: 'kids_4_7', label: 'Kids 4-7' },
        { value: 'kids_8_12', label: 'Kids 8-12' },
        { value: 'teens', label: 'Teens' },
        { value: 'adults', label: 'Adults' },
        { value: 'all_ages', label: 'All Ages' }
      ],
      groupSizeOptions: [
        { minSize: 2, maxSize: 4, label: '2-4 students' },
        { minSize: 4, maxSize: 8, label: '4-8 students' },
        { minSize: 8, maxSize: 12, label: '8-12 students' }
      ],
      pricePerClassRanges: [
        { min: 0, max: 25, label: 'Up to $25 / class' },
        { min: 0, max: 40, label: 'Up to $40 / class' }
      ],
      dayOfWeekOptions: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      formats: ['online', 'in_person', 'hybrid'],
      sortOptions: [
        { value: 'start_date_soonest', label: 'Start Date: Soonest' },
        { value: 'price_low_to_high', label: 'Price: Low to High' }
      ]
    };
  }

  // ==========================
  // 23) searchGroupClasses
  // ==========================

  searchGroupClasses(filters, sortBy, page = 1, pageSize = 20) {
    let classes = this._getFromStorage('group_classes').filter((g) => g.is_active !== false);
    const f = filters || {};

    classes = classes.filter((g) => {
      if (f.instrument && g.instrument !== f.instrument) return false;
      if (f.ageGroup && g.age_group && g.age_group !== 'all_ages' && g.age_group !== f.ageGroup) return false;
      if (f.startDateFrom) {
        const from = new Date(f.startDateFrom + 'T00:00:00.000Z');
        const start = this._parseIsoToDate(g.start_date);
        if (start < from) return false;
      }
      if (f.startDateTo) {
        const to = new Date(f.startDateTo + 'T23:59:59.999Z');
        const start = this._parseIsoToDate(g.start_date);
        if (start > to) return false;
      }
      if (f.dayOfWeek && g.day_of_week !== f.dayOfWeek) return false;
      if (typeof f.maxPricePerClass === 'number' && (g.price_per_class || 0) > f.maxPricePerClass) return false;
      if (f.locationFormat && g.location_format !== f.locationFormat) return false;

      // Group size range overlap
      if (typeof f.minGroupSize === 'number' || typeof f.maxGroupSize === 'number') {
        const minReq = f.minGroupSize || 0;
        const maxReq = f.maxGroupSize || Number.MAX_SAFE_INTEGER;
        const minSize = g.group_min_size || 0;
        const maxSize = g.group_max_size || Number.MAX_SAFE_INTEGER;
        const overlap = minSize <= maxReq && maxSize >= minReq;
        if (!overlap) return false;
      }

      return true;
    });

    if (sortBy === 'start_date_soonest') {
      classes.sort((a, b) => this._parseIsoToDate(a.start_date) - this._parseIsoToDate(b.start_date));
    } else if (sortBy === 'price_low_to_high') {
      classes.sort((a, b) => (a.price_per_class || 0) - (b.price_per_class || 0));
    }

    const paginated = this._paginate(classes, page, pageSize);
    return {
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
      results: paginated.results
    };
  }

  // ==========================
  // 24) getGroupClassDetails
  // ==========================

  getGroupClassDetails(groupClassId) {
    const classes = this._getFromStorage('group_classes');
    return classes.find((g) => g.id === groupClassId) || null;
  }

  // ==========================
  // 25) enrollInGroupClass
  // ==========================

  enrollInGroupClass(
    groupClassId,
    participantCount,
    childName,
    childAge,
    purchaserName,
    purchaserEmail
  ) {
    const classes = this._getFromStorage('group_classes');
    const clsIndex = classes.findIndex((g) => g.id === groupClassId);
    if (clsIndex === -1) {
      return { success: false, message: 'Group class not found.', enrollment: null };
    }
    const cls = classes[clsIndex];
    if (cls.is_active === false) {
      return { success: false, message: 'Group class is not active.', enrollment: null };
    }

    const currentEnrollment = cls.current_enrollment || 0;
    if (typeof cls.group_max_size === 'number') {
      if (currentEnrollment + participantCount > cls.group_max_size) {
        return { success: false, message: 'Class does not have enough spots.', enrollment: null };
      }
    }

    const enrollments = this._getFromStorage('group_enrollments');
    const enrollment = {
      id: this._generateId('group_enrollment'),
      group_class_id: groupClassId,
      participant_count: participantCount,
      child_name: childName || null,
      child_age: typeof childAge === 'number' ? childAge : null,
      purchaser_name: purchaserName,
      purchaser_email: purchaserEmail,
      status: 'confirmed',
      created_at: this._nowIso()
    };

    enrollments.push(enrollment);
    this._saveToStorage('group_enrollments', enrollments);

    cls.current_enrollment = currentEnrollment + participantCount;
    classes[clsIndex] = cls;
    this._saveToStorage('group_classes', classes);

    // Foreign key resolution include groupClass
    const combined = Object.assign({}, enrollment, { groupClass: cls });

    return {
      success: true,
      message: 'Enrollment completed.',
      enrollment: combined
    };
  }

  // ==========================
  // 26) getGiftCardProductsOverview
  // ==========================

  getGiftCardProductsOverview() {
    return this._getFromStorage('gift_card_products').filter((g) => g.is_active !== false);
  }

  // ==========================
  // 27) getGiftCardProductDetails
  // ==========================

  getGiftCardProductDetails(giftCardProductId) {
    const products = this._getFromStorage('gift_card_products');
    return products.find((g) => g.id === giftCardProductId) || null;
  }

  // ==========================
  // 28) addGiftCardToCart
  // ==========================

  addGiftCardToCart(giftCardProductId, theme, amount, deliveryOption, quantity = 1) {
    const products = this._getFromStorage('gift_card_products');
    const product = products.find((g) => g.id === giftCardProductId && g.is_active !== false);
    if (!product) {
      return { success: false, cartId: null, cartItemId: null, message: 'Gift card product not found.' };
    }

    if (Array.isArray(product.available_themes) && !product.available_themes.includes(theme)) {
      return { success: false, cartId: null, cartItemId: null, message: 'Theme not available for this gift card.' };
    }

    if (Array.isArray(product.delivery_options) && !product.delivery_options.includes(deliveryOption)) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Delivery option not available for this gift card.'
      };
    }

    if (typeof product.min_amount === 'number' && amount < product.min_amount) {
      return { success: false, cartId: null, cartItemId: null, message: 'Amount is below minimum allowed.' };
    }
    if (typeof product.max_amount === 'number' && amount > product.max_amount) {
      return { success: false, cartId: null, cartItemId: null, message: 'Amount is above maximum allowed.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unitPrice = amount;
    const totalPrice = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      product_id: giftCardProductId,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      gift_card_theme: theme,
      gift_card_amount: amount,
      gift_card_delivery_option: deliveryOption,
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Gift card added to cart.'
    };
  }

  // ==========================
  // 29) getBlogFilterOptions
  // ==========================

  getBlogFilterOptions() {
    return {
      primaryTags: [
        { value: 'practice_tips', label: 'Practice Tips' },
        { value: 'news', label: 'News' },
        { value: 'announcements', label: 'Announcements' },
        { value: 'stories', label: 'Stories' }
      ],
      instruments: ['guitar', 'piano', 'voice', 'violin', 'drums', 'ukulele', 'other'],
      levels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      sortOptions: [
        { value: 'newest_first', label: 'Newest First' },
        { value: 'oldest_first', label: 'Oldest First' }
      ]
    };
  }

  // ==========================
  // 30) searchArticles
  // ==========================

  searchArticles(filters, sortBy, page = 1, pageSize = 20) {
    let articles = this._getFromStorage('articles').filter((a) => a.is_published !== false);
    const f = filters || {};

    if (f.primaryTag) {
      articles = articles.filter((a) => a.primary_tag === f.primaryTag);
    }
    if (f.instrument) {
      articles = articles.filter((a) => a.instrument === f.instrument);
    }
    if (f.level) {
      articles = articles.filter((a) => !a.level || a.level === 'all_levels' || a.level === f.level);
    }
    if (typeof f.publishedWithinDays === 'number') {
      const now = new Date();
      const cutoff = new Date(now.getTime() - f.publishedWithinDays * 24 * 60 * 60 * 1000);
      articles = articles.filter((a) => {
        const d = this._parseIsoToDate(a.publish_date);
        return d >= cutoff;
      });
    }

    if (sortBy === 'newest_first') {
      articles.sort((a, b) => this._parseIsoToDate(b.publish_date) - this._parseIsoToDate(a.publish_date));
    } else if (sortBy === 'oldest_first') {
      articles.sort((a, b) => this._parseIsoToDate(a.publish_date) - this._parseIsoToDate(b.publish_date));
    }

    const readingList = this._getFromStorage('reading_list_items');
    const savedIds = new Set(readingList.map((r) => r.article_id));

    const paginated = this._paginate(articles, page, pageSize);
    const results = paginated.results.map((a) => ({
      articleId: a.id,
      title: a.title,
      excerpt: a.excerpt || '',
      primaryTag: a.primary_tag || null,
      instrument: a.instrument || null,
      level: a.level || null,
      publishDate: a.publish_date,
      isSavedToReadingList: savedIds.has(a.id)
    }));

    return {
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
      results
    };
  }

  // ==========================
  // 31) getArticleDetails
  // ==========================

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    const readingList = this._getFromStorage('reading_list_items');
    const isSavedToReadingList = readingList.some((r) => r.article_id === articleId);

    return {
      article,
      isSavedToReadingList
    };
  }

  // ==========================
  // 32) saveArticleToReadingList
  // ==========================

  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, message: 'Article not found.', readingListItem: null };
    }

    let readingList = this._getFromStorage('reading_list_items');
    if (!Array.isArray(readingList)) readingList = [];

    if (readingList.some((r) => r.article_id === articleId)) {
      return { success: true, message: 'Article already saved.', readingListItem: null };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      article_id: articleId,
      saved_at: this._nowIso()
    };

    readingList.push(item);
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: true,
      message: 'Article saved to reading list.',
      readingListItem: item
    };
  }

  // ==========================
  // 33) removeArticleFromReadingList
  // ==========================

  removeArticleFromReadingList(articleId) {
    let readingList = this._getFromStorage('reading_list_items');
    if (!Array.isArray(readingList)) readingList = [];
    const initial = readingList.length;
    readingList = readingList.filter((r) => r.article_id !== articleId);
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: true,
      message: initial === readingList.length ? 'Article was not in reading list.' : 'Article removed from reading list.'
    };
  }

  // ==========================
  // 34) getRelatedArticles
  // ==========================

  getRelatedArticles(articleId, maxResults = 3) {
    const articles = this._getFromStorage('articles').filter((a) => a.is_published !== false);
    const base = articles.find((a) => a.id === articleId);
    if (!base) return [];

    const related = articles
      .filter((a) => a.id !== articleId)
      .map((a) => {
        let score = 0;
        if (base.primary_tag && a.primary_tag === base.primary_tag) score += 2;
        if (base.instrument && a.instrument === base.instrument) score += 1;
        if (base.level && (a.level === base.level || a.level === 'all_levels')) score += 1;
        return { article: a, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return this._parseIsoToDate(b.article.publish_date) - this._parseIsoToDate(a.article.publish_date);
      })
      .slice(0, maxResults)
      .map((x) => x.article);

    return related;
  }

  // ==========================
  // 35) getCartSummary
  // ==========================

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    const lessonPackages = this._getFromStorage('lesson_packages');
    const groupClasses = this._getFromStorage('group_classes');
    const subscriptionPlans = this._getFromStorage('subscription_plans');
    const giftCardProducts = this._getFromStorage('gift_card_products');
    const performancePackages = this._getFromStorage('performance_packages');

    const items = cartItems.map((ci) => {
      let product = null;
      let name = '';
      let description = '';

      switch (ci.item_type) {
        case 'lesson_package': {
          product = lessonPackages.find((p) => p.id === ci.product_id) || null;
          if (product) {
            name = product.name || '';
            description = product.description || '';
          }
          break;
        }
        case 'group_class': {
          product = groupClasses.find((p) => p.id === ci.product_id) || null;
          if (product) {
            name = product.name || '';
            description = product.description || '';
          }
          break;
        }
        case 'subscription_plan': {
          product = subscriptionPlans.find((p) => p.id === ci.product_id) || null;
          if (product) {
            name = product.name || '';
            description = product.description || '';
          }
          break;
        }
        case 'gift_card': {
          product = giftCardProducts.find((p) => p.id === ci.product_id) || null;
          if (product) {
            name = product.name || '';
            description = product.description || '';
          }
          break;
        }
        case 'performance_package': {
          product = performancePackages.find((p) => p.id === ci.product_id) || null;
          if (product) {
            name = product.name || '';
            description = product.description || '';
          }
          break;
        }
        default:
          break;
      }

      let displayTypeLabel = '';
      if (ci.item_type === 'lesson_package') displayTypeLabel = 'Lesson Package';
      else if (ci.item_type === 'group_class') displayTypeLabel = 'Group Class';
      else if (ci.item_type === 'subscription_plan') displayTypeLabel = 'Subscription';
      else if (ci.item_type === 'gift_card') displayTypeLabel = 'Gift Card';
      else if (ci.item_type === 'performance_package') displayTypeLabel = 'Performance';

      return {
        cartItemId: ci.id,
        itemType: ci.item_type,
        productId: ci.product_id,
        name,
        description,
        quantity: ci.quantity,
        unitPrice: ci.unit_price,
        totalPrice: ci.total_price,
        displayTypeLabel,
        giftCardTheme: ci.gift_card_theme || null,
        giftCardAmount: ci.gift_card_amount || null,
        giftCardDeliveryOption: ci.gift_card_delivery_option || null,
        // Foreign key resolution
        product
      };
    });

    const totals = this._calculateCartTotals(cart.id);

    return {
      cartId: cart.id,
      items,
      subtotal: totals.subtotal,
      totalItems: totals.totalItems
    };
  }

  // ==========================
  // 36) updateCartItemQuantity
  // ==========================

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cartSummary: null
      };
    }

    const item = cartItems[idx];
    const cartId = item.cart_id;

    if (quantity <= 0) {
      // Remove item and also from cart.item_ids
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);

      const cart = this._getOrCreateCart();
      if (Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
        cart.updated_at = this._nowIso();
        this._saveCart(cart);
      }
    } else {
      item.quantity = quantity;
      item.total_price = item.unit_price * quantity;
      cartItems[idx] = item;
      this._saveToStorage('cart_items', cartItems);
    }

    const totals = this._calculateCartTotals(cartId);
    const updatedItems = this._getFromStorage('cart_items')
      .filter((ci) => ci.cart_id === cartId)
      .map((ci) => ({
        cartItemId: ci.id,
        quantity: ci.quantity,
        totalPrice: ci.total_price
      }));

    return {
      success: true,
      message: 'Cart updated.',
      cartSummary: {
        cartId,
        items: updatedItems,
        subtotal: totals.subtotal,
        totalItems: totals.totalItems
      }
    };
  }

  // ==========================
  // 37) removeCartItem
  // ==========================

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cartSummary: null
      };
    }

    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    if (Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
      cart.updated_at = this._nowIso();
      this._saveCart(cart);
    }

    const totals = this._calculateCartTotals(cartId);
    const updatedItems = this._getFromStorage('cart_items')
      .filter((ci) => ci.cart_id === cartId)
      .map((ci) => ({
        cartItemId: ci.id,
        quantity: ci.quantity,
        totalPrice: ci.total_price
      }));

    return {
      success: true,
      message: 'Cart item removed.',
      cartSummary: {
        cartId,
        items: updatedItems,
        subtotal: totals.subtotal,
        totalItems: totals.totalItems
      }
    };
  }

  // ==========================
  // 38) getCheckoutSummary
  // ==========================

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    const lessonPackages = this._getFromStorage('lesson_packages');
    const groupClasses = this._getFromStorage('group_classes');
    const subscriptionPlans = this._getFromStorage('subscription_plans');
    const giftCardProducts = this._getFromStorage('gift_card_products');
    const performancePackages = this._getFromStorage('performance_packages');

    const items = cartItems.map((ci) => {
      let product = null;
      let name = '';

      switch (ci.item_type) {
        case 'lesson_package':
          product = lessonPackages.find((p) => p.id === ci.product_id) || null;
          name = product && product.name ? product.name : '';
          break;
        case 'group_class':
          product = groupClasses.find((p) => p.id === ci.product_id) || null;
          name = product && product.name ? product.name : '';
          break;
        case 'subscription_plan':
          product = subscriptionPlans.find((p) => p.id === ci.product_id) || null;
          name = product && product.name ? product.name : '';
          break;
        case 'gift_card':
          product = giftCardProducts.find((p) => p.id === ci.product_id) || null;
          name = product && product.name ? product.name : '';
          break;
        case 'performance_package':
          product = performancePackages.find((p) => p.id === ci.product_id) || null;
          name = product && product.name ? product.name : '';
          break;
        default:
          break;
      }

      return {
        cartItemId: ci.id,
        itemType: ci.item_type,
        name,
        quantity: ci.quantity,
        unitPrice: ci.unit_price,
        totalPrice: ci.total_price,
        product
      };
    });

    const totals = this._calculateCartTotals(cart.id);

    return {
      cartId: cart.id,
      items,
      totalAmount: totals.subtotal,
      availablePaymentMethods: ['pay_at_first_lesson', 'pay_at_studio', 'pay_later']
    };
  }

  // ==========================
  // 39) placeOrder
  // ==========================

  placeOrder(purchaserName, purchaserEmail, paymentMethod, notes) {
    const validMethods = ['pay_at_first_lesson', 'pay_at_studio', 'pay_later'];
    if (!validMethods.includes(paymentMethod)) {
      return { success: false, message: 'Invalid payment method.', order: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    if (cartItems.length === 0) {
      return { success: false, message: 'Cart is empty.', order: null };
    }

    const totals = this._calculateCartTotals(cart.id);

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + this._getNextIdCounter();

    const orderItemIds = [];

    cartItems.forEach((ci) => {
      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        item_type: ci.item_type,
        product_id: ci.product_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        gift_card_theme: ci.gift_card_theme || null,
        gift_card_amount: ci.gift_card_amount || null,
        gift_card_delivery_option: ci.gift_card_delivery_option || null
      };
      orderItems.push(oi);
      orderItemIds.push(oi.id);
    });

    const order = {
      id: orderId,
      order_number: orderNumber,
      cart_id: cart.id,
      purchaser_name: purchaserName,
      purchaser_email: purchaserEmail,
      total_amount: totals.subtotal,
      payment_method: paymentMethod,
      status: 'pending',
      item_ids: orderItemIds,
      created_at: this._nowIso(),
      notes: notes || null
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart
    const allCartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', allCartItems);
    cart.item_ids = [];
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return {
      success: true,
      message: 'Order placed successfully.',
      order
    };
  }

  // ==========================
  // 40) getFavoriteInstructors
  // ==========================

  getFavoriteInstructors() {
    const favorites = this._getFromStorage('favorite_instructors');
    const instructors = this._getFromStorage('instructors');

    return favorites.map((f) => {
      const instructor = instructors.find((i) => i.id === f.instructor_id) || null;
      return {
        favoriteId: f.id,
        savedAt: f.saved_at,
        instructor
      };
    });
  }

  // ==========================
  // 41) getReadingListItems
  // ==========================

  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    return items.map((r) => {
      const article = articles.find((a) => a.id === r.article_id) || null;
      return {
        readingListItemId: r.id,
        savedAt: r.saved_at,
        article
      };
    });
  }

  // ==========================
  // 42) getAboutContent
  // ==========================

  getAboutContent() {
    const stored = localStorage.getItem('about_content');
    if (stored && stored !== 'null') {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }

    // Default static content
    const content = {
      headline: 'About the Musician & Teacher',
      bioHtml:
        '<p>I am a professional musician and educator offering personalized lessons and performance services.</p>',
      teachingApproachHtml:
        '<p>My teaching focuses on building solid fundamentals while keeping music fun, practical, and goal-driven.</p>',
      servicesSummaryHtml:
        '<ul><li>Private lessons for guitar, piano, voice, and more</li><li>Group classes and workshops</li><li>Live performances for weddings and events</li></ul>',
      testimonials: []
    };

    localStorage.setItem('about_content', JSON.stringify(content));
    return content;
  }

  // ==========================
  // 43) getContactInfo
  // ==========================

  getContactInfo() {
    const stored = localStorage.getItem('contact_info');
    if (stored && stored !== 'null') {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }

    const info = {
      email: 'info@example-musicstudio.com',
      phone: '+1 (555) 123-4567',
      officeHours: 'Mon-Fri 10:00 am - 6:00 pm',
      locationText: 'Serving students locally and online.'
    };
    localStorage.setItem('contact_info', JSON.stringify(info));
    return info;
  }

  // ==========================
  // 44) submitContactForm
  // ==========================

  submitContactForm(name, email, phone, topic, message) {
    const tickets = this._getFromStorage('contact_tickets');
    const ticketId = this._generateId('ticket');
    const ticket = {
      id: ticketId,
      name,
      email,
      phone: phone || null,
      topic: topic || 'general',
      message,
      created_at: this._nowIso()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      message: 'Your message has been submitted.',
      ticketId
    };
  }

  // ==========================
  // 45) getPoliciesContent
  // ==========================

  getPoliciesContent() {
    const stored = localStorage.getItem('policies_content');
    if (stored && stored !== 'null') {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }

    const content = {
      singleLessonPolicyHtml:
        '<p>Cancellations require 24 hours notice. Late cancellations may be charged at the full lesson rate.</p>',
      recurringLessonPolicyHtml:
        '<p>Recurring lessons reserve a weekly time slot. Missed lessons are not refunded but may be rescheduled at the teacher\'s discretion.</p>',
      groupClassPolicyHtml:
        '<p>Group classes run with a minimum enrollment. If a class is cancelled, you will receive a refund or credit.</p>',
      giftCardPolicyHtml:
        '<p>Gift cards are non-refundable but may be transferred to another recipient. They do not expire unless otherwise stated.</p>',
      privacyPolicyHtml:
        '<p>Your contact details are used only for communication about lessons, events, and subscriptions, and are never sold.</p>'
    };

    localStorage.setItem('policies_content', JSON.stringify(content));
    return content;
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
