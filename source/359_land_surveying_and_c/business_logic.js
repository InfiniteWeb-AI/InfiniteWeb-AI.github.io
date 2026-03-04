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
  }

  // -----------------------------
  // Storage helpers
  // -----------------------------
  _initStorage() {
    const tables = [
      'services',
      'service_requests',
      'portfolio_projects',
      'saved_projects',
      'service_regions',
      'service_cities',
      'contact_inquiries',
      'job_postings',
      'job_applications',
      'resources',
      'resource_downloads',
      'estimator_service_configs',
      'estimates',
      'estimate_emails',
      'articles',
      'article_shares',
      'invoices',
      'invoice_payment_attempts'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
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

  _nowISO() {
    return new Date().toISOString();
  }

  // -----------------------------
  // Generic helpers
  // -----------------------------

  _parseLotSizeToAcres(lotSize) {
    if (!lotSize) return 1;
    if (typeof lotSize === 'number') return lotSize;
    if (typeof lotSize !== 'string') return 1;
    const match = lotSize.match(/([0-9]*\.?[0-9]+)/);
    if (!match) return 1;
    const val = parseFloat(match[1]);
    return isNaN(val) ? 1 : val;
  }

  _capitalizeWords(str) {
    if (!str) return '';
    return str
      .split('_')
      .map(function (s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      })
      .join(' ');
  }

  _enrichPortfolioProject(project) {
    if (!project) return null;
    const regions = this._getFromStorage('service_regions');
    const services = this._getFromStorage('services');

    const region = project.location_region_id
      ? regions.find(function (r) {
          return r.id === project.location_region_id;
        }) || null
      : null;

    let servicesProvided = [];
    if (project.services_provided_ids && project.services_provided_ids.length) {
      servicesProvided = project.services_provided_ids
        .map(function (sid) {
          return services.find(function (s) {
            return s.id === sid;
          }) || null;
        })
        .filter(function (s) {
          return !!s;
        });
    }

    const enriched = Object.assign({}, project);
    if (project.location_region_id) {
      enriched.location_region = region;
    }
    if (project.services_provided_ids) {
      enriched.services_provided = servicesProvided;
    }
    return enriched;
  }

  _enrichEstimatorServiceConfig(config) {
    if (!config) return null;
    const services = this._getFromStorage('services');
    const enriched = Object.assign({}, config);
    if (config.service_id) {
      enriched.service = services.find(function (s) {
        return s.id === config.service_id;
      }) || null;
    }
    return enriched;
  }

  _enrichEstimate(estimate) {
    if (!estimate) return null;
    const services = this._getFromStorage('services');
    const enriched = Object.assign({}, estimate);
    if (estimate.service_id) {
      enriched.service = services.find(function (s) {
        return s.id === estimate.service_id;
      }) || null;
    }
    return enriched;
  }

  _enrichServiceRequest(serviceRequest) {
    if (!serviceRequest) return null;
    const services = this._getFromStorage('services');
    const enriched = Object.assign({}, serviceRequest);
    if (serviceRequest.service_id) {
      enriched.service = services.find(function (s) {
        return s.id === serviceRequest.service_id;
      }) || null;
    }
    return enriched;
  }

  _enrichEstimateEmail(estimateEmail) {
    if (!estimateEmail) return null;
    const estimates = this._getFromStorage('estimates');
    const enriched = Object.assign({}, estimateEmail);
    if (estimateEmail.estimate_id) {
      const estimate = estimates.find(function (e) {
        return e.id === estimateEmail.estimate_id;
      }) || null;
      enriched.estimate = this._enrichEstimate(estimate);
    }
    return enriched;
  }

  _enrichResourceDownload(download) {
    if (!download) return null;
    const resources = this._getFromStorage('resources');
    const enriched = Object.assign({}, download);
    if (download.resource_id) {
      enriched.resource = resources.find(function (r) {
        return r.id === download.resource_id;
      }) || null;
    }
    return enriched;
  }

  _enrichArticleShare(share) {
    if (!share) return null;
    const articles = this._getFromStorage('articles');
    const enriched = Object.assign({}, share);
    if (share.article_id) {
      enriched.article = articles.find(function (a) {
        return a.id === share.article_id;
      }) || null;
    }
    return enriched;
  }

  _enrichJobApplication(jobApplication) {
    if (!jobApplication) return null;
    const jobs = this._getFromStorage('job_postings');
    const enriched = Object.assign({}, jobApplication);
    if (jobApplication.job_posting_id) {
      enriched.jobPosting = jobs.find(function (j) {
        return j.id === jobApplication.job_posting_id;
      }) || null;
    }
    return enriched;
  }

  _enrichPaymentAttempt(paymentAttempt) {
    if (!paymentAttempt) return null;
    const invoices = this._getFromStorage('invoices');
    const enriched = Object.assign({}, paymentAttempt);
    if (paymentAttempt.invoice_id) {
      enriched.invoice = invoices.find(function (inv) {
        return inv.id === paymentAttempt.invoice_id;
      }) || null;
    }
    return enriched;
  }

  // -----------------------------
  // Helper functions from spec
  // -----------------------------

  _calculateEstimateTotalFromConfig(config, lotSize, complexityLevel, turnaroundTime) {
    if (!config) return 0;
    const baseRate = typeof config.base_rate === 'number' ? config.base_rate : 0;
    const pricingUnit = config.pricing_unit || 'per_project';

    let quantity = 1;
    if (pricingUnit === 'per_acre') {
      quantity = this._parseLotSizeToAcres(lotSize);
    } else if (pricingUnit === 'per_hour') {
      // No hours info in config; assume 1 unit
      quantity = 1;
    }

    let complexityMult = 1;
    if (config.complexity_levels && config.complexity_levels.length) {
      const match = config.complexity_levels.find(function (entry) {
        return entry.level === complexityLevel;
      });
      if (match && typeof match.multiplier === 'number') {
        complexityMult = match.multiplier;
      }
    }

    let turnaroundMult = 1;
    if (config.turnaround_options && config.turnaround_options.length) {
      const match = config.turnaround_options.find(function (entry) {
        return entry.time === turnaroundTime;
      });
      if (match && typeof match.multiplier === 'number') {
        turnaroundMult = match.multiplier;
      }
    }

    let total = baseRate * quantity * complexityMult * turnaroundMult;

    if (typeof config.minimum_fee === 'number' && total < config.minimum_fee) {
      total = config.minimum_fee;
    }

    return Number(total.toFixed(2));
  }

  _matchInvoiceByNumber(invoiceNumber) {
    const invoices = this._getFromStorage('invoices');
    if (!invoiceNumber) return null;
    return (
      invoices.find(function (inv) {
        return inv.invoice_number === invoiceNumber;
      }) || null
    );
  }

  _getOrCreateSavedProjectsStore() {
    let saved = this._getFromStorage('saved_projects');
    if (!Array.isArray(saved)) {
      saved = [];
      this._saveToStorage('saved_projects', saved);
    }
    return saved;
  }

  _buildArticleShareUrl(article) {
    if (!article) return '';
    var slug = article.slug || article.id;
    // Relative URL suitable for frontend routing
    return '/articles/' + slug;
  }

  // -----------------------------
  // Interface implementations
  // -----------------------------

  // getHomepageContent()
  getHomepageContent() {
    const services = this._getFromStorage('services').filter(function (s) {
      return s.is_active !== false;
    });
    const projectsRaw = this._getFromStorage('portfolio_projects');
    const articles = this._getFromStorage('articles').filter(function (a) {
      return a.is_published === true;
    });
    const resources = this._getFromStorage('resources').filter(function (r) {
      return r.is_active !== false;
    });

    const hero_services = services.slice(0, 3);
    const featured_services = services;

    const featured_projects_raw = projectsRaw.filter(function (p) {
      return p.is_featured === true;
    });
    const featured_projects = (featured_projects_raw.length ? featured_projects_raw : projectsRaw)
      .slice(0, 3)
      .map(this._enrichPortfolioProject.bind(this));

    const featured_articles = articles
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.publication_date || 0).getTime();
        const db = new Date(b.publication_date || 0).getTime();
        return db - da;
      })
      .slice(0, 3);

    const featured_resources = resources
      .filter(function (r) {
        return (
          r.primary_category === 'homeowner_guides' ||
          r.primary_category === 'residential_resources'
        );
      })
      .slice(0, 3);

    return {
      hero_services: hero_services,
      featured_services: featured_services,
      featured_projects: featured_projects,
      featured_articles: featured_articles,
      featured_resources: featured_resources
    };
  }

  // getServiceFilterOptions()
  getServiceFilterOptions() {
    return {
      disciplines: [
        { value: 'land_surveying', label: 'Land Surveying' },
        { value: 'civil_engineering', label: 'Civil Engineering' }
      ],
      market_segments: [
        { value: 'residential', label: 'Residential' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'municipal', label: 'Municipal' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // listServices(discipline?, primaryMarketSegment?, searchQuery?, includeInactive?)
  listServices(discipline, primaryMarketSegment, searchQuery, includeInactive) {
    let services = this._getFromStorage('services');

    const includeInactiveBool = !!includeInactive;
    if (!includeInactiveBool) {
      services = services.filter(function (s) {
        return s.is_active !== false;
      });
    }

    if (discipline) {
      services = services.filter(function (s) {
        return s.discipline === discipline;
      });
    }

    if (primaryMarketSegment) {
      services = services.filter(function (s) {
        return s.primary_market_segment === primaryMarketSegment;
      });
    }

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      services = services.filter(function (s) {
        const fields = [s.name, s.description_short, s.description_long];
        for (let i = 0; i < fields.length; i++) {
          const v = fields[i];
          if (v && String(v).toLowerCase().indexOf(q) !== -1) return true;
        }
        return false;
      });
    }

    return services;
  }

  // getServicesOverview()
  getServicesOverview() {
    const services = this._getFromStorage('services').filter(function (s) {
      return s.is_active !== false;
    });
    const land = [];
    const civil = [];
    for (let i = 0; i < services.length; i++) {
      if (services[i].discipline === 'land_surveying') land.push(services[i]);
      else if (services[i].discipline === 'civil_engineering') civil.push(services[i]);
    }
    return {
      land_surveying_services: land,
      civil_engineering_services: civil
    };
  }

  // getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const projects = this._getFromStorage('portfolio_projects');
    const resources = this._getFromStorage('resources');

    const service = services.find(function (s) {
      return s.id === serviceId;
    }) || null;

    if (!service) {
      return {
        service: null,
        related_projects: [],
        related_resources: [],
        faqs: []
      };
    }

    const related_projects = projects
      .filter(function (p) {
        if (!p.services_provided_ids || !p.services_provided_ids.length) return false;
        return p.services_provided_ids.indexOf(service.id) !== -1;
      })
      .map(this._enrichPortfolioProject.bind(this));

    const related_resources = resources.filter(function (r) {
      if (r.is_active === false) return false;
      const tags = Array.isArray(r.tags) ? r.tags : [];
      const needleName = service.name ? service.name.toLowerCase() : '';
      const needleSlug = service.slug ? service.slug.toLowerCase() : '';
      const inTags = tags.some(function (t) {
        const tl = String(t).toLowerCase();
        return tl.indexOf('survey') !== -1 || tl.indexOf(needleName) !== -1 || tl.indexOf(needleSlug) !== -1;
      });
      if (inTags) return true;
      const title = r.title ? r.title.toLowerCase() : '';
      return title.indexOf('survey') !== -1 || title.indexOf(needleName) !== -1;
    });

    return {
      service: service,
      related_projects: related_projects,
      related_resources: related_resources,
      faqs: []
    };
  }

  // getServiceRequestFormOptions(serviceId?)
  getServiceRequestFormOptions(serviceId) {
    // serviceId currently unused but kept for API completeness
    return {
      request_types: [
        { value: 'quote', label: 'Request a Quote' },
        { value: 'consultation', label: 'Request a Consultation' }
      ],
      preferred_contact_methods: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' }
      ],
      preferred_consultation_methods: [
        { value: 'phone_call', label: 'Phone Call' },
        { value: 'video_call', label: 'Video Call' },
        { value: 'in_person', label: 'In Person' }
      ],
      contact_time_windows: [
        { value: 'morning_8_12', label: 'Morning (8–12)' },
        { value: 'afternoon_12_5', label: 'Afternoon (12–5)' },
        { value: 'evening_5_8', label: 'Evening (5–8)' }
      ]
    };
  }

  // createServiceRequest(...)
  createServiceRequest(
    serviceId,
    requestType,
    contactName,
    contactEmail,
    contactPhone,
    projectAddress,
    projectCity,
    projectState,
    projectPostalCode,
    lotSize,
    projectDescription,
    preferredContactMethod,
    preferredConsultationMethod,
    preferredContactDate,
    preferredContactTimeWindow,
    budgetCap,
    comments
  ) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) {
      return s.id === serviceId;
    }) || null;

    if (!service) {
      return {
        success: false,
        serviceRequest: null,
        message: 'Service not found'
      };
    }

    let preferredDateISO = null;
    if (preferredContactDate) {
      const d = new Date(preferredContactDate);
      if (!isNaN(d.getTime())) {
        preferredDateISO = d.toISOString();
      }
    }

    const serviceRequests = this._getFromStorage('service_requests');
    const newReq = {
      id: this._generateId('srvreq'),
      service_id: serviceId,
      request_type: requestType,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      project_address: projectAddress || null,
      project_city: projectCity || null,
      project_state: projectState || null,
      project_postal_code: projectPostalCode || null,
      lot_size: lotSize || null,
      project_description: projectDescription || null,
      preferred_contact_method: preferredContactMethod || null,
      preferred_consultation_method: preferredConsultationMethod || null,
      preferred_contact_date: preferredDateISO,
      preferred_contact_time_window: preferredContactTimeWindow || null,
      budget_cap: typeof budgetCap === 'number' ? budgetCap : null,
      comments: comments || null,
      submittedAt: this._nowISO()
    };

    serviceRequests.push(newReq);
    this._saveToStorage('service_requests', serviceRequests);

    return {
      success: true,
      serviceRequest: this._enrichServiceRequest(newReq),
      message: 'Service request submitted'
    };
  }

  // getPortfolioFilterOptions()
  getPortfolioFilterOptions() {
    const projects = this._getFromStorage('portfolio_projects');
    const regions = this._getFromStorage('service_regions');

    const projectTypeValues = ['roadway', 'transportation', 'drainage', 'site_design', 'land_development', 'utility', 'other'];
    const project_types = projectTypeValues.map(
      function (v) {
        return { value: v, label: this._capitalizeWords(v) };
      }.bind(this)
    );

    const statesSet = {};
    for (let i = 0; i < projects.length; i++) {
      const st = projects[i].location_state;
      if (st) statesSet[st] = true;
    }
    const states = Object.keys(statesSet).map(function (st) {
      return { value: st, label: st };
    });

    let minYear = null;
    let maxYear = null;
    for (let i = 0; i < projects.length; i++) {
      const y = projects[i].completion_year;
      if (typeof y === 'number') {
        if (minYear === null || y < minYear) minYear = y;
        if (maxYear === null || y > maxYear) maxYear = y;
      }
    }

    const regionsSlim = regions.map(function (r) {
      return { id: r.id, name: r.name, slug: r.slug };
    });

    return {
      project_types: project_types,
      states: states,
      regions: regionsSlim,
      completion_year_range: { min_year: minYear, max_year: maxYear }
    };
  }

  // listPortfolioProjects(...)
  listPortfolioProjects(
    projectType,
    locationState,
    locationCity,
    locationRegionId,
    completionYearFrom,
    completionYearTo,
    limit
  ) {
    let projects = this._getFromStorage('portfolio_projects');

    if (projectType) {
      projects = projects.filter(function (p) {
        return p.project_type === projectType;
      });
    }

    if (locationState) {
      projects = projects.filter(function (p) {
        return p.location_state === locationState;
      });
    }

    if (locationCity) {
      projects = projects.filter(function (p) {
        return p.location_city === locationCity;
      });
    }

    if (locationRegionId) {
      projects = projects.filter(function (p) {
        return p.location_region_id === locationRegionId;
      });
    }

    if (typeof completionYearFrom === 'number') {
      projects = projects.filter(function (p) {
        return typeof p.completion_year === 'number' && p.completion_year >= completionYearFrom;
      });
    }

    if (typeof completionYearTo === 'number') {
      projects = projects.filter(function (p) {
        return typeof p.completion_year === 'number' && p.completion_year <= completionYearTo;
      });
    }

    if (typeof limit === 'number' && limit > 0 && projects.length > limit) {
      projects = projects.slice(0, limit);
    }

    // Instrumentation for task completion tracking (task3_portfolioFilterParams)
    try {
      localStorage.setItem(
        'task3_portfolioFilterParams',
        JSON.stringify({
          projectType: projectType || null,
          locationState: locationState || null,
          locationCity: locationCity || null,
          locationRegionId: locationRegionId || null,
          completionYearFrom: typeof completionYearFrom === 'number' ? completionYearFrom : null,
          completionYearTo: typeof completionYearTo === 'number' ? completionYearTo : null
        })
      );
    } catch (e) {}

    return projects.map(this._enrichPortfolioProject.bind(this));
  }

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('portfolio_projects');
    const savedProjects = this._getFromStorage('saved_projects');

    // Instrumentation for task completion tracking (task3_secondSavedProjectOpened)
    try {
      if (savedProjects && savedProjects.length >= 2) {
        const secondSaved = savedProjects[1];
        if (secondSaved && secondSaved.project_id === projectId) {
          localStorage.setItem('task3_secondSavedProjectOpened', projectId);
        }
      }
    } catch (e) {}

    const projectRaw = projects.find(function (p) {
      return p.id === projectId;
    }) || null;

    if (!projectRaw) {
      return {
        project: null,
        is_saved: false,
        related_projects: []
      };
    }

    const isSaved = savedProjects.some(function (sp) {
      return sp.project_id === projectRaw.id;
    });

    const related_projects = projects
      .filter(function (p) {
        if (p.id === projectRaw.id) return false;
        if (p.project_type === projectRaw.project_type) return true;
        if (projectRaw.location_region_id && p.location_region_id === projectRaw.location_region_id) return true;
        return false;
      })
      .slice(0, 3)
      .map(this._enrichPortfolioProject.bind(this));

    return {
      project: this._enrichPortfolioProject(projectRaw),
      is_saved: isSaved,
      related_projects: related_projects
    };
  }

  // addProjectToSaved(projectId)
  addProjectToSaved(projectId) {
    const projects = this._getFromStorage('portfolio_projects');
    const project = projects.find(function (p) {
      return p.id === projectId;
    }) || null;

    if (!project) {
      return {
        success: false,
        savedProject: null,
        message: 'Project not found'
      };
    }

    const savedProjects = this._getOrCreateSavedProjectsStore();
    const existing = savedProjects.find(function (sp) {
      return sp.project_id === projectId;
    });

    if (existing) {
      return {
        success: true,
        savedProject: existing,
        message: 'Project already saved'
      };
    }

    const newSaved = {
      id: this._generateId('savedproj'),
      project_id: projectId,
      savedAt: this._nowISO(),
      notes: null
    };

    savedProjects.push(newSaved);
    this._saveToStorage('saved_projects', savedProjects);

    return {
      success: true,
      savedProject: newSaved,
      message: 'Project added to saved list'
    };
  }

  // removeSavedProject(savedProjectId)
  removeSavedProject(savedProjectId) {
    let savedProjects = this._getOrCreateSavedProjectsStore();
    const before = savedProjects.length;
    savedProjects = savedProjects.filter(function (sp) {
      return sp.id !== savedProjectId;
    });
    this._saveToStorage('saved_projects', savedProjects);

    const removed = before !== savedProjects.length;
    return {
      success: removed,
      message: removed ? 'Saved project removed' : 'Saved project not found'
    };
  }

  // listSavedProjects()
  listSavedProjects() {
    const savedProjects = this._getOrCreateSavedProjectsStore();
    const projects = this._getFromStorage('portfolio_projects');

    // Instrumentation for task completion tracking (task3_savedListViewed)
    try {
      localStorage.setItem('task3_savedListViewed', 'true');
    } catch (e) {}

    return savedProjects.map(
      function (sp) {
        const projRaw = projects.find(function (p) {
          return p.id === sp.project_id;
        }) || null;
        return {
          savedProject: sp,
          project: this._enrichPortfolioProject(projRaw)
        };
      }.bind(this)
    );
  }

  // getServiceAreaOverview()
  getServiceAreaOverview() {
    const regions = this._getFromStorage('service_regions');
    const citiesRaw = this._getFromStorage('service_cities');

    const regionMap = {};
    for (let i = 0; i < regions.length; i++) {
      regionMap[regions[i].id] = regions[i];
    }

    const sample_cities = citiesRaw.slice(0, 10).map(function (c) {
      const enriched = Object.assign({}, c);
      if (c.region_id) {
        enriched.region = regionMap[c.region_id] || null;
      }
      return enriched;
    });

    return {
      regions: regions,
      sample_cities: sample_cities
    };
  }

  // searchServiceCities(query)
  searchServiceCities(query) {
    const q = (query || '').toLowerCase();
    const cities = this._getFromStorage('service_cities');
    const regions = this._getFromStorage('service_regions');

    const results = cities
      .filter(function (c) {
        return c.name && c.name.toLowerCase().indexOf(q) !== -1;
      })
      .map(function (c) {
        const region = c.region_id
          ? regions.find(function (r) {
              return r.id === c.region_id;
            }) || null
          : null;
        return { city: c, region: region };
      });

    // Instrumentation for task completion tracking (task4_roundRockSearch)
    try {
      if (
        typeof query === 'string' &&
        query.toLowerCase().indexOf('round rock') !== -1 &&
        results &&
        results.length > 0
      ) {
        localStorage.setItem(
          'task4_roundRockSearch',
          JSON.stringify({
            query: query,
            resultCount: results.length,
            firstMatchCityId: results[0].city.id,
            firstMatchRegionId: results[0].region ? results[0].region.id : null
          })
        );
      }
    } catch (e) {}

    return results;
  }

  // getServiceRegionDetail(regionId)
  getServiceRegionDetail(regionId) {
    const regions = this._getFromStorage('service_regions');
    const citiesRaw = this._getFromStorage('service_cities');

    const region = regions.find(function (r) {
      return r.id === regionId;
    }) || null;

    if (!region) {
      return {
        region: null,
        cities: []
      };
    }

    const cities = citiesRaw
      .filter(function (c) {
        return c.region_id === regionId;
      })
      .map(function (c) {
        const enriched = Object.assign({}, c);
        enriched.region = region;
        return enriched;
      });

    return {
      region: region,
      cities: cities
    };
  }

  // getContactFormOptions()
  getContactFormOptions() {
    return {
      subject_types: [
        { value: 'new_project_inquiry', label: 'New Project Inquiry' },
        { value: 'service_request', label: 'Service Request' },
        { value: 'general_question', label: 'General Question' },
        { value: 'billing', label: 'Billing' },
        { value: 'careers', label: 'Careers' }
      ],
      preferred_contact_methods: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' }
      ],
      callback_windows: [
        { value: 'morning_8_12', label: 'Morning (8–12)' },
        { value: 'afternoon_12_5', label: 'Afternoon (12–5)' },
        { value: 'evening_5_8', label: 'Evening (5–8)' }
      ]
    };
  }

  // createContactInquiry(...)
  createContactInquiry(
    name,
    email,
    phone,
    subjectType,
    message,
    locationCity,
    locationState,
    preferredContactMethod,
    preferredCallbackWindow,
    relatedRegionId
  ) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const regions = this._getFromStorage('service_regions');

    const region = relatedRegionId
      ? regions.find(function (r) {
          return r.id === relatedRegionId;
        }) || null
      : null;

    const inquiry = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      phone: phone || null,
      subject_type: subjectType,
      message: message,
      location_city: locationCity || null,
      location_state: locationState || null,
      preferred_contact_method: preferredContactMethod || null,
      preferred_callback_window: preferredCallbackWindow || null,
      related_region_id: relatedRegionId || null,
      createdAt: this._nowISO()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    const enriched = Object.assign({}, inquiry);
    if (region) enriched.related_region = region;

    return {
      success: true,
      contactInquiry: enriched,
      message: 'Contact inquiry submitted'
    };
  }

  // getCareersFilterOptions()
  getCareersFilterOptions() {
    const job_categories_values = ['civil_engineer', 'engineering', 'surveying', 'administration', 'operations', 'other'];
    const job_categories = job_categories_values.map(
      function (v) {
        return { value: v, label: this._capitalizeWords(v) };
      }.bind(this)
    );

    const jobs = this._getFromStorage('job_postings');
    const locMap = {};
    for (let i = 0; i < jobs.length; i++) {
      const city = jobs[i].location_city;
      const state = jobs[i].location_state;
      if (!city || !state) continue;
      const key = city + ',' + state;
      if (!locMap[key]) {
        locMap[key] = {
          city: city,
          state: state,
          label: city + ', ' + state
        };
      }
    }
    const locations = Object.keys(locMap).map(function (k) {
      return locMap[k];
    });

    const experience_values = ['entry_level', '0_2_years', 'mid_level', 'senior_level', 'internship'];
    const experience_levels = experience_values.map(
      function (v) {
        return { value: v, label: this._capitalizeWords(v) };
      }.bind(this)
    );

    return {
      job_categories: job_categories,
      locations: locations,
      experience_levels: experience_levels
    };
  }

  // listJobPostings(...)
  listJobPostings(jobCategory, locationCity, locationState, experienceLevel, includeInactive) {
    let jobs = this._getFromStorage('job_postings');

    if (!includeInactive) {
      jobs = jobs.filter(function (j) {
        return j.is_active !== false;
      });
    }

    if (jobCategory) {
      jobs = jobs.filter(function (j) {
        return j.job_category === jobCategory;
      });
    }

    if (locationCity) {
      jobs = jobs.filter(function (j) {
        return j.location_city === locationCity;
      });
    }

    if (locationState) {
      jobs = jobs.filter(function (j) {
        return j.location_state === locationState;
      });
    }

    if (experienceLevel) {
      jobs = jobs.filter(function (j) {
        return j.experience_level === experienceLevel;
      });
    }

    return jobs;
  }

  // getJobPostingDetail(jobPostingId)
  getJobPostingDetail(jobPostingId) {
    const jobs = this._getFromStorage('job_postings');
    const job = jobs.find(function (j) {
      return j.id === jobPostingId;
    }) || null;

    if (!job) {
      return {
        jobPosting: null,
        is_entry_level_or_0_2_years: false,
        related_jobs: []
      };
    }

    const isEntry = job.experience_level === 'entry_level' || job.experience_level === '0_2_years';

    const related_jobs = jobs.filter(function (j) {
      if (j.id === job.id) return false;
      if (j.job_category === job.job_category && j.location_state === job.location_state) return true;
      return false;
    });

    return {
      jobPosting: job,
      is_entry_level_or_0_2_years: isEntry,
      related_jobs: related_jobs
    };
  }

  // submitJobApplicationStepOne(...)
  submitJobApplicationStepOne(
    jobPostingId,
    applicantName,
    applicantEmail,
    applicantPhone,
    currentCity,
    preferredOfficeLocation,
    yearsExperience,
    earliestStartDate
  ) {
    const jobs = this._getFromStorage('job_postings');
    const job = jobs.find(function (j) {
      return j.id === jobPostingId;
    }) || null;

    if (!job) {
      return {
        success: false,
        jobApplication: null,
        message: 'Job posting not found'
      };
    }

    const applications = this._getFromStorage('job_applications');

    let startDateISO = null;
    if (earliestStartDate) {
      const d = new Date(earliestStartDate);
      if (!isNaN(d.getTime())) startDateISO = d.toISOString();
    }

    const app = {
      id: this._generateId('jobapp'),
      job_posting_id: jobPostingId,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      applicant_phone: applicantPhone || null,
      current_city: currentCity || null,
      preferred_office_location: preferredOfficeLocation || null,
      years_experience: typeof yearsExperience === 'number' ? yearsExperience : null,
      earliest_start_date: startDateISO,
      resume_uploaded: false,
      cover_letter_uploaded: false,
      status: 'in_progress',
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    applications.push(app);
    this._saveToStorage('job_applications', applications);

    return {
      success: true,
      jobApplication: this._enrichJobApplication(app),
      message: 'Job application step one submitted'
    };
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources');

    const primary_values = [
      'homeowner_guides',
      'residential_resources',
      'commercial_resources',
      'technical_resources',
      'checklists'
    ];
    const primary_categories = primary_values.map(
      function (v) {
        return { value: v, label: this._capitalizeWords(v) };
      }.bind(this)
    );

    const tagsSet = {};
    for (let i = 0; i < resources.length; i++) {
      const tags = Array.isArray(resources[i].tags) ? resources[i].tags : [];
      for (let j = 0; j < tags.length; j++) {
        const t = String(tags[j]);
        if (t) tagsSet[t] = true;
      }
    }
    const tags = Object.keys(tagsSet);

    return {
      primary_categories: primary_categories,
      tags: tags
    };
  }

  // listResources(...)
  listResources(primaryCategory, searchQuery, tags, includeInactive) {
    let resources = this._getFromStorage('resources');

    if (!includeInactive) {
      resources = resources.filter(function (r) {
        return r.is_active !== false;
      });
    }

    if (primaryCategory) {
      resources = resources.filter(function (r) {
        return r.primary_category === primaryCategory;
      });
    }

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      resources = resources.filter(function (r) {
        const title = r.title ? r.title.toLowerCase() : '';
        const desc = r.description ? r.description.toLowerCase() : '';
        return title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (tags && Array.isArray(tags) && tags.length) {
      const wanted = tags.map(function (t) {
        return String(t).toLowerCase();
      });
      resources = resources.filter(function (r) {
        const rt = Array.isArray(r.tags)
          ? r.tags.map(function (t) {
              return String(t).toLowerCase();
            })
          : [];
        return wanted.some(function (t) {
          return rt.indexOf(t) !== -1;
        });
      });
    }

    return resources;
  }

  // getResourceDetail(resourceId)
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(function (r) {
      return r.id === resourceId;
    }) || null;

    if (!resource) {
      return {
        resource: null,
        related_resources: []
      };
    }

    const related_resources = resources.filter(function (r) {
      return r.id !== resource.id && r.primary_category === resource.primary_category;
    });

    return {
      resource: resource,
      related_resources: related_resources
    };
  }

  // downloadResource(resourceId, sourcePage)
  downloadResource(resourceId, sourcePage) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(function (r) {
      return r.id === resourceId;
    }) || null;

    if (!resource) {
      return {
        success: false,
        download: null,
        file_url: null,
        message: 'Resource not found'
      };
    }

    const downloads = this._getFromStorage('resource_downloads');
    const download = {
      id: this._generateId('resdl'),
      resource_id: resourceId,
      downloadedAt: this._nowISO(),
      source_page: sourcePage || 'resources_listing'
    };

    downloads.push(download);
    this._saveToStorage('resource_downloads', downloads);

    return {
      success: true,
      download: this._enrichResourceDownload(download),
      file_url: resource.file_url,
      message: 'Resource download recorded'
    };
  }

  // getEstimatorServiceOptions(projectType?)
  getEstimatorServiceOptions(projectType) {
    let configs = this._getFromStorage('estimator_service_configs');
    configs = configs.filter(function (c) {
      return c.is_active !== false;
    });

    if (projectType) {
      configs = configs.filter(function (c) {
        return c.project_type === projectType;
      });
    }

    return configs.map(this._enrichEstimatorServiceConfig.bind(this));
  }

  // calculateEstimate(...)
  calculateEstimate(
    projectType,
    serviceConfigId,
    serviceId,
    serviceName,
    lotSize,
    complexityLevel,
    turnaroundTime,
    currency
  ) {
    const configs = this._getFromStorage('estimator_service_configs');
    const config = configs.find(function (c) {
      return c.id === serviceConfigId;
    }) || null;

    if (!config || config.is_active === false) {
      return {
        success: false,
        estimate: null,
        message: 'Estimator configuration not found or inactive'
      };
    }

    const total = this._calculateEstimateTotalFromConfig(
      config,
      lotSize,
      complexityLevel,
      turnaroundTime
    );

    const estimates = this._getFromStorage('estimates');
    const estimate = {
      id: this._generateId('est'),
      project_type: projectType,
      service_id: serviceId || null,
      service_name: serviceName,
      lot_size: lotSize || null,
      complexity_level: complexityLevel,
      turnaround_time: turnaroundTime,
      estimated_total: total,
      currency: currency || 'USD',
      status: 'finalized',
      createdAt: this._nowISO()
    };

    estimates.push(estimate);
    this._saveToStorage('estimates', estimates);

    return {
      success: true,
      estimate: this._enrichEstimate(estimate),
      message: 'Estimate calculated'
    };
  }

  // emailEstimate(...)
  emailEstimate(estimateId, recipientEmail, subject, message) {
    const estimates = this._getFromStorage('estimates');
    const estimateIndex = estimates.findIndex(function (e) {
      return e.id === estimateId;
    });
    const estimate = estimateIndex >= 0 ? estimates[estimateIndex] : null;

    if (!estimate) {
      return {
        success: false,
        estimateEmail: null,
        updatedEstimate: null,
        message: 'Estimate not found'
      };
    }

    const emails = this._getFromStorage('estimate_emails');
    const emailRecord = {
      id: this._generateId('estemail'),
      estimate_id: estimateId,
      recipient_email: recipientEmail,
      subject: subject || null,
      message: message || null,
      sentAt: this._nowISO()
    };

    emails.push(emailRecord);
    this._saveToStorage('estimate_emails', emails);

    // Update estimate status
    estimate.status = 'emailed';
    estimates[estimateIndex] = estimate;
    this._saveToStorage('estimates', estimates);

    return {
      success: true,
      estimateEmail: this._enrichEstimateEmail(emailRecord),
      updatedEstimate: this._enrichEstimate(estimate),
      message: 'Estimate emailed'
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');

    const category_values = [
      'drainage',
      'stormwater',
      'surveying',
      'site_design',
      'company_news',
      'civil_engineering',
      'land_surveying'
    ];
    const categories = category_values.map(
      function (v) {
        return { value: v, label: this._capitalizeWords(v) };
      }.bind(this)
    );

    let minYear = null;
    let maxYear = null;
    const readingSet = {};

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.publication_date) {
        const d = new Date(a.publication_date);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          if (minYear === null || y < minYear) minYear = y;
          if (maxYear === null || y > maxYear) maxYear = y;
        }
      }
      if (typeof a.reading_time_minutes === 'number') {
        readingSet[a.reading_time_minutes] = true;
      }
    }

    const reading_time_options = Object.keys(readingSet)
      .map(function (k) {
        return parseInt(k, 10);
      })
      .sort(function (a, b) {
        return a - b;
      });

    return {
      categories: categories,
      year_range: { min_year: minYear, max_year: maxYear },
      reading_time_options: reading_time_options
    };
  }

  // listArticles(...)
  listArticles(category, publishedFrom, publishedTo, minReadingTime, maxReadingTime, searchQuery) {
    let articles = this._getFromStorage('articles').filter(function (a) {
      return a.is_published === true;
    });

    if (category) {
      articles = articles.filter(function (a) {
        return a.category === category;
      });
    }

    let fromDate = null;
    let toDate = null;
    if (publishedFrom) {
      const d = new Date(publishedFrom);
      if (!isNaN(d.getTime())) fromDate = d;
    }
    if (publishedTo) {
      const d = new Date(publishedTo);
      if (!isNaN(d.getTime())) toDate = d;
    }

    if (fromDate || toDate) {
      articles = articles.filter(function (a) {
        if (!a.publication_date) return false;
        const d = new Date(a.publication_date);
        if (isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    if (typeof minReadingTime === 'number') {
      articles = articles.filter(function (a) {
        return typeof a.reading_time_minutes === 'number' && a.reading_time_minutes >= minReadingTime;
      });
    }

    if (typeof maxReadingTime === 'number') {
      articles = articles.filter(function (a) {
        return typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= maxReadingTime;
      });
    }

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      articles = articles.filter(function (a) {
        const title = a.title ? a.title.toLowerCase() : '';
        const excerpt = a.excerpt ? a.excerpt.toLowerCase() : '';
        return title.indexOf(q) !== -1 || excerpt.indexOf(q) !== -1;
      });
    }

    return articles;
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(function (a) {
      return a.id === articleId;
    }) || null;

    if (!article) {
      return {
        article: null,
        related_articles: []
      };
    }

    const related_articles = articles.filter(function (a) {
      if (a.id === article.id) return false;
      return a.category === article.category;
    });

    return {
      article: article,
      related_articles: related_articles
    };
  }

  // shareArticle(...)
  shareArticle(articleId, method, recipientEmail, subject) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(function (a) {
      return a.id === articleId;
    }) || null;

    if (!article) {
      return {
        success: false,
        articleShare: null,
        shareUrl: null,
        message: 'Article not found'
      };
    }

    const shares = this._getFromStorage('article_shares');
    const share = {
      id: this._generateId('artshare'),
      article_id: articleId,
      method: method,
      recipient_email: method === 'email_link' ? recipientEmail || null : null,
      subject: subject || null,
      createdAt: this._nowISO()
    };

    shares.push(share);
    this._saveToStorage('article_shares', shares);

    let shareUrl = null;
    if (method === 'copy_link') {
      shareUrl = this._buildArticleShareUrl(article);
    }

    return {
      success: true,
      articleShare: this._enrichArticleShare(share),
      shareUrl: shareUrl,
      message: 'Article share recorded'
    };
  }

  // getOnlinePaymentOptions()
  getOnlinePaymentOptions() {
    return {
      payment_methods: ['credit_card', 'ach', 'check'],
      supports_guest_payment: true
    };
  }

  // lookupInvoiceByNumber(invoiceNumber)
  lookupInvoiceByNumber(invoiceNumber) {
    const invoice = this._matchInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return {
        found: false,
        invoice: null,
        message: 'Invoice not found'
      };
    }
    return {
      found: true,
      invoice: invoice,
      message: 'Invoice found'
    };
  }

  // initiateInvoicePaymentAttempt(...)
  initiateInvoicePaymentAttempt(
    invoiceNumber,
    amount,
    customerName,
    customerEmail,
    paymentMethod,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv,
    billingAddressLine1,
    billingAddressLine2,
    billingCity,
    billingState,
    billingPostalCode,
    currency
  ) {
    const attempts = this._getFromStorage('invoice_payment_attempts');
    const matchedInvoice = this._matchInvoiceByNumber(invoiceNumber);

    const attempt = {
      id: this._generateId('payattempt'),
      invoice_number: invoiceNumber,
      invoice_id: matchedInvoice ? matchedInvoice.id : null,
      amount: typeof amount === 'number' ? amount : 0,
      currency: currency || 'USD',
      customer_name: customerName || null,
      customer_email: customerEmail || null,
      payment_method: paymentMethod,
      card_number: cardNumber || null,
      card_expiration_month: typeof cardExpirationMonth === 'number' ? cardExpirationMonth : null,
      card_expiration_year: typeof cardExpirationYear === 'number' ? cardExpirationYear : null,
      card_cvv: cardCvv || null,
      billing_address_line1: billingAddressLine1 || null,
      billing_address_line2: billingAddressLine2 || null,
      billing_city: billingCity || null,
      billing_state: billingState || null,
      billing_postal_code: billingPostalCode || null,
      status: 'ready_for_submission',
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    attempts.push(attempt);
    this._saveToStorage('invoice_payment_attempts', attempts);

    return {
      success: true,
      paymentAttempt: this._enrichPaymentAttempt(attempt),
      matchedInvoice: matchedInvoice || null,
      message: 'Invoice payment attempt initiated'
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