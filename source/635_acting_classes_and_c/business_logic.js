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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const arrayKeys = [
      'classes',
      'class_sessions',
      'saved_classes',
      'cart_items',
      'gift_card_templates',
      'blog_articles',
      'newsletter_subscriptions',
      'workshops',
      'workshop_time_slots',
      'workshop_registrations',
      'coaching_offerings',
      'coaching_bookings',
      'coaches',
      'testimonials',
      'consultation_requests',
      'contact_form_submissions'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart object
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    // Optional singleton content objects
    if (!localStorage.getItem('studio_info')) {
      localStorage.setItem('studio_info', 'null');
    }
    if (!localStorage.getItem('contact_page_content')) {
      localStorage.setItem('contact_page_content', 'null');
    }

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
      const parsed = JSON.parse(raw);
      return parsed === null && defaultValue !== undefined ? defaultValue : parsed;
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

  // ------------------------
  // Generic utilities
  // ------------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  }

  _toDayOfWeek(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _intersectsTags(itemTags, filterTags) {
    if (!filterTags || !filterTags.length) return true;
    if (!itemTags || !itemTags.length) return false;
    const set = new Set((itemTags || []).map((t) => String(t).toLowerCase()));
    return filterTags.some((t) => set.has(String(t).toLowerCase()));
  }

  _stringContains(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
  }

  // ------------------------
  // Enum / label helpers
  // ------------------------

  _formatDisplayLabels(type, value) {
    if (!value) return '';
    const simpleHumanize = (v) => v.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    switch (type) {
      case 'category':
        switch (value) {
          case 'acting_foundations': return 'Acting Foundations';
          case 'improv': return 'Improv';
          case 'scene_study': return 'Scene Study';
          case 'voice': return 'Voice';
          case 'movement': return 'Movement';
          case 'on_camera': return 'On-Camera';
          case 'other': return 'Other';
          default: return simpleHumanize(value);
        }
      case 'level':
        switch (value) {
          case 'beginner': return 'Beginner';
          case 'intermediate': return 'Intermediate';
          case 'advanced': return 'Advanced';
          case 'all_levels': return 'All Levels';
          default: return simpleHumanize(value);
        }
      case 'class_type':
        switch (value) {
          case 'course': return 'Course';
          case 'drop_in': return 'Drop-in';
          case 'intensive': return 'Intensive';
          case 'workshop_like': return 'Workshop-Style';
          default: return simpleHumanize(value);
        }
      case 'schedule_label':
        switch (value) {
          case 'weekday_daytime': return 'Weekday Daytime';
          case 'weekday_evening': return 'Weekday Evening';
          case 'weekend': return 'Weekend';
          case 'mixed': return 'Mixed Schedule';
          default: return simpleHumanize(value);
        }
      case 'day_of_week':
        return simpleHumanize(value);
      case 'session_status':
        switch (value) {
          case 'published': return 'Published';
          case 'canceled': return 'Canceled';
          case 'sold_out': return 'Sold Out';
          case 'draft': return 'Draft';
          default: return simpleHumanize(value);
        }
      case 'workshop_target_level':
        return this._formatDisplayLabels('level', value);
      case 'coaching_type':
        switch (value) {
          case 'on_camera': return 'On-Camera Coaching';
          case 'audition': return 'Audition Coaching';
          case 'voice': return 'Voice Coaching';
          case 'movement': return 'Movement Coaching';
          case 'mindset': return 'Mindset Coaching';
          case 'general': return 'General Coaching';
          default: return simpleHumanize(value);
        }
      case 'focus_area':
        switch (value) {
          case 'tv_film': return 'TV / Film';
          case 'theater': return 'Theater';
          case 'commercial': return 'Commercial';
          case 'voiceover': return 'Voiceover';
          case 'general': return 'General';
          default: return simpleHumanize(value);
        }
      case 'consultation_type':
        switch (value) {
          case 'online': return 'Online';
          case 'in_person': return 'In Person';
          case 'phone': return 'Phone';
          case 'unspecified': return 'Unspecified';
          default: return simpleHumanize(value);
        }
      case 'availability_window':
        switch (value) {
          case 'mornings': return 'Mornings';
          case 'afternoons': return 'Afternoons';
          case 'evenings': return 'Evenings';
          case 'weekends': return 'Weekends';
          case 'anytime': return 'Anytime';
          default: return simpleHumanize(value);
        }
      case 'delivery_type':
        return value === 'digital' ? 'Digital' : value === 'physical' ? 'Physical' : simpleHumanize(value);
      default:
        return simpleHumanize(value);
    }
  }

  // ------------------------
  // Cart helpers
  // ------------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || cart.status !== 'active') {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _calculateCartTotals(cart, allCartItems) {
    if (!cart) {
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'usd',
        totalItems: 0
      };
    }
    const items = (allCartItems || []).filter((ci) => ci.cartId === cart.id);
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const tax = 0;
    const total = subtotal + tax;
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return {
      subtotal,
      tax,
      total,
      currency: 'usd',
      totalItems
    };
  }

  _addItemToCart(cartItem) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    cart.updatedAt = this._nowIso();
    this._saveToStorage('cart', cart);
  }

  // ------------------------
  // Class session date filtering helper
  // ------------------------

  _filterClassSessionsByDateRange(sessions, options) {
    if (!options) return sessions;
    const now = new Date();
    let from = options.startDateFrom ? this._parseDate(options.startDateFrom) : null;
    let to = options.startDateTo ? this._parseDate(options.startDateTo) : null;

    if (options.preset === 'next_month') {
      const year = now.getFullYear();
      const monthIndex = now.getMonth();
      const nextMonthIndex = (monthIndex + 1) % 12;
      const nextMonthYear = monthIndex === 11 ? year + 1 : year;
      from = new Date(nextMonthYear, nextMonthIndex, 1);
      to = new Date(nextMonthYear, nextMonthIndex + 1, 0, 23, 59, 59, 999);
    } else if (options.preset === 'within_45_days') {
      from = now;
      to = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    }

    return sessions.filter((s) => {
      const sd = this._parseDate(s.startDate);
      if (!sd) return false;
      if (from && sd < from) return false;
      if (to && sd > to) return false;
      return true;
    });
  }

  // ------------------------
  // Coaching slot generation helper
  // ------------------------

  _generateCoachingSlots(offering, month, year) {
    const slots = [];
    if (!offering || !offering.isActive) return slots;

    const allowedDays = (offering.allowedDaysOfWeek && offering.allowedDaysOfWeek.length)
      ? offering.allowedDaysOfWeek
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    const interval = offering.slotIntervalMinutes || offering.durationMinutes || 60;
    const dailyStart = offering.dailyStartTime || '10:00';
    const dailyEnd = offering.dailyEndTime || '20:00';

    const [startHour, startMinute] = dailyStart.split(':').map((v) => parseInt(v, 10));
    const [endHour, endMinute] = dailyEnd.split(':').map((v) => parseInt(v, 10));

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const now = new Date();

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dayName = this._toDayOfWeek(d);
      if (!allowedDays.includes(dayName)) continue;

      let slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, startMinute, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), endHour, endMinute, 0, 0);

      while (slotStart <= dayEnd) {
        const iso = slotStart.toISOString();
        if (slotStart > now) {
          slots.push({ startDateTime: iso, isAvailable: true });
        }
        slotStart = new Date(slotStart.getTime() + interval * 60 * 1000);
      }
    }
    return slots;
  }

  // ------------------------
  // Workshop time slot helper
  // ------------------------

  _selectEarliestAvailableWorkshopTimeSlot(workshopId) {
    const timeSlots = this._getFromStorage('workshop_time_slots', []);
    const candidates = timeSlots.filter((ts) => ts.workshopId === workshopId && ts.status === 'published' && (ts.seatsAvailable === undefined || ts.seatsAvailable === null || ts.seatsAvailable > 0));
    if (!candidates.length) return null;
    candidates.sort((a, b) => this._compareDatesAsc(a.startDateTime, b.startDateTime));
    return candidates[0] || null;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomepageContent
  getHomepageContent() {
    const classes = this._getFromStorage('classes', []).filter((c) => c.isActive);
    const coachingOfferings = this._getFromStorage('coaching_offerings', []).filter((o) => o.isActive);
    const workshops = this._getFromStorage('workshops', []).filter((w) => w.isActive);
    const articles = this._getFromStorage('blog_articles', []);
    const now = new Date();

    const featuredClasses = classes.slice(0, 3);
    const featuredCoachingOfferings = coachingOfferings.slice(0, 3);
    const featuredWorkshops = workshops
      .filter((w) => this._parseDate(w.primaryDate) && this._parseDate(w.primaryDate) >= now)
      .sort((a, b) => this._compareDatesAsc(a.primaryDate, b.primaryDate))
      .slice(0, 3);

    const beginnerResources = articles
      .filter((a) => this._intersectsTags(a.tags || [], ['beginner', 'new_to_acting']))
      .sort((a, b) => this._compareDatesAsc(b.publishDate, a.publishDate))
      .slice(0, 3);

    const promotions = [];
    const hasFreeIntro = workshops.some((w) => w.isFree && this._intersectsTags(w.tags || [], ['intro_to_acting', 'introductory']));
    if (hasFreeIntro) {
      promotions.push({
        id: 'promo_free_intro_workshop',
        title: 'Free Introductory Workshop',
        description: 'Join our next free introductory acting workshop this month.',
        promotionType: 'free_intro_workshop',
        badgeText: 'Free Intro'
      });
    }

    return {
      featuredClasses,
      featuredCoachingOfferings,
      featuredWorkshops,
      beginnerResources,
      promotions
    };
  }

  // getClassFilterOptions
  getClassFilterOptions() {
    const categories = [
      { value: 'acting_foundations', label: 'Acting Foundations' },
      { value: 'improv', label: 'Improv' },
      { value: 'scene_study', label: 'Scene Study' },
      { value: 'voice', label: 'Voice' },
      { value: 'movement', label: 'Movement' },
      { value: 'on_camera', label: 'On-Camera' },
      { value: 'other', label: 'Other' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const classTypes = [
      { value: 'course', label: 'Course' },
      { value: 'drop_in', label: 'Drop-in' },
      { value: 'intensive', label: 'Intensive' },
      { value: 'workshop_like', label: 'Workshop-Style' }
    ];

    const durationsWeeks = [4, 6, 8, 10, 12].map((v) => ({ value: v, label: v + ' weeks' }));

    const schedules = [
      { value: 'weekday_daytime', label: 'Weekday Daytime' },
      { value: 'weekday_evening', label: 'Weekday Evening' },
      { value: 'weekend', label: 'Weekend' },
      { value: 'mixed', label: 'Mixed' }
    ];

    const priceRanges = [
      { min: 0, max: 100, label: 'Up to $100' },
      { min: 100, max: 300, label: '$100 - $300' },
      { min: 300, max: 500, label: '$300 - $500' },
      { min: 500, max: 1000, label: '$500 - $1000' }
    ];

    const startDatePresets = [
      { id: 'next_month', label: 'Starting Next Month', rangeType: 'next_month' },
      { id: 'within_45_days', label: 'Starting Within 45 Days', rangeType: 'within_45_days' }
    ];

    return {
      categories,
      levels,
      classTypes,
      durationsWeeks,
      schedules,
      priceRanges,
      startDatePresets
    };
  }

  // searchClassSessions(filters, sort)
  searchClassSessions(filters, sort) {
    const classes = this._getFromStorage('classes', []);
    let sessions = this._getFromStorage('class_sessions', []);

    const f = filters || {};

    // Date range filter
    sessions = this._filterClassSessionsByDateRange(sessions, {
      startDateFrom: f.startDateFrom,
      startDateTo: f.startDateTo
    });

    sessions = sessions.filter((session) => {
      if (f.onlyPublished && session.status !== 'published') return false;

      if (typeof f.minDurationWeeks === 'number' && session.durationWeeks !== undefined && session.durationWeeks < f.minDurationWeeks) return false;
      if (typeof f.maxDurationWeeks === 'number' && session.durationWeeks !== undefined && session.durationWeeks > f.maxDurationWeeks) return false;

      if (typeof f.isEvening === 'boolean' && session.isEvening !== f.isEvening) return false;
      if (typeof f.isWeekend === 'boolean' && session.isWeekend !== f.isWeekend) return false;

      if (typeof f.minPrice === 'number' && session.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && session.price > f.maxPrice) return false;

      const clazz = classes.find((c) => c.id === session.classId);
      if (!clazz || !clazz.isActive) return false;

      if (f.category && clazz.category !== f.category) return false;
      if (f.level && clazz.level !== f.level) return false;
      if (f.classType && clazz.classType !== f.classType) return false;
      if (f.scheduleLabel && clazz.scheduleLabel !== f.scheduleLabel) return false;
      if (f.tags && f.tags.length && !this._intersectsTags(clazz.tags || [], f.tags)) return false;

      if (f.keyword) {
        const hay = (clazz.title || '') + ' ' + (clazz.description || '');
        if (!this._stringContains(hay, f.keyword)) return false;
      }

      return true;
    });

    const s = sort || {};
    const sortBy = s.sortBy || 'start_date';
    const sortDirection = s.sortDirection === 'desc' ? 'desc' : 'asc';

    sessions.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'price') {
        cmp = (a.price || 0) - (b.price || 0);
      } else {
        cmp = this._compareDatesAsc(a.startDate, b.startDate);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    const results = sessions.map((session) => {
      const clazz = classes.find((c) => c.id === session.classId) || null;
      const display = {
        title: clazz ? clazz.title : '',
        categoryLabel: clazz ? this._formatDisplayLabels('category', clazz.category) : '',
        levelLabel: clazz ? this._formatDisplayLabels('level', clazz.level) : '',
        classTypeLabel: clazz ? this._formatDisplayLabels('class_type', clazz.classType) : '',
        price: session.price,
        priceText: (session.currency || 'usd').toUpperCase() + ' ' + (session.price != null ? session.price.toFixed(2) : ''),
        currency: session.currency || 'usd',
        startDate: session.startDate,
        endDate: session.endDate,
        dayOfWeekLabel: this._formatDisplayLabels('day_of_week', session.dayOfWeek),
        startTime: session.startTime,
        endTime: session.endTime,
        durationWeeks: session.durationWeeks,
        totalHours: session.totalHours,
        scheduleLabel: clazz ? clazz.scheduleLabel : null,
        isEvening: !!session.isEvening,
        isWeekend: !!session.isWeekend,
        seatsAvailable: session.seatsAvailable,
        statusLabel: this._formatDisplayLabels('session_status', session.status)
      };
      return { class: clazz, session, display };
    });

    return {
      results,
      totalCount: results.length
    };
  }

  // getClassDetail(classId)
  getClassDetail(classId) {
    const classes = this._getFromStorage('classes', []);
    const sessions = this._getFromStorage('class_sessions', []);
    const clazz = classes.find((c) => c.id === classId) || null;

    const upcomingSessions = sessions
      .filter((s) => s.classId === classId && s.status === 'published')
      .sort((a, b) => this._compareDatesAsc(a.startDate, b.startDate));

    const display = clazz
      ? {
          categoryLabel: this._formatDisplayLabels('category', clazz.category),
          levelLabel: this._formatDisplayLabels('level', clazz.level),
          classTypeLabel: this._formatDisplayLabels('class_type', clazz.classType),
          totalHoursText: clazz.totalHours != null ? clazz.totalHours + ' hours total' : '',
          priceText: clazz.basePrice != null ? (clazz.currency || 'usd').toUpperCase() + ' ' + clazz.basePrice.toFixed(2) : '',
          scheduleSummary: clazz.scheduleLabel ? this._formatDisplayLabels('schedule_label', clazz.scheduleLabel) : '',
          objectivesList: clazz.objectives ? String(clazz.objectives).split('\n').filter((x) => x.trim().length) : [],
          prerequisitesList: clazz.prerequisites ? String(clazz.prerequisites).split('\n').filter((x) => x.trim().length) : []
        }
      : {
          categoryLabel: '',
          levelLabel: '',
          classTypeLabel: '',
          totalHoursText: '',
          priceText: '',
          scheduleSummary: '',
          objectivesList: [],
          prerequisitesList: []
        };

    return {
      class: clazz,
      upcomingSessions,
      display
    };
  }

  // enrollInClassSession(classSessionId, quantity = 1)
  enrollInClassSession(classSessionId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const sessions = this._getFromStorage('class_sessions', []);
    const classes = this._getFromStorage('classes', []);
    const session = sessions.find((s) => s.id === classSessionId) || null;

    if (!session) {
      return { success: false, message: 'Class session not found', cart: null };
    }
    if (session.status !== 'published') {
      return { success: false, message: 'Class session is not open for enrollment', cart: null };
    }
    if (session.seatsAvailable != null && session.seatsAvailable < qty) {
      return { success: false, message: 'Not enough seats available', cart: null };
    }

    const clazz = classes.find((c) => c.id === session.classId) || null;
    const cart = this._getOrCreateCart();

    const unitPrice = session.price || 0;
    const totalPrice = unitPrice * qty;
    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'class_session_enrollment',
      classSessionId: session.id,
      workshopTimeSlotId: null,
      coachingBookingId: null,
      giftCardTemplateId: null,
      name: (clazz ? clazz.title : 'Class') + (session.name ? ' - ' + session.name : ''),
      quantity: qty,
      unitPrice,
      totalPrice,
      addedAt: this._nowIso(),
      giftCardAmount: null,
      giftCardRecipientName: null,
      giftCardRecipientEmail: null,
      giftCardMessage: null,
      giftCardDeliveryType: null
    };

    // Update seat availability if tracked
    if (session.seatsAvailable != null) {
      session.seatsAvailable = session.seatsAvailable - qty;
      const updatedSessions = sessions.map((s) => (s.id === session.id ? session : s));
      this._saveToStorage('class_sessions', updatedSessions);
    }

    this._addItemToCart(cartItem);

    const fullCart = this.getCart();
    const totals = fullCart.totals;

    return {
      success: true,
      message: 'Enrollment added to cart',
      cart: {
        id: fullCart.cart ? fullCart.cart.id : null,
        status: fullCart.cart ? fullCart.cart.status : null,
        totalItems: totals.totalItems,
        subtotal: totals.subtotal,
        currency: totals.currency,
        items: fullCart.items
      }
    };
  }

  // saveClass(classId, savedType, notes)
  saveClass(classId, savedType, notes) {
    if (savedType !== 'wishlist' && savedType !== 'plan') {
      return { success: false, item: null, message: 'Invalid savedType' };
    }
    const saved = this._getFromStorage('saved_classes', []);
    const newItem = {
      id: this._generateId('saved_class'),
      classId,
      savedType,
      createdAt: this._nowIso(),
      notes: notes || null
    };
    saved.push(newItem);
    this._saveToStorage('saved_classes', saved);
    return { success: true, item: newItem, message: 'Class saved' };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null);
    const allCartItems = this._getFromStorage('cart_items', []);

    if (!cart || cart.status !== 'active') {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          total: 0,
          currency: 'usd',
          totalItems: 0
        }
      };
    }

    const classes = this._getFromStorage('classes', []);
    const sessions = this._getFromStorage('class_sessions', []);
    const workshops = this._getFromStorage('workshops', []);
    const workshopTimeSlots = this._getFromStorage('workshop_time_slots', []);
    const coachingBookings = this._getFromStorage('coaching_bookings', []);
    const coachingOfferings = this._getFromStorage('coaching_offerings', []);
    const giftCardTemplates = this._getFromStorage('gift_card_templates', []);
    const coaches = this._getFromStorage('coaches', []);

    const cartItems = allCartItems.filter((ci) => ci.cartId === cart.id);

    const items = cartItems.map((ci) => {
      let description = ci.name || '';
      let itemTypeLabel = '';
      let relatedClassTitle = null;
      let sessionStartDate = null;
      let coachName = null;
      let workshopTitle = null;

      let classSession = null;
      let workshopTimeSlot = null;
      let coachingBooking = null;
      let giftCardTemplate = null;

      if (ci.itemType === 'class_session_enrollment') {
        itemTypeLabel = 'Class Enrollment';
        classSession = sessions.find((s) => s.id === ci.classSessionId) || null;
        if (classSession) {
          const clazz = classes.find((c) => c.id === classSession.classId) || null;
          relatedClassTitle = clazz ? clazz.title : null;
          sessionStartDate = classSession.startDate;
          if (!description) {
            description = (clazz ? clazz.title : 'Class') + ' - ' + (classSession.name || 'Session');
          }
        }
      } else if (ci.itemType === 'gift_card') {
        itemTypeLabel = 'Gift Card';
        giftCardTemplate = giftCardTemplates.find((g) => g.id === ci.giftCardTemplateId) || null;
        if (giftCardTemplate && !description) {
          description = giftCardTemplate.name + ' - ' + (ci.giftCardAmount != null ? '$' + ci.giftCardAmount.toFixed(2) : '');
        }
      } else if (ci.itemType === 'coaching_session') {
        itemTypeLabel = 'Coaching Session';
        coachingBooking = coachingBookings.find((b) => b.id === ci.coachingBookingId) || null;
        if (coachingBooking) {
          const offering = coachingOfferings.find((o) => o.id === coachingBooking.coachingOfferingId) || null;
          const coach = coaches.find((c) => c.id === coachingBooking.coachId) || null;
          coachName = coach ? coach.name : null;
          sessionStartDate = coachingBooking.startDateTime;
          if (!description) {
            description = (offering ? offering.title : 'Coaching') + (coach ? ' with ' + coach.name : '');
          }
        }
      } else if (ci.itemType === 'workshop_registration') {
        itemTypeLabel = 'Workshop Registration';
        workshopTimeSlot = workshopTimeSlots.find((wts) => wts.id === ci.workshopTimeSlotId) || null;
        if (workshopTimeSlot) {
          const workshop = workshops.find((w) => w.id === workshopTimeSlot.workshopId) || null;
          workshopTitle = workshop ? workshop.title : null;
          sessionStartDate = workshopTimeSlot.startDateTime;
          if (!description) {
            description = workshopTitle || 'Workshop Registration';
          }
        }
      }

      const cartItem = Object.assign({}, ci, {
        classSession,
        workshopTimeSlot,
        coachingBooking,
        giftCardTemplate
      });

      const display = {
        description,
        itemTypeLabel,
        relatedClassTitle,
        sessionStartDate,
        coachName,
        workshopTitle
      };

      return { cartItem, display };
    });

    const totals = this._calculateCartTotals(cart, allCartItems);

    return {
      cart,
      items,
      totals
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let qty = typeof quantity === 'number' ? quantity : 1;
    if (qty < 0) qty = 0;

    const cart = this._getFromStorage('cart', null);
    let allCartItems = this._getFromStorage('cart_items', []);

    const index = allCartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      const totalsEmpty = {
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'usd',
        totalItems: 0
      };
      return { cart, items: [], totals: totalsEmpty };
    }

    if (qty === 0) {
      allCartItems.splice(index, 1);
    } else {
      const item = allCartItems[index];
      item.quantity = qty;
      item.totalPrice = (item.unitPrice || 0) * qty;
      allCartItems[index] = item;
    }

    this._saveToStorage('cart_items', allCartItems);

    if (cart) {
      cart.updatedAt = this._nowIso();
      this._saveToStorage('cart', cart);
    }

    const full = this.getCart();
    return {
      cart: full.cart,
      items: full.items,
      totals: full.totals
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    let allCartItems = this._getFromStorage('cart_items', []);
    const before = allCartItems.length;
    allCartItems = allCartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', allCartItems);
    if (cart) {
      cart.updatedAt = this._nowIso();
      this._saveToStorage('cart', cart);
    }

    const full = this.getCart();
    const removed = before !== allCartItems.length;

    return {
      cart: full.cart,
      items: full.items,
      totals: full.totals,
      message: removed ? 'Item removed from cart' : 'Item not found in cart'
    };
  }

  // getCoachingFilterOptions
  getCoachingFilterOptions() {
    const coachingTypes = [
      { value: 'on_camera', label: 'On-Camera' },
      { value: 'audition', label: 'Audition' },
      { value: 'voice', label: 'Voice' },
      { value: 'movement', label: 'Movement' },
      { value: 'mindset', label: 'Mindset' },
      { value: 'general', label: 'General' }
    ];

    const durationsMinutes = [30, 45, 60, 90, 120].map((v) => ({ value: v, label: v + ' minutes' }));

    const priceRanges = [
      { min: 0, max: 100, label: 'Up to $100' },
      { min: 100, max: 250, label: '$100 - $250' },
      { min: 250, max: 500, label: '$250 - $500' }
    ];

    return {
      coachingTypes,
      durationsMinutes,
      priceRanges
    };
  }

  // listCoachingOfferings(filters)
  listCoachingOfferings(filters) {
    const offerings = this._getFromStorage('coaching_offerings', []);
    const f = filters || {};

    const resultsRaw = offerings.filter((o) => {
      if (f.isActive === true && !o.isActive) return false;
      if (f.coachingType && o.coachingType !== f.coachingType) return false;
      if (typeof f.durationMinutes === 'number' && o.durationMinutes !== f.durationMinutes) return false;
      if (typeof f.minRate === 'number' && o.rate < f.minRate) return false;
      if (typeof f.maxRate === 'number' && o.rate > f.maxRate) return false;
      if (f.keyword) {
        const hay = (o.title || '') + ' ' + (o.description || '');
        if (!this._stringContains(hay, f.keyword)) return false;
      }
      return true;
    });

    const results = resultsRaw.map((o) => ({
      offering: o,
      coachingTypeLabel: this._formatDisplayLabels('coaching_type', o.coachingType),
      durationLabel: o.durationMinutes + ' minutes',
      rateText: (o.currency || 'usd').toUpperCase() + ' ' + o.rate.toFixed(2)
    }));

    return {
      results,
      totalCount: results.length
    };
  }

  // getCoachingOfferingDetail(coachingOfferingId)
  getCoachingOfferingDetail(coachingOfferingId) {
    const offerings = this._getFromStorage('coaching_offerings', []);
    const coaches = this._getFromStorage('coaches', []);
    const offering = offerings.find((o) => o.id === coachingOfferingId) || null;
    const defaultCoach = offering && offering.defaultCoachId ? (coaches.find((c) => c.id === offering.defaultCoachId) || null) : null;

    const display = offering
      ? {
          coachingTypeLabel: this._formatDisplayLabels('coaching_type', offering.coachingType),
          durationLabel: offering.durationMinutes + ' minutes',
          rateText: (offering.currency || 'usd').toUpperCase() + ' ' + offering.rate.toFixed(2),
          descriptionHtml: offering.description || ''
        }
      : {
          coachingTypeLabel: '',
          durationLabel: '',
          rateText: '',
          descriptionHtml: ''
        };

    return { offering, defaultCoach, display };
  }

  // getAvailableCoachingSlots(coachingOfferingId, month, year)
  getAvailableCoachingSlots(coachingOfferingId, month, year) {
    const offerings = this._getFromStorage('coaching_offerings', []);
    const bookings = this._getFromStorage('coaching_bookings', []);
    const offering = offerings.find((o) => o.id === coachingOfferingId) || null;

    if (!offering) {
      return { slots: [], timezone: 'local' };
    }

    const baseSlots = this._generateCoachingSlots(offering, month, year);

    const relevantBookings = bookings.filter((b) => b.coachingOfferingId === coachingOfferingId && b.status !== 'canceled');
    const bookedSet = new Set(relevantBookings.map((b) => b.startDateTime));

    const slots = baseSlots.map((s) => ({
      startDateTime: s.startDateTime,
      isAvailable: s.isAvailable && !bookedSet.has(s.startDateTime)
    }));

    return { slots, timezone: 'local' };
  }

  // submitCoachingBookingForm(coachingOfferingId, startDateTime, name, email, goals)
  submitCoachingBookingForm(coachingOfferingId, startDateTime, name, email, goals) {
    const offerings = this._getFromStorage('coaching_offerings', []);
    const coaches = this._getFromStorage('coaches', []);
    const bookings = this._getFromStorage('coaching_bookings', []);

    const offering = offerings.find((o) => o.id === coachingOfferingId) || null;
    if (!offering) {
      return { booking: null, summary: null, message: 'Coaching offering not found' };
    }

    const booking = {
      id: this._generateId('coaching_booking'),
      coachingOfferingId,
      coachId: offering.defaultCoachId || null,
      startDateTime,
      durationMinutes: offering.durationMinutes,
      rate: offering.rate,
      currency: offering.currency || 'usd',
      name,
      email,
      goals: goals || null,
      createdAt: this._nowIso(),
      status: 'pending_review'
    };

    bookings.push(booking);
    this._saveToStorage('coaching_bookings', bookings);

    const coach = booking.coachId ? coaches.find((c) => c.id === booking.coachId) || null : null;
    const dt = this._parseDate(booking.startDateTime) || null;
    const dateLabel = dt ? dt.toISOString().split('T')[0] : booking.startDateTime;
    const timeLabel = dt ? dt.toISOString().split('T')[1].split('.')[0] : '';

    const summary = {
      coachingTypeLabel: this._formatDisplayLabels('coaching_type', offering.coachingType),
      durationLabel: booking.durationMinutes + ' minutes',
      dateLabel,
      timeLabel,
      coachName: coach ? coach.name : null,
      rateText: booking.currency.toUpperCase() + ' ' + booking.rate.toFixed(2)
    };

    return { booking, summary, message: 'Coaching booking submitted' };
  }

  // getCoachingBooking(bookingId)
  getCoachingBooking(bookingId) {
    const bookings = this._getFromStorage('coaching_bookings', []);
    const offerings = this._getFromStorage('coaching_offerings', []);
    const coaches = this._getFromStorage('coaches', []);

    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) {
      return { booking: null, summary: null };
    }

    const offering = offerings.find((o) => o.id === booking.coachingOfferingId) || null;
    const coach = booking.coachId ? coaches.find((c) => c.id === booking.coachId) || null : null;

    const dt = this._parseDate(booking.startDateTime) || null;
    const dateLabel = dt ? dt.toISOString().split('T')[0] : booking.startDateTime;
    const timeLabel = dt ? dt.toISOString().split('T')[1].split('.')[0] : '';

    const summary = offering
      ? {
          coachingTypeLabel: this._formatDisplayLabels('coaching_type', offering.coachingType),
          durationLabel: booking.durationMinutes + ' minutes',
          dateLabel,
          timeLabel,
          coachName: coach ? coach.name : null,
          rateText: booking.currency.toUpperCase() + ' ' + booking.rate.toFixed(2)
        }
      : null;

    return { booking, summary };
  }

  // confirmCoachingBooking(bookingId)
  confirmCoachingBooking(bookingId) {
    const bookings = this._getFromStorage('coaching_bookings', []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return { success: false, booking: null, message: 'Booking not found' };
    }
    bookings[idx].status = 'confirmed';
    this._saveToStorage('coaching_bookings', bookings);
    return { success: true, booking: bookings[idx], message: 'Booking confirmed' };
  }

  // listGiftCardTemplates()
  listGiftCardTemplates() {
    const templates = this._getFromStorage('gift_card_templates', []);
    return { templates };
  }

  // getGiftCardTemplateDetail(giftCardTemplateId)
  getGiftCardTemplateDetail(giftCardTemplateId) {
    const templates = this._getFromStorage('gift_card_templates', []);
    const template = templates.find((t) => t.id === giftCardTemplateId) || null;
    const display = template
      ? {
          deliveryTypeLabel: this._formatDisplayLabels('delivery_type', template.deliveryType),
          presetAmounts: template.presetAmounts || [],
          amountHelpText: 'Enter an amount between ' + (template.minAmount || 0) + ' and ' + (template.maxAmount || '')
        }
      : {
          deliveryTypeLabel: '',
          presetAmounts: [],
          amountHelpText: ''
        };
    return { template, display };
  }

  // addGiftCardToCart(giftCardTemplateId, amount, recipientName, recipientEmail, message, quantity = 1)
  addGiftCardToCart(giftCardTemplateId, amount, recipientName, recipientEmail, message, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const templates = this._getFromStorage('gift_card_templates', []);
    const template = templates.find((t) => t.id === giftCardTemplateId) || null;
    if (!template) {
      return { success: false, message: 'Gift card template not found', cart: null };
    }

    const cart = this._getOrCreateCart();

    const unitPrice = amount || 0;
    const totalPrice = unitPrice * qty;
    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'gift_card',
      classSessionId: null,
      workshopTimeSlotId: null,
      coachingBookingId: null,
      giftCardTemplateId,
      name: template.name + ' - $' + unitPrice.toFixed(2),
      quantity: qty,
      unitPrice,
      totalPrice,
      addedAt: this._nowIso(),
      giftCardAmount: amount,
      giftCardRecipientName: recipientName,
      giftCardRecipientEmail: recipientEmail,
      giftCardMessage: message || null,
      giftCardDeliveryType: template.deliveryType
    };

    this._addItemToCart(cartItem);

    const fullCart = this.getCart();
    const totals = fullCart.totals;

    return {
      success: true,
      message: 'Gift card added to cart',
      cart: {
        id: fullCart.cart ? fullCart.cart.id : null,
        status: fullCart.cart ? fullCart.cart.status : null,
        totalItems: totals.totalItems,
        subtotal: totals.subtotal,
        currency: totals.currency,
        items: fullCart.items
      }
    };
  }

  // getBlogFilterOptions()
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles', []);
    const tagSet = new Set();
    articles.forEach((a) => {
      (a.tags || []).forEach((t) => tagSet.add(String(t)));
    });

    // Ensure some known tags are present for UX, even if no articles yet
    ['beginner', 'new_to_acting', 'auditions', 'audition_tips'].forEach((t) => tagSet.add(t));

    const tags = Array.from(tagSet).map((t) => ({ value: t, label: this._formatDisplayLabels('generic', t) }));
    return { tags };
  }

  // listBlogArticles(filters, pagination)
  listBlogArticles(filters, pagination) {
    const articles = this._getFromStorage('blog_articles', []);
    const f = filters || {};

    let filtered = articles.filter((a) => {
      if (f.tags && f.tags.length && !this._intersectsTags(a.tags || [], f.tags)) return false;
      if (typeof f.isFeatured === 'boolean' && !!a.isFeatured !== f.isFeatured) return false;
      if (f.searchQuery) {
        const hay = (a.title || '') + ' ' + (a.excerpt || '');
        if (!this._stringContains(hay, f.searchQuery)) return false;
      }
      if (f.publishedAfter) {
        const ad = this._parseDate(a.publishDate);
        const from = this._parseDate(f.publishedAfter);
        if (ad && from && ad < from) return false;
      }
      if (f.publishedBefore) {
        const ad = this._parseDate(a.publishDate);
        const to = this._parseDate(f.publishedBefore);
        if (ad && to && ad > to) return false;
      }
      return true;
    });

    filtered.sort((a, b) => this._compareDatesAsc(b.publishDate, a.publishDate));

    const p = pagination || {};
    const page = p.page && p.page > 0 ? p.page : 1;
    const pageSize = p.pageSize && p.pageSize > 0 ? p.pageSize : 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = filtered.slice(start, end);
    return {
      articles: pageItems,
      totalCount: filtered.length
    };
  }

  // getBlogArticleDetail(articleId)
  getBlogArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        display: {
          readTimeMinutes: 0,
          tagsLabel: []
        }
      };
    }

    const content = article.content || '';
    const wordCount = content.trim().length ? content.trim().split(/\s+/).length : 0;
    const readTimeMinutes = Math.max(1, Math.round(wordCount / 200)) || 1;
    const tagsLabel = (article.tags || []).map((t) => this._formatDisplayLabels('generic', t));

    return {
      article,
      display: {
        readTimeMinutes,
        tagsLabel
      }
    };
  }

  // subscribeToNewsletter(name, email, topic, articleId, source)
  subscribeToNewsletter(name, email, topic, articleId, source) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const subscription = {
      id: this._generateId('newsletter_subscription'),
      name: name || null,
      email,
      createdAt: this._nowIso(),
      source: source || 'other',
      topic: topic || null,
      articleId: articleId || null
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);
    return {
      success: true,
      subscription,
      message: 'Subscribed successfully'
    };
  }

  // getWorkshopFilterOptions()
  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops', []);
    const tagSet = new Set();
    workshops.forEach((w) => {
      (w.tags || []).forEach((t) => tagSet.add(String(t)));
    });
    ['intro_to_acting', 'introductory', 'free'].forEach((t) => tagSet.add(t));

    const tags = Array.from(tagSet).map((t) => ({ value: t, label: this._formatDisplayLabels('generic', t) }));

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const priceRanges = [
      { min: 0, max: 0, label: 'Free' },
      { min: 0, max: 50, label: 'Up to $50' },
      { min: 50, max: 150, label: '$50 - $150' },
      { min: 150, max: 500, label: '$150 - $500' }
    ];

    const monthPresets = [
      { id: 'this_month', label: 'This Month' },
      { id: 'next_month', label: 'Next Month' }
    ];

    return { tags, levels, priceRanges, monthPresets };
  }

  // listWorkshops(filters, sort)
  listWorkshops(filters, sort) {
    const workshops = this._getFromStorage('workshops', []);
    const f = filters || {};

    let filtered = workshops.filter((w) => {
      if (!w.isActive) return false;
      if (typeof f.isFree === 'boolean' && !!w.isFree !== f.isFree) return false;
      if (f.tags && f.tags.length && !this._intersectsTags(w.tags || [], f.tags)) return false;
      if (f.targetLevel && w.targetLevel !== f.targetLevel) return false;
      if (f.keyword) {
        const hay = (w.title || '') + ' ' + (w.description || '');
        if (!this._stringContains(hay, f.keyword)) return false;
      }
      if (f.dateFrom) {
        const wd = this._parseDate(w.primaryDate);
        const from = this._parseDate(f.dateFrom);
        if (wd && from && wd < from) return false;
      }
      if (f.dateTo) {
        const wd = this._parseDate(w.primaryDate);
        const to = this._parseDate(f.dateTo);
        if (wd && to && wd > to) return false;
      }
      if (typeof f.month === 'number') {
        const wd = this._parseDate(w.primaryDate);
        if (!wd || wd.getMonth() + 1 !== f.month) return false;
      }
      if (typeof f.year === 'number') {
        const wd = this._parseDate(w.primaryDate);
        if (!wd || wd.getFullYear() !== f.year) return false;
      }
      return true;
    });

    const s = sort || {};
    const sortBy = s.sortBy || 'primary_date';
    const sortDirection = s.sortDirection === 'desc' ? 'desc' : 'asc';

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else {
        cmp = this._compareDatesAsc(a.primaryDate, b.primaryDate);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return {
      results: filtered,
      totalCount: filtered.length
    };
  }

  // getWorkshopDetail(workshopId)
  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const timeSlots = this._getFromStorage('workshop_time_slots', []);
    const workshop = workshops.find((w) => w.id === workshopId) || null;

    const ts = timeSlots.filter((t) => t.workshopId === workshopId);
    const display = workshop
      ? {
          dateLabel: workshop.primaryDate || '',
          priceText: workshop.isFree ? 'Free' : (workshop.price != null ? '$' + workshop.price.toFixed(2) : ''),
          targetLevelLabel: this._formatDisplayLabels('workshop_target_level', workshop.targetLevel)
        }
      : {
          dateLabel: '',
          priceText: '',
          targetLevelLabel: ''
        };

    return { workshop, timeSlots: ts, display };
  }

  // registerForWorkshop(workshopTimeSlotId, name, email, phone, notes)
  registerForWorkshop(workshopTimeSlotId, name, email, phone, notes) {
    const workshops = this._getFromStorage('workshops', []);
    const timeSlots = this._getFromStorage('workshop_time_slots', []);
    const registrations = this._getFromStorage('workshop_registrations', []);

    const timeSlot = timeSlots.find((ts) => ts.id === workshopTimeSlotId) || null;
    if (!timeSlot) {
      return {
        registration: null,
        display: {
          workshopTitle: '',
          dateLabel: '',
          timeLabel: '',
          confirmationMessage: 'Workshop time slot not found'
        }
      };
    }

    const workshop = workshops.find((w) => w.id === timeSlot.workshopId) || null;

    const registration = {
      id: this._generateId('workshop_registration'),
      workshopId: timeSlot.workshopId,
      workshopTimeSlotId,
      name,
      email,
      phone: phone || null,
      notes: notes || null,
      createdAt: this._nowIso(),
      status: 'confirmed'
    };

    registrations.push(registration);
    this._saveToStorage('workshop_registrations', registrations);

    const dt = this._parseDate(timeSlot.startDateTime) || null;
    const dateLabel = dt ? dt.toISOString().split('T')[0] : timeSlot.startDateTime;
    const timeLabel = dt ? dt.toISOString().split('T')[1].split('.')[0] : '';

    const display = {
      workshopTitle: workshop ? workshop.title : '',
      dateLabel,
      timeLabel,
      confirmationMessage: 'Registration completed'
    };

    return { registration, display };
  }

  // listTestimonials(filters, searchQuery, sort)
  listTestimonials(filters, searchQuery, sort) {
    const testimonials = this._getFromStorage('testimonials', []);
    const coaches = this._getFromStorage('coaches', []);
    const f = filters || {};

    let filtered = testimonials.filter((t) => {
      if (f.focusArea && t.focusArea !== f.focusArea) return false;
      if (f.tags && f.tags.length && !this._intersectsTags(t.tags || [], f.tags)) return false;
      if (searchQuery) {
        if (!this._stringContains(t.content || '', searchQuery)) return false;
      }
      return true;
    });

    const s = sort || {};
    const sortBy = s.sortBy || 'created_at';
    const sortDirection = s.sortDirection === 'asc' ? 'asc' : 'desc';

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'created_at') {
        cmp = this._compareDatesAsc(a.createdAt, b.createdAt);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    const results = filtered.map((t) => {
      const coach = coaches.find((c) => c.id === t.coachId) || null;
      const excerpt = (t.content || '').length > 200 ? (t.content || '').slice(0, 197) + '...' : (t.content || '');
      const display = {
        focusAreaLabel: this._formatDisplayLabels('focus_area', t.focusArea),
        excerpt
      };
      return { testimonial: t, coach, display };
    });

    return { results, totalCount: results.length };
  }

  // getCoachProfile(coachId)
  getCoachProfile(coachId) {
    const coaches = this._getFromStorage('coaches', []);
    const testimonials = this._getFromStorage('testimonials', []);
    const coach = coaches.find((c) => c.id === coachId) || null;
    const coachTestimonials = testimonials.filter((t) => t.coachId === coachId);

    const specialtiesLabel = coach && coach.specialties
      ? coach.specialties.map((s) => this._formatDisplayLabels('generic', s))
      : [];

    return {
      coach,
      testimonials: coachTestimonials,
      display: {
        specialtiesLabel
      }
    };
  }

  // submitConsultationRequest(coachId, name, email, message, consultationType, availabilityWindow)
  submitConsultationRequest(coachId, name, email, message, consultationType, availabilityWindow) {
    const requests = this._getFromStorage('consultation_requests', []);
    const request = {
      id: this._generateId('consultation_request'),
      coachId,
      name,
      email,
      message: message || null,
      consultationType: consultationType || 'unspecified',
      availabilityWindow: availabilityWindow || 'anytime',
      createdAt: this._nowIso(),
      status: 'submitted'
    };
    requests.push(request);
    this._saveToStorage('consultation_requests', requests);
    return {
      success: true,
      request,
      message: 'Consultation request submitted'
    };
  }

  // getSavedClasses()
  getSavedClasses() {
    const saved = this._getFromStorage('saved_classes', []);
    const classes = this._getFromStorage('classes', []);

    const items = saved.map((si) => {
      const clazz = classes.find((c) => c.id === si.classId) || null;
      const display = {
        savedTypeLabel: si.savedType === 'plan' ? 'Training Plan' : 'Wishlist',
        categoryLabel: clazz ? this._formatDisplayLabels('category', clazz.category) : '',
        levelLabel: clazz ? this._formatDisplayLabels('level', clazz.level) : ''
      };

      // Foreign key resolution inside savedItem as well
      const savedItem = Object.assign({}, si, { class: clazz });

      return { savedItem, class: clazz, display };
    });

    return { items };
  }

  // updateSavedClassItem(savedClassItemId, savedType)
  updateSavedClassItem(savedClassItemId, savedType) {
    if (savedType !== 'wishlist' && savedType !== 'plan') {
      return this.getSavedClasses();
    }

    const saved = this._getFromStorage('saved_classes', []);
    const idx = saved.findIndex((s) => s.id === savedClassItemId);
    if (idx !== -1) {
      saved[idx].savedType = savedType;
      this._saveToStorage('saved_classes', saved);
    }

    return this.getSavedClasses();
  }

  // removeSavedClassItem(savedClassItemId)
  removeSavedClassItem(savedClassItemId) {
    let saved = this._getFromStorage('saved_classes', []);
    saved = saved.filter((s) => s.id !== savedClassItemId);
    this._saveToStorage('saved_classes', saved);
    return this.getSavedClasses();
  }

  // getStudioInfo()
  getStudioInfo() {
    const info = this._getFromStorage('studio_info', null);
    if (info) {
      return info;
    }
    return {
      mission: '',
      philosophy: '',
      approach: '',
      beginnerSummary: '',
      offerings: []
    };
  }

  // listCoaches(filters)
  listCoaches(filters) {
    const coaches = this._getFromStorage('coaches', []);
    const f = filters || {};
    const results = coaches.filter((c) => {
      if (typeof f.isActive === 'boolean' && !!c.isActive !== f.isActive) return false;
      if (f.specialties && f.specialties.length) {
        if (!this._intersectsTags(c.specialties || [], f.specialties)) return false;
      }
      if (f.keyword) {
        const hay = (c.name || '') + ' ' + (c.bio || '');
        if (!this._stringContains(hay, f.keyword)) return false;
      }
      return true;
    });

    return {
      results,
      totalCount: results.length
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const info = this._getFromStorage('contact_page_content', null);
    if (info) {
      return info;
    }
    return {
      address: '',
      phone: '',
      email: '',
      mapEmbedHtml: '',
      policies: [],
      faqs: []
    };
  }

  // submitContactForm(name, email, message, topic)
  submitContactForm(name, email, message, topic) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const ticketId = this._generateId('contact_ticket');
    const record = {
      id: ticketId,
      name,
      email,
      message,
      topic: topic || null,
      createdAt: this._nowIso()
    };
    submissions.push(record);
    this._saveToStorage('contact_form_submissions', submissions);
    return {
      success: true,
      message: 'Inquiry submitted',
      ticketId
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