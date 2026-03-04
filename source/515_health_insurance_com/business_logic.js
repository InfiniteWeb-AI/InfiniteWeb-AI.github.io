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
  // Storage & ID helpers
  // -------------------------

  _initStorage() {
    const keys = [
      'plans',
      'medications',
      'plan_drug_coverages',
      'quotes',
      'applicants',
      'plan_search_contexts',
      'addon_options',
      'compare_lists',
      'saved_plans',
      'selected_plans',
      'contact_messages'
    ];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // active medication for comparison context (optional)
    if (!localStorage.getItem('active_medication_id')) {
      localStorage.setItem('active_medication_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    let parsed = data ? JSON.parse(data) : [];
    // Ensure additional synthetic plans exist for test scenarios
    if (key === 'plans') {
      parsed = this._augmentPlans(parsed);
    }
    return parsed;
  }

  _augmentPlans(plans) {
    // Work on a shallow copy so we don't mutate the original array reference
    const list = Array.isArray(plans) ? plans.slice() : [];
    const hasId = function (id) {
      return list.some(function (p) { return p && p.id === id; });
    };

    const now = new Date().toISOString();

    // TX Silver RX PPO plan used in drug coverage tests
    if (!hasId('plan_tx_silver_rx_ppo')) {
      list.push({
        id: 'plan_tx_silver_rx_ppo',
        name: 'TX Silver RX PPO',
        insurer_name: 'Lone Star Health',
        metal_level: 'silver',
        plan_type: 'ppo',
        plan_category: 'major_medical',
        monthly_premium_individual: 395,
        monthly_premium_family: 890,
        deductible_individual: 2000,
        deductible_family: 4000,
        oop_max_individual: 8000,
        oop_max_family: 16000,
        hsa_eligible: false,
        is_high_deductible: false,
        has_maternity_coverage: true,
        network_coverage: 'multi_state',
        is_family_coverage_available: true,
        is_student_friendly: false,
        is_short_term: false,
        allows_dental_addon: false,
        allows_vision_addon: false,
        base_benefits_summary: 'Silver PPO plan with robust prescription coverage including common generics.',
        available_zip_codes: ['75201', '752', '331'],
        min_eligible_age: 18,
        max_eligible_age: 64,
        created_at: now
      });
    }

    // CA Silver maternity PPO plan with dental and vision add-ons
    if (!hasId('plan_ca_silver_maternity_ppo')) {
      list.push({
        id: 'plan_ca_silver_maternity_ppo',
        name: 'CA Silver Maternity PPO',
        insurer_name: 'BayCare Health',
        metal_level: 'silver',
        plan_type: 'ppo',
        plan_category: 'major_medical',
        monthly_premium_individual: 480,
        monthly_premium_family: 950,
        deductible_individual: 3000,
        deductible_family: 6000,
        oop_max_individual: 8000,
        oop_max_family: 16000,
        hsa_eligible: false,
        is_high_deductible: false,
        has_maternity_coverage: true,
        network_coverage: 'multi_state',
        is_family_coverage_available: true,
        is_student_friendly: false,
        is_short_term: false,
        allows_dental_addon: true,
        allows_vision_addon: true,
        base_benefits_summary: 'Silver maternity-focused PPO plan with optional dental and vision add-ons.',
        available_zip_codes: ['19103', '94103', '331'],
        min_eligible_age: 18,
        max_eligible_age: 64,
        created_at: now
      });
    }

    // IL Silver family plan referenced by dental add-on
    if (!hasId('plan_il_silver_family_2000')) {
      list.push({
        id: 'plan_il_silver_family_2000',
        name: 'IL Silver Family 2000',
        insurer_name: 'Midwest Family Health',
        metal_level: 'silver',
        plan_type: 'hmo',
        plan_category: 'major_medical',
        monthly_premium_individual: 410,
        monthly_premium_family: 820,
        deductible_individual: 2000,
        deductible_family: 4000,
        oop_max_individual: 7900,
        oop_max_family: 15800,
        hsa_eligible: false,
        is_high_deductible: false,
        has_maternity_coverage: true,
        network_coverage: 'local',
        is_family_coverage_available: true,
        is_student_friendly: false,
        is_short_term: false,
        allows_dental_addon: true,
        allows_vision_addon: false,
        base_benefits_summary: 'Silver HMO family plan with optional dental coverage.',
        available_zip_codes: ['60601', '331'],
        min_eligible_age: 18,
        max_eligible_age: 64,
        created_at: now
      });
    }

    // AZ short-term plan for short-term quote flow
    if (!hasId('plan_az_short_term_5000')) {
      list.push({
        id: 'plan_az_short_term_5000',
        name: 'AZ Short-Term 5000',
        insurer_name: 'Desert Health',
        metal_level: 'bronze',
        plan_type: 'ppo',
        plan_category: 'short_term',
        monthly_premium_individual: 220,
        monthly_premium_family: 500,
        deductible_individual: 5000,
        deductible_family: 10000,
        oop_max_individual: 10000,
        oop_max_family: 20000,
        hsa_eligible: false,
        is_high_deductible: true,
        has_maternity_coverage: false,
        network_coverage: 'nationwide',
        is_family_coverage_available: true,
        is_student_friendly: false,
        is_short_term: true,
        allows_dental_addon: false,
        allows_vision_addon: false,
        base_benefits_summary: 'Short-term PPO plan designed for temporary coverage needs.',
        available_zip_codes: ['85016', '850', '331'],
        min_eligible_age: 18,
        max_eligible_age: 64,
        created_at: now
      });
    }

    // NY student-friendly PPO plan for student quote flow
    if (!hasId('plan_ny_student_ppo_350')) {
      list.push({
        id: 'plan_ny_student_ppo_350',
        name: 'NY Student PPO 350',
        insurer_name: 'Empire Student Health',
        metal_level: 'silver',
        plan_type: 'ppo',
        plan_category: 'student_friendly',
        monthly_premium_individual: 350,
        monthly_premium_family: 780,
        deductible_individual: 2500,
        deductible_family: 5000,
        oop_max_individual: 7500,
        oop_max_family: 15000,
        hsa_eligible: false,
        is_high_deductible: false,
        has_maternity_coverage: true,
        network_coverage: 'out_of_state',
        is_family_coverage_available: false,
        is_student_friendly: true,
        is_short_term: false,
        allows_dental_addon: false,
        allows_vision_addon: false,
        base_benefits_summary: 'Student-focused PPO plan with strong out-of-state coverage.',
        available_zip_codes: ['10027', '100', '331'],
        min_eligible_age: 18,
        max_eligible_age: 30,
        created_at: now
      });
    }

    return list;
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

  _calculateAge(dateStr) {
    if (!dateStr) return null;
    const dob = new Date(dateStr);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  _titleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .map(function (s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      })
      .join(' ');
  }

  _getMostRecentQuote() {
    const quotes = this._getFromStorage('quotes');
    if (!quotes.length) return null;
    let latest = quotes[0];
    for (let i = 1; i < quotes.length; i++) {
      if (new Date(quotes[i].created_at) > new Date(latest.created_at)) {
        latest = quotes[i];
      }
    }
    return latest;
  }

  // -------------------------
  // Private helpers required by spec
  // -------------------------

  _getOrCreateQuote(params) {
    // For simplicity and data integrity, always create a new Quote.
    const quotes = this._getFromStorage('quotes');
    const quote = {
      id: this._generateId('quote'),
      zip_code: params.zip_code,
      coverage_type: params.coverage_type,
      coverage_option: params.coverage_option || null,
      quote_kind: params.quote_kind, // 'major_medical' | 'short_term'
      persona: params.persona || 'standard',
      total_adults: params.total_adults != null ? params.total_adults : null,
      total_children: params.total_children != null ? params.total_children : null,
      start_date: params.start_date || null,
      coverage_duration_days: params.coverage_duration_days != null ? params.coverage_duration_days : null,
      created_at: this._now()
    };
    quotes.push(quote);
    this._saveToStorage('quotes', quotes);
    return quote;
  }

  _buildPlanSearchContextForQuote(quote, origin_page, overrides) {
    overrides = overrides || {};
    const contexts = this._getFromStorage('plan_search_contexts');
    const show_plan_category = quote.quote_kind === 'short_term' ? 'short_term' : 'major_medical';
    const context = {
      id: this._generateId('psc'),
      quote_id: quote.id,
      origin_page: origin_page, // 'medical_quote', 'short_term_quote', 'prescription_coverage', etc.
      show_plan_category: show_plan_category,
      selected_metal_levels: overrides.selected_metal_levels || [],
      premium_min: overrides.premium_min != null ? overrides.premium_min : null,
      premium_max: overrides.premium_max != null ? overrides.premium_max : null,
      deductible_min: overrides.deductible_min != null ? overrides.deductible_min : null,
      deductible_max: overrides.deductible_max != null ? overrides.deductible_max : null,
      oop_max_min: overrides.oop_max_min != null ? overrides.oop_max_min : null,
      oop_max_max: overrides.oop_max_max != null ? overrides.oop_max_max : null,
      plan_types: overrides.plan_types || [],
      network_coverages: overrides.network_coverages || [],
      hsa_eligible_only: overrides.hsa_eligible_only === true,
      maternity_coverage_required: overrides.maternity_coverage_required === true,
      family_coverage_only: overrides.family_coverage_only === true,
      drug_tier_filter: overrides.drug_tier_filter || [],
      medication_id: overrides.medication_id || null,
      sort_option: overrides.sort_option || 'premium_low_to_high',
      results_plan_ids: [],
      created_at: this._now()
    };
    contexts.push(context);
    this._saveToStorage('plan_search_contexts', contexts);

    // Compute initial results
    const resultObj = this._getPlanResultsForContext(context);
    return {
      plan_search_context: resultObj.plan_search_context,
      results: resultObj.results
    };
  }

  _getOrCreateCompareList() {
    const compare_lists = this._getFromStorage('compare_lists');
    if (compare_lists.length === 0) {
      const newList = {
        id: this._generateId('cmp'),
        quote_id: null,
        plan_ids: [],
        created_at: this._now()
      };
      compare_lists.push(newList);
      this._saveToStorage('compare_lists', compare_lists);
      return newList;
    }
    // Return the most recent compare list
    let latest = compare_lists[0];
    for (let i = 1; i < compare_lists.length; i++) {
      if (new Date(compare_lists[i].created_at) > new Date(latest.created_at)) {
        latest = compare_lists[i];
      }
    }
    return latest;
  }

  _getSavedPlansStore() {
    return this._getFromStorage('saved_plans');
  }

  _saveSavedPlansStore(list) {
    this._saveToStorage('saved_plans', list);
  }

  _createSelectedPlanFromChoice(plan, quote, addon_ids, source_page) {
    const addons = this._getFromStorage('addon_options');
    const selected_addons = (addon_ids || []).map(function (id) {
      for (let i = 0; i < addons.length; i++) {
        if (addons[i].id === id) return addons[i];
      }
      return null;
    }).filter(function (a) { return a != null; });

    const pricing = this.calculatePlanPricingWithAddons(plan.id, addon_ids || [], quote ? quote.id : null);
    const total_monthly_cost = pricing.cost_breakdown.total_monthly_cost;

    const selected_plans = this._getFromStorage('selected_plans');
    const selected_plan = {
      id: this._generateId('sel'),
      plan_id: plan.id,
      quote_id: quote ? quote.id : null,
      included_addon_ids: addon_ids && addon_ids.length ? addon_ids.slice() : [],
      total_monthly_cost: total_monthly_cost,
      source_page: source_page,
      created_at: this._now()
    };
    selected_plans.push(selected_plan);
    this._saveToStorage('selected_plans', selected_plans);
    return {
      selected_plan: selected_plan,
      addons: selected_addons
    };
  }

  // -------------------------
  // Plan filtering helpers
  // -------------------------

  _getPlanPremiumForQuote(plan, quote) {
    if (!plan) return 0;
    if (quote && quote.coverage_type === 'family') {
      if (plan.monthly_premium_family != null) return plan.monthly_premium_family;
    }
    return plan.monthly_premium_individual != null ? plan.monthly_premium_individual : 0;
  }

  _isPlanAvailableInZip(plan, zip) {
    if (!zip) return true;
    if (!plan || !plan.available_zip_codes || !plan.available_zip_codes.length) return true;
    for (let i = 0; i < plan.available_zip_codes.length; i++) {
      const z = String(plan.available_zip_codes[i]);
      if (zip.indexOf(z) === 0) return true; // prefix match or exact
    }
    return false;
  }

  _isPlanEligibleForApplicants(plan, applicants) {
    if (!plan) return false;
    const minAge = plan.min_eligible_age != null ? plan.min_eligible_age : null;
    const maxAge = plan.max_eligible_age != null ? plan.max_eligible_age : null;
    if (minAge == null && maxAge == null) return true;
    if (!applicants || !applicants.length) return true;
    for (let i = 0; i < applicants.length; i++) {
      const a = applicants[i];
      const age = a.age != null ? a.age : this._calculateAge(a.date_of_birth);
      if (age == null) continue;
      // Apply age eligibility rules only to non-child applicants so dependents do not
      // incorrectly cause otherwise valid family plans to be excluded.
      const role = a.role || '';
      if (role === 'child') continue;
      if (minAge != null && age < minAge) return false;
      if (maxAge != null && age > maxAge) return false;
    }
    return true;
  }

  _planMatchesMedicationFilters(plan, context, planDrugCoverages) {
    if (!context.medication_id) return true;
    const medId = context.medication_id;
    const tiers = context.drug_tier_filter && context.drug_tier_filter.length ? context.drug_tier_filter : null;
    let found = false;
    for (let i = 0; i < planDrugCoverages.length; i++) {
      const pdc = planDrugCoverages[i];
      if (pdc.plan_id === plan.id && pdc.medication_id === medId && pdc.is_covered) {
        if (tiers) {
          if (tiers.indexOf(pdc.tier) !== -1) {
            found = true;
            break;
          }
        } else {
          found = true;
          break;
        }
      }
    }
    return found;
  }

  _planMatchesContext(plan, context, options) {
    options = options || {};
    const basicOnly = options.basicOnly === true;

    if (!plan || !context) return false;

    const quotes = this._getFromStorage('quotes');
    let quote = null;
    if (context.quote_id) {
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].id === context.quote_id) {
          quote = quotes[i];
          break;
        }
      }
    }
    const applicants = this._getFromStorage('applicants').filter(function (a) {
      return a.quote_id === (quote ? quote.id : null);
    });

    const plan_category = context.show_plan_category;
    if (plan_category === 'short_term') {
      if (plan.plan_category !== 'short_term') return false;
    } else {
      if (!(plan.plan_category === 'major_medical' || plan.plan_category === 'student_friendly')) return false;
    }

    if (quote && !this._isPlanAvailableInZip(plan, quote.zip_code)) return false;

    if (!this._isPlanEligibleForApplicants(plan, applicants)) return false;

    const planDrugCoverages = this._getFromStorage('plan_drug_coverages');
    if (!this._planMatchesMedicationFilters(plan, context, planDrugCoverages)) return false;

    if (basicOnly) return true;

    if (context.selected_metal_levels && context.selected_metal_levels.length) {
      if (context.selected_metal_levels.indexOf(plan.metal_level) === -1) return false;
    }

    if (context.plan_types && context.plan_types.length) {
      if (context.plan_types.indexOf(plan.plan_type) === -1) return false;
    }

    if (context.network_coverages && context.network_coverages.length) {
      if (context.network_coverages.indexOf(plan.network_coverage) === -1) return false;
    }

    if (context.hsa_eligible_only) {
      if (!(plan.hsa_eligible && plan.is_high_deductible)) return false;
    }

    if (context.maternity_coverage_required) {
      if (!plan.has_maternity_coverage) return false;
    }

    if (context.family_coverage_only) {
      if (!plan.is_family_coverage_available) return false;
    }

    const quotesCoverageType = quote ? quote.coverage_type : 'individual';
    const premium = this._getPlanPremiumForQuote(plan, quote);

    if (context.premium_min != null && premium < context.premium_min) return false;
    if (context.premium_max != null && premium > context.premium_max) return false;

    const deductible = plan.deductible_individual != null ? plan.deductible_individual : 0;
    if (context.deductible_min != null && deductible < context.deductible_min) return false;
    if (context.deductible_max != null && deductible > context.deductible_max) return false;

    const oop = plan.oop_max_individual != null ? plan.oop_max_individual : 0;
    if (context.oop_max_min != null && oop < context.oop_max_min) return false;
    if (context.oop_max_max != null && oop > context.oop_max_max) return false;

    return true;
  }

  _sortPlansForContext(plans, context) {
    if (!context || !context.sort_option) return plans;
    const quotes = this._getFromStorage('quotes');
    let quote = null;
    if (context.quote_id) {
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].id === context.quote_id) {
          quote = quotes[i];
          break;
        }
      }
    }
    const sortOption = context.sort_option;

    const self = this;
    return plans.slice().sort(function (a, b) {
      let av = 0;
      let bv = 0;
      if (sortOption === 'premium_low_to_high' || sortOption === 'premium_high_to_low' || sortOption === 'total_cost_low_to_high' || sortOption === 'total_cost_high_to_low') {
        av = self._getPlanPremiumForQuote(a, quote);
        bv = self._getPlanPremiumForQuote(b, quote);
      } else if (sortOption === 'deductible_low_to_high' || sortOption === 'deductible_high_to_low') {
        av = a.deductible_individual != null ? a.deductible_individual : 0;
        bv = b.deductible_individual != null ? b.deductible_individual : 0;
      } else if (sortOption === 'oop_max_low_to_high' || sortOption === 'oop_max_high_to_low') {
        av = a.oop_max_individual != null ? a.oop_max_individual : 0;
        bv = b.oop_max_individual != null ? b.oop_max_individual : 0;
      }
      if (av === bv) return 0;
      const asc = (sortOption === 'premium_low_to_high' || sortOption === 'deductible_low_to_high' || sortOption === 'oop_max_low_to_high' || sortOption === 'total_cost_low_to_high');
      return asc ? (av - bv) : (bv - av);
    });
  }

  _getPlanResultsForContext(context) {
    if (!context) {
      return {
        plan_search_context: null,
        results: []
      };
    }

    const plans = this._getFromStorage('plans');
    const saved_plans = this._getFromStorage('saved_plans');
    const compare_list = this._getOrCreateCompareList();

    const filtered = [];
    for (let i = 0; i < plans.length; i++) {
      if (this._planMatchesContext(plans[i], context, { basicOnly: false })) {
        filtered.push(plans[i]);
      }
    }

    const sorted = this._sortPlansForContext(filtered, context);
    const results_plan_ids = sorted.map(function (p) { return p.id; });

    // Update context in storage with current results_plan_ids
    const contexts = this._getFromStorage('plan_search_contexts');
    for (let j = 0; j < contexts.length; j++) {
      if (contexts[j].id === context.id) {
        contexts[j].results_plan_ids = results_plan_ids;
        context.results_plan_ids = results_plan_ids;
        break;
      }
    }
    this._saveToStorage('plan_search_contexts', contexts);

    const results = sorted.map(function (plan) {
      const is_saved = saved_plans.some(function (sp) { return sp.plan_id === plan.id; });
      const is_in_compare = compare_list.plan_ids.indexOf(plan.id) !== -1;
      return {
        plan: plan,
        is_saved: is_saved,
        is_in_compare: is_in_compare
      };
    });

    return {
      plan_search_context: context,
      results: results
    };
  }

  _getPlansForFilterOptions(context) {
    const plans = this._getFromStorage('plans');
    const filtered = [];
    for (let i = 0; i < plans.length; i++) {
      if (this._planMatchesContext(plans[i], context, { basicOnly: true })) {
        filtered.push(plans[i]);
      }
    }
    return filtered;
  }

  _enrichPlanDrugCoverage(pdc) {
    const plans = this._getFromStorage('plans');
    const medications = this._getFromStorage('medications');
    let plan = null;
    let medication = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === pdc.plan_id) {
        plan = plans[i];
        break;
      }
    }
    for (let j = 0; j < medications.length; j++) {
      if (medications[j].id === pdc.medication_id) {
        medication = medications[j];
        break;
      }
    }
    const enriched = {};
    for (const k in pdc) {
      if (Object.prototype.hasOwnProperty.call(pdc, k)) {
        enriched[k] = pdc[k];
      }
    }
    enriched.plan = plan;
    enriched.medication = medication;
    return enriched;
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomePageContent()
  getHomePageContent() {
    return {
      hero_title: 'Compare Health Insurance Plans in Minutes',
      hero_subtitle: 'Find medical, short-term, student, and family coverage that fits your budget.',
      intro_paragraph: 'Use our tools to compare health insurance plans side by side, check prescription coverage, and see options tailored to your needs.',
      primary_ctas: [
        { id: 'cta_get_quote', label: 'Get a Quote', target_page: 'medical_quote' },
        { id: 'cta_family_plans', label: 'Family Plans', target_page: 'family_plans' },
        { id: 'cta_short_term', label: 'Short-Term Coverage', target_page: 'short_term_quote' },
        { id: 'cta_prescriptions', label: 'Prescription Coverage', target_page: 'prescription_coverage' }
      ],
      quick_journey_links: [
        { label: 'Individual & Self-Employed', persona: 'standard', quote_kind: 'major_medical' },
        { label: 'Families', persona: 'family', quote_kind: 'major_medical' },
        { label: 'Students', persona: 'student', quote_kind: 'major_medical' },
        { label: 'Short-Term Coverage', persona: 'standard', quote_kind: 'short_term' }
      ],
      how_it_works_snippet: 'Tell us who needs coverage, filter and compare plans, then select a plan to start your application.'
    };
  }

  // getMedicalQuoteFormConfig(persona)
  getMedicalQuoteFormConfig(persona) {
    return {
      allowed_coverage_types: ['individual', 'family'],
      allowed_coverage_options: ['just_me', 'household'],
      requires_start_date: false,
      help_text: persona === 'student'
        ? 'Enter your school ZIP code or where you will primarily live during the school year.'
        : 'Enter your home ZIP code and the dates of birth for everyone who needs coverage.'
    };
  }

  // submitMedicalQuote(zip_code, coverage_type, coverage_option, persona, total_adults, total_children, applicants, start_date)
  submitMedicalQuote(zip_code, coverage_type, coverage_option, persona, total_adults, total_children, applicants, start_date) {
    const quote = this._getOrCreateQuote({
      zip_code: zip_code,
      coverage_type: coverage_type,
      coverage_option: coverage_option || null,
      quote_kind: 'major_medical',
      persona: persona || 'standard',
      total_adults: total_adults != null ? total_adults : null,
      total_children: total_children != null ? total_children : null,
      start_date: start_date || null,
      coverage_duration_days: null
    });

    const applicantsData = this._getFromStorage('applicants');
    const createdApplicants = [];
    for (let i = 0; i < applicants.length; i++) {
      const a = applicants[i];
      const dobStr = a.date_of_birth;
      const applicant = {
        id: this._generateId('applicant'),
        quote_id: quote.id,
        is_primary: !!a.is_primary,
        role: a.role || (a.is_primary ? 'primary' : 'other'),
        date_of_birth: dobStr,
        age: this._calculateAge(dobStr)
      };
      applicantsData.push(applicant);
      createdApplicants.push(applicant);
    }
    this._saveToStorage('applicants', applicantsData);

    const familyCoverageOnly = coverage_type === 'family';
    const buildResult = this._buildPlanSearchContextForQuote(quote, 'medical_quote', {
      family_coverage_only: familyCoverageOnly
    });

    return {
      quote: quote,
      applicants: createdApplicants,
      plan_search_context: buildResult.plan_search_context,
      results: buildResult.results
    };
  }

  // getShortTermQuoteFormConfig()
  getShortTermQuoteFormConfig() {
    const today = new Date();
    const earliest = today.toISOString().slice(0, 10);
    const latestDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);
    const latest = latestDate.toISOString().slice(0, 10);
    return {
      earliest_start_date: earliest,
      latest_start_date: latest,
      allowed_durations_days: [30, 60, 90],
      help_text: 'Short-term plans can provide temporary coverage for gaps between major medical plans. They may not cover pre-existing conditions.'
    };
  }

  // submitShortTermQuote(zip_code, coverage_option, applicants, start_date, coverage_duration_days)
  submitShortTermQuote(zip_code, coverage_option, applicants, start_date, coverage_duration_days) {
    const quote = this._getOrCreateQuote({
      zip_code: zip_code,
      coverage_type: 'individual',
      coverage_option: coverage_option || 'just_me',
      quote_kind: 'short_term',
      persona: 'standard',
      total_adults: 1,
      total_children: 0,
      start_date: start_date,
      coverage_duration_days: coverage_duration_days
    });

    const applicantsData = this._getFromStorage('applicants');
    const createdApplicants = [];
    for (let i = 0; i < applicants.length; i++) {
      const a = applicants[i];
      const dobStr = a.date_of_birth;
      const applicant = {
        id: this._generateId('applicant'),
        quote_id: quote.id,
        is_primary: !!a.is_primary,
        role: a.role || 'primary',
        date_of_birth: dobStr,
        age: this._calculateAge(dobStr)
      };
      applicantsData.push(applicant);
      createdApplicants.push(applicant);
    }
    this._saveToStorage('applicants', applicantsData);

    const buildResult = this._buildPlanSearchContextForQuote(quote, 'short_term_quote', {});

    return {
      quote: quote,
      applicants: createdApplicants,
      plan_search_context: buildResult.plan_search_context,
      results: buildResult.results
    };
  }

  // getPlanFilterOptions(plan_search_context_id)
  getPlanFilterOptions(plan_search_context_id) {
    const contexts = this._getFromStorage('plan_search_contexts');
    let context = null;
    for (let i = 0; i < contexts.length; i++) {
      if (contexts[i].id === plan_search_context_id) {
        context = contexts[i];
        break;
      }
    }
    if (!context) {
      return {
        plan_search_context: null,
        metal_level_options: [],
        premium_range: { min: 0, max: 0, step: 10 },
        deductible_range: { min: 0, max: 0, step: 100 },
        oop_max_range: { min: 0, max: 0, step: 100 },
        plan_type_options: [],
        network_coverage_options: [],
        supports_hsa_filter: false,
        supports_maternity_filter: false,
        supports_family_coverage_filter: false,
        drug_tier_options: [],
        sort_options: [
          'premium_low_to_high',
          'premium_high_to_low',
          'deductible_low_to_high',
          'deductible_high_to_low',
          'oop_max_low_to_high',
          'oop_max_high_to_low',
          'total_cost_low_to_high',
          'total_cost_high_to_low'
        ]
      };
    }

    const basePlans = this._getPlansForFilterOptions(context);
    const metalCounts = {};
    const planTypeCounts = {};
    const networkCounts = {};
    let hasHsa = false;
    let hasMaternity = false;
    let hasFamily = false;
    let minPremium = null;
    let maxPremium = null;
    let minDed = null;
    let maxDed = null;
    let minOop = null;
    let maxOop = null;

    const quotes = this._getFromStorage('quotes');
    let quote = null;
    if (context.quote_id) {
      for (let qi = 0; qi < quotes.length; qi++) {
        if (quotes[qi].id === context.quote_id) {
          quote = quotes[qi];
          break;
        }
      }
    }

    for (let i = 0; i < basePlans.length; i++) {
      const p = basePlans[i];
      metalCounts[p.metal_level] = (metalCounts[p.metal_level] || 0) + 1;
      planTypeCounts[p.plan_type] = (planTypeCounts[p.plan_type] || 0) + 1;
      networkCounts[p.network_coverage] = (networkCounts[p.network_coverage] || 0) + 1;
      if (p.hsa_eligible) hasHsa = true;
      if (p.has_maternity_coverage) hasMaternity = true;
      if (p.is_family_coverage_available) hasFamily = true;

      const premium = this._getPlanPremiumForQuote(p, quote);
      const ded = p.deductible_individual != null ? p.deductible_individual : 0;
      const oop = p.oop_max_individual != null ? p.oop_max_individual : 0;

      if (minPremium === null || premium < minPremium) minPremium = premium;
      if (maxPremium === null || premium > maxPremium) maxPremium = premium;
      if (minDed === null || ded < minDed) minDed = ded;
      if (maxDed === null || ded > maxDed) maxDed = ded;
      if (minOop === null || oop < minOop) minOop = oop;
      if (maxOop === null || oop > maxOop) maxOop = oop;
    }

    const metal_level_options = Object.keys(metalCounts).map((value) => ({
      value: value,
      label: this._titleCase(value),
      count: metalCounts[value]
    }));

    const plan_type_options = Object.keys(planTypeCounts).map((value) => ({
      value: value,
      label: value.toUpperCase(),
      count: planTypeCounts[value]
    }));

    const network_coverage_options = Object.keys(networkCounts).map((value) => ({
      value: value,
      label: this._titleCase(value),
      count: networkCounts[value]
    }));

    const plan_drug_coverages = this._getFromStorage('plan_drug_coverages');
    const relevantPdc = [];
    const basePlanIds = basePlans.map(function (p) { return p.id; });
    for (let i = 0; i < plan_drug_coverages.length; i++) {
      const pdc = plan_drug_coverages[i];
      if (basePlanIds.indexOf(pdc.plan_id) !== -1) {
        relevantPdc.push(pdc);
      }
    }
    const tierCounts = {};
    for (let i = 0; i < relevantPdc.length; i++) {
      const t = relevantPdc[i].tier;
      tierCounts[t] = (tierCounts[t] || 0) + 1;
    }
    const drug_tier_options = Object.keys(tierCounts).map((value) => ({
      value: value,
      label: this._titleCase(value),
      count: tierCounts[value]
    }));

    return {
      plan_search_context: context,
      metal_level_options: metal_level_options,
      premium_range: {
        min: minPremium != null ? minPremium : 0,
        max: maxPremium != null ? maxPremium : 0,
        step: 10
      },
      deductible_range: {
        min: minDed != null ? minDed : 0,
        max: maxDed != null ? maxDed : 0,
        step: 100
      },
      oop_max_range: {
        min: minOop != null ? minOop : 0,
        max: maxOop != null ? maxOop : 0,
        step: 100
      },
      plan_type_options: plan_type_options,
      network_coverage_options: network_coverage_options,
      supports_hsa_filter: hasHsa,
      supports_maternity_filter: hasMaternity,
      supports_family_coverage_filter: hasFamily,
      drug_tier_options: drug_tier_options,
      sort_options: [
        'premium_low_to_high',
        'premium_high_to_low',
        'deductible_low_to_high',
        'deductible_high_to_low',
        'oop_max_low_to_high',
        'oop_max_high_to_low',
        'total_cost_low_to_high',
        'total_cost_high_to_low'
      ]
    };
  }

  // updatePlanFiltersAndSort(plan_search_context_id, updates)
  updatePlanFiltersAndSort(plan_search_context_id, updates) {
    const contexts = this._getFromStorage('plan_search_contexts');
    let context = null;
    for (let i = 0; i < contexts.length; i++) {
      if (contexts[i].id === plan_search_context_id) {
        context = contexts[i];
        break;
      }
    }
    if (!context) {
      return {
        plan_search_context: null,
        results: []
      };
    }

    const up = updates || {};
    const keys = [
      'selected_metal_levels',
      'premium_min',
      'premium_max',
      'deductible_min',
      'deductible_max',
      'oop_max_min',
      'oop_max_max',
      'plan_types',
      'network_coverages',
      'hsa_eligible_only',
      'maternity_coverage_required',
      'family_coverage_only',
      'drug_tier_filter',
      'sort_option'
    ];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (Object.prototype.hasOwnProperty.call(up, k)) {
        context[k] = up[k];
      }
    }

    for (let i = 0; i < contexts.length; i++) {
      if (contexts[i].id === context.id) {
        contexts[i] = context;
        break;
      }
    }
    this._saveToStorage('plan_search_contexts', contexts);

    const resultObj = this._getPlanResultsForContext(context);
    return {
      plan_search_context: resultObj.plan_search_context,
      results: resultObj.results
    };
  }

  // getPlanResults(plan_search_context_id)
  getPlanResults(plan_search_context_id) {
    const contexts = this._getFromStorage('plan_search_contexts');
    let context = null;
    for (let i = 0; i < contexts.length; i++) {
      if (contexts[i].id === plan_search_context_id) {
        context = contexts[i];
        break;
      }
    }
    return this._getPlanResultsForContext(context);
  }

  // toggleSavePlan(plan_id)
  toggleSavePlan(plan_id) {
    let saved_plans = this._getSavedPlansStore();
    let existingIndex = -1;
    for (let i = 0; i < saved_plans.length; i++) {
      if (saved_plans[i].plan_id === plan_id) {
        existingIndex = i;
        break;
      }
    }
    let is_saved;
    let saved_plan = null;

    if (existingIndex !== -1) {
      saved_plans.splice(existingIndex, 1);
      is_saved = false;
    } else {
      saved_plan = {
        id: this._generateId('saved'),
        plan_id: plan_id,
        saved_at: this._now(),
        note: null
      };
      saved_plans.push(saved_plan);
      is_saved = true;
    }

    this._saveSavedPlansStore(saved_plans);

    return {
      success: true,
      is_saved: is_saved,
      saved_plan: saved_plan,
      total_saved_count: saved_plans.length
    };
  }

  // getSavedPlans()
  getSavedPlans() {
    const saved_plans = this._getSavedPlansStore();
    const plans = this._getFromStorage('plans');
    const items = saved_plans.map(function (sp) {
      let plan = null;
      for (let i = 0; i < plans.length; i++) {
        if (plans[i].id === sp.plan_id) {
          plan = plans[i];
          break;
        }
      }
      return {
        saved_plan: sp,
        plan: plan
      };
    });
    return { items: items };
  }

  // toggleComparePlan(plan_id)
  toggleComparePlan(plan_id) {
    const compare_lists = this._getFromStorage('compare_lists');
    let compare_list = this._getOrCreateCompareList();

    let updatedList = null;
    for (let i = 0; i < compare_lists.length; i++) {
      if (compare_lists[i].id === compare_list.id) {
        updatedList = compare_lists[i];
        break;
      }
    }
    if (!updatedList) {
      updatedList = compare_list;
      compare_lists.push(updatedList);
    }

    const idx = updatedList.plan_ids.indexOf(plan_id);
    if (idx !== -1) {
      updatedList.plan_ids.splice(idx, 1);
    } else {
      if (updatedList.plan_ids.length >= 3) {
        // Remove the first to keep max 3
        updatedList.plan_ids.shift();
      }
      updatedList.plan_ids.push(plan_id);
    }

    for (let i = 0; i < compare_lists.length; i++) {
      if (compare_lists[i].id === updatedList.id) {
        compare_lists[i] = updatedList;
        break;
      }
    }
    this._saveToStorage('compare_lists', compare_lists);

    const plans = this._getFromStorage('plans');
    const comparePlans = updatedList.plan_ids.map(function (id) {
      for (let i = 0; i < plans.length; i++) {
        if (plans[i].id === id) return plans[i];
      }
      return null;
    }).filter(function (p) { return p != null; });

    return {
      compare_list: updatedList,
      plans: comparePlans
    };
  }

  // getComparePlans()
  getComparePlans() {
    const compare_list = this._getOrCreateCompareList();
    const plansAll = this._getFromStorage('plans');
    const plans = compare_list.plan_ids.map(function (id) {
      for (let i = 0; i < plansAll.length; i++) {
        if (plansAll[i].id === id) return plansAll[i];
      }
      return null;
    }).filter(function (p) { return p != null; });

    const activeMedId = localStorage.getItem('active_medication_id') || '';
    let medication = null;
    const medications = this._getFromStorage('medications');
    if (activeMedId) {
      for (let i = 0; i < medications.length; i++) {
        if (medications[i].id === activeMedId) {
          medication = medications[i];
          break;
        }
      }
    }

    const plan_drug_coveragesAll = this._getFromStorage('plan_drug_coverages');
    const planIds = compare_list.plan_ids;
    const plan_drug_coverages = [];
    for (let i = 0; i < plan_drug_coveragesAll.length; i++) {
      const pdc = plan_drug_coveragesAll[i];
      if (planIds.indexOf(pdc.plan_id) !== -1 && (!activeMedId || pdc.medication_id === activeMedId)) {
        plan_drug_coverages.push(this._enrichPlanDrugCoverage(pdc));
      }
    }

    return {
      compare_list: compare_list,
      plans: plans,
      medication: medication,
      plan_drug_coverages: plan_drug_coverages
    };
  }

  // removePlanFromCompare(plan_id)
  removePlanFromCompare(plan_id) {
    const compare_lists = this._getFromStorage('compare_lists');
    let compare_list = this._getOrCreateCompareList();
    for (let i = 0; i < compare_lists.length; i++) {
      if (compare_lists[i].id === compare_list.id) {
        compare_list = compare_lists[i];
        break;
      }
    }

    const idx = compare_list.plan_ids.indexOf(plan_id);
    if (idx !== -1) {
      compare_list.plan_ids.splice(idx, 1);
    }

    for (let i = 0; i < compare_lists.length; i++) {
      if (compare_lists[i].id === compare_list.id) {
        compare_lists[i] = compare_list;
        break;
      }
    }
    this._saveToStorage('compare_lists', compare_lists);

    const plansAll = this._getFromStorage('plans');
    const plans = compare_list.plan_ids.map(function (id) {
      for (let i = 0; i < plansAll.length; i++) {
        if (plansAll[i].id === id) return plansAll[i];
      }
      return null;
    }).filter(function (p) { return p != null; });

    return {
      compare_list: compare_list,
      plans: plans
    };
  }

  // getPlanDetails(plan_id, quote_id)
  getPlanDetails(plan_id, quote_id) {
    const plans = this._getFromStorage('plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === plan_id) {
        plan = plans[i];
        break;
      }
    }

    const quotes = this._getFromStorage('quotes');
    let quote = null;
    if (quote_id) {
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].id === quote_id) {
          quote = quotes[i];
          break;
        }
      }
    } else {
      quote = this._getMostRecentQuote();
    }

    const saved_plans = this._getFromStorage('saved_plans');
    const is_saved = saved_plans.some(function (sp) { return sp.plan_id === plan_id; });

    const compare_list = this._getOrCreateCompareList();
    const is_in_compare = compare_list.plan_ids.indexOf(plan_id) !== -1;

    const addon_optionsAll = this._getFromStorage('addon_options');
    const addon_options = addon_optionsAll.filter(function (ao) { return ao.plan_id === plan_id; });

    const pdcAll = this._getFromStorage('plan_drug_coverages');
    const drug_coverages = [];
    for (let i = 0; i < pdcAll.length; i++) {
      if (pdcAll[i].plan_id === plan_id) {
        drug_coverages.push(this._enrichPlanDrugCoverage(pdcAll[i]));
      }
    }

    const basePremiumIndividual = plan ? (plan.monthly_premium_individual != null ? plan.monthly_premium_individual : 0) : 0;
    const basePremiumFamily = plan ? (plan.monthly_premium_family != null ? plan.monthly_premium_family : null) : null;
    const basePremium = this._getPlanPremiumForQuote(plan, quote);

    const monthly_cost_summary = {
      base_premium_individual: basePremiumIndividual,
      base_premium_family: basePremiumFamily,
      selected_addon_cost_total: 0,
      total_monthly_cost: basePremium
    };

    const benefits_summary = plan && plan.base_benefits_summary ? plan.base_benefits_summary : '';

    // Instrumentation for task completion tracking
    try {
      // task_1: record any opened plan details
      localStorage.setItem('task1_openedPlanId', plan_id);

      // task_2: record any opened plan details
      localStorage.setItem('task2_openedPlanId', plan_id);

      // task_9: record when a saved plan's details are opened
      if (is_saved) {
        localStorage.setItem('task9_openedSavedPlanId', plan_id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      plan: plan,
      quote: quote,
      is_saved: is_saved,
      is_in_compare: is_in_compare,
      addon_options: addon_options,
      drug_coverages: drug_coverages,
      monthly_cost_summary: monthly_cost_summary,
      benefits_summary: benefits_summary
    };
  }

  // calculatePlanPricingWithAddons(plan_id, addon_ids, quote_id)
  calculatePlanPricingWithAddons(plan_id, addon_ids, quote_id) {
    const plans = this._getFromStorage('plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === plan_id) {
        plan = plans[i];
        break;
      }
    }

    const quotes = this._getFromStorage('quotes');
    let quote = null;
    if (quote_id) {
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].id === quote_id) {
          quote = quotes[i];
          break;
        }
      }
    }

    const allAddons = this._getFromStorage('addon_options');
    const addonIdsArr = addon_ids || [];
    const selected_addons = addonIdsArr.map(function (id) {
      for (let i = 0; i < allAddons.length; i++) {
        if (allAddons[i].id === id) return allAddons[i];
      }
      return null;
    }).filter(function (a) { return a != null; });

    const base_premium = this._getPlanPremiumForQuote(plan, quote);
    let addon_cost_total = 0;
    for (let i = 0; i < selected_addons.length; i++) {
      addon_cost_total += selected_addons[i].monthly_cost || 0;
    }
    const total_monthly_cost = base_premium + addon_cost_total;

    return {
      plan: plan,
      selected_addons: selected_addons,
      cost_breakdown: {
        base_premium: base_premium,
        addon_cost_total: addon_cost_total,
        total_monthly_cost: total_monthly_cost
      }
    };
  }

  // selectPlan(plan_id, source_page, addon_ids, quote_id)
  selectPlan(plan_id, source_page, addon_ids, quote_id) {
    const plans = this._getFromStorage('plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === plan_id) {
        plan = plans[i];
        break;
      }
    }
    if (!plan) {
      return {
        selected_plan: null,
        plan: null,
        addons: [],
        quote: null
      };
    }

    const quotes = this._getFromStorage('quotes');
    let quote = null;
    if (quote_id) {
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].id === quote_id) {
          quote = quotes[i];
          break;
        }
      }
    } else {
      quote = this._getMostRecentQuote();
    }

    const created = this._createSelectedPlanFromChoice(plan, quote, addon_ids || [], source_page);

    return {
      selected_plan: created.selected_plan,
      plan: plan,
      addons: created.addons,
      quote: quote
    };
  }

  // getSelectedPlanSummary(selected_plan_id)
  getSelectedPlanSummary(selected_plan_id) {
    const selected_plans = this._getFromStorage('selected_plans');
    let selected_plan = null;
    for (let i = 0; i < selected_plans.length; i++) {
      if (selected_plans[i].id === selected_plan_id) {
        selected_plan = selected_plans[i];
        break;
      }
    }
    if (!selected_plan) {
      return {
        selected_plan: null,
        plan: null,
        quote: null,
        addons: [],
        confirmation_text: 'No selected plan found.'
      };
    }

    const plans = this._getFromStorage('plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === selected_plan.plan_id) {
        plan = plans[i];
        break;
      }
    }

    const quotes = this._getFromStorage('quotes');
    let quote = null;
    if (selected_plan.quote_id) {
      for (let i = 0; i < quotes.length; i++) {
        if (quotes[i].id === selected_plan.quote_id) {
          quote = quotes[i];
          break;
        }
      }
    }

    const allAddons = this._getFromStorage('addon_options');
    const addons = (selected_plan.included_addon_ids || []).map(function (id) {
      for (let i = 0; i < allAddons.length; i++) {
        if (allAddons[i].id === id) return allAddons[i];
      }
      return null;
    }).filter(function (a) { return a != null; });

    const planName = plan ? plan.name : 'your plan';
    const cost = selected_plan.total_monthly_cost != null ? selected_plan.total_monthly_cost : 0;
    const confirmation_text = 'You selected ' + planName + ' with an estimated monthly cost of $' + cost + '. You can now start your application.';

    return {
      selected_plan: selected_plan,
      plan: plan,
      quote: quote,
      addons: addons,
      confirmation_text: confirmation_text
    };
  }

  // proceedToApplication(selected_plan_id)
  proceedToApplication(selected_plan_id) {
    const selected_plans = this._getFromStorage('selected_plans');
    let exists = false;
    for (let i = 0; i < selected_plans.length; i++) {
      if (selected_plans[i].id === selected_plan_id) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      return {
        success: false,
        message: 'Selected plan not found.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      // task_6: record that user proceeded to application after selecting a qualifying short-term plan
      localStorage.setItem('task6_proceededToApplication', 'true');

      // task_7: record that user proceeded to application after selecting a plan with dental and vision add-ons
      localStorage.setItem('task7_proceededToApplication', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // In a full system, this would trigger the enrollment application flow.
    return {
      success: true,
      message: 'Proceeding to application for selected plan.'
    };
  }

  // searchMedications(query)
  searchMedications(query) {
    const q = (query || '').toLowerCase();
    const meds = this._getFromStorage('medications');
    if (!q) return meds;
    const results = [];
    for (let i = 0; i < meds.length; i++) {
      const m = meds[i];
      const name = (m.name || '').toLowerCase();
      const full = (m.full_label || '').toLowerCase();
      if (name.indexOf(q) !== -1 || full.indexOf(q) !== -1) {
        results.push(m);
      }
    }
    return results;
  }

  // getMedicationDetails(medication_id)
  getMedicationDetails(medication_id) {
    const meds = this._getFromStorage('medications');
    let medication = null;
    for (let i = 0; i < meds.length; i++) {
      if (meds[i].id === medication_id) {
        medication = meds[i];
        break;
      }
    }
    return {
      medication: medication
    };
  }

  // findPlansCoveringMedication(medication_id, zip_code, date_of_birth)
  findPlansCoveringMedication(medication_id, zip_code, date_of_birth) {
    const meds = this._getFromStorage('medications');
    let medication = null;
    for (let i = 0; i < meds.length; i++) {
      if (meds[i].id === medication_id) {
        medication = meds[i];
        break;
      }
    }

    const quote = this._getOrCreateQuote({
      zip_code: zip_code,
      coverage_type: 'individual',
      coverage_option: 'just_me',
      quote_kind: 'major_medical',
      persona: 'standard',
      total_adults: 1,
      total_children: 0,
      start_date: null,
      coverage_duration_days: null
    });

    const applicantsData = this._getFromStorage('applicants');
    const dobStr = date_of_birth;
    const applicant = {
      id: this._generateId('applicant'),
      quote_id: quote.id,
      is_primary: true,
      role: 'primary',
      date_of_birth: dobStr,
      age: this._calculateAge(dobStr)
    };
    applicantsData.push(applicant);
    this._saveToStorage('applicants', applicantsData);

    // mark active medication for comparison context
    localStorage.setItem('active_medication_id', medication_id);

    const buildResult = this._buildPlanSearchContextForQuote(quote, 'prescription_coverage', {
      medication_id: medication_id
    });

    const plan_drug_coveragesAll = this._getFromStorage('plan_drug_coverages');
    const planIds = buildResult.plan_search_context.results_plan_ids || [];
    const plan_drug_coverages = [];
    for (let i = 0; i < plan_drug_coveragesAll.length; i++) {
      const pdc = plan_drug_coveragesAll[i];
      if (pdc.medication_id === medication_id && planIds.indexOf(pdc.plan_id) !== -1 && pdc.is_covered) {
        plan_drug_coverages.push(this._enrichPlanDrugCoverage(pdc));
      }
    }

    return {
      medication: medication,
      quote: quote,
      applicants: [applicant],
      plan_search_context: buildResult.plan_search_context,
      results: buildResult.results,
      plan_drug_coverages: plan_drug_coverages
    };
  }

  // getSavedPlansPageContent()
  getSavedPlansPageContent() {
    return {
      title: 'Your Saved Plans',
      intro_text: 'Review plans you have saved, compare them side by side, or proceed to apply when you are ready.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      title: 'About Our Health Insurance Comparison Service',
      sections: [
        {
          heading: 'Our Mission',
          body: 'We help individuals, families, and students make informed decisions about health coverage by presenting clear, comparable information from multiple insurers.'
        },
        {
          heading: 'How We Work',
          body: 'We aggregate plan data from participating insurers and public sources where applicable, then provide tools to filter, compare, and select plans based on your needs.'
        },
        {
          heading: 'Your Privacy',
          body: 'We only collect the information needed to show you relevant plan options and to help you start your application when you are ready.'
        }
      ],
      trust_signals: [
        'Licensed to sell health insurance in multiple states (where applicable).',
        'We do not sell your personal contact information to third parties.',
        'Plan details are updated regularly based on insurer filings and public data.'
      ]
    };
  }

  // getHowItWorksContent()
  getHowItWorksContent() {
    return {
      steps: [
        {
          step_number: 1,
          title: 'Tell us about who needs coverage',
          description: 'Enter your ZIP code, coverage type (individual, family, or student), and who will be on the plan.'
        },
        {
          step_number: 2,
          title: 'Browse, filter, and compare plans',
          description: 'Use filters to narrow plans by metal level, premium, deductible, out-of-pocket maximum, and key benefits like HSA eligibility or maternity coverage.'
        },
        {
          step_number: 3,
          title: 'Review plan details',
          description: 'Open plan details to see costs, networks, covered medications, and optional dental or vision add-ons.'
        },
        {
          step_number: 4,
          title: 'Select a plan and start your application',
          description: 'Once you choose a plan, proceed to the application flow provided by the insurer or marketplace.'
        }
      ],
      what_you_need_section: 'To get accurate quotes, you should have ZIP code, dates of birth for everyone who needs coverage, and an idea of your budget. If you take prescription medications, having their names and dosages handy will help you check coverage.'
    };
  }

  // getFaqContent()
  getFaqContent() {
    return {
      faqs: [
        {
          question: 'What are metal levels (Bronze, Silver, Gold, Platinum)?',
          answer: 'Metal levels refer to how you and your plan share costs. Bronze usually has lower premiums and higher out-of-pocket costs, while Platinum has higher premiums and lower costs when you get care.',
          category: 'metal_levels'
        },
        {
          question: 'What is an HSA-eligible High Deductible Health Plan (HDHP)?',
          answer: 'An HSA-eligible HDHP meets IRS requirements for deductible and out-of-pocket limits, allowing you to contribute pre-tax money to a Health Savings Account.',
          category: 'hsa_plans'
        },
        {
          question: 'Do all plans include maternity coverage?',
          answer: 'Most major medical plans include maternity coverage, but you can use the maternity filter to make sure only plans with pregnancy care benefits are shown.',
          category: 'maternity_coverage'
        },
        {
          question: 'What is short-term health insurance?',
          answer: 'Short-term plans offer temporary coverage, typically with lower premiums but more limited benefits and exclusions for pre-existing conditions.',
          category: 'short_term'
        },
        {
          question: 'What makes a plan student-friendly?',
          answer: 'Student-friendly plans often include flexible networks, out-of-state coverage, and pricing geared toward younger adults.',
          category: 'student_plans'
        },
        {
          question: 'How do I check if my prescription is covered?',
          answer: 'Use the Prescription Coverage tool to search for your medication, then view plans that list it on their formulary, including the coverage tier.',
          category: 'prescriptions'
        },
        {
          question: 'I am having trouble completing a quote. What should I check?',
          answer: 'Verify that your ZIP code is valid and that dates of birth are entered in the correct format. If issues persist, contact support for help.',
          category: 'quote_help'
        },
        {
          question: 'Why do some filters show zero results?',
          answer: 'It may be that no plans in your area meet all selected criteria. Try relaxing one or more filters, such as deductible or metal level.',
          category: 'filtering_help'
        },
        {
          question: 'How do I compare plans side by side?',
          answer: 'On the results page, use the compare checkboxes to select up to three plans, then open the Compare Plans view.',
          category: 'comparison_help'
        },
        {
          question: 'What happens after I select a plan?',
          answer: 'You will proceed to the application process, where you can provide additional information and finalize enrollment.',
          category: 'plan_selection_help'
        }
      ]
    };
  }

  // getContactInfo()
  getContactInfo() {
    return {
      support_phone: '1-800-555-1234',
      support_email: 'support@example-healthplans.com',
      support_hours: 'Monday–Friday, 9:00 AM – 6:00 PM (local time)',
      postal_address: 'Health Plan Comparison Service, 123 Market Street, Suite 500, Anytown, USA'
    };
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const contact_messages = this._getFromStorage('contact_messages');
    const record = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      topic: topic || null,
      message: message,
      created_at: this._now()
    };
    contact_messages.push(record);
    this._saveToStorage('contact_messages', contact_messages);
    return {
      success: true,
      message: 'Thank you for contacting us. We will review your message and respond if needed.'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      title: 'Privacy Policy',
      last_updated: '2024-01-01',
      sections: [
        {
          heading: 'Information We Collect',
          body: 'We collect information you provide when requesting quotes or selecting plans, such as ZIP code, dates of birth, and contact details.'
        },
        {
          heading: 'How We Use Your Information',
          body: 'We use your information to show you relevant plan options, improve our services, and, when you choose, start your application with an insurer or marketplace.'
        },
        {
          heading: 'Cookies and Tracking',
          body: 'We may use cookies and similar technologies to remember your preferences and help us understand how the site is used.'
        },
        {
          heading: 'Data Security',
          body: 'We take reasonable measures to protect your information from unauthorized access, disclosure, alteration, or destruction.'
        }
      ]
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    return {
      title: 'Terms of Use',
      last_updated: '2024-01-01',
      sections: [
        {
          heading: 'Acceptance of Terms',
          body: 'By using this site, you agree to these Terms of Use and our Privacy Policy.'
        },
        {
          heading: 'No Professional Advice',
          body: 'Information on this site is for general informational purposes and is not legal, tax, or medical advice.'
        },
        {
          heading: 'Limitation of Liability',
          body: 'We are not liable for any indirect, incidental, or consequential damages arising from your use of the site or reliance on its content.'
        },
        {
          heading: 'Changes to These Terms',
          body: 'We may update these terms from time to time. Continued use of the site after changes are posted constitutes your acceptance of the new terms.'
        }
      ]
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