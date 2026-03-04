/* eslint-disable no-var */
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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Array-backed entities
    const arrayKeys = [
      "datasets",
      "projects",
      "workspaces",
      "queries",
      "access_requests",
      "approved_datasets",
      "access_extension_requests",
      "collaborators",
      "export_jobs",
      "agreement_templates",
      "agreements",
      "favorite_datasets",
      "dashboard_pins"
    ];

    // auxiliary tables (initialized separately, e.g., users)

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, "[]");
      }
    }

    // Seed default datasets used in end-to-end tests if they are missing
    try {
      const rawDatasets = localStorage.getItem("datasets");
      let datasetsArr = [];
      if (rawDatasets) {
        try {
          datasetsArr = JSON.parse(rawDatasets) || [];
        } catch (e) {
          datasetsArr = [];
        }
      }
      if (!Array.isArray(datasetsArr)) datasetsArr = [];

      const ensureDataset = function (ds) {
        if (!ds || !ds.id) return;
        if (!datasetsArr.some(function (existing) { return existing && existing.id === ds.id; })) {
          datasetsArr.push(ds);
        }
      };

      const nowIso = new Date().toISOString();

      // --- Mental health datasets (sample size 1000–5000) ---
      ensureDataset({
        id: "ds_mh_global_survey_2019",
        title: "Global Mental Health Survey 2019",
        description: "Cross-sectional survey of adult mental health status and service utilization.",
        domain: "mental_health",
        access_type: "controlled",
        sample_size: 3200,
        country: "United States",
        collection_start_date: "2019-01-01T00:00:00Z",
        collection_end_date: "2019-12-31T23:59:59Z",
        variable_count: 85,
        keywords: ["mental health", "survey", "anxiety", "depression"],
        created_at: nowIso
      });

      ensureDataset({
        id: "ds_mh_clinic_outcomes_2020",
        title: "Urban Mental Health Clinic Outcomes 2020",
        description: "Routinely collected outcomes from urban mental health clinics.",
        domain: "mental_health",
        access_type: "controlled",
        sample_size: 2100,
        country: "Canada",
        collection_start_date: "2020-01-01T00:00:00Z",
        collection_end_date: "2020-12-31T23:59:59Z",
        variable_count: 120,
        keywords: ["mental health", "depression", "outcomes"],
        created_at: nowIso
      });

      ensureDataset({
        id: "ds_mh_youth_cohort_2018_2021",
        title: "Youth Mental Health Cohort 2018–2021",
        description: "Longitudinal cohort of adolescents followed for mental health and substance use outcomes.",
        domain: "mental_health",
        access_type: "controlled",
        sample_size: 4600,
        country: "United Kingdom",
        collection_start_date: "2018-09-01T00:00:00Z",
        collection_end_date: "2021-08-31T23:59:59Z",
        variable_count: 140,
        keywords: ["mental health", "youth", "cohort"],
        created_at: nowIso
      });

      // --- Diabetes registry dataset referenced in tests ---
      ensureDataset({
        id: "ds_diab_nat_registry_2021",
        title: "National Diabetes Registry 2021",
        description: "National registry of patients with diabetes including laboratory results and longitudinal follow-up.",
        domain: "diabetes",
        access_type: "controlled",
        sample_size: 150000,
        country: "United States",
        collection_start_date: "2021-01-01T00:00:00Z",
        collection_end_date: "2021-12-31T23:59:59Z",
        variable_count: 220,
        keywords: ["diabetes", "registry", "HbA1c", "type 2 diabetes"],
        created_at: nowIso
      });

      // Cardio outcomes registry dataset referenced in test data
      ensureDataset({
        id: "ds_cardio_outcomes_registry",
        title: "National Cardio Outcomes Registry",
        description: "National cardiovascular outcomes registry with longitudinal follow-up.",
        domain: "cardiology",
        access_type: "controlled",
        sample_size: 90000,
        country: "United States",
        collection_start_date: "2019-01-01T00:00:00Z",
        collection_end_date: "2022-12-31T23:59:59Z",
        variable_count: 180,
        keywords: ["cardiology", "outcomes", "registry"],
        created_at: nowIso
      });

      // --- Breast cancer genomics datasets (>= 200 variables) ---
      ensureDataset({
        id: "ds_brca_genomics_panel_v1",
        title: "Breast Cancer Genomics Panel v1",
        description: "Targeted panel sequencing data for breast cancer patients with linked clinical features.",
        domain: "genomics",
        access_type: "controlled",
        sample_size: 800,
        country: "United States",
        collection_start_date: "2020-01-01T00:00:00Z",
        collection_end_date: "2022-12-31T23:59:59Z",
        variable_count: 250,
        keywords: ["breast cancer genomics", "panel sequencing", "BRCA"],
        created_at: nowIso
      });

      ensureDataset({
        id: "ds_brca_genomics_panel_v2",
        title: "Breast Cancer Genomics Panel v2",
        description: "Expanded sequencing and expression dataset for breast cancer genomics research.",
        domain: "genomics",
        access_type: "controlled",
        sample_size: 600,
        country: "Canada",
        collection_start_date: "2021-06-01T00:00:00Z",
        collection_end_date: "2023-03-31T23:59:59Z",
        variable_count: 320,
        keywords: ["breast cancer genomics", "whole exome", "expression"],
        created_at: nowIso
      });

      // --- Open-access Canadian asthma datasets ---
      ensureDataset({
        id: "ds_asthma_canada_claims_2016_2020",
        title: "Canadian Asthma Claims 2016–2020",
        description: "Administrative claims dataset for asthma-related encounters across Canada.",
        domain: "respiratory",
        access_type: "open",
        sample_size: 75000,
        country: "Canada",
        collection_start_date: "2016-01-01T00:00:00Z",
        collection_end_date: "2020-12-31T23:59:59Z",
        variable_count: 95,
        keywords: ["asthma", "claims", "Canada", "respiratory"],
        created_at: nowIso
      });

      ensureDataset({
        id: "ds_asthma_canada_cohort_2018_2022",
        title: "Canadian Asthma Cohort 2018–2022",
        description: "Prospective cohort of Canadian patients with physician-diagnosed asthma.",
        domain: "respiratory",
        access_type: "open",
        sample_size: 54000,
        country: "Canada",
        collection_start_date: "2018-03-01T00:00:00Z",
        collection_end_date: "2022-12-31T23:59:59Z",
        variable_count: 120,
        keywords: ["asthma", "cohort", "Canada", "lung function"],
        created_at: nowIso
      });

      localStorage.setItem("datasets", JSON.stringify(datasetsArr));
    } catch (e) {
      // Ignore seeding errors to avoid impacting core functionality
    }

    // Initialize users table with default accounts if not present
    if (localStorage.getItem("users") === null) {
      const defaultUsers = [
        {
          id: "user_researcher1",
          username: "researcher1",
          password: "Password123!",
          displayName: "Researcher One",
          roles: ["researcher"]
        },
        {
          id: "user_researcher2",
          username: "researcher2",
          password: "Password123!",
          displayName: "Researcher Two",
          roles: ["researcher"]
        },
        {
          id: "user_researcher3",
          username: "researcher3",
          password: "Password123!",
          displayName: "Researcher Three",
          roles: ["researcher"]
        },
        {
          id: "user_lead_researcher",
          username: "lead_researcher",
          password: "Password123!",
          displayName: "Lead Researcher",
          roles: ["lead_researcher"]
        },
        {
          id: "user_pi_user",
          username: "pi_user",
          password: "Password123!",
          displayName: "Principal Investigator",
          roles: ["principal_investigator"]
        },
        {
          id: "user_genomics_user",
          username: "genomics_user",
          password: "Password123!",
          displayName: "Genomics Researcher",
          roles: ["researcher"]
        },
        {
          id: "user_compliance_officer",
          username: "compliance_officer",
          password: "Password123!",
          displayName: "Compliance Officer",
          roles: ["compliance_officer"]
        },
        {
          id: "user_data_manager",
          username: "data_manager",
          password: "Password123!",
          displayName: "Data Manager",
          roles: ["data_manager"]
        },
        {
          id: "user_epi_researcher",
          username: "epi_researcher",
          password: "Password123!",
          displayName: "Epidemiology Researcher",
          roles: ["researcher"]
        }
      ];
      localStorage.setItem("users", JSON.stringify(defaultUsers));
    }

    // Session object
    if (localStorage.getItem("session") === null) {
      localStorage.setItem(
        "session",
        JSON.stringify({
          isAuthenticated: false,
          username: null,
          displayName: null,
          roles: []
        })
      );
    }

    // Optional content objects
    if (localStorage.getItem("about_content") === null) {
      localStorage.setItem(
        "about_content",
        JSON.stringify({
          title: "Secure Research Data Access Portal",
          mission: "Provide secure, governed access to sensitive research datasets.",
          scope: "Supports multi-domain health research projects, workspaces, and governed data exports.",
          governance: "Data access is governed by institutional review boards, data use agreements, and project approvals.",
          securityPrinciples: "Least privilege, auditing, encryption in transit and at rest, and strict access controls.",
          contactInfo: {
            email: "support@example.org",
            phone: "",
            organization: "Secure Research Data Platform"
          }
        })
      );
    }

    if (localStorage.getItem("help_content") === null) {
      localStorage.setItem(
        "help_content",
        JSON.stringify({
          faqs: [],
          taskGuides: [],
          troubleshootingTips: [],
          supportContacts: []
        })
      );
    }

    if (localStorage.getItem("policies_content") === null) {
      localStorage.setItem(
        "policies_content",
        JSON.stringify({
          privacyPolicyHtml: "",
          termsOfUseHtml: "",
          dataGovernancePolicyHtml: ""
        })
      );
    }

    // Per-user state (created lazily in _getOrCreateUserState)
    if (localStorage.getItem("user_state") === null) {
      localStorage.setItem("user_state", "null");
    }

    if (localStorage.getItem("idCounter") === null) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === "undefined") {
      return typeof defaultValue === "undefined" ? [] : defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue === "undefined" ? [] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // -------------------- Helper functions --------------------

  // Internal helper to load or initialize single-user state
  _getOrCreateUserState() {
    let state = this._getFromStorage("user_state", null);
    if (!state || typeof state !== "object") {
      state = {
        created_at: this._nowIso()
      };
      this._saveToStorage("user_state", state);
    }
    return state;
  }

  // Apply filters and sorting for dataset search
  _applyDatasetSearchFilters(datasets, query, filters, sortField, sortOrder) {
    let results = Array.isArray(datasets) ? datasets.slice() : [];

    const q = query && typeof query === "string" ? query.trim().toLowerCase() : "";
    const f = filters || {};

    if (q) {
      results = results.filter(function (d) {
        const title = (d.title || "").toLowerCase();
        const desc = (d.description || "").toLowerCase();
        const keywords = Array.isArray(d.keywords) ? d.keywords.join(" ").toLowerCase() : "";
        return (
          title.indexOf(q) !== -1 ||
          desc.indexOf(q) !== -1 ||
          keywords.indexOf(q) !== -1
        );
      });
    }

    // enum filters
    if (f.domain) {
      results = results.filter(function (d) {
        return d.domain === f.domain;
      });
    }

    if (f.accessType) {
      results = results.filter(function (d) {
        return d.access_type === f.accessType;
      });
    }

    if (f.country) {
      results = results.filter(function (d) {
        return d.country === f.country;
      });
    }

    // numeric filters
    if (typeof f.minSampleSize === "number") {
      results = results.filter(function (d) {
        return typeof d.sample_size === "number" && d.sample_size >= f.minSampleSize;
      });
    }

    if (typeof f.maxSampleSize === "number") {
      results = results.filter(function (d) {
        return typeof d.sample_size === "number" && d.sample_size <= f.maxSampleSize;
      });
    }

    if (typeof f.minVariableCount === "number") {
      results = results.filter(function (d) {
        return typeof d.variable_count === "number" && d.variable_count >= f.minVariableCount;
      });
    }

    if (typeof f.maxVariableCount === "number") {
      results = results.filter(function (d) {
        return typeof d.variable_count === "number" && d.variable_count <= f.maxVariableCount;
      });
    }

    // date filters (ISO strings)
    if (f.collectionStartDateFrom) {
      const fromTs = Date.parse(f.collectionStartDateFrom);
      if (!isNaN(fromTs)) {
        results = results.filter(function (d) {
          if (!d.collection_start_date) return false;
          const ts = Date.parse(d.collection_start_date);
          return !isNaN(ts) && ts >= fromTs;
        });
      }
    }

    if (f.collectionStartDateTo) {
      const toTs = Date.parse(f.collectionStartDateTo);
      if (!isNaN(toTs)) {
        results = results.filter(function (d) {
          if (!d.collection_start_date) return false;
          const ts = Date.parse(d.collection_start_date);
          return !isNaN(ts) && ts <= toTs;
        });
      }
    }

    const field = sortField || "created_at";
    const order = sortOrder === "descending" ? "descending" : "ascending";

    results.sort(function (a, b) {
      let av = a[field];
      let bv = b[field];

      // Handle undefined/null
      if (typeof av === "undefined" || av === null) av = null;
      if (typeof bv === "undefined" || bv === null) bv = null;

      // Special handling for dates
      if (field === "collection_start_date" || field === "created_at") {
        const ats = av ? Date.parse(av) : 0;
        const bts = bv ? Date.parse(bv) : 0;
        if (ats < bts) return order === "ascending" ? -1 : 1;
        if (ats > bts) return order === "ascending" ? 1 : -1;
        return 0;
      }

      // Numeric compare
      if (typeof av === "number" && typeof bv === "number") {
        if (av < bv) return order === "ascending" ? -1 : 1;
        if (av > bv) return order === "ascending" ? 1 : -1;
        return 0;
      }

      // String compare
      av = av === null ? "" : String(av).toLowerCase();
      bv = bv === null ? "" : String(bv).toLowerCase();
      if (av < bv) return order === "ascending" ? -1 : 1;
      if (av > bv) return order === "ascending" ? 1 : -1;
      return 0;
    });

    return results;
  }

  // Determine which projects are expiring within next 30 days
  _calculateProjectExpirationFlags(projects) {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const flags = [];

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (!p.access_expiration_date) continue;
      const expTs = Date.parse(p.access_expiration_date);
      if (isNaN(expTs)) continue;
      const diffDays = Math.floor((expTs - now.getTime()) / oneDayMs);
      flags.push({
        project: p,
        daysUntilExpiration: diffDays
      });
    }

    return flags;
  }

  // -------------------- Authentication interfaces --------------------

  // signIn(username, password)
  signIn(username, password) {
    const users = this._getFromStorage("users", []);
    const u = users.find(function (user) {
      return user.username === username;
    });

    if (!u || u.password !== password) {
      const session = {
        isAuthenticated: false,
        username: null,
        displayName: null,
        roles: []
      };
      this._saveToStorage("session", session);
      return {
        success: false,
        message: "Invalid username or password",
        username: null,
        displayName: null,
        roles: [],
        isAuthenticated: false
      };
    }

    const session = {
      isAuthenticated: true,
      username: u.username,
      displayName: u.displayName || u.username,
      roles: Array.isArray(u.roles) ? u.roles : []
    };
    this._saveToStorage("session", session);
    this._getOrCreateUserState();

    return {
      success: true,
      message: "Signed in",
      username: session.username,
      displayName: session.displayName,
      roles: session.roles,
      isAuthenticated: true
    };
  }

  // getCurrentUserContext()
  getCurrentUserContext() {
    const session = this._getFromStorage("session", {
      isAuthenticated: false,
      username: null,
      displayName: null,
      roles: []
    });
    return {
      isAuthenticated: !!session.isAuthenticated,
      username: session.username || null,
      displayName: session.displayName || null,
      roles: Array.isArray(session.roles) ? session.roles : []
    };
  }

  // -------------------- Dashboard interfaces --------------------

  // getDashboardSummary()
  getDashboardSummary() {
    const datasets = this._getFromStorage("datasets", []);
    const projects = this._getFromStorage("projects", []);
    const queries = this._getFromStorage("queries", []);
    const exportJobs = this._getFromStorage("export_jobs", []);
    const accessRequests = this._getFromStorage("access_requests", []);
    const pins = this._getFromStorage("dashboard_pins", []);

    // pinned datasets
    const pinnedDatasets = pins.map((pin) => {
      const dataset = datasets.find((d) => d.id === pin.dataset_id) || null;
      return { pin: pin, dataset: dataset };
    });

    const activeProjects = projects.filter((p) => p.status === "active");

    // expiring projects
    const expirationFlags = this._calculateProjectExpirationFlags(activeProjects);
    const expiringProjects = expirationFlags
      .filter((f) => f.daysUntilExpiration >= 0 && f.daysUntilExpiration <= 30)
      .map((f) => ({ project: f.project, daysUntilExpiration: f.daysUntilExpiration }));

    // recent queries (by updated_at or created_at)
    const queriesSorted = queries
      .slice()
      .sort((a, b) => {
        const at = Date.parse(a.updated_at || a.created_at || 0) || 0;
        const bt = Date.parse(b.updated_at || b.created_at || 0) || 0;
        return bt - at;
      })
      .slice(0, 5);

    const recentQueries = queriesSorted.map((q) => {
      const workspace = projects.length ? null : null; // placeholder to avoid lints
      const ws = this._getFromStorage("workspaces", []).find((w) => w.id === q.workspace_id) || null;
      const ds = datasets.find((d) => d.id === q.dataset_id) || null;
      const ranAt = q.updated_at || q.created_at || null;
      return {
        query: q,
        workspaceName: ws ? ws.name : null,
        datasetTitle: ds ? ds.title : null,
        ranAt: ranAt
      };
    });

    // recent export jobs
    const exportJobsSorted = exportJobs
      .slice()
      .sort((a, b) => {
        const at = Date.parse(a.updated_at || a.created_at || 0) || 0;
        const bt = Date.parse(b.updated_at || b.created_at || 0) || 0;
        return bt - at;
      })
      .slice(0, 5);

    const recentExportJobs = exportJobsSorted.map((ej) => {
      const proj = projects.find((p) => p.id === ej.project_id) || null;
      const ds = datasets.find((d) => d.id === ej.dataset_id) || null;
      const lastRunAt = ej.updated_at || ej.created_at || null;
      return {
        exportJob: ej,
        projectTitle: proj ? proj.title : null,
        datasetTitle: ds ? ds.title : null,
        lastRunAt: lastRunAt
      };
    });

    // recent access requests
    const accessRequestsSorted = accessRequests
      .slice()
      .sort((a, b) => {
        const at = Date.parse(a.requested_at || 0) || 0;
        const bt = Date.parse(b.requested_at || 0) || 0;
        return bt - at;
      })
      .slice(0, 5);

    const recentAccessRequests = accessRequestsSorted.map((ar) => {
      const proj = projects.find((p) => p.id === ar.project_id) || null;
      const ds = datasets.find((d) => d.id === ar.dataset_id) || null;
      return {
        accessRequest: ar,
        datasetTitle: ds ? ds.title : null,
        projectTitle: proj ? proj.title : null
      };
    });

    return {
      pinnedDatasets: pinnedDatasets,
      activeProjects: activeProjects,
      expiringProjects: expiringProjects,
      recentQueries: recentQueries,
      recentExportJobs: recentExportJobs,
      recentAccessRequests: recentAccessRequests
    };
  }

  // -------------------- Dataset catalog interfaces --------------------

  // getDatasetFilterOptions()
  getDatasetFilterOptions() {
    const datasets = this._getFromStorage("datasets", []);

    const domainEnum = [
      { value: "infectious_disease", label: "Infectious Disease" },
      { value: "mental_health", label: "Mental Health" },
      { value: "diabetes", label: "Diabetes" },
      { value: "oncology", label: "Oncology" },
      { value: "cardiology", label: "Cardiology" },
      { value: "respiratory", label: "Respiratory" },
      { value: "genomics", label: "Genomics" },
      { value: "other", label: "Other" }
    ];

    const accessTypes = [
      { value: "open", label: "Open" },
      { value: "controlled", label: "Controlled" }
    ];

    // Derive countries from datasets
    const countryMap = {};
    for (let i = 0; i < datasets.length; i++) {
      const c = datasets[i].country;
      if (c && !countryMap[c]) {
        countryMap[c] = true;
      }
    }
    const countries = Object.keys(countryMap).map(function (name) {
      return { code: name, name: name };
    });

    const sortOptions = [
      { field: "title", label: "Title – A to Z", defaultOrder: "ascending" },
      { field: "sample_size", label: "Sample size", defaultOrder: "ascending" },
      { field: "collection_start_date", label: "Collection start date", defaultOrder: "ascending" },
      { field: "variable_count", label: "Number of variables", defaultOrder: "ascending" },
      { field: "created_at", label: "Recently added", defaultOrder: "descending" }
    ];

    return {
      domains: domainEnum,
      accessTypes: accessTypes,
      countries: countries,
      sortOptions: sortOptions
    };
  }

  // searchDatasets(query, filters, sortField, sortOrder, page, pageSize)
  searchDatasets(query, filters, sortField, sortOrder, page, pageSize) {
    const datasets = this._getFromStorage("datasets", []);
    const favorites = this._getFromStorage("favorite_datasets", []);
    const pins = this._getFromStorage("dashboard_pins", []);

    const filtered = this._applyDatasetSearchFilters(datasets, query, filters, sortField, sortOrder);

    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : 25;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const resultsSlice = filtered.slice(start, end).map((d) => {
      const isFavorited = favorites.some((f) => f.dataset_id === d.id);
      const isPinned = pins.some((p) => p.dataset_id === d.id);
      return {
        dataset: d,
        isFavorited: isFavorited,
        isPinned: isPinned
      };
    });

    return {
      results: resultsSlice,
      totalCount: filtered.length,
      page: pg,
      pageSize: ps
    };
  }

  // getDatasetDetails(datasetId)
  getDatasetDetails(datasetId) {
    const datasets = this._getFromStorage("datasets", []);
    const favorites = this._getFromStorage("favorite_datasets", []);
    const pins = this._getFromStorage("dashboard_pins", []);

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    const isFavorited = favorites.some((f) => f.dataset_id === datasetId);
    const isPinned = pins.some((p) => p.dataset_id === datasetId);

    return {
      dataset: dataset,
      isFavorited: isFavorited,
      isPinned: isPinned
    };
  }

  // getDatasetAccessFormConfig(datasetId)
  getDatasetAccessFormConfig(datasetId) {
    const datasets = this._getFromStorage("datasets", []);
    const projects = this._getFromStorage("projects", []);

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    const availableProjects = projects.filter((p) => p.status === "active");

    // Allowed durations in months (can be adjusted as needed)
    const allowedDurationsMonths = [3, 6, 12, 24];

    return {
      dataset: dataset,
      availableProjects: availableProjects,
      allowedDurationsMonths: allowedDurationsMonths
    };
  }

  // requestDatasetAccess(datasetId, projectSelectionMode, existingProjectId, newProject, accessDurationMonths, justification)
  requestDatasetAccess(
    datasetId,
    projectSelectionMode,
    existingProjectId,
    newProject,
    accessDurationMonths,
    justification
  ) {
    const datasets = this._getFromStorage("datasets", []);
    const projects = this._getFromStorage("projects", []);
    const accessRequests = this._getFromStorage("access_requests", []);

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return {
        success: false,
        message: "Dataset not found",
        accessRequest: null,
        project: null,
        createdNewProject: false
      };
    }

    let project = null;
    let createdNewProject = false;

    if (projectSelectionMode === "existing_project") {
      project = projects.find((p) => p.id === existingProjectId) || null;
      if (!project) {
        return {
          success: false,
          message: "Project not found",
          accessRequest: null,
          project: null,
          createdNewProject: false
        };
      }
    } else if (projectSelectionMode === "new_project") {
      if (!newProject || !newProject.title || !newProject.researchArea) {
        return {
          success: false,
          message: "Missing new project details",
          accessRequest: null,
          project: null,
          createdNewProject: false
        };
      }
      project = {
        id: this._generateId("project"),
        title: newProject.title,
        research_area: newProject.researchArea,
        description: newProject.description || "",
        status: "active",
        access_expiration_date: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      projects.push(project);
      this._saveToStorage("projects", projects);
      createdNewProject = true;
    } else {
      return {
        success: false,
        message: "Invalid projectSelectionMode",
        accessRequest: null,
        project: null,
        createdNewProject: false
      };
    }

    const accessRequest = {
      id: this._generateId("accessreq"),
      dataset_id: datasetId,
      project_id: project.id,
      access_duration_months: accessDurationMonths,
      status: "pending",
      justification: justification || "",
      requested_at: this._nowIso(),
      reviewed_at: null
    };

    accessRequests.push(accessRequest);
    this._saveToStorage("access_requests", accessRequests);

    return {
      success: true,
      message: "Access request submitted",
      accessRequest: accessRequest,
      project: project,
      createdNewProject: createdNewProject
    };
  }

  // -------------------- Favorites & dashboard pins --------------------

  // addDatasetToFavorites(datasetId)
  addDatasetToFavorites(datasetId) {
    const favorites = this._getFromStorage("favorite_datasets", []);

    if (favorites.some((f) => f.dataset_id === datasetId)) {
      return {
        success: true,
        favorite: favorites.find((f) => f.dataset_id === datasetId) || null,
        message: "Already in favorites"
      };
    }

    const fav = {
      id: this._generateId("fav"),
      dataset_id: datasetId,
      added_at: this._nowIso()
    };
    favorites.push(fav);
    this._saveToStorage("favorite_datasets", favorites);

    return {
      success: true,
      favorite: fav,
      message: "Added to favorites"
    };
  }

  // removeDatasetFromFavorites(datasetId)
  removeDatasetFromFavorites(datasetId) {
    const favorites = this._getFromStorage("favorite_datasets", []);
    const index = favorites.findIndex((f) => f.dataset_id === datasetId);
    if (index === -1) {
      return {
        success: true,
        removed: false,
        message: "Not in favorites"
      };
    }
    favorites.splice(index, 1);
    this._saveToStorage("favorite_datasets", favorites);
    return {
      success: true,
      removed: true,
      message: "Removed from favorites"
    };
  }

  // getFavoriteDatasets(filters)
  getFavoriteDatasets(filters) {
    const favorites = this._getFromStorage("favorite_datasets", []);
    const datasets = this._getFromStorage("datasets", []);
    const f = filters || {};

    const items = favorites.map((fav) => {
      const dataset = datasets.find((d) => d.id === fav.dataset_id) || null;
      return { favorite: fav, dataset: dataset };
    });

    const filtered = items.filter(function (item) {
      if (!item.dataset) return false;
      if (f.domain && item.dataset.domain !== f.domain) return false;
      if (f.accessType && item.dataset.access_type !== f.accessType) return false;
      return true;
    });

    return filtered;
  }

  // pinDatasetToDashboard(datasetId)
  pinDatasetToDashboard(datasetId) {
    const pins = this._getFromStorage("dashboard_pins", []);

    if (pins.some((p) => p.dataset_id === datasetId)) {
      return {
        success: true,
        pin: pins.find((p) => p.dataset_id === datasetId) || null,
        message: "Already pinned"
      };
    }

    const pin = {
      id: this._generateId("pin"),
      dataset_id: datasetId,
      pinned_at: this._nowIso()
    };
    pins.push(pin);
    this._saveToStorage("dashboard_pins", pins);

    return {
      success: true,
      pin: pin,
      message: "Pinned to dashboard"
    };
  }

  // unpinDatasetFromDashboard(datasetId)
  unpinDatasetFromDashboard(datasetId) {
    const pins = this._getFromStorage("dashboard_pins", []);
    const index = pins.findIndex((p) => p.dataset_id === datasetId);
    if (index === -1) {
      return {
        success: true,
        message: "Not pinned"
      };
    }
    pins.splice(index, 1);
    this._saveToStorage("dashboard_pins", pins);
    return {
      success: true,
      message: "Unpinned from dashboard"
    };
  }

  // -------------------- Project interfaces --------------------

  // listProjects(searchTerm, statusFilter, sortField, sortOrder)
  listProjects(searchTerm, statusFilter, sortField, sortOrder) {
    const projects = this._getFromStorage("projects", []);
    const term = searchTerm && typeof searchTerm === "string" ? searchTerm.trim().toLowerCase() : "";
    const status = statusFilter || null;

    let items = projects.slice();

    if (term) {
      items = items.filter((p) => (p.title || "").toLowerCase().indexOf(term) !== -1);
    }

    if (status) {
      if (status === "active_expiring_30_days") {
        const flags = this._calculateProjectExpirationFlags(items);
        const ids = flags
          .filter((f) => f.project.status === "active" && f.daysUntilExpiration >= 0 && f.daysUntilExpiration <= 30)
          .map((f) => f.project.id);
        items = items.filter((p) => ids.indexOf(p.id) !== -1);
      } else {
        items = items.filter((p) => p.status === status);
      }
    }

    const field = sortField || "created_at";
    const order = sortOrder === "descending" ? "descending" : "ascending";

    items.sort(function (a, b) {
      let av = a[field];
      let bv = b[field];

      // Date fields
      if (field === "access_expiration_date" || field === "created_at") {
        const at = av ? Date.parse(av) : 0;
        const bt = bv ? Date.parse(bv) : 0;
        if (at < bt) return order === "ascending" ? -1 : 1;
        if (at > bt) return order === "ascending" ? 1 : -1;
        return 0;
      }

      av = typeof av === "undefined" || av === null ? "" : String(av).toLowerCase();
      bv = typeof bv === "undefined" || bv === null ? "" : String(bv).toLowerCase();
      if (av < bv) return order === "ascending" ? -1 : 1;
      if (av > bv) return order === "ascending" ? 1 : -1;
      return 0;
    });

    return items;
  }

  // createProject(title, researchArea, description)
  createProject(title, researchArea, description) {
    const projects = this._getFromStorage("projects", []);
    const now = this._nowIso();
    const project = {
      id: this._generateId("project"),
      title: title,
      research_area: researchArea,
      description: description || "",
      status: "active",
      access_expiration_date: null,
      created_at: now,
      updated_at: now
    };
    projects.push(project);
    this._saveToStorage("projects", projects);
    return project;
  }

  // getProjectDetailView(projectId)
  getProjectDetailView(projectId) {
    const projects = this._getFromStorage("projects", []);
    const collaborators = this._getFromStorage("collaborators", []);
    const approvedDatasets = this._getFromStorage("approved_datasets", []);
    const accessExtensions = this._getFromStorage("access_extension_requests", []);
    const agreements = this._getFromStorage("agreements", []);
    const datasets = this._getFromStorage("datasets", []);

    const project = projects.find((p) => p.id === projectId) || null;

    const projectCollaborators = collaborators
      .filter((c) => c.project_id === projectId)
      .map((c) => ({
        id: c.id,
        project_id: c.project_id,
        username: c.username,
        display_name: c.display_name,
        role: c.role,
        can_view_exports: c.can_view_exports,
        can_edit_exports: c.can_edit_exports,
        created_at: c.created_at,
        project: project
      }));

    const projectApprovedDatasets = approvedDatasets
      .filter((ad) => ad.project_id === projectId)
      .map((ad) => {
        const dataset = datasets.find((d) => d.id === ad.dataset_id) || null;
        return {
          approvedDataset: ad,
          dataset: dataset
        };
      });

    const projectAccessExtensions = accessExtensions.filter((ae) => ae.project_id === projectId);

    const linkedAgreements = agreements.filter((a) => a.linked_project_id === projectId);

    return {
      project: project,
      collaborators: projectCollaborators,
      approvedDatasets: projectApprovedDatasets,
      accessExtensions: projectAccessExtensions,
      linkedAgreements: linkedAgreements
    };
  }

  // requestProjectAccessExtension(projectId, extensionDurationMonths, justification)
  requestProjectAccessExtension(projectId, extensionDurationMonths, justification) {
    const projects = this._getFromStorage("projects", []);
    const project = projects.find((p) => p.id === projectId) || null;

    if (!project) {
      return {
        success: false,
        extensionRequest: null,
        message: "Project not found"
      };
    }

    const accessExtensions = this._getFromStorage("access_extension_requests", []);
    const ext = {
      id: this._generateId("extreq"),
      project_id: projectId,
      extension_duration_months: extensionDurationMonths,
      justification: justification,
      status: "pending",
      requested_at: this._nowIso(),
      reviewed_at: null
    };

    accessExtensions.push(ext);
    this._saveToStorage("access_extension_requests", accessExtensions);

    return {
      success: true,
      extensionRequest: ext,
      message: "Extension request submitted"
    };
  }

  // getProjectCollaborators(projectId)
  getProjectCollaborators(projectId) {
    const collaborators = this._getFromStorage("collaborators", []);
    const projects = this._getFromStorage("projects", []);
    const project = projects.find((p) => p.id === projectId) || null;

    return collaborators
      .filter((c) => c.project_id === projectId)
      .map((c) => ({
        id: c.id,
        project_id: c.project_id,
        username: c.username,
        display_name: c.display_name,
        role: c.role,
        can_view_exports: c.can_view_exports,
        can_edit_exports: c.can_edit_exports,
        created_at: c.created_at,
        project: project
      }));
  }

  // addProjectCollaborator(projectId, username, role, canViewExports, canEditExports)
  addProjectCollaborator(projectId, username, role, canViewExports, canEditExports) {
    const collaborators = this._getFromStorage("collaborators", []);
    const projects = this._getFromStorage("projects", []);
    const project = projects.find((p) => p.id === projectId) || null;

    if (!project) {
      return {
        success: false,
        collaborator: null,
        message: "Project not found"
      };
    }

    const collab = {
      id: this._generateId("collab"),
      project_id: projectId,
      username: username,
      display_name: username,
      role: role,
      can_view_exports: !!canViewExports,
      can_edit_exports: !!canEditExports,
      created_at: this._nowIso()
    };

    collaborators.push(collab);
    this._saveToStorage("collaborators", collaborators);

    return {
      success: true,
      collaborator: collab,
      message: "Collaborator added"
    };
  }

  // updateProjectCollaborator(collaboratorId, role, canViewExports, canEditExports)
  updateProjectCollaborator(collaboratorId, role, canViewExports, canEditExports) {
    const collaborators = this._getFromStorage("collaborators", []);
    const collab = collaborators.find((c) => c.id === collaboratorId) || null;
    if (!collab) {
      return {
        success: false,
        collaborator: null,
        message: "Collaborator not found"
      };
    }

    if (typeof role !== "undefined" && role !== null) {
      collab.role = role;
    }
    if (typeof canViewExports !== "undefined") {
      collab.can_view_exports = !!canViewExports;
    }
    if (typeof canEditExports !== "undefined") {
      collab.can_edit_exports = !!canEditExports;
    }

    this._saveToStorage("collaborators", collaborators);

    return {
      success: true,
      collaborator: collab,
      message: "Collaborator updated"
    };
  }

  // removeProjectCollaborator(collaboratorId)
  removeProjectCollaborator(collaboratorId) {
    const collaborators = this._getFromStorage("collaborators", []);
    const index = collaborators.findIndex((c) => c.id === collaboratorId);
    if (index === -1) {
      return {
        success: false,
        message: "Collaborator not found"
      };
    }
    collaborators.splice(index, 1);
    this._saveToStorage("collaborators", collaborators);
    return {
      success: true,
      message: "Collaborator removed"
    };
  }

  // getProjectApprovedDatasets(projectId)
  getProjectApprovedDatasets(projectId) {
    const approvedDatasets = this._getFromStorage("approved_datasets", []);
    const datasets = this._getFromStorage("datasets", []);

    return approvedDatasets
      .filter((ad) => ad.project_id === projectId)
      .map((ad) => {
        const dataset = datasets.find((d) => d.id === ad.dataset_id) || null;
        return {
          approvedDataset: ad,
          dataset: dataset
        };
      });
  }

  // -------------------- Workspace & Query interfaces --------------------

  // listWorkspaces(searchTerm, researchArea)
  listWorkspaces(searchTerm, researchArea) {
    const workspaces = this._getFromStorage("workspaces", []);
    const projects = this._getFromStorage("projects", []);

    const term = searchTerm && typeof searchTerm === "string" ? searchTerm.trim().toLowerCase() : "";
    const area = researchArea || null;

    let items = workspaces.slice();

    if (term) {
      items = items.filter((w) => (w.name || "").toLowerCase().indexOf(term) !== -1);
    }

    if (area) {
      items = items.filter((w) => w.research_area === area);
    }

    // Resolve associated project
    return items.map((w) => {
      const proj = w.associated_project_id
        ? projects.find((p) => p.id === w.associated_project_id) || null
        : null;
      return Object.assign({}, w, { associatedProject: proj });
    });
  }

  // createWorkspace(name, researchArea, associatedProjectId)
  createWorkspace(name, researchArea, associatedProjectId) {
    const workspaces = this._getFromStorage("workspaces", []);
    const now = this._nowIso();

    const ws = {
      id: this._generateId("workspace"),
      name: name,
      research_area: researchArea,
      associated_project_id: associatedProjectId || null,
      created_at: now,
      updated_at: now
    };

    workspaces.push(ws);
    this._saveToStorage("workspaces", workspaces);

    return ws;
  }

  // getWorkspaceDetails(workspaceId)
  getWorkspaceDetails(workspaceId) {
    const workspaces = this._getFromStorage("workspaces", []);
    const queries = this._getFromStorage("queries", []);
    const datasets = this._getFromStorage("datasets", []);

    const workspace = workspaces.find((w) => w.id === workspaceId) || null;

    const wsQueries = queries
      .filter((q) => q.workspace_id === workspaceId)
      .map((q) => {
        const dataset = datasets.find((d) => d.id === q.dataset_id) || null;
        return Object.assign({}, q, { dataset: dataset, workspace: workspace });
      });

    return {
      workspace: workspace,
      queries: wsQueries
    };
  }

  // getQueryDetails(queryId)
  getQueryDetails(queryId) {
    const queries = this._getFromStorage("queries", []);
    const workspaces = this._getFromStorage("workspaces", []);
    const datasets = this._getFromStorage("datasets", []);

    const q = queries.find((qq) => qq.id === queryId) || null;
    if (!q) return null;

    const ws = workspaces.find((w) => w.id === q.workspace_id) || null;
    const ds = datasets.find((d) => d.id === q.dataset_id) || null;

    return Object.assign({}, q, { workspace: ws, dataset: ds });
  }

  // getQueryBuilderDatasets(workspaceId, searchTerm)
  getQueryBuilderDatasets(workspaceId, searchTerm) {
    const workspaces = this._getFromStorage("workspaces", []);
    const datasets = this._getFromStorage("datasets", []);
    const approved = this._getFromStorage("approved_datasets", []);

    const ws = workspaces.find((w) => w.id === workspaceId) || null;
    let candidates = [];

    if (ws && ws.associated_project_id) {
      // Only datasets approved for this project
      const approvedForProject = approved.filter(
        (ad) => ad.project_id === ws.associated_project_id && ad.approval_status === "approved"
      );
      const datasetIds = approvedForProject.map((ad) => ad.dataset_id);
      candidates = datasets.filter((d) => datasetIds.indexOf(d.id) !== -1);
    } else {
      // All datasets available
      candidates = datasets.slice();
    }

    const term = searchTerm && typeof searchTerm === "string" ? searchTerm.trim().toLowerCase() : "";
    if (term) {
      candidates = candidates.filter((d) => (d.title || "").toLowerCase().indexOf(term) !== -1);
    }

    return candidates;
  }

  // saveQueryFromBuilder(workspaceId, queryName, datasetId, inclusionConditions, minAge, maxAge, country, requireLabResults, labTestType, minLabResultCount, description)
  saveQueryFromBuilder(
    workspaceId,
    queryName,
    datasetId,
    inclusionConditions,
    minAge,
    maxAge,
    country,
    requireLabResults,
    labTestType,
    minLabResultCount,
    description
  ) {
    const queries = this._getFromStorage("queries", []);
    const now = this._nowIso();

    let query = queries.find((q) => q.workspace_id === workspaceId && q.name === queryName) || null;

    if (!query) {
      query = {
        id: this._generateId("query"),
        name: queryName,
        workspace_id: workspaceId,
        dataset_id: datasetId,
        description: description || "",
        inclusion_conditions: Array.isArray(inclusionConditions) ? inclusionConditions : [],
        min_age: typeof minAge === "number" ? minAge : null,
        max_age: typeof maxAge === "number" ? maxAge : null,
        country: country || null,
        require_lab_results: !!requireLabResults,
        lab_test_type: labTestType || null,
        min_lab_result_count: typeof minLabResultCount === "number" ? minLabResultCount : null,
        status: "saved",
        last_run_count: null,
        created_at: now,
        updated_at: now
      };
      queries.push(query);
    } else {
      query.dataset_id = datasetId;
      query.description = description || query.description || "";
      query.inclusion_conditions = Array.isArray(inclusionConditions)
        ? inclusionConditions
        : query.inclusion_conditions || [];
      query.min_age = typeof minAge === "number" ? minAge : query.min_age;
      query.max_age = typeof maxAge === "number" ? maxAge : query.max_age;
      query.country = typeof country !== "undefined" ? country : query.country;
      query.require_lab_results = typeof requireLabResults !== "undefined"
        ? !!requireLabResults
        : query.require_lab_results;
      query.lab_test_type = typeof labTestType !== "undefined" ? labTestType : query.lab_test_type;
      query.min_lab_result_count = typeof minLabResultCount === "number"
        ? minLabResultCount
        : query.min_lab_result_count;
      query.status = "saved";
      query.updated_at = now;
    }

    this._saveToStorage("queries", queries);
    return query;
  }

  // previewQueryCohort(queryId)
  previewQueryCohort(queryId) {
    const queries = this._getFromStorage("queries", []);
    const q = queries.find((qq) => qq.id === queryId) || null;
    if (!q) {
      return {
        estimatedCount: 0,
        lastRunAt: null,
        query: null
      };
    }

    const now = this._nowIso();
    // Without row-level data, we cannot compute actual counts; reuse last_run_count or 0.
    const estimatedCount = typeof q.last_run_count === "number" ? q.last_run_count : 0;

    q.status = "executed";
    q.updated_at = now;
    this._saveToStorage("queries", queries);

    return {
      estimatedCount: estimatedCount,
      lastRunAt: now,
      query: q
    };
  }

  // -------------------- Agreement & DUA interfaces --------------------

  // listAgreementTemplates(searchTerm)
  listAgreementTemplates(searchTerm) {
    const templates = this._getFromStorage("agreement_templates", []);
    const term = searchTerm && typeof searchTerm === "string" ? searchTerm.trim().toLowerCase() : "";
    if (!term) return templates;
    return templates.filter((t) => (t.name || "").toLowerCase().indexOf(term) !== -1);
  }

  // listAgreements(searchTerm, status)
  listAgreements(searchTerm, status) {
    const agreements = this._getFromStorage("agreements", []);
    const templates = this._getFromStorage("agreement_templates", []);
    const projects = this._getFromStorage("projects", []);

    const term = searchTerm && typeof searchTerm === "string" ? searchTerm.trim().toLowerCase() : "";
    const stat = status || null;

    let items = agreements.slice();

    if (term) {
      items = items.filter((a) => (a.title || "").toLowerCase().indexOf(term) !== -1);
    }

    if (stat) {
      items = items.filter((a) => a.status === stat);
    }

    return items.map((a) => {
      const template = a.source_template_id
        ? templates.find((t) => t.id === a.source_template_id) || null
        : null;
      const project = a.linked_project_id
        ? projects.find((p) => p.id === a.linked_project_id) || null
        : null;
      return Object.assign({}, a, {
        sourceTemplate: template,
        linkedProject: project
      });
    });
  }

  // getAgreementTemplateDetails(templateId)
  getAgreementTemplateDetails(templateId) {
    const templates = this._getFromStorage("agreement_templates", []);
    return templates.find((t) => t.id === templateId) || null;
  }

  // getAgreementDetails(agreementId)
  getAgreementDetails(agreementId) {
    const agreements = this._getFromStorage("agreements", []);
    const templates = this._getFromStorage("agreement_templates", []);
    const projects = this._getFromStorage("projects", []);

    const a = agreements.find((ag) => ag.id === agreementId) || null;
    if (!a) return null;

    const template = a.source_template_id
      ? templates.find((t) => t.id === a.source_template_id) || null
      : null;
    const project = a.linked_project_id
      ? projects.find((p) => p.id === a.linked_project_id) || null
      : null;

    return Object.assign({}, a, { sourceTemplate: template, linkedProject: project });
  }

  // createAgreementFromTemplate(templateId, title, dataRetentionPeriodMonths, linkedProjectId, description)
  createAgreementFromTemplate(templateId, title, dataRetentionPeriodMonths, linkedProjectId, description) {
    const templates = this._getFromStorage("agreement_templates", []);
    const agreements = this._getFromStorage("agreements", []);

    const template = templates.find((t) => t.id === templateId) || null;
    if (!template) {
      return null;
    }

    const now = this._nowIso();

    const agreement = {
      id: this._generateId("agreement"),
      title: title,
      description: description || "",
      status: "draft",
      data_retention_period_months: dataRetentionPeriodMonths,
      linked_project_id: linkedProjectId || null,
      source_template_id: templateId,
      created_at: now,
      activated_at: null
    };

    agreements.push(agreement);
    this._saveToStorage("agreements", agreements);

    return agreement;
  }

  // updateAgreement(agreementId, title, description, dataRetentionPeriodMonths, linkedProjectId)
  updateAgreement(agreementId, title, description, dataRetentionPeriodMonths, linkedProjectId) {
    const agreements = this._getFromStorage("agreements", []);
    const agreement = agreements.find((a) => a.id === agreementId) || null;
    if (!agreement) {
      return {
        success: false,
        agreement: null,
        message: "Agreement not found"
      };
    }

    if (typeof title !== "undefined" && title !== null) {
      agreement.title = title;
    }
    if (typeof description !== "undefined") {
      agreement.description = description;
    }
    if (typeof dataRetentionPeriodMonths === "number") {
      agreement.data_retention_period_months = dataRetentionPeriodMonths;
    }
    if (typeof linkedProjectId !== "undefined") {
      agreement.linked_project_id = linkedProjectId;
    }

    this._saveToStorage("agreements", agreements);

    return {
      success: true,
      agreement: agreement,
      message: "Agreement updated"
    };
  }

  // setAgreementStatus(agreementId, status)
  setAgreementStatus(agreementId, status) {
    const agreements = this._getFromStorage("agreements", []);
    const agreement = agreements.find((a) => a.id === agreementId) || null;
    if (!agreement) {
      return {
        success: false,
        agreement: null,
        message: "Agreement not found"
      };
    }

    agreement.status = status;
    if (status === "active") {
      agreement.activated_at = this._nowIso();
    }

    this._saveToStorage("agreements", agreements);

    return {
      success: true,
      agreement: agreement,
      message: "Agreement status updated"
    };
  }

  // -------------------- Dataset-in-Project & Export interfaces --------------------

  // getDatasetInProjectView(projectId, datasetId)
  getDatasetInProjectView(projectId, datasetId) {
    const projects = this._getFromStorage("projects", []);
    const datasets = this._getFromStorage("datasets", []);
    const approvedDatasets = this._getFromStorage("approved_datasets", []);
    const exportJobs = this._getFromStorage("export_jobs", []);
    const accessRequests = this._getFromStorage("access_requests", []);

    const project = projects.find((p) => p.id === projectId) || null;
    const dataset = datasets.find((d) => d.id === datasetId) || null;

    const approvedDataset = approvedDatasets.find(
      (ad) => ad.project_id === projectId && ad.dataset_id === datasetId
    ) || null;

    let approvedDatasetResolved = null;
    if (approvedDataset) {
      const createdViaRequest = approvedDataset.created_via_request_id
        ? accessRequests.find((ar) => ar.id === approvedDataset.created_via_request_id) || null
        : null;
      approvedDatasetResolved = Object.assign({}, approvedDataset, {
        project: project,
        dataset: dataset,
        createdViaRequest: createdViaRequest
      });
    }

    const jobs = exportJobs
      .filter((ej) => ej.project_id === projectId && ej.dataset_id === datasetId)
      .map((ej) => ({
        id: ej.id,
        project_id: ej.project_id,
        dataset_id: ej.dataset_id,
        record_limit: ej.record_limit,
        sort_field: ej.sort_field,
        sort_order: ej.sort_order,
        schedule_frequency: ej.schedule_frequency,
        schedule_day_of_week: ej.schedule_day_of_week,
        is_active: ej.is_active,
        created_at: ej.created_at,
        updated_at: ej.updated_at,
        project: project,
        dataset: dataset
      }));

    return {
      project: project,
      dataset: dataset,
      approvedDataset: approvedDatasetResolved,
      exportJobs: jobs
    };
  }

  // createExportJobForDataset(projectId, datasetId, recordLimit, sortField, sortOrder, scheduleFrequency, scheduleDayOfWeek, isActive)
  createExportJobForDataset(
    projectId,
    datasetId,
    recordLimit,
    sortField,
    sortOrder,
    scheduleFrequency,
    scheduleDayOfWeek,
    isActive
  ) {
    const exportJobs = this._getFromStorage("export_jobs", []);
    const projects = this._getFromStorage("projects", []);
    const datasets = this._getFromStorage("datasets", []);

    const project = projects.find((p) => p.id === projectId) || null;
    const dataset = datasets.find((d) => d.id === datasetId) || null;

    if (!project || !dataset) {
      return {
        success: false,
        exportJob: null,
        message: "Project or dataset not found"
      };
    }

    const now = this._nowIso();

    const job = {
      id: this._generateId("export"),
      project_id: projectId,
      dataset_id: datasetId,
      record_limit: typeof recordLimit === "number" ? recordLimit : null,
      sort_field: sortField || null,
      sort_order: sortOrder || null,
      schedule_frequency: scheduleFrequency,
      schedule_day_of_week: scheduleDayOfWeek || null,
      is_active: typeof isActive === "boolean" ? isActive : true,
      created_at: now,
      updated_at: now
    };

    exportJobs.push(job);
    this._saveToStorage("export_jobs", exportJobs);

    return {
      success: true,
      exportJob: job,
      message: "Export job created"
    };
  }

  // updateExportJob(exportJobId, recordLimit, sortField, sortOrder, scheduleFrequency, scheduleDayOfWeek, isActive)
  updateExportJob(
    exportJobId,
    recordLimit,
    sortField,
    sortOrder,
    scheduleFrequency,
    scheduleDayOfWeek,
    isActive
  ) {
    const exportJobs = this._getFromStorage("export_jobs", []);
    const job = exportJobs.find((ej) => ej.id === exportJobId) || null;
    if (!job) {
      return {
        success: false,
        exportJob: null,
        message: "Export job not found"
      };
    }

    if (typeof recordLimit === "number") job.record_limit = recordLimit;
    if (typeof sortField !== "undefined") job.sort_field = sortField;
    if (typeof sortOrder !== "undefined") job.sort_order = sortOrder;
    if (typeof scheduleFrequency !== "undefined") job.schedule_frequency = scheduleFrequency;
    if (typeof scheduleDayOfWeek !== "undefined") job.schedule_day_of_week = scheduleDayOfWeek;
    if (typeof isActive === "boolean") job.is_active = isActive;

    job.updated_at = this._nowIso();
    this._saveToStorage("export_jobs", exportJobs);

    return {
      success: true,
      exportJob: job,
      message: "Export job updated"
    };
  }

  // deactivateExportJob(exportJobId)
  deactivateExportJob(exportJobId) {
    const exportJobs = this._getFromStorage("export_jobs", []);
    const job = exportJobs.find((ej) => ej.id === exportJobId) || null;
    if (!job) {
      return {
        success: false,
        exportJob: null,
        message: "Export job not found"
      };
    }

    job.is_active = false;
    job.updated_at = this._nowIso();
    this._saveToStorage("export_jobs", exportJobs);

    return {
      success: true,
      exportJob: job,
      message: "Export job deactivated"
    };
  }

  // -------------------- Content interfaces --------------------

  // getAboutContent()
  getAboutContent() {
    return this._getFromStorage("about_content", {
      title: "",
      mission: "",
      scope: "",
      governance: "",
      securityPrinciples: "",
      contactInfo: {
        email: "",
        phone: "",
        organization: ""
      }
    });
  }

  // getHelpContent()
  getHelpContent() {
    return this._getFromStorage("help_content", {
      faqs: [],
      taskGuides: [],
      troubleshootingTips: [],
      supportContacts: []
    });
  }

  // getPoliciesContent()
  getPoliciesContent() {
    return this._getFromStorage("policies_content", {
      privacyPolicyHtml: "",
      termsOfUseHtml: "",
      dataGovernancePolicyHtml: ""
    });
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
