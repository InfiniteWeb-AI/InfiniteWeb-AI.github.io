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
    const arrayKeys = [
      'grant_programs',
      'incentive_programs',
      'properties',
      'metric_definitions',
      'reports',
      'events',
      'event_registrations',
      'organizations',
      'newsletter_subscriptions',
      'consultation_requests',
      'checklist_item_templates',
      'checklists',
      'dashboards',
      'region_configs',
      'incentives_page_states',
      'general_inquiries'
    ];

    for (const key of arrayKeys) {
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -------------------------
  // Internal helpers
  // -------------------------

  _getOrCreateDashboard() {
    let dashboards = this._getFromStorage('dashboards');
    if (dashboards.length > 0) {
      return dashboards[0];
    }
    const now = new Date().toISOString();
    const dashboard = {
      id: this._generateId('dashboard'),
      saved_grant_ids: [],
      preferred_incentive_id: null,
      saved_property_ids: [],
      saved_report_ids: [],
      favorite_organization_ids: [],
      saved_checklist_ids: [],
      created_at: now,
      updated_at: now
    };
    dashboards.push(dashboard);
    this._saveToStorage('dashboards', dashboards);
    return dashboard;
  }

  _saveDashboard(dashboard) {
    let dashboards = this._getFromStorage('dashboards');
    const index = dashboards.findIndex(d => d.id === dashboard.id);
    if (index >= 0) {
      dashboards[index] = dashboard;
    } else {
      dashboards.push(dashboard);
    }
    this._saveToStorage('dashboards', dashboards);
  }

  _getCurrentRegion() {
    const regions = this._getFromStorage('region_configs');
    if (Array.isArray(regions) && regions.length > 0) {
      return regions[0];
    }
    return null;
  }

  _getOrCreateIncentivesPageState() {
    let states = this._getFromStorage('incentives_page_states');
    if (states.length > 0) {
      return states[0];
    }
    const state = {
      id: this._generateId('incentives_page_state'),
      section: 'grants',
      last_updated: new Date().toISOString()
    };
    states.push(state);
    this._saveToStorage('incentives_page_states', states);
    return state;
  }

  _validateGrantSearchFilters(filters) {
    const normalized = {};
    if (!filters || typeof filters !== 'object') return normalized;

    if (filters.primary_industry) {
      normalized.primary_industry = String(filters.primary_industry);
    }

    const minEmp = Number(filters.min_company_size_employees);
    if (!isNaN(minEmp) && minEmp >= 0) {
      normalized.min_company_size_employees = minEmp;
    }

    const maxEmp = Number(filters.max_company_size_employees);
    if (!isNaN(maxEmp) && maxEmp >= 0) {
      normalized.max_company_size_employees = maxEmp;
    }

    const minFunding = Number(filters.min_funding_amount);
    if (!isNaN(minFunding) && minFunding >= 0) {
      normalized.min_funding_amount = minFunding;
    }

    if (typeof filters.only_open_for_applications === 'boolean') {
      normalized.only_open_for_applications = filters.only_open_for_applications;
    }

    return normalized;
  }

  _validatePropertySearchFilters(filters) {
    const normalized = {};
    if (!filters || typeof filters !== 'object') return normalized;

    if (filters.property_type) {
      normalized.property_type = String(filters.property_type);
    }

    const minSqft = Number(filters.min_sqft);
    if (!isNaN(minSqft) && minSqft >= 0) {
      normalized.min_sqft = minSqft;
    }

    const maxSqft = Number(filters.max_sqft);
    if (!isNaN(maxSqft) && maxSqft >= 0) {
      normalized.max_sqft = maxSqft;
    }

    const maxDist = Number(filters.max_distance_from_regional_center_miles);
    if (!isNaN(maxDist) && maxDist >= 0) {
      normalized.max_distance_from_regional_center_miles = maxDist;
    }

    if (typeof filters.require_highway_access === 'boolean') {
      normalized.require_highway_access = filters.require_highway_access;
    }

    return normalized;
  }

  _formatCurrency(amount, currency) {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '';
    const num = Number(amount);
    let symbol = '';
    switch (currency) {
      case 'usd':
        symbol = '$';
        break;
      case 'cad':
        symbol = 'CA$';
        break;
      case 'eur':
        symbol = '€';
        break;
      default:
        symbol = '';
    }
    try {
      return symbol + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } catch (e) {
      return symbol + String(num);
    }
  }

  _formatDateRangeOrSingle(startStr, endStr) {
    if (!startStr) return '';
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return '';

    const opts = { year: 'numeric', month: 'short', day: 'numeric' };
    let startFormatted;
    try {
      startFormatted = start.toLocaleDateString('en-US', opts);
    } catch (e) {
      startFormatted = start.toISOString().split('T')[0];
    }

    if (!endStr) return startFormatted;
    const end = new Date(endStr);
    if (isNaN(end.getTime())) return startFormatted;

    let endFormatted;
    try {
      endFormatted = end.toLocaleDateString('en-US', opts);
    } catch (e) {
      endFormatted = end.toISOString().split('T')[0];
    }

    if (startFormatted === endFormatted) return startFormatted;
    return startFormatted + ' – ' + endFormatted;
  }

  _validateChecklistSelectionRules(itemIds) {
    const result = {
      valid: false,
      message: '',
      items: []
    };
    if (!Array.isArray(itemIds)) {
      result.message = 'itemIds must be an array';
      return result;
    }
    if (itemIds.length !== 4) {
      result.message = 'Exactly four checklist items must be selected.';
      return result;
    }
    const templates = this._getFromStorage('checklist_item_templates');
    const selected = templates.filter(t => itemIds.includes(t.id));
    if (selected.length !== 4) {
      result.message = 'One or more selected checklist items do not exist.';
      return result;
    }
    const hasWorkforce = selected.some(t => t.is_workforce_related === true);
    const hasFinancing = selected.some(t => t.is_financing_related === true);
    if (!hasWorkforce || !hasFinancing) {
      result.message = 'Checklist must include at least one workforce-related and one financing-related item.';
      return result;
    }
    result.valid = true;
    result.items = selected;
    return result;
  }

  _createReportEntityFromConfig(config) {
    const now = new Date().toISOString();
    return {
      id: this._generateId('report'),
      title: config.title || null,
      industry: config.industry,
      primary_metric_code: config.primary_metric_code,
      secondary_metric_code: config.secondary_metric_code || null,
      additional_metric_codes: Array.isArray(config.additional_metric_codes)
        ? config.additional_metric_codes
        : [],
      year: config.year,
      time_aggregation: config.time_aggregation || 'calendar_year',
      is_saved_to_dashboard: true,
      created_at: now,
      updated_at: now,
      last_generated_at: now
    };
  }

  _updateEventRemainingSeats(eventId) {
    const events = this._getFromStorage('events');
    const idx = events.findIndex(e => e.id === eventId);
    if (idx === -1) return null;
    const event = events[idx];
    if (typeof event.remaining_seats === 'number') {
      if (event.remaining_seats > 0) {
        event.remaining_seats = event.remaining_seats - 1;
      }
      if (event.remaining_seats <= 0) {
        event.remaining_seats = 0;
        event.is_registration_open = false;
      }
    }
    events[idx] = event;
    this._saveToStorage('events', events);
    return typeof event.remaining_seats === 'number' ? event.remaining_seats : null;
  }

  // Label helpers

  _formatIndustryLabel(code) {
    if (!code) return '';
    const map = {
      manufacturing: 'Manufacturing',
      technology: 'Technology',
      services: 'Services',
      logistics: 'Logistics',
      healthcare: 'Healthcare',
      agriculture: 'Agriculture',
      construction: 'Construction',
      other: 'Other'
    };
    return map[code] || code;
  }

  _formatIncentiveTypeLabel(code) {
    const map = {
      tax_credit: 'Tax Credit',
      grant: 'Grant',
      loan: 'Loan',
      rebate: 'Rebate',
      training_grant: 'Training Grant',
      other: 'Other'
    };
    return map[code] || code;
  }

  _formatStatusLabel(code) {
    const map = {
      active: 'Active',
      inactive: 'Inactive',
      expired: 'Expired'
    };
    return map[code] || code;
  }

  _formatTopicLabel(code) {
    const map = {
      exporting: 'Exporting',
      international_trade: 'International Trade',
      marketing: 'Marketing',
      finance: 'Finance',
      workforce: 'Workforce',
      technology: 'Technology',
      manufacturing: 'Manufacturing',
      general_business: 'General Business',
      other: 'Other'
    };
    return map[code] || code;
  }

  _formatEventLevelLabel(code) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_levels: 'All Levels'
    };
    return map[code] || code;
  }

  _formatPropertyTypeLabel(code) {
    const map = {
      industrial: 'Industrial',
      office: 'Office',
      retail: 'Retail',
      land: 'Land',
      flex: 'Flex',
      warehouse: 'Warehouse',
      other: 'Other'
    };
    return map[code] || code;
  }

  _formatAudienceLabel(code) {
    const map = {
      women_owned_businesses: 'Women-Owned Businesses',
      women_entrepreneurs: 'Women Entrepreneurs',
      minority_owned_businesses: 'Minority-Owned Businesses',
      startups: 'Startups',
      exporters: 'Exporters',
      manufacturers: 'Manufacturers',
      technology_firms: 'Technology Firms',
      rural_businesses: 'Rural Businesses',
      general_business: 'General Business',
      other: 'Other'
    };
    return map[code] || code;
  }

  _formatMetricUnitLabel(unit) {
    const map = {
      percent: '%',
      currency_per_hour: 'per hour',
      currency_per_year: 'per year',
      count: 'count',
      index: 'index'
    };
    return map[unit] || unit || '';
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomeFeaturedContent
  getHomeFeaturedContent() {
    const dashboard = this._getOrCreateDashboard();
    const grants = this._getFromStorage('grant_programs');
    const incentives = this._getFromStorage('incentive_programs');
    const events = this._getFromStorage('events');
    const properties = this._getFromStorage('properties');
    const region = this._getCurrentRegion();

    const now = new Date();

    // Featured grants: open, soonest deadline
    const featured_grants = grants
      .filter(g => g.is_open_for_applications)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.application_deadline || 0).getTime();
        const db = new Date(b.application_deadline || 0).getTime();
        return da - db;
      })
      .slice(0, 5)
      .map(g => {
        const currency = g.currency || 'usd';
        return {
          grant: g,
          primary_industry_label: this._formatIndustryLabel(g.primary_industry),
          min_funding_display: this._formatCurrency(g.min_funding_amount, currency),
          max_funding_display: g.max_funding_amount != null
            ? this._formatCurrency(g.max_funding_amount, currency)
            : '',
          application_deadline_display: this._formatDateRangeOrSingle(g.application_deadline, null),
          is_open_for_applications: !!g.is_open_for_applications,
          is_saved_to_dashboard: dashboard.saved_grant_ids.includes(g.id)
        };
      });

    // Featured incentives: active, highest benefit
    const featured_incentives = incentives
      .filter(i => i.status === 'active')
      .slice()
      .sort((a, b) => {
        const av = typeof a.maximum_annual_benefit === 'number' ? a.maximum_annual_benefit : 0;
        const bv = typeof b.maximum_annual_benefit === 'number' ? b.maximum_annual_benefit : 0;
        return bv - av;
      })
      .slice(0, 5)
      .map(i => {
        let maximum_annual_benefit_display = '';
        if (typeof i.maximum_annual_benefit === 'number') {
          if (i.benefit_unit === 'usd') {
            maximum_annual_benefit_display = this._formatCurrency(i.maximum_annual_benefit, 'usd');
          } else if (i.benefit_unit === 'percent_tax_liability') {
            maximum_annual_benefit_display = i.maximum_annual_benefit + '% of tax liability';
          } else {
            maximum_annual_benefit_display = String(i.maximum_annual_benefit);
          }
        }
        return {
          incentive: i,
          incentive_type_label: this._formatIncentiveTypeLabel(i.incentive_type),
          maximum_annual_benefit_display,
          status_label: this._formatStatusLabel(i.status),
          is_preferred: dashboard.preferred_incentive_id === i.id
        };
      });

    // Featured events: upcoming and open for registration
    const featured_events = events
      .filter(e => {
        const start = new Date(e.start_datetime || 0);
        return e.is_registration_open && start >= now;
      })
      .slice()
      .sort((a, b) => new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0))
      .slice(0, 5)
      .map(e => {
        return {
          event: e,
          topic_label: this._formatTopicLabel(e.topic),
          level_label: this._formatEventLevelLabel(e.level),
          date_display: this._formatDateRangeOrSingle(e.start_datetime, e.end_datetime),
          is_registration_open: !!e.is_registration_open
        };
      });

    // Featured properties: available, closest to regional center
    const featured_properties = properties
      .filter(p => p.is_available)
      .slice()
      .sort((a, b) => {
        const da = typeof a.distance_from_regional_center_miles === 'number'
          ? a.distance_from_regional_center_miles
          : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_from_regional_center_miles === 'number'
          ? b.distance_from_regional_center_miles
          : Number.POSITIVE_INFINITY;
        return da - db;
      })
      .slice(0, 5)
      .map(p => {
        const sizeDisplay = typeof p.building_size_sqft === 'number'
          ? p.building_size_sqft.toLocaleString('en-US') + ' sq ft'
          : '';
        const distDisplay = typeof p.distance_from_regional_center_miles === 'number'
          ? p.distance_from_regional_center_miles.toFixed(1) + ' mi'
          : '';
        return {
          property: p,
          property_type_label: this._formatPropertyTypeLabel(p.property_type),
          building_size_display: sizeDisplay,
          distance_from_center_display: distDisplay,
          has_highway_access: !!p.has_highway_access,
          is_saved_to_shortlist: dashboard.saved_property_ids.includes(p.id)
        };
      });

    const regional_overview = {
      region: region,
      business_climate_summary: '',
      key_sectors: [],
      workforce_snapshot: ''
    };

    return {
      featured_grants,
      featured_incentives,
      featured_events,
      featured_properties,
      regional_overview
    };
  }

  // getCurrentRegionConfig
  getCurrentRegionConfig() {
    return this._getCurrentRegion();
  }

  // getIncentivesPageState
  getIncentivesPageState() {
    return this._getOrCreateIncentivesPageState();
  }

  // setIncentivesPageSection(section)
  setIncentivesPageSection(section) {
    const allowed = ['grants', 'tax_credits'];
    const validSection = allowed.includes(section) ? section : 'grants';
    const state = this._getOrCreateIncentivesPageState();
    state.section = validSection;
    state.last_updated = new Date().toISOString();
    const states = this._getFromStorage('incentives_page_states');
    const idx = states.findIndex(s => s.id === state.id);
    if (idx >= 0) {
      states[idx] = state;
    } else {
      states.push(state);
    }
    this._saveToStorage('incentives_page_states', states);
    return state;
  }

  // getGrantFilterOptions
  getGrantFilterOptions() {
    const industry_values = [
      'manufacturing',
      'technology',
      'services',
      'logistics',
      'healthcare',
      'agriculture',
      'construction',
      'other'
    ];
    const industry_options = industry_values.map(v => ({
      value: v,
      label: this._formatIndustryLabel(v)
    }));

    const company_size_buckets = [
      { min_employees: 1, max_employees: 24, label: '1–24 employees' },
      { min_employees: 25, max_employees: 99, label: '25–99 employees' },
      { min_employees: 100, max_employees: 249, label: '100–249 employees' },
      { min_employees: 250, max_employees: 999999, label: '250+ employees' }
    ];

    const funding_amount_presets = [
      { min_amount: 10000, label: '$10,000+' },
      { min_amount: 50000, label: '$50,000+' },
      { min_amount: 100000, label: '$100,000+' }
    ];

    const sort_options = [
      { value: 'application_deadline_asc', label: 'Application Deadline – Soonest First' },
      { value: 'funding_amount_desc', label: 'Funding Amount – Highest First' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      industry_options,
      company_size_buckets,
      funding_amount_presets,
      sort_options,
      default_sort: 'application_deadline_asc'
    };
  }

  // searchGrantPrograms(filters, sort_by, page, page_size)
  searchGrantPrograms(filters, sort_by, page, page_size) {
    const normalizedFilters = this._validateGrantSearchFilters(filters || {});
    const grants = this._getFromStorage('grant_programs');
    const dashboard = this._getOrCreateDashboard();

    let results = grants.filter(g => {
      // industry filter (include primary or other_industries)
      if (normalizedFilters.primary_industry) {
        const matchPrimary = g.primary_industry === normalizedFilters.primary_industry;
        const matchOther = Array.isArray(g.other_industries)
          ? g.other_industries.includes(normalizedFilters.primary_industry)
          : false;
        if (!matchPrimary && !matchOther) return false;
      }

      // company size range overlap
      if (normalizedFilters.min_company_size_employees != null) {
        const filterMin = normalizedFilters.min_company_size_employees;
        if (typeof g.max_company_size_employees === 'number' && g.max_company_size_employees < filterMin) {
          return false;
        }
      }
      if (normalizedFilters.max_company_size_employees != null) {
        const filterMax = normalizedFilters.max_company_size_employees;
        if (typeof g.min_company_size_employees === 'number' && g.min_company_size_employees > filterMax) {
          return false;
        }
      }

      // funding amount
      if (normalizedFilters.min_funding_amount != null) {
        const minRequired = normalizedFilters.min_funding_amount;
        if (typeof g.max_funding_amount === 'number') {
          if (g.max_funding_amount < minRequired) return false;
        } else if (typeof g.min_funding_amount === 'number') {
          if (g.min_funding_amount < minRequired) return false;
        }
      }

      // open for applications
      if (normalizedFilters.only_open_for_applications === true && !g.is_open_for_applications) {
        return false;
      }

      return true;
    });

    // Sorting
    const sort = sort_by || 'relevance';

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_grantSearchParams', JSON.stringify({ filters: normalizedFilters, sort_by: sort }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (sort === 'application_deadline_asc') {
      results.sort((a, b) => new Date(a.application_deadline || 0) - new Date(b.application_deadline || 0));
    } else if (sort === 'funding_amount_desc') {
      results.sort((a, b) => {
        const aVal = typeof a.max_funding_amount === 'number' ? a.max_funding_amount : (a.min_funding_amount || 0);
        const bVal = typeof b.max_funding_amount === 'number' ? b.max_funding_amount : (b.min_funding_amount || 0);
        return bVal - aVal;
      });
    }

    const total_count = results.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIdx = (pg - 1) * size;
    const endIdx = startIdx + size;
    const pageResults = results.slice(startIdx, endIdx).map(g => {
      const currency = g.currency || 'usd';
      const minFundingDisplay = this._formatCurrency(g.min_funding_amount, currency);
      const maxFundingDisplay = g.max_funding_amount != null
        ? this._formatCurrency(g.max_funding_amount, currency)
        : '';
      let companySizeLabel = '';
      if (g.min_company_size_employees != null || g.max_company_size_employees != null) {
        const minE = g.min_company_size_employees != null ? g.min_company_size_employees : 1;
        const maxE = g.max_company_size_employees != null ? g.max_company_size_employees : null;
        companySizeLabel = maxE ? `${minE}–${maxE} employees` : `${minE}+ employees`;
      }
      return {
        grant: g,
        primary_industry_label: this._formatIndustryLabel(g.primary_industry),
        company_size_range_label: companySizeLabel,
        min_funding_display: minFundingDisplay,
        max_funding_display: maxFundingDisplay,
        application_deadline_display: this._formatDateRangeOrSingle(g.application_deadline, null),
        is_open_for_applications: !!g.is_open_for_applications,
        is_saved_to_dashboard: dashboard.saved_grant_ids.includes(g.id)
      };
    });

    return {
      results: pageResults,
      total_count,
      page: pg,
      page_size: size
    };
  }

  // getGrantDetails(grantId)
  getGrantDetails(grantId) {
    const grants = this._getFromStorage('grant_programs');
    const grant = grants.find(g => g.id === grantId) || null;
    const dashboard = this._getOrCreateDashboard();

    if (!grant) {
      return {
        grant: null,
        primary_industry_label: '',
        industry_tags: [],
        company_size_range_label: '',
        funding_amount_display: '',
        application_deadline_display: '',
        open_date_display: '',
        is_open_for_applications: false,
        is_saved_to_dashboard: false,
        apply_instructions_html: ''
      };
    }

    const currency = grant.currency || 'usd';
    let fundingAmountDisplay = '';
    if (grant.min_funding_amount != null && grant.max_funding_amount != null) {
      fundingAmountDisplay =
        this._formatCurrency(grant.min_funding_amount, currency) +
        ' – ' +
        this._formatCurrency(grant.max_funding_amount, currency);
    } else if (grant.min_funding_amount != null) {
      fundingAmountDisplay = this._formatCurrency(grant.min_funding_amount, currency);
    }

    let companySizeLabel = '';
    if (grant.min_company_size_employees != null || grant.max_company_size_employees != null) {
      const minE = grant.min_company_size_employees != null ? grant.min_company_size_employees : 1;
      const maxE = grant.max_company_size_employees != null ? grant.max_company_size_employees : null;
      companySizeLabel = maxE ? `${minE}–${maxE} employees` : `${minE}+ employees`;
    }

    const industry_tags = [];
    industry_tags.push(this._formatIndustryLabel(grant.primary_industry));
    if (Array.isArray(grant.other_industries)) {
      grant.other_industries.forEach(code => {
        const label = this._formatIndustryLabel(code);
        if (label && !industry_tags.includes(label)) {
          industry_tags.push(label);
        }
      });
    }

    return {
      grant,
      primary_industry_label: this._formatIndustryLabel(grant.primary_industry),
      industry_tags,
      company_size_range_label: companySizeLabel,
      funding_amount_display: fundingAmountDisplay,
      application_deadline_display: this._formatDateRangeOrSingle(grant.application_deadline, null),
      open_date_display: grant.open_date ? this._formatDateRangeOrSingle(grant.open_date, null) : '',
      is_open_for_applications: !!grant.is_open_for_applications,
      is_saved_to_dashboard: dashboard.saved_grant_ids.includes(grant.id),
      apply_instructions_html: ''
    };
  }

  // saveGrantToDashboard(grantId)
  saveGrantToDashboard(grantId) {
    const grants = this._getFromStorage('grant_programs');
    const grant = grants.find(g => g.id === grantId);
    if (!grant) {
      return { success: false, message: 'Grant not found', saved_grant_ids: [], saved_grants_count: 0 };
    }
    const dashboard = this._getOrCreateDashboard();
    if (!dashboard.saved_grant_ids.includes(grantId)) {
      dashboard.saved_grant_ids.push(grantId);
      dashboard.updated_at = new Date().toISOString();
      this._saveDashboard(dashboard);
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_savedGrantId', grantId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      message: 'Grant saved to dashboard',
      saved_grant_ids: dashboard.saved_grant_ids.slice(),
      saved_grants_count: dashboard.saved_grant_ids.length
    };
  }

  // getIncentiveFilterOptions
  getIncentiveFilterOptions() {
    const incentive_type_values = [
      'tax_credit',
      'grant',
      'loan',
      'rebate',
      'training_grant',
      'other'
    ];
    const incentive_type_options = incentive_type_values.map(v => ({
      value: v,
      label: this._formatIncentiveTypeLabel(v)
    }));

    const industry_values = [
      'manufacturing',
      'technology',
      'services',
      'logistics',
      'healthcare',
      'agriculture',
      'construction',
      'other'
    ];
    const industry_options = industry_values.map(v => ({
      value: v,
      label: this._formatIndustryLabel(v)
    }));

    const status_values = ['active', 'inactive', 'expired'];
    const status_options = status_values.map(v => ({
      value: v,
      label: this._formatStatusLabel(v)
    }));

    return {
      incentive_type_options,
      industry_options,
      status_options
    };
  }

  // searchIncentivePrograms(filters, sort_by, page, page_size)
  searchIncentivePrograms(filters, sort_by, page, page_size) {
    const incentives = this._getFromStorage('incentive_programs');
    const dashboard = this._getOrCreateDashboard();

    let results = incentives.filter(i => {
      if (filters && filters.incentive_type) {
        if (i.incentive_type !== filters.incentive_type) return false;
      }
      if (filters && filters.primary_industry) {
        const matchPrimary = i.primary_industry === filters.primary_industry;
        const matchOther = Array.isArray(i.other_industries)
          ? i.other_industries.includes(filters.primary_industry)
          : false;
        if (!matchPrimary && !matchOther) return false;
      }
      if (filters && filters.status) {
        if (i.status !== filters.status) return false;
      }
      return true;
    });

    const sort = sort_by || 'name_asc';
    if (sort === 'maximum_annual_benefit_desc') {
      results.sort((a, b) => {
        const av = typeof a.maximum_annual_benefit === 'number' ? a.maximum_annual_benefit : 0;
        const bv = typeof b.maximum_annual_benefit === 'number' ? b.maximum_annual_benefit : 0;
        return bv - av;
      });
    } else if (sort === 'name_asc') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'status') {
      const order = { active: 0, inactive: 1, expired: 2 };
      results.sort((a, b) => (order[a.status] || 99) - (order[b.status] || 99));
    }

    const total_count = results.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIdx = (pg - 1) * size;
    const endIdx = startIdx + size;

    const pageResults = results.slice(startIdx, endIdx).map(i => {
      let maximum_annual_benefit_display = '';
      if (typeof i.maximum_annual_benefit === 'number') {
        if (i.benefit_unit === 'usd') {
          maximum_annual_benefit_display = this._formatCurrency(i.maximum_annual_benefit, 'usd');
        } else if (i.benefit_unit === 'percent_tax_liability') {
          maximum_annual_benefit_display = i.maximum_annual_benefit + '% of tax liability';
        } else {
          maximum_annual_benefit_display = String(i.maximum_annual_benefit);
        }
      }
      return {
        incentive: i,
        incentive_type_label: this._formatIncentiveTypeLabel(i.incentive_type),
        primary_industry_label: this._formatIndustryLabel(i.primary_industry),
        maximum_annual_benefit_display,
        status_label: this._formatStatusLabel(i.status),
        is_preferred: dashboard.preferred_incentive_id === i.id
      };
    });

    return {
      results: pageResults,
      total_count,
      page: pg,
      page_size: size
    };
  }

  // getIncentiveDetails(incentiveId)
  getIncentiveDetails(incentiveId) {
    const incentives = this._getFromStorage('incentive_programs');
    const incentive = incentives.find(i => i.id === incentiveId) || null;
    const dashboard = this._getOrCreateDashboard();

    if (!incentive) {
      return {
        incentive: null,
        incentive_type_label: '',
        primary_industry_label: '',
        maximum_annual_benefit_display: '',
        status_label: '',
        is_preferred: false,
        eligibility_highlight: ''
      };
    }

    let maximum_annual_benefit_display = '';
    if (typeof incentive.maximum_annual_benefit === 'number') {
      if (incentive.benefit_unit === 'usd') {
        maximum_annual_benefit_display = this._formatCurrency(incentive.maximum_annual_benefit, 'usd');
      } else if (incentive.benefit_unit === 'percent_tax_liability') {
        maximum_annual_benefit_display = incentive.maximum_annual_benefit + '% of tax liability';
      } else {
        maximum_annual_benefit_display = String(incentive.maximum_annual_benefit);
      }
    }

    // Instrumentation for task completion tracking
    try {
      if (incentive && incentive.incentive_type === 'tax_credit') {
        let existingIds = [];
        const raw = localStorage.getItem('task2_viewedIncentiveIds');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              existingIds = parsed;
            }
          } catch (e2) {
            existingIds = [];
          }
        }
        if (!existingIds.includes(incentive.id)) {
          existingIds.push(incentive.id);
        }
        localStorage.setItem('task2_viewedIncentiveIds', JSON.stringify(existingIds));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      incentive,
      incentive_type_label: this._formatIncentiveTypeLabel(incentive.incentive_type),
      primary_industry_label: this._formatIndustryLabel(incentive.primary_industry),
      maximum_annual_benefit_display,
      status_label: this._formatStatusLabel(incentive.status),
      is_preferred: dashboard.preferred_incentive_id === incentive.id,
      eligibility_highlight: incentive.eligibility_summary || ''
    };
  }

  // setPreferredIncentive(incentiveId)
  setPreferredIncentive(incentiveId) {
    const incentives = this._getFromStorage('incentive_programs');
    const incentive = incentives.find(i => i.id === incentiveId);
    if (!incentive) {
      return { success: false, message: 'Incentive not found', preferred_incentive_id: null };
    }
    if (incentive.status !== 'active') {
      return { success: false, message: 'Only active incentives can be preferred', preferred_incentive_id: null };
    }
    const dashboard = this._getOrCreateDashboard();
    dashboard.preferred_incentive_id = incentiveId;
    dashboard.updated_at = new Date().toISOString();
    this._saveDashboard(dashboard);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_preferredIncentiveId', incentiveId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { success: true, message: 'Preferred incentive updated', preferred_incentive_id: incentiveId };
  }

  // clearPreferredIncentive()
  clearPreferredIncentive() {
    const dashboard = this._getOrCreateDashboard();
    dashboard.preferred_incentive_id = null;
    dashboard.updated_at = new Date().toISOString();
    this._saveDashboard(dashboard);
    return { success: true, message: 'Preferred incentive cleared' };
  }

  // getPropertyFilterOptions
  getPropertyFilterOptions() {
    const property_type_values = [
      'industrial',
      'office',
      'retail',
      'land',
      'flex',
      'warehouse',
      'other'
    ];
    const property_type_options = property_type_values.map(v => ({
      value: v,
      label: this._formatPropertyTypeLabel(v)
    }));

    const square_footage_presets = [
      { min_sqft: 0, max_sqft: 9999, label: 'Under 10,000 sq ft' },
      { min_sqft: 10000, max_sqft: 24999, label: '10,000–24,999 sq ft' },
      { min_sqft: 25000, max_sqft: 49999, label: '25,000–49,999 sq ft' },
      { min_sqft: 50000, max_sqft: null, label: '50,000+ sq ft' }
    ];

    const radius_options_miles = [
      { radius_miles: 5, label: 'Within 5 miles' },
      { radius_miles: 10, label: 'Within 10 miles' },
      { radius_miles: 25, label: 'Within 25 miles' },
      { radius_miles: 50, label: 'Within 50 miles' }
    ];

    const transportation_filters = [
      { key: 'highway_access', label: 'Highway Access' }
    ];

    return {
      property_type_options,
      square_footage_presets,
      radius_options_miles,
      transportation_filters
    };
  }

  // searchProperties(filters, sort_by, page, page_size)
  searchProperties(filters, sort_by, page, page_size) {
    const normalizedFilters = this._validatePropertySearchFilters(filters || {});
    const properties = this._getFromStorage('properties');
    const dashboard = this._getOrCreateDashboard();

    let results = properties.filter(p => {
      if (normalizedFilters.property_type) {
        if (p.property_type !== normalizedFilters.property_type) return false;
      }
      if (normalizedFilters.min_sqft != null) {
        if (typeof p.building_size_sqft === 'number' && p.building_size_sqft < normalizedFilters.min_sqft) {
          return false;
        }
      }
      if (normalizedFilters.max_sqft != null) {
        if (typeof p.building_size_sqft === 'number' && p.building_size_sqft > normalizedFilters.max_sqft) {
          return false;
        }
      }
      if (normalizedFilters.max_distance_from_regional_center_miles != null) {
        if (typeof p.distance_from_regional_center_miles === 'number') {
          if (p.distance_from_regional_center_miles > normalizedFilters.max_distance_from_regional_center_miles) {
            return false;
          }
        } else {
          // no distance info -> exclude when radius specified
          return false;
        }
      }
      if (normalizedFilters.require_highway_access === true && !p.has_highway_access) {
        return false;
      }
      return true;
    });

    const sort = sort_by || 'distance_asc';
    if (sort === 'distance_asc') {
      results.sort((a, b) => {
        const da = typeof a.distance_from_regional_center_miles === 'number'
          ? a.distance_from_regional_center_miles
          : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_from_regional_center_miles === 'number'
          ? b.distance_from_regional_center_miles
          : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else if (sort === 'building_size_asc') {
      results.sort((a, b) => (a.building_size_sqft || 0) - (b.building_size_sqft || 0));
    } else if (sort === 'building_size_desc') {
      results.sort((a, b) => (b.building_size_sqft || 0) - (a.building_size_sqft || 0));
    }

    const total_count = results.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIdx = (pg - 1) * size;
    const endIdx = startIdx + size;

    const pageResults = results.slice(startIdx, endIdx).map(p => {
      const sizeDisplay = typeof p.building_size_sqft === 'number'
        ? p.building_size_sqft.toLocaleString('en-US') + ' sq ft'
        : '';
      const distDisplay = typeof p.distance_from_regional_center_miles === 'number'
        ? p.distance_from_regional_center_miles.toFixed(1) + ' mi'
        : '';
      return {
        property: p,
        property_type_label: this._formatPropertyTypeLabel(p.property_type),
        building_size_display: sizeDisplay,
        distance_from_center_display: distDisplay,
        has_highway_access: !!p.has_highway_access,
        is_saved_to_shortlist: dashboard.saved_property_ids.includes(p.id)
      };
    });

    return {
      results: pageResults,
      total_count,
      page: pg,
      page_size: size
    };
  }

  // getPropertyDetails(propertyId)
  getPropertyDetails(propertyId) {
    const properties = this._getFromStorage('properties');
    const property = properties.find(p => p.id === propertyId) || null;
    const dashboard = this._getOrCreateDashboard();

    if (!property) {
      return {
        property: null,
        property_type_label: '',
        building_size_display: '',
        distance_from_center_display: '',
        highway_distance_display: '',
        access_features_display: [],
        utilities_display: [],
        map_center: { latitude: null, longitude: null },
        is_saved_to_shortlist: false
      };
    }

    const sizeDisplay = typeof property.building_size_sqft === 'number'
      ? property.building_size_sqft.toLocaleString('en-US') + ' sq ft'
      : '';
    const distDisplay = typeof property.distance_from_regional_center_miles === 'number'
      ? property.distance_from_regional_center_miles.toFixed(1) + ' mi from regional center'
      : '';
    const highwayDist = typeof property.highway_distance_miles === 'number'
      ? property.highway_distance_miles.toFixed(1) + ' mi to nearest highway'
      : '';

    let latitude = property.latitude;
    let longitude = property.longitude;
    if ((latitude == null || longitude == null)) {
      const region = this._getCurrentRegion();
      if (region) {
        latitude = region.center_latitude || null;
        longitude = region.center_longitude || null;
      } else {
        latitude = null;
        longitude = null;
      }
    }

    return {
      property,
      property_type_label: this._formatPropertyTypeLabel(property.property_type),
      building_size_display: sizeDisplay,
      distance_from_center_display: distDisplay,
      highway_distance_display: highwayDist,
      access_features_display: Array.isArray(property.access_features) ? property.access_features.slice() : [],
      utilities_display: Array.isArray(property.utilities) ? property.utilities.slice() : [],
      map_center: { latitude, longitude },
      is_saved_to_shortlist: dashboard.saved_property_ids.includes(property.id)
    };
  }

  // savePropertyToShortlist(propertyId)
  savePropertyToShortlist(propertyId) {
    const properties = this._getFromStorage('properties');
    const property = properties.find(p => p.id === propertyId);
    if (!property) {
      return { success: false, message: 'Property not found', saved_property_ids: [], saved_properties_count: 0 };
    }
    const dashboard = this._getOrCreateDashboard();
    if (!dashboard.saved_property_ids.includes(propertyId)) {
      dashboard.saved_property_ids.push(propertyId);
      dashboard.updated_at = new Date().toISOString();
      this._saveDashboard(dashboard);
    }
    return {
      success: true,
      message: 'Property saved to shortlist',
      saved_property_ids: dashboard.saved_property_ids.slice(),
      saved_properties_count: dashboard.saved_property_ids.length
    };
  }

  // sendPropertyInquiry(propertyId, contact_name, contact_email, contact_phone, message)
  sendPropertyInquiry(propertyId, contact_name, contact_email, contact_phone, message) {
    // Simulation only – metadata could be stored if desired
    const properties = this._getFromStorage('properties');
    const property = properties.find(p => p.id === propertyId);
    if (!property) {
      return { success: false, message: 'Property not found', property_id: null };
    }
    // We do not persist inquiries as no data model is defined; only simulate success
    return {
      success: true,
      message: 'Inquiry submitted',
      property_id: propertyId
    };
  }

  // getStandardRegionalDataSummaries
  getStandardRegionalDataSummaries() {
    const region = this._getCurrentRegion();
    const raw = localStorage.getItem('standard_regional_data_summaries');
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }
    return {
      region,
      population_summary: data.population_summary || '',
      workforce_summary: data.workforce_summary || '',
      key_sector_summaries: Array.isArray(data.key_sector_summaries) ? data.key_sector_summaries : [],
      last_updated_display: data.last_updated_display || ''
    };
  }

  // getReportBuilderOptions
  getReportBuilderOptions() {
    const industry_values = [
      'manufacturing',
      'technology',
      'services',
      'logistics',
      'healthcare',
      'agriculture',
      'construction',
      'other'
    ];
    const industry_options = industry_values.map(v => ({
      value: v,
      label: this._formatIndustryLabel(v)
    }));

    const metrics = this._getFromStorage('metric_definitions');
    const reports = this._getFromStorage('reports');
    let yearsSet = new Set();
    reports.forEach(r => {
      if (typeof r.year === 'number') yearsSet.add(r.year);
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear() - 1);
    }
    const available_years = Array.from(yearsSet).sort((a, b) => a - b);
    const default_year = available_years[available_years.length - 1];

    const time_aggregation_options = [
      { value: 'calendar_year', label: 'Calendar Year' },
      { value: 'fiscal_year', label: 'Fiscal Year' },
      { value: 'quarter', label: 'Quarter' },
      { value: 'month', label: 'Month' }
    ];

    return {
      industry_options,
      metrics,
      available_years,
      default_year,
      time_aggregation_options
    };
  }

  // getReportPreview(industry, primary_metric_code, secondary_metric_code, additional_metric_codes, year, time_aggregation)
  getReportPreview(industry, primary_metric_code, secondary_metric_code, additional_metric_codes, year, time_aggregation) {
    const metrics = this._getFromStorage('metric_definitions');
    const codes = [];
    if (primary_metric_code) codes.push(primary_metric_code);
    if (secondary_metric_code && !codes.includes(secondary_metric_code)) codes.push(secondary_metric_code);
    if (Array.isArray(additional_metric_codes)) {
      additional_metric_codes.forEach(c => {
        if (c && !codes.includes(c)) codes.push(c);
      });
    }

    const preview_rows = codes.map(code => {
      const def = metrics.find(m => m.code === code);
      const name = def ? def.name : code;
      const unitLabel = def ? this._formatMetricUnitLabel(def.unit) : '';
      return {
        metric_code: code,
        metric_name: name,
        value: null,
        unit_label: unitLabel
      };
    });

    return {
      configuration: {
        industry,
        primary_metric_code,
        secondary_metric_code: secondary_metric_code || null,
        additional_metric_codes: Array.isArray(additional_metric_codes) ? additional_metric_codes : [],
        year,
        time_aggregation: time_aggregation || 'calendar_year'
      },
      preview_rows,
      generated_at: new Date().toISOString()
    };
  }

  // createAndSaveReport(title, industry, primary_metric_code, secondary_metric_code, additional_metric_codes, year, time_aggregation)
  createAndSaveReport(title, industry, primary_metric_code, secondary_metric_code, additional_metric_codes, year, time_aggregation) {
    const report = this._createReportEntityFromConfig({
      title,
      industry,
      primary_metric_code,
      secondary_metric_code,
      additional_metric_codes,
      year,
      time_aggregation
    });
    const reports = this._getFromStorage('reports');
    reports.push(report);
    this._saveToStorage('reports', reports);

    const dashboard = this._getOrCreateDashboard();
    if (!dashboard.saved_report_ids.includes(report.id)) {
      dashboard.saved_report_ids.push(report.id);
      dashboard.updated_at = new Date().toISOString();
      this._saveDashboard(dashboard);
    }

    return {
      success: true,
      message: 'Report created and saved to dashboard',
      report,
      dashboard_report_ids: dashboard.saved_report_ids.slice()
    };
  }

  // getDashboardOverview
  getDashboardOverview() {
    const dashboard = this._getOrCreateDashboard();
    const grants = this._getFromStorage('grant_programs');
    const incentives = this._getFromStorage('incentive_programs');
    const properties = this._getFromStorage('properties');
    const reports = this._getFromStorage('reports');
    const organizations = this._getFromStorage('organizations');
    const checklists = this._getFromStorage('checklists');

    const saved_grants = grants.filter(g => dashboard.saved_grant_ids.includes(g.id));
    const preferred_incentive = dashboard.preferred_incentive_id
      ? incentives.find(i => i.id === dashboard.preferred_incentive_id) || null
      : null;
    const saved_properties = properties.filter(p => dashboard.saved_property_ids.includes(p.id));
    const saved_reports = reports.filter(r => dashboard.saved_report_ids.includes(r.id));
    const favorite_organizations = organizations.filter(o => dashboard.favorite_organization_ids.includes(o.id));
    const saved_checklists = checklists.filter(c => dashboard.saved_checklist_ids.includes(c.id));

    return {
      dashboard,
      saved_grants,
      preferred_incentive,
      saved_properties,
      saved_reports,
      favorite_organizations,
      saved_checklists
    };
  }

  // removeSavedGrant(grantId)
  removeSavedGrant(grantId) {
    const dashboard = this._getOrCreateDashboard();
    const before = dashboard.saved_grant_ids.length;
    dashboard.saved_grant_ids = dashboard.saved_grant_ids.filter(id => id !== grantId);
    dashboard.updated_at = new Date().toISOString();
    this._saveDashboard(dashboard);
    const after = dashboard.saved_grant_ids.length;
    return {
      success: after < before,
      message: after < before ? 'Grant removed from saved list' : 'Grant not found in saved list',
      remaining_saved_grant_ids: dashboard.saved_grant_ids.slice()
    };
  }

  // removeSavedProperty(propertyId)
  removeSavedProperty(propertyId) {
    const dashboard = this._getOrCreateDashboard();
    const before = dashboard.saved_property_ids.length;
    dashboard.saved_property_ids = dashboard.saved_property_ids.filter(id => id !== propertyId);
    dashboard.updated_at = new Date().toISOString();
    this._saveDashboard(dashboard);
    const after = dashboard.saved_property_ids.length;
    return {
      success: after < before,
      message: after < before ? 'Property removed from shortlist' : 'Property not found in shortlist',
      remaining_saved_property_ids: dashboard.saved_property_ids.slice()
    };
  }

  // removeFavoriteOrganization(organizationId)
  removeFavoriteOrganization(organizationId) {
    const dashboard = this._getOrCreateDashboard();
    const before = dashboard.favorite_organization_ids.length;
    dashboard.favorite_organization_ids = dashboard.favorite_organization_ids.filter(id => id !== organizationId);
    dashboard.updated_at = new Date().toISOString();
    this._saveDashboard(dashboard);
    const after = dashboard.favorite_organization_ids.length;
    return {
      success: after < before,
      message: after < before ? 'Organization removed from favorites' : 'Organization not found in favorites',
      remaining_favorite_organization_ids: dashboard.favorite_organization_ids.slice()
    };
  }

  // removeSavedReport(reportId)
  removeSavedReport(reportId) {
    const dashboard = this._getOrCreateDashboard();
    const before = dashboard.saved_report_ids.length;
    dashboard.saved_report_ids = dashboard.saved_report_ids.filter(id => id !== reportId);
    dashboard.updated_at = new Date().toISOString();
    this._saveDashboard(dashboard);
    const after = dashboard.saved_report_ids.length;
    return {
      success: after < before,
      message: after < before ? 'Report removed from saved reports' : 'Report not found in saved reports',
      remaining_saved_report_ids: dashboard.saved_report_ids.slice()
    };
  }

  // removeChecklist(checklistId)
  removeChecklist(checklistId) {
    const dashboard = this._getOrCreateDashboard();
    const before = dashboard.saved_checklist_ids.length;
    dashboard.saved_checklist_ids = dashboard.saved_checklist_ids.filter(id => id !== checklistId);
    dashboard.updated_at = new Date().toISOString();
    this._saveDashboard(dashboard);
    const after = dashboard.saved_checklist_ids.length;

    // also remove Checklist entity itself
    let checklists = this._getFromStorage('checklists');
    const beforeC = checklists.length;
    checklists = checklists.filter(c => c.id !== checklistId);
    this._saveToStorage('checklists', checklists);

    return {
      success: after < before || checklists.length < beforeC,
      message: 'Checklist removed',
      remaining_checklist_ids: dashboard.saved_checklist_ids.slice()
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const topic_values = [
      'exporting',
      'international_trade',
      'marketing',
      'finance',
      'workforce',
      'technology',
      'manufacturing',
      'general_business',
      'other'
    ];
    const topic_options = topic_values.map(v => ({
      value: v,
      label: this._formatTopicLabel(v)
    }));

    const level_values = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    const level_options = level_values.map(v => ({
      value: v,
      label: this._formatEventLevelLabel(v)
    }));

    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const start_date = today.toISOString().split('T')[0];
    const end_date = in30.toISOString().split('T')[0];

    return {
      topic_options,
      level_options,
      default_date_range: { start_date, end_date }
    };
  }

  // searchEvents(filters, view)
  searchEvents(filters, view) {
    const events = this._getFromStorage('events');

    const f = filters || {};
    let startDate = null;
    let endDate = null;
    if (f.start_date) {
      startDate = new Date(f.start_date);
      if (isNaN(startDate.getTime())) startDate = null;
    }
    if (f.end_date) {
      endDate = new Date(f.end_date);
      if (isNaN(endDate.getTime())) endDate = null;
      if (endDate) {
        // include entire end day
        endDate.setHours(23, 59, 59, 999);
      }
    }

    let results = events.filter(e => {
      if (f.topic && e.topic !== f.topic) return false;
      if (f.level && e.level !== f.level) return false;

      const start = new Date(e.start_datetime || 0);
      if (startDate && start < startDate) return false;
      if (endDate && start > endDate) return false;

      if (f.only_open_for_registration === true && !e.is_registration_open) return false;

      return true;
    });

    // sort chronologically
    results.sort((a, b) => new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0));

    const mapped = results.map(e => {
      let location_display = '';
      if (e.location_type === 'online') {
        location_display = 'Online';
      } else if (e.location_type === 'hybrid') {
        location_display = (e.venue_name || 'Hybrid') + (e.city ? ', ' + e.city : '');
      } else if (e.location_type === 'in_person') {
        location_display = (e.venue_name || '') + (e.city ? ', ' + e.city : '');
      }
      return {
        event: e,
        topic_label: this._formatTopicLabel(e.topic),
        level_label: this._formatEventLevelLabel(e.level),
        date_display: this._formatDateRangeOrSingle(e.start_datetime, e.end_datetime),
        location_display,
        is_registration_open: !!e.is_registration_open
      };
    });

    return {
      results: mapped,
      total_count: mapped.length
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        topic_label: '',
        level_label: '',
        date_display: '',
        location_display: '',
        registration_deadline_display: '',
        is_registration_open: false,
        remaining_seats: null
      };
    }
    let location_display = '';
    if (event.location_type === 'online') {
      location_display = 'Online';
    } else if (event.location_type === 'hybrid') {
      location_display = (event.venue_name || 'Hybrid') + (event.city ? ', ' + event.city : '');
    } else if (event.location_type === 'in_person') {
      location_display = (event.venue_name || '') + (event.city ? ', ' + event.city : '');
    }

    const registration_deadline_display = event.registration_deadline
      ? this._formatDateRangeOrSingle(event.registration_deadline, null)
      : '';

    return {
      event,
      topic_label: this._formatTopicLabel(event.topic),
      level_label: this._formatEventLevelLabel(event.level),
      date_display: this._formatDateRangeOrSingle(event.start_datetime, event.end_datetime),
      location_display,
      registration_deadline_display,
      is_registration_open: !!event.is_registration_open,
      remaining_seats: typeof event.remaining_seats === 'number' ? event.remaining_seats : null
    };
  }

  // registerForEvent(eventId, first_name, last_name, email, business_size)
  registerForEvent(eventId, first_name, last_name, email, business_size) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', registration: null, remaining_seats: null };
    }

    // basic checks on registration status
    if (!event.is_registration_open) {
      return { success: false, message: 'Registration is closed', registration: null, remaining_seats: event.remaining_seats || null };
    }
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        return { success: false, message: 'Registration deadline has passed', registration: null, remaining_seats: event.remaining_seats || null };
      }
    }
    if (typeof event.remaining_seats === 'number' && event.remaining_seats <= 0) {
      return { success: false, message: 'Event is full', registration: null, remaining_seats: 0 };
    }

    const registration = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      first_name,
      last_name,
      email,
      business_size: business_size || 'not_disclosed',
      registered_at: new Date().toISOString()
    };

    const registrations = this._getFromStorage('event_registrations');
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const remaining_seats = this._updateEventRemainingSeats(eventId);

    return {
      success: true,
      message: 'Registered for event',
      registration,
      remaining_seats
    };
  }

  // getOrganizationFilterOptions
  getOrganizationFilterOptions() {
    const audience_values = [
      'women_owned_businesses',
      'women_entrepreneurs',
      'minority_owned_businesses',
      'startups',
      'exporters',
      'manufacturers',
      'technology_firms',
      'rural_businesses',
      'general_business',
      'other'
    ];
    const audience_options = audience_values.map(v => ({
      value: v,
      label: this._formatAudienceLabel(v)
    }));

    const orgs = this._getFromStorage('organizations');
    const women_focus_filter_available = orgs.some(o => o.is_women_focused === true);

    return {
      audience_options,
      women_focus_filter_available
    };
  }

  // searchOrganizations(filters)
  searchOrganizations(filters) {
    const orgs = this._getFromStorage('organizations');
    const dashboard = this._getOrCreateDashboard();
    const f = filters || {};
    const query = f.query ? String(f.query).toLowerCase() : null;

    let results = orgs.filter(o => {
      if (f.audience_category) {
        const matchPrimary = o.primary_audience === f.audience_category;
        const matchOther = Array.isArray(o.other_audiences)
          ? o.other_audiences.includes(f.audience_category)
          : false;
        if (!matchPrimary && !matchOther) return false;
      }
      if (typeof f.is_women_focused === 'boolean') {
        if (!!o.is_women_focused !== f.is_women_focused) return false;
      }
      if (query) {
        const text = ((o.name || '') + ' ' + (o.short_description || '') + ' ' + (o.full_description || '')).toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    const mapped = results.map(o => ({
      organization: o,
      primary_audience_label: this._formatAudienceLabel(o.primary_audience),
      is_women_focused: !!o.is_women_focused,
      is_favorite: dashboard.favorite_organization_ids.includes(o.id)
    }));

    return {
      results: mapped,
      total_count: mapped.length
    };
  }

  // getOrganizationDetails(organizationId)
  getOrganizationDetails(organizationId) {
    const orgs = this._getFromStorage('organizations');
    const org = orgs.find(o => o.id === organizationId) || null;
    const dashboard = this._getOrCreateDashboard();

    if (!org) {
      return {
        organization: null,
        primary_audience_label: '',
        audience_tags: [],
        services_display: [],
        is_favorite: false
      };
    }

    const audience_tags = [];
    if (org.primary_audience) {
      audience_tags.push(this._formatAudienceLabel(org.primary_audience));
    }
    if (Array.isArray(org.other_audiences)) {
      org.other_audiences.forEach(code => {
        const label = this._formatAudienceLabel(code);
        if (label && !audience_tags.includes(label)) audience_tags.push(label);
      });
    }

    const services_display = Array.isArray(org.services_offered) ? org.services_offered.slice() : [];

    return {
      organization: org,
      primary_audience_label: this._formatAudienceLabel(org.primary_audience),
      audience_tags,
      services_display,
      is_favorite: dashboard.favorite_organization_ids.includes(org.id)
    };
  }

  // addOrganizationToFavorites(organizationId)
  addOrganizationToFavorites(organizationId) {
    const orgs = this._getFromStorage('organizations');
    const org = orgs.find(o => o.id === organizationId);
    if (!org) {
      return { success: false, message: 'Organization not found', favorite_organization_ids: [] };
    }
    const dashboard = this._getOrCreateDashboard();
    if (!dashboard.favorite_organization_ids.includes(organizationId)) {
      dashboard.favorite_organization_ids.push(organizationId);
      dashboard.updated_at = new Date().toISOString();
      this._saveDashboard(dashboard);
    }
    return {
      success: true,
      message: 'Organization added to favorites',
      favorite_organization_ids: dashboard.favorite_organization_ids.slice()
    };
  }

  // getNewsletterSubscriptionOptions
  getNewsletterSubscriptionOptions() {
    const topic_values = [
      'manufacturing',
      'technology',
      'events',
      'funding',
      'sites_buildings',
      'general_updates'
    ];
    const topic_options = topic_values.map(v => ({
      value: v,
      label: this._formatIndustryLabel(v) || v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const frequency_values = ['daily', 'weekly', 'monthly', 'quarterly'];
    const frequency_options = frequency_values.map(v => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1)
    }));

    const geographic_values = ['entire_region', 'primary_county', 'specific_city', 'multi_county'];
    const geographic_focus_options = geographic_values.map(v => ({
      value: v,
      label: v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    return {
      topic_options,
      frequency_options,
      geographic_focus_options,
      default_frequency: 'monthly'
    };
  }

  // subscribeToNewsletter(email, primary_topic, secondary_topic, additional_topics, frequency, geographic_focus, consent_accepted)
  subscribeToNewsletter(email, primary_topic, secondary_topic, additional_topics, frequency, geographic_focus, consent_accepted) {
    const emailStr = String(email || '').trim();
    if (!emailStr) {
      return { success: false, message: 'Email is required', subscription: null };
    }
    const emailPattern = /.+@.+\..+/;
    if (!emailPattern.test(emailStr)) {
      return { success: false, message: 'Invalid email format', subscription: null };
    }
    if (!consent_accepted) {
      return { success: false, message: 'Consent must be accepted', subscription: null };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    let subscription = subs.find(s => s.email === emailStr) || null;
    const now = new Date().toISOString();

    if (!subscription) {
      subscription = {
        id: this._generateId('newsletter_sub'),
        email: emailStr,
        primary_topic: primary_topic || null,
        secondary_topic: secondary_topic || null,
        additional_topics: Array.isArray(additional_topics) ? additional_topics : [],
        frequency,
        geographic_focus: geographic_focus || null,
        consent_accepted: !!consent_accepted,
        created_at: now,
        is_active: true
      };
      subs.push(subscription);
    } else {
      subscription.primary_topic = primary_topic || subscription.primary_topic || null;
      subscription.secondary_topic = secondary_topic || subscription.secondary_topic || null;
      subscription.additional_topics = Array.isArray(additional_topics)
        ? additional_topics
        : subscription.additional_topics || [];
      subscription.frequency = frequency || subscription.frequency;
      subscription.geographic_focus = geographic_focus || subscription.geographic_focus || null;
      subscription.consent_accepted = !!consent_accepted;
      subscription.is_active = true;
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscription saved',
      subscription
    };
  }

  // getContactPageInfo
  getContactPageInfo() {
    const region = this._getCurrentRegion();
    const raw = localStorage.getItem('contact_page_info');
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }
    const general_contact = data.general_contact || {
      phone: '',
      email: '',
      address_lines: []
    };
    return {
      region,
      general_contact,
      general_inquiry_description: data.general_inquiry_description || '',
      business_consultation_description: data.business_consultation_description || ''
    };
  }

  // submitConsultationRequest(company_name, industry, planned_hiring_range, expansion_timeline, contact_name, contact_email, contact_phone, additional_details)
  submitConsultationRequest(company_name, industry, planned_hiring_range, expansion_timeline, contact_name, contact_email, contact_phone, additional_details) {
    if (!company_name || !industry || !planned_hiring_range || !expansion_timeline || !contact_name || !contact_email) {
      return { success: false, message: 'Missing required fields', request: null };
    }
    const request = {
      id: this._generateId('consultation_request'),
      company_name,
      industry,
      planned_hiring_range,
      expansion_timeline,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      additional_details: additional_details || null,
      submitted_at: new Date().toISOString()
    };
    const requests = this._getFromStorage('consultation_requests');
    requests.push(request);
    this._saveToStorage('consultation_requests', requests);
    return {
      success: true,
      message: 'Consultation request submitted',
      request
    };
  }

  // submitGeneralInquiry(name, email, subject, message)
  submitGeneralInquiry(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return { success: false, message: 'Missing required fields' };
    }
    const inquiries = this._getFromStorage('general_inquiries');
    const inquiry = {
      id: this._generateId('general_inquiry'),
      name,
      email,
      subject,
      message,
      submitted_at: new Date().toISOString()
    };
    inquiries.push(inquiry);
    this._saveToStorage('general_inquiries', inquiries);
    return {
      success: true,
      message: 'Inquiry submitted'
    };
  }

  // getExpansionChecklistOptions
  getExpansionChecklistOptions() {
    const categories_values = [
      'workforce',
      'financing',
      'marketing_sales',
      'operations',
      'facilities',
      'exporting',
      'legal_compliance',
      'strategy',
      'other'
    ];
    const categories = categories_values.map(v => ({
      value: v,
      label: v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const items = this._getFromStorage('checklist_item_templates');

    return {
      categories,
      items
    };
  }

  // createExpansionChecklist(title, itemIds)
  createExpansionChecklist(title, itemIds) {
    const validation = this._validateChecklistSelectionRules(itemIds);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
        checklist: null,
        dashboard_checklist_ids: []
      };
    }

    const now = new Date().toISOString();
    const checklist = {
      id: this._generateId('checklist'),
      title: title || null,
      item_ids: itemIds.slice(),
      created_at: now,
      updated_at: now
    };

    const checklists = this._getFromStorage('checklists');
    checklists.push(checklist);
    this._saveToStorage('checklists', checklists);

    const dashboard = this._getOrCreateDashboard();
    if (!dashboard.saved_checklist_ids.includes(checklist.id)) {
      dashboard.saved_checklist_ids.push(checklist.id);
      dashboard.updated_at = now;
      this._saveDashboard(dashboard);
    }

    return {
      success: true,
      message: 'Checklist created and saved',
      checklist,
      dashboard_checklist_ids: dashboard.saved_checklist_ids.slice()
    };
  }

  // getChecklistDetails(checklistId)
  getChecklistDetails(checklistId) {
    const checklists = this._getFromStorage('checklists');
    const checklist = checklists.find(c => c.id === checklistId) || null;
    const templates = this._getFromStorage('checklist_item_templates');
    if (!checklist) {
      return {
        checklist: null,
        items: []
      };
    }
    const items = templates.filter(t => checklist.item_ids.includes(t.id));
    return {
      checklist,
      items
    };
  }

  // getAboutAgencyContent
  getAboutAgencyContent() {
    const raw = localStorage.getItem('about_agency_content');
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }
    return {
      mission_html: data.mission_html || '',
      services_overview_html: data.services_overview_html || '',
      program_area_links: Array.isArray(data.program_area_links) ? data.program_area_links : [],
      governance_html: data.governance_html || '',
      partners_html: data.partners_html || '',
      media_contact: data.media_contact || { name: '', email: '', phone: '' },
      reports_links: Array.isArray(data.reports_links) ? data.reports_links : []
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }
    return {
      last_updated_display: data.last_updated_display || '',
      sections: Array.isArray(data.sections) ? data.sections : []
    };
  }

  // getTermsOfUseContent
  getTermsOfUseContent() {
    const raw = localStorage.getItem('terms_of_use_content');
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }
    return {
      last_updated_display: data.last_updated_display || '',
      sections: Array.isArray(data.sections) ? data.sections : []
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