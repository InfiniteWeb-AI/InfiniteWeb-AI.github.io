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

  // ----------------------
  // Initialization & utils
  // ----------------------

  _initStorage() {
    const keysToInitAsArrays = [
      'events',
      'event_registrations',
      'membership_plans',
      'membership_purchases',
      'articles',
      'reading_lists',
      'gyms',
      'favorite_gyms_lists',
      'job_postings',
      'saved_profiles',
      'job_applications',
      'courses',
      'course_enrollments',
      'learning_plans',
      'committees',
      'volunteer_interest_submissions',
      'contact_submissions'
    ];

    for (const key of keysToInitAsArrays) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('single_user_context')) {
      localStorage.setItem('single_user_context', JSON.stringify({}));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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

  _getSingleUserContext() {
    const raw = localStorage.getItem('single_user_context');
    if (!raw) {
      const ctx = {};
      localStorage.setItem('single_user_context', JSON.stringify(ctx));
      return ctx;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  _saveSingleUserContext(ctx) {
    localStorage.setItem('single_user_context', JSON.stringify(ctx || {}));
  }

  // ----------------------
  // Private helpers
  // ----------------------

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    if (!Array.isArray(lists)) lists = [];
    if (lists.length > 0) {
      return lists[0];
    }
    const now = new Date().toISOString();
    const readingList = {
      id: this._generateId('readinglist'),
      name: 'My Reading List',
      articleIds: [],
      createdAt: now,
      updatedAt: now
    };
    this._saveToStorage('reading_lists', [readingList]);
    return readingList;
  }

  _getOrCreateFavoriteGymsList() {
    let lists = this._getFromStorage('favorite_gyms_lists');
    if (!Array.isArray(lists)) lists = [];
    if (lists.length > 0) {
      return lists[0];
    }
    const now = new Date().toISOString();
    const list = {
      id: this._generateId('favgyms'),
      gymIds: [],
      createdAt: now,
      updatedAt: now
    };
    this._saveToStorage('favorite_gyms_lists', [list]);
    return list;
  }

  _getOrCreateLearningPlan() {
    let plans = this._getFromStorage('learning_plans');
    if (!Array.isArray(plans)) plans = [];
    if (plans.length > 0) {
      return plans[0];
    }
    const now = new Date().toISOString();
    const plan = {
      id: this._generateId('learningplan'),
      name: 'My Learning Plan',
      courseIds: [],
      createdAt: now,
      updatedAt: now
    };
    this._saveToStorage('learning_plans', [plan]);
    return plan;
  }

  _resolveLocationToCoordinates(locationQuery) {
    if (!locationQuery || typeof locationQuery !== 'string') return null;
    const trimmed = locationQuery.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();

    const predefined = {
      'denver, co': { city: 'Denver', state: 'CO', latitude: 39.7392, longitude: -104.9903 },
      'seattle, wa': { city: 'Seattle', state: 'WA', latitude: 47.6062, longitude: -122.3321 },
      'boulder, co': { city: 'Boulder', state: 'CO', latitude: 40.01499, longitude: -105.2705 }
    };

    if (predefined[lower]) {
      return predefined[lower];
    }

    // Fallback: parse "City, ST" but without real coordinates
    const parts = trimmed.split(',');
    const city = parts[0] ? parts[0].trim() : '';
    const state = parts[1] ? parts[1].trim() : '';
    return { city, state, latitude: null, longitude: null };
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      return null;
    }
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _processCardPayment(amount, currency, cardNumber, cardExpiration, cardCvv) {
    // Simulated card processing: success unless cardNumber ends with '0000'
    const cleaned = (cardNumber || '').replace(/\s|-/g, '');
    const last4 = cleaned.slice(-4);
    const success = last4 !== '0000' && cleaned.length >= 12;
    const status = success ? 'paid' : 'failed';
    return {
      success,
      status,
      cardLast4: last4 || null,
      cardExpiration: cardExpiration || null
    };
  }

  // ----------------------
  // 1) Homepage & global search
  // ----------------------

  getHomePageHighlights() {
    const events = this._getFromStorage('events');
    const articles = this._getFromStorage('articles');
    const courses = this._getFromStorage('courses');
    const jobPostings = this._getFromStorage('job_postings');

    const featuredWorkshops = events
      .filter((e) => e.eventType === 'workshops' && e.featured === true)
      .slice(0, 5);

    const featuredCompetitions = events
      .filter((e) => e.eventType === 'competitions' && e.featured === true)
      .slice(0, 5);

    const featuredArticles = articles
      .filter((a) => a.isFeatured === true)
      .slice(0, 5);

    const featuredCourses = courses
      .filter((c) => c.isActive === true)
      .slice(0, 5);

    const featuredJobPostings = jobPostings
      .slice()
      .sort((a, b) => {
        const da = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const db = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    const quickTasks = [
      {
        id: 'qt_events_workshops',
        label: 'Find Workshops',
        description: 'Browse safety and skills workshops',
        targetPage: 'events_workshops'
      },
      {
        id: 'qt_membership_plans',
        label: 'View Membership Plans',
        description: 'Compare association membership options',
        targetPage: 'membership_plans'
      },
      {
        id: 'qt_resources_articles',
        label: 'Read Articles',
        description: 'Explore training and safety articles',
        targetPage: 'resources_articles'
      },
      {
        id: 'qt_education_courses',
        label: 'Education Courses',
        description: 'Find coaching and routesetting courses',
        targetPage: 'education_courses'
      },
      {
        id: 'qt_careers_job_board',
        label: 'Job Board',
        description: 'Search climbing industry jobs',
        targetPage: 'careers_job_board'
      }
    ];

    return {
      featuredWorkshops,
      featuredCompetitions,
      featuredArticles,
      featuredCourses,
      featuredJobPostings,
      quickTasks
    };
  }

  searchSite(query, limitPerType) {
    const limit = typeof limitPerType === 'number' ? limitPerType : 5;
    const q = (query || '').toLowerCase().trim();

    const events = this._getFromStorage('events');
    const articles = this._getFromStorage('articles');
    const courses = this._getFromStorage('courses');
    const jobPostings = this._getFromStorage('job_postings');
    const gyms = this._getFromStorage('gyms');

    if (!q) {
      return {
        events: events.slice(0, limit),
        articles: articles.slice(0, limit),
        courses: courses.slice(0, limit),
        jobPostings: jobPostings.slice(0, limit),
        gyms: gyms.slice(0, limit)
      };
    }

    const matchesText = (text) => (text || '').toLowerCase().includes(q);

    const eventsRes = events
      .filter((e) => matchesText(e.title) || matchesText(e.description) || matchesText(e.city) || matchesText(e.state))
      .slice(0, limit);

    const articlesRes = articles
      .filter((a) => {
        const tagsStr = Array.isArray(a.tags) ? a.tags.join(' ') : '';
        return (
          matchesText(a.title) ||
          matchesText(a.summary) ||
          matchesText(a.content) ||
          matchesText(tagsStr)
        );
      })
      .slice(0, limit);

    const coursesRes = courses
      .filter((c) => matchesText(c.title) || matchesText(c.description) || matchesText(c.syllabus))
      .slice(0, limit);

    const jobsRes = jobPostings
      .filter((j) => matchesText(j.title) || matchesText(j.description) || matchesText(j.organizationName))
      .slice(0, limit);

    const gymsRes = gyms
      .filter((g) => matchesText(g.name) || matchesText(g.city) || matchesText(g.state) || matchesText(g.description))
      .slice(0, limit);

    return {
      events: eventsRes,
      articles: articlesRes,
      courses: coursesRes,
      jobPostings: jobsRes,
      gyms: gymsRes
    };
  }

  // ----------------------
  // 2) Events (workshops & competitions)
  // ----------------------

  getEventFilterOptions(eventType) {
    const events = this._getFromStorage('events');

    const eventTypes = [
      { value: 'workshops', label: 'Workshops' },
      { value: 'competitions', label: 'Competitions' }
    ];

    const filteredByType = eventType
      ? events.filter((e) => e.eventType === eventType)
      : events;

    const workshopTypeSet = new Set();
    for (const e of events) {
      if (e.eventType === 'workshops' && e.workshopType) {
        workshopTypeSet.add(e.workshopType);
      }
    }
    const workshopTypes = Array.from(workshopTypeSet).map((wt) => ({ value: wt, label: wt }));

    const disciplineValues = [
      'bouldering',
      'lead_climbing',
      'top_rope',
      'speed',
      'multi_discipline',
      'general'
    ];
    const disciplines = disciplineValues.map((v) => ({
      value: v,
      label: v
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const stateSet = new Set();
    for (const e of filteredByType) {
      if (e.state) stateSet.add(e.state);
    }
    const states = Array.from(stateSet).map((code) => ({ code, name: code }));

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    for (const e of filteredByType) {
      const base = typeof e.basePrice === 'number' ? e.basePrice : null;
      const maxP = typeof e.maxPrice === 'number' ? e.maxPrice : base;
      if (base !== null) {
        if (minPrice === null || base < minPrice) minPrice = base;
      }
      if (maxP !== null) {
        if (maxPrice === null || maxP > maxPrice) maxPrice = maxP;
      }
      if (e.currency) currency = e.currency;
    }

    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date - Soonest First' },
      { value: 'registration_fee_low_to_high', label: 'Registration Fee - Low to High' },
      { value: 'registration_fee_high_to_low', label: 'Registration Fee - High to Low' }
    ];

    return {
      eventTypes,
      workshopTypes,
      disciplines,
      states,
      priceRange: {
        minPrice: minPrice === null ? 0 : minPrice,
        maxPrice: maxPrice === null ? 0 : maxPrice,
        currency
      },
      sortOptions
    };
  }

  searchEvents(
    eventType,
    workshopType,
    discipline,
    skillLevel,
    startDate,
    endDate,
    state,
    city,
    radiusMiles,
    minPrice,
    maxPrice,
    sortBy,
    limit,
    offset
  ) {
    let events = this._getFromStorage('events');

    if (eventType) {
      events = events.filter((e) => e.eventType === eventType);
    }
    if (workshopType) {
      events = events.filter((e) => e.workshopType === workshopType);
    }
    if (discipline) {
      events = events.filter((e) => e.discipline === discipline);
    }
    if (skillLevel) {
      events = events.filter((e) => e.skillLevel === skillLevel);
    }
    if (startDate) {
      const sd = new Date(startDate).getTime();
      if (!isNaN(sd)) {
        events = events.filter((e) => {
          const t = e.startDateTime ? new Date(e.startDateTime).getTime() : NaN;
          return !isNaN(t) && t >= sd;
        });
      }
    }
    if (endDate) {
      const ed = new Date(endDate).getTime();
      if (!isNaN(ed)) {
        events = events.filter((e) => {
          const t = e.startDateTime ? new Date(e.startDateTime).getTime() : NaN;
          return !isNaN(t) && t <= ed;
        });
      }
    }
    if (state) {
      events = events.filter((e) => e.state === state);
    }

    let origin = null;
    const radius = typeof radiusMiles === 'number' ? radiusMiles : null;
    if (city && radius !== null) {
      origin = this._resolveLocationToCoordinates(city);
      if (origin && origin.latitude !== null && origin.longitude !== null) {
        events = events
          .map((e) => {
            if (typeof e.latitude === 'number' && typeof e.longitude === 'number') {
              const dist = this._calculateDistanceMiles(
                origin.latitude,
                origin.longitude,
                e.latitude,
                e.longitude
              );
              return { ...e, _distanceFromOrigin: dist };
            }
            return { ...e, _distanceFromOrigin: null };
          })
          .filter((e) => e._distanceFromOrigin === null || e._distanceFromOrigin <= radius);
      }
    }

    if (typeof minPrice === 'number') {
      events = events.filter((e) => {
        const base = typeof e.basePrice === 'number' ? e.basePrice : 0;
        return base >= minPrice;
      });
    }
    if (typeof maxPrice === 'number') {
      events = events.filter((e) => {
        const base = typeof e.basePrice === 'number' ? e.basePrice : 0;
        return base <= maxPrice;
      });
    }

    const totalCount = events.length;

    const sort = sortBy || 'date_soonest_first';
    const eventsSorted = events.slice();

    if (sort === 'registration_fee_low_to_high') {
      eventsSorted.sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : (typeof a.maxPrice === 'number' ? a.maxPrice : 0);
        const pb = typeof b.basePrice === 'number' ? b.basePrice : (typeof b.maxPrice === 'number' ? b.maxPrice : 0);
        return pa - pb;
      });
    } else if (sort === 'registration_fee_high_to_low') {
      eventsSorted.sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : (typeof a.maxPrice === 'number' ? a.maxPrice : 0);
        const pb = typeof b.basePrice === 'number' ? b.basePrice : (typeof b.maxPrice === 'number' ? b.maxPrice : 0);
        return pb - pa;
      });
    } else {
      // date_soonest_first
      eventsSorted.sort((a, b) => {
        const ta = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
        const tb = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
        return ta - tb;
      });
    }

    const lim = typeof limit === 'number' ? limit : 50;
    const off = typeof offset === 'number' ? offset : 0;
    const paged = eventsSorted.slice(off, off + lim);

    return { events: paged, totalCount };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        locationDisplay: '',
        dateTimeDisplay: '',
        priceDisplay: '',
        tierOptions: [],
        addOnOptions: [],
        allowedPaymentMethods: ['pay_at_venue', 'credit_debit_card']
      };
    }

    const parts = [];
    if (event.city) parts.push(event.city);
    if (event.state) parts.push(event.state);
    if (event.country) parts.push(event.country);
    const locationDisplay = parts.join(', ');

    let dateTimeDisplay = '';
    if (event.startDateTime) {
      const start = new Date(event.startDateTime);
      const startStr = start.toLocaleString();
      if (event.endDateTime) {
        const end = new Date(event.endDateTime);
        const endStr = end.toLocaleString();
        dateTimeDisplay = startStr + ' – ' + endStr;
      } else {
        dateTimeDisplay = startStr;
      }
    }

    let priceDisplay = '';
    const base = typeof event.basePrice === 'number' ? event.basePrice : null;
    const maxP = typeof event.maxPrice === 'number' ? event.maxPrice : null;
    const currency = event.currency || 'USD';
    const formatMoney = (v) => {
      const num = typeof v === 'number' ? v : 0;
      return (currency === 'USD' ? '$' : '') + num.toFixed(2);
    };
    if (base !== null && (maxP === null || maxP === base)) {
      priceDisplay = formatMoney(base);
    } else if (base !== null && maxP !== null) {
      priceDisplay = formatMoney(base) + ' – ' + formatMoney(maxP);
    }

    const tierOptions = Array.isArray(event.availableTiers)
      ? event.availableTiers.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          price: t.price,
          currency: t.currency || currency,
          isDefault: !!t.isDefault
        }))
      : [];

    const addOnOptions = Array.isArray(event.availableAddOns)
      ? event.availableAddOns.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          price: a.price
        }))
      : [];

    const allowedPaymentMethods = ['pay_at_venue', 'credit_debit_card'];

    return {
      event,
      locationDisplay,
      dateTimeDisplay,
      priceDisplay,
      tierOptions,
      addOnOptions,
      allowedPaymentMethods
    };
  }

  registerForEvent(
    eventId,
    participantName,
    ageCategory,
    registrantName,
    registrantEmail,
    membershipId,
    registrationTierId,
    selectedAddOnIds,
    paymentMethod
  ) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', registration: null };
    }
    if (event.registrationOpen === false) {
      return { success: false, message: 'Registration is closed for this event', registration: null };
    }

    const tiers = Array.isArray(event.availableTiers) ? event.availableTiers : [];
    let tier = tiers.find((t) => t.id === registrationTierId);
    if (!tier && tiers.length > 0) {
      tier = tiers[0];
    }
    if (!tier) {
      return { success: false, message: 'No valid registration tier found', registration: null };
    }

    const price = typeof tier.price === 'number'
      ? tier.price
      : (typeof event.basePrice === 'number' ? event.basePrice : 0);

    const now = new Date().toISOString();
    const reg = {
      id: this._generateId('eventreg'),
      eventId: event.id,
      registrantName: registrantName || participantName,
      registrantEmail: registrantEmail || null,
      membershipId: membershipId || null,
      participantName,
      ageCategory: ageCategory || null,
      registrationTierName: tier.name,
      registrationTierPrice: price,
      selectedAddOns: Array.isArray(selectedAddOnIds) ? selectedAddOnIds.slice() : [],
      paymentMethod,
      paymentStatus: paymentMethod === 'credit_debit_card' ? 'paid' : 'pending',
      createdAt: now,
      notes: null
    };

    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    const registrationWithEvent = { ...reg, event };

    return {
      success: true,
      message: 'Registration completed',
      registration: registrationWithEvent
    };
  }

  // ----------------------
  // 3) Memberships
  // ----------------------

  getMembershipPlans() {
    const plans = this._getFromStorage('membership_plans').filter((p) => p.status === 'active');
    return { plans };
  }

  getMembershipPlanDetails(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    return { plan };
  }

  getMembershipCheckoutDetails(membershipPlanId, termId, autoRenew) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return {
        plan: null,
        selectedTerm: null,
        autoRenew: !!autoRenew,
        totalDue: 0,
        currency: 'USD'
      };
    }

    const terms = Array.isArray(plan.availableTerms) ? plan.availableTerms : [];
    let selectedTerm = terms.find((t) => t.id === termId) || null;
    if (!selectedTerm && terms.length > 0) {
      selectedTerm = terms[0];
    }
    if (!selectedTerm) {
      return {
        plan,
        selectedTerm: null,
        autoRenew: !!autoRenew,
        totalDue: 0,
        currency: plan.currency || 'USD'
      };
    }

    const totalDue = typeof selectedTerm.price === 'number' ? selectedTerm.price : 0;
    const currency = selectedTerm.currency || plan.currency || 'USD';

    return {
      plan,
      selectedTerm: {
        id: selectedTerm.id,
        label: selectedTerm.label,
        durationMonths: selectedTerm.durationMonths,
        price: selectedTerm.price,
        currency
      },
      autoRenew: !!autoRenew,
      totalDue,
      currency
    };
  }

  purchaseMembership(
    membershipPlanId,
    termId,
    autoRenew,
    fullName,
    email,
    billingAddressLine1,
    billingAddressLine2,
    billingCity,
    billingState,
    billingPostalCode,
    billingCountry,
    paymentMethod,
    cardNumber,
    cardExpiration,
    cardCvv
  ) {
    const plans = this._getFromStorage('membership_plans');
    const purchases = this._getFromStorage('membership_purchases');

    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return { success: false, message: 'Membership plan not found', membershipPurchase: null };
    }

    const terms = Array.isArray(plan.availableTerms) ? plan.availableTerms : [];
    let selectedTerm = terms.find((t) => t.id === termId) || null;
    if (!selectedTerm && terms.length > 0) {
      selectedTerm = terms[0];
    }
    if (!selectedTerm) {
      return { success: false, message: 'Membership term not found', membershipPurchase: null };
    }

    const price = typeof selectedTerm.price === 'number' ? selectedTerm.price : 0;
    const currency = selectedTerm.currency || plan.currency || 'USD';

    let paymentStatus = 'pending';
    let cardLast4 = null;
    let cardExpStored = null;

    if (paymentMethod === 'credit_debit_card') {
      const paymentResult = this._processCardPayment(
        price,
        currency,
        cardNumber,
        cardExpiration,
        cardCvv
      );
      paymentStatus = paymentResult.status;
      cardLast4 = paymentResult.cardLast4;
      cardExpStored = paymentResult.cardExpiration;
    }

    const now = new Date().toISOString();
    const purchase = {
      id: this._generateId('mempur'),
      membershipPlanId: plan.id,
      planName: plan.name,
      termLabel: selectedTerm.label,
      termDurationMonths: selectedTerm.durationMonths,
      price,
      currency,
      autoRenew: !!autoRenew,
      purchaserFullName: fullName,
      purchaserEmail: email,
      billingAddressLine1,
      billingAddressLine2: billingAddressLine2 || null,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      paymentMethod,
      cardLast4,
      cardExpiration: cardExpStored,
      paymentStatus,
      createdAt: now
    };

    purchases.push(purchase);
    this._saveToStorage('membership_purchases', purchases);

    const membershipPurchaseWithPlan = { ...purchase, membershipPlan: plan };

    return {
      success: paymentStatus === 'paid',
      message: paymentStatus === 'paid' ? 'Membership purchase completed' : 'Payment failed',
      membershipPurchase: membershipPurchaseWithPlan
    };
  }

  // ----------------------
  // 4) Articles & reading list
  // ----------------------

  getArticleFilterOptions() {
    const skillLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const sortOptions = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return { skillLevels, sortOptions };
  }

  searchArticles(query, skillLevel, startDate, endDate, sortBy, limit, offset) {
    let articles = this._getFromStorage('articles');

    const q = (query || '').toLowerCase().trim();
    if (q) {
      const matchesText = (text) => (text || '').toLowerCase().includes(q);
      articles = articles.filter((a) => {
        const tagsStr = Array.isArray(a.tags) ? a.tags.join(' ') : '';
        return (
          matchesText(a.title) ||
          matchesText(a.summary) ||
          matchesText(a.content) ||
          matchesText(tagsStr)
        );
      });
    }

    if (skillLevel) {
      articles = articles.filter((a) => a.skillLevel === skillLevel);
    }

    if (startDate) {
      const sd = new Date(startDate).getTime();
      if (!isNaN(sd)) {
        articles = articles.filter((a) => {
          const t = a.publicationDate ? new Date(a.publicationDate).getTime() : NaN;
          return !isNaN(t) && t >= sd;
        });
      }
    }

    if (endDate) {
      const ed = new Date(endDate).getTime();
      if (!isNaN(ed)) {
        articles = articles.filter((a) => {
          const t = a.publicationDate ? new Date(a.publicationDate).getTime() : NaN;
          return !isNaN(t) && t <= ed;
        });
      }
    }

    const totalCount = articles.length;

    const sort = sortBy || 'most_recent';
    const sorted = articles.slice();
    if (sort === 'oldest_first') {
      sorted.sort((a, b) => {
        const ta = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const tb = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        return ta - tb;
      });
    } else {
      sorted.sort((a, b) => {
        const ta = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const tb = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        return tb - ta;
      });
    }

    const lim = typeof limit === 'number' ? limit : 50;
    const off = typeof offset === 'number' ? offset : 0;
    const paged = sorted.slice(off, off + lim);

    return { articles: paged, totalCount };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return { article: null, relatedArticles: [], isBookmarked: false };
    }

    const readingList = this._getOrCreateReadingList();
    const isBookmarked = Array.isArray(readingList.articleIds)
      ? readingList.articleIds.includes(article.id)
      : false;

    const related = articles
      .filter((a) => a.id !== article.id)
      .filter((a) => {
        if (article.tags && a.tags) {
          const tagsA = new Set(article.tags);
          const commonTags = (a.tags || []).some((t) => tagsA.has(t));
          if (commonTags) return true;
        }
        if (article.discipline && a.discipline && article.discipline === a.discipline) return true;
        if (article.skillLevel && a.skillLevel && article.skillLevel === a.skillLevel) return true;
        return false;
      })
      .sort((a, b) => {
        const ta = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const tb = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);

    return {
      article,
      relatedArticles: related,
      isBookmarked
    };
  }

  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const articles = this._getFromStorage('articles');

    const articleIds = Array.isArray(readingList.articleIds) ? readingList.articleIds : [];
    const bookmarkedArticles = articleIds
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    return {
      readingList,
      articles: bookmarkedArticles
    };
  }

  saveArticleToReadingList(articleId) {
    const allArticles = this._getFromStorage('articles');
    const article = allArticles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, message: 'Article not found', readingList: null };
    }

    let lists = this._getFromStorage('reading_lists');
    if (!Array.isArray(lists)) lists = [];
    let readingList;
    if (lists.length === 0) {
      readingList = this._getOrCreateReadingList();
      lists = [readingList];
    } else {
      readingList = lists[0];
    }

    if (!Array.isArray(readingList.articleIds)) {
      readingList.articleIds = [];
    }
    if (!readingList.articleIds.includes(articleId)) {
      readingList.articleIds.push(articleId);
      readingList.updatedAt = new Date().toISOString();
    }

    lists[0] = readingList;
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      message: 'Article saved to reading list',
      readingList
    };
  }

  // ----------------------
  // 5) Gyms & favorites
  // ----------------------

  searchGyms(locationQuery, radiusMiles, hasYouthPrograms, sortBy) {
    const gyms = this._getFromStorage('gyms');

    const radius = typeof radiusMiles === 'number' ? radiusMiles : 25;
    const origin = this._resolveLocationToCoordinates(locationQuery);

    let results = gyms.slice();

    if (hasYouthPrograms === true) {
      results = results.filter((g) => g.hasYouthPrograms === true);
    }

    if (origin && origin.latitude !== null && origin.longitude !== null) {
      results = results
        .map((g) => {
          const dist = this._calculateDistanceMiles(
            origin.latitude,
            origin.longitude,
            g.latitude,
            g.longitude
          );
          return { ...g, distanceFromSearchOrigin: dist };
        })
        .filter((g) => g.distanceFromSearchOrigin === null || g.distanceFromSearchOrigin <= radius);
    } else {
      // No coordinates; keep gyms as-is without distance filtering
      results = results.map((g) => ({ ...g }));
    }

    const sort = sortBy || 'distance_closest_first';
    if (sort === 'name_a_to_z') {
      results.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    } else if (sort === 'distance_closest_first') {
      results.sort((a, b) => {
        const da = typeof a.distanceFromSearchOrigin === 'number' ? a.distanceFromSearchOrigin : Infinity;
        const db = typeof b.distanceFromSearchOrigin === 'number' ? b.distanceFromSearchOrigin : Infinity;
        return da - db;
      });
    }

    const originOut = origin
      ? {
          city: origin.city,
          state: origin.state,
          latitude: origin.latitude,
          longitude: origin.longitude
        }
      : { city: null, state: null, latitude: null, longitude: null };

    return { gyms: results, origin: originOut };
  }

  getGymDetails(gymId) {
    const gyms = this._getFromStorage('gyms');
    const gym = gyms.find((g) => g.id === gymId) || null;
    if (!gym) {
      return { gym: null, isFavorite: false, nearbyGyms: [] };
    }

    const favoriteList = this._getOrCreateFavoriteGymsList();
    const isFavorite = Array.isArray(favoriteList.gymIds)
      ? favoriteList.gymIds.includes(gymId)
      : false;

    const nearby = [];
    for (const other of gyms) {
      if (other.id === gym.id) continue;
      const dist = this._calculateDistanceMiles(
        gym.latitude,
        gym.longitude,
        other.latitude,
        other.longitude
      );
      if (dist !== null && dist <= 50) {
        nearby.push({ ...other, distanceFromSearchOrigin: dist });
      }
    }
    nearby.sort((a, b) => {
      const da = a.distanceFromSearchOrigin;
      const db = b.distanceFromSearchOrigin;
      return da - db;
    });

    return {
      gym,
      isFavorite,
      nearbyGyms: nearby.slice(0, 10)
    };
  }

  getFavoriteGyms() {
    const favoriteGymsList = this._getOrCreateFavoriteGymsList();
    const gymsAll = this._getFromStorage('gyms');
    const gymIds = Array.isArray(favoriteGymsList.gymIds) ? favoriteGymsList.gymIds : [];

    const gyms = gymIds
      .map((id) => gymsAll.find((g) => g.id === id) || null)
      .filter((g) => g !== null);

    return {
      favoriteGymsList,
      gyms
    };
  }

  addGymToFavorites(gymId) {
    const gyms = this._getFromStorage('gyms');
    const gym = gyms.find((g) => g.id === gymId) || null;
    if (!gym) {
      return { success: false, message: 'Gym not found', favoriteGymsList: null };
    }

    let lists = this._getFromStorage('favorite_gyms_lists');
    if (!Array.isArray(lists)) lists = [];
    let list;
    if (lists.length === 0) {
      list = this._getOrCreateFavoriteGymsList();
      lists = [list];
    } else {
      list = lists[0];
    }

    if (!Array.isArray(list.gymIds)) list.gymIds = [];
    if (!list.gymIds.includes(gymId)) {
      list.gymIds.push(gymId);
      list.updatedAt = new Date().toISOString();
    }

    lists[0] = list;
    this._saveToStorage('favorite_gyms_lists', lists);

    return {
      success: true,
      message: 'Gym added to favorites',
      favoriteGymsList: list
    };
  }

  // ----------------------
  // 6) Jobs & applications
  // ----------------------

  getJobFilterOptions() {
    const roles = [
      { value: 'head_routesetter', label: 'Head Routesetter' },
      { value: 'routesetter', label: 'Routesetter' },
      { value: 'coach', label: 'Coach' },
      { value: 'gym_manager', label: 'Gym Manager' },
      { value: 'front_desk', label: 'Front Desk' },
      { value: 'other', label: 'Other' }
    ];

    const regions = [
      { value: 'pacific', label: 'Pacific' },
      { value: 'mountain', label: 'Mountain' },
      { value: 'central', label: 'Central' },
      { value: 'eastern', label: 'Eastern' },
      { value: 'international', label: 'International' }
    ];

    const salaryUnits = [
      { value: 'per_year', label: 'Per Year' },
      { value: 'per_hour', label: 'Per Hour' },
      { value: 'per_month', label: 'Per Month' },
      { value: 'per_project', label: 'Per Project' }
    ];

    const sortOptions = [
      { value: 'posted_newest_first', label: 'Posted - Newest First' },
      { value: 'posted_oldest_first', label: 'Posted - Oldest First' }
    ];

    return { roles, regions, salaryUnits, sortOptions };
  }

  searchJobPostings(role, region, minSalary, salaryUnit, sortBy, limit, offset) {
    let jobs = this._getFromStorage('job_postings');

    if (role) {
      jobs = jobs.filter((j) => j.role === role);
    }
    if (region) {
      jobs = jobs.filter((j) => j.region === region);
    }

    if (salaryUnit) {
      jobs = jobs.filter((j) => j.salaryUnit === salaryUnit);
    }

    if (typeof minSalary === 'number') {
      jobs = jobs.filter((j) => {
        const unitMatches = !salaryUnit || j.salaryUnit === salaryUnit;
        if (!unitMatches) return false;
        const jobMin = typeof j.salaryMin === 'number' ? j.salaryMin : null;
        const jobMax = typeof j.salaryMax === 'number' ? j.salaryMax : null;
        const compBase = jobMin !== null ? jobMin : jobMax;
        if (compBase === null) return false;
        return compBase >= minSalary;
      });
    }

    const totalCount = jobs.length;

    const sort = sortBy || 'posted_newest_first';
    const sorted = jobs.slice();
    if (sort === 'posted_oldest_first') {
      sorted.sort((a, b) => {
        const ta = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const tb = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        return ta - tb;
      });
    } else {
      sorted.sort((a, b) => {
        const ta = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const tb = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        return tb - ta;
      });
    }

    const lim = typeof limit === 'number' ? limit : 50;
    const off = typeof offset === 'number' ? offset : 0;
    const paged = sorted.slice(off, off + lim);

    return { jobPostings: paged, totalCount };
  }

  getJobDetails(jobPostingId) {
    const jobs = this._getFromStorage('job_postings');
    const jobPosting = jobs.find((j) => j.id === jobPostingId) || null;
    return { jobPosting };
  }

  getSavedProfiles() {
    const savedProfiles = this._getFromStorage('saved_profiles');
    return { savedProfiles };
  }

  applyToJobWithSavedProfile(jobPostingId, savedProfileId, messageToEmployer) {
    const jobs = this._getFromStorage('job_postings');
    const profiles = this._getFromStorage('saved_profiles');
    const applications = this._getFromStorage('job_applications');

    const job = jobs.find((j) => j.id === jobPostingId) || null;
    if (!job) {
      return { success: false, message: 'Job posting not found', jobApplication: null };
    }

    const profile = profiles.find((p) => p.id === savedProfileId) || null;
    if (!profile) {
      return { success: false, message: 'Saved profile not found', jobApplication: null };
    }

    const now = new Date().toISOString();
    const app = {
      id: this._generateId('jobapp'),
      jobPostingId: job.id,
      savedProfileId: profile.id,
      profileLabel: profile.label,
      submittedAt: now,
      status: 'submitted',
      messageToEmployer: messageToEmployer || ''
    };

    applications.push(app);
    this._saveToStorage('job_applications', applications);

    const jobApplicationWithRefs = {
      ...app,
      jobPosting: job,
      savedProfile: profile
    };

    return {
      success: true,
      message: 'Application submitted',
      jobApplication: jobApplicationWithRefs
    };
  }

  // ----------------------
  // 7) Courses, enrollments & learning plans
  // ----------------------

  getCourseFilterOptions() {
    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const courses = this._getFromStorage('courses');
    let durationOptionsWeeks = Array.from(
      new Set(
        courses
          .map((c) => c.durationWeeks)
          .filter((v) => typeof v === 'number')
      )
    ).sort((a, b) => a - b);
    if (durationOptionsWeeks.length === 0) {
      durationOptionsWeeks = [2, 4, 6, 8, 12];
    }

    const ratingThresholds = [3.0, 3.5, 4.0, 4.5];

    const categories = [
      { value: 'coaching', label: 'Coaching' },
      { value: 'routesetting', label: 'Routesetting' },
      { value: 'safety', label: 'Safety' },
      { value: 'management', label: 'Management' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'rating_high_to_low', label: 'Rating - High to Low' },
      { value: 'duration_shortest_first', label: 'Duration - Shortest First' }
    ];

    return { levels, durationOptionsWeeks, ratingThresholds, categories, sortOptions };
  }

  searchCourses(level, maxDurationWeeks, minRating, category, sortBy, limit, offset) {
    let courses = this._getFromStorage('courses');

    if (level) {
      courses = courses.filter((c) => c.level === level);
    }
    if (typeof maxDurationWeeks === 'number') {
      courses = courses.filter((c) => typeof c.durationWeeks === 'number' && c.durationWeeks <= maxDurationWeeks);
    }
    if (typeof minRating === 'number') {
      courses = courses.filter((c) => typeof c.rating === 'number' && c.rating >= minRating);
    }
    if (category) {
      courses = courses.filter((c) => c.category === category);
    }

    const totalCount = courses.length;

    const sort = sortBy || 'rating_high_to_low';
    const sorted = courses.slice();

    if (sort === 'duration_shortest_first') {
      sorted.sort((a, b) => {
        const da = typeof a.durationWeeks === 'number' ? a.durationWeeks : Infinity;
        const db = typeof b.durationWeeks === 'number' ? b.durationWeeks : Infinity;
        return da - db;
      });
    } else {
      sorted.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      });
    }

    const lim = typeof limit === 'number' ? limit : 50;
    const off = typeof offset === 'number' ? offset : 0;
    const paged = sorted.slice(off, off + lim);

    return { courses: paged, totalCount };
  }

  getCourseDetails(courseId) {
    const courses = this._getFromStorage('courses');
    const enrollments = this._getFromStorage('course_enrollments');

    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return { course: null, formatOptions: [], isEnrolled: false };
    }

    const isEnrolled = enrollments.some(
      (e) => e.courseId === courseId && e.status !== 'cancelled'
    );

    const formatOptions = Array.isArray(course.formats) ? course.formats.slice() : [];

    return {
      course,
      formatOptions,
      isEnrolled
    };
  }

  enrollInCourse(courseId, chosenFormat) {
    const courses = this._getFromStorage('courses');
    const enrollments = this._getFromStorage('course_enrollments');

    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return { success: false, message: 'Course not found', courseEnrollment: null };
    }

    const availableFormats = Array.isArray(course.formats) ? course.formats : [];
    let formatToUse = chosenFormat;
    if (!availableFormats.includes(formatToUse)) {
      if (availableFormats.length > 0) {
        formatToUse = availableFormats[0];
      } else if (course.primaryFormat) {
        formatToUse = course.primaryFormat;
      } else {
        return { success: false, message: 'Format not available for this course', courseEnrollment: null };
      }
    }

    const now = new Date().toISOString();
    const enrollment = {
      id: this._generateId('courseenr'),
      courseId: course.id,
      courseTitle: course.title,
      enrolledAt: now,
      chosenFormat: formatToUse,
      status: 'enrolled'
    };

    enrollments.push(enrollment);
    this._saveToStorage('course_enrollments', enrollments);

    const courseEnrollmentWithCourse = { ...enrollment, course };

    return {
      success: true,
      message: 'Enrolled in course',
      courseEnrollment: courseEnrollmentWithCourse
    };
  }

  getLearningPlan() {
    const learningPlan = this._getOrCreateLearningPlan();
    const courses = this._getFromStorage('courses');

    const courseIds = Array.isArray(learningPlan.courseIds) ? learningPlan.courseIds : [];
    const planCourses = courseIds
      .map((id) => courses.find((c) => c.id === id) || null)
      .filter((c) => c !== null);

    return {
      learningPlan,
      courses: planCourses
    };
  }

  addCourseToLearningPlan(courseId) {
    const courses = this._getFromStorage('courses');
    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return { success: false, message: 'Course not found', learningPlan: null };
    }

    let plans = this._getFromStorage('learning_plans');
    if (!Array.isArray(plans)) plans = [];
    let plan;
    if (plans.length === 0) {
      plan = this._getOrCreateLearningPlan();
      plans = [plan];
    } else {
      plan = plans[0];
    }

    if (!Array.isArray(plan.courseIds)) plan.courseIds = [];
    if (!plan.courseIds.includes(courseId)) {
      plan.courseIds.push(courseId);
      plan.updatedAt = new Date().toISOString();
    }

    plans[0] = plan;
    this._saveToStorage('learning_plans', plans);

    return {
      success: true,
      message: 'Course added to learning plan',
      learningPlan: plan
    };
  }

  // ----------------------
  // 8) Committees & volunteering
  // ----------------------

  getCommitteeFilterOptions() {
    const categories = [
      { value: 'safety_standards', label: 'Safety Standards' },
      { value: 'education', label: 'Education' },
      { value: 'competitions', label: 'Competitions' },
      { value: 'membership', label: 'Membership' },
      { value: 'governance', label: 'Governance' },
      { value: 'other', label: 'Other' }
    ];

    const meetingFormats = [
      { value: 'online', label: 'Online' },
      { value: 'in_person', label: 'In Person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const meetingTimes = [
      { value: 'mornings', label: 'Mornings' },
      { value: 'afternoons', label: 'Afternoons' },
      { value: 'evenings', label: 'Evenings' },
      { value: 'varied', label: 'Varied' }
    ];

    return { categories, meetingFormats, meetingTimes };
  }

  searchCommittees(category, meetingFormat, meetingTime, onlyAcceptingVolunteers) {
    let committees = this._getFromStorage('committees');

    if (category) {
      committees = committees.filter((c) => c.category === category);
    }
    if (meetingFormat) {
      committees = committees.filter((c) => c.meetingFormat === meetingFormat);
    }
    if (meetingTime) {
      committees = committees.filter((c) => c.meetingTime === meetingTime);
    }

    const onlyAccept = typeof onlyAcceptingVolunteers === 'boolean'
      ? onlyAcceptingVolunteers
      : true;
    if (onlyAccept) {
      committees = committees.filter((c) => c.isAcceptingVolunteers === true);
    }

    return { committees };
  }

  getCommitteeDetails(committeeId) {
    const committees = this._getFromStorage('committees');
    const committee = committees.find((c) => c.id === committeeId) || null;

    if (!committee) {
      return { committee: null, volunteerInterestAreas: [] };
    }

    let volunteerInterestAreas;
    if (committee.category === 'safety_standards') {
      volunteerInterestAreas = [
        { value: 'gym_safety_inspections', label: 'Gym Safety Inspections' },
        { value: 'training_guidelines', label: 'Training Guidelines' },
        { value: 'equipment_standards', label: 'Equipment Standards' },
        { value: 'incident_review', label: 'Incident Review' }
      ];
    } else if (committee.category === 'education') {
      volunteerInterestAreas = [
        { value: 'curriculum_development', label: 'Curriculum Development' },
        { value: 'instructor_training', label: 'Instructor Training' },
        { value: 'online_resources', label: 'Online Resources' }
      ];
    } else {
      volunteerInterestAreas = [
        { value: 'general_volunteering', label: 'General Volunteering' },
        { value: 'communications', label: 'Communications' },
        { value: 'events_support', label: 'Events Support' }
      ];
    }

    return {
      committee,
      volunteerInterestAreas
    };
  }

  submitVolunteerInterest(committeeId, fullName, email, areasOfInterest) {
    const committees = this._getFromStorage('committees');
    const submissions = this._getFromStorage('volunteer_interest_submissions');

    const committee = committees.find((c) => c.id === committeeId) || null;
    if (!committee) {
      return { success: false, message: 'Committee not found', submission: null };
    }

    const interests = Array.isArray(areasOfInterest) ? areasOfInterest.filter((v) => !!v) : [];
    if (interests.length === 0) {
      return { success: false, message: 'At least one area of interest is required', submission: null };
    }

    const now = new Date().toISOString();
    const submission = {
      id: this._generateId('volinterest'),
      committeeId: committee.id,
      committeeName: committee.name,
      fullName,
      email,
      areasOfInterest: interests,
      createdAt: now,
      status: 'received'
    };

    submissions.push(submission);
    this._saveToStorage('volunteer_interest_submissions', submissions);

    const submissionWithCommittee = { ...submission, committee };

    return {
      success: true,
      message: 'Volunteer interest submitted',
      submission: submissionWithCommittee
    };
  }

  // ----------------------
  // 9) Association overview & contact
  // ----------------------

  getAssociationOverview() {
    const mission = 'To advance safe, inclusive, and high-quality indoor climbing through education, standards, and community.';
    const vision = 'A thriving indoor climbing community where every climber has access to safe facilities, skilled professionals, and meaningful progression.';
    const overview = 'The Association connects gyms, routesetters, coaches, and climbers through education programs, safety standards, competitions, and professional resources.';

    const keyPrograms = [
      {
        name: 'Membership',
        description: 'Professional and facility memberships with access to resources and certifications.',
        targetPage: 'membership'
      },
      {
        name: 'Education Courses',
        description: 'Structured learning paths for coaches, routesetters, and managers.',
        targetPage: 'education_courses'
      },
      {
        name: 'Events',
        description: 'Workshops and competitions focused on safety and performance.',
        targetPage: 'events'
      },
      {
        name: 'Job Board',
        description: 'Career opportunities across the indoor climbing industry.',
        targetPage: 'careers_job_board'
      }
    ];

    return { mission, vision, overview, keyPrograms };
  }

  getContactInfo() {
    const email = 'info@climbing-association.example';
    const phone = '+1 (555) 555-1234';
    const mailingAddress = 'Indoor Climbing Association, 123 Climb Way, Boulder, CO 80301, USA';

    const supportTopics = [
      { value: 'membership_support', label: 'Membership Support' },
      { value: 'event_registration', label: 'Event Registration' },
      { value: 'education_courses', label: 'Education Courses' },
      { value: 'job_board', label: 'Job Board' },
      { value: 'general_inquiry', label: 'General Inquiry' }
    ];

    return { email, phone, mailingAddress, supportTopics };
  }

  submitContactForm(name, email, topic, subject, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const now = new Date().toISOString();

    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      topic: topic || null,
      subject,
      message,
      createdAt: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been received.'
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