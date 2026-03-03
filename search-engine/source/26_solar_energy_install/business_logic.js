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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const keys = [
      'quote_requests',
      'quote_plans',
      'saved_quotes',
      'solar_packages',
      'consultation_slots',
      'consultation_appointments',
      'articles',
      'saved_articles',
      'savings_scenarios',
      'installers',
      'installer_contacts',
      'panel_models',
      'battery_options',
      'system_designs',
      'financing_options',
      'financing_comparisons',
      'financing_quote_results',
      'financing_pre_applications',
      'contact_tickets',
      'installer_reviews'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('user_state_store')) {
      const defaultState = {
        savedQuoteIds: [],
        savedArticleIds: [],
        savingsScenarioIds: [],
        financingPreApplicationIds: []
      };
      localStorage.setItem('user_state_store', JSON.stringify(defaultState));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  _getOrCreateUserStateStore() {
    let state = this._getFromStorage('user_state_store', null);
    if (!state || typeof state !== 'object') {
      state = {
        savedQuoteIds: [],
        savedArticleIds: [],
        savingsScenarioIds: [],
        financingPreApplicationIds: []
      };
      this._saveToStorage('user_state_store', state);
    }
    return state;
  }

  _updateUserStateStore(mutatorFn) {
    const state = this._getOrCreateUserStateStore();
    const updated = mutatorFn({ ...state }) || state;
    this._saveToStorage('user_state_store', updated);
    return updated;
  }

  _findById(array, id) {
    return array.find((item) => item.id === id) || null;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ------------------------
  // Domain-specific helpers
  // ------------------------

  _calculateLoanPayment(principal, apr, termYears) {
    if (!termYears || principal <= 0) return 0;
    const months = termYears * 12;
    const monthlyRate = apr > 0 ? (apr / 100) / 12 : 0;
    if (monthlyRate === 0) return principal / months;
    const numerator = monthlyRate * principal;
    const denominator = 1 - Math.pow(1 + monthlyRate, -months);
    return numerator / denominator;
  }

  _calculateSavingsFromInputs(zipCode, monthlyElectricBill, roofOrientation, shadingLevel, systemSizeKw) {
    // Simple heuristic model; uses only inputs and does not depend on external data
    const orientationFactors = {
      south_facing: 1.0,
      east_facing: 0.9,
      west_facing: 0.9,
      north_facing: 0.75,
      flat: 0.95,
      mixed: 0.9
    };

    const shadingFactors = {
      low_0_25: 0.95,
      medium_25_50: 0.85,
      high_50_100: 0.7,
      unknown: 0.9
    };

    const orientationFactor = orientationFactors[roofOrientation] || 0.9;
    const shadingKey = shadingLevel || 'unknown';
    const shadingFactor = shadingFactors[shadingKey] || 0.9;

    // Base production per kW per year (kWh)
    const baseKwhPerKwYear = 1400; // rough US average

    const totalDcCapacityKw = systemSizeKw || 0;
    const estimatedAnnualProductionKwh = totalDcCapacityKw * baseKwhPerKwYear * orientationFactor * shadingFactor;

    // Estimate electricity price from the bill: assume 900 kWh/month baseline
    const baselineUsageKwhPerMonth = 900;
    const pricePerKwh = baselineUsageKwhPerMonth > 0 ? (monthlyElectricBill / baselineUsageKwhPerMonth) : 0.15;

    const annualBill = monthlyElectricBill * 12;
    const potentialSavings = estimatedAnnualProductionKwh * pricePerKwh;
    const estimatedAnnualSavings = Math.min(annualBill, potentialSavings);

    // System cost heuristic: $3,000 per kW
    const costPerKw = 3000;
    const estimatedSystemCost = totalDcCapacityKw * costPerKw;

    const paybackYears = estimatedAnnualSavings > 0 ? (estimatedSystemCost / estimatedAnnualSavings) : null;

    return {
      estimatedAnnualSavings,
      estimatedSystemCost,
      estimatedAnnualProductionKwh,
      paybackYears
    };
  }

  _generateQuotePlansForRequest(quoteRequest) {
    // Generate a small set of financing plans for the requested system size
    const quote_plans = this._getFromStorage('quote_plans', []);

    const systemSizeKw = quoteRequest.desired_system_size_kw;
    const costPerKw = 3200; // slightly higher than savings calculator
    const totalPrice = systemSizeKw * costPerKw;

    const basePlansConfig = [
      { name: '10-year solar loan', termYears: 10, apr: 3.99 },
      { name: '15-year solar loan', termYears: 15, apr: 2.99 },
      { name: '20-year solar loan', termYears: 20, apr: 4.5 }
    ];

    const newPlans = basePlansConfig.map((cfg) => {
      const monthly = this._calculateLoanPayment(totalPrice, cfg.apr, cfg.termYears);
      const plan = {
        id: this._generateId('qp'),
        quote_request_id: quoteRequest.id,
        name: cfg.name,
        description: `Approx. ${cfg.termYears}-year financing at ${cfg.apr.toFixed(2)}% APR`,
        system_size_kw: systemSizeKw,
        total_price: totalPrice,
        estimated_monthly_payment: Math.round(monthly * 100) / 100,
        loan_term_years: cfg.termYears,
        apr: cfg.apr,
        panel_model_id: null,
        panel_count: null,
        battery_included: false,
        battery_capacity_kwh: null,
        inverter_type: 'string_inverter',
        created_at: this._nowIso()
      };
      quote_plans.push(plan);
      return plan;
    });

    this._saveToStorage('quote_plans', quote_plans);
    return newPlans;
  }

  _filterAndSortFinancingResults(comparison, results, options) {
    let filtered = results.slice();

    if (options && typeof options.maxUpfrontPayment === 'number') {
      filtered = filtered.filter((r) => r.estimated_upfront_payment <= options.maxUpfrontPayment);
    }
    if (options && typeof options.maxMonthlyPayment === 'number') {
      filtered = filtered.filter((r) => r.estimated_monthly_payment <= options.maxMonthlyPayment);
    }

    const sortBy = (options && options.sortBy) || 'apr';
    const sortDirection = (options && options.sortDirection) || 'asc';

    const fieldMap = {
      apr: 'apr',
      estimated_monthly_payment: 'estimated_monthly_payment',
      estimated_upfront_payment: 'estimated_upfront_payment'
    };
    const field = fieldMap[sortBy] || 'apr';

    filtered.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      return sortDirection === 'desc' ? (bv - av) : (av - bv);
    });

    // Resolve foreign keys: financing_option_id -> financingOption
    const financingOptions = this._getFromStorage('financing_options', []);
    const enriched = filtered.map((r) => ({
      ...r,
      financingOption: this._clone(financingOptions.find((f) => f.id === r.financing_option_id) || null)
    }));

    return enriched;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // Home page
  getHomePageContent() {
    // Static content; does not depend on entities
    const heroTitle = 'Go Solar with Confidence';
    const heroSubtitle = 'High-efficiency residential and commercial solar installations, backed by expert design and financing support.';

    const valueProps = [
      {
        icon: 'savings',
        title: 'Lower your bills',
        description: 'Design a system that can offset a significant portion of your electric bill.'
      },
      {
        icon: 'reliability',
        title: 'Top-rated installers',
        description: 'Connect with vetted installers serving your area.'
      },
      {
        icon: 'support',
        title: 'End-to-end guidance',
        description: 'From design to incentives and financing, we help you compare your options.'
      }
    ];

    const primaryActions = [
      {
        actionKey: 'get_quote',
        label: 'Get a Solar Quote',
        description: 'Estimate costs and payments for your home.',
        emphasis: 'primary'
      },
      {
        actionKey: 'schedule_consultation',
        label: 'Schedule a Consultation',
        description: 'Talk with a solar specialist about your project.',
        emphasis: 'secondary'
      },
      {
        actionKey: 'savings_calculator',
        label: 'See Your Savings',
        description: 'Estimate how much you can save with solar.'
      }
    ];

    const installers = this._getFromStorage('installers', []);
    const solarPackages = this._getFromStorage('solar_packages', []);

    const highlightStats = [
      { label: 'Local installers listed', value: String(installers.length) },
      { label: 'Solar packages in our catalog', value: String(solarPackages.length) }
    ];

    return { heroTitle, heroSubtitle, valueProps, primaryActions, highlightStats };
  }

  getFeaturedSolarPackagesForHome(maxItems = 3) {
    const packagesRaw = this._getFromStorage('solar_packages', []);
    const panelModels = this._getFromStorage('panel_models', []);

    const active = packagesRaw.filter((p) => p.status === 'active');

    // Sort by created_at desc
    active.sort((a, b) => {
      const ad = a.created_at || '';
      const bd = b.created_at || '';
      if (ad === bd) return 0;
      return ad < bd ? 1 : -1;
    });

    const selected = active.slice(0, maxItems).map((p) => ({
      ...p,
      panelModel: this._clone(panelModels.find((m) => m.id === p.panel_model_id) || null)
    }));

    return { packages: selected };
  }

  getFeaturedArticlesForHome(maxItems = 3) {
    const articles = this._getFromStorage('articles', []);
    const published = articles.filter((a) => a.is_published);

    published.sort((a, b) => {
      const ad = a.published_at || '';
      const bd = b.published_at || '';
      if (ad === bd) return 0;
      return ad < bd ? 1 : -1;
    });

    return { articles: published.slice(0, maxItems).map((a) => this._clone(a)) };
  }

  // Quote tool
  getQuoteFormOptions() {
    const propertyTypeOptions = [
      { value: 'residential', label: 'Single-family home' },
      { value: 'commercial', label: 'Commercial building' }
    ];

    const systemSizeOptionsKw = [3, 4, 5, 6, 7, 8, 9, 10];

    const roofAreaHelpText = 'Approximate total roof area available for panels in square feet.';
    const averageBillHelpText = 'Average monthly electric bill over the last 12 months.';

    return {
      propertyTypeOptions,
      systemSizeOptionsKw,
      roofAreaHelpText,
      averageBillHelpText
    };
  }

  createQuoteRequestAndGeneratePlans(zipCode, propertyType, roofAreaSqft, averageMonthlyBill, desiredSystemSizeKw, notes) {
    if (propertyType !== 'residential' && propertyType !== 'commercial') {
      throw new Error('Invalid propertyType');
    }

    const quote_requests = this._getFromStorage('quote_requests', []);

    const quoteRequest = {
      id: this._generateId('qr'),
      zip_code: zipCode,
      property_type: propertyType,
      roof_area_sqft: roofAreaSqft,
      average_monthly_bill: averageMonthlyBill,
      desired_system_size_kw: desiredSystemSizeKw,
      notes: notes || null,
      created_at: this._nowIso()
    };

    quote_requests.push(quoteRequest);
    this._saveToStorage('quote_requests', quote_requests);

    const plans = this._generateQuotePlansForRequest(quoteRequest);

    // Resolve panelModel foreign keys if present
    const panelModels = this._getFromStorage('panel_models', []);
    const enrichedPlans = plans.map((p) => ({
      ...p,
      panelModel: this._clone(panelModels.find((m) => m.id === p.panel_model_id) || null)
    }));

    return {
      quoteRequest: this._clone(quoteRequest),
      plans: enrichedPlans
    };
  }

  getQuotePlansForRequest(quoteRequestId, sortBy = 'monthly_payment', sortDirection = 'asc') {
    const quote_requests = this._getFromStorage('quote_requests', []);
    const quote_plans = this._getFromStorage('quote_plans', []);
    const panelModels = this._getFromStorage('panel_models', []);

    const quoteRequest = this._findById(quote_requests, quoteRequestId);

    let plans = quote_plans.filter((p) => p.quote_request_id === quoteRequestId);

    const fieldMap = {
      monthly_payment: 'estimated_monthly_payment',
      total_price: 'total_price',
      system_size: 'system_size_kw'
    };
    const field = fieldMap[sortBy] || 'estimated_monthly_payment';

    plans.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      return sortDirection === 'desc' ? (bv - av) : (av - bv);
    });

    const availableSortOptions = [
      { value: 'monthly_payment', label: 'Monthly payment: Low to High' },
      { value: 'total_price', label: 'Total price: Low to High' },
      { value: 'system_size', label: 'System size: Small to Large' }
    ];

    const enrichedPlans = plans.map((p) => ({
      ...p,
      quoteRequest: this._clone(quoteRequest),
      panelModel: this._clone(panelModels.find((m) => m.id === p.panel_model_id) || null)
    }));

    return {
      quoteRequest: this._clone(quoteRequest),
      plans: enrichedPlans,
      availableSortOptions,
      appliedSort: { sortBy, sortDirection }
    };
  }

  getQuotePlanDetail(quotePlanId) {
    const quote_plans = this._getFromStorage('quote_plans', []);
    const quote_requests = this._getFromStorage('quote_requests', []);
    const panelModels = this._getFromStorage('panel_models', []);
    const batteryOptions = this._getFromStorage('battery_options', []);
    const saved_quotes = this._getFromStorage('saved_quotes', []);
    const solar_packages = this._getFromStorage('solar_packages', []);
    const system_designs = this._getFromStorage('system_designs', []);

    const plan = this._findById(quote_plans, quotePlanId);
    if (!plan) {
      return {
        plan: null,
        quoteRequest: null,
        sourceType: null,
        sourcePackage: null,
        sourceSystemDesign: null,
        panelModel: null,
        batteryOption: null
      };
    }

    const quoteRequest = plan.quote_request_id ? this._findById(quote_requests, plan.quote_request_id) : null;
    const panelModel = plan.panel_model_id ? this._findById(panelModels, plan.panel_model_id) : null;

    // Determine source from SavedQuote if any
    const relatedSaved = saved_quotes.find((sq) => sq.quote_plan_id === plan.id) || null;
    let sourceType = null;
    let sourcePackage = null;
    let sourceSystemDesign = null;

    if (relatedSaved) {
      sourceType = relatedSaved.source_type || null;
      if (relatedSaved.source_type === 'solar_package' && relatedSaved.source_reference_id) {
        sourcePackage = this._findById(solar_packages, relatedSaved.source_reference_id);
      } else if (relatedSaved.source_type === 'system_design' && relatedSaved.source_reference_id) {
        sourceSystemDesign = this._findById(system_designs, relatedSaved.source_reference_id);
      }
    }

    // No explicit battery_option_id on QuotePlan; we keep batteryOption null
    const batteryOption = null;

    return {
      plan: this._clone(plan),
      quoteRequest: this._clone(quoteRequest),
      sourceType,
      sourcePackage: this._clone(sourcePackage),
      sourceSystemDesign: this._clone(sourceSystemDesign),
      panelModel: this._clone(panelModel),
      batteryOption
    };
  }

  saveQuotePlanToList(quotePlanId, nickname) {
    const quote_plans = this._getFromStorage('quote_plans', []);
    const saved_quotes = this._getFromStorage('saved_quotes', []);

    const plan = this._findById(quote_plans, quotePlanId);
    if (!plan) {
      throw new Error('QuotePlan not found');
    }

    const savedQuote = {
      id: this._generateId('sq'),
      quote_plan_id: quotePlanId,
      quote_request_id: plan.quote_request_id || null,
      source_type: 'quote_tool',
      source_reference_id: null,
      nickname: nickname || null,
      saved_at: this._nowIso()
    };

    saved_quotes.push(savedQuote);
    this._saveToStorage('saved_quotes', saved_quotes);

    this._updateUserStateStore((state) => {
      if (!state.savedQuoteIds.includes(savedQuote.id)) {
        state.savedQuoteIds.push(savedQuote.id);
      }
      return state;
    });

    return {
      savedQuote: this._clone(savedQuote),
      message: 'Quote saved to your list.'
    };
  }

  // Solar packages
  getSolarPackageFilterOptions() {
    const packages = this._getFromStorage('solar_packages', []);

    let sizeMin = null;
    let sizeMax = null;
    let priceMin = null;
    let priceMax = null;
    let warrantyMin = null;
    let warrantyMax = null;

    packages.forEach((p) => {
      if (typeof p.system_size_kw === 'number') {
        sizeMin = sizeMin == null ? p.system_size_kw : Math.min(sizeMin, p.system_size_kw);
        sizeMax = sizeMax == null ? p.system_size_kw : Math.max(sizeMax, p.system_size_kw);
      }
      if (typeof p.total_price === 'number') {
        priceMin = priceMin == null ? p.total_price : Math.min(priceMin, p.total_price);
        priceMax = priceMax == null ? p.total_price : Math.max(priceMax, p.total_price);
      }
      if (typeof p.panel_warranty_years === 'number') {
        warrantyMin = warrantyMin == null ? p.panel_warranty_years : Math.min(warrantyMin, p.panel_warranty_years);
        warrantyMax = warrantyMax == null ? p.panel_warranty_years : Math.max(warrantyMax, p.panel_warranty_years);
      }
    });

    const systemTypeOptions = [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' }
    ];

    const sizeRangeKw = {
      min: sizeMin != null ? sizeMin : 1,
      max: sizeMax != null ? sizeMax : 20,
      step: 0.5
    };

    const priceRange = {
      min: priceMin != null ? priceMin : 5000,
      max: priceMax != null ? priceMax : 50000
    };

    const warrantyRangeYears = {
      min: warrantyMin != null ? warrantyMin : 10,
      max: warrantyMax != null ? warrantyMax : 30
    };

    const sortOptions = [
      { value: 'total_price_asc', label: 'Total price: Low to High' },
      { value: 'total_price_desc', label: 'Total price: High to Low' },
      { value: 'system_size_kw_asc', label: 'System size: Small to Large' },
      { value: 'system_size_kw_desc', label: 'System size: Large to Small' }
    ];

    return {
      systemTypeOptions,
      sizeRangeKw,
      priceRange,
      warrantyRangeYears,
      sortOptions
    };
  }

  searchSolarPackages(systemType, minSystemSizeKw, maxSystemSizeKw, maxTotalPrice, minPanelWarrantyYears, sortBy = 'total_price', sortDirection = 'asc') {
    const packages = this._getFromStorage('solar_packages', []);
    const panelModels = this._getFromStorage('panel_models', []);

    let filtered = packages.filter((p) => p.status === 'active');

    if (systemType) {
      filtered = filtered.filter((p) => p.system_type === systemType);
    }
    if (typeof minSystemSizeKw === 'number') {
      filtered = filtered.filter((p) => p.system_size_kw >= minSystemSizeKw);
    }
    if (typeof maxSystemSizeKw === 'number') {
      filtered = filtered.filter((p) => p.system_size_kw <= maxSystemSizeKw);
    }
    if (typeof maxTotalPrice === 'number') {
      filtered = filtered.filter((p) => p.total_price <= maxTotalPrice);
    }
    if (typeof minPanelWarrantyYears === 'number') {
      filtered = filtered.filter((p) => p.panel_warranty_years >= minPanelWarrantyYears);
    }

    const field = sortBy === 'system_size_kw' ? 'system_size_kw' : 'total_price';

    filtered.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      return sortDirection === 'desc' ? (bv - av) : (av - bv);
    });

    const enriched = filtered.map((p) => ({
      ...p,
      panelModel: this._clone(panelModels.find((m) => m.id === p.panel_model_id) || null)
    }));

    return {
      packages: enriched,
      totalCount: enriched.length
    };
  }

  getSolarPackageDetail(packageId) {
    const packages = this._getFromStorage('solar_packages', []);
    const panelModels = this._getFromStorage('panel_models', []);
    const batteryOptions = this._getFromStorage('battery_options', []);

    const pkg = this._findById(packages, packageId);
    if (!pkg) {
      return {
        package: null,
        panelModel: null,
        batteryOption: null,
        meetsCommonCriteria: {
          isSixToEightKw: false,
          isUnder15000: false,
          hasTwentyYearWarranty: false
        }
      };
    }

    const panelModel = pkg.panel_model_id ? this._findById(panelModels, pkg.panel_model_id) : null;

    // Attempt to infer battery option by capacity if any
    let batteryOption = null;
    if (pkg.battery_capacity_kwh != null) {
      batteryOption = batteryOptions.find((b) => b.capacity_kwh === pkg.battery_capacity_kwh) || null;
    }

    const meetsCommonCriteria = {
      isSixToEightKw: typeof pkg.system_size_kw === 'number' && pkg.system_size_kw >= 6 && pkg.system_size_kw <= 8,
      isUnder15000: typeof pkg.total_price === 'number' && pkg.total_price < 15000,
      hasTwentyYearWarranty: typeof pkg.panel_warranty_years === 'number' && pkg.panel_warranty_years >= 20
    };

    return {
      package: this._clone(pkg),
      panelModel: this._clone(panelModel),
      batteryOption: this._clone(batteryOption),
      meetsCommonCriteria
    };
  }

  addPackageToQuoteList(packageId, nickname) {
    const packages = this._getFromStorage('solar_packages', []);
    const quote_plans = this._getFromStorage('quote_plans', []);
    const saved_quotes = this._getFromStorage('saved_quotes', []);

    const pkg = this._findById(packages, packageId);
    if (!pkg) {
      throw new Error('SolarPackage not found');
    }

    const totalPrice = pkg.total_price;
    const termYears = 15;
    const apr = 3.5;
    const monthly = this._calculateLoanPayment(totalPrice, apr, termYears);

    const plan = {
      id: this._generateId('qp'),
      quote_request_id: null,
      name: pkg.name,
      description: pkg.description || 'Quote based on selected solar package.',
      system_size_kw: pkg.system_size_kw,
      total_price: totalPrice,
      estimated_monthly_payment: Math.round(monthly * 100) / 100,
      loan_term_years: termYears,
      apr: apr,
      panel_model_id: pkg.panel_model_id || null,
      panel_count: pkg.panel_count || null,
      battery_included: !!pkg.included_battery,
      battery_capacity_kwh: pkg.battery_capacity_kwh || null,
      inverter_type: pkg.inverter_type || 'string_inverter',
      created_at: this._nowIso()
    };

    quote_plans.push(plan);
    this._saveToStorage('quote_plans', quote_plans);

    const savedQuote = {
      id: this._generateId('sq'),
      quote_plan_id: plan.id,
      quote_request_id: null,
      source_type: 'solar_package',
      source_reference_id: pkg.id,
      nickname: nickname || null,
      saved_at: this._nowIso()
    };

    saved_quotes.push(savedQuote);
    this._saveToStorage('saved_quotes', saved_quotes);

    this._updateUserStateStore((state) => {
      if (!state.savedQuoteIds.includes(savedQuote.id)) {
        state.savedQuoteIds.push(savedQuote.id);
      }
      return state;
    });

    const panelModels = this._getFromStorage('panel_models', []);
    const enrichedPlan = {
      ...plan,
      panelModel: this._clone(panelModels.find((m) => m.id === plan.panel_model_id) || null)
    };

    return {
      generatedPlan: enrichedPlan,
      savedQuote: this._clone(savedQuote),
      message: 'Package added to your quote list.'
    };
  }

  // Consultation booking
  getConsultationBookingOptions() {
    const consultationTypeOptions = [
      { value: 'virtual', label: 'Virtual / Video call' },
      { value: 'in_person', label: 'In-person visit' }
    ];
    const propertyTypeOptions = [
      { value: 'residential', label: 'Home / Residential' },
      { value: 'commercial', label: 'Commercial' }
    ];
    const timeSlotHelpText = 'Select an available date and time. Weekday morning slots tend to book quickly.';

    return {
      consultationTypeOptions,
      propertyTypeOptions,
      timeSlotHelpText
    };
  }

  getConsultationAvailabilitySlots(consultationType, startDate, endDate) {
    const slots = this._getFromStorage('consultation_slots', []);
    let filtered = slots.filter((s) => s.consultation_type === consultationType && s.is_available);

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      filtered = filtered.filter((s) => {
        const d = new Date(s.start_datetime);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    return { slots: filtered.map((s) => this._clone(s)) };
  }

  bookConsultationAppointment(slotId, appointmentDatetime, consultationType, propertyType, zipCode, contactName, contactPhone, contactEmail, notes) {
    const consultation_slots = this._getFromStorage('consultation_slots', []);
    const consultation_appointments = this._getFromStorage('consultation_appointments', []);

    let slot = null;
    let appointmentDateStr = appointmentDatetime || null;

    if (slotId) {
      slot = this._findById(consultation_slots, slotId);
      if (!slot) {
        throw new Error('Consultation slot not found');
      }
      if (!slot.is_available) {
        throw new Error('Consultation slot is no longer available');
      }
      appointmentDateStr = slot.start_datetime;
    }

    if (!appointmentDateStr) {
      throw new Error('Either slotId or appointmentDatetime must be provided');
    }

    const appointment = {
      id: this._generateId('ca'),
      consultation_type: consultationType,
      property_type: propertyType,
      zip_code: zipCode,
      appointment_datetime: appointmentDateStr,
      status: 'pending',
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      slot_id: slot ? slot.id : null,
      notes: notes || null,
      created_at: this._nowIso()
    };

    consultation_appointments.push(appointment);
    this._saveToStorage('consultation_appointments', consultation_appointments);

    if (slot) {
      slot.is_available = false;
      const updatedSlots = consultation_slots.map((s) => (s.id === slot.id ? slot : s));
      this._saveToStorage('consultation_slots', updatedSlots);
    }

    return this._clone(appointment);
  }

  // Articles / Blog
  getArticleSearchFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const categoriesSet = new Set();
    articles.forEach((a) => {
      if (a.category) categoriesSet.add(a.category);
    });

    const dateRangeOptions = [
      { value: 'all', label: 'All time' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'custom', label: 'Custom range' }
    ];

    const sortOptions = [
      { value: 'published_at_desc', label: 'Newest first' },
      { value: 'published_at_asc', label: 'Oldest first' }
    ];

    return {
      dateRangeOptions,
      sortOptions,
      categoryOptions: Array.from(categoriesSet)
    };
  }

  searchArticles(query, dateRange = 'all', startDate, endDate, category, sortBy = 'published_at', sortDirection = 'desc') {
    const articles = this._getFromStorage('articles', []);
    const q = (query || '').trim().toLowerCase();

    const now = new Date();
    let start = null;
    let end = null;

    if (dateRange === 'last_12_months') {
      start = new Date(now.getTime());
      start.setFullYear(start.getFullYear() - 1);
    } else if (dateRange === 'last_30_days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'custom') {
      start = startDate ? new Date(startDate) : null;
      end = endDate ? new Date(endDate) : null;
    }

    let filtered = articles.filter((a) => a.is_published);

    if (q) {
      filtered = filtered.filter((a) => {
        const haystack = [a.title, a.summary, a.content]
          .filter(Boolean)
          .join(' ') + ' ' + (Array.isArray(a.tags) ? a.tags.join(' ') : '');
        return haystack.toLowerCase().includes(q);
      });
    }

    if (category) {
      filtered = filtered.filter((a) => a.category === category);
    }

    if (start || end) {
      filtered = filtered.filter((a) => {
        const d = new Date(a.published_at);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    const field = sortBy === 'published_at' ? 'published_at' : 'published_at';

    filtered.sort((a, b) => {
      const ad = a[field] || '';
      const bd = b[field] || '';
      if (ad === bd) return 0;
      if (sortDirection === 'asc') {
        return ad < bd ? -1 : 1;
      }
      return ad > bd ? -1 : 1;
    });

    return {
      articles: filtered.map((a) => this._clone(a)),
      totalCount: filtered.length
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = this._findById(articles, articleId);
    return this._clone(article);
  }

  saveArticleToReadingList(articleId, tags, notes) {
    const articles = this._getFromStorage('articles', []);
    const saved_articles = this._getFromStorage('saved_articles', []);

    const article = this._findById(articles, articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    const normalizedTags = Array.isArray(tags) ? tags : (typeof tags === 'string' && tags ? [tags] : []);

    const saved = {
      id: this._generateId('sa'),
      article_id: articleId,
      saved_at: this._nowIso(),
      tags: normalizedTags,
      notes: notes || null
    };

    saved_articles.push(saved);
    this._saveToStorage('saved_articles', saved_articles);

    this._updateUserStateStore((state) => {
      if (!state.savedArticleIds.includes(saved.id)) {
        state.savedArticleIds.push(saved.id);
      }
      return state;
    });

    return {
      ...this._clone(saved),
      article: this._clone(article)
    };
  }

  getRelatedArticles(articleId) {
    const articles = this._getFromStorage('articles', []);
    const current = this._findById(articles, articleId);

    let others = articles.filter((a) => a.is_published && a.id !== articleId);

    if (current && current.category) {
      const sameCategory = others.filter((a) => a.category === current.category);
      const otherCategories = others.filter((a) => a.category !== current.category);

      sameCategory.sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        if (ad === bd) return 0;
        return ad < bd ? 1 : -1;
      });

      otherCategories.sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        if (ad === bd) return 0;
        return ad < bd ? 1 : -1;
      });

      others = sameCategory.concat(otherCategories);
    } else {
      others.sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        if (ad === bd) return 0;
        return ad < bd ? 1 : -1;
      });
    }

    const related = others.slice(0, 5).map((a) => this._clone(a));

    return { related };
  }

  // Savings calculator
  getSavingsCalculatorDefaults() {
    const roofOrientationOptions = [
      { value: 'south_facing', label: 'South-facing' },
      { value: 'east_facing', label: 'East-facing' },
      { value: 'west_facing', label: 'West-facing' },
      { value: 'north_facing', label: 'North-facing' },
      { value: 'flat', label: 'Flat' },
      { value: 'mixed', label: 'Mixed orientations' }
    ];

    const shadingLevelOptions = [
      { value: 'low_0_25', label: 'Low (0–25%)' },
      { value: 'medium_25_50', label: 'Medium (25–50%)' },
      { value: 'high_50_100', label: 'High (50–100%)' },
      { value: 'unknown', label: 'Not sure' }
    ];

    const systemSizeRangeKw = {
      min: 1,
      max: 20,
      step: 0.5
    };

    return {
      roofOrientationOptions,
      shadingLevelOptions,
      systemSizeRangeKw
    };
  }

  calculateSavingsEstimate(zipCode, monthlyElectricBill, roofOrientation, shadingLevel, systemSizeKw) {
    const calc = this._calculateSavingsFromInputs(
      zipCode,
      monthlyElectricBill,
      roofOrientation,
      shadingLevel,
      systemSizeKw
    );

    return {
      estimatedAnnualSavings: calc.estimatedAnnualSavings,
      estimatedSystemCost: calc.estimatedSystemCost,
      estimatedAnnualProductionKwh: calc.estimatedAnnualProductionKwh,
      paybackYears: calc.paybackYears,
      inputsEcho: {
        zipCode,
        monthlyElectricBill,
        roofOrientation,
        shadingLevel,
        systemSizeKw
      }
    };
  }

  saveSavingsScenario(name, zipCode, monthlyElectricBill, roofOrientation, shadingLevel, systemSizeKw) {
    const savings_scenarios = this._getFromStorage('savings_scenarios', []);

    const calc = this._calculateSavingsFromInputs(
      zipCode,
      monthlyElectricBill,
      roofOrientation,
      shadingLevel,
      systemSizeKw
    );

    const now = this._nowIso();
    const scenario = {
      id: this._generateId('ss'),
      name,
      zip_code: zipCode,
      monthly_electric_bill: monthlyElectricBill,
      roof_orientation: roofOrientation,
      shading_level: shadingLevel || 'unknown',
      system_size_kw: systemSizeKw,
      estimated_annual_savings: calc.estimatedAnnualSavings,
      estimated_system_cost: calc.estimatedSystemCost,
      created_at: now,
      updated_at: now
    };

    savings_scenarios.push(scenario);
    this._saveToStorage('savings_scenarios', savings_scenarios);

    this._updateUserStateStore((state) => {
      if (!state.savingsScenarioIds.includes(scenario.id)) {
        state.savingsScenarioIds.push(scenario.id);
      }
      return state;
    });

    return this._clone(scenario);
  }

  getSavedSavingsScenarios() {
    const scenarios = this._getFromStorage('savings_scenarios', []);
    return scenarios.map((s) => this._clone(s));
  }

  // Installers search
  getInstallerSearchFilterOptions() {
    const distanceOptionsMiles = [10, 25, 50, 100];
    const ratingThresholdOptions = [0, 3, 4, 4.5];
    const reviewCountThresholdOptions = [0, 10, 50, 100];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'distance_asc', label: 'Distance: Near to Far' },
      { value: 'review_count_desc', label: 'Reviews: Most to Fewest' }
    ];

    return {
      distanceOptionsMiles,
      ratingThresholdOptions,
      reviewCountThresholdOptions,
      sortOptions
    };
  }

  searchInstallers(zipCode, distanceMiles = 25, minOverallRating, minReviewCount, sortBy = 'rating', sortDirection = 'desc') {
    const installers = this._getFromStorage('installers', []);

    let filtered = installers.filter((i) => i.is_active);

    if (typeof distanceMiles === 'number') {
      filtered = filtered.filter((i) => typeof i.distance_miles === 'number' && i.distance_miles <= distanceMiles);
    }
    if (typeof minOverallRating === 'number') {
      filtered = filtered.filter((i) => i.overall_rating >= minOverallRating);
    }
    if (typeof minReviewCount === 'number') {
      filtered = filtered.filter((i) => i.review_count >= minReviewCount);
    }

    let field;
    if (sortBy === 'distance') field = 'distance_miles';
    else if (sortBy === 'review_count') field = 'review_count';
    else field = 'overall_rating';

    filtered.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      return sortDirection === 'asc' ? (av - bv) : (bv - av);
    });

    return {
      installers: filtered.map((i) => this._clone(i)),
      totalCount: filtered.length
    };
  }

  getInstallerProfile(installerId) {
    const installers = this._getFromStorage('installers', []);
    const reviewsStore = this._getFromStorage('installer_reviews', []);

    const installer = this._findById(installers, installerId);

    const reviews = reviewsStore
      .filter((r) => r.installerId === installerId)
      .map((r) => ({
        author: r.author,
        rating: r.rating,
        date: r.date,
        comment: r.comment
      }));

    return {
      installer: this._clone(installer),
      reviews
    };
  }

  contactInstaller(installerId, name, phone, email, preferredContactMethod, message) {
    const installers = this._getFromStorage('installers', []);
    const installer_contacts = this._getFromStorage('installer_contacts', []);

    const installer = this._findById(installers, installerId);
    if (!installer) {
      throw new Error('Installer not found');
    }

    if (preferredContactMethod !== 'phone' && preferredContactMethod !== 'email') {
      throw new Error('Invalid preferredContactMethod');
    }

    const contactReq = {
      id: this._generateId('icr'),
      installer_id: installerId,
      name,
      phone,
      email: email || null,
      preferred_contact_method: preferredContactMethod,
      message,
      created_at: this._nowIso(),
      status: 'new'
    };

    installer_contacts.push(contactReq);
    this._saveToStorage('installer_contacts', installer_contacts);

    return {
      ...this._clone(contactReq),
      installer: this._clone(installer)
    };
  }

  // System builder
  getSystemBuilderOptions(systemType) {
    const systemTypeOptions = [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' }
    ];

    const roofTypeOptions = [
      { value: 'asphalt_shingle', label: 'Asphalt shingle' },
      { value: 'metal', label: 'Metal' },
      { value: 'tile', label: 'Tile' },
      { value: 'flat_roof', label: 'Flat roof' },
      { value: 'other', label: 'Other' }
    ];

    const roofPitchOptions = [
      { value: 'low_0_15', label: 'Low (0–15°)' },
      { value: 'medium_25_35', label: 'Medium (25–35°)' },
      { value: 'high_35_plus', label: 'High (35°+)' },
      { value: 'unknown', label: 'Not sure' }
    ];

    const inverterTypeOptions = [
      { value: 'string_inverter', label: 'String inverter' },
      { value: 'microinverter', label: 'Microinverters' },
      { value: 'optimizer_inverter', label: 'Optimizers + inverter' },
      { value: 'hybrid_inverter', label: 'Hybrid inverter' }
    ];

    let panelModels = this._getFromStorage('panel_models', []).filter((p) => p.status === 'active');
    let batteryOptions = this._getFromStorage('battery_options', []).filter((b) => b.status === 'active');

    // Currently no systemType filter on these entities; keep as-is

    return {
      systemTypeOptions,
      roofTypeOptions,
      roofPitchOptions,
      panelModels: panelModels.map((p) => this._clone(p)),
      batteryOptions: batteryOptions.map((b) => this._clone(b)),
      inverterTypeOptions
    };
  }

  createOrUpdateSystemDesign(designId, systemType, roofType, roofPitch, panelModelId, panelQuantity, includeBattery, batteryOptionId, inverterType, notes) {
    const system_designs = this._getFromStorage('system_designs', []);
    const panelModels = this._getFromStorage('panel_models', []);
    const batteryOptions = this._getFromStorage('battery_options', []);

    const panelModel = this._findById(panelModels, panelModelId);
    if (!panelModel) {
      throw new Error('PanelModel not found');
    }

    let batteryOption = null;
    if (includeBattery && batteryOptionId) {
      batteryOption = this._findById(batteryOptions, batteryOptionId);
      if (!batteryOption) {
        throw new Error('BatteryOption not found');
      }
    }

    let design = null;
    if (designId) {
      design = this._findById(system_designs, designId);
    }

    const totalDcCapacityKw = (panelModel.wattage * panelQuantity) / 1000;

    const now = this._nowIso();
    if (!design) {
      design = {
        id: this._generateId('sd'),
        system_type: systemType,
        roof_type: roofType,
        roof_pitch: roofPitch || 'unknown',
        panel_model_id: panelModelId,
        panel_wattage: panelModel.wattage,
        panel_quantity: panelQuantity,
        total_dc_capacity_kw: totalDcCapacityKw,
        include_battery: !!includeBattery,
        battery_option_id: includeBattery && batteryOption ? batteryOption.id : null,
        battery_capacity_kwh: includeBattery && batteryOption ? batteryOption.capacity_kwh : null,
        inverter_type: inverterType,
        notes: notes || null,
        created_at: now
      };
      system_designs.push(design);
    } else {
      design.system_type = systemType;
      design.roof_type = roofType;
      design.roof_pitch = roofPitch || design.roof_pitch;
      design.panel_model_id = panelModelId;
      design.panel_wattage = panelModel.wattage;
      design.panel_quantity = panelQuantity;
      design.total_dc_capacity_kw = totalDcCapacityKw;
      design.include_battery = !!includeBattery;
      design.battery_option_id = includeBattery && batteryOption ? batteryOption.id : null;
      design.battery_capacity_kwh = includeBattery && batteryOption ? batteryOption.capacity_kwh : null;
      design.inverter_type = inverterType;
      design.notes = notes || design.notes || null;

      const updated = system_designs.map((d) => (d.id === design.id ? design : d));
      this._saveToStorage('system_designs', updated);
      return this._clone(design);
    }

    this._saveToStorage('system_designs', system_designs);
    return this._clone(design);
  }

  getSystemDesignSummary(designId) {
    const system_designs = this._getFromStorage('system_designs', []);
    const panelModels = this._getFromStorage('panel_models', []);
    const batteryOptions = this._getFromStorage('battery_options', []);

    const design = this._findById(system_designs, designId);
    if (!design) {
      return {
        design: null,
        derived: null
      };
    }

    const panelModel = design.panel_model_id ? this._findById(panelModels, design.panel_model_id) : null;
    const batteryOption = design.battery_option_id ? this._findById(batteryOptions, design.battery_option_id) : null;

    // Instrumentation for task completion tracking
    try {
      if (
        design &&
        design.system_type === 'residential' &&
        design.roof_type === 'asphalt_shingle' &&
        design.roof_pitch === 'medium_25_35' &&
        design.panel_quantity === 16 &&
        panelModel &&
        panelModel.wattage === 400 &&
        design.include_battery === true &&
        typeof design.battery_capacity_kwh === 'number' &&
        design.battery_capacity_kwh >= 10
      ) {
        const value = { "designId": design.id, "viewedAt": this._nowIso() };
        localStorage.setItem('task7_summaryViewed', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const totalDc = design.total_dc_capacity_kw || ((design.panel_wattage || 0) * (design.panel_quantity || 0)) / 1000;
    const estimatedAcOutputKw = totalDc * 0.85;

    const calc = this._calculateSavingsFromInputs('00000', 150, 'south_facing', 'unknown', totalDc);

    const derived = {
      totalDcCapacityKw: totalDc,
      estimatedAcOutputKw,
      estimatedAnnualProductionKwh: calc.estimatedAnnualProductionKwh,
      estimatedAnnualSavings: calc.estimatedAnnualSavings,
      estimatedSystemCost: calc.estimatedSystemCost
    };

    const enrichedDesign = {
      ...design,
      panelModel: this._clone(panelModel),
      batteryOption: this._clone(batteryOption)
    };

    return {
      design: enrichedDesign,
      derived
    };
  }

  saveSystemDesignAsQuote(designId, nickname) {
    const system_designs = this._getFromStorage('system_designs', []);
    const quote_plans = this._getFromStorage('quote_plans', []);
    const saved_quotes = this._getFromStorage('saved_quotes', []);

    const design = this._findById(system_designs, designId);
    if (!design) {
      throw new Error('SystemDesign not found');
    }

    const systemSizeKw = design.total_dc_capacity_kw || ((design.panel_wattage || 0) * (design.panel_quantity || 0)) / 1000;
    const calc = this._calculateSavingsFromInputs('00000', 150, 'south_facing', 'unknown', systemSizeKw);
    const totalPrice = calc.estimatedSystemCost;

    const termYears = 15;
    const apr = 4.0;
    const monthly = this._calculateLoanPayment(totalPrice, apr, termYears);

    const plan = {
      id: this._generateId('qp'),
      quote_request_id: null,
      name: 'Custom system design',
      description: 'Quote generated from your system design.',
      system_size_kw: systemSizeKw,
      total_price: totalPrice,
      estimated_monthly_payment: Math.round(monthly * 100) / 100,
      loan_term_years: termYears,
      apr: apr,
      panel_model_id: design.panel_model_id || null,
      panel_count: design.panel_quantity || null,
      battery_included: !!design.include_battery,
      battery_capacity_kwh: design.battery_capacity_kwh || null,
      inverter_type: design.inverter_type || 'string_inverter',
      created_at: this._nowIso()
    };

    quote_plans.push(plan);
    this._saveToStorage('quote_plans', quote_plans);

    const savedQuote = {
      id: this._generateId('sq'),
      quote_plan_id: plan.id,
      quote_request_id: null,
      source_type: 'system_design',
      source_reference_id: design.id,
      nickname: nickname || null,
      saved_at: this._nowIso()
    };

    saved_quotes.push(savedQuote);
    this._saveToStorage('saved_quotes', saved_quotes);

    this._updateUserStateStore((state) => {
      if (!state.savedQuoteIds.includes(savedQuote.id)) {
        state.savedQuoteIds.push(savedQuote.id);
      }
      return state;
    });

    const panelModels = this._getFromStorage('panel_models', []);
    const enrichedPlan = {
      ...plan,
      panelModel: this._clone(panelModels.find((m) => m.id === plan.panel_model_id) || null)
    };

    return {
      quotePlan: enrichedPlan,
      savedQuote: this._clone(savedQuote)
    };
  }

  // Financing
  getFinancingOverviewContent() {
    const sections = [
      {
        id: 'how_it_works',
        title: 'How solar financing works',
        bodyHtml:
          '<p>Solar projects can be financed with loans, leases, or power purchase agreements (PPAs). Each option has trade-offs in ownership, incentives, and monthly payments.</p>'
      },
      {
        id: 'key_terms',
        title: 'Key terms to compare',
        bodyHtml:
          '<ul><li><strong>APR:</strong> Annual Percentage Rate, the cost of borrowing.</li><li><strong>Term length:</strong> How long you will be making payments.</li><li><strong>Upfront payment:</strong> Any amount due at signing.</li></ul>'
      }
    ];

    const financingTypeSummaries = [
      {
        financingType: 'loan',
        title: 'Solar loans',
        summary: 'You own the system and can claim incentives; monthly payment is similar to a home improvement loan.'
      },
      {
        financingType: 'lease',
        title: 'Solar leases',
        summary: 'A third party owns the system; you pay a fixed monthly fee for the energy it produces.'
      },
      {
        financingType: 'ppa',
        title: 'PPAs (Power Purchase Agreements)',
        summary: 'Pay a per-kWh rate for the energy produced, often with little or no upfront cost.'
      }
    ];

    return { sections, financingTypeSummaries };
  }

  startFinancingComparison(projectCost, zipCode, creditScoreRange) {
    const financing_comparisons = this._getFromStorage('financing_comparisons', []);
    const financing_options = this._getFromStorage('financing_options', []);
    const financing_quote_results = this._getFromStorage('financing_quote_results', []);

    const comparison = {
      id: this._generateId('fc'),
      project_cost: projectCost,
      zip_code: zipCode,
      credit_score_range: creditScoreRange,
      max_upfront_payment: null,
      max_monthly_payment: null,
      created_at: this._nowIso()
    };

    financing_comparisons.push(comparison);
    this._saveToStorage('financing_comparisons', financing_comparisons);

    // Interpret creditScoreRange into an approximate numeric range
    const rangeMap = {
      less_than_640: { min: 300, max: 639 },
      "640_679": { min: 640, max: 679 },
      "680_719": { min: 680, max: 719 },
      "720_759": { min: 720, max: 759 },
      "760_plus": { min: 760, max: 850 }
    };
    const scoreRange = rangeMap[creditScoreRange] || { min: 300, max: 850 };

    const now = this._nowIso();
    const newResults = [];

    financing_options
      .filter((opt) => opt.is_active)
      .forEach((opt) => {
        if (typeof opt.min_project_cost === 'number' && projectCost < opt.min_project_cost) return;
        if (typeof opt.max_project_cost === 'number' && projectCost > opt.max_project_cost) return;

        if (typeof opt.min_credit_score === 'number' && scoreRange.max < opt.min_credit_score) return;
        if (typeof opt.max_credit_score === 'number' && scoreRange.min > opt.max_credit_score) return;

        let upfrontPercent = 0;
        if (opt.requires_upfront_payment) {
          upfrontPercent = typeof opt.typical_upfront_percent === 'number' ? opt.typical_upfront_percent : 10;
        }
        const estimatedUpfrontPayment = (projectCost * upfrontPercent) / 100;

        let estimatedMonthlyPayment;
        if (opt.financing_type === 'loan') {
          const principal = projectCost - estimatedUpfrontPayment;
          estimatedMonthlyPayment = this._calculateLoanPayment(principal, opt.apr, opt.term_years);
        } else {
          // Simple heuristic for lease/PPA
          estimatedMonthlyPayment = (projectCost * 0.01) / 12;
        }

        const months = opt.term_years * 12;
        const estimatedTotalPaid = estimatedMonthlyPayment * months + estimatedUpfrontPayment;

        const result = {
          id: this._generateId('fqr'),
          comparison_id: comparison.id,
          financing_option_id: opt.id,
          project_cost: projectCost,
          estimated_upfront_payment: Math.round(estimatedUpfrontPayment * 100) / 100,
          estimated_monthly_payment: Math.round(estimatedMonthlyPayment * 100) / 100,
          estimated_total_paid: Math.round(estimatedTotalPaid * 100) / 100,
          apr: opt.apr,
          term_years: opt.term_years,
          created_at: now
        };

        financing_quote_results.push(result);
        newResults.push(result);
      });

    this._saveToStorage('financing_quote_results', financing_quote_results);

    // Enrich results with financingOption
    const enriched = newResults.map((r) => ({
      ...r,
      financingOption: this._clone(financing_options.find((o) => o.id === r.financing_option_id) || null)
    }));

    return {
      comparison: this._clone(comparison),
      results: enriched
    };
  }

  getFinancingComparisonResults(comparisonId, maxUpfrontPayment, maxMonthlyPayment, sortBy = 'apr', sortDirection = 'asc') {
    const financing_comparisons = this._getFromStorage('financing_comparisons', []);
    const financing_quote_results = this._getFromStorage('financing_quote_results', []);

    const comparison = this._findById(financing_comparisons, comparisonId);
    const results = financing_quote_results.filter((r) => r.comparison_id === comparisonId);

    const enrichedSorted = this._filterAndSortFinancingResults(comparison, results, {
      maxUpfrontPayment,
      maxMonthlyPayment,
      sortBy: sortBy === 'estimated_monthly_payment' || sortBy === 'estimated_upfront_payment' || sortBy === 'apr' ? sortBy : 'apr',
      sortDirection
    });

    return {
      comparison: this._clone(comparison),
      results: enrichedSorted
    };
  }

  getFinancingOptionDetail(financingOptionId) {
    const financing_options = this._getFromStorage('financing_options', []);
    return this._clone(this._findById(financing_options, financingOptionId));
  }

  createFinancingPreApplication(financingOptionId, loanAmount, termYears, projectCost, zipCode, creditScoreRange) {
    const financing_options = this._getFromStorage('financing_options', []);
    const financing_pre_applications = this._getFromStorage('financing_pre_applications', []);

    const option = this._findById(financing_options, financingOptionId);
    if (!option) {
      throw new Error('FinancingOption not found');
    }

    const now = this._nowIso();
    const preApp = {
      id: this._generateId('fpa'),
      financing_option_id: financingOptionId,
      loan_amount: loanAmount,
      term_years: termYears,
      project_cost: projectCost || null,
      zip_code: zipCode || null,
      credit_score_range: creditScoreRange || null,
      status: 'draft',
      created_at: now,
      updated_at: now
    };

    financing_pre_applications.push(preApp);
    this._saveToStorage('financing_pre_applications', financing_pre_applications);

    this._updateUserStateStore((state) => {
      if (!state.financingPreApplicationIds.includes(preApp.id)) {
        state.financingPreApplicationIds.push(preApp.id);
      }
      return state;
    });

    return {
      ...this._clone(preApp),
      financingOption: this._clone(option)
    };
  }

  // About / Contact / Legal
  getAboutUsContent() {
    const companyName = 'SunPath Energy';
    const missionHtml = '<p>Our mission is to make clean, affordable solar energy accessible to homeowners and businesses through transparent tools and trusted partners.</p>';
    const historyHtml = '<p>Founded by solar industry veterans, SunPath Energy brings together design expertise, financing guidance, and a network of top-rated installers.</p>';
    const credentials = [
      'NABCEP-certified designers (via partner network)',
      'Industry experience across thousands of installations'
    ];
    const serviceAreas = ['Nationwide remote design and support', 'Regional installer partners in select markets'];
    const primaryActions = [
      { actionKey: 'schedule_consultation', label: 'Schedule a consultation' },
      { actionKey: 'get_quote', label: 'Get a solar quote' }
    ];

    return {
      companyName,
      missionHtml,
      historyHtml,
      credentials,
      serviceAreas,
      primaryActions
    };
  }

  getContactPageContent() {
    const supportPhone = '+1 (800) 000-0000';
    const supportEmail = 'support@sunpathenergy.example';
    const officeAddress = {
      line1: '123 Solar Way',
      line2: 'Suite 200',
      city: 'Austin',
      state: 'TX',
      postalCode: '73301'
    };
    const topicOptions = [
      'General question',
      'Solar quote',
      'Installer partnership',
      'Financing',
      'Other'
    ];

    return {
      supportPhone,
      supportEmail,
      officeAddress,
      topicOptions
    };
  }

  submitContactForm(name, email, phone, topic, message) {
    const contact_tickets = this._getFromStorage('contact_tickets', []);

    const ticketId = this._generateId('ticket');
    const ticket = {
      id: ticketId,
      name,
      email,
      phone: phone || null,
      topic: topic || null,
      message,
      created_at: this._nowIso()
    };

    contact_tickets.push(ticket);
    this._saveToStorage('contact_tickets', contact_tickets);

    return {
      success: true,
      ticketId,
      message: 'Your message has been received. We will get back to you soon.'
    };
  }

  getLegalContent() {
    const privacyPolicyHtml = '<p>We respect your privacy and only use your data to provide and improve our services. Refer to this policy for details on data collection and usage.</p>';
    const termsOfUseHtml = '<p>By using this site, you agree to our terms of use, including acceptable use of tools and content provided.</p>';
    const financingDisclosuresHtml = '<p>Financing estimates are for informational purposes only. Actual terms are provided by third-party lenders and may vary based on credit approval.</p>';
    const installerListingsDisclaimerHtml = '<p>Installer listings are provided for convenience and do not constitute an endorsement. Always perform your own due diligence.</p>';
    const lastUpdatedDate = this._nowIso().slice(0, 10);

    return {
      privacyPolicyHtml,
      termsOfUseHtml,
      financingDisclosuresHtml,
      installerListingsDisclaimerHtml,
      lastUpdatedDate
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