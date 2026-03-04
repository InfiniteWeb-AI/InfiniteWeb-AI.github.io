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
    this._entityStorageKeys = {
      Service: 'services',
      ServiceRequest: 'service_requests',
      Tool: 'tools',
      EnergySavingsCalculation: 'energy_savings_calculations',
      DetailedAssessmentRequest: 'detailed_assessment_requests',
      NewsletterSubscription: 'newsletter_subscriptions',
      JobPosting: 'job_postings',
      JobApplication: 'job_applications',
      CaseStudy: 'case_studies',
      CaseStudyInterest: 'case_study_interests',
      Certification: 'certifications',
      ComplianceDocumentationRequest: 'compliance_documentation_requests'
    };

    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const keys = [
      'services',
      'service_requests',
      'tools',
      'energy_savings_calculations',
      'detailed_assessment_requests',
      'newsletter_subscriptions',
      'job_postings',
      'job_applications',
      'case_studies',
      'case_study_interests',
      'certifications',
      'compliance_documentation_requests'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return Array.isArray(defaultValue) || typeof defaultValue === 'object'
        ? JSON.parse(JSON.stringify(defaultValue))
        : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return Array.isArray(defaultValue) || typeof defaultValue === 'object'
        ? JSON.parse(JSON.stringify(defaultValue))
        : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _persistEntity(storageKeyOrType, entity) {
    // storageKeyOrType can be a storage key string or an entity type like 'ServiceRequest'
    let storageKey = storageKeyOrType;
    if (this._entityStorageKeys[storageKeyOrType]) {
      storageKey = this._entityStorageKeys[storageKeyOrType];
    }
    const list = this._getFromStorage(storageKey, []);
    list.push(entity);
    this._saveToStorage(storageKey, list);
    return entity;
  }

  _applyListSortingAndPaging(items, page = 1, pageSize = 20, compareFn) {
    const list = items.slice();
    if (typeof compareFn === 'function') {
      list.sort(compareFn);
    }
    const total = list.length;
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (safePage - 1) * safePageSize;
    const paged = list.slice(start, start + safePageSize);
    return {
      items: paged,
      total,
      page: safePage,
      page_size: safePageSize
    };
  }

  _calculateEnergySavingsMetrics(
    baseline_annual_consumption_value,
    baseline_annual_consumption_unit,
    expected_energy_reduction_percent,
    average_electricity_price_value,
    average_electricity_price_unit,
    project_lifetime_value,
    project_lifetime_unit
  ) {
    // Normalize baseline to kWh/year if necessary
    let baselineKWhPerYear = baseline_annual_consumption_value;
    if (baseline_annual_consumption_unit === 'mwh_per_year') {
      baselineKWhPerYear = baseline_annual_consumption_value * 1000;
    } else if (baseline_annual_consumption_unit === 'gwh_per_year') {
      baselineKWhPerYear = baseline_annual_consumption_value * 1000000;
    }

    const reductionFraction = expected_energy_reduction_percent / 100;
    const annualSavingsKWh = baselineKWhPerYear * reductionFraction;

    // Assume price unit is per kWh (as defined in enums)
    const estimated_annual_savings_value = annualSavingsKWh * average_electricity_price_value;
    const estimated_lifetime_savings_value =
      project_lifetime_unit === 'years' ? estimated_annual_savings_value * project_lifetime_value : estimated_annual_savings_value;

    // simple_payback_years and roi_percent cannot be computed without project cost; set to null
    const simple_payback_years = null;
    const roi_percent = null;

    // Determine currency from average_electricity_price_unit
    let currency = 'other';
    if (average_electricity_price_unit === 'usd_per_kwh') {
      currency = 'usd';
    } else if (average_electricity_price_unit === 'eur_per_kwh') {
      currency = 'eur';
    } else if (average_electricity_price_unit === 'gbp_per_kwh') {
      currency = 'gbp';
    }

    return {
      estimated_annual_savings_value,
      estimated_annual_savings_currency: currency,
      estimated_lifetime_savings_value,
      simple_payback_years,
      roi_percent
    };
  }

  // ---------- Mapping helpers ----------

  _mapServiceCategoryIdToName(category_id) {
    const map = {
      solar_renewable_engineering: 'Solar & Renewable Engineering',
      maintenance_testing: 'Maintenance & Testing',
      training_workshops: 'Training & Workshops'
    };
    return map[category_id] || category_id || '';
  }

  _mapIndustryToLabel(industry) {
    const map = {
      data_centers: 'Data Centers',
      chemical_petrochemical: 'Chemical & Petrochemical',
      utilities: 'Utilities',
      manufacturing: 'Manufacturing',
      oil_gas: 'Oil & Gas',
      industrial: 'Industrial',
      renewables: 'Renewables',
      other: 'Other'
    };
    return map[industry] || industry || '';
  }

  _mapVoltageRangeToLabel(voltage_range_category) {
    const map = {
      lv_0_1kv: 'LV (0–1 kV)',
      mv_1_36kv: 'MV (1–36 kV)',
      hv_36_245kv: 'HV (36–245 kV)',
      ehv_above_245kv: 'EHV (>245 kV)',
      not_applicable: 'Not Applicable'
    };
    return map[voltage_range_category] || voltage_range_category || '';
  }

  _mapTrainingTopicToLabel(topic) {
    const map = {
      protection_relay_coordination: 'Protection & Relay Coordination',
      arc_flash_safety: 'Arc Flash Safety',
      power_system_studies: 'Power System Studies',
      renewables_integration: 'Renewables Integration',
      substation_design: 'Substation Design',
      custom_training: 'Custom Training'
    };
    return map[topic] || topic || '';
  }

  _mapTrainingDeliveryModeToLabel(mode) {
    const map = {
      online_virtual: 'Online / Virtual',
      in_person: 'In Person',
      hybrid: 'Hybrid'
    };
    return map[mode] || mode || '';
  }

  _mapTrainingLevelToLabel(level) {
    const map = {
      introductory: 'Introductory',
      intermediate: 'Intermediate',
      advanced: 'Advanced'
    };
    return map[level] || level || '';
  }

  _mapTrainingDurationToLabel(duration) {
    const map = {
      up_to_1_day: 'Up to 1 day',
      two_to_three_days: '2–3 days',
      four_to_five_days: '4–5 days',
      more_than_five_days: 'More than 5 days'
    };
    return map[duration] || duration || '';
  }

  _mapNewsletterTopicToLabel(topic) {
    const map = {
      grid_modernization: 'Grid Modernization',
      renewables_integration: 'Renewables Integration',
      protection_control: 'Protection & Control',
      hv_substations: 'HV Substations',
      grid_planning: 'Grid Planning',
      asset_management: 'Asset Management',
      safety_compliance: 'Safety & Compliance'
    };
    return map[topic] || topic || '';
  }

  _mapEmailFrequencyToLabel(freq) {
    const map = {
      monthly_digest: 'Monthly Digest',
      weekly: 'Weekly',
      biweekly: 'Biweekly',
      quarterly: 'Quarterly'
    };
    return map[freq] || freq || '';
  }

  _mapRegionTimezoneToLabel(region) {
    const map = {
      north_america_cst: 'North America (CST)',
      north_america_est: 'North America (EST)',
      europe_cet: 'Europe (CET)',
      asia_pacific_sgt: 'Asia Pacific (SGT)',
      other: 'Other'
    };
    return map[region] || region || '';
  }

  _mapExperienceLevelToLabel(level) {
    const map = {
      zero_to_5_years: '0–5 years',
      five_to_10_years: '5–10 years',
      ten_plus_years: '10+ years',
      internships_entry_level: 'Internships / Entry level'
    };
    return map[level] || level || '';
  }

  _mapJobTypeToLabel(type) {
    const map = {
      full_time: 'Full-time',
      part_time: 'Part-time',
      contract: 'Contract',
      internship: 'Internship',
      temporary: 'Temporary'
    };
    return map[type] || type || '';
  }

  _mapCaseStudyIndustryToLabel(industry) {
    const map = {
      data_centers: 'Data Centers',
      utilities: 'Utilities',
      industrial: 'Industrial',
      chemical_petrochemical: 'Chemical & Petrochemical',
      oil_gas: 'Oil & Gas',
      renewables: 'Renewables',
      other: 'Other'
    };
    return map[industry] || industry || '';
  }

  _mapCaseStudyServiceTypeToLabel(serviceType) {
    const map = {
      hv_substation_design: 'High-Voltage Substation Design',
      grid_connection_study: 'Grid Connection Study',
      protection_control: 'Protection & Control',
      solar_pv_engineering: 'Solar PV Engineering',
      maintenance_testing: 'Maintenance & Testing',
      training_workshops: 'Training & Workshops',
      other: 'Other'
    };
    return map[serviceType] || serviceType || '';
  }

  _mapRegionToLabel(region) {
    const map = {
      europe: 'Europe',
      north_america: 'North America',
      south_america: 'South America',
      asia_pacific: 'Asia Pacific',
      middle_east_africa: 'Middle East & Africa',
      global: 'Global'
    };
    return map[region] || region || '';
  }

  _mapCapacityRangeToLabel(capacityRange) {
    const map = {
      under_10_mw: 'Under 10 MW',
      ten_to_50_mw: '10–50 MW',
      fifty_to_200_mw: '50–200 MW',
      above_200_mw: 'Above 200 MW'
    };
    return map[capacityRange] || capacityRange || '';
  }

  _mapCompliancePurposeToLabel(purpose) {
    const map = {
      safety_audit_preparation: 'Safety Audit Preparation',
      vendor_qualification: 'Vendor Qualification',
      rfp_submission: 'RFP Submission',
      internal_audit: 'Internal Audit',
      regulatory_inspection: 'Regulatory Inspection',
      other: 'Other'
    };
    return map[purpose] || purpose || '';
  }

  _getCapacityRangeLabelFromService(service) {
    if (!service) return '';
    const min = service.project_size_min_mw;
    const max = service.project_size_max_mw;
    if (min != null && max != null) {
      return min + '–' + max + ' MW';
    }
    if (min != null) {
      return '≥ ' + min + ' MW';
    }
    if (max != null) {
      return '≤ ' + max + ' MW';
    }
    return '';
  }

  // ---------- Core interface implementations ----------

  // getHomepageContent()
  getHomepageContent() {
    // Structured content may optionally be stored under 'homepage_content'; if not, use minimal defaults
    const stored = this._getFromStorage('homepage_content', null);
    const services = this._getFromStorage('services', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const tools = this._getFromStorage('tools', []);

    // Core service categories derived from existing services (distinct category_id)
    const categoryIds = Array.from(
      new Set(
        services
          .filter(s => s && s.is_active)
          .map(s => s.category_id)
          .filter(Boolean)
      )
    );

    const core_service_categories = categoryIds.map(category_id => ({
      category_id,
      category_name: this._mapServiceCategoryIdToName(category_id),
      short_description: ''
    }));

    // Featured services: first few active services
    const activeServices = services.filter(s => s && s.is_active);
    const featured_services = activeServices.slice(0, 4).map(s => ({
      service: s,
      category_name: this._mapServiceCategoryIdToName(s.category_id)
    }));

    // Featured case studies: most recent first
    const sortedCaseStudies = caseStudies
      .slice()
      .sort((a, b) => {
        const da = a && a.publish_date ? Date.parse(a.publish_date) : 0;
        const db = b && b.publish_date ? Date.parse(b.publish_date) : 0;
        return db - da;
      });
    const featured_case_studies = sortedCaseStudies.slice(0, 4);

    // Featured tools: all active tools (or first few)
    const activeTools = tools.filter(t => t && t.is_active);
    const featured_tools = activeTools.slice(0, 4);

    return {
      hero_title: stored && stored.hero_title ? stored.hero_title : 'Welcome to our engineering services portal',
      hero_subtitle: stored && stored.hero_subtitle ? stored.hero_subtitle : '',
      core_service_categories,
      featured_services,
      featured_case_studies,
      featured_tools
    };
  }

  // searchSiteContent(query, result_type, page, page_size)
  searchSiteContent(query, result_type = 'all', page = 1, page_size = 20) {
    const q = (query || '').toLowerCase();
    const rt = result_type || 'all';

    // Instrumentation for task completion tracking
    try {
      const normalizedQuery = (query || '').trim().toLowerCase();
      if (normalizedQuery === 'grid connection study') {
        localStorage.setItem('task3_searchParams', JSON.stringify({ query, result_type: rt }));
      }
    } catch (e) {
      console.error('Instrumentation error (searchSiteContent):', e);
    }

    const servicesAll = this._getFromStorage('services', []);
    const toolsAll = this._getFromStorage('tools', []);
    const caseStudiesAll = this._getFromStorage('case_studies', []);

    const matchesString = (value) => {
      if (!q) return true; // if query empty, return all
      if (!value) return false;
      return String(value).toLowerCase().indexOf(q) !== -1;
    };

    let services = [];
    let tools = [];
    let case_studies = [];

    if (rt === 'all' || rt === 'services') {
      services = servicesAll.filter(s =>
        s && (
          matchesString(s.name) ||
          matchesString(s.short_description) ||
          matchesString(s.long_description)
        )
      );
    }

    if (rt === 'all' || rt === 'tools') {
      tools = toolsAll.filter(t =>
        t && (
          matchesString(t.name) ||
          matchesString(t.description)
        )
      );
    }

    if (rt === 'all' || rt === 'case_studies') {
      case_studies = caseStudiesAll.filter(cs =>
        cs && (
          matchesString(cs.title) ||
          matchesString(cs.summary) ||
          matchesString(cs.content)
        )
      );
    }

    // Apply paging separately per type to keep implementation simple
    const applyPaging = (items) => {
      const { items: paged } = this._applyListSortingAndPaging(items, page, page_size);
      return paged;
    };

    const servicesPaged = applyPaging(services);
    const toolsPaged = applyPaging(tools);
    const caseStudiesPaged = applyPaging(case_studies);

    const total_results = services.length + tools.length + case_studies.length;

    return {
      query: query || '',
      total_results,
      page,
      page_size,
      services: servicesPaged,
      tools: toolsPaged,
      case_studies: caseStudiesPaged
    };
  }

  // getServiceCategories()
  getServiceCategories() {
    // We expose all known categories from the schema
    const categories = [
      'solar_renewable_engineering',
      'maintenance_testing',
      'training_workshops'
    ];

    return categories.map(category_id => ({
      category_id,
      category_name: this._mapServiceCategoryIdToName(category_id),
      description: ''
    }));
  }

  // getServiceFilterOptions(category_id)
  getServiceFilterOptions(category_id) {
    // Voltage ranges and industries are shared
    const voltage_ranges = [
      { value: 'lv_0_1kv', label: this._mapVoltageRangeToLabel('lv_0_1kv') },
      { value: 'mv_1_36kv', label: this._mapVoltageRangeToLabel('mv_1_36kv') },
      { value: 'hv_36_245kv', label: this._mapVoltageRangeToLabel('hv_36_245kv') },
      { value: 'ehv_above_245kv', label: this._mapVoltageRangeToLabel('ehv_above_245kv') },
      { value: 'not_applicable', label: this._mapVoltageRangeToLabel('not_applicable') }
    ];

    const industries = [
      'data_centers',
      'chemical_petrochemical',
      'utilities',
      'manufacturing',
      'oil_gas',
      'industrial',
      'renewables',
      'other'
    ].map(value => ({ value, label: this._mapIndustryToLabel(value) }));

    const service_availability_options = [
      { key: 'has_24_7_emergency_support', label: '24/7 Emergency Support' }
    ];

    const training_topics = [
      'protection_relay_coordination',
      'arc_flash_safety',
      'power_system_studies',
      'renewables_integration',
      'substation_design',
      'custom_training'
    ].map(value => ({ value, label: this._mapTrainingTopicToLabel(value) }));

    const training_delivery_modes = [
      'online_virtual',
      'in_person',
      'hybrid'
    ].map(value => ({ value, label: this._mapTrainingDeliveryModeToLabel(value) }));

    const training_levels = [
      'introductory',
      'intermediate',
      'advanced'
    ].map(value => ({ value, label: this._mapTrainingLevelToLabel(value) }));

    const training_duration_categories = [
      'up_to_1_day',
      'two_to_three_days',
      'four_to_five_days',
      'more_than_five_days'
    ].map(value => ({ value, label: this._mapTrainingDurationToLabel(value) }));

    const price_currencies = [
      'usd', 'eur', 'gbp', 'other'
    ].map(value => ({ value, label: value.toUpperCase() }));

    let sort_options = [
      { value: 'default', label: 'Default' }
    ];

    if (category_id === 'maintenance_testing') {
      sort_options.push({ value: 'response_time_fastest_first', label: 'Response Time - Fastest First' });
    }
    if (category_id === 'training_workshops') {
      sort_options.push({ value: 'price_per_attendee_lowest_first', label: 'Price per Attendee - Lowest First' });
    }

    return {
      voltage_ranges,
      industries,
      service_availability_options,
      training_topics,
      training_delivery_modes,
      training_levels,
      training_duration_categories,
      price_currencies,
      sort_options
    };
  }

  // listServices(category_id, filters, sort_by, page, page_size)
  listServices(category_id, filters = {}, sort_by = 'default', page = 1, page_size = 20) {
    const services = this._getFromStorage('services', []);

    filters = filters || {};

    // Instrumentation for task completion tracking
    try {
      // Task 2: Maintenance & Testing service list with specific filters and sorting
      if (
        category_id === 'maintenance_testing' &&
        filters &&
        filters.industry === 'chemical_petrochemical' &&
        filters.voltage_range_category === 'mv_1_36kv' &&
        filters.has_24_7_emergency_support === true &&
        sort_by === 'response_time_fastest_first'
      ) {
        localStorage.setItem('task2_serviceListParams', JSON.stringify({ category_id, filters, sort_by }));
      }

      // Task 7: Training & Workshops with specific filters and max price
      if (
        category_id === 'training_workshops' &&
        filters &&
        filters.training_topic === 'protection_relay_coordination' &&
        filters.training_delivery_mode === 'online_virtual' &&
        filters.training_level === 'intermediate' &&
        filters.training_duration_category === 'two_to_three_days' &&
        typeof filters.price_per_attendee_max === 'number' &&
        filters.price_per_attendee_max === 1500
      ) {
        localStorage.setItem('task7_trainingFilterParams', JSON.stringify({ category_id, filters, sort_by }));
      }
    } catch (e) {
      console.error('Instrumentation error (listServices):', e);
    }

    let filtered = services.filter(s => s && s.is_active && s.category_id === category_id);

    if (filters.industry) {
      filtered = filtered.filter(s => s.industry === filters.industry);
    }
    if (filters.voltage_range_category) {
      filtered = filtered.filter(s => s.voltage_range_category === filters.voltage_range_category);
    }
    if (typeof filters.has_24_7_emergency_support === 'boolean') {
      filtered = filtered.filter(s => !!s.has_24_7_emergency_support === !!filters.has_24_7_emergency_support);
    }
    if (filters.training_topic) {
      filtered = filtered.filter(s => s.training_topic === filters.training_topic);
    }
    if (filters.training_delivery_mode) {
      filtered = filtered.filter(s => s.training_delivery_mode === filters.training_delivery_mode);
    }
    if (filters.training_level) {
      filtered = filtered.filter(s => s.training_level === filters.training_level);
    }
    if (filters.training_duration_category) {
      filtered = filtered.filter(s => s.training_duration_category === filters.training_duration_category);
    }
    if (typeof filters.price_per_attendee_max === 'number') {
      filtered = filtered.filter(s =>
        typeof s.price_per_attendee === 'number' && s.price_per_attendee <= filters.price_per_attendee_max
      );
    }
    if (filters.price_currency) {
      filtered = filtered.filter(s => s.price_currency === filters.price_currency);
    }

    let compareFn = null;
    if (sort_by === 'response_time_fastest_first') {
      compareFn = (a, b) => {
        const av = typeof a.response_time_hours === 'number' ? a.response_time_hours : Number.POSITIVE_INFINITY;
        const bv = typeof b.response_time_hours === 'number' ? b.response_time_hours : Number.POSITIVE_INFINITY;
        return av - bv;
      };
    } else if (sort_by === 'price_per_attendee_lowest_first') {
      compareFn = (a, b) => {
        const av = typeof a.price_per_attendee === 'number' ? a.price_per_attendee : Number.POSITIVE_INFINITY;
        const bv = typeof b.price_per_attendee === 'number' ? b.price_per_attendee : Number.POSITIVE_INFINITY;
        return av - bv;
      };
    }

    const { items: paged, total, page: currentPage, page_size: resultPageSize } = this._applyListSortingAndPaging(filtered, page, page_size, compareFn);

    const items = paged.map(service => ({
      service,
      category_name: this._mapServiceCategoryIdToName(service.category_id),
      industry_label: this._mapIndustryToLabel(service.industry),
      voltage_range_label: this._mapVoltageRangeToLabel(service.voltage_range_category),
      highlight_metrics: {
        typical_delivery_time_weeks: service.typical_delivery_time_weeks,
        max_project_capacity_mw: service.max_project_capacity_mw,
        price_per_attendee: service.price_per_attendee
      }
    }));

    return {
      total,
      page: currentPage,
      page_size: resultPageSize,
      items
    };
  }

  // getServiceDetail(service_slug)
  getServiceDetail(service_slug) {
    const services = this._getFromStorage('services', []);
    const service = services.find(s => s && s.slug === service_slug) || null;

    if (!service) {
      return {
        service: null,
        category_name: '',
        industry_label: '',
        voltage_range_label: '',
        capacity_range_label: '',
        available_request_types: [],
        display_sections: {
          scope: '',
          features: '',
          industries_served: '',
          key_metrics: ''
        }
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (
        service &&
        (service.name === 'Basic Grid Connection Study' ||
          service.name === 'Advanced Dynamic Grid Study')
      ) {
        let existing = [];
        try {
          const stored = localStorage.getItem('task3_comparedServiceIds');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              existing = parsed;
            }
          }
        } catch (parseError) {
          existing = [];
        }
        if (existing.indexOf(service.id) === -1) {
          existing.push(service.id);
        }
        localStorage.setItem('task3_comparedServiceIds', JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Instrumentation error (getServiceDetail):', e);
    }

    const category_name = this._mapServiceCategoryIdToName(service.category_id);
    const industry_label = this._mapIndustryToLabel(service.industry);
    const voltage_range_label = this._mapVoltageRangeToLabel(service.voltage_range_category);
    const capacity_range_label = this._getCapacityRangeLabelFromService(service);

    // Determine available request types based on service_type
    let available_request_types = ['general_inquiry'];
    if (service.service_type === 'engineering_service') {
      available_request_types = ['quote', 'proposal', 'general_inquiry'];
    } else if (service.service_type === 'maintenance_service') {
      available_request_types = ['service_call', 'quote', 'general_inquiry'];
    } else if (service.service_type === 'training_course') {
      available_request_types = ['group_booking', 'general_inquiry'];
    } else if (service.service_type === 'study_service') {
      available_request_types = ['proposal', 'quote', 'general_inquiry'];
    } else if (service.service_type === 'consulting_service') {
      available_request_types = ['proposal', 'general_inquiry'];
    }

    const display_sections = {
      scope: service.long_description || service.short_description || '',
      features: '',
      industries_served: industry_label,
      key_metrics: capacity_range_label
    };

    return {
      service,
      category_name,
      industry_label,
      voltage_range_label,
      capacity_range_label,
      available_request_types,
      display_sections
    };
  }

  // submitServiceRequest(service_id, request_type, full_name, company, business_email, phone, preferred_contact_method,
  //                      project_size, country, state_region, city, expected_start, project_description,
  //                      response_priority, number_of_participants, preferred_start_date, additional_notes)
  submitServiceRequest(
    service_id,
    request_type,
    full_name,
    company,
    business_email,
    phone,
    preferred_contact_method,
    project_size,
    country,
    state_region,
    city,
    expected_start,
    project_description,
    response_priority,
    number_of_participants,
    preferred_start_date,
    additional_notes
  ) {
    const services = this._getFromStorage('services', []);
    const service = services.find(s => s && s.id === service_id) || null;

    const now = new Date().toISOString();
    const serviceRequest = {
      id: this._generateId('sr'),
      service_id,
      request_type,
      created_at: now,
      full_name: full_name || null,
      company: company || null,
      business_email: business_email || null,
      phone: phone || null,
      preferred_contact_method: preferred_contact_method || null,
      project_size: project_size || null,
      country: country || null,
      state_region: state_region || null,
      city: city || null,
      expected_start: expected_start || null,
      project_description: project_description || null,
      response_priority: response_priority || null,
      number_of_participants: typeof number_of_participants === 'number' ? number_of_participants : null,
      preferred_start_date: preferred_start_date || null,
      additional_notes: additional_notes || null,
      status: 'submitted'
    };

    this._persistEntity('service_requests', serviceRequest);

    return {
      success: !!service,
      message: service ? 'Service request submitted.' : 'Service not found, but request stored.',
      service_request: serviceRequest
    };
  }

  // listTools()
  listTools() {
    const tools = this._getFromStorage('tools', []);
    return tools.filter(t => t && t.is_active);
  }

  // getToolDetail(tool_slug)
  getToolDetail(tool_slug) {
    const tools = this._getFromStorage('tools', []);
    const tool = tools.find(t => t && t.slug === tool_slug) || null;

    if (!tool) {
      return {
        tool: null,
        instructions: '',
        input_fields: []
      };
    }

    let instructions = tool.description || '';
    const input_fields = [];

    if (tool.code === 'energy_savings_roi') {
      instructions = instructions || 'Enter your baseline consumption, expected reduction, electricity price, and project lifetime to estimate savings.';
      input_fields.push(
        {
          field_name: 'baseline_annual_consumption_value',
          label: 'Baseline Annual Consumption',
          unit_options: ['kwh_per_year', 'mwh_per_year', 'gwh_per_year']
        },
        {
          field_name: 'expected_energy_reduction_percent',
          label: 'Expected Energy Reduction',
          unit_options: ['percent']
        },
        {
          field_name: 'average_electricity_price_value',
          label: 'Average Electricity Price',
          unit_options: ['usd_per_kwh', 'eur_per_kwh', 'gbp_per_kwh']
        },
        {
          field_name: 'project_lifetime_value',
          label: 'Project Lifetime',
          unit_options: ['years']
        }
      );
    }

    return {
      tool,
      instructions,
      input_fields
    };
  }

  // runEnergySavingsCalculation(tool_id, baseline_value, baseline_unit, reduction_percent,
  //                             price_value, price_unit, lifetime_value, lifetime_unit)
  runEnergySavingsCalculation(
    tool_id,
    baseline_annual_consumption_value,
    baseline_annual_consumption_unit,
    expected_energy_reduction_percent,
    average_electricity_price_value,
    average_electricity_price_unit,
    project_lifetime_value,
    project_lifetime_unit
  ) {
    const tools = this._getFromStorage('tools', []);
    const tool = tools.find(t => t && t.id === tool_id) || null;

    if (!tool || tool.code !== 'energy_savings_roi') {
      return {
        calculation: null,
        success: false,
        message: 'Invalid tool for Energy Savings & ROI calculation.'
      };
    }

    const metrics = this._calculateEnergySavingsMetrics(
      baseline_annual_consumption_value,
      baseline_annual_consumption_unit,
      expected_energy_reduction_percent,
      average_electricity_price_value,
      average_electricity_price_unit,
      project_lifetime_value,
      project_lifetime_unit
    );

    const now = new Date().toISOString();
    const calculation = {
      id: this._generateId('calc'),
      tool_id,
      created_at: now,
      baseline_annual_consumption_value,
      baseline_annual_consumption_unit,
      expected_energy_reduction_percent,
      average_electricity_price_value,
      average_electricity_price_unit,
      project_lifetime_value,
      project_lifetime_unit,
      estimated_annual_savings_value: metrics.estimated_annual_savings_value,
      estimated_annual_savings_currency: metrics.estimated_annual_savings_currency,
      estimated_lifetime_savings_value: metrics.estimated_lifetime_savings_value,
      simple_payback_years: metrics.simple_payback_years,
      roi_percent: metrics.roi_percent
    };

    this._persistEntity('energy_savings_calculations', calculation);

    return {
      calculation,
      success: true,
      message: 'Calculation completed.'
    };
  }

  // submitDetailedAssessmentRequest(tool_id, calculation_id, project_type, planned_implementation_timeline,
  //                                 full_name, company, business_email, phone)
  submitDetailedAssessmentRequest(
    tool_id,
    calculation_id,
    project_type,
    planned_implementation_timeline,
    full_name,
    company,
    business_email,
    phone
  ) {
    const tools = this._getFromStorage('tools', []);
    const tool = tools.find(t => t && t.id === tool_id) || null;

    const calculations = this._getFromStorage('energy_savings_calculations', []);
    const calculation = calculation_id
      ? calculations.find(c => c && c.id === calculation_id) || null
      : null;

    const now = new Date().toISOString();
    const request = {
      id: this._generateId('dar'),
      tool_id,
      calculation_id: calculation_id || null,
      created_at: now,
      project_type,
      planned_implementation_timeline,
      full_name: full_name || null,
      company: company || null,
      business_email: business_email || null,
      phone: phone || null,
      status: 'submitted'
    };

    this._persistEntity('detailed_assessment_requests', request);

    const valid = !!tool;

    return {
      detailed_assessment_request: request,
      success: valid,
      message: valid ? 'Detailed assessment request submitted.' : 'Tool not found, but request stored.'
    };
  }

  // getNewsletterOptions()
  getNewsletterOptions() {
    const topics_of_interest = [
      'grid_modernization',
      'renewables_integration',
      'protection_control',
      'hv_substations',
      'grid_planning',
      'asset_management',
      'safety_compliance'
    ].map(value => ({
      value,
      label: this._mapNewsletterTopicToLabel(value),
      description: ''
    }));

    const email_frequencies = [
      'monthly_digest',
      'weekly',
      'biweekly',
      'quarterly'
    ].map(value => ({
      value,
      label: this._mapEmailFrequencyToLabel(value)
    }));

    const region_timezones = [
      'north_america_cst',
      'north_america_est',
      'europe_cet',
      'asia_pacific_sgt',
      'other'
    ].map(value => ({
      value,
      label: this._mapRegionTimezoneToLabel(value)
    }));

    return {
      topics_of_interest,
      email_frequencies,
      region_timezones
    };
  }

  // createNewsletterSubscription(full_name, work_email, company, topics_of_interest,
  //                              email_frequency, region_timezone, works_for_utility_or_grid_operator)
  createNewsletterSubscription(
    full_name,
    work_email,
    company,
    topics_of_interest,
    email_frequency,
    region_timezone,
    works_for_utility_or_grid_operator
  ) {
    const now = new Date().toISOString();

    const subscription = {
      id: this._generateId('ns'),
      full_name,
      work_email,
      company: company || null,
      topics_of_interest: Array.isArray(topics_of_interest) ? topics_of_interest.slice() : [],
      email_frequency,
      region_timezone,
      works_for_utility_or_grid_operator: !!works_for_utility_or_grid_operator,
      subscribed_at: now
    };

    this._persistEntity('newsletter_subscriptions', subscription);

    return {
      subscription,
      success: true,
      message: 'Subscription created.'
    };
  }

  // getJobSearchFilterOptions()
  getJobSearchFilterOptions() {
    const jobPostings = this._getFromStorage('job_postings', []);

    // Derive locations from existing job postings
    const locationMap = {};
    for (const job of jobPostings) {
      if (!job || !job.location_display) continue;
      if (!locationMap[job.location_display]) {
        locationMap[job.location_display] = {
          display_name: job.location_display,
          city: job.city || null,
          state_region: job.state_region || null,
          country: job.country || null
        };
      }
    }
    const locations = Object.keys(locationMap).map(k => locationMap[k]);

    const experience_levels = [
      'zero_to_5_years',
      'five_to_10_years',
      'ten_plus_years',
      'internships_entry_level'
    ].map(value => ({ value, label: this._mapExperienceLevelToLabel(value) }));

    const job_types = [
      'full_time',
      'part_time',
      'contract',
      'internship',
      'temporary'
    ].map(value => ({ value, label: this._mapJobTypeToLabel(value) }));

    return {
      locations,
      experience_levels,
      job_types
    };
  }

  // searchJobPostings(keyword, location_display, experience_level, job_type, page, page_size)
  searchJobPostings(
    keyword,
    location_display,
    experience_level,
    job_type,
    page = 1,
    page_size = 20
  ) {
    const jobsAll = this._getFromStorage('job_postings', []);
    const q = (keyword || '').toLowerCase();

    // Instrumentation for task completion tracking
    try {
      const normalizedKeyword = (keyword || '').trim().toLowerCase();
      if (
        normalizedKeyword === 'power systems engineer' &&
        location_display === 'Houston, TX (USA)' &&
        experience_level === 'zero_to_5_years' &&
        job_type === 'full_time'
      ) {
        localStorage.setItem(
          'task8_jobSearchParams',
          JSON.stringify({ keyword, location_display, experience_level, job_type })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (searchJobPostings):', e);
    }

    let filtered = jobsAll.filter(j => j && j.status === 'open');

    if (q) {
      filtered = filtered.filter(j => {
        return (
          (j.title && j.title.toLowerCase().indexOf(q) !== -1) ||
          (j.description && j.description.toLowerCase().indexOf(q) !== -1) ||
          (j.requirements && j.requirements.toLowerCase().indexOf(q) !== -1)
        );
      });
    }

    if (location_display) {
      filtered = filtered.filter(j => j.location_display === location_display);
    }
    if (experience_level) {
      filtered = filtered.filter(j => j.experience_level === experience_level);
    }
    if (job_type) {
      filtered = filtered.filter(j => j.job_type === job_type);
    }

    const compareFn = (a, b) => {
      const da = a && a.date_posted ? Date.parse(a.date_posted) : 0;
      const db = b && b.date_posted ? Date.parse(b.date_posted) : 0;
      // Most recent first
      return db - da;
    };

    const { items: paged, total, page: currentPage, page_size: resultPageSize } = this._applyListSortingAndPaging(filtered, page, page_size, compareFn);

    return {
      total,
      page: currentPage,
      page_size: resultPageSize,
      jobs: paged
    };
  }

  // getJobPostingDetail(job_slug)
  getJobPostingDetail(job_slug) {
    const jobs = this._getFromStorage('job_postings', []);
    const job = jobs.find(j => j && j.slug === job_slug) || null;
    return job;
  }

  // startJobApplication(job_posting_id, full_name, email, linkedin_profile_url, has_uploaded_files)
  startJobApplication(
    job_posting_id,
    full_name,
    email,
    linkedin_profile_url,
    has_uploaded_files = false
  ) {
    const jobs = this._getFromStorage('job_postings', []);
    const job = jobs.find(j => j && j.id === job_posting_id) || null;

    const now = new Date().toISOString();
    const application = {
      id: this._generateId('ja'),
      job_posting_id,
      full_name,
      email,
      linkedin_profile_url: linkedin_profile_url || null,
      created_at: now,
      status: 'started',
      has_uploaded_files: !!has_uploaded_files
    };

    this._persistEntity('job_applications', application);

    return {
      job_application: application,
      success: !!job,
      message: job ? 'Job application started.' : 'Job not found, but application stored.'
    };
  }

  // getCaseStudyFilterOptions()
  getCaseStudyFilterOptions() {
    const industries = [
      'data_centers',
      'utilities',
      'industrial',
      'chemical_petrochemical',
      'oil_gas',
      'renewables',
      'other'
    ].map(value => ({ value, label: this._mapCaseStudyIndustryToLabel(value) }));

    const services = [
      'hv_substation_design',
      'grid_connection_study',
      'protection_control',
      'solar_pv_engineering',
      'maintenance_testing',
      'training_workshops',
      'other'
    ].map(value => ({ value, label: this._mapCaseStudyServiceTypeToLabel(value) }));

    const regions = [
      'europe',
      'north_america',
      'south_america',
      'asia_pacific',
      'middle_east_africa',
      'global'
    ].map(value => ({ value, label: this._mapRegionToLabel(value) }));

    const capacity_ranges_mw = [
      'under_10_mw',
      'ten_to_50_mw',
      'fifty_to_200_mw',
      'above_200_mw'
    ].map(value => ({ value, label: this._mapCapacityRangeToLabel(value) }));

    const sort_options = [
      { value: 'most_recent_first', label: 'Most Recent First' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return {
      industries,
      services,
      regions,
      capacity_ranges_mw,
      sort_options
    };
  }

  // listCaseStudies(filters, sort_by, page, page_size)
  listCaseStudies(filters = {}, sort_by = 'most_recent_first', page = 1, page_size = 20) {
    const all = this._getFromStorage('case_studies', []);

    // Instrumentation for task completion tracking
    try {
      if (
        filters &&
        filters.industry === 'data_centers' &&
        filters.primary_service_type === 'hv_substation_design' &&
        filters.region === 'europe' &&
        filters.capacity_range_mw === 'fifty_to_200_mw' &&
        sort_by === 'most_recent_first'
      ) {
        localStorage.setItem('task4_caseStudyListParams', JSON.stringify({ filters, sort_by }));
      }
    } catch (e) {
      console.error('Instrumentation error (listCaseStudies):', e);
    }

    let filtered = all.slice();

    if (filters.industry) {
      filtered = filtered.filter(cs => cs && cs.industry === filters.industry);
    }
    if (filters.primary_service_type) {
      filtered = filtered.filter(cs => cs && cs.primary_service_type === filters.primary_service_type);
    }
    if (filters.region) {
      filtered = filtered.filter(cs => cs && cs.region === filters.region);
    }
    if (filters.capacity_range_mw) {
      filtered = filtered.filter(cs => cs && cs.capacity_range_mw === filters.capacity_range_mw);
    }

    let compareFn = null;
    if (sort_by === 'most_recent_first') {
      compareFn = (a, b) => {
        const da = a && a.publish_date ? Date.parse(a.publish_date) : 0;
        const db = b && b.publish_date ? Date.parse(b.publish_date) : 0;
        return db - da;
      };
    } else if (sort_by === 'oldest_first') {
      compareFn = (a, b) => {
        const da = a && a.publish_date ? Date.parse(a.publish_date) : 0;
        const db = b && b.publish_date ? Date.parse(b.publish_date) : 0;
        return da - db;
      };
    }

    const { items: paged, total, page: currentPage, page_size: resultPageSize } = this._applyListSortingAndPaging(filtered, page, page_size, compareFn);

    return {
      total,
      page: currentPage,
      page_size: resultPageSize,
      case_studies: paged
    };
  }

  // getCaseStudyDetail(case_study_slug)
  getCaseStudyDetail(case_study_slug) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find(c => c && c.slug === case_study_slug) || null;
    return cs;
  }

  // submitCaseStudyInterest(case_study_id, role, full_name, company, business_email, message)
  submitCaseStudyInterest(
    case_study_id,
    role,
    full_name,
    company,
    business_email,
    message
  ) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find(c => c && c.id === case_study_id) || null;

    const now = new Date().toISOString();
    const interest = {
      id: this._generateId('csi'),
      case_study_id,
      created_at: now,
      full_name: full_name || null,
      company: company || null,
      business_email: business_email || null,
      role,
      message: message || null,
      status: 'submitted'
    };

    this._persistEntity('case_study_interests', interest);

    return {
      case_study_interest: interest,
      success: !!cs,
      message: cs ? 'Interest submitted.' : 'Case study not found, but interest stored.'
    };
  }

  // listCertifications()
  listCertifications() {
    const certs = this._getFromStorage('certifications', []);
    return certs;
  }

  // getCertificationDetail(certification_code)
  getCertificationDetail(certification_code) {
    const certs = this._getFromStorage('certifications', []);
    const cert = certs.find(c => c && c.code === certification_code) || null;
    return cert;
  }

  // getComplianceRequestOptions()
  getComplianceRequestOptions() {
    const purposes = [
      'safety_audit_preparation',
      'vendor_qualification',
      'rfp_submission',
      'internal_audit',
      'regulatory_inspection',
      'other'
    ].map(value => ({ value, label: this._mapCompliancePurposeToLabel(value) }));

    return purposes;
  }

  // submitComplianceDocumentationRequest(certification_id, purpose_of_request, business_email, additional_details)
  submitComplianceDocumentationRequest(
    certification_id,
    purpose_of_request,
    business_email,
    additional_details
  ) {
    const certs = this._getFromStorage('certifications', []);
    const cert = certs.find(c => c && c.id === certification_id) || null;

    const now = new Date().toISOString();
    const request = {
      id: this._generateId('cdr'),
      certification_id,
      purpose_of_request,
      business_email,
      additional_details: additional_details || null,
      created_at: now,
      status: 'submitted'
    };

    this._persistEntity('compliance_documentation_requests', request);

    return {
      compliance_documentation_request: request,
      success: !!cert,
      message: cert ? 'Compliance documentation request submitted.' : 'Certification not found, but request stored.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored) {
      return stored;
    }

    // Minimal default structure (no mocked entity data)
    return {
      mission: '',
      values: '',
      history: '',
      core_expertise_areas: [],
      industries_served_summary: '',
      service_categories_summary: []
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