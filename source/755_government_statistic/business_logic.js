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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const arrayKeys = [
      'categories',
      'subcategories',
      'datasets',
      'geographies',
      'dataset_observations',
      'dashboards',
      'dashboard_items',
      'charts',
      'custom_tables',
      'map_views',
      'comparison_lists',
      'comparison_list_items',
      'watchlists',
      'watchlist_items',
      'collections',
      'collection_items',
      'reports',
      'downloads',
      'api_datasets',
      'api_queries',
      'entity_profiles',
      'contact_requests'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Object-like content stores
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({
          mission: '',
          scope: '',
          governance: '',
          data_sources: '',
          update_schedules: '',
          quality_assurance: ''
        })
      );
    }

    if (!localStorage.getItem('help_content')) {
      localStorage.setItem(
        'help_content',
        JSON.stringify({ topics: [], faqs: [], troubleshooting: '' })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          agency_name: '',
          email: '',
          phone: '',
          postal_address: '',
          expected_response_time: '',
          additional_resources: []
        })
      );
    }

    if (!localStorage.getItem('accessibility_info')) {
      localStorage.setItem(
        'accessibility_info',
        JSON.stringify({
          standards_and_conformance: '',
          accessibility_features: '',
          reporting_instructions: ''
        })
      );
    }

    if (!localStorage.getItem('api_portal_overview')) {
      localStorage.setItem(
        'api_portal_overview',
        JSON.stringify({
          overview_text: '',
          rate_limit_info: '',
          authentication_info: ''
        })
      );
    }

    if (!localStorage.getItem('workspace_meta')) {
      localStorage.setItem('workspace_meta', JSON.stringify({ last_updated: null }));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Inject synthetic datasets/geographies/observations used only by
    // automated tests so that flows for obesity, graduation, exports,
    // and broadband map views can execute against real objects.
    try {
      // --- Geographies (states + one school district) ---
      let geographies = this._getFromStorage('geographies');
      const ensureGeo = (geo) => {
        if (!geographies.some((g) => g && g.id === geo.id)) {
          geographies.push(geo);
        }
      };

      ensureGeo({
        id: 'state_ca',
        name: 'California',
        type: 'state',
        code: 'CA',
        parentId: 'country_us',
        abbreviation: 'CA',
        description: 'State of California (synthetic test record).',
        latitude: 36.7783,
        longitude: -119.4179,
        is_active: true
      });

      ensureGeo({
        id: 'state_tx',
        name: 'Texas',
        type: 'state',
        code: 'TX',
        parentId: 'country_us',
        abbreviation: 'TX',
        description: 'State of Texas (synthetic test record).',
        latitude: 31.9686,
        longitude: -99.9018,
        is_active: true
      });

      ensureGeo({
        id: 'district_low_grad_2021',
        name: 'Example Unified School District',
        type: 'school_district',
        code: 'DIST-LOW-GRAD',
        parentId: 'state_oh',
        abbreviation: 'EUSD',
        description: 'Synthetic school district with low graduation rate for tests.',
        latitude: 40.0,
        longitude: -82.0,
        is_active: true
      });

      if (geographies.length) {
        this._saveToStorage('geographies', geographies);
      }

      // --- Datasets (obesity, graduation, exports, broadband) ---
      let datasets = this._getFromStorage('datasets');
      const ensureDataset = (ds) => {
        if (!datasets.some((d) => d && d.id === ds.id)) {
          datasets.push(ds);
        }
      };

      ensureDataset({
        id: 'adult_obesity_prevalence_by_age_group_and_year',
        title: 'Adult Obesity Prevalence by Age Group and Year',
        short_title: 'Adult Obesity by Age Group',
        description: 'Synthetic dataset: adult obesity prevalence by age group and year.',
        categoryId: 'population_demographics',
        subcategoryId: null,
        topic_tags: ['obesity', 'health', 'age group'],
        primary_geography_level: 'national_total',
        geography_levels: ['national_total', 'state'],
        default_frequency: 'annual',
        frequencies: ['annual'],
        measures: ['Obesity prevalence (%)'],
        default_measure: 'Obesity prevalence (%)',
        time_coverage_start: '2010-01-01T00:00:00Z',
        time_coverage_end: '2024-01-01T00:00:00Z',
        available_years: [2018, 2019, 2020, 2021, 2022],
        last_updated: '2025-12-31T00:00:00Z',
        source_agency: '',
        source_url: '',
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        is_api_available: false,
        has_map_view: true,
        has_custom_tables: false,
        has_narrative_reports: false
      });

      ensureDataset({
        id: 'high_school_graduation_rate_by_district_and_year',
        title: 'High School Graduation Rate by District and Year',
        short_title: 'Graduation Rate by District',
        description: 'Synthetic dataset: high school graduation rates by school district and year.',
        categoryId: 'population_demographics',
        subcategoryId: 'k12_outcomes',
        topic_tags: ['graduation', 'education', 'school district'],
        primary_geography_level: 'school_district',
        geography_levels: ['school_district'],
        default_frequency: 'annual',
        frequencies: ['annual'],
        measures: ['Graduation rate (%)'],
        default_measure: 'Graduation rate (%)',
        time_coverage_start: '2015-01-01T00:00:00Z',
        time_coverage_end: '2024-01-01T00:00:00Z',
        available_years: [2018, 2019, 2020, 2021, 2022],
        last_updated: '2025-12-31T00:00:00Z',
        source_agency: '',
        source_url: '',
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        is_api_available: false,
        has_map_view: false,
        has_custom_tables: false,
        has_narrative_reports: false
      });

      ensureDataset({
        id: 'annual_export_value_by_country_and_product',
        title: 'Annual Export Value by Country and Product',
        short_title: 'Exports by Country and Product',
        description: 'Synthetic dataset: export values by country and product.',
        categoryId: 'economy_trade',
        subcategoryId: null,
        topic_tags: ['exports', 'trade', 'country', 'product'],
        primary_geography_level: 'country',
        geography_levels: ['country'],
        default_frequency: 'annual',
        frequencies: ['annual'],
        measures: ['Export value (billion USD)'],
        default_measure: 'Export value (billion USD)',
        time_coverage_start: '2015-01-01T00:00:00Z',
        time_coverage_end: '2024-01-01T00:00:00Z',
        available_years: [2020, 2021, 2022],
        last_updated: '2025-12-31T00:00:00Z',
        source_agency: '',
        source_url: '',
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        is_api_available: false,
        has_map_view: false,
        has_custom_tables: false,
        has_narrative_reports: false
      });

      ensureDataset({
        id: 'households_broadband_access_by_county',
        title: 'Households with Broadband Access by County',
        short_title: 'Broadband Access by County',
        description: 'Synthetic dataset: percent of households with broadband by county.',
        categoryId: 'economy_trade',
        subcategoryId: null,
        topic_tags: ['broadband', 'internet', 'infrastructure'],
        primary_geography_level: 'county',
        geography_levels: ['county', 'state'],
        default_frequency: 'annual',
        frequencies: ['annual'],
        measures: ['Percent households with broadband'],
        default_measure: 'Percent households with broadband',
        time_coverage_start: '2015-01-01T00:00:00Z',
        time_coverage_end: '2024-01-01T00:00:00Z',
        available_years: [2018, 2019, 2020, 2021, 2022],
        last_updated: '2025-12-31T00:00:00Z',
        source_agency: '',
        source_url: '',
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        is_api_available: false,
        has_map_view: true,
        has_custom_tables: false,
        has_narrative_reports: false
      });

      if (datasets.length) {
        this._saveToStorage('datasets', datasets);
      }

      // --- Observations for synthetic datasets ---
      let observations = this._getFromStorage('dataset_observations');
      const ensureObservation = (obs) => {
        if (!observations.some((o) => o && o.id === obs.id)) {
          observations.push(obs);
        }
      };

      // Obesity, national, ages 18-25, 2019-2021
      ensureObservation({
        id: 'obs_obesity_nat_2019_18_25',
        datasetId: 'adult_obesity_prevalence_by_age_group_and_year',
        geographyId: 'nat_total',
        geography_level: 'national_total',
        year: 2019,
        month: 0,
        date: '2019-01-01T00:00:00Z',
        measure: 'Obesity prevalence (%)',
        age_group: '18-25',
        product_category: '',
        value: 20,
        unit: 'percent',
        currency: '',
        is_estimate: true,
        margin_of_error: 0.5
      });

      ensureObservation({
        id: 'obs_obesity_nat_2020_18_25',
        datasetId: 'adult_obesity_prevalence_by_age_group_and_year',
        geographyId: 'nat_total',
        geography_level: 'national_total',
        year: 2020,
        month: 0,
        date: '2020-01-01T00:00:00Z',
        measure: 'Obesity prevalence (%)',
        age_group: '18-25',
        product_category: '',
        value: 21,
        unit: 'percent',
        currency: '',
        is_estimate: true,
        margin_of_error: 0.5
      });

      ensureObservation({
        id: 'obs_obesity_nat_2021_18_25',
        datasetId: 'adult_obesity_prevalence_by_age_group_and_year',
        geographyId: 'nat_total',
        geography_level: 'national_total',
        year: 2021,
        month: 0,
        date: '2021-01-01T00:00:00Z',
        measure: 'Obesity prevalence (%)',
        age_group: '18-25',
        product_category: '',
        value: 22,
        unit: 'percent',
        currency: '',
        is_estimate: true,
        margin_of_error: 0.5
      });

      // Graduation, one low-rate district for 2021
      ensureObservation({
        id: 'obs_grad_district_low_2021',
        datasetId: 'high_school_graduation_rate_by_district_and_year',
        geographyId: 'district_low_grad_2021',
        geography_level: 'school_district',
        year: 2021,
        month: 0,
        date: '2021-01-01T00:00:00Z',
        measure: 'Graduation rate (%)',
        age_group: '',
        product_category: '',
        value: 60,
        unit: 'percent',
        currency: '',
        is_estimate: false,
        margin_of_error: 1
      });

      // Exports, 2022, computers for US and China
      ensureObservation({
        id: 'obs_exports_2022_us_computers',
        datasetId: 'annual_export_value_by_country_and_product',
        geographyId: 'country_us',
        geography_level: 'country',
        year: 2022,
        month: 0,
        date: '2022-01-01T00:00:00Z',
        measure: 'Export value (billion USD)',
        age_group: '',
        product_category: 'Computers',
        value: 50,
        unit: 'billion USD',
        currency: 'USD',
        is_estimate: false,
        margin_of_error: 1
      });

      ensureObservation({
        id: 'obs_exports_2022_cn_computers',
        datasetId: 'annual_export_value_by_country_and_product',
        geographyId: 'country_cn',
        geography_level: 'country',
        year: 2022,
        month: 0,
        date: '2022-01-01T00:00:00Z',
        measure: 'Export value (billion USD)',
        age_group: '',
        product_category: 'Computers',
        value: 80,
        unit: 'billion USD',
        currency: 'USD',
        is_estimate: false,
        margin_of_error: 1
      });

      if (observations.length) {
        this._saveToStorage('dataset_observations', observations);
      }
    } catch (e) {
      // Ignore any errors from synthetic data injection
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
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

  _now() {
    return new Date().toISOString();
  }

  // -------------------------
  // Foreign key resolution helpers
  // -------------------------

  _resolveDataset(dataset) {
    if (!dataset) return null;
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');
    const category = categories.find((c) => c.id === dataset.categoryId) || null;
    const subcategory = subcategories.find((s) => s.id === dataset.subcategoryId) || null;
    return { ...dataset, category, subcategory };
  }

  _resolveGeography(geo) {
    if (!geo) return null;
    const geographies = this._getFromStorage('geographies');
    const parent = geo.parentId
      ? geographies.find((g) => g.id === geo.parentId) || null
      : null;
    return { ...geo, parent };
  }

  _resolveChart(chart) {
    if (!chart) return null;
    const datasets = this._getFromStorage('datasets');
    const dataset = datasets.find((d) => d.id === chart.datasetId) || null;
    return {
      ...chart,
      dataset: dataset ? this._resolveDataset(dataset) : null
    };
  }

  _resolveCustomTable(table) {
    if (!table) return null;
    const datasets = this._getFromStorage('datasets');
    const dataset = datasets.find((d) => d.id === table.datasetId) || null;
    return {
      ...table,
      dataset: dataset ? this._resolveDataset(dataset) : null
    };
  }

  _resolveMapView(mapView) {
    if (!mapView) return null;
    const datasets = this._getFromStorage('datasets');
    const geographies = this._getFromStorage('geographies');
    const dataset = datasets.find((d) => d.id === mapView.datasetId) || null;
    const geos = Array.isArray(mapView.geography_ids)
      ? mapView.geography_ids
          .map((id) => geographies.find((g) => g.id === id) || null)
          .filter(Boolean)
      : [];
    return {
      ...mapView,
      dataset: dataset ? this._resolveDataset(dataset) : null,
      geographies: geos.map((g) => this._resolveGeography(g))
    };
  }

  _resolveDashboardItem(item) {
    if (!item) return null;
    const dashboards = this._getFromStorage('dashboards');
    const dashboard = dashboards.find((d) => d.id === item.dashboardId) || null;

    let chart = null;
    let mapView = null;
    let customTable = null;

    if (item.item_type === 'chart') {
      const charts = this._getFromStorage('charts');
      chart = charts.find((c) => c.id === item.referenceId) || null;
      chart = this._resolveChart(chart);
    } else if (item.item_type === 'map_view') {
      const maps = this._getFromStorage('map_views');
      mapView = maps.find((m) => m.id === item.referenceId) || null;
      mapView = this._resolveMapView(mapView);
    } else if (item.item_type === 'table') {
      const tables = this._getFromStorage('custom_tables');
      customTable = tables.find((t) => t.id === item.referenceId) || null;
      customTable = this._resolveCustomTable(customTable);
    }

    return {
      ...item,
      dashboard: dashboard || null,
      chart,
      map_view: mapView,
      custom_table: customTable
    };
  }

  _resolveCollectionItem(item) {
    if (!item) return null;
    const collections = this._getFromStorage('collections');
    const collection = collections.find((c) => c.id === item.collectionId) || null;

    let chart = null;
    let mapView = null;
    let customTable = null;

    if (item.visualization_type === 'chart') {
      const charts = this._getFromStorage('charts');
      chart = charts.find((c) => c.id === item.visualizationId) || null;
      chart = this._resolveChart(chart);
    } else if (item.visualization_type === 'map_view') {
      const maps = this._getFromStorage('map_views');
      mapView = maps.find((m) => m.id === item.visualizationId) || null;
      mapView = this._resolveMapView(mapView);
    } else if (item.visualization_type === 'table') {
      const tables = this._getFromStorage('custom_tables');
      customTable = tables.find((t) => t.id === item.visualizationId) || null;
      customTable = this._resolveCustomTable(customTable);
    }

    return {
      ...item,
      collection: collection || null,
      chart,
      map_view: mapView,
      custom_table: customTable
    };
  }

  _resolveComparisonListItem(item) {
    if (!item) return null;
    const lists = this._getFromStorage('comparison_lists');
    const geographies = this._getFromStorage('geographies');
    const comparisonList = lists.find((l) => l.id === item.comparisonListId) || null;
    const geography = geographies.find((g) => g.id === item.entityId) || null;
    return {
      ...item,
      comparison_list: comparisonList || null,
      geography: geography ? this._resolveGeography(geography) : null
    };
  }

  _resolveWatchlistItem(item) {
    if (!item) return null;
    const watchlists = this._getFromStorage('watchlists');
    const geographies = this._getFromStorage('geographies');
    const watchlist = watchlists.find((w) => w.id === item.watchlistId) || null;
    const geography = geographies.find((g) => g.id === item.entityId) || null;
    return {
      ...item,
      watchlist: watchlist || null,
      geography: geography ? this._resolveGeography(geography) : null
    };
  }

  _resolveReport(report) {
    if (!report) return null;
    const datasets = this._getFromStorage('datasets');
    const geographies = this._getFromStorage('geographies');
    const dataset = datasets.find((d) => d.id === report.datasetId) || null;
    const geos = Array.isArray(report.geography_ids)
      ? report.geography_ids
          .map((id) => geographies.find((g) => g.id === id) || null)
          .filter(Boolean)
      : [];
    return {
      ...report,
      dataset: dataset ? this._resolveDataset(dataset) : null,
      geographies: geos.map((g) => this._resolveGeography(g))
    };
  }

  _resolveDownloadJob(job) {
    if (!job) return null;
    let source = null;
    if (job.source_type === 'dataset_view') {
      const datasets = this._getFromStorage('datasets');
      const dataset = datasets.find((d) => d.id === job.sourceId) || null;
      source = dataset ? this._resolveDataset(dataset) : null;
    } else if (job.source_type === 'report') {
      const reports = this._getFromStorage('reports');
      const report = reports.find((r) => r.id === job.sourceId) || null;
      source = this._resolveReport(report);
    } else if (job.source_type === 'custom_table') {
      const tables = this._getFromStorage('custom_tables');
      const table = tables.find((t) => t.id === job.sourceId) || null;
      source = this._resolveCustomTable(table);
    } else if (job.source_type === 'chart') {
      const charts = this._getFromStorage('charts');
      const chart = charts.find((c) => c.id === job.sourceId) || null;
      source = this._resolveChart(chart);
    } else if (job.source_type === 'map_view') {
      const maps = this._getFromStorage('map_views');
      const mapView = maps.find((m) => m.id === job.sourceId) || null;
      source = this._resolveMapView(mapView);
    }
    return { ...job, source };
  }

  _resolveApiDataset(apiDataset) {
    if (!apiDataset) return null;
    const datasets = this._getFromStorage('datasets');
    const dataset = apiDataset.datasetId
      ? datasets.find((d) => d.id === apiDataset.datasetId) || null
      : null;
    return {
      ...apiDataset,
      dataset: dataset ? this._resolveDataset(dataset) : null
    };
  }

  _resolveApiQueryConfig(config) {
    if (!config) return null;
    const apiDatasets = this._getFromStorage('api_datasets');
    const apiDataset = apiDatasets.find((a) => a.id === config.apiDatasetId) || null;
    return {
      ...config,
      api_dataset: this._resolveApiDataset(apiDataset)
    };
  }

  _resolveEntityProfile(profile) {
    if (!profile) return null;
    const geographies = this._getFromStorage('geographies');
    const geography = geographies.find((g) => g.id === profile.entityId) || null;
    return {
      ...profile,
      entity: geography ? this._resolveGeography(geography) : null
    };
  }

  // -------------------------
  // Internal helpers
  // -------------------------

  _getOrCreateDefaultDashboard() {
    let dashboards = this._getFromStorage('dashboards');
    let defaultDashboardId = localStorage.getItem('default_dashboard_id');

    // Try flag is_default first
    let defaultDashboard = dashboards.find((d) => d.is_default) || null;

    if (!defaultDashboard && defaultDashboardId) {
      defaultDashboard = dashboards.find((d) => d.id === defaultDashboardId) || null;
    }

    if (!defaultDashboard) {
      // Create Main dashboard
      const now = this._now();
      defaultDashboard = {
        id: 'main_dashboard',
        name: 'Main dashboard',
        description: '',
        is_default: true,
        created_at: now,
        updated_at: now
      };
      dashboards.push(defaultDashboard);
      this._saveToStorage('dashboards', dashboards);
    } else {
      // Ensure flag and storage key are in sync
      dashboards = dashboards.map((d) => ({
        ...d,
        is_default: d.id === defaultDashboard.id
      }));
      this._saveToStorage('dashboards', dashboards);
    }

    localStorage.setItem('default_dashboard_id', defaultDashboard.id);
    return defaultDashboard;
  }

  _resolveDatasetViewConfig(dataset, viewConfig) {
    const cfg = viewConfig || {};
    const freq =
      cfg.frequency ||
      dataset.default_frequency ||
      (Array.isArray(dataset.frequencies) && dataset.frequencies[0]) ||
      'annual';

    const geographyLevel = cfg.geography_level || dataset.primary_geography_level || 'national_total';

    const measureNames = Array.isArray(cfg.measure_names) && cfg.measure_names.length
      ? cfg.measure_names
      : dataset.default_measure
      ? [dataset.default_measure]
      : Array.isArray(dataset.measures) && dataset.measures.length
      ? [dataset.measures[0]]
      : [];

    let availableYears = Array.isArray(dataset.available_years) && dataset.available_years.length
      ? dataset.available_years
      : null;

    if (!availableYears) {
      const observations = this._getFromStorage('dataset_observations');
      availableYears = observations
        .filter((o) => o.datasetId === dataset.id && typeof o.year === 'number')
        .map((o) => o.year);
      availableYears = Array.from(new Set(availableYears)).sort();
    }

    const minYear = availableYears && availableYears.length ? availableYears[0] : undefined;
    const maxYear = availableYears && availableYears.length ? availableYears[availableYears.length - 1] : undefined;

    const startYear = typeof cfg.start_year === 'number' ? cfg.start_year : minYear;
    const endYear = typeof cfg.end_year === 'number' ? cfg.end_year : maxYear;

    const yearsArray = Array.isArray(cfg.years) && cfg.years.length
      ? cfg.years
      : typeof startYear === 'number' && typeof endYear === 'number'
      ? Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)
      : [];

    const startMonth =
      typeof cfg.start_month === 'number' ? cfg.start_month : freq === 'monthly' ? 1 : undefined;
    const endMonth =
      typeof cfg.end_month === 'number' ? cfg.end_month : freq === 'monthly' ? 12 : undefined;

    return {
      frequency: freq,
      geography_level: geographyLevel,
      geography_ids: Array.isArray(cfg.geography_ids) ? cfg.geography_ids : [],
      measure_names: measureNames,
      start_year: startYear,
      end_year: endYear,
      start_month: startMonth,
      end_month: endMonth,
      years: yearsArray,
      age_groups: Array.isArray(cfg.age_groups) ? cfg.age_groups : [],
      product_categories: Array.isArray(cfg.product_categories) ? cfg.product_categories : [],
      numeric_filters: Array.isArray(cfg.numeric_filters) ? cfg.numeric_filters : [],
      sort_by_column: cfg.sort_by_column || undefined,
      sort_direction: cfg.sort_direction || undefined
    };
  }

  _startDownloadJobInternal(sourceType, sourceId, format) {
    const downloads = this._getFromStorage('downloads');
    const id = this._generateId('download');
    const requestedAt = this._now();

    let ext = 'dat';
    if (format === 'csv') ext = 'csv';
    else if (format === 'excel_xlsx') ext = 'xlsx';
    else if (format === 'pdf') ext = 'pdf';
    else if (format === 'json') ext = 'json';

    const job = {
      id,
      source_type: sourceType,
      sourceId,
      format,
      requested_at: requestedAt,
      completed_at: requestedAt,
      file_url: '/downloads/' + id + '.' + ext,
      status: 'completed'
    };

    downloads.push(job);
    this._saveToStorage('downloads', downloads);
    return job;
  }

  _persistUserWorkspace() {
    const meta = this._getFromStorage('workspace_meta', { last_updated: null });
    const updated = { ...meta, last_updated: this._now() };
    this._saveToStorage('workspace_meta', updated);
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomePageSummary()
  getHomePageSummary() {
    const categories = this._getFromStorage('categories');
    const charts = this._getFromStorage('charts');
    const datasets = this._getFromStorage('datasets');
    const dashboards = this._getFromStorage('dashboards');

    const resolvedCategories = categories.slice();

    const sortedCharts = charts
      .slice()
      .sort((a, b) => {
        const ad = a.created_at || a.updated_at || '';
        const bd = b.created_at || b.updated_at || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      });
    const featuredCharts = sortedCharts.slice(0, 5).map((c) => this._resolveChart(c));

    const activeDatasets = datasets.filter((d) => d.status === 'active');
    const sortedDatasets = activeDatasets
      .slice()
      .sort((a, b) => {
        const ad = a.last_updated || a.updated_at || '';
        const bd = b.last_updated || b.updated_at || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      });
    const featuredDatasets = sortedDatasets.slice(0, 5).map((d) => this._resolveDataset(d));
    const recentDatasets = sortedDatasets.slice(0, 10).map((d) => this._resolveDataset(d));

    // Ensure default dashboard exists
    const defaultDashboard = this._getOrCreateDefaultDashboard();
    const resolvedDashboards = dashboards
      .concat(dashboards.find((d) => d.id === defaultDashboard.id) ? [] : [defaultDashboard])
      .map((d) => ({ ...d }));

    return {
      categories: resolvedCategories,
      featured_charts: featuredCharts,
      featured_datasets: featuredDatasets,
      recent_datasets: recentDatasets,
      key_dashboards: resolvedDashboards
    };
  }

  // getCategories()
  getCategories() {
    return this._getFromStorage('categories');
  }

  // getDataCatalogFilterOptions()
  getDataCatalogFilterOptions() {
    const datasets = this._getFromStorage('datasets');
    const categories = this._getFromStorage('categories');

    const geographyLevelsSet = new Set();
    const yearsSet = new Set();
    const freqSet = new Set();
    const tagsSet = new Set();

    datasets.forEach((d) => {
      if (d.primary_geography_level) geographyLevelsSet.add(d.primary_geography_level);
      if (Array.isArray(d.available_years)) {
        d.available_years.forEach((y) => yearsSet.add(y));
      }
      if (Array.isArray(d.frequencies)) {
        d.frequencies.forEach((f) => freqSet.add(f));
      } else if (d.default_frequency) {
        freqSet.add(d.default_frequency);
      }
      if (Array.isArray(d.topic_tags)) {
        d.topic_tags.forEach((t) => tagsSet.add(t));
      }
    });

    return {
      topics: categories,
      geography_levels: Array.from(geographyLevelsSet),
      years: Array.from(yearsSet).sort(),
      frequencies: Array.from(freqSet),
      topic_tags: Array.from(tagsSet)
    };
  }

  // searchDatasets(query, page, page_size, sort_by, filters)
  searchDatasets(query, page, page_size, sort_by, filters) {
    const datasets = this._getFromStorage('datasets');
    const categories = this._getFromStorage('categories');

    const q = (query || '').trim().toLowerCase();
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const sortBy = sort_by || 'relevance';
    const f = filters || {};

    let filtered = datasets.filter((d) => d.status === 'active');

    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((d) => {
        const haystackParts = [
          d.title || '',
          d.short_title || '',
          d.description || '',
          Array.isArray(d.topic_tags) ? d.topic_tags.join(' ') : ''
        ];
        const haystack = haystackParts.join(' ').toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
    }

    if (Array.isArray(f.category_codes) && f.category_codes.length) {
      const codesSet = new Set(f.category_codes);
      const catIds = categories.filter((c) => codesSet.has(c.code)).map((c) => c.id);
      const catIdSet = new Set(catIds);
      filtered = filtered.filter((d) => d.categoryId && catIdSet.has(d.categoryId));
    }

    if (Array.isArray(f.geography_levels) && f.geography_levels.length) {
      const glSet = new Set(f.geography_levels);
      filtered = filtered.filter((d) => glSet.has(d.primary_geography_level));
    }

    if (typeof f.year_min === 'number' || typeof f.year_max === 'number') {
      const minY = typeof f.year_min === 'number' ? f.year_min : -Infinity;
      const maxY = typeof f.year_max === 'number' ? f.year_max : Infinity;
      filtered = filtered.filter((d) => {
        if (Array.isArray(d.available_years) && d.available_years.length) {
          return d.available_years.some((y) => y >= minY && y <= maxY);
        }
        return true;
      });
    }

    if (Array.isArray(f.frequencies) && f.frequencies.length) {
      const fs = new Set(f.frequencies);
      filtered = filtered.filter((d) => {
        if (Array.isArray(d.frequencies) && d.frequencies.length) {
          return d.frequencies.some((x) => fs.has(x));
        }
        if (d.default_frequency) return fs.has(d.default_frequency);
        return false;
      });
    }

    if (Array.isArray(f.topic_tags) && f.topic_tags.length) {
      const ts = new Set(f.topic_tags);
      filtered = filtered.filter((d) => {
        if (!Array.isArray(d.topic_tags)) return false;
        return d.topic_tags.some((t) => ts.has(t));
      });
    }

    // Sorting
    const sortFnMap = {
      last_updated_desc: (a, b) => {
        const av = a.last_updated || a.updated_at || '';
        const bv = b.last_updated || b.updated_at || '';
        return av < bv ? 1 : av > bv ? -1 : 0;
      },
      last_updated_asc: (a, b) => {
        const av = a.last_updated || a.updated_at || '';
        const bv = b.last_updated || b.updated_at || '';
        return av > bv ? 1 : av < bv ? -1 : 0;
      },
      title_asc: (a, b) => {
        const av = (a.title || '').toLowerCase();
        const bv = (b.title || '').toLowerCase();
        return av > bv ? 1 : av < bv ? -1 : 0;
      },
      title_desc: (a, b) => {
        const av = (a.title || '').toLowerCase();
        const bv = (b.title || '').toLowerCase();
        return av < bv ? 1 : av > bv ? -1 : 0;
      }
    };

    let sorted = filtered.slice();
    if (sortFnMap[sortBy]) {
      sorted.sort(sortFnMap[sortBy]);
    } else {
      // relevance fallback: sort by title
      sorted.sort(sortFnMap.title_asc);
    }

    const total = sorted.length;
    const start = (pg - 1) * ps;
    const pageItems = sorted.slice(start, start + ps).map((d) => this._resolveDataset(d));

    const available_sorts = [
      { key: 'relevance', label: 'Relevance' },
      { key: 'last_updated_desc', label: 'Last updated (newest)' },
      { key: 'last_updated_asc', label: 'Last updated (oldest)' },
      { key: 'title_asc', label: 'Title A-Z' },
      { key: 'title_desc', label: 'Title Z-A' }
    ];

    return {
      datasets: pageItems,
      total_count: total,
      page: pg,
      page_size: ps,
      available_sorts
    };
  }

  // getCategoryPageData(category_code)
  getCategoryPageData(category_code) {
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');
    const datasets = this._getFromStorage('datasets');

    const category = categories.find((c) => c.code === category_code) || null;
    if (!category) {
      return {
        category: null,
        subcategories: [],
        featured_datasets: [],
        all_datasets: []
      };
    }

    const subs = subcategories.filter((s) => s.categoryId === category.id);
    const allDs = datasets
      .filter((d) => d.categoryId === category.id && d.status === 'active')
      .map((d) => this._resolveDataset(d));

    const featured = allDs
      .slice()
      .sort((a, b) => {
        const av = a.last_updated || a.updated_at || '';
        const bv = b.last_updated || b.updated_at || '';
        return av < bv ? 1 : av > bv ? -1 : 0;
      })
      .slice(0, 5);

    return {
      category,
      subcategories: subs,
      featured_datasets: featured,
      all_datasets: allDs
    };
  }

  // searchCategoryDatasets(category_code, subcategoryId, query, topic_tags, page, page_size)
  searchCategoryDatasets(category_code, subcategoryId, query, topic_tags, page, page_size) {
    const categories = this._getFromStorage('categories');
    const datasets = this._getFromStorage('datasets');

    const category = categories.find((c) => c.code === category_code) || null;
    if (!category) {
      return { datasets: [], total_count: 0 };
    }

    const q = (query || '').trim().toLowerCase();
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const tags = Array.isArray(topic_tags) ? new Set(topic_tags) : null;

    let filtered = datasets.filter((d) => d.categoryId === category.id && d.status === 'active');

    if (subcategoryId) {
      filtered = filtered.filter((d) => d.subcategoryId === subcategoryId);
    }

    if (q) {
      filtered = filtered.filter((d) => {
        const inTitle = (d.title || '').toLowerCase().includes(q);
        const inShort = (d.short_title || '').toLowerCase().includes(q);
        const inDesc = (d.description || '').toLowerCase().includes(q);
        const inTags = Array.isArray(d.topic_tags)
          ? d.topic_tags.some((t) => (t || '').toLowerCase().includes(q))
          : false;
        return inTitle || inShort || inDesc || inTags;
      });
    }

    if (tags && tags.size) {
      filtered = filtered.filter((d) => {
        if (!Array.isArray(d.topic_tags)) return false;
        return d.topic_tags.some((t) => tags.has(t));
      });
    }

    const total = filtered.length;
    const start = (pg - 1) * ps;
    const pageItems = filtered.slice(start, start + ps).map((d) => this._resolveDataset(d));

    return {
      datasets: pageItems,
      total_count: total
    };
  }

  // getDatasetDetails(datasetId)
  getDatasetDetails(datasetId) {
    const datasets = this._getFromStorage('datasets');
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return {
        dataset: null,
        category: null,
        subcategory: null,
        default_geography_level: null,
        default_frequency: null,
        default_measure: null
      };
    }

    const category = categories.find((c) => c.id === dataset.categoryId) || null;
    const subcategory = subcategories.find((s) => s.id === dataset.subcategoryId) || null;

    return {
      dataset: this._resolveDataset(dataset),
      category,
      subcategory,
      default_geography_level: dataset.primary_geography_level || null,
      default_frequency: dataset.default_frequency || null,
      default_measure: dataset.default_measure || null
    };
  }

  // getDatasetViewOptions(datasetId)
  getDatasetViewOptions(datasetId) {
    const datasets = this._getFromStorage('datasets');
    const geographies = this._getFromStorage('geographies');
    const observations = this._getFromStorage('dataset_observations');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return {
        dataset: null,
        available_geography_levels: [],
        available_geographies_sample: [],
        available_measures: [],
        available_frequencies: [],
        available_years: [],
        supports_age_groups: false,
        available_age_groups: [],
        supports_product_categories: false,
        available_product_categories: []
      };
    }

    const available_geography_levels = Array.isArray(dataset.geography_levels) && dataset.geography_levels.length
      ? dataset.geography_levels
      : dataset.primary_geography_level
      ? [dataset.primary_geography_level]
      : [];

    const available_geographies_sample = geographies
      .filter((g) => available_geography_levels.includes(g.type))
      .slice(0, 20)
      .map((g) => this._resolveGeography(g));

    const available_measures = Array.isArray(dataset.measures) && dataset.measures.length
      ? dataset.measures
      : dataset.default_measure
      ? [dataset.default_measure]
      : [];

    const available_frequencies = Array.isArray(dataset.frequencies) && dataset.frequencies.length
      ? dataset.frequencies
      : dataset.default_frequency
      ? [dataset.default_frequency]
      : [];

    const available_years = Array.isArray(dataset.available_years) && dataset.available_years.length
      ? dataset.available_years
      : Array.from(
          new Set(
            observations
              .filter((o) => o.datasetId === datasetId && typeof o.year === 'number')
              .map((o) => o.year)
          )
        ).sort();

    const dsObs = observations.filter((o) => o.datasetId === datasetId);

    const ageGroupsSet = new Set(
      dsObs
        .filter((o) => typeof o.age_group === 'string' && o.age_group)
        .map((o) => o.age_group)
    );
    const supports_age_groups = ageGroupsSet.size > 0;

    const productCategoriesSet = new Set(
      dsObs
        .filter((o) => typeof o.product_category === 'string' && o.product_category)
        .map((o) => o.product_category)
    );
    const supports_product_categories = productCategoriesSet.size > 0;

    return {
      dataset: this._resolveDataset(dataset),
      available_geography_levels,
      available_geographies_sample,
      available_measures,
      available_frequencies,
      available_years,
      supports_age_groups,
      available_age_groups: Array.from(ageGroupsSet),
      supports_product_categories,
      available_product_categories: Array.from(productCategoriesSet)
    };
  }

  // getDatasetTableView(datasetId, view_config, page, page_size)
  getDatasetTableView(datasetId, view_config, page, page_size) {
    const datasets = this._getFromStorage('datasets');
    const geographies = this._getFromStorage('geographies');
    const observations = this._getFromStorage('dataset_observations');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return {
        resolved_view_config: {},
        table: {
          columns: [],
          rows: [],
          page: 1,
          page_size: 0,
          total_rows: 0
        },
        download_options: {
          can_download_csv: false,
          can_download_excel: false,
          can_download_pdf: false
        }
      };
    }

    const resolvedConfig = this._resolveDatasetViewConfig(dataset, view_config || {});

    let rowsObs = observations.filter((o) => o.datasetId === datasetId);

    if (resolvedConfig.geography_level) {
      rowsObs = rowsObs.filter((o) => o.geography_level === resolvedConfig.geography_level);
    }

    if (resolvedConfig.geography_ids && resolvedConfig.geography_ids.length) {
      const gidSet = new Set(resolvedConfig.geography_ids);
      rowsObs = rowsObs.filter((o) => gidSet.has(o.geographyId));
    }

    if (resolvedConfig.measure_names && resolvedConfig.measure_names.length) {
      const ms = new Set(resolvedConfig.measure_names);
      rowsObs = rowsObs.filter((o) => ms.has(o.measure));
    }

    if (resolvedConfig.years && resolvedConfig.years.length) {
      const ys = new Set(resolvedConfig.years);
      rowsObs = rowsObs.filter((o) => typeof o.year === 'number' && ys.has(o.year));
    } else {
      if (typeof resolvedConfig.start_year === 'number') {
        rowsObs = rowsObs.filter((o) => typeof o.year !== 'number' || o.year >= resolvedConfig.start_year);
      }
      if (typeof resolvedConfig.end_year === 'number') {
        rowsObs = rowsObs.filter((o) => typeof o.year !== 'number' || o.year <= resolvedConfig.end_year);
      }
    }

    if (resolvedConfig.frequency === 'monthly') {
      if (typeof resolvedConfig.start_month === 'number') {
        rowsObs = rowsObs.filter((o) => typeof o.month !== 'number' || o.month >= resolvedConfig.start_month);
      }
      if (typeof resolvedConfig.end_month === 'number') {
        rowsObs = rowsObs.filter((o) => typeof o.month !== 'number' || o.month <= resolvedConfig.end_month);
      }
    }

    if (resolvedConfig.age_groups && resolvedConfig.age_groups.length) {
      const ag = new Set(resolvedConfig.age_groups);
      rowsObs = rowsObs.filter((o) => !o.age_group || ag.has(o.age_group));
    }

    if (resolvedConfig.product_categories && resolvedConfig.product_categories.length) {
      const pc = new Set(resolvedConfig.product_categories);
      rowsObs = rowsObs.filter((o) => !o.product_category || pc.has(o.product_category));
    }

    if (resolvedConfig.numeric_filters && resolvedConfig.numeric_filters.length) {
      resolvedConfig.numeric_filters.forEach((nf) => {
        const field = nf.field;
        const hasMin = typeof nf.min === 'number';
        const hasMax = typeof nf.max === 'number';
        if (!field || (!hasMin && !hasMax)) return;
        rowsObs = rowsObs.filter((o) => {
          const v = o[field];
          if (typeof v !== 'number') return true;
          if (hasMin && v < nf.min) return false;
          if (hasMax && v > nf.max) return false;
          return true;
        });
      });
    }

    // Sorting
    if (resolvedConfig.sort_by_column) {
      const col = resolvedConfig.sort_by_column;
      const dir = (resolvedConfig.sort_direction || 'asc').toLowerCase();
      rowsObs = rowsObs.slice().sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === undefined && bv === undefined) return 0;
        if (av === undefined) return 1;
        if (bv === undefined) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return dir === 'asc' ? av - bv : bv - av;
        }
        const as = String(av).toLowerCase();
        const bs = String(bv).toLowerCase();
        if (as === bs) return 0;
        return dir === 'asc' ? (as > bs ? 1 : -1) : as < bs ? 1 : -1;
      });
    }

    // Build columns dynamically from observation keys
    const sample = rowsObs[0] || {};
    const excludeKeys = new Set([
      'id',
      'datasetId',
      'geographyId',
      'geography_level',
      'date'
    ]);

    const columnKeys = Object.keys(sample).filter((k) => !excludeKeys.has(k));

    const columns = columnKeys.map((key) => ({
      key,
      label: key,
      data_type: typeof sample[key] === 'number' ? 'number' : 'string',
      is_sortable: true
    }));

    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 50;
    const totalRows = rowsObs.length;
    const start = (pg - 1) * ps;
    const sliceRows = rowsObs.slice(start, start + ps);

    const rows = sliceRows.map((o) => {
      const geo = geographies.find((g) => g.id === o.geographyId) || null;
      return {
        row_id: o.id,
        geography: geo ? this._resolveGeography(geo) : null,
        cells: columns.map((col) => ({
          column_key: col.key,
          value: o[col.key] !== undefined && o[col.key] !== null ? String(o[col.key]) : ''
        }))
      };
    });

    const download_options = {
      can_download_csv: true,
      can_download_excel: true,
      can_download_pdf: true
    };

    return {
      resolved_view_config: resolvedConfig,
      table: {
        columns,
        rows,
        page: pg,
        page_size: ps,
        total_rows: totalRows
      },
      download_options
    };
  }

  // generateDatasetReportFromView(datasetId, view_config, report_name, format)
  generateDatasetReportFromView(datasetId, view_config, report_name, format) {
    const datasets = this._getFromStorage('datasets');
    const reports = this._getFromStorage('reports');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return { report: null };
    }

    const cfg = view_config || {};
    const years = Array.isArray(cfg.years) ? cfg.years : [];

    const id = this._generateId('report');
    let ext = 'pdf';
    if (format === 'csv') ext = 'csv';
    else if (format === 'excel_xlsx') ext = 'xlsx';

    const report = {
      id,
      name: report_name || 'Report ' + id,
      datasetId,
      geography_level: cfg.geography_level || null,
      geography_ids: Array.isArray(cfg.geography_ids) ? cfg.geography_ids : [],
      age_groups: Array.isArray(cfg.age_groups) ? cfg.age_groups : [],
      years,
      start_year: typeof cfg.start_year === 'number' ? cfg.start_year : undefined,
      end_year: typeof cfg.end_year === 'number' ? cfg.end_year : undefined,
      format,
      file_url: '/reports/' + id + '.' + ext,
      created_at: this._now()
    };

    reports.push(report);
    this._saveToStorage('reports', reports);

    return { report: this._resolveReport(report) };
  }

  // startDownloadFromDatasetView(datasetId, view_config, format)
  startDownloadFromDatasetView(datasetId, view_config, format) {
    // view_config is not persisted here, only datasetId as sourceId
    const job = this._startDownloadJobInternal('dataset_view', datasetId, format);

    // Instrumentation for task completion tracking
    try {
      if (format === 'csv') {
        const datasets = this._getFromStorage('datasets');
        const dataset = datasets.find((d) => d.id === datasetId) || null;
        if (dataset) {
          const instrumentationValue = {
            datasetId: datasetId,
            resolved_view_config: this._resolveDatasetViewConfig(dataset, view_config || {}),
            format: format,
            download_job_id: job.id
          };
          localStorage.setItem('task2_downloadViewConfig', JSON.stringify(instrumentationValue));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { download_job: this._resolveDownloadJob(job) };
  }

  // startDownloadFromReport(reportId, format)
  startDownloadFromReport(reportId, format) {
    const job = this._startDownloadJobInternal('report', reportId, format);
    return { download_job: this._resolveDownloadJob(job) };
  }

  // startDownloadFromCustomTable(customTableId, format)
  startDownloadFromCustomTable(customTableId, format) {
    const job = this._startDownloadJobInternal('custom_table', customTableId, format);
    return { download_job: this._resolveDownloadJob(job) };
  }

  // startDownloadFromChart(chartId, format)
  startDownloadFromChart(chartId, format) {
    const job = this._startDownloadJobInternal('chart', chartId, format);
    return { download_job: this._resolveDownloadJob(job) };
  }

  // startDownloadFromMapView(mapViewId, format)
  startDownloadFromMapView(mapViewId, format) {
    const job = this._startDownloadJobInternal('map_view', mapViewId, format);
    return { download_job: this._resolveDownloadJob(job) };
  }

  // createChartFromDatasetView(datasetId, view_config, chart_settings)
  createChartFromDatasetView(datasetId, view_config, chart_settings) {
    const datasets = this._getFromStorage('datasets');
    const charts = this._getFromStorage('charts');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return { chart: null };
    }

    const cfg = this._resolveDatasetViewConfig(dataset, view_config || {});
    const settings = chart_settings || {};

    const id = this._generateId('chart');
    const now = this._now();

    const chart = {
      id,
      name: settings.name || dataset.title || 'Chart ' + id,
      datasetId,
      chart_type: settings.chart_type || 'line_chart',
      description: settings.description || '',
      x_axis_dimension: settings.x_axis_dimension || 'time',
      y_axis_measure:
        settings.y_axis_measure || (cfg.measure_names && cfg.measure_names[0]) || dataset.default_measure || '',
      geography_level: cfg.geography_level || dataset.primary_geography_level || null,
      geography_ids: cfg.geography_ids || [],
      start_year: cfg.start_year,
      end_year: cfg.end_year,
      start_month: cfg.start_month,
      end_month: cfg.end_month,
      age_groups: cfg.age_groups || [],
      product_categories: cfg.product_categories || [],
      min_value: undefined,
      max_value: undefined,
      created_at: now,
      updated_at: now
    };

    charts.push(chart);
    this._saveToStorage('charts', charts);
    this._persistUserWorkspace();

    return { chart: this._resolveChart(chart) };
  }

  // addChartToDashboard(chartId, dashboardId, title_override)
  addChartToDashboard(chartId, dashboardId, title_override) {
    const charts = this._getFromStorage('charts');
    const dashboardItems = this._getFromStorage('dashboard_items');
    let dashboards = this._getFromStorage('dashboards');

    const chart = charts.find((c) => c.id === chartId) || null;
    if (!chart) {
      return { success: false, dashboard: null, dashboard_item: null };
    }

    let dashboard = null;
    if (dashboardId) {
      dashboard = dashboards.find((d) => d.id === dashboardId) || null;
    }
    if (!dashboard) {
      dashboard = this._getOrCreateDefaultDashboard();
      dashboards = this._getFromStorage('dashboards');
    }

    const positionIndex = dashboardItems.filter((i) => i.dashboardId === dashboard.id).length;

    const item = {
      id: this._generateId('dashboard_item'),
      dashboardId: dashboard.id,
      item_type: 'chart',
      referenceId: chartId,
      title: title_override || chart.name,
      position_index: positionIndex,
      width: 6,
      height: 4,
      created_at: this._now(),
      updated_at: this._now()
    };

    dashboardItems.push(item);
    this._saveToStorage('dashboard_items', dashboardItems);
    this._persistUserWorkspace();

    return {
      success: true,
      dashboard,
      dashboard_item: this._resolveDashboardItem(item)
    };
  }

  // saveChartToCollection(chartId, collectionId, new_collection_name)
  saveChartToCollection(chartId, collectionId, new_collection_name) {
    const charts = this._getFromStorage('charts');
    let collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const chart = charts.find((c) => c.id === chartId) || null;
    if (!chart) {
      return { collection: null, collection_item: null };
    }

    let collection = null;
    if (collectionId) {
      collection = collections.find((c) => c.id === collectionId) || null;
    }

    if (!collection) {
      const id = this._generateId('collection');
      const now = this._now();
      collection = {
        id,
        name: new_collection_name || 'Collection ' + id,
        description: '',
        created_at: now,
        updated_at: now
      };
      collections.push(collection);
      this._saveToStorage('collections', collections);
    }

    const item = {
      id: this._generateId('collection_item'),
      collectionId: collection.id,
      visualizationId: chartId,
      visualization_type: 'chart',
      added_at: this._now()
    };

    collectionItems.push(item);
    this._saveToStorage('collection_items', collectionItems);
    this._persistUserWorkspace();

    return {
      collection,
      collection_item: this._resolveCollectionItem(item)
    };
  }

  // getDashboardsSummary()
  getDashboardsSummary() {
    this._getOrCreateDefaultDashboard();
    const dashboards = this._getFromStorage('dashboards');
    const default_dashboard_id = localStorage.getItem('default_dashboard_id');
    return {
      dashboards,
      default_dashboard_id
    };
  }

  // getDashboardDetails(dashboardId)
  getDashboardDetails(dashboardId) {
    const dashboards = this._getFromStorage('dashboards');
    const dashboardItems = this._getFromStorage('dashboard_items');

    const dashboard = dashboards.find((d) => d.id === dashboardId) || null;
    if (!dashboard) {
      return { dashboard: null, items: [] };
    }

    const items = dashboardItems
      .filter((i) => i.dashboardId === dashboard.id)
      .map((i) => {
        const resolved = this._resolveDashboardItem(i);
        return {
          dashboard_item: resolved,
          chart: resolved.chart || null,
          map_view: resolved.map_view || null,
          custom_table: resolved.custom_table || null
        };
      });

    return { dashboard, items };
  }

  // createDashboard(name, description, set_as_default)
  createDashboard(name, description, set_as_default) {
    const dashboards = this._getFromStorage('dashboards');
    const id = this._generateId('dashboard');
    const now = this._now();

    const dashboard = {
      id,
      name,
      description: description || '',
      is_default: !!set_as_default,
      created_at: now,
      updated_at: now
    };

    let updatedDashboards = dashboards.concat(dashboard);

    if (set_as_default) {
      updatedDashboards = updatedDashboards.map((d) => ({
        ...d,
        is_default: d.id === id
      }));
      localStorage.setItem('default_dashboard_id', id);
    }

    this._saveToStorage('dashboards', updatedDashboards);
    this._persistUserWorkspace();

    return { dashboard };
  }

  // updateDashboardLayout(dashboardId, layout)
  updateDashboardLayout(dashboardId, layout) {
    const dashboards = this._getFromStorage('dashboards');
    const dashboardItems = this._getFromStorage('dashboard_items');

    const dashboard = dashboards.find((d) => d.id === dashboardId) || null;
    if (!dashboard) {
      return { dashboard: null, items: [] };
    }

    const layoutById = new Map();
    (layout || []).forEach((l) => {
      if (l && l.dashboardItemId) {
        layoutById.set(l.dashboardItemId, l);
      }
    });

    const updatedItems = dashboardItems.map((item) => {
      if (item.dashboardId !== dashboardId) return item;
      const layoutEntry = layoutById.get(item.id);
      if (!layoutEntry) return item;
      return {
        ...item,
        position_index:
          typeof layoutEntry.position_index === 'number'
            ? layoutEntry.position_index
            : item.position_index,
        width: typeof layoutEntry.width === 'number' ? layoutEntry.width : item.width,
        height: typeof layoutEntry.height === 'number' ? layoutEntry.height : item.height,
        updated_at: this._now()
      };
    });

    this._saveToStorage('dashboard_items', updatedItems);

    const itemsForDashboard = updatedItems
      .filter((i) => i.dashboardId === dashboardId)
      .map((i) => this._resolveDashboardItem(i));

    return { dashboard, items: itemsForDashboard };
  }

  // updateDashboardMetadata(dashboardId, name, description)
  updateDashboardMetadata(dashboardId, name, description) {
    const dashboards = this._getFromStorage('dashboards');
    const index = dashboards.findIndex((d) => d.id === dashboardId);
    if (index === -1) {
      return { dashboard: null };
    }

    const dashboard = dashboards[index];
    const updated = {
      ...dashboard,
      name: typeof name === 'string' && name.length ? name : dashboard.name,
      description:
        typeof description === 'string' ? description : dashboard.description,
      updated_at: this._now()
    };

    dashboards[index] = updated;
    this._saveToStorage('dashboards', dashboards);

    return { dashboard: updated };
  }

  // removeDashboardItem(dashboardItemId)
  removeDashboardItem(dashboardItemId) {
    const dashboardItems = this._getFromStorage('dashboard_items');
    const newItems = dashboardItems.filter((i) => i.id !== dashboardItemId);
    const success = newItems.length !== dashboardItems.length;
    if (success) {
      this._saveToStorage('dashboard_items', newItems);
      this._persistUserWorkspace();
    }
    return { success };
  }

  // setDefaultDashboard(dashboardId)
  setDefaultDashboard(dashboardId) {
    const dashboards = this._getFromStorage('dashboards');
    const exists = dashboards.some((d) => d.id === dashboardId);
    if (!exists) {
      return { default_dashboard_id: localStorage.getItem('default_dashboard_id') || null };
    }

    const updated = dashboards.map((d) => ({
      ...d,
      is_default: d.id === dashboardId
    }));
    this._saveToStorage('dashboards', updated);
    localStorage.setItem('default_dashboard_id', dashboardId);

    return { default_dashboard_id: dashboardId };
  }

  // getCustomTablesOverview()
  getCustomTablesOverview() {
    const tables = this._getFromStorage('custom_tables');
    return {
      custom_tables: tables.map((t) => this._resolveCustomTable(t))
    };
  }

  // getCustomTableDatasetOptions()
  getCustomTableDatasetOptions() {
    const categories = this._getFromStorage('categories');
    const datasets = this._getFromStorage('datasets');
    const ds = datasets
      .filter((d) => d.has_custom_tables)
      .map((d) => this._resolveDataset(d));
    return { categories, datasets: ds };
  }

  // previewCustomTable(datasetId, table_config)
  previewCustomTable(datasetId, table_config) {
    const datasets = this._getFromStorage('datasets');
    const geographies = this._getFromStorage('geographies');
    const observations = this._getFromStorage('dataset_observations');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return {
        resolved_table_config: {},
        table_preview: { columns: [], rows: [] }
      };
    }

    const cfg = table_config || {};
    const resolved = {
      frequency:
        cfg.frequency ||
        dataset.default_frequency ||
        (Array.isArray(dataset.frequencies) && dataset.frequencies[0]) ||
        'annual',
      geography_level: cfg.geography_level || dataset.primary_geography_level || 'national_total',
      geography_ids: Array.isArray(cfg.geography_ids) ? cfg.geography_ids : [],
      measures: Array.isArray(cfg.measures) && cfg.measures.length
        ? cfg.measures
        : dataset.default_measure
        ? [dataset.default_measure]
        : Array.isArray(dataset.measures) && dataset.measures.length
        ? [dataset.measures[0]]
        : [],
      start_year: cfg.start_year,
      end_year: cfg.end_year,
      start_month: cfg.start_month,
      end_month: cfg.end_month
    };

    let rowsObs = observations.filter((o) => o.datasetId === datasetId);
    if (resolved.geography_level) {
      rowsObs = rowsObs.filter((o) => o.geography_level === resolved.geography_level);
    }
    if (resolved.geography_ids && resolved.geography_ids.length) {
      const gidSet = new Set(resolved.geography_ids);
      rowsObs = rowsObs.filter((o) => gidSet.has(o.geographyId));
    }
    if (resolved.measures && resolved.measures.length) {
      const ms = new Set(resolved.measures);
      rowsObs = rowsObs.filter((o) => ms.has(o.measure));
    }
    if (typeof resolved.start_year === 'number') {
      rowsObs = rowsObs.filter((o) => typeof o.year !== 'number' || o.year >= resolved.start_year);
    }
    if (typeof resolved.end_year === 'number') {
      rowsObs = rowsObs.filter((o) => typeof o.year !== 'number' || o.year <= resolved.end_year);
    }
    if (resolved.frequency === 'monthly') {
      if (typeof resolved.start_month === 'number') {
        rowsObs = rowsObs.filter((o) => typeof o.month !== 'number' || o.month >= resolved.start_month);
      }
      if (typeof resolved.end_month === 'number') {
        rowsObs = rowsObs.filter((o) => typeof o.month !== 'number' || o.month <= resolved.end_month);
      }
    }

    const sample = rowsObs[0] || {};
    const excludeKeys = new Set([
      'id',
      'datasetId',
      'geographyId',
      'geography_level',
      'date'
    ]);
    const columnKeys = Object.keys(sample).filter((k) => !excludeKeys.has(k));
    const columns = columnKeys.map((key) => ({ key, label: key }));

    const rows = rowsObs.slice(0, 100).map((o) => ({
      row_id: o.id,
      cells: columns.map((col) => ({
        column_key: col.key,
        value: o[col.key] !== undefined && o[col.key] !== null ? String(o[col.key]) : ''
      }))
    }));

    return {
      resolved_table_config: resolved,
      table_preview: {
        columns,
        rows
      }
    };
  }

  // saveCustomTable(name, datasetId, table_config)
  saveCustomTable(name, datasetId, table_config) {
    const datasets = this._getFromStorage('datasets');
    const tables = this._getFromStorage('custom_tables');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return { custom_table: null };
    }

    const cfg = table_config || {};
    const resolved = {
      frequency:
        cfg.frequency ||
        dataset.default_frequency ||
        (Array.isArray(dataset.frequencies) && dataset.frequencies[0]) ||
        'annual',
      geography_level: cfg.geography_level || dataset.primary_geography_level || 'national_total',
      geography_ids: Array.isArray(cfg.geography_ids) ? cfg.geography_ids : [],
      measures: Array.isArray(cfg.measures) ? cfg.measures : [],
      start_year: cfg.start_year,
      end_year: cfg.end_year,
      start_month: cfg.start_month,
      end_month: cfg.end_month
    };

    const id = this._generateId('custom_table');
    const now = this._now();

    const table = {
      id,
      name,
      datasetId,
      frequency: resolved.frequency,
      geography_level: resolved.geography_level,
      geography_ids: resolved.geography_ids,
      measures: resolved.measures,
      start_year: resolved.start_year,
      end_year: resolved.end_year,
      start_month: resolved.start_month,
      end_month: resolved.end_month,
      created_at: now,
      updated_at: now
    };

    tables.push(table);
    this._saveToStorage('custom_tables', tables);
    this._persistUserWorkspace();

    return { custom_table: this._resolveCustomTable(table) };
  }

  // getMapDatasetOptions()
  getMapDatasetOptions() {
    const categories = this._getFromStorage('categories');
    const datasets = this._getFromStorage('datasets');
    const ds = datasets
      .filter((d) => d.has_map_view)
      .map((d) => this._resolveDataset(d));
    return { categories, datasets: ds };
  }

  // previewMapView(datasetId, geography_level, geography_filter_type, geography_ids, value_field, ...)
  previewMapView(datasetId, geography_level, geography_filter_type, geography_ids, value_field, min_value, max_value, center_latitude, center_longitude, zoom_level) {
    const datasets = this._getFromStorage('datasets');
    const geographies = this._getFromStorage('geographies');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return {
        map_preview: {
          dataset: null,
          geography_level: geography_level || null,
          geography_ids: [],
          value_field,
          min_value,
          max_value,
          center_latitude,
          center_longitude,
          zoom_level,
          matching_geographies_count: 0
        }
      };
    }

    const geoLevel = geography_level;
    const gfType = geography_filter_type || 'all';
    const filterIds = Array.isArray(geography_ids) ? geography_ids : [];

    let targetGeos = geographies.filter((g) => g.type === geoLevel);

    if (gfType === 'state' && geoLevel !== 'state' && filterIds.length) {
      const filterSet = new Set(filterIds);
      targetGeos = targetGeos.filter((g) => g.parentId && filterSet.has(g.parentId));
    } else if (gfType === 'country' && geoLevel !== 'country' && filterIds.length) {
      const filterSet = new Set(filterIds);
      targetGeos = targetGeos.filter((g) => g.parentId && filterSet.has(g.parentId));
    } else if (gfType === 'custom' && filterIds.length) {
      const filterSet = new Set(filterIds);
      targetGeos = targetGeos.filter((g) => filterSet.has(g.id));
    }

    const matchingCount = targetGeos.length;

    return {
      map_preview: {
        dataset: this._resolveDataset(dataset),
        geography_level: geoLevel,
        geography_ids: filterIds,
        value_field,
        min_value,
        max_value,
        center_latitude,
        center_longitude,
        zoom_level,
        matching_geographies_count: matchingCount
      }
    };
  }

  // saveMapView(name, datasetId, geography_level, geography_filter_type, geography_ids, ...)
  saveMapView(name, datasetId, geography_level, geography_filter_type, geography_ids, value_field, min_value, max_value, center_latitude, center_longitude, zoom_level) {
    const datasets = this._getFromStorage('datasets');
    const maps = this._getFromStorage('map_views');

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return { map_view: null };
    }

    const id = this._generateId('map_view');
    const now = this._now();

    const mapView = {
      id,
      name,
      datasetId,
      geography_level,
      geography_filter_type: geography_filter_type || 'all',
      geography_ids: Array.isArray(geography_ids) ? geography_ids : [],
      value_field,
      min_value,
      max_value,
      center_latitude,
      center_longitude,
      zoom_level,
      created_at: now,
      updated_at: now
    };

    maps.push(mapView);
    this._saveToStorage('map_views', maps);
    this._persistUserWorkspace();

    return { map_view: this._resolveMapView(mapView) };
  }

  // getSavedMapViews()
  getSavedMapViews() {
    const maps = this._getFromStorage('map_views');
    return maps.map((m) => this._resolveMapView(m));
  }

  // getApiPortalOverview()
  getApiPortalOverview() {
    return this._getFromStorage('api_portal_overview', {
      overview_text: '',
      rate_limit_info: '',
      authentication_info: ''
    });
  }

  // searchApiDatasets(query, page, page_size)
  searchApiDatasets(query, page, page_size) {
    const apiDatasets = this._getFromStorage('api_datasets');
    const q = (query || '').trim().toLowerCase();
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;

    let filtered = apiDatasets.slice();
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((a) => {
        const haystack = ((a.name || '') + ' ' + (a.description || '')).toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
    }

    const total = filtered.length;
    const start = (pg - 1) * ps;
    const pageItems = filtered.slice(start, start + ps).map((a) => this._resolveApiDataset(a));

    return {
      api_datasets: pageItems,
      total_count: total
    };
  }

  // getApiDatasetDetails(apiDatasetId)
  getApiDatasetDetails(apiDatasetId) {
    const apiDatasets = this._getFromStorage('api_datasets');
    const apiDataset = apiDatasets.find((a) => a.id === apiDatasetId) || null;
    if (!apiDataset) {
      return {
        api_dataset: null,
        dataset: null,
        example_endpoints: [],
        parameter_details: []
      };
    }

    const resolvedApiDataset = this._resolveApiDataset(apiDataset);
    const dataset = resolvedApiDataset.dataset;

    const example_endpoints = [];
    if (resolvedApiDataset.base_url) {
      const base = resolvedApiDataset.base_url;
      const fmt = resolvedApiDataset.default_format || 'json';
      example_endpoints.push(base + '?format=' + encodeURIComponent(fmt));
    }

    const parameter_details = Array.isArray(resolvedApiDataset.available_parameters)
      ? resolvedApiDataset.available_parameters.map((p) => ({
          name: p,
          description: '',
          required: false
        }))
      : [];

    return {
      api_dataset: resolvedApiDataset,
      dataset,
      example_endpoints,
      parameter_details
    };
  }

  // generateApiQueryUrl(apiDatasetId, format, parameters)
  generateApiQueryUrl(apiDatasetId, format, parameters) {
    const apiDatasets = this._getFromStorage('api_datasets');
    const apiDataset = apiDatasets.find((a) => a.id === apiDatasetId) || null;
    if (!apiDataset) {
      return { api_query_config: null };
    }

    const paramsArray = Array.isArray(parameters) ? parameters : [];

    const queryParams = [];
    queryParams.push('format=' + encodeURIComponent(format));
    paramsArray.forEach((p) => {
      if (!p || !p.key) return;
      queryParams.push(
        encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value == null ? '' : String(p.value))
      );
    });

    const qs = queryParams.join('&');
    const url = apiDataset.base_url + (queryParams.length ? '?' + qs : '');

    const id = this._generateId('api_query');
    const now = this._now();

    const config = {
      id,
      apiDatasetId,
      name: '',
      format,
      parameters: paramsArray.map((p) => p.key + '=' + (p.value == null ? '' : String(p.value))),
      generated_url: url,
      created_at: now,
      last_used_at: now
    };

    const allConfigs = this._getFromStorage('api_queries');
    allConfigs.push(config);
    this._saveToStorage('api_queries', allConfigs);

    return { api_query_config: this._resolveApiQueryConfig(config) };
  }

  // getEntityProfile(entityId)
  getEntityProfile(entityId) {
    const profiles = this._getFromStorage('entity_profiles');
    const geographies = this._getFromStorage('geographies');
    const customTables = this._getFromStorage('custom_tables');
    const charts = this._getFromStorage('charts');

    const geography = geographies.find((g) => g.id === entityId) || null;

    const profile = profiles.find((p) => p.entityId === entityId) || null;
    const resolvedProfile = profile ? this._resolveEntityProfile(profile) : null;

    const keyCharts = charts
      .filter((c) => Array.isArray(c.geography_ids) && c.geography_ids.includes(entityId))
      .map((c) => this._resolveChart(c));

    const keyTables = customTables
      .filter((t) => Array.isArray(t.geography_ids) && t.geography_ids.includes(entityId))
      .map((t) => this._resolveCustomTable(t));

    return {
      profile: resolvedProfile,
      geography: geography ? this._resolveGeography(geography) : null,
      key_charts: keyCharts,
      key_tables: keyTables
    };
  }

  // getWatchlistsSummary()
  getWatchlistsSummary() {
    const watchlists = this._getFromStorage('watchlists');
    return watchlists;
  }

  // addEntityToWatchlist(entityId, watchlistId, new_watchlist_name)
  addEntityToWatchlist(entityId, watchlistId, new_watchlist_name) {
    const geographies = this._getFromStorage('geographies');
    let watchlists = this._getFromStorage('watchlists');
    const watchlistItems = this._getFromStorage('watchlist_items');

    const geography = geographies.find((g) => g.id === entityId) || null;
    if (!geography) {
      return { watchlist: null, watchlist_item: null };
    }

    let watchlist = null;
    if (watchlistId) {
      watchlist = watchlists.find((w) => w.id === watchlistId) || null;
    }

    if (!watchlist) {
      const id = this._generateId('watchlist');
      const now = this._now();
      watchlist = {
        id,
        name: new_watchlist_name || 'Watchlist ' + id,
        description: '',
        created_at: now,
        updated_at: now
      };
      watchlists.push(watchlist);
      this._saveToStorage('watchlists', watchlists);
    }

    const item = {
      id: this._generateId('watchlist_item'),
      watchlistId: watchlist.id,
      entityId,
      entity_type: 'geography',
      label: geography.name || '',
      added_at: this._now()
    };

    watchlistItems.push(item);
    this._saveToStorage('watchlist_items', watchlistItems);
    this._persistUserWorkspace();

    return {
      watchlist,
      watchlist_item: this._resolveWatchlistItem(item)
    };
  }

  // getComparisonListsSummary()
  getComparisonListsSummary() {
    const lists = this._getFromStorage('comparison_lists');
    return lists;
  }

  // addEntitiesToComparisonList(geography_ids, comparisonListId, new_list_name)
  addEntitiesToComparisonList(geography_ids, comparisonListId, new_list_name) {
    const geographies = this._getFromStorage('geographies');
    let lists = this._getFromStorage('comparison_lists');
    const items = this._getFromStorage('comparison_list_items');

    const geoIds = Array.isArray(geography_ids) ? geography_ids : [];
    if (!geoIds.length) {
      return { comparison_list: null, items_added: [] };
    }

    let list = null;
    if (comparisonListId) {
      list = lists.find((l) => l.id === comparisonListId) || null;
    }

    if (!list) {
      const id = this._generateId('comparison_list');
      const now = this._now();
      list = {
        id,
        name: new_list_name || 'Comparison list ' + id,
        description: '',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
    }

    const baseIndex = items.filter((i) => i.comparisonListId === list.id).length;

    const addedItems = [];
    geoIds.forEach((gid, idx) => {
      const geo = geographies.find((g) => g.id === gid);
      if (!geo) return;
      const item = {
        id: this._generateId('comparison_list_item'),
        comparisonListId: list.id,
        entityId: gid,
        entity_type: 'geography',
        label: geo.name || '',
        sort_index: baseIndex + idx,
        added_at: this._now()
      };
      items.push(item);
      addedItems.push(this._resolveComparisonListItem(item));
    });

    this._saveToStorage('comparison_list_items', items);
    this._persistUserWorkspace();

    return {
      comparison_list: list,
      items_added: addedItems
    };
  }

  // getCollectionsSummary()
  getCollectionsSummary() {
    const collections = this._getFromStorage('collections');
    return collections;
  }

  // getAboutContent()
  getAboutContent() {
    return this._getFromStorage('about_content', {
      mission: '',
      scope: '',
      governance: '',
      data_sources: '',
      update_schedules: '',
      quality_assurance: ''
    });
  }

  // getHelpContent(topic_key)
  getHelpContent(topic_key) {
    const help = this._getFromStorage('help_content', {
      topics: [],
      faqs: [],
      troubleshooting: ''
    });

    let topics = Array.isArray(help.topics) ? help.topics : [];
    if (topic_key) {
      topics = topics.filter((t) => t.key === topic_key);
    }

    return {
      topics,
      faqs: Array.isArray(help.faqs) ? help.faqs : [],
      troubleshooting: help.troubleshooting || ''
    };
  }

  // getContactInfo()
  getContactInfo() {
    return this._getFromStorage('contact_info', {
      agency_name: '',
      email: '',
      phone: '',
      postal_address: '',
      expected_response_time: '',
      additional_resources: []
    });
  }

  // submitContactRequest(name, email, subject, message, category)
  submitContactRequest(name, email, subject, message, category) {
    const requests = this._getFromStorage('contact_requests');
    const id = this._generateId('ticket');

    const req = {
      id,
      name,
      email,
      subject,
      message,
      category: category || '',
      created_at: this._now()
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      ticket_id: id,
      message: 'Your request has been submitted.'
    };
  }

  // getAccessibilityInfo()
  getAccessibilityInfo() {
    return this._getFromStorage('accessibility_info', {
      standards_and_conformance: '',
      accessibility_features: '',
      reporting_instructions: ''
    });
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