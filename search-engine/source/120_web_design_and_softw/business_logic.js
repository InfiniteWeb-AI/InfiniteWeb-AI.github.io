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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'pages',
      'navigation_links',
      'web_project_quote_requests',
      'maintenance_plans',
      'maintenance_plan_signups',
      'case_studies',
      'shortlists',
      'shortlist_items',
      'articles',
      'reading_lists',
      'reading_list_items',
      'project_estimates',
      'discovery_call_slots',
      'discovery_call_bookings',
      'ux_hourly_pricing_tiers',
      'ux_hourly_inquiries',
      'branding_packages',
      'branding_add_ons',
      'branding_onboarding_records',
      'general_contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('project_estimator_options')) {
      // will lazily initialize in getProjectEstimatorOptions
    }

    if (!localStorage.getItem('estimator_draft')) {
      localStorage.setItem('estimator_draft', JSON.stringify(null));
    }

    if (!localStorage.getItem('discovery_scheduler_context')) {
      localStorage.setItem('discovery_scheduler_context', JSON.stringify(null));
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

  _parseISODate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateToISO(dateString) {
    const d = this._parseISODate(dateString);
    return d ? d.toISOString() : null;
  }

  // -------------------- Private domain helpers --------------------

  _getOrCreateShortlist() {
    const shortlists = this._getFromStorage('shortlists', []);
    if (shortlists.length > 0) {
      return shortlists[0];
    }
    const shortlist = {
      id: this._generateId('shortlist'),
      created_at: new Date().toISOString()
    };
    shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);
    return shortlist;
  }

  _getOrCreateReadingList() {
    const readingLists = this._getFromStorage('reading_lists', []);
    if (readingLists.length > 0) {
      return readingLists[0];
    }
    const readingList = {
      id: this._generateId('reading_list'),
      created_at: new Date().toISOString()
    };
    readingLists.push(readingList);
    this._saveToStorage('reading_lists', readingLists);
    return readingList;
  }

  _getOrCreateEstimatorDraft() {
    const draft = this._getFromStorage('estimator_draft', null);
    if (draft) return draft;
    const newDraft = {
      includes_mobile_app: false,
      includes_marketing_website: false,
      includes_other_project_types: false,
      design_complexity: 'basic',
      integrations_option: 'none',
      analytics_option: 'none',
      content_creation_option: 'none',
      target_budget: null
    };
    this._saveToStorage('estimator_draft', newDraft);
    return newDraft;
  }

  _saveEstimatorDraft(draft) {
    this._saveToStorage('estimator_draft', draft);
  }

  _getOrCreateDiscoverySchedulerContext() {
    const ctx = this._getFromStorage('discovery_scheduler_context', null);
    if (ctx) return ctx;
    const now = new Date();
    const newCtx = {
      time_zone: 'local',
      month: now.getMonth() + 1,
      year: now.getFullYear()
    };
    this._saveToStorage('discovery_scheduler_context', newCtx);
    return newCtx;
  }

  _saveDiscoverySchedulerContext(ctx) {
    this._saveToStorage('discovery_scheduler_context', ctx);
  }

  _getProjectEstimatorBaseConfig() {
    // lazily seed project estimator options if not present
    let config = this._getFromStorage('project_estimator_options', null);
    if (config) return config;

    config = {
      project_types: [
        {
          key: 'mobile_app',
          label: 'Mobile app',
          description: 'Native or cross-platform mobile application.',
          base_cost: 15000
        },
        {
          key: 'marketing_website',
          label: 'Marketing website',
          description: 'Marketing site or company website.',
          base_cost: 6000
        },
        {
          key: 'web_app',
          label: 'Web application',
          description: 'Custom web application or portal.',
          base_cost: 12000
        },
        {
          key: 'branding',
          label: 'Branding & identity',
          description: 'Branding and visual identity deliverables.',
          base_cost: 5000
        }
      ],
      design_complexity_options: [
        { value: 'basic', label: 'Basic', incremental_cost: 0 },
        { value: 'standard', label: 'Standard', incremental_cost: 4000 },
        { value: 'premium', label: 'Premium', incremental_cost: 9000 }
      ],
      integration_options: [
        { value: 'none', label: 'No integrations', incremental_cost: 0 },
        { value: 'up_to_3_integrations', label: 'Up to 3 integrations', incremental_cost: 4000 },
        { value: 'up_to_5_integrations', label: 'Up to 5 integrations', incremental_cost: 7000 },
        { value: 'custom_integrations', label: 'Custom integrations', incremental_cost: 12000 }
      ],
      analytics_options: [
        { value: 'none', label: 'No analytics setup', incremental_cost: 0 },
        { value: 'basic_analytics', label: 'Basic analytics', incremental_cost: 1500 },
        { value: 'advanced_analytics', label: 'Advanced analytics & dashboards', incremental_cost: 4000 }
      ],
      content_creation_options: [
        { value: 'none', label: 'No content creation', incremental_cost: 0 },
        { value: 'copywriting_min_5_pages', label: 'Copywriting for at least 5 pages', incremental_cost: 2500 },
        { value: 'copywriting_min_10_pages', label: 'Copywriting for at least 10 pages', incremental_cost: 4500 },
        { value: 'full_content_and_media', label: 'Full content, media, and assets', incremental_cost: 8000 }
      ],
      base_pricing_notes: 'Estimates are ballpark ranges and may be refined after discovery.'
    };

    this._saveToStorage('project_estimator_options', config);
    return config;
  }

  _findEstimatorOption(options, value, fallbackValue) {
    const found = options.find((opt) => opt.value === value);
    if (found) return found;
    if (fallbackValue) {
      const fb = options.find((opt) => opt.value === fallbackValue);
      if (fb) return fb;
    }
    return options[0];
  }

  // -------------------- Interfaces --------------------

  // getHomeHeroAndServiceLinks
  getHomeHeroAndServiceLinks() {
    return {
      hero_heading: 'Product-minded design and development for ambitious teams',
      hero_subheading: 'We design, build, and grow web platforms, SaaS products, and brand experiences that convert.',
      primary_cta_label: 'Book a discovery call',
      secondary_cta_label: 'View our work',
      core_services: [
        {
          key: 'web_design_and_development',
          name: 'Web Design & Development',
          short_description: 'Marketing sites, marketing funnels, and product-driven web experiences.',
          target_page_key: 'web_design_and_development',
          primary_cta_label: 'Explore web design'
        },
        {
          key: 'care_and_maintenance',
          name: 'Care & Maintenance',
          short_description: 'Proactive monitoring, updates, and support retainers.',
          target_page_key: 'care_and_maintenance',
          primary_cta_label: 'View care plans'
        },
        {
          key: 'ux_research_and_testing',
          name: 'UX Research & Testing',
          short_description: 'Evidence-based UX research, usability testing, and insight sprints.',
          target_page_key: 'ux_research_and_testing',
          primary_cta_label: 'Explore UX research'
        },
        {
          key: 'branding_and_visual_identity',
          name: 'Branding & Visual Identity',
          short_description: 'Logo suites, visual systems, and launch-ready brand guidelines.',
          target_page_key: 'branding_and_visual_identity',
          primary_cta_label: 'Compare branding packages'
        },
        {
          key: 'case_studies',
          name: 'Case Studies',
          short_description: 'Selected client work with measurable results.',
          target_page_key: 'case_studies',
          primary_cta_label: 'Browse case studies'
        },
        {
          key: 'blog',
          name: 'Insights',
          short_description: 'Practical articles on UX, product strategy, and growth.',
          target_page_key: 'blog',
          primary_cta_label: 'Read the blog'
        }
      ],
      primary_nav_ctas: [
        {
          label: 'Project Estimator',
          target_page_key: 'project_estimator'
        },
        {
          label: 'Contact',
          target_page_key: 'contact'
        }
      ]
    };
  }

  // getHomeFeaturedCaseStudies(limit)
  getHomeFeaturedCaseStudies(limit = 3) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const featured = caseStudies.filter((cs) => cs.is_featured === true);

    featured.sort((a, b) => {
      const aConv = typeof a.conversion_rate_increase_percent === 'number' ? a.conversion_rate_increase_percent : -Infinity;
      const bConv = typeof b.conversion_rate_increase_percent === 'number' ? b.conversion_rate_increase_percent : -Infinity;
      if (bConv !== aConv) return bConv - aConv;
      const aDate = this._parseISODate(a.published_at) || new Date(0);
      const bDate = this._parseISODate(b.published_at) || new Date(0);
      return bDate - aDate;
    });

    return featured.slice(0, limit);
  }

  // getHomeFeaturedArticles(limit)
  getHomeFeaturedArticles(limit = 3) {
    const articles = this._getFromStorage('articles', []);
    const published = articles.filter((a) => a.status === 'published');

    published.sort((a, b) => {
      const aDate = this._parseISODate(a.published_at) || new Date(0);
      const bDate = this._parseISODate(b.published_at) || new Date(0);
      return bDate - aDate;
    });

    return published.slice(0, limit);
  }

  // getUserSavedContentSummary
  getUserSavedContentSummary() {
    const shortlist = this._getOrCreateShortlist();
    const readingList = this._getOrCreateReadingList();

    const shortlistItemsAll = this._getFromStorage('shortlist_items', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const shortlistItems = shortlistItemsAll
      .filter((item) => item.shortlist_id === shortlist.id)
      .sort((a, b) => {
        const aDate = this._parseISODate(a.added_at) || new Date(0);
        const bDate = this._parseISODate(b.added_at) || new Date(0);
        return bDate - aDate;
      });

    const shortlistLatest = shortlistItems.slice(0, 3).map((item) => {
      const cs = caseStudies.find((c) => c.id === item.case_study_id) || null;
      return {
        case_study_id: item.case_study_id,
        title: cs ? cs.title : '',
        added_at: item.added_at
      };
    });

    const readingListItemsAll = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const readingItems = readingListItemsAll
      .filter((item) => item.reading_list_id === readingList.id)
      .sort((a, b) => {
        const aDate = this._parseISODate(a.added_at) || new Date(0);
        const bDate = this._parseISODate(b.added_at) || new Date(0);
        return bDate - aDate;
      });

    const readingLatest = readingItems.slice(0, 3).map((item) => {
      const article = articles.find((a) => a.id === item.article_id) || null;
      return {
        article_id: item.article_id,
        title: article ? article.title : '',
        added_at: item.added_at
      };
    });

    return {
      shortlist: {
        count: shortlistItems.length,
        latest_items: shortlistLatest
      },
      reading_list: {
        count: readingItems.length,
        latest_items: readingLatest
      }
    };
  }

  // getServicesOverviewContent
  getServicesOverviewContent() {
    return {
      intro_heading: 'Services built around outcomes, not deliverables',
      intro_copy: 'Whether you are launching something new or improving what is already working, our services are designed to meet you where you are and ship measurable results.',
      service_categories: [
        {
          key: 'web_design_and_development',
          name: 'Web Design & Development',
          short_description: 'High-converting marketing sites and product-driven experiences.',
          when_to_choose: 'Choose this when you need a new marketing site, a website redesign, or a custom web experience that supports your product and sales motions.',
          primary_cta_label: 'Explore web design services',
          target_page_key: 'web_design_and_development'
        },
        {
          key: 'care_and_maintenance',
          name: 'Care & Maintenance',
          short_description: 'Ongoing support, updates, and optimizations for your live sites.',
          when_to_choose: 'Choose this when you already have a site in production and want proactive support, security, and improvements.',
          primary_cta_label: 'View care plans',
          target_page_key: 'care_and_maintenance'
        },
        {
          key: 'ux_research_and_testing',
          name: 'UX Research & Testing',
          short_description: 'Research sprints and ongoing UX engagements aligned to product goals.',
          when_to_choose: 'Choose this when you need to de-risk product decisions, improve conversion, or understand user behavior with evidence.',
          primary_cta_label: 'Learn about UX research',
          target_page_key: 'ux_research_and_testing'
        },
        {
          key: 'branding_and_visual_identity',
          name: 'Branding & Visual Identity',
          short_description: 'Brand systems that scale from pitch decks to product UI.',
          when_to_choose: 'Choose this when you are launching or refreshing your brand and need a cohesive identity and guidelines.',
          primary_cta_label: 'Compare branding packages',
          target_page_key: 'branding_and_visual_identity'
        }
      ]
    };
  }

  // getWebDesignServiceContent
  getWebDesignServiceContent() {
    return {
      page_title: 'Web Design & Development',
      intro_copy: 'From marketing sites to complex product experiences, we design and build websites that move key business metrics.',
      offerings_overview: 'Our team blends product strategy, UX, and engineering to design and ship websites that are fast, accessible, and easy to maintain.',
      redesign_section: {
        heading: 'Website redesigns that respect what is working and fix what is not',
        description: 'We start with your analytics, user feedback, and business goals to define a redesign that is more than a fresh coat of paint.',
        bullet_points: [
          'Discovery and alignment around business goals and constraints',
          'UX, IA, and content strategy informed by your data',
          'Modern, accessible UI design and front-end implementation'
        ]
      },
      project_type_options: [
        { value: 'website_redesign', label: 'Website redesign' },
        { value: 'new_website', label: 'New website' },
        { value: 'web_app', label: 'Web app or portal' },
        { value: 'landing_page', label: 'Landing page or funnel' },
        { value: 'other', label: 'Other web project' }
      ],
      timeline_options: [
        { value: 'asap', label: 'ASAP' },
        { value: 'within_1_month', label: 'Within 1 month' },
        { value: 'within_3_months', label: 'Within 3 months' },
        { value: 'three_to_six_months', label: '3–6 months' },
        { value: 'flexible', label: 'Timeline is flexible' }
      ]
    };
  }

  // submitWebProjectQuoteRequest
  submitWebProjectQuoteRequest(
    project_type,
    approximate_number_of_pages,
    exact_budget,
    timeline,
    additional_details,
    contact_name,
    contact_email,
    contact_phone
  ) {
    if (!project_type || !exact_budget || !timeline || !contact_name || !contact_email) {
      return {
        success: false,
        quote_request: null,
        message: 'Missing required fields for quote request.'
      };
    }

    const requests = this._getFromStorage('web_project_quote_requests', []);

    const quote = {
      id: this._generateId('web_project_quote'),
      project_type: project_type,
      approximate_number_of_pages:
        typeof approximate_number_of_pages === 'number' ? approximate_number_of_pages : undefined,
      exact_budget: exact_budget,
      timeline: timeline,
      additional_details: additional_details || '',
      contact_name: contact_name,
      contact_email: contact_email,
      contact_phone: contact_phone || '',
      created_at: new Date().toISOString()
    };

    requests.push(quote);
    this._saveToStorage('web_project_quote_requests', requests);

    return {
      success: true,
      quote_request: quote,
      message: 'Quote request submitted successfully.'
    };
  }

  // getMaintenanceOverviewContent
  getMaintenanceOverviewContent() {
    const plans = this._getFromStorage('maintenance_plans', []);
    const activePlans = plans.filter((p) => p.is_active === true);
    activePlans.sort((a, b) => {
      const aPrice = typeof a.monthly_price === 'number' ? a.monthly_price : Infinity;
      const bPrice = typeof b.monthly_price === 'number' ? b.monthly_price : Infinity;
      return aPrice - bPrice;
    });

    return {
      intro_heading: 'Care & Maintenance for websites that cannot go down',
      intro_copy: 'Our care plans keep your websites secure, fast, and supported — so your team can focus on the roadmap instead of firefighting.',
      highlight_benefits: [
        'Uptime monitoring and proactive alerts',
        'Regular security, performance, and dependency updates',
        'A dedicated pool of support hours for small improvements'
      ],
      featured_plans: activePlans.slice(0, 3)
    };
  }

  // getMaintenancePlanFilterOptions
  getMaintenancePlanFilterOptions() {
    return {
      billing_frequencies: [
        { value: 'monthly', label: 'Monthly billing' },
        { value: 'yearly', label: 'Yearly billing' }
      ]
    };
  }

  // getMaintenancePlansForComparison(billing_frequency)
  getMaintenancePlansForComparison(billing_frequency) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const filtered = plans.filter(
      (p) => p.is_active === true && p.billing_frequency === billing_frequency
    );

    if (billing_frequency === 'monthly') {
      filtered.sort((a, b) => a.monthly_price - b.monthly_price);
    } else if (billing_frequency === 'yearly') {
      filtered.sort((a, b) => {
        const aPrice = typeof a.yearly_price === 'number' ? a.yearly_price : Infinity;
        const bPrice = typeof b.yearly_price === 'number' ? b.yearly_price : Infinity;
        return aPrice - bPrice;
      });
    }

    return filtered;
  }

  // getMaintenancePlanSignupContext(maintenance_plan_id)
  getMaintenancePlanSignupContext(maintenance_plan_id) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const plan = plans.find((p) => p.id === maintenance_plan_id) || null;

    return {
      plan: plan,
      signup_intro_copy: plan
        ? 'You are about to request onboarding for the ' + plan.name + ' plan.'
        : 'Selected maintenance plan not found.'
    };
  }

  // submitMaintenancePlanSignup
  submitMaintenancePlanSignup(
    maintenance_plan_id,
    company_name,
    primary_website_url,
    preferred_start_date
  ) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const plan = plans.find((p) => p.id === maintenance_plan_id) || null;

    if (!plan) {
      return {
        success: false,
        signup: null,
        message: 'Maintenance plan not found.'
      };
    }

    if (!company_name || !primary_website_url || !preferred_start_date) {
      return {
        success: false,
        signup: null,
        message: 'Missing required fields for maintenance plan signup.'
      };
    }

    const signups = this._getFromStorage('maintenance_plan_signups', []);

    const signup = {
      id: this._generateId('maintenance_signup'),
      maintenance_plan_id: maintenance_plan_id,
      plan_name_snapshot: plan.name,
      billing_frequency_snapshot: plan.billing_frequency,
      monthly_price_snapshot: plan.monthly_price,
      support_hours_per_month_snapshot: plan.support_hours_per_month,
      company_name: company_name,
      primary_website_url: primary_website_url,
      preferred_start_date: this._formatDateToISO(preferred_start_date) || preferred_start_date,
      created_at: new Date().toISOString()
    };

    signups.push(signup);
    this._saveToStorage('maintenance_plan_signups', signups);

    return {
      success: true,
      signup: signup,
      message: 'Maintenance plan onboarding request submitted.'
    };
  }

  // getCaseStudyFilterOptions
  getCaseStudyFilterOptions() {
    return {
      industries: [
        { value: 'ecommerce', label: 'Ecommerce' },
        { value: 'saas', label: 'SaaS' },
        { value: 'fintech', label: 'Fintech' },
        { value: 'b2b_services', label: 'B2B services' },
        { value: 'nonprofit', label: 'Nonprofit' },
        { value: 'other', label: 'Other' }
      ],
      sort_options: [
        {
          value: 'conversion_uplift_desc',
          label: 'Conversion uplift — high to low',
          description: 'Show projects with the largest conversion rate increase first.'
        },
        {
          value: 'conversion_uplift_asc',
          label: 'Conversion uplift — low to high',
          description: 'Show projects with smaller conversion lifts first.'
        },
        {
          value: 'newest_first',
          label: 'Newest first',
          description: 'Show the most recently published case studies first.'
        }
      ]
    };
  }

  // getCaseStudies(filters, sort_by, page, page_size)
  getCaseStudies(filters, sort_by = 'conversion_uplift_desc', page = 1, page_size = 12) {
    let items = this._getFromStorage('case_studies', []);

    if (filters && filters.industry) {
      items = items.filter((cs) => cs.industry === filters.industry);
    }

    if (
      filters &&
      typeof filters.min_conversion_rate_increase_percent === 'number'
    ) {
      const minConv = filters.min_conversion_rate_increase_percent;
      items = items.filter((cs) => {
        const val = cs.conversion_rate_increase_percent;
        return typeof val === 'number' && val >= minConv;
      });
    }

    if (sort_by === 'conversion_uplift_desc') {
      items.sort((a, b) => {
        const aConv = typeof a.conversion_rate_increase_percent === 'number' ? a.conversion_rate_increase_percent : -Infinity;
        const bConv = typeof b.conversion_rate_increase_percent === 'number' ? b.conversion_rate_increase_percent : -Infinity;
        if (bConv !== aConv) return bConv - aConv;
        const aDate = this._parseISODate(a.published_at) || new Date(0);
        const bDate = this._parseISODate(b.published_at) || new Date(0);
        return bDate - aDate;
      });
    } else if (sort_by === 'conversion_uplift_asc') {
      items.sort((a, b) => {
        const aConv = typeof a.conversion_rate_increase_percent === 'number' ? a.conversion_rate_increase_percent : Infinity;
        const bConv = typeof b.conversion_rate_increase_percent === 'number' ? b.conversion_rate_increase_percent : Infinity;
        if (aConv !== bConv) return aConv - bConv;
        const aDate = this._parseISODate(a.published_at) || new Date(0);
        const bDate = this._parseISODate(b.published_at) || new Date(0);
        return bDate - aDate;
      });
    } else if (sort_by === 'newest_first') {
      items.sort((a, b) => {
        const aDate = this._parseISODate(a.published_at) || new Date(0);
        const bDate = this._parseISODate(b.published_at) || new Date(0);
        return bDate - aDate;
      });
    }

    // Instrumentation for task completion tracking (task_3: case studies filters)
    try {
      if (
        filters &&
        filters.industry === 'ecommerce' &&
        sort_by === 'conversion_uplift_desc'
      ) {
        localStorage.setItem(
          'task3_caseStudiesFilterParams',
          JSON.stringify({ filters, sort_by, page, page_size })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total_count = items.length;
    const start = (page - 1) * page_size;
    const pagedItems = items.slice(start, start + page_size);

    return {
      items: pagedItems,
      total_count: total_count,
      page: page,
      page_size: page_size
    };
  }

  // getCaseStudyDetail(slug)
  getCaseStudyDetail(slug) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const case_study = caseStudies.find((cs) => cs.slug === slug) || null;

    if (!case_study) {
      return {
        case_study: null,
        is_in_shortlist: false,
        related_case_studies: []
      };
    }

    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items', []);
    const is_in_shortlist = shortlistItems.some(
      (item) =>
        item.shortlist_id === shortlist.id && item.case_study_id === case_study.id
    );

    // Instrumentation for task completion tracking (task_3: last viewed shortlisted case study)
    try {
      if (is_in_shortlist) {
        localStorage.setItem(
          'task3_lastViewedShortlistedCaseStudyId',
          String(case_study.id)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const related_case_studies = caseStudies
      .filter((cs) => cs.id !== case_study.id && cs.industry === case_study.industry)
      .sort((a, b) => {
        const aDate = this._parseISODate(a.published_at) || new Date(0);
        const bDate = this._parseISODate(b.published_at) || new Date(0);
        return bDate - aDate;
      })
      .slice(0, 3);

    return {
      case_study: case_study,
      is_in_shortlist: is_in_shortlist,
      related_case_studies: related_case_studies
    };
  }

  // addCaseStudyToShortlist
  addCaseStudyToShortlist(case_study_id) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const caseStudy = caseStudies.find((c) => c.id === case_study_id) || null;

    if (!caseStudy) {
      return {
        success: false,
        shortlist: null,
        shortlist_item: null,
        message: 'Case study not found.'
      };
    }

    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items', []);

    const existing = shortlistItems.find(
      (item) =>
        item.shortlist_id === shortlist.id && item.case_study_id === case_study_id
    );

    if (existing) {
      return {
        success: true,
        shortlist: shortlist,
        shortlist_item: existing,
        message: 'Case study is already in the shortlist.'
      };
    }

    const shortlist_item = {
      id: this._generateId('shortlist_item'),
      shortlist_id: shortlist.id,
      case_study_id: case_study_id,
      added_at: new Date().toISOString()
    };

    shortlistItems.push(shortlist_item);
    this._saveToStorage('shortlist_items', shortlistItems);

    return {
      success: true,
      shortlist: shortlist,
      shortlist_item: shortlist_item,
      message: 'Case study added to shortlist.'
    };
  }

  // removeCaseStudyFromShortlist
  removeCaseStudyFromShortlist(case_study_id) {
    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items', []);

    const beforeCount = shortlistItems.length;
    const filtered = shortlistItems.filter(
      (item) =>
        !(item.shortlist_id === shortlist.id && item.case_study_id === case_study_id)
    );
    this._saveToStorage('shortlist_items', filtered);

    const removedCount = beforeCount - filtered.length;

    return {
      success: true,
      message:
        removedCount > 0
          ? 'Case study removed from shortlist.'
          : 'Case study was not in the shortlist.'
    };
  }

  // getShortlistItems
  getShortlistItems() {
    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const itemsForShortlist = shortlistItems
      .filter((item) => item.shortlist_id === shortlist.id)
      .sort((a, b) => {
        const aDate = this._parseISODate(a.added_at) || new Date(0);
        const bDate = this._parseISODate(b.added_at) || new Date(0);
        return bDate - aDate;
      });

    const items = itemsForShortlist.map((item) => {
      const cs = caseStudies.find((c) => c.id === item.case_study_id) || null;
      return {
        shortlist_item: item,
        case_study: cs
      };
    });

    // Instrumentation for task completion tracking (task_3: shortlist viewed)
    try {
      localStorage.setItem('task3_shortlistViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      shortlist: shortlist,
      items: items
    };
  }

  // getArticleFilterOptions
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    const yearsSet = new Set();
    const tagsSet = new Set();
    const categoriesSet = new Set();

    articles.forEach((article) => {
      const date = this._parseISODate(article.published_at);
      if (date) {
        yearsSet.add(date.getFullYear());
      }
      if (Array.isArray(article.tags)) {
        article.tags.forEach((tag) => {
          if (tag) tagsSet.add(tag);
        });
      }
      if (article.category) {
        categoriesSet.add(article.category);
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);
    const tags = Array.from(tagsSet).sort();
    const categories = Array.from(categoriesSet).sort().map((cat) => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1)
    }));

    return {
      years: years,
      tags: tags,
      categories: categories,
      sort_options: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' },
        { value: 'read_time_desc', label: 'Longest read first' },
        { value: 'read_time_asc', label: 'Shortest read first' }
      ]
    };
  }

  // searchArticles(query, filters, sort_by, page, page_size)
  searchArticles(
    query,
    filters,
    sort_by = 'newest_first',
    page = 1,
    page_size = 10
  ) {
    const allArticles = this._getFromStorage('articles', []);
    let items = allArticles.filter((a) => a.status === 'published');

    if (query) {
      const q = String(query).toLowerCase();
      items = items.filter((article) => {
        const inTitle = article.title && article.title.toLowerCase().includes(q);
        const inSummary =
          article.summary && article.summary.toLowerCase().includes(q);
        const inContent =
          article.content && article.content.toLowerCase().includes(q);
        return inTitle || inSummary || inContent;
      });
    }

    if (filters) {
      if (filters.year) {
        items = items.filter((article) => {
          const date = this._parseISODate(article.published_at);
          return date && date.getFullYear() === filters.year;
        });
      }
      if (filters.tag) {
        const tagLower = String(filters.tag).toLowerCase();
        items = items.filter((article) => {
          if (!Array.isArray(article.tags)) return false;
          return article.tags.some(
            (t) => t && String(t).toLowerCase() === tagLower
          );
        });
      }
      if (filters.category) {
        items = items.filter(
          (article) => article.category === filters.category
        );
      }
    }

    if (sort_by === 'newest_first') {
      items.sort((a, b) => {
        const aDate = this._parseISODate(a.published_at) || new Date(0);
        const bDate = this._parseISODate(b.published_at) || new Date(0);
        return bDate - aDate;
      });
    } else if (sort_by === 'oldest_first') {
      items.sort((a, b) => {
        const aDate = this._parseISODate(a.published_at) || new Date(0);
        const bDate = this._parseISODate(b.published_at) || new Date(0);
        return aDate - bDate;
      });
    } else if (sort_by === 'read_time_desc') {
      items.sort(
        (a, b) =>
          (b.estimated_read_time_minutes || 0) -
          (a.estimated_read_time_minutes || 0)
      );
    } else if (sort_by === 'read_time_asc') {
      items.sort(
        (a, b) =>
          (a.estimated_read_time_minutes || 0) -
          (b.estimated_read_time_minutes || 0)
      );
    }

    // Instrumentation for task completion tracking (task_4: article search params)
    try {
      if (
        typeof query === 'string' &&
        query.toLowerCase() === 'saas onboarding' &&
        filters &&
        filters.year === 2023 &&
        sort_by === 'newest_first'
      ) {
        localStorage.setItem(
          'task4_articleSearchParams',
          JSON.stringify({ query, filters, sort_by, page, page_size })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total_count = items.length;
    const start = (page - 1) * page_size;
    const pagedItems = items.slice(start, start + page_size);

    return {
      items: pagedItems,
      total_count: total_count,
      page: page,
      page_size: page_size
    };
  }

  // getArticleDetail(slug)
  getArticleDetail(slug) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.slug === slug) || null;

    if (!article) {
      return {
        article: null,
        is_in_reading_list: false,
        related_articles: []
      };
    }

    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const is_in_reading_list = readingListItems.some(
      (item) =>
        item.reading_list_id === readingList.id && item.article_id === article.id
    );

    // Instrumentation for task completion tracking (task_4: last viewed reading list article)
    try {
      if (is_in_reading_list) {
        localStorage.setItem(
          'task4_lastViewedReadingListArticleId',
          String(article.id)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const related_articles = articles
      .filter((a) => a.id !== article.id)
      .filter((a) => {
        if (a.category && article.category && a.category === article.category) {
          return true;
        }
        if (Array.isArray(a.tags) && Array.isArray(article.tags)) {
          return a.tags.some((tag) => article.tags.includes(tag));
        }
        return false;
      })
      .sort((a, b) => {
        const aDate = this._parseISODate(a.published_at) || new Date(0);
        const bDate = this._parseISODate(b.published_at) || new Date(0);
        return bDate - aDate;
      })
      .slice(0, 3);

    return {
      article: article,
      is_in_reading_list: is_in_reading_list,
      related_articles: related_articles
    };
  }

  // addArticleToReadingList
  addArticleToReadingList(article_id) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === article_id) || null;

    if (!article) {
      return {
        success: false,
        reading_list: null,
        reading_list_item: null,
        message: 'Article not found.'
      };
    }

    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const existing = readingListItems.find(
      (item) =>
        item.reading_list_id === readingList.id && item.article_id === article_id
    );

    if (existing) {
      return {
        success: true,
        reading_list: readingList,
        reading_list_item: existing,
        message: 'Article is already in the reading list.'
      };
    }

    const reading_list_item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingList.id,
      article_id: article_id,
      added_at: new Date().toISOString()
    };

    readingListItems.push(reading_list_item);
    this._saveToStorage('reading_list_items', readingListItems);

    return {
      success: true,
      reading_list: readingList,
      reading_list_item: reading_list_item,
      message: 'Article added to reading list.'
    };
  }

  // removeArticleFromReadingList
  removeArticleFromReadingList(article_id) {
    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const beforeCount = readingListItems.length;
    const filtered = readingListItems.filter(
      (item) =>
        !(item.reading_list_id === readingList.id && item.article_id === article_id)
    );
    this._saveToStorage('reading_list_items', filtered);

    const removedCount = beforeCount - filtered.length;

    return {
      success: true,
      message:
        removedCount > 0
          ? 'Article removed from reading list.'
          : 'Article was not in the reading list.'
    };
  }

  // getReadingListItems
  getReadingListItems() {
    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const itemsForList = readingListItems
      .filter((item) => item.reading_list_id === readingList.id)
      .sort((a, b) => {
        const aDate = this._parseISODate(a.added_at) || new Date(0);
        const bDate = this._parseISODate(b.added_at) || new Date(0);
        return bDate - aDate;
      });

    const items = itemsForList.map((item) => {
      const article = articles.find((a) => a.id === item.article_id) || null;
      return {
        reading_list_item: item,
        article: article
      };
    });

    // Instrumentation for task completion tracking (task_4: reading list opened)
    try {
      localStorage.setItem('task4_readingListOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      reading_list: readingList,
      items: items
    };
  }

  // getProjectEstimatorOptions
  getProjectEstimatorOptions() {
    return this._getProjectEstimatorBaseConfig();
  }

  // calculateProjectEstimatePreview
  calculateProjectEstimatePreview(
    includes_mobile_app,
    includes_marketing_website,
    includes_other_project_types,
    design_complexity,
    integrations_option,
    analytics_option,
    content_creation_option,
    target_budget
  ) {
    const config = this._getProjectEstimatorBaseConfig();

    let total = 0;
    const line_items = [];

    const mobileConfig = config.project_types.find(
      (p) => p.key === 'mobile_app'
    );
    const marketingConfig = config.project_types.find(
      (p) => p.key === 'marketing_website'
    );
    const otherConfig = config.project_types.find(
      (p) => p.key === 'web_app'
    );

    if (includes_mobile_app && mobileConfig) {
      total += mobileConfig.base_cost;
      line_items.push({ label: 'Mobile app', cost: mobileConfig.base_cost });
    }

    if (includes_marketing_website && marketingConfig) {
      total += marketingConfig.base_cost;
      line_items.push({
        label: 'Marketing website',
        cost: marketingConfig.base_cost
      });
    }

    if (includes_other_project_types && otherConfig) {
      total += otherConfig.base_cost;
      line_items.push({ label: 'Additional web app or project', cost: otherConfig.base_cost });
    }

    const designOpt = this._findEstimatorOption(
      config.design_complexity_options,
      design_complexity,
      'basic'
    );
    total += designOpt.incremental_cost;
    line_items.push({ label: 'Design complexity: ' + designOpt.label, cost: designOpt.incremental_cost });

    const integrationOpt = this._findEstimatorOption(
      config.integration_options,
      integrations_option,
      'none'
    );
    total += integrationOpt.incremental_cost;
    line_items.push({ label: 'Integrations: ' + integrationOpt.label, cost: integrationOpt.incremental_cost });

    const analyticsOpt = this._findEstimatorOption(
      config.analytics_options,
      analytics_option,
      'none'
    );
    total += analyticsOpt.incremental_cost;
    line_items.push({ label: 'Analytics: ' + analyticsOpt.label, cost: analyticsOpt.incremental_cost });

    const contentOpt = this._findEstimatorOption(
      config.content_creation_options,
      content_creation_option,
      'none'
    );
    total += contentOpt.incremental_cost;
    line_items.push({ label: 'Content creation: ' + contentOpt.label, cost: contentOpt.incremental_cost });

    const exceeds = typeof target_budget === 'number' && total > target_budget;

    return {
      total_estimated_cost: total,
      line_items: line_items,
      target_budget: target_budget,
      exceeds_target_budget: exceeds
    };
  }

  // saveProjectEstimate
  saveProjectEstimate(
    includes_mobile_app,
    includes_marketing_website,
    includes_other_project_types,
    design_complexity,
    integrations_option,
    analytics_option,
    content_creation_option,
    target_budget,
    contact_name,
    contact_email
  ) {
    if (!contact_name || !contact_email || typeof target_budget !== 'number') {
      return {
        success: false,
        estimate: null,
        message: 'Missing required fields for saving estimate.'
      };
    }

    const preview = this.calculateProjectEstimatePreview(
      includes_mobile_app,
      includes_marketing_website,
      includes_other_project_types,
      design_complexity,
      integrations_option,
      analytics_option,
      content_creation_option,
      target_budget
    );

    const estimates = this._getFromStorage('project_estimates', []);

    const estimate = {
      id: this._generateId('project_estimate'),
      includes_mobile_app: !!includes_mobile_app,
      includes_marketing_website: !!includes_marketing_website,
      includes_other_project_types: !!includes_other_project_types,
      design_complexity: design_complexity,
      integrations_option: integrations_option,
      analytics_option: analytics_option,
      content_creation_option: content_creation_option,
      total_estimated_cost: preview.total_estimated_cost,
      target_budget: target_budget,
      contact_name: contact_name,
      contact_email: contact_email,
      created_at: new Date().toISOString()
    };

    estimates.push(estimate);
    this._saveToStorage('project_estimates', estimates);

    // Keep estimator draft in sync
    const draft = this._getOrCreateEstimatorDraft();
    draft.includes_mobile_app = !!includes_mobile_app;
    draft.includes_marketing_website = !!includes_marketing_website;
    draft.includes_other_project_types = !!includes_other_project_types;
    draft.design_complexity = design_complexity;
    draft.integrations_option = integrations_option;
    draft.analytics_option = analytics_option;
    draft.content_creation_option = content_creation_option;
    draft.target_budget = target_budget;
    this._saveEstimatorDraft(draft);

    return {
      success: true,
      estimate: estimate,
      message: 'Project estimate saved.'
    };
  }

  // getContactPageContent
  getContactPageContent() {
    return {
      intro_heading: 'Let us talk about your next launch',
      intro_copy: 'Share a bit about your product, timelines, and goals and we will follow up with next steps within one business day.',
      contact_email: 'hello@example-agency.com',
      contact_phone: '+1 (555) 123-4567',
      office_location: 'Remote-first team operating globally, headquartered in UTC.',
      general_inquiry_topics: [
        { value: 'general_question', label: 'General question' },
        { value: 'project_inquiry', label: 'New project or engagement' },
        { value: 'support', label: 'Support for an existing engagement' },
        { value: 'other', label: 'Something else' }
      ]
    };
  }

  // submitGeneralContactInquiry
  submitGeneralContactInquiry(name, email, company, topic, message) {
    if (!name || !email || !topic || !message) {
      return {
        success: false,
        ticket_id: null,
        message: 'Missing required fields for contact inquiry.'
      };
    }

    const inquiries = this._getFromStorage('general_contact_inquiries', []);

    const id = this._generateId('contact_inquiry');
    const record = {
      id: id,
      name: name,
      email: email,
      company: company || '',
      topic: topic,
      message: message,
      created_at: new Date().toISOString()
    };

    inquiries.push(record);
    this._saveToStorage('general_contact_inquiries', inquiries);

    return {
      success: true,
      ticket_id: id,
      message: 'Your inquiry has been received.'
    };
  }

  // getDiscoveryCallAvailabilityCalendar
  getDiscoveryCallAvailabilityCalendar(month, year, time_zone) {
    const slots = this._getFromStorage('discovery_call_slots', []);

    const grouped = {};

    slots.forEach((slot) => {
      if (slot.time_zone !== time_zone) return;
      if (slot.status !== 'available') return;
      const start = this._parseISODate(slot.start_time);
      if (!start) return;
      if (start.getUTCFullYear() !== year) return;
      // month is 1-12, Date#getUTCMonth is 0-11
      if (start.getUTCMonth() + 1 !== month) return;
      const dateStr = start.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!grouped[dateStr]) {
        grouped[dateStr] = {
          total: 0,
          morning: 0,
          afternoon: 0
        };
      }
      grouped[dateStr].total += 1;
      const isMorning = slot.is_morning_slot === true;
      if (isMorning) {
        grouped[dateStr].morning += 1;
      } else {
        grouped[dateStr].afternoon += 1;
      }
    });

    const days = Object.keys(grouped)
      .sort()
      .map((date) => {
        const info = grouped[date];
        return {
          date: date,
          is_available: info.total > 0,
          available_slots_count: info.total,
          available_morning_slots_count: info.morning,
          available_afternoon_slots_count: info.afternoon
        };
      });

    return {
      month: month,
      year: year,
      time_zone: time_zone,
      days: days
    };
  }

  // getDiscoveryCallSlotsForDate
  getDiscoveryCallSlotsForDate(date, time_zone) {
    const slots = this._getFromStorage('discovery_call_slots', []);
    const result = slots.filter((slot) => {
      if (slot.time_zone !== time_zone) return false;
      if (slot.status !== 'available') return false;
      const start = this._parseISODate(slot.start_time);
      if (!start) return false;
      const dateStr = start.toISOString().slice(0, 10);
      return dateStr === date;
    });
    return result;
  }

  // bookDiscoveryCall
  bookDiscoveryCall(
    slot_id,
    selected_time_zone,
    name,
    email,
    company,
    topic
  ) {
    if (!slot_id || !selected_time_zone || !name || !email || !topic) {
      return {
        success: false,
        booking: null,
        slot: null,
        message: 'Missing required fields for booking.'
      };
    }

    const slots = this._getFromStorage('discovery_call_slots', []);
    const slotIndex = slots.findIndex((s) => s.id === slot_id);
    if (slotIndex === -1) {
      return {
        success: false,
        booking: null,
        slot: null,
        message: 'Selected time slot not found.'
      };
    }

    const slot = slots[slotIndex];
    if (slot.status !== 'available') {
      return {
        success: false,
        booking: null,
        slot: slot,
        message: 'Selected time slot is no longer available.'
      };
    }

    const bookings = this._getFromStorage('discovery_call_bookings', []);

    const booking = {
      id: this._generateId('discovery_call_booking'),
      slot_id: slot_id,
      selected_time_zone: selected_time_zone,
      name: name,
      email: email,
      company: company || '',
      topic: topic,
      created_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('discovery_call_bookings', bookings);

    // mark slot as booked
    slots[slotIndex] = Object.assign({}, slot, { status: 'booked' });
    this._saveToStorage('discovery_call_slots', slots);

    return {
      success: true,
      booking: booking,
      slot: slots[slotIndex],
      message: 'Discovery call booked successfully.'
    };
  }

  // getUxResearchServiceContent
  getUxResearchServiceContent() {
    return {
      intro_heading: 'UX Research & Testing grounded in real user behavior',
      intro_copy: 'We help product teams make confident decisions with moderated studies, usability testing, and ongoing research partnerships.',
      typical_activities: [
        'User interviews and discovery research',
        'Moderated and unmoderated usability testing',
        'Prototype validation and concept testing',
        'Information architecture and navigation studies',
        'Surveys and quantitative UX research'
      ],
      outcomes: [
        'Clarity on user needs, jobs, and mental models',
        'Prioritized opportunity areas tied to business outcomes',
        'Validated product directions before costly build cycles',
        'Artifacts your stakeholders can rally around'
      ]
    };
  }

  // getUxHourlyPricingTiers
  getUxHourlyPricingTiers() {
    const tiers = this._getFromStorage('ux_hourly_pricing_tiers', []);
    return {
      tiers: tiers,
      hourly_pricing_notes:
        'Hourly rates vary based on commitment and scope. Larger hour blocks typically receive discounted rates.'
    };
  }

  // getUxHourlyRatePreview(estimated_hours)
  getUxHourlyRatePreview(estimated_hours) {
    const parsedHours = typeof estimated_hours === 'number' ? estimated_hours : 0;
    const { tiers } = this.getUxHourlyPricingTiers();
    const activeTiers = tiers.filter((t) => t.is_active === true);

    if (activeTiers.length === 0) {
      return {
        estimated_hours: parsedHours,
        applicable_tier: null,
        effective_hourly_rate: 0
      };
    }

    let applicable = activeTiers.find(
      (tier) =>
        parsedHours >= tier.min_hours && parsedHours <= tier.max_hours
    );

    if (!applicable) {
      // try closest tier where max_hours is just above estimated_hours
      const above = activeTiers
        .filter((tier) => tier.max_hours >= parsedHours)
        .sort((a, b) => a.max_hours - b.max_hours)[0];
      if (above) {
        applicable = above;
      } else {
        // fallback: highest max_hours tier
        applicable = activeTiers.sort(
          (a, b) => b.max_hours - a.max_hours
        )[0];
      }
    }

    const rate =
      typeof applicable.discounted_hourly_rate === 'number' &&
      applicable.discounted_hourly_rate > 0
        ? applicable.discounted_hourly_rate
        : applicable.base_hourly_rate;

    return {
      estimated_hours: parsedHours,
      applicable_tier: applicable,
      effective_hourly_rate: rate
    };
  }

  // submitUxHourlyInquiry
  submitUxHourlyInquiry(
    pricing_tier_id,
    subject,
    message,
    contact_name,
    contact_email,
    estimated_hours,
    desired_hourly_rate_cap
  ) {
    if (!subject || !message || !contact_name || !contact_email) {
      return {
        success: false,
        inquiry: null,
        message: 'Missing required fields for UX hourly inquiry.'
      };
    }

    const tiers = this._getFromStorage('ux_hourly_pricing_tiers', []);
    const tier = pricing_tier_id
      ? tiers.find((t) => t.id === pricing_tier_id) || null
      : null;

    const inquiries = this._getFromStorage('ux_hourly_inquiries', []);

    const inquiry = {
      id: this._generateId('ux_hourly_inquiry'),
      pricing_tier_id: tier ? tier.id : null,
      subject: subject,
      message: message,
      contact_name: contact_name,
      contact_email: contact_email,
      estimated_hours:
        typeof estimated_hours === 'number' ? estimated_hours : undefined,
      desired_hourly_rate_cap:
        typeof desired_hourly_rate_cap === 'number'
          ? desired_hourly_rate_cap
          : undefined,
      created_at: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._saveToStorage('ux_hourly_inquiries', inquiries);

    return {
      success: true,
      inquiry: inquiry,
      message: 'UX hourly engagement inquiry submitted.'
    };
  }

  // getBrandingServiceContent
  getBrandingServiceContent() {
    return {
      intro_heading: 'Branding & Visual Identity for digital-first teams',
      intro_copy: 'We craft brands that feel cohesive across decks, websites, and products — with the guidelines your team needs to keep everything consistent.',
      key_deliverables: [
        'Logo suite with responsive and monochrome variants',
        'Color, typography, and layout systems',
        'Brand guidelines document ready for internal rollouts',
        'Launch-ready assets for web and social'
      ],
      process_overview: [
        'Discovery: brand, audience, and competitive landscape',
        'Direction: moodboards and creative territories',
        'Exploration: logo concepts and visual language',
        'Refinement: selected direction and system build-out',
        'Documentation: brand guidelines and launch support'
      ]
    };
  }

  // getBrandingPackagesComparison
  getBrandingPackagesComparison() {
    const packages = this._getFromStorage('branding_packages', []);
    const activePackages = packages.filter((p) => p.is_active === true);
    return {
      packages: activePackages
    };
  }

  // getBrandingPackageDetail(slug)
  getBrandingPackageDetail(slug) {
    const packages = this._getFromStorage('branding_packages', []);
    const addOns = this._getFromStorage('branding_add_ons', []);

    const pkg = packages.find((p) => p.slug === slug) || null;
    const activeAddOns = addOns.filter((a) => a.is_active === true);

    const defaultBillingOption = 'one_time';

    return {
      package: pkg,
      available_add_ons: activeAddOns,
      default_billing_option: defaultBillingOption
    };
  }

  // startBrandingOnboarding
  startBrandingOnboarding(
    branding_package_id,
    billing_option,
    selected_add_on_ids,
    company_name,
    industry,
    planned_brand_launch_date
  ) {
    const packages = this._getFromStorage('branding_packages', []);
    const pkg = packages.find((p) => p.id === branding_package_id) || null;

    if (!pkg) {
      return {
        success: false,
        onboarding: null,
        message: 'Branding package not found.'
      };
    }

    if (!company_name || !industry || !planned_brand_launch_date || !billing_option) {
      return {
        success: false,
        onboarding: null,
        message: 'Missing required fields for branding onboarding.'
      };
    }

    const onboardingRecords = this._getFromStorage(
      'branding_onboarding_records',
      []
    );

    const onboarding = {
      id: this._generateId('branding_onboarding'),
      branding_package_id: branding_package_id,
      package_name_snapshot: pkg.name,
      billing_option: billing_option,
      selected_add_on_ids: Array.isArray(selected_add_on_ids)
        ? selected_add_on_ids
        : [],
      company_name: company_name,
      industry: industry,
      planned_brand_launch_date:
        this._formatDateToISO(planned_brand_launch_date) ||
        planned_brand_launch_date,
      created_at: new Date().toISOString()
    };

    onboardingRecords.push(onboarding);
    this._saveToStorage('branding_onboarding_records', onboardingRecords);

    return {
      success: true,
      onboarding: onboarding,
      message: 'Branding onboarding started.'
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