// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  _initStorage() {
    const keys = [
      'auto_quotes',
      'saved_quotes',
      'home_insurance_policies',
      'policy_comparison_lists',
      'agents',
      'agent_time_slots',
      'appointments',
      'term_life_plans',
      'life_plan_selections',
      'funds',
      'favorite_lists',
      'claims',
      'events',
      'event_registrations',
      'insurance_bundles',
      'saved_bundles',
      'service_requests'
    ];
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('claimNumberCounter')) {
      localStorage.setItem('claimNumberCounter', '100000');
    }
    // user_context, page content, legal_content etc are optional and initialized lazily
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _getOrCreateUserContext() {
    let ctx = this._getFromStorage('user_context', null);
    if (!ctx) {
      ctx = {
        id: 'user_1',
        created_at: this._now()
      };
      this._saveToStorage('user_context', ctx);
    }
    return ctx;
  }

  _getOrCreatePolicyComparisonList() {
    const lists = this._getFromStorage('policy_comparison_lists', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const newList = {
      id: this._generateId('policy_compare'),
      policy_type: 'home_insurance',
      home_policy_ids: [],
      name: 'My Home Policy Comparison',
      created_at: this._now()
    };
    lists.push(newList);
    this._saveToStorage('policy_comparison_lists', lists);
    return newList;
  }

  _getDefaultFavoriteList() {
    const lists = this._getFromStorage('favorite_lists', []);
    let def = lists.find(l => l.is_default);
    if (!def) {
      def = {
        id: this._generateId('favlist'),
        name: 'My Favorites',
        description: '',
        fund_ids: [],
        is_default: true,
        created_at: this._now(),
        updated_at: null
      };
      lists.push(def);
      this._saveToStorage('favorite_lists', lists);
    }
    return def;
  }

  _generateClaimNumber() {
    const current = parseInt(localStorage.getItem('claimNumberCounter') || '100000', 10);
    const next = current + 1;
    localStorage.setItem('claimNumberCounter', String(next));
    return 'C' + next;
  }

  _resolveBundleForeignKeys(bundle) {
    if (!bundle) return null;
    const autoQuotes = this._getFromStorage('auto_quotes', []);
    const homePolicies = this._getFromStorage('home_insurance_policies', []);
    const lifePlans = this._getFromStorage('term_life_plans', []);
    const autoPolicy = bundle.auto_policy_id
      ? autoQuotes.find(q => q.id === bundle.auto_policy_id) || null
      : null;
    const homePolicy = bundle.home_policy_id
      ? homePolicies.find(p => p.id === bundle.home_policy_id) || null
      : null;
    const lifePlan = bundle.life_plan_id
      ? lifePlans.find(p => p.id === bundle.life_plan_id) || null
      : null;
    return Object.assign({}, bundle, {
      autoPolicy: autoPolicy,
      homePolicy: homePolicy,
      lifePlan: lifePlan
    });
  }

  _extractDate(dateTimeString) {
    if (!dateTimeString) return null;
    try {
      return new Date(dateTimeString).toISOString().slice(0, 10);
    } catch (e) {
      return null;
    }
  }

  // ========== Home Page & Overview Interfaces ==========

  getHomePageData() {
    this._getOrCreateUserContext();
    const homeData = this._getFromStorage('home_page_data', null);
    const hero = homeData && homeData.hero ? homeData.hero : { title: '', subtitle: '' };
    const productSections = homeData && Array.isArray(homeData.productSections)
      ? homeData.productSections
      : [];
    const quickActions = homeData && Array.isArray(homeData.quickActions)
      ? homeData.quickActions
      : [];

    const bundlesRaw = this._getFromStorage('insurance_bundles', []);
    const featuredBundlesRaw = bundlesRaw.filter(b => b.status === 'active');
    const featuredBundles = featuredBundlesRaw.map(b => this._resolveBundleForeignKeys(b));

    const events = this._getFromStorage('events', []);
    const now = new Date();
    const upcomingEvents = events
      .filter(e => !e.is_cancelled)
      .filter(e => {
        try {
          return new Date(e.start_datetime) >= now;
        } catch (err) {
          return true;
        }
      })
      .sort((a, b) => {
        const ad = new Date(a.start_datetime || 0).getTime();
        const bd = new Date(b.start_datetime || 0).getTime();
        return ad - bd;
      });

    return {
      hero: hero,
      productSections: productSections,
      quickActions: quickActions,
      featuredBundles: featuredBundles,
      upcomingEvents: upcomingEvents
    };
  }

  getInsuranceOverview(insuranceType) {
    const allowed = ['auto', 'home', 'life'];
    const type = allowed.includes(insuranceType) ? insuranceType : 'auto';
    const key = 'insurance_overview_' + type;
    const data = this._getFromStorage(key, null);
    const defaultData = {
      insuranceType: type,
      title: '',
      summary: '',
      coverageHighlights: [],
      faqItems: [],
      primaryQuoteCtaLabel: '',
      relatedLinks: []
    };
    return data ? Object.assign(defaultData, data) : defaultData;
  }

  // ========== Quote Filter Options ==========

  getQuoteFilterOptions(quoteType) {
    const allowed = ['auto', 'home', 'term_life'];
    const type = allowed.includes(quoteType) ? quoteType : 'auto';
    const filterOptions = {
      monthlyPremiumMax: {
        min: 0,
        max: 1000,
        step: 10,
        label: 'Maximum monthly premium'
      },
      deductibleOptions: [
        { value: 500, label: '$500 or less' },
        { value: 1000, label: '$1,000 or less' },
        { value: 2000, label: '$2,000 or less' }
      ],
      customerRatingThresholds: [
        { value: 3, label: '3 stars & up' },
        { value: 4, label: '4 stars & up' },
        { value: 5, label: '5 stars only' }
      ]
    };
    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' },
      { value: 'rating_low_to_high', label: 'Rating - Low to High' }
    ];
    return {
      quoteType: type,
      filterOptions: filterOptions,
      sortOptions: sortOptions
    };
  }

  // ========== Auto Quotes ==========

  searchAutoQuotes(
    zipCode,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    coverageType,
    filters,
    sortBy
  ) {
    const allQuotes = this._getFromStorage('auto_quotes', []);
    const effectiveFilters = filters || {};
    const maxPremium = typeof effectiveFilters.monthlyPremiumMax === 'number'
      ? effectiveFilters.monthlyPremiumMax
      : null;
    const minRating = typeof effectiveFilters.customerRatingMin === 'number'
      ? effectiveFilters.customerRatingMin
      : null;
    const maxDeductible = typeof effectiveFilters.deductibleMax === 'number'
      ? effectiveFilters.deductibleMax
      : null;

    let results = allQuotes.filter(q => {
      if (q.status && q.status !== 'active') return false;
      if (zipCode && q.zip_code !== zipCode) return false;
      if (typeof vehicleYear === 'number' && q.vehicle_year !== vehicleYear) return false;
      if (vehicleMake && q.vehicle_make !== vehicleMake) return false;
      if (vehicleModel && q.vehicle_model !== vehicleModel) return false;
      if (coverageType && q.coverage_type !== coverageType) return false;
      if (maxPremium != null && typeof q.monthly_premium === 'number' && q.monthly_premium > maxPremium) return false;
      if (minRating != null && typeof q.customer_rating === 'number' && q.customer_rating < minRating) return false;
      if (maxDeductible != null && typeof q.deductible_amount === 'number' && q.deductible_amount > maxDeductible) return false;
      return true;
    });

    const sortOrder = sortBy || 'price_low_to_high';
    const sortFnMap = {
      price_low_to_high: (a, b) => (a.monthly_premium || 0) - (b.monthly_premium || 0),
      price_high_to_low: (a, b) => (b.monthly_premium || 0) - (a.monthly_premium || 0),
      rating_high_to_low: (a, b) => (b.customer_rating || 0) - (a.customer_rating || 0),
      rating_low_to_high: (a, b) => (a.customer_rating || 0) - (b.customer_rating || 0)
    };
    const fn = sortFnMap[sortOrder] || sortFnMap.price_low_to_high;
    results = results.slice().sort(fn);

    const availableSortOptions = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' },
      { value: 'rating_low_to_high', label: 'Rating - Low to High' }
    ];

    return {
      results: results,
      totalResults: results.length,
      appliedFilters: {
        monthlyPremiumMax: maxPremium,
        customerRatingMin: minRating,
        deductibleMax: maxDeductible
      },
      sortBy: sortOrder,
      availableSortOptions: availableSortOptions
    };
  }

  getAutoQuoteDetail(autoQuoteId) {
    const allQuotes = this._getFromStorage('auto_quotes', []);
    const quote = allQuotes.find(q => q.id === autoQuoteId) || null;
    if (!quote) {
      return {
        quote: null,
        breakdown: {
          monthlyPremium: null,
          termLengthMonths: null,
          deductibleAmount: null,
          liabilityLimits: null,
          additionalBenefits: null
        }
      };
    }
    return {
      quote: quote,
      breakdown: {
        monthlyPremium: quote.monthly_premium || null,
        termLengthMonths: quote.term_length_months || null,
        deductibleAmount: quote.deductible_amount || null,
        liabilityLimits: quote.liability_limits || null,
        additionalBenefits: quote.additional_benefits || null
      }
    };
  }

  saveAutoQuote(autoQuoteId, savedName, notes) {
    this._getOrCreateUserContext();
    const allQuotes = this._getFromStorage('auto_quotes', []);
    const quote = allQuotes.find(q => q.id === autoQuoteId) || null;
    if (!quote) {
      return {
        success: false,
        savedQuote: null,
        message: 'Auto quote not found.'
      };
    }
    const savedQuotes = this._getFromStorage('saved_quotes', []);
    const newSaved = {
      id: this._generateId('saved_quote'),
      auto_quote_id: autoQuoteId,
      saved_name: savedName || null,
      notes: notes || null,
      saved_at: this._now()
    };
    savedQuotes.push(newSaved);
    this._saveToStorage('saved_quotes', savedQuotes);

    const enrichedSaved = Object.assign({}, newSaved, {
      autoQuote: quote
    });

    return {
      success: true,
      savedQuote: enrichedSaved,
      message: 'Quote saved successfully.'
    };
  }

  // ========== Home Insurance Policies & Comparison ==========

  searchHomeInsurancePolicies(
    zipCode,
    dwellingCoverageAmount,
    policyType,
    filters,
    sortBy
  ) {
    const allPolicies = this._getFromStorage('home_insurance_policies', []);
    const effectiveFilters = filters || {};
    const dedMax = typeof effectiveFilters.deductibleMax === 'number'
      ? effectiveFilters.deductibleMax
      : null;
    const minRating = typeof effectiveFilters.customerRatingMin === 'number'
      ? effectiveFilters.customerRatingMin
      : null;
    const maxPremium = typeof effectiveFilters.monthlyPremiumMax === 'number'
      ? effectiveFilters.monthlyPremiumMax
      : null;
    const effPolicyType = policyType || 'homeowners';

    let results = allPolicies.filter(p => {
      if (p.status && p.status !== 'active') return false;
      if (zipCode && p.zip_code !== zipCode) return false;
      if (effPolicyType && p.policy_type !== effPolicyType) return false;
      if (typeof dwellingCoverageAmount === 'number') {
        if (typeof p.dwelling_coverage_amount === 'number' &&
          p.dwelling_coverage_amount < dwellingCoverageAmount) {
          return false;
        }
      }
      if (dedMax != null && typeof p.deductible_amount === 'number' && p.deductible_amount > dedMax) return false;
      if (minRating != null && typeof p.customer_rating === 'number' && p.customer_rating < minRating) return false;
      if (maxPremium != null && typeof p.monthly_premium === 'number' && p.monthly_premium > maxPremium) return false;
      return true;
    });

    const sortOrder = sortBy || 'price_low_to_high';
    const sortFnMap = {
      price_low_to_high: (a, b) => (a.monthly_premium || 0) - (b.monthly_premium || 0),
      price_high_to_low: (a, b) => (b.monthly_premium || 0) - (a.monthly_premium || 0),
      rating_high_to_low: (a, b) => (b.customer_rating || 0) - (a.customer_rating || 0),
      rating_low_to_high: (a, b) => (a.customer_rating || 0) - (b.customer_rating || 0),
      deductible_low_to_high: (a, b) => (a.deductible_amount || 0) - (b.deductible_amount || 0)
    };
    const fn = sortFnMap[sortOrder] || sortFnMap.price_low_to_high;
    results = results.slice().sort(fn);

    return {
      results: results,
      totalResults: results.length,
      appliedFilters: {
        deductibleMax: dedMax,
        customerRatingMin: minRating,
        monthlyPremiumMax: maxPremium
      },
      sortBy: sortOrder
    };
  }

  getHomeInsurancePolicyDetail(homePolicyId) {
    const allPolicies = this._getFromStorage('home_insurance_policies', []);
    const policy = allPolicies.find(p => p.id === homePolicyId) || null;
    if (!policy) {
      return {
        policy: null,
        coverageBreakdown: {
          dwellingCoverageAmount: null,
          deductibleAmount: null,
          deductibleType: null,
          additionalCoverages: null
        }
      };
    }
    return {
      policy: policy,
      coverageBreakdown: {
        dwellingCoverageAmount: policy.dwelling_coverage_amount || null,
        deductibleAmount: policy.deductible_amount || null,
        deductibleType: policy.deductible_type || null,
        additionalCoverages: policy.additional_coverages || null
      }
    };
  }

  addHomePolicyToComparison(homePolicyId) {
    this._getOrCreateUserContext();
    const policies = this._getFromStorage('home_insurance_policies', []);
    const policy = policies.find(p => p.id === homePolicyId) || null;
    if (!policy) {
      return {
        success: false,
        comparisonList: null,
        comparedPolicies: [],
        message: 'Home policy not found.'
      };
    }
    const lists = this._getFromStorage('policy_comparison_lists', []);
    let list = this._getOrCreatePolicyComparisonList();
    const existingIndex = list.home_policy_ids.indexOf(homePolicyId);
    if (existingIndex === -1) {
      list.home_policy_ids.push(homePolicyId);
      list = Object.assign({}, list);
      const idx = lists.findIndex(l => l.id === list.id);
      if (idx >= 0) {
        lists[idx] = list;
      } else {
        lists.push(list);
      }
      this._saveToStorage('policy_comparison_lists', lists);
    }
    const comparedPolicies = list.home_policy_ids
      .map(id => policies.find(p => p.id === id))
      .filter(Boolean);
    return {
      success: true,
      comparisonList: list,
      comparedPolicies: comparedPolicies,
      message: 'Policy added to comparison.'
    };
  }

  getPolicyComparison() {
    const list = this._getOrCreatePolicyComparisonList();
    const policies = this._getFromStorage('home_insurance_policies', []);
    const comparedPolicies = list.home_policy_ids
      .map(id => policies.find(p => p.id === id))
      .filter(Boolean);
    return {
      comparisonList: list,
      comparedPolicies: comparedPolicies
    };
  }

  removeHomePolicyFromComparison(homePolicyId) {
    const lists = this._getFromStorage('policy_comparison_lists', []);
    let list = this._getOrCreatePolicyComparisonList();
    const idxId = list.home_policy_ids.indexOf(homePolicyId);
    if (idxId !== -1) {
      list.home_policy_ids.splice(idxId, 1);
      const idx = lists.findIndex(l => l.id === list.id);
      if (idx >= 0) {
        lists[idx] = list;
      }
      this._saveToStorage('policy_comparison_lists', lists);
    }
    const policies = this._getFromStorage('home_insurance_policies', []);
    const comparedPolicies = list.home_policy_ids
      .map(id => policies.find(p => p.id === id))
      .filter(Boolean);
    return {
      success: true,
      comparisonList: list,
      comparedPolicies: comparedPolicies,
      message: 'Policy removed from comparison.'
    };
  }

  clearPolicyComparison() {
    const lists = this._getFromStorage('policy_comparison_lists', []);
    let list = this._getOrCreatePolicyComparisonList();
    list.home_policy_ids = [];
    const idx = lists.findIndex(l => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('policy_comparison_lists', lists);
    return {
      success: true,
      comparisonList: list,
      comparedPolicies: [],
      message: 'Comparison list cleared.'
    };
  }

  // ========== Agents & Appointments ==========

  searchAgents(zipCode, radiusMiles, sortBy, filters) {
    const allAgents = this._getFromStorage('agents', []);
    const effFilters = filters || {};
    const acceptsInPerson = effFilters.acceptsInPerson;
    const acceptsVirtual = effFilters.acceptsVirtual;
    const specialties = Array.isArray(effFilters.specialties) ? effFilters.specialties : null;

    let results = allAgents.filter(a => {
      if (a.status && a.status !== 'active') return false;
      if (zipCode && a.zip_code !== zipCode) return false;
      if (acceptsInPerson === true && a.accepts_in_person === false) return false;
      if (acceptsVirtual === true && a.accepts_virtual === false) return false;
      if (specialties && specialties.length > 0 && Array.isArray(a.primary_specialties)) {
        const hasAny = a.primary_specialties.some(s => specialties.indexOf(s) !== -1);
        if (!hasAny) return false;
      }
      return true;
    });

    const sortOrder = sortBy || 'distance_nearest_first';
    if (sortOrder === 'rating_high_to_low') {
      results = results.slice().sort((a, b) => (b.customer_rating || 0) - (a.customer_rating || 0));
    } else if (sortOrder === 'name_a_to_z') {
      results = results.slice().sort((a, b) => {
        const an = (a.full_name || '').toLowerCase();
        const bn = (b.full_name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else {
      // distance_nearest_first - without coordinates, approximate by zip then name
      results = results.slice().sort((a, b) => {
        const az = (a.zip_code || '').toString();
        const bz = (b.zip_code || '').toString();
        if (az < bz) return -1;
        if (az > bz) return 1;
        const an = (a.full_name || '').toLowerCase();
        const bn = (b.full_name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    // Instrumentation for task completion tracking
    try {
      const task3_agentSearchParams = {
        zipCode: zipCode,
        radiusMiles: radiusMiles,
        filters: effFilters,
        sortBy: sortOrder,
        timestamp: this._now()
      };
      localStorage.setItem('task3_agentSearchParams', JSON.stringify(task3_agentSearchParams));
    } catch (e) {}

    return {
      results: results,
      totalResults: results.length,
      appliedFilters: {
        radiusMiles: typeof radiusMiles === 'number' ? radiusMiles : null,
        acceptsInPerson: acceptsInPerson === true ? true : undefined,
        acceptsVirtual: acceptsVirtual === true ? true : undefined
      },
      sortBy: sortOrder
    };
  }

  getAgentProfile(agentId) {
    const allAgents = this._getFromStorage('agents', []);
    const agent = allAgents.find(a => a.id === agentId) || null;
    if (!agent) {
      return {
        agent: null,
        officeLocation: null,
        customerRatingSummary: null
      };
    }
    const officeLocation = {
      addressLine1: agent.office_address_line1 || '',
      addressLine2: agent.office_address_line2 || '',
      city: agent.city || '',
      state: agent.state || '',
      zipCode: agent.zip_code || '',
      latitude: agent.latitude != null ? agent.latitude : null,
      longitude: agent.longitude != null ? agent.longitude : null
    };
    const customerRatingSummary = {
      averageRating: agent.customer_rating || null,
      ratingCount: agent.rating_count || 0
    };
    return {
      agent: agent,
      officeLocation: officeLocation,
      customerRatingSummary: customerRatingSummary
    };
  }

  getAgentAvailableTimeSlots(agentId, appointmentType, date) {
    const slots = this._getFromStorage('agent_time_slots', []);
    const agents = this._getFromStorage('agents', []);
    const dateStr = date;
    const filtered = slots.filter(s => {
      if (s.agent_id !== agentId) return false;
      if (appointmentType && s.appointment_type !== appointmentType) return false;
      if (s.is_booked) return false;
      const slotDate = this._extractDate(s.start_datetime);
      if (dateStr && slotDate !== dateStr) return false;
      return true;
    }).map(s => {
      const agent = agents.find(a => a.id === s.agent_id) || null;
      return Object.assign({}, s, {
        agent: agent
      });
    });

    return {
      date: dateStr,
      appointmentType: appointmentType,
      timeSlots: filtered
    };
  }

  bookAppointment(agentTimeSlotId) {
    this._getOrCreateUserContext();
    const slots = this._getFromStorage('agent_time_slots', []);
    const slotIndex = slots.findIndex(s => s.id === agentTimeSlotId);
    if (slotIndex === -1) {
      return {
        success: false,
        appointment: null,
        message: 'Time slot not found.'
      };
    }
    const slot = slots[slotIndex];
    if (slot.is_booked) {
      return {
        success: false,
        appointment: null,
        message: 'Time slot already booked.'
      };
    }
    const appointment = {
      id: this._generateId('appt'),
      agent_id: slot.agent_id,
      agent_time_slot_id: slot.id,
      appointment_type: slot.appointment_type,
      location_type: slot.location_type,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime || null,
      status: 'scheduled',
      confirmation_note: null,
      created_at: this._now(),
      updated_at: this._now()
    };
    const appointments = this._getFromStorage('appointments', []);
    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    slots[slotIndex].is_booked = true;
    this._saveToStorage('agent_time_slots', slots);

    const agents = this._getFromStorage('agents', []);
    const agent = agents.find(a => a.id === slot.agent_id) || null;
    const enrichedAppt = Object.assign({}, appointment, {
      agent: agent,
      agentTimeSlot: slot
    });

    return {
      success: true,
      appointment: enrichedAppt,
      message: 'Appointment booked successfully.'
    };
  }

  // ========== Term Life Plans & Selection ==========

  searchTermLifePlans(coverageAmount, termLengthYears, filters, sortBy) {
    const allPlans = this._getFromStorage('term_life_plans', []);
    const effFilters = filters || {};
    const maxPremium = typeof effFilters.monthlyPremiumMax === 'number'
      ? effFilters.monthlyPremiumMax
      : null;
    const minRating = typeof effFilters.customerRatingMin === 'number'
      ? effFilters.customerRatingMin
      : null;

    let results = allPlans.filter(p => {
      if (p.status && p.status !== 'active') return false;
      if (typeof coverageAmount === 'number' &&
        typeof p.coverage_amount === 'number' &&
        p.coverage_amount < coverageAmount) {
        return false;
      }
      if (typeof termLengthYears === 'number' &&
        typeof p.term_length_years === 'number' &&
        p.term_length_years !== termLengthYears) {
        return false;
      }
      if (maxPremium != null && typeof p.monthly_premium === 'number' && p.monthly_premium > maxPremium) return false;
      if (minRating != null && typeof p.customer_rating === 'number' && p.customer_rating < minRating) return false;
      return true;
    });

    const sortOrder = sortBy || 'rating_high_to_low';
    const sortFnMap = {
      price_low_to_high: (a, b) => (a.monthly_premium || 0) - (b.monthly_premium || 0),
      price_high_to_low: (a, b) => (b.monthly_premium || 0) - (a.monthly_premium || 0),
      rating_high_to_low: (a, b) => (b.customer_rating || 0) - (a.customer_rating || 0),
      rating_low_to_high: (a, b) => (a.customer_rating || 0) - (b.customer_rating || 0)
    };
    const fn = sortFnMap[sortOrder] || sortFnMap.rating_high_to_low;
    results = results.slice().sort(fn);

    return {
      results: results,
      totalResults: results.length,
      appliedFilters: {
        monthlyPremiumMax: maxPremium,
        customerRatingMin: minRating
      },
      sortBy: sortOrder
    };
  }

  getTermLifePlanDetail(termLifePlanId) {
    const plans = this._getFromStorage('term_life_plans', []);
    const plan = plans.find(p => p.id === termLifePlanId) || null;
    if (!plan) {
      return {
        plan: null,
        coverageBreakdown: {
          coverageAmount: null,
          termLengthYears: null,
          coverageDetails: null
        }
      };
    }
    return {
      plan: plan,
      coverageBreakdown: {
        coverageAmount: plan.coverage_amount || null,
        termLengthYears: plan.term_length_years || null,
        coverageDetails: plan.coverage_details || null
      }
    };
  }

  selectTermLifePlan(termLifePlanId) {
    this._getOrCreateUserContext();
    const plans = this._getFromStorage('term_life_plans', []);
    const plan = plans.find(p => p.id === termLifePlanId) || null;
    if (!plan) {
      return {
        success: false,
        lifePlanSelection: null,
        message: 'Term life plan not found.'
      };
    }
    const selections = this._getFromStorage('life_plan_selections', []);
    const selection = {
      id: this._generateId('life_selection'),
      term_life_plan_id: termLifePlanId,
      status: 'in_progress',
      selected_at: this._now()
    };
    selections.push(selection);
    this._saveToStorage('life_plan_selections', selections);

    const enriched = Object.assign({}, selection, {
      termLifePlan: plan
    });

    return {
      success: true,
      lifePlanSelection: enriched,
      message: 'Term life plan selected.'
    };
  }

  // ========== Retirement & Funds ==========

  getRetirementOverviewData() {
    const data = this._getFromStorage('retirement_overview_data', null);
    const title = data && data.title ? data.title : '';
    const summary = data && data.summary ? data.summary : '';
    const primaryCtas = data && Array.isArray(data.primaryCtas) ? data.primaryCtas : [];

    const funds = this._getFromStorage('funds', []);
    const activeFunds = funds.filter(f => f.status === 'active');
    const featuredFunds = activeFunds
      .slice()
      .sort((a, b) => (b.customer_rating || 0) - (a.customer_rating || 0))
      .slice(0, 5);

    const events = this._getFromStorage('events', []);
    const upcomingEvents = events
      .filter(e => !e.is_cancelled)
      .filter(e => e.topic === 'retirement_planning')
      .sort((a, b) => new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0))
      .slice(0, 5);

    return {
      title: title,
      summary: summary,
      featuredFunds: featuredFunds,
      upcomingEvents: upcomingEvents,
      primaryCtas: primaryCtas
    };
  }

  getFundFilterOptions() {
    const funds = this._getFromStorage('funds', []);
    let minFee = null;
    let maxFee = null;
    funds.forEach(f => {
      if (typeof f.annual_fee_percentage === 'number') {
        if (minFee === null || f.annual_fee_percentage < minFee) minFee = f.annual_fee_percentage;
        if (maxFee === null || f.annual_fee_percentage > maxFee) maxFee = f.annual_fee_percentage;
      }
    });
    if (minFee === null) {
      minFee = 0;
      maxFee = 2;
    }
    const riskLevels = [
      { value: 'low', label: 'Low' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'high', label: 'High' }
    ];
    const ratingThresholds = [
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 5, label: '5 stars only' }
    ];
    const feeRange = {
      min: minFee,
      max: maxFee,
      step: 0.05
    };
    const sortOptions = [
      { value: 'annual_fee_low_to_high', label: 'Annual Fee - Low to High' },
      { value: 'annual_fee_high_to_low', label: 'Annual Fee - High to Low' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' },
      { value: 'one_year_return_high_to_low', label: '1-Year Return - High to Low' }
    ];
    return {
      riskLevels: riskLevels,
      ratingThresholds: ratingThresholds,
      feeRange: feeRange,
      sortOptions: sortOptions
    };
  }

  searchFunds(filters, sortBy) {
    const allFunds = this._getFromStorage('funds', []);
    const effFilters = filters || {};
    const riskLevel = effFilters.riskLevel || null;
    const minRating = typeof effFilters.customerRatingMin === 'number'
      ? effFilters.customerRatingMin
      : null;
    const maxFee = typeof effFilters.annualFeeMax === 'number'
      ? effFilters.annualFeeMax
      : null;
    const category = effFilters.category || null;

    let results = allFunds.filter(f => {
      if (f.status && f.status !== 'active') return false;
      if (riskLevel && f.risk_level !== riskLevel) return false;
      if (minRating != null && typeof f.customer_rating === 'number' && f.customer_rating < minRating) return false;
      if (maxFee != null && typeof f.annual_fee_percentage === 'number' && f.annual_fee_percentage > maxFee) return false;
      if (category && f.category && f.category.toLowerCase() !== category.toLowerCase()) return false;
      return true;
    });

    const sortOrder = sortBy || 'annual_fee_low_to_high';
    if (sortOrder === 'annual_fee_low_to_high') {
      results = results.slice().sort((a, b) => (a.annual_fee_percentage || 0) - (b.annual_fee_percentage || 0));
    } else if (sortOrder === 'annual_fee_high_to_low') {
      results = results.slice().sort((a, b) => (b.annual_fee_percentage || 0) - (a.annual_fee_percentage || 0));
    } else if (sortOrder === 'rating_high_to_low') {
      results = results.slice().sort((a, b) => (b.customer_rating || 0) - (a.customer_rating || 0));
    } else if (sortOrder === 'one_year_return_high_to_low') {
      results = results.slice().sort((a, b) => (b.one_year_return_percentage || 0) - (a.one_year_return_percentage || 0));
    }

    return {
      results: results,
      totalResults: results.length,
      appliedFilters: {
        riskLevel: riskLevel,
        customerRatingMin: minRating,
        annualFeeMax: maxFee,
        category: category
      },
      sortBy: sortOrder
    };
  }

  getFundDetail(fundId) {
    const funds = this._getFromStorage('funds', []);
    const fund = funds.find(f => f.id === fundId) || null;
    if (!fund) {
      return {
        fund: null,
        performanceHistory: {
          oneYearReturnPercentage: null,
          threeYearReturnPercentage: null,
          fiveYearReturnPercentage: null
        },
        riskProfileSummary: '',
        feeDetails: {
          annualFeePercentage: null,
          feeComparisonToCategory: ''
        }
      };
    }
    let riskProfileSummary = '';
    if (fund.risk_level === 'low') {
      riskProfileSummary = 'Lower-risk fund focused on capital preservation.';
    } else if (fund.risk_level === 'moderate') {
      riskProfileSummary = 'Moderate-risk fund balancing growth and stability.';
    } else if (fund.risk_level === 'high') {
      riskProfileSummary = 'Higher-risk fund focused on growth with greater volatility.';
    }
    const feeDetails = {
      annualFeePercentage: fund.annual_fee_percentage || null,
      feeComparisonToCategory: ''
    };
    return {
      fund: fund,
      performanceHistory: {
        oneYearReturnPercentage: fund.one_year_return_percentage || null,
        threeYearReturnPercentage: fund.three_year_return_percentage || null,
        fiveYearReturnPercentage: fund.five_year_return_percentage || null
      },
      riskProfileSummary: riskProfileSummary,
      feeDetails: feeDetails
    };
  }

  getFavoriteLists() {
    this._getOrCreateUserContext();
    const lists = this._getFromStorage('favorite_lists', []);
    const defaultList = this._getDefaultFavoriteList();
    const allListsRaw = this._getFromStorage('favorite_lists', []);
    const funds = this._getFromStorage('funds', []);
    const enrichedLists = allListsRaw.map(list => {
      const fundIds = Array.isArray(list.fund_ids) ? list.fund_ids : [];
      const relatedFunds = fundIds
        .map(id => funds.find(f => f.id === id))
        .filter(Boolean);
      return Object.assign({}, list, {
        funds: relatedFunds
      });
    });
    // ensure default list is present in enrichedLists
    const hasDefault = enrichedLists.some(l => l.id === defaultList.id);
    if (!hasDefault) {
      const fundIds = Array.isArray(defaultList.fund_ids) ? defaultList.fund_ids : [];
      const relatedFunds = fundIds
        .map(id => funds.find(f => f.id === id))
        .filter(Boolean);
      enrichedLists.push(Object.assign({}, defaultList, { funds: relatedFunds }));
    }
    return enrichedLists;
  }

  addFundToFavoriteList(fundId, favoriteListId) {
    this._getOrCreateUserContext();
    const funds = this._getFromStorage('funds', []);
    const fund = funds.find(f => f.id === fundId) || null;
    if (!fund) {
      return {
        success: false,
        updatedFavoriteList: null,
        message: 'Fund not found.'
      };
    }
    const lists = this._getFromStorage('favorite_lists', []);
    let list = lists.find(l => l.id === favoriteListId) || null;
    if (!list) {
      list = this._getDefaultFavoriteList();
    }
    if (!Array.isArray(list.fund_ids)) {
      list.fund_ids = [];
    }
    if (list.fund_ids.indexOf(fundId) === -1) {
      list.fund_ids.push(fundId);
      list.updated_at = this._now();
    }
    const idx = lists.findIndex(l => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('favorite_lists', lists);

    const relatedFunds = list.fund_ids
      .map(id => funds.find(f => f.id === id))
      .filter(Boolean);
    const enrichedList = Object.assign({}, list, { funds: relatedFunds });

    return {
      success: true,
      updatedFavoriteList: enrichedList,
      message: 'Fund added to favorites.'
    };
  }

  // ========== Claims Center & Claims ==========

  getClaimsCenterContent() {
    const content = this._getFromStorage('claims_center_content', null);
    const introText = content && content.introText ? content.introText : '';
    const helpContacts = content && Array.isArray(content.helpContacts)
      ? content.helpContacts
      : [];
    const claimTypes = [
      {
        type: 'auto',
        label: 'Auto Insurance',
        description: 'File a claim for an auto accident, theft, or damage.'
      },
      {
        type: 'home',
        label: 'Home Insurance',
        description: 'File a claim for damage to your home or property.'
      },
      {
        type: 'property',
        label: 'Property',
        description: 'File a claim for other insured property.'
      },
      {
        type: 'life',
        label: 'Life Insurance',
        description: 'File a life insurance claim.'
      },
      {
        type: 'other',
        label: 'Other',
        description: 'File a claim that does not fit the above categories.'
      }
    ];
    return {
      introText: introText,
      claimTypes: claimTypes,
      helpContacts: helpContacts
    };
  }

  getClaimFormOptions(claimType) {
    const type = claimType || 'auto';
    let incidentTypes = [];
    let vehicleStatusOptions = [];
    let injuryStatusOptions = [
      { value: 'no_injuries', label: 'No injuries' },
      { value: 'minor_injuries', label: 'Minor injuries' },
      { value: 'serious_injuries', label: 'Serious injuries' },
      { value: 'fatalities', label: 'Fatalities' },
      { value: 'unknown', label: 'Unknown' }
    ];

    if (type === 'auto') {
      incidentTypes = [
        { value: 'minor_accident_fender_bender', label: 'Minor accident / fender-bender' },
        { value: 'major_collision', label: 'Major collision' },
        { value: 'theft', label: 'Theft' },
        { value: 'vandalism', label: 'Vandalism' },
        { value: 'weather', label: 'Weather-related damage' },
        { value: 'other', label: 'Other' }
      ];
      vehicleStatusOptions = [
        { value: 'drivable', label: 'Vehicle is drivable' },
        { value: 'not_drivable', label: 'Vehicle is not drivable' },
        { value: 'towed', label: 'Vehicle has been towed' }
      ];
    } else {
      incidentTypes = [
        { value: 'weather', label: 'Weather-related damage' },
        { value: 'theft', label: 'Theft' },
        { value: 'vandalism', label: 'Vandalism' },
        { value: 'other', label: 'Other' }
      ];
      vehicleStatusOptions = [];
    }

    return {
      claimType: type,
      incidentTypes: incidentTypes,
      vehicleStatusOptions: vehicleStatusOptions,
      injuryStatusOptions: injuryStatusOptions
    };
  }

  submitClaim(
    claimType,
    incidentDate,
    incidentType,
    vehicleStatus,
    injuryStatus,
    description
  ) {
    this._getOrCreateUserContext();
    const claims = this._getFromStorage('claims', []);
    const claim = {
      id: this._generateId('claim'),
      claim_number: this._generateClaimNumber(),
      claim_type: claimType,
      submitted_via: 'online',
      incident_date: incidentDate ? new Date(incidentDate).toISOString() : this._now(),
      incident_type: incidentType,
      vehicle_status: vehicleStatus || null,
      injury_status: injuryStatus,
      description: description,
      status: 'submitted',
      created_at: this._now(),
      updated_at: this._now()
    };
    claims.push(claim);
    this._saveToStorage('claims', claims);
    return {
      success: true,
      claim: claim,
      message: 'Claim submitted successfully.'
    };
  }

  // ========== Events & Workshops ==========

  getEventFilterOptions() {
    const topics = [
      { value: 'retirement_planning', label: 'Retirement planning' },
      { value: 'insurance_basics', label: 'Insurance basics' },
      { value: 'investing', label: 'Investing' },
      { value: 'estate_planning', label: 'Estate planning' },
      { value: 'other', label: 'Other' }
    ];
    const distanceOptions = [
      { value: 5, label: 'Within 5 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 15, label: 'Within 15 miles' },
      { value: 25, label: 'Within 25 miles' },
      { value: 50, label: 'Within 50 miles' }
    ];
    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' }
    ];
    const formatOptions = [
      { value: 'in_person', label: 'In person' },
      { value: 'virtual', label: 'Virtual' },
      { value: 'hybrid', label: 'Hybrid' }
    ];
    const sortOptions = [
      { value: 'date_soonest', label: 'Date - Soonest' },
      { value: 'distance_nearest', label: 'Distance - Nearest' },
      { value: 'title_a_to_z', label: 'Title A–Z' }
    ];
    return {
      topics: topics,
      distanceOptions: distanceOptions,
      timeOfDayOptions: timeOfDayOptions,
      formatOptions: formatOptions,
      sortOptions: sortOptions
    };
  }

  searchEvents(filters, sortBy) {
    const effFilters = filters || {};
    const topic = effFilters.topic || null;
    const zipCode = effFilters.zipCode || null;
    const radiusMiles = typeof effFilters.radiusMiles === 'number' ? effFilters.radiusMiles : null;
    const timeOfDay = effFilters.timeOfDay || null;
    const format = effFilters.format || null;
    const isWeekday = typeof effFilters.isWeekday === 'boolean' ? effFilters.isWeekday : null;

    const events = this._getFromStorage('events', []);
    let results = events.filter(e => {
      if (e.is_cancelled) return false;
      if (topic && e.topic !== topic) return false;
      if (zipCode && e.zip_code && e.zip_code !== zipCode) return false;
      if (timeOfDay && e.time_of_day && e.time_of_day !== timeOfDay) return false;
      if (format && e.format && e.format !== format) return false;
      if (isWeekday != null && typeof e.is_weekday === 'boolean' && e.is_weekday !== isWeekday) return false;
      return true;
    });

    const sortOrder = sortBy || 'date_soonest';
    if (sortOrder === 'date_soonest') {
      results = results.slice().sort((a, b) => new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0));
    } else if (sortOrder === 'title_a_to_z') {
      results = results.slice().sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    } else if (sortOrder === 'distance_nearest') {
      results = results.slice().sort((a, b) => {
        const az = (a.zip_code || '').toString();
        const bz = (b.zip_code || '').toString();
        if (az < bz) return -1;
        if (az > bz) return 1;
        return 0;
      });
    }

    // Instrumentation for task completion tracking
    try {
      const task7_eventSearchParams = {
        topic: topic,
        zipCode: zipCode,
        radiusMiles: radiusMiles,
        timeOfDay: timeOfDay,
        format: format,
        isWeekday: isWeekday,
        sortBy: sortOrder,
        timestamp: this._now()
      };
      localStorage.setItem('task7_eventSearchParams', JSON.stringify(task7_eventSearchParams));
    } catch (e) {}

    return {
      results: results,
      totalResults: results.length,
      appliedFilters: {
        topic: topic,
        zipCode: zipCode,
        radiusMiles: radiusMiles,
        timeOfDay: timeOfDay,
        format: format,
        isWeekday: isWeekday
      },
      sortBy: sortOrder
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    const detailsKey = 'event_details_' + eventId;
    const details = this._getFromStorage(detailsKey, null);
    const agenda = details && details.agenda ? details.agenda : '';
    const speakers = details && Array.isArray(details.speakers) ? details.speakers : [];
    return {
      event: event,
      agenda: agenda,
      speakers: speakers
    };
  }

  registerForEvent(eventId, fullName, email, numberOfAttendees, subscribeToNewsletter) {
    this._getOrCreateUserContext();
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        registration: null,
        message: 'Event not found.'
      };
    }
    const registrations = this._getFromStorage('event_registrations', []);
    const reg = {
      id: this._generateId('event_reg'),
      event_id: eventId,
      full_name: fullName,
      email: email,
      number_of_attendees: numberOfAttendees,
      subscribe_to_newsletter: subscribeToNewsletter === true,
      status: 'registered',
      registration_date: this._now()
    };
    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    const enriched = Object.assign({}, reg, {
      event: event
    });

    return {
      success: true,
      registration: enriched,
      message: 'Registered for event.'
    };
  }

  // ========== Bundles & Discounts ==========

  getBundlesOverviewData() {
    const content = this._getFromStorage('bundles_overview_content', null);
    const introText = content && content.introText ? content.introText : '';
    const benefitsList = content && Array.isArray(content.benefitsList)
      ? content.benefitsList
      : [];
    const exampleDiscounts = content && Array.isArray(content.exampleDiscounts)
      ? content.exampleDiscounts
      : [];

    const bundles = this._getFromStorage('insurance_bundles', []);
    const popularBundlesRaw = bundles
      .filter(b => b.status === 'active')
      .slice()
      .sort((a, b) => (b.bundle_discount_percentage || 0) - (a.bundle_discount_percentage || 0))
      .slice(0, 5);
    const popularBundles = popularBundlesRaw.map(b => this._resolveBundleForeignKeys(b));

    return {
      introText: introText,
      benefitsList: benefitsList,
      popularBundles: popularBundles,
      exampleDiscounts: exampleDiscounts
    };
  }

  getBundleBuilderOptions() {
    const availableProducts = [
      {
        value: 'auto_insurance',
        label: 'Auto Insurance',
        description: 'Protect your vehicles with auto coverage.'
      },
      {
        value: 'home_insurance',
        label: 'Home Insurance',
        description: 'Coverage for your home and belongings.'
      },
      {
        value: 'life_insurance',
        label: 'Life Insurance',
        description: 'Protect your loved ones with life coverage.'
      },
      {
        value: 'retirement_investments',
        label: 'Retirement & Investments',
        description: 'Investment products for retirement planning.'
      }
    ];
    const discountRange = {
      min: 0,
      max: 30,
      step: 1,
      defaultMin: 10
    };
    const sortOptions = [
      { value: 'discount_high_to_low', label: 'Discount - High to Low' },
      { value: 'discount_low_to_high', label: 'Discount - Low to High' },
      { value: 'combined_premium_low_to_high', label: 'Combined Premium - Low to High' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' }
    ];
    return {
      availableProducts: availableProducts,
      discountRange: discountRange,
      sortOptions: sortOptions
    };
  }

  searchInsuranceBundles(includedProducts, minDiscountPercentage, sortBy) {
    const bundles = this._getFromStorage('insurance_bundles', []);
    const productsNeeded = Array.isArray(includedProducts) ? includedProducts : [];
    const minDiscount = typeof minDiscountPercentage === 'number' ? minDiscountPercentage : 0;

    let resultsRaw = bundles.filter(b => {
      if (b.status && b.status !== 'active') return false;
      if (productsNeeded.length > 0) {
        const hasAll = productsNeeded.every(p => Array.isArray(b.included_products) && b.included_products.indexOf(p) !== -1);
        if (!hasAll) return false;
      }
      if (typeof b.bundle_discount_percentage === 'number' &&
        b.bundle_discount_percentage < minDiscount) {
        return false;
      }
      return true;
    });

    const sortOrder = sortBy || 'discount_high_to_low';
    if (sortOrder === 'discount_high_to_low') {
      resultsRaw = resultsRaw.slice().sort((a, b) => (b.bundle_discount_percentage || 0) - (a.bundle_discount_percentage || 0));
    } else if (sortOrder === 'discount_low_to_high') {
      resultsRaw = resultsRaw.slice().sort((a, b) => (a.bundle_discount_percentage || 0) - (b.bundle_discount_percentage || 0));
    } else if (sortOrder === 'combined_premium_low_to_high') {
      resultsRaw = resultsRaw.slice().sort((a, b) => (a.combined_monthly_premium || 0) - (b.combined_monthly_premium || 0));
    } else if (sortOrder === 'rating_high_to_low') {
      resultsRaw = resultsRaw.slice().sort((a, b) => (b.customer_rating || 0) - (a.customer_rating || 0));
    }

    const results = resultsRaw.map(b => this._resolveBundleForeignKeys(b));

    const availableSortOptions = [
      { value: 'discount_high_to_low', label: 'Discount - High to Low' },
      { value: 'discount_low_to_high', label: 'Discount - Low to High' },
      { value: 'combined_premium_low_to_high', label: 'Combined Premium - Low to High' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' }
    ];

    return {
      results: results,
      totalResults: results.length,
      appliedFilters: {
        includedProducts: productsNeeded,
        minDiscountPercentage: minDiscount
      },
      sortBy: sortOrder,
      availableSortOptions: availableSortOptions
    };
  }

  getBundleDetail(bundleId) {
    const bundles = this._getFromStorage('insurance_bundles', []);
    const bundle = bundles.find(b => b.id === bundleId) || null;
    const resolved = this._resolveBundleForeignKeys(bundle);
    const autoPolicy = resolved ? resolved.autoPolicy : null;
    const homePolicy = resolved ? resolved.homePolicy : null;
    const lifePlan = resolved ? resolved.lifePlan : null;

    let estimatedMonthlySavings = 0;
    if (bundle) {
      let basePremium = 0;
      if (autoPolicy && typeof autoPolicy.monthly_premium === 'number') {
        basePremium += autoPolicy.monthly_premium;
      }
      if (homePolicy && typeof homePolicy.monthly_premium === 'number') {
        basePremium += homePolicy.monthly_premium;
      }
      if (lifePlan && typeof lifePlan.monthly_premium === 'number') {
        basePremium += lifePlan.monthly_premium;
      }
      if (typeof bundle.bundle_discount_percentage === 'number') {
        estimatedMonthlySavings = basePremium * (bundle.bundle_discount_percentage / 100);
      }
    }

    return {
      bundle: resolved,
      includedAutoPolicy: autoPolicy || null,
      includedHomePolicy: homePolicy || null,
      includedLifePlan: lifePlan || null,
      savingsSummary: {
        bundleDiscountPercentage: bundle ? bundle.bundle_discount_percentage || 0 : 0,
        estimatedMonthlySavings: estimatedMonthlySavings
      }
    };
  }

  saveBundle(bundleId, customName, notes) {
    this._getOrCreateUserContext();
    const bundles = this._getFromStorage('insurance_bundles', []);
    const bundle = bundles.find(b => b.id === bundleId) || null;
    if (!bundle) {
      return {
        success: false,
        savedBundle: null,
        message: 'Bundle not found.'
      };
    }
    const saved = this._getFromStorage('saved_bundles', []);
    const record = {
      id: this._generateId('saved_bundle'),
      bundle_id: bundleId,
      custom_name: customName || null,
      notes: notes || null,
      saved_at: this._now()
    };
    saved.push(record);
    this._saveToStorage('saved_bundles', saved);

    const enriched = Object.assign({}, record, {
      bundle: this._resolveBundleForeignKeys(bundle)
    });

    return {
      success: true,
      savedBundle: enriched,
      message: 'Bundle saved.'
    };
  }

  // ========== Contact & Service Requests ==========

  getContactPageContent() {
    const content = this._getFromStorage('contact_page_content', null);
    const generalContacts = content && Array.isArray(content.generalContacts)
      ? content.generalContacts
      : [];
    const supportHours = content && content.supportHours ? content.supportHours : '';
    const officeLocationsSummary = content && Array.isArray(content.officeLocationsSummary)
      ? content.officeLocationsSummary
      : [];
    return {
      generalContacts: generalContacts,
      supportHours: supportHours,
      officeLocationsSummary: officeLocationsSummary
    };
  }

  getServiceRequestFormOptions() {
    const requestTypes = [
      { value: 'policy_review', label: 'Policy review' },
      { value: 'billing_question', label: 'Billing question' },
      { value: 'technical_support', label: 'Technical support' },
      { value: 'claim_status', label: 'Claim status' },
      { value: 'new_quote', label: 'New quote' },
      { value: 'other', label: 'Other' }
    ];
    const productOptions = [
      { value: 'auto_insurance', label: 'Auto Insurance' },
      { value: 'home_insurance', label: 'Home Insurance' },
      { value: 'life_insurance', label: 'Life Insurance' },
      { value: 'retirement_investments', label: 'Retirement & Investments' },
      { value: 'bundles_discounts', label: 'Bundles & Discounts' },
      { value: 'claims', label: 'Claims' }
    ];
    const preferredContactTimes = [
      { value: 'weekday_morning_9_12', label: 'Weekday morning (9:00 AM - 12:00 PM)' },
      { value: 'weekday_afternoon_12_2', label: 'Weekday afternoon (12:00 PM - 2:00 PM)' },
      { value: 'weekday_afternoon_2_4', label: 'Weekday afternoon (2:00 PM - 4:00 PM)' },
      { value: 'weekday_evening_4_6', label: 'Weekday evening (4:00 PM - 6:00 PM)' },
      { value: 'anytime_weekday', label: 'Anytime on weekdays' },
      { value: 'anytime', label: 'Anytime' }
    ];
    return {
      requestTypes: requestTypes,
      productOptions: productOptions,
      preferredContactTimes: preferredContactTimes
    };
  }

  submitServiceRequest(
    requestType,
    products,
    fullName,
    phoneNumber,
    email,
    preferredContactTime,
    message
  ) {
    this._getOrCreateUserContext();
    const requests = this._getFromStorage('service_requests', []);
    const req = {
      id: this._generateId('svc_req'),
      request_type: requestType,
      products: Array.isArray(products) ? products : [],
      full_name: fullName,
      phone_number: phoneNumber || null,
      email: email,
      preferred_contact_time: preferredContactTime || null,
      message: message,
      status: 'submitted',
      created_at: this._now(),
      updated_at: this._now()
    };
    requests.push(req);
    this._saveToStorage('service_requests', requests);
    return {
      success: true,
      serviceRequest: req,
      message: 'Service request submitted.'
    };
  }

  // ========== About & Legal ==========

  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', null);
    const mission = content && content.mission ? content.mission : '';
    const history = content && content.history ? content.history : '';
    const communityInvolvement = content && Array.isArray(content.communityInvolvement)
      ? content.communityInvolvement
      : [];
    const officeSummaries = content && Array.isArray(content.officeSummaries)
      ? content.officeSummaries
      : [];
    return {
      mission: mission,
      history: history,
      communityInvolvement: communityInvolvement,
      officeSummaries: officeSummaries
    };
  }

  getLegalContent(section) {
    const data = this._getFromStorage('legal_content', { sections: [] });
    let sections = Array.isArray(data.sections) ? data.sections : [];
    const filter = section && section !== 'all' ? section : null;
    if (filter) {
      sections = sections.filter(s => s.id === filter);
    }
    return {
      sections: sections
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