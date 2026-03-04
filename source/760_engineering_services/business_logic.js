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
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keys = [
      'service_areas',
      'services',
      'quote_requests',
      'case_studies',
      'favorite_case_studies',
      'articles',
      'reading_list_items',
      'consultation_time_slots',
      'consultation_bookings',
      'product_design_packages',
      'product_design_package_compare_lists',
      'product_design_projects',
      'offices',
      'contact_inquiries',
      'cost_estimates',
      'estimate_emails',
      'experts',
      'expert_compare_lists',
      'service_proposals'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
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
    return data ? JSON.parse(data) : [];
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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // ----------------------
  // Internal helpers (compare lists / favorites / reading list)
  // ----------------------

  _getOrCreateProductDesignPackageCompareList() {
    const key = 'product_design_package_compare_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) {
      lists = [];
    }
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('pd_compare'),
      package_ids: [],
      created_at: this._getCurrentTimestamp()
    };
    lists.push(list);
    this._saveToStorage(key, lists);
    return list;
  }

  _getOrCreateFavoriteCaseStudyList() {
    // In this model, the "list" is simply the array under favorite_case_studies
    let favorites = this._getFromStorage('favorite_case_studies');
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('favorite_case_studies', favorites);
    }
    return favorites;
  }

  _getOrCreateReadingList() {
    let items = this._getFromStorage('reading_list_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('reading_list_items', items);
    }
    return items;
  }

  _getOrCreateExpertCompareList() {
    const key = 'expert_compare_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) {
      lists = [];
    }
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('expert_compare'),
      expert_ids: [],
      created_at: this._getCurrentTimestamp()
    };
    lists.push(list);
    this._saveToStorage(key, lists);
    return list;
  }

  // Generic helper to resolve a single foreign key field with "_id" suffix
  _attachForeignObject(record, fieldName, collectionKey, objectPropName) {
    if (!record || !record[fieldName]) return record;
    const collection = this._getFromStorage(collectionKey);
    const target = collection.find(function (item) { return item.id === record[fieldName]; }) || null;
    const prop = objectPropName || fieldName.replace(/_id$/, '');
    const clone = Object.assign({}, record);
    clone[prop] = target;
    return clone;
  }

  // ----------------------
  // 1) getPrimaryServiceAreas
  // ----------------------
  getPrimaryServiceAreas() {
    const serviceAreas = this._getFromStorage('service_areas');
    return {
      service_areas: serviceAreas,
      highlight_text: 'Explore our core engineering service areas tailored to complex projects.'
    };
  }

  // ----------------------
  // 2) getHomeEngagementShortcuts
  // ----------------------
  getHomeEngagementShortcuts() {
    const quick_actions = [
      {
        id: 'qa_request_quote_structural',
        type: 'request_quote',
        label: 'Request a Structural Quote',
        description: 'Share your project details to receive an engineering quote.',
        target_page: 'structural_engineering'
      },
      {
        id: 'qa_book_consultation',
        type: 'book_consultation',
        label: 'Book a Consultation',
        description: 'Schedule time with our senior engineers.',
        target_page: 'consultation_booking'
      },
      {
        id: 'qa_view_case_studies',
        type: 'view_case_studies',
        label: 'View Case Studies',
        description: 'See examples of delivered engineering projects.',
        target_page: 'case_studies'
      },
      {
        id: 'qa_use_cost_estimator',
        type: 'use_cost_estimator',
        label: 'Use Cost Estimator',
        description: 'Estimate project costs based on scope and size.',
        target_page: 'project_cost_estimator'
      }
    ];

    const support_shortcuts = [
      {
        id: 'support_contact',
        type: 'contact',
        label: 'Contact Us',
        target_page: 'contact_us'
      },
      {
        id: 'support_locations',
        type: 'locations',
        label: 'Our Offices',
        target_page: 'locations'
      },
      {
        id: 'support_experts',
        type: 'experts',
        label: 'Our Experts',
        target_page: 'our_experts'
      }
    ];

    return { quick_actions, support_shortcuts };
  }

  // ----------------------
  // 3) getHomeFeaturedContent
  // ----------------------
  getHomeFeaturedContent() {
    const caseStudies = this._getFromStorage('case_studies');
    const articles = this._getFromStorage('articles');

    const featured_case_studies = caseStudies.filter(function (cs) { return !!cs.is_featured; });

    // Sort articles by published_at desc and pick some recent ones
    const recent_articles = articles
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.published_at || 0).getTime();
        const db = new Date(b.published_at || 0).getTime();
        return db - da;
      })
      .slice(0, 5);

    return { featured_case_studies, recent_articles };
  }

  // ----------------------
  // 4) Structural Engineering overview & services
  // ----------------------
  getStructuralEngineeringOverview() {
    const serviceAreas = this._getFromStorage('service_areas');
    const serviceArea = serviceAreas.find(function (sa) { return sa.slug === 'structural_engineering'; }) || null;

    return {
      service_area: serviceArea,
      overview_html: '<p>Our structural engineering team delivers analysis, design, and assessment services across commercial, industrial, and infrastructure projects.</p>',
      typical_project_types: [
        'New building structural design',
        'Existing building structural assessment',
        'Seismic retrofit and strengthening',
        'Specialized equipment and support structures'
      ],
      cta_label: 'Request a structural quote'
    };
  }

  getStructuralEngineeringServices() {
    const serviceAreas = this._getFromStorage('service_areas');
    const services = this._getFromStorage('services');
    const seArea = serviceAreas.find(function (sa) { return sa.slug === 'structural_engineering'; });

    let filtered = [];
    if (seArea) {
      filtered = services.filter(function (svc) {
        return svc.service_area_id === seArea.id && svc.is_active;
      });
    }

    const cards = filtered.map((svc) => {
      const summary = svc.description || '';
      const primary_cta_label = 'Learn More';
      const withArea = this._attachForeignObject(svc, 'service_area_id', 'service_areas', 'service_area');
      return {
        service: withArea,
        summary: summary,
        is_highlighted: svc.slug === 'structural_analysis',
        primary_cta_label: primary_cta_label
      };
    });

    return { services: cards };
  }

  getStructuralAnalysisDetail() {
    const services = this._getFromStorage('services');
    const structuralService = services.find(function (svc) {
      return svc.slug === 'structural_analysis' && svc.is_active;
    }) || null;

    let serviceWithArea = structuralService;
    if (structuralService) {
      serviceWithArea = this._attachForeignObject(structuralService, 'service_area_id', 'service_areas', 'service_area');
    }

    const scope = 'Comprehensive structural analysis for existing and new structures, including load path verification, code compliance, and retrofit recommendations.';

    const deliverables = [
      'Detailed structural analysis report',
      'Capacity checks for critical members and connections',
      'Retrofit and strengthening concepts where required',
      'Executive summary suitable for non-technical stakeholders'
    ];

    const minBudget = structuralService && typeof structuralService.default_min_budget_usd === 'number'
      ? structuralService.default_min_budget_usd
      : 0;
    const maxBudget = structuralService && typeof structuralService.default_max_budget_usd === 'number'
      ? structuralService.default_max_budget_usd
      : 1000000;

    const available_delivery_timeframes = [
      'within_2_weeks',
      'within_4_weeks',
      'within_6_weeks',
      'within_8_weeks',
      'within_12_weeks',
      'flexible',
      'not_specified'
    ];

    return {
      service: serviceWithArea,
      scope: scope,
      deliverables: deliverables,
      quote_form_defaults: {
        min_budget_usd: minBudget,
        max_budget_usd: maxBudget,
        available_delivery_timeframes: available_delivery_timeframes,
        help_text: 'Provide as much detail as possible about your structure, occupancy, and any known issues.'
      }
    };
  }

  submitStructuralAnalysisQuoteRequest(
    projectTitle,
    estimatedBudgetUsd,
    deliveryTimeframe,
    projectDetails,
    contactFullName,
    contactEmail
  ) {
    const services = this._getFromStorage('services');
    const structuralService = services.find(function (svc) {
      return svc.slug === 'structural_analysis' && svc.is_active;
    });

    if (!structuralService) {
      return {
        success: false,
        quote_request: null,
        message: 'Structural Analysis service is not available.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests');

    const now = this._getCurrentTimestamp();
    const quoteRequest = {
      id: this._generateId('quote'),
      service_id: structuralService.id,
      project_title: projectTitle,
      estimated_budget_usd: estimatedBudgetUsd,
      delivery_timeframe: deliveryTimeframe,
      project_details: projectDetails,
      contact_full_name: contactFullName,
      contact_email: contactEmail,
      submitted_at: now,
      status: 'new'
    };

    quoteRequests.push(quoteRequest);
    this._saveToStorage('quote_requests', quoteRequests);

    // Attach service for convenience (foreign key resolution)
    const enriched = this._attachForeignObject(quoteRequest, 'service_id', 'services', 'service');

    return {
      success: true,
      quote_request: enriched,
      message: 'Your structural analysis quote request has been submitted.'
    };
  }

  // ----------------------
  // 5) Industrial Engineering & Plant Layout Optimization
  // ----------------------
  getIndustrialEngineeringOverview() {
    const serviceAreas = this._getFromStorage('service_areas');
    const serviceArea = serviceAreas.find(function (sa) { return sa.slug === 'industrial_engineering'; }) || null;

    return {
      service_area: serviceArea,
      overview_html: '<p>Our industrial engineering team optimizes manufacturing systems, plant layouts, and material flows to maximize throughput and safety.</p>',
      supported_industries: [
        'automotive',
        'renewable_energy',
        'aerospace',
        'healthcare',
        'consumer_products',
        'industrial_manufacturing',
        'commercial_buildings',
        'data_centers',
        'other'
      ]
    };
  }

  getIndustrialEngineeringServices() {
    const serviceAreas = this._getFromStorage('service_areas');
    const services = this._getFromStorage('services');
    const ieArea = serviceAreas.find(function (sa) { return sa.slug === 'industrial_engineering'; });

    let filtered = [];
    if (ieArea) {
      filtered = services.filter(function (svc) {
        return svc.service_area_id === ieArea.id && svc.is_active;
      });
    }

    const cards = filtered.map((svc) => {
      const withArea = this._attachForeignObject(svc, 'service_area_id', 'service_areas', 'service_area');
      return {
        service: withArea,
        summary: svc.description || '',
        primary_cta_label: svc.slug === 'plant_layout_optimization' ? 'Start a Proposal' : 'Learn More'
      };
    });

    return { services: cards };
  }

  getPlantLayoutOptimizationDetail() {
    const services = this._getFromStorage('services');
    const plantService = services.find(function (svc) {
      return svc.slug === 'plant_layout_optimization' && svc.is_active;
    }) || null;

    let serviceWithArea = plantService;
    if (plantService) {
      serviceWithArea = this._attachForeignObject(plantService, 'service_area_id', 'service_areas', 'service_area');
    }

    const approach = 'We combine process mapping, discrete-event simulation, and ergonomic reviews to design plant layouts that increase throughput while reducing risk and material handling.';

    const expected_outcomes = [
      'Higher line throughput and OEE',
      'Reduced WIP and material handling distances',
      'Improved safety and ergonomics',
      'Clear implementation roadmap and phasing plan'
    ];

    return {
      service: serviceWithArea,
      approach: approach,
      expected_outcomes: expected_outcomes,
      proposal_cta_label: 'Start a plant layout proposal'
    };
  }

  getPlantLayoutOptimizationProposalConfig() {
    const industries = [
      'automotive',
      'renewable_energy',
      'aerospace',
      'healthcare',
      'consumer_products',
      'industrial_manufacturing',
      'commercial_buildings',
      'data_centers',
      'other'
    ].map(function (val) {
      const label = val
        .split('_')
        .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
        .join(' ');
      return {
        value: val,
        label: label,
        description: ''
      };
    });

    const budget = {
      min_allowed_usd: 10000,
      max_allowed_usd: 1000000,
      default_min_usd: 50000,
      default_max_usd: 75000,
      step_usd: 5000
    };

    const now = new Date();
    const earliest = new Date(now.getTime());
    earliest.setDate(earliest.getDate() + 7); // earliest start in 1 week
    const latest = new Date(now.getTime());
    latest.setFullYear(latest.getFullYear() + 1); // up to 1 year from now

    const start_date_constraints = {
      earliest_start_date: earliest.toISOString(),
      latest_start_date: latest.toISOString()
    };

    return { industries, budget, start_date_constraints };
  }

  submitPlantLayoutOptimizationProposal(
    industry,
    budgetMinUsd,
    budgetMaxUsd,
    projectStartDate,
    projectDescription
  ) {
    const services = this._getFromStorage('services');
    const plantService = services.find(function (svc) {
      return svc.slug === 'plant_layout_optimization' && svc.is_active;
    });

    if (!plantService) {
      return {
        success: false,
        proposal: null,
        message: 'Plant Layout Optimization service is not available.'
      };
    }

    const proposals = this._getFromStorage('service_proposals');
    const now = this._getCurrentTimestamp();

    const startDateIso = new Date(projectStartDate).toISOString();

    const proposal = {
      id: this._generateId('proposal'),
      service_id: plantService.id,
      service_type: 'plant_layout_optimization',
      industry: industry,
      budget_min_usd: budgetMinUsd,
      budget_max_usd: budgetMaxUsd,
      project_start_date: startDateIso,
      project_description: projectDescription,
      created_at: now,
      status: 'submitted',
      current_step: 3
    };

    proposals.push(proposal);
    this._saveToStorage('service_proposals', proposals);

    const enriched = this._attachForeignObject(proposal, 'service_id', 'services', 'service');

    return {
      success: true,
      proposal: enriched,
      message: 'Your plant layout optimization proposal has been submitted.'
    };
  }

  // ----------------------
  // 6) Product Design
  // ----------------------
  getProductDesignOverview() {
    return {
      overview_html: '<p>Our product design team supports concept-to-launch development, including industrial design, mechanical engineering, and DFM.</p>',
      engagement_models: [
        'Fixed-scope package engagements',
        'Time-and-materials innovation sprints',
        'Embedded engineering team extension'
      ]
    };
  }

  getProductDesignPackages(maxBudgetUsd) {
    const packages = this._getFromStorage('product_design_packages');
    let filtered = packages.filter(function (p) { return p.is_active; });

    if (typeof maxBudgetUsd === 'number') {
      filtered = filtered.filter(function (p) { return p.price_usd <= maxBudgetUsd; });
    }

    return { packages: filtered };
  }

  addProductDesignPackageToCompareList(packageId) {
    const packages = this._getFromStorage('product_design_packages');
    const pkg = packages.find(function (p) { return p.id === packageId && p.is_active; });

    if (!pkg) {
      return {
        success: false,
        compare_list: null,
        message: 'Package not found or inactive.'
      };
    }

    const key = 'product_design_package_compare_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];

    let list;
    if (lists.length === 0) {
      list = {
        id: this._generateId('pd_compare'),
        package_ids: [],
        created_at: this._getCurrentTimestamp()
      };
      lists.push(list);
    } else {
      list = lists[0];
    }

    if (list.package_ids.indexOf(packageId) === -1) {
      list.package_ids.push(packageId);
      this._saveToStorage(key, lists);
    }

    return {
      success: true,
      compare_list: list,
      message: 'Package added to comparison list.'
    };
  }

  removeProductDesignPackageFromCompareList(packageId) {
    const key = 'product_design_package_compare_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists) || lists.length === 0) {
      return {
        success: true,
        compare_list: null,
        message: 'No compare list to update.'
      };
    }

    const list = lists[0];
    list.package_ids = list.package_ids.filter(function (id) { return id !== packageId; });
    this._saveToStorage(key, lists);

    return {
      success: true,
      compare_list: list,
      message: 'Package removed from comparison list.'
    };
  }

  getProductDesignPackageCompareList() {
    const compare_list = this._getOrCreateProductDesignPackageCompareList();
    const packagesAll = this._getFromStorage('product_design_packages');

    const packages = packagesAll.filter(function (p) {
      return compare_list.package_ids.indexOf(p.id) !== -1;
    });

    const comparison_rows = [];

    // Price row
    comparison_rows.push({
      key: 'price_usd',
      label: 'Price (USD)',
      values: packages.map(function (p) {
        return typeof p.price_usd === 'number' ? String(p.price_usd) : '';
      })
    });

    // Delivery time row
    comparison_rows.push({
      key: 'estimated_delivery_weeks',
      label: 'Estimated delivery (weeks)',
      values: packages.map(function (p) {
        return typeof p.estimated_delivery_weeks === 'number' ? String(p.estimated_delivery_weeks) : '';
      })
    });

    // Max revisions
    comparison_rows.push({
      key: 'max_revisions',
      label: 'Max revisions',
      values: packages.map(function (p) {
        return typeof p.max_revisions === 'number' ? String(p.max_revisions) : 'N/A';
      })
    });

    // Support level
    comparison_rows.push({
      key: 'support_level',
      label: 'Support level',
      values: packages.map(function (p) {
        return p.support_level ? p.support_level.replace(/_/g, ' ') : '';
      })
    });

    return { compare_list, packages, comparison_rows };
  }

  startProductDesignProject(selectedPackageId, projectName, targetLaunchDate) {
    const packages = this._getFromStorage('product_design_packages');
    const pkg = packages.find(function (p) { return p.id === selectedPackageId && p.is_active; });

    if (!pkg) {
      return {
        success: false,
        project: null,
        message: 'Selected product design package not found or inactive.'
      };
    }

    const projects = this._getFromStorage('product_design_projects');
    const now = this._getCurrentTimestamp();

    const launchIso = new Date(targetLaunchDate).toISOString();

    const project = {
      id: this._generateId('pd_project'),
      selected_package_id: selectedPackageId,
      project_name: projectName,
      target_launch_date: launchIso,
      created_at: now,
      status: 'submitted'
    };

    projects.push(project);
    this._saveToStorage('product_design_projects', projects);

    const enriched = this._attachForeignObject(project, 'selected_package_id', 'product_design_packages', 'selected_package');

    return {
      success: true,
      project: enriched,
      message: 'Product design project has been started.'
    };
  }

  // ----------------------
  // 7) Case Studies & Favorites
  // ----------------------
  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies');
    const industriesEnum = [
      'renewable_energy',
      'automotive',
      'aerospace',
      'healthcare',
      'consumer_products',
      'industrial_manufacturing',
      'commercial_buildings',
      'data_centers',
      'other'
    ];

    // Offer all industries regardless of availability
    const industries = industriesEnum.map(function (val) {
      const label = val
        .split('_')
        .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
        .join(' ');
      return { value: val, label: label };
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    const completion_year_ranges = [
      {
        id: 'last_3_years',
        label: 'Last 3 years',
        from_year: currentYear - 2,
        to_year: currentYear
      },
      {
        id: 'last_5_years',
        label: 'Last 5 years',
        from_year: currentYear - 4,
        to_year: currentYear
      },
      {
        id: 'all_time',
        label: 'All time',
        from_year: 1970,
        to_year: currentYear
      }
    ];

    // Derive budget range from data if available
    let minBudget = null;
    let maxBudget = null;
    for (let i = 0; i < caseStudies.length; i++) {
      const b = caseStudies[i].budget_usd;
      if (typeof b === 'number') {
        if (minBudget === null || b < minBudget) minBudget = b;
        if (maxBudget === null || b > maxBudget) maxBudget = b;
      }
    }
    if (minBudget === null) minBudget = 0;
    if (maxBudget === null) maxBudget = 10000000;

    const budget_range = {
      min_usd: minBudget,
      max_usd: maxBudget,
      step_usd: 50000
    };

    return { industries, completion_year_ranges, budget_range };
  }

  searchCaseStudies(filters, sort, page, pageSize) {
    let results = this._getFromStorage('case_studies');

    filters = filters || {};

    if (filters.industry) {
      results = results.filter(function (cs) { return cs.industry === filters.industry; });
    }
    if (typeof filters.minCompletionYear === 'number') {
      results = results.filter(function (cs) { return cs.completion_year >= filters.minCompletionYear; });
    }
    if (typeof filters.maxCompletionYear === 'number') {
      results = results.filter(function (cs) { return cs.completion_year <= filters.maxCompletionYear; });
    }
    if (typeof filters.minBudgetUsd === 'number') {
      results = results.filter(function (cs) { return cs.budget_usd >= filters.minBudgetUsd; });
    }
    if (typeof filters.maxBudgetUsd === 'number') {
      results = results.filter(function (cs) { return cs.budget_usd <= filters.maxBudgetUsd; });
    }
    if (typeof filters.isFeatured === 'boolean') {
      results = results.filter(function (cs) { return !!cs.is_featured === filters.isFeatured; });
    }

    // Sorting
    sort = sort || {};
    const sortBy = sort.sortBy || 'completion_year';
    const sortDirection = sort.sortDirection || 'desc';

    results = results.slice().sort(function (a, b) {
      let av;
      let bv;
      if (sortBy === 'budget') {
        av = a.budget_usd || 0;
        bv = b.budget_usd || 0;
      } else if (sortBy === 'completion_year') {
        av = a.completion_year || 0;
        bv = b.completion_year || 0;
      } else {
        // title
        av = (a.title || '').toLowerCase();
        bv = (b.title || '').toLowerCase();
      }

      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    page = page || 1;
    pageSize = pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const paged = results.slice(start, end);

    return {
      results: paged,
      total: results.length,
      page: page,
      pageSize: pageSize
    };
  }

  addCaseStudyToFavorites(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find(function (c) { return c.id === caseStudyId; });

    if (!cs) {
      return {
        success: false,
        favorite: null,
        message: 'Case study not found.'
      };
    }

    let favorites = this._getFromStorage('favorite_case_studies');
    if (!Array.isArray(favorites)) favorites = [];

    const existing = favorites.find(function (f) { return f.case_study_id === caseStudyId; });
    if (existing) {
      const enrichedExisting = Object.assign({}, existing, { case_study: cs });
      return {
        success: true,
        favorite: enrichedExisting,
        message: 'Case study is already in favorites.'
      };
    }

    const favorite = {
      id: this._generateId('fav_cs'),
      case_study_id: caseStudyId,
      saved_at: this._getCurrentTimestamp(),
      notes: ''
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_case_studies', favorites);

    const enriched = Object.assign({}, favorite, { case_study: cs });

    return {
      success: true,
      favorite: enriched,
      message: 'Case study added to favorites.'
    };
  }

  removeCaseStudyFromFavorites(caseStudyId) {
    let favorites = this._getFromStorage('favorite_case_studies');
    if (!Array.isArray(favorites)) favorites = [];

    const newFavorites = favorites.filter(function (f) { return f.case_study_id !== caseStudyId; });
    this._saveToStorage('favorite_case_studies', newFavorites);

    return {
      success: true,
      message: 'Case study removed from favorites.'
    };
  }

  getFavoriteCaseStudies() {
    const favorites = this._getFromStorage('favorite_case_studies');
    const caseStudies = this._getFromStorage('case_studies');

    const combined = favorites.map(function (fav) {
      const cs = caseStudies.find(function (c) { return c.id === fav.case_study_id; }) || null;
      return { favorite: fav, case_study: cs };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_favoritesViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { favorites: combined };
  }

  // ----------------------
  // 8) Articles & Reading List
  // ----------------------
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const now = new Date();

    const toDate = now.toISOString();
    const last12 = new Date(now.getTime());
    last12.setFullYear(last12.getFullYear() - 1);

    const date_ranges = [
      {
        id: 'last_12_months',
        label: 'Last 12 months',
        from_date: last12.toISOString(),
        to_date: toDate
      },
      {
        id: 'all_time',
        label: 'All time',
        from_date: new Date(2000, 0, 1).toISOString(),
        to_date: toDate
      }
    ];

    // Derive categories and tags from existing articles
    const categoryMap = {};
    const tagSet = {};

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.category) {
        categoryMap[a.category] = true;
      }
      if (Array.isArray(a.tags)) {
        for (let j = 0; j < a.tags.length; j++) {
          tagSet[a.tags[j]] = true;
        }
      }
    }

    const categories = Object.keys(categoryMap).map(function (cat) {
      return { value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) };
    });

    const tags = Object.keys(tagSet);

    return { date_ranges, categories, tags };
  }

  searchArticles(query, filters, sort, page, pageSize) {
    let results = this._getFromStorage('articles');

    query = (query || '').trim();
    filters = filters || {};

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(function (a) {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return (
          title.indexOf(q) !== -1 ||
          summary.indexOf(q) !== -1 ||
          body.indexOf(q) !== -1 ||
          tags.indexOf(q) !== -1
        );
      });
    }

    if (filters.dateRangeId) {
      const options = this.getArticleFilterOptions();
      const range = options.date_ranges.find(function (dr) { return dr.id === filters.dateRangeId; });
      if (range) {
        const fromTime = new Date(range.from_date).getTime();
        const toTime = new Date(range.to_date).getTime();
        results = results.filter(function (a) {
          const t = new Date(a.published_at || 0).getTime();
          return t >= fromTime && t <= toTime;
        });
      }
    }

    if (filters.category) {
      results = results.filter(function (a) { return a.category === filters.category; });
    }

    if (filters.tag) {
      const tagLower = String(filters.tag).toLowerCase();
      results = results.filter(function (a) {
        if (!Array.isArray(a.tags)) return false;
        return a.tags.some(function (t) { return String(t).toLowerCase() === tagLower; });
      });
    }

    // Sorting
    sort = sort || {};
    const sortBy = sort.sortBy || 'published_at';
    const sortDirection = sort.sortDirection || 'desc';

    results = results.slice().sort(function (a, b) {
      let av;
      let bv;
      if (sortBy === 'published_at') {
        av = new Date(a.published_at || 0).getTime();
        bv = new Date(b.published_at || 0).getTime();
      } else {
        av = (a.title || '').toLowerCase();
        bv = (b.title || '').toLowerCase();
      }
      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    page = page || 1;
    pageSize = pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = results.slice(start, end);

    return {
      results: paged,
      total: results.length,
      page: page,
      pageSize: pageSize
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;

    const readingItems = this._getFromStorage('reading_list_items');
    const is_saved_to_reading_list = !!readingItems.find(function (item) { return item.article_id === articleId; });

    return { article, is_saved_to_reading_list };
  }

  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(function (a) { return a.id === articleId; });

    if (!article) {
      return {
        success: false,
        item: null,
        message: 'Article not found.'
      };
    }

    let items = this._getFromStorage('reading_list_items');
    if (!Array.isArray(items)) items = [];

    const existing = items.find(function (it) { return it.article_id === articleId; });
    if (existing) {
      return {
        success: true,
        item: existing,
        message: 'Article is already in your reading list.'
      };
    }

    const item = {
      id: this._generateId('reading_item'),
      article_id: articleId,
      saved_at: this._getCurrentTimestamp()
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      item: item,
      message: 'Article saved to your reading list.'
    };
  }

  removeArticleFromReadingList(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    if (!Array.isArray(items)) items = [];

    const newItems = items.filter(function (it) { return it.id !== readingListItemId; });
    this._saveToStorage('reading_list_items', newItems);

    return {
      success: true,
      message: 'Article removed from your reading list.'
    };
  }

  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const combined = items.map(function (it) {
      const article = articles.find(function (a) { return a.id === it.article_id; }) || null;
      return { reading_list_item: it, article: article };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_readingListViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { items: combined };
  }

  // ----------------------
  // 9) Consultation booking
  // ----------------------
  getConsultationOptions() {
    const topicsValues = [
      'industrial_automation',
      'structural_engineering',
      'product_design',
      'hvac_design',
      'general_consultation',
      'other'
    ];

    const topics = topicsValues.map(function (val) {
      const label = val
        .split('_')
        .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
        .join(' ');
      return {
        value: val,
        label: label,
        description: ''
      };
    });

    const formatsValues = ['virtual', 'in_person', 'phone'];
    const formats = formatsValues.map(function (val) {
      const label = val
        .split('_')
        .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
        .join(' ');
      return { value: val, label: label };
    });

    const durations = [
      { minutes: 30, label: '30 minutes', is_default: true },
      { minutes: 60, label: '60 minutes', is_default: false }
    ];

    return { topics, formats, durations };
  }

  getAvailableConsultationSlots(topic, preferredFormat, fromDate, toDate, durationMinutes) {
    let slots = this._getFromStorage('consultation_time_slots');

    slots = slots.filter(function (slot) {
      if (!slot.is_available) return false;

      // Format filter
      if (preferredFormat && preferredFormat !== 'any') {
        if (!(slot.allowed_format === preferredFormat || slot.allowed_format === 'any')) {
          return false;
        }
      }

      // Date window filter
      if (fromDate) {
        const fromTime = new Date(fromDate).getTime();
        if (new Date(slot.start_datetime).getTime() < fromTime) return false;
      }
      if (toDate) {
        const toTime = new Date(toDate).getTime();
        if (new Date(slot.start_datetime).getTime() > toTime) return false;
      }

      // Duration filter
      if (typeof durationMinutes === 'number' && slot.duration_minutes !== durationMinutes) {
        return false;
      }

      return true;
    });

    // Currently we ignore topic, as slots are not tagged by topic in the model.

    // Sort by start time ascending
    slots = slots.slice().sort(function (a, b) {
      const ta = new Date(a.start_datetime).getTime();
      const tb = new Date(b.start_datetime).getTime();
      return ta - tb;
    });

    return { slots: slots };
  }

  bookConsultation(topic, format, timeSlotId, name, email, projectSummary) {
    const slots = this._getFromStorage('consultation_time_slots');
    const bookings = this._getFromStorage('consultation_bookings');

    const slot = slots.find(function (s) { return s.id === timeSlotId; });

    if (!slot) {
      return {
        success: false,
        booking: null,
        message: 'Selected time slot not found.'
      };
    }

    if (!slot.is_available) {
      return {
        success: false,
        booking: null,
        message: 'Selected time slot is no longer available.'
      };
    }

    if (!(slot.allowed_format === 'any' || slot.allowed_format === format)) {
      return {
        success: false,
        booking: null,
        message: 'Selected time slot does not support the requested format.'
      };
    }

    const now = this._getCurrentTimestamp();

    const booking = {
      id: this._generateId('consultation'),
      topic: topic,
      format: format,
      time_slot_id: timeSlotId,
      start_datetime: slot.start_datetime,
      duration_minutes: slot.duration_minutes,
      name: name,
      email: email,
      project_summary: projectSummary,
      created_at: now,
      status: 'requested'
    };

    bookings.push(booking);

    // Mark slot as no longer available
    slot.is_available = false;

    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('consultation_time_slots', slots);

    const enriched = this._attachForeignObject(booking, 'time_slot_id', 'consultation_time_slots', 'time_slot');

    return {
      success: true,
      booking: enriched,
      message: 'Consultation booked successfully.'
    };
  }

  // ----------------------
  // 10) Contact form & Locations / Offices
  // ----------------------
  getContactFormConfig() {
    const fields = [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        placeholder: 'Your full name',
        max_length: 200
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'you@example.com',
        max_length: 200
      },
      {
        name: 'phone',
        label: 'Phone',
        type: 'phone',
        required: false,
        placeholder: '+49 ...',
        max_length: 50
      },
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
        placeholder: 'How can we help?',
        max_length: 5000
      }
    ];

    return { fields: fields };
  }

  submitContactInquiry(name, email, phone, message) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const now = this._getCurrentTimestamp();

    const inquiry = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      phone: phone || '',
      message: message,
      submitted_at: now,
      source: 'contact_form'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      inquiry: inquiry,
      message: 'Your message has been sent.'
    };
  }

  getLocationFilterOptions() {
    const offices = this._getFromStorage('offices');

    const countriesEnum = [
      'germany',
      'united_states',
      'united_kingdom',
      'france',
      'canada',
      'china',
      'india',
      'japan',
      'brazil',
      'australia',
      'other'
    ];

    const countries = countriesEnum.map(function (val) {
      const label = val
        .split('_')
        .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
        .join(' ');
      return { value: val, label: label };
    });

    const regionMap = {};
    for (let i = 0; i < offices.length; i++) {
      const r = offices[i].region;
      if (r) regionMap[r] = true;
    }
    const regions = Object.keys(regionMap).map(function (id) {
      return { id: id, label: id };
    });

    return { countries, regions };
  }

  searchOffices(filters) {
    let offices = this._getFromStorage('offices');
    filters = filters || {};

    if (filters.country) {
      offices = offices.filter(function (o) { return o.country === filters.country; });
    }
    if (filters.region) {
      offices = offices.filter(function (o) { return o.region === filters.region; });
    }
    if (filters.city) {
      const cityLower = String(filters.city).toLowerCase();
      offices = offices.filter(function (o) { return (o.city || '').toLowerCase() === cityLower; });
    }

    return { offices: offices };
  }

  getOfficeDetail(officeId) {
    const offices = this._getFromStorage('offices');
    const office = offices.find(function (o) { return o.id === officeId; }) || null;
    return office;
  }

  // ----------------------
  // 11) Cost estimator
  // ----------------------
  getCostEstimatorOptions() {
    const project_types = [
      {
        value: 'hvac_design',
        label: 'HVAC Design',
        description: 'Heating, ventilation, and air conditioning system design.'
      },
      {
        value: 'structural_analysis',
        label: 'Structural Analysis',
        description: 'Analytical assessment of structural systems.'
      },
      {
        value: 'plant_layout_optimization',
        label: 'Plant Layout Optimization',
        description: 'Material flow and layout optimization.'
      },
      {
        value: 'product_design',
        label: 'Product Design',
        description: 'End-to-end product development.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Custom project type.'
      }
    ];

    const facility_types = [
      { value: 'industrial', label: 'Industrial' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'office', label: 'Office' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'data_center', label: 'Data center' },
      { value: 'other', label: 'Other' }
    ];

    const timelines = [
      { value: '3_months', label: '3 months' },
      { value: '6_months', label: '6 months' },
      { value: '9_months', label: '9 months' },
      { value: '12_months', label: '12 months' },
      { value: 'other', label: 'Other' }
    ];

    const default_currency = 'usd';

    return { project_types, facility_types, timelines, default_currency };
  }

  generateCostEstimate(projectType, facilityType, facilitySizeSqFt, timeline, currency) {
    const options = this.getCostEstimatorOptions();
    const defaultCurrency = options.default_currency || 'usd';
    const cur = currency || defaultCurrency;

    // Basic rate heuristics (no real cost data stored, just rules)
    let baseRatePerSqFt = 1.0;

    if (projectType === 'hvac_design') {
      baseRatePerSqFt = 2.5;
    } else if (projectType === 'structural_analysis') {
      baseRatePerSqFt = 1.8;
    } else if (projectType === 'plant_layout_optimization') {
      baseRatePerSqFt = 3.0;
    } else if (projectType === 'product_design') {
      baseRatePerSqFt = 2.0;
    } else {
      baseRatePerSqFt = 1.5;
    }

    if (facilityType === 'industrial' || facilityType === 'data_center') {
      baseRatePerSqFt *= 1.2;
    } else if (facilityType === 'warehouse') {
      baseRatePerSqFt *= 0.8;
    }

    let timelineFactor = 1.0;
    if (timeline === '3_months') timelineFactor = 1.3;
    else if (timeline === '6_months') timelineFactor = 1.0;
    else if (timeline === '9_months') timelineFactor = 0.9;
    else if (timeline === '12_months') timelineFactor = 0.85;

    const size = typeof facilitySizeSqFt === 'number' ? facilitySizeSqFt : 0;

    const baseCost = size * baseRatePerSqFt * timelineFactor;
    const estimatedLow = Math.round(baseCost * 0.9);
    const estimatedHigh = Math.round(baseCost * 1.1);

    const assumptions = [
      'Estimate generated using internal cost heuristics; not a formal proposal.',
      'Assumes typical complexity and standard code requirements for the given facility type.',
      'Excludes travel, permitting fees, and third-party review costs.'
    ];

    const estimates = this._getFromStorage('cost_estimates');
    const estimate = {
      id: this._generateId('estimate'),
      project_type: projectType,
      facility_type: facilityType,
      facility_size_sq_ft: size,
      timeline: timeline,
      estimated_cost_low: estimatedLow,
      estimated_cost_high: estimatedHigh,
      currency: cur,
      assumptions: assumptions,
      created_at: this._getCurrentTimestamp()
    };

    estimates.push(estimate);
    this._saveToStorage('cost_estimates', estimates);

    return {
      estimate: estimate,
      message: 'Estimate generated successfully.'
    };
  }

  emailCostEstimate(estimateId, recipientName, recipientEmail) {
    const estimates = this._getFromStorage('cost_estimates');
    const estimate = estimates.find(function (e) { return e.id === estimateId; });

    if (!estimate) {
      return {
        success: false,
        email_record: null,
        message: 'Estimate not found.'
      };
    }

    const emails = this._getFromStorage('estimate_emails');
    const emailRecord = {
      id: this._generateId('estimate_email'),
      estimate_id: estimateId,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      sent_at: this._getCurrentTimestamp()
    };

    emails.push(emailRecord);
    this._saveToStorage('estimate_emails', emails);

    return {
      success: true,
      email_record: emailRecord,
      message: 'Estimate emailed successfully (recorded).' 
    };
  }

  // ----------------------
  // 12) Experts & Expert compare list
  // ----------------------
  getExpertFilterOptions() {
    const specializationsEnum = [
      'finite_element_analysis_fea',
      'structural_engineering',
      'industrial_engineering',
      'product_design',
      'hvac_engineering',
      'automation_engineering',
      'quality_management',
      'other'
    ];

    const specializations = specializationsEnum.map(function (val) {
      const label = val
        .split('_')
        .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
        .join(' ');
      return { value: val, label: label };
    });

    const experience = {
      min_years: 0,
      max_years: 40,
      step_years: 1
    };

    const rating = {
      min_rating: 0,
      max_rating: 5,
      step: 0.5
    };

    return { specializations, experience, rating };
  }

  searchExperts(filters, sort, page, pageSize) {
    let experts = this._getFromStorage('experts');
    const offices = this._getFromStorage('offices');

    filters = filters || {};

    if (filters.specialization) {
      experts = experts.filter(function (e) { return e.specialization === filters.specialization; });
    }
    if (typeof filters.minYearsExperience === 'number') {
      experts = experts.filter(function (e) { return e.years_experience >= filters.minYearsExperience; });
    }
    if (typeof filters.minClientRating === 'number') {
      experts = experts.filter(function (e) { return e.client_rating >= filters.minClientRating; });
    }
    if (filters.officeId) {
      experts = experts.filter(function (e) { return e.office_id === filters.officeId; });
    }

    // Sorting
    sort = sort || {};
    const sortBy = sort.sortBy || 'full_name';
    const sortDirection = sort.sortDirection || 'asc';

    experts = experts.slice().sort(function (a, b) {
      let av;
      let bv;
      if (sortBy === 'years_experience') {
        av = a.years_experience || 0;
        bv = b.years_experience || 0;
      } else if (sortBy === 'client_rating') {
        av = a.client_rating || 0;
        bv = b.client_rating || 0;
      } else {
        av = (a.full_name || '').toLowerCase();
        bv = (b.full_name || '').toLowerCase();
      }
      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    page = page || 1;
    pageSize = pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    let paged = experts.slice(start, end);

    // Attach office objects (foreign key resolution)
    paged = paged.map(function (e) {
      const office = e.office_id ? offices.find(function (o) { return o.id === e.office_id; }) || null : null;
      const clone = Object.assign({}, e);
      clone.office = office;
      return clone;
    });

    return {
      results: paged,
      total: experts.length,
      page: page,
      pageSize: pageSize
    };
  }

  addExpertToCompareList(expertId) {
    const experts = this._getFromStorage('experts');
    const expert = experts.find(function (e) { return e.id === expertId; });

    if (!expert) {
      return {
        success: false,
        compare_list: null,
        experts: [],
        message: 'Expert not found.'
      };
    }

    const key = 'expert_compare_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];

    let list;
    if (lists.length === 0) {
      list = {
        id: this._generateId('expert_compare'),
        expert_ids: [],
        created_at: this._getCurrentTimestamp()
      };
      lists.push(list);
    } else {
      list = lists[0];
    }

    if (list.expert_ids.indexOf(expertId) === -1) {
      list.expert_ids.push(expertId);
      this._saveToStorage(key, lists);
    }

    const selectedExperts = experts.filter(function (e) { return list.expert_ids.indexOf(e.id) !== -1; });

    return {
      success: true,
      compare_list: list,
      experts: selectedExperts,
      message: 'Expert added to comparison list.'
    };
  }

  removeExpertFromCompareList(expertId) {
    const key = 'expert_compare_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists) || lists.length === 0) {
      return {
        success: true,
        compare_list: null,
        experts: [],
        message: 'No compare list to update.'
      };
    }

    const experts = this._getFromStorage('experts');
    const list = lists[0];
    list.expert_ids = list.expert_ids.filter(function (id) { return id !== expertId; });
    this._saveToStorage(key, lists);

    const selectedExperts = experts.filter(function (e) { return list.expert_ids.indexOf(e.id) !== -1; });

    return {
      success: true,
      compare_list: list,
      experts: selectedExperts,
      message: 'Expert removed from comparison list.'
    };
  }

  getExpertCompareList() {
    const compare_list = this._getOrCreateExpertCompareList();
    const expertsAll = this._getFromStorage('experts');
    const offices = this._getFromStorage('offices');

    let experts = expertsAll.filter(function (e) {
      return compare_list.expert_ids.indexOf(e.id) !== -1;
    });

    experts = experts.map(function (e) {
      const office = e.office_id ? offices.find(function (o) { return o.id === e.office_id; }) || null : null;
      const clone = Object.assign({}, e);
      clone.office = office;
      return clone;
    });

    // Instrumentation for task completion tracking
    try {
      if (experts && experts.length >= 3) {
        localStorage.setItem('task8_expertCompareViewed', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { compare_list, experts };
  }

  // ----------------------
  // 13) About page content
  // ----------------------
  getAboutPageContent() {
    return {
      mission_html: '<p>We help clients design and operate safer, more efficient engineering systems through rigorous analysis and practical implementation support.</p>',
      history_html: '<p>Founded by practicing engineers, our firm has delivered projects across structural, industrial, and product design disciplines for clients worldwide.</p>',
      core_competencies: [
        'Structural analysis and retrofit',
        'Industrial automation and plant optimization',
        'Integrated product design and development',
        'Quality and compliance engineering'
      ],
      differentiators: [
        'Hands-on engineering teams with field experience',
        'Data-driven decision making and simulation capability',
        'Flexible engagement models from advisory to full delivery'
      ],
      certifications: [
        'Professional engineering licenses in multiple jurisdictions',
        'Industry-standard safety and quality training'
      ],
      quality_standards: [
        'ISO 9001-aligned quality management practices',
        'Documented design review and verification workflows'
      ]
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