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
  }

  // Initialize all data tables in localStorage if not exist
  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    const ensureObjectKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    };

    // Core entity storage
    ensureArrayKey('profiles');
    ensureArrayKey('interest_options');
    ensureArrayKey('membership_categories');
    ensureArrayKey('dues_plans');
    ensureArrayKey('membership_applications');
    ensureArrayKey('events');
    ensureArrayKey('event_registrations');
    ensureArrayKey('health_plans');
    ensureArrayKey('saved_health_plans');
    ensureArrayKey('grievances');
    ensureArrayKey('districts');
    ensureArrayKey('representatives');
    ensureArrayKey('messages');
    ensureArrayKey('payment_methods');
    ensureArrayKey('recurring_donations');
    ensureArrayKey('cbas');
    ensureArrayKey('cba_articles');
    ensureArrayKey('saved_articles');

    // Supporting / config storage
    ensureArrayKey('alerts');
    ensureArrayKey('contact_inquiries');
    ensureArrayKey('health_plan_compare_set');

    ensureObjectKey('user_context');
    ensureObjectKey('pac_overview');
    ensureObjectKey('benefits_overview');
    ensureObjectKey('donation_options');
    ensureObjectKey('static_pages');

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
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

  _parseDateTime(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
  }

  _formatDateISO(date) {
    if (!(date instanceof Date)) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  _formatTimeHHMM(date) {
    if (!(date instanceof Date)) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  _isWeekday(date) {
    if (!(date instanceof Date)) return false;
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  _getOrInitializeHealthPlanCompareSet() {
    let ids = this._getFromStorage('health_plan_compare_set', []);
    if (!Array.isArray(ids)) {
      ids = [];
    }
    this._saveToStorage('health_plan_compare_set', ids);
    return ids;
  }

  _getOrInitializeUserContext() {
    let ctx = this._getFromStorage('user_context', null);
    if (!ctx || typeof ctx !== 'object') {
      ctx = {};
      this._saveToStorage('user_context', ctx);
    }
    return ctx;
  }

  _resolveEventRegistrationKind(event) {
    if (!event || !event.event_type) {
      return 'training_registration';
    }
    if (event.event_type === 'training') return 'training_registration';
    if (event.event_type === 'union_meeting') return 'meeting_rsvp';
    return 'training_registration';
  }

  // Resolve foreign keys for arrays of objects with specific id fields
  _resolveForeignKeysForArray(items) {
    if (!Array.isArray(items)) return [];

    // Preload reference tables
    const membershipCategories = this._getFromStorage('membership_categories', []);
    const duesPlans = this._getFromStorage('dues_plans', []);
    const events = this._getFromStorage('events', []);
    const districts = this._getFromStorage('districts', []);
    const representatives = this._getFromStorage('representatives', []);
    const healthPlans = this._getFromStorage('health_plans', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const cbas = this._getFromStorage('cbas', []);
    const cbaArticles = this._getFromStorage('cba_articles', []);

    return items.map((item) => {
      const result = { ...item };

      // Generic per-entity handling based on known foreign key fields
      if (Object.prototype.hasOwnProperty.call(result, 'membership_category_id')) {
        result.membership_category =
          membershipCategories.find((c) => c.id === result.membership_category_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'dues_plan_id')) {
        result.dues_plan = duesPlans.find((d) => d.id === result.dues_plan_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'event_id')) {
        result.event = events.find((e) => e.id === result.event_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'district_id')) {
        result.district = districts.find((d) => d.id === result.district_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'representative_id')) {
        result.representative =
          representatives.find((r) => r.id === result.representative_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'health_plan_id')) {
        result.health_plan = healthPlans.find((h) => h.id === result.health_plan_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'payment_method_id')) {
        result.payment_method =
          paymentMethods.find((p) => p.id === result.payment_method_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'cba_id')) {
        result.cba = cbas.find((c) => c.id === result.cba_id) || null;
      }

      if (Object.prototype.hasOwnProperty.call(result, 'cba_article_id')) {
        result.cba_article =
          cbaArticles.find((a) => a.id === result.cba_article_id) || null;
      }

      return result;
    });
  }

  // =========================
  // Interface implementations
  // =========================

  // getHomepageHighlights()
  getHomepageHighlights() {
    const now = new Date();
    const events = this._getFromStorage('events', []);
    const alerts = this._getFromStorage('alerts', []);

    const upcomingTrainings = events
      .filter((e) =>
        e.event_type === 'training' &&
        e.visible_in_listings === true &&
        this._parseDateTime(e.start_datetime) >= now
      )
      .sort((a, b) =>
        this._parseDateTime(a.start_datetime) - this._parseDateTime(b.start_datetime)
      )
      .slice(0, 5)
      .map((e) => {
        const dt = this._parseDateTime(e.start_datetime);
        return {
          ...e,
          start_date_display: this._formatDateISO(dt),
          start_time_display: this._formatTimeHHMM(dt)
        };
      });

    const upcomingUnionMeetings = events
      .filter((e) =>
        e.event_type === 'union_meeting' &&
        e.visible_in_listings === true &&
        this._parseDateTime(e.start_datetime) >= now
      )
      .sort((a, b) =>
        this._parseDateTime(a.start_datetime) - this._parseDateTime(b.start_datetime)
      )
      .slice(0, 5)
      .map((e) => {
        const dt = this._parseDateTime(e.start_datetime);
        return {
          ...e,
          start_date_display: this._formatDateISO(dt),
          start_time_display: this._formatTimeHHMM(dt)
        };
      });

    const importantAlerts = alerts
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      upcoming_trainings: upcomingTrainings,
      upcoming_union_meetings: upcomingUnionMeetings,
      important_alerts: importantAlerts
    };
  }

  // getQuickAccessSummary()
  getQuickAccessSummary() {
    const membershipApplications = this._getFromStorage('membership_applications', []);
    const grievances = this._getFromStorage('grievances', []);
    const eventRegistrations = this._getFromStorage('event_registrations', []);
    const events = this._getFromStorage('events', []);
    const representatives = this._getFromStorage('representatives', []);

    let membershipStatus = 'not_member';
    const hasApproved = membershipApplications.some((a) => a.status === 'approved');
    const hasSubmitted = membershipApplications.some((a) => a.status === 'submitted');
    if (hasApproved) {
      membershipStatus = 'active';
    } else if (hasSubmitted) {
      membershipStatus = 'pending';
    }

    const pendingMembershipApplications = membershipApplications.filter(
      (a) => a.status === 'submitted'
    ).length;

    const openGrievancesCount = grievances.filter(
      (g) => g.status !== 'resolved' && g.status !== 'closed'
    ).length;

    const now = new Date();
    const upcomingEventsCount = eventRegistrations.filter((reg) => {
      if (reg.status !== 'registered') return false;
      const event = events.find((e) => e.id === reg.event_id);
      if (!event) return false;
      const start = this._parseDateTime(event.start_datetime);
      return start >= now;
    }).length;

    const hasAssignedRepresentative = representatives.some(
      (r) => r.role === 'district_representative' && r.is_active === true
    );

    return {
      membership_status: membershipStatus,
      pending_membership_applications: pendingMembershipApplications,
      open_grievances_count: openGrievancesCount,
      upcoming_events_count: upcomingEventsCount,
      has_assigned_representative: hasAssignedRepresentative
    };
  }

  // getMembershipCategories()
  getMembershipCategories() {
    const categories = this._getFromStorage('membership_categories', []);
    return categories
      .filter((c) => c.is_active !== false)
      .sort((a, b) => {
        const ao = a.display_order || 0;
        const bo = b.display_order || 0;
        if (ao !== bo) return ao - bo;
        return (a.name || '').localeCompare(b.name || '');
      });
  }

  // getDuesPlanFilterOptions()
  getDuesPlanFilterOptions() {
    const duesPlans = this._getFromStorage('dues_plans', []);
    const activePlans = duesPlans.filter((p) => p.is_active !== false);

    const billingFrequenciesSet = new Set();
    let minAmount = null;
    let maxAmount = null;

    activePlans.forEach((p) => {
      if (p.billing_frequency) billingFrequenciesSet.add(p.billing_frequency);
      if (typeof p.amount === 'number') {
        if (minAmount === null || p.amount < minAmount) minAmount = p.amount;
        if (maxAmount === null || p.amount > maxAmount) maxAmount = p.amount;
      }
    });

    return {
      billing_frequencies: Array.from(billingFrequenciesSet),
      amount_range: {
        min_amount: minAmount,
        max_amount: maxAmount,
        currency: 'usd'
      }
    };
  }

  // getDuesPlans(membershipCategoryId, billingFrequency, maxAmount, sortBy)
  getDuesPlans(membershipCategoryId, billingFrequency, maxAmount, sortBy) {
    const duesPlans = this._getFromStorage('dues_plans', []);
    const membershipCategories = this._getFromStorage('membership_categories', []);

    let result = duesPlans.filter((p) => p.is_active !== false);

    if (membershipCategoryId) {
      result = result.filter((p) => p.membership_category_id === membershipCategoryId);
    }

    if (billingFrequency) {
      result = result.filter((p) => p.billing_frequency === billingFrequency);
    }

    if (typeof maxAmount === 'number') {
      result = result.filter((p) => typeof p.amount === 'number' && p.amount <= maxAmount);
    }

    const sortKey = sortBy || 'amount_asc';
    result = result.slice().sort((a, b) => {
      if (sortKey === 'amount_desc') {
        if (a.amount !== b.amount) return b.amount - a.amount;
      } else if (sortKey === 'display_order') {
        const ao = a.display_order || 0;
        const bo = b.display_order || 0;
        if (ao !== bo) return ao - bo;
      } else {
        // amount_asc default
        if (a.amount !== b.amount) return a.amount - b.amount;
      }
      const ao2 = a.display_order || 0;
      const bo2 = b.display_order || 0;
      if (ao2 !== bo2) return ao2 - bo2;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Resolve foreign keys
    result = result.map((plan) => ({
      ...plan,
      membership_category:
        membershipCategories.find((c) => c.id === plan.membership_category_id) || null
    }));

    return result;
  }

  // getDuesPlanDetails(duesPlanId)
  getDuesPlanDetails(duesPlanId) {
    const duesPlans = this._getFromStorage('dues_plans', []);
    const membershipCategories = this._getFromStorage('membership_categories', []);

    const plan = duesPlans.find((p) => p.id === duesPlanId) || null;
    if (!plan) {
      return { dues_plan: null, membership_category: null };
    }

    const membershipCategory =
      membershipCategories.find((c) => c.id === plan.membership_category_id) || null;

    const planWithResolved = {
      ...plan,
      membership_category: membershipCategory
    };

    return { dues_plan: planWithResolved, membership_category: membershipCategory };
  }

  // submitMembershipApplication(duesPlanId, firstName, lastName, agencyDepartment, email, badgeId, preferredContactMethod)
  submitMembershipApplication(
    duesPlanId,
    firstName,
    lastName,
    agencyDepartment,
    email,
    badgeId,
    preferredContactMethod
  ) {
    const duesPlans = this._getFromStorage('dues_plans', []);
    const applications = this._getFromStorage('membership_applications', []);

    const duesPlan = duesPlans.find((p) => p.id === duesPlanId);
    if (!duesPlan) {
      return {
        success: false,
        application: null,
        message: 'Selected dues plan not found.'
      };
    }

    const allowedContactMethods = ['email', 'phone', 'text', 'text_email'];
    const contactMethod = allowedContactMethods.includes(preferredContactMethod)
      ? preferredContactMethod
      : 'email';

    const nowIso = new Date().toISOString();
    const application = {
      id: this._generateId('membership_application'),
      dues_plan_id: duesPlanId,
      first_name: firstName,
      last_name: lastName,
      agency_department: agencyDepartment,
      email: email,
      badge_id: badgeId,
      preferred_contact_method: contactMethod,
      status: 'submitted',
      created_at: nowIso,
      submitted_at: nowIso
    };

    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    return {
      success: true,
      application: application,
      message: 'Membership application submitted successfully.'
    };
  }

  // searchEvents(eventType, format, zip, radiusMiles, keyword, topic, dateFrom, dateTo, weekdayOnly, weekendOnly, startTimeFrom, upcomingOnly, sortBy)
  searchEvents(
    eventType,
    format,
    zip,
    radiusMiles,
    keyword,
    topic,
    dateFrom,
    dateTo,
    weekdayOnly,
    weekendOnly,
    startTimeFrom,
    upcomingOnly,
    sortBy
  ) {
    let events = this._getFromStorage('events', []);

    if (eventType) {
      events = events.filter((e) => e.event_type === eventType);
    }

    if (format) {
      events = events.filter((e) => e.format === format);
    }

    if (zip) {
      // Simplified: filter by exact ZIP match; radiusMiles is not spatially computed
      events = events.filter((e) => e.zip === zip);
    }

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      events = events.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const topicStr = (e.topic || '').toLowerCase();
        const keywordsArr = Array.isArray(e.keywords) ? e.keywords : [];
        const kwStrs = keywordsArr.map((k) => String(k).toLowerCase());
        return (
          title.includes(kw) ||
          desc.includes(kw) ||
          topicStr.includes(kw) ||
          kwStrs.some((k) => k.includes(kw))
        );
      });
    }

    if (topic) {
      const t = String(topic).toLowerCase();
      events = events.filter((e) => (e.topic || '').toLowerCase() === t);
    }

    if (dateFrom) {
      const fromDate = this._parseDateTime(dateFrom);
      events = events.filter((e) => this._parseDateTime(e.start_datetime) >= fromDate);
    }

    if (dateTo) {
      const toDate = this._parseDateTime(dateTo);
      events = events.filter((e) => this._parseDateTime(e.start_datetime) <= toDate);
    }

    if (weekdayOnly) {
      events = events.filter((e) => this._isWeekday(this._parseDateTime(e.start_datetime)));
    }

    if (weekendOnly) {
      events = events.filter((e) => !this._isWeekday(this._parseDateTime(e.start_datetime)));
    }

    if (startTimeFrom) {
      const [hStr, mStr] = String(startTimeFrom).split(':');
      const minH = parseInt(hStr || '0', 10);
      const minM = parseInt(mStr || '0', 10);
      events = events.filter((e) => {
        const dt = this._parseDateTime(e.start_datetime);
        if (!(dt instanceof Date)) return false;
        const h = dt.getHours();
        const m = dt.getMinutes();
        return h > minH || (h === minH && m >= minM);
      });
    }

    if (upcomingOnly) {
      const now = new Date();
      const upcomingEvents = events.filter((e) => this._parseDateTime(e.start_datetime) >= now);
      // If no events are strictly in the future, fall back to the broader result set
      if (upcomingEvents.length > 0) {
        events = upcomingEvents;
      }
    }

    const sortKey = sortBy || 'start_datetime_asc';
    events = events.slice().sort((a, b) => {
      const aDt = this._parseDateTime(a.start_datetime);
      const bDt = this._parseDateTime(b.start_datetime);
      if (sortKey === 'start_datetime_desc') {
        return bDt - aDt;
      }
      return aDt - bDt;
    });

    return events;
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        is_weekday: false,
        start_date_display: '',
        start_time_display: ''
      };
    }

    const dt = this._parseDateTime(event.start_datetime);
    return {
      event: event,
      is_weekday: this._isWeekday(dt),
      start_date_display: this._formatDateISO(dt),
      start_time_display: this._formatTimeHHMM(dt)
    };
  }

  // registerForEvent(eventId, quantity = 1, addToMyList = true)
  registerForEvent(eventId, quantity, addToMyList) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        registration: null,
        event: null,
        success: false,
        message: 'Event not found.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const addFlag = addToMyList === undefined ? true : !!addToMyList;

    let status = 'registered';
    if (
      typeof event.remaining_capacity === 'number' &&
      event.remaining_capacity < qty
    ) {
      status = 'waitlisted';
    }

    if (status === 'registered' && typeof event.remaining_capacity === 'number') {
      event.remaining_capacity = Math.max(0, event.remaining_capacity - qty);
      this._saveToStorage('events', events);
    }

    const nowIso = new Date().toISOString();
    const registration = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      registration_kind: this._resolveEventRegistrationKind(event),
      quantity: qty,
      status: status,
      added_to_my_list: addFlag,
      created_at: nowIso
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const registrationWithEvent = {
      ...registration,
      event: event
    };

    return {
      registration: registrationWithEvent,
      event: event,
      success: true,
      message: 'Registration completed.'
    };
  }

  // getBenefitsOverview()
  getBenefitsOverview() {
    const stored = this._getFromStorage('benefits_overview', {});
    if (stored && stored.categories) {
      return stored;
    }

    // Fallback basic structure if nothing configured
    return {
      categories: [
        {
          key: 'health_insurance',
          title: 'Health Insurance',
          description: 'Medical coverage options for members.',
          highlight_count: 0
        },
        {
          key: 'dental',
          title: 'Dental',
          description: 'Dental benefit options.',
          highlight_count: 0
        },
        {
          key: 'vision',
          title: 'Vision',
          description: 'Vision care coverage.',
          highlight_count: 0
        },
        {
          key: 'other_benefits',
          title: 'Other Benefits',
          description: 'Additional member benefits.',
          highlight_count: 0
        }
      ]
    };
  }

  // getHealthPlanFilterOptions()
  getHealthPlanFilterOptions() {
    const plans = this._getFromStorage('health_plans', []);
    const activePlans = plans.filter((p) => p.is_active !== false);

    const coverageTypesSet = new Set();
    let minPremium = null;
    let maxPremium = null;

    activePlans.forEach((p) => {
      if (p.coverage_type) coverageTypesSet.add(p.coverage_type);
      if (typeof p.monthly_premium === 'number') {
        if (minPremium === null || p.monthly_premium < minPremium) {
          minPremium = p.monthly_premium;
        }
        if (maxPremium === null || p.monthly_premium > maxPremium) {
          maxPremium = p.monthly_premium;
        }
      }
    });

    return {
      coverage_types: Array.from(coverageTypesSet),
      premium_range: {
        min_premium: minPremium,
        max_premium: maxPremium
      }
    };
  }

  // searchHealthPlans(coverageType, minPremium, maxPremium, sortBy)
  searchHealthPlans(coverageType, minPremium, maxPremium, sortBy) {
    let plans = this._getFromStorage('health_plans', []);
    plans = plans.filter((p) => p.is_active !== false);

    if (coverageType) {
      plans = plans.filter((p) => p.coverage_type === coverageType);
    }

    if (typeof minPremium === 'number') {
      plans = plans.filter(
        (p) => typeof p.monthly_premium === 'number' && p.monthly_premium >= minPremium
      );
    }

    if (typeof maxPremium === 'number') {
      plans = plans.filter(
        (p) => typeof p.monthly_premium === 'number' && p.monthly_premium <= maxPremium
      );
    }

    const sortKey = sortBy || 'premium_asc';
    plans = plans.slice().sort((a, b) => {
      if (sortKey === 'deductible_asc') {
        return (a.annual_deductible || 0) - (b.annual_deductible || 0);
      }
      if (sortKey === 'deductible_desc') {
        return (b.annual_deductible || 0) - (a.annual_deductible || 0);
      }
      if (sortKey === 'premium_desc') {
        return (b.monthly_premium || 0) - (a.monthly_premium || 0);
      }
      // premium_asc default
      return (a.monthly_premium || 0) - (b.monthly_premium || 0);
    });

    return plans;
  }

  // getHealthPlanDetails(healthPlanId)
  getHealthPlanDetails(healthPlanId) {
    const plans = this._getFromStorage('health_plans', []);
    return plans.find((p) => p.id === healthPlanId) || null;
  }

  // addHealthPlanToCompare(healthPlanId)
  addHealthPlanToCompare(healthPlanId) {
    const plans = this._getFromStorage('health_plans', []);
    const plan = plans.find((p) => p.id === healthPlanId);

    if (!plan) {
      return {
        success: false,
        current_compare_plans: [],
        message: 'Health plan not found.'
      };
    }

    let compareSet = this._getOrInitializeHealthPlanCompareSet();

    if (!compareSet.includes(healthPlanId)) {
      compareSet.push(healthPlanId);
      // Limit comparison set to 3 plans
      if (compareSet.length > 3) {
        compareSet = compareSet.slice(compareSet.length - 3);
      }
      this._saveToStorage('health_plan_compare_set', compareSet);
    }

    const currentComparePlans = plans.filter((p) => compareSet.includes(p.id));

    return {
      success: true,
      current_compare_plans: currentComparePlans,
      message: 'Health plan added to comparison.'
    };
  }

  // getHealthPlanComparison()
  getHealthPlanComparison() {
    const plans = this._getFromStorage('health_plans', []);
    const compareIds = this._getOrInitializeHealthPlanCompareSet();
    const comparePlans = plans.filter((p) => compareIds.includes(p.id));

    return {
      plans: comparePlans,
      comparison_metrics: {
        highlight_field: 'annual_deductible'
      }
    };
  }

  // saveHealthPlan(healthPlanId, source)
  saveHealthPlan(healthPlanId, source) {
    const plans = this._getFromStorage('health_plans', []);
    const plan = plans.find((p) => p.id === healthPlanId);
    const saved = this._getFromStorage('saved_health_plans', []);

    if (!plan) {
      return null;
    }

    const existing = saved.find((s) => s.health_plan_id === healthPlanId);
    if (existing) {
      return existing;
    }

    const savedPlan = {
      id: this._generateId('saved_health_plan'),
      health_plan_id: healthPlanId,
      source: source || 'other',
      saved_at: new Date().toISOString()
    };

    saved.push(savedPlan);
    this._saveToStorage('saved_health_plans', saved);

    return savedPlan;
  }

  // getSavedHealthPlans()
  getSavedHealthPlans() {
    const saved = this._getFromStorage('saved_health_plans', []);
    const withResolved = this._resolveForeignKeysForArray(saved);
    return withResolved;
  }

  // getGrievanceDashboardSummary()
  getGrievanceDashboardSummary() {
    const grievancesRaw = this._getFromStorage('grievances', []);
    const grievances = grievancesRaw.slice();

    const total = grievances.length;
    const openCount = grievances.filter(
      (g) => g.status !== 'resolved' && g.status !== 'closed'
    ).length;

    const recent = grievances
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const recentResolved = this._resolveForeignKeysForArray(recent);

    return {
      total_grievances: total,
      open_grievances: openCount,
      recent_grievances: recentResolved
    };
  }

  // getMyGrievances(status, grievanceType, sortBy)
  getMyGrievances(status, grievanceType, sortBy) {
    let grievances = this._getFromStorage('grievances', []);

    if (status) {
      grievances = grievances.filter((g) => g.status === status);
    }

    if (grievanceType) {
      grievances = grievances.filter((g) => g.grievance_type === grievanceType);
    }

    const sortKey = sortBy || 'created_at_desc';
    grievances = grievances.slice().sort((a, b) => {
      if (sortKey === 'incident_date_desc') {
        return new Date(b.incident_date) - new Date(a.incident_date);
      }
      if (sortKey === 'incident_date_asc') {
        return new Date(a.incident_date) - new Date(b.incident_date);
      }
      if (sortKey === 'created_at_asc') {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      // created_at_desc default
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const withResolved = this._resolveForeignKeysForArray(grievances);
    return withResolved;
  }

  // listDistricts()
  listDistricts() {
    const districts = this._getFromStorage('districts', []);
    return districts;
  }

  // listRepresentatives(districtId, role, onlyActive = true)
  listRepresentatives(districtId, role, onlyActive) {
    const reps = this._getFromStorage('representatives', []);
    const districts = this._getFromStorage('districts', []);

    let result = reps.slice();

    const onlyActiveFlag = onlyActive === undefined ? true : !!onlyActive;

    if (onlyActiveFlag) {
      result = result.filter((r) => r.is_active !== false);
    }

    if (districtId) {
      result = result.filter((r) => r.district_id === districtId);
    }

    if (role) {
      result = result.filter((r) => r.role === role);
    }

    result = result.map((r) => ({
      ...r,
      district: districts.find((d) => d.id === r.district_id) || null
    }));

    return result;
  }

  // submitGrievance(grievanceType, incidentDate, subject, description, districtId, representativeId, priority, trackInMyCases)
  submitGrievance(
    grievanceType,
    incidentDate,
    subject,
    description,
    districtId,
    representativeId,
    priority,
    trackInMyCases
  ) {
    const grievances = this._getFromStorage('grievances', []);

    const allowedTypes = [
      'scheduling_overtime',
      'pay_benefits',
      'discipline',
      'harassment',
      'safety',
      'other'
    ];
    if (!allowedTypes.includes(grievanceType)) {
      return {
        grievance: null,
        success: false,
        message: 'Invalid grievance type.'
      };
    }

    const allowedPriorities = ['low', 'normal', 'high', 'urgent'];
    const priorityVal = allowedPriorities.includes(priority) ? priority : 'normal';

    const nowIso = new Date().toISOString();
    const incidentIso = new Date(incidentDate).toISOString();

    const grievance = {
      id: this._generateId('grievance'),
      grievance_type: grievanceType,
      incident_date: incidentIso,
      subject: subject,
      description: description,
      district_id: districtId || null,
      representative_id: representativeId || null,
      priority: priorityVal,
      status: 'submitted',
      track_in_my_cases: trackInMyCases === undefined ? true : !!trackInMyCases,
      created_at: nowIso,
      submitted_at: nowIso
    };

    grievances.push(grievance);
    this._saveToStorage('grievances', grievances);

    return {
      grievance: grievance,
      success: true,
      message: 'Grievance submitted.'
    };
  }

  // getRepresentativesDirectory()
  getRepresentativesDirectory() {
    const districts = this._getFromStorage('districts', []);
    const reps = this._getFromStorage('representatives', []);

    const repsWithDistrict = reps.map((r) => ({
      ...r,
      district: districts.find((d) => d.id === r.district_id) || null
    }));

    return {
      districts: districts,
      representatives: repsWithDistrict
    };
  }

  // getRepresentativeProfile(representativeId)
  getRepresentativeProfile(representativeId) {
    const districts = this._getFromStorage('districts', []);
    const reps = this._getFromStorage('representatives', []);

    const representative = reps.find((r) => r.id === representativeId) || null;
    if (!representative) {
      return { representative: null, district: null };
    }

    const district = districts.find((d) => d.id === representative.district_id) || null;
    const repWithDistrict = { ...representative, district: district };

    return {
      representative: repWithDistrict,
      district: district
    };
  }

  // sendMessageToRepresentative(representativeId, category, subject, body)
  sendMessageToRepresentative(representativeId, category, subject, body) {
    const reps = this._getFromStorage('representatives', []);
    const messages = this._getFromStorage('messages', []);

    const representative = reps.find((r) => r.id === representativeId);
    if (!representative) {
      return {
        messageRecord: null,
        success: false,
        confirmation_text: 'Representative not found.'
      };
    }

    const allowedCategories = [
      'contract_question',
      'grievance_follow_up',
      'general_question',
      'training_question',
      'benefits_question',
      'other'
    ];
    const categoryVal = allowedCategories.includes(category)
      ? category
      : 'other';

    const messageRecord = {
      id: this._generateId('message'),
      representative_id: representativeId,
      category: categoryVal,
      subject: subject,
      body: body,
      sent_at: new Date().toISOString(),
      status: 'sent'
    };

    messages.push(messageRecord);
    this._saveToStorage('messages', messages);

    return {
      messageRecord: messageRecord,
      success: true,
      confirmation_text: 'Your message has been sent.'
    };
  }

  // getUnionMeetingsFilterOptions()
  getUnionMeetingsFilterOptions() {
    return {
      timeframes: ['upcoming', 'this_month', 'next_month']
    };
  }

  // getPacOverview()
  getPacOverview() {
    const stored = this._getFromStorage('pac_overview', {});
    if (stored && (stored.headline || stored.body || stored.suggested_monthly_amounts)) {
      return stored;
    }

    // Fallback basic structure
    return {
      headline: 'Support our Political Action Committee',
      body: 'Contributions help advocate for officers and public safety.',
      suggested_monthly_amounts: [10, 25, 40, 50]
    };
  }

  // listSavedPaymentMethods()
  listSavedPaymentMethods() {
    const methods = this._getFromStorage('payment_methods', []);
    return methods.filter((m) => m.is_active !== false);
  }

  // getDonationOptions()
  getDonationOptions() {
    const stored = this._getFromStorage('donation_options', {});
    if (stored && stored.frequencies && stored.designations) {
      return stored;
    }

    // Fallback based on enum definitions
    return {
      frequencies: ['monthly', 'quarterly', 'annually'],
      designations: ['pac', 'political_action', 'general_fund', 'other'],
      min_amount: 1,
      max_amount: 100000
    };
  }

  // createRecurringDonation(amount, frequency, startDate, designation, paymentMethodId)
  createRecurringDonation(amount, frequency, startDate, designation, paymentMethodId) {
    const methods = this._getFromStorage('payment_methods', []);
    const donations = this._getFromStorage('recurring_donations', []);

    const paymentMethod = methods.find((m) => m.id === paymentMethodId);
    if (!paymentMethod || paymentMethod.is_active === false) {
      return {
        recurring_donation: null,
        success: false,
        message: 'Payment method not found or inactive.'
      };
    }

    const allowedFrequencies = ['monthly', 'quarterly', 'annually'];
    if (!allowedFrequencies.includes(frequency)) {
      return {
        recurring_donation: null,
        success: false,
        message: 'Invalid frequency.'
      };
    }

    const allowedDesignations = ['pac', 'political_action', 'general_fund', 'other'];
    const designationVal = allowedDesignations.includes(designation)
      ? designation
      : 'other';

    const donation = {
      id: this._generateId('recurring_donation'),
      amount: Number(amount),
      currency: 'usd',
      frequency: frequency,
      donation_type: 'recurring',
      designation: designationVal,
      start_date: new Date(startDate).toISOString(),
      payment_method_id: paymentMethodId,
      status: 'active',
      created_at: new Date().toISOString()
    };

    donations.push(donation);
    this._saveToStorage('recurring_donations', donations);

    // Attach payment_method for convenience
    const donationWithResolved = this._resolveForeignKeysForArray([donation])[0];

    return {
      recurring_donation: donationWithResolved,
      success: true,
      message: 'Recurring donation created.'
    };
  }

  // listCBAs()
  listCBAs() {
    const cbas = this._getFromStorage('cbas', []);
    return cbas;
  }

  // getCBADetail(cbaId)
  getCBADetail(cbaId) {
    const cbas = this._getFromStorage('cbas', []);
    return cbas.find((c) => c.id === cbaId) || null;
  }

  // listCBAArticles(cbaId)
  listCBAArticles(cbaId) {
    const articles = this._getFromStorage('cba_articles', []);
    const cbas = this._getFromStorage('cbas', []);

    let result = articles.filter((a) => a.cba_id === cbaId);
    result = result
      .slice()
      .sort((a, b) => (a.article_number || 0) - (b.article_number || 0))
      .map((a) => ({
        ...a,
        cba: cbas.find((c) => c.id === a.cba_id) || null
      }));

    return result;
  }

  // getCBAArticleDetail(cbaArticleId)
  getCBAArticleDetail(cbaArticleId) {
    const articles = this._getFromStorage('cba_articles', []);
    const cbas = this._getFromStorage('cbas', []);

    const article = articles.find((a) => a.id === cbaArticleId) || null;
    if (!article) return null;

    const cba = cbas.find((c) => c.id === article.cba_id) || null;
    return {
      ...article,
      cba: cba
    };
  }

  // saveCBAArticle(cbaArticleId, folderName, pinned)
  saveCBAArticle(cbaArticleId, folderName, pinned) {
    const articles = this._getFromStorage('cba_articles', []);
    const saved = this._getFromStorage('saved_articles', []);

    const article = articles.find((a) => a.id === cbaArticleId);
    if (!article) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const savedArticle = {
      id: this._generateId('saved_article'),
      cba_article_id: cbaArticleId,
      folder_name: folderName || null,
      saved_at: nowIso,
      pinned: !!pinned
    };

    saved.push(savedArticle);
    this._saveToStorage('saved_articles', saved);

    return savedArticle;
  }

  // getSavedArticles()
  getSavedArticles() {
    const saved = this._getFromStorage('saved_articles', []);
    const articles = this._resolveForeignKeysForArray(saved);
    return articles;
  }

  // getMyProfile()
  getMyProfile() {
    const ctx = this._getOrInitializeUserContext();
    let profiles = this._getFromStorage('profiles', []);
    let profile = null;

    if (ctx.profileId) {
      profile = profiles.find((p) => p.id === ctx.profileId) || null;
    }

    if (!profile && profiles.length > 0) {
      profile = profiles[0];
      ctx.profileId = profile.id;
      this._saveToStorage('user_context', ctx);
    }

    if (!profile) {
      const nowIso = new Date().toISOString();
      profile = {
        id: this._generateId('profile'),
        first_name: null,
        last_name: null,
        email: null,
        mobile_phone: null,
        home_zip: null,
        communication_preference: 'none',
        interests: [],
        emergency_alerts_enabled: false,
        created_at: nowIso,
        updated_at: nowIso
      };
      profiles.push(profile);
      ctx.profileId = profile.id;
      this._saveToStorage('profiles', profiles);
      this._saveToStorage('user_context', ctx);
    }

    return profile;
  }

  // getInterestOptions()
  getInterestOptions() {
    const options = this._getFromStorage('interest_options', []);
    return options.filter((o) => o.is_active !== false);
  }

  // updateMyProfile(homeZip, communicationPreference, interests, emergencyAlertsEnabled, mobilePhone)
  updateMyProfile(
    homeZip,
    communicationPreference,
    interests,
    emergencyAlertsEnabled,
    mobilePhone
  ) {
    const ctx = this._getOrInitializeUserContext();
    let profiles = this._getFromStorage('profiles', []);
    let profile = null;

    if (ctx.profileId) {
      profile = profiles.find((p) => p.id === ctx.profileId) || null;
    }

    if (!profile && profiles.length > 0) {
      profile = profiles[0];
      ctx.profileId = profile.id;
    }

    if (!profile) {
      profile = this.getMyProfile();
      profiles = this._getFromStorage('profiles', []);
    }

    if (homeZip !== undefined) {
      profile.home_zip = homeZip;
    }

    if (communicationPreference !== undefined) {
      const allowedPrefs = ['email', 'text', 'text_email', 'none'];
      profile.communication_preference = allowedPrefs.includes(communicationPreference)
        ? communicationPreference
        : profile.communication_preference;
    }

    if (interests !== undefined) {
      if (Array.isArray(interests)) {
        profile.interests = interests.slice();
      } else {
        profile.interests = [];
      }
    }

    if (emergencyAlertsEnabled !== undefined) {
      profile.emergency_alerts_enabled = !!emergencyAlertsEnabled;
    }

    if (mobilePhone !== undefined) {
      profile.mobile_phone = mobilePhone;
    }

    profile.updated_at = new Date().toISOString();

    // Save back
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }

    this._saveToStorage('profiles', profiles);
    this._saveToStorage('user_context', ctx);

    return {
      profile: profile,
      success: true,
      message: 'Profile updated.'
    };
  }

  // getNotificationPreferences()
  getNotificationPreferences() {
    const profile = this.getMyProfile();
    return {
      communication_preference: profile.communication_preference || 'none',
      emergency_alerts_enabled: !!profile.emergency_alerts_enabled
    };
  }

  // getMyTrainings()
  getMyTrainings() {
    const registrations = this._getFromStorage('event_registrations', []);
    const events = this._getFromStorage('events', []);

    const result = registrations
      .filter((reg) => {
        const event = events.find((e) => e.id === reg.event_id);
        if (!event) return false;
        const kind = reg.registration_kind || this._resolveEventRegistrationKind(event);
        return (
          kind === 'training_registration' &&
          reg.status === 'registered' &&
          reg.added_to_my_list !== false
        );
      })
      .map((reg) => ({
        ...reg,
        event: events.find((e) => e.id === reg.event_id) || null
      }));

    return result;
  }

  // getMyEvents()
  getMyEvents() {
    const registrations = this._getFromStorage('event_registrations', []);
    const events = this._getFromStorage('events', []);

    const result = registrations
      .filter((reg) => {
        const event = events.find((e) => e.id === reg.event_id);
        if (!event) return false;
        const kind = reg.registration_kind || this._resolveEventRegistrationKind(event);
        return (
          kind === 'meeting_rsvp' &&
          reg.status === 'registered' &&
          reg.added_to_my_list !== false
        );
      })
      .map((reg) => ({
        ...reg,
        event: events.find((e) => e.id === reg.event_id) || null
      }));

    return result;
  }

  // getMyGrievancesSummary()
  getMyGrievancesSummary() {
    const grievances = this._getFromStorage('grievances', []);

    const openCount = grievances.filter(
      (g) => g.status !== 'resolved' && g.status !== 'closed'
    ).length;

    const recentRaw = grievances
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const recentItems = this._resolveForeignKeysForArray(recentRaw);

    return {
      open_count: openCount,
      recent_items: recentItems
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages', {});
    const content = pages[pageKey];
    if (content) {
      return content;
    }
    return {
      title: '',
      sections: []
    };
  }

  // submitContactInquiry(name, email, subject, message, category)
  submitContactInquiry(name, email, subject, message, category) {
    const inquiries = this._getFromStorage('contact_inquiries', []);

    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name: name || null,
      email: email || null,
      subject: subject,
      message: message,
      category: category || 'general_question',
      created_at: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.'
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
