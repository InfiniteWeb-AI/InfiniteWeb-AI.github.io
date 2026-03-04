const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const tableKeys = [
      'consulting_offerings',
      'consultation_bookings',
      'proposal_requests',
      'case_studies',
      'blog_posts',
      'saved_items',
      'ai_readiness_questions',
      'ai_readiness_options',
      'ai_readiness_assessment_sessions',
      'events',
      'event_registrations',
      'project_estimates',
      'training_programs',
      'training_booking_requests',
      'contact_forms'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
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
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const raw = localStorage.getItem('idCounter');
    let current = parseInt(raw || '1000', 10);
    if (isNaN(current)) current = 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _getCurrentDateTimeUtc() {
    return new Date().toISOString();
  }

  // -------------------- Internal helpers --------------------

  _resolveSlugToId(storageKey, slug) {
    if (!slug) return null;
    const items = this._getFromStorage(storageKey);
    const found = items.find(function (item) {
      return item.slug === slug;
    });
    return found ? found.id : null;
  }

  _calculateConsultationEndTime(scheduledStartIso, durationMinutes) {
    if (!scheduledStartIso || !durationMinutes) return null;
    const start = new Date(scheduledStartIso);
    if (isNaN(start.getTime())) return null;
    const endMs = start.getTime() + durationMinutes * 60000;
    return new Date(endMs).toISOString();
  }

  _getOrCreateSavedItemsStore() {
    let items = this._getFromStorage('saved_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('saved_items', items);
    }
    return items;
  }

  _calculateAIReadinessScoreAndLevel(selectedOptions) {
    if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return { overallScore: 0, readinessLevel: 'low' };
    }
    let total = 0;
    for (let i = 0; i < selectedOptions.length; i++) {
      const opt = selectedOptions[i];
      const score = typeof opt.score === 'number' ? opt.score : 0;
      total += score;
    }
    const avg = total / selectedOptions.length;
    let level = 'low';
    if (avg >= 4) {
      level = 'high';
    } else if (avg >= 2) {
      level = 'medium';
    }
    return { overallScore: total, readinessLevel: level };
  }

  _determineRecommendedOffering(readinessLevel, selectedOptions) {
    const offerings = this._getFromStorage('consulting_offerings').filter(function (o) {
      return o.status === 'active';
    });
    if (offerings.length === 0) return null;

    function pickCheapest(list) {
      if (!list || list.length === 0) return null;
      let cheapest = null;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (typeof o.price !== 'number') continue;
        if (!cheapest || o.price < cheapest.price) {
          cheapest = o;
        }
      }
      return cheapest || list[0];
    }

    let primaryType = null;
    let secondaryType = null;
    if (readinessLevel === 'low') {
      primaryType = 'ai_assessment';
      secondaryType = 'ai_strategy_service';
    } else if (readinessLevel === 'medium') {
      primaryType = 'ai_strategy_service';
      secondaryType = 'ai_transformation_package';
    } else {
      primaryType = 'ai_transformation_package';
      secondaryType = 'ai_strategy_service';
    }

    const prim = offerings.filter(function (o) {
      return o.offeringType === primaryType;
    });
    let chosen = pickCheapest(prim);
    if (!chosen && secondaryType) {
      const sec = offerings.filter(function (o) {
        return o.offeringType === secondaryType;
      });
      chosen = pickCheapest(sec);
    }
    if (!chosen) {
      chosen = pickCheapest(offerings);
    }
    return chosen ? chosen.id : null;
  }

  _calculateEstimateRange(industry, engagementScope, modules, teamSize, timelineWeeks, budgetMin, budgetMax) {
    if (typeof budgetMin === 'number' && typeof budgetMax === 'number') {
      return {
        estimatedCostMin: budgetMin,
        estimatedCostMax: budgetMax
      };
    }
    const people = typeof teamSize === 'number' ? teamSize : 5;
    const weeks = typeof timelineWeeks === 'number' ? timelineWeeks : 8;
    const baseRatePerPersonPerWeek = 4000;
    const scopeFactor = Array.isArray(engagementScope) ? engagementScope.length : 1;
    const modulesFactor = Array.isArray(modules) ? 1 + modules.length * 0.1 : 1;
    const raw = people * weeks * baseRatePerPersonPerWeek * scopeFactor * modulesFactor;
    const min = Math.round(raw * 0.8);
    const max = Math.round(raw * 1.2);
    return {
      estimatedCostMin: min,
      estimatedCostMax: max
    };
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

  _mapOfferingTypeToServiceType(offeringType) {
    if (offeringType === 'ai_strategy_service' || offeringType === 'ai_transformation_package') {
      return 'ai_strategy_consultation';
    }
    if (offeringType === 'ai_assessment') {
      return 'ai_readiness_review';
    }
    if (offeringType === 'ai_governance_service') {
      return 'ai_governance_consultation';
    }
    if (offeringType === 'workshop_bundle') {
      return 'training_consultation';
    }
    return 'other';
  }

  // -------------------- Interface implementations --------------------
  // Home page

  getHomePageContent() {
    const raw = localStorage.getItem('home_page_content');
    if (raw) {
      try {
        const content = JSON.parse(raw);
        if (content && typeof content === 'object') {
          if (!Array.isArray(content.focusAreas)) content.focusAreas = [];
          if (!Array.isArray(content.primaryCtas)) content.primaryCtas = [];
          return content;
        }
      } catch (e) {}
    }
    return {
      heroTitle: '',
      heroSubtitle: '',
      focusAreas: [],
      primaryCtas: []
    };
  }

  // Case studies & blog teasers

  getFeaturedCaseStudies(maxItems) {
    const all = this._getFromStorage('case_studies').filter(function (c) {
      return c.status === 'published' && !!c.isFeatured;
    });
    all.sort(function (a, b) {
      const da = a.publishDate ? new Date(a.publishDate).getTime() : 0;
      const db = b.publishDate ? new Date(b.publishDate).getTime() : 0;
      return db - da;
    });
    if (typeof maxItems === 'number') {
      return all.slice(0, maxItems);
    }
    return all;
  }

  getRecentBlogPosts(maxItems) {
    const all = this._getFromStorage('blog_posts').filter(function (p) {
      return p.status === 'published';
    });
    all.sort(function (a, b) {
      const da = a.publishDate ? new Date(a.publishDate).getTime() : 0;
      const db = b.publishDate ? new Date(b.publishDate).getTime() : 0;
      return db - da;
    });
    if (typeof maxItems === 'number') {
      return all.slice(0, maxItems);
    }
    return all;
  }

  // Consultation booking

  getConsultationFormOptions() {
    const serviceTypes = [
      {
        value: 'ai_strategy_consultation',
        label: 'AI Strategy Consultation',
        description: 'Discuss AI roadmap, use cases, and value alignment.'
      },
      {
        value: 'ai_readiness_review',
        label: 'AI Readiness Review',
        description: 'Review current data, talent, and technology landscape.'
      },
      {
        value: 'ai_governance_consultation',
        label: 'AI Governance Consultation',
        description: 'Explore responsible AI, risk, and governance frameworks.'
      },
      {
        value: 'training_consultation',
        label: 'Training & Enablement Consultation',
        description: 'Plan AI training programs for your teams.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'General AI advisory conversation.'
      }
    ];

    const durations = [
      { valueMinutes: 30, label: '30 minutes' },
      { valueMinutes: 60, label: '60 minutes' },
      { valueMinutes: 90, label: '90 minutes' }
    ];

    const industries = [
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'financial_services', label: 'Financial Services' },
      { value: 'retail_ecommerce', label: 'Retail & E-commerce' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'public_sector', label: 'Public Sector' },
      { value: 'technology', label: 'Technology' },
      { value: 'other', label: 'Other' }
    ];

    const budgetRanges = [
      {
        value: 'under_10k',
        label: 'Under 10,000',
        min: 0,
        max: 10000,
        currency: 'usd'
      },
      {
        value: '10k_25k',
        label: '10,000–25,000',
        min: 10000,
        max: 25000,
        currency: 'usd'
      },
      {
        value: '25k_50k',
        label: '25,000–50,000',
        min: 25000,
        max: 50000,
        currency: 'usd'
      },
      {
        value: '50k_100k',
        label: '50,000–100,000',
        min: 50000,
        max: 100000,
        currency: 'usd'
      },
      {
        value: 'above_100k',
        label: 'Above 100,000',
        min: 100000,
        max: null,
        currency: 'usd'
      }
    ];

    return { serviceTypes: serviceTypes, durations: durations, industries: industries, budgetRanges: budgetRanges };
  }

  getConsultationPrefill(sourceType, sourceReferenceId) {
    const prefill = {
      serviceType: null,
      durationMinutes: 60,
      industry: null,
      notes: '',
      offeringId: null,
      scheduledStartSuggestion: null
    };

    const src = sourceType || 'direct';

    if (src === 'from_offering' && sourceReferenceId) {
      const offerings = this._getFromStorage('consulting_offerings');
      const offering = offerings.find(function (o) {
        return o.id === sourceReferenceId;
      });
      if (offering) {
        prefill.offeringId = offering.id;
        prefill.serviceType = this._mapOfferingTypeToServiceType(offering.offeringType);
        prefill.notes = 'Consultation regarding ' + (offering.name || 'selected offering');
      }
    } else if (src === 'from_assessment' && sourceReferenceId) {
      const sessions = this._getFromStorage('ai_readiness_assessment_sessions');
      const session = sessions.find(function (s) {
        return s.id === sourceReferenceId;
      });
      if (session && session.recommendedOfferingId) {
        const offerings = this._getFromStorage('consulting_offerings');
        const offering = offerings.find(function (o) {
          return o.id === session.recommendedOfferingId;
        });
        if (offering) {
          prefill.offeringId = offering.id;
          prefill.serviceType = this._mapOfferingTypeToServiceType(offering.offeringType);
          prefill.notes = 'Follow-up consultation based on AI readiness assessment results.';
        }
      }
    } else if (src === 'from_event' && sourceReferenceId) {
      const events = this._getFromStorage('events');
      const event = events.find(function (e) {
        return e.id === sourceReferenceId;
      });
      if (event) {
        prefill.scheduledStartSuggestion = event.startDateTime || null;
        if (event.topicCategory === 'training') {
          prefill.serviceType = 'training_consultation';
        } else {
          prefill.serviceType = 'ai_strategy_consultation';
        }
        prefill.notes = 'Follow-up from event: ' + (event.title || 'webinar');
      }
    }

    return prefill;
  }

  submitConsultationBooking(
    serviceType,
    durationMinutes,
    industry,
    scheduledStart,
    participantsCount,
    budgetRange,
    contactName,
    contactEmail,
    companyName,
    notes,
    offeringId,
    sourceType,
    sourceReferenceId
  ) {
    const bookings = this._getFromStorage('consultation_bookings');
    const id = this._generateId('consultation');
    const scheduledEnd = this._calculateConsultationEndTime(scheduledStart, durationMinutes);

    const booking = {
      id: id,
      serviceType: serviceType,
      offeringId: offeringId || null,
      durationMinutes: durationMinutes,
      industry: industry,
      scheduledStart: scheduledStart,
      scheduledEnd: scheduledEnd,
      participantsCount: typeof participantsCount === 'number' ? participantsCount : null,
      budgetRange: budgetRange || null,
      contactName: contactName,
      contactEmail: contactEmail,
      companyName: companyName || null,
      notes: notes || null,
      sourceType: sourceType || 'direct',
      sourceReferenceId: sourceReferenceId || null,
      status: 'submitted',
      createdAt: this._getCurrentDateTimeUtc()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return { success: true, booking: booking, message: 'Consultation booking submitted.' };
  }

  // Consulting packages / offerings

  getConsultingPackageFilterOptions() {
    const companySizeSegments = [
      { value: 'startup', label: 'Startup (1–50 employees)', minEmployees: 1, maxEmployees: 50 },
      { value: 'small', label: 'Small (51–100 employees)', minEmployees: 51, maxEmployees: 100 },
      { value: 'mid_size', label: 'Mid-size (101–500 employees)', minEmployees: 101, maxEmployees: 500 },
      { value: 'enterprise', label: 'Enterprise (501+ employees)', minEmployees: 501, maxEmployees: null },
      { value: 'all_sizes', label: 'All sizes', minEmployees: null, maxEmployees: null }
    ];

    const budgetRanges = [
      { label: 'Up to 10,000', minPrice: 0, maxPrice: 10000, currency: 'usd' },
      { label: '10,000–25,000', minPrice: 10000, maxPrice: 25000, currency: 'usd' },
      { label: '25,000–50,000', minPrice: 25000, maxPrice: 50000, currency: 'usd' },
      { label: '50,000–100,000', minPrice: 50000, maxPrice: 100000, currency: 'usd' },
      { label: 'Above 100,000', minPrice: 100000, maxPrice: null, currency: 'usd' }
    ];

    const offeringTypes = [
      { value: 'ai_transformation_package', label: 'AI Transformation Package' },
      { value: 'ai_strategy_service', label: 'AI Strategy Service' },
      { value: 'ai_assessment', label: 'AI Assessment' },
      { value: 'ai_governance_service', label: 'AI Governance Service' },
      { value: 'workshop_bundle', label: 'Workshop Bundle' },
      { value: 'other', label: 'Other' }
    ];

    return {
      companySizeSegments: companySizeSegments,
      budgetRanges: budgetRanges,
      offeringTypes: offeringTypes
    };
  }

  searchConsultingOfferings(
    targetCompanySizeSegment,
    minEmployees,
    maxEmployees,
    minPrice,
    maxPrice,
    currency,
    offeringType,
    includesWorkshops,
    minWorkshopsCount,
    status,
    sortBy
  ) {
    let offerings = this._getFromStorage('consulting_offerings');

    const desiredStatus = status || 'active';
    offerings = offerings.filter(function (o) {
      return !desiredStatus || o.status === desiredStatus;
    });

    if (targetCompanySizeSegment) {
      offerings = offerings.filter(function (o) {
        return o.targetCompanySizeSegment === targetCompanySizeSegment;
      });
    }

    if (typeof minEmployees === 'number') {
      offerings = offerings.filter(function (o) {
        if (typeof o.maxEmployees === 'number') {
          return o.maxEmployees >= minEmployees;
        }
        return true;
      });
    }

    if (typeof maxEmployees === 'number') {
      offerings = offerings.filter(function (o) {
        if (typeof o.minEmployees === 'number') {
          return o.minEmployees <= maxEmployees;
        }
        return true;
      });
    }

    if (typeof minPrice === 'number') {
      offerings = offerings.filter(function (o) {
        return typeof o.price === 'number' ? o.price >= minPrice : false;
      });
    }

    if (typeof maxPrice === 'number') {
      offerings = offerings.filter(function (o) {
        return typeof o.price === 'number' ? o.price <= maxPrice : false;
      });
    }

    if (currency) {
      offerings = offerings.filter(function (o) {
        return !o.currency || o.currency === currency;
      });
    }

    if (offeringType) {
      offerings = offerings.filter(function (o) {
        return o.offeringType === offeringType;
      });
    }

    if (typeof includesWorkshops === 'boolean') {
      offerings = offerings.filter(function (o) {
        return !!o.includesWorkshops === includesWorkshops;
      });
    }

    if (typeof minWorkshopsCount === 'number') {
      offerings = offerings.filter(function (o) {
        return typeof o.workshopsCount === 'number' ? o.workshopsCount >= minWorkshopsCount : false;
      });
    }

    if (sortBy === 'price_asc') {
      offerings.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : Number.MAX_VALUE;
        const pb = typeof b.price === 'number' ? b.price : Number.MAX_VALUE;
        return pa - pb;
      });
    } else if (sortBy === 'price_desc') {
      offerings.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sortBy === 'featured') {
      offerings.sort(function (a, b) {
        const fa = a.isFeatured ? 1 : 0;
        const fb = b.isFeatured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortBy === 'name_asc') {
      offerings.sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return { results: offerings, totalCount: offerings.length };
  }

  getOfferingDetail(slug, offeringId) {
    const offerings = this._getFromStorage('consulting_offerings');
    let offering = null;
    if (offeringId) {
      offering = offerings.find(function (o) {
        return o.id === offeringId;
      });
    } else if (slug) {
      offering = offerings.find(function (o) {
        return o.slug === slug;
      });
    }
    return offering || null;
  }

  getProposalRequestPrefill(offeringId, estimateId) {
    const result = {
      offeringId: null,
      offeringName: null,
      estimateId: null,
      estimateSummary: null,
      suggestedDesiredStartDate: null
    };

    if (offeringId) {
      const offerings = this._getFromStorage('consulting_offerings');
      const offering = offerings.find(function (o) {
        return o.id === offeringId;
      });
      if (offering) {
        result.offeringId = offering.id;
        result.offeringName = offering.name || null;
      }
    }

    if (estimateId) {
      const estimates = this._getFromStorage('project_estimates');
      const estimate = estimates.find(function (e) {
        return e.id === estimateId;
      });
      if (estimate) {
        result.estimateId = estimate.id;
        result.estimateSummary = estimate.summary || null;
      }
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const suggested = new Date(Date.UTC(nextYear, nextMonth, 1));
    result.suggestedDesiredStartDate = suggested.toISOString();

    return result;
  }

  submitProposalRequest(
    offeringId,
    offeringName,
    estimateId,
    companySizeEmployees,
    desiredStartDate,
    contactName,
    contactEmail,
    companyName,
    projectDescription,
    sourceType
  ) {
    const requests = this._getFromStorage('proposal_requests');
    const id = this._generateId('proposal');

    const request = {
      id: id,
      offeringId: offeringId || null,
      offeringName: offeringName || null,
      estimateId: estimateId || null,
      companySizeEmployees: typeof companySizeEmployees === 'number' ? companySizeEmployees : null,
      desiredStartDate: desiredStartDate || null,
      contactName: contactName,
      contactEmail: contactEmail,
      companyName: companyName || null,
      projectDescription: projectDescription || null,
      sourceType: sourceType || 'from_plans',
      status: 'submitted',
      createdAt: this._getCurrentDateTimeUtc()
    };

    requests.push(request);
    this._saveToStorage('proposal_requests', requests);

    return { success: true, proposalRequest: request, message: 'Proposal request submitted.' };
  }

  // Case studies & reading list

  getCaseStudyFilterOptions() {
    const industries = [
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'financial_services', label: 'Financial Services' },
      { value: 'retail_ecommerce', label: 'Retail & E-commerce' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'public_sector', label: 'Public Sector' },
      { value: 'technology', label: 'Technology' },
      { value: 'other', label: 'Other' }
    ];

    const caseStudies = this._getFromStorage('case_studies');
    const years = [];
    for (let i = 0; i < caseStudies.length; i++) {
      const y = caseStudies[i].year;
      if (typeof y === 'number') years.push(y);
    }
    let minYear = null;
    let maxYear = null;
    if (years.length > 0) {
      minYear = Math.min.apply(null, years);
      maxYear = Math.max.apply(null, years);
    }

    const roiThresholds = [10, 20, 30, 40, 50, 100];

    const durationCategories = [
      { value: 'under_3_months', label: 'Under 3 months' },
      { value: '3_6_months', label: '3–6 months' },
      { value: '6_12_months', label: '6–12 months' },
      { value: 'over_12_months', label: 'Over 12 months' }
    ];

    return {
      industries: industries,
      yearRange: { minYear: minYear, maxYear: maxYear },
      roiThresholds: roiThresholds,
      durationCategories: durationCategories
    };
  }

  searchCaseStudies(
    industry,
    yearFrom,
    yearTo,
    minRoiPercent,
    projectDurationCategory,
    textQuery,
    sortBy
  ) {
    let studies = this._getFromStorage('case_studies').filter(function (c) {
      return c.status === 'published';
    });

    if (industry) {
      studies = studies.filter(function (c) {
        return c.industry === industry;
      });
    }

    if (typeof yearFrom === 'number') {
      studies = studies.filter(function (c) {
        return typeof c.year === 'number' ? c.year >= yearFrom : false;
      });
    }

    if (typeof yearTo === 'number') {
      studies = studies.filter(function (c) {
        return typeof c.year === 'number' ? c.year <= yearTo : false;
      });
    }

    if (typeof minRoiPercent === 'number') {
      studies = studies.filter(function (c) {
        const r = typeof c.roiPercent === 'number' ? c.roiPercent : 0;
        return r >= minRoiPercent;
      });
    }

    if (projectDurationCategory) {
      studies = studies.filter(function (c) {
        return c.projectDurationCategory === projectDurationCategory;
      });
    }

    if (textQuery) {
      const q = textQuery.toLowerCase();
      studies = studies.filter(function (c) {
        const title = (c.title || '').toLowerCase();
        const summary = (c.summary || '').toLowerCase();
        const body = (c.body || '').toLowerCase();
        return title.indexOf(q) !== -1 || summary.indexOf(q) !== -1 || body.indexOf(q) !== -1;
      });
    }

    if (sortBy === 'newest') {
      studies.sort(function (a, b) {
        const da = a.publishDate ? new Date(a.publishDate).getTime() : 0;
        const db = b.publishDate ? new Date(b.publishDate).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === 'roi_desc') {
      studies.sort(function (a, b) {
        const ra = typeof a.roiPercent === 'number' ? a.roiPercent : 0;
        const rb = typeof b.roiPercent === 'number' ? b.roiPercent : 0;
        return rb - ra;
      });
    }

    const savedItems = this._getOrCreateSavedItemsStore().filter(function (s) {
      return s.listType === 'reading_list' && s.contentType === 'case_study';
    });

    const results = studies.map(function (c) {
      const isSaved = savedItems.some(function (s) {
        return s.contentId === c.id;
      });
      return { caseStudy: c, isSavedToReadingList: isSaved };
    });

    return { results: results, totalCount: results.length };
  }

  getContentDetail(contentType, slug, contentId) {
    const type = contentType === 'blog_post' ? 'blog_post' : 'case_study';
    let caseStudy = null;
    let blogPost = null;

    if (type === 'case_study') {
      let items = this._getFromStorage('case_studies');
      if (contentId) {
        caseStudy = items.find(function (c) {
          return c.id === contentId;
        }) || null;
      } else if (slug) {
        caseStudy = items.find(function (c) {
          return c.slug === slug;
        }) || null;
      }
    } else {
      let items = this._getFromStorage('blog_posts');
      if (contentId) {
        blogPost = items.find(function (b) {
          return b.id === contentId;
        }) || null;
      } else if (slug) {
        blogPost = items.find(function (b) {
          return b.slug === slug;
        }) || null;
      }
    }

    const savedItems = this._getOrCreateSavedItemsStore();

    let isSavedToReadingList = false;
    let isSavedToReadingQueue = false;

    if (caseStudy) {
      isSavedToReadingList = savedItems.some(function (s) {
        return s.listType === 'reading_list' && s.contentType === 'case_study' && s.contentId === caseStudy.id;
      });
    }

    if (blogPost) {
      isSavedToReadingQueue = savedItems.some(function (s) {
        return s.listType === 'reading_queue' && s.contentType === 'blog_post' && s.contentId === blogPost.id;
      });
    }

    return {
      contentType: type,
      caseStudy: caseStudy,
      blogPost: blogPost,
      isSavedToReadingList: isSavedToReadingList,
      isSavedToReadingQueue: isSavedToReadingQueue
    };
  }

  saveCaseStudyToReadingList(caseStudyId, notes) {
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find(function (c) {
      return c.id === caseStudyId;
    });
    if (!cs) {
      return { success: false, savedItem: null, message: 'Case study not found.' };
    }

    let savedItems = this._getOrCreateSavedItemsStore();
    const existing = savedItems.find(function (s) {
      return s.listType === 'reading_list' && s.contentType === 'case_study' && s.contentId === caseStudyId;
    });

    if (existing) {
      existing.notes = notes || existing.notes || null;
      existing.savedAt = this._getCurrentDateTimeUtc();
      this._saveToStorage('saved_items', savedItems);
      return { success: true, savedItem: existing, message: 'Case study already in reading list; updated notes.' };
    }

    const savedItem = {
      id: this._generateId('saved'),
      contentId: caseStudyId,
      contentType: 'case_study',
      listType: 'reading_list',
      titleSnapshot: cs.title || null,
      summarySnapshot: cs.summary || null,
      sourcePage: 'case_studies',
      savedAt: this._getCurrentDateTimeUtc(),
      notes: notes || null
    };

    savedItems.push(savedItem);
    this._saveToStorage('saved_items', savedItems);

    return { success: true, savedItem: savedItem, message: 'Case study added to reading list.' };
  }

  saveBlogPostToReadingQueue(blogPostId, notes) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find(function (b) {
      return b.id === blogPostId;
    });
    if (!post) {
      return { success: false, savedItem: null, message: 'Blog post not found.' };
    }

    let savedItems = this._getOrCreateSavedItemsStore();
    const existing = savedItems.find(function (s) {
      return s.listType === 'reading_queue' && s.contentType === 'blog_post' && s.contentId === blogPostId;
    });

    if (existing) {
      existing.notes = notes || existing.notes || null;
      existing.savedAt = this._getCurrentDateTimeUtc();
      this._saveToStorage('saved_items', savedItems);
      return { success: true, savedItem: existing, message: 'Blog post already in reading queue; updated notes.' };
    }

    const savedItem = {
      id: this._generateId('saved'),
      contentId: blogPostId,
      contentType: 'blog_post',
      listType: 'reading_queue',
      titleSnapshot: post.title || null,
      summarySnapshot: post.summary || null,
      sourcePage: 'blog',
      savedAt: this._getCurrentDateTimeUtc(),
      notes: notes || null
    };

    savedItems.push(savedItem);
    this._saveToStorage('saved_items', savedItems);

    return { success: true, savedItem: savedItem, message: 'Blog post added to reading queue.' };
  }

  getSavedItems(listType) {
    let savedItems = this._getOrCreateSavedItemsStore();
    if (listType) {
      savedItems = savedItems.filter(function (s) {
        return s.listType === listType;
      });
    }

    const caseStudies = this._getFromStorage('case_studies');
    const blogPosts = this._getFromStorage('blog_posts');

    return savedItems.map(function (item) {
      let content = null;
      if (item.contentType === 'case_study') {
        content = caseStudies.find(function (c) {
          return c.id === item.contentId;
        }) || null;
      } else if (item.contentType === 'blog_post') {
        content = blogPosts.find(function (b) {
          return b.id === item.contentId;
        }) || null;
      }
      const expanded = {};
      for (const k in item) {
        if (Object.prototype.hasOwnProperty.call(item, k)) {
          expanded[k] = item[k];
        }
      }
      expanded.content = content;
      return expanded;
    });
  }

  removeSavedItem(savedItemId) {
    let savedItems = this._getOrCreateSavedItemsStore();
    const before = savedItems.length;
    savedItems = savedItems.filter(function (s) {
      return s.id !== savedItemId;
    });
    this._saveToStorage('saved_items', savedItems);
    const removed = before !== savedItems.length;
    return { success: removed, message: removed ? 'Saved item removed.' : 'Saved item not found.' };
  }

  // AI Readiness Assessment

  getAIReadinessQuestions() {
    const questionsRaw = this._getFromStorage('ai_readiness_questions').filter(function (q) {
      return q.isActive;
    });
    questionsRaw.sort(function (a, b) {
      return a.order - b.order;
    });

    const optionsRaw = this._getFromStorage('ai_readiness_options');

    const grouped = questionsRaw.map(function (q) {
      const opts = optionsRaw
        .filter(function (o) {
          return o.questionId === q.id;
        })
        .sort(function (a, b) {
          const ao = typeof a.order === 'number' ? a.order : 0;
          const bo = typeof b.order === 'number' ? b.order : 0;
          return ao - bo;
        });
      return { question: q, options: opts };
    });

    return { questions: grouped };
  }

  submitAIReadinessAssessment(answerOptionIds) {
    const allOptions = this._getFromStorage('ai_readiness_options');
    const selectedOptions = [];
    const selectedIds = [];

    if (Array.isArray(answerOptionIds)) {
      for (let i = 0; i < answerOptionIds.length; i++) {
        const id = answerOptionIds[i];
        const opt = allOptions.find(function (o) {
          return o.id === id;
        });
        if (opt) {
          selectedOptions.push(opt);
          selectedIds.push(opt.id);
        }
      }
    }

    const scoreInfo = this._calculateAIReadinessScoreAndLevel(selectedOptions);
    const recommendedOfferingId = this._determineRecommendedOffering(scoreInfo.readinessLevel, selectedOptions);

    const sessions = this._getFromStorage('ai_readiness_assessment_sessions');
    const session = {
      id: this._generateId('assessment'),
      answerOptionIds: selectedIds,
      overallScore: scoreInfo.overallScore,
      readinessLevel: scoreInfo.readinessLevel,
      recommendedOfferingId: recommendedOfferingId || null,
      createdAt: this._getCurrentDateTimeUtc()
    };

    sessions.push(session);
    this._saveToStorage('ai_readiness_assessment_sessions', sessions);

    let recommendedOffering = null;
    if (recommendedOfferingId) {
      const offerings = this._getFromStorage('consulting_offerings');
      recommendedOffering = offerings.find(function (o) {
        return o.id === recommendedOfferingId;
      }) || null;
    }

    return {
      success: true,
      assessmentSession: session,
      recommendedOffering: recommendedOffering
    };
  }

  // Events & Webinars

  getEventFilterOptions() {
    const dateRanges = [
      { key: 'upcoming', label: 'All upcoming' },
      { key: 'this_month', label: 'This month' },
      { key: 'next_month', label: 'Next month' }
    ];

    const topicCategories = [
      { value: 'marketing', label: 'Marketing' },
      { value: 'genai_for_marketing', label: 'GenAI for Marketing' },
      { value: 'ai_governance', label: 'AI Governance' },
      { value: 'ai_strategy', label: 'AI Strategy' },
      { value: 'training', label: 'Training' },
      { value: 'other', label: 'Other' }
    ];

    const timeOfDaySlots = [
      { key: '09_12', label: '09:00–12:00', startTime: '09:00', endTime: '12:00' },
      { key: '11_15', label: '11:00–15:00', startTime: '11:00', endTime: '15:00' },
      { key: '13_17', label: '13:00–17:00', startTime: '13:00', endTime: '17:00' }
    ];

    return {
      dateRanges: dateRanges,
      topicCategories: topicCategories,
      timeOfDaySlots: timeOfDaySlots
    };
  }

  searchEvents(
    dateRangeKey,
    startDate,
    endDate,
    topicCategory,
    textQuery,
    timeOfDayFrom,
    timeOfDayTo
  ) {
    let events = this._getFromStorage('events').filter(function (e) {
      return e.status === 'upcoming';
    });

    let rangeStart = null;
    let rangeEnd = null;

    if (dateRangeKey === 'this_month' || dateRangeKey === 'next_month' || dateRangeKey === 'upcoming') {
      let now = new Date();
      try {
        const metaRaw = localStorage.getItem('_metadata');
        if (metaRaw) {
          const meta = JSON.parse(metaRaw);
          if (meta && meta.baselineDate) {
            const baseline = new Date(meta.baselineDate);
            if (!isNaN(baseline.getTime())) {
              now = baseline;
            }
          }
        }
      } catch (e) {}
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      if (dateRangeKey === 'upcoming') {
        rangeStart = now;
      } else if (dateRangeKey === 'this_month') {
        rangeStart = new Date(Date.UTC(year, month, 1));
        rangeEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      } else if (dateRangeKey === 'next_month') {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        rangeStart = new Date(Date.UTC(nextYear, nextMonth, 1));
        rangeEnd = new Date(Date.UTC(nextYear, nextMonth + 1, 0, 23, 59, 59));
      }
    }

    if (startDate) {
      rangeStart = new Date(startDate);
    }
    if (endDate) {
      rangeEnd = new Date(endDate);
    }

    if (rangeStart) {
      const fromTime = rangeStart.getTime();
      events = events.filter(function (e) {
        const t = new Date(e.startDateTime).getTime();
        return t >= fromTime;
      });
    }

    if (rangeEnd) {
      const toTime = rangeEnd.getTime();
      events = events.filter(function (e) {
        const t = new Date(e.startDateTime).getTime();
        return t <= toTime;
      });
    }

    if (topicCategory) {
      events = events.filter(function (e) {
        return e.topicCategory === topicCategory;
      });
    }

    if (textQuery) {
      const q = textQuery.toLowerCase();
      events = events.filter(function (e) {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    const fromMinutes = this._timeToMinutes(timeOfDayFrom);
    const toMinutes = this._timeToMinutes(timeOfDayTo);

    if (fromMinutes !== null || toMinutes !== null) {
      events = events.filter(
        function (e) {
          const d = new Date(e.startDateTime);
          if (isNaN(d.getTime())) return false;
          const mins = d.getHours() * 60 + d.getMinutes();
          if (fromMinutes !== null && mins < fromMinutes) return false;
          if (toMinutes !== null && mins > toMinutes) return false;
          return true;
        }.bind(this)
      );
    }

    events.sort(function (a, b) {
      const ta = new Date(a.startDateTime).getTime();
      const tb = new Date(b.startDateTime).getTime();
      return ta - tb;
    });

    return { results: events, totalCount: events.length };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(function (e) {
      return e.id === eventId;
    });
    return event || null;
  }

  submitEventRegistration(
    eventId,
    attendeeName,
    attendeeEmail,
    attendeeRoleTitle,
    attendeeCompany,
    receiveUpdates
  ) {
    const registrations = this._getFromStorage('event_registrations');
    const id = this._generateId('ereg');

    const registration = {
      id: id,
      eventId: eventId,
      attendeeName: attendeeName,
      attendeeEmail: attendeeEmail,
      attendeeRoleTitle: attendeeRoleTitle || null,
      attendeeCompany: attendeeCompany || null,
      receiveUpdates: !!receiveUpdates,
      status: 'registered',
      registeredAt: this._getCurrentDateTimeUtc()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return { success: true, registration: registration, message: 'Event registration submitted.' };
  }

  // Project estimator

  getEstimatorConfigOptions() {
    const industries = [
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'financial_services', label: 'Financial Services' },
      { value: 'retail_ecommerce', label: 'Retail & E-commerce' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'public_sector', label: 'Public Sector' },
      { value: 'technology', label: 'Technology' },
      { value: 'other', label: 'Other' }
    ];

    const engagementScopeOptions = [
      { value: 'strategy_roadmap', label: 'Strategy & Roadmap', description: 'Define AI vision, portfolio, and roadmap.' },
      { value: 'implementation', label: 'Implementation', description: 'Design, build, and deploy AI solutions.' },
      { value: 'training', label: 'Training', description: 'Upskill teams on AI concepts and tools.' },
      { value: 'governance', label: 'Governance', description: 'Establish AI governance and risk frameworks.' }
    ];

    const moduleOptions = [
      { value: 'data_audit', label: 'Data Audit', description: 'Assess data quality, availability, and gaps.' },
      { value: 'team_training', label: 'Team Training', description: 'Workshops and enablement for key stakeholders.' },
      { value: 'mlops_setup', label: 'MLOps Setup', description: 'Deployment and monitoring infrastructure.' },
      { value: 'governance_framework', label: 'Governance Framework', description: 'Policies, controls, and oversight model.' },
      { value: 'use_case_prioritization', label: 'Use Case Prioritization', description: 'Identify and prioritize high-value use cases.' }
    ];

    const budgetPresets = [
      { min: 50000, max: 100000, currency: 'usd', label: '50,000–100,000' },
      { min: 100000, max: 250000, currency: 'usd', label: '100,000–250,000' },
      { min: 250000, max: 500000, currency: 'usd', label: '250,000–500,000' }
    ];

    return {
      industries: industries,
      engagementScopeOptions: engagementScopeOptions,
      moduleOptions: moduleOptions,
      budgetPresets: budgetPresets
    };
  }

  createProjectEstimate(
    industry,
    engagementScope,
    modules,
    teamSize,
    timelineWeeks,
    budgetMin,
    budgetMax,
    currency
  ) {
    const estimates = this._getFromStorage('project_estimates');
    const id = this._generateId('estimate');

    const range = this._calculateEstimateRange(
      industry,
      Array.isArray(engagementScope) ? engagementScope : [],
      Array.isArray(modules) ? modules : [],
      teamSize,
      timelineWeeks,
      budgetMin,
      budgetMax
    );

    const summaryParts = [];
    if (industry) summaryParts.push('Industry: ' + industry);
    if (Array.isArray(engagementScope) && engagementScope.length > 0) {
      summaryParts.push('Scope: ' + engagementScope.join(', '));
    }
    if (Array.isArray(modules) && modules.length > 0) {
      summaryParts.push('Modules: ' + modules.join(', '));
    }
    summaryParts.push('Timeline: ' + timelineWeeks + ' weeks');

    const estimate = {
      id: id,
      industry: industry,
      engagementScope: Array.isArray(engagementScope) ? engagementScope : [],
      engagementScopeOptions: null,
      modules: Array.isArray(modules) ? modules : [],
      moduleOptions: null,
      teamSize: teamSize,
      timelineWeeks: timelineWeeks,
      budgetMin: typeof budgetMin === 'number' ? budgetMin : null,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      currency: currency || 'usd',
      estimatedCostMin: range.estimatedCostMin,
      estimatedCostMax: range.estimatedCostMax,
      summary: summaryParts.join(' | '),
      createdAt: this._getCurrentDateTimeUtc()
    };

    estimates.push(estimate);
    this._saveToStorage('project_estimates', estimates);

    return { success: true, estimate: estimate, message: 'Project estimate created.' };
  }

  // Blog / Insights

  getBlogFilterOptions() {
    const dateRangeOptions = [
      { key: 'last_3_months', label: 'Last 3 months' },
      { key: 'last_12_months', label: 'Last 12 months' }
    ];

    const topicCategories = [
      { value: 'governance_ethics', label: 'Governance & Ethics' },
      { value: 'ai_strategy', label: 'AI Strategy' },
      { value: 'genai', label: 'Generative AI' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'genai_marketing', label: 'GenAI for Marketing' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' }
    ];

    return {
      dateRangeOptions: dateRangeOptions,
      topicCategories: topicCategories,
      sortOptions: sortOptions
    };
  }

  searchBlogPosts(
    query,
    dateRangeKey,
    fromDate,
    toDate,
    topicCategory,
    sortBy,
    maxReadTimeMinutes
  ) {
    let posts = this._getFromStorage('blog_posts').filter(function (p) {
      return p.status === 'published';
    });

    let rangeStart = null;
    let rangeEnd = null;

    if (dateRangeKey === 'last_3_months' || dateRangeKey === 'last_12_months') {
      let now = new Date();
      try {
        const metaRaw = localStorage.getItem('_metadata');
        if (metaRaw) {
          const meta = JSON.parse(metaRaw);
          if (meta && meta.baselineDate) {
            const baseline = new Date(meta.baselineDate);
            if (!isNaN(baseline.getTime())) {
              now = baseline;
            }
          }
        }
      } catch (e) {}
      const monthsBack = dateRangeKey === 'last_3_months' ? 3 : 12;
      const start = new Date(now.getTime());
      start.setMonth(start.getMonth() - monthsBack);
      rangeStart = start;
      rangeEnd = now;
    }

    if (fromDate) {
      rangeStart = new Date(fromDate);
    }
    if (toDate) {
      rangeEnd = new Date(toDate);
    }

    if (rangeStart) {
      const fromTime = rangeStart.getTime();
      posts = posts.filter(function (p) {
        const t = new Date(p.publishDate).getTime();
        return t >= fromTime;
      });
    }

    if (rangeEnd) {
      const toTime = rangeEnd.getTime();
      posts = posts.filter(function (p) {
        const t = new Date(p.publishDate).getTime();
        return t <= toTime;
      });
    }

    if (topicCategory) {
      posts = posts.filter(function (p) {
        return p.topicCategory === topicCategory;
      });
    }

    if (typeof maxReadTimeMinutes === 'number') {
      posts = posts.filter(function (p) {
        return typeof p.estimatedReadTimeMinutes === 'number'
          ? p.estimatedReadTimeMinutes <= maxReadTimeMinutes
          : false;
      });
    }

    if (query) {
      const q = query.toLowerCase();
      posts = posts.filter(function (p) {
        const title = (p.title || '').toLowerCase();
        const summary = (p.summary || '').toLowerCase();
        const body = (p.body || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        return (
          title.indexOf(q) !== -1 ||
          summary.indexOf(q) !== -1 ||
          body.indexOf(q) !== -1 ||
          tags.indexOf(q) !== -1
        );
      });
    }

    if (sortBy === 'oldest') {
      posts.sort(function (a, b) {
        const ta = new Date(a.publishDate).getTime();
        const tb = new Date(b.publishDate).getTime();
        return ta - tb;
      });
    } else {
      posts.sort(function (a, b) {
        const ta = new Date(a.publishDate).getTime();
        const tb = new Date(b.publishDate).getTime();
        return tb - ta;
      });
    }

    const savedItems = this._getOrCreateSavedItemsStore().filter(function (s) {
      return s.listType === 'reading_queue' && s.contentType === 'blog_post';
    });

    const results = posts.map(function (p) {
      const isSaved = savedItems.some(function (s) {
        return s.contentId === p.id;
      });
      return { blogPost: p, isSavedToReadingQueue: isSaved };
    });

    return { results: results, totalCount: results.length };
  }

  // Training programs

  getTrainingProgramFilterOptions() {
    const deliveryFormats = [
      { value: 'remote', label: 'Remote / Virtual' },
      { value: 'in_person', label: 'In-person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const regions = [
      { value: 'europe_emea', label: 'Europe / EMEA' },
      { value: 'north_america', label: 'North America' },
      { value: 'apac', label: 'APAC' },
      { value: 'latam', label: 'LATAM' },
      { value: 'global_online', label: 'Global (online)' },
      { value: 'other', label: 'Other' }
    ];

    const capacityBands = [
      { minParticipants: 1, maxParticipants: 10, label: '1–10 participants' },
      { minParticipants: 11, maxParticipants: 30, label: '11–30 participants' },
      { minParticipants: 31, maxParticipants: 50, label: '31–50 participants' },
      { minParticipants: 51, maxParticipants: 200, label: '51+ participants' }
    ];

    const budgetRanges = [
      { minPrice: 0, maxPrice: 5000, currency: 'usd', label: 'Up to 5,000' },
      { minPrice: 5000, maxPrice: 8000, currency: 'usd', label: '5,000–8,000' },
      { minPrice: 8000, maxPrice: 15000, currency: 'usd', label: '8,000–15,000' }
    ];

    const liveSessionCounts = [1, 2, 3, 4, 5];

    return {
      deliveryFormats: deliveryFormats,
      regions: regions,
      capacityBands: capacityBands,
      budgetRanges: budgetRanges,
      liveSessionCounts: liveSessionCounts
    };
  }

  searchTrainingPrograms(
    deliveryFormat,
    region,
    minParticipants,
    maxParticipants,
    maxPrice,
    currency,
    minLiveSessions,
    sortBy
  ) {
    let programs = this._getFromStorage('training_programs').filter(function (p) {
      return p.status === 'active';
    });

    if (deliveryFormat) {
      programs = programs.filter(function (p) {
        return p.deliveryFormat === deliveryFormat;
      });
    }

    if (region) {
      programs = programs.filter(function (p) {
        return !p.region || p.region === region;
      });
    }

    if (typeof minParticipants === 'number') {
      programs = programs.filter(function (p) {
        if (typeof p.maxParticipants === 'number') {
          return p.maxParticipants >= minParticipants;
        }
        return true;
      });
    }

    if (typeof maxParticipants === 'number') {
      programs = programs.filter(function (p) {
        if (typeof p.minParticipants === 'number') {
          return p.minParticipants <= maxParticipants;
        }
        return true;
      });
    }

    if (typeof maxPrice === 'number') {
      programs = programs.filter(function (p) {
        return typeof p.price === 'number' ? p.price <= maxPrice : false;
      });
    }

    if (currency) {
      programs = programs.filter(function (p) {
        return p.currency === currency;
      });
    }

    if (typeof minLiveSessions === 'number') {
      programs = programs.filter(function (p) {
        return typeof p.liveSessionsCount === 'number' ? p.liveSessionsCount >= minLiveSessions : false;
      });
    }

    if (sortBy === 'price_desc') {
      programs.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sortBy === 'price_asc') {
      programs.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : Number.MAX_VALUE;
        const pb = typeof b.price === 'number' ? b.price : Number.MAX_VALUE;
        return pa - pb;
      });
    }

    return { results: programs, totalCount: programs.length };
  }

  getTrainingProgramDetail(trainingProgramId) {
    const programs = this._getFromStorage('training_programs');
    const program = programs.find(function (p) {
      return p.id === trainingProgramId;
    });
    return program || null;
  }

  submitTrainingBookingRequest(
    trainingProgramId,
    contactName,
    contactEmail,
    companyName,
    participantsCount,
    desiredStartDate,
    notes,
    regionPreference
  ) {
    const bookings = this._getFromStorage('training_booking_requests');
    const id = this._generateId('tbook');

    const bookingRequest = {
      id: id,
      trainingProgramId: trainingProgramId,
      contactName: contactName,
      contactEmail: contactEmail,
      companyName: companyName || null,
      participantsCount: typeof participantsCount === 'number' ? participantsCount : null,
      desiredStartDate: desiredStartDate || null,
      notes: notes || null,
      regionPreference: regionPreference || null,
      status: 'submitted',
      createdAt: this._getCurrentDateTimeUtc()
    };

    bookings.push(bookingRequest);
    this._saveToStorage('training_booking_requests', bookings);

    return { success: true, bookingRequest: bookingRequest, message: 'Training booking request submitted.' };
  }

  // About & Contact & Privacy

  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        const content = JSON.parse(raw);
        if (content && typeof content === 'object') {
          if (!Array.isArray(content.values)) content.values = [];
          if (!Array.isArray(content.industriesServed)) content.industriesServed = [];
          if (!Array.isArray(content.certificationsAndPartnerships)) content.certificationsAndPartnerships = [];
          if (!Array.isArray(content.notableAchievements)) content.notableAchievements = [];
          return content;
        }
      } catch (e) {}
    }
    return {
      mission: '',
      values: [],
      teamSummary: '',
      industriesServed: [],
      certificationsAndPartnerships: [],
      notableAchievements: []
    };
  }

  submitContactForm(name, email, company, message, topic) {
    const forms = this._getFromStorage('contact_forms');
    const id = this._generateId('contact');
    const record = {
      id: id,
      name: name,
      email: email,
      company: company || null,
      message: message,
      topic: topic || 'general',
      createdAt: this._getCurrentDateTimeUtc()
    };
    forms.push(record);
    this._saveToStorage('contact_forms', forms);
    return {
      success: true,
      message: 'Contact form submitted.',
      ticketId: id
    };
  }

  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        const policy = JSON.parse(raw);
        if (policy && typeof policy === 'object') {
          if (!Array.isArray(policy.sections)) policy.sections = [];
          return policy;
        }
      } catch (e) {}
    }
    return {
      lastUpdated: this._getCurrentDateTimeUtc(),
      sections: []
    };
  }
}

if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
