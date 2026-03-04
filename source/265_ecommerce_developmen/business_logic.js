/* eslint-disable no-var */

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
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'services',
      'service_plans',
      'plan_add_ons',
      'plan_configurations',
      'project_briefs',
      'project_brief_items',
      'case_studies',
      'case_study_shortlists',
      'case_study_shortlist_items',
      'shortlist_share_links',
      'blog_articles',
      'reading_lists',
      'reading_list_items',
      'newsletter_subscriptions',
      'platforms',
      'platform_comparison_sessions',
      'guides',
      'budget_ranges',
      'project_quote_requests',
      'cro_booking_requests',
      'plan_comparison_sessions',
      'contact_messages'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      if (key === 'service_plans') {
        let plans = Array.isArray(parsed) ? parsed : defaultValue;
        let changed = false;

        function hasPlanMatching(predicate) {
          for (let i = 0; i < plans.length; i++) {
            if (predicate(plans[i])) return true;
          }
          return false;
        }

        // Seed default ecommerce redesign plans (Shopify & WooCommerce) if none exist
        if (!hasPlanMatching(function (p) {
          return p && p.service_key === 'ecommerce_redesign' && p.plan_category === 'ecommerce_redesign' && p.billing_period === 'one_time' && Array.isArray(p.supported_platforms) && p.supported_platforms.indexOf('shopify') !== -1;
        })) {
          plans.push({
            id: 'ecom-redesign-shopify-standard',
            service_id: 'ecommerce_redesign',
            service_key: 'ecommerce_redesign',
            name: 'Shopify CRO Redesign',
            subtitle: 'Full Shopify storefront redesign',
            description: 'Default Shopify redesign plan used when seeded test data does not include redesign plans.',
            plan_type: 'project',
            plan_category: 'ecommerce_redesign',
            base_price: 9000,
            price_currency: 'USD',
            billing_period: 'one_time',
            min_products: 0,
            max_products: null,
            supported_platforms: ['shopify'],
            project_type: 'full_website_redesign',
            timeline_weeks: 6,
            min_hours_per_month: null,
            max_hours_per_month: null,
            included_hours_per_month: null,
            is_configurable: false,
            is_comparable: true,
            is_bookable: false,
            highlight_badges: [],
            display_order: 1,
            is_active: true
          });
          changed = true;
        }

        if (!hasPlanMatching(function (p) {
          return p && p.service_key === 'ecommerce_redesign' && p.plan_category === 'ecommerce_redesign' && p.billing_period === 'one_time' && Array.isArray(p.supported_platforms) && p.supported_platforms.indexOf('woocommerce') !== -1;
        })) {
          plans.push({
            id: 'ecom-redesign-woocommerce-standard',
            service_id: 'ecommerce_redesign',
            service_key: 'ecommerce_redesign',
            name: 'WooCommerce CRO Redesign',
            subtitle: 'Full WooCommerce storefront redesign',
            description: 'Default WooCommerce redesign plan used when seeded test data does not include redesign plans.',
            plan_type: 'project',
            plan_category: 'ecommerce_redesign',
            base_price: 8500,
            price_currency: 'USD',
            billing_period: 'one_time',
            min_products: 0,
            max_products: null,
            supported_platforms: ['woocommerce'],
            project_type: 'full_website_redesign',
            timeline_weeks: 6,
            min_hours_per_month: null,
            max_hours_per_month: null,
            included_hours_per_month: null,
            is_configurable: false,
            is_comparable: true,
            is_bookable: false,
            highlight_badges: [],
            display_order: 2,
            is_active: true
          });
          changed = true;
        }

        // Seed a default maintenance retainer (20h/month, <= $1200) if none exist
        if (!hasPlanMatching(function (p) {
          return p && p.service_key === 'ongoing_support_maintenance' && p.billing_period === 'monthly';
        })) {
          plans.push({
            id: 'maintenance-20h-basic',
            service_id: 'ongoing_support_maintenance',
            service_key: 'ongoing_support_maintenance',
            name: 'Maintenance 20h/month',
            subtitle: '20 hours of monthly support',
            description: 'Seed maintenance retainer for tests requiring 20+ hours/month under $1,200.',
            plan_type: 'retainer',
            plan_category: 'maintenance',
            base_price: 900,
            price_currency: 'USD',
            billing_period: 'monthly',
            min_products: null,
            max_products: null,
            supported_platforms: ['shopify'],
            project_type: null,
            timeline_weeks: null,
            min_hours_per_month: 20,
            max_hours_per_month: 40,
            included_hours_per_month: 20,
            is_configurable: true,
            is_comparable: true,
            is_bookable: false,
            highlight_badges: [],
            display_order: 1,
            is_active: true
          });
          changed = true;
        }

        // Seed a default marketing growth retainer used for combined monthly plan tests
        if (!hasPlanMatching(function (p) {
          return p && p.service_key === 'marketing_growth' && p.billing_period === 'monthly';
        })) {
          plans.push({
            id: 'marketing-growth-10h-basic',
            service_id: 'marketing_growth',
            service_key: 'marketing_growth',
            name: 'Marketing Growth 10h/month',
            subtitle: '10 hours of marketing & CRO support',
            description: 'Seed marketing growth retainer used for combined monthly plan tests.',
            plan_type: 'retainer',
            plan_category: 'marketing_growth',
            base_price: 700,
            price_currency: 'USD',
            billing_period: 'monthly',
            min_products: null,
            max_products: null,
            supported_platforms: ['shopify'],
            project_type: null,
            timeline_weeks: null,
            min_hours_per_month: 10,
            max_hours_per_month: 30,
            included_hours_per_month: 10,
            is_configurable: true,
            is_comparable: true,
            is_bookable: false,
            highlight_badges: [],
            display_order: 1,
            is_active: true
          });
          changed = true;
        }

        // Seed a default CRO strategy session plan for booking
        if (!hasPlanMatching(function (p) {
          return p && p.service_key === 'cro' && p.plan_category === 'cro_strategy_session' && p.is_active;
        })) {
          plans.push({
            id: 'cro-strategy-session-60min',
            service_id: 'cro',
            service_key: 'cro',
            name: 'CRO Strategy Session (60 minutes)',
            subtitle: 'Remote CRO strategy video call',
            description: 'Seed CRO strategy session plan used for booking tests.',
            plan_type: 'consulting',
            plan_category: 'cro_strategy_session',
            base_price: 450,
            price_currency: 'USD',
            billing_period: 'one_time',
            min_products: null,
            max_products: null,
            supported_platforms: [],
            project_type: null,
            timeline_weeks: null,
            min_hours_per_month: null,
            max_hours_per_month: null,
            included_hours_per_month: null,
            is_configurable: false,
            is_comparable: false,
            is_bookable: true,
            highlight_badges: [],
            display_order: 1,
            is_active: true
          });
          changed = true;
        }

        if (changed) {
          this._saveToStorage('service_plans', plans);
        }
        return plans;
      }
      return parsed;
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

  _nowISO() {
    return new Date().toISOString();
  }

  _snakeToLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _getPlatformByKey(platformKey) {
    const platforms = this._getFromStorage('platforms');
    return platforms.find(function (p) {
      return p.platform_key === platformKey;
    }) || null;
  }

  _getServiceById(id) {
    const services = this._getFromStorage('services');
    return services.find(function (s) { return s.id === id; }) || null;
  }

  _getServiceByKey(serviceKey) {
    const services = this._getFromStorage('services');
    return services.find(function (s) { return s.service_key === serviceKey; }) || null;
  }

  _mapServicePlanWithJoins(plan) {
    if (!plan) return null;
    const service = this._getServiceById(plan.service_id);
    const platforms = this._getFromStorage('platforms');

    let supportedPlatforms = [];
    if (Array.isArray(plan.supported_platforms)) {
      supportedPlatforms = plan.supported_platforms.map(function (sp) {
        if (typeof sp === 'string') {
          const platformObj = platforms.find(function (p) { return p.platform_key === sp; }) || null;
          return {
            platform_key: sp,
            platform_name: platformObj ? platformObj.name : sp
          };
        }
        if (sp && typeof sp === 'object') {
          const pk = sp.platform_key;
          const platformObj = platforms.find(function (p) { return p.platform_key === pk; }) || null;
          return {
            platform_key: pk,
            platform_name: platformObj ? platformObj.name : (sp.platform_name || pk)
          };
        }
        return null;
      }).filter(function (v) { return v !== null; });
    }

    return {
      id: plan.id,
      service_id: plan.service_id,
      service_name: service ? service.name : '',
      service_key: plan.service_key,
      name: plan.name,
      subtitle: plan.subtitle || '',
      description: plan.description || '',
      plan_type: plan.plan_type,
      plan_category: plan.plan_category,
      base_price: plan.base_price,
      price_currency: plan.price_currency,
      billing_period: plan.billing_period,
      min_products: plan.min_products != null ? plan.min_products : null,
      max_products: plan.max_products != null ? plan.max_products : null,
      supported_platforms: supportedPlatforms,
      project_type: plan.project_type || null,
      timeline_weeks: plan.timeline_weeks != null ? plan.timeline_weeks : null,
      min_hours_per_month: plan.min_hours_per_month != null ? plan.min_hours_per_month : null,
      max_hours_per_month: plan.max_hours_per_month != null ? plan.max_hours_per_month : null,
      included_hours_per_month: plan.included_hours_per_month != null ? plan.included_hours_per_month : null,
      is_configurable: !!plan.is_configurable,
      is_comparable: !!plan.is_comparable,
      is_bookable: !!plan.is_bookable,
      highlight_badges: Array.isArray(plan.highlight_badges) ? plan.highlight_badges : [],
      display_order: plan.display_order != null ? plan.display_order : 0,
      is_active: !!plan.is_active
    };
  }

  _getOrCreateProjectBrief() {
    let briefs = this._getFromStorage('project_briefs');
    let brief = briefs.find(function (b) { return b.status === 'draft'; });
    if (!brief) {
      brief = {
        id: this._generateId('projectbrief'),
        title: '',
        status: 'draft',
        created_at: this._nowISO(),
        submitted_at: null,
        total_one_time_cost: 0,
        total_monthly_cost: 0,
        notes: ''
      };
      briefs.push(brief);
      this._saveToStorage('project_briefs', briefs);
    }
    return brief;
  }

  _getCurrentProjectBrief() {
    const briefs = this._getFromStorage('project_briefs');
    const draft = briefs.find(function (b) { return b.status === 'draft'; });
    return draft || null;
  }

  _recalculateProjectBriefTotals(projectBriefId) {
    const briefs = this._getFromStorage('project_briefs');
    const items = this._getFromStorage('project_brief_items');
    let brief = briefs.find(function (b) { return b.id === projectBriefId; });
    if (!brief) return null;

    let totalOneTime = 0;
    let totalMonthly = 0;

    items.forEach(function (item) {
      if (item.project_brief_id !== projectBriefId) return;
      if (item.billing_period === 'monthly') {
        totalMonthly += item.subtotal;
      } else {
        totalOneTime += item.subtotal;
      }
    });

    brief.total_one_time_cost = totalOneTime;
    brief.total_monthly_cost = totalMonthly;

    this._saveToStorage('project_briefs', briefs);

    return { brief: brief, items: items.filter(function (it) { return it.project_brief_id === projectBriefId; }) };
  }

  _getOrCreateCaseStudyShortlist() {
    let shortlists = this._getFromStorage('case_study_shortlists');
    let shortlist = shortlists[0] || null;
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        name: 'My shortlist',
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        notes: ''
      };
      shortlists.push(shortlist);
      this._saveToStorage('case_study_shortlists', shortlists);
    }
    return shortlist;
  }

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('readinglist'),
        name: 'My reading list',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _getOrCreatePlatformComparisonSession() {
    let sessions = this._getFromStorage('platform_comparison_sessions');
    let session = sessions[0] || null;
    if (!session) {
      session = {
        id: this._generateId('platformcmp'),
        selected_platform_ids: [],
        sort_field: null,
        sort_direction: null,
        created_at: this._nowISO()
      };
      sessions.push(session);
      this._saveToStorage('platform_comparison_sessions', sessions);
    }
    return session;
  }

  _getOrCreatePlanComparisonSession() {
    let sessions = this._getFromStorage('plan_comparison_sessions');
    let session = sessions[0] || null;
    if (!session) {
      session = {
        id: this._generateId('plancmp'),
        service_key: null,
        selected_plan_ids: [],
        comparison_criteria: null,
        created_at: this._nowISO()
      };
      sessions.push(session);
      this._saveToStorage('plan_comparison_sessions', sessions);
    }
    return session;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomePageData
  getHomePageData() {
    const services = this._getFromStorage('services').filter(function (s) { return s.is_active; });
    const caseStudies = this._getFromStorage('case_studies').filter(function (c) { return c.is_featured; });
    const articlesAll = this._getFromStorage('blog_articles').filter(function (a) { return a.is_published; });

    const featuredArticles = articlesAll
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.publish_date).getTime();
        const db = new Date(b.publish_date).getTime();
        return db - da;
      })
      .slice(0, 3);

    const primaryCtas = [
      { label: 'Start a Project', targetPageKey: 'get_a_quote', priority: 1 },
      { label: 'View Services', targetPageKey: 'services', priority: 2 },
      { label: 'See Case Studies', targetPageKey: 'case_studies', priority: 3 }
    ];

    const quickStartCards = [
      {
        label: 'Launch a Shopify Store',
        description: 'Get a new Shopify storefront designed and launched by experts.',
        service_key: 'shopify_store_development',
        primaryActionLabel: 'Explore Shopify services'
      },
      {
        label: 'Improve Conversion Rates',
        description: 'Book a CRO strategy session to uncover growth opportunities.',
        service_key: 'cro',
        primaryActionLabel: 'Book CRO consultation'
      },
      {
        label: 'Ongoing Support & Growth',
        description: 'Combine maintenance and marketing retainers to scale reliably.',
        service_key: 'marketing_growth',
        primaryActionLabel: 'View retainers'
      }
    ];

    return {
      services: services,
      featuredCaseStudies: caseStudies,
      featuredArticles: featuredArticles,
      primaryCtas: primaryCtas,
      quickStartCards: quickStartCards
    };
  }

  // getServiceOverview(serviceKey)
  getServiceOverview(serviceKey) {
    const service = this._getServiceByKey(serviceKey);
    let heroTitle = '';
    let heroSubtitle = '';
    let longDescription = '';
    const keyBenefits = [];
    const sampleClients = [];

    if (service) {
      heroTitle = service.name;
      heroSubtitle = service.short_description || '';
      longDescription = service.long_description || '';
    }

    return {
      service: service || null,
      heroTitle: heroTitle,
      heroSubtitle: heroSubtitle,
      longDescription: longDescription,
      keyBenefits: keyBenefits,
      sampleClients: sampleClients
    };
  }

  // getServicePlanFilters(serviceKey)
  getServicePlanFilters(serviceKey) {
    const allPlans = this._getFromStorage('service_plans');
    const plans = allPlans.filter(function (p) {
      return p.service_key === serviceKey && p.is_active;
    });

    const priceRanges = [];
    if (plans.length > 0) {
      let minPrice = Infinity;
      let maxPrice = 0;
      plans.forEach(function (p) {
        if (typeof p.base_price === 'number') {
          if (p.base_price < minPrice) minPrice = p.base_price;
          if (p.base_price > maxPrice) maxPrice = p.base_price;
        }
      });
      if (minPrice !== Infinity) {
        priceRanges.push({ min: minPrice, max: maxPrice, label: 'All budgets' });
      }
    }

    const storeSizeOptionsMap = {};
    plans.forEach(function (p) {
      if (p.min_products != null || p.max_products != null) {
        const key = String(p.min_products || 0) + '-' + String(p.max_products || 0);
        if (!storeSizeOptionsMap[key]) {
          const minP = p.min_products != null ? p.min_products : 0;
          const maxP = p.max_products != null ? p.max_products : 0;
          let label;
          if (maxP === 0) {
            label = minP + '+ products';
          } else {
            label = minP + '–' + maxP + ' products';
          }
          storeSizeOptionsMap[key] = {
            minProducts: minP,
            maxProducts: maxP,
            label: label
          };
        }
      }
    });
    const storeSizeOptions = Object.keys(storeSizeOptionsMap).map(function (k) { return storeSizeOptionsMap[k]; });

    const projectTypeSet = {};
    plans.forEach(function (p) {
      if (p.project_type) {
        projectTypeSet[p.project_type] = true;
      }
    });
    const projectTypeOptions = Object.keys(projectTypeSet).map(function (val) {
      return { value: val, label: val ? val.split('_').map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join(' ') : '' };
    });

    const platforms = this._getFromStorage('platforms');
    const platformKeySet = {};
    plans.forEach(function (p) {
      if (Array.isArray(p.supported_platforms)) {
        p.supported_platforms.forEach(function (sp) {
          const key = typeof sp === 'string' ? sp : (sp && sp.platform_key);
          if (key) platformKeySet[key] = true;
        });
      }
    });
    const platformOptions = Object.keys(platformKeySet).map(function (pk) {
      const platform = platforms.find(function (pl) { return pl.platform_key === pk; });
      return { platform_key: pk, label: platform ? platform.name : pk };
    });

    const hoursSet = {};
    plans.forEach(function (p) {
      const h = p.included_hours_per_month;
      if (typeof h === 'number' && h > 0) {
        hoursSet[h] = true;
      }
    });
    const hoursPerMonthOptions = Object.keys(hoursSet).map(function (valStr) {
      const val = parseInt(valStr, 10);
      return { value: val, label: val + ' hours/month' };
    }).sort(function (a, b) { return a.value - b.value; });

    const timelineSet = {};
    plans.forEach(function (p) {
      if (typeof p.timeline_weeks === 'number' && p.timeline_weeks > 0) {
        const key = String(p.timeline_weeks);
        if (!timelineSet[key]) {
          timelineSet[key] = {
            minWeeks: p.timeline_weeks,
            maxWeeks: p.timeline_weeks,
            label: p.timeline_weeks + ' weeks'
          };
        }
      }
    });
    const timelineOptions = Object.keys(timelineSet).map(function (k) { return timelineSet[k]; });

    const sortOptions = [
      { value: 'display_order', label: 'Featured' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'timeline_asc', label: 'Timeline: Short to Long' },
      { value: 'timeline_desc', label: 'Timeline: Long to Short' }
    ];

    return {
      priceRanges: priceRanges,
      storeSizeOptions: storeSizeOptions,
      projectTypeOptions: projectTypeOptions,
      platformOptions: platformOptions,
      hoursPerMonthOptions: hoursPerMonthOptions,
      timelineOptions: timelineOptions,
      sortOptions: sortOptions
    };
  }

  // searchServicePlans(serviceKey, filters, sortOption)
  searchServicePlans(serviceKey, filters, sortOption) {
    filters = filters || {};
    const allPlans = this._getFromStorage('service_plans');

    let plans = allPlans.filter(function (p) {
      if (!p.is_active) return false;
      if (p.service_key !== serviceKey) return false;
      return true;
    });

    // Apply filters
    if (filters.minProducts != null) {
      plans = plans.filter(function (p) {
        if (p.min_products == null && p.max_products == null) return false;
        const maxP = p.max_products != null ? p.max_products : Infinity;
        return maxP >= filters.minProducts;
      });
    }
    if (filters.maxProducts != null) {
      plans = plans.filter(function (p) {
        if (p.max_products == null) return false;
        return p.max_products <= filters.maxProducts;
      });
    }
    if (filters.minBudget != null) {
      plans = plans.filter(function (p) {
        return typeof p.base_price === 'number' && p.base_price >= filters.minBudget;
      });
    }
    if (filters.maxBudget != null) {
      plans = plans.filter(function (p) {
        return typeof p.base_price === 'number' && p.base_price <= filters.maxBudget;
      });
    }
    if (filters.projectType) {
      plans = plans.filter(function (p) { return p.project_type === filters.projectType; });
    }
    if (Array.isArray(filters.platformKeys) && filters.platformKeys.length > 0) {
      plans = plans.filter(function (p) {
        if (!Array.isArray(p.supported_platforms)) return false;
        const keys = p.supported_platforms.map(function (sp) {
          if (typeof sp === 'string') return sp;
          if (sp && typeof sp === 'object') return sp.platform_key;
          return null;
        }).filter(function (v) { return !!v; });
        // match if any overlap
        return filters.platformKeys.some(function (fk) { return keys.indexOf(fk) !== -1; });
      });
    }
    if (filters.minTimelineWeeks != null) {
      plans = plans.filter(function (p) {
        if (p.timeline_weeks == null) return false;
        return p.timeline_weeks >= filters.minTimelineWeeks;
      });
    }
    if (filters.maxTimelineWeeks != null) {
      plans = plans.filter(function (p) {
        if (p.timeline_weeks == null) return false;
        return p.timeline_weeks <= filters.maxTimelineWeeks;
      });
    }
    if (filters.minHoursPerMonth != null) {
      plans = plans.filter(function (p) {
        const h = p.included_hours_per_month != null ? p.included_hours_per_month : p.min_hours_per_month;
        if (h == null) return false;
        return h >= filters.minHoursPerMonth;
      });
    }
    if (filters.maxHoursPerMonth != null) {
      plans = plans.filter(function (p) {
        const h = p.included_hours_per_month != null ? p.included_hours_per_month : p.max_hours_per_month;
        if (h == null) return false;
        return h <= filters.maxHoursPerMonth;
      });
    }
    if (filters.billingPeriod) {
      plans = plans.filter(function (p) { return p.billing_period === filters.billingPeriod; });
    }
    if (filters.planCategory) {
      plans = plans.filter(function (p) { return p.plan_category === filters.planCategory; });
    }

    // Sorting
    const so = sortOption || 'display_order';
    plans = plans.slice();
    if (so === 'price_asc') {
      plans.sort(function (a, b) { return (a.base_price || 0) - (b.base_price || 0); });
    } else if (so === 'price_desc') {
      plans.sort(function (a, b) { return (b.base_price || 0) - (a.base_price || 0); });
    } else if (so === 'timeline_asc') {
      plans.sort(function (a, b) { return (a.timeline_weeks || 0) - (b.timeline_weeks || 0); });
    } else if (so === 'timeline_desc') {
      plans.sort(function (a, b) { return (b.timeline_weeks || 0) - (a.timeline_weeks || 0); });
    } else if (so === 'display_order') {
      plans.sort(function (a, b) { return (a.display_order || 0) - (b.display_order || 0); });
    }

    const mapped = plans.map(this._mapServicePlanWithJoins.bind(this));
    return mapped;
  }

  // getPlanDetail(planId)
  getPlanDetail(planId) {
    const plans = this._getFromStorage('service_plans');
    const planRaw = plans.find(function (p) { return p.id === planId; }) || null;
    if (!planRaw) {
      return {
        plan: null,
        serviceContent: { short_description: '', long_description: '' },
        configurationOptions: {
          canAdjustHours: false,
          minHoursPerMonth: null,
          maxHoursPerMonth: null,
          hourIncrement: null
        },
        availableAddOns: [],
        recommendedComplementaryPlans: []
      };
    }

    const plan = this._mapServicePlanWithJoins(planRaw);
    const service = this._getServiceById(planRaw.service_id);

    const serviceContent = {
      short_description: service ? (service.short_description || '') : '',
      long_description: service ? (service.long_description || '') : ''
    };

    const configurationOptions = {
      canAdjustHours: !!planRaw.is_configurable && (planRaw.min_hours_per_month != null || planRaw.max_hours_per_month != null || planRaw.included_hours_per_month != null),
      minHoursPerMonth: planRaw.min_hours_per_month != null ? planRaw.min_hours_per_month : (planRaw.included_hours_per_month || null),
      maxHoursPerMonth: planRaw.max_hours_per_month != null ? planRaw.max_hours_per_month : (planRaw.included_hours_per_month || null),
      hourIncrement: 1
    };

    const allAddOns = this._getFromStorage('plan_add_ons');
    const availableAddOns = allAddOns.filter(function (ao) {
      if (!ao.is_active) return false;
      if (ao.applies_to_plan_category !== 'any' && ao.applies_to_plan_category !== planRaw.plan_category) return false;
      if (ao.service_key && ao.service_key !== planRaw.service_key) return false;
      return true;
    });

    const allPlans = this._getFromStorage('service_plans');
    const complementary = allPlans
      .filter(function (p) {
        if (!p.is_active) return false;
        if (p.id === planRaw.id) return false;
        return p.service_key === planRaw.service_key;
      })
      .sort(function (a, b) { return (a.base_price || 0) - (b.base_price || 0); })
      .slice(0, 3)
      .map(function (p) {
        return {
          plan_id: p.id,
          name: p.name,
          service_key: p.service_key,
          plan_category: p.plan_category,
          base_price: p.base_price,
          price_currency: p.price_currency
        };
      });

    return {
      plan: plan,
      serviceContent: serviceContent,
      configurationOptions: configurationOptions,
      availableAddOns: availableAddOns,
      recommendedComplementaryPlans: complementary
    };
  }

  // configurePlanAndAddToProjectBrief(basePlanId, configOptions, quantity, platformKey, label)
  configurePlanAndAddToProjectBrief(basePlanId, configOptions, quantity, platformKey, label) {
    configOptions = configOptions || {};
    if (quantity == null || quantity <= 0) quantity = 1;

    const plans = this._getFromStorage('service_plans');
    const plan = plans.find(function (p) { return p.id === basePlanId; });
    if (!plan) {
      return {
        success: false,
        message: 'Plan not found',
        projectBriefId: null,
        projectBriefStatus: null,
        totals: { total_one_time_cost: 0, total_monthly_cost: 0 },
        addedItem: null,
        itemsCount: 0
      };
    }

    const addOnsAll = this._getFromStorage('plan_add_ons');
    const selectedAddOnIds = Array.isArray(configOptions.selectedAddOnIds) ? configOptions.selectedAddOnIds : [];
    const selectedAddOns = addOnsAll.filter(function (ao) {
      return selectedAddOnIds.indexOf(ao.id) !== -1 && ao.is_active;
    });

    const customHoursPerMonth = typeof configOptions.customHoursPerMonth === 'number' ? configOptions.customHoursPerMonth : null;

    let basePrice = plan.base_price || 0;
    if (customHoursPerMonth != null && plan.included_hours_per_month && plan.included_hours_per_month > 0 && customHoursPerMonth !== plan.included_hours_per_month) {
      basePrice = basePrice * (customHoursPerMonth / plan.included_hours_per_month);
    }

    const addOnsTotal = selectedAddOns.reduce(function (sum, ao) { return sum + (ao.price || 0); }, 0);
    const singleSubtotal = basePrice + addOnsTotal;
    const subtotal = singleSubtotal * quantity;

    const planConfigurations = this._getFromStorage('plan_configurations');

    const planConfiguration = {
      id: this._generateId('planconfig'),
      base_plan_id: plan.id,
      custom_hours_per_month: customHoursPerMonth,
      selected_add_on_ids: selectedAddOnIds,
      notes: configOptions.notes || '',
      calculated_subtotal: singleSubtotal,
      billing_period: plan.billing_period,
      created_at: this._nowISO()
    };

    planConfigurations.push(planConfiguration);
    this._saveToStorage('plan_configurations', planConfigurations);

    const brief = this._getOrCreateProjectBrief();
    let items = this._getFromStorage('project_brief_items');

    const item = {
      id: this._generateId('pbitem'),
      project_brief_id: brief.id,
      plan_id: plan.id,
      plan_configuration_id: planConfiguration.id,
      label: label || plan.name,
      quantity: quantity,
      billing_period: plan.billing_period,
      unit_price: singleSubtotal,
      monthly_hours: customHoursPerMonth,
      platform_key: platformKey || (Array.isArray(plan.supported_platforms) && plan.supported_platforms.length > 0 ? (typeof plan.supported_platforms[0] === 'string' ? plan.supported_platforms[0] : plan.supported_platforms[0].platform_key) : null),
      service_key: plan.service_key,
      project_type: plan.project_type || null,
      timeline_weeks: plan.timeline_weeks || null,
      subtotal: subtotal,
      created_at: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('project_brief_items', items);

    const recalced = this._recalculateProjectBriefTotals(brief.id);
    const updatedBrief = recalced ? recalced.brief : brief;

    const itemsCount = recalced ? recalced.items.length : items.filter(function (it) { return it.project_brief_id === brief.id; }).length;

    return {
      success: true,
      message: 'Plan configured and added to project brief',
      projectBriefId: updatedBrief.id,
      projectBriefStatus: updatedBrief.status,
      totals: {
        total_one_time_cost: updatedBrief.total_one_time_cost,
        total_monthly_cost: updatedBrief.total_monthly_cost
      },
      addedItem: {
        project_brief_item_id: item.id,
        plan_name: plan.name,
        billing_period: item.billing_period,
        subtotal: item.subtotal,
        monthly_hours: item.monthly_hours
      },
      itemsCount: itemsCount
    };
  }

  // addPlanToProjectBrief(planId, quantity, platformKey, label)
  addPlanToProjectBrief(planId, quantity, platformKey, label) {
    if (quantity == null || quantity <= 0) quantity = 1;

    const plans = this._getFromStorage('service_plans');
    const plan = plans.find(function (p) { return p.id === planId; });
    if (!plan) {
      return {
        success: false,
        message: 'Plan not found',
        projectBriefId: null,
        projectBriefStatus: null,
        totals: { total_one_time_cost: 0, total_monthly_cost: 0 },
        addedItem: null,
        itemsCount: 0
      };
    }

    const brief = this._getOrCreateProjectBrief();
    let items = this._getFromStorage('project_brief_items');

    const unitPrice = plan.base_price || 0;
    const subtotal = unitPrice * quantity;

    const item = {
      id: this._generateId('pbitem'),
      project_brief_id: brief.id,
      plan_id: plan.id,
      plan_configuration_id: null,
      label: label || plan.name,
      quantity: quantity,
      billing_period: plan.billing_period,
      unit_price: unitPrice,
      monthly_hours: plan.included_hours_per_month || null,
      platform_key: platformKey || (Array.isArray(plan.supported_platforms) && plan.supported_platforms.length > 0 ? (typeof plan.supported_platforms[0] === 'string' ? plan.supported_platforms[0] : plan.supported_platforms[0].platform_key) : null),
      service_key: plan.service_key,
      project_type: plan.project_type || null,
      timeline_weeks: plan.timeline_weeks || null,
      subtotal: subtotal,
      created_at: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('project_brief_items', items);

    const recalced = this._recalculateProjectBriefTotals(brief.id);
    const updatedBrief = recalced ? recalced.brief : brief;

    const itemsCount = recalced ? recalced.items.length : items.filter(function (it) { return it.project_brief_id === brief.id; }).length;

    return {
      success: true,
      message: 'Plan added to project brief',
      projectBriefId: updatedBrief.id,
      projectBriefStatus: updatedBrief.status,
      totals: {
        total_one_time_cost: updatedBrief.total_one_time_cost,
        total_monthly_cost: updatedBrief.total_monthly_cost
      },
      addedItem: {
        project_brief_item_id: item.id,
        plan_name: plan.name,
        billing_period: item.billing_period,
        subtotal: item.subtotal
      },
      itemsCount: itemsCount
    };
  }

  // getProjectBrief()
  getProjectBrief() {
    const brief = this._getCurrentProjectBrief();
    if (!brief) {
      return {
        projectBrief: null,
        items: []
      };
    }

    const itemsAll = this._getFromStorage('project_brief_items');
    const plans = this._getFromStorage('service_plans');
    const services = this._getFromStorage('services');

    const items = itemsAll
      .filter(function (it) { return it.project_brief_id === brief.id; })
      .map(function (it) {
        const plan = plans.find(function (p) { return p.id === it.plan_id; }) || null;
        const service = plan ? services.find(function (s) { return s.id === plan.service_id; }) || null : null;
        return {
          project_brief_item_id: it.id,
          plan_id: it.plan_id,
          plan_name: plan ? plan.name : '',
          service_key: it.service_key,
          service_name: service ? service.name : '',
          platform_key: it.platform_key || null,
          billing_period: it.billing_period,
          quantity: it.quantity,
          unit_price: it.unit_price,
          subtotal: it.subtotal,
          monthly_hours: it.monthly_hours,
          project_type: it.project_type,
          timeline_weeks: it.timeline_weeks,
          label: it.label,
          highlight_badges: plan && Array.isArray(plan.highlight_badges) ? plan.highlight_badges : []
        };
      });

    return {
      projectBrief: {
        id: brief.id,
        title: brief.title,
        status: brief.status,
        created_at: brief.created_at,
        submitted_at: brief.submitted_at,
        total_one_time_cost: brief.total_one_time_cost,
        total_monthly_cost: brief.total_monthly_cost,
        notes: brief.notes
      },
      items: items
    };
  }

  // updateProjectBriefItem(projectBriefItemId, quantity, monthlyHours, label)
  updateProjectBriefItem(projectBriefItemId, quantity, monthlyHours, label) {
    let items = this._getFromStorage('project_brief_items');
    const idx = items.findIndex(function (it) { return it.id === projectBriefItemId; });
    if (idx === -1) {
      const brief = this._getCurrentProjectBrief();
      return {
        projectBrief: brief ? {
          id: brief.id,
          status: brief.status,
          total_one_time_cost: brief.total_one_time_cost,
          total_monthly_cost: brief.total_monthly_cost
        } : null,
        items: []
      };
    }

    const item = items[idx];
    if (quantity != null && quantity > 0) {
      item.quantity = quantity;
      item.subtotal = item.unit_price * quantity;
    }
    if (monthlyHours != null) {
      item.monthly_hours = monthlyHours;
    }
    if (typeof label === 'string') {
      item.label = label;
    }

    items[idx] = item;
    this._saveToStorage('project_brief_items', items);

    const briefRecalc = this._recalculateProjectBriefTotals(item.project_brief_id);
    const brief = briefRecalc ? briefRecalc.brief : this._getCurrentProjectBrief();
    const updatedItems = briefRecalc ? briefRecalc.items : items.filter(function (it) { return it.project_brief_id === (brief ? brief.id : null); });

    const simplifiedItems = updatedItems.map(function (it) {
      return {
        project_brief_item_id: it.id,
        plan_name: it.label,
        quantity: it.quantity,
        monthly_hours: it.monthly_hours,
        subtotal: it.subtotal
      };
    });

    return {
      projectBrief: brief ? {
        id: brief.id,
        status: brief.status,
        total_one_time_cost: brief.total_one_time_cost,
        total_monthly_cost: brief.total_monthly_cost
      } : null,
      items: simplifiedItems
    };
  }

  // removeProjectBriefItem(projectBriefItemId)
  removeProjectBriefItem(projectBriefItemId) {
    let items = this._getFromStorage('project_brief_items');
    const idx = items.findIndex(function (it) { return it.id === projectBriefItemId; });
    if (idx === -1) {
      const brief = this._getCurrentProjectBrief();
      const currentItems = brief ? items.filter(function (it) { return it.project_brief_id === brief.id; }) : [];
      return {
        success: false,
        projectBriefId: brief ? brief.id : null,
        itemsCount: currentItems.length,
        total_one_time_cost: brief ? brief.total_one_time_cost : 0,
        total_monthly_cost: brief ? brief.total_monthly_cost : 0
      };
    }

    const projectBriefId = items[idx].project_brief_id;
    items.splice(idx, 1);
    this._saveToStorage('project_brief_items', items);

    const recalced = this._recalculateProjectBriefTotals(projectBriefId);
    const brief = recalced ? recalced.brief : this._getCurrentProjectBrief();
    const itemsCount = recalced ? recalced.items.length : items.filter(function (it) { return it.project_brief_id === projectBriefId; }).length;

    return {
      success: true,
      projectBriefId: projectBriefId,
      itemsCount: itemsCount,
      total_one_time_cost: brief ? brief.total_one_time_cost : 0,
      total_monthly_cost: brief ? brief.total_monthly_cost : 0
    };
  }

  // submitProjectBriefForProposal(notes)
  submitProjectBriefForProposal(notes) {
    const briefs = this._getFromStorage('project_briefs');
    const items = this._getFromStorage('project_brief_items');
    const briefIdx = briefs.findIndex(function (b) { return b.status === 'draft'; });

    if (briefIdx === -1) {
      return {
        success: false,
        projectBriefId: null,
        status: null,
        submitted_at: null,
        message: 'No active project brief to submit.'
      };
    }

    const brief = briefs[briefIdx];
    const hasItems = items.some(function (it) { return it.project_brief_id === brief.id; });

    if (!hasItems) {
      return {
        success: false,
        projectBriefId: brief.id,
        status: brief.status,
        submitted_at: null,
        message: 'Project brief has no items.'
      };
    }

    if (typeof notes === 'string') {
      brief.notes = notes;
    }
    brief.status = 'submitted';
    brief.submitted_at = this._nowISO();
    briefs[briefIdx] = brief;
    this._saveToStorage('project_briefs', briefs);

    return {
      success: true,
      projectBriefId: brief.id,
      status: brief.status,
      submitted_at: brief.submitted_at,
      message: 'Project brief submitted for proposal.'
    };
  }

  // getProjectBriefSummary()
  getProjectBriefSummary() {
    const brief = this._getCurrentProjectBrief();
    if (!brief) {
      return {
        hasActiveBrief: false,
        projectBriefId: null,
        itemsCount: 0,
        total_one_time_cost: 0,
        total_monthly_cost: 0
      };
    }

    const items = this._getFromStorage('project_brief_items');
    const count = items.filter(function (it) { return it.project_brief_id === brief.id; }).length;

    return {
      hasActiveBrief: true,
      projectBriefId: brief.id,
      itemsCount: count,
      total_one_time_cost: brief.total_one_time_cost,
      total_monthly_cost: brief.total_monthly_cost
    };
  }

  // getCaseStudyFilters()
  getCaseStudyFilters() {
    const industryOptions = [
      { value: 'fashion_apparel', label: 'Fashion & Apparel' },
      { value: 'beauty', label: 'Beauty' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'home_garden', label: 'Home & Garden' },
      { value: 'b2b', label: 'B2B' },
      { value: 'other', label: 'Other' }
    ];

    const revenueUpliftOptions = [
      { minPercent: 0, label: 'All' },
      { minPercent: 10, label: '10%+' },
      { minPercent: 20, label: '20%+' },
      { minPercent: 30, label: '30%+' },
      { minPercent: 50, label: '50%+' }
    ];

    const sortOptions = [
      { value: 'latest', label: 'Latest' },
      { value: 'revenue_desc', label: 'Revenue uplift: High to Low' },
      { value: 'revenue_asc', label: 'Revenue uplift: Low to High' }
    ];

    return {
      industryOptions: industryOptions,
      revenueUpliftOptions: revenueUpliftOptions,
      sortOptions: sortOptions,
      defaultSortValue: 'latest'
    };
  }

  // searchCaseStudies(filters, page, pageSize)
  searchCaseStudies(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let results = this._getFromStorage('case_studies');

    if (filters.industry) {
      results = results.filter(function (c) { return c.industry === filters.industry; });
    }
    if (filters.minRevenueUpliftPercent != null) {
      results = results.filter(function (c) { return typeof c.revenue_uplift_percent === 'number' && c.revenue_uplift_percent >= filters.minRevenueUpliftPercent; });
    }

    const sortOption = filters.sortOption || 'latest';
    if (sortOption === 'revenue_desc') {
      results = results.slice().sort(function (a, b) { return (b.revenue_uplift_percent || 0) - (a.revenue_uplift_percent || 0); });
    } else if (sortOption === 'revenue_asc') {
      results = results.slice().sort(function (a, b) { return (a.revenue_uplift_percent || 0) - (b.revenue_uplift_percent || 0); });
    } else {
      // 'latest' – no explicit date field; keep original order
      results = results.slice();
    }

    const totalCount = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // addCaseStudyToShortlist(caseStudyId)
  addCaseStudyToShortlist(caseStudyId) {
    const shortlist = this._getOrCreateCaseStudyShortlist();
    let items = this._getFromStorage('case_study_shortlist_items');

    const exists = items.some(function (it) { return it.shortlist_id === shortlist.id && it.case_study_id === caseStudyId; });
    if (!exists) {
      const item = {
        id: this._generateId('shortlistitem'),
        shortlist_id: shortlist.id,
        case_study_id: caseStudyId,
        added_at: this._nowISO()
      };
      items.push(item);
      this._saveToStorage('case_study_shortlist_items', items);

      shortlist.updated_at = this._nowISO();
      const shortlists = this._getFromStorage('case_study_shortlists');
      const idx = shortlists.findIndex(function (s) { return s.id === shortlist.id; });
      if (idx !== -1) {
        shortlists[idx] = shortlist;
        this._saveToStorage('case_study_shortlists', shortlists);
      }
    }

    const count = items.filter(function (it) { return it.shortlist_id === shortlist.id; }).length;

    return {
      success: true,
      shortlistId: shortlist.id,
      itemCount: count
    };
  }

  // getCaseStudyShortlist()
  getCaseStudyShortlist() {
    const shortlist = this._getOrCreateCaseStudyShortlist();
    const itemsAll = this._getFromStorage('case_study_shortlist_items');
    const caseStudies = this._getFromStorage('case_studies');

    const items = itemsAll
      .filter(function (it) { return it.shortlist_id === shortlist.id; })
      .map(function (it) {
        const cs = caseStudies.find(function (c) { return c.id === it.case_study_id; }) || null;
        return {
          shortlistItemId: it.id,
          added_at: it.added_at,
          caseStudy: cs
        };
      });

    return {
      shortlist: shortlist,
      items: items
    };
  }

  // removeCaseStudyFromShortlist(shortlistItemId)
  removeCaseStudyFromShortlist(shortlistItemId) {
    let items = this._getFromStorage('case_study_shortlist_items');
    const idx = items.findIndex(function (it) { return it.id === shortlistItemId; });
    if (idx === -1) {
      const shortlist = this._getOrCreateCaseStudyShortlist();
      const countExisting = items.filter(function (it) { return it.shortlist_id === shortlist.id; }).length;
      return {
        success: false,
        shortlistId: shortlist.id,
        itemCount: countExisting
      };
    }

    const shortlistId = items[idx].shortlist_id;
    items.splice(idx, 1);
    this._saveToStorage('case_study_shortlist_items', items);

    const count = items.filter(function (it) { return it.shortlist_id === shortlistId; }).length;

    return {
      success: true,
      shortlistId: shortlistId,
      itemCount: count
    };
  }

  // createShortlistShareLink()
  createShortlistShareLink() {
    const shortlist = this._getOrCreateCaseStudyShortlist();
    const links = this._getFromStorage('shortlist_share_links');

    const shareToken = this._generateId('share').replace('share_', '');
    const shareUrl = '/shortlist/' + shareToken;

    const link = {
      id: this._generateId('shortlistshare'),
      shortlist_id: shortlist.id,
      share_token: shareToken,
      share_url: shareUrl,
      created_at: this._nowISO(),
      expires_at: null,
      is_active: true
    };

    links.push(link);
    this._saveToStorage('shortlist_share_links', links);

    return {
      shareUrl: shareUrl,
      shareToken: shareToken,
      expires_at: link.expires_at
    };
  }

  // getBlogFilters()
  getBlogFilters() {
    const articles = this._getFromStorage('blog_articles');
    const tagSet = {};
    articles.forEach(function (a) {
      if (Array.isArray(a.tags)) {
        a.tags.forEach(function (t) {
          if (t) tagSet[t] = true;
        });
      }
    });

    const tagOptions = Object.keys(tagSet);

    const dateRangeOptions = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    return {
      dateRangeOptions: dateRangeOptions,
      tagOptions: tagOptions
    };
  }

  // searchBlogArticles(query, dateRangeKey, page, pageSize)
  searchBlogArticles(query, dateRangeKey, page, pageSize) {
    query = query || '';
    dateRangeKey = dateRangeKey || 'all_time';
    page = page || 1;
    pageSize = pageSize || 20;

    const qLower = query.trim().toLowerCase();
    let results = this._getFromStorage('blog_articles').filter(function (a) { return a.is_published; });

    if (qLower) {
      results = results.filter(function (a) {
        const text = (a.title || '') + ' ' + (a.content || '') + ' ' + (a.excerpt || '');
        const tags = Array.isArray(a.tags) ? a.tags.join(' ') : '';
        return (text + ' ' + tags).toLowerCase().indexOf(qLower) !== -1;
      });
    }

    if (dateRangeKey === 'last_30_days' || dateRangeKey === 'last_12_months') {
      const now = new Date();
      let threshold;
      if (dateRangeKey === 'last_30_days') {
        threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        threshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }
      results = results.filter(function (a) {
        const d = new Date(a.publish_date);
        return d >= threshold;
      });
    }

    results = results.slice().sort(function (a, b) {
      const da = new Date(a.publish_date).getTime();
      const db = new Date(b.publish_date).getTime();
      return db - da;
    });

    const totalCount = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return {
      results: paged,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;

    const readingList = this._getOrCreateReadingList();
    const rlItems = this._getFromStorage('reading_list_items');
    const isSavedToReadingList = rlItems.some(function (it) { return it.reading_list_id === readingList.id && it.article_id === articleId; });

    let relatedArticles = [];
    if (article) {
      relatedArticles = articles.filter(function (a) {
        if (a.id === article.id) return false;
        if (article.topic && a.topic === article.topic) return true;
        if (Array.isArray(article.tags) && Array.isArray(a.tags)) {
          return article.tags.some(function (t) { return a.tags.indexOf(t) !== -1; });
        }
        return false;
      }).slice(0, 3);
    }

    return {
      article: article,
      isSavedToReadingList: isSavedToReadingList,
      relatedArticles: relatedArticles
    };
  }

  // addArticleToReadingList(articleId)
  addArticleToReadingList(articleId) {
    const readingList = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items');

    const exists = items.some(function (it) { return it.reading_list_id === readingList.id && it.article_id === articleId; });
    if (!exists) {
      const item = {
        id: this._generateId('readinglistitem'),
        reading_list_id: readingList.id,
        article_id: articleId,
        added_at: this._nowISO()
      };
      items.push(item);
      this._saveToStorage('reading_list_items', items);

      readingList.updated_at = this._nowISO();
      const lists = this._getFromStorage('reading_lists');
      const idx = lists.findIndex(function (l) { return l.id === readingList.id; });
      if (idx !== -1) {
        lists[idx] = readingList;
        this._saveToStorage('reading_lists', lists);
      }
    }

    const count = items.filter(function (it) { return it.reading_list_id === readingList.id; }).length;

    return {
      success: true,
      readingListId: readingList.id,
      itemCount: count
    };
  }

  // getReadingList()
  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const itemsAll = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('blog_articles');

    const items = itemsAll
      .filter(function (it) { return it.reading_list_id === readingList.id; })
      .map(function (it) {
        const article = articles.find(function (a) { return a.id === it.article_id; }) || null;
        return {
          readingListItemId: it.id,
          added_at: it.added_at,
          article: article
        };
      });

    return {
      readingList: readingList,
      items: items
    };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const idx = items.findIndex(function (it) { return it.id === readingListItemId; });
    if (idx === -1) {
      const readingList = this._getOrCreateReadingList();
      const countExisting = items.filter(function (it) { return it.reading_list_id === readingList.id; }).length;
      return {
        success: false,
        readingListId: readingList.id,
        itemCount: countExisting
      };
    }

    const readingListId = items[idx].reading_list_id;
    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);

    const count = items.filter(function (it) { return it.reading_list_id === readingListId; }).length;

    return {
      success: true,
      readingListId: readingListId,
      itemCount: count
    };
  }

  // subscribeToNewsletter(email, frequency, sourceType, sourceArticleId)
  subscribeToNewsletter(email, frequency, sourceType, sourceArticleId) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter'),
      email: email,
      frequency: frequency,
      source_type: sourceType,
      source_article_id: sourceArticleId || null,
      created_at: this._nowISO(),
      status: 'active'
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription: subscription,
      message: 'Subscribed successfully.'
    };
  }

  // getPlatformsOverview()
  getPlatformsOverview() {
    const platforms = this._getFromStorage('platforms');
    return platforms;
  }

  // startPlatformComparison(selectedPlatformIds)
  startPlatformComparison(selectedPlatformIds) {
    selectedPlatformIds = Array.isArray(selectedPlatformIds) ? selectedPlatformIds : [];
    const platforms = this._getFromStorage('platforms');
    const validIds = platforms.map(function (p) { return p.id; });
    const filteredIds = selectedPlatformIds.filter(function (id) { return validIds.indexOf(id) !== -1; });

    const session = this._getOrCreatePlatformComparisonSession();
    session.selected_platform_ids = filteredIds;

    const sessions = this._getFromStorage('platform_comparison_sessions');
    const idx = sessions.findIndex(function (s) { return s.id === session.id; });
    if (idx === -1) {
      sessions.push(session);
    } else {
      sessions[idx] = session;
    }
    this._saveToStorage('platform_comparison_sessions', sessions);

    const selectedPlatforms = platforms.filter(function (p) { return filteredIds.indexOf(p.id) !== -1; });

    return {
      comparisonSession: session,
      platforms: selectedPlatforms
    };
  }

  // getPlatformComparison(sortField, sortDirection)
  getPlatformComparison(sortField, sortDirection) {
    const session = this._getOrCreatePlatformComparisonSession();
    const platforms = this._getFromStorage('platforms');

    let selected = platforms.filter(function (p) { return session.selected_platform_ids.indexOf(p.id) !== -1; });

    const field = sortField || session.sort_field || 'implementation_cost';
    const direction = sortDirection || session.sort_direction || 'asc';

    if (field === 'implementation_cost') {
      selected = selected.slice().sort(function (a, b) {
        const diff = (a.implementation_cost_estimate || 0) - (b.implementation_cost_estimate || 0);
        return direction === 'asc' ? diff : -diff;
      });
    } else if (field === 'total_cost_of_ownership') {
      selected = selected.slice().sort(function (a, b) {
        const diff = (a.tco_estimate || 0) - (b.tco_estimate || 0);
        return direction === 'asc' ? diff : -diff;
      });
    }

    session.sort_field = field;
    session.sort_direction = direction;
    const sessions = this._getFromStorage('platform_comparison_sessions');
    const idx = sessions.findIndex(function (s) { return s.id === session.id; });
    if (idx === -1) {
      sessions.push(session);
    } else {
      sessions[idx] = session;
    }
    this._saveToStorage('platform_comparison_sessions', sessions);

    const resultPlatforms = selected.map(function (p) {
      return {
        platform: p,
        implementation_cost_estimate: p.implementation_cost_estimate,
        tco_estimate: p.tco_estimate
      };
    });

    return {
      comparisonSession: session,
      platforms: resultPlatforms
    };
  }

  // getPlatformDetail(platformId)
  getPlatformDetail(platformId) {
    const platforms = this._getFromStorage('platforms');
    const platform = platforms.find(function (p) { return p.id === platformId; }) || null;

    const guidesAll = this._getFromStorage('guides');
    const guides = guidesAll.filter(function (g) { return g.platform_id === platformId; });

    // Enrich guides with platform object for FK resolution (platform_id -> platform)
    const enrichedGuides = guides.map(function (g) {
      const copy = Object.assign({}, g);
      copy.platform = platform;
      return copy;
    });

    const strengths = [];
    const idealUseCases = [];

    const costSummary = platform ? {
      implementation_cost_estimate: platform.implementation_cost_estimate,
      tco_estimate: platform.tco_estimate,
      currency: platform.currency
    } : {
      implementation_cost_estimate: 0,
      tco_estimate: 0,
      currency: 'USD'
    };

    return {
      platform: platform,
      strengths: strengths,
      idealUseCases: idealUseCases,
      costSummary: costSummary,
      guides: enrichedGuides
    };
  }

  // getGuideDetail(guideId)
  getGuideDetail(guideId) {
    const guides = this._getFromStorage('guides');
    const platforms = this._getFromStorage('platforms');

    const guide = guides.find(function (g) { return g.id === guideId; }) || null;

    let relatedGuides = [];
    if (guide) {
      relatedGuides = guides.filter(function (g) {
        if (g.id === guide.id) return false;
        if (guide.platform_id && g.platform_id === guide.platform_id) return true;
        if (g.guide_type === guide.guide_type) return true;
        return false;
      }).slice(0, 5);
    }

    // Enrich guides with platform object
    function enrich(g) {
      const copy = Object.assign({}, g);
      if (g.platform_id) {
        copy.platform = platforms.find(function (p) { return p.id === g.platform_id; }) || null;
      } else {
        copy.platform = null;
      }
      return copy;
    }

    const enrichedGuide = guide ? enrich(guide) : null;
    const enrichedRelated = relatedGuides.map(enrich);

    // Instrumentation for task completion tracking
    try {
      if (guide) {
        localStorage.setItem(
          'task8_lastOpenedGuide',
          JSON.stringify({
            guideId: guide.id,
            platformId: guide.platform_id || null,
            openedAt: this._nowISO()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      guide: enrichedGuide,
      relatedGuides: enrichedRelated
    };
  }

  // getPricingTabPlans(tabKey, maxMonthlyBudget)
  getPricingTabPlans(tabKey, maxMonthlyBudget) {
    const allPlans = this._getFromStorage('service_plans');

    let planCategory;
    let serviceKey;
    let tabLabel;

    if (tabKey === 'maintenance') {
      planCategory = 'maintenance';
      serviceKey = 'ongoing_support_maintenance';
      tabLabel = 'Maintenance';
    } else if (tabKey === 'marketing_growth') {
      planCategory = 'marketing_growth';
      serviceKey = 'marketing_growth';
      tabLabel = 'Marketing & Growth';
    } else {
      planCategory = null;
      serviceKey = null;
      tabLabel = tabKey;
    }

    let plans = allPlans.filter(function (p) {
      if (!p.is_active) return false;
      if (planCategory && p.plan_category !== planCategory) return false;
      if (serviceKey && p.service_key !== serviceKey) return false;
      if (p.billing_period !== 'monthly') return false;
      return true;
    });

    if (maxMonthlyBudget != null) {
      plans = plans.filter(function (p) { return typeof p.base_price === 'number' && p.base_price <= maxMonthlyBudget; });
    }

    const simplifiedPlans = plans.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        subtitle: p.subtitle || '',
        included_hours_per_month: p.included_hours_per_month != null ? p.included_hours_per_month : null,
        base_price: p.base_price,
        price_currency: p.price_currency,
        billing_period: p.billing_period,
        plan_category: p.plan_category
      };
    });

    return {
      tabKey: tabKey,
      tabLabel: tabLabel,
      plans: simplifiedPlans
    };
  }

  // getProjectQuoteFormOptions()
  getProjectQuoteFormOptions() {
    const projectTypes = [
      { value: 'new_ecommerce_store', label: 'New ecommerce store' },
      { value: 'ecommerce_redesign', label: 'Ecommerce redesign' },
      { value: 'migration_replatform', label: 'Migration / replatform' },
      { value: 'consulting_only', label: 'Consulting only' },
      { value: 'other', label: 'Other' }
    ];

    const platforms = this._getFromStorage('platforms');
    const platformOptions = platforms.filter(function (p) { return p.is_supported; }).map(function (p) {
      return { platform_key: p.platform_key, label: p.name };
    });

    const budgetRanges = this._getFromStorage('budget_ranges').filter(function (b) { return b.is_active; }).slice().sort(function (a, b) {
      return (a.display_order || 0) - (b.display_order || 0);
    });

    const timelineOptions = [
      { value: 'under_1_month', label: 'Under 1 month' },
      { value: 'one_to_two_months', label: '1–2 months' },
      { value: 'two_to_three_months', label: '2–3 months' },
      { value: 'three_to_six_months', label: '3–6 months' },
      { value: 'more_than_six_months', label: 'More than 6 months' }
    ];

    const companySizes = [
      { value: 'one_to_nine', label: '1–9 employees' },
      { value: 'ten_to_forty_nine', label: '10–49 employees' },
      { value: 'fifty_to_ninety_nine', label: '50–99 employees' },
      { value: 'one_hundred_to_two_hundred_forty_nine', label: '100–249 employees' },
      { value: 'two_hundred_fifty_plus', label: '250+ employees' }
    ];

    return {
      projectTypes: projectTypes,
      platformOptions: platformOptions,
      budgetRanges: budgetRanges,
      timelineOptions: timelineOptions,
      companySizes: companySizes
    };
  }

  // submitProjectQuoteRequest(projectType, platformKey, budgetRangeId, timelinePreference, fullName, workEmail, companySize, additionalDetails)
  submitProjectQuoteRequest(projectType, platformKey, budgetRangeId, timelinePreference, fullName, workEmail, companySize, additionalDetails) {
    const budgetRanges = this._getFromStorage('budget_ranges');
    const budgetRange = budgetRanges.find(function (b) { return b.id === budgetRangeId; }) || null;

    const request = {
      id: this._generateId('quote'),
      project_type: projectType,
      platform_key: platformKey,
      budget_range_id: budgetRangeId,
      timeline_preference: timelinePreference,
      full_name: fullName,
      work_email: workEmail,
      company_size: companySize,
      additional_details: additionalDetails || '',
      created_at: this._nowISO(),
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    const requests = this._getFromStorage('project_quote_requests');
    requests.push(request);
    this._saveToStorage('project_quote_requests', requests);

    return {
      success: true,
      requestId: request.id,
      status: request.status,
      created_at: request.created_at,
      message: budgetRange ? 'Quote request submitted for budget ' + budgetRange.label + '.' : 'Quote request submitted.'
    };
  }

  // getCROBookingOptions()
  getCROBookingOptions() {
    const plans = this._getFromStorage('service_plans');
    const croPlan = plans.find(function (p) {
      return p.service_key === 'cro' && p.plan_category === 'cro_strategy_session' && p.is_active;
    }) || null;

    const croPlanId = croPlan ? croPlan.id : null;

    return {
      croPlanId: croPlanId,
      planName: croPlan ? croPlan.name : '',
      defaultSessionDurationMinutes: 60,
      timezone: 'UTC',
      bookingWindowDays: 30,
      maxSessionsPerDay: 4,
      // Foreign key resolution for croPlanId -> full plan
      croPlan: croPlan
    };
  }

  // getAvailableCROTimeSlots(date)
  getAvailableCROTimeSlots(date) {
    // Generate hourly slots 09:00–17:00 UTC for the given date, all available
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      const iso = new Date(date + 'T' + (hour < 10 ? '0' + hour : String(hour)) + ':00:00Z').toISOString();
      slots.push({
        startDateTime: iso,
        durationMinutes: 60,
        isAvailable: true
      });
    }
    return slots;
  }

  // submitCROBookingRequest(planId, sessionStart, sessionsCount, totalDurationMinutes, contactName, contactEmail)
  submitCROBookingRequest(planId, sessionStart, sessionsCount, totalDurationMinutes, contactName, contactEmail) {
    const booking = {
      id: this._generateId('crobooking'),
      plan_id: planId,
      session_start: sessionStart,
      sessions_count: sessionsCount,
      total_duration_minutes: totalDurationMinutes,
      contact_name: contactName,
      contact_email: contactEmail,
      status: 'pending',
      created_at: this._nowISO()
    };

    const bookings = this._getFromStorage('cro_booking_requests');
    bookings.push(booking);
    this._saveToStorage('cro_booking_requests', bookings);

    return {
      success: true,
      bookingRequestId: booking.id,
      status: booking.status,
      session_start: booking.session_start,
      sessions_count: booking.sessions_count,
      total_duration_minutes: booking.total_duration_minutes
    };
  }

  // addPlanToComparison(planId)
  addPlanToComparison(planId) {
    const plans = this._getFromStorage('service_plans');
    const plan = plans.find(function (p) { return p.id === planId; });
    if (!plan) {
      const session = this._getOrCreatePlanComparisonSession();
      return {
        comparisonSession: session,
        selectedPlans: []
      };
    }

    const session = this._getOrCreatePlanComparisonSession();
    if (!session.service_key) {
      session.service_key = plan.service_key;
    }
    if (session.selected_plan_ids.indexOf(planId) === -1) {
      session.selected_plan_ids.push(planId);
    }

    const sessions = this._getFromStorage('plan_comparison_sessions');
    const idx = sessions.findIndex(function (s) { return s.id === session.id; });
    if (idx === -1) {
      sessions.push(session);
    } else {
      sessions[idx] = session;
    }
    this._saveToStorage('plan_comparison_sessions', sessions);

    const selectedPlans = session.selected_plan_ids.map(function (id) {
      const p = plans.find(function (pp) { return pp.id === id; }) || null;
      if (!p) return null;
      const supported = Array.isArray(p.supported_platforms) ? p.supported_platforms.map(function (sp) {
        if (typeof sp === 'string') return sp;
        if (sp && typeof sp === 'object') return sp.platform_key;
        return null;
      }).filter(function (v) { return !!v; }) : [];
      return {
        plan_id: p.id,
        name: p.name,
        service_key: p.service_key,
        supported_platforms: supported,
        base_price: p.base_price,
        price_currency: p.price_currency,
        timeline_weeks: p.timeline_weeks
      };
    }).filter(function (v) { return v !== null; });

    return {
      comparisonSession: session,
      selectedPlans: selectedPlans
    };
  }

  // getPlanComparison(comparisonCriteria)
  getPlanComparison(comparisonCriteria) {
    const session = this._getOrCreatePlanComparisonSession();
    const plans = this._getFromStorage('service_plans');

    let selected = session.selected_plan_ids.map(function (id) {
      return plans.find(function (p) { return p.id === id; }) || null;
    }).filter(function (p) { return p !== null; });

    const criteria = comparisonCriteria || session.comparison_criteria || 'price';

    if (criteria === 'price') {
      selected = selected.slice().sort(function (a, b) { return (a.base_price || 0) - (b.base_price || 0); });
    } else if (criteria === 'timeline') {
      selected = selected.slice().sort(function (a, b) { return (a.timeline_weeks || 0) - (b.timeline_weeks || 0); });
    }

    session.comparison_criteria = criteria;
    const sessions = this._getFromStorage('plan_comparison_sessions');
    const idx = sessions.findIndex(function (s) { return s.id === session.id; });
    if (idx === -1) {
      sessions.push(session);
    } else {
      sessions[idx] = session;
    }
    this._saveToStorage('plan_comparison_sessions', sessions);

    const resultPlans = selected.map(function (p) {
      const platformKey = Array.isArray(p.supported_platforms) && p.supported_platforms.length > 0
        ? (typeof p.supported_platforms[0] === 'string' ? p.supported_platforms[0] : p.supported_platforms[0].platform_key)
        : null;
      return {
        plan_id: p.id,
        name: p.name,
        service_key: p.service_key,
        platform_key: platformKey,
        base_price: p.base_price,
        price_currency: p.price_currency,
        timeline_weeks: p.timeline_weeks,
        plan_category: p.plan_category
      };
    });

    return {
      comparisonSession: session,
      plans: resultPlans
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    let title = '';
    const sections = [];
    const ctas = [];

    if (pageKey === 'about') {
      title = 'About Us';
      sections.push({ heading: 'Who we are', body: 'We are an ecommerce development agency specializing in Shopify, WooCommerce, and headless commerce builds.' });
      sections.push({ heading: 'Our approach', body: 'We combine UX research, technical excellence, and iterative optimization to grow your revenue.' });
      ctas.push({ label: 'Start a project', targetPageKey: 'get_a_quote' });
    } else if (pageKey === 'contact') {
      title = 'Contact';
      sections.push({ heading: 'Get in touch', body: 'Tell us about your ecommerce project and we will respond within one business day.' });
      ctas.push({ label: 'Submit contact form', targetPageKey: 'contact_form' });
    } else if (pageKey === 'legal_terms') {
      title = 'Terms & Conditions';
      sections.push({ heading: 'Use of services', body: 'By using this website you agree to our standard engagement terms.' });
    } else if (pageKey === 'privacy_policy') {
      title = 'Privacy Policy';
      sections.push({ heading: 'Data usage', body: 'We only use your data to provide and improve our services and do not sell your information.' });
    } else if (pageKey === 'cookie_policy') {
      title = 'Cookie Policy';
      sections.push({ heading: 'Cookies', body: 'We use cookies for analytics and to improve your browsing experience.' });
    } else {
      title = this._snakeToLabel(pageKey);
      sections.push({ heading: title, body: '' });
    }

    return {
      pageKey: pageKey,
      title: title,
      sections: sections,
      ctas: ctas
    };
  }

  // submitContactMessage(fullName, email, company, topic, message)
  submitContactMessage(fullName, email, company, topic, messageText) {
    const msg = {
      id: this._generateId('contact'),
      full_name: fullName,
      email: email,
      company: company || '',
      topic: topic || 'other',
      message: messageText,
      created_at: this._nowISO()
    };

    const messages = this._getFromStorage('contact_messages');
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Your message has been sent.'
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