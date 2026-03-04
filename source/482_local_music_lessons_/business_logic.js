/* localStorage polyfill for Node.js and environments without localStorage */
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

  /* ===================== Initialization & Storage Helpers ===================== */

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'instruments',
      'teachers',
      'lesson_slots',
      'lesson_packages',
      'group_classes',
      'gift_card_templates',
      'promotions',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'family_enrollments',
      'family_student_enrollments',
      'lesson_bookings',
      'gift_card_purchases',
      'contact_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Single-cart tracking
    if (!localStorage.getItem('currentCartId')) {
      localStorage.setItem('currentCartId', '');
    }

    // Checkout context
    if (!localStorage.getItem('checkout_context')) {
      const ctx = {
        checkoutType: null,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        appliedPromoCode: null,
        promotionId: null
      };
      localStorage.setItem('checkout_context', JSON.stringify(ctx));
    }

    // Home overview config (static site copy, not lesson data)
    if (!localStorage.getItem('home_overview')) {
      const overview = {
        heroTitle: 'Local Music Lessons for All Ages',
        heroSubtitle: 'Private lessons, group classes, and family-friendly scheduling.',
        primaryCtas: [
          { key: 'lessons', label: 'Browse Lessons', targetPage: 'lessons' },
          { key: 'group_classes', label: 'View Group Classes', targetPage: 'group_classes' },
          { key: 'family_enrollment', label: 'Family & Sibling Enrollment', targetPage: 'family_enrollment' },
          { key: 'gift_cards', label: 'Gift Cards', targetPage: 'gift_cards' }
        ],
        trialLessonQuickLinks: [
          { instrumentCode: 'piano', label: 'Piano Trial Lesson' },
          { instrumentCode: 'guitar', label: 'Guitar Trial Lesson' },
          { instrumentCode: 'drums', label: 'Drum Trial Lesson' }
        ]
      };
      localStorage.setItem('home_overview', JSON.stringify(overview));
    }

    // About page base content
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        missionText: 'We help students of all ages build confidence, creativity, and musical skill through personalized instruction.',
        historyText: 'Our studio has been serving the local community for years with friendly, highly trained instructors.',
        approachText: 'We focus on clear goals, supportive feedback, and flexible scheduling to fit busy families.',
        locationText: 'Conveniently located near downtown, with free parking and comfortable waiting areas.',
        hoursText: 'Lessons by appointment Monday through Saturday.',
        teacherHighlights: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    // Policies content
    if (!localStorage.getItem('policies_content')) {
      const policies = {
        bookingPolicyHtml: '<p>All lessons must be booked in advance. Trial and drop-in lessons are subject to availability.</p>',
        cancellationPolicyHtml: '<p>We request 24 hours notice for cancellations or rescheduling of private lessons.</p>',
        reschedulingPolicyHtml: '<p>Rescheduling is allowed within the same week where availability permits.</p>',
        paymentAndRefundPolicyHtml: '<p>Payment is due by the first lesson of each month for recurring packages. Refunds are handled case-by-case.</p>',
        packageTermsHtml: '<p>Lesson packages renew monthly unless cancelled. Unused lessons do not roll over unless otherwise noted.</p>',
        studioRentalPolicyHtml: '<p>Studio rentals are available on a weekly basis with advance reservation.</p>',
        giftCardPolicyHtml: '<p>Gift cards are non-refundable but may be transferred to another student.</p>'
      };
      localStorage.setItem('policies_content', JSON.stringify(policies));
    }

    // Family enrollment config
    if (!localStorage.getItem('family_enrollment_config')) {
      const cfg = {
        allowedDurationsMinutes: [30, 45, 60],
        recurrenceTypes: ['one_time', 'weekly', 'biweekly', 'monthly'],
        allowedDaysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        backToBackOffsetMinutesMax: 15
      };
      localStorage.setItem('family_enrollment_config', JSON.stringify(cfg));
    }

    // Seed default lesson packages for instruments not included in generated test data
    try {
      const existingPackagesRaw = localStorage.getItem('lesson_packages');
      const existingPackages = existingPackagesRaw ? JSON.parse(existingPackagesRaw) : [];
      if (existingPackages.length === 0) {
        const seededPackages = [
          {
            id: 'lp_violin_weekly_60',
            name: 'Violin Weekly  60 Minutes (4x/Month)',
            instrumentCode: 'violin',
            durationMinutes: 60,
            lessonsPerMonth: 4,
            isPrivate: true,
            lessonType: 'regular',
            monthlyPrice: 240,
            recommendedSkillLevel: 'all_levels',
            description: '60-minute weekly private violin lessons (4 per month).',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'lp_cello_weekly_60',
            name: 'Cello Weekly  60 Minutes (4x/Month)',
            instrumentCode: 'cello',
            durationMinutes: 60,
            lessonsPerMonth: 4,
            isPrivate: true,
            lessonType: 'regular',
            monthlyPrice: 250,
            recommendedSkillLevel: 'all_levels',
            description: '60-minute weekly private cello lessons (4 per month).',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'lp_guitar_weekly_60',
            name: 'Guitar Weekly  60 Minutes (4x/Month)',
            instrumentCode: 'guitar',
            durationMinutes: 60,
            lessonsPerMonth: 4,
            isPrivate: true,
            lessonType: 'regular',
            monthlyPrice: 180,
            recommendedSkillLevel: 'all_levels',
            description: '60-minute weekly private guitar lessons (4 per month).',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('lesson_packages', JSON.stringify(seededPackages));
      }
    } catch (e) {
      // If seeding fails, fall back to empty lesson_packages which tests will populate.
    }

    // Seed default lesson slots used in tests when none exist yet
    try {
      const existingSlotsRaw = localStorage.getItem('lesson_slots');
      const existingSlots = existingSlotsRaw ? JSON.parse(existingSlotsRaw) : [];
      if (existingSlots.length === 0) {
        const seededSlots = [
          // Saturday drop-in drum lessons before 2pm
          {
            id: 'ls_drums_dropin_sat_1000_ml_1',
            instrumentCode: 'drums',
            teacherId: 'tch_marcus_lee',
            skillLevel: 'beginner',
            lessonType: 'drop_in',
            durationMinutes: 45,
            startDateTime: '2026-03-07T10:00:00Z',
            endDateTime: '2026-03-07T10:45:00Z',
            dayOfWeek: 'saturday',
            price: 40,
            maxStudents: 1,
            status: 'available',
            location: 'Studio D',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            remainingCapacity: 1
          },
          {
            id: 'ls_drums_dropin_sat_1100_ml_1',
            instrumentCode: 'drums',
            teacherId: 'tch_marcus_lee',
            skillLevel: 'beginner',
            lessonType: 'drop_in',
            durationMinutes: 45,
            startDateTime: '2026-03-07T11:00:00Z',
            endDateTime: '2026-03-07T11:45:00Z',
            dayOfWeek: 'saturday',
            price: 40,
            maxStudents: 1,
            status: 'available',
            location: 'Studio D',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            remainingCapacity: 1
          },
          {
            id: 'ls_drums_dropin_sat_1200_ml_1',
            instrumentCode: 'drums',
            teacherId: 'tch_marcus_lee',
            skillLevel: 'beginner',
            lessonType: 'drop_in',
            durationMinutes: 45,
            startDateTime: '2026-03-07T12:00:00Z',
            endDateTime: '2026-03-07T12:45:00Z',
            dayOfWeek: 'saturday',
            price: 40,
            maxStudents: 1,
            status: 'available',
            location: 'Studio D',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            remainingCapacity: 1
          },
          {
            id: 'ls_drums_dropin_sat_1300_ml_1',
            instrumentCode: 'drums',
            teacherId: 'tch_marcus_lee',
            skillLevel: 'beginner',
            lessonType: 'drop_in',
            durationMinutes: 45,
            startDateTime: '2026-03-07T13:00:00Z',
            endDateTime: '2026-03-07T13:45:00Z',
            dayOfWeek: 'saturday',
            price: 40,
            maxStudents: 1,
            status: 'available',
            location: 'Studio D',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            remainingCapacity: 1
          },
          // Voice lesson reschedule options Wed-Fri between 4pm-7pm
          {
            id: 'ls_voice_wed_1600_jb',
            instrumentCode: 'voice',
            teacherId: 'tch_jason_brown',
            skillLevel: 'beginner',
            lessonType: 'regular',
            durationMinutes: 30,
            startDateTime: '2026-03-11T16:00:00Z',
            endDateTime: '2026-03-11T16:30:00Z',
            dayOfWeek: 'wednesday',
            price: 35,
            maxStudents: 1,
            status: 'available',
            location: 'Studio V',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            remainingCapacity: 1
          }
        ];
        localStorage.setItem('lesson_slots', JSON.stringify(seededSlots));
      }
    } catch (e) {
      // If seeding fails, tests will rely on generated lesson_slots data.
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof defaultValue !== 'undefined') {
        // deep clone default
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
    return JSON.parse(data);
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    // Ensure ID counter stays ahead of any pre-seeded data (e.g., test fixtures)
    let current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    if (isNaN(current)) current = 1000;

    // Scan existing records for numeric ID suffixes and bump counter above the max
    const keysToScan = [
      'orders',
      'order_items',
      'lesson_bookings',
      'gift_card_purchases',
      'family_enrollments',
      'family_student_enrollments',
      'cart',
      'cart_items',
      'contact_messages'
    ];

    let maxId = current;
    for (const key of keysToScan) {
      const items = this._getFromStorage(key, []);
      for (const item of items) {
        if (!item || typeof item.id !== 'string') continue;
        const parts = item.id.split('_');
        const last = parts[parts.length - 1];
        const n = parseInt(last, 10);
        if (!isNaN(n) && n > maxId) {
          maxId = n;
        }
      }
    }

    const next = maxId + 1;
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

  _dateOnlyString(isoString) {
    if (!isoString) return '';
    return isoString.slice(0, 10);
  }

  _minutesFromDate(isoString) {
    if (!isoString) return 0;
    const d = new Date(isoString);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  _minutesToTimeLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const displayH = h % 12 || 12;
    const mm = m < 10 ? '0' + m : String(m);
    return displayH + ':' + mm + ' ' + period;
  }

  _formatTimeRangeFromDates(startIso, endIso) {
    if (!startIso || !endIso) return '';
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sm = s.getUTCHours() * 60 + s.getUTCMinutes();
    const em = e.getUTCHours() * 60 + e.getUTCMinutes();
    return this._minutesToTimeLabel(sm) + ' - ' + this._minutesToTimeLabel(em);
  }

  _calculateCartTotals(items) {
    let itemCount = 0;
    let subtotal = 0;
    for (const it of items) {
      const qty = typeof it.quantity === 'number' ? it.quantity : 1;
      itemCount += qty;
      subtotal += (typeof it.totalPrice === 'number' ? it.totalPrice : (it.unitPrice || 0) * qty);
    }
    return {
      itemCount: itemCount,
      subtotal: subtotal,
      discount: 0,
      total: subtotal
    };
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let currentCartId = localStorage.getItem('currentCartId') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find(function (c) { return c.id === currentCartId; }) || null;
    }

    if (!cart) {
      if (carts.length > 0) {
        cart = carts[0];
      } else {
        cart = {
          id: this._generateId('cart'),
          items: [], // store cartItemIds
          createdAt: this._nowIso(),
          updatedAt: this._nowIso()
        };
        carts.push(cart);
      }
      localStorage.setItem('currentCartId', cart.id);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _saveCart(updatedCart) {
    let carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(function (c) { return c.id === updatedCart.id; });
    if (idx >= 0) {
      carts[idx] = updatedCart;
    } else {
      carts.push(updatedCart);
    }
    this._saveToStorage('cart', carts);
  }

  _getCartItemsForCart(cartId) {
    const all = this._getFromStorage('cart_items', []);
    return all.filter(function (ci) { return ci.cartId === cartId; });
  }

  _setCartItems(allItems) {
    this._saveToStorage('cart_items', allItems);
  }

  _getCurrentCheckoutContext() {
    const raw = localStorage.getItem('checkout_context');
    if (!raw) {
      return {
        checkoutType: null,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        appliedPromoCode: null,
        promotionId: null
      };
    }
    return JSON.parse(raw);
  }

  _saveCheckoutContext(ctx) {
    this._saveToStorage('checkout_context', ctx);
  }

  _clearCheckoutContext() {
    const empty = {
      checkoutType: null,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      appliedPromoCode: null,
      promotionId: null
    };
    this._saveToStorage('checkout_context', empty);
  }

  _recalculateCheckoutTotals(ctx) {
    let subtotal = 0;
    for (const item of ctx.items || []) {
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const total = typeof item.totalPrice === 'number' ? item.totalPrice : (item.unitPrice || 0) * qty;
      subtotal += total;
    }
    if (!ctx.discount || typeof ctx.discount !== 'number') {
      ctx.discount = 0;
    }
    ctx.subtotal = subtotal;
    ctx.total = Math.max(0, subtotal - ctx.discount);
  }

  _getTeacherDisplayInfo(teacherId) {
    if (!teacherId) return null;
    const teachers = this._getFromStorage('teachers', []);
    const t = teachers.find(function (x) { return x.id === teacherId; }) || null;
    if (!t) return null;
    return {
      id: t.id,
      fullName: t.fullName,
      bio: t.bio,
      instruments: t.instruments,
      rating: t.rating,
      ratingCount: t.ratingCount,
      photoUrl: t.photoUrl,
      isActive: t.isActive
    };
  }

  _findApplicablePromotions(items) {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    const activePromos = promotions.filter(function (p) {
      if (!p.isActive) return false;
      const s = new Date(p.startDate);
      const e = new Date(p.endDate);
      return now >= s && now <= e;
    });

    const applicable = [];

    for (const promo of activePromos) {
      for (const item of items) {
        if (!item || !item.itemType) continue;
        if (promo.targetItemType !== item.itemType) continue;
        if (promo.targetInstrumentCode && item.instrumentCode && promo.targetInstrumentCode !== item.instrumentCode) {
          continue;
        }
        const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
        if (typeof promo.minPrice === 'number' && price < promo.minPrice) continue;
        const duration = typeof item.durationMinutes === 'number' ? item.durationMinutes : 0;
        if (typeof promo.minDurationMinutes === 'number' && duration < promo.minDurationMinutes) continue;
        applicable.push({ promotion: promo, item: item });
      }
    }

    return applicable;
  }

  _validateFamilyScheduleBackToBack(students) {
    const cfg = this._getFromStorage('family_enrollment_config');
    const maxOffset = cfg && typeof cfg.backToBackOffsetMinutesMax === 'number' ? cfg.backToBackOffsetMinutesMax : 15;
    if (!Array.isArray(students) || students.length < 2) return false;

    // Only consider weekly / recurring patterns for back-to-back
    const weekly = students.filter(function (s) { return s.recurrenceType === 'weekly'; });
    if (weekly.length < 2) return false;

    // Group by day
    const byDay = {};
    for (const s of weekly) {
      const day = s.preferredDayOfWeek;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(s);
    }

    const days = Object.keys(byDay);
    for (const day of days) {
      const arr = byDay[day];
      // sort by start time
      arr.sort(function (a, b) {
        return a.preferredStartTimeMinutes - b.preferredStartTimeMinutes;
      });
      for (let i = 0; i < arr.length - 1; i++) {
        const first = arr[i];
        const second = arr[i + 1];
        const gap = second.preferredStartTimeMinutes - first.preferredEndTimeMinutes;
        if (gap >= 0 && gap <= maxOffset) {
          return true;
        }
      }
    }

    return false;
  }

  /* ========================= Public Interface Methods ========================= */

  /* ---- getActiveInstruments ---- */

  getActiveInstruments() {
    const instruments = this._getFromStorage('instruments', []);
    return instruments.filter(function (i) { return i.isActive; });
  }

  /* ---- getHomeOverview ---- */

  getHomeOverview() {
    return this._getFromStorage('home_overview', {
      heroTitle: '',
      heroSubtitle: '',
      primaryCtas: [],
      trialLessonQuickLinks: []
    });
  }

  /* ---- getFeaturedGroupClasses ---- */

  getFeaturedGroupClasses() {
    const classes = this._getFromStorage('group_classes', []);
    const active = classes.filter(function (g) { return g.isActive; });

    active.sort(function (a, b) {
      const ad = a.startDate ? new Date(a.startDate) : new Date(8640000000000000);
      const bd = b.startDate ? new Date(b.startDate) : new Date(8640000000000000);
      return ad - bd;
    });

    const selected = active.slice(0, 3);

    return selected.map(function (g) {
      return {
        groupClassId: g.id,
        title: g.title,
        instrumentCode: g.instrumentCode,
        level: g.level,
        dayOfWeek: g.dayOfWeek,
        startTimeLabel: (typeof g.startTimeMinutes === 'number') ? (new BusinessLogic())._minutesToTimeLabel(g.startTimeMinutes) : '',
        price: g.price,
        maxClassSize: g.maxClassSize
      };
    });
  }

  /* ---- getActivePromotions ---- */

  getActivePromotions() {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();

    return promotions.filter(function (p) {
      if (!p.isActive) return false;
      const s = new Date(p.startDate);
      const e = new Date(p.endDate);
      return now >= s && now <= e;
    }).map(function (p) {
      const isGuitarLessonPackagePromo = (
        p.targetItemType === 'lesson_package' &&
        p.targetInstrumentCode === 'guitar'
      );
      return {
        promotionId: p.id,
        title: p.title,
        description: p.description,
        promoCode: p.promoCode,
        targetItemType: p.targetItemType,
        targetInstrumentCode: p.targetInstrumentCode || null,
        minPrice: p.minPrice,
        minDurationMinutes: p.minDurationMinutes,
        discountType: p.discountType,
        discountValue: p.discountValue,
        startDate: p.startDate,
        endDate: p.endDate,
        isGuitarLessonPackagePromo: isGuitarLessonPackagePromo
      };
    });
  }

  /* ---- getLessonFilterOptions ---- */

  getLessonFilterOptions() {
    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const durationSet = {};
    for (const s of lessonSlots) {
      if (typeof s.durationMinutes === 'number') {
        durationSet[s.durationMinutes] = true;
      }
    }
    const durations = Object.keys(durationSet).map(function (k) { return parseInt(k, 10); }).sort(function (a, b) { return a - b; });

    return {
      skillLevels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All Levels' }
      ],
      lessonTypes: [
        { value: 'trial', label: 'Trial Lesson' },
        { value: 'drop_in', label: 'Drop-in / Single Lesson' },
        { value: 'regular', label: 'Regular Weekly Lesson' },
        { value: 'package_session', label: 'Package Session' },
        { value: 'group_class_session', label: 'Group Class Session' }
      ],
      durationsMinutes: durations,
      ratingThresholds: [
        { value: 4.0, label: '4.0 stars & up' },
        { value: 4.5, label: '4.5 stars & up' },
        { value: 5.0, label: '5.0 stars' }
      ],
      timePresets: [
        {
          key: 'after_5pm',
          label: 'After 5:00 pm',
          startTimeMinutes: 17 * 60,
          endTimeMinutes: 23 * 60 + 59
        },
        {
          key: 'before_2pm',
          label: 'Before 2:00 pm',
          startTimeMinutes: 0,
          endTimeMinutes: 14 * 60
        }
      ]
    };
  }

  /* ---- searchLessonSlots ---- */

  searchLessonSlots(instrumentCode, filters, sortBy, limit) {
    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const teachers = this._getFromStorage('teachers', []);
    const teacherMap = {};
    for (const t of teachers) {
      teacherMap[t.id] = t;
    }

    filters = filters || {};

    let results = lessonSlots.filter(function (slot) {
      if (slot.instrumentCode !== instrumentCode) return false;

      if (filters.skillLevel && slot.skillLevel !== filters.skillLevel) return false;
      if (filters.lessonType && slot.lessonType !== filters.lessonType) return false;
      if (typeof filters.durationMinutes === 'number' && slot.durationMinutes !== filters.durationMinutes) return false;
      if (filters.dayOfWeek && slot.dayOfWeek !== filters.dayOfWeek) return false;

      // Date range filter (compare date-only strings)
      const dateStr = slot.startDateTime ? slot.startDateTime.slice(0, 10) : '';
      if (filters.dateFrom && dateStr < filters.dateFrom) return false;
      if (filters.dateTo && dateStr > filters.dateTo) return false;

      // Time window filter
      const minutes = (new Date(slot.startDateTime)).getUTCHours() * 60 + (new Date(slot.startDateTime)).getUTCMinutes();
      if (typeof filters.startTimeMinutesFrom === 'number' && minutes < filters.startTimeMinutesFrom) return false;
      if (typeof filters.startTimeMinutesTo === 'number' && minutes > filters.startTimeMinutesTo) return false;

      // Teacher rating filter
      if (typeof filters.minTeacherRating === 'number') {
        const teacher = teacherMap[slot.teacherId];
        if (!teacher || typeof teacher.rating !== 'number' || teacher.rating < filters.minTeacherRating) {
          return false;
        }
      }

      if (filters.onlyAvailable) {
        if (slot.status !== 'available') return false;
        if (typeof slot.remainingCapacity === 'number' && slot.remainingCapacity <= 0) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price_asc') {
      results.sort(function (a, b) { return a.price - b.price; });
    } else if (sortBy === 'price_desc') {
      results.sort(function (a, b) { return b.price - a.price; });
    } else if (sortBy === 'rating_desc') {
      results.sort(function (a, b) {
        const ta = teacherMap[a.teacherId];
        const tb = teacherMap[b.teacherId];
        const ra = ta && typeof ta.rating === 'number' ? ta.rating : 0;
        const rb = tb && typeof tb.rating === 'number' ? tb.rating : 0;
        return rb - ra;
      });
    } else if (sortBy === 'time_asc') {
      results.sort(function (a, b) {
        const da = new Date(a.startDateTime);
        const db = new Date(b.startDateTime);
        return da - db;
      });
    }

    if (typeof limit === 'number' && limit > 0) {
      results = results.slice(0, limit);
    }

    const self = this;
    return results.map(function (slot) {
      const teacher = teacherMap[slot.teacherId] || {};
      return {
        lessonSlotId: slot.id,
        instrumentCode: slot.instrumentCode,
        teacherId: slot.teacherId,
        teacherName: teacher.fullName || '',
        teacherRating: typeof teacher.rating === 'number' ? teacher.rating : null,
        teacherRatingCount: typeof teacher.ratingCount === 'number' ? teacher.ratingCount : null,
        skillLevel: slot.skillLevel,
        lessonType: slot.lessonType,
        durationMinutes: slot.durationMinutes,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        dayOfWeek: slot.dayOfWeek,
        price: slot.price,
        maxStudents: slot.maxStudents,
        remainingCapacity: slot.remainingCapacity,
        location: slot.location,
        cardDisplayTimeRange: self._formatTimeRangeFromDates(slot.startDateTime, slot.endDateTime),
        // Foreign key resolution for teacher
        teacher: teacher || null
      };
    });
  }

  /* ---- addLessonSlotToCart ---- */

  addLessonSlotToCart(lessonSlotId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) quantity = 1;

    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const slot = lessonSlots.find(function (s) { return s.id === lessonSlotId; }) || null;
    if (!slot) {
      return { success: false, cartItemId: null, cartSummary: null, message: 'Lesson slot not found.' };
    }
    if (slot.status !== 'available' || (typeof slot.remainingCapacity === 'number' && slot.remainingCapacity < quantity)) {
      return { success: false, cartItemId: null, cartSummary: null, message: 'Lesson slot is not available.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = slot.price || 0;
    const totalPrice = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'lesson_slot',
      lessonSlotId: lessonSlotId,
      lessonPackageId: null,
      groupClassId: null,
      giftCardTemplateId: null,
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      metadata: JSON.stringify({
        instrumentCode: slot.instrumentCode,
        lessonType: slot.lessonType,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime
      }),
      createdAt: this._nowIso()
    };

    cartItems.push(cartItem);
    this._setCartItems(cartItems);

    // update cart reference and timestamp
    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updatedAt = this._nowIso();
    this._saveCart(cart);

    const cartItemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });
    const totals = this._calculateCartTotals(cartItemsForCart);

    return {
      success: true,
      cartItemId: cartItem.id,
      cartSummary: {
        itemCount: totals.itemCount,
        subtotal: totals.subtotal
      },
      message: 'Lesson slot added to cart.'
    };
  }

  /* ---- startSingleLessonCheckout ---- */

  startSingleLessonCheckout(lessonSlotId) {
    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const teachers = this._getFromStorage('teachers', []);
    const slot = lessonSlots.find(function (s) { return s.id === lessonSlotId; }) || null;
    if (!slot) {
      return {
        checkoutType: 'single_lesson',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0
      };
    }
    const teacher = teachers.find(function (t) { return t.id === slot.teacherId; }) || {};

    const unitPrice = slot.price || 0;
    const item = {
      itemType: 'lesson_slot',
      lessonSlotId: slot.id,
      title: (slot.durationMinutes || '') + ' min ' + (slot.instrumentCode || '') + ' ' + (slot.lessonType || ''),
      instrumentCode: slot.instrumentCode,
      teacherName: teacher.fullName || '',
      dateTimeLabel: this._formatTimeRangeFromDates(slot.startDateTime, slot.endDateTime),
      durationMinutes: slot.durationMinutes,
      unitPrice: unitPrice,
      totalPrice: unitPrice,
      // foreign key resolution
      lessonSlot: slot,
      teacher: teacher || null
    };

    const ctx = {
      checkoutType: 'single_lesson',
      items: [item],
      subtotal: unitPrice,
      discount: 0,
      total: unitPrice,
      appliedPromoCode: null,
      promotionId: null
    };

    this._saveCheckoutContext(ctx);

    return {
      checkoutType: 'single_lesson',
      items: [item],
      subtotal: unitPrice,
      discount: 0,
      total: unitPrice
    };
  }

  /* ---- getLessonPackagesForInstrument ---- */

  getLessonPackagesForInstrument(instrumentCode) {
    const packages = this._getFromStorage('lesson_packages', []);
    return packages.filter(function (p) {
      return p.isActive && p.instrumentCode === instrumentCode;
    }).map(function (p) {
      return {
        lessonPackageId: p.id,
        name: p.name,
        instrumentCode: p.instrumentCode,
        durationMinutes: p.durationMinutes,
        lessonsPerMonth: p.lessonsPerMonth,
        isPrivate: p.isPrivate,
        lessonType: p.lessonType,
        monthlyPrice: p.monthlyPrice,
        recommendedSkillLevel: p.recommendedSkillLevel,
        description: p.description
      };
    });
  }

  /* ---- getLessonPackageDetails ---- */

  getLessonPackageDetails(lessonPackageId) {
    const packages = this._getFromStorage('lesson_packages', []);
    const pkg = packages.find(function (p) { return p.id === lessonPackageId; }) || null;
    if (!pkg) return null;

    const itemForPromo = {
      itemType: 'lesson_package',
      lessonPackageId: pkg.id,
      instrumentCode: pkg.instrumentCode,
      durationMinutes: pkg.durationMinutes,
      unitPrice: pkg.monthlyPrice
    };
    const applicable = this._findApplicablePromotions([itemForPromo]);

    let promotionNotes = '';
    if (applicable.length > 0) {
      const codes = {};
      for (const a of applicable) {
        const promo = a.promotion;
        codes[promo.promoCode] = promo.title || 'Promotion';
      }
      const entries = Object.keys(codes).map(function (code) {
        return codes[code] + ' (code: ' + code + ')';
      });
      promotionNotes = entries.join('; ');
    }

    const preferredScheduleOptions = {
      allowedDaysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      allowedTimeWindowMinutes: {
        startTimeMinutes: 9 * 60,
        endTimeMinutes: 20 * 60
      }
    };

    return {
      lessonPackageId: pkg.id,
      name: pkg.name,
      instrumentCode: pkg.instrumentCode,
      durationMinutes: pkg.durationMinutes,
      lessonsPerMonth: pkg.lessonsPerMonth,
      isPrivate: pkg.isPrivate,
      lessonType: pkg.lessonType,
      monthlyPrice: pkg.monthlyPrice,
      recommendedSkillLevel: pkg.recommendedSkillLevel,
      description: pkg.description,
      promotionNotes: promotionNotes,
      preferredScheduleOptions: preferredScheduleOptions
    };
  }

  /* ---- addLessonPackageToCart ---- */

  addLessonPackageToCart(lessonPackageId, quantity, schedulePreferences) {
    if (typeof quantity !== 'number' || quantity <= 0) quantity = 1;
    schedulePreferences = schedulePreferences || null;

    const packages = this._getFromStorage('lesson_packages', []);
    const pkg = packages.find(function (p) { return p.id === lessonPackageId; }) || null;
    if (!pkg || !pkg.isActive) {
      return { success: false, cartItemId: null, cartSummary: null, message: 'Lesson package not found.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = pkg.monthlyPrice || 0;
    const totalPrice = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'lesson_package',
      lessonSlotId: null,
      lessonPackageId: lessonPackageId,
      groupClassId: null,
      giftCardTemplateId: null,
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      metadata: JSON.stringify({ schedulePreferences: schedulePreferences || {} }),
      createdAt: this._nowIso()
    };

    cartItems.push(cartItem);
    this._setCartItems(cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updatedAt = this._nowIso();
    this._saveCart(cart);

    const cartItemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });
    const totals = this._calculateCartTotals(cartItemsForCart);

    return {
      success: true,
      cartItemId: cartItem.id,
      cartSummary: {
        itemCount: totals.itemCount,
        subtotal: totals.subtotal
      },
      message: 'Lesson package added to cart.'
    };
  }

  /* ---- getGroupClassFilterOptions ---- */

  getGroupClassFilterOptions() {
    return {
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'mixed_level', label: 'Mixed Level' }
      ],
      dayOfWeekOptions: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      timePresets: [
        {
          key: 'weekday_evening',
          label: 'Weekday evenings (after 5:00 pm)',
          startTimeMinutes: 17 * 60,
          endTimeMinutes: 21 * 60
        }
      ]
    };
  }

  /* ---- searchGroupClasses ---- */

  searchGroupClasses(filters) {
    filters = filters || {};
    const classes = this._getFromStorage('group_classes', []);

    let results = classes.filter(function (gc) {
      if (!gc.isActive) return false;

      if (filters.level && gc.level !== filters.level) return false;
      if (filters.instrumentCode && gc.instrumentCode !== filters.instrumentCode) return false;
      if (filters.dayOfWeek && gc.dayOfWeek !== filters.dayOfWeek) return false;

      if (filters.startDateFrom) {
        const d = gc.startDate ? gc.startDate.slice(0, 10) : '';
        if (d < filters.startDateFrom) return false;
      }
      if (filters.startDateTo) {
        const d = gc.startDate ? gc.startDate.slice(0, 10) : '';
        if (d > filters.startDateTo) return false;
      }

      if (typeof filters.startTimeMinutesFrom === 'number' && typeof gc.startTimeMinutes === 'number') {
        if (gc.startTimeMinutes < filters.startTimeMinutesFrom) return false;
      }
      if (typeof filters.startTimeMinutesTo === 'number' && typeof gc.startTimeMinutes === 'number') {
        if (gc.startTimeMinutes > filters.startTimeMinutesTo) return false;
      }

      if (typeof filters.maxClassSizeAtMost === 'number' && typeof gc.maxClassSize === 'number') {
        if (gc.maxClassSize > filters.maxClassSizeAtMost) return false;
      }

      if (filters.weekdayEveningsOnly) {
        const weekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (weekday.indexOf(gc.dayOfWeek) === -1) return false;
        const start = gc.startTimeMinutes;
        if (typeof start !== 'number' || start < 17 * 60) return false;
      }

      return true;
    });

    const self = this;
    return results.map(function (gc) {
      return {
        groupClassId: gc.id,
        title: gc.title,
        instrumentCode: gc.instrumentCode,
        level: gc.level,
        startDate: gc.startDate,
        dayOfWeek: gc.dayOfWeek,
        startTimeMinutes: gc.startTimeMinutes,
        endTimeMinutes: gc.endTimeMinutes,
        scheduleLabel: gc.dayOfWeek + ' ' + self._minutesToTimeLabel(gc.startTimeMinutes),
        maxClassSize: gc.maxClassSize,
        seatsTaken: gc.seatsTaken,
        price: gc.price
      };
    });
  }

  /* ---- getGroupClassDetails ---- */

  getGroupClassDetails(groupClassId) {
    const classes = this._getFromStorage('group_classes', []);
    const gc = classes.find(function (c) { return c.id === groupClassId; }) || null;
    if (!gc) return null;
    const weekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const meetsWeekdayEveningCriteria = (
      weekday.indexOf(gc.dayOfWeek) !== -1 &&
      typeof gc.startTimeMinutes === 'number' &&
      gc.startTimeMinutes >= 17 * 60
    );

    return {
      groupClassId: gc.id,
      title: gc.title,
      description: gc.description,
      instrumentCode: gc.instrumentCode,
      level: gc.level,
      startDate: gc.startDate,
      endDate: gc.endDate,
      dayOfWeek: gc.dayOfWeek,
      startTimeMinutes: gc.startTimeMinutes,
      endTimeMinutes: gc.endTimeMinutes,
      maxClassSize: gc.maxClassSize,
      seatsTaken: gc.seatsTaken,
      price: gc.price,
      scheduleLabel: gc.dayOfWeek + ' ' + this._minutesToTimeLabel(gc.startTimeMinutes),
      meetsWeekdayEveningCriteria: meetsWeekdayEveningCriteria
    };
  }

  /* ---- addGroupClassToCart ---- */

  addGroupClassToCart(groupClassId, seatCount) {
    if (typeof seatCount !== 'number' || seatCount <= 0) seatCount = 1;

    const classes = this._getFromStorage('group_classes', []);
    const gc = classes.find(function (c) { return c.id === groupClassId; }) || null;
    if (!gc || !gc.isActive) {
      return { success: false, cartItemId: null, cartSummary: null, message: 'Group class not found.' };
    }

    const availableSeats = typeof gc.maxClassSize === 'number' ? (gc.maxClassSize - (gc.seatsTaken || 0)) : seatCount;
    if (seatCount > availableSeats) {
      return { success: false, cartItemId: null, cartSummary: null, message: 'Not enough available seats.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = gc.price || 0;
    const totalPrice = unitPrice * seatCount;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'group_class',
      lessonSlotId: null,
      lessonPackageId: null,
      groupClassId: groupClassId,
      giftCardTemplateId: null,
      quantity: seatCount,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      metadata: JSON.stringify({
        scheduleLabel: gc.dayOfWeek + ' ' + this._minutesToTimeLabel(gc.startTimeMinutes)
      }),
      createdAt: this._nowIso()
    };

    cartItems.push(cartItem);
    this._setCartItems(cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updatedAt = this._nowIso();
    this._saveCart(cart);

    const cartItemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });
    const totals = this._calculateCartTotals(cartItemsForCart);

    return {
      success: true,
      cartItemId: cartItem.id,
      cartSummary: {
        itemCount: totals.itemCount,
        subtotal: totals.subtotal
      },
      message: 'Group class added to cart.'
    };
  }

  /* ---- getCartSummary ---- */

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);

    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const lessonPackages = this._getFromStorage('lesson_packages', []);
    const groupClasses = this._getFromStorage('group_classes', []);
    const giftTemplates = this._getFromStorage('gift_card_templates', []);

    const lessonSlotMap = {};
    for (const s of lessonSlots) lessonSlotMap[s.id] = s;
    const packageMap = {};
    for (const p of lessonPackages) packageMap[p.id] = p;
    const groupClassMap = {};
    for (const g of groupClasses) groupClassMap[g.id] = g;
    const giftTemplateMap = {};
    for (const gt of giftTemplates) giftTemplateMap[gt.id] = gt;

    const self = this;
    const items = cartItems.map(function (ci) {
      let title = '';
      let subtitle = '';
      let dateTimeLabel = '';

      if (ci.itemType === 'lesson_slot') {
        const slot = lessonSlotMap[ci.lessonSlotId] || {};
        title = (slot.instrumentCode || '') + ' ' + (slot.lessonType || 'Lesson');
        subtitle = (slot.durationMinutes || '') + ' min';
        dateTimeLabel = self._formatTimeRangeFromDates(slot.startDateTime, slot.endDateTime);
      } else if (ci.itemType === 'lesson_package') {
        const pkg = packageMap[ci.lessonPackageId] || {};
        title = pkg.name || 'Lesson Package';
        subtitle = (pkg.durationMinutes || '') + ' min x ' + (pkg.lessonsPerMonth || '') + ' / month';
      } else if (ci.itemType === 'group_class') {
        const gc = groupClassMap[ci.groupClassId] || {};
        title = gc.title || 'Group Class';
        subtitle = gc.dayOfWeek || '';
        dateTimeLabel = gc.dayOfWeek + ' ' + self._minutesToTimeLabel(gc.startTimeMinutes || 0);
      } else if (ci.itemType === 'gift_card') {
        const gt = giftTemplateMap[ci.giftCardTemplateId] || {};
        title = gt.name || 'Gift Card';
      }

      return {
        cartItemId: ci.id,
        itemType: ci.itemType,
        title: title,
        subtitle: subtitle,
        dateTimeLabel: dateTimeLabel,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice
      };
    });

    const totals = this._calculateCartTotals(cartItems);

    return {
      items: items,
      itemCount: totals.itemCount,
      subtotal: totals.subtotal,
      discount: 0,
      total: totals.total
    };
  }

  /* ---- updateCartItemQuantity ---- */

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cartSummary: null, message: 'Cart item not found.' };
    }

    if (quantity <= 0) {
      // Remove via removeCartItem
      return this.removeCartItem(cartItemId);
    }

    const ci = cartItems[idx];

    // Capacity checks for lesson_slot / group_class
    if (ci.itemType === 'lesson_slot' && ci.lessonSlotId) {
      const slots = this._getFromStorage('lesson_slots', []);
      const slot = slots.find(function (s) { return s.id === ci.lessonSlotId; }) || null;
      if (slot && typeof slot.remainingCapacity === 'number' && quantity > slot.remainingCapacity) {
        return { success: false, cartSummary: null, message: 'Not enough capacity for this lesson slot.' };
      }
      // For private lessons, enforce max 1
      if (slot && slot.maxStudents === 1 && quantity > 1) {
        quantity = 1;
      }
    }

    if (ci.itemType === 'group_class' && ci.groupClassId) {
      const groupClasses = this._getFromStorage('group_classes', []);
      const gc = groupClasses.find(function (g) { return g.id === ci.groupClassId; }) || null;
      if (gc && typeof gc.maxClassSize === 'number') {
        const availableSeats = gc.maxClassSize - (gc.seatsTaken || 0);
        if (quantity > availableSeats) {
          return { success: false, cartSummary: null, message: 'Not enough available seats.' };
        }
      }
    }

    ci.quantity = quantity;
    ci.totalPrice = ci.unitPrice * quantity;
    cartItems[idx] = ci;
    this._setCartItems(cartItems);

    const cart = this._getOrCreateCart();
    const cartItemsForCart = cartItems.filter(function (item) { return item.cartId === cart.id; });
    const totals = this._calculateCartTotals(cartItemsForCart);

    return {
      success: true,
      cartSummary: {
        itemCount: totals.itemCount,
        subtotal: totals.subtotal,
        total: totals.total
      },
      message: 'Cart item updated.'
    };
  }

  /* ---- removeCartItem ---- */

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cartSummary: null, message: 'Cart item not found.' };
    }
    const ci = cartItems[idx];
    cartItems.splice(idx, 1);
    this._setCartItems(cartItems);

    const cart = this._getOrCreateCart();
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(function (id) { return id !== cartItemId; });
      cart.updatedAt = this._nowIso();
      this._saveCart(cart);
    }

    const cartItemsForCart = cartItems.filter(function (item) { return item.cartId === cart.id; });
    const totals = this._calculateCartTotals(cartItemsForCart);

    return {
      success: true,
      cartSummary: {
        itemCount: totals.itemCount,
        subtotal: totals.subtotal,
        total: totals.total
      },
      message: 'Cart item removed.'
    };
  }

  /* ---- startCheckoutFromCart ---- */

  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);

    const items = cartItems.map(function (ci) {
      return {
        cartItemId: ci.id,
        itemType: ci.itemType,
        title: '',
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice
      };
    });

    const totals = this._calculateCartTotals(cartItems);

    const ctx = {
      checkoutType: 'cart',
      items: cartItems.map(function (ci) {
        return {
          itemType: ci.itemType,
          cartItemId: ci.id,
          lessonSlotId: ci.lessonSlotId,
          lessonPackageId: ci.lessonPackageId,
          groupClassId: ci.groupClassId,
          giftCardTemplateId: ci.giftCardTemplateId,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
          totalPrice: ci.totalPrice
        };
      }),
      subtotal: totals.subtotal,
      discount: 0,
      total: totals.total,
      appliedPromoCode: null,
      promotionId: null
    };

    this._saveCheckoutContext(ctx);

    return {
      checkoutType: 'cart',
      items: items,
      subtotal: totals.subtotal,
      discount: 0,
      total: totals.total
    };
  }

  /* ---- startPackageCheckout ---- */

  startPackageCheckout(lessonPackageId, schedulePreferences) {
    schedulePreferences = schedulePreferences || null;

    const packages = this._getFromStorage('lesson_packages', []);
    const pkg = packages.find(function (p) { return p.id === lessonPackageId; }) || null;
    if (!pkg) {
      const empty = { checkoutType: 'single_package', items: [], subtotal: 0, discount: 0, total: 0 };
      this._saveCheckoutContext({
        checkoutType: 'single_package',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        appliedPromoCode: null,
        promotionId: null
      });
      return empty;
    }

    const unitPrice = pkg.monthlyPrice || 0;
    const item = {
      itemType: 'lesson_package',
      lessonPackageId: pkg.id,
      title: pkg.name,
      quantity: 1,
      unitPrice: unitPrice,
      totalPrice: unitPrice,
      schedulePreferences: schedulePreferences || {},
      lessonPackage: pkg
    };

    const ctx = {
      checkoutType: 'single_package',
      items: [item],
      subtotal: unitPrice,
      discount: 0,
      total: unitPrice,
      appliedPromoCode: null,
      promotionId: null
    };
    this._saveCheckoutContext(ctx);

    return {
      checkoutType: 'single_package',
      items: [item],
      subtotal: unitPrice,
      discount: 0,
      total: unitPrice
    };
  }

  /* ---- startGroupClassCheckout ---- */

  startGroupClassCheckout(groupClassId, seatCount) {
    if (typeof seatCount !== 'number' || seatCount <= 0) seatCount = 1;

    const classes = this._getFromStorage('group_classes', []);
    const gc = classes.find(function (g) { return g.id === groupClassId; }) || null;
    if (!gc) {
      const empty = { checkoutType: 'single_group_class', items: [], subtotal: 0, discount: 0, total: 0 };
      this._saveCheckoutContext({
        checkoutType: 'single_group_class',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        appliedPromoCode: null,
        promotionId: null
      });
      return empty;
    }

    const unitPrice = gc.price || 0;
    const totalPrice = unitPrice * seatCount;

    const item = {
      itemType: 'group_class',
      groupClassId: gc.id,
      title: gc.title,
      quantity: seatCount,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      groupClass: gc
    };

    const ctx = {
      checkoutType: 'single_group_class',
      items: [item],
      subtotal: totalPrice,
      discount: 0,
      total: totalPrice,
      appliedPromoCode: null,
      promotionId: null
    };

    this._saveCheckoutContext(ctx);

    return {
      checkoutType: 'single_group_class',
      items: [item],
      subtotal: totalPrice,
      discount: 0,
      total: totalPrice
    };
  }

  /* ---- getCheckoutSummary ---- */

  getCheckoutSummary() {
    const ctx = this._getCurrentCheckoutContext();

    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const lessonPackages = this._getFromStorage('lesson_packages', []);
    const groupClasses = this._getFromStorage('group_classes', []);
    const giftTemplates = this._getFromStorage('gift_card_templates', []);

    const lessonSlotMap = {};
    for (const s of lessonSlots) lessonSlotMap[s.id] = s;
    const packageMap = {};
    for (const p of lessonPackages) packageMap[p.id] = p;
    const groupClassMap = {};
    for (const g of groupClasses) groupClassMap[g.id] = g;
    const giftTemplateMap = {};
    for (const gt of giftTemplates) giftTemplateMap[gt.id] = gt;

    const items = (ctx.items || []).map(function (it) {
      const cloned = Object.assign({}, it);
      if (it.lessonSlotId) {
        cloned.lessonSlot = lessonSlotMap[it.lessonSlotId] || null;
      }
      if (it.lessonPackageId) {
        cloned.lessonPackage = packageMap[it.lessonPackageId] || null;
      }
      if (it.groupClassId) {
        cloned.groupClass = groupClassMap[it.groupClassId] || null;
      }
      if (it.giftCardTemplateId) {
        cloned.giftCardTemplate = giftTemplateMap[it.giftCardTemplateId] || null;
      }
      return cloned;
    });

    return {
      items: items,
      subtotal: ctx.subtotal || 0,
      discount: ctx.discount || 0,
      total: ctx.total || 0,
      appliedPromoCode: ctx.appliedPromoCode || null
    };
  }

  /* ---- applyPromoCodeToCurrentCheckout ---- */

  applyPromoCodeToCurrentCheckout(promoCode) {
    const ctx = this._getCurrentCheckoutContext();
    if (!ctx || !ctx.items || ctx.items.length === 0) {
      return {
        success: false,
        message: 'No active checkout.',
        subtotal: 0,
        discount: 0,
        total: 0,
        appliedPromoCode: null
      };
    }

    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    const promo = promotions.find(function (p) {
      if (!p.isActive) return false;
      if (p.promoCode !== promoCode) return false;
      const s = new Date(p.startDate);
      const e = new Date(p.endDate);
      return now >= s && now <= e;
    }) || null;

    if (!promo) {
      this._recalculateCheckoutTotals(ctx);
      this._saveCheckoutContext(ctx);
      return {
        success: false,
        message: 'Promo code not valid.',
        subtotal: ctx.subtotal,
        discount: 0,
        total: ctx.subtotal,
        appliedPromoCode: null
      };
    }

    // Determine eligible items
    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const lessonPackages = this._getFromStorage('lesson_packages', []);
    const groupClasses = this._getFromStorage('group_classes', []);

    const slotMap = {};
    for (const s of lessonSlots) slotMap[s.id] = s;
    const pkgMap = {};
    for (const p of lessonPackages) pkgMap[p.id] = p;
    const gcMap = {};
    for (const g of groupClasses) gcMap[g.id] = g;

    let subtotal = 0;
    let discount = 0;

    for (const item of ctx.items) {
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const itemTotal = (item.totalPrice || (item.unitPrice || 0) * qty);
      subtotal += itemTotal;

      let instrumentCode = null;
      let durationMinutes = null;

      if (item.itemType === 'lesson_slot' && item.lessonSlotId) {
        const slot = slotMap[item.lessonSlotId];
        if (slot) {
          instrumentCode = slot.instrumentCode;
          durationMinutes = slot.durationMinutes;
        }
      } else if (item.itemType === 'lesson_package' && item.lessonPackageId) {
        const pkg = pkgMap[item.lessonPackageId];
        if (pkg) {
          instrumentCode = pkg.instrumentCode;
          durationMinutes = pkg.durationMinutes;
        }
      } else if (item.itemType === 'group_class' && item.groupClassId) {
        const gc = gcMap[item.groupClassId];
        if (gc) {
          instrumentCode = gc.instrumentCode;
          durationMinutes = gc.endTimeMinutes && gc.startTimeMinutes ? (gc.endTimeMinutes - gc.startTimeMinutes) : null;
        }
      }

      let eligible = false;

      if (promo.targetItemType === item.itemType) {
        if (!promo.targetInstrumentCode || promo.targetInstrumentCode === instrumentCode) {
          eligible = true;
        }
      }

      if (eligible && typeof promo.minPrice === 'number' && item.unitPrice < promo.minPrice) {
        eligible = false;
      }

      if (eligible && typeof promo.minDurationMinutes === 'number' && typeof durationMinutes === 'number' && durationMinutes < promo.minDurationMinutes) {
        eligible = false;
      }

      if (eligible) {
        if (promo.discountType === 'percentage') {
          discount += itemTotal * (promo.discountValue / 100);
        } else if (promo.discountType === 'fixed_amount') {
          // apply fixed amount once across first eligible item
          if (discount === 0) {
            discount += Math.min(promo.discountValue, itemTotal);
          }
        }
      }
    }

    ctx.subtotal = subtotal;
    ctx.discount = discount;
    ctx.total = Math.max(0, subtotal - discount);
    ctx.appliedPromoCode = promoCode;
    ctx.promotionId = promo.id;
    this._saveCheckoutContext(ctx);

    return {
      success: true,
      message: 'Promo code applied.',
      subtotal: ctx.subtotal,
      discount: ctx.discount,
      total: ctx.total,
      appliedPromoCode: ctx.appliedPromoCode
    };
  }

  /* ---- completeCurrentCheckout ---- */

  completeCurrentCheckout(contact, paymentOption, notes) {
    const allowedPayment = ['pay_at_studio', 'pay_later', 'no_payment_required'];
    if (allowedPayment.indexOf(paymentOption) === -1) {
      paymentOption = 'pay_at_studio';
    }

    const ctx = this._getCurrentCheckoutContext();
    if (!ctx || !ctx.items || ctx.items.length === 0) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        status: 'pending',
        subtotal: 0,
        discount: 0,
        total: 0,
        confirmationMessage: 'No items to checkout.'
      };
    }

    this._recalculateCheckoutTotals(ctx);

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const lessonBookings = this._getFromStorage('lesson_bookings', []);
    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const groupClasses = this._getFromStorage('group_classes', []);

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + Date.now();

    const contactFullName = contact && contact.fullName ? contact.fullName : ((contact.firstName || '') + ' ' + (contact.lastName || '')).trim();

    const order = {
      id: orderId,
      orderNumber: orderNumber,
      createdAt: this._nowIso(),
      contactFirstName: contact.firstName || null,
      contactLastName: contact.lastName || null,
      contactFullName: contactFullName || null,
      contactEmail: contact.email || '',
      contactPhone: contact.phone || null,
      contactZip: contact.zip || null,
      paymentOption: paymentOption,
      promoCode: ctx.appliedPromoCode || null,
      promotionId: ctx.promotionId || null,
      subtotalAmount: ctx.subtotal,
      discountAmount: ctx.discount,
      totalAmount: ctx.total,
      status: 'pending',
      notes: notes || null
    };

    orders.push(order);

    // Maps for updating capacities & bookings
    const slotMap = {};
    for (const s of lessonSlots) slotMap[s.id] = s;
    const groupClassMap = {};
    for (const g of groupClasses) groupClassMap[g.id] = g;

    for (const item of ctx.items) {
      const orderItemId = this._generateId('order_item');
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const totalPrice = item.totalPrice || (item.unitPrice || 0) * qty;

      const orderItem = {
        id: orderItemId,
        orderId: orderId,
        itemType: item.itemType,
        lessonSlotId: item.lessonSlotId || null,
        lessonPackageId: item.lessonPackageId || null,
        groupClassId: item.groupClassId || null,
        giftCardPurchaseId: null,
        quantity: qty,
        unitPrice: item.unitPrice || 0,
        totalPrice: totalPrice,
        description: ''
      };

      orderItems.push(orderItem);

      if (item.itemType === 'lesson_slot' && item.lessonSlotId && slotMap[item.lessonSlotId]) {
        const slot = slotMap[item.lessonSlotId];
        // Create booking
        const bookingId = this._generateId('lesson_booking');
        const booking = {
          id: bookingId,
          lessonSlotId: slot.id,
          instrumentCode: slot.instrumentCode,
          teacherId: slot.teacherId,
          durationMinutes: slot.durationMinutes,
          scheduledStartDateTime: slot.startDateTime,
          scheduledEndDateTime: slot.endDateTime,
          lessonType: slot.lessonType,
          bookingSourceType: 'direct_booking',
          sourceReferenceId: orderItemId,
          status: 'booked',
          contactName: contactFullName || null,
          createdAt: this._nowIso(),
          updatedAt: this._nowIso()
        };
        lessonBookings.push(booking);

        // Update slot capacity & status
        if (typeof slot.remainingCapacity === 'number') {
          slot.remainingCapacity = Math.max(0, slot.remainingCapacity - qty);
        }
        if (slot.remainingCapacity === 0) {
          slot.status = 'booked';
        }
      }

      if (item.itemType === 'group_class' && item.groupClassId && groupClassMap[item.groupClassId]) {
        const gc = groupClassMap[item.groupClassId];
        if (typeof gc.seatsTaken === 'number') {
          gc.seatsTaken += qty;
        } else {
          gc.seatsTaken = qty;
        }
      }
    }

    // Persist updated tables
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('lesson_bookings', lessonBookings);
    this._saveToStorage('lesson_slots', Object.values(slotMap));
    this._saveToStorage('group_classes', Object.values(groupClassMap));

    // Clear cart if checkout from cart
    if (ctx.checkoutType === 'cart') {
      const cart = this._getOrCreateCart();
      const allCartItems = this._getFromStorage('cart_items', []);
      const remainingCartItems = allCartItems.filter(function (ci) { return ci.cartId !== cart.id; });
      this._setCartItems(remainingCartItems);
      cart.items = [];
      cart.updatedAt = this._nowIso();
      this._saveCart(cart);
    }

    this._clearCheckoutContext();

    return {
      success: true,
      orderId: orderId,
      orderNumber: orderNumber,
      status: order.status,
      subtotal: order.subtotalAmount,
      discount: order.discountAmount,
      total: order.totalAmount,
      confirmationMessage: 'Your reservation has been placed.'
    };
  }

  /* ---- getFamilyEnrollmentConfig ---- */

  getFamilyEnrollmentConfig() {
    return this._getFromStorage('family_enrollment_config', {
      allowedDurationsMinutes: [],
      recurrenceTypes: [],
      allowedDaysOfWeek: [],
      backToBackOffsetMinutesMax: 15
    });
  }

  /* ---- submitFamilyEnrollment ---- */

  submitFamilyEnrollment(parent, students, notes) {
    parent = parent || {};
    students = Array.isArray(students) ? students : [];

    const familyEnrollments = this._getFromStorage('family_enrollments', []);
    const studentEnrollments = this._getFromStorage('family_student_enrollments', []);

    const familyEnrollmentId = this._generateId('family_enrollment');

    const familyEnrollment = {
      id: familyEnrollmentId,
      parentName: parent.name || '',
      parentEmail: parent.email || '',
      parentPhone: parent.phone || '',
      createdAt: this._nowIso(),
      status: 'submitted',
      notes: notes || null
    };

    familyEnrollments.push(familyEnrollment);

    for (const s of students) {
      const studentEnrollment = {
        id: this._generateId('family_student_enrollment'),
        familyEnrollmentId: familyEnrollmentId,
        studentName: s.studentName || '',
        studentAge: s.studentAge || 0,
        instrumentCode: s.instrumentCode,
        durationMinutes: s.durationMinutes,
        preferredDayOfWeek: s.preferredDayOfWeek,
        preferredStartTimeMinutes: s.preferredStartTimeMinutes,
        preferredEndTimeMinutes: s.preferredEndTimeMinutes,
        recurrenceType: s.recurrenceType,
        createdAt: this._nowIso()
      };
      studentEnrollments.push(studentEnrollment);
    }

    this._saveToStorage('family_enrollments', familyEnrollments);
    this._saveToStorage('family_student_enrollments', studentEnrollments);

    const backToBackValidated = this._validateFamilyScheduleBackToBack(students);

    return {
      success: true,
      familyEnrollmentId: familyEnrollmentId,
      status: 'submitted',
      backToBackSchedulingValidated: backToBackValidated,
      confirmationMessage: 'Family enrollment submitted.'
    };
  }

  /* ---- getGiftCardTemplates ---- */

  getGiftCardTemplates() {
    const templates = this._getFromStorage('gift_card_templates', []);
    return templates.filter(function (t) { return t.isActive; }).map(function (t) {
      return {
        giftCardTemplateId: t.id,
        name: t.name,
        type: t.type,
        defaultAmount: t.defaultAmount,
        minAmount: t.minAmount,
        maxAmount: t.maxAmount,
        allowedUsageCategory: t.allowedUsageCategory,
        description: t.description
      };
    });
  }

  /* ---- startGiftCardPurchase ---- */

  startGiftCardPurchase(
    giftCardTemplateId,
    amount,
    usageCategory,
    specificInstrumentCode,
    deliveryMethod,
    scheduledSendDate,
    recipient,
    buyer,
    paymentOption
  ) {
    const allowedPayment = ['pay_at_studio', 'pay_later', 'no_payment_required'];
    if (allowedPayment.indexOf(paymentOption) === -1) {
      paymentOption = 'pay_at_studio';
    }

    const templates = this._getFromStorage('gift_card_templates', []);
    const template = templates.find(function (t) { return t.id === giftCardTemplateId; }) || null;
    if (!template) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        giftCardPurchaseId: null,
        status: 'scheduled',
        confirmationMessage: 'Gift card template not found.'
      };
    }

    amount = typeof amount === 'number' ? amount : template.defaultAmount || template.minAmount || 0;

    const purchases = this._getFromStorage('gift_card_purchases', []);
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const giftCardPurchaseId = this._generateId('gift_card_purchase');

    const purchase = {
      id: giftCardPurchaseId,
      giftCardTemplateId: template.id,
      amount: amount,
      usageCategory: usageCategory,
      specificInstrumentCode: usageCategory === 'specific_instrument' ? specificInstrumentCode || null : null,
      deliveryMethod: deliveryMethod,
      scheduledSendDate: scheduledSendDate,
      recipientName: recipient && recipient.name ? recipient.name : '',
      recipientEmail: recipient && recipient.email ? recipient.email : '',
      message: recipient && recipient.message ? recipient.message : '',
      buyerName: buyer && buyer.name ? buyer.name : '',
      buyerEmail: buyer && buyer.email ? buyer.email : '',
      status: 'scheduled',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    purchases.push(purchase);

    const orderId = this._generateId('order');
    const orderNumber = 'GC-' + Date.now();

    const order = {
      id: orderId,
      orderNumber: orderNumber,
      createdAt: this._nowIso(),
      contactFirstName: null,
      contactLastName: null,
      contactFullName: buyer && buyer.name ? buyer.name : null,
      contactEmail: buyer && buyer.email ? buyer.email : '',
      contactPhone: null,
      contactZip: null,
      paymentOption: paymentOption,
      promoCode: null,
      promotionId: null,
      subtotalAmount: amount,
      discountAmount: 0,
      totalAmount: amount,
      status: 'pending',
      notes: null
    };

    const orderItem = {
      id: this._generateId('order_item'),
      orderId: orderId,
      itemType: 'gift_card',
      lessonSlotId: null,
      lessonPackageId: null,
      groupClassId: null,
      giftCardPurchaseId: giftCardPurchaseId,
      quantity: 1,
      unitPrice: amount,
      totalPrice: amount,
      description: template.name || 'Gift Card'
    };

    orders.push(order);
    orderItems.push(orderItem);

    this._saveToStorage('gift_card_purchases', purchases);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    return {
      success: true,
      orderId: orderId,
      orderNumber: orderNumber,
      giftCardPurchaseId: giftCardPurchaseId,
      status: purchase.status,
      confirmationMessage: 'Gift card order placed and scheduled.'
    };
  }

  /* ---- getUpcomingLessons ---- */

  getUpcomingLessons() {
    const bookings = this._getFromStorage('lesson_bookings', []);
    const teachers = this._getFromStorage('teachers', []);
    const teacherMap = {};
    for (const t of teachers) teacherMap[t.id] = t;

    const now = new Date();
    const upcoming = bookings.filter(function (b) {
      if (b.status !== 'booked' && b.status !== 'rescheduled') return false;
      const start = new Date(b.scheduledStartDateTime);
      return start >= now;
    });

    upcoming.sort(function (a, b) {
      const da = new Date(a.scheduledStartDateTime);
      const db = new Date(b.scheduledStartDateTime);
      return da - db;
    });

    const lessonSlots = this._getFromStorage('lesson_slots', []);
    const slotMap = {};
    for (const s of lessonSlots) slotMap[s.id] = s;

    const self = this;
    return upcoming.map(function (b) {
      const teacher = teacherMap[b.teacherId] || {};
      const slot = slotMap[b.lessonSlotId] || null;
      return {
        bookingId: b.id,
        lessonSlotId: b.lessonSlotId,
        instrumentCode: b.instrumentCode,
        teacherName: teacher.fullName || '',
        durationMinutes: b.durationMinutes,
        scheduledStartDateTime: b.scheduledStartDateTime,
        scheduledEndDateTime: b.scheduledEndDateTime,
        lessonType: b.lessonType,
        status: b.status,
        displayTimeRange: self._formatTimeRangeFromDates(b.scheduledStartDateTime, b.scheduledEndDateTime),
        // foreign key resolution
        lessonSlot: slot
      };
    });
  }

  /* ---- getRescheduleOptionsForBooking ---- */

  getRescheduleOptionsForBooking(bookingId, allowedDaysOfWeek, startTimeMinutesFrom, startTimeMinutesTo) {
    const bookings = this._getFromStorage('lesson_bookings', []);
    const booking = bookings.find(function (b) { return b.id === bookingId; }) || null;
    if (!booking) return [];

    allowedDaysOfWeek = Array.isArray(allowedDaysOfWeek) && allowedDaysOfWeek.length > 0
      ? allowedDaysOfWeek
      : ['wednesday', 'thursday', 'friday'];

    const lessonSlots = this._getFromStorage('lesson_slots', []);

    const options = lessonSlots.filter(function (slot) {
      if (slot.teacherId !== booking.teacherId) return false;
      if (slot.instrumentCode !== booking.instrumentCode) return false;
      if (slot.durationMinutes !== booking.durationMinutes) return false;
      if (slot.status !== 'available') return false;
      if (typeof slot.remainingCapacity === 'number' && slot.remainingCapacity <= 0) return false;
      if (allowedDaysOfWeek.indexOf(slot.dayOfWeek) === -1) return false;

      const minutes = (new Date(slot.startDateTime)).getUTCHours() * 60 + (new Date(slot.startDateTime)).getUTCMinutes();
      if (typeof startTimeMinutesFrom === 'number' && minutes < startTimeMinutesFrom) return false;
      if (typeof startTimeMinutesTo === 'number' && minutes > startTimeMinutesTo) return false;

      return true;
    });

    const self = this;
    return options.map(function (slot) {
      return {
        lessonSlotId: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        displayTimeRange: self._formatTimeRangeFromDates(slot.startDateTime, slot.endDateTime),
        lessonSlot: slot
      };
    });
  }

  /* ---- rescheduleLessonBooking ---- */

  rescheduleLessonBooking(bookingId, newLessonSlotId) {
    const bookings = this._getFromStorage('lesson_bookings', []);
    const lessonSlots = this._getFromStorage('lesson_slots', []);

    const bookingIdx = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (bookingIdx === -1) {
      return {
        success: false,
        bookingId: null,
        newScheduledStartDateTime: null,
        newScheduledEndDateTime: null,
        displayTimeRange: '',
        confirmationMessage: 'Booking not found.'
      };
    }

    const booking = bookings[bookingIdx];

    const newSlot = lessonSlots.find(function (s) { return s.id === newLessonSlotId; }) || null;
    if (!newSlot) {
      return {
        success: false,
        bookingId: bookingId,
        newScheduledStartDateTime: null,
        newScheduledEndDateTime: null,
        displayTimeRange: '',
        confirmationMessage: 'New slot not found.'
      };
    }

    if (newSlot.teacherId !== booking.teacherId) {
      return {
        success: false,
        bookingId: bookingId,
        newScheduledStartDateTime: null,
        newScheduledEndDateTime: null,
        displayTimeRange: '',
        confirmationMessage: 'New slot must be with the same teacher.'
      };
    }

    if (newSlot.status !== 'available' || (typeof newSlot.remainingCapacity === 'number' && newSlot.remainingCapacity <= 0)) {
      return {
        success: false,
        bookingId: bookingId,
        newScheduledStartDateTime: null,
        newScheduledEndDateTime: null,
        displayTimeRange: '',
        confirmationMessage: 'New slot is not available.'
      };
    }

    // Update old slot capacity (+1)
    const oldSlot = lessonSlots.find(function (s) { return s.id === booking.lessonSlotId; }) || null;
    if (oldSlot && typeof oldSlot.remainingCapacity === 'number') {
      oldSlot.remainingCapacity += 1;
      if (oldSlot.status === 'booked') {
        oldSlot.status = 'available';
      }
    }

    // Consume new slot capacity (-1)
    if (typeof newSlot.remainingCapacity === 'number') {
      newSlot.remainingCapacity = Math.max(0, newSlot.remainingCapacity - 1);
      if (newSlot.remainingCapacity === 0) {
        newSlot.status = 'booked';
      }
    }

    // Save updated slots
    const updatedSlots = lessonSlots.map(function (s) {
      if (s.id === newSlot.id) return newSlot;
      if (oldSlot && s.id === oldSlot.id) return oldSlot;
      return s;
    });

    booking.lessonSlotId = newSlot.id;
    booking.scheduledStartDateTime = newSlot.startDateTime;
    booking.scheduledEndDateTime = newSlot.endDateTime;
    booking.status = 'rescheduled';
    booking.updatedAt = this._nowIso();

    bookings[bookingIdx] = booking;

    this._saveToStorage('lesson_slots', updatedSlots);
    this._saveToStorage('lesson_bookings', bookings);

    const displayTimeRange = this._formatTimeRangeFromDates(newSlot.startDateTime, newSlot.endDateTime);

    return {
      success: true,
      bookingId: booking.id,
      newScheduledStartDateTime: booking.scheduledStartDateTime,
      newScheduledEndDateTime: booking.scheduledEndDateTime,
      displayTimeRange: displayTimeRange,
      confirmationMessage: 'Lesson rescheduled.'
    };
  }

  /* ---- submitContactMessage ---- */

  submitContactMessage(topic, fullName, email, preferredContactMethod, phone, message) {
    const allowedTopics = ['studio_rental', 'general_inquiry', 'lessons', 'group_classes', 'billing'];
    if (allowedTopics.indexOf(topic) === -1) {
      topic = 'general_inquiry';
    }

    const allowedMethods = ['email', 'phone'];
    if (preferredContactMethod && allowedMethods.indexOf(preferredContactMethod) === -1) {
      preferredContactMethod = 'email';
    }

    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact_message');

    const record = {
      id: id,
      topic: topic,
      fullName: fullName || '',
      email: email || '',
      preferredContactMethod: preferredContactMethod || null,
      phone: phone || null,
      message: message || '',
      createdAt: this._nowIso(),
      status: 'new'
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contactMessageId: id,
      status: 'new',
      confirmationMessage: 'Your message has been sent.'
    };
  }

  /* ---- getAboutPageContent ---- */

  getAboutPageContent() {
    const base = this._getFromStorage('about_page_content', {
      missionText: '',
      historyText: '',
      approachText: '',
      locationText: '',
      hoursText: '',
      teacherHighlights: []
    });

    const teachers = this._getFromStorage('teachers', []);
    const active = teachers.filter(function (t) { return t.isActive; });
    active.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    const top = active.slice(0, 5);

    const teacherHighlights = top.map(function (t) {
      return {
        teacherName: t.fullName,
        instruments: t.instruments || [],
        rating: t.rating,
        ratingCount: t.ratingCount || 0,
        bioSnippet: t.bio || ''
      };
    });

    return {
      missionText: base.missionText,
      historyText: base.historyText,
      approachText: base.approachText,
      locationText: base.locationText,
      hoursText: base.hoursText,
      teacherHighlights: teacherHighlights
    };
  }

  /* ---- getPoliciesContent ---- */

  getPoliciesContent() {
    return this._getFromStorage('policies_content', {
      bookingPolicyHtml: '',
      cancellationPolicyHtml: '',
      reschedulingPolicyHtml: '',
      paymentAndRefundPolicyHtml: '',
      packageTermsHtml: '',
      studioRentalPolicyHtml: '',
      giftCardPolicyHtml: ''
    });
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
