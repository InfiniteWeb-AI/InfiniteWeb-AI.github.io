// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill, also attached to globalThis for shared use
  let store = {};
  const polyfill = {
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
  try {
    if (typeof globalThis !== "undefined") {
      globalThis.localStorage = polyfill;
    }
  } catch (e) {}
  return polyfill;
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
  }

  // ------------ Storage & ID helpers ------------

  _initStorage() {
    const keys = [
      'services',
      'therapists',
      'clinic_locations',
      'appointment_slots',
      'appointment_requests',
      'favorite_therapists',
      'resource_items',
      'saved_resources',
      'group_programs',
      'group_session_options',
      'group_registrations',
      'insurance_plans',
      'service_pricing',
      'cost_estimates',
      'cost_estimate_items',
      'cost_estimate_contact_requests',
      'callback_requests',
      'weekly_plans',
      'weekly_plan_sessions',
      'donation_funds',
      'donation_pledges',
      // internal helper tables
      'planner_drafts',
      'general_contact_requests'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (localStorage.getItem('idCounter') === null) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ------------ Lookup & formatting helpers ------------

  _findById(collectionKey, id) {
    const items = this._getFromStorage(collectionKey);
    return items.find((item) => item.id === id) || null;
  }

  _ageGroupToLabel(value) {
    if (!value) return '';
    const map = {
      ages_0_2: 'Ages 0 2',
      ages_3_5: 'Ages 3 5',
      ages_6_8: 'Ages 6 8',
      ages_8_10: 'Ages 8 10',
      ages_11_13: 'Ages 11 13',
      teens_13_17: 'Teens 13 17',
      ages_13_17: 'Ages 13 17'
    };
    return map[value] || value;
  }

  _dayOfWeekToLabel(value) {
    const map = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return map[value] || value;
  }

  _readingTimeRangesConfig() {
    return [
      { value: 'under_5', label: 'Under 5 minutes', minMinutes: 0, maxMinutes: 4 },
      { value: '5_10', label: '5 10 minutes', minMinutes: 5, maxMinutes: 10 },
      { value: '10_20', label: '10 20 minutes', minMinutes: 10, maxMinutes: 20 },
      { value: 'over_20', label: 'Over 20 minutes', minMinutes: 21, maxMinutes: 999 }
    ];
  }

  _distanceOptionsConfig() {
    return [
      { miles: 5, label: 'Within 5 miles' },
      { miles: 10, label: 'Within 10 miles' },
      { miles: 15, label: 'Within 15 miles' },
      { miles: 25, label: 'Within 25 miles' },
      { miles: 50, label: 'Within 50 miles' }
    ];
  }

  _amenitiesConfig() {
    return [
      { value: 'free_parking', label: 'Free Parking' },
      { value: 'wheelchair_accessible', label: 'Wheelchair Accessible' },
      { value: 'sensory_friendly', label: 'Sensory-friendly space' }
    ];
  }

  _hoursOptionsConfig() {
    return [
      { value: 'open_saturday', label: 'Open Saturdays' },
      { value: 'evening_hours', label: 'Evening hours' }
    ];
  }

  _getOrCreateFavoritesStore() {
    let favorites = this._getFromStorage('favorite_therapists');
    if (!Array.isArray(favorites)) favorites = [];
    return favorites;
  }

  _getOrCreateSavedResourcesStore() {
    let saved = this._getFromStorage('saved_resources');
    if (!Array.isArray(saved)) saved = [];
    return saved;
  }

  _getOrCreatePlannerDraft(planDraftId) {
    let drafts = this._getFromStorage('planner_drafts');
    if (!Array.isArray(drafts)) drafts = [];

    let draft = drafts.find((d) => d.id === planDraftId);
    if (!draft) {
      draft = { id: planDraftId, child_name: '', sessions: [] };
      drafts.push(draft);
      this._saveToStorage('planner_drafts', drafts);
    }
    return { drafts, draft };
  }

  _persistWeeklyPlan(planDraft, planName) {
    const weeklyPlans = this._getFromStorage('weekly_plans');
    const weeklyPlanSessions = this._getFromStorage('weekly_plan_sessions');

    const weeklyPlanId = this._generateId('weeklyplan');
    const now = this._nowIso();

    const newPlan = {
      id: weeklyPlanId,
      name: planName,
      child_name: planDraft.child_name || '',
      created_at: now,
      updated_at: now
    };
    weeklyPlans.push(newPlan);

    for (const s of planDraft.sessions || []) {
      weeklyPlanSessions.push({
        id: this._generateId('wpsession'),
        weekly_plan_id: weeklyPlanId,
        service_id: s.service_id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        duration_minutes: s.duration_minutes,
        notes: s.notes || ''
      });
    }

    this._saveToStorage('weekly_plans', weeklyPlans);
    this._saveToStorage('weekly_plan_sessions', weeklyPlanSessions);

    return {
      weeklyPlanId,
      plan: newPlan,
      totalSessions: (planDraft.sessions || []).length
    };
  }

  _createCostEstimateRecord(serviceItems, insurancePlan) {
    const servicePricing = this._getFromStorage('service_pricing');
    const services = this._getFromStorage('services');

    const costEstimateId = this._generateId('ce');
    const now = this._nowIso();

    const isInNetwork = insurancePlan && insurancePlan.network_status === 'in_network';

    const lineItems = [];
    let total = 0;

    for (let index = 0; index < serviceItems.length; index++) {
      const item = serviceItems[index];
      const service = services.find((s) => s.id === item.serviceId);
      if (!service) continue;
      const pricing = servicePricing.find((p) => p.service_id === item.serviceId);
      if (!pricing) continue;

      const baseRate = Number(pricing.base_rate_per_session) || 0;
      const inMod = typeof pricing.in_network_rate_modifier === 'number' ? pricing.in_network_rate_modifier : 1;
      const outMod = typeof pricing.out_of_network_rate_modifier === 'number' ? pricing.out_of_network_rate_modifier : 1;
      const modifier = isInNetwork ? inMod : outMod;

      const ratePerSession = baseRate * modifier;
      const sessionsPerMonth = Number(item.sessionsPerMonth) || 0;
      const subtotal = ratePerSession * sessionsPerMonth;
      total += subtotal;

      lineItems.push({
        id: this._generateId('ceitem'),
        cost_estimate_id: costEstimateId,
        service_id: item.serviceId,
        sessions_per_month: sessionsPerMonth,
        rate_per_session: ratePerSession,
        subtotal_monthly_cost: subtotal,
        order_index: index
      });
    }

    const costEstimates = this._getFromStorage('cost_estimates');
    costEstimates.push({
      id: costEstimateId,
      insurance_plan_id: insurancePlan ? insurancePlan.id : null,
      total_monthly_cost: total,
      created_at: now,
      details_note: ''
    });
    this._saveToStorage('cost_estimates', costEstimates);

    const existingItems = this._getFromStorage('cost_estimate_items');
    this._saveToStorage('cost_estimate_items', existingItems.concat(lineItems));

    return { costEstimateId, total, lineItems, createdAt: now };
  }

  // Helper: map WeeklyPlan draft sessions to API format
  _mapPlannerSessionsToApi(sessions) {
    const services = this._getFromStorage('services');
    return (sessions || []).map((s) => {
      const service = services.find((srv) => srv.id === s.service_id) || null;
      return {
        sessionId: s.id,
        serviceId: s.service_id,
        serviceName: service ? service.name : '',
        childName: s.child_name,
        dayOfWeek: s.day_of_week,
        startTime: s.start_time,
        durationMinutes: s.duration_minutes,
        notes: s.notes || '',
        service
      };
    });
  }

  // ------------ Interface implementations ------------

  // getHomePageContent
  getHomePageContent() {
    const services = this._getFromStorage('services');
    const groups = this._getFromStorage('group_programs');
    const locations = this._getFromStorage('clinic_locations');
    const resources = this._getFromStorage('resource_items');
    const funds = this._getFromStorage('donation_funds');

    // Featured services: first 3
    const featuredServices = services.slice(0, 3).map((s) => ({
      serviceId: s.id,
      name: s.name,
      shortDescription: s.description || '',
      ageGroupLabels: Array.isArray(s.age_groups) ? s.age_groups.map((ag) => this._ageGroupToLabel(ag)) : [],
      primaryCtaLabel: s.evaluation_available ? 'Schedule an Evaluation' : 'Learn More',
      service: s
    }));

    // Featured groups: active, soonest start
    const activeGroups = groups.filter((g) => g.is_active);
    activeGroups.sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return da - db;
    });
    const featuredGroups = activeGroups.slice(0, 3).map((g) => {
      const loc = locations.find((l) => l.id === g.location_id) || null;
      return {
        groupProgramId: g.id,
        title: g.title,
        ageRangeLabel: Array.isArray(g.age_groups) && g.age_groups.length
          ? g.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
          : '',
        scheduleSummary: g.schedule_summary || '',
        startDate: g.start_date || null,
        pricePerChild: g.price_per_child,
        locationName: loc ? loc.name : '',
        groupProgram: g,
        location: loc
      };
    });

    // Featured resources: latest 3
    const sortedResources = resources.slice().sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
    const featuredResources = sortedResources.slice(0, 3).map((r) => ({
      resourceId: r.id,
      title: r.title,
      primaryTopic: r.primary_topic || '',
      ageRangeLabel: Array.isArray(r.age_groups) && r.age_groups.length
        ? r.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
        : '',
      readingTimeMinutes: r.reading_time_minutes,
      resource: r
    }));

    // Featured donation campaigns: active funds
    const activeFunds = funds.filter((f) => f.is_active);
    activeFunds.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 9999;
      const bo = typeof b.display_order === 'number' ? b.display_order : 9999;
      return ao - bo;
    });
    const featuredDonationCampaigns = activeFunds.slice(0, 3).map((f) => ({
      fundId: f.id,
      name: f.name,
      shortDescription: f.description || '',
      suggestedAmount: 50,
      fund: f
    }));

    return {
      heroTitle: 'Warm, playful therapy support for your child',
      heroSubtitle: 'Speech, occupational therapy, and counseling designed just for kids and teens.',
      heroBody:
        'Our multidisciplinary team partners with families to build skills, confidence, and joyful participation at home, school, and in the community.',
      heroCtas: [
        { label: 'Schedule a Speech Evaluation', actionKey: 'schedule_speech_evaluation' },
        { label: 'Find a Therapist', actionKey: 'find_therapist' },
        { label: 'Explore Parent Resources', actionKey: 'browse_resources' }
      ],
      featuredServices,
      featuredGroups,
      featuredResources,
      featuredDonationCampaigns
    };
  }

  // getServicesOverview
  getServicesOverview() {
    const services = this._getFromStorage('services');
    const groupPrograms = this._getFromStorage('group_programs');

    const result = services.map((s) => {
      const hasGroupOptions = groupPrograms.some(
        (g) => g.related_service_id === s.id && g.is_active
      );
      return {
        serviceId: s.id,
        code: s.code,
        name: s.name,
        shortName: s.short_name || '',
        description: s.description || '',
        ageGroupLabels: Array.isArray(s.age_groups) ? s.age_groups.map((ag) => this._ageGroupToLabel(ag)) : [],
        typicalSessionLengthMinutes: s.typical_session_length_minutes || null,
        evaluationAvailable: !!s.evaluation_available,
        hasGroupOptions,
        service: s
      };
    });

    return { services: result };
  }

  // getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const groupPrograms = this._getFromStorage('group_programs');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        serviceId: null,
        code: '',
        name: '',
        shortName: '',
        description: '',
        goals: '',
        methods: '',
        whatToExpect: '',
        ageGroupLabels: [],
        typicalSessionLengthMinutes: null,
        typicalFrequencySummary: '',
        evaluationAvailable: false,
        isGroupService: false,
        hasGroupOptions: false,
        primaryCtaLabel: ''
      };
    }

    const hasGroupOptions = groupPrograms.some(
      (g) => g.related_service_id === service.id && g.is_active
    );

    const goals = service.description || '';
    const methods = '';
    const whatToExpect = '';

    const typicalFrequencySummary = service.typical_session_length_minutes
      ? `Typically once per week for ${service.typical_session_length_minutes} minutes.`
      : '';

    return {
      serviceId: service.id,
      code: service.code,
      name: service.name,
      shortName: service.short_name || '',
      description: service.description || '',
      goals,
      methods,
      whatToExpect,
      ageGroupLabels: Array.isArray(service.age_groups)
        ? service.age_groups.map((ag) => this._ageGroupToLabel(ag))
        : [],
      typicalSessionLengthMinutes: service.typical_session_length_minutes || null,
      typicalFrequencySummary,
      evaluationAvailable: !!service.evaluation_available,
      isGroupService: !!service.is_group_service,
      hasGroupOptions,
      primaryCtaLabel: service.evaluation_available ? 'Schedule an Evaluation' : 'Request Appointment',
      service
    };
  }

  // getServiceRelatedContent(serviceId)
  getServiceRelatedContent(serviceId) {
    const services = this._getFromStorage('services');
    const therapists = this._getFromStorage('therapists');
    const locations = this._getFromStorage('clinic_locations');
    const groupPrograms = this._getFromStorage('group_programs');
    const resources = this._getFromStorage('resource_items');
    const servicePricing = this._getFromStorage('service_pricing');
    const insurancePlans = this._getFromStorage('insurance_plans');

    const service = services.find((s) => s.id === serviceId) || null;
    const serviceCode = service ? service.code : null;

    // Related therapists
    const relatedTherapists = therapists
      .filter((t) =>
        Array.isArray(t.primary_service_codes) && serviceCode
          ? t.primary_service_codes.includes(serviceCode)
          : false
      )
      .map((t) => {
        const loc = locations.find((l) => l.id === t.primary_location_id) || null;
        return {
          therapistId: t.id,
          fullName: t.full_name,
          credentials: t.credentials || '',
          keySpecialties: Array.isArray(t.specialties) ? t.specialties : [],
          ageGroupsServedLabels: Array.isArray(t.age_groups_served)
            ? t.age_groups_served.map((ag) => this._ageGroupToLabel(ag))
            : [],
          yearsOfExperience: t.years_of_experience,
          primaryLocationName: loc ? loc.name : '',
          therapist: t,
          primaryLocation: loc
        };
      });

    // Related groups
    const relatedGroups = groupPrograms
      .filter((g) => g.related_service_id === serviceId && g.is_active)
      .map((g) => {
        const loc = locations.find((l) => l.id === g.location_id) || null;
        return {
          groupProgramId: g.id,
          title: g.title,
          groupType: g.group_type,
          ageRangeLabel: Array.isArray(g.age_groups) && g.age_groups.length
            ? g.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
            : '',
          startDate: g.start_date || null,
          scheduleSummary: g.schedule_summary || '',
          pricePerChild: g.price_per_child,
          locationName: loc ? loc.name : '',
          groupProgram: g,
          location: loc
        };
      });

    // Related resources (by topic tag or primary topic containing service name/code)
    const relatedResources = resources
      .filter((r) => {
        if (!service) return false;
        const tags = Array.isArray(r.topic_tags) ? r.topic_tags.map((t) => String(t).toLowerCase()) : [];
        const serviceName = service.name ? service.name.toLowerCase() : '';
        const serviceCodeLc = service.code ? String(service.code).toLowerCase() : '';
        const primaryTopic = r.primary_topic ? r.primary_topic.toLowerCase() : '';
        return (
          tags.includes(serviceName) ||
          tags.includes(serviceCodeLc) ||
          primaryTopic.includes(serviceName) ||
          primaryTopic.includes(serviceCodeLc)
        );
      })
      .map((r) => ({
        resourceId: r.id,
        title: r.title,
        primaryTopic: r.primary_topic || '',
        ageRangeLabel: Array.isArray(r.age_groups) && r.age_groups.length
          ? r.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
          : '',
        contentType: r.content_type,
        readingTimeMinutes: r.reading_time_minutes,
        resource: r
      }));

    // Pricing summary
    let pricingSummary = {
      startingRatePerSession: null,
      currency: 'usd',
      insuranceNote: 'Coverage varies by plan. Our team will review your benefits and provide a detailed estimate.'
    };

    const sp = servicePricing.find((p) => p.service_id === serviceId);
    if (sp) {
      pricingSummary.startingRatePerSession = sp.base_rate_per_session;
      pricingSummary.currency = sp.currency || 'usd';
    }

    const hasInNetwork = insurancePlans.some((p) => p.network_status === 'in_network');
    if (hasInNetwork) {
      pricingSummary.insuranceNote = 'We accept several in-network plans and can help you understand coverage for this service.';
    }

    return { relatedTherapists, relatedGroups, relatedResources, pricingSummary };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      mission: 'We help children and teens build communication, regulation, and social skills through playful, evidence-based therapy.',
      historyHtml:
        '<p>Our practice was founded by pediatric specialists who believe families deserve warm, coordinated support close to home.</p>',
      philosophyHtml:
        '<p>We center each childs strengths, partner closely with caregivers, and collaborate with schools and medical providers.</p>',
      privacyPolicyHtml:
        '<p>We follow HIPAA and all applicable privacy regulations. We only use your information to coordinate care and services you request.</p>',
      termsHtml:
        '<p>Information on this site is for educational purposes and is not a substitute for medical advice. By using this site you agree to our terms.</p>',
      accessibilityHtml:
        '<p>We strive to make our website and clinics accessible to all families. Please contact us if you need accommodations.</p>',
      contactInfo: {
        mainPhone: '(000) 000-0000',
        mainEmail: 'info@example-therapy.org',
        mailingAddress: 'PO Box 000, Your City, ST 00000'
      }
    };
  }

  // submitGeneralContactRequest(name, email, phone, topic, message)
  submitGeneralContactRequest(name, email, phone, topic, message) {
    const requests = this._getFromStorage('general_contact_requests');
    const id = this._generateId('contact');
    requests.push({
      id,
      name,
      email,
      phone: phone || '',
      topic: topic || '',
      message,
      created_at: this._nowIso()
    });
    this._saveToStorage('general_contact_requests', requests);

    return {
      success: true,
      referenceId: id,
      message: 'Your message has been received. Our team will follow up soon.'
    };
  }

  // getTherapistFilterOptions
  getTherapistFilterOptions() {
    const therapists = this._getFromStorage('therapists');
    const locations = this._getFromStorage('clinic_locations');
    const insurancePlans = this._getFromStorage('insurance_plans');

    const specialtiesSet = new Set();
    const ageGroupsSet = new Set();
    const languagesSet = new Set();

    for (const t of therapists) {
      if (Array.isArray(t.specialties)) {
        t.specialties.forEach((s) => specialtiesSet.add(String(s)));
      }
      if (Array.isArray(t.age_groups_served)) {
        t.age_groups_served.forEach((ag) => ageGroupsSet.add(String(ag)));
      }
      if (Array.isArray(t.languages)) {
        t.languages.forEach((lng) => languagesSet.add(String(lng)));
      }
    }

    const specialties = Array.from(specialtiesSet).map((value) => ({ value, label: value }));
    const ageGroups = Array.from(ageGroupsSet).map((value) => ({
      value,
      label: this._ageGroupToLabel(value)
    }));

    const locationsOpts = locations.map((l) => ({
      locationId: l.id,
      name: l.name,
      city: l.city || '',
      location: l
    }));

    const languages = Array.from(languagesSet).map((value) => ({ value, label: value }));

    const insurancePlanOpts = insurancePlans.map((p) => ({
      insurancePlanId: p.id,
      name: p.name,
      networkStatus: p.network_status,
      insurancePlan: p
    }));

    return {
      specialties,
      ageGroups,
      locations: locationsOpts,
      languages,
      insurancePlans: insurancePlanOpts
    };
  }

  // searchTherapists(query, specialty, ageGroup, locationId, language, insurancePlanId, sortBy, page, pageSize)
  searchTherapists(query, specialty, ageGroup, locationId, language, insurancePlanId, sortBy, page, pageSize) {
    const therapists = this._getFromStorage('therapists');
    const locations = this._getFromStorage('clinic_locations');

    let results = therapists.slice();

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter((t) => {
        const name = t.full_name ? t.full_name.toLowerCase() : '';
        const bio = t.bio ? t.bio.toLowerCase() : '';
        return name.includes(q) || bio.includes(q);
      });
    }

    if (specialty) {
      const sLc = String(specialty).toLowerCase();
      results = results.filter((t) =>
        Array.isArray(t.specialties)
          ? t.specialties.some((sp) => String(sp).toLowerCase() === sLc)
          : false
      );
    }

    if (ageGroup) {
      results = results.filter((t) =>
        Array.isArray(t.age_groups_served) ? t.age_groups_served.includes(ageGroup) : false
      );
    }

    if (locationId) {
      results = results.filter((t) => t.primary_location_id === locationId);
    }

    if (language) {
      const lc = String(language).toLowerCase();
      results = results.filter((t) =>
        Array.isArray(t.languages)
          ? t.languages.some((lng) => String(lng).toLowerCase() === lc)
          : false
      );
    }

    if (insurancePlanId) {
      results = results.filter((t) =>
        Array.isArray(t.accepted_insurance_plan_ids)
          ? t.accepted_insurance_plan_ids.includes(insurancePlanId)
          : false
      );
    }

    const sort = sortBy || 'experience_desc';
    if (sort === 'experience_asc') {
      results.sort((a, b) => (a.years_of_experience || 0) - (b.years_of_experience || 0));
    } else if (sort === 'name_asc') {
      results.sort((a, b) => {
        const na = a.full_name || '';
        const nb = b.full_name || '';
        return na.localeCompare(nb);
      });
    } else {
      // experience_desc (default)
      results.sort((a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0));
    }

    const totalResults = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = results.slice(start, end);

    const mapped = pageItems.map((t) => {
      const loc = locations.find((l) => l.id === t.primary_location_id) || null;
      return {
        therapistId: t.id,
        fullName: t.full_name,
        credentials: t.credentials || '',
        keySpecialties: Array.isArray(t.specialties) ? t.specialties : [],
        ageGroupsServedLabels: Array.isArray(t.age_groups_served)
          ? t.age_groups_served.map((ag) => this._ageGroupToLabel(ag))
          : [],
        yearsOfExperience: t.years_of_experience,
        primaryLocationName: loc ? loc.name : '',
        languages: Array.isArray(t.languages) ? t.languages : [],
        therapist: t,
        primaryLocation: loc
      };
    });

    // Instrumentation for task completion tracking
    try {
      const searchContext = {
        specialty: specialty || null,
        ageGroup: ageGroup || null,
        locationId: locationId || null,
        language: language || null,
        insurancePlanId: insurancePlanId || null,
        sortBy: sortBy || 'experience_desc',
        page: page || 1,
        pageSize: pageSize || 20,
        timestamp: this._nowIso()
      };
      localStorage.setItem('task2_searchContext', JSON.stringify(searchContext));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      totalResults,
      page: pg,
      pageSize: ps,
      therapists: mapped
    };
  }

  // getTherapistProfile(therapistId)
  getTherapistProfile(therapistId) {
    const therapists = this._getFromStorage('therapists');
    const locations = this._getFromStorage('clinic_locations');
    const services = this._getFromStorage('services');
    const insurancePlans = this._getFromStorage('insurance_plans');

    const t = therapists.find((th) => th.id === therapistId) || null;
    if (!t) {
      return {
        therapistId: null,
        fullName: '',
        credentials: '',
        bio: '',
        specialties: [],
        ageGroupsServedLabels: [],
        yearsOfExperience: 0,
        primaryLocation: null,
        languages: [],
        servicesProvided: [],
        acceptedInsurance: [],
        profileImageUrl: ''
      };
    }

    // Instrumentation for task completion tracking
    try {
      const existing = JSON.parse(localStorage.getItem('task2_comparedTherapistIds') || '[]');
      if (!existing.includes(therapistId)) existing.push(therapistId);
      localStorage.setItem('task2_comparedTherapistIds', JSON.stringify(existing));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const loc = locations.find((l) => l.id === t.primary_location_id) || null;
    const servicesProvided = Array.isArray(t.primary_service_codes)
      ? t.primary_service_codes
          .map((code) => services.find((s) => s.code === code))
          .filter((s) => !!s)
          .map((s) => ({ serviceId: s.id, serviceName: s.name, service: s }))
      : [];

    const acceptedInsurance = Array.isArray(t.accepted_insurance_plan_ids)
      ? t.accepted_insurance_plan_ids
          .map((pid) => insurancePlans.find((p) => p.id === pid))
          .filter((p) => !!p)
          .map((p) => ({
            insurancePlanId: p.id,
            name: p.name,
            networkStatus: p.network_status,
            insurancePlan: p
          }))
      : [];

    return {
      therapistId: t.id,
      fullName: t.full_name,
      credentials: t.credentials || '',
      bio: t.bio || '',
      specialties: Array.isArray(t.specialties) ? t.specialties : [],
      ageGroupsServedLabels: Array.isArray(t.age_groups_served)
        ? t.age_groups_served.map((ag) => this._ageGroupToLabel(ag))
        : [],
      yearsOfExperience: t.years_of_experience,
      primaryLocation: loc
        ? {
            locationId: loc.id,
            name: loc.name,
            addressSummary: [loc.address_line1, loc.city, loc.state, loc.postal_code]
              .filter(Boolean)
              .join(', '),
            location: loc
          }
        : null,
      languages: Array.isArray(t.languages) ? t.languages : [],
      servicesProvided,
      acceptedInsurance,
      profileImageUrl: t.profile_image_url || '',
      therapist: t
    };
  }

  // addTherapistToFavorites(therapistId)
  addTherapistToFavorites(therapistId) {
    const favorites = this._getOrCreateFavoritesStore();
    const exists = favorites.some((f) => f.therapist_id === therapistId);
    if (exists) {
      return { success: true, message: 'Therapist is already in favorites.' };
    }
    favorites.push({
      id: this._generateId('favtherapist'),
      therapist_id: therapistId,
      added_at: this._nowIso()
    });
    this._saveToStorage('favorite_therapists', favorites);
    return { success: true, message: 'Therapist added to favorites.' };
  }

  // removeTherapistFromFavorites(therapistId)
  removeTherapistFromFavorites(therapistId) {
    const favorites = this._getOrCreateFavoritesStore();
    const filtered = favorites.filter((f) => f.therapist_id !== therapistId);
    this._saveToStorage('favorite_therapists', filtered);
    return { success: true, message: 'Therapist removed from favorites.' };
  }

  // getFavoriteTherapists()
  getFavoriteTherapists() {
    const favorites = this._getOrCreateFavoritesStore();
    const therapists = this._getFromStorage('therapists');
    const locations = this._getFromStorage('clinic_locations');

    return favorites
      .map((f) => {
        const t = therapists.find((th) => th.id === f.therapist_id) || null;
        if (!t) return null;
        const loc = locations.find((l) => l.id === t.primary_location_id) || null;
        return {
          therapistId: t.id,
          fullName: t.full_name,
          credentials: t.credentials || '',
          keySpecialties: Array.isArray(t.specialties) ? t.specialties : [],
          ageGroupsServedLabels: Array.isArray(t.age_groups_served)
            ? t.age_groups_served.map((ag) => this._ageGroupToLabel(ag))
            : [],
          yearsOfExperience: t.years_of_experience,
          primaryLocationName: loc ? loc.name : '',
          therapist: t,
          primaryLocation: loc
        };
      })
      .filter(Boolean);
  }

  // submitTherapistAppointmentRequest(therapistId, childName, childAgeYears, preferredDayOfWeek, preferredTimeRange, parentName, parentPhone, parentEmail, additionalNotes)
  submitTherapistAppointmentRequest(
    therapistId,
    childName,
    childAgeYears,
    preferredDayOfWeek,
    preferredTimeRange,
    parentName,
    parentPhone,
    parentEmail,
    additionalNotes
  ) {
    const therapists = this._getFromStorage('therapists');
    const services = this._getFromStorage('services');

    const t = therapists.find((th) => th.id === therapistId) || null;

    let serviceId = null;
    if (t && Array.isArray(t.primary_service_codes)) {
      const match = services.find((s) => t.primary_service_codes.includes(s.code));
      if (match) serviceId = match.id;
    }
    if (!serviceId && services.length) {
      serviceId = services[0].id;
    }

    const appointmentRequests = this._getFromStorage('appointment_requests');
    const id = this._generateId('apptreq');
    appointmentRequests.push({
      id,
      request_type: 'therapist_preference',
      service_id: serviceId,
      therapist_id: therapistId,
      location_id: t ? t.primary_location_id || null : null,
      appointment_slot_id: null,
      child_name: childName,
      child_age_years: typeof childAgeYears === 'number' ? childAgeYears : null,
      preferred_day_of_week: preferredDayOfWeek || null,
      preferred_time_range: preferredTimeRange || null,
      additional_notes: additionalNotes || '',
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      status: 'submitted',
      created_at: this._nowIso()
    });
    this._saveToStorage('appointment_requests', appointmentRequests);

    return {
      success: true,
      appointmentRequestId: id,
      message: 'Your appointment request has been submitted.',
      nextStepsText: 'Our scheduling team will review your preferences and contact you to confirm an appointment time.'
    };
  }

  // getAppointmentBookingConfig(serviceId, therapistId, locationId)
  getAppointmentBookingConfig(serviceId, therapistId, locationId) {
    const services = this._getFromStorage('services');
    const locations = this._getFromStorage('clinic_locations');

    const serviceOptions = services.map((s) => {
      const appointmentTypes = [];
      if (s.evaluation_available) {
        appointmentTypes.push({ value: 'initial_evaluation', label: 'Initial Evaluation' });
      }
      appointmentTypes.push({ value: 'therapy_session', label: 'Therapy Session' });
      appointmentTypes.push({ value: 'follow_up', label: 'Follow-Up Visit' });

      return {
        serviceId: s.id,
        name: s.name,
        code: s.code,
        appointmentTypes,
        service: s
      };
    });

    const locationOptions = locations.map((l) => {
      const isMainClinic =
        /main/i.test(l.name || '') || /downtown/i.test(l.name || '');
      return {
        locationId: l.id,
        name: l.name,
        city: l.city || '',
        isMainClinic,
        location: l
      };
    });

    const defaultServiceId = serviceId || (services[0] ? services[0].id : null);
    const defaultAppointmentType = 'initial_evaluation';
    const defaultTherapistId = therapistId || null;
    const defaultLocationId = locationId || (locations[0] ? locations[0].id : null);

    const today = new Date();
    const minDate = today.toISOString().slice(0, 10);
    const maxDateObj = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const maxDate = maxDateObj.toISOString().slice(0, 10);

    return {
      services: serviceOptions,
      locations: locationOptions,
      defaultSelections: {
        serviceId: defaultServiceId,
        appointmentType: defaultAppointmentType,
        therapistId: defaultTherapistId,
        locationId: defaultLocationId
      },
      datePickerConfig: { minDate, maxDate }
    };
  }

  // findAvailableAppointmentSlots(serviceId, appointmentKind, locationId, startDate, endDate, earliestStartTime, weekdaysOnly)
  findAvailableAppointmentSlots(
    serviceId,
    appointmentKind,
    locationId,
    startDate,
    endDate,
    earliestStartTime,
    weekdaysOnly
  ) {
    const slots = this._getFromStorage('appointment_slots');
    const therapists = this._getFromStorage('therapists');
    const locations = this._getFromStorage('clinic_locations');

    const startTimeBoundary = startDate ? new Date(startDate + 'T00:00:00').getTime() : null;
    const endTimeBoundary = endDate ? new Date(endDate + 'T23:59:59').getTime() : null;

    const earliestMinutes = earliestStartTime
      ? parseInt(earliestStartTime.split(':')[0], 10) * 60 +
        parseInt(earliestStartTime.split(':')[1], 10)
      : null;

    const weekdaysOnlyFlag = weekdaysOnly === undefined ? true : !!weekdaysOnly;

    const results = slots
      .filter((s) => s.is_available)
      .filter((s) => (serviceId ? s.service_id === serviceId : true))
      .filter((s) => (locationId ? s.location_id === locationId : true))
      .filter((s) => (appointmentKind ? s.appointment_kind === appointmentKind : true))
      .filter((s) => {
        if (!s.start_datetime) return false;
        const t = new Date(s.start_datetime).getTime();
        if (startTimeBoundary !== null && t < startTimeBoundary) return false;
        if (endTimeBoundary !== null && t > endTimeBoundary) return false;
        return true;
      })
      .filter((s) => {
        if (!earliestMinutes || !s.start_datetime) return true;
        const dt = new Date(s.start_datetime);
        const minutes = dt.getUTCHours() * 60 + dt.getUTCMinutes();
        return minutes >= earliestMinutes;
      })
      .filter((s) => {
        if (!weekdaysOnlyFlag) return true;
        if (typeof s.is_weekday === 'boolean') return s.is_weekday;
        if (!s.start_datetime) return false;
        const day = new Date(s.start_datetime).getDay(); // 0=Sun,6=Sat
        return day >= 1 && day <= 5;
      })
      .map((s) => {
        const t = therapists.find((th) => th.id === s.therapist_id) || null;
        const l = locations.find((loc) => loc.id === s.location_id) || null;
        const isWeekday = typeof s.is_weekday === 'boolean' ? s.is_weekday : (() => {
          if (!s.start_datetime) return false;
          const day = new Date(s.start_datetime).getDay();
          return day >= 1 && day <= 5;
        })();
        return {
          appointmentSlotId: s.id,
          startDatetime: s.start_datetime,
          endDatetime: s.end_datetime,
          isWeekday,
          therapistName: t ? t.full_name : '',
          locationName: l ? l.name : '',
          appointmentSlot: s,
          therapist: t,
          location: l
        };
      });

    results.sort((a, b) => {
      const ta = a.startDatetime ? new Date(a.startDatetime).getTime() : 0;
      const tb = b.startDatetime ? new Date(b.startDatetime).getTime() : 0;
      return ta - tb;
    });

    return results;
  }

  // submitAppointmentRequest(requestType, serviceId, appointmentSlotId, therapistId, locationId, childName, childAgeYears, preferredDayOfWeek, preferredTimeRange, additionalNotes, parentName, parentPhone, parentEmail)
  submitAppointmentRequest(
    requestType,
    serviceId,
    appointmentSlotId,
    therapistId,
    locationId,
    childName,
    childAgeYears,
    preferredDayOfWeek,
    preferredTimeRange,
    additionalNotes,
    parentName,
    parentPhone,
    parentEmail
  ) {
    const appointmentRequests = this._getFromStorage('appointment_requests');
    const id = this._generateId('apptreq');

    appointmentRequests.push({
      id,
      request_type: requestType,
      service_id: serviceId,
      appointment_slot_id: appointmentSlotId || null,
      therapist_id: therapistId || null,
      location_id: locationId || null,
      child_name: childName || '',
      child_age_years: typeof childAgeYears === 'number' ? childAgeYears : null,
      preferred_day_of_week: preferredDayOfWeek || null,
      preferred_time_range: preferredTimeRange || null,
      additional_notes: additionalNotes || '',
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      status: 'submitted',
      created_at: this._nowIso()
    });

    this._saveToStorage('appointment_requests', appointmentRequests);

    return {
      success: true,
      appointmentRequestId: id,
      message: 'Your appointment request has been submitted.',
      nextStepsText: 'Our team will review your information and reach out with scheduling options.'
    };
  }

  // getResourceFilterOptions
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resource_items');
    const ageSet = new Set();
    const typeSet = new Set();

    for (const r of resources) {
      if (Array.isArray(r.age_groups)) {
        r.age_groups.forEach((ag) => ageSet.add(String(ag)));
      }
      if (r.content_type) {
        typeSet.add(String(r.content_type));
      }
    }

    const ageGroups = Array.from(ageSet).map((value) => ({
      value,
      label: this._ageGroupToLabel(value)
    }));

    const contentTypes = Array.from(typeSet).map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const readingTimeRanges = this._readingTimeRangesConfig();

    return { ageGroups, contentTypes, readingTimeRanges };
  }

  // searchResources(query, ageGroup, contentType, minReadingTimeMinutes, maxReadingTimeMinutes, page, pageSize)
  searchResources(
    query,
    ageGroup,
    contentType,
    minReadingTimeMinutes,
    maxReadingTimeMinutes,
    page,
    pageSize
  ) {
    const resources = this._getFromStorage('resource_items');
    const saved = this._getOrCreateSavedResourcesStore();

    let results = resources.slice();

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter((r) => {
        const title = r.title ? r.title.toLowerCase() : '';
        const summary = r.summary ? r.summary.toLowerCase() : '';
        const topic = r.primary_topic ? r.primary_topic.toLowerCase() : '';
        const tags = Array.isArray(r.topic_tags)
          ? r.topic_tags.map((t) => String(t).toLowerCase()).join(' ')
          : '';
        return title.includes(q) || summary.includes(q) || topic.includes(q) || tags.includes(q);
      });
    }

    if (ageGroup) {
      results = results.filter((r) =>
        Array.isArray(r.age_groups) ? r.age_groups.includes(ageGroup) : false
      );
    }

    if (contentType) {
      results = results.filter((r) => r.content_type === contentType);
    }

    if (typeof minReadingTimeMinutes === 'number') {
      results = results.filter((r) => r.reading_time_minutes >= minReadingTimeMinutes);
    }

    if (typeof maxReadingTimeMinutes === 'number') {
      results = results.filter((r) => r.reading_time_minutes <= maxReadingTimeMinutes);
    }

    const totalResults = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = results.slice(start, end);

    const mapped = pageItems.map((r) => {
      const isSaved = saved.some((s) => s.resource_id === r.id);
      return {
        resourceId: r.id,
        title: r.title,
        summary: r.summary || '',
        primaryTopic: r.primary_topic || '',
        topicTags: Array.isArray(r.topic_tags) ? r.topic_tags : [],
        ageRangeLabel: Array.isArray(r.age_groups) && r.age_groups.length
          ? r.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
          : '',
        contentType: r.content_type,
        readingTimeMinutes: r.reading_time_minutes,
        isSaved,
        resource: r
      };
    });

    return {
      totalResults,
      page: pg,
      pageSize: ps,
      resources: mapped
    };
  }

  // getArticleDetail(resourceId)
  getArticleDetail(resourceId) {
    const resources = this._getFromStorage('resource_items');
    const saved = this._getOrCreateSavedResourcesStore();

    const r = resources.find((res) => res.id === resourceId) || null;
    if (!r) {
      return {
        resourceId: null,
        title: '',
        body: '',
        primaryTopic: '',
        topicTags: [],
        ageRangeLabel: '',
        contentType: 'article',
        readingTimeMinutes: 0,
        isSaved: false,
        createdAt: '',
        resource: null
      };
    }

    const isSaved = saved.some((s) => s.resource_id === r.id);

    return {
      resourceId: r.id,
      title: r.title,
      body: r.body || '',
      primaryTopic: r.primary_topic || '',
      topicTags: Array.isArray(r.topic_tags) ? r.topic_tags : [],
      ageRangeLabel: Array.isArray(r.age_groups) && r.age_groups.length
        ? r.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
        : '',
      contentType: r.content_type,
      readingTimeMinutes: r.reading_time_minutes,
      isSaved,
      createdAt: r.created_at || '',
      resource: r
    };
  }

  // saveResourceToReadingList(resourceId)
  saveResourceToReadingList(resourceId) {
    const saved = this._getOrCreateSavedResourcesStore();
    const exists = saved.some((s) => s.resource_id === resourceId);
    if (exists) {
      return { success: true, message: 'Resource is already in your reading list.' };
    }
    saved.push({
      id: this._generateId('savedresource'),
      resource_id: resourceId,
      saved_at: this._nowIso()
    });
    this._saveToStorage('saved_resources', saved);
    return { success: true, message: 'Resource added to your reading list.' };
  }

  // removeResourceFromReadingList(resourceId)
  removeResourceFromReadingList(resourceId) {
    const saved = this._getOrCreateSavedResourcesStore();
    const filtered = saved.filter((s) => s.resource_id !== resourceId);
    this._saveToStorage('saved_resources', filtered);
    return { success: true, message: 'Resource removed from your reading list.' };
  }

  // getSavedReadingList()
  getSavedReadingList() {
    const saved = this._getOrCreateSavedResourcesStore();
    const resources = this._getFromStorage('resource_items');

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_readingListOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return saved
      .map((s) => {
        const r = resources.find((res) => res.id === s.resource_id) || null;
        if (!r) return null;
        return {
          resourceId: r.id,
          title: r.title,
          primaryTopic: r.primary_topic || '',
          ageRangeLabel: Array.isArray(r.age_groups) && r.age_groups.length
            ? r.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
            : '',
          contentType: r.content_type,
          readingTimeMinutes: r.reading_time_minutes,
          resource: r
        };
      })
      .filter(Boolean);
  }

  // getGroupFilterOptions
  getGroupFilterOptions() {
    const groupPrograms = this._getFromStorage('group_programs');
    const locations = this._getFromStorage('clinic_locations');

    const ageSet = new Set();
    for (const g of groupPrograms) {
      if (Array.isArray(g.age_groups)) {
        g.age_groups.forEach((ag) => ageSet.add(String(ag)));
      }
    }
    const ageGroups = Array.from(ageSet).map((value) => ({
      value,
      label: this._ageGroupToLabel(value)
    }));

    const locationOpts = locations.map((l) => ({
      locationId: l.id,
      name: l.name,
      city: l.city || '',
      location: l
    }));

    const priceRanges = [
      { maxPrice: 50, label: 'Up to $50' },
      { maxPrice: 100, label: 'Up to $100' },
      { maxPrice: 200, label: 'Up to $200' }
    ];

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstOfThisMonth = new Date(year, month, 1);
    const lastOfThisMonth = new Date(year, month + 1, 0);

    const firstOfNextMonth = new Date(year, month + 1, 1);
    const lastOfNextMonth = new Date(year, month + 2, 0);

    const dateRangePresets = [
      {
        value: 'this_month',
        label: 'This month',
        startDate: firstOfThisMonth.toISOString().slice(0, 10),
        endDate: lastOfThisMonth.toISOString().slice(0, 10)
      },
      {
        value: 'next_month',
        label: 'Next month',
        startDate: firstOfNextMonth.toISOString().slice(0, 10),
        endDate: lastOfNextMonth.toISOString().slice(0, 10)
      }
    ];

    return { ageGroups, locations: locationOpts, priceRanges, dateRangePresets };
  }

  // searchGroupPrograms(query, ageGroup, startDate, endDate, maxPrice, locationId, sortBy, page, pageSize)
  searchGroupPrograms(
    query,
    ageGroup,
    startDate,
    endDate,
    maxPrice,
    locationId,
    sortBy,
    page,
    pageSize
  ) {
    const groups = this._getFromStorage('group_programs');
    const locations = this._getFromStorage('clinic_locations');

    let results = groups.filter((g) => g.is_active);

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter((g) => {
        const title = g.title ? g.title.toLowerCase() : '';
        const desc = g.description ? g.description.toLowerCase() : '';
        return title.includes(q) || desc.includes(q);
      });
    }

    if (ageGroup) {
      results = results.filter((g) =>
        Array.isArray(g.age_groups) ? g.age_groups.includes(ageGroup) : false
      );
    }

    if (startDate) {
      const sd = new Date(startDate).getTime();
      results = results.filter((g) => {
        if (!g.start_date) return false;
        const st = new Date(g.start_date).getTime();
        return st >= sd;
      });
    }

    if (endDate) {
      const ed = new Date(endDate).getTime();
      results = results.filter((g) => {
        if (!g.start_date) return false;
        const st = new Date(g.start_date).getTime();
        return st <= ed;
      });
    }

    if (typeof maxPrice === 'number') {
      results = results.filter((g) => g.price_per_child <= maxPrice);
    }

    if (locationId) {
      results = results.filter((g) => g.location_id === locationId);
    }

    const sort = sortBy || 'start_date_asc';
    if (sort === 'start_date_desc') {
      results.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'price_asc') {
      results.sort((a, b) => (a.price_per_child || 0) - (b.price_per_child || 0));
    } else {
      // start_date_asc
      results.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return da - db;
      });
    }

    const totalResults = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = results.slice(start, end);

    const mapped = pageItems.map((g) => {
      const loc = locations.find((l) => l.id === g.location_id) || null;
      return {
        groupProgramId: g.id,
        title: g.title,
        groupType: g.group_type,
        ageRangeLabel: Array.isArray(g.age_groups) && g.age_groups.length
          ? g.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
          : '',
        startDate: g.start_date || null,
        endDate: g.end_date || null,
        scheduleSummary: g.schedule_summary || '',
        pricePerChild: g.price_per_child,
        locationName: loc ? loc.name : '',
        isActive: g.is_active,
        groupProgram: g,
        location: loc
      };
    });

    return {
      totalResults,
      page: pg,
      pageSize: ps,
      groups: mapped
    };
  }

  // getGroupDetail(groupProgramId)
  getGroupDetail(groupProgramId) {
    const groups = this._getFromStorage('group_programs');
    const locations = this._getFromStorage('clinic_locations');
    const sessionOptions = this._getFromStorage('group_session_options');

    const g = groups.find((gr) => gr.id === groupProgramId) || null;
    if (!g) {
      return {
        groupProgramId: null,
        title: '',
        description: '',
        groupType: '',
        ageRangeLabel: '',
        startDate: null,
        endDate: null,
        scheduleSummary: '',
        pricePerChild: 0,
        location: null,
        sessionOptions: [],
        isActive: false,
        groupProgram: null
      };
    }

    const loc = locations.find((l) => l.id === g.location_id) || null;

    const options = sessionOptions
      .filter((o) => o.group_program_id === groupProgramId)
      .map((o) => ({
        sessionOptionId: o.id,
        label: o.label,
        dayOfWeek: o.day_of_week,
        startTime: o.start_time,
        durationMinutes: o.duration_minutes,
        sessionOption: o
      }));

    return {
      groupProgramId: g.id,
      title: g.title,
      description: g.description || '',
      groupType: g.group_type,
      ageRangeLabel: Array.isArray(g.age_groups) && g.age_groups.length
        ? g.age_groups.map((ag) => this._ageGroupToLabel(ag)).join(', ')
        : '',
      startDate: g.start_date || null,
      endDate: g.end_date || null,
      scheduleSummary: g.schedule_summary || '',
      pricePerChild: g.price_per_child,
      location: loc
        ? {
            locationId: loc.id,
            name: loc.name,
            addressSummary: [loc.address_line1, loc.city, loc.state, loc.postal_code]
              .filter(Boolean)
              .join(', '),
            location: loc
          }
        : null,
      sessionOptions: options,
      isActive: g.is_active,
      groupProgram: g
    };
  }

  // submitGroupRegistration(groupProgramId, groupSessionOptionId, childName, childAgeYears, parentName, parentPhone, parentEmail, additionalNotes)
  submitGroupRegistration(
    groupProgramId,
    groupSessionOptionId,
    childName,
    childAgeYears,
    parentName,
    parentPhone,
    parentEmail,
    additionalNotes
  ) {
    const registrations = this._getFromStorage('group_registrations');
    const id = this._generateId('groupreg');

    registrations.push({
      id,
      group_program_id: groupProgramId,
      group_session_option_id: groupSessionOptionId,
      child_name: childName,
      child_age_years: typeof childAgeYears === 'number' ? childAgeYears : null,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      status: 'submitted',
      created_at: this._nowIso()
    });

    this._saveToStorage('group_registrations', registrations);

    return {
      success: true,
      groupRegistrationId: id,
      message: 'Your group registration has been submitted.',
      nextStepsText: 'We will review availability and contact you to confirm your childs spot.'
    };
  }

  // getPricingAndInsuranceOverview
  getPricingAndInsuranceOverview() {
    const servicePricing = this._getFromStorage('service_pricing');
    const services = this._getFromStorage('services');
    const insurancePlans = this._getFromStorage('insurance_plans');

    const servicesResult = servicePricing.map((sp) => {
      const service = services.find((s) => s.id === sp.service_id) || null;
      return {
        serviceId: sp.service_id,
        serviceName: service ? service.name : '',
        baseRatePerSession: sp.base_rate_per_session,
        currency: sp.currency || 'usd',
        typicalSessionLengthMinutes: service ? service.typical_session_length_minutes || null : null,
        service
      };
    });

    const insuranceResult = insurancePlans.map((p) => ({
      insurancePlanId: p.id,
      name: p.name,
      networkStatus: p.network_status,
      notes: p.notes || '',
      insurancePlan: p
    }));

    return {
      services: servicesResult,
      insurancePlans: insuranceResult
    };
  }

  // getCostEstimatorConfig
  getCostEstimatorConfig() {
    const servicePricing = this._getFromStorage('service_pricing');
    const services = this._getFromStorage('services');
    const insurancePlans = this._getFromStorage('insurance_plans');

    const servicesResult = servicePricing.map((sp) => {
      const service = services.find((s) => s.id === sp.service_id) || null;
      return {
        serviceId: sp.service_id,
        serviceName: service ? service.name : '',
        baseRatePerSession: sp.base_rate_per_session,
        currency: sp.currency || 'usd',
        service
      };
    });

    const insuranceResult = insurancePlans.map((p) => ({
      insurancePlanId: p.id,
      name: p.name,
      networkStatus: p.network_status,
      insurancePlan: p
    }));

    return {
      services: servicesResult,
      insurancePlans: insuranceResult
    };
  }

  // calculateCostEstimate(serviceItems, insurancePlanId)
  calculateCostEstimate(serviceItems, insurancePlanId) {
    const insurancePlans = this._getFromStorage('insurance_plans');
    const services = this._getFromStorage('services');
    const insurancePlan = insurancePlans.find((p) => p.id === insurancePlanId) || null;

    const { costEstimateId, total, lineItems, createdAt } = this._createCostEstimateRecord(
      serviceItems || [],
      insurancePlan
    );

    const lineItemsApi = lineItems.map((li) => {
      const service = services.find((s) => s.id === li.service_id) || null;
      return {
        serviceId: li.service_id,
        serviceName: service ? service.name : '',
        sessionsPerMonth: li.sessions_per_month,
        ratePerSession: li.rate_per_session,
        subtotalMonthlyCost: li.subtotal_monthly_cost,
        orderIndex: li.order_index,
        service
      };
    });

    const detailsNote = insurancePlan
      ? `Estimate based on ${insurancePlan.name} (${insurancePlan.network_status}). Actual costs may vary.`
      : 'Estimate based on standard rates. Insurance coverage may change your out-of-pocket cost.';

    return {
      costEstimateId,
      totalMonthlyCost: total,
      currency: 'usd',
      lineItems: lineItemsApi,
      detailsNote,
      createdAt,
      insurancePlan
    };
  }

  // submitCostEstimateContactRequest(costEstimateId, name, email, message)
  submitCostEstimateContactRequest(costEstimateId, name, email, message) {
    const requests = this._getFromStorage('cost_estimate_contact_requests');
    const id = this._generateId('cecontact');
    requests.push({
      id,
      cost_estimate_id: costEstimateId || null,
      name,
      email,
      message,
      status: 'submitted',
      created_at: this._nowIso()
    });
    this._saveToStorage('cost_estimate_contact_requests', requests);

    return {
      success: true,
      contactRequestId: id,
      message: 'Your request has been sent. Our billing team will follow up with a detailed quote.'
    };
  }

  // getLocationFilterOptions
  getLocationFilterOptions() {
    return {
      distanceOptions: this._distanceOptionsConfig(),
      amenities: this._amenitiesConfig(),
      hoursOptions: this._hoursOptionsConfig()
    };
  }

  // searchClinicLocations(zipCode, distanceMiles, requireFreeParking, requireOpenSaturday, sortBy)
  searchClinicLocations(zipCode, distanceMiles, requireFreeParking, requireOpenSaturday, sortBy) {
    const locations = this._getFromStorage('clinic_locations');

    // Simple distance approximation: same ZIP => 2 miles, same city => 8 miles, otherwise 20 miles
    const dm = typeof distanceMiles === 'number' ? distanceMiles : 25;

    const results = locations
      .map((l) => {
        let distance = 20;
        if (zipCode && l.postal_code === zipCode) {
          distance = 2;
        } else if (zipCode && l.city) {
          distance = 8;
        }
        return { location: l, distance };
      })
      .filter((wrap) => wrap.distance <= dm)
      .filter((wrap) => {
        if (requireFreeParking) {
          const l = wrap.location;
          const hasAmenity = Array.isArray(l.amenities)
            ? l.amenities.includes('free_parking')
            : false;
          if (!l.has_free_parking && !hasAmenity) return false;
        }
        return true;
      })
      .filter((wrap) => {
        if (requireOpenSaturday) {
          const l = wrap.location;
          if (!l.open_saturday) return false;
        }
        return true;
      });

    const sort = sortBy || 'distance_asc';
    if (sort === 'distance_asc') {
      results.sort((a, b) => a.distance - b.distance);
    }

    const mapped = results.map((wrap) => {
      const l = wrap.location;
      return {
        locationId: l.id,
        name: l.name,
        addressLine1: l.address_line1 || '',
        city: l.city || '',
        state: l.state || '',
        postalCode: l.postal_code || '',
        distanceMiles: wrap.distance,
        hasFreeParking: !!l.has_free_parking,
        openSaturday: !!l.open_saturday,
        hoursSummary: l.hours_summary || '',
        amenities: Array.isArray(l.amenities) ? l.amenities : [],
        location: l
      };
    });

    return {
      totalResults: mapped.length,
      locations: mapped
    };
  }

  // getLocationDetail(locationId)
  getLocationDetail(locationId) {
    const locations = this._getFromStorage('clinic_locations');
    const services = this._getFromStorage('services');
    const therapists = this._getFromStorage('therapists');
    const appointmentSlots = this._getFromStorage('appointment_slots');
    const groupPrograms = this._getFromStorage('group_programs');

    const loc = locations.find((l) => l.id === locationId) || null;
    if (!loc) {
      return {
        locationId: null,
        name: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        latitude: null,
        longitude: null,
        phoneNumber: '',
        email: '',
        hoursSummary: '',
        hasFreeParking: false,
        amenities: [],
        openSaturday: false,
        servicesOffered: [],
        therapists: [],
        location: null
      };
    }

    const serviceIdSet = new Set();

    // From appointment slots
    for (const s of appointmentSlots) {
      if (s.location_id === locationId) {
        serviceIdSet.add(s.service_id);
      }
    }

    // From group programs related_service_id
    for (const g of groupPrograms) {
      if (g.location_id === locationId && g.related_service_id) {
        serviceIdSet.add(g.related_service_id);
      }
    }

    const servicesOffered = Array.from(serviceIdSet)
      .map((sid) => services.find((s) => s.id === sid) || null)
      .filter(Boolean)
      .map((s) => ({ serviceId: s.id, serviceName: s.name, service: s }));

    const therapistsResult = therapists
      .filter((t) => t.primary_location_id === locationId)
      .map((t) => {
        const primaryServiceNames = Array.isArray(t.primary_service_codes)
          ? t.primary_service_codes
              .map((code) => services.find((s) => s.code === code))
              .filter(Boolean)
              .map((s) => s.name)
          : [];
        return {
          therapistId: t.id,
          fullName: t.full_name,
          primaryServiceNames,
          therapist: t
        };
      });

    return {
      locationId: loc.id,
      name: loc.name,
      addressLine1: loc.address_line1 || '',
      addressLine2: loc.address_line2 || '',
      city: loc.city || '',
      state: loc.state || '',
      postalCode: loc.postal_code || '',
      latitude: typeof loc.latitude === 'number' ? loc.latitude : null,
      longitude: typeof loc.longitude === 'number' ? loc.longitude : null,
      phoneNumber: loc.phone_number || '',
      email: loc.email || '',
      hoursSummary: loc.hours_summary || '',
      hasFreeParking: !!loc.has_free_parking,
      amenities: Array.isArray(loc.amenities) ? loc.amenities : [],
      openSaturday: !!loc.open_saturday,
      servicesOffered,
      therapists: therapistsResult,
      location: loc
    };
  }

  // submitCallbackRequest(locationId, phoneNumber, preferredCallTime, message)
  submitCallbackRequest(locationId, phoneNumber, preferredCallTime, message) {
    const callbacks = this._getFromStorage('callback_requests');
    const id = this._generateId('callback');
    callbacks.push({
      id,
      location_id: locationId,
      phone_number: phoneNumber,
      preferred_call_time: preferredCallTime,
      message: message || '',
      status: 'submitted',
      created_at: this._nowIso()
    });
    this._saveToStorage('callback_requests', callbacks);

    return {
      success: true,
      callbackRequestId: id,
      message: 'Your callback request has been submitted.',
      nextStepsText: 'A team member from this clinic will call you during your preferred time window.'
    };
  }

  // plannerStartNewPlan
  plannerStartNewPlan() {
    const drafts = this._getFromStorage('planner_drafts');
    const planDraftId = this._generateId('plandraft');
    drafts.push({ id: planDraftId, child_name: '', sessions: [] });
    this._saveToStorage('planner_drafts', drafts);
    return {
      success: true,
      planDraftId,
      message: 'New weekly plan started.'
    };
  }

  // plannerAddSessionToCurrentPlan(planDraftId, serviceId, childName, dayOfWeek, startTime, durationMinutes, notes)
  plannerAddSessionToCurrentPlan(
    planDraftId,
    serviceId,
    childName,
    dayOfWeek,
    startTime,
    durationMinutes,
    notes
  ) {
    const { drafts, draft } = this._getOrCreatePlannerDraft(planDraftId);

    const session = {
      id: this._generateId('plandraftsession'),
      service_id: serviceId,
      child_name: childName,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: durationMinutes,
      notes: notes || ''
    };

    draft.sessions = draft.sessions || [];
    draft.sessions.push(session);
    if (!draft.child_name) {
      draft.child_name = childName;
    }

    this._saveToStorage('planner_drafts', drafts);

    return {
      success: true,
      planDraftId,
      sessions: this._mapPlannerSessionsToApi(draft.sessions)
    };
  }

  // plannerGetCurrentPlan(planDraftId)
  plannerGetCurrentPlan(planDraftId) {
    const drafts = this._getFromStorage('planner_drafts');
    const draft = drafts.find((d) => d.id === planDraftId) || { id: planDraftId, sessions: [] };
    return {
      planDraftId: draft.id,
      sessions: this._mapPlannerSessionsToApi(draft.sessions || [])
    };
  }

  // plannerSaveCurrentPlan(planDraftId, planName)
  plannerSaveCurrentPlan(planDraftId, planName) {
    const drafts = this._getFromStorage('planner_drafts');
    const draft = drafts.find((d) => d.id === planDraftId) || null;
    if (!draft) {
      return {
        success: false,
        weeklyPlanId: null,
        planName: '',
        childName: '',
        totalSessions: 0
      };
    }

    const { weeklyPlanId, plan, totalSessions } = this._persistWeeklyPlan(draft, planName);

    return {
      success: true,
      weeklyPlanId,
      planName: plan.name,
      childName: plan.child_name,
      totalSessions
    };
  }

  // plannerUpdateSessionInCurrentPlan(planDraftId, sessionId, serviceId, dayOfWeek, startTime, durationMinutes, notes)
  plannerUpdateSessionInCurrentPlan(
    planDraftId,
    sessionId,
    serviceId,
    dayOfWeek,
    startTime,
    durationMinutes,
    notes
  ) {
    const { drafts, draft } = this._getOrCreatePlannerDraft(planDraftId);
    draft.sessions = draft.sessions || [];
    const session = draft.sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return {
        success: false,
        planDraftId,
        sessions: this._mapPlannerSessionsToApi(draft.sessions)
      };
    }

    if (serviceId) session.service_id = serviceId;
    if (dayOfWeek) session.day_of_week = dayOfWeek;
    if (startTime) session.start_time = startTime;
    if (typeof durationMinutes === 'number') session.duration_minutes = durationMinutes;
    if (typeof notes === 'string') session.notes = notes;

    this._saveToStorage('planner_drafts', drafts);

    return {
      success: true,
      planDraftId,
      sessions: this._mapPlannerSessionsToApi(draft.sessions)
    };
  }

  // plannerRemoveSessionFromCurrentPlan(planDraftId, sessionId)
  plannerRemoveSessionFromCurrentPlan(planDraftId, sessionId) {
    const { drafts, draft } = this._getOrCreatePlannerDraft(planDraftId);
    draft.sessions = (draft.sessions || []).filter((s) => s.id !== sessionId);
    this._saveToStorage('planner_drafts', drafts);

    return {
      success: true,
      planDraftId,
      sessions: this._mapPlannerSessionsToApi(draft.sessions)
    };
  }

  // plannerListSavedPlans
  plannerListSavedPlans() {
    const weeklyPlans = this._getFromStorage('weekly_plans');
    const weeklyPlanSessions = this._getFromStorage('weekly_plan_sessions');

    return weeklyPlans.map((p) => {
      const totalSessions = weeklyPlanSessions.filter(
        (s) => s.weekly_plan_id === p.id
      ).length;
      return {
        weeklyPlanId: p.id,
        name: p.name,
        childName: p.child_name,
        createdAt: p.created_at || '',
        updatedAt: p.updated_at || '',
        totalSessions,
        weeklyPlan: p
      };
    });
  }

  // plannerLoadSavedPlan(weeklyPlanId)
  plannerLoadSavedPlan(weeklyPlanId) {
    const weeklyPlans = this._getFromStorage('weekly_plans');
    const weeklyPlanSessions = this._getFromStorage('weekly_plan_sessions');
    const drafts = this._getFromStorage('planner_drafts');

    const plan = weeklyPlans.find((p) => p.id === weeklyPlanId) || null;
    if (!plan) {
      return {
        planDraftId: null,
        planName: '',
        childName: '',
        sessions: []
      };
    }

    const relatedSessions = weeklyPlanSessions.filter(
      (s) => s.weekly_plan_id === weeklyPlanId
    );

    const planDraftId = this._generateId('plandraft');
    const draft = {
      id: planDraftId,
      child_name: plan.child_name,
      sessions: relatedSessions.map((s) => ({
        id: this._generateId('plandraftsession'),
        service_id: s.service_id,
        child_name: plan.child_name,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        duration_minutes: s.duration_minutes,
        notes: s.notes || ''
      }))
    };

    drafts.push(draft);
    this._saveToStorage('planner_drafts', drafts);

    return {
      planDraftId,
      planName: plan.name,
      childName: plan.child_name,
      sessions: this._mapPlannerSessionsToApi(draft.sessions)
    };
  }

  // getDonationPageContent
  getDonationPageContent() {
    const funds = this._getFromStorage('donation_funds');

    const activeFunds = funds.filter((f) => f.is_active);
    activeFunds.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 9999;
      const bo = typeof b.display_order === 'number' ? b.display_order : 9999;
      return ao - bo;
    });

    const fundItems = activeFunds.map((f) => ({
      fundId: f.id,
      name: f.name,
      slug: f.slug || '',
      description: f.description || '',
      isActive: f.is_active,
      displayOrder: typeof f.display_order === 'number' ? f.display_order : null,
      fund: f
    }));

    return {
      impactOverview:
        'Your gift helps families access evaluations, therapy sessions, and group programs regardless of financial barriers.',
      defaultGiftType: 'one_time',
      suggestedAmounts: [25, 50, 75, 100],
      funds: fundItems
    };
  }

  // submitDonationPledge(fundId, giftType, amount, dedicationType, honoreeName, donorName, donorPhone, donorEmail, preferredContactMethod)
  submitDonationPledge(
    fundId,
    giftType,
    amount,
    dedicationType,
    honoreeName,
    donorName,
    donorPhone,
    donorEmail,
    preferredContactMethod
  ) {
    const pledges = this._getFromStorage('donation_pledges');
    const id = this._generateId('donation');

    pledges.push({
      id,
      fund_id: fundId,
      gift_type: giftType,
      amount,
      dedication_type: dedicationType,
      honoree_name: dedicationType !== 'none' ? honoreeName || '' : '',
      donor_name: donorName,
      donor_phone: donorPhone,
      donor_email: donorEmail,
      preferred_contact_method: preferredContactMethod,
      status: 'submitted',
      created_at: this._nowIso()
    });

    this._saveToStorage('donation_pledges', pledges);

    return {
      success: true,
      donationPledgeId: id,
      message: 'Thank you for your pledge.',
      nextStepsText: 'We will send a confirmation and payment instructions to the contact information you provided.'
    };
  }
}

// Global export for browser & Node.js
if (typeof globalThis !== 'undefined') {
  // Attach class
  globalThis.BusinessLogic = BusinessLogic;
  // Singleton SDK instance
  if (!globalThis.WebsiteSDK) {
    globalThis.WebsiteSDK = new BusinessLogic();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}