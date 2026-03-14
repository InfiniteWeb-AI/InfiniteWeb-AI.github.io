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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = [
      'service_categories',
      'service_packages',
      'quote_requests',
      'project_briefs',
      'case_studies',
      'saved_collections',
      'saved_collection_items',
      'articles',
      'experience_modules',
      'experience_configurations',
      'experience_configuration_modules',
      'events',
      'event_registrations',
      'jobs',
      'job_applications',
      'contact_inquiries',
      'static_pages'
    ];

    for (const key of tables) {
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

  _parseDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _toIsoDate(value) {
    const d = this._parseDate(value);
    return d ? d.toISOString() : null;
  }

  _formatCurrency(amount, currency = 'usd') {
    if (amount == null || isNaN(amount)) return 'Contact us';
    const symbol = currency === 'usd' ? '$' : '';
    const rounded = Math.round(amount);
    return symbol + rounded.toLocaleString('en-US');
  }

  _formatDisplayPrice(servicePackage) {
    if (!servicePackage) return '';
    const price = servicePackage.base_price;
    const type = servicePackage.price_type || 'custom_quote';
    const base = this._formatCurrency(price, 'usd');

    if (type === 'fixed') return base;
    if (type === 'starting_from') return base + '+';
    if (type === 'per_person') return base + ' per person';
    return 'Custom quote';
  }

  _formatParticipantsLabel(servicePackage) {
    if (!servicePackage) return '';
    const min = servicePackage.min_participants;
    const max = servicePackage.max_participants;
    if (min && max) return min + '–' + max + ' participants';
    if (max) return 'Up to ' + max + ' participants';
    if (min) return 'Minimum ' + min + ' participants';
    return '';
  }

  _formatExpectedReachLabel(servicePackage) {
    if (!servicePackage || servicePackage.expected_reach == null) return '';
    const reach = servicePackage.expected_reach;
    if (reach >= 1000000) {
      return (reach / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
    }
    if (reach >= 1000) {
      return Math.round(reach / 1000) + 'K+';
    }
    return reach.toLocaleString('en-US');
  }

  _normalizePriceFilterBounds(maxBudget, globalMin, globalMax) {
    if (maxBudget == null || isNaN(maxBudget)) {
      return { maxBudget: globalMax };
    }
    let normalized = maxBudget;
    if (globalMin != null && normalized < globalMin) normalized = globalMin;
    if (globalMax != null && normalized > globalMax) normalized = globalMax;
    return { maxBudget: normalized };
  }

  _ensureDateWithinRange(dateStr, minDateStr, maxDateStr) {
    const date = this._parseDate(dateStr);
    if (!date) return null;
    const min = this._parseDate(minDateStr);
    const max = this._parseDate(maxDateStr);

    let clamped = date;
    if (min && clamped < min) clamped = min;
    if (max && clamped > max) clamped = max;
    return clamped.toISOString();
  }

  _getServiceCategoryBySlug(slug) {
    const categories = this._getFromStorage('service_categories');
    return categories.find(function (c) { return c.slug === slug; }) || null;
  }

  // ----------------------
  // Foreign key hydration helpers
  // ----------------------

  _hydrateServicePackage(sp) {
    if (!sp) return null;
    const categories = this._getFromStorage('service_categories');
    const category = categories.find(function (c) { return c.id === sp.service_category_id; }) || null;
    return Object.assign({}, sp, {
      service_category: category
    });
  }

  _hydrateCaseStudy(cs) {
    if (!cs) return null;
    const categories = this._getFromStorage('service_categories');
    const related = cs.related_service_category_id
      ? (categories.find(function (c) { return c.id === cs.related_service_category_id; }) || null)
      : null;
    return Object.assign({}, cs, {
      related_service_category: related
    });
  }

  _hydrateExperienceConfiguration(ec) {
    if (!ec) return null;
    const categories = this._getFromStorage('service_categories');
    const sc = categories.find(function (c) { return c.id === ec.service_category_id; }) || null;
    return Object.assign({}, ec, {
      service_category: sc
    });
  }

  _hydrateExperienceConfigurationModule(ecm) {
    if (!ecm) return null;
    const configs = this._getFromStorage('experience_configurations');
    const modules = this._getFromStorage('experience_modules');
    const config = ecm.experience_configuration_id
      ? (configs.find(function (c) { return c.id === ecm.experience_configuration_id; }) || null)
      : null;
    const module = modules.find(function (m) { return m.id === ecm.experience_module_id; }) || null;
    return Object.assign({}, ecm, {
      experience_configuration: config,
      experience_module: module
    });
  }

  _hydrateSavedCollectionItem(item) {
    if (!item) return null;
    const collections = this._getFromStorage('saved_collections');
    const caseStudies = this._getFromStorage('case_studies');
    const articles = this._getFromStorage('articles');

    const collection = collections.find(function (c) { return c.id === item.collection_id; }) || null;

    let fullItem = null;
    if (item.item_type === 'case_study') {
      fullItem = caseStudies.find(function (cs) { return cs.id === item.item_id; }) || null;
      if (fullItem) {
        fullItem = this._hydrateCaseStudy(fullItem);
      }
    } else if (item.item_type === 'article') {
      fullItem = articles.find(function (a) { return a.id === item.item_id; }) || null;
    }

    return Object.assign({}, item, {
      collection: collection,
      item: fullItem
    });
  }

  _hydrateEventRegistration(er) {
    if (!er) return null;
    const events = this._getFromStorage('events');
    const event = events.find(function (e) { return e.id === er.event_id; }) || null;
    return Object.assign({}, er, {
      event: event
    });
  }

  _hydrateJobApplication(ja) {
    if (!ja) return null;
    const jobs = this._getFromStorage('jobs');
    const job = jobs.find(function (j) { return j.id === ja.job_id; }) || null;
    return Object.assign({}, ja, {
      job: job
    });
  }

  _hydrateQuoteRequest(qr) {
    if (!qr) return null;
    const servicePackages = this._getFromStorage('service_packages');
    const configs = this._getFromStorage('experience_configurations');
    const sp = qr.service_package_id
      ? (servicePackages.find(function (p) { return p.id === qr.service_package_id; }) || null)
      : null;
    const ec = qr.experience_configuration_id
      ? (configs.find(function (c) { return c.id === qr.experience_configuration_id; }) || null)
      : null;
    return Object.assign({}, qr, {
      service_package: sp ? this._hydrateServicePackage(sp) : null,
      experience_configuration: ec ? this._hydrateExperienceConfiguration(ec) : null
    });
  }

  _hydrateProjectBrief(pb) {
    if (!pb) return null;
    const servicePackages = this._getFromStorage('service_packages');
    const sp = servicePackages.find(function (p) { return p.id === pb.related_service_package_id; }) || null;
    return Object.assign({}, pb, {
      related_service_package: sp ? this._hydrateServicePackage(sp) : null
    });
  }

  // ----------------------
  // Collection helper
  // ----------------------

  _getOrCreateDefaultCollection(collectionName, collectionTypeFallback) {
    const name = (collectionName || '').trim();
    const norm = name.toLowerCase();
    let collections = this._getFromStorage('saved_collections');

    let existing = collections.find(function (c) {
      return (c.normalized_name || c.name.toLowerCase()) === norm;
    });

    let created = false;
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('col'),
        name: name,
        normalized_name: norm,
        collection_type: collectionTypeFallback || 'mixed',
        description: null,
        created_at: now,
        updated_at: now
      };
      collections.push(existing);
      this._saveToStorage('saved_collections', collections);
      created = true;
    }

    return { collection: existing, createdNewCollection: created };
  }

  // ----------------------
  // Popup estimate helper
  // ----------------------

  _calculatePopupEstimateFromModules(configuration) {
    const modulesDef = this._getFromStorage('experience_modules');
    const audienceMax = configuration && typeof configuration.audienceMax === 'number'
      ? configuration.audienceMax
      : null;

    const selectedModules = (configuration && configuration.modules) || [];
    const moduleBreakdown = [];
    let total = 0;

    for (let i = 0; i < selectedModules.length; i++) {
      const line = selectedModules[i];
      const module = modulesDef.find(function (m) { return m.id === line.experienceModuleId; });
      if (!module) continue;

      const qty = line.quantity && line.quantity > 0 ? line.quantity : 1;
      let base = module.base_price * qty;

      // Simple scaling by audience size: larger audiences cost more
      if (audienceMax && audienceMax > 500) {
        const factor = 1 + (audienceMax - 500) / 5000; // mild scaling
        base = base * factor;
      }

      const linePrice = Math.round(base);
      total += linePrice;

      moduleBreakdown.push({
        id: 'temp_' + i,
        experience_configuration_id: null,
        experience_module_id: module.id,
        quantity: qty,
        custom_label: line.customLabel || null,
        line_price: linePrice
      });
    }

    return {
      estimatedTotal: Math.round(total),
      currency: 'usd',
      moduleBreakdown: moduleBreakdown.map(function (mb) {
        return this._hydrateExperienceConfigurationModule(mb);
      }.bind(this))
    };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const serviceCategories = this._getFromStorage('service_categories');
    const servicePackages = this._getFromStorage('service_packages');
    const caseStudies = this._getFromStorage('case_studies');
    const events = this._getFromStorage('events');
    const now = new Date();

    const activeCategories = serviceCategories.filter(function (c) { return c.is_active; });

    const featuredServiceCategories = activeCategories.slice(0, 3);

    const flagshipServicePackages = servicePackages
      .filter(function (p) { return p.status === 'active' && p.is_featured; })
      .slice(0, 6)
      .map(function (p) { return this._hydrateServicePackage(p); }.bind(this));

    const featuredCaseStudies = caseStudies
      .filter(function (cs) { return cs.is_featured; })
      .sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 6)
      .map(function (cs) { return this._hydrateCaseStudy(cs); }.bind(this));

    const upcomingEvents = events
      .filter(function (e) {
        const d = e.start_datetime ? new Date(e.start_datetime) : null;
        return d && d >= now;
      })
      .sort(function (a, b) {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      })
      .slice(0, 5);

    return {
      hero: {
        headline: 'Immersive XR experiences for training, marketing, and installations',
        subheadline: 'VR, AR, and mixed reality solutions for enterprises and cultural institutions.',
        backgroundImage: '',
        primaryCtas: [
          { label: 'Request a quote', actionType: 'request_quote' },
          { label: 'Explore services', actionType: 'start_project_brief' }
        ]
      },
      featuredServiceCategories: featuredServiceCategories,
      featuredCaseStudies: featuredCaseStudies,
      flagshipServicePackages: flagshipServicePackages,
      upcomingEvents: upcomingEvents
    };
  }

  // getServicesOverview()
  getServicesOverview() {
    const serviceCategories = this._getFromStorage('service_categories').filter(function (c) {
      return c.is_active;
    });
    const servicePackages = this._getFromStorage('service_packages');

    const popularServicePackages = servicePackages
      .filter(function (p) { return p.status === 'active' && p.is_featured; })
      .slice(0, 6)
      .map(function (p) { return this._hydrateServicePackage(p); }.bind(this));

    const engagementModels = [
      {
        title: 'End-to-end production',
        description: 'Concept, design, development, and deployment managed by our XR studio.'
      },
      {
        title: 'White-label partner',
        description: 'We deliver XR production under your brand for agencies and consultancies.'
      },
      {
        title: 'Embedded teams',
        description: 'Specialist XR strategists and creators integrated with your internal teams.'
      }
    ];

    return {
      introText: 'We design and build immersive XR experiences across training, marketing, and location-based installations.',
      serviceCategories: serviceCategories,
      engagementModels: engagementModels,
      popularServicePackages: popularServicePackages
    };
  }

  // getServiceCategoryIntro(serviceCategorySlug)
  getServiceCategoryIntro(serviceCategorySlug) {
    const category = this._getServiceCategoryBySlug(serviceCategorySlug);
    if (!category) {
      return {
        serviceCategory: null,
        heroTitle: 'Immersive services',
        heroSubtitle: 'Explore our XR offerings tailored to your needs.'
      };
    }

    const heroTitle = category.name;
    const heroSubtitle = category.intro_content || category.description || 'Immersive experiences powered by XR.';

    return {
      serviceCategory: category,
      heroTitle: heroTitle,
      heroSubtitle: heroSubtitle
    };
  }

  // getServiceCategoryFilterOptions(serviceCategorySlug)
  getServiceCategoryFilterOptions(serviceCategorySlug) {
    const category = this._getServiceCategoryBySlug(serviceCategorySlug);
    if (!category) {
      return {
        technologyOptions: [],
        experienceTypeOptions: [],
        industryOptions: [],
        sortOptions: [],
        priceRange: { min: 0, max: 0 },
        participantsRange: { min: 0, max: 0 },
        expectedReachRange: { min: 0, max: 0 }
      };
    }

    const servicePackages = this._getFromStorage('service_packages').filter(function (p) {
      return p.service_category_id === category.id && p.status === 'active';
    });

    const technologySet = {};
    const experienceTypeSet = {};
    const industriesSet = {};

    let minPrice = null;
    let maxPrice = null;
    let minParticipants = null;
    let maxParticipants = null;
    let minReach = null;
    let maxReach = null;

    for (let i = 0; i < servicePackages.length; i++) {
      const p = servicePackages[i];
      if (p.technology) technologySet[p.technology] = true;
      if (p.experience_type) experienceTypeSet[p.experience_type] = true;
      // Industry not explicitly modeled on ServicePackage; skip.

      if (typeof p.base_price === 'number') {
        if (minPrice == null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice == null || p.base_price > maxPrice) maxPrice = p.base_price;
      }
      if (typeof p.min_participants === 'number') {
        if (minParticipants == null || p.min_participants < minParticipants) minParticipants = p.min_participants;
      }
      if (typeof p.max_participants === 'number') {
        if (maxParticipants == null || p.max_participants > maxParticipants) maxParticipants = p.max_participants;
      }
      if (typeof p.expected_reach === 'number') {
        if (minReach == null || p.expected_reach < minReach) minReach = p.expected_reach;
        if (maxReach == null || p.expected_reach > maxReach) maxReach = p.expected_reach;
      }
    }

    const technologyOptions = Object.keys(technologySet);
    const experienceTypeOptions = Object.keys(experienceTypeSet);
    const industryOptions = Object.keys(industriesSet); // currently empty unless you extend model

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'audience_reach_high_to_low', label: 'Audience Reach: High to Low' },
      { value: 'most_impact', label: 'Most Impact' }
    ];

    return {
      technologyOptions: technologyOptions,
      experienceTypeOptions: experienceTypeOptions,
      industryOptions: industryOptions,
      sortOptions: sortOptions,
      priceRange: {
        min: minPrice != null ? minPrice : 0,
        max: maxPrice != null ? maxPrice : 0
      },
      participantsRange: {
        min: minParticipants != null ? minParticipants : 0,
        max: maxParticipants != null ? maxParticipants : 0
      },
      expectedReachRange: {
        min: minReach != null ? minReach : 0,
        max: maxReach != null ? maxReach : 0
      }
    };
  }

  // searchServicePackages(serviceCategorySlug, filters, sortBy, page, pageSize)
  searchServicePackages(serviceCategorySlug, filters, sortBy, page, pageSize) {
    const category = this._getServiceCategoryBySlug(serviceCategorySlug);
    if (!category) {
      return { totalCount: 0, results: [] };
    }

    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let items = this._getFromStorage('service_packages').filter(function (p) {
      return p.service_category_id === category.id && p.status === 'active';
    });

    if (filters.technology) {
      items = items.filter(function (p) { return p.technology === filters.technology; });
    }
    if (filters.experienceType) {
      items = items.filter(function (p) { return p.experience_type === filters.experienceType; });
    }
    // Industry filter is not modeled directly; ignoring filters.industry.

    if (typeof filters.minParticipants === 'number') {
      const minParticipants = filters.minParticipants;
      items = items.filter(function (p) {
        const minOk = !p.min_participants || p.min_participants <= minParticipants;
        const maxOk = !p.max_participants || p.max_participants >= minParticipants;
        return minOk && maxOk;
      });
    }

    if (typeof filters.maxParticipants === 'number') {
      const maxParticipants = filters.maxParticipants;
      items = items.filter(function (p) {
        if (!p.min_participants) return true;
        return p.min_participants <= maxParticipants;
      });
    }

    if (typeof filters.maxBudget === 'number') {
      let minPrice = null;
      let maxPrice = null;
      for (let i = 0; i < items.length; i++) {
        const price = items[i].base_price;
        if (typeof price === 'number') {
          if (minPrice == null || price < minPrice) minPrice = price;
          if (maxPrice == null || price > maxPrice) maxPrice = price;
        }
      }
      const normalized = this._normalizePriceFilterBounds(filters.maxBudget, minPrice, maxPrice);
      const maxBudget = normalized.maxBudget;
      items = items.filter(function (p) {
        if (typeof p.base_price !== 'number') return false;
        return p.base_price <= maxBudget;
      });
    }

    if (typeof filters.minExpectedReach === 'number') {
      const minReach = filters.minExpectedReach;
      items = items.filter(function (p) {
        return typeof p.expected_reach === 'number' && p.expected_reach >= minReach;
      });
    }

    if (sortBy === 'price_low_to_high') {
      items.sort(function (a, b) {
        const pa = typeof a.base_price === 'number' ? a.base_price : Number.POSITIVE_INFINITY;
        const pb = typeof b.base_price === 'number' ? b.base_price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sortBy === 'price_high_to_low') {
      items.sort(function (a, b) {
        const pa = typeof a.base_price === 'number' ? a.base_price : 0;
        const pb = typeof b.base_price === 'number' ? b.base_price : 0;
        return pb - pa;
      });
    } else if (sortBy === 'audience_reach_high_to_low' || sortBy === 'most_impact') {
      items.sort(function (a, b) {
        const ra = typeof a.expected_reach === 'number' ? a.expected_reach : 0;
        const rb = typeof b.expected_reach === 'number' ? b.expected_reach : 0;
        return rb - ra;
      });
    }

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const results = paged.map(function (p) {
      const hydrated = this._hydrateServicePackage(p);
      return {
        servicePackage: hydrated,
        serviceCategoryName: category.name,
        displayPrice: this._formatDisplayPrice(p),
        participantsLabel: this._formatParticipantsLabel(p),
        expectedReachLabel: this._formatExpectedReachLabel(p)
      };
    }.bind(this));

    return { totalCount: totalCount, results: results };
  }

  // getServicePackageDetail(servicePackageId)
  getServicePackageDetail(servicePackageId) {
    const servicePackages = this._getFromStorage('service_packages');
    const serviceCategories = this._getFromStorage('service_categories');

    const sp = servicePackages.find(function (p) { return p.id === servicePackageId; }) || null;
    if (!sp) {
      return {
        servicePackage: null,
        serviceCategory: null,
        industryTags: [],
        displayPrice: '',
        participantsLabel: '',
        expectedReachLabel: '',
        relatedPackages: []
      };
    }

    const category = serviceCategories.find(function (c) { return c.id === sp.service_category_id; }) || null;

    const relatedPackages = servicePackages
      .filter(function (p) {
        return p.id !== sp.id && p.service_category_id === sp.service_category_id && p.status === 'active';
      })
      .slice(0, 4)
      .map(function (p) { return this._hydrateServicePackage(p); }.bind(this));

    const hydrated = this._hydrateServicePackage(sp);

    return {
      servicePackage: hydrated,
      serviceCategory: category || null,
      industryTags: [],
      displayPrice: this._formatDisplayPrice(sp),
      participantsLabel: this._formatParticipantsLabel(sp),
      expectedReachLabel: this._formatExpectedReachLabel(sp),
      relatedPackages: relatedPackages
    };
  }

  // submitServicePackageQuoteRequest(servicePackageId, contactName, company, email, phone, numberOfParticipants, preferredStartDate, budgetCap, message)
  submitServicePackageQuoteRequest(servicePackageId, contactName, company, email, phone, numberOfParticipants, preferredStartDate, budgetCap, message) {
    const servicePackages = this._getFromStorage('service_packages');
    const sp = servicePackages.find(function (p) { return p.id === servicePackageId; }) || null;
    if (!sp) {
      return {
        quoteRequest: null,
        success: false,
        message: 'Service package not found.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests');
    const now = new Date().toISOString();

    const qr = {
      id: this._generateId('qr'),
      request_type: 'service_package',
      service_package_id: servicePackageId,
      experience_configuration_id: null,
      contact_name: contactName,
      company: company || null,
      email: email,
      phone: phone || null,
      number_of_participants: typeof numberOfParticipants === 'number' ? numberOfParticipants : null,
      preferred_start_date: preferredStartDate ? this._toIsoDate(preferredStartDate) : null,
      budget_cap: typeof budgetCap === 'number' ? budgetCap : null,
      message: message || null,
      created_at: now
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quoteRequest: this._hydrateQuoteRequest(qr),
      success: true,
      message: 'Quote request submitted successfully.'
    };
  }

  // submitProjectBriefForCampaign(relatedServicePackageId, contactName, brandName, company, email, phone, campaignBudget, desiredLaunchMonth, goals, notes)
  submitProjectBriefForCampaign(relatedServicePackageId, contactName, brandName, company, email, phone, campaignBudget, desiredLaunchMonth, goals, notes) {
    const servicePackages = this._getFromStorage('service_packages');
    const sp = servicePackages.find(function (p) { return p.id === relatedServicePackageId; }) || null;
    if (!sp) {
      return {
        projectBrief: null,
        success: false,
        message: 'Campaign package not found.'
      };
    }

    const briefs = this._getFromStorage('project_briefs');
    const now = new Date().toISOString();

    const pb = {
      id: this._generateId('pb'),
      related_service_package_id: relatedServicePackageId,
      contact_name: contactName,
      brand_name: brandName,
      company: company || null,
      email: email || null,
      phone: phone || null,
      campaign_budget: campaignBudget,
      desired_launch_month: desiredLaunchMonth ? this._toIsoDate(desiredLaunchMonth) : null,
      goals: goals || null,
      notes: notes || null,
      created_at: now
    };

    briefs.push(pb);
    this._saveToStorage('project_briefs', briefs);

    return {
      projectBrief: this._hydrateProjectBrief(pb),
      success: true,
      message: 'Project brief submitted successfully.'
    };
  }

  // getPopupConfiguratorOptions()
  getPopupConfiguratorOptions() {
    const serviceCategory = this._getServiceCategoryBySlug('pop_up_installations');
    const experienceModules = this._getFromStorage('experience_modules').filter(function (m) {
      return m.status === 'active';
    });

    let minAudience = null;
    let maxAudience = null;
    for (let i = 0; i < experienceModules.length; i++) {
      const m = experienceModules[i];
      if (typeof m.capacity_min === 'number') {
        if (minAudience == null || m.capacity_min < minAudience) minAudience = m.capacity_min;
      }
      if (typeof m.capacity_max === 'number') {
        if (maxAudience == null || m.capacity_max > maxAudience) maxAudience = m.capacity_max;
      }
    }

    const now = new Date();
    const minDate = now.toISOString().slice(0, 10);
    const maxDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString().slice(0, 10);

    return {
      serviceCategory: serviceCategory || null,
      experienceModules: experienceModules,
      audienceRangeDefaults: {
        min: minAudience != null ? minAudience : 100,
        max: maxAudience != null ? maxAudience : 5000
      },
      dateRangeHint: {
        minDate: minDate,
        maxDate: maxDate
      }
    };
  }

  // calculatePopupConfigurationEstimate(configuration)
  calculatePopupConfigurationEstimate(configuration) {
    configuration = configuration || {};
    const result = this._calculatePopupEstimateFromModules(configuration);
    return {
      estimatedTotal: result.estimatedTotal,
      currency: result.currency,
      moduleBreakdown: result.moduleBreakdown
    };
  }

  // savePopupConfigurationAndRequestQuote(configuration, contactName, company, email, phone)
  savePopupConfigurationAndRequestQuote(configuration, contactName, company, email, phone) {
    configuration = configuration || {};
    const popupCategory = this._getServiceCategoryBySlug('pop_up_installations');
    const configs = this._getFromStorage('experience_configurations');
    const configModules = this._getFromStorage('experience_configuration_modules');
    const quoteRequests = this._getFromStorage('quote_requests');

    const estimateResult = this._calculatePopupEstimateFromModules(configuration);
    const now = new Date().toISOString();

    const eventDateIso = configuration.eventDate ? this._toIsoDate(configuration.eventDate) : null;

    const ec = {
      id: this._generateId('expconf'),
      service_category_id: popupCategory ? popupCategory.id : null,
      location_display: configuration.locationDisplay || '',
      location_city: configuration.locationCity || null,
      location_country: configuration.locationCountry || null,
      event_date: eventDateIso,
      audience_min: configuration.audienceMin != null ? configuration.audienceMin : null,
      audience_max: configuration.audienceMax != null ? configuration.audienceMax : null,
      notes: configuration.notes || null,
      estimated_total: estimateResult.estimatedTotal,
      currency: 'usd',
      is_submitted_for_quote: true,
      created_at: now,
      updated_at: now
    };

    configs.push(ec);
    this._saveToStorage('experience_configurations', configs);

    for (let i = 0; i < estimateResult.moduleBreakdown.length; i++) {
      const mb = estimateResult.moduleBreakdown[i];
      const ecm = {
        id: this._generateId('ecm'),
        experience_configuration_id: ec.id,
        experience_module_id: mb.experience_module_id,
        quantity: mb.quantity,
        custom_label: mb.custom_label || null,
        line_price: mb.line_price
      };
      configModules.push(ecm);
    }
    this._saveToStorage('experience_configuration_modules', configModules);

    const qr = {
      id: this._generateId('qr'),
      request_type: 'popup_configuration',
      service_package_id: null,
      experience_configuration_id: ec.id,
      contact_name: contactName,
      company: company || null,
      email: email,
      phone: phone || null,
      number_of_participants: null,
      preferred_start_date: eventDateIso,
      budget_cap: null,
      message: configuration.notes || null,
      created_at: now
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      experienceConfiguration: this._hydrateExperienceConfiguration(ec),
      quoteRequest: this._hydrateQuoteRequest(qr),
      success: true,
      message: 'Configuration saved and quote requested successfully.'
    };
  }

  // getCaseStudyFilterOptions()
  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies');

    const techSet = {};
    const industrySet = {};

    for (let i = 0; i < caseStudies.length; i++) {
      const cs = caseStudies[i];
      if (cs.technology) techSet[cs.technology] = true;
      if (cs.industry) industrySet[cs.industry] = true;
    }

    return {
      technologyOptions: Object.keys(techSet),
      industryOptions: Object.keys(industrySet)
    };
  }

  // searchCaseStudies(filters, page, pageSize)
  searchCaseStudies(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let items = this._getFromStorage('case_studies');

    if (filters.technology) {
      items = items.filter(function (cs) { return cs.technology === filters.technology; });
    }
    if (filters.industry) {
      items = items.filter(function (cs) { return cs.industry === filters.industry; });
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      items = items.filter(function (cs) {
        const t = (cs.title || '').toLowerCase();
        const s = (cs.summary || '').toLowerCase();
        return t.indexOf(q) !== -1 || s.indexOf(q) !== -1;
      });
    }

    items.sort(function (a, b) {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const results = paged.map(function (cs) { return this._hydrateCaseStudy(cs); }.bind(this));

    return { totalCount: totalCount, results: results };
  }

  // getCaseStudyDetail(caseStudyId)
  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies');
    const serviceCategories = this._getFromStorage('service_categories');

    const cs = caseStudies.find(function (c) { return c.id === caseStudyId; }) || null;
    if (!cs) {
      return {
        caseStudy: null,
        relatedCaseStudies: [],
        relatedServiceCategory: null
      };
    }

    const relatedCaseStudies = caseStudies
      .filter(function (c) {
        if (c.id === cs.id) return false;
        const sameTech = c.technology === cs.technology;
        const sameIndustry = c.industry === cs.industry;
        return sameTech || sameIndustry;
      })
      .sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 4)
      .map(function (c) { return this._hydrateCaseStudy(c); }.bind(this));

    const relatedServiceCategory = cs.related_service_category_id
      ? (serviceCategories.find(function (s) { return s.id === cs.related_service_category_id; }) || null)
      : null;

    return {
      caseStudy: this._hydrateCaseStudy(cs),
      relatedCaseStudies: relatedCaseStudies,
      relatedServiceCategory: relatedServiceCategory
    };
  }

  // getSavedCollectionsOverview()
  getSavedCollectionsOverview() {
    const collections = this._getFromStorage('saved_collections');
    const items = this._getFromStorage('saved_collection_items');

    const overview = collections.map(function (c) {
      const cItems = items
        .filter(function (it) { return it.collection_id === c.id; })
        .map(function (it) { return this._hydrateSavedCollectionItem(it); }.bind(this));
      return {
        collection: c,
        items: cItems
      };
    }.bind(this));

    return { collections: overview };
  }

  // saveItemToNamedCollection(itemType, itemId, collectionName, collectionType)
  saveItemToNamedCollection(itemType, itemId, collectionName, collectionType) {
    if (itemType !== 'case_study' && itemType !== 'article') {
      return {
        collection: null,
        collectionItem: null,
        createdNewCollection: false,
        success: false,
        message: 'Invalid item type.'
      };
    }

    const caseStudies = this._getFromStorage('case_studies');
    const articles = this._getFromStorage('articles');

    if (itemType === 'case_study') {
      const exists = caseStudies.some(function (cs) { return cs.id === itemId; });
      if (!exists) {
        return {
          collection: null,
          collectionItem: null,
          createdNewCollection: false,
          success: false,
          message: 'Case study not found.'
        };
      }
    } else if (itemType === 'article') {
      const existsA = articles.some(function (a) { return a.id === itemId; });
      if (!existsA) {
        return {
          collection: null,
          collectionItem: null,
          createdNewCollection: false,
          success: false,
          message: 'Article not found.'
        };
      }
    }

    const colInfo = this._getOrCreateDefaultCollection(collectionName, collectionType || (itemType === 'article' ? 'reading_list' : 'case_study_shortlist'));
    const collection = colInfo.collection;
    const createdNewCollection = colInfo.createdNewCollection;

    let items = this._getFromStorage('saved_collection_items');
    const existingItem = items.find(function (it) {
      return it.collection_id === collection.id && it.item_type === itemType && it.item_id === itemId;
    });

    if (existingItem) {
      return {
        collection: collection,
        collectionItem: this._hydrateSavedCollectionItem(existingItem),
        createdNewCollection: createdNewCollection,
        success: true,
        message: 'Item already in collection.'
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('sci'),
      collection_id: collection.id,
      item_type: itemType,
      item_id: itemId,
      added_at: now
    };

    items.push(newItem);
    this._saveToStorage('saved_collection_items', items);

    const collections = this._getFromStorage('saved_collections');
    const idx = collections.findIndex(function (c) { return c.id === collection.id; });
    if (idx >= 0) {
      collections[idx].updated_at = now;
      this._saveToStorage('saved_collections', collections);
    }

    return {
      collection: collection,
      collectionItem: this._hydrateSavedCollectionItem(newItem),
      createdNewCollection: createdNewCollection,
      success: true,
      message: 'Item saved to collection.'
    };
  }

  // renameSavedCollection(collectionId, newName)
  renameSavedCollection(collectionId, newName) {
    let collections = this._getFromStorage('saved_collections');
    const idx = collections.findIndex(function (c) { return c.id === collectionId; });

    if (idx === -1) {
      return {
        collection: null,
        success: false,
        message: 'Collection not found.'
      };
    }

    const name = (newName || '').trim();
    collections[idx].name = name;
    collections[idx].normalized_name = name.toLowerCase();
    collections[idx].updated_at = new Date().toISOString();

    this._saveToStorage('saved_collections', collections);

    return {
      collection: collections[idx],
      success: true,
      message: 'Collection renamed.'
    };
  }

  // deleteSavedCollection(collectionId)
  deleteSavedCollection(collectionId) {
    const collections = this._getFromStorage('saved_collections');
    const items = this._getFromStorage('saved_collection_items');

    const existing = collections.find(function (c) { return c.id === collectionId; });
    if (!existing) {
      return {
        success: false,
        message: 'Collection not found.'
      };
    }

    const newCollections = collections.filter(function (c) { return c.id !== collectionId; });
    const newItems = items.filter(function (it) { return it.collection_id !== collectionId; });

    this._saveToStorage('saved_collections', newCollections);
    this._saveToStorage('saved_collection_items', newItems);

    return {
      success: true,
      message: 'Collection deleted.'
    };
  }

  // removeItemFromCollection(collectionId, itemType, itemId)
  removeItemFromCollection(collectionId, itemType, itemId) {
    const items = this._getFromStorage('saved_collection_items');
    const existing = items.find(function (it) {
      return it.collection_id === collectionId && it.item_type === itemType && it.item_id === itemId;
    });

    if (!existing) {
      return {
        success: false,
        message: 'Item not found in collection.'
      };
    }

    const newItems = items.filter(function (it) {
      return !(it.collection_id === collectionId && it.item_type === itemType && it.item_id === itemId);
    });

    this._saveToStorage('saved_collection_items', newItems);

    return {
      success: true,
      message: 'Item removed from collection.'
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const topicSet = {};
    const tagSet = {};

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.topic) topicSet[a.topic] = true;
      if (Array.isArray(a.tags)) {
        for (let j = 0; j < a.tags.length; j++) {
          const t = a.tags[j];
          if (t) tagSet[t] = true;
        }
      }
    }

    return {
      topicOptions: Object.keys(topicSet),
      tagOptions: Object.keys(tagSet)
    };
  }

  // searchArticles(filters, page, pageSize)
  searchArticles(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let items = this._getFromStorage('articles');

    if (filters.topic) {
      items = items.filter(function (a) { return a.topic === filters.topic; });
    }

    if (filters.query) {
      const q = filters.query.toLowerCase();
      items = items.filter(function (a) {
        const t = (a.title || '').toLowerCase();
        const s = (a.summary || '').toLowerCase();
        const c = (a.content || '').toLowerCase();
        const topic = (a.topic || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return (
          t.indexOf(q) !== -1 ||
          s.indexOf(q) !== -1 ||
          c.indexOf(q) !== -1 ||
          topic.indexOf(q) !== -1 ||
          tags.indexOf(q) !== -1
        );
      });
    }

    if (filters.tags && filters.tags.length) {
      const tags = filters.tags;
      items = items.filter(function (a) {
        if (!Array.isArray(a.tags) || !a.tags.length) return false;
        for (let i = 0; i < tags.length; i++) {
          if (a.tags.indexOf(tags[i]) !== -1) return true;
        }
        return false;
      });
    }

    items.sort(function (a, b) {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { totalCount: totalCount, results: paged };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;

    if (!article) {
      return {
        article: null,
        relatedArticles: []
      };
    }

    const related = articles
      .filter(function (a) {
        if (a.id === article.id) return false;
        const sameTopic = a.topic && a.topic === article.topic;
        let sharedTag = false;
        if (Array.isArray(article.tags) && article.tags.length && Array.isArray(a.tags)) {
          for (let i = 0; i < article.tags.length; i++) {
            if (a.tags.indexOf(article.tags[i]) !== -1) {
              sharedTag = true;
              break;
            }
          }
        }
        return sameTopic || sharedTag;
      })
      .sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 4);

    return {
      article: article,
      relatedArticles: related
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const topicSet = {};
    const levelSet = {};
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.topic) topicSet[e.topic] = true;
      if (e.level) levelSet[e.level] = true;
      if (typeof e.price === 'number') {
        if (minPrice == null || e.price < minPrice) minPrice = e.price;
        if (maxPrice == null || e.price > maxPrice) maxPrice = e.price;
      }
    }

    return {
      topicOptions: Object.keys(topicSet),
      levelOptions: Object.keys(levelSet),
      priceRange: {
        min: minPrice != null ? minPrice : 0,
        max: maxPrice != null ? maxPrice : 0
      }
    };
  }

  // searchEvents(filters, page, pageSize)
  searchEvents(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let events = this._getFromStorage('events');
    const now = new Date();

    // Only upcoming events
    events = events.filter(function (e) {
      const d = e.start_datetime ? new Date(e.start_datetime) : null;
      return d && d >= now;
    });

    if (filters.topic) {
      events = events.filter(function (e) { return e.topic === filters.topic; });
    }
    if (filters.level) {
      events = events.filter(function (e) { return e.level === filters.level; });
    }

    if (filters.startDateFrom) {
      const from = new Date(filters.startDateFrom);
      events = events.filter(function (e) {
        const d = e.start_datetime ? new Date(e.start_datetime) : null;
        return d && d >= from;
      });
    }
    if (filters.startDateTo) {
      const to = new Date(filters.startDateTo);
      events = events.filter(function (e) {
        const d = e.start_datetime ? new Date(e.start_datetime) : null;
        return d && d <= to;
      });
    }

    if (typeof filters.maxPrice === 'number') {
      const maxPrice = filters.maxPrice;
      events = events.filter(function (e) {
        return typeof e.price === 'number' && e.price <= maxPrice;
      });
    }

    events.sort(function (a, b) {
      const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
      const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
      return da - db;
    });

    const totalCount = events.length;
    const start = (page - 1) * pageSize;
    const paged = events.slice(start, start + pageSize);

    return {
      totalCount: totalCount,
      results: paged
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(function (e) { return e.id === eventId; }) || null;
    return { event: event };
  }

  // submitEventRegistration(eventId, fullName, email, numberOfTickets, notes)
  submitEventRegistration(eventId, fullName, email, numberOfTickets, notes) {
    const events = this._getFromStorage('events');
    const event = events.find(function (e) { return e.id === eventId; }) || null;
    if (!event) {
      return {
        eventRegistration: null,
        success: false,
        message: 'Event not found.'
      };
    }

    const registrations = this._getFromStorage('event_registrations');
    const now = new Date().toISOString();

    const reg = {
      id: this._generateId('er'),
      event_id: eventId,
      full_name: fullName,
      email: email,
      number_of_tickets: numberOfTickets,
      notes: notes || null,
      status: 'pending',
      registered_at: now
    };

    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    // Optionally decrement remaining_spots if present
    const index = events.findIndex(function (e) { return e.id === eventId; });
    if (index >= 0 && typeof events[index].remaining_spots === 'number') {
      events[index].remaining_spots = Math.max(0, events[index].remaining_spots - numberOfTickets);
      this._saveToStorage('events', events);
    }

    return {
      eventRegistration: this._hydrateEventRegistration(reg),
      success: true,
      message: 'Registration submitted.'
    };
  }

  // getJobFilterOptions()
  getJobFilterOptions() {
    const jobs = this._getFromStorage('jobs');
    const departmentSet = {};
    const senioritySet = {};
    const locationTypeSet = {};

    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      if (j.department) departmentSet[j.department] = true;
      if (j.seniority_level) senioritySet[j.seniority_level] = true;
      if (j.location_type) locationTypeSet[j.location_type] = true;
    }

    return {
      departmentOptions: Object.keys(departmentSet),
      seniorityOptions: Object.keys(senioritySet),
      locationTypeOptions: Object.keys(locationTypeSet)
    };
  }

  // searchJobs(filters, page, pageSize)
  searchJobs(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 50;

    let jobs = this._getFromStorage('jobs');

    jobs = jobs.filter(function (j) { return j.is_active; });

    if (filters.department) {
      jobs = jobs.filter(function (j) { return j.department === filters.department; });
    }
    if (filters.seniorityLevel) {
      jobs = jobs.filter(function (j) { return j.seniority_level === filters.seniorityLevel; });
    }
    if (filters.isXrRelatedOnly) {
      jobs = jobs.filter(function (j) { return j.is_xr_related; });
    }

    jobs.sort(function (a, b) {
      const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return db - da;
    });

    const totalCount = jobs.length;
    const start = (page - 1) * pageSize;
    const paged = jobs.slice(start, start + pageSize);

    return {
      totalCount: totalCount,
      results: paged
    };
  }

  // getJobDetail(jobId)
  getJobDetail(jobId) {
    const jobs = this._getFromStorage('jobs');
    const job = jobs.find(function (j) { return j.id === jobId; }) || null;
    return { job: job };
  }

  // submitJobApplication(jobId, fullName, email, headline, portfolioUrl, coverMessage, currentLocation, linkedinUrl, cvUploaded)
  submitJobApplication(jobId, fullName, email, headline, portfolioUrl, coverMessage, currentLocation, linkedinUrl, cvUploaded) {
    const jobs = this._getFromStorage('jobs');
    const job = jobs.find(function (j) { return j.id === jobId; }) || null;
    if (!job) {
      return {
        jobApplication: null,
        success: false,
        message: 'Job not found.'
      };
    }

    const applications = this._getFromStorage('job_applications');
    const now = new Date().toISOString();

    const app = {
      id: this._generateId('ja'),
      job_id: jobId,
      full_name: fullName,
      email: email,
      headline: headline || null,
      portfolio_url: portfolioUrl || null,
      cover_message: coverMessage || null,
      current_location: currentLocation || null,
      linkedin_url: linkedinUrl || null,
      cv_uploaded: !!cvUploaded,
      status: 'submitted',
      created_at: now
    };

    applications.push(app);
    this._saveToStorage('job_applications', applications);

    return {
      jobApplication: this._hydrateJobApplication(app),
      success: true,
      message: 'Application submitted.'
    };
  }

  // getContactInquiryOptions()
  getContactInquiryOptions() {
    return {
      inquiryTypeOptions: [
        'general_inquiry',
        'project_quote',
        'agency_partner',
        'partnership_inquiry',
        'support'
      ],
      areasOfInterestOptions: [
        'white_label_production',
        'white_label_xr_production',
        'training_simulation',
        'marketing_brand',
        'pop_up_installations',
        'events',
        'strategy',
        'other'
      ],
      regionOptions: [
        'north_america',
        'europe',
        'asia_pacific',
        'latin_america',
        'middle_east_africa',
        'united_states',
        'european_union'
      ]
    };
  }

  // submitContactInquiry(inquiryType, areasOfInterest, budgetMinimum, regions, regionsDescription, contactName, company, email, phone, message)
  submitContactInquiry(inquiryType, areasOfInterest, budgetMinimum, regions, regionsDescription, contactName, company, email, phone, message) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const now = new Date().toISOString();

    const ci = {
      id: this._generateId('ci'),
      inquiry_type: inquiryType,
      areas_of_interest: Array.isArray(areasOfInterest) ? areasOfInterest : null,
      budget_minimum: typeof budgetMinimum === 'number' ? budgetMinimum : null,
      regions: Array.isArray(regions) ? regions : null,
      regions_description: regionsDescription || null,
      contact_name: contactName,
      company: company || null,
      email: email,
      phone: phone || null,
      message: message || null,
      created_at: now
    };

    inquiries.push(ci);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      contactInquiry: ci,
      success: true,
      message: 'Inquiry submitted.'
    };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find(function (p) { return p.slug === pageSlug; }) || null;

    if (page) {
      return {
        title: page.title || '',
        contentHtml: page.contentHtml || page.content_html || ''
      };
    }

    if (pageSlug === 'about') {
      return {
        title: 'About our XR studio',
        contentHtml: '<p>We are an immersive experience studio specializing in XR training, marketing, and installations.</p>'
      };
    }
    if (pageSlug === 'privacy_policy') {
      return {
        title: 'Privacy Policy',
        contentHtml: '<p>This is a placeholder privacy policy. Please provide content via CMS.</p>'
      };
    }
    if (pageSlug === 'terms_of_use') {
      return {
        title: 'Terms of Use',
        contentHtml: '<p>These are placeholder terms of use. Please provide content via CMS.</p>'
      };
    }

    return {
      title: 'Page not found',
      contentHtml: '<p>No content is configured for this page.</p>'
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
