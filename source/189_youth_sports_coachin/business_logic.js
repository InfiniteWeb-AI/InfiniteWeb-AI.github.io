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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const keys = [
      'training_sessions',
      'camps',
      'coaches',
      'training_programs',
      'drills',
      'saved_drills_items',
      'schedule_items',
      'bookings',
      'recurring_booking_requests',
      'cart',
      'cart_items',
      'membership_plans',
      'membership_signup_drafts',
      'products',
      'wishlist_items',
      'player_profiles',
      'player_goals'
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

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _persistState(key, data) {
    this._saveToStorage(key, data);
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix = 'id') {
    return prefix + '_' + this._getNextIdCounter();
  }

  _parseISODate(dateString) {
    return new Date(dateString);
  }

  _formatDateOnly(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _calculateWeekRange(week_start_date) {
    const start = new Date(week_start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    if (!Array.isArray(carts)) {
      carts = [];
    }
    let cart = carts[0];
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: new Date().toISOString(),
        updated_at: null
      };
      carts.push(cart);
      this._persistState('cart', carts);
    }
    return cart;
  }

  _getCurrentCart() {
    const carts = this._getFromStorage('cart', []);
    if (!Array.isArray(carts) || carts.length === 0) return null;
    return carts[0];
  }

  // -------------------- Membership Signup Helper --------------------

  _getOrCreateMembershipSignupDraft(planId, selectedChildrenCount, startDate) {
    // For single-user context, always create a new draft tied to the selected plan
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      throw new Error('Membership plan not found');
    }

    const drafts = this._getFromStorage('membership_signup_drafts', []);
    const draft = {
      id: this._generateId('msd'),
      plan_id: plan.id,
      plan_name: plan.name,
      monthly_price: plan.monthly_price,
      selected_children_count: selectedChildrenCount,
      start_date: startDate,
      step: 'member_details',
      created_at: new Date().toISOString(),
      updated_at: null
    };
    drafts.push(draft);
    this._persistState('membership_signup_drafts', drafts);
    return draft;
  }

  // -------------------- Foreign Key Resolution Helper --------------------

  _attachReferencedObject(item, foreignKeyField, collectionKey, targetKeyName) {
    const collection = this._getFromStorage(collectionKey, []);
    const idValue = item[foreignKeyField];
    const baseName = targetKeyName
      ? targetKeyName
      : foreignKeyField.endsWith('_id')
      ? foreignKeyField.slice(0, -3)
      : foreignKeyField.replace(/Id$/, '');
    const ref = collection.find((obj) => obj.id === idValue) || null;
    return { ...item, [baseName]: ref };
  }

  // -------------------- Homepage --------------------

  getHomepageOverview() {
    const camps = this._getFromStorage('camps', []);
    const drills = this._getFromStorage('drills', []);
    const programs = this._getFromStorage('training_programs', []);
    const sessions = this._getFromStorage('training_sessions', []);

    // Featured camps: highest rating then soonest start
    const featured_camps = camps
      .filter((c) => c.is_active !== false)
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const sa = a.start_date || '';
        const sb = b.start_date || '';
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        return new Date(sa) - new Date(sb);
      })
      .slice(0, 5)
      .map((c) => ({
        camp_id: c.id,
        name: c.name,
        sport: c.sport,
        age_group: c.age_group,
        camp_duration_type: c.camp_duration_type,
        daily_schedule_type: c.daily_schedule_type,
        start_date: c.start_date,
        end_date: c.end_date,
        location_name: c.location_name,
        price: c.price,
        currency: c.currency,
        rating: c.rating,
        review_count: c.review_count,
        distance_miles: c.distance_miles
      }));

    // Popular drills: by popularity_score
    const popular_drills = drills
      .filter((d) => d.is_active !== false)
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 10)
      .map((d) => ({
        drill_id: d.id,
        title: d.title,
        sport: d.sport,
        age_group: d.age_group,
        difficulty: d.difficulty,
        duration_minutes: d.duration_minutes,
        content_type: d.content_type,
        popularity_score: d.popularity_score,
        thumbnail_url: d.thumbnail_url
      }));

    // Promoted programs: choose active packages/multi_week with best rating
    const promoted_programs = programs
      .filter((p) => p.is_active !== false)
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const revA = a.review_count || 0;
        const revB = b.review_count || 0;
        return revB - revA;
      })
      .slice(0, 10)
      .map((p) => ({
        program_id: p.id,
        name: p.name,
        sport: p.sport,
        age_group: p.age_group,
        program_type: p.program_type,
        level: p.level,
        session_count: p.session_count,
        total_price: p.total_price,
        currency: p.currency,
        duration_weeks: p.duration_weeks,
        schedule_summary: p.schedule_summary,
        rating: p.rating,
        review_count: p.review_count
      }));

    // Training quick links based on sports present in sessions/programs
    const sportSet = new Set();
    sessions.forEach((s) => sportSet.add(s.sport));
    programs.forEach((p) => sportSet.add(p.sport));
    camps.forEach((c) => sportSet.add(c.sport));

    const prettySport = (s) => {
      if (!s) return '';
      return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const training_quick_links = Array.from(sportSet)
      .filter(Boolean)
      .map((sport) => ({
        sport,
        label: `Find ${prettySport(sport)} Training`,
        default_filters: {
          age_group: null,
          session_type: null
        }
      }));

    return {
      featured_camps,
      popular_drills,
      promoted_programs,
      training_quick_links
    };
  }

  // -------------------- Training Sessions & Schedule --------------------

  getTrainingSessionFilterOptions() {
    return {
      sports: ['soccer', 'basketball', 'volleyball'],
      age_groups: ['ages_8_10', 'ages_10_12', 'ages_13_15', 'ages_14_16', 'under_12'],
      session_types: ['one_on_one', 'group'],
      levels: ['beginner', 'intermediate', 'advanced'],
      price_ranges: [
        { min_price: 0, max_price: 30, label: 'Up to $30' },
        { min_price: 0, max_price: 60, label: 'Up to $60' },
        { min_price: 0, max_price: 100, label: 'Up to $100' }
      ],
      rating_thresholds: [
        { min_rating: 4.0, label: '4.0+ stars' },
        { min_rating: 4.5, label: '4.5+ stars' }
      ],
      sort_options: [
        { value: 'distance_asc', label: 'Distance: nearest first' },
        { value: 'price_asc', label: 'Price: low to high' },
        { value: 'price_desc', label: 'Price: high to low' },
        { value: 'rating_desc', label: 'Rating: highest first' },
        { value: 'start_time_asc', label: 'Start time: earliest first' }
      ]
    };
  }

  searchTrainingSessions(filters, sort_by, limit, offset) {
    const sessions = this._getFromStorage('training_sessions', []);
    const coaches = this._getFromStorage('coaches', []);

    const f = filters || {};

    let results = sessions.filter((s) => s.is_active !== false);

    if (f.sport) results = results.filter((s) => s.sport === f.sport);
    if (f.age_group) results = results.filter((s) => s.age_group === f.age_group);
    if (f.session_type) results = results.filter((s) => s.session_type === f.session_type);
    if (f.level) results = results.filter((s) => s.level === f.level);
    if (typeof f.min_price === 'number') results = results.filter((s) => s.price >= f.min_price);
    if (typeof f.max_price === 'number') results = results.filter((s) => s.price <= f.max_price);
    if (typeof f.min_rating === 'number') results = results.filter((s) => (s.rating || 0) >= f.min_rating);
    if (typeof f.min_review_count === 'number') results = results.filter((s) => (s.review_count || 0) >= f.min_review_count);
    if (typeof f.max_distance_miles === 'number') results = results.filter((s) => (s.distance_miles || Infinity) <= f.max_distance_miles);

    if (f.date) {
      const target = f.date;
      results = results.filter((s) => {
        if (!s.session_date) return false;
        const d = this._formatDateOnly(s.session_date);
        return d === target;
      });
    }

    if (f.start_date || f.end_date) {
      const startDate = f.start_date ? new Date(f.start_date) : null;
      const endDate = f.end_date ? new Date(f.end_date) : null;
      results = results.filter((s) => {
        if (!s.session_date) return false;
        const d = new Date(s.session_date);
        if (startDate && d < startDate) return false;
        if (endDate) {
          const endDay = new Date(endDate);
          endDay.setDate(endDay.getDate() + 1);
          if (d >= endDay) return false;
        }
        return true;
      });
    }

    const sortKey = sort_by || null;
    if (sortKey) {
      results = results.slice().sort((a, b) => {
        switch (sortKey) {
          case 'distance_asc':
            return (a.distance_miles || Infinity) - (b.distance_miles || Infinity);
          case 'price_asc':
            return (a.price || 0) - (b.price || 0);
          case 'price_desc':
            return (b.price || 0) - (a.price || 0);
          case 'rating_desc':
            return (b.rating || 0) - (a.rating || 0);
          case 'start_time_asc': {
            const getStart = (s) => {
              if (Array.isArray(s.time_slots) && s.time_slots.length > 0) {
                return new Date(s.time_slots[0]).getTime();
              }
              return s.session_date ? new Date(s.session_date).getTime() : Infinity;
            };
            return getStart(a) - getStart(b);
          }
          default:
            return 0;
        }
      });
    }

    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const sliced = end !== undefined ? results.slice(start, end) : results.slice(start);

    return sliced.map((s) => {
      const coach = coaches.find((c) => c.id === s.coach_id) || null;
      const mapped = {
        session_id: s.id,
        title: s.title,
        sport: s.sport,
        age_group: s.age_group,
        session_type: s.session_type,
        level: s.level,
        coach_id: s.coach_id,
        coach_display_name: coach ? coach.display_name : null,
        location_name: s.location_name,
        location_address: s.location_address,
        distance_miles: s.distance_miles,
        session_date: s.session_date,
        time_slots: s.time_slots || [],
        price: s.price,
        currency: s.currency,
        rating: s.rating,
        review_count: s.review_count,
        is_active: s.is_active !== false
      };
      // Foreign key resolution: coach
      return this._attachReferencedObject(mapped, 'coach_id', 'coaches', 'coach');
    });
  }

  getTrainingSessionDetail(session_id) {
    const sessions = this._getFromStorage('training_sessions', []);
    const coaches = this._getFromStorage('coaches', []);
    const s = sessions.find((x) => x.id === session_id);
    if (!s) return null;
    const coach = coaches.find((c) => c.id === s.coach_id) || null;

    const detail = {
      session_id: s.id,
      title: s.title,
      description: s.description,
      sport: s.sport,
      age_group: s.age_group,
      min_age: s.min_age,
      max_age: s.max_age,
      session_type: s.session_type,
      level: s.level,
      coach_id: s.coach_id,
      coach_display_name: coach ? coach.display_name : null,
      coach_rating: coach ? coach.rating : null,
      coach_review_count: coach ? coach.review_count : null,
      location_name: s.location_name,
      location_address: s.location_address,
      distance_miles: s.distance_miles,
      session_date: s.session_date,
      time_slots: s.time_slots || [],
      price: s.price,
      currency: s.currency,
      rating: s.rating,
      review_count: s.review_count,
      is_active: s.is_active !== false
    };

    return this._attachReferencedObject(detail, 'coach_id', 'coaches', 'coach');
  }

  // -------------------- Camps --------------------

  getCampDetail(camp_id) {
    const camps = this._getFromStorage('camps', []);
    const coaches = this._getFromStorage('coaches', []);
    const c = camps.find((x) => x.id === camp_id);
    if (!c) return null;
    const coach = c.coach_id ? coaches.find((p) => p.id === c.coach_id) : null;

    const detail = {
      camp_id: c.id,
      name: c.name,
      description: c.description,
      sport: c.sport,
      age_group: c.age_group,
      min_age: c.min_age,
      max_age: c.max_age,
      camp_duration_type: c.camp_duration_type,
      daily_schedule_type: c.daily_schedule_type,
      location_name: c.location_name,
      location_address: c.location_address,
      start_date: c.start_date,
      end_date: c.end_date,
      daily_start_time: c.daily_start_time,
      daily_end_time: c.daily_end_time,
      lunch_included: c.lunch_included,
      coach_id: c.coach_id,
      coach_display_name: coach ? coach.display_name : null,
      rating: c.rating,
      review_count: c.review_count,
      distance_miles: c.distance_miles,
      price: c.price,
      currency: c.currency,
      is_active: c.is_active !== false
    };

    return this._attachReferencedObject(detail, 'coach_id', 'coaches', 'coach');
  }

  // -------------------- Booking & Registration --------------------

  getBookingContext(booking_type, session_id, camp_id, start_datetime) {
    if (booking_type === 'session_booking') {
      const sessions = this._getFromStorage('training_sessions', []);
      const coaches = this._getFromStorage('coaches', []);
      const s = sessions.find((x) => x.id === session_id);
      if (!s) return null;
      const coach = coaches.find((c) => c.id === s.coach_id) || null;
      let start = start_datetime || s.session_date;
      if (!start && Array.isArray(s.time_slots) && s.time_slots.length > 0) {
        start = s.time_slots[0];
      }
      const ctx = {
        booking_type: 'session_booking',
        offering_id: s.id,
        offering_title: s.title,
        sport: s.sport,
        start_datetime: start,
        end_datetime: null,
        location_name: s.location_name,
        location_address: s.location_address,
        coach_display_name: coach ? coach.display_name : null,
        price: s.price,
        currency: s.currency
      };
      // Attach full offering object for FK resolution (offering_id -> offering)
      const withOffering = { ...ctx, offering: s };
      return withOffering;
    }

    if (booking_type === 'camp_registration') {
      const camps = this._getFromStorage('camps', []);
      const coaches = this._getFromStorage('coaches', []);
      const c = camps.find((x) => x.id === camp_id);
      if (!c) return null;
      const coach = c.coach_id ? coaches.find((p) => p.id === c.coach_id) : null;
      const ctx = {
        booking_type: 'camp_registration',
        offering_id: c.id,
        offering_title: c.name,
        sport: c.sport,
        start_datetime: c.start_date,
        end_datetime: c.end_date,
        location_name: c.location_name,
        location_address: c.location_address,
        coach_display_name: coach ? coach.display_name : null,
        price: c.price,
        currency: c.currency
      };
      const withOffering = { ...ctx, offering: c };
      return withOffering;
    }

    return null;
  }

  createBookingDraft(booking_type, session_id, camp_id, start_datetime, child_name, child_age, guardian_email, guardian_phone) {
    const now = new Date().toISOString();
    const bookings = this._getFromStorage('bookings', []);

    let offeringTitle = null;
    let sport = null;
    let price = 0;
    let currency = 'USD';
    let end_datetime = null;
    let sid = null;
    let cid = null;

    if (booking_type === 'session_booking') {
      const sessions = this._getFromStorage('training_sessions', []);
      const s = sessions.find((x) => x.id === session_id);
      if (!s) throw new Error('Session not found');
      sid = s.id;
      offeringTitle = s.title;
      sport = s.sport;
      price = s.price;
      currency = s.currency || currency;
      end_datetime = null;
      if (!start_datetime) {
        start_datetime = s.session_date || (Array.isArray(s.time_slots) && s.time_slots[0]) || now;
      }
    } else if (booking_type === 'camp_registration') {
      const camps = this._getFromStorage('camps', []);
      const c = camps.find((x) => x.id === camp_id);
      if (!c) throw new Error('Camp not found');
      cid = c.id;
      offeringTitle = c.name;
      sport = c.sport;
      price = c.price;
      currency = c.currency || currency;
      start_datetime = start_datetime || c.start_date;
      end_datetime = c.end_date;
    } else {
      throw new Error('Invalid booking_type');
    }

    const booking = {
      id: this._generateId('booking'),
      booking_type,
      session_id: sid,
      camp_id: cid,
      offering_title: offeringTitle,
      sport,
      start_datetime,
      end_datetime,
      child_name,
      child_age,
      guardian_email: guardian_email || null,
      guardian_phone: guardian_phone || null,
      price,
      currency,
      status: 'draft',
      created_at: now,
      updated_at: now
    };

    bookings.push(booking);
    this._persistState('bookings', bookings);

    return {
      booking_id: booking.id,
      status: booking.status,
      booking_type: booking.booking_type,
      offering_title: booking.offering_title,
      sport: booking.sport,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      child_name: booking.child_name,
      child_age: booking.child_age,
      guardian_email: booking.guardian_email,
      guardian_phone: booking.guardian_phone,
      price: booking.price,
      currency: booking.currency
    };
  }

  confirmBooking(booking_id) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === booking_id);
    if (!booking) return null;

    booking.status = 'submitted';
    booking.updated_at = new Date().toISOString();
    this._persistState('bookings', bookings);

    return {
      booking_id: booking.id,
      status: booking.status,
      confirmation_message: 'Your booking has been submitted.',
      offering_title: booking.offering_title,
      sport: booking.sport,
      start_datetime: booking.start_datetime,
      child_name: booking.child_name,
      price: booking.price,
      currency: booking.currency
    };
  }

  // -------------------- Schedule --------------------

  addSessionToSchedule(session_id, start_datetime) {
    const sessions = this._getFromStorage('training_sessions', []);
    const s = sessions.find((x) => x.id === session_id);
    if (!s) throw new Error('Session not found');
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const now = new Date().toISOString();

    const item = {
      id: this._generateId('sched'),
      training_session_id: s.id,
      session_title: s.title,
      sport: s.sport,
      age_group: s.age_group,
      session_type: s.session_type,
      start_datetime,
      end_datetime: null,
      created_at: now
    };

    scheduleItems.push(item);
    this._persistState('schedule_items', scheduleItems);

    return {
      schedule_item_id: item.id,
      session_id: item.training_session_id,
      session_title: item.session_title,
      sport: item.sport,
      age_group: item.age_group,
      session_type: item.session_type,
      start_datetime: item.start_datetime,
      end_datetime: item.end_datetime,
      created_at: item.created_at
    };
  }

  getScheduledItemsForWeek(week_start_date, filters) {
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const sessions = this._getFromStorage('training_sessions', []);
    const coaches = this._getFromStorage('coaches', []);
    const f = filters || {};

    const range = this._calculateWeekRange(week_start_date);
    const start = new Date(range.start);
    const end = new Date(range.end);

    const inRange = scheduleItems.filter((item) => {
      const d = new Date(item.start_datetime);
      return d >= start && d < end;
    });

    let filtered = inRange;
    if (f.sport) filtered = filtered.filter((i) => i.sport === f.sport);
    if (f.age_group) filtered = filtered.filter((i) => i.age_group === f.age_group);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_weeklyScheduleViewed',
        JSON.stringify({ week_start_date: week_start_date, filters: filters || null })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered.map((item) => {
      const session = sessions.find((s) => s.id === item.training_session_id) || null;
      const coach = session ? coaches.find((c) => c.id === session.coach_id) : null;
      const base = {
        schedule_item_id: item.id,
        training_session_id: item.training_session_id,
        session_title: item.session_title,
        sport: item.sport,
        age_group: item.age_group,
        session_type: item.session_type,
        start_datetime: item.start_datetime,
        end_datetime: item.end_datetime,
        location_name: session ? session.location_name : null,
        coach_display_name: coach ? coach.display_name : null
      };
      // Attach full training_session object for FK resolution
      return this._attachReferencedObject(base, 'training_session_id', 'training_sessions', 'training_session');
    });
  }

  // -------------------- Training Programs & Packages --------------------

  getTrainingProgramFilterOptions() {
    return {
      sports: ['soccer', 'basketball', 'volleyball'],
      age_groups: ['ages_8_10', 'ages_10_12', 'ages_13_15', 'ages_14_16', 'under_12'],
      program_types: ['package', 'multi_week_program', 'drop_in'],
      levels: ['beginner', 'intermediate', 'advanced'],
      session_count_options: [
        { min_sessions: 1, label: '1+ sessions' },
        { min_sessions: 6, label: '6+ sessions' },
        { min_sessions: 10, label: '10+ sessions' }
      ],
      sort_options: [
        { value: 'price_asc', label: 'Price: low to high' },
        { value: 'price_desc', label: 'Price: high to low' },
        { value: 'rating_desc', label: 'Rating: highest first' }
      ]
    };
  }

  searchTrainingPrograms(filters, sort_by, limit, offset) {
    const programs = this._getFromStorage('training_programs', []);
    const f = filters || {};

    let results = programs.filter((p) => p.is_active !== false);

    if (f.sport) results = results.filter((p) => p.sport === f.sport);
    if (f.age_group) results = results.filter((p) => p.age_group === f.age_group);
    if (f.program_type) results = results.filter((p) => p.program_type === f.program_type);
    if (f.level) results = results.filter((p) => p.level === f.level);
    if (typeof f.min_session_count === 'number') {
      results = results.filter((p) => (p.session_count || 0) >= f.min_session_count);
    }
    if (typeof f.max_price === 'number') {
      results = results.filter((p) => (p.total_price || 0) <= f.max_price);
    }
    if (typeof f.allows_recurring_request === 'boolean') {
      results = results.filter((p) => !!p.allows_recurring_request === f.allows_recurring_request);
    }

    const sortKey = sort_by || null;
    if (sortKey) {
      results = results.slice().sort((a, b) => {
        switch (sortKey) {
          case 'price_asc':
            return (a.total_price || 0) - (b.total_price || 0);
          case 'price_desc':
            return (b.total_price || 0) - (a.total_price || 0);
          case 'rating_desc':
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
    }

    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const sliced = end !== undefined ? results.slice(start, end) : results.slice(start);

    return sliced.map((p) => ({
      program_id: p.id,
      name: p.name,
      sport: p.sport,
      age_group: p.age_group,
      program_type: p.program_type,
      level: p.level,
      session_count: p.session_count,
      total_price: p.total_price,
      currency: p.currency,
      duration_weeks: p.duration_weeks,
      schedule_summary: p.schedule_summary,
      rating: p.rating,
      review_count: p.review_count,
      allows_recurring_request: p.allows_recurring_request
    }));
  }

  getProgramDetail(program_id) {
    const programs = this._getFromStorage('training_programs', []);
    const coaches = this._getFromStorage('coaches', []);
    const p = programs.find((x) => x.id === program_id);
    if (!p) return null;
    const coach = p.coach_id ? coaches.find((c) => c.id === p.coach_id) : null;

    const detail = {
      program_id: p.id,
      name: p.name,
      description: p.description,
      sport: p.sport,
      age_group: p.age_group,
      min_age: p.min_age,
      max_age: p.max_age,
      program_type: p.program_type,
      level: p.level,
      session_count: p.session_count,
      total_price: p.total_price,
      currency: p.currency,
      duration_weeks: p.duration_weeks,
      schedule_summary: p.schedule_summary,
      coach_id: p.coach_id,
      coach_display_name: coach ? coach.display_name : null,
      rating: p.rating,
      review_count: p.review_count,
      allows_recurring_request: p.allows_recurring_request
    };

    // Instrumentation for task completion tracking
    try {
      let viewed = [];
      const existing = localStorage.getItem('task3_viewedProgramIds');
      if (existing) {
        try {
          viewed = JSON.parse(existing);
        } catch (e2) {
          viewed = [];
        }
      }
      if (!Array.isArray(viewed)) {
        viewed = [];
      }
      if (!viewed.includes(program_id)) {
        viewed.push(program_id);
      }
      localStorage.setItem('task3_viewedProgramIds', JSON.stringify(viewed));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return this._attachReferencedObject(detail, 'coach_id', 'coaches', 'coach');
  }

  addProgramPackageToCart(program_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const programs = this._getFromStorage('training_programs', []);
    const program = programs.find((p) => p.id === program_id);
    if (!program) {
      return { success: false, cart_id: null, message: 'Program not found', cart_summary: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.program_id === program.id);
    if (item) {
      item.quantity += qty;
      item.added_at = new Date().toISOString();
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        program_id: program.id,
        quantity: qty,
        unit_price: program.total_price,
        added_at: new Date().toISOString()
      };
      cartItems.push(item);
    }

    this._persistState('cart_items', cartItems);

    // Recompute cart summary
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    let total_price = 0;
    itemsForCart.forEach((ci) => {
      total_price += (ci.unit_price || 0) * (ci.quantity || 0);
    });
    const item_count = itemsForCart.reduce((acc, ci) => acc + (ci.quantity || 0), 0);

    const cart_summary = {
      item_count,
      total_price,
      currency: program.currency || 'USD'
    };

    return {
      success: true,
      cart_id: cart.id,
      message: 'Program added to cart',
      cart_summary
    };
  }

  getCartSummary() {
    const cart = this._getCurrentCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const programs = this._getFromStorage('training_programs', []);

    if (!cart) {
      return {
        cart_id: null,
        item_count: 0,
        total_price: 0,
        currency: 'USD',
        items: []
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let total_price = 0;
    let item_count = 0;
    let currency = 'USD';

    const items = itemsForCart.map((ci) => {
      const program = programs.find((p) => p.id === ci.program_id) || null;
      const line_total = (ci.unit_price || 0) * (ci.quantity || 0);
      total_price += line_total;
      item_count += ci.quantity || 0;
      if (program && program.currency) currency = program.currency;

      const base = {
        cart_item_id: ci.id,
        program_id: ci.program_id,
        program_name: program ? program.name : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total
      };
      // Attach full program object for FK resolution
      return this._attachReferencedObject(base, 'program_id', 'training_programs', 'program');
    });

    return {
      cart_id: cart.id,
      item_count,
      total_price,
      currency,
      items
    };
  }

  createRecurringBookingRequest(program_id, start_datetime, recurrence_type, occurrences) {
    const programs = this._getFromStorage('training_programs', []);
    const program = programs.find((p) => p.id === program_id);
    if (!program) throw new Error('Program not found');

    const requests = this._getFromStorage('recurring_booking_requests', []);
    const now = new Date().toISOString();

    const request = {
      id: this._generateId('recurr'),
      program_id: program.id,
      coach_id: program.coach_id || null,
      sport: program.sport,
      level: program.level,
      age_group: program.age_group,
      start_datetime,
      recurrence_type,
      occurrences,
      status: 'pending',
      created_at: now
    };

    requests.push(request);
    this._persistState('recurring_booking_requests', requests);

    const base = {
      request_id: request.id,
      program_id: request.program_id,
      coach_id: request.coach_id,
      sport: request.sport,
      level: request.level,
      age_group: request.age_group,
      start_datetime: request.start_datetime,
      recurrence_type: request.recurrence_type,
      occurrences: request.occurrences,
      status: request.status,
      created_at: request.created_at,
      confirmation_message: 'Your recurring booking request has been submitted and is pending approval.'
    };

    // Attach both program and coach for FK resolution
    const withProgram = this._attachReferencedObject(base, 'program_id', 'training_programs', 'program');
    return this._attachReferencedObject(withProgram, 'coach_id', 'coaches', 'coach');
  }

  // -------------------- Drills & Videos --------------------

  getDrillsFilterOptions() {
    return {
      sports: ['soccer', 'basketball', 'volleyball'],
      age_groups: ['ages_8_10', 'ages_10_12', 'ages_13_15', 'ages_14_16', 'under_12'],
      difficulties: ['beginner', 'intermediate', 'advanced'],
      duration_options: [
        { max_minutes: 5, label: 'Under 5 minutes' },
        { max_minutes: 10, label: 'Under 10 minutes' },
        { max_minutes: 20, label: 'Under 20 minutes' }
      ],
      content_types: ['video', 'article'],
      sort_options: [
        { value: 'popularity_desc', label: 'Most Popular' },
        { value: 'newest_desc', label: 'Newest' },
        { value: 'relevance_desc', label: 'Best Match' }
      ]
    };
  }

  searchDrills(query, filters, sort_by, limit, offset) {
    const drills = this._getFromStorage('drills', []);
    const saved = this._getFromStorage('saved_drills_items', []);
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = drills.filter((d) => d.is_active !== false);

    if (q) {
      const terms = q
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w && w !== 'and');
      results = results.filter((d) => {
        const textFields = [
          d.title || '',
          d.description || '',
          ...(Array.isArray(d.tags) ? d.tags : []),
        ]
          .join(' ')
          .toLowerCase();
        // Require all meaningful terms from the query to appear somewhere in the drill text
        return terms.every((term) => textFields.includes(term));
      });
    }

    if (f.sport) results = results.filter((d) => d.sport === f.sport);
    if (f.age_group) results = results.filter((d) => d.age_group === f.age_group);
    if (f.difficulty) results = results.filter((d) => d.difficulty === f.difficulty);
    if (typeof f.max_duration_minutes === 'number') {
      results = results.filter((d) => (d.duration_minutes || 0) <= f.max_duration_minutes);
    }
    if (f.content_type) results = results.filter((d) => d.content_type === f.content_type);

    const sortKey = sort_by || 'popularity_desc';
    results = results.slice().sort((a, b) => {
      switch (sortKey) {
        case 'popularity_desc':
          return (b.popularity_score || 0) - (a.popularity_score || 0);
        case 'newest_desc': {
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return cb - ca;
        }
        case 'relevance_desc':
          // Simple: same as popularity when we lack explicit relevance score
          return (b.popularity_score || 0) - (a.popularity_score || 0);
        default:
          return 0;
      }
    });

    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const sliced = end !== undefined ? results.slice(start, end) : results.slice(start);

    return sliced.map((d) => {
      const is_saved = saved.some((s) => s.drill_id === d.id);
      return {
        drill_id: d.id,
        title: d.title,
        sport: d.sport,
        age_group: d.age_group,
        difficulty: d.difficulty,
        duration_minutes: d.duration_minutes,
        content_type: d.content_type,
        popularity_score: d.popularity_score,
        thumbnail_url: d.thumbnail_url,
        description: d.description,
        tags: d.tags || [],
        is_saved
      };
    });
  }

  saveDrill(drill_id) {
    const drills = this._getFromStorage('drills', []);
    const drill = drills.find((d) => d.id === drill_id);
    if (!drill) throw new Error('Drill not found');

    const saved = this._getFromStorage('saved_drills_items', []);
    const existing = saved.find((s) => s.drill_id === drill_id);
    if (existing) {
      return {
        saved_drill_id: existing.id,
        drill_id: existing.drill_id,
        saved_at: existing.saved_at
      };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('saved_drill'),
      drill_id,
      saved_at: now
    };

    saved.push(item);
    this._persistState('saved_drills_items', saved);

    return {
      saved_drill_id: item.id,
      drill_id: item.drill_id,
      saved_at: item.saved_at
    };
  }

  getSavedDrillsList() {
    const saved = this._getFromStorage('saved_drills_items', []);
    const drills = this._getFromStorage('drills', []);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_savedDrillsViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return saved.map((s) => {
      const drill = drills.find((d) => d.id === s.drill_id) || null;
      const base = {
        saved_drill_id: s.id,
        drill_id: s.drill_id,
        saved_at: s.saved_at,
        title: drill ? drill.title : null,
        sport: drill ? drill.sport : null,
        age_group: drill ? drill.age_group : null,
        difficulty: drill ? drill.difficulty : null,
        duration_minutes: drill ? drill.duration_minutes : null,
        content_type: drill ? drill.content_type : null
      };
      // Attach full drill object for FK resolution
      return this._attachReferencedObject(base, 'drill_id', 'drills', 'drill');
    });
  }

  removeSavedDrill(saved_drill_id) {
    let saved = this._getFromStorage('saved_drills_items', []);
    const before = saved.length;
    saved = saved.filter((s) => s.id !== saved_drill_id);
    this._persistState('saved_drills_items', saved);
    const success = saved.length < before;
    return {
      success,
      message: success ? 'Saved drill removed.' : 'Saved drill not found.'
    };
  }

  // -------------------- Camps & Clinics Search --------------------

  getCampFilterOptions() {
    return {
      sports: ['soccer', 'basketball', 'volleyball'],
      camp_duration_types: ['weekend', 'multi_day', 'single_day'],
      daily_schedule_types: ['full_day', 'half_day', 'overnight'],
      amenities: ['lunch_included'],
      sort_options: [
        { value: 'start_date_asc', label: 'Start Date: Soonest first' },
        { value: 'price_asc', label: 'Price: low to high' },
        { value: 'price_desc', label: 'Price: high to low' }
      ]
    };
  }

  searchCamps(filters, sort_by, limit, offset) {
    const camps = this._getFromStorage('camps', []);
    const f = filters || {};

    let results = camps.filter((c) => c.is_active !== false);

    if (f.sport) results = results.filter((c) => c.sport === f.sport);
    if (f.age_group) results = results.filter((c) => c.age_group === f.age_group);
    if (f.camp_duration_type) results = results.filter((c) => c.camp_duration_type === f.camp_duration_type);
    if (f.daily_schedule_type) results = results.filter((c) => c.daily_schedule_type === f.daily_schedule_type);
    if (typeof f.lunch_included === 'boolean') results = results.filter((c) => !!c.lunch_included === f.lunch_included);

    if (f.start_date || f.end_date) {
      const startDate = f.start_date ? new Date(f.start_date) : null;
      const endDate = f.end_date ? new Date(f.end_date) : null;
      results = results.filter((c) => {
        if (!c.start_date) return false;
        const d = new Date(c.start_date);
        if (startDate && d < startDate) return false;
        if (endDate) {
          const endDay = new Date(endDate);
          endDay.setDate(endDay.getDate() + 1);
          if (d >= endDay) return false;
        }
        return true;
      });
    }

    if (typeof f.max_price === 'number') {
      results = results.filter((c) => (c.price || 0) <= f.max_price);
    }

    const sortKey = sort_by || 'start_date_asc';
    results = results.slice().sort((a, b) => {
      switch (sortKey) {
        case 'start_date_asc': {
          const sa = a.start_date ? new Date(a.start_date).getTime() : Infinity;
          const sb = b.start_date ? new Date(b.start_date).getTime() : Infinity;
          return sa - sb;
        }
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });

    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const sliced = end !== undefined ? results.slice(start, end) : results.slice(start);

    return sliced.map((c) => ({
      camp_id: c.id,
      name: c.name,
      sport: c.sport,
      age_group: c.age_group,
      camp_duration_type: c.camp_duration_type,
      daily_schedule_type: c.daily_schedule_type,
      start_date: c.start_date,
      end_date: c.end_date,
      lunch_included: c.lunch_included,
      location_name: c.location_name,
      distance_miles: c.distance_miles,
      price: c.price,
      currency: c.currency,
      rating: c.rating,
      review_count: c.review_count
    }));
  }

  // -------------------- Coaches & Programs --------------------

  getCoachFilterOptions() {
    return {
      sports: ['soccer', 'basketball', 'volleyball'],
      genders: ['male', 'female', 'non_binary', 'unspecified'],
      rating_thresholds: [
        { min_rating: 4.0, label: '4.0+ stars' },
        { min_rating: 4.5, label: '4.5+ stars' },
        { min_rating: 4.8, label: '4.8+ stars' }
      ],
      review_count_thresholds: [
        { min_reviews: 10, label: '10+ reviews' },
        { min_reviews: 20, label: '20+ reviews' }
      ],
      sort_options: [
        { value: 'rating_desc', label: 'Rating: highest first' },
        { value: 'price_asc', label: 'Hourly rate: low to high' },
        { value: 'distance_asc', label: 'Distance: nearest first' }
      ]
    };
  }

  searchCoaches(filters, sort_by, limit, offset) {
    const coaches = this._getFromStorage('coaches', []);
    const f = filters || {};

    let results = coaches.filter((c) => c.is_active !== false);

    if (f.sport) results = results.filter((c) => Array.isArray(c.sports) && c.sports.includes(f.sport));
    if (f.gender) results = results.filter((c) => c.gender === f.gender);
    if (typeof f.min_rating === 'number') results = results.filter((c) => (c.rating || 0) >= f.min_rating);
    if (typeof f.min_review_count === 'number') results = results.filter((c) => (c.review_count || 0) >= f.min_review_count);
    if (typeof f.max_hourly_rate === 'number') results = results.filter((c) => (c.hourly_rate || Infinity) <= f.max_hourly_rate);
    if (typeof f.max_distance_miles === 'number') results = results.filter((c) => (c.distance_miles || Infinity) <= f.max_distance_miles);

    const sortKey = sort_by || 'rating_desc';
    results = results.slice().sort((a, b) => {
      switch (sortKey) {
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'price_asc':
          return (a.hourly_rate || Infinity) - (b.hourly_rate || Infinity);
        case 'distance_asc':
          return (a.distance_miles || Infinity) - (b.distance_miles || Infinity);
        default:
          return 0;
      }
    });

    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const sliced = end !== undefined ? results.slice(start, end) : results.slice(start);

    return sliced.map((c) => ({
      coach_id: c.id,
      display_name: c.display_name,
      gender: c.gender,
      sports: c.sports || [],
      rating: c.rating,
      review_count: c.review_count,
      hourly_rate: c.hourly_rate,
      location_name: c.location_name,
      distance_miles: c.distance_miles,
      profile_image: c.profile_image
    }));
  }

  getCoachProfile(coach_id) {
    const coaches = this._getFromStorage('coaches', []);
    const c = coaches.find((x) => x.id === coach_id);
    if (!c) {
      // Return a stub profile when a program references a coach that isn't in storage
      return {
        coach_id,
        display_name: coach_id,
        first_name: null,
        last_name: null,
        gender: 'unspecified',
        bio: null,
        sports: [],
        rating: 0,
        review_count: 0,
        certifications: [],
        location_name: null,
        distance_miles: null,
        profile_image: null,
        hourly_rate: null
      };
    }
    return {
      coach_id: c.id,
      display_name: c.display_name,
      first_name: c.first_name,
      last_name: c.last_name,
      gender: c.gender,
      bio: c.bio,
      sports: c.sports || [],
      rating: c.rating,
      review_count: c.review_count,
      certifications: c.certifications || [],
      location_name: c.location_name,
      distance_miles: c.distance_miles,
      profile_image: c.profile_image,
      hourly_rate: c.hourly_rate
    };
  }

  getCoachPrograms(coach_id, filters) {
    const programs = this._getFromStorage('training_programs', []);
    const f = filters || {};

    let results = programs.filter((p) => p.is_active !== false && p.coach_id === coach_id);

    if (f.level) results = results.filter((p) => p.level === f.level);
    if (f.age_group) results = results.filter((p) => p.age_group === f.age_group);
    if (f.program_type) results = results.filter((p) => p.program_type === f.program_type);

    return results.map((p) => ({
      program_id: p.id,
      name: p.name,
      sport: p.sport,
      age_group: p.age_group,
      program_type: p.program_type,
      level: p.level,
      session_count: p.session_count,
      total_price: p.total_price,
      currency: p.currency,
      duration_weeks: p.duration_weeks,
      schedule_summary: p.schedule_summary,
      allows_recurring_request: p.allows_recurring_request
    }));
  }

  // -------------------- Membership & Pricing --------------------

  getMembershipPlansOverview() {
    const plans = this._getFromStorage('membership_plans', []);
    return plans
      .filter((p) => p.is_active !== false)
      .map((p) => ({
        plan_id: p.id,
        name: p.name,
        plan_type: p.plan_type,
        monthly_price: p.monthly_price,
        number_of_children_included: p.number_of_children_included,
        description: p.description,
        is_active: p.is_active !== false
      }));
  }

  getMembershipPlanDetail(plan_id) {
    const plans = this._getFromStorage('membership_plans', []);
    const p = plans.find((x) => x.id === plan_id);
    if (!p) return null;
    return {
      plan_id: p.id,
      name: p.name,
      plan_type: p.plan_type,
      monthly_price: p.monthly_price,
      number_of_children_included: p.number_of_children_included,
      description: p.description
    };
  }

  createMembershipSignupDraft(plan_id, selected_children_count, start_date) {
    const draft = this._getOrCreateMembershipSignupDraft(plan_id, selected_children_count, start_date);
    return {
      signup_draft_id: draft.id,
      plan_id: draft.plan_id,
      plan_name: draft.plan_name,
      monthly_price: draft.monthly_price,
      selected_children_count: draft.selected_children_count,
      start_date: draft.start_date,
      step: draft.step,
      created_at: draft.created_at
    };
  }

  // -------------------- Store / Training Gear --------------------

  getStoreFilterOptions() {
    return {
      price_ranges: [
        { min_price: 0, max_price: 20, label: 'Up to $20' },
        { min_price: 0, max_price: 30, label: 'Up to $30' },
        { min_price: 0, max_price: 50, label: 'Up to $50' }
      ],
      rating_thresholds: [
        { min_rating: 4.0, label: '4.0+ stars' },
        { min_rating: 4.5, label: '4.5+ stars' }
      ],
      review_count_thresholds: [
        { min_reviews: 10, label: '10+ reviews' },
        { min_reviews: 20, label: '20+ reviews' }
      ],
      sort_options: [
        { value: 'price_asc', label: 'Price: low to high' },
        { value: 'price_desc', label: 'Price: high to low' },
        { value: 'rating_desc', label: 'Rating: highest first' }
      ]
    };
  }

  searchProducts(query, filters, sort_by, limit, offset) {
    const products = this._getFromStorage('products', []);
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = products.filter((p) => p.is_active !== false);

    if (q) {
      const terms = q
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w && w !== 'and');
      results = results.filter((p) => {
        const text = [
          p.name || '',
          p.description || '',
          p.category || '',
        ]
          .join(' ')
          .toLowerCase();
        // Require all meaningful terms from the query to appear somewhere in the product text
        return terms.every((term) => text.includes(term));
      });
    }

    if (f.category) results = results.filter((p) => p.category === f.category);
    if (typeof f.max_price === 'number') results = results.filter((p) => (p.price || 0) <= f.max_price);
    if (typeof f.min_rating === 'number') results = results.filter((p) => (p.rating || 0) >= f.min_rating);
    if (typeof f.min_review_count === 'number') results = results.filter((p) => (p.review_count || 0) >= f.min_review_count);

    const sortKey = sort_by || null;
    if (sortKey) {
      results = results.slice().sort((a, b) => {
        switch (sortKey) {
          case 'price_asc':
            return (a.price || 0) - (b.price || 0);
          case 'price_desc':
            return (b.price || 0) - (a.price || 0);
          case 'rating_desc':
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
    }

    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const sliced = end !== undefined ? results.slice(start, end) : results.slice(start);

    return sliced.map((p) => ({
      product_id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      currency: p.currency,
      rating: p.rating,
      review_count: p.review_count,
      image_url: p.image_url,
      available_colors: p.available_colors || [],
      is_active: p.is_active !== false
    }));
  }

  getProductDetail(product_id) {
    const products = this._getFromStorage('products', []);
    const p = products.find((x) => x.id === product_id);
    if (!p) return null;
    return {
      product_id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      currency: p.currency,
      rating: p.rating,
      review_count: p.review_count,
      image_url: p.image_url,
      available_colors: p.available_colors || [],
      is_active: p.is_active !== false
    };
  }

  addProductToWishlist(product_id, selected_color) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === product_id);
    if (!product) throw new Error('Product not found');

    let wishlist = this._getFromStorage('wishlist_items', []);
    const existing = wishlist.find((w) => w.product_id === product_id && w.selected_color === (selected_color || null));
    if (existing) {
      return {
        wishlist_item_id: existing.id,
        product_id: existing.product_id,
        selected_color: existing.selected_color,
        added_at: existing.added_at
      };
    }

    const item = {
      id: this._generateId('wish'),
      product_id,
      selected_color: selected_color || null,
      added_at: new Date().toISOString()
    };

    wishlist.push(item);
    this._persistState('wishlist_items', wishlist);

    return {
      wishlist_item_id: item.id,
      product_id: item.product_id,
      selected_color: item.selected_color,
      added_at: item.added_at
    };
  }

  getWishlistItems() {
    const wishlist = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_wishlistViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return wishlist.map((w) => {
      const product = products.find((p) => p.id === w.product_id) || null;
      const base = {
        wishlist_item_id: w.id,
        product_id: w.product_id,
        selected_color: w.selected_color,
        added_at: w.added_at,
        name: product ? product.name : null,
        category: product ? product.category : null,
        price: product ? product.price : null,
        currency: product ? product.currency : null,
        rating: product ? product.rating : null,
        review_count: product ? product.review_count : null,
        image_url: product ? product.image_url : null
      };
      // Attach full product object for FK resolution
      return this._attachReferencedObject(base, 'product_id', 'products', 'product');
    });
  }

  removeWishlistItem(wishlist_item_id) {
    let wishlist = this._getFromStorage('wishlist_items', []);
    const before = wishlist.length;
    wishlist = wishlist.filter((w) => w.id !== wishlist_item_id);
    this._persistState('wishlist_items', wishlist);
    const success = wishlist.length < before;
    return {
      success,
      message: success ? 'Wishlist item removed.' : 'Wishlist item not found.'
    };
  }

  // -------------------- Player Profiles & Goals --------------------

  getPlayerProfilesList() {
    const players = this._getFromStorage('player_profiles', []);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task9_playerListViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return players.map((p) => ({
      player_id: p.id,
      name: p.name,
      age: p.age,
      sport: p.sport,
      position: p.position,
      created_at: p.created_at
    }));
  }

  createPlayerProfile(name, age, sport, position) {
    const players = this._getFromStorage('player_profiles', []);
    const now = new Date().toISOString();

    const player = {
      id: this._generateId('player'),
      name,
      age,
      sport,
      position: position || null,
      created_at: now,
      updated_at: null
    };

    players.push(player);
    this._persistState('player_profiles', players);

    return {
      player_id: player.id,
      name: player.name,
      age: player.age,
      sport: player.sport,
      position: player.position,
      created_at: player.created_at
    };
  }

  getPlayerProfileDetail(player_id) {
    const players = this._getFromStorage('player_profiles', []);
    const p = players.find((x) => x.id === player_id);
    if (!p) return null;
    return {
      player_id: p.id,
      name: p.name,
      age: p.age,
      sport: p.sport,
      position: p.position,
      created_at: p.created_at
    };
  }

  getPlayerGoals(player_id) {
    const goals = this._getFromStorage('player_goals', []);
    const players = this._getFromStorage('player_profiles', []);
    const player = players.find((p) => p.id === player_id) || null;

    const filtered = goals.filter((g) => g.player_id === player_id);

    return filtered.map((g) => {
      const base = {
        goal_id: g.id,
        player_id: g.player_id,
        skill: g.skill,
        title: g.title,
        target_date: g.target_date,
        status: g.status,
        created_at: g.created_at
      };
      // Attach full player object for FK resolution
      if (player) {
        return { ...base, player };
      }
      return this._attachReferencedObject(base, 'player_id', 'player_profiles', 'player');
    });
  }

  addPlayerGoal(player_id, skill, title, target_date) {
    const players = this._getFromStorage('player_profiles', []);
    const player = players.find((p) => p.id === player_id);
    if (!player) throw new Error('Player not found');

    const goals = this._getFromStorage('player_goals', []);
    const now = new Date().toISOString();

    const goal = {
      id: this._generateId('goal'),
      player_id,
      skill,
      title,
      target_date,
      status: 'not_started',
      created_at: now,
      updated_at: null
    };

    goals.push(goal);
    this._persistState('player_goals', goals);

    return {
      goal_id: goal.id,
      player_id: goal.player_id,
      skill: goal.skill,
      title: goal.title,
      target_date: goal.target_date,
      status: goal.status,
      created_at: goal.created_at
    };
  }

  updatePlayerGoal(goal_id, updates) {
    const goals = this._getFromStorage('player_goals', []);
    const goal = goals.find((g) => g.id === goal_id);
    if (!goal) return null;

    if (updates.title !== undefined) goal.title = updates.title;
    if (updates.target_date !== undefined) goal.target_date = updates.target_date;
    if (updates.status !== undefined) goal.status = updates.status;
    goal.updated_at = new Date().toISOString();

    this._persistState('player_goals', goals);

    return {
      goal_id: goal.id,
      player_id: goal.player_id,
      skill: goal.skill,
      title: goal.title,
      target_date: goal.target_date,
      status: goal.status,
      updated_at: goal.updated_at
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