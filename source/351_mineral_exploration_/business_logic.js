// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  _initStorage() {
    const keys = [
      'service_categories',
      'services',
      'project_inquiries',
      'service_packages',
      'package_comparisons',
      'package_contact_requests',
      'case_studies',
      'shortlisted_case_study_items',
      'experts',
      'saved_experts',
      'expert_consultation_requests',
      'budget_estimates',
      'estimate_emails',
      'documents',
      'library_items',
      'custom_service_bundles',
      'bundle_service_items',
      'bundle_submissions',
      'content_items',
      'webinar_sessions',
      'webinar_registrations',
      'reading_list_items',
      'general_inquiries'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // helpers for single-user context
    if (!localStorage.getItem('current_package_comparison_id')) {
      localStorage.setItem('current_package_comparison_id', '');
    }
    if (!localStorage.getItem('current_bundle_id')) {
      localStorage.setItem('current_bundle_id', '');
    }
    if (!localStorage.getItem('current_budget_estimate_id')) {
      localStorage.setItem('current_budget_estimate_id', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _safeLower(str) {
    return (str || '').toString().toLowerCase();
  }

  // ----------------------
  // Helper: PackageComparison
  // ----------------------
  _getOrCreatePackageComparison() {
    let comparisons = this._getFromStorage('package_comparisons');
    let currentId = localStorage.getItem('current_package_comparison_id') || '';
    let current = comparisons.find(c => c.id === currentId);
    if (!current) {
      current = {
        id: this._generateId('pkgcmp'),
        package_ids: [],
        created_at: this._nowIso()
      };
      comparisons.push(current);
      this._saveToStorage('package_comparisons', comparisons);
      localStorage.setItem('current_package_comparison_id', current.id);
    }
    return current;
  }

  // ----------------------
  // Helper: Shortlist (case studies)
  // ----------------------
  _getOrCreateShortlist() {
    // For single-user context, shortlist is just the shortlisted_case_study_items array
    return this._getFromStorage('shortlisted_case_study_items');
  }

  // ----------------------
  // Helper: Saved experts
  // ----------------------
  _getOrCreateSavedExperts() {
    return this._getFromStorage('saved_experts');
  }

  // ----------------------
  // Helper: Library
  // ----------------------
  _getOrCreateLibrary() {
    return this._getFromStorage('library_items');
  }

  // ----------------------
  // Helper: Current Bundle
  // ----------------------
  _getOrCreateCurrentBundle() {
    let bundles = this._getFromStorage('custom_service_bundles');
    let currentId = localStorage.getItem('current_bundle_id') || '';
    let bundle = bundles.find(b => b.id === currentId);
    if (!bundle) {
      bundle = {
        id: this._generateId('bundle'),
        name: null,
        description: null,
        total_estimated_duration_months: 0,
        total_estimated_cost_usd: 0,
        currency: 'usd',
        status: 'in_progress',
        created_at: this._nowIso(),
        last_updated_at: this._nowIso()
      };
      bundles.push(bundle);
      this._saveToStorage('custom_service_bundles', bundles);
      localStorage.setItem('current_bundle_id', bundle.id);
    }
    return bundle;
  }

  _recalculateBundleTotals(bundleId) {
    const bundles = this._getFromStorage('custom_service_bundles');
    const items = this._getFromStorage('bundle_service_items');
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;

    const relatedItems = items.filter(i => i.bundle_id === bundleId);
    let totalDuration = 0;
    let totalCost = 0;
    for (const item of relatedItems) {
      totalDuration += item.estimated_duration_months || 0;
      totalCost += item.estimated_cost_usd || 0;
    }
    bundle.total_estimated_duration_months = totalDuration;
    bundle.total_estimated_cost_usd = totalCost;
    bundle.last_updated_at = this._nowIso();
    this._saveToStorage('custom_service_bundles', bundles);
  }

  // ----------------------
  // Helper: Current Budget Estimate
  // ----------------------
  _getCurrentBudgetEstimate() {
    const estimates = this._getFromStorage('budget_estimates');
    if (!estimates.length) return null;
    // latest by created_at
    let latest = estimates[0];
    for (const e of estimates) {
      if (this._parseDate(e.created_at) > this._parseDate(latest.created_at)) {
        latest = e;
      }
    }
    return latest;
  }

  // ----------------------
  // Helper: Reading List
  // ----------------------
  _getOrCreateReadingList() {
    return this._getFromStorage('reading_list_items');
  }

  // ==========================================================
  // Core interface implementations
  // ==========================================================

  // ---------------
  // Homepage
  // ---------------
  getHomePageContent() {
    const serviceCategories = this._getFromStorage('service_categories');
    const servicePackages = this._getFromStorage('service_packages');
    const caseStudies = this._getFromStorage('case_studies');
    const contentItems = this._getFromStorage('content_items');

    // Featured categories: sort by display_order then name
    const featured_categories = [...serviceCategories].sort((a, b) => {
      const ao = a.display_order || 0;
      const bo = b.display_order || 0;
      if (ao !== bo) return ao - bo;
      return this._safeLower(a.name).localeCompare(this._safeLower(b.name));
    }).slice(0, 4);

    // Featured packages: active ones by price ascending
    const featured_packages = servicePackages
      .filter(p => p.is_active)
      .sort((a, b) => (a.total_price_usd || 0) - (b.total_price_usd || 0))
      .slice(0, 4);

    // Featured case studies: latest completion_date
    const featured_case_studies = [...caseStudies]
      .sort((a, b) => {
        const da = this._parseDate(a.completion_date) || new Date(0);
        const db = this._parseDate(b.completion_date) || new Date(0);
        return db - da;
      })
      .slice(0, 3);

    // Next webinar within upcoming ones
    const now = new Date();
    const upcomingWebinars = contentItems.filter(ci => ci.content_type === 'webinars' && ci.is_published !== false);
    let next_webinar = null;
    let bestDate = null;
    for (const w of upcomingWebinars) {
      const d = this._parseDate(w.scheduled_date || w.publish_date || w.created_at);
      if (!d || d < now) continue;
      if (!bestDate || d < bestDate) {
        bestDate = d;
        next_webinar = w;
      }
    }

    return {
      hero_title: 'Independent mineral exploration consulting',
      hero_subtitle: 'Scoping, targeting, and execution support for copper, gold, lithium and more.',
      value_propositions: [
        'Integrated geological, geophysical, and ESG expertise',
        'Experience across the Americas, Australia, and global exploration belts',
        'Flexible engagements from early-stage targeting to advanced studies'
      ],
      featured_categories,
      featured_packages,
      featured_case_studies,
      next_webinar
    };
  }

  // ---------------
  // Services overview / categories
  // ---------------
  getServiceCategories() {
    const cats = this._getFromStorage('service_categories');
    return [...cats].sort((a, b) => {
      const ao = a.display_order || 0;
      const bo = b.display_order || 0;
      if (ao !== bo) return ao - bo;
      return this._safeLower(a.name).localeCompare(this._safeLower(b.name));
    });
  }

  getServicesOverviewContent() {
    const categories = this.getServiceCategories();
    const promotions = [
      {
        type: 'service_packages',
        title: 'Pre-defined exploration support packages',
        description: 'Structured scopes for drill program design, targeting, and technical reviews.',
        cta_label: 'Explore packages',
        target_slug: 'service_packages'
      },
      {
        type: 'custom_bundle_builder',
        title: 'Build your own exploration services bundle',
        description: 'Combine mapping, geophysics, analytics and more into a tailored scope.',
        cta_label: 'Build a custom bundle',
        target_slug: 'custom_bundle_builder'
      }
    ];

    return {
      intro_title: 'Exploration services for disciplined discovery',
      intro_body:
        'From early-stage targeting through resource definition, our team supports explorers with integrated technical services across geology, geophysics, data, and ESG.',
      categories,
      promotions
    };
  }

  // ---------------
  // Exploration Strategy page & inquiry
  // ---------------
  getExplorationStrategyPageContent() {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');

    const strategyCategory = categories.find(c => c.slug === 'exploration_strategy_planning');
    const key_services = strategyCategory
      ? services.filter(s => s.category_id === strategyCategory.id)
      : [];

    const commodity_options = [
      { value: 'copper', label: 'Copper' },
      { value: 'gold', label: 'Gold' },
      { value: 'lithium', label: 'Lithium' },
      { value: 'nickel', label: 'Nickel' },
      { value: 'uranium', label: 'Uranium' },
      { value: 'multi_commodity', label: 'Multi-commodity' },
      { value: 'other', label: 'Other' }
    ];

    const project_stage_options = [
      { value: 'conceptual', label: 'Conceptual target generation' },
      { value: 'early_stage_exploration', label: 'Early-stage exploration' },
      { value: 'advanced_exploration', label: 'Advanced exploration' },
      { value: 'resource_definition', label: 'Resource definition' },
      { value: 'scoping_study', label: 'Scoping study' },
      { value: 'pre_feasibility', label: 'Pre-feasibility' },
      { value: 'feasibility', label: 'Feasibility' },
      { value: 'production_support', label: 'Production support' }
    ];

    const scoping_service_options = services.filter(s => s.is_scoping_study_option);

    return {
      page_title: 'Exploration Strategy & Planning',
      page_body:
        'Align your exploration strategy with deposit models, available data, and capital constraints. We support explorers with disciplined targeting, program design, and decision support.',
      key_services,
      inquiry_form_config: {
        commodity_options,
        project_stage_options,
        scoping_service_options,
        budget_hint_usd: 'Typical strategic studies range from USD 100,000 to 1,000,000 depending on scope.'
      }
    };
  }

  submitProjectInquiry(
    commodity,
    country,
    region,
    estimatedBudgetUsd,
    projectStage,
    selectedServiceIds,
    additionalDetails,
    sourcePage
  ) {
    const inquiries = this._getFromStorage('project_inquiries');

    const newInquiry = {
      id: this._generateId('projinq'),
      commodity,
      country,
      region: region || null,
      estimated_budget_usd: Number(estimatedBudgetUsd) || 0,
      project_stage: projectStage,
      selected_service_ids: Array.isArray(selectedServiceIds) ? selectedServiceIds : [],
      additional_details: additionalDetails || null,
      source_page: sourcePage || 'service_exploration_strategy',
      created_at: this._nowIso()
    };

    inquiries.push(newInquiry);
    this._saveToStorage('project_inquiries', inquiries);

    return {
      success: true,
      projectInquiryId: newInquiry.id,
      message: 'Project inquiry submitted.'
    };
  }

  // ---------------
  // Service packages & comparison
  // ---------------
  getServicePackageFilterOptions() {
    const commodity_options = [
      { value: 'copper', label: 'Copper' },
      { value: 'gold', label: 'Gold' },
      { value: 'lithium', label: 'Lithium' },
      { value: 'nickel', label: 'Nickel' },
      { value: 'uranium', label: 'Uranium' },
      { value: 'multi_commodity', label: 'Multi-commodity' },
      { value: 'other', label: 'Other' }
    ];

    const price_ranges = [
      { id: 'under_100k', label: 'Under USD 100k', minTotalPriceUsd: 0, maxTotalPriceUsd: 100000 },
      { id: '100k_300k', label: 'USD 100k – 300k', minTotalPriceUsd: 100000, maxTotalPriceUsd: 300000 },
      { id: '300k_1m', label: 'USD 300k – 1M', minTotalPriceUsd: 300000, maxTotalPriceUsd: 1000000 },
      { id: 'over_1m', label: 'Over USD 1M', minTotalPriceUsd: 1000000, maxTotalPriceUsd: Number.MAX_SAFE_INTEGER }
    ];

    return {
      commodity_options,
      price_ranges,
      includes_drill_program_design_filter_label: 'Includes drill program design'
    };
  }

  searchServicePackages(
    commodity,
    minTotalPriceUsd,
    maxTotalPriceUsd,
    includesDrillProgramDesign,
    isActive,
    sortBy
  ) {
    let packages = this._getFromStorage('service_packages');

    if (typeof isActive === 'boolean') {
      packages = packages.filter(p => !!p.is_active === isActive);
    }

    if (commodity) {
      packages = packages.filter(p => p.commodity === commodity);
    }

    if (typeof minTotalPriceUsd === 'number') {
      packages = packages.filter(p => (p.total_price_usd || 0) >= minTotalPriceUsd);
    }

    if (typeof maxTotalPriceUsd === 'number') {
      packages = packages.filter(p => (p.total_price_usd || 0) <= maxTotalPriceUsd);
    }

    if (typeof includesDrillProgramDesign === 'boolean') {
      packages = packages.filter(p => !!p.includes_drill_program_design === includesDrillProgramDesign);
    }

    const sortKey = sortBy || 'price_asc';
    if (sortKey === 'price_asc') {
      packages.sort((a, b) => (a.total_price_usd || 0) - (b.total_price_usd || 0));
    } else if (sortKey === 'price_desc') {
      packages.sort((a, b) => (b.total_price_usd || 0) - (a.total_price_usd || 0));
    } else if (sortKey === 'name_asc') {
      packages.sort((a, b) => this._safeLower(a.name).localeCompare(this._safeLower(b.name)));
    }

    return packages;
  }

  addPackageToComparison(packageId) {
    const allPackages = this._getFromStorage('service_packages');
    const pkg = allPackages.find(p => p.id === packageId);
    if (!pkg) {
      return { success: false, comparisonId: null, packageIds: [], message: 'Package not found.' };
    }

    const comparisons = this._getFromStorage('package_comparisons');
    let comparison = this._getOrCreatePackageComparison();

    if (!comparison.package_ids.includes(packageId)) {
      comparison.package_ids.push(packageId);
      const idx = comparisons.findIndex(c => c.id === comparison.id);
      if (idx >= 0) {
        comparisons[idx] = comparison;
      } else {
        comparisons.push(comparison);
      }
      this._saveToStorage('package_comparisons', comparisons);
    }

    return {
      success: true,
      comparisonId: comparison.id,
      packageIds: comparison.package_ids,
      message: 'Package added to comparison.'
    };
  }

  removePackageFromComparison(packageId) {
    const comparisons = this._getFromStorage('package_comparisons');
    let comparison = this._getOrCreatePackageComparison();

    const newIds = comparison.package_ids.filter(id => id !== packageId);
    comparison.package_ids = newIds;

    const idx = comparisons.findIndex(c => c.id === comparison.id);
    if (idx >= 0) {
      comparisons[idx] = comparison;
      this._saveToStorage('package_comparisons', comparisons);
    }

    return {
      success: true,
      comparisonId: comparison.id,
      packageIds: comparison.package_ids,
      message: 'Package removed from comparison.'
    };
  }

  getCurrentPackageComparison() {
    const comparison = this._getOrCreatePackageComparison();
    const allPackages = this._getFromStorage('service_packages');

    const packages = comparison.package_ids.map(id => {
      const pkg = allPackages.find(p => p.id === id) || null;
      if (!pkg) return null;
      return {
        package: pkg,
        includes_drill_program_design: !!pkg.includes_drill_program_design,
        total_price_usd: pkg.total_price_usd || 0,
        currency: pkg.currency || 'usd'
      };
    }).filter(Boolean);

    return {
      comparisonId: comparison.id,
      packages
    };
  }

  getServicePackageDetail(packageId) {
    const packages = this._getFromStorage('service_packages');
    const services = this._getFromStorage('services');
    const pkg = packages.find(p => p.id === packageId) || null;
    if (!pkg) {
      return { package: null, included_services: [] };
    }

    const included_services = Array.isArray(pkg.included_service_ids)
      ? services.filter(s => pkg.included_service_ids.includes(s.id))
      : [];

    return {
      package: pkg,
      included_services
    };
  }

  submitPackageContactRequest(packageId, name, email, message) {
    const packages = this._getFromStorage('service_packages');
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) {
      return { success: false, packageContactRequestId: null, message: 'Package not found.' };
    }

    const requests = this._getFromStorage('package_contact_requests');
    const request = {
      id: this._generateId('pkgreq'),
      package_id: packageId,
      name,
      email,
      message: message || null,
      created_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('package_contact_requests', requests);

    return {
      success: true,
      packageContactRequestId: request.id,
      message: 'Package contact request submitted.'
    };
  }

  // ---------------
  // Case studies & shortlist
  // ---------------
  getCaseStudyFilterOptions() {
    const cases = this._getFromStorage('case_studies');

    const commoditiesSet = new Set();
    const countriesSet = new Set();
    const regionsSet = new Set();
    const years = [];

    for (const cs of cases) {
      if (cs.commodity) commoditiesSet.add(cs.commodity);
      if (cs.country) countriesSet.add(cs.country);
      if (cs.region) regionsSet.add(cs.region);
      if (typeof cs.year === 'number') years.push(cs.year);
    }

    const commodity_options = Array.from(commoditiesSet).map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
    const country_options = Array.from(countriesSet);
    const region_options = Array.from(regionsSet);

    const min_year = years.length ? Math.min(...years) : null;
    const max_year = years.length ? Math.max(...years) : null;

    return {
      commodity_options,
      country_options,
      region_options,
      year_range: { min_year, max_year }
    };
  }

  searchCaseStudies(commodity, country, region, yearFrom, yearTo, sortBy) {
    let cases = this._getFromStorage('case_studies');

    if (commodity) {
      cases = cases.filter(c => c.commodity === commodity);
    }
    if (country) {
      cases = cases.filter(c => c.country === country);
    }
    if (region) {
      cases = cases.filter(c => c.region === region);
    }
    if (typeof yearFrom === 'number') {
      cases = cases.filter(c => typeof c.year === 'number' && c.year >= yearFrom);
    }
    if (typeof yearTo === 'number') {
      cases = cases.filter(c => typeof c.year === 'number' && c.year <= yearTo);
    }

    const sortKey = sortBy || 'completion_date_desc';
    if (sortKey === 'completion_date_desc' || sortKey === 'completion_date_asc') {
      cases.sort((a, b) => {
        const da = this._parseDate(a.completion_date) || new Date(0);
        const db = this._parseDate(b.completion_date) || new Date(0);
        const diff = da - db;
        return sortKey === 'completion_date_desc' ? -diff : diff;
      });
    }

    return cases;
  }

  addCaseStudyToShortlist(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find(c => c.id === caseStudyId);
    if (!cs) {
      return { success: false, shortlistedCaseStudyItemId: null, totalShortlistedCount: 0, message: 'Case study not found.' };
    }

    let shortlist = this._getFromStorage('shortlisted_case_study_items');

    // Prevent duplicates
    const existing = shortlist.find(i => i.case_study_id === caseStudyId);
    if (existing) {
      return {
        success: true,
        shortlistedCaseStudyItemId: existing.id,
        totalShortlistedCount: shortlist.length,
        message: 'Case study already shortlisted.'
      };
    }

    const item = {
      id: this._generateId('cshort'),
      case_study_id: caseStudyId,
      added_at: this._nowIso()
    };
    shortlist.push(item);
    this._saveToStorage('shortlisted_case_study_items', shortlist);

    return {
      success: true,
      shortlistedCaseStudyItemId: item.id,
      totalShortlistedCount: shortlist.length,
      message: 'Case study added to shortlist.'
    };
  }

  getShortlistedCaseStudies() {
    const shortlist = this._getFromStorage('shortlisted_case_study_items');
    const caseStudies = this._getFromStorage('case_studies');

    return shortlist.map(item => ({
      shortlist_item_id: item.id,
      case_study: caseStudies.find(c => c.id === item.case_study_id) || null,
      added_at: item.added_at
    }));
  }

  removeCaseStudyFromShortlist(shortlistItemId) {
    let shortlist = this._getFromStorage('shortlisted_case_study_items');
    const before = shortlist.length;
    shortlist = shortlist.filter(i => i.id !== shortlistItemId);
    this._saveToStorage('shortlisted_case_study_items', shortlist);

    return {
      success: before !== shortlist.length,
      totalShortlistedCount: shortlist.length,
      message: before !== shortlist.length ? 'Case study removed from shortlist.' : 'Shortlist item not found.'
    };
  }

  // ---------------
  // Experts / Team directory
  // ---------------
  getExpertFilterOptions() {
    const experts = this._getFromStorage('experts');
    const commoditySet = new Set();
    const depositSet = new Set();
    const regionSet = new Set();
    const countrySet = new Set();
    const roleTitleSet = new Set();

    for (const e of experts) {
      if (Array.isArray(e.primary_commodities)) {
        e.primary_commodities.forEach(c => commoditySet.add(c));
      }
      if (Array.isArray(e.deposit_types)) {
        e.deposit_types.forEach(d => depositSet.add(d));
      }
      if (Array.isArray(e.regions)) {
        e.regions.forEach(r => regionSet.add(r));
      }
      if (Array.isArray(e.countries_worked)) {
        e.countries_worked.forEach(cn => countrySet.add(cn));
      }
      if (e.role_title) roleTitleSet.add(e.role_title);
    }

    const seniority_options = ['junior', 'mid_level', 'senior', 'principal', 'director'];

    return {
      commodity_options: Array.from(commoditySet),
      deposit_type_options: Array.from(depositSet),
      region_options: Array.from(regionSet),
      country_options: Array.from(countrySet),
      seniority_options,
      role_title_options: Array.from(roleTitleSet)
    };
  }

  searchExperts(
    primaryCommodity,
    depositType,
    region,
    country,
    seniorityLevel,
    minYearsExperience,
    roleTitle
  ) {
    let experts = this._getFromStorage('experts').filter(e => e.is_active !== false);

    if (primaryCommodity) {
      experts = experts.filter(e => Array.isArray(e.primary_commodities) && e.primary_commodities.includes(primaryCommodity));
    }
    if (depositType) {
      const dt = this._safeLower(depositType);
      experts = experts.filter(e =>
        Array.isArray(e.deposit_types) && e.deposit_types.some(d => this._safeLower(d) === dt)
      );
    }
    if (region) {
      experts = experts.filter(e => Array.isArray(e.regions) && e.regions.includes(region));
    }
    if (country) {
      experts = experts.filter(e => Array.isArray(e.countries_worked) && e.countries_worked.includes(country));
    }
    if (seniorityLevel) {
      experts = experts.filter(e => e.seniority_level === seniorityLevel);
    }
    if (typeof minYearsExperience === 'number') {
      experts = experts.filter(e => (e.years_experience || 0) >= minYearsExperience);
    }
    if (roleTitle) {
      const rt = this._safeLower(roleTitle);
      experts = experts.filter(e => this._safeLower(e.role_title) === rt);
    }

    return experts;
  }

  getExpertProfile(expertId) {
    const experts = this._getFromStorage('experts');
    const expert = experts.find(e => e.id === expertId) || null;
    // No explicit link to case studies in model; return empty list
    const related_case_studies = [];

    return { expert, related_case_studies };
  }

  saveExpertToContacts(expertId) {
    const experts = this._getFromStorage('experts');
    const expert = experts.find(e => e.id === expertId);
    if (!expert) {
      return { success: false, savedExpertId: null, totalSavedCount: 0, message: 'Expert not found.' };
    }

    let savedExperts = this._getFromStorage('saved_experts');
    const existing = savedExperts.find(se => se.expert_id === expertId);
    if (existing) {
      return {
        success: true,
        savedExpertId: existing.id,
        totalSavedCount: savedExperts.length,
        message: 'Expert already saved.'
      };
    }

    const record = {
      id: this._generateId('svexp'),
      expert_id: expertId,
      added_at: this._nowIso()
    };
    savedExperts.push(record);
    this._saveToStorage('saved_experts', savedExperts);

    return {
      success: true,
      savedExpertId: record.id,
      totalSavedCount: savedExperts.length,
      message: 'Expert saved to contacts.'
    };
  }

  getSavedExperts() {
    const saved = this._getFromStorage('saved_experts');
    const experts = this._getFromStorage('experts');

    return saved.map(item => ({
      saved_expert_id: item.id,
      expert: experts.find(e => e.id === item.expert_id) || null,
      added_at: item.added_at
    }));
  }

  removeSavedExpert(savedExpertId) {
    let saved = this._getFromStorage('saved_experts');
    const before = saved.length;
    saved = saved.filter(se => se.id !== savedExpertId);
    this._saveToStorage('saved_experts', saved);

    return {
      success: before !== saved.length,
      totalSavedCount: saved.length,
      message: before !== saved.length ? 'Expert removed from contacts.' : 'Saved expert not found.'
    };
  }

  submitExpertConsultationRequest(expertId, name, email, message) {
    const experts = this._getFromStorage('experts');
    const expert = experts.find(e => e.id === expertId);
    if (!expert) {
      return { success: false, expertConsultationRequestId: null, message: 'Expert not found.' };
    }

    const requests = this._getFromStorage('expert_consultation_requests');
    const record = {
      id: this._generateId('expreq'),
      expert_id: expertId,
      name,
      email,
      message,
      created_at: this._nowIso()
    };
    requests.push(record);
    this._saveToStorage('expert_consultation_requests', requests);

    return {
      success: true,
      expertConsultationRequestId: record.id,
      message: 'Consultation request submitted.'
    };
  }

  // ---------------
  // Budget Estimator
  // ---------------
  getBudgetEstimatorConfig() {
    const drilling_type_options = [
      { value: 'reverse_circulation_rc', label: 'Reverse circulation (RC)' },
      { value: 'diamond_core', label: 'Diamond core' },
      { value: 'rotary_air_blast', label: 'Rotary air blast (RAB)' },
      { value: 'auger', label: 'Auger' },
      { value: 'other', label: 'Other' }
    ];

    // Simple generic list including countries mentioned in tasks
    const country_options = ['Canada', 'Peru', 'Chile', 'Australia'];

    const cost_tier_options = [
      { value: 'low', label: 'Low cost' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High cost' }
    ];

    return {
      drilling_type_options,
      country_options,
      cost_tier_options
    };
  }

  calculateDrillingBudgetEstimate(drillingType, totalMeters, country, costTier, thresholdUsd) {
    const meters = Number(totalMeters) || 0;

    const baseRates = {
      reverse_circulation_rc: { low: 80, medium: 110, high: 150 },
      diamond_core: { low: 120, medium: 170, high: 230 },
      rotary_air_blast: { low: 60, medium: 90, high: 120 },
      auger: { low: 40, medium: 60, high: 80 },
      other: { low: 80, medium: 120, high: 160 }
    };

    const typeKey = baseRates[drillingType] ? drillingType : 'other';
    const tierKey = ['low', 'medium', 'high'].includes(costTier) ? costTier : 'medium';
    const baseRate = baseRates[typeKey][tierKey];

    const countryMultipliers = {
      Canada: 1.1,
      Peru: 1.0,
      Chile: 1.05,
      Australia: 1.2
    };
    const multiplier = countryMultipliers[country] || 1.0;

    const estimated_total_cost_usd = Math.round(meters * baseRate * multiplier);

    const estimates = this._getFromStorage('budget_estimates');
    const estimate = {
      id: this._generateId('bdgest'),
      tool_type: 'drilling_budget_estimator',
      drilling_type: drillingType,
      total_meters: meters,
      country,
      cost_tier: tierKey,
      estimated_total_cost_usd,
      currency: 'usd',
      created_at: this._nowIso()
    };
    estimates.push(estimate);
    this._saveToStorage('budget_estimates', estimates);
    localStorage.setItem('current_budget_estimate_id', estimate.id);

    const threshold = typeof thresholdUsd === 'number' ? thresholdUsd : null;
    const threshold_comparison = {
      threshold_usd: threshold,
      is_under_threshold: threshold !== null ? estimated_total_cost_usd <= threshold : false
    };

    return { estimate, threshold_comparison };
  }

  emailBudgetEstimateSummary(budgetEstimateId, email, subject, notes) {
    const estimates = this._getFromStorage('budget_estimates');
    const estimate = estimates.find(e => e.id === budgetEstimateId);
    if (!estimate) {
      return { success: false, estimateEmailId: null, message: 'Budget estimate not found.' };
    }

    const emails = this._getFromStorage('estimate_emails');
    const record = {
      id: this._generateId('estemail'),
      budget_estimate_id: budgetEstimateId,
      email,
      subject: subject || 'Budget estimate summary',
      notes: notes || null,
      sent_at: this._nowIso()
    };
    emails.push(record);
    this._saveToStorage('estimate_emails', emails);

    return {
      success: true,
      estimateEmailId: record.id,
      message: 'Estimate summary emailed (simulated).'
    };
  }

  // ---------------
  // Documents & My Library
  // ---------------
  getDocumentFilterOptions() {
    const document_type_options = [
      { value: 'brochure', label: 'Brochure' },
      { value: 'factsheet', label: 'Factsheet' },
      { value: 'whitepaper', label: 'Whitepaper' },
      { value: 'case_study_summary', label: 'Case study summary' },
      { value: 'technical_note', label: 'Technical note' },
      { value: 'other', label: 'Other' }
    ];

    const docs = this._getFromStorage('documents');
    const topicSet = new Set();
    for (const d of docs) {
      if (Array.isArray(d.topics)) {
        d.topics.forEach(t => topicSet.add(t));
      }
    }

    const topic_options = Array.from(topicSet);

    return { document_type_options, topic_options };
  }

  searchDocuments(documentType, query, topics, isActive) {
    let docs = this._getFromStorage('documents');

    if (typeof isActive === 'boolean') {
      docs = docs.filter(d => !!d.is_active === isActive);
    }
    if (documentType) {
      docs = docs.filter(d => d.document_type === documentType);
    }

    const q = this._safeLower(query);
    if (q) {
      docs = docs.filter(d => {
        const inTitle = this._safeLower(d.title).includes(q);
        const inDesc = this._safeLower(d.description).includes(q);
        const inTopics = Array.isArray(d.topics) && d.topics.some(t => this._safeLower(t).includes(q));
        return inTitle || inDesc || inTopics;
      });
    }

    if (Array.isArray(topics) && topics.length) {
      docs = docs.filter(d => {
        if (!Array.isArray(d.topics)) return false;
        return topics.some(t => d.topics.includes(t));
      });
    }

    return docs;
  }

  addDocumentToLibrary(documentId) {
    const documents = this._getFromStorage('documents');
    const doc = documents.find(d => d.id === documentId);
    if (!doc) {
      return { success: false, libraryItemId: null, totalSavedCount: 0, message: 'Document not found.' };
    }

    let library = this._getFromStorage('library_items');
    const existing = library.find(li => li.document_id === documentId);
    if (existing) {
      return {
        success: true,
        libraryItemId: existing.id,
        totalSavedCount: library.length,
        message: 'Document already in library.'
      };
    }

    const item = {
      id: this._generateId('libitem'),
      document_id: documentId,
      added_at: this._nowIso()
    };
    library.push(item);
    this._saveToStorage('library_items', library);

    return {
      success: true,
      libraryItemId: item.id,
      totalSavedCount: library.length,
      message: 'Document added to library.'
    };
  }

  getLibraryItems() {
    const library = this._getFromStorage('library_items');
    const documents = this._getFromStorage('documents');

    return library.map(item => ({
      library_item_id: item.id,
      document: documents.find(d => d.id === item.document_id) || null,
      added_at: item.added_at
    }));
  }

  removeLibraryItem(libraryItemId) {
    let library = this._getFromStorage('library_items');
    const before = library.length;
    library = library.filter(li => li.id !== libraryItemId);
    this._saveToStorage('library_items', library);

    return {
      success: before !== library.length,
      totalSavedCount: library.length,
      message: before !== library.length ? 'Document removed from library.' : 'Library item not found.'
    };
  }

  // ---------------
  // Custom Service Bundle Builder
  // ---------------
  getBundleBuilderConfig() {
    const services = this._getFromStorage('services');
    // Ensure key bundle-buildable services are available even if not pre-seeded
    const categories = this._getFromStorage('service_categories');
    const findCategoryIdBySlug = slug => {
      const cat = categories.find(c => c.slug === slug);
      return cat ? cat.id : slug;
    };
    let servicesModified = false;
    const ensureService = (id, name, slug, categorySlug, baseCostUsd, durationMonths, tags) => {
      if (!services.some(s => s.id === id || s.slug === slug || s.name === name)) {
        services.push({
          id,
          category_id: findCategoryIdBySlug(categorySlug),
          name,
          slug,
          description: name,
          is_scoping_study_option: false,
          is_bundle_buildable: true,
          default_duration_months: durationMonths,
          min_duration_months: durationMonths,
          max_duration_months: durationMonths * 2,
          base_cost_usd: baseCostUsd,
          cost_tier: 'standard',
          tags: tags || [],
          image: null
        });
        servicesModified = true;
      }
    };
    // Geological mapping
    ensureService(
      'svc_geological_mapping_bundle',
      'Geological mapping',
      'geological-mapping',
      'exploration_strategy_planning',
      120000,
      1.5,
      ['geology', 'mapping']
    );
    // Geophysics
    ensureService(
      'svc_geophysics_bundle',
      'Geophysics program support',
      'geophysics-program-support',
      'geophysics',
      180000,
      2,
      ['geophysics']
    );
    // Data & analytics
    ensureService(
      'svc_data_analytics_bundle',
      'Data & analytics for exploration',
      'data-analytics-exploration',
      'data_analytics',
      140000,
      1.5,
      ['data', 'analytics']
    );
    if (servicesModified) {
      this._saveToStorage('services', services);
    }
    const buildable = services.filter(s => s.is_bundle_buildable);

    const available_services = buildable.map(s => ({
      service: s,
      allowed_scope_levels: ['lite', 'standard', 'extended']
    }));

    const scope_level_descriptions = {
      lite: 'Focused scope with minimal extras, suitable for tight budgets.',
      standard: 'Balanced scope with typical deliverables and iterations.',
      extended: 'Expanded scope with deeper analysis, iterations, and options.'
    };

    return {
      available_services,
      scope_level_descriptions
    };
  }

  addServiceToCurrentBundle(serviceId, scopeLevel) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId && s.is_bundle_buildable);
    if (!service) {
      return {
        success: false,
        bundleId: null,
        bundleServiceItemId: null,
        bundle_summary: null,
        message: 'Service not available for bundles.'
      };
    }

    const allowedScopes = ['lite', 'standard', 'extended'];
    const scope = allowedScopes.includes(scopeLevel) ? scopeLevel : 'standard';

    const bundle = this._getOrCreateCurrentBundle();
    let items = this._getFromStorage('bundle_service_items');

    // Prevent duplicates for same service & bundle? Allow multiple; here we'll allow multiples.

    const factorMap = { lite: 0.7, standard: 1.0, extended: 1.5 };
    const factor = factorMap[scope] || 1.0;

    const baseDuration = service.default_duration_months || service.min_duration_months || 1;
    const baseCost = service.base_cost_usd || 0;

    const item = {
      id: this._generateId('bitem'),
      bundle_id: bundle.id,
      service_id: serviceId,
      scope_level: scope,
      estimated_duration_months: Math.max(0.1, baseDuration * factor),
      estimated_cost_usd: Math.max(0, baseCost * factor)
    };

    items.push(item);
    this._saveToStorage('bundle_service_items', items);

    this._recalculateBundleTotals(bundle.id);
    const updatedBundle = this._getOrCreateCurrentBundle();

    const bundle_summary = {
      total_estimated_duration_months: updatedBundle.total_estimated_duration_months || 0,
      total_estimated_cost_usd: updatedBundle.total_estimated_cost_usd || 0,
      currency: updatedBundle.currency || 'usd',
      services_count: this._getFromStorage('bundle_service_items').filter(i => i.bundle_id === updatedBundle.id).length
    };

    return {
      success: true,
      bundleId: updatedBundle.id,
      bundleServiceItemId: item.id,
      bundle_summary,
      message: 'Service added to bundle.'
    };
  }

  updateBundleServiceItem(bundleServiceItemId, scopeLevel, estimatedDurationMonths, estimatedCostUsd) {
    let items = this._getFromStorage('bundle_service_items');
    const idx = items.findIndex(i => i.id === bundleServiceItemId);
    if (idx === -1) {
      return {
        success: false,
        bundleId: null,
        bundle_summary: null,
        message: 'Bundle service item not found.'
      };
    }

    const item = items[idx];
    const bundleId = item.bundle_id;

    if (scopeLevel) {
      const allowedScopes = ['lite', 'standard', 'extended'];
      if (allowedScopes.includes(scopeLevel)) {
        item.scope_level = scopeLevel;
        // Recalculate from base if explicit cost/duration not provided
        const services = this._getFromStorage('services');
        const service = services.find(s => s.id === item.service_id);
        if (service) {
          const factorMap = { lite: 0.7, standard: 1.0, extended: 1.5 };
          const factor = factorMap[scopeLevel] || 1.0;
          const baseDuration = service.default_duration_months || service.min_duration_months || 1;
          const baseCost = service.base_cost_usd || 0;
          if (estimatedDurationMonths === undefined) {
            item.estimated_duration_months = Math.max(0.1, baseDuration * factor);
          }
          if (estimatedCostUsd === undefined) {
            item.estimated_cost_usd = Math.max(0, baseCost * factor);
          }
        }
      }
    }

    if (typeof estimatedDurationMonths === 'number') {
      item.estimated_duration_months = Math.max(0, estimatedDurationMonths);
    }
    if (typeof estimatedCostUsd === 'number') {
      item.estimated_cost_usd = Math.max(0, estimatedCostUsd);
    }

    items[idx] = item;
    this._saveToStorage('bundle_service_items', items);

    this._recalculateBundleTotals(bundleId);
    const bundles = this._getFromStorage('custom_service_bundles');
    const bundle = bundles.find(b => b.id === bundleId) || null;

    const bundle_summary = bundle
      ? {
          total_estimated_duration_months: bundle.total_estimated_duration_months || 0,
          total_estimated_cost_usd: bundle.total_estimated_cost_usd || 0,
          currency: bundle.currency || 'usd',
          services_count: this._getFromStorage('bundle_service_items').filter(i => i.bundle_id === bundleId).length
        }
      : null;

    return {
      success: true,
      bundleId,
      bundle_summary,
      message: 'Bundle service item updated.'
    };
  }

  removeServiceFromCurrentBundle(bundleServiceItemId) {
    let items = this._getFromStorage('bundle_service_items');
    const item = items.find(i => i.id === bundleServiceItemId);
    if (!item) {
      return {
        success: false,
        bundleId: null,
        bundle_summary: null,
        message: 'Bundle service item not found.'
      };
    }

    const bundleId = item.bundle_id;
    items = items.filter(i => i.id !== bundleServiceItemId);
    this._saveToStorage('bundle_service_items', items);

    this._recalculateBundleTotals(bundleId);
    const bundles = this._getFromStorage('custom_service_bundles');
    const bundle = bundles.find(b => b.id === bundleId) || null;

    const bundle_summary = bundle
      ? {
          total_estimated_duration_months: bundle.total_estimated_duration_months || 0,
          total_estimated_cost_usd: bundle.total_estimated_cost_usd || 0,
          currency: bundle.currency || 'usd',
          services_count: this._getFromStorage('bundle_service_items').filter(i => i.bundle_id === bundleId).length
        }
      : null;

    return {
      success: true,
      bundleId,
      bundle_summary,
      message: 'Service removed from bundle.'
    };
  }

  getCurrentBundleSummary() {
    const bundle = this._getOrCreateCurrentBundle();
    const items = this._getFromStorage('bundle_service_items').filter(i => i.bundle_id === bundle.id);
    const services = this._getFromStorage('services');

    const servicesDetailed = items.map(i => ({
      bundle_service_item_id: i.id,
      service: services.find(s => s.id === i.service_id) || null,
      scope_level: i.scope_level,
      estimated_duration_months: i.estimated_duration_months,
      estimated_cost_usd: i.estimated_cost_usd
    }));

    return {
      bundle,
      services: servicesDetailed
    };
  }

  submitCurrentBundleForQuote(name, email, message, bundleName) {
    const bundle = this._getOrCreateCurrentBundle();
    const bundles = this._getFromStorage('custom_service_bundles');

    const idx = bundles.findIndex(b => b.id === bundle.id);
    if (idx !== -1) {
      bundles[idx].status = 'submitted';
      bundles[idx].last_updated_at = this._nowIso();
      if (bundleName) {
        bundles[idx].name = bundleName;
      }
      this._saveToStorage('custom_service_bundles', bundles);
    }

    const submissions = this._getFromStorage('bundle_submissions');
    const submission = {
      id: this._generateId('bundlesub'),
      bundle_id: bundle.id,
      name,
      email,
      message: message || null,
      submitted_at: this._nowIso()
    };
    submissions.push(submission);
    this._saveToStorage('bundle_submissions', submissions);

    return {
      success: true,
      bundleSubmissionId: submission.id,
      bundleId: bundle.id,
      message: 'Bundle submitted for quote.'
    };
  }

  // ---------------
  // Insights (Articles & Webinars) & Reading List
  // ---------------
  getInsightsFilterOptions() {
    const items = this._getFromStorage('content_items');

    const topicSet = new Set();
    const commoditySet = new Set();
    for (const c of items) {
      if (Array.isArray(c.topics)) c.topics.forEach(t => topicSet.add(t));
      if (Array.isArray(c.commodity_focus)) c.commodity_focus.forEach(co => commoditySet.add(co));
    }

    const content_type_options = [
      { value: 'articles', label: 'Articles' },
      { value: 'webinars', label: 'Webinars' }
    ];

    const topic_options = Array.from(topicSet);
    const commodity_options = Array.from(commoditySet);

    const now = new Date();
    const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const last365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const date_range_presets = [
      {
        id: 'last_90_days',
        label: 'Last 90 days',
        from_date: last90.toISOString(),
        to_date: now.toISOString()
      },
      {
        id: 'last_12_months',
        label: 'Last 12 months',
        from_date: last365.toISOString(),
        to_date: now.toISOString()
      }
    ];

    return { content_type_options, topic_options, commodity_options, date_range_presets };
  }

  searchContentItems(contentType, query, primaryTopic, topicTags, commodity, fromDate, toDate, sortBy) {
    let items = this._getFromStorage('content_items');

    // For webinars, also synthesize basic content records from webinar sessions
    if (contentType === 'webinars') {
      const webinarSessions = this._getFromStorage('webinar_sessions');
      const webinarIds = Array.from(new Set(webinarSessions.map(s => s.webinar_id).filter(Boolean)));
      const existingIds = new Set(items.filter(i => i.content_type === 'webinars').map(i => i.id));
      const synthetic = [];
      for (const wid of webinarIds) {
        if (existingIds.has(wid)) continue;
        const sessionsForWebinar = webinarSessions.filter(s => s.webinar_id === wid);
        let earliest = null;
        for (const s of sessionsForWebinar) {
          const dt = this._parseDate(s.start_time);
          if (!dt) continue;
          if (!earliest || dt < earliest) earliest = dt;
        }
        const scheduledIso = (earliest || new Date()).toISOString();
        let title = 'Upcoming webinar';
        let summary = 'Live webinar session for explorers and miners.';
        if (String(wid).toLowerCase().includes('resource_estimation')) {
          title = 'Practical resource estimation webinar';
          summary = 'Webinar on resource estimation concepts and best practices for explorers.';
        }
        synthetic.push({
          id: wid,
          content_type: 'webinars',
          title,
          slug: wid,
          summary,
          body: summary,
          primary_topic: 'Resource estimation',
          topics: ['resource estimation'],
          commodity_focus: [],
          scheduled_date: scheduledIso,
          is_published: true,
          created_at: scheduledIso,
          last_updated_at: scheduledIso
        });
      }
      if (synthetic.length) {
        items = items.concat(synthetic);
      }
    }

    items = items.filter(i => i.content_type === contentType && i.is_published !== false);

    const q = this._safeLower(query);
    if (q) {
      items = items.filter(i => {
        const inTitle = this._safeLower(i.title).includes(q);
        const inSummary = this._safeLower(i.summary).includes(q);
        const inBody = this._safeLower(i.body).includes(q);
        return inTitle || inSummary || inBody;
      });
    }

    if (primaryTopic) {
      const pt = this._safeLower(primaryTopic);
      items = items.filter(i => this._safeLower(i.primary_topic) === pt);
    }

    if (Array.isArray(topicTags) && topicTags.length) {
      const tagsLower = topicTags.map(t => this._safeLower(t));
      items = items.filter(i => {
        if (!Array.isArray(i.topics)) return false;
        const itemTags = i.topics.map(t => this._safeLower(t));
        return tagsLower.some(t => itemTags.includes(t));
      });
    }

    if (commodity) {
      items = items.filter(i => Array.isArray(i.commodity_focus) && i.commodity_focus.includes(commodity));
    }

    const from = this._parseDate(fromDate);
    const to = this._parseDate(toDate);

    if (from || to) {
      items = items.filter(i => {
        const dt = this._parseDate(i.publish_date || i.scheduled_date || i.created_at);
        if (!dt) return false;
        if (from && dt < from) return false;
        if (to && dt > to) return false;
        return true;
      });
    }

    const sortKey = sortBy || 'date_desc';
    items.sort((a, b) => {
      const da = this._parseDate(a.publish_date || a.scheduled_date || a.created_at) || new Date(0);
      const db = this._parseDate(b.publish_date || b.scheduled_date || b.created_at) || new Date(0);
      const diff = da - db;
      return sortKey === 'date_asc' ? diff : -diff;
    });

    return items;
  }

  getContentDetail(contentId) {
    const items = this._getFromStorage('content_items');
    let content = items.find(c => c.id === contentId) || null;
    let webinar_sessions = [];
    const allSessions = this._getFromStorage('webinar_sessions');
    if (content && content.content_type === 'webinars') {
      webinar_sessions = allSessions.filter(s => s.webinar_id === content.id);
    } else if (!content) {
      const sessionsForWebinar = allSessions.filter(s => s.webinar_id === contentId);
      if (sessionsForWebinar.length) {
        let earliest = null;
        for (const s of sessionsForWebinar) {
          const dt = this._parseDate(s.start_time);
          if (!dt) continue;
          if (!earliest || dt < earliest) earliest = dt;
        }
        const scheduledIso = (earliest || new Date()).toISOString();
        let title = 'Upcoming webinar';
        let summary = 'Live webinar session for explorers and miners.';
        if (String(contentId).toLowerCase().includes('resource_estimation')) {
          title = 'Practical resource estimation webinar';
          summary = 'Webinar on resource estimation concepts and best practices for explorers.';
        }
        content = {
          id: contentId,
          content_type: 'webinars',
          title,
          slug: String(contentId),
          summary,
          body: summary,
          primary_topic: 'Resource estimation',
          topics: ['resource estimation'],
          commodity_focus: [],
          scheduled_date: scheduledIso,
          is_published: true,
          created_at: scheduledIso,
          last_updated_at: scheduledIso
        };
        webinar_sessions = sessionsForWebinar;
      }
    }

    return { content, webinar_sessions };
  }

  getWebinarSessions(webinarId) {
    const sessions = this._getFromStorage('webinar_sessions');
    return sessions.filter(s => s.webinar_id === webinarId);
  }

  registerForWebinar(webinarId, sessionId, fullName, email, organizationType) {
    const items = this._getFromStorage('content_items');
    let webinar = items.find(c => c.id === webinarId && c.content_type === 'webinars');
    if (!webinar) {
      const sessions = this._getFromStorage('webinar_sessions');
      const hasSessions = sessions.some(s => s.webinar_id === webinarId);
      if (hasSessions) {
        webinar = { id: webinarId, content_type: 'webinars' };
      } else {
        return { success: false, webinarRegistrationId: null, message: 'Webinar not found.' };
      }
    }

    let chosenSessionId = null;
    if (sessionId) {
      const sessions = this._getFromStorage('webinar_sessions');
      const session = sessions.find(s => s.id === sessionId && s.webinar_id === webinarId);
      if (!session) {
        return { success: false, webinarRegistrationId: null, message: 'Selected session not found.' };
      }
      if (session.is_full) {
        return { success: false, webinarRegistrationId: null, message: 'Selected session is full.' };
      }
      chosenSessionId = session.id;
    }

    const regs = this._getFromStorage('webinar_registrations');
    const record = {
      id: this._generateId('webreg'),
      webinar_id: webinarId,
      session_id: chosenSessionId || null,
      full_name: fullName,
      email,
      organization_type: organizationType || null,
      registered_at: this._nowIso()
    };

    regs.push(record);
    this._saveToStorage('webinar_registrations', regs);

    return {
      success: true,
      webinarRegistrationId: record.id,
      message: 'Webinar registration submitted.'
    };
  }

  saveArticleToReadingList(articleId) {
    const items = this._getFromStorage('content_items');
    const article = items.find(c => c.id === articleId && c.content_type === 'articles');
    if (!article) {
      return { success: false, readingListItemId: null, totalSavedCount: 0, message: 'Article not found.' };
    }

    let rl = this._getFromStorage('reading_list_items');
    const existing = rl.find(r => r.article_id === articleId);
    if (existing) {
      return {
        success: true,
        readingListItemId: existing.id,
        totalSavedCount: rl.length,
        message: 'Article already in reading list.'
      };
    }

    const record = {
      id: this._generateId('readitem'),
      article_id: articleId,
      added_at: this._nowIso()
    };
    rl.push(record);
    this._saveToStorage('reading_list_items', rl);

    return {
      success: true,
      readingListItemId: record.id,
      totalSavedCount: rl.length,
      message: 'Article added to reading list.'
    };
  }

  getReadingListItems() {
    const rl = this._getFromStorage('reading_list_items');
    const items = this._getFromStorage('content_items');

    return rl.map(r => ({
      reading_list_item_id: r.id,
      article: items.find(c => c.id === r.article_id) || null,
      added_at: r.added_at
    }));
  }

  removeReadingListItem(readingListItemId) {
    let rl = this._getFromStorage('reading_list_items');
    const before = rl.length;
    rl = rl.filter(r => r.id !== readingListItemId);
    this._saveToStorage('reading_list_items', rl);

    return {
      success: before !== rl.length,
      totalSavedCount: rl.length,
      message: before !== rl.length ? 'Article removed from reading list.' : 'Reading list item not found.'
    };
  }

  // ---------------
  // About / General inquiry
  // ---------------
  getAboutPageContent() {
    // Static descriptive content; data entities are not affected.
    return {
      title: 'About Our Mineral Exploration Consulting Practice',
      body:
        'We are an independent group of geoscientists, data specialists, and ESG practitioners supporting explorers and miners globally. Our team has experience across porphyry copper, epithermal gold, lithium brines and hard-rock deposits, and other key deposit styles.',
      mission:
        'To help explorers allocate capital more effectively by combining robust geology, fit-for-purpose data, and pragmatic ESG considerations.',
      commodities: ['copper', 'gold', 'lithium', 'nickel', 'uranium', 'multi-commodity'],
      regions: ['South America', 'North America', 'Australia', 'Africa', 'Europe'],
      contact_email: 'info@example-exploration-consulting.com',
      contact_phone: '+1 (000) 000-0000'
    };
  }

  submitGeneralInquiry(name, email, message) {
    const inquiries = this._getFromStorage('general_inquiries');
    const record = {
      id: this._generateId('geninq'),
      name,
      email,
      message,
      created_at: this._nowIso()
    };
    inquiries.push(record);
    this._saveToStorage('general_inquiries', inquiries);

    return {
      success: true,
      message: 'General inquiry submitted.'
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