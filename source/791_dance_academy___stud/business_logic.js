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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Entities
    ensureArray('studios');
    ensureArray('group_classes');
    ensureArray('class_schedules');
    ensureArray('class_enrollments');
    ensureArray('passes');
    // Single global cart stored as object (or null)
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }
    ensureArray('cart_items');
    ensureArray('orders');
    ensureArray('order_items');
    ensureArray('free_trial_slots');
    ensureArray('free_trial_bookings');
    ensureArray('instructors');
    ensureArray('private_lesson_slots');
    ensureArray('private_lesson_bookings');
    ensureArray('favorite_classes');
    ensureArray('policy_sections');
    ensureArray('contact_inquiries');
    ensureArray('events');
    ensureArray('event_registrations');
    ensureArray('gift_card_templates');
    ensureArray('gift_card_purchases');

    // About content (single object)
    if (!localStorage.getItem('about_content')) {
      const about = {
        mission: '',
        history: '',
        teaching_philosophy: '',
        locations: [],
        key_offerings: []
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getCartFromStorage() {
    const data = localStorage.getItem('cart');
    return data ? JSON.parse(data) : null;
  }

  _saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
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

  // ----------------------
  // Generic helpers
  // ----------------------

  _timeToMinutes(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const parts = hhmm.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _parseDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _stripHtml(html) {
    if (!html || typeof html !== 'string') return '';
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  _compareByDateTime(aDateStr, aTimeStr, bDateStr, bTimeStr) {
    const aDate = this._parseDate(aDateStr) || new Date(0);
    const bDate = this._parseDate(bDateStr) || new Date(0);
    if (aDate.getTime() !== bDate.getTime()) {
      return aDate - bDate;
    }
    const aMin = this._timeToMinutes(aTimeStr) || 0;
    const bMin = this._timeToMinutes(bTimeStr) || 0;
    return aMin - bMin;
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getCartFromStorage();
    if (cart && cart.status === 'open') {
      return cart;
    }
    // create new cart
    cart = {
      id: this._generateId('cart'),
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: ''
    };
    this._saveCart(cart);
    return cart;
  }

  _recalculateCartTotals() {
    const cart = this._getCartFromStorage();
    if (!cart) {
      return { cart: null, subtotal: 0, currency: null, total_items: 0 };
    }
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );
    let subtotal = 0;
    let currency = null;
    for (const item of cartItems) {
      subtotal += Number(item.total_price) || 0;
      if (!currency) {
        // Try to infer currency from related pass or gift card
        if (item.item_type === 'pass' && item.pass_id) {
          const passes = this._getFromStorage('passes');
          const p = passes.find((x) => x.id === item.pass_id);
          if (p) currency = p.currency || null;
        } else if (item.item_type === 'gift_card' && item.gift_card_purchase_id) {
          const gcps = this._getFromStorage('gift_card_purchases');
          const g = gcps.find((x) => x.id === item.gift_card_purchase_id);
          if (g) currency = g.currency || null;
        }
      }
    }
    cart.updated_at = new Date().toISOString();
    this._saveCart(cart);
    return { cart, subtotal, currency, total_items: cartItems.length };
  }

  // ----------------------
  // Schedule helpers
  // ----------------------

  _resolveScheduleToClass(scheduleId) {
    const schedules = this._getFromStorage('class_schedules');
    const classes = this._getFromStorage('group_classes');
    const schedule = schedules.find((s) => s.id === scheduleId) || null;
    if (!schedule) return { schedule: null, groupClass: null };
    const groupClass = classes.find((c) => c.id === schedule.class_id) || null;
    return { schedule, groupClass };
  }

  _filterByDateTimeWindow(items, options) {
    // options: { dateRange: {start_date, end_date}, dayOfWeek, timeOfDay: {start_time, end_time} }
    const { dateRange, dayOfWeek, timeOfDay } = options || {};
    return items.filter((item) => {
      // dateRange (item.date or item.start_datetime)
      if (dateRange && (dateRange.start_date || dateRange.end_date)) {
        const dateStr = item.date || item.start_datetime;
        const d = this._parseDate(dateStr);
        if (!d) return false;
        if (dateRange.start_date) {
          const sd = this._parseDate(dateRange.start_date);
          if (sd && d < sd) return false;
        }
        if (dateRange.end_date) {
          const ed = this._parseDate(dateRange.end_date);
          if (ed && d > ed) return false;
        }
      }

      // dayOfWeek
      if (dayOfWeek) {
        if ((item.day_of_week || '').toLowerCase() !== dayOfWeek.toLowerCase()) {
          return false;
        }
      }

      // timeOfDay
      if (timeOfDay && (timeOfDay.start_time || timeOfDay.end_time)) {
        const itemStart = this._timeToMinutes(item.start_time);
        if (itemStart == null) return false;
        if (timeOfDay.start_time) {
          const min = this._timeToMinutes(timeOfDay.start_time);
          if (min != null && itemStart < min) return false;
        }
        if (timeOfDay.end_time) {
          const max = this._timeToMinutes(timeOfDay.end_time);
          if (max != null && itemStart > max) return false;
        }
      }

      return true;
    });
  }

  _buildScheduleSummaryForClass(classId) {
    const schedules = this._getFromStorage('class_schedules').filter(
      (s) => s.class_id === classId && s.is_active !== false
    );
    if (!schedules.length) return { weekday_summary: '', time_summary: '' };

    const dayOrder = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];
    const dayLabels = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };

    const uniqueDays = Array.from(
      new Set(
        schedules
          .map((s) => s.day_of_week)
          .filter(Boolean)
      )
    ).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    const weekdaySummary = uniqueDays.map((d) => dayLabels[d] || d).join(', ');

    // Assume all schedules share same time window, pick first by start_time
    const sortedByTime = schedules
      .slice()
      .sort((a, b) => (this._timeToMinutes(a.start_time) || 0) - (this._timeToMinutes(b.start_time) || 0));

    const first = sortedByTime[0];
    const timeSummary = first.start_time && first.end_time
      ? `${first.start_time}–${first.end_time}`
      : first.start_time || '';

    return { weekday_summary: weekdaySummary, time_summary: timeSummary };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const classes = this._getFromStorage('group_classes').filter((c) => c.is_active !== false);
    const passes = this._getFromStorage('passes').filter((p) => p.is_active !== false && p.is_visible_online !== false);
    const events = this._getFromStorage('events').filter((e) => e.is_active !== false);
    const studios = this._getFromStorage('studios');

    const featuredClasses = classes
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(8640000000000000);
        const db = this._parseDate(b.start_date) || new Date(8640000000000000);
        return da - db;
      })
      .slice(0, 5)
      .map((cls) => {
        const studio = studios.find((s) => s.id === cls.studio_id) || null;
        const { weekday_summary, time_summary } = this._buildScheduleSummaryForClass(cls.id);
        return {
          class_id: cls.id,
          name: cls.name,
          slug: cls.slug || '',
          audience: cls.audience,
          style: cls.style,
          level: cls.level,
          studio_name: studio ? studio.name : '',
          location_code: cls.location_code || (studio ? studio.location_code : ''),
          price: cls.price,
          currency: cls.currency,
          next_start_date: cls.start_date || '',
          schedule_summary: [weekday_summary, time_summary].filter(Boolean).join(' '),
          is_drop_in: !!cls.is_drop_in,
          // foreign key resolution
          class: cls,
          studio
        };
      });

    const featuredPasses = passes
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.price - b.price)
      .slice(0, 5)
      .map((p) => ({
        pass_id: p.id,
        name: p.name,
        pass_type: p.pass_type,
        number_of_classes: p.number_of_classes,
        price: p.price,
        currency: p.currency,
        short_description: p.description || '',
        pass: p
      }));

    const featuredEvents = events
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const db = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return da - db;
      })
      .slice(0, 5)
      .map((e) => {
        const studio = studios.find((s) => s.id === e.studio_id) || null;
        return {
          event_id: e.id,
          title: e.title,
          style: e.style || 'other',
          start_datetime: e.start_datetime,
          duration_minutes: e.duration_minutes,
          price: e.price,
          currency: e.currency,
          studio_name: studio ? studio.name : '',
          is_weekend: !!e.is_weekend,
          event: e,
          studio
        };
      });

    // Promotions – derive from existing data (no hard-coded sample promos)
    const promotions = [];
    const freeTrials = this._getFromStorage('free_trial_slots').filter((s) => s.is_available !== false);
    if (freeTrials.length) {
      promotions.push({
        promotion_type: 'free_trial',
        title: 'Free Trial Classes',
        description: 'Book a free trial in your favorite style while spots last.',
        cta_label: 'Book Free Trial'
      });
    }
    const introPassExists = passes.some((p) => p.pass_type === 'intro_offer');
    if (introPassExists) {
      promotions.push({
        promotion_type: 'intro_offer',
        title: 'New Student Intro Offers',
        description: 'Save on your first few classes with intro pricing.',
        cta_label: 'View Intro Offers'
      });
    }

    return {
      featured_classes: featuredClasses,
      featured_passes: featuredPasses,
      featured_events: featuredEvents,
      promotions
    };
  }

  // getGroupClassFilterOptions()
  getGroupClassFilterOptions() {
    const classes = this._getFromStorage('group_classes');
    const schedules = this._getFromStorage('class_schedules');

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const audiences = uniq(classes.map((c) => c.audience));
    const styles = uniq(classes.map((c) => c.style));
    const levels = uniq(classes.map((c) => c.level));
    const location_codes = uniq(classes.map((c) => c.location_code));
    const days_of_week = uniq(schedules.map((s) => s.day_of_week));

    const prices = classes.map((c) => c.price).filter((v) => typeof v === 'number');
    const price_range = {
      min_price: prices.length ? Math.min(...prices) : 0,
      max_price: prices.length ? Math.max(...prices) : 0,
      currency: classes.length ? classes[0].currency || 'USD' : 'USD'
    };

    const time_of_day_ranges = [
      { id: 'morning', label: 'Morning (09:00–12:00)', start_time: '09:00', end_time: '12:00' },
      { id: 'afternoon', label: 'Afternoon (12:00–17:00)', start_time: '12:00', end_time: '17:00' },
      { id: 'evening', label: 'Evening (17:00–21:00)', start_time: '17:00', end_time: '21:00' }
    ];

    const date_filters = [
      { id: 'this_week', label: 'This Week' },
      { id: 'next_month', label: 'Next Month' },
      { id: 'all_future', label: 'All Upcoming' }
    ];

    const sort_options = [
      { id: 'price_low_to_high', label: 'Price: Low to High' },
      { id: 'start_date', label: 'Start Date' },
      { id: 'start_time', label: 'Start Time' },
      { id: 'popularity', label: 'Popularity' }
    ];

    return {
      audiences,
      styles,
      levels,
      location_codes,
      days_of_week,
      time_of_day_ranges,
      price_range,
      date_filters,
      sort_options
    };
  }

  // searchGroupClasses(keyword, audience, style, level, minAge, maxAge, locationCode, dayOfWeek, timeOfDay, dateFilter, priceFilter, isDropIn, sortBy, limit)
  searchGroupClasses(
    keyword,
    audience,
    style,
    level,
    minAge,
    maxAge,
    locationCode,
    dayOfWeek,
    timeOfDay,
    dateFilter,
    priceFilter,
    isDropIn,
    sortBy,
    limit
  ) {
    let classes = this._getFromStorage('group_classes').filter((c) => c.is_active !== false);
    const schedules = this._getFromStorage('class_schedules').filter((s) => s.is_active !== false);
    const studios = this._getFromStorage('studios');

    const kw = keyword && typeof keyword === 'string' ? keyword.toLowerCase() : null;

    // Instrumentation for task completion tracking (task_1 and task_2)
    try {
      const styleLower = style && typeof style === 'string' ? style.toLowerCase() : null;
      const levelLower = level && typeof level === 'string' ? level.toLowerCase() : null;

      // Task 1: Beginner Salsa next-month, evening (>= 18:00), price_low_to_high
      let task1Matches = false;
      if (styleLower === 'salsa' && levelLower === 'beginner' && sortBy === 'price_low_to_high') {
        const hasNextMonthFilter = !!(dateFilter && dateFilter.mode === 'next_month');
        let hasEveningTime = false;
        if (timeOfDay && typeof timeOfDay.start_time === 'string') {
          const startMinutes = this._timeToMinutes(timeOfDay.start_time);
          const thresholdMinutes = this._timeToMinutes('18:00');
          if (startMinutes != null && thresholdMinutes != null && startMinutes >= thresholdMinutes) {
            hasEveningTime = true;
          }
        }
        if (hasNextMonthFilter && hasEveningTime) {
          task1Matches = true;
        }
      }
      if (task1Matches) {
        const payload = {
          audience,
          style,
          level,
          minAge,
          maxAge,
          locationCode,
          dayOfWeek,
          timeOfDay,
          dateFilter,
          priceFilter,
          isDropIn,
          sortBy
        };
        localStorage.setItem('task1_classSearchParams', JSON.stringify(payload));
      }

      // Task 2: Ballet search with age filter that could include age 7
      const task2Matches =
        styleLower === 'ballet' &&
        (minAge == null || minAge <= 7) &&
        (maxAge == null || maxAge >= 7);

      if (task2Matches) {
        const payload2 = {
          audience,
          style,
          level,
          minAge,
          maxAge,
          locationCode,
          dayOfWeek,
          timeOfDay,
          dateFilter,
          priceFilter,
          isDropIn,
          sortBy
        };
        localStorage.setItem('task2_classSearchParams', JSON.stringify(payload2));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    classes = classes.filter((cls) => {
      if (audience && cls.audience !== audience) return false;
      if (style && cls.style !== style) return false;
      if (level && cls.level !== level) return false;
      if (locationCode && cls.location_code !== locationCode) return false;
      if (typeof isDropIn === 'boolean' && !!cls.is_drop_in !== isDropIn) return false;

      if (kw) {
        const haystack = ((cls.name || '') + ' ' + (cls.description || '')).toLowerCase();
        if (!haystack.includes(kw)) return false;
      }

      // Age overlap
      if (minAge != null) {
        if (cls.age_max != null && cls.age_max < minAge) return false;
      }
      if (maxAge != null) {
        if (cls.age_min != null && cls.age_min > maxAge) return false;
      }

      // Date filter based on class.start_date
      if (dateFilter && dateFilter.mode) {
        const startDate = this._parseDate(cls.start_date);
        const today = new Date();
        if (dateFilter.mode === 'next_month') {
          // compute next calendar month
          const year = today.getFullYear();
          const month = today.getMonth();
          const nextMonthDate = new Date(year, month + 1, 1);
          const nextMonthStart = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1);
          const nextMonthEnd = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0, 23, 59, 59);
          if (!startDate || startDate < nextMonthStart || startDate > nextMonthEnd) return false;
        } else if (dateFilter.mode === 'date_range') {
          if (!startDate) return false;
          if (dateFilter.start_date) {
            const sd = this._parseDate(dateFilter.start_date);
            if (sd && startDate < sd) return false;
          }
          if (dateFilter.end_date) {
            const ed = this._parseDate(dateFilter.end_date);
            if (ed && startDate > ed) return false;
          }
        } else if (dateFilter.mode === 'all_future') {
          if (!startDate || startDate < today) return false;
        }
      }

      // Day/time filter based on schedules
      let relevantSchedules = schedules.filter((s) => s.class_id === cls.id);
      if (dayOfWeek) {
        relevantSchedules = relevantSchedules.filter(
          (s) => s.day_of_week === dayOfWeek
        );
      }
      if (timeOfDay && (timeOfDay.start_time || timeOfDay.end_time)) {
        relevantSchedules = relevantSchedules.filter((s) => {
          const st = this._timeToMinutes(s.start_time);
          if (st == null) return false;
          if (timeOfDay.start_time) {
            const min = this._timeToMinutes(timeOfDay.start_time);
            if (min != null && st < min) return false;
          }
          if (timeOfDay.end_time) {
            const max = this._timeToMinutes(timeOfDay.end_time);
            if (max != null && st > max) return false;
          }
          return true;
        });
      }
      if (dayOfWeek || (timeOfDay && (timeOfDay.start_time || timeOfDay.end_time))) {
        if (!relevantSchedules.length) return false;
      }

      // Price filter
      if (priceFilter) {
        if (priceFilter.min_price != null && cls.price < priceFilter.min_price) return false;
        if (priceFilter.max_price != null && cls.price > priceFilter.max_price) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price_low_to_high') {
      classes.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'start_date') {
      classes.sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(8640000000000000);
        const db = this._parseDate(b.start_date) || new Date(8640000000000000);
        return da - db;
      });
    } else if (sortBy === 'start_time') {
      classes.sort((a, b) => {
        const sa = schedules.filter((s) => s.class_id === a.id);
        const sb = schedules.filter((s) => s.class_id === b.id);
        const aMin = sa.length ? this._timeToMinutes(sa[0].start_time) || 0 : 0;
        const bMin = sb.length ? this._timeToMinutes(sb[0].start_time) || 0 : 0;
        return aMin - bMin;
      });
    }

    if (limit != null && limit > 0) {
      classes = classes.slice(0, limit);
    }

    return classes.map((cls) => {
      const studio = studios.find((s) => s.id === cls.studio_id) || null;
      const { weekday_summary, time_summary } = this._buildScheduleSummaryForClass(cls.id);
      return {
        class_id: cls.id,
        name: cls.name,
        slug: cls.slug || '',
        audience: cls.audience,
        style: cls.style,
        level: cls.level,
        age_min: cls.age_min != null ? cls.age_min : null,
        age_max: cls.age_max != null ? cls.age_max : null,
        location_code: cls.location_code || (studio ? studio.location_code : ''),
        studio_name: studio ? studio.name : '',
        price: cls.price,
        currency: cls.currency,
        start_date: cls.start_date || '',
        is_drop_in: !!cls.is_drop_in,
        weekday_summary,
        time_summary,
        class: cls,
        studio
      };
    });
  }

  // getClassDetail(classId)
  getClassDetail(classId) {
    const classes = this._getFromStorage('group_classes');
    const studios = this._getFromStorage('studios');
    const instructorsAll = this._getFromStorage('instructors');
    const schedulesAll = this._getFromStorage('class_schedules');
    const favorites = this._getFromStorage('favorite_classes');
    const policies = this._getFromStorage('policy_sections');

    const cls = classes.find((c) => c.id === classId) || null;
    if (!cls) {
      return {
        class: null,
        studio: null,
        instructors: [],
        schedules: [],
        policy_summaries: []
      };
    }

    // Instrumentation for task completion tracking (task_2 comparedClassIds)
    try {
      const styleLower = cls.style && typeof cls.style === 'string' ? cls.style.toLowerCase() : null;
      const ageMin = cls.age_min;
      const ageMax = cls.age_max;
      if (
        styleLower === 'ballet' &&
        (ageMin == null || ageMin <= 7) &&
        (ageMax == null || ageMax >= 7)
      ) {
        let ids = [];
        const existing = localStorage.getItem('task2_comparedClassIds');
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) {
              ids = parsed;
            }
          } catch (_) {
            // ignore parse error and start fresh
          }
        }
        if (!ids.includes(cls.id)) {
          ids.push(cls.id);
          localStorage.setItem('task2_comparedClassIds', JSON.stringify(ids));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const studio = studios.find((s) => s.id === cls.studio_id) || null;

    const instructors = (cls.instructor_ids || [])
      .map((iid) => instructorsAll.find((i) => i.id === iid))
      .filter(Boolean)
      .map((inst) => ({
        instructor_id: inst.id,
        name: inst.name,
        primary_style: inst.primary_style || null,
        years_of_experience: inst.years_of_experience,
        photo_url: inst.photo_url || '',
        instructor: inst
      }));

    const schedules = schedulesAll
      .filter((s) => s.class_id === cls.id && s.is_active !== false)
      .map((s) => ({
        schedule_id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time || '',
        capacity: s.capacity != null ? s.capacity : null,
        current_enrollment: s.current_enrollment != null ? s.current_enrollment : 0,
        is_active: s.is_active !== false,
        is_favorite: favorites.some((f) => f.schedule_id === s.id),
        schedule: s
      }));

    const relevantPolicies = policies.filter((p) => {
      if (p.is_active === false) return false;
      if (p.applies_to_audience && p.applies_to_audience !== cls.audience && p.applies_to_audience !== 'all_ages') {
        return false;
      }
      if (p.applies_to_class_type && p.applies_to_class_type !== 'group_class') {
        return false;
      }
      return true;
    });

    const policy_summaries = relevantPolicies.map((p) => ({
      category: p.category,
      title: p.title,
      summary: this._stripHtml(p.content_html).slice(0, 200),
      policy_section: p
    }));

    return {
      class: {
        id: cls.id,
        name: cls.name,
        slug: cls.slug || '',
        audience: cls.audience,
        style: cls.style,
        level: cls.level,
        description: cls.description || '',
        age_min: cls.age_min != null ? cls.age_min : null,
        age_max: cls.age_max != null ? cls.age_max : null,
        price: cls.price,
        currency: cls.currency,
        price_notes: cls.price_notes || '',
        start_date: cls.start_date || '',
        end_date: cls.end_date || '',
        duration_minutes: cls.duration_minutes != null ? cls.duration_minutes : null,
        is_drop_in: !!cls.is_drop_in,
        max_capacity: cls.max_capacity != null ? cls.max_capacity : null
      },
      studio: studio
        ? {
            name: studio.name,
            location_code: studio.location_code,
            address: studio.address || '',
            phone: studio.phone || '',
            email: studio.email || ''
          }
        : null,
      instructors,
      schedules,
      policy_summaries
    };
  }

  // submitClassEnrollment(classId, scheduleId, audience, participantName, participantAge, guardianName, guardianEmail, guardianPhone, contactEmail, contactPhone, notes)
  submitClassEnrollment(
    classId,
    scheduleId,
    audience,
    participantName,
    participantAge,
    guardianName,
    guardianEmail,
    guardianPhone,
    contactEmail,
    contactPhone,
    notes
  ) {
    const classes = this._getFromStorage('group_classes');
    const schedules = this._getFromStorage('class_schedules');
    const enrollments = this._getFromStorage('class_enrollments');

    const cls = classes.find((c) => c.id === classId) || null;
    const schedule = schedules.find((s) => s.id === scheduleId) || null;

    if (!cls || !schedule) {
      return {
        enrollment_id: null,
        status: 'pending',
        message: 'Class or schedule not found.'
      };
    }

    let status = 'pending';
    if (schedule.capacity != null) {
      const current = schedule.current_enrollment != null ? schedule.current_enrollment : 0;
      if (current >= schedule.capacity) {
        status = 'waitlisted';
      }
    }

    const id = this._generateId('enroll');
    const enrollment = {
      id,
      class_id: classId,
      schedule_id: scheduleId,
      audience: audience || cls.audience,
      participant_name: participantName,
      participant_age: participantAge != null ? participantAge : null,
      guardian_name: guardianName || '',
      guardian_email: guardianEmail || '',
      guardian_phone: guardianPhone || '',
      contact_email: contactEmail || '',
      contact_phone: contactPhone || '',
      enrollment_source: 'website',
      status,
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    enrollments.push(enrollment);
    this._saveToStorage('class_enrollments', enrollments);

    if (status !== 'waitlisted') {
      const idx = schedules.findIndex((s) => s.id === scheduleId);
      if (idx >= 0) {
        const curr = schedules[idx].current_enrollment != null ? schedules[idx].current_enrollment : 0;
        schedules[idx].current_enrollment = curr + 1;
        this._saveToStorage('class_schedules', schedules);
      }
    }

    return {
      enrollment_id: id,
      status,
      message: status === 'waitlisted' ? 'Added to waitlist.' : 'Enrollment submitted.'
    };
  }

  // addFavoriteClassEntry(scheduleId)
  addFavoriteClassEntry(scheduleId) {
    const favorites = this._getFromStorage('favorite_classes');
    const { schedule, groupClass } = this._resolveScheduleToClass(scheduleId);
    if (!schedule || !groupClass) {
      return {
        favorite_id: null,
        schedule_id: scheduleId,
        class_id: null,
        added_at: null,
        message: 'Schedule not found.'
      };
    }

    // Prevent duplicates
    const existing = favorites.find((f) => f.schedule_id === scheduleId);
    if (existing) {
      return {
        favorite_id: existing.id,
        schedule_id: existing.schedule_id,
        class_id: existing.class_id,
        added_at: existing.added_at,
        message: 'Already in favorites.',
        class: groupClass,
        schedule
      };
    }

    const id = this._generateId('fav');
    const entry = {
      id,
      class_id: groupClass.id,
      schedule_id: scheduleId,
      added_at: new Date().toISOString(),
      notes: ''
    };

    favorites.push(entry);
    this._saveToStorage('favorite_classes', favorites);

    return {
      favorite_id: id,
      schedule_id: scheduleId,
      class_id: groupClass.id,
      added_at: entry.added_at,
      message: 'Added to favorites.',
      class: groupClass,
      schedule
    };
  }

  // removeFavoriteClassEntry(favoriteId)
  removeFavoriteClassEntry(favoriteId) {
    const favorites = this._getFromStorage('favorite_classes');
    const idx = favorites.findIndex((f) => f.id === favoriteId);
    if (idx === -1) {
      return { success: false, message: 'Favorite not found.' };
    }
    favorites.splice(idx, 1);
    this._saveToStorage('favorite_classes', favorites);
    return { success: true, message: 'Favorite removed.' };
  }

  // getFavoritesSchedule()
  getFavoritesSchedule() {
    const favorites = this._getFromStorage('favorite_classes');
    const schedules = this._getFromStorage('class_schedules');
    const classes = this._getFromStorage('group_classes');
    const studios = this._getFromStorage('studios');

    // Instrumentation for task completion tracking (task_6 favorites viewed)
    try {
      localStorage.setItem('task6_favoritesViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return favorites.map((fav) => {
      const schedule = schedules.find((s) => s.id === fav.schedule_id) || null;
      const cls = classes.find((c) => c.id === fav.class_id) || null;
      const studio = cls ? studios.find((s) => s.id === cls.studio_id) || null : null;

      return {
        favorite_id: fav.id,
        class_id: fav.class_id,
        class_name: cls ? cls.name : '',
        audience: cls ? cls.audience : '',
        style: cls ? cls.style : '',
        level: cls ? cls.level : '',
        studio_name: studio ? studio.name : '',
        location_code: cls ? cls.location_code || (studio ? studio.location_code : '') : '',
        schedule_id: fav.schedule_id,
        day_of_week: schedule ? schedule.day_of_week : '',
        start_time: schedule ? schedule.start_time : '',
        end_time: schedule ? schedule.end_time || '' : '',
        added_at: fav.added_at,
        class: cls,
        schedule,
        studio
      };
    });
  }

  // getPassFilterOptions()
  getPassFilterOptions() {
    const passes = this._getFromStorage('passes').filter((p) => p.is_active !== false && p.is_visible_online !== false);
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const pass_types = uniq(passes.map((p) => p.pass_type));

    const class_count_options = [
      { id: 'single', label: 'Single Class', min_classes: 1 },
      { id: '5_plus', label: '5+ Classes', min_classes: 5 },
      { id: '8_plus', label: '8+ Classes', min_classes: 8 },
      { id: 'unlimited', label: 'Unlimited', min_classes: 0 }
    ];

    const prices = passes.map((p) => p.price).filter((v) => typeof v === 'number');
    const price_range = {
      min_price: prices.length ? Math.min(...prices) : 0,
      max_price: prices.length ? Math.max(...prices) : 0,
      currency: passes.length ? passes[0].currency || 'USD' : 'USD'
    };

    const sort_options = [
      { id: 'price_low_to_high', label: 'Price: Low to High' },
      { id: 'classes_high_to_low', label: 'Classes: High to Low' },
      { id: 'value_per_class', label: 'Best Value per Class' }
    ];

    return {
      pass_types,
      class_count_options,
      price_range,
      sort_options
    };
  }

  // searchPasses(passType, minClasses, maxPrice, minPrice, allowedAudience, sortBy)
  searchPasses(passType, minClasses, maxPrice, minPrice, allowedAudience, sortBy) {
    let passes = this._getFromStorage('passes').filter((p) => p.is_active !== false && p.is_visible_online !== false);

    // Instrumentation for task completion tracking (task_3)
    try {
      const matches =
        minClasses != null &&
        minClasses >= 8 &&
        maxPrice != null &&
        maxPrice <= 150 &&
        sortBy === 'price_low_to_high';
      if (matches) {
        const payload = {
          passType,
          minClasses,
          maxPrice,
          minPrice,
          allowedAudience,
          sortBy
        };
        localStorage.setItem('task3_passSearchParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    passes = passes.filter((p) => {
      if (passType && p.pass_type !== passType) return false;
      if (minClasses != null) {
        const classesCount = p.number_of_classes == null || p.number_of_classes === 0 ? Infinity : p.number_of_classes;
        if (classesCount < minClasses) return false;
      }
      if (maxPrice != null && p.price > maxPrice) return false;
      if (minPrice != null && p.price < minPrice) return false;
      if (allowedAudience) {
        if (
          p.allowed_audience &&
          p.allowed_audience !== allowedAudience &&
          p.allowed_audience !== 'all_ages'
        ) {
          return false;
        }
      }
      return true;
    });

    if (sortBy === 'price_low_to_high') {
      passes.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'classes_high_to_low') {
      passes.sort((a, b) => {
        const ac = a.number_of_classes == null || a.number_of_classes === 0 ? Infinity : a.number_of_classes;
        const bc = b.number_of_classes == null || b.number_of_classes === 0 ? Infinity : b.number_of_classes;
        return bc - ac;
      });
    } else if (sortBy === 'value_per_class') {
      const value = (p) => {
        const c = p.number_of_classes == null || p.number_of_classes === 0 ? Infinity : p.number_of_classes;
        return c === Infinity ? Infinity : p.price / c;
      };
      passes.sort((a, b) => value(a) - value(b));
    }

    return passes.map((p) => ({
      pass_id: p.id,
      name: p.name,
      pass_type: p.pass_type,
      number_of_classes: p.number_of_classes,
      price: p.price,
      currency: p.currency,
      validity_days: p.validity_days != null ? p.validity_days : null,
      allowed_audience: p.allowed_audience || null,
      description: p.description || '',
      pass: p
    }));
  }

  // getPassDetail(passId)
  getPassDetail(passId) {
    const passes = this._getFromStorage('passes');
    const pass = passes.find((p) => p.id === passId) || null;
    if (!pass) {
      return { pass: null, related_passes: [] };
    }

    const related_passes = passes
      .filter((p) => p.id !== pass.id && p.pass_type === pass.pass_type)
      .slice(0, 5)
      .map((p) => ({
        pass_id: p.id,
        name: p.name,
        price: p.price,
        number_of_classes: p.number_of_classes,
        pass: p
      }));

    return {
      pass: {
        id: pass.id,
        name: pass.name,
        pass_type: pass.pass_type,
        number_of_classes: pass.number_of_classes,
        price: pass.price,
        currency: pass.currency,
        validity_days: pass.validity_days != null ? pass.validity_days : null,
        allowed_audience: pass.allowed_audience || null,
        allowed_styles: pass.allowed_styles || [],
        allowed_locations: pass.allowed_locations || [],
        restrictions: pass.restrictions || '',
        description: pass.description || ''
      },
      related_passes
    };
  }

  // addPassToCart(passId, quantity)
  addPassToCart(passId, quantity) {
    const passes = this._getFromStorage('passes');
    const pass = passes.find((p) => p.id === passId) || null;
    if (!pass) {
      return {
        cart_id: null,
        cart_item_id: null,
        total_items: 0,
        subtotal: 0,
        currency: null,
        message: 'Pass not found.'
      };
    }

    const qty = quantity != null ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    // If pass already in cart, update quantity
    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.item_type === 'pass' && ci.pass_id === passId);
    if (item) {
      item.quantity += qty;
      item.total_price = item.unit_price * item.quantity;
    } else {
      const id = this._generateId('cartitem');
      item = {
        id,
        cart_id: cart.id,
        item_type: 'pass',
        pass_id: pass.id,
        gift_card_purchase_id: null,
        name: pass.name,
        quantity: qty,
        unit_price: pass.price,
        total_price: pass.price * qty,
        added_at: new Date().toISOString()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return {
      cart_id: cart.id,
      cart_item_id: item.id,
      total_items: totals.total_items,
      subtotal: totals.subtotal,
      currency: totals.currency || pass.currency || 'USD',
      message: 'Pass added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getCartFromStorage();
    if (!cart) {
      return {
        cart_id: null,
        status: 'open',
        items: [],
        subtotal: 0,
        currency: null
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const passes = this._getFromStorage('passes');
    const gcps = this._getFromStorage('gift_card_purchases');
    const templates = this._getFromStorage('gift_card_templates');

    const items = cartItems.map((ci) => {
      let pass = null;
      let giftCardPurchase = null;
      let giftCardTemplate = null;
      if (ci.item_type === 'pass' && ci.pass_id) {
        pass = passes.find((p) => p.id === ci.pass_id) || null;
      } else if (ci.item_type === 'gift_card' && ci.gift_card_purchase_id) {
        giftCardPurchase = gcps.find((g) => g.id === ci.gift_card_purchase_id) || null;
        if (giftCardPurchase) {
          giftCardTemplate = templates.find((t) => t.id === giftCardPurchase.gift_card_template_id) || null;
        }
      }
      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        pass,
        gift_card_purchase: giftCardPurchase,
        gift_card_template: giftCardTemplate
      };
    });

    const totals = this._recalculateCartTotals();

    return {
      cart_id: cart.id,
      status: cart.status,
      items,
      subtotal: totals.subtotal,
      currency: totals.currency || 'USD'
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getCartFromStorage();
    if (!cart) {
      return {
        cart_id: null,
        cart_item_id: cartItemId,
        quantity: 0,
        subtotal: 0,
        currency: null
      };
    }

    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }

    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      const totals = this._recalculateCartTotals();
      return {
        cart_id: cart.id,
        cart_item_id: cartItemId,
        quantity: 0,
        subtotal: totals.subtotal,
        currency: totals.currency || 'USD'
      };
    }

    const item = cartItems[idx];
    item.quantity = quantity;
    item.total_price = item.unit_price * quantity;
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return {
      cart_id: cart.id,
      cart_item_id: item.id,
      quantity: item.quantity,
      subtotal: totals.subtotal,
      currency: totals.currency || 'USD'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getCartFromStorage();
    if (!cart) {
      return { cart_id: null, subtotal: 0, currency: null, total_items: 0 };
    }

    let cartItems = this._getFromStorage('cart_items');
    cartItems = cartItems.filter((ci) => !(ci.id === cartItemId && ci.cart_id === cart.id));
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals();

    return {
      cart_id: cart.id,
      subtotal: totals.subtotal,
      currency: totals.currency || 'USD',
      total_items: totals.total_items
    };
  }

  // submitOrder(purchaserName, purchaserEmail, purchaserPhone, paymentOption, notes)
  submitOrder(purchaserName, purchaserEmail, purchaserPhone, paymentOption, notes) {
    const cart = this._getCartFromStorage();
    if (!cart) {
      return {
        order_id: null,
        status: 'pending',
        total_amount: 0,
        currency: 'USD',
        message: 'No cart found.'
      };
    }

    const validPaymentOptions = ['pay_at_studio', 'pay_in_person', 'reserve_without_payment'];
    if (!validPaymentOptions.includes(paymentOption)) {
      paymentOption = 'pay_at_studio';
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    if (!cartItems.length) {
      return {
        order_id: null,
        status: 'pending',
        total_amount: 0,
        currency: 'USD',
        message: 'Cart is empty.'
      };
    }

    const totals = this._recalculateCartTotals();
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const order = {
      id: orderId,
      cart_id: cart.id,
      purchaser_name: purchaserName,
      purchaser_email: purchaserEmail,
      purchaser_phone: purchaserPhone || '',
      payment_option: paymentOption,
      status: 'pending',
      total_amount: totals.subtotal,
      currency: totals.currency || 'USD',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    orders.push(order);

    for (const ci of cartItems) {
      const oi = {
        id: this._generateId('orderitem'),
        order_id: orderId,
        item_type: ci.item_type,
        pass_id: ci.pass_id || null,
        gift_card_purchase_id: ci.gift_card_purchase_id || null,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      };
      orderItems.push(oi);
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // mark cart checked out
    cart.status = 'checked_out';
    cart.updated_at = new Date().toISOString();
    this._saveCart(cart);

    return {
      order_id: orderId,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      message: 'Order submitted.'
    };
  }

  // getFreeTrialFilterOptions()
  getFreeTrialFilterOptions() {
    const slots = this._getFromStorage('free_trial_slots');
    const studios = this._getFromStorage('studios');

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const styles = uniq(slots.map((s) => s.style));

    const locationIds = uniq(slots.map((s) => s.studio_id));
    const locations = locationIds
      .map((id) => studios.find((st) => st.id === id))
      .filter(Boolean)
      .map((st) => ({
        studio_id: st.id,
        studio_name: st.name,
        location_code: st.location_code
      }));

    const time_of_day_ranges = [
      { id: 'late_morning', label: 'Late Morning (10:00–12:00)', start_time: '10:00', end_time: '12:00' },
      { id: 'afternoon', label: 'Afternoon (12:00–16:00)', start_time: '12:00', end_time: '16:00' }
    ];

    return {
      styles,
      locations,
      time_of_day_ranges
    };
  }

  // searchFreeTrialSlots(style, studioId, dateRange, dayOfWeek, timeOfDay, limit)
  searchFreeTrialSlots(style, studioId, dateRange, dayOfWeek, timeOfDay, limit) {
    let slots = this._getFromStorage('free_trial_slots').filter((s) => s.is_available !== false);
    const studios = this._getFromStorage('studios');

    // Instrumentation for task completion tracking (task_4)
    try {
      const styleLower = style && typeof style === 'string' ? style.toLowerCase() : null;
      const dayLower = dayOfWeek && typeof dayOfWeek === 'string' ? dayOfWeek.toLowerCase() : null;
      let timeMatches = false;
      if (timeOfDay && typeof timeOfDay.start_time === 'string' && typeof timeOfDay.end_time === 'string') {
        const startMinutes = this._timeToMinutes(timeOfDay.start_time);
        const endMinutes = this._timeToMinutes(timeOfDay.end_time);
        const lowerBound = this._timeToMinutes('10:00');
        const upperBound = this._timeToMinutes('14:00');
        if (
          startMinutes != null &&
          endMinutes != null &&
          lowerBound != null &&
          upperBound != null &&
          startMinutes <= lowerBound &&
          endMinutes >= upperBound
        ) {
          timeMatches = true;
        }
      }
      const matches =
        styleLower === 'hip hop' &&
        dayLower === 'saturday' &&
        timeMatches;
      if (matches) {
        const payload = {
          style,
          studioId,
          dateRange,
          dayOfWeek,
          timeOfDay,
          limit
        };
        localStorage.setItem('task4_freeTrialSearchParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    slots = slots.filter((s) => {
      if (style && s.style !== style) return false;
      if (studioId && s.studio_id !== studioId) return false;
      return true;
    });

    slots = this._filterByDateTimeWindow(slots, { dateRange, dayOfWeek, timeOfDay });

    slots.sort((a, b) => this._compareByDateTime(a.date, a.start_time, b.date, b.start_time));

    if (limit != null && limit > 0) {
      slots = slots.slice(0, limit);
    }

    return slots.map((slot) => {
      const studio = studios.find((s) => s.id === slot.studio_id) || null;
      return {
        slot_id: slot.id,
        style: slot.style,
        studio_name: studio ? studio.name : '',
        location_code: studio ? studio.location_code : '',
        date: slot.date,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time || '',
        capacity: slot.capacity != null ? slot.capacity : null,
        booked_count: slot.booked_count != null ? slot.booked_count : 0,
        is_available: slot.is_available !== false,
        studio,
        slot
      };
    });
  }

  // getFreeTrialSlotDetail(slotId)
  getFreeTrialSlotDetail(slotId) {
    const slots = this._getFromStorage('free_trial_slots');
    const studios = this._getFromStorage('studios');
    const slot = slots.find((s) => s.id === slotId) || null;
    if (!slot) {
      return {
        slot_id: null,
        style: null,
        studio_name: '',
        location_code: '',
        date: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        capacity: null,
        booked_count: 0,
        is_available: false,
        notes: ''
      };
    }
    const studio = studios.find((s) => s.id === slot.studio_id) || null;
    return {
      slot_id: slot.id,
      style: slot.style,
      studio_name: studio ? studio.name : '',
      location_code: studio ? studio.location_code : '',
      date: slot.date,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time || '',
      capacity: slot.capacity != null ? slot.capacity : null,
      booked_count: slot.booked_count != null ? slot.booked_count : 0,
      is_available: slot.is_available !== false,
      notes: slot.notes || '',
      studio,
      slot
    };
  }

  // bookFreeTrialSlot(slotId, name, email, phone, notes)
  bookFreeTrialSlot(slotId, name, email, phone, notes) {
    const slots = this._getFromStorage('free_trial_slots');
    const bookings = this._getFromStorage('free_trial_bookings');

    const slotIdx = slots.findIndex((s) => s.id === slotId);
    if (slotIdx === -1) {
      return {
        booking_id: null,
        status: 'pending',
        message: 'Slot not found.'
      };
    }
    const slot = slots[slotIdx];

    let status = 'pending';
    const capacity = slot.capacity != null ? slot.capacity : null;
    const booked = slot.booked_count != null ? slot.booked_count : 0;
    if (capacity != null && booked >= capacity) {
      status = 'waitlisted';
    }

    const id = this._generateId('ftbook');
    const booking = {
      id,
      free_trial_slot_id: slotId,
      name,
      email,
      phone: phone || '',
      status,
      created_at: new Date().toISOString(),
      notes: notes || ''
    };

    bookings.push(booking);
    this._saveToStorage('free_trial_bookings', bookings);

    if (status !== 'waitlisted') {
      slot.booked_count = booked + 1;
      if (capacity != null && slot.booked_count >= capacity) {
        slot.is_available = false;
      }
      slots[slotIdx] = slot;
      this._saveToStorage('free_trial_slots', slots);
    }

    return {
      booking_id: id,
      status,
      message: status === 'waitlisted' ? 'Added to waitlist.' : 'Free trial booked.'
    };
  }

  // getInstructorFilterOptions()
  getInstructorFilterOptions() {
    const instructors = this._getFromStorage('instructors');
    const studios = this._getFromStorage('studios');

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const styles = uniq(
      instructors.reduce((acc, inst) => {
        if (inst.primary_style) acc.push(inst.primary_style);
        if (Array.isArray(inst.styles)) acc.push(...inst.styles);
        return acc;
      }, [])
    );

    const location_codes = uniq(
      instructors
        .map((inst) => studios.find((s) => s.id === inst.studio_id))
        .filter(Boolean)
        .map((st) => st.location_code)
    );

    const experience_ranges = [
      { id: '0_4_years', label: '0–4 years', min_years: 0, max_years: 4 },
      { id: '5_plus_years', label: '5+ years', min_years: 5, max_years: null }
    ];

    return {
      styles,
      location_codes,
      experience_ranges
    };
  }

  // searchInstructors(style, locationCode, minYearsOfExperience, isAvailableForPrivates)
  searchInstructors(style, locationCode, minYearsOfExperience, isAvailableForPrivates) {
    const instructors = this._getFromStorage('instructors').filter((i) => i.active !== false);
    const studios = this._getFromStorage('studios');

    // Instrumentation for task completion tracking (task_5 instructor search)
    try {
      const styleLower = style && typeof style === 'string' ? style.toLowerCase() : null;
      const matches =
        styleLower === 'contemporary' &&
        minYearsOfExperience != null &&
        minYearsOfExperience >= 5;
      if (matches) {
        const payload = {
          style,
          locationCode,
          minYearsOfExperience,
          isAvailableForPrivates
        };
        localStorage.setItem('task5_instructorSearchParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let results = instructors.filter((inst) => {
      if (style) {
        const styles = [];
        if (inst.primary_style) styles.push(inst.primary_style);
        if (Array.isArray(inst.styles)) styles.push(...inst.styles);
        if (!styles.includes(style)) return false;
      }
      if (locationCode) {
        const studio = studios.find((s) => s.id === inst.studio_id);
        if (!studio || studio.location_code !== locationCode) return false;
      }
      if (minYearsOfExperience != null && inst.years_of_experience < minYearsOfExperience) return false;
      if (typeof isAvailableForPrivites === 'boolean' && !!inst.is_available_for_privites !== isAvailableForPrivites) {
        return false;
      }
      return true;
    });

    return results.map((inst) => {
      const studio = studios.find((s) => s.id === inst.studio_id) || null;
      return {
        instructor_id: inst.id,
        name: inst.name,
        primary_style: inst.primary_style || null,
        styles: inst.styles || [],
        years_of_experience: inst.years_of_experience,
        studio_name: studio ? studio.name : '',
        location_code: studio ? studio.location_code : '',
        is_available_for_privates: !!inst.is_available_for_privites || !!inst.is_available_for_privates,
        instructor: inst,
        studio
      };
    });
  }

  // getInstructorProfile(instructorId)
  getInstructorProfile(instructorId) {
    const instructors = this._getFromStorage('instructors');
    const studios = this._getFromStorage('studios');
    const classes = this._getFromStorage('group_classes');

    const inst = instructors.find((i) => i.id === instructorId) || null;
    if (!inst) {
      return {
        instructor: null,
        group_classes: []
      };
    }
    const studio = studios.find((s) => s.id === inst.studio_id) || null;

    const groupClasses = classes
      .filter((c) => Array.isArray(c.instructor_ids) && c.instructor_ids.includes(instructorId) && c.is_active !== false)
      .map((cls) => {
        const { weekday_summary, time_summary } = this._buildScheduleSummaryForClass(cls.id);
        return {
          class_id: cls.id,
          name: cls.name,
          style: cls.style,
          level: cls.level,
          audience: cls.audience,
          weekday_summary,
          time_summary,
          class: cls
        };
      });

    return {
      instructor: {
        id: inst.id,
        name: inst.name,
        bio: inst.bio || '',
        primary_style: inst.primary_style || null,
        styles: inst.styles || [],
        years_of_experience: inst.years_of_experience,
        certifications: inst.certifications || '',
        studio_name: studio ? studio.name : '',
        location_code: studio ? studio.location_code : '',
        photo_url: inst.photo_url || '',
        is_available_for_privates: !!inst.is_available_for_privites || !!inst.is_available_for_privates
      },
      group_classes: groupClasses
    };
  }

  // searchPrivateLessonSlots(instructorId, style, durationMinutes, dateRange, limit)
  searchPrivateLessonSlots(instructorId, style, durationMinutes, dateRange, limit) {
    let slots = this._getFromStorage('private_lesson_slots').filter(
      (s) => s.instructor_id === instructorId && s.is_available !== false
    );
    const studios = this._getFromStorage('studios');
    const instructors = this._getFromStorage('instructors');

    // Instrumentation for task completion tracking (task_5 private lesson search)
    try {
      if (durationMinutes === 60) {
        const payload = {
          instructorId,
          style,
          durationMinutes,
          dateRange,
          limit
        };
        localStorage.setItem('task5_privateLessonSearchParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    slots = slots.filter((s) => {
      if (style && s.style && s.style !== style) return false;
      if (durationMinutes != null && s.duration_minutes !== durationMinutes) return false;
      return true;
    });

    slots = this._filterByDateTimeWindow(slots, { dateRange, dayOfWeek: null, timeOfDay: null });

    slots.sort((a, b) => this._compareByDateTime(a.date, a.start_time, b.date, b.start_time));

    if (limit != null && limit > 0) {
      slots = slots.slice(0, limit);
    }

    return slots.map((slot) => {
      const studio = studios.find((s) => s.id === slot.studio_id) || null;
      const inst = instructors.find((i) => i.id === slot.instructor_id) || null;
      return {
        slot_id: slot.id,
        instructor_id: slot.instructor_id,
        style: slot.style || null,
        duration_minutes: slot.duration_minutes,
        studio_name: studio ? studio.name : '',
        location_code: studio ? studio.location_code : '',
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time || '',
        is_available: slot.is_available !== false,
        instructor: inst,
        studio,
        slot
      };
    });
  }

  // bookPrivateLessonSlot(slotId, name, email, phone, notes)
  bookPrivateLessonSlot(slotId, name, email, phone, notes) {
    const slots = this._getFromStorage('private_lesson_slots');
    const bookings = this._getFromStorage('private_lesson_bookings');

    const idx = slots.findIndex((s) => s.id === slotId);
    if (idx === -1) {
      return {
        booking_id: null,
        status: 'pending',
        message: 'Slot not found.'
      };
    }

    const slot = slots[idx];
    if (slot.is_available === false) {
      return {
        booking_id: null,
        status: 'waitlisted',
        message: 'Slot not available.'
      };
    }

    const id = this._generateId('plbook');
    const booking = {
      id,
      private_lesson_slot_id: slotId,
      name,
      email,
      phone: phone || '',
      notes: notes || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('private_lesson_bookings', bookings);

    // Mark slot no longer available
    slot.is_available = false;
    slots[idx] = slot;
    this._saveToStorage('private_lesson_slots', slots);

    return {
      booking_id: id,
      status: 'pending',
      message: 'Private lesson booked.'
    };
  }

  // getScheduleFilterOptions()
  getScheduleFilterOptions() {
    const schedules = this._getFromStorage('class_schedules');
    const studios = this._getFromStorage('studios');

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const location_codes = uniq(
      schedules
        .map((s) => studios.find((st) => st.id === s.studio_id))
        .filter(Boolean)
        .map((st) => st.location_code)
    );

    const days_of_week = uniq(schedules.map((s) => s.day_of_week));

    const time_of_day_ranges = [
      { id: 'evening', label: 'Evening (17:00–21:00)', start_time: '17:00', end_time: '21:00' },
      { id: 'afternoon', label: 'Afternoon (12:00–17:00)', start_time: '12:00', end_time: '17:00' },
      { id: 'morning', label: 'Morning (09:00–12:00)', start_time: '09:00', end_time: '12:00' }
    ];

    return {
      location_codes,
      days_of_week,
      time_of_day_ranges
    };
  }

  // getClassSchedule(locationCode, dayOfWeek, timeOfDay)
  getClassSchedule(locationCode, dayOfWeek, timeOfDay) {
    const schedules = this._getFromStorage('class_schedules').filter((s) => s.is_active !== false);
    const classes = this._getFromStorage('group_classes');
    const studios = this._getFromStorage('studios');
    const favorites = this._getFromStorage('favorite_classes');

    // Instrumentation for task completion tracking (task_6 schedule filter params)
    try {
      const hasLocation = locationCode != null;
      const isEveningRange =
        timeOfDay &&
        timeOfDay.start_time === '17:00' &&
        timeOfDay.end_time === '21:00';
      if (hasLocation && isEveningRange) {
        const payload = {
          locationCode,
          dayOfWeek,
          timeOfDay
        };
        localStorage.setItem('task6_scheduleFilterParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let filtered = schedules.filter((s) => {
      const cls = classes.find((c) => c.id === s.class_id);
      if (!cls) return false;
      if (locationCode) {
        const studio = studios.find((st) => st.id === s.studio_id);
        const loc = cls.location_code || (studio ? studio.location_code : '');
        if (loc !== locationCode) return false;
      }
      if (dayOfWeek && s.day_of_week !== dayOfWeek) return false;
      if (timeOfDay && (timeOfDay.start_time || timeOfDay.end_time)) {
        const st = this._timeToMinutes(s.start_time);
        if (st == null) return false;
        if (timeOfDay.start_time) {
          const min = this._timeToMinutes(timeOfDay.start_time);
          if (min != null && st < min) return false;
        }
        if (timeOfDay.end_time) {
          const max = this._timeToMinutes(timeOfDay.end_time);
          if (max != null && st > max) return false;
        }
      }
      return true;
    });

    return filtered.map((s) => {
      const cls = classes.find((c) => c.id === s.class_id) || null;
      const studio = studios.find((st) => st.id === s.studio_id) || null;
      const isFavorite = favorites.some((f) => f.schedule_id === s.id);
      return {
        schedule_id: s.id,
        class_id: s.class_id,
        class_name: cls ? cls.name : '',
        audience: cls ? cls.audience : '',
        style: cls ? cls.style : '',
        level: cls ? cls.level : '',
        studio_name: studio ? studio.name : '',
        location_code: cls ? cls.location_code || (studio ? studio.location_code : '') : '',
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time || '',
        is_drop_in: cls ? !!cls.is_drop_in : false,
        is_favorite: isFavorite,
        class: cls,
        schedule: s,
        studio
      };
    });
  }

  // getPolicySections(category, appliesToAudience, appliesToClassType)
  getPolicySections(category, appliesToAudience, appliesToClassType) {
    const policies = this._getFromStorage('policy_sections');

    const filtered = policies.filter((p) => {
      if (p.is_active === false) return false;
      if (category && p.category !== category) return false;
      if (appliesToAudience) {
        if (p.applies_to_audience && p.applies_to_audience !== appliesToAudience && p.applies_to_audience !== 'all_ages') {
          return false;
        }
      }
      if (appliesToClassType) {
        if (p.applies_to_class_type && p.applies_to_class_type !== appliesToClassType) return false;
      }
      return true;
    });

    return filtered.map((p) => ({
      policy_section_id: p.id,
      slug: p.slug,
      category: p.category,
      title: p.title,
      content_html: p.content_html,
      applies_to_audience: p.applies_to_audience || null,
      applies_to_class_type: p.applies_to_class_type || null,
      required_notice_hours: p.required_notice_hours != null ? p.required_notice_hours : null,
      policy_section: p
    }));
  }

  // submitContactInquiry(name, email, subject, message, relatedPolicySectionId)
  submitContactInquiry(name, email, subject, message, relatedPolicySectionId) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const id = this._generateId('inq');
    const inquiry = {
      id,
      name,
      email,
      subject,
      message,
      related_policy_section_id: relatedPolicySectionId || null,
      status: 'new',
      created_at: new Date().toISOString()
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      inquiry_id: id,
      status: 'new',
      message: 'Inquiry submitted.'
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events').filter((e) => e.is_active !== false);

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const styles = uniq(events.map((e) => e.style || 'other'));

    const monthsMap = new Map();
    for (const e of events) {
      const d = this._parseDate(e.start_datetime);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthsMap.has(key)) {
        monthsMap.set(key, { month_number: d.getMonth() + 1, year: d.getFullYear() });
      }
    }
    const months = Array.from(monthsMap.values()).map((m) => ({
      month_number: m.month_number,
      label: `${new Date(m.year, m.month_number - 1, 1).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric'
      })}`
    }));

    const day_of_week_options = ['saturday', 'sunday', 'weekends_only'];

    const duration_ranges = [
      { id: '2_hours_plus', label: '2+ hours', min_minutes: 120 }
    ];

    const prices = events.map((e) => e.price).filter((v) => typeof v === 'number');
    const price_range = {
      min_price: prices.length ? Math.min(...prices) : 0,
      max_price: prices.length ? Math.max(...prices) : 0,
      currency: events.length ? events[0].currency || 'USD' : 'USD'
    };

    const sort_options = [
      { id: 'date_earliest_first', label: 'Date: Earliest First' },
      { id: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    return {
      styles,
      months,
      day_of_week_options,
      duration_ranges,
      price_range,
      sort_options
    };
  }

  // searchEvents(month, year, style, weekendsOnly, minDurationMinutes, maxPrice, sortBy)
  searchEvents(month, year, style, weekendsOnly, minDurationMinutes, maxPrice, sortBy) {
    const events = this._getFromStorage('events').filter((e) => e.is_active !== false);
    const studios = this._getFromStorage('studios');

    // Instrumentation for task completion tracking (task_8)
    try {
      const matches =
        month === 7 &&
        weekendsOnly === true &&
        minDurationMinutes != null &&
        minDurationMinutes >= 120 &&
        maxPrice != null &&
        maxPrice <= 60;
      if (matches) {
        const payload = {
          month,
          year,
          style,
          weekendsOnly,
          minDurationMinutes,
          maxPrice,
          sortBy
        };
        localStorage.setItem('task8_eventSearchParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let filtered = events.filter((e) => {
      const d = this._parseDate(e.start_datetime);
      if (!d) return false;
      if (month != null && d.getMonth() + 1 !== month) return false;
      if (year != null && d.getFullYear() !== year) return false;
      if (style && e.style && e.style !== style) return false;
      if (weekendsOnly && e.is_weekend !== true) return false;
      if (minDurationMinutes != null && e.duration_minutes < minDurationMinutes) return false;
      if (maxPrice != null && e.price > maxPrice) return false;
      return true;
    });

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else {
      // default and 'date_earliest_first'
      filtered.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const db = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return da - db;
      });
    }

    return filtered.map((e) => {
      const studio = studios.find((s) => s.id === e.studio_id) || null;
      return {
        event_id: e.id,
        title: e.title,
        style: e.style || 'other',
        studio_name: studio ? studio.name : '',
        location_code: studio ? studio.location_code : '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        duration_minutes: e.duration_minutes,
        price: e.price,
        currency: e.currency,
        day_of_week: e.day_of_week,
        is_weekend: !!e.is_weekend,
        event: e,
        studio
      };
    });
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const studios = this._getFromStorage('studios');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        instructors: [],
        what_to_bring: '',
        prerequisites: ''
      };
    }
    const studio = studios.find((s) => s.id === event.studio_id) || null;

    // No explicit event-instructor relation in data model; return empty list
    const instructors = [];

    return {
      event: {
        id: event.id,
        title: event.title,
        style: event.style || 'other',
        description: event.description || '',
        studio_name: studio ? studio.name : '',
        location_code: studio ? studio.location_code : '',
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        duration_minutes: event.duration_minutes,
        price: event.price,
        currency: event.currency,
        day_of_week: event.day_of_week,
        is_weekend: !!event.is_weekend
      },
      instructors,
      what_to_bring: '',
      prerequisites: ''
    };
  }

  // registerForEvent(eventId, name, email, phone, notes)
  registerForEvent(eventId, name, email, phone, notes) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        registration_id: null,
        status: 'pending',
        message: 'Event not found.'
      };
    }

    const id = this._generateId('evreg');
    const reg = {
      id,
      event_id: eventId,
      name,
      email,
      phone: phone || '',
      status: 'pending',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    regs.push(reg);
    this._saveToStorage('event_registrations', regs);

    return {
      registration_id: id,
      status: 'pending',
      message: 'Event registration submitted.'
    };
  }

  // getGiftCardTemplates()
  getGiftCardTemplates() {
    const templates = this._getFromStorage('gift_card_templates').filter((t) => t.is_active !== false);
    return templates.map((t) => ({
      template_id: t.id,
      name: t.name,
      type: t.type,
      description: t.description || '',
      terms: t.terms || '',
      min_amount: t.min_amount != null ? t.min_amount : null,
      max_amount: t.max_amount != null ? t.max_amount : null,
      preset_amounts: Array.isArray(t.preset_amounts) ? t.preset_amounts : [],
      template: t
    }));
  }

  // createGiftCardPurchaseAndAddToCart(templateId, amount, currency, recipientName, recipientEmail, senderName, senderEmail, message, deliveryTiming, deliveryDate)
  createGiftCardPurchaseAndAddToCart(
    templateId,
    amount,
    currency,
    recipientName,
    recipientEmail,
    senderName,
    senderEmail,
    message,
    deliveryTiming,
    deliveryDate
  ) {
    const templates = this._getFromStorage('gift_card_templates').filter((t) => t.is_active !== false);
    const template = templates.find((t) => t.id === templateId) || null;
    if (!template) {
      return {
        gift_card_purchase_id: null,
        cart_id: null,
        cart_item_id: null,
        total_items: 0,
        subtotal: 0,
        currency: null,
        message: 'Gift card template not found.'
      };
    }

    // enforce basic amount constraints
    if (template.min_amount != null && amount < template.min_amount) {
      amount = template.min_amount;
    }
    if (template.max_amount != null && amount > template.max_amount) {
      amount = template.max_amount;
    }

    const gcps = this._getFromStorage('gift_card_purchases');
    const id = this._generateId('gcp');
    const now = new Date();
    const purchase = {
      id,
      gift_card_template_id: templateId,
      amount,
      currency,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      sender_name: senderName || '',
      sender_email: senderEmail || '',
      message: message || '',
      delivery_timing: deliveryTiming,
      delivery_date: deliveryTiming === 'scheduled' && deliveryDate ? deliveryDate : null,
      status: 'pending',
      created_at: now.toISOString()
    };

    gcps.push(purchase);
    this._saveToStorage('gift_card_purchases', gcps);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cartitem');
    const item = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'gift_card',
      pass_id: null,
      gift_card_purchase_id: id,
      name: `${template.name} - $${amount}`,
      quantity: 1,
      unit_price: amount,
      total_price: amount,
      added_at: now.toISOString()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals();

    return {
      gift_card_purchase_id: id,
      cart_id: cart.id,
      cart_item_id: cartItemId,
      total_items: totals.total_items,
      subtotal: totals.subtotal,
      currency: totals.currency || currency,
      message: 'Gift card added to cart.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const data = localStorage.getItem('about_content');
    if (!data) {
      const about = {
        mission: '',
        history: '',
        teaching_philosophy: '',
        locations: [],
        key_offerings: []
      };
      localStorage.setItem('about_content', JSON.stringify(about));
      return about;
    }
    return JSON.parse(data);
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
