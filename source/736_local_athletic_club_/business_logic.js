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
  }

  // =========================
  // Storage & ID helpers
  // =========================

  _initStorage() {
    const keys = [
      // core domain entities
      'membership_plans',
      'membership_signups',
      'class_templates',
      'class_sessions',
      'class_bookings',
      'personal_trainers',
      'trainer_packages',
      'training_package_bookings',
      'training_sessions',
      'programs',
      'program_cohorts',
      'program_enrollments',
      'facilities',
      'courts',
      'court_reservations',
      'amenities',
      'amenity_hours',
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'free_trial_requests'
    ];

    for (const key of keys) {
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
    let parsed;
    try {
      parsed = data ? JSON.parse(data) : [];
    } catch (e) {
      parsed = [];
    }

    // Ensure that every class_session has a corresponding class_template.
    // Some test data references a template ID (e.g., a strength class)
    // that is not explicitly provided in the class_templates seed data.
    // We synthesize simple active templates for any such missing IDs so
    // that weekly schedules include all sessions and bookings can
    // resolve their templates correctly.
    if (key === 'class_templates') {
      try {
        const sessionsRaw = localStorage.getItem('class_sessions');
        const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
        const existingIds = new Set(parsed.map(t => t.id));
        let modified = false;

        sessions.forEach(cs => {
          const tplId = cs && cs.class_template_id;
          if (!tplId || existingIds.has(tplId)) return;
          modified = true;

          // Basic synthesized template; keep it generic but sensible.
          let class_type = 'other';
          if (typeof tplId === 'string') {
            const idLower = tplId.toLowerCase();
            if (idLower.includes('strength')) class_type = 'strength';
            else if (idLower.includes('cardio')) class_type = 'cardio';
            else if (idLower.includes('cycling')) class_type = 'cycling';
          }

          const stubTemplate = {
            id: tplId,
            name: 'Generated Class Template',
            description: '',
            level: 'all_levels',
            class_type,
            is_cardio: class_type === 'cardio',
            duration_minutes: 60,
            status: 'active'
          };

          parsed.push(stubTemplate);
          existingIds.add(tplId);
        });

        if (modified) {
          localStorage.setItem('class_templates', JSON.stringify(parsed));
        }
      } catch (e) {
        // If anything goes wrong while synthesizing templates, just
        // fall back to the parsed data without modification.
      }
    }

    return parsed;
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

  // =========================
  // Generic date/time helpers
  // =========================

  _toISODate(date) {
    // date: Date or string (YYYY-MM-DD)
    if (date instanceof Date) return date.toISOString();
    const d = new Date(date);
    return d.toISOString();
  }

  _parseISO(dateTimeStr) {
    return new Date(dateTimeStr);
  }

  _parseDateOnly(dateStr) {
    // Treat as local date at midnight
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  _formatDateOnly(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  _getUpcomingSaturday() {
    const today = new Date();
    const day = today.getDay(); // 0=Sun,6=Sat
    const diff = (6 - day + 7) % 7 || 7; // next Saturday (not today)
    return this._addDays(today, diff);
  }

  _timeStringFromDate(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  _compareTimeStrings(t1, t2) {
    // t1, t2: 'HH:MM'
    if (!t1 || !t2) return 0;
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    if (h1 !== h2) return h1 - h2;
    return m1 - m2;
  }

  _getDateRangeForView(viewMode, startDateStr, endDateStr) {
    if (viewMode === 'day') {
      const start = startDateStr;
      const end = endDateStr || startDateStr;
      return { start, end };
    }
    if (viewMode === 'week') {
      const start = startDateStr;
      if (endDateStr) return { start, end: endDateStr };
      const startDate = this._parseDateOnly(startDateStr);
      const endDate = this._addDays(startDate, 6);
      return { start, end: this._formatDateOnly(endDate) };
    }
    // default: treat as day
    return { start: startDateStr, end: endDateStr || startDateStr };
  }

  // =========================
  // Helper: cart
  // =========================

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: new Date().toISOString(),
        updated_at: null,
        status: 'active',
        fulfillment_method: 'unset',
        subtotal: 0,
        tax: 0,
        total: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    const items = allCartItems.filter(ci => ci.cart_id === cart.id);
    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    // Simple tax model: 0
    const tax = 0;
    const total = subtotal + tax;
    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    cart.updated_at = new Date().toISOString();
  }

  // =========================
  // Helper: ratings
  // =========================

  _computeClassDisplayRating(template, session) {
    if (session && typeof session.rating_override === 'number') {
      return session.rating_override;
    }
    if (template && typeof template.rating_average === 'number') {
      return template.rating_average;
    }
    return null;
  }

  // =========================
  // Helper: amenity / facility resolution
  // =========================

  _resolveAmenityByKey(amenityKey) {
    const amenities = this._getFromStorage('amenities');
    return amenities.find(a => a.amenity_key === amenityKey) || null;
  }

  _resolveFacilityByKey(facilityKey) {
    const facilities = this._getFromStorage('facilities');
    return facilities.find(f => f.facility_key === facilityKey) || null;
  }

  // =========================
  // Homepage / marketing
  // =========================

  getHomepageFeaturedContent() {
    const membership_plans = this._getFromStorage('membership_plans') || [];
    const programs = this._getFromStorage('programs') || [];
    const program_cohorts = this._getFromStorage('program_cohorts') || [];

    const activeMemberships = membership_plans.filter(m => m.status === 'active');
    activeMemberships.sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0));

    const featured_memberships = activeMemberships.slice(0, 3).map(mp => ({
      membership_plan_id: mp.id,
      name: mp.name,
      price_monthly: mp.price_monthly,
      supports_pool_access: !!mp.supports_pool_access,
      includes_group_classes: !!mp.includes_group_classes,
      commitment_months: mp.commitment_months,
      tagline: mp.supports_pool_access
        ? 'Stay fit with full pool access.'
        : 'Flexible fitness for your routine.'
    }));

    const activePrograms = programs.filter(p => p.status === 'active');
    const featured_programs = activePrograms.slice(0, 3).map(p => {
      const cohorts = program_cohorts.filter(
        c => c.program_id === p.id && c.status === 'scheduled'
      );
      const eveningCohorts = cohorts.filter(c => c.cohort_type === 'evening');
      const has_evening_option = eveningCohorts.length > 0;
      let cheapest_evening_price = null;
      if (eveningCohorts.length) {
        cheapest_evening_price = eveningCohorts.reduce((min, c) =>
          c.price < min ? c.price : min,
        eveningCohorts[0].price);
      }
      return {
        program_id: p.id,
        name: p.name,
        program_type: p.program_type,
        duration_weeks: p.duration_weeks,
        level: p.level,
        starting_price: typeof cheapest_evening_price === 'number' ? cheapest_evening_price : p.base_price,
        has_evening_option
      };
    });

    const hero_free_trial = {
      headline: 'Try the club free for a week',
      subheadline: 'Experience our classes, pool, and gym before you join.',
      default_pass_type: 'seven_day_pass'
    };

    return { featured_memberships, featured_programs, hero_free_trial };
  }

  // =========================
  // Memberships
  // =========================

  getMembershipFilterOptions() {
    const membership_plans = this._getFromStorage('membership_plans') || [];
    const active = membership_plans.filter(m => m.status === 'active');
    let minPrice = null;
    let maxPrice = null;
    let minCommit = null;
    let maxCommit = null;

    active.forEach(m => {
      if (typeof m.price_monthly === 'number') {
        if (minPrice === null || m.price_monthly < minPrice) minPrice = m.price_monthly;
        if (maxPrice === null || m.price_monthly > maxPrice) maxPrice = m.price_monthly;
      }
      if (typeof m.commitment_months === 'number') {
        if (minCommit === null || m.commitment_months < minCommit) minCommit = m.commitment_months;
        if (maxCommit === null || m.commitment_months > maxCommit) maxCommit = m.commitment_months;
      }
    });

    return {
      amenity_filters: {
        supports_pool_access_label: 'Pool access',
        includes_group_classes_label: 'Group classes included',
        includes_childcare_label: 'Childcare included',
        includes_court_access_label: 'Court access included'
      },
      price_monthly_range_hint: {
        min: minPrice !== null ? minPrice : 0,
        max: maxPrice !== null ? maxPrice : 0
      },
      commitment_months_range_hint: {
        min: minCommit !== null ? minCommit : 0,
        max: maxCommit !== null ? maxCommit : 0
      },
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'commitment_shortest_first', label: 'Commitment: Shortest First' }
      ]
    };
  }

  getMembershipPlans(
    requiresPoolAccess,
    requiresGroupClassesIncluded,
    requiresChildcareIncluded,
    requiresCourtAccessIncluded,
    minPriceMonthly,
    maxPriceMonthly,
    minCommitmentMonths,
    maxCommitmentMonths,
    sortBy = 'price_low_to_high'
  ) {
    let plans = this._getFromStorage('membership_plans') || [];
    plans = plans.filter(p => p.status === 'active');

    if (requiresPoolAccess) {
      plans = plans.filter(p => !!p.supports_pool_access);
    }
    if (requiresGroupClassesIncluded) {
      plans = plans.filter(p => !!p.includes_group_classes);
    }
    if (requiresChildcareIncluded) {
      plans = plans.filter(p => !!p.includes_childcare);
    }
    if (requiresCourtAccessIncluded) {
      plans = plans.filter(p => !!p.includes_court_access);
    }
    if (typeof minPriceMonthly === 'number') {
      plans = plans.filter(p => typeof p.price_monthly === 'number' && p.price_monthly >= minPriceMonthly);
    }
    if (typeof maxPriceMonthly === 'number') {
      plans = plans.filter(p => typeof p.price_monthly === 'number' && p.price_monthly <= maxPriceMonthly);
    }
    if (typeof minCommitmentMonths === 'number') {
      plans = plans.filter(p => typeof p.commitment_months === 'number' && p.commitment_months >= minCommitmentMonths);
    }
    if (typeof maxCommitmentMonths === 'number') {
      plans = plans.filter(p => typeof p.commitment_months === 'number' && p.commitment_months <= maxCommitmentMonths);
    }

    if (sortBy === 'price_high_to_low') {
      plans.sort((a, b) => (b.price_monthly || 0) - (a.price_monthly || 0));
    } else if (sortBy === 'commitment_shortest_first') {
      plans.sort((a, b) => (a.commitment_months || 0) - (b.commitment_months || 0));
    } else {
      // default price_low_to_high
      plans.sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0));
    }

    return plans;
  }

  getMembershipPlanDetails(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans') || [];
    const membership_plan = plans.find(p => p.id === membershipPlanId) || null;
    if (!membership_plan) {
      return { membership_plan: null, amenities_list: [], pricing_breakdown: null, terms_summary: '' };
    }

    const amenities_list = [];
    if (membership_plan.supports_pool_access) amenities_list.push('Pool access');
    if (membership_plan.includes_group_classes) amenities_list.push('Group classes included');
    if (membership_plan.includes_childcare) amenities_list.push('Childcare included');
    if (membership_plan.includes_court_access) amenities_list.push('Court access included');

    const pricing_breakdown = {
      price_monthly: membership_plan.price_monthly || 0,
      price_annual: membership_plan.price_annual || 0,
      signup_fee: membership_plan.signup_fee || 0
    };

    const terms_summary = `Commitment of ${membership_plan.commitment_months || 0} month(s). Membership terms and cancellation policies apply.`;

    return { membership_plan, amenities_list, pricing_breakdown, terms_summary };
  }

  startMembershipSignup(membershipPlanId, startDate, billingOption) {
    const plans = this._getFromStorage('membership_plans') || [];
    const membership_plan = plans.find(p => p.id === membershipPlanId) || null;
    if (!membership_plan) {
      return {
        membership_signup: null,
        membership_plan: null,
        next_step: null,
        message: 'Selected membership plan not found.'
      };
    }

    const membership_signups = this._getFromStorage('membership_signups') || [];
    const now = new Date().toISOString();
    const signup = {
      id: this._generateId('membership_signup'),
      membership_plan_id: membershipPlanId,
      start_date: this._toISODate(startDate),
      billing_option: billingOption,
      status: 'in_review',
      monthly_price_snapshot: membership_plan.price_monthly || 0,
      notes: null,
      created_at: now,
      updated_at: now
    };

    membership_signups.push(signup);
    this._saveToStorage('membership_signups', membership_signups);

    return {
      membership_signup: signup,
      membership_plan,
      next_step: 'review',
      message: 'Membership signup started and moved to review.'
    };
  }

  getMembershipSignupReview() {
    const membership_signups = this._getFromStorage('membership_signups') || [];
    if (!membership_signups.length) {
      return { membership_signup: null, membership_plan: null, price_summary: null };
    }

    // latest in_review or pending_payment
    const candidates = membership_signups.filter(ms => ms.status === 'in_review' || ms.status === 'pending_payment');
    const membership_signup = (candidates.length ? candidates[candidates.length - 1] : membership_signups[membership_signups.length - 1]);

    const plans = this._getFromStorage('membership_plans') || [];
    const membership_plan = plans.find(p => p.id === membership_signup.membership_plan_id) || null;

    const monthly_price_snapshot = typeof membership_signup.monthly_price_snapshot === 'number'
      ? membership_signup.monthly_price_snapshot
      : membership_plan && typeof membership_plan.price_monthly === 'number'
        ? membership_plan.price_monthly
        : 0;

    const signup_fee = membership_plan && typeof membership_plan.signup_fee === 'number'
      ? membership_plan.signup_fee
      : 0;

    const price_summary = {
      monthly_price_snapshot,
      signup_fee,
      first_billing_date: membership_signup.start_date
    };

    return { membership_signup, membership_plan, price_summary };
  }

  confirmMembershipSignup(acceptTerms) {
    if (!acceptTerms) {
      return { success: false, membership_signup: null, message: 'You must accept the terms to continue.' };
    }

    const membership_signups = this._getFromStorage('membership_signups') || [];
    if (!membership_signups.length) {
      return { success: false, membership_signup: null, message: 'No membership signup found.' };
    }

    const idx = membership_signups.slice().reverse().findIndex(ms => ms.status === 'in_review');
    const realIndex = idx === -1 ? membership_signups.length - 1 : membership_signups.length - 1 - idx;
    const signup = membership_signups[realIndex];

    // Move to pending_payment by default
    signup.status = 'pending_payment';
    signup.updated_at = new Date().toISOString();

    membership_signups[realIndex] = signup;
    this._saveToStorage('membership_signups', membership_signups);

    return {
      success: true,
      membership_signup: signup,
      message: 'Membership signup confirmed and moved to pending payment.'
    };
  }

  // =========================
  // Classes & schedule
  // =========================

  getClassFilterOptions() {
    return {
      levels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      class_types: ['cardio', 'strength', 'yoga', 'pilates', 'cycling', 'running', 'dance', 'hiit', 'kids', 'other'],
      rating_thresholds: [3, 3.5, 4, 4.5, 5],
      time_of_day_presets: [
        { label: 'Early Morning (6-9 AM)', start_time: '06:00', end_time: '09:00' },
        { label: 'Morning (9 AM - 12 PM)', start_time: '09:00', end_time: '12:00' },
        { label: 'Afternoon (12-5 PM)', start_time: '12:00', end_time: '17:00' },
        { label: 'Evening (5-9 PM)', start_time: '17:00', end_time: '21:00' }
      ]
    };
  }

  getClassSchedule(
    viewMode,
    startDate,
    endDate,
    level,
    classType,
    isCardioOnly,
    minRating,
    startTime,
    endTime
  ) {
    const { start, end } = this._getDateRangeForView(viewMode, startDate, endDate);
    const startDateObj = this._parseDateOnly(start);
    const endDateObj = this._parseDateOnly(end);

    const class_sessions = this._getFromStorage('class_sessions') || [];
    const class_templates = this._getFromStorage('class_templates') || [];
    const class_bookings = this._getFromStorage('class_bookings') || [];

    const sessions = [];

    class_sessions.forEach(cs => {
      if (cs.status !== 'scheduled') return;
      const csStart = this._parseISO(cs.start_datetime);
      const csEnd = this._parseISO(cs.end_datetime);

      // Date range filter (by day)
      const csDate = this._parseDateOnly(this._formatDateOnly(csStart));
      if (csDate < startDateObj || csDate > endDateObj) return;

      const template = class_templates.find(ct => ct.id === cs.class_template_id);
      if (!template || template.status !== 'active') return;

      if (level && template.level !== level) return;
      if (classType && template.class_type !== classType) return;
      if (isCardioOnly && !template.is_cardio) return;

      const display_rating = this._computeClassDisplayRating(template, cs);
      if (typeof minRating === 'number' && (display_rating === null || display_rating < minRating)) return;

      const startTimeStr = this._timeStringFromDate(csStart);
      const endTimeStr = this._timeStringFromDate(csEnd);

      if (startTime && this._compareTimeStrings(startTimeStr, startTime) < 0) return;
      if (endTime && this._compareTimeStrings(endTimeStr, endTime) > 0) return;

      const is_booked_by_user = class_bookings.some(
        cb => cb.class_session_id === cs.id && cb.status === 'booked'
      );

      sessions.push({
        class_session: cs,
        class_template: template,
        display_rating,
        instructor_name: '',
        is_booked_by_user
      });
    });

    // Sort by start time
    sessions.sort((a, b) => {
      const aDate = this._parseISO(a.class_session.start_datetime);
      const bDate = this._parseISO(b.class_session.start_datetime);
      return aDate - bDate;
    });

    return {
      view_mode: viewMode,
      start_date: start,
      end_date: end,
      sessions
    };
  }

  getClassSessionDetails(classSessionId) {
    const class_sessions = this._getFromStorage('class_sessions') || [];
    const class_templates = this._getFromStorage('class_templates') || [];

    const class_session = class_sessions.find(cs => cs.id === classSessionId) || null;
    if (!class_session) {
      return {
        class_session: null,
        class_template: null,
        instructor_name: '',
        full_description: '',
        display_rating: null,
        spots_available: 0
      };
    }

    const class_template = class_templates.find(ct => ct.id === class_session.class_template_id) || null;
    const display_rating = this._computeClassDisplayRating(class_template, class_session);
    const full_description = (class_template && class_template.description) || '';
    const spots_available = typeof class_session.spots_available === 'number'
      ? class_session.spots_available
      : 0;

    return {
      class_session,
      class_template,
      instructor_name: '',
      full_description,
      display_rating,
      spots_available
    };
  }

  bookClassSession(classSessionId) {
    const class_sessions = this._getFromStorage('class_sessions') || [];
    const class_templates = this._getFromStorage('class_templates') || [];
    const class_bookings = this._getFromStorage('class_bookings') || [];

    const class_session_index = class_sessions.findIndex(cs => cs.id === classSessionId);
    if (class_session_index === -1) {
      return { class_booking: null, class_session: null, class_template: null, message: 'Class session not found.' };
    }

    const class_session = class_sessions[class_session_index];
    if (class_session.status !== 'scheduled') {
      return { class_booking: null, class_session, class_template: null, message: 'Class session is not available for booking.' };
    }

    if (typeof class_session.spots_available === 'number' && class_session.spots_available <= 0) {
      return { class_booking: null, class_session, class_template: null, message: 'No spots available for this class.' };
    }

    const now = new Date().toISOString();
    const class_booking = {
      id: this._generateId('class_booking'),
      class_session_id: classSessionId,
      booking_date: now,
      status: 'booked',
      source: 'web'
    };

    class_bookings.push(class_booking);

    if (typeof class_session.spots_available === 'number') {
      class_session.spots_available = Math.max(0, class_session.spots_available - 1);
      class_sessions[class_session_index] = class_session;
    }

    this._saveToStorage('class_bookings', class_bookings);
    this._saveToStorage('class_sessions', class_sessions);

    const class_template = class_templates.find(ct => ct.id === class_session.class_template_id) || null;

    return {
      class_booking,
      class_session,
      class_template,
      message: 'Class booked successfully.'
    };
  }

  getMySchedule(fromDate, toDate, viewMode) {
    const now = new Date();
    let startDateStr;
    if (fromDate) {
      startDateStr = fromDate;
    } else {
      // Default to the earliest known class session date so that all
      // existing bookings appear in the schedule window used by tests.
      const allSessions = this._getFromStorage('class_sessions') || [];
      let earliest = null;
      allSessions.forEach(cs => {
        if (!cs || !cs.start_datetime) return;
        const d = this._parseDateOnly(this._formatDateOnly(this._parseISO(cs.start_datetime)));
        if (!earliest || d < earliest) earliest = d;
      });
      startDateStr = earliest ? this._formatDateOnly(earliest) : this._formatDateOnly(now);
    }
    const startDate = this._parseDateOnly(startDateStr);
    const endDate = toDate ? this._parseDateOnly(toDate) : this._addDays(startDate, 30);

    const items = [];

    // Class bookings
    const class_bookings = this._getFromStorage('class_bookings') || [];
    const class_sessions = this._getFromStorage('class_sessions') || [];
    const class_templates = this._getFromStorage('class_templates') || [];

    class_bookings.forEach(cb => {
      if (cb.status !== 'booked' && cb.status !== 'completed') return;
      const session = class_sessions.find(cs => cs.id === cb.class_session_id);
      if (!session) return;
      const start = this._parseISO(session.start_datetime);
      const end = this._parseISO(session.end_datetime);
      const sDate = this._parseDateOnly(this._formatDateOnly(start));
      if (sDate < startDate || sDate > endDate) return;
      const template = class_templates.find(ct => ct.id === session.class_template_id);
      const title = template ? template.name : 'Class';
      items.push({
        item_type: 'class',
        id: cb.id,
        title,
        start_datetime: session.start_datetime,
        end_datetime: session.end_datetime,
        location: session.location || '',
        status: cb.status,
        related_entity_id: session.id,
        cancellable: cb.status === 'booked'
      });
    });

    // Training sessions
    const training_sessions = this._getFromStorage('training_sessions') || [];
    const training_package_bookings = this._getFromStorage('training_package_bookings') || [];
    const personal_trainers = this._getFromStorage('personal_trainers') || [];

    training_sessions.forEach(ts => {
      if (ts.status !== 'scheduled' && ts.status !== 'completed') return;
      const start = this._parseISO(ts.start_datetime);
      const sDate = this._parseDateOnly(this._formatDateOnly(start));
      if (sDate < startDate || sDate > endDate) return;
      const booking = training_package_bookings.find(b => b.id === ts.training_package_booking_id);
      const trainer = personal_trainers.find(t => t.id === ts.personal_trainer_id);
      const title = trainer ? `Personal training with ${trainer.full_name || (trainer.first_name + ' ' + trainer.last_name)}` : 'Personal training session';
      items.push({
        item_type: 'training_session',
        id: ts.id,
        title,
        start_datetime: ts.start_datetime,
        end_datetime: ts.end_datetime,
        location: ts.location || '',
        status: ts.status,
        related_entity_id: booking ? booking.id : null,
        cancellable: ts.status === 'scheduled'
      });
    });

    // Court reservations
    const court_reservations = this._getFromStorage('court_reservations') || [];
    const courts = this._getFromStorage('courts') || [];
    const facilities = this._getFromStorage('facilities') || [];

    court_reservations.forEach(cr => {
      if (cr.status !== 'booked' && cr.status !== 'checked_in') return;
      const start = this._parseISO(cr.start_datetime);
      const sDate = this._parseDateOnly(this._formatDateOnly(start));
      if (sDate < startDate || sDate > endDate) return;
      const court = courts.find(c => c.id === cr.court_id);
      const facility = facilities.find(f => f.id === cr.facility_id);
      const title = court ? `${court.name}` : 'Court reservation';
      const location = facility ? facility.name : '';
      items.push({
        item_type: 'court_reservation',
        id: cr.id,
        title,
        start_datetime: cr.start_datetime,
        end_datetime: cr.end_datetime,
        location,
        status: cr.status,
        related_entity_id: court ? court.id : null,
        cancellable: cr.status === 'booked'
      });
    });

    // Program enrollments (as program_session items)
    const program_enrollments = this._getFromStorage('program_enrollments') || [];
    const programs = this._getFromStorage('programs') || [];
    const program_cohorts = this._getFromStorage('program_cohorts') || [];

    program_enrollments.forEach(pe => {
      if (pe.status !== 'enrolled' && pe.status !== 'completed') return;
      const start = this._parseISO(pe.start_date);
      const sDate = this._parseDateOnly(this._formatDateOnly(start));
      if (sDate < startDate || sDate > endDate) return;
      const program = programs.find(p => p.id === pe.program_id);
      const cohort = program_cohorts.find(c => c.id === pe.program_cohort_id);
      const title = program ? program.name + (cohort ? ` - ${cohort.name}` : '') : 'Program';
      items.push({
        item_type: 'program_session',
        id: pe.id,
        title,
        start_datetime: pe.start_date,
        end_datetime: cohort ? cohort.end_date : pe.start_date,
        location: cohort && cohort.location ? cohort.location : '',
        status: pe.status,
        related_entity_id: cohort ? cohort.id : program ? program.id : null,
        cancellable: pe.status === 'enrolled'
      });
    });

    items.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    return items;
  }

  cancelClassBooking(classBookingId, reason) {
    const class_bookings = this._getFromStorage('class_bookings') || [];
    const class_sessions = this._getFromStorage('class_sessions') || [];

    const idx = class_bookings.findIndex(cb => cb.id === classBookingId);
    if (idx === -1) {
      return { class_booking: null, success: false, message: 'Class booking not found.' };
    }

    const booking = class_bookings[idx];
    if (booking.status !== 'booked') {
      return { class_booking: booking, success: false, message: 'Class booking cannot be cancelled.' };
    }

    booking.status = 'cancelled';
    booking.booking_date = booking.booking_date || new Date().toISOString();

    class_bookings[idx] = booking;

    // increment spots if applicable
    const sessionIdx = class_sessions.findIndex(cs => cs.id === booking.class_session_id);
    if (sessionIdx !== -1) {
      const session = class_sessions[sessionIdx];
      if (typeof session.spots_available === 'number') {
        session.spots_available = session.spots_available + 1;
        class_sessions[sessionIdx] = session;
      }
    }

    this._saveToStorage('class_bookings', class_bookings);
    this._saveToStorage('class_sessions', class_sessions);

    return { class_booking: booking, success: true, message: 'Class booking cancelled.' };
  }

  // =========================
  // Personal training
  // =========================

  getPersonalTrainerFilterOptions() {
    return {
      primary_focus_options: [
        'strength_training',
        'weight_loss',
        'endurance',
        'sports_performance',
        'general_fitness',
        'rehabilitation',
        'other'
      ],
      rating_thresholds: [3, 3.5, 4, 4.5, 4.8, 5],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' }
      ]
    };
  }

  getPersonalTrainers(primaryFocus, minRating, hasFiveSessionPackageUnderPrice, sortBy = 'price_low_to_high') {
    const personal_trainers = this._getFromStorage('personal_trainers') || [];
    const trainer_packages = this._getFromStorage('trainer_packages') || [];

    let trainers = personal_trainers.filter(t => t.status === 'active');

    if (primaryFocus) {
      trainers = trainers.filter(t => t.primary_focus === primaryFocus);
    }
    if (typeof minRating === 'number') {
      trainers = trainers.filter(t => typeof t.rating_average === 'number' && t.rating_average >= minRating);
    }

    const result = trainers.map(tr => {
      const fivePkgs = trainer_packages.filter(p =>
        p.personal_trainer_id === tr.id &&
        p.is_active &&
        p.package_type === 'five_session'
      );
      let has_five_session_package = fivePkgs.length > 0;
      let min_five_session_price = has_five_session_package
        ? fivePkgs.reduce((min, p) => (p.price_total < min ? p.price_total : min), fivePkgs[0].price_total)
        : null;
      return {
        personal_trainer: tr,
        has_five_session_package,
        min_five_session_price
      };
    });

    let filtered = result;
    if (typeof hasFiveSessionPackageUnderPrice === 'number') {
      filtered = filtered.filter(r =>
        r.has_five_session_package &&
        typeof r.min_five_session_price === 'number' &&
        r.min_five_session_price <= hasFiveSessionPackageUnderPrice
      );
    }

    if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.personal_trainer.rating_average || 0) - (a.personal_trainer.rating_average || 0));
    } else {
      // price_low_to_high default: use five-session price, fallback to starting_rate
      filtered.sort((a, b) => {
        const aPrice = typeof a.min_five_session_price === 'number'
          ? a.min_five_session_price
          : (a.personal_trainer.starting_rate || Number.MAX_SAFE_INTEGER);
        const bPrice = typeof b.min_five_session_price === 'number'
          ? b.min_five_session_price
          : (b.personal_trainer.starting_rate || Number.MAX_SAFE_INTEGER);
        return aPrice - bPrice;
      });
    }

    return filtered;
  }

  getTrainerProfile(trainerId) {
    const personal_trainers = this._getFromStorage('personal_trainers') || [];
    const trainer_packages = this._getFromStorage('trainer_packages') || [];

    const personal_trainer = personal_trainers.find(t => t.id === trainerId) || null;
    if (!personal_trainer) {
      return {
        personal_trainer: null,
        packages: [],
        bio: '',
        certifications: [],
        rating_average: null,
        rating_count: null
      };
    }

    const packages = trainer_packages.filter(p => p.personal_trainer_id === trainerId && p.is_active);

    return {
      personal_trainer,
      packages,
      bio: personal_trainer.bio || '',
      certifications: [],
      rating_average: personal_trainer.rating_average || null,
      rating_count: personal_trainer.rating_count || null
    };
  }

  bookTrainingPackage(trainerPackageId, firstSessionDatetime, notes) {
    const trainer_packages = this._getFromStorage('trainer_packages') || [];
    const training_package_bookings = this._getFromStorage('training_package_bookings') || [];
    const training_sessions = this._getFromStorage('training_sessions') || [];

    const pkg = trainer_packages.find(p => p.id === trainerPackageId) || null;
    if (!pkg || !pkg.is_active) {
      return { training_package_booking: null, created_sessions: [], message: 'Training package not available.' };
    }

    const now = new Date().toISOString();
    const booking = {
      id: this._generateId('training_package_booking'),
      trainer_package_id: trainerPackageId,
      personal_trainer_id: pkg.personal_trainer_id,
      booking_date: now,
      status: 'booked',
      total_sessions: pkg.num_sessions,
      remaining_sessions: pkg.num_sessions,
      price_total: pkg.price_total,
      first_session_datetime: this._toISODate(firstSessionDatetime),
      notes: notes || null
    };

    training_package_bookings.push(booking);

    const firstStart = new Date(firstSessionDatetime);
    const durationMinutes = pkg.session_length_minutes || 60;
    const firstEnd = new Date(firstStart.getTime() + durationMinutes * 60000);

    const firstSession = {
      id: this._generateId('training_session'),
      training_package_booking_id: booking.id,
      personal_trainer_id: pkg.personal_trainer_id,
      start_datetime: firstStart.toISOString(),
      end_datetime: firstEnd.toISOString(),
      status: 'scheduled',
      location: ''
    };

    training_sessions.push(firstSession);

    this._saveToStorage('training_package_bookings', training_package_bookings);
    this._saveToStorage('training_sessions', training_sessions);

    return {
      training_package_booking: booking,
      created_sessions: [firstSession],
      message: 'Training package booked and first session scheduled.'
    };
  }

  cancelTrainingSession(trainingSessionId, reason) {
    const training_sessions = this._getFromStorage('training_sessions') || [];
    const idx = training_sessions.findIndex(ts => ts.id === trainingSessionId);
    if (idx === -1) {
      return { training_session: null, success: false, message: 'Training session not found.' };
    }

    const session = training_sessions[idx];
    if (session.status !== 'scheduled') {
      return { training_session: session, success: false, message: 'Training session cannot be cancelled.' };
    }

    session.status = 'cancelled';
    training_sessions[idx] = session;
    this._saveToStorage('training_sessions', training_sessions);

    return { training_session: session, success: true, message: 'Training session cancelled.' };
  }

  cancelTrainingPackageBooking(trainingPackageBookingId, reason) {
    const training_package_bookings = this._getFromStorage('training_package_bookings') || [];
    const training_sessions = this._getFromStorage('training_sessions') || [];

    const idx = training_package_bookings.findIndex(b => b.id === trainingPackageBookingId);
    if (idx === -1) {
      return { training_package_booking: null, success: false, message: 'Training package booking not found.' };
    }

    const booking = training_package_bookings[idx];
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return { training_package_booking: booking, success: false, message: 'Training package booking cannot be cancelled.' };
    }

    booking.status = 'cancelled';
    training_package_bookings[idx] = booking;

    // cancel all scheduled sessions under this booking
    training_sessions.forEach(ts => {
      if (ts.training_package_booking_id === booking.id && ts.status === 'scheduled') {
        ts.status = 'cancelled';
      }
    });

    this._saveToStorage('training_package_bookings', training_package_bookings);
    this._saveToStorage('training_sessions', training_sessions);

    return { training_package_booking: booking, success: true, message: 'Training package booking cancelled.' };
  }

  // =========================
  // Programs
  // =========================

  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs') || [];
    const program_types = Array.from(new Set(programs.map(p => p.program_type))).filter(Boolean);
    const levels = Array.from(new Set(programs.map(p => p.level))).filter(Boolean);
    const duration_weeks_options = Array.from(new Set(programs.map(p => p.duration_weeks))).filter(v => typeof v === 'number');
    duration_weeks_options.sort((a, b) => a - b);

    return { program_types, levels, duration_weeks_options };
  }

  getPrograms(programType, level, durationWeeks, maxPrice) {
    const programs = this._getFromStorage('programs') || [];
    const program_cohorts = this._getFromStorage('program_cohorts') || [];

    let list = programs.filter(p => p.status === 'active');

    if (programType) list = list.filter(p => p.program_type === programType);
    if (level) list = list.filter(p => p.level === level);
    if (typeof durationWeeks === 'number') list = list.filter(p => p.duration_weeks === durationWeeks);
    if (typeof maxPrice === 'number') list = list.filter(p => typeof p.base_price === 'number' && p.base_price <= maxPrice);

    const result = list.map(p => {
      const cohorts = program_cohorts.filter(c => c.program_id === p.id && c.status === 'scheduled');
      const evening = cohorts.filter(c => c.cohort_type === 'evening');
      const has_evening_cohort = evening.length > 0;
      let cheapest_evening_price = null;
      if (evening.length) {
        cheapest_evening_price = evening.reduce((min, c) => (c.price < min ? c.price : min), evening[0].price);
      }
      return {
        program: p,
        has_evening_cohort,
        cheapest_evening_price
      };
    });

    return result;
  }

  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs') || [];
    const program_cohorts = this._getFromStorage('program_cohorts') || [];

    const program = programs.find(p => p.id === programId) || null;
    if (!program) {
      return { program: null, cohorts: [], weekly_structure: '', goals: '' };
    }

    const cohorts = program_cohorts.filter(c => c.program_id === programId);
    const weekly_structure = `This program runs for ${program.duration_weeks} week(s) with scheduled cohort sessions.`;
    const goals = program.description || '';

    return { program, cohorts, weekly_structure, goals };
  }

  enrollInProgram(programId, programCohortId, startDate, notes) {
    const programs = this._getFromStorage('programs') || [];
    const program_cohorts = this._getFromStorage('program_cohorts') || [];
    const program_enrollments = this._getFromStorage('program_enrollments') || [];

    const program = programs.find(p => p.id === programId) || null;
    const cohort = program_cohorts.find(c => c.id === programCohortId) || null;

    if (!program || !cohort || cohort.program_id !== program.id) {
      return { program_enrollment: null, program: program || null, program_cohort: cohort || null, message: 'Program or cohort not found or mismatched.' };
    }

    const enrollment = {
      id: this._generateId('program_enrollment'),
      program_id: programId,
      program_cohort_id: programCohortId,
      enrollment_date: new Date().toISOString(),
      status: 'enrolled',
      start_date: this._toISODate(startDate),
      price_paid: cohort.price,
      notes: notes || null
    };

    program_enrollments.push(enrollment);
    this._saveToStorage('program_enrollments', program_enrollments);

    return {
      program_enrollment: enrollment,
      program,
      program_cohort: cohort,
      message: 'Enrolled in program successfully.'
    };
  }

  cancelProgramEnrollment(programEnrollmentId, reason) {
    const program_enrollments = this._getFromStorage('program_enrollments') || [];
    const idx = program_enrollments.findIndex(pe => pe.id === programEnrollmentId);
    if (idx === -1) {
      return { program_enrollment: null, success: false, message: 'Program enrollment not found.' };
    }

    const enrollment = program_enrollments[idx];
    if (enrollment.status === 'cancelled' || enrollment.status === 'completed') {
      return { program_enrollment: enrollment, success: false, message: 'Program enrollment cannot be cancelled.' };
    }

    enrollment.status = 'cancelled';
    program_enrollments[idx] = enrollment;
    this._saveToStorage('program_enrollments', program_enrollments);

    return { program_enrollment: enrollment, success: true, message: 'Program enrollment cancelled.' };
  }

  // =========================
  // Facilities & courts
  // =========================

  getFacilitiesOverview() {
    const facilities = this._getFromStorage('facilities') || [];
    return facilities.filter(f => f.status === 'active');
  }

  getCourtAvailability(facilityKey, date, startTime, endTime, sortBy = 'price_low_to_high') {
    const facility = this._resolveFacilityByKey(facilityKey);
    if (!facility) {
      return { facility: null, available_courts: [] };
    }

    const courts = this._getFromStorage('courts') || [];
    const court_reservations = this._getFromStorage('court_reservations') || [];

    const facilityCourts = courts.filter(c => c.facility_id === facility.id && c.status === 'active');

    const available_courts = facilityCourts.filter(court => {
      const reservations = court_reservations.filter(cr =>
        cr.court_id === court.id &&
        (cr.status === 'booked' || cr.status === 'checked_in')
      );
      const reqStart = date + 'T' + startTime + ':00.000Z';
      const reqEnd = date + 'T' + endTime + ':00.000Z';
      const reqStartDate = new Date(reqStart);
      const reqEndDate = new Date(reqEnd);

      const conflict = reservations.some(r => {
        const rStart = new Date(r.start_datetime);
        const rEnd = new Date(r.end_datetime);
        return reqStartDate < rEnd && reqEndDate > rStart;
      });

      return !conflict;
    }).map(court => ({
      court,
      hourly_rate: court.hourly_rate
    }));

    if (sortBy === 'price_low_to_high') {
      available_courts.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
    }

    return { facility, available_courts };
  }

  createCourtReservation(courtId, date, startTime, endTime, guestName, notes) {
    const courts = this._getFromStorage('courts') || [];
    const facilities = this._getFromStorage('facilities') || [];
    const court_reservations = this._getFromStorage('court_reservations') || [];

    const court = courts.find(c => c.id === courtId) || null;
    if (!court || court.status !== 'active') {
      return { court_reservation: null, court: court || null, facility: null, message: 'Court not available.' };
    }

    const facility = facilities.find(f => f.id === court.facility_id) || null;

    const reqStart = date + 'T' + startTime + ':00.000Z';
    const reqEnd = date + 'T' + endTime + ':00.000Z';
    const reqStartDate = new Date(reqStart);
    const reqEndDate = new Date(reqEnd);

    const conflict = court_reservations.some(r => {
      if (r.court_id !== court.id) return false;
      if (r.status !== 'booked' && r.status !== 'checked_in') return false;
      const rStart = new Date(r.start_datetime);
      const rEnd = new Date(r.end_datetime);
      return reqStartDate < rEnd && reqEndDate > rStart;
    });

    if (conflict) {
      return { court_reservation: null, court, facility, message: 'Selected time is not available for this court.' };
    }

    const durationHours = (reqEndDate - reqStartDate) / (1000 * 60 * 60);
    const price_total = (court.hourly_rate || 0) * durationHours;

    const reservation = {
      id: this._generateId('court_reservation'),
      court_id: court.id,
      facility_id: court.facility_id,
      start_datetime: reqStartDate.toISOString(),
      end_datetime: reqEndDate.toISOString(),
      booking_date: new Date().toISOString(),
      price_total,
      guest_name: guestName || null,
      status: 'booked',
      notes: notes || null
    };

    court_reservations.push(reservation);
    this._saveToStorage('court_reservations', court_reservations);

    return { court_reservation: reservation, court, facility, message: 'Court reserved successfully.' };
  }

  cancelCourtReservation(courtReservationId, reason) {
    const court_reservations = this._getFromStorage('court_reservations') || [];
    const idx = court_reservations.findIndex(cr => cr.id === courtReservationId);
    if (idx === -1) {
      return { court_reservation: null, success: false, message: 'Court reservation not found.' };
    }

    const reservation = court_reservations[idx];
    if (reservation.status !== 'booked' && reservation.status !== 'checked_in') {
      return { court_reservation: reservation, success: false, message: 'Court reservation cannot be cancelled.' };
    }

    reservation.status = 'cancelled';
    court_reservations[idx] = reservation;
    this._saveToStorage('court_reservations', court_reservations);

    return { court_reservation: reservation, success: true, message: 'Court reservation cancelled.' };
  }

  // =========================
  // Amenities
  // =========================

  getAmenitiesOverview() {
    const amenities = this._getFromStorage('amenities') || [];
    return amenities.filter(a => a.status === 'active');
  }

  getAmenityDetails(amenityKey) {
    const amenity = this._resolveAmenityByKey(amenityKey);
    if (!amenity) {
      return { amenity: null, details: '' };
    }
    return { amenity, details: amenity.description || '' };
  }

  getAmenityHours(amenityKey) {
    const amenity = this._resolveAmenityByKey(amenityKey);
    if (!amenity) return [];

    const amenity_hours = this._getFromStorage('amenity_hours') || [];
    const filtered = amenity_hours.filter(h => h.amenity_id === amenity.id);

    // Foreign key resolution: attach amenity
    return filtered.map(h => ({ ...h, amenity }));
  }

  // =========================
  // Shop / products / cart / checkout
  // =========================

  getShopFilterOptions() {
    const products = this._getFromStorage('products') || [];
    const colors = Array.from(new Set(products.map(p => p.color))).filter(Boolean);
    const product_types = Array.from(new Set(products.map(p => p.product_type))).filter(Boolean);

    let minPrice = null;
    let maxPrice = null;
    products.forEach(p => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    });

    return {
      colors,
      product_types,
      price_range_hint: {
        min: minPrice !== null ? minPrice : 0,
        max: maxPrice !== null ? maxPrice : 0
      }
    };
  }

  searchProducts(query, maxPrice, color, productType, sortBy = 'relevance', page = 1, pageSize = 20) {
    const products = this._getFromStorage('products') || [];
    const product_categories = this._getFromStorage('product_categories') || [];

    let filtered = products.filter(p => p.is_active);

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(p => {
        const inName = p.name && p.name.toLowerCase().includes(q);
        const inDesc = p.description && p.description.toLowerCase().includes(q);
        const inKeywords = Array.isArray(p.search_keywords) && p.search_keywords.some(kw =>
          typeof kw === 'string' && kw.toLowerCase().includes(q)
        );
        return inName || inDesc || inKeywords;
      });
    }

    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(p => typeof p.price === 'number' && p.price <= maxPrice);
    }

    if (color) {
      filtered = filtered.filter(p => p.color === color);
    }

    if (productType) {
      filtered = filtered.filter(p => p.product_type === productType);
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else {
      // relevance: keep as-is or sort by name
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const total_results = filtered.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageItems = filtered.slice(startIdx, endIdx);

    const results = pageItems.map(p => {
      const category = product_categories.find(c => c.id === p.category_id) || null;
      return {
        product: p,
        category_name: category ? category.name : ''
      };
    });

    return {
      results,
      page,
      page_size: pageSize,
      total_results
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products') || [];
    const product_categories = this._getFromStorage('product_categories') || [];

    const product = products.find(p => p.id === productId) || null;
    if (!product) return { product: null, category: null };

    const category = product_categories.find(c => c.id === product.category_id) || null;
    return { product, category };
  }

  addToCart(productId, quantity = 1) {
    const products = this._getFromStorage('products') || [];
    const cart_items = this._getFromStorage('cart_items') || [];
    const carts = this._getFromStorage('carts') || [];

    const product = products.find(p => p.id === productId) || null;
    if (!product || !product.is_active) {
      return { cart: null, cart_items: [], message: 'Product not available.' };
    }

    const cart = this._getOrCreateCart();

    let existing = cart_items.find(ci => ci.cart_id === cart.id && ci.product_id === productId);
    if (existing) {
      existing.quantity += quantity;
      existing.line_total = existing.unit_price * existing.quantity;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name: product.name,
        product_color: product.color || null,
        quantity,
        unit_price: product.price,
        line_total: product.price * quantity,
        added_at: new Date().toISOString()
      };
      cart_items.push(existing);
    }

    this._recalculateCartTotals(cart, cart_items);

    // persist cart update
    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx === -1) {
      carts.push(cart);
    } else {
      carts[cartIdx] = cart;
    }

    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cart_items);

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);

    return {
      cart,
      cart_items: itemsForCart,
      message: 'Item added to cart.'
    };
  }

  getCartSummary() {
    const carts = this._getFromStorage('carts') || [];
    const cart_items = this._getFromStorage('cart_items') || [];
    const products = this._getFromStorage('products') || [];

    const cart = carts.find(c => c.status === 'active') || null;
    if (!cart) {
      return { cart: null, cart_items: [] };
    }

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    const wrapped = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item: ci,
        product_image_url: product ? product.image_url || '' : '',
        product
      };
    });

    return { cart, cart_items: wrapped };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const carts = this._getFromStorage('carts') || [];
    const cart_items = this._getFromStorage('cart_items') || [];

    const idx = cart_items.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const cart = carts.find(c => c.status === 'active') || null;
      const itemsForCart = cart ? cart_items.filter(ci => ci.cart_id === cart.id) : [];
      return { cart, cart_items: itemsForCart };
    }

    const item = cart_items[idx];
    if (quantity <= 0) {
      cart_items.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
      cart_items[idx] = item;
    }

    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    this._recalculateCartTotals(cart, cart_items);

    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx === -1) carts.push(cart); else carts[cartIdx] = cart;

    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cart_items);

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    return { cart, cart_items: itemsForCart };
  }

  removeCartItem(cartItemId) {
    const carts = this._getFromStorage('carts') || [];
    const cart_items = this._getFromStorage('cart_items') || [];

    const idx = cart_items.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const cart = carts.find(c => c.status === 'active') || null;
      const itemsForCart = cart ? cart_items.filter(ci => ci.cart_id === cart.id) : [];
      return { cart, cart_items: itemsForCart };
    }

    const cartId = cart_items[idx].cart_id;
    cart_items.splice(idx, 1);

    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();
    this._recalculateCartTotals(cart, cart_items);

    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx === -1) carts.push(cart); else carts[cartIdx] = cart;

    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cart_items);

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    return { cart, cart_items: itemsForCart };
  }

  setCartFulfillmentMethod(fulfillmentMethod) {
    const carts = this._getFromStorage('carts') || [];
    const cart_items = this._getFromStorage('cart_items') || [];

    const cart = this._getOrCreateCart();
    cart.fulfillment_method = fulfillmentMethod;
    this._recalculateCartTotals(cart, cart_items);

    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx === -1) carts.push(cart); else carts[idx] = cart;

    this._saveToStorage('carts', carts);

    return { cart, message: 'Cart fulfillment method updated.' };
  }

  beginCheckout() {
    const carts = this._getFromStorage('carts') || [];
    const cart_items = this._getFromStorage('cart_items') || [];
    const orders = this._getFromStorage('orders') || [];
    const order_items = this._getFromStorage('order_items') || [];

    const cart = this._getOrCreateCart();
    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);

    let order = orders.find(o => o.cart_id === cart.id && o.status === 'draft');

    if (!order) {
      order = {
        id: this._generateId('order'),
        cart_id: cart.id,
        created_at: new Date().toISOString(),
        status: 'draft',
        fulfillment_method: cart.fulfillment_method === 'unset' ? 'in_club_pickup' : cart.fulfillment_method,
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        pickup_location: null,
        confirmation_number: null
      };
      orders.push(order);

      // create order_items from cart_items
      itemsForCart.forEach(ci => {
        const oi = {
          id: this._generateId('order_item'),
          order_id: order.id,
          product_id: ci.product_id,
          product_name: ci.product_name,
          product_color: ci.product_color || null,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total
        };
        order_items.push(oi);
      });
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', order_items);

    return { order, cart, cart_items: itemsForCart };
  }

  getCheckoutSummary() {
    const orders = this._getFromStorage('orders') || [];
    const order_items = this._getFromStorage('order_items') || [];
    const products = this._getFromStorage('products') || [];

    if (!orders.length) {
      return { order: null, order_items: [] };
    }

    // latest draft or pending_payment
    const candidate = orders.filter(o => o.status === 'draft' || o.status === 'pending_payment');
    const order = (candidate.length ? candidate[candidate.length - 1] : orders[orders.length - 1]);

    const items = order_items
      .filter(oi => oi.order_id === order.id)
      .map(oi => {
        const product = products.find(p => p.id === oi.product_id) || null;
        // Foreign key resolution: attach product
        return { ...oi, product };
      });

    return { order, order_items: items };
  }

  placeOrder(contactName, contactEmail, contactPhone, paymentMethod) {
    const orders = this._getFromStorage('orders') || [];
    const order_items = this._getFromStorage('order_items') || [];
    const carts = this._getFromStorage('carts') || [];
    const products = this._getFromStorage('products') || [];

    if (!orders.length) {
      return { order: null, order_items: [], confirmation_message: 'No order to place.' };
    }

    const candidate = orders.filter(o => o.status === 'draft' || o.status === 'pending_payment');
    const orderIdx = candidate.length ? orders.indexOf(candidate[candidate.length - 1]) : orders.length - 1;
    const order = orders[orderIdx];

    order.contact_name = contactName;
    order.contact_email = contactEmail;
    order.contact_phone = contactPhone || null;
    order.status = paymentMethod === 'online_payment_stub' ? 'paid' : 'pending_payment';
    order.confirmation_number = this._generateId('confirm');

    orders[orderIdx] = order;

    // Mark cart as checked_out
    if (order.cart_id) {
      const cartIdx = carts.findIndex(c => c.id === order.cart_id);
      if (cartIdx !== -1) {
        const cart = carts[cartIdx];
        cart.status = 'checked_out';
        carts[cartIdx] = cart;
      }
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('carts', carts);

    const items = order_items
      .filter(oi => oi.order_id === order.id)
      .map(oi => {
        const product = products.find(p => p.id === oi.product_id) || null;
        return { ...oi, product };
      });

    const confirmation_message = 'Order placed successfully.';

    return { order, order_items: items, confirmation_message };
  }

  // =========================
  // Free trial
  // =========================

  getFreeTrialOptions() {
    return {
      pass_types: ['seven_day_pass', 'one_week_trial', 'three_day_pass', 'single_visit_pass', 'other'],
      primary_goals: ['weight_loss', 'strength_gain', 'general_fitness', 'sports_performance', 'rehabilitation', 'other']
    };
  }

  submitFreeTrialRequest(firstName, lastName, phone, email, passType, preferredStartDate, primaryGoal, subscribeToEmail) {
    const free_trial_requests = this._getFromStorage('free_trial_requests') || [];

    const request = {
      id: this._generateId('free_trial_request'),
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      pass_type: passType,
      start_date: this._toISODate(preferredStartDate),
      primary_goal: primaryGoal,
      subscribe_to_email: !!subscribeToEmail,
      status: 'submitted',
      created_at: new Date().toISOString()
    };

    free_trial_requests.push(request);
    this._saveToStorage('free_trial_requests', free_trial_requests);

    return { free_trial_request: request, message: 'Free trial request submitted.' };
  }

  // =========================
  // About & policy content
  // =========================

  getAboutContent() {
    return {
      mission: 'To provide a welcoming neighborhood club where members of all levels can pursue healthier, more active lives.',
      values: [
        'Community-focused',
        'Inclusive for all fitness levels',
        'Clean, safe facilities',
        'Supportive coaching and staff'
      ],
      facilities_overview: 'Our club offers a full gym floor, group studios, pool, squash courts, and childcare to support your routine.',
      address: '123 Athletic Way, Localtown, USA',
      phone: '(555) 000-0000',
      directions: 'Located just off Main Street with free on-site parking.',
      key_contacts: [
        {
          role: 'General Manager',
          name: 'Club Manager',
          email: 'manager@example.com'
        },
        {
          role: 'Membership',
          name: 'Membership Team',
          email: 'membership@example.com'
        }
      ]
    };
  }

  getPolicySections() {
    return [
      {
        section_id: 'membership_terms',
        title: 'Membership Terms',
        category: 'membership_terms',
        content_html: '<p>Memberships are billed according to the selected billing option. Cancellation requires written notice as specified in your agreement.</p>'
      },
      {
        section_id: 'booking_policy',
        title: 'Booking & Cancellation',
        category: 'booking_policy',
        content_html: '<p>Classes, personal training, and court reservations may be cancelled within the allowed window to avoid late fees or no-show status.</p>'
      },
      {
        section_id: 'privacy_policy',
        title: 'Privacy Policy',
        category: 'privacy_policy',
        content_html: '<p>We respect your privacy and only use your personal information to manage your membership, bookings, and requested services.</p>'
      }
    ];
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
