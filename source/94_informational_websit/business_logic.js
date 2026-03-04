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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'plans',
      'plan_benefits',
      'eligibility_checks',
      'saved_plans',
      'services',
      'facilities',
      'cost_estimates',
      'providers',
      'saved_providers',
      'usage_scenarios',
      'pharmacy_prescription_examples',
      'coverage_categories',
      'coverage_summaries',
      'faqs',
      'temporary_card_requests',
      'resources',
      'resource_audiences'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton-like settings; leave unset until first access
    if (!localStorage.getItem('accessibility_settings')) {
      // intentionally not setting default data here
    }
    if (!localStorage.getItem('language_settings')) {
      // intentionally not setting default data here
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

  _now() {
    return new Date().toISOString();
  }

  // ----------------------
  // Private helper functions declared in spec
  // ----------------------

  // Compute recommended plan IDs for eligibility checks
  _generateEligibilityRecommendations(personType, age, state, income, householdSize, zipCode) {
    const plans = this._getFromStorage('plans', []);

    let eligible = plans.filter((plan) => {
      if (personType === 'adult' && plan.type !== 'adult') return false;
      if (personType === 'child' && plan.type !== 'child') return false;

      if (typeof plan.age_min === 'number' && age < plan.age_min) return false;
      if (typeof plan.age_max === 'number' && age > plan.age_max) return false;

      if (personType === 'child' && plan.is_child_eligible === false) return false;

      return true;
    });

    // If no plans match strict child/adult filters, fall back to all plans
    if (!eligible.length) {
      eligible = plans.slice();
    }

    // Simple affordability heuristic: for lower income, bias to cheaper plans
    eligible = this._sortPlans(eligible, 'monthly_cost_low_to_high');

    return eligible.map((p) => p.id);
  }

  // Sort plans by known sort keys
  _sortPlans(plans, sortKey) {
    const list = (plans || []).slice();
    if (!sortKey) {
      return list;
    }

    switch (sortKey) {
      case 'monthly_cost_low_to_high':
      case 'monthly_fee_low_to_high':
        list.sort((a, b) => {
          const pa = typeof a.monthly_price === 'number' ? a.monthly_price : Number.MAX_SAFE_INTEGER;
          const pb = typeof b.monthly_price === 'number' ? b.monthly_price : Number.MAX_SAFE_INTEGER;
          return pa - pb;
        });
        break;
      case 'relevance':
      default:
        list.sort((a, b) => {
          const na = (a.name || '').toLowerCase();
          const nb = (b.name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        });
        break;
    }

    return list;
  }

  // Filter and sort cost estimates
  _applyCostEstimatorFilters(costEstimates, options) {
    const { maxDistanceMiles, coverageOption, sortBy, zipCode } = options || {};

    let filtered = (costEstimates || []).filter((ce) => {
      if (coverageOption && ce.coverage_option !== coverageOption) return false;
      if (zipCode && ce.zip_code_context && ce.zip_code_context !== zipCode) return false;
      if (typeof maxDistanceMiles === 'number' && typeof ce.distance_miles === 'number') {
        if (ce.distance_miles > maxDistanceMiles) return false;
      }
      return true;
    });

    const list = filtered.slice();

    switch (sortBy) {
      case 'total_estimated_cost_low_to_high':
        list.sort((a, b) => {
          const ca = typeof a.total_estimated_cost === 'number' ? a.total_estimated_cost : Number.MAX_SAFE_INTEGER;
          const cb = typeof b.total_estimated_cost === 'number' ? b.total_estimated_cost : Number.MAX_SAFE_INTEGER;
          return ca - cb;
        });
        break;
      case 'distance_low_to_high':
        list.sort((a, b) => {
          const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.MAX_SAFE_INTEGER;
          const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.MAX_SAFE_INTEGER;
          return da - db;
        });
        break;
      default:
        break;
    }

    return list;
  }

  // Filter providers by specialty, location, distance, rating, availability
  _applyProviderSearchFilters(providers, options) {
    const {
      specialty,
      locationQuery,
      maxDistanceMiles,
      minRating,
      acceptingNewPatientsOnly
    } = options || {};

    const query = (locationQuery || '').toLowerCase().trim();

    let filtered = (providers || []).filter((p) => {
      if (specialty && p.specialty !== specialty) return false;

      if (query) {
        const isZipQuery = /^\d{3,5}$/.test(query);
        if (isZipQuery) {
          const providerZip = (p.zip_code || '').toLowerCase();
          const queryPrefix = query.slice(0, 3);
          if (!providerZip.startsWith(queryPrefix)) return false;
        } else {
          const cityState = ((p.city || '') + ', ' + (p.state || '')).toLowerCase();
          const practice = (p.practice_name || '').toLowerCase();
          if (!cityState.includes(query) && !practice.includes(query)) return false;
        }
      }

      if (typeof maxDistanceMiles === 'number' && typeof p.distance_miles === 'number') {
        if (p.distance_miles > maxDistanceMiles) return false;
      }

      if (typeof minRating === 'number') {
        if (typeof p.rating !== 'number' || p.rating < minRating) return false;
      }

      if (acceptingNewPatientsOnly) {
        if (!p.accepting_new_patients) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.MAX_SAFE_INTEGER;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      const ra = typeof a.rating === 'number' ? -a.rating : 0;
      const rb = typeof b.rating === 'number' ? -b.rating : 0;
      return ra - rb;
    });

    return filtered;
  }

  // Persist language and accessibility settings
  _persistUserSettings(type, settings) {
    if (type === 'language') {
      this._saveToStorage('language_settings', settings);
      return settings;
    }
    if (type === 'accessibility') {
      this._saveToStorage('accessibility_settings', settings);
      return settings;
    }
    return settings;
  }

  // Filter pharmacy examples by type and max cost
  _filterPharmacyExamples(examples, filters) {
    const { prescriptionType, maxCost } = filters || {};

    let filtered = (examples || []).filter((ex) => {
      if (ex.scenario_key !== 'pharmacy') return false;
      if (prescriptionType && ex.prescription_type !== prescriptionType) return false;
      if (typeof maxCost === 'number') {
        if (typeof ex.example_cost !== 'number' || ex.example_cost > maxCost) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const ca = typeof a.example_cost === 'number' ? a.example_cost : Number.MAX_SAFE_INTEGER;
      const cb = typeof b.example_cost === 'number' ? b.example_cost : Number.MAX_SAFE_INTEGER;
      return ca - cb;
    });

    return filtered;
  }

  // Filter and sort resources
  _filterAndSortResources(resources, filters) {
    const { resourceType, audienceKeys, publicationYear, language } = filters || {};

    let filtered = (resources || []).filter((r) => {
      if (resourceType && r.resource_type !== resourceType) return false;
      if (typeof publicationYear === 'number' && r.publication_year !== publicationYear) return false;
      if (language && r.language !== language) return false;

      if (audienceKeys && audienceKeys.length) {
        const resourceAudience = Array.isArray(r.audience) ? r.audience : [];
        const hasIntersection = audienceKeys.some((key) => resourceAudience.includes(key));
        if (!hasIntersection) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (a.publication_year !== b.publication_year) {
        return b.publication_year - a.publication_year;
      }
      const ta = (a.title || '').toLowerCase();
      const tb = (b.title || '').toLowerCase();
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });

    return filtered;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeContent
  getHomeContent() {
    // If a custom home_content object is stored, return it; otherwise return minimal defaults
    const stored = this._getFromStorage('home_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      hero_title: 'Digital health card',
      hero_subtitle: '',
      feature_highlights: [],
      primary_ctas: [],
      secondary_links: []
    };
  }

  // submitAdultEligibilityCheck(age, state, householdIncome, householdSize)
  submitAdultEligibilityCheck(age, state, householdIncome, householdSize) {
    const numericAge = Number(age);
    const income = Number(householdIncome);
    const size = Number(householdSize);

    const recommendedPlanIds = this._generateEligibilityRecommendations(
      'adult',
      numericAge,
      state,
      income,
      size,
      null
    );

    const eligibilityChecks = this._getFromStorage('eligibility_checks', []);

    const eligibility_check = {
      id: this._generateId('eligchk'),
      person_type: 'adult',
      age: numericAge,
      state: state,
      zip_code: null,
      household_income: income,
      income_frequency: 'annual',
      household_size: size,
      created_at: this._now(),
      recommended_plan_ids: recommendedPlanIds,
      summary_message: recommendedPlanIds.length
        ? 'Eligibility check completed with recommended plans.'
        : 'Eligibility check completed, but no matching plans were found.'
    };

    eligibilityChecks.push(eligibility_check);
    this._saveToStorage('eligibility_checks', eligibilityChecks);

    const allPlans = this._getFromStorage('plans', []);
    const recommended_plans_raw = allPlans.filter((p) => recommendedPlanIds.includes(p.id));
    const recommended_plans = this._sortPlans(recommended_plans_raw, 'monthly_cost_low_to_high');

    const available_sorts = [
      { key: 'relevance', label: 'Relevance' },
      { key: 'monthly_cost_low_to_high', label: 'Monthly cost - Low to High' }
    ];

    return {
      eligibility_check,
      recommended_plans,
      default_sort: 'monthly_cost_low_to_high',
      available_sorts
    };
  }

  // submitChildEligibilityCheck(age, zipCode, householdMonthlyIncome)
  submitChildEligibilityCheck(age, zipCode, householdMonthlyIncome) {
    const numericAge = Number(age);
    const income = Number(householdMonthlyIncome);

    const recommendedPlanIds = this._generateEligibilityRecommendations(
      'child',
      numericAge,
      null,
      income,
      null,
      zipCode
    );

    const eligibilityChecks = this._getFromStorage('eligibility_checks', []);

    const eligibility_check = {
      id: this._generateId('eligchk'),
      person_type: 'child',
      age: numericAge,
      state: null,
      zip_code: zipCode,
      household_income: income,
      income_frequency: 'monthly',
      household_size: null,
      created_at: this._now(),
      recommended_plan_ids: recommendedPlanIds,
      summary_message: recommendedPlanIds.length
        ? 'Child eligibility check completed with recommended plans.'
        : 'Child eligibility check completed, but no matching plans were found.'
    };

    eligibilityChecks.push(eligibility_check);
    this._saveToStorage('eligibility_checks', eligibilityChecks);

    const allPlans = this._getFromStorage('plans', []);
    const recommended_plans_raw = allPlans.filter((p) => recommendedPlanIds.includes(p.id));
    const recommended_plans = this._sortPlans(recommended_plans_raw, 'monthly_fee_low_to_high');

    const available_sorts = [
      { key: 'monthly_fee_low_to_high', label: 'Monthly fee: Low to High' },
      { key: 'relevance', label: 'Relevance' }
    ];

    return {
      eligibility_check,
      recommended_plans,
      default_sort: 'monthly_fee_low_to_high',
      available_sorts
    };
  }

  // getEligibilityResults(eligibilityCheckId, sortBy)
  getEligibilityResults(eligibilityCheckId, sortBy) {
    const eligibilityChecks = this._getFromStorage('eligibility_checks', []);
    const check = eligibilityChecks.find((c) => c.id === eligibilityCheckId) || null;

    if (!check) {
      return {
        eligibility_check: null,
        recommended_plans: [],
        applied_sort: sortBy || null
      };
    }

    const allPlans = this._getFromStorage('plans', []);
    let recommended_plans = allPlans.filter((p) => check.recommended_plan_ids.includes(p.id));

    let applied_sort = sortBy || null;

    if (sortBy) {
      recommended_plans = this._sortPlans(recommended_plans, sortBy);
    } else {
      if (check.person_type === 'child') {
        applied_sort = 'monthly_fee_low_to_high';
        recommended_plans = this._sortPlans(recommended_plans, 'monthly_fee_low_to_high');
      } else {
        applied_sort = 'monthly_cost_low_to_high';
        recommended_plans = this._sortPlans(recommended_plans, 'monthly_cost_low_to_high');
      }
    }

    // Instrumentation for task completion tracking
    try {
      if (check) {
        const currentSort = sortBy != null ? sortBy : null;
        localStorage.setItem(
          'task1_eligibilityResultsSort',
          JSON.stringify({
            eligibilityCheckId,
            sortBy: currentSort,
            timestamp: this._now()
          })
        );
        localStorage.setItem(
          'task8_eligibilityResultsSort',
          JSON.stringify({
            eligibilityCheckId,
            sortBy: currentSort,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      eligibility_check: check,
      recommended_plans,
      applied_sort
    };
  }

  // getPlanDetails(planId)
  getPlanDetails(planId) {
    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.id === planId) || null;

    const allBenefits = this._getFromStorage('plan_benefits', []);
    let benefits = [];

    if (plan) {
      benefits = allBenefits
        .filter((b) => b.plan_id === plan.id)
        .map((b) => ({
          ...b,
          plan: plan // foreign key resolution
        }));
    }

    const savedPlans = this._getFromStorage('saved_plans', []);
    const is_saved = !!savedPlans.find((sp) => sp.plan_id === planId);

    const highlight_tags = plan && Array.isArray(plan.highlight_tags) ? plan.highlight_tags : [];

    // Instrumentation for task completion tracking
    try {
      if (plan) {
        localStorage.setItem('task1_selectedPlanId', planId);
        localStorage.setItem('task8_selectedPlanId', planId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      plan,
      benefits,
      highlight_tags,
      is_saved
    };
  }

  // savePlan(planId, nickname)
  savePlan(planId, nickname) {
    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        saved_plan: null,
        plan: null,
        message: 'Plan not found.'
      };
    }

    const savedPlans = this._getFromStorage('saved_plans', []);
    let saved_plan = savedPlans.find((sp) => sp.plan_id === planId) || null;

    if (saved_plan) {
      saved_plan.nickname = nickname || saved_plan.nickname || null;
      // saved_at remains original
    } else {
      saved_plan = {
        id: this._generateId('savedplan'),
        plan_id: planId,
        nickname: nickname || null,
        saved_at: this._now()
      };
      savedPlans.push(saved_plan);
    }

    this._saveToStorage('saved_plans', savedPlans);

    const saved_plan_with_fk = {
      ...saved_plan,
      plan
    };

    return {
      saved_plan: saved_plan_with_fk,
      plan,
      message: 'Plan saved successfully.'
    };
  }

  // getPlansForPricingPage()
  getPlansForPricingPage() {
    const plans = this._getFromStorage('plans', []);
    return plans;
  }

  // getPlanComparisonDetails(planIds)
  getPlanComparisonDetails(planIds) {
    // Instrumentation for task completion tracking
    try {
      if (Array.isArray(planIds)) {
        localStorage.setItem(
          'task2_comparedPlanIds',
          JSON.stringify({
            planIds,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const ids = Array.isArray(planIds) ? planIds : [];
    const allPlans = this._getFromStorage('plans', []);
    const allBenefits = this._getFromStorage('plan_benefits', []);

    const plans = ids
      .map((id) => allPlans.find((p) => p.id === id))
      .filter((p) => !!p)
      .map((plan) => {
        const benefits = allBenefits
          .filter((b) => b.plan_id === plan.id)
          .filter((b) => b.is_displayed_in_comparison !== false)
          .map((b) => ({
            ...b,
            plan
          }));
        return { plan, benefits };
      });

    return { plans };
  }

  // getServiceSearchSuggestions(query)
  getServiceSearchSuggestions(query) {
    const q = (query || '').toLowerCase().trim();
    const services = this._getFromStorage('services', []);

    if (!q) return services.filter((s) => s.is_searchable);

    return services.filter((s) => {
      if (!s.is_searchable) return false;
      const name = (s.name || '').toLowerCase();
      return name.includes(q);
    });
  }

  // getCostEstimatorFilterOptions()
  getCostEstimatorFilterOptions() {
    const distance_options = [
      { value_miles: 5, label: 'Within 5 miles' },
      { value_miles: 10, label: 'Within 10 miles' },
      { value_miles: 25, label: 'Within 25 miles' },
      { value_miles: 50, label: 'Within 50 miles' }
    ];

    const coverage_options = [
      { value: 'digital_health_card_benefits', label: 'Use my digital health card benefits' },
      { value: 'no_coverage', label: 'I do not have coverage' }
    ];

    return { distance_options, coverage_options };
  }

  // searchCostEstimates(serviceId, zipCode, maxDistanceMiles, coverageOption, sortBy)
  searchCostEstimates(serviceId, zipCode, maxDistanceMiles, coverageOption, sortBy) {
    const allCostEstimates = this._getFromStorage('cost_estimates', []);
    const service_id = serviceId;

    let filtered = allCostEstimates.filter((ce) => ce.service_id === service_id);

    filtered = this._applyCostEstimatorFilters(filtered, {
      maxDistanceMiles: typeof maxDistanceMiles === 'number' ? maxDistanceMiles : Number(maxDistanceMiles),
      coverageOption,
      sortBy,
      zipCode
    });

    // Instrumentation for task completion tracking
    try {
      const normalizedMaxDistanceMiles =
        typeof maxDistanceMiles === 'number' ? maxDistanceMiles : Number(maxDistanceMiles);
      localStorage.setItem(
        'task3_costEstimatorSearchParams',
        JSON.stringify({
          serviceId,
          zipCode,
          maxDistanceMiles: normalizedMaxDistanceMiles,
          coverageOption,
          sortBy,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const facilities = this._getFromStorage('facilities', []);
    const services = this._getFromStorage('services', []);

    return filtered.map((ce) => {
      const facility = facilities.find((f) => f.id === ce.facility_id) || null;
      const service = services.find((s) => s.id === ce.service_id) || null;
      const ceWithFk = {
        ...ce,
        facility,
        service
      };
      return {
        cost_estimate: ceWithFk,
        facility,
        service
      };
    });
  }

  // getCostEstimateDetails(costEstimateId)
  getCostEstimateDetails(costEstimateId) {
    const allCostEstimates = this._getFromStorage('cost_estimates', []);
    const cost_estimate_raw = allCostEstimates.find((ce) => ce.id === costEstimateId) || null;

    if (!cost_estimate_raw) {
      return {
        cost_estimate: null,
        service: null,
        facility: null
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (cost_estimate_raw) {
        localStorage.setItem('task3_selectedCostEstimateId', costEstimateId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const facilities = this._getFromStorage('facilities', []);
    const services = this._getFromStorage('services', []);

    const facility = facilities.find((f) => f.id === cost_estimate_raw.facility_id) || null;
    const service = services.find((s) => s.id === cost_estimate_raw.service_id) || null;

    const cost_estimate = {
      ...cost_estimate_raw,
      facility,
      service
    };

    return {
      cost_estimate,
      service,
      facility
    };
  }

  // getProviderSearchFilters()
  getProviderSearchFilters() {
    const specialty_options = [
      { value: 'pediatrics', label: 'Pediatrics' },
      { value: 'primary_care', label: 'Primary care' },
      { value: 'mental_health', label: 'Mental health' },
      { value: 'cardiology', label: 'Cardiology' },
      { value: 'dermatology', label: 'Dermatology' },
      { value: 'ob_gyn', label: 'OB/GYN' },
      { value: 'urgent_care', label: 'Urgent care' },
      { value: 'other', label: 'Other' }
    ];

    const distance_options = [
      { value_miles: 5, label: 'Within 5 miles' },
      { value_miles: 10, label: 'Within 10 miles' },
      { value_miles: 25, label: 'Within 25 miles' },
      { value_miles: 50, label: 'Within 50 miles' }
    ];

    const rating_filter_options = [
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const availability_filter_options = [
      { key: 'accepting_new_patients', label: 'Accepting new patients' }
    ];

    return {
      specialty_options,
      distance_options,
      rating_filter_options,
      availability_filter_options
    };
  }

  // searchProviders(specialty, locationQuery, maxDistanceMiles, minRating, acceptingNewPatientsOnly)
  searchProviders(specialty, locationQuery, maxDistanceMiles, minRating, acceptingNewPatientsOnly) {
    const providers = this._getFromStorage('providers', []);

    const results = this._applyProviderSearchFilters(providers, {
      specialty,
      locationQuery,
      maxDistanceMiles: typeof maxDistanceMiles === 'number' ? maxDistanceMiles : Number(maxDistanceMiles),
      minRating: typeof minRating === 'number' ? minRating : (minRating != null ? Number(minRating) : undefined),
      acceptingNewPatientsOnly: !!acceptingNewPatientsOnly
    });

    // Instrumentation for task completion tracking
    try {
      const normalizedMaxDistanceMiles =
        typeof maxDistanceMiles === 'number' ? maxDistanceMiles : Number(maxDistanceMiles);
      const normalizedMinRating =
        typeof minRating === 'number'
          ? minRating
          : (minRating != null ? Number(minRating) : undefined);
      localStorage.setItem(
        'task4_providerSearchParams',
        JSON.stringify({
          specialty,
          locationQuery,
          maxDistanceMiles: normalizedMaxDistanceMiles,
          minRating: normalizedMinRating,
          acceptingNewPatientsOnly: !!acceptingNewPatientsOnly,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // getProviderProfile(providerId)
  getProviderProfile(providerId) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId) || null;

    const savedProviders = this._getFromStorage('saved_providers', []);
    const is_saved = !!savedProviders.find((sp) => sp.provider_id === providerId);

    return {
      provider,
      is_saved
    };
  }

  // saveProvider(providerId)
  saveProvider(providerId) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId) || null;

    if (!provider) {
      return {
        saved_provider: null,
        provider: null,
        message: 'Provider not found.'
      };
    }

    const savedProviders = this._getFromStorage('saved_providers', []);
    let saved_provider = savedProviders.find((sp) => sp.provider_id === providerId) || null;

    if (!saved_provider) {
      saved_provider = {
        id: this._generateId('savedprov'),
        provider_id: providerId,
        added_at: this._now()
      };
      savedProviders.push(saved_provider);
      this._saveToStorage('saved_providers', savedProviders);
    }

    const saved_provider_with_fk = {
      ...saved_provider,
      provider
    };

    return {
      saved_provider: saved_provider_with_fk,
      provider,
      message: 'Provider saved successfully.'
    };
  }

  // getUsageScenarios(language)
  getUsageScenarios(language) {
    const usageScenarios = this._getFromStorage('usage_scenarios', []);
    // Data already contains localized fields; language parameter can be used by frontend
    return usageScenarios;
  }

  // getPharmacyUsageFilterOptions()
  getPharmacyUsageFilterOptions() {
    const examples = this._getFromStorage('pharmacy_prescription_examples', []);

    let min = 0;
    let max = 0;
    if (examples.length) {
      const costs = examples
        .map((e) => (typeof e.example_cost === 'number' ? e.example_cost : null))
        .filter((v) => v != null);
      if (costs.length) {
        min = Math.min.apply(null, costs);
        max = Math.max.apply(null, costs);
        // Round to user-friendly increments (e.g., slider steps)
        min = Math.floor(min / 5) * 5;
        max = Math.ceil(max / 5) * 5;
      }
    }

    const prescription_type_options = [
      { value: 'generic', label_en: 'Generic medications', label_es: 'Medicamentos genéricos' },
      { value: 'brand_name', label_en: 'Brand-name medications', label_es: 'Medicamentos de marca' },
      { value: 'over_the_counter', label_en: 'Over-the-counter', label_es: 'Medicamentos de venta libre' }
    ];

    const cost_range = {
      min,
      max,
      currency: 'usd'
    };

    return {
      prescription_type_options,
      cost_range
    };
  }

  // searchPharmacyPrescriptionExamples(prescriptionType, maxCost)
  searchPharmacyPrescriptionExamples(prescriptionType, maxCost) {
    const examples = this._getFromStorage('pharmacy_prescription_examples', []);
    const filtered = this._filterPharmacyExamples(examples, {
      prescriptionType,
      maxCost: typeof maxCost === 'number' ? maxCost : (maxCost != null ? Number(maxCost) : undefined)
    });

    // Instrumentation for task completion tracking
    try {
      const normalizedMaxCost =
        typeof maxCost === 'number' ? maxCost : (maxCost != null ? Number(maxCost) : undefined);
      localStorage.setItem(
        'task5_pharmacyFilterParams',
        JSON.stringify({
          prescriptionType,
          maxCost: normalizedMaxCost,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered;
  }

  // getPharmacyPrescriptionInstructions(prescriptionExampleId, language)
  getPharmacyPrescriptionInstructions(prescriptionExampleId, language) {
    const examples = this._getFromStorage('pharmacy_prescription_examples', []);
    const exampleRaw = examples.find((e) => e.id === prescriptionExampleId) || null;

    if (!exampleRaw) {
      return {
        example: null,
        instructions_text: ''
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (exampleRaw) {
        localStorage.setItem('task5_selectedPrescriptionExampleId', prescriptionExampleId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const scenarios = this._getFromStorage('usage_scenarios', []);
    const scenario = scenarios.find((s) => s.key === exampleRaw.scenario_key) || null;

    const example = {
      ...exampleRaw,
      scenario
    };

    const lang = language === 'es' ? 'es' : 'en';
    let instructions_text = '';
    if (lang === 'es') {
      instructions_text = example.instructions_es || example.instructions_en || '';
    } else {
      instructions_text = example.instructions_en || example.instructions_es || '';
    }

    return {
      example,
      instructions_text
    };
  }

  // getAccessibilitySettings()
  getAccessibilitySettings() {
    let settings = this._getFromStorage('accessibility_settings', null);

    if (!settings || Array.isArray(settings) || typeof settings !== 'object') {
      settings = {
        id: 'accessibility_settings_default',
        high_contrast_enabled: false,
        text_size: 'normal_100',
        updated_at: this._now()
      };
      this._persistUserSettings('accessibility', settings);
    }

    return settings;
  }

  // updateAccessibilitySettings(highContrastEnabled, textSize)
  updateAccessibilitySettings(highContrastEnabled, textSize) {
    const allowed = ['small_75', 'normal_100', 'large_125', 'extra_large_150'];
    const normalizedTextSize = allowed.includes(textSize) ? textSize : 'normal_100';

    let settings = this.getAccessibilitySettings();

    settings = {
      ...settings,
      high_contrast_enabled: !!highContrastEnabled,
      text_size: normalizedTextSize,
      updated_at: this._now()
    };

    this._persistUserSettings('accessibility', settings);

    return settings;
  }

  // getCoverageOverview()
  getCoverageOverview() {
    const categories = this._getFromStorage('coverage_categories', []);
    return categories;
  }

  // getCoverageCategorySection(categoryKey)
  getCoverageCategorySection(categoryKey) {
    const categories = this._getFromStorage('coverage_categories', []);
    const summariesAll = this._getFromStorage('coverage_summaries', []);

    const category = categories.find((c) => c.key === categoryKey) || null;
    const summaries = summariesAll
      .filter((s) => s.category_key === categoryKey)
      .map((s) => ({
        ...s,
        category
      }));

    return {
      category,
      summaries
    };
  }

  // getCoverageSummaryByCategory(categoryKey)
  getCoverageSummaryByCategory(categoryKey) {
    const categories = this._getFromStorage('coverage_categories', []);
    const summariesAll = this._getFromStorage('coverage_summaries', []);

    const summaryRaw = summariesAll.find((s) => s.category_key === categoryKey) || null;

    if (!summaryRaw) return null;

    // Instrumentation for task completion tracking
    try {
      if (summaryRaw) {
        localStorage.setItem('task6_coverageSummaryCategoryKey', categoryKey);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const category = categories.find((c) => c.key === categoryKey) || null;

    const summary = {
      ...summaryRaw,
      category
    };

    return summary;
  }

  // searchFaqs(query)
  searchFaqs(query) {
    const q = (query || '').toLowerCase().trim();
    const faqs = this._getFromStorage('faqs', []);

    if (!q) return faqs;

    return faqs.filter((f) => {
      const question = (f.question || '').toLowerCase();
      const answer = (f.answer_html || '').toLowerCase();
      const tags = Array.isArray(f.tags) ? f.tags.map((t) => String(t).toLowerCase()) : [];

      if (question.includes(q)) return true;
      if (answer.includes(q)) return true;
      if (tags.some((t) => t.includes(q))) return true;

      return false;
    });
  }

  // getFaqDetails(faqId)
  getFaqDetails(faqId) {
    const faqs = this._getFromStorage('faqs', []);
    const faq = faqs.find((f) => f.id === faqId) || null;
    return faq;
  }

  // submitTemporaryCardDetails(fullName, dateOfBirth, preferredContactMethod, phoneNumber, email)
  submitTemporaryCardDetails(fullName, dateOfBirth, preferredContactMethod, phoneNumber, email) {
    const allowedMethods = ['text_message', 'phone_call', 'email'];
    const method = allowedMethods.includes(preferredContactMethod)
      ? preferredContactMethod
      : 'text_message';

    let dob;
    try {
      dob = new Date(dateOfBirth).toISOString();
    } catch (e) {
      dob = new Date().toISOString();
    }

    const now = this._now();

    const request = {
      id: this._generateId('tempcard'),
      full_name: fullName,
      date_of_birth: dob,
      preferred_contact_method: method,
      phone_number: phoneNumber || null,
      email: email || null,
      request_status: 'in_progress',
      current_step: 'review',
      created_at: now,
      updated_at: now
    };

    const requests = this._getFromStorage('temporary_card_requests', []);
    requests.push(request);
    this._saveToStorage('temporary_card_requests', requests);

    return request;
  }

  // getLanguageSettings()
  getLanguageSettings() {
    let settings = this._getFromStorage('language_settings', null);

    if (!settings || Array.isArray(settings) || typeof settings !== 'object') {
      settings = {
        id: 'language_settings_default',
        language: 'en',
        updated_at: this._now()
      };
      this._persistUserSettings('language', settings);
    }

    return settings;
  }

  // updateLanguageSettings(language)
  updateLanguageSettings(language) {
    const lang = language === 'es' ? 'es' : 'en';

    let settings = this.getLanguageSettings();

    settings = {
      ...settings,
      language: lang,
      updated_at: this._now()
    };

    this._persistUserSettings('language', settings);

    return settings;
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const resource_type_options = [
      { value: 'brochures_guides', label: 'Brochures & guides' },
      { value: 'faq_sheets', label: 'FAQ sheets' },
      { value: 'posters', label: 'Posters' },
      { value: 'videos', label: 'Videos' },
      { value: 'web_pages', label: 'Web pages' }
    ];

    const audience_options = this._getFromStorage('resource_audiences', []);

    const resources = this._getFromStorage('resources', []);
    const yearsSet = new Set();
    resources.forEach((r) => {
      if (typeof r.publication_year === 'number') {
        yearsSet.add(r.publication_year);
      }
    });
    const year_options = Array.from(yearsSet).sort((a, b) => a - b);

    return {
      resource_type_options,
      audience_options,
      year_options
    };
  }

  // searchResources(resourceType, audienceKeys, publicationYear, language)
  searchResources(resourceType, audienceKeys, publicationYear, language) {
    const resources = this._getFromStorage('resources', []);

    const filtered = this._filterAndSortResources(resources, {
      resourceType,
      audienceKeys: Array.isArray(audienceKeys) ? audienceKeys : [],
      publicationYear:
        typeof publicationYear === 'number'
          ? publicationYear
          : (publicationYear != null ? Number(publicationYear) : undefined),
      language
    });

    // Instrumentation for task completion tracking
    try {
      const normalizedAudienceKeys = Array.isArray(audienceKeys) ? audienceKeys : [];
      const normalizedPublicationYear =
        typeof publicationYear === 'number'
          ? publicationYear
          : (publicationYear != null ? Number(publicationYear) : undefined);
      localStorage.setItem(
        'task9_resourceFilterParams',
        JSON.stringify({
          resourceType,
          audienceKeys: normalizedAudienceKeys,
          publicationYear: normalizedPublicationYear,
          language,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered;
  }

  // getResourceDetails(resourceId)
  getResourceDetails(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find((r) => r.id === resourceId) || null;

    if (!resource) {
      return {
        resource: null,
        audience_labels: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (resource) {
        localStorage.setItem('task9_selectedResourceId', resourceId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const resourceAudiences = this._getFromStorage('resource_audiences', []);
    const audienceKeys = Array.isArray(resource.audience) ? resource.audience : [];

    const audience_labels = audienceKeys
      .map((key) => {
        const ra = resourceAudiences.find((a) => a.key === key);
        return ra ? ra.label : null;
      })
      .filter((label) => !!label);

    return {
      resource,
      audience_labels
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
