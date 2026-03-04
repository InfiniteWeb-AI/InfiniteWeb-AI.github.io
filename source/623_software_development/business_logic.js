// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
    this.COMPARISON_MAX_ITEMS = 4;
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Initialization / Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize array-based entity tables if they don't exist
    const collectionKeys = [
      "case_studies",
      "pricing_plans",
      "plan_inquiries",
      "blog_posts",
      "newsletter_subscriptions",
      "team_members",
      "consultation_requests",
      "services",
      "workshop_templates",
      "workshop_requests",
      "estimate_requests",
      "similar_project_requests",
      "proposal_requests"
    ];

    collectionKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton-like entities
    if (localStorage.getItem("favorites") === null) {
      // store JSON null; _getOrCreateFavorites will create actual object when needed
      localStorage.setItem("favorites", "null");
    }

    if (localStorage.getItem("comparison_sets") === null) {
      localStorage.setItem("comparison_sets", "null");
    }

    // RFP selection state (simple helper structure)
    if (localStorage.getItem("rfp_selection_state") === null) {
      localStorage.setItem(
        "rfp_selection_state",
        JSON.stringify({ selectedServiceIds: [] })
      );
    }

    if (localStorage.getItem("idCounter") === null) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      if (parsed === null || parsed === undefined) return defaultValue;
      return parsed;
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = isNaN(current) ? 1001 : current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  // ----------------------
  // Enum / mapping helpers
  // ----------------------

  _getBudgetRangeLabel(value) {
    const map = {
      under_50_000: "Under $50,000",
      "50_000_100_000": "$50,000–$100,000",
      "80_000_plus": "Over $80,000",
      "100_000_150_000": "$100,000–$150,000",
      "150_000_plus": "Over $150,000"
    };
    return map[value] || value;
  }

  _getBudgetRangeLimits(value) {
    // Returns {min, max} where max can be Infinity
    const map = {
      under_50_000: { min: 0, max: 50000 },
      "50_000_100_000": { min: 50000, max: 100000 },
      "80_000_plus": { min: 80000, max: Infinity },
      "100_000_150_000": { min: 100000, max: 150000 },
      "150_000_plus": { min: 150000, max: Infinity }
    };
    return map[value] || null;
  }

  _getBudgetSortValue(caseStudy) {
    if (!caseStudy) return 0;
    const min = typeof caseStudy.budgetMin === "number" ? caseStudy.budgetMin : null;
    const max = typeof caseStudy.budgetMax === "number" ? caseStudy.budgetMax : null;
    if (min !== null && max !== null) return (min + max) / 2;
    if (min !== null) return min;
    if (max !== null) return max;
    if (caseStudy.budgetRange) {
      const limits = this._getBudgetRangeLimits(caseStudy.budgetRange);
      if (limits) return limits.min;
    }
    return 0;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Private entity helpers
  // ----------------------

  _getOrCreateFavorites() {
    let favoritesRaw = localStorage.getItem("favorites");
    let favorites = null;
    if (favoritesRaw) {
      try {
        favorites = JSON.parse(favoritesRaw);
      } catch (e) {
        favorites = null;
      }
    }
    if (!favorites || typeof favorites !== "object") {
      favorites = {
        id: this._generateId("favorites"),
        caseStudyIds: [],
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem("favorites", JSON.stringify(favorites));
    }
    if (!Array.isArray(favorites.caseStudyIds)) {
      favorites.caseStudyIds = [];
    }
    return favorites;
  }

  _getOrCreateComparisonSet() {
    let raw = localStorage.getItem("comparison_sets");
    let comparisonSet = null;
    if (raw) {
      try {
        comparisonSet = JSON.parse(raw);
      } catch (e) {
        comparisonSet = null;
      }
    }
    if (!comparisonSet || typeof comparisonSet !== "object") {
      comparisonSet = {
        id: this._generateId("comparison"),
        caseStudyIds: [],
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem("comparison_sets", JSON.stringify(comparisonSet));
    }
    if (!Array.isArray(comparisonSet.caseStudyIds)) {
      comparisonSet.caseStudyIds = [];
    }
    return comparisonSet;
  }

  _getRfpSelectionState() {
    let state = this._getFromStorage("rfp_selection_state", null);
    if (!state || typeof state !== "object") {
      state = { selectedServiceIds: [] };
      this._saveToStorage("rfp_selection_state", state);
    }
    if (!Array.isArray(state.selectedServiceIds)) {
      state.selectedServiceIds = [];
      this._saveToStorage("rfp_selection_state", state);
    }
    return state;
  }

  // Persist helpers

  _persistEstimateRequest(estimateRequest) {
    const items = this._getFromStorage("estimate_requests", []);
    items.push(estimateRequest);
    this._saveToStorage("estimate_requests", items);
  }

  _persistPlanInquiry(planInquiry) {
    const items = this._getFromStorage("plan_inquiries", []);
    items.push(planInquiry);
    this._saveToStorage("plan_inquiries", items);
  }

  _persistNewsletterSubscription(subscription) {
    const items = this._getFromStorage("newsletter_subscriptions", []);
    items.push(subscription);
    this._saveToStorage("newsletter_subscriptions", items);
  }

  _persistConsultationRequest(request) {
    const items = this._getFromStorage("consultation_requests", []);
    items.push(request);
    this._saveToStorage("consultation_requests", items);
  }

  _persistWorkshopRequest(request) {
    const items = this._getFromStorage("workshop_requests", []);
    items.push(request);
    this._saveToStorage("workshop_requests", items);
  }

  _persistSimilarProjectRequest(request) {
    const items = this._getFromStorage("similar_project_requests", []);
    items.push(request);
    this._saveToStorage("similar_project_requests", items);
  }

  _persistProposalRequest(request) {
    const items = this._getFromStorage("proposal_requests", []);
    items.push(request);
    this._saveToStorage("proposal_requests", items);
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomepageContent
  getHomepageContent() {
    const services = this._getFromStorage("services", []);
    const caseStudies = this._getFromStorage("case_studies", []);

    const featuredServices = services.filter((s) => s.isActive !== false);
    const featuredCaseStudies = caseStudies.filter((cs) => cs.isFeatured === true);

    return {
      hero: {
        headline: "Product teams hire us to ship dependable software",
        subheadline:
          "We design, build, and scale web & mobile products for fintech, e‑commerce, and B2B SaaS.",
        primaryCtaLabel: "Get a project estimate",
        primaryCtaType: "open_estimator",
        secondaryCtaLabel: "View portfolio",
        secondaryCtaType: "view_portfolio"
      },
      featuredServices,
      featuredCaseStudies,
      // No mocked differentiator metrics; return empty by default
      differentiators: []
    };
  }

  // getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    const caseStudies = this._getFromStorage("case_studies", []);

    const industries = [
      { value: "fintech", label: "Fintech" },
      { value: "e_commerce", label: "E‑commerce" },
      { value: "retail", label: "Retail" },
      { value: "healthcare", label: "Healthcare" },
      { value: "education", label: "Education" },
      { value: "other", label: "Other" }
    ];

    const platforms = [
      { value: "mobile_app", label: "Mobile app" },
      { value: "web_app_development", label: "Web app development" },
      { value: "cloud_native_platform", label: "Cloud‑native platform" },
      { value: "website", label: "Website" },
      { value: "api_development", label: "API development" },
      { value: "other", label: "Other" }
    ];

    // Technologies: derive unique tags from stored case studies
    const techSet = new Set();
    caseStudies.forEach((cs) => {
      if (Array.isArray(cs.technologies)) {
        cs.technologies.forEach((t) => {
          if (typeof t === "string" && t.trim()) techSet.add(t);
        });
      }
    });
    const technologies = Array.from(techSet).map((t) => ({ value: t, label: t }));

    const budgetRanges = [
      {
        value: "under_50_000",
        label: this._getBudgetRangeLabel("under_50_000"),
        min: 0,
        max: 50000
      },
      {
        value: "50_000_100_000",
        label: this._getBudgetRangeLabel("50_000_100_000"),
        min: 50000,
        max: 100000
      },
      {
        value: "80_000_plus",
        label: this._getBudgetRangeLabel("80_000_plus"),
        min: 80000,
        max: null
      },
      {
        value: "100_000_150_000",
        label: this._getBudgetRangeLabel("100_000_150_000"),
        min: 100000,
        max: 150000
      },
      {
        value: "150_000_plus",
        label: this._getBudgetRangeLabel("150_000_plus"),
        min: 150000,
        max: null
      }
    ];

    const teamSizes = [
      { value: "1_3", label: "1–3" },
      { value: "4_5", label: "4–5" },
      { value: "6_10", label: "6–10" },
      { value: "10_plus", label: "10+" }
    ];

    // Launch years derived from caseStudies.launchDate
    const yearSet = new Set();
    caseStudies.forEach((cs) => {
      const d = this._parseDate(cs.launchDate);
      if (d) yearSet.add(d.getUTCFullYear());
    });
    const launchYears = Array.from(yearSet)
      .sort((a, b) => a - b)
      .map((y) => ({ year: y }));

    const sortOptions = [
      { value: "launch_date_desc", label: "Launch date – Newest first" },
      { value: "budget_desc", label: "Budget – High to Low" },
      { value: "conversion_uplift_desc", label: "Conversion uplift – High to Low" },
      { value: "impact_desc", label: "Impact – High to Low" }
    ];

    return {
      industries,
      platforms,
      technologies,
      budgetRanges,
      teamSizes,
      launchYears,
      sortOptions
    };
  }

  // searchCaseStudies(filters, sortBy, page, pageSize)
  searchCaseStudies(filters = {}, sortBy = "launch_date_desc", page = 1, pageSize = 20) {
    const caseStudies = this._getFromStorage("case_studies", []);
    const favorites = this._getOrCreateFavorites();
    const comparisonSet = this._getOrCreateComparisonSet();

    const favIds = new Set(favorites.caseStudyIds || []);
    const cmpIds = new Set(comparisonSet.caseStudyIds || []);

    let results = caseStudies.filter((cs) => {
      if (!cs) return false;

      if (filters.industry && cs.industry !== filters.industry) return false;
      if (filters.platform && cs.platform !== filters.platform) return false;

      if (Array.isArray(filters.serviceKeys) && filters.serviceKeys.length) {
        if (!Array.isArray(cs.serviceKeys)) return false;
        const hasAll = filters.serviceKeys.every((sk) => cs.serviceKeys.includes(sk));
        if (!hasAll) return false;
      }

      if (Array.isArray(filters.technologies) && filters.technologies.length) {
        if (!Array.isArray(cs.technologies)) return false;
        const hasAllTech = filters.technologies.every((t) => cs.technologies.includes(t));
        if (!hasAllTech) return false;
      }

      if (filters.budgetRange && cs.budgetRange !== filters.budgetRange) return false;

      if (typeof filters.minBudget === "number") {
        let passes = false;
        const limits = cs.budgetRange ? this._getBudgetRangeLimits(cs.budgetRange) : null;
        const numericMin = typeof cs.budgetMin === "number" ? cs.budgetMin : limits ? limits.min : null;
        const numericMax = typeof cs.budgetMax === "number" ? cs.budgetMax : limits ? limits.max : null;
        if (numericMax !== null && numericMax >= filters.minBudget) passes = true;
        if (numericMin !== null && numericMin >= filters.minBudget) passes = true;
        if (!passes) return false;
      }

      if (filters.teamSizeRange && cs.teamSizeRange !== filters.teamSizeRange) return false;

      if (typeof filters.minLaunchYear === "number") {
        const d = this._parseDate(cs.launchDate);
        if (!d || d.getUTCFullYear() < filters.minLaunchYear) return false;
      }

      if (typeof filters.maxLaunchYear === "number") {
        const d = this._parseDate(cs.launchDate);
        if (!d || d.getUTCFullYear() > filters.maxLaunchYear) return false;
      }

      if (filters.searchQuery && typeof filters.searchQuery === "string") {
        const q = filters.searchQuery.toLowerCase();
        const haystack = [cs.title, cs.clientName, cs.summary]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // Sorting
    const sortKey = sortBy || "launch_date_desc";
    results.sort((a, b) => {
      if (sortKey === "launch_date_desc") {
        const da = this._parseDate(a.launchDate);
        const db = this._parseDate(b.launchDate);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      }
      if (sortKey === "budget_desc") {
        return this._getBudgetSortValue(b) - this._getBudgetSortValue(a);
      }
      if (sortKey === "conversion_uplift_desc") {
        const ca = typeof a.conversionUpliftPercent === "number" ? a.conversionUpliftPercent : 0;
        const cb = typeof b.conversionUpliftPercent === "number" ? b.conversionUpliftPercent : 0;
        return cb - ca;
      }
      if (sortKey === "impact_desc") {
        const ia = typeof a.impactScore === "number" ? a.impactScore : 0;
        const ib = typeof b.impactScore === "number" ? b.impactScore : 0;
        return ib - ia;
      }
      // Fallback: newest first
      const da = this._parseDate(a.launchDate);
      const db = this._parseDate(b.launchDate);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    const total = results.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = results.slice(start, end);

    return {
      total,
      items: slice.map((cs) => ({
        caseStudy: cs,
        isFavorite: favIds.has(cs.id),
        inComparison: cmpIds.has(cs.id)
      }))
    };
  }

  // getCaseStudyDetail(caseStudyId)
  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage("case_studies", []);
    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;

    const favorites = this._getOrCreateFavorites();
    const comparisonSet = this._getOrCreateComparisonSet();

    const favIds = new Set(favorites.caseStudyIds || []);
    const cmpIds = new Set(comparisonSet.caseStudyIds || []);

    let relatedCaseStudies = [];
    if (cs && Array.isArray(cs.relatedCaseStudyIds)) {
      relatedCaseStudies = cs.relatedCaseStudyIds
        .map((id) => caseStudies.find((c) => c.id === id))
        .filter(Boolean);
    }

    return {
      caseStudy: cs,
      isFavorite: cs ? favIds.has(cs.id) : false,
      inComparison: cs ? cmpIds.has(cs.id) : false,
      relatedCaseStudies
    };
  }

  // toggleFavoriteCaseStudy(caseStudyId)
  toggleFavoriteCaseStudy(caseStudyId) {
    const caseStudies = this._getFromStorage("case_studies", []);
    const exists = caseStudies.some((c) => c.id === caseStudyId);
    if (!exists) {
      return {
        success: false,
        isFavorite: false,
        favoritesCount: this._getOrCreateFavorites().caseStudyIds.length,
        message: "Case study not found"
      };
    }

    const favorites = this._getOrCreateFavorites();
    const ids = favorites.caseStudyIds || [];
    const index = ids.indexOf(caseStudyId);
    let isFavorite;
    let message;

    if (index === -1) {
      ids.push(caseStudyId);
      isFavorite = true;
      message = "Added to favorites";
    } else {
      ids.splice(index, 1);
      isFavorite = false;
      message = "Removed from favorites";
    }

    favorites.caseStudyIds = ids;
    favorites.updatedAt = new Date().toISOString();
    localStorage.setItem("favorites", JSON.stringify(favorites));

    return {
      success: true,
      isFavorite,
      favoritesCount: ids.length,
      message
    };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites = this._getOrCreateFavorites();
    const caseStudies = this._getFromStorage("case_studies", []);
    const comparisonSet = this._getOrCreateComparisonSet();
    const cmpIds = new Set(comparisonSet.caseStudyIds || []);

    const items = (favorites.caseStudyIds || []).map((id) => {
      const cs = caseStudies.find((c) => c.id === id) || null;
      return {
        caseStudy: cs,
        isInComparison: cmpIds.has(id)
      };
    });

    return {
      favorites,
      items
    };
  }

  // toggleComparisonCaseStudy(caseStudyId)
  toggleComparisonCaseStudy(caseStudyId) {
    const caseStudies = this._getFromStorage("case_studies", []);
    const exists = caseStudies.some((c) => c.id === caseStudyId);
    if (!exists) {
      return {
        success: false,
        inComparison: false,
        comparisonCount: this._getOrCreateComparisonSet().caseStudyIds.length,
        message: "Case study not found"
      };
    }

    const comparisonSet = this._getOrCreateComparisonSet();
    const ids = comparisonSet.caseStudyIds || [];
    const idx = ids.indexOf(caseStudyId);
    let inComparison;
    let message;

    if (idx === -1) {
      if (ids.length >= this.COMPARISON_MAX_ITEMS) {
        return {
          success: false,
          inComparison: false,
          comparisonCount: ids.length,
          message: `You can compare up to ${this.COMPARISON_MAX_ITEMS} projects`
        };
      }
      ids.push(caseStudyId);
      inComparison = true;
      message = "Added to comparison";
    } else {
      ids.splice(idx, 1);
      inComparison = false;
      message = "Removed from comparison";
    }

    comparisonSet.caseStudyIds = ids;
    comparisonSet.updatedAt = new Date().toISOString();
    localStorage.setItem("comparison_sets", JSON.stringify(comparisonSet));

    return {
      success: true,
      inComparison,
      comparisonCount: ids.length,
      message
    };
  }

  // getComparisonSet()
  getComparisonSet() {
    const comparisonSet = this._getOrCreateComparisonSet();
    const caseStudies = this._getFromStorage("case_studies", []);

    const items = (comparisonSet.caseStudyIds || []).map((id) => ({
      caseStudy: caseStudies.find((c) => c.id === id) || null
    }));

    return {
      comparisonSet,
      items,
      maxItems: this.COMPARISON_MAX_ITEMS
    };
  }

  // getEstimatorOptions()
  getEstimatorOptions() {
    const projectTypes = [
      {
        value: "web_application",
        label: "Web application",
        description: "Custom web app or platform"
      },
      {
        value: "mobile_application",
        label: "Mobile application",
        description: "Native or cross‑platform mobile app"
      },
      {
        value: "cloud_native_platform",
        label: "Cloud‑native platform",
        description: "Distributed system on cloud infrastructure"
      },
      { value: "website", label: "Marketing website", description: "Public marketing site" },
      {
        value: "api_development",
        label: "API development",
        description: "Public or private APIs"
      },
      { value: "other", label: "Other", description: "Other type of project" }
    ];

    const productTypes = [
      { value: "b2b_saas", label: "B2B SaaS" },
      { value: "b2c_saas", label: "B2C SaaS" },
      { value: "internal_tool", label: "Internal tool" },
      { value: "marketplace", label: "Marketplace" },
      { value: "other", label: "Other" }
    ];

    const budgetRanges = [
      { value: "under_50_000", label: this._getBudgetRangeLabel("under_50_000") },
      { value: "50_000_100_000", label: this._getBudgetRangeLabel("50_000_100_000") },
      { value: "80_000_plus", label: this._getBudgetRangeLabel("80_000_plus") },
      { value: "100_000_150_000", label: this._getBudgetRangeLabel("100_000_150_000") },
      { value: "150_000_plus", label: this._getBudgetRangeLabel("150_000_plus") }
    ];

    const timelines = [
      { value: "0_3_months", label: "0–3 months" },
      { value: "3_6_months", label: "3–6 months" },
      { value: "6_12_months", label: "6–12 months" },
      { value: "12_plus_months", label: "12+ months" }
    ];

    return {
      projectTypes,
      productTypes,
      budgetRanges,
      timelines
    };
  }

  // submitEstimateRequest(projectType, productType, budgetRange, timeline, name, email, projectDescription)
  submitEstimateRequest(
    projectType,
    productType,
    budgetRange,
    timeline,
    name,
    email,
    projectDescription
  ) {
    const allowedProjectTypes = [
      "web_application",
      "mobile_application",
      "cloud_native_platform",
      "website",
      "api_development",
      "other"
    ];
    const allowedProductTypes = [
      "b2b_saas",
      "b2c_saas",
      "internal_tool",
      "marketplace",
      "other"
    ];
    const allowedBudgetRanges = [
      "under_50_000",
      "50_000_100_000",
      "80_000_plus",
      "100_000_150_000",
      "150_000_plus"
    ];
    const allowedTimelines = [
      "0_3_months",
      "3_6_months",
      "6_12_months",
      "12_plus_months"
    ];

    if (!allowedProjectTypes.includes(projectType)) {
      return { success: false, message: "Invalid projectType", estimateRequest: null };
    }
    if (productType && !allowedProductTypes.includes(productType)) {
      return { success: false, message: "Invalid productType", estimateRequest: null };
    }
    if (!allowedBudgetRanges.includes(budgetRange)) {
      return { success: false, message: "Invalid budgetRange", estimateRequest: null };
    }
    if (!allowedTimelines.includes(timeline)) {
      return { success: false, message: "Invalid timeline", estimateRequest: null };
    }
    if (!name || !email) {
      return { success: false, message: "Name and email are required", estimateRequest: null };
    }

    const now = new Date().toISOString();
    const estimateRequest = {
      id: this._generateId("estimate"),
      projectType,
      productType: productType || null,
      budgetRange,
      timeline,
      name,
      email,
      projectDescription: projectDescription || "",
      createdAt: now
    };

    this._persistEstimateRequest(estimateRequest);

    let estimatedBudgetHint = "";
    const label = this._getBudgetRangeLabel(budgetRange);
    if (label) {
      estimatedBudgetHint = label.replace("$", "$").replace(",000", "k");
    }

    return {
      success: true,
      message: "Estimate request submitted",
      estimateRequest,
      estimatedBudgetHint
    };
  }

  // getPricingPlans(filters, sortBy)
  getPricingPlans(filters = {}, sortBy = "monthly_price_asc") {
    let plans = this._getFromStorage("pricing_plans", []);

    if (filters.includesMobileAppMaintenance === true) {
      plans = plans.filter((p) => p.includesMobileAppMaintenance === true);
    }

    if (Array.isArray(filters.requiredFeatureKeys) && filters.requiredFeatureKeys.length) {
      plans = plans.filter((p) => {
        if (!Array.isArray(p.features)) return false;
        return filters.requiredFeatureKeys.every((f) => p.features.includes(f));
      });
    }

    const key = sortBy || "monthly_price_asc";
    plans.sort((a, b) => {
      const ma = typeof a.monthlyPrice === "number" ? a.monthlyPrice : 0;
      const mb = typeof b.monthlyPrice === "number" ? b.monthlyPrice : 0;
      const ya = typeof a.yearlyPrice === "number" ? a.yearlyPrice : Infinity;
      const yb = typeof b.yearlyPrice === "number" ? b.yearlyPrice : Infinity;

      if (key === "monthly_price_asc") return ma - mb;
      if (key === "monthly_price_desc") return mb - ma;
      if (key === "yearly_price_asc") return ya - yb;
      if (key === "yearly_price_desc") return yb - ya;
      return ma - mb;
    });

    return plans;
  }

  // submitPlanInquiry(pricingPlanId, fullName, email, company, notes)
  submitPlanInquiry(pricingPlanId, fullName, email, company, notes) {
    const plans = this._getFromStorage("pricing_plans", []);
    const plan = plans.find((p) => p.id === pricingPlanId) || null;
    if (!plan) {
      return { success: false, message: "Pricing plan not found", planInquiry: null };
    }
    if (!fullName || !email) {
      return { success: false, message: "Full name and email are required", planInquiry: null };
    }

    const planInquiry = {
      id: this._generateId("plan_inquiry"),
      pricingPlanId,
      fullName,
      email,
      company: company || "",
      notes: notes || "",
      createdAt: new Date().toISOString()
    };

    this._persistPlanInquiry(planInquiry);

    return {
      success: true,
      message: "Plan inquiry submitted",
      planInquiry
    };
  }

  // getBlogFilterOptions()
  getBlogFilterOptions() {
    const posts = this._getFromStorage("blog_posts", []);

    let earliest = null;
    let latest = null;

    posts.forEach((p) => {
      const d = this._parseDate(p.publishDate);
      if (!d) return;
      if (!earliest || d < earliest) earliest = d;
      if (!latest || d > latest) latest = d;
    });

    const tagSet = new Set();
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (typeof t === "string" && t.trim()) tagSet.add(t);
        });
      }
    });

    const availableTags = Array.from(tagSet).map((t) => ({ value: t, label: t }));

    const sortOptions = [
      { value: "newest_first", label: "Newest first" },
      { value: "oldest_first", label: "Oldest first" }
    ];

    return {
      earliestPublishDate: earliest ? earliest.toISOString() : null,
      latestPublishDate: latest ? latest.toISOString() : null,
      availableTags,
      sortOptions
    };
  }

  // searchBlogPosts(query, fromDate, toDate, sortBy, page, pageSize)
  searchBlogPosts(query, fromDate, toDate, sortBy = "newest_first", page = 1, pageSize = 10) {
    const posts = this._getFromStorage("blog_posts", []);

    const q = query && typeof query === "string" ? query.toLowerCase() : null;
    const from = fromDate ? this._parseDate(fromDate) : null;
    const to = toDate ? this._parseDate(toDate) : null;

    let results = posts.filter((p) => {
      if (q) {
        const haystack = [p.title, p.excerpt, p.content, (p.tags || []).join(" ")]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      const d = this._parseDate(p.publishDate);
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;

      return true;
    });

    const key = sortBy || "newest_first";
    results.sort((a, b) => {
      const da = this._parseDate(a.publishDate);
      const db = this._parseDate(b.publishDate);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      if (key === "oldest_first") return ta - tb;
      return tb - ta;
    });

    const total = results.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = results.slice(start, end);

    return {
      total,
      items: slice.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: p.excerpt,
        publishDate: p.publishDate,
        readTimeMinutes: p.readTimeMinutes,
        tags: Array.isArray(p.tags) ? p.tags : [],
        isFeatured: !!p.isFeatured
      }))
    };
  }

  // getBlogPost(articleId)
  getBlogPost(articleId) {
    const posts = this._getFromStorage("blog_posts", []);
    const post = posts.find((p) => p.id === articleId) || null;

    if (!post) {
      return { post: null, relatedPosts: [] };
    }

    const postTags = new Set(Array.isArray(post.tags) ? post.tags : []);

    let related = posts.filter((p) => {
      if (p.id === post.id) return false;
      if (!Array.isArray(p.tags) || !p.tags.length || !postTags.size) return false;
      return p.tags.some((t) => postTags.has(t));
    });

    if (!related.length) {
      related = posts.filter((p) => p.id !== post.id);
    }

    related = related.slice(0, 3).map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      publishDate: p.publishDate,
      readTimeMinutes: p.readTimeMinutes
    }));

    return { post, relatedPosts: related };
  }

  // submitNewsletterSubscription(email, role, source, articleId)
  submitNewsletterSubscription(email, role, source = "unknown", articleId) {
    if (!email) {
      return { success: false, message: "Email is required", subscription: null };
    }

    const allowedRoles = [
      "product_owner",
      "engineer",
      "engineering_manager",
      "cto",
      "founder",
      "designer",
      "other"
    ];
    const allowedSources = ["article_page", "blog_page", "footer", "popup", "unknown"];

    const cleanRole = role && allowedRoles.includes(role) ? role : undefined;
    const cleanSource = allowedSources.includes(source) ? source : "unknown";

    const subscription = {
      id: this._generateId("newsletter"),
      email,
      role: cleanRole || null,
      source: cleanSource,
      articleId: articleId || null,
      createdAt: new Date().toISOString()
    };

    this._persistNewsletterSubscription(subscription);

    return {
      success: true,
      message: "Subscription saved",
      subscription
    };
  }

  // getTeamDirectory(filters, sortBy)
  getTeamDirectory(filters = {}, sortBy = "experience_desc") {
    const members = this._getFromStorage("team_members", []);

    let results = members.filter((m) => {
      if (!m) return false;

      if (Array.isArray(filters.roles) && filters.roles.length) {
        if (!filters.roles.includes(m.role)) return false;
      }

      if (filters.locationRegion && m.locationRegion !== filters.locationRegion) {
        return false;
      }

      if (Array.isArray(filters.skills) && filters.skills.length) {
        if (!Array.isArray(m.skills)) return false;
        const hasAll = filters.skills.every((s) => m.skills.includes(s));
        if (!hasAll) return false;
      }

      if (typeof filters.availableForConsultation === "boolean") {
        if (!!m.availableForConsultation !== filters.availableForConsultation) return false;
      }

      return true;
    });

    const key = sortBy || "experience_desc";
    results.sort((a, b) => {
      const ea = typeof a.yearsOfExperience === "number" ? a.yearsOfExperience : 0;
      const eb = typeof b.yearsOfExperience === "number" ? b.yearsOfExperience : 0;
      if (key === "experience_asc") return ea - eb;
      if (key === "name_asc") return (a.name || "").localeCompare(b.name || "");
      return eb - ea;
    });

    return {
      total: results.length,
      items: results.map((m) => ({ teamMember: m }))
    };
  }

  // getTeamMemberProfile(teamMemberId)
  getTeamMemberProfile(teamMemberId) {
    const members = this._getFromStorage("team_members", []);
    const teamMember = members.find((m) => m.id === teamMemberId) || null;
    return { teamMember };
  }

  // submitConsultationRequest(teamMemberId, name, email, message)
  submitConsultationRequest(teamMemberId, name, email, message) {
    const members = this._getFromStorage("team_members", []);
    const member = members.find((m) => m.id === teamMemberId) || null;
    if (!member) {
      return { success: false, message: "Team member not found", consultationRequest: null };
    }
    if (!name || !email || !message) {
      return {
        success: false,
        message: "Name, email, and message are required",
        consultationRequest: null
      };
    }

    const request = {
      id: this._generateId("consultation"),
      teamMemberId,
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    };

    this._persistConsultationRequest(request);

    return {
      success: true,
      message: "Consultation request submitted",
      consultationRequest: request
    };
  }

  // getServicesOverviewData()
  getServicesOverviewData() {
    const services = this._getFromStorage("services", []);
    const rfpState = this._getRfpSelectionState();
    const selectedIds = new Set(rfpState.selectedServiceIds || []);

    const items = services.map((service) => {
      const isWorkshopService =
        service.category === "workshops" ||
        service.key === "product_discovery_workshops" ||
        service.key === "discovery_ux_workshops";
      const canBeAddedToRfp = service.canBeAddedToRfp === true && service.isActive === true;
      const isSelectedForRfp = selectedIds.has(service.id);
      return {
        service,
        canBeAddedToRfp,
        isSelectedForRfp,
        isWorkshopService
      };
    });

    return { services: items };
  }

  // toggleServiceSelectedForRfp(serviceId)
  toggleServiceSelectedForRfp(serviceId) {
    const services = this._getFromStorage("services", []);
    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        success: false,
        isSelectedForRfp: false,
        selectedCount: this._getRfpSelectionState().selectedServiceIds.length,
        message: "Service not found"
      };
    }

    const rfpState = this._getRfpSelectionState();
    const ids = rfpState.selectedServiceIds || [];
    const idx = ids.indexOf(serviceId);
    let isSelectedForRfp;
    let message;

    if (idx === -1) {
      ids.push(serviceId);
      isSelectedForRfp = true;
      message = "Service added to RFP";
    } else {
      ids.splice(idx, 1);
      isSelectedForRfp = false;
      message = "Service removed from RFP";
    }

    rfpState.selectedServiceIds = ids;
    this._saveToStorage("rfp_selection_state", rfpState);

    return {
      success: true,
      isSelectedForRfp,
      selectedCount: ids.length,
      message
    };
  }

  // getRfpFormState()
  getRfpFormState() {
    const rfpState = this._getRfpSelectionState();
    const services = this._getFromStorage("services", []);
    const selectedServices = services.filter((s) =>
      (rfpState.selectedServiceIds || []).includes(s.id)
    );

    const budgetRangeOptions = [
      { value: "under_50_000", label: this._getBudgetRangeLabel("under_50_000") },
      { value: "50_000_100_000", label: this._getBudgetRangeLabel("50_000_100_000") },
      { value: "80_000_plus", label: this._getBudgetRangeLabel("80_000_plus") },
      { value: "100_000_150_000", label: this._getBudgetRangeLabel("100_000_150_000") },
      { value: "150_000_plus", label: this._getBudgetRangeLabel("150_000_plus") }
    ];

    return {
      selectedServices,
      budgetRangeOptions
    };
  }

  // submitProposalRequest(selectedServiceIds, budgetRange, name, email, projectSummary)
  submitProposalRequest(selectedServiceIds, budgetRange, name, email, projectSummary) {
    if (!Array.isArray(selectedServiceIds) || !selectedServiceIds.length) {
      return { success: false, message: "At least one service must be selected", proposalRequest: null };
    }

    const allowedBudgetRanges = [
      "under_50_000",
      "50_000_100_000",
      "80_000_plus",
      "100_000_150_000",
      "150_000_plus"
    ];
    if (!allowedBudgetRanges.includes(budgetRange)) {
      return { success: false, message: "Invalid budgetRange", proposalRequest: null };
    }
    if (!name || !email) {
      return { success: false, message: "Name and email are required", proposalRequest: null };
    }

    const services = this._getFromStorage("services", []);
    const validIds = selectedServiceIds.filter((id) => services.some((s) => s.id === id));
    const uniqueIds = Array.from(new Set(validIds));

    if (!uniqueIds.length) {
      return { success: false, message: "Selected services not found", proposalRequest: null };
    }

    const request = {
      id: this._generateId("proposal"),
      selectedServiceIds: uniqueIds,
      budgetRange,
      name,
      email,
      projectSummary: projectSummary || "",
      createdAt: new Date().toISOString()
    };

    this._persistProposalRequest(request);

    return {
      success: true,
      message: "Proposal request submitted",
      proposalRequest: request
    };
  }

  // getWorkshopTemplates()
  getWorkshopTemplates() {
    return this._getFromStorage("workshop_templates", []);
  }

  // submitWorkshopRequest(workshopTypeKey, duration, participantsCount, preferredStartDate, name, email, company, goalsNotes)
  submitWorkshopRequest(
    workshopTypeKey,
    duration,
    participantsCount,
    preferredStartDate,
    name,
    email,
    company,
    goalsNotes
  ) {
    const allowedWorkshopTypes = [
      "ux_discovery_workshop",
      "product_discovery_workshop",
      "design_sprint",
      "technical_discovery_workshop"
    ];
    const allowedDurations = ["1_week", "2_weeks", "3_weeks", "4_weeks"];

    if (!allowedWorkshopTypes.includes(workshopTypeKey)) {
      return { success: false, message: "Invalid workshopTypeKey", workshopRequest: null };
    }
    if (!allowedDurations.includes(duration)) {
      return { success: false, message: "Invalid duration", workshopRequest: null };
    }
    if (typeof participantsCount !== "number" || participantsCount <= 0) {
      return { success: false, message: "Invalid participantsCount", workshopRequest: null };
    }
    if (!name || !email || !preferredStartDate) {
      return {
        success: false,
        message: "Name, email, and preferredStartDate are required",
        workshopRequest: null
      };
    }

    const preferredDate = this._parseDate(preferredStartDate);
    const storedPreferredDate = preferredDate ? preferredDate.toISOString() : preferredStartDate;

    const request = {
      id: this._generateId("workshop"),
      workshopTypeKey,
      duration,
      participantsCount,
      preferredStartDate: storedPreferredDate,
      name,
      email,
      company: company || "",
      goalsNotes: goalsNotes || "",
      createdAt: new Date().toISOString()
    };

    this._persistWorkshopRequest(request);

    return {
      success: true,
      message: "Workshop request submitted",
      workshopRequest: request
    };
  }

  // submitSimilarProjectRequest(caseStudyId, projectType, budgetRange, name, email, projectDescription)
  submitSimilarProjectRequest(
    caseStudyId,
    projectType,
    budgetRange,
    name,
    email,
    projectDescription
  ) {
    const caseStudies = this._getFromStorage("case_studies", []);
    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;
    if (!cs) {
      return { success: false, message: "Case study not found", similarProjectRequest: null };
    }

    const allowedProjectTypes = [
      "web_application",
      "mobile_application",
      "cloud_native_platform",
      "website",
      "api_development",
      "other"
    ];
    const allowedBudgetRanges = [
      "under_50_000",
      "50_000_100_000",
      "80_000_plus",
      "100_000_150_000",
      "150_000_plus"
    ];

    if (!allowedProjectTypes.includes(projectType)) {
      return { success: false, message: "Invalid projectType", similarProjectRequest: null };
    }

    let finalBudgetRange = budgetRange;
    if (!allowedBudgetRanges.includes(budgetRange)) {
      finalBudgetRange = cs.budgetRange || budgetRange;
    }
    if (cs.budgetRange && cs.budgetRange !== finalBudgetRange) {
      // Prefer the case study's budget range to stay "similar"
      finalBudgetRange = cs.budgetRange;
    }

    if (!name || !email) {
      return { success: false, message: "Name and email are required", similarProjectRequest: null };
    }

    const request = {
      id: this._generateId("similar_project"),
      caseStudyId,
      projectType,
      budgetRange: finalBudgetRange,
      name,
      email,
      projectDescription: projectDescription || "",
      createdAt: new Date().toISOString()
    };

    this._persistSimilarProjectRequest(request);

    return {
      success: true,
      message: "Similar project request submitted",
      similarProjectRequest: request
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    // Basic static content; not tied to entity storage
    return {
      mission:
        "We partner with product teams to design, build, and scale reliable web & mobile software.",
      values: [
        {
          title: "Ownership",
          description: "We treat every product as if it were our own."
        },
        {
          title: "Clarity",
          description: "We communicate early, often, and with context."
        },
        {
          title: "Craft",
          description: "We invest in quality engineering and thoughtful UX."
        }
      ],
      domainExperience: [
        {
          key: "fintech",
          label: "Fintech",
          description: "Regulated financial products, payments, and lending."
        },
        {
          key: "e_commerce",
          label: "E‑commerce",
          description: "High‑converting storefronts and transactional systems."
        },
        {
          key: "b2b_saas",
          label: "B2B SaaS",
          description: "Multi‑tenant SaaS platforms for business customers."
        },
        {
          key: "cloud_native_platforms",
          label: "Cloud‑native platforms",
          description: "Distributed systems on AWS, Kubernetes, and modern stacks."
        }
      ],
      locations: [
        {
          region: "europe",
          city: "Remote‑first Europe",
          label: "Distributed team across Europe"
        }
      ],
      contact: {
        email: "contact@example-agency.com",
        phone: "",
        address: ""
      }
    };
  }

  // getLegalContent()
  getLegalContent() {
    const privacyPolicyHtml =
      "<h2>Privacy Policy</h2>" +
      "<p>We collect contact details you submit via forms (such as estimate requests, " +
      "workshop bookings, and newsletter signups) to respond to your inquiries and share " +
      "relevant information about our services. We do not sell your personal data.</p>";

    const termsOfServiceHtml =
      "<h2>Terms of Service</h2>" +
      "<p>All information on this website is provided as‑is and does not constitute a binding " +
      "offer. Any collaboration is subject to a separate written agreement.</p>";

    const dataHandlingSummary =
      "We store the details you submit in project, plan, consultation, workshop, similar " +
      "project, proposal, and newsletter forms in order to respond to your request, " +
      "prepare proposals, and keep a record of communication. You can request deletion of " +
      "your data at any time by contacting us.";

    return {
      privacyPolicyHtml,
      termsOfServiceHtml,
      dataHandlingSummary
    };
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
