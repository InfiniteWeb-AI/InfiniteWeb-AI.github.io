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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const tables = [
      'services',
      'cloud_migration_quote_requests',
      'plans',
      'plan_onboarding_requests',
      'saved_plans_items',
      'blog_posts',
      'reading_list_items',
      'experts',
      'consultation_bookings',
      'bundle_configurations',
      'bundle_configuration_items',
      'case_studies',
      'case_study_inquiries',
      'newsletter_subscriptions',
      'resources',
      'general_contact_inquiries'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data || []));
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

  _createTimestamp() {
    return new Date().toISOString();
  }

  // ---------------------- Label / Mapping Helpers ----------------------

  _companySizeLabel(value) {
    switch (value) {
      case 'size_1_50': return '1–50 employees';
      case 'size_51_200': return '51–200 employees';
      case 'size_201_500': return '201–500 employees';
      case 'size_501_1000': return '501–1000 employees';
      case 'size_1000_plus': return '1000+ employees';
      default: return 'All company sizes';
    }
  }

  _planCategoryLabel(value) {
    switch (value) {
      case 'managed_it': return 'Managed IT';
      case 'cybersecurity': return 'Cybersecurity';
      case 'cloud_services': return 'Cloud Services';
      case 'bundle': return 'Service Bundle';
      case 'startup': return 'Startup';
      case 'other_plan': return 'Other';
      default: return 'Plan';
    }
  }

  _serviceTypeLabel(value) {
    switch (value) {
      case 'cloud_migration': return 'Cloud Migration';
      case 'managed_it': return 'Managed IT';
      case 'cybersecurity': return 'Cybersecurity';
      case 'data_analytics': return 'Data Analytics';
      case 'cloud_management': return 'Cloud Management';
      case 'help_desk_support': return 'Help Desk Support';
      case 'cybersecurity_monitoring': return 'Cybersecurity Monitoring';
      case 'other_service': return 'Other Service';
      default: return 'Service';
    }
  }

  _blogCategoryLabel(value) {
    switch (value) {
      case 'cybersecurity': return 'Cybersecurity';
      case 'cloud': return 'Cloud';
      case 'data_analytics': return 'Data Analytics';
      case 'managed_it': return 'Managed IT';
      case 'remote_work': return 'Remote Work';
      case 'compliance': return 'Compliance';
      case 'general_it': return 'General IT';
      case 'other': return 'Other';
      default: return 'Blog';
    }
  }

  _primaryTopicLabel(value) {
    switch (value) {
      case 'cybersecurity': return 'Cybersecurity';
      case 'cloud': return 'Cloud';
      case 'data_analytics': return 'Data Analytics';
      case 'managed_it': return 'Managed IT';
      case 'remote_work': return 'Remote Work';
      case 'compliance': return 'Compliance';
      case 'general_it': return 'General IT';
      case 'other': return 'Other';
      default: return 'Topic';
    }
  }

  _audienceLabel(value) {
    switch (value) {
      case 'remote_workers': return 'Remote Workers';
      case 'small_business': return 'Small Business';
      case 'mid_market': return 'Mid-market';
      case 'enterprise': return 'Enterprise';
      case 'it_leaders': return 'IT Leaders';
      case 'general_audience': return 'General Audience';
      default: return 'Audience';
    }
  }

  _contentTypeLabel(value) {
    switch (value) {
      case 'checklist': return 'Checklist';
      case 'guide': return 'Guide';
      case 'whitepaper': return 'Whitepaper';
      case 'ebook': return 'eBook';
      case 'webinar': return 'Webinar';
      case 'template': return 'Template';
      case 'article': return 'Article';
      case 'video': return 'Video';
      default: return 'Resource';
    }
  }

  _expertiseLabel(value) {
    switch (value) {
      case 'data_analytics': return 'Data Analytics';
      case 'business_intelligence': return 'Business Intelligence';
      case 'cloud': return 'Cloud';
      case 'cybersecurity': return 'Cybersecurity';
      case 'managed_it': return 'Managed IT';
      case 'infrastructure': return 'Infrastructure';
      case 'other': return 'Other';
      default: return 'Expertise';
    }
  }

  _industryLabel(value) {
    switch (value) {
      case 'healthcare': return 'Healthcare';
      case 'medical': return 'Medical';
      case 'finance': return 'Finance';
      case 'retail': return 'Retail';
      case 'manufacturing': return 'Manufacturing';
      case 'technology': return 'Technology';
      case 'education': return 'Education';
      case 'government': return 'Government';
      case 'non_profit': return 'Non-profit';
      case 'other': return 'Other';
      default: return 'Industry';
    }
  }

  _pricingUnitLabel(value) {
    switch (value) {
      case 'per_user': return 'per user / month';
      case 'per_device': return 'per device / month';
      case 'per_server': return 'per server / month';
      case 'flat_monthly': return 'flat monthly';
      default: return 'per month';
    }
  }

  // ---------------------- Internal Collections Helpers ----------------------

  _getOrCreateReadingList() {
    // Single-user reading list
    const items = this._getFromStorage('reading_list_items');
    return Array.isArray(items) ? items : [];
  }

  _getOrCreateSavedPlans() {
    const items = this._getFromStorage('saved_plans_items');
    return Array.isArray(items) ? items : [];
  }

  _calculateBundleTotals(items) {
    const services = this._getFromStorage('services');
    const lineItems = [];
    let total = 0;

    if (!Array.isArray(items)) {
      return { lineItems: [], totalMonthlyCost: 0 };
    }

    for (const it of items) {
      if (!it || !it.service_id) continue;
      const service = services.find(s => s.id === it.service_id);
      if (!service) continue;
      const quantity = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1;
      const unitPrice = typeof service.base_monthly_price === 'number' ? service.base_monthly_price : 0;
      const subtotal = unitPrice * quantity;
      total += subtotal;
      lineItems.push({
        service,
        quantity,
        unit_price: unitPrice,
        monthly_subtotal: subtotal
      });
    }

    return { lineItems, totalMonthlyCost: total };
  }

  // ---------------------- 1. getHomePageContent ----------------------

  getHomePageContent() {
    const services = this._getFromStorage('services');
    const plans = this._getFromStorage('plans').filter(p => p.is_visible !== false);
    const caseStudies = this._getFromStorage('case_studies');

    const featuredServices = services.slice(0, 3).map(service => ({
      service,
      ideal_company_size_label: this._companySizeLabel(service.ideal_company_size_range)
    }));

    const featuredPlans = plans.slice(0, 3).map(plan => ({
      plan,
      company_size_range_label: this._companySizeLabel(plan.company_size_range)
    }));

    const highlightStats = [];
    if (caseStudies.length > 0) {
      const healthcareCount = caseStudies.filter(cs => cs.industry === 'healthcare' || cs.industry === 'medical').length;
      const avgDowntime = (caseStudies
        .filter(cs => typeof cs.downtime_reduction_percent === 'number')
        .reduce((sum, cs, _, arr) => sum + cs.downtime_reduction_percent / (arr.length || 1), 0)) || 0;
      highlightStats.push({ label: 'Client case studies', value: String(caseStudies.length) });
      if (healthcareCount > 0) {
        highlightStats.push({ label: 'Healthcare successes', value: String(healthcareCount) });
      }
      if (avgDowntime > 0) {
        highlightStats.push({ label: 'Avg. downtime reduction', value: avgDowntime.toFixed(0) + '%'});
      }
    }

    return {
      hero_heading: 'Modern IT consulting for growing businesses',
      hero_subheading: 'Cloud, security, and data expertise to keep your team productive and secure.',
      primary_ctas: [
        { label: 'View Services', target_page: 'services' },
        { label: 'See Pricing', target_page: 'pricing' },
        { label: 'Explore Case Studies', target_page: 'case_studies' }
      ],
      featured_services: featuredServices,
      featured_plans: featuredPlans,
      highlight_stats: highlightStats
    };
  }

  // ---------------------- 2. submitNewsletterSubscription ----------------------

  submitNewsletterSubscription(full_name, email, preferred_frequency, company_size_range, role, topic_cloud, topic_cybersecurity, topic_managed_it, topic_data_analytics) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter'),
      full_name,
      email,
      preferred_frequency, // expected: 'daily' | 'weekly' | 'monthly' | 'quarterly'
      company_size_range: company_size_range || null,
      role: role || null,
      topic_cloud: !!topic_cloud,
      topic_cybersecurity: !!topic_cybersecurity,
      topic_managed_it: !!topic_managed_it,
      topic_data_analytics: !!topic_data_analytics,
      created_at: this._createTimestamp(),
      is_confirmed: false
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'Subscription created. Please check your email to confirm.'
    };
  }

  // ---------------------- 3. listServiceSummaries ----------------------

  listServiceSummaries() {
    const services = this._getFromStorage('services');

    const benefitsByType = {
      cloud_migration: [
        'Reduce migration risk and downtime',
        'Right-size cloud resources for cost savings',
        'Plan-driven cutover and rollback strategies'
      ],
      managed_it: [
        'Single point of contact for IT issues',
        'Proactive monitoring and maintenance',
        'Predictable monthly billing'
      ],
      cybersecurity: [
        'Strengthen your security posture',
        'Detect and respond to threats faster',
        'Align with compliance frameworks'
      ],
      data_analytics: [
        'Turn raw data into actionable insights',
        'Self-service reporting for business teams',
        'Modern analytics stack design'
      ],
      cloud_management: [
        'Optimize existing cloud workloads',
        'Implement governance and cost controls',
        'Ongoing performance tuning'
      ],
      help_desk_support: [
        'Responsive end-user support',
        'Standardized device onboarding',
        'Clear SLAs and reporting'
      ],
      cybersecurity_monitoring: [
        '24/7 threat monitoring',
        'Alert triage and incident response',
        'Security operations expertise on demand'
      ],
      other_service: [
        'Tailored consulting engagements',
        'Flexible scope and delivery',
        'Expert guidance for unique challenges'
      ]
    };

    return services.map(service => ({
      service,
      ideal_company_size_label: this._companySizeLabel(service.ideal_company_size_range),
      key_benefits: benefitsByType[service.service_type] || []
    }));
  }

  // ---------------------- 4. getServiceDetailBySlug ----------------------

  getServiceDetailBySlug(service_slug) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.slug === service_slug) || null;

    if (!service) {
      return {
        service: null,
        ideal_company_size_label: '',
        typical_scopes: [],
        typical_timelines: [],
        pricing_guidance: []
      };
    }

    let typical_scopes = [];
    let typical_timelines = [];
    let pricing_guidance = [];

    switch (service.service_type) {
      case 'cloud_migration':
        typical_scopes = [
          'Assessment of current on-premises workloads',
          'Cloud readiness and TCO analysis',
          'Pilot, migration, and post-cutover support'
        ];
        typical_timelines = [
          '6–12 weeks for 100–300 users',
          '3–6 months for multi-site environments'
        ];
        pricing_guidance = [
          'Fixed-fee discovery and assessment',
          'Migration priced by workload and complexity',
          'Optional ongoing cloud management retainer'
        ];
        break;
      case 'managed_it':
        typical_scopes = [
          'End-user support and device management',
          'Server and network monitoring',
          'Vendor and license management'
        ];
        typical_timelines = ['Onboarding within 2–4 weeks of contract signature'];
        pricing_guidance = [
          'Per-user or per-device pricing',
          'Volume discounts for 50+ users'
        ];
        break;
      case 'cybersecurity':
      case 'cybersecurity_monitoring':
        typical_scopes = [
          'Security posture assessment',
          'Implementation of security controls',
          'Ongoing monitoring and incident response options'
        ];
        typical_timelines = ['4–8 weeks for initial hardening'];
        pricing_guidance = [
          'Baseline security package for small businesses',
          'Add-ons for advanced monitoring and compliance'
        ];
        break;
      case 'data_analytics':
        typical_scopes = [
          'Data discovery and source inventory',
          'Analytics architecture and tooling selection',
          'Dashboard and report development'
        ];
        typical_timelines = ['8–12 weeks for first production dashboards'];
        pricing_guidance = ['Project-based pricing with optional support retainer'];
        break;
      default:
        typical_scopes = ['Scope defined based on discovery workshop'];
        typical_timelines = ['Timeline tailored to engagement'];
        pricing_guidance = ['Pricing provided after initial scoping'];
    }

    return {
      service,
      ideal_company_size_label: this._companySizeLabel(service.ideal_company_size_range),
      typical_scopes,
      typical_timelines,
      pricing_guidance
    };
  }

  // ---------------------- 5. getCloudMigrationServicePageContent ----------------------

  getCloudMigrationServicePageContent() {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.service_type === 'cloud_migration') || null;

    return {
      service,
      mid_market_pricing_ranges: [
        '$20,000–$50,000 for 200–400 employees',
        '$50,000–$120,000 for multi-region environments'
      ],
      typical_project_timeline: 'Most mid-market migrations complete in 8–16 weeks.',
      budget_range_options: [
        { value: 'under_20000', label: 'Under $20,000' },
        { value: 'between_20000_50000', label: '$20,000–$50,000' },
        { value: 'over_50000', label: 'Over $50,000' }
      ],
      default_desired_start_date_hint: 'Typically 4–6 weeks from today, depending on scope.'
    };
  }

  // ---------------------- 6. submitCloudMigrationQuoteRequest ----------------------

  submitCloudMigrationQuoteRequest(service_id, requester_name, requester_email, num_employees, budget_range, project_description, desired_start_date) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === service_id && s.service_type === 'cloud_migration');
    if (!service) {
      return {
        success: false,
        quote_request: null,
        message: 'Cloud Migration service not found.'
      };
    }

    const quoteRequests = this._getFromStorage('cloud_migration_quote_requests');
    const desiredDateIso = new Date(desired_start_date).toISOString();

    const quote_request = {
      id: this._generateId('cmqr'),
      service_id,
      requester_name,
      requester_email,
      num_employees,
      budget_range, // 'under_20000' | 'between_20000_50000' | 'over_50000'
      project_description,
      desired_start_date: desiredDateIso,
      created_at: this._createTimestamp()
    };

    quoteRequests.push(quote_request);
    this._saveToStorage('cloud_migration_quote_requests', quoteRequests);

    return {
      success: true,
      quote_request,
      message: 'Cloud migration quote request submitted.'
    };
  }

  // ---------------------- 7. getPlanFilterOptions ----------------------

  getPlanFilterOptions() {
    const company_size_filters = [
      { value: 'size_1_50', label: '1–50 employees' },
      { value: 'size_51_200', label: '51–200 employees' },
      { value: 'size_201_500', label: '201–500 employees' },
      { value: 'size_501_1000', label: '501–1000 employees' },
      { value: 'size_1000_plus', label: '1000+ employees' }
    ];

    const plan_category_filters = [
      { value: 'managed_it', label: 'Managed IT' },
      { value: 'cybersecurity', label: 'Cybersecurity' },
      { value: 'cloud_services', label: 'Cloud Services' },
      { value: 'bundle', label: 'Bundles' },
      { value: 'startup', label: 'Startup Plans' },
      { value: 'other_plan', label: 'Other' }
    ];

    const feature_highlights = [
      '24/7 support available',
      'Proactive security monitoring',
      'Flexible monthly terms for growing teams'
    ];

    return { company_size_filters, plan_category_filters, feature_highlights };
  }

  // ---------------------- 8. listPlansForPricingPage ----------------------

  listPlansForPricingPage(company_size_range, plan_category, includes_24_7_support, includes_security_monitoring, max_monthly_price) {
    const plans = this._getFromStorage('plans').filter(p => p.is_visible !== false);
    const savedPlans = this._getOrCreateSavedPlans();

    let filtered = plans;

    if (company_size_range) {
      filtered = filtered.filter(p => p.company_size_range === company_size_range);
    }
    if (plan_category) {
      filtered = filtered.filter(p => p.plan_category === plan_category);
    }
    if (typeof includes_24_7_support === 'boolean') {
      if (includes_24_7_support) {
        filtered = filtered.filter(p => p.includes_24_7_support === true);
      }
    }
    if (typeof includes_security_monitoring === 'boolean') {
      if (includes_security_monitoring) {
        filtered = filtered.filter(p => p.includes_security_monitoring === true);
      }
    }
    if (typeof max_monthly_price === 'number') {
      filtered = filtered.filter(p => typeof p.monthly_price === 'number' && p.monthly_price <= max_monthly_price);
    }

    const resultPlans = filtered.map(plan => {
      const is_shortlisted = savedPlans.some(sp => sp.plan_id === plan.id);
      return {
        plan,
        company_size_range_label: this._companySizeLabel(plan.company_size_range),
        plan_category_label: this._planCategoryLabel(plan.plan_category),
        is_shortlisted
      };
    });

    return {
      plans: resultPlans,
      total_count: resultPlans.length
    };
  }

  // ---------------------- 9. getPlanDetail ----------------------

  getPlanDetail(plan_slug) {
    const plans = this._getFromStorage('plans').filter(p => p.is_visible !== false);
    const plan = plans.find(p => p.slug === plan_slug) || null;
    const savedPlans = this._getOrCreateSavedPlans();

    if (!plan) {
      return {
        plan: null,
        company_size_range_label: '',
        plan_category_label: '',
        feature_details: [],
        includes_24_7_support_label: '24/7 support: No',
        includes_security_monitoring_label: 'Security monitoring: No',
        is_shortlisted: false
      };
    }

    const includes24x7 = !!plan.includes_24_7_support;
    const includesSecMon = !!plan.includes_security_monitoring;
    const feature_details = Array.isArray(plan.feature_list) ? plan.feature_list : [];

    const is_shortlisted = savedPlans.some(sp => sp.plan_id === plan.id);

    return {
      plan,
      company_size_range_label: this._companySizeLabel(plan.company_size_range),
      plan_category_label: this._planCategoryLabel(plan.plan_category),
      feature_details,
      includes_24_7_support_label: includes24x7 ? '24/7 support: Included' : '24/7 support: Not included',
      includes_security_monitoring_label: includesSecMon ? 'Security monitoring: Included' : 'Security monitoring: Not included',
      is_shortlisted
    };
  }

  // ---------------------- 10. submitPlanOnboardingRequest ----------------------

  submitPlanOnboardingRequest(plan_id, full_name, business_email, company_size_range, business_name, notes) {
    const plans = this._getFromStorage('plans').filter(p => p.is_visible !== false);
    const plan = plans.find(p => p.id === plan_id);
    if (!plan) {
      return {
        success: false,
        onboarding_request: null,
        message: 'Plan not found.'
      };
    }

    const onboardingRequests = this._getFromStorage('plan_onboarding_requests');

    const onboarding_request = {
      id: this._generateId('onboard'),
      plan_id,
      full_name,
      business_email,
      company_size_range,
      business_name: business_name || null,
      notes: notes || null,
      created_at: this._createTimestamp()
    };

    onboardingRequests.push(onboarding_request);
    this._saveToStorage('plan_onboarding_requests', onboardingRequests);

    return {
      success: true,
      onboarding_request,
      message: 'Onboarding request submitted.'
    };
  }

  // ---------------------- 11. addPlanToShortlist ----------------------

  addPlanToShortlist(plan_id) {
    const savedPlans = this._getOrCreateSavedPlans();
    const existing = savedPlans.find(sp => sp.plan_id === plan_id);
    if (existing) {
      return {
        success: true,
        saved_plan: existing,
        message: 'Plan already in shortlist.'
      };
    }

    const saved_plan = {
      id: this._generateId('savedplan'),
      plan_id,
      saved_at: this._createTimestamp()
    };

    savedPlans.push(saved_plan);
    this._saveToStorage('saved_plans_items', savedPlans);

    return {
      success: true,
      saved_plan,
      message: 'Plan added to shortlist.'
    };
  }

  // ---------------------- 12. getSavedPlans ----------------------

  getSavedPlans() {
    const savedPlans = this._getOrCreateSavedPlans();
    const plans = this._getFromStorage('plans');

    return savedPlans.map(saved_plan => {
      const plan = plans.find(p => p.id === saved_plan.plan_id) || null;
      return {
        saved_plan,
        plan,
        company_size_range_label: plan ? this._companySizeLabel(plan.company_size_range) : '',
        plan_category_label: plan ? this._planCategoryLabel(plan.plan_category) : ''
      };
    });
  }

  // ---------------------- 13. removePlanFromShortlist ----------------------

  removePlanFromShortlist(saved_plan_id) {
    const savedPlans = this._getOrCreateSavedPlans();
    const index = savedPlans.findIndex(sp => sp.id === saved_plan_id);
    if (index === -1) {
      return { success: false, message: 'Saved plan not found.' };
    }
    savedPlans.splice(index, 1);
    this._saveToStorage('saved_plans_items', savedPlans);
    return { success: true, message: 'Saved plan removed.' };
  }

  // ---------------------- 14. getBlogFilterOptions ----------------------

  getBlogFilterOptions() {
    const category_filters = [
      { value: 'cybersecurity', label: 'Cybersecurity' },
      { value: 'cloud', label: 'Cloud' },
      { value: 'data_analytics', label: 'Data Analytics' },
      { value: 'managed_it', label: 'Managed IT' },
      { value: 'remote_work', label: 'Remote Work' },
      { value: 'compliance', label: 'Compliance' },
      { value: 'general_it', label: 'General IT' },
      { value: 'other', label: 'Other' }
    ];

    const date_range_presets = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    return { category_filters, date_range_presets };
  }

  // ---------------------- 15. listBlogPosts ----------------------

  listBlogPosts(category, published_from, published_to, search_text) {
    const posts = this._getFromStorage('blog_posts');
    const readingList = this._getOrCreateReadingList();

    let filtered = posts;

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }

    if (published_from) {
      const fromDate = new Date(published_from).getTime();
      if (!isNaN(fromDate)) {
        filtered = filtered.filter(p => {
          const d = new Date(p.publish_date).getTime();
          return !isNaN(d) && d >= fromDate;
        });
      }
    }

    if (published_to) {
      const toDate = new Date(published_to).getTime();
      if (!isNaN(toDate)) {
        filtered = filtered.filter(p => {
          const d = new Date(p.publish_date).getTime();
          return !isNaN(d) && d <= toDate;
        });
      }
    }

    if (search_text && search_text.trim()) {
      const q = search_text.toLowerCase();
      filtered = filtered.filter(p => {
        const title = (p.title || '').toLowerCase();
        const summary = (p.summary || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        return title.includes(q) || summary.includes(q) || tags.includes(q);
      });
    }

    const resultPosts = filtered.map(post => {
      const is_saved = readingList.some(
        item => item.item_type === 'blog_post' && item.blog_post_id === post.id
      );
      return {
        post,
        category_label: this._blogCategoryLabel(post.category),
        is_saved
      };
    });

    return {
      posts: resultPosts,
      total_count: resultPosts.length
    };
  }

  // ---------------------- 16. getBlogPostDetail ----------------------

  getBlogPostDetail(post_slug) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find(p => p.slug === post_slug) || null;
    const readingList = this._getOrCreateReadingList();

    if (!post) {
      return {
        post: null,
        category_label: '',
        tag_labels: [],
        is_saved: false
      };
    }

    const is_saved = readingList.some(
      item => item.item_type === 'blog_post' && item.blog_post_id === post.id
    );

    return {
      post,
      category_label: this._blogCategoryLabel(post.category),
      tag_labels: Array.isArray(post.tags) ? post.tags : [],
      is_saved
    };
  }

  // ---------------------- 17. saveBlogPostToReadingList ----------------------

  saveBlogPostToReadingList(blog_post_id) {
    const readingList = this._getOrCreateReadingList();
    const existing = readingList.find(
      item => item.item_type === 'blog_post' && item.blog_post_id === blog_post_id
    );

    if (existing) {
      return {
        success: true,
        reading_list_item: existing,
        message: 'Blog post already in reading list.'
      };
    }

    const reading_list_item = {
      id: this._generateId('rli'),
      item_type: 'blog_post',
      blog_post_id,
      resource_id: null,
      saved_at: this._createTimestamp()
    };

    readingList.push(reading_list_item);
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: true,
      reading_list_item,
      message: 'Blog post saved to reading list.'
    };
  }

  // ---------------------- 18. getReadingList ----------------------

  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const blogPosts = this._getFromStorage('blog_posts');
    const resources = this._getFromStorage('resources');

    const blog_posts = readingList
      .filter(item => item.item_type === 'blog_post')
      .map(reading_list_item => {
        const post = blogPosts.find(p => p.id === reading_list_item.blog_post_id) || null;
        return {
          reading_list_item,
          post,
          category_label: post ? this._blogCategoryLabel(post.category) : ''
        };
      });

    const resourcesList = readingList
      .filter(item => item.item_type === 'resource')
      .map(reading_list_item => {
        const resource = resources.find(r => r.id === reading_list_item.resource_id) || null;
        return {
          reading_list_item,
          resource,
          primary_topic_label: resource ? this._primaryTopicLabel(resource.primary_topic) : ''
        };
      });

    return {
      blog_posts,
      resources: resourcesList
    };
  }

  // ---------------------- 19. removeReadingListItem ----------------------

  removeReadingListItem(reading_list_item_id) {
    const readingList = this._getOrCreateReadingList();
    const index = readingList.findIndex(item => item.id === reading_list_item_id);
    if (index === -1) {
      return { success: false, message: 'Reading list item not found.' };
    }
    readingList.splice(index, 1);
    this._saveToStorage('reading_list_items', readingList);
    return { success: true, message: 'Reading list item removed.' };
  }

  // ---------------------- 20. getExpertFilterOptions ----------------------

  getExpertFilterOptions() {
    const expertise_filters = [
      { value: 'data_analytics', label: 'Data Analytics' },
      { value: 'business_intelligence', label: 'Business Intelligence' },
      { value: 'cloud', label: 'Cloud' },
      { value: 'cybersecurity', label: 'Cybersecurity' },
      { value: 'managed_it', label: 'Managed IT' },
      { value: 'infrastructure', label: 'Infrastructure' },
      { value: 'other', label: 'Other' }
    ];

    const experience_presets = [
      { min_years: 5, label: '5+ years' },
      { min_years: 10, label: '10+ years' },
      { min_years: 15, label: '15+ years' }
    ];

    return { expertise_filters, experience_presets };
  }

  // ---------------------- 21. listExperts ----------------------

  listExperts(primary_expertise_area, min_years_of_experience) {
    const experts = this._getFromStorage('experts').filter(e => e.is_active !== false);

    let filtered = experts;
    if (primary_expertise_area) {
      filtered = filtered.filter(e => e.primary_expertise_area === primary_expertise_area);
    }
    if (typeof min_years_of_experience === 'number') {
      filtered = filtered.filter(e => typeof e.years_of_experience === 'number' && e.years_of_experience >= min_years_of_experience);
    }

    return filtered.map(expert => ({
      expert,
      primary_expertise_label: this._expertiseLabel(expert.primary_expertise_area)
    }));
  }

  // ---------------------- 22. getExpertDetail ----------------------

  getExpertDetail(expert_slug) {
    const experts = this._getFromStorage('experts');
    const expert = experts.find(e => e.slug === expert_slug) || null;

    if (!expert) {
      return {
        expert: null,
        primary_expertise_label: '',
        experience_label: '',
        bio_sections: []
      };
    }

    const years = typeof expert.years_of_experience === 'number' ? expert.years_of_experience : null;
    const experience_label = years != null ? `${years}+ years of experience` : '';
    const bio = expert.bio || '';
    const bio_sections = bio ? bio.split(/\n\n+/).map(s => s.trim()).filter(Boolean) : [];

    return {
      expert,
      primary_expertise_label: this._expertiseLabel(expert.primary_expertise_area),
      experience_label,
      bio_sections
    };
  }

  // ---------------------- 23. submitConsultationBooking ----------------------

  submitConsultationBooking(expert_id, topic, duration_minutes, start_datetime, client_name, client_email, notes) {
    const experts = this._getFromStorage('experts');
    const expert = experts.find(e => e.id === expert_id && e.is_active !== false);
    if (!expert) {
      return {
        success: false,
        booking: null,
        message: 'Expert not found.'
      };
    }

    const bookings = this._getFromStorage('consultation_bookings');
    const startIso = new Date(start_datetime).toISOString();

    const booking = {
      id: this._generateId('booking'),
      expert_id,
      topic: topic || null,
      duration_minutes,
      start_datetime: startIso,
      client_name,
      client_email,
      notes: notes || null,
      status: 'pending',
      created_at: this._createTimestamp()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      booking,
      message: 'Consultation booking submitted.'
    };
  }

  // ---------------------- 24. getCalculatorServices ----------------------

  getCalculatorServices() {
    const services = this._getFromStorage('services').filter(s => s.is_available_in_calculator === true);

    return services.map(service => ({
      service,
      pricing_unit_label: this._pricingUnitLabel(service.pricing_unit)
    }));
  }

  // ---------------------- 25. getBundleEstimate ----------------------

  getBundleEstimate(items) {
    const { lineItems, totalMonthlyCost } = this._calculateBundleTotals(items);

    const resultLineItems = lineItems.map(li => ({
      service: li.service,
      quantity: li.quantity,
      unit_price: li.unit_price,
      monthly_subtotal: li.monthly_subtotal
    }));

    return {
      line_items: resultLineItems,
      total_monthly_cost: totalMonthlyCost
    };
  }

  // ---------------------- 26. submitBundleConfiguration ----------------------

  submitBundleConfiguration(items, requester_name, requester_email, additional_details) {
    const { lineItems, totalMonthlyCost } = this._calculateBundleTotals(items);

    const bundleConfigurations = this._getFromStorage('bundle_configurations');
    const bundleItems = this._getFromStorage('bundle_configuration_items');

    const bundle_configuration = {
      id: this._generateId('bundle'),
      created_at: this._createTimestamp(),
      total_monthly_cost: totalMonthlyCost,
      requester_name,
      requester_email,
      additional_details: additional_details || null
    };

    bundleConfigurations.push(bundle_configuration);

    const createdItems = [];
    for (const li of lineItems) {
      const item = {
        id: this._generateId('bundleitem'),
        bundle_configuration_id: bundle_configuration.id,
        service_id: li.service.id,
        quantity: li.quantity,
        unit_price: li.unit_price,
        monthly_subtotal: li.monthly_subtotal
      };
      bundleItems.push(item);
      createdItems.push(item);
    }

    this._saveToStorage('bundle_configurations', bundleConfigurations);
    this._saveToStorage('bundle_configuration_items', bundleItems);

    return {
      success: true,
      bundle_configuration,
      bundle_items: createdItems,
      message: 'Bundle configuration submitted.'
    };
  }

  // ---------------------- 27. getCaseStudyFilterOptions ----------------------

  getCaseStudyFilterOptions() {
    const industry_filters = [
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'medical', label: 'Medical' },
      { value: 'finance', label: 'Finance' },
      { value: 'retail', label: 'Retail' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'technology', label: 'Technology' },
      { value: 'education', label: 'Education' },
      { value: 'government', label: 'Government' },
      { value: 'non_profit', label: 'Non-profit' },
      { value: 'other', label: 'Other' }
    ];

    const company_size_filters = [
      { value: 'size_1_50', label: '1–50 employees' },
      { value: 'size_51_200', label: '51–200 employees' },
      { value: 'size_201_500', label: '201–500 employees' },
      { value: 'size_501_1000', label: '501–1000 employees' },
      { value: 'size_1000_plus', label: '1000+ employees' }
    ];

    return { industry_filters, company_size_filters };
  }

  // ---------------------- 28. listCaseStudies ----------------------

  listCaseStudies(industry, company_size_range, min_downtime_reduction_percent) {
    const caseStudies = this._getFromStorage('case_studies');

    let filtered = caseStudies;

    if (industry) {
      // Consider healthcare/medical as related
      if (industry === 'healthcare') {
        filtered = filtered.filter(cs => cs.industry === 'healthcare' || cs.industry === 'medical');
      } else {
        filtered = filtered.filter(cs => cs.industry === industry);
      }
    }

    if (company_size_range) {
      filtered = filtered.filter(cs => cs.company_size_range === company_size_range);
    }

    if (typeof min_downtime_reduction_percent === 'number') {
      filtered = filtered.filter(cs => {
        const val = typeof cs.downtime_reduction_percent === 'number' ? cs.downtime_reduction_percent : 0;
        return val >= min_downtime_reduction_percent;
      });
    }

    return filtered.map(case_study => ({
      case_study,
      industry_label: this._industryLabel(case_study.industry),
      company_size_range_label: this._companySizeLabel(case_study.company_size_range)
    }));
  }

  // ---------------------- 29. getCaseStudyDetail ----------------------

  getCaseStudyDetail(case_study_slug) {
    const caseStudies = this._getFromStorage('case_studies');
    const case_study = caseStudies.find(cs => cs.slug === case_study_slug) || null;

    if (!case_study) {
      return {
        case_study: null,
        industry_label: '',
        company_size_range_label: ''
      };
    }

    return {
      case_study,
      industry_label: this._industryLabel(case_study.industry),
      company_size_range_label: this._companySizeLabel(case_study.company_size_range)
    };
  }

  // ---------------------- 30. submitCaseStudyInquiry ----------------------

  submitCaseStudyInquiry(case_study_id, name, email, company_name, industry, message) {
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find(c => c.id === case_study_id);
    if (!cs) {
      return {
        success: false,
        inquiry: null,
        message: 'Case study not found.'
      };
    }

    const inquiries = this._getFromStorage('case_study_inquiries');

    const inquiry = {
      id: this._generateId('csinq'),
      case_study_id,
      name,
      email,
      company_name,
      industry,
      message,
      created_at: this._createTimestamp()
    };

    inquiries.push(inquiry);
    this._saveToStorage('case_study_inquiries', inquiries);

    return {
      success: true,
      inquiry,
      message: 'Inquiry submitted.'
    };
  }

  // ---------------------- 31. searchResources ----------------------

  searchResources(query, primary_topic, content_type) {
    const resources = this._getFromStorage('resources');

    let filtered = resources;

    if (primary_topic) {
      filtered = filtered.filter(r => r.primary_topic === primary_topic);
    }

    if (content_type) {
      filtered = filtered.filter(r => r.content_type === content_type);
    }

    if (query && query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(r => {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const tags = Array.isArray(r.tags) ? r.tags.join(' ').toLowerCase() : '';
        return title.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    const results = filtered.map(resource => ({
      resource,
      primary_topic_label: this._primaryTopicLabel(resource.primary_topic),
      content_type_label: this._contentTypeLabel(resource.content_type)
    }));

    // Instrumentation for task completion tracking
    try {
      if (query && query.trim()) {
        localStorage.setItem(
          'task9_searchParams',
          JSON.stringify({ query, primary_topic, content_type })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // ---------------------- 32. getResourceDetail ----------------------

  getResourceDetail(resource_slug) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(r => r.slug === resource_slug) || null;

    if (!resource) {
      return {
        resource: null,
        primary_topic_label: '',
        audience_label: '',
        content_type_label: '',
        online_content_available: false,
        online_content: ''
      };
    }

    const online_content_available = !!resource.is_viewable_online;
    const online_content = online_content_available ? (resource.online_content || '') : '';

    // Instrumentation for task completion tracking
    try {
      if (resource && resource.is_viewable_online === true) {
        localStorage.setItem('task9_openedResourceId', String(resource.id));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      resource,
      primary_topic_label: this._primaryTopicLabel(resource.primary_topic),
      audience_label: resource.audience ? this._audienceLabel(resource.audience) : '',
      content_type_label: this._contentTypeLabel(resource.content_type),
      online_content_available,
      online_content
    };
  }

  // ---------------------- 33. saveResourceToReadingList ----------------------

  saveResourceToReadingList(resource_id) {
    const readingList = this._getOrCreateReadingList();
    const existing = readingList.find(
      item => item.item_type === 'resource' && item.resource_id === resource_id
    );

    if (existing) {
      return {
        success: true,
        reading_list_item: existing,
        message: 'Resource already in reading list.'
      };
    }

    const reading_list_item = {
      id: this._generateId('rli'),
      item_type: 'resource',
      blog_post_id: null,
      resource_id,
      saved_at: this._createTimestamp()
    };

    readingList.push(reading_list_item);
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: true,
      reading_list_item,
      message: 'Resource saved to reading list.'
    };
  }

  // ---------------------- 34. getAboutPageContent ----------------------

  getAboutPageContent() {
    return {
      history: 'Founded by senior consultants with backgrounds in cloud, security, and analytics, our firm focuses on helping growing businesses modernize their IT.',
      mission: 'To make enterprise-grade cloud, security, and data capabilities accessible and practical for small and mid-sized organizations.',
      values: [
        'Security-first mindset',
        'Pragmatic, outcome-driven consulting',
        'Knowledge sharing with client teams',
        'Long-term partnerships over one-off projects'
      ],
      specializations: [
        'Cloud migrations and management',
        'Managed IT for distributed teams',
        'Cybersecurity hardening and monitoring',
        'Data analytics and self-service reporting'
      ],
      certifications_and_partnerships: [
        'Cloud provider partnerships (e.g., AWS, Azure, Google Cloud)',
        'Security certifications held by team members (e.g., CISSP, CISM)',
        'Analytics platform expertise (e.g., Power BI, Tableau, Looker)'
      ]
    };
  }

  // ---------------------- 35. submitGeneralContactInquiry ----------------------

  submitGeneralContactInquiry(name, email, company, topic, message) {
    const inquiries = this._getFromStorage('general_contact_inquiries');

    const inquiry = {
      id: this._generateId('contact'),
      name,
      email,
      company: company || null,
      topic: topic || null,
      message,
      created_at: this._createTimestamp()
    };

    inquiries.push(inquiry);
    this._saveToStorage('general_contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Contact inquiry submitted.'
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