/*
  BusinessLogic implementation for government contracting consulting firm website
  - Uses localStorage (with Node.js polyfill) for persistence
  - No DOM access
  - Implements all specified interfaces and helper functions
*/

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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Helper to ensure a storage key exists
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Initialize entity tables (arrays)
    ensureKey('service_categories', []);
    ensureKey('services', []);
    ensureKey('service_consultation_requests', []);
    ensureKey('webinar_events', []);
    ensureKey('webinar_registrations', []);
    ensureKey('workshops', []);
    ensureKey('learning_plans', []);
    ensureKey('learning_plan_items', []);
    ensureKey('advisory_plans', []);
    ensureKey('plan_compare_lists', []);
    ensureKey('plan_intake_submissions', []);
    ensureKey('articles', []);
    ensureKey('reading_lists', []);
    ensureKey('reading_list_items', []);
    ensureKey('capability_templates', []);
    ensureKey('capability_statement_drafts', []);
    ensureKey('help_categories', []);
    ensureKey('help_articles', []);
    ensureKey('support_requests', []);
    ensureKey('consultation_plans', []);
    ensureKey('consultation_plan_items', []);
    ensureKey('scheduled_consultations', []);
    ensureKey('case_studies', []);
    ensureKey('saved_case_study_lists', []);
    ensureKey('saved_case_study_items', []);

    // Additional tables for non-entity interfaces
    ensureKey('contact_requests', []);

    // Simple content configs (non-domain data, persisted once and editable)
    if (localStorage.getItem('home_page_content') === null) {
      const defaultHome = {
        headline: 'Federal contracting support for growing businesses',
        subheadline: 'Advisory, training, and bid support to help you win and manage government contracts.',
        keyBenefits: [],
        primaryCtas: []
      };
      localStorage.setItem('home_page_content', JSON.stringify(defaultHome));
    }

    if (localStorage.getItem('about_page_content') === null) {
      const defaultAbout = {
        mission: '',
        history: '',
        differentiators: [],
        supportedAgenciesSummary: '',
        leadershipProfiles: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(defaultAbout));
    }

    // Global id counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentStr = localStorage.getItem('idCounter') || '1000';
    const current = parseInt(currentStr, 10) || 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------------------- Generic helpers ----------------------

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return '$' + Math.round(amount);
    }
  }

  _enumToLabel(value) {
    if (!value || typeof value !== 'string') return '';
    // Special handling for some known enums for slightly nicer labels
    const map = {
      small_business: 'Small Business',
      mid_sized_business: 'Mid-sized Business',
      large_business: 'Large Business',
      nonprofit: 'Nonprofit',
      other: 'Other',
      employees_1_50: '1–50 employees',
      employees_51_200: '51–200 employees',
      employees_201_plus: '201+ employees',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      getting_started_with_government_contracting: 'Getting Started with Government Contracting',
      gsa_schedule_readiness: 'GSA Schedule Readiness',
      proposal_development: 'Proposal Development',
      capture_management: 'Capture Management',
      compliance_and_registrations: 'Compliance & Registrations',
      information_technology: 'Information Technology',
      professional_services: 'Professional Services',
      cybersecurity: 'Cybersecurity',
      management_consulting: 'Management Consulting',
      department_of_defense_dod: 'Department of Defense (DoD)',
      department_of_homeland_security_dhs: 'Department of Homeland Security (DHS)',
      general_services_administration_gsa: 'General Services Administration (GSA)',
      department_of_veterans_affairs_va: 'Department of Veterans Affairs (VA)',
      other_federal_agency: 'Other Federal Agency',
      prime_contractor: 'Prime Contractor',
      subcontractor: 'Subcontractor',
      joint_venture_partner: 'Joint Venture Partner',
      one_time_engagement: 'One-time Engagement',
      ongoing_advisory: 'Ongoing Advisory',
      one_time: 'One-time',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually',
      free: 'Free',
      paid: 'Paid',
      live_session: 'Live session',
      on_demand: 'On-demand',
      hybrid: 'Hybrid',
      on_demand_recording: 'On-demand recording',
      how_to_guide: 'How-To Guide',
      checklist: 'Checklist',
      case_study: 'Case Study',
      opinion: 'Opinion',
      news: 'News',
      blue_federal: 'Blue Federal',
      green_modern: 'Green Modern',
      gray_minimal: 'Gray Minimal'
    };
    if (map[value]) return map[value];
    return value
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _parseDateInput(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    // ISO-like
    if (/\d{4}-\d{2}-\d{2}/.test(trimmed) || trimmed.indexOf('T') !== -1) {
      const dIso = new Date(trimmed);
      return isNaN(dIso.getTime()) ? null : dIso;
    }
    // MM/DD/YYYY
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const month = parseInt(m[1], 10) - 1;
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const dUs = new Date(Date.UTC(year, month, day));
      return isNaN(dUs.getTime()) ? null : dUs;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  _calculatePlanOrListTotals(items, priceFieldName) {
    const field = priceFieldName || 'priceSnapshot';
    let total = 0;
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const v = items[i][field];
        if (typeof v === 'number' && !isNaN(v)) {
          total += v;
        }
      }
    }
    return {
      totalPrice: total,
      formattedTotalPrice: this._formatCurrency(total)
    };
  }

  _getOrCreateSingleton(storageKey, idPrefix, extraFields) {
    const now = new Date().toISOString();
    let list = this._getFromStorage(storageKey, []);
    if (list.length > 0) return list[0];
    const base = { id: this._generateId(idPrefix), createdAt: now };
    const record = Object.assign(base, extraFields || {});
    list.push(record);
    this._saveToStorage(storageKey, list);
    return record;
  }

  _updateSingletonUpdatedAt(storageKey) {
    let list = this._getFromStorage(storageKey, []);
    if (!list.length) return;
    list[0].updatedAt = new Date().toISOString();
    this._saveToStorage(storageKey, list);
  }

  _getOrCreateLearningPlan() {
    return this._getOrCreateSingleton('learning_plans', 'lp', {});
  }

  _getOrCreateReadingList() {
    return this._getOrCreateSingleton('reading_lists', 'rl', {});
  }

  _getOrCreateConsultationPlan() {
    return this._getOrCreateSingleton('consultation_plans', 'cp', {});
  }

  _getOrCreateSavedCaseStudyList() {
    return this._getOrCreateSingleton('saved_case_study_lists', 'scsl', {});
  }

  _getOrCreatePlanCompareList() {
    return this._getOrCreateSingleton('plan_compare_lists', 'pcl', { planIds: [] });
  }

  _getDescendantCategoryIds(rootCategoryId, categories) {
    const result = [rootCategoryId];
    if (!rootCategoryId || !Array.isArray(categories)) return result;
    const queue = [rootCategoryId];
    while (queue.length) {
      const current = queue.shift();
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        if (cat.parentCategoryId === current && result.indexOf(cat.id) === -1) {
          result.push(cat.id);
          queue.push(cat.id);
        }
      }
    }
    return result;
  }

  // ---------------------- Home page interfaces ----------------------

  getHomePageContent() {
    const content = this._getFromStorage('home_page_content', {
      headline: '',
      subheadline: '',
      keyBenefits: [],
      primaryCtas: []
    });
    return content;
  }

  getHomeHighlights() {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);
    const webinars = this._getFromStorage('webinar_events', []);
    const articles = this._getFromStorage('articles', []);

    const activeServices = services.filter(function (s) { return s.isActive; });
    activeServices.sort(function (a, b) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    const featuredServices = activeServices.slice(0, 3).map((s) => {
      const category = categories.find((c) => c.id === s.categoryId) || null;
      return {
        serviceId: s.id,
        name: s.name,
        shortDescription: s.shortDescription || '',
        basePrice: s.basePrice,
        priceUnit: s.priceUnit,
        formattedPrice: this._formatCurrency(s.basePrice),
        categoryName: category ? category.name : '',
        clientTypeLabel: this._enumToLabel(s.clientType),
        isSmallBusinessFocused: !!s.isSmallBusinessFocused,
        // Foreign key resolution
        service: s
      };
    });

    const upcomingWebinarsRaw = webinars.slice().filter(function (w) {
      return w.status === 'upcoming';
    });
    upcomingWebinarsRaw.sort((a, b) => {
      const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
      const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
      return da - db;
    });

    const upcomingWebinars = upcomingWebinarsRaw.slice(0, 3).map((w) => ({
      webinarId: w.id,
      title: w.title,
      startDateTime: w.startDateTime,
      costType: w.costType,
      isFree: w.costType === 'free',
      webinar: w // foreign key resolution
    }));

    const publishedArticles = articles.filter(function (a) { return a.status === 'published'; });
    publishedArticles.sort((a, b) => {
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return db - da;
    });

    const popularArticles = publishedArticles.slice(0, 3).map((a) => ({
      articleId: a.id,
      title: a.title,
      summary: a.summary || '',
      publishedAt: a.publishedAt,
      contentTypeLabel: this._enumToLabel(a.contentType),
      article: a // foreign key resolution
    }));

    return {
      featuredServices: featuredServices,
      upcomingWebinars: upcomingWebinars,
      popularArticles: popularArticles
    };
  }

  // ---------------------- Services interfaces ----------------------

  getServiceFilterOptions() {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);

    const clientTypes = [
      { value: 'small_business', label: 'Small Business' },
      { value: 'mid_sized_business', label: 'Mid-sized Business' },
      { value: 'large_business', label: 'Large Business' },
      { value: 'nonprofit', label: 'Nonprofit' },
      { value: 'other', label: 'Other' }
    ];

    const companySizeBands = [
      { value: 'employees_1_50', label: '1–50 employees' },
      { value: 'employees_51_200', label: '51–200 employees' },
      { value: 'employees_201_plus', label: '201+ employees' }
    ];

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < services.length; i++) {
      const p = services[i].basePrice;
      if (typeof p === 'number' && !isNaN(p)) {
        if (minPrice === null || p < minPrice) minPrice = p;
        if (maxPrice === null || p > maxPrice) maxPrice = p;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const tagsSet = {};
    for (let i = 0; i < services.length; i++) {
      const ts = services[i].tags || [];
      for (let j = 0; j < ts.length; j++) {
        tagsSet[ts[j]] = true;
      }
    }
    const tags = Object.keys(tagsSet);

    return {
      clientTypes: clientTypes,
      companySizeBands: companySizeBands,
      categories: categories.map(function (c) {
        return { categoryId: c.id, name: c.name, description: c.description || '' };
      }),
      priceRange: { minPrice: minPrice, maxPrice: maxPrice },
      tags: tags
    };
  }

  searchServices(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);
    const consultationPlanItems = this._getFromStorage('consultation_plan_items', []);

    const inPlanIds = {};
    for (let i = 0; i < consultationPlanItems.length; i++) {
      inPlanIds[consultationPlanItems[i].serviceId] = true;
    }

    let filtered = services.slice();

    filtered = filtered.filter((s) => {
      if (f.onlyActive === true || typeof f.onlyActive === 'undefined') {
        if (!s.isActive) return false;
      }
      if (f.clientType && s.clientType !== f.clientType) return false;
      if (f.companySizeBand && s.companySizeBand !== f.companySizeBand) return false;

      if (typeof f.minPrice === 'number' && !isNaN(f.minPrice)) {
        if (typeof s.basePrice !== 'number' || s.basePrice < f.minPrice) return false;
      }
      if (typeof f.maxPrice === 'number' && !isNaN(f.maxPrice)) {
        if (typeof s.basePrice !== 'number' || s.basePrice > f.maxPrice) return false;
      }

      if (f.onlySmallBusinessFocused) {
        if (!s.isSmallBusinessFocused) return false;
      }

      if (Array.isArray(f.tags) && f.tags.length) {
        const st = s.tags || [];
        const hasAny = f.tags.some(function (t) { return st.indexOf(t) !== -1; });
        if (!hasAny) return false;
      }

      // Category hierarchy filtering
      if (f.categoryId) {
        const allowedIds = this._getDescendantCategoryIds(f.categoryId, categories);
        if (allowedIds.indexOf(s.categoryId) === -1) return false;
      }

      if (q) {
        const haystack = (s.name || '') + ' ' + (s.shortDescription || '') + ' ' + (s.longDescription || '') + ' ' + (s.tags || []).join(' ');
        if (haystack.toLowerCase().indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else {
      // 'relevance' or other: basic name sort as fallback
      filtered.sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end).map((s) => {
      const category = categories.find((c) => c.id === s.categoryId) || null;
      return {
        serviceId: s.id,
        name: s.name,
        shortDescription: s.shortDescription || '',
        basePrice: s.basePrice,
        priceUnit: s.priceUnit,
        formattedPrice: this._formatCurrency(s.basePrice),
        categoryName: category ? category.name : '',
        clientTypeLabel: this._enumToLabel(s.clientType),
        companySizeBandLabel: this._enumToLabel(s.companySizeBand),
        isSmallBusinessFocused: !!s.isSmallBusinessFocused,
        isInConsultationPlan: !!inPlanIds[s.id]
      };
    });

    return {
      services: pageItems,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  getServiceDetails(serviceId) {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);
    const consultationPlanItems = this._getFromStorage('consultation_plan_items', []);

    const service = services.find((s) => s.id === serviceId);
    if (!service) return null;

    const category = categories.find((c) => c.id === service.categoryId) || null;
    const isInPlan = consultationPlanItems.some((item) => item.serviceId === service.id);

    return {
      serviceId: service.id,
      name: service.name,
      longDescription: service.longDescription || '',
      scope: '',
      deliverables: '',
      timeline: '',
      estimatedDurationWeeks: service.estimatedDurationWeeks || null,
      basePrice: service.basePrice,
      priceUnit: service.priceUnit,
      formattedPrice: this._formatCurrency(service.basePrice),
      categoryName: category ? category.name : '',
      clientTypeLabel: this._enumToLabel(service.clientType),
      companySizeBandLabel: this._enumToLabel(service.companySizeBand),
      deliveryFormatLabel: this._enumToLabel(service.deliveryFormat),
      tags: service.tags || [],
      isSmallBusinessFocused: !!service.isSmallBusinessFocused,
      isActive: !!service.isActive,
      isInConsultationPlan: isInPlan
    };
  }

  getRelatedServicesForService(serviceId) {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);

    const service = services.find((s) => s.id === serviceId);
    if (!service) return [];

    const targetCategoryId = service.categoryId;
    const targetTags = service.tags || [];

    const related = services
      .filter((s) => s.id !== service.id && s.isActive)
      .map((s) => {
        let score = 0;
        if (s.categoryId === targetCategoryId) score += 2;
        const stags = s.tags || [];
        for (let i = 0; i < targetTags.length; i++) {
          if (stags.indexOf(targetTags[i]) !== -1) score += 1;
        }
        return { item: s, score: score };
      })
      .filter((x) => x.score > 0);

    related.sort((a, b) => b.score - a.score);

    const top = related.slice(0, 3).map((x) => {
      const s = x.item;
      const category = categories.find((c) => c.id === s.categoryId) || null;
      return {
        serviceId: s.id,
        name: s.name,
        shortDescription: s.shortDescription || '',
        formattedPrice: this._formatCurrency(s.basePrice),
        categoryName: category ? category.name : ''
      };
    });

    return top;
  }

  addServiceToConsultationPlan(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return { success: false, consultationPlanId: null, message: 'Service not found', currentItemCount: 0 };
    }

    const plan = this._getOrCreateConsultationPlan();
    let items = this._getFromStorage('consultation_plan_items', []);

    const existing = items.find((it) => it.consultationPlanId === plan.id && it.serviceId === serviceId);
    if (existing) {
      return {
        success: true,
        consultationPlanId: plan.id,
        message: 'Service already in consultation plan',
        currentItemCount: items.filter((it) => it.consultationPlanId === plan.id).length
      };
    }

    const now = new Date().toISOString();
    const orderIndex = items.filter((it) => it.consultationPlanId === plan.id).length;

    const newItem = {
      id: this._generateId('cpi'),
      consultationPlanId: plan.id,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      priceSnapshot: typeof service.basePrice === 'number' ? service.basePrice : null,
      addedAt: now,
      orderIndex: orderIndex
    };

    items.push(newItem);
    this._saveToStorage('consultation_plan_items', items);
    this._updateSingletonUpdatedAt('consultation_plans');

    return {
      success: true,
      consultationPlanId: plan.id,
      message: 'Service added to consultation plan',
      currentItemCount: items.filter((it) => it.consultationPlanId === plan.id).length
    };
  }

  removeServiceFromConsultationPlan(consultationPlanItemId) {
    let items = this._getFromStorage('consultation_plan_items', []);
    const idx = items.findIndex((it) => it.id === consultationPlanItemId);

    if (idx === -1) {
      const plan = this._getFromStorage('consultation_plans', [])[0] || null;
      const planId = plan ? plan.id : null;
      const count = plan ? items.filter((it) => it.consultationPlanId === planId).length : 0;
      return {
        success: false,
        consultationPlanId: planId,
        message: 'Consultation plan item not found',
        currentItemCount: count
      };
    }

    const item = items[idx];
    const planId = item.consultationPlanId;
    items.splice(idx, 1);
    this._saveToStorage('consultation_plan_items', items);
    this._updateSingletonUpdatedAt('consultation_plans');

    const remainingCount = items.filter((it) => it.consultationPlanId === planId).length;

    return {
      success: true,
      consultationPlanId: planId,
      message: 'Service removed from consultation plan',
      currentItemCount: remainingCount
    };
  }

  submitServiceConsultationRequest(serviceId, requesterName, requesterWorkEmail, requesterCompany, projectDescription) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return {
        success: false,
        requestId: null,
        serviceNameSnapshot: '',
        status: 'submitted',
        confirmationMessage: 'Service not found'
      };
    }

    const requests = this._getFromStorage('service_consultation_requests', []);
    const id = this._generateId('scr');
    const now = new Date().toISOString();

    const record = {
      id: id,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      requesterName: requesterName,
      requesterWorkEmail: requesterWorkEmail,
      requesterCompany: requesterCompany,
      projectDescription: projectDescription,
      status: 'submitted',
      createdAt: now
    };

    requests.push(record);
    this._saveToStorage('service_consultation_requests', requests);

    return {
      success: true,
      requestId: id,
      serviceNameSnapshot: service.name,
      status: 'submitted',
      confirmationMessage: 'Your consultation request has been submitted.'
    };
  }

  // ---------------------- Webinars & Events interfaces ----------------------

  getWebinarFilterOptions() {
    const webinars = this._getFromStorage('webinar_events', []);

    const topicSet = {};
    for (let i = 0; i < webinars.length; i++) {
      const ts = webinars[i].topics || [];
      for (let j = 0; j < ts.length; j++) {
        topicSet[ts[j]] = true;
      }
    }

    const topics = Object.keys(topicSet).map((t) => ({
      value: t,
      label: this._enumToLabel(t)
    }));

    const formats = [
      { value: 'live_session', label: 'Live session' },
      { value: 'on_demand', label: 'On-demand' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const costTypes = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' }
    ];

    return {
      topics: topics,
      formats: formats,
      costTypes: costTypes
    };
  }

  searchWebinarsAndEvents(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sort = sortBy || 'start_date_soonest_first';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const webinars = this._getFromStorage('webinar_events', []);

    let filtered = webinars.slice().filter((w) => {
      if (f.costType && w.costType !== f.costType) return false;
      if (f.topic) {
        const ts = w.topics || [];
        if (ts.indexOf(f.topic) === -1) return false;
      }
      if (f.format && w.format !== f.format) return false;
      if (f.status && w.status !== f.status) return false;

      if (f.startDate) {
        const startFilter = this._parseDateInput(f.startDate);
        if (startFilter && w.startDateTime) {
          const d = new Date(w.startDateTime);
          if (d < startFilter) return false;
        }
      }
      if (f.endDate) {
        const endFilter = this._parseDateInput(f.endDate);
        if (endFilter && w.startDateTime) {
          const d = new Date(w.startDateTime);
          if (d > endFilter) return false;
        }
      }

      if (q) {
        const haystack = (w.title || '') + ' ' + (w.description || '') + ' ' + (w.summary || '') + ' ' + (w.topics || []).join(' ');
        if (haystack.toLowerCase().indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort === 'start_date_soonest_first') {
      filtered.sort((a, b) => {
        const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
        const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
        return da - db;
      });
    } else if (sort === 'relevance') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const totalCount = filtered.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;

    const pageItems = filtered.slice(startIdx, endIdx).map((w) => ({
      webinarId: w.id,
      title: w.title,
      summary: w.summary || w.description || '',
      startDateTime: w.startDateTime,
      endDateTime: w.endDateTime || null,
      costType: w.costType,
      price: w.price || 0,
      formattedPrice: w.costType === 'free' ? 'Free' : this._formatCurrency(w.price || 0),
      formatLabel: this._enumToLabel(w.format),
      topics: w.topics || [],
      status: w.status
    }));

    return {
      events: pageItems,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  getWebinarDetails(webinarId) {
    const webinars = this._getFromStorage('webinar_events', []);
    const w = webinars.find((x) => x.id === webinarId);
    if (!w) return null;

    let attendanceTypes = [];
    if (w.format === 'live_session') attendanceTypes = ['live_session'];
    else if (w.format === 'on_demand') attendanceTypes = ['on_demand_recording'];
    else if (w.format === 'hybrid') attendanceTypes = ['live_session', 'on_demand_recording'];

    const reminderOptions = ['none', 'one_day_before', 'one_hour_before', 'one_week_before'];

    return {
      webinarId: w.id,
      title: w.title,
      description: w.description || '',
      agenda: '',
      presenterNames: w.presenterNames || [],
      startDateTime: w.startDateTime,
      endDateTime: w.endDateTime || null,
      costType: w.costType,
      price: w.price || 0,
      formattedPrice: w.costType === 'free' ? 'Free' : this._formatCurrency(w.price || 0),
      format: w.format,
      formatLabel: this._enumToLabel(w.format),
      locationType: w.locationType || null,
      registrationDeadline: w.registrationDeadline || null,
      status: w.status,
      availableAttendanceTypes: attendanceTypes,
      availableReminderOptions: reminderOptions
    };
  }

  registerForWebinar(webinarId, fullName, email, company, attendanceType, emailReminderSetting) {
    const webinars = this._getFromStorage('webinar_events', []);
    const w = webinars.find((x) => x.id === webinarId);
    if (!w) {
      return {
        success: false,
        registrationId: null,
        webinarTitleSnapshot: '',
        status: 'registered',
        confirmationMessage: 'Webinar not found',
        calendarLinks: { ics: '', google: '', outlook: '' }
      };
    }

    let finalAttendanceType = attendanceType;
    if (!finalAttendanceType) {
      if (w.format === 'live_session') finalAttendanceType = 'live_session';
      else if (w.format === 'on_demand') finalAttendanceType = 'on_demand_recording';
      else if (w.format === 'hybrid') finalAttendanceType = 'live_session';
    }

    let finalReminder = emailReminderSetting || 'none';

    const registrations = this._getFromStorage('webinar_registrations', []);
    const id = this._generateId('wr');
    const now = new Date().toISOString();

    const record = {
      id: id,
      webinarId: w.id,
      webinarTitleSnapshot: w.title,
      fullName: fullName,
      email: email,
      company: company,
      attendanceType: finalAttendanceType,
      emailReminderSetting: finalReminder,
      registrationDate: now,
      status: 'registered'
    };

    registrations.push(record);
    this._saveToStorage('webinar_registrations', registrations);

    const calendarLinks = {
      ics: '',
      google: '',
      outlook: ''
    };

    return {
      success: true,
      registrationId: id,
      webinarTitleSnapshot: w.title,
      status: 'registered',
      confirmationMessage: 'You are registered for the webinar.',
      calendarLinks: calendarLinks
    };
  }

  // ---------------------- Training & Workshops interfaces ----------------------

  getWorkshopFilterOptions() {
    const skillLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const topicTracks = [
      { value: 'getting_started_with_government_contracting', label: 'Getting Started with Government Contracting' },
      { value: 'gsa_schedule_readiness', label: 'GSA Schedule Readiness' },
      { value: 'proposal_development', label: 'Proposal Development' },
      { value: 'capture_management', label: 'Capture Management' },
      { value: 'compliance_and_registrations', label: 'Compliance & Registrations' }
    ];

    return {
      skillLevels: skillLevels,
      topicTracks: topicTracks
    };
  }

  searchWorkshops(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const workshops = this._getFromStorage('workshops', []);
    const learningPlanItems = this._getFromStorage('learning_plan_items', []);

    const inPlanIds = {};
    for (let i = 0; i < learningPlanItems.length; i++) {
      inPlanIds[learningPlanItems[i].workshopId] = true;
    }

    let filtered = workshops.slice().filter((w) => {
      if (f.onlyActive === true || typeof f.onlyActive === 'undefined') {
        if (!w.isActive) return false;
      }
      if (f.skillLevel && w.skillLevel !== f.skillLevel) return false;
      if (f.topicTrack && w.topicTrack !== f.topicTrack) return false;

      if (q) {
        const haystack = (w.title || '') + ' ' + (w.description || '') + ' ' + (w.tags || []).join(' ');
        if (haystack.toLowerCase().indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'date_soonest_first') {
      filtered.sort((a, b) => {
        const da = a.nextSessionDate ? new Date(a.nextSessionDate).getTime() : 0;
        const db = b.nextSessionDate ? new Date(b.nextSessionDate).getTime() : 0;
        return da - db;
      });
    } else {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const totalCount = filtered.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;

    const pageItems = filtered.slice(startIdx, endIdx).map((w) => ({
      workshopId: w.id,
      title: w.title,
      description: w.description || '',
      price: w.price,
      formattedPrice: this._formatCurrency(w.price),
      skillLevelLabel: this._enumToLabel(w.skillLevel),
      topicTrackLabel: this._enumToLabel(w.topicTrack),
      nextSessionDate: w.nextSessionDate || null,
      deliveryFormatLabel: this._enumToLabel(w.deliveryFormat),
      isInLearningPlan: !!inPlanIds[w.id]
    }));

    return {
      workshops: pageItems,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  addWorkshopToLearningPlan(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find((w) => w.id === workshopId);
    if (!workshop) {
      return { success: false, learningPlanId: null, message: 'Workshop not found', currentItemCount: 0 };
    }

    const plan = this._getOrCreateLearningPlan();
    let items = this._getFromStorage('learning_plan_items', []);

    const existing = items.find((it) => it.learningPlanId === plan.id && it.workshopId === workshopId);
    if (existing) {
      return {
        success: true,
        learningPlanId: plan.id,
        message: 'Workshop already in learning plan',
        currentItemCount: items.filter((it) => it.learningPlanId === plan.id).length
      };
    }

    const now = new Date().toISOString();
    const orderIndex = items.filter((it) => it.learningPlanId === plan.id).length;

    const newItem = {
      id: this._generateId('lpi'),
      learningPlanId: plan.id,
      workshopId: workshop.id,
      workshopTitleSnapshot: workshop.title,
      priceSnapshot: workshop.price,
      addedAt: now,
      orderIndex: orderIndex
    };

    items.push(newItem);
    this._saveToStorage('learning_plan_items', items);
    this._updateSingletonUpdatedAt('learning_plans');

    return {
      success: true,
      learningPlanId: plan.id,
      message: 'Workshop added to learning plan',
      currentItemCount: items.filter((it) => it.learningPlanId === plan.id).length
    };
  }

  getLearningPlan() {
    const plan = this._getOrCreateLearningPlan();
    const itemsAll = this._getFromStorage('learning_plan_items', []);
    const workshops = this._getFromStorage('workshops', []);

    const items = itemsAll
      .filter((it) => it.learningPlanId === plan.id)
      .map((it) => {
        const workshop = workshops.find((w) => w.id === it.workshopId) || null;
        const price = typeof it.priceSnapshot === 'number' ? it.priceSnapshot : workshop ? workshop.price : 0;
        return {
          learningPlanItemId: it.id,
          workshopId: it.workshopId,
          title: it.workshopTitleSnapshot || (workshop ? workshop.title : ''),
          priceSnapshot: price,
          formattedPrice: this._formatCurrency(price),
          skillLevelLabel: workshop ? this._enumToLabel(workshop.skillLevel) : '',
          topicTrackLabel: workshop ? this._enumToLabel(workshop.topicTrack) : '',
          workshop: workshop // foreign key resolution
        };
      });

    const totals = this._calculatePlanOrListTotals(items, 'priceSnapshot');

    return {
      learningPlanId: plan.id,
      learningPlan: plan, // foreign key resolution for id
      items: items,
      totalPrice: totals.totalPrice,
      formattedTotalPrice: totals.formattedTotalPrice
    };
  }

  removeWorkshopFromLearningPlan(learningPlanItemId) {
    let items = this._getFromStorage('learning_plan_items', []);
    const idx = items.findIndex((it) => it.id === learningPlanItemId);

    if (idx === -1) {
      const plan = this._getFromStorage('learning_plans', [])[0] || null;
      const planId = plan ? plan.id : null;
      const count = plan ? items.filter((it) => it.learningPlanId === planId).length : 0;
      return {
        success: false,
        learningPlanId: planId,
        message: 'Learning plan item not found',
        remainingItemCount: count
      };
    }

    const planId = items[idx].learningPlanId;
    items.splice(idx, 1);
    this._saveToStorage('learning_plan_items', items);
    this._updateSingletonUpdatedAt('learning_plans');

    const remainingCount = items.filter((it) => it.learningPlanId === planId).length;

    return {
      success: true,
      learningPlanId: planId,
      message: 'Workshop removed from learning plan',
      remainingItemCount: remainingCount
    };
  }

  // ---------------------- Plans & Pricing (Advisory Plans) ----------------------

  getAdvisoryPlanFilterOptions() {
    const plans = this._getFromStorage('advisory_plans', []);

    const planTypes = [
      { value: 'one_time_engagement', label: 'One-time Engagement' },
      { value: 'ongoing_advisory', label: 'Ongoing Advisory' }
    ];

    const featureFilters = {
      captureStrategySupport: {
        value: 'includes_capture_strategy_support',
        label: 'Capture Strategy Support'
      },
      bidNoBidDecisionReviews: {
        value: 'includes_bid_no_bid_decision_reviews',
        label: 'Bid/No-Bid Decision Reviews'
      }
    };

    let minMonthlyPrice = null;
    let maxMonthlyPrice = null;
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i].monthlyPrice;
      if (typeof p === 'number' && !isNaN(p)) {
        if (minMonthlyPrice === null || p < minMonthlyPrice) minMonthlyPrice = p;
        if (maxMonthlyPrice === null || p > maxMonthlyPrice) maxMonthlyPrice = p;
      }
    }
    if (minMonthlyPrice === null) minMonthlyPrice = 0;
    if (maxMonthlyPrice === null) maxMonthlyPrice = 0;

    return {
      planTypes: planTypes,
      featureFilters: featureFilters,
      priceRange: {
        minMonthlyPrice: minMonthlyPrice,
        maxMonthlyPrice: maxMonthlyPrice
      }
    };
  }

  searchAdvisoryPlans(filters, sortBy) {
    const f = filters || {};
    const sort = sortBy || 'price_low_to_high';

    const plans = this._getFromStorage('advisory_plans', []);
    const compareList = this._getOrCreatePlanCompareList();
    const compareIds = compareList.planIds || [];

    let filtered = plans.slice().filter((p) => {
      if (f.onlyActive === true || typeof f.onlyActive === 'undefined') {
        if (!p.isActive) return false;
      }
      if (f.planType && p.planType !== f.planType) return false;
      if (typeof f.maxMonthlyPrice === 'number' && !isNaN(f.maxMonthlyPrice)) {
        if (p.monthlyPrice > f.maxMonthlyPrice) return false;
      }
      if (f.includesCaptureStrategySupport === true && !p.includesCaptureStrategySupport) return false;
      if (f.includesBidNoBidDecisionReviews === true && !p.includesBidNoBidDecisionReviews) return false;
      return true;
    });

    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => (a.monthlyPrice || 0) - (b.monthlyPrice || 0));
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => (b.monthlyPrice || 0) - (a.monthlyPrice || 0));
    }

    return filtered.map((p) => ({
      planId: p.id,
      name: p.name,
      description: p.description || '',
      planType: p.planType,
      billingFrequency: p.billingFrequency,
      monthlyPrice: p.monthlyPrice,
      formattedMonthlyPrice: this._formatCurrency(p.monthlyPrice),
      setupFee: p.setupFee || 0,
      includesCaptureStrategySupport: !!p.includesCaptureStrategySupport,
      includesBidNoBidDecisionReviews: !!p.includesBidNoBidDecisionReviews,
      otherFeatures: p.otherFeatures || [],
      isInCompareList: compareIds.indexOf(p.id) !== -1
    }));
  }

  togglePlanInCompareList(planId) {
    const compareList = this._getOrCreatePlanCompareList();
    let updatedIds = Array.isArray(compareList.planIds) ? compareList.planIds.slice() : [];

    const idx = updatedIds.indexOf(planId);
    if (idx === -1) updatedIds.push(planId);
    else updatedIds.splice(idx, 1);

    compareList.planIds = updatedIds;

    // Save back singleton
    let lists = this._getFromStorage('plan_compare_lists', []);
    if (lists.length) {
      lists[0] = compareList;
    } else {
      lists.push(compareList);
    }
    this._saveToStorage('plan_compare_lists', lists);

    return {
      compareListId: compareList.id,
      planIds: updatedIds
    };
  }

  getPlanComparisonView() {
    const compareList = this._getOrCreatePlanCompareList();
    const plans = this._getFromStorage('advisory_plans', []);
    const ids = compareList.planIds || [];

    const selected = plans.filter((p) => ids.indexOf(p.id) !== -1).map((p) => ({
      planId: p.id,
      name: p.name,
      monthlyPrice: p.monthlyPrice,
      formattedMonthlyPrice: this._formatCurrency(p.monthlyPrice),
      includesCaptureStrategySupport: !!p.includesCaptureStrategySupport,
      includesBidNoBidDecisionReviews: !!p.includesBidNoBidDecisionReviews,
      otherFeatures: p.otherFeatures || []
    }));

    return {
      compareListId: compareList.id,
      compareList: compareList, // foreign key resolution
      plans: selected
    };
  }

  submitPlanIntake(planId, companyName, contractVolume, additionalNotes) {
    const plans = this._getFromStorage('advisory_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return {
        submissionId: null,
        planNameSnapshot: '',
        status: 'submitted',
        confirmationMessage: 'Selected advisory plan not found.'
      };
    }

    const submissions = this._getFromStorage('plan_intake_submissions', []);
    const id = this._generateId('pis');
    const now = new Date().toISOString();

    const record = {
      id: id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      companyName: companyName,
      contractVolume: contractVolume,
      additionalNotes: additionalNotes || '',
      status: 'submitted',
      submittedAt: now
    };

    submissions.push(record);
    this._saveToStorage('plan_intake_submissions', submissions);

    return {
      submissionId: id,
      planNameSnapshot: plan.name,
      status: 'submitted',
      confirmationMessage: 'Your advisory plan inquiry has been submitted.'
    };
  }

  // ---------------------- Articles / Insights & Resources ----------------------

  getArticleFilterOptions() {
    const dateRanges = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_90_days', label: 'Last 90 days' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    const contentTypes = [
      { value: 'how_to_guide', label: 'How-To Guide' },
      { value: 'checklist', label: 'Checklist' },
      { value: 'case_study', label: 'Case Study' },
      { value: 'opinion', label: 'Opinion' },
      { value: 'news', label: 'News' },
      { value: 'other', label: 'Other' }
    ];

    return {
      dateRanges: dateRanges,
      contentTypes: contentTypes
    };
  }

  searchArticles(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sort = sortBy || 'most_recent';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const articles = this._getFromStorage('articles', []);
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    let savedSet = {};
    if (readingLists.length) {
      const listId = readingLists[0].id;
      for (let i = 0; i < readingListItems.length; i++) {
        if (readingListItems[i].readingListId === listId) {
          savedSet[readingListItems[i].articleId] = true;
        }
      }
    }

    const now = new Date();

    let filtered = articles.slice().filter((a) => {
      if (a.status !== 'published') return false;

      // Date range filter
      if (f.dateRange && f.dateRange !== 'all_time') {
        const publishedDate = a.publishedAt ? new Date(a.publishedAt) : null;
        if (!publishedDate) return false;
        let cutoff = null;
        if (f.dateRange === 'last_30_days') {
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (f.dateRange === 'last_90_days') {
          cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (f.dateRange === 'last_12_months') {
          cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        }
        if (cutoff && publishedDate < cutoff) return false;
      }

      if (Array.isArray(f.contentTypes) && f.contentTypes.length) {
        if (f.contentTypes.indexOf(a.contentType) === -1) return false;
      }

      if (Array.isArray(f.tags) && f.tags.length) {
        const atags = a.tags || [];
        const hasAny = f.tags.some(function (t) { return atags.indexOf(t) !== -1; });
        if (!hasAny) return false;
      }

      if (q) {
        const haystack = (a.title || '') + ' ' + (a.summary || '') + ' ' + (a.body || '') + ' ' + (a.tags || []).join(' ');
        if (haystack.toLowerCase().indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort === 'most_recent') {
      filtered.sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'relevance') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const totalCount = filtered.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;

    const pageItems = filtered.slice(startIdx, endIdx).map((a) => ({
      articleId: a.id,
      title: a.title,
      summary: a.summary || '',
      publishedAt: a.publishedAt,
      contentTypeLabel: this._enumToLabel(a.contentType),
      isSavedToReadingList: !!savedSet[a.id]
    }));

    return {
      articles: pageItems,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles', []);
    const a = articles.find((x) => x.id === articleId);
    if (!a) return null;

    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    let isSaved = false;
    if (readingLists.length) {
      const listId = readingLists[0].id;
      isSaved = readingListItems.some((it) => it.readingListId === listId && it.articleId === a.id);
    }

    return {
      articleId: a.id,
      title: a.title,
      body: a.body || '',
      summary: a.summary || '',
      publishedAt: a.publishedAt,
      authorName: a.authorName || '',
      contentTypeLabel: this._enumToLabel(a.contentType),
      tags: a.tags || [],
      isSavedToReadingList: isSaved
    };
  }

  addArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId && a.status === 'published');
    if (!article) {
      return { readingListId: null, success: false, message: 'Article not found or not published' };
    }

    const list = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items', []);

    const existing = items.find((it) => it.readingListId === list.id && it.articleId === articleId);
    if (existing) {
      return { readingListId: list.id, success: true, message: 'Article already in reading list' };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('rli'),
      readingListId: list.id,
      articleId: article.id,
      articleTitleSnapshot: article.title,
      savedAt: now
    };

    items.push(newItem);
    this._saveToStorage('reading_list_items', items);
    this._updateSingletonUpdatedAt('reading_lists');

    return { readingListId: list.id, success: true, message: 'Article added to reading list' };
  }

  removeArticleFromReadingList(articleId) {
    const lists = this._getFromStorage('reading_lists', []);
    if (!lists.length) {
      return { readingListId: null, success: false };
    }
    const list = lists[0];
    let items = this._getFromStorage('reading_list_items', []);
    const before = items.length;
    items = items.filter((it) => !(it.readingListId === list.id && it.articleId === articleId));
    this._saveToStorage('reading_list_items', items);
    const success = items.length !== before;
    if (success) this._updateSingletonUpdatedAt('reading_lists');
    return { readingListId: list.id, success: success };
  }

  getReadingList() {
    const list = this._getOrCreateReadingList();
    const itemsAll = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const items = itemsAll
      .filter((it) => it.readingListId === list.id)
      .map((it) => {
        const article = articles.find((a) => a.id === it.articleId) || null;
        return {
          readingListItemId: it.id,
          articleId: it.articleId,
          title: article ? article.title : it.articleTitleSnapshot,
          summary: article ? (article.summary || '') : '',
          savedAt: it.savedAt,
          article: article // foreign key resolution
        };
      });

    return {
      readingListId: list.id,
      readingList: list, // foreign key resolution
      items: items
    };
  }

  // ---------------------- Capability Statement Builder ----------------------

  getCapabilityTemplates() {
    const templates = this._getFromStorage('capability_templates', []);
    return templates.map((t) => ({
      templateId: t.id,
      name: t.name,
      description: t.description || '',
      defaultColorTheme: t.defaultColorTheme || null
    }));
  }

  generateCapabilityStatementPreview(templateId, companyName, naicsCodes, coreCompetencies, pastPerformanceHighlights, targetAgencies, colorTheme) {
    const templates = this._getFromStorage('capability_templates', []);
    const drafts = this._getFromStorage('capability_statement_drafts', []);

    const template = templates.find((t) => t.id === templateId) || null;
    const templateName = template ? template.name : '';

    // Try to find existing draft for this template + company
    let draft = drafts.find((d) => d.templateId === templateId && d.companyName === companyName) || null;
    const now = new Date().toISOString();

    const previewHtml = [
      '<div class="capability-statement ', colorTheme || '', '">',
      '<h1>', companyName, '</h1>',
      templateName ? '<h2>' + templateName + '</h2>' : '',
      '<h3>NAICS Codes</h3>',
      '<p>', (naicsCodes || []).join(', '), '</p>',
      '<h3>Core Competencies</h3>',
      '<p>', coreCompetencies || '', '</p>',
      pastPerformanceHighlights ? '<h3>Past Performance Highlights</h3><p>' + pastPerformanceHighlights + '</p>' : '',
      (targetAgencies && targetAgencies.length)
        ? '<h3>Target Agencies</h3><p>' + targetAgencies.map(this._enumToLabel.bind(this)).join(', ') + '</p>'
        : '',
      '</div>'
    ].join('');

    if (draft) {
      draft.templateNameSnapshot = templateName;
      draft.companyName = companyName;
      draft.naicsCodes = Array.isArray(naicsCodes) ? naicsCodes : [];
      draft.coreCompetencies = coreCompetencies;
      draft.pastPerformanceHighlights = pastPerformanceHighlights || '';
      draft.targetAgencies = Array.isArray(targetAgencies) ? targetAgencies : [];
      draft.colorTheme = colorTheme;
      draft.previewHtml = previewHtml;
      draft.lastGeneratedAt = now;
    } else {
      draft = {
        id: this._generateId('csd'),
        templateId: templateId,
        templateNameSnapshot: templateName,
        companyName: companyName,
        naicsCodes: Array.isArray(naicsCodes) ? naicsCodes : [],
        coreCompetencies: coreCompetencies,
        pastPerformanceHighlights: pastPerformanceHighlights || '',
        targetAgencies: Array.isArray(targetAgencies) ? targetAgencies : [],
        colorTheme: colorTheme,
        previewHtml: previewHtml,
        createdAt: now,
        lastGeneratedAt: now
      };
      drafts.push(draft);
    }

    this._saveToStorage('capability_statement_drafts', drafts);

    return {
      draftId: draft.id,
      templateNameSnapshot: draft.templateNameSnapshot,
      previewHtml: draft.previewHtml
    };
  }

  // ---------------------- Help Center & Support ----------------------

  getHelpCategories() {
    const categories = this._getFromStorage('help_categories', []);
    return categories.map((c) => ({
      categoryId: c.id,
      name: c.name,
      description: c.description || ''
    }));
  }

  searchHelpCenterArticles(query, categoryId) {
    const q = (query || '').toLowerCase();
    const cats = this._getFromStorage('help_categories', []);
    const articles = this._getFromStorage('help_articles', []);

    let filtered = articles.slice().filter((a) => {
      if (categoryId && a.categoryId !== categoryId) return false;
      if (q) {
        const haystack = (a.title || '') + ' ' + (a.body || '') + ' ' + (a.keywords || []).join(' ');
        if (haystack.toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });

    return filtered.map((a) => {
      const category = cats.find((c) => c.id === a.categoryId) || null;
      const body = a.body || '';
      const snippet = body.length > 200 ? body.slice(0, 197) + '...' : body;
      return {
        helpArticleId: a.id,
        title: a.title,
        snippet: snippet,
        categoryName: category ? category.name : ''
      };
    });
  }

  getHelpArticleDetails(helpArticleId) {
    const cats = this._getFromStorage('help_categories', []);
    const articles = this._getFromStorage('help_articles', []);

    const a = articles.find((x) => x.id === helpArticleId);
    if (!a) return null;

    const category = cats.find((c) => c.id === a.categoryId) || null;

    return {
      helpArticleId: a.id,
      title: a.title,
      body: a.body || '',
      categoryName: category ? category.name : '',
      createdAt: a.createdAt,
      updatedAt: a.updatedAt || null
    };
  }

  submitSupportRequest(topic, helpArticleId, name, businessEmail, company, message, timeline) {
    const requests = this._getFromStorage('support_requests', []);
    const id = this._generateId('sr');
    const now = new Date().toISOString();

    const record = {
      id: id,
      topic: topic,
      helpArticleId: helpArticleId || null,
      name: name,
      businessEmail: businessEmail,
      company: company,
      message: message,
      timeline: timeline,
      status: 'submitted',
      createdAt: now
    };

    requests.push(record);
    this._saveToStorage('support_requests', requests);

    return {
      supportRequestId: id,
      status: 'submitted',
      confirmationMessage: 'Your support request has been submitted.'
    };
  }

  // ---------------------- Consultation Plan & Scheduling ----------------------

  getConsultationPlan() {
    const plan = this._getOrCreateConsultationPlan();
    const itemsAll = this._getFromStorage('consultation_plan_items', []);
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);

    const items = itemsAll
      .filter((it) => it.consultationPlanId === plan.id)
      .map((it) => {
        const service = services.find((s) => s.id === it.serviceId) || null;
        const category = service ? categories.find((c) => c.id === service.categoryId) || null : null;
        const price = typeof it.priceSnapshot === 'number' ? it.priceSnapshot : service ? service.basePrice : 0;
        return {
          consultationPlanItemId: it.id,
          serviceId: it.serviceId,
          serviceName: it.serviceNameSnapshot || (service ? service.name : ''),
          categoryName: category ? category.name : '',
          priceSnapshot: price,
          formattedPrice: this._formatCurrency(price),
          service: service // foreign key resolution
        };
      });

    const totals = this._calculatePlanOrListTotals(items, 'priceSnapshot');

    return {
      consultationPlanId: plan.id,
      consultationPlan: plan, // foreign key resolution
      items: items,
      totalEstimatedPrice: totals.totalPrice,
      formattedTotalEstimatedPrice: totals.formattedTotalPrice
    };
  }

  scheduleConsultationAppointment(scheduledStart, scheduledEnd, notes) {
    const plan = this._getOrCreateConsultationPlan();
    const appointments = this._getFromStorage('scheduled_consultations', []);

    const start = this._parseDateInput(scheduledStart);
    const end = scheduledEnd ? this._parseDateInput(scheduledEnd) : null;

    const startIso = start ? start.toISOString() : scheduledStart;
    const endIso = end ? end.toISOString() : (scheduledEnd || null);

    const id = this._generateId('sca');
    const now = new Date().toISOString();

    const record = {
      id: id,
      consultationPlanId: plan.id,
      scheduledStart: startIso,
      scheduledEnd: endIso,
      notes: notes,
      createdAt: now,
      status: 'scheduled'
    };

    appointments.push(record);
    this._saveToStorage('scheduled_consultations', appointments);

    const summary = 'Consultation scheduled for ' + startIso + (endIso ? ' – ' + endIso : '');

    return {
      appointmentId: id,
      consultationPlanId: plan.id,
      scheduledStart: startIso,
      scheduledEnd: endIso,
      status: 'scheduled',
      summary: summary
    };
  }

  // ---------------------- Past Performance / Case Studies ----------------------

  getCaseStudyFilterOptions() {
    const industries = [
      { value: 'information_technology', label: 'Information Technology' },
      { value: 'professional_services', label: 'Professional Services' },
      { value: 'cybersecurity', label: 'Cybersecurity' },
      { value: 'management_consulting', label: 'Management Consulting' },
      { value: 'other', label: 'Other' }
    ];

    const agencies = [
      { value: 'department_of_defense_dod', label: 'Department of Defense (DoD)' },
      { value: 'department_of_homeland_security_dhs', label: 'Department of Homeland Security (DHS)' },
      { value: 'general_services_administration_gsa', label: 'General Services Administration (GSA)' },
      { value: 'department_of_veterans_affairs_va', label: 'Department of Veterans Affairs (VA)' },
      { value: 'other_federal_agency', label: 'Other Federal Agency' }
    ];

    const contractRoles = [
      { value: 'prime_contractor', label: 'Prime Contractor' },
      { value: 'subcontractor', label: 'Subcontractor' },
      { value: 'joint_venture_partner', label: 'Joint Venture Partner' }
    ];

    return {
      industries: industries,
      agencies: agencies,
      contractRoles: contractRoles
    };
  }

  searchCaseStudies(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const caseStudies = this._getFromStorage('case_studies', []);
    const savedLists = this._getFromStorage('saved_case_study_lists', []);
    const savedItems = this._getFromStorage('saved_case_study_items', []);

    let savedSet = {};
    if (savedLists.length) {
      const listId = savedLists[0].id;
      for (let i = 0; i < savedItems.length; i++) {
        if (savedItems[i].savedCaseStudyListId === listId) {
          savedSet[savedItems[i].caseStudyId] = true;
        }
      }
    }

    let filtered = caseStudies.slice().filter((cs) => {
      if (f.onlyActive === true || typeof f.onlyActive === 'undefined') {
        if (!cs.isActive) return false;
      }
      if (f.industry && cs.industry !== f.industry) return false;
      if (f.agency && cs.agency !== f.agency) return false;
      if (f.contractRole && cs.contractRole !== f.contractRole) return false;

      if (q) {
        const haystack = (cs.title || '') + ' ' + (cs.summary || '') + ' ' + (cs.body || '') + ' ' + (cs.keywords || []).join(' ') + ' ' + (cs.technologies || []).join(' ');
        if (haystack.toLowerCase().indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort === 'most_recent') {
      filtered.sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'relevance') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const totalCount = filtered.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;

    const pageItems = filtered.slice(startIdx, endIdx).map((cs) => ({
      caseStudyId: cs.id,
      title: cs.title,
      summary: cs.summary || '',
      industryLabel: this._enumToLabel(cs.industry),
      agencyLabel: this._enumToLabel(cs.agency),
      contractRoleLabel: this._enumToLabel(cs.contractRole),
      publishedAt: cs.publishedAt,
      isSaved: !!savedSet[cs.id]
    }));

    return {
      caseStudies: pageItems,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const savedLists = this._getFromStorage('saved_case_study_lists', []);
    const savedItems = this._getFromStorage('saved_case_study_items', []);

    const cs = caseStudies.find((x) => x.id === caseStudyId);
    if (!cs) return null;

    let isSaved = false;
    if (savedLists.length) {
      const listId = savedLists[0].id;
      isSaved = savedItems.some((it) => it.savedCaseStudyListId === listId && it.caseStudyId === cs.id);
    }

    return {
      caseStudyId: cs.id,
      title: cs.title,
      body: cs.body || '',
      summary: cs.summary || '',
      industryLabel: this._enumToLabel(cs.industry),
      agencyLabel: this._enumToLabel(cs.agency),
      contractRoleLabel: this._enumToLabel(cs.contractRole),
      technologies: cs.technologies || [],
      publishedAt: cs.publishedAt,
      isSaved: isSaved
    };
  }

  addCaseStudyToSavedList(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find((c) => c.id === caseStudyId && c.isActive);
    if (!cs) {
      return { savedCaseStudyListId: null, success: false, message: 'Case study not found or not active' };
    }

    const list = this._getOrCreateSavedCaseStudyList();
    let items = this._getFromStorage('saved_case_study_items', []);

    const existing = items.find((it) => it.savedCaseStudyListId === list.id && it.caseStudyId === caseStudyId);
    if (existing) {
      return { savedCaseStudyListId: list.id, success: true, message: 'Case study already saved' };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('scsi'),
      savedCaseStudyListId: list.id,
      caseStudyId: cs.id,
      caseStudyTitleSnapshot: cs.title,
      savedAt: now
    };

    items.push(newItem);
    this._saveToStorage('saved_case_study_items', items);
    this._updateSingletonUpdatedAt('saved_case_study_lists');

    return { savedCaseStudyListId: list.id, success: true, message: 'Case study saved' };
  }

  removeCaseStudyFromSavedList(caseStudyId) {
    const lists = this._getFromStorage('saved_case_study_lists', []);
    if (!lists.length) {
      return { savedCaseStudyListId: null, success: false };
    }
    const list = lists[0];
    let items = this._getFromStorage('saved_case_study_items', []);
    const before = items.length;
    items = items.filter((it) => !(it.savedCaseStudyListId === list.id && it.caseStudyId === caseStudyId));
    this._saveToStorage('saved_case_study_items', items);
    const success = items.length !== before;
    if (success) this._updateSingletonUpdatedAt('saved_case_study_lists');
    return { savedCaseStudyListId: list.id, success: success };
  }

  getSavedCaseStudies() {
    const list = this._getOrCreateSavedCaseStudyList();
    const itemsAll = this._getFromStorage('saved_case_study_items', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const items = itemsAll
      .filter((it) => it.savedCaseStudyListId === list.id)
      .map((it) => {
        const cs = caseStudies.find((c) => c.id === it.caseStudyId) || null;
        return {
          savedCaseStudyItemId: it.id,
          caseStudyId: it.caseStudyId,
          title: cs ? cs.title : it.caseStudyTitleSnapshot,
          savedAt: it.savedAt,
          caseStudy: cs // foreign key resolution
        };
      });

    return {
      savedCaseStudyListId: list.id,
      savedCaseStudyList: list, // foreign key resolution
      items: items
    };
  }

  // ---------------------- About page & Contact ----------------------

  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', {
      mission: '',
      history: '',
      differentiators: [],
      supportedAgenciesSummary: '',
      leadershipProfiles: []
    });
    return about;
  }

  submitContactRequest(name, email, company, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('cr');
    const now = new Date().toISOString();

    const record = {
      id: id,
      name: name,
      email: email,
      company: company || '',
      message: message,
      createdAt: now
    };

    requests.push(record);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      confirmationMessage: 'Your message has been sent.'
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
