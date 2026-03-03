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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'consulting_services',
      'service_level_options',
      'quote_requests',
      'investigation_packages',
      'saved_investigation_plans',
      'project_case_studies',
      'resources',
      'tools',
      'consultation_availability_slots',
      'consultation_bookings',
      'bearing_capacity_results',
      'bearing_capacity_calculation_cache',
      'newsletter_subscriptions',
      'team_members',
      'project_team_shortlist'
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

  // ===================== Helper functions =====================

  _mapEnumToDisplayLabel(value) {
    if (!value || typeof value !== 'string') return '';
    const parts = value.split('_');
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    }
    return parts.join(' ');
  }

  _filterAndSortEntities(items, options) {
    const filters = (options && options.filters) || null;
    const sortBy = (options && options.sortBy) || null;
    const limit = (options && options.limit) != null ? options.limit : null;
    const offset = (options && options.offset) != null ? options.offset : 0;
    const comparator = (options && options.comparator) || null;

    let result = Array.isArray(items) ? items.slice() : [];

    if (filters && typeof filters === 'object') {
      result = result.filter(function (item) {
        for (const key in filters) {
          if (!Object.prototype.hasOwnProperty.call(filters, key)) continue;
          const predicate = filters[key];
          if (typeof predicate === 'function') {
            if (!predicate(item[key], item)) return false;
          }
        }
        return true;
      });
    }

    if (comparator && typeof comparator === 'function') {
      result.sort(comparator);
    } else if (sortBy) {
      if (sortBy === 'project_value_high_to_low') {
        result.sort(function (a, b) {
          return (b.projectValueUsd || 0) - (a.projectValueUsd || 0);
        });
      } else if (sortBy === 'project_value_low_to_high') {
        result.sort(function (a, b) {
          return (a.projectValueUsd || 0) - (b.projectValueUsd || 0);
        });
      } else if (sortBy === 'completion_date_newest') {
        result.sort(function (a, b) {
          const da = a.completionDate ? Date.parse(a.completionDate) : 0;
          const db = b.completionDate ? Date.parse(b.completionDate) : 0;
          return db - da;
        });
      } else if (sortBy === 'published_date_newest') {
        result.sort(function (a, b) {
          const da = a.publishedDate ? Date.parse(a.publishedDate) : 0;
          const db = b.publishedDate ? Date.parse(b.publishedDate) : 0;
          return db - da;
        });
      } else if (sortBy === 'published_date_oldest') {
        result.sort(function (a, b) {
          const da = a.publishedDate ? Date.parse(a.publishedDate) : 0;
          const db = b.publishedDate ? Date.parse(b.publishedDate) : 0;
          return da - db;
        });
      } else if (sortBy === 'title_az') {
        result.sort(function (a, b) {
          const ta = (a.title || '').toLowerCase();
          const tb = (b.title || '').toLowerCase();
          if (ta < tb) return -1;
          if (ta > tb) return 1;
          return 0;
        });
      } else if (sortBy === 'name_az') {
        result.sort(function (a, b) {
          const na = (a.name || '').toLowerCase();
          const nb = (b.name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        });
      } else if (sortBy === 'experience_high_to_low') {
        result.sort(function (a, b) {
          return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
        });
      }
    }

    const start = offset || 0;
    let sliced = result;
    if (limit != null && limit >= 0) {
      sliced = result.slice(start, start + limit);
    } else if (start > 0) {
      sliced = result.slice(start);
    }
    return sliced;
  }

  _calculateBearingCapacityInternal(soilType, footingWidth, footingWidthUnit, footingDepth, footingDepthUnit, factorOfSafety, method) {
    // Convert to meters if in feet
    let B = footingWidth;
    let D = footingDepth;
    if (footingWidthUnit === 'ft') {
      B = footingWidth * 0.3048;
    }
    if (footingDepthUnit === 'ft') {
      D = footingDepth * 0.3048;
    }

    // Base ultimate bearing capacity in kPa depending on soil type
    let baseQult = 200; // default
    if (soilType === 'medium_dense_sand') {
      baseQult = 300;
    } else if (soilType === 'dense_sand') {
      baseQult = 400;
    } else if (soilType === 'loose_sand') {
      baseQult = 150;
    } else if (soilType === 'soft_clay') {
      baseQult = 150;
    } else if (soilType === 'stiff_clay') {
      baseQult = 250;
    }

    const depthRatio = B > 0 ? (D / B) : 0;
    const qult = baseQult * (1 + 0.2 * depthRatio);

    const fos = factorOfSafety && factorOfSafety > 0 ? factorOfSafety : 3;
    const qall = qult / fos;

    const usedMethod = method || 'terzaghi';
    const notes = 'Computed using a simplified ' + this._mapEnumToDisplayLabel(usedMethod) +
      ' style correlation for ' + this._mapEnumToDisplayLabel(soilType) +
      ' with B=' + footingWidth + footingWidthUnit + ', D=' + footingDepth + footingDepthUnit +
      ' and FOS=' + fos + '. Values are approximate and for preliminary design only.';

    return {
      ultimateBearingCapacity: qult,
      allowableBearingCapacity: qall,
      methodUsed: usedMethod,
      resultNotes: notes
    };
  }

  _getOrCreateMyPlansStore() {
    const savedInvestigationPlans = this._getFromStorage('saved_investigation_plans');
    const bearingCapacityResults = this._getFromStorage('bearing_capacity_results');
    const projectTeamShortlist = this._getFromStorage('project_team_shortlist');
    return {
      savedInvestigationPlans: savedInvestigationPlans,
      bearingCapacityResults: bearingCapacityResults,
      projectTeamShortlist: projectTeamShortlist
    };
  }

  // ===================== Interface implementations =====================

  // getHomepageOverview()
  getHomepageOverview() {
    const services = this._getFromStorage('consulting_services');
    const projects = this._getFromStorage('project_case_studies');
    const resources = this._getFromStorage('resources');
    const tools = this._getFromStorage('tools');

    const featuredServices = services.filter(function (s) { return s.isFeatured; });
    const featuredProjects = projects.filter(function (p) { return p.isFeatured; });
    const featuredResources = resources.filter(function (r) { return r.isChecklist && r.topic === 'slope_stability'; });
    const featuredTools = tools.filter(function (t) { return t.isFeatured; });

    return {
      heroTitle: 'Geotechnical Engineering Consulting Services',
      heroSubtitle: 'Slope stability, foundations, and subsurface investigations for critical infrastructure and buildings.',
      featuredServices: featuredServices,
      featuredProjects: featuredProjects,
      featuredResources: featuredResources,
      featuredTools: featuredTools
    };
  }

  // getServicesOverview()
  getServicesOverview() {
    const services = this._getFromStorage('consulting_services');
    return services;
  }

  // getSlopeStabilityServicePage()
  getSlopeStabilityServicePage() {
    const services = this._getFromStorage('consulting_services');
    let service = null;

    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (
        (s.slug && (s.slug === 'slope-stability-retaining-walls' || s.slug === 'slope_stability_retaining_walls')) ||
        (s.name && s.name.toLowerCase().indexOf('slope stability') !== -1)
      ) {
        service = s;
        break;
      }
    }
    if (!service && services.length > 0) {
      service = services[0];
    }

    const projects = this._getFromStorage('project_case_studies');
    const resources = this._getFromStorage('resources');

    const relatedCaseStudies = projects.filter(function (p) {
      return p.foundationType === 'slope_stabilization' || p.foundationType === 'retaining_structures';
    });

    const relatedResources = resources.filter(function (r) {
      return r.topic === 'slope_stability' || r.topic === 'retaining_walls';
    });

    return {
      service: service,
      overviewHtml: '<p>We provide advanced slope stability and retaining wall design services for transportation corridors, embankments, and critical infrastructure.</p>',
      typicalApplications: [
        'Highway and railway embankments',
        'Cut slopes and rock cuts',
        'Retaining walls and shoring systems',
        'Landslide assessment and remediation'
      ],
      methods: [
        'Limit equilibrium analysis',
        'Finite element modeling',
        'Probabilistic stability assessment',
        'Seismic and rapid drawdown analyses'
      ],
      deliverables: [
        'Design-level geotechnical report',
        'Slope stability modeling outputs',
        'Retaining wall design parameters',
        'Construction and monitoring recommendations'
      ],
      relatedCaseStudies: relatedCaseStudies,
      relatedResources: relatedResources
    };
  }

  // getSubsurfaceInvestigationServicePage()
  getSubsurfaceInvestigationServicePage() {
    const services = this._getFromStorage('consulting_services');
    let service = null;

    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (
        (s.slug && (s.slug === 'subsurface-investigation' || s.slug === 'subsurface_investigation')) ||
        (s.name && s.name.toLowerCase().indexOf('subsurface investigation') !== -1)
      ) {
        service = s;
        break;
      }
    }
    if (!service && services.length > 0) {
      service = services[0];
    }

    const allPackages = this._getFromStorage('investigation_packages');
    let maxPriceDefault = 0;
    for (let i = 0; i < allPackages.length; i++) {
      if (allPackages[i].isActive !== false) {
        if (allPackages[i].price > maxPriceDefault) {
          maxPriceDefault = allPackages[i].price;
        }
      }
    }
    const initialProjectType = 'building_foundations';
    const initialMaxPrice = maxPriceDefault || 20000;

    const initialPackages = this.getInvestigationPackages(initialProjectType, initialMaxPrice, undefined, true);

    return {
      service: service,
      overviewHtml: '<p>Our subsurface investigation services provide the data you need for reliable, economical foundation and earthwork design.</p>',
      capabilities: [
        'Drilling and sampling',
        'Cone penetration testing (CPT)',
        'Pressuremeter and dilatometer testing',
        'Laboratory index and strength testing',
        'Consolidation (oedometer) testing'
      ],
      typicalUseCases: [
        'New building and bridge foundations',
        'Slope stability investigations',
        'Ground improvement feasibility',
        'Forensic geotechnical evaluations'
      ],
      packagesIntroText: 'Select from pre-defined investigation packages or customize a scope to match your project needs.',
      initialFilterDefaults: {
        projectType: initialProjectType,
        maxPrice: initialMaxPrice
      },
      initialPackages: initialPackages
    };
  }

  // getInvestigationPackagesFilterOptions()
  getInvestigationPackagesFilterOptions() {
    const packages = this._getFromStorage('investigation_packages');
    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (p.isActive === false) continue;
      if (minPrice === null || p.price < minPrice) minPrice = p.price;
      if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    return {
      projectTypes: [
        { value: 'building_foundations', label: 'Building foundations', description: 'Subsurface investigations for low- to high-rise buildings.' },
        { value: 'highway_roadway', label: 'Highway / Roadway', description: 'Corridor-wide or site-specific roadway investigations.' },
        { value: 'bridge_foundations', label: 'Bridge foundations', description: 'Investigation packages tailored to bridge substructures.' },
        { value: 'landslide_stabilization', label: 'Landslide stabilization', description: 'Investigations for unstable slopes and landslides.' },
        { value: 'other', label: 'Other', description: 'Custom subsurface investigations.' }
      ],
      priceRange: {
        minPrice: minPrice,
        maxPrice: maxPrice,
        currency: 'usd'
      }
    };
  }

  // getInvestigationPackages(projectType, maxPrice, minPrice, onlyActive = true)
  getInvestigationPackages(projectType, maxPrice, minPrice, onlyActive) {
    const packages = this._getFromStorage('investigation_packages');
    const result = [];
    const onlyActiveFlag = (onlyActive === undefined || onlyActive === null) ? true : !!onlyActive;

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      if (onlyActiveFlag && pkg.isActive === false) continue;
      if (projectType && pkg.projectType !== projectType) continue;
      if (maxPrice != null && pkg.price > maxPrice) continue;
      if (minPrice != null && pkg.price < minPrice) continue;
      result.push(pkg);
    }
    return result;
  }

  // getInvestigationPackageDetail(packageId)
  getInvestigationPackageDetail(packageId) {
    const packages = this._getFromStorage('investigation_packages');
    let found = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId) {
        found = packages[i];
        break;
      }
    }
    return {
      package: found
    };
  }

  // saveInvestigationPackageToPlan(investigationPackageId, projectName, notes)
  saveInvestigationPackageToPlan(investigationPackageId, projectName, notes) {
    const packages = this._getFromStorage('investigation_packages');
    const plans = this._getFromStorage('saved_investigation_plans');

    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === investigationPackageId) {
        pkg = packages[i];
        break;
      }
    }
    if (!pkg) {
      return {
        success: false,
        message: 'Investigation package not found.',
        savedPlan: null
      };
    }

    const newPlan = {
      id: this._generateId('inv_plan'),
      investigationPackageId: investigationPackageId,
      projectName: projectName,
      notes: notes || '',
      status: 'active',
      savedAt: this._nowIso()
    };
    plans.push(newPlan);
    this._saveToStorage('saved_investigation_plans', plans);

    const savedPlan = {
      id: newPlan.id,
      investigationPackageId: newPlan.investigationPackageId,
      projectName: newPlan.projectName,
      status: newPlan.status,
      savedAt: newPlan.savedAt,
      packageName: pkg.name,
      packagePrice: pkg.price,
      currency: pkg.currency,
      projectType: pkg.projectType,
      includesCptSoundings: !!pkg.includesCptSoundings,
      includesConsolidationTesting: !!pkg.includesConsolidationTesting,
      investigationPackage: pkg
    };

    return {
      success: true,
      message: 'Investigation package saved to project plan.',
      savedPlan: savedPlan
    };
  }

  // getQuoteFormOptions(preferredServiceType)
  getQuoteFormOptions(preferredServiceType) {
    const serviceTypes = [
      {
        value: 'slope_stability_embankments',
        label: 'Slope stability analysis for embankments',
        description: 'Back-analysis and design for highway and railway embankments.'
      },
      {
        value: 'retaining_wall_design',
        label: 'Retaining wall design',
        description: 'Gravity, cantilever, MSE, and other retaining wall systems.'
      },
      {
        value: 'subsurface_investigation',
        label: 'Subsurface investigation',
        description: 'Field exploration and laboratory testing programs.'
      },
      {
        value: 'foundation_design',
        label: 'Foundation design',
        description: 'Shallow and deep foundation design support.'
      },
      {
        value: 'general_geotechnical',
        label: 'General geotechnical consulting',
        description: 'Desk studies, peer review, and forensic support.'
      }
    ];

    const projectTypes = [
      {
        value: 'highway_roadway',
        label: 'Highway / Roadway',
        description: 'Corridor and interchange projects.'
      },
      {
        value: 'building_foundations',
        label: 'Building foundations',
        description: 'Low- to high-rise building projects.'
      },
      {
        value: 'bridge_foundations',
        label: 'Bridge foundations',
        description: 'Bridges, viaducts, and elevated structures.'
      },
      {
        value: 'landslide_stabilization',
        label: 'Landslide stabilization',
        description: 'Emergency and planned stabilization programs.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Custom geotechnical projects.'
      }
    ];

    let defaultServiceType = serviceTypes[0].value;
    if (preferredServiceType) {
      for (let i = 0; i < serviceTypes.length; i++) {
        if (serviceTypes[i].value === preferredServiceType) {
          defaultServiceType = preferredServiceType;
          break;
        }
      }
    }

    const defaultProjectType = 'highway_roadway';

    return {
      serviceTypes: serviceTypes,
      projectTypes: projectTypes,
      defaultServiceType: defaultServiceType,
      defaultProjectType: defaultProjectType,
      budgetHint: 'Typical study budgets range from $5,000 to $50,000 depending on scope.'
    };
  }

  // getServiceLevelOptions(serviceType, maxBudgetUsd)
  getServiceLevelOptions(serviceType, maxBudgetUsd) {
    const options = this._getFromStorage('service_level_options');
    const result = [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.serviceType !== serviceType) continue;
      if (maxBudgetUsd != null && opt.price > maxBudgetUsd) continue;
      result.push(opt);
    }
    result.sort(function (a, b) {
      return (a.price || 0) - (b.price || 0);
    });
    return result;
  }

  // submitQuoteRequest(...)
  submitQuoteRequest(
    serviceType,
    projectType,
    projectName,
    locationCity,
    locationState,
    locationZip,
    locationCountry,
    anticipatedConstructionStartDate,
    selectedServiceLevelId,
    maxBudgetUsd,
    additionalNotes
  ) {
    const quoteRequests = this._getFromStorage('quote_requests');

    let startDateIso = anticipatedConstructionStartDate;
    if (anticipatedConstructionStartDate) {
      const parsed = Date.parse(anticipatedConstructionStartDate);
      if (!isNaN(parsed)) {
        startDateIso = new Date(parsed).toISOString();
      }
    }

    const newRequest = {
      id: this._generateId('quote'),
      serviceType: serviceType,
      projectType: projectType,
      projectName: projectName || '',
      locationCity: locationCity,
      locationState: locationState || '',
      locationZip: locationZip,
      locationCountry: locationCountry || '',
      anticipatedConstructionStartDate: startDateIso,
      selectedServiceLevelId: selectedServiceLevelId,
      maxBudgetUsd: maxBudgetUsd,
      additionalNotes: additionalNotes || '',
      status: 'submitted',
      createdAt: this._nowIso()
    };

    quoteRequests.push(newRequest);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Quote request submitted successfully.',
      quoteRequest: newRequest
    };
  }

  // getProjectsFilterOptions()
  getProjectsFilterOptions() {
    return {
      sectors: [
        { value: 'commercial_buildings', label: 'Commercial buildings' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'residential', label: 'Residential' },
        { value: 'infrastructure', label: 'Infrastructure' },
        { value: 'energy', label: 'Energy' }
      ],
      foundationTypes: [
        { value: 'pile_foundations', label: 'Pile foundations' },
        { value: 'shallow_foundations', label: 'Shallow foundations' },
        { value: 'mat_foundations', label: 'Mat foundations' },
        { value: 'ground_improvement', label: 'Ground improvement' },
        { value: 'retaining_structures', label: 'Retaining structures' },
        { value: 'slope_stabilization', label: 'Slope stabilization' }
      ],
      projectValueRanges: [
        { id: 'under_1m', label: 'Under $1M', minValueUsd: 0, maxValueUsd: 1000000 },
        { id: '1m_5m', label: '$1M – $5M', minValueUsd: 1000000, maxValueUsd: 5000000 },
        { id: '5m_20m', label: '$5M – $20M', minValueUsd: 5000000, maxValueUsd: 20000000 },
        { id: 'over_20m', label: 'Over $20M', minValueUsd: 20000000, maxValueUsd: null }
      ],
      sortOptions: [
        { value: 'project_value_high_to_low', label: 'Project value – High to Low' },
        { value: 'project_value_low_to_high', label: 'Project value – Low to High' },
        { value: 'completion_date_newest', label: 'Completion date – Newest' }
      ]
    };
  }

  // getProjects(filters, sortBy, limit, offset)
  getProjects(filters, sortBy, limit, offset) {
    const projects = this._getFromStorage('project_case_studies');
    const f = filters || {};
    const comparatorOptions = {
      sortBy: sortBy || null,
      limit: limit,
      offset: offset,
      filters: {
        sector: function (value) {
          if (!f.sector) return true;
          return value === f.sector;
        },
        foundationType: function (value) {
          if (!f.foundationType) return true;
          return value === f.foundationType;
        },
        projectValueUsd: function (value) {
          if (f.minProjectValueUsd != null && value < f.minProjectValueUsd) return false;
          if (f.maxProjectValueUsd != null && value > f.maxProjectValueUsd) return false;
          return true;
        }
      }
    };

    // Instrumentation for task completion tracking (task_3 - project filters)
    try {
      if (
        filters &&
        filters.sector === 'commercial_buildings' &&
        filters.foundationType === 'pile_foundations' &&
        (filters.minProjectValueUsd == null || filters.minProjectValueUsd >= 5000000) &&
        sortBy === 'project_value_high_to_low'
      ) {
        localStorage.setItem(
          'task3_projectFilters',
          JSON.stringify({
            filters: filters || {},
            sortBy: sortBy || null,
            recordedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return this._filterAndSortEntities(projects, comparatorOptions);
  }

  // getProjectCaseStudyDetail(projectCaseStudyId)
  getProjectCaseStudyDetail(projectCaseStudyId) {
    const projects = this._getFromStorage('project_case_studies');
    const services = this._getFromStorage('consulting_services');

    let project = null;
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].id === projectCaseStudyId) {
        project = projects[i];
        break;
      }
    }

    if (!project) {
      return {
        project: null,
        relatedProjects: [],
        relatedServices: []
      };
    }

    // Instrumentation for task completion tracking (task_3 - opened project)
    try {
      if (project && project.id) {
        localStorage.setItem('task3_openedProjectId', project.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const relatedProjects = [];
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (p.id === project.id) continue;
      if (p.sector === project.sector || p.foundationType === project.foundationType) {
        relatedProjects.push(p);
      }
    }
    relatedProjects.sort(function (a, b) {
      const da = a.completionDate ? Date.parse(a.completionDate) : 0;
      const db = b.completionDate ? Date.parse(b.completionDate) : 0;
      return db - da;
    });

    const relatedServices = [];
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (s.primaryDiscipline === 'geotechnical_engineering') {
        relatedServices.push(s);
      }
    }

    return {
      project: project,
      relatedProjects: relatedProjects,
      relatedServices: relatedServices
    };
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources');
    let minDate = null;
    let maxDate = null;
    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      if (!r.publishedDate) continue;
      const d = Date.parse(r.publishedDate);
      if (isNaN(d)) continue;
      if (minDate === null || d < minDate) minDate = d;
      if (maxDate === null || d > maxDate) maxDate = d;
    }
    const minDateIso = minDate != null ? new Date(minDate).toISOString().slice(0, 10) : null;
    const maxDateIso = maxDate != null ? new Date(maxDate).toISOString().slice(0, 10) : null;

    return {
      resourceTypes: [
        { value: 'guides_checklists', label: 'Guides & Checklists' },
        { value: 'technical_notes', label: 'Technical notes' },
        { value: 'design_examples', label: 'Design examples' },
        { value: 'webinars', label: 'Webinars' }
      ],
      topics: [
        { value: 'retaining_walls', label: 'Retaining walls' },
        { value: 'slope_stability', label: 'Slope stability' },
        { value: 'deep_foundations', label: 'Deep foundations' },
        { value: 'ground_improvement', label: 'Ground improvement' },
        { value: 'site_investigation', label: 'Site investigation' },
        { value: 'earthquake_engineering', label: 'Earthquake engineering' },
        { value: 'general', label: 'General' }
      ],
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All levels' }
      ],
      sortOptions: [
        { value: 'published_date_newest', label: 'Newest first' },
        { value: 'published_date_oldest', label: 'Oldest first' },
        { value: 'title_az', label: 'Title A–Z' }
      ],
      publishedDateRange: {
        minDate: minDateIso,
        maxDate: maxDateIso
      }
    };
  }

  // getResources(filters, sortBy, limit, offset)
  getResources(filters, sortBy, limit, offset) {
    const resources = this._getFromStorage('resources');
    const f = filters || {};
    const comparatorOptions = {
      sortBy: sortBy || 'published_date_newest',
      limit: limit,
      offset: offset,
      filters: {
        resourceType: function (value) {
          if (!f.resourceType) return true;
          return value === f.resourceType;
        },
        topic: function (value) {
          if (!f.topic) return true;
          return value === f.topic;
        },
        level: function (value) {
          if (!f.level) return true;
          if (f.level === 'all_levels') return true;
          if (value === 'all_levels') return true;
          return value === f.level;
        },
        publishedDate: function (value) {
          if (!value) return true;
          const t = Date.parse(value);
          if (isNaN(t)) return true;
          if (f.publishedDateStart) {
            const start = Date.parse(f.publishedDateStart);
            if (!isNaN(start) && t < start) return false;
          }
          if (f.publishedDateEnd) {
            const end = Date.parse(f.publishedDateEnd);
            if (!isNaN(end) && t > end) return false;
          }
          return true;
        },
        isChecklist: function (value) {
          if (typeof f.isChecklist !== 'boolean') return true;
          return !!value === f.isChecklist;
        }
      }
    };

    // Instrumentation for task completion tracking (task_4 - resource filters)
    try {
      if (
        filters &&
        filters.resourceType === 'guides_checklists' &&
        filters.topic === 'retaining_walls' &&
        filters.level === 'intermediate' &&
        filters.publishedDateStart != null &&
        filters.publishedDateStart >= '2022-01-01' &&
        sortBy === 'published_date_newest'
      ) {
        localStorage.setItem(
          'task4_resourceFilters',
          JSON.stringify({
            filters: filters || {},
            sortBy: sortBy || 'published_date_newest',
            recordedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return this._filterAndSortEntities(resources, comparatorOptions);
  }

  // getResourceDetail(resourceId)
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    let resource = null;
    for (let i = 0; i < resources.length; i++) {
      if (resources[i].id === resourceId) {
        resource = resources[i];
        break;
      }
    }
    if (!resource) {
      return {
        resource: null,
        relatedResources: []
      };
    }

    const related = [];
    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      if (r.id === resource.id) continue;
      if (r.topic === resource.topic || r.resourceType === resource.resourceType) {
        related.push(r);
      }
    }
    const relatedSorted = this._filterAndSortEntities(related, {
      sortBy: 'published_date_newest'
    });

    return {
      resource: resource,
      relatedResources: relatedSorted
    };
  }

  // downloadResourcePdf(resourceId)
  downloadResourcePdf(resourceId) {
    const resources = this._getFromStorage('resources');
    let resource = null;
    for (let i = 0; i < resources.length; i++) {
      if (resources[i].id === resourceId) {
        resource = resources[i];
        break;
      }
    }
    if (!resource || !resource.pdfUrl) {
      return {
        success: false,
        pdfUrl: null,
        fileSizeMb: null,
        message: 'PDF not available for this resource.'
      };
    }

    // Instrumentation for task completion tracking (task_4 - downloaded resource)
    try {
      if (resource && resource.pdfUrl) {
        localStorage.setItem('task4_downloadedResourceId', resource.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      pdfUrl: resource.pdfUrl,
      fileSizeMb: resource.fileSizeMb != null ? resource.fileSizeMb : null,
      message: 'PDF download initiated.'
    };
  }

  // getConsultationFormOptions()
  getConsultationFormOptions() {
    return {
      meetingTypes: [
        {
          value: 'virtual_meeting',
          label: 'Virtual meeting',
          description: 'Meet via video conference.'
        },
        {
          value: 'in_person',
          label: 'In person',
          description: 'Meet at one of our offices or your site.'
        },
        {
          value: 'phone_call',
          label: 'Phone call',
          description: 'Discuss your project by phone.'
        }
      ],
      specialties: [
        {
          value: 'foundation_design',
          label: 'Foundation design',
          description: 'Shallow and deep foundation consultation.'
        },
        {
          value: 'slope_stability',
          label: 'Slope stability',
          description: 'Embankments, cut slopes, and landslides.'
        },
        {
          value: 'subsurface_investigation',
          label: 'Subsurface investigation',
          description: 'Planning and interpreting field exploration.'
        },
        {
          value: 'ground_improvement',
          label: 'Ground improvement',
          description: 'Ground treatment and improvement options.'
        },
        {
          value: 'general_geotechnical',
          label: 'General geotechnical',
          description: 'General geotechnical questions and peer review.'
        }
      ],
      projectStages: [
        {
          value: 'concept_early_design',
          label: 'Concept / Early design',
          description: 'Initial feasibility, alternatives, and concepts.'
        },
        {
          value: 'detailed_design',
          label: 'Detailed design',
          description: 'Design development and construction documents.'
        },
        {
          value: 'construction',
          label: 'Construction',
          description: 'During-construction geotechnical support.'
        },
        {
          value: 'forensic_review',
          label: 'Forensic / Review',
          description: 'Distress investigations and peer review.'
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Other project stages.'
        }
      ],
      defaultMeetingType: 'virtual_meeting',
      defaultProjectStage: 'concept_early_design'
    };
  }

  // getConsultationAvailability(meetingType, specialty, date)
  getConsultationAvailability(meetingType, specialty, date) {
    const slots = this._getFromStorage('consultation_availability_slots');
    const resultSlots = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot.meetingType !== meetingType) continue;
      if (slot.specialty !== specialty) continue;
      if (slot.isBooked) continue;
      if (!slot.startDateTime) continue;
      const slotDate = slot.startDateTime.substring(0, 10);
      if (slotDate !== date) continue;
      resultSlots.push(slot);
    }
    return {
      date: date,
      timeZone: 'UTC',
      slots: resultSlots
    };
  }

  // bookConsultation(meetingType, specialty, projectStage, availabilitySlotId, name, email, projectName)
  bookConsultation(meetingType, specialty, projectStage, availabilitySlotId, name, email, projectName) {
    const slots = this._getFromStorage('consultation_availability_slots');
    const bookings = this._getFromStorage('consultation_bookings');

    let slot = null;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].id === availabilitySlotId) {
        slot = slots[i];
        break;
      }
    }

    if (!slot) {
      return {
        success: false,
        message: 'Selected time slot not found.',
        booking: null
      };
    }
    if (slot.isBooked) {
      return {
        success: false,
        message: 'Selected time slot is no longer available.',
        booking: null
      };
    }
    if (slot.meetingType !== meetingType || slot.specialty !== specialty) {
      return {
        success: false,
        message: 'Selected time slot does not match requested meeting type or specialty.',
        booking: null
      };
    }

    const slotDate = slot.startDateTime ? slot.startDateTime.substring(0, 10) : null;

    const newBooking = {
      id: this._generateId('consult'),
      meetingType: meetingType,
      specialty: specialty,
      projectStage: projectStage,
      date: slotDate,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      availabilitySlotId: slot.id,
      name: name,
      email: email,
      projectName: projectName || '',
      status: 'confirmed',
      createdAt: this._nowIso()
    };

    bookings.push(newBooking);
    this._saveToStorage('consultation_bookings', bookings);

    for (let i = 0; i < slots.length; i++) {
      if (slots[i].id === slot.id) {
        slots[i].isBooked = true;
        break;
      }
    }
    this._saveToStorage('consultation_availability_slots', slots);

    return {
      success: true,
      message: 'Consultation booked successfully.',
      booking: newBooking
    };
  }

  // getToolsOverview()
  getToolsOverview() {
    const tools = this._getFromStorage('tools');
    return tools;
  }

  // getBearingCapacityCalculatorConfig()
  getBearingCapacityCalculatorConfig() {
    return {
      soilTypes: [
        {
          value: 'medium_dense_sand',
          label: 'Medium dense sand',
          description: 'Typical N60 ≈ 15–30.'
        },
        {
          value: 'dense_sand',
          label: 'Dense sand',
          description: 'Typical N60 ≈ 30–50.'
        },
        {
          value: 'loose_sand',
          label: 'Loose sand',
          description: 'Typical N60 < 15.'
        },
        {
          value: 'soft_clay',
          label: 'Soft clay',
          description: 'Undrained shear strength su ≈ 25 kPa.'
        },
        {
          value: 'stiff_clay',
          label: 'Stiff clay',
          description: 'Undrained shear strength su ≈ 75 kPa.'
        }
      ],
      footingWidthUnits: [
        { value: 'm', label: 'm' },
        { value: 'ft', label: 'ft' }
      ],
      footingDepthUnits: [
        { value: 'm', label: 'm' },
        { value: 'ft', label: 'ft' }
      ],
      methods: [
        { value: 'terzaghi', label: 'Terzaghi' },
        { value: 'meyerhof', label: 'Meyerhof' },
        { value: 'vesic', label: 'Vesic' }
      ],
      defaultValues: {
        soilType: 'medium_dense_sand',
        footingWidthUnit: 'm',
        footingDepthUnit: 'm',
        factorOfSafety: 3,
        method: 'terzaghi'
      }
    };
  }

  // calculateBearingCapacity(...)
  calculateBearingCapacity(soilType, footingWidth, footingWidthUnit, footingDepth, footingDepthUnit, factorOfSafety, projectLocation, method) {
    const calc = this._calculateBearingCapacityInternal(
      soilType,
      footingWidth,
      footingWidthUnit,
      footingDepth,
      footingDepthUnit,
      factorOfSafety,
      method
    );

    const calculationId = this._generateId('bc_calc');
    const cache = this._getFromStorage('bearing_capacity_calculation_cache');
    cache.push({
      id: calculationId,
      soilType: soilType,
      footingWidth: footingWidth,
      footingWidthUnit: footingWidthUnit,
      footingDepth: footingDepth,
      footingDepthUnit: footingDepthUnit,
      factorOfSafety: factorOfSafety,
      projectLocation: projectLocation || '',
      ultimateBearingCapacity: calc.ultimateBearingCapacity,
      allowableBearingCapacity: calc.allowableBearingCapacity,
      methodUsed: calc.methodUsed,
      resultNotes: calc.resultNotes,
      calculatedAt: this._nowIso()
    });
    this._saveToStorage('bearing_capacity_calculation_cache', cache);

    return {
      success: true,
      calculationId: calculationId,
      ultimateBearingCapacity: calc.ultimateBearingCapacity,
      allowableBearingCapacity: calc.allowableBearingCapacity,
      methodUsed: calc.methodUsed,
      resultNotes: calc.resultNotes
    };
  }

  // saveBearingCapacityResult(calculationId, projectName)
  saveBearingCapacityResult(calculationId, projectName) {
    const cache = this._getFromStorage('bearing_capacity_calculation_cache');
    const results = this._getFromStorage('bearing_capacity_results');
    const tools = this._getFromStorage('tools');

    let cached = null;
    for (let i = 0; i < cache.length; i++) {
      if (cache[i].id === calculationId) {
        cached = cache[i];
        break;
      }
    }

    if (!cached) {
      return {
        success: false,
        message: 'Calculation not found.',
        savedResult: null
      };
    }

    let toolId = null;
    for (let i = 0; i < tools.length; i++) {
      const t = tools[i];
      if (t.toolType === 'calculator' && (t.slug === 'bearing-capacity-calculator' || t.slug === 'bearing_capacity_calculator')) {
        toolId = t.id;
        break;
      }
    }

    const newResult = {
      id: this._generateId('bc_res'),
      soilType: cached.soilType,
      footingWidth: cached.footingWidth,
      footingWidthUnit: cached.footingWidthUnit,
      footingDepth: cached.footingDepth,
      footingDepthUnit: cached.footingDepthUnit,
      factorOfSafety: cached.factorOfSafety,
      projectLocation: cached.projectLocation || '',
      ultimateBearingCapacity: cached.ultimateBearingCapacity,
      allowableBearingCapacity: cached.allowableBearingCapacity,
      method: cached.methodUsed,
      resultNotes: cached.resultNotes,
      projectName: projectName,
      toolId: toolId,
      calculatedAt: cached.calculatedAt || this._nowIso()
    };

    results.push(newResult);
    this._saveToStorage('bearing_capacity_results', results);

    const newCache = [];
    for (let i = 0; i < cache.length; i++) {
      if (cache[i].id !== calculationId) {
        newCache.push(cache[i]);
      }
    }
    this._saveToStorage('bearing_capacity_calculation_cache', newCache);

    return {
      success: true,
      message: 'Bearing capacity result saved.',
      savedResult: newResult
    };
  }

  // getTeamFilterOptions()
  getTeamFilterOptions() {
    return {
      regions: [
        { value: 'west', label: 'West' },
        { value: 'central', label: 'Central' },
        { value: 'east', label: 'East' },
        { value: 'international', label: 'International' }
      ],
      disciplines: [
        { value: 'geotechnical_engineering', label: 'Geotechnical engineering' },
        { value: 'structural_engineering', label: 'Structural engineering' },
        { value: 'geology', label: 'Geology' },
        { value: 'construction_services', label: 'Construction services' }
      ],
      minYearsOfExperienceOptions: [
        { value: 0, label: 'Any experience' },
        { value: 5, label: '5+ years' },
        { value: 10, label: '10+ years' },
        { value: 15, label: '15+ years' },
        { value: 20, label: '20+ years' }
      ]
    };
  }

  // getTeamMembers(filters, sortBy, limit, offset)
  getTeamMembers(filters, sortBy, limit, offset) {
    const members = this._getFromStorage('team_members');
    const f = filters || {};
    const comparatorOptions = {
      sortBy: sortBy || 'name_az',
      limit: limit,
      offset: offset,
      filters: {
        region: function (value) {
          if (!f.region) return true;
          return value === f.region;
        },
        discipline: function (value) {
          if (!f.discipline) return true;
          return value === f.discipline;
        },
        yearsOfExperience: function (value) {
          if (f.minYearsOfExperience != null && value < f.minYearsOfExperience) return false;
          return true;
        },
        keySkills: function (value, item) {
          if (!f.hasSkillKeyword) return true;
          const kw = String(f.hasSkillKeyword).toLowerCase();
          const skills = item.keySkills || [];
          for (let i = 0; i < skills.length; i++) {
            if (String(skills[i]).toLowerCase().indexOf(kw) !== -1) {
              return true;
            }
          }
          return false;
        },
        isAvailableForProjects: function (value) {
          if (typeof f.isAvailableForProjects !== 'boolean') return true;
          return !!value === f.isAvailableForProjects;
        }
      }
    };
    return this._filterAndSortEntities(members, comparatorOptions);
  }

  // getTeamMemberDetail(teamMemberId)
  getTeamMemberDetail(teamMemberId) {
    const members = this._getFromStorage('team_members');
    const projects = this._getFromStorage('project_case_studies');
    let member = null;
    for (let i = 0; i < members.length; i++) {
      if (members[i].id === teamMemberId) {
        member = members[i];
        break;
      }
    }
    if (!member) {
      return {
        teamMember: null,
        relatedProjects: []
      };
    }

    const related = projects.slice();
    related.sort(function (a, b) {
      return (b.projectValueUsd || 0) - (a.projectValueUsd || 0);
    });
    const relatedProjects = related.slice(0, 5);

    return {
      teamMember: member,
      relatedProjects: relatedProjects
    };
  }

  // addTeamMemberToShortlist(teamMemberId, context, notes)
  addTeamMemberToShortlist(teamMemberId, context, notes) {
    const members = this._getFromStorage('team_members');
    const shortlist = this._getFromStorage('project_team_shortlist');

    let member = null;
    for (let i = 0; i < members.length; i++) {
      if (members[i].id === teamMemberId) {
        member = members[i];
        break;
      }
    }
    if (!member) {
      return {
        success: false,
        message: 'Team member not found.',
        shortlistItem: null
      };
    }

    const newItem = {
      id: this._generateId('shortlist'),
      teamMemberId: teamMemberId,
      context: context || '',
      notes: notes || '',
      addedAt: this._nowIso()
    };
    shortlist.push(newItem);
    this._saveToStorage('project_team_shortlist', shortlist);

    const shortlistItem = {
      id: newItem.id,
      teamMemberId: newItem.teamMemberId,
      context: newItem.context,
      notes: newItem.notes,
      addedAt: newItem.addedAt,
      teamMemberName: member.name,
      jobTitle: member.jobTitle,
      region: member.region,
      discipline: member.discipline,
      yearsOfExperience: member.yearsOfExperience,
      keySkills: member.keySkills,
      teamMember: member
    };

    return {
      success: true,
      message: 'Team member added to shortlist.',
      shortlistItem: shortlistItem
    };
  }

  // getProjectTeamShortlist()
  getProjectTeamShortlist() {
    const shortlist = this._getFromStorage('project_team_shortlist');
    const members = this._getFromStorage('team_members');

    const result = [];
    for (let i = 0; i < shortlist.length; i++) {
      const item = shortlist[i];
      let member = null;
      for (let j = 0; j < members.length; j++) {
        if (members[j].id === item.teamMemberId) {
          member = members[j];
          break;
        }
      }
      result.push({
        shortlistItemId: item.id,
        teamMemberId: item.teamMemberId,
        name: member ? member.name : null,
        jobTitle: member ? member.jobTitle : null,
        region: member ? member.region : null,
        discipline: member ? member.discipline : null,
        yearsOfExperience: member ? member.yearsOfExperience : null,
        keySkills: member ? member.keySkills : [],
        addedAt: item.addedAt,
        teamMember: member
      });
    }
    return result;
  }

  // getMyPlansOverview()
  getMyPlansOverview() {
    const store = this._getOrCreateMyPlansStore();
    const packages = this._getFromStorage('investigation_packages');
    const members = this._getFromStorage('team_members');

    const savedInvestigationPlans = [];
    for (let i = 0; i < store.savedInvestigationPlans.length; i++) {
      const plan = store.savedInvestigationPlans[i];
      let pkg = null;
      for (let j = 0; j < packages.length; j++) {
        if (packages[j].id === plan.investigationPackageId) {
          pkg = packages[j];
          break;
        }
      }
      savedInvestigationPlans.push({
        planId: plan.id,
        projectName: plan.projectName,
        status: plan.status,
        savedAt: plan.savedAt,
        investigationPackageId: plan.investigationPackageId,
        packageName: pkg ? pkg.name : null,
        projectType: pkg ? pkg.projectType : null,
        price: pkg ? pkg.price : null,
        currency: pkg ? pkg.currency : null,
        includesCptSoundings: pkg ? !!pkg.includesCptSoundings : false,
        includesConsolidationTesting: pkg ? !!pkg.includesConsolidationTesting : false,
        investigationPackage: pkg
      });
    }

    const savedBearingCapacityResultsRaw = store.bearingCapacityResults;
    const savedBearingCapacityResults = [];
    for (let i = 0; i < savedBearingCapacityResultsRaw.length; i++) {
      const r = savedBearingCapacityResultsRaw[i];
      savedBearingCapacityResults.push({
        resultId: r.id,
        projectName: r.projectName,
        soilType: r.soilType,
        footingWidth: r.footingWidth,
        footingWidthUnit: r.footingWidthUnit,
        footingDepth: r.footingDepth,
        footingDepthUnit: r.footingDepthUnit,
        factorOfSafety: r.factorOfSafety,
        ultimateBearingCapacity: r.ultimateBearingCapacity,
        allowableBearingCapacity: r.allowableBearingCapacity,
        projectLocation: r.projectLocation,
        calculatedAt: r.calculatedAt
      });
    }

    const shortlistItemsRaw = store.projectTeamShortlist;
    const projectTeamShortlist = [];
    for (let i = 0; i < shortlistItemsRaw.length; i++) {
      const item = shortlistItemsRaw[i];
      let member = null;
      for (let j = 0; j < members.length; j++) {
        if (members[j].id === item.teamMemberId) {
          member = members[j];
          break;
        }
      }
      projectTeamShortlist.push({
        shortlistItemId: item.id,
        teamMemberId: item.teamMemberId,
        name: member ? member.name : null,
        jobTitle: member ? member.jobTitle : null,
        region: member ? member.region : null,
        discipline: member ? member.discipline : null,
        yearsOfExperience: member ? member.yearsOfExperience : null,
        keySkills: member ? member.keySkills : [],
        addedAt: item.addedAt,
        teamMember: member
      });
    }

    return {
      savedInvestigationPlans: savedInvestigationPlans,
      savedBearingCapacityResults: savedBearingCapacityResults,
      projectTeamShortlist: projectTeamShortlist
    };
  }

  // updateSavedInvestigationPlanName(planId, newProjectName)
  updateSavedInvestigationPlanName(planId, newProjectName) {
    const plans = this._getFromStorage('saved_investigation_plans');
    let updated = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plans[i].projectName = newProjectName;
        updated = plans[i];
        break;
      }
    }
    if (!updated) {
      return {
        success: false,
        message: 'Saved plan not found.',
        updatedPlan: null
      };
    }
    this._saveToStorage('saved_investigation_plans', plans);
    return {
      success: true,
      message: 'Saved plan renamed.',
      updatedPlan: {
        planId: updated.id,
        projectName: updated.projectName
      }
    };
  }

  // removeSavedInvestigationPlan(planId)
  removeSavedInvestigationPlan(planId) {
    const plans = this._getFromStorage('saved_investigation_plans');
    const filtered = [];
    let removed = false;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        removed = true;
        continue;
      }
      filtered.push(plans[i]);
    }
    if (!removed) {
      return {
        success: false,
        message: 'Saved plan not found.'
      };
    }
    this._saveToStorage('saved_investigation_plans', filtered);
    return {
      success: true,
      message: 'Saved plan removed.'
    };
  }

  // removeSavedCalculationResult(resultId)
  removeSavedCalculationResult(resultId) {
    const results = this._getFromStorage('bearing_capacity_results');
    const filtered = [];
    let removed = false;
    for (let i = 0; i < results.length; i++) {
      if (results[i].id === resultId) {
        removed = true;
        continue;
      }
      filtered.push(results[i]);
    }
    if (!removed) {
      return {
        success: false,
        message: 'Calculation result not found.'
      };
    }
    this._saveToStorage('bearing_capacity_results', filtered);
    return {
      success: true,
      message: 'Calculation result removed.'
    };
  }

  // removeShortlistedTeamMember(shortlistItemId)
  removeShortlistedTeamMember(shortlistItemId) {
    const shortlist = this._getFromStorage('project_team_shortlist');
    const filtered = [];
    let removed = false;
    for (let i = 0; i < shortlist.length; i++) {
      if (shortlist[i].id === shortlistItemId) {
        removed = true;
        continue;
      }
      filtered.push(shortlist[i]);
    }
    if (!removed) {
      return {
        success: false,
        message: 'Shortlist item not found.'
      };
    }
    this._saveToStorage('project_team_shortlist', filtered);
    return {
      success: true,
      message: 'Team member removed from shortlist.'
    };
  }

  // subscribeToNewsletter(email, topics, emailFrequency, professionalRole)
  subscribeToNewsletter(email, topics, emailFrequency, professionalRole) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    let subscription = null;

    for (let i = 0; i < subscriptions.length; i++) {
      if (subscriptions[i].email === email) {
        subscriptions[i].topics = Array.isArray(topics) ? topics : [];
        subscriptions[i].emailFrequency = emailFrequency;
        if (professionalRole) {
          subscriptions[i].professionalRole = professionalRole;
        }
        subscriptions[i].subscribedAt = this._nowIso();
        subscriptions[i].isConfirmed = false;
        subscription = subscriptions[i];
        break;
      }
    }

    if (!subscription) {
      subscription = {
        id: this._generateId('sub'),
        email: email,
        topics: Array.isArray(topics) ? topics : [],
        emailFrequency: emailFrequency,
        professionalRole: professionalRole || null,
        subscribedAt: this._nowIso(),
        isConfirmed: false
      };
      subscriptions.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      message: 'Subscription saved. Please check your email to confirm.',
      subscription: subscription
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      missionHtml: '<p>We partner with owners, designers, and contractors to deliver reliable, constructible geotechnical solutions for critical infrastructure and the built environment.</p>',
      historyHtml: '<p>Our team brings decades of combined experience in transportation, building, and industrial projects across the United States and abroad.</p>',
      regionsServed: [
        'Western US',
        'Central US',
        'Eastern US',
        'International'
      ],
      primarySectors: [
        'Transportation',
        'Commercial buildings',
        'Industrial facilities',
        'Energy and utilities',
        'Public infrastructure'
      ],
      coreCompetencies: [
        'Slope stability and landslide remediation',
        'Deep and shallow foundation design',
        'Subsurface investigation and in-situ testing',
        'Retaining wall and excavation support design',
        'Seismic and earthquake engineering'
      ],
      contactInfo: {
        phone: '+1 (000) 000-0000',
        email: 'info@example-geotech.com',
        address: '123 Geotech Way, Suite 400, Denver, CO 80202'
      }
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