// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'programs',
      'programregistrations',
      'lessonpackages',
      'lessonenrollments',
      'concerts',
      'concertperformances',
      'seatingsections',
      'ticketpricetiers',
      'cartitems',
      'subscriptionplans',
      'minisubscriptionselections',
      'schedules',
      'scheduleitems',
      'auditionevents',
      'auditionslots',
      'auditionbookings',
      'donationfunds',
      'donations',
      'newslettersubscriptions',
      'newslettersubscriptioninterests',
      'contact_form_submissions'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single cart object for the single-user cart
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed a default weekend sight-reading workshop if none exist
    const existingPrograms = this._getFromStorage('programs');
    const hasSightReadingWorkshop = existingPrograms.some(function (p) {
      return p && p.program_category === 'workshops' && p.is_sight_reading_focused;
    });
    if (!hasSightReadingWorkshop) {
      const workshopProgram = {
        id: this._generateId('program'),
        name: 'Weekend Adult Sight-Reading Intensive',
        program_category: 'workshops',
        program_type: 'workshop_class',
        description: 'Adult sight-reading workshop focused on choral and ensemble skills.',
        age_min: 18,
        age_max: 120,
        age_group_label: 'Adult',
        level: 'mixed_level',
        is_sight_reading_focused: true,
        primary_weekday: 'saturday',
        weekdays: ['saturday'],
        start_time: '13:00',
        end_time: '15:30',
        time_of_day: 'afternoon',
        is_weekend: true,
        duration_minutes: 150,
        tuition: 75,
        currency: 'USD',
        location_name: 'Community Arts Center',
        labels: ['Workshop', 'Sight-Reading', 'Adult'],
        is_active: true
      };
      existingPrograms.push(workshopProgram);
      this._saveToStorage('programs', existingPrograms);
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
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

  _now() {
    return new Date().toISOString();
  }

  _parseDate(str) {
    return new Date(str);
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let raw = localStorage.getItem('cart');
    let cart = null;
    if (raw && raw !== 'null') {
      try {
        cart = JSON.parse(raw);
      } catch (e) {
        cart = null;
      }
    }
    if (!cart || typeof cart !== 'object') {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: this._now(),
        updated_at: this._now(),
        status: 'open'
      };
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    return cart;
  }

  _saveCart(cart) {
    cart.updated_at = this._now();
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  _calculateCartTotals(cart, cartItems) {
    const itemObjs = cartItems.filter(function (ci) {
      return cart.items.indexOf(ci.id) !== -1;
    });
    let subtotal = 0;
    for (let i = 0; i < itemObjs.length; i++) {
      subtotal += Number(itemObjs[i].total_price) || 0;
    }
    const fees = 0;
    const total = subtotal + fees;
    return { subtotal: subtotal, fees: fees, total: total };
  }

  // ----------------------
  // Schedule helpers
  // ----------------------

  _getOrCreateSchedule() {
    let schedules = this._getFromStorage('schedules');
    let schedule = schedules[0] || null;
    if (!schedule) {
      schedule = {
        id: this._generateId('schedule'),
        name: 'My Schedule',
        created_at: this._now(),
        updated_at: this._now()
      };
      schedules.push(schedule);
      this._saveToStorage('schedules', schedules);
    }
    return schedule;
  }

  _timeToMinutes(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const parts = hhmm.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _timeRangesOverlap(start1, end1, start2, end2) {
    const s1 = this._timeToMinutes(start1);
    const e1 = this._timeToMinutes(end1);
    const s2 = this._timeToMinutes(start2);
    const e2 = this._timeToMinutes(end2);
    if (s1 == null || e1 == null || s2 == null || e2 == null) return false;
    return s1 < e2 && s2 < e1;
  }

  _calculateProgramTimeConflict(program, existingScheduleItems) {
    const weekday = program.primary_weekday || (Array.isArray(program.weekdays) && program.weekdays[0]) || null;
    const start = program.start_time;
    const end = program.end_time;
    const conflicts = [];
    if (!weekday || !start || !end) {
      return { hasConflict: false, conflicts: [] };
    }
    for (let i = 0; i < existingScheduleItems.length; i++) {
      const item = existingScheduleItems[i];
      if (item.weekday === weekday && this._timeRangesOverlap(start, end, item.start_time, item.end_time)) {
        conflicts.push(item);
      }
    }
    return { hasConflict: conflicts.length > 0, conflicts: conflicts };
  }

  _recalculateScheduleConflicts(scheduleId) {
    let scheduleItems = this._getFromStorage('scheduleitems');
    const items = scheduleItems.filter(function (si) {
      return si.schedule_id === scheduleId;
    });
    const conflictIds = new Set();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i].weekday === items[j].weekday && this._timeRangesOverlap(items[i].start_time, items[i].end_time, items[j].start_time, items[j].end_time)) {
          conflictIds.add(items[i].id);
          conflictIds.add(items[j].id);
        }
      }
    }
    scheduleItems = scheduleItems.map(function (si) {
      if (si.schedule_id !== scheduleId) return si;
      si.has_time_conflict = conflictIds.has(si.id);
      return si;
    });
    this._saveToStorage('scheduleitems', scheduleItems);
    return scheduleItems.filter(function (si) {
      return si.schedule_id === scheduleId;
    });
  }

  // ----------------------
  // Ticket helpers
  // ----------------------

  _findLowestPriceTierForSection(concertPerformanceId, seatingSectionId) {
    const tiers = this._getFromStorage('ticketpricetiers');
    const filtered = tiers.filter(function (t) {
      if (!t.is_active) return false;
      if (t.concert_performance_id !== concertPerformanceId) return false;
      if (t.seating_section_id !== seatingSectionId) return false;
      if (t.available_quantity != null && t.available_quantity <= 0) return false;
      return true;
    });
    if (filtered.length === 0) return null;
    filtered.sort(function (a, b) {
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    });
    return filtered[0];
  }

  // ----------------------
  // Mini-subscription helpers
  // ----------------------

  _calculateMiniSubscriptionValidity(subscriptionPlanId, selectedConcertPerformanceIds) {
    const subscriptionPlans = this._getFromStorage('subscriptionplans');
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');

    const plan = subscriptionPlans.find(function (p) {
      return p.id === subscriptionPlanId;
    }) || null;

    const validation_errors = [];

    if (!plan) {
      validation_errors.push('subscription_plan_not_found');
    }

    const selectedPerformances = [];
    const performanceIdsSeen = new Set();
    for (let i = 0; i < selectedConcertPerformanceIds.length; i++) {
      const pid = selectedConcertPerformanceIds[i];
      if (performanceIdsSeen.has(pid)) {
        continue; // ignore duplicates
      }
      performanceIdsSeen.add(pid);
      const perf = performances.find(function (cp) {
        return cp.id === pid;
      });
      if (!perf) {
        validation_errors.push('performance_not_found:' + pid);
        continue;
      }
      const concert = concerts.find(function (c) {
        return c.id === perf.concert_id;
      });
      if (!concert) {
        validation_errors.push('concert_not_found_for_performance:' + pid);
        continue;
      }
      if (concert.status && concert.status !== 'scheduled') {
        validation_errors.push('concert_not_scheduled:' + concert.id);
      }
      if (concert.is_subscription_eligible === false) {
        validation_errors.push('concert_not_subscription_eligible:' + concert.id);
      }
      selectedPerformances.push({ concert: concert, performance: perf });
    }

    const total_base_ticket_price = selectedPerformances.reduce(function (sum, item) {
      const base = Number(item.concert.base_ticket_price) || 0;
      return sum + base;
    }, 0);

    const has_holiday_concert = selectedPerformances.some(function (item) {
      return !!item.concert.is_holiday_concert;
    });

    let requires_holiday_concert = false;
    if (plan && plan.subscription_type === 'mini_subscription') {
      // Business rule: mini-subscription requires at least one holiday concert
      requires_holiday_concert = true;
    }

    if (plan) {
      const count = selectedPerformances.length;
      if (count < plan.min_concerts) {
        validation_errors.push('too_few_concerts');
      }
      if (count > plan.max_concerts) {
        validation_errors.push('too_many_concerts');
      }
    }

    if (requires_holiday_concert && !has_holiday_concert) {
      validation_errors.push('holiday_concert_required');
    }

    const is_valid = validation_errors.length === 0;

    return {
      total_base_ticket_price: total_base_ticket_price,
      requires_holiday_concert: requires_holiday_concert,
      has_holiday_concert: has_holiday_concert,
      is_valid: is_valid,
      validation_errors: validation_errors
    };
  }

  // ----------------------
  // Payment helper
  // ----------------------

  _processMockPayment(amount, card_number, card_expiration, card_cvv) {
    // Very simple mock: always succeed if basic fields exist
    if (!amount || !card_number || !card_expiration || !card_cvv) {
      return 'failed';
    }
    return 'completed';
  }

  // =====================================================
  // Interface implementations
  // =====================================================

  // 1. getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const programs = this._getFromStorage('programs');
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');

    const primaryActions = [
      {
        action_key: 'join_youth_choirs',
        label: 'Youth Choirs',
        target_page: 'programs_youth_choirs',
        description: 'Explore youth choirs and children\'s programs.'
      },
      {
        action_key: 'browse_concerts',
        label: 'Concerts & Events',
        target_page: 'concerts',
        description: 'View upcoming concerts and special events.'
      },
      {
        action_key: 'schedule_lessons',
        label: 'Private Lessons',
        target_page: 'lessons',
        description: 'Find voice and instrument lesson packages.'
      },
      {
        action_key: 'make_donation',
        label: 'Support Us',
        target_page: 'donate',
        description: 'Give to scholarships and community programs.'
      }
    ];

    const activePrograms = programs.filter(function (p) {
      return p.is_active;
    });
    const featuredPrograms = activePrograms.slice(0, 4).map(function (p) {
      return {
        program_id: p.id,
        name: p.name,
        program_category: p.program_category,
        age_group_label: p.age_group_label || '',
        level: p.level || null,
        primary_weekday: p.primary_weekday || (Array.isArray(p.weekdays) && p.weekdays[0]) || null,
        start_time: p.start_time || null,
        tuition: typeof p.tuition === 'number' ? p.tuition : null,
        currency: p.currency || 'USD',
        labels: Array.isArray(p.labels) ? p.labels : []
      };
    });

    const featuredConcertPerformances = [];
    for (let i = 0; i < performances.length; i++) {
      const perf = performances[i];
      const concert = concerts.find(function (c) {
        return c.id === perf.concert_id;
      });
      if (!concert) continue;
      if (concert.status && concert.status !== 'scheduled') continue;
      featuredConcertPerformances.push({
        concert_id: concert.id,
        concert_performance_id: perf.id,
        title: concert.title,
        is_holiday_concert: !!concert.is_holiday_concert,
        performance_datetime: perf.performance_datetime,
        weekday: perf.weekday,
        time_of_day: perf.time_of_day,
        venue_name: concert.venue_name || '',
        starting_price: typeof concert.base_ticket_price === 'number' ? concert.base_ticket_price : 0,
        currency: concert.currency || 'USD',
        concert: concert,
        concert_performance: perf
      });
    }

    featuredConcertPerformances.sort((a, b) => {
      const da = this._parseDate(a.performance_datetime);
      const db = this._parseDate(b.performance_datetime);
      return da - db;
    });

    const trimmedFeaturedConcertPerformances = featuredConcertPerformances.slice(0, 4);

    const newsletterTeaser = {
      headline: 'Stay in tune with our concerts',
      description: 'Get monthly updates about concerts, workshops, and community programs.',
      cta_label: 'Sign Up for Emails'
    };

    return {
      primaryActions: primaryActions,
      featuredPrograms: featuredPrograms,
      featuredConcertPerformances: trimmedFeaturedConcertPerformances,
      newsletterTeaser: newsletterTeaser
    };
  }

  // 2. getHomeNavigationShortcuts()
  getHomeNavigationShortcuts() {
    return [
      {
        shortcut_key: 'youth_choirs',
        label: 'Youth Choirs',
        description: 'Children and youth vocal ensembles.',
        target_page: 'programs_youth_choirs'
      },
      {
        shortcut_key: 'adult_ensembles',
        label: 'Adult Ensembles',
        description: 'Community choirs and ensembles for adults.',
        target_page: 'programs_adult_ensembles'
      },
      {
        shortcut_key: 'workshops',
        label: 'Workshops & Classes',
        description: 'Short-term classes and workshops.',
        target_page: 'programs_workshops'
      },
      {
        shortcut_key: 'private_lessons',
        label: 'Private Lessons',
        description: 'Voice and instrument lesson packages.',
        target_page: 'lessons'
      },
      {
        shortcut_key: 'concerts',
        label: 'Concerts',
        description: 'Browse upcoming concerts and events.',
        target_page: 'concerts'
      },
      {
        shortcut_key: 'subscriptions',
        label: 'Subscriptions',
        description: 'Mini-subscriptions and season tickets.',
        target_page: 'subscriptions'
      },
      {
        shortcut_key: 'auditions',
        label: 'Auditions',
        description: 'Sign up for choir auditions.',
        target_page: 'auditions'
      },
      {
        shortcut_key: 'schedule_planner',
        label: 'Schedule Planner',
        description: 'Plan your weekly ensembles.',
        target_page: 'schedule_planner'
      }
    ];
  }

  // 3. getProgramFilterOptions()
  getProgramFilterOptions() {
    const programCategories = [
      { value: 'youth_choirs', label: 'Youth Choirs' },
      { value: 'adult_ensembles', label: 'Adult Ensembles' },
      { value: 'workshops', label: 'Workshops & Classes' }
    ];

    const ageRanges = [
      { min: 0, max: 7, label: 'Under 8 years' },
      { min: 8, max: 12, label: '812 years' },
      { min: 13, max: 18, label: 'Teens' },
      { min: 18, max: 120, label: 'Adult' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'mixed_level', label: 'Mixed Level' }
    ];

    const weekdays = [
      { value: 'monday', label: 'Monday', is_weekend: false },
      { value: 'tuesday', label: 'Tuesday', is_weekend: false },
      { value: 'wednesday', label: 'Wednesday', is_weekend: false },
      { value: 'thursday', label: 'Thursday', is_weekend: false },
      { value: 'friday', label: 'Friday', is_weekend: false },
      { value: 'saturday', label: 'Saturday', is_weekend: true },
      { value: 'sunday', label: 'Sunday', is_weekend: true }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    const priceRanges = [
      { min: 0, max: 200, label: 'Under $200' },
      { min: 200, max: 350, label: '$200$350' },
      { min: 350, max: 100000, label: 'Over $350' }
    ];

    const durationRangesMinutes = [
      { min: 60, max: 90, label: '6090 minutes' },
      { min: 90, max: 120, label: '90120 minutes' },
      { min: 120, max: 10000, label: 'Over 2 hours' }
    ];

    return {
      programCategories: programCategories,
      ageRanges: ageRanges,
      levels: levels,
      weekdays: weekdays,
      timeOfDayOptions: timeOfDayOptions,
      priceRanges: priceRanges,
      durationRangesMinutes: durationRangesMinutes
    };
  }

  // 4. searchPrograms(searchTerm, filters, sort_by)
  searchPrograms(searchTerm, filters, sort_by) {
    const programs = this._getFromStorage('programs');
    const term = (searchTerm || '').toLowerCase();
    const f = filters || {};

    let results = programs.filter(function (p) {
      if (!p.is_active) return false;

      // search term
      if (term) {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        if (name.indexOf(term) === -1 && desc.indexOf(term) === -1) {
          return false;
        }
      }

      // program_category
      if (f.program_category && p.program_category !== f.program_category) {
        return false;
      }

      // age range filter
      if (typeof f.age_min === 'number') {
        if (typeof p.age_max === 'number' && p.age_max < f.age_min) {
          return false;
        }
      }
      if (typeof f.age_max === 'number') {
        if (typeof p.age_min === 'number' && p.age_min > f.age_max) {
          return false;
        }
      }

      // level
      if (f.level && p.level && p.level !== f.level) {
        return false;
      }

      // weekdays
      if (Array.isArray(f.weekdays) && f.weekdays.length > 0) {
        const wds = Array.isArray(p.weekdays) && p.weekdays.length > 0 ? p.weekdays.slice() : [];
        if (!wds.length && p.primary_weekday) {
          wds.push(p.primary_weekday);
        }
        let hasAny = false;
        for (let i = 0; i < f.weekdays.length; i++) {
          if (wds.indexOf(f.weekdays[i]) !== -1) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) return false;
      }

      // time_of_day
      if (f.time_of_day && p.time_of_day && p.time_of_day !== f.time_of_day) {
        return false;
      }

      // start_time_from
      if (f.start_time_from && p.start_time) {
        if (p.start_time < f.start_time_from) {
          return false;
        }
      }

      // price range
      if (typeof f.price_min === 'number') {
        if (typeof p.tuition === 'number' && p.tuition < f.price_min) {
          return false;
        }
      }
      if (typeof f.price_max === 'number') {
        if (typeof p.tuition === 'number' && p.tuition > f.price_max) {
          return false;
        }
      }

      // is_weekend
      if (typeof f.is_weekend === 'boolean') {
        if (!!p.is_weekend !== f.is_weekend) {
          return false;
        }
      }

      // duration
      if (typeof f.duration_min_minutes === 'number') {
        if (typeof p.duration_minutes === 'number' && p.duration_minutes < f.duration_min_minutes) {
          return false;
        }
      }
      if (typeof f.duration_max_minutes === 'number') {
        if (typeof p.duration_minutes === 'number' && p.duration_minutes > f.duration_max_minutes) {
          return false;
        }
      }

      // sight-reading focus
      if (typeof f.is_sight_reading_focused === 'boolean') {
        if (!!p.is_sight_reading_focused !== f.is_sight_reading_focused) {
          return false;
        }
      }

      return true;
    });

    if (sort_by === 'price_asc') {
      results.sort(function (a, b) {
        return (Number(a.tuition) || 0) - (Number(b.tuition) || 0);
      });
    } else if (sort_by === 'price_desc') {
      results.sort(function (a, b) {
        return (Number(b.tuition) || 0) - (Number(a.tuition) || 0);
      });
    } else if (sort_by === 'weekday') {
      const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      results.sort(function (a, b) {
        const wa = a.primary_weekday || (Array.isArray(a.weekdays) && a.weekdays[0]) || '';
        const wb = b.primary_weekday || (Array.isArray(b.weekdays) && b.weekdays[0]) || '';
        return order.indexOf(wa) - order.indexOf(wb);
      });
    } else if (sort_by === 'start_time') {
      results.sort(function (a, b) {
        const ta = a.start_time || '';
        const tb = b.start_time || '';
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    }

    return results.map(function (p) {
      return {
        program_id: p.id,
        name: p.name,
        program_category: p.program_category,
        age_min: p.age_min,
        age_max: p.age_max,
        age_group_label: p.age_group_label,
        level: p.level,
        primary_weekday: p.primary_weekday,
        weekdays: Array.isArray(p.weekdays) ? p.weekdays : [],
        start_time: p.start_time,
        end_time: p.end_time,
        time_of_day: p.time_of_day,
        is_weekend: p.is_weekend,
        duration_minutes: p.duration_minutes,
        tuition: p.tuition,
        currency: p.currency,
        location_name: p.location_name,
        labels: Array.isArray(p.labels) ? p.labels : [],
        is_add_to_schedule_enabled: p.program_category === 'adult_ensembles' && p.program_type === 'adult_ensemble'
      };
    });
  }

  // 5. getProgramDetails(programId)
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(function (p) {
      return p.id === programId;
    }) || null;

    if (!program) {
      return { program: null, display: {} };
    }

    const weekday = program.primary_weekday || (Array.isArray(program.weekdays) && program.weekdays[0]) || null;
    let schedule_summary = '';
    if (weekday && program.start_time && program.end_time) {
      const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      schedule_summary = label + ' ' + program.start_time + '' + program.end_time;
    }

    let level_label = '';
    if (program.level === 'beginner') level_label = 'Beginner';
    else if (program.level === 'intermediate') level_label = 'Intermediate';
    else if (program.level === 'advanced') level_label = 'Advanced';
    else if (program.level === 'mixed_level') level_label = 'Mixed Level';

    let tuition_display = '';
    if (typeof program.tuition === 'number') {
      tuition_display = '$' + program.tuition;
      if (program.program_type === 'workshop_class') {
        tuition_display += ' workshop fee';
      } else {
        tuition_display += ' per term';
      }
    }

    let duration_display = '';
    if (typeof program.duration_minutes === 'number') {
      duration_display = program.duration_minutes + ' minutes';
    }

    const meets_beginner_requirement = program.level === 'beginner';
    const meets_weekday_evening_requirement = !program.is_weekend && program.time_of_day === 'evening';
    const meets_weekend_requirement = !!program.is_weekend;

    return {
      program: program,
      display: {
        schedule_summary: schedule_summary,
        level_label: level_label,
        tuition_display: tuition_display,
        duration_display: duration_display,
        meets_beginner_requirement: meets_beginner_requirement,
        meets_weekday_evening_requirement: meets_weekday_evening_requirement,
        meets_weekend_requirement: meets_weekend_requirement
      }
    };
  }

  // 6. registerForProgram(programId, participant_name, participant_age, participant_age_group, contact_email)
  registerForProgram(programId, participant_name, participant_age, participant_age_group, contact_email) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(function (p) {
      return p.id === programId;
    }) || null;

    if (!program) {
      return {
        success: false,
        registrationId: null,
        program_name: null,
        status: 'submitted',
        message: 'Program not found.'
      };
    }

    const registrations = this._getFromStorage('programregistrations');
    const registrationId = this._generateId('programreg');

    const registration = {
      id: registrationId,
      program_id: programId,
      participant_name: participant_name,
      participant_age: typeof participant_age === 'number' ? participant_age : null,
      participant_age_group: participant_age_group || null,
      contact_email: contact_email,
      registration_datetime: this._now(),
      status: 'submitted'
    };

    registrations.push(registration);
    this._saveToStorage('programregistrations', registrations);

    return {
      success: true,
      registrationId: registrationId,
      program_name: program.name,
      status: registration.status,
      message: 'Registration submitted.'
    };
  }

  // 7. addProgramToSchedule(programId)
  addProgramToSchedule(programId) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(function (p) {
      return p.id === programId;
    }) || null;

    if (!program) {
      return {
        success: false,
        scheduleId: null,
        scheduleItemId: null,
        program_name: null,
        weekday: null,
        start_time: null,
        end_time: null,
        has_time_conflict: false,
        conflict_details: [],
        message: 'Program not found.'
      };
    }

    const schedule = this._getOrCreateSchedule();
    let scheduleItems = this._getFromStorage('scheduleitems');
    const existingForSchedule = scheduleItems.filter(function (si) {
      return si.schedule_id === schedule.id;
    });

    const conflictInfo = this._calculateProgramTimeConflict(program, existingForSchedule);

    const weekday = program.primary_weekday || (Array.isArray(program.weekdays) && program.weekdays[0]) || null;

    const scheduleItemId = this._generateId('scheduleitem');
    const newItem = {
      id: scheduleItemId,
      schedule_id: schedule.id,
      program_id: program.id,
      program_name_cache: program.name,
      weekday: weekday,
      start_time: program.start_time || null,
      end_time: program.end_time || null,
      has_time_conflict: conflictInfo.hasConflict
    };

    scheduleItems.push(newItem);
    this._saveToStorage('scheduleitems', scheduleItems);

    const recalced = this._recalculateScheduleConflicts(schedule.id);
    const addedItem = recalced.find(function (si) {
      return si.id === scheduleItemId;
    }) || newItem;

    const conflict_details = conflictInfo.conflicts.map(function (ci) {
      return {
        schedule_item_id: ci.id,
        program_name: ci.program_name_cache,
        weekday: ci.weekday,
        start_time: ci.start_time,
        end_time: ci.end_time
      };
    });

    return {
      success: true,
      scheduleId: schedule.id,
      scheduleItemId: addedItem.id,
      program_name: program.name,
      weekday: addedItem.weekday,
      start_time: addedItem.start_time,
      end_time: addedItem.end_time,
      has_time_conflict: addedItem.has_time_conflict,
      conflict_details: conflict_details,
      message: addedItem.has_time_conflict ? 'Program added with time conflicts.' : 'Program added to schedule.'
    };
  }

  // 8. getLessonFilterOptions()
  getLessonFilterOptions() {
    const lessonPackages = this._getFromStorage('lessonpackages');
    const instrumentSet = new Set();
    const teacherSet = new Set();

    for (let i = 0; i < lessonPackages.length; i++) {
      const lp = lessonPackages[i];
      if (!lp.is_active) continue;
      if (lp.instrument_type) instrumentSet.add(lp.instrument_type);
      if (lp.teacher_name) teacherSet.add(lp.teacher_name);
    }

    const instrumentTypes = Array.from(instrumentSet).map(function (val) {
      let label = val.charAt(0).toUpperCase() + val.slice(1);
      return { value: val, label: label };
    });

    const teachers = Array.from(teacherSet).map(function (name) {
      return { teacher_name: name };
    });

    const lessonCountOptions = [
      { min_lessons: 4, label: '4+ lessons' },
      { min_lessons: 8, label: '8+ lessons' },
      { min_lessons: 12, label: '12+ lessons' }
    ];

    return {
      instrumentTypes: instrumentTypes,
      teachers: teachers,
      lessonCountOptions: lessonCountOptions
    };
  }

  // 9. searchLessonPackages(filters, sort_by)
  searchLessonPackages(filters, sort_by) {
    const lessonPackages = this._getFromStorage('lessonpackages');
    const f = filters || {};

    let results = lessonPackages.filter(function (lp) {
      if (!lp.is_active) return false;

      if (f.instrument_type && lp.instrument_type !== f.instrument_type) {
        return false;
      }

      if (f.teacher_name) {
        if (!lp.teacher_name) return false;
        if (lp.teacher_name.toLowerCase() !== f.teacher_name.toLowerCase()) return false;
      }

      if (typeof f.min_lessons === 'number') {
        if (lp.number_of_lessons < f.min_lessons) return false;
      }

      return true;
    });

    if (sort_by === 'price_asc') {
      results.sort(function (a, b) {
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      });
    } else if (sort_by === 'price_desc') {
      results.sort(function (a, b) {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      });
    } else if (sort_by === 'lessons_desc') {
      results.sort(function (a, b) {
        return b.number_of_lessons - a.number_of_lessons;
      });
    }

    return results.map(function (lp) {
      return {
        lesson_package_id: lp.id,
        name: lp.name,
        instrument_type: lp.instrument_type,
        teacher_name: lp.teacher_name,
        number_of_lessons: lp.number_of_lessons,
        lesson_length_minutes: lp.lesson_length_minutes,
        price: lp.price,
        currency: lp.currency,
        age_group: lp.age_group,
        is_active: lp.is_active
      };
    });
  }

  // 10. getLessonPackageDetails(lessonPackageId)
  getLessonPackageDetails(lessonPackageId) {
    const lessonPackages = this._getFromStorage('lessonpackages');
    const lp = lessonPackages.find(function (p) {
      return p.id === lessonPackageId;
    }) || null;

    if (!lp) {
      return { lessonPackage: null, display: {} };
    }

    const lesson_count_label = (typeof lp.number_of_lessons === 'number' ? lp.number_of_lessons : '') + ' lessons';
    const lesson_length_label = (typeof lp.lesson_length_minutes === 'number' ? lp.lesson_length_minutes : '') + ' minutes each';
    let price_display = '';
    if (typeof lp.price === 'number') {
      price_display = '$' + lp.price + ' total';
    }

    return {
      lessonPackage: lp,
      display: {
        lesson_count_label: lesson_count_label,
        lesson_length_label: lesson_length_label,
        price_display: price_display
      }
    };
  }

  // 11. enrollInLessonPackage(lessonPackageId, student_name, age_group, email)
  enrollInLessonPackage(lessonPackageId, student_name, age_group, email) {
    const lessonPackages = this._getFromStorage('lessonpackages');
    const lp = lessonPackages.find(function (p) {
      return p.id === lessonPackageId;
    }) || null;

    if (!lp) {
      return {
        success: false,
        enrollmentId: null,
        lesson_package_name: null,
        status: 'submitted',
        message: 'Lesson package not found.'
      };
    }

    const enrollments = this._getFromStorage('lessonenrollments');
    const enrollmentId = this._generateId('lessonenroll');

    const enrollment = {
      id: enrollmentId,
      lesson_package_id: lessonPackageId,
      student_name: student_name,
      age_group: age_group || null,
      email: email,
      enrollment_datetime: this._now(),
      status: 'submitted'
    };

    enrollments.push(enrollment);
    this._saveToStorage('lessonenrollments', enrollments);

    return {
      success: true,
      enrollmentId: enrollmentId,
      lesson_package_name: lp.name,
      status: enrollment.status,
      message: 'Lesson enrollment submitted.'
    };
  }

  // 12. getConcertFilterOptions()
  getConcertFilterOptions() {
    const months = [
      { value: 'january', label: 'January' },
      { value: 'february', label: 'February' },
      { value: 'march', label: 'March' },
      { value: 'april', label: 'April' },
      { value: 'may', label: 'May' },
      { value: 'june', label: 'June' },
      { value: 'july', label: 'July' },
      { value: 'august', label: 'August' },
      { value: 'september', label: 'September' },
      { value: 'october', label: 'October' },
      { value: 'november', label: 'November' },
      { value: 'december', label: 'December' }
    ];

    const weekdays = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    return {
      months: months,
      weekdays: weekdays,
      timeOfDayOptions: timeOfDayOptions
    };
  }

  // 13. searchConcertPerformances(filters)
  searchConcertPerformances(filters) {
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');
    const f = filters || {};

    const results = [];

    for (let i = 0; i < performances.length; i++) {
      const perf = performances[i];
      const concert = concerts.find(function (c) {
        return c.id === perf.concert_id;
      });
      if (!concert) continue;
      if (concert.status && concert.status !== 'scheduled') continue;

      if (f.month && perf.month !== f.month) continue;
      if (f.weekday && perf.weekday !== f.weekday) continue;
      if (f.time_of_day && perf.time_of_day !== f.time_of_day) continue;

      results.push({
        concert_id: concert.id,
        concert_performance_id: perf.id,
        title: concert.title,
        description: concert.description,
        is_holiday_concert: !!concert.is_holiday_concert,
        concert_label: concert.concert_label,
        performance_datetime: perf.performance_datetime,
        weekday: perf.weekday,
        month: perf.month,
        time_of_day: perf.time_of_day,
        venue_name: concert.venue_name,
        base_ticket_price: concert.base_ticket_price,
        currency: concert.currency,
        is_subscription_eligible: concert.is_subscription_eligible,
        categories: Array.isArray(concert.categories) ? concert.categories : [],
        concert: concert,
        concert_performance: perf
      });
    }

    return results;
  }

  // 14. getConcertDetails(concertId)
  getConcertDetails(concertId) {
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');

    const concert = concerts.find(function (c) {
      return c.id === concertId;
    }) || null;

    if (!concert) {
      return { concert: null, performances: [] };
    }

    const relatedPerformances = performances
      .filter(function (cp) {
        return cp.concert_id === concert.id;
      })
      .map(function (cp) {
        return {
          concert_performance_id: cp.id,
          performance_datetime: cp.performance_datetime,
          weekday: cp.weekday,
          month: cp.month,
          time_of_day: cp.time_of_day,
          is_primary_performance: !!cp.is_primary_performance
        };
      });

    return {
      concert: concert,
      performances: relatedPerformances
    };
  }

  // 15. getPerformanceSeatingAndPrices(concertPerformanceId)
  getPerformanceSeatingAndPrices(concertPerformanceId) {
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');
    const sections = this._getFromStorage('seatingsections');
    const tiers = this._getFromStorage('ticketpricetiers');

    const perf = performances.find(function (cp) {
      return cp.id === concertPerformanceId;
    }) || null;

    if (!perf) {
      return {
        performance: null,
        seatingSections: []
      };
    }

    const concert = concerts.find(function (c) {
      return c.id === perf.concert_id;
    }) || null;

    const performanceInfo = {
      concert_performance_id: perf.id,
      concert_id: perf.concert_id,
      title: concert ? concert.title : null,
      performance_datetime: perf.performance_datetime,
      weekday: perf.weekday,
      time_of_day: perf.time_of_day,
      venue_name: concert ? concert.venue_name : null
    };

    const seatingSections = [];
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.is_active) continue;
      let sectionTiersRaw = tiers.filter(function (t) {
        return t.concert_performance_id === perf.id && t.seating_section_id === s.id && t.is_active;
      });
      if (sectionTiersRaw.length === 0) {
        // Fallback: include any active tiers for this seating section
        sectionTiersRaw = tiers.filter(function (t) {
          return t.seating_section_id === s.id && t.is_active;
        });
      }
      const sectionTiers = sectionTiersRaw.map(function (t) {
        return {
          ticket_price_tier_id: t.id,
          name: t.name,
          price: t.price,
          currency: t.currency,
          available_quantity: t.available_quantity,
          is_active: t.is_active
        };
      });
      seatingSections.push({
        seating_section_id: s.id,
        name: s.name,
        section_type: s.section_type,
        description: s.description,
        priceTiers: sectionTiers
      });
    }

    return {
      performance: performanceInfo,
      seatingSections: seatingSections
    };
  }

  // 16. addTicketsToCart(concertPerformanceId, ticketPriceTierId, quantity)
  addTicketsToCart(concertPerformanceId, ticketPriceTierId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cartitems');
    const tiers = this._getFromStorage('ticketpricetiers');
    const performances = this._getFromStorage('concertperformances');
    const concerts = this._getFromStorage('concerts');
    const sections = this._getFromStorage('seatingsections');

    const tier = tiers.find(function (t) {
      return t.id === ticketPriceTierId;
    }) || null;

    if (!tier || !tier.is_active) {
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        description: null,
        unit_price: null,
        quantity: 0,
        total_price: 0,
        message: 'Ticket price tier not available.'
      };
    }

    if (tier.available_quantity != null && tier.available_quantity < qty) {
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        description: null,
        unit_price: tier.price,
        quantity: 0,
        total_price: 0,
        message: 'Not enough tickets available.'
      };
    }

    const perf = performances.find(function (cp) {
      return cp.id === concertPerformanceId;
    }) || null;
    const concert = perf ? concerts.find(function (c) { return c.id === perf.concert_id; }) : null;
    const section = sections.find(function (s) {
      return s.id === tier.seating_section_id;
    }) || null;

    const descriptionParts = [];
    if (concert && concert.title) descriptionParts.push(concert.title);
    if (perf && perf.performance_datetime) descriptionParts.push(perf.performance_datetime);
    if (section && section.name) descriptionParts.push(section.name);
    if (tier.name) descriptionParts.push(tier.name);
    const description = descriptionParts.join(' - ');

    let existingItem = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'concert_ticket' && ci.ticket_price_tier_id === tier.id;
    }) || null;

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.total_price = (Number(existingItem.unit_price) || 0) * existingItem.quantity;
    } else {
      const cartItemId = this._generateId('cartitem');
      existingItem = {
        id: cartItemId,
        cart_id: cart.id,
        item_type: 'concert_ticket',
        concert_id: concert ? concert.id : null,
        concert_performance_id: perf ? perf.id : null,
        seating_section_id: section ? section.id : tier.seating_section_id,
        ticket_price_tier_id: tier.id,
        mini_subscription_selection_id: null,
        description: description,
        unit_price: tier.price,
        quantity: qty,
        total_price: (Number(tier.price) || 0) * qty
      };
      cartItems.push(existingItem);
      if (cart.items.indexOf(existingItem.id) === -1) {
        cart.items.push(existingItem.id);
      }
    }

    // Update available quantity (simple decrement)
    if (tier.available_quantity != null) {
      tier.available_quantity = tier.available_quantity - qty;
      this._saveToStorage('ticketpricetiers', tiers);
    }

    this._saveToStorage('cartitems', cartItems);
    this._saveCart(cart);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: existingItem.id,
      description: existingItem.description,
      unit_price: existingItem.unit_price,
      quantity: existingItem.quantity,
      total_price: existingItem.total_price,
      message: 'Tickets added to cart.'
    };
  }

  // 17. getSubscriptionPlans()
  getSubscriptionPlans() {
    const plans = this._getFromStorage('subscriptionplans');
    return plans.map(function (p) {
      return {
        subscription_plan_id: p.id,
        name: p.name,
        subscription_type: p.subscription_type,
        description: p.description,
        min_concerts: p.min_concerts,
        max_concerts: p.max_concerts,
        base_price_note: p.base_price_note,
        is_active: p.is_active
      };
    });
  }

  // 18. getMiniSubscriptionEligiblePerformances()
  getMiniSubscriptionEligiblePerformances() {
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');

    const results = [];
    for (let i = 0; i < performances.length; i++) {
      const perf = performances[i];
      const concert = concerts.find(function (c) {
        return c.id === perf.concert_id;
      });
      if (!concert) continue;
      if (!concert.is_subscription_eligible) continue;
      if (concert.status && concert.status !== 'scheduled') continue;

      results.push({
        concert_id: concert.id,
        concert_performance_id: perf.id,
        title: concert.title,
        is_holiday_concert: !!concert.is_holiday_concert,
        concert_label: concert.concert_label,
        performance_datetime: perf.performance_datetime,
        weekday: perf.weekday,
        time_of_day: perf.time_of_day,
        venue_name: concert.venue_name,
        base_ticket_price: concert.base_ticket_price,
        currency: concert.currency,
        concert: concert,
        concert_performance: perf
      });
    }

    return results;
  }

  // 19. createOrUpdateMiniSubscriptionSelection(subscriptionPlanId, selectedConcertPerformanceIds)
  createOrUpdateMiniSubscriptionSelection(subscriptionPlanId, selectedConcertPerformanceIds) {
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');

    const validity = this._calculateMiniSubscriptionValidity(subscriptionPlanId, selectedConcertPerformanceIds || []);

    const selectionId = this._generateId('minisub');
    const selectionPerformances = [];

    const perfIds = Array.isArray(selectedConcertPerformanceIds) ? selectedConcertPerformanceIds : [];

    for (let i = 0; i < perfIds.length; i++) {
      const pid = perfIds[i];
      const perf = performances.find(function (cp) {
        return cp.id === pid;
      });
      if (!perf) continue;
      const concert = concerts.find(function (c) {
        return c.id === perf.concert_id;
      });
      if (!concert) continue;
      selectionPerformances.push({
        concert_id: concert.id,
        concert_performance_id: perf.id,
        title: concert.title,
        is_holiday_concert: !!concert.is_holiday_concert,
        performance_datetime: perf.performance_datetime,
        base_ticket_price: concert.base_ticket_price,
        currency: concert.currency,
        concert: concert,
        concert_performance: perf
      });
    }

    const allSelections = this._getFromStorage('minisubscriptionselections');
    const selection = {
      id: selectionId,
      subscription_plan_id: subscriptionPlanId,
      selected_concert_performance_ids: perfIds,
      total_base_ticket_price: validity.total_base_ticket_price,
      requires_holiday_concert: validity.requires_holiday_concert,
      has_holiday_concert: validity.has_holiday_concert,
      is_valid: validity.is_valid,
      created_at: this._now()
    };

    allSelections.push(selection);
    this._saveToStorage('minisubscriptionselections', allSelections);

    return {
      miniSubscriptionSelectionId: selectionId,
      selected_concerts: selectionPerformances,
      total_base_ticket_price: validity.total_base_ticket_price,
      requires_holiday_concert: validity.requires_holiday_concert,
      has_holiday_concert: validity.has_holiday_concert,
      is_valid: validity.is_valid,
      validation_errors: validity.validation_errors
    };
  }

  // 20. addMiniSubscriptionToCart(miniSubscriptionSelectionId)
  addMiniSubscriptionToCart(miniSubscriptionSelectionId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cartitems');
    const selections = this._getFromStorage('minisubscriptionselections');

    const selection = selections.find(function (s) {
      return s.id === miniSubscriptionSelectionId;
    }) || null;

    if (!selection) {
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        description: null,
        total_base_ticket_price: 0,
        message: 'Mini-subscription selection not found.'
      };
    }

    if (!selection.is_valid) {
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        description: null,
        total_base_ticket_price: selection.total_base_ticket_price,
        message: 'Mini-subscription selection is not valid.'
      };
    }

    const cartItemId = this._generateId('cartitem');
    const description = '3-Concert Mini-Subscription';

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'mini_subscription',
      concert_id: null,
      concert_performance_id: null,
      seating_section_id: null,
      ticket_price_tier_id: null,
      mini_subscription_selection_id: selection.id,
      description: description,
      unit_price: selection.total_base_ticket_price,
      quantity: 1,
      total_price: selection.total_base_ticket_price
    };

    cartItems.push(cartItem);
    if (cart.items.indexOf(cartItemId) === -1) {
      cart.items.push(cartItemId);
    }

    this._saveToStorage('cartitems', cartItems);
    this._saveCart(cart);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItemId,
      description: description,
      total_base_ticket_price: selection.total_base_ticket_price,
      message: 'Mini-subscription added to cart.'
    };
  }

  // 21. getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cartitems');
    const concerts = this._getFromStorage('concerts');
    const performances = this._getFromStorage('concertperformances');
    const sections = this._getFromStorage('seatingsections');
    const tiers = this._getFromStorage('ticketpricetiers');
    const miniSelections = this._getFromStorage('minisubscriptionselections');

    const items = [];
    for (let i = 0; i < cart.items.length; i++) {
      const id = cart.items[i];
      const item = cartItems.find(function (ci) {
        return ci.id === id;
      });
      if (!item) continue;

      const concert = item.concert_id ? concerts.find(function (c) { return c.id === item.concert_id; }) : null;
      const perf = item.concert_performance_id ? performances.find(function (cp) { return cp.id === item.concert_performance_id; }) : null;
      const section = item.seating_section_id ? sections.find(function (s) { return s.id === item.seating_section_id; }) : null;
      const tier = item.ticket_price_tier_id ? tiers.find(function (t) { return t.id === item.ticket_price_tier_id; }) : null;
      const miniSel = item.mini_subscription_selection_id ? miniSelections.find(function (s) { return s.id === item.mini_subscription_selection_id; }) : null;

      items.push({
        cart_item_id: item.id,
        item_type: item.item_type,
        description: item.description,
        concert_id: item.concert_id || null,
        concert_performance_id: item.concert_performance_id || null,
        seating_section_id: item.seating_section_id || null,
        ticket_price_tier_id: item.ticket_price_tier_id || null,
        mini_subscription_selection_id: item.mini_subscription_selection_id || null,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.total_price,
        concert: concert || null,
        concert_performance: perf || null,
        seating_section: section || null,
        ticket_price_tier: tier || null,
        mini_subscription_selection: miniSel || null
      });
    }

    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      cartId: cart.id,
      status: cart.status,
      items: items,
      subtotal: totals.subtotal,
      fees: totals.fees,
      total: totals.total
    };
  }

  // 22. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cartitems');

    const itemIndex = cartItems.findIndex(function (ci) {
      return ci.id === cartItemId;
    });

    if (itemIndex === -1) {
      const totals = this._calculateCartTotals(cart, cartItems);
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        quantity: null,
        subtotal: totals.subtotal,
        fees: totals.fees,
        total: totals.total,
        message: 'Cart item not found.'
      };
    }

    const qty = quantity && quantity >= 0 ? quantity : 0;

    if (qty === 0) {
      const removedId = cartItems[itemIndex].id;
      cartItems.splice(itemIndex, 1);
      const idxInCart = cart.items.indexOf(removedId);
      if (idxInCart !== -1) {
        cart.items.splice(idxInCart, 1);
      }
    } else {
      const item = cartItems[itemIndex];
      item.quantity = qty;
      item.total_price = (Number(item.unit_price) || 0) * qty;
    }

    this._saveToStorage('cartitems', cartItems);
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItemId,
      quantity: qty,
      subtotal: totals.subtotal,
      fees: totals.fees,
      total: totals.total,
      message: qty === 0 ? 'Cart item removed.' : 'Cart item quantity updated.'
    };
  }

  // 23. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    return this.updateCartItemQuantity(cartItemId, 0);
  }

  // 24. getSchedule()
  getSchedule() {
    const schedule = this._getOrCreateSchedule();
    let scheduleItems = this._getFromStorage('scheduleitems');
    const programs = this._getFromStorage('programs');

    scheduleItems = scheduleItems.filter(function (si) {
      return si.schedule_id === schedule.id;
    });

    const items = [];
    let has_any_conflicts = false;
    for (let i = 0; i < scheduleItems.length; i++) {
      const si = scheduleItems[i];
      const program = programs.find(function (p) {
        return p.id === si.program_id;
      }) || null;
      if (si.has_time_conflict) has_any_conflicts = true;
      items.push({
        schedule_item_id: si.id,
        program_id: si.program_id,
        program_name: si.program_name_cache || (program ? program.name : null),
        weekday: si.weekday,
        start_time: si.start_time,
        end_time: si.end_time,
        has_time_conflict: !!si.has_time_conflict,
        program: program
      });
    }

    return {
      scheduleId: schedule.id,
      name: schedule.name,
      items: items,
      has_any_conflicts: has_any_conflicts
    };
  }

  // 25. removeScheduleItem(scheduleItemId)
  removeScheduleItem(scheduleItemId) {
    const schedule = this._getOrCreateSchedule();
    let scheduleItems = this._getFromStorage('scheduleitems');

    const index = scheduleItems.findIndex(function (si) {
      return si.id === scheduleItemId;
    });

    if (index === -1) {
      const remaining = scheduleItems.filter(function (si) {
        return si.schedule_id === schedule.id;
      });
      const has_any_conflicts = remaining.some(function (si) {
        return si.has_time_conflict;
      });
      return {
        success: false,
        scheduleId: schedule.id,
        remaining_items_count: remaining.length,
        has_any_conflicts: has_any_conflicts,
        message: 'Schedule item not found.'
      };
    }

    scheduleItems.splice(index, 1);
    this._saveToStorage('scheduleitems', scheduleItems);

    const recalced = this._recalculateScheduleConflicts(schedule.id);
    const has_any_conflicts = recalced.some(function (si) {
      return si.has_time_conflict;
    });

    return {
      success: true,
      scheduleId: schedule.id,
      remaining_items_count: recalced.length,
      has_any_conflicts: has_any_conflicts,
      message: 'Schedule item removed.'
    };
  }

  // 26. saveSchedule(scheduleId)
  saveSchedule(scheduleId) {
    let schedules = this._getFromStorage('schedules');
    let schedule = schedules.find(function (s) {
      return s.id === scheduleId;
    }) || null;

    if (!schedule) {
      schedule = this._getOrCreateSchedule();
      scheduleId = schedule.id;
      schedules = this._getFromStorage('schedules');
    }

    const recalced = this._recalculateScheduleConflicts(scheduleId);
    const has_any_conflicts = recalced.some(function (si) {
      return si.has_time_conflict;
    });

    for (let i = 0; i < schedules.length; i++) {
      if (schedules[i].id === scheduleId) {
        schedules[i].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('schedules', schedules);

    return {
      success: true,
      scheduleId: scheduleId,
      saved_at: this._now(),
      has_any_conflicts: has_any_conflicts,
      message: 'Schedule saved.'
    };
  }

  // 27. getAuditionFilterOptions()
  getAuditionFilterOptions() {
    const auditionCategories = [
      { value: 'elementary_school', label: 'Elementary School' },
      { value: 'middle_school', label: 'Middle School' },
      { value: 'high_school', label: 'High School' },
      { value: 'adult', label: 'Adult' }
    ];

    return {
      auditionCategories: auditionCategories
    };
  }

  // 28. searchAuditionEvents(audition_category)
  searchAuditionEvents(audition_category) {
    const events = this._getFromStorage('auditionevents');

    return events
      .filter(function (e) {
        if (!e.is_active) return false;
        if (audition_category && e.audition_category !== audition_category) return false;
        return true;
      })
      .map(function (e) {
        return {
          audition_event_id: e.id,
          name: e.name,
          description: e.description,
          audition_category: e.audition_category,
          location_name: e.location_name,
          is_active: e.is_active
        };
      });
  }

  // 29. getAuditionSlots(auditionEventId, date)
  getAuditionSlots(auditionEventId, date) {
    const slots = this._getFromStorage('auditionslots');

    const filtered = slots.filter(function (s) {
      if (s.audition_event_id !== auditionEventId) return false;
      if (date) {
        const d = (s.slot_start || '').slice(0, 10);
        if (d !== date) return false;
      }
      return true;
    });

    return filtered.map(function (s) {
      return {
        audition_slot_id: s.id,
        slot_start: s.slot_start,
        slot_end: s.slot_end,
        weekday: s.weekday,
        status: s.status
      };
    });
  }

  // 30. bookAuditionSlot(auditionSlotId, student_name, grade, email)
  bookAuditionSlot(auditionSlotId, student_name, grade, email) {
    let slots = this._getFromStorage('auditionslots');
    const bookings = this._getFromStorage('auditionbookings');

    const slotIndex = slots.findIndex(function (s) {
      return s.id === auditionSlotId;
    });

    if (slotIndex === -1) {
      return {
        success: false,
        bookingId: null,
        status: 'submitted',
        slot_start: null,
        slot_end: null,
        message: 'Audition slot not found.'
      };
    }

    const slot = slots[slotIndex];
    if (slot.status !== 'available') {
      return {
        success: false,
        bookingId: null,
        status: 'submitted',
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        message: 'Audition slot is not available.'
      };
    }

    const bookingId = this._generateId('auditionbooking');
    const booking = {
      id: bookingId,
      audition_slot_id: auditionSlotId,
      student_name: student_name,
      grade: typeof grade === 'number' ? grade : null,
      email: email,
      booking_datetime: this._now(),
      status: 'submitted'
    };

    bookings.push(booking);
    this._saveToStorage('auditionbookings', bookings);

    slots[slotIndex].status = 'booked';
    this._saveToStorage('auditionslots', slots);

    return {
      success: true,
      bookingId: bookingId,
      status: booking.status,
      slot_start: slot.slot_start,
      slot_end: slot.slot_end,
      message: 'Audition slot booked.'
    };
  }

  // 31. getDonationOptions()
  getDonationOptions() {
    const funds = this._getFromStorage('donationfunds');

    const donationTypes = [
      { value: 'one_time', label: 'One-Time', is_default: true },
      { value: 'recurring', label: 'Recurring', is_default: false }
    ];

    const activeFunds = funds.filter(function (f) {
      return f.is_active !== false;
    }).map(function (f) {
      return {
        fund_id: f.id,
        name: f.name,
        code: f.code,
        description: f.description,
        is_active: f.is_active !== false
      };
    });

    return {
      donationTypes: donationTypes,
      funds: activeFunds,
      default_currency: 'USD'
    };
  }

  // 32. submitDonation(donation_type, amount, fundId, donor_name, donor_email, card_number, card_expiration, card_cvv)
  submitDonation(donation_type, amount, fundId, donor_name, donor_email, card_number, card_expiration, card_cvv) {
    const funds = this._getFromStorage('donationfunds');
    const donations = this._getFromStorage('donations');

    const fund = funds.find(function (f) {
      return f.id === fundId;
    }) || null;

    if (!fund) {
      return {
        success: false,
        donationId: null,
        payment_status: 'failed',
        amount: amount,
        currency: 'USD',
        fund_name: null,
        message: 'Donation fund not found.'
      };
    }

    const payment_status = this._processMockPayment(amount, card_number, card_expiration, card_cvv);

    const donationId = this._generateId('donation');
    const donation = {
      id: donationId,
      donation_type: donation_type,
      amount: amount,
      currency: 'USD',
      fund_id: fundId,
      donor_name: donor_name,
      donor_email: donor_email,
      card_number: card_number,
      card_expiration: card_expiration,
      card_cvv: card_cvv,
      donation_datetime: this._now(),
      payment_status: payment_status
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: payment_status === 'completed',
      donationId: donationId,
      payment_status: payment_status,
      amount: amount,
      currency: 'USD',
      fund_name: fund.name,
      message: payment_status === 'completed' ? 'Donation completed.' : 'Donation failed.'
    };
  }

  // 33. getNewsletterMetadata()
  getNewsletterMetadata() {
    const interestCategories = [
      {
        value: 'adult_concerts',
        label: 'Adult Concerts',
        description: 'Performances featuring adult ensembles and orchestras.'
      },
      {
        value: 'youth_performances',
        label: 'Youth Performances',
        description: 'Concerts and recitals featuring youth ensembles.'
      },
      {
        value: 'workshops',
        label: 'Workshops & Classes',
        description: 'Educational workshops, masterclasses, and seminars.'
      },
      {
        value: 'donor_news',
        label: 'Donor News',
        description: 'Updates for donors and supporters.'
      },
      {
        value: 'general_updates',
        label: 'General Updates',
        description: 'Occasional news and announcements.'
      }
    ];

    const frequencyOptions = [
      { value: 'weekly', label: 'Weekly', is_default: false },
      { value: 'monthly', label: 'Monthly', is_default: true },
      { value: 'quarterly', label: 'Quarterly', is_default: false },
      { value: 'annually', label: 'Annually', is_default: false }
    ];

    return {
      interestCategories: interestCategories,
      frequencyOptions: frequencyOptions
    };
  }

  // 34. subscribeToNewsletter(email, name, frequency, interests)
  subscribeToNewsletter(email, name, frequency, interests) {
    const validInterests = [
      'adult_concerts',
      'youth_performances',
      'workshops',
      'donor_news',
      'general_updates'
    ];

    const selectedInterests = Array.isArray(interests) ? interests.filter(function (i) {
      return validInterests.indexOf(i) !== -1;
    }) : [];

    if (selectedInterests.length < 3) {
      return {
        success: false,
        subscriptionId: null,
        is_active: false,
        message: 'At least three interest categories must be selected.'
      };
    }

    const metadata = this.getNewsletterMetadata();
    const freqOptions = metadata.frequencyOptions || [];
    const freqValues = freqOptions.map(function (fo) {
      return fo.value;
    });

    let freq = frequency || null;
    if (!freq || freqValues.indexOf(freq) === -1) {
      const def = freqOptions.find(function (fo) {
        return fo.is_default;
      });
      freq = def ? def.value : 'monthly';
    }

    const subs = this._getFromStorage('newslettersubscriptions');
    const subsInterests = this._getFromStorage('newslettersubscriptioninterests');

    const subscriptionId = this._generateId('nlsub');
    const subscription = {
      id: subscriptionId,
      email: email,
      name: name || null,
      frequency: freq,
      subscription_datetime: this._now(),
      is_active: true
    };

    subs.push(subscription);

    for (let i = 0; i < selectedInterests.length; i++) {
      const interestId = this._generateId('nlinterest');
      subsInterests.push({
        id: interestId,
        newsletter_subscription_id: subscriptionId,
        category: selectedInterests[i],
        created_at: this._now()
      });
    }

    this._saveToStorage('newslettersubscriptions', subs);
    this._saveToStorage('newslettersubscriptioninterests', subsInterests);

    return {
      success: true,
      subscriptionId: subscriptionId,
      is_active: true,
      message: 'Newsletter subscription created.'
    };
  }

  // 35. getAboutContent()
  getAboutContent() {
    // Content may be stored as a single object under 'about_content'
    const raw = localStorage.getItem('about_content');
    let content = null;
    if (raw) {
      try {
        content = JSON.parse(raw);
      } catch (e) {
        content = null;
      }
    }

    const donationFunds = this._getFromStorage('donationfunds');

    let scholarshipFundHighlight = null;
    if (content && content.scholarshipFundHighlight && content.scholarshipFundHighlight.fund_id) {
      const fund = donationFunds.find(function (f) {
        return f.id === content.scholarshipFundHighlight.fund_id;
      }) || null;
      scholarshipFundHighlight = {
        fund_id: content.scholarshipFundHighlight.fund_id,
        name: content.scholarshipFundHighlight.name || (fund ? fund.name : null),
        description: content.scholarshipFundHighlight.description || (fund ? fund.description : null),
        fund: fund
      };
    }

    return {
      mission_html: content && content.mission_html ? content.mission_html : '',
      history_html: content && content.history_html ? content.history_html : '',
      values_html: content && content.values_html ? content.values_html : '',
      community_impact_html: content && content.community_impact_html ? content.community_impact_html : '',
      staff: content && Array.isArray(content.staff) ? content.staff : [],
      scholarshipFundHighlight: scholarshipFundHighlight
    };
  }

  // 36. getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    let info = null;
    if (raw) {
      try {
        info = JSON.parse(raw);
      } catch (e) {
        info = null;
      }
    }

    return {
      general_email: info && info.general_email ? info.general_email : '',
      phone: info && info.phone ? info.phone : '',
      address_lines: info && Array.isArray(info.address_lines) ? info.address_lines : [],
      office_hours: info && info.office_hours ? info.office_hours : ''
    };
  }

  // 37. submitContactForm(name, email, message)
  submitContactForm(name, email, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const id = this._generateId('contact');
    submissions.push({
      id: id,
      name: name,
      email: email,
      message: message,
      submitted_at: this._now()
    });
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Contact form submitted.'
    };
  }

  // 38. getPoliciesContent()
  getPoliciesContent() {
    const raw = localStorage.getItem('policies_content');
    let content = null;
    if (raw) {
      try {
        content = JSON.parse(raw);
      } catch (e) {
        content = null;
      }
    }

    return {
      privacy_policy_html: content && content.privacy_policy_html ? content.privacy_policy_html : '',
      ticketing_policy_html: content && content.ticketing_policy_html ? content.ticketing_policy_html : '',
      tuition_policy_html: content && content.tuition_policy_html ? content.tuition_policy_html : '',
      other_policies_html: content && content.other_policies_html ? content.other_policies_html : ''
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
