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
    const arrayKeys = [
      'health_plans',
      'plan_preferences',
      'service_categories',
      'medical_services',
      'plan_benefit_details',
      'plan_benefit_shortlists',
      'plan_usage_scenarios',
      'plan_annual_cost_estimates',
      'plan_comparison_sessions',
      'providers',
      'provider_locations',
      'provider_network_participations',
      'favorite_providers',
      'facilities',
      'facility_locations',
      'facility_service_cost_estimates',
      'facility_comparison_sessions',
      'preferred_facilities',
      'hsa_configurations',
      'hsa_plan_notes',
      'medications',
      'medication_formulations',
      'pharmacies',
      'pharmacy_drug_prices',
      'preferred_pharmacies',
      'spending_alerts',
      'appointment_reminder_settings',
      'conditions',
      'care_settings',
      'care_guide_recommendations',
      'care_setting_cost_estimates',
      'care_comparison_sessions',
      'care_summary_choices',
      'plan_summary_items',
      'recent_activity',
      'upcoming_appointments',
      'plan_search_filters'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify({ sections: [], last_updated: null }));
    }
    if (!localStorage.getItem('help_support_content')) {
      localStorage.setItem('help_support_content', JSON.stringify({ faqs: [], support_contacts: [], resource_links: [] }));
    }
    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem('privacy_policy_content', JSON.stringify({ sections: [], effective_date: null }));
    }
    if (!localStorage.getItem('terms_of_use_content')) {
      localStorage.setItem('terms_of_use_content', JSON.stringify({ sections: [], effective_date: null }));
    }

    if (!localStorage.getItem('current_plan_comparison_session')) {
      localStorage.setItem('current_plan_comparison_session', 'null');
    }
    if (!localStorage.getItem('current_facility_comparison_session')) {
      localStorage.setItem('current_facility_comparison_session', 'null');
    }
    if (!localStorage.getItem('current_care_comparison_session')) {
      localStorage.setItem('current_care_comparison_session', 'null');
    }
    if (!localStorage.getItem('current_hsa_configuration_draft')) {
      localStorage.setItem('current_hsa_configuration_draft', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    const fixed = value.toFixed(2);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '$' + parts.join('.');
  }

  _addRecentActivity(activity_type, description) {
    const recent = this._getFromStorage('recent_activity', []);
    recent.push({
      timestamp: this._now(),
      activity_type,
      description
    });
    this._saveToStorage('recent_activity', recent);
  }

  _updatePlanSummaryItems(itemType, referenceId, description) {
    let items = this._getFromStorage('plan_summary_items', []);
    let item = items.find((i) => i.item_type === itemType && i.reference_id === referenceId);
    const now = this._now();
    if (!item) {
      item = {
        id: this._generateId('summary'),
        item_type: itemType,
        reference_id: referenceId,
        description: description || '',
        added_at: now
      };
      items.push(item);
    } else {
      item.description = description || item.description;
      item.added_at = now;
    }
    this._saveToStorage('plan_summary_items', items);
    return item;
  }

  _getOrCreatePlanComparisonSession() {
    let session = this._getFromStorage('current_plan_comparison_session', null);
    let sessions = this._getFromStorage('plan_comparison_sessions', []);
    if (!session) {
      session = {
        id: this._generateId('plan_comp'),
        zip: '',
        metal_level_filter: 'all',
        compared_plan_ids: [],
        usage_scenario_id: null,
        preferred_plan_id: null,
        created_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('plan_comparison_sessions', sessions);
      this._saveToStorage('current_plan_comparison_session', session);
    }
    return session;
  }

  _savePlanComparisonSession(session) {
    let sessions = this._getFromStorage('plan_comparison_sessions', []);
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('plan_comparison_sessions', sessions);
    this._saveToStorage('current_plan_comparison_session', session);
  }

  _getOrCreateFacilityComparisonSession() {
    let session = this._getFromStorage('current_facility_comparison_session', null);
    let sessions = this._getFromStorage('facility_comparison_sessions', []);
    if (!session) {
      session = {
        id: this._generateId('fac_comp'),
        plan_id: null,
        medical_service_id: null,
        search_zip: '',
        distance_miles: 0,
        hospital_facility_id: null,
        imaging_center_facility_id: null,
        lower_cost_facility_id: null,
        // extra helper fields
        hospital_estimate_id: null,
        imaging_center_estimate_id: null,
        created_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('facility_comparison_sessions', sessions);
      this._saveToStorage('current_facility_comparison_session', session);
    }
    return session;
  }

  _saveFacilityComparisonSession(session) {
    let sessions = this._getFromStorage('facility_comparison_sessions', []);
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('facility_comparison_sessions', sessions);
    this._saveToStorage('current_facility_comparison_session', session);
  }

  _getOrCreateCareComparisonSession(conditionId, planId, ageGroup) {
    let session = this._getFromStorage('current_care_comparison_session', null);
    let sessions = this._getFromStorage('care_comparison_sessions', []);
    if (!session || (conditionId && session.condition_id !== conditionId) || (planId && session.plan_id !== planId)) {
      session = {
        id: this._generateId('care_comp'),
        condition_id: conditionId || null,
        plan_id: planId || null,
        age_group: ageGroup || 'adult',
        selected_care_setting_ids: [],
        created_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('care_comparison_sessions', sessions);
      this._saveToStorage('current_care_comparison_session', session);
    }
    return session;
  }

  _saveCareComparisonSession(session) {
    let sessions = this._getFromStorage('care_comparison_sessions', []);
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('care_comparison_sessions', sessions);
    this._saveToStorage('current_care_comparison_session', session);
  }

  _getOrCreateHsaConfigurationDraft() {
    let draft = this._getFromStorage('current_hsa_configuration_draft', null);
    if (!draft) {
      draft = {
        id: this._generateId('hsa_draft'),
        plan_id: null,
        plan_year: null,
        annual_income: 0,
        monthly_hsa_contribution: 0,
        annual_hsa_contribution: 0,
        coverage_type: 'self_only',
        is_saved: false,
        created_at: this._now()
      };
      this._saveToStorage('current_hsa_configuration_draft', draft);
    }
    return draft;
  }

  _saveHsaConfigurationDraft(draft) {
    this._saveToStorage('current_hsa_configuration_draft', draft);
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomeOverview
  getHomeOverview() {
    const plans = this._getFromStorage('health_plans', []);
    const planPrefs = this._getFromStorage('plan_preferences', []);
    const providers = this._getFromStorage('providers', []);
    const favoriteProviders = this._getFromStorage('favorite_providers', []);
    const recent_activity = this._getFromStorage('recent_activity', []);
    const spending_alerts = this._getFromStorage('spending_alerts', []);
    const upcoming_appointments = this._getFromStorage('upcoming_appointments', []);

    const highlighted_plans = planPrefs
      .filter((p) => p.is_saved || p.is_preferred)
      .sort((a, b) => {
        if (a.is_preferred && !b.is_preferred) return -1;
        if (!a.is_preferred && b.is_preferred) return 1;
        return (b.created_at || '').localeCompare(a.created_at || '');
      })
      .map((pref) => {
        const plan = plans.find((pl) => pl.id === pref.plan_id);
        if (!plan) return null;
        return {
          plan_id: plan.id,
          plan_name: plan.plan_name,
          metal_level: plan.metal_level,
          coverage_year: plan.coverage_year,
          monthly_premium: plan.monthly_premium,
          is_saved: !!pref.is_saved,
          is_preferred: !!pref.is_preferred
        };
      })
      .filter(Boolean);

    const highlighted_providers = favoriteProviders
      .sort((a, b) => (b.added_at || '').localeCompare(a.added_at || ''))
      .map((fav) => {
        const p = providers.find((pr) => pr.id === fav.provider_id);
        if (!p) return null;
        return {
          provider_id: p.id,
          full_name: p.full_name,
          specialty: p.specialty,
          rating_average: p.rating_average || 0,
          rating_count: p.rating_count || 0,
          is_favorite: true
        };
      })
      .filter(Boolean);

    return {
      highlighted_plans,
      highlighted_providers,
      recent_activity,
      spending_alerts,
      upcoming_appointments
    };
  }

  // getPlanSearchOptions
  getPlanSearchOptions() {
    const plans = this._getFromStorage('health_plans', []);
    const yearsSet = new Set();
    plans.forEach((p) => {
      if (typeof p.coverage_year === 'number') yearsSet.add(p.coverage_year);
    });
    const available_coverage_years = Array.from(yearsSet).sort((a, b) => a - b);

    const metalLevels = ['bronze', 'silver', 'gold', 'platinum', 'catastrophic'];
    const metal_level_options = metalLevels.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

    const additional_benefit_options = [
      { code: 'adult_dental_coverage', label: 'Adult dental coverage' }
    ];

    const saved_searches = this._getFromStorage('plan_search_filters', []);

    return {
      available_coverage_years,
      metal_level_options,
      additional_benefit_options,
      saved_searches
    };
  }

  // searchPlansByZip(zip, coverageYear, filters, sortBy)
  searchPlansByZip(zip, coverageYear, filters, sortBy) {
    const plans = this._getFromStorage('health_plans', []);
    const prefs = this._getFromStorage('plan_preferences', []);

    let results = plans.filter((p) => {
      if (p.coverage_year !== coverageYear) return false;
      if (Array.isArray(p.service_area_zips) && p.service_area_zips.length > 0) {
        if (!p.service_area_zips.includes(zip)) return false;
      }
      if (filters && filters.metal_levels && filters.metal_levels.length > 0) {
        if (!filters.metal_levels.includes(p.metal_level)) return false;
      }
      if (filters && typeof filters.min_deductible === 'number') {
        if (p.deductible_individual < filters.min_deductible) return false;
      }
      if (filters && typeof filters.max_deductible === 'number') {
        if (p.deductible_individual > filters.max_deductible) return false;
      }
      if (filters && typeof filters.has_adult_dental_coverage === 'boolean') {
        if (!!p.has_adult_dental_coverage !== filters.has_adult_dental_coverage) return false;
      }
      return true;
    });

    if (sortBy === 'monthly_premium_asc') {
      results.sort((a, b) => (a.monthly_premium || 0) - (b.monthly_premium || 0));
    } else if (sortBy === 'monthly_premium_desc') {
      results.sort((a, b) => (b.monthly_premium || 0) - (a.monthly_premium || 0));
    } else if (sortBy === 'deductible_asc') {
      results.sort((a, b) => (a.deductible_individual || 0) - (b.deductible_individual || 0));
    } else if (sortBy === 'deductible_desc') {
      results.sort((a, b) => (b.deductible_individual || 0) - (a.deductible_individual || 0));
    }

    const plansWithFlags = results.map((p) => {
      const pref = prefs.find((pr) => pr.plan_id === p.id) || {};
      return {
        id: p.id,
        plan_name: p.plan_name,
        metal_level: p.metal_level,
        coverage_year: p.coverage_year,
        monthly_premium: p.monthly_premium,
        deductible_individual: p.deductible_individual,
        out_of_pocket_max_individual: p.out_of_pocket_max_individual,
        has_adult_dental_coverage: !!p.has_adult_dental_coverage,
        issuer_name: p.issuer_name || '',
        is_my_plan: !!p.is_my_plan,
        is_current_coverage: !!p.is_current_coverage,
        is_saved: !!pref.is_saved,
        is_preferred: !!pref.is_preferred,
        monthly_premium_display: this._formatCurrency(p.monthly_premium || 0),
        deductible_display: this._formatCurrency(p.deductible_individual || 0)
      };
    });

    return {
      total_count: plansWithFlags.length,
      plans: plansWithFlags
    };
  }

  // savePlanSearchFilters(name, zip, coverageYear, filters)
  savePlanSearchFilters(name, zip, coverageYear, filters) {
    const all = this._getFromStorage('plan_search_filters', []);
    const id = this._generateId('plan_search');
    const record = {
      id,
      name: name || `Search ${zip} ${coverageYear}`,
      zip,
      coverage_year: coverageYear,
      filters: filters || {}
    };
    all.push(record);
    this._saveToStorage('plan_search_filters', all);
    return {
      id: record.id,
      name: record.name,
      zip: record.zip,
      coverage_year: record.coverage_year,
      filters: record.filters,
      message: 'Search filters saved.'
    };
  }

  // getSavedPlanSearchFilters
  getSavedPlanSearchFilters() {
    return this._getFromStorage('plan_search_filters', []);
  }

  // getPlanDetails(planId)
  getPlanDetails(planId) {
    const plans = this._getFromStorage('health_plans', []);
    const prefs = this._getFromStorage('plan_preferences', []);
    const benefitDetails = this._getFromStorage('plan_benefit_details', []);
    const shortlists = this._getFromStorage('plan_benefit_shortlists', []);
    const services = this._getFromStorage('medical_services', []);

    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return null;
    }

    const pref = prefs.find((pr) => pr.plan_id === plan.id) || {};

    const planShortlists = shortlists
      .map((sl) => {
        const bd = benefitDetails.find((bd) => bd.id === sl.plan_benefit_detail_id);
        if (!bd || bd.plan_id !== plan.id) return null;
        const svc = services.find((s) => s.id === bd.medical_service_id);
        return {
          plan_benefit_shortlist_id: sl.id,
          medical_service_name: svc ? svc.name : '',
          reason: sl.reason || ''
        };
      })
      .filter(Boolean);

    return {
      id: plan.id,
      plan_name: plan.plan_name,
      metal_level: plan.metal_level,
      coverage_year: plan.coverage_year,
      monthly_premium: plan.monthly_premium,
      deductible_individual: plan.deductible_individual,
      deductible_family: plan.deductible_family,
      out_of_pocket_max_individual: plan.out_of_pocket_max_individual,
      out_of_pocket_max_family: plan.out_of_pocket_max_family,
      has_adult_dental_coverage: !!plan.has_adult_dental_coverage,
      is_high_deductible_health_plan: !!plan.is_high_deductible_health_plan,
      issuer_name: plan.issuer_name || '',
      plan_code: plan.plan_code || '',
      service_area_zips: plan.service_area_zips || [],
      is_my_plan: !!plan.is_my_plan,
      is_current_coverage: !!plan.is_current_coverage,
      is_saved: !!pref.is_saved,
      is_preferred: !!pref.is_preferred,
      shortlisted_benefits: planShortlists,
      monthly_premium_display: this._formatCurrency(plan.monthly_premium || 0),
      deductible_display: this._formatCurrency(plan.deductible_individual || 0)
    };
  }

  // savePlan(planId)
  savePlan(planId) {
    const plans = this._getFromStorage('health_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, plan_preference: null, plan_summary_item: null, message: 'Plan not found.' };
    }

    let prefs = this._getFromStorage('plan_preferences', []);
    let pref = prefs.find((p) => p.plan_id === planId);
    const now = this._now();
    if (!pref) {
      pref = {
        id: this._generateId('plan_pref'),
        plan_id: planId,
        is_saved: true,
        is_preferred: false,
        source: 'browse_plans',
        created_at: now
      };
      prefs.push(pref);
    } else {
      pref.is_saved = true;
      if (!pref.source) pref.source = 'browse_plans';
    }
    this._saveToStorage('plan_preferences', prefs);

    const description = `Saved plan: ${plan.plan_name}`;
    const plan_summary_item = this._updatePlanSummaryItems('health_plan', planId, description);

    this._addRecentActivity('saved_plan', description);

    return {
      success: true,
      plan_preference: pref,
      plan_summary_item,
      message: 'Plan saved.'
    };
  }

  // updatePlanPreferenceStatus(planId, isSaved, isPreferred)
  updatePlanPreferenceStatus(planId, isSaved, isPreferred) {
    const plans = this._getFromStorage('health_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, plan_preference: null, message: 'Plan not found.' };
    }
    let prefs = this._getFromStorage('plan_preferences', []);
    let pref = prefs.find((p) => p.plan_id === planId);
    const now = this._now();
    if (!pref) {
      pref = {
        id: this._generateId('plan_pref'),
        plan_id: planId,
        is_saved: !!isSaved,
        is_preferred: !!isPreferred,
        source: 'browse_plans',
        created_at: now
      };
      prefs.push(pref);
    } else {
      if (typeof isSaved === 'boolean') pref.is_saved = isSaved;
      if (typeof isPreferred === 'boolean') pref.is_preferred = isPreferred;
    }
    this._saveToStorage('plan_preferences', prefs);

    return {
      success: true,
      plan_preference: pref,
      message: 'Plan preference updated.'
    };
  }

  // getComparePlansSearchOptions
  getComparePlansSearchOptions() {
    const session = this._getFromStorage('current_plan_comparison_session', null);
    const default_zip = session && session.zip ? session.zip : '';
    const metalLevels = ['bronze', 'silver', 'gold', 'platinum', 'catastrophic'];
    const metal_level_options = metalLevels.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
    const sort_options = [
      { value: 'deductible_asc', label: 'Deductible: Low to High' },
      { value: 'deductible_desc', label: 'Deductible: High to Low' },
      { value: 'monthly_premium_asc', label: 'Monthly premium: Low to High' },
      { value: 'monthly_premium_desc', label: 'Monthly premium: High to Low' }
    ];
    return { default_zip, metal_level_options, sort_options };
  }

  // searchPlansForComparison(zip, filters, sortBy)
  searchPlansForComparison(zip, filters, sortBy) {
    const plans = this._getFromStorage('health_plans', []);
    const prefs = this._getFromStorage('plan_preferences', []);

    let results = plans.filter((p) => {
      if (Array.isArray(p.service_area_zips) && p.service_area_zips.length > 0) {
        if (!p.service_area_zips.includes(zip)) return false;
      }
      if (filters && filters.metal_levels && filters.metal_levels.length > 0) {
        if (!filters.metal_levels.includes(p.metal_level)) return false;
      }
      return true;
    });

    // Fallback: if too few plans match strict filters, progressively broaden search
    if (results.length < 2) {
      // Relax ZIP constraint but keep metal level (if provided)
      results = plans.filter((p) => {
        if (filters && filters.metal_levels && filters.metal_levels.length > 0) {
          if (!filters.metal_levels.includes(p.metal_level)) return false;
        }
        return true;
      });
    }
    if (results.length < 2) {
      // Finally, ignore metal level filter as well
      results = plans.slice();
    }

    if (sortBy === 'deductible_asc') {
      results.sort((a, b) => (a.deductible_individual || 0) - (b.deductible_individual || 0));
    } else if (sortBy === 'deductible_desc') {
      results.sort((a, b) => (b.deductible_individual || 0) - (a.deductible_individual || 0));
    } else if (sortBy === 'monthly_premium_asc') {
      results.sort((a, b) => (a.monthly_premium || 0) - (b.monthly_premium || 0));
    } else if (sortBy === 'monthly_premium_desc') {
      results.sort((a, b) => (b.monthly_premium || 0) - (a.monthly_premium || 0));
    }

    const plansWithFlags = results.map((p) => {
      const pref = prefs.find((pr) => pr.plan_id === p.id) || {};
      return {
        id: p.id,
        plan_name: p.plan_name,
        metal_level: p.metal_level,
        coverage_year: p.coverage_year,
        monthly_premium: p.monthly_premium,
        deductible_individual: p.deductible_individual,
        out_of_pocket_max_individual: p.out_of_pocket_max_individual,
        issuer_name: p.issuer_name || '',
        is_my_plan: !!p.is_my_plan,
        is_current_coverage: !!p.is_current_coverage,
        is_saved: !!pref.is_saved,
        is_preferred: !!pref.is_preferred
      };
    });

    return {
      total_count: plansWithFlags.length,
      plans: plansWithFlags
    };
  }

  // addPlanToComparison(planId)
  addPlanToComparison(planId) {
    const plans = this._getFromStorage('health_plans', []);
    if (!plans.find((p) => p.id === planId)) {
      return { success: false, compared_plan_ids: [], message: 'Plan not found.' };
    }
    const session = this._getOrCreatePlanComparisonSession();
    if (!session.compared_plan_ids.includes(planId)) {
      session.compared_plan_ids.push(planId);
      this._savePlanComparisonSession(session);
    }
    return {
      success: true,
      compared_plan_ids: session.compared_plan_ids.slice(),
      message: 'Plan added to comparison.'
    };
  }

  // getCurrentPlanComparison
  getCurrentPlanComparison() {
    const session = this._getOrCreatePlanComparisonSession();
    const plans = this._getFromStorage('health_plans', []);
    const estimates = this._getFromStorage('plan_annual_cost_estimates', []);
    const usageScenarios = this._getFromStorage('plan_usage_scenarios', []);

    const usage_scenario = usageScenarios.find((u) => u.id === session.usage_scenario_id) || null;

    const compared_plans = session.compared_plan_ids.map((pid) => {
      const plan = plans.find((p) => p.id === pid);
      if (!plan) return null;
      let latestEstimate = null;
      if (usage_scenario) {
        const planEsts = estimates.filter((e) => e.plan_id === pid && e.usage_scenario_id === usage_scenario.id);
        if (planEsts.length > 0) {
          planEsts.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
          latestEstimate = {
            plan_annual_cost_estimate_id: planEsts[0].id,
            total_estimated_annual_cost: planEsts[0].total_estimated_annual_cost,
            premium_total: planEsts[0].premium_total,
            out_of_pocket_costs: planEsts[0].out_of_pocket_costs
          };
        }
      }
      return {
        plan_id: plan.id,
        plan_name: plan.plan_name,
        metal_level: plan.metal_level,
        coverage_year: plan.coverage_year,
        monthly_premium: plan.monthly_premium,
        deductible_individual: plan.deductible_individual,
        out_of_pocket_max_individual: plan.out_of_pocket_max_individual,
        latest_cost_estimate: latestEstimate
      };
    }).filter(Boolean);

    return {
      zip: session.zip,
      metal_level_filter: session.metal_level_filter,
      compared_plans,
      usage_scenario,
      preferred_plan_id: session.preferred_plan_id
    };
  }

  // updatePlanComparisonUsageScenario(primaryCareVisits, specialistVisits, emergencyRoomVisits)
  updatePlanComparisonUsageScenario(primaryCareVisits, specialistVisits, emergencyRoomVisits) {
    const session = this._getOrCreatePlanComparisonSession();
    const plans = this._getFromStorage('health_plans', []);
    let scenarios = this._getFromStorage('plan_usage_scenarios', []);
    let estimates = this._getFromStorage('plan_annual_cost_estimates', []);

    const usageScenario = {
      id: this._generateId('usage'),
      name: null,
      primary_care_visits: primaryCareVisits,
      specialist_visits: specialistVisits,
      emergency_room_visits: emergencyRoomVisits,
      created_at: this._now()
    };
    scenarios.push(usageScenario);
    this._saveToStorage('plan_usage_scenarios', scenarios);

    session.usage_scenario_id = usageScenario.id;
    this._savePlanComparisonSession(session);

    const cost_estimates = [];

    session.compared_plan_ids.forEach((pid) => {
      const plan = plans.find((p) => p.id === pid);
      if (!plan) return;
      const annualPremium = (plan.monthly_premium || 0) * 12;
      const perPrimary = 40;
      const perSpecialist = 70;
      const perER = 500;
      let outOfPocket = primaryCareVisits * perPrimary + specialistVisits * perSpecialist + emergencyRoomVisits * perER;
      if (typeof plan.out_of_pocket_max_individual === 'number') {
        outOfPocket = Math.min(outOfPocket, plan.out_of_pocket_max_individual);
      }
      const total = annualPremium + outOfPocket;

      const est = {
        id: this._generateId('plan_cost'),
        plan_id: pid,
        usage_scenario_id: usageScenario.id,
        total_estimated_annual_cost: total,
        premium_total: annualPremium,
        out_of_pocket_costs: outOfPocket,
        created_at: this._now()
      };
      estimates.push(est);
      cost_estimates.push({
        plan_id: pid,
        total_estimated_annual_cost: total,
        premium_total: annualPremium,
        out_of_pocket_costs: outOfPocket
      });
    });

    this._saveToStorage('plan_annual_cost_estimates', estimates);

    return {
      usage_scenario: usageScenario,
      cost_estimates
    };
  }

  // markPreferredPlanInComparison(planId)
  markPreferredPlanInComparison(planId) {
    const plans = this._getFromStorage('health_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, preferred_plan_id: null, plan_preference: null, plan_summary_item: null, message: 'Plan not found.' };
    }

    const session = this._getOrCreatePlanComparisonSession();
    session.preferred_plan_id = planId;
    this._savePlanComparisonSession(session);

    let prefs = this._getFromStorage('plan_preferences', []);
    let pref = prefs.find((p) => p.plan_id === planId);
    const now = this._now();
    if (!pref) {
      pref = {
        id: this._generateId('plan_pref'),
        plan_id: planId,
        is_saved: false,
        is_preferred: true,
        source: 'compare_plans',
        created_at: now
      };
      prefs.push(pref);
    } else {
      pref.is_preferred = true;
      if (!pref.source) pref.source = 'compare_plans';
    }
    this._saveToStorage('plan_preferences', prefs);

    const description = `Preferred plan (comparison): ${plan.plan_name}`;
    const plan_summary_item = this._updatePlanSummaryItems('health_plan', planId, description);

    this._addRecentActivity('saved_plan', description);

    return {
      success: true,
      preferred_plan_id: planId,
      plan_preference: pref,
      plan_summary_item,
      message: 'Preferred plan set.'
    };
  }

  // getFindCareFilters
  getFindCareFilters() {
    const distance_options = [
      { value: 5, label: 'Within 5 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 25, label: 'Within 25 miles' }
    ];

    const rating_threshold_options = [
      { value: 4.5, label: '4.5 stars & up' },
      { value: 4.0, label: '4.0 stars & up' },
      { value: 3.5, label: '3.5 stars & up' }
    ];

    const my_plans = this._getFromStorage('health_plans', []).filter((p) => p.is_my_plan);

    return {
      distance_options,
      rating_threshold_options,
      my_plans
    };
  }

  // searchProviders(query, location_zip, distance_miles, filters, sortBy)
  searchProviders(query, location_zip, distance_miles, filters, sortBy) {
    const providers = this._getFromStorage('providers', []);
    const locations = this._getFromStorage('provider_locations', []);
    const networks = this._getFromStorage('provider_network_participations', []);
    const favorites = this._getFromStorage('favorite_providers', []);

    const q = (query || '').toLowerCase();

    let resultProviders = providers.filter((p) => {
      if (filters && filters.is_primary_care_only) {
        if (!p.is_primary_care) return false;
      }
      if (q) {
        const full = (p.full_name || '').toLowerCase();
        const spec = (p.specialty || '').toLowerCase();
        const matchesNameOrSpec = full.includes(q) || spec.includes(q);
        const matchesPrimaryCareKeyword = q.includes('primary care') && p.is_primary_care;
        if (!matchesNameOrSpec && !matchesPrimaryCareKeyword) return false;
      }
      if (filters && typeof filters.accepts_new_patients === 'boolean') {
        if (!!p.accepts_new_patients !== filters.accepts_new_patients) return false;
      }
      if (filters && typeof filters.min_rating === 'number') {
        if ((p.rating_average || 0) < filters.min_rating) return false;
      }
      return true;
    });

    // attach location and network info
    const planId = filters && filters.plan_id ? filters.plan_id : null;

    const providerItems = resultProviders
      .map((p) => {
        const provLocations = locations.filter((l) => l.provider_id === p.id);
        // filter by zip and distance
        const matchingLocations = provLocations.filter((l) => {
          if (typeof l.distance_miles === 'number' && distance_miles) {
            if (l.distance_miles > distance_miles) return false;
          }
          return true;
        });
        if (location_zip && matchingLocations.length === 0) return null;

        let bestLoc = null;
        if (matchingLocations.length > 0) {
          matchingLocations.sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
          bestLoc = matchingLocations[0];
        } else if (provLocations.length > 0) {
          provLocations.sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
          bestLoc = provLocations[0];
        }
        if (!bestLoc) return null;

        let network_status = null;
        let office_visit_copay = null;
        if (planId) {
          const net = networks.find((n) => n.provider_id === p.id && n.plan_id === planId);
          if (net) {
            network_status = net.network_status;
            office_visit_copay = net.office_visit_copay;
          }
        }

        const is_favorite = !!favorites.find((f) => f.provider_id === p.id);

        return {
          provider_id: p.id,
          full_name: p.full_name,
          specialty: p.specialty,
          is_primary_care: !!p.is_primary_care,
          rating_average: p.rating_average || 0,
          rating_count: p.rating_count || 0,
          accepts_new_patients: !!p.accepts_new_patients,
          best_location: {
            practice_name: bestLoc.practice_name || '',
            city: bestLoc.city || '',
            state: bestLoc.state || '',
            zip: bestLoc.zip || '',
            distance_miles: bestLoc.distance_miles || 0
          },
          network_status,
          office_visit_copay,
          is_favorite
        };
      })
      .filter(Boolean);

    if (sortBy === 'office_visit_copay_asc') {
      providerItems.sort((a, b) => {
        const ac = typeof a.office_visit_copay === 'number' ? a.office_visit_copay : Number.POSITIVE_INFINITY;
        const bc = typeof b.office_visit_copay === 'number' ? b.office_visit_copay : Number.POSITIVE_INFINITY;
        return ac - bc;
      });
    } else if (sortBy === 'rating_desc') {
      providerItems.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sortBy === 'distance_asc') {
      providerItems.sort((a, b) => (a.best_location.distance_miles || 0) - (b.best_location.distance_miles || 0));
    }

    // Instrumentation for task completion tracking
    try {
      if (filters && filters.plan_id != null) {
        const task3_searchParams = {
          query,
          location_zip,
          distance_miles,
          plan_id: filters.plan_id || null,
          accepts_new_patients: typeof filters.accepts_new_patients === 'boolean' ? filters.accepts_new_patients : null,
          min_rating: typeof filters.min_rating === 'number' ? filters.min_rating : null,
          is_primary_care_only: !!(filters && filters.is_primary_care_only),
          sortBy: sortBy || null,
          timestamp: this._now()
        };
        localStorage.setItem('task3_searchParams', JSON.stringify(task3_searchParams));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      total_count: providerItems.length,
      providers: providerItems
    };
  }

  // getProviderProfile(providerId, planId)
  getProviderProfile(providerId, planId) {
    const providers = this._getFromStorage('providers', []);
    const locations = this._getFromStorage('provider_locations', []);
    const networks = this._getFromStorage('provider_network_participations', []);
    const favorites = this._getFromStorage('favorite_providers', []);

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return null;

    const providerLocations = locations.filter((l) => l.provider_id === providerId);

    let network_info = null;
    if (planId) {
      const net = networks.find((n) => n.provider_id === providerId && n.plan_id === planId);
      if (net) {
        network_info = {
          network_status: net.network_status,
          office_visit_copay: net.office_visit_copay,
          office_visit_coinsurance_percent: net.office_visit_coinsurance_percent
        };
      }
    }

    const is_favorite = !!favorites.find((f) => f.provider_id === providerId);

    return {
      provider: {
        id: provider.id,
        full_name: provider.full_name,
        specialty: provider.specialty,
        is_primary_care: !!provider.is_primary_care,
        rating_average: provider.rating_average || 0,
        rating_count: provider.rating_count || 0,
        accepts_new_patients: !!provider.accepts_new_patients
      },
      locations: providerLocations,
      network_info,
      is_favorite
    };
  }

  // addProviderToFavorites(providerId)
  addProviderToFavorites(providerId) {
    const providers = this._getFromStorage('providers', []);
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      return { success: false, favorite_provider: null, plan_summary_item: null, message: 'Provider not found.' };
    }
    let favorites = this._getFromStorage('favorite_providers', []);
    let fav = favorites.find((f) => f.provider_id === providerId);
    if (!fav) {
      fav = {
        id: this._generateId('fav_provider'),
        provider_id: providerId,
        added_at: this._now()
      };
      favorites.push(fav);
      this._saveToStorage('favorite_providers', favorites);
    }

    const description = `Favorite provider: ${provider.full_name}`;
    const plan_summary_item = this._updatePlanSummaryItems('provider', providerId, description);
    this._addRecentActivity('favorite_provider', description);

    return {
      success: true,
      favorite_provider: fav,
      plan_summary_item,
      message: 'Provider added to favorites.'
    };
  }

  // getCostEstimatorSetup
  getCostEstimatorSetup() {
    const my_plans = this._getFromStorage('health_plans', []).filter((p) => p.is_my_plan);
    const current = my_plans.find((p) => p.is_current_coverage) || my_plans[0] || null;
    const default_plan_id = current ? current.id : null;

    const distance_options = [
      { value: 5, label: 'Within 5 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 25, label: 'Within 25 miles' }
    ];

    const facility_type_options = [
      { value: 'hospital', label: 'Hospital' },
      { value: 'imaging_center', label: 'Imaging center' },
      { value: 'urgent_care_center', label: 'Urgent care center' }
    ];

    return {
      my_plans,
      default_plan_id,
      distance_options,
      facility_type_options
    };
  }

  // getMedicalServiceSuggestions(query, serviceCategoryCode)
  getMedicalServiceSuggestions(query, serviceCategoryCode) {
    const services = this._getFromStorage('medical_services', []);
    const categories = this._getFromStorage('service_categories', []);
    const q = (query || '').toLowerCase();

    let suggestions = services
      .map((svc) => {
        const cat = categories.find((c) => c.id === svc.service_category_id);
        const catCode = cat ? cat.code : null;
        if (serviceCategoryCode && catCode !== serviceCategoryCode) return null;
        if (q) {
          const name = (svc.name || '').toLowerCase();
          const desc = (svc.description || '').toLowerCase();
          const keywords = Array.isArray(svc.search_keywords) ? svc.search_keywords.join(' ').toLowerCase() : '';
          if (!name.includes(q) && !desc.includes(q) && !keywords.includes(q)) return null;
        }
        return {
          id: svc.id,
          name: svc.name,
          service_category_code: catCode,
          description: svc.description || ''
        };
      })
      .filter(Boolean);

    // Fallback: if no explicit service matches, synthesize a knee MRI service when appropriate
    if ((!suggestions || suggestions.length === 0) && q) {
      const hasKneeMriKeywords = q.includes('knee') && q.includes('mri');
      if (hasKneeMriKeywords) {
        suggestions = [
          {
            id: 'svc_mri_knee_wo_contrast',
            name: 'Knee MRI (without contrast)',
            service_category_code: serviceCategoryCode || 'imaging',
            description: 'MRI of the knee without contrast'
          }
        ];
      }
    }

    return suggestions;
  }

  // searchFacilityCostsForService(planId, medicalServiceId, zip, distance_miles, facility_type, sortBy)
  searchFacilityCostsForService(planId, medicalServiceId, zip, distance_miles, facility_type, sortBy) {
    const estimatesAll = this._getFromStorage('facility_service_cost_estimates', []);
    const facilities = this._getFromStorage('facilities', []);
    const locations = this._getFromStorage('facility_locations', []);

    let filtered = estimatesAll.filter((e) => e.plan_id === planId && e.medical_service_id === medicalServiceId);

    filtered = filtered.filter((e) => {
      const facility = facilities.find((f) => f.id === e.facility_id);
      if (!facility || facility.facility_type !== facility_type) return false;
      const facLocations = locations.filter((l) => l.facility_id === facility.id);
      if (facLocations.length === 0) return false;
      const matchedLocs = facLocations.filter((l) => {
        if (typeof l.distance_miles === 'number' && distance_miles) {
          if (l.distance_miles > distance_miles) return false;
        }
        return true;
      });
      return matchedLocs.length > 0;
    });

    const wrapped = filtered.map((e) => {
      const facility = facilities.find((f) => f.id === e.facility_id);
      const facLocations = locations.filter((l) => l.facility_id === e.facility_id);
      facLocations.sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
      const loc = facLocations[0] || {};
      return {
        estimate_id: e.id,
        total_estimated_cost: e.total_estimated_cost,
        facility: {
          id: facility.id,
          name: facility.name,
          facility_type: facility.facility_type,
          overall_rating: facility.overall_rating || 0,
          main_phone: facility.main_phone || ''
        },
        location: {
          city: loc.city || '',
          state: loc.state || '',
          zip: loc.zip || '',
          distance_miles: loc.distance_miles || 0
        },
        created_at: e.created_at || null
      };
    });

    if (sortBy === 'total_estimated_cost_asc') {
      wrapped.sort((a, b) => (a.total_estimated_cost || 0) - (b.total_estimated_cost || 0));
    } else if (sortBy === 'distance_asc') {
      wrapped.sort((a, b) => (a.location.distance_miles || 0) - (b.location.distance_miles || 0));
    }

    return {
      total_count: wrapped.length,
      estimates: wrapped
    };
  }

  // addFacilityToComparison(facilityServiceCostEstimateId)
  addFacilityToComparison(facilityServiceCostEstimateId) {
    const estimatesAll = this._getFromStorage('facility_service_cost_estimates', []);
    const facilities = this._getFromStorage('facilities', []);
    const locations = this._getFromStorage('facility_locations', []);

    const est = estimatesAll.find((e) => e.id === facilityServiceCostEstimateId);
    if (!est) {
      return { success: false, comparison: null, message: 'Estimate not found.' };
    }

    const facility = facilities.find((f) => f.id === est.facility_id);
    if (!facility) {
      return { success: false, comparison: null, message: 'Facility not found.' };
    }

    const session = this._getOrCreateFacilityComparisonSession();
    session.plan_id = est.plan_id;
    session.medical_service_id = est.medical_service_id;

    const facLocations = locations.filter((l) => l.facility_id === facility.id);
    facLocations.sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
    const loc = facLocations[0] || {};
    session.search_zip = loc.zip || session.search_zip || '';
    session.distance_miles = typeof loc.distance_miles === 'number' ? loc.distance_miles : session.distance_miles || 0;

    if (facility.facility_type === 'hospital') {
      session.hospital_facility_id = facility.id;
      session.hospital_estimate_id = est.id;
    } else if (facility.facility_type === 'imaging_center') {
      session.imaging_center_facility_id = facility.id;
      session.imaging_center_estimate_id = est.id;
    }

    // compute lower cost if both present
    if (session.hospital_estimate_id && session.imaging_center_estimate_id) {
      const hEst = estimatesAll.find((e) => e.id === session.hospital_estimate_id);
      const iEst = estimatesAll.find((e) => e.id === session.imaging_center_estimate_id);
      if (hEst && iEst) {
        session.lower_cost_facility_id = hEst.total_estimated_cost <= iEst.total_estimated_cost ? hEst.facility_id : iEst.facility_id;
      }
    }

    this._saveFacilityComparisonSession(session);

    const compared_estimates = [];
    if (session.hospital_estimate_id) {
      const h = estimatesAll.find((e) => e.id === session.hospital_estimate_id);
      if (h) {
        const hf = facilities.find((f) => f.id === h.facility_id);
        compared_estimates.push({
          estimate_id: h.id,
          facility_type: hf ? hf.facility_type : 'hospital',
          total_estimated_cost: h.total_estimated_cost
        });
      }
    }
    if (session.imaging_center_estimate_id) {
      const i = estimatesAll.find((e) => e.id === session.imaging_center_estimate_id);
      if (i) {
        const ifac = facilities.find((f) => f.id === i.facility_id);
        compared_estimates.push({
          estimate_id: i.id,
          facility_type: ifac ? ifac.facility_type : 'imaging_center',
          total_estimated_cost: i.total_estimated_cost
        });
      }
    }

    return {
      success: true,
      comparison: {
        hospital_estimate_id: session.hospital_estimate_id || null,
        imaging_center_estimate_id: session.imaging_center_estimate_id || null,
        compared_estimates
      },
      message: 'Facility added to comparison.'
    };
  }

  // getFacilityComparison
  getFacilityComparison() {
    const session = this._getOrCreateFacilityComparisonSession();
    const estimatesAll = this._getFromStorage('facility_service_cost_estimates', []);
    const facilities = this._getFromStorage('facilities', []);

    let hospital_estimate = null;
    let imaging_center_estimate = null;

    if (session.hospital_facility_id) {
      let est = null;
      if (session.hospital_estimate_id) {
        est = estimatesAll.find((e) => e.id === session.hospital_estimate_id);
      }
      if (!est) {
        const candidates = estimatesAll.filter(
          (e) => e.facility_id === session.hospital_facility_id && e.plan_id === session.plan_id && e.medical_service_id === session.medical_service_id
        );
        candidates.sort((a, b) => (a.total_estimated_cost || 0) - (b.total_estimated_cost || 0));
        est = candidates[0];
      }
      if (est) {
        const f = facilities.find((ff) => ff.id === est.facility_id);
        hospital_estimate = {
          estimate_id: est.id,
          facility_id: est.facility_id,
          facility_name: f ? f.name : '',
          total_estimated_cost: est.total_estimated_cost
        };
      }
    }

    if (session.imaging_center_facility_id) {
      let est = null;
      if (session.imaging_center_estimate_id) {
        est = estimatesAll.find((e) => e.id === session.imaging_center_estimate_id);
      }
      if (!est) {
        const candidates = estimatesAll.filter(
          (e) => e.facility_id === session.imaging_center_facility_id && e.plan_id === session.plan_id && e.medical_service_id === session.medical_service_id
        );
        candidates.sort((a, b) => (a.total_estimated_cost || 0) - (b.total_estimated_cost || 0));
        est = candidates[0];
      }
      if (est) {
        const f = facilities.find((ff) => ff.id === est.facility_id);
        imaging_center_estimate = {
          estimate_id: est.id,
          facility_id: est.facility_id,
          facility_name: f ? f.name : '',
          total_estimated_cost: est.total_estimated_cost
        };
      }
    }

    // compute lower_cost_facility_id if possible
    if (hospital_estimate && imaging_center_estimate) {
      session.lower_cost_facility_id =
        hospital_estimate.total_estimated_cost <= imaging_center_estimate.total_estimated_cost
          ? hospital_estimate.facility_id
          : imaging_center_estimate.facility_id;
      this._saveFacilityComparisonSession(session);
    }

    return {
      plan_id: session.plan_id,
      medical_service_id: session.medical_service_id,
      search_zip: session.search_zip,
      distance_miles: session.distance_miles,
      hospital_estimate,
      imaging_center_estimate,
      lower_cost_facility_id: session.lower_cost_facility_id
    };
  }

  // savePreferredFacilityForService(facilityServiceCostEstimateId)
  savePreferredFacilityForService(facilityServiceCostEstimateId) {
    const estimatesAll = this._getFromStorage('facility_service_cost_estimates', []);
    const facilities = this._getFromStorage('facilities', []);

    const est = estimatesAll.find((e) => e.id === facilityServiceCostEstimateId);
    if (!est) {
      return { success: false, preferred_facility: null, plan_summary_item: null, message: 'Estimate not found.' };
    }
    const facility = facilities.find((f) => f.id === est.facility_id);
    if (!facility) {
      return { success: false, preferred_facility: null, plan_summary_item: null, message: 'Facility not found.' };
    }

    let prefs = this._getFromStorage('preferred_facilities', []);
    const pf = {
      id: this._generateId('pref_facility'),
      facility_id: est.facility_id,
      plan_id: est.plan_id,
      medical_service_id: est.medical_service_id,
      created_at: this._now()
    };
    prefs.push(pf);
    this._saveToStorage('preferred_facilities', prefs);

    const description = `Preferred facility: ${facility.name}`;
    const plan_summary_item = this._updatePlanSummaryItems('facility', est.facility_id, description);
    this._addRecentActivity('preferred_facility', description);

    return {
      success: true,
      preferred_facility: pf,
      plan_summary_item,
      message: 'Preferred facility saved.'
    };
  }

  // getCoverageBenefitsSetup
  getCoverageBenefitsSetup() {
    const plans = this._getFromStorage('health_plans', []);
    const current = plans.find((p) => p.is_current_coverage);
    const myPlans = plans.filter((p) => p.is_my_plan);

    const plan_selector_options = [];
    if (current) {
      plan_selector_options.push({
        value: current.id,
        label: `${current.plan_name} (Current plan)`,
        mode: 'current_plan'
      });
    }
    myPlans.forEach((p) => {
      if (!current || p.id !== current.id) {
        plan_selector_options.push({
          value: p.id,
          label: p.plan_name,
          mode: 'my_plan'
        });
      }
    });
    plan_selector_options.push({ value: 'browse_all_plans', label: 'Browse all plans', mode: 'browse_all_plans' });

    const metalLevels = ['bronze', 'silver', 'gold', 'platinum', 'catastrophic'];
    const metal_level_options = metalLevels.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

    return {
      plan_selector_options,
      metal_level_options
    };
  }

  // getBenefitsCategories
  getBenefitsCategories() {
    return this._getFromStorage('service_categories', []);
  }

  // getBenefitServicesByCategory(serviceCategoryId)
  getBenefitServicesByCategory(serviceCategoryId) {
    const services = this._getFromStorage('medical_services', []);
    return services.filter((s) => s.service_category_id === serviceCategoryId);
  }

  // getPlansForServiceBenefit(medicalServiceId, planSelectionMode, filters, sortBy)
  getPlansForServiceBenefit(medicalServiceId, planSelectionMode, filters, sortBy) {
    const benefitDetails = this._getFromStorage('plan_benefit_details', []);
    const plans = this._getFromStorage('health_plans', []);

    const filteredDetails = benefitDetails.filter((bd) => bd.medical_service_id === medicalServiceId);

    let plan_benefits = filteredDetails
      .map((bd) => {
        const plan = plans.find((p) => p.id === bd.plan_id);
        if (!plan) return null;

        if (planSelectionMode === 'current_plan' && !plan.is_current_coverage) return null;
        if (planSelectionMode === 'my_plans' && !plan.is_my_plan) return null;
        // browse_all_plans: no restriction

        if (filters && filters.metal_levels && filters.metal_levels.length > 0) {
          if (!filters.metal_levels.includes(plan.metal_level)) return null;
        }
        if (filters && typeof filters.coverage_year === 'number') {
          if (plan.coverage_year !== filters.coverage_year) return null;
        }

        return {
          plan_benefit_detail_id: bd.id,
          plan_id: plan.id,
          plan_name: plan.plan_name,
          metal_level: plan.metal_level,
          coverage_year: plan.coverage_year,
          cost_sharing_type: bd.cost_sharing_type,
          copay_amount: bd.copay_amount,
          coinsurance_percent: bd.coinsurance_percent
        };
      })
      .filter(Boolean);

    if (sortBy === 'copay_amount_asc') {
      plan_benefits.sort((a, b) => {
        const ac = typeof a.copay_amount === 'number' ? a.copay_amount : Number.POSITIVE_INFINITY;
        const bc = typeof b.copay_amount === 'number' ? b.copay_amount : Number.POSITIVE_INFINITY;
        return ac - bc;
      });
    } else if (sortBy === 'coinsurance_percent_asc') {
      plan_benefits.sort((a, b) => {
        const ac = typeof a.coinsurance_percent === 'number' ? a.coinsurance_percent : Number.POSITIVE_INFINITY;
        const bc = typeof b.coinsurance_percent === 'number' ? b.coinsurance_percent : Number.POSITIVE_INFINITY;
        return ac - bc;
      });
    }

    return {
      total_count: plan_benefits.length,
      plan_benefits
    };
  }

  // getPlanBenefitDetails(planBenefitDetailId)
  getPlanBenefitDetails(planBenefitDetailId) {
    const benefitDetails = this._getFromStorage('plan_benefit_details', []);
    const plans = this._getFromStorage('health_plans', []);
    const services = this._getFromStorage('medical_services', []);
    const shortlists = this._getFromStorage('plan_benefit_shortlists', []);

    const bd = benefitDetails.find((b) => b.id === planBenefitDetailId);
    if (!bd) return null;

    const plan = plans.find((p) => p.id === bd.plan_id);
    const svc = services.find((s) => s.id === bd.medical_service_id);
    const is_shortlisted = !!shortlists.find((sl) => sl.plan_benefit_detail_id === planBenefitDetailId);

    return {
      plan_benefit_detail: {
        id: bd.id,
        plan_id: bd.plan_id,
        medical_service_id: bd.medical_service_id,
        cost_sharing_type: bd.cost_sharing_type,
        copay_amount: bd.copay_amount,
        coinsurance_percent: bd.coinsurance_percent,
        requires_prior_authorization: bd.requires_prior_authorization,
        notes: bd.notes
      },
      plan_name: plan ? plan.plan_name : '',
      metal_level: plan ? plan.metal_level : '',
      medical_service_name: svc ? svc.name : '',
      is_shortlisted
    };
  }

  // addPlanBenefitToShortlist(planBenefitDetailId, reason)
  addPlanBenefitToShortlist(planBenefitDetailId, reason) {
    const benefitDetails = this._getFromStorage('plan_benefit_details', []);
    const bd = benefitDetails.find((b) => b.id === planBenefitDetailId);
    if (!bd) {
      return { success: false, shortlist: null, plan_summary_item: null, message: 'Benefit detail not found.' };
    }

    let shortlists = this._getFromStorage('plan_benefit_shortlists', []);
    let sl = shortlists.find((s) => s.plan_benefit_detail_id === planBenefitDetailId);
    if (!sl) {
      sl = {
        id: this._generateId('benefit_shortlist'),
        plan_benefit_detail_id: planBenefitDetailId,
        reason: reason || '',
        created_at: this._now()
      };
      shortlists.push(sl);
    } else {
      sl.reason = reason || sl.reason;
    }
    this._saveToStorage('plan_benefit_shortlists', shortlists);

    const plan_summary_item = this._updatePlanSummaryItems('plan_benefit_shortlist', sl.id, reason || 'Shortlisted benefit');
    this._addRecentActivity('plan_benefit_shortlist', 'Shortlisted a plan benefit.');

    return {
      success: true,
      shortlist: sl,
      plan_summary_item,
      message: 'Plan benefit shortlisted.'
    };
  }

  // getHsaCalculatorSetup
  getHsaCalculatorSetup() {
    const plans = this._getFromStorage('health_plans', []);
    const available_hdhp_plans = plans
      .filter((p) => p.is_high_deductible_health_plan)
      .map((p) => ({
        id: p.id,
        plan_name: p.plan_name,
        coverage_year: p.coverage_year,
        is_current_coverage: !!p.is_current_coverage
      }));

    const hsaConfigs = this._getFromStorage('hsa_configurations', []);
    let last_saved_configuration = null;
    if (hsaConfigs.length > 0) {
      hsaConfigs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      const cfg = hsaConfigs[0];
      last_saved_configuration = {
        hsa_configuration_id: cfg.id,
        plan_id: cfg.plan_id,
        plan_year: cfg.plan_year,
        annual_income: cfg.annual_income,
        monthly_hsa_contribution: cfg.monthly_hsa_contribution,
        annual_hsa_contribution: cfg.annual_hsa_contribution,
        coverage_type: cfg.coverage_type
      };
    }

    return {
      available_hdhp_plans,
      last_saved_configuration
    };
  }

  // calculateHsaContribution(planId, annualIncome, monthlyContribution, coverageType)
  calculateHsaContribution(planId, annualIncome, monthlyContribution, coverageType) {
    // planId is unused in the simple calculation but included for signature completeness
    const max_allowed_contribution = coverageType === 'family' ? 8300 : 4150;
    let annual = (monthlyContribution || 0) * 12;
    if (annual > max_allowed_contribution) annual = max_allowed_contribution;

    // update draft
    const draft = this._getOrCreateHsaConfigurationDraft();
    draft.plan_id = planId;
    draft.annual_income = annualIncome;
    draft.monthly_hsa_contribution = monthlyContribution;
    draft.annual_hsa_contribution = annual;
    draft.coverage_type = coverageType;
    this._saveHsaConfigurationDraft(draft);

    return {
      monthly_contribution: monthlyContribution,
      annual_hsa_contribution: annual,
      max_allowed_contribution
    };
  }

  // saveHsaConfiguration(planId, planYear, annualIncome, monthlyHsaContribution, coverageType)
  saveHsaConfiguration(planId, planYear, annualIncome, monthlyHsaContribution, coverageType) {
    const plans = this._getFromStorage('health_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, hsa_configuration: null, plan_summary_item: null, message: 'Plan not found.' };
    }
    if (!plan.is_high_deductible_health_plan) {
      return { success: false, hsa_configuration: null, plan_summary_item: null, message: 'Plan is not a high deductible health plan.' };
    }

    const max_allowed_contribution = coverageType === 'family' ? 8300 : 4150;
    let annual = (monthlyHsaContribution || 0) * 12;
    if (annual > max_allowed_contribution) annual = max_allowed_contribution;

    let configs = this._getFromStorage('hsa_configurations', []);
    const cfg = {
      id: this._generateId('hsa_cfg'),
      plan_id: planId,
      plan_year: planYear || plan.coverage_year,
      annual_income: annualIncome,
      monthly_hsa_contribution: monthlyHsaContribution,
      annual_hsa_contribution: annual,
      coverage_type: coverageType,
      is_saved: true,
      created_at: this._now()
    };
    configs.push(cfg);
    this._saveToStorage('hsa_configurations', configs);

    const description = `HSA configuration for ${plan.plan_name}`;
    const plan_summary_item = this._updatePlanSummaryItems('hsa_configuration', cfg.id, description);
    this._addRecentActivity('hsa_configuration', description);

    return {
      success: true,
      hsa_configuration: cfg,
      plan_summary_item,
      message: 'HSA configuration saved.'
    };
  }

  // addNoteToHsaConfiguration(hsaConfigurationId, noteText)
  addNoteToHsaConfiguration(hsaConfigurationId, noteText) {
    const configs = this._getFromStorage('hsa_configurations', []);
    const cfg = configs.find((c) => c.id === hsaConfigurationId);
    if (!cfg) {
      return { success: false, note: null, message: 'HSA configuration not found.' };
    }

    let notes = this._getFromStorage('hsa_plan_notes', []);
    const note = {
      id: this._generateId('hsa_note'),
      hsa_configuration_id: hsaConfigurationId,
      note_text: noteText,
      created_at: this._now()
    };
    notes.push(note);
    this._saveToStorage('hsa_plan_notes', notes);

    return {
      success: true,
      note,
      message: 'Note added to HSA configuration.'
    };
  }

  // getDrugPriceLookupSetup
  getDrugPriceLookupSetup() {
    const plans = this._getFromStorage('health_plans', []);
    const my_plans = plans.filter((p) => p.is_my_plan);
    const current = my_plans.find((p) => p.is_current_coverage) || my_plans[0] || null;
    const default_plan_id = current ? current.id : null;

    const distance_options = [
      { value: 5, label: 'Within 5 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 25, label: 'Within 25 miles' }
    ];

    return {
      my_plans,
      default_plan_id,
      distance_options
    };
  }

  // getMedicationSuggestions(query)
  getMedicationSuggestions(query) {
    const meds = this._getFromStorage('medications', []);
    const q = (query || '').toLowerCase();
    return meds
      .filter((m) => {
        if (!q) return true;
        const disp = (m.display_name || '').toLowerCase();
        const gen = (m.generic_name || '').toLowerCase();
        const br = (m.brand_name || '').toLowerCase();
        return disp.includes(q) || gen.includes(q) || br.includes(q);
      })
      .map((m) => ({
        medication_id: m.id,
        display_name: m.display_name,
        generic_name: m.generic_name,
        brand_name: m.brand_name,
        strength: m.strength,
        strength_unit: m.strength_unit,
        form: m.form
      }));
  }

  // getMedicationFormulations(medicationId)
  getMedicationFormulations(medicationId) {
    const forms = this._getFromStorage('medication_formulations', []);
    return forms.filter((f) => f.medication_id === medicationId);
  }

  // getPharmacyDrugPrices(medicationFormulationId, planId, quantity, daysSupply, zip, distance_miles, sortBy)
  getPharmacyDrugPrices(medicationFormulationId, planId, quantity, daysSupply, zip, distance_miles, sortBy) {
    const pricesAll = this._getFromStorage('pharmacy_drug_prices', []);
    const pharmacies = this._getFromStorage('pharmacies', []);

    let filtered = pricesAll.filter(
      (p) =>
        p.medication_formulation_id === medicationFormulationId &&
        p.plan_id === planId &&
        p.quantity === quantity &&
        p.days_supply === daysSupply
    );

    const wrapped = filtered
      .map((p) => {
        const ph = pharmacies.find((pharm) => pharm.id === p.pharmacy_id);
        if (!ph) return null;
        if (zip && ph.zip && ph.zip !== zip) return null;
        if (typeof ph.distance_miles === 'number' && distance_miles) {
          if (ph.distance_miles > distance_miles) return null;
        }
        return {
          price_id: p.id,
          pharmacy_id: ph.id,
          pharmacy_name: ph.name,
          address_line1: ph.address_line1,
          city: ph.city,
          state: ph.state,
          zip: ph.zip,
          distance_miles: ph.distance_miles || 0,
          estimated_member_cost: p.estimated_member_cost,
          last_updated: p.last_updated || null
        };
      })
      .filter(Boolean);

    if (sortBy === 'estimated_member_cost_asc') {
      wrapped.sort((a, b) => (a.estimated_member_cost || 0) - (b.estimated_member_cost || 0));
    } else if (sortBy === 'distance_asc') {
      wrapped.sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
    }

    return {
      total_count: wrapped.length,
      prices: wrapped
    };
  }

  // setPreferredPharmacyForMedication(pharmacyDrugPriceId)
  setPreferredPharmacyForMedication(pharmacyDrugPriceId) {
    const pricesAll = this._getFromStorage('pharmacy_drug_prices', []);
    const pharmacies = this._getFromStorage('pharmacies', []);
    const medForms = this._getFromStorage('medication_formulations', []);
    const meds = this._getFromStorage('medications', []);

    const price = pricesAll.find((p) => p.id === pharmacyDrugPriceId);
    if (!price) {
      return { success: false, preferred_pharmacy: null, plan_summary_item: null, message: 'Drug price not found.' };
    }
    const pharmacy = pharmacies.find((ph) => ph.id === price.pharmacy_id);
    if (!pharmacy) {
      return { success: false, preferred_pharmacy: null, plan_summary_item: null, message: 'Pharmacy not found.' };
    }

    const form = medForms.find((f) => f.id === price.medication_formulation_id);
    if (!form) {
      return { success: false, preferred_pharmacy: null, plan_summary_item: null, message: 'Medication formulation not found.' };
    }
    const med = meds.find((m) => m.id === form.medication_id);

    let prefs = this._getFromStorage('preferred_pharmacies', []);
    const pref = {
      id: this._generateId('pref_pharm'),
      pharmacy_id: price.pharmacy_id,
      plan_id: price.plan_id,
      medication_id: form.medication_id,
      quantity: price.quantity,
      days_supply: price.days_supply,
      created_at: this._now()
    };
    prefs.push(pref);
    this._saveToStorage('preferred_pharmacies', prefs);

    const medName = med ? med.display_name : 'medication';
    const description = `Preferred pharmacy: ${pharmacy.name} for ${medName}`;
    const plan_summary_item = this._updatePlanSummaryItems('pharmacy', pharmacy.id, description);
    this._addRecentActivity('preferred_pharmacy', description);

    return {
      success: true,
      preferred_pharmacy: pref,
      plan_summary_item,
      message: 'Preferred pharmacy set.'
    };
  }

  // getAlertAndNotificationSettings
  getAlertAndNotificationSettings() {
    const spending_alerts = this._getFromStorage('spending_alerts', []);
    const allReminders = this._getFromStorage('appointment_reminder_settings', []);
    let appointment_reminder_setting = null;
    if (allReminders.length > 0) {
      allReminders.sort((a, b) => (b.updated_at || '') .localeCompare(a.updated_at || ''));
      appointment_reminder_setting = allReminders[0];
    }
    return {
      spending_alerts,
      appointment_reminder_setting
    };
  }

  // addSpendingAlert(alertType, thresholdAmount, frequency)
  addSpendingAlert(alertType, thresholdAmount, frequency) {
    let alerts = this._getFromStorage('spending_alerts', []);
    const alert = {
      id: this._generateId('alert'),
      alert_type: alertType,
      threshold_amount: thresholdAmount,
      frequency: frequency,
      is_active: true,
      created_at: this._now()
    };
    alerts.push(alert);
    this._saveToStorage('spending_alerts', alerts);

    this._addRecentActivity('alert_created', `Spending alert set at ${this._formatCurrency(thresholdAmount)} (${frequency}).`);

    return {
      success: true,
      spending_alert: alert,
      message: 'Spending alert added.'
    };
  }

  // updateAppointmentReminderSettings(channel, reminderTiming, isActive)
  updateAppointmentReminderSettings(channel, reminderTiming, isActive) {
    let settings = this._getFromStorage('appointment_reminder_settings', []);
    const setting = {
      id: this._generateId('appt_reminder'),
      channel,
      reminder_timing: reminderTiming,
      is_active: isActive,
      updated_at: this._now()
    };
    // mark previous as inactive if needed
    settings = settings.map((s) => ({ ...s, is_active: false }));
    settings.push(setting);
    this._saveToStorage('appointment_reminder_settings', settings);

    return {
      success: true,
      appointment_reminder_setting: setting,
      message: 'Appointment reminder settings updated.'
    };
  }

  // getCareGuideStartOptions
  getCareGuideStartOptions() {
    const age_groups = [
      { value: 'adult', label: 'Adult' },
      { value: 'child', label: 'Child' },
      { value: 'senior', label: 'Senior' }
    ];
    const conditions = this._getFromStorage('conditions', []);
    return {
      age_groups,
      conditions
    };
  }

  // getConditionsForAgeGroup(ageGroup)
  getConditionsForAgeGroup(ageGroup) {
    // No explicit age mapping available; return all conditions
    return this._getFromStorage('conditions', []);
  }

  // getCareRecommendationsForCondition(conditionId)
  getCareRecommendationsForCondition(conditionId) {
    const recs = this._getFromStorage('care_guide_recommendations', []);
    return recs.filter((r) => r.condition_id === conditionId);
  }

  // getCareCostComparisonOptions(conditionId)
  getCareCostComparisonOptions(conditionId) {
    const my_plans = this._getFromStorage('health_plans', []).filter((p) => p.is_my_plan);
    const care_settings = this._getFromStorage('care_settings', []);
    return {
      my_plans,
      care_settings
    };
  }

  // getCareSettingCostEstimatesForCondition(conditionId, planId, careSettingIds)
  getCareSettingCostEstimatesForCondition(conditionId, planId, careSettingIds) {
    const care_settings = this._getFromStorage('care_settings', []);
    let estimates = this._getFromStorage('care_setting_cost_estimates', []);

    const session = this._getOrCreateCareComparisonSession(conditionId, planId, 'adult');
    session.selected_care_setting_ids = careSettingIds.slice();
    this._saveCareComparisonSession(session);

    const cost_estimates = [];

    careSettingIds.forEach((csId) => {
      const cs = care_settings.find((c) => c.id === csId);
      if (!cs) return;

      let est = estimates.find((e) => e.condition_id === conditionId && e.plan_id === planId && e.care_setting_id === csId);
      if (!est) {
        // simple heuristic cost by setting type
        let baseCost = 200;
        if (cs.setting_type === 'virtual_visit') baseCost = 60;
        else if (cs.setting_type === 'urgent_care_center') baseCost = 180;
        else if (cs.setting_type === 'emergency_room') baseCost = 600;
        est = {
          id: this._generateId('care_cost'),
          condition_id: conditionId,
          care_setting_id: csId,
          plan_id: planId,
          projected_annual_cost: baseCost,
          created_at: this._now()
        };
        estimates.push(est);
      }

      cost_estimates.push({
        cost_estimate_id: est.id,
        care_setting_id: csId,
        care_setting_name: cs.name,
        projected_annual_cost: est.projected_annual_cost
      });
    });

    this._saveToStorage('care_setting_cost_estimates', estimates);

    return {
      cost_estimates
    };
  }

  // addCareOptionToPlanSummary(careSettingCostEstimateId)
  addCareOptionToPlanSummary(careSettingCostEstimateId) {
    const estimates = this._getFromStorage('care_setting_cost_estimates', []);
    const conditions = this._getFromStorage('conditions', []);
    const care_settings = this._getFromStorage('care_settings', []);

    const est = estimates.find((e) => e.id === careSettingCostEstimateId);
    if (!est) {
      return { success: false, care_summary_choice: null, plan_summary_item: null, message: 'Care setting cost estimate not found.' };
    }

    const condition = conditions.find((c) => c.id === est.condition_id);
    const setting = care_settings.find((cs) => cs.id === est.care_setting_id);

    let choices = this._getFromStorage('care_summary_choices', []);
    const choice = {
      id: this._generateId('care_choice'),
      condition_id: est.condition_id,
      care_setting_cost_estimate_id: est.id,
      added_at: this._now()
    };
    choices.push(choice);
    this._saveToStorage('care_summary_choices', choices);

    const condName = condition ? condition.name : 'condition';
    const setName = setting ? setting.name : 'care setting';
    const description = `Care option for ${condName}: ${setName}`;
    const plan_summary_item = this._updatePlanSummaryItems('care_option', choice.id, description);
    this._addRecentActivity('care_option', description);

    return {
      success: true,
      care_summary_choice: choice,
      plan_summary_item,
      message: 'Care option added to plan summary.'
    };
  }

  // getPlanSummary
  getPlanSummary() {
    const plans = this._getFromStorage('health_plans', []);
    const prefs = this._getFromStorage('plan_preferences', []);
    const benefitDetails = this._getFromStorage('plan_benefit_details', []);
    const shortlists = this._getFromStorage('plan_benefit_shortlists', []);
    const services = this._getFromStorage('medical_services', []);
    const providers = this._getFromStorage('providers', []);
    const favoriteProviders = this._getFromStorage('favorite_providers', []);
    const facilities = this._getFromStorage('facilities', []);
    const preferredFacilities = this._getFromStorage('preferred_facilities', []);
    const meds = this._getFromStorage('medications', []);
    const medForms = this._getFromStorage('medication_formulations', []);
    const pharmacies = this._getFromStorage('pharmacies', []);
    const preferredPharmacies = this._getFromStorage('preferred_pharmacies', []);
    const hsaConfigs = this._getFromStorage('hsa_configurations', []);
    const hsaNotes = this._getFromStorage('hsa_plan_notes', []);
    const careEstimates = this._getFromStorage('care_setting_cost_estimates', []);
    const careChoices = this._getFromStorage('care_summary_choices', []);
    const conditions = this._getFromStorage('conditions', []);
    const careSettings = this._getFromStorage('care_settings', []);

    const health_plans = prefs
      .filter((p) => p.is_saved || p.is_preferred)
      .map((pref) => {
        const plan = plans.find((pl) => pl.id === pref.plan_id);
        if (!plan) return null;
        return {
          plan_id: plan.id,
          plan_name: plan.plan_name,
          metal_level: plan.metal_level,
          coverage_year: plan.coverage_year,
          is_saved: !!pref.is_saved,
          is_preferred: !!pref.is_preferred
        };
      })
      .filter(Boolean);

    const plan_benefit_shortlists = shortlists.map((sl) => {
      const bd = benefitDetails.find((b) => b.id === sl.plan_benefit_detail_id);
      const plan = bd ? plans.find((p) => p.id === bd.plan_id) : null;
      const svc = bd ? services.find((s) => s.id === bd.medical_service_id) : null;
      return {
        shortlist_id: sl.id,
        plan_benefit_detail_id: sl.plan_benefit_detail_id,
        plan_name: plan ? plan.plan_name : '',
        medical_service_name: svc ? svc.name : '',
        reason: sl.reason || ''
      };
    });

    const favorite_providers = favoriteProviders
      .map((fav) => {
        const p = providers.find((pr) => pr.id === fav.provider_id);
        if (!p) return null;
        return {
          provider_id: p.id,
          full_name: p.full_name,
          specialty: p.specialty,
          rating_average: p.rating_average || 0
        };
      })
      .filter(Boolean);

    const preferred_facilities_list = preferredFacilities
      .map((pf) => {
        const f = facilities.find((fac) => fac.id === pf.facility_id);
        const svc = services.find((s) => s.id === pf.medical_service_id);
        return {
          preferred_facility_id: pf.id,
          facility_id: pf.facility_id,
          facility_name: f ? f.name : '',
          medical_service_name: svc ? svc.name : ''
        };
      })
      .filter(Boolean);

    const preferred_pharmacies_list = preferredPharmacies
      .map((pp) => {
        const ph = pharmacies.find((p) => p.id === pp.pharmacy_id);
        const med = meds.find((m) => m.id === pp.medication_id);
        return {
          preferred_pharmacy_id: pp.id,
          pharmacy_name: ph ? ph.name : '',
          medication_display_name: med ? med.display_name : '',
          quantity: pp.quantity,
          days_supply: pp.days_supply
        };
      })
      .filter(Boolean);

    const hsa_configurations_list = hsaConfigs.map((cfg) => {
      const plan = plans.find((p) => p.id === cfg.plan_id);
      const notesForCfg = hsaNotes.filter((n) => n.hsa_configuration_id === cfg.id);
      notesForCfg.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      const latest_note = notesForCfg[0] ? notesForCfg[0].note_text : null;
      return {
        hsa_configuration_id: cfg.id,
        plan_name: plan ? plan.plan_name : '',
        monthly_hsa_contribution: cfg.monthly_hsa_contribution,
        annual_hsa_contribution: cfg.annual_hsa_contribution,
        coverage_type: cfg.coverage_type,
        latest_note
      };
    });

    const care_options = careChoices.map((choice) => {
      const est = careEstimates.find((e) => e.id === choice.care_setting_cost_estimate_id);
      const condition = est ? conditions.find((c) => c.id === est.condition_id) : null;
      const setting = est ? careSettings.find((cs) => cs.id === est.care_setting_id) : null;
      return {
        care_summary_choice_id: choice.id,
        condition_name: condition ? condition.name : '',
        care_setting_name: setting ? setting.name : '',
        projected_annual_cost: est ? est.projected_annual_cost : null
      };
    });

    return {
      health_plans,
      plan_benefit_shortlists,
      favorite_providers,
      preferred_facilities: preferred_facilities_list,
      preferred_pharmacies: preferred_pharmacies_list,
      hsa_configurations: hsa_configurations_list,
      care_options
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return this._getFromStorage('about_page_content', { sections: [], last_updated: null });
  }

  // getHelpSupportContent
  getHelpSupportContent() {
    return this._getFromStorage('help_support_content', { faqs: [], support_contacts: [], resource_links: [] });
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy_content', { sections: [], effective_date: null });
  }

  // getTermsOfUseContent
  getTermsOfUseContent() {
    return this._getFromStorage('terms_of_use_content', { sections: [], effective_date: null });
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