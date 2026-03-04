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

  _initStorage() {
    // Initialize entity tables
    var entityKeys = [
      'pricing_plans',
      'plan_addons',
      'pricing_quotes',
      'demo_requests',
      'case_studies',
      'integrations',
      'integration_comparison_sets',
      'resource_items',
      'webinars',
      'webinar_registrations',
      'newsletter_subscriptions',
      'roi_calculations',
      'roi_result_emails',
      'contact_form_submissions'
    ];

    for (var i = 0; i < entityKeys.length; i++) {
      var key = entityKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    var data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    var current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ===== Label helpers =====

  _getIndustryLabel(value) {
    switch (value) {
      case 'e_commerce': return 'E-commerce';
      case 'software_saas': return 'Software & SaaS';
      case 'healthcare': return 'Healthcare';
      case 'financial_services': return 'Financial Services';
      case 'manufacturing': return 'Manufacturing';
      case 'education': return 'Education';
      case 'other': return 'Other';
      default: return value || '';
    }
  }

  _getIntegrationCategoryLabel(value) {
    switch (value) {
      case 'crm': return 'CRM';
      case 'marketing': return 'Marketing';
      case 'analytics': return 'Analytics';
      case 'support': return 'Support';
      case 'collaboration': return 'Collaboration';
      case 'billing': return 'Billing';
      case 'other': return 'Other';
      default: return value || '';
    }
  }

  _getResourceCategoryLabel(value) {
    switch (value) {
      case 'security_compliance': return 'Security & Compliance';
      case 'product': return 'Product';
      case 'marketing': return 'Marketing';
      case 'customer_stories': return 'Customer Stories';
      case 'roi': return 'ROI';
      case 'other': return 'Other';
      default: return value || '';
    }
  }

  _getContentTypeLabel(value) {
    switch (value) {
      case 'whitepaper': return 'Whitepaper';
      case 'ebook': return 'Ebook';
      case 'report': return 'Report';
      case 'case_study': return 'Case study';
      case 'guide': return 'Guide';
      case 'checklist': return 'Checklist';
      case 'infographic': return 'Infographic';
      case 'video': return 'Video';
      case 'datasheet': return 'Datasheet';
      default: return value || '';
    }
  }

  _getWebinarTopicLabel(value) {
    switch (value) {
      case 'onboarding': return 'Onboarding';
      case 'product_tour': return 'Product tour';
      case 'best_practices': return 'Best practices';
      case 'advanced_analytics': return 'Advanced analytics';
      case 'security_compliance': return 'Security & compliance';
      case 'integrations': return 'Integrations';
      case 'other': return 'Other';
      default: return value || '';
    }
  }

  _getSupportsTwoWaySyncLabel(flag) {
    return flag ? 'Two-way sync' : 'One-way sync';
  }

  // ===== Helper: pricing =====

  _calculatePlanPriceForTerm(plan, number_of_users, billing_term, addons) {
    if (!plan || !number_of_users || number_of_users < 0) {
      return {
        base_price_for_term: 0,
        price_per_user_for_term: 0,
        addon_total_price: 0,
        total_price_for_term: 0
      };
    }

    var base;
    var perUser;
    if (billing_term === 'annual') {
      base = plan.base_price_annual || 0;
      perUser = plan.price_per_user_annual || 0;
    } else {
      base = plan.base_price_monthly || 0;
      perUser = plan.price_per_user_monthly || 0;
    }

    var addonTotal = 0;
    if (addons && addons.length) {
      for (var i = 0; i < addons.length; i++) {
        var addon = addons[i];
        var addonPerUser = billing_term === 'annual'
          ? (addon.price_per_user_annual || 0)
          : (addon.price_per_user_monthly || 0);
        addonTotal += addonPerUser * number_of_users;
      }
    }

    var planUsersTotal = perUser * number_of_users;
    var total = base + planUsersTotal + addonTotal;

    return {
      base_price_for_term: base,
      price_per_user_for_term: perUser,
      addon_total_price: addonTotal,
      total_price_for_term: total
    };
  }

  // ===== Helper: integration comparison =====

  _getOrCreateIntegrationComparisonSet() {
    var sets = this._getFromStorage('integration_comparison_sets');
    var currentId = localStorage.getItem('current_integration_comparison_set_id');
    var current = null;

    if (currentId) {
      for (var i = 0; i < sets.length; i++) {
        if (sets[i].id === currentId) {
          current = sets[i];
          break;
        }
      }
    }

    if (!current) {
      current = {
        id: this._generateId('integration_comparison_set'),
        integrationIds: [],
        created_at: this._nowIso()
      };
      sets.push(current);
      this._saveToStorage('integration_comparison_sets', sets);
      localStorage.setItem('current_integration_comparison_set_id', current.id);
    }

    return current;
  }

  // ===== Helper: case studies filter/sort =====

  _filterAndSortCaseStudies(caseStudies, options) {
    var industry = options && options.industry;
    var minUplift = options && options.min_conversion_rate_uplift_percent;
    var sort_by = options && options.sort_by;

    var filtered = [];
    for (var i = 0; i < caseStudies.length; i++) {
      var cs = caseStudies[i];
      if (industry && cs.industry !== industry) continue;
      if (typeof minUplift === 'number') {
        var uplift = typeof cs.conversion_rate_uplift_percent === 'number'
          ? cs.conversion_rate_uplift_percent
          : 0;
        if (uplift < minUplift) continue;
      }
      filtered.push(cs);
    }

    filtered.sort(function (a, b) {
      if (sort_by === 'highest_impact') {
        var aImpact = typeof a.impact_score === 'number' ? a.impact_score
          : (typeof a.conversion_rate_uplift_percent === 'number' ? a.conversion_rate_uplift_percent : 0);
        var bImpact = typeof b.impact_score === 'number' ? b.impact_score
          : (typeof b.conversion_rate_uplift_percent === 'number' ? b.conversion_rate_uplift_percent : 0);
        if (bImpact !== aImpact) return bImpact - aImpact;
      } else if (sort_by === 'largest_improvement') {
        var aU = typeof a.conversion_rate_uplift_percent === 'number' ? a.conversion_rate_uplift_percent : 0;
        var bU = typeof b.conversion_rate_uplift_percent === 'number' ? b.conversion_rate_uplift_percent : 0;
        if (bU !== aU) return bU - aU;
      } else if (sort_by === 'newest') {
        var aDate = a.published_at ? Date.parse(a.published_at) : 0;
        var bDate = b.published_at ? Date.parse(b.published_at) : 0;
        if (bDate !== aDate) return bDate - aDate;
      }
      // Fallback to newest
      var aD = a.published_at ? Date.parse(a.published_at) : 0;
      var bD = b.published_at ? Date.parse(b.published_at) : 0;
      return bD - aD;
    });

    return filtered;
  }

  // ===== Helper: ROI computation =====

  _computeRoiValues(team_size, hours_saved_per_person_per_week, hourly_rate, period) {
    var ts = team_size || 0;
    var hrs = hours_saved_per_person_per_week || 0;
    var rate = hourly_rate || 0;

    var weeklySavings = ts * hrs * rate;
    var annual = weeklySavings * 52;
    var monthly = annual / 12;

    // Product price not known => ROI and payback period cannot be accurately computed
    var roi_percent = null;
    var payback_months = null;
    var assumptions = 'ROI percent and payback period are not computed because product pricing is not configured. Annual savings assumes 52 working weeks per year.';

    return {
      calculated_annual_savings: annual,
      calculated_monthly_savings: monthly,
      roi_percent: roi_percent,
      payback_period_months: payback_months,
      assumptions: assumptions
    };
  }

  // ===== Interface: getHomePageContent =====

  getHomePageContent() {
    var raw = localStorage.getItem('home_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    // Fallback default content (non-persistent)
    return {
      hero: {
        headline: 'Unlock smarter workflows for your team',
        subheadline: 'Product analytics and workflow automation in a single platform.',
        primary_cta_label: 'Start free trial',
        primary_cta_target_page: 'start_trial',
        secondary_cta_label: 'See pricing',
        secondary_cta_target_page: 'pricing'
      },
      key_benefits: [],
      social_proof: {
        customer_logos: [],
        testimonials: []
      },
      highlighted_case_studies: []
    };
  }

  // ===== Interface: getProductOverviewContent =====

  getProductOverviewContent() {
    var raw = localStorage.getItem('product_overview_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      modules: [],
      use_cases_by_role: [],
      ctas: {
        primary_cta_label: 'See pricing',
        primary_cta_target_page: 'pricing',
        secondary_cta_label: 'Request demo',
        secondary_cta_target_page: 'request_demo'
      }
    };
  }

  // ===== Interface: getPricingPageConfig =====

  getPricingPageConfig() {
    var raw = localStorage.getItem('pricing_page_config');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      user_count_min: 1,
      user_count_max: 1000,
      user_count_step: 1,
      supported_billing_terms: ['monthly', 'annual'],
      supported_currencies: ['usd', 'eur', 'gbp'],
      feature_filters: [
        {
          key: 'supports_sso',
          label: 'Single Sign-On (SSO)',
          type: 'boolean'
        }
      ],
      sort_options: [
        {
          value: 'total_monthly_price_asc',
          label: 'Total monthly price: Low to High'
        },
        {
          value: 'total_monthly_price_desc',
          label: 'Total monthly price: High to Low'
        },
        {
          value: 'popularity',
          label: 'Most popular'
        }
      ],
      custom_quote_defaults: {
        default_billing_term: 'annual',
        default_plan_tier: 'growth',
        default_user_count: 10
      }
    };
  }

  // ===== Interface: getPricingPlansForUserCount =====

  getPricingPlansForUserCount(number_of_users, billing_term, supports_sso, sort_by, currency) {
    var plans = this._getFromStorage('pricing_plans');
    var filtered = [];
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      if (p.is_active === false) continue;
      if (supports_sso === true && !p.supports_sso) continue;
      if (currency && p.currency && p.currency !== currency) continue;
      filtered.push(p);
    }

    var self = this;
    var enriched = filtered.map(function (plan) {
      var pricing = self._calculatePlanPriceForTerm(plan, number_of_users, billing_term, []);
      return {
        plan: {
          id: plan.id,
          name: plan.name,
          tier: plan.tier,
          description: plan.description,
          supports_sso: !!plan.supports_sso,
          trial_available: !!plan.trial_available,
          trial_length_days: plan.trial_length_days,
          is_active: !!plan.is_active
        },
        currency: plan.currency,
        billing_term: billing_term,
        number_of_users: number_of_users,
        base_price_for_term: pricing.base_price_for_term,
        price_per_user_for_term: pricing.price_per_user_for_term,
        total_price_for_term: pricing.total_price_for_term
      };
    });

    enriched.sort(function (a, b) {
      if (sort_by === 'total_monthly_price_asc' || sort_by === 'total_annual_price_asc') {
        return a.total_price_for_term - b.total_price_for_term;
      }
      if (sort_by === 'total_monthly_price_desc' || sort_by === 'total_annual_price_desc') {
        return b.total_price_for_term - a.total_price_for_term;
      }
      if (sort_by === 'popularity') {
        var ap = typeof a.plan.sort_priority === 'number' ? a.plan.sort_priority : 9999;
        var bp = typeof b.plan.sort_priority === 'number' ? b.plan.sort_priority : 9999;
        return ap - bp;
      }
      return 0;
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_pricingSearchParams', JSON.stringify({
        number_of_users: number_of_users,
        billing_term: billing_term,
        supports_sso: supports_sso === true,
        sort_by: sort_by || null,
        currency: currency || null,
        timestamp: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return enriched;
  }

  // ===== Interface: getPlanAddonsForPricing =====

  getPlanAddonsForPricing() {
    return this._getFromStorage('plan_addons');
  }

  // ===== Interface: calculatePricingQuotePreview =====

  calculatePricingQuotePreview(planId, number_of_users, billing_term, addonIds, currency) {
    var plans = this._getFromStorage('pricing_plans');
    var plan = null;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plan = plans[i];
        break;
      }
    }

    var addonsAll = this._getFromStorage('plan_addons');
    var addons = [];
    var addonIdSet = Array.isArray(addonIds) ? addonIds : [];
    for (var j = 0; j < addonsAll.length; j++) {
      if (addonIdSet.indexOf(addonsAll[j].id) !== -1) {
        addons.push(addonsAll[j]);
      }
    }

    if (!plan) {
      return {
        planId: planId,
        number_of_users: number_of_users,
        billing_term: billing_term,
        currency: currency || 'usd',
        addonIds: addonIdSet,
        estimated_total_price: 0,
        line_items: []
      };
    }

    var pricing = this._calculatePlanPriceForTerm(plan, number_of_users, billing_term, addons);

    var line_items = [];
    line_items.push({
      label: 'Base plan',
      amount: (billing_term === 'annual' ? (plan.base_price_annual || 0) : (plan.base_price_monthly || 0)) +
        (billing_term === 'annual' ? (plan.price_per_user_annual || 0) : (plan.price_per_user_monthly || 0)) * number_of_users
    });

    for (var k = 0; k < addons.length; k++) {
      var addon = addons[k];
      var addonPerUser = billing_term === 'annual'
        ? (addon.price_per_user_annual || 0)
        : (addon.price_per_user_monthly || 0);
      line_items.push({
        label: addon.name + ' add-on',
        amount: addonPerUser * number_of_users
      });
    }

    return {
      planId: planId,
      number_of_users: number_of_users,
      billing_term: billing_term,
      currency: plan.currency || currency || 'usd',
      addonIds: addonIdSet,
      estimated_total_price: pricing.total_price_for_term,
      line_items: line_items
    };
  }

  // ===== Interface: savePricingQuote =====

  savePricingQuote(planId, number_of_users, billing_term, addonIds, currency, label) {
    var plans = this._getFromStorage('pricing_plans');
    var plan = null;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plan = plans[i];
        break;
      }
    }

    var addonsAll = this._getFromStorage('plan_addons');
    var addonIdSet = Array.isArray(addonIds) ? addonIds : [];
    var addons = [];
    for (var j = 0; j < addonsAll.length; j++) {
      if (addonIdSet.indexOf(addonsAll[j].id) !== -1) {
        addons.push(addonsAll[j]);
      }
    }

    var pricing = this._calculatePlanPriceForTerm(plan, number_of_users, billing_term, addons);

    var quotes = this._getFromStorage('pricing_quotes');
    var id = this._generateId('pricing_quote');
    var quote = {
      id: id,
      planId: planId,
      number_of_users: number_of_users,
      billing_term: billing_term,
      addonIds: addonIdSet,
      estimated_total_price: pricing.total_price_for_term,
      currency: currency,
      created_at: this._nowIso(),
      label: label || null
    };
    quotes.push(quote);
    this._saveToStorage('pricing_quotes', quotes);

    // Resolve foreign keys for return (plan and addons)
    var resolvedQuote = JSON.parse(JSON.stringify(quote));
    resolvedQuote.plan = plan || null;
    resolvedQuote.addons = addons;

    return {
      quote: resolvedQuote,
      success: true,
      message: 'Quote saved successfully.'
    };
  }

  // ===== Interface: getPlanDetail =====

  getPlanDetail(plan_slug, number_of_users, billing_term, currency) {
    var plans = this._getFromStorage('pricing_plans');
    var plan = null;
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      if (p.slug && p.slug === plan_slug) {
        plan = p;
        break;
      }
      if (!plan && p.id === plan_slug) {
        plan = p;
      }
    }

    if (!plan) {
      return {
        plan: null,
        feature_sections: [],
        price_summary: null
      };
    }

    var price_summary = null;
    if (number_of_users && billing_term) {
      var pricing = this._calculatePlanPriceForTerm(plan, number_of_users, billing_term, []);
      price_summary = {
        currency: plan.currency || currency || 'usd',
        billing_term: billing_term,
        number_of_users: number_of_users,
        base_price_for_term: pricing.base_price_for_term,
        price_per_user_for_term: pricing.price_per_user_for_term,
        total_price_for_term: pricing.total_price_for_term
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_planDetailViewParams', JSON.stringify({
        planId: plan.id,
        slug: plan_slug,
        number_of_users: number_of_users || null,
        billing_term: billing_term || null,
        currency: (plan.currency || currency || null),
        viewed_at: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        tier: plan.tier,
        description: plan.description,
        supports_sso: !!plan.supports_sso,
        trial_available: !!plan.trial_available,
        trial_length_days: plan.trial_length_days,
        is_active: !!plan.is_active
      },
      feature_sections: [],
      price_summary: price_summary
    };
  }

  // ===== Interface: startPlanTrial =====

  startPlanTrial(planId, number_of_users, billing_term) {
    var plans = this._getFromStorage('pricing_plans');
    var plan = null;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plan = plans[i];
        break;
      }
    }

    if (!plan) {
      return {
        success: false,
        trial_length_days: 0,
        message: 'Plan not found.'
      };
    }

    if (!plan.trial_available) {
      return {
        success: false,
        trial_length_days: 0,
        message: 'This plan does not offer a trial.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_trialParams', JSON.stringify({
        planId: planId,
        number_of_users: number_of_users || null,
        billing_term: billing_term || null,
        trial_length_days: plan.trial_length_days || 0,
        started_at: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      trial_length_days: plan.trial_length_days || 0,
      message: 'Trial started successfully.'
    };
  }

  // ===== Interface: getDemoRequestFormOptions =====

  getDemoRequestFormOptions() {
    var raw = localStorage.getItem('demo_request_form_options');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      company_size_ranges: [
        { value: '1_9', label: '1-9 employees' },
        { value: '10_24', label: '10-24 employees' },
        { value: '25_49', label: '25-49 employees' },
        { value: '50_99', label: '50-99 employees' },
        { value: '100_249', label: '100-249 employees' },
        { value: '250_499', label: '250-499 employees' },
        { value: '500_999', label: '500-999 employees' },
        { value: '1000_plus', label: '1000+ employees' }
      ],
      industries: [
        { value: 'software_saas', label: 'Software & SaaS' },
        { value: 'e_commerce', label: 'E-commerce' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'financial_services', label: 'Financial Services' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'education', label: 'Education' },
        { value: 'other', label: 'Other' }
      ],
      interests: [
        { value: 'product_analytics', label: 'Product Analytics' },
        { value: 'workflow_automation', label: 'Workflow Automation' },
        { value: 'analytics', label: 'Analytics' },
        { value: 'automation', label: 'Automation' },
        { value: 'integrations', label: 'Integrations' },
        { value: 'security_compliance', label: 'Security & Compliance' },
        { value: 'other', label: 'Other' }
      ],
      implementation_timelines: [
        { value: 'within_1_month', label: 'Within 1 month' },
        { value: 'one_to_three_months', label: '1-3 months' },
        { value: 'three_to_six_months', label: '3-6 months' },
        { value: 'more_than_six_months', label: 'More than 6 months' },
        { value: 'just_researching', label: 'Just researching' }
      ]
    };
  }

  // ===== Interface: submitDemoRequestForm =====

  submitDemoRequestForm(full_name, work_email, company_name, company_size_range, industry, interests, implementation_timeline, additional_notes) {
    var demo_requests = this._getFromStorage('demo_requests');
    var id = this._generateId('demo_request');
    var submitted_at = this._nowIso();

    var payload = {
      id: id,
      full_name: full_name,
      work_email: work_email,
      company_name: company_name,
      company_size_range: company_size_range,
      industry: industry,
      interests: Array.isArray(interests) ? interests : [],
      implementation_timeline: implementation_timeline,
      additional_notes: additional_notes || '',
      submitted_at: submitted_at,
      status: 'new'
    };

    demo_requests.push(payload);
    this._saveToStorage('demo_requests', demo_requests);

    return {
      demo_request_id: id,
      status: 'new',
      submitted_at: submitted_at,
      success: true,
      message: 'Demo request submitted successfully.'
    };
  }

  // ===== Interface: getCaseStudiesFilterOptions =====

  getCaseStudiesFilterOptions() {
    var raw = localStorage.getItem('case_studies_filter_options');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      industries: [
        { value: 'e_commerce', label: 'E-commerce' },
        { value: 'software_saas', label: 'Software & SaaS' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'financial_services', label: 'Financial Services' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'education', label: 'Education' },
        { value: 'other', label: 'Other' }
      ],
      conversion_rate_uplift_filter: {
        min_percent: 0,
        max_percent: 100,
        step: 1,
        preset_thresholds: [
          { value: 5, label: '5% or higher' },
          { value: 10, label: '10% or higher' },
          { value: 15, label: '15% or higher' },
          { value: 25, label: '25% or higher' }
        ]
      },
      sort_options: [
        { value: 'highest_impact', label: 'Highest impact' },
        { value: 'largest_improvement', label: 'Largest improvement' },
        { value: 'newest', label: 'Newest' }
      ]
    };
  }

  // ===== Interface: searchCaseStudies =====

  searchCaseStudies(industry, min_conversion_rate_uplift_percent, sort_by, limit, offset) {
    var all = this._getFromStorage('case_studies');
    var filteredSorted = this._filterAndSortCaseStudies(all, {
      industry: industry,
      min_conversion_rate_uplift_percent: min_conversion_rate_uplift_percent,
      sort_by: sort_by || 'newest'
    });

    var start = typeof offset === 'number' ? offset : 0;
    var end = typeof limit === 'number' ? (start + limit) : filteredSorted.length;
    var slice = filteredSorted.slice(start, end);

    var results = [];
    for (var i = 0; i < slice.length; i++) {
      var cs = slice[i];
      results.push({
        id: cs.id,
        title: cs.title,
        customer_name: cs.customer_name,
        industry: cs.industry,
        industry_label: this._getIndustryLabel(cs.industry),
        headline: cs.headline,
        summary: cs.summary,
        conversion_rate_uplift_percent: cs.conversion_rate_uplift_percent,
        impact_score: cs.impact_score,
        published_at: cs.published_at,
        url_slug: cs.url_slug,
        is_featured: !!cs.is_featured
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_caseStudySearchParams', JSON.stringify({
        industry: industry || null,
        min_conversion_rate_uplift_percent: typeof min_conversion_rate_uplift_percent === 'number' ? min_conversion_rate_uplift_percent : null,
        sort_by: sort_by || null,
        limit: typeof limit === 'number' ? limit : null,
        offset: typeof offset === 'number' ? offset : null,
        timestamp: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // ===== Interface: getCaseStudyDetail =====

  getCaseStudyDetail(slug) {
    var all = this._getFromStorage('case_studies');
    var cs = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].url_slug === slug || all[i].id === slug) {
        cs = all[i];
        break;
      }
    }

    if (!cs) {
      return {
        meta: null,
        challenge_section: '',
        solution_section: '',
        usage_section: '',
        results_section: {
          conversion_rate_uplift_percent: null,
          other_primary_metric_label: null,
          other_primary_metric_value: null,
          additional_metrics: []
        },
        quotes: [],
        ctas: {
          primary_cta_label: 'Talk to sales',
          primary_cta_target_page: 'talk_to_sales',
          secondary_cta_label: 'See pricing',
          secondary_cta_target_page: 'pricing'
        }
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_openedCaseStudy', JSON.stringify({
        id: cs.id,
        slug: cs.url_slug || slug,
        industry: cs.industry || null,
        conversion_rate_uplift_percent: typeof cs.conversion_rate_uplift_percent === 'number' ? cs.conversion_rate_uplift_percent : null,
        impact_score: typeof cs.impact_score === 'number' ? cs.impact_score : null,
        opened_at: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      meta: {
        id: cs.id,
        title: cs.title,
        customer_name: cs.customer_name,
        industry: cs.industry,
        industry_label: this._getIndustryLabel(cs.industry),
        headline: cs.headline,
        published_at: cs.published_at
      },
      challenge_section: '',
      solution_section: '',
      usage_section: '',
      results_section: {
        conversion_rate_uplift_percent: cs.conversion_rate_uplift_percent,
        other_primary_metric_label: cs.other_primary_metric_label,
        other_primary_metric_value: cs.other_primary_metric_value,
        additional_metrics: []
      },
      quotes: [],
      ctas: {
        primary_cta_label: 'Talk to sales',
        primary_cta_target_page: 'talk_to_sales',
        secondary_cta_label: 'See pricing',
        secondary_cta_target_page: 'pricing'
      }
    };
  }

  // ===== Interface: getIntegrationsFilterOptions =====

  getIntegrationsFilterOptions() {
    var raw = localStorage.getItem('integrations_filter_options');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      categories: [
        { value: 'crm', label: 'CRM' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'analytics', label: 'Analytics' },
        { value: 'support', label: 'Support' },
        { value: 'collaboration', label: 'Collaboration' },
        { value: 'billing', label: 'Billing' },
        { value: 'other', label: 'Other' }
      ],
      feature_filters: [
        {
          key: 'supports_two_way_sync',
          label: 'Two-way sync',
          type: 'boolean'
        }
      ],
      sort_options: [
        { value: 'most_popular', label: 'Most popular' },
        { value: 'a_z', label: 'Alphabetical (A-Z)' },
        { value: 'newest', label: 'Newest' }
      ],
      comparison_limits: {
        max_comparisons: 3
      }
    };
  }

  // ===== Interface: searchIntegrations =====

  searchIntegrations(category, supports_two_way_sync, sort_by, limit, offset) {
    var all = this._getFromStorage('integrations');
    var filtered = [];

    for (var i = 0; i < all.length; i++) {
      var integ = all[i];
      if (category && integ.category !== category) continue;
      if (supports_two_way_sync === true && !integ.supports_two_way_sync) continue;
      filtered.push(integ);
    }

    filtered.sort((function () {
      return function (a, b) {
        if (sort_by === 'most_popular') {
          var ar = typeof a.popularity_rank === 'number' ? a.popularity_rank : 9999;
          var br = typeof b.popularity_rank === 'number' ? b.popularity_rank : 9999;
          return ar - br;
        }
        if (sort_by === 'a_z') {
          var an = (a.name || '').toLowerCase();
          var bn = (b.name || '').toLowerCase();
          if (an < bn) return -1;
          if (an > bn) return 1;
          return 0;
        }
        if (sort_by === 'newest') {
          var ad = a.created_at ? Date.parse(a.created_at) : 0;
          var bd = b.created_at ? Date.parse(b.created_at) : 0;
          return bd - ad;
        }
        return 0;
      };
    })());

    var start = typeof offset === 'number' ? offset : 0;
    var end = typeof limit === 'number' ? (start + limit) : filtered.length;
    var slice = filtered.slice(start, end);

    var results = [];
    for (var j = 0; j < slice.length; j++) {
      var integ2 = slice[j];
      results.push({
        id: integ2.id,
        name: integ2.name,
        slug: integ2.slug,
        description: integ2.description,
        logo_url: integ2.logo_url,
        category: integ2.category,
        category_label: this._getIntegrationCategoryLabel(integ2.category),
        supports_two_way_sync: !!integ2.supports_two_way_sync,
        supports_two_way_sync_label: this._getSupportsTwoWaySyncLabel(!!integ2.supports_two_way_sync),
        popularity_rank: integ2.popularity_rank,
        website_url: integ2.website_url,
        documentation_url: integ2.documentation_url,
        is_featured: !!integ2.is_featured
      });
    }

    return results;
  }

  // ===== Interface: addIntegrationToComparison =====

  addIntegrationToComparison(integrationId) {
    var comparisonSet = this._getOrCreateIntegrationComparisonSet();
    var options = this.getIntegrationsFilterOptions();
    var max = options && options.comparison_limits && options.comparison_limits.max_comparisons
      ? options.comparison_limits.max_comparisons
      : 3;

    if (comparisonSet.integrationIds.indexOf(integrationId) !== -1) {
      // Already present
      var integrationsFullExisting = this._getFromStorage('integrations');
      var resolvedExisting = [];
      for (var r = 0; r < comparisonSet.integrationIds.length; r++) {
        var id = comparisonSet.integrationIds[r];
        for (var s = 0; s < integrationsFullExisting.length; s++) {
          if (integrationsFullExisting[s].id === id) {
            resolvedExisting.push(integrationsFullExisting[s]);
            break;
          }
        }
      }
      return {
        comparison_set_id: comparisonSet.id,
        integrationIds: comparisonSet.integrationIds.slice(),
        current_count: comparisonSet.integrationIds.length,
        max_allowed: max,
        success: true,
        message: 'Integration already in comparison set.',
        integrations: resolvedExisting
      };
    }

    if (comparisonSet.integrationIds.length >= max) {
      return {
        comparison_set_id: comparisonSet.id,
        integrationIds: comparisonSet.integrationIds.slice(),
        current_count: comparisonSet.integrationIds.length,
        max_allowed: max,
        success: false,
        message: 'Maximum number of integrations reached for comparison.'
      };
    }

    comparisonSet.integrationIds.push(integrationId);

    // Persist set
    var sets = this._getFromStorage('integration_comparison_sets');
    for (var i = 0; i < sets.length; i++) {
      if (sets[i].id === comparisonSet.id) {
        sets[i] = comparisonSet;
        break;
      }
    }
    this._saveToStorage('integration_comparison_sets', sets);
    localStorage.setItem('current_integration_comparison_set_id', comparisonSet.id);

    // Resolve integrations for return
    var integrationsFull = this._getFromStorage('integrations');
    var resolved = [];
    for (var j = 0; j < comparisonSet.integrationIds.length; j++) {
      var cid = comparisonSet.integrationIds[j];
      for (var k = 0; k < integrationsFull.length; k++) {
        if (integrationsFull[k].id === cid) {
          resolved.push(integrationsFull[k]);
          break;
        }
      }
    }

    return {
      comparison_set_id: comparisonSet.id,
      integrationIds: comparisonSet.integrationIds.slice(),
      current_count: comparisonSet.integrationIds.length,
      max_allowed: max,
      success: true,
      message: 'Integration added to comparison.',
      integrations: resolved
    };
  }

  // ===== Interface: removeIntegrationFromComparison =====

  removeIntegrationFromComparison(integrationId) {
    var comparisonSet = this._getOrCreateIntegrationComparisonSet();
    var idx = comparisonSet.integrationIds.indexOf(integrationId);
    if (idx !== -1) {
      comparisonSet.integrationIds.splice(idx, 1);
    }

    var sets = this._getFromStorage('integration_comparison_sets');
    for (var i = 0; i < sets.length; i++) {
      if (sets[i].id === comparisonSet.id) {
        sets[i] = comparisonSet;
        break;
      }
    }
    this._saveToStorage('integration_comparison_sets', sets);

    return {
      comparison_set_id: comparisonSet.id,
      integrationIds: comparisonSet.integrationIds.slice(),
      current_count: comparisonSet.integrationIds.length,
      success: true
    };
  }

  // ===== Interface: getCurrentIntegrationComparison =====

  getCurrentIntegrationComparison() {
    var comparisonSet = this._getOrCreateIntegrationComparisonSet();
    var integrationsAll = this._getFromStorage('integrations');

    var integrations = [];
    for (var i = 0; i < comparisonSet.integrationIds.length; i++) {
      var id = comparisonSet.integrationIds[i];
      var found = null;
      for (var j = 0; j < integrationsAll.length; j++) {
        if (integrationsAll[j].id === id) {
          found = integrationsAll[j];
          break;
        }
      }
      if (found) {
        integrations.push({
          id: found.id,
          name: found.name,
          slug: found.slug,
          logo_url: found.logo_url,
          category: found.category,
          category_label: this._getIntegrationCategoryLabel(found.category),
          supports_two_way_sync: !!found.supports_two_way_sync,
          supports_two_way_sync_label: this._getSupportsTwoWaySyncLabel(!!found.supports_two_way_sync),
          website_url: found.website_url,
          documentation_url: found.documentation_url
        });
      }
    }

    // Build comparison rows
    var comparison_rows = [];
    var valuesTwoWay = [];
    var valuesCategory = [];
    var valuesWebsite = [];
    var valuesDocs = [];
    for (var k = 0; k < integrations.length; k++) {
      var integ = integrations[k];
      valuesTwoWay.push({ integrationId: integ.id, value: integ.supports_two_way_sync_label });
      valuesCategory.push({ integrationId: integ.id, value: integ.category_label });
      valuesWebsite.push({ integrationId: integ.id, value: integ.website_url || '' });
      valuesDocs.push({ integrationId: integ.id, value: integ.documentation_url || '' });
    }

    if (integrations.length > 0) {
      comparison_rows.push({
        feature_key: 'two_way_sync',
        feature_label: 'Synchronization',
        values_by_integration: valuesTwoWay
      });
      comparison_rows.push({
        feature_key: 'category',
        feature_label: 'Category',
        values_by_integration: valuesCategory
      });
      comparison_rows.push({
        feature_key: 'website_url',
        feature_label: 'Website',
        values_by_integration: valuesWebsite
      });
      comparison_rows.push({
        feature_key: 'documentation_url',
        feature_label: 'Documentation',
        values_by_integration: valuesDocs
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_comparisonViewed', JSON.stringify({
        comparison_set_id: comparisonSet.id,
        integrationIds: integrations.map(function (i) { return i.id; }),
        viewed_at: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      comparison_set_id: comparisonSet.id,
      integrations: integrations,
      comparison_rows: comparison_rows
    };
  }

  // ===== Interface: clearIntegrationComparison =====

  clearIntegrationComparison() {
    var currentId = localStorage.getItem('current_integration_comparison_set_id');
    if (currentId) {
      var sets = this._getFromStorage('integration_comparison_sets');
      var remaining = [];
      for (var i = 0; i < sets.length; i++) {
        if (sets[i].id !== currentId) {
          remaining.push(sets[i]);
        }
      }
      this._saveToStorage('integration_comparison_sets', remaining);
      localStorage.removeItem('current_integration_comparison_set_id');
    }
    return { success: true };
  }

  // ===== Interface: getResourceLibraryFilterOptions =====

  getResourceLibraryFilterOptions() {
    var raw = localStorage.getItem('resource_library_filter_options');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    var items = this._getFromStorage('resource_items');
    var yearSet = {};
    for (var i = 0; i < items.length; i++) {
      var y = items[i].publication_year;
      if (typeof y === 'number') {
        yearSet[y] = true;
      }
    }
    var years = Object.keys(yearSet).map(function (v) { return parseInt(v, 10); });
    years.sort(function (a, b) { return b - a; });

    return {
      categories: [
        { value: 'security_compliance', label: 'Security & Compliance' },
        { value: 'product', label: 'Product' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'customer_stories', label: 'Customer Stories' },
        { value: 'roi', label: 'ROI' },
        { value: 'other', label: 'Other' }
      ],
      content_types: [
        { value: 'whitepaper', label: 'Whitepaper' },
        { value: 'ebook', label: 'Ebook' },
        { value: 'report', label: 'Report' },
        { value: 'case_study', label: 'Case study' },
        { value: 'guide', label: 'Guide' },
        { value: 'checklist', label: 'Checklist' },
        { value: 'infographic', label: 'Infographic' },
        { value: 'video', label: 'Video' },
        { value: 'datasheet', label: 'Datasheet' }
      ],
      years: years,
      sort_options: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' },
        { value: 'featured', label: 'Featured' }
      ]
    };
  }

  // ===== Interface: searchResources =====

  searchResources(category, content_type, publication_year, sort_by, limit, offset) {
    var all = this._getFromStorage('resource_items');
    var filtered = [];

    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      if (category && r.category !== category) continue;
      if (content_type && r.content_type !== content_type) continue;
      if (typeof publication_year === 'number' && r.publication_year !== publication_year) continue;
      filtered.push(r);
    }

    filtered.sort(function (a, b) {
      if (sort_by === 'featured') {
        var af = a.is_featured ? 1 : 0;
        var bf = b.is_featured ? 1 : 0;
        if (bf !== af) return bf - af;
        var ad = a.publication_date ? Date.parse(a.publication_date) : 0;
        var bd = b.publication_date ? Date.parse(b.publication_date) : 0;
        return bd - ad;
      }
      if (sort_by === 'oldest_first') {
        var ad2 = a.publication_date ? Date.parse(a.publication_date) : 0;
        var bd2 = b.publication_date ? Date.parse(b.publication_date) : 0;
        return ad2 - bd2;
      }
      // default newest_first
      var ad3 = a.publication_date ? Date.parse(a.publication_date) : 0;
      var bd3 = b.publication_date ? Date.parse(b.publication_date) : 0;
      return bd3 - ad3;
    });

    var start = typeof offset === 'number' ? offset : 0;
    var end = typeof limit === 'number' ? (start + limit) : filtered.length;
    var slice = filtered.slice(start, end);

    var results = [];
    for (var j = 0; j < slice.length; j++) {
      var it = slice[j];
      results.push({
        id: it.id,
        title: it.title,
        slug: it.slug,
        description: it.description,
        category: it.category,
        category_label: this._getResourceCategoryLabel(it.category),
        content_type: it.content_type,
        content_type_label: this._getContentTypeLabel(it.content_type),
        publication_year: it.publication_year,
        publication_date: it.publication_date,
        reading_time_minutes: it.reading_time_minutes,
        thumbnail_url: it.thumbnail_url,
        is_gated: !!it.is_gated,
        is_featured: !!it.is_featured
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task7_resourceSearchParams', JSON.stringify({
        category: category || null,
        content_type: content_type || null,
        publication_year: typeof publication_year === 'number' ? publication_year : null,
        sort_by: sort_by || null,
        limit: typeof limit === 'number' ? limit : null,
        offset: typeof offset === 'number' ? offset : null,
        timestamp: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // ===== Interface: getResourceDetail =====

  getResourceDetail(slug) {
    var all = this._getFromStorage('resource_items');
    var res = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].slug === slug || all[i].id === slug) {
        res = all[i];
        break;
      }
    }

    if (!res) {
      return {
        meta: null,
        abstract: '',
        description: '',
        key_takeaways: [],
        intended_audience: ''
      };
    }

    return {
      meta: {
        id: res.id,
        title: res.title,
        category: res.category,
        category_label: this._getResourceCategoryLabel(res.category),
        content_type: res.content_type,
        content_type_label: this._getContentTypeLabel(res.content_type),
        publication_date: res.publication_date,
        reading_time_minutes: res.reading_time_minutes,
        is_gated: !!res.is_gated
      },
      abstract: res.description || '',
      description: res.description || '',
      key_takeaways: [],
      intended_audience: ''
    };
  }

  // ===== Interface: recordResourceDownload =====

  recordResourceDownload(resourceId) {
    var all = this._getFromStorage('resource_items');
    var res = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === resourceId) {
        res = all[i];
        break;
      }
    }

    if (!res) {
      return {
        success: false,
        is_gated: false,
        message: 'Resource not found.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task7_downloadedResource', JSON.stringify({
        resourceId: res.id,
        category: res.category || null,
        content_type: res.content_type || null,
        publication_year: typeof res.publication_year === 'number' ? res.publication_year : null,
        publication_date: res.publication_date || null,
        downloaded_at: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      is_gated: !!res.is_gated,
      message: res.is_gated ? 'Resource is gated. Additional steps may be required.' : 'Download ready.'
    };
  }

  // ===== Interface: getWebinarFilterOptions =====

  getWebinarFilterOptions() {
    var raw = localStorage.getItem('webinar_filter_options');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      topics: [
        { value: 'onboarding', label: 'Onboarding' },
        { value: 'product_tour', label: 'Product tour' },
        { value: 'best_practices', label: 'Best practices' },
        { value: 'advanced_analytics', label: 'Advanced analytics' },
        { value: 'security_compliance', label: 'Security & compliance' },
        { value: 'integrations', label: 'Integrations' },
        { value: 'other', label: 'Other' }
      ],
      date_ranges: [
        { value: 'next_7_days', label: 'Next 7 days' },
        { value: 'next_30_days', label: 'Next 30 days' },
        { value: 'all_upcoming', label: 'All upcoming' }
      ],
      sort_options: [
        { value: 'soonest_first', label: 'Soonest first' },
        { value: 'newest', label: 'Newest' },
        { value: 'a_z', label: 'Alphabetical (A-Z)' }
      ]
    };
  }

  // ===== Interface: searchWebinars =====

  searchWebinars(topic, date_range, status, sort_by, limit, offset) {
    var all = this._getFromStorage('webinars');
    var now = Date.now();
    var days7 = 7 * 24 * 60 * 60 * 1000;
    var days30 = 30 * 24 * 60 * 60 * 1000;

    var filtered = [];
    for (var i = 0; i < all.length; i++) {
      var w = all[i];
      if (topic && w.topic !== topic) continue;
      if (status && w.status !== status) continue;

      var startTs = w.start_datetime ? Date.parse(w.start_datetime) : null;

      if (date_range === 'next_7_days') {
        if (!startTs) continue;
        if (startTs < now || startTs > now + days7) continue;
      } else if (date_range === 'next_30_days') {
        if (!startTs) continue;
        if (startTs < now || startTs > now + days30) continue;
      } else if (date_range === 'all_upcoming') {
        if (!startTs || startTs < now) continue;
      }

      filtered.push(w);
    }

    filtered.sort(function (a, b) {
      if (sort_by === 'soonest_first') {
        var as = a.start_datetime ? Date.parse(a.start_datetime) : 0;
        var bs = b.start_datetime ? Date.parse(b.start_datetime) : 0;
        return as - bs;
      }
      if (sort_by === 'a_z') {
        var at = (a.title || '').toLowerCase();
        var bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      }
      if (sort_by === 'newest') {
        var as2 = a.start_datetime ? Date.parse(a.start_datetime) : 0;
        var bs2 = b.start_datetime ? Date.parse(b.start_datetime) : 0;
        return bs2 - as2;
      }
      return 0;
    });

    var start = typeof offset === 'number' ? offset : 0;
    var end = typeof limit === 'number' ? (start + limit) : filtered.length;
    var slice = filtered.slice(start, end);

    var results = [];
    for (var j = 0; j < slice.length; j++) {
      var w2 = slice[j];
      results.push({
        id: w2.id,
        title: w2.title,
        slug: w2.slug,
        description: w2.description,
        topic: w2.topic,
        topic_label: this._getWebinarTopicLabel(w2.topic),
        status: w2.status,
        start_datetime: w2.start_datetime,
        end_datetime: w2.end_datetime,
        timezone: w2.timezone,
        is_live: !!w2.is_live
      });
    }

    return results;
  }

  // ===== Interface: getWebinarDetail =====

  getWebinarDetail(slug) {
    var all = this._getFromStorage('webinars');
    var w = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].slug === slug || all[i].id === slug) {
        w = all[i];
        break;
      }
    }

    if (!w) {
      return {
        meta: null,
        description: '',
        speakers: [],
        max_attendees: null
      };
    }

    return {
      meta: {
        id: w.id,
        title: w.title,
        topic: w.topic,
        topic_label: this._getWebinarTopicLabel(w.topic),
        status: w.status,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        timezone: w.timezone,
        is_live: !!w.is_live
      },
      description: w.description || '',
      speakers: Array.isArray(w.speakers) ? w.speakers : [],
      max_attendees: w.max_attendees
    };
  }

  // ===== Interface: registerForWebinar =====

  registerForWebinar(webinarId, full_name, work_email, source) {
    var webinars = this._getFromStorage('webinars');
    var webinar = null;
    for (var i = 0; i < webinars.length; i++) {
      if (webinars[i].id === webinarId) {
        webinar = webinars[i];
        break;
      }
    }

    if (!webinar) {
      return {
        registration_id: null,
        webinarId: webinarId,
        registered_at: null,
        success: false,
        message: 'Webinar not found.'
      };
    }

    var regs = this._getFromStorage('webinar_registrations');
    var id = this._generateId('webinar_registration');
    var registered_at = this._nowIso();
    var src = source || 'website';

    var reg = {
      id: id,
      webinarId: webinarId,
      full_name: full_name,
      work_email: work_email,
      registered_at: registered_at,
      source: src
    };

    regs.push(reg);
    this._saveToStorage('webinar_registrations', regs);

    // Resolve foreign key webinar
    var registrationReturn = {
      registration_id: id,
      webinarId: webinarId,
      registered_at: registered_at,
      success: true,
      message: 'Registration successful.',
      webinar: webinar
    };

    return registrationReturn;
  }

  // ===== Interface: getRoiCalculatorConfig =====

  getRoiCalculatorConfig() {
    var raw = localStorage.getItem('roi_calculator_config');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      default_team_size: 10,
      default_hours_saved_per_person_per_week: 2,
      default_hourly_rate: 40,
      supported_periods: ['annual', 'monthly', 'weekly'],
      assumptions_text: 'Annual savings are based on 52 working weeks per year. ROI percent may not be computed if product pricing is not configured.'
    };
  }

  // ===== Interface: calculateRoi =====

  calculateRoi(team_size, hours_saved_per_person_per_week, hourly_rate, period) {
    var values = this._computeRoiValues(team_size, hours_saved_per_person_per_week, hourly_rate, period);

    var calculations = this._getFromStorage('roi_calculations');
    var id = this._generateId('roi_calculation');
    var created_at = this._nowIso();

    var calc = {
      id: id,
      team_size: team_size,
      hours_saved_per_person_per_week: hours_saved_per_person_per_week,
      hourly_rate: hourly_rate,
      period: period,
      calculated_annual_savings: values.calculated_annual_savings,
      calculated_monthly_savings: values.calculated_monthly_savings,
      roi_percent: values.roi_percent,
      payback_period_months: values.payback_period_months,
      assumptions: values.assumptions,
      created_at: created_at
    };

    calculations.push(calc);
    this._saveToStorage('roi_calculations', calculations);

    return {
      roi_calculation_id: id,
      team_size: team_size,
      hours_saved_per_person_per_week: hours_saved_per_person_per_week,
      hourly_rate: hourly_rate,
      period: period,
      calculated_annual_savings: values.calculated_annual_savings,
      calculated_monthly_savings: values.calculated_monthly_savings,
      roi_percent: values.roi_percent,
      payback_period_months: values.payback_period_months,
      assumptions: values.assumptions,
      created_at: created_at
    };
  }

  // ===== Interface: sendRoiResultEmail =====

  sendRoiResultEmail(roiCalculationId, sender_name, colleague_email, message) {
    var calculations = this._getFromStorage('roi_calculations');
    var calc = null;
    for (var i = 0; i < calculations.length; i++) {
      if (calculations[i].id === roiCalculationId) {
        calc = calculations[i];
        break;
      }
    }

    if (!calc) {
      return {
        roi_result_email_id: null,
        sent_at: null,
        success: false,
        message: 'ROI calculation not found.'
      };
    }

    var emails = this._getFromStorage('roi_result_emails');
    var id = this._generateId('roi_result_email');
    var sent_at = this._nowIso();

    var emailRecord = {
      id: id,
      roiCalculationId: roiCalculationId,
      sender_name: sender_name,
      colleague_email: colleague_email,
      sent_at: sent_at,
      message: message || ''
    };

    emails.push(emailRecord);
    this._saveToStorage('roi_result_emails', emails);

    return {
      roi_result_email_id: id,
      sent_at: sent_at,
      success: true,
      message: 'ROI result email queued successfully.',
      roi_calculation: calc
    };
  }

  // ===== Interface: getNewsletterSubscriptionOptions =====

  getNewsletterSubscriptionOptions() {
    var raw = localStorage.getItem('newsletter_subscription_options');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      topics: [
        { value: 'product_updates', label: 'Product updates' },
        { value: 'company_news', label: 'Company news' },
        { value: 'events_webinars', label: 'Events & webinars' },
        { value: 'best_practices', label: 'Best practices' },
        { value: 'security_compliance', label: 'Security & compliance' }
      ],
      regions: [
        { value: 'europe', label: 'Europe' },
        { value: 'north_america', label: 'North America' },
        { value: 'latin_america', label: 'Latin America' },
        { value: 'asia_pacific', label: 'Asia Pacific' },
        { value: 'middle_east_africa', label: 'Middle East & Africa' },
        { value: 'global', label: 'Global' }
      ],
      roles: [
        { value: 'product_manager', label: 'Product Manager' },
        { value: 'marketer', label: 'Marketer' },
        { value: 'engineer', label: 'Engineer' },
        { value: 'executive', label: 'Executive' },
        { value: 'sales', label: 'Sales' },
        { value: 'customer_success', label: 'Customer Success' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // ===== Interface: subscribeToNewsletter =====

  subscribeToNewsletter(email, topics, region, role) {
    var subs = this._getFromStorage('newsletter_subscriptions');
    var id = this._generateId('newsletter_subscription');
    var subscribed_at = this._nowIso();

    var sub = {
      id: id,
      email: email,
      topics: Array.isArray(topics) ? topics : [],
      region: region,
      role: role || null,
      subscribed_at: subscribed_at,
      confirmed: false
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription_id: id,
      email: email,
      topics: sub.topics,
      region: region,
      role: role || null,
      subscribed_at: subscribed_at,
      confirmed: false,
      success: true,
      message: 'Subscription created. Please check your email to confirm.'
    };
  }

  // ===== Interface: getAboutPageContent =====

  getAboutPageContent() {
    var raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      mission: 'Help modern teams make better decisions and automate workflows.',
      vision: 'A world where every team is data-driven and operationally excellent.',
      values: [],
      leadership_team: [],
      milestones: [],
      trust_highlights: {
        security_compliance_summary: 'Enterprise-grade security and compliance.',
        customer_base_summary: ''
      },
      ctas: {
        talk_to_sales_label: 'Talk to sales',
        pricing_label: 'See pricing'
      }
    };
  }

  // ===== Interface: getContactPageContent =====

  getContactPageContent() {
    var raw = localStorage.getItem('contact_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      form_topics: [
        { value: 'general', label: 'General' },
        { value: 'sales', label: 'Sales' },
        { value: 'support', label: 'Support' },
        { value: 'billing', label: 'Billing' },
        { value: 'security_compliance', label: 'Security & Compliance' },
        { value: 'other', label: 'Other' }
      ],
      contact_channels: {
        sales_email: 'sales@example.com',
        support_email: 'support@example.com',
        general_email: 'hello@example.com',
        mailing_address: ''
      },
      response_expectations: 'We typically respond within 1-2 business days.'
    };
  }

  // ===== Interface: submitContactForm =====

  submitContactForm(full_name, email, topic, message, consent_to_contact) {
    var submissions = this._getFromStorage('contact_form_submissions');
    var id = this._generateId('contact_ticket');
    var created_at = this._nowIso();

    var record = {
      id: id,
      full_name: full_name,
      email: email,
      topic: topic,
      message: message,
      consent_to_contact: !!consent_to_contact,
      created_at: created_at
    };

    submissions.push(record);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      ticket_id: id,
      success: true,
      message: 'Your message has been sent.'
    };
  }

  // ===== Interface: getLegalDocumentsContent =====

  getLegalDocumentsContent() {
    var raw = localStorage.getItem('legal_documents_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    return {
      privacy_policy_summary: 'We respect your privacy and protect your data in accordance with applicable laws.',
      terms_of_service_summary: 'Use of the service is subject to our Terms of Service.',
      cookie_policy_summary: 'We use cookies to improve your experience and for analytics.',
      compliance_commitments: [],
      legal_contact_information: ''
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